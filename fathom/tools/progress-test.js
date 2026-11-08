'use strict';
// Progression. The crafting test proves the recipe graph is well formed; this one proves
// it can actually be climbed, which is a different question and the one that breaks.
//
// A recipe graph can be perfectly consistent and still unreachable, because mining is
// gated: a tile carries a `require`, and only a pickaxe of at least that power can break
// it. The failure that matters is circular - a gem that needs a pickaxe that needs that
// gem - and it is invisible to a check that starts by assuming every raw material is
// already in the bag, which is exactly what the reachability check in craft-test does.
//
// So this walks the real ladder. Start with what a new character is given, then repeat:
// mine everything the best pickaxe held can break, craft everything whose ingredients and
// whose station are both in hand, and see what that makes possible next. Anything still
// out of reach when nothing new appears for a full round is unreachable, and the round a
// thing arrives in is its place in the progression.

const craft = require('../js/craft.js');
const mining = require('../js/mining.js');
const tiles = require('../js/tiles.js');
const worldgen = require('../js/worldgen.js');
const enemies = require('../js/enemy.js');
const loot = require('../js/loot.js');

let checks = 0;
let failures = 0;
function ok(cond, label) {
  checks += 1;
  if (!cond) { failures += 1; console.log('FAIL: ' + label); }
}

// What a new character is handed. Taken from the game rather than written out, so a
// change to the starting kit is a change to this test too.
const STARTING = ['tin-pick', 'tin-axe', 'tin-hammer', 'tin-sword'];

// Things that come off something living, or out of a chest or a pot, rather than out of
// the rock. These are not gated by a pickaxe, so the ladder treats them as available:
// what is being tested here is the mining gate, not the question of whether a player can
// survive hell, which no static check can answer.
// Anything that is also craftable is left out on purpose. Chests hold pickaxes and
// swords, and a ladder that starts by being handed one from a chest is not the ladder
// being tested: the question is whether a player who makes their own equipment can climb
// it. Loot is a shortcut, and a shortcut cannot be what makes the route passable.
const MADE = new Set(craft.RECIPES.map(r => r.out.key));
const FROM_THE_WORLD = new Set([
  ...enemies.ENEMIES.filter(e => e.specimen?.rare !== 'crystal').flatMap(e => (e.drops || []).map(([k]) => k)),
  ...enemies.ENEMIES.flatMap(e => (e.bossDrops || []).map(drop => Array.isArray(drop) ? drop[0] : drop)),
  ...loot.allLootKeys(),
  ...craft.dropOnly().map(drop => drop.key),
  ...worldgen.POT_TABLE.map(e => e.key),
  // Fish are pulled out of the water rather than dug out of the ground, so the pickaxe
  // gate has nothing to say about them. The rod that catches them is on the ladder.
  ...require('../js/fishing.js').CATCHES.map(c => c.key),
  'fallenstar'
].filter(k => !MADE.has(k) && !mining.TOOLS[k] && !['furnace-core', 'guardian-seal', 'void-heart', 'rift-core', 'mire-pearl', 'granite-eye', 'briar-heart', 'rootcrown-core', 'storm-plume', 'scourge-scale', 'rimehorn-shard', 'aurora-thread', 'orchid-stinger', 'amberroot-heart', 'reed-crown', 'blackfen-silk', 'cragbreaker-horn', 'cairn-echo', 'behemoth-core', 'ochre-scale', 'sunmane-tuft', 'sun-carat', 'pinemaw-claw', 'winterroot-core', 'windmill-gear', 'standard-thread', 'spore-crown-fragment', 'hollowroot-knot', 'bloodcrest-plume', 'veinward-core', 'reef-fin', 'abyssal-pearl', 'breakwater-claw', 'saltmarrow-bone', 'prism-heart'].includes(k)));

