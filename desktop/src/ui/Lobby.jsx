import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Card } from "./components.jsx";
import Auth from "./Auth.jsx";
import { userManager } from "../userManagerSupabase.js";
import {
  getRankProgress,
  getNextRank,
  getPointsToNextRank,
  getWinPoints,
  getLossPoints,
} from "../rankingSystem.js";
// import { userManager } from "../userManagerSupabase.js";
import Game from "./Game.jsx";
import settingsIcon from '../../public/settingsicon.png'
import noviceApprenticeRank from "/noviceApprenticeRank.png";
import skilledRank from "/skilledRank.png";
import professionalRank from "/professionalRank.png";
import expertRank from "/expertRank.png";
import kingRank from "/kingRank.png";

const rankImages = {
  "Novice Apprentice": noviceApprenticeRank,
  Skilled: skilledRank,
  Professional: professionalRank,
  Expert: expertRank,
  King: kingRank,
};

function getRankImage(rank) {
  return rankImages[rank] || noviceApprenticeRank;
}

export default function Lobby({
  onCreate,
  onJoin,
  onJoinRandom,
  onOpenStore,
  error,
  currentUser,
  onLoginSuccess,
  isConnected,
  onOpenGame,
  setTestRankOverride,
  testRankOverride,
  onOpenPickCharacter,
   onOpenRank,
   onOpenFriends,
   friendChatBadgeCount = 0,
    friends = [],
     setIsOnlineFriendsScrolling,
}) {

  const [settingsTab, setSettingsTab] = useState("account");
const [settingsEmail, setSettingsEmail] = useState(currentUser?.email || "");
const [newUsername, setNewUsername] = useState(currentUser?.username || "");
const [settingsMessage, setSettingsMessage] = useState("");
const [settingsError, setSettingsError] = useState("");
const [isSendingReset, setIsSendingReset] = useState(false);
const [isSavingUsername, setIsSavingUsername] = useState(false);

  const [roomName, setRoomName] = useState("");
  const [code, setCode] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [isJoiningRandom, setIsJoiningRandom] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
const queueSectionRef = useRef(null);
const [, setPresenceTick] = useState(0);

   


useEffect(() => {
  const interval = setInterval(() => {
    setPresenceTick((tick) => tick + 1);
  }, 5000);

  return () => clearInterval(interval);
}, []);

 const { stats, rankProgress, nextRank, pointsToNext } = useMemo(() => {
  let calculatedStats = {
    rank: "Novice",
    rankPoints: 0,
    wins: 0,
    losses: 0,
    totalGames: 0,
    winRate: 0,
  };
  let calculatedProgress = 0;
  let calculatedNextRank = null;
  let calculatedPointsToNext = 0;

  if (currentUser) {
    try {
      const baseStats = userManager.getUserStats(currentUser) || calculatedStats;
      const rankPoints = currentUser?.rankPoints || 0;

      calculatedStats = {
        ...baseStats,
        rank: userManager.getUserRank(currentUser),
        rankPoints,
      };

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
    pointsToNext: calculatedPointsToNext,
  };
}, [currentUser, currentUser?.wins, currentUser?.losses, currentUser?.rankPoints]);


useEffect(() => {
  if (!currentUser?.id) return;

  userManager.refreshPresence(currentUser.id);

  const heartbeatInterval = setInterval(() => {
    userManager.refreshPresence(currentUser.id);
  }, 15000);

  const handleBeforeUnload = () => {
    userManager.updateStatus(currentUser.id, "offline");
  };

  window.addEventListener("beforeunload", handleBeforeUnload);

  return () => {
    clearInterval(heartbeatInterval);
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}, [currentUser?.id]);


const getComputedStatus = useCallback((friend) => {
  const rawStatus = (friend?.status || "").toLowerCase();

  if (!friend?.last_seen) return "offline";

  const diff = Date.now() - new Date(friend.last_seen).getTime();

  if (diff >= 45000) return "offline";

  if (rawStatus === "in_match") return "in_match";
  if (rawStatus === "in_room") return "in_room";

  return "online";
}, []);



  const winRp = getWinPoints(stats.rankPoints);
const lossRp = getLossPoints(stats.rankPoints);


 
  const USERNAME_CHANGE_COOLDOWN_DAYS = 60;
const usernameLastChangedAt = currentUser?.usernameChangedAt
  ? new Date(currentUser.usernameChangedAt)
  : null;

const now = new Date();
const nextUsernameChangeDate = usernameLastChangedAt
  ? new Date(usernameLastChangedAt.getTime() + USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
  : null;

const canChangeUsername =
  !nextUsernameChangeDate || now >= nextUsernameChangeDate;

const daysUntilUsernameChange = nextUsernameChangeDate
  ? Math.max(
      0,
      Math.ceil((nextUsernameChangeDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    )
  : 0;

  const handleSendPasswordReset = async () => {
  setSettingsMessage("");
  setSettingsError("");

  const typedEmail = settingsEmail.trim().toLowerCase();
  const accountEmail = (currentUser?.email || "").trim().toLowerCase();

  if (!typedEmail) {
    setSettingsError("Please enter your email.");
    return;
  }

  if (!accountEmail || typedEmail !== accountEmail) {
    setSettingsError("Incorrect email.");
    return;
  }

  try {
    setIsSendingReset(true);

    const result = await userManager.sendPasswordResetEmail(typedEmail);

    if (!result?.success) {
      setSettingsError(result?.message || "Could not send reset email.");
      return;
    }

    setSettingsMessage("Password reset email sent. Check your inbox.");
  } catch (err) {
    setSettingsError("Could not send reset email.");
  } finally {
    setIsSendingReset(false);
  }
};

const handleChangeUsername = async () => {
  setSettingsMessage("");
  setSettingsError("");

  const trimmed = newUsername.trim();

  if (!trimmed) {
    setSettingsError("Please enter a username.");
    return;
  }

  if (trimmed.length < 3) {
    setSettingsError("Username must be at least 3 characters.");
    return;
  }

  if (!canChangeUsername) {
    setSettingsError(`You can change your username again in ${daysUntilUsernameChange} day(s).`);
    return;
  }

  try {
    setIsSavingUsername(true);

  const normalizedUsername = trimmed.toLowerCase();
const existingUser = await userManager.getUserByUsername(normalizedUsername);

if (existingUser && existingUser.id !== currentUser.id) {
  setSettingsError("That username is already taken.");
  return;
}
    const updatedUser = {
      ...currentUser,
      username: trimmed,
      usernameChangedAt: new Date().toISOString(),
    };

    const result = await userManager.saveUser(updatedUser);


if (!result?.success) {
  setSettingsError(result?.message || "Could not update username.");
  return;
}

    const freshUser = await userManager.getCurrentUser();
    if (freshUser && onLoginSuccess) {
      onLoginSuccess(freshUser);
    }

    setSettingsMessage("Username updated successfully.");
  } catch (err) {
    console.error("Username update error:", err);
    setSettingsError("Could not update username.");
  } finally {
    setIsSavingUsername(false);
  }
};

useEffect(() => {
  if (error) {
    setIsJoiningRandom(false);
  }
}, [error]);

useEffect(() => {
  if (!showQueue) {
    setIsJoiningRandom(false);
  }
}, [showQueue]);

  // If no current user, show auth
  if (!currentUser) {
    return (
      <Auth
        onLoginSuccess={onLoginSuccess}
        isLoggedIn={!!currentUser}
        currentUser={currentUser}
      />
    );
  }


const visibleOnlineFriends = friends.filter((friend) => {
  const value = getComputedStatus(friend);
  return value === "online" || value === "in_room" || value === "in_match";
});


  return (
    <div className="lobbyShell">
    <div className="lobbyTopbar">
  <div className="topNavShell">
   <div className="topNavCenter">
  <button
    type="button"
    className={`topNavItem ${!showQueue ? "active" : ""}`}
    onClick={() => setShowQueue(false)}
  >
    Lobby
  </button>

  <button
    type="button"
    className="topNavItem"
    onClick={onOpenStore}
  >
    Store
  </button>

  <button
    type="button"
    className={`topNavItem topNavQueueItem ${showQueue ? "active" : ""}`}
   onClick={() => {
  setShowQueue(true);
}}
  >
    <img src="/queue.png" alt="Queue" className="topNavQueueImg" />
  </button>

  <button
    type="button"
    className="topNavItem"
    onClick={onOpenRank}
  >
    Rank
  </button>

  <button
    type="button"
    className="topNavItem"
    onClick={onOpenFriends}
  >
    <span>Friends</span>
    {friendChatBadgeCount > 0 && (
      <span className="topNavBadge">{friendChatBadgeCount}</span>
    )}
  </button>
</div>

    <div className="topNavRight">
      <div className="coinsPill">
  <img src="/coin.png" alt="Coins" className="coinsImg" />
  <span>{(currentUser?.coins ?? 0).toLocaleString()}</span>
</div>

      {/* <div className="connectionPill">
        <span
          className={`connectionDot ${isConnected ? "connected" : "disconnected"}`}
        />
        <span>{isConnected ? "Online" : "Connecting..."}</span>
      </div> */}

      <button
  className="settingsProfileBtn"
  onClick={() => setShowSettings(!showSettings)}
  title="Account Settings"
  type="button"
>
  <div className="settingsProfileAvatar">
    {currentUser?.avatarData ? (
      <img src={currentUser.avatarData} alt={currentUser.username || "Avatar"} />
    ) : (
      <span>{currentUser?.username?.[0]?.toUpperCase() || "?"}</span>
    )}
  </div>

  <span className="settingsProfileDivider" />

  <img src={settingsIcon} alt="Settings" className="settingsIconImg" />
</button>
    </div>
  </div>
</div>

      {showSettings && (
  <div className="settingsModal">
    <div
      className="settingsOverlay"
      onClick={() => {
        setShowSettings(false);
        setSettingsMessage("");
        setSettingsError("");
      }}
    />
    <div className="settingsPanel">
      <div className="settingsCard">
        <div className="settingsHeader">
          <div>
            <div className="miniLabel">Account Settings</div>
            <h3>Manage Account</h3>
          </div>

          <button
            className="settingsCloseBtn"
            type="button"
            onClick={() => {
              setShowSettings(false);
              setSettingsMessage("");
              setSettingsError("");
            }}
          >
            ✕
          </button>
        </div>

        <div className="settingsTabs">
          <button
            type="button"
            className={`settingsTab ${settingsTab === "password" ? "active" : ""}`}
            onClick={() => {
              setSettingsTab("password");
              setSettingsMessage("");
              setSettingsError("");
            }}
          >
            Change Password
          </button>

          <button
            type="button"
            className={`settingsTab ${settingsTab === "username" ? "active" : ""}`}
            onClick={() => {
              setSettingsTab("username");
              setSettingsMessage("");
              setSettingsError("");
            }}
          >
            Change Username
          </button>
        </div>

        {settingsTab === "password" && (
          <div className="settingsSection">
            <div className="fieldStack">
              <label className="fieldLabel">Email</label>
              <input
                className="roomNativeInput"
                type="email"
                value={settingsEmail}
                onChange={(e) => setSettingsEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>

            <p className="heroMuted">
              Enter the email linked to this account to receive a reset link.
            </p>

            <button
              type="button"
              className="roomNativeButton"
              onClick={handleSendPasswordReset}
              disabled={isSendingReset}
            >
              {isSendingReset ? "Sending..." : "Send Reset Link"}
            </button>
          </div>
        )}

        {settingsTab === "username" && (
          <div className="settingsSection">
            <div className="fieldStack">
              <label className="fieldLabel">New Username</label>
              <input
                className="roomNativeInput"
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter new username"
              />
            </div>

            <p className="heroMuted">
              {canChangeUsername
                ? "You can change your username now."
                : `You can change your username again in ${daysUntilUsernameChange} day(s).`}
            </p>

            <button
              type="button"
              className="roomNativeButton"
              onClick={handleChangeUsername}
              disabled={isSavingUsername || !canChangeUsername}
            >
              {isSavingUsername ? "Saving..." : "Save Username"}
            </button>
          </div>
        )}

        {settingsMessage && (
          <div className="statusMessage success">{settingsMessage}</div>
        )}
        {settingsError && (
          <div className="statusMessage error">{settingsError}</div>
        )}


<button
  type="button"
  className="roomNativeButton roomNativeButtonGhost"
  onClick={async () => {
    await userManager.logoutUser();
    setShowSettings(false);
    if (onLoginSuccess) onLoginSuccess(null);
  }}
>
  Logout
</button>
      </div>
    </div>
  </div>
)}


      <div className="lobbyLayout">
        <aside className="sidebarPanel">
          <div className="playerMiniCard">
            <div className="playerMiniAvatar">
              {currentUser?.avatarData ? (
                <img src={currentUser.avatarData} alt="Current avatar" />
              ) : (
                <div className="avatarFallback">
                  {currentUser?.username?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>

            <div>
              <div className="miniLabel">PLAYER</div>
              <div className="miniName">{currentUser.username}</div>
              <div className="miniMuted">Ready for the next match</div>
            </div>
          </div>

          

          <div className="categoryList">

          
{/* <button
  className={`categoryButton ${showQueue ? "active" : ""}`}
  type="button"
  onClick={() => {
    setShowQueue((prev) => {
      const next = !prev;

      if (!prev) {
        requestAnimationFrame(() => {
          queueSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }

      return next;
    });
  }}
>
  <span className="categoryEmoji categoryEmojiPlain">
  <img src="/queue.png" alt="Queue" className="categoryEmojiImg" />
</span>
<span className="categoryCopy">
  <span className="categoryTitle">Queue</span>
  <span className="categoryCount">Create, join, or quick match</span>
</span>
</button> */}

            
  {/* <button
    className="categoryButton"
    type="button"
    onClick={onOpenGame}
  >
    <span className="categoryEmoji">🎮</span>
    <span className="categoryCopy">
      <span className="categoryTitle">Open Game</span>
      <span className="categoryCount">Preview game UI</span>
    </span>
  </button> */}

{/* <div className="summaryCard">
  <span className="summaryLabel">Test Rank</span>
  <strong>
    {testRankOverride
      ? `${testRankOverride.rankLevel} (${testRankOverride.rankPoints})`
      : "Real Rank"}
  </strong>
</div>

  <button onClick={() => setTestRankOverride({ rankPoints: 50, rankLevel: "Novice" })}>
  Test Novice
</button>

<button onClick={() => setTestRankOverride({ rankPoints: 750, rankLevel: "Expert" })}>
  Test Expert
</button>

<button onClick={() => setTestRankOverride({ rankPoints: 1000, rankLevel: "King" })}>
  Test King
</button>

<button onClick={() => setTestRankOverride(null)}>
  Use Real Rank
</button> */}

            {/* <button
              className="categoryButton active"
              type="button"
              onClick={onOpenStore}
            >
              <span className="categoryEmoji">🛒</span>
              <span className="categoryCopy">
                <span className="categoryTitle">Open Store</span>
                <span className="categoryCount">Customize your look</span>
              </span>
            </button>

            <button
              className="categoryButton"
              type="button"
              onClick={onOpenRank}
            >
              <span className="categoryEmoji">🏆</span>
              <span className="categoryCopy">
                <span className="categoryTitle">Open Rank</span>
                <span className="categoryCount">View your rank details</span>
              </span>
            </button>

<button
  className="categoryButton"
  type="button"
  onClick={onOpenFriends}
>
  <span className="categoryEmoji">👥</span>
  <span className="categoryCopy">
    <span className="categoryTitleRow">
      <span className="categoryTitle">Friends</span>
      {friendChatBadgeCount > 0 && (
        <span className="lobbyChatBadge">{friendChatBadgeCount}</span>
      )}
    </span>
    <span className="categoryCount">Open your friend list</span>
  </span>
</button> */}
{/* 
            <div className="summaryCard">
              <span className="summaryLabel">Rank</span>
              <strong>{stats.rank}</strong>
            </div>

            <div className="summaryCard">
              <span className="summaryLabel">RP</span>
              <strong>{stats.rankPoints}</strong>
            </div>

            <div className="summaryCard">
              <span className="summaryLabel">Win Rate</span>
              <strong>{stats.winRate}%</strong>
            </div> */}
            <div className="sidebarSectionTitle">Your Friends</div>

            <div className="onlineFriendsCard">
  <div className="onlineFriendsHeader">
    <div>
      <div className="miniLabel">Friends Online</div>
      <div className="onlineFriendsTitle">{visibleOnlineFriends.length} online</div>
    </div>

    <button
      type="button"
      className="onlineFriendsViewAll"
      onClick={onOpenFriends}
    >
      View
    </button>
  </div>

  <div className="onlineFriendsList"
   onScroll={() => {
    setIsOnlineFriendsScrolling?.(true);
    clearTimeout(window.__onlineFriendsScrollTimer);
    window.__onlineFriendsScrollTimer = setTimeout(() => {
      setIsOnlineFriendsScrolling?.(false);
    }, 150);
  }}>
    {visibleOnlineFriends.length > 0 ? (
  visibleOnlineFriends.slice(0, 4).map((friend) => (
        <button
          key={friend.id}
          type="button"
          className="onlineFriendRow"
          onClick={onOpenFriends}
        >
          <div className="onlineFriendLeft">
            <div className="onlineFriendAvatar">
              {friend.avatarData ? (
                <img src={friend.avatarData} alt={friend.username} />
              ) : (
                <span>{friend.username?.[0]?.toUpperCase() || "?"}</span>
              )}
            </div>

            <div className="onlineFriendMeta">
              <div className="onlineFriendNameRow">
  <span className={`connectionDot ${getComputedStatus(friend)}`} />
  <span className="onlineFriendName">{friend.username}</span>
</div>
              <div className="onlineFriendSub">
                {friend.rankPoints ?? 0} RP
              </div>
            </div>
          </div>
        </button>
      ))
    ) : (
      <div className="onlineFriendsEmpty">No friends online right now.</div>
    )}
  </div>
</div>
          </div>
          
        </aside>

       {!showQueue ? (
  <main className="mainPanel">
    <section className="statsPanel">
      <div className="panelHeader">
        <div>
          <div className="miniLabel">Stats</div>
          <h3>Your Progress</h3>
        </div>
      </div>

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

      <div className="rankProgressSection">
        <div className="rankProgressHeader">
 <div className="currentRankBadge">
  <img
    className="rankIcon"
    src={getRankImage(stats.rank)}
    alt={stats.rank}
  />
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
            <div className="progressBarFill" style={{ width: `${rankProgress}%` }}>
              <div className="progressGlow" />
            </div>
          </div>
          <div className="progressLabels">
            <span className="rpEarned">{stats.rankPoints} RP</span>
            {nextRank && (
              <span className="rpNeeded">{pointsToNext} more to {nextRank}</span>
            )}
          </div>
        </div>

        <div className="rpIndicator">
          <div className="rpDot" />
          <span className="rpText">+{winRp} RP per win</span>
          <div className="rpDotRed" />
          <span className="rpText">-{lossRp} RP per loss</span>
        </div>
      </div>
    </section>

    {error && <div className="statusMessage error">{error}</div>}
  </main>
) : (
  <main className="mainPanel queuePanel" ref={queueSectionRef}>
    <div className="queuePanelHeader">
      <div>
        <div className="miniLabel">Dual Math</div>
        <h3>Find a Match</h3>
      </div>
      {/* <button
        type="button"
        className="queueCloseBtn"
        onClick={() => setShowQueue(false)}
      >
        ✕
      </button> */}
    </div>

    <div className="roomGrid">
      <div className="roomCard">
        <div className="miniLabel">Create</div>
        <h3>Create a room</h3>
        <div className="fieldStack">
          <label className="fieldLabel">Room name</label>
          <input
            className="roomNativeInput"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Enter room name"
          />
        </div>
        <button
          type="button"
          className="roomNativeButton"
          disabled={!roomName.trim()}
          onClick={async () => {
            if (currentUser?.id) await userManager.updateStatus(currentUser.id, "in_room");
            onCreate({ name: roomName.trim() });
          }}
        >
          Create Room
        </button>
      </div>

      <div className="roomCard">
        <div className="miniLabel">Join</div>
        <h3>Join a room</h3>
        <div className="fieldStack">
          <label className="fieldLabel">Room code</label>
          <input
            className="roomNativeInput"
            value={code}
            onChange={(e) => {
              const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
              setCode(cleaned);
            }}
            placeholder="ABCDE"
          />
        </div>
        <button
          type="button"
          className="roomNativeButton roomNativeButtonGhost"
          disabled={code.length !== 5}
          onClick={async () => {
            if (currentUser?.id) await userManager.updateStatus(currentUser.id, "in_room");
            onJoin({ roomCode: code });
          }}
        >
          Join Room
        </button>
      </div>

      <div className="roomCard">
        <div className="miniLabel">Random</div>
        <h3>Quick match</h3>
        <p className="heroMuted">Find a match and join a random room instantly.</p>
        <button
  type="button"
  className="roomNativeButton roomNativeButtonGhost"
  onClick={async () => {
    if (isJoiningRandom) return;

    setIsJoiningRandom(true);

    if (currentUser?.id) {
      await userManager.updateStatus(currentUser.id, "in_room");
    }

    try {
      await onJoinRandom?.();
    } catch (err) {
      console.error("join random failed:", err);
      setIsJoiningRandom(false);
    }
  }}
  disabled={isJoiningRandom}
>
 {isJoiningRandom ? (
  "Searching..."
) : (
  <>
    <img src="/dice.png" alt="Join Random" className="diceImg" />
    <span>Join Random</span>
  </>
)}
</button>
      </div>
    </div>

    {error && <div className="statusMessage error">{error}</div>}
  </main>
)}
      </div>

      <style>{`
        :root{
          --base: rgba(204, 173, 92, 0.96);
          --cream:#fff3d6;
          --cream-2:#ffefc8;
          --cream-3:#f7e2ad;
          --tan:#e5c28a;
          --tan-2:#d6ae6b;
          --brown:#9a6c34;
          --brown-dark:#6b4520;
          --brown-soft:#bf8d56;
          --brown-light:#e4bc8e;
          --gold:#e0ab3f;
          --gold-2:#edbb57;
          --gold-3:#f7cd76;
          --ink:#5a3817;
          --muted:#9d754c;
          --card-border:#d2a75c;
          --success-bg: rgba(179, 132, 55, 0.16);
          --success-border: rgba(179, 132, 55, 0.42);
          --error-bg: rgba(190, 92, 72, 0.15);
          --error-border: rgba(190, 92, 72, 0.38);
          --glow-gold: 0 0 40px rgba(224, 171, 63, 0.24);
          --glow-brown: 0 0 24px rgba(154, 108, 52, 0.22);
        }
          
.queuePanel {
  display: flex !important;
  flex-direction: column;
  gap: 18px;
  overflow: hidden;
  height: fit-content;
}
.queuePanelHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 20px 0;
}

.queuePanelHeader h3 {
  margin: 4px 0 0;
  font-size: 24px;
  color: var(--ink);
}

.categoryEmojiImg {
  width: 42px;
  height: 42px;
  object-fit: contain;
  display: block;
}
  
.categoryEmojiPlain {
  background: transparent !important;
  box-shadow: none !important;
}
  
.queueCloseBtn {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(93, 88, 63, 0.12);
  border-radius: 999px;
  background: rgba(255, 253, 244, 0.8);
  color: var(--brown-dark);
  font-size: 16px;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.roomGrid {
  padding: 0 20px 20px;
}
        .queuePopup {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 248, 232, 0.92), rgba(229, 194, 138, 0.96));
  border: 1px solid rgba(93, 88, 63, 0.08);
  box-shadow: 0 18px 30px rgba(107, 79, 52, 0.10);
}

.queuePopupHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.queuePopupHeader h3 {
  margin: 4px 0 0;
  font-size: 24px;
  color: var(--ink);
}

.queueCloseBtn {
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 999px;
  background: rgba(255, 253, 244, 0.8);
  color: var(--brown-dark);
  font-size: 18px;
  cursor: pointer;
}

        .queueSection {
  display: grid;
  gap: 12px;
}

.diceImg {
  width: 42px;
  height: 42px;
  object-fit: contain;
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
  margin-bottom: -15px;
  margin-top: -20px;
  margin-left: -5px;
}
.queueToggleButton {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-radius: 20px;
  border: 1px solid rgba(107, 79, 52, 0.12);
  background: rgba(255, 248, 232, 0.58);
  color: var(--ink);
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 10px 18px rgba(107, 79, 52, 0.08);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.queueToggleButton.active {
  background: linear-gradient(180deg, #f5eed7, #e1c89d);
  border-color: rgba(107, 79, 52, 0.22);
}

.queueToggleLeft {
  display: flex;
  align-items: center;
  gap: 10px;
}

.queueToggleIcon {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, var(--gold-3), var(--brown));
  color: #4b3215;
  font-size: 16px;
}

.queueToggleText {
  font-size: 16px;
}

.queueToggleArrow {
  font-size: 22px;
  line-height: 1;
  color: var(--brown-dark);
}

        .onlineFriendsCard {
  margin-top: 12px;
  padding: 12px;
  border-radius: 20px;
  background: linear-gradient(180deg, #f9f7ea, var(--cream-3));
  border: 1px solid rgba(93, 88, 63, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.onlineFriendsList {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  min-height: 0;

  scroll-behavior: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.onlineFriendsList::-webkit-scrollbar {
  width: 6px;
}

.onlineFriendsList::-webkit-scrollbar-thumb {
  background: rgba(107, 79, 52, 0.28);
  border-radius: 999px;
}

.onlineFriendsList::-webkit-scrollbar-track {
  background: transparent;
}

        .connectionDot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.connectionDot.online,
.connectionDot.connected {
  background: #92d36e;
  box-shadow: 0 0 10px rgba(146, 211, 110, 0.65);
}

.connectionDot.offline,
.connectionDot.disconnected {
  background: #d77a63;
  box-shadow: 0 0 10px rgba(215, 122, 99, 0.5);
}

        .onlineFriendsCard {
  margin-top: 12px;
  padding: 12px;
  border-radius: 20px;
  background: linear-gradient(180deg, #f9f7ea, var(--cream-3));
  border: 1px solid rgba(93, 88, 63, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.onlineFriendsHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.onlineFriendsTitle {
  margin-top: 4px;
  font-size: 16px;
  font-weight: 800;
  color: var(--ink);
}

.onlineFriendsViewAll {
  border: 1px solid rgba(107, 79, 52, 0.14);
  background: rgba(255, 253, 244, 0.85);
  color: var(--ink);
  border-radius: 999px;
  padding: 8px 12px;
  font-weight: 700;
  cursor: pointer;
}

.settingsTab:hover,
.queueCloseBtn:hover,
.onlineFriendsViewAll:hover {
  transform: translateY(-1px);
  border-color: rgba(107, 79, 52, 0.22);
  box-shadow: 0 8px 18px rgba(107, 79, 52, 0.10);
}

.onlineFriendsList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.onlineFriendRow {
  width: 100%;
  border: 1px solid rgba(93, 88, 63, 0.08);
  background: rgba(255, 253, 244, 0.72);
  border-radius: 14px;
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
}

.onlineFriendRow:hover {
  border-color: rgba(107, 79, 52, 0.3);
  background: linear-gradient(180deg, #f5eed7, #e1c89d);
}

.onlineFriendLeft {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.onlineFriendAvatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: transparent;
  flex-shrink: 0;
}

.onlineFriendAvatar img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.onlineFriendMeta {
  min-width: 0;
}

.onlineFriendNameRow {
  display: flex;
  align-items: center;
  gap: 8px;
}

.onlineFriendName {
  font-weight: 800;
  font-size: 14px;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.onlineFriendSub {
  margin-top: 3px;
  font-size: 12px;
  color: var(--muted);
}

.connectionDot.online {
  background: #92d36e;
  box-shadow: 0 0 10px rgba(146, 211, 110, 0.65);
}

.onlineFriendsEmpty {
  padding: 10px;
  border-radius: 14px;
  background: rgba(255, 253, 244, 0.65);
  color: var(--muted);
  font-size: 12px;
  text-align: center;
}

 .settingsCard {
  background: linear-gradient(180deg, var(--cream), var(--tan));
  border: 1px solid rgba(93, 88, 63, 0.08);
  border-radius: 24px;
  padding: 18px;
  box-shadow: 0 18px 36px rgba(95, 70, 48, 0.14);

  display: flex;
  flex-direction: column;
  gap: 14px;
}
.settingsHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.settingsHeader h3 {
  margin: 6px 0 0;
  font-size: 24px;
  color: var(--ink);
}

.settingsCloseBtn {
  border: none;
  background: transparent;
  color: var(--brown-dark);
  font-size: 20px;
  cursor: pointer;
  padding: 6px;
}

.settingsTabs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.settingsTab {
  width: 100%;
  text-align: left;
}

.settingsTab {
  border: 1px solid rgba(93, 88, 63, 0.12);
  background: rgba(255, 253, 244, 0.75);
  color: var(--ink);
  border-radius: 999px;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
}

.settingsTab.active {
  background: linear-gradient(180deg, #f5eed7, #e1c89d);
  border-color: rgba(107, 79, 52, 0.45);
  box-shadow: var(--glow-brown);
}

.settingsSection {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.statusMessage.success {
  background: var(--success-bg);
  border-color: var(--success-border);
  color: #6b5b34;
}

.lobbyShell {
  box-sizing: border-box;
  padding: 24px 24px 36px;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(255, 235, 190, 0.62), transparent 34%),
    linear-gradient(180deg, #ecdcb8 10%, #cfb07a 55%, #b98f58 100%);
  color: var(--ink);
  position: relative;
  height: 100dvh;
  display: flex;
  flex-direction: column;
}

.rankIcon {
  width: 46px;
  height: 46px;
  object-fit: contain;
  display: inline-block;
  vertical-align: middle;

}

.lobbyLayout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 18px;
  min-height: 0;
  height: calc(100vh - 140px);
  align-items: start;
}

.mainPanel {
  background: none !important;
  border: none !important;
  display: grid;
  gap: 18px;
  min-height: 0;
  height: fit-content;
  overflow-x: hidden;
  padding-right: 4px;
  padding-bottom: 24px;
  box-sizing: border-box;

  scrollbar-width: none;
  -ms-overflow-style: none;
}

.mainPanel::-webkit-scrollbar {
  display: none;
}

@media (max-height: 900px) {
  .lobbyShell {
    padding: 14px;
  }

  .lobbyTopbar {
    margin-bottom: 12px;
    gap: 12px;
  }

  .lobbyHeading {
    margin: 4px 0 6px;
    font-size: clamp(28px, 4vw, 42px);
  }

  .lobbyLayout {
    gap: 12px;
  }

  .mainPanel {
    gap: 12px;
    padding-bottom: 12px;
  }

  .statsPanel,
  .roomCard,
 {
    padding: 14px;
    border-radius: 22px;
  }

  .statsGrid {
    gap: 10px;
    margin-top: 12px;
  }

  .statItem {
    padding: 12px;
    border-radius: 18px;
  }

  .statValue {
    font-size: 24px;
    margin-top: 4px;
  }

  .rankProgressSection {
    margin-top: 14px;
    padding-top: 14px;
  }

  .rpIndicator {
    padding: 8px 10px;
    margin-top: 6px;
  }

  .roomGrid {
    gap: 10px;
  }

  .roomCard {
    gap: 10px;
  }

  .roomCard h3 {
    font-size: 18px;
  }

 

  .roomNativeInput,
  .roomNativeButton,
  .roomNativeButtonGhost {
    padding: 10px 12px !important;
    font-size: 14px !important;
  }

  .playerMiniCard {
    padding: 10px;
    gap: 10px;
  }

  .summaryCard,
  .categoryButton {
    padding: 10px 12px;
  }
}

        .lobbyTopbar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }

    
        .sidebarSectionTitle {
          margin-top: 0px;
        }
        

        .miniLabel,
        .sidebarSectionTitle,
        .summaryLabel,
        .statLabel,
        .fieldLabel {
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 11px;
          color: var(--muted);
        }

        .lobbyHeading {
          margin: 6px 0 8px;
          font-size: clamp(34px, 5vw, 52px);
          line-height: 1;
          font-weight: 900;
          color: var(--ink);
        }

.coinsImg {
  width: 28px;
  height: 28px;
  object-fit: contain;
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
        .welcomeText {
          color: var(--muted);
          font-size: 15px;
        }

        .topbarActions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .connectionPill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 999px;
          border: 1px solid rgba(107, 79, 52, 0.12);
          background: var(--brown);
          box-shadow: 0 10px 18px rgba(102, 69, 42, 0.18);
          font-weight: 700;
          color: #f9f1dd;
        }

        .connectionDot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .connectionDot.connected {
          background: #92d36e;
          box-shadow: 0 0 10px rgba(146, 211, 110, 0.65);
        }

        .connectionDot.disconnected {
          background: #d77a63;
          box-shadow: 0 0 10px rgba(215, 122, 99, 0.65);
          animation: pulse 1.5s infinite;
        }

        .settingsIconBtn {
          padding: 12px 16px;
          border-radius: 999px;
          border: 1px solid rgba(107, 79, 52, 0.12);
          background: var(--brown);
          box-shadow: 0 10px 18px rgba(102, 69, 42, 0.18);
          font-size: 18px;
          color: #f9f1dd;
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .settingsIconBtn:hover {
          transform: translateY(-1px);
        }

        .lobbyLayout {
          display: grid;
          grid-template-columns: 280px minmax(0, 1fr);
          gap: 18px;
        }

        .roomCard {
        background: rgba(255, 253, 244, 0.8) !important;
        }

        

.heroPanel,
.roomCard {
  background: linear-gradient(180deg, var(--cream), var(--tan));
  border: 1px solid rgba(93, 88, 63, 0.08);
  border-radius: 28px;
}

.statsPanel {
background: none;
  border: none;
}



        .playerMiniCard {
          display: grid;
          grid-template-columns: 64px 1fr;
          gap: 14px;
          padding: 14px;
          border-radius: 22px;
          background:linear-gradient(180deg,#f9f7ea 0%,var(--cream-3) 100%);
          border: 1px solid rgba(93, 88, 63, 0.08);
        }

       .playerMiniAvatar,
.avatarFallback {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: transparent;
  border: none;
}

        .playerMiniAvatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatarFallback {
          font-size: 22px;
          font-weight: 900;
          color: var(--brown-dark);
        }

        .miniName {
          font-size: 18px;
          font-weight: 800;
          margin-top: 4px;
          color: var(--ink);
        }

        .miniMuted {
          margin-top: 4px;
          color: var(--muted);
          font-size: 13px;
        }

        .categoryList {
          display: grid;
          gap: 10px;
        }

        .categoryButton {
          display: grid;
          grid-template-columns: 44px 1fr;
          gap: 12px;
          align-items: center;
          padding: 12px 14px;
          border-radius: 18px;
          border: 1px solid rgba(93, 88, 63, 0.08);
          background: linear-gradient(180deg, #f9f7ea, var(--cream-3));
          color: var(--ink);
          text-align: left;
          cursor: pointer;
          transition: 0.18s ease;
        }

        .topNavQueueItem {
  min-width: 148px;
  padding: 12px 24px;
  background: linear-gradient(180deg, #ffe9b8, #e7be73);
  border: 1px solid rgba(107, 79, 52, 0.22);
  box-shadow:
    0 10px 22px rgba(176, 129, 53, 0.18),
    0 0 18px rgba(224, 171, 63, 0.16);
}

.topNavQueueItem:hover {
  background: linear-gradient(180deg, #fff0c8, #edc980);
  box-shadow:
    0 12px 24px rgba(176, 129, 53, 0.22),
    0 0 22px rgba(224, 171, 63, 0.22);
}

.topNavQueueItem.active {
  background: linear-gradient(180deg, #ffe7b0, #dca95a);
  border-color: rgba(107, 79, 52, 0.32);
  box-shadow:
    0 12px 24px rgba(176, 129, 53, 0.24),
    0 0 24px rgba(224, 171, 63, 0.28);
}

.topNavQueueImg {
  width: 42px;
  height: 42px;
  object-fit: contain;
  display: block;
}

        .categoryButton:hover,
        .categoryButton.active {
          border-color: rgba(107, 79, 52, 0.45);
          background: linear-gradient(180deg, #f5eed7, #e1c89d);
          transform: translateY(-1px);
          box-shadow: var(--glow-brown);
        }

        .categoryEmoji {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: linear-gradient(180deg, var(--gold-3), var(--brown));
          font-size: 18px;
          color: #4b3215;
        }

        .categoryCopy {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .categoryTitle {
          font-weight: 700;
        }

        .categoryCount {
          color: var(--muted);
          font-size: 12px;
        }

        .summaryCard {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          border-radius: 18px;
          background: rgba(255, 253, 244, 0.75);
          border: 1px solid rgba(93, 88, 63, 0.08);
          color: var(--ink);
        }



        .heroPanel,
        .statsPanel {
          padding: 20px;
        }

        .heroPanel {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: stretch;
          flex-wrap: wrap;
          box-shadow: 0 16px 32px rgba(95, 70, 48, 0.08);
        }

        .heroCopy {
          flex: 1 1 320px;
        }

        .heroCopy h2 {
          margin: 6px 0 10px;
          font-size: clamp(24px, 3vw, 34px);
          line-height: 1.1;
        }

        .heroMuted {
          color: var(--muted);
          font-size: 14px;
          margin: 0;
          margin-bottom: 10px !important;
        }

        .heroActions {
          display: grid;
          grid-template-columns: repeat(2, minmax(180px, 1fr));
          gap: 12px;
          flex: 1 1 320px;
        }

        .settingsCard {
  width: 100%;
}

        .heroActionCard {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 22px;
          border: 1px solid rgba(93, 88, 63, 0.08);
          background: linear-gradient(180deg, #f9f7ea, var(--cream-3));
          color: var(--ink);
          cursor: pointer;
          text-align: left;
          transition: 0.18s ease;
        }

        .heroActionCard:hover {
          transform: translateY(-1px);
          box-shadow: var(--glow-brown);
          border-color: rgba(107, 79, 52, 0.45);
        }

        .heroActionCard:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .heroActionEmoji {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: linear-gradient(180deg, var(--gold-3), var(--brown));
          font-size: 20px;
          color: #4b3215;
          flex-shrink: 0;
        }

        .heroActionCard span {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .heroActionCard strong {
          font-size: 15px;
        }

        .heroActionCard small {
          color: var(--muted);
          font-size: 12px;
        }
          

        .panelHeader h3 {
          margin: 6px 0 0;
          font-size: 28px;
          color: var(--ink);
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 16px;
        }

        .statItem {
          text-align: center;
          padding: 16px;
          border-radius: 22px;
          background: linear-gradient(180deg, var(--cream-2), var(--base));
          border: 1px solid rgba(93, 88, 63, 0.08);
        }

        .statValue {
          font-size: 30px;
          font-weight: 900;
          color: var(--brown-dark);
          line-height: 1;
          margin-top: 6px;
        }

        .statSubtext {
          font-size: 13px;
          color: var(--muted);
          margin-top: 6px;
        }

        .rankProgressSection {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(107, 79, 52, 0.16);
        }

        .rankProgressHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .currentRankBadge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 5px;
  background: rgba(255, 253, 244, 0.22);
  backdrop-filter: blur(14px) saturate(150%);
  -webkit-backdrop-filter: blur(14px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  box-shadow:
    0 6px 18px rgba(91, 63, 42, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

        .rankIcon {
          font-size: 18px;
        }

        .rankName {
          font-weight: 800;
          color: var(--brown-dark);
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-right: 15px;
          margin-left: -7px;
        }

        .nextRankInfo {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--muted);
        }

        .nextRankName {
          font-weight: 700;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .progressBarContainer {
          margin-bottom: 12px;
        }

        .progressBarBg {
          height: 14px;
          background: rgba(255,255,255,0.55);
          border: 1px solid rgba(107, 79, 52, 0.18);
          border-radius: 999px;
          overflow: hidden;
          position: relative;
        }

        .progressBarFill {
          height: 100%;
          background: linear-gradient(90deg, var(--gold), var(--gold-2), var(--brown-soft));
          border-radius: 999px;
          position: relative;
          transition: width 0.4s ease;
          box-shadow: 0 0 12px rgba(205, 162, 90, 0.35);
        }

        .connectionDot.in_room {
  background: #e0ab3f;
  box-shadow: 0 0 10px rgba(224, 171, 63, 0.55);
}

.connectionDot.in_match {
  background: #d96a6a;
  box-shadow: 0 0 10px rgba(217, 106, 106, 0.65);
}
  
        .progressGlow {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          animation: shimmer 2s infinite;
        }

        .progressLabels {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
          flex-wrap: wrap;
        }

        .rpEarned {
          font-weight: 800;
          font-size: 16px;
          color: var(--brown-dark);
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
          background: rgba(255,255,255,0.35);
          border: 1px solid rgba(107, 79, 52, 0.12);
          border-radius: 14px;
          margin-top: 8px;
          flex-wrap: wrap;
        }

        .rpDot,
        .rpDotRed {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .rpDot {
          background: #93b96b;
          box-shadow: 0 0 6px rgba(147, 185, 107, 0.6);
        }

        .rpDotRed {
          background: #cf7f6c;
          box-shadow: 0 0 6px rgba(207, 127, 108, 0.6);
          margin-left: 10px;
        }

        .rpText {
          font-size: 12px;
          color: var(--muted);
        }

        .statsPanel {
  padding: 16px;
}

@media (max-height: 860px) {
  .lobbyShell {
    padding: 14px;
  }

  .lobbyTopbar {
    margin-bottom: 10px;
  }

  .lobbyLayout {
    gap: 12px;
  }

  .mainPanel {
    gap: 12px;
    padding-bottom: 10px;
  }


  .statsPanel,
  .roomCard {
    padding: 10px;
  }

  .roomGrid {
    gap: 8px;
  }

  .roomCard h3 {
    font-size: 15px;
  }

  .roomNativeInput,
  .roomNativeButton,
  .roomNativeButtonGhost {
    padding: 7px 9px !important;
    min-height: 32px;
    font-size: 12px !important;
  }
}

.statsGrid {
  gap: 10px;
  margin-top: 12px;
}

.statItem {
  padding: 12px;
  border-radius: 18px;
  background: rgba(255, 253, 244, 0.8);
  box-shadow:
  0 0 18px rgba(255, 244, 210, 0.45),
  0 0 36px rgba(224, 171, 63, 0.18),
  inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.statValue {
  font-size: 24px;
}

.rankProgressSection {
  margin-top: 14px;
  padding-top: 14px;
}

.rpIndicator {
  padding: 8px 10px;
}

.roomGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  height: fit-content;
}

.roomCard {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  box-shadow: 0 12px 22px rgba(107, 79, 52, 0.08);
}

.roomCard h3 {
  margin: 0;
  font-size: 16px;
  line-height: 1.1;
  color: var(--ink);
}

.fieldStack {
  display: grid;
  gap: 4px;
}

.fieldLabel,
.miniLabel {
  font-size: 10px;
  letter-spacing: 0.16em;
}

.heroMuted {
  font-size: 12px;
  line-height: 1.3;
  margin: 0;
}

.roomNativeInput {
  width: 100% !important;
  box-sizing: border-box !important;
  padding: 8px 10px !important;
  min-height: 36px;
  border-radius: 14px !important;
  font-size: 13px !important;
}

.roomNativeButton,
.roomNativeButtonGhost {
  width: 100% !important;
  box-sizing: border-box !important;
  padding: 8px 10px !important;
  min-height: 36px;
  border-radius: 14px !important;
  font-size: 13px !important;
}

.fieldStack :global(input),
.fieldStack input {
  width: 100%;
  box-sizing: border-box;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1.5px solid rgba(107, 79, 52, 0.65);
  background: #14143a;
  color: #f8eddc;
  outline: none;
  box-shadow: none;
}

.fieldStack :global(input):focus,
.fieldStack input:focus {
  border-color: rgba(107, 79, 52, 0.9);
}

.fieldStack input::placeholder {
   color: var(--ink);
  opacity: 0.6;
}

.roomCard .btn,
.roomCard button {
  width: 100%;
  box-sizing: border-box;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1.5px solid rgba(107, 79, 52, 0.65);
}

.roomCard .btn:not(.secondary):not(:disabled),
.roomCard button:not(:disabled):not(.secondary) {
  background: linear-gradient(180deg, #b495dc, #9d80d1);
  color: #6b4a33;
}

.roomCard .btn.secondary,
.roomCard button.secondary {
  background: transparent;
  color: #000000;
  border: 1px solid rgba(107, 79, 52, 0.45);
}

.roomCard .btn:disabled,
.roomCard button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.roomNativeInput {
  width: 100% !important;
  box-sizing: border-box !important;
  padding: 14px 16px !important;
  border-radius: 16px !important;
  border: 2px solid #9b7758 !important;
  background: rgba(255, 255, 255, 0.8) !important;
  color: #5b3f2a !important;
  outline: none !important;
  box-shadow: none !important;
  appearance: none !important;
  -webkit-appearance: none !important;
}

.roomNativeInput::placeholder {
  color: #8f7b63 !important;
}


.roomNativeInput:focus,
.roomNativeInput:active {
  background: #f2dfbf !important;
  color: #5b3f2a !important;
  border: 2px solid #9b7758 !important;
  box-shadow: none !important;
}

.roomNativeButton {
  width: 100% !important;
  box-sizing: border-box !important;
  padding: 14px 16px !important;
  border-radius: 16px !important;
  border: 2px solid #9b7758 !important;
  background:rgba(255, 253, 244, 0.8)  !important;
  color: #6b4a33 !important;
  font-weight: 700 !important;
  font-size: 16px !important;
  cursor: pointer !important;
  box-shadow: none !important;
  appearance: none !important;
  -webkit-appearance: none !important;
  transition: none !important;
}

.roomNativeButton:hover,
.roomNativeButton:focus,
.roomNativeButton:active {
  background: #ead3af !important;
  color: #6b4a33 !important;
  border: 2px solid #9b7758 !important;
  box-shadow: none !important;
  filter: none !important;
  transform: none !important;
}

.roomNativeButtonGhost {
  background: transparent !important;
  color: #6b4a33 !important;
  border: 2px solid #9b7758 !important;
}

.roomNativeButtonGhost:hover,
.roomNativeButtonGhost:focus,
.roomNativeButtonGhost:active {
  background: #ead3af !important;
  color: #6b4a33 !important;
  border: 2px solid #9b7758 !important;
}

.roomNativeButton:disabled,
.roomNativeButtonGhost:disabled {
  opacity: 0.65 !important;
  cursor: not-allowed !important;
}
  
        .statusMessage {
          padding: 12px 14px;
          border-radius: 16px;
          font-size: 14px;
          border: 1px solid transparent;
        }

        .statusMessage.error {
          background: var(--error-bg);
          border-color: var(--error-border);
          color: #8d4f45;
        }

        .settingsModal {
          position: fixed;
          inset: 0;
          z-index: 1000;
        }

        .settingsOverlay {
          position: absolute;
          inset: 0;
          background: rgba(76, 56, 38, 0.45);
          backdrop-filter: blur(4px);
        }

.settingsModal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
}

.settingsPanel {
  width: min(82vw, 370px);
  border-radius: 24px;
  overflow: visible;
}rflow: visible;
}
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 1100px) {
          .lobbyLayout {
            grid-template-columns: 1fr;
          }

          .roomGrid {
            grid-template-columns: 1fr;
          }

          .statsGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 780px) {
          .lobbyShell {
            padding: 16px;
          }

          .heroActions {
            grid-template-columns: 1fr;
          }

          .lobbyTopbar {
            align-items: stretch;
          }

          .topbarActions {
            width: 100%;
            justify-content: space-between;
          }
        }

        .categoryTitleRow {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.lobbyChatBadge {
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: #d96a6a;
  color: #fff8ee;
  font-size: 10px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 8px rgba(217, 106, 106, 0.35);
  flex-shrink: 0;
}
        
.settingsIconBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid rgba(107, 79, 52, 0.12);
  background: var(--brown);
  box-shadow: 0 10px 18px rgba(102, 69, 42, 0.18);
  cursor: pointer;
  transition: transform 0.18s ease;
}

.settingsIconBtn:hover {
  transform: translateY(-1px);
}

.settingsIconImg {
  display: block;
  width: 22px;
  height: 22px;
  object-fit: contain;
}

@media (max-width: 1100px) {
  .topNavShell {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding-top: 16px;
    padding-bottom: 16px;
  }

  .topNavCenter {
    justify-content: center;
  }

  .topNavRight {
    position: static;
    transform: none;
    justify-content: center;
    flex-wrap: wrap;
  }
}

.lobbyShell {
  width: 100%;
}

.lobbyTopbar {
  width: 100%;
}

.lobbyTopbar {
  margin-bottom: 18px;
}

.topNavShell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 76px;
  width: 100%;
  padding: 14px 190px 14px 22px; /* reserve room on right */
  border-radius: 28px;
  background: rgba(255, 248, 232, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.26);
  box-shadow:
    0 14px 34px rgba(107, 79, 52, 0.10),
    inset 0 1px 0 rgba(255,255,255,0.28);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.topNavCenter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  width: 100%;
  max-width: calc(100% - 220px);
  margin-left: 70px;
}

.topNavRight {
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 2;
}

.topNavItem {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 110px;
  padding: 12px 18px;
  border-radius: 999px;
  border: 1px solid rgba(107, 79, 52, 0.10);
  background: rgba(255, 253, 244, 0.52);
  color: var(--ink);
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: 0.18s ease;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.topNavQueueItem {
  min-width: 128px; /* smaller so it fits */
  padding: 10px 18px;
}

.topNavQueueImg {
  width: 42px;
  height: 42px;
  object-fit: contain;
  display: block;
  flex-shrink: 0;
}
.topNavItem:hover {
  transform: translateY(-1px);
  background: rgba(255, 253, 244, 0.72);
  border-color: rgba(107, 79, 52, 0.22);
  box-shadow: 0 8px 18px rgba(107, 79, 52, 0.10);
}

.topNavItem.active {
  background: rgba(255, 240, 205, 0.86);
  border-color: rgba(107, 79, 52, 0.28);
  box-shadow: 0 10px 20px rgba(176, 129, 53, 0.14);
}

.topNavBadge {
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: #d96a6a;
  color: #fff8ee;
  font-size: 10px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 8px rgba(217, 106, 106, 0.35);
  flex-shrink: 0;
}

.coinsPill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 15px;
  border-radius: 999px;
  background: rgba(255, 243, 210, 0.78);
  border: 1px solid rgba(171, 124, 40, 0.20);
  color: #6b4520;
  font-weight: 900;
  box-shadow: 0 8px 18px rgba(176, 129, 53, 0.10);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.coinsIcon {
  font-size: 15px;
  line-height: 1;
}
.settingsProfileBtn {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 120px;
  padding: 8px 14px 8px 10px;
  border-radius: 999px;
  border: 1px solid rgba(107, 79, 52, 0.12);
  background: rgba(255, 248, 232, 0.52);
  box-shadow: 0 10px 18px rgba(102, 69, 42, 0.12);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  cursor: pointer;
  overflow: visible;
}

.settingsProfileBtn:hover {
  transform: translateY(-1px);
  border-color: rgba(107, 79, 52, 0.22);
  box-shadow: 0 8px 18px rgba(107, 79, 52, 0.10);
}

.settingsProfileAvatar {
  width: 52px;
  height: 45px;   /* taller crop window so bigger image still shows */
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  flex-shrink: 0;
  background: transparent;
  border: none;
  margin-top: -12px;
  margin-bottom: -10px;
}

.settingsProfileAvatar img {
  width: 52px;
  height: 52px;
  object-fit: contain;
  object-position: center top;
  image-rendering: pixelated;
  display: block;
  background: transparent;
  border-radius: 0;
  transform: translateY(-1px);
}

.settingsProfileDivider {
  width: 1px;
  height: 24px;
  background: linear-gradient(
    180deg,
    rgba(107, 79, 52, 0.05),
    rgba(107, 79, 52, 0.22),
    rgba(107, 79, 52, 0.05)
  );
  flex-shrink: 0;
}
      `}</style>
    </div>
  );
}