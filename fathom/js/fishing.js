'use strict';
// Fishing. A rod, a bobber, a wait, and a window in which to pull.
//
// The design problem is that liquid is everywhere - an ocean, a flooded cavern, a lava
// lake in hell, a bucket's worth in a hole you dug. If every pool fishes the same then
// fishing is a button you press rather than a place you go. So a catch depends on four
// things, and all four are read from where the bobber actually is:
//
//   - **Which liquid.** Water and lava have nothing in common, and lava needs a rod that
//     will survive it.
//   - **How much of it.** Counted, not assumed: a box of tiles around the bobber. A
//     puddle gives junk, a pond gives the local fish, a sea gives everything.
//   - **Which biome.** A jungle pool and a tundra pool are not the same pool.
//   - **Surface or underground.** And those cross: the flooded caverns under a jungle
//     hold something neither the jungle surface nor an ordinary cavern does.
//
// Everything here is a pure function of that context and a roll. The waiting is the only
// stateful part, and it lives on the bobber.

// How much open liquid a spot needs before it is worth fishing. The three bands are the
// whole difference between a puddle and the sea.
const PUDDLE = 24;
const POOL = 90;
const SEA = 300;

const CAST_RANGE = 14;
const BITE_MIN = 2.6;
const BITE_MAX = 9.5;
// The window to pull once it bites: a reaction, not a reflex test.
const BITE_WINDOW = 1.1;

// A rod's power shortens the wait and tilts the draw away from junk. It unlocks nothing,
// with one exception: lava will destroy anything that is not made for it.
const RODS = {
  'wood-rod': { name: 'Wooden Rod', power: 1 },
  'iron-rod': { name: 'Iron Rod', power: 1.45 },
  'gold-rod': { name: 'Gilded Rod', power: 1.9 },
  'hellfire-rod': { name: 'Hellfire Rod', power: 2.1, lava: true }
};

// Which biomes count as what. A catch can name biomes directly or name one of these
// groups, and the groups are what stop every new biome needing its own fish.
const GROUPS = {
  salt: ['ocean', 'beach'],
  cold: ['tundra', 'taiga'],
  lush: ['jungle', 'marsh'],
  dry: ['desert', 'badlands', 'savanna'],
  blighted: ['blight', 'crimson']
};

// Which band of the world a layer belongs to, for fishing purposes. Hell is its own
// thing because what is in it is lava.
function bandOf(layerKey) {
  if (layerKey === 'hell' || layerKey === 'hellcaves') return 'hell';
  if (layerKey === 'caves' || layerKey === 'deep') return 'underground';
  return 'surface';
}

// What is in the liquid.
//
//   liquid  - water or lava; nothing crosses between them
//   min     - the smallest body that can produce it
//   bands   - surface, underground, hell; absent means any
//   biomes  - exact biome keys; groups are expanded below
//   groups  - one of GROUPS above
//
// A catch with no place restriction at all can come out of any body deep enough, which
// is what junk and bass are for: every pool needs something in it.
const CATCHES = [
  // --- anywhere there is water -----------------------------------------------------
  { key: 'junk', weight: 26, min: 0, liquid: 'water' },
  { key: 'bass', weight: 20, min: PUDDLE, liquid: 'water' },
  { key: 'goldfish', weight: 2, min: POOL, liquid: 'water' },
  { key: 'crate', weight: 4, min: POOL, liquid: 'water' },

  // --- the surface, by biome -------------------------------------------------------
  { key: 'trout', weight: 15, min: PUDDLE, liquid: 'water', groups: ['cold'] },
  { key: 'icepike', weight: 7, min: POOL, liquid: 'water', groups: ['cold'] },
  { key: 'frozencrate', weight: 4, min: POOL, liquid: 'water', groups: ['cold'] },

  { key: 'perch', weight: 15, min: PUDDLE, liquid: 'water',
    biomes: ['plains', 'forest', 'highlands'] },
  { key: 'piranha', weight: 14, min: PUDDLE, liquid: 'water', groups: ['lush'] },
  { key: 'junglecrate', weight: 4, min: POOL, liquid: 'water', groups: ['lush'] },
  { key: 'oasiscarp', weight: 13, min: PUDDLE, liquid: 'water', groups: ['dry'] },

  { key: 'shrimp', weight: 14, min: POOL, liquid: 'water', groups: ['salt'] },
  { key: 'swordfish', weight: 6, min: SEA, liquid: 'water', groups: ['salt'] },
  { key: 'oceancrate', weight: 5, min: SEA, liquid: 'water', groups: ['salt'] },

  { key: 'rotgill', weight: 12, min: PUDDLE, liquid: 'water', groups: ['blighted'] },

  // --- underground, and underground by biome ------------------------------------------
  // The second kind is the point: a flooded cavern under a jungle is neither the jungle
  // nor an ordinary cavern, and it holds something that exists nowhere else.
  { key: 'cavefish', weight: 18, min: PUDDLE, liquid: 'water', bands: ['underground'] },
  { key: 'glowfish', weight: 7, min: POOL, liquid: 'water', bands: ['underground'] },
  { key: 'stonecrate', weight: 5, min: POOL, liquid: 'water', bands: ['underground'] },
  { key: 'mudeel', weight: 10, min: POOL, liquid: 'water', bands: ['underground'],
    groups: ['lush'] },
  { key: 'frostminnow', weight: 10, min: POOL, liquid: 'water', bands: ['underground'],
    groups: ['cold'] },
  { key: 'shadowcarp', weight: 10, min: POOL, liquid: 'water', bands: ['underground'],
    groups: ['blighted'] },
  { key: 'deepshrimp', weight: 9, min: POOL, liquid: 'water', bands: ['underground'],
    groups: ['salt'] },

  // --- hell, where the liquid is lava --------------------------------------------------
  { key: 'slag', weight: 22, min: 0, liquid: 'lava' },
  { key: 'flarefin', weight: 16, min: PUDDLE, liquid: 'lava' },
  { key: 'obsidifish', weight: 12, min: POOL, liquid: 'lava' },
  { key: 'magmasnail', weight: 5, min: POOL, liquid: 'lava' },
  { key: 'hellcrate', weight: 5, min: POOL, liquid: 'lava' }
];

