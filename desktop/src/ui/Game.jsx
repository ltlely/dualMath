import React, { useEffect, useMemo, useState } from "react";
import { updatePoints } from "../rankingSystem.js";
import { userManager } from "../userManagerSupabase.js";


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
  room,
  selfId,
  roundInfo,
  lastRound,
  onDigit,
  onSubmit,
  onChatSend,
  chat,
  currentUser,
  onBack,
  onLeaveRoom,
  onUserUpdate,
  onForfeit,
}) {

  const [chatText, setChatText] = useState("");
  const [localTens, setLocalTens] = useState(null);
  const [localOnes, setLocalOnes] = useState(null);
  const [statsUpdated, setStatsUpdated] = useState(false);
  const [showForfeitModal, setShowForfeitModal] = useState(false);

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

  const isGameEnded = room?.state?.phase === "ended" || !!lastRound?.winner || !!lastRound?.forfeit;
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
    const tensProvided = tensVal !== null && tensVal !== undefined && tensVal !== "";
    const onesProvided = onesVal !== null && onesVal !== undefined && onesVal !== "";
    if (!tensProvided || !onesProvided) return false;

    const t = Number(tensVal);
    const o = Number(onesVal);
    if (!Number.isInteger(t) || !Number.isInteger(o)) return false;

    if (typeof onSubmit === 'function') {
      onSubmit({ tens: t, ones: o });
    } else if (typeof onDigit === 'function') {
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

  const getCoinReward = () => {
  if (!lastRound?.winner || lastRound.winner === "tie" || !currentUser) return null;

  const didWin = lastRound.winner === myTeam;
  if (!didWin) return 0;

  const diff = (room?.state?.diff || "easy").toLowerCase();

  switch (diff) {
    case "med":
    case "medium":
      return 225;
    case "hard":
      return 325;
    case "easy":
    default:
      return 150;
  }
};
const coinReward = getCoinReward();
  

  return (
    <div className="page">
      {/* Race Progress Header */}
      <div className="raceHeader">
        <div className="raceTitle">
          <span className="raceIcon">🏁</span>
          Race to {targetCorrect}!
          <span className="code">{room?.roomCode}</span>
        </div>
        
        <Button variant="secondary" onClick={onBack}>Back</Button>

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
    setShowForfeitModal(true);
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
                  {(currentUser ? userManager.getUserRank(currentUser) : "Novice")} • {currentUser?.rankPoints ?? 0} RP
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
            
            {pointsChange !== null && lastRound.winner !== "tie" && (
  <div className="pointsUpdate">
    {pointsChange >= 0 ? (
      <div className="pointsGained">+{pointsChange} RP</div>
    ) : (
      <div className="pointsLost">{pointsChange} RP</div>
    )}

    {coinReward !== null && (
      <div className="coinsEarned">
        {coinReward > 0 ? `+${coinReward} Coins` : `+0 Coins`}
      </div>
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
<Card
  title={`Your Team (${myTeam}) - Round ${(room?.state?.teamStats?.[myTeam]?.correctCount ?? 0) + 1}`}
  className="yourTeamCard"
>          <div className="questionSection">
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
                  value={((mySlot === 0 ? localTens : teamDigits?.tens) ?? "") + ""}
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
                      const tensVal = localTens !== null ? localTens : teamDigits?.tens;
                      const onesVal = localOnes !== null ? localOnes : teamDigits?.ones;
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
                value={((mySlot === 1 ? localOnes : teamDigits?.ones) ?? "") + ""}
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
                    const tensVal = localTens !== null ? localTens : teamDigits?.tens;
                    const onesVal = localOnes !== null ? localOnes : teamDigits?.ones;
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
<Card
  title={`Team ${otherTeam} (Opponent) - Round ${(room?.state?.teamStats?.[otherTeam]?.correctCount ?? 0) + 1}`}
  className="opponentCard"
>          <div className="questionSection">
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

      {showForfeitModal && (
  <div className="forfeitOverlay">
    <div className="forfeitModal">
      <div className="forfeitTitle">Forfeit Match?</div>
      <div className="forfeitText">
        Your team will lose immediately.
      </div>

      <div className="forfeitActions">
        <button
          className="forfeitBtn cancel"
          onClick={() => setShowForfeitModal(false)}
        >
          Cancel
        </button>

        <button
          className="forfeitBtn confirm"
          onClick={() => {
            setShowForfeitModal(false);
            if (typeof onForfeit === "function") onForfeit();
          }}
        >
          Yes, Forfeit
        </button>
      </div>
    </div>
  </div>
)}

      <style>{`
:root{
  --base: rgba(250, 238, 200, 0.97);
--cream:#fff3cf;
--cream-2:#ffefc4;
--cream-3:#f8de9d;
--tan:#e7be76;
--tan-2:#d7a052;
--brown:#9d692d;
--brown-dark:#6c4318;
--brown-soft:#bf8544;
--brown-light:#e4b67d;
--gold:#e3aa32;
--gold-2:#f0bd4b;
--gold-3:#ffd36d;
--ink:#5a3512;
--muted:#a2703d;
--card-border:#d6a04d;
--success-bg: rgba(181, 131, 43, 0.16);
--success-border: rgba(181, 131, 43, 0.42);
--error-bg: rgba(186, 88, 68, 0.15);
--error-border: rgba(186, 88, 68, 0.38);
--glow-gold: 0 0 40px rgba(227, 170, 50, 0.24);
--glow-brown: 0 0 24px rgba(157, 105, 45, 0.22);

--teamA:#a4cc63;
--teamA-dark:#739644;
--teamB:#c09af0;
--teamB-dark:#946fd0;
--bad:#d97f6d;

*{ box-sizing:border-box; }

body{
  margin:0;
  background:
    radial-gradient(circle at top, rgba(255, 248, 230, 0.75), transparent 35%),
     linear-gradient(180deg, #f8f0dd 0%, #d3bd95 100%);
  color:var(--ink);
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
}

.page{
  max-width:1200px;
  margin:0 auto;
  padding:24px 24px 36px;
  color:var(--ink);
}

.raceHeader{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:18px;
  margin-bottom:20px;
  padding:18px;
  background: linear-gradient(180deg, var(--cream), var(--tan));
  border: 1px solid rgba(93, 88, 63, 0.08);
  border-radius:28px;
  box-shadow: 0 16px 32px rgba(95, 70, 48, 0.08);
  flex-wrap:wrap;
}

.raceTitle{
  display:flex;
  align-items:center;
  gap:12px;
  font-size:28px;
  font-weight:900;
  color:var(--ink);
}

.raceIcon{ font-size:30px; }

.raceProgress{
  display:flex;
  gap:16px;
  flex:1;
  max-width:520px;
}

.raceTeam{ flex:1; }

.raceTeamLabel{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:8px;
  font-size:12px;
}

.teamBadge{
  padding:6px 10px;
  border-radius:999px;
  font-weight:800;
  background: rgba(255, 253, 244, 0.78);
  border: 1px solid rgba(107, 79, 52, 0.18);
  color: var(--ink);
}

.teamBadge.you{
  background: linear-gradient(180deg, #f3e2b7, #ead4a2);
  border-color: rgba(107, 79, 52, 0.24);
  color: #6b4a33;
}

.raceCount{
  font-weight:900;
  color:var(--brown-dark);
}

.raceBar{
  height:14px;
  background: rgba(255,255,255,0.55);
  border: 1px solid rgba(107, 79, 52, 0.18);
  border-radius:999px;
  overflow:hidden;
}

.raceBarFill{
  height:100%;
  border-radius:999px;
  transition: width 0.3s ease;
}

.raceBarFill.teamA{
  background: linear-gradient(90deg, var(--teamA-dark), var(--teamA));
  box-shadow: 0 0 10px rgba(111, 143, 79, 0.25);
}

.raceBarFill.teamB{
  background: linear-gradient(90deg, var(--teamB-dark), var(--teamB));
  box-shadow: 0 0 10px rgba(143, 114, 193, 0.22);
}

.grid2{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:18px;
}

@media (max-width: 980px){
  .grid2{ grid-template-columns:1fr; }
  .raceProgress{ flex-direction:column; gap:10px; }
}

.card{
  border: 1px solid rgba(93, 88, 63, 0.08);
  background: linear-gradient(180deg, var(--cream), var(--tan));
  border-radius:28px;
  box-shadow: 0 16px 32px rgba(95, 70, 48, 0.08);
}

.yourTeamCard{
  box-shadow: 0 16px 32px rgba(180, 149, 220, 0.12);
}

.opponentCard{
  opacity: 0.96;
}

.coinsEarned{
  margin-top: 10px;
  font-size: 22px;
  font-weight: 900;
  color: #b8892d;
}
  
.cardTop{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:16px 18px 12px;
  border-bottom:1px solid rgba(107, 79, 52, 0.16);
}

.cardTitle{
  font-weight:900;
  color:var(--ink);
  font-size:24px;
}

.cardBody{
  padding:16px;
}

.questionSection{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  margin-bottom:16px;
}

.question{
  font-size:34px;
  font-weight:900;
  letter-spacing:.2px;
  color:var(--brown-dark);
}

.opponentQuestion{
  font-size:26px;
  opacity:0.9;
}

.correctCounter{
  display:flex;
  align-items:center;
  gap:4px;
  padding:8px 14px;
  background: rgba(147, 185, 107, 0.18);
  border: 1px solid rgba(111, 143, 79, 0.25);
  border-radius:14px;
}

.correctCounter.opponent{
  background: rgba(180, 149, 220, 0.16);
  border-color: rgba(143, 114, 193, 0.22);
}

.correctIcon{ color: var(--teamA-dark); font-weight: 800; }
.correctNum{ font-size:24px; font-weight:900; color: var(--teamA-dark); }
.correctCounter.opponent .correctNum{ color: var(--teamB-dark); }
.correctTotal{ font-size:14px; color: var(--muted); }

.input{
  width:100%;
  background:#fffdf5;
  color:var(--ink);
  border:1px solid rgba(107, 79, 52, 0.2);
  border-radius:14px;
  padding:12px 14px;
  font-size:20px;
  font-weight:700;
  text-align:center;
  outline:none;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.55);
}

.input:focus{
  border-color: rgba(107, 79, 52, 0.45);
  box-shadow: 0 0 0 3px rgba(207, 162, 95, 0.14);
}

.input:disabled{
  opacity:0.5;
}

.hint{
  font-size:12px;
  text-align:center;
  margin-top:12px;
  color:var(--muted);
}

.digitHint{
  font-size:13px;
  text-align:center;
  padding:8px 12px;
  background: rgba(255,255,255,0.35);
  border: 1px solid rgba(107, 79, 52, 0.12);
  border-radius:14px;
  margin-bottom:12px;
  color:var(--muted);
}

.digitSlots{
  display:grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap:12px;
}

.slot{
  border: 1px solid rgba(93, 88, 63, 0.08);
  border-radius:18px;
  background: linear-gradient(180deg, var(--cream-2), var(--base));
  padding:12px;
  min-height:100px;
  display:flex;
  flex-direction:column;
  box-shadow: 0 10px 18px rgba(107, 79, 52, 0.06);
}

.slot.yourSlot{
  border-color: rgba(180, 149, 220, 0.45);
  background: linear-gradient(180deg, #f4ecfb, #e7d8f8);
}

.slot.autoFilledSlot{
  border-color: rgba(147, 185, 107, 0.35);
  background: linear-gradient(180deg, #eef6e4, #dce9c8);
}

.slotTop{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:10px;
}

.slotTitle{
  font-weight:900;
  letter-spacing:.3px;
  font-size:13px;
  color:var(--brown-dark);
}

.slotDigit{
  font-size:36px;
  font-weight:900;
  text-align:center;
  color:var(--brown-dark);
  flex:1;
  display:flex;
  align-items:center;
  justify-content:center;
}

.slotInput{
  font-size:28px !important;
  font-weight:900 !important;
  text-align:center !important;
  padding:8px !important;
  height:auto !important;
  flex:1;
}

.slotInput:disabled{
  opacity:0.5;
}

.pill{
  font-size:11px;
  padding:4px 8px;
  border-radius:999px;
  border: 1px solid rgba(107, 79, 52, 0.18);
  color: var(--muted);
  background: rgba(255, 253, 244, 0.78);
}

.pill.code{
  background: linear-gradient(180deg, #efe3ff, #dcc7f5);
  border-color: rgba(143, 114, 193, 0.28);
  color: var(--teamB-dark);
}

.pill.good{
  background: linear-gradient(180deg, #edf6df, #d6e8b6);
  border-color: rgba(111, 143, 79, 0.28);
  color: var(--teamA-dark);
}

.btn{
  border:1px solid transparent;
  border-radius:16px;
  padding:12px 16px;
  font-weight:800;
  cursor:pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.btn:hover{
  transform: translateY(-1px);
}

.btn.primary{
  background: linear-gradient(180deg, #f0cf64, #d6ae38);
  color:#5a4224;
  box-shadow: 0 10px 18px rgba(190, 150, 54, 0.22);
}

.userQuick{
  display:flex;
  gap:10px;
  align-items:center;
  padding:10px 12px;
  border-radius:18px;
  border: 1px solid rgba(93, 88, 63, 0.08);
  background: rgba(255, 253, 244, 0.75);
}

.quickAvatar{
  width:42px;
  height:42px;
  border-radius:12px;
  display:grid;
  place-items:center;
  background:#fffdf4;
  border: 1px solid rgba(93, 88, 63, 0.08);
  font-weight:800;
  overflow:hidden;
  color:var(--brown-dark);
}

.quickAvatar img{
  width:100%;
  height:100%;
  object-fit:cover;
}

.quickInfo{
  display:flex;
  flex-direction:column;
  gap:2px;
}

.quickUsername{
  font-weight:700;
  font-size:14px;
  color:var(--ink);
}

.quickPoints{
  font-size:12px;
  color:var(--muted);
}

.code{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas;
  background: linear-gradient(180deg, #f3e2b7, #ead4a2);
  border:1px solid rgba(107, 79, 52, 0.24);
  padding:4px 8px;
  border-radius:10px;
  font-size:14px;
  color:#6b4a33;
}

.muted{
  color:var(--muted);
}

.gameOverBanner{
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(76, 56, 38, 0.45);
  backdrop-filter: blur(6px);
  z-index: 1000;
  display: grid;
  place-items: center;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.gameOverContent{
  text-align:center;
  padding:40px;
  border-radius:28px;
  border: 1px solid rgba(93, 88, 63, 0.08);
  background: linear-gradient(180deg, var(--cream), var(--tan));
  box-shadow: 0 20px 60px rgba(95, 70, 48, 0.18);
  max-width:520px;
  animation: slideUp 0.4s ease;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.gameOverTitle{
  font-size:48px;
  font-weight:900;
  margin:0 0 12px 0;
  color:var(--brown-dark);
}

.gameOverSubtitle{
  font-size:18px;
  color:var(--muted);
  margin-bottom:30px;
}

.gameOverStats{
  display:flex;
  gap:20px;
  justify-content:center;
  margin-bottom:10px;
}

.statBox{
  padding:20px;
  border-radius:18px;
  border: 1px solid rgba(93, 88, 63, 0.08);
  background: rgba(255, 253, 244, 0.75);
  min-width:140px;
}

.statLabel{
  font-size:14px;
  color:var(--muted);
  margin-bottom:8px;
}

.statValue{
  font-size:32px;
  font-weight:900;
  color:var(--brown-dark);
}

.statTime{
  font-size:14px;
  color:var(--teamA-dark);
  margin-top:4px;
  font-weight:700;
}

.pointsUpdate{
  margin-top:24px;
  font-size:28px;
  font-weight:900;
}

.pointsGained{
  color:var(--teamA-dark);
}

.pointsLost{
  color:var(--bad);
}

.forfeitOverlay{
  position: fixed;
  inset: 0;
  background: rgba(76, 56, 38, 0.45);
  backdrop-filter: blur(4px);
  z-index: 1200;
  display: grid;
  place-items: center;
}

.forfeitModal{
  width: min(92vw, 420px);
  padding: 24px;
  border-radius: 24px;
  border: 1px solid rgba(93, 88, 63, 0.08);
  background: linear-gradient(180deg, var(--cream), var(--tan));
  box-shadow: 0 20px 60px rgba(95, 70, 48, 0.18);
}

.forfeitTitle{
  font-size: 24px;
  font-weight: 900;
  margin-bottom: 10px;
  color: var(--brown-dark);
}

.forfeitText{
  color: var(--muted);
  margin-bottom: 18px;
}

.forfeitActions{
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.forfeitBtn{
  border: 1px solid transparent;
  border-radius: 14px;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
}

.forfeitBtn.cancel{
  background: linear-gradient(180deg, #fffaf0, #efe5cf);
  border-color: rgba(166, 134, 93, 0.22);
  color: #5a4028;
}

.forfeitBtn.confirm{
  background: linear-gradient(180deg, #e29b8a, #c97a6b);
  color: #fff8f2;
}
`}</style>
    </div>
  );
}