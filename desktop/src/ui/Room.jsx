import React, { useMemo, useState, useEffect } from "react";
import { Card, Button, Select, Pill } from "./components.jsx";

function Slot({ title, player, isYou, onSit, currentUserAvatarData, username }) {
  // For current user, use their full local avatar; for others, use thumbnail from server
  const displayAvatar = isYou ? currentUserAvatarData : player?.avatarData;
  const displayName = isYou ? username : player?.name;
  
  return (
    <div className="slot">
      <div className="slotTop">
        <div className="slotTitle">{title}</div>
        {player?.ready ? <Pill tone="good">Ready</Pill> : <Pill tone="neutral">Not ready</Pill>}
      </div>

      {player ? (
        <div className="slotPlayer">
          <div className="avatar">
            {displayAvatar ? (
              <img src={displayAvatar} alt="Avatar" />
            ) : (
              displayName?.[0]?.toUpperCase() ?? "?"
            )}
          </div>
          <div className="slotMeta">
            <div className="slotName">
              {displayName}
              {isYou && <span className="muted"> (you)</span>}
            </div>
            <div className="muted">Score: {player.score}</div>
          </div>
        </div>
      ) : (
        <div className="slotEmpty">
          <div className="muted">Empty slot</div>
          <Button variant="secondary" onClick={onSit}>Sit here</Button>
        </div>
      )}
    </div>
  );
}

