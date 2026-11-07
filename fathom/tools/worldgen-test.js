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
  const out = new Uint16Array(w * h);
  const outWalls = new Uint16Array(w * h);
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
    // The same stamping rule the real generator uses, imported rather than restated:
    // a second copy here once made this oracle agree with itself and not with the game.
    if (!gen.canStamp(out[ly * w + lx], id)) return;
    out[ly * w + lx] = id;
  };
  for (let wx = x0 - STRUCTURE_MARGIN; wx < x0 + w + STRUCTURE_MARGIN; wx += 1) {
    const tree = gen.treeAt(seed, wx);
    if (tree) gen.stampTree(write, seed, tree);
    // Same explicit bounds the chunked path uses, so the two cannot differ by
    // accident of a default.
    gen.decorate(write, seed, wx, y0 - 1, y0 + h + 1);
  }
  return { out, outWalls, w, h };
}

let seamTiles = 0;
let seamMismatch = 0;
const firstMismatches = [];
// Chunk rows chosen to straddle every layer, not just the surface. A sky island, a
// planetoid and the trench are all wider than a chunk, so each is a chance for chunked
// and one-piece generation to disagree; the surface-only sample would never have seen it.
const SEAM_REGIONS = [
  [-6, 5], [0, 5], [11, 6], [-21, 7],                 // surface and shallow caves
  [0, -10], [2, -8], [-4, -7],                        // sky: islands and cloud banks
  [1, -22], [3, -19], [-2, -25],                      // space: planetoids and vacuum
  [0, 32], [-3, 36], [2, 40],                         // hell and its caves
  [0, 60], [1, 90], [-1, 140]                         // the trench, and far below it
];
for (const [cx0, cy0] of SEAM_REGIONS) {
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

// 9. Spawn must be standable, and the surface must not be riddled with holes. Cave
// mouths mean not every column has solid ground any more - that is the point of them -
// so what is checked is that a safe spawn is always findable nearby, and that mouths
// stay a small minority of the surface rather than turning it into a sieve.
let mouthColumns = 0;
let sampled = 0;
for (let x = -4000; x <= 4000; x += 7) {
  sampled += 1;
  const surface = gen.surfaceHeight(SEED, x);
  if (!tiles.isSolid(gen.baseTileAt(SEED, x, surface))) mouthColumns += 1;
}
const mouthShare = mouthColumns / sampled;
check(mouthShare < 0.2, (100 * mouthShare).toFixed(1)
  + '% of surface columns are open holes: the surface is a sieve');
check(mouthShare > 0.002, 'no surface column is open anywhere: there are no cave mouths');

// A standable spot is always within a short walk, which is all a spawn needs.
for (let origin = -900; origin <= 900; origin += 123) {
  // A flag, not the column index: storing the column and then testing it for being
  // non-negative made every spot west of zero look like a failure.
  let found = false;
  for (let step = 0; step < 60 && !found; step += 1) {
    for (const x of [origin + step, origin - step]) {
      const surface = gen.surfaceHeight(SEED, x);
      if (!tiles.isSolid(gen.baseTileAt(SEED, x, surface))) continue;
      if (tiles.isSolid(gen.baseTileAt(SEED, x, surface - 1))) continue;
      if (tiles.isSolid(gen.baseTileAt(SEED, x, surface - 2))) continue;
      found = true;
      break;
    }
  }
  check(found, 'no standable ground within 60 tiles of column ' + origin);
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
    const column = gen.columnOf(s, x);
    for (let y = gen.SKY_H; y < Math.min(gen.WORLD_H, surface + 300); y += 1) {
      if (gen.baseTileAt(s, x, y) !== WATER) continue;
      waterCells += 1;
      check(y >= gen.SEA_LEVEL, 'water above sea level at ' + x + ',' + y);
      if (y < surface) continue;          // the open sea, above the ground
      // Below the ground, water means a flooded cave: this column must have a water
      // table, the tile must be above its floor, and it must be a cave in the first
      // place, never water sitting inside what should be solid rock.
      undergroundWater += 1;
      // The generator's own rule for what is submerged, not a restatement of it.
      check(gen.submergedVoid(s, x, y, column),
        'water at ' + x + ',' + y + ' where nothing should be submerged');
      // The generator's own carving predicate, not a restatement of it: a second copy
      // here would make this oracle agree with itself rather than with the game.
      check(gen.isCarved(s, x, y, y - surface, gen.columnOf(s, x)),
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
// 13. Borders between biomes that LOOK different must interleave, not draw a line.
// Measured on surface material, because taiga meeting tundra is not a visible border at
// all - they are both snow - and an earlier blend passed its test while firing almost
// entirely between pairs like that. This counts how often the ground cover flips within
// thirty tiles of a boundary, which is exactly what a player sees.
let visibleBorders = 0;
let raggedBorders = 0;
let shortRunShare = 0;
{
  for (const s of [SEED, 4242, -98765]) {
    let prev = null;
    for (let x = -30000; x < 30000; x += 1) {
      const b = gen.biomeAt(s, x);
      if (b.key === 'ocean' || b.key === 'beach') { prev = null; continue; }
      if (prev && prev !== b.surface) {
        let flips = 0;
        let last = null;
        for (let d = -30; d <= 30; d += 1) {
          const m = gen.biomeAt(s, x + d).surface;
          if (last !== null && m !== last) flips += 1;
          last = m;
        }
        visibleBorders += 1;
        if (flips >= 3) raggedBorders += 1;
        x += 30;
        prev = null;
        continue;
      }
      prev = b.surface;
    }
  }
  check(visibleBorders > 100, 'too few visible borders to judge blending');
  const raggedShare = raggedBorders / Math.max(1, visibleBorders);
  check(raggedShare > 0.5, 'only ' + (100 * raggedShare).toFixed(1)
    + '% of visible biome borders interleave: the rest are ruled lines');

  // And the interleaving must stay at the borders. Jostling the weights hard enough to
  // rag a boundary also speckles single columns of the wrong biome through the middle of
  // every biome unless the jostle is scaled by how contested the column is; this is the
  // check that the cores survived.
  const runs = [];
  for (const s of [SEED, 4242]) {
    let cur = null;
    let len = 0;
    for (let x = -30000; x < 30000; x += 1) {
      const k = gen.biomeAt(s, x).key;
      if (k === cur) len += 1;
      else { if (cur) runs.push(len); cur = k; len = 1; }
    }
  }
  const total = runs.reduce((a, b) => a + b, 0);
  const short = runs.filter(r => r < 20).reduce((a, b) => a + b, 0);
  shortRunShare = short / total;
  check(shortRunShare < 0.2, (100 * shortRunShare).toFixed(1)
    + '% of the world sits in biome runs under 20 tiles: borders have become speckle');
  check(Math.max(...runs) > 800, 'no biome anywhere is larger than 800 tiles');
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

// 15. Foliage. Every prop in the registry must actually grow somewhere, wet props must
// grow underwater and dry ones above it, and nothing a prop is stamped into may have been
// something else: a bamboo stalk that replaced a tree trunk is a bug you only see by
// looking, so it is checked here instead.
const DECOR = tiles.TILES.filter(t => t.decor);
// Shells are deliberately not here: they belong on the beach as well as the sea bed.
const WET = new Set(gen.WET_ONLY);
const propCounts = {};
for (const s of [SEED, 4242, -98765]) {
  const done = new Set();
  for (let x = -9000; x < 9000; x += 1) {
    const column = gen.columnOf(s, x);
    const cx = Math.floor(x / gen.CHUNK);
    const cy = Math.floor((column.height - 6) / gen.CHUNK);
    const key = cx + ',' + cy;
    if (done.has(key)) continue;
    done.add(key);
    for (const yy of [cy, cy + 1]) {
      const chunk = gen.generateChunk(s, cx, yy);
      for (let i = 0; i < chunk.tiles.length; i += 1) {
        const spec = tiles.tile(chunk.tiles[i]);
        if (!spec.decor) continue;
        propCounts[spec.key] = (propCounts[spec.key] || 0) + 1;
        const lx = cx * gen.CHUNK + (i % gen.CHUNK);
        const ly = yy * gen.CHUNK + Math.floor(i / gen.CHUNK);
        // The cell a prop occupies must have been empty, or water for the wet ones.
        const under = gen.baseTileAt(s, lx, ly);
        check(under === tiles.AIR || tiles.tile(under).liquid,
          spec.key + ' at ' + lx + ',' + ly + ' replaced ' + tiles.tile(under).key);
        if (WET.has(spec.key)) {
          check(ly >= gen.SEA_LEVEL, spec.key + ' is growing above sea level at ' + lx);
        }
      }
    }
  }
}
for (const spec of DECOR) {
  check(!spec.solid, spec.key + ' is solid, so foliage would block movement');
  check((propCounts[spec.key] || 0) > 0, spec.key + ' never grows anywhere');
}

// 16. The vertical layers. The world has no floor and no ceiling, so what is checked is
// that each band contains what it is supposed to, that the trench never closes, and that
// nothing lives in the vacuum above space.
const LAYER_SAMPLES = [SEED, 4242, -98765];
for (const layer of gen.LAYERS) {
  const probe = Number.isFinite(layer.from) ? layer.from + 20 : layer.to - 400;
  check(gen.layerAt(gen.SEA_LEVEL + probe).key === layer.key,
    'layer ' + layer.key + ' does not contain its own altitude ' + probe);
}
// Layers tile the whole axis with no gap and no overlap.
for (let i = 1; i < gen.LAYERS.length; i += 1) {
  check(gen.LAYERS[i - 1].to === gen.LAYERS[i].from,
    'a gap or overlap between ' + gen.LAYERS[i - 1].key + ' and ' + gen.LAYERS[i].key);
}

// Hell's great hall, and its repeats below the hell caves. This is the promise that
// infinite depth stays somewhere you can go: at any depth, however absurd, there must be
// a wide open span with rock under it to stand on and no more than a fraction of it lava.
let hallsChecked = 0;
for (const s of LAYER_SAMPLES) {
  // Sampled at the middle of each hall rather than at an arbitrary offset: a row taken
  // at the lava surface is legitimately narrow, and testing one would be testing the
  // sample rather than the world.
  for (let k = 0; k < 120; k += 1) {
    const alt = gen.HALL_TOP + k * gen.HALL_PERIOD + Math.round(gen.HALL_PERIOD * 0.5);
    if (!gen.inHall(alt)) continue;
    const y = gen.SEA_LEVEL + alt;
    let open = 0;
    let lava = 0;
    for (let x = -400; x <= 400; x += 1) {
      const id = gen.baseTileAt(s, x, y);
      if (id === tiles.AIR) open += 1;
      else if (tiles.tile(id).key === 'lava') lava += 1;
    }
    hallsChecked += 1;
    check(open > 120, 'a hall at depth ' + alt + ' is only ' + open + ' tiles open across 801');
    check(lava < 600, 'a hall at depth ' + alt + ' is ' + lava + '/801 lava');
  }
}
// And a hall has a floor: somewhere below the open span there is rock, not endless void.
for (const s of LAYER_SAMPLES) {
  for (let alt = gen.HALL_RESUME + 60; alt < 12000; alt += gen.HALL_PERIOD) {
    let floor = 0;
    for (let d = 0; d < gen.HALL_PERIOD; d += 1) {
      const id = gen.baseTileAt(s, 0, gen.SEA_LEVEL + alt + d);
      if (tiles.isSolid(id)) { floor += 1; }
    }
    check(floor > 20, 'no floor found within one hall period below depth ' + alt);
  }
}

// Vault rooms, gates and loot are stable at absolute coordinates, including negative slots.
for (const seed of LAYER_SAMPLES) {
  const y = gen.SEA_LEVEL + gen.ASHVAULT_DEPTH;
  for (const slot of [-2, -1, 0, 1, 2]) {
    const vault = Array.from({ length: 120 }, (_, i) => slot * 320 - 60 + i)
      .map(x => gen.ashvaultAt(seed, x, y)).find(Boolean);
    check(!!vault, 'Ashvault slot ' + slot + ' is empty');
    if (!vault) continue;
    check(gen.baseTileAt(seed, vault.x - 32, y + 8) === tiles.idOf('ashvault-gate'), 'missing outer vault gate');
    check(gen.baseTileAt(seed, vault.x + 12, y + 8) === tiles.idOf('ashvault-gate'), 'missing inner vault gate');
    check(gen.baseTileAt(seed, vault.x - 7, y + 9) === tiles.idOf('ashvault-spikes'), 'missing vault trap');
    check(gen.baseContainerAt(seed, vault.x + 17, y + 8).some(item => item.key === 'vault-relic'), 'vault has no relic');
    const x = vault.x + 17, chestY = y + 8;
    const cx = Math.floor(x / CHUNK), cy = Math.floor(chestY / CHUNK);
    const chunk = gen.generateChunk(seed, cx, cy);
    check(chunk.tiles[(chestY - cy * CHUNK) * CHUNK + x - cx * CHUNK] === tiles.cellOf('ashvault-cache', 0, 0).id,
      'the Ashvault chest changed when generated as a chunk');
  }
}
for (const altitude of [gen.VOID_START, gen.VOID_START + 2000, gen.VOID_START + 20000]) {
  const found = new Set();
  for (let x = -100; x < 100; x += 3) for (let y = 0; y < 132; y += 3) {
    found.add(gen.baseTileAt(SEED, x, gen.SEA_LEVEL + altitude + y));
  }
  for (const id of [tiles.AIR, tiles.idOf('voidstone'), tiles.idOf('void-crystal')]) {
    check(found.has(id), 'Void sample at ' + altitude + ' is missing ' + tiles.tile(id).key);
  }
}

// Sky and space hold their own structures, and the vacuum above space holds nothing.
let islands = 0;
let bodies = 0;
for (let slot = -200; slot < 200; slot += 1) {
  const island = gen.skyIslandAt(SEED, slot);
  if (island) {
    islands += 1;
    const alt = gen.altitudeOf(island.cy);
    check(alt <= -250 && alt >= -800, 'a sky island sits at altitude ' + alt);
  }
  const body = gen.planetoidAt(SEED, slot);
  if (body) {
    bodies += 1;
    const alt = gen.altitudeOf(body.cy);
    check(alt <= -750 && alt >= gen.SPACE_FLOOR,
      'a planetoid sits at altitude ' + alt + ', outside space');
  }
}
check(islands > 50, 'too few sky islands generate: ' + islands);
check(bodies > 50, 'too few planetoids generate: ' + bodies);
for (const s of LAYER_SAMPLES) {
  for (let alt = gen.SPACE_FLOOR - 40; alt > gen.SPACE_FLOOR - 900; alt -= 37) {
    for (let x = -3000; x < 3000; x += 271) {
      check(gen.baseTileAt(s, x, gen.SEA_LEVEL + alt) === tiles.AIR,
        'something solid at altitude ' + alt + ', above the top of space');
    }
  }
}

// Lava belongs to hell and below, and nowhere else. Water is the opposite: it must never
// appear down there, where it would have no way to have got in.
const LAVA = tiles.idOf('lava');
let lavaSeen = 0;
for (const s of LAYER_SAMPLES) {
  for (let alt = -400; alt < 3000; alt += 23) {
    for (let x = -2000; x < 2000; x += 173) {
      const id = gen.baseTileAt(s, x, gen.SEA_LEVEL + alt);
      if (id !== LAVA) continue;
      lavaSeen += 1;
      check(alt >= 1250, 'lava at altitude ' + alt + ', above hell');
    }
  }
}
check(lavaSeen > 0, 'no lava generates anywhere');

// Hell and its caves must be walkable. A layer that is entirely rock and lava is a wall,
// not a place: the first version measured 0% open air down there.
for (const [key, a0, a1] of [['hell', 1260, 1740], ['hellcaves', 1760, 2160]]) {
  let air = 0;
  let n = 0;
  for (let alt = a0; alt < a1; alt += 11) {
    for (let x = -1200; x < 1200; x += 17) {
      if (gen.baseTileAt(SEED, x, gen.SEA_LEVEL + alt) === tiles.AIR) air += 1;
      n += 1;
    }
  }
  check(air / n > 0.04, key + ' is only ' + (100 * air / n).toFixed(1) + '% walkable');
}

// 17. Caves must be reachable, and findable. This replaced a check that lied: it seeded
// the flood fill from the top rows of a fixed window, which for most columns was already
// underground, so it started inside the cave system and proved only that the system
// reached itself. It reported 93-96% while the game had three cave mouths in 800 columns
// and the player could not find a single one.
//
// The fill now seeds only from tiles strictly above their own column's surface - genuine
// open sky - and the count of distinct surface openings is checked as well, because
// connectivity without a door is not a cave system anybody will ever see.
const CAVE_SEEDS = [SEED, 4242, 777];
const reachability = [];
for (const s of CAVE_SEEDS) {
  const x0 = -400;
  const w = 800;
  const depthBelow = 600;
  const surf = new Int32Array(w);
  let minSurf = Infinity;
  let maxSurf = -Infinity;
  for (let i = 0; i < w; i += 1) {
    const sh = gen.surfaceHeight(s, x0 + i);
    surf[i] = sh;
    if (sh < minSurf) minSurf = sh;
    if (sh > maxSurf) maxSurf = sh;
  }
  const topY = minSurf - 30;
  const h = (maxSurf - topY) + depthBelow;
  const open = new Uint8Array(w * h);
  let underground = 0;
  for (let j = 0; j < h; j += 1) {
    for (let i = 0; i < w; i += 1) {
      const y = topY + j;
      if (tiles.isSolid(gen.baseTileAt(s, x0 + i, y))) continue;
      open[j * w + i] = 1;
      if (y > surf[i]) underground += 1;
    }
  }
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let i = 0; i < w; i += 1) {
    for (let j = 0; j < h; j += 1) {
      if (topY + j >= surf[i]) break;
      const n = j * w + i;
      if (open[n] && !seen[n]) { seen[n] = 1; stack.push(n); }
    }
  }
  let reached = 0;
  let deepest = 0;
  while (stack.length) {
    const idx = stack.pop();
    const j = (idx / w) | 0;
    const i = idx - j * w;
    if (topY + j > surf[i]) {
      reached += 1;
      const d = topY + j - surf[i];
      if (d > deepest) deepest = d;
    }
    const push = (ni, nj) => {
      if (ni < 0 || ni >= w || nj < 0 || nj >= h) return;
      const n = nj * w + ni;
      if (!open[n] || seen[n]) return;
      seen[n] = 1;
      stack.push(n);
    };
    push(i - 1, j); push(i + 1, j); push(i, j - 1); push(i, j + 1);
  }
  let mouths = 0;
  let prev = false;
  for (let i = 0; i < w; i += 1) {
    const j = surf[i] - topY;
    const hit = j >= 0 && j < h && open[j * w + i] === 1 && seen[j * w + i] === 1;
    if (hit && !prev) mouths += 1;
    prev = hit;
  }
  const pct = reached / Math.max(1, underground);
  reachability.push({ seed: s, pct, deepest, mouths, w });
  check(pct > 0.85, 'seed ' + s + ': only ' + (100 * pct).toFixed(1)
    + '% of underground space is reachable from open sky');
  check(deepest > 400, 'seed ' + s + ': the deepest reachable point is only '
    + deepest + ' tiles below the surface');
  check(mouths >= 5, 'seed ' + s + ': only ' + mouths + ' cave mouths in ' + w
    + ' columns, which is too few for a player to find one');
}

// 18. Underground structures exist, of every kind, and stay where they belong.
const structureKinds = {};
for (let slot = -400; slot < 400; slot += 1) {
  // structurePlaced, not structureAt: the first says where a room really is, the second
  // only what shape a slot would hold if it were allowed one.
  const rect = gen.structurePlaced(SEED, slot);
  if (!rect) continue;
  structureKinds[rect.kind] = (structureKinds[rect.kind] || 0) + 1;
  check(rect.y1 > rect.y0 && rect.x1 > rect.x0, 'structure ' + slot + ' has no extent');
  check(gen.altitudeOf(rect.y0) < 1250,
    'a ' + rect.kind + ' generated in hell at altitude ' + gen.altitudeOf(rect.y0));
  check(rect.y0 > gen.surfaceHeight(SEED, rect.body.ax) + 40,
    'a ' + rect.kind + ' generated too close to the surface');
}
for (const kind of ['cabin', 'ruin', 'grotto', 'mineshaft']) {
  check((structureKinds[kind] || 0) > 10,
    'only ' + (structureKinds[kind] || 0) + ' of structure kind ' + kind + ' in 800 slots');
}
// A cabin must actually contain its crafting station, or it is just a wooden box.
let stationsFound = 0;
for (let slot = -400; slot < 400; slot += 1) {
  const rect = gen.structurePlaced(SEED, slot);
  if (!rect || rect.kind !== 'cabin') continue;
  for (let y = rect.y0; y < rect.y1; y += 1) {
    for (let x = rect.x0; x < rect.x1; x += 1) {
      if (tiles.tile(gen.baseTileAt(SEED, x, y)).station) stationsFound += 1;
    }
  }
}
check(stationsFound > 5, 'only ' + stationsFound + ' crafting stations across every cabin');

// --- spawn is always on dry land ------------------------------------------------------
// Measured on the property the player meets - the surface near origin is above the water
// line and its biome is neither ocean nor beach - rather than on the continent field,
// which is only one of the terms that decide the height.
let homelandSeeds = 0;
let driestShore = 1e9;
for (let s = 0; s < 60; s += 1) {
  const seed = 1000003 * s - 7919;
  homelandSeeds += 1;
  let nearestSea = 1e9;
  for (let x = -gen.HOME_FLAT; x <= gen.HOME_FLAT; x += 1) {
    const col = gen.columnOf(seed, x);
    check(col.height <= gen.SEA_LEVEL - gen.BEACH_BAND,
      'seed ' + seed + ' column ' + x + ' is under water ' + col.height
      + ' with sea level ' + gen.SEA_LEVEL);
    check(col.biome.key !== 'ocean' && col.biome.key !== 'beach',
      'seed ' + seed + ' has ' + col.biome.key + ' at ' + x + ', inside the homeland');
  }
  // And the sea still exists: somewhere out past the fade there is open water, or the
  // guarantee has quietly flattened the whole world.
  for (let x = 0; x < 30000 && nearestSea === 1e9; x += 3) {
    if (gen.columnOf(seed, x).biome.key === 'ocean') nearestSea = x;
    else if (gen.columnOf(seed, -x).biome.key === 'ocean') nearestSea = x;
  }
  check(nearestSea < 30000, 'seed ' + seed + ' has no ocean anywhere in 30,000 tiles');
  driestShore = Math.min(driestShore, nearestSea);
}
check(driestShore > gen.HOME_FLAT,
  'the nearest ocean across every seed was ' + driestShore + ' tiles from spawn');

console.log('Worldgen: ' + checks + ' checks passed; ' + seamTiles.toLocaleString()
  + ' block and wall cells agree between chunked and one-piece generation; ' + oresSeen
  + ' ore tiles all inside their depth bands; ' + walled.toLocaleString()
  + ' below-surface tiles all carry a wall; worst surface step ' + worstStep + ' tiles; all '
  + gen.BIOMES.length + ' biomes generate; ' + waterCells.toLocaleString()
  + ' water cells all inside their basins, ' + undergroundWater.toLocaleString()
  + ' of them in flooded caves; all ' + DECOR.length + ' foliage types grow; all '
  + gen.LAYERS.length + ' vertical layers hold their own content and hell\'s hall stayed open and floored at '
  + hallsChecked.toLocaleString() + ' hall samples');

console.log('foliage stamped at the surface across 3 seeds:');
for (const [key, n] of Object.entries(propCounts).sort((a, b) => b[1] - a[1])) {
  console.log('  ' + key.padEnd(13) + n.toLocaleString());
}

console.log('biome borders: ' + (100 * raggedBorders / Math.max(1, visibleBorders)).toFixed(1)
  + '% of ' + visibleBorders + ' visible borders interleave; '
  + (100 * shortRunShare).toFixed(1) + '% of the world is in runs under 20 tiles');

console.log('cave reachability (flood fill seeded from open sky only):');
for (const r of reachability) {
  console.log('  seed ' + String(r.seed).padStart(9) + '  '
    + (100 * r.pct).toFixed(1).padStart(5) + '% reachable, deepest ' + r.deepest
    + ' below surface, ' + r.mouths + ' mouths in ' + r.w + ' columns');
}
console.log('underground structures per 800 slots: '
  + Object.entries(structureKinds).map(([k, n]) => k + ' ' + n).join(', '));

console.log('underground openness (depth 40-300):');
for (const [key, a] of Object.entries(openness).sort((x, y) => y[1].air / y[1].n - x[1].air / x[1].n)) {
  console.log('  ' + key.padEnd(11) + (100 * a.air / a.n).toFixed(1).padStart(5) + '% open, mean cavity '
    + (a.air / Math.max(1, a.runs)).toFixed(1) + ' tiles');
}

console.log('biome share across ' + SURVEY_SEEDS.length + ' seeds:');
for (const [key, n] of Object.entries(seen).sort((a, b) => b[1] - a[1])) {
  console.log('  ' + key.padEnd(11) + (100 * n / surveyed).toFixed(2) + '%');
}
