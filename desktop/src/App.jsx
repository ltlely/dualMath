import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import Lobby from "./ui/Lobby.jsx";
import Room from "./ui/Room.jsx";
import Game from "./ui/Game.jsx";
import Auth from "./ui/Auth.jsx";
import Store from "./ui/Store.jsx";
import PickCharacter from "./ui/PickCharacter.jsx";
import { userManager } from "./userManagerSupabase.js";
import { updatePoints, getRank } from "./rankingSystem.js";
import Rank from "./ui/Rank.jsx";
import FriendList from "./ui/FriendList.jsx";

const isDev = window.location.hostname === "localhost";
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (isDev ? "http://localhost:5050" : "https://dualmath.onrender.com");

console.log("SOCKET_URL =", SOCKET_URL);

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

function createPreviewQuestion() {
  const a = Math.floor(Math.random() * 12) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const ops = ["+", "-", "×"];
  return { a, b, op: ops[Math.floor(Math.random() * ops.length)] };
}

function createPreviewDigits() {
  const tens = Math.floor(Math.random() * 10);
  const ones = Math.floor(Math.random() * 10);
  return {
    answerLength: 2,
    tens,
    ones,
    lockedTens: false,
    lockedOnes: false,
    overallLocked: false,
  };
}

function createPreviewGame(avatarData = null) {
  return {
    roomCode: "T642P",
    state: {
      phase: "playing",
      round: 3,
      totalRounds: 10,
      targetCorrect: 10,
      teamRounds: { A: 3, B: 3 },
      teamDigits: {
        A: {
          answerLength: 2,
          tens: 1,
          ones: 9,
          lockedTens: false,
          lockedOnes: false,
          overallLocked: false,
        },
        B: {
          answerLength: 2,
          tens: 2,
          ones: 0,
          lockedTens: true,
          lockedOnes: false,
          overallLocked: false,
        },
      },
      teamQuestions: {
        A: { a: 12, b: 8, op: "+" },
        B: { a: 9, b: 4, op: "+" },
      },
      teamStats: {
        A: { correctCount: 2, timeToTarget: 25000 },
        B: { correctCount: 4, timeToTarget: 22000 },
      },
    },
    teams: {
      A: {
        score: 12,
        members: [
          { id: "self", name: "lyly", score: 7, slot: 0, ready: true, avatarData },
          { id: "bot2", name: "Nova", score: 5, slot: 1, ready: true, avatarData: null },
        ],
      },
      B: {
        score: 14,
        members: [
          { id: "bot1", name: "Bolt", score: 8, slot: 0, ready: true, avatarData: null },
          { id: "bot3", name: "Zara", score: 6, slot: 1, ready: true, avatarData: null },
        ],
      },
    },
    players: [
      { id: "self", name: "lyly", score: 7, slot: 0, team: "A", ready: true, avatarData },
      { id: "bot2", name: "Nova", score: 5, slot: 1, team: "A", ready: true, avatarData: null },
      { id: "bot1", name: "Bolt", score: 8, slot: 0, team: "B", ready: true, avatarData: null },
      { id: "bot3", name: "Zara", score: 6, slot: 1, team: "B", ready: true, avatarData: null },
    ],
  };
}

async function applyLocalMatchResult(currentUser, didWin, diff = "easy") {
  if (!currentUser) return currentUser;

  const currentPoints = currentUser.rankPoints ?? 0;
  const newPoints = updatePoints(currentPoints, didWin);
  const coinReward = didWin ? getWinCoinReward(diff) : 0;

  const updatedUser = {
    ...currentUser,
    wins: (currentUser.wins ?? 0) + (didWin ? 1 : 0),
    losses: (currentUser.losses ?? 0) + (didWin ? 0 : 1),
    totalGames: (currentUser.totalGames ?? 0) + 1,
    rankPoints: newPoints,
    rank: getRank(newPoints),
    coins: (currentUser.coins ?? 2000) + coinReward,
  };

  await userManager.saveUser(updatedUser);
  return updatedUser;
}

function getWinCoinReward(diff = "easy") {
  switch ((diff || "easy").toLowerCase()) {
    case "med":
    case "medium":
      return 225;
    case "hard":
      return 325;
    case "easy":
    default:
      return 150;
  }
}

