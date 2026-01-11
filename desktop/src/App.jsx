import React, { useEffect, useMemo, useState, useCallback } from "react";
import { io } from "socket.io-client";
import Lobby from "./ui/Lobby.jsx";
import Room from "./ui/Room.jsx";
import Game from "./ui/Game.jsx";
import Auth from "./ui/Auth.jsx";
import { updatePoints } from "./rankingSystem.js";
import { userManager } from "./userManagerSupabase.js";

const isDev = window.location.hostname === 'localhost';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
  (isDev ? "http://localhost:5050" : "https://dualmath.onrender.com");
console.log("SOCKET_URL =", SOCKET_URL);

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

async function applyLocalMatchResult(currentUser, didWin) {
  if (!currentUser) return currentUser;

  const currentPoints = currentUser.rankPoints ?? 0;
  const newPoints = updatePoints(currentPoints, didWin);

  const updatedUser = {
    ...currentUser,
    wins: (currentUser.wins ?? 0) + (didWin ? 1 : 0),
    losses: (currentUser.losses ?? 0) + (didWin ? 0 : 1),
    totalGames: (currentUser.totalGames ?? 0) + 1,
    rankPoints: newPoints,
  };

  await userManager.saveUser(updatedUser);
  return updatedUser;
}


async function applyLocalForfeitLoss(currentUser) {
  if (!currentUser) return currentUser;

  const currentPoints = currentUser.rankPoints ?? 0;
  const newPoints = updatePoints(currentPoints, false); // false = loss

  const updatedUser = {
    ...currentUser,
    losses: (currentUser.losses ?? 0) + 1,
    totalGames: (currentUser.totalGames ?? 0) + 1,
    rankPoints: newPoints,
  };

  await userManager.saveUser(updatedUser);
  return updatedUser;
}


