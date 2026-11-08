'use strict';
// Sound. There are no audio assets in Fathom for the same reason there are no image
// assets: everything is made at load from a description, so a new sound is a few numbers
// rather than a file.
//
// The design is one idea repeated. A sound is a list of **layers**, each either a tone
// (an oscillator sweeping between two frequencies) or a hiss (filtered noise sweeping
// between two cutoffs), with an attack-decay envelope. That is enough for a pickaxe, a
// bowstring, a splash, a spell and a boss, because what distinguishes those is mostly
// which frequencies move which way and how fast.
//
// Keeping the description separate from the playing matters more here than it looks: the
// table can then be checked in Node, where there is no audio at all. What the test can
// prove is that every sound the game asks for exists, that none of them is silent or
// deafening or ten seconds long, and that the music only ever picks notes in its own
// scale - which is most of what actually goes wrong with generated audio.

const SAMPLE_NOISE = 1.2;          // seconds of noise to generate once and reuse

// --- the catalogue ---------------------------------------------------------------------
// gain is peak amplitude, 0-1. attack and decay are seconds. from/to are frequencies in
// hertz: for a tone the oscillator sweeps between them, for a hiss the filter does.
// `spread` is how far the pitch is jittered per play, as a fraction - without it, the
// same sound fifty times in a row is a machine gun rather than a pickaxe.

function tone(type, from, to, gain, attack, decay, extra) {
  return Object.assign({ kind: 'tone', type, from, to, gain, attack, decay }, extra || {});
}
function hiss(from, to, gain, attack, decay, extra) {
  return Object.assign({ kind: 'hiss', from, to, gain, attack, decay, q: 1 }, extra || {});
}

