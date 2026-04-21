import React from "react";

export default function PublicLobby({
  totalUsersOnline = 0,
  isOpen = false,
  onToggle,
}) {
  return (
    <div className="publicLobbyInline">
      <span className="connectionDot online" />
      <span className="publicLobbyText">
        {totalUsersOnline.toLocaleString()} online in game
      </span>

      <button
        type="button"
        className="publicLobbyActionBtn"
        onClick={onToggle}
      >
        {isOpen ? "✕" : "→"}
      </button>
    </div>
  );
}