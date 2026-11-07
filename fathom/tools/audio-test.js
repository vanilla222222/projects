'use strict';
// Sound. There is no audio in Node, so what is tested here is everything about a sound
// that is not a waveform: that every name the game asks for exists, that no sound is
// silent or deafening or ten seconds long, that the ambience covers every place the
// player can be, and that the music only ever picks notes inside its own scale.
//
// That last one is the check worth having. A generative line that wanders out of its own
// scale is exactly how this always goes wrong, and it is the one thing you cannot hear
// in a five-second test by ear.

const audio = require('../js/audio.js');
const worldgen = require('../js/worldgen.js');

let checks = 0;
let failures = 0;
function ok(cond, label) {
  checks += 1;
  if (!cond) { failures += 1; console.log('FAIL: ' + label); }
}

// --- 1. every sound is a sound ------------------------------------------------------
const names = Object.keys(audio.SOUNDS);
ok(names.length >= 20, 'only ' + names.length + ' sounds in the whole game');
let longest = 0;
for (const name of names) {
  const spec = audio.SOUNDS[name];
  ok(Array.isArray(spec.layers) && spec.layers.length > 0, name + ' has no layers');
  ok(spec.spread >= 0 && spec.spread < 0.5,
    name + ' is jittered by ' + spec.spread + ', which is a different sound each time');
  let peak = 0;
  let span = 0;
  for (const l of spec.layers) {
    ok(l.kind === 'tone' || l.kind === 'hiss', name + ' has a layer of unknown kind ' + l.kind);
    ok(l.gain > 0.001, name + ' has a layer at gain ' + l.gain + ', which is silence');
    ok(l.attack > 0 && l.decay > 0, name + ' has a layer with no envelope');
    // Everything is swept between two frequencies, and both have to be audible. A zero
    // would make the exponential ramp in the player throw.
    ok(l.from > 20 && l.from < 20000, name + ' sweeps from ' + l.from + 'Hz');
    ok(l.to > 20 && l.to < 20000, name + ' sweeps to ' + l.to + 'Hz');
    if (l.kind === 'tone') {
      ok(['sine', 'square', 'sawtooth', 'triangle'].includes(l.type),
        name + ' uses the unknown oscillator ' + l.type);
    } else {
      ok(l.q > 0, name + ' has a filter with no Q');
    }
    peak += l.gain;
    span = Math.max(span, l.attack + l.decay);
  }
  // Layers add, so a sound whose layers sum past 1 clips before the compressor sees it.
  ok(peak <= 1, name + ' peaks at ' + peak.toFixed(2) + ', which clips');
  // And nothing but the boss and death is allowed to be long: a two-second pickaxe
  // would still be playing when the next swing lands.
  const limit = (name === 'roar' || name === 'death' || name === 'upgrade') ? 2 : 0.7;
  ok(span <= limit, name + ' lasts ' + span.toFixed(2) + 's, past its limit of ' + limit);
  longest = Math.max(longest, span);
}

