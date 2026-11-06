'use strict';
// Enemies. Every biome and every vertical layer has its own roster, so where you are is
// told by what is trying to kill you as much as by the rock around you.
//
// Three ideas carry the system:
//
//   - A spawn is chosen from a weighted pool keyed on (biome, layer, day/night, wet). A
//     pool that comes back empty means nothing spawns, which is how a safe place stays
//     safe without a special case.
//   - Spawning happens in a ring: outside what the player can see, inside what the
//     simulation keeps loaded. Spawning in view looks like cheating and spawning too far
//     out wastes the budget on things nobody will ever meet.
//   - Player-placed walls suppress spawning, exactly as they do in Terraria. The world
//     already knows which walls those are, because "the player put it there" is recorded
//     in the wall edit diff, so a built shelter is safe for free.
//
// Behaviour lives in archetypes rather than per-enemy code: a slime hops, a bat flies, a
// worm swims through rock. Thirty-odd enemies share six behaviours.

const ARCHETYPES = {
  // Hops toward the player on a timer. Harmless on open ground, awful on a ledge.
  slime: { gravity: 46, maxFall: 40, hop: 10.6, hopEvery: 1.05, speed: 3.1, air: 0.5 },
  // Walks, falls, and steps up a single tile. The baseline ground enemy.
  walker: { gravity: 52, maxFall: 46, speed: 4.4, air: 0.35, stepUp: 1 },
  // Ignores terrain entirely and bobs toward the player.
  flyer: { gravity: 0, speed: 5.2, bob: 1.6, wander: 0.4 },
  // Only moves in liquid; flounders and sinks in air.
  swimmer: { gravity: 6, maxFall: 4, speed: 5.6, needsLiquid: true },
  // Clings to solid surfaces and runs along them, including ceilings.
  crawler: { gravity: 30, maxFall: 30, speed: 5.0, clings: true },
  // Travels through solid rock as easily as air, surfacing to strike.
  worm: { gravity: 0, speed: 4.6, burrows: true }
};

