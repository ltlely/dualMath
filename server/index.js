import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import {
  getDefaultMatchSettings,
  isPlayerCompatibleWithRoom,
} from "./rankingSystem.js";

const app = express();
app.use(cors());

// Simple request logger to help debug deployed routes
app.use((req, res, next) => {
  console.log(`➡️  ${new Date().toISOString()} ${req.method} ${req.path} from ${req.headers.origin || req.ip}`);
  next();
});

// Root route: respond with a friendly HTML page to prevent 'Cannot GET /' in browsers
app.get("/", (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
    <html>
      <head><meta charset="utf-8"><title>Math Game API</title></head>
      <body style="font-family:system-ui,Arial,sans-serif;margin:36px;color:#222">
        <h1>Math Game Server</h1>
        <p>The server is running. For WebSocket connections use Socket.IO endpoint.</p>
        <ul>
          <li><a href="/health">/health</a> — health check</li>
          <li>Socket endpoint: <code>/socket.io/</code></li>
        </ul>
      </body>
    </html>
  `);
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

const server = http.createServer(app);

// Get allowed origins from environment or use defaults
const getAllowedOrigins = () => {
  const env = process.env.ALLOWED_ORIGINS;
  if (env) {
    return env.split(',').map(o => o.trim());
  }
  return [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://dual-math.vercel.app",
    "https://dualmath.onrender.com",
    "https://*.vercel.app",
    "https://*.onrender.com",
    "http://127.0.0.1:5173", 
    "http://127.0.0.1:3000", 
  ];
};

const allowedOrigins = getAllowedOrigins();
console.log("✅ Socket.IO CORS allowed origins:", allowedOrigins);

const isAllowed = (origin) => {
  if (!origin) return true; // allow curl/postman/no-origin
  if (allowedOrigins.includes(origin)) return true;

  // allow any vercel preview + onrender subdomains
  if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return true;
  if (/^https:\/\/.*\.onrender\.com$/.test(origin)) return true;

  return false;
};

const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      if (isAllowed(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked origin: ${origin}`), false);
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const rooms = new Map(); // roomCode -> { hostId, players: Map(socketId -> player), state }
const onlineUsers = new Map();
const pendingGameInvites = new Map();

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
    profileId: p.profileId ?? null,
    name: p.name ?? null,
    ready: p.ready,
    score: p.score,
    team: p.team ?? null,
    slot: p.slot ?? null,
    avatarData: p.avatarData ?? null,
    rankPoints: p.rankPoints ?? 0,
    rankLevel: p.rankLevel ?? "Novice",
  }));

  const teamA = players.filter((p) => p.team === "A");
  const teamB = players.filter((p) => p.team === "B");

  const teamScore = (team) => team.reduce((sum, p) => sum + (p.score ?? 0), 0);

  const teamScoreA = r.state?.teamScores?.A ?? teamScore(teamA);
  const teamScoreB = r.state?.teamScores?.B ?? teamScore(teamB);

  // Get team questions (without answers for security)
  const teamQuestions = {};
  if (r.state?.teamQuestions) {
    if (r.state.teamQuestions.A) {
      teamQuestions.A = {
        a: r.state.teamQuestions.A.a,
        b: r.state.teamQuestions.A.b,
        op: r.state.teamQuestions.A.op,
        round: r.state.teamQuestions.A.round
      };
    }
    if (r.state.teamQuestions.B) {
      teamQuestions.B = {
        a: r.state.teamQuestions.B.a,
        b: r.state.teamQuestions.B.b,
        op: r.state.teamQuestions.B.op,
        round: r.state.teamQuestions.B.round
      };
    }
  }

  // Include teamDigits with answerLength
  const teamDigits = {};
  if (r.state?.teamDigits) {
    if (r.state.teamDigits.A) {
      teamDigits.A = { ...r.state.teamDigits.A };
    }
    if (r.state.teamDigits.B) {
      teamDigits.B = { ...r.state.teamDigits.B };
    }
  }

  return {
    roomCode,
    name: r.name,
    hostId: r.hostId,
    state: {
      ...r.state,
      teamQuestions,
      teamDigits,
      teamRounds: r.state?.teamRounds ?? { A: 0, B: 0 },
    },
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
  // Easy: 1-2 digit answers (max 99)
  // Medium: 2-3 digit answers (10-999), players fill tens+ones, hundreds auto-filled if 3 digits
  // Hard: 3-4 digit answers (100-9999), players fill tens+ones, hundreds+thousands auto-filled
  
  if (diff === "easy") {
  const ops = ["+", "-", "×"];
  const op = ops[Math.floor(Math.random() * ops.length)];

  if (op === "+") {
    const answer = Math.floor(Math.random() * 90) + 10; // 10-99
    const a = Math.floor(Math.random() * answer);
    const b = answer - a;
    return { a, b, op, answer };
  }

  if (op === "-") {
    const answer = Math.floor(Math.random() * 90) + 10; // 10-99
    const b = Math.floor(Math.random() * 50) + 1;
    const a = answer + b;
    return { a, b, op, answer };
  }

  // multiplication with guaranteed 2-digit answer
  let a, b, answer;
  do {
    a = Math.floor(Math.random() * 9) + 2;
    b = Math.floor(Math.random() * 9) + 2;
    answer = a * b;
  } while (answer < 10 || answer > 99);

  return { a, b, op, answer };
}
  
  if (diff === "med") {
    // Medium: answers should be 2-3 digits (10-999)
    // If 3 digits, hundreds place is auto-filled
    const ops = ["+", "-", "×", "÷"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    
    if (op === "+") {
      // Generate numbers that add to 10-999
      const target = Math.floor(Math.random() * 900) + 100; // 100-999 for 3-digit
      const a = Math.floor(Math.random() * target);
      const b = target - a;
      return { a, b, op, answer: target };
    }
    if (op === "-") {
      // a - b where result is 10-999
      const answer = Math.floor(Math.random() * 900) + 100;
      const b = Math.floor(Math.random() * 500) + 1;
      const a = answer + b;
      return { a, b, op, answer };
    }
    if (op === "×") {
      // Multiplication with 2-3 digit answers
      const a = Math.floor(Math.random() * 30) + 5; // 5-34
      const b = Math.floor(Math.random() * 30) + 5; // 5-34
      return { a, b, op, answer: a * b };
    }
    // Division with clean results
    const answer = Math.floor(Math.random() * 90) + 10; // 10-99
    const b = Math.floor(Math.random() * 9) + 2; // 2-10
    const a = answer * b;
    return { a, b, op: "÷", answer };
  }
  
  // Hard: answers should be 3-4 digits (100-9999)
  // Hundreds and thousands places auto-filled
  const ops = ["+", "-", "×", "÷"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  
  if (op === "+") {
    // Generate numbers that add to 1000-9999 for 4-digit answers
    const target = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
    const a = Math.floor(Math.random() * target);
    const b = target - a;
    return { a, b, op, answer: target };
  }
  if (op === "-") {
    // a - b where result is 1000-9999
    const answer = Math.floor(Math.random() * 9000) + 1000;
    const b = Math.floor(Math.random() * 2000) + 1;
    const a = answer + b;
    return { a, b, op, answer };
  }
  if (op === "×") {
    // Multiplication with 3-4 digit answers
    const a = Math.floor(Math.random() * 90) + 20; // 20-109
    const b = Math.floor(Math.random() * 90) + 20; // 20-109
    return { a, b, op, answer: a * b };
  }
  // Division with clean results (3-4 digit dividend)
  const answer = Math.floor(Math.random() * 900) + 100; // 100-999
  const b = Math.floor(Math.random() * 9) + 2; // 2-10
  const a = answer * b;
  return { a, b, op: "÷", answer };
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

function maybeSwapTeamSlots(room, teamKey) {
  const correctCount = room.state.teamStats?.[teamKey]?.correctCount ?? 0;

  // switch only when team reaches 5 correct answers
  if (correctCount !== 5) return;

  const teamPlayers = Array.from(room.players.values()).filter(
    (p) => p.team === teamKey
  );
  if (teamPlayers.length < 2) return;

  for (const player of teamPlayers) {
    if (player.slot === 0) player.slot = 1;
    else if (player.slot === 1) player.slot = 0;
  }
}

function startRound(roomCode, team = null) {
  const room = rooms.get(roomCode);
  if (!room) return;

  // If team is specified, only start round for that team
  // Otherwise start for both teams (initial start)
  const teams = team ? [team] : ["A", "B"];
  const diff = room.state.diff || "easy";

  for (const t of teams) {
    const q = makeQuestion(diff);

    // Store question per team so each team can have different questions
    if (!room.state.teamQuestions) {
      room.state.teamQuestions = { A: null, B: null };
    }
    
    room.state.teamQuestions[t] = {
      a: q.a,
      b: q.b,
      op: q.op,
      answer: q.answer,
      round: (room.state.teamRounds?.[t] ?? 0) + 1
    };

    // Track rounds per team
  if (!room.state.teamRounds) {
  room.state.teamRounds = { A: 0, B: 0 };
}
room.state.teamRounds[t] += 1;

    // Reset team digits for this team
    if (!room.state.teamDigits) {
      room.state.teamDigits = { A: null, B: null };
    }
    
    const ansStr = String(q.answer);
    const ansLen = ansStr.length;
    
    // Initialize all digit slots
    room.state.teamDigits[t] = { 
      thousands: null, hundreds: null, tens: null, ones: null, 
      whoThousands: null, whoHundreds: null, whoTens: null, whoOnes: null, 
      lockedThousands: false, lockedHundreds: false, lockedTens: false, lockedOnes: false, 
      overallLocked: false, submittedValue: null, submittedBy: null, submittedAt: null,
      answerLength: ansLen // Store answer length for client
    };

    // Auto-fill digits based on difficulty and answer length
    // Easy: no auto-fill (1-2 digit answers)
    // Medium: auto-fill hundreds if 3-digit answer (players do tens + ones)
    // Hard: auto-fill thousands + hundreds if 4-digit, or hundreds if 3-digit
    
    if (diff === "easy") {
      // No auto-fill for easy mode
      // 1-digit: just ones
      // 2-digit: tens + ones (both filled by players)
    } else if (diff === "med") {
      // Medium: if 3 digits, auto-fill hundreds
      if (ansLen >= 3) {
        room.state.teamDigits[t].hundreds = Number(ansStr[ansLen - 3]);
        room.state.teamDigits[t].lockedHundreds = true;
      }
    } else if (diff === "hard") {
      // Hard: auto-fill higher digits
      if (ansLen === 4) {
        // 4 digits: auto-fill thousands and hundreds
        room.state.teamDigits[t].thousands = Number(ansStr[0]);
        room.state.teamDigits[t].hundreds = Number(ansStr[1]);
        room.state.teamDigits[t].lockedThousands = true;
        room.state.teamDigits[t].lockedHundreds = true;
      } else if (ansLen === 3) {
        // 3 digits: auto-fill hundreds
        room.state.teamDigits[t].hundreds = Number(ansStr[0]);
        room.state.teamDigits[t].lockedHundreds = true;
      }
    }
  }

  room.state.phase = "playing";

  broadcast(roomCode);
  
  // Emit round start to each team with their own question
  const playersArray = Array.from(room.players.values());
  for (const t of teams) {
    const teamPlayers = playersArray.filter(p => p.team === t);
    const teamQuestion = room.state.teamQuestions[t];
    const teamDigits = room.state.teamDigits[t];
    
    for (const p of teamPlayers) {
      io.to(p.id).emit("game:roundStart", {
        round: room.state.teamRounds[t],
        question: { a: teamQuestion.a, b: teamQuestion.b, op: teamQuestion.op },
        teamRounds: room.state.teamRounds,
        answerLength: teamDigits.answerLength,
        noTimer: true,
      });
    }
  }
}

function endRoundForTeam(roomCode, team) {
  const room = rooms.get(roomCode);
  if (!room || room.state.phase !== "playing") return;

  const teamQuestion = room.state.teamQuestions?.[team];
  if (!teamQuestion) return;

  const correct = teamQuestion.answer;
  const correctStr = String(correct);
  const teamDigits = room.state.teamDigits?.[team];

  function builtNumber(td) {
    const tens = td?.tens ?? 0;
    const ones = td?.ones ?? 0;
    if (correctStr.length === 1) return ones;
    if (correctStr.length === 2) return tens * 10 + ones;
    if (correctStr.length === 3) {
      const hundreds = td?.hundreds ?? Number(correctStr[0]) ?? 0;
      return hundreds * 100 + tens * 10 + ones;
    }
    const thousands = td?.thousands ?? Number(correctStr[0]) ?? 0;
    const hundreds = td?.hundreds ?? Number(correctStr[1]) ?? 0;
    return thousands * 1000 + hundreds * 100 + tens * 10 + ones;
  }

  const built = builtNumber(teamDigits);
  const isCorrect = built === correct;

  if (!room.state.teamStats) {
    room.state.teamStats = {
      A: { correctCount: 0, timeToTarget: null },
      B: { correctCount: 0, timeToTarget: null }
    };
  }

  const target = room.state.targetCorrect ?? 10;
  const now = Date.now();

  if (isCorrect) {
    room.state.teamStats[team].correctCount = (room.state.teamStats[team].correctCount || 0) + 1;
    if (room.state.teamStats[team].correctCount >= target && room.state.teamStats[team].timeToTarget == null) {
      room.state.teamStats[team].timeToTarget = now - (room.state.matchStartAt || now);
    }
  }

  if (isCorrect) {
  room.state.teamStats[team].correctCount =
    (room.state.teamStats[team].correctCount || 0) + 1;

  maybeSwapTeamSlots(room, team);

  if (
    room.state.teamStats[team].correctCount >= target &&
    room.state.teamStats[team].timeToTarget == null
  ) {
    room.state.teamStats[team].timeToTarget =
      now - (room.state.matchStartAt || now);
  }
}

  // DECLARE playersArray FIRST before using it anywhere
  const playersArray = Array.from(room.players.values());

  console.log("🔔 emitting game:teamRoundEnd to room", roomCode, "isCorrect:", isCorrect);
  io.to(roomCode).emit("game:teamRoundEnd", {
    team,
    correct,
    built,
    isCorrect,
    round: room.state.teamRounds[team],
    teamStats: room.state.teamStats,
  });

  broadcast(roomCode);

  const teamReachedTarget = room.state.teamStats[team].correctCount >= target;
  const otherTeam = team === "A" ? "B" : "A";
  const otherReachedTarget = room.state.teamStats[otherTeam].correctCount >= target;

  if (teamReachedTarget) {
    let winner = team;
    if (otherReachedTarget) {
      const tA = room.state.teamStats.A.timeToTarget ?? Infinity;
      const tB = room.state.teamStats.B.timeToTarget ?? Infinity;
      if (tA < tB) winner = "A";
      else if (tB < tA) winner = "B";
      else winner = "tie";
    }
    console.log("🏆 GAME ENDED - Winner:", winner, "Team Stats:", room.state.teamStats);
    room.state.phase = "ended";
    const results = playersArray.map((p) => ({
      id: p.id, name: p.name, score: p.score, team: p.team,
    }));
    broadcast(roomCode);
    io.to(roomCode).emit("game:ended", {
      results, teamStats: room.state.teamStats, winner, teamRounds: room.state.teamRounds
    });
    return;
  }

  setTimeout(() => {
    if (!rooms.has(roomCode)) return;
    if (room.state.phase !== "playing") return;
    startRound(roomCode, team);
  }, 800);
}

// Legacy endRound function - now redirects to per-team logic
function endRound(roomCode) {
  // This is kept for compatibility but shouldn't be called in race mode
  const room = rooms.get(roomCode);
  if (!room) return;
  
  console.log("⚠️ Legacy endRound called - should not happen in race mode");
}

function assignNextHost(room) {
  const remainingPlayers = Array.from(room.players.values());

  if (remainingPlayers.length === 0) return null;

  return remainingPlayers[0].id;
}

io.on("connection", (socket) => {

  socket.on("user:online", ({ profileId, username }) => {
  if (!profileId) return;

  socket.profileId = profileId;
  socket.username = username;
  onlineUsers.set(String(profileId), socket.id);
});

socket.on("gameInvite:send", (payload) => {
  const { inviteId, fromUser, toUserId, roomCode = null } = payload || {};

  const receiverSocketId = onlineUsers.get(String(toUserId));

  if (!receiverSocketId) {
    socket.emit("gameInvite:status", {
      inviteId,
      accepted: false,
      message: "User is offline or unavailable.",
    });
    return;
  }

  const receiverId = String(toUserId);

  const existing = pendingGameInvites.get(receiverId) || [];
  pendingGameInvites.set(receiverId, [
    ...existing,
    {
      inviteId,
      senderProfileId: fromUser?.id,
    },
  ]);

  io.to(receiverSocketId).emit("gameInvite:incoming", {
    inviteId,
    fromUser,
    toUserId,
    roomCode,
  });
});

socket.on("gameInvite:respond", (payload) => {
  const {
    inviteId,
    fromUserId,
    toUser,
    accepted,
    roomCode = null,
  } = payload || {};

  const responderId = String(toUser?.id || "");

  if (responderId) {
    const existing = pendingGameInvites.get(responderId) || [];
    const next = existing.filter((item) => item.inviteId !== inviteId);

    if (next.length) pendingGameInvites.set(responderId, next);
    else pendingGameInvites.delete(responderId);
  }

  const senderSocketId = onlineUsers.get(String(fromUserId));
  if (!senderSocketId) return;

  io.to(senderSocketId).emit("gameInvite:status", {
    inviteId,
    accepted,
    roomCode,
    message: accepted
      ? `${toUser?.username || "User"} accepted your game invite.`
      : `${toUser?.username || "User"} declined your game invite.`,
  });
});

  socket.on("game:forfeit", ({ roomCode }) => {
    const code = String(roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);

    console.log("🚩 server recv game:forfeit", {
      socketId: socket.id,
      roomCode: code,
      phase: room?.state?.phase,
    });

    forfeitGame(code, socket.id, "manual_forfeit");
  });

socket.on("disconnect", () => {
 const disconnectedProfileId = socket.profileId
    ? String(socket.profileId)
    : null;

  if (disconnectedProfileId) {
    const pendingForUser = pendingGameInvites.get(disconnectedProfileId) || [];

    for (const invite of pendingForUser) {
      const senderSocketId = onlineUsers.get(String(invite.senderProfileId));

      if (senderSocketId) {
        io.to(senderSocketId).emit("gameInvite:status", {
          inviteId: invite.inviteId,
          accepted: false,
          message: "User went offline. Invite expired.",
        });
      }
    }

    pendingGameInvites.delete(disconnectedProfileId);
    onlineUsers.delete(disconnectedProfileId);
  }

  try {
    for (const [roomCode, room] of rooms.entries()) {
      if (!room.players.has(socket.id)) continue;

      const wasPlaying = room.state?.phase === "playing";
      const wasHost = room.hostId === socket.id;

      if (wasPlaying) {
        forfeitGame(roomCode, socket.id, "disconnect");
      }

      const latestRoom = rooms.get(roomCode);
      if (!latestRoom) continue;

      latestRoom.players.delete(socket.id);

      if (wasHost) {
        const nextHostId = Array.from(latestRoom.players.keys())[0] || null;

        if (nextHostId) {
          latestRoom.hostId = nextHostId;
        } else {
          rooms.delete(roomCode);
          continue;
        }
      }

      applyAutoMatchSettings(latestRoom);
      broadcast(roomCode);
    }
  } catch (err) {
    console.error("disconnect handler crashed:", err);
  }
});

  


  socket.on("team:digit", ({ roomCode, place, digit }) => {
      console.log("📨 team:digit received", { roomCode, place, digit, id: socket.id });

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

    // Get the correct answer for THIS team's question
    const teamQuestion = room.state.teamQuestions?.[p.team];
    const correctStr = String(teamQuestion?.answer || "0");
    const padded = correctStr.padStart(4, "0");
    const expected = { thousands: Number(padded[0]), hundreds: Number(padded[1]), tens: Number(padded[2]), ones: Number(padded[3]) };

    // if this digit matches the expected digit for its place, lock that place
    if (d === expected[place]) {
      if (place === "tens") teamObj.lockedTens = true;
      if (place === "ones") teamObj.lockedOnes = true;
    }

    // if both tens and ones filled (regardless of correctness), lock overall and end round for this team
    if (teamObj.tens !== null && teamObj.ones !== null) {
      teamObj.overallLocked = true;
      broadcast(code);
      setTimeout(() => endRoundForTeam(code, p.team), 150);
      return;
    }

    broadcast(code);
  });

  // handle explicit submit (player pressed Enter to submit both digits together)
  socket.on("team:submit", ({ roomCode, tens, ones }) => {
    console.log('server recv team:submit', { id: socket.id, roomCode, tens, ones });
      console.log("📨 team:submit received", { roomCode, tens, ones, id: socket.id });

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

    // Get the correct answer for THIS team's question
    const teamQuestion = room.state.teamQuestions?.[p.team];
    const correctStr = String(teamQuestion?.answer || "0");
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
    setTimeout(() => endRoundForTeam(code, p.team), 150);
  });

  socket.on("room:join", ({ roomCode, name, avatarData, rankPoints = 0, rankLevel = "Novice", profileId = null }) => {
    const code = String(roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) return socket.emit("room:error", { message: "Room not found." });

      const MAX_PLAYERS = 4;
  if ((room.players?.size || 0) >= MAX_PLAYERS) {
    io.to(socket.id).emit("room:error", {
      message: "Room is full (4/4).",
    });
    return;
  }

    room.players.set(socket.id, {
      id: socket.id,
      name,
      avatarData: avatarData ?? null,
      team: null,
      slot: null,
      ready: false,
      score: 0,
      rankPoints,
      rankLevel,
      profileId: profileId ?? null,
    });

    

    socket.join(code);
    socket.emit("room:joined", { roomCode: code, selfId: socket.id });
    applyAutoMatchSettings(room);
    broadcast(code);

    console.log("👥 room:join player =", {
      id: socket.id,
      name,
      rankPoints,
      rankLevel,
    });
  });

  // Join a random available room or create one if none exist
socket.on("room:joinRandom", ({ name, avatarData, rankPoints = 0, rankLevel = "Novice",  profileId = null }) => {
  let targetRoom = null;
  let targetCode = null;

  const incomingPlayer = { rankPoints, rankLevel };

  // Pass 1: prefer compatible open lobby rooms
  for (const [code, room] of rooms.entries()) {
    if (room.state.phase !== "lobby") continue;
    if (room.players.size >= 4) continue;

    const roomPlayers = Array.from(room.players.values());

    if (isPlayerCompatibleWithRoom(incomingPlayer, roomPlayers)) {
      targetRoom = room;
      targetCode = code;
      break;
    }
  }

  // Pass 2: if no compatible room found, join any open lobby room
  if (!targetRoom) {
    for (const [code, room] of rooms.entries()) {
      if (room.state.phase !== "lobby") continue;
      if (room.players.size >= 4) continue;

      targetRoom = room;
      targetCode = code;
      break;
    }
  }

  // Pass 3: if still none, create a new random room
  if (!targetRoom) {
    const roomCode = makeRoomCode();

    rooms.set(roomCode, {
      hostId: socket.id,
      name: "Random Match",
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

    targetRoom = rooms.get(roomCode);
    targetCode = roomCode;
  }

  targetRoom.players.set(socket.id, {
    id: socket.id,
    name: name || "Guest",
    avatarData: avatarData ?? null,
    team: null,
    slot: null,
    ready: false,
    score: 0,
    rankPoints,
    rankLevel,
      profileId: profileId ?? null,
  });

  socket.join(targetCode);
  socket.emit("room:joined", { roomCode: targetCode, selfId: socket.id });
  applyAutoMatchSettings(targetRoom);
  broadcast(targetCode);

  console.log("🎲 room:joinRandom player =", {
    id: socket.id,
    name,
    roomCode: targetCode,
    rankPoints,
    rankLevel,
    hostId: targetRoom.hostId,
    playerCount: targetRoom.players.size,
  });
});
  socket.on("room:create", (payload) => {
  const {
    name,
    roomName,
    playerName,
    avatarData,
    rankPoints = 0,
    rankLevel = "Novice",
    profileId = null
  } = payload || {};

  const roomCode = makeRoomCode();

  const finalRoomName = (roomName ?? name ?? "").trim() || "Unnamed Room";
  const finalPlayerName = (playerName ?? "").trim() || "Host";

  rooms.set(roomCode, {
    hostId: socket.id,
    name: finalRoomName,
    players: new Map(),
    state: {
      mode: "2v2",
      phase: "lobby",
      diff: "easy",
      roundMs: 11000,
      totalRounds: 11,
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
        name: finalPlayerName,
        avatarData: avatarData ?? null,
        team: null,
        slot: null,
        ready: false,
        score: 0,
        rankPoints,
        rankLevel,
        profileId: profileId ?? null,
      });


  socket.join(roomCode);
  socket.emit("room:joined", { roomCode, selfId: socket.id });
  applyAutoMatchSettings(room);
  broadcast(roomCode);

  console.log("🏠 room:create payload =", payload);
  // console.log(`🏠 Room ${roomCode} created. roomName="${finalRoomName}" playerName="${finalPlayerName}"`);
  console.log("🏠 room:create player =", {
    id: socket.id,
    name: room.players.get(socket.id)?.name,
    rankPoints: room.players.get(socket.id)?.rankPoints ?? 0,
    rankLevel: room.players.get(socket.id)?.rankLevel ?? "Novice",
  });
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

      const effectiveRankPoints = me.rankPoints ?? 0;
  const effectiveRankLevel = me.rankLevel ?? "Novice";

   console.log(
    `Player ${me.name} (ID: ${me.id}) sat in Team ${team} Slot ${slot}. Effective Rank: ${effectiveRankLevel} (${effectiveRankPoints} points)`
  );


    applyAutoMatchSettings(room);

console.log("server broadcast room:update after sit", {
  roomCode: code,
  players: Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    team: p.team,
    slot: p.slot,
    rankPoints: p.rankPoints ?? 0,
    rankLevel: p.rankLevel ?? "Novice",
  })),
  diff: room.state.diff,
});

broadcast(code);
  });

  socket.on("player:ready", ({ roomCode, ready }) => {
    console.log('server recv player:ready', { id: socket.id, roomCode, ready });
    const code = String(roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return;

    const p = room.players.get(socket.id);
    if (!p) return;

    p.ready = !!ready;

    applyAutoMatchSettings(room);
    broadcast(code);
console.log("server broadcast room:update after ready", {
  roomCode: code,
  diff: room.state.diff,
  roundMs: room.state.roundMs,
  totalRounds: room.state.totalRounds,
  players: Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    team: p.team,
    slot: p.slot,
    ready: p.ready,
    rankPoints: p.rankPoints ?? 0,
    rankLevel: p.rankLevel ?? "Novice",
  })),
});  });

  // socket.on("room:settings", ({ roomCode, diff, roundMs, totalRounds }) => {
  //   const code = String(roomCode || "").trim().toUpperCase();
  //   const room = rooms.get(code);
  //   if (!room || room.hostId !== socket.id) return;

  //   room.state.diff = diff ?? room.state.diff;
  //   room.state.roundMs = roundMs ?? room.state.roundMs;
  //   room.state.totalRounds = totalRounds ?? room.state.totalRounds;

  //   broadcast(code);
  // });

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

    applyAutoMatchSettings(room);
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
      applyAutoMatchSettings(room);

    startRound(code);
  });

  socket.on("room:leave", ({ roomCode }) => {
  const code = String(roomCode || "").trim().toUpperCase();
  const room = rooms.get(code);
  if (!room) return;

  // ✅ If match is live, leaving = forfeit
  if (room.state.phase === "playing") {
    forfeitGame(code, socket.id, "left_room");
  }

  room.players.delete(socket.id);
  socket.leave(code);

  // If host left, assign new host or delete room
if (room.hostId === socket.id) {
  const nextHostId = assignNextHost(room);
  if (nextHostId) {
    room.hostId = nextHostId;
  } else {
    rooms.delete(code);
    return;
  }

}

  applyAutoMatchSettings(room);
  broadcast(code);

  console.log(`👋 Player left room ${code}`);
});


socket.on("chat:send", ({ roomCode, text }) => {
  const code = String(roomCode || "").trim().toUpperCase();
  const room = rooms.get(code);
  if (!room) return;

  const p = room.players.get(socket.id);
  if (!p) return;

  io.to(code).emit("chat:new", {
    id: `${socket.id}-${Date.now()}`,
    senderId: socket.id,
    sender: p.name,
    text: String(text || "").trim().slice(0, 300),
    createdAt: new Date().toISOString(),
  });
});

  function endGame(roomCode, payload) {
  const room = rooms.get(roomCode);
  if (!room) return;

  // prevent double-ending
  if (room.state.phase === "ended") return;

  room.state.phase = "ended";

  const playersArray = Array.from(room.players.values());
  const results = playersArray.map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    team: p.team,
  }));

  broadcast(roomCode);

  io.to(roomCode).emit("game:ended", {
    results,
    teamStats: room.state.teamStats,
    teamRounds: room.state.teamRounds,
    ...payload, // winner, forfeit, forfeitedBy, reason
  });
}