const SOUNDS = {
  // Digging. Three materials rather than one, because the difference between a spade in
  // soil and a pick on stone is most of what mining sounds like.
  'dig-soil': { spread: 0.14, layers: [hiss(900, 260, 0.3, 0.004, 0.1, { q: 0.7 })] },
  'dig-stone': { spread: 0.16, layers: [
    hiss(2600, 700, 0.26, 0.002, 0.07, { q: 2.5 }),
    tone('square', 320, 190, 0.1, 0.002, 0.05)
  ] },
  'dig-wood': { spread: 0.15, layers: [
    tone('triangle', 420, 240, 0.22, 0.002, 0.1),
    hiss(1800, 900, 0.1, 0.002, 0.05, { q: 1.4 })
  ] },
  break: { spread: 0.12, layers: [
    hiss(3000, 400, 0.34, 0.002, 0.24, { q: 1.2 }),
    tone('square', 260, 90, 0.16, 0.002, 0.16)
  ] },
  place: { spread: 0.1, layers: [tone('square', 540, 380, 0.16, 0.002, 0.07)] },

  // The player.
  step: { spread: 0.22, layers: [hiss(620, 180, 0.12, 0.003, 0.07, { q: 0.8 })] },
  jump: { spread: 0.08, layers: [tone('sine', 300, 560, 0.16, 0.004, 0.13)] },
  land: { spread: 0.12, layers: [
    hiss(500, 120, 0.2, 0.002, 0.11, { q: 0.7 }),
    tone('sine', 180, 90, 0.14, 0.002, 0.1)
  ] },
  splash: { spread: 0.18, layers: [
    hiss(4200, 600, 0.26, 0.004, 0.3, { q: 0.6 }),
    tone('sine', 700, 300, 0.08, 0.004, 0.16)
  ] },
  hurt: { spread: 0.1, layers: [
    tone('sawtooth', 420, 160, 0.26, 0.004, 0.22),
    hiss(1600, 400, 0.14, 0.002, 0.14, { q: 1 })
  ] },
  death: { spread: 0.03, layers: [
    tone('sawtooth', 300, 60, 0.3, 0.01, 0.9),
    tone('sine', 150, 40, 0.22, 0.02, 1.1)
  ] },

  // Fighting. A swing is air, an arrow is a string, a spell is something rising.
  swing: { spread: 0.2, layers: [hiss(700, 2600, 0.14, 0.01, 0.13, { q: 1.6 })] },
  hit: { spread: 0.16, layers: [
    tone('square', 240, 120, 0.22, 0.002, 0.1),
    hiss(2200, 500, 0.18, 0.002, 0.09, { q: 1.1 })
  ] },
  bow: { spread: 0.12, layers: [
    tone('triangle', 820, 220, 0.2, 0.002, 0.12),
    hiss(2400, 900, 0.1, 0.002, 0.06, { q: 2 })
  ] },
  cast: { spread: 0.1, layers: [
    tone('sine', 420, 1180, 0.2, 0.01, 0.3),
    tone('triangle', 630, 1770, 0.08, 0.02, 0.26)
  ] },
  enemydie: { spread: 0.18, layers: [
    tone('sawtooth', 300, 70, 0.22, 0.004, 0.26),
    hiss(1400, 200, 0.16, 0.004, 0.22, { q: 0.8 })
  ] },

  // Things the world does.
  pickup: { spread: 0.1, layers: [tone('triangle', 740, 1180, 0.16, 0.003, 0.11)] },
  coin: { spread: 0.14, layers: [
    tone('triangle', 1480, 1980, 0.12, 0.002, 0.09),
    tone('sine', 2220, 2640, 0.07, 0.002, 0.13)
  ] },
  craft: { spread: 0.06, layers: [
    tone('square', 420, 630, 0.14, 0.004, 0.1),
    tone('square', 630, 840, 0.1, 0.06, 0.14)
  ] },
  door: { spread: 0.1, layers: [
    tone('sawtooth', 160, 110, 0.14, 0.006, 0.2),
    hiss(900, 300, 0.1, 0.004, 0.16, { q: 1.2 })
  ] },
  chest: { spread: 0.08, layers: [
    hiss(1200, 400, 0.14, 0.004, 0.16, { q: 1.4 }),
    tone('triangle', 300, 420, 0.1, 0.01, 0.2)
  ] },
  use: { spread: 0.08, layers: [tone('sine', 560, 900, 0.18, 0.01, 0.24)] },
  // Something permanent has changed about you: a life crystal, a mana crystal.
  upgrade: { spread: 0.02, layers: [
    tone('sine', 520, 1040, 0.2, 0.02, 0.5),
    tone('triangle', 780, 1560, 0.12, 0.08, 0.5),
    tone('sine', 1040, 2080, 0.08, 0.16, 0.5)
  ] },
  star: { spread: 0.2, layers: [
    tone('sine', 2200, 1100, 0.1, 0.01, 0.6),
    tone('triangle', 3300, 1650, 0.05, 0.02, 0.5)
  ] },
  hook: { spread: 0.12, layers: [
    tone('square', 900, 420, 0.14, 0.002, 0.09),
    hiss(3200, 1200, 0.12, 0.002, 0.07, { q: 2.2 })
  ] },
  grab: { spread: 0.08, layers: [
    tone('square', 300, 180, 0.18, 0.002, 0.12),
    hiss(1800, 600, 0.14, 0.002, 0.1, { q: 1.6 })
  ] },
  rail: { spread: 0.1, layers: [
    tone('triangle', 175, 110, 0.12, 0.003, 0.08), hiss(3400, 1200, 0.12, 0.002, 0.07)
  ] },
  switch: { spread: 0.04, layers: [tone('square', 460, 230, 0.09, 0.002, 0.06)] },
  sensor: { spread: 0.02, layers: [
    tone('sine', 740, 1030, 0.12, 0.01, 0.15), tone('triangle', 480, 660, 0.055, 0.025, 0.18)
  ] },
  net: { spread: 0.08, layers: [
    hiss(3800, 1100, 0.14, 0.005, 0.11), tone('sine', 610, 950, 0.09, 0.04, 0.13)
  ] },
  anchor: { spread: 0.02, layers: [
    tone('sine', 310, 950, 0.13, 0.035, 0.32), tone('triangle', 510, 780, 0.09, 0.09, 0.3)
  ] },
  flood: { spread: 0.05, layers: [
    hiss(280, 1600, 0.15, 0.09, 0.38), tone('sine', 100, 58, 0.12, 0.02, 0.32)
  ] },
  // A boss arriving. Long, low, and the only sound in the game that is allowed to be.
  roar: { spread: 0.02, layers: [
    tone('sawtooth', 110, 55, 0.3, 0.06, 1.4),
    tone('square', 82, 41, 0.2, 0.1, 1.2),
    hiss(600, 90, 0.18, 0.05, 1.3, { q: 0.6 })
  ] }
};

