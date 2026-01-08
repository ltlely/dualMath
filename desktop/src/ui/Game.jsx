import React, { useEffect, useMemo, useRef, useState } from "react";

// Simple UI Components
function Card({ title, children }) {
  return (
    <div className="card">
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

function ProgressBar({ pct }) {
  return (
    <div className="bar">
      <div className="barFill" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export default function Game({
  room, selfId,
  roundInfo, // { round, question, endsAt, roundMs }
  lastRound, // { correct, results }
  onDigit,
  onSubmit,
  onChatSend,
  chat,
  currentUser,
}) {

  const [now, setNow] = useState(Date.now());
  const [chatText, setChatText] = useState("");
  const [localTens, setLocalTens] = useState(null);
  const [localOnes, setLocalOnes] = useState(null);
  const tickRef = useRef(null);

  const playersSorted = useMemo(() => {
    const ps = [...(room?.players ?? [])];
    ps.sort((a, b) => b.score - a.score);
    return ps;
  }, [room]);

  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(tickRef.current);
  }, []);

  const pct = useMemo(() => {
    if (!roundInfo?.endsAt || !roundInfo?.roundMs) return 0;
    const remaining = roundInfo.endsAt - now;
    return (remaining / roundInfo.roundMs) * 100;
  }, [roundInfo, now]);

  const qText = roundInfo?.question
    ? `${roundInfo.question.a} ${roundInfo.question.op} ${roundInfo.question.b} = ?`
    : "Waiting for round...";

  const me = (room?.players ?? []).find(p => p.id === selfId);
  const myTeam = me?.team;          // "A" or "B"
  const mySlot = me?.slot;          // 0 or 1
  const teamDigits = room?.state?.teamDigits?.[myTeam] || null;

  const getCorrectCount = (teamKey) => {
    const padded = String(room?.state?.correct ?? '0').padStart(4, '0');
    const expT = Number(padded[2]); const expO = Number(padded[3]);
    const tDig = room?.state?.teamDigits?.[teamKey] || {};
    return (tDig.tens === expT ? 1 : 0) + (tDig.ones === expO ? 1 : 0);
  };

  const getCorrectPct = (teamKey) => (getCorrectCount(teamKey) / 2) * 100;

  const otherTeam = myTeam ? (myTeam === 'A' ? 'B' : 'A') : 'B';
  const otherDigits = room?.state?.teamDigits?.[otherTeam] || {}; 

  useEffect(() => {
    // clear temporary inputs when round changes
    setLocalTens(null);
    setLocalOnes(null);
  }, [roundInfo?.round]);

  function submitDigits(tensVal, onesVal) {
    // use onSubmit to send the combined answer to the server (player pressed Enter)
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

  return (
    <div className="page">
      <div className="topBar">
        <div className="roomTitle">
            
          
            Round {roundInfo?.round ?? 0}/{room?.state?.totalRounds ?? 0}
            <span className="code">{room?.roomCode}</span>
        </div>

        <div className="row">
            <span className="pill good">Team A: {room?.teams?.A?.score ?? 0} • {room?.state?.teamStats?.A?.correctCount ?? 0}/{room?.state?.targetCorrect ?? 10}{room?.state?.teamStats?.A?.timeToTarget ? ` • ${Math.round(room.state.teamStats.A.timeToTarget / 100)/10}s` : ''}</span>
            <span className="pill neutral">Team B: {room?.teams?.B?.score ?? 0} • {room?.state?.teamStats?.B?.correctCount ?? 0}/{room?.state?.targetCorrect ?? 10}{room?.state?.teamStats?.B?.timeToTarget ? ` • ${Math.round(room.state.teamStats.B.timeToTarget / 100)/10}s` : ''}</span>
        </div>

        {currentUser && (
          <div className="userQuick">
            <div className="quickAvatar">
              {currentUser?.avatarData ? (
                <img src={currentUser.avatarData} alt="Avatar" />
              ) : (
                currentUser?.email?.[0]?.toUpperCase() ?? "?"
              )}
            </div>
            <div className="quickInfo">
              <div className="quickUsername">@{currentUser?.username}</div>
              <div className="quickPoints">{currentUser?.points ?? 0} points</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid2">
        {/* CARD 1: Question */}
        <Card title="Your Team">
          <div className="question" style={{ position: 'relative' }}>{qText}
            {/* stamp overlay for your team after round ends */}
            {lastRound && myTeam && lastRound.built && typeof lastRound.built[myTeam] !== 'undefined' && (
              <div className={`bigStamp ${lastRound.built[myTeam] === lastRound.correct ? 'correct' : 'incorrect'}`}>
                <div className="stampInner">{lastRound.built[myTeam] === lastRound.correct ? 'Correct' : 'Incorrect'}</div>
              </div>
            )}
          </div>
          <ProgressBar pct={pct} />
          <div className="stack" style={{ gap: 6 }}>
            <div className="muted">Digits {(String(room?.state?.correct ?? "")).length === 4 ? '(thousands+hundreds auto)' : (String(room?.state?.correct ?? "")).length === 3 ? '(hundreds auto)' : ''}</div>

            <div className="row" style={{ gap: 8 }}>
              {String(room?.state?.correct ?? "").length === 4 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="label">Thousands (auto)</div>
                  <Input value={(teamDigits?.thousands ?? "") + ""} disabled={true} />
                </div>
              )}

              {(String(room?.state?.correct ?? "").length >= 3) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="label">Hundreds (auto)</div>
                  <Input value={(teamDigits?.hundreds ?? "") + ""} disabled={true} />
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="label">Tens {mySlot === 0 ? "(you)" : ""} {teamDigits?.lockedTens ? "🔒" : ""}</div>
                <Input
                  value={(localTens ?? teamDigits?.tens ?? "") + ""}
                  disabled={!(myTeam && mySlot === 0) || !roundInfo?.endsAt || teamDigits?.lockedTens}
                  inputMode="numeric"
                  maxLength={1}
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

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="label">Ones {mySlot === 1 ? "(you)" : ""} {teamDigits?.lockedOnes ? "🔒" : ""}</div>
                <Input
                  value={(localOnes ?? teamDigits?.ones ?? "") + ""}
                  disabled={!(myTeam && mySlot === 1) || !roundInfo?.endsAt || teamDigits?.lockedOnes}
                  inputMode="numeric"
                  maxLength={1}
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
          </div>

          {lastRound?.winner && (
            <div className={`toast ${lastRound.winner === 'A' ? 'good' : lastRound.winner === 'B' ? 'neutral' : ''}`} style={{ marginTop: 12 }}>
              Match Winner: <b>{lastRound.winner === 'tie' ? 'Tie' : `Team ${lastRound.winner}`}</b>
            </div>
          )}
        </Card>

        {/* CARD 2: Opponent Team View */}
        <Card title={`Team ${otherTeam} (Opponent)`}>
          <div className="question" style={{ position: 'relative' }}>{qText}</div>
          <ProgressBar pct={pct} />
          <div className="stack" style={{ gap: 6 }}>
            <div className="muted">Opponent's digits (read-only) {(String(room?.state?.correct ?? "")).length === 4 ? '(thousands+hundreds auto)' : (String(room?.state?.correct ?? "")).length === 3 ? '(hundreds auto)' : ''}</div>

            <div className="row" style={{ gap: 8 }}>
              {String(room?.state?.correct ?? "").length === 4 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="label">Thousands (auto)</div>
                  <Input value={(otherDigits?.thousands ?? "") + ""} disabled={true} />
                </div>
              )}

              {(String(room?.state?.correct ?? "").length >= 3) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="label">Hundreds (auto)</div>
                  <Input value={(otherDigits?.hundreds ?? "") + ""} disabled={true} />
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="label">Tens {otherDigits?.lockedTens ? "🔒" : ""} {otherDigits?.whoTens ? "✍️" : ""}</div>
                <Input
                  value={(otherDigits?.tens ?? "") + ""}
                  disabled={true}
                  style={{
                    background: otherDigits?.whoTens ? 'rgba(124,92,255,.15)' : 'var(--card2)',
                    borderColor: otherDigits?.whoTens ? 'rgba(124,92,255,.5)' : 'var(--line)'
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="label">Ones {otherDigits?.lockedOnes ? "🔒" : ""} {otherDigits?.whoOnes ? "✍️" : ""}</div>
                <Input
                  value={(otherDigits?.ones ?? "") + ""}
                  disabled={true}
                  style={{
                    background: otherDigits?.whoOnes ? 'rgba(124,92,255,.15)' : 'var(--card2)',
                    borderColor: otherDigits?.whoOnes ? 'rgba(124,92,255,.5)' : 'var(--line)'
                  }}
                />
              </div>
            </div>

            {otherDigits?.submittedValue !== null && otherDigits?.submittedValue !== undefined && (
              <div className="toast good" style={{ marginTop: 6 }}>
                Submitted: <b>{otherDigits.submittedValue}</b> {(() => {
                  const submitter = (room?.players ?? []).find(x => x.id === otherDigits.submittedBy);
                  return submitter ? `by ${submitter.name}` : '';
                })()}
                {otherDigits.submittedAt && (Date.now() - otherDigits.submittedAt < 3500) && <span> 🔥 just now</span>}
              </div>
            )}
          </div>
        </Card>
      </div>

      {lastRound?.results && (
        <div className="resultsBar">
          {lastRound.results.map(r => {
            const p = (room?.players ?? []).find(x => x.id === r.id) || {};
            const t = p.team;
            const builtVal = lastRound.built?.[t];
            const isCorrect = builtVal === lastRound.correct;
            return (
              <div key={r.id} className={`resultChip ${isCorrect ? 'good' : 'bad'}`}>
                <b>{r.name}</b> Team {t ?? '—'} answered <span className="code">{builtVal ?? '—'}</span> {isCorrect ? '✅' : '❌'}
              </div>
            );
          })}
        </div>
      )}

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
.hero{ display:flex; flex-direction:column; gap:6px; margin:8px 0 18px; }
.logo{ font-size:28px; font-weight:800; letter-spacing:.2px; }
.subtitle{ color:var(--muted); }

.grid2{ display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.grid3{ display:grid; grid-template-columns: 1.4fr 1fr 1fr; gap:14px; }
@media (max-width: 980px){
  .grid2,.grid3{ grid-template-columns:1fr; }
}

.card{
  border:1px solid var(--line);
  background: linear-gradient(180deg, rgba(255,255,255,.03), transparent), var(--card);
  border-radius:16px;
  box-shadow: 0 10px 30px rgba(0,0,0,.25);
}
.cardTop{
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 14px 10px;
  border-bottom:1px solid rgba(38,38,74,.7);
}
.cardTitle{ font-weight:700; }
.cardBody{ padding:14px; }

.topBar{
  display:flex; align-items:center; justify-content:space-between;
  margin:6px 0 14px;
  gap:12px;
}
.roomTitle{ display:flex; align-items:center; gap:10px; font-weight:700; }
.code{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas;
  background: rgba(124,92,255,.15);
  border:1px solid rgba(124,92,255,.35);
  padding:4px 8px;
  border-radius:10px;
}
.topActions{ display:flex; gap:10px; }

.stack{ display:flex; flex-direction:column; gap:10px; }
.row{ display:flex; gap:10px; align-items:center; }
.col{ flex:1; min-width:140px; }
.label{ font-size:12px; color:var(--muted); margin-bottom:6px; }

.input, .select{
  width:100%;
  background: var(--card2);
  color: var(--text);
  border:1px solid var(--line);
  border-radius:12px;
  padding:10px 12px;
  outline:none;
}
.input:focus, .select:focus{ border-color: rgba(124,92,255,.6); box-shadow: 0 0 0 3px rgba(124,92,255,.15); }

.btn{
  border:1px solid transparent;
  border-radius:12px;
  padding:10px 14px;
  font-weight:650;
  cursor:pointer;
}
.btn.primary{ background: var(--accent); color:#0b0b12; }
.btn.secondary{ background: transparent; border-color: var(--line); color: var(--text); }
.btn:disabled{ opacity:.55; cursor:not-allowed; }

.pill{
  font-size:12px;
  padding:5px 10px;
  border-radius:999px;
  border:1px solid var(--line);
  color: var(--muted);
  background: rgba(255,255,255,.02);
}
.pill.good{
  border-color: rgba(45,212,191,.45);
  color: rgba(45,212,191,.9);
  background: rgba(45,212,191,.08);
}
.pill.neutral{
  border-color: rgba(154,160,195,.35);
}

.playerRow{
  display:flex; justify-content:space-between; align-items:center;
  padding:10px; border:1px solid rgba(38,38,74,.6); border-radius:14px;
  background: rgba(255,255,255,.02);
}
.playerLeft{ display:flex; gap:10px; align-items:center; }
.avatar{
  width:36px; height:36px; border-radius:12px;
  display:grid; place-items:center;
  background: rgba(124,92,255,.18);
  border:1px solid rgba(124,92,255,.35);
  font-weight:800;
}
.playerName{ font-weight:700; }
.muted{ color: var(--muted); }

.question{
  font-size:28px; font-weight:900;
  letter-spacing:.3px;
  margin-bottom:12px;
}

.bar{
  height:10px;
  background: rgba(255,255,255,.06);
  border:1px solid rgba(38,38,74,.7);
  border-radius:999px;
  overflow:hidden;
}
.barFill{
  height:100%;
  background: linear-gradient(90deg, rgba(45,212,191,.9), rgba(124,92,255,.9));
}

.toast{
  margin-top:14px;
  padding:10px 12px;
  border-radius:14px;
  border:1px solid rgba(38,38,74,.7);
  background: rgba(255,255,255,.03);
}
.toast.bad{ border-color: rgba(251,113,133,.5); background: rgba(251,113,133,.08); }
.toast.neutral{ border-color: rgba(124,92,255,.35); background: rgba(124,92,255,.08); }
.toast.good{ border-color: rgba(45,212,191,.45); background: rgba(45,212,191,.08); }

.scoreRow{
  display:flex; justify-content:space-between; align-items:center;
  padding:10px; border:1px solid rgba(38,38,74,.6); border-radius:14px;
  background: rgba(255,255,255,.02);
}
.scoreLeft{ display:flex; gap:10px; align-items:center; }
.rank{
  width:26px; height:26px; border-radius:10px;
  display:grid; place-items:center;
  border:1px solid rgba(38,38,74,.7);
  color: var(--muted);
  font-weight:800;
}
.score{ font-weight:900; }

.chatBox{
  height:240px;
  overflow:auto;
  padding:10px;
  border-radius:14px;
  border:1px solid rgba(38,38,74,.6);
  background: rgba(0,0,0,.15);
}
.chatMsg{ padding:6px 0; border-bottom:1px dashed rgba(38,38,74,.45); }
.chatFrom{ color: rgba(45,212,191,.9); font-weight:800; }

.resultsBar{
  margin-top:14px;
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}
.resultChip{
  padding:8px 10px;
  border-radius:999px;
  border:1px solid rgba(38,38,74,.7);
  background: rgba(255,255,255,.03);
}
.hint{ margin-top:10px; }

.teamGrid{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap:12px;
}
.slot{
  border:1px solid rgba(38,38,74,.6);
  border-radius:14px;
  background: rgba(255,255,255,.02);
  padding:12px;
  min-height:120px;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
}
.tableRow{ padding:6px 8px; border-radius:8px; }
.tableRow.header{ font-weight:700; opacity:0.95; }
.tableRow:not(.header):hover{ background: rgba(255,255,255,.02); }
.slotTop{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:10px;
}
.slotTitle{
  font-weight:900;
  letter-spacing:.4px;
}
.slotPlayer{
  display:flex;
  gap:10px;
  align-items:center;
}
.slotName{ font-weight:800; }
.slotEmpty{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
}

.resultChip.good{ border-color: rgba(45,212,191,.45); background: rgba(45,212,191,.06); color: rgba(45,212,191,.9); }
.resultChip.bad{ border-color: rgba(251,113,133,.45); background: rgba(251,113,133,.06); color: rgba(251,113,133,.9); }

.bigStamp{ position:absolute; left:50%; top:48%; transform:translate(-50%,-50%); width:220px; height:220px; border-radius:999px; display:grid; place-items:center; border:10px solid rgba(255,255,255,.12); box-shadow: 0 12px 40px rgba(0,0,0,.5); opacity:0.98; }
.bigStamp .stampInner{ font-weight:900; font-size:44px; letter-spacing:1px; line-height:1; }
.bigStamp.correct{ background: rgba(45,212,191,.06); color: rgba(45,212,191,.95); border-color: rgba(45,212,191,.4); }
.bigStamp.incorrect{ background: rgba(251,113,133,.06); color: rgba(251,113,133,.95); border-color: rgba(251,113,133,.4); }

.playerChip{ display:flex; flex-direction:column; align-items:center; width:88px; padding:8px; border-radius:8px; background: rgba(255,255,255,.02); border:1px solid rgba(38,38,74,.6); }
.playerChip .avatar{ width:44px; height:44px; border-radius:10px; display:grid; place-items:center; background: rgba(124,92,255,.18); border:1px solid rgba(124,92,255,.35); font-weight:800; }

.liveTable{ margin-top:8px; border-radius:12px; overflow:hidden; border:1px solid rgba(38,38,74,.6); background: linear-gradient(180deg, rgba(255,255,255,.01), transparent); }
.liveTable .tableRow{ padding:10px 12px; display:grid; gap:8px; align-items:center; }
.liveTable .tableRow.header{ font-weight:800; color:var(--text); background: rgba(255,255,255,.02); }
.liveTable .tableRow:not(.header){ border-top:1px solid rgba(38,38,74,.4); }
.teamSlot{ display:inline-block; padding:6px 8px; border-radius:8px; border:1px solid rgba(38,38,74,.6); font-weight:800; width:56px; text-align:center; }
.digitCell{ text-align:center; font-weight:800; }
.liveTable .mutedSmall{ color:var(--muted); font-size:12px; }
      `}</style>
    </div>
  );
}