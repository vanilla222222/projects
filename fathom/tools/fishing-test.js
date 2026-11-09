'use strict';
// Fishing. The design problem is that liquid is everywhere - an ocean, a flooded cavern,
// a lava lake, a bucket's worth in a hole you dug - and if every pool fishes the same
// then fishing is a button rather than a place you go. So what is worth testing is that
// **where** decides **what**: which liquid, how much of it, which biome, and whether you
// are above ground or under it.

const fishing = require('../js/fishing.js');
const craft = require('../js/craft.js');
const tiles = require('../js/tiles.js');
const worldgen = require('../js/worldgen.js');
const rng = require('../js/rng.js');

let checks = 0;
let failures = 0;
function ok(cond, label) {
  checks += 1;
  if (!cond) { failures += 1; console.log('FAIL: ' + label); }
}

const at = (biome, layer, amount, liquid) =>
  fishing.catchesFor({ biome, layer, amount, liquid: liquid || 'water' })
    .map(e => e.key);

// --- 1. the tables are sane -----------------------------------------------------------
for (const entry of fishing.CATCHES) {
  ok(entry.weight > 0, entry.key + ' can never be caught');
  ok(entry.min >= 0, entry.key + ' needs ' + entry.min + ' liquid');
  ok(entry.liquid === 'water' || entry.liquid === 'lava',
    entry.key + ' is in "' + entry.liquid + '", which is not a liquid');
  ok(craft.nameOf(entry.key, tiles) !== entry.key, entry.key + ' has no readable name');
  ok(['loot', 'use', 'block', 'coin'].includes(craft.kindOf(entry.key)),
    entry.key + ' is of no kind anyone can hold');
  for (const group of entry.groups || []) {
    ok(!!fishing.GROUPS[group], entry.key + ' is restricted to the group "' + group
      + '", which does not exist');
  }
  for (const band of entry.bands || []) {
    ok(['surface', 'underground', 'hell'].includes(band),
      entry.key + ' is restricted to the band "' + band + '"');
  }
  // A biome named directly has to be a biome the generator can produce.
  for (const biome of entry.biomes || []) {
    ok([...worldgen.BIOMES, ...tiles.UNDERWORLD_BIOMES].some(b => b.key === biome),
      entry.key + ' is restricted to the biome "' + biome + '", which does not exist');
  }
}
// Every biome group names biomes that exist.
for (const [group, members] of Object.entries(fishing.GROUPS)) {
  ok(members.length > 0, 'the group ' + group + ' is empty');
  for (const key of members) {
    ok(worldgen.BIOMES.some(b => b.key === key),
      'the group ' + group + ' contains "' + key + '", which is not a biome');
  }
}
for (const [key, rod] of Object.entries(fishing.RODS)) {
  ok(rod.power > 0, key + ' has no power');
  ok(!!craft.ITEMS[key] && craft.ITEMS[key].rod, key + ' is not an item marked as a rod');
}
for (const [key, item] of Object.entries(craft.ITEMS)) {
  if (item.rod) ok(!!fishing.RODS[key], key + ' is a rod the fishing table never heard of');
}
ok(fishing.PUDDLE < fishing.POOL && fishing.POOL < fishing.SEA,
  'the three sizes of liquid are not in order');
ok(Object.values(fishing.RODS).some(r => r.lava), 'no rod can fish in lava');

// --- 2. how much liquid there is ------------------------------------------------------
{
  ok(at('forest', 'surface', 4).every(k => k === 'junk'),
    'a puddle offers ' + at('forest', 'surface', 4).join(', '));
  ok(at('forest', 'surface', fishing.POOL).includes('bass'), 'a pond has no bass in it');
  const pond = at('forest', 'surface', fishing.POOL);
  const sea = at('ocean', 'surface', fishing.SEA);
  ok(sea.length > pond.length, 'the sea offers no more than a pond');
  ok(!at('ocean', 'surface', fishing.POOL).includes('swordfish'),
    'a shallow bit of sea gives up swordfish');
  ok(at('ocean', 'surface', fishing.SEA).includes('swordfish'),
    'the open sea has no swordfish');
}