// Which tiles can be dug out of the ground at all. A tile that is generated and solid is
// a tile the world contains; `require` is what decides whether this pickaxe can take it.
function minableTiles() {
  const generated = new Set([
    ...worldgen.ORE_BANDS.map(b => b.key),
    // Meteorite is in no band: it arrives in a crater when the King dies. Counted here
    // as minable because what this test measures is the pickaxe gate, and meteorite's
    // gate is a pickaxe like everything else's - the boss is a separate question.
    'meteorite', 'void-crystal', 'aetherite', 'palladium', 'mythril', 'adamantite', 'lunarium', 'solarium', 'eventide', 'ray-crystal', 'storm-crystal', 'ward-crystal',
    // The everyday materials. Taken from the biome table so a new biome's stone is
    // included without anyone remembering to add it here.
    ...worldgen.BIOMES.flatMap(b => [b.surface, b.filler, b.sub].filter(Boolean)),
    'stone', 'sand', 'crystal', 'glowmoss', 'mushroom', 'obsidian', 'shell',
    // Strata, structure masonry, sky islands and the Hallow overlay.
    'clay', 'ice', 'basalt', 'slate', 'brick', 'saltcrust', 'ash', 'brimstone',
    'cinderstone', 'skystone', 'starrock', 'voidstone', 'prismstone'
  ]);
  const out = [];
  for (const key of generated) {
    const spec = tiles.BY_KEY[key];
    if (!spec) continue;
    out.push({ key, require: spec.require || 0 });
  }
  // Wood comes off trees rather than out of the rock, and an axe takes any of them.
  // Foliage is picked by hand and needs no pickaxe at all.
  for (const spec of tiles.TILES) {
    if (spec.trunkOf) out.push({ key: spec.key, require: 0 });
    else if (spec.decor && spec.drops !== null) out.push({ key: spec.key, require: 0 });
  }
  return out;
}

const MINABLE = minableTiles();

// Which crafting stations the held things provide. A station is a property of a tile,
// not a key: every wood species has its own work bench, and `oakbench` is an Oak Work
// Bench that provides the station `workbench`. Comparing a station's name against item
// keys - which is what this test did first - reports the entire game as unreachable and
// sends you off to fix a bug that is not there.
function stationsIn(held) {
  const out = new Set();
  for (const key of held) {
    const spec = tiles.BY_KEY[key];
    if (spec && spec.station) out.add(spec.station);
  }
  return out;
}

function bestPickPower(held) {
  let best = 0;
  for (const key of held) {
    const tool = mining.TOOLS[key];
    if (tool && tool.job === 'pick') best = Math.max(best, tool.power);
  }
  return best;
}