// --- ambience ----------------------------------------------------------------------------
// One bed per vertical layer, crossfaded as the player moves between them. Wind above
// ground, a hollow drone in the caves, a low roar in hell. Each is a filtered noise loop
// plus an optional drone tone, which is enough to make depth audible.
const AMBIENCE = {
  space: { cutoff: 240, q: 0.6, gain: 0.05, drone: 70, droneGain: 0.035 },
  sky: { cutoff: 1600, q: 0.5, gain: 0.07, drone: 0, droneGain: 0 },
  surface: { cutoff: 900, q: 0.4, gain: 0.05, drone: 0, droneGain: 0 },
  caves: { cutoff: 420, q: 0.8, gain: 0.06, drone: 96, droneGain: 0.03 },
  deep: { cutoff: 300, q: 1, gain: 0.07, drone: 72, droneGain: 0.04 },
  hell: { cutoff: 220, q: 1.2, gain: 0.1, drone: 48, droneGain: 0.06 },
  hellcaves: { cutoff: 180, q: 1.4, gain: 0.11, drone: 41, droneGain: 0.07 },
  trench: { cutoff: 155, q: 1.15, gain: 0.09, drone: 37, droneGain: 0.055 },
  void: { cutoff: 120, q: 0.8, gain: 0.065, drone: 32, droneGain: 0.065 }
};

// --- music ---------------------------------------------------------------------------------
// A slow generative line over a held chord. Pentatonic, because a pentatonic scale has no
// wrong notes in it, which is exactly what you want from music that will play for hours
// and must never once sound like a mistake.
const SCALES = {
  // minor pentatonic, in semitones from the root
  dark: [0, 3, 5, 7, 10],
  // major pentatonic: daylight
  bright: [0, 2, 4, 7, 9]
};

// Which root and scale a place gets. Depth lowers the root and darkens the scale, so the
// music tells you where you are without a word.
const MOODS = {
  space: { root: 69, scale: 'bright', chord: [0, 7, 12], beat: 2.6 },
  sky: { root: 67, scale: 'bright', chord: [0, 4, 7], beat: 2.2 },
  surface: { root: 62, scale: 'bright', chord: [0, 4, 7], beat: 2.0 },
  night: { root: 57, scale: 'dark', chord: [0, 3, 7], beat: 2.6 },
  caves: { root: 53, scale: 'dark', chord: [0, 3, 7], beat: 2.8 },
  deep: { root: 48, scale: 'dark', chord: [0, 3, 10], beat: 3.2 },
  hell: { root: 43, scale: 'dark', chord: [0, 1, 7], beat: 3.0 },
  hellcaves: { root: 41, scale: 'dark', chord: [0, 1, 6], beat: 3.4 },
  trench: { root: 38, scale: 'dark', chord: [0, 5, 10], beat: 3.6 },
  void: { root: 33, scale: 'dark', chord: [0, 6, 12], beat: 4.1 }
};

function makeScore(id, root, scale, beat, motif, voice, style = 'wander') {
  return { id, root, scale, beat, motif, voice, style, chord: scale === 'dark' ? [0, 3, 7] : [0, 4, 7] };
}