// --- 3. which biome ---------------------------------------------------------------------
{
  const cold = at('tundra', 'surface', fishing.POOL);
  const warm = at('forest', 'surface', fishing.POOL);
  const jungle = at('jungle', 'surface', fishing.POOL);
  const desert = at('desert', 'surface', fishing.POOL);
  const salt = at('ocean', 'surface', fishing.SEA);
  const blight = at('blight', 'surface', fishing.POOL);

  ok(cold.includes('trout') && !warm.includes('trout'), 'trout are not a cold-water fish');
  ok(warm.includes('perch') && !cold.includes('perch'), 'perch are not a warm-water fish');
  ok(jungle.includes('piranha') && !warm.includes('piranha'), 'piranha are not a jungle fish');
  ok(desert.includes('oasiscarp') && !jungle.includes('oasiscarp'),
    'the oasis carp is not a dry-country fish');
  ok(salt.includes('shrimp') && !warm.includes('shrimp'), 'shrimp are not a salt-water fish');
  ok(blight.includes('rotgill') && !warm.includes('rotgill'), 'rotgill are not a blight fish');

  // Every biome the generator can make must offer something beyond junk in a real pool,
  // or there is somewhere in the world where fishing is pointless.
  for (const biome of worldgen.BIOMES) {
    const got = at(biome.key, 'surface', fishing.POOL);
    ok(got.length >= 2, 'fishing a pond in ' + biome.key + ' offers only ' + got.join(', '));
    ok(got.some(k => k !== 'junk' && k !== 'crate'),
      'a pond in ' + biome.key + ' holds nothing but junk and crates');
  }
}

// --- 4. surface against underground -------------------------------------------------------
// The point of the whole scheme: a flooded cavern under a jungle is neither the jungle
// surface nor an ordinary cavern, and holds something that exists in neither.
{
  const up = at('jungle', 'surface', fishing.POOL);
  const down = at('jungle', 'deep', fishing.POOL);
  ok(down.includes('cavefish'), 'a flooded cavern has no cave fish');
  ok(!up.includes('cavefish'), 'cave fish are swimming about on the surface');
  ok(down.includes('mudeel'), 'the flooded caverns under a jungle have no mud eel');
  ok(!up.includes('mudeel'), 'mud eels are on the jungle surface');
  ok(!at('forest', 'deep', fishing.POOL).includes('mudeel'),
    'an ordinary cavern has jungle fish in it');

  for (const [biome, fish] of [['tundra', 'frostminnow'], ['blight', 'shadowcarp'],
    ['ocean', 'deepshrimp'], ['jungle', 'mudeel']]) {
    const deep = at(biome, 'deep', fishing.SEA);
    const surface = at(biome, 'surface', fishing.SEA);
    ok(deep.includes(fish), 'the caverns under ' + biome + ' have no ' + fish);
    ok(!surface.includes(fish), fish + ' is on the surface of ' + biome);
  }

  // And the two sets really are different wherever it matters.
  for (const biome of ['jungle', 'tundra', 'ocean', 'blight']) {
    const a = at(biome, 'surface', fishing.SEA).join(',');
    const b = at(biome, 'deep', fishing.SEA).join(',');
    ok(a !== b, 'the surface and the caverns of ' + biome + ' fish identically');
  }
}

// --- 5. lava ------------------------------------------------------------------------------
{
  const lava = at('hell', 'hell', fishing.POOL, 'lava');
  ok(lava.length >= 3, 'lava offers only ' + lava.join(', '));
  ok(lava.includes('flarefin') && lava.includes('obsidifish'), 'lava has no lava fish');
  ok(lava.includes('hellcrate'), 'lava holds no crates');
  // Nothing crosses between the liquids, in either direction.
  const wet = at('hell', 'hell', fishing.SEA, 'water');
  for (const key of lava) ok(!wet.includes(key), key + ' comes out of water as well as lava');
  for (const key of wet) ok(!lava.includes(key), key + ' comes out of lava as well as water');
  // A lava pool anywhere fishes like lava: it is the liquid that decides, not the place.
  ok(at('forest', 'surface', fishing.POOL, 'lava').includes('flarefin'),
    'a lava pool on the surface does not fish like lava');
}

