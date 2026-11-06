'use strict';
// The infinite world's correctness conditions. The important one is the last: a region built
// as one piece and the same region stitched from independently generated chunks must be
// byte-identical. That is what makes seams continuous, and it is the bug this architecture
// is most prone to.
const assert = require('node:assert/strict');
const gen = require('../js/worldgen.js');
const tiles = require('../js/tiles.js');
const { CHUNK, WORLD_H, STRUCTURE_MARGIN } = gen;

const SEED = 20260105;

function bytes(chunk) {
  return Buffer.from(chunk.tiles).toString('base64') + '|' + Buffer.from(chunk.walls).toString('base64');
}

let checks = 0;
function check(condition, message) {
  assert.ok(condition, message);
  checks += 1;
}

// 1. A chunk is a pure function of (seed, cx, cy).
for (let i = 0; i < 40; i += 1) {
  const cx = (i * 37) % 211 - 105;
  const cy = 3 + (i % 18);
  const a = gen.generateChunk(SEED, cx, cy);
  const b = gen.generateChunk(SEED, cx, cy);
  check(bytes(a) === bytes(b), 'chunk ' + cx + ',' + cy + ' is not deterministic');
}

// 2. Generation order cannot matter.
const coords = [];
for (let cx = -3; cx <= 3; cx += 1) for (let cy = 4; cy <= 9; cy += 1) coords.push([cx, cy]);
const sequential = new Map();
for (const [cx, cy] of coords) sequential.set(cx + ':' + cy, bytes(gen.generateChunk(SEED, cx, cy)));
const shuffled = coords.slice().sort((p, q) => ((p[0] * 31 + p[1] * 17) % 7) - ((q[0] * 31 + q[1] * 17) % 7));
for (const [cx, cy] of shuffled) {
  check(sequential.get(cx + ':' + cy) === bytes(gen.generateChunk(SEED, cx, cy)),
    'chunk ' + cx + ',' + cy + ' depends on generation order');
}

// 3. Different seeds must actually differ.
const seedA = bytes(gen.generateChunk(SEED, 0, 6));
const seedB = bytes(gen.generateChunk(SEED + 1, 0, 6));
check(seedA !== seedB, 'two seeds produced an identical chunk');

// 4. The surface is continuous: no column-to-column cliff from noise.
let worstStep = 0;
for (let x = -4000; x < 4000; x += 1) {
  const step = Math.abs(gen.surfaceHeight(SEED, x + 1) - gen.surfaceHeight(SEED, x));
  if (step > worstStep) worstStep = step;
}
check(worstStep <= 6, 'surface steps by ' + worstStep + ' tiles between adjacent columns');

// 5. Ores stay inside their declared depth bands.
const oreIds = new Map(gen.ORE_BANDS.map((b) => [tiles.idOf(b.key), b]));
let oresSeen = 0;
for (let cx = -2; cx <= 2; cx += 1) {
  for (let cy = 4; cy < 22; cy += 1) {
    const chunk = gen.generateChunk(SEED, cx, cy);
    for (let ty = 0; ty < CHUNK; ty += 1) {
      for (let tx = 0; tx < CHUNK; tx += 1) {
        const id = chunk.tiles[ty * CHUNK + tx];
        const band = oreIds.get(id);
        if (!band) continue;
        const x = cx * CHUNK + tx;
        const depth = cy * CHUNK + ty - gen.surfaceHeight(SEED, x);
        check(depth >= band.from && depth <= band.to,
          band.key + ' generated at depth ' + depth + ', outside ' + band.from + '-' + band.to);
        oresSeen += 1;
      }
    }
  }
}
assert.ok(oresSeen > 400, 'expected a substantial ore count, saw ' + oresSeen);

