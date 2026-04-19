export const DEFAULT_SOUND_SETTINGS = {
  music: 70,
  effects: 85,
};

export function getSoundSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("dualmath_sound_settings") || "null");
    return { ...DEFAULT_SOUND_SETTINGS, ...(saved || {}) };
  } catch {
    return DEFAULT_SOUND_SETTINGS;
  }
}

export function saveSoundSettings(settings) {
  localStorage.setItem("dualmath_sound_settings", JSON.stringify(settings));
}

export function applyVolume(audio, type, settings) {
  if (!audio || !settings) return;

  // Map sound types to setting categories
  const effectTypes = ["correct", "incorrect", "won", "lost", "click"];
  const musicTypes  = ["mainMusic", "gameMusic", "music"];

  let volume;
  if (effectTypes.includes(type)) {
    volume = settings.effects ?? 85;
  } else if (musicTypes.includes(type)) {
    volume = settings.music ?? 70;
  } else {
    volume = settings[type] ?? 85;
  }

  audio.volume = volume / 100;
}

export function getVolume(type, settingsArg) {
  const settings = settingsArg || getSoundSettings();

  if (type === "mainMusic" || type === "gameMusic") {
    return (settings.music ?? 70) / 100;
  }

  if (
    type === "click" ||
    type === "correct" ||
    type === "incorrect" ||
    type === "won" ||
    type === "lost"
  ) {
    return (settings.effects ?? 85) / 100;
  }

  return 1;
}

