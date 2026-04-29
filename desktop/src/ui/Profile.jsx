import React, { useEffect, useMemo, useRef, useState } from "react";
import { userManager } from "../userManagerSupabase.js";
import ProfileBanner from "./ProfileBanner.jsx";

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
   onInviteToTribe,
   onMessageUser,
}) {
  const [statusText, setStatusText] = useState(profileUser?.profileStatus || "");
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [profileBannerUrl, setProfileBannerUrl] = useState(
  profileUser?.profile_banner_url || profileUser?.profileBannerUrl || ""
);
useEffect(() => {
  setProfileBannerUrl(
    profileUser?.profile_banner_url || profileUser?.profileBannerUrl || ""
  );
}, [profileUser?.id, profileUser?.profile_banner_url, profileUser?.profileBannerUrl]);
const [isFriend, setIsFriend] = useState(
  typeof profileUser?.isFriend === "boolean" ? profileUser.isFriend : false
);
const [friendRequestSent, setFriendRequestSent] = useState(
  profileUser?.friendRequestSent === true
);
const [isBlocked, setIsBlocked] = useState(
  profileUser?.isBlocked === true || profileUser?.isBlockedByMe === true
);
const [profileBanner, setProfileBanner] = useState(
  profileUser?.profile_banner || profileUser?.profileBanner || "dreamyBlue"
);

useEffect(() => {
  setProfileBanner(
    profileUser?.profile_banner || profileUser?.profileBanner || "dreamyBlue"
  );
}, [profileUser?.id, profileUser?.profile_banner, profileUser?.profileBanner]);

const [isRelationshipLoading, setIsRelationshipLoading] = useState(false);
const [messageButtonState, setMessageButtonState] = useState("");
const [showMessageRequestPopup, setShowMessageRequestPopup] = useState(false);
const [messageRequestText, setMessageRequestText] = useState("");
const [isSendingMessageRequest, setIsSendingMessageRequest] = useState(false);
const [isActionLoading, setIsActionLoading] = useState(false);
const DEFAULT_PROFILE_BG = "#dbdbdb";
const DEFAULT_PROFILE_TEXT = "#5f4c79";
const editorRef = useRef(null);
const isPickingColorRef = useRef(false);
const [bgColor, setBgColor] = useState(profileUser?.profileBgColor || DEFAULT_PROFILE_BG);
const [textColor, setTextColor] = useState(profileUser?.profileTextColor || DEFAULT_PROFILE_TEXT);
const [isInvitingTribe, setIsInvitingTribe] = useState(false);
const [tribeInviteSent, setTribeInviteSent] = useState(
  profileUser?.tribeInviteSent === true
);
const [profileTribe, setProfileTribe] = useState(
  profileUser?.profileTribe || null
);

const [currentUserTribe, setCurrentUserTribe] = useState(
  profileUser?.currentUserTribe || null
);

const [currentUserTribeRole, setCurrentUserTribeRole] = useState(
  profileUser?.currentUserTribeRole || null
);

const [confirmAction, setConfirmAction] = useState(null);
const [isLoadingCurrentUserTribe, setIsLoadingCurrentUserTribe] = useState(
  !profileUser?.currentUserTribe && !profileUser?.currentUserTribeRole
);

const handleUploadBannerImage = async (file) => {
  if (!isOwner || !file) return;

  setMessage("");
  setError("");

  const result = await userManager.uploadProfileBanner(currentUser?.id, file);

  if (!result?.success) {
    setError(result?.error || "Could not upload banner image.");
    return;
  }

  setProfileBannerUrl(result.bannerUrl);
  setMessage("Profile banner updated.");

  onProfileSaved?.({
    ...profileUser,
    profile_banner_url: result.bannerUrl,
    profileBannerUrl: result.bannerUrl,
  });
};

const handleChangeBanner = async (bannerId) => {
  if (!isOwner) return;

  const previousBanner = profileBanner;

  setProfileBanner(bannerId);
  setMessage("");
  setError("");

  const result = await userManager.updateProfileBanner(
    currentUser?.id,
    bannerId
  );

  if (!result?.success) {
    setProfileBanner(previousBanner);
    setError(result?.error || result?.message || "Could not update profile banner.");
    return;
  }

  setMessage("Profile banner updated.");

  onProfileSaved?.({
    ...profileUser,
    profile_banner: bannerId,
    profileBanner: bannerId,
  });
};

const isOwner = useMemo(() => {
  return !!currentUser?.id && currentUser.id === profileUser?.id;
}, [currentUser?.id, profileUser?.id]);



useEffect(() => {
  setTribeInviteSent(profileUser?.tribeInviteSent === true);

  // Only overwrite currentUserTribe if Profile was actually given tribe data.
  // Do NOT reset it to null while getMyTribe() is still loading.
  if (profileUser?.currentUserTribe) {
    setCurrentUserTribe(profileUser.currentUserTribe);
  }

  if (profileUser?.currentUserTribeRole) {
    setCurrentUserTribeRole(profileUser.currentUserTribeRole);
  }

  if (!isOwner) {
    setProfileTribe(profileUser?.profileTribe || null);
  }

  if (profileUser?.currentUserTribe || profileUser?.currentUserTribeRole) {
    setIsLoadingCurrentUserTribe(false);
  }
}, [
  isOwner,
  profileUser?.id,
  profileUser?.profileTribe,
  profileUser?.currentUserTribe,
  profileUser?.currentUserTribeRole,
  profileUser?.tribeInviteSent,
]);

const handleSendMessageRequest = async () => {
  if (!currentUser?.id || !profileUser?.username || isOwner || isBlocked) return;

  const trimmed = messageRequestText.trim();

  if (!trimmed) {
    setError("Write a message before sending.");
    return;
  }

  setIsSendingMessageRequest(true);
  setMessage("");
  setError("");

  try {
    const result = await userManager.sendFriendRequest(
      currentUser.id,
      profileUser.username,
      trimmed
    );

    if (!result?.success) {
      setError(result?.message || "Could not send message request.");
      return;
    }

    setFriendRequestSent(true);
    setMessageButtonState("requested");
    setShowMessageRequestPopup(false);
    setMessageRequestText("");
    setMessage("Message request sent.");

    onProfileSaved?.({
      ...profileUser,
      friendRequestSent: true,
    });
  } catch (err) {
    console.error("handleSendMessageRequest error:", err);
    setError("Could not send message request.");
  } finally {
    setIsSendingMessageRequest(false);
  }
};

const handleMessageButton = () => {
  if (!currentUser?.id || !profileUser?.id || isOwner || isBlocked) return;

  setMessage("");
  setError("");

  // If already friends, open normal FriendList chat
  if (isFriend) {
    setMessageButtonState("sent");
    onMessageUser?.(profileUser);

    setTimeout(() => {
      onClose?.();
    }, 300);

    return;
  }

  // If request already sent, do NOT open popup again
  if (friendRequestSent || messageButtonState === "requested") {
    setMessageButtonState("requested");
    setMessage("Message request already sent.");
    return;
  }

  // Non-friend default behavior: open popup first
  setShowMessageRequestPopup(true);
};



useEffect(() => {
  // Only trust profileUser.isFriend if App actually passed a real boolean.
  // Do not force false when it is undefined, because that causes Remove Friend -> Add Friend glitch.
  if (typeof profileUser?.isFriend === "boolean") {
    setIsFriend(profileUser.isFriend);

    if (profileUser.isFriend) {
      setFriendRequestSent(false);
    } else {
      setFriendRequestSent(profileUser?.friendRequestSent === true);
    }
  } else if (profileUser?.friendRequestSent === true) {
    setFriendRequestSent(true);
  }

  setIsBlocked(
    profileUser?.isBlocked === true || profileUser?.isBlockedByMe === true
  );
}, [
  profileUser?.id,
  profileUser?.isFriend,
  profileUser?.friendRequestSent,
  profileUser?.isBlocked,
  profileUser?.isBlockedByMe,
]);




useEffect(() => {
  if (!isEditingStatus) return;

  const handlePointerDown = (e) => {
    const editorEl = editorRef.current;
    if (!editorEl) return;

    if (editorEl.contains(e.target)) return;
    if (isPickingColorRef.current) return;

    saveStatus(false);
  };

  document.addEventListener("mousedown", handlePointerDown);
  document.addEventListener("touchstart", handlePointerDown);

  return () => {
    document.removeEventListener("mousedown", handlePointerDown);
    document.removeEventListener("touchstart", handlePointerDown);
  };
}, [isEditingStatus, statusText, bgColor, textColor, profileUser]);


useEffect(() => {
  let ignore = false;

  const loadCurrentUserTribe = async () => {
    if (profileUser?.currentUserTribe || profileUser?.currentUserTribeRole) {
      if (!ignore) {
        setCurrentUserTribe(profileUser?.currentUserTribe || null);
        setCurrentUserTribeRole(profileUser?.currentUserTribeRole || null);
        setIsLoadingCurrentUserTribe(false);
      }
      return;
    }

    if (!currentUser?.id) {
      if (!ignore) {
        setCurrentUserTribe(null);
        setCurrentUserTribeRole(null);
        setIsLoadingCurrentUserTribe(false);
      }
      return;
    }

    try {
      if (!ignore) setIsLoadingCurrentUserTribe(true);

      const result = await userManager.getMyTribe(currentUser.id);

      const tribe =
        result?.tribe ||
        result?.data?.tribe ||
        result?.myTribe ||
        null;

      const members =
        result?.members ||
        result?.data?.members ||
        tribe?.members ||
        [];

      const myMember = members.find((member) => {
        const memberUserId =
          member?.user_id ||
          member?.userId ||
          member?.id;

        return String(memberUserId) === String(currentUser.id);
      });

      if (!ignore) {
        setCurrentUserTribe(tribe);
        setCurrentUserTribeRole(myMember?.role || tribe?.role || null);
      }
    } catch (err) {
      console.error("Could not load current user tribe:", err);

      if (!ignore) {
        setCurrentUserTribe(null);
        setCurrentUserTribeRole(null);
      }
    } finally {
      if (!ignore) setIsLoadingCurrentUserTribe(false);
    }
  };

  loadCurrentUserTribe();

  return () => {
    ignore = true;
  };
}, [
  currentUser?.id,
  profileUser?.currentUserTribe,
  profileUser?.currentUserTribeRole,
]);

useEffect(() => {
  let ignore = false;

  const loadProfileTribe = async () => {
    if (!profileUser?.id) {
      if (!ignore) setProfileTribe(null);
      return;
    }

    // For my own profile, do not fetch/set profileTribe here.
    // The badge will use currentUserTribe directly.
    if (isOwner) {
      return;
    }

    if (profileUser?.profileTribe) {
      if (!ignore) setProfileTribe(profileUser.profileTribe);
      return;
    }

    try {
      const result = await userManager.getUserTribeBadge(profileUser.id);

      if (!ignore) {
        setProfileTribe(result?.tribe || null);
      }
    } catch (err) {
      console.error("Could not load profile tribe:", err);
      if (!ignore) setProfileTribe(null);
    }
  };

  loadProfileTribe();

  return () => {
    ignore = true;
  };
}, [
  isOwner,
  profileUser?.id,
  profileUser?.profileTribe,
]);



const resetThemeToDefault = () => {
  setBgColor(DEFAULT_PROFILE_BG);
  setTextColor(DEFAULT_PROFILE_TEXT);
};


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
        setIsRelationshipLoading(false);
        setIsBlocked(false);
      }
      return;
    }