// --- 6. the draw ----------------------------------------------------------------------------
{
  const places = [
    { biome: 'ocean', layer: 'surface', amount: fishing.SEA, liquid: 'water' },
    { biome: 'jungle', layer: 'deep', amount: fishing.POOL, liquid: 'water' },
    { biome: 'tundra', layer: 'surface', amount: fishing.PUDDLE, liquid: 'water' },
    { biome: 'hell', layer: 'hell', amount: fishing.POOL, liquid: 'lava' },
    { biome: 'forest', layer: 'surface', amount: 0, liquid: 'water' }
  ];
  for (const place of places) {
    const allowed = new Set(fishing.catchesFor(place).map(e => e.key));
    let bad = null;
    for (let r = 0; r < 1; r += 0.002) {
      const got = fishing.rollCatch(place, r, 1);
      if (!got || !allowed.has(got.key)) { bad = r; break; }
    }
    ok(bad === null, 'a roll of ' + bad + ' in ' + place.biome + '/' + place.layer
      + ' produced something that does not belong there');
    ok(fishing.rollCatch(place, 0, 1) !== null, 'a roll of zero caught nothing');
    ok(fishing.rollCatch(place, 1, 1) !== null, 'a roll of one caught nothing');
  }

  // A better rod wastes less of your time, in both liquids.
  const share = (place, power) => {
    let bad = 0;
    const n = 3000;
    for (let i = 0; i < n; i += 1) {
      const got = fishing.rollCatch(place, i / n, power);
      if (got && fishing.WORTHLESS.has(got.key)) bad += 1;
    }
    return bad / n;
  };
  for (const place of [places[0], places[3]]) {
    const poor = share(place, 1);
    const good = share(place, 2.1);
    ok(poor > good, 'a better rod does not reduce junk in ' + place.liquid
      + ': ' + poor.toFixed(3) + ' against ' + good.toFixed(3));
    ok(good > 0, 'a good rod catches no junk at all in ' + place.liquid);
    ok(poor < 0.65, place.liquid + ' is mostly junk even so: ' + poor.toFixed(2));
  }
}

// --- 7. measuring the liquid ------------------------------------------------------------------
{
  const water = tiles.idOf('water');
  const lava = tiles.idOf('lava');
  const stone = tiles.idOf('stone');
  const fill = (id, radius) => ({
    get(x, y) { return (Math.abs(x) <= radius && Math.abs(y) <= radius) ? id : stone; }
  });
  const dry = fishing.surveyLiquid({ get: () => stone }, tiles, 0, 0);
  ok(dry.water === 0 && dry.lava === 0, 'solid rock counted as liquid');
  const small = fishing.surveyLiquid(fill(water, 1), tiles, 0, 0);
  ok(small.water === 9 && small.lava === 0, 'a three-by-three pool measured ' + small.water);
  const big = fishing.surveyLiquid(fill(water, 20), tiles, 0, 0);
  ok(big.water > fishing.SEA, 'a pool bigger than the survey measured ' + big.water);
  const hot = fishing.surveyLiquid(fill(lava, 20), tiles, 0, 0);
  ok(hot.lava > fishing.SEA && hot.water === 0, 'lava counted as water');

  ok(fishing.liquidAt(tiles, water) === 'water', 'water is not water');
  ok(fishing.liquidAt(tiles, lava) === 'lava', 'lava is not lava');
  ok(fishing.liquidAt(tiles, stone) === null, 'stone is a liquid');
  ok(fishing.bandOf('hell') === 'hell' && fishing.bandOf('deep') === 'underground'
    && fishing.bandOf('surface') === 'surface' && fishing.bandOf('sky') === 'surface',
    'the layer bands are wrong');
}