const BIOME_SCORES = Object.fromEntries([
  ['forest', 64, 'bright', 0.62, [0, 2, 4, 2, 1, null, 3, 1], 'triangle'],
  ['plains', 62, 'bright', 0.78, [0, 1, 3, null, 4, 3, 1, null], 'triangle'],
  ['desert', 58, 'dark', 0.54, [0, 3, 2, 1, null, 2, 4, 3], 'square'],
  ['badlands', 55, 'dark', 0.69, [0, 2, 1, 3, 2, null, 4, 0], 'triangle'],
  ['savanna', 65, 'bright', 0.48, [0, 3, 1, 2, null, 4, 2, 1], 'triangle'],
  ['jungle', 60, 'bright', 0.45, [0, 2, null, 3, 1, 4, null, 2], 'triangle'],
  ['marsh', 54, 'dark', 0.91, [0, null, 2, 1, null, 4, 3, 0], 'sine'],
  ['highlands', 67, 'bright', 0.74, [0, 3, 5, 4, 2, null, 3, 1], 'triangle'],
  ['taiga', 63, 'dark', 0.79, [0, 2, 4, null, 3, 1, 0, null], 'sine'],
  ['tundra', 72, 'bright', 1.02, [0, null, 4, 2, null, 3, 1, null], 'sine'],
  ['beach', 66, 'bright', 0.67, [0, 2, 3, null, 4, 2, 1, 3], 'triangle'],
  ['ocean', 59, 'bright', 0.98, [0, null, 3, 4, 2, null, 1, null], 'sine'],
  ['blight', 48, 'dark', 0.73, [0, 1, 4, 2, 1, null, 3, 0], 'triangle'],
  ['crimson', 50, 'dark', 0.58, [0, 4, 1, 3, null, 2, 0, 1], 'square'],
  ['hallow', 74, 'bright', 0.59, [0, 4, 2, 5, 3, 1, null, 4], 'sine']
].map(([key, ...data]) => [key, makeScore('biome:' + key, ...data)]));

const DUNGEON_SCORES = Object.fromEntries([
  ['Ossuary', 53, 'dark', 0.7, [0, 2, null, 1, 4, 3, 1, null], 'triangle'],
  ['Hardmode Ossuary', 50, 'dark', 0.48, [0, 0, 2, 3, 1, 4, 2, 1], 'square'],
  ['Lens Vault', 64, 'bright', 0.55, [0, 4, 1, null, 3, 5, 2, 1], 'sine'],
  ['Ashvault', 42, 'dark', 0.61, [0, 1, 3, 0, 4, null, 2, 1], 'triangle'],
  ['Starfall Foundry', 56, 'dark', 0.44, [0, 2, 2, 4, 1, 3, null, 0], 'square'],
  ['Tidal Archive', 57, 'dark', 0.85, [0, null, 3, 2, 4, null, 1, 2], 'sine'],
  ['Runaway Mine', 52, 'bright', 0.43, [0, 0, 3, 1, 0, 4, 2, 1], 'triangle'],
  ['Astral Siege', 62, 'dark', 0.5, [0, 4, 2, 5, 3, 4, null, 1], 'triangle']
].map(([key, ...data]) => [key, makeScore('dungeon:' + key, ...data, key === 'Tidal Archive' ? 'water-dungeon' : 'dungeon')]));

