import React from "react";

export function Card({ title, children, right }) {
  return (
    <div className="card">
      <div className="cardTop">
        <div>
          <div className="cardTitle">{title}</div>
        </div>
        {right}
      </div>
      <div className="cardBody">{children}</div>
    </div>
  );
}

export function Pill({ children, tone = "neutral" }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export function Button({ children, variant = "primary", ...props }) {
  return (
    <button className={`btn ${variant}`} {...props}>
      {children}
    </button>
  );
}

export function Input(props) {
  return <input className="input" {...props} />;
}

export function Select({ children, ...props }) {
  return <select className="select" {...props}>{children}</select>;
}

export function PlayerRow({ p, isHost, isYou }) {
  return (
    <div className="playerRow">
      <div className="playerLeft">
        <div className="avatar">{p.name?.[0]?.toUpperCase() ?? "?"}</div>
        <div className="playerMeta">
          <div className="playerName">
            {p.name} {isYou && <span className="muted">(you)</span>}
          </div>
          <div className="muted">
            {isHost ? "Host" : "Player"} • Score: {p.score}
          </div>
        </div>
      </div>
      <div className="playerRight">
        <Pill tone={p.ready ? "good" : "neutral"}>{p.ready ? "Ready" : "Not ready"}</Pill>
      </div>
    </div>
  );
}

export function ProgressBar({ pct }) {
  return (
    <div className="bar">
      <div className="barFill" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}
