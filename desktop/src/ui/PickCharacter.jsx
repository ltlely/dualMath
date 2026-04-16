import React, { useState } from "react";
import { Card, Button } from "./components.jsx";
import { userManager } from "../userManagerSupabase.js";

import boyCharacter from "../public/Character/BoyCharacter.png";
import girlCharacter from "../public/Character/GirlCharacter.png";

import BoyHair1 from "../public/Hair/Boy/BoyHair1.png";
import GirlHair2 from "../public/Hair/Girl/GirlHair2.png";

import BoyTop6 from "../public/Tops/Boy/BoyTop6.png";
import UniTop1 from "../public/Tops/Uni/UniTop1.png";

import UniShorts1 from "../public/Bottoms/Uni/UniShorts1.png";
import UniShoes1 from "../public/Shoes/UniShoes1.png";

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

  const choices = {
    boy: {
      label: "Boy",
      layers: [boyCharacter, UniShoes1, UniShorts1, BoyTop6, BoyHair1],
    },
    girl: {
      label: "Girl",
      layers: [girlCharacter, UniShoes1, UniShorts1, UniTop1, GirlHair2],
    },
  };

 const handleContinue = async () => {
  if (!currentUser?.id) {
    setError("Please complete sign up or login first.");
    return;
  }

  setIsSaving(true);
  setError("");

  try {
    const avatarData = await composeStarterAvatar(choices[selected].layers);

    const updatedUser = {
      ...currentUser,
      avatarData,
      starterCharacter: selected,
    };

    const result = await userManager.saveUser(updatedUser);

    if (!result?.success) {
      setError(result?.message || "Could not save character.");
      return;
    }

    const freshUser = await userManager.getCurrentUser();
    onComplete?.(freshUser || updatedUser);
  } catch (err) {
    console.error("Pick character save error:", err);
    setError("Please complete sign up or login first.");
  } finally {
    setIsSaving(false);
  }
};



  return (
    <div className="pickShell">
      <div className="pickCardWrap">
        <Card title="Pick Your Character">
          <div className="pickStack">
            <p className="pickMuted">Choose your starter character.</p>

            <div className="pickGrid">
              {Object.entries(choices).map(([key, choice]) => (
                <button
                  key={key}
                  type="button"
                  className={`pickCard ${selected === key ? "active" : ""}`}
                  onClick={() => setSelected(key)}
                >
                  <div className="previewStage">
                    {choice.layers.map((src, idx) => (
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
        .pickShell {
          min-height: 100vh;
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pickCardWrap {
          width: min(760px, 94vw);
          display: flex;
          justify-content: center;
        }

        .pickCardWrap > * {
          width: 100%;
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