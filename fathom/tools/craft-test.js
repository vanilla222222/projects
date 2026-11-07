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
// Everything an enemy drops is a raw input as far as crafting is concerned: you get it
// by killing something rather than by making it.
const enemyDrops = require('../js/enemy.js').ENEMIES
  .flatMap(e => [
    ...(e.drops || []).map(([key]) => key),
    ...(e.bossDrops || []).map(drop => Array.isArray(drop) ? drop[0] : drop)
  ]);
// Ores and gems come from the generator's own band table rather than from a list
// written out here, which went stale the moment six gems were added to it.
const ORES = require('../js/worldgen.js').ORE_BANDS.map(b => b.key);
// Meteorite is raw but is in no band: it is not generated with the world at all. A
// meteor falls where a meteor falls, and its crater is written into the edit diff.
const RAW = new Set(['wood', 'stone', 'sand', 'torch', 'crystal', 'glowmoss',
  'shell', 'obsidian', 'fallenstar', 'meteorite', 'vault-relic', 'void-crystal', 'aetherite', 'peat', 'palladium', 'mythril', 'adamantite', 'ray-crystal', 'storm-crystal', 'ward-crystal', ...enemyDrops, ...ORES,
  // Everything that comes out of the water. Fished rather than mined, but raw all the
  // same: no recipe makes a bass.
  ...require('../js/fishing.js').CATCHES.map(c => c.key),
  ...tiles.TILES.filter(t => t.trunkOf).map(t => t.key),
  // Foliage: mushrooms, shells, coral and the rest. A decor tile that leaves something
  // behind is picked rather than mined, and is a raw material like any other.
  ...tiles.TILES.filter(t => t.decor && t.drops !== null).map(t => t.key)]);
const produced = new Set(craft.RECIPES.map(r => r.out.key));

