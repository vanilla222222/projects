'use strict';
// Infinite-in-x world generation. Every function here is pure in the absolute world
// coordinate: a column's terrain depends on its own x and nothing else, and a tile depends
// on its own (x, y). Chunks therefore agree at their seams by construction rather than by
// correction. Structures are stamped from a margin scan so a tree rooted in one chunk still
// appears in its neighbour; STRUCTURE_MARGIN must exceed the widest structure's half-width.

const CHUNK = 48;
const WORLD_H = 1056;
const SKY_H = 192;
const STRUCTURE_MARGIN = 14;

// Biomes sit in a climate space rather than a line. The old model picked a biome by
// flooring a single 1-D field, which forces every biome into a fixed order: tundra could
// never border desert, and there was nowhere to put an ocean. Now two independent fields,
// temperature and moisture, place each column in a 2-D space, and each biome owns a region
// of it. Identity is whichever biome's weight is highest; height bias is the weighted
// average of the same weights. Using one set of weights for both is what keeps terrain
// continuous across a border while the surface material still changes abruptly.
//
// `bias` is how high the biome sits. `sub` is what lies under the filler. `wall` is the
// background it leaves behind. `tree` names a species in TREES, or 'none'.
const BIOMES = [
  { key: 'tundra', name: 'Tundra', temp: 0.08, moist: 0.35, bias: -8, rock: 'ice', rockMix: 0.34, cave: 'narrow',
    surface: 'snow', filler: 'snow', sub: 'dirt', wall: 'snowwall', tree: 'pine', grass: false },
  { key: 'taiga', name: 'Taiga', temp: 0.2, moist: 0.72, bias: 2, rock: 'ice', rockMix: 0.18, cave: 'narrow',
    surface: 'snow', filler: 'dirt', sub: 'dirt', wall: 'snowwall', tree: 'pine', grass: false },
  { key: 'highlands', name: 'Highlands', temp: 0.3, moist: 0.18, bias: -26, rock: 'granite', rockMix: 0.42, cave: 'shafts',
    surface: 'stone', filler: 'stone', sub: 'stone', wall: 'stonewall', tree: 'none', grass: false },
  { key: 'plains', name: 'Plains', temp: 0.5, moist: 0.42, bias: 0, cave: 'normal',
    surface: 'grass', filler: 'dirt', sub: 'dirt', wall: 'dirtwall', tree: 'oak', grass: true },
  { key: 'forest', name: 'Deepwood', temp: 0.46, moist: 0.68, bias: 4, cave: 'normal',
    surface: 'grass', filler: 'dirt', sub: 'dirt', wall: 'dirtwall', tree: 'oak', grass: true },
  { key: 'marsh', name: 'Mire', temp: 0.55, moist: 0.93, bias: 18, rock: 'mud', rockMix: 0.3, cave: 'rooms', aquifer: true,
    surface: 'peat', filler: 'peat', sub: 'mud', wall: 'mudwall', tree: 'oak', grass: true },
  { key: 'savanna', name: 'Savanna', temp: 0.8, moist: 0.45, bias: 2, rock: 'redclay', rockMix: 0.2, cave: 'normal',
    surface: 'grass', filler: 'dirt', sub: 'redclay', wall: 'dirtwall', tree: 'acacia', grass: true },
  { key: 'jungle', name: 'Jungle', temp: 0.85, moist: 0.86, bias: 8, rock: 'mud', rockMix: 0.46, cave: 'caverns', aquifer: true,
    surface: 'junglegrass', filler: 'mud', sub: 'mud', wall: 'mudwall', tree: 'jungle', grass: true },
  { key: 'badlands', name: 'Badlands', temp: 0.66, moist: 0.08, bias: -14, rock: 'sandstone', rockMix: 0.5, cave: 'shafts',
    surface: 'redclay', filler: 'redclay', sub: 'sandstone', wall: 'redclaywall', tree: 'none', grass: false },
  { key: 'desert', name: 'Dunes', temp: 0.94, moist: 0.13, bias: 14, rock: 'sandstone', rockMix: 0.58, cave: 'halls',
    surface: 'sand', filler: 'sand', sub: 'sandstone', wall: 'sandwall', tree: 'none', grass: false },

  // Overlays. These are never selected by climate; they replace whatever climate chose,
  // so they are listed after it and carry their own bias handling.
  { key: 'beach', name: 'Shore', temp: -1, moist: -1, bias: 0,
    surface: 'sand', filler: 'sand', sub: 'sandstone', wall: 'sandwall', tree: 'none', grass: false, overlay: true },
  { key: 'ocean', name: 'Ocean', temp: -1, moist: -1, bias: 0, cave: 'caverns', drowned: true,
    surface: 'sand', filler: 'sand', sub: 'sandstone', wall: 'sandwall', tree: 'none', grass: false, overlay: true },
  { key: 'blight', name: 'The Blight', temp: -1, moist: -1, bias: 0, cave: 'chasms', trunk: 'blighttrunk',
    surface: 'blightgrass', filler: 'dirt', sub: 'blight', wall: 'blightwall', tree: 'blighted', grass: false, overlay: true },
  { key: 'crimson', name: 'The Crimson', temp: -1, moist: -1, bias: 0, cave: 'chasms', trunk: 'fleshtrunk',
    surface: 'fleshgrass', filler: 'dirt', sub: 'flesh', wall: 'fleshwall', tree: 'blighted', grass: false, overlay: true }
];