const AUTHORED_BOSSES = Object.fromEntries([
  ['kingslime', 53, 'bright', 0.42, [0, 2, 0, 3, 1, 4, 2, 1], 'triangle'],
  ['hollloweye', 48, 'dark', 0.39, [0, 0, 4, 2, 1, 3, 4, 1], 'square'],
  ['furnacewarden', 42, 'dark', 0.37, [0, 1, 0, 4, 3, 2, 4, 1], 'sawtooth'],
  ['dungeonkeeper', 47, 'dark', 0.5, [0, 3, null, 2, 1, 0, 4, 2], 'triangle'],
  ['ashguardian', 44, 'dark', 0.45, [0, 0, 1, 4, 3, 0, 2, 3], 'sawtooth'],
  ['voidsovereign', 40, 'dark', 0.43, [0, null, 4, 1, 6, null, 3, 2], 'sine'],
  ['riftarchon', 54, 'dark', 0.36, [0, 5, 1, 4, 0, 6, 2, 3], 'square'],
  ['ossuarymechanist', 45, 'dark', 0.34, [0, 0, 2, 0, 3, 4, 2, 4], 'square'],
  ['foundrywarden', 48, 'dark', 0.35, [0, 1, 0, 3, 0, 4, 2, 1], 'sawtooth'],
  ['glasscolossus', 59, 'bright', 0.42, [0, 4, 2, null, 5, 2, 4, 1], 'triangle'],
  ['coilserpent', 46, 'dark', 0.32, [0, 2, 1, 3, 1, 4, 2, 0], 'square'],
  ['zenithengine', 64, 'bright', 0.31, [0, 3, 5, 4, 2, 5, 6, 3], 'triangle'],
  ['prismsentinel', 62, 'bright', 0.35, [0, 4, 5, 3, 2, 4, 1, 3], 'triangle'],
  ['starwyvern', 57, 'dark', 0.33, [0, 4, 6, 3, 1, 5, 2, 4], 'triangle'],
  ['lenscustodian', 61, 'bright', 0.41, [0, 2, 5, 1, 4, 6, 3, 1], 'sine'],
  ['drownedarchivist', 51, 'dark', 0.52, [0, 3, 1, 4, null, 5, 2, 4], 'sine'],
  ['reefleviathan', 45, 'dark', 0.48, [0, null, 2, 4, 1, 3, 2, null], 'sine'],
  ['abyssaleye', 43, 'dark', 0.62, [0, 4, null, 1, 5, 2, null, 3], 'sine'],
  ['breakwatercrab', 59, 'bright', 0.46, [0, 2, 1, null, 4, 0, 3, 1], 'triangle'],
  ['saltmarrow', 50, 'dark', 0.54, [0, null, 1, 3, 2, null, 4, 1], 'sine'],
  ['reedking', 54, 'dark', 0.45, [0, 1, 4, null, 3, 1, 2, 0], 'triangle'],
  ['mirebrood', 47, 'dark', 0.49, [0, 2, 0, 3, null, 4, 1, 2], 'sine'],
  ['fenwidow', 52, 'dark', 0.58, [0, 1, null, 4, 2, 3, null, 1], 'triangle'],
  ['railbreaker', 46, 'dark', 0.29, [0, 0, 2, 0, 4, 1, 3, 2], 'square'],
  ['astralregent', 55, 'dark', 0.31, [0, 5, 4, 2, 6, 3, 1, 4], 'sawtooth']
].map(([key, ...data]) => [key, makeScore('boss:' + key, ...data,
  /reef|abyssal|breakwater|saltmarrow|drowned|reedking|mirebrood|fenwidow/.test(key) ? 'aquatic-boss' : 'boss')]));

const derivedScores = new Map();
function keyedScore(type, key) {
  const id = type + ':' + key;
  if (derivedScores.has(id)) return derivedScores.get(id);
  let hash = 2166136261;
  for (const letter of id) hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619) >>> 0;
  const combat = type === 'boss';
  const motif = Array.from({ length: 8 }, (_, i) => (hash >>> (i * 4) & 15) % 8);
  const profiles = [
    [/rime|aurora|winter|glacier|frost|barrow/i, 63, 'bright', 0.44, 'sine'],
    [/desert|scarab|sand|ochre|sunmane|amber|caravan/i, 51, 'dark', 0.35, 'triangle'],
    [/root|briar|pinemaw|orchid|forest|spore/i, 54, 'dark', 0.42, 'triangle'],
    [/crag|cairn|clay|granite|kiln|quarry|standard/i, 43, 'dark', 0.39, 'square'],
    [/blood|vein|hollow|blight|crim|marrow/i, 44, 'dark', 0.36, 'sawtooth'],
    [/thunder|windmill|prairie|savanna/i, 58, 'bright', 0.33, 'triangle']
  ];
  const profile = profiles.find(([pattern]) => pattern.test(key));
  const [, root, scale, beat, voice] = profile || [null, combat ? 47 : 53, hash % 3 ? 'dark' : 'bright',
    combat ? 0.34 : 0.61, ['triangle', 'square', 'sine', 'sawtooth'][(hash >>> 9) % 4]];
  const score = makeScore(id, root + hash % 8, scale, beat + (hash >>> 5) % 12 / 100 + (combat ? 0 : 0.12),
    motif, voice, type);
  derivedScores.set(id, score);
  return score;
}

const BLOOD_MOON_SCORE = makeScore('event:bloodmoon', 43, 'dark', 0.38, [0, 3, 0, 2, 4, 1, 3, 2], 'triangle', 'boss');
const NIGHT_BIOME_SCORES = Object.fromEntries(Object.entries(BIOME_SCORES).map(([key, score]) => [
  key, makeScore('night:' + key, score.root - 7, 'dark', score.beat * 1.45, score.motif.slice().reverse(), 'sine')
]));

