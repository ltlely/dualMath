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
import { applyVolume, getSoundSettings } from "./ui/soundSettings";
import DailyCheck from "./ui/DailyCheck.jsx";
import Profile from "./ui/Profile.jsx";

const isDev = window.location.hostname === "localhost";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

if (!SOCKET_URL) {
  throw new Error("Missing VITE_SOCKET_URL");
}

console.log("SOCKET_URL =", SOCKET_URL);

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 40000,
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
const [previewTeamRoundResult, setPreviewTeamRoundResult] = useState(null);
const [profileUser, setProfileUser] = useState(null);
const [profileOptions, setProfileOptions] = useState({});
const audioUnlockedRef = useRef(false);
const pendingMusicRetryRef = useRef(false);
const [friendsRefreshKey, setFriendsRefreshKey] = useState(0);
const [profileRefreshKey, setProfileRefreshKey] = useState(0);
const [incomingGameInvite, setIncomingGameInvite] = useState(null);
const [gameInviteMessage, setGameInviteMessage] = useState("");
const [pendingInviteUserIds, setPendingInviteUserIds] = useState({});
const [inviteIdToUserId, setInviteIdToUserId] = useState({});

const isInGameMusicState =
  view === "game" ||
  screen === "game" ||
  room?.state?.phase === "playing" ||
  !!roundInfo;

function solvePreviewQuestion(q) {
  if (!q) return null;
  if (q.op === "+") return q.a + q.b;
  if (q.op === "-") return q.a - q.b;
  if (q.op === "×") return q.a * q.b;
  return null;
}

const syncMusicPlayback = useCallback(() => {
  const mainMusic = mainMusicRef.current;
  const gameMusic = gameMusicRef.current;

  if (!mainMusic || !gameMusic) return;
  if (!currentUser) return;

  mainMusic.muted = false;
  gameMusic.muted = false;

  if (isInGameMusicState) {
    if (!mainMusic.paused) {
      mainMusic.pause();
      mainMusic.currentTime = 0;
    }

    if (gameMusic.paused) {
      gameMusic.load();
      gameMusic.play()
        .then(() => {
          pendingMusicRetryRef.current = false;
          console.log("✅ Game music playing");
        })
        .catch((err) => {
          console.log("❌ Game music blocked:", err);
          pendingMusicRetryRef.current = true;
        });
    }
  } else {
    if (!gameMusic.paused) {
      gameMusic.pause();
      gameMusic.currentTime = 0;
    }

    if (mainMusic.paused) {
      mainMusic.load();
      mainMusic.play()
        .then(() => {
          pendingMusicRetryRef.current = false;
          console.log("✅ Main music playing");
        })
        .catch((err) => {
          console.log("❌ Main music blocked:", err);
          pendingMusicRetryRef.current = true;
        });
    }
  }
}, [currentUser, isInGameMusicState]);

const handleOpenProfile = (user, options = {}) => {
  setProfileUser(user);
  setProfileOptions(options);
};

socket.onAny((event, ...args) => {
  console.log("🛎️ RAW:", event, args);
});

const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);

useEffect(() => {
  const handleResize = () => {
    setIsMobileView(window.innerWidth <= 1024);
  };

  handleResize();
  window.addEventListener("resize", handleResize);

  return () => window.removeEventListener("resize", handleResize);
}, []);



useEffect(() => {
  const handleAny = (event, ...args) => {
    console.log("🛎️ RAW socket event:", event, args);
  };
  socket.onAny(handleAny);
  return () => socket.offAny(handleAny);
}, []);

useEffect(() => {
  const settings = getSoundSettings();

  const mainMusic = new Audio("/music/coding_loop.wav");
  mainMusic.loop = true;
  mainMusic.preload = "auto";
  applyVolume(mainMusic, "mainMusic", settings);
  mainMusicRef.current = mainMusic;

const gameMusic = new Audio("/music/game_loop.wav");
gameMusic.loop = true;
gameMusic.preload = "auto";
gameMusic.muted = false;
gameMusic.volume = 1;
gameMusicRef.current = gameMusic;

  return () => {
    mainMusic.pause();
    gameMusic.pause();
    mainMusic.currentTime = 0;
    gameMusic.currentTime = 0;
  };
}, []);