export default function Room({ room, selfId, onReady, onSettings, onStart, onSit, error, onLeaveRoom, currentUser }) {
  const isHost = room?.hostId === selfId;
  const self = useMemo(() => room?.players?.find(p => p.id === selfId), [room, selfId]);

  const [diff, setDiff] = useState(room?.state?.diff ?? "easy");
  const [roundMs, setRoundMs] = useState(room?.state?.roundMs ?? 12000);
  const [totalRounds, setTotalRounds] = useState(room?.state?.totalRounds ?? 10);
  const [saved, setSaved] = useState(false);
  const [lastSaved, setLastSaved] = useState({
    diff: room?.state?.diff,
    roundMs: room?.state?.roundMs,
    totalRounds: room?.state?.totalRounds,
  });

  const handleSaveSettings = () => {
    onSettings({ diff, roundMs, totalRounds });
    setLastSaved({ diff, roundMs, totalRounds });
  };

  useEffect(() => {
    const changed =
      lastSaved.diff === diff &&
      lastSaved.roundMs === roundMs &&
      lastSaved.totalRounds === totalRounds;

    if (changed) {
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 1500);
      return () => clearTimeout(t);
    }
  }, [diff, roundMs, totalRounds, lastSaved]);

  const teamA = room?.teams?.A?.members ?? [];
  const teamB = room?.teams?.B?.members ?? [];

  // Get player from team members, but also look up full player data from room.players
  // in case avatarData is only stored there
  const slot = (team, idx) => {
    const teamMembers = team === "A" ? teamA : teamB;
    const teamPlayer = teamMembers.find(p => p.slot === idx);
    
    if (!teamPlayer) return null;
    
    // Try to get full player data from room.players (might have avatarData)
    const fullPlayer = room?.players?.find(p => p.id === teamPlayer.id);
    
    // Merge team player data with full player data
    return {
      ...teamPlayer,
      avatarData: teamPlayer.avatarData || fullPlayer?.avatarData || null
    };
  };

  const seated = !!(self?.team && (self.slot === 0 || self.slot === 1));

  // Debug: log room data to see where avatarData is
  useEffect(() => {
    console.log("Room data:", {
      players: room?.players?.map(p => ({ id: p.id, name: p.name, hasAvatar: !!p.avatarData })),
      teamA: teamA.map(p => ({ id: p.id, name: p.name, hasAvatar: !!p.avatarData })),
      teamB: teamB.map(p => ({ id: p.id, name: p.name, hasAvatar: !!p.avatarData })),
    });
  }, [room, teamA, teamB]);

  useEffect(() => {
    console.log("Room state:", { self, seated, roomCode: room?.roomCode, players: room?.players });
  }, [room, self, seated, room?.roomCode]);

  return (
    <div className="page">
      <div className="topBar">
        <div className="roomTitle">
          Room <span className="roomName">{room?.name || "Unnamed"}</span> 
          <Pill tone="code">{room?.roomCode}</Pill>
          <Pill tone="neutral">2v2</Pill>
          <Pill tone={isHost ? "good" : "neutral"}>{isHost ? "Host" : "Player"}</Pill>
        </div>

        <div className="topActions">
          <Button
            variant="secondary"
            onClick={onLeaveRoom}
          >
            Leave Room
          </Button>
          
          <Button
            variant={self?.ready ? "secondary" : "primary"}
            disabled={!seated}
            onClick={() => { console.log('emit ready click', { roomCode: room?.roomCode, selfId, ready: !self?.ready }); onReady(!self?.ready); }}
          >
            {seated ? (self?.ready ? "Unready" : "Ready") : "Pick a team slot"}
          </Button>

          {isHost && <Button onClick={onStart}>Start Match</Button>}
        </div>
      </div>

      <div className="grid2">
        <Card
          title="Team A"
          right={<div className="muted">Team Score: {room?.teams?.A?.score ?? 0}</div>}
        >
          <div className="teamGrid">
            <Slot
              title="A1"
              player={slot("A", 0)}
              isYou={slot("A", 0)?.id === selfId}
              currentUserAvatarData={currentUser?.avatarData}
              username={currentUser?.username}
              onSit={() => { console.log('click sit', 'A', 0); onSit({ team: 'A', slot: 0 }); }}
            />
            <Slot
              title="A2"
              player={slot("A", 1)}
              isYou={slot("A", 1)?.id === selfId}
              currentUserAvatarData={currentUser?.avatarData}
              username={currentUser?.username}
              onSit={() => { console.log('click sit', 'A', 1); onSit({ team: 'A', slot: 1 }); }}
            />
          </div>
        </Card>

        <Card
          title="Team B"
          right={<div className="muted">Team Score: {room?.teams?.B?.score ?? 0}</div>}
        >
          <div className="teamGrid">
            <Slot
              title="B1"
              player={slot("B", 0)}
              isYou={slot("B", 0)?.id === selfId}
              currentUserAvatarData={currentUser?.avatarData}
              username={currentUser?.username}
              onSit={() => { console.log('click sit', 'B', 0); onSit({ team: 'B', slot: 0 }); }}
            />
            <Slot
              title="B2"
              player={slot("B", 1)}
              isYou={slot("B", 1)?.id === selfId}
              currentUserAvatarData={currentUser?.avatarData}
              username={currentUser?.username}
              onSit={() => { console.log('click sit', 'B', 1); onSit({ team: 'B', slot: 1 }); }}
            />
          </div>
        </Card>
      </div>

      <div className="grid2" style={{ marginTop: 14 }}>
        <Card title="Match settings" right={<div className="muted">{isHost ? "Editable" : "Host only"}</div>}>
          <div className="row">
            <div className="col">
              <div className="label">Difficulty</div>
              <Select disabled={!isHost} value={diff} onChange={(e) => setDiff(e.target.value)}>
                <option value="easy">Easy</option>
                <option value="med">Medium</option>
                <option value="hard">Hard</option>
              </Select>
            </div>

            <div className="col">
              <div className="label">Round time</div>
              <Select disabled={!isHost} value={roundMs} onChange={(e) => setRoundMs(Number(e.target.value))}>
                <option value={8000}>8s</option>
                <option value={12000}>12s</option>
                <option value={15000}>15s</option>
              </Select>
            </div>

            <div className="col">
              <div className="label">Rounds</div>
              <Select disabled={!isHost} value={totalRounds} onChange={(e) => setTotalRounds(Math.min(Number(e.target.value), 16))}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={16}>16</option>
              </Select>
            </div>
          </div>

          {isHost && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <Button variant="secondary" onClick={handleSaveSettings}>
                Save Settings
              </Button>
              {saved && <Pill tone="good">Saved</Pill>}
            </div>
          )}
        </Card>

        <Card title="How to play">
          <div className="stack">
            <div className="muted">1) Sit in a team slot (A1/A2/B1/B2)</div>
            <div className="muted">2) Everyone clicks Ready</div>
            <div className="muted">3) Host starts the match</div>
            <div className="muted">Fast correct answers = bonus points</div>
          </div>
        </Card>
      </div>

      {error && <div className="toast bad">{error}</div>}

      <style>{`
        .slot .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(124,92,255,.18);
          border: 2px solid rgba(124,92,255,.35);
          font-weight: 800;
          font-size: 16px;
          overflow: hidden;
          flex-shrink: 0;
        }
        
        .slot .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }
        
        .slotPlayer {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        
        .slotMeta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .slotName {
          font-weight: 700;
          font-size: 14px;
        }
        
        .slot {
          border: 1px solid rgba(38,38,74,.6);
          border-radius: 14px;
          background: rgba(255,255,255,.02);
          padding: 14px;
          min-height: 100px;
        }
        
        .slotTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .slotTitle {
          font-weight: 900;
          font-size: 14px;
          letter-spacing: 0.5px;
          color: var(--accent);
        }
        
        .slotEmpty {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        
        .teamGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        
        @media (max-width: 600px) {
          .teamGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}