function scoreFor(layer, night, scene = {}) {
  if (scene.boss) return AUTHORED_BOSSES[scene.boss] || keyedScore('boss', scene.boss);
  if (scene.event === 'bloodmoon') return BLOOD_MOON_SCORE;
  if (scene.dungeon) return DUNGEON_SCORES[scene.dungeon] || keyedScore('dungeon', scene.dungeon);
  if (layer === 'surface' && BIOME_SCORES[scene.biome]) return (night ? NIGHT_BIOME_SCORES : BIOME_SCORES)[scene.biome];
  return moodFor(layer, night);
}

function scoreNoteAt(score, step, roll = 0.5) {
  if (!score.motif) return noteAt(score, step, roll);
  const base = score.motif[step % score.motif.length];
  const phrase = Math.floor(step / score.motif.length) % 4;
  const degree = base === null ? null : base + (phrase === 2 ? 2 : phrase === 3 && step % 4 === 3 ? 1 : 0);
  if (degree === null) return null;
  const scale = SCALES[score.scale];
  return score.root + scale[degree % scale.length] + 12 * Math.floor(degree / scale.length);
}

function midiToHz(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

// The note a given step of the line lands on. Pure, and the test's main lever: a
// generative line that wanders outside its own scale is the way this always goes wrong.
function noteAt(mood, step, roll) {
  const scale = SCALES[mood.scale];
  // A slow contour plus a small random step, so the line moves rather than jumping about.
  const contour = Math.round(Math.sin(step * 0.37) * 2 + Math.sin(step * 0.11) * 2);
  const pick = Math.floor(roll * scale.length);
  // Only ever up, and only on the peaks of the contour. Allowing a drop as well gave the
  // line a span of thirty-four semitones, which is not a melody - it is an alarm.
  const octave = contour > 1 ? 12 : 0;
  return mood.root + scale[pick] + octave;
}

// Which mood a position gets. Separate from playing so it can be checked without audio.
function moodFor(layerKey, night) {
  if (layerKey === 'surface' && night) return MOODS.night;
  return MOODS[layerKey] || MOODS.surface;
}

// --- the player ------------------------------------------------------------------------------
// Everything above is data. This is the only part that needs a browser.

function makeAudio(win) {
  const w = win || (typeof window !== 'undefined' ? window : null);
  const Ctx = w && (w.AudioContext || w.webkitAudioContext);
  const stats = { played: 0, failed: 0, notes: 0 };
  let ctx = null;
  let master = null;
  let ambienceGain = null;
  let musicGain = null;
  let noise = null;
  let current = null;            // the ambience bed now playing
  let enabled = true;
  let volume = 0.7;
  let musicOn = true;
  let nextNote = 0;
  let step = 0;
  let mood = null;
  let trackGain = null;

  function ready() {
    return !!(ctx && enabled && ctx.state === 'running');
  }

  // Built on the first user gesture, because a browser will not start an audio context
  // before one and there is no point building the graph until it will run.
  function unlock() {
    if (!Ctx) return false;
    if (!ctx) {
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = volume;
      // A compressor so a dozen simultaneous sounds do not clip into a crackle.
      const squeeze = ctx.createDynamicsCompressor();
      squeeze.threshold.value = -18;
      squeeze.ratio.value = 6;
      master.connect(squeeze);
      squeeze.connect(ctx.destination);
      ambienceGain = ctx.createGain();
      ambienceGain.gain.value = 0;
      ambienceGain.connect(master);
      musicGain = ctx.createGain();
      musicGain.gain.value = musicOn ? 0.5 : 0;
      musicGain.connect(master);
      noise = makeNoise(ctx);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  // One buffer of white noise, generated once and reused by every hiss in the game.
  function makeNoise(c) {
    const frames = Math.floor(c.sampleRate * SAMPLE_NOISE);
    const buffer = c.createBuffer(1, frames, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function envelope(gain, peak, at, attack, decay) {
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0005, peak), at + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  }

  // Render one layer of a sound. `pitch` scales every frequency in it, which is how the
  // same description makes a big splash and a small one.
  function layer(spec, at, pitch, loud) {
    const gain = ctx.createGain();
    gain.connect(master);
    const peak = spec.gain * loud;
    envelope(gain, peak, at, spec.attack, spec.decay);
    const stop = at + spec.attack + spec.decay + 0.02;
    if (spec.kind === 'tone') {
      const osc = ctx.createOscillator();
      osc.type = spec.type;
      osc.frequency.setValueAtTime(spec.from * pitch, at);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, spec.to * pitch), stop);
      osc.connect(gain);
      osc.start(at);
      osc.stop(stop);
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = spec.q;
    filter.frequency.setValueAtTime(spec.from * pitch, at);
    filter.frequency.exponentialRampToValueAtTime(Math.max(30, spec.to * pitch), stop);
    src.connect(filter);
    filter.connect(gain);
    src.start(at, Math.random() * (SAMPLE_NOISE - 0.3));
    src.stop(stop);
  }

  // Play a named sound. `opts.pitch` shifts it, `opts.gain` scales it, and `opts.at`
  // places it in the world so that distance makes it quieter.
  function play(name, opts) {
    const spec = SOUNDS[name];
    if (!spec) { stats.failed += 1; return false; }
    if (!ready()) return false;
    const o = opts || {};
    let loud = o.gain === undefined ? 1 : o.gain;
    if (o.distance !== undefined) {
      // Nothing is audible past 40 tiles, and the falloff is gentle up close so standing
      // next to something is not deafening.
      loud *= Math.max(0, 1 - o.distance / 40);
      if (loud <= 0.01) return false;
    }
    const jitter = 1 + (Math.random() - 0.5) * 2 * (spec.spread || 0);
    const pitch = (o.pitch || 1) * jitter;
    const at = ctx.currentTime + 0.001;
    for (const l of spec.layers) layer(l, at, pitch, loud);
    stats.played += 1;
    return true;
  }

  // --- ambience ---------------------------------------------------------------------
  function setAmbience(layerKey, scene = {}) {
    if (!ready()) return;
    const base = AMBIENCE[layerKey] || AMBIENCE.surface;
    const underwater = scene.submerged || scene.dungeon === 'Tidal Archive';
    const biome = layerKey === 'surface' ? scene.biome : null;
    const key = [layerKey, biome, underwater, Boolean(scene.rain)].join(':');
    if (current && current.key === key) return;
    const cutoff = { forest: 1380, jungle: 1700, desert: 760, marsh: 470, ocean: 510, beach: 690, tundra: 1100 };
    const want = underwater ? { ...base, cutoff: 250, q: 0.85, drone: 61, droneGain: 0.03 }
      : biome ? { ...base, cutoff: scene.rain ? 2100 : cutoff[biome] || base.cutoff,
        gain: scene.rain ? 0.072 : base.gain } : base;
    const now = ctx.currentTime;
    if (current) {
      current.gain.gain.cancelScheduledValues(now);
      current.gain.gain.setValueAtTime(current.gain.gain.value, now);
      current.gain.gain.linearRampToValueAtTime(0.0001, now + 1.6);
      const dying = current;
      setTimeout(() => {
        try { dying.src.stop(); dying.drone && dying.drone.stop(); } catch (e) { /* already stopped */ }
      }, 2200);
    }
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(want.gain, now + 1.6);
    gain.connect(ambienceGain);
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = want.cutoff;
    filter.Q.value = want.q;
    src.connect(filter);
    filter.connect(gain);
    src.start(now);
    let drone = null;
    if (want.drone) {
      drone = ctx.createOscillator();
      drone.type = 'sine';
      drone.frequency.value = want.drone;
      const dg = ctx.createGain();
      dg.gain.value = want.droneGain;
      drone.connect(dg);
      dg.connect(gain);
      drone.start(now);
    }
    ambienceGain.gain.setTargetAtTime(1, now, 0.4);
    current = { key, gain, src, drone };
  }

  // --- music ---------------------------------------------------------------------------
  // Scheduled one note at a time from the game loop rather than from a timer, so it
  // stops when the game stops and never runs on in a background tab.
  function musicVoice(type, note, peak, at, attack, duration) {
    const gain = ctx.createGain();
    gain.connect(trackGain);
    envelope(gain, peak, at, attack, duration);
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = midiToHz(note);
    osc.connect(gain);
    osc.start(at);
    osc.stop(at + attack + duration + 0.04);
  }

  function stepMusic(dt, layerKey, night, scene) {
    if (!ready() || !musicOn) return;
    const score = scoreFor(layerKey, night, scene);
    if (score !== mood) {
      const now = ctx.currentTime;
      if (trackGain) {
        const old = trackGain;
        old.gain.cancelScheduledValues(now);
        old.gain.setValueAtTime(old.gain.value, now);
        old.gain.linearRampToValueAtTime(0, now + 0.65);
        setTimeout(() => old.disconnect(), 850);
      }
      trackGain = ctx.createGain();
      trackGain.gain.setValueAtTime(0.08, now);
      trackGain.gain.linearRampToValueAtTime(1, now + 0.35);
      trackGain.connect(musicGain);
      mood = score;
      nextNote = 0;
      step = 0;
    }
    nextNote -= dt;
    if (nextNote > 0) return;
    const beat = mood.beat;
    nextNote = mood.motif ? beat : beat * (0.75 + Math.random() * 0.5);
    const at = ctx.currentTime + 0.02;
    const note = scoreNoteAt(mood, step, Math.random());
    const aquatic = mood.style === 'aquatic-boss' || mood.style === 'water-dungeon';
    const urgent = mood.style === 'boss' || mood.style === 'aquatic-boss';
    const bar = Math.floor(step / 8) % 4;
    const harmony = mood.motif ? (mood.scale === 'dark' ? [0, 8, 3, 10] : [0, 9, 5, 7])[bar] : 0;
    const third = mood.motif ? (mood.scale === 'dark' ? [3, 4, 4, 4] : [4, 3, 4, 4])[bar] : mood.chord[1];
    const brightVoice = mood.voice === 'sawtooth' || mood.voice === 'square';
    if (note !== null) musicVoice(mood.voice || 'triangle', note,
      brightVoice ? 0.052 : 0.09, at, urgent ? 0.015 : 0.075, beat * 0.78);
    if (aquatic && note !== null && step % 2 === 0) {
      musicVoice('sine', note - 12, 0.045, at + beat * 0.48, 0.09, beat * 1.6);
      musicVoice('sine', note, 0.021, at + beat * 0.83, 0.04, beat * 1.2);
    }
    if (urgent && !aquatic) {
      if (step % 4 === 0) musicVoice('sine', 32, 0.19, at, 0.007, 0.12);
      if (step % 4 === 2) musicVoice('triangle', 77, 0.045, at, 0.006, 0.075);
      if (step % 2 === 1) musicVoice('square', 100, 0.013, at, 0.004, 0.035);
    }
    if (mood.motif && step % 2 === 0) {
      const bass = step % 4 === 0 ? 0 : 7;
      musicVoice(urgent && !aquatic ? 'triangle' : 'sine', mood.root - (urgent ? 24 : 12) + harmony + bass,
        aquatic ? 0.083 : urgent ? 0.13 : 0.045, at, aquatic ? 0.095 : 0.018, beat * (aquatic ? 1.4 : urgent ? 0.45 : 1.1));
    }
    if (step % 4 === 0) {
      const chord = mood.motif ? [0, third, 7] : mood.chord;
      for (const interval of chord) musicVoice('sine', mood.root - 12 + harmony + interval,
        urgent ? 0.023 : 0.032, at, aquatic ? 0.38 : mood.motif ? 0.14 : 0.9, beat * 3.2);
    }
    step += 1;
    stats.notes += 1;
  }

  function setEnabled(on) {
    enabled = !!on;
    if (master) master.gain.value = enabled ? volume : 0;
    return enabled;
  }

  function setMusic(on) {
    musicOn = !!on;
    if (musicGain) musicGain.gain.value = musicOn ? 0.5 : 0;
    return musicOn;
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (master && enabled) master.gain.value = volume;
    return volume;
  }

  return { unlock, play, setAmbience, stepMusic, setEnabled, setMusic, setVolume, stats,
    get enabled() { return enabled; },
    get musicOn() { return musicOn; },
    get running() { return ready(); } };
}

const EXPORTS_audio = { SOUNDS, AMBIENCE, SCALES, MOODS, BIOME_SCORES, DUNGEON_SCORES, noteAt, moodFor, scoreFor, scoreNoteAt, midiToHz,
  makeAudio, tone, hiss };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_audio;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.audio = EXPORTS_audio;
}
