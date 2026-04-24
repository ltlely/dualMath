import React, { useEffect, useMemo, useState } from "react";
import { userManager } from "../userManagerSupabase.js";

const rankImages = {
  Novice: "/noviceApprenticeRank.png",
  Apprentice: "/noviceApprenticeRank.png",
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

  const points = Number(user?.rankPoints ?? user?.rank_points ?? 0);

  if (points >= 2000) return "King";
  if (points >= 1500) return "Expert";
  if (points >= 1000) return "Professional";
  if (points >= 500) return "Skilled";
  if (points >= 300) return "Apprentice";
  return "Novice";
}

export default function Tribe({ currentUser, onUserUpdate, onClose, onOpenProfile, }) {
  const [tribe, setTribe] = useState(null);
  const [members, setMembers] = useState([]);
  const [tribeName, setTribeName] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
const [announcements, setAnnouncements] = useState([]);
const [announcementText, setAnnouncementText] = useState("");
const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
const [tribeTab, setTribeTab] = useState("main");
const [tribeActivity, setTribeActivity] = useState([]);
const [kickTarget, setKickTarget] = useState(null);
const [leaveTarget, setLeaveTarget] = useState(null);

const loadTribeActivity = async (tribeId) => {
  if (!tribeId) {
    setTribeActivity([]);
    return;
  }

  const result = await userManager.getTribeActivity(tribeId);
  setTribeActivity(result?.activity || []);
};

const loadAnnouncements = async (tribeId) => {
  if (!tribeId) {
    setAnnouncements([]);
    return;
  }

  try {
    const result = await userManager.getTribeAnnouncements(tribeId);
    if (!result?.success) {
      setAnnouncements([]);
      return;
    }

    setAnnouncements(result.announcements || []);
  } catch (err) {
    console.error("loadAnnouncements error:", err);
    setAnnouncements([]);
  }
};

const handlePostAnnouncement = async () => {
  clearStatus();

  const cleanMessage = announcementText.trim();

  if (!tribe?.id) {
    setError("No tribe found.");
    setIsEditingAnnouncement(false);
    return;
  }

  if (!canPostAnnouncements) {
    setError("Only owner or officers can edit messages.");
    setIsEditingAnnouncement(false);
    return;
  }

  if (!cleanMessage) {
    setAnnouncementText(latestAnnouncement?.message || "");
    setIsEditingAnnouncement(false);
    return;
  }

  if (cleanMessage === latestAnnouncement?.message) {
    setIsEditingAnnouncement(false);
    return;
  }

  try {
    setLoading(true);

    const result = await userManager.postTribeAnnouncement({
      tribeId: tribe.id,
      actorId: currentUser.id,
      message: cleanMessage,
    });

    if (!result?.success) {
      setError(result?.message || "Could not save message.");
      return;
    }

    setMessage("Announcement saved.");
    setIsEditingAnnouncement(false);
    await loadAnnouncements(tribe.id);
    await loadTribeActivity(tribe.id);
  } catch (err) {
    console.error("postTribeAnnouncement error:", err);
    setError("Could not save message.");
  } finally {
    setLoading(false);
  }
};

const latestAnnouncement = announcements?.[0] || null;

const visibleAnnouncementText =
  latestAnnouncement?.message?.trim() || "No tribe message yet.";

  const isOwner = useMemo(() => {
    if (!tribe?.owner_id || !currentUser?.id) return false;
    return String(tribe.owner_id) === String(currentUser.id);
  }, [tribe?.owner_id, currentUser?.id]);

  const myMemberRecord = useMemo(() => {
    return members.find((m) => String(m.user_id) === String(currentUser?.id));
  }, [members, currentUser?.id]);



  const clearStatus = () => {
    setMessage("");
    setError("");
  };

  const isOfficer = myMemberRecord?.role === "officer";
const canManageMembers = isOwner || isOfficer;
const canPostAnnouncements = isOwner || isOfficer;

const loadTribe = async () => {
  if (!currentUser?.id) return;

  try {
    setLoading(true);
    clearStatus();

    const result = await userManager.getMyTribe(currentUser.id);

    if (!result?.success) {
      setTribe(null);
      setMembers([]);
      setAnnouncements([]);
      return;
    }

    const nextTribe = result.tribe || null;
    setTribe(nextTribe);
    setMembers(result.members || []);

if (nextTribe?.id) {
  await loadAnnouncements(nextTribe.id);
  await loadTribeActivity(nextTribe.id);
} else {
  setAnnouncements([]);
  setTribeActivity([]);
}
  } catch (err) {
    console.error("loadTribe error:", err);
    setError("Could not load tribe.");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    loadTribe();
  }, [currentUser?.id]);

  const handleCreateTribe = async () => {
    clearStatus();

    const cleanName = tribeName.trim();

    if (!cleanName) {
      setError("Enter a tribe name.");
      return;
    }

    if (cleanName.length < 3) {
      setError("Tribe name must be at least 3 characters.");
      return;
    }

    try {
      setCreating(true);

      const result = await userManager.createTribe({
        ownerId: currentUser.id,
        name: cleanName,
      });

      if (!result?.success) {
        setError(result?.message || "Could not create tribe.");
        return;
      }

      setTribeName("");
      setMessage("Tribe created.");
      await loadTribe();

      const freshUser = await userManager.getCurrentUser?.();
      if (freshUser) onUserUpdate?.(freshUser);
    } catch (err) {
      console.error("createTribe error:", err);
      setError("Could not create tribe.");
    } finally {
      setCreating(false);
    }
  };

const handleAddMember = async () => {
  clearStatus();

  const username = inviteUsername.trim();

  if (!username) {
    setError("Enter a username.");
    return;
  }

  if (!tribe?.id) {
    setError("Create a tribe first.");
    return;
  }

  try {
    setLoading(true);

    const result = await userManager.sendTribeRequestByUsername({
      tribeId: tribe.id,
      senderId: currentUser.id,
      username,
    });

    if (!result?.success) {
      setError(result?.message || "Could not send tribe request.");
      return;
    }

    setInviteUsername("");
    setMessage(`Tribe request sent to ${username}.`);

    // Do NOT call loadTribe() here because it clears the success message.
    await loadTribeActivity(tribe.id);
  } catch (err) {
    console.error("sendTribeRequest error:", err);
    setError("Could not send tribe request.");
  } finally {
    setLoading(false);
  }
};

const handleKickMember = (member) => {
  clearStatus();

  if (!member?.user_id) return;

  if (String(member.user_id) === String(currentUser.id)) {
    setError("Use Leave Tribe instead.");
    return;
  }

  setKickTarget(member);
};

const confirmKickMember = async () => {
  if (!kickTarget?.user_id) return;

  clearStatus();

  try {
    setLoading(true);

    const result = await userManager.kickTribeMember({
      tribeId: tribe.id,
      actorId: currentUser.id,
      targetUserId: kickTarget.user_id,
    });

    if (!result?.success) {
      setError(result?.message || "Could not kick member.");
      return;
    }

    setMessage(`${kickTarget.username || "Member"} was kicked.`);
    setKickTarget(null);
    await loadTribe();
  } catch (err) {
    console.error("kickTribeMember error:", err);
    setError("Could not kick member.");
  } finally {
    setLoading(false);
  }
};

  const handlePromoteDemote = async (member, nextRole) => {
    clearStatus();

    if (!isOwner) {
      setError("Only the tribe owner can change roles.");
      return;
    }

    try {
      setLoading(true);

      const result = await userManager.updateTribeMemberRole({
        tribeId: tribe.id,
        actorId: currentUser.id,
        targetUserId: member.user_id,
        role: nextRole,
      });

      if (!result?.success) {
        setError(result?.message || "Could not update role.");
        return;
      }

setMessage(
  `${member.username || "Member"} was ${
    nextRole === "officer" ? "promoted" : "demoted"
  }.`
);

await loadTribe();
await loadTribeActivity(tribe.id);
    } catch (err) {
      console.error("updateTribeMemberRole error:", err);
      setError("Could not update role.");
    } finally {
      setLoading(false);
    }
  };

 const handleLeaveTribe = () => {
  clearStatus();

  if (!tribe?.id) {
    setError("No tribe found.");
    return;
  }

  if (isOwner) {
    setError("Owner cannot leave. Delete the tribe instead.");
    return;
  }

  setLeaveTarget(tribe);
};

const confirmLeaveTribe = async () => {
  if (!leaveTarget?.id) return;

  clearStatus();

  try {
    setLoading(true);

    const result = await userManager.leaveTribe({
      tribeId: leaveTarget.id,
      userId: currentUser.id,
    });

    if (!result?.success) {
      setError(result?.message || "Could not leave tribe.");
      return;
    }

    setMessage(`You left ${leaveTarget.name || "the tribe"}.`);
    setLeaveTarget(null);
    setTribe(null);
    setMembers([]);

    const freshUser = await userManager.getCurrentUser?.();
    if (freshUser) onUserUpdate?.(freshUser);
  } catch (err) {
    console.error("leaveTribe error:", err);
    setError("Could not leave tribe.");
  } finally {
    setLoading(false);
  }
};

  const handleDeleteTribe = async () => {
    clearStatus();

    if (!isOwner) {
      setError("Only the tribe owner can delete the tribe.");
      return;
    }

    const confirmed = window.confirm(
      "Delete this tribe? This removes every member from the tribe."
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      const result = await userManager.deleteTribe({
        tribeId: tribe.id,
        ownerId: currentUser.id,
      });

      if (!result?.success) {
        setError(result?.message || "Could not delete tribe.");
        return;
      }

      setMessage("Tribe deleted.");
      setTribe(null);
      setMembers([]);

      const freshUser = await userManager.getCurrentUser?.();
      if (freshUser) onUserUpdate?.(freshUser);
    } catch (err) {
      console.error("deleteTribe error:", err);
      setError("Could not delete tribe.");
    } finally {
      setLoading(false);
    }
  };

  const openMemberProfile = (member) => {
  if (!member?.user_id && !member?.id) return;

  onOpenProfile?.({
    id: member.user_id || member.id,
    username: member.username || "Unknown",
    avatarData: member.avatarData || null,

    wins: member.wins ?? 0,
    losses: member.losses ?? 0,
    totalGames: member.totalGames ?? 0,
    rankPoints: member.rankPoints ?? 0,

    rank: getDisplayRank(member),
    rankLevel: getDisplayRank(member),

    profileStatus: member.profileStatus || "",
    profileBgColor: member.profileBgColor || "#dbdbdb",
    profileTextColor: member.profileTextColor || "#5f4c79",
  });
};

function formatTribeActivity(item) {
  const action = String(item?.action || "");
  const actor = item?.actorUsername || "Someone";
  const target = item?.targetUsername || "";

  if (action === "promoted" && target) {
    return `${actor} promoted ${target} to officer`;
  }

  if (action === "demoted" && target) {
    return `${actor} demoted ${target} to member`;
  }

  if (action === "invite_sent" && target) {
    return `${actor} invited ${target} to the tribe`;
  }

  if (action === "invite_declined") {
    return target
      ? `${target} declined ${actor}'s tribe invite`
      : `${actor} declined a tribe invite`;
  }

  if (action === "kicked" && target) {
    return `${actor} kicked ${target} from the tribe`;
  }

  if (action === "announcement_updated") {
    return `${actor} updated the tribe announcement`;
  }

  if (action === "joined" && target) {
    return `${target} joined the tribe`;
  }

  if (action === "left") {
    return `${actor} left the tribe`;
  }

  if (action === "tribe_created") {
    return `${actor} created the tribe`;
  }

  return item?.details || `${actor} ${action.replaceAll("_", " ")}`;
}

  return (
    <div className="tribeModalOverlay">
      <div className="tribeModalBackdrop" onClick={onClose} />

      <div className={`tribeModalCard ${!tribe ? "createMode" : ""}`}>

  <button
    type="button"
    className="tribeModalCloseBtn"
    onClick={onClose}
    aria-label="Close tribe"
  >
    ✕
  </button>


        <div className="tribePanel">
          {loading && !tribe ? (
            <div className="tribeLoadingCard">
              <p className="heroMuted">Loading tribe...</p>
            </div>
          ) : !tribe ? (
            <div className="tribeCreateCard">
              
              <h3>Create Your Tribe</h3>
              

              <div className="fieldStack">
                <label className="fieldLabel">Tribe Name</label>
                <input
                  className="roomNativeInput"
                  type="text"
                  value={tribeName}
                  onChange={(e) => setTribeName(e.target.value)}
                  placeholder="Example: Golden Owls"
                  maxLength={32}
                />
              </div>

              <button
                type="button"
                className="roomNativeButton"
                onClick={handleCreateTribe}
                disabled={creating}
              >
                {creating ? "Creating..." : "Create Tribe"}
              </button>
            </div>
          ) : (
<>
  <div className="tribeTopSummary">
    <div>
     
      <h3>{tribe.name}</h3>
      <p className="heroMuted">
        {members.length} member{members.length === 1 ? "" : "s"} •{" "}
        {isOwner ? "Owner" : isOfficer ? "Officer" : "Member"}
      </p>
    </div>
  </div>

  <div className="tribeTabs">
  <button
    type="button"
    className={`tribeTab ${tribeTab === "main" ? "active" : ""}`}
    onClick={() => setTribeTab("main")}
  >
    Tribe
  </button>

  <button
    type="button"
    className={`tribeTab ${tribeTab === "history" ? "active" : ""}`}
    onClick={() => setTribeTab("history")}
  >
    Track Record
  </button>
</div>
{tribeTab === "main" ? (
<div className="tribeDashboard">
  <div className="tribeMembersCard tribeMembersSideCard">
    <div className="tribeMembersHeader">
      <div className="miniLabel">Members</div>
    </div>

    <div className="tribeMemberList tribeMemberListTall">
      {members.map((member) => {
        const memberIsOwner = member.role === "owner";
        const memberIsSelf =
          String(member.user_id) === String(currentUser.id);

        return (
          <div className="tribeMemberRow" key={member.user_id}>
            <div className="tribeMemberLeft">
<button
  type="button"
  className="tribeAvatar tribeProfileButton"
  onClick={() => openMemberProfile(member)}
  title={`View ${member.username || "user"}'s profile`}
>
  {member.avatarData ? (
    <img src={member.avatarData} alt={member.username} />
  ) : (
    <span>{member.username?.[0]?.toUpperCase() || "?"}</span>
  )}
</button>

              <div>
<button
  type="button"
  className="tribeMemberName tribeMemberNameButton"
  onClick={() => openMemberProfile(member)}
  title={`View ${member.username || "user"}'s profile`}
>
  <span>{member.username || "Unknown"}</span>

  <img
    className="tribeMemberRankBadge"
    src={getRankImage(getDisplayRank(member))}
    alt={getDisplayRank(member)}
    title={getDisplayRank(member)}
  />

  {memberIsSelf && <span className="tribeSelfTag">You</span>}
</button>

                <div className="tribeMemberSub">
                  {member.role || "member"} • {member.rankPoints ?? 0} RP
                </div>
              </div>
            </div>

            <div className="tribeMemberActions">
              {isOwner && !memberIsOwner && !memberIsSelf && (
                <button
                  type="button"
                  className="tribeSmallButton"
                  onClick={() =>
                    handlePromoteDemote(
                      member,
                      member.role === "officer" ? "member" : "officer"
                    )
                  }
                >
                  {member.role === "officer" ? "Demote" : "Promote"}
                </button>
              )}

              {canManageMembers && !memberIsOwner && !memberIsSelf && (
                <button
                  type="button"
                  className="tribeKickButton"
                  onClick={() => handleKickMember(member)}
                >
                  Kick
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>

  <div className="tribeRightPanelCard">
    {canManageMembers && (
      <div className="tribeSectionBlock">
        <label className="fieldLabel username">Search Username</label>

        <div className="tribeAddRow">
          <input
            className="roomNativeInput"
            type="text"
            value={inviteUsername}
            onChange={(e) => setInviteUsername(e.target.value)}
            placeholder="Enter username"
          />

          <button
            type="button"
            className="roomNativeButton"
            onClick={handleAddMember}
            disabled={loading}
          >
            Add
          </button>
        </div>
      </div>
    )}

    <div className="tribeSectionBlock tribeAnnouncementsBlock">
      <div className="miniLabel">Announcements</div>

<div className="tribeAnnouncementBoard">
  {canPostAnnouncements && isEditingAnnouncement ? (
    <textarea
      className="tribeAnnouncementInput"
      value={announcementText}
      onChange={(e) => setAnnouncementText(e.target.value.slice(0, 1500))}
      onBlur={handlePostAnnouncement}
      placeholder="Write a message for everyone in the tribe..."
      maxLength={1500}
      autoFocus
    />
  ) : (
    <button
      type="button"
      className={`tribeAnnouncementView ${
        canPostAnnouncements ? "editable" : ""
      }`}
      onClick={() => {
        if (!canPostAnnouncements) return;

        setAnnouncementText(latestAnnouncement?.message || "");
        setIsEditingAnnouncement(true);
        setMessage("");
        setError("");
      }}
    >
      <div className="tribeAnnouncementViewText">
        {visibleAnnouncementText}
      </div>
    </button>
  )}
</div>
{latestAnnouncement?.author_username && (
  <div className="tribeAnnouncementViewMeta">
    By {latestAnnouncement.author_username}
    {latestAnnouncement.created_at
      ? ` • ${new Date(latestAnnouncement.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : ""}
  </div>
)}

    
    </div>

    <div className="tribeSectionBlock tribeActionsBlock">
      

      <div className="tribeActionsBottom">
        <button
          type="button"
          className="roomNativeButton roomNativeButtonGhost"
          onClick={handleLeaveTribe}
          disabled={loading}
        >
          Leave
        </button>

        {isOwner && (
          <button
            type="button"
            className="tribeDangerButton"
            onClick={handleDeleteTribe}
            disabled={loading}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  </div>
</div> ) : (
  <div className="tribeHistoryCard">
    <div className="tribeHistoryList">
      {tribeActivity.length > 0 ? (
        tribeActivity.map((item) => (
          <div className="tribeHistoryRow" key={item.id}>
<div className="tribeHistoryAction">
  {String(item.action || "")
    .replaceAll("_", " ")
    .replace("invite sent", "Invite sent")
    .replace("invite declined", "Invite declined")
    .replace("announcement updated", "Announcement updated")}
</div>

<div className="tribeHistoryDetails">
  {formatTribeActivity(item)}
</div>

            <div className="tribeHistoryTime">
              {item.createdAt
                ? new Date(item.createdAt).toLocaleString()
                : ""}
            </div>
          </div>
        ))
      ) : (
        <div className="tribeEmptyState">No tribe activity yet.</div>
      )}
    </div>
  </div>
)}

</>
          )}

          {kickTarget && (
  <div className="tribeConfirmModal">
    <div
      className="tribeConfirmOverlay"
      onClick={() => setKickTarget(null)}
    />

    <div className="tribeConfirmCard">
      <div className="miniLabel">Confirm</div>
      <h3>Kick Member?</h3>

      <p className="tribeConfirmText">
        Are you sure you want to kick{" "}
        <strong>{kickTarget.username || "this user"}</strong> from the tribe?
      </p>

      <div className="tribeConfirmActions">
        <button
          type="button"
          className="tribeSmallButton"
          onClick={() => setKickTarget(null)}
        >
          Cancel
        </button>

        <button
          type="button"
          className="tribeKickButton"
          onClick={confirmKickMember}
          disabled={loading}
        >
          {loading ? "Kicking..." : "Kick"}
        </button>
      </div>
    </div>
  </div>
)}

{leaveTarget && (
  <div className="tribeConfirmModal">
    <div
      className="tribeConfirmOverlay"
      onClick={() => setLeaveTarget(null)}
    />

    <div className="tribeConfirmCard">
      <h3>Leave Tribe?</h3>

      <p className="tribeConfirmText">
        Are you sure you want to leave{" "}
        <strong>{leaveTarget.name || "this tribe"}</strong>?
      </p>

      <div className="tribeConfirmActions">
        <button
          type="button"
          className="tribeSmallButton"
          onClick={() => setLeaveTarget(null)}
        >
          Cancel
        </button>

        <button
          type="button"
          className="tribeKickButton"
          onClick={confirmLeaveTribe}
          disabled={loading}
        >
          {loading ? "Leaving..." : "Leave"}
        </button>
      </div>
    </div>
  </div>
)}

          {message && <div className="statusMessage success">{message}</div>}
          {error && <div className="statusMessage error">{error}</div>}
        </div>
      </div>

      <style>{`


      .tribeActionsBottom {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tribeActionsBottom .roomNativeButtonGhost,
.tribeActionsBottom .tribeDangerButton {
  width: 120px;
  min-width: 120px;
  max-width: 120px;
  height: 40px;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 0 12px;
  text-align: center;
}

      .tribeConfirmModal {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: grid;
  place-items: center;
  padding: 20px;
}

.tribeConfirmOverlay {
  position: absolute;
  inset: 0;
  background: rgba(22, 17, 12, 0.48);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.tribeConfirmCard {
  position: relative;
  z-index: 1;
  width: min(100%, 420px);
  padding: 24px;
  border-radius: 26px;
  border: 1px solid rgba(255, 255, 255, 0.46);
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.7), transparent 36%),
    linear-gradient(180deg, rgba(255, 252, 244, 0.96), rgba(245, 226, 190, 0.94));
  box-shadow:
    0 24px 60px rgba(17, 13, 8, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
  color: #5b3f2a;
  text-align: center;
}

.tribeConfirmCard h3 {
  margin: 8px 0 10px;
  color: #5b3f2a;
  font-size: 24px;
  font-weight: 950;
}

.tribeConfirmText {
  margin: 0;
  color: #7b5b3b;
  font-size: 15px;
  line-height: 1.5;
  font-weight: 650;
}

.tribeConfirmActions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.tribeModalOverlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: grid;
  place-items: center;
  padding: 24px;
}

.tribeModalBackdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top, rgba(255, 224, 190, 0.18), transparent 30%),
    radial-gradient(circle at bottom, rgba(224, 171, 63, 0.12), transparent 34%),
    rgba(16, 14, 12, 0.58);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.tribeCreateCard .roomNativeInput {
  width: min(100%, 520px) !important;
  justify-self: center;
}

.tribeCreateCard {
  text-align: center;
  justify-items: center;
}

.tribeCreateCard .miniLabel,
.tribeCreateCard h3,
.tribeCreateCard .heroMuted {
  text-align: center;
  width: 100%;
}

.tribeCreateCard .heroMuted {
  max-width: 520px;
  margin-left: auto;
  margin-right: auto;
}

.tribeCreateCard .roomNativeButton {
  width: min(100%, 220px) !important;
  justify-self: center;
}

.tribeCreateCard .fieldStack {
  width: min(100%, 520px);
  justify-self: center;
}

.tribeCreateCard .fieldLabel {
  width: 100%;
}

.tribeTopSummary {
  position: relative;
  overflow: visible;
  box-sizing: border-box;

  width: 100%;
  min-height: 64px;
  max-height: 76px;

  border-radius: 22px;
  padding: 10px 4px 10px 0;

  display: flex;
  align-items: center;


}

.tribeTopSummary > div {
  min-width: 0;
  width: 100%;
}

.tribeTopSummary .miniLabel {
  margin-bottom: 3px;
  font-size: 9px;
  line-height: 1;
  color: #9b6a37;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.tribeTopSummary h3 {
  margin: 0;
  font-size: 38px;
  line-height: 1.1;
  color: #5b3f2a;
  font-weight: 950;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tribeTopSummary .heroMuted {
  margin: 3px 5px 0 !important;
  font-size: 11px;
  line-height: 1.1;
  color: #7b5b3b !important;
  font-weight: 750;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tribeDashboard {
  display: grid !important;
  grid-template-columns: minmax(360px, 1fr) minmax(420px, 1fr) !important;
  gap: 16px !important;
  align-items: stretch !important;

  height: 430px !important;
  min-height: 430px !important;
  max-height: 430px !important;
}

.tribeMembersSideCard,
.tribeRightPanelCard {
  height: 100% !important;
  min-height: 0 !important;
  max-height: none !important;
  box-sizing: border-box !important;
}

.tribeMembersSideCard {
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.tribeRightPanelCard {
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.tribeAnnouncementsBlock {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tribeActionsBlock {
  margin-top: auto;
}

.tribeMemberListTall {
  flex: 1;
  max-height: none;
  overflow-y: auto;
  padding-right: 4px;
}

.tribeRightPanelCard {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  border: 1px solid rgba(107, 79, 52, 0.12);
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.68), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.46), rgba(255, 248, 232, 0.62));
  box-shadow:
    0 10px 24px rgba(91, 63, 42, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.62);
}

.tribeLeftColumn,
.tribeRightColumn {
  display: grid;
  gap: 16px;
}

.tribeMembersSideCard {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-height: 560px;
  max-height: 560px;
}

.tribeMembersHeader {
  flex: 0 0 auto;
  width: 100%;
  margin-bottom: 12px;
}


.tribeMemberList,
.tribeMemberListTall {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start !important;
  align-items: stretch;
  gap: 10px;
  overflow-y: auto;
  overflow-x: hidden;
  max-height: none;
  padding-right: 6px;
  padding-top: 0;
}

.tribeMemberRow {
  width: 100%;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin: 0 !important;
}

.tribeAnnouncementsCard,
.tribeActionsCard {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  padding: 18px;
  border: 1px solid rgba(107, 79, 52, 0.12);
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.68), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.46), rgba(255, 248, 232, 0.62));
  box-shadow:
    0 10px 24px rgba(91, 63, 42, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.62);
}

.tribeAnnouncementsHeader {
  margin-bottom: 10px;
}

.tribeAnnouncementComposer {
  display: grid;
  gap: 10px;
  margin-top: 10px;
  margin-bottom: 14px;
}

.tribeTabs {
  display: flex;
  gap: 10px;
  margin: 10px 0;
}

.tribeTab {
  border: 1px solid rgba(107, 79, 52, 0.14);
  border-radius: 999px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.48);
  color: #6b4520;
  font-weight: 900;
  cursor: pointer;
}

.tribeTab.active {
  color: #fff8ee;
  background: linear-gradient(180deg, #bf8d56 0%, #7a532c 100%);
}

.tribeHistoryCard {
  border-radius: 28px;
  padding: 20px;
  border: 1px solid rgba(107, 79, 52, 0.12);
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.68), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.46), rgba(255, 248, 232, 0.62));
  box-shadow:
    0 10px 24px rgba(91, 63, 42, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.62);
}


.tribeHistoryRow {
  padding: 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.52);
  border: 1px solid rgba(107, 79, 52, 0.10);
}

.tribeHistoryAction {
  color: #5b3f2a;
  font-weight: 950;
  text-transform: capitalize;
}

.tribeMemberName {
  display: flex !important;
  align-items: center !important;
  gap: 7px !important;
  color: #4b3217;
  font-weight: 950;
  min-width: 0;
}

.tribeMemberName span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tribeMemberRankBadge {
  width: 22px;
  height: 22px;
  object-fit: contain;
  flex-shrink: 0;
  image-rendering: auto;
}

.tribeHistoryDetails {
  color: #7b5b3b;
  font-size: 13px;
  font-weight: 700;
  margin-top: 4px;
}

.tribeHistoryTime {
  color: #8a684b;
  font-size: 11px;
  font-weight: 800;
  margin-top: 6px;
}

.tribeAnnouncementInput {
  width: 100%;
  min-height: 100px;
  resize: vertical;
  border-radius: 16px;
  border: 1px solid rgba(107, 79, 52, 0.16);
  background: rgba(255, 255, 255, 0.64);
  color: #4b3217;
  font-size: 14px;
  font-weight: 650;
  padding: 12px 14px;
  outline: none;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    0 8px 18px rgba(91, 63, 42, 0.08);
}

.tribeAnnouncementInput:focus {
  border-color: rgba(199, 150, 82, 0.72);
  box-shadow:
    0 0 0 4px rgba(224, 171, 63, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.tribePostButton {
  width: 140px !important;
  justify-self: center;
}


.tribeAnnouncementList {
  display: grid;
  gap: 10px;
  flex: 1;
  overflow-y: auto;
  max-height: 260px;
  padding-right: 2px;
  scrollbar-width: none;
}

.tribeAnnouncementList::-webkit-scrollbar {
  display: none;
}

.tribeAnnouncementRow {
  padding: 12px;
  border-radius: 18px;
  border: 1px solid rgba(107, 79, 52, 0.10);
  background: rgba(255, 255, 255, 0.52);
  box-shadow:
    0 8px 18px rgba(91, 63, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.48);
}

.tribeAnnouncementMeta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
  font-size: 12px;
}

.tribeAnnouncementAuthor {
  color: #5b3f2a;
  font-weight: 900;
}

.tribeAnnouncementTime {
  color: #8a684b;
  font-weight: 700;
}

.tribeAnnouncementBody {
  color: #4b3217;
  font-size: 14px;
  line-height: 1.45;
  font-weight: 650;
  white-space: pre-wrap;
  word-break: break-word;
}

.tribeEmptyState {
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.42);
  color: #8a684b;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
}

.tribeActionsCard {
  align-self: end;
}

.tribeActionsBottom {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 12px;
  flex-wrap: wrap;
}
@media (max-width: 920px) {
  .tribeDashboard {
    grid-template-columns: 1fr;
  }

  .tribeMembersSideCard,
  .tribeRightPanelCard {
    min-height: unset;
  }

  .tribeActionsBottom {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .tribeAddRow {
    grid-template-columns: 1fr;
  }

  .tribeRightPanelCard .roomNativeButton,
  .tribePostButton {
    width: 100% !important;
  }
}

@media (max-width: 900px) {
  .tribeDashboard {
    grid-template-columns: 1fr;
  }

  .tribeActionsBottom {
    justify-content: flex-start;
  }
}

.tribeAddCard .tribeAddRow {
  width: min(100%, 560px);
  justify-self: center;
}

.tribeAddCard .fieldStack {
  width: 100%;
}

.tribeAddCard .roomNativeInput {
  width: 100%;
}

.tribeAddCard .roomNativeButton {
  width: 110px;
}

.tribeModalCard {
  position: relative;
  z-index: 1;
  width: min(980px, 94vw);
  height: min(600px, 86vh);
  max-height: 86vh;
  overflow: hidden;
  padding: 20px 22px 22px;
  border-radius: 30px;

  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.42), transparent 32%),
    radial-gradient(circle at bottom right, rgba(224, 171, 63, 0.16), transparent 36%),
    linear-gradient(180deg, rgba(245, 238, 222, 0.72), rgba(255, 252, 244, 0.94));

  border: 1px solid rgba(255, 255, 255, 0.46);

  box-shadow:
    0 24px 60px rgba(17, 13, 8, 0.34),
    0 0 30px rgba(224, 171, 63, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);

  backdrop-filter: blur(18px) saturate(145%);
  -webkit-backdrop-filter: blur(18px) saturate(145%);
  color: #5b3f2a;
  animation: tribePopIn 0.18s ease-out;
}

.tribePanel {
  height: 100%;
  display: grid;
  gap: 8px;
  overflow: hidden;
}

.tribeMemberList,
.tribeMemberListTall {
  overflow-y: auto !important;
  overflow-x: hidden !important;
}


.tribeAnnouncementInput {
  overflow-y: auto;
}

.tribeMembersSideCard,
.tribeRightPanelCard {
  min-height: 430px !important;
  max-height: 430px !important;
  height: 430px !important;
}

.tribeCreateCard .miniLabel,
.tribeHeaderCard .miniLabel,
.tribeMembersHeader .miniLabel {
  color: #9b6a37;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}



.tribeModalSubtext {
  margin: 10px 0 0;
  color: #7b5b3b;
  font-size: 14px;
  line-height: 1.45;
  font-weight: 650;
}

.tribeModalCloseBtn {
  position: absolute;
  top: 20px;
  right: 25px;
  z-index: 5;

  width: 42px;
  height: 42px;
  border-radius: 50%;
  cursor: pointer;
  color: #6b4520;
  font-size: 20px;
  font-weight: 900;

  border: 1px solid rgba(107, 79, 52, 0.12);
  background: rgba(255, 255, 255, 0.72);

  box-shadow:
    0 8px 18px rgba(91, 63, 42, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.68);

  transition: transform 0.16s ease, background 0.16s ease, filter 0.16s ease;
}

.tribeModalCloseBtn:hover {
  transform: translateY(-1px) scale(1.03);
  background: rgba(255, 255, 255, 0.88);
  filter: brightness(1.03);
}

.tribeModalCloseBtn:hover {
  transform: translateY(-1px) scale(1.03);
  background: rgba(255, 255, 255, 0.74);
  filter: brightness(1.03);
}

@keyframes tribePopIn {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.96);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}


.tribeLoadingCard,
.tribeCreateCard,
.tribeHeaderCard,
.tribeAddCard,
.tribeMembersCard {
  position: relative;
  overflow: hidden;
  border-radius: 28px;
  padding: 20px;

  border: 1px solid rgba(107, 79, 52, 0.12);

  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.68), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.46), rgba(255, 248, 232, 0.62));

  box-shadow:
    0 10px 24px rgba(91, 63, 42, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.62);

  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.tribeCreateCard {
  display: grid;
  gap: 14px;
}

.tribeCreateCard h3,
.tribeHeaderCard h3 {
  margin: 3px 20px 10px;
  color: #5b3f2a;
  font-size: 22px;
  font-weight: 950;
}

.tribeCreateCard .heroMuted,
.tribeHeaderCard .heroMuted,
.tribeModalCard .heroMuted {
  color: #7b5b3b !important;
  font-weight: 650;
  line-height: 1.45;
}

.tribeCreateCard .fieldStack,
.tribeAddCard .fieldStack {
  display: grid;
  gap: 8px;
}

.tribeCreateCard .fieldLabel,
.tribeAddCard .fieldLabel,
.fieldLabel.username {
  color: #8a684b !important;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.tribeCreateCard .roomNativeInput,
.tribeAddCard .roomNativeInput {
  width: 100%;
  height: 52px;
  border-radius: 18px;

  border: 1px solid rgba(107, 79, 52, 0.16);
  background: rgba(255, 255, 255, 0.64) !important;
  color: #4b3217 !important;

  font-size: 15px;
  font-weight: 750;
  padding: 0 16px;
  outline: none;

  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    0 8px 18px rgba(91, 63, 42, 0.08);
}

.tribeCreateCard .roomNativeInput::placeholder,
.tribeAddCard .roomNativeInput::placeholder {
  color: rgba(91, 63, 42, 0.48);
}

.tribeCreateCard .roomNativeInput:focus,
.tribeAddCard .roomNativeInput:focus {
  border-color: rgba(199, 150, 82, 0.72);
  box-shadow:
    0 0 0 4px rgba(224, 171, 63, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.tribeCreateCard .roomNativeButton,
.tribeAddCard .roomNativeButton {
  min-height: 52px;
  border-radius: 18px;
  color: #fff8ee;
  font-size: 15px;
  font-weight: 950;
  cursor: pointer;

  border: 1px solid rgba(107, 79, 52, 0.16);
  background:
    linear-gradient(180deg, #bf8d56 0%, #7a532c 100%);

  box-shadow:
    0 12px 22px rgba(91, 63, 42, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);

  transition: transform 0.16s ease, filter 0.16s ease, box-shadow 0.16s ease;
}

.tribeCreateCard .roomNativeButton:hover,
.tribeAddCard .roomNativeButton:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
  box-shadow:
    0 16px 28px rgba(91, 63, 42, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.tribeCreateCard .roomNativeButton:disabled,
.tribeAddCard .roomNativeButton:disabled {
  opacity: 0.62;
  cursor: not-allowed;
  transform: none;
}

.tribeHeaderCard {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.tribeHeaderActions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.tribeHeaderActions .roomNativeButtonGhost {
  color: #6b4520;
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(107, 79, 52, 0.14);
}

.tribeAddRow {
  display: grid;
  grid-template-columns: 1fr 110px;
  gap: 10px;
  align-items: center;
  margin-top: 8px;
}

.tribeRightPanelCard .roomNativeInput {
  width: 100%;
}

.tribeRightPanelCard .roomNativeButton {
  width: 110px;
  justify-self: stretch;
}


.tribeMemberList {
  display: grid;
  gap: 10px;
  max-height: 310px;
  overflow-y: auto;
  padding-right: 4px;
  scrollbar-width: none;
}

.tribeMemberList::-webkit-scrollbar {
  display: none;
}

.tribeMemberRow {
  width: 100%;
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.tribeMemberLeft {
  display: flex;
  align-items: flex-start;
  align-self: flex-start;
  gap: 12px;
  min-width: 0;
}

.tribeMemberList,
.tribeMemberListTall {
  justify-content: flex-start;
  align-items: stretch;
  padding-top: 0;
  margin-top: 20px;
}

.tribeProfileButton {
  border: none !important;
  cursor: pointer !important;
  padding: 5px !important;
}

.tribeProfileButton:hover {
  transform: translateY(-1px) scale(1.03);
  filter: brightness(1.04);
}

.tribeMemberNameButton {
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
  cursor: pointer !important;
  text-align: left !important;
}

.tribeMemberNameButton:hover span:first-child {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.tribeAvatar {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  overflow: visible;
  padding: 5px;

  display: flex;
  align-items: center;
  justify-content: center;

  background: transparent !important;
  border: none !important;
  box-shadow: none !important;

  flex-shrink: 0;
}

.tribeAvatar img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  object-position: center center;
  image-rendering: pixelated;
  display: block;
  margin: 0 auto;

  background: transparent !important;
  box-shadow: none !important;

  filter:
    drop-shadow(0 0 1px rgba(255, 230, 150, 0.32))
    drop-shadow(0 0 3px rgba(224, 171, 63, 0.22));
}

.tribeAvatar:hover img {
  filter:
    drop-shadow(0 0 2px rgba(255, 235, 170, 0.45))
    drop-shadow(0 0 5px rgba(224, 171, 63, 0.32));
}

.tribeAvatar span {
  color: #6b4520;
  font-weight: 950;
}

.tribeMemberName {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4b3217;
  font-weight: 950;
}

.tribeMemberSub {
  margin-top: 3px;
  font-size: 12px;
  color: #8a684b;
  text-transform: capitalize;
  font-weight: 750;
}

.tribeSelfTag {
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(224, 171, 63, 0.22);
  color: #7a532c;
  font-size: 10px;
  font-weight: 950;
  border: 1px solid rgba(107, 79, 52, 0.10);
}

.tribeMemberActions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.tribeSmallButton,
.tribeKickButton,
.tribeDangerButton {
  border-radius: 999px;
  padding: 9px 13px;
  font-size: 12px;
  font-weight: 950;
  cursor: pointer;
  transition: transform 0.16s ease, filter 0.16s ease;
}

.tribeSmallButton {
  color: #6b4520;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(107, 79, 52, 0.14);
}

.tribeKickButton,
.tribeDangerButton {
  color: #fff8ee;
  border: 1px solid rgba(132, 54, 54, 0.18);
  background: linear-gradient(180deg, #d96a6a, #a34444);
  box-shadow: 0 8px 18px rgba(163, 68, 68, 0.18);
}

.tribeSmallButton:hover,
.tribeKickButton:hover,
.tribeDangerButton:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
}

.tribeDangerButton:disabled,
.tribeKickButton:disabled,
.tribeSmallButton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tribeModalCard .statusMessage.success {
  color: #225e3b !important;
  background: rgba(184, 238, 210, 0.42);
  border: 1px solid rgba(92, 160, 105, 0.20);
}

.tribeModalCard .statusMessage.error {
  color: #991a1a !important;
  background: rgba(255, 194, 194, 0.38);
  border: 1px solid rgba(217, 106, 106, 0.22);
}

@media (max-width: 720px) {
  .tribeModalOverlay {
    padding: 14px;
  }

  .tribeModalCard {
    width: 100%;
    max-height: 90vh;
    padding: 20px;
    border-radius: 28px;
  }

  .tribeModalHeader h2 {
    font-size: 28px;
  }

  .tribeHeaderCard,
  .tribeMemberRow {
    align-items: stretch;
    flex-direction: column;
  }

  .tribeHeaderActions,
  .tribeMemberActions {
    justify-content: flex-start;
  }

  .tribeAddRow {
    grid-template-columns: 1fr;
  }
}

.tribeMembersSideCard {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  height: 560px !important;
  min-height: 560px !important;
  max-height: 560px !important;
}

.tribeMembersHeader {
  flex: 0 0 auto !important;
  width: 100% !important;
  margin-bottom: 10px !important;
}

.tribeMemberList,
.tribeMemberListTall {
  flex: 1 1 auto !important;
  width: 100% !important;

  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-start !important;
  align-items: stretch !important;

  gap: 10px !important;
  margin-top: 0 !important;
  padding-top: 0 !important;
  padding-right: 6px !important;

  overflow-y: auto !important;
  overflow-x: hidden !important;
  max-height: none !important;

  scrollbar-width: thin;
}

.tribeMemberList,
.tribeMemberListTall {
  scrollbar-width: thin;
  scrollbar-color: rgba(191, 141, 86, 0.65) rgba(255, 255, 255, 0.28);
}

.tribeMemberList::-webkit-scrollbar,
.tribeMemberListTall::-webkit-scrollbar {
  width: 8px;
}

.tribeMemberList::-webkit-scrollbar-track,
.tribeMemberListTall::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  margin: 6px 0;
}

.tribeMemberList::-webkit-scrollbar-thumb,
.tribeMemberListTall::-webkit-scrollbar-thumb {
  background:
    linear-gradient(180deg, rgba(216, 168, 94, 0.9), rgba(122, 83, 44, 0.72));
  border-radius: 999px;
  border: 2px solid rgba(255, 248, 232, 0.72);
}

.tribeMemberList::-webkit-scrollbar-thumb:hover,
.tribeMemberListTall::-webkit-scrollbar-thumb:hover {
  background:
    linear-gradient(180deg, rgba(226, 180, 108, 1), rgba(122, 83, 44, 0.88));
}

.tribeMemberRow {
  width: 100% !important;
  flex: 0 0 auto !important;

  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;

  gap: 5px !important;
  margin: 0 !important;
  padding: 3px !important;
}

.tribeMemberLeft {
  display: flex !important;
  align-items: center !important;
  align-self: center !important;
  gap: 12px !important;
  min-width: 0 !important;
}

.tribeAnnouncementBoard {
  margin-top: 10px;
}

.tribeAnnouncementView {
  width: 100%;
  min-height: 72px;
  text-align: left;
  border-radius: 18px;
  border: 1px solid rgba(107, 79, 52, 0.12);
  background: rgba(255, 255, 255, 0.52);
  padding: 14px;
  cursor: default;
  box-shadow:
    0 8px 18px rgba(91, 63, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.48);

  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}


.tribeAnnouncementView.editable {
  cursor: text;
}

.tribeAnnouncementView.editable:hover {
  background: rgba(255, 255, 255, 0.68);
  border-color: rgba(199, 150, 82, 0.42);
}

.tribeAnnouncementViewText {
  color: #4b3217;
  font-size: 14px;
  line-height: 1.5;
  font-weight: 700;
  white-space: pre-wrap;
  word-break: break-word;
  flex: 0 1 auto;
  min-width: 0;
}

.tribeAnnouncementViewMeta {
  color: #8a684b;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
  flex-shrink: 0;
}

.tribeAnnouncementEditHint {
  margin-top: 10px;
  color: #9b6a37;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.tribeAnnouncementInput {
  width: 100%;
  min-height: 130px;
  resize: vertical;
  border-radius: 18px;
  border: 1px solid rgba(199, 150, 82, 0.52);
  background: rgba(255, 255, 255, 0.72);
  color: #4b3217;
  font-size: 14px;
  font-weight: 700;
  padding: 14px;
  outline: none;
  box-shadow:
    0 0 0 4px rgba(224, 171, 63, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

@media (max-width: 640px) {
  .tribeAnnouncementView {
    align-items: flex-start;
    flex-direction: column;
  }

  .tribeAnnouncementViewMeta {
    white-space: normal;
  }
}

.tribeDashboard {
  align-items: stretch !important;
  height: 440px !important;
  min-height: 440px !important;
  max-height: 440px !important;
}

.tribeMembersSideCard,
.tribeRightPanelCard {
  height: 440px !important;
  min-height: 440px !important;
  max-height: 440px !important;
  box-sizing: border-box !important;
}

/* right card: rounded top only */
.tribeRightPanelCard {
  border-radius: 28px 28px 0 0 !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
}

/* keep left card normal rounded */
.tribeMembersSideCard {
  border-radius: 28px !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
}

.tribeDashboard {
  align-items: stretch !important;
  height: 440px !important;
  min-height: 440px !important;
  max-height: 440px !important;
}

.tribeMembersCard.tribeMembersSideCard,
.tribeRightPanelCard {
  height: 440px !important;
  min-height: 440px !important;
  max-height: 440px !important;

  box-sizing: border-box !important;

  border-radius: 28px 28px 0 0 !important;
  border: 1px solid rgba(107, 79, 52, 0.12) !important;

  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.68), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.46), rgba(255, 248, 232, 0.62)) !important;

  box-shadow:
    0 10px 24px rgba(91, 63, 42, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.62) !important;

  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
}

/* Compact create-tribe screen */
.tribeCreateCard {
  min-height: 0 !important;
  max-height: none !important;
}

.tribeCreateCard h3 {
  margin: 0 0 22px !important;
  font-size: 24px !important;
}

.tribeCreateCard .fieldStack {
  width: min(100%, 520px) !important;
  justify-self: center !important;
  align-self: center !important;
  margin-left: auto !important;
  margin-right: auto !important;

  display: grid !important;
  justify-items: center !important;
  text-align: center !important;
}

.tribeCreateCard .fieldLabel {
  width: 100% !important;
  text-align: center !important;
}

.tribeCreateCard .roomNativeInput {
  width: min(100%, 520px) !important;
  justify-self: center !important;
}

.tribeCreateCard .roomNativeInput {
  height: 50px !important;
}

.tribeCreateCard .roomNativeButton {
  width: 220px !important;
  min-height: 58px !important;
  height: 58px !important;
  justify-self: center !important;
  margin-top: 12px !important;
}

/* Make status message compact */
.tribeModalCard .statusMessage {
  min-height: 0 !important;
  height: auto !important;
  padding: 14px 14px !important;
  margin-top: 10px !important;
  border-radius: 14px !important;
  line-height: 1.35 !important;
  display: block !important;
}

/* If your panel is forcing rows too tall, override it */
.tribePanel {
  grid-template-rows: auto auto !important;
  align-content: start !important;
  gap: 10px !important;
}

/* Final spacing override */
.tribeModalCard {
  padding: 14px 16px 16px !important;
}

.tribePanel {
  height: 100% !important;
  display: grid !important;
  gap: 6px !important;
  overflow: hidden !important;
  align-content: start !important;
}

/* Create screen: only a little space between card and modal */
.tribeCreateCard {
  min-height: 0 !important;
  max-height: none !important;
  height: auto !important;

  padding: 22px 18px !important;
  margin: 0 !important;

  gap: 14px !important;
  align-content: center !important;
  justify-content: center !important;
}

/* Status message should stay close and compact */
.tribeModalCard .statusMessage {
  margin-top: 6px !important;
  padding: 12px 12px !important;
  min-height: 0 !important;
  height: auto !important;
}

.tribeModalCard .statusMessage.success,
.tribeModalCard .statusMessage.error {
  width: fit-content !important;
  max-width: min(100%, 520px) !important;

  margin: 10px auto 0 !important;
  padding: 10px 18px !important;

  display: flex !important;
  align-items: center !important;
  justify-content: center !important;

  text-align: center !important;
  line-height: 1.35 !important;
  border-radius: 999px !important;
}

.tribeModalCard.createMode {
  width: min(520px, 92vw) !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  padding: 14px !important;
  overflow: visible !important;
}

.tribeModalCard.createMode .tribePanel {
  height: auto !important;
  min-height: 0 !important;
  display: block !important;
  overflow: visible !important;
}

.tribeModalCard.createMode .tribeCreateCard {
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  margin: 0 !important;
  padding: 22px 18px !important;
  gap: 14px !important;
}

.tribeModalCard.createMode .tribeCreateCard h3 {
  margin: 0 0 14px !important;
}

.tribeModalCard.createMode .fieldStack {
  margin-bottom: 10px !important;
}

.tribeModalCard.createMode .roomNativeButton {
  margin-top: 6px !important;
}

.tribeModalCard.createMode .fieldStack {
  width: 100% !important;
  display: grid !important;
  justify-items: center !important;
}

.tribeModalCard.createMode .roomNativeInput {
  width: min(100%, 320px) !important;
  justify-self: center !important;
  margin-left: auto !important;
  margin-right: auto !important;
  text-align: center !important;
}

.tribeModalCard:not(.createMode) .tribeDashboard {
  height: 400px !important;
  min-height: 400px !important;
  max-height: 400px !important;
}

.tribeModalCard:not(.createMode) .tribeMembersCard.tribeMembersSideCard,
.tribeModalCard:not(.createMode) .tribeRightPanelCard {
  height: 400px !important;
  min-height: 400px !important;
  max-height: 400px !important;
}

.tribeAnnouncementBoard {
  max-height: 150px !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  scrollbar-width: none !important; /* Firefox */
  -ms-overflow-style: none !important; /* IE/Edge */
}

.tribeAnnouncementBoard::-webkit-scrollbar {
  display: none !important; /* Chrome/Safari */
}

.tribeAnnouncementView {
  max-height: 150px !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;

  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

.tribeAnnouncementView::-webkit-scrollbar {
  display: none !important;
}

.tribeAnnouncementView {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  justify-content: flex-start !important;
  gap: 8px !important;
}

.tribeAnnouncementViewText {
  width: 100% !important;
  display: block !important;
  white-space: pre-wrap !important;
  word-break: break-word !important;
}

.tribeAnnouncementViewMeta {
  width: 100% !important;
  display: block !important;
  text-align: right !important;
  margin-top: 4px !important;
  white-space: normal !important;
  align-self: flex-end !important;
}

.tribeRightPanelCard {
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.tribeAnnouncementsBlock {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.tribeAnnouncementBoard {
  flex: 1 1 auto !important;
  min-height: 95px !important;
  max-height: none !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  margin-bottom: 4px !important;

  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

.tribeAnnouncementBoard::-webkit-scrollbar {
  display: none !important;
}

.tribeAnnouncementView {
  min-height: 100% !important;
  max-height: none !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;

  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

.tribeAnnouncementView::-webkit-scrollbar {
  display: none !important;
}

.tribeActionsBlock {
  flex: 0 0 auto !important;
  margin-top: 1px !important;
}

.tribeAnnouncementBoard {
  background: transparent !important;
  border-radius: 18px !important;
  overflow: hidden !important;
  background-clip: padding-box !important;
}

.tribeAnnouncementBoard::-webkit-scrollbar,
.tribeAnnouncementBoard::-webkit-scrollbar-track,
.tribeAnnouncementBoard::-webkit-scrollbar-thumb,
.tribeAnnouncementBoard::-webkit-scrollbar-corner {
  width: 0 !important;
  height: 0 !important;
  background: transparent !important;
  display: none !important;
}

.tribeAnnouncementView {
  border-radius: 18px !important;
  overflow: hidden !important;
  background-clip: padding-box !important;
}

.tribeAnnouncementViewText {
  overflow-y: auto !important;
  overflow-x: hidden !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

.tribeAnnouncementViewText::-webkit-scrollbar,
.tribeAnnouncementViewText::-webkit-scrollbar-track,
.tribeAnnouncementViewText::-webkit-scrollbar-thumb,
.tribeAnnouncementViewText::-webkit-scrollbar-corner {
  width: 0 !important;
  height: 0 !important;
  background: transparent !important;
  display: none !important;
}

.tribeAnnouncementViewText {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  max-height: 120px !important;

  overflow-y: auto !important;
  overflow-x: hidden !important;

  padding-right: 6px !important;
  white-space: pre-wrap !important;
  word-break: break-word !important;

  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

.tribeAnnouncementViewText::-webkit-scrollbar {
  display: none !important;
}

.tribeAnnouncementViewMeta {
  flex: 0 0 auto !important;
  margin-top: 8px !important;
  text-align: right !important;
}

.tribeAnnouncementView {
  height: 100% !important;
  min-height: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.tribeAnnouncementViewText {
  flex: 1 1 auto !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;

  display: block !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;

  padding: 0 6px 0 0 !important;
  margin: 0 !important;

  white-space: pre-wrap !important;
  word-break: break-word !important;

  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

.tribeAnnouncementViewText::-webkit-scrollbar {
  display: none !important;
}

.tribeAnnouncementViewMeta {
  flex: 0 0 auto !important;
  margin-top: 6px !important;
}

/* Track Record scroll fix */
.tribeHistoryCard {
  height: 400px !important;
  min-height: 400px !important;
  max-height: 400px !important;

  display: flex !important;
  flex-direction: column !important;

  overflow: hidden !important;
  box-sizing: border-box !important;
  padding: 16px !important;

  border-radius: 28px 28px 0 0 !important;
}

.tribeHistoryList {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  max-height: none !important;

  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;

  overflow-y: auto !important;
  overflow-x: hidden !important;

  padding-right: 8px !important;
  margin-top: 0 !important;

  scrollbar-width: thin !important;
  scrollbar-color: rgba(191, 141, 86, 0.65) rgba(255, 255, 255, 0.28) !important;
}

.tribeHistoryList::-webkit-scrollbar {
  width: 8px;
}

.tribeHistoryList::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  margin: 6px 0;
}

.tribeHistoryList::-webkit-scrollbar-thumb {
  background: linear-gradient(
    180deg,
    rgba(216, 168, 94, 0.9),
    rgba(122, 83, 44, 0.72)
  );
  border-radius: 999px;
  border: 2px solid rgba(255, 248, 232, 0.72);
}

.tribeHistoryList::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(
    180deg,
    rgba(226, 180, 108, 1),
    rgba(122, 83, 44, 0.88)
  );
}

.tribeHistoryRow {
  flex: 0 0 auto !important;
}

      `}</style>
    </div>
  );
}