try {
  if (!ignore && typeof profileUser?.isFriend !== "boolean") {
    setIsRelationshipLoading(true);
  }

      const [friendsResult, blockedResult] = await Promise.all([
        userManager.getFriends(currentUser.id),
        userManager.getBlockedUsers(currentUser.id),
      ]);

      const friendsData = Array.isArray(friendsResult)
        ? friendsResult
        : friendsResult?.data || [];

      const blockedData = blockedResult || [];

      const nextIsFriend = friendsData.some(
        (user) => String(user.id) === String(profileUser.id)
      );

      const nextIsBlocked = blockedData.some(
        (user) => String(user.id) === String(profileUser.id)
      );

      if (!ignore) {
        setIsFriend(nextIsFriend);
        setFriendRequestSent(nextIsFriend ? false : profileUser?.friendRequestSent === true);
        setIsBlocked(nextIsBlocked);
      }
    } catch (err) {
      console.error("Failed to load relationship state:", err);
    } finally {
      if (!ignore) setIsRelationshipLoading(false);
    }
  };

  loadRelationshipState();

  return () => {
    ignore = true;
  };
}, [currentUser?.id, profileUser?.id, profileUser?.friendRequestSent]);


useEffect(() => {
  if (!profileUser?.id) return;

  setStatusText(profileUser?.profileStatus || "");
  setBgColor(profileUser?.profileBgColor || DEFAULT_PROFILE_BG);
  setTextColor(profileUser?.profileTextColor || DEFAULT_PROFILE_TEXT);

  setIsEditingStatus(false);
  setMessage("");
  setError("");
  setMessageButtonState("");
  setShowMessageRequestPopup(false);
  setMessageRequestText("");
  setIsSendingMessageRequest(false);
}, [
  profileUser?.id,
  profileUser?.profileStatus,
  profileUser?.profileBgColor,
  profileUser?.profileTextColor,
]);


