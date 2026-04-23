import React, { useEffect, useMemo, useState } from "react";
import { userManager } from "../userManagerSupabase.js";

const rankImages = {
  "Novice": "/noviceApprenticeRank.png",
  Apprentice: "/noviceApprenticeRank.png",
  Skilled: "/skilledRank.png",
  Professional: "/professionalRank.png",
  Expert: "/expertRank.png",
  King: "/kingRank.png",
};

function getRankImage(rank) {
  return rankImages[rank] || "/noviceApprenticeRank.png";
}

function getWinRate(user) {
  const wins = user?.wins ?? 0;
  const losses = user?.losses ?? 0;
  const total = wins + losses;
  if (!total) return 0;
  return Math.round((wins / total) * 100);
}

export default function Profile({
  profileUser,
  currentUser,
  onClose,
  onProfileSaved,
}) {
  const [statusText, setStatusText] = useState(profileUser?.profileStatus || "");
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
const [isBlocked, setIsBlocked] = useState(false);
const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
  if (!message) return;

  const timer = setTimeout(() => {
    setMessage("");
  }, 2500);

  return () => clearTimeout(timer);
}, [message]);

useEffect(() => {
  if (!message && !error) return;

  const timer = setTimeout(() => {
    setMessage("");
    setError("");
  }, 2500);

  return () => clearTimeout(timer);
}, [message, error]);

useEffect(() => {
  let ignore = false;

  const loadRelationshipState = async () => {
    if (!currentUser?.id || !profileUser?.id || currentUser.id === profileUser.id) {
      if (!ignore) {
        setIsFriend(false);
        setIsBlocked(false);
      }
      return;
    }

    try {
      const [friendsResult, blockedResult] = await Promise.all([
        userManager.getFriends(currentUser.id),
        userManager.getBlockedUsers(currentUser.id),
      ]);

      const friendsData = Array.isArray(friendsResult)
        ? friendsResult
        : (friendsResult?.data || []);

      const blockedData = blockedResult || [];

      if (!ignore) {
        setIsFriend(friendsData.some((user) => String(user.id) === String(profileUser.id)));
        setIsBlocked(blockedData.some((user) => String(user.id) === String(profileUser.id)));
      }
    } catch (err) {
      console.error("Failed to load relationship state:", err);
    }
  };

  loadRelationshipState();
  return () => {
    ignore = true;
  };
}, [currentUser?.id, profileUser?.id]);


useEffect(() => {
  setStatusText(profileUser?.profileStatus || "");
  setIsEditingStatus(false);
  setMessage("");
  setError("");
}, [profileUser?.id, profileUser?.profileStatus]);

const isOwner = useMemo(() => {
  return !!currentUser?.id && currentUser.id === profileUser?.id;
}, [currentUser?.id, profileUser?.id]);

  if (!profileUser) return null;

  const wins = profileUser?.wins ?? 0;
  const losses = profileUser?.losses ?? 0;
  const totalGames = profileUser?.totalGames ?? wins + losses;
const rankPoints = profileUser?.rankPoints ?? 0;
const rank = userManager.getUserRank
  ? userManager.getUserRank({ ...profileUser, rankPoints })
  : (profileUser?.rank || profileUser?.rankLevel || "Novice");
  const winRate = getWinRate(profileUser);
  const shownStatus =
    profileUser?.profileStatus?.trim() || "Feeling cute and ready to play ✨";

  const saveStatus = async (shouldClose = false) => {
    if (!isOwner) {
      if (shouldClose) onClose?.();
      return true;
    }

    const trimmed = statusText.trim().slice(0, 80);

    try {
      setIsSavingStatus(true);
      setMessage("");
      setError("");

      const updatedUser = {
        ...profileUser,
        profileStatus: trimmed,
      };

      const result = await userManager.saveUser(updatedUser);

      if (!result?.success) {
        setError(result?.message || "Could not save status.");
        return false;
      }

const savedUser = result.user || updatedUser;
setMessage("Status saved");
setIsEditingStatus(false);
setStatusText(savedUser?.profileStatus || "");

if (onProfileSaved) {
  onProfileSaved(savedUser);
}

      if (shouldClose) {
        onClose?.();
      }

      return true;
    } catch (err) {
      setError("Could not save status.");
      return false;
    } finally {
      setIsSavingStatus(false);
    }
  };

  const refreshProfileRelationship = async () => {
  if (!currentUser?.id || !profileUser?.id) return;

  const [friendsResult, blockedResult] = await Promise.all([
    userManager.getFriends(currentUser.id),
    userManager.getBlockedUsers(currentUser.id),
  ]);

  const friendsData = Array.isArray(friendsResult)
    ? friendsResult
    : (friendsResult?.data || []);

  const blockedData = blockedResult || [];

  setIsFriend(friendsData.some((user) => String(user.id) === String(profileUser.id)));
  setIsBlocked(blockedData.some((user) => String(user.id) === String(profileUser.id)));
};

