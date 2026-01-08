import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import Lobby from "./ui/Lobby.jsx";
import Room from "./ui/Room.jsx";
import Game from "./ui/Game.jsx";
import { userManager } from "./userManager.js";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
export const socket = io(SOCKET_URL, { autoConnect: true });


export default function App() {
  const [view, setView] = useState("lobby"); // lobby | room | game
  const [roomCode, setRoomCode] = useState(null);
  const [selfId, setSelfId] = useState(null);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [roundInfo, setRoundInfo] = useState(null);
  const [lastRound, setLastRound] = useState(null);
  const [chat, setChat] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Clear user session on page load/refresh
  useEffect(() => {
    userManager.logoutUser();
    setCurrentUser(null);
    setView("lobby");
  }, []); // Run once on mount

  useEffect(() => {
    socket.on("connect", () => console.log("✅ socket connected", socket.id));
    socket.on("connect_error", (e) => console.log("❌ connect_error", e.message));
    socket.on("disconnect", (r) => console.log("⚠️ socket disconnected", r));
    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("disconnect");
    };
  }, []);

  useEffect(() => {
    socket.on("room:joined", ({ roomCode, selfId }) => {
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
      // Award points to current player if they won
      if (payload?.results && currentUser) {
        const myResult = payload.results.find(r => r.id === selfId);
        if (myResult?.correct === 2) {
          const updatedUser = userManager.addPoints(10);
          setCurrentUser(updatedUser);
        }
      }
    });
    
    socket.on("game:ended", (payload) => {
      setLastRound(payload);
      // Check if match was won
      if (payload?.winner && currentUser) {
        const updatedUser = userManager.addPoints(10);
        setCurrentUser(updatedUser);
      }
      setError(payload?.winner ? `Match ended. Winner: ${payload.winner}` : "Match ended.");
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
  }, [currentUser, selfId]);

  const actions = useMemo(
    () => ({
      sit: ({ team, slot }) => { console.log('emit team:sit', { roomCode, team, slot }); socket.emit("team:sit", { roomCode, team, slot }); },
      createRoom: ({ name }) => socket.emit("room:create", { name, playerName: currentUser?.username || 'Guest' }),
      joinRoom: ({ roomCode }) => {
        console.log("➡️ joining room", roomCode, "as", currentUser?.username || 'Guest');
        socket.emit("room:join", { roomCode, name: currentUser?.username || 'Guest' });
      },
      joinRandomRoom: () => {
        console.log("➡️ joining random room as", currentUser?.username || 'Guest');
        socket.emit("room:joinRandom", { name: currentUser?.username || 'Guest' });
      },
      ready: (ready) => { console.log('emit player:ready', { roomCode, ready }); socket.emit("player:ready", { roomCode, ready }); },
      settings: (s) => socket.emit("room:settings", { roomCode, ...s }),
      start: () => socket.emit("game:start", { roomCode }),
      chatSend: (text) => socket.emit("chat:send", { roomCode, text }),
      leaveRoom: () => {
        console.log("➡️ leaving room", roomCode);
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

  // ✅ C) Wire onDigit to Socket.IO (replaces onAnswer/game:answer)
  const onDigit = ({ place, digit }) => {
    socket.emit("team:digit", { roomCode: room?.roomCode, place, digit });
  };

  const onSubmit = ({ tens, ones }) => {
    socket.emit("team:submit", { roomCode: room?.roomCode, tens, ones });
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    if (user) {
      // Reset to lobby on login
      setView("lobby");
    }
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
    />
  );
}