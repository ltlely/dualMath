
import { userManager } from "../userManagerSupabase.js";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";


const rankImages = {
  "Novice": "/noviceApprenticeRank.png",
  "Apprentice": "/noviceApprenticeRank.png",
  Skilled: "/skilledRank.png",
  Professional: "/professionalRank.png",
  Expert: "/expertRank.png",
  King: "/kingRank.png",
};

function getRankImage(rank) {
  return rankImages[rank] || "/noviceApprenticeRank.png";
}

function getDisplayRank(user) {
  if (user?.rank) return user.rank;
  if (user?.rankLevel) return user.rankLevel;

  const points = Number(user?.rankPoints ?? 0);

  if (points >= 2000) return "King";
  if (points >= 1500) return "Expert";
  if (points >= 1000) return "Professional";
  if (points >= 500) return "Skilled";
  if(points >= 300) return "Apprentice";
  return "Novice";
}

export default function FriendList({ currentUser, onBack, onUnreadCountChange,refreshUnreadCount,  onOnlineFriendsChange, onOpenProfile,  refreshKey, profileRefreshKey,}) {
  const [friends, setFriends] = useState([]);
  const [blockTarget, setBlockTarget] = useState(null);
const [unblockTarget, setUnblockTarget] = useState(null);
const [blockedUsers, setBlockedUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchUsername, setSearchUsername] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
const hasLoadedOnceRef = useRef(false);
  const [isSending, setIsSending] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

  const [activeView, setActiveView] = useState("friends");
  const [chatTarget, setChatTarget] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatSending, setIsChatSending] = useState(false);
  const [unreadSenders, setUnreadSenders] = useState([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [unreadPreviewNames, setUnreadPreviewNames] = useState([]);
  const [friendLastMessageMap, setFriendLastMessageMap] = useState({});
  const chatMessagesRef = useRef(null);
const chatBottomRef = useRef(null);
const [isBlocking, setIsBlocking] = useState(false);
const [declineTarget, setDeclineTarget] = useState(null);
const [blockSearchUsername, setBlockSearchUsername] = useState("");
const [isBlockingByUsername, setIsBlockingByUsername] = useState(false);
const [tribeRequests, setTribeRequests] = useState([]);
const [tribeRequestTarget, setTribeRequestTarget] = useState(null);




const handleBlockByUsername = async () => {
  const typedUsername = blockSearchUsername.trim();
  if (!typedUsername) return;

  setMessage("");
  setError("");
  setIsBlockingByUsername(true);

  try {
    const resolvedUser = await getResolvedUser();

    if (!resolvedUser?.id) {
      setError("You need to be logged in to block a user.");
      return;
    }

    const normalizedSearch = typedUsername.toLowerCase();
    const myUsername = (resolvedUser.username || "").toLowerCase();

    if (normalizedSearch === myUsername) {
      setError("You cannot block yourself.");
      return;
    }

    const alreadyBlocked = blockedUsers.some(
      (user) => (user.username || "").toLowerCase() === normalizedSearch
    );

    if (alreadyBlocked) {
      setError("That user is already blocked.");
      return;
    }

    const friendMatch = friends.find(
      (friend) => (friend.username || "").toLowerCase() === normalizedSearch
    );

    if (friendMatch) {
      const result = await userManager.blockUser(resolvedUser.id, friendMatch.id);

      if (!result?.success) {
        setError(result?.message || "Could not block user.");
        return;
      }

      if (chatTarget?.id === friendMatch.id) {
        setChatTarget(null);
        setChatMessages([]);
        setChatInput("");
      }

      setMessage(`${friendMatch.username} was blocked.`);
      setBlockSearchUsername("");
      await loadData(false);
      return;
    }

    const result = await userManager.blockUserByUsername(
      resolvedUser.id,
      typedUsername
    );

    if (!result?.success) {
      setError(result?.message || "Could not block user.");
      return;
    }

    setMessage(result.message || `${typedUsername} was blocked.`);
    setBlockSearchUsername("");
    await loadData(false);
  } catch (err) {
    console.error("handleBlockByUsername error:", err);
    setError(err?.message || "Could not block user.");
  } finally {
    setIsBlockingByUsername(false);
  }
};

function getComputedStatus(friend) {
  const rawStatus = (friend?.status || "").toLowerCase();

  if (!friend?.last_seen) return "offline";

  const diff = Date.now() - new Date(friend.last_seen).getTime();

  if (diff >= 45000) return "offline";

  if (rawStatus === "in_match") return "in_match";
  if (rawStatus === "in_room") return "in_room";

  return "online";
}

const getResolvedUser = useCallback(async () => {
  if (currentUser?.id) return currentUser;

  try {
    const freshUser = await userManager.getCurrentUser();
    return freshUser || null;
  } catch (err) {
    console.error("Could not resolve current user:", err);
    return null;
  }
}, [currentUser]);

const loadUnreadChatSummary = useCallback(async () => {
  const resolvedUser = await getResolvedUser();
  if (!resolvedUser?.id) return;

  const result = await userManager.getUnreadChatSummary(resolvedUser.id);
  const senders = result?.unreadSenders || [];

  setUnreadSenders(senders);
  setUnreadChatCount(senders.length);
  onUnreadCountChange?.(senders.length);
}, [getResolvedUser, onUnreadCountChange]);

  const loadFriendMessageMeta = useCallback(async () => {
    if (!currentUser?.id || !friends.length) {
      setUnreadPreviewNames([]);
      setFriendLastMessageMap({});
      return;
    }

    const unreadNames = friends
      .filter((friend) => unreadSenders.includes(friend.id))
      .map((friend) => friend.username);

    setUnreadPreviewNames(unreadNames);

    const map = await userManager.getFriendLastMessages(
      currentUser.id,
      friends.map((friend) => friend.id)
    );

    setFriendLastMessageMap(map || {});
  }, [currentUser?.id, friends, unreadSenders]);

  useEffect(() => {
    loadFriendMessageMeta();
  }, [loadFriendMessageMeta]);

 

 

  useEffect(() => {
    if (!currentUser?.id) return;

    loadUnreadChatSummary();

    const interval = setInterval(() => {
      loadUnreadChatSummary();
    }, 3000);

    return () => clearInterval(interval);
  }, [currentUser?.id, loadUnreadChatSummary]);

 const loadData = useCallback(
  async (showLoading = false) => {
    if (showLoading && !hasLoadedOnceRef.current) setIsLoading(true);

    const resolvedUser = await getResolvedUser();

    if (!resolvedUser?.id) {
      setFriends([]);
      setRequests([]);
       onOnlineFriendsChange?.([]);
      setIsLoading(false);
      return;
    }

    try {
const [friendsResult, requestsData, blockedData, tribeRequestsData] =
  await Promise.all([
    userManager.getFriends(resolvedUser.id),
    userManager.getFriendRequests(resolvedUser.id),
    userManager.getBlockedUsers(resolvedUser.id),
    userManager.getTribeRequests(resolvedUser.id),
  ]);

      const friendsData = Array.isArray(friendsResult)
        ? friendsResult
        : (friendsResult?.data || []);

//         console.log("friendsData statuses:", friendsData.map(f => ({
//   username: f.username,
//   status: f.status,
//   last_seen: f.last_seen
// })
// ));

      setFriends(friendsData);
      setRequests(requestsData || []);
      setBlockedUsers(blockedData || []);
      setTribeRequests(tribeRequestsData || []);
      hasLoadedOnceRef.current = true;
      setHasLoadedOnce(true);

 const computedOnlineFriends = friendsData.filter((friend) => {
  const value = getComputedStatus(friend);
  return value === "online" || value === "in_room" || value === "in_match";
});

onOnlineFriendsChange?.(computedOnlineFriends);

      if (!Array.isArray(friendsResult) && friendsResult?.success === false) {
        setError(friendsResult.message || "Could not load friends.");
      } else {
        setError("");
      }
    } catch (err) {
      console.error("Friend list load error:", err);
      setError("Could not load friends.");
    } finally {
      setIsLoading(false);
    }

    
  },
  [getResolvedUser]
);

useEffect(() => {
  loadData(true);
  const interval = setInterval(() => loadData(false), 3000);
  return () => clearInterval(interval);
}, [loadData, refreshKey, profileRefreshKey]);

const canOpenProfile = (user) => {
  if (!user?.id) return false;

  const isBlockedByMe =
    blockedUsers.some((blocked) => blocked.id === user.id) ||
    user?.isBlockedByMe === true;

  const blockedMe = user?.isBlockedByCurrentUser === true;

  return !isBlockedByMe && !blockedMe;
};

const handleOpenProfileSafe = (e, user) => {
  e?.stopPropagation?.();

  if (!canOpenProfile(user)) {
    setError("You cannot view this profile because one of you has blocked the other.");

    clearTimeout(window.profileBlockMessageTimeout);
    window.profileBlockMessageTimeout = setTimeout(() => {
      setError("");
    }, 4000);

    return;
  }

  onOpenProfile?.(user);
};

  useEffect(() => {
    const loadChatMessages = async (showLoading = false) => {
      if (!currentUser?.id || !chatTarget?.id) {
        setChatMessages([]);
        return;
      }

      try {
        if (showLoading) {
          setIsChatLoading(true);
        }

        const messages = await userManager.getFriendMessages(
          currentUser.id,
          chatTarget.id,
          currentUser.username || "You",
          chatTarget.username || "Friend"
        );

        setChatMessages(messages || []);
        setError("");
      } catch (err) {
        console.error("Chat load error:", err);
        setError("Could not load messages.");
      } finally {
        if (showLoading) {
          setIsChatLoading(false);
        }
      }
    };

    if (!currentUser?.id || !chatTarget?.id) {
      setChatMessages([]);
      return;
    }

    loadChatMessages(true);

    const interval = setInterval(() => {
      loadChatMessages(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [currentUser?.id, currentUser?.username, chatTarget?.id, chatTarget?.username]);

  const filteredFriends = useMemo(() => friends, [friends]);
    

const handleSendRequest = async () => {
  const typedUsername = searchUsername.trim();
  if (!typedUsername) return;

  setMessage("");
  setError("");
  setIsSending(true);

  const resolvedUser = await getResolvedUser();

  if (!resolvedUser?.id) {
    setError("You need to be logged in to send a friend request.");
    setIsSending(false);
    return;
  }

  const normalizedSearch = typedUsername.toLowerCase();
  const myUsername = (resolvedUser.username || "").toLowerCase();

  if (normalizedSearch === myUsername) {
    setError("You cannot add yourself.");
    setIsSending(false);
    return;
  }

  const alreadyFriend = friends.some(
    (friend) => (friend.username || "").toLowerCase() === normalizedSearch
  );

  if (alreadyFriend) {
    setError("You are already friends with that user.");
    setIsSending(false);
    return;
  }

  const pendingRequest = requests.some(
    (request) => (request.username || "").toLowerCase() === normalizedSearch
  );

  if (pendingRequest) {
    setError("There is already a pending friend request with that user.");
    setIsSending(false);
    return;
  }

  const alreadyBlocked = blockedUsers.some(
    (user) => (user.username || "").toLowerCase() === normalizedSearch
  );

  if (alreadyBlocked) {
    setError("You have blocked that user.");
    setIsSending(false);
    return;
  }

  try {
    const result = await userManager.sendFriendRequest(
      resolvedUser.id,
      typedUsername
    );

    if (!result?.success) {
      setError(result?.message || "Could not send request.");
      setIsSending(false);
      return;
    }

    setMessage(result.message || "Friend request sent.");
    setSearchUsername("");
    loadData(false);
  } catch (err) {
    console.error("handleSendRequest error:", err);
    setError(err?.message || "Could not send request.");
  } finally {
    setIsSending(false);
  }
};



 const handleAccept = async (request) => {
  setMessage("");
  setError("");

  const resolvedUser = await getResolvedUser();

  if (!resolvedUser?.id) {
    setError("You need to be logged in to accept a friend request.");
    return;
  }

  const result = await userManager.acceptFriendRequest(
    request.id,
    resolvedUser.id,
    request.senderId
  );

  if (!result?.success) {
    setError(result?.message || "Could not accept request.");
    return;
  }

  setMessage(result.message || "Friend added.");

  // instant UI update
  setRequests((prev) => prev.filter((r) => r.id !== request.id));
  setFriends((prev) => [
  ...prev,
  {
    id: request.senderId,
    username: request.username,
    avatarData: request.avatarData ?? null,
    wins: request.wins ?? 0,
    totalGames: request.totalGames ?? 0,
    winRate: request.winRate ?? 0,
    rankPoints: request.rankPoints ?? 0,
    rank: request.rank ?? getDisplayRank(request),
    rankLevel: request.rankLevel ?? getDisplayRank(request),
    status: request.status ?? "online",
    last_seen: request.last_seen ?? new Date().toISOString(),
  },
]);

  await loadData(false);
};

const handleDecline = (request) => {
  setDeclineTarget(request);
};

const confirmDeclineRequest = async () => {
  if (!declineTarget) return;

  setMessage("");
  setError("");

  const result = await userManager.declineFriendRequest(declineTarget.id);

  if (!result?.success) {
    setError(result?.message || "Could not decline request.");
    return;
  }

  setMessage(result.message || "Request declined.");
  setRequests((prev) => prev.filter((r) => r.id !== declineTarget.id));
  setDeclineTarget(null);
};

  const handleRemove = (friendId, friendUsername) => {
    setRemoveTarget({ id: friendId, username: friendUsername });
  };

  const handleBlock = (friendId, friendUsername) => {
  setBlockTarget({ id: friendId, username: friendUsername });
};

const confirmBlockFriend = async () => {
  if (!blockTarget) return;

  setMessage("");
  setError("");
  setIsBlocking(true);

  try {
    const resolvedUser = await getResolvedUser();

    if (!resolvedUser?.id) {
      setError("You need to be logged in to block a user.");
      return;
    }

    const result = await userManager.blockUser(resolvedUser.id, blockTarget.id);

    if (!result?.success) {
      setError(result?.message || "Could not block user.");
      return;
    }

    if (chatTarget?.id === blockTarget.id) {
      setChatTarget(null);
      setChatMessages([]);
      setChatInput("");
    }

    setMessage(`${blockTarget.username} was blocked.`);
    setBlockTarget(null);
    loadData(false);
  } finally {
    setIsBlocking(false);
  }
};

 const confirmRemoveFriend = async () => {
  if (!removeTarget) return;

  setMessage("");
  setError("");

  const resolvedUser = await getResolvedUser();

  if (!resolvedUser?.id) {
    setError("You need to be logged in to remove a friend.");
    return;
  }

  const result = await userManager.removeFriend(resolvedUser.id, removeTarget.id);

  if (!result?.success) {
    setError(result?.message || "Could not remove friend.");
    return;
  }

  if (chatTarget?.id === removeTarget.id) {
    setChatTarget(null);
    setChatMessages([]);
    setChatInput("");
  }

  setMessage(`${removeTarget.username} was removed from your friend list.`);
  setRemoveTarget(null);
  loadData(false);
};

  const handleSendChat = async () => {
  const trimmed = chatInput.trim();
  if (!trimmed || !chatTarget?.id) return;

  setError("");
  setIsChatSending(true);

  const resolvedUser = await getResolvedUser();

  if (!resolvedUser?.id) {
    setError("You need to be logged in to send a message.");
    setIsChatSending(false);
    return;
  }

  const result = await userManager.sendFriendMessage(
    resolvedUser.id,
    chatTarget.id,
    trimmed
  );

  if (!result?.success) {
    setError(result?.message || "Could not send message.");
    setIsChatSending(false);
    return;
  }

  setChatMessages((prev) => [
    ...prev,
    {
      id: Date.now(),
      sender: resolvedUser?.username || "You",
      text: trimmed,
      side: "right",
      createdAt: new Date().toISOString(),
    },
  ]);

  setChatInput("");
  setIsChatSending(false);
  scrollChatToBottom(true);
};

    

const openChat = async (friend) => {
  setChatTarget(friend);
  setActiveView("chat");
  setMessage("");
  setError("");

  const resolvedUser = await getResolvedUser();

  if (resolvedUser?.id && friend?.id) {
    await userManager.markChatAsRead(resolvedUser.id, friend.id);
    await loadUnreadChatSummary();
    await refreshUnreadCount?.();
  }
};

useEffect(() => {
  userManager.deleteExpiredMessages();
}, []);

const formatChatTimestamp = (value) => {
  if (!value) return "";

  const date = new Date(value);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const isSameYear = date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (isSameYear) {
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const isSameDay = (a, b) => {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return da.toDateString() === db.toDateString();
};

const formatChatDayLabel = (value) => {
  if (!value) return "";

  const date = new Date(value);
  const now = new Date();

  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const scrollChatToBottom = (smooth = true) => {
  requestAnimationFrame(() => {
    chatBottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "end",
    });
  });
};

useEffect(() => {
  if (!chatTarget) return;
  scrollChatToBottom(false);
}, [chatTarget?.id]);

useEffect(() => {
  if (!chatTarget) return;
  scrollChatToBottom(true);
}, [chatMessages.length]);

const handleUnblock = (userId, username) => {
  setUnblockTarget({ id: userId, username });
};

const confirmUnblockUser = async () => {
  if (!unblockTarget) return;

  setMessage("");
  setError("");

  const resolvedUser = await getResolvedUser();

  if (!resolvedUser?.id) {
    setError("You need to be logged in to unblock a user.");
    return;
  }

  const result = await userManager.unblockUser(resolvedUser.id, unblockTarget.id);

  if (!result?.success) {
    setError(result?.message || "Could not unblock user.");
    return;
  }

  setMessage(`${unblockTarget.username} was unblocked.`);
  setUnblockTarget(null);
  loadData(false);
};

const ONLINE_WINDOW_MS = 30000; // 30 sec

const handleAcceptTribeRequest = async (request) => {
  setMessage("");
  setError("");

  const resolvedUser = await getResolvedUser();

  if (!resolvedUser?.id) {
    setError("You need to be logged in to accept a tribe request.");
    return;
  }

  const result = await userManager.acceptTribeRequest(
    request.id,
    resolvedUser.id
  );

  if (!result?.success) {
    setError(result?.message || "Could not accept tribe request.");
    await loadData(false);
    return;
  }

  setMessage(result.message || "Joined tribe.");
  setTribeRequests((prev) => prev.filter((r) => r.id !== request.id));

  await loadData(false);
};

const handleDeclineTribeRequest = async (request) => {
  setMessage("");
  setError("");

  const resolvedUser = await getResolvedUser();

  if (!resolvedUser?.id) {
    setError("You need to be logged in to decline a tribe request.");
    return;
  }

  // Remove from UI immediately.
  setTribeRequests((prev) => prev.filter((r) => r.id !== request.id));

  const result = await userManager.declineTribeRequest(
    request.id,
    resolvedUser.id
  );

  if (!result?.success) {
    console.error("decline tribe failed:", result);

    // Reload to keep UI accurate.
    await loadData(false);

    setError(result?.message || "Could not decline tribe request.");
    return;
  }

  setMessage(result.message || "Tribe request declined.");
  await loadData(false);
};

  return (
    <div className="friendsShell">
      <div className="friendsTopbar">
        <div>
          <div className="miniLabel">Social</div>
          <h1 className="friendsHeading">Friends</h1>
          <p className="friendsMuted">
            Add friends, accept requests, and manage your list.
          </p>
        </div>
        <button type="button" className="backButton" onClick={onBack}>
          ✕
        </button>
      </div>

      <div className="friendsLayout">
        <aside className="friendsSidebar">
          <div className="profileCard">
            <div className="profileAvatar">
              {currentUser?.avatarData ? (
                <img src={currentUser.avatarData} alt={currentUser.username} />
              ) : (
                <span>{currentUser?.username?.[0]?.toUpperCase() || "?"}</span>
              )}
            </div>
            <div>
              <div className="miniLabel">PLAYER</div>
              <div className="profileName">{currentUser?.username || "Guest"}</div>
              <div className="profileSub">Build your friend circle</div>
            </div>
          </div>

          <button
            type="button"
            className={`navCard ${activeView === "friends" ? "active" : ""}`}
            onClick={() => setActiveView("friends")}
          >
            <span className="navLabel">Friends</span>
            <strong className="navCount">{friends.length}</strong>
          </button>

          <button
            type="button"
            className={`navCard ${activeView === "requests" ? "active" : ""}`}
            onClick={() => setActiveView("requests")}
          >
            <span className="navLabel">Requests</span>
            <strong className="navCount">{requests.length}</strong>
          </button>
          <button
  type="button"
  className={`navCard ${activeView === "tribeRequests" ? "active" : ""}`}
  onClick={() => setActiveView("tribeRequests")}
>
  <span className="navLabel">Tribe Requests</span>
  <strong className="navCount">{tribeRequests.length}</strong>
</button>

<button
  type="button"
  className={`navCard ${activeView === "chat" ? "active" : ""}`}
  onClick={() => {
    setActiveView("chat");
  }}
>
  <div className="navChatBlock">
    <span className="navLabelWithBadge">
      <span className="navLabel">Chat</span>
      {unreadSenders.length > 0 && (
        <span className="chatBadge">{unreadSenders.length}</span>
      )}
    </span>

    {unreadPreviewNames.length > 0 && (
      <span className="navSubPreview">
        {unreadPreviewNames.length === 1
          ? `${unreadPreviewNames[0]} messaged you`
          : `${unreadPreviewNames[0]} +${unreadPreviewNames.length - 1} more`}
      </span>
    )}
  </div>

  <strong className="navCount">{chatMessages.length}</strong>
</button>

<button
  type="button"
  className={`navCard ${activeView === "blocked" ? "active" : ""}`}
  onClick={() => setActiveView("blocked")}
>
  <span className="navLabel">Blocked</span>
  <strong className="navCount">{blockedUsers.length}</strong>
</button>
            
        </aside>

        <main className="friendsMain">
          {activeView === "blocked" && (
  <div className="friendsPanel listPanel requestFull">
    <div className="panelHeader">
      <div>
        <div className="miniLabel">Manage</div>
        <h2>Blocked Users</h2>
      </div>
    </div>

    <div className="addFriendRow">
      <input
        className="searchInput"
        type="text"
        placeholder="Enter username to block..."
        value={blockSearchUsername}
        onChange={(e) => setBlockSearchUsername(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleBlockByUsername();
        }}
      />
      <button
        className="blockButton"
        type="button"
        onClick={handleBlockByUsername}
        disabled={isBlockingByUsername}
      >
        {isBlockingByUsername ? "Blocking..." : "Block User"}
      </button>
    </div>

    <div className="friendsList requestScroll">
      {isLoading ? (
        <div className="emptyState">Loading blocked users...</div>
      ) : blockedUsers.length > 0 ? (
        blockedUsers.map((blocked) => (
          <div className="friendRow" key={blocked.id}>
            <div className="friendLeft">
              <button
                type="button"
                className="friendAvatar profileAvatarButton"
                onClick={(e) => handleOpenProfileSafe(e, blocked)}
                title={
                  canOpenProfile(blocked)
                    ? `View ${blocked.username}'s profile`
                    : "Profile unavailable"
                }
              >
                {blocked.avatarData ? (
                  <img src={blocked.avatarData} alt={blocked.username} />
                ) : (
                  <span>{blocked.username?.[0]?.toUpperCase() || "?"}</span>
                )}
              </button>

              <div>
                <div className="friendNameRow">
                  <div className="friendName">{blocked.username}</div>
                </div>
                <div className="friendSub">
                  {blocked.totalGames} games • {blocked.rankPoints} RP
                </div>
              </div>
            </div>

            <div className="friendActions">
              <button
                className="acceptButton"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnblock(blocked.id, blocked.username);
                }}
              >
                Unblock
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="emptyState">No blocked users.</div>
      )}
    </div>

    {message && <div className="statusMessage success">{message}</div>}
    {error && <div className="statusMessage error">{error}</div>}
  </div>
)}
          {activeView === "friends" && (
            <>
              <div className="friendsPanel addPanel">
                <div className="panelHeader">
                  <div>
                    <div className="miniLabel">Add Friend</div>
                    <h2>Search by Username</h2>
                  </div>
                </div>

                <div className="addFriendRow">
                  <input
                    className="searchInput"
                    type="text"
                    placeholder="Enter username..."
                    value={searchUsername}
                    onChange={(e) => setSearchUsername(e.target.value)}
                  />
                 <button
  className="actionButton"
  type="button"
  onClick={handleSendRequest}
  disabled={isSending}
>
  {isSending ? "Sending..." : "Send Request"}
</button>
                </div>

                {message && <div className="statusMessage success">{message}</div>}
                {error && <div className="statusMessage error">{error}</div>}
              </div>

              <div className="friendsPanel listPanel">
                <div className="panelHeader">
                  <div>
                    <div className="miniLabel">Your Friends</div>
                    <h2>Friend List</h2>
                  </div>
                </div>

               <div className="friendsList friendsScroll">
{isLoading && !hasLoadedOnce ? (
  <div className="emptyState">Loading friends...</div>
) : friends.length > 0 ? (
  [...friends]
.sort((a, b) => {
  const getPriority = (friend) => {
    const value = getComputedStatus(friend);

    if (value === "online") return 4;
    if (value === "in_room") return 3;
    if (value === "in_match") return 2;
    if (value === "away") return 1;
    return 0;
  };

  const diff = getPriority(b) - getPriority(a);
  if (diff !== 0) return diff;

  return (a.username || "").localeCompare(b.username || "");
})
  .map((friend) => (
<div className="friendRow" key={friend.id}>
                        <div className="friendLeft">
  <button
  type="button"
  className="friendAvatar profileAvatarButton"
  onClick={(e) => handleOpenProfileSafe(e, friend)}
  title={
    canOpenProfile(friend)
      ? `View ${friend.username}'s profile`
      : "Profile unavailable"
  }
>
  {friend.avatarData ? (
    <img src={friend.avatarData} alt={friend.username} />
  ) : (
    <span>{friend.username?.[0]?.toUpperCase() || "?"}</span>
  )}
</button>

                          <div>
                            <div className="friendNameRow">
                             <span className={`connectionDot ${getComputedStatus(friend)}`} />
                              <div className="friendName">{friend.username}</div>
 <img
                          className="onlineFriendRankBadge"
                          src={getRankImage(getDisplayRank(friend))}
alt={getDisplayRank(friend)}
                        />
                            </div>
                            <div className="friendSub">
                              {friend.totalGames} games • {friend.winRate}% WR •{" "}
                              {friend.rankPoints} RP
                            </div>
                          </div>
                        </div>

                        <div className="friendActions">

<button
  type="button"
  className="blockButton"
  onClick={(e) => {
    e.stopPropagation();
    handleBlock(friend.id, friend.username);
  }}
>
  Block
</button>
                          
                          <button
                            className="removeButton"
                            type="button"
                             onClick={(e) => {
    e.stopPropagation();
    handleRemove(friend.id, friend.username);
  }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="emptyState">No friends yet.</div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeView === "requests" && (
            <div className="friendsPanel listPanel requestFull">
              <div className="panelHeader">
                <div>
                  <div className="miniLabel">Pending</div>
                  <h2>Friend Requests</h2>
                </div>
              </div>

              <div className="friendsList requestScroll">
                {isLoading ? (
                  <div className="emptyState">Loading requests...</div>
                ) : requests.length > 0 ? (
                   requests
                  .map((request) => (
<div className="friendRow" key={request.id}>
                      <div className="friendLeft">
<button
  type="button"
  className="friendAvatar profileAvatarButton"
  onClick={(e) => handleOpenProfileSafe(e, request)}
  title={
    canOpenProfile(request)
      ? `View ${request.username}'s profile`
      : "Profile unavailable"
  }
>
  {request.avatarData ? (
    <img src={request.avatarData} alt={request.username} />
  ) : (
    <span>{request.username?.[0]?.toUpperCase() || "?"}</span>
  )}
</button>

                        <div>
                          <div className="friendNameRow">
  <div className="friendName">{request.username}</div>
                          <img
  className="friendRankBadge"
  src={getRankImage(getDisplayRank(request))}
alt={getDisplayRank(request)}
/>
</div>
                          <div className="friendSub">
                            {request.wins} wins • {request.winRate}% WR
                          </div>
                        </div>
                      </div>

                      <div className="friendActions">
                        <button
  type="button"
  className="acceptButton"
  onClick={(e) => {
    e.stopPropagation();
    handleAccept(request);
  }}
>
  Accept
</button>

<button
  type="button"
  className="declineButton"
  onClick={(e) => {
    e.stopPropagation();
    handleDecline(request);
  }}
>
  Decline
</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="emptyState">No pending requests.</div>
                )}
              </div>

              {message && <div className="statusMessage success">{message}</div>}
              {error && <div className="statusMessage error">{error}</div>}
            </div>
          )}



          {activeView === "chat" && (
            <div className="friendsPanel chatFull">
              <div className="panelHeader">
                <div>
                  <div className="miniLabel">Conversation</div>
                  <h2>{chatTarget ? chatTarget.username : "Select a friend to chat"}</h2>
                </div>
                {chatTarget && (
<button
  className="declineButton"
  type="button"
onClick={async () => {
  if (currentUser?.id && chatTarget?.id) {
    await userManager.markChatAsRead(currentUser.id, chatTarget.id);
    await loadUnreadChatSummary();
    await refreshUnreadCount?.();
  }

  setChatTarget(null);
  setChatMessages([]);
  setChatInput("");
}}
>
  ✕ Close
</button>
                )}
              </div>

              {!chatTarget ? (
                <div className="friendsList friendsScroll">
               {isLoading && !hasLoadedOnce ? (
    <div className="emptyState">Loading requests...</div>
  ) : friends.length > 0 ? (
  [...friends]
                      .sort((a, b) => {
                        const aTime = friendLastMessageMap[a.id]?.createdAt || "";
                        const bTime = friendLastMessageMap[b.id]?.createdAt || "";
                        return String(bTime).localeCompare(String(aTime));
                      })
                      .map((friend) => (
                        <div
                          className="friendRow"
                          key={friend.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => openChat(friend)}
                        >
                          <div className="friendLeft">
<button
  type="button"
  className="friendAvatar profileAvatarButton"
  onClick={(e) => handleOpenProfileSafe(e, friend)}
  title={
    canOpenProfile(friend)
      ? `View ${friend.username}'s profile`
      : "Profile unavailable"
  }
>
  {friend.avatarData ? (
    <img src={friend.avatarData} alt={friend.username} />
  ) : (
    <span>{friend.username?.[0]?.toUpperCase() || "?"}</span>
  )}
</button>

                            <div>
                            
<div className="friendNameRow">
  <span className={`connectionDot ${getComputedStatus(friend)}`} />
  <div className="friendName">{friend.username}</div>
 <img
  className="onlineFriendRankBadge"
  src={getRankImage(getDisplayRank(friend))}
  alt={getDisplayRank(friend)}
/>
  {unreadSenders.includes(friend.id) && (
    <span className="messageUnreadTag">New</span>
  )}
</div>

                              <div className="friendSub">
                                {friendLastMessageMap[friend.id]?.text
                                  ? friendLastMessageMap[friend.id].text
                                  : `${friend.totalGames} games • ${friend.rankPoints} RP`}
                              </div>
                            </div>
                          </div>

                          <span className="navHint">Tap to chat →</span>
                        </div>
                      ))
                  ) : (
                    <div className="emptyState">Add friends to start chatting.</div>
                  )}
                </div>
              ) : (
                <>
                  <div className="chatMessages">
                    {isChatLoading ? (
                      <div className="emptyState">Loading chat...</div>
                    ) : chatMessages.length > 0 ? (
  chatMessages.map((msg, index) => {
  const previousMsg = chatMessages[index - 1];
  const showDayDivider =
    index === 0 || !isSameDay(previousMsg?.createdAt, msg.createdAt);

  return (
    <React.Fragment key={msg.id}>
      {showDayDivider && (
        <div className="chatDayDivider">
          <span>{formatChatDayLabel(msg.createdAt)}</span>
        </div>
      )}

      <div className={`chatBubbleRow ${msg.side}`}>
        <div className={`chatBubble ${msg.side}`}>
          <div className="chatSenderRow">
            <div className="chatSender">{msg.sender}</div>
            <div className="chatTime">
              {formatChatTimestamp(msg.createdAt)}
            </div>
          </div>
          <div>{msg.text}</div>
        </div>
      </div>
    </React.Fragment>
  );
})
                    ) : (
                      <div className="emptyState">No messages yet.</div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  <div className="chatComposer">
                    <input
                      className="searchInput"
                      type="text"
                      placeholder="Type a message..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSendChat();
                      }}
                    />
                    <button
                      className="actionButton"
                      type="button"
                      onClick={handleSendChat}
                      disabled={isChatSending}
                    >
                      {isChatSending ? "Sending..." : "Send"}
                    </button>
                  </div>
                </>
              )}

              {error && <div className="statusMessage error">{error}</div>}
            </div>
          )}
        {activeView === "tribeRequests" && (
  <div className="friendsPanel listPanel requestFull">
    <div className="panelHeader">
      <div>
        <div className="miniLabel">Pending</div>
        <h2>Tribe Requests</h2>
      </div>
    </div>

    <div className="friendsList requestScroll">
      {isLoading ? (
        <div className="emptyState">Loading tribe requests...</div>
      ) : tribeRequests.length > 0 ? (
        tribeRequests.map((request) => (
          <div className="friendRow" key={request.id}>
            <div className="friendLeft">
              <div className="friendAvatar">
                {request.senderAvatarData ? (
                  <img
                    src={request.senderAvatarData}
                    alt={request.senderUsername}
                  />
                ) : (
                  <span>
                    {request.senderUsername?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
              </div>

              <div>
                <div className="friendNameRow">
                  <div className="friendName">{request.tribeName}</div>
                </div>

                <div className="friendSub">
                  Invited by {request.senderUsername}
                </div>
              </div>
            </div>

            <div className="friendActions">
              <button
                type="button"
                className="acceptButton"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAcceptTribeRequest(request);
                }}
              >
                Accept
              </button>

              <button
                type="button"
                className="declineButton"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeclineTribeRequest(request);
                }}
              >
                Decline
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="emptyState">No pending tribe requests.</div>
      )}
    </div>

    {message && <div className="statusMessage success">{message}</div>}
    {error && <div className="statusMessage error">{error}</div>}
  </div>
)}
        
        </main>
      </div>

      {declineTarget && (
  <div className="confirmModal">
    <div className="confirmOverlay" onClick={() => setDeclineTarget(null)} />
    <div className="confirmCard">
      <div className="miniLabel">Confirm</div>
      <h3>Decline Request?</h3>
      <p className="confirmText">
        Are you sure you want to decline <strong>{declineTarget.username}</strong>'s friend request?
      </p>

      <div className="confirmActions">
        <button
          type="button"
          className="acceptButton"
          onClick={() => setDeclineTarget(null)}
        >
          Cancel
        </button>
        <button
          type="button"
          className="declineButton"
          onClick={confirmDeclineRequest}
        >
          Decline
        </button>
      </div>
    </div>
  </div>
)}

     {blockTarget && (
  <div className="confirmModal">
    <div className="confirmOverlay" onClick={() => setBlockTarget(null)} />
    <div className="confirmCard">
      <div className="miniLabel">Confirm</div>
      <h3>Block User?</h3>
      <p className="confirmText">
        Are you sure you want to block <strong>{blockTarget.username}</strong>?
        They will no longer be able to interact with you.
      </p>

      {error && <div className="statusMessage error">{error}</div>}

      <div className="confirmActions">
        <button
          type="button"
          className="declineButton"
          onClick={() => setBlockTarget(null)}
        >
          Cancel
        </button>
<button
  type="button"
  className="blockButton"
  onClick={confirmBlockFriend}
  disabled={isBlocking}
>
  {isBlocking ? "Blocking..." : "Block"}
</button>
      </div>
    </div>
  </div>
)}

{removeTarget && (
  <div className="confirmModal">
    <div className="confirmOverlay" onClick={() => setRemoveTarget(null)} />
    <div className="confirmCard">
      <div className="miniLabel">Confirm</div>
      <h3>Remove Friend?</h3>
      <p className="confirmText">
        Are you sure you want to remove <strong>{removeTarget.username}</strong> from your friends?
      </p>
      <div className="confirmActions">
        <button
          type="button"
          className="declineButton"
          onClick={() => setRemoveTarget(null)}
        >
          Cancel
        </button>
        <button
          type="button"
          className="removeButton"
          onClick={confirmRemoveFriend}
        >
          Remove
        </button>
      </div>
    </div>
  </div>
)}



{unblockTarget && (
  <div className="confirmModal">
    <div className="confirmOverlay" onClick={() => setUnblockTarget(null)} />
    <div className="confirmCard">
      <div className="miniLabel">Confirm</div>
      <h3>Unblock User?</h3>
      <p className="confirmText">
        Are you sure you want to unblock <strong>{unblockTarget.username}</strong>?
      </p>
      <div className="confirmActions">
        <button
          type="button"
          className="declineButton"
          onClick={(e) => {
    e.stopPropagation(); setUnblockTarget(null); }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="acceptButton"
          onClick={confirmUnblockUser}
        >
          Unblock
        </button>
      </div>
    </div>
  </div>
)}



      <style>{`
      :root {
  --cream: #3a3126;
  --cream-2: #44382a;
  --cream-3: #51412e;
  --tan: #2d241b;
  --brown: #8f6a32;
  --brown-dark: #f0ddb8;
  --ink: #f5e7c6;
  --muted: #d0bb95;
}
.friendsShell {
  box-sizing: border-box;
  padding: 14px;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(120, 92, 38, 0.20), transparent 32%),
    radial-gradient(circle at top center, rgba(255, 214, 120, 0.08), transparent 42%),
    linear-gradient(180deg, #3a342b 0%, #26211c 52%, #171411 100%);
  color: var(--ink);
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.profileCard,
.friendsPanel,
.confirmCard {
  background: linear-gradient(180deg, rgba(50, 42, 30, 0.97), rgba(34, 28, 20, 0.97)) !important;
  border: 1px solid rgba(214, 172, 95, 0.18) !important;
  color: #f5e7c6 !important;
  box-shadow:
    0 14px 28px rgba(0, 0, 0, 0.22),
    0 0 18px rgba(224, 171, 63, 0.08),
    inset 0 1px 0 rgba(255, 236, 190, 0.05) !important;
}

.navCard {
  background: rgba(61, 50, 32, 0.76) !important;
  color: #f6e7c3 !important;
  border: 1px solid rgba(214, 172, 95, 0.16) !important;
  box-shadow:
    0 8px 18px rgba(0, 0, 0, 0.16),
    inset 0 1px 0 rgba(255, 236, 190, 0.04) !important;
}

.navCard:hover,
.navCard.active {
  background: linear-gradient(
    180deg,
    rgba(140, 118, 82, 0.42),
    rgba(140, 118, 82, 0.42)
  ) !important;
  color: #fff2d2 !important;
  border-color: rgba(237, 187, 87, 0.28) !important;
}

.friendRow {
  background: linear-gradient(
    180deg,
    rgba(140, 118, 82, 0.42),
    rgba(140, 118, 82, 0.42)
  ) !important;
  border: 1px solid rgba(214, 172, 95, 0.16) !important;
  color: #f4e3be !important;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow:
    0 10px 24px rgba(0, 0, 0, 0.12),
    inset 0 1px 0 rgba(255, 236, 190, 0.10) !important;
}

.chatBubble.left {
  background: linear-gradient(180deg, rgba(56, 46, 31, 0.97), rgba(39, 32, 21, 0.95)) !important;
  border: 1px solid rgba(214, 172, 95, 0.14) !important;
  color: #f4e3be !important;
}

.chatBubble.right {
  background: linear-gradient(180deg, rgba(112, 83, 36, 0.95), rgba(82, 61, 27, 0.95)) !important;
  color: #fff2d2 !important;
}

.searchInput {
  background: rgba(28, 24, 18, 0.88) !important;
  color: #f5e7c6 !important;
  border: 1px solid rgba(214, 172, 95, 0.18) !important;
}

.searchInput::placeholder {
  color: #bca885 !important;
}

.actionButton,
.acceptButton,
.declineButton,
.removeButton,
.blockButton,
.backButton {
  border-radius: 12px;
  border: 1px solid rgba(214, 172, 95, 0.18) !important;
  font-weight: 700;
  box-shadow:
    0 8px 18px rgba(0, 0, 0, 0.16),
    inset 0 1px 0 rgba(255, 236, 190, 0.04) !important;
}

.actionButton,
.acceptButton,
.backButton {
  background: linear-gradient(180deg, rgba(112, 83, 36, 0.95), rgba(82, 61, 27, 0.95)) !important;
  color: #fff2d2 !important;
}

.declineButton,
.removeButton {
  background: linear-gradient(180deg, rgba(65, 54, 37, 0.95), rgba(46, 38, 25, 0.95)) !important;
  color: #f0ddb8 !important;
}

.blockButton {
  background: linear-gradient(180deg, rgba(140, 67, 67, 0.95), rgba(110, 50, 50, 0.95)) !important;
  color: #fff2d2 !important;
}

.profileAvatarButton {
  border: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.profileAvatarButton:hover {
  transform: scale(1.04);
}

  
.emptyState,
.chatDayDivider span {
  background: rgba(36, 30, 22, 0.82) !important;
  border-color: rgba(214, 172, 95, 0.12) !important;
  color: #d0bb95 !important;
}

.statusMessage.success {
  background: rgba(120, 96, 44, 0.18) !important;
  border: 1px solid rgba(214, 172, 95, 0.24) !important;
  color: #f0ddb8 !important;
}

.statusMessage.error {
  background: rgba(120, 54, 54, 0.18) !important;
  border: 1px solid rgba(180, 90, 90, 0.24) !important;
  color: #f0c3b8 !important;
}

.profileName,
.friendName,
.friendsHeading,
.panelHeader h2,
.confirmCard h3 {
  color: #fff1cf !important;
}

.profileSub,
.friendsMuted,
.friendSub,
.navHint,
.navSubPreview,
.chatTime,
.chatSender,
.miniLabel,
.summaryLabel {
  color: #d0bb95 !important;
}

.navCount,
.friendRankBadge,
.onlineFriendRankBadge {
  color: #fff1cf !important;
}

        .friendRow {
  align-items: center;
}

.friendActions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
  position: relative;
  z-index: 2;
}

.blockButton,
.removeButton {
  position: relative;
  z-index: 3;
  pointer-events: auto;
}

        .friendsTopbar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 14px;
          flex-wrap: wrap;
          flex-shrink: 0;
        }

        .miniLabel,
        .summaryLabel {
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 11px;
          color: var(--muted);
        }

        .friendsHeading {
          margin: 4px 0 6px;
          font-size: clamp(28px, 4vw, 42px);
          line-height: 1;
        }

        .friendsMuted {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
        }

        .backButton {
          padding: 12px 16px;
          border-radius: 999px;
          border: 1px solid rgba(107, 79, 52, 0.12);
          background: var(--brown);
          color: #f9f1dd;
          font-weight: 700;
          cursor: pointer;
        }

        .friendsLayout {
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          gap: 12px;
          flex: 1;
          min-height: 0;
        }

        .friendsSidebar {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-height: 0;
          overflow: hidden;
        }

        .profileCard {
          display: grid;
          grid-template-columns: 56px 1fr;
          gap: 12px;
          padding: 12px;
          border-radius: 20px;
          background: linear-gradient(180deg, var(--cream-2), #e9e3b6);
          border: 1px solid rgba(93, 88, 63, 0.08);
          flex-shrink: 0;
        }


        .friendNameRow {
  display: flex;
  align-items: center;
  gap: 6px;
}

.friendRankBadge {
  width: 24px;
  height: 24px;
  object-fit: contain;
  display: block;
  flex-shrink: 0;
  margin-left: -4px;
}

        .profileAvatar {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: transparent;
          display: grid;
          place-items: center;
          overflow: hidden;
        }

        .profileAvatar img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .profileName {
          font-size: 16px;
          font-weight: 800;
          margin-top: 4px;
        }

        .profileSub {
          margin-top: 4px;
          color: var(--muted);
          font-size: 12px;
        }

        .navCard {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          border-radius: 18px;
          background: rgba(255, 253, 244, 0.75);
          border: 1px solid rgba(93, 88, 63, 0.08);
          color: var(--ink);
          cursor: pointer;
          text-align: left;
          transition: 0.15s ease;
          width: 100%;
        }

        .profileAvatarButton {
  border: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}

        .connectionDot.in_room {
  background: #e0ab3f;
  box-shadow: 0 0 10px rgba(224, 171, 63, 0.55);
}

        .navCard:hover {
          border-color: rgba(107, 79, 52, 0.3);
          background: linear-gradient(180deg, #f5eed7, #e1c89d);
        }

        .navCard.active {
          background: linear-gradient(180deg, #f5eed7, #e1c89d);
          border-color: rgba(107, 79, 52, 0.45);
          box-shadow: 0 4px 12px rgba(107, 79, 52, 0.12);
        }

.navHint {
  font-size: 12px;
  color: var(--muted);
  transition: 0.18s ease;
}

.friendRow:hover .navHint {
  transform: translate(2px, -1px);
  color: var(--brown-dark);
}

        .backButton:hover,
        .actionButton:hover,
.acceptButton:hover,
.declineButton:hover,
.removeButton:hover,
.blockButton:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(107, 79, 52, 0.10);
}

        .navLabel {
          font-weight: 700;
          font-size: 14px;
        }

        .navCount {
          font-size: 15px;
          color: var(--brown-dark);
        }

        .friendsMain {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 0;
          height: 100%;
          overflow: hidden;
        }

        .friendsPanel {
          background: linear-gradient(180deg, var(--cream), var(--tan));
          border: 1px solid rgba(93, 88, 63, 0.08);
          border-radius: 22px;
          padding: 12px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }

        .addPanel {
          flex-shrink: 0;
        }

        .listPanel {
          flex: 1;
          min-height: 0;
        }

        .requestFull,
        .chatFull {
          flex: 1;
          min-height: 0;
        }

        .panelHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 10px;
          flex-shrink: 0;
        }

        .panelHeader h2 {
          margin: 4px 0 0;
          font-size: 18px;
        }

        .addFriendRow {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          flex-shrink: 0;
          margin-bottom: 20px;
        }

        .onlineFriendRankBadge {
  width: 24px;
  height: 24px;
  object-fit: contain;
  display: block;
  flex-shrink: 0;
  margin-left: -4px;
}

        .searchInput {
          flex: 1;
          min-width: 160px;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(93, 88, 63, 0.12);
          background: #fffdf5;
          color: var(--ink);
          outline: none;
        }

        .friendsList {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 0;
        }

        .friendsScroll,
        .requestScroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 4px;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .friendsScroll::-webkit-scrollbar,
        .requestScroll::-webkit-scrollbar {
          display: none;
        }

        .friendRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 16px;
          background: linear-gradient(180deg, #f9f7ea, var(--cream-3));
          border: 1px solid rgba(93, 88, 63, 0.08);
          flex-wrap: wrap;
          flex-shrink: 0;
        }

        .friendLeft {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .friendAvatar {
          width: 44px;
          height: 44px;
          border-radius: 13px;
          background: transparent;
          display: grid;
          place-items: center;
          overflow: hidden;
          flex-shrink: 0;
        }

        .connectionDot.away {
  background: #e0ab3f;
  box-shadow: 0 0 10px rgba(224, 171, 63, 0.45);
}

        .friendAvatar img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }


        .chatHeaderUser {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chatHeaderUser h2 {
  margin: 4px 0 0;
}

.chatHeaderRankBadge {
  width: 20px;
  height: 20px;
  object-fit: contain;
  display: block;
  flex-shrink: 0;
  margin-top: 4px;
}

        .friendNameRow {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .friendName {
          font-weight: 800;
          font-size: 14px;
        }

        .friendSub {
          color: var(--muted);
          font-size: 12px;
          margin-top: 3px;
        }

        .friendActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .navHint {
          font-size: 12px;
          color: var(--muted);
        }

        .blockButton {
  background: #d96a6a;
  color: #fff8ee;
}

        .actionButton,
.acceptButton,
.declineButton,
.removeButton,
.blockButton {
          border: none;
          border-radius: 12px;
          padding: 8px 12px;
          font-weight: 700;
          cursor: pointer;
          font-size: 13px;
        }

        .friendRow {
  position: relative;
}

.friendLeft {
  min-width: 0;
  flex: 1;
}

.friendActions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
  position: relative;
  z-index: 5;
  flex-shrink: 0;
}

.acceptButton,
.declineButton,
.removeButton,
.blockButton {
  position: relative;
  z-index: 6 !important;
  pointer-events: auto;
}

        .actionButton,
        .acceptButton {
          background: #8d6b4f;
          color: #fff8ee;
        }

        .declineButton,
        .removeButton {
          background: rgba(255,255,255,0.7);
          color: var(--brown-dark);
        }

        .emptyState {
          min-height: 72px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          border: 1px dashed rgba(93, 88, 63, 0.16);
          color: var(--muted);
          background: rgba(255, 253, 244, 0.55);
        }

        .statusMessage {
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: 14px;
          font-size: 13px;
          flex-shrink: 0;
        }

        .statusMessage.success {
          background: rgba(145, 115, 70, 0.12);
          border: 1px solid rgba(145, 115, 70, 0.35);
          color: #5e7a58;
        }

        .statusMessage.error {
          background: rgba(168, 88, 72, 0.12);
          border: 1px solid rgba(168, 88, 72, 0.3);
          color: #b06c6c;
        }

        .chatMessages {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-right: 4px;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .chatMessages::-webkit-scrollbar {
          display: none;
        }

        .chatBubbleRow {
          display: flex;
        }

        .chatBubbleRow.left {
          justify-content: flex-start;
        }

        .chatBubbleRow.right {
          justify-content: flex-end;
        }

        .chatBubble {
  width: fit-content;
  min-width: 120px;
  max-width: 72%;
  padding: 10px 12px;
  border-radius: 16px;
  font-size: 13px;
  line-height: 1.4;
  box-sizing: border-box;
}

        .chatBubble.left {
          background: linear-gradient(180deg, #f9f7ea, var(--cream-3));
          border: 1px solid rgba(93, 88, 63, 0.08);
          color: var(--ink);
        }

        .chatBubble.right {
          background: #8d6b4f;
          color: #fff8ee;
        }

        .chatSender {
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 4px;
          opacity: 0.8;
        }

        .chatComposer {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .connectionDot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .connectionDot.online {
          background: #92d36e;
          box-shadow: 0 0 10px rgba(146, 211, 110, 0.65);
        }

        .connectionDot.in_match {
          background: #d96a6a;
          box-shadow: 0 0 10px rgba(217, 106, 106, 0.65);
        }

        .connectionDot.offline {
          background: #b9aa93;
        }

        .confirmModal {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: center;
        }

        .confirmOverlay {
          position: absolute;
          inset: 0;
          background: rgba(76, 56, 38, 0.45);
          backdrop-filter: blur(4px);
        }

        .confirmCard {
          position: relative;
          z-index: 1;
          width: min(92vw, 420px);
          background: linear-gradient(180deg, var(--cream), var(--tan));
          border: 1px solid rgba(93, 88, 63, 0.08);
          border-radius: 24px;
          padding: 20px;
          box-shadow: 0 18px 36px rgba(95, 70, 48, 0.18);
          color: var(--ink);
        }

        .confirmCard h3 {
          margin: 8px 0 10px;
          font-size: 24px;
        }

        .confirmText {
          margin: 0;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.5;
        }

        .confirmActions {
          margin-top: 18px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .confirmActions .acceptButton,
        .confirmActions .declineButton {
          min-width: 110px;
        }

        .navLabelWithBadge {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .chatBadge {
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 999px;
          background: #d96a6a;
          color: #fff8ee;
          font-size: 11px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 10px rgba(217, 106, 106, 0.35);
        }

        .miniUnreadBadge {
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(217, 106, 106, 0.14);
          color: #a34d4d;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .navChatBlock {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }

        .navSubPreview {
          font-size: 11px;
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 120px;
        }

        @media (max-width: 950px) {
          .friendsLayout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-height: 860px) {
          .friendsShell {
            padding: 10px;
          }

          .friendsLayout {
            gap: 10px;
          }

          .friendsTopbar {
            margin-bottom: 10px;
          }

          .friendsHeading {
            font-size: 26px;
          }

          .friendsMuted {
            display: none;
          }

          .profileCard {
            grid-template-columns: 46px 1fr;
            gap: 10px;
            padding: 10px;
          }

          .profileAvatar {
            width: 46px;
            height: 46px;
          }

          .navCard {
            padding: 10px 12px;
          }

          .panelHeader h2 {
            font-size: 16px;
          }

          .friendRow {
            padding: 8px 10px;
          }

          .friendAvatar {
            width: 38px;
            height: 38px;
          }
        }

 .messageUnreadTag {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(217, 106, 106, 0.14);
  color: #a34d4d;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  flex-shrink: 0;
}

.chatSenderRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
}

.chatTime {
  font-size: 10px;
  opacity: 0.7;
  white-space: nowrap;
}

.chatDayDivider {
  display: flex;
  justify-content: center;
  margin: 6px 0 2px;
}

.chatDayDivider span {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 253, 244, 0.8);
  border: 1px solid rgba(93, 88, 63, 0.08);
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
}
      `}</style>
    </div>
  );
}