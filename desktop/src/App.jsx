import React, { useEffect, useMemo, useState, useCallback } from "react";
import { io } from "socket.io-client";
import Lobby from "./ui/Lobby.jsx";
import Room from "./ui/Room.jsx";
import Game from "./ui/Game.jsx";
import { userManager } from "./userManager.js";

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

  // Initialize user from session on mount
  useEffect(() => {
    const savedUser = userManager.getCurrentUser();
    if (savedUser) {
      console.log("🔄 Restored session for user:", savedUser.username);
      setCurrentUser(savedUser);
    }
  }, []);

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
    
    socket.on("game:ended", (payload) => {
      console.log("🎮 GAME ENDED - Full payload:", payload);
      setLastRound(payload);
      
      if (payload?.winner) {
        if (payload.winner === 'tie') {
          setError("Match ended in a tie.");
        } else {
          setError(`Match ended. Winner: Team ${payload.winner}`);
        }
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
      leaveRoom: () => {
        console.log("➡️ leaving room", roomCode);
        socket.emit("room:leave", { roomCode });
        
        // Don't re-read from storage here - the currentUser state already has the latest data
        // from onUserUpdate callback. Re-reading could get stale data due to timing.
        // The currentUser state is already up-to-date from Game.jsx's onUserUpdate call.
        
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
    if (user) {
      setView("lobby");
    }
  };

  const handleUserUpdate = (updatedUser) => {
    console.log("📥 Received user update from child component:", updatedUser);
    setCurrentUser(updatedUser);
  };

  if (view === "lobby") {
    return (
      <Lobby 
        onCreate={actions.createRoom} 
        onJoin={actions.joinRoom}
        onJoinRandom={actions.joinRandomRoom}
        error={error}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        isConnected={isConnected}
      />
    );
  }

  if (view === "room") {
    return (
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
    );
  }

  return (
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
    />
  );
}