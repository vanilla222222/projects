'use strict';
// Mining power invariants. The point of the model is that progression is a gate, not a
// grind: below the requirement a pickaxe does literally nothing, and above it every tier
// is strictly faster. Both claims are checked here rather than assumed.

const m = require('../js/mining.js');
const tiles = require('../js/tiles.js');

let checks = 0;
let failures = 0;
function ok(cond, label) {
  checks += 1;
  if (!cond) { failures += 1; console.log('FAIL: ' + label); }
}

const TIERS = Object.keys(m.TOOLS).sort((a, b) => m.TOOLS[a].power - m.TOOLS[b].power);

// --- the gate -------------------------------------------------------------------------
for (const spec of tiles.TILES) {
  if (spec.id === tiles.AIR) continue;
  const need = m.requirementOf(spec);
  if (!need) continue;
  for (const key of TIERS) {
    const item = { key, kind: 'tool' };
    const power = m.powerOf(item);
    const per = m.damagePerHit(power, spec);
    if (power < need) {
      ok(per === 0, 'power ' + power + ' should do nothing to ' + spec.key);
      ok(!Number.isFinite(m.hitsFor(power, spec)), spec.key + ' unreachable below its requirement');
      ok(!m.canMine(power, spec), 'canMine false below requirement for ' + spec.key);
    } else {
      ok(per > 0, 'power ' + power + ' should bite ' + spec.key);
      ok(Number.isFinite(m.secondsFor(item, spec)), spec.key + ' finite at or above requirement');
    }
  }
  // The named tier really is the cheapest one that works.
  const named = m.requirementName(spec);
  const match = Object.entries(m.TOOLS).find(([, t]) => t.name === named);
  ok(!!match, 'requirementName resolves to a real tool for ' + spec.key);
  if (match) {
    ok(m.damagePerHit(match[1].power, spec) > 0, named + ' can actually mine ' + spec.key);
    const cheaper = Object.values(m.TOOLS)
      .filter(t => t.power < match[1].power)
      .every(t => m.damagePerHit(t.power, spec) === 0);
    ok(cheaper, 'nothing cheaper than ' + named + ' mines ' + spec.key);
  }
}

// --- monotonic progression ------------------------------------------------------------
for (const spec of tiles.TILES) {
  if (spec.id === tiles.AIR) continue;
  let prev = Infinity;
  for (const key of TIERS) {
    const t = m.secondsFor({ key, kind: 'tool' }, spec);
    if (!Number.isFinite(t)) continue;
    ok(t <= prev + 1e-9, key + ' is not slower than the tier below on ' + spec.key);
    prev = t;
  }
  // Every tile is reachable by the top pickaxe: no dead ends in the world.
  const top = TIERS[TIERS.length - 1];
  ok(Number.isFinite(m.secondsFor({ key: top, kind: 'tool' }, spec)),
    'the best pickaxe can mine ' + spec.key);
}

// --- soft ground and scenery ----------------------------------------------------------
for (const key of m.SOFT) {
  const spec = tiles.BY_KEY[key];
  if (!spec) continue;
  ok(m.damagePerHit(50, spec) === 100, key + ' takes doubled power');
}
for (const key of m.INSTANT) {
  const spec = tiles.BY_KEY[key];
  if (!spec) continue;
  ok(m.hitsFor(1, spec) === 1, key + ' comes away in one swing');
  ok(m.canMine(0, spec), key + ' is never gated');
}

// --- nothing in hand ------------------------------------------------------------------
ok(m.powerOf(null) === 0, 'no tool means no power');
ok(!m.isTool(null) && !m.isTool({ key: 'dirt', kind: 'block' }), 'a block is not a tool');
ok(m.isTool({ key: 'wood-pick', kind: 'tool' }), 'a pickaxe is a tool');
ok(m.hitsFor(0, tiles.BY_KEY.stone) === Infinity, 'bare hands never break stone');

// --- the shape of the curve, reported so the numbers are reviewable -------------------
const sample = ['dirt', 'stone', 'copper', 'iron', 'basalt', 'slate', 'cobalt', 'emberite'];
const width = 24;
console.log('\nseconds to break (— = cannot mine):');
console.log('  ' + 'tool'.padEnd(width) + sample.map(k => k.padStart(10)).join(''));
for (const key of TIERS) {
  const row = sample.map(k => {
    const t = m.secondsFor({ key, kind: 'tool' }, tiles.BY_KEY[k]);
    return (Number.isFinite(t) ? t.toFixed(2) : '—').padStart(10);
  }).join('');
  console.log('  ' + (m.TOOLS[key].name + ' (' + m.TOOLS[key].power + ')').padEnd(width) + row);
}

console.log('\n' + checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
