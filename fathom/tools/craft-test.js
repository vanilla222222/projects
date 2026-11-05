'use strict';
// Crafting invariants. The graph is the spine of progression, so the things worth checking
// are reachability (can a player with nothing but ore reach the best pickaxe?), honesty
// (does a recipe ever take payment without delivering?), and locality (does walking away
// from a bench really close it?).

const craft = require('../js/craft.js');
const mining = require('../js/mining.js');
const tiles = require('../js/tiles.js');
const inventoryModule = require('../js/inventory.js');

let checks = 0;
let failures = 0;
function ok(cond, label) {
  checks += 1;
  if (!cond) { failures += 1; console.log('FAIL: ' + label); }
}

// --- the graph is well-formed ----------------------------------------------------------
const RAW = new Set(['wood', 'stone', 'sand', 'torch',
  'copper', 'iron', 'silver', 'gold', 'cobalt', 'emberite']);
const produced = new Set(craft.RECIPES.map(r => r.out.key));

for (const r of craft.RECIPES) {
  ok(r.out.count > 0, 'recipe for ' + r.out.key + ' yields something');
  ok(r.need.length > 0, 'recipe for ' + r.out.key + ' costs something');
  ok(['block', 'wall', 'tool', 'bar'].includes(r.out.kind), r.out.key + ' has a known kind');
  ok(craft.kindOf(r.out.key) === r.out.kind,
    r.out.key + ' kind agrees between recipe and registry');
  ok(craft.nameOf(r.out.key, tiles) !== r.out.key, r.out.key + ' has a readable name');
  for (const [key, count] of r.need) {
    ok(count > 0, r.out.key + ' needs a positive amount of ' + key);
    ok(RAW.has(key) || produced.has(key),
      r.out.key + ' needs ' + key + ', which is mineable or craftable');
    ok(craft.nameOf(key, tiles) !== key, key + ' has a readable name');
  }
  if (r.station) {
    const exists = tiles.TILES.some(t => t.station === r.station);
    ok(exists, 'station ' + r.station + ' exists as a placeable tile');
  }
}

// Every station tile is actually used by some recipe, so none is decoration.
for (const t of tiles.TILES) {
  if (!t.station) continue;
  ok(craft.RECIPES.some(r => r.station === t.station), t.key + ' is used by a recipe');
}

// --- reachability: ore in, best pickaxe out --------------------------------------------
const have = new Set(RAW);
let rounds = 0;
let grew = true;
while (grew && rounds < 32) {
  grew = false;
  rounds += 1;
  for (const r of craft.RECIPES) {
    if (have.has(r.out.key)) continue;
    if (r.need.every(([k]) => have.has(k))) { have.add(r.out.key); grew = true; }
  }
}
for (const key of Object.keys(mining.TOOLS)) {
  ok(have.has(key), key + ' is reachable from raw materials');
}
// And every gated tile has a pickaxe that can open it, reachable the same way.
for (const spec of tiles.TILES) {
  const need = mining.requirementOf(spec);
  if (!need) continue;
  const opener = Object.entries(mining.TOOLS)
    .filter(([key]) => have.has(key))
    .some(([, t]) => t.power >= need);
  ok(opener, spec.key + ' can be opened by a craftable pickaxe');
}
// The bench is makeable with nothing but wood, so a fresh world is never a dead end.
const bench = craft.RECIPES.find(r => r.out.key === 'workbench');
ok(bench && bench.station === null, 'the work bench is a by-hand recipe');
ok(bench && bench.need.every(([k]) => k === 'wood'), 'the work bench costs only wood');

// --- station reach ---------------------------------------------------------------------
// A tiny stub world: one work bench at the origin, air everywhere else.
const stubWorld = {
  get(x, y) { return (x === 0 && y === 0) ? tiles.idOf('workbench') : tiles.AIR; },
  getWall() { return 0; }
};
ok(craft.stationsNear(stubWorld, tiles, 0, 0).has('workbench'), 'a bench underfoot counts');
ok(craft.stationsNear(stubWorld, tiles, craft.STATION_REACH_X, 0).has('workbench'),
  'a bench at the edge of reach counts');
ok(!craft.stationsNear(stubWorld, tiles, craft.STATION_REACH_X + 1, 0).has('workbench'),
  'one tile past reach does not count');