// What each biome plants on its own surface. `chance` is per column; `props` are weighted
// by their own numbers. A biome with nothing here gets a bare surface, which is itself a
// statement: the badlands are meant to look dead.
const FLORA = {
  plains:    { chance: 0.62, props: [['tuft', 7], ['flower', 3]] },
  forest:    { chance: 0.74, props: [['tuft', 8], ['flower', 2], ['mushroom', 1]] },
  taiga:     { chance: 0.34, props: [['tuft', 6], ['frostshard', 2]] },
  tundra:    { chance: 0.22, props: [['frostshard', 5], ['deadbush', 1]] },
  highlands: { chance: 0.18, props: [['tuft', 3], ['deadbush', 2]] },
  savanna:   { chance: 0.52, props: [['tuft', 8], ['deadbush', 3], ['flower', 1]] },
  jungle:    { chance: 0.88, props: [['jungletuft', 7], ['bamboo', 4], ['flower', 1], ['mushroom', 1]] },
  marsh:     { chance: 0.7, props: [['reeds', 7], ['mushroom', 3], ['jungletuft', 2]] },
  desert:    { chance: 0.14, props: [['cactus', 5], ['deadbush', 3]] },
  badlands:  { chance: 0.1, props: [['deadbush', 6], ['cactus', 1]] },
  beach:     { chance: 0.3, props: [['shell', 6], ['deadbush', 1]] },
  ocean:     { chance: 0.55, props: [['seaweed', 6], ['coral', 3], ['shell', 2]] },
  blight:    { chance: 0.5, props: [['blightshroom', 6], ['deadbush', 3]] },
  crimson:   { chance: 0.5, props: [['fleshshroom', 6], ['deadbush', 3]] }
};

// Resolve a weighted prop list with a single hash draw, so the choice is pure in x.
function pickProp(seed, x, props) {
  let total = 0;
  for (const [, w] of props) total += w;
  let roll = unit(seed, x, 0, 2131) * total;
  for (const [key, w] of props) {
    roll -= w;
    if (roll <= 0) return key;
  }
  return props[0][0];
}

const BY_BIOME = {};
for (const b of BIOMES) BY_BIOME[b.key] = b;
const CLIMATE_BIOMES = BIOMES.filter(b => !b.overlay);

// Sea level. Terrain is allowed to fall below it; where it does, the gap fills with water.
const SEA_LEVEL = SKY_H + 104;
const BEACH_BAND = 10;

// --- the fields -------------------------------------------------------------------------
// All three are pure in x, so two chunks asking about the same column get the same answer.

// Summed octaves of value noise pile up around the middle: measured over 60,000 columns,
// the raw fields sat between 0.29 and 0.69 at the 5th and 95th percentiles. Biomes placed
// at the corners of climate space were therefore unreachable, and three of ten never
// generated at all. The stretch below opens the measured band out to very nearly the full
// range, which is what puts desert and badlands on the map.
const CLIMATE_STRETCH = 2.25;

function stretch(v) {
  return Math.min(1, Math.max(0, (v - 0.5) * CLIMATE_STRETCH + 0.5));
}

function temperature(seed, x) {
  const broad = fbm1(seed, x * 0.00042, 311, 3, 2, 0.52);
  const local = fbm1(seed, x * 0.0036, 733, 2, 2, 0.5);
  return stretch(broad * 0.78 + local * 0.22);
}