// One climb of the ladder. Returns, for every key, the round it first became obtainable.
function climb() {
  const held = new Set([...STARTING, ...FROM_THE_WORLD]);
  const arrived = new Map();
  for (const key of held) arrived.set(key, 0);
  let round = 0;
  let grew = true;
  while (grew && round < 60) {
    grew = false;
    round += 1;
    // Everything in a round is decided against what was held when the round began. A
    // single growing set would collapse a whole chain of recipes into one pass - log to
    // plank to door to house in one step - and the round number is only worth having
    // because it is the depth of the dependency, which is what makes "the ladder is a
    // ladder" a real claim rather than a tautology.
    const was = new Set(held);
    const power = bestPickPower(was);
    const stations = stationsIn(was);
    const gain = (key) => {
      if (held.has(key)) return;
      held.add(key);
      arrived.set(key, round);
      grew = true;
    };
    // The Warden is a combat gate. The ladder only assumes victory once its summon
    // is reachable and the player can mine the ore used for its rewards.
    for (const [summon, core] of [
      ['glass-effigy', 'colossus-core'], ['induction-coil', 'serpent-core'], ['zenith-beacon', 'zenith-core']
    ]) if (was.has(summon)) gain(core);
    if (was.has('starcall-horn') && ['colossus-core', 'serpent-core', 'zenith-core'].every(key => was.has(key))) {
      gain('starwyvern-plume');
      gain('wyvern-essence');
    }
    if (was.has('warden-igniter')) gain('foundry-prism');
    if (was.has('tide-seal')) gain('archivist-core');
    if (was.has('astral-standard')) gain('siege-core');
    if (was.has('lens-sigil') && was.has('foundry-prism')) gain('lens-vault-core');
    if (was.has('railbreaker-whistle')) gain('railbreaker-drive');
    if (was.has('clockwork-heart')) gain('mechanist-core');
    if (was.has('cinder-idol') && power >= mining.TOOLS['cobalt-pick'].power) gain('furnace-core');
    if (was.has('ashvault-key') && was.has('guardian-effigy')) gain('guardian-seal');
    if (was.has('guardian-seal')) gain('vault-relic');
    if (was.has('void-beacon')) gain('void-heart');
    if (was.has('mire-idol')) gain('mire-pearl');
    if (was.has('granite-idol')) gain('granite-eye');
    if (was.has('briar-idol')) gain('briar-heart');
    if (was.has('rootcrown-idol')) gain('rootcrown-core');
    if (was.has('storm-feather')) gain('storm-plume');
    if (was.has('desert-medallion')) gain('scourge-scale');
    if (was.has('rime-horn')) gain('rimehorn-shard');
    if (was.has('aurora-lantern')) gain('aurora-thread');
    if (was.has('orchid-lure')) gain('orchid-stinger');
    if (was.has('amberroot-idol')) gain('amberroot-heart');
    if (was.has('reed-sigil')) gain('reed-crown');
    if (was.has('blackfen-spool')) gain('blackfen-silk');
    if (was.has('crag-totem')) gain('cragbreaker-horn');
    if (was.has('cairn-bell')) gain('cairn-echo');
    if (was.has('clay-effigy')) gain('behemoth-core');
    if (was.has('ochre-sigil')) gain('ochre-scale');
    if (was.has('sunmane-idol')) gain('sunmane-tuft');
    if (was.has('sun-court-seal')) gain('sun-carat');
    if (was.has('pine-totem')) gain('pinemaw-claw');
    if (was.has('winterroot-bell')) gain('winterroot-core');
    if (was.has('windmill-token')) gain('windmill-gear');
    if (was.has('standard-pennant')) gain('standard-thread');
    if (was.has('spore-idol')) gain('spore-crown-fragment');
    if (was.has('hollowroot-sigil')) gain('hollowroot-knot');
    if (was.has('bloodcrest-lure')) gain('bloodcrest-plume');
    if (was.has('vein-seal')) gain('veinward-core');
    if (was.has('reef-conch')) gain('reef-fin');
    if (was.has('abyssal-signal')) gain('abyssal-pearl');
    if (was.has('breakwater-shell')) gain('breakwater-claw');
    if (was.has('saltmarrow-token')) gain('saltmarrow-bone');
    if (was.has('rift-sigil')) gain('rift-core');
    if (was.has('prism-sigil')) gain('prism-heart');
    for (const tile of MINABLE) {
      if (['palladium', 'mythril', 'adamantite', 'ray-crystal', 'storm-crystal', 'ward-crystal'].includes(tile.key)
        && !was.has('prism-heart')) continue;
      if (['lunarium', 'solarium', 'eventide'].includes(tile.key) && !was.has('siege-core')) continue;
      if (was.has(tile.key) || tile.require > power) continue;
      gain(tile.key);
    }
    for (const r of craft.RECIPES) {
      if (was.has(r.out.key)) continue;
      // The station has to be in hand too: you cannot smelt before you have a furnace,
      // and the furnace is itself something you have to make.
      if (r.station && !stations.has(r.station)) continue;
      const met = r.need.every(([k]) => (k[0] === '#'
        ? craft.tagMembers(k).some(m => was.has(m))
        : was.has(k)));
      if (!met) continue;
      gain(r.out.key);
    }
  }
  return { held, arrived, rounds: round, power: bestPickPower(held) };
}

const ladder = climb();
const GIVEN = new Set(STARTING);

