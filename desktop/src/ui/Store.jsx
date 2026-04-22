import React, { useEffect, useMemo, useState } from "react";
import { Card, Button } from "./components.jsx";
import { userManager } from "../userManagerSupabase.js";
import BoyCharacterLight from "../public/Character/BoyCharacterLight.png";
import BoyCharacterTan from "../public/Character/BoyCharacterTan.png";
import BoyCharacterDark from "../public/Character/BoyCharacterDark.png";
import BoyCharacterLightTan from "../public/Character/BoyCharacterLightTan.png";
import GirlCharacterLightTan from "../public/Character/GirlCharacterLightTan.png";
import GirlCharacterLight from "../public/Character/GirlCharacterLight.png";
import GirlCharacterTan from "../public/Character/GirlCharacterTan.png";
import GirlCharacterDark from "../public/Character/GirlCharacterDark.png";
import boyHair1 from "../public/Hair/Boy/BoyHair1.png";
import boyHair2 from "../public/Hair/Boy/BoyHair2.png";
import boyHair3 from "../public/Hair/Boy/BoyHair3.png";
import boyHair4 from "../public/Hair/Boy/BoyHair4.png";
import boyHair5 from "../public/Hair/Boy/BoyHair5.png";
import boyHair6 from "../public/Hair/Boy/BoyHair6.png";
import boyHair7 from "../public/Hair/Boy/BoyHair7.png";
import girlHair1 from "../public/Hair/Girl/GirlHair1.png";
import girlHair2 from "../public/Hair/Girl/GirlHair2.png";
import girlHair3 from "../public/Hair/Girl/GirlHair3.png";
import girlHair4 from "../public/Hair/Girl/GirlHair4.png";
import girlHair5 from "../public/Hair/Girl/GirlHair5.png";
import girlHair6 from "../public/Hair/Girl/GirlHair6.png";
import girlHair7 from "../public/Hair/Girl/GirlHair7.png";
import girlHair8 from "../public/Hair/Girl/GirlHair8.png";
import girlHair9 from "../public/Hair/Girl/GirlHair9.png";
import girlHair10 from "../public/Hair/Girl/GirlHair10.png";
import girlHair11 from "../public/Hair/Girl/GirlHair11.png";
import girlHair12 from "../public/Hair/Girl/GirlHair12.png";
import girlHair13 from "../public/Hair/Girl/GirlHair13.png";
import girlHair14 from "../public/Hair/Girl/GirlHair14.png";
import girlHair15 from "../public/Hair/Girl/GirlHair15.png";
import girlHair16 from "../public/Hair/Girl/GirlHair16.png";
import girlHair17 from "../public/Hair/Girl/GirlHair17.png";
import girlHair18 from "../public/Hair/Girl/GirlHair18.png";
import girlHair19 from "../public/Hair/Girl/GirlHair19.png";
import girlHair20 from "../public/Hair/Girl/GirlHair20.png";
import uniHat1 from "../public/Hair/Accessories/UniHat1.png";
import uniFlower1 from "../public/Hair/Accessories/UniFlower1.png";
import uniGlass1 from "../public/Hair/Accessories/UniGlass1.png";
import uniCrab1 from "../public/Hair/Accessories/UniCrab1.png";
import girlDress1 from "../public/Dress/GirlDress1.png";
import girlDress2 from "../public/Dress/GirlDress2.png";
import girlDress3 from "../public/Dress/GirlDress3.png";
import girlDress4 from "../public/Dress/GirlDress4.png";
import girlDress5 from "../public/Dress/GirlDress5.png";
import GirlTop1 from "../public/Tops/Girl/GirlTop1.png";
import GirlTop2 from "../public/Tops/Girl/GirlTop2.png";
import UniTop1 from "../public/Tops/Uni/UniTop1.png";
import GirlSkirt1 from "../public/Bottoms/Girl/GirlSkirt1.png";
import GirlSkirt2 from "../public/Bottoms/Girl/GirlSkirt2.png";
import UniShoes1 from "../public/Shoes/UniShoes1.png";
import UniShoes2 from "../public/Shoes/UniShoes2.png";
import UniShoes3 from "../public/Shoes/UniShoes3.png";
import UniShorts1 from "../public/Bottoms/Uni/UniShorts1.png";
import BoyTop1 from "../public/Tops/Boy/BoyTop1.png";
import BoyOutfit1 from "../public/Outfits/Boy/BoyOutfit1.png";
import BoyOutfit2 from "../public/Outfits/Boy/BoyOutfit2.png";
import BoyOutfit3 from "../public/Outfits/Boy/BoyOutfit3.png";
import GirlTop3 from "../public/Tops/Girl/Sprites/GirlTop3.png";
import GirlTop4 from "../public/Tops/Girl/Sprites/GirlTop4.png";
import GirlTop5 from "../public/Tops/Girl/Sprites/GirlTop5.png";
import GirlTop6 from "../public/Tops/Girl/Sprites/GirlTop6.png";
import GirlTop7 from "../public/Tops/Girl/Sprites/GirlTop7.png";
import GirlTop8 from "../public/Tops/Girl/Sprites/GirlTop8.png";
import GirlTop9 from "../public/Tops/Girl/GirlTop9.png";
import GirlTop10 from "../public/Tops/Girl/GirlTop10.png";
import BoyTop2 from "../public/Tops/Boy/Sprites/BoyTop2.png";
import BoyTop3 from "../public/Tops/Boy/Sprites/BoyTop3.png";
import BoyTop4 from "../public/Tops/Boy/Sprites/BoyTop4.png";
import BoyTop5 from "../public/Tops/Boy/Sprites/BoyTop5.png";
import UniHat2 from "../public/Hair/Accessories/UniHat2.png";
import BoyTop6 from "../public/Tops/Boy/BoyTop6.png";
import BoyTop7 from "../public/Tops/Boy/BoyTop7.png";
import BoyTop8 from "../public/Tops/Boy/BoyTop8.png";
import GirlOutfit1 from "../public/Outfits/Girl/GirlOutfit1.png";
import UniEyepatch from "../public/Hair/Accessories/UniEyepatch.png";
import UniEgg from "../public/Hair/Accessories/UniEgg.png";
import UniToast from "../public/Hair/Accessories/UniToast.png";
import BoyShorts1 from "../public/Bottoms/Boy/BoyShorts1.png";
import BoyShorts2 from "../public/Bottoms/Boy/BoyShorts2.png";
import BoyShorts3 from "../public/Bottoms/Boy/BoyShorts3.png";
import UniTop2 from "../public/Tops/Uni/UniTop2.png";
import GirlTop11 from "../public/Tops/Girl/GirlTop11.png";
import UniTop3 from "../public/Tops/Uni/UniTop3.png";

const STARTING_COINS = 2000;
const LAST_GENDER_KEY = "store_last_gender";

const GirlTop1Frames = [
  GirlTop3,
  GirlTop4,
  GirlTop5,
  GirlTop6,
  GirlTop7,
  GirlTop8,
];

const BoyTop1Frames = [
  BoyTop2,
  BoyTop3,
  BoyTop4,
  BoyTop5,
];


