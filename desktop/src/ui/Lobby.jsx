import React, { useState, useMemo } from "react";
import { Card, Button, Input } from "./components.jsx";
import Auth from "./Auth.jsx";
import { userManager } from "../userManager.js";
import { getRankProgress, getNextRank, getPointsToNextRank } from "../rankingSystem.js";
import { userManager } from "../userManagerSupabase.js";

export default function Lobby({ onCreate, onJoin, onJoinRandom, error, currentUser, onLoginSuccess, isConnected }) {
  const [roomName, setRoomName] = useState("");
  const [code, setCode] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [isJoiningRandom, setIsJoiningRandom] = useState(false);

  // Use useMemo BEFORE any conditional returns (React hooks rule)
  const { stats, rankProgress, nextRank, pointsToNext } = useMemo(() => {
    // Default values
    let calculatedStats = { rank: 'Novice', rankPoints: 0, wins: 0, losses: 0, totalGames: 0, winRate: 0 };
    let calculatedProgress = 0;
    let calculatedNextRank = null;
    let calculatedPointsToNext = 0;

    // Only calculate if we have a currentUser
    if (currentUser) {
      try {
        console.log("📊 Lobby stats calculation - currentUser:", {
          username: currentUser.username,
          wins: currentUser.wins,
          losses: currentUser.losses,
          rankPoints: currentUser.rankPoints
        });
        calculatedStats = userManager.getUserStats(currentUser) || calculatedStats;
        console.log("📊 Lobby calculated stats:", calculatedStats);
        const rankPoints = currentUser?.rankPoints || 0;
        calculatedProgress = getRankProgress(rankPoints);
        calculatedNextRank = getNextRank(rankPoints);
        calculatedPointsToNext = getPointsToNextRank(rankPoints);
      } catch (e) {
        console.error("Error calculating stats:", e);
      }
    }

    return {
      stats: calculatedStats,
      rankProgress: calculatedProgress,
      nextRank: calculatedNextRank,
      pointsToNext: calculatedPointsToNext
    };
  }, [currentUser, currentUser?.wins, currentUser?.losses, currentUser?.rankPoints]);

  // If not logged in, show auth first (AFTER all hooks)
  if (!currentUser) {
    return <Auth onLoginSuccess={onLoginSuccess} isLoggedIn={false} currentUser={null} />;
  }

  return (
    <div className="page">
      {/* Top-right Settings Icon */}
      <div className="topRight">
        <div className="connectionStatus">
          <span className={`connectionDot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          <span className="connectionText">{isConnected ? 'Connected' : 'Connecting...'}</span>
        </div>
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
                if (!user) {
                  setShowSettings(false);
                }
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
            <div className="userWelcome">
              Playing as: <strong>{currentUser.username}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Player Stats Card */}
      <div style={{ marginBottom: '20px' }}>
        <Card title="Your Stats">
          <div className="statsGrid">
            <div className="statItem">
              <div className="statLabel">Rank</div>
              <div className="statValue">{stats.rank}</div>
              <div className="statSubtext">{stats.rankPoints} RP</div>
            </div>
            <div className="statItem">
              <div className="statLabel">Wins</div>
              <div className="statValue">{stats.wins}</div>
              <div className="statSubtext">{stats.totalGames} total games</div>
            </div>
            <div className="statItem">
              <div className="statLabel">Losses</div>
              <div className="statValue">{stats.losses}</div>
              <div className="statSubtext">{stats.winRate}% win rate</div>
            </div>
          </div>
          
          {/* Rank Progress Section */}
          <div className="rankProgressSection">
            <div className="rankProgressHeader">
              <div className="currentRankBadge">
                <span className="rankIcon">🏆</span>
                <span className="rankName">{stats.rank}</span>
              </div>
              {nextRank && (
                <div className="nextRankInfo">
                  <span className="arrowIcon">→</span>
                  <span className="nextRankName">{nextRank}</span>
                </div>
              )}
            </div>
            
            <div className="progressBarContainer">
              <div className="progressBarBg">
                <div 
                  className="progressBarFillGreen" 
                  style={{ width: `${rankProgress}%` }}
                >
                  <div className="progressGlow"></div>
                </div>
              </div>
              <div className="progressLabels">
                <span className="rpEarned">{stats.rankPoints} RP</span>
                {nextRank && (
                  <span className="rpNeeded">{pointsToNext} more to {nextRank}</span>
                )}
              </div>
            </div>
            
            {/* RP Points Indicator */}
            <div className="rpIndicator">
              <div className="rpDot"></div>
              <span className="rpText">+25 RP per win</span>
              <div className="rpDotRed"></div>
              <span className="rpText">-15 RP per loss</span>
            </div>
          </div>
        </Card>
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

      <style>{`
        .page {
          position: relative;
        }
        
        .statsGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        
        @media (max-width: 768px) {
          .statsGrid {
            grid-template-columns: 1fr;
          }
        }
        
        .statItem {
          text-align: center;
          padding: 16px;
          border-radius: 12px;
          background: rgba(255,255,255,.02);
          border: 1px solid rgba(38,38,74,.6);
        }
        
        .statLabel {
          font-size: 12px;
          color: var(--muted);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .statValue {
          font-size: 32px;
          font-weight: 900;
          color: var(--accent);
          line-height: 1;
        }
        
        .statSubtext {
          font-size: 14px;
          color: var(--muted);
          margin-top: 4px;
        }
        
        /* Rank Progress Section */
        .rankProgressSection {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(38,38,74,.6);
        }
        
        .rankProgressHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        
        .currentRankBadge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05));
          border: 1px solid rgba(34, 197, 94, 0.4);
          border-radius: 20px;
        }
        
        .rankIcon {
          font-size: 18px;
        }
        
        .rankName {
          font-weight: 800;
          color: #22c55e;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .nextRankInfo {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--muted);
        }
        
        .arrowIcon {
          font-size: 16px;
          color: rgba(34, 197, 94, 0.6);
        }
        
        .nextRankName {
          font-weight: 700;
          font-size: 14px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .progressBarContainer {
          margin-bottom: 12px;
        }
        
        .progressBarBg {
          height: 12px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(38,38,74,.7);
          border-radius: 999px;
          overflow: hidden;
          position: relative;
        }
        
        .progressBarFillGreen {
          height: 100%;
          background: linear-gradient(90deg, #16a34a, #22c55e, #4ade80);
          border-radius: 999px;
          position: relative;
          transition: width 0.5s ease;
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
        }
        
        .progressGlow {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 2s infinite;
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .progressLabels {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
        }
        
        .rpEarned {
          font-weight: 800;
          font-size: 16px;
          color: #22c55e;
        }
        
        .rpNeeded {
          font-size: 12px;
          color: var(--muted);
        }
        
        .rpIndicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: rgba(255,255,255,.02);
          border: 1px solid rgba(38,38,74,.6);
          border-radius: 10px;
          margin-top: 8px;
        }
        
        .rpDot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
        }
        
        .rpDotRed {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #fb7185;
          box-shadow: 0 0 6px rgba(251, 113, 133, 0.6);
          margin-left: 12px;
        }
        
        .rpText {
          font-size: 12px;
          color: var(--muted);
        }
        
        .progressBar {
          height: 8px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(38,38,74,.7);
          border-radius: 999px;
          overflow: hidden;
        }
        
        .progressFill {
          height: 100%;
          background: linear-gradient(90deg, rgba(45,212,191,.9), rgba(124,92,255,.9));
          transition: width 0.3s ease;
        }
        
        .topRight {
          position: absolute;
          top: 20px;
          right: 20px;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .connectionStatus {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 12px;
          font-size: 12px;
        }
        
        .connectionDot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        
        .connectionDot.connected {
          background: #22c55e;
          box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
        }
        
        .connectionDot.disconnected {
          background: #fb7185;
          box-shadow: 0 0 6px rgba(251, 113, 133, 0.6);
          animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .connectionText {
          color: var(--muted);
        }
        
        .settingsIconBtn {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .settingsIconBtn:hover {
          background: var(--card2);
          border-color: var(--accent);
        }
        
        .settingsModal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
        }
        
        .settingsOverlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(11, 11, 18, 0.8);
          backdrop-filter: blur(4px);
        }
        
        .settingsPanel {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          z-index: 1001;
        }
        
        .grid3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 14px;
          position: relative;
          z-index: 1;
        }
        
        @media (max-width: 900px) {
          .grid3 {
            grid-template-columns: 1fr;
          }
        }
        
        .card {
          position: relative;
          z-index: 1;
        }
        
        .btn {
          position: relative;
          z-index: 1;
          cursor: pointer;
        }
        
        .btn:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}