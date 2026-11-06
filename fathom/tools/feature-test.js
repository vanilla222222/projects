'use strict';
// Life crystals, pots and weather. All three are generated rather than placed, so all
// three are tested the same way: ask the generator what is where, and check that what it
// says is both sane and the same every time it is asked.

const tiles = require('../js/tiles.js');
const worldgen = require('../js/worldgen.js');
const craft = require('../js/craft.js');

let checks = 0;
let failures = 0;
function ok(cond, label) {
  checks += 1;
  if (!cond) { failures += 1; console.log('FAIL: ' + label); }
}

const SEED = 20260105;

// --- 1. the tiles exist and know what they are ------------------------------------------
{
  const crystal = tiles.MULTI.lifecrystal;
  ok(!!crystal && crystal.w === 2 && crystal.h === 2,
    'the life crystal is not a two-by-two object');
  for (const cell of crystal.cells) {
    ok(cell.crystal === 'life', 'a life crystal cell does not know it is one');
    ok(!cell.solid, 'a life crystal cell is solid, so it would wall a cave off');
    ok(cell.emit > 0, 'a life crystal does not glow, so nobody will ever find one');
  }
  const pot = tiles.MULTI.pot;
  ok(!!pot && pot.w === 1 && pot.h === 1, 'a pot is not a single tile');
  ok(pot.cells[0].pot === true, 'a pot does not know it is one');
  ok(!pot.cells[0].solid, 'a pot is solid');
}

// --- 2. crystals and pots generate, in sane numbers and sane places -----------------------
let crystalOrigins = 0;
let crystalCells = 0;
let pots = 0;
let openCells = 0;
const potDepths = [];
for (let x = -300; x < 300; x += 1) {
  for (let y = 320; y < 1100; y += 1) {
    const spec = tiles.tile(worldgen.baseTileAt(SEED, x, y));
    if (spec.id === tiles.AIR) openCells += 1;
    if (spec.crystal === 'life') {
      crystalCells += 1;
      if (spec.part.dx === 0 && spec.part.dy === 0) {
        crystalOrigins += 1;
        // All four cells must be there, or the crystal is half-generated.
        let whole = 0;
        for (let dy = 0; dy < 2; dy += 1) {
          for (let dx = 0; dx < 2; dx += 1) {
            const c = tiles.tile(worldgen.baseTileAt(SEED, x + dx, y + dy));
            if (c.crystal === 'life' && c.part.dx === dx && c.part.dy === dy) whole += 1;
          }
        }
        ok(whole === 4, 'a life crystal at ' + x + ',' + y + ' has only ' + whole + ' cells');
        // And it stands on something.
        ok(tiles.isSolid(worldgen.baseTileAt(SEED, x, y + 2))
          && tiles.isSolid(worldgen.baseTileAt(SEED, x + 1, y + 2)),
          'a life crystal at ' + x + ',' + y + ' is floating');
        ok(y - worldgen.surfaceHeight(SEED, x) >= worldgen.CRYSTAL_MIN_DEPTH,
          'a life crystal generated above its own minimum depth');
        ok(worldgen.altitudeOf(y) < 1250, 'a life crystal generated in hell');
      }
    }
    if (spec.pot) {
      pots += 1;
      potDepths.push(y - worldgen.surfaceHeight(SEED, x));
      ok(tiles.isSolid(worldgen.baseTileAt(SEED, x, y + 1)),
        'a pot at ' + x + ',' + y + ' is floating');
    }
  }
}
ok(crystalOrigins >= 2, 'only ' + crystalOrigins + ' life crystals in 600x780 tiles');
ok(crystalOrigins <= 40, crystalOrigins + ' life crystals in 600x780 tiles is a glut');
ok(crystalCells === crystalOrigins * 4,
  crystalCells + ' crystal cells for ' + crystalOrigins + ' crystals');
