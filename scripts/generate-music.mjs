import fs from 'node:fs';
import path from 'node:path';

const SAMPLE_RATE = 22050;
const outputDirectory = process.argv[2] ?? path.join(process.cwd(), '.music-source');

const tracks = [
  ['welcome', 92, 57, 'minor', [0, 5, 3, 6], [0, 2, 4, 7, 4, 2, 1, 4], 0.42, 'crystal'],
  ['home-warrior', 108, 50, 'minor', [0, 6, 5, 0], [0, 4, 7, 9, 7, 4, 2, 4], 0.64, 'steel'],
  ['home-scholar', 96, 57, 'dorian', [0, 3, 6, 4], [0, 2, 6, 4, 7, 6, 2, 1], 0.46, 'crystal'],
  ['home-monk', 82, 55, 'pentatonic', [0, 4, 3, 0], [0, 2, 4, 7, 9, 7, 4, 2], 0.32, 'breath'],
  ['home-ranger', 112, 55, 'major', [0, 4, 5, 3], [0, 4, 7, 11, 9, 7, 4, 2], 0.55, 'wood'],
  ['skills-warrior', 104, 52, 'dorian', [0, 3, 5, 6], [0, 7, 5, 4, 2, 4, 5, 7], 0.55, 'steel'],
  ['skills-scholar', 118, 59, 'minor', [0, 5, 2, 6], [0, 2, 3, 7, 10, 7, 5, 3], 0.58, 'arcane'],
  ['skills-monk', 88, 57, 'pentatonic', [0, 3, 5, 4], [0, 4, 7, 9, 7, 4, 2, 0], 0.38, 'breath'],
  ['skills-ranger', 122, 57, 'dorian', [0, 4, 6, 3], [0, 2, 5, 9, 7, 5, 4, 2], 0.6, 'wood'],
  ['party-camp', 94, 55, 'major', [0, 3, 4, 0], [0, 2, 4, 7, 9, 7, 4, 2], 0.38, 'wood'],
  ['sanctuary', 76, 60, 'major', [0, 4, 3, 5], [0, 4, 7, 11, 9, 7, 4, 0], 0.25, 'crystal'],
  ['raid-hall', 100, 50, 'minor', [0, 5, 6, 0], [0, 3, 7, 10, 7, 5, 3, 2], 0.6, 'steel'],
  ['dungeon-ember', 116, 48, 'phrygian', [0, 1, 5, 0], [0, 1, 4, 7, 8, 7, 4, 1], 0.72, 'fire'],
  ['dungeon-verdant', 102, 53, 'dorian', [0, 3, 6, 4], [0, 2, 5, 7, 9, 7, 5, 2], 0.52, 'wood'],
  ['dungeon-tempest', 126, 50, 'minor', [0, 6, 3, 5], [0, 7, 10, 14, 12, 10, 7, 5], 0.76, 'storm'],
  ['dungeon-caldera', 110, 46, 'phrygian', [0, 1, 6, 0], [0, 1, 7, 8, 7, 4, 1, 0], 0.78, 'fire'],
  ['dungeon-lunar', 98, 57, 'minor', [0, 3, 5, 2], [0, 3, 7, 10, 12, 10, 7, 3], 0.48, 'crystal'],
  ['dungeon-void', 120, 43, 'phrygian', [0, 1, 6, 4], [0, 1, 6, 7, 13, 12, 7, 6], 0.8, 'arcane'],
  ['battle-warrior', 138, 48, 'minor', [0, 6, 5, 0], [0, 7, 10, 12, 10, 7, 5, 3], 0.9, 'steel'],
  ['battle-scholar', 144, 55, 'dorian', [0, 3, 6, 4], [0, 2, 7, 9, 14, 9, 7, 5], 0.86, 'arcane'],
  ['battle-monk', 132, 53, 'pentatonic', [0, 4, 3, 0], [0, 4, 7, 9, 12, 9, 7, 4], 0.78, 'breath'],
  ['battle-ranger', 150, 53, 'minor', [0, 5, 6, 3], [0, 3, 7, 12, 10, 7, 5, 3], 0.92, 'wood'],
  ['boss-iron', 126, 43, 'phrygian', [0, 1, 6, 0], [0, 1, 7, 13, 12, 7, 4, 1], 0.96, 'steel'],
  ['boss-thorn', 132, 48, 'minor', [0, 3, 1, 5], [0, 3, 8, 10, 8, 7, 3, 1], 0.92, 'wood'],
  ['boss-storm', 152, 46, 'dorian', [0, 6, 3, 4], [0, 7, 9, 14, 12, 9, 7, 5], 1, 'storm'],
  ['boss-ash', 118, 41, 'phrygian', [0, 1, 5, 6], [0, 1, 7, 8, 13, 8, 7, 1], 1, 'fire'],
  ['boss-moon', 140, 50, 'minor', [0, 3, 6, 5], [0, 3, 7, 12, 15, 12, 10, 7], 0.94, 'crystal'],
  ['boss-void', 146, 38, 'phrygian', [0, 1, 6, 0], [0, 6, 7, 13, 18, 13, 7, 1], 1, 'arcane'],
  ['victory', 124, 60, 'major', [0, 4, 5, 0], [0, 4, 7, 12, 11, 9, 7, 12], 0.72, 'crystal'],
  ['defeat', 72, 50, 'minor', [0, 5, 3, 0], [7, 5, 3, 2, 0, -2, 0, -5], 0.24, 'breath'],
];

