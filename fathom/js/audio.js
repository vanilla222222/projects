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
  hellcaves: { cutoff: 180, q: 1.4, gain: 0.11, drone: 41, droneGain: 0.07 }
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
  hellcaves: { root: 41, scale: 'dark', chord: [0, 1, 6], beat: 3.4 }
};

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
  let mood = MOODS.surface;

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
  function setAmbience(layerKey) {
    if (!ready()) return;
    const want = AMBIENCE[layerKey] || AMBIENCE.surface;
    if (current && current.key === layerKey) return;
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
    current = { key: layerKey, gain, src, drone };
  }

  // --- music ---------------------------------------------------------------------------
  // Scheduled one note at a time from the game loop rather than from a timer, so it
  // stops when the game stops and never runs on in a background tab.
  function stepMusic(dt, layerKey, night) {
    if (!ready() || !musicOn) return;
    mood = moodFor(layerKey, night);
    nextNote -= dt;
    if (nextNote > 0) return;
    nextNote = mood.beat * (0.75 + Math.random() * 0.5);
    const at = ctx.currentTime + 0.02;
    const note = noteAt(mood, step, Math.random());
    step += 1;
    // The line.
    const gain = ctx.createGain();
    gain.connect(musicGain);
    envelope(gain, 0.09, at, 0.08, mood.beat * 0.8);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = midiToHz(note);
    osc.connect(gain);
    osc.start(at);
    osc.stop(at + mood.beat + 0.2);
    // And a held chord under it, every fourth note, so the line has somewhere to sit.
    if (step % 4 === 1) {
      for (const interval of mood.chord) {
        const pad = ctx.createGain();
        pad.connect(musicGain);
        envelope(pad, 0.035, at, 0.9, mood.beat * 3.4);
        const po = ctx.createOscillator();
        po.type = 'sine';
        po.frequency.value = midiToHz(mood.root - 12 + interval);
        po.connect(pad);
        po.start(at);
        po.stop(at + mood.beat * 4.6);
      }
    }
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

const EXPORTS_audio = { SOUNDS, AMBIENCE, SCALES, MOODS, noteAt, moodFor, midiToHz,
  makeAudio, tone, hiss };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_audio;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.audio = EXPORTS_audio;
}
