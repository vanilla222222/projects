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

const BIOMES = [
  { key: 'tundra', bias: -10, name: 'Tundra', surface: 'snow', filler: 'snow', sub: 'dirt', tree: 'pine', grass: false },
  { key: 'plains', bias: 0, name: 'Plains', surface: 'grass', filler: 'dirt', sub: 'dirt', tree: 'oak', grass: true },
  { key: 'forest', bias: 2, name: 'Deepwood', surface: 'grass', filler: 'dirt', sub: 'dirt', tree: 'oak', grass: true },
  { key: 'jungle', bias: 6, name: 'Jungle', surface: 'grass', filler: 'dirt', sub: 'clay', tree: 'jungle', grass: true },
  { key: 'desert', bias: 16, name: 'Dunes', surface: 'sand', filler: 'sand', sub: 'sand', tree: 'none', grass: false }
];

// A continuous position in biome space. biomeAt() floors it, which lets surface material and
// tree species change abruptly at a border, while heightBias() interpolates it, which keeps
// terrain height continuous. Stepping the height bias instead puts a cliff at every border:
// desert sits 16 tiles higher than tundra, so the two meeting made a 26-tile wall.
function biomeField(seed, x) {
  const n = fbm1(seed, x * 0.0016, 311, 3, 2, 0.5);
  const warp = fbm1(seed, x * 0.0071, 977, 2, 2, 0.5) * 0.12;
  const t = Math.min(0.9999, Math.max(0, (n + warp - 0.5) * 1.9 + 0.5));
  return t * BIOMES.length;
}

function biomeIndex(seed, x) {
  return Math.min(BIOMES.length - 1, Math.floor(biomeField(seed, x)));
}

function biomeAt(seed, x) {
  return BIOMES[biomeIndex(seed, x)];
}

function heightBias(seed, x) {
  const f = biomeField(seed, x);
  const i = Math.min(BIOMES.length - 1, Math.floor(f));
  const j = Math.min(BIOMES.length - 1, i + 1);
  const t = smooth(Math.min(1, Math.max(0, f - i)));
  return BIOMES[i].bias + (BIOMES[j].bias - BIOMES[i].bias) * t;
}

function surfaceHeight(seed, x) {
  const base = SKY_H + 96;
  const rolling = (fbm1(seed, x * 0.0085, 11, 4, 2, 0.5) - 0.5) * 58;
  const hills = (fbm1(seed, x * 0.0022, 29, 3, 2, 0.55) - 0.5) * 150;
  const detail = (fbm1(seed, x * 0.055, 53, 2, 2, 0.5) - 0.5) * 9;
  const h = base + rolling + hills + detail + heightBias(seed, x);
  return Math.max(SKY_H + 24, Math.min(WORLD_H - 420, Math.round(h)));
}

function caveDensity(seed, x, y, depth) {
  const tunnels = ridged2(seed, x * 0.028, y * 0.028, 601, 4);
  const rooms = fbm2(seed, x * 0.016, y * 0.022, 727, 3, 2, 0.5);
  const squeeze = Math.min(1, depth / 90);
  return tunnels * 0.62 + rooms * 0.38 * squeeze;
}

function stratum(seed, x, y, depth) {
  const jitter = (fbm1(seed, x * 0.02, 409, 2, 2, 0.5) - 0.5) * 22;
  if (depth < 7 + jitter * 0.2) return 'surface';
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
  const surface = surfaceHeight(seed, x);
  if (y < surface) return AIR;
  const depth = y - surface;
  const biome = biomeAt(seed, x);

  if (depth > 4 && caveDensity(seed, x, y, depth) > 0.605) {
    const glow = fbm2(seed, x * 0.09, y * 0.09, 1901, 2, 2, 0.5);
    if (depth > 120 && glow > 0.895) return idOf('crystal');
    return AIR;
  }

  const layer = stratum(seed, x, y, depth);
  if (layer === 'surface') {
    if (depth === 0) return idOf(biome.surface);
    return idOf(biome.filler);
  }
  if (layer === 'filler') {
    const pocket = fbm2(seed, x * 0.07, y * 0.07, 1801, 2, 2, 0.5);
    if (pocket > 0.84 && biome.sub === 'clay') return idOf('clay');
    return idOf(biome.filler === 'snow' ? 'dirt' : biome.filler);
  }

  const ore = oreAt(seed, x, y, depth);
  if (ore) return idOf(ore);
  if (layer === 'stone') {
    const vein = fbm2(seed, x * 0.05, y * 0.05, 1951, 2, 2, 0.5);
    return vein > 0.88 ? idOf('clay') : idOf('stone');
  }
  return idOf(layer);
}

