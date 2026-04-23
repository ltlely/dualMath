import React, { useEffect, useMemo, useState } from "react";

const DAILY_REWARDS = [
  { day: 1, type: "coins", amount: 35, icon: "/coin.png" },
  { day: 2, type: "coins", amount: 50, icon: "/coin.png" },
  { day: 3, type: "coins", amount: 80, icon: "/coin.png" },
  { day: 4, type: "coins", amount: 85, icon: "/coin.png" },
  { day: 5, type: "coins", amount: 100, icon: "/coin.png" },
  { day: 6, type: "coins", amount: 110, icon: "/coin.png" },
  { day: 7, type: "coins", amount: 250, icon: "/multiplecoins.png" },
];

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}



export default function DailyCheck({ currentUser, onClaim, onClose }) {


 
  const [openedChest, setOpenedChest] = useState(false);
  const [claimedToday, setClaimedToday] = useState(false);
  const [currentDay, setCurrentDay] = useState(1);
  const [claimedDays, setClaimedDays] = useState([]);
  const [rewardMessage, setRewardMessage] = useState(null);
  const isChestFuture = currentDay < 7 && !claimedToday;
const [timeUntilReset, setTimeUntilReset] = useState("");

useEffect(() => {
  if (!claimedToday) {
    setTimeUntilReset("");
    return;
  }

  setTimeUntilReset(formatTimeUntilMidnight());

  const interval = setInterval(() => {
    setTimeUntilReset(formatTimeUntilMidnight());
  }, 1000);

  return () => clearInterval(interval);
}, [claimedToday]);


  function getNextMidnight() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next;
}



useEffect(() => {
  if (!currentUser) return;

  const todayKey = getTodayKey();
  const savedCurrentDay = Number(currentUser.dailyRewardDay || 1);
  const savedClaimedDays = Array.isArray(currentUser.dailyRewardClaimedDays)
    ? currentUser.dailyRewardClaimedDays
    : [];
  const alreadyClaimed = currentUser.dailyRewardLastClaimDate === todayKey;

  const shouldStartFreshCycle =
    savedCurrentDay === 1 &&
    !alreadyClaimed &&
    savedClaimedDays.includes(7);

  setCurrentDay(savedCurrentDay);
  setClaimedDays(shouldStartFreshCycle ? [] : savedClaimedDays);
  setClaimedToday(alreadyClaimed);
}, [currentUser]);