const scales = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
};

fs.mkdirSync(outputDirectory, { recursive: true });
for (const config of tracks) {
  const [id] = config;
  const samples = synthesize(config);
  fs.writeFileSync(path.join(outputDirectory, `${id}.wav`), encodeWave(samples));
  process.stdout.write(`${id}.wav\n`);
}

function synthesize([id, bpm, root, mode, progression, motif, energy, palette]) {
  const beatDuration = 60 / bpm;
  const beats = 32;
  const sampleCount = Math.ceil(beats * beatDuration * SAMPLE_RATE);
  const output = new Float64Array(sampleCount);
  const scale = scales[mode];
  const rng = mulberry32(hash(id));
  const wave = palette === 'steel' || palette === 'fire' ? 'saw' : palette === 'arcane' || palette === 'storm' ? 'square' : 'triangle';

  for (let bar = 0; bar < 8; bar += 1) {
    const degree = progression[bar % progression.length];
    const chordStart = bar * 4 * beatDuration;
    const chordNotes = [degree, degree + 2, degree + 4];
    for (const chordDegree of chordNotes) {
      addNote(output, chordStart, beatDuration * 3.9, degreeFrequency(root - 12, scale, chordDegree), 0.042, 'sine', 0.18, 0.7);
    }
    for (let beat = 0; beat < 4; beat += 1) {
      const start = chordStart + beat * beatDuration;
      addNote(output, start, beatDuration * 0.78, degreeFrequency(root - 24, scale, degree + (beat === 3 ? 4 : 0)), 0.12 + energy * 0.035, wave, 0.015, 0.16);
      addKick(output, start, 0.17 + energy * 0.07);
      if (beat === 1 || beat === 3) addSnare(output, start, 0.07 + energy * 0.08, rng);
      if (energy > 0.45) {
        addHat(output, start + beatDuration * 0.5, 0.025 + energy * 0.035, rng);
      }
    }
  }

  for (let step = 0; step < 64; step += 1) {
    if ((step + 1) % 8 === 0 && energy < 0.5) continue;
    const start = step * beatDuration * 0.5;
    const motifDegree = motif[step % motif.length];
    const octaveLift = step % 16 >= 8 ? 12 : 0;
    addNote(
      output,
      start,
      beatDuration * (palette === 'breath' ? 0.8 : 0.4),
      midiFrequency(root + 12 + octaveLift + motifDegree),
      0.055 + energy * 0.045,
      palette === 'crystal' ? 'sineBell' : wave,
      0.008,
      palette === 'breath' ? 0.5 : 0.12,
    );
  }

  if (palette === 'storm' || palette === 'arcane') {
    for (let step = 0; step < 128; step += 1) {
      const start = step * beatDuration * 0.25;
      const degree = motif[(step * 3) % motif.length];
      addNote(output, start, beatDuration * 0.16, midiFrequency(root + 24 + degree), 0.018 + energy * 0.018, 'square', 0.003, 0.04);
    }
  }

  const echoDelay = Math.round(beatDuration * 0.75 * SAMPLE_RATE);
  for (let index = echoDelay; index < output.length; index += 1) {
    output[index] += output[index - echoDelay] * (palette === 'crystal' || palette === 'arcane' ? 0.2 : 0.1);
  }
  normalize(output);
  return output;
}

