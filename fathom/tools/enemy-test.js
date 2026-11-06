'use strict';
// Enemies. The claim worth proving is coverage: every biome and every vertical layer must
// have something that can spawn there, or a whole region of the world is empty. After
// that, the rules that keep the system honest - a shelter suppresses spawns, nothing
// spawns in view, nothing spawns inside rock, and the roster is internally consistent.

const tiles = require('../js/tiles.js');
const worldgen = require('../js/worldgen.js');
const craft = require('../js/craft.js');
const enemyModule = require('../js/enemy.js');

let checks = 0;
let failures = 0;
function ok(cond, label) {
  checks += 1;
  if (!cond) { failures += 1; console.log('FAIL: ' + label); }
}

const { ENEMIES, ARCHETYPES, poolFor, makeSwarm } = enemyModule;

// --- 1. the roster is well formed ---------------------------------------------------
const seenKeys = new Set();
for (const spec of ENEMIES) {
  ok(!seenKeys.has(spec.key), 'duplicate enemy key ' + spec.key);
  seenKeys.add(spec.key);
  ok(!!ARCHETYPES[spec.kind], spec.key + ' has unknown archetype ' + spec.kind);
  ok(spec.hp > 0, spec.key + ' has no health');
  ok(spec.damage > 0, spec.key + ' does no damage');
  ok(spec.weight > 0, spec.key + ' can never be chosen');
  ok(spec.w > 0 && spec.h > 0, spec.key + ' has no size');
  for (const layer of spec.layers || []) {
    ok(worldgen.LAYERS.some(l => l.key === layer),
      spec.key + ' spawns in unknown layer ' + layer);
  }
  for (const biome of spec.biomes || []) {
    ok(worldgen.BIOMES.some(b => b.key === biome),
      spec.key + ' spawns in unknown biome ' + biome);
  }
  for (const [key, count] of spec.drops || []) {
    ok(count > 0, spec.key + ' drops zero ' + key);
    ok(craft.nameOf(key, tiles) !== key, spec.key + ' drops ' + key + ', which has no name');
  }
  // A swimmer must be a wet spawner and nothing else should be.
  if (ARCHETYPES[spec.kind].needsLiquid) {
    ok(spec.wet === true, spec.key + ' swims but is not marked wet');
  }
}

// --- 2. coverage: nowhere in the world is empty --------------------------------------
// Every biome must have a surface roster, by day and by night.
const surfaceBiomes = worldgen.BIOMES.map(b => b.key);
for (const biome of surfaceBiomes) {
  for (const day of [true, false]) {
    const dry = poolFor({ biome, layer: 'surface', wet: false, day });
    const wet = poolFor({ biome, layer: 'surface', wet: true, day });
    ok(dry.length + wet.length > 0,
      biome + ' has nothing that can spawn on its surface ' + (day ? 'by day' : 'at night'));
  }
}
// Every vertical layer must have a roster in at least one biome.
for (const layer of worldgen.LAYERS) {
  let total = 0;
  for (const biome of surfaceBiomes) {
    for (const wet of [false, true]) {
      total += poolFor({ biome, layer: layer.key, wet, day: false }).length;
    }
  }
  ok(total > 0, 'layer ' + layer.key + ' has no enemies at all');
}
// And the deep layers must not just inherit the surface roster: each needs its own.
for (const layer of ['caves', 'deep', 'hell', 'hellcaves', 'sky', 'space']) {
  const own = ENEMIES.filter(e => e.layers && e.layers.indexOf(layer) !== -1);
  ok(own.length >= 2, 'layer ' + layer + ' has only ' + own.length + ' enemies of its own');
}

// --- 3. the pool respects its filters --------------------------------------------------
for (const spec of ENEMIES) {
  const layer = (spec.layers || ['surface'])[0];
  const biome = (spec.biomes || ['plains'])[0];
  const ctx = { biome, layer, wet: !!spec.wet, day: spec.day === false ? false : true };
  ok(poolFor(ctx).indexOf(spec) !== -1, spec.key + ' cannot spawn in its own habitat');
  // A night-only enemy must be absent by day, and vice versa.
  if (spec.day === false) {
    ok(poolFor({ ...ctx, day: true }).indexOf(spec) === -1,
      spec.key + ' is night-only but appears by day');
  }
  // A dry enemy must never appear in a wet context, and a wet one never in a dry one.
  ok(poolFor({ ...ctx, wet: !spec.wet }).indexOf(spec) === -1,
    spec.key + ' ignores whether its spawn point is underwater');
}

// --- 4. spawning rules against a real world ---------------------------------------------
// A stub world: solid below a floor line, air above, with a settable safe-wall region.
function makeTestWorld(floor) {
  const safe = new Set();
  return {
    seed: 7,
    LEVEL_FULL: 255,
    get(x, y) { return y >= floor ? tiles.idOf('stone') : tiles.AIR; },
    getLevel() { return 0; },
    isWallSafe(x, y) { return safe.has(x + ',' + y); },
    markSafe(x0, x1, y0, y1) {
      for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) safe.add(x + ',' + y);
    }
  };
}