// 6. The seam condition. Build a region as one piece, including every structure whose origin
// could reach into it, then compare against the same region stitched from chunks.
function wholeRegion(seed, cx0, cy0, wChunks, hChunks) {
  const w = wChunks * CHUNK;
  const h = hChunks * CHUNK;
  const x0 = cx0 * CHUNK;
  const y0 = cy0 * CHUNK;
  const out = new Uint8Array(w * h);
  const outWalls = new Uint8Array(w * h);
  for (let ty = 0; ty < h; ty += 1) {
    for (let tx = 0; tx < w; tx += 1) {
      out[ty * w + tx] = gen.baseTileAt(seed, x0 + tx, y0 + ty);
      outWalls[ty * w + tx] = gen.baseWallAt(seed, x0 + tx, y0 + ty);
    }
  }
  const write = (wx, wy, id) => {
    const lx = wx - x0;
    const ly = wy - y0;
    if (lx < 0 || lx >= w || ly < 0 || ly >= h) return;
    if (id === tiles.idOf('leaves') || id === tiles.idOf('vine')) {
      if (out[ly * w + lx] !== tiles.AIR) return;
    }
    out[ly * w + lx] = id;
  };
  for (let wx = x0 - STRUCTURE_MARGIN; wx < x0 + w + STRUCTURE_MARGIN; wx += 1) {
    const tree = gen.treeAt(seed, wx);
    if (tree) gen.stampTree(write, seed, tree);
    gen.decorate(write, seed, wx);
  }
  return { out, outWalls, w, h };
}

let seamTiles = 0;
let seamMismatch = 0;
const firstMismatches = [];
for (const [cx0, cy0] of [[-6, 5], [0, 5], [11, 6], [-21, 7]]) {
  const wChunks = 3;
  const hChunks = 2;
  const whole = wholeRegion(SEED, cx0, cy0, wChunks, hChunks);
  for (let j = 0; j < hChunks; j += 1) {
    for (let i = 0; i < wChunks; i += 1) {
      const chunk = gen.generateChunk(SEED, cx0 + i, cy0 + j);
      for (let ty = 0; ty < CHUNK; ty += 1) {
        for (let tx = 0; tx < CHUNK; tx += 1) {
          const got = chunk.tiles[ty * CHUNK + tx];
          const want = whole.out[(j * CHUNK + ty) * whole.w + (i * CHUNK + tx)];
          const gotWall = chunk.walls[ty * CHUNK + tx];
          const wantWall = whole.outWalls[(j * CHUNK + ty) * whole.w + (i * CHUNK + tx)];
          seamTiles += 2;
          if (gotWall !== wantWall) {
            seamMismatch += 1;
            if (firstMismatches.length < 6) {
              firstMismatches.push({ layer: 'wall', x: (cx0 + i) * CHUNK + tx, y: (cy0 + j) * CHUNK + ty,
                chunked: tiles.wall(gotWall).key, whole: tiles.wall(wantWall).key });
            }
          }
          if (got !== want) {
            seamMismatch += 1;
            if (firstMismatches.length < 6) {
              firstMismatches.push({
                x: (cx0 + i) * CHUNK + tx, y: (cy0 + j) * CHUNK + ty,
                chunked: tiles.tile(got).key, whole: tiles.tile(want).key
              });
            }
          }
        }
      }
    }
  }
}
assert.equal(seamMismatch, 0,
  'chunked generation disagrees with one-piece generation on ' + seamMismatch + ' of ' + seamTiles
    + ' tiles; first: ' + JSON.stringify(firstMismatches));
checks += 1;

// 7. Every tile below the surface carries a wall, so mining a block never leaves a hole
// through to the sky, and no tile above the surface carries one.
let walled = 0;
let missingWall = 0;
let strayWall = 0;
for (let x = -300; x <= 300; x += 23) {
  const surface = gen.surfaceHeight(SEED, x);
  for (let y = surface - 6; y < surface + 260; y += 1) {
    const w = gen.baseWallAt(SEED, x, y);
    if (y < surface) {
      if (w !== 0) strayWall += 1;
    } else if (w === 0) missingWall += 1;
    else walled += 1;
  }
}
assert.equal(missingWall, 0, missingWall + ' below-surface tiles have no wall behind them');
assert.equal(strayWall, 0, strayWall + ' above-surface tiles carry a wall');
checks += 2;