// Every enemy drops coins, scaled to what it was: a slime is pocket change, an obsidian
// husk is a day's wages. Coins are what villagers want, so what you kill is what pays for
// what you buy.
// weight is relative within whichever pool the enemy lands in. `layers` and `biomes` are
// filters: an empty or absent list means "anywhere". `day`/`night` default to both.
const ENEMIES = [
  // --- surface, temperate -------------------------------------------------------------
  { key: 'greenslime', name: 'Green Slime', kind: 'slime', hp: 25, damage: 6, weight: 10,
    w: 1.1, h: 0.85, colour: '#58b05a', layers: ['surface'],
    biomes: ['plains', 'forest', 'savanna', 'highlands'], drops: [['gel', 2], ['coin', 2]] },
  { key: 'blueslime', name: 'Blue Slime', kind: 'slime', hp: 35, damage: 8, weight: 6,
    w: 1.2, h: 0.95, colour: '#4a79c9', layers: ['surface', 'caves'],
    biomes: ['plains', 'forest', 'marsh'], drops: [['gel', 2], ['coin', 3]] },
  { key: 'zombie', name: 'Zombie', kind: 'walker', hp: 45, damage: 12, weight: 9,
    w: 0.8, h: 1.7, colour: '#5f7a52', layers: ['surface'], night: true, day: false,
    drops: [['rottenflesh', 1], ['coin', 4]] },
  { key: 'demoneye', name: 'Demon Eye', kind: 'flyer', hp: 32, damage: 11, weight: 7,
    w: 0.95, h: 0.95, colour: '#b4484f', layers: ['surface'], night: true, day: false,
    drops: [['lens', 1], ['coin', 3]] },

  // --- surface, cold --------------------------------------------------------------------
  { key: 'iceslime', name: 'Ice Slime', kind: 'slime', hp: 30, damage: 8, weight: 10,
    w: 1.1, h: 0.85, colour: '#8fc8e6', layers: ['surface', 'caves'],
    biomes: ['tundra', 'taiga'], drops: [['gel', 2], ['coin', 3]] },
  { key: 'frostwight', name: 'Frost Wight', kind: 'walker', hp: 55, damage: 14, weight: 7,
    w: 0.8, h: 1.75, colour: '#9fb6cc', layers: ['surface'], biomes: ['tundra', 'taiga'],
    night: true, day: false, drops: [['rottenflesh', 1], ['coin', 5]] },

  // --- surface, dry ----------------------------------------------------------------------
  { key: 'vulture', name: 'Vulture', kind: 'flyer', hp: 28, damage: 10, weight: 9,
    w: 1.3, h: 0.8, colour: '#6b5a44', layers: ['surface'], biomes: ['desert', 'badlands'],
    drops: [['feather', 1], ['coin', 3]] },
  { key: 'antlion', name: 'Antlion', kind: 'walker', hp: 42, damage: 13, weight: 7,
    w: 1.2, h: 0.9, colour: '#8a6b3e', layers: ['surface', 'caves'], biomes: ['desert'],
    drops: [['chitin', 1], ['coin', 4]] },
  { key: 'cragstalker', name: 'Crag Stalker', kind: 'crawler', hp: 48, damage: 13, weight: 8,
    w: 1.0, h: 0.8, colour: '#6e6a74', layers: ['surface'], biomes: ['highlands', 'badlands'],
    drops: [['chitin', 1], ['coin', 4]] },

  // --- jungle and mire ---------------------------------------------------------------------
  { key: 'jungleslime', name: 'Jungle Slime', kind: 'slime', hp: 40, damage: 10, weight: 9,
    w: 1.2, h: 0.95, colour: '#3f8a3a', layers: ['surface', 'caves'], biomes: ['jungle'],
    drops: [['gel', 2], ['coin', 4]] },
  { key: 'hornet', name: 'Hornet', kind: 'flyer', hp: 44, damage: 15, weight: 8,
    w: 1.1, h: 0.8, colour: '#d9b03a', layers: ['surface', 'caves'], biomes: ['jungle'],
    drops: [['stinger', 1], ['coin', 4]] },
  { key: 'boglurker', name: 'Bog Lurker', kind: 'walker', hp: 50, damage: 12, weight: 8,
    w: 0.9, h: 1.5, colour: '#4a5a38', layers: ['surface'], biomes: ['marsh'],
    drops: [['rottenflesh', 1], ['coin', 5]] },
  { key: 'mireleech', name: 'Mire Leech', kind: 'swimmer', hp: 26, damage: 9, weight: 7,
    w: 0.9, h: 0.6, colour: '#6a4450', layers: ['surface', 'caves'], biomes: ['marsh'],
    wet: true, drops: [['rottenflesh', 1], ['coin', 2]] },

  // --- shore and sea -------------------------------------------------------------------------
  { key: 'crab', name: 'Crab', kind: 'walker', hp: 22, damage: 7, weight: 10,
    w: 0.9, h: 0.6, colour: '#c05a40', layers: ['surface'], biomes: ['beach'],
    drops: [['chitin', 1], ['coin', 2]] },
  { key: 'jellyfish', name: 'Pink Jellyfish', kind: 'swimmer', hp: 30, damage: 10, weight: 9,
    w: 0.9, h: 1.0, colour: '#d472a8', layers: ['surface', 'caves'], biomes: ['ocean'],
    wet: true, emit: 4, drops: [['gel', 2], ['coin', 3]] },
  { key: 'shark', name: 'Shark', kind: 'swimmer', hp: 85, damage: 22, weight: 5,
    w: 2.1, h: 0.9, colour: '#6d7a85', layers: ['surface', 'caves'], biomes: ['ocean'],
    wet: true, drops: [['finleather', 1], ['coin', 8]] },

  // --- the blights ----------------------------------------------------------------------------
  { key: 'eaterofsouls', name: 'Eater of Souls', kind: 'flyer', hp: 48, damage: 15, weight: 10,
    w: 1.0, h: 1.0, colour: '#7a5fa8', layers: ['surface', 'caves'], biomes: ['blight'],
    drops: [['shadowscale', 1], ['coin', 4]] },
  { key: 'devourer', name: 'Devourer', kind: 'worm', hp: 70, damage: 18, weight: 6,
    w: 1.0, h: 1.0, colour: '#5d4a7d', layers: ['caves', 'deep'], biomes: ['blight'],
    drops: [['shadowscale', 1], ['coin', 6]] },
  { key: 'crimera', name: 'Crimera', kind: 'flyer', hp: 50, damage: 16, weight: 10,
    w: 1.0, h: 1.0, colour: '#b0454c', layers: ['surface', 'caves'], biomes: ['crimson'],
    drops: [['tissue', 1], ['coin', 5]] },
  { key: 'bloodcrawler', name: 'Blood Crawler', kind: 'crawler', hp: 45, damage: 14, weight: 8,
    w: 1.0, h: 0.7, colour: '#8e2f36', layers: ['surface', 'caves'], biomes: ['crimson'],
    drops: [['tissue', 1], ['coin', 4]] },

  // --- caves ---------------------------------------------------------------------------------
  { key: 'cavebat', name: 'Cave Bat', kind: 'flyer', hp: 26, damage: 9, weight: 10,
    w: 0.9, h: 0.7, colour: '#6a5b52', layers: ['caves'], drops: [['leather', 1], ['coin', 2]] },
  { key: 'giantworm', name: 'Giant Worm', kind: 'worm', hp: 40, damage: 11, weight: 7,
    w: 0.9, h: 0.9, colour: '#9a7a66', layers: ['caves'], drops: [['wormtooth', 1], ['coin', 4]] },
  { key: 'skeleton', name: 'Skeleton', kind: 'walker', hp: 60, damage: 16, weight: 9,
    w: 0.8, h: 1.7, colour: '#cfc9b8', layers: ['caves', 'deep'], drops: [['bone', 2], ['coin', 5]] },
  { key: 'salamander', name: 'Salamander', kind: 'crawler', hp: 50, damage: 15, weight: 7,
    w: 1.1, h: 0.7, colour: '#8a6a4a', layers: ['caves', 'deep'], drops: [['leather', 1], ['coin', 5]] },
  { key: 'motherslime', name: 'Mother Slime', kind: 'slime', hp: 90, damage: 14, weight: 4,
    w: 1.5, h: 1.2, colour: '#7a8f6a', layers: ['caves', 'deep'], drops: [['gel', 4], ['coin', 8]] },

  // --- deep caverns --------------------------------------------------------------------------
  { key: 'giantbat', name: 'Giant Bat', kind: 'flyer', hp: 55, damage: 18, weight: 9,
    w: 1.3, h: 0.9, colour: '#55484f', layers: ['deep'], drops: [['leather', 1], ['coin', 5]] },
  { key: 'armouredskeleton', name: 'Armoured Skeleton', kind: 'walker', hp: 110, damage: 26, weight: 6,
    w: 0.85, h: 1.75, colour: '#8e949e', layers: ['deep'], drops: [['bone', 3], ['coin', 10]] },
  { key: 'rockgolem', name: 'Rock Golem', kind: 'walker', hp: 150, damage: 30, weight: 3,
    w: 1.4, h: 2.0, colour: '#5b5a62', layers: ['deep'], drops: [['stone', 8], ['coin', 14]] },

  // --- hell ----------------------------------------------------------------------------------
  { key: 'hellbat', name: 'Hellbat', kind: 'flyer', hp: 60, damage: 22, weight: 10,
    w: 1.0, h: 0.8, colour: '#8a3a2a', layers: ['hell'], emit: 3, drops: [['cinder', 1], ['coin', 5]] },
  { key: 'fireimp', name: 'Fire Imp', kind: 'walker', hp: 95, damage: 28, weight: 6,
    w: 0.85, h: 1.5, colour: '#c2543a', layers: ['hell'], emit: 4, drops: [['cinder', 2], ['coin', 9]] },
  { key: 'lavaslime', name: 'Lava Slime', kind: 'slime', hp: 70, damage: 24, weight: 7,
    w: 1.2, h: 0.95, colour: '#e0702f', layers: ['hell'], emit: 5, drops: [['gel', 3], ['coin', 6]] },
  { key: 'boneserpent', name: 'Bone Serpent', kind: 'worm', hp: 140, damage: 32, weight: 4,
    w: 1.2, h: 1.2, colour: '#d8d2bf', layers: ['hell', 'hellcaves'], drops: [['bone', 5], ['coin', 13]] },
  { key: 'demon', name: 'Demon', kind: 'flyer', hp: 120, damage: 30, weight: 5,
    w: 1.3, h: 1.6, colour: '#9c3f6a', layers: ['hell'], drops: [['cinder', 2], ['coin', 11]] },

  // --- hell caves and below --------------------------------------------------------------------
  { key: 'cinderwraith', name: 'Cinder Wraith', kind: 'flyer', hp: 130, damage: 34, weight: 9,
    w: 1.1, h: 1.5, colour: '#b5542f', layers: ['hellcaves'], emit: 5, drops: [['cinder', 3], ['coin', 12]] },
  { key: 'magmacrawler', name: 'Magma Crawler', kind: 'crawler', hp: 115, damage: 30, weight: 8,
    w: 1.2, h: 0.8, colour: '#7a3324', layers: ['hellcaves'], emit: 3, drops: [['cinder', 2], ['coin', 10]] },
  { key: 'obsidianhusk', name: 'Obsidian Husk', kind: 'walker', hp: 200, damage: 38, weight: 5,
    w: 1.2, h: 1.9, colour: '#2e2838', layers: ['hellcaves'], drops: [['obsidian', 3], ['coin', 18]] },

  // --- sky and space -----------------------------------------------------------------------------
  { key: 'harpy', name: 'Harpy', kind: 'flyer', hp: 65, damage: 19, weight: 10,
    w: 1.2, h: 1.4, colour: '#cfb88a', layers: ['sky'], drops: [['feather', 2], ['coin', 6]] },
  { key: 'clouddrifter', name: 'Cloud Drifter', kind: 'flyer', hp: 40, damage: 12, weight: 7,
    w: 1.4, h: 1.0, colour: '#dfe7f2', layers: ['sky'], drops: [['feather', 1], ['coin', 4]] },
  { key: 'voidwyrm', name: 'Void Wyrm', kind: 'worm', hp: 180, damage: 36, weight: 6,
    w: 1.3, h: 1.3, colour: '#3c3a58', layers: ['space'], drops: [['stardust', 2], ['coin', 16]] },
  { key: 'starjelly', name: 'Star Jelly', kind: 'flyer', hp: 70, damage: 20, weight: 9,
    w: 1.0, h: 1.0, colour: '#8f9ce8', layers: ['space'], emit: 6, drops: [['stardust', 1], ['coin', 6]] }
];

