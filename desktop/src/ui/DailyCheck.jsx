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

function getProgressKey(userId) {
  return `dualmath_daily_reward_progress_${userId || "guest"}`;
}

export default function DailyCheck({ currentUser, onClaim, onClose }) {
  const todayKey = useMemo(() => getTodayKey(), []);
  const progressKey = useMemo(
    () => getProgressKey(currentUser?.id),
    [currentUser?.id]
  );

  const [isOpen, setIsOpen] = useState(true);
  const [openedChest, setOpenedChest] = useState(false);
  const [claimedToday, setClaimedToday] = useState(false);
  const [currentDay, setCurrentDay] = useState(1);
  const [claimedDays, setClaimedDays] = useState([]);
  const [rewardMessage, setRewardMessage] = useState("");
  const isChestFuture = currentDay < 7 && !claimedToday;

  useEffect(() => {
    if (!currentUser) return;

    try {
      const raw = localStorage.getItem(progressKey);
      if (!raw) {
        const initial = {
          currentDay: 1,
          claimedDays: [],
          lastClaimDate: null,
        };
        localStorage.setItem(progressKey, JSON.stringify(initial));
        setCurrentDay(1);
        setClaimedDays([]);
        setClaimedToday(false);
        return;
      }

      const parsed = JSON.parse(raw);
      const alreadyClaimed = parsed.lastClaimDate === todayKey;

      setCurrentDay(parsed.currentDay || 1);
      setClaimedDays(parsed.claimedDays || []);
      setClaimedToday(alreadyClaimed);
    } catch {
      setCurrentDay(1);
      setClaimedDays([]);
      setClaimedToday(false);
    }
  }, [progressKey, todayKey, currentUser]);

  const persistProgress = (next) => {
    localStorage.setItem(progressKey, JSON.stringify(next));
  };

const claimReward = (reward) => {
  if (!currentUser || claimedToday) return;

  if (onClaim) {
    onClaim(reward);
  }

  const nextClaimedDays = [...new Set([...claimedDays, reward.day])];
  const nextDay = reward.day >= 7 ? 1 : reward.day + 1;

  persistProgress({
    currentDay: nextDay,
    claimedDays: nextDay === 1 ? [] : nextClaimedDays,
    lastClaimDate: todayKey,
  });

  setClaimedDays(nextDay === 1 ? [] : nextClaimedDays);
  setCurrentDay(nextDay);
  setClaimedToday(true);

  if (reward.type === "gift") {
    setRewardMessage(`You got ${reward.icon} Special Gift!`);
  } else {
    setRewardMessage(`You got ${reward.icon} x${reward.amount}!`);
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
  const reward = DAILY_REWARDS.find((r) => r.day === currentDay);

  if (!reward) return;

  if (reward.day !== 7) {
    return;
  }

  setOpenedChest(true);

  if (!claimedToday) {
    claimReward(reward);
  }
};

  if (!isOpen) return null;

  const previewReward = DAILY_REWARDS[currentDay - 1];

  return (
    <div className="dailyRewardOverlay">
      <div className="dailyRewardShell">
        <button
          type="button"
          className="dailyRewardClose"
          onClick={() => {
            setIsOpen(false);
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
      </div>

      <div className="dailyRewardAmount">x{reward.amount}</div>

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
    disabled={isChestFuture}
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
  {rewardMessage || (claimedToday ? "Claimed today — come back tomorrow" : "Claim today’s reward")}
</div>
      </div>

      <style>{`
        .dailyRewardOverlay {
          position: fixed;
          inset: 0;
          z-index: 4000;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(91, 63, 42, 0.32);
          backdrop-filter: blur(10px);
        }

        .dailyRewardShell {
          position: relative;
          width: min(940px, 96vw);
          border-radius: 34px;
          padding: 28px 24px 22px;
          background:
            radial-gradient(circle at top, rgba(255, 232, 180, 0.32), transparent 30%),
            linear-gradient(180deg, #f7e2ad 0%, #e5c28a 56%, #d6ae6b 100%);
          border: 2px solid rgba(154, 108, 52, 0.25);
          box-shadow:
            0 28px 60px rgba(95, 70, 48, 0.24),
            inset 0 1px 0 rgba(255,255,255,0.55);
          color: #5a3817;
        }

        .dailyRewardClose {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          font-size: 22px;
          font-weight: 800;
          color: #6b4520;
          background: linear-gradient(180deg, #fff3d6, #e5c28a);
          box-shadow: 0 8px 16px rgba(95, 70, 48, 0.16);
        }

        .dailyRewardBanner {
          width: fit-content;
          margin: 0 auto;
          padding: 14px 34px;
          border-radius: 999px;
          background: linear-gradient(180deg, #9a6c34, #6b4520);
          color: #fff3d6;
          font-size: 32px;
          font-weight: 900;
          line-height: 1;
          box-shadow:
            0 12px 22px rgba(95, 70, 48, 0.22),
            inset 0 1px 0 rgba(255,255,255,0.18);
        }

        .dailyRewardSubtitle {
          text-align: center;
          color: #7a5a37;
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
          background: linear-gradient(180deg, rgba(255, 248, 232, 0.86), rgba(247, 226, 173, 0.76));
          border: 1px solid rgba(154, 108, 52, 0.18);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
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
          background: linear-gradient(180deg, #fff8ee, #f7e2ad);
          border: 1px solid rgba(154, 108, 52, 0.18);
          box-shadow:
            0 10px 18px rgba(95, 70, 48, 0.08),
            inset 0 1px 0 rgba(255,255,255,0.7);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
        }

        .dailyRewardTile.today {
          transform: translateY(-2px);
          border-color: rgba(154, 108, 52, 0.42);
          box-shadow:
            0 0 0 3px rgba(224, 171, 63, 0.16),
            0 14px 24px rgba(95, 70, 48, 0.12);
        }

        .dailyRewardTile.claimed {
  background: linear-gradient(180deg, rgba(214, 174, 107, 0.95), rgba(191, 141, 86, 0.95));
  border-color: rgba(154, 108, 52, 0.42);
  box-shadow:
    0 10px 18px rgba(95, 70, 48, 0.10),
    inset 0 1px 0 rgba(255,255,255,0.35);
  opacity: 1;
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
          background: linear-gradient(180deg, #bf8d56, #9a6c34);
          color: #fff8ee;
          font-size: 14px;
          font-weight: 800;
          box-shadow: 0 6px 10px rgba(95, 70, 48, 0.16);
        }

        .dailyRewardDayPill.final {
          background: linear-gradient(180deg, #e0ab3f, #9a6c34);
        }

        .dailyRewardIconWrap {
          width: 72px;
          height: 72px;
          margin-top: 12px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: radial-gradient(circle at 30% 30%, #fffdf6, #ffefc8);
          box-shadow: inset 0 2px 0 rgba(255,255,255,0.75);
        }

        .rewardIcon {
  width: 28px;
  height: 28px;
  object-fit: contain;
  display: block;
}

        .dailyRewardIcon {
          font-size: 38px;
          filter: drop-shadow(0 4px 6px rgba(116, 73, 19, 0.12));
        }

        .dailyRewardAmount {
          margin-top: 10px;
          font-size: 28px;
          font-weight: 900;
          color: #6b4520;
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
          background: linear-gradient(180deg, rgba(255, 243, 214, 0.75), rgba(229, 194, 138, 0.92));
          border: 1px solid rgba(154, 108, 52, 0.16);
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
          background: linear-gradient(180deg, #fff3d6, #e5c28a);
          border: 1px solid rgba(154, 108, 52, 0.22);
          overflow: hidden;
          transition: transform 0.18s ease, filter 0.18s ease;
          box-shadow: 0 12px 20px rgba(95, 70, 48, 0.10);
        }

        .treasureChestCard:hover {
          transform: translateY(-2px);
          filter: brightness(1.02);
        }

        .treasureChestCard.claimed {
          cursor: default;
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
          color: #6b4520;
          font-weight: 800;
          font-size: 16px;
          line-height: 1.35;
          max-width: 170px;
        }

        .dailyRewardFooter {
          margin-top: 16px;
          text-align: center;
          color: #6b4520;
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