// What each kind of crate holds. The plain one is a handful of coin and some ore; the
// rest are worth going somewhere for.
const CRATES = {
  crate: [
    { key: 'coin', min: 30, max: 140, chance: 1 },
    { key: 'iron-bar', min: 2, max: 6, chance: 0.5 },
    { key: 'amethyst', min: 1, max: 3, chance: 0.3 },
    { key: 'rope', min: 10, max: 30, chance: 0.3 }
  ],
  oceancrate: [
    { key: 'coin', min: 80, max: 260, chance: 1 },
    { key: 'shell', min: 4, max: 12, chance: 0.6 },
    { key: 'gold-bar', min: 2, max: 5, chance: 0.4 },
    { key: 'sapphire', min: 1, max: 3, chance: 0.35 },
    { key: 'diving-gear', min: 1, max: 1, chance: 0.06 }
  ],
  junglecrate: [
    { key: 'coin', min: 70, max: 220, chance: 1 },
    { key: 'emerald', min: 1, max: 4, chance: 0.45 },
    { key: 'stinger', min: 2, max: 5, chance: 0.4 },
    { key: 'mahoganywood', min: 15, max: 40, chance: 0.5 },
    { key: 'glowmoss', min: 5, max: 14, chance: 0.4 }
  ],
  frozencrate: [
    { key: 'coin', min: 70, max: 220, chance: 1 },
    { key: 'silver-bar', min: 3, max: 7, chance: 0.5 },
    { key: 'diamond', min: 1, max: 2, chance: 0.2 },
    { key: 'feather-fall', min: 1, max: 1, chance: 0.06 },
    { key: 'ice', min: 20, max: 50, chance: 0.4 }
  ],
  stonecrate: [
    { key: 'coin', min: 60, max: 200, chance: 1 },
    { key: 'crystal', min: 3, max: 9, chance: 0.5 },
    { key: 'topaz', min: 1, max: 4, chance: 0.4 },
    { key: 'ruby', min: 1, max: 2, chance: 0.18 },
    { key: 'torch', min: 10, max: 25, chance: 0.5 }
  ],
  hellcrate: [
    { key: 'coin', min: 150, max: 420, chance: 1 },
    { key: 'cinder', min: 4, max: 12, chance: 0.6 },
    { key: 'obsidian', min: 5, max: 14, chance: 0.5 },
    { key: 'emberite-bar', min: 1, max: 4, chance: 0.3 },
    { key: 'ember-ward', min: 1, max: 1, chance: 0.05 }
  ]
};

