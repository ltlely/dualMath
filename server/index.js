import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://YOUR-FRONTEND.vercel.app"
    ],
    methods: ["GET", "POST"] },
});

const rooms = new Map(); // roomCode -> { hostId, players: Map(socketId -> player), state }

function makeRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function getPublicRoom(roomCode) {
  const r = rooms.get(roomCode);
  if (!r) return null;

  const players = Array.from(r.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    ready: p.ready,
    score: p.score,
    team: p.team ?? null,
    slot: p.slot ?? null,
  }));

  const teamA = players.filter((p) => p.team === "A");
  const teamB = players.filter((p) => p.team === "B");

  const teamScore = (team) => team.reduce((sum, p) => sum + (p.score ?? 0), 0);

  const teamScoreA = r.state?.teamScores?.A ?? teamScore(teamA);
  const teamScoreB = r.state?.teamScores?.B ?? teamScore(teamB);

  return {
    roomCode,
    hostId: r.hostId,
    state: r.state,
    players,
    teams: {
      A: { members: teamA, score: teamScoreA },
      B: { members: teamB, score: teamScoreB },
    },
  };
}

function broadcast(roomCode) {
  io.to(roomCode).emit("room:update", getPublicRoom(roomCode));
}

function makeQuestion(diff = "easy") {
  const max = diff === "easy" ? 10 : diff === "med" ? 25 : 50;
  const ops = ["+", "-", "×", "÷"];
  const op = ops[Math.floor(Math.random() * ops.length)];

  // produce integer-friendly division questions (a ÷ b = q) and normal arithmetic for others
  if (op === "+") {
    const a = Math.floor(Math.random() * (max + 1));
    const b = Math.floor(Math.random() * (max + 1));
    return { a, b, op, answer: a + b };
  }

  if (op === "-") {
    let a = Math.floor(Math.random() * (max + 1));
    let b = Math.floor(Math.random() * (max + 1));
    if (b > a) [a, b] = [b, a];
    return { a, b, op, answer: a - b };
  }

  if (op === "×") {
    const a = Math.floor(Math.random() * (max + 1));
    const b = Math.floor(Math.random() * (max + 1));
    return { a, b, op, answer: a * b };
  }

  // division: choose divisor and quotient so answer is integer
  const b = Math.floor(Math.random() * max) + 1; // divisor 1..max
  const q = Math.floor(Math.random() * max) + 1; // quotient 1..max
  const a = b * q; // dividend
  return { a, b, op, answer: q };
}

function allReady(room) {
  const ps = Array.from(room.players.values());
  const seated = ps.filter((p) => p.team && (p.slot === 0 || p.slot === 1));
  if (seated.length !== 4) return false;

  const a = seated.filter((p) => p.team === "A").length;
  const b = seated.filter((p) => p.team === "B").length;
  if (a !== 2 || b !== 2) return false;

  return seated.every((p) => p.ready);
}

function startRound(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const q = makeQuestion(room.state.diff);

  room.state.phase = "playing";
  room.state.round += 1;
  room.state.question = { a: q.a, b: q.b, op: q.op };
  room.state.correct = q.answer;

  // Team-built answer slots
  room.state.teamDigits = {
    A: { thousands: null, hundreds: null, tens: null, ones: null, whoThousands: null, whoHundreds: null, whoTens: null, whoOnes: null, lockedThousands: false, lockedHundreds: false, lockedTens: false, lockedOnes: false, overallLocked: false, submittedValue: null, submittedBy: null, submittedAt: null },
    B: { thousands: null, hundreds: null, tens: null, ones: null, whoThousands: null, whoHundreds: null, whoTens: null, whoOnes: null, lockedThousands: false, lockedHundreds: false, lockedTens: false, lockedOnes: false, overallLocked: false, submittedValue: null, submittedBy: null, submittedAt: null },
  };

  // Auto-fill digits: for 3-digit answers fill hundreds; for 4-digit fill thousands+hundreds so players still answer tens+ones
  const ansStr = String(q.answer);
  if (ansStr.length === 4) {
    const th = Number(ansStr[0]);
    const h = Number(ansStr[1]);
    room.state.teamDigits.A.thousands = th;
    room.state.teamDigits.B.thousands = th;
    room.state.teamDigits.A.hundreds = h;
    room.state.teamDigits.B.hundreds = h;
    room.state.teamDigits.A.lockedThousands = true;
    room.state.teamDigits.B.lockedThousands = true;
    room.state.teamDigits.A.lockedHundreds = true;
    room.state.teamDigits.B.lockedHundreds = true;
  } else if (ansStr.length === 3) {
    const h = Number(ansStr[0]);
    room.state.teamDigits.A.hundreds = h;
    room.state.teamDigits.B.hundreds = h;
    room.state.teamDigits.A.lockedHundreds = true;
    room.state.teamDigits.B.lockedHundreds = true;
  }

  room.state.roundEndsAt = Date.now() + room.state.roundMs;

  broadcast(roomCode);
  io.to(roomCode).emit("game:roundStart", {
    round: room.state.round,
    question: room.state.question,
    roundMs: room.state.roundMs,
    endsAt: room.state.roundEndsAt,
  });

  setTimeout(() => endRound(roomCode), room.state.roundMs + 50);
}

