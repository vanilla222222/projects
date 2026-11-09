'use strict';
// The live world: block and wall layers, the edit diff that is the save file, and the
// safe-wall rule. REFERENCE.md records where these mechanics come from.
const assert = require('node:assert/strict');
const tiles = require('../js/tiles.js');
const gen = require('../js/worldgen.js');
const { makeWorld } = require('../js/chunks.js');

const SEED = 20260105;
let checks = 0;
function check(c, m) { assert.ok(c, m); checks += 1; }

const world = makeWorld(SEED, gen);
const x = 120;
const surface = gen.surfaceHeight(SEED, x);
const deep = surface + 80;

// A block and a wall occupy the same tile; mining the block leaves the wall.
check(tiles.isSolid(world.get(x, deep)), 'expected solid ground 80 below the surface');
const wallBefore = world.getWall(x, deep);
check(wallBefore !== 0, 'a below-surface tile should carry a wall');
world.set(x, deep, tiles.AIR);
check(world.get(x, deep) === tiles.AIR, 'the block was not removed');
check(world.getWall(x, deep) === wallBefore, 'mining a block destroyed the wall behind it');

// Walls are never collidable, whatever they are.
for (const spec of tiles.WALLS) {
  check(spec.solid === undefined, 'wall ' + spec.key + ' declares solidity; walls never collide');
}

// Naturally generated walls are unsafe; player-placed walls are safe.
check(!world.isWallSafe(x, deep), 'a generated wall reported itself safe');
world.setWall(x, deep, tiles.wallIdOf('plankwall'));
check(world.isWallSafe(x, deep), 'a player-placed wall reported itself unsafe');
check(world.getWall(x, deep) === tiles.wallIdOf('plankwall'), 'the placed wall did not take');

// Restoring a wall to exactly what generation made drops the edit, and with it the safety.
world.setWall(x, deep, wallBefore);
check(!world.isWallSafe(x, deep), 'a wall restored to its generated value stayed safe');

// The save is the seed plus the diff, not the world.
const saved = world.serialize();
check(saved.seed === SEED, 'the save did not record its seed');
const blockEdits = Object.values(saved.edits).reduce((n, list) => n + list.length, 0);
check(blockEdits === 1, 'expected exactly the one mined block in the save, saw ' + blockEdits);
const wallEditCount = Object.values(saved.wallEdits || {}).reduce((n, list) => n + list.length, 0);
check(wallEditCount === 0, 'a wall restored to its generated value is still in the save');

// A restored world reproduces the edits and nothing else.
const reloaded = makeWorld(SEED, gen);
reloaded.restore(saved);
check(reloaded.get(x, deep) === tiles.AIR, 'the mined block did not survive a save round trip');
check(reloaded.get(x + 1, deep) === world.get(x + 1, deep), 'an untouched tile changed across a save');

// Walls let much more light through than the blocks in front of them.
for (const spec of tiles.WALLS) {
  if (!spec.colour) continue;
  check(tiles.wallOpacityOf(spec.id) < tiles.opacityOf(tiles.idOf('stone')),
    'wall ' + spec.key + ' blocks as much light as solid stone');
}

{
  const hardWorld = makeWorld(SEED, gen);
  const hallowX = Array.from({ length: 2000 }, (_, i) => i + 600)
    .find(x => gen.isHallowRegion(SEED, x));
  check(Number.isFinite(hallowX), 'seed has no Hallow region');
  const surface = gen.surfaceHeight(SEED, hallowX);
  const oldSurface = hardWorld.get(hallowX, surface);
  hardWorld.markExplored(hallowX, surface);
  check(hardWorld.enableHardmode() && !hardWorld.enableHardmode(), 'Hardmode should activate once');
  check(hardWorld.get(hallowX, surface) === oldSurface && hardWorld.biomeAt(hallowX, surface).key !== 'hallow',
    'Hardmode modified an already explored surface chunk');
  for (const [ore, depth] of [['palladium', 300], ['mythril', 1030], ['adamantite', 2050]]) {
    let found = null;
    const id = tiles.idOf(ore);
    for (let x = 600; x < 940 && !found; x += 3) {
      for (let y = gen.SEA_LEVEL + depth; y < gen.SEA_LEVEL + depth + 70; y += 3) {
        if (hardWorld.get(x, y) === id) { found = { x, y }; break; }
      }
    }
    check(!!found, ore + ' did not generate in Hardmode');
    if (found) {
      hardWorld.set(found.x, found.y, tiles.AIR);
      const copy = makeWorld(SEED, gen);
      copy.restore(hardWorld.serialize());
      check(copy.hardmode && copy.get(found.x, found.y) === tiles.AIR, ore + ' regenerated after mining and saving');
    }
  }
}

