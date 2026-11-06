'use strict';
// Exploration and the map. The claims worth proving are about storage rather than
// drawing: a bit per tile rather than a byte, it survives a save, a corrupt entry costs
// a patch of map rather than the world, and walking a long way does not produce a save
// file nobody can store.

const worldgen = require('../js/worldgen.js');
const chunks = require('../js/chunks.js');
const minimap = require('../js/minimap.js');

let checks = 0;
let failures = 0;
function ok(cond, label) {
  checks += 1;
  if (!cond) { failures += 1; console.log('FAIL: ' + label); }
}

const SEED = 20260105;

// --- 1. a bit is a bit ------------------------------------------------------------------
{
  const world = chunks.makeWorld(SEED, worldgen);
  ok(!world.isExplored(0, 0), 'a fresh world starts explored');
  world.markExplored(0, 0);
  ok(world.isExplored(0, 0), 'marking a tile did not explore it');
  ok(!world.isExplored(1, 0), 'marking one tile explored its neighbour');
  ok(!world.isExplored(0, 1), 'marking one tile explored the one below');
  ok(world.exploredCount() === 1, 'count says ' + world.exploredCount() + ', not 1');

  // Negative coordinates are the easy thing to get wrong with bit indexing.
  world.markExplored(-1, -1);
  ok(world.isExplored(-1, -1), 'a negative coordinate did not stay explored');
  ok(!world.isExplored(-2, -1), 'marking a negative tile spilled onto its neighbour');
  ok(world.exploredCount() === 2, 'negative coordinates confused the count');

  // Marking the same tile twice must not count twice.
  world.markExplored(0, 0);
  ok(world.exploredCount() === 2, 'marking a tile twice counted it twice');
}

// --- 2. every tile of a chunk is addressable --------------------------------------------
{
  const world = chunks.makeWorld(SEED, worldgen);
  const C = worldgen.CHUNK;
  for (let y = 0; y < C; y += 1) {
    for (let x = 0; x < C; x += 1) world.markExplored(x, y);
  }
  ok(world.exploredCount() === C * C,
    'a fully explored chunk counts ' + world.exploredCount() + ', not ' + (C * C));
  let holes = 0;
  for (let y = 0; y < C; y += 1) {
    for (let x = 0; x < C; x += 1) if (!world.isExplored(x, y)) holes += 1;
  }
  ok(holes === 0, holes + ' tiles of a fully explored chunk read as unexplored');
  // And nothing outside it was touched.
  ok(!world.isExplored(C, 0) && !world.isExplored(0, C) && !world.isExplored(-1, 0),
    'exploring one chunk leaked into its neighbours');
}

// --- 3. it survives a save ----------------------------------------------------------------
{
  const world = chunks.makeWorld(SEED, worldgen);
  const spots = [[5, 5], [-300, 900], [10000, -200], [47, 47], [48, 48]];
  for (const [x, y] of spots) world.markExplored(x, y);
  const saved = JSON.parse(JSON.stringify(world.serialize()));

  const reloaded = chunks.makeWorld(SEED, worldgen);
  reloaded.restore(saved);
  for (const [x, y] of spots) {
    ok(reloaded.isExplored(x, y), 'tile ' + x + ',' + y + ' was lost in the save');
  }
  ok(reloaded.exploredCount() === spots.length,
    'reload counts ' + reloaded.exploredCount() + ' explored tiles, not ' + spots.length);
  ok(!reloaded.isExplored(6, 5), 'reload invented an explored tile');
}

// --- 4. a corrupt entry costs a patch of map, not the world -------------------------------
{
  const world = chunks.makeWorld(SEED, worldgen);
  world.markExplored(4, 4);
  const saved = JSON.parse(JSON.stringify(world.serialize()));
  const key = Object.keys(saved.explored)[0];
  saved.explored[key] = 'not base64 at all!!';
  saved.explored['9:9'] = '';

  const reloaded = chunks.makeWorld(SEED, worldgen);
  let threw = false;
  try { reloaded.restore(saved); } catch (err) { threw = true; }
  ok(!threw, 'a corrupt exploration entry stopped the world loading');
  ok(reloaded.get(0, 0) !== undefined, 'the world is unusable after a corrupt entry');
}

// --- 5. revealing marks a disc, and the save stays small ------------------------------------
{
  const world = chunks.makeWorld(SEED, worldgen);
  minimap.revealAround(world, 1000, 500);
  const r = minimap.REVEAL_RADIUS;
  ok(world.isExplored(1000, 500), 'the centre of a reveal is not explored');
  ok(world.isExplored(1000 + r - 1, 500), 'the edge of a reveal is not explored');
  ok(!world.isExplored(1000 + r + 3, 500), 'a reveal reached past its own radius');
  // A disc, not a square: the corner must be outside it.
  ok(!world.isExplored(1000 + r - 1, 500 + r - 1), 'a reveal is square rather than round');

  // Walk a long way and check what that costs to store.
  for (let i = 0; i < 400; i += 1) minimap.revealAround(world, 1000 + i * 8, 500);
  const saved = world.serialize();
  const bytes = JSON.stringify(saved.explored).length;
  const tiles = world.exploredCount();
  ok(tiles > 50000, 'walking 3,200 tiles revealed only ' + tiles + ' tiles');
  // A bit per tile plus base64 is about 1.34 bits; anything near a byte per tile means
  // the bitset is not doing its job.
  const bitsPerTile = (bytes * 8) / tiles;
  ok(bitsPerTile < 3, 'exploration costs ' + bitsPerTile.toFixed(2)
    + ' bits per tile, which is not a bitset');
  console.log('\nwalking 3,200 tiles: ' + tiles.toLocaleString() + ' tiles revealed, '
    + (bytes / 1024).toFixed(1) + 'KB stored ('
    + bitsPerTile.toFixed(2) + ' bits per tile)');
}

console.log(checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