async function applyLocalForfeitLoss(currentUser) {
  if (!currentUser) return currentUser;

  const currentPoints = currentUser.rankPoints ?? 0;
  const newPoints = updatePoints(currentPoints, false);

  const updatedUser = {
    ...currentUser,
    losses: (currentUser.losses ?? 0) + 1,
    totalGames: (currentUser.totalGames ?? 0) + 1,
    rankPoints: newPoints,
    rank: getRank(newPoints),
  };

  await userManager.saveUser(updatedUser);
  return updatedUser;
}

const createTinyThumbnail = async (src, size = 64) => {
  if (!src) return null;

  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = size;
      canvas.height = size;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = () => resolve(src);
    img.src = src;
  });
};



export default function App() {
  const [view, setView] = useState("lobby");
  const [roomCode, setRoomCode] = useState(null);
  const [selfId, setSelfId] = useState(null);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [roundInfo, setRoundInfo] = useState(null);
  const [lastRound, setLastRound] = useState(null);
  const [chat, setChat] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [pendingAction, setPendingAction] = useState(null);
  const [sessionError, setSessionError] = useState(null);
  const [screen, setScreen] = useState("lobby");
  const [previewGame, setPreviewGame] = useState(() => createPreviewGame());
  const [lastKnownTeam, setLastKnownTeam] = useState(null);
  const [testRankOverride, setTestRankOverride] = useState(null);
  const [showPickCharacter, setShowPickCharacter] = useState(false);
  const [pendingNewUser, setPendingNewUser] = useState(null);
const [unreadChatCount, setUnreadChatCount] = useState(0);
const [onlineFriends, setOnlineFriends] = useState([]);
const [isOnlineFriendsScrolling, setIsOnlineFriendsScrolling] = useState(false);
const [teamRoundResult, setTeamRoundResult] = useState(null);
   const clickSoundRef = useRef(null);
const mainMusicRef = useRef(null);
const gameMusicRef = useRef(null);

  useEffect(() => {
  const mainMusic = new Audio("/music/coding_loop.wav");
  mainMusic.loop = true;
  mainMusic.volume = 0.20;
  mainMusicRef.current = mainMusic;

  const gameMusic = new Audio("/music/game_loop.wav");
  gameMusic.loop = true;
  gameMusic.volume = 0.20;
  gameMusicRef.current = gameMusic;

  if (view === "game") {
    mainMusic.pause();
    mainMusic.currentTime = 0;

    gameMusic.play().catch((err) => {
      console.log("Game music blocked:", err);
    });
  } else {
    gameMusic.pause();
    gameMusic.currentTime = 0;

    mainMusic.play().catch((err) => {
      console.log("Main music blocked:", err);
    });
  }

  return () => {
    mainMusic.pause();
    gameMusic.pause();
  };
}, [view]);

 useEffect(() => {
  const clickAudio = new Audio("/music/click.wav");
  clickAudio.volume = 0.5;
  clickSoundRef.current = clickAudio;

  const handleGlobalClick = (e) => {
    const target = e.target;
    if (!target.closest("button")) return;

    if (view === "game") {
      if (gameMusicRef.current?.paused) {
        gameMusicRef.current.play().catch(() => {});
      }
    } else {
      if (mainMusicRef.current?.paused) {
        mainMusicRef.current.play().catch(() => {});
      }
    }

    if (clickSoundRef.current) {
      clickSoundRef.current.currentTime = 0;
      clickSoundRef.current.play().catch(() => {});
    }
  };

  document.addEventListener("pointerdown", handleGlobalClick);

  return () => {
    document.removeEventListener("pointerdown", handleGlobalClick);
  };
}, [view]);

const getComputedStatus = useCallback((friend) => {
  const rawStatus = (friend?.status || "").toLowerCase();

  if (rawStatus === "in_match") return "in_match";
  if (rawStatus === "in_room") return "in_room";

  if (!friend?.last_seen) return "offline";

  const diff = Date.now() - new Date(friend.last_seen).getTime();

  if (diff < 45000) return "online";
  return "offline";
}, []);

useEffect(() => {
  let isMounted = true;

  const loadOnlineFriends = async () => {
    try {
      const freshUser = currentUser?.id
        ? currentUser
        : await userManager.getCurrentUser();

      if (!freshUser?.id) {
        if (isMounted) setOnlineFriends([]);
        return;
      }

      const friendsResult = await userManager.getFriends(freshUser.id);
      const friendsData = Array.isArray(friendsResult)
        ? friendsResult
        : (friendsResult?.data || []);

      const nextOnline = friendsData.filter((friend) => {
        const value = getComputedStatus(friend);
        return value === "online" || value === "in_room" || value === "in_match";
      });

      if (isMounted) {
        setOnlineFriends((prev) => {
          const prevIds = prev
            .map((f) => `${f.id}:${getComputedStatus(f)}:${f.last_seen || ""}`)
            .join("|");

          const nextIds = nextOnline
            .map((f) => `${f.id}:${getComputedStatus(f)}:${f.last_seen || ""}`)
            .join("|");

          return prevIds === nextIds ? prev : nextOnline;
        });
      }
    } catch (err) {
      console.error("Could not load online friends:", err);
      if (isMounted) setOnlineFriends([]);
    }
  };

  loadOnlineFriends();
  const interval = setInterval(loadOnlineFriends, 3000);

  return () => {
    isMounted = false;
    clearInterval(interval);
  };
}, [currentUser, getComputedStatus]);

const loadUnreadChatCount = useCallback(async () => {
  if (!currentUser?.id) {
    setUnreadChatCount(0);
    return;
  }

  const result = await userManager.getUnreadChatSummary(currentUser.id);
  const senders = result?.unreadSenders || [];
  setUnreadChatCount(senders.length);
}, [currentUser?.id]);


useEffect(() => {
  if (!currentUser?.id) {
    setUnreadChatCount(0);
    return;
  }

  loadUnreadChatCount();

  const interval = setInterval(() => {
    loadUnreadChatCount();
  }, 3000);

  return () => clearInterval(interval);
}, [currentUser?.id, loadUnreadChatCount]);

  const effectiveRankPoints =
    testRankOverride?.rankPoints ?? currentUser?.rankPoints ?? 0;
  const effectiveRankLevel =
    testRankOverride?.rankLevel ?? currentUser?.rank ?? "Novice";

    const setUserPresence = useCallback(
  async (nextStatus) => {
    if (!currentUser?.id) return;
    await userManager.updateStatus(currentUser.id, nextStatus);
  },
  [currentUser?.id]
);

  const handlePreviewSubmit = useCallback(({ tens, ones }) => {
    setPreviewGame((prev) => {
      if (!prev) return prev;

      const nextRound = Math.min(
        (prev.state.round || 0) + 1,
        prev.state.totalRounds
      );

      return {
        ...prev,
        state: {
          ...prev.state,
          round: nextRound,
          teamRounds: {
            A: (prev.state.teamRounds?.A || 0) + 1,
            B: (prev.state.teamRounds?.B || 0) + 1,
          },
          teamQuestions: {
            A: createPreviewQuestion(),
            B: createPreviewQuestion(),
          },
          teamDigits: {
            A: createPreviewDigits(),
            B: createPreviewDigits(),
          },
        },
      };
    });
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("pending_forfeit");
    if (!raw) return;

    localStorage.removeItem("pending_forfeit");

    const applyForfeit = async () => {
      const updated = await applyLocalForfeitLoss(currentUser);
      setCurrentUser(updated);
    };

    if (currentUser) applyForfeit();
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const cachedUser = userManager.getCurrentUserSync();
      if (cachedUser) {
        console.log("🔄 Restored cached session for user:", cachedUser.username);
        setCurrentUser(cachedUser);
      }

      const freshUser = await userManager.getCurrentUser();
      if (freshUser) {
        console.log("🔄 Loaded fresh user data from Supabase:", freshUser.username);
        setCurrentUser(freshUser);
      } else if (cachedUser) {
        console.log("⚠️ Session invalidated - clearing local state");
        setCurrentUser(null);
        setSessionError(
          "You've been logged out because another device signed in with this account."
        );
      }
    };

    loadUser();
  }, []);