// Create a tiny thumbnail (32x32) for sharing via socket - keeps payload small
const createTinyThumbnail = (avatarData) => {
  return new Promise((resolve) => {
    if (!avatarData) {
      resolve(null);
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      
      // Draw image scaled to 32x32
      ctx.drawImage(img, 0, 0, 32, 32);
      
      // Convert to very compressed JPEG (quality 0.5)
      const thumbnail = canvas.toDataURL('image/jpeg', 0.5);
      resolve(thumbnail);
    };
    img.onerror = () => resolve(null);
    img.src = avatarData;
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

  useEffect(() => {
    const raw = localStorage.getItem("pending_forfeit");
    if (!raw) return;

    localStorage.removeItem("pending_forfeit");

    // user refreshed while in a live match -> count as loss
    const applyForfeit = async () => {
      const updated = await applyLocalForfeitLoss(currentUser);
      setCurrentUser(updated);
    };
    if (currentUser) applyForfeit();
  }, []);


  // Initialize user from session on mount
  useEffect(() => {
    const loadUser = async () => {
      // First try sync version for immediate UI
      const cachedUser = userManager.getCurrentUserSync();
      if (cachedUser) {
        console.log("🔄 Restored cached session for user:", cachedUser.username);
        setCurrentUser(cachedUser);
      }
      
      // Then fetch fresh data from Supabase
      const freshUser = await userManager.getCurrentUser();
      if (freshUser) {
        console.log("🔄 Loaded fresh user data from Supabase:", freshUser.username);
        setCurrentUser(freshUser);
      } else if (cachedUser) {
        // Session was invalidated (another device logged in)
        console.log("⚠️ Session invalidated - clearing local state");
        setCurrentUser(null);
        setSessionError("You've been logged out because another device signed in with this account.");
      }
    };
    loadUser();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = userManager.onAuthStateChange((user) => {
      console.log("🔔 Auth state changed:", user?.username || "logged out");
      setCurrentUser(user);
      if (!user) {
        // User was logged out, return to lobby
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

  // Periodic session validation
  useEffect(() => {
    if (!currentUser) return;

    const validateInterval = setInterval(async () => {
      const result = await userManager.validateSession();
      if (!result.valid) {
        if (result.reason === 'session_replaced') {
          setSessionError("You've been logged out because another device signed in with this account.");
          setCurrentUser(null);
          setView("lobby");
          setRoomCode(null);
          setSelfId(null);
          setRoom(null);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(validateInterval);
  }, [currentUser]);

  // Track socket connection state
  useEffect(() => {
    const onConnect = () => {
      console.log("✅ socket connected", socket.id);
      setIsConnected(true);
      setError("");
      
      // Execute pending action if any
      if (pendingAction) {
        console.log("🔄 Executing pending action after reconnect:", pendingAction.type);
        if (pendingAction.type === 'createRoom') {
          socket.emit("room:create", pendingAction.data);
        } else if (pendingAction.type === 'joinRoom') {
          socket.emit("room:join", pendingAction.data);
        } else if (pendingAction.type === 'joinRandom') {
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
    socket.on("room:joined", ({ roomCode, selfId }) => {
      console.log("✅ Room joined:", roomCode);
      setPendingAction(null); // Clear pending action
      setRoomCode(roomCode);
      setSelfId(selfId);
      setView("room");
      setError("");
      setLastRound(null);
      setRoundInfo(null);
      setChat([]);
    });

    socket.on("room:update", (r) => {
      setRoom(r);
      if (r?.state?.phase === "playing") setView("game");
      if (r?.state?.phase === "lobby") setView("room");
    });

    socket.on("room:error", ({ message }) => setError(message));

    socket.on("game:roundStart", (info) => {
      setRoundInfo(info);
      setLastRound(null);
      setView("game");
    });

    socket.on("game:roundEnd", (payload) => {
      setLastRound(payload);
    });
    
    socket.on("game:ended", async (payload) => {
      console.log("🎮 GAME ENDED - Full payload:", payload);
      setLastRound(payload);

      // Apply local stats here (wins OR losses)
      const me = (room?.players ?? []).find(p => p.id === selfId);
      const myTeam = me?.team;

      if (payload?.winner && payload.winner !== "tie" && myTeam) {
        const didWin = payload.winner === myTeam;
        const updated = await applyLocalMatchResult(currentUser, didWin);
        setCurrentUser(updated);
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
  }, [currentUser, selfId, room]);

  const actions = useMemo(
    () => ({
      sit: ({ team, slot }) => { 
        console.log('emit team:sit', { roomCode, team, slot }); 
        socket.emit("team:sit", { roomCode, team, slot }); 
      },
      createRoom: async ({ name }) => {
        // Check email verification before allowing game actions
        if (currentUser && !currentUser.emailVerified) {
          setError("Please verify your email before creating a room.");
          return;
        }

        // Create tiny thumbnail for sharing (32x32, ~1-2KB)
        const avatarThumbnail = await createTinyThumbnail(currentUser?.avatarData);
        
        const roomData = { 
          name: name || "Unnamed Room",
          playerName: currentUser?.username || 'Guest',
          avatarData: avatarThumbnail // Tiny thumbnail, safe to send
        };
        
        // Store as pending action in case we disconnect
        setPendingAction({ type: 'createRoom', data: roomData });
        
        if (!socket.connected) {
          console.log("⚠️ Socket not connected, will retry on reconnect...");
          setError("Connecting to server...");
          return;
        }
        
        console.log("➡️ Creating room:", roomData.name, "as", roomData.playerName);
        socket.emit("room:create", roomData);
      },
      joinRoom: async ({ roomCode: joinCode }) => {
        // Check email verification before allowing game actions
        if (currentUser && !currentUser.emailVerified) {
          setError("Please verify your email before joining a room.");
          return;
        }

        const avatarThumbnail = await createTinyThumbnail(currentUser?.avatarData);
        
        const joinData = { 
          roomCode: joinCode, 
          name: currentUser?.username || 'Guest',
          avatarData: avatarThumbnail
        };
        
        setPendingAction({ type: 'joinRoom', data: joinData });
        
        if (!socket.connected) {
          setError("Connecting to server...");
          return;
        }
        
        console.log("➡️ joining room", joinCode, "as", joinData.name);
        socket.emit("room:join", joinData);
      },
      joinRandomRoom: async () => {
        // Check email verification before allowing game actions
        if (currentUser && !currentUser.emailVerified) {
          setError("Please verify your email before joining a game.");
          return;
        }

        const avatarThumbnail = await createTinyThumbnail(currentUser?.avatarData);
        
        const joinData = { 
          name: currentUser?.username || 'Guest',
          avatarData: avatarThumbnail
        };
        
        setPendingAction({ type: 'joinRandom', data: joinData });
        
        if (!socket.connected) {
          setError("Connecting to server...");
          return;
        }
        
        console.log("➡️ joining random room as", joinData.name);
        socket.emit("room:joinRandom", joinData);
      },
      ready: (ready) => { 
        console.log('emit player:ready', { roomCode, ready }); 
        socket.emit("player:ready", { roomCode, ready }); 
      },
      settings: (s) => socket.emit("room:settings", { roomCode, ...s }),
      start: () => socket.emit("game:start", { roomCode }),
      chatSend: (text) => socket.emit("chat:send", { roomCode, text }),
      leaveRoom: async () => {
        console.log("➡️ leaving room", roomCode);

        const isInLiveMatch = room?.state?.phase === "playing";

        // If leaving mid-game => forfeit locally (so stats ALWAYS update)
        if (isInLiveMatch) {
          socket.emit("game:forfeit", { roomCode: room?.roomCode });
          const updated = await applyLocalForfeitLoss(currentUser);
          setCurrentUser(updated);
        }

        socket.emit("room:leave", { roomCode });

        setView("lobby");
        setRoomCode(null);
        setSelfId(null);
        setRoom(null);
        setError("");
        setRoundInfo(null);
        setLastRound(null);
        setChat([]);
      },
    }),
    [roomCode, currentUser]
  );

  const onDigit = ({ place, digit }) => {
    socket.emit("team:digit", { roomCode: room?.roomCode, place, digit });
  };

  const onSubmit = ({ tens, ones }) => {
    socket.emit("team:submit", { roomCode: room?.roomCode, tens, ones });
  };

  const handleLoginSuccess = (user) => {
    console.log("🔐 Login success:", user?.username || "logged out");
    setCurrentUser(user);
    setSessionError(null); // Clear any session errors
    if (user) {
      setView("lobby");
    }
  };

  const handleUserUpdate = (updatedUser) => {
    console.log("📥 Received user update from child component:", updatedUser);
    setCurrentUser(updatedUser);
  };

  // Show session error modal if needed
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

  // Check if in password recovery mode - show Auth component directly
  const isRecoveryMode = localStorage.getItem('dualmath_password_recovery_mode') === 'true' ||
                         window.location.hash.includes('type=recovery');

  if (isRecoveryMode) {
    return (
      <div className="page" style={{ 
        maxWidth: '500px', 
        margin: '40px auto', 
        padding: '0 18px' 
      }}>
        <Auth 
          onLoginSuccess={(user) => {
            // Clear recovery mode when user logs in or cancels
            if (!localStorage.getItem('dualmath_password_recovery_mode')) {
              handleLoginSuccess(user);
            }
          }}
          isLoggedIn={false}
          currentUser={null}
        />
      </div>
    );
  }

  if (view === "lobby") {
    return (
      <>
        <SessionErrorModal />
        <Lobby 
          onCreate={actions.createRoom} 
          onJoin={actions.joinRoom}
          onJoinRandom={actions.joinRandomRoom}
          error={error}
          currentUser={currentUser}
          onLoginSuccess={handleLoginSuccess}
          isConnected={isConnected}
        />
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
        onDigit={onDigit}
        onSubmit={onSubmit}
        onChatSend={actions.chatSend}
        chat={chat}
        currentUser={currentUser}
        onLeaveRoom={actions.leaveRoom}
        onUserUpdate={handleUserUpdate}
        onForfeit={async () => {
          socket.emit("game:forfeit", { roomCode: room?.roomCode });
          const updated = await applyLocalForfeitLoss(currentUser);
          setCurrentUser(updated);
        }}
      />
    </>
  );
}