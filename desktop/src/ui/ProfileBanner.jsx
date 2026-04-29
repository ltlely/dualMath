import React, { useEffect, useRef, useState } from "react";

const bannerModules = import.meta.glob(
  "../assets/profile-banners/*.{png,jpg,jpeg,webp,gif}",
  {
    eager: true,
    import: "default",
  }
);

const importedBanners = Object.entries(bannerModules).reduce((acc, [path, src]) => {
  const fileName = path.split("/").pop();
  const id = fileName.replace(/\.(png|jpg|jpeg|webp|gif)$/i, "");

  acc[id] = {
    id,
    label: id
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase()),
    src,
  };

  return acc;
}, {});

export const PROFILE_BANNERS = {
  dreamyBlue: {
    id: "dreamyBlue",
    label: "Dreamy Blue",
    src: null,
    type: "dreamyBlue",
  },

  professionalGlow: {
    id: "professionalGlow",
    label: "Professional Glow",
    src: null,
    type: "professionalGlow",
  },
  ...importedBanners,
};

const bannerBackgrounds = {
  dreamyBlue: {
    background:
      "radial-gradient(circle at 14% 20%, rgba(255, 255, 255, 0.72), transparent 15%), radial-gradient(circle at 82% 26%, rgba(157, 220, 255, 0.55), transparent 18%), radial-gradient(circle at 55% 85%, rgba(120, 167, 255, 0.32), transparent 24%), linear-gradient(135deg, #b8ecff 0%, #77bdf5 42%, #6d7fe8 72%, #8157c9 100%)",
    border: "none",
    boxShadow: "none",
  },
};

