import React, { useMemo, useState, useEffect } from "react";
import { Card, Button, Select, Pill } from "./components.jsx";

function Slot({ title, player, isYou, onSit, currentUserAvatarData, username }) {
  const displayAvatar = isYou ? currentUserAvatarData : player?.avatarData;
  const displayName = isYou ? username : player?.name;
  const displayRankLevel = player?.rankLevel || player?.rank || "Novice";

  function getRankBadgeClass(rank) {
  switch (rank) {
    case "Novice":
      return "rank-novice";
    case "Apprentice":
      return "rank-apprentice";
    case "Skilled":
      return "rank-skilled";
    case "Professional":
      return "rank-professional";
    case "Expert":
      return "rank-expert";
    case "King":
      return "rank-king";
    default:
      return "rank-novice";
  }
}

  return (
    <div className={`slot ${player ? "occupied" : "empty"}`}>
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
            <div className={`rankBadge ${getRankBadgeClass(displayRankLevel)}`}>
              {displayRankLevel}
            </div>
          </div>
        </div>
      ) : (
        <div className="slotEmpty">
          <div className="emptyCopy">
            <div className="muted">Empty slot</div>
            <div className="emptySubtext">Join this team position</div>
          </div>
          <Button variant="secondary" onClick={onSit}>Join Slot</Button>
        </div>
      )}
    </div>
  );
}