// 8. A tree must not block movement: trunks and foliage are walk-through, so the player
// never has to mine a forest to cross it.
for (const key of ['trunk', 'leaves', 'vine']) {
  check(!tiles.isSolid(tiles.idOf(key)), key + ' is solid, so trees would block movement');
}
check(tiles.isSolid(tiles.idOf('wood')), 'placed wood should still be a solid building block');

// 9. Spawn must be standable: solid ground with headroom above it.
for (let x = -500; x <= 500; x += 97) {
  const surface = gen.surfaceHeight(SEED, x);
  check(tiles.isSolid(gen.baseTileAt(SEED, x, surface)), 'no solid ground at column ' + x);
  check(gen.baseTileAt(SEED, x, surface - 1) === tiles.AIR
    || !tiles.isSolid(gen.baseTileAt(SEED, x, surface - 1)), 'column ' + x + ' has no headroom');
}

// 10. Every biome must actually generate. The climate fields are summed octaves, which
// pile up around the middle: before the fields were stretched, measurement showed desert,
// badlands and marsh never appearing at all. This is the check that would have caught it.
const seen = {};
const SURVEY_SEEDS = [SEED, 4242, -98765, 777];
for (const s of SURVEY_SEEDS) {
  for (let x = -30000; x < 30000; x += 3) {
    const key = gen.biomeAt(s, x).key;
    seen[key] = (seen[key] || 0) + 1;
  }
}
const surveyed = Object.values(seen).reduce((a, b) => a + b, 0);
for (const biome of gen.BIOMES) {
  check(seen[biome.key] > 0, 'biome ' + biome.key + ' never generates');
  // And none may swallow the world: an ocean everywhere is the failure mode this catches.
  check((seen[biome.key] || 0) / surveyed < 0.45,
    'biome ' + biome.key + ' covers more than 45% of the world');
}

// 11. Water is contained. It fills a basin exactly to sea level and appears nowhere else:
// never above sea level, never inside solid ground, and never on a column the generator
// does not call ocean. The ocean is one rule, so this is the test of that rule.
const WATER = tiles.idOf('water');
let waterCells = 0;
let undergroundWater = 0;
for (const s of SURVEY_SEEDS) {
  for (let x = -4000; x < 4000; x += 7) {
    const surface = gen.surfaceHeight(s, x);
    const isOcean = gen.biomeAt(s, x).key === 'ocean';
    // Every ocean column is wet at sea level. The converse stopped being true once
    // caves could flood: a mire's water table can reach sea level underground, which is
    // checked below as a flooded cave rather than as open sea.
    if (isOcean) {
      check(gen.baseTileAt(s, x, gen.SEA_LEVEL) === WATER,
        'ocean column ' + x + ' is dry at sea level');
    }
    const flood = gen.floodFloor(s, x, gen.columnOf(s, x));
    for (let y = gen.SKY_H; y < Math.min(gen.WORLD_H, surface + 300); y += 1) {
      if (gen.baseTileAt(s, x, y) !== WATER) continue;
      waterCells += 1;
      check(y >= gen.SEA_LEVEL, 'water above sea level at ' + x + ',' + y);
      if (y < surface) continue;          // the open sea, above the ground
      // Below the ground, water means a flooded cave: this column must have a water
      // table, the tile must be above its floor, and it must be a cave in the first
      // place, never water sitting inside what should be solid rock.
      undergroundWater += 1;
      check(flood > 0, 'flooded cave at ' + x + ',' + y + ' in a column with no water table');
      check(y <= flood, 'water below the water table at ' + x + ',' + y);
      check(gen.caveDensity(s, x, y, y - surface, gen.columnOf(s, x))
        > gen.caveThreshold(gen.columnOf(s, x)),
        'water inside solid rock at ' + x + ',' + y);
    }
  }
}
check(waterCells > 0, 'no water generated anywhere');
check(undergroundWater > 0, 'no flooded caves generated: the underground ocean is missing');
check(!tiles.isSolid(WATER), 'water must not be solid');

