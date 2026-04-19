const fs = require("fs");

const SAMPLE_RATE = 44100;
const VOLUME = 0.11;

const NOTES = {
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  REST: 0.0,
};

function sineWave(freq, duration) {
  const count = Math.floor(SAMPLE_RATE * duration);
  const samples = new Array(count);

  for (let i = 0; i < count; i++) {
    const t = i / SAMPLE_RATE;
    samples[i] = freq === 0 ? 0 : Math.sin(2 * Math.PI * freq * t);
  }

  return samples;
}

function squareWave(freq, duration) {
  const count = Math.floor(SAMPLE_RATE * duration);
  const samples = new Array(count);

  for (let i = 0; i < count; i++) {
    const t = i / SAMPLE_RATE;
    samples[i] = freq === 0 ? 0 : (Math.sin(2 * Math.PI * freq * t) >= 0 ? 1 : -1);
  }

  return samples;
}

function triangleWave(freq, duration) {
  const count = Math.floor(SAMPLE_RATE * duration);
  const samples = new Array(count);

  for (let i = 0; i < count; i++) {
    const t = i / SAMPLE_RATE;
    if (freq === 0) {
      samples[i] = 0;
    } else {
      samples[i] = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * freq * t));
    }
  }

  return samples;
}

function applyFade(samples, fadeMs = 8) {
  let fadeLen = Math.floor((SAMPLE_RATE * fadeMs) / 1000);
  fadeLen = Math.min(fadeLen, Math.floor(samples.length / 2));

  for (let i = 0; i < fadeLen; i++) {
    const fadeIn = i / fadeLen;
    const fadeOut = (fadeLen - i) / fadeLen;
    samples[i] *= fadeIn;
    samples[samples.length - 1 - i] *= fadeOut;
  }

  return samples;
}

function note(freq, duration, waveType = "triangle") {
  let data;

  if (waveType === "square") data = squareWave(freq, duration);
  else if (waveType === "sine") data = sineWave(freq, duration);
  else data = triangleWave(freq, duration);

  return applyFade(data);
}

function sequence(pattern, waveType = "triangle") {
  const audio = [];
  for (const [name, duration] of pattern) {
    audio.push(...note(NOTES[name], duration, waveType));
  }
  return audio;
}

function mixTracks(...tracks) {
  const maxLen = Math.max(...tracks.map((t) => t.length));
  const mixed = new Array(maxLen).fill(0);

  for (const track of tracks) {
    for (let i = 0; i < track.length; i++) {
      mixed[i] += track[i];
    }
  }

  let maxAmp = 1;
  for (const s of mixed) {
    const a = Math.abs(s);
    if (a > maxAmp) maxAmp = a;
  }

  return mixed.map((s) => s / maxAmp);
}

function writeWav(filename, samples) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * numChannels * bytesPerSample, 28);
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const int16 = Math.round(clamped * VOLUME * 32767);
    buffer.writeInt16LE(int16, 44 + i * 2);
  }

  fs.writeFileSync(filename, buffer);
}

const leadPattern = [
  ["E5", 0.12], ["G5", 0.12], ["A5", 0.12], ["G5", 0.12],
  ["E5", 0.12], ["D5", 0.12], ["E5", 0.12], ["REST", 0.06],

  ["F5", 0.12], ["A5", 0.12], ["C5", 0.12], ["A5", 0.12],
  ["F5", 0.12], ["E5", 0.12], ["F5", 0.12], ["REST", 0.06],

  ["G5", 0.12], ["A5", 0.12], ["B5", 0.12], ["A5", 0.12],
  ["G5", 0.12], ["E5", 0.12], ["D5", 0.12], ["REST", 0.06],

  ["E5", 0.12], ["G5", 0.12], ["A5", 0.12], ["C5", 0.12],
  ["A5", 0.12], ["G5", 0.12], ["E5", 0.12], ["REST", 0.06],
];

const bassPattern = [
  ["E3", 0.24], ["E3", 0.24], ["E3", 0.24], ["E3", 0.24],
  ["F3", 0.24], ["F3", 0.24], ["F3", 0.24], ["F3", 0.24],
  ["G3", 0.24], ["G3", 0.24], ["G3", 0.24], ["G3", 0.24],
  ["D3", 0.24], ["D3", 0.24], ["D3", 0.24], ["D3", 0.24],
];

const pulsePattern = [
  ["E4", 0.06], ["REST", 0.06], ["E4", 0.06], ["REST", 0.06],
  ["E4", 0.06], ["REST", 0.06], ["E4", 0.06], ["REST", 0.06],
  ["F4", 0.06], ["REST", 0.06], ["F4", 0.06], ["REST", 0.06],
  ["F4", 0.06], ["REST", 0.06], ["F4", 0.06], ["REST", 0.06],

  ["G4", 0.06], ["REST", 0.06], ["G4", 0.06], ["REST", 0.06],
  ["G4", 0.06], ["REST", 0.06], ["G4", 0.06], ["REST", 0.06],
  ["D4", 0.06], ["REST", 0.06], ["D4", 0.06], ["REST", 0.06],
  ["D4", 0.06], ["REST", 0.06], ["D4", 0.06], ["REST", 0.06],
];

const hitPattern = [
  ["REST", 0.24], ["C4", 0.05], ["REST", 0.19],
  ["REST", 0.24], ["C4", 0.05], ["REST", 0.19],
  ["REST", 0.24], ["C4", 0.05], ["REST", 0.19],
  ["REST", 0.24], ["C4", 0.05], ["REST", 0.19],

  ["REST", 0.24], ["D4", 0.05], ["REST", 0.19],
  ["REST", 0.24], ["D4", 0.05], ["REST", 0.19],
  ["REST", 0.24], ["D4", 0.05], ["REST", 0.19],
  ["REST", 0.24], ["D4", 0.05], ["REST", 0.19],
];

const lead = sequence(leadPattern, "triangle");
const bass = sequence(bassPattern, "square");
const pulse = sequence(pulsePattern, "square");
const hits = sequence(hitPattern, "sine");

const song = mixTracks(lead, bass, pulse, hits);

writeWav("game_loop.wav", song);
console.log("Saved game_loop.wav");