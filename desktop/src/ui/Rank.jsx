import React, { useEffect, useMemo, useState } from "react";
import { userManager } from "../userManagerSupabase.js";

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

function safeNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function getWinRate(player) {
  const wins = safeNumber(player?.wins);
  const losses = safeNumber(player?.losses);
  const totalGames =
    player?.totalGames != null
      ? safeNumber(player.totalGames)
      : wins + losses;

  if (!totalGames) return 0;
  return Math.round((wins / totalGames) * 100);
}

function normalizePlayer(player, index) {
  const wins = safeNumber(player?.wins);
  const losses = safeNumber(player?.losses);
  const totalGames =
    player?.totalGames != null
      ? safeNumber(player?.totalGames)
      : wins + losses;

  const username =
    player?.username ||
    player?.name ||
    player?.displayName ||
    `Player ${index + 1}`;

return {
  ...player,
  id: player?.id || `player-${index}`,
  username,
  name: player?.name || username,
  displayName: player?.displayName || username,
bio: player?.bio || "",
country: player?.country || "",
avatarData: player?.avatarData || player?.avatar || null,
profileStatus: player?.profileStatus || "",
wins,
  losses,
  totalGames,
  rankPoints: safeNumber(player?.rankPoints),
  winRate: getWinRate(player),
  isBlockedByMe: player?.isBlockedByMe === true,
  isBlockedByCurrentUser: player?.isBlockedByCurrentUser === true,
};
}