function formatTimeUntilMidnight() {
  const now = new Date();
  const nextMidnight = getNextMidnight();
  const diff = nextMidnight.getTime() - now.getTime();

  const totalSeconds = Math.max(0, Math.floor(diff / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}



const claimReward = async (reward) => {
  if (!currentUser || claimedToday) return;

  const todayKey = getTodayKey();
  const nextClaimedDays = [...new Set([...(claimedDays || []), reward.day])];
  const completedCycle = reward.day >= 7;

  const updatedUser = {
    ...currentUser,
    dailyRewardDay: completedCycle ? 1 : reward.day + 1,
    dailyRewardLastClaimDate: todayKey,
    dailyRewardClaimedDays: nextClaimedDays,
  };

  const result = await onClaim?.(reward, updatedUser);
  if (!result?.success) return;

setClaimedDays(nextClaimedDays);
setCurrentDay(completedCycle ? 1 : reward.day + 1);
setClaimedToday(true);

if (onClose) onClose();

  if (reward.type === "gift") {
    setRewardMessage(
      <span className="dailyRewardMessageInline">
        You got <span className="dailyRewardMessageText">Special Gift!</span>
      </span>
    );
  } else {
    setRewardMessage(
      <span className="dailyRewardMessageInline">
        You got{" "}
        <img src={reward.icon} alt="Coin" className="dailyRewardMessageIcon" />
        <span>{reward.amount} coins!</span>
      </span>
    );
  }
};

const handleDayClick = (reward) => {
  const isAlignedDay = reward.day === currentDay && !claimedToday;
  if (!isAlignedDay) return;

  if (reward.day === 7) {
    setOpenedChest(true);
  }

  claimReward(reward);
};

const handleOpenChest = () => {
  const reward = DAILY_REWARDS.find((r) => r.day === 7);
  if (!reward) return;

  setOpenedChest(false);
  requestAnimationFrame(() => {
    setOpenedChest(true);
  });

  const canClaimDay7 = currentDay === 7 && !claimedToday;
  if (canClaimDay7) {
    claimReward(reward);
  }
};




  return (
    <div className="dailyRewardOverlay">
      <div className="dailyRewardShell">
        <button
          type="button"
          className="dailyRewardClose"
onClick={() => {
  if (onClose) onClose();
}}
        >
          ×
        </button>

        <div className="dailyRewardBanner">Daily Reward</div>

        <div className="dailyRewardSubtitle">
          Log in every day and open the chest for bonus rewards
        </div>

        <div className="dailyRewardBody">
          <div className="dailyRewardGrid">
          {DAILY_REWARDS.slice(0, 6).map((reward) => {
  const isClaimed = claimedDays.includes(reward.day);
  const isToday = reward.day === currentDay && !claimedToday;
  const isFuture = reward.day > currentDay && !claimedToday;

  return (
    <button
      key={reward.day}
      type="button"
      className={`dailyRewardTile ${isToday ? "today" : ""} ${isClaimed ? "claimed" : ""} ${
        isFuture ? "disabled" : "clickable"
      }`}
      onClick={() => handleDayClick(reward)}
      disabled={isFuture}
    >
      <div className="dailyRewardDayPill">Day {reward.day}</div>

<div className="dailyRewardIconWrap">
  <img src={reward.icon} alt={reward.type} className="rewardIcon" />
  <div className="dailyRewardAmount">x{reward.amount}</div>
</div>


      {isClaimed && <div className="dailyRewardCheck">✔</div>}
    </button>
  );
})}
          </div>

          <div className="dailyRewardFinalCol">
<button
  type="button"
  className={`treasureChestCard ${
    openedChest ? "opened" : ""
  } ${claimedToday ? "claimed" : ""} ${
    isChestFuture ? "disabled" : "clickable"
  }`}
  onClick={handleOpenChest}
>
    <div className="dailyRewardDayPill final">Day 7</div>
    <div className="treasureGlow" />
    <div className="treasureChest">
  <img
    src={openedChest ? "/multiplecoins.png" : "/gift.png"}
    alt={openedChest ? "Opened reward" : "Reward"}
    className="treasureChestImg"
  />
</div>

    <div className="treasureRewardText">
      {claimedToday && currentDay !== 7
        ? "Come back tomorrow"
        : currentDay === 7 && !claimedToday
        ? "Open chest to claim Day 7"
        : "Unlock Day 7 first"}
    </div>
  </button>
</div>
        
        </div>

<div className="dailyRewardFooter">
  <div>
    {rewardMessage || (claimedToday ? "Claimed today" : "Claim today’s reward")}
  </div>

  {claimedToday && (
    <div className="dailyRewardResetTimer">
      Next reward in {timeUntilReset}
    </div>
  )}
</div>
      </div>

      <style>{`

      .dailyRewardFooter {
  margin-top: 16px;
  text-align: center;
  color: #f0ddb8;
  font-weight: 800;
  font-size: 17px;
  min-height: 24px;
}

.dailyRewardResetTimer {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 700;
  color: #d9c39a;
}


.dailyRewardMessageInline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.dailyRewardMessageIcon {
  width: 22px;
  height: 22px;
  object-fit: contain;
  display: inline-block;
  vertical-align: middle;
}

        .dailyRewardOverlay {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(10, 9, 8, 0.56);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.dailyRewardShell {
  position: relative;
  width: min(940px, 96vw);
  border-radius: 34px;
  padding: 28px 24px 22px;
  background:
    radial-gradient(circle at top, rgba(255, 214, 120, 0.08), transparent 30%),
    linear-gradient(180deg, rgba(50, 42, 30, 0.97), rgba(34, 28, 20, 0.97));
  border: 1px solid rgba(214, 172, 95, 0.18);
  box-shadow:
    0 28px 60px rgba(0, 0, 0, 0.32),
    0 0 18px rgba(224, 171, 63, 0.08),
    inset 0 1px 0 rgba(255, 236, 190, 0.05);
  color: #f5e7c6;
}

.dailyRewardClose {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 22px;
  font-weight: 800;
  color: #fff1cf;
  background: linear-gradient(180deg, rgba(65, 54, 37, 0.95), rgba(46, 38, 25, 0.95));
  border: 1px solid rgba(214, 172, 95, 0.18);
  box-shadow:
    0 8px 18px rgba(0, 0, 0, 0.16),
    inset 0 1px 0 rgba(255, 236, 190, 0.04);
}

.dailyRewardBanner {
  width: fit-content;
  margin: 0 auto;
  padding: 14px 34px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(112, 83, 36, 0.95), rgba(82, 61, 27, 0.95));
  color: #fff2d2;
  font-size: 32px;
  font-weight: 900;
  line-height: 1;
  border: 1px solid rgba(214, 172, 95, 0.22);
  box-shadow:
    0 12px 22px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 236, 190, 0.05);
}

.dailyRewardSubtitle {
  text-align: center;
  color: #d0bb95;
  font-weight: 700;
  margin: 16px 0 18px;
  font-size: 17px;
}

.dailyRewardBody {
  display: grid;
  grid-template-columns: 1fr 240px;
  gap: 18px;
  padding: 18px;
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(56, 46, 31, 0.97), rgba(39, 32, 21, 0.95));
  border: 1px solid rgba(214, 172, 95, 0.14);
  box-shadow:
    0 12px 24px rgba(0, 0, 0, 0.20),
    inset 0 1px 0 rgba(255, 236, 190, 0.04);
}


        .dailyRewardGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .dailyRewardTile {
  position: relative;
  min-height: 140px;
  padding: 12px 10px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(60, 49, 33, 0.96), rgba(42, 34, 22, 0.94));
  border: 1px solid rgba(214, 172, 95, 0.18);
  box-shadow:
    0 10px 18px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 236, 190, 0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  color: #f5e7c6;
}

.dailyRewardTile.today {
  border-color: rgba(237, 187, 87, 0.30);
  box-shadow:
    0 0 0 3px rgba(224, 171, 63, 0.12),
    0 14px 24px rgba(0, 0, 0, 0.20);
}

.dailyRewardTile.claimed {
  background: linear-gradient(180deg, rgba(81, 69, 45, 0.95), rgba(58, 48, 31, 0.95));
  border-color: rgba(214, 172, 95, 0.24);
}

.dailyRewardTile.claimed .dailyRewardAmount,
.dailyRewardTile.claimed .dailyRewardDayPill,
.dailyRewardTile.claimed .dailyRewardIcon {
  filter: saturate(0.9);
}

.dailyRewardTile.claimed .dailyRewardAmount {
  color: #fff8ee;
}

.dailyRewardTile.claimed .dailyRewardDayPill {
  background: linear-gradient(180deg, #8a5d2d, #6b4520);
  color: #fff8ee;
}

        .dailyRewardDayPill {
  padding: 7px 16px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(112, 83, 36, 0.95), rgba(82, 61, 27, 0.95));
  color: #fff2d2;
  font-size: 14px;
  font-weight: 800;
  box-shadow: 0 6px 10px rgba(0, 0, 0, 0.16);
}

        .dailyRewardDayPill.final {
          background: linear-gradient(180deg, #e0ab3f, #9a6c34);
        }


.dailyRewardAmount,
.treasureRewardText,
.dailyRewardFooter {
  color: #fff1cf;
}


        
.dailyRewardIconWrap {
  position: relative;
  width: 72px;
  height: 72px;
  margin-top: 12px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.rewardIcon {
  width: 78px;
  height: 78px;
  object-fit: contain;
  display: block;
}

        .dailyRewardIcon {
          font-size: 38px;
          filter: drop-shadow(0 4px 6px rgba(116, 73, 19, 0.12));
        }

        .dailyRewardAmount {
  position: absolute;
  right: -25px;
  top: 88%;
  transform: translateY(-50%);
  margin-top: 0;
  font-size: 20px;
  font-weight: 900;
  color: #fff1cf;
  text-shadow:
    0 2px 6px rgba(0, 0, 0, 0.45),
    0 0 8px rgba(224, 171, 63, 0.35);
  pointer-events: none;
}

.dailyRewardCheck {
  position: absolute;
  right: 10px;
  bottom: 8px;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(180deg, #7fdc8d, #3fa85b);
  color: white;
  font-size: 16px;
  font-weight: 900;
  box-shadow: 0 6px 10px rgba(63, 168, 91, 0.22);
}


      .dailyRewardFinalCol {
  border-radius: 24px;
  padding: 12px;
  background: linear-gradient(180deg, rgba(60, 49, 33, 0.96), rgba(42, 34, 22, 0.94));
  border: 1px solid rgba(214, 172, 95, 0.16);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  min-height: 100%;
}

       .treasureChestCard {
  position: relative;
  width: 100%;
  flex: 1;
  margin: 14px 0 6px;
  border-radius: 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: pointer;
  padding: 18px 12px;
  background: linear-gradient(180deg, rgba(66, 54, 36, 0.98), rgba(45, 36, 23, 0.96));
  border: 1px solid rgba(214, 172, 95, 0.18);
  overflow: hidden;
  transition: transform 0.18s ease, filter 0.18s ease;
  box-shadow:
    0 12px 20px rgba(0, 0, 0, 0.20),
    inset 0 1px 0 rgba(255, 236, 190, 0.04);
}

        .treasureChestCard:hover {
          transform: translateY(-2px);
          filter: brightness(1.02);
        }

       .treasureChestCard.claimed {
  cursor: pointer;
}

        .treasureGlow {
          position: absolute;
          width: 130px;
          height: 130px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(224,171,63,0.35), transparent 70%);
          filter: blur(12px);
        }

        .treasureChest {
          position: relative;
          z-index: 1;
          font-size: 82px;
          line-height: 1;
        }

        .treasureChestCard.opened .treasureChest {
          animation: popChest 0.35s ease;
        }

        .treasureRewardText {
          position: relative;
          z-index: 1;
          margin-top: 12px;
           color: #f0ddb8;
          font-weight: 800;
          font-size: 16px;
          line-height: 1.35;
          max-width: 170px;
        }

       .dailyRewardFooter {
  margin-top: 16px;
  text-align: center;
  color: #f0ddb8;
  font-weight: 800;
  font-size: 17px;
  min-height: 24px;
}

        @keyframes popChest {
          0% { transform: scale(0.82) rotate(-4deg); }
          60% { transform: scale(1.12) rotate(3deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        @media (max-width: 900px) {
          .dailyRewardShell {
            width: min(98vw, 760px);
            padding: 22px 16px 18px;
          }

          .dailyRewardBanner {
            font-size: 28px;
            padding: 12px 28px;
          }

          .dailyRewardBody {
            grid-template-columns: 1fr;
          }

          .dailyRewardFinalCol {
            min-height: 240px;
          }
        }

        @media (max-width: 640px) {
          .dailyRewardGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .dailyRewardTile {
            min-height: 128px;
          }

          .dailyRewardAmount {
            font-size: 24px;
          }
        }

        .dailyRewardTile {
  appearance: none;
  -webkit-appearance: none;
  border: 1px solid rgba(154, 108, 52, 0.18);
}

.dailyRewardTile.clickable {
  cursor: pointer;
}

.dailyRewardTile.clickable:hover {
  transform: translateY(-2px);
  filter: brightness(1.02);
}

.dailyRewardTile.disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.dailyRewardTile:disabled {
  cursor: not-allowed;
}

.treasureChestCard.clickable {
  cursor: pointer;
}

.treasureChestCard.disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.treasureChestCard:disabled {
  cursor: not-allowed;
}


.treasureChest {
  display: flex;
  align-items: center;
  justify-content: center;
}

.treasureChestImg {
  width: 200px;
  height: 200px;
  object-fit: contain;
  display: block;
}

.giftImg {
  width: 200px;
  height: 200px;
}



      `}</style>
    </div>
  );
}