// --- 1. everything the game can make, the game can reach ---------------------------------
for (const r of craft.RECIPES) {
  ok(ladder.held.has(r.out.key), r.out.key + ' can never be crafted: '
    + r.need.map(([k, n]) => n + ' ' + k).join(', ')
    + (r.station ? ' at a ' + r.station : ' by hand'));
}
for (const key of Object.keys(mining.TOOLS)) {
  ok(ladder.held.has(key), 'the tool ' + key + ' is unreachable');
}
for (const key of Object.keys(craft.WEAPONS)) {
  const w = craft.WEAPONS[key];
  const ossuary = worldgen.dungeonLayout(20260105);
  const cacheLoot = [16, 36, 56].some((dy, row) =>
    worldgen.baseContainerAt(20260105, ossuary.x + (row % 2 ? -19 : 18), ossuary.y + dy)
      ?.some(item => item.key === key));
  const armoryLoot = worldgen.MECHANIST_CACHES.some(dx =>
    worldgen.baseContainerAt(20260105, ossuary.x + dx, ossuary.y + 98)?.some(item => item.key === key));
  if (w.drop || cacheLoot || armoryLoot) continue;                      // dropped things are not climbed to
  ok(ladder.held.has(key), 'the weapon ' + key + ' is unreachable');
}
const chapterLoot = new Set();
for (const seed of [17, 42, 20260105]) {
  for (const site of worldgen.chapterArmories(seed)) {
    for (let room = 0; room < 4; room += 1) {
      const x = site.x + (room % 2 ? 14 : -15);
      const y = site.y + 18 * (room + 1) - 2;
      const cache = worldgen.baseContainerAt(seed, x, y);
      ok(cache?.length === 6, site.name + ' has no full armory cache in room ' + room);
      for (const item of cache || []) {
        ok(craft.kindOf(item.key) === item.kind, item.key + ' has the wrong cache kind');
        if (seed === 20260105) chapterLoot.add(item.key);
      }
    }
  }
}
for (const key of Object.keys(craft.ARMOUR)) {
  ok(ladder.held.has(key) || chapterLoot.has(key), 'the armour ' + key + ' is unreachable');
}
for (const key of Object.keys(craft.ACCESSORIES)) {
  if (craft.ACCESSORIES[key].drop) continue;
  ok(ladder.held.has(key), 'the accessory ' + key + ' is unreachable');
}

// --- 2. every tile in the ground can be dug out by some pickaxe --------------------------
const strongest = Math.max(...Object.values(mining.TOOLS)
  .filter(t => t.job === 'pick').map(t => t.power));
for (const tile of MINABLE) {
  ok(tile.require <= strongest, tile.key + ' needs power ' + tile.require
    + ' and the best pickaxe in the game has ' + strongest);
  ok(ladder.held.has(tile.key), tile.key + ' is in the ground and cannot be reached');
}
ok(ladder.power === strongest,
  'the climb ends holding a pickaxe of ' + ladder.power + ', not the best one at ' + strongest);

// --- 3. the ladder is a ladder --------------------------------------------------------------
// Each pickaxe must arrive strictly after the one below it, or a tier is skippable and
// the ore it was there to gate was never a gate at all.
{
  // The gifted pickaxe is left out: it arrives before everything by definition, and a
  // wooden one is a downgrade nobody would ever make.
  const picks = Object.entries(mining.TOOLS)
    .filter(([key, t]) => t.job === 'pick' && !GIVEN.has(key))
    .sort((a, b) => a[1].power - b[1].power);
  let last = -1;
  let lastKey = null;
  for (const [key, tool] of picks) {
    const when = ladder.arrived.get(key);
    ok(when !== undefined, key + ' never arrives');
    if (when === undefined) continue;
    ok(when >= last, key + ' (power ' + tool.power + ') arrives in round ' + when
      + ', before ' + lastKey + ' in round ' + last);
    last = when;
    lastKey = key;
  }
  ok(picks.length >= 6, 'only ' + picks.length + ' pickaxes to climb');
  // And the gift must not already be the best thing in the game, or there is no climb.
  const given = Math.max(...[...GIVEN].map(k => (mining.TOOLS[k] ? mining.TOOLS[k].power : 0)));
  ok(given < strongest * 0.5, 'the starting pickaxe is ' + given
    + ' against a best of ' + strongest + ': there is nothing to climb to');
}