export default function Rank({ currentUser, onBack, onOpenProfile,  preloadedRankData, }) {
const [rankTab, setRankTab] = useState("players");
const [tribes, setTribes] = useState([]);
const [isTribeLoading, setIsTribeLoading] = useState(false);
  const [players, setPlayers] = useState(() =>
  (preloadedRankData?.players || []).map(normalizePlayer)
);

const [isLoading, setIsLoading] = useState(
  !(preloadedRankData?.players || []).length
);

const [friendIds, setFriendIds] = useState(
  preloadedRankData?.friendIds || []
);

const [blockedUsers, setBlockedUsers] = useState(
  preloadedRankData?.blockedUsers || []
);
  const [error, setError] = useState("");
  const MIN_GAMES_FOR_RATIO = 5;

  useEffect(() => {
  if (!preloadedRankData) return;

  setPlayers((preloadedRankData.players || []).map(normalizePlayer));
  setFriendIds(preloadedRankData.friendIds || []);
  setBlockedUsers(preloadedRankData.blockedUsers || []);
  setIsLoading(false);
}, [preloadedRankData]);

  useEffect(() => {
    let isMounted = true;

    const loadRelationshipData = async () => {
      try {
        const resolvedUser =
          currentUser?.id ? currentUser : await userManager.getCurrentUser();

        if (!resolvedUser?.id) {
          if (isMounted) {
            setFriendIds([]);
            setBlockedUsers([]);
          }
          return;
        }

        const [friendsResult, blockedData] = await Promise.all([
          userManager.getFriends(resolvedUser.id),
          userManager.getBlockedUsers(resolvedUser.id),
        ]);

        if (!isMounted) return;

        const friendsArray = Array.isArray(friendsResult)
          ? friendsResult
          : (friendsResult?.data || []);

        const ids = friendsArray
          .map((friend) => String(friend.id))
          .filter(Boolean);

        setFriendIds(ids);
        setBlockedUsers(blockedData || []);
      } catch (err) {
        console.error("Failed to load relationship data for rank page:", err);
        if (isMounted) {
          setFriendIds([]);
          setBlockedUsers([]);
        }
      }
    };

    loadRelationshipData();

    return () => {
      isMounted = false;
    };
}, [currentUser?.id]);

const buildProfilePayload = async (user) => {
  const leaderboardVersion = players.find(
    (p) => String(p.id) === String(user?.id)
  );

  let freshUser = null;

  try {
    if (user?.id && typeof userManager.getUserById === "function") {
      freshUser = await userManager.getUserById(user.id);
    }
  } catch (err) {
    console.error("Failed to fetch latest profile user in Rank:", err);
  }

  return normalizePlayer(
    {
      ...(leaderboardVersion || {}),
      ...(currentUser?.id === user?.id ? currentUser : {}),
      ...(user || {}),
      ...(freshUser || {}),
    },
    0
  );
};
const syncUpdatedProfileUser = (updatedUser) => {
  if (!updatedUser?.id) return;

  const normalized = normalizePlayer(updatedUser, 0);

  setPlayers((prev) =>
    (prev || []).map((player) =>
      String(player.id) === String(updatedUser.id)
        ? { ...player, ...normalized }
        : player
    )
  );

  if (String(updatedUser.id) === String(currentUser?.id)) {
    setMe((prev) => ({
      ...(prev || {}),
      ...normalized,
    }));
  }
};

  useEffect(() => {
    let isMounted = true;

    const loadLeaderboard = async () => {
      try {
        if (!preloadedRankData?.players?.length) {
  setIsLoading(true);
}

        const resolvedUser =
          currentUser?.id ? currentUser : await userManager.getCurrentUser();

        const data = await userManager.getLeaderboard(resolvedUser?.id);
const mapped = (data || []).map(normalizePlayer);

if (isMounted) {
  setPlayers(mapped);
}
      } catch (err) {
        console.error("Failed to load leaderboard:", err);
        if (isMounted) setPlayers([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadLeaderboard();

    return () => {
      isMounted = false;
    };
}, [currentUser?.id, preloadedRankData?.players?.length]);

  const canOpenProfile = (user) => {
    if (!user?.id) return false;

    const isBlockedByMe =
      blockedUsers.some((blocked) => String(blocked.id) === String(user.id)) ||
      user?.isBlockedByMe === true;

    const blockedMe = user?.isBlockedByCurrentUser === true;

    return !isBlockedByMe && !blockedMe;
  };

const handleOpenProfileSafe = async (e, user) => {
  e?.stopPropagation?.();

  if (!canOpenProfile(user)) {
    setError(
      "You cannot view this profile because one of you has blocked the other."
    );

    clearTimeout(window.rankProfileBlockMessageTimeout);
    window.rankProfileBlockMessageTimeout = setTimeout(() => {
      setError("");
    }, 4000);

    return;
  }

  // Open immediately using current leaderboard data
  const quickProfileUser = normalizePlayer(user, 0);

  onOpenProfile?.(quickProfileUser, {
    onProfileSaved: (updatedUser) => {
      syncUpdatedProfileUser(updatedUser);
    },
  });
};

const normalizedPlayers = useMemo(() => {
  return (players || []).map(normalizePlayer);
}, [players]);

  const leaderboard = useMemo(() => {
    return [...normalizedPlayers]
      .filter((p) => p.totalGames >= MIN_GAMES_FOR_RATIO)
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.rankPoints - a.rankPoints;
      })
      .slice(0, 10);
  }, [normalizedPlayers]);

 const [me, setMe] = useState(() => {
  if (!currentUser) return null;

  const fromPreload = (preloadedRankData?.players || []).find(
    (player) => String(player.id) === String(currentUser.id)
  );

  return normalizePlayer(
    {
      ...(fromPreload || {}),
      ...(currentUser || {}),
    },
    0
  );
});

useEffect(() => {
  let isMounted = true;

  const loadMe = async () => {
    if (!currentUser?.id) {
      setMe(currentUser ? normalizePlayer(currentUser, 0) : null);
      return;
    }

    const fromLeaderboard = normalizedPlayers.find(
      (player) => String(player.id) === String(currentUser.id)
    );

let freshMe = null;

// Only fetch if we did not already preload this user.
if (!fromLeaderboard) {
  try {
    if (typeof userManager.getUserById === "function") {
      freshMe = await userManager.getUserById(currentUser.id);
    }
  } catch (err) {
    console.error("Failed to fetch latest current user in Rank:", err);
  }
}

    if (!isMounted) return;

    setMe(
      normalizePlayer(
        {
          ...(fromLeaderboard || {}),
          ...(currentUser || {}),
          ...(freshMe || {}),
        },
        0
      )
    );
  };

  loadMe();

  return () => {
    isMounted = false;
  };
}, [currentUser, normalizedPlayers]);

useEffect(() => {
  let isMounted = true;

  const loadTribeLeaderboard = async () => {
    try {
      setIsTribeLoading(true);

      if (typeof userManager.getTribeLeaderboard !== "function") {
        console.warn("getTribeLeaderboard is missing from userManager");
        setTribes([]);
        return;
      }

      const result = await userManager.getTribeLeaderboard(currentUser?.id);

      if (!isMounted) return;

      if (!result?.success) {
        setTribes([]);
        return;
      }

      setTribes(result.tribes || []);
    } catch (err) {
      console.error("Failed to load tribe leaderboard:", err);
      if (isMounted) setTribes([]);
    } finally {
      if (isMounted) setIsTribeLoading(false);
    }
  };

  loadTribeLeaderboard();

  return () => {
    isMounted = false;
  };
}, [currentUser?.id]);

const tribeLeaderboard = useMemo(() => {
  return [...tribes]
    .filter((tribe) => Number(tribe.totalGames || 0) >= MIN_GAMES_FOR_RATIO)
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.rankPoints !== a.rankPoints) return b.rankPoints - a.rankPoints;
      return b.totalGames - a.totalGames;
    })
    .slice(0, 10);
}, [tribes]);

