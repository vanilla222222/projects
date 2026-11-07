'use strict';
// Fishing. A rod, a bobber, a wait, and a window in which to pull.
//
// The design problem with fishing in a game like this is that water is everywhere: an
// ocean, a flooded cavern, a bucket's worth in a hole you dug. If any puddle fishes the
// same as the sea then fishing is a button you press rather than a place you go. So the
// catch depends on **where you are fishing and how much water there is**, and the size of
// the pool is measured rather than assumed:
//
//   - A puddle of a few tiles catches almost nothing but junk.
//   - A real pool catches the common fish of wherever it is.
//   - The sea, and the flooded caverns under it, catch everything including crates.
//
// Everything here is a pure function of position, context and a roll. The waiting is the
// only stateful part, and that lives on the bobber.

// How much open water a spot needs before it is worth fishing. Terraria counts tiles of
// liquid in a radius; so does this, and the three bands are the whole difference between
// a puddle and the sea.
const PUDDLE = 24;
const POOL = 90;
const SEA = 300;

// How far out a bobber may be cast, and how long a bite takes.
const CAST_RANGE = 14;
const BITE_MIN = 2.6;
const BITE_MAX = 9.5;
// The window to pull in once it bites. Short enough to be a reaction, long enough not to
// be a reflex test.
const BITE_WINDOW = 1.1;

// A rod's power shortens the wait and improves what comes up.
const RODS = {
  'wood-rod': { name: 'Wooden Rod', power: 1 },
  'iron-rod': { name: 'Iron Rod', power: 1.45 },
  'gold-rod': { name: 'Gilded Rod', power: 1.9 }
};

// What is in the water. `weight` is relative within whatever pool is in play; `min` is
// the smallest water body that can produce it, and `where` restricts it to a kind of
// place. An entry with no `where` can come out of any water deep enough.
const CATCHES = [
  { key: 'junk', weight: 26, min: 0, name: 'Old Boot' },
  { key: 'bass', weight: 22, min: PUDDLE },
  { key: 'trout', weight: 16, min: PUDDLE, where: 'cold' },
  { key: 'perch', weight: 16, min: PUDDLE, where: 'warm' },
  { key: 'shrimp', weight: 14, min: POOL, where: 'salt' },
  { key: 'cavefish', weight: 18, min: POOL, where: 'underground' },
  { key: 'glowfish', weight: 7, min: POOL, where: 'underground' },
  { key: 'swordfish', weight: 6, min: SEA, where: 'salt' },
  { key: 'crate', weight: 5, min: POOL },
  { key: 'goldfish', weight: 2, min: POOL }
];

// What a crate holds when it is opened: the point of fishing for anything other than
// food. Deliberately the kind of thing you would otherwise have to dig for.
const CRATE_TABLE = [
  { key: 'coin', min: 30, max: 140, chance: 1 },
  { key: 'iron-bar', min: 2, max: 6, chance: 0.5 },
  { key: 'gold-bar', min: 1, max: 3, chance: 0.22 },
  { key: 'amethyst', min: 1, max: 3, chance: 0.3 },
  { key: 'sapphire', min: 1, max: 2, chance: 0.16 },
  { key: 'fallenstar', min: 1, max: 2, chance: 0.2 },
  { key: 'rope', min: 10, max: 30, chance: 0.3 }
];

// Which kinds of place a spot counts as. A spot can be several at once - the flooded
// caverns under an ocean are salt and underground together - which is how the deep
// catches end up being the interesting ones.
function placeKinds(biomeKey, layerKey) {
  const kinds = [];
  if (biomeKey === 'ocean' || biomeKey === 'beach') kinds.push('salt');
  if (biomeKey === 'tundra' || biomeKey === 'taiga') kinds.push('cold');
  else kinds.push('warm');
  if (layerKey !== 'surface' && layerKey !== 'sky' && layerKey !== 'space') {
    kinds.push('underground');
  }
  return kinds;
}

// How much water surrounds a point: the count of liquid tiles in a box around it. The
// box is what separates a puddle from the sea, and counting it rather than assuming it
// is what stops a bucket of water in a hole fishing like an ocean.
const SURVEY = 11;

function waterAround(world, tiles, x, y) {
  let wet = 0;
  for (let dy = -SURVEY; dy <= SURVEY; dy += 1) {
    for (let dx = -SURVEY; dx <= SURVEY; dx += 1) {
      const spec = tiles.tile(world.get(x + dx, y + dy));
      if (spec.liquid && !spec.hot) wet += 1;
    }
  }
  return wet;
}

// What this spot could produce, with its weights. Separated from the rolling so a test
// can ask what a place offers without drawing from it.
//
// Not `poolFor`: enemy.js already has a function of that name, every module shares one
// global scope in the browser, and two function declarations of the same name do not
// throw - the later one silently wins. This file loads after enemy.js, so naming it
// `poolFor` meant the enemy spawner started drawing from the fishing table and crashed
// trying to read an archetype off a bass.
function catchesFor(ctx) {
  const kinds = placeKinds(ctx.biome, ctx.layer);
  return CATCHES.filter(entry => {
    if (ctx.water < entry.min) return false;
    if (entry.where && kinds.indexOf(entry.where) === -1) return false;
    return true;
  });
}

// Draw one catch. `roll` is 0..1; `power` is the rod's, which tilts the draw away from
// junk - a better rod does not unlock anything, it simply wastes less of your time.
function rollCatch(ctx, roll, power) {
  const pool = catchesFor(ctx);
  if (pool.length === 0) return null;
  let total = 0;
  for (const entry of pool) {
    total += entry.key === 'junk' ? entry.weight / (power || 1) : entry.weight;
  }
  let pick = Math.max(0, Math.min(0.999999, roll)) * total;
  for (const entry of pool) {
    pick -= entry.key === 'junk' ? entry.weight / (power || 1) : entry.weight;
    if (pick <= 0) return entry;
  }
  return pool[pool.length - 1];
}

// What a crate holds. Decided from where it was caught, like a pot, so the same crate is
// the same crate.
function crateContents(unit, seed, x, y) {
  const out = [];
  for (let i = 0; i < CRATE_TABLE.length; i += 1) {
    const entry = CRATE_TABLE[i];
    if (unit(seed, x, y, 9601 + i * 13) > entry.chance) continue;
    const span = entry.max - entry.min + 1;
    const count = entry.min + Math.floor(unit(seed, x, y, 9701 + i * 13) * span);
    out.push({ key: entry.key, count: Math.max(1, count) });
    if (out.length >= 3) break;
  }
  if (out.length === 0) out.push({ key: 'coin', count: 40 });
  return out;
}

// How long until a bite. A better rod waits less; a bigger body of water waits less.
function biteDelay(roll, power, water) {
  const plenty = Math.min(1, water / SEA);
  const span = BITE_MAX - BITE_MIN;
  const raw = BITE_MIN + roll * span;
  return Math.max(1.2, (raw / (power || 1)) * (1 - plenty * 0.35));
}

const EXPORTS_fishing = { RODS, CATCHES, CRATE_TABLE, PUDDLE, POOL, SEA, CAST_RANGE,
  BITE_MIN, BITE_MAX, BITE_WINDOW, SURVEY, placeKinds, waterAround, catchesFor, rollCatch,
  crateContents, biteDelay };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_fishing;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.fishing = EXPORTS_fishing;
}