ok(craft.stationsNear(stubWorld, tiles, 0, craft.STATION_REACH_Y).has('workbench'),
  'a bench at the vertical edge of reach counts');
ok(!craft.stationsNear(stubWorld, tiles, 0, craft.STATION_REACH_Y + 1).has('workbench'),
  'one tile below reach does not count');
ok(craft.stationsNear(stubWorld, tiles, 40, 40).size === 0, 'far away, no stations');
ok(craft.STATION_REACH_X === 5 && craft.STATION_REACH_Y === 3,
  'reach matches the wiki: 5 across, 3 up and down');

// --- availability tracks what you hold -------------------------------------------------
const inv = inventoryModule.makeInventory();
ok(craft.available(inv, new Set()).length === 0, 'an empty backpack can make nothing');
inv.add({ key: 'wood', kind: 'block' }, 9);
ok(!craft.available(inv, new Set()).some(r => r.out.key === 'workbench'),
  '9 wood is not enough for a bench');
inv.add({ key: 'wood', kind: 'block' }, 1);
const byHand = craft.available(inv, new Set());
ok(byHand.some(r => r.out.key === 'workbench'), '10 wood affords a bench');
ok(byHand.every(r => r.station === null), 'with no station in reach, only by-hand recipes');

// A bench in reach unlocks bench recipes, and only those you can afford.
inv.add({ key: 'wood', kind: 'block' }, 20);
const atBench = craft.available(inv, new Set(['workbench']));
ok(atBench.some(r => r.out.key === 'wood-pick'), 'a bench and wood affords a pickaxe');
ok(!atBench.some(r => r.out.key === 'copper-pick'), 'the anvil pickaxe is not offered at a bench');
ok(!atBench.some(r => r.out.key === 'anvil'), 'an anvil needs bars nobody holds yet');
ok(craft.atStation(new Set(['workbench'])).some(r => r.out.key === 'anvil'),
  'the anvil is still listed as a bench recipe, just unaffordable');

// --- crafting is honest ----------------------------------------------------------------
const before = inv.countOf('wood');
const pickRecipe = craft.RECIPES.find(r => r.out.key === 'wood-pick');
ok(craft.craft(inv, pickRecipe), 'crafting a pickaxe succeeds');
ok(inv.countOf('wood') === before - 12, 'the pickaxe cost exactly 12 wood');
ok(inv.countOf('wood-pick') === 1, 'the pickaxe arrived');

// Paying for something you cannot afford must change nothing at all.
const poor = inventoryModule.makeInventory();
poor.add({ key: 'wood', kind: 'block' }, 3);
ok(!craft.craft(poor, pickRecipe), 'crafting without the cost fails');
ok(poor.countOf('wood') === 3, 'a failed craft takes nothing');
ok(poor.countOf('wood-pick') === 0, 'a failed craft gives nothing');

// And a full backpack must refund rather than swallow the ingredients.
const full = inventoryModule.makeInventory();
full.add({ key: 'wood', kind: 'block' }, 40);
const main = full.section('main');
const hotbar = full.section('hotbar');
for (let i = hotbar.from; i < hotbar.to; i += 1) {
  if (!full.slots[i]) full.slots[i] = { key: 'stone', kind: 'block', count: 9999 };
}
for (let i = main.from; i < main.to; i += 1) {
  if (!full.slots[i]) full.slots[i] = { key: 'stone', kind: 'block', count: 9999 };
}
const woodBefore = full.countOf('wood');
ok(woodBefore >= 12, 'the full backpack still holds the wood to try with');
const crafted = craft.craft(full, pickRecipe);
ok(!crafted, 'a craft with nowhere to put the result fails');
ok(full.countOf('wood') === woodBefore, 'a failed craft refunds the ingredients exactly');
ok(full.countOf('wood-pick') === 0, 'no pickaxe was created');

console.log('\nrecipes by station:');
const groups = {};
for (const r of craft.RECIPES) {
  const k = r.station || 'by hand';
  (groups[k] = groups[k] || []).push(craft.nameOf(r.out.key, tiles));
}
for (const [station, items] of Object.entries(groups)) {
  console.log('  ' + station.padEnd(10) + items.join(', '));
}

console.log('\n' + checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