const displayedTribe = isOwner
  ? currentUserTribe || profileUser?.profileTribe || profileUser?.tribe || null
  : profileTribe || profileUser?.profileTribe || profileUser?.tribe || null;

const targetTribeName =
  displayedTribe?.name ||
  profileUser?.tribeName ||
  profileUser?.tribe_name ||
  "";

const targetTribeLabel = targetTribeName || "No Tribe";
const targetHasNoTribe = !targetTribeName;

const targetAlreadyInTribe = Boolean(targetTribeName);

const canCurrentUserInviteToTribe =
  Boolean(currentUserTribe?.id) &&
  (currentUserTribeRole === "owner" || currentUserTribeRole === "officer");

const tribeInviteButtonText = !currentUserTribe?.id
  ? "Need Tribe"
  : !canCurrentUserInviteToTribe
  ? "No Permission"
  : isInvitingTribe
  ? "Inviting..."
  : "Invite to Tribe";

  if (!profileUser) return null;

const tribeInviteButtonTitle = targetAlreadyInTribe
  ? `${profileUser?.username || "User"} is already in ${targetTribeName}`
  : !currentUserTribe?.id
  ? "You need to be in a tribe first"
  : !canCurrentUserInviteToTribe
  ? "Only owner or officers can invite users"
  : "Invite to tribe";

  

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
  profileBgColor: bgColor || DEFAULT_PROFILE_BG,
  profileTextColor: textColor || DEFAULT_PROFILE_TEXT,
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

