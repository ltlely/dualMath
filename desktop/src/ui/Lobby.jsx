import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Card, Button } from "./components.jsx";
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
import { getSoundSettings, saveSoundSettings, applyVolume } from "./soundSettings";
import DailyCheck from "./DailyCheck.jsx";
import PublicLobby from "./PublicLobby.jsx";

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

const settingsIcon = "/settingsicon.png";

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
  dailyCheck,
}) {
const [showPublicLobbyPanel, setShowPublicLobbyPanel] = useState(false);
  const [settingsTab, setSettingsTab] = useState("account");
const [settingsEmail, setSettingsEmail] = useState(currentUser?.email || "");
const [newUsername, setNewUsername] = useState(currentUser?.username || "");
const [settingsMessage, setSettingsMessage] = useState("");
const [settingsError, setSettingsError] = useState("");
const [isSendingReset, setIsSendingReset] = useState(false);
const [isSavingUsername, setIsSavingUsername] = useState(false);
const friendsDrawerRef = useRef(null);
  const [roomName, setRoomName] = useState("");
  const [code, setCode] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [isJoiningRandom, setIsJoiningRandom] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
const queueSectionRef = useRef(null);
const [, setPresenceTick] = useState(0);
const DEFAULT_SOUND_SETTINGS = {
  music: 70,
  effects: 85,
};

const [soundSettings, setSoundSettings] = useState(() => getSoundSettings());
const [savedSoundSettings, setSavedSoundSettings] = useState(() => getSoundSettings());
const [isSavingSound, setIsSavingSound] = useState(false);
const [showFriendsDrawer, setShowFriendsDrawer] = useState(false);
   
const [showDailyCheck, setShowDailyCheck] = useState(false);


const updateSoundSetting = (key, value) => {
  const next = {
    ...soundSettings,
    [key]: Number(value),
  };

  setSoundSettings(next);

  window.dispatchEvent(
    new CustomEvent("dualmath:sound-preview", {
      detail: next,
    })
  );
};


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

useEffect(() => {
  if (!showFriendsDrawer) return;

  const handleClickOutside = (event) => {
    const clickedInsideDrawer = friendsDrawerRef.current?.contains(event.target);
    const clickedToggle = event.target.closest(".friendsDrawerToggle");

    if (!clickedInsideDrawer && !clickedToggle) {
      setShowFriendsDrawer(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, [showFriendsDrawer]);

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

const handleDailyClaim = async (reward) => {
  if (!currentUser || !reward) return;

  let addedCoins = 0;

  if (reward.type === "coins") {
    addedCoins = reward.amount;
  } else if (reward.type === "gift") {
    addedCoins = 1000;
  }

  const updatedUser = {
    ...currentUser,
    coins: (currentUser.coins ?? 2000) + addedCoins,
  };

  const result = await userManager.saveUser(updatedUser);
  const savedUser = result?.user || updatedUser;

  if (onLoginSuccess) {
    onLoginSuccess(savedUser);
  }
};

const totalUsersOnline = friends.filter((friend) => {
  const value = getComputedStatus(friend);
  return value === "online" || value === "in_room" || value === "in_match";
}).length;

 return (
  <div className="lobbyShell">
    <div className="lobbyTopbar">
<div className="topNavShell">
  
  <div className="topNavLeft">
<button
  type="button"
  className="topNavItem topNavDailyReward"
  onClick={() => setShowDailyCheck(true)}
  aria-label="Daily Reward"
  title="Daily Reward"
>
  <img src="/chest.png" alt="Daily Reward" className="topNavDailyRewardImg" />
</button>
  </div>
{/* <Button
  onClick={() =>
    onOpenPickCharacter?.({ id: "test-user", username: "TestUser" })
  }
>
  Open Pick Character
</Button> */}
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
      onClick={() => setShowQueue(true)}
    >
      Play
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

    {showDailyCheck && (
  <DailyCheck
    currentUser={currentUser}
    onClaim={handleDailyClaim}
    onClose={() => setShowDailyCheck(false)}
  />
)}

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

            <button
              type="button"
              className={`settingsTab ${settingsTab === "sound" ? "active" : ""}`}
              onClick={() => {
                setSettingsTab("sound");
                setSettingsMessage("");
                setSettingsError("");
              }}
            >
              Sound
            </button>

            {settingsTab === "sound" && (
              <div className="settingsSection">
                {[
                  ["music", "Music"],
                  ["effects", "Effects"],
                ].map(([key, label]) => (
                  <div className="soundRow" key={key}>
                    <div className="soundRowTop">
                      <label className="fieldLabel">{label}</label>
                      <span className="soundPercent">{soundSettings[key]}%</span>
                    </div>

                    <input
                      className="soundSlider"
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={soundSettings[key]}
                      onChange={(e) => updateSoundSetting(key, e.target.value)}
                    />
                  </div>
                ))}

                <div className="soundActions">
                  <button
                    type="button"
                    className="roomNativeButton roomNativeButtonGhost"
                    onClick={() => {
                      setSoundSettings(savedSoundSettings);
                      setSettingsMessage("");
                      setSettingsError("");
                      window.dispatchEvent(
                        new CustomEvent("dualmath:sound-preview", {
                          detail: savedSoundSettings,
                        })
                      );
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="roomNativeButton"
                    onClick={() => {
                      try {
                        setIsSavingSound(true);
                        saveSoundSettings(soundSettings);
                        setSavedSoundSettings(soundSettings);
                        setSettingsMessage("Sound settings saved.");
                        setSettingsError("");

                        window.dispatchEvent(
                          new CustomEvent("dualmath:sound-saved", {
                            detail: soundSettings,
                          })
                        );
                      } catch {
                        setSettingsError("Could not save sound settings.");
                        setSettingsMessage("");
                      } finally {
                        setIsSavingSound(false);
                      }
                    }}
                    disabled={isSavingSound}
                  >
                    {isSavingSound ? "Saving..." : "Save Sound"}
                  </button>
                </div>
              </div>
            )}

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

{/* <button
  type="button"
  className="topNavItem"
  onClick={onOpenGame}
>
  Open Game
</button> */}

    <div className="lobbyLayout lobbySparkles ">
      {!showQueue ? (
        <div className="mainPanelWrapper">
          <main className="mainPanel">
            <section className="statsPanel">
              <div className="panelHeader">
                <div>
                  <div className="miniLabel">Stats</div>
                  <h3>Your Progress</h3>
                </div>
              </div>


           
              <div className="statsGrid">
                <div className="statItem rankStatCard">
                  <div className="statLabel">Rank</div>
                  <div className="statValue">{stats.rank}</div>
                  <div className="statSubtext">{stats.rankPoints} RP</div>
                </div>

                <div className="statItem winsStatCard">
                  <div className="statLabel">Wins</div>
                  <div className="statValue">{stats.wins}</div>
                  <div className="statSubtext">{stats.totalGames} total games</div>
                </div>

                <div className="statItem lossesStatCard">
                  <div className="statLabel">Losses</div>
                  <div className="statValue">{stats.losses}</div>
                  <div className="statSubtext">{stats.winRate}% win rate</div>
                </div>
              </div>
             

              <div className="rankProgressSection">
                <div className="rankProgressHeader">
                  <div className="currentRankBadge">
                    <span className="rankLabelTop">Rank</span>

                    <div className="rankNameRow">
                      <span className="rankName">{stats.rank}</span>
                    </div>

                    <div className="rankAvatarWrap">
                      {currentUser?.avatarData ? (
                        <img
                          className="rankAvatarImg"
                          src={currentUser.avatarData}
                          alt={currentUser.username || "Avatar"}
                        />
                      ) : (
                        <img
                          className="rankAvatarImg"
                          src={getRankImage(stats.rank)}
                          alt={stats.rank}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="progressTopRow">
                  <div className="currentProgressBadge">
                    <img
                      className="nextRankBadgeImg"
                      src={getRankImage(stats.rank)}
                      alt={stats.rank}
                    />
                    <span className="nextRankBadgeName">{stats.rank}</span>
                  </div>

                  {nextRank && (
                    <div className="nextProgressBadge">
                      <span className="arrowIcon">→</span>
                      <img
                        className="nextRankBadgeImg"
                        src={getRankImage(nextRank)}
                        alt={nextRank}
                      />
                      <span className="nextRankBadgeName">{nextRank}</span>
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
        </div>
      ) : (
        <main className="mainPanel queuePanel" ref={queueSectionRef}>
          <div className="queuePanelHeader">
            <div>
              <div className="miniLabel">Dual Math</div>
              <h3>Find a Match</h3>
            </div>
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
                    const cleaned = e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 5);
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

<button
  type="button"
  className={`friendsDrawerToggle ${showFriendsDrawer ? "open" : ""}`}
  onClick={() => setShowFriendsDrawer((prev) => !prev)}
  aria-label={showFriendsDrawer ? "Hide friends online" : "Show friends online"}
  title={showFriendsDrawer ? "Hide friends online" : "Show friends online"}
>
  <span className="friendsDrawerToggleArrow">
    {showFriendsDrawer ? "→" : "←"}
  </span>
</button>

<div
  ref={friendsDrawerRef}
  className={`friendsDrawer ${showFriendsDrawer ? "open" : ""}`}
>
      <div className="friendsDrawerInner">
<div className="friendsHeaderRow">
  <div className="sidebarSectionTitle">
    {showPublicLobbyPanel ? "Public Lobby" : "Your Friends"}
  </div>

  <PublicLobby
    totalUsersOnline={totalUsersOnline}
    isOpen={showPublicLobbyPanel}
    onToggle={() => setShowPublicLobbyPanel((prev) => !prev)}
  />
</div>

<div className="onlineFriendsCard">
  <div className="onlineFriendsHeader">
    <div>
      <div className="miniLabel">
        {showPublicLobbyPanel ? "Players Online" : "Friends Online"}
      </div>
      <div className="onlineFriendsTitle">
        {showPublicLobbyPanel
          ? `${totalUsersOnline} online`
          : `${visibleOnlineFriends.length} online`}
      </div>
    </div>

    {!showPublicLobbyPanel && (
      <button
        type="button"
        className="onlineFriendsViewAll"
        onClick={onOpenFriends}
      >
        View
      </button>
    )}
  </div>

  <div
    className="onlineFriendsList"
    onScroll={() => {
      setIsOnlineFriendsScrolling?.(true);
      clearTimeout(window.__onlineFriendsScrollTimer);
      window.__onlineFriendsScrollTimer = setTimeout(() => {
        setIsOnlineFriendsScrolling?.(false);
      }, 150);
    }}
  >
    {showPublicLobbyPanel ? (
      visibleOnlineFriends.length > 0 ? (
        visibleOnlineFriends.map((friend) => (
          <button
            key={friend.id}
            type="button"
            className="onlineFriendRow"
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
                  <img
                    className="onlineFriendRankBadge"
                    src={getRankImage(userManager.getUserRank(friend))}
                    alt={userManager.getUserRank(friend)}
                  />
                </div>
                <div className="onlineFriendSub">
                  {friend.rankPoints ?? 0} RP
                </div>
              </div>
            </div>
          </button>
        ))
      ) : (
        <div className="onlineFriendsEmpty">No players online right now.</div>
      )
    ) : visibleOnlineFriends.length > 0 ? (
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
                <img
                  className="onlineFriendRankBadge"
                  src={getRankImage(userManager.getUserRank(friend))}
                  alt={userManager.getUserRank(friend)}
                />
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
    </div>

      <style>{`
:root {
  --base: rgba(204, 173, 92, 0.96);
  --cream: #fff3d6;
  --cream-2: #ffefc8;
  --cream-3: #f7e2ad;
  --tan: #e5c28a;
  --tan-2: #d6ae6b;
  --brown: #9a6c34;
  --brown-dark: #6b4520;
  --brown-soft: #bf8d56;
  --brown-light: #e4bc8e;
  --gold: #e0ab3f;
  --gold-2: #edbb57;
  --gold-3: #f7cd76;
  --ink: #5a3817;
  --muted: #9d754c;
  --card-border: #d2a75c;
  --success-bg: rgba(179, 132, 55, 0.16);
  --success-border: rgba(179, 132, 55, 0.42);
  --error-bg: rgba(190, 92, 72, 0.15);
  --error-border: rgba(190, 92, 72, 0.38);
  --glow-gold: 0 0 40px rgba(224, 171, 63, 0.24);
  --glow-brown: 0 0 24px rgba(154, 108, 52, 0.22);
}



 .lobbyLayout {
        display: block;
        width: 100%;
        min-height: 0;
        height: calc(100vh - 140px);
      }

      .sidebarPanel {
        display: none;
      }

    .friendsDrawerToggle {
  position: fixed;
  right: 0;
  top: 46%;
  transform: translateY(-50%);
  z-index: 40;

  width: 46px;
  height: 70px;
  border: 1px solid rgba(107, 79, 52, 0.18);
  border-right: none;
  border-radius: 18px 0 0 18px;
  background: linear-gradient(180deg, rgba(255, 248, 232, 0.96), rgba(229, 194, 138, 0.96));
  color: var(--brown-dark);
  box-shadow: 0 12px 24px rgba(107, 79, 52, 0.14);
  cursor: pointer;

  display: flex;
  align-items: center;
  justify-content: center;

  transition: right 0.25s ease, transform 0.2s ease;
}

.friendsDrawerToggleArrow {
  font-size: 24px;
  line-height: 1;
  font-weight: 900;
}

.friendsDrawerToggle.open {
  right: min(340px, 88vw);
}

.onlineFriendNameRow {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.onlineFriendName {
  font-weight: 800;
  white-space: nowrap;
}

.onlineFriendRankBadge {
  width: 26px;
  height: 26px;
  object-fit: contain;
  flex-shrink: 0;
  margin-left: 0px;
}
    

      .friendsDrawer {
        position: fixed;
        top: 0;
        right: 0;
        height: 100dvh;
        width: min(340px, 88vw);
        z-index: 35;
        pointer-events: none;
      }

      .friendsDrawerInner {
        position: absolute;
        top: 110px;
        right: 0;
        bottom: 24px;
        width: 100%;
        padding: 18px;
        box-sizing: border-box;
        background: linear-gradient(180deg, rgba(245, 220, 164, 0.96), rgba(229, 194, 138, 0.96));
        border-left: 1px solid rgba(255, 255, 255, 0.25);
        box-shadow: -18px 0 40px rgba(107, 79, 52, 0.16);
        transform: translateX(100%);
        transition: transform 0.25s ease;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      .friendsDrawerInner::-webkit-scrollbar {
        display: none;
      }

      .friendsDrawer.open {
        pointer-events: auto;
      }

      .friendsDrawer.open .friendsDrawerInner {
        transform: translateX(0);
      }

      .friendsDrawerToggle.open {
        right: min(340px, 88vw);
      }

    .lobbyLayout {
  display: block !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  height: calc(100vh - 140px) !important;
}

.mainPanelWrapper {
  width: 100% !important;
  min-width: 0 !important;
  display: flex !important;
  justify-content: center !important;
}

.queuePanel {
  width: 100% !important;
  max-width: 1200px !important;
  margin: 0 auto !important;
  padding: 0 12px 24px !important;
  box-sizing: border-box;
}

.queuePanelHeader {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto 16px;
}

.roomGrid {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  justify-content: center;
}

.mainPanel {
  width: 100% !important;
  max-width: 1500px !important;
  min-width: 0 !important;
}

.statsPanel {
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  padding: 16px !important;
}

.statsGrid,
.rankProgressSection {
  width: min(100%, 1100px) !important;
  max-width: 1100px !important;
  min-width: 0 !important;
  margin-left: auto !important;
  margin-right: auto !important;
}

.sidebarPanel {
  display: none !important;
}


/* ─── LOBBY SHELL ─────────────────────────────────────────────── */

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

.lobbyTopbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 18px;
  flex-wrap: wrap;
  width: 100%;
}

.lobbyHeading {
  margin: 6px 0 8px;
  font-size: clamp(34px, 5vw, 52px);
  line-height: 1;
  font-weight: 900;
  color: var(--ink);
}

.welcomeText {
  color: var(--muted);
  font-size: 15px;
}

.lobbyLayout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 18px;
  min-height: 0;
  height: calc(100vh - 140px);
  align-items: start;
}




/* ─── TOP NAV ─────────────────────────────────────────────────── */

.topNavShell {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  width: 100%;
  min-height: 76px;
  padding: 14px 24px;
  border-radius: 28px;
  background: rgba(255, 248, 232, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.26);
  box-shadow:
    0 14px 34px rgba(107, 79, 52, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
/* Remove position:absolute from topNavCenter */
.topNavLeft {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-width: 0;
}

.topNavCenter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  white-space: nowrap;
}

.topNavRight {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-width: 0;
}

.topNavItem {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 96px;
  padding: 12px 18px;
  border-radius: 999px;
  border: 1px solid rgba(107, 79, 52, 0.10);
  background: rgba(255, 253, 244, 0.52);
  color: var(--ink);
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: 0.18s ease;
  white-space: nowrap;
  flex-shrink: 0;
}
  
.topNavItem:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 22px rgba(176, 129, 53, 0.18);
}

.topNavQueueItem {
  position: relative;
  min-width: 132px;
  padding: 12px 18px; /* same as topNavItem */
  background: linear-gradient(180deg, #ffe9b8, #e7be73);
  border: 1px solid rgba(107, 79, 52, 0.22);
  box-shadow:
    0 10px 22px rgba(176, 129, 53, 0.18),
    0 0 18px rgba(224, 171, 63, 0.16);
}

.coinsPill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 243, 210, 0.78);
  border: 1px solid rgba(171, 124, 40, 0.20);
  color: #6b4520;
  font-weight: 900;
  box-shadow: 0 8px 18px rgba(176, 129, 53, 0.10);
  white-space: nowrap;
  flex-shrink: 0;
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

.topNavQueueItem {
  position: relative;
  min-width: 128px;
  padding: 10px 18px;
  background: linear-gradient(180deg, #ffe9b8, #e7be73);
  border: 1px solid rgba(107, 79, 52, 0.22);
  box-shadow:
    0 10px 22px rgba(176, 129, 53, 0.18),
    0 0 18px rgba(224, 171, 63, 0.16);
}

.topNavQueueItem::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 100%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 14px solid transparent;
  border-right: 14px solid transparent;
  border-top: 12px solid #e7be73;
}

.topNavQueueItem:hover {
  background: linear-gradient(180deg, #fff0c8, #edc980);
  box-shadow:
    0 12px 24px rgba(176, 129, 53, 0.22),
    0 0 22px rgba(224, 171, 63, 0.22);
}

.topNavQueueItem:hover::after {
  border-top-color: #edc980;
}

.topNavQueueItem.active {
  background: linear-gradient(180deg, #ffe7b0, #dca95a);
  border-color: rgba(107, 79, 52, 0.32);
  box-shadow:
    0 12px 24px rgba(176, 129, 53, 0.24),
    0 0 24px rgba(224, 171, 63, 0.28);
}

.topNavQueueItem.active::after {
  border-top-color: #dca95a;
}

.topNavQueueImg {
  width: 42px;
  height: 42px;
  object-fit: contain;
  display: block;
  flex-shrink: 0;
}

/* ─── TOPBAR ACTIONS / PILLS ──────────────────────────────────── */

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

.coinsPill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 243, 210, 0.78);
  border: 1px solid rgba(171, 124, 40, 0.20);
  color: #6b4520;
  font-weight: 900;
  box-shadow: 0 8px 18px rgba(176, 129, 53, 0.10);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  white-space: nowrap;
  flex-shrink: 0;
}

.coinsIcon {
  font-size: 15px;
  line-height: 1;
}

.coinsImg {
  width: 28px;
  height: 28px;
  object-fit: contain;
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}

/* ─── CONNECTION DOT ──────────────────────────────────────────── */

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
  animation: pulse 1.5s infinite;
}

.connectionDot.in_room {
  background: #e0ab3f;
  box-shadow: 0 0 10px rgba(224, 171, 63, 0.55);
}

.connectionDot.in_match {
  background: #d96a6a;
  box-shadow: 0 0 10px rgba(217, 106, 106, 0.65);
}

/* ─── SETTINGS PROFILE BUTTON ─────────────────────────────────── */

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
  height: 45px;
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

/* ─── SETTINGS ICON BTN ───────────────────────────────────────── */

.settingsIconBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid rgba(107, 79, 52, 0.12);
  background: var(--brown);
  box-shadow: 0 10px 18px rgba(102, 69, 42, 0.18);
  font-size: 18px;
  color: #f9f1dd;
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

/* ─── MAIN PANEL ──────────────────────────────────────────────── */

.mainPanelWrapper {
  width: 100%;
  min-width: 0;
  display: block;
}

.mainPanel {
  background: none !important;
  border: none !important;
  display: grid;
  gap: 18px;

  width: 100%;
  max-width: 100%;
  min-width: 0;
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

/* ─── HERO PANEL ──────────────────────────────────────────────── */

.heroPanel,
.roomCard {
  background: linear-gradient(180deg, var(--cream), var(--tan));
  border: 1px solid rgba(93, 88, 63, 0.08);
  border-radius: 28px;
}

.heroPanel {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: stretch;
  flex-wrap: wrap;
  box-shadow: 0 16px 32px rgba(95, 70, 48, 0.08);
  padding: 20px;
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

/* ─── STATS PANEL (doc 2 = newer) ────────────────────────────── */

.panelHeader {
  display: none;
}


.statsGrid::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.45) 0 1px, transparent 1.6px),
    radial-gradient(circle, rgba(255, 245, 220, 0.28) 0 1px, transparent 1.7px),
    radial-gradient(circle, rgba(255, 255, 255, 0.22) 0 1.2px, transparent 1.9px);
  background-size: 120px 120px, 160px 160px, 210px 210px;
  background-position: 18px 14px, 64px 42px, 110px 20px;
  opacity: 0.5;
}

.statsGrid::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 28%, rgba(255, 255, 255, 0.22), transparent 10%),
    radial-gradient(circle at 72% 36%, rgba(255, 248, 230, 0.18), transparent 12%),
    radial-gradient(circle at 52% 70%, rgba(255, 255, 255, 0.12), transparent 14%);
  filter: blur(10px);
  opacity: 0.9;
}

.statItem {
  position: relative;
  min-height: 124px;
  padding: 22px 18px 16px;
  text-align: center;
  border-radius: 26px;
  border: 1px solid rgba(165, 123, 68, 0.26);
  background: linear-gradient(180deg, rgba(255, 249, 240, 0.86), rgba(241, 222, 191, 0.82));
  box-shadow:
    0 12px 24px rgba(103, 73, 40, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.58);
  overflow: hidden;
  z-index: 1;
}

.statItem::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.32) 0 1px, transparent 1.7px),
    radial-gradient(circle, rgba(255, 241, 214, 0.24) 0 1px, transparent 1.7px);
  background-size: 90px 90px, 130px 130px;
  background-position: 12px 10px, 50px 30px;
  opacity: 0.45;
}

.rankStatCard {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  min-height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border-radius: 0 !important;
}

.rankStatCard::before,
.rankStatCard::after,
.rankStatCard .statLabel,
.rankStatCard .statValue,
.rankStatCard .statSubtext {
  display: none !important;
}

/* LEFT = wins, RIGHT = losses */
.statsGrid .statItem:nth-child(1) {
  order: 2;
  width: 100%;
  min-width: 390px;
  min-height: 230px;
  padding: 18px 22px 18px;
  border-radius: 28px;
  z-index: 3;
  justify-self: center;
}

.statsGrid .statItem:nth-child(2) {
  order: 1;
  width: calc(100% + 22px);
  margin-right: -22px !important;
  margin-left: 0 !important;
  min-height: 150px;
  border-top-right-radius: 18px;
  border-bottom-right-radius: 18px;
}

.statsGrid .statItem:nth-child(3) {
  order: 3;
  width: calc(100% + 22px);
  margin-left: -22px !important;
  margin-right: 0 !important;
  min-height: 150px;
  border-top-left-radius: 18px;
  border-bottom-left-radius: 18px;
}

.winsStatCard,
.lossesStatCard {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.winsStatCard .statLabel,
.lossesStatCard .statLabel {
  text-align: center;
  font-size: clamp(11px, 0.7vw, 14px);
}

.winsStatCard .statValue,
.lossesStatCard .statValue {
  text-align: center;
  font-size: clamp(24px, 1.6vw, 34px);
  line-height: 1.05;
}

.currentRankBadge {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;
}
  
.currentRankBadge {
  text-align: center;
}

.currentRankBadge .rankLabelTop,
.currentRankBadge .rankName,
.currentRankBadge .rankNameRow {
  width: 100%;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
}

.currentRankBadge .rankLabelTop {
  font-size: clamp(14px, 0.9vw, 20px);
  line-height: 1.1;
}

.currentRankBadge .rankName {
  font-size: clamp(15px, 1.4vw, 28px);
  line-height: 1.1;
}

.winsStatCard .statSubtext,
.lossesStatCard .statSubtext {
  text-align: center;
  font-size: clamp(13px, 0.9vw, 17px);
}

.statsGrid .statItem:nth-child(1) .statLabel {
  font-size: 12px;
  margin-bottom: 5px;
}

.statsGrid .statItem:nth-child(1) .statValue {
  font-size: 18px;
  margin-top: 0;
  margin-bottom: 10px;
}

.statsGrid .statItem:nth-child(1) .statSubtext {
  font-size: 13px;
  margin-top: 40px;
}

.winsStatCard {
  margin-right: 0px !important;
  background: linear-gradient(180deg, rgba(248, 238, 220, 0.9), rgba(37, 124, 80, 0.84));
}

.lossesStatCard {
  margin-left: 0px !important;
  background: linear-gradient(180deg, rgba(248, 238, 220, 0.9), rgba(163, 68, 68, 0.84));
}

.statLabel {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #a57b4d;
}

.statValue {
  margin-top: 10px;
  font-size: 24px;
  font-weight: 900;
  line-height: 1.05;
  color: #6c4725;
}

.statSubtext {
  margin-top: 8px;
  font-size: 13px;
  color: #8f7455;
}

/* ─── RANK PROGRESS SECTION ───────────────────────────────────── */

.statsPanel {
  padding: 16px;
  width: 100%;
  max-width: none;
  margin: 0;
  background: none;
  border: none;
}

.statsGrid,
.rankProgressSection {
  width: min(100%, 2400px);
  margin-left: auto;
  margin-right: auto;
}

.statsGrid .statItem:nth-child(2),
.statsGrid .statItem:nth-child(3) {
  min-height: 250px;
}

@keyframes statsGridFloat {
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
  100% {
    transform: translateY(0);
  }
}

.statsGrid {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 390px 1fr;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  margin-bottom: 22px;
  padding: 14px 14px 12px;
  overflow: visible;
  animation: statsGridFloat 4s ease-in-out infinite;
}

.statsGrid::before {
  box-shadow: none;
}


.rankProgressSection {
  padding: 14px 18px 16px;
  border-top: none;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(246, 236, 216, 0.52), rgba(239, 225, 201, 0.38));
  border: 1px solid rgba(205, 181, 143, 0.22);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.rankProgressSection {
  box-shadow:
    0 18px 26px -10px rgba(224, 171, 63, 0.16),
    0 34px 54px -22px rgba(224, 171, 63, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}


.currentRankBadge {
  position: absolute;
  left: 50%;
  top: -310px;
  transform: translateX(-50%);

  width: clamp(390px, 34vw, 560px);
  height: 290px;

  padding: 16px 18px 0;
  border-radius: 28px;

  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;
  gap: 10px;

  background:
    radial-gradient(circle at center, rgba(255, 255, 255, 0.5), transparent 62%),
    linear-gradient(180deg, rgba(255, 252, 247, 0.98), rgba(184, 135, 38, 0.95));
  border: 1px solid rgba(207, 186, 148, 0.34);
  box-shadow:
  0 0 20px rgba(255, 255, 255, 0.55),
  0 0 50px rgba(255, 244, 210, 0.35),
  0 18px 40px rgba(104, 78, 47, 0.14),
  inset 0 1px 0 rgba(255, 255, 255, 0.95);
  z-index: 5;
}

.winsStatCard,
.lossesStatCard {
  box-shadow:
    0 0 24px rgba(255, 221, 120, 0.45),
    0 0 56px rgba(224, 171, 63, 0.24),
    0 12px 24px rgba(103, 73, 40, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.58) !important;
}

.rankLabelTop,
.rankNameRow {
  width: 100%;
  text-align: center;
}

.rankNameRow {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
}

.rankAvatarWrap {
  width: 100%;
  height: 235px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
  line-height: 0;
  margin-top: auto;
}

.rankAvatarImg {
  width: 250px;
  height: 250px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
  padding: 0;
  transform: translateY(48px);
 filter:
    drop-shadow(0 0 8px rgba(255, 230, 150, 0.7))
    drop-shadow(0 0 16px rgba(237, 187, 87, 0.5));
}

.rankLabelTop {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #b39468;
  margin-bottom: 2px;
  line-height: 1;
  transform: translateY(0px);
}

.rankName {
  margin-top: -12px;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: center;
  color: #6b4a2f;
}

.winsStatCard,
.lossesStatCard {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
}

.winsStatCard {
  clip-path: polygon(18% 0, 100% 0, 100% 100%, 18% 100%, 0 50%);
}

.lossesStatCard {
  clip-path: polygon(0 0, 82% 0, 100% 50%, 82% 100%, 0 100%);
}


.rankIcon {
  width: 46px;
  height: 46px;
  object-fit: contain;
  display: inline-block;
  vertical-align: middle;
}

.nextRankInfo {
  margin-left: auto;
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
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(107, 79, 52, 0.18);
  border-radius: 999px;
  overflow: hidden;
  position: relative;
  box-shadow:
    0 0 28px rgba(255, 221, 120, 0.52),
    0 0 64px rgba(224, 171, 63, 0.34),
    0 14px 28px rgba(103, 73, 40, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.68);
}

.progressBarFill {
  height: 100%;
  border-radius: 999px;
  position: relative;
  transition: width 0.4s ease;
  background: linear-gradient(90deg, var(--gold), var(--gold-2), var(--brown-soft));
  box-shadow: 0 0 12px rgba(205, 162, 90, 0.35);
}

.progressGlow {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
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
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.35);
  border: 1px solid rgba(107, 79, 52, 0.12);
  border-radius: 14px;
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

/* ─── ROOM GRID & CARDS ───────────────────────────────────────── */

.roomGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  height: fit-content;
  padding: 0 20px 20px;
}

.roomCard {
  background: rgba(255, 253, 244, 0.8) !important;
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

.fieldStack input:focus {
  border-color: rgba(107, 79, 52, 0.9);
}

.fieldStack input::placeholder {
  color: var(--ink);
  opacity: 0.6;
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
  min-height: 36px;
  font-size: 13px !important;
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
  background: rgba(255, 253, 244, 0.8) !important;
  color: #6b4a33 !important;
  font-weight: 700 !important;
  font-size: 16px !important;
  cursor: pointer !important;
  box-shadow: none !important;
  appearance: none !important;
  -webkit-appearance: none !important;
  transition: none !important;
  min-height: 36px;
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
  width: 100% !important;
  box-sizing: border-box !important;
  padding: 14px 16px !important;
  border-radius: 16px !important;
  min-height: 36px;
  font-size: 13px !important;
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

/* ─── SIDEBAR / PLAYER MINI CARD ──────────────────────────────── */

.playerMiniCard {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 14px;
  padding: 14px;
  border-radius: 22px;
  background: linear-gradient(180deg, #f9f7ea 0%, var(--cream-3) 100%);
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

/* ─── CATEGORY BUTTONS ────────────────────────────────────────── */

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

.categoryCopy {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.categoryTitle {
  font-weight: 700;
}

.categoryTitleRow {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.categoryCount {
  color: var(--muted);
  font-size: 12px;
}

/* ─── SUMMARY CARD ────────────────────────────────────────────── */

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

/* ─── QUEUE PANEL ─────────────────────────────────────────────── */

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

.queueSection {
  display: grid;
  gap: 12px;
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
  display: grid;
  place-items: center;
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

/* ─── SOUND ───────────────────────────────────────────────────── */

.soundGroup {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 18px;
  background: rgba(255, 253, 244, 0.5);
  border: 1px solid rgba(93, 88, 63, 0.08);
}

.soundGroup + .soundGroup {
  margin-top: 2px;
}

.soundGroupTitle {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--brown-dark);
}

.soundRow {
  display: grid;
  gap: 8px;
  margin-bottom: 10px;
}

.dailyRewardInline {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 12px 0 18px;
}

.soundRowTop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.soundPercent {
  font-size: 13px;
  font-weight: 800;
  color: var(--brown-dark);
}

.soundSlider {
  width: 100%;
  accent-color: #b78642;
  cursor: pointer;
}

.soundActions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

/* ─── ONLINE FRIENDS ──────────────────────────────────────────── */

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

.onlineFriendsEmpty {
  padding: 10px;
  border-radius: 14px;
  background: rgba(255, 253, 244, 0.65);
  color: var(--muted);
  font-size: 12px;
  text-align: center;
}

/* ─── SETTINGS ────────────────────────────────────────────────── */

.settingsCard {
  width: 100%;
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

.settingsTab:hover,
.queueCloseBtn:hover,
.onlineFriendsViewAll:hover {
  transform: translateY(-1px);
  border-color: rgba(107, 79, 52, 0.22);
  box-shadow: 0 8px 18px rgba(107, 79, 52, 0.10);
}

.settingsSection {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settingsModal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
}

.settingsOverlay {
  position: absolute;
  inset: 0;
  background: rgba(76, 56, 38, 0.45);
  backdrop-filter: blur(4px);
}

.settingsPanel {
  width: min(82vw, 370px);
  border-radius: 24px;
  overflow: visible;
}

/* ─── LABELS ──────────────────────────────────────────────────── */

.miniLabel,
.sidebarSectionTitle,
.summaryLabel,
.fieldLabel {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 11px;
  color: var(--muted);
}

.sidebarSectionTitle {
  margin-top: 0;
}

/* ─── BADGES ──────────────────────────────────────────────────── */

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

/* ─── STATUS MESSAGES ─────────────────────────────────────────── */

.statusMessage {
  padding: 12px 14px;
  border-radius: 16px;
  font-size: 14px;
  border: 1px solid transparent;
}

.statusMessage.success {
  background: var(--success-bg);
  border-color: var(--success-border);
  color: #6b5b34;
}

.statusMessage.error {
  background: var(--error-bg);
  border-color: var(--error-border);
  color: #8d4f45;
}

/* ─── MISC IMAGES ─────────────────────────────────────────────── */

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

/* ─── KEYFRAMES ───────────────────────────────────────────────── */

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ─── RESPONSIVE ──────────────────────────────────────────────── */

@media (max-width: 1100px) {
  .lobbyLayout {
    grid-template-columns: 1fr;
  }

  .roomGrid {
    grid-template-columns: 1fr;
  }

  .statsGrid {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 20px 14px 14px;
  }

  .statsGrid .statItem:nth-child(1),
  .statsGrid .statItem:nth-child(2),
  .statsGrid .statItem:nth-child(3) {
    order: initial;
    margin: 0;
    min-height: auto;
    border-radius: 22px;
  }

  .currentRankBadge {
    position: static;
    transform: none;
    width: 280px;
    top: -142px;
    min-height: auto;
    margin-bottom: 12px;
  }

.rankProgressHeader {
  position: relative;
  width: 100%;
  min-height: 0;
}

  .nextRankInfo {
    margin-left: 0;
    align-self: flex-end;
  }

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
    width: 100%;
  }

  .roomCard {
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

.progressTopRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.currentProgressBadge {
  display: inline-flex;
  align-items: center;
  padding: 5px 15px 8px 8px;
  border-radius: 999px;
  background: rgba(255, 253, 244, 0.7);
  border: 1px solid rgba(107, 79, 52, 0.14);
}

.currentProgressBadge img {
  transform: translateY(0px);
  margin-right: 8px;
}

.nextProgressBadge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 5px;
}

.nextProgressBadge {
  margin-left: auto;
}

.rankBadgeImg {
  width: 24px;
  height: 24px;
  object-fit: contain;
  display: block;
  flex: 0 0 auto;
  
}

.nextRankInfo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.nextRankInfo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.nextRankBadge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 253, 244, 0.7);
  border: 1px solid rgba(107, 79, 52, 0.14);
}

.nextRankBadgeImg {
  width: 24px;
  height: 24px;
  object-fit: contain;
  display: block;
 transform: translateY(-1px);
}

.nextRankBadgeName {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--brown-dark);
}

.arrowIcon {
  color: var(--muted);
  flex: 0 0 auto;
  transform: translateY(-2.5px);
}

.rankProgressSection {
  position: relative;
}

@keyframes lobbySparkleDrift {
  0% {
    transform: translateY(0) translateX(0);
    opacity: 0.7;
  }
  50% {
    transform: translateY(-6px) translateX(4px);
    opacity: 1;
  }
  100% {
    transform: translateY(0) translateX(0);
    opacity: 0.7;
  }
}

@keyframes lobbySparkleGlow {
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.75;
  }
}

.lobbySparkles {
  position: relative;
  z-index: 0;
}

.lobbySparkles > * {
  position: relative;
  z-index: 2;
}

.lobbySparkles::before,
.lobbySparkles::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: 28px;
  z-index: 1;
}

.lobbySparkles::before {
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.95) 0 1px, transparent 2px),
    radial-gradient(circle, rgba(255, 240, 190, 0.9) 0 1.2px, transparent 2.2px),
    radial-gradient(circle, rgba(255, 255, 255, 0.75) 0 0.8px, transparent 1.8px);
  background-size: 140px 140px, 180px 180px, 220px 220px;
  background-position: 18px 20px, 90px 60px, 150px 30px;
  animation: lobbySparkleDrift 5s linear infinite;
  opacity: 0.8;
}

.lobbySparkles::after {
  background:
    radial-gradient(circle at 18% 30%, rgba(255, 255, 255, 0.18), transparent 10%),
    radial-gradient(circle at 76% 35%, rgba(255, 245, 210, 0.14), transparent 12%),
    radial-gradient(circle at 55% 75%, rgba(255, 255, 255, 0.12), transparent 14%);
  filter: blur(10px);
  animation: lobbySparkleGlow 2.4s ease-in-out infinite;
}

.topNavDailyReward {
  min-width: 42px;
  width: 42px;
  height: 42px;
  padding: 0;

  background: transparent;
  border: none;
  box-shadow: none;

  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.topNavDailyRewardImg {
  width: 96px;
  height: 96px;
  object-fit: contain;
  display: block;
  filter:
    drop-shadow(0 0 6px rgba(255, 215, 120, 0.95))
    drop-shadow(0 0 14px rgba(224, 171, 63, 0.75))
    drop-shadow(0 0 26px rgba(224, 171, 63, 0.45));
}

.publicLobbyStatusLine {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.publicLobbyStatusText {
  font-size: 22px;
  font-weight: 900;
  color: var(--brown-dark);
  line-height: 1.2;
}

.publicLobbyInline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.publicLobbyInline {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.publicLobbyText {
  font-size: 11px;
  font-weight: 800;
  color: var(--brown-dark);
  white-space: nowrap;
  line-height: 1;
}

.publicLobbyActionBtn {
  border: 1px solid rgba(107, 79, 52, 0.14);
  background: rgba(255, 253, 244, 0.72);
  color: var(--brown-dark);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
  height: 24px;
  min-width: 36px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.friendsHeaderRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.friendsHeaderRow .sidebarSectionTitle {
  font-size: 12px;
  white-space: nowrap;
}
      `}</style>
    </div>
  );
}