const myTribe = useMemo(() => {
  return tribes.find((tribe) => tribe.isMyTribe) || null;
}, [tribes]);

  return (
    <div className="rankShell">
      <div className="rankTopbar">
        <div>
          <div className="miniLabel">Rank</div>
          <h1 className="rankHeading">Leaderboard</h1>
        </div>

        <button type="button" className="backButton" onClick={onBack}>
          ✕
        </button>
      </div>

<div className="rankTabs">
  <button
    type="button"
    className={`rankTab ${rankTab === "players" ? "active" : ""}`}
    onClick={() => setRankTab("players")}
  >
    Players
  </button>

  <button
    type="button"
    className={`rankTab ${rankTab === "tribes" ? "active" : ""}`}
    onClick={() => setRankTab("tribes")}
  >
    Tribes
  </button>
</div>

      {rankTab === "players" && me && (
        <section className="mePanel">
          <div className="miniLabel">Your Stats</div>
          <div
            className="meCard"
            style={{ cursor: "pointer" }}
            onClick={(e) => handleOpenProfileSafe(e, me)}
          >
            <div className="meIdentity">
              <div className="meAvatar">
                {me.avatarData ? (
                  <img src={me.avatarData} alt={me.username} />
                ) : (
                  <span>{me.username?.[0]?.toUpperCase() || "?"}</span>
                )}
              </div>

              <div>
                <div className="meName">{me.username}</div>
                <div className="meSub">
                  {me.wins} wins • {me.losses} losses
                </div>
              </div>
            </div>

            <div className="meStats">
              <div className="statPill">
                <span>Win Rate</span>
                <strong>{me.winRate}%</strong>
              </div>
             
            </div>
          </div>
        </section>
      )}

      {rankTab === "tribes" && myTribe && (
  <section className="mePanel tribeMePanel">
    <div className="miniLabel">Your Tribe</div>

    <div className="meCard tribeMeCard">
      <div className="meIdentity">
        <div className="tribeLeaderAvatar tribeMeAvatar">
          {myTribe.name?.[0]?.toUpperCase() || "?"}
        </div>

        <div>
          <div className="meName">{myTribe.name}</div>
          <div className="meSub">
            {myTribe.memberCount} members
          </div>
        </div>
      </div>

      <div className="meStats">
        

        <div className="statPill">
          <span>Win Rate</span>
          <strong>{myTribe.winRate}%</strong>
        </div>

        <div className="statPill">
          <span>Games</span>
          <strong>{myTribe.totalGames}</strong>
        </div>

      </div>
    </div>
  </section>
)}

{rankTab === "tribes" && !myTribe && !isTribeLoading && (
  <section className="mePanel tribeMePanel">
    <div className="miniLabel">Your Tribe</div>
    <div className="meCard tribeMeCard">
      <div className="emptyState smallEmptyState">
        You are not in a tribe yet.
      </div>
    </div>
  </section>
)}

<div className="rankGrid singleColumn">
  {rankTab === "players" ? (
    <section className="rankPanel">
      <div className="panelHeader">
        <div className="miniLabel">Leaderboard</div>
        <h2>Top Players</h2>
      </div>

      <div className="leaderList">
        {isLoading ? (
          <div className="emptyState">Loading leaderboard...</div>
        ) : leaderboard.length > 0 ? (
          leaderboard.map((player, index) => (
            <div className="leaderRow" key={`leader-${player.id}`}>
              <div className="leaderLeft">
                <div className="leaderPlace">#{index + 1}</div>

                <button
                  type="button"
                  className={`leaderAvatar profileAvatarButton ${
                    !canOpenProfile(player) ? "leaderAvatarBlocked" : ""
                  }`}
                  onClick={(e) => handleOpenProfileSafe(e, player)}
                  disabled={!canOpenProfile(player)}
                  title={
                    canOpenProfile(player)
                      ? `View ${player.username}'s profile`
                      : "Profile unavailable"
                  }
                >
                  {player.avatarData ? (
                    <img src={player.avatarData} alt={player.username} />
                  ) : (
                    <span>{player.username?.[0]?.toUpperCase() || "?"}</span>
                  )}
                </button>

                <div>
                  <div className="leaderNameRow">
                    <div className="leaderName">{player.username}</div>

                    <img
                      className="leaderRankIcon"
                      src={getRankImage(userManager.getUserRank(player))}
                      alt={userManager.getUserRank(player)}
                    />

                    {String(player.id) !== String(currentUser?.id) &&
                      friendIds.includes(String(player.id)) && (
                        <div className="friendBadge">Friend</div>
                      )}

                    {blockedUsers.some(
                      (blocked) => String(blocked.id) === String(player.id)
                    ) && <div className="blockedBadge">Blocked</div>}
                  </div>

                  <div className="leaderSub">
                    {player.totalGames} games 
                  </div>
                </div>
              </div>

              <div className="leaderStats">
                
                <div className="leaderStatBox">
                  <span>WR</span>
                  <strong>{player.winRate}%</strong>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="emptyState">
            No players with at least {MIN_GAMES_FOR_RATIO} games yet.
          </div>
        )}
      </div>
    </section>
  ) : (
    <section className="rankPanel">
      <div className="panelHeader">
        <div className="miniLabel">Leaderboard</div>
        <h2>Top Tribes</h2>
      </div>

      <div className="leaderList">
        {isTribeLoading ? (
          <div className="emptyState">Loading tribe leaderboard...</div>
        ) : tribeLeaderboard.length > 0 ? (
          tribeLeaderboard.map((tribe, index) => (
            <div className="leaderRow tribeLeaderRow" key={`tribe-${tribe.id}`}>
              <div className="leaderLeft">
                <div className="leaderPlace">#{index + 1}</div>

                <div className="tribeLeaderAvatar">
                  {tribe.name?.[0]?.toUpperCase() || "?"}
                </div>

                <div>
                  <div className="leaderNameRow">
                    <div className="leaderName">{tribe.name}</div>

                    {tribe.isMyTribe && (
                      <div className="friendBadge">Your Tribe</div>
                    )}
                  </div>

                  <div className="leaderSub">
                    {tribe.memberCount} members • {tribe.totalGames} games 
                  </div>
                </div>
              </div>

              <div className="leaderStats">
             

                <div className="leaderStatBox">
                  <span>WR</span>
                  <strong>{tribe.winRate}%</strong>
                </div>

                
              </div>
            </div>
          ))
        ) : (
          <div className="emptyState">
            No tribes with at least {MIN_GAMES_FOR_RATIO} total games yet.
          </div>
        )}
      </div>
    </section>
  )}
</div>

      {error && <div className="statusMessage error">{error}</div>}

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
}

.smallEmptyState {
  min-height: 72px !important;
  width: 100%;
}

.tribeMePanel {
  margin-bottom: 18px;
}

.tribeMeCard {
  background: linear-gradient(
    180deg,
    rgba(209, 158, 71, 0.42),
    rgba(209, 158, 71, 0.42)
  ) !important;
}

.tribeMeAvatar {
  width: 68px !important;
  height: 68px !important;
  border-radius: 18px !important;
  font-size: 26px !important;
}

.rankTabs {
  display: flex;
  gap: 10px;
  margin: 0 0 14px;
  flex-wrap: wrap;
}

.rankTab {
  border: 1px solid rgba(214, 172, 95, 0.18);
  border-radius: 999px;
  padding: 10px 18px;
  background: rgba(61, 50, 32, 0.76);
  color: #f6e7c3;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  box-shadow:
    0 8px 18px rgba(0, 0, 0, 0.16),
    inset 0 1px 0 rgba(255, 236, 190, 0.04);
}

.rankTab.active {
  background: linear-gradient(
    180deg,
    rgba(112, 83, 36, 0.95),
    rgba(82, 61, 27, 0.95)
  );
  color: #fff2d2;
  border-color: rgba(237, 187, 87, 0.28);
}

.tribeLeaderRow {
  align-items: flex-start !important;
}

.tribeLeaderRow .leaderLeft {
  align-items: flex-start !important;
}

.tribeLeaderRow .leaderNameRow {
  align-items: flex-start !important;
  margin-top: 2px;
}

.tribeLeaderRow .tribeLeaderAvatar,
.tribeLeaderRow .leaderPlace {
  margin-top: 2px;
}
  
.tribeLeaderAvatar {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  flex-shrink: 0;

  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.18), transparent 38%),
    linear-gradient(180deg, rgba(224, 171, 63, 0.42), rgba(122, 83, 44, 0.86));

  border: 1px solid rgba(224, 171, 63, 0.24);
  color: #fff1cf;
  font-weight: 950;
  font-size: 20px;

  box-shadow:
    0 10px 22px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 236, 190, 0.12);
}