useEffect(() => {
  const mainMusic = mainMusicRef.current;
  const gameMusic = gameMusicRef.current;

  if (!mainMusic || !gameMusic) return;

  if (!currentUser) {
    mainMusic.pause();
    gameMusic.pause();
    mainMusic.currentTime = 0;
    gameMusic.currentTime = 0;
    pendingMusicRetryRef.current = false;
    return;
  }

  syncMusicPlayback();
}, [currentUser, isInGameMusicState, syncMusicPlayback]);

useEffect(() => {
  if (!profileUser?.id) return;

  if (currentUser?.id === profileUser.id) {
    if (currentUser !== profileUser) {
      setProfileUser(currentUser);
    }
    return;
  }

  const refreshedFriend = onlineFriends.find((friend) => friend.id === profileUser.id);

  if (refreshedFriend) {
    setProfileUser((prev) => {
      if (!prev) return refreshedFriend;

      const prevKey = JSON.stringify({
        id: prev.id,
        username: prev.username,
        avatarData: prev.avatarData,
        rankPoints: prev.rankPoints,
        wins: prev.wins,
        losses: prev.losses,
        totalGames: prev.totalGames,
        profileStatus: prev.profileStatus,
        status: prev.status,
        last_seen: prev.last_seen,
      });

      const nextKey = JSON.stringify({
        id: refreshedFriend.id,
        username: refreshedFriend.username,
        avatarData: refreshedFriend.avatarData,
        rankPoints: refreshedFriend.rankPoints,
        wins: refreshedFriend.wins,
        losses: refreshedFriend.losses,
        totalGames: refreshedFriend.totalGames,
        profileStatus: refreshedFriend.profileStatus,
        status: refreshedFriend.status,
        last_seen: refreshedFriend.last_seen,
      });

      return prevKey === nextKey ? prev : refreshedFriend;
    });
  }
}, [profileUser?.id, currentUser, onlineFriends]);

useEffect(() => {
  if (!currentUser?.id) return;

  socket.emit("user:online", {
    profileId: currentUser.id,
    username: currentUser.username,
  });
}, [currentUser?.id, currentUser?.username]);

useEffect(() => {
  const handleIncomingInvite = (invite) => {
    setIncomingGameInvite(invite);
  };

const handleInviteStatus = (status) => {
  const invitedUserId = inviteIdToUserId[status.inviteId];

  setGameInviteMessage(status.message || "");

  if (invitedUserId) {
    // Request is resolved, so button can reset.
    setPendingInviteUserIds((prev) => {
      const next = { ...prev };
      delete next[invitedUserId];
      return next;
    });

    setInviteIdToUserId((prev) => {
      const next = { ...prev };
      delete next[status.inviteId];
      return next;
    });
  }

  setTimeout(() => {
    setGameInviteMessage("");
  }, 3500);
};

  socket.on("gameInvite:incoming", handleIncomingInvite);
  socket.on("gameInvite:status", handleInviteStatus);

  return () => {
    socket.off("gameInvite:incoming", handleIncomingInvite);
    socket.off("gameInvite:status", handleInviteStatus);
  };
}, [inviteIdToUserId]);

const handleSendGameInvite = (friend) => {
  if (!currentUser?.id || !friend?.id) return;

  if (!roomCode) {
    setGameInviteMessage("Create or join a room before inviting friends.");
    setTimeout(() => setGameInviteMessage(""), 3000);
    return;
  }

  const roomPlayerCount = room?.players?.length ?? 0;

  if (roomPlayerCount >= 4) {
    setGameInviteMessage("Room is full. You cannot invite more players.");
    setTimeout(() => setGameInviteMessage(""), 3000);
    return;
  }

  const inviteId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  setPendingInviteUserIds((prev) => ({
    ...prev,
    [friend.id]: true,
  }));

  setInviteIdToUserId((prev) => ({
    ...prev,
    [inviteId]: friend.id,
  }));

  socket.emit("gameInvite:send", {
    inviteId,
    fromUser: {
      id: currentUser.id,
      username: currentUser.username,
      avatarData: currentUser.avatarData || null,
    },
    toUserId: friend.id,
    roomCode,
  });
};