const storeItems = {
  hair: [
    { id: "BoyHair1", label: "Soft Brown Cut", asset: boyHair1, price: 20, rarity: "Common" },
    { id: "BoyHair2", label: "Layered Sweep", asset: boyHair2, price: 35, rarity: "Common" },
    { id: "GirlHair19", label: "Moonlit Aqua Hair", asset: girlHair19, price: 3000, rarity: "Epic" },
    { id: "BoyHair3", label: "Silver Breeze", asset: boyHair3, price: 1550, rarity: "Rare" },
    { id: "BoyHair4", label: "Moss cut", asset: boyHair4, price: 75, rarity: "Common" },
    { id: "BoyHair5", label: "Stormy Waves", asset: boyHair5, price: 2200, rarity: "Epic" },
    { id: "BoyHair6", label: "Aura Shag", asset: boyHair6, price: 1300, rarity: "Rare" },
    { id: "BoyHair7", label: "Crimson Comet", asset: boyHair7, price: 650, rarity: "Uncommon" },
    { id: "GirlHair2", label: "Northwind Hair", asset: girlHair2, price: 20, rarity: "Common" },
    { id: "GirlHair1", label: "Maple Buns", asset: girlHair1, price: 1100, rarity: "Uncommon" },
    { id: "GirlHair3", label: "Violet Breeze", asset: girlHair3, price: 100, rarity: "Common" },
    { id: "GirlHair4", label: "Blue Mist", asset: girlHair4, price: 150, rarity: "Common", gender: "female", storeGender: "female" },
    { id: "GirlHair5", label: "Frosty Flair", asset: girlHair5, price: 1600, rarity: "Rare" },    
    { id: "GirlHair6", label: "Tidal Whisper", asset: girlHair6, price: 2000, rarity: "Rare" },
    { id: "GirlHair7", label: "Sunset Halo", asset: girlHair7, price: 900, rarity: "Common" },
    { id: "GirlHair8", label: "Cinnamon Bun", asset: girlHair8, price: 450, rarity: "Common" },
    { id: "GirlHair9", label: "Moonflower", asset: girlHair9, price: 3750, rarity: "Epic" },
    { id: "GirlHair10", label: "Jewelry Twist", asset: girlHair10, price: 1200, rarity: "Rare" },
    { id: "GirlHair11", label: "Whisper Ribbon", asset: girlHair11, price: 4200, rarity: "Epic" },
    { id: "GirlHair12", label: "Flora Tresses", asset: girlHair12, price: 2100, rarity: "Epic" },
    { id: "GirlHair13", label: "Golden Stardust", asset: girlHair13, price: 1300, rarity: "Uncommon" },
    { id: "GirlHair14", label: "Hairbow Twintails", asset: girlHair14, price: 2500, rarity: "Epic" },
    { id: "GirlHair15", label: "Bow Braids", asset: girlHair15, price: 2500, rarity: "Rare" },
    { id: "GirlHair16", label: "Strawberry Waves", asset: girlHair16, price: 800, rarity: "Uncommon" },
    { id: "GirlHair17", label: "Shadow Cut", asset: girlHair17, price: 600, rarity: "Common" },
    { id: "GirlHair18", label: "Cherry Puff Bangs ", asset: girlHair18, price: 450, rarity: "Common" },
    { id: "GirlHair20", label: "Crimson Puff Hair", asset: girlHair20, price: 2300, rarity: "Rare" },
  ],
  tops: [
    { id: "GirlTop1", label: "Sky Puff Top", asset: GirlTop1, price: 150, rarity: "Uncommon" },
    { id: "GirlTop2", label: "Brown Blouse", asset: GirlTop2, price: 120, rarity: "Common" },
    { id: "UniTop1", label: "Pink Bunny Tee", asset: UniTop1, price: 120, rarity: "Common" }, 
    { id: "BoyTop1", label: "Tuxedo Shirt", asset: BoyTop1, price: 1800, rarity: "Rare" },
    { id: "GirlTop1Animated", label: "Flower Bloom Top", asset: GirlTop1Frames[0], price: 2400, rarity: "Epic" },  
    { id: "BoyTop1Animated", label: "Blueberry Glow Shirt", asset: BoyTop1Frames[0], price: 2400, rarity: "Epic" },
    { id: "GirlTop9", label: "Sunshine Reef Top", asset: GirlTop9, price: 300, rarity: "Uncommon" },
    { id: "BoyTop7", label: "Cozy Navy Shirt", asset: BoyTop7, price: 1800, rarity: "Rare" },
    { id: "BoyTop8", label: "Woodland Jacket", asset: BoyTop8, price: 600, rarity: "Uncommon" },
    { id: "GirlTop10", label: "Strawberry Dot", asset: GirlTop10, price: 1800, rarity: "Epic" },
    { id: "UniTop2", label: "Mint Cozy", asset: UniTop2, price: 400, rarity: "Uncommon" },
    { id: "GirlTop11", label: "Lime Sorbet Top", asset: GirlTop11, price: 1200, rarity: "Uncommon" },
    { id: "UniTop3", label: "Velvet Blush Top", asset: UniTop3, price: 800, rarity: "Common" },
    { id: "BoyTop6", label: "Carrot Shirt", asset: BoyTop6, price: 120, rarity: "Common"}
  ],
  bottoms: [
    { id: "GirlSkirt1", label: "White Skirt", asset: GirlSkirt1, price: 180, rarity: "Common" },
    { id: "GirlSkirt2", label: "Aloha Petal Skirt", asset: GirlSkirt2, price: 75, rarity: "Common" },
    { id: "UniShorts1", label: "Blue Shorts", asset: UniShorts1, price: 60, rarity: "Common" },
    { id: "BoyShorts1", label: "Grey Sweats", asset: BoyShorts1, price: 50, rarity: "Common" },
    { id: "BoyShorts2", label: "Brown Cozy Pants", asset: BoyShorts2, price: 350, rarity: "Uncommon" },
    { id: "BoyShorts3", label: "Khaki Pants", asset: BoyShorts3, price: 400, rarity: "Uncommon" },
  ],
  outfits: [
    { id: "girlDress1", label: "Inferno Sprite Hood", asset: girlDress1, price: 250, rarity: "Uncommon" },
    { id: "girlDress2", label: "Berry Glow Dress", asset: girlDress2, price: 150, rarity: "Common" },
    { id: "girlDress3", label: "Sky Cloud Dress", asset: girlDress3, price: 180, rarity: "Common" },
    { id: "girlDress4", label: "Fairy Tale Dress", asset: girlDress4, price: 1400, rarity: "Rare" },
    { id: "girlDress5", label: "Watermelon Apron", asset: girlDress5, price: 650, rarity: "Uncommon" },
    { id: "BoyOutfit1", label: "Aloha Explorer", asset: BoyOutfit1, price: 1000, rarity: "Epic" },
    { id: "BoyOutfit2", label: "Little Island", asset: BoyOutfit2, price: 200, rarity: "Common" },
    { id: "BoyOutfit3", label: "Lifeguard", asset: BoyOutfit3, price: 800, rarity: "Uncommon" },
    { id: "GirlOutfit1", label: "Coral Reef", asset: GirlOutfit1, price: 300, rarity: "Uncommon" },
  ],
  shoes: [
    {id: "UniShoes1", label: "Dark Wing", asset: UniShoes1, price: 70, rarity: "Common"},
    {id: "UniShoes2", label: "Ducky", asset: UniShoes2, price: 190, rarity: "Uncommon"},
    {id: "UniShoes3", label: "Gecko Slides", asset: UniShoes3, price: 450, rarity: "Rare"},

  ],
  accessories: [
    { id: "UniHat1", label: "Mushroom Hat", asset: uniHat1, price: 1150, rarity: "Rare", gender: "all" },
    { id: "UniFlower1", label: "Flower", asset: uniFlower1, price: 95, rarity: "Common", gender: "all" },
    { id: "UniGlass1", label: "Glasses", asset: uniGlass1, price: 120, rarity: "Uncommon", gender: "all" },
    { id: "UniCrab1", label: "Crab Headband", asset: uniCrab1, price: 250, rarity: "Rare", gender: "all" },
    { id: "UniHat2", label: "Frog Hat", asset: UniHat2, price: 1300, rarity: "Epic", gender: "all" },
    { id: "UniEyepatch", label: "Eyepatch", asset: UniEyepatch, price: 500, rarity: "Uncommon", gender: "all" },
    { id: "UniEgg", label: "Egg", asset: UniEgg, price: 1400, rarity: "Epic", gender: "all" },
    { id: "UniToast", label: "Toast", asset: UniToast, price: 200, rarity: "Common", gender: "all" },
  ],
};