function moisture(seed, x) {
  const broad = fbm1(seed, x * 0.00051, 419, 3, 2, 0.5);
  const local = fbm1(seed, x * 0.0041, 821, 2, 2, 0.5);
  return stretch(broad * 0.74 + local * 0.26);
}

// How much land there is here. Below zero is sea floor, and the deeper it goes the deeper
// the ocean. A separate low-frequency field so coastlines do not track the climate.
function continent(seed, x) {
  const base = fbm1(seed, x * 0.00036, 577, 4, 2, 0.5);
  const detail = fbm1(seed, x * 0.0029, 643, 2, 2, 0.5);
  return (base * 0.82 + detail * 0.18 - 0.42) * 2.6;
}

// Smooth membership in each climate biome. The kernel is wide enough that neighbouring
// biomes always overlap, which is what makes the blended height bias continuous.
function climateWeights(seed, x) {
  const t = temperature(seed, x);
  const m = moisture(seed, x);
  const weights = new Array(CLIMATE_BIOMES.length);
  for (let i = 0; i < CLIMATE_BIOMES.length; i += 1) {
    const b = CLIMATE_BIOMES[i];
    const dt = (t - b.temp) / 0.26;
    const dm = (m - b.moist) / 0.3;
    weights[i] = Math.exp(-(dt * dt + dm * dm));
  }
  return weights;
}

// Columns are asked about repeatedly, once per tile in the column and again by trees and
// decoration. The cache is keyed by seed and x only, so it never makes a chunk's answer
// depend on which chunk asked.
const COLUMN_CACHE_SIZE = 4096;
const columnCache = new Array(COLUMN_CACHE_SIZE);
let columnCacheSeed = null;

function columnOf(seed, x) {
  if (columnCacheSeed !== seed) {
    columnCache.length = 0;
    columnCache.length = COLUMN_CACHE_SIZE;
    columnCacheSeed = seed;
  }
  const slot = ((x % COLUMN_CACHE_SIZE) + COLUMN_CACHE_SIZE) % COLUMN_CACHE_SIZE;
  const hit = columnCache[slot];
  if (hit && hit.x === x) return hit;
  const built = buildColumn(seed, x);
  columnCache[slot] = built;
  return built;
}

// Corruption and crimson. The world is divided into bands; a band either carries a blight
// or does not, and a hash of the band index decides which of the two it is, so the pair
// never overlap and neither has to win a fight for space.
const BLIGHT_BAND = 420;

function blightAt(seed, x) {
  const band = Math.floor(x / BLIGHT_BAND);
  if (unit(seed, band, 0, 3301) > 0.3) return null;
  const centre = band * BLIGHT_BAND + BLIGHT_BAND * (0.25 + unit(seed, band, 0, 3307) * 0.5);
  const half = 70 + unit(seed, band, 0, 3313) * 110;
  const edge = (fbm1(seed, x * 0.02, 3319, 2, 2, 0.5) - 0.5) * 34;
  if (Math.abs(x - centre) + edge > half) return null;
  return unit(seed, band, 0, 3323) < 0.5 ? 'blight' : 'crimson';
}

function buildColumn(seed, x) {
  const weights = climateWeights(seed, x);
  let best = 0;
  let total = 0;
  let blended = 0;
  for (let i = 0; i < weights.length; i += 1) {
    if (weights[i] > weights[best]) best = i;
    total += weights[i];
    blended += weights[i] * CLIMATE_BIOMES[i].bias;
  }
  const bias = total > 0 ? blended / total : 0;
  const land = continent(seed, x);

  // Height first, because whether this column is shore or sea depends on where it lands.
  const rolling = (fbm1(seed, x * 0.0085, 11, 4, 2, 0.5) - 0.5) * 48;
  const hills = (fbm1(seed, x * 0.0022, 29, 3, 2, 0.55) - 0.5) * 132;
  const detail = (fbm1(seed, x * 0.055, 53, 2, 2, 0.5) - 0.5) * 9;
  // Below sea level the shape flattens into a basin rather than keeping its hills, so an
  // ocean floor reads as a floor and not as drowned countryside.
  // Land sits above sea level by default; only a column whose continent field has gone
  // negative is pushed below it. `relief` flattens the hills as the floor drops, so an
  // ocean bed reads as a bed rather than as drowned countryside.
  const shelf = Math.max(0, -land);
  const relief = Math.max(0, 1 - shelf * 2.2);
  let h = SEA_LEVEL - 34 + (rolling + hills) * relief + detail + bias * relief
    + shelf * 265 - Math.max(0, land) * 12;
  h = Math.max(SKY_H + 24, Math.min(WORLD_H - 420, Math.round(h)));

  // Identity. Sea and shore override climate; a blight overrides everything but the sea.
  let biome = CLIMATE_BIOMES[best];
  if (h > SEA_LEVEL) biome = BY_BIOME.ocean;
  else if (h > SEA_LEVEL - BEACH_BAND) biome = BY_BIOME.beach;
  else {
    const blight = blightAt(seed, x);
    if (blight) biome = BY_BIOME[blight];
  }
  return { x, biome, climate: CLIMATE_BIOMES[best], height: h, bias, land, weights };
}