// --- 2. every sound the game asks for exists ------------------------------------------
// Read out of game.js rather than listed here, because a list here would go stale the
// first time a sound was renamed - which is the failure this whole project keeps hitting.
{
  const fs = require('node:fs');
  const source = fs.readFileSync(__dirname + '/../js/game.js', 'utf8');
  const asked = new Set();
  const re = /\bsfx(?:At)?\(\s*'([a-z-]+)'/g;
  let m = re.exec(source);
  while (m) { asked.add(m[1]); m = re.exec(source); }
  ok(asked.size >= 14, 'game.js only plays ' + asked.size + ' different sounds');
  for (const name of asked) {
    ok(!!audio.SOUNDS[name], 'game.js plays "' + name + '", which does not exist');
  }
  // And the digSound helper can only ever name real sounds.
  for (const key of ['dig-soil', 'dig-stone', 'dig-wood']) {
    ok(!!audio.SOUNDS[key], 'the dig sound ' + key + ' does not exist');
  }
}

// --- 3. ambience covers everywhere the player can be ------------------------------------
for (const layer of worldgen.LAYERS) {
  const bed = audio.AMBIENCE[layer.key];
  ok(!!bed, 'the layer ' + layer.key + ' has no ambience');
  if (!bed) continue;
  ok(bed.gain > 0 && bed.gain < 0.3,
    layer.key + ' ambience is at ' + bed.gain + ', which is silence or a wall of noise');
  ok(bed.cutoff > 40 && bed.cutoff < 20000, layer.key + ' ambience filters at ' + bed.cutoff);
  ok(bed.drone === 0 || bed.drone > 20, layer.key + ' drones at ' + bed.drone + 'Hz');
}
// Depth should sound deeper: the filter closes as you go down.
ok(audio.AMBIENCE.hell.cutoff < audio.AMBIENCE.caves.cutoff,
  'hell is brighter than the caves above it');
ok(audio.AMBIENCE.caves.cutoff < audio.AMBIENCE.sky.cutoff,
  'the caves are brighter than the sky');

// --- 4. the music stays in its own scale -------------------------------------------------
{
  for (const [key, mood] of Object.entries(audio.MOODS)) {
    const scale = audio.SCALES[mood.scale];
    ok(!!scale, 'the mood ' + key + ' names the unknown scale ' + mood.scale);
    ok(mood.beat > 0.5 && mood.beat < 8, 'the mood ' + key + ' beats every ' + mood.beat + 's');
    ok(mood.root > 20 && mood.root < 100, 'the mood ' + key + ' is rooted at midi ' + mood.root);
    ok(Array.isArray(mood.chord) && mood.chord.length >= 2,
      'the mood ' + key + ' has no chord under it');

    // Every note the line can produce, over a long run and across the whole range of
    // the roll, has to be a degree of this scale in some octave.
    const degrees = new Set(scale);
    let low = 999;
    let high = 0;
    for (let step = 0; step < 600; step += 1) {
      for (const roll of [0, 0.2, 0.45, 0.7, 0.99]) {
        const note = audio.noteAt(mood, step, roll);
        const rel = ((note - mood.root) % 12 + 12) % 12;
        ok(degrees.has(rel), 'the ' + key + ' line played ' + note
          + ', which is ' + rel + ' semitones off its root and not in its scale');
        low = Math.min(low, note);
        high = Math.max(high, note);
      }
    }
    // And it has to stay in a sane register: a line that wanders five octaves is not a
    // melody, it is an alarm.
    ok(high - low <= 26, 'the ' + key + ' line spans ' + (high - low) + ' semitones');
    ok(high - low >= 7, 'the ' + key + ' line spans only ' + (high - low) + ' semitones');
    ok(audio.midiToHz(low) > 30 && audio.midiToHz(high) < 4000,
      'the ' + key + ' line runs from ' + audio.midiToHz(low).toFixed(0) + 'Hz to '
      + audio.midiToHz(high).toFixed(0) + 'Hz');
  }

  // Underground is lower and darker than the surface, which is how the music tells you
  // where you are without a word.
  ok(audio.MOODS.hell.root < audio.MOODS.caves.root, 'hell is pitched above the caves');
  ok(audio.MOODS.caves.root < audio.MOODS.surface.root, 'the caves are pitched above the surface');
  ok(audio.MOODS.caves.scale === 'dark' && audio.MOODS.surface.scale === 'bright',
    'the caves and the surface share a mood');

  // moodFor is the only place that decides, and night on the surface is its own mood.
  ok(audio.moodFor('surface', false) === audio.MOODS.surface, 'daylight is not the surface mood');
  ok(audio.moodFor('surface', true) === audio.MOODS.night, 'night on the surface is not night');
  ok(audio.moodFor('caves', true) === audio.MOODS.caves, 'night changed the mood underground');
  ok(audio.moodFor('nowhere', false) === audio.MOODS.surface,
    'an unknown place has no mood to fall back on');
}

// --- 5. the player degrades rather than throwing ------------------------------------------
// There is no AudioContext here, which is the same situation as a browser that has not
// seen a gesture yet. Nothing may throw and nothing may claim to have played.
{
  const player = audio.makeAudio({});
  ok(player.unlock() === false, 'the audio player claimed to start without an AudioContext');
  ok(player.play('step') === false, 'a sound played with no audio context');
  ok(player.play('nosuchsound') === false, 'an unknown sound reported success');
  ok(player.stats.failed === 1, 'an unknown sound was not counted as a failure');
  ok(player.stats.played === 0, 'something was counted as played with no context');
  player.setAmbience('caves');
  player.stepMusic(10, 'caves', false);
  ok(player.stats.notes === 0, 'music played with no audio context');
  ok(player.running === false, 'the player thinks it is running');
  ok(player.setEnabled(false) === false && player.setEnabled(true) === true,
    'the mute toggle does not toggle');
  ok(player.setMusic(false) === false && player.setMusic(true) === true,
    'the music toggle does not toggle');
  ok(player.setVolume(2) === 1 && player.setVolume(-1) === 0, 'volume is not clamped');
}

console.log('\n' + names.length + ' sounds, longest ' + longest.toFixed(2) + 's; '
  + Object.keys(audio.AMBIENCE).length + ' ambience beds, '
  + Object.keys(audio.MOODS).length + ' musical moods');
console.log(checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
