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
  // A summoned boss is deliberately outside the spawn table: no weight, no layers, and
  // no pool anywhere may contain it. Everything else must be choosable.
  if (spec.summonOnly) {
    ok(spec.weight === 0, spec.key + ' is summon-only and still carries a spawn weight');
    ok(!!spec.boss, spec.key + ' is summon-only but is not a boss');
    ok(Array.isArray(spec.bossDrops) && spec.bossDrops.length > 0,
      spec.key + ' is a boss and drops nothing worth the fight');
    ok(spec.hp > 500, spec.key + ' is a boss with ' + spec.hp + ' health');
  } else if (!spec.hiddenSpawn) {
    ok(spec.weight > 0, spec.key + ' can never be chosen');
  }
  ok(spec.w > 0 && spec.h > 0, spec.key + ' has no size');
  for (const layer of spec.layers || []) {
    ok(worldgen.LAYERS.some(l => l.key === layer),
      spec.key + ' spawns in unknown layer ' + layer);
  }
  for (const biome of spec.biomes || []) {
    ok([...worldgen.BIOMES, worldgen.HALLOW_BIOME].some(b => b.key === biome),
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
  const ctx = { biome, layer, dungeon: spec.dungeon, lowerOssuary: spec.lowerOssuary, wyvernsUnlocked: spec.wyvernsUnlocked, wet: !!spec.wet, day: spec.day === false ? false : true,
    event: spec.event || null };
  if (spec.summonOnly || spec.hiddenSpawn) {
    // The one thing a summon-only enemy must prove: that there is no situation at all
    // in which the spawn table could produce it. Checked against every combination the
    // game can actually be in, not just against its own declared habitat.
    for (const l of ['surface', 'caves', 'deep', 'hell', 'hellcaves', 'sky', 'space']) {
      for (const b of ['plains', 'forest', 'ocean', 'jungle', 'blight', 'crimson']) {
        for (const wet of [true, false]) {
          for (const day of [true, false]) {
            for (const event of [null, 'bloodmoon']) {
              ok(poolFor({ biome: b, layer: l, wet, day, event }).indexOf(spec) === -1,
                spec.key + ' can be spawned in ' + l + '/' + b);
            }
          }
        }
      }
    }
    continue;
  }
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

{
  const habitat = { biome: 'forest', layer: 'space', wet: false, day: true, event: null };
  const wild = ENEMIES.find(spec => spec.key === 'wildwyvern');
  ok(!poolFor(habitat).includes(wild), 'wild wyverns spawned before Astraeus was defeated');
  ok(poolFor({ ...habitat, wyvernsUnlocked: true }).includes(wild), 'wild wyverns remain locked after victory');
  ok(!poolFor({ ...habitat, layer: 'sky', wyvernsUnlocked: true }).includes(wild), 'wild wyverns left Space');
  ok(wild.drops.some(([key, count]) => key === 'wyvern-essence' && count > 0), 'wild wyverns do not supply essence');
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

// --- 5b. events --------------------------------------------------------------------------
// An event enemy must be impossible outside its event, and the event must not suppress
// the ordinary roster: a blood moon is the usual night with worse things added to it.
{
  const night = { biome: 'forest', layer: 'surface', wet: false, day: false, event: null };
  const blood = Object.assign({}, night, { event: 'bloodmoon' });
  const ordinary = poolFor(night);
  const cursed = poolFor(blood);
  const eventers = ENEMIES.filter(e => e.event === 'bloodmoon');
  ok(eventers.length >= 3, 'only ' + eventers.length + ' enemies belong to the blood moon');
  for (const spec of eventers) {
    ok(ordinary.indexOf(spec) === -1, spec.key + ' spawns on an ordinary night');
    ok(cursed.indexOf(spec) !== -1, spec.key + ' does not spawn during its own event');
    ok(spec.hp > 50, spec.key + ' is a blood moon enemy with only ' + spec.hp + ' health');
  }
  for (const spec of ordinary) {
    ok(cursed.indexOf(spec) !== -1,
      spec.key + ' stops spawning during a blood moon, which should only add to the night');
  }
  ok(cursed.length === ordinary.length + eventers.length,
    'the blood moon pool is not the ordinary pool plus its own');
  // And daytime is never a blood moon's hour, whatever the flag says.
  const dayBlood = poolFor(Object.assign({}, blood, { day: true }));
  for (const spec of eventers) {
    ok(dayBlood.indexOf(spec) === -1, spec.key + ' spawned in daylight');
  }
}

// --- 6. the king -----------------------------------------------------------------------
// A boss is the one enemy the player chooses to meet, so the things worth proving are the
// three rules it breaks: distance does not work, ignoring the room does not work, and it
// gets harder as it dies.
{
  // A flat floor with open air above it, which is the arena the fight assumes.
  const W = 400;
  const H = 60;
  const FLOOR = 40;
  const stone = tiles.idOf('stone');
  const arena = {
    seed: 7,
    get(x, y) {
      if (x < 0 || x >= W || y < 0 || y >= H) return stone;
      return y >= FLOOR ? stone : tiles.AIR;
    },
    set() { return true; },
    getWall() { return 0; },
    setWall() { return true; },
    isWallSafe() { return false; }
  };
  const flat = { biomeAt: () => ({ key: 'plains' }), layerAt: () => ({ key: 'surface' }) };
  const swarm = enemyModule.makeSwarm(arena, tiles, { worldgen: flat, random: () => 0.5 });
  const player = { x: 60, y: FLOOR - 2, width: 0.8, height: 1.8 };

  const king = swarm.summon('kingslime', player);
  ok(!!king, 'the king could not be summoned onto open ground');
  ok(king.boss === true, 'the king does not know it is a boss');
  ok(swarm.bossAlive() === king, 'the swarm cannot find the boss it just made');
  ok(swarm.summon('kingslime', player) === null, 'a second king was summoned');
  ok(swarm.trySpawn(player, 0.5) === null, 'ordinary enemies spawned during a boss fight');
  ok(!tiles.isSolid(arena.get(Math.floor(king.x), Math.floor(king.y))),
    'the king was summoned inside the rock');
  ok(tiles.isSolid(arena.get(Math.floor(king.x), Math.ceil(king.y + king.height))),
    'the king was summoned in mid-air');

  // Nothing but a boss can be summoned.
  ok(swarm.summon('greenslime', player) === null, 'an ordinary slime could be summoned');
  ok(swarm.summon('nosuchthing', player) === null, 'a monster that does not exist was summoned');

  // It throws off minions, and stops at its own limit.
  for (let i = 0; i < 60 * 30; i += 1) swarm.step(player, 1 / 60, 0.5);
  const minions = swarm.list.filter(e => e.summonedBy === 'kingslime');
  ok(minions.length > 0, 'the king never produced a single minion');
  ok(minions.length <= ARCHETYPES.king.minions, 'the king produced ' + minions.length
    + ' minions, past its own limit of ' + ARCHETYPES.king.minions);

  // It keeps its feet. The whole fight happens on the floor, so a king that sinks into
  // the ground or floats off it is the fight broken.
  for (let i = 0; i < 60 * 20; i += 1) {
    swarm.step(player, 1 / 60, 0.5);
    ok(king.y + king.height < FLOOR + 2, 'the king sank through the floor');
  }

  // Distance is not an answer: walk away and it arrives anyway.
  player.x = 320;
  let caught = false;
  for (let i = 0; i < 60 * 25 && !caught; i += 1) {
    swarm.step(player, 1 / 60, 0.5);
    if (Math.abs(king.x - player.x) < 12) caught = true;
  }
  ok(caught, 'the king never reached a player who walked away: it stopped at '
    + king.x.toFixed(0) + ' with the player at ' + player.x);
  ok(swarm.list.indexOf(king) !== -1, 'the king despawned when the player walked off');

  // And it shrinks as it is hurt, in proportion and without leaving the floor.
  const fullW = king.width;
  const fullH = king.height;
  while (king.hp > king.maxHp * 0.1) {
    swarm.damage(king, 40);
    swarm.step(player, 1 / 60, 0.5);
  }
  ok(king.width < fullW * 0.75, 'the king did not shrink: ' + king.width.toFixed(2)
    + ' of ' + fullW.toFixed(2));
  ok(king.height < fullH * 0.75, 'the king did not shrink vertically');
  const ratio = (king.width / king.height) / (fullW / fullH);
  ok(ratio > 0.8 && ratio < 1.25, 'the king shrank out of proportion');
  ok(king.y + king.height < FLOOR + 2 && king.y + king.height > FLOOR - 6,
    'shrinking lifted the king off the floor or pushed it into it');

  // Killing it ends the fight.
  swarm.damage(king, king.maxHp);
  ok(king.dead, 'the king survived its own health being spent');
  swarm.step(player, 1 / 60, 0.5);
  ok(swarm.bossAlive() === null, 'the boss is still alive after dying');
}

// --- 6b. every boss, whatever it is ---------------------------------------------------------
// The King's own fight is tested above. These are the claims that have to hold for any
// boss at all, and they are written once over the roster rather than once per boss,
// because the second boss is the reason the first one's code was worth generalising.
{
  const W = 400;
  const H = 120;
  const FLOOR = 90;
  const stone = tiles.idOf('stone');
  const arena = {
    seed: 11,
    get(x, y) {
      if (x < 0 || x >= W || y < 0 || y >= H) return stone;
      return y >= FLOOR ? stone : tiles.AIR;
    },
    set() { return true; },
    getWall() { return 0; },
    setWall() { return true; },
    isWallSafe() { return false; }
  };
  const flat = { biomeAt: () => ({ key: 'plains' }), layerAt: () => ({ key: 'surface' }) };

  const mimicSwarm = enemyModule.makeSwarm(arena, tiles, { worldgen: flat });
  ok(mimicSwarm.wakeMimic(20, FLOOR - 2)?.key === 'forestmimic', 'chest did not awaken a mimic');
  ok(mimicSwarm.wakeMimic(40, FLOOR - 2, 'desertmimic')?.key === 'desertmimic', 'Dune Mimic did not awaken');
  ok(mimicSwarm.wakeMimic(20, FLOOR) === null, 'mimic spawned inside rock');

  const bosses = ENEMIES.filter(e => e.boss);
  ok(bosses.length >= 2, 'only ' + bosses.length + ' boss(es): nothing proves the shape generalises');

  for (const spec of bosses) {
    const swarm = enemyModule.makeSwarm(arena, tiles, { worldgen: flat, random: () => 0.5 });
    const player = { x: 200, y: FLOOR - 2, width: 0.8, height: 1.8 };
    const boss = swarm.summon(spec.key, player);
    ok(!!boss, spec.key + ' could not be summoned into an open arena');
    if (!boss) continue;

    ok(boss.boss === true, spec.key + ' does not know it is a boss');
    ok(swarm.summon(spec.key, player) === null, 'a second ' + spec.key + ' was summoned');
    ok(swarm.trySpawn(player, 0.5) === null,
      'ordinary enemies spawned during the ' + spec.key + ' fight');
    ok(!tiles.isSolid(arena.get(Math.floor(boss.x), Math.floor(boss.y))),
      spec.key + ' was summoned inside the rock');

    // It stays in the world, it stays finite, and it stays somewhere near the player
    // over a long fight - a boss that drifts off the map is a fight that cannot end.
    let worst = 0;
    for (let i = 0; i < 60 * 60; i += 1) {
      swarm.step(player, 1 / 60, 0.5);
      ok(Number.isFinite(boss.x) && Number.isFinite(boss.y),
        spec.key + ' left the number line at ' + boss.x + ',' + boss.y);
      if (!Number.isFinite(boss.x)) break;
      worst = Math.max(worst, Math.hypot(boss.x - player.x, boss.y - player.y));
      ok(swarm.list.indexOf(boss) !== -1, spec.key + ' despawned mid-fight');
    }
    ok(worst < 70, spec.key + ' wandered ' + worst.toFixed(0) + ' tiles from the player');

    // It produces minions, and stops at its own limit.
    const arch = ARCHETYPES[spec.kind];
    if (arch.minion) {
      const mine = swarm.list.filter(e => e.summonedBy === spec.key);
      ok(mine.length <= arch.minions, spec.key + ' produced ' + mine.length
        + ' minions, past its limit of ' + arch.minions);
    }

    // Hurting it changes the fight: the King shrinks, the Eye enrages. One or the other
    // must happen, or the second half of the fight is the first half again.
    const beforeW = boss.width;
    const beforeEnraged = !!boss.enraged;
    while (boss.hp > boss.maxHp * 0.2) {
      swarm.damage(boss, 60);
      swarm.step(player, 1 / 60, 0.5);
    }
    const changed = boss.width < beforeW * 0.9 || (!!boss.enraged && !beforeEnraged);
    ok(changed, spec.key + ' fights exactly the same at 20% health as at full');

    // And killing it ends the fight.
    swarm.damage(boss, boss.maxHp);
    ok(boss.dead, spec.key + ' survived its own health being spent');
    swarm.step(player, 1 / 60, 0.5);
    ok(swarm.bossAlive() === null, spec.key + ' is still alive after dying');
  }
}

// The three Hardmode fights send different telegraphed volleys through the same combat hook.
{
  const player = { x: 200, y: FLOOR - 2, width: 0.8, height: 1.8 };
  const arena = makeTestWorld(FLOOR);
  const flat = { biomeAt: () => ({ key: 'forest' }), layerAt: () => ({ key: 'surface' }) };
  for (const [key, pattern, count] of [
    ['glasscolossus', 'shatter', 2], ['coilserpent', 'cross', 4], ['zenithengine', 'fan', 5]
  ]) {
    const volleys = [];
    const swarm = enemyModule.makeSwarm(arena, tiles, { worldgen: flat, bossBarrage: (_, shot) => volleys.push(shot) });
    const boss = swarm.summon(key, player);
    ok(!!boss, key + ' cannot be summoned for the barrage check');
    if (!boss) continue;
    let warned = false;
    for (let frame = 0; frame < 1200 && !volleys.length; frame += 1) {
      swarm.step(player, 1 / 60, 0.5);
      warned ||= !!boss.beams && !boss.beams.live;
    }
    ok(warned && volleys[0]?.pattern === pattern && volleys[0].angles.length === count,
      key + ' failed to telegraph its signature attack');
    if (key === 'glasscolossus') {
      const hp = boss.hp;
      swarm.damage(boss, 100);
      ok(boss.hp === hp - 74, 'Colossus armor failed to reduce damage');
      boss.beams = { live: false };
      swarm.damage(boss, 100);
      ok(boss.hp === hp - 174, 'Colossus armor did not open during its windup');
    }
  }
}

// --- 6c. the charge is a charge ------------------------------------------------------------------
// The Hollow Eye's whole fight is that it commits to a line before it starts and cannot
// steer afterwards. If it tracked the player mid-charge there would be nothing to dodge.
{
  const air = {
    seed: 3,
    get: () => tiles.AIR,
    set: () => true, getWall: () => 0, setWall: () => true, isWallSafe: () => false
  };
  const flat = { biomeAt: () => ({ key: 'plains' }), layerAt: () => ({ key: 'surface' }) };
  const swarm = enemyModule.makeSwarm(air, tiles, { worldgen: flat, random: () => 0.5 });
  const player = { x: 100, y: 100, width: 0.8, height: 1.8 };
  const eye = swarm.summon('hollloweye', player);
  ok(!!eye, 'the Hollow Eye could not be summoned into open air');

  // Run until it commits, then move the player a long way and check it does not follow.
  let charging = false;
  for (let i = 0; i < 60 * 20 && !charging; i += 1) {
    swarm.step(player, 1 / 60, 0.5);
    charging = eye.charge > 0;
  }
  ok(charging, 'the Hollow Eye never charged in twenty seconds');
  if (charging) {
    const vx = eye.vx;
    const vy = eye.vy;
    player.x += 60;
    player.y -= 30;
    swarm.step(player, 1 / 60, 0.5);
    ok(Math.abs(eye.vx - vx) < 1e-9 && Math.abs(eye.vy - vy) < 1e-9,
      'the Hollow Eye steered mid-charge: there would be nothing to dodge');
    ok(Math.hypot(vx, vy) > ARCHETYPES.hover.speed * 2,
      'a charge is no faster than hovering');
  }

  // And enraged it charges more often and winds up for less time.
  const calm = { chargeEvery: ARCHETYPES.hover.chargeEvery, windUp: ARCHETYPES.hover.windUp };
  ok(ARCHETYPES.hover.enrageCharge < 1, 'enraging does not shorten the gap between charges');
  ok(ARCHETYPES.hover.enrageWindUp < calm.windUp, 'enraging does not shorten the tell');
  ok(ARCHETYPES.hover.enrageSpeed > 1, 'enraging does not make the charge faster');
}

console.log('\nroster by layer:');
for (const layer of worldgen.LAYERS) {
  const own = ENEMIES.filter(e => e.layers && e.layers.indexOf(layer.key) !== -1);
  console.log('  ' + layer.key.padEnd(10) + own.length + '  ' + own.map(e => e.name).join(', '));
}

console.log('\n' + checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