// --- 8. crates ---------------------------------------------------------------------------------
{
  const kinds = Object.keys(fishing.CRATES);
  ok(kinds.length >= 5, 'only ' + kinds.length + ' kinds of crate');
  // Every crate must be catchable somewhere, and every catchable crate must have a table.
  const catchable = fishing.CATCHES.filter(e => fishing.CRATES[e.key]).map(e => e.key);
  for (const kind of kinds) {
    ok(catchable.includes(kind), 'the ' + kind + ' table describes a crate nothing catches');
    ok(!!craft.ITEMS[kind] && craft.ITEMS[kind].use
      && craft.ITEMS[kind].use.open === kind, kind + ' is not an openable item');
  }

  const signatures = new Set();
  for (const kind of kinds) {
    const seen = new Set();
    for (let i = 0; i < 200; i += 1) {
      const x = i * 11 - 700;
      const y = 400 + (i * 17) % 400;
      const got = fishing.crateContents(rng.unit, 4242, x, y, kind);
      ok(got.length > 0 && got.length <= 3, kind + ' held ' + got.length + ' stacks');
      for (const item of got) {
        ok(item.count > 0, kind + ' held zero ' + item.key);
        ok(craft.nameOf(item.key, tiles) !== item.key,
          kind + ' held the unnamed ' + item.key);
        seen.add(item.key);
      }
      const again = fishing.crateContents(rng.unit, 4242, x, y, kind);
      ok(JSON.stringify(again) === JSON.stringify(got),
        kind + ' at ' + x + ',' + y + ' held different things when asked twice');
    }
    ok(seen.size >= 3, kind + ' only ever holds ' + seen.size + ' different things');
    signatures.add([...seen].sort().join(','));
  }
  // Each kind of crate has to be worth going somewhere for, which means holding
  // something the others do not.
  ok(signatures.size === kinds.length,
    'two kinds of crate hold exactly the same things');
  // An unknown crate falls back rather than throwing.
  ok(fishing.crateContents(rng.unit, 1, 0, 0, 'nosuchcrate').length > 0,
    'an unknown crate kind produced nothing');
}

// --- 9. a fish is food --------------------------------------------------------------------------
{
  const catchable = new Set(fishing.CATCHES.map(e => e.key));
  for (const [tag, dish] of [['#fish', 'cooked-fish'], ['#lavafish', 'seared-fish']]) {
    const members = craft.tagMembers(tag);
    ok(members.length >= 3, tag + ' has only ' + members.length + ' members');
    for (const key of members) ok(catchable.has(key), key + ' is a fish nothing can catch');
    const cook = craft.RECIPES.find(r => r.out.key === dish);
    ok(!!cook, 'there is no way to cook ' + tag);
    ok(cook && cook.need.some(([k]) => k === tag), dish + ' does not take ' + tag);
    ok(craft.ITEMS[dish].use.heal > 0, dish + ' heals nothing');
  }
  ok(craft.ITEMS['seared-fish'].use.heal > craft.ITEMS['cooked-fish'].use.heal,
    'a fish out of lava is worth no more than one out of a pond');
  // No fish is both.
  const water = new Set(craft.tagMembers('#fish'));
  for (const key of craft.tagMembers('#lavafish')) {
    ok(!water.has(key), key + ' is both a fish and a lava fish');
  }
  // And every catch that is not a crate or junk is cookable, or it is an item with no use.
  for (const entry of fishing.CATCHES) {
    if (fishing.CRATES[entry.key] || fishing.WORTHLESS.has(entry.key)) continue;
    ok(water.has(entry.key) || craft.tagMembers('#lavafish').includes(entry.key),
      entry.key + ' can be caught and is good for nothing');
  }
}

const water = fishing.CATCHES.filter(e => e.liquid === 'water').length;
console.log('\n' + fishing.CATCHES.length + ' things to catch (' + water + ' in water, '
  + (fishing.CATCHES.length - water) + ' in lava), '
  + Object.keys(fishing.CRATES).length + ' kinds of crate, '
  + Object.keys(fishing.RODS).length + ' rods');
console.log('a puddle offers ' + at('forest', 'surface', 4).length
  + ', a forest pond ' + at('forest', 'surface', fishing.POOL).length
  + ', the open sea ' + at('ocean', 'surface', fishing.SEA).length
  + ', flooded jungle caverns ' + at('jungle', 'deep', fishing.SEA).length
  + ', a lava lake ' + at('hell', 'hell', fishing.POOL, 'lava').length);
console.log(checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