const handleProfileSavedGlobal = useCallback((updatedUser) => {
  if (!updatedUser?.id) return;

  setProfileUser((prev) =>
    prev && String(prev.id) === String(updatedUser.id)
      ? { ...prev, ...updatedUser }
      : prev
  );


  if (String(currentUser?.id) === String(updatedUser.id)) {
    setCurrentUser((prev) => ({ ...prev, ...updatedUser }));
  }

  setOnlineFriends((prev) =>
    prev.map((friend) =>
      String(friend.id) === String(updatedUser.id)
        ? { ...friend, ...updatedUser }
        : friend
    )
  );

  setFriendsRefreshKey((prev) => prev + 1);
    setProfileRefreshKey((prev) => prev + 1);


  if (profileOptions?.onProfileSaved) {
    profileOptions.onProfileSaved(updatedUser);
  }
}, [currentUser?.id, profileOptions]);
useEffect(() => {
  console.log("App passing teamRoundResult to Game:", teamRoundResult);
}, [teamRoundResult]);

useEffect(() => {
  const handleSoundPreview = (event) => {
    const settings = event.detail || getSoundSettings();

    applyVolume(mainMusicRef.current, "mainMusic", settings);
    applyVolume(gameMusicRef.current, "gameMusic", settings);
    applyVolume(clickSoundRef.current, "click", settings);
  };

  window.addEventListener("dualmath:sound-preview", handleSoundPreview);
  window.addEventListener("dualmath:sound-saved", handleSoundPreview);

  return () => {
    window.removeEventListener("dualmath:sound-preview", handleSoundPreview);
    window.removeEventListener("dualmath:sound-saved", handleSoundPreview);
  };
}, []);



useEffect(() => {
  const settings = getSoundSettings();

  const clickAudio = new Audio("/music/click.wav");
  clickAudio.preload = "auto";
  clickAudio.muted = false;
  applyVolume(clickAudio, "click", settings);
  clickSoundRef.current = clickAudio;

  const isClickableElement = (target) => {
    return Boolean(
      target?.closest?.(
        'button, [role="button"], .clickSound, input[type="button"], input[type="submit"]'
      )
    );
  };

  const playClickSound = () => {
    const latest = getSoundSettings();

    if (!clickSoundRef.current) return;

    clickSoundRef.current.muted = false;
    applyVolume(clickSoundRef.current, "click", latest);
    clickSoundRef.current.pause();
    clickSoundRef.current.currentTime = 0;

    clickSoundRef.current.play().catch((err) => {
      console.log("Click sound blocked:", err);
    });
  };

  const handleButtonClick = (event) => {
    audioUnlockedRef.current = true;
    syncMusicPlayback();

    if (!isClickableElement(event.target)) return;

    playClickSound();
  };

  const handleFirstKeyUnlock = () => {
    audioUnlockedRef.current = true;
    syncMusicPlayback();
  };

  document.addEventListener("pointerdown", handleButtonClick);
  document.addEventListener("keydown", handleFirstKeyUnlock, { once: true });

  return () => {
    document.removeEventListener("pointerdown", handleButtonClick);
    document.removeEventListener("keydown", handleFirstKeyUnlock);
    clickAudio.pause();
    clickAudio.currentTime = 0;
  };
}, [syncMusicPlayback]);