function biomeAt(seed, x) {
  return columnOf(seed, x).biome;
}

// The climate biome under an overlay: what this column would be without sea or blight.
// Used for the strata, so a blighted forest still has forest rock beneath it.
function climateAt(seed, x) {
  return columnOf(seed, x).climate;
}

function biomeIndex(seed, x) {
  return BIOMES.indexOf(biomeAt(seed, x));
}

function heightBias(seed, x) {
  return columnOf(seed, x).bias;
}

function surfaceHeight(seed, x) {
  return columnOf(seed, x).height;
}

// Caves are not one shape everywhere. Each profile tunes three things: how wide the
// passages are, how readily they open into rooms, and how much the vertical ridged field
// dominates, which is what turns a cave system into shafts or into chasms. This is where
// an underground actually gets its character; the materials alone are just a palette.
const CAVE_PROFILES = {
  normal:  { scale: 0.028, rooms: 0.38, threshold: 0.605, vertical: 0, roomScale: 0.016 },
  // Tundra: tight, winding, little open space.
  narrow:  { scale: 0.038, rooms: 0.22, threshold: 0.655, vertical: 0, roomScale: 0.02 },
  // Desert: broad flat halls carved along the bedding planes of the sandstone.
  halls:   { scale: 0.019, rooms: 0.54, threshold: 0.565, vertical: -0.22, roomScale: 0.0105 },
  // Jungle: enormous chambers, the largest in the world.
  caverns: { scale: 0.015, rooms: 0.6, threshold: 0.54, vertical: 0, roomScale: 0.009 },
  // Highlands and badlands: vertical shafts punched through the rock.
  shafts:  { scale: 0.03, rooms: 0.24, threshold: 0.6, vertical: 0.42, roomScale: 0.018 },
  // The blights: narrow vertical chasms that run a long way down.
  chasms:  { scale: 0.026, rooms: 0.2, threshold: 0.58, vertical: 0.66, roomScale: 0.017 },
  rooms:   { scale: 0.022, rooms: 0.52, threshold: 0.575, vertical: -0.1, roomScale: 0.013 }
};

function caveProfile(column) {
  const key = (column.biome.cave) || (column.climate && column.climate.cave) || 'normal';
  return CAVE_PROFILES[key] || CAVE_PROFILES.normal;
}

function caveDensity(seed, x, y, depth, column) {
  const p = column ? caveProfile(column) : CAVE_PROFILES.normal;
  const tunnels = ridged2(seed, x * p.scale, y * p.scale, 601, 4);
  const rooms = fbm2(seed, x * p.roomScale, y * (p.roomScale * 1.35), 727, 3, 2, 0.5);
  const squeeze = Math.min(1, depth / 90);
  let d = tunnels * (1 - p.rooms) + rooms * p.rooms * squeeze;
  // A positive vertical term rewards columns that line up, which reads as a shaft; a
  // negative one rewards rows, which reads as a flat-roofed hall.
  if (p.vertical !== 0) {
    const grain = ridged2(seed, x * p.scale * 2.6, y * p.scale * 0.34, 883, 3);
    d += (grain - 0.5) * p.vertical;
  }
  return d;
}

function caveThreshold(column) {
  return (column ? caveProfile(column) : CAVE_PROFILES.normal).threshold;
}

