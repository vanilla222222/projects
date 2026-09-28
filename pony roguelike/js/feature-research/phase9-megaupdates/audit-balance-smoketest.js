'use strict';
/* Smoke test (not exhaustive) — loads the real script chain through
   js/systems/items-2.js in index.html's actual order via vm, then calls
   recalcPlayerStats for a handful of class/item/trinket combos and confirms
   it runs without throwing, both pre- and post-fix (run this file against
   whichever working tree state is currently checked out; the audit records
   one run from before the downyfeather edit and one after). */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = '/home/vanilla/Downloads/adele2';

const SCRIPTS = [
  'js/core/theme.js', 'js/core/utils-1.js', 'js/core/utils-2.js', 'js/core/audio.js',
  'js/data/core.js', 'js/data/items-1.js', 'js/data/items-2.js', 'js/data/items-3.js',
  'js/data/items-4.js', 'js/data/items-5.js', 'js/data/trinkets-1.js', 'js/data/trinkets-2.js',
  'js/data/familiars-1.js', 'js/data/familiars-2.js', 'js/data/lists.js', 'js/data/pickups.js',
  'js/data/collectibles.js', 'js/data/economy.js',
  'js/data/enemies/growth.js', 'js/data/enemies/types-1.js', 'js/data/enemies/types-2.js',
  'js/data/enemies/types-3.js', 'js/data/enemies/types-4.js', 'js/data/enemies/lists.js',
  'js/data/enemies/bosses.js', 'js/data/enemies/superbosses.js', 'js/data/stages.js',
  'js/achievements/core.js', 'js/achievements/defs-1.js', 'js/achievements/defs-2.js',
  'js/achievements/defs-3.js', 'js/achievements/defs-4.js', 'js/achievements/defs-5.js',
  'js/achievements/defs-6.js', 'js/achievements/defs-7.js', 'js/achievements/defs-8.js',
  'js/achievements/defs-9.js', 'js/achievements/defs-10.js', 'js/achievements/defs-11.js',
  'js/achievements/defs-12.js', 'js/achievements/defs-mastery.js', 'js/achievements/bestiary-tiers.js',
  'js/achievements/logic.js', 'js/achievements/skilltree.js', 'js/achievements/skilltree-characters.js',
  'js/achievements/skilltree-characters-2.js', 'js/achievements/skilltree-general.js',
  'js/achievements/skilltree-unlocks-stars.js', 'js/achievements/skilltree-unlocks-familiars.js',
  'js/achievements/skilltree-unlocks-items.js', 'js/achievements/skilltree-unlocks-trinkets.js',
  'js/ui/bestiary.js',
  'js/data/roomTemplates/core.js', 'js/data/roomTemplates/normal-1.js', 'js/data/roomTemplates/normal-2.js',
  'js/data/roomTemplates/normal-3.js', 'js/data/roomTemplates/normal-4.js',
  'js/systems/dungeon.js', 'js/systems/room.js', 'js/entities/entities.js', 'js/systems/attackStyles.js',
  'js/systems/combat-1.js', 'js/systems/combat-2.js', 'js/systems/combat-3.js', 'js/systems/combat-4.js',
  'js/systems/ai-1.js', 'js/systems/ai-2.js', 'js/systems/ai-3.js', 'js/systems/ai-4.js',
  'js/systems/familiars.js', 'js/systems/pills.js', 'js/systems/stars.js',
  'js/systems/items-1.js', 'js/systems/items-2.js',
];

const sandbox = {
  console,
  window: {},
  document: {
    getElementById: () => null,
    createElement: () => ({ style: {}, classList: { add(){}, remove(){}, toggle(){} }, appendChild(){}, addEventListener(){} }),
    createDocumentFragment: () => ({ appendChild(){} }),
    querySelectorAll: () => [],
    addEventListener: () => {},
  },
  localStorage: { getItem: () => null, setItem: () => {} },
  Math, JSON, Object, Array, Date,
};
sandbox.window = sandbox;
vm.createContext(sandbox);

// main.js (not loaded — needs real browser APIs) normally supplies these;
// stub the minimal persistence surface that logic.js's bumpStat/setStatMax
// call into, so the ecosystemSetActive first-activation path (the only
// caller reachable from recalcPlayerStats) doesn't throw.
vm.runInContext(`
  var __unlocksStore = null;
  function loadUnlocks(){ return __unlocksStore || {}; }
  function saveUnlocks(u){ __unlocksStore = u; }
  function toast(){} // js/ui/ui.js — not part of this load chain
`, sandbox);

let loadFailed = false;
for (const f of SCRIPTS) {
  const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
  try {
    vm.runInContext(code, sandbox, { filename: f });
  } catch (e) {
    console.error('FAILED loading', f, ':', e.message);
    loadFailed = true;
  }
}
if (loadFailed) { console.log('\nLOAD PHASE: FAIL'); process.exit(1); }
console.log('LOAD PHASE: PASS (' + SCRIPTS.length + ' scripts loaded through js/systems/items-2.js)');

vm.runInContext('this.__ITEMS = ITEMS; this.__TRINKETS = TRINKETS; this.__recalc = recalcPlayerStats;', sandbox);
const ITEMS = sandbox.__ITEMS;
const TRINKETS = sandbox.__TRINKETS;
const recalc = sandbox.__recalc;

const itemIds = Object.keys(ITEMS);
const trinketIds = Object.keys(TRINKETS);

function samplePlayer(itemSample, trinketId) {
  const passives = {};
  for (const id of itemSample) passives[id] = (passives[id] || 0) + 1;
  return {
    passives,
    trinketId: trinketId || null,
    baseSpeed: 220,
    baseMeleeDamage: 3,
    baseRangedDamage: 3,
    luckyPennies: 0,
    familiars: [],
    eyeUsed: false,
    def: { canFly: false, lifedrinkChance: 0 },
    tearFlags: {},
  };
}

let ran = 0, threw = 0;
const N_TRIALS = 40;
for (let i = 0; i < N_TRIALS; i++) {
  // deterministic-ish pseudo-random sample without external RNG deps
  const sampleSize = 3 + (i % 6);
  const sample = [];
  for (let j = 0; j < sampleSize; j++) sample.push(itemIds[(i * 37 + j * 91) % itemIds.length]);
  const trinket = trinketIds[(i * 53) % trinketIds.length];
  const player = samplePlayer(sample, trinket);
  try {
    recalc(player);
    ran++;
  } catch (e) {
    threw++;
    console.error('recalcPlayerStats THREW for trial', i, 'items=', sample, 'trinket=', trinket, '\n  ', e.message);
  }
}
// also: full-inventory stress case (every item + a trinket at once)
try {
  const allPlayer = samplePlayer(itemIds, trinketIds[0]);
  recalc(allPlayer);
  ran++;
  console.log('Full-inventory (all ' + itemIds.length + ' items at once) stress case: PASS');
} catch (e) {
  threw++;
  console.error('Full-inventory stress case THREW:', e.message);
}

console.log(`\nRan recalcPlayerStats ${ran + 0} times (${N_TRIALS} sampled combos + 1 full-inventory), ${threw} threw.`);
console.log(threw === 0 ? 'SMOKE TEST: PASS' : 'SMOKE TEST: FAIL');
process.exit(threw === 0 && !loadFailed ? 0 : 1);
