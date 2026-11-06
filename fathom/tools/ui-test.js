'use strict';
// What the interface promises against what the game does. There is no DOM in Node, so
// what can be checked here is the part that is text and data rather than pixels - and
// that part is where the interface goes wrong, because it is the part that silently
// stops being true when the game changes underneath it.
//
// The controls list is the case in point. Three keys were added - the grappling hook,
// the sound toggle, the music toggle - and for a while there was no way for any player
// to find out that they existed. A list written by hand goes stale the same way, so it
// is checked against the keys game.js really listens for.

const fs = require('node:fs');

let checks = 0;
let failures = 0;
function ok(cond, label) {
  checks += 1;
  if (!cond) { failures += 1; console.log('FAIL: ' + label); }
}

const source = fs.readFileSync(__dirname + '/../js/game.js', 'utf8');

// --- the controls list ------------------------------------------------------------------
// Pulled out of the source rather than imported, because makeGame needs a document.
function controlsFromSource() {
  const start = source.indexOf('const CONTROLS = [');
  const end = source.indexOf('];', start);
  const body = source.slice(start, end);
  const out = [];
  const re = /\['([^']*)',\s*'([^']*)'\]/g;
  // The source writes non-ASCII as escapes; what the player sees is the character.
  const real = (t) => t.replace(/\\u([0-9a-fA-F]{4})/g,
    (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  let m = re.exec(body);
  while (m) { out.push([real(m[1]), real(m[2])]); m = re.exec(body); }
  return out;
}

const CONTROLS = controlsFromSource();
ok(CONTROLS.length >= 10, 'only ' + CONTROLS.length + ' controls are listed');

for (const [key, what] of CONTROLS) {
  ok(key.length > 0 && key.length <= 14, 'the key label "' + key + '" is ' + key.length
    + ' characters, which will not fit');
  ok(what.length > 0 && what.length <= 40, '"' + what + '" is ' + what.length
    + ' characters, which will wrap badly');
  ok(what[0] === what[0].toUpperCase(), '"' + what + '" does not start with a capital');
}
{
  const seen = new Set();
  for (const [key] of CONTROLS) {
    ok(!seen.has(key), 'the key ' + key + ' is listed twice');
    seen.add(key);
  }
}

// --- every key the game listens for is listed ----------------------------------------------
// The single-letter keys handled in the keydown listener, read straight out of the
// source. A key the game responds to and does not mention is a feature nobody can find.
{
  // Two places listen for keys: the explicit `ev.code === 'KeyX'` branches, and the
  // keymap that binds movement. Both count as the game responding to a key.
  const handled = new Set();
  const re = /ev\.code === '(Key[A-Z])'/g;
  let m = re.exec(source);
  while (m) { handled.add(m[1].slice(3)); m = re.exec(source); }
  const mapStart = source.indexOf('const keymap = {');
  const mapBody = source.slice(mapStart, source.indexOf('};', mapStart));
  const mre = /(Key[A-Z]):/g;
  let k = mre.exec(mapBody);
  while (k) { handled.add(k[1].slice(3)); k = mre.exec(mapBody); }
  ok(handled.size >= 6, 'only ' + handled.size + ' letter keys are handled at all');

  // Keys that are deliberately not advertised: alternates for something already listed,
  // and the two that only close a screen that is already open.
  const QUIET = new Set(['I', 'T']);
  const listed = new Set();
  for (const [key] of CONTROLS) {
    for (const part of key.split(/[\s–/]+/)) {
      if (/^[A-Z]$/.test(part)) listed.add(part);
    }
  }
  for (const key of handled) {
    if (QUIET.has(key)) continue;
    ok(listed.has(key), 'the game responds to ' + key + ' and the controls never say so');
  }
  // And nothing is advertised that the game ignores.
  for (const key of listed) {
    ok(handled.has(key), 'the controls promise ' + key + ', which the game does not handle');
  }
}

// --- the movement keys really are the movement keys -------------------------------------------
{
  const start = source.indexOf('const keymap = {');
  const end = source.indexOf('};', start);
  const body = source.slice(start, end);
  for (const [code, label] of [['KeyA', 'left'], ['KeyD', 'right'], ['KeyW', 'jump'],
    ['KeyS', 'down'], ['Space', 'jump'], ['ArrowLeft', 'left'], ['ArrowRight', 'right'],
    ['ArrowUp', 'jump'], ['ArrowDown', 'down']]) {
    ok(body.includes(code + ": '" + label + "'"),
      code + ' is not bound to ' + label);
  }
}

// --- what the gear panel can say ------------------------------------------------------------
// Every effect equipEffects can produce must be something the panel reports, or wearing
// a thing changes a number the player can never see. This is the check that would have
// caught the three damage classes going unreported for a whole session's work.
{
  const craft = require('../js/craft.js');
  const ui = fs.readFileSync(__dirname + '/../js/ui.js', 'utf8');
  const panel = ui.slice(ui.indexOf('function paintGear'), ui.indexOf('function paintShop'));
  const effects = craft.equipEffects([], []);
  // `bonus` is reported as its own line and is not a number.
  const SKIP = new Set(['bonus']);
  for (const key of Object.keys(effects)) {
    if (SKIP.has(key)) continue;
    ok(panel.includes('gear.' + key),
      'equipEffects produces ' + key + ' and the gear panel never mentions it');
  }
  ok(panel.includes('gear.bonus'), 'the gear panel never mentions the set bonus');
}

console.log('\n' + CONTROLS.length + ' controls listed: '
  + CONTROLS.map(([k]) => k).join(', '));
console.log(checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