const rarityClass = {
  Common: "rarityCommon",
  Uncommon: "rarityUncommon",
  Rare: "rarityRare",
  Epic: "rarityEpic",
};

const inferGenderFromItem = (item) => {
  if (item?.gender) return item.gender;

  const raw = `${item.id} ${item.label}`.toLowerCase();
  if (raw.includes("boy") || raw.includes("male")) return "male";
  if (raw.includes("girl") || raw.includes("female")) return "female";
  return "all";
};

const normalizedStoreItems = Object.fromEntries(
  Object.entries(storeItems).map(([category, items]) => [
    category,
    items.map((item) => ({
      ...item,
      gender: inferGenderFromItem(item),
    })),
  ])
);

const getHairAsset = (name) => {
  if (name === "BoyHair2") return boyHair2;
  if (name === "BoyHair3") return boyHair3;
  if (name === "BoyHair4") return boyHair4;
  if (name === "BoyHair5") return boyHair5;
  if (name === "BoyHair1") return boyHair1;
  if (name === "GirlHair1") return girlHair1;
  if (name === "GirlHair2") return girlHair2;
  if (name === "GirlHair3") return girlHair3;
  if (name === "GirlHair4") return girlHair4;
  if (name === "GirlHair5") return girlHair5;
  if (name === "GirlHair19") return girlHair19;
  if (name === "GirlHair6") return girlHair6;
  if (name === "GirlHair7") return girlHair7;
  if (name === "GirlHair8") return girlHair8;
  if (name === "GirlHair9") return girlHair9;
  if (name === "GirlHair10") return girlHair10;
  if (name === "GirlHair11") return girlHair11;
  if (name === "BoyHair6") return boyHair6;
  if (name === "BoyHair7") return boyHair7;
  if (name === "GirlHair12") return girlHair12;
  if (name === "GirlHair13") return girlHair13;
  if (name === "GirlHair14") return girlHair14;
  if (name === "GirlHair15") return girlHair15;
  if (name === "GirlHair16") return girlHair16;
  if (name === "GirlHair17") return girlHair17;
  if (name === "GirlHair18") return girlHair18;
  if (name === "GirlHair20") return girlHair20;
  return boyHair1;
};

const getBaseCharacterAsset = (gender, skinTone = "light") => {
  if (gender === "female") {
    if (skinTone === "lightTan") return GirlCharacterLightTan;
    if (skinTone === "tan") return GirlCharacterTan;
    if (skinTone === "dark") return GirlCharacterDark;
    return GirlCharacterLight;
  }

  if (skinTone === "lightTan") return BoyCharacterLightTan;
  if (skinTone === "tan") return BoyCharacterTan;
  if (skinTone === "dark") return BoyCharacterDark;
  return BoyCharacterLight;
};

const getAccessoryAsset = (name) => {
  if (name === "UniHat1") return uniHat1;
  if (name === "UniFlower1") return uniFlower1;
  if (name === "UniGlass1") return uniGlass1;
  if (name === "UniCrab1") return uniCrab1;
  if (name === "UniHat2") return UniHat2;
  if (name === "UniEyepatch") return UniEyepatch;
  if (name === "UniEgg") return UniEgg;
  if (name === "UniToast") return UniToast;
  return null;
};

const getSelectedHairAsset = (gender, hairSelection) => {
  return getHairAsset(hairSelection);
};

const getOutfitAsset = (name) => {
  if (name === "girlDress1") return girlDress1;
  if (name === "girlDress2") return girlDress2;
  if (name === "girlDress3") return girlDress3;
  if (name === "girlDress4") return girlDress4;
  if (name === "BoyOutfit1") return BoyOutfit1;
  if (name === "BoyOutfit2") return BoyOutfit2;
  if (name === "BoyOutfit3") return BoyOutfit3;
  if (name === "GirlOutfit1") return GirlOutfit1;
  if (name === "girlDress5") return girlDress5;
  return null;
};

const getTopAsset = (name, frame = 0) => {
    if (name === "GirlTop1Animated") {
    return GirlTop1Frames[frame % GirlTop1Frames.length];
  }

  if (name === "BoyTop1Animated") {
    return BoyTop1Frames[frame % BoyTop1Frames.length];
  }
  if (name === "GirlTop1") return GirlTop1;
  if (name === "GirlTop2") return GirlTop2;
  if (name === "UniTop1") return UniTop1;
  if (name === "BoyTop1") return BoyTop1;
  if (name === "GirlTop9") return GirlTop9;
  if (name === "BoyTop6") return BoyTop6;
  if (name === "GirlTop10") return GirlTop10;
  if (name === "BoyTop7") return BoyTop7;
  if (name === "BoyTop8") return BoyTop8;
  if (name === "UniTop2") return UniTop2;
  if (name === "GirlTop11") return GirlTop11;
  if (name === "UniTop3") return UniTop3;
  return null;
};

const getBottomAsset = (name) => {
  if (name === "GirlSkirt1") return GirlSkirt1;
  if (name === "GirlSkirt2") return GirlSkirt2;
  if (name === "UniShorts1") return UniShorts1;
  if (name === "BoyShorts1") return BoyShorts1;
  if (name === "BoyShorts2") return BoyShorts2;
  if (name === "BoyShorts3") return BoyShorts3;
  return null;
};

const getShoeAsset = (name) => {
  if (name === "UniShoes1") return UniShoes1;
  if (name === "UniShoes2") return UniShoes2;
  if (name === "UniShoes3") return UniShoes3;
  return null;
};