.tribeLeaderRow .leaderStats {
  gap: 8px;
}

.leaderRankIcon {
  width: 25px;
  height: 25px;
  object-fit: contain;
  flex-shrink: 0;
  margin-left: 8px;
  margin-right: 8px;
}

.profileAvatarButton {
  border: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}

.profileAvatarButton:disabled {
  cursor: not-allowed;
}


.friendBadge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: linear-gradient(180deg, #efe9ff, #d9cfff);
  border: 1px solid rgba(138, 116, 201, 0.28);
  color: #6b57a6;
  font-size: 11px;
  font-weight: 800;
  box-shadow: 0 4px 10px rgba(138, 116, 201, 0.12);
}

        .rankShell {
  height: 100vh;
  overflow: hidden;
  padding: 24px;
  background:
    radial-gradient(circle at top, rgba(120, 92, 38, 0.20), transparent 32%),
    radial-gradient(circle at top center, rgba(255, 214, 120, 0.08), transparent 42%),
    linear-gradient(180deg, #3a342b 0%, #26211c 52%, #171411 100%);
  color: var(--ink);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 0;
}



.rankGrid.singleColumn {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  flex: 1;
  min-height: 0;
}

.rankPanel {
  background: linear-gradient(180deg, var(--cream), var(--tan));
  border: 1px solid rgba(93, 88, 63, 0.08);
  border-radius: 24px;
  padding: 18px;
  box-shadow: 0 12px 24px rgba(95, 70, 48, 0.10);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* ─── DARK SHELL OVERRIDES ────────────────────────────────────── */

/* ─── DARK SHELL OVERRIDES ────────────────────────────────────── */

.topNavShell {
  background: rgba(34, 29, 22, 0.68) !important;
  border-color: rgba(255, 220, 150, 0.10) !important;
  box-shadow:
    0 14px 34px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 240, 205, 0.06) !important;
}

.statsGrid {
  background:
    radial-gradient(circle at 50% 18%, rgba(255, 210, 110, 0.08), transparent 30%),
    linear-gradient(180deg, #3a3126 0%, #2a231b 52%, #1b1712 100%) !important;
  box-shadow:
    0 18px 26px -10px rgba(0, 0, 0, 0.28),
    0 34px 54px -22px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 236, 190, 0.06) !important;
}

.meCard {
  background: linear-gradient(180deg, rgba(209, 158, 71, 0.42), rgba(209, 158, 71, 0.42)) !important;
}

.rankProgressSection,
.rankPanel,
.roomCard,
.onlineFriendsCard,
.settingsCard {
  background: linear-gradient(180deg, rgba(50, 42, 30, 0.97), rgba(34, 28, 20, 0.97)) !important;
  border-color: rgba(214, 172, 95, 0.18) !important;
  color: #f5e7c6 !important;
  box-shadow:
    0 14px 28px rgba(0, 0, 0, 0.22),
    0 0 18px rgba(224, 171, 63, 0.08),
    inset 0 1px 0 rgba(255, 236, 190, 0.05) !important;
}

.statItem,
.winsStatCard,
.lossesStatCard {
  background: linear-gradient(180deg, rgba(63, 52, 35, 0.96), rgba(43, 35, 22, 0.94)) !important;
  border-color: rgba(214, 172, 95, 0.20) !important;
  color: #f5e7c6 !important;
  box-shadow:
    0 10px 22px rgba(0, 0, 0, 0.20),
    inset 0 1px 0 rgba(255, 236, 190, 0.04) !important;
}

.leaderRow {
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

.friendsDrawerInner {
  background: linear-gradient(180deg, rgba(43, 36, 24, 0.98), rgba(29, 24, 16, 0.98)) !important;
  border-left-color: rgba(214, 172, 95, 0.12) !important;
}

.topNavItem {
  background: rgba(61, 50, 32, 0.76) !important;
  color: #f6e7c3 !important;
  border-color: rgba(214, 172, 95, 0.16) !important;
  box-shadow:
    0 8px 18px rgba(0, 0, 0, 0.16),
    inset 0 1px 0 rgba(255, 236, 190, 0.04) !important;
}

.topNavItem.active {
  background: linear-gradient(180deg, rgba(112, 83, 36, 0.95), rgba(82, 61, 27, 0.95)) !important;
  color: #fff2d2 !important;
  border-color: rgba(237, 187, 87, 0.28) !important;
}

.progressBarBg {
  background: rgba(24, 20, 14, 0.80) !important;
  border-color: rgba(214, 172, 95, 0.18) !important;
}

/* ─── TEXT READABILITY ────────────────────────────────────────── */

.rankHeading,
.panelHeader h2,
.meName,
.leaderName,
.statValue,
.leaderStatBox strong,
.statPill strong,
.rpEarned,
.nextRankBadgeName,
.rankName {
  color: #fff1cf !important;
}

.rankMuted,
.meSub,
.leaderSub,
.statSubtext,
.rpNeeded,
.rpText,
.miniLabel,
.statPill span,
.leaderStatBox span,
.fieldLabel,
.heroMuted {
  color: #d9c39a !important;
}

.statLabel,
.rankLabelTop {
  color: #e6c886 !important;
}

.backButton,
.roomNativeButton,
.roomNativeButtonGhost,
.settingsTab {
  background: linear-gradient(180deg, rgba(98, 73, 33, 0.96), rgba(74, 55, 25, 0.96)) !important;
  color: #fff1cf !important;
  border-color: rgba(214, 172, 95, 0.22) !important;
}

.roomNativeInput {
  background: rgba(28, 24, 18, 0.88) !important;
  color: #f5e7c6 !important;
  border-color: rgba(214, 172, 95, 0.18) !important;
}

.roomNativeInput::placeholder {
  color: #bca885 !important;
}

.meStats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.meStats .statPill {
  background: linear-gradient(180deg, rgba(66, 54, 36, 0.98), rgba(45, 36, 23, 0.96)) !important;
  border: 1px solid rgba(224, 171, 63, 0.22) !important;
  box-shadow:
    0 8px 18px rgba(0, 0, 0, 0.18),
    0 0 12px rgba(224, 171, 63, 0.08),
    inset 0 1px 0 rgba(255, 236, 190, 0.05) !important;
}

.meStats .statPill span {
  color: #d9c39a !important;
}

.meStats .statPill strong {
  color: #fff1cf !important;
}

.leaderStats {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
}

.leaderStats .leaderStatBox {
  background: linear-gradient(180deg, rgba(60, 49, 33, 0.96), rgba(42, 34, 22, 0.94)) !important;
  border: 1px solid rgba(214, 172, 95, 0.18) !important;
  box-shadow:
    0 8px 18px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 236, 190, 0.04) !important;
}

.leaderStats .leaderStatBox span {
  color: #d9c39a !important;
}

.leaderStats .leaderStatBox strong {
  color: #fff1cf !important;
}

.leaderRowBlocked {
  opacity: 0.58;
  filter: grayscale(0.2);
}

.blockedBadge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(140, 67, 67, 0.95), rgba(110, 50, 50, 0.95));
  border: 1px solid rgba(180, 90, 90, 0.28);
  color: #fff2d2;
  font-size: 11px;
  font-weight: 800;
  box-shadow: 0 4px 10px rgba(110, 50, 50, 0.16);
}