{
  const exhibit = tiles.idOf('terrarium-amethyst-cave-moth');
  const exhibitWorld = makeWorld(SEED, gen);
  exhibitWorld.set(7, 100, exhibit);
  const restored = makeWorld(SEED, gen);
  restored.restore(JSON.parse(JSON.stringify(exhibitWorld.serialize())));
  check(restored.get(7, 100) === exhibit, 'terrarium lost its specimen during world reload');
  check(tiles.tile(exhibit).specimen.gem === 'amethyst', 'crystal terrarium lost its matching gemstone');
}

{
  const world = makeWorld(SEED, gen);
  const found = new Map();
  const starrock = tiles.idOf('starrock');
  for (let slot = -150; slot <= 150 && found.size < 3; slot += 1) {
    const planet = gen.planetoidAt(SEED, slot);
    if (!planet) continue;
    for (let dy = -3; dy <= 3; dy += 1) for (let dx = -3; dx <= 3; dx += 1) {
      const x = planet.cx + dx, y = planet.cy + dy;
      if (world.get(x, y) !== starrock) continue;
      const ore = gen.astralTileAt(SEED, x, y, starrock);
      if (ore !== starrock && !found.has(ore)) found.set(ore, { x, y });
    }
  }
  check(found.size === 3, 'the Astral stage did not populate three planetoid ores');
  const [editedOre, edited] = found.entries().next().value;
  world.set(edited.x, edited.y, tiles.AIR);
  check(world.enableAstral() && !world.enableAstral(), 'Astral unlock was not idempotent');
  for (const [ore, { x, y }] of found) {
    check(world.get(x, y) === (ore === editedOre ? tiles.AIR : ore), 'Astral overlay lost a planetoid ore or a player edit');
  }
  const restored = makeWorld(SEED, gen);
  restored.restore(JSON.parse(JSON.stringify(world.serialize())));
  check(restored.astral, 'Astral unlock did not survive reload');
  for (const [ore, { x, y }] of found) {
    check(restored.get(x, y) === (ore === editedOre ? tiles.AIR : ore), 'Astral reload changed terrain or a player edit');
  }
}

{
  check(gen.generationSeed(SEED, { day: 'slow' }) === SEED, 'gameplay options affected terrain identity');
  const scarce = gen.generationSeed(SEED, { structures: 'scarce', longCaves: 'off', ores: 'lean', forest: 'small' });
  const rich = gen.generationSeed(SEED, { structures: 'more', longCaves: 'many', ores: 'rich', forest: 'large' });
  let scarceStructures = 0, richStructures = 0, scarceOres = 0, richOres = 0;
  for (let i = -80; i < 80; i += 1) {
    scarceStructures += Boolean(gen.structureAt(scarce, i));
    richStructures += Boolean(gen.structureAt(rich, i));
    check(!gen.longCaveLayout(scarce, i), 'disabled long cave generated');
    for (let y = 80; y < 850; y += 11) {
      scarceOres += Boolean(gen.oreAt(scarce, i * 3, y, y - 20));
      richOres += Boolean(gen.oreAt(rich, i * 3, y, y - 20));
    }
  }
  check(richStructures > scarceStructures && richOres > scarceOres, 'resource or structure settings had no effect');
  check(gen.starterForestEdge(scarce) < gen.starterForestEdge(rich), 'starting forest width did not change');
  check(makeWorld(rich, gen).serialize().seed === SEED, 'custom world did not serialize a portable numeric seed');
}

console.log('World: ' + checks + ' checks passed across both layers, the edit diff and the safe-wall rule');