for (const r of craft.RECIPES) {
  ok(r.out.count > 0, 'recipe for ' + r.out.key + ' yields something');
  ok(r.need.length > 0, 'recipe for ' + r.out.key + ' costs something');
  ok(['block', 'wall', 'tool', 'bar', 'armor', 'ammo', 'accessory', 'use'].includes(r.out.kind),
    r.out.key + ' has a known kind');
  ok(craft.kindOf(r.out.key) === r.out.kind,
    r.out.key + ' kind agrees between recipe and registry');
  ok(craft.nameOf(r.out.key, tiles) !== r.out.key, r.out.key + ' has a readable name');
  for (const [key, count] of r.need) {
    ok(count > 0, r.out.key + ' needs a positive amount of ' + key);
    // A tag stands for a family of items; every member of it must itself be obtainable.
    if (key[0] === '#') {
      const members = craft.tagMembers(key);
      ok(members.length > 0, 'tag ' + key + ' matches nothing');
      ok(members.every(mk => RAW.has(mk) || produced.has(mk)),
        'tag ' + key + ' includes something unobtainable');
    } else {
      ok(RAW.has(key) || produced.has(key),
        r.out.key + ' needs ' + key + ', which is mineable or craftable');
    }
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
    // A tag is satisfied by any one of its members being obtainable.
    const met = r.need.every(([k]) => (k[0] === '#'
      ? craft.tagMembers(k).some(mk => have.has(mk))
      : have.has(k)));
    if (met) { have.add(r.out.key); grew = true; }
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
// A bench is makeable with nothing but one species' lumber, by hand, so a fresh world is
// never a dead end. There is no single "workbench" recipe any more: every wood has one.
const benches = craft.RECIPES.filter(r => /bench$/.test(r.out.key));
ok(benches.length === tiles.WOODS.length, 'not every wood species has a work bench');
for (const bench of benches) {
  ok(bench.station === null, bench.out.key + ' cannot be made by hand');
  ok(bench.need.every(([k]) => /wood$/.test(k)), bench.out.key + ' costs more than lumber');
}
// And the whole building set exists for every species, all by hand.
for (const w of tiles.WOODS) {
  for (const part of ['wood', 'back', 'platform', 'door', 'chair', 'table', 'bench']) {
    const r = craft.RECIPES.find(r2 => r2.out.key === w.key + part);
    ok(!!r, w.name + ' has no recipe for its ' + part);
    if (r) ok(r.station === null, w.name + ' ' + part + ' needs a station');
  }
}

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
inv.add({ key: 'oakwood', kind: 'block' }, 9);
ok(!craft.available(inv, new Set()).some(r => r.out.key === 'oakbench'),
  '9 oak is not enough for a bench');
inv.add({ key: 'oakwood', kind: 'block' }, 1);
const byHand = craft.available(inv, new Set());
ok(byHand.some(r => r.out.key === 'oakbench'), '10 oak affords a bench');
ok(byHand.every(r => r.station === null), 'with no station in reach, only by-hand recipes');

// A bench in reach unlocks bench recipes, and only those you can afford.
inv.add({ key: 'oakwood', kind: 'block' }, 20);
const atBench = craft.available(inv, new Set(['workbench']));
ok(atBench.some(r => r.out.key === 'wood-pick'), 'a bench and wood affords a pickaxe');
ok(!atBench.some(r => r.out.key === 'copper-pick'), 'the anvil pickaxe is not offered at a bench');
ok(!atBench.some(r => r.out.key === 'anvil'), 'an anvil needs bars nobody holds yet');
ok(craft.atStation(new Set(['workbench'])).some(r => r.out.key === 'anvil'),
  'the anvil is still listed as a bench recipe, just unaffordable');

// --- crafting is honest ----------------------------------------------------------------
const before = inv.countOf('oakwood');
const pickRecipe = craft.RECIPES.find(r => r.out.key === 'wood-pick');
ok(craft.craft(inv, pickRecipe), 'crafting a pickaxe succeeds');
ok(inv.countOf('oakwood') === before - 12, 'the pickaxe cost exactly 12 wood');
ok(inv.countOf('wood-pick') === 1, 'the pickaxe arrived');

// Paying for something you cannot afford must change nothing at all.
const poor = inventoryModule.makeInventory();
poor.add({ key: 'oakwood', kind: 'block' }, 3);
ok(!craft.craft(poor, pickRecipe), 'crafting without the cost fails');
ok(poor.countOf('oakwood') === 3, 'a failed craft takes nothing');
ok(poor.countOf('wood-pick') === 0, 'a failed craft gives nothing');

// And a full backpack must refund rather than swallow the ingredients.
const full = inventoryModule.makeInventory();
full.add({ key: 'oakwood', kind: 'block' }, 40);
const main = full.section('main');
const hotbar = full.section('hotbar');
for (let i = hotbar.from; i < hotbar.to; i += 1) {
  if (!full.slots[i]) full.slots[i] = { key: 'stone', kind: 'block', count: 9999 };
}
for (let i = main.from; i < main.to; i += 1) {
  if (!full.slots[i]) full.slots[i] = { key: 'stone', kind: 'block', count: 9999 };
}
const woodBefore = full.countOf('oakwood');
ok(woodBefore >= 12, 'the full backpack still holds the wood to try with');
const crafted = craft.craft(full, pickRecipe);
ok(!crafted, 'a craft with nowhere to put the result fails');
ok(full.countOf('oakwood') === woodBefore, 'a failed craft refunds the ingredients exactly');
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

// --- the three ways of fighting ------------------------------------------------------
// Every weapon belongs to a class, every class can be specialised in, and everything that
// only drops names a monster that really drops it. The last one is the check that matters:
// an accessory tied to an enemy that does not exist is an item nobody can ever have.
{
  const enemies = require('../js/enemy.js');
  const byClass = { melee: [], ranged: [], magic: [] };
  for (const [key, w] of Object.entries(craft.WEAPONS)) {
    const cls = craft.classOf(w);
    ok(!!byClass[cls], key + ' has the unknown class ' + cls);
    byClass[cls].push(key);
    ok(w.damage > 0, key + ' does no damage');
    ok(w.useTime > 0 && w.useTime < 2, key + ' has a nonsense use time of ' + w.useTime);
    ok(w.reach > 0, key + ' has no reach');
    ok(typeof w.name === 'string' && w.name.length > 0, key + ' has no name');
    if (cls === 'magic') {
      ok(w.mana > 0, key + ' is magic and costs no mana');
      ok(typeof w.bolt === 'string' && w.bolt[0] === '#', key + ' has no bolt colour');
      ok(w.reach > 10, key + ' is magic and has an arm\'s reach');
    }
    if (cls === 'ranged') {
      ok(!!craft.AMMO[w.ammo], key + ' fires ' + w.ammo + ', which is not ammunition');
      ok(w.reach > 10, key + ' is ranged and has an arm\'s reach');
    }
    if (cls === 'melee') ok(w.reach < 6, key + ' is melee and reaches ' + w.reach + ' tiles');
  }
  for (const cls of Object.keys(byClass)) {
    ok(byClass[cls].length >= 5, 'only ' + byClass[cls].length + ' ' + cls + ' weapons');
  }

  // Everything that only drops must name a real enemy, and must not also be craftable:
  // a drop-only item you can make at a bench is not drop-only.
  const known = new Set(enemies.ENEMIES.map(e => e.key));
  const drops = craft.dropOnly();
  ok(drops.length >= 10, 'only ' + drops.length + ' things drop and cannot be made');
  const fromWho = new Set();
  for (const entry of drops) {
    ok(known.has(entry.from),
      entry.key + ' drops from ' + entry.from + ', which is not an enemy');
    ok(!produced.has(entry.key), entry.key + ' is drop-only and also craftable');
    ok(craft.nameOf(entry.key, tiles) !== entry.key, entry.key + ' has no readable name');
    fromWho.add(entry.from);
  }
  ok(fromWho.size >= 8, 'everything that drops comes off only ' + fromWho.size + ' enemies');

  // Every gem has a staff and every staff needs its own gem, so finding a deeper gem is
  // always finding a better weapon.
  const gems = tiles.TILES.filter(t => t.gem).map(t => t.key);
  ok(gems.length === 6, gems.length + ' gems rather than six');
  let last = 0;
  for (const gem of gems) {
    const staff = craft.WEAPONS[gem + '-staff'];
    ok(!!staff, gem + ' has no staff');
    const recipe = craft.RECIPES.find(r => r.out.key === gem + '-staff');
    ok(!!recipe && recipe.need.some(([k]) => k === gem),
      gem + '-staff does not need ' + gem);
    ok(staff.damage > last, gem + '-staff does not beat the staff above it');
    last = staff.damage;
  }

  // Each class can be specialised: a full set that names it, and an accessory for it.
  // What counts as helping a class: damage for all three, and for magic also the two
  // numbers that decide whether a staff is usable at all - what a spell costs and how
  // fast the pool comes back. A mana flower helps a mage without touching its damage.
  const HELPS = {
    magic: ['magic', 'manaCost', 'manaRegen'],
    ranged: ['ranged', 'arrowSpeed'],
    melee: ['melee', 'swing']
  };
  for (const [cls, label] of [['magic', 'magic'], ['ranged', 'ranged'], ['melee', 'melee']]) {
    const sets = craft.ARMOUR_TIERS.filter(t => t.bonus && t.bonus[cls]);
    ok(sets.length >= 1, 'no armour set makes ' + label + ' hit harder');
    const accs = Object.values(craft.ACCESSORIES)
      .filter(a => HELPS[cls].some(f => a[f] !== undefined));
    ok(accs.length >= 3, 'only ' + accs.length + ' accessories help ' + label);
    const damaging = Object.values(craft.ACCESSORIES).filter(a => a[cls]);
    ok(damaging.length >= 2, 'only ' + damaging.length + ' accessories raise ' + label
      + ' damage itself');
    // And the set bonus really arrives through equipEffects, not merely in the table.
    for (const set of sets) {
      const worn = craft.ARMOUR_PIECES.map(p => set.key + '-' + p.suffix);
      const eff = craft.equipEffects(worn, []);
      ok(eff[cls] > 1, 'wearing all of ' + set.key + ' does not raise ' + label);
      ok(eff.bonus && eff.bonus.key === set.bonus.key,
        'wearing all of ' + set.key + ' does not grant its own bonus');
      // Three pieces is not a set.
      const short = worn.slice(0, 3).concat([null]);
      ok(craft.equipEffects(short, [])[cls] === 1,
        'three pieces of ' + set.key + ' granted the set bonus');
    }
  }

  // Ammunition: the best held is chosen, and better ammunition is better.
  ok(craft.bestAmmo(() => 0) === null, 'an empty backpack still found an arrow');
  ok(craft.bestAmmo(k => (k === 'arrow' ? 5 : 0)) === 'arrow', 'a plain arrow was not found');
  ok(craft.bestAmmo(k => (k === 'arrow' || k === 'ember-arrow' ? 5 : 0)) === 'ember-arrow',
    'a plain arrow was chosen over an ember arrow');
  ok(craft.bestAmmo(k => (k === 'iron-arrow' || k === 'ember-arrow' ? 5 : 0)) === 'ember-arrow',
    'the weaker of two arrows was chosen');
  ok(craft.bestAmmo(k => k === 'adamantite-bullet' || k === 'arrow') === 'arrow', 'bow loaded a bullet');
  ok(craft.bestAmmo(k => k === 'adamantite-bullet' || k === 'arrow', 'bullet') === 'adamantite-bullet',
    'rifle selected the wrong ammo family');
  for (const [key, spec] of Object.entries(craft.AMMO)) {
    ok(spec.bonus >= 0 && spec.speed > 0, key + ' has nonsense numbers');
    ok(craft.kindOf(key) === 'ammo', key + ' is not ammunition');
  }

  // Items used rather than worn do exactly one thing.
  const uses = Object.entries(craft.ITEMS).filter(([, v]) => v.use);
  ok(uses.length >= 3, 'only ' + uses.length + ' items are used rather than worn');
  for (const [key, item] of uses) {
    const fields = ['mana', 'heal', 'restore', 'summon', 'buff', 'open']
      .filter(f => item.use[f] !== undefined);
    ok(fields.length === 1, key + ' does ' + fields.length + ' things rather than one');
    if (fields[0] === 'open') {
      const crates = require('../js/fishing.js').CRATES;
      ok(!!crates[item.use.open],
        key + ' opens ' + item.use.open + ', which no crate table describes');
      continue;
    }
    if (fields[0] === 'buff') {
      const buffs = require('../js/buffs.js').BUFFS;
      // An empty bottle is the one `use` item that does nothing until it is filled.
      if (item.use.buff === null) {
        ok(key === 'bottle', key + ' is a use item that does nothing');
      } else {
        ok(!!buffs[item.use.buff],
          key + ' gives the buff ' + item.use.buff + ', which does not exist');
      }
      continue;
    }
    if (fields[0] === 'summon') {
      const enemies = require('../js/enemy.js');
      const called = enemies.BY_KEY[item.use.summon];
      ok(!!called, key + ' summons ' + item.use.summon + ', which is not an enemy');
      ok(called && called.summonOnly,
        key + ' summons ' + item.use.summon + ', which can also spawn on its own');
    } else {
      ok(item.use[fields[0]] > 0, key + ' does nothing when used');
    }
    ok(craft.kindOf(key) === 'use', key + ' is used but is not of kind use');
  }
}

// --- 7. everything can say what it is -----------------------------------------------------
// A stat the player cannot see is a stat that does not exist. By now there are four
// armour sets whose whole purpose is one number and two dozen accessories that each
// change one, so every item has to be able to describe itself.
{
  const everything = new Set([
    ...Object.keys(craft.ITEMS),
    ...Object.keys(craft.WEAPONS),
    ...Object.keys(craft.ARMOUR),
    ...Object.keys(craft.ACCESSORIES),
    ...Object.keys(mining.TOOLS),
    ...tiles.TILES.filter(t => !t.part).map(t => t.key),
    ...tiles.WALLS.filter(w => w.key !== 'none').map(w => w.key)
  ]);
  let longest = 0;
  for (const key of everything) {
    const said = craft.describe(key, tiles);
    ok(!!said && typeof said.name === 'string' && said.name.length > 0,
      key + ' has no name in its description');
    ok(said.name !== key, key + ' describes itself by its own key');
    ok(Array.isArray(said.lines) && said.lines.length > 0, key + ' says nothing about itself');
    for (const line of said.lines) {
      ok(typeof line === 'string' && line.length > 0 && line.length < 80,
        key + ' has a description line of ' + (line || '').length + ' characters');
      ok(!/undefined|NaN|\[object/.test(line), key + ' says "' + line + '"');
    }
    longest = Math.max(longest, said.lines.length);
  }
  ok(longest >= 3, 'the longest description is only ' + longest + ' lines');

  // And the lines actually say the thing that matters for each kind.
  const says = (key, bit) => craft.describe(key, tiles).lines.join(' | ').includes(bit);
  ok(says('diamond-staff', 'Magic weapon') && says('diamond-staff', 'mana a shot'),
    'a staff does not say it is magic or what it costs');
  ok(says('gold-bow', 'Ranged weapon') && says('gold-bow', 'best arrow'),
    'a bow does not say it is ranged or how it picks ammunition');
  ok(says('iron-sword', 'Melee weapon') && says('iron-sword', 'reach'),
    'a sword does not say it is melee or how far it reaches');
  ok(says('apprentice-chest', 'defence') && says('apprentice-chest', 'Full set'),
    'armour does not say its defence or its set bonus');
  ok(says('royal-gel', 'Only dropped'), 'a drop-only item does not say so');
  ok(says('grapple', 'Press G'), 'a hook does not say how to use it');
  ok(says('manacrystal', 'maximum mana'), 'a mana crystal does not say what it does');
  ok(says('rope', 'Climb'), 'a rope does not say it can be climbed');
  ok(says('iron-pick', 'Power'), 'a pickaxe does not say how strong it is');
  ok(says('diamond', 'power'), 'a tile that needs a good pickaxe does not say so');

  // Every drop-only weapon and accessory admits it, which is the only hint the player
  // ever gets that a thing exists at all.
  for (const entry of craft.dropOnly()) {
    ok(says(entry.key, 'Only dropped'), entry.key + ' does not admit it only drops');
  }
}

console.log('\n' + checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