for (const [ore, previous] of Object.entries({
  iron: 'copper', silver: 'iron', gold: 'silver', cobalt: 'gold', emberite: 'cobalt'
})) {
  const earlier = previous === 'copper' ? 'tin' : { iron: 'copper', silver: 'iron', gold: 'silver', cobalt: 'gold' }[previous];
  ok(mining.canMine(mining.TOOLS[previous + '-pick'].power, tiles.BY_KEY[ore]), previous + ' opens ' + ore);
  ok(!mining.canMine(mining.TOOLS[earlier + '-pick'].power, tiles.BY_KEY[ore]), earlier + ' skips to ' + ore);
}

ok(ladder.arrived.get('briar-idol') < ladder.arrived.get('briar-brooch'), 'Briar reward bypasses its boss');
ok(ladder.arrived.get('rootcrown-idol') < ladder.arrived.get('rootcrown-ring'), 'Root Crown reward bypasses its boss');
ok(ladder.arrived.get('prism-heart') < ladder.arrived.get('palladium')
  && ladder.arrived.get('palladium-pick') < ladder.arrived.get('mythril')
  && ladder.arrived.get('mythril-pick') < ladder.arrived.get('adamantite'),
  'Hardmode ore progression bypasses its gate');
ok(ladder.arrived.get('rift-core') < ladder.arrived.get('rift-pick')
  && ladder.arrived.get('rift-pick') < ladder.arrived.get('aetherite'), 'sky ore bypasses the Rift Archon');
ok(mining.damagePerHit(250, tiles.BY_KEY.aetherite, mining.TOOLS['emberite-pick'].power) === 0,
  'buffed emberite bypasses the Rift Pickaxe');

ok(ladder.arrived.get('slimecrown') < ladder.arrived.get('gold-pick'),
  'King Slime is unavailable before gold gear');
ok(ladder.arrived.get('bloodshotlens') < ladder.arrived.get('gold-pick'),
  'Hollow Eye is unavailable before gold gear');
ok(ladder.arrived.get('cinder-idol') < ladder.arrived.get('furnace-core'), 'Warden rewards precede its summon');
for (const key of ['furnace-lance', 'cinder-scepter', 'warden-heart']) {
  ok(ladder.arrived.get('furnace-core') < ladder.arrived.get(key), key + ' is available before the Warden');
}

for (const metal of ['tin', 'copper', 'iron', 'silver', 'gold', 'cobalt', 'emberite', 'meteor', 'aetherite', 'palladium', 'mythril', 'adamantite']) {
  const keys = ['pick', 'axe', 'hammer', 'helmet', 'chest', 'legs', 'boots', 'bow']
    .map(piece => metal + '-' + piece);
  keys.push(metal === 'aetherite' ? 'aether-sabre' : metal + '-sword');
  for (const key of keys) {
    const recipe = craft.RECIPES.find(r => r.out.key === key);
    ok(recipe?.need.some(([item]) => item === metal + '-bar'), key + ' lacks a recipe using its own metal');
    ok(ladder.held.has(key), key + ' is missing from the reachable set');
  }
}

{
  const ordered = craft.BOSS_CHAPTERS.flat();
  const summoned = Object.values(craft.ITEMS).flatMap(item => item.use?.summon ? [item.use.summon] : []);
  ok(new Set(ordered).size === ordered.length && summoned.length === ordered.length
    && summoned.every(key => ordered.includes(key)), 'boss order must cover each summon once');
  const defeated = new Set();
  for (const [index, [main, ...optional]] of craft.BOSS_CHAPTERS.entries()) {
    if (main === 'starwyvern') {
      for (const boss of craft.HARDMODE_TRIO) {
        ok(craft.bossPrerequisite(main, defeated) === boss, 'Star Wyvern bypasses ' + boss);
        defeated.add(boss);
      }
    }
    ok(craft.bossPrerequisite(main, defeated) === null, main + ' cannot be reached in order');
    for (const boss of optional) ok(craft.bossPrerequisite(boss, defeated) === main, boss + ' unlocks too early');
    const next = craft.BOSS_CHAPTERS[index + 1]?.[0];
    if (next) ok(craft.bossPrerequisite(next, defeated) === main, next + ' bypasses ' + main);
    defeated.add(main);
    for (const boss of optional) {
      const expected = boss === 'drownedarchivist' ? 'lenscustodian' : null;
      ok(craft.bossPrerequisite(boss, defeated) === expected, boss + ' has the wrong unlock gate');
    }
  }
  const legacy = craft.restoreBossProgress(['ashguardian']);
  ok(legacy.has('kingslime') && legacy.has('furnacewarden') && !legacy.has('voidsovereign'),
    'legacy boss progress was not carried forward correctly');
}