function forfeitGame(roomCode, leaverSocketId, reason = "disconnect") {
  const room = rooms.get(roomCode);
  if (!room) return;
  if (room.state.phase !== "playing") return; // only forfeit during active match

  const leaver = room.players.get(leaverSocketId);
  const forfeitedBy = leaver?.team ?? null;

  // winner is the opposite team
  let winner = "tie";
  if (forfeitedBy === "A") winner = "B";
  else if (forfeitedBy === "B") winner = "A";

  console.log("🏳️ FORFEIT", { roomCode, forfeitedBy, winner, reason });

  endGame(roomCode, {
    winner,
    forfeit: true,
    forfeitedBy,
    reason,
  });
}

function applyAutoMatchSettings(room) {
  const playerList = Array.from(room.players.values());
  const settings = getDefaultMatchSettings(playerList);

    console.log("🎚️ AUTO MATCH SETTINGS", {
    playerList: playerList.map((p) => ({
      name: p.name,
      rankPoints: p.rankPoints ?? 0,
      rankLevel: p.rankLevel ?? "Novice",
    })),
    settings,
  });

  room.state = {
    ...room.state,
    diff: settings.diff,
    roundMs: 11000,
    totalRounds: 11,
  };



}

//   socket.on("room:leave", ({ roomCode }) => {
//   const code = String(roomCode || "").trim().toUpperCase();
//   const room = rooms.get(code);
//   if (!room) return;

//   // ✅ Forfeit if someone leaves mid-game
//   forfeitIfInGame(code, socket.id);

//   room.players.delete(socket.id);
//   socket.leave(code);

//   // If host left, assign new host or delete room
//   if (room.hostId === socket.id) {
//     const next = room.players.keys().next().value;
//     if (next) {
//       room.hostId = next;
//     } else {
//       rooms.delete(code);
//       return;
//     }
//   }

//   broadcast(code);
//   console.log(`👋 Player left room ${code}`);
// });

});

const PORT = process.env.PORT || 5050;
// Fallback 404 handler (return JSON) - helps detect unexpected routing
app.use((req, res) => {
  res.status(404).json({ error: "not_found", path: req.path });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`listening on ${PORT}`);
});