function addNote(output, startSeconds, durationSeconds, frequency, amplitude, waveform, attack, release) {
  const start = Math.round(startSeconds * SAMPLE_RATE);
  const length = Math.min(output.length - start, Math.round(durationSeconds * SAMPLE_RATE));
  for (let index = 0; index < length; index += 1) {
    const time = index / SAMPLE_RATE;
    const progress = index / Math.max(1, length - 1);
    const attackEnvelope = Math.min(1, time / Math.max(0.001, attack));
    const releaseEnvelope = Math.min(1, (durationSeconds - time) / Math.max(0.001, release));
    const envelope = Math.max(0, Math.min(attackEnvelope, releaseEnvelope)) * (1 - progress * 0.12);
    const phase = Math.PI * 2 * frequency * time;
    let value;
    if (waveform === 'square') value = Math.sin(phase) >= 0 ? 0.72 : -0.72;
    else if (waveform === 'saw') value = 2 * ((frequency * time) % 1) - 1;
    else if (waveform === 'triangle') value = 2 * Math.abs(2 * ((frequency * time) % 1) - 1) - 1;
    else if (waveform === 'sineBell') value = Math.sin(phase) + Math.sin(phase * 2.01) * 0.3 + Math.sin(phase * 3.98) * 0.12;
    else value = Math.sin(phase);
    output[start + index] += value * amplitude * envelope;
  }
}

function addKick(output, startSeconds, amplitude) {
  const start = Math.round(startSeconds * SAMPLE_RATE);
  const length = Math.min(output.length - start, Math.round(0.18 * SAMPLE_RATE));
  for (let index = 0; index < length; index += 1) {
    const time = index / SAMPLE_RATE;
    const phase = Math.PI * 2 * (80 * time - 55 * time * time);
    output[start + index] += Math.sin(phase) * amplitude * Math.exp(-time * 24);
  }
}

function addSnare(output, startSeconds, amplitude, rng) {
  const start = Math.round(startSeconds * SAMPLE_RATE);
  const length = Math.min(output.length - start, Math.round(0.12 * SAMPLE_RATE));
  for (let index = 0; index < length; index += 1) {
    const time = index / SAMPLE_RATE;
    const noise = rng() * 2 - 1;
    output[start + index] += (noise * 0.75 + Math.sin(Math.PI * 2 * 180 * time) * 0.25) * amplitude * Math.exp(-time * 30);
  }
}

function addHat(output, startSeconds, amplitude, rng) {
  const start = Math.round(startSeconds * SAMPLE_RATE);
  const length = Math.min(output.length - start, Math.round(0.045 * SAMPLE_RATE));
  let previous = 0;
  for (let index = 0; index < length; index += 1) {
    const time = index / SAMPLE_RATE;
    const noise = rng() * 2 - 1;
    output[start + index] += (noise - previous * 0.7) * amplitude * Math.exp(-time * 75);
    previous = noise;
  }
}

function degreeFrequency(root, scale, degree) {
  const octave = Math.floor(degree / scale.length);
  const normalized = ((degree % scale.length) + scale.length) % scale.length;
  return midiFrequency(root + scale[normalized] + octave * 12);
}

function midiFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

function normalize(samples) {
  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  const gain = peak > 0 ? 0.88 / peak : 1;
  for (let index = 0; index < samples.length; index += 1) samples[index] *= gain;
}

function encodeWave(samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let index = 0; index < samples.length; index += 1) {
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[index])) * 32767), 44 + index * 2);
  }
  return buffer;
}

function hash(value) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