const TREES = {
  oak: { height: [6, 10], spacing: 7, canopy: 5, chance: 0.42 },
  pine: { height: [8, 13], spacing: 6, canopy: 4, chance: 0.5 },
  jungle: { height: [8, 13], spacing: 5, canopy: 6, chance: 0.62 },
  none: null
};

function treeAt(seed, x) {
  const biome = biomeAt(seed, x);
  const spec = TREES[biome.tree];
  if (!spec) return null;
  if (((x % spec.spacing) + spec.spacing) % spec.spacing !== 0) return null;
  if (unit(seed, x, 0, 2003) > spec.chance) return null;
  const span = spec.height[1] - spec.height[0];
  const height = spec.height[0] + Math.floor(unit(seed, x, 0, 2011) * (span + 1));
  const root = surfaceHeight(seed, x);
  if (baseTileAt(seed, x, root) !== idOf(biome.surface)) return null;
  return { x, root, height, canopy: spec.canopy, kind: biome.tree };
}

function stampTree(write, seed, tree) {
  const trunk = idOf('trunk');
  const leaf = idOf('leaves');
  for (let i = 1; i <= tree.height; i += 1) write(tree.x, tree.root - i, trunk);
  const top = tree.root - tree.height;
  const r = tree.canopy;
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      const fall = dy > 0 ? dy * 0.55 : dy * 1.15;
      if (dx * dx * 0.62 + fall * fall > r * r) continue;
      if (dx === 0 && dy > 1) continue;
      write(tree.x + dx, top + dy - 1, leaf);
    }
  }
  if (tree.kind === 'jungle') {
    for (let dx = -r; dx <= r; dx += 2) {
      const len = 1 + Math.floor(unit(seed, tree.x + dx, tree.root, 2017) * 4);
      for (let i = 0; i < len; i += 1) write(tree.x + dx, top + i, idOf('vine'));
    }
  }
}

function decorate(write, seed, x) {
  const biome = biomeAt(seed, x);
  const surface = surfaceHeight(seed, x);
  if (biome.grass && unit(seed, x, 0, 2101) > 0.55) {
    write(x, surface - 1, idOf('vine'));
  }
  const depth0 = surface + 1;
  for (let y = depth0; y < WORLD_H; y += 1) {
    if (y - surface < 30) continue;
    if (unit(seed, x, y, 2203) < 0.9955) continue;
    if (baseTileAt(seed, x, y) !== AIR) continue;
    const below = baseTileAt(seed, x, y + 1);
    if (below === AIR) continue;
    write(x, y, y - surface > 200 ? idOf('mushroom') : idOf('glowmoss'));
  }
}

// The wall behind a tile, which is what remains visible when the block is mined out. It is
// chosen from the stratum rather than the block, so a cave cut through stone still shows
// stone wall, and an ore pocket does not leave an ore-coloured hole.
function baseWallAt(seed, x, y) {
  if (y < 0 || y >= WORLD_H) return 0;
  const surface = surfaceHeight(seed, x);
  const depth = y - surface;
  if (depth < 0) return 0;
  const biome = biomeAt(seed, x);
  const layer = stratum(seed, x, y, depth);
  if (layer === 'surface' || layer === 'filler') {
    if (biome.key === 'desert') return wallIdOf('sandwall');
    if (biome.key === 'tundra') return wallIdOf('snowwall');
    return wallIdOf('dirtwall');
  }
  if (layer === 'stone') return wallIdOf('stonewall');
  if (layer === 'granite') return wallIdOf('granitewall');
  if (layer === 'basalt') return wallIdOf('basaltwall');
  return wallIdOf('slatewall');
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
    if (id === idOf('leaves') || id === idOf('vine')) {
      if (tiles[ly * CHUNK + lx] !== AIR) return;
    }
    tiles[ly * CHUNK + lx] = id;
  };
  for (let wx = x0 - STRUCTURE_MARGIN; wx < x0 + CHUNK + STRUCTURE_MARGIN; wx += 1) {
    const tree = treeAt(seed, wx);
    if (tree) stampTree(write, seed, tree);
    decorate(write, seed, wx);
  }
  return { tiles, walls };
}

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
  global.wallIdOf = tiles.wallIdOf;
  module.exports = {
    CHUNK, WORLD_H, SKY_H, STRUCTURE_MARGIN, BIOMES, TREES, ORE_BANDS,
    biomeAt, biomeIndex, biomeField, heightBias, surfaceHeight, caveDensity, stratum, oreAt,
    baseTileAt, baseWallAt, treeAt, decorate, generateChunk
  };
}
