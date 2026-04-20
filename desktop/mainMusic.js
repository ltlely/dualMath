const fs = require("fs");

const SAMPLE_RATE = 44100;
const VOLUME = 0.25;

const NOTES = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
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
    if (freq === 0) {
      samples[i] = 0;
    } else {
      samples[i] = Math.sin(2 * Math.PI * freq * t) >= 0 ? 1 : -1;
    }
  }

  return samples;
}

function applyFade(samples, fadeMs = 30) {
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

function note(freq, duration, waveType = "square") {
  const data =
    waveType === "square"
      ? squareWave(freq, duration)
      : sineWave(freq, duration);

  return applyFade(data);
}

function sequence(pattern, waveType = "square") {
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

  return normalize(mixed);
}

function normalize(samples) {
  let maxAmp = 0.0001;
  for (const s of samples) {
    const a = Math.abs(s);
    if (a > maxAmp) maxAmp = a;
  }
  return samples.map((s) => s / maxAmp);
}

function addLoopTail(samples, tailMs = 250) {
  const tailLen = Math.floor((SAMPLE_RATE * tailMs) / 1000);
  if (samples.length <= tailLen) return samples;

  const head = samples.slice(0, tailLen);
  const tail = samples.slice(samples.length - tailLen);
  const out = samples.slice();

  for (let i = 0; i < tailLen; i++) {
    const fadeIn = i / tailLen;
    const fadeOut = 1 - fadeIn;
    out.push(tail[i] * fadeOut + head[i] * fadeIn);
  }

  return normalize(out);
}

function repeatPattern(pattern, times = 4) {
  return Array.from({ length: times }, () => pattern).flat();
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

const melodyPattern = [
  ["C4", 0.25], ["E4", 0.25], ["G4", 0.25], ["E4", 0.25],
  ["D4", 0.25], ["F4", 0.25], ["A4", 0.25], ["F4", 0.25],
  ["E4", 0.25], ["G4", 0.25], ["C5", 0.25], ["G4", 0.25],
  ["REST", 0.25], ["E4", 0.25], ["D4", 0.25], ["C4", 0.25],
];

const bassPattern = [
  ["C4", 0.5], ["C4", 0.5],
  ["D4", 0.5], ["D4", 0.5],
  ["E4", 0.5], ["E4", 0.5],
  ["C4", 0.5], ["C4", 0.5],
];

const longMelodyPattern = repeatPattern(melodyPattern, 4);
const longBassPattern = repeatPattern(bassPattern, 4);

const melody = sequence(longMelodyPattern, "sine");
const bass = sequence(longBassPattern, "sine");
const song = mixTracks(melody, bass);

const loopReadySong = addLoopTail(song, 0);

writeWav("coding_loop.wav", loopReadySong);
console.log("Saved coding_loop.wav");