const handleDailyClaim = async (reward) => {
  if (!currentUser || !reward) return;

  let addedCoins = 0;

  if (reward.type === "coins") {
    addedCoins = reward.amount;
  } else if (reward.type === "gift") {
    addedCoins = 1000;
  }

  const updatedUser = {
    ...currentUser,
    coins: (currentUser.coins ?? 2000) + addedCoins,
  };

  const result = await userManager.saveUser(updatedUser);
  const savedUser = result?.user || updatedUser;

  if (onLoginSuccess) {
    onLoginSuccess(savedUser);
  }
};

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

    const myQuestion = prev.state?.teamQuestions?.A;
    const correctAnswer = solvePreviewQuestion(myQuestion);
    const submittedAnswer = Number(`${tens}${ones}`);
    const isCorrect = correctAnswer === submittedAnswer;

    setPreviewTeamRoundResult({ isCorrect });

    setTimeout(() => {
      setPreviewTeamRoundResult(null);
    }, 250);

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
      setView("lobby");
      setScreen("lobby");
    }

    const freshUser = await userManager.getCurrentUser();
    if (freshUser) {
      console.log("🔄 Loaded fresh user data from Supabase:", freshUser.username);
      setCurrentUser(freshUser);
      setView("lobby");
      setScreen("lobby");
    } else if (cachedUser) {
      console.log("⚠️ Session invalidated - clearing local state");
      setCurrentUser(null);
      setSessionError(
        "You've been logged out because another device signed in with this account."
      );
      setView("lobby");
      setScreen("lobby");
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
      setScreen("lobby");
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
  const handleTeamRoundEnd = (payload) => {
    console.log("game:teamRoundEnd received:", payload);
    setTeamRoundResult({ ...payload, _ts: Date.now() });
  };

  socket.on("game:teamRoundEnd", handleTeamRoundEnd);

  return () => {
    socket.off("game:teamRoundEnd", handleTeamRoundEnd);
  };
}, []);

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

   





    socket.on("room:error", ({ message }) => setError(message));

   socket.on("game:roundStart", async (info) => {
    setTeamRoundResult(null);
  setRoundInfo(info);
  setLastRound(null);
  setView("game");
  setScreen("lobby");

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
          profileId: currentUser?.id || null
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
          profileId: currentUser?.id || null
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
          profileId: currentUser?.id || null
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
    mainMusicRef.current?.pause();
    gameMusicRef.current?.pause();

    if (mainMusicRef.current) mainMusicRef.current.currentTime = 0;
    if (gameMusicRef.current) gameMusicRef.current.currentTime = 0;

    setCurrentUser(null);
    setPendingNewUser(null);
    setShowPickCharacter(false);
    setSessionError(null);
    setView("lobby");
    setScreen("lobby");
    setRoomCode(null);
    setSelfId(null);
    setRoom(null);
    setRoundInfo(null);
    setLastRound(null);
    setChat([]);
    return;
  }

  if (user?.id) {
    userManager.updateStatus(user.id, "online");
  }

  if (!user.avatarData && !user.starterCharacter && !user.ownedItems?.length) {
    setPendingNewUser(user);
    setShowPickCharacter(true);
    return;
  }

  setCurrentUser(user);
  setPendingNewUser(null);
  setShowPickCharacter(false);
  setSessionError(null);
  setView("lobby");
  setScreen("lobby");
  setRoomCode(null);
  setSelfId(null);
  setRoom(null);
  setRoundInfo(null);
  setLastRound(null);
  setChat([]);
};


  useEffect(() => {
  if (!currentUser?.id) return;

  const interval = setInterval(() => {
    userManager.refreshPresence(currentUser.id);
  }, 30000); // every 30 sec

  return () => clearInterval(interval);
}, [currentUser?.id]);