function endRound(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || room.state.phase !== "playing") return;

  room.state.phase = "results";

  const correct = room.state.correct;
  const correctStr = String(correct);

  function builtNumber(teamDigits) {
    const tens = teamDigits.tens ?? 0;
    const ones = teamDigits.ones ?? 0;

    if (correctStr.length === 1) return ones;
    if (correctStr.length === 2) return tens * 10 + ones;
    if (correctStr.length === 3) {
      const hundreds = teamDigits.hundreds ?? Number(correctStr[0]) ?? 0;
      return hundreds * 100 + tens * 10 + ones;
    }

    // 4-digit answer
    const thousands = teamDigits.thousands ?? Number(correctStr[0]) ?? 0;
    const hundreds = teamDigits.hundreds ?? Number(correctStr[1]) ?? 0;
    return thousands * 1000 + hundreds * 100 + tens * 10 + ones;
  }

  const builtA = builtNumber(room.state.teamDigits.A);
  const builtB = builtNumber(room.state.teamDigits.B);

  // scoring: award points to the team (team-level scores)
  if (!room.state.teamScores) room.state.teamScores = { A: 0, B: 0 };
  if (builtA === correct) {
    room.state.teamScores.A += 15;
  }
  if (builtB === correct) {
    room.state.teamScores.B += 15;
  }

  // update per-team correct counts and record time to reach target if achieved
  const target = room.state.targetCorrect ?? 10;
  const now = Date.now();
  const teamStats = room.state.teamStats ?? { A: { correctCount: 0, timeToTarget: null }, B: { correctCount: 0, timeToTarget: null } };

  if (builtA === correct) {
    teamStats.A.correctCount = (teamStats.A.correctCount || 0) + 1;
    if (teamStats.A.correctCount >= target && teamStats.A.timeToTarget == null) {
      teamStats.A.timeToTarget = now - (room.state.matchStartAt || now);
    }
  }
  if (builtB === correct) {
    teamStats.B.correctCount = (teamStats.B.correctCount || 0) + 1;
    if (teamStats.B.correctCount >= target && teamStats.B.timeToTarget == null) {
      teamStats.B.timeToTarget = now - (room.state.matchStartAt || now);
    }
  }

  room.state.teamStats = teamStats;

  const results = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    team: p.team,
  }));

  broadcast(roomCode);
  io.to(roomCode).emit("game:roundEnd", {
    correct,
    results,
    built: { A: builtA, B: builtB },
    teamStats,
  });

  // check for a winner by reaching targetCorrect
  const aReached = teamStats.A.correctCount >= target;
  const bReached = teamStats.B.correctCount >= target;

  if (aReached || bReached) {
    // determine winner
    let winner = null;
    if (aReached && !bReached) winner = "A";
    else if (bReached && !aReached) winner = "B";
    else if (aReached && bReached) {
      // both reached; pick the one with earlier timeToTarget (smaller)
      const tA = teamStats.A.timeToTarget ?? Infinity;
      const tB = teamStats.B.timeToTarget ?? Infinity;
      if (tA < tB) winner = "A";
      else if (tB < tA) winner = "B";
      else winner = "tie";
    }

    room.state.phase = "ended";
    broadcast(roomCode);
    io.to(roomCode).emit("game:ended", { results, built: { A: builtA, B: builtB }, teamStats, winner });
    return;
  }

  const isOver = room.state.round >= room.state.totalRounds;

  setTimeout(() => {
    if (!rooms.has(roomCode)) return;

    if (isOver) {
      // fallback: decide winner by higher correctCount, then by time
      let winner = null;
      if (teamStats.A.correctCount > teamStats.B.correctCount) winner = "A";
      else if (teamStats.B.correctCount > teamStats.A.correctCount) winner = "B";
      else {
        // tie-break by earlier timeToTarget (or tie)
        const tA = teamStats.A.timeToTarget ?? Infinity;
        const tB = teamStats.B.timeToTarget ?? Infinity;
        if (tA < tB) winner = "A";
        else if (tB < tA) winner = "B";
        else winner = "tie";
      }

      room.state.phase = "ended";
      broadcast(roomCode);
      io.to(roomCode).emit("game:ended", { results, built: { A: builtA, B: builtB }, teamStats, winner });
    } else {
      startRound(roomCode);
    }
  }, 1800);
}