//   const previewPickCharacterUser = {
//   id: "preview-user",
//   username: "Preview",
//   email: "preview@test.com",
//   coins: 2000,
//   ownedItems: [],
// };

  useEffect(() => {
    const {
      data: { subscription },
    } = userManager.onAuthStateChange((user) => {
      console.log("🔔 Auth state changed:", user?.username || "logged out");
      setCurrentUser(user);

      if (!user) {
        setView("lobby");
        setRoomCode(null);
        setSelfId(null);
        setRoom(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const validateInterval = setInterval(async () => {
      const result = await userManager.validateSession();
      if (!result.valid && result.reason === "session_replaced") {
        setSessionError(
          "You've been logged out because another device signed in with this account."
        );
        setCurrentUser(null);
        setView("lobby");
        setRoomCode(null);
        setSelfId(null);
        setRoom(null);
      }
    }, 30000);

    return () => clearInterval(validateInterval);
  }, [currentUser]);

  useEffect(() => {
    const onConnect = () => {
      console.log("✅ socket connected", socket.id);
      setIsConnected(true);
      setError("");

      if (pendingAction) {
        console.log(
          "🔄 Executing pending action after reconnect:",
          pendingAction.type
        );

        if (pendingAction.type === "createRoom") {
          socket.emit("room:create", pendingAction.data);
        } else if (pendingAction.type === "joinRoom") {
          socket.emit("room:join", pendingAction.data);
        } else if (pendingAction.type === "joinRandom") {
          socket.emit("room:joinRandom", pendingAction.data);
        }

        setPendingAction(null);
      }
    };

    const onDisconnect = (reason) => {
      console.log("⚠️ socket disconnected", reason);
      setIsConnected(false);
      if (reason === "io server disconnect") {
        socket.connect();
      }
    };

    const onConnectError = (e) => {
      console.log("❌ connect_error", e.message);
      setIsConnected(false);
      setError("Connection error. Retrying...");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
    };
  }, [pendingAction]);

  useEffect(() => {
    socket.on("room:joined", async ({ roomCode, selfId }) => {
  console.log("✅ Room joined:", roomCode);
  setPendingAction(null);
  setRoomCode(roomCode);
  setSelfId(selfId);
  setView("room");
  setError("");
  setLastRound(null);
  setRoundInfo(null);
  setChat([]);

  if (currentUser?.id) {
    await userManager.updateStatus(currentUser.id, "in_room");
  }
});

    socket.on("room:update", (r) => {
      setRoom(r);

      const me = (r?.players ?? []).find((p) => p.id === selfId);
      if (me?.team) {
        setLastKnownTeam(me.team);
      }

      if (r?.state?.phase === "lobby") {
        setView("room");
      }

      if (r?.state?.phase === "ended") {
        setView("game");
      }
    });

    socket.on("game:teamRoundEnd", (payload) => {
  setTeamRoundResult(payload);
});



    socket.on("room:error", ({ message }) => setError(message));

   socket.on("game:roundStart", async (info) => {
    setTeamRoundResult(null);
  setRoundInfo(info);
  setLastRound(null);
  setView("game");

  if (currentUser?.id) {
    await userManager.updateStatus(currentUser.id, "in_match");
  }
});

    socket.on("game:roundEnd", (payload) => {
      setLastRound(payload);
    });

    socket.on("game:ended", async (payload) => {
      setLastRound(payload);

      const me = (room?.players ?? []).find((p) => p.id === selfId);
      const myTeam = me?.team || lastKnownTeam;

      if (payload?.winner && payload.winner !== "tie" && myTeam) {
        const didWin = payload.winner === myTeam;
        const matchDiff = room?.state?.diff ?? "easy";
        const updated = await applyLocalMatchResult(
          currentUser,
          didWin,
          matchDiff
        );
        setCurrentUser(updated);
      }

if (currentUser?.id) {
  await userManager.updateStatus(currentUser.id, "online");
}
setView("game");

      

    });

    socket.on("chat:new", (m) => setChat((prev) => [...prev, m]));

    return () => {
      socket.off("room:joined");
      socket.off("room:update");
      socket.off("room:error");
      socket.off("game:roundStart");
      socket.off("game:roundEnd");
      socket.off("game:ended");
      socket.off("chat:new");
      socket.off("game:teamRoundEnd");
    };
  }, [currentUser, selfId, room, lastKnownTeam]);

  const actions = useMemo(
    () => ({
      sit: ({ team, slot }) => {
        console.log("emit team:sit", { roomCode, team, slot });
        socket.emit("team:sit", { roomCode, team, slot });
      },

      createRoom: async ({ name }) => {
        if (currentUser && !currentUser.emailVerified) {
          setError("Please verify your email before creating a room.");
          return;
        }

        const avatarThumbnail = await createTinyThumbnail(currentUser?.avatarData);

        const roomData = {
          name: name || "Unnamed Room",
          playerName: currentUser?.username || "Guest",
          avatarData: avatarThumbnail,
          rankPoints: effectiveRankPoints,
          rankLevel: effectiveRankLevel,
        };

        console.log("TEST RANK SEND createRoom", {
          effectiveRankPoints,
          effectiveRankLevel,
          testRankOverride,
        });

        setPendingAction({ type: "createRoom", data: roomData });

        if (!socket.connected) {
          console.log("⚠️ Socket not connected, will retry on reconnect...");
          setError("Connecting to server...");
          return;
        }

        console.log("➡️ Creating room:", roomData.name, "as", roomData.playerName);
        socket.emit("room:create", roomData);
      },

//       updateStatus: async (userId, status) => {
//   try {
//     const { error } = await supabase
//       .from("profiles")
//       .update({
//         status,
//         last_active: new Date().toISOString(),
//       })
//       .eq("id", userId);

//     if (error) {
//       console.error("updateStatus error:", error);
//       return false;
//     }

//     const cached = localStorage.getItem("dualmath_current_user");
//     if (cached) {
//       const user = JSON.parse(cached);
//       if (user.id === userId) {
//         user.status = status;
//         localStorage.setItem("dualmath_current_user", JSON.stringify(user));
//       }
//     }

//     return true;
//   } catch (error) {
//     console.error("updateStatus catch error:", error);
//     return false;
//   }
// },

      joinRoom: async ({ roomCode: joinCode }) => {
        if (currentUser && !currentUser.emailVerified) {
          setError("Please verify your email before joining a room.");
          return;
        }

        const avatarThumbnail = await createTinyThumbnail(currentUser?.avatarData);

        const joinData = {
          roomCode: joinCode,
          name: currentUser?.username || "Guest",
          avatarData: avatarThumbnail,
          rankPoints: effectiveRankPoints,
          rankLevel: effectiveRankLevel,
        };

        console.log("TEST RANK SEND joinRoom", {
          effectiveRankPoints,
          effectiveRankLevel,
          testRankOverride,
        });

        setPendingAction({ type: "joinRoom", data: joinData });

        if (!socket.connected) {
          setError("Connecting to server...");
          return;
        }

        console.log("➡️ joining room", joinCode, "as", joinData.name);
        socket.emit("room:join", joinData);
      },

      joinRandomRoom: async () => {
        if (currentUser && !currentUser.emailVerified) {
          setError("Please verify your email before joining a game.");
          return;
        }

        const avatarThumbnail = await createTinyThumbnail(currentUser?.avatarData);

        const joinData = {
          name: currentUser?.username || "Guest",
          avatarData: avatarThumbnail,
          rankPoints: effectiveRankPoints,
          rankLevel: effectiveRankLevel,
        };

        console.log("TEST RANK SEND joinRandomRoom", {
          effectiveRankPoints,
          effectiveRankLevel,
          testRankOverride,
        });

        setPendingAction({ type: "joinRandom", data: joinData });

        if (!socket.connected) {
          setError("Connecting to server...");
          return;
        }

        console.log("➡️ joining random room as", joinData.name);
        socket.emit("room:joinRandom", joinData);
      },

      ready: (ready) => {
        console.log("emit player:ready", { roomCode, ready });
        socket.emit("player:ready", { roomCode, ready });
      },

      settings: (s) => socket.emit("room:settings", { roomCode, ...s }),
      start: () => socket.emit("game:start", { roomCode }),
      chatSend: (text) => socket.emit("chat:send", { roomCode, text }),

      leaveRoom: async () => {
        console.log("➡️ leaving room", roomCode);

       const isInLiveMatch = room?.state?.phase === "playing";

  if (isInLiveMatch) {
    socket.emit("game:forfeit", { roomCode: room?.roomCode });
    return;
  }

  socket.emit("room:leave", { roomCode });

if (currentUser?.id) {
  await userManager.updateStatus(currentUser.id, "online");
}
        

        setView("lobby");
        setRoomCode(null);
        setSelfId(null);
        setRoom(null);
        setRoundInfo(null);
        setLastRound(null);
        setChat([]);
        setError("");
      },
    }),
    [roomCode, currentUser, effectiveRankPoints, effectiveRankLevel, testRankOverride, room]
  );

  const onDigit = ({ place, digit }) => {
    socket.emit("team:digit", { roomCode: room?.roomCode, place, digit });
  };

  const onSubmit = ({ tens, ones }) => {
    socket.emit("team:submit", { roomCode: room?.roomCode, tens, ones });
  };

  const handleLoginSuccess = (user) => {


  if (!user) {
    setCurrentUser(null);
    setPendingNewUser(null);
    setShowPickCharacter(false);
    setSessionError(null);
    setView("lobby");
    return;
  }

  if (user?.id) {
    userManager.updateStatus(user.id, "online");
  }

  
    if (!user.avatarData && !user.starterCharacter && !user.ownedItems?.length) {
  setPendingNewUser(user);
  setShowPickCharacter(true);
}

  setCurrentUser(user);
  setPendingNewUser(null);
  setShowPickCharacter(false);
  setSessionError(null);

  // Only navigate to lobby if not already in store
  if (view !== "store") {
    setView("lobby");
  }
};

  

  if (showPickCharacter && pendingNewUser) {
  return (
   <PickCharacter
      currentUser={pendingNewUser}
      onComplete={(userWithAvatar) => {
        setCurrentUser(userWithAvatar);
        setPendingNewUser(null);
        setShowPickCharacter(false);
        setView("lobby");
      }}
      onBack={() => {
        setPendingNewUser(null);
        setShowPickCharacter(false);
      }}
    />
  );
}

  const handleUserUpdate = (updatedUser) => {
    console.log("📥 Received user update from child component:", updatedUser);
    setCurrentUser(updatedUser);
  };

  const SessionErrorModal = () => {
    if (!sessionError) return null;

    return (
      <div className="sessionErrorOverlay">
        <div className="sessionErrorModal">
          <div className="sessionErrorIcon">⚠️</div>
          <h2>Session Ended</h2>
          <p>{sessionError}</p>
          <button
            className="sessionErrorBtn"
            onClick={() => {
              setSessionError(null);
              setCurrentUser(null);
            }}
          >
            Login Again
          </button>
        </div>

        <style>{`
          .sessionErrorOverlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(11, 11, 18, 0.95);
            backdrop-filter: blur(10px);
            z-index: 2000;
            display: grid;
            place-items: center;
          }
          .sessionErrorModal {
            text-align: center;
            padding: 40px;
            border-radius: 24px;
            border: 1px solid rgba(251, 113, 133, 0.3);
            background: linear-gradient(180deg, rgba(251, 113, 133, 0.05), transparent), #121222;
            box-shadow: 0 20px 60px rgba(0,0,0,.5);
            max-width: 400px;
          }
          .sessionErrorIcon {
            font-size: 64px;
            margin-bottom: 16px;
          }
          .sessionErrorModal h2 {
            margin: 0 0 12px 0;
            color: #fb7185;
          }
          .sessionErrorModal p {
            color: #9aa0c3;
            margin-bottom: 24px;
          }
          .sessionErrorBtn {
            background: #7c5cff;
            color: #0b0b12;
            border: none;
            border-radius: 12px;
            padding: 14px 28px;
            font-weight: 700;
            font-size: 16px;
            cursor: pointer;
          }
          .sessionErrorBtn:hover {
            background: #8b6fff;
          }
        `}</style>
      </div>
    );
  };

  // Force character selection for users without starterCharacter
  if (currentUser && !currentUser.avatarData && !currentUser.starterCharacter && !currentUser.ownedItems?.length) {

    return (
      <PickCharacter
        currentUser={currentUser}
        onComplete={(user) => {
          setCurrentUser(user);
          setView("lobby");
        }}
        onBack={null} // No back button for existing users
      />
    );
  }

  if (window.location.hash === "#picktest") {
  return (
    <PickCharacter
      currentUser={{
        id: "test-user",
        username: "testuser",
        email: "test@example.com",
        avatarData: null,
      }}
      onComplete={() => {
        setView("lobby");
        setScreen("lobby");
        window.history.replaceState(null, "", window.location.pathname);
      }}
      onBack={() => {
        setView("lobby");
        setScreen("lobby");
        window.history.replaceState(null, "", window.location.pathname);
      }}
    />
  );
}

  if (screen === "game") {
    return (
      <Game
        room={previewGame}
        selfId="self"
        currentUser={currentUser}
        onSubmit={handlePreviewSubmit}
        onBack={() => setScreen("lobby")}
        onLeaveRoom={() => setScreen("lobby")}
      />
    );
  }

  if (view === "friends") {
  return (
    <FriendList
      currentUser={currentUser}
      onBack={() => setView("lobby")}
      onUnreadCountChange={setUnreadChatCount}
      refreshUnreadCount={loadUnreadChatCount}
      onOnlineFriendsChange={setOnlineFriends}
    />
  );
}



    if (view === "rank") {
      return (
        <Rank
          currentUser={currentUser}
          onBack={() => setView("lobby")}
        />
      );
    }

  if (view === "lobby" || view === "store") {
    return (
      <>
        <SessionErrorModal />

        <Lobby
          onCreate={actions.createRoom}
          onJoin={actions.joinRoom}
          onJoinRandom={actions.joinRandomRoom}
onOpenStore={async () => {
  setScreen("lobby");
  setView("store");
  if (currentUser?.id) {
    userManager.updateStatus(currentUser.id, "online");
    // Refresh user from Supabase to get latest coins/owned items
    const freshUser = await userManager.getCurrentUser();
    if (freshUser) setCurrentUser(freshUser);
  }
          }}
          error={error}
          currentUser={currentUser}
          onLoginSuccess={handleLoginSuccess}
          onOpenPickCharacter={(user) => {
            setPendingNewUser(user);
            setShowPickCharacter(true);
          }}
          isConnected={isConnected}
          setTestRankOverride={setTestRankOverride}
          testRankOverride={testRankOverride}
          onOpenGame={() => {
            setPreviewGame(createPreviewGame(currentUser?.avatarData));
            setScreen("game");
            if (currentUser?.id) userManager.updateStatus(currentUser.id, "in_match");
            setView("game");
          }}
          onOpenRank={() => {
            setScreen("lobby");
            setView("rank");
            if (currentUser?.id) {
  userManager.updateStatus(currentUser.id, "online");
}
          }}
          friendChatBadgeCount={unreadChatCount}
          onOpenFriends={() => {
            setScreen("lobby");
            setView("friends");
            if (currentUser?.id) {
  userManager.updateStatus(currentUser.id, "online");
}
          }}
           friends={onlineFriends}
           setIsOnlineFriendsScrolling={setIsOnlineFriendsScrolling}
        />
        

        {view === "store" && (
          <Store
            currentUser={currentUser}
            onLoginSuccess={handleLoginSuccess}
            onClose={() => setView("lobby")}
          />
        )}
      </>
    );
  }


  if (view === "room") {
    return (
      <>
        <SessionErrorModal />
        <Room
          room={room}
          selfId={selfId}
          onReady={actions.ready}
          onSettings={actions.settings}
          onStart={actions.start}
          onSit={actions.sit}
          onLeaveRoom={actions.leaveRoom}
          error={error}
          currentUser={currentUser}
        />
      </>
    );
  }

  return (
    <>
      <SessionErrorModal />
      <Game
        room={room}
        selfId={selfId}
        roundInfo={roundInfo}
        lastRound={lastRound}
        teamRoundResult={teamRoundResult}
        onDigit={onDigit}
        onSubmit={onSubmit}
        onChatSend={actions.chatSend}
        chat={chat}
        currentUser={currentUser}
        onLeaveRoom={actions.leaveRoom}
        onUserUpdate={handleUserUpdate}
        onForfeit={() => {
          console.log("🚩 emitting game:forfeit", { roomCode: room?.roomCode });
          socket.emit("game:forfeit", { roomCode: room?.roomCode });
        }}
      />
    </>
  );
}