'use strict';
// Fishing. The design problem is that water is everywhere - an ocean, a flooded cavern,
// a bucket's worth in a hole you dug - and if a puddle fishes like the sea then fishing
// is a button rather than a place you go. So the thing worth testing is that where you
// fish decides what you catch, and that the size of the water is measured rather than
// assumed.

const fishing = require('../js/fishing.js');
const craft = require('../js/craft.js');
const tiles = require('../js/tiles.js');
const rng = require('../js/rng.js');

let checks = 0;
let failures = 0;
function ok(cond, label) {
  checks += 1;
  if (!cond) { failures += 1; console.log('FAIL: ' + label); }
}

// --- 1. the tables are sane -----------------------------------------------------------
for (const entry of fishing.CATCHES) {
  ok(entry.weight > 0, entry.key + ' can never be caught');
  ok(entry.min >= 0, entry.key + ' needs ' + entry.min + ' water');
  ok(craft.nameOf(entry.key, tiles) !== entry.key, entry.key + ' has no readable name');
  ok(['loot', 'use', 'block', 'coin'].includes(craft.kindOf(entry.key)),
    entry.key + ' is of no kind anyone can hold');
  if (entry.where) {
    ok(['salt', 'cold', 'warm', 'underground'].includes(entry.where),
      entry.key + ' is restricted to "' + entry.where + '", which is nowhere');
  }
}
for (const [key, rod] of Object.entries(fishing.RODS)) {
  ok(rod.power > 0, key + ' has no power');
  ok(!!craft.ITEMS[key] && craft.ITEMS[key].rod, key + ' is not an item marked as a rod');
}
// Every rod in the item registry is in the rod table and vice versa.
for (const [key, item] of Object.entries(craft.ITEMS)) {
  if (item.rod) ok(!!fishing.RODS[key], key + ' is a rod the fishing table has never heard of');
}
ok(fishing.PUDDLE < fishing.POOL && fishing.POOL < fishing.SEA,
  'the three sizes of water are not in order');

// --- 2. where you fish decides what you catch --------------------------------------------
{
  const names = (ctx) => fishing.catchesFor(ctx).map(e => e.key);

  const puddle = names({ biome: 'forest', layer: 'surface', water: 4 });
  ok(puddle.length > 0, 'a puddle offers nothing at all, not even junk');
  ok(puddle.every(k => k === 'junk'), 'a puddle offers ' + puddle.join(', '));

  const pond = names({ biome: 'forest', layer: 'surface', water: fishing.POOL });
  ok(pond.includes('bass'), 'a pond has no bass in it');
  ok(!pond.includes('shrimp'), 'a forest pond has shrimp in it');
  ok(!pond.includes('cavefish'), 'a pond on the surface has cave fish in it');

  const sea = names({ biome: 'ocean', layer: 'surface', water: fishing.SEA });
  ok(sea.includes('shrimp') && sea.includes('swordfish'), 'the sea has no sea fish in it');
  ok(sea.includes('crate'), 'the sea holds no crates');
  ok(sea.length > pond.length, 'the sea offers no more than a pond');

  const cold = names({ biome: 'tundra', layer: 'surface', water: fishing.POOL });
  ok(cold.includes('trout') && !cold.includes('perch'), 'cold water fishes like warm');
  const warm = names({ biome: 'jungle', layer: 'surface', water: fishing.POOL });
  ok(warm.includes('perch') && !warm.includes('trout'), 'warm water fishes like cold');

  const cavern = names({ biome: 'forest', layer: 'deep', water: fishing.POOL });
  ok(cavern.includes('cavefish'), 'a flooded cavern has no cave fish');
  ok(!cavern.includes('swordfish'), 'a flooded cavern has swordfish in it');

  // The flooded caverns under an ocean are salt and underground at once, which is the
  // one place that fishes like both.
  const drowned = names({ biome: 'ocean', layer: 'deep', water: fishing.SEA });
  ok(drowned.includes('cavefish') && drowned.includes('shrimp'),
    'the flooded caverns under the sea fish like neither');
}

// --- 3. the draw ---------------------------------------------------------------------------
{
  const sea = { biome: 'ocean', layer: 'surface', water: fishing.SEA };
  // Every roll in range produces something that is in the pool for that place.
  const allowed = new Set(fishing.catchesFor(sea).map(e => e.key));
  for (let r = 0; r < 1; r += 0.001) {
    const got = fishing.rollCatch(sea, r, 1);
    ok(!!got && allowed.has(got.key), 'a roll of ' + r.toFixed(3) + ' produced '
      + (got ? got.key : 'nothing'));
    if (!got || !allowed.has(got.key)) break;
  }
  ok(fishing.rollCatch(sea, 0, 1) !== null, 'a roll of exactly zero caught nothing');
  ok(fishing.rollCatch(sea, 1, 1) !== null, 'a roll of exactly one caught nothing');
  ok(fishing.rollCatch({ biome: 'forest', layer: 'surface', water: 0 }, 0.5, 1) !== null,
    'the driest spot in the world caught nothing, not even junk');

  // A better rod wastes less of your time: the share of junk falls as power rises.
  const junkShare = (power) => {
    let junk = 0;
    const n = 4000;
    for (let i = 0; i < n; i += 1) {
      const got = fishing.rollCatch(sea, i / n, power);
      if (got && got.key === 'junk') junk += 1;
    }
    return junk / n;
  };
  const poor = junkShare(1);
  const good = junkShare(1.9);
  ok(poor > good, 'a better rod does not reduce junk: ' + poor.toFixed(3)
    + ' against ' + good.toFixed(3));
  ok(good > 0, 'a good rod catches no junk at all, which is no longer fishing');
  ok(poor < 0.6, 'even a poor rod should not be mostly junk: ' + poor.toFixed(2));
}

