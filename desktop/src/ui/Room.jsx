import React, { useMemo, useState, useEffect } from "react";
import { Card, Button, Select, Pill } from "./components.jsx";
import { userManager } from "../userManagerSupabase.js";
import Chat from "./Chat.jsx";

const rankImages = {
  "Novice": "/noviceApprenticeRank.png",
  "Apprentice": "/noviceApprenticeRank.png",
  Skilled: "/skilledRank.png",
  Professional: "/professionalRank.png",
  Expert: "/expertRank.png",
  King: "/kingRank.png",
};

function getRankImage(rank) {
  return rankImages[rank] || "/noviceApprenticeRank.png";
}

function Slot({ title, player, isYou, onSit, currentUserAvatarData, username, currentUser,  }) {
  const displayUser = isYou ? currentUser : player;
  const displayAvatar = isYou ? currentUserAvatarData : player?.avatarData;
  const displayName = isYou ? username : player?.name;
  const displayRankLevel = displayUser ? userManager.getUserRank(displayUser) : "Novice";

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
  <img
    className="rankBadgeIcon"
    src={getRankImage(displayRankLevel)}
    alt={displayRankLevel}
  />
  <span>{displayRankLevel}</span>
</div>
          </div>
        </div>
      ) : (
        <div className="slotEmpty">
       
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
  currentUser,
  chat = [],
  onChatSend,
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
    rankPoints: teamPlayer.rankPoints ?? fullPlayer?.rankPoints ?? 0,
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
<span className={`rolePill ${isHost ? "hostGlowPill" : "playerPill"}`}>
  {isHost ? "Host" : "Player"}
</span>
     
        <span className={`matchSetupBadge diff-${room?.state?.diff ?? "easy"}`}>
          {room?.state?.diff ?? "easy"}
        </span>
   
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
  title={
    <div style={{ width: "100%", textAlign: "center" }}>
      <img
        src="/sword.png"
        alt="Team A"
        style={{
          width: "54px",
          height: "54px",
          objectFit: "contain",
          verticalAlign: "middle",
          marginRight: "8px",
        }}
      />
      Team A
    </div>
  }
>
          <div className="teamGrid">
            <Slot
              title="A1"
              player={slot("A", 0)}
              isYou={slot("A", 0)?.id === selfId}
              currentUserAvatarData={currentUser?.avatarData}
              username={currentUser?.username}
              onSit={() => onSit({ team: "A", slot: 0 })}
                currentUser={currentUser}
            />
            <Slot
              title="A2"
              player={slot("A", 1)}
              isYou={slot("A", 1)?.id === selfId}
              currentUserAvatarData={currentUser?.avatarData}
              username={currentUser?.username}
              onSit={() => onSit({ team: "A", slot: 1 })}
                currentUser={currentUser}
            />
          </div>
        </Card>

       <Card
  title={
    <div style={{ width: "100%", textAlign: "center" }}>
      <img
        src="/shield.png"
        alt="Team B"
        style={{
          width: "54px",
          height: "54px",
          objectFit: "contain",
          verticalAlign: "middle",
          marginRight: "8px",
        }}
      />
      Team B
    </div>
  }
>
          <div className="teamGrid">
            <Slot
              title="B1"
              player={slot("B", 0)}
              isYou={slot("B", 0)?.id === selfId}
              currentUserAvatarData={currentUser?.avatarData}
              username={currentUser?.username}
              onSit={() => onSit({ team: "B", slot: 0 })}
                currentUser={currentUser}
            />
            <Slot
              title="B2"
              player={slot("B", 1)}
              isYou={slot("B", 1)?.id === selfId}
              currentUserAvatarData={currentUser?.avatarData}
              username={currentUser?.username}
              onSit={() => onSit({ team: "B", slot: 1 })}
                currentUser={currentUser}
            />
          </div>
        </Card>
      </div>

<div className= "chatBox">
      <Chat
  room={room}
  selfId={selfId}
  chat={chat}
  onSend={onChatSend}
/>
</div>
      {error && <div className="toast bad">{error}</div>}

      <style>{`

:root {
  --ink: #f5e7c6;
  --muted: #d9c39a;
  --muted-2: #bca885;
  --panel: linear-gradient(180deg, rgba(50, 42, 30, 0.97), rgba(34, 28, 20, 0.97));
  --panel-soft: linear-gradient(180deg, rgba(63, 52, 35, 0.96), rgba(43, 35, 22, 0.94));
  --card-border: rgba(214, 172, 95, 0.18);
  --button: linear-gradient(180deg, rgba(98, 73, 33, 0.96), rgba(74, 55, 25, 0.96));
  --button-active: linear-gradient(180deg, rgba(112, 83, 36, 0.95), rgba(82, 61, 27, 0.95));
  --row: linear-gradient(180deg, rgba(140, 118, 82, 0.42), rgba(140, 118, 82, 0.42));
}

.chatBox {
  width: 100%;
  min-width: 0;
  min-height: 300px;
  height: 270px;
  margin: 10px 0 0;
  padding: 10px;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  align-items: stretch;
  background: var(--panel);
  border: 1px solid var(--card-border);
  box-shadow:
    0 14px 28px rgba(0, 0, 0, 0.22),
    0 0 18px rgba(224, 171, 63, 0.08),
    inset 0 1px 0 rgba(255, 236, 190, 0.05);
  border-radius: 22px;
}



.chatBox > * {
  flex: 1;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}


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

.rolePill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  padding: 7px 12px;
  border-radius: 999px;
  font-weight: 800;
  border: 1px solid transparent;
}

.playerPill {
  border-color: rgba(194, 168, 127, 0.28);
  color: #9a7e56;
  background: linear-gradient(180deg, #fff9ee, #efe2c5);
}

.hostGlowPill {
  background: linear-gradient(180deg, #e2ccff, #a56be8);
  color: #4f217f;
  border: 1px solid rgba(122, 66, 204, 0.46);
  box-shadow:
    0 0 0 1px rgba(201, 167, 255, 0.30),
    0 0 14px rgba(145, 76, 240, 0.34),
    0 0 28px rgba(145, 76, 240, 0.24);
}

.page::before {
  content: "";
  position: fixed;
  inset: 0;
  background:
    radial-gradient(circle at top, rgba(120, 92, 38, 0.20), transparent 32%),
    radial-gradient(circle at top center, rgba(255, 214, 120, 0.08), transparent 42%),
    linear-gradient(180deg, #3a342b 0%, #26211c 52%, #171411 100%);
  z-index: -2;
}

.page .rankBadge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  padding: 4px 10px;
  border-radius: 999px;
}

.rankBadgeIcon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex-shrink: 0;
  display: block;
  margin: 0px;
}

.page .rankBadge {
  position: relative;
  padding-left: 30px;
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

.teamGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: 140px;
  gap: 14px;
  align-items: stretch;
}
        .page .grid2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 22px;
          margin-top: 20px;
        }

.page .card {
  border: 1px solid var(--card-border);
  background: var(--panel);
  border-radius: 30px;
  box-shadow:
    0 14px 28px rgba(0, 0, 0, 0.22),
    0 0 18px rgba(224, 171, 63, 0.08),
    inset 0 1px 0 rgba(255, 236, 190, 0.05);
  overflow: hidden;
  color: var(--ink);
}

        .page .grid2 .card {
          background: linear-gradient(180deg, rgba(240, 226, 192, 0.95), rgba(221, 198, 159, 0.92));
        }

.page .cardTop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 12px;
  border-bottom: 1px solid rgba(214, 172, 95, 0.12);
  color: var(--ink);
  background: linear-gradient(180deg, rgba(255, 236, 190, 0.05), rgba(255,255,255,0));
}

.page .cardTitle {
  font-weight: 900;
  color: #fff1cf;
  font-size: 28px;
  letter-spacing: -0.03em;
  width: 100%;
}

.page .cardBody {
  padding: 16px;
  color: var(--ink);
}

        .teamGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

.page .slot {
  border: 1px solid rgba(214, 172, 95, 0.16);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(140, 118, 82, 0.42), rgba(140, 118, 82, 0.42));
  padding: 14px;
  height: 140px;
  min-height: 140px;
  max-height: 140px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow:
    0 10px 24px rgba(0, 0, 0, 0.12),
    inset 0 1px 0 rgba(255, 236, 190, 0.10);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  color: var(--ink);
}

.page .slot:hover {
  transform: translateY(-2px);
  box-shadow:
    0 14px 28px rgba(0, 0, 0, 0.18),
    0 0 16px rgba(224, 171, 63, 0.08);
  border-color: rgba(237, 187, 87, 0.24);
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
  color: #fff1cf;
}

.page .slotPlayer {
  display: flex;
  gap: 12px;
  align-items: center;
  flex: 1;
  min-height: 0;
}

.page .slotMeta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page .slotName {
  font-weight: 800;
  font-size: 15px;
  color: #fff1cf;
  line-height: 1.1;
}

.page .slotEmpty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  flex: 1;
  min-height: 0;
}

.emptyCopy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.emptySubtext {
  color: var(--muted);
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
  color: #fff1cf;
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
  background: linear-gradient(180deg, rgba(60, 49, 33, 0.96), rgba(42, 34, 22, 0.94));
  border: 1px solid rgba(214, 172, 95, 0.18);
  color: #fff1cf;
  font-size: 12px;
  font-weight: 800;
  box-shadow:
    0 8px 18px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 236, 190, 0.04);
}

.page .muted {
  color: var(--muted);
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

        .matchSetupCard {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 250, 236, 0.95), rgba(241, 221, 179, 0.92));
  border: 1px solid rgba(155, 119, 88, 0.18);
  box-shadow:
    0 10px 24px rgba(107, 79, 52, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

.matchSetupHeader {
  display: flex;
  align-items: center;
  gap: 12px;
}

.matchSetupIcon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 22px;
  background: linear-gradient(180deg, #f7d27c, #c88a3d);
  box-shadow: 0 8px 16px rgba(176, 129, 53, 0.18);
  flex-shrink: 0;
}

.matchSetupLabel {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #9d754c;
}

.matchSetupTitle {
  margin-top: 2px;
  font-size: 20px;
  font-weight: 800;
  color: #5a3817;
}

.matchSetupGrid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.matchSetupStat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(155, 119, 88, 0.14);
}

.matchSetupStatLabel {
  font-size: 13px;
  font-weight: 700;
  color: #7a5a3d;
}

.matchSetupBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 88px;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
  text-transform: capitalize;
  letter-spacing: 0.03em;
}

.matchSetupBadge.diff-easy {
  background: rgba(146, 211, 110, 0.18);
  color: #81b458;
  border: 1px solid rgba(146, 211, 110, 0.32);
}

.matchSetupBadge.diff-medium {
  background: rgba(224, 171, 63, 0.18);
  color: #8a5a10;
  border: 1px solid rgba(224, 171, 63, 0.32);
}

.matchSetupBadge.diff-hard {
  background: rgba(217, 106, 106, 0.16);
  color: #934646;
  border: 1px solid rgba(217, 106, 106, 0.28);
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
  background: var(--button-active);
  color: #fff2d2;
  border-color: rgba(237, 187, 87, 0.28);
  box-shadow:
    0 8px 18px rgba(0, 0, 0, 0.16),
    inset 0 1px 0 rgba(255, 236, 190, 0.08);
}

.page .btn.secondary {
  background: var(--button);
  color: #fff1cf;
  border-color: rgba(214, 172, 95, 0.22);
  box-shadow:
    0 8px 18px rgba(0, 0, 0, 0.16),
    inset 0 1px 0 rgba(255, 236, 190, 0.04);
}

.page,
.page .cardTop,
.page .cardBody,
.page .roomTitle,
.page .slotName,
.page .cardTitle {
  color: var(--ink);
}

.roomLabel,
.page .muted,
.emptySubtext {
  color: var(--muted);
}

.roomWord,
.page .roomName,
.page .slotTitle {
  color: #fff1cf;
}

.page {
  color: var(--ink);
}

.roomLabel,
.page .muted,
.emptySubtext {
  color: var(--muted);
}

.page .roomTitle,
.page .cardTop,
.page .cardBody,
.page .slotName,
.page .cardTitle {
  color: var(--ink);
}

.roomWord {
  color: var(--brown-dark);
}

.page .roomName,
.page .slotTitle {
  color: var(--brown);
}

.page .pill {
  border: 1px solid rgba(214, 172, 95, 0.18);
  color: var(--muted);
  background: rgba(28, 24, 18, 0.88);
}

.page .pill.code {
  background: linear-gradient(180deg, rgba(60, 49, 33, 0.96), rgba(42, 34, 22, 0.94));
  color: #fff1cf;
  border-color: rgba(214, 172, 95, 0.18);
}

.page .pill.good {
  background: linear-gradient(180deg, rgba(112, 83, 36, 0.95), rgba(82, 61, 27, 0.95));
  color: #fff2d2;
  border-color: rgba(237, 187, 87, 0.24);
}

.page .pill.neutral {
  background: linear-gradient(180deg, rgba(60, 49, 33, 0.96), rgba(42, 34, 22, 0.94));
  color: var(--muted);
  border-color: rgba(214, 172, 95, 0.18);
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



.page::after {
  background: radial-gradient(circle, rgba(243, 196, 94, 0.18), transparent 70%);
}


.page .roomTitle,
.page .cardTop,
.page .cardBody {
  color: #5a3512;
}

.roomWord {
  color: #6a4218;
}

.page .roomName {
  color: #a06a2d;
}


.page .grid2 .card {
  background: linear-gradient(180deg, rgba(250, 233, 186, 0.95), rgba(229, 191, 118, 0.92));
}

.page .cardTop {
  border-bottom: 1px solid rgba(191, 145, 63, 0.16);
}

.page .cardTitle {
  color: #6c4318;
}


.page .slot:hover {
  box-shadow:
    0 16px 26px rgba(136, 94, 38, 0.11),
    0 0 0 1px rgba(243, 196, 94, 0.18);
  border-color: rgba(196, 139, 61, 0.34);
}

.page .slotTitle {
  color: #b17634;
}

.page .slotName {
  color: #ffe39e;
  margin: 8px;
}

.page .slot .avatar {
  color: #8a5b22;
}

.page .rankBadge {
  background: linear-gradient(180deg, #ffe39e, #e5b84f);
  border: 1px solid rgba(194, 140, 53, 0.28);
  color: #6e4817;
  box-shadow: 0 4px 10px rgba(194, 140, 53, 0.12);
}

.page .muted,
.ruleItem {
  color: #9d754c;
}

.page .label {
  color: #a17142;
}

.page .select,
.page select {
  background: #fffbf3;
  color: #5a3512;
  border: 1px solid rgba(154, 104, 45, 0.2);
}

.page .select:focus,
.page select:focus {
  border-color: rgba(154, 104, 45, 0.45);
  box-shadow: 0 0 0 3px rgba(227, 170, 50, 0.14);
}



.page .pill {
  border: 1px solid rgba(154, 104, 45, 0.18);
  color: #9d754c;
  background: rgba(255, 251, 240, 0.78);
}

.page .pill.code {
  border-color: rgba(154, 104, 45, 0.24);
  color: #74481d;
  background: linear-gradient(180deg, #f9e0a4, #edc56d);
}

.page .pill.good {
  border-color: rgba(194, 140, 53, 0.28);
  color: #6a4917;
  background: linear-gradient(180deg, #ffe39f, #efc04e);
}

.page .pill.neutral {
  border-color: rgba(194, 168, 127, 0.28);
  color: #9a7e56;
  background: linear-gradient(180deg, #fff9ee, #efe2c5);
}

.emptySubtext {
  color: #bc8e57;
}

.page .toast.bad {
  border: 1px solid rgba(186, 88, 68, 0.3);
  background: rgba(186, 88, 68, 0.12);
  color: #9a4e41;
}
  .rankBadge.rank-novice {
  background: linear-gradient(180deg, #f5ecdc, #decdb0);
  color: #6f604f;
}

.rankBadge.rank-apprentice {
  background: linear-gradient(180deg, #e5f6c9, #b7de7a);
  color: #45622f;
}

.rankBadge.rank-skilled {
  background: linear-gradient(180deg, #dff1ff, #8fc4e8);
  color: #2f5874;
}

.rankBadge.rank-professional {
  background: linear-gradient(180deg, #efdfff, #c492f0);
  color: #603985;
}

.rankBadge.rank-expert {
  background: linear-gradient(180deg, #ffe6ae, #f0b848);
  color: #714a07;
}

.rankBadge.rank-king {
  background: linear-gradient(180deg, #ffe78f, #f1b800);
  color: #5f3c00;
  box-shadow: 0 0 14px rgba(241, 184, 0, 0.35);
}
      `}</style>
    </div>
  );
}