const ENEMY_BY_KEY = {};
for (const e of ENEMIES) ENEMY_BY_KEY[e.key] = e;

// --- spawn selection --------------------------------------------------------------------

function matches(spec, ctx) {
  if (spec.layers && spec.layers.indexOf(ctx.layer) === -1) return false;
  if (spec.biomes && spec.biomes.indexOf(ctx.biome) === -1) return false;
  if (spec.wet && !ctx.wet) return false;
  if (!spec.wet && ctx.wet) return false;
  if (ctx.day && spec.day === false) return false;
  if (!ctx.day && spec.night === false) return false;
  return true;
}

// Everything that could spawn in this situation, with its weight. An empty pool is a
// legitimate answer: a sunlit beach at noon simply has nothing in it but crabs.
function poolFor(ctx) {
  return ENEMIES.filter(spec => matches(spec, ctx));
}

function chooseFrom(pool, roll) {
  if (pool.length === 0) return null;
  let total = 0;
  for (const spec of pool) total += spec.weight;
  let pick = roll * total;
  for (const spec of pool) {
    pick -= spec.weight;
    if (pick <= 0) return spec;
  }
  return pool[pool.length - 1];
}

function makeEnemy(spec, x, y) {
  return {
    key: spec.key,
    spec,
    x,
    y,
    vx: 0,
    vy: 0,
    hp: spec.hp,
    maxHp: spec.hp,
    facing: 1,
    width: spec.w,
    height: spec.h,
    timer: 0,
    hurt: 0,
    onGround: false,
    dead: false
  };
}

