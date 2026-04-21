import React, { useMemo, useState, useEffect } from "react";
import { Card, Button, Select, Pill } from "./components.jsx";
import { userManager } from "../userManagerSupabase.js";

const rankImages = {
  "Novice Apprentice": "/noviceApprenticeRank.png",
  Skilled: "/skilledRank.png",
  Professional: "/professionalRank.png",
  Expert: "/expertRank.png",
  King: "/kingRank.png",
};

function getRankImage(rank) {
  return rankImages[rank] || "/noviceApprenticeRank.png";
}

function Slot({ title, player, isYou, onSit, currentUserAvatarData, username, currentUser }) {
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

      <div className="grid2">
       
    
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
    radial-gradient(circle at 50% 14%, rgba(255, 236, 184, 0.22), transparent 20%),
    radial-gradient(circle at 18% 8%, rgba(255, 245, 220, 0.55), transparent 30%),
    radial-gradient(circle at 82% 0%, rgba(229, 197, 132, 0.18), transparent 24%),
    linear-gradient(180deg, #f8f0dd 0%, #d3bd95 100%);
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
  color: #55763a;
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
.page {
  color: #5a3512;
}



.page::after {
  background: radial-gradient(circle, rgba(243, 196, 94, 0.18), transparent 70%);
}

.roomLabel {
  color: #ab7d42;
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

.page .card {
  border: 1px solid rgba(191, 145, 63, 0.22);
  background: linear-gradient(180deg, rgba(255, 244, 214, 0.96), rgba(232, 196, 127, 0.94));
  box-shadow:
    0 18px 34px rgba(136, 94, 38, 0.10),
    inset 0 1px 0 rgba(255,255,255,0.52);
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

.page .slot {
  border: 1px solid rgba(191, 145, 63, 0.18);
  background: linear-gradient(180deg, #fff2cf, #f1dfae);
  box-shadow:
    0 10px 18px rgba(136, 94, 38, 0.07),
    inset 0 1px 0 rgba(255,255,255,0.5);
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
  color: #603b18;
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

.page .btn.primary {
  background: linear-gradient(180deg, #ffd66f, #e1a928);
  color: #5a3a11;
  box-shadow:
    0 10px 18px rgba(196, 139, 61, 0.22),
    inset 0 1px 0 rgba(255,255,255,0.4);
}

.page .btn.secondary {
  background: linear-gradient(180deg, #fff8e8, #f2dfb8);
  border-color: rgba(191, 145, 63, 0.22);
  color: #603b18;
  box-shadow:
    0 8px 14px rgba(136, 94, 38, 0.08),
    inset 0 1px 0 rgba(255,255,255,0.52);
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