export default function Room({
  room,
  selfId,
  onReady,
  onSettings,
  onStart,
  onSit,
  error,
  onLeaveRoom,
  currentUser
}) {
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

  const slot = (team, idx) => {
    const teamMembers = team === "A" ? teamA : teamB;
    const teamPlayer = teamMembers.find(p => p.slot === idx);

    if (!teamPlayer) return null;

    const fullPlayer = room?.players?.find(p => p.id === teamPlayer.id);

    return {
      ...teamPlayer,
      avatarData: teamPlayer.avatarData || fullPlayer?.avatarData || null,
      rankLevel:
        teamPlayer.rankLevel ||
        teamPlayer.rank ||
        fullPlayer?.rankLevel ||
        fullPlayer?.rank ||
        "Novice",
    };
  };

  const seated = !!(self?.team && (self.slot === 0 || self.slot === 1));

  return (
    <div className="page">
      <div className="topBar">
        <div className="roomTitleWrap">
          <div className="roomLabel">Match Lobby</div>
          <div className="roomTitle">
            <span className="roomWord">Room</span>
            <span className="roomName">{room?.name || "Unnamed"}</span>
            <Pill tone="code">{room?.roomCode}</Pill>
            <Pill tone="neutral">2v2</Pill>
            <Pill tone={isHost ? "good" : "neutral"}>{isHost ? "Host" : "Player"}</Pill>
          </div>
        </div>

        <div className="topActions">
          <Button variant="secondary" onClick={onLeaveRoom}>
            Exit Lobby
          </Button>

          <Button
            variant={self?.ready ? "secondary" : "primary"}
            disabled={!seated}
            onClick={() => onReady(!self?.ready)}
          >
            {seated ? (self?.ready ? "Unready" : "Ready Up") : "Pick a team slot"}
          </Button>

          {isHost && <Button onClick={onStart}>Begin Battle</Button>}
        </div>
      </div>

      <div className="teamsRow">
        <Card
          title={<div style={{ width: "100%", textAlign: "center" }}>⚔️ Team A</div>}
        >
          <div className="teamGrid">
            <Slot
              title="A1"
              player={slot("A", 0)}
              isYou={slot("A", 0)?.id === selfId}
              currentUserAvatarData={currentUser?.avatarData}
              username={currentUser?.username}
              onSit={() => onSit({ team: "A", slot: 0 })}
            />
            <Slot
              title="A2"
              player={slot("A", 1)}
              isYou={slot("A", 1)?.id === selfId}
              currentUserAvatarData={currentUser?.avatarData}
              username={currentUser?.username}
              onSit={() => onSit({ team: "A", slot: 1 })}
            />
          </div>
        </Card>

        <Card
          title={<div style={{ width: "100%", textAlign: "center" }}>🛡️ Team B</div>}
        >
          <div className="teamGrid">
            <Slot
              title="B1"
              player={slot("B", 0)}
              isYou={slot("B", 0)?.id === selfId}
              currentUserAvatarData={currentUser?.avatarData}
              username={currentUser?.username}
              onSit={() => onSit({ team: "B", slot: 0 })}
            />
            <Slot
              title="B2"
              player={slot("B", 1)}
              isYou={slot("B", 1)?.id === selfId}
              currentUserAvatarData={currentUser?.avatarData}
              username={currentUser?.username}
              onSit={() => onSit({ team: "B", slot: 1 })}
            />
          </div>
        </Card>
      </div>

      <div className="grid2">
        <Card title="⚔️ Match Setup">
          <div className="stack">
            <div className="ruleItem">Difficulty: {room?.state?.diff ?? "easy"}</div>
            <div className="ruleItem">Round Time: 11s</div>
            <div className="ruleItem">Rounds: 11</div>
          </div>
        </Card>

        <Card title="📜 Match Rules">
          <div className="stack">
            <div className="ruleItem">1) Sit in a team slot (A1/A2/B1/B2)</div>
            <div className="ruleItem">2) Everyone clicks Ready</div>
            <div className="ruleItem">3) Host starts the match</div>
          </div>
        </Card>
      </div>

      {error && <div className="toast bad">{error}</div>}

      <style>{`
        .page {
          width: 100%;
          max-width: 1280px;
          min-height: 100vh;
          margin: 0 auto;
          padding: 28px 36px 40px;
          box-sizing: border-box;
          color: #4c3826;
          position: relative;
          z-index: 0;
        }

        .page::before {
          content: "";
          position: fixed;
          inset: 0;
          background:
            radial-gradient(circle at 50% 14%, rgba(255, 236, 184, 0.22), transparent 20%),
            radial-gradient(circle at 18% 8%, rgba(255, 245, 220, 0.55), transparent 30%),
            radial-gradient(circle at 82% 0%, rgba(229, 197, 132, 0.18), transparent 24%),
            linear-gradient(180deg, #f8f0dd 0%, #e6d2ac 100%);
          z-index: -2;
        }

        .page::after {
          content: "";
          position: absolute;
          top: 110px;
          left: 50%;
          transform: translateX(-50%);
          width: min(940px, 92%);
          height: 280px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(229, 197, 132, 0.18), transparent 70%);
          filter: blur(30px);
          pointer-events: none;
          z-index: -1;
        }

        .page .topBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 0 0 20px;
          gap: 16px;
          flex-wrap: wrap;
        }

        .roomTitleWrap {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .roomLabel {
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 11px;
          font-weight: 800;
          color: #9d8468;
        }

        .page .roomTitle {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          font-weight: 800;
          color: #4c3826;
          font-size: 30px;
          letter-spacing: -0.03em;
        }

        .roomWord {
          color: #5c4330;
        }

        .page .roomName {
          font-weight: 900;
          color: #8d6b4f;
        }

        .page .topActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .page .teamsRow {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 22px;
          margin-top: 8px;
        }

        .page .grid2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 22px;
          margin-top: 20px;
        }

        .page .card {
          border: 1px solid rgba(166, 134, 93, 0.2);
          background: linear-gradient(180deg, rgba(247, 238, 214, 0.96), rgba(223, 198, 156, 0.94));
          border-radius: 30px;
          box-shadow:
            0 18px 34px rgba(123, 91, 58, 0.10),
            inset 0 1px 0 rgba(255,255,255,0.52);
          overflow: hidden;
        }

        .page .grid2 .card {
          background: linear-gradient(180deg, rgba(240, 226, 192, 0.95), rgba(221, 198, 159, 0.92));
        }

        .page .cardTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px 12px;
          border-bottom: 1px solid rgba(166, 134, 93, 0.16);
          color: #4c3826;
          background: linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0));
        }

        .page .cardTitle {
          font-weight: 900;
          color: #5b4028;
          font-size: 28px;
          letter-spacing: -0.03em;
          width: 100%;
        }

        .page .cardBody {
          padding: 16px;
          color: #4c3826;
        }

        .teamGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .page .slot {
          border: 1px solid rgba(166, 134, 93, 0.18);
          border-radius: 24px;
          background: linear-gradient(180deg, #f7f0d8, #ede1bf);
          padding: 14px;
          min-height: 118px;
          box-shadow:
            0 10px 18px rgba(107, 79, 52, 0.07),
            inset 0 1px 0 rgba(255,255,255,0.5);
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }

        .page .slot:hover {
          transform: translateY(-2px);
          box-shadow:
            0 16px 26px rgba(107, 79, 52, 0.11),
            0 0 0 1px rgba(229, 197, 132, 0.18);
          border-color: rgba(191, 149, 100, 0.34);
        }

        .page .slotTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          gap: 8px;
        }

        .page .slotTitle {
          font-weight: 900;
          font-size: 24px;
          letter-spacing: -0.03em;
          color: #9c7350;
        }

        .page .slotPlayer {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .page .slotMeta {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .page .slotName {
          font-weight: 800;
          font-size: 15px;
          color: #5a4028;
          line-height: 1.1;
        }

        .page .slotEmpty {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .emptyCopy {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .emptySubtext {
          color: #b29a7f;
          font-size: 12px;
        }

        .page .slot .avatar {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: #7a5938;
          font-weight: 900;
          font-size: 18px;
          overflow: hidden;
          flex-shrink: 0;
        }

.page .slot .avatar img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 16px;
  background: transparent;
}

        .page .rankBadge {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          padding: 4px 10px;
          border-radius: 999px;
          background: linear-gradient(180deg, #f3dfb1, #e8c983);
          border: 1px solid rgba(183, 143, 90, 0.28);
          color: #6d512f;
          font-size: 12px;
          font-weight: 800;
          box-shadow: 0 4px 10px rgba(183, 143, 90, 0.12);
        }

        .page .muted {
          color: #9a8268;
          font-size: 13px;
        }

        .page .label {
          font-size: 12px;
          color: #8f7b63;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 800;
        }

        .page .row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .page .col {
          min-width: 0;
        }

        .page .select,
        .page select {
          width: 100%;
          background: #fffdf5;
          color: #4c3826;
          border: 1px solid rgba(107, 79, 52, 0.2);
          border-radius: 14px;
          padding: 12px 14px;
          outline: none;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.55);
        }

        .page .select:focus,
        .page select:focus {
          border-color: rgba(107, 79, 52, 0.45);
          box-shadow: 0 0 0 3px rgba(207, 162, 95, 0.14);
        }

        .page .btn {
          border: 1px solid transparent;
          border-radius: 16px;
          padding: 12px 16px;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease;
        }

        .page .btn:hover {
          transform: translateY(-1px);
        }

        .page .btn.primary {
          background: linear-gradient(180deg, #f0cf64, #d6ae38);
          color: #5a4224;
          box-shadow:
            0 10px 18px rgba(190, 150, 54, 0.22),
            inset 0 1px 0 rgba(255,255,255,0.4);
        }

        .page .btn.secondary {
          background: linear-gradient(180deg, #fffaf0, #efe5cf);
          border-color: rgba(166, 134, 93, 0.22);
          color: #5a4028;
          box-shadow:
            0 8px 14px rgba(107, 79, 52, 0.08),
            inset 0 1px 0 rgba(255,255,255,0.52);
        }

        .page .pill {
          font-size: 12px;
          padding: 7px 12px;
          border-radius: 999px;
          border: 1px solid rgba(107, 79, 52, 0.18);
          color: #8f7b63;
          background: rgba(255, 253, 244, 0.78);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.45);
        }

        .page .pill.code {
          border-color: rgba(107, 79, 52, 0.24);
          color: #6b4a33;
          background: linear-gradient(180deg, #f3e2b7, #ead4a2);
        }

        .page .pill.good {
          border-color: rgba(185, 150, 69, 0.28);
          color: #6f572e;
          background: linear-gradient(180deg, #f4da87, #e3bf56);
        }

        .page .pill.neutral {
          border-color: rgba(180, 164, 142, 0.28);
          color: #9b8a76;
          background: linear-gradient(180deg, #fffaf2, #eee3d2);
        }

        .ruleItem {
          color: #8f7b63;
          font-size: 15px;
          line-height: 1.5;
          padding: 4px 0;
        }

        .page .toast.bad {
          margin-top: 16px;
          border: 1px solid rgba(168, 88, 72, 0.3);
          border-radius: 16px;
          padding: 12px 14px;
          background: rgba(168, 88, 72, 0.12);
          color: #8d4f45;
        }

        @media (max-width: 980px) {
          .page {
            padding: 20px 18px 28px;
          }

          .page .teamsRow,
          .page .grid2 {
            grid-template-columns: 1fr;
          }

          .page .row {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .page .roomTitle {
            font-size: 24px;
          }

          .teamGrid {
            grid-template-columns: 1fr;
          }

          .page .topActions {
            width: 100%;
          }

          .page .topActions .btn {
            flex: 1 1 auto;
          }
        }
          .rankBadge.rank-novice {
  background: linear-gradient(180deg, #efe7d6, #d9ccb4);
  color: #6f604f;
}

.rankBadge.rank-apprentice {
  background: linear-gradient(180deg, #dff1d8, #b9ddb0);
  color: #44613e;
}

.rankBadge.rank-skilled {
  background: linear-gradient(180deg, #d8ebf8, #afcfe7);
  color: #35566d;
}

.rankBadge.rank-professional {
  background: linear-gradient(180deg, #eadcf8, #ceb0eb);
  color: #5a3b78;
}

.rankBadge.rank-expert {
  background: linear-gradient(180deg, #ffe3b3, #efc46e);
  color: #6d4c11;
}

.rankBadge.rank-king {
  background: linear-gradient(180deg, #ffe7a8, #f2bf2f);
  color: #5b3d00;
  box-shadow: 0 0 14px rgba(242, 191, 47, 0.35);
}
      `}</style>
    </div>
  );
}