.leaderList {
  display: grid;
  gap: 10px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.leaderList::-webkit-scrollbar {
  display: none;
}

        .rankTopbar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }

        .miniLabel {
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 11px;
          color: var(--muted);
        }

        .rankHeading {
          margin: 6px 0 8px;
          font-size: clamp(32px, 4vw, 48px);
          line-height: 1;
        }

        .rankMuted {
          margin: 0;
          color: var(--muted);
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

        .mePanel {
          margin-bottom: 18px;
        }

       .meCard,
.rankPanel {
  background: linear-gradient(180deg, rgba(255, 243, 214, 0.98), rgba(229, 194, 138, 0.94));
  border: 1px solid rgba(154, 108, 52, 0.14);
  border-radius: 24px;
  padding: 18px;
  box-shadow:
    0 12px 24px rgba(95, 70, 48, 0.10),
    0 0 22px rgba(224, 171, 63, 0.10);
}

        .meCard {
          margin-top: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .meIdentity {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .meAvatar,
        .leaderAvatar {
            overflow: hidden;
            display: grid;
            place-items: center;
            background: transparent;
            border:none;
        }

        .meAvatar {
          width: 68px;
          height: 68px;
          border-radius: 18px;
        }

        .leaderAvatar {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          flex-shrink: 0;
        }

        .meAvatar img,
        .leaderAvatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .meName {
          font-size: 20px;
          font-weight: 800;
        }

        .meSub,
        .leaderSub {
          color: var(--muted);
          font-size: 13px;
          margin-top: 4px;
        }

        .meStats {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .statPill {
          min-width: 92px;
          padding: 10px 12px;
          border-radius: 16px;
          background: rgba(255, 253, 244, 0.75);
          border: 1px solid rgba(93, 88, 63, 0.08);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .statPill span {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--muted);
        }

        .rankGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .panelHeader h2 {
          margin: 6px 0 14px;
          font-size: 26px;
        }

        .leaderList {
          display: grid;
          gap: 10px;
        }

        .leaderRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(255, 249, 236, 0.96), rgba(247, 226, 173, 0.92));
          border: 1px solid rgba(93, 88, 63, 0.08);
        }

        .leaderLeft {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .leaderPlace {
          width: 34px;
          font-weight: 900;
          color: #fff1cf;
          flex-shrink: 0;
        }

        .leaderName {
          font-weight: 700;
        }

        .leaderValue {
          font-weight: 900;
          color: var(--brown-dark);
          flex-shrink: 0;
        }

        .emptyState {
          min-height: 180px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          border: 1px dashed rgba(93, 88, 63, 0.16);
          color: var(--muted);
          background: rgba(255, 253, 244, 0.55);
        }

        @media (max-width: 900px) {
          .rankGrid {
            grid-template-columns: 1fr;
          }
        }

        .rankGrid.singleColumn {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
}

.leaderStats {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
}

.leaderStatBox {
  min-width: 74px;
  padding: 8px 10px;
  border-radius: 14px;
  background: rgba(255, 253, 244, 0.75);
  border: 1px solid rgba(93, 88, 63, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.leaderStatBox span {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--muted);
}

.leaderStatBox strong {
  font-size: 16px;
  color: var(--brown-dark);
}

@media (max-width: 700px) {
  .leaderRow {
    flex-direction: column;
    align-items: stretch;
  }

  .leaderStats {
    justify-content: flex-end;
  }
}

.leaderNameRow {
  display: flex;
  align-items: center;
  gap: -5px;
  flex-wrap: wrap;
}

.nameRankBadge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: linear-gradient(180deg, #f3dfb1, #e8c983);
  border: 1px solid rgba(183, 143, 90, 0.28);
  color: var(--brown-dark);
  font-size: 11px;
  font-weight: 800;
  box-shadow: 0 4px 10px rgba(183, 143, 90, 0.12);
}

.tribeLeaderRow {
  display: flex !important;
  justify-content: space-between !important;
  align-items: flex-start !important;
  gap: 12px !important;
  padding: 12px 14px !important;
  border-radius: 18px !important;
}

.tribeLeaderRow .leaderLeft {
  display: flex !important;
  align-items: flex-start !important;
  gap: 12px !important;
  min-width: 0 !important;
}

.tribeLeaderRow .leaderNameRow {
  display: flex !important;
  align-items: flex-start !important;
  gap: 8px !important;
  flex-wrap: wrap !important;
  margin-top: 0 !important;
}

.tribeLeaderRow .leaderStats {
  display: flex !important;
  gap: 10px !important;
  align-items: flex-start !important;
  align-self: flex-start !important;
  flex-shrink: 0 !important;
}

.tribeLeaderRow .leaderPlace,
.tribeLeaderRow .tribeLeaderAvatar {
  margin-top: 0 !important;
}

/* Do not stretch the tribe list when there are only a few tribe rows */
.rankPanel .leaderList {
  flex: 0 0 auto !important;
  min-height: 0 !important;
  height: auto !important;
  align-content: start !important;
}

/* Keep tribe rows tight */
.leaderRow.tribeLeaderRow {
  min-height: 0 !important;
  height: auto !important;
  max-height: none !important;
  padding: 10px 14px !important;
  align-items: center !important;
}
      `}</style>
    </div>
  );
}