// 12. The two blights never overlap, and neither sits in the sea.
for (const s of SURVEY_SEEDS) {
  for (let x = -20000; x < 20000; x += 11) {
    const blight = gen.blightAt(s, x);
    if (!blight) continue;
    check(blight === 'blight' || blight === 'crimson', 'unknown blight ' + blight);
    const biome = gen.biomeAt(s, x);
    // A blight either took the column or the sea did; it can never be both at once.
    check(biome.key === blight || biome.key === 'ocean' || biome.key === 'beach',
      'a blighted column at ' + x + ' became ' + biome.key);
  }
}

// 13. Climate placement is coherent: the biome a column reports really is the one whose
// climate weight is highest, so identity and the blended height bias cannot disagree.
for (let x = -9000; x < 9000; x += 29) {
  const column = gen.columnOf(SEED, x);
  const weights = gen.climateWeights(SEED, x);
  let best = 0;
  for (let i = 0; i < weights.length; i += 1) if (weights[i] > weights[best]) best = i;
  check(gen.CLIMATE_BIOMES[best].key === column.climate.key,
    'column ' + x + ' climate disagrees with its own weights');
}

// 14. Each biome's underground has its own character. Materials alone are just a palette;
// what makes a jungle cavern feel unlike a tundra tunnel is how much of the rock is open
// and how tall the cavities are. Measured rather than asserted by eye.
const openness = {};
for (const s of [SEED, 4242, -98765]) {
  for (let x = -30000; x < 30000; x += 13) {
    const column = gen.columnOf(s, x);
    if (column.biome.key === 'ocean' || column.biome.key === 'beach') continue;
    const key = column.climate.key;
    const a = openness[key] || (openness[key] = { air: 0, n: 0, runs: 0 });
    let prev = false;
    for (let d = 40; d < 300; d += 1) {
      const open = gen.baseTileAt(s, x, column.height + d) === tiles.AIR;
      a.n += 1;
      if (open) a.air += 1;
      if (open && !prev) a.runs += 1;
      prev = open;
    }
  }
}
for (const [key, a] of Object.entries(openness)) {
  const pct = a.air / a.n;
  // No biome may be a solid block with no caves, nor a void with no rock left.
  check(pct > 0.04, key + ' underground is nearly solid: ' + (pct * 100).toFixed(1) + '% open');
  check(pct < 0.45, key + ' underground is nearly hollow: ' + (pct * 100).toFixed(1) + '% open');
}
// And the designed extremes really are extremes: the jungle's caverns are the roomiest
// and the tundra's tunnels the tightest, by a margin that a player would notice.
const cavity = (k) => openness[k].air / Math.max(1, openness[k].runs);
check(cavity('jungle') > cavity('tundra') * 2,
  'jungle cavities are not meaningfully larger than tundra ones');
check(cavity('desert') > cavity('plains') * 1.4,
  'desert halls are not meaningfully larger than ordinary caves');

console.log('Worldgen: ' + checks + ' checks passed; ' + seamTiles.toLocaleString()
  + ' block and wall cells agree between chunked and one-piece generation; ' + oresSeen
  + ' ore tiles all inside their depth bands; ' + walled.toLocaleString()
  + ' below-surface tiles all carry a wall; worst surface step ' + worstStep + ' tiles; all '
  + gen.BIOMES.length + ' biomes generate; ' + waterCells.toLocaleString()
  + ' water cells all inside their basins, ' + undergroundWater.toLocaleString()
  + ' of them in flooded caves');

console.log('underground openness (depth 40-300):');
for (const [key, a] of Object.entries(openness).sort((x, y) => y[1].air / y[1].n - x[1].air / x[1].n)) {
  console.log('  ' + key.padEnd(11) + (100 * a.air / a.n).toFixed(1).padStart(5) + '% open, mean cavity '
    + (a.air / Math.max(1, a.runs)).toFixed(1) + ' tiles');
}

console.log('biome share across ' + SURVEY_SEEDS.length + ' seeds:');
for (const [key, n] of Object.entries(seen).sort((a, b) => b[1] - a[1])) {
  console.log('  ' + key.padEnd(11) + (100 * n / surveyed).toFixed(2) + '%');
}
