import React, { useState } from "react";
import { Card, Button } from "./components.jsx";
import { userManager } from "../userManagerSupabase.js";

import BoyHair1 from "../public/Hair/Boy/BoyHair1.png";
import GirlHair2 from "../public/Hair/Girl/GirlHair2.png";

import BoyTop6 from "../public/Tops/Boy/BoyTop6.png";
import UniTop1 from "../public/Tops/Uni/UniTop1.png";

import UniShorts1 from "../public/Bottoms/Uni/UniShorts1.png";
import UniShoes1 from "../public/Shoes/UniShoes1.png";

import BoyCharacterLight from "../public/Character/BoyCharacterLight.png";
import BoyCharacterTan from "../public/Character/BoyCharacterTan.png";
import BoyCharacterDark from "../public/Character/BoyCharacterDark.png";

import GirlCharacterLight from "../public/Character/GirlCharacterLight.png";
import GirlCharacterTan from "../public/Character/GirlCharacterTan.png";
import GirlCharacterDark from "../public/Character/GirlCharacterDark.png";

import BoyCharacterLightTan from "../public/Character/BoyCharacterLightTan.png";
import GirlCharacterLightTan from "../public/Character/GirlCharacterLightTan.png";

const composeStarterAvatar = async (layers) => {
  const imgs = await Promise.all(
    layers.map(
      (src) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        })
    )
  );

  const base = imgs[0];
  const canvas = document.createElement("canvas");
  canvas.width = base.naturalWidth || 300;
  canvas.height = base.naturalHeight || 300;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  imgs.forEach((img) => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  });

  return canvas.toDataURL("image/png");
};

export default function PickCharacter({ currentUser, onComplete, onBack }) {
  const [selected, setSelected] = useState("boy");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedSkin, setSelectedSkin] = useState("light");

 const choices = {
  boy: {
    label: "Boy",
    skins: {
      light: BoyCharacterLight,
      lightTan: BoyCharacterLightTan,
      tan: BoyCharacterTan,
      dark: BoyCharacterDark,
    },
    hair: BoyHair1,
    top: BoyTop6,
    bottom: UniShorts1,
    shoes: UniShoes1,
  },
  girl: {
    label: "Girl",
    skins: {
      light: GirlCharacterLight,
      lightTan: GirlCharacterLightTan,
      tan: GirlCharacterTan,
      dark: GirlCharacterDark,
    },
    hair: GirlHair2,
    top: UniTop1,
    bottom: UniShorts1,
    shoes: UniShoes1,
  },
};

const getPreviewLayers = (choiceKey) => {
  const choice = choices[choiceKey];
  return [
    choice.skins[selectedSkin],
    choice.shoes,
    choice.bottom,
    choice.top,
    choice.hair,
  ];
};