const composeCharacterAvatar = async (
  gender,
  skinTone,
  hairSelection,
  topSelection,
  bottomSelection,
  outfitSelection,
  shoeSelection,
  accessorySelection
) => {
  const layerSources = [
    getBaseCharacterAsset(gender, skinTone),
    !getOutfitAsset(outfitSelection) && getBottomAsset(bottomSelection),
    getTopAsset(topSelection, 0),
    getOutfitAsset(outfitSelection),
    getShoeAsset(shoeSelection),
    getSelectedHairAsset(gender, hairSelection),
    getAccessoryAsset(accessorySelection),
  ].filter(Boolean);

  const imgs = await Promise.all(
    layerSources.map(
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

export default function Store({ currentUser, onLoginSuccess, onClose }) {
  const [buyTarget, setBuyTarget] = useState(null);

  const [animationFrame, setAnimationFrame] = useState(0);
  const [selectedSkinTone, setSelectedSkinTone] = useState(
  currentUser?.skinTone || "light"
);



useEffect(() => {
  setSelectedSkinTone(currentUser?.skinTone || "light");
}, [currentUser?.id, currentUser?.skinTone]);

    const userGender = currentUser?.starterCharacter === "girl" ? "female" : "male";
  const activeGender = userGender;

  const categoryMeta = useMemo(() => ({
  owned: {
    label: "Owned",
    asset: activeGender === "female" ? girlHair2 : boyHair1,
  },
  hair: {
    label: "Hair",
    asset: activeGender === "female" ? girlHair1 : boyHair5,
  },
  tops: {
    label: "Tops",
    asset: activeGender === "female" ? GirlTop1 : BoyTop6,
  },
  bottoms: {
    label: "Bottoms",
    asset: activeGender === "female" ? GirlSkirt1 : BoyShorts1,
  },
  outfits: {
    label: "Outfits",
    asset: activeGender === "female" ? girlDress1 : BoyOutfit1,
  },
  shoes: {
    label: "Shoes",
    asset: UniShoes1,
  },
  accessories: {
    label: "Accessories",
    asset: uniHat1,
  },
}), [activeGender]);

useEffect(() => {
  const maxFrames = Math.max(
    GirlTop1Frames.length,
    BoyTop1Frames.length
  );

  const timer = setInterval(() => {
    setAnimationFrame((prev) => (prev + 1) % maxFrames);
  }, 150);

  return () => clearInterval(timer);
}, []);

  
  

  const [activeCategory, setActiveCategory] = useState("hair");
 const [selectedItems, setSelectedItems] = useState(() => ({
  hair:
    currentUser?.equippedHair ??
    (userGender === "female" ? "GirlHair2" : "BoyHair1"),
  tops: currentUser?.equippedTop ?? "",
  bottoms: currentUser?.equippedBottom ?? "UniShorts1",
  outfits: currentUser?.equippedOutfit ?? "",
  shoes: currentUser?.equippedShoes ?? "UniShoes1",
  accessories: currentUser?.equippedAccessory ?? "",
}));

  const hasSelectedOutfit = !!getOutfitAsset(selectedItems.outfits);
  const shouldShowBottoms = !hasSelectedOutfit;
const [ownedItems, setOwnedItems] = useState(
  new Set(
    Array.isArray(currentUser?.ownedItems) && currentUser.ownedItems.length > 0
      ? currentUser.ownedItems
      : userGender === "female"
      ? ["GirlHair2", "UniTop1", "UniShorts1", "UniShoes1"]
      : ["BoyHair1", "BoyTop6", "UniShorts1", "UniShoes1"]
  )
);
  const [coins, setCoins] = useState(currentUser?.coins ?? 2000);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

useEffect(() => {
  setCoins(currentUser?.coins ?? STARTING_COINS);
}, [currentUser?.id]);

const categoryItems = useMemo(() => {
  if (activeCategory === "owned") {
    return Object.entries(normalizedStoreItems)
      .flatMap(([category, items]) =>
        items.map((item) => ({ ...item, storeCategory: category }))
      )
      .filter((item) => {
        if (item.id === "GirlHair4") {
          console.log("GirlHair4 runtime", {
            id: item.id,
            label: item.label,
            gender: item.gender,
            activeGender,
          });
        }

        const matchesGender =
          item.gender === "all" || item.gender === activeGender;
        const matchesSearch = item.label
          .toLowerCase()
          .includes(search.toLowerCase());
        const isOwned = ownedItems.has(item.id);

        return matchesGender && matchesSearch && isOwned;
      });
  }

  return normalizedStoreItems[activeCategory].filter((item) => {
    if (item.id === "GirlHair4") {
      console.log("GirlHair4 runtime", {
        id: item.id,
        label: item.label,
        gender: item.gender,
        activeGender,
      });
    }

    const matchesGender =
      item.gender === "all" || item.gender === activeGender;
    const matchesSearch = item.label.toLowerCase().includes(search.toLowerCase());
    return matchesGender && matchesSearch;
  });
}, [activeCategory, activeGender, search, ownedItems]);

  // const equippedCount = Object.values(selectedItems).filter(Boolean).length;
  const ownedCount = Array.from(ownedItems).length;

  const unequippableCategories = new Set([
  "hair",
  "tops",
  "bottoms",
  "outfits",
  "shoes",
  "accessories",
]);

const countEquippedWearables = (items) => {
  return ["hair","tops","bottoms","outfits","shoes","accessories"]
    .filter((cat) => !!items[cat])
    .length;
};

const handleUnequip = (category) => {
  const equippedCount = countEquippedWearables(selectedItems);
  const defaultHair = activeGender === "female" ? "GirlHair2" : "BoyHair1";

  if (category === "hair") {
    const ownedHairIds = normalizedStoreItems.hair
      .filter((item) => ownedItems.has(item.id))
      .map((item) => item.id);

    const onlyHasDefaultHair =
      ownedHairIds.length === 1 && ownedHairIds[0] === defaultHair;

    const isTryingToUnequipDefaultHair = selectedItems.hair === defaultHair;

    if (onlyHasDefaultHair && isTryingToUnequipDefaultHair) {
      setError("You cannot unequip your default hair unless you own another hair.");
      return;
    }
  }

  if (equippedCount <= 1) {
    setError("You must keep at least one item equipped.");
    return;
  }

  setSelectedItems((prev) => ({
    ...prev,
    [category]: "",
  }));
};

 const handleTryOn = (category, itemId) => {
  setSelectedItems((prev) => {
    const next = { ...prev, [category]: itemId };

    // If player picks an outfit, clear separate clothing layers that should not overlap
    if (category === "outfits" && getOutfitAsset(itemId)) {
      next.tops = "";
      next.bottoms = "";
    }

    // If player picks a top or bottom, remove outfit
    if ((category === "tops" || category === "bottoms") && itemId) {
      next.outfits = "";
    }

    return next;
  });

  setMessage("");
  setError("");
};

  const handleBuyItem = async (item) => {
  setMessage("");
  setError("");

  if (ownedItems.has(item.id)) {
    setMessage(`${item.label} is already owned.`);
    return;
  }

  if (coins < item.price) {
    setError(`Not enough coins to buy ${item.label}.`);
    return;
  }

  const newCoinTotal = coins - item.price;
  const nextOwnedItems = new Set([...ownedItems, item.id]);

  setCoins(newCoinTotal);
  setOwnedItems(nextOwnedItems);
  setMessage(`${item.label} purchased successfully.`);

  try {
    const updatedUser = {
      ...currentUser,
      coins: newCoinTotal,
      ownedItems: Array.from(nextOwnedItems),
    };

    const result = await userManager.saveUser(updatedUser);

    if (!result?.success) {
      throw new Error(result?.message || "Failed to save purchase.");
    }

    // Update parent so currentUser stays in sync without closing the store
    if (onLoginSuccess) {
      onLoginSuccess(result.user || updatedUser);
    }

  } catch (err) {
    console.error("Failed to save updated coins:", err);
    setError("Could not save purchase.");
    setCoins(currentUser?.coins ?? STARTING_COINS);
    setOwnedItems(new Set(currentUser?.ownedItems || []));
  }
};

const getOwnedSelection = () => {
  const defaultHair = activeGender === "female" ? "GirlHair2" : "BoyHair1";

  return {
    // Hair is required — always fall back to default
    hair: ownedItems.has(selectedItems.hair) ? selectedItems.hair : defaultHair,
    // These are optional — if unequipped (""), keep them empty
    tops: selectedItems.tops && ownedItems.has(selectedItems.tops) ? selectedItems.tops : "",
    bottoms: selectedItems.bottoms && ownedItems.has(selectedItems.bottoms) ? selectedItems.bottoms : "",
    outfits: selectedItems.outfits && ownedItems.has(selectedItems.outfits) ? selectedItems.outfits : "",
    shoes: selectedItems.shoes && ownedItems.has(selectedItems.shoes) ? selectedItems.shoes : "",
    accessories: selectedItems.accessories && ownedItems.has(selectedItems.accessories) ? selectedItems.accessories : "",
  };
};

const [localAvatarData, setLocalAvatarData] = useState(currentUser?.avatarData || null);

useEffect(() => {
  if (currentUser?.avatarData) {
    setLocalAvatarData(currentUser.avatarData);
  }
}, [currentUser?.avatarData, currentUser?.id]);


  const handleSave = async () => {
  if (!currentUser) return;

  setMessage("");
  setError("");
  setIsSaving(true);

  const ownedSelection = getOwnedSelection();

  const triedUnownedItem =
    ownedSelection.hair !== selectedItems.hair ||
    ownedSelection.tops !== selectedItems.tops ||
    ownedSelection.bottoms !== selectedItems.bottoms ||
    ownedSelection.shoes !== selectedItems.shoes ||
    ownedSelection.accessories !== selectedItems.accessories ||
    ownedSelection.outfits !== selectedItems.outfits;

  try {
      const avatarDataUrl = await composeCharacterAvatar(
  activeGender,
  selectedSkinTone,
  ownedSelection.hair,
  ownedSelection.tops,
  ownedSelection.bottoms,
  ownedSelection.outfits,
  ownedSelection.shoes,
  ownedSelection.accessories
);

const updatedUser = {
  ...currentUser,
  avatarData: avatarDataUrl,
  skinTone: selectedSkinTone,
  equippedHair: ownedSelection.hair,
  equippedTop: ownedSelection.tops,
  equippedBottom: ownedSelection.bottoms,
  equippedOutfit: ownedSelection.outfits,
  equippedShoes: ownedSelection.shoes,
  equippedAccessory: ownedSelection.accessories,
  ownedItems: Array.from(ownedItems),
  coins,
};

   const result = await userManager.saveUser(updatedUser);

if (!result?.success) {
  throw new Error(result?.message || "Failed to save character.");
}

const savedUser = result.user || updatedUser;

// Update mini avatar immediately
setLocalAvatarData(avatarDataUrl);

if (onLoginSuccess) {
  onLoginSuccess(savedUser);
}

setSavedItems({
  hair: ownedSelection.hair,
  tops: ownedSelection.tops,
  bottoms: ownedSelection.bottoms,
  outfits: ownedSelection.outfits,
  shoes: ownedSelection.shoes,
  accessories: ownedSelection.accessories,
});

    // keep the current outfit visible in the shop
    setSelectedItems({
      hair: ownedSelection.hair,
      tops: ownedSelection.tops,
      bottoms: ownedSelection.bottoms,
      outfits: ownedSelection.outfits,
      shoes: ownedSelection.shoes,
      accessories: ownedSelection.accessories,
    });

    setMessage(
      triedUnownedItem
        ? "Only owned items were saved."
        : "Character saved successfully."
    );

    // DO NOT call onLoginSuccess here
    // that can reset/remount the shop view

  } catch (err) {
    console.error("Store save error:", err);
    setError("Could not save character. Try again.");
  } finally {
    setIsSaving(false);
  }
};

const [savedItems, setSavedItems] = useState({
  hair:
    currentUser?.equippedHair ??
    (userGender === "female" ? "GirlHair2" : "BoyHair1"),
  tops: currentUser?.equippedTop ?? "",
  bottoms: currentUser?.equippedBottom ?? "UniShorts1",
  outfits: currentUser?.equippedOutfit ?? "",
  shoes: currentUser?.equippedShoes ?? "UniShoes1",
  accessories: currentUser?.equippedAccessory ?? "",
});

const handleResetOutfit = () => {
  setSelectedItems(savedItems);
  setMessage("");
  setError("");
};

useEffect(() => {
  if (!currentUser?.id) return;
  setOwnedItems(
    new Set(
      Array.isArray(currentUser.ownedItems) && currentUser.ownedItems.length > 0
        ? currentUser.ownedItems
        : userGender === "female"
        ? ["GirlHair2", "UniTop1", "UniShorts1", "UniShoes1"]
        : ["BoyHair1", "BoyTop6", "UniShorts1", "UniShoes1"]
    )
  );
}, [currentUser?.id]);

// Sync equipped items when currentUser changes
useEffect(() => {
  if (!currentUser) return;
 setSelectedItems({
  hair: currentUser.equippedHair ?? (userGender === "female" ? "GirlHair2" : "BoyHair1"),
  tops: currentUser.equippedTop ?? "",
  bottoms: currentUser.equippedBottom ?? "UniShorts1",
  outfits: currentUser.equippedOutfit ?? "",
  shoes: currentUser.equippedShoes ?? "UniShoes1",
  accessories: currentUser.equippedAccessory ?? "",
});
setSavedItems({
  hair: currentUser.equippedHair ?? (userGender === "female" ? "GirlHair2" : "BoyHair1"),
  tops: currentUser.equippedTop ?? "",
  bottoms: currentUser.equippedBottom ?? "UniShorts1",
  outfits: currentUser.equippedOutfit ?? "",
  shoes: currentUser.equippedShoes ?? "UniShoes1",
  accessories: currentUser.equippedAccessory ?? "",
});
}, [currentUser?.id]); // only re-sync when the user itself changes, not on every render

return (
  <div className="storeOverlay">
    <div className="storeShell">
      <div className="storeTopbar">
        <div>
          <h1 className="storeHeading">Shop</h1>
        </div>
        <div className="topbarActions">
  <div className="currencyPill">
    <img src="/coin.png" alt="Coins" className="coinsImg" />
    <span>{coins.toLocaleString()} Coins</span>
  </div>
  <Button variant="secondary" onClick={onClose}>✕</Button>
</div>
      </div>

      <div className="storeLayout">
        <aside className="sidebarPanel">
          <div className="playerMiniCard">
            <div className="playerMiniAvatar">
{localAvatarData || currentUser?.avatarData ? (
  <img
    src={localAvatarData || currentUser?.avatarData}
    alt="Current avatar"
  />
) : (
  <div className="avatarFallback">?</div>
)}
            </div>
            <div>
              <div className="miniLabel">PLAYER</div>
              <div className="miniName">{currentUser?.username || "Guest"}</div>
              
            </div>
          </div>

          <div className="sidebarSectionTitle">Categories</div>
          <div className="categoryList">
  {Object.keys(categoryMeta).map((category) => {
    const isActive = activeCategory === category;
    const meta = categoryMeta[category];

    const visibleItems =
      category === "owned"
        ? Object.values(normalizedStoreItems)
            .flat()
            .filter(
              (item) => item.gender === "all" || item.gender === activeGender
            )
        : normalizedStoreItems[category].filter(
            (item) => item.gender === "all" || item.gender === activeGender
          );

    const availableCount = visibleItems.length;
    const ownedCategoryCount = visibleItems.filter((item) =>
      ownedItems.has(item.id)
    ).length;

    return (
      <button
        key={category}
        className={`categoryButton ${isActive ? "active" : ""}`}
        onClick={() => {
          setActiveCategory(category);
          setSearch("");
        }}
      >
        <span className="categoryEmoji">
          <img src={meta.asset} alt={meta.label} className="categoryIconImg" />
        </span>

        <span className="categoryCopy">
          <span className="categoryTitle">{meta.label}</span>
          <span className="categoryCount">
            {category === "owned"
              ? `${ownedCategoryCount} owned`
              : `${availableCount} items`}
          </span>
        </span>
      </button>
    );
  })}

 
</div>

          {/* <div className="sidebarSummary">
            <div className="summaryCard">
              <span className="summaryLabel">Owned</span>
              <strong>{ownedCount} items</strong>
            </div>
          </div> */}
        </aside>

        <main className="catalogPanel">
          <div className="catalogHeader">
            <div>
              <div className="miniLabel">BROWSE</div>
              <h2>{categoryMeta[activeCategory].label}</h2>
            </div>
            <div className="catalogTools">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="searchInput"
                placeholder={`Search ${categoryMeta[activeCategory].label.toLowerCase()}...`}
              />
            </div>
          </div>

          <div className="catalogScroll">
            <div className="catalogGrid">
{categoryItems.map((item) => {
  const itemCategory =
    activeCategory === "owned" ? item.storeCategory : activeCategory;

  const isSelected = selectedItems[itemCategory] === item.id;
  const isOwned = ownedItems.has(item.id);

  return (
    <div key={item.id} className={`itemCard ${isSelected ? "selected" : ""}`}>
      <div className="itemThumb">
        {item.asset ? (
          <img src={item.asset} alt={item.label} />
        ) : null}
      </div>

      <div className="itemInfo">
        <div className="itemTopRow">
          <h3>{item.label}</h3>
          <span className={`rarityBadge ${rarityClass[item.rarity]}`}>
            {item.rarity}
          </span>
        </div>

        <div className="itemMetaLine">
          <span className="genderBadge">
            {item.gender === "all" ? "Unisex" : item.gender}
          </span>
{!isOwned && (
  <span className="priceTag">
    <img src="/coin.png" alt="Coins" className="priceTagCoinImg" />
    {item.price}
  </span>
)}
        </div>

        <div className="itemBottomRow">
          <span className={`ownershipBadge ${isOwned ? "owned" : "locked"}`}>
            {isOwned ? "Owned" : "Not owned"}
          </span>

          <div className="actionGroup">
            <button
              type="button"
              className="actionButton try"
              onClick={() =>
                isSelected
                  ? handleUnequip(itemCategory)
                  : handleTryOn(itemCategory, item.id)
              }
            >
              {isSelected ? "Unequip" : "Equip"}
            </button>

            {!isOwned && (
              <button
                type="button"
                className="actionButton buy"
                onClick={() => setBuyTarget(item)}
              >
                Buy {item.price}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
})}
              {categoryItems.length === 0 && (
                <div className="emptyState">
                  No {activeGender} items found in this category yet.
                </div>
              )}
            </div>
          </div>
        </main>

        <aside className="previewPanel">
          <Card title="Preview">
            <div className="skinTonePicker">
  <button
    type="button"
    className={`skinToneSwatch ${selectedSkinTone === "light" ? "active" : ""}`}
    onClick={() => setSelectedSkinTone("light")}
    aria-label="Light skin tone"
  />
  <button
    type="button"
    className={`skinToneSwatch ${selectedSkinTone === "lightTan" ? "active" : ""}`}
    onClick={() => setSelectedSkinTone("lightTan")}
    aria-label="Light tan skin tone"
  />
  <button
    type="button"
    className={`skinToneSwatch ${selectedSkinTone === "tan" ? "active" : ""}`}
    onClick={() => setSelectedSkinTone("tan")}
    aria-label="Tan skin tone"
  />
  <button
    type="button"
    className={`skinToneSwatch ${selectedSkinTone === "dark" ? "active" : ""}`}
    onClick={() => setSelectedSkinTone("dark")}
    aria-label="Dark skin tone"
  />
</div>
           <div className="previewStage" style={{ pointerEvents: "none" }}>

           

  <img
   src={getBaseCharacterAsset(activeGender, selectedSkinTone)}
    alt="Base character"
    className="previewLayer"
    style={{ pointerEvents: "none" }}
  />
  {shouldShowBottoms && getBottomAsset(selectedItems.bottoms) && (
    <img src={getBottomAsset(selectedItems.bottoms)} alt="Selected bottom" className="previewLayer" style={{ pointerEvents: "none" }} />
  )}
  {!getOutfitAsset(selectedItems.outfits) &&
  getTopAsset(selectedItems.tops, animationFrame) && (
    <img
      src={getTopAsset(selectedItems.tops, animationFrame)}
      alt="Selected top"
      className="previewLayer"
      style={{ pointerEvents: "none" }}
    />
)}

{getOutfitAsset(selectedItems.outfits) && (
  <img
    src={getOutfitAsset(selectedItems.outfits)}
    alt="Selected outfit"
    className="previewLayer"
    style={{ pointerEvents: "none" }}
  />
)}
  {getShoeAsset(selectedItems.shoes) && (
    <img src={getShoeAsset(selectedItems.shoes)} alt="Selected shoe" className="previewLayer" style={{ pointerEvents: "none" }} />
  )}
  <img src={getSelectedHairAsset(activeGender, selectedItems.hair)} alt="Selected hair" className="previewLayer" style={{ pointerEvents: "none" }} />
  {getAccessoryAsset(selectedItems.accessories) && (
    <img src={getAccessoryAsset(selectedItems.accessories)} alt="Selected accessory" className="previewLayer" style={{ pointerEvents: "none" }} />
  )}
</div>

 <div className="previewActions" style={{ 
  position: "relative", 
  zIndex: 10,
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  marginTop: "12px",
  pointerEvents: "none" 
}}>
  <button 
    type="button" 
    onClick={handleResetOutfit}
    style={{ 
      cursor: "pointer",
      width: "100%",
      padding: "10px 16px",
      borderRadius: "14px",
      border: "none",
      fontWeight: 700,
      fontSize: "14px",
      background: "linear-gradient(180deg, #e6c96a, #caa63a)",
      color: "#4a3b2a",
      boxShadow: "0 6px 14px rgba(202,166,58,0.35)",
      pointerEvents: "all",
    }}
  >
    Reset Outfit
  </button>
  <button
    type="button"
    onClick={handleSave}
    disabled={isSaving}
    style={{
      cursor: isSaving ? "not-allowed" : "pointer",
      width: "100%",
      padding: "10px 16px",
      borderRadius: "14px",
      border: "none",
      fontWeight: 700,
      fontSize: "14px",
      background: "linear-gradient(180deg, #e6c96a, #caa63a)",
      color: "#4a3b2a",
      boxShadow: "0 6px 14px rgba(202,166,58,0.35)",
      pointerEvents: "all",
    }}
  >
    {isSaving ? "Saving..." : "Save Character"}
  </button>
</div>

            {message && <div className="statusMessage success">{message}</div>}
            {error && <div className="statusMessage error">{error}</div>}
          </Card>
        </aside>
      </div>


    </div>

    {buyTarget && (
  <div className="confirmModal">
    <div className="confirmOverlay" onClick={() => setBuyTarget(null)} />
    <div className="confirmCard">
      <div className="miniLabel">Confirm Purchase</div>
      <h3>Buy Item?</h3>
<p className="confirmText">
  Are you sure you want to buy <strong>{buyTarget.label}</strong> for{" "}
  <strong className="confirmPriceInline">
    <img src="/coin.png" alt="Coins" className="priceTagCoinImg" />
    {buyTarget.price}
  </strong>
  ?
</p>

      <div className="confirmActions">
        <button
          type="button"
          className="declineButton"
          onClick={() => setBuyTarget(null)}
        >
          Cancel
        </button>
        <button
          type="button"
          className="acceptButton"
          onClick={async () => {
            const itemToBuy = buyTarget;
            setBuyTarget(null);
            await handleBuyItem(itemToBuy);
          }}
        >
          Buy
        </button>
      </div>
    </div>
  </div>
)}


      <style>{`
       :root{
  --base: rgba(255, 239, 196, 0.97);
  --cream:#fff3cf;
  --cream-2:#ffefc2;
  --cream-3:#f8de9c;
  --tan:#e8bf79;
  --tan-2:#d8a253;
  --brown:#9d6b2f;
  --brown-dark:#6e4319;
  --brown-soft:#be8747;
  --brown-light:#e4b77d;
  --gold:#e3aa33;
  --gold-2:#f0bd4c;
  --gold-3:#ffd36e;
  --ink:#5a3512;
  --muted:#a47138;
  --card-border:#d7a14f;
  --success-bg: rgba(181, 131, 43, 0.16);
  --success-border: rgba(181, 131, 43, 0.42);
  --error-bg: rgba(180, 86, 66, 0.15);
  --error-border: rgba(180, 86, 66, 0.38);
  --glow-gold: 0 0 40px rgba(227, 170, 51, 0.24);
  --glow-brown: 0 0 24px rgba(157, 107, 47, 0.22);
  --olive: #9a7444;
  --olive-soft: rgba(154, 116, 68, 0.18);
}

.confirmPriceInline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.confirmModal {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: grid;
  place-items: center;
  pointer-events: all;
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
  pointer-events: all;
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

.acceptButton,
.declineButton {
  border: none;
  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
  font-size: 13px;
}

.acceptButton {
  background: linear-gradient(180deg, var(--gold-2), var(--gold));
  color: #4a3218;
}

.declineButton {
  background: rgba(255,255,255,0.7);
  color: var(--brown-dark);
}

.categoryEmoji {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, var(--gold-3), var(--brown));
  overflow: hidden;
}

.categoryIconImg {
  width: 30px;
  height: 30px;
  object-fit: contain;
  image-rendering: pixelated;
  background: transparent;
}
      

        .miniLabel, .sidebarSectionTitle, .summaryLabel { text-transform: uppercase; letter-spacing: 0.18em; font-size: 11px; color: var(--ink); }
        .storeHeading { margin: 6px 0 8px; font-size: clamp(32px, 4vw, 48px); line-height: 1; font-weight: 900; color: var(--ink); }
        .topbarActions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .currencyPill {
  min-width: 160px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  white-space: nowrap;
  padding: 10px 2px;
  border-radius: 999px;
  border: 1px solid rgba(107, 79, 52, 0.12);
  box-shadow: 0 10px 18px rgba(102, 69, 42, 0.18);
  font-weight: 700;
  background: linear-gradient(180deg, rgba(112, 83, 36, 0.95), rgba(82, 61, 27, 0.95)) !important;
  color: #fff2d2 !important;
}

.backButton,
.btn.secondary {
  padding: 12px 16px;
  border-radius: 999px;
  border: 1px solid rgba(214, 172, 95, 0.22) !important;
  background: linear-gradient(180deg, rgba(98, 73, 33, 0.96), rgba(74, 55, 25, 0.96)) !important;
  color: #fff1cf !important;
  font-weight: 700;
  cursor: pointer;
}



        .genderTab { padding: 12px 16px; border-radius: 999px; border: 1px solid rgba(107, 79, 52, 0.12); background: var(--brown); box-shadow: 0 10px 18px rgba(102, 69, 42, 0.18); font-weight: 700; color: #f9f1dd; }
        .genderTab { cursor: pointer; transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease; }
        .genderTab.active { background: var(--brown-soft); box-shadow: 0 10px 18px rgba(102, 69, 42, 0.18); }
        .categoryCopy { display: flex; flex-direction: column; gap: 3px; }
        .summaryCard { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-radius: 18px; background: rgba(255, 253, 244, 0.75); border: 1px solid rgba(93, 88, 63, 0.08); color: var(--ink); }
        .catalogHeader { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
        .catalogHeader h2 { margin: 6px 0 0; font-size: 28px; color: var(--ink); }
        .catalogTools { min-width: min(100%, 260px); }
        .searchInput { width: 100%; padding: 12px 14px; border-radius: 16px; border: 1px solid rgba(93, 88, 63, 0.12); background: #fffdf5; color: var(--ink); outline: none; }
        .searchInput::placeholder { color: var(--muted); }
        .catalogGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 10px;}
        .itemCard { display: grid; grid-template-columns: 84px 1fr; gap: 14px; align-items: center; min-height: 132px; padding: 14px; border-radius: 22px; border: 1px solid rgba(93, 88, 63, 0.08); background: rgba(254, 255, 210, 0.36); transition: 0.18s ease; position: relative; }
        .itemCard::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0; box-shadow: var(--glow-gold); transition: opacity 0.18s ease; }
        .itemCard:hover, .itemCard.selected { border-color: rgba(107, 79, 52, 0.45); box-shadow: 0 12px 22px rgba(107, 79, 52, 0.16); transform: translateY(-1px); background:  background: rgba(254, 255, 210, 0.68);}
        .itemCard:hover::after, .itemCard.selected::after { opacity: 1; background:  background: rgba(254, 255, 210, 0.68); }
        .itemThumb { width: 84px; height: 84px; border-radius: 18px; background: radial-gradient(circle at top, var(--brown-soft), var(--brown-dark)); border: 1px solid rgba(107, 79, 52, 0.08); display: grid; place-items: center; overflow: hidden; }
        .itemThumb img { width: 70px; height: 70px; object-fit: contain; image-rendering: pixelated; }
        .itemInfo { display: flex; flex-direction: column; gap: 10px; }
        .itemTopRow, .itemBottomRow, .itemMetaLine { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
        .itemTopRow h3 { margin: 0; font-size: 16px; color: var(--ink); }
        .rarityBadge, .priceTag, .ownershipBadge, .genderBadge, .actionButton { padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; border: none; }
        .rarityCommon { background: rgba(141, 111, 77, 0.12); color: var(--brown-dark); }
        .rarityUncommon { background: rgba(182, 153, 110, 0.24); color: #7e5d3e; }
        .rarityRare { background: rgba(206, 153, 89, 0.18); color: #7a532f; }
        .rarityEpic { background: rgba(172, 111, 58, 0.25); color: #6b4327; }
        .priceTag { background: rgba(194, 146, 71, 0.18); color: #7f5a29; }
        .genderBadge { background: rgba(141, 111, 77, 0.1); color: var(--brown-dark); text-transform: capitalize; }
        .ownershipBadge.owned { background: rgba(167, 214, 169, 0.42); color: #5f7b51; }
        .ownershipBadge.locked { background: rgba(202, 166, 58, 0.16); color: #9a7a24; }
        .actionGroup { display: flex; gap: 8px; flex-wrap: wrap; margin-left: auto; }
        .actionButton { cursor: pointer; color: white; transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .actionButton:hover { transform: translateY(-1px); }
        .actionButton.try { background: linear-gradient(180deg, rgba(167, 120, 78, 0.95), rgba(133, 86, 52, 0.95)); box-shadow: 0 8px 14px rgba(119, 76, 43, 0.2); }
        .actionButton.buy { background: linear-gradient(180deg, var(--gold-2), var(--gold)); box-shadow: 0 8px 14px rgba(186, 137, 56, 0.22); }
        .actionButton.equip { background: linear-gradient(180deg, rgba(161, 118, 82, 0.95), rgba(137, 91, 61, 0.95)); box-shadow: 0 8px 14px rgba(120, 76, 46, 0.18); }
        .emptyState { grid-column: 1 / -1; min-height: 200px; display: grid; place-items: center; border-radius: 22px; border: 1px dashed rgba(93, 88, 63, 0.16); color: var(--muted); background: rgba(255, 253, 244, 0.55); }

        .playerMiniCard {
  display: grid;
  grid-template-columns: 74px 1fr;
  gap: 12px;
  padding: 10px 14px;
  min-height: 84px;
  border-radius: 20px;
  background: rgba(254, 255, 210, 0.53);
  border: 1px solid rgba(93, 88, 63, 0.08);
  align-items: center;
}

.playerMiniAvatar,
.avatarFallback {
  width: 90px;
  height: 68px;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  flex-shrink: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  margin-top: -8px;
  margin-bottom: -18px;
  
}

.catalogPanel,
.previewPanel {
  background: rgba(255, 253, 244, 0.22) !important;
  backdrop-filter: blur(18px) saturate(160%) !important;
  -webkit-backdrop-filter: blur(18px) saturate(160%) !important;
  border: 1px solid rgba(255, 255, 255, 0.28) !important;
  box-shadow:
    0 10px 30px rgba(91, 63, 42, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.45) !important;
  position: relative;
  overflow: hidden;
}

.skinTonePicker {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 10px;
}

.skinToneSwatch {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 2px solid rgba(157, 107, 47, 0.22);
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(95, 70, 48, 0.12);
}

.skinToneSwatch:nth-child(1) {
  background: #f6d7bd;
}

.skinToneSwatch:nth-child(2) {
  background: #e7b98f;
}

.skinToneSwatch:nth-child(3) {
  background: #d39a6a;
}

.skinToneSwatch:nth-child(4) {
  background: #8a5a3c;
}
  
.skinToneSwatch.active {
  border-color: #9b7758;
  box-shadow: 0 0 0 3px rgba(155, 119, 88, 0.15);
}

.playerMiniAvatar img {
  width: 90px;
  height: 90px;
  object-fit: contain;
  object-position: center top;
  image-rendering: pixelated;
  display: block;
  background: transparent;
  border-radius: 0;
  transform: translateY(0);
  margin-right: 15px;
}

.coinsImg {
  width: 28px;
  height: 28px;
  object-fit: contain;
  display: block;
  flex-shrink: 0;
}

.priceTag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(194, 146, 71, 0.18);
  color: #7f5a29;
}

.priceTagCoinImg {
  width: 16px;
  height: 16px;
  object-fit: contain;
  display: block;
  flex-shrink: 0;
}

.avatarFallback {
  font-size: 22px;
  font-weight: 900;
  color: var(--brown-dark);
}

.miniName {
  font-size: 16px;
  font-weight: 800;
  margin-top: 2px;
  color: var(--ink);
  line-height: 1.05;
}

.miniMuted {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.2;
}


        .previewPanel {
  padding: 10px;
  color: var(--ink);
  display: flex;
  justify-content: center;
  align-items: stretch;
  overflow: visible;
}

.previewPanel .card {
  width: 100%;
  height: 100%;
  margin: 0;
  display: flex;
  flex-direction: column;
  border-radius: 28px;
  background: linear-gradient(
    180deg,
    rgba(255, 249, 236, 0.82),
    rgba(238, 212, 155, 0.78)
  );
  border: 1px solid rgba(157, 107, 47, 0.12);
  box-shadow:
    0 20px 40px rgba(95, 70, 48, 0.12),
    inset 0 1px 0 rgba(255,255,255,0.35);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.previewPanel .cardBody {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 12px;
}


.previewStage {
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 430px;
  margin: 0 auto 6px;
  border-radius: 26px;
  background: transparent;
  border: none;
  overflow: visible;
  box-shadow: none;
  isolation: isolate;
}

.previewStage::before {
  content: "";
  position: absolute;
  inset: 8% 10%;
  border-radius: 50%;
  background:
    radial-gradient(
      circle,
      rgba(255, 241, 191, 0.58) 0%,
      rgba(255, 220, 120, 0.24) 38%,
      rgba(255, 220, 120, 0.08) 60%,
      transparent 76%
    );
  filter: blur(20px);
  z-index: 0;
  pointer-events: none;
}

.previewStage::after {
  content: "";
  position: absolute;
  inset: 16% 18%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255,255,255,0.28) 0%,
    transparent 72%
  );
  filter: blur(10px);
  z-index: 0;
  pointer-events: none;
}

.previewLayer {
  position: absolute;
  inset: 0;
  width: 97%;
  height: 97%;
  margin: auto;
  object-fit: contain;
  object-position: center 58%;
  image-rendering: pixelated;
  background: transparent;
  transform: none;
  pointer-events: none;
  z-index: 1;
}

.previewActions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
  padding-top: 4px;
}

.saveCharacterButton,
.previewActions button,
.previewActions .button,
.previewActions [class*="button"] {
  width: 100%;
  padding: 12px 16px;
  border-radius: 16px;
  border: 1px solid rgba(157, 107, 47, 0.12);
  font-weight: 800;
  font-size: 14px;
  margin-top: 0;
  background: rgb(0, 0, 0) !important;
  color: #4a3218 !important;
  box-shadow:
    0 10px 18px rgba(202,166,58,0.22),
    inset 0 1px 0 rgba(255, 29, 29, 0.28);
  cursor: pointer;
}

.previewActions button:hover,
.previewActions .button:hover,
.previewActions [class*="button"]:hover {
  transform: translateY(-1px);
}

.statusMessage {
  margin-top: 6px;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 13px;
}

.previewStage {
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 430px;
  margin: 0 auto 12px;
  border-radius: 22px;
  background: transparent;
  border: none;
  overflow: visible;
  box-shadow: none;
}

.previewStage::before {
  content: "";
  position: absolute;
  inset: 4% 8%;
  border-radius: 50%;
  background:
    radial-gradient(circle, rgba(255, 239, 170, 0.72) 0%, rgba(255, 211, 102, 0.30) 34%, rgba(255, 211, 102, 0.10) 58%, transparent 76%);
  filter: blur(22px);
  z-index: 0;
  pointer-events: none;
}

.previewStage::after {
  content: "";
  position: absolute;
  inset: 14% 18%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.32) 0%, transparent 70%);
  filter: blur(10px);
  z-index: 0;
  pointer-events: none;
}

.previewLayer {
  position: absolute;
  inset: 0;
  width: 97%;
  height: 97%;
  margin: auto;
  object-fit: contain;
  object-position: center 58%;
  image-rendering: pixelated;
  background: transparent;
  transform: none;
}

.previewActions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}

.saveCharacterButton,
.previewActions button,
.previewActions .button,
.previewActions [class*="button"] {
  width: 100%;
  padding: 10px 16px;
  border-radius: 14px;
  border: none;
  font-weight: 700;
  font-size: 14px;
  margin-top: 0;
  background: rgba(254, 255, 210, 0.36) !important;
  color: #4a3b2a !important;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.97));
  cursor: pointer;
}

.previewLayer {
  position: absolute;
  inset: 0;
  width: 97%;
  height: 97%;
  margin: auto;
  object-fit: contain;
  object-position: center 58%;
  image-rendering: pixelated;
  background: transparent;
  transform: none;
  pointer-events: none;
}

.storeOverlay {
  pointer-events: none;
}

.storeShell {
  pointer-events: all;
}







            
        .card { background: linear-gradient(180deg, #fbf7e7, #e7d7b5); border: 2px solid #c7a87a; border-radius: 18px; box-shadow: 0 10px 24px rgba(95,70,48,0.18); padding: 16px; }
      
        .statusMessage { margin-top: 12px; padding: 12px 14px; border-radius: 14px; font-size: 13px; }
        .statusMessage.success { background: var(--success-bg); border: 1px solid var(--success-border); color: #4d7e41; }
        .statusMessage.error { background: var(--error-bg); border: 1px solid var(--error-border); color: #c23b3b !important; }
      `}</style>
    </div>
  );
}