const FLOOR = 400;
const world = makeTestWorld(FLOOR);
const player = { x: 0, y: FLOOR - 2, width: 0.78, height: 1.72 };

// Deterministic rolls, so a spawn test is a test and not a coin flip.
function fixedRandom(values) {
  let i = 0;
  return () => values[(i += 1) % values.length];
}

const swarm = makeSwarm(world, tiles, { worldgen, random: fixedRandom([0.1, 0.9, 0.35, 0.62, 0.5]) });

// Nothing may spawn inside the ring the player can see.
let spawned = 0;
for (let i = 0; i < 400; i += 1) {
  const e = swarm.trySpawn(player, 0.5);
  if (!e) continue;
  spawned += 1;
  const dist = Math.hypot(e.x - player.x, e.y - player.y);
  ok(dist >= enemyModule.SPAWN_MIN - 2,
    e.key + ' spawned ' + dist.toFixed(1) + ' tiles away, inside the visible ring');
  ok(dist <= enemyModule.SPAWN_MAX + 3,
    e.key + ' spawned ' + dist.toFixed(1) + ' tiles away, beyond the spawn ring');
  // And never inside rock.
  const arch = ARCHETYPES[e.spec.kind];
  if (!arch.burrows) {
    ok(!tiles.isSolid(world.get(Math.floor(e.x), Math.floor(e.y))),
      e.key + ' spawned inside solid rock');
  }
}
ok(spawned > 0, 'nothing ever spawned in 400 attempts');
ok(swarm.count <= enemyModule.MAX_ALIVE,
  'the population reached ' + swarm.count + ', over the cap of ' + enemyModule.MAX_ALIVE);

// --- 5. a shelter suppresses spawns -----------------------------------------------------
const walled = makeTestWorld(FLOOR);
walled.markSafe(-200, 200, FLOOR - 200, FLOOR + 200);
const sheltered = makeSwarm(walled, tiles, { worldgen, random: fixedRandom([0.1, 0.9, 0.35, 0.62, 0.5]) });
let inShelter = 0;
for (let i = 0; i < 400; i += 1) if (sheltered.trySpawn(player, 0.5)) inShelter += 1;
ok(inShelter === 0, inShelter + ' enemies spawned inside a player-walled shelter');

// --- 6. behaviour: enemies approach, and the cap and despawn hold -----------------------
const chase = makeSwarm(world, tiles, { worldgen, random: fixedRandom([0.1, 0.9, 0.35, 0.62, 0.5]) });
const walker = enemyModule.makeEnemy(enemyModule.BY_KEY.zombie, player.x + 14, FLOOR - 2);
chase.list.push(walker);
const startGap = Math.abs(walker.x - player.x);
for (let i = 0; i < 240; i += 1) chase.step(player, 1 / 60, 0.5);
ok(Math.abs(walker.x - player.x) < startGap,
  'a walker got no closer in four seconds: ' + startGap.toFixed(1)
  + ' -> ' + Math.abs(walker.x - player.x).toFixed(1));
ok(!tiles.isSolid(world.get(Math.floor(walker.x), Math.floor(walker.y))),
  'a walker ended up inside the floor');

const flyer = enemyModule.makeEnemy(enemyModule.BY_KEY.cavebat, player.x + 20, FLOOR - 30);
chase.list.push(flyer);
const flyGap = Math.hypot(flyer.x - player.x, flyer.y - player.y);
for (let i = 0; i < 180; i += 1) chase.step(player, 1 / 60, 0.5);
ok(Math.hypot(flyer.x - player.x, flyer.y - player.y) < flyGap, 'a flyer did not close in');

// Anything left far behind is dropped rather than simulated forever.
const far = enemyModule.makeEnemy(enemyModule.BY_KEY.zombie, player.x + enemyModule.DESPAWN + 20, FLOOR - 2);
chase.list.push(far);
chase.step(player, 1 / 60, 0.5);
ok(chase.list.indexOf(far) === -1, 'an enemy far outside the world was not despawned');

// --- 7. damage and death ------------------------------------------------------------------
const victim = enemyModule.makeEnemy(enemyModule.BY_KEY.greenslime, 0, 0);
ok(!chase.damage(victim, victim.maxHp - 1), 'an enemy died one point early');
ok(chase.damage(victim, 1), 'an enemy survived exactly lethal damage');
ok(victim.dead, 'a killed enemy is not marked dead');

console.log('\nroster by layer:');
for (const layer of worldgen.LAYERS) {
  const own = ENEMIES.filter(e => e.layers && e.layers.indexOf(layer.key) !== -1);
  console.log('  ' + layer.key.padEnd(10) + own.length + '  ' + own.map(e => e.name).join(', '));
}

console.log('\n' + checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