// --- 4. the wait ----------------------------------------------------------------------------
{
  const quick = fishing.biteDelay(0, 1.9, fishing.SEA);
  const slow = fishing.biteDelay(1, 1, fishing.PUDDLE);
  ok(slow > quick, 'a poor rod in a puddle waits no longer than a good one at sea');
  for (const power of [1, 1.45, 1.9]) {
    for (const water of [0, fishing.PUDDLE, fishing.POOL, fishing.SEA, fishing.SEA * 4]) {
      for (const roll of [0, 0.5, 1]) {
        const wait = fishing.biteDelay(roll, power, water);
        ok(wait >= 1.2 && wait <= fishing.BITE_MAX,
          'a wait of ' + wait.toFixed(2) + 's at power ' + power + ' in ' + water + ' water');
      }
    }
  }
  ok(fishing.BITE_WINDOW > 0.5 && fishing.BITE_WINDOW < 3,
    'the window to pull is ' + fishing.BITE_WINDOW + 's');
}

// --- 5. measuring the water ----------------------------------------------------------------
{
  const water = tiles.idOf('water');
  const stone = tiles.idOf('stone');
  const pool = (radius) => ({
    get(x, y) { return (Math.abs(x) <= radius && Math.abs(y) <= radius) ? water : stone; }
  });
  const dry = { get: () => stone };
  ok(fishing.waterAround(dry, tiles, 0, 0) === 0, 'solid rock counted as water');
  const small = fishing.waterAround(pool(1), tiles, 0, 0);
  const big = fishing.waterAround(pool(20), tiles, 0, 0);
  ok(small === 9, 'a three-by-three pool measured ' + small);
  ok(big > fishing.SEA, 'a pool bigger than the survey measured only ' + big);
  ok(big > small, 'a bigger pool did not measure bigger');
  // Lava is not water.
  const lava = { get: () => tiles.idOf('lava') };
  ok(fishing.waterAround(lava, tiles, 0, 0) === 0, 'lava counted as water');
}

// --- 6. crates -------------------------------------------------------------------------------
{
  const seen = new Set();
  for (let i = 0; i < 300; i += 1) {
    const x = i * 7 - 900;
    const y = 300 + (i * 13) % 500;
    const got = fishing.crateContents(rng.unit, 4242, x, y);
    ok(got.length > 0 && got.length <= 3, 'a crate held ' + got.length + ' stacks');
    for (const item of got) {
      ok(item.count > 0, 'a crate held zero ' + item.key);
      ok(craft.nameOf(item.key, tiles) !== item.key, 'a crate held the unnamed ' + item.key);
      seen.add(item.key);
    }
    const again = fishing.crateContents(rng.unit, 4242, x, y);
    ok(JSON.stringify(again) === JSON.stringify(got),
      'a crate at ' + x + ',' + y + ' held different things when asked twice');
  }
  ok(seen.size >= 4, 'crates only ever hold ' + seen.size + ' different things');
}

// --- 7. a fish is food ------------------------------------------------------------------------
{
  const fish = craft.tagMembers('#fish');
  ok(fish.length >= 6, 'only ' + fish.length + ' kinds of fish');
  const catchable = new Set(fishing.CATCHES.map(e => e.key));
  for (const key of fish) {
    ok(catchable.has(key), key + ' is a fish nothing can catch');
  }
  const cook = craft.RECIPES.find(r => r.out.key === 'cooked-fish');
  ok(!!cook, 'there is no way to cook a fish');
  ok(cook && cook.need.some(([k]) => k === '#fish'), 'cooking does not take any fish');
  ok(craft.ITEMS['cooked-fish'].use.heal > 0, 'cooked fish heals nothing');
}

console.log('\n' + fishing.CATCHES.length + ' things in the water, '
  + Object.keys(fishing.RODS).length + ' rods; a puddle offers '
  + fishing.catchesFor({ biome: 'forest', layer: 'surface', water: 4 }).length
  + ', the sea offers '
  + fishing.catchesFor({ biome: 'ocean', layer: 'surface', water: fishing.SEA }).length);
console.log(checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