io.on("connection", (socket) => {
  socket.on("team:digit", ({ roomCode, place, digit }) => {
    const code = String(roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room || room.state.phase !== "playing") return;

    const p = room.players.get(socket.id);
    if (!p?.team) return;

    if (!["tens", "ones"].includes(place)) return;

    // slot 0 controls tens, slot 1 controls ones
    const allowed = p.slot === 0 ? "tens" : "ones";
    if (place !== allowed) return;

    const d = Number(digit);
    if (!Number.isInteger(d) || d < 0 || d > 9) return;

    const teamObj = room.state.teamDigits?.[p.team];
    if (!teamObj || teamObj.overallLocked) return;

    // prevent changing a digit that's already individually locked (correct)
    if ((place === "tens" && teamObj.lockedTens) || (place === "ones" && teamObj.lockedOnes)) return;

    teamObj[place] = d;
    // record who set this digit so we can show per-player live updates
    const cap = place[0].toUpperCase() + place.slice(1); // Tens or Ones
    teamObj[`who${cap}`] = p.id;

    // clear previous submitted info if player continues typing
    teamObj.submittedValue = null;
    teamObj.submittedBy = null;
    teamObj.submittedAt = null;

    // determine expected digit for this place from correct answer
    const correctStr = String(room.state.correct || "0");
    const padded = correctStr.padStart(4, "0");
    const expected = { thousands: Number(padded[0]), hundreds: Number(padded[1]), tens: Number(padded[2]), ones: Number(padded[3]) };

    // if this digit matches the expected digit for its place, lock that place
    if (d === expected[place]) {
      if (place === "tens") teamObj.lockedTens = true;
      if (place === "ones") teamObj.lockedOnes = true;
    }

    // if both tens and ones filled (regardless of correctness), lock overall and end round soon
    if (teamObj.tens !== null && teamObj.ones !== null) {
      teamObj.overallLocked = true;
      broadcast(code);
      setTimeout(() => endRound(code), 150);
      return;
    }

    broadcast(code);
  });

  // handle explicit submit (player pressed Enter to submit both digits together)
  socket.on("team:submit", ({ roomCode, tens, ones }) => {
    console.log('server recv team:submit', { id: socket.id, roomCode, tens, ones });
    const code = String(roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room || room.state.phase !== "playing") return;

    const p = room.players.get(socket.id);
    if (!p?.team) return;

    const t = Number(tens);
    const o = Number(ones);
    if (!Number.isInteger(t) || t < 0 || t > 9) return;
    if (!Number.isInteger(o) || o < 0 || o > 9) return;

    const teamObj = room.state.teamDigits?.[p.team];
    if (!teamObj || teamObj.overallLocked) return;

    teamObj.tens = t;
    teamObj.ones = o;
    teamObj.whoTens = p.id;
    teamObj.whoOnes = p.id;

    // determine expected digits and lock correct places
    const correctStr = String(room.state.correct || "0");
    const padded = correctStr.padStart(4, "0");
    const expected = { thousands: Number(padded[0]), hundreds: Number(padded[1]), tens: Number(padded[2]), ones: Number(padded[3]) };

    if (t === expected.tens) teamObj.lockedTens = true;
    if (o === expected.ones) teamObj.lockedOnes = true;

    // record submission info to display as a full answer in slots table
    const built = (teamObj.hundreds ?? Number(padded[1]) ?? 0) * 100 + t * 10 + o;
    teamObj.submittedValue = built;
    teamObj.submittedBy = p.id;
    teamObj.submittedAt = Date.now();

    teamObj.overallLocked = true;

    broadcast(code);
    setTimeout(() => endRound(code), 150);
  });

  socket.on("room:join", ({ roomCode, name }) => {
    const code = String(roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) return socket.emit("room:error", { message: "Room not found." });

    room.players.set(socket.id, {
      id: socket.id,
      name,
      team: null,
      slot: null,
      ready: false,
      score: 0,
    });

    socket.join(code);
    socket.emit("room:joined", { roomCode: code, selfId: socket.id });
    broadcast(code);
  });

  socket.on("room:create", ({ name }) => {
    const roomCode = makeRoomCode();

    rooms.set(roomCode, {
      hostId: socket.id,
      players: new Map(),
      state: {
        mode: "2v2",
        phase: "lobby",
        diff: "easy",
        roundMs: 12000,
        totalRounds: 10,
        round: 0,
        question: null,
        correct: null,
        roundEndsAt: null,
        teamDigits: null,
        teamScores: { A: 0, B: 0 },
      },
    });

    const room = rooms.get(roomCode);
    room.players.set(socket.id, {
      id: socket.id,
      name,
      team: null,
      slot: null,
      ready: false,
      score: 0,
    });

    socket.join(roomCode);
    socket.emit("room:joined", { roomCode, selfId: socket.id });
    broadcast(roomCode);
  });

  socket.on("team:sit", ({ roomCode, team, slot }) => {
    console.log('server recv team:sit', { id: socket.id, roomCode, team, slot });
    const code = String(roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return;

    if (!["A", "B"].includes(team) || ![0, 1].includes(slot)) return;

    for (const p of room.players.values()) {
      if (p.team === team && p.slot === slot) {
        return socket.emit("room:error", { message: "That slot is taken." });
      }
    }

    const me = room.players.get(socket.id);
    if (!me) return;

    me.team = team;
    me.slot = slot;
    me.ready = false;
    broadcast(code);
    console.log('server broadcast room:update after sit', { roomCode: code, players: Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name, team: p.team, slot: p.slot })) });
  });

  socket.on("player:ready", ({ roomCode, ready }) => {
    console.log('server recv player:ready', { id: socket.id, roomCode, ready });
    const code = String(roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return;

    const p = room.players.get(socket.id);
    if (!p) return;

    p.ready = !!ready;
    broadcast(code);
    console.log('server broadcast room:update after ready', { roomCode: code, players: Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name, team: p.team, slot: p.slot, ready: p.ready })) });
  });

  socket.on("room:settings", ({ roomCode, diff, roundMs, totalRounds }) => {
    const code = String(roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;

    room.state.diff = diff ?? room.state.diff;
    room.state.roundMs = roundMs ?? room.state.roundMs;
    room.state.totalRounds = totalRounds ?? room.state.totalRounds;

    broadcast(code);
  });

  socket.on("game:start", ({ roomCode }) => {
    const code = String(roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;

    if (!allReady(room)) {
      return socket.emit("room:error", { message: "Need 4 seated players and everyone ready." });
    }

    // reset only seated
    const seatedIds = new Set(
      Array.from(room.players.values())
        .filter((p) => p.team && (p.slot === 0 || p.slot === 1))
        .map((p) => p.id)
    );

    for (const p of room.players.values()) {
      if (seatedIds.has(p.id)) {
        p.score = 0;
        p.ready = false;
      }
    }

    room.state.round = 0;
    room.state.phase = "playing";

    // initialize match timing & progress (first to targetCorrect wins)
    room.state.matchStartAt = Date.now();
    room.state.teamStats = {
      A: { correctCount: 0, timeToTarget: null },
      B: { correctCount: 0, timeToTarget: null },
    };
    room.state.targetCorrect = 10; // win by reaching 10 correct rounds first

    // reset team scores (score is tracked per-team now)
    room.state.teamScores = { A: 0, B: 0 };
    broadcast(code);
    startRound(code);
  });

  socket.on("chat:send", ({ roomCode, text }) => {
    const code = String(roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return;

    const p = room.players.get(socket.id);
    if (!p) return;

    io.to(code).emit("chat:new", {
      from: p.name,
      text: String(text).slice(0, 300),
      at: Date.now(),
    });
  });

  socket.on("disconnect", () => {
    for (const [roomCode, room] of rooms.entries()) {
      if (room.players.delete(socket.id)) {
        if (room.hostId === socket.id) {
          const next = room.players.keys().next().value;
          if (next) room.hostId = next;
          else rooms.delete(roomCode);
        }
        broadcast(roomCode);
      }
    }
  });
});

server.listen(5050, "127.0.0.1", () =>
  console.log("Server running on http://127.0.0.1:5050")
);
