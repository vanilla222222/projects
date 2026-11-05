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

console.log('Worldgen: ' + checks + ' checks passed; ' + seamTiles.toLocaleString()
  + ' block and wall cells agree between chunked and one-piece generation; ' + oresSeen
  + ' ore tiles all inside their depth bands; ' + walled.toLocaleString()
  + ' below-surface tiles all carry a wall; worst surface step ' + worstStep + ' tiles');