// How far down standing water reaches. Beneath an ocean the sea soaks into the rock, so
// the caverns under it are flooded: an underground ocean, which is the one piece of this
// Terraria does not have. A mire has a shallow water table for the same reason.
function floodFloor(seed, x, column) {
  if (column.biome.drowned) {
    const reach = 110 + fbm1(seed, x * 0.004, 3407, 2, 2, 0.5) * 120;
    return column.height + reach;
  }
  if (column.climate && column.climate.aquifer) {
    const reach = 10 + fbm1(seed, x * 0.006, 3413, 2, 2, 0.5) * 34;
    return column.height + reach;
  }
  return -1;
}

function stratum(seed, x, y, depth, column) {
  const jitter = (fbm1(seed, x * 0.02, 409, 2, 2, 0.5) - 0.5) * 22;
  if (depth < 7 + jitter * 0.2) return 'surface';
  // A blight's own rock runs well below its grass, so digging out of one takes effort.
  if (column && (column.biome.key === 'blight' || column.biome.key === 'crimson')
    && depth < 66 + jitter) return 'blighted';
  if (depth < 46 + jitter) return 'filler';
  if (depth < 300 + jitter * 2) return 'stone';
  if (depth < 540 + jitter * 2) return 'granite';
  if (depth < 760 + jitter * 2) return 'basalt';
  return 'slate';
}

const ORE_BANDS = [
  { key: 'copper', from: 20, to: 360, salt: 1201, rarity: 0.782, size: 0.085 },
  { key: 'iron', from: 60, to: 520, salt: 1301, rarity: 0.796, size: 0.08 },
  { key: 'silver', from: 180, to: 680, salt: 1401, rarity: 0.818, size: 0.072 },
  { key: 'gold', from: 300, to: 820, salt: 1501, rarity: 0.833, size: 0.068 },
  { key: 'cobalt', from: 520, to: 980, salt: 1601, rarity: 0.846, size: 0.064 },
  { key: 'emberite', from: 740, to: WORLD_H, salt: 1701, rarity: 0.862, size: 0.058 }
];

function oreAt(seed, x, y, depth) {
  for (const band of ORE_BANDS) {
    if (depth < band.from || depth > band.to) continue;
    const blob = fbm2(seed, x * band.size, y * band.size, band.salt, 2, 2, 0.5);
    if (blob > band.rarity) return band.key;
  }
  return null;
}

function baseTileAt(seed, x, y) {
  if (y < 0 || y >= WORLD_H) return AIR;
  const column = columnOf(seed, x);
  const surface = column.height;
  // Above the ground: air, unless this column's ground lies below sea level, in which
  // case everything between the two is water. That single rule is the whole ocean.
  if (y < surface) return y >= SEA_LEVEL ? idOf('water') : AIR;

  const depth = y - surface;
  const biome = column.biome;

  if (depth > 4 && caveDensity(seed, x, y, depth, column) > caveThreshold(column)) {
    const glow = fbm2(seed, x * 0.09, y * 0.09, 1901, 2, 2, 0.5);
    if (depth > 120 && glow > 0.895) return idOf('crystal');
    // A cave below the water table is not a cave, it is a flooded one. Everything above
    // sea level stays dry, so a cavern that breaches the surface drains rather than
    // holding an impossible column of water.
    const flood = floodFloor(seed, x, column);
    if (flood > 0 && y <= flood && y >= SEA_LEVEL) return idOf('water');
    return AIR;
  }

  const layer = stratum(seed, x, y, depth, column);
  if (layer === 'surface') {
    if (depth === 0) return idOf(biome.surface);
    return idOf(biome.filler);
  }
  if (layer === 'filler') {
    const pocket = fbm2(seed, x * 0.07, y * 0.07, 1801, 2, 2, 0.5);
    if (pocket > 0.84) return idOf(biome.sub);
    if (biome.filler === 'snow') return idOf('dirt');
    return idOf(biome.filler);
  }
  // A blight reaches below its grass: the stone under it is its own, for a while.
  if (layer === 'blighted') {
    const ore = oreAt(seed, x, y, depth);
    if (ore) return idOf(ore);
    return idOf(biome.sub);
  }

  const ore = oreAt(seed, x, y, depth);
  if (ore) return idOf(ore);
  if (layer === 'stone') {
    // Each biome stains its own stone layer with its own rock, mixed by a noise field so
    // the boundary is a gradient of veins rather than a line.
    const climate = column.climate;
    if (climate.rock) {
      const mix = fbm2(seed, x * 0.034, y * 0.034, 1973, 3, 2, 0.5);
      if (mix > 1 - climate.rockMix) return idOf(climate.rock);
    }
    const vein = fbm2(seed, x * 0.05, y * 0.05, 1951, 2, 2, 0.5);
    if (vein > 0.88) return idOf(climate.key === 'jungle' ? 'mud' : 'clay');
    return idOf('stone');
  }
  return idOf(layer);
}

