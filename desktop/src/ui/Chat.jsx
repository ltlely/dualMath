import React, { useMemo, useState } from "react";

export default function Chat({
  room,
  selfId,
  chat = [],
  onSend,
  maxLength = 180,
}) {
  const [text, setText] = useState("");

  const me = useMemo(() => {
    return (room?.players || []).find((player) => player.id === selfId) || null;
  }, [room?.players, selfId]);

  const canChat = !!room?.roomCode && !!selfId && !!me;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!canChat || !trimmed) return;

    onSend?.(trimmed);
    setText("");
  };

  const handleKeyDown = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

  return (
    <div className="roomChatCard">
      <div className="roomChatHeader">
        <div>
          <div className="roomChatEyebrow">Room Chat</div>
          <h3 className="roomChatTitle">Players Only</h3>
        </div>
        {/* <div className="roomChatCount">{chat.length}</div> */}
      </div>

      <div className="roomChatMessages">
        {!canChat ? (
          <div className="roomChatEmpty">
            Join the room to use chat.
          </div>
        ) : chat.length === 0 ? (
          <div className="roomChatEmpty">
            No messages yet. Say hi ✨
          </div>
        ) : (
          chat.map((message, index) => {
  const senderId = String(message?.senderId || "");
  const mineId = String(selfId || "");
  const isMine = senderId === mineId;

  const senderPlayer = (room?.players || []).find(
    (player) => String(player.id) === senderId
  );

  const senderName =
    isMine
      ? "You"
      : message?.sender ||
        senderPlayer?.name ||
        senderPlayer?.username ||
        "Player";

  return (
    <div
      key={message?.id || `${senderId}-${index}-${message?.text || ""}`}
      className={`roomChatBubble ${isMine ? "mine" : "theirs"}`}
    >
      <div className="roomChatMetaRow">
        <div className="roomChatSender">{senderName}</div>
        <div className="roomChatTime">{formatTime(message?.createdAt)}</div>
      </div>

      <div className="roomChatText">{message?.text || ""}</div>
    </div>
  );
})
        )}
      </div>

      <div className="roomChatComposer">
  <textarea
    className="roomChatInput"
    value={text}
    onChange={(e) => setText(e.target.value.slice(0, maxLength))}
    onKeyDown={handleKeyDown}
    placeholder={
      canChat
        ? "Press Enter to send..."
        : "Only players inside this room can chat"
    }
    rows={2}
    disabled={!canChat}
  />
</div>

      <style>{`

.roomChatMetaRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.roomChatTime {
  font-size: 10px;
  line-height: 1;
  opacity: 0.7;
  white-space: nowrap;
}
  .roomChatCard {
    width: 100%;
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding: 6px 8px;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    overflow: hidden;
  }

  .roomChatHeader {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 6px;
    flex-shrink: 0;
  }

  .roomChatEyebrow {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: #b28352;
    margin-bottom: 2px;
    line-height: 1;
  }

  .roomChatTitle {
    margin: 0;
    font-size: 14px;
    color: #bd8a57;
    line-height: 1.1;
  }

  .roomChatCount {
    min-width: 24px;
    height: 24px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: rgba(224, 171, 63, 0.16);
    color: #7a532c;
    font-weight: 800;
    font-size: 11px;
    flex-shrink: 0;
  }

 .roomChatMessages {
  flex: 1;
  min-height: 180px;
  overflow: hidden;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 16px;
}

  .roomChatEmpty {
    flex: 1;
    min-height: 0;
    display: grid;
    place-items: center;
    border-radius: 14px;
    border: none;
    color: #9b7758;
    text-align: center;
    padding: 10px;
    background: transparent;
    box-sizing: border-box;
    font-size: 12px;
  }

  .roomChatBubble {
    max-width: 82%;
    padding: 8px 10px;
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    box-shadow: none;
  }

  .roomChatBubble.mine {
    align-self: flex-end;
    background: linear-gradient(180deg, #c79652, #a46f38);
    color: #fff9ef;
    border-bottom-right-radius: 6px;
  }

  .roomChatBubble.theirs {
    align-self: flex-start;
    background: rgba(255, 255, 255, 0.55);
    color: #6b4520;
    border: none;
    border-bottom-left-radius: 6px;
  }

  .roomChatSender {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.04em;
    opacity: 0.82;
    line-height: 1;
  }

  .roomChatText {
    font-size: 13px;
    line-height: 1.35;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .roomChatComposer {
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }

  .roomChatInput {
    width: 100%;
    min-height: 36px;
    height: 36px;
    max-height: 36px;
    resize: none;
    border-radius: 12px;
    border: none !important;
    background: rgba(255, 255, 255, 0.55) !important;
    color: #6b4520;
    padding: 9px 12px;
    font-size: 12px;
    line-height: 1.2;
    outline: none;
    box-sizing: border-box;
    box-shadow: none !important;
    overflow: hidden;
  }

  .roomChatInput::placeholder {
    color: rgba(255, 255, 255, 0.89);
  }

  .roomChatActions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 18px;
    background: transparent;
  }

  .roomChatLimit {
    font-size: 10px;
    color: #9b7758;
    font-weight: 700;
    line-height: 1;
  }

  .roomChatSendBtn {
    border: none;
    border-radius: 10px;
    padding: 4px 10px;
    min-height: 22px;
    background: linear-gradient(180deg, #c79652 0%, #9b6a37 100%);
    color: #fffaf0;
    font-weight: 800;
    font-size: 10px;
    cursor: pointer;
    box-shadow: none;
    line-height: 1;
  }

  .roomChatSendBtn:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`}</style>
    </div>
  );
}