import React, { useState } from "react";
import { Card, Button, Input } from "./components.jsx";
import Auth from "./Auth.jsx";
import { userManager } from "../userManager.js";

export default function Lobby({ onCreate, onJoin, onJoinRandom, error, currentUser, onLoginSuccess }) {
  const [roomName, setRoomName] = useState("");
  const [code, setCode] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [isJoiningRandom, setIsJoiningRandom] = useState(false);

  // If not logged in, show auth first
  if (!currentUser) {
    return <Auth onLoginSuccess={onLoginSuccess} isLoggedIn={false} currentUser={null} />;
  }

  return (
    <div className="page">
      {/* Top-right Settings Icon */}
      <div className="topRight">
        <button
          className="settingsIconBtn"
          onClick={() => setShowSettings(!showSettings)}
          title="Account Settings"
        >
          ⚙️
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="settingsModal">
          <div className="settingsOverlay" onClick={() => setShowSettings(false)} />
          <div className="settingsPanel">
            <Auth
              onLoginSuccess={(user) => {
                onLoginSuccess(user);
                setShowSettings(false);
              }}
              isLoggedIn={true}
              currentUser={currentUser}
              onClose={() => setShowSettings(false)}
            />
          </div>
        </div>
      )}

      <div className="hero">
        <div className="logoRow">
          <div>
            <div className="logo">🧫 Dual Math</div>
            <div className="subtitle">Multiplayer math battles</div>
            <div className="userWelcome">Playing as: <strong>{currentUser.username}</strong></div>
          </div>
        </div>
      </div>

      <div className="grid3">
        <Card title="Create a room">
          <div className="stack">
            <label className="label">Room name</label>
            <Input value={roomName} onChange={(e) => setRoomName(e.target.value)} />
            <Button disabled={!roomName.trim()} onClick={() => onCreate({ name: roomName.trim() })}>
              Create Room
            </Button>
          </div>
        </Card>

        <Card title="Join a room">
          <div className="stack">
            <label className="label">Room code</label>
            <Input
              value={code}
              onChange={(e) => {
                const cleaned = e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 5);
                setCode(cleaned);
              }}
              placeholder="ABCDE"
            />

            <div className="muted">{code.length}/5</div>

            <Button
              variant="secondary"
              disabled={code.length !== 5}
              onClick={() => onJoin({ roomCode: code })}
            >
              Join Room
            </Button>
          </div>
        </Card>

        <Card title="Join Random">
          <div className="stack">
            <p className="muted">Find a match and join a random room instantly</p>
            <Button
              variant="secondary"
              onClick={() => {
                setIsJoiningRandom(true);
                onJoinRandom();
              }}
              disabled={isJoiningRandom}
            >
              {isJoiningRandom ? "⏳ Searching..." : "🎲 Join Random"}
            </Button>
          </div>
        </Card>
      </div>

      {error && <div className="toast bad">{error}</div>}
    </div>
  );
}