const handleToggleFriend = async () => {
  if (!currentUser?.id || !profileUser?.id || currentUser.id === profileUser.id) return;

  setMessage("");
  setError("");
  setIsActionLoading(true);

  try {
    if (isFriend) {
      const result = await userManager.removeFriend(currentUser.id, profileUser.id);
      if (!result?.success) {
        setError(result?.message || "Could not remove friend.");
        return;
      }
      setMessage(`${profileUser.username} removed from friends.`);
    } else {
      const result = await userManager.sendFriendRequest(currentUser.id, profileUser.username);
      if (!result?.success) {
        setError(result?.message || "Could not send friend request.");
        return;
      }
      setMessage(result.message || "Friend request sent.");
    }

    await refreshProfileRelationship();
onProfileSaved?.({
  ...profileUser,
//   isBlockedByMe: !isBlocked,
//   isBlockedByCurrentUser: profileUser?.isBlockedByCurrentUser,
});
  } catch (err) {
    console.error("handleToggleFriend error:", err);
    setError("Could not update friend state.");
  } finally {
    setIsActionLoading(false);
  }
};

const handleToggleBlock = async () => {
  if (!currentUser?.id || !profileUser?.id || currentUser.id === profileUser.id) return;

  setMessage("");
  setError("");
  setIsActionLoading(true);

  try {
    if (isBlocked) {
      const result = await userManager.unblockUser(currentUser.id, profileUser.id);
      if (!result?.success) {
        setError(result?.message || "Could not unblock user.");
        return;
      }
      setMessage(`${profileUser.username} unblocked.`);
    } else {
      const result = await userManager.blockUser(currentUser.id, profileUser.id);
      if (!result?.success) {
        setError(result?.message || "Could not block user.");
        return;
      }
      setMessage(`${profileUser.username} blocked.`);
    }

    await refreshProfileRelationship();

    onProfileSaved?.({
      ...profileUser,
      isBlockedByMe: !isBlocked,
      isBlockedByCurrentUser: profileUser?.isBlockedByCurrentUser,
    });
  } catch (err) {
    console.error("handleToggleBlock error:", err);
    setError("Could not update block state.");
  } finally {
    setIsActionLoading(false);
  }
};

  return (
    <div className="profileModalRoot">
      <div
        className="profileModalOverlay"
        onClick={() => saveStatus(true)}
      />

      <div className="profileModalCard">
        <button
          type="button"
          className="profileModalClose"
          onClick={() => saveStatus(true)}
        >
          ✕
        </button>

        <div className="profileSparkle profileSparkleOne">✦</div>
        <div className="profileSparkle profileSparkleTwo">✧</div>

        <div className="profileHero">
          <div className="profileAvatarColumn">
            <div className="profileAvatarGlow" />
            <div className="profileAvatarWrap">
              {profileUser?.avatarData ? (
                <img
                  src={profileUser.avatarData}
                  alt={profileUser.username || "User"}
                  className="profileAvatar"
                />
              ) : (
                <div className="profileAvatarFallback">
                  {profileUser?.username?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>
          </div>

          <div className="profileIdentity">
            <div className="profileMiniLabel">Profile</div>
            <h1 className="profileName">
              {profileUser?.username || "Unknown User"}
            </h1>

            <div className="profileRankRow">
  <img
    src={getRankImage(rank)}
    alt={rank}
    className="profileRankBadge"
  />
  <span className="profileRankName">{rank}</span>
</div>

{!isOwner && (
  <div className="profileActionRow">
    <button
      type="button"
      className="profileActionButton friend"
      onClick={handleToggleFriend}
      disabled={isActionLoading || isBlocked}
    >
      {isFriend ? "Remove Friend" : "Add Friend"}
    </button>

    <button
      type="button"
      className="profileActionButton block"
      onClick={handleToggleBlock}
      disabled={isActionLoading}
    >
      {isBlocked ? "Unblock" : "Block"}
    </button>
  </div>
)}

 {message && <div className="profileMessage success">{message}</div>}
              {error && <div className="profileMessage error">{error}</div>}

<div className="profileStatusCard">
              <div className="profileStatusHeader">
                <img
  className="profileStatusEmoji"
  src="/bubblechat.png"
  alt="Status"
/>
                <span className="profileStatusTitle">Status</span>
              </div>

            

{isOwner ? (
  isEditingStatus ? (
    <>
      <textarea
        className="profileStatusInput"
        value={statusText}
        onChange={(e) => setStatusText(e.target.value.slice(0, 80))}
        onBlur={() => saveStatus(false)}
        placeholder="Write something cute..."
        rows={3}
        autoFocus
      />
      <div className="profileStatusActions">
        <span className="profileStatusCount">{statusText.length}/80</span>
        <span className="profileAutoSaveText">
          {isSavingStatus ? "Saving..." : "Click out to save"}
        </span>
      </div>
    </>
  ) : (
    <button
      type="button"
      className="profileStatusViewButton"
      onClick={() => {
        setStatusText(profileUser?.profileStatus || "");
        setIsEditingStatus(true);
      }}
    >
      <div className="profileStatusText">{shownStatus}</div>
    </button>
  )
) : (
  <div className="profileStatusText">{shownStatus}</div>
)}

             
            </div>
          </div>
        </div>
<div className="profileStatsGrid">
  <div className="profileStatCard">
    <img className="profileStatIcon" src="/trophy.png" alt="Wins" />
    <div className="profileStatLabel">Wins</div>
    <div className="profileStatValue">{wins}</div>
  </div>

  <div className="profileStatCard">
    <img className="profileStatIcon" src="/halfishmoon.png" alt="Losses" />
    <div className="profileStatLabel">Losses</div>
    <div className="profileStatValue">{losses}</div>
  </div>

  <div className="profileStatCard">
    <img className="profileStatIcon" src="/gamecontroller.png" alt="Games" />
    <div className="profileStatLabel">Games</div>
    <div className="profileStatValue">{totalGames}</div>
  </div>

  <div className="profileStatCard">
    <img className="profileStatIcon" src="/wins.png" alt="Win Rate" />
    <div className="profileStatLabel">Win Rate</div>
    <div className="profileStatValue">{winRate}%</div>
  </div>
</div>
      </div>

     <style>{`


.profileActionButton.friend {
  background: hotpink !important;
  color: white !important;
}

.profileActionButton.block {
  background: red !important;
  color: white !important;
}

     .profileActionRow {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.profileActionButton {
  border: none;
  border-radius: 14px;
  padding: 10px 14px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.16s ease, filter 0.16s ease;
}

.profileActionButton:hover {
  transform: translateY(-1px);
}

.profileActionButton.friend {
  background: linear-gradient(180deg, rgba(255,255,255,0.62), rgba(232, 222, 255, 0.72));
  color: #5f4c79;
  box-shadow: 0 8px 18px rgba(86, 72, 116, 0.12);
}

.profileActionButton.block {
  background: linear-gradient(180deg, rgba(255, 205, 220, 0.9), rgba(235, 152, 170, 0.92));
  color: #7c3552;
  box-shadow: 0 8px 18px rgba(139, 79, 104, 0.14);
}

.profileActionButton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

     .profileStatusEmoji {
  width: 32px;
  height: 32px;
  object-fit: contain;
  display: block;
 
}

     .profileStatusViewButton {
  width: 100%;
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: text;
}

.profileStatIcon {
  width: 52px;
  height: 52px;
  object-fit: contain;
  display: block;
  margin: 0 auto 10px;
  background: transparent;
  filter:
    drop-shadow(0 0 3px rgba(255, 219, 120, 0.75))
    drop-shadow(0 0 3px rgba(255, 205, 92, 0.55))
    drop-shadow(0 4px 5px rgba(255, 184, 59, 0.28));
}

  .profileModalRoot {
    position: fixed;
    inset: 0;
    z-index: 3000;
    display: grid;
    place-items: center;
    padding: 20px;
  }

  .profileModalOverlay {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at top, rgba(255, 224, 247, 0.16), transparent 28%),
      radial-gradient(circle at bottom, rgba(196, 210, 255, 0.14), transparent 30%),
      rgba(16, 14, 24, 0.58);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }

  .profileModalCard {
    position: relative;
    z-index: 1;
    width: min(960px, 94vw);
    max-height: 90dvh;
    overflow-y: auto;
    border-radius: 34px;
    padding: 30px;
    background:
      radial-gradient(circle at top left, rgba(255,255,255,0.42), transparent 0%),
      radial-gradient(circle at bottom right, rgba(203, 214, 255, 0.22), transparent 0%),
      linear-gradient(180deg, rgba(230, 230, 230, 0.61), rgba(255, 255, 255, 0.94));
    border: 1px solid rgba(255, 255, 255, 0.36);
    box-shadow:
      0 24px 60px rgba(17, 15, 31, 0.34),
      0 0 30px rgba(255, 214, 243, 0.18),
      inset 0 1px 0 rgba(255,255,255,0.72);
    color: #58476b;
  }

  .profileModalClose {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.4);
    background: rgba(255,255,255,0.48);
    color: #6a5a82;
    font-weight: 900;
    cursor: pointer;
    box-shadow: 0 8px 18px rgba(69, 58, 94, 0.14);
  }

  .profileSparkle {
    position: absolute;
    color: rgba(255, 255, 255, 0.95);
    pointer-events: none;
    font-size: 22px;
    text-shadow:
      0 0 10px rgba(255,255,255,0.7),
      0 0 18px rgba(255, 214, 243, 0.48);
  }

  .profileSparkleOne {
    top: 18px;
    right: 70px;
  }

  .profileSparkleTwo {
    top: 54px;
    right: 38px;
  }

  .profileHero {
    display: grid;
    grid-template-columns: 180px 1fr;
    gap: 30px;
    align-items: center;
    margin-bottom: 26px;
  }

  .profileAvatarColumn {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .profileAvatarGlow {
    position: absolute;
    width: 220px;
    height: 220px;
    border-radius: 50%;
    background:
      radial-gradient(circle, rgba(255, 214, 243, 0.42), rgba(195, 211, 255, 0.22) 42%, transparent 70%);
    filter: blur(18px);
  }

  .profileAvatarWrap {
    position: relative;
    width: 205px;
    height: 205px;
    border-radius: 30px;
    display: grid;
    place-items: center;
   
    overflow: hidden;
   
  }

  .profileAvatar {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .profileAvatarFallback {
    font-size: 56px;
    font-weight: 900;
    color: #8a72aa;
  }

  .profileMiniLabel {
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-size: 11px;
    color: #8753d4;
    margin-bottom: 10px;
  }

  .profileName {
    margin: 0 0 14px;
    font-size: clamp(30px, 4vw, 44px);
    line-height: 1.02;
    color: #5f4c79;
    text-shadow: 0 1px 0 rgba(255,255,255,0.4);
  }

  .profileRankRow {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }

  .profileRankBadge {
    width: 34px;
    height: 34px;
    object-fit: contain;
    filter: drop-shadow(0 4px 8px rgba(89, 73, 122, 0.18));
  }

  .profileRankName {
    font-weight: 800;
    color: #675381;
  }

  .profileRankPoints {
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(255,255,255,0.42);
    color: #7c68a1;
    font-weight: 800;
    font-size: 13px;
    border: 1px solid rgba(255,255,255,0.34);
  }

  .profileStatusCard {
    padding: 16px;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.34);
    border: 1px solid rgba(255,255,255,0.34);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.34),
      0 10px 24px rgba(86, 72, 116, 0.08);
  }

  .profileStatusHeader {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .profileStatusTitle {
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #a08cc4;
  }

  .profileStatusText {
    color: #5f4c79;
    font-size: 15px;
    line-height: 1.6;
    font-weight: 700;
  }

  .profileStatusInput {
    width: 100%;
    resize: none;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.34);
    background: rgba(255,255,255,0.62);
    color: #5f4c79;
    padding: 12px 14px;
    outline: none;
    font-size: 14px;
    box-sizing: border-box;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.48);
  }

  .profileStatusInput::placeholder {
    color: rgba(95, 76, 121, 0.52);
  }

  .profileStatusActions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 10px;
  }

  .profileStatusCount,
  .profileAutoSaveText {
    font-size: 12px;
    font-weight: 700;
    color: #9c89be;
  }

  .profileMessage {
    margin-top: 10px;
    padding: 10px 12px;
    border-radius: 14px;
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 10px;
  }

  .profileMessage.success {
    background: rgba(184, 238, 210, 0.38);
    color: #48785f;
    border: 1px solid rgba(184, 238, 210, 0.34);
  }

  .profileMessage.error {
    background: rgba(255, 194, 210, 0.34);
    color: #8b4f68;
    border: 1px solid rgba(255, 194, 210, 0.34);
  }

  .profileStatsGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
  }

  .profileStatCard {
    padding: 18px;
    border-radius: 26px;
    background: rgba(255, 255, 255, 0.32);
    border: 1px solid rgba(255,255,255,0.30);
    text-align: center;
    box-shadow:
      0 10px 22px rgba(86, 72, 116, 0.08),
      inset 0 1px 0 rgba(255,255,255,0.32);
  }

  .profileStatEmoji {
    font-size: 20px;
    margin-bottom: 8px;
    filter: drop-shadow(0 3px 6px rgba(98, 79, 133, 0.14));
  }

  .profileStatLabel {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: #2a0077;
    margin-bottom: 10px;
  }

  .profileStatValue {
    font-size: 28px;
    font-weight: 900;
    color: #5f4c79;
  }

  @media (max-width: 760px) {
    .profileHero {
      grid-template-columns: 1fr;
      text-align: center;
    }

    .profileRankRow {
      justify-content: center;
    }

    .profileStatsGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .profileStatusActions {
      flex-direction: column;
      align-items: stretch;
    }
  }
`}</style>
    </div>
  );
}