if (isMobileView) {
  return (
    <div className="mobileBlocker">
      <div className="mobileBlockerCard">
        <div className="mobileBlockerIcon">💻</div>
        <h1>Desktop Only</h1>
        <p>
          This website is currently available on desktop only.
          Please open it on a laptop or computer.
        </p>
      </div>

      <style>{`
        .mobileBlocker {
          min-height: 100vh;
          width: 100%;
          display: grid;
          place-items: center;
          padding: 24px;
          text-align: center;
          background:
            radial-gradient(circle at top, rgba(255, 223, 138, 0.18), transparent 32%),
            linear-gradient(180deg, #f8f0dd 0%, #d3bd95 100%);
        }

        .mobileBlockerCard {
          width: min(100%, 420px);
          padding: 32px 24px;
          border-radius: 28px;
          background: linear-gradient(180deg, rgba(255, 248, 235, 0.98), rgba(245, 225, 186, 0.96));
          border: 1px solid rgba(155, 119, 88, 0.24);
          box-shadow:
            0 24px 60px rgba(91, 63, 42, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.65);
          color: #5b3f2a;
        }

        .mobileBlockerIcon {
          font-size: 42px;
          margin-bottom: 12px;
        }

        .mobileBlockerCard h1 {
          margin: 0 0 10px;
          font-size: 28px;
          color: #7a532c;
        }

        .mobileBlockerCard p {
          margin: 0;
          font-size: 15px;
          line-height: 1.6;
          color: #8a684b;
        }
      `}</style>
    </div>
  );
}

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
      inset: 0;
      z-index: 2000;
      display: grid;
      place-items: center;
      padding: 24px;
      background:
        radial-gradient(circle at top, rgba(255, 223, 138, 0.18), transparent 32%),
        rgba(91, 63, 42, 0.28);
      backdrop-filter: blur(10px);
    }

    .sessionErrorModal {
      width: min(100%, 420px);
      text-align: center;
      padding: 34px 28px 28px;
      border-radius: 28px;
      border: 1px solid rgba(155, 119, 88, 0.24);
      background: linear-gradient(180deg, rgba(255, 248, 235, 0.98), rgba(245, 225, 186, 0.96));
      box-shadow:
        0 24px 60px rgba(91, 63, 42, 0.22),
        inset 0 1px 0 rgba(255, 255, 255, 0.65);
      color: #5b3f2a;
    }

    .sessionErrorIcon {
      width: 78px;
      height: 78px;
      margin: 0 auto 16px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      font-size: 38px;
      background: linear-gradient(180deg, #fff6df, #efd39d);
      border: 1px solid rgba(155, 119, 88, 0.28);
      box-shadow:
        0 10px 24px rgba(179, 132, 55, 0.18),
        inset 0 1px 0 rgba(255,255,255,0.8);
    }

    .sessionErrorModal h2 {
      margin: 0 0 10px;
      font-size: 1.55rem;
      font-weight: 800;
      color: #7a532c;
      letter-spacing: 0.01em;
    }

    .sessionErrorModal p {
      margin: 0 0 24px;
      color: #8a684b;
      font-size: 0.98rem;
      line-height: 1.5;
    }

    .sessionErrorBtn {
      border: none;
      border-radius: 16px;
      padding: 14px 24px;
      min-width: 170px;
      font-weight: 800;
      font-size: 15px;
      cursor: pointer;
      color: #fffaf0;
      background: linear-gradient(180deg, #c79652 0%, #9b6a37 100%);
      box-shadow:
        0 12px 24px rgba(155, 119, 88, 0.24),
        inset 0 1px 0 rgba(255,255,255,0.22);
      transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease;
    }

    .sessionErrorBtn:hover {
      transform: translateY(-1px);
      filter: brightness(1.04);
      box-shadow:
        0 16px 30px rgba(155, 119, 88, 0.28),
        inset 0 1px 0 rgba(255,255,255,0.22);
    }

    .sessionErrorBtn:active {
      transform: translateY(0);
    }
  `}</style>
</div>
    );
  };
  

const GameInvitePopup = () => {
  const isActuallyInGame =
    view === "game" ||
    screen === "game" ||
    room?.state?.phase === "playing" ||
    !!roundInfo;

  if (isActuallyInGame) return null;
  if (!incomingGameInvite) return null;

  return (
    <>
      <div className="gameInviteModal">
        <div
          className="gameInviteOverlay"
          onClick={() => {
            socket.emit("gameInvite:respond", {
              inviteId: incomingGameInvite.inviteId,
              fromUserId: incomingGameInvite.fromUser?.id,
              toUser: {
                id: currentUser?.id,
                username: currentUser?.username,
              },
              accepted: false,
              roomCode: incomingGameInvite.roomCode || null,
            });

            setIncomingGameInvite(null);
          }}
        />

        <div className="gameInviteCard">
          <div className="gameInviteMiniLabel">Game Invite</div>

          <h3>
            {incomingGameInvite.fromUser?.username || "Someone"} invited you to play
          </h3>

          <p>Do you want to join their room?</p>

          <div className="gameInviteActions">
            <button
              type="button"
              className="gameInviteButton decline"
              onClick={() => {
                socket.emit("gameInvite:respond", {
                  inviteId: incomingGameInvite.inviteId,
                  fromUserId: incomingGameInvite.fromUser?.id,
                  toUser: {
                    id: currentUser?.id,
                    username: currentUser?.username,
                  },
                  accepted: false,
                  roomCode: incomingGameInvite.roomCode || null,
                });

                setIncomingGameInvite(null);
              }}
            >
              Decline
            </button>

            <button
              type="button"
              className="gameInviteButton accept"
              onClick={async () => {
                const inviteRoomCode = incomingGameInvite.roomCode;

                socket.emit("gameInvite:respond", {
                  inviteId: incomingGameInvite.inviteId,
                  fromUserId: incomingGameInvite.fromUser?.id,
                  toUser: {
                    id: currentUser?.id,
                    username: currentUser?.username,
                  },
                  accepted: true,
                  roomCode: inviteRoomCode || null,
                });

                setIncomingGameInvite(null);

                if (inviteRoomCode) {
                  await actions.joinRoom({ roomCode: inviteRoomCode });
                }
              }}
            >
              Accept
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .gameInviteModal {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: grid;
          place-items: center;
          padding: 24px;
        }

        .gameInviteOverlay {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at top, rgba(255, 214, 120, 0.12), transparent 36%),
            rgba(16, 14, 12, 0.72);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        .gameInviteCard {
          position: relative;
          z-index: 1;
          width: min(100%, 430px);
          padding: 28px;
          border-radius: 30px;
          text-align: center;

          background:
            radial-gradient(circle at top left, rgba(255, 255, 255, 0.18), transparent 36%),
            linear-gradient(180deg, rgba(58, 52, 43, 0.98), rgba(34, 28, 20, 0.98));

          border: 1px solid rgba(224, 171, 63, 0.24);

          box-shadow:
            0 28px 70px rgba(0, 0, 0, 0.42),
            0 0 30px rgba(224, 171, 63, 0.12),
            inset 0 1px 0 rgba(255, 236, 190, 0.08);

          color: #f5e7c6;
        }

        .gameInviteMiniLabel {
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 11px;
          font-weight: 900;
          color: #d9c39a;
          margin-bottom: 10px;
        }

        .gameInviteCard h3 {
          margin: 0 0 10px;
          font-size: 24px;
          line-height: 1.2;
          font-weight: 950;
          color: #fff1cf;
        }

        .gameInviteCard p {
          margin: 0;
          color: #d9c39a;
          font-size: 14px;
          font-weight: 700;
        }

        .gameInviteActions {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-top: 24px;
          flex-wrap: wrap;
        }

        .gameInviteButton {
          min-width: 120px;
          height: 42px;
          border-radius: 999px;
          border: 1px solid rgba(214, 172, 95, 0.22);
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          transition: transform 0.16s ease, filter 0.16s ease;
        }

        .gameInviteButton:hover {
          transform: translateY(-1px);
          filter: brightness(1.05);
        }

        .gameInviteButton.accept {
          background: linear-gradient(180deg, #ffe9b8, #dca95a);
          color: #5a3817;
        }

        .gameInviteButton.decline {
          background: linear-gradient(180deg, rgba(65, 54, 37, 0.95), rgba(46, 38, 25, 0.95));
          color: #f5e7c6;
        }
      `}</style>
    </>
  );
};

