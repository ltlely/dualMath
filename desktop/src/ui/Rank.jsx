import React, { useEffect, useMemo, useState } from "react";
import { userManager } from "../userManagerSupabase.js";

function safeNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function getWinRate(player) {
  const wins = safeNumber(player?.wins);
  const losses = safeNumber(player?.losses);
  const totalGames =
    player?.totalGames != null
      ? safeNumber(player.totalGames)
      : wins + losses;

  if (!totalGames) return 0;
  return Math.round((wins / totalGames) * 100);
}

function normalizePlayer(player, index) {
  const wins = safeNumber(player?.wins);
  const losses = safeNumber(player?.losses);
  const totalGames =
    player?.totalGames != null
      ? safeNumber(player?.totalGames)
      : wins + losses;

  return {
    id: player?.id || `player-${index}`,
    username: player?.username || "Unknown",
    avatarData: player?.avatarData || null,
    wins,
    losses,
    totalGames,
    rankPoints: safeNumber(player?.rankPoints),
    winRate: getWinRate(player),
  };
}

export default function Rank({ currentUser, onBack }) {
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const MIN_GAMES_FOR_RATIO = 5;

  useEffect(() => {
    let isMounted = true;

    const loadLeaderboard = async () => {
      try {
        setIsLoading(true);
        const data = await userManager.getLeaderboard();
        if (isMounted) {
          setPlayers(data || []);
        }
      } catch (err) {
        console.error("Failed to load leaderboard:", err);
        if (isMounted) setPlayers([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadLeaderboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const normalizedPlayers = useMemo(() => {
    return (players || []).map(normalizePlayer);
  }, [players]);

 const leaderboard = useMemo(() => {
  return [...normalizedPlayers]
    .filter((p) => p.totalGames >= MIN_GAMES_FOR_RATIO)
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.rankPoints - a.rankPoints;
    })
    .slice(0, 10);
}, [normalizedPlayers]);

  const me = useMemo(() => {
    if (!currentUser) return null;
    return normalizePlayer(currentUser, 0);
  }, [currentUser]);

  return (
    <div className="rankShell">
      <div className="rankTopbar">
        <div>
          <div className="miniLabel">Rank</div>
          <h1 className="rankHeading">Leaderboard</h1>
          <p className="rankMuted">Top players by wins and win rate.</p>
        </div>

        <button type="button" className="backButton" onClick={onBack}>
          Back
        </button>
      </div>

      {me && (
        <section className="mePanel">
          <div className="miniLabel">Your Stats</div>
          <div className="meCard">
            <div className="meIdentity">
              <div className="meAvatar">
                {me.avatarData ? (
                  <img src={me.avatarData} alt={me.username} />
                ) : (
                  <span>{me.username?.[0]?.toUpperCase() || "?"}</span>
                )}
              </div>

              <div>
                <div className="meName">{me.username}</div>
                <div className="meSub">
                  {me.wins} wins • {me.losses} losses • {me.winRate}% WR
                </div>
              </div>
            </div>

            <div className="meStats">
              <div className="statPill">
                <span>Wins</span>
                <strong>{me.wins}</strong>
              </div>
              <div className="statPill">
                <span>Win Rate</span>
                <strong>{me.winRate}%</strong>
              </div>
              <div className="statPill">
                <span>RP</span>
                <strong>{me.rankPoints}</strong>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="rankGrid singleColumn">
  <section className="rankPanel">
    <div className="panelHeader">
      <div className="miniLabel">Leaderboard</div>
      <h2>Top Players</h2>
    </div>

    <div className="leaderList">
      {isLoading ? (
        <div className="emptyState">Loading leaderboard...</div>
      ) : leaderboard.length > 0 ? (
        leaderboard.map((player, index) => (
          <div className="leaderRow" key={`leader-${player.id}`}>
            <div className="leaderLeft">
              <div className="leaderPlace">#{index + 1}</div>

              <div className="leaderAvatar">
                {player.avatarData ? (
                  <img src={player.avatarData} alt={player.username} />
                ) : (
                  <span>{player.username?.[0]?.toUpperCase() || "?"}</span>
                )}
              </div>

              <div>
                <div className="leaderName">{player.username}</div>
                <div className="leaderSub">
                  {player.totalGames} games • {player.rankPoints} RP
                </div>
              </div>
            </div>

            <div className="leaderStats">
              <div className="leaderStatBox">
                <span>Wins</span>
                <strong>{player.wins}</strong>
              </div>
              <div className="leaderStatBox">
                <span>WR</span>
                <strong>{player.winRate}%</strong>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="emptyState">
          No players with at least {MIN_GAMES_FOR_RATIO} games yet.
        </div>
      )}
    </div>
  </section>


        
      </div>

      <style>{`
        :root{
          --base: rgba(240, 231, 207, 0.94);
          --cream:#f5eed7;
          --cream-2:#f9f2d9;
          --cream-3:#f0e3c1;
          --tan:#dcc4a2;
          --brown:#8d6b4f;
          --brown-dark:#5b3f2a;
          --brown-soft:#b19179;
          --gold:#cfa25f;
          --gold-2:#d9b16a;
          --ink:#4c3826;
          --muted:#8f7b63;
        }

        .rankShell {
          min-height: 100vh;
          padding: 24px;
          background:
            radial-gradient(circle at top, rgba(255, 248, 230, 0.75), transparent 35%),
            linear-gradient(180deg, #f8f0dd 0%, #e6d2ac 100%);
          color: var(--ink);
          box-sizing: border-box;
        }

        .rankTopbar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }

        .miniLabel {
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 11px;
          color: var(--muted);
        }

        .rankHeading {
          margin: 6px 0 8px;
          font-size: clamp(32px, 4vw, 48px);
          line-height: 1;
        }

        .rankMuted {
          margin: 0;
          color: var(--muted);
        }

        .backButton {
          padding: 12px 16px;
          border-radius: 999px;
          border: 1px solid rgba(107, 79, 52, 0.12);
          background: var(--brown);
          color: #f9f1dd;
          font-weight: 700;
          cursor: pointer;
        }

        .mePanel {
          margin-bottom: 18px;
        }

        .meCard,
        .rankPanel {
          background: linear-gradient(180deg, var(--cream), var(--tan));
          border: 1px solid rgba(93, 88, 63, 0.08);
          border-radius: 24px;
          padding: 18px;
          box-shadow: 0 12px 24px rgba(95, 70, 48, 0.10);
        }

        .meCard {
          margin-top: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .meIdentity {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .meAvatar,
        .leaderAvatar {
            overflow: hidden;
            display: grid;
            place-items: center;
            background: transparent;
            border:none;
        }

        .meAvatar {
          width: 68px;
          height: 68px;
          border-radius: 18px;
        }

        .leaderAvatar {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          flex-shrink: 0;
        }

        .meAvatar img,
        .leaderAvatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .meName {
          font-size: 20px;
          font-weight: 800;
        }

        .meSub,
        .leaderSub {
          color: var(--muted);
          font-size: 13px;
          margin-top: 4px;
        }

        .meStats {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .statPill {
          min-width: 92px;
          padding: 10px 12px;
          border-radius: 16px;
          background: rgba(255, 253, 244, 0.75);
          border: 1px solid rgba(93, 88, 63, 0.08);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .statPill span {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--muted);
        }

        .rankGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .panelHeader h2 {
          margin: 6px 0 14px;
          font-size: 26px;
        }

        .leaderList {
          display: grid;
          gap: 10px;
        }

        .leaderRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 18px;
          background: linear-gradient(180deg, #f9f7ea, var(--cream-3));
          border: 1px solid rgba(93, 88, 63, 0.08);
        }

        .leaderLeft {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .leaderPlace {
          width: 34px;
          font-weight: 900;
          color: var(--brown-dark);
          flex-shrink: 0;
        }

        .leaderName {
          font-weight: 700;
        }

        .leaderValue {
          font-weight: 900;
          color: var(--brown-dark);
          flex-shrink: 0;
        }

        .emptyState {
          min-height: 180px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          border: 1px dashed rgba(93, 88, 63, 0.16);
          color: var(--muted);
          background: rgba(255, 253, 244, 0.55);
        }

        @media (max-width: 900px) {
          .rankGrid {
            grid-template-columns: 1fr;
          }
        }

        .rankGrid.singleColumn {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
}

.leaderStats {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
}

.leaderStatBox {
  min-width: 74px;
  padding: 8px 10px;
  border-radius: 14px;
  background: rgba(255, 253, 244, 0.75);
  border: 1px solid rgba(93, 88, 63, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.leaderStatBox span {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--muted);
}

.leaderStatBox strong {
  font-size: 16px;
  color: var(--brown-dark);
}

@media (max-width: 700px) {
  .leaderRow {
    flex-direction: column;
    align-items: stretch;
  }

  .leaderStats {
    justify-content: flex-end;
  }
}
      `}</style>
    </div>
  );
}