// --- 4. nothing is reachable before the thing that is supposed to gate it -----------------
// A gem staff cannot be makeable before its gem, and a tier of armour cannot be makeable
// before its bar. Stated as a rule over the recipes rather than case by case.
for (const r of craft.RECIPES) {
  const when = ladder.arrived.get(r.out.key);
  if (when === undefined) continue;
  // The starting kit is handed over, not made. A tin pickaxe arriving before the anvil
  // that could have made one is the point of a starting kit.
  if (GIVEN.has(r.out.key)) continue;
  for (const [key] of r.need) {
    if (key[0] === '#') {
      const earliest = Math.min(...craft.tagMembers(key)
        .map(m => (ladder.arrived.has(m) ? ladder.arrived.get(m) : Infinity)));
      ok(earliest < when, r.out.key + ' arrives in round ' + when
        + ', no later than every member of ' + key);
      continue;
    }
    const got = ladder.arrived.get(key);
    ok(got !== undefined && got < when, r.out.key + ' arrives in round ' + when
      + ' but needs ' + key + ', which arrives in round ' + got);
  }
  if (r.station) {
    // The earliest round in which anything providing that station was in hand.
    let earliest = Infinity;
    for (const [key, round] of ladder.arrived) {
      const spec = tiles.BY_KEY[key];
      if (spec && spec.station === r.station) earliest = Math.min(earliest, round);
    }
    ok(earliest < when, r.out.key + ' arrives in round ' + when + ' but the earliest '
      + r.station + ' is round ' + earliest);
  }
}

// --- 5. the climb is a climb, not a cliff ----------------------------------------------------
// If everything arrived in one or two rounds there would be no progression at all; if it
// took thirty, something is gated behind a chain nobody would ever follow.
ok(ladder.rounds >= 5, 'the whole game is reachable in ' + ladder.rounds + ' rounds');
ok(ladder.rounds <= 58, 'the ladder is ' + ladder.rounds + ' rounds deep');

// --- 6. the deepest things really are the last ones --------------------------------------------
{
  const when = (k) => ladder.arrived.get(k);
  ok(when('diamond') > when('amethyst'), 'diamond is no deeper than amethyst');
  ok(when('emberite-pick') > when('tin-pick'), 'emberite is no later than tin');
  ok(when('diamond-staff') > when('amethyst-staff'), 'the staffs do not ladder');
  ok(when('adept-chest') > when('apprentice-chest'), 'the mage sets do not ladder');
  ok(when('anvil') > when('furnace'), 'an anvil arrives before the furnace that makes it');
  // And a work bench has to come before everything a work bench makes.
  const firstBench = Math.min(...[...ladder.arrived]
    .filter(([key]) => tiles.BY_KEY[key] && tiles.BY_KEY[key].station === 'workbench')
    .map(([, round]) => round));
  ok(Number.isFinite(firstBench), 'no work bench is reachable at all');
  ok(firstBench < when('furnace'), 'the furnace arrives before any work bench');
}

const byRound = new Map();
for (const [key, round] of ladder.arrived) {
  if (round === 0) continue;
  if (!byRound.has(round)) byRound.set(round, []);
  byRound.get(round).push(key);
}
console.log('\nthe ladder, from a tin pickaxe:');
for (const round of [...byRound.keys()].sort((a, b) => a - b)) {
  const got = byRound.get(round).sort();
  console.log('  ' + String(round).padStart(2) + '  ' + got.length + ' new  '
    + got.slice(0, 9).join(', ') + (got.length > 9 ? ', ...' : ''));
}
console.log('\n' + ladder.held.size + ' things obtainable over ' + ladder.rounds
  + ' rounds; best pickaxe ' + ladder.power);
console.log(checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