// --- the live population ------------------------------------------------------------------

const SPAWN_MIN = 22;      // no closer than this, so nothing appears in view
const SPAWN_MAX = 48;      // no further than this, so nothing spawns unseen and unmet
const DESPAWN = 86;
// Measured rather than guessed: at 9 and 1.6s the cap was reached in every trial and the
// surface felt swarmed, while a character standing still and doing nothing still survived
// past three minutes because regeneration outpaced the damage. Six and 2.8s keeps the
// pressure without the crowd.
const MAX_ALIVE = 6;
const SPAWN_EVERY = 2.8;

function makeSwarm(world, tiles, deps) {
  const { worldgen, random } = deps;
  const rng = random || Math.random;
  const list = [];
  let cooldown = SPAWN_EVERY;

  function solid(x, y) {
    return tiles.isSolid(world.get(Math.floor(x), Math.floor(y)));
  }

  function liquidAt(x, y) {
    const id = world.get(Math.floor(x), Math.floor(y));
    return tiles.tile(id).liquid ? id : 0;
  }

  function roomFor(spec, x, y) {
    for (let dy = 0; dy < Math.ceil(spec.h); dy += 1) {
      for (let dx = 0; dx < Math.ceil(spec.w); dx += 1) {
        if (solid(x + dx, y + dy)) return false;
      }
    }
    return true;
  }

  // Context at a point: which biome, which layer, is it wet, is it day. This is the whole
  // input to the spawn table.
  function contextAt(x, y, dayPhase) {
    const biome = worldgen.biomeAt(world.seed, Math.floor(x)).key;
    const layer = worldgen.layerAt(Math.floor(y)).key;
    const wet = liquidAt(x, y) !== 0;
    // Underground is never daylit, whatever the clock says.
    const surfaceish = layer === 'surface' || layer === 'sky' || layer === 'space';
    const day = surfaceish ? (dayPhase < 0.25 || dayPhase > 0.75) : false;
    return { biome, layer, wet, day };
  }

  // Terraria's rule, and the one that makes building worth doing: a player-placed wall
  // stops spawns. The world already knows which walls those are.
  function suppressed(x, y) {
    return world.isWallSafe(Math.floor(x), Math.floor(y));
  }

  // Where a given archetype could stand, fly, swim or burrow in one column. Scanning the
  // column is the whole trick: the first version picked a random point in a 96-tile
  // vertical range and rejected it unless it happened to be valid, which on a surface
  // world meant it almost never found the ground. Nine seconds of night produced nothing.
  function candidatesIn(x, y0, y1, spec) {
    const arch = ARCHETYPES[spec.kind];
    const found = [];
    const tall = Math.ceil(spec.h);
    for (let y = y0; y <= y1; y += 1) {
      if (arch.burrows) {
        if (solid(x, y)) found.push(y);
        continue;
      }
      if (!roomFor(spec, x, y)) continue;
      if (arch.needsLiquid) {
        if (liquidAt(x, y)) found.push(y);
        continue;
      }
      if (!arch.gravity) {
        // A flyer wants open air, not a one-tile pocket.
        if (!solid(x, y - 1) || !solid(x, y + tall)) found.push(y);
        continue;
      }
      // Anything that walks needs a floor directly under its feet.
      if (solid(x, y + tall)) found.push(y);
    }
    return found;
  }

  function trySpawn(player, dayPhase) {
    if (list.length >= MAX_ALIVE) return null;
    // A few columns per attempt, so one unlucky column does not cost a whole tick.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const side = rng() < 0.5 ? -1 : 1;
      const x = Math.floor(player.x + side * (SPAWN_MIN + rng() * (SPAWN_MAX - SPAWN_MIN)));
      const y0 = Math.floor(player.y - SPAWN_MAX * 0.6);
      const y1 = Math.floor(player.y + SPAWN_MAX * 0.6);

      // The pool is decided at the player's own altitude band for this column, so a
      // surface spawn is chosen from the surface roster even if the scan reaches deeper.
      const ctx = contextAt(x, player.y, dayPhase);
      const spec = chooseFrom(poolFor(ctx), rng());
      if (!spec) continue;

      const spots = candidatesIn(x, y0, y1, spec);
      if (spots.length === 0) continue;
      const y = spots[Math.min(spots.length - 1, Math.floor(rng() * spots.length))];
      if (suppressed(x, y)) continue;
      // And the chosen spot must still belong to the roster it was drawn from.
      const here = contextAt(x, y, dayPhase);
      if (!matches(spec, here)) continue;

      const enemy = makeEnemy(spec, x, y);
      list.push(enemy);
      return enemy;
    }
    return null;
  }

  function damage(enemy, amount) {
    enemy.hp -= amount;
    enemy.hurt = 0.18;
    if (enemy.hp <= 0) enemy.dead = true;
    return enemy.dead;
  }

  // --- behaviour -------------------------------------------------------------------------
  function stepOne(enemy, player, dt) {
    const arch = ARCHETYPES[enemy.spec.kind];
    const toward = Math.sign(player.x - enemy.x) || 1;
    enemy.timer += dt;
    if (enemy.hurt > 0) enemy.hurt = Math.max(0, enemy.hurt - dt);

    if (arch.burrows) {
      // Worms ignore terrain: they swim through rock straight at the player.
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const len = Math.hypot(dx, dy) || 1;
      enemy.vx = (dx / len) * arch.speed;
      enemy.vy = (dy / len) * arch.speed;
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      enemy.facing = toward;
      return;
    }

    if (arch.needsLiquid) {
      const wet = liquidAt(enemy.x, enemy.y) !== 0;
      if (wet) {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const len = Math.hypot(dx, dy) || 1;
        enemy.vx = (dx / len) * arch.speed;
        enemy.vy = (dy / len) * arch.speed;
      } else {
        // Out of water it flounders and falls.
        enemy.vx *= 0.9;
        enemy.vy = Math.min(arch.maxFall, enemy.vy + arch.gravity * dt);
      }
      moveAxis(enemy, enemy.vx * dt, 0);
      moveAxis(enemy, 0, enemy.vy * dt);
      enemy.facing = toward;
      return;
    }

    if (!arch.gravity) {
      // Flyers home in, with a bob so a flock does not move as one rigid block.
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const len = Math.hypot(dx, dy) || 1;
      const bob = Math.sin(enemy.timer * 3.1 + enemy.x) * (arch.bob || 0);
      enemy.vx = (dx / len) * arch.speed;
      enemy.vy = (dy / len) * arch.speed + bob;
      moveAxis(enemy, enemy.vx * dt, 0);
      moveAxis(enemy, 0, enemy.vy * dt);
      enemy.facing = toward;
      return;
    }

    // Ground-bound: slimes hop on a timer, everything else walks.
    enemy.vy = Math.min(arch.maxFall, enemy.vy + arch.gravity * dt);
    if (arch.hop) {
      if (enemy.onGround && enemy.timer > arch.hopEvery) {
        enemy.timer = 0;
        enemy.vy = -arch.hop;
        enemy.vx = toward * arch.speed;
      } else if (!enemy.onGround) {
        enemy.vx += toward * arch.speed * arch.air * dt;
      } else {
        enemy.vx *= 0.82;
      }
    } else {
      const control = enemy.onGround ? 1 : arch.air;
      enemy.vx += toward * arch.speed * control * dt * 8;
      enemy.vx = Math.max(-arch.speed, Math.min(arch.speed, enemy.vx));
    }

    const before = enemy.x;
    moveAxis(enemy, enemy.vx * dt, 0);
    // Step up a single tile, so a walker is not stopped by every pebble.
    if (arch.stepUp && enemy.onGround && Math.abs(enemy.x - before) < 1e-6 && enemy.vx !== 0) {
      const lifted = enemy.y - arch.stepUp;
      if (!overlaps(enemy, enemy.x + Math.sign(enemy.vx) * 0.3, lifted)) {
        enemy.y = lifted;
        moveAxis(enemy, enemy.vx * dt, 0);
      }
    }
    enemy.onGround = false;
    moveAxis(enemy, 0, enemy.vy * dt);
    enemy.facing = toward;
  }

  function overlaps(enemy, x, y) {
    const x0 = Math.floor(x);
    const x1 = Math.floor(x + enemy.width - 1e-6);
    const y0 = Math.floor(y);
    const y1 = Math.floor(y + enemy.height - 1e-6);
    for (let ty = y0; ty <= y1; ty += 1) {
      for (let tx = x0; tx <= x1; tx += 1) {
        if (tiles.isSolid(world.get(tx, ty))) return true;
      }
    }
    return false;
  }

  function moveAxis(enemy, dx, dy) {
    if (dx === 0 && dy === 0) return;
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.25) || 1;
    const sx = dx / steps;
    const sy = dy / steps;
    for (let i = 0; i < steps; i += 1) {
      const nx = enemy.x + sx;
      const ny = enemy.y + sy;
      if (overlaps(enemy, nx, ny)) {
        if (dy > 0) enemy.onGround = true;
        if (dy !== 0) enemy.vy = 0;
        else enemy.vx = 0;
        return;
      }
      enemy.x = nx;
      enemy.y = ny;
    }
  }

  function step(player, dt, dayPhase) {
    cooldown -= dt;
    if (cooldown <= 0) {
      cooldown = SPAWN_EVERY;
      trySpawn(player, dayPhase);
    }
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const enemy = list[i];
      if (enemy.dead) { list.splice(i, 1); continue; }
      // Anything the player has walked away from is forgotten rather than simulated.
      if (Math.hypot(enemy.x - player.x, enemy.y - player.y) > DESPAWN) {
        list.splice(i, 1);
        continue;
      }
      stepOne(enemy, player, dt);
    }
    return list;
  }

  // Which enemy, if any, the player is touching. Contact is how every enemy here deals
  // damage; nothing has a projectile yet.
  function touching(player) {
    for (const enemy of list) {
      if (enemy.x + enemy.width <= player.x) continue;
      if (enemy.x >= player.x + player.width) continue;
      if (enemy.y + enemy.height <= player.y) continue;
      if (enemy.y >= player.y + player.height) continue;
      return enemy;
    }
    return null;
  }

  function at(x, y) {
    for (const enemy of list) {
      if (x >= enemy.x && x <= enemy.x + enemy.width
        && y >= enemy.y && y <= enemy.y + enemy.height) return enemy;
    }
    return null;
  }

  function clear() {
    list.length = 0;
  }

  return { list, step, trySpawn, touching, at, damage, contextAt, poolFor, clear, candidatesIn,
    get count() { return list.length; } };
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
const EXPORTS_enemy = { ENEMIES, BY_KEY: ENEMY_BY_KEY, ARCHETYPES, poolFor, chooseFrom, matches,
  makeEnemy, makeSwarm, SPAWN_MIN, SPAWN_MAX, DESPAWN, MAX_ALIVE, SPAWN_EVERY };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_enemy;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.enemy = EXPORTS_enemy;
}