const handleContinue = async () => {
  if (!currentUser || !currentUser.id) {
    setError("Please complete sign up first.");
    return;
  }

  setIsSaving(true);
  setError("");

  try {
   const avatarData = await composeStarterAvatar(getPreviewLayers(selected));

   const starterLoadout =
  selected === "girl"
    ? {
        starterCharacter: "girl",
        skinTone: selectedSkin,
        equippedHair: "GirlHair2",
        equippedTop: "UniTop1",
        equippedBottom: "UniShorts1",
        equippedShoes: "UniShoes1",
        equippedOutfit: "",
        equippedAccessory: "",
        ownedItems: ["GirlHair2", "UniTop1", "UniShorts1", "UniShoes1"],
      }
    : {
        starterCharacter: "boy",
        skinTone: selectedSkin,
        equippedHair: "BoyHair1",
        equippedTop: "BoyTop6",
        equippedBottom: "UniShorts1",
        equippedShoes: "UniShoes1",
        equippedOutfit: "",
        equippedAccessory: "",
        ownedItems: ["BoyHair1", "BoyTop6", "UniShorts1", "UniShoes1"],
      };

const updatedUser = {
  ...currentUser,
  avatarData,
  ...starterLoadout,
};

    console.log("Saving character for user:", currentUser.id, updatedUser);

    const result = await userManager.saveUser(updatedUser);

    if (!result?.success) {
      console.error("saveUser failed:", result);
      setError(result?.message || "Could not save character.");
      return;
    }

    onComplete?.({
      ...updatedUser,
      ...(result?.user || {}),
    });
  } catch (err) {
    console.error("Pick character save error:", err);
    setError("Could not save character. Please try again.");
  } finally {
    setIsSaving(false);
  }
};


  return (
    <div className="pickShell">
        <img src="/clouds.png" alt="" className="authCloud authCloud1" />
  <img src="/clouds2.png" alt="" className="authCloud authCloud2" />
  <img src="/clouds2.png" alt="" className="authCloud authCloud3" />
  <img src="/clouds.png" alt="" className="authCloud authCloud4" />
  <img src="/clouds2.png" alt="" className="authCloud authCloud5" />
      <div className="pickCardWrap">
        <Card title="Pick Your Character">
          <div className="pickStack">
            <p className="pickMuted">Choose your starter character.</p>

            <div className="skinPicker">
  <button
    type="button"
    className={`skinSwatch ${selectedSkin === "light" ? "active" : ""}`}
    onClick={() => setSelectedSkin("light")}
    aria-label="Light skin"
  />
  <button
    type="button"
    className={`skinSwatch ${selectedSkin === "lightTan" ? "active" : ""}`}
    onClick={() => setSelectedSkin("lightTan")}
    aria-label="Light tan skin"
  />
  <button
    type="button"
    className={`skinSwatch ${selectedSkin === "tan" ? "active" : ""}`}
    onClick={() => setSelectedSkin("tan")}
    aria-label="Tan skin"
  />
  <button
    type="button"
    className={`skinSwatch ${selectedSkin === "dark" ? "active" : ""}`}
    onClick={() => setSelectedSkin("dark")}
    aria-label="Dark skin"
  />
</div>

            <div className="pickGrid">
              {Object.entries(choices).map(([key, choice]) => (
                <button
                  key={key}
                  type="button"
                  className={`pickCard ${selected === key ? "active" : ""}`}
                  onClick={() => setSelected(key)}
                >
                  <div className="previewStage">
                   {getPreviewLayers(key).map((src, idx) => (
                      <img
                        key={idx}
                        src={src}
                        alt={choice.label}
                        className="previewLayer"
                      />
                    ))}
                  </div>
                  <div className="pickLabel">{choice.label}</div>
                </button>
              ))}
            </div>

            {error && <div className="error">{error}</div>}

            <div className="pickActions">
              {onBack && (
                <Button onClick={onBack} variant="secondary" disabled={isSaving}>
                  Back
                </Button>
              )}
              <Button onClick={handleContinue} disabled={isSaving}>
                {isSaving ? "Saving..." : "Continue"}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <style>{`

      .skinPicker {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 4px;
}

.skinSwatch {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 2px solid rgba(107, 79, 52, 0.18);
  cursor: pointer;
}

.skinSwatch:nth-child(1) {
  background: #f6d7bd;
}

.skinSwatch:nth-child(2) {
  background: #e7b98f;
}

.skinSwatch:nth-child(3) {
  background: #d8a074;
}

.skinSwatch:nth-child(4) {
  background: #8b5a3c;
}

.skinSwatch.active {
  border-color: #9b7758;
  box-shadow: 0 0 0 3px rgba(155, 119, 88, 0.15);
}

.pickShell {
  min-height: 100dvh;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(120, 92, 38, 0.20), transparent 32%),
  radial-gradient(circle at top center, rgba(255, 214, 120, 0.08), transparent 42%),
  linear-gradient(180deg, #3a342b 0%, #26211c 52%, #171411 100%);
}

.pickShell::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 20%, rgba(255,255,255,0.30), transparent 10%),
    radial-gradient(circle at 78% 24%, rgba(255,245,220,0.24), transparent 12%),
    radial-gradient(circle at 68% 74%, rgba(255,255,255,0.20), transparent 11%),
    radial-gradient(circle at 28% 78%, rgba(255,245,220,0.18), transparent 13%);
  filter: blur(18px);
}

.pickShell::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(circle, rgba(255,255,255,0.42) 0 1px, transparent 1.8px),
    radial-gradient(circle, rgba(255,244,210,0.24) 0 1px, transparent 1.9px),
    radial-gradient(circle, rgba(255,255,255,0.18) 0 1.2px, transparent 2px);
  background-size: 120px 120px, 170px 170px, 220px 220px;
  background-position: 20px 14px, 80px 50px, 140px 26px;
  opacity: 0.7;
}

@keyframes authCloudFloat {
  0% {
    transform: translate3d(0, 0, 0) scaleX(var(--cloud-flip, 1));
  }
  25% {
    transform: translate3d(8px, -10px, 0) scaleX(var(--cloud-flip, 1));
  }
  50% {
    transform: translate3d(0, -18px, 0) scaleX(var(--cloud-flip, 1));
  }
  75% {
    transform: translate3d(-8px, -10px, 0) scaleX(var(--cloud-flip, 1));
  }
  100% {
    transform: translate3d(0, 0, 0) scaleX(var(--cloud-flip, 1));
  }
}

.authCloud {
  position: absolute;
  pointer-events: none;
  user-select: none;
  z-index: 0;
  opacity: 0.9;
  object-fit: contain;
  filter: drop-shadow(0 10px 20px rgba(191, 141, 86, 0.18));
  animation: authCloudFloat 7s ease-in-out infinite;
  will-change: transform;
}

.authCloud1 {
  width: 520px;
  top: -108px;
  left: -80px;
  --cloud-flip: 1;
  animation-duration: 7.5s;
  animation-delay: 0s;
}

.authCloud2 {
  width: 480px;
  top: 120px;
  right: 180px;
  
  animation-duration: 8.2s;
  animation-delay: 0.8s;
}

.authCloud3 {
  width: 640px;
  bottom: 26px;
  left: 10px;
 
  animation-duration: 9s;
  animation-delay: 1.4s;
}

.authCloud4 {
  width: 570px;
  bottom: -200px;
  right: -108px;
  --cloud-flip: 1;
  animation-duration: 8.8s;
  animation-delay: 0.4s;
}

.authCloud5 {
  width: 440px;
  top: -200px;
  left: 100%;
 
  animation-duration: 7.8s;
  animation-delay: 1.1s;
  margin-left: -220px;
}


.pickCardWrap {
  width: min(760px, 94vw);
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.pickCardWrap > * {
  width: 100%;
  background: linear-gradient(180deg, rgba(255, 249, 236, 0.92), rgba(238, 212, 155, 0.9)) !important;
  border: 2px solid #c9ab86 !important;
  border-radius: 20px !important;
  box-shadow:
    0 20px 40px rgba(95, 70, 48, 0.14),
    0 0 28px rgba(224, 171, 63, 0.18),
    inset 0 1px 0 rgba(255,255,255,0.35) !important;
}

        .pickStack {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          width: 100%;
          text-align: center;
        }

        .pickMuted {
          color: var(--muted);
          text-align: center;
          margin: 0;
        }

        .pickGrid {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          justify-items: center;
          align-items: start;
        }

        .pickCard {
          width: 100%;
          max-width: 320px;
          min-width: 0;
          border: 2px solid rgba(107, 79, 52, 0.18);
          background: linear-gradient(180deg, #fbf7e7, #e7d7b5);
          border-radius: 20px;
          padding: 12px;
          cursor: pointer;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .pickCard.active {
          border-color: #9b7758;
          box-shadow: 0 0 0 3px rgba(155, 119, 88, 0.15);
        }

        .previewStage {
          position: relative;
          width: 100%;
          max-width: 220px;
          aspect-ratio: 1 / 1;
          border-radius: 18px;
          background: radial-gradient(circle at center, #fff6d8, #d9c79a);
          overflow: hidden;
          margin: 0 auto;
        }

        .previewLayer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          image-rendering: pixelated;
        }

        .pickLabel {
          margin-top: 10px;
          font-weight: 800;
          color: var(--ink);
          text-align: center;
          width: 100%;
        }

        .pickActions {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .error {
          text-align: center;
        }

        @media (max-width: 700px) {
          .pickCardWrap {
            width: min(96vw, 560px);
          }

          .pickGrid {
            grid-template-columns: 1fr;
          }

          .pickCard {
            max-width: 340px;
          }
        }
      `}</style>
    </div>
  );
}