const handleInviteToTribe = async () => {
  if (!currentUser?.id || !profileUser?.id || isOwner) return;

  const wasInviteSent = tribeInviteSent;

  setMessage("");
  setError("");
  setTribeInviteSent(true);
  setIsInvitingTribe(true);

  try {
    const result = await onInviteToTribe?.(profileUser);

    if (!result?.success) {
      setTribeInviteSent(wasInviteSent);
      setError(result?.message || "Could not send tribe invite.");
      return;
    }

    setMessage(result.message || `Tribe invite sent to ${profileUser.username}.`);

    onProfileSaved?.({
      ...profileUser,
      tribeInviteSent: true,
    });
  } catch (err) {
    console.error("handleInviteToTribe error:", err);
    setTribeInviteSent(wasInviteSent);
    setError("Could not send tribe invite.");
  } finally {
    setIsInvitingTribe(false);
  }
};



const handleToggleFriend = async () => {
  if (!currentUser?.id || !profileUser?.id || currentUser.id === profileUser.id) return;

  const wasFriend = isFriend;

  setMessage("");
  setError("");
  setIsActionLoading(true);

  try {
    if (wasFriend) {
      setIsFriend(false);
      setFriendRequestSent(false);

      const result = await userManager.removeFriend(currentUser.id, profileUser.id);

      if (!result?.success) {
        setIsFriend(true);
        setError(result?.message || "Could not remove friend.");
        return;
      }

      setMessage(`${profileUser.username} removed from friends.`);

      onProfileSaved?.({
        ...profileUser,
        isFriend: false,
        friendRequestSent: false,
      });

      return;
    }

    const result = await userManager.sendFriendRequest(
      currentUser.id,
      profileUser.username
    );

    if (!result?.success) {
      setError(result?.message || "Could not send friend request.");
      return;
    }

    setIsFriend(false);
    setFriendRequestSent(true);
    setMessage(result.message || "Friend request sent.");

    onProfileSaved?.({
      ...profileUser,
      isFriend: false,
      friendRequestSent: true,
    });
  } catch (err) {
    console.error("handleToggleFriend error:", err);
    setIsFriend(wasFriend);
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

const openConfirmAddFriend = () => {
  setConfirmAction({
    type: "addFriend",
    title: "Add Friend?",
    message: `Are you sure you want to add ${profileUser?.username || "this user"} as a friend?`,
    confirmText: "Add Friend",
  });
};

const openConfirmBlock = () => {
  setConfirmAction({
    type: "block",
    title: "Block User?",
    message: `Are you sure you want to block ${profileUser?.username || "this user"}?`,
    confirmText: "Block",
  });
};

const handleConfirmAction = async () => {
  if (!confirmAction) return;

  const actionType = confirmAction.type;
  setConfirmAction(null);

  if (actionType === "addFriend") {
    await handleToggleFriend();
    return;
  }

  if (actionType === "block") {
    await handleToggleBlock();
  }
};
const handleResetDefaultBanner = async () => {
  if (!isOwner) return;

  setProfileBanner("dreamyBlue");
  setProfileBannerUrl("");
  setMessage("");
  setError("");

  const result = await userManager.updateProfileBannerDefault(currentUser?.id);

  if (!result?.success) {
    setError(result?.error || "Could not reset banner.");
    return;
  }

  setMessage("Profile banner reset.");

  onProfileSaved?.({
    ...profileUser,
    profile_banner: "dreamyBlue",
    profileBanner: "dreamyBlue",
    profile_banner_url: "",
    profileBannerUrl: "",
  });
};

  return (
    <div className="profileModalRoot">
      <div
        className="profileModalOverlay"
        onClick={() => saveStatus(true)}
      />

      <div
  className="profileModalCard"
style={{
  background: isEditingStatus ? bgColor : (profileUser?.profileBgColor || "#dbdbdb"),
  "--profile-text-color": isEditingStatus
    ? textColor
    : (profileUser?.profileTextColor || DEFAULT_PROFILE_TEXT),
}}
>
        <button
          type="button"
          className="profileModalClose"
          onClick={() => saveStatus(true)}
        >
          ✕
        </button>

        

<div className="profileTopRow">
  <div className="profileTopBannerWrap">
<ProfileBanner
  bannerId={profileBanner}
  bannerUrl={profileBannerUrl}
  avatarSrc={profileUser?.avatarData}
  username={profileUser?.username || "Unknown User"}
  rank={rank}
  rankIcon={getRankImage(rank)}
  tribeName={targetTribeName}
  isOwner={isOwner}
  
  onChangeBanner={handleResetDefaultBanner}
  onUploadBannerImage={handleUploadBannerImage}
  textColor={
    isEditingStatus
      ? textColor
      : profileUser?.profileTextColor || DEFAULT_PROFILE_TEXT
  }
  actions={
    !isOwner ? (
      <>
        <button
          type="button"
          className="profileActionButton friend"
onClick={(e) => {
  e.stopPropagation();

  if (isFriend) {
    handleToggleFriend();
    return;
  }

  openConfirmAddFriend();
}}
          disabled={
            isRelationshipLoading ||
            isActionLoading ||
            isBlocked ||
            (!isFriend && friendRequestSent)
          }
        >
          {isRelationshipLoading
            ? "Checking..."
            : isFriend
            ? "Remove Friend"
            : friendRequestSent
            ? "Request Sent"
            : "Add Friend"}
        </button>

        {!targetAlreadyInTribe &&
          !isLoadingCurrentUserTribe &&
          canCurrentUserInviteToTribe && (
            <button
              type="button"
              className="profileActionButton tribe"
              onClick={(e) => {
                e.stopPropagation();
                handleInviteToTribe();
              }}
              disabled={
                isActionLoading ||
                isBlocked ||
                isInvitingTribe ||
                tribeInviteSent
              }
            >
              {tribeInviteSent
                ? "Invite Sent"
                : isInvitingTribe
                ? "Inviting..."
                : "Invite to Tribe"}
            </button>
          )}

        <button
          type="button"
          className="profileActionButton block"
onClick={(e) => {
  e.stopPropagation();

  if (isBlocked) {
    handleToggleBlock();
    return;
  }

  openConfirmBlock();
}}
          disabled={isActionLoading}
        >
          {isBlocked ? "Unblock" : "Block"}
        </button>

        <button
          type="button"
          className={`profileMessageIconButton ${
            messageButtonState === "sent" ? "messageSentState" : ""
          } ${
            messageButtonState === "requested" || friendRequestSent
              ? "messageRequestedState"
              : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            handleMessageButton();
          }}
          disabled={
            isActionLoading ||
            isBlocked ||
            messageButtonState === "sent" ||
            messageButtonState === "requested" ||
            friendRequestSent
          }
          title={
            messageButtonState === "sent"
              ? "Sent"
              : messageButtonState === "requested" || friendRequestSent
              ? "Requested"
              : "Message"
          }
        >
          <img
            src="/messageIcon.png"
            alt="Message"
            className="profileMessageIconImg"
          />
        </button>
      </>
    ) : null
  }
/>
  </div>


</div>

<div className="profileIdentityBelow">
 

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
    <div ref={editorRef}>
<div className="profileThemeInlineRow">
  <span className="profileThemeInlineTitle">Theme:</span>

  <label className="profileThemeInlineItem">
    <span className="profileThemeInlineText">BG</span>
    <div className="profileThemePickerWrap">
      <span
        className="profileThemeMiniSwatch"
        style={{ background: bgColor }}
      />
      <input
        type="color"
        value={bgColor}
        onMouseDown={() => {
          isPickingColorRef.current = true;
        }}
        onChange={(e) => setBgColor(e.target.value)}
        onBlur={() => {
          setTimeout(() => {
            isPickingColorRef.current = false;
          }, 0);
        }}
        className="profileThemeColorInput"
        aria-label="Choose background color"
      />
    </div>
  </label>

  <label className="profileThemeInlineItem">
    <span className="profileThemeInlineText">Text</span>
    <div className="profileThemePickerWrap">
      <span
        className="profileThemeMiniSwatch"
        style={{ background: textColor }}
      />
      <input
        type="color"
        value={textColor}
        onMouseDown={() => {
          isPickingColorRef.current = true;
        }}
        onChange={(e) => setTextColor(e.target.value)}
        onBlur={() => {
          setTimeout(() => {
            isPickingColorRef.current = false;
          }, 0);
        }}
        className="profileThemeColorInput"
        aria-label="Choose text color"
      />
    </div>
  </label>

  <button
    type="button"
    className="profileThemeResetButton"
    onMouseDown={(e) => e.preventDefault()}
    onClick={resetThemeToDefault}
  >
    Default
  </button>
</div>
  <textarea
    className="profileStatusInput"
    value={statusText}
    onChange={(e) => setStatusText(e.target.value.slice(0, 80))}
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
</div>

    </>
  ) : (
    <button
      type="button"
      className="profileStatusViewButton"
      onClick={() => {
        setStatusText(profileUser?.profileStatus || "");
        setBgColor(profileUser?.profileBgColor || "#dbdbdb");
        setTextColor(profileUser?.profileTextColor || "#5f4c79");
        setIsEditingStatus(true);
      }}
    >
      <div
        className="profileStatusText"
   
      >
        {shownStatus}
      </div>
    </button>
  )
) : (
  <div
    className="profileStatusText"
   
  >
    {shownStatus}
  </div>
)}


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
{showMessageRequestPopup && (
  <div
    className="messageRequestOverlay"
    onClick={() => setShowMessageRequestPopup(false)}
  >
    <div
      className="messageRequestModal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="miniLabel">Message Request</div>

      <h3>Send a message to {profileUser?.username}</h3>

      <p>
        You are not friends yet. Send a short message with your friend request.
      </p>

      <textarea
        className="messageRequestTextarea"
        value={messageRequestText}
        maxLength={180}
        placeholder="Write a quick message..."
        onChange={(e) => setMessageRequestText(e.target.value)}
      />

      <div className="messageRequestCount">
        {messageRequestText.length}/180
      </div>

      <div className="messageRequestActions">
        <button
          type="button"
          className="declineButton"
          onClick={() => {
            setShowMessageRequestPopup(false);
            setMessageRequestText("");
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          className="acceptButton"
          onClick={handleSendMessageRequest}
          disabled={isSendingMessageRequest || !messageRequestText.trim()}
        >
          {isSendingMessageRequest ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  </div>
)}

{confirmAction && (
  <div
    className="confirmActionOverlay"
    onClick={() => setConfirmAction(null)}
  >
    <div
      className="confirmActionModal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="miniLabel">Confirm</div>

      <h3>{confirmAction.title}</h3>

      <p>{confirmAction.message}</p>

      <div className="confirmActionButtons">
        <button
          type="button"
          className="confirmCancelButton"
          onClick={() => setConfirmAction(null)}
        >
          Cancel
        </button>

        <button
          type="button"
          className={`confirmYesButton ${
            confirmAction.type === "block" ? "danger" : ""
          }`}
          onClick={handleConfirmAction}
        >
          {confirmAction.confirmText}
        </button>
      </div>
    </div>
  </div>
)}
     <style>{`

     .confirmActionOverlay {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(16, 14, 24, 0.58);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.confirmActionModal {
  width: min(420px, calc(100vw - 32px));
  padding: 22px;
  border-radius: 24px;
  background: rgba(255, 253, 244, 0.96);
  border: 1px solid rgba(143, 106, 45, 0.25);
  box-shadow: 0 24px 70px rgba(61, 42, 18, 0.34);
}

.confirmActionModal h3 {
  margin: 6px 0 8px;
  color: #3d2a12;
}

.confirmActionModal p {
  margin: 0;
  color: rgba(61, 42, 18, 0.72);
  font-size: 0.94rem;
  line-height: 1.5;
}

.confirmActionButtons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.confirmCancelButton,
.confirmYesButton {
  min-width: 112px;
  height: 42px;
  border-radius: 999px;
  padding: 0 18px;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  border: none;
}

.confirmCancelButton {
  background: rgba(255, 255, 255, 0.78);
  color: #6b4a22;
  border: 1px solid rgba(143, 106, 45, 0.24);
}

.confirmYesButton {
  background: hotpink;
  color: white;
  box-shadow: 0 10px 22px rgba(255, 105, 180, 0.28);
}

.confirmYesButton.danger {
  background: red;
  color: white;
  box-shadow: 0 10px 22px rgba(255, 0, 0, 0.22);
}
.profileActionButton.message.messageSentState,
.profileActionButton.message.messageSentState:disabled {
  color: rgba(61, 42, 18, 0.55) !important;
  opacity: 0.8 !important;
  cursor: not-allowed !important;
  transform: none !important;
  filter: grayscale(0.15) !important;
}

.profileActionButton.message.messageRequestedState,
.profileActionButton.message.messageRequestedState:disabled {
  background: linear-gradient(180deg, #8fc7ff, #3f8fe8) !important;
  color: rgba(8, 39, 80, 0.72) !important;
  border: 1px solid rgba(40, 103, 178, 0.34) !important;
  box-shadow:
    0 10px 22px rgba(63, 143, 232, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.38) !important;
  opacity: 0.8 !important;
  cursor: not-allowed !important;
  transform: none !important;
  filter: grayscale(0.15) !important;
}

.profileActionButton.message.messageSentState:hover,
.profileActionButton.message.messageSentState:disabled:hover,
.profileActionButton.message.messageRequestedState:hover,
.profileActionButton.message.messageRequestedState:disabled:hover {
  transform: none !important;
  filter: grayscale(0.15) !important;
}

.messageRequestModal {
  width: min(420px, calc(100vw - 32px));
  padding: 22px;
  border-radius: 24px;
  background: rgba(255, 253, 244, 0.94);
  border: 1px solid rgba(143, 106, 45, 0.25);
  box-shadow: 0 24px 70px rgba(61, 42, 18, 0.28);
}

.messageRequestModal h3 {
  margin: 6px 0 8px;
  color: #3d2a12;
}

.messageRequestModal p {
  margin: 0 0 14px;
  color: rgba(61, 42, 18, 0.72);
  font-size: 0.92rem;
}

.messageRequestTextarea {
  width: 100%;
  min-height: 110px;
  resize: none;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(143, 106, 45, 0.28);
  background: rgba(255, 255, 255, 0.72);
  color: #3d2a12;
  outline: none;
}

.messageRequestTextarea:focus {
  border-color: rgba(214, 168, 79, 0.8);
  box-shadow: 0 0 0 4px rgba(214, 168, 79, 0.16);
}

.messageRequestCount {
  margin-top: 6px;
  text-align: right;
  font-size: 0.78rem;
  color: rgba(61, 42, 18, 0.55);
}

.messageRequestActions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}

 .profileActionButton.tribe {
  background: linear-gradient(180deg, #ffe9b8, #dca95a);
  color: #5a3817;
  border: 1px solid rgba(224, 171, 63, 0.34);
}

.profileActionButton.message:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
  filter: grayscale(0.12);
}


.profileStatusSideCard .profileStatusTitle {
  margin-bottom: 14px;
}

.profileStatusSideCard p,
.profileStatusSideCard textarea,
.profileStatusSideCard .profileStatusText {
  margin-top: 0;
}

@media (max-width: 900px) {
  .profileTopRow {
    grid-template-columns: 1fr;
  }

  .profileStatusSideCard {
    min-height: unset;
  }
}

.profileActionButton.tribe:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  filter: grayscale(0.15);
}    

.profileThemeInlineRow {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.profileThemeInlineTitle {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.profileThemeInlineItem {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
  

.profileMessageIconButton {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  padding: 5px 5.76px 5px 5px;
  border-radius: 999px;
  border: 1px solid rgba(122, 87, 30, 0.25);
  background: linear-gradient(180deg, #8fc7ff, #627fa0);
  cursor: pointer;
  box-shadow:
    0 8px 18px rgba(214, 168, 79, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
  transition:
    transform 0.16s ease,
    filter 0.16s ease,
    box-shadow 0.16s ease;
}
.messageRequestActions .declineButton,
.messageRequestActions .acceptButton {
  min-width: 112px;
  height: 42px;
  border-radius: 999px;
  padding: 0 18px;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  transition:
    transform 0.16s ease,
    filter 0.16s ease,
    box-shadow 0.16s ease,
    opacity 0.16s ease;
}

.messageRequestActions .declineButton {
  background: rgba(255, 255, 255, 0.78);
  color: #6b4a22;
  border: 1px solid rgba(143, 106, 45, 0.24);
  box-shadow:
    0 8px 18px rgba(61, 42, 18, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.messageRequestActions .acceptButton {
  background: linear-gradient(180deg, #ffe9b8, #dca95a);
  color: #4a2d0f;
  border: 1px solid rgba(224, 171, 63, 0.34);
  box-shadow:
    0 10px 22px rgba(214, 168, 79, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

.messageRequestActions .declineButton:hover:not(:disabled),
.messageRequestActions .acceptButton:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.04);
}

.messageRequestActions .declineButton:active:not(:disabled),
.messageRequestActions .acceptButton:active:not(:disabled) {
  transform: translateY(0);
}

.messageRequestActions .acceptButton:disabled,
.messageRequestActions .declineButton:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  filter: grayscale(0.15);
}

.messageRequestOverlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(16, 14, 24, 0.58);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.messageRequestModal {
  position: relative;
  z-index: 100000;
  width: min(420px, calc(100vw - 32px));
  padding: 22px;
  border-radius: 24px;
  background: rgba(255, 253, 244, 0.96);
  border: 1px solid rgba(143, 106, 45, 0.25);
  box-shadow: 0 24px 70px rgba(61, 42, 18, 0.34);
}

.profileMessageIconButton:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.04);
  box-shadow:
    0 10px 22px rgba(214, 168, 79, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

.profileMessageIconButton:disabled {
  cursor: not-allowed;
  opacity: 0.8;
  transform: none;
  filter: none;
}

.profileMessageIconButton:disabled .profileMessageIconImg {
  filter: brightness(0) saturate(100%);
}

.profileMessageIconImg {
  width: 17px;
  height: 17px;
  object-fit: contain;
  display: block;
  pointer-events: none;
  filter: brightness(100%) saturate(10%) !important;
}

.profileMessageIconButton.messageRequestedState,
.profileMessageIconButton.messageRequestedState:disabled {
  background: linear-gradient(180deg, #8fc7ff, #3f8fe8) !important;
  border: 1px solid rgba(40, 103, 178, 0.34) !important;
  filter: none !important;
}

.profileMessageIconButton.messageRequestedState,
.profileMessageIconButton.messageRequestedState:disabled {
  background: linear-gradient(180deg, #8ab7e8, #4f8fce) !important;
}

.profileActionButton.message:disabled {
  opacity: 0.8;
  cursor: not-allowed;
}

.profileActionButton.message {
  min-width: 120px;
}

.profileTribeBadge.noTribe {
  background: rgba(255, 255, 255, 0.34);
  border: 1px dashed rgba(255, 255, 255, 0.48);
  opacity: 0.82;
}

.profileThemeInlineText {
  font-size: 12px;
  font-weight: 700;
}

.profileThemePickerWrap {
  position: relative;
  width: 28px;
  height: 28px;
}

.profileThemeMiniSwatch {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 2px solid rgba(255,255,255,0.82);
  box-shadow:
    0 4px 10px rgba(80, 62, 104, 0.12),
    0 0 0 1px rgba(108, 90, 135, 0.12);
  display: block;
}

.profileThemeColorInput {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  border: none;
  padding: 0;
}

.profileThemeResetButton {
  border: none;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  background: rgba(255,255,255,0.62);
  box-shadow: 0 6px 14px rgba(86, 72, 116, 0.08);
}

.profileModalCard,
.profileModalCard .profileMiniLabel,
.profileModalCard .profileName,
.profileModalCard .profileRankName,
.profileModalCard .profileStatusTitle,
.profileModalCard .profileStatusText,
.profileModalCard .profileStatLabel,
.profileModalCard .profileStatValue,
.profileModalCard .profileStatusCount,
.profileModalCard .profileAutoSaveText,
.profileModalCard .profileThemeMiniHeader,
.profileModalCard .profileThemeMiniLabel,
.profileModalCard .profileThemeResetButton {
  color: var(--profile-text-color) !important;
}

.profileModalCard .profileStatusInput {
  color: var(--profile-text-color) !important;
}

.profileModalCard .profileStatusInput::placeholder {
  color: var(--profile-text-color) !important;
  opacity: 0.65;
}


.profileIdentityBelow {
  position: relative;
  z-index: 20;
}

.profileActionRow {
  position: relative;
  z-index: 30;
}

.profileActionButton,
.profileMessageIconButton {
  position: relative;
  z-index: 31;
}

.profileStatusCard {
  position: relative;
  z-index: 25;
}

.profileStatsGrid {
  position: relative;
  z-index: 25;
}


.profileThemePickerWrap {
  position: relative;
  width: 32px;
  height: 32px;
}

.profileThemeMiniSwatch {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 2px solid rgba(255,255,255,0.82);
  box-shadow:
    0 4px 10px rgba(80, 62, 104, 0.12),
    0 0 0 1px rgba(108, 90, 135, 0.12);
  display: block;
}

.profileThemeColorInput {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  border: none;
  padding: 0;
}

.profileThemeColorInput::-webkit-color-swatch-wrapper {
  padding: 0;
}

.profileThemeColorInput::-webkit-color-swatch {
  border: none;
  border-radius: 999px;
}

.profileThemeColorInput::-moz-color-swatch {
  border: none;
  border-radius: 999px;
}

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

.profileActionButton.message {
  background: linear-gradient(135deg, #fff2c4, #d6a84f);
  color: #3d2a12;
  border: 1px solid rgba(122, 87, 30, 0.25);
}

.profileActionButton.message:hover:not(:disabled) {
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

.profileTribeBadge {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  max-width: 180px;
  padding: 6px 10px;
  border-radius: 999px;

  background: rgba(255, 255, 255, 0.46);
  border: 1px solid rgba(255, 255, 255, 0.42);

  box-shadow:
    0 8px 16px rgba(86, 72, 116, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.48);

  font-size: 13px;
  font-weight: 900;
  color: var(--profile-text-color) !important;
}

.profileTribeIcon {
  flex-shrink: 0;
  font-size: 14px;
}

.profileTribeName {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.profileHeroBanner {
  margin-bottom: 22px;
}

.profileIdentityBelow {
  margin-bottom: 20px;
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
  max-height: none;
  overflow: visible;
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
  z-index: 9999;
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