export default function ProfileBanner({
  bannerId = "dreamyBlue",
  bannerUrl = "",
  avatarSrc,
  username = "Player",
  rank = "Novice",
  rankIcon,
  tribeName,
  isOwner = false,
  onChangeBanner,
  onUploadBannerImage,
  textColor = "#5f4c79",
  actions = null,
}) {
 const selectedBanner =
  PROFILE_BANNERS[bannerId] || PROFILE_BANNERS.dreamyBlue;

const selectedBannerStyle = bannerUrl
  ? {
      background:
        "linear-gradient(135deg, #b8ecff 0%, #77bdf5 42%, #6d7fe8 72%, #8157c9 100%)",
      border: "none",
      boxShadow: "none",
    }
  : bannerBackgrounds.dreamyBlue;
    const [bannerEditOpen, setBannerEditOpen] = useState(false);
    const [pendingBannerPreviewUrl, setPendingBannerPreviewUrl] = useState("");
const [pendingBannerFile, setPendingBannerFile] = useState(null);
  const bannerType = selectedBanner.type || "imageBased";


  const [bannerMenuOpen, setBannerMenuOpen] = useState(false);
const bannerMenuRef = useRef(null);
const savePendingBanner = async () => {
  if (!pendingBannerFile || !onUploadBannerImage) return;

  await onUploadBannerImage(pendingBannerFile);

  if (pendingBannerPreviewUrl) {
    URL.revokeObjectURL(pendingBannerPreviewUrl);
  }

  setPendingBannerFile(null);
  setPendingBannerPreviewUrl("");
};

useEffect(() => {
  return () => {
    if (pendingBannerPreviewUrl) {
      URL.revokeObjectURL(pendingBannerPreviewUrl);
    }
  };
}, [pendingBannerPreviewUrl]);

async function handleOutsideClick(event) {
  if (
    bannerMenuRef.current &&
    !bannerMenuRef.current.contains(event.target)
  ) {
    await savePendingBanner();
    setBannerMenuOpen(false);
    setBannerEditOpen(false);
  }
}

useEffect(() => {
  if (!bannerMenuOpen && !bannerEditOpen) return;

  document.addEventListener("mousedown", handleOutsideClick);
  document.addEventListener("touchstart", handleOutsideClick);

  return () => {
    document.removeEventListener("mousedown", handleOutsideClick);
    document.removeEventListener("touchstart", handleOutsideClick);
  };
}, [bannerMenuOpen, bannerEditOpen, pendingBannerFile, pendingBannerPreviewUrl]);

const displayBannerUrl =
  pendingBannerPreviewUrl || bannerUrl || selectedBanner.src || "";

  const styles = {
banner: {
  position: "relative",
  zIndex: 0,
  display: "grid",
  gridTemplateColumns: "145px minmax(0, 1fr)",
  alignItems: "start",
  gap: "18px",
  minHeight: "230px",
  padding: "14px 18px 8px 18px",
  marginBottom: "10px",
  overflow: "visible",
  isolation: "isolate",
  background: "transparent",
  transform: "translateY(20px)",
  cursor: isOwner ? "pointer" : "default",

},

bannerActions: {
  position: "relative",
  zIndex: 6,
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "10px",
  marginTop: "14px",
},

bannerSurface: {
  position: "absolute",
  top: "0px",
  left: 0,
  right: 0,
  height: "200px",

  zIndex: 0,
  overflow: "hidden",
  borderRadius: "40px",
  clipPath: "url(#profileBannerClip)",
  ...selectedBannerStyle,
boxShadow: bannerEditOpen
  ? "none"
  : "none",
border: bannerEditOpen
  ? "2px dashed rgba(255, 255, 255, 0.9)"
  : "none",
},

bannerImage: {
  position: "absolute",
  inset: 0,
  zIndex: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center",
  pointerEvents: "none",
},

avatarWrap: {
  position: "relative",
  zIndex: 4,
  width: "126px",
  height: "126px",
  display: "grid",
  placeItems: "center",
  alignSelf: "start",
  justifySelf: "start",
  borderRadius: "22px",
  background: "transparent",
  transform: "translateY(10px)",
},

avatar: {
  width: "166px",
  height: "166px",
  objectFit: "contain",
  imageRendering: "pixelated",
  filter:
    "drop-shadow(0 0 6px rgba(255,255,255,0.35)) drop-shadow(0 10px 10px rgba(65, 25, 67, 0.22))",
},

info: {
  position: "relative",
  zIndex: 4,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  justifyContent: "flex-start",
  paddingTop: "6px",
  transform: "translateY(10px)",
},

label: {
  letterSpacing: "0.25em",
  fontSize: "10px",
  fontWeight: 800,
  color: textColor,
  opacity: 0.82,
  marginBottom: "4px",
},

name: {
  margin: 0,
  fontSize: "clamp(26px, 4vw, 38px)",
  lineHeight: 1,
  color: textColor,
  textShadow: "0 2px 0 rgba(255, 255, 255, 0.18)",
},

metaRow: {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "8px",
},

rankIcon: {
  width: "22px",
  height: "22px",
  objectFit: "contain",
  filter: "drop-shadow(0 4px 8px rgba(255, 197, 44, 0.45))",
},

rank: {
  color: textColor,
  fontSize: "13px",
  fontWeight: 900,
},

tribePill: {
  padding: "5px 10px",
  borderRadius: "999px",
  color: textColor,
  fontSize: "11px",
  fontWeight: 900,
  background: "rgba(250, 216, 255, 0.74)",
  border: "1px solid rgba(255, 255, 255, 0.6)",
  boxShadow:
    "inset 0 1px 0 rgba(255, 255, 255, 0.42), 0 8px 16px rgba(89, 33, 93, 0.1)",
},

bannerMenuAnchor: {
  position: "absolute",
  right: "0px",
  bottom: "0px",
  zIndex: 30,
},
changeBannerButton: {
  height: "36px",
  padding: "0 14px",
  borderRadius: "999px",
  border: "1px solid rgba(255, 255, 255, 0.58)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.88), rgba(218,234,255,0.82))",
  color: "#4b4f94",
  fontWeight: 900,
  fontSize: "13px",
  cursor: "pointer",
  transform: "translateY(65px)",
  boxShadow:
    "0 8px 18px rgba(58, 105, 180, 0.15), inset 0 1px 0 rgba(255,255,255,0.72)",
},

bannerMenu: {
  position: "absolute",
  top: "0px",
  right: 0,
  zIndex: 40,
  minWidth: "220px",
  padding: "12px",
  borderRadius: "18px",
  background: "rgba(255, 241, 250, 0.96)",
  border: "1px solid rgba(255,255,255,0.7)",
  boxShadow: "0 16px 34px rgba(92, 35, 110, 0.18)",
  backdropFilter: "blur(14px)",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
},

menuLabel: {
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  color: "#7a4d9e",
  textTransform: "uppercase",
},

uploadBannerButton: {
  minHeight: "38px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 14px",
  borderRadius: "12px",
  border: "1px solid rgba(255, 255, 255, 0.65)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(198,227,255,0.88))",
  color: "#355a9a",
  fontSize: "13px",
  fontWeight: 800,
  lineHeight: 1,
  cursor: "pointer",
},

defaultBannerButton: {
  minHeight: "38px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 14px",
  borderRadius: "12px",
  border: "1px solid rgba(255, 255, 255, 0.65)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(198,227,255,0.88))",
  color: "#355a9a",
  fontSize: "13px",
  fontWeight: 800,
  lineHeight: 1,
  cursor: "pointer",
},

bannerPickerSelect: {
  width: "100%",
  minHeight: "38px",
  padding: "0 12px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.65)",
  background: "rgba(255,255,255,0.88)",
  color: "#5d236d",
  fontWeight: 700,
  outline: "none",
  cursor: "pointer",
},
hiddenFileInput: {
  display: "none",
},
  };

  return (
    <>
<style>{`
  @keyframes profileBannerSparkle {
    0%, 100% {
      opacity: 0.48;
      transform: translateY(0);
    }

    50% {
      opacity: 0.92;
      transform: translateY(-4px);
    }
  }
    
  @media (max-width: 900px) {
    .profileHeroBannerInline {
      grid-template-columns: 110px minmax(0, 1fr) !important;
      gap: 12px !important;
      min-height: 148px !important;
      padding: 12px 14px 6px 14px !important;
    }

    .profileHeroAvatarWrapInline {
      width: 98px !important;
      height: 98px !important;
      transform: translateY(8px) !important;
    }

    .profileHeroAvatarInline {
      width: 98px !important;
      height: 98px !important;
    }

    .profileHeroMetaRowInline {
      gap: 6px !important;
    }
  }
`}</style>


<section
  ref={bannerMenuRef}
  className="profileHeroBannerInline"
  style={styles.banner}
  onClick={() => {
    if (isOwner) setBannerEditOpen(true);
  }}
>
<div style={styles.bannerSurface}>
{displayBannerUrl && (
  <img
    style={styles.bannerImage}
    src={displayBannerUrl}
    alt={selectedBanner.label}
  />
)}

  <div style={styles.overlay} />
  <div style={styles.stars} />
</div>

        <div className="profileHeroAvatarWrapInline" style={styles.avatarWrap}>
          {avatarSrc ? (
            <img
              className="profileHeroAvatarInline"
              style={styles.avatar}
              src={avatarSrc}
              alt={username}
            />
          ) : (
            <div style={styles.avatarFallback}>
              {username?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>

        <div className="profileHeroInfoInline" style={styles.info}>
          <div style={styles.label}>PROFILE</div>

          <h1 style={styles.name}>{username}</h1>

          <div className="profileHeroMetaRowInline" style={styles.metaRow}>
            
            {rankIcon && <img style={styles.rankIcon} src={rankIcon} alt={rank} />}

            <span style={styles.rank}>{rank}</span>

            {tribeName && <span style={styles.tribePill}>{tribeName}</span>}
          </div>

          {actions && <div style={styles.bannerActions}>{actions}</div>}

{isOwner && bannerEditOpen && (
  <div style={styles.bannerMenuAnchor} onClick={(e) => e.stopPropagation()}>
    <button
      type="button"
      style={styles.changeBannerButton}
      onClick={() => setBannerMenuOpen((prev) => !prev)}
    >
      Change Banner
    </button>

{bannerMenuOpen && (
  <div style={styles.bannerMenu}>
    {onUploadBannerImage && (
      <>
        

        <label style={styles.uploadBannerButton}>
          {pendingBannerFile ? "Click out to save" : "Upload Banner"}

          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            style={styles.hiddenFileInput}
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) {
                if (pendingBannerPreviewUrl) {
                  URL.revokeObjectURL(pendingBannerPreviewUrl);
                }

                const previewUrl = URL.createObjectURL(file);

                setPendingBannerFile(file);
                setPendingBannerPreviewUrl(previewUrl);
                setBannerMenuOpen(false);
              }

              e.target.value = "";
            }}
          />
        </label>
      </>
    )}

    {onChangeBanner && (
      <>
        

        <button
          type="button"
          style={styles.defaultBannerButton}
onClick={(e) => {
  e.stopPropagation();

  onChangeBanner?.();

  if (pendingBannerPreviewUrl) {
    URL.revokeObjectURL(pendingBannerPreviewUrl);
  }

  setPendingBannerFile(null);
  setPendingBannerPreviewUrl("");
  setBannerMenuOpen(false);
  setBannerEditOpen(false);
}}
        >
          Default
        </button>
      </>
    )}
  </div>
)}
  </div>
)}
        </div>
      </section>
    </>
  );
}