const GameInviteStatusToast = () => {
  const isActuallyInGame =
    view === "game" ||
    screen === "game" ||
    room?.state?.phase === "playing" ||
    !!roundInfo;

  if (isActuallyInGame) return null;
  if (!gameInviteMessage) return null;

  return (
    <>
      <div className="gameInviteStatusToast">
        {gameInviteMessage}
      </div>

      <style>{`
        .gameInviteStatusToast {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 99998;

          min-width: 280px;
          max-width: min(90vw, 520px);
          padding: 16px 22px;
          border-radius: 22px;

          text-align: center;
          font-size: 15px;
          font-weight: 900;
          line-height: 1.4;

          color: #fff1cf;
          background:
            radial-gradient(circle at top left, rgba(255,255,255,0.14), transparent 38%),
            linear-gradient(180deg, rgba(58, 52, 43, 0.98), rgba(34, 28, 20, 0.98));

          border: 1px solid rgba(224, 171, 63, 0.24);

          box-shadow:
            0 24px 60px rgba(0, 0, 0, 0.34),
            0 0 24px rgba(224, 171, 63, 0.10),
            inset 0 1px 0 rgba(255, 236, 190, 0.08);

          pointer-events: none;
        }
      `}</style>
    </>
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
        teamRoundResult={previewTeamRoundResult}
      />
    );
  }

  if (view === "friends") {
  return (
    <>
        <GameInvitePopup />
          <GameInviteStatusToast />
    <FriendList
      currentUser={currentUser}
      onBack={() => setView("lobby")}
      onUnreadCountChange={setUnreadChatCount}
      refreshUnreadCount={loadUnreadChatCount}
      onOnlineFriendsChange={setOnlineFriends}
       onOpenProfile={handleOpenProfile}
       refreshKey={friendsRefreshKey}
       profileRefreshKey={profileRefreshKey}
    />

 {profileUser && (
  <Profile
    profileUser={profileUser}
    currentUser={currentUser}
    
    onClose={() => {
      setProfileUser(null);
      setProfileOptions({});
    }}
onProfileSaved={handleProfileSavedGlobal}
  />
)}
</>
    
  );
}


    if (view === "rank") {
      return (
        <>
            <GameInvitePopup />
              <GameInviteStatusToast />

        <Rank
          currentUser={currentUser}
          onBack={() => setView("lobby")}
          onOpenProfile={handleOpenProfile}
           refreshKey={profileRefreshKey}
        />

      {profileUser && (
  <Profile
    profileUser={profileUser}
    currentUser={currentUser}
    onClose={() => {
      setProfileUser(null);
      setProfileOptions({});
    }}
    onProfileSaved={handleProfileSavedGlobal}
  />
)}
    </>
      );
    }

  if (view === "lobby" || view === "store") {
    return (
      <>
        <SessionErrorModal />
        <GameInvitePopup />
          <GameInviteStatusToast />

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
          dailyCheck={
          currentUser ? (
            <DailyCheck
              currentUser={currentUser}
              onClaim={handleDailyClaim}
            />
          ) : null
        }
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
onOpenProfile={handleOpenProfile}
 profileRefreshKey={profileRefreshKey}
        />
        
{profileUser && (
  <Profile
    profileUser={profileUser}
    currentUser={currentUser}
    onClose={() => {
      setProfileUser(null);
      setProfileOptions({});
    }}
    onProfileSaved={handleProfileSavedGlobal}
      onInviteFriend={handleSendGameInvite}
  gameInviteMessage={gameInviteMessage}
  
  />
)}

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
      <GameInvitePopup />
        <GameInviteStatusToast />

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
        chat={chat}
        onChatSend={actions.chatSend}
        profileRefreshKey={profileRefreshKey}
        onOpenProfile={handleOpenProfile}

  friends={onlineFriends}
  publicPlayers={onlineFriends}
  onOpenFriends={() => setView("friends")}
  onInviteFriend={handleSendGameInvite}
  gameInviteMessage={gameInviteMessage}
  setIsOnlineFriendsScrolling={setIsOnlineFriendsScrolling}
  pendingInviteUserIds={pendingInviteUserIds}

      />

      {profileUser && (
        <Profile
          profileUser={profileUser}
          currentUser={currentUser}
          onClose={() => {
            setProfileUser(null);
            setProfileOptions({});
          }}
          onProfileSaved={handleProfileSavedGlobal}

        />
      )}
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