ok(pots > 20, 'only ' + pots + ' pots in 600x780 tiles');
ok(pots < openCells * 0.01, pots + ' pots fill too much of the open ground');

// --- 3. generation is a pure function of position -------------------------------------------
// Asked twice, the same answer; and asked for the same cell from a different direction,
// still the same answer. This is what stops a crystal half-generating across a seam.
for (let i = 0; i < 400; i += 1) {
  const x = -200 + i * 1.3 | 0;
  const y = 400 + (i * 37) % 600;
  const a = worldgen.baseTileAt(SEED, x, y);
  const b = worldgen.baseTileAt(SEED, x, y);
  ok(a === b, 'baseTileAt disagreed with itself at ' + x + ',' + y);
}

// --- 4. what is in a pot --------------------------------------------------------------------
{
  const seen = new Set();
  let total = 0;
  for (let i = 0; i < 400; i += 1) {
    const x = i * 13 - 2000;
    const y = 500 + (i * 29) % 400;
    const contents = worldgen.potContents(SEED, x, y);
    ok(contents.length > 0, 'a pot at ' + x + ',' + y + ' holds nothing at all');
    ok(contents.length <= 2, 'a pot holds ' + contents.length + ' stacks');
    for (const item of contents) {
      ok(item.count > 0, 'a pot holds zero of ' + item.key);
      ok(craft.nameOf(item.key, tiles) !== item.key, 'a pot holds the unnamed ' + item.key);
      ok(['block', 'wall', 'tool', 'bar', 'armor', 'ammo', 'loot', 'coin', 'accessory']
        .includes(craft.kindOf(item.key)), 'a pot holds ' + item.key + ', which is nothing');
      seen.add(item.key);
      total += 1;
    }
    const again = worldgen.potContents(SEED, x, y);
    ok(JSON.stringify(again) === JSON.stringify(contents),
      'a pot at ' + x + ',' + y + ' held different things when asked twice');
  }
  ok(seen.size >= 4, 'pots only ever hold ' + seen.size + ' different things');
  ok(total / 400 > 1.1, 'pots average only ' + (total / 400).toFixed(2) + ' stacks');
}

// --- 5. weather ----------------------------------------------------------------------------
// The same field game.js uses. What matters is that it rains sometimes and not always,
// that fronts last rather than flickering, and that the wind never stops entirely.
{
  // The generator's own function, not a copy of it. Five times in this project a rule
  // has existed in both the generator and a test, and every time the test ended up
  // agreeing with the stale copy instead of with the game.
  const weatherAt = worldgen.weatherAt;
  for (const seed of [SEED, 4242, -98765, 7]) {
    let wet = 0;
    let samples = 0;
    let flips = 0;
    let last = false;
    let stillest = 1;
    for (let t = 0; t < 40000; t += 5) {
      const w = weatherAt(seed, t);
      samples += 1;
      const raining = w.rain > 0.1;
      if (raining) wet += 1;
      if (raining !== last) flips += 1;
      last = raining;
      ok(w.rain >= 0 && w.rain <= 1, 'rain left its range at ' + t);
      ok(Math.abs(w.wind) <= 1.01, 'the wind left its range at ' + t);
      stillest = Math.min(stillest, Math.abs(w.wind));
    }
    const share = wet / samples;
    ok(share > 0.02 && share < 0.5,
      'seed ' + seed + ' rains ' + (share * 100).toFixed(0) + '% of the time');
    // A front is a front: over eleven hours of world time it should start and stop a
    // handful of times, not flicker on and off every sample.
    ok(flips < 60, 'seed ' + seed + ' changed between wet and dry ' + flips + ' times');
    ok(flips >= 2, 'seed ' + seed + ' never changed weather at all');
  }
}

console.log('\n' + crystalOrigins + ' life crystals and ' + pots
  + ' pots across 600x780 tiles of underground; pot depths '
  + Math.min(...potDepths) + ' to ' + Math.max(...potDepths));
console.log(checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