const TREES = {
  oak: { height: [6, 10], spacing: 11, canopy: 4, chance: 0.5 },
  pine: { height: [9, 14], spacing: 10, canopy: 3, chance: 0.55, conifer: true },
  jungle: { height: [8, 13], spacing: 10, canopy: 4, chance: 0.62, vines: true },
  // Flat-topped and sparse: a savanna reads as savanna because of the gaps between trees.
  acacia: { height: [5, 8], spacing: 17, canopy: 5, chance: 0.34, flat: true },
  // Blighted trees are bare: no canopy at all, just a crooked trunk.
  blighted: { height: [5, 11], spacing: 9, canopy: 0, chance: 0.5, bare: true },
  none: null
};

function treeAt(seed, x) {
  const column = columnOf(seed, x);
  const biome = column.biome;
  const spec = TREES[biome.tree];
  if (!spec) return null;
  // Nothing roots underwater, and nothing roots on a beach.
  if (column.height >= SEA_LEVEL - 2) return null;
  if (((x % spec.spacing) + spec.spacing) % spec.spacing !== 0) return null;
  if (unit(seed, x, 0, 2003) > spec.chance) return null;
  const span = spec.height[1] - spec.height[0];
  const height = spec.height[0] + Math.floor(unit(seed, x, 0, 2011) * (span + 1));
  const root = column.height;
  if (baseTileAt(seed, x, root) !== idOf(biome.surface)) return null;
  return { x, root, height, canopy: spec.canopy, kind: biome.tree, spec,
    trunk: biome.trunk || 'trunk' };
}

// The canopy is an egg, wider above the trunk top than below it, with its edge eroded by a
// per-tile hash. A solid ellipse of leaf tiles reads as a rectangular hedge once several
// trees stand together; a ragged edge reads as foliage.
function stampTree(write, seed, tree) {
  const trunk = idOf(tree.trunk || 'trunk');
  const leaf = idOf('leaves');
  const spec = tree.spec || TREES[tree.kind] || {};
  for (let i = 1; i <= tree.height; i += 1) write(tree.x, tree.root - i, trunk);
  const top = tree.root - tree.height;

  // A blighted tree has no canopy: a few crooked branches and nothing else.
  if (spec.bare) {
    for (let i = 2; i < tree.height; i += 2) {
      if (unit(seed, tree.x, i, 2041) > 0.55) continue;
      const dir = unit(seed, tree.x, i, 2043) < 0.5 ? -1 : 1;
      const len = 1 + Math.floor(unit(seed, tree.x, i, 2047) * 2);
      for (let j = 1; j <= len; j += 1) write(tree.x + dir * j, tree.root - i, trunk);
    }
    return;
  }

  // Branches. Without them a trunk is a pole with a hat, which is exactly how the first
  // version read. A branch is two or three trunk tiles stepping outward and up, with a
  // tuft of leaves on its end, placed only on the upper half so the lower trunk stays
  // clear enough to walk past.
  if (!spec.conifer) {
    const from = Math.max(2, Math.floor(tree.height * 0.45));
    for (let i = from; i < tree.height - 1; i += 2) {
      if (unit(seed, tree.x, i, 2051) > 0.42) continue;
      const dir = unit(seed, tree.x, i, 2053) < 0.5 ? -1 : 1;
      const len = 1 + Math.floor(unit(seed, tree.x, i, 2057) * 2);
      let bx = tree.x;
      let by = tree.root - i;
      for (let j = 0; j < len; j += 1) {
        bx += dir;
        if (j > 0) by -= 1;
        write(bx, by, trunk);
      }
      for (let lx = -1; lx <= 1; lx += 1) {
        for (let ly = -1; ly <= 0; ly += 1) {
          if (lx === 0 && ly === 0) continue;
          write(bx + lx, by + ly, leaf);
        }
      }
    }
  }

  // A root flare: one tile either side at the base, so a trunk meets the ground instead
  // of being planted in it like a post.
  if (unit(seed, tree.x, 0, 2059) < 0.7) {
    write(tree.x - 1, tree.root - 1, trunk);
  }
  if (unit(seed, tree.x, 0, 2061) < 0.7) {
    write(tree.x + 1, tree.root - 1, trunk);
  }

  const r = tree.canopy;
  for (let dy = -r - 1; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      // Conifers taper to a point, flat-tops spread sideways, everything else is an egg.
      let stretch;
      if (spec.conifer) stretch = dy > 0 ? dy / 0.95 : dy / 1.9;
      else if (spec.flat) stretch = dy > 0 ? dy / 0.45 : dy / 0.8;
      else stretch = dy > 0 ? dy / 0.72 : dy / 1.25;
      const squash = spec.flat ? 1.25 : 1;
      const ratio = Math.sqrt((dx * dx) / (r * r * squash * squash)
        + (stretch * stretch) / (r * r));
      if (ratio > 1) continue;
      if (ratio > 0.58 && unit(seed, tree.x * 31 + dx, top + dy, 2029) < (ratio - 0.58) * 2.3) continue;
      if (dx === 0 && dy > 1) continue;
      write(tree.x + dx, top + dy - 1, leaf);
    }
  }
  if (spec.vines) {
    for (let dx = -r; dx <= r; dx += 2) {
      const len = 1 + Math.floor(unit(seed, tree.x + dx, tree.root, 2017) * 4);
      for (let i = 0; i < len; i += 1) write(tree.x + dx, top + i, idOf('vine'));
    }
  }
}

