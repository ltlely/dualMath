import React, { useEffect, useMemo, useState } from "react";
import { userManager } from "../userManagerSupabase.js";
import { updatePoints } from "../rankingSystem.js";

// Simple UI Components
function Card({ title, children, className = "" }) {
  return (
    <div className={`card ${className}`}>
      <div className="cardTop">
        <div className="cardTitle">{title}</div>
      </div>
      <div className="cardBody">{children}</div>
    </div>
  );
}

function Button({ children, ...props }) {
  return <button className="btn primary" {...props}>{children}</button>;
}

function Input(props) {
  return <input className="input" {...props} />;
}

export default function Game({
  room, selfId,
  roundInfo,
  lastRound,
  onDigit,
  onSubmit,
  onChatSend,
  chat,
  currentUser,
  onLeaveRoom,
  onUserUpdate,
  onForfeit,
}) {

  const [chatText, setChatText] = useState("");
  const [localTens, setLocalTens] = useState(null);
  const [localOnes, setLocalOnes] = useState(null);
  const [statsUpdated, setStatsUpdated] = useState(false);

  const playersSorted = useMemo(() => {
    const ps = [...(room?.players ?? [])];
    ps.sort((a, b) => b.score - a.score);
    return ps;
  }, [room]);

  const me = (room?.players ?? []).find(p => p.id === selfId);
  const myTeam = me?.team;
  const mySlot = me?.slot;
  const teamDigits = room?.state?.teamDigits?.[myTeam] || null;
  const otherTeam = myTeam ? (myTeam === 'A' ? 'B' : 'A') : 'B';
  const otherDigits = room?.state?.teamDigits?.[otherTeam] || {};

  // Get answer length to determine how many digit slots to show
  const answerLength = teamDigits?.answerLength || 2;
  const otherAnswerLength = otherDigits?.answerLength || 2;
  
  // Determine which slots to show based on answer length
  const showThousands = answerLength >= 4;
  const showHundreds = answerLength >= 3;
  const showOtherThousands = otherAnswerLength >= 4;
  const showOtherHundreds = otherAnswerLength >= 3;

  // Get team-specific question
  const myQuestion = room?.state?.teamQuestions?.[myTeam];
  const otherQuestion = room?.state?.teamQuestions?.[otherTeam];
  
  const qText = myQuestion
    ? `${myQuestion.a} ${myQuestion.op} ${myQuestion.b} = ?`
    : "Waiting for question...";

  const otherQText = otherQuestion
    ? `${otherQuestion.a} ${otherQuestion.op} ${otherQuestion.b} = ?`
    : "Waiting...";

  // Team progress
  const myCorrect = room?.state?.teamStats?.[myTeam]?.correctCount ?? 0;
  const otherCorrect = room?.state?.teamStats?.[otherTeam]?.correctCount ?? 0;
  const targetCorrect = room?.state?.targetCorrect ?? 10;

  const isGameEnded = room?.state?.phase === "ended";
  const isForfeit = !!lastRound?.forfeit;
  const forfeitedBy = lastRound?.forfeitedBy;

  useEffect(() => {
    const handler = () => {
      if (room?.state?.phase === "playing" && room?.roomCode) {
        localStorage.setItem("pending_forfeit", JSON.stringify({
          roomCode: room.roomCode,
          at: Date.now()
        }));
      }
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [room?.state?.phase, room?.roomCode]);


  // Update stats when game ends (only once)
  // Note: Stats are now handled in App.jsx via applyLocalMatchResult
  // This effect is kept for logging purposes
  useEffect(() => {
    console.log("🔍 Stats effect check:", { 
      isGameEnded, 
      winner: lastRound?.winner, 
      hasCurrentUser: !!currentUser, 
      statsUpdated,
      myTeam 
    });
    
    if (isGameEnded && lastRound?.winner && currentUser && !statsUpdated) {
      console.log("🎮 Game ended - stats handled by App.jsx");
      setStatsUpdated(true);
    }
  }, [isGameEnded, lastRound?.winner, currentUser, myTeam, statsUpdated]);

  // Clear inputs when round changes (new question)
  useEffect(() => {
    setLocalTens(null);
    setLocalOnes(null);
  }, [myQuestion?.round, room?.state?.teamRounds?.[myTeam]]);

  // Reset statsUpdated when game resets
  useEffect(() => {
    if (!isGameEnded) {
      setStatsUpdated(false);
    }
  }, [isGameEnded]);

  useEffect(() => {
    return () => {
      setStatsUpdated(false);
    };
  }, []);

  function submitDigits(tensVal, onesVal) {
    const t = Number(tensVal);
    const o = Number(onesVal);
    if (!Number.isInteger(t) || !Number.isInteger(o)) return false;
    if (typeof onSubmit === 'function') {
      onSubmit({ tens: t, ones: o });
    } else if (onDigit) {
      onDigit({ place: "tens", digit: t });
      onDigit({ place: "ones", digit: o });
    }
    setLocalTens(null);
    setLocalOnes(null);
    return true;
  }

  const getPointsChange = () => {
    if (!lastRound?.winner || lastRound.winner === 'tie' || !currentUser) return null;
    const didWin = lastRound.winner === myTeam;
    const currentPoints = currentUser.rankPoints ?? 0;
    const newPoints = updatePoints(currentPoints, didWin);
    return newPoints - currentPoints;
  };

  const pointsChange = getPointsChange();

  return (
    <div className="page">
      {/* Race Progress Header */}
      <div className="raceHeader">
        <div className="raceTitle">
          <span className="raceIcon">🏁</span>
          Race to {targetCorrect}!
          <span className="code">{room?.roomCode}</span>
        </div>
        
        <div className="raceProgress">
          <div className="raceTeam">
            <div className="raceTeamLabel">
              <span className={`teamBadge ${myTeam === 'A' ? 'you' : ''}`}>Team A {myTeam === 'A' ? '(You)' : ''}</span>
              <span className="raceCount">{room?.state?.teamStats?.A?.correctCount ?? 0}/{targetCorrect}</span>
            </div>
            <div className="raceBar">
              <div className="raceBarFill teamA" style={{ width: `${(room?.state?.teamStats?.A?.correctCount ?? 0) / targetCorrect * 100}%` }}></div>
            </div>
          </div>
          
          <div className="raceTeam">
            <div className="raceTeamLabel">
              <span className={`teamBadge ${myTeam === 'B' ? 'you' : ''}`}>Team B {myTeam === 'B' ? '(You)' : ''}</span>
              <span className="raceCount">{room?.state?.teamStats?.B?.correctCount ?? 0}/{targetCorrect}</span>
            </div>
            <div className="raceBar">
              <div className="raceBarFill teamB" style={{ width: `${(room?.state?.teamStats?.B?.correctCount ?? 0) / targetCorrect * 100}%` }}></div>
            </div>
          </div>
        </div>

        {!isGameEnded && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Button
              onClick={() => {
                if (!room?.roomCode) return;
                if (window.confirm("Forfeit the match? Your team will lose immediately.")) {
                  if (typeof onForfeit === "function") onForfeit();
                }
              }}
              style={{ background: "#fb7185", color: "#0b0b12" }}
            >
              Forfeit
            </Button>
          </div>
        )}


        {currentUser && (
          <div className="userQuick">
            <div className="quickAvatar">
              {currentUser?.avatarData ? (
                <img src={currentUser.avatarData} alt="Avatar" />
              ) : (
                currentUser?.username?.[0]?.toUpperCase() ?? "?"
              )}
            </div>
            <div className="quickInfo">
              <div className="quickUsername">@{currentUser?.username}</div>
              <div className="quickPoints">
                {userManager.getUserRank(currentUser)} • {currentUser?.rankPoints ?? 0} RP
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Game Over Banner */}
      {isGameEnded && lastRound?.winner && (
        <div className="gameOverBanner">
          <div className="gameOverContent">
            <h1 className="gameOverTitle">
              {lastRound.winner === 'tie' ? '🤝 Match Tied!' : 
               lastRound.winner === myTeam ? '🎉 Victory!' : '💔 Defeat'}
            </h1>
            <div className="gameOverSubtitle">
              {lastRound.winner === "tie"
                ? "Both teams finished at the same time!"
                : isForfeit
                  ? `Forfeit — Team ${forfeitedBy ?? "?"} left. Team ${lastRound.winner} wins!`
                  : `Team ${lastRound.winner} finished first!`}
            </div>

            <div className="gameOverStats">
              <div className="statBox">
                <div className="statLabel">Team A</div>
                <div className="statValue">{room?.state?.teamStats?.A?.correctCount ?? 0}/{targetCorrect}</div>
                {room?.state?.teamStats?.A?.timeToTarget && (
                  <div className="statTime">{(room.state.teamStats.A.timeToTarget / 1000).toFixed(1)}s</div>
                )}
              </div>
              <div className="statBox">
                <div className="statLabel">Team B</div>
                <div className="statValue">{room?.state?.teamStats?.B?.correctCount ?? 0}/{targetCorrect}</div>
                {room?.state?.teamStats?.B?.timeToTarget && (
                  <div className="statTime">{(room.state.teamStats.B.timeToTarget / 1000).toFixed(1)}s</div>
                )}
              </div>
            </div>
            
            {pointsChange !== null && lastRound.winner !== 'tie' && (
              <div className="pointsUpdate">
                {pointsChange >= 0 ? (
                  <div className="pointsGained">+{pointsChange} RP</div>
                ) : (
                  <div className="pointsLost">{pointsChange} RP</div>
                )}
              </div>
            )}
            
            <Button onClick={onLeaveRoom} style={{ marginTop: '20px', padding: '14px 28px', fontSize: '16px' }}>
              Return to Lobby
            </Button>
          </div>
        </div>
      )}

      <div className="grid2">
        {/* Your Team's Question */}
        <Card title={`Your Team (${myTeam}) - Q${room?.state?.teamRounds?.[myTeam] ?? 0}`} className="yourTeamCard">
          <div className="questionSection">
            <div className="question">{qText}</div>
            <div className="correctCounter">
              <span className="correctIcon">✓</span>
              <span className="correctNum">{myCorrect}</span>
              <span className="correctTotal">/ {targetCorrect}</span>
            </div>
          </div>

          <div className="digitHint muted">
            {answerLength === 1 && "1-digit answer"}
            {answerLength === 2 && "2-digit answer"}
            {answerLength === 3 && "3-digit answer (hundreds pre-filled)"}
            {answerLength === 4 && "4-digit answer (thousands & hundreds pre-filled)"}
          </div>

          <div className="digitSlots">
            {/* Thousands - only show for 4-digit answers */}
            {showThousands && (
              <div className="slot autoFilledSlot">
                <div className="slotTop">
                  <div className="slotTitle">1000s</div>
                  <span className="pill good">auto</span>
                </div>
                <div className="slotDigit">{teamDigits?.thousands ?? "?"}</div>
              </div>
            )}
            
            {/* Hundreds - show for 3+ digit answers */}
            {showHundreds && (
              <div className="slot autoFilledSlot">
                <div className="slotTop">
                  <div className="slotTitle">100s</div>
                  <span className="pill good">auto</span>
                </div>
                <div className="slotDigit">{teamDigits?.hundreds ?? "?"}</div>
              </div>
            )}

            {/* Tens - always show for 2+ digit answers */}
            {answerLength >= 2 && (
              <div className={`slot ${mySlot === 0 ? 'yourSlot' : ''}`}>
                <div className="slotTop">
                  <div className="slotTitle">10s {teamDigits?.lockedTens ? "🔒" : ""}</div>
                  {mySlot === 0 && <span className="pill code">you</span>}
                </div>
                <Input
                  value={(localTens ?? teamDigits?.tens ?? "") + ""}
                  disabled={!(myTeam && mySlot === 0) || teamDigits?.lockedTens || teamDigits?.overallLocked}
                  inputMode="numeric"
                  maxLength={1}
                  placeholder="?"
                  className="slotInput"
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, "").slice(0,1) || null;
                    setLocalTens(v);
                    if (onDigit && v !== null) onDigit({ place: "tens", digit: Number(v) });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const tensVal = (localTens !== null ? localTens : teamDigits?.tens);
                      const onesVal = (localOnes !== null ? localOnes : teamDigits?.ones);
                      if (tensVal !== null && tensVal !== undefined && onesVal !== null && onesVal !== undefined) {
                        submitDigits(tensVal, onesVal);
                      }
                    }
                  }}
                />
              </div>
            )}

            {/* Ones - always show */}
            <div className={`slot ${mySlot === 1 ? 'yourSlot' : ''}`}>
              <div className="slotTop">
                <div className="slotTitle">1s {teamDigits?.lockedOnes ? "🔒" : ""}</div>
                {mySlot === 1 && <span className="pill code">you</span>}
              </div>
              <Input
                value={(localOnes ?? teamDigits?.ones ?? "") + ""}
                disabled={!(myTeam && mySlot === 1) || teamDigits?.lockedOnes || teamDigits?.overallLocked}
                inputMode="numeric"
                maxLength={1}
                placeholder="?"
                className="slotInput"
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, "").slice(0,1) || null;
                  setLocalOnes(v);
                  if (onDigit && v !== null) onDigit({ place: "ones", digit: Number(v) });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const tensVal = (localTens !== null ? localTens : teamDigits?.tens);
                    const onesVal = (localOnes !== null ? localOnes : teamDigits?.ones);
                    if (tensVal !== null && tensVal !== undefined && onesVal !== null && onesVal !== undefined) {
                      submitDigits(tensVal, onesVal);
                    }
                  }
                }}
              />
            </div>
          </div>
          
          <div className="hint muted">
            {mySlot === 0 ? "You control the TENS digit" : "You control the ONES digit"} • Press Enter to submit
          </div>
        </Card>

        {/* Opponent's Progress */}
        <Card title={`Team ${otherTeam} (Opponent) - Q${room?.state?.teamRounds?.[otherTeam] ?? 0}`} className="opponentCard">
          <div className="questionSection">
            <div className="question opponentQuestion">{otherQText}</div>
            <div className="correctCounter opponent">
              <span className="correctIcon">✓</span>
              <span className="correctNum">{otherCorrect}</span>
              <span className="correctTotal">/ {targetCorrect}</span>
            </div>
          </div>

          <div className="digitSlots">
            {/* Thousands - only for 4-digit answers */}
            {showOtherThousands && (
              <div className="slot autoFilledSlot">
                <div className="slotTop">
                  <div className="slotTitle">1000s</div>
                  <span className="pill good">auto</span>
                </div>
                <div className="slotDigit">{otherDigits?.thousands ?? "?"}</div>
              </div>
            )}
            {/* Hundreds - for 3+ digit answers */}
            {showOtherHundreds && (
              <div className="slot autoFilledSlot">
                <div className="slotTop">
                  <div className="slotTitle">100s</div>
                  <span className="pill good">auto</span>
                </div>
                <div className="slotDigit">{otherDigits?.hundreds ?? "?"}</div>
              </div>
            )}
            {/* Tens - for 2+ digit answers */}
            {otherAnswerLength >= 2 && (
              <div className="slot">
                <div className="slotTop">
                  <div className="slotTitle">10s {otherDigits?.lockedTens ? "🔒" : ""}</div>
                </div>
                <div className="slotDigit">{otherDigits?.tens ?? "?"}</div>
              </div>
            )}
            {/* Ones - always show */}
            <div className="slot">
              <div className="slotTop">
                <div className="slotTitle">1s {otherDigits?.lockedOnes ? "🔒" : ""}</div>
              </div>
              <div className="slotDigit">{otherDigits?.ones ?? "?"}</div>
            </div>
          </div>
        </Card>
      </div>

      <style>{`
:root{
  --bg:#0b0b12;
  --card:#121222;
  --card2:#15152a;
  --text:#f3f4ff;
  --muted:#9aa0c3;
  --line:#26264a;
  --accent:#7c5cff;
  --good:#2dd4bf;
  --bad:#fb7185;
  --teamA:#22c55e;
  --teamB:#3b82f6;
}

*{ box-sizing:border-box; }
body{
  margin:0;
  background: radial-gradient(900px 500px at 30% -10%, rgba(124,92,255,.25), transparent),
              radial-gradient(900px 500px at 90% 10%, rgba(45,212,191,.18), transparent),
              var(--bg);
  color:var(--text);
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
}
.page{ max-width:1100px; margin:24px auto; padding:0 18px 24px; }

.raceHeader{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: linear-gradient(180deg, rgba(255,255,255,.03), transparent), var(--card);
  border: 1px solid var(--line);
  border-radius: 16px;
  flex-wrap: wrap;
}

.raceTitle{
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 800;
}

.raceIcon{ font-size: 28px; }

.raceProgress{
  display: flex;
  gap: 20px;
  flex: 1;
  max-width: 500px;
}

.raceTeam{ flex: 1; }

.raceTeamLabel{
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
}

.teamBadge{
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 700;
  background: rgba(255,255,255,.05);
  border: 1px solid var(--line);
}

.teamBadge.you{
  background: rgba(124,92,255,.15);
  border-color: rgba(124,92,255,.4);
  color: var(--accent);
}

.raceCount{ font-weight: 800; color: var(--text); }

.raceBar{
  height: 12px;
  background: rgba(255,255,255,.06);
  border: 1px solid var(--line);
  border-radius: 999px;
  overflow: hidden;
}

.raceBarFill{
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}

.raceBarFill.teamA{
  background: linear-gradient(90deg, #16a34a, #22c55e);
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.4);
}

.raceBarFill.teamB{
  background: linear-gradient(90deg, #2563eb, #3b82f6);
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);
}

.grid2{ display:grid; grid-template-columns:1fr 1fr; gap:14px; }
@media (max-width: 980px){
  .grid2{ grid-template-columns:1fr; }
  .raceProgress{ flex-direction: column; gap: 10px; }
}

.card{
  border:1px solid var(--line);
  background: linear-gradient(180deg, rgba(255,255,255,.03), transparent), var(--card);
  border-radius:16px;
  box-shadow: 0 10px 30px rgba(0,0,0,.25);
}

.yourTeamCard{ border-color: rgba(124,92,255,.3); }
.opponentCard{ opacity: 0.85; }

.cardTop{
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 14px 10px;
  border-bottom:1px solid rgba(38,38,74,.7);
}
.cardTitle{ font-weight:700; }
.cardBody{ padding:14px; }

.questionSection{
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.question{ font-size: 32px; font-weight: 900; letter-spacing: .3px; }
.opponentQuestion{ font-size: 24px; opacity: 0.8; }

.correctCounter{
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 12px;
}

.correctCounter.opponent{
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
}

.correctIcon{ color: var(--good); font-weight: 800; }
.correctNum{ font-size: 24px; font-weight: 900; color: var(--good); }
.correctCounter.opponent .correctNum{ color: #3b82f6; }
.correctTotal{ font-size: 14px; color: var(--muted); }

.stack{ display:flex; flex-direction:column; gap:10px; }
.row{ display:flex; gap:10px; align-items:center; }
.label{ font-size:12px; color:var(--muted); margin-bottom:6px; }

.input{
  width:100%;
  background: var(--card2);
  color: var(--text);
  border:1px solid var(--line);
  border-radius:12px;
  padding:12px 14px;
  font-size: 20px;
  font-weight: 700;
  text-align: center;
  outline:none;
}
.input:focus{ border-color: rgba(124,92,255,.6); box-shadow: 0 0 0 3px rgba(124,92,255,.15); }
.input:disabled{ opacity: 0.5; }

.hint{ font-size: 12px; text-align: center; margin-top: 12px; }

.digitHint{
  font-size: 13px;
  text-align: center;
  padding: 8px 12px;
  background: rgba(124, 92, 255, 0.08);
  border: 1px solid rgba(124, 92, 255, 0.2);
  border-radius: 12px;
  margin-bottom: 12px;
}

/* Digit Slots Grid */
.digitSlots{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 12px;
}

/* Slot styling - matches your existing .slot class */
.slot{
  border: 1px solid rgba(38,38,74,.6);
  border-radius: 14px;
  background: rgba(255,255,255,.02);
  padding: 12px;
  min-height: 100px;
  display: flex;
  flex-direction: column;
}

.slot.yourSlot{
  border-color: rgba(124,92,255,.4);
  background: rgba(124,92,255,.06);
}

.slot.autoFilledSlot{
  border-color: rgba(45,212,191,.3);
  background: rgba(45,212,191,.06);
}

.slotTop{
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.slotTitle{
  font-weight: 900;
  letter-spacing: .4px;
  font-size: 13px;
}

.slotDigit{
  font-size: 36px;
  font-weight: 900;
  text-align: center;
  color: var(--text);
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slotInput{
  font-size: 28px !important;
  font-weight: 900 !important;
  text-align: center !important;
  padding: 8px !important;
  height: auto !important;
  flex: 1;
}

.slotInput:disabled{
  opacity: 0.5;
}

/* Pills - using your existing styles */
.pill{
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--line);
  color: var(--muted);
  background: rgba(255,255,255,.02);
}

.pill.code{
  border-color: rgba(124,92,255,.45);
  color: rgba(124,92,255,.9);
  background: rgba(124,92,255,.08);
}

.pill.good{
  border-color: rgba(45,212,191,.45);
  color: rgba(45,212,191,.9);
  background: rgba(45,212,191,.08);
}

.toast{
  padding:10px 12px;
  border-radius:14px;
  border:1px solid rgba(38,38,74,.7);
  background: rgba(255,255,255,.03);
  text-align: center;
}
.toast.good{ border-color: rgba(45,212,191,.45); background: rgba(45,212,191,.08); }

.btn{
  border:1px solid transparent;
  border-radius:12px;
  padding:10px 14px;
  font-weight:650;
  cursor:pointer;
}
.btn.primary{ background: var(--accent); color:#0b0b12; }

.userQuick{
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: rgba(255,255,255,.02);
}

.quickAvatar{
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(124,92,255,.18);
  border: 1px solid rgba(124,92,255,.35);
  font-weight: 800;
  overflow: hidden;
}

.quickAvatar img{ width: 100%; height: 100%; object-fit: cover; }

.quickInfo{ display: flex; flex-direction: column; gap: 2px; }
.quickUsername{ font-weight: 700; font-size: 14px; }
.quickPoints{ font-size: 12px; color: var(--muted); }

.code{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas;
  background: rgba(124,92,255,.15);
  border:1px solid rgba(124,92,255,.35);
  padding:4px 8px;
  border-radius:10px;
  font-size: 14px;
}

.muted{ color: var(--muted); }

.gameOverBanner{
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(11, 11, 18, 0.95);
  backdrop-filter: blur(10px);
  z-index: 1000;
  display: grid;
  place-items: center;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.gameOverContent{
  text-align: center;
  padding: 40px;
  border-radius: 24px;
  border: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(255,255,255,.05), transparent), var(--card);
  box-shadow: 0 20px 60px rgba(0,0,0,.5);
  max-width: 500px;
  animation: slideUp 0.4s ease;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.gameOverTitle{ font-size: 48px; font-weight: 900; margin: 0 0 12px 0; }
.gameOverSubtitle{ font-size: 18px; color: var(--muted); margin-bottom: 30px; }

.gameOverStats{
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-bottom: 10px;
}

.statBox{
  padding: 20px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: rgba(255,255,255,.02);
  min-width: 140px;
}

.statLabel{ font-size: 14px; color: var(--muted); margin-bottom: 8px; }
.statValue{ font-size: 32px; font-weight: 900; color: var(--accent); }
.statTime{ font-size: 14px; color: var(--good); margin-top: 4px; font-weight: 700; }

.pointsUpdate{ margin-top: 24px; font-size: 28px; font-weight: 900; }
.pointsGained{ color: var(--good); text-shadow: 0 0 20px rgba(45, 212, 191, 0.5); }
.pointsLost{ color: var(--bad); text-shadow: 0 0 20px rgba(251, 113, 133, 0.5); }
      `}</style>
    </div>
  );
}