// Does this catch belong in this place?
function suits(entry, ctx) {
  if (entry.liquid !== ctx.liquid) return false;
  if (ctx.amount < entry.min) return false;
  if (entry.bands && entry.bands.indexOf(bandOf(ctx.layer)) === -1) return false;
  if (entry.biomes && entry.biomes.indexOf(ctx.biome) === -1) return false;
  if (entry.groups) {
    const inAny = entry.groups.some(g => (GROUPS[g] || []).indexOf(ctx.biome) !== -1);
    if (!inAny) return false;
  }
  return true;
}

// Everything this spot could produce, with its weights. Separated from the rolling so a
// test can ask what a place offers without drawing from it.
//
// Not called `poolFor`: enemy.js already has a function of that name, every module shares
// one global scope in the browser, and two function declarations of the same name do not
// throw - the later one silently wins. Naming it that made the enemy spawner draw from
// the fishing table and crash reading an archetype off a bass.
const FISH_UNDERWORLD_BIOMES = typeof require === 'function' ? require('./tiles.js').UNDERWORLD_BIOMES : UNDERWORLD_BIOMES;
for (const biome of FISH_UNDERWORLD_BIOMES) {
  CATCHES.push({ key: biome.fish.key, weight: 12, min: PUDDLE, liquid: biome.key === 'ember-bloom' ? 'lava' : 'water',
    biomes: [biome.key] });
}

function catchesFor(ctx) {
  return CATCHES.filter(entry => suits(entry, ctx));
}

// Draw one. `roll` is 0..1; `power` is the rod's, which tilts the draw away from junk -
// a better rod does not unlock anything, it wastes less of your time.
const WORTHLESS = new Set(['junk', 'slag']);

function rollCatch(ctx, roll, power) {
  const pool = catchesFor(ctx);
  if (pool.length === 0) return null;
  const weigh = (entry) => (WORTHLESS.has(entry.key)
    ? entry.weight / (power || 1) : entry.weight);
  let total = 0;
  for (const entry of pool) total += weigh(entry);
  let pick = Math.max(0, Math.min(0.999999, roll)) * total;
  for (const entry of pool) {
    pick -= weigh(entry);
    if (pick <= 0) return entry;
  }
  return pool[pool.length - 1];
}

// What a crate holds. Decided from where it was opened, like a pot, so the same crate is
// always the same crate.
function crateContents(unit, seed, x, y, kind) {
  const table = CRATES[kind] || CRATES.crate;
  const out = [];
  for (let i = 0; i < table.length; i += 1) {
    const entry = table[i];
    if (unit(seed, x, y, 9601 + i * 13) > entry.chance) continue;
    const span = entry.max - entry.min + 1;
    const count = entry.min + Math.floor(unit(seed, x, y, 9701 + i * 13) * span);
    out.push({ key: entry.key, count: Math.max(1, count) });
    if (out.length >= 3) break;
  }
  if (out.length === 0) out.push({ key: 'coin', count: table[0].min });
  return out;
}

// How much liquid surrounds a point, counted rather than assumed: it is what separates a
// bucket of water in a hole from the sea. Water and lava are counted apart, because a
// pool of one is not a pool of the other.
const SURVEY = 11;

function surveyLiquid(world, tiles, x, y) {
  let water = 0;
  let lava = 0;
  for (let dy = -SURVEY; dy <= SURVEY; dy += 1) {
    for (let dx = -SURVEY; dx <= SURVEY; dx += 1) {
      const spec = tiles.tile(world.get(x + dx, y + dy));
      if (!spec.liquid) continue;
      if (spec.hot) lava += 1; else water += 1;
    }
  }
  return { water, lava };
}

// Which liquid a tile is, or null if it is not one.
function liquidAt(tiles, id) {
  const spec = tiles.tile(id);
  if (!spec.liquid) return null;
  return spec.hot ? 'lava' : 'water';
}

// How long until a bite. A better rod waits less; a bigger body waits less.
function biteDelay(roll, power, amount) {
  const plenty = Math.min(1, amount / SEA);
  const raw = BITE_MIN + roll * (BITE_MAX - BITE_MIN);
  return Math.max(1.2, (raw / (power || 1)) * (1 - plenty * 0.35));
}

const EXPORTS_fishing = { RODS, CATCHES, CRATES, GROUPS, PUDDLE, POOL, SEA, CAST_RANGE,
  BITE_MIN, BITE_MAX, BITE_WINDOW, SURVEY, WORTHLESS, bandOf, suits, catchesFor,
  rollCatch, crateContents, surveyLiquid, liquidAt, biteDelay };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_fishing;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.fishing = EXPORTS_fishing;
}