function decorate(write, seed, x) {
  const column = columnOf(seed, x);
  const biome = column.biome;
  const surface = column.height;
  const flora = FLORA[biome.key];

  if (flora && unit(seed, x, 0, 2101) < flora.chance) {
    const key = pickProp(seed, x, flora.props);
    const underwater = surface > SEA_LEVEL;
    // Seaweed and coral only grow submerged; everything else only grows in air. Shells
    // are the exception that proves the rule: they belong on the sea bed and on the
    // beach alike, which is the one place a player expects to find them.
    const wetOnly = key === 'seaweed' || key === 'coral';
    const anywhere = key === 'shell';
    if (anywhere || wetOnly === underwater) {
      if (key === 'bamboo') {
        // Bamboo is a stalk, not a tuft: it grows several tiles up from its root.
        const tall = 3 + Math.floor(unit(seed, x, 0, 2137) * 5);
        for (let i = 1; i <= tall; i += 1) write(x, surface - i, idOf('bamboo'));
      } else if (key === 'cactus') {
        const tall = 2 + Math.floor(unit(seed, x, 0, 2139) * 3);
        for (let i = 1; i <= tall; i += 1) write(x, surface - i, idOf('cactus'));
      } else if (key === 'seaweed') {
        // Clamped to the water above it, or a stalk in a shallow bay grows out into the
        // air. The depth here is exactly how far the sea bed sits below sea level.
        const room = surface - SEA_LEVEL;
        const tall = Math.min(room, 1 + Math.floor(unit(seed, x, 0, 2141) * 4));
        for (let i = 1; i <= tall; i += 1) write(x, surface - i, idOf('seaweed'));
      } else {
        write(x, surface - 1, idOf(key));
      }
    }
  }

  // Underground growth: moss near the surface, mushrooms deep, and the blights' own caps
  // wherever their rock reaches. Placed on the ceiling-facing side of any solid floor.
  const blighted = biome.key === 'blight' || biome.key === 'crimson';
  for (let y = surface + 1; y < WORLD_H; y += 1) {
    const depth = y - surface;
    if (depth < 24) continue;
    if (unit(seed, x, y, 2203) < 0.9945) continue;
    if (baseTileAt(seed, x, y) !== AIR) continue;
    if (baseTileAt(seed, x, y + 1) === AIR) continue;
    let key;
    if (blighted && depth < 90) key = biome.key === 'blight' ? 'blightshroom' : 'fleshshroom';
    else if (depth > 200) key = 'mushroom';
    else key = 'glowmoss';
    write(x, y, idOf(key));
  }
}

// The wall behind a tile, which is what remains visible when the block is mined out. It is
// chosen from the stratum rather than the block, so a cave cut through stone still shows
// stone wall, and an ore pocket does not leave an ore-coloured hole.
function baseWallAt(seed, x, y) {
  if (y < 0 || y >= WORLD_H) return 0;
  const column = columnOf(seed, x);
  const depth = y - column.height;
  if (depth < 0) return 0;
  const layer = stratum(seed, x, y, depth, column);
  if (layer === 'surface' || layer === 'filler' || layer === 'blighted') {
    return wallIdOf(column.biome.wall);
  }
  if (layer === 'stone') return wallIdOf('stonewall');
  if (layer === 'granite') return wallIdOf('granitewall');
  if (layer === 'basalt') return wallIdOf('basaltwall');
  return wallIdOf('slatewall');
}

// Whether a structure or prop may be stamped over whatever is already there. Foliage and
// leaves only ever fill empty space: a prop must never replace a tree trunk, a block, or
// another prop. Water counts as empty for the things that grow in it, which is how
// seaweed and coral reach the sea bed.
//
// This used to be written out twice, once in generateChunk and once in the seam test's
// reference builder. Updating one and not the other made the two disagree, and since the
// test's whole job is to prove they agree, the duplicate quietly turned the oracle into a
// liar. One copy, exported, used by both.
const GROWS_IN_WATER = ['seaweed', 'coral', 'shell'];
const WET_ONLY = ['seaweed', 'coral'];

function canStamp(existing, id) {
  const spec = tile(id);
  if (!spec.decor && id !== idOf('leaves') && id !== idOf('vine')) return true;
  if (existing === AIR) return true;
  if (existing !== idOf('water')) return false;
  return GROWS_IN_WATER.indexOf(spec.key) !== -1;
}

// Identity helpers the live world asks for, so chunks.js never needs its own copy of the
// tile registry just to tell water from rock.
function isLiquidId(id) {
  return !!tile(id).liquid;
}

function isSolidId(id) {
  return !!tile(id).solid;
}

function generateChunk(seed, cx, cy) {
  const tiles = new Uint8Array(CHUNK * CHUNK);
  const walls = new Uint8Array(CHUNK * CHUNK);
  const x0 = cx * CHUNK;
  const y0 = cy * CHUNK;
  for (let ty = 0; ty < CHUNK; ty += 1) {
    for (let tx = 0; tx < CHUNK; tx += 1) {
      tiles[ty * CHUNK + tx] = baseTileAt(seed, x0 + tx, y0 + ty);
      walls[ty * CHUNK + tx] = baseWallAt(seed, x0 + tx, y0 + ty);
    }
  }
  const write = (wx, wy, id) => {
    const lx = wx - x0;
    const ly = wy - y0;
    if (lx < 0 || lx >= CHUNK || ly < 0 || ly >= CHUNK) return;
    if (!canStamp(tiles[ly * CHUNK + lx], id)) return;
    tiles[ly * CHUNK + lx] = id;
  };
  for (let wx = x0 - STRUCTURE_MARGIN; wx < x0 + CHUNK + STRUCTURE_MARGIN; wx += 1) {
    const tree = treeAt(seed, wx);
    if (tree) stampTree(write, seed, tree);
    decorate(write, seed, wx);
  }
  return { tiles, walls };
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
const EXPORTS_worldgen = {
    CHUNK, WORLD_H, SKY_H, STRUCTURE_MARGIN, BIOMES, TREES, ORE_BANDS,
    SEA_LEVEL, BEACH_BAND, BY_BIOME, CLIMATE_BIOMES,
    temperature, moisture, continent, climateWeights, columnOf, blightAt, climateAt,
    CAVE_PROFILES, caveProfile, caveThreshold, floodFloor, FLORA, pickProp, canStamp, GROWS_IN_WATER, WET_ONLY,
    isLiquidId, isSolidId, get WATER_ID() { return idOf('water'); },
    biomeAt, biomeIndex, heightBias, surfaceHeight, caveDensity, stratum, oreAt,
    baseTileAt, baseWallAt, treeAt, stampTree, decorate, generateChunk
  };

if (typeof module !== 'undefined' && module.exports) {

  const rng = require('./rng.js');
  const noise = require('./noise.js');
  const tiles = require('./tiles.js');
  global.unit = rng.unit;
  global.fbm1 = noise.fbm1;
  global.smooth = noise.smooth;
  global.fbm2 = noise.fbm2;
  global.ridged2 = noise.ridged2;
  global.AIR = tiles.AIR;
  global.idOf = tiles.idOf;
  global.tile = tiles.tile;
  global.wallIdOf = tiles.wallIdOf;
  module.exports = EXPORTS_worldgen;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.worldgen = EXPORTS_worldgen;
}
