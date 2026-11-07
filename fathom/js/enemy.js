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
  worm: { gravity: 0, speed: 4.6, burrows: true },

  // A boss. Everything else in this table moves toward the player and that is the whole
  // of it, which is fine for something you meet by accident and useless for something you
  // summon on purpose: a fight with one idea in it is over before it is a fight.
  //
  // The king hops like a slime and then breaks the three rules a slime obeys. It
  // teleports when you run, so distance is not an answer. It throws off minions, so
  // ignoring the room is not an answer. And it shrinks as it is hurt, getting faster and
  // harder to land a hit on exactly as it becomes killable, so the fight gets more
  // dangerous as you win it.
  king: { gravity: 50, maxFall: 42, hop: 13.5, hopEvery: 1.5, speed: 4.2, air: 0.62,
    boss: true, teleportAfter: 3.4, teleportRange: 26, spawnEvery: 3.2, minion: 'greenslime',
    minions: 4, shrinkTo: 0.52 },

  // The second boss, and the reason the first one's code was worth generalising: a boss
  // that flies has nothing in common with a boss that hops except being a boss.
  //
  // It hovers above the player out of reach and charges. The charge is the whole fight:
  // it picks a point, commits to it, and cannot steer once it has started, so the fight
  // is about reading the wind-up and not being where it is going. Halfway through its
  // health it stops calling for help, loses the wind-up almost entirely and charges
  // twice as often - the same escalation the King gets from shrinking, arrived at a
  // different way.
  hover: { gravity: 0, boss: true, flies: true, speed: 4.6, hoverAbove: 7, drift: 2.2,
    chargeEvery: 3.6, windUp: 0.7, chargeSpeed: 20, chargeFor: 0.85,
    spawnEvery: 4.5, minion: 'demoneye', minions: 3,
    enrageAt: 0.5, enrageSpeed: 1.5, enrageCharge: 0.5, enrageWindUp: 0.3 }
};

// Every enemy drops coins, scaled to what it was: a slime is pocket change, an obsidian
// husk is a day's wages. Coins are what villagers want, so what you kill is what pays for
// what you buy.
// weight is relative within whichever pool the enemy lands in. `layers` and `biomes` are
// filters: an empty or absent list means "anywhere". `day`/`night` default to both.
const ENEMIES = [
  // --- surface, temperate -------------------------------------------------------------
  { key: 'greenslime', name: 'Green Slime', kind: 'slime', body: 'slime', hp: 25, damage: 6, weight: 10,
    w: 1.1, h: 0.85, colour: '#58b05a', layers: ['surface'],
    biomes: ['plains', 'forest', 'savanna', 'highlands'], drops: [['gel', 2], ['coin', 2]] },
  { key: 'blueslime', name: 'Blue Slime', kind: 'slime', body: 'slime', hp: 35, damage: 8, weight: 6,
    w: 1.2, h: 0.95, colour: '#4a79c9', layers: ['surface', 'caves'],
    biomes: ['plains', 'forest', 'marsh'], drops: [['gel', 2], ['coin', 3]] },
  { key: 'zombie', name: 'Zombie', kind: 'walker', body: 'humanoid', hp: 45, damage: 12, weight: 9,
    w: 0.8, h: 1.7, colour: '#5f7a52', layers: ['surface'], night: true, day: false,
    drops: [['rottenflesh', 1], ['coin', 4]] },
  { key: 'demoneye', name: 'Demon Eye', kind: 'flyer', body: 'eye', hp: 32, damage: 11, weight: 7,
    w: 0.95, h: 0.95, colour: '#b4484f', layers: ['surface'], night: true, day: false,
    drops: [['lens', 1], ['coin', 3]] },

  // --- surface, cold --------------------------------------------------------------------
  { key: 'iceslime', name: 'Ice Slime', kind: 'slime', body: 'slime', hp: 30, damage: 8, weight: 10,
    w: 1.1, h: 0.85, colour: '#8fc8e6', layers: ['surface', 'caves'],
    biomes: ['tundra', 'taiga'], drops: [['gel', 2], ['coin', 3]] },
  { key: 'frostwight', name: 'Frost Wight', kind: 'walker', body: 'humanoid', hp: 55, damage: 14, weight: 7,
    w: 0.8, h: 1.75, colour: '#9fb6cc', layers: ['surface'], biomes: ['tundra', 'taiga'],
    night: true, day: false, drops: [['rottenflesh', 1], ['coin', 5]] },

  // --- surface, dry ----------------------------------------------------------------------
  { key: 'vulture', name: 'Vulture', kind: 'flyer', body: 'bird', hp: 28, damage: 10, weight: 9,
    w: 1.3, h: 0.8, colour: '#6b5a44', layers: ['surface'], biomes: ['desert', 'badlands'],
    drops: [['feather', 1], ['coin', 3]] },
  { key: 'antlion', name: 'Antlion', kind: 'walker', body: 'beetle', hp: 42, damage: 13, weight: 7,
    w: 1.2, h: 0.9, colour: '#8a6b3e', layers: ['surface', 'caves'], biomes: ['desert'],
    drops: [['chitin', 1], ['coin', 4]] },
  { key: 'cragstalker', name: 'Crag Stalker', kind: 'crawler', body: 'spider', hp: 48, damage: 13, weight: 8,
    w: 1.0, h: 0.8, colour: '#6e6a74', layers: ['surface'], biomes: ['highlands', 'badlands'],
    drops: [['chitin', 1], ['coin', 4]] },

  // --- jungle and mire ---------------------------------------------------------------------
  { key: 'jungleslime', name: 'Jungle Slime', kind: 'slime', body: 'slime', hp: 40, damage: 10, weight: 9,
    w: 1.2, h: 0.95, colour: '#3f8a3a', layers: ['surface', 'caves'], biomes: ['jungle'],
    drops: [['gel', 2], ['coin', 4]] },
  { key: 'hornet', name: 'Hornet', kind: 'flyer', body: 'wasp', hp: 44, damage: 15, weight: 8,
    w: 1.1, h: 0.8, colour: '#d9b03a', layers: ['surface', 'caves'], biomes: ['jungle'],
    drops: [['stinger', 1], ['coin', 4]] },
  { key: 'boglurker', name: 'Bog Lurker', kind: 'walker', body: 'humanoid', hp: 50, damage: 12, weight: 8,
    w: 0.9, h: 1.5, colour: '#4a5a38', layers: ['surface'], biomes: ['marsh'],
    drops: [['rottenflesh', 1], ['coin', 5]] },
  { key: 'mireleech', name: 'Mire Leech', kind: 'swimmer', body: 'leech', hp: 26, damage: 9, weight: 7,
    w: 0.9, h: 0.6, colour: '#6a4450', layers: ['surface', 'caves'], biomes: ['marsh'],
    wet: true, drops: [['rottenflesh', 1], ['coin', 2]] },

  // --- shore and sea -------------------------------------------------------------------------
  { key: 'crab', name: 'Crab', kind: 'walker', body: 'crab', hp: 22, damage: 7, weight: 10,
    w: 0.9, h: 0.6, colour: '#c05a40', layers: ['surface'], biomes: ['beach'],
    drops: [['chitin', 1], ['coin', 2]] },
  { key: 'jellyfish', name: 'Pink Jellyfish', kind: 'swimmer', body: 'jelly', hp: 30, damage: 10, weight: 9,
    w: 0.9, h: 1.0, colour: '#d472a8', layers: ['surface', 'caves'], biomes: ['ocean'],
    wet: true, emit: 4, drops: [['gel', 2], ['coin', 3]] },
  { key: 'shark', name: 'Shark', kind: 'swimmer', body: 'fish', hp: 85, damage: 22, weight: 5,
    w: 2.1, h: 0.9, colour: '#6d7a85', layers: ['surface', 'caves'], biomes: ['ocean'],
    wet: true, drops: [['finleather', 1], ['coin', 8]] },

  // --- the blights ----------------------------------------------------------------------------
  { key: 'eaterofsouls', name: 'Eater of Souls', kind: 'flyer', body: 'maw', hp: 48, damage: 15, weight: 10,
    w: 1.0, h: 1.0, colour: '#7a5fa8', layers: ['surface', 'caves'], biomes: ['blight'],
    drops: [['shadowscale', 1], ['coin', 4]] },
  { key: 'devourer', name: 'Devourer', kind: 'worm', body: 'worm', hp: 70, damage: 18, weight: 6,
    w: 1.0, h: 1.0, colour: '#5d4a7d', layers: ['caves', 'deep'], biomes: ['blight'],
    drops: [['shadowscale', 1], ['coin', 6]] },
  { key: 'crimera', name: 'Crimera', kind: 'flyer', body: 'maw', hp: 50, damage: 16, weight: 10,
    w: 1.0, h: 1.0, colour: '#b0454c', layers: ['surface', 'caves'], biomes: ['crimson'],
    drops: [['tissue', 1], ['coin', 5]] },
  { key: 'bloodcrawler', name: 'Blood Crawler', kind: 'crawler', body: 'spider', hp: 45, damage: 14, weight: 8,
    w: 1.0, h: 0.7, colour: '#8e2f36', layers: ['surface', 'caves'], biomes: ['crimson'],
    drops: [['tissue', 1], ['coin', 4]] },

  // --- caves ---------------------------------------------------------------------------------
  { key: 'cavebat', name: 'Cave Bat', kind: 'flyer', body: 'bat', hp: 26, damage: 9, weight: 10,
    w: 0.9, h: 0.7, colour: '#6a5b52', layers: ['caves'], drops: [['leather', 1], ['coin', 2]] },
  { key: 'giantworm', name: 'Giant Worm', kind: 'worm', body: 'worm', hp: 40, damage: 11, weight: 7,
    w: 0.9, h: 0.9, colour: '#9a7a66', layers: ['caves'], drops: [['wormtooth', 1], ['coin', 4]] },
  { key: 'skeleton', name: 'Skeleton', kind: 'walker', body: 'skeleton', hp: 60, damage: 16, weight: 9,
    w: 0.8, h: 1.7, colour: '#cfc9b8', layers: ['caves', 'deep'], drops: [['bone', 2], ['coin', 5]] },
  { key: 'salamander', name: 'Salamander', kind: 'crawler', body: 'lizard', hp: 50, damage: 15, weight: 7,
    w: 1.1, h: 0.7, colour: '#8a6a4a', layers: ['caves', 'deep'], drops: [['leather', 1], ['coin', 5]] },
  { key: 'motherslime', name: 'Mother Slime', kind: 'slime', body: 'slime', hp: 90, damage: 14, weight: 4,
    w: 1.5, h: 1.2, colour: '#7a8f6a', layers: ['caves', 'deep'], drops: [['gel', 4], ['coin', 8]] },

  // --- deep caverns --------------------------------------------------------------------------
  { key: 'giantbat', name: 'Giant Bat', kind: 'flyer', body: 'bat', hp: 55, damage: 18, weight: 9,
    w: 1.3, h: 0.9, colour: '#55484f', layers: ['deep'], drops: [['leather', 1], ['coin', 5]] },
  { key: 'armouredskeleton', name: 'Armoured Skeleton', kind: 'walker', body: 'skeleton', hp: 110, damage: 26, weight: 6,
    w: 0.85, h: 1.75, colour: '#8e949e', layers: ['deep'], drops: [['bone', 3], ['coin', 10]] },
  { key: 'rockgolem', name: 'Rock Golem', kind: 'walker', body: 'golem', hp: 150, damage: 30, weight: 3,
    w: 1.4, h: 2.0, colour: '#5b5a62', layers: ['deep'], drops: [['stone', 8], ['coin', 14]] },

  // --- hell ----------------------------------------------------------------------------------
  { key: 'hellbat', name: 'Hellbat', kind: 'flyer', body: 'bat', hp: 60, damage: 22, weight: 10,
    w: 1.0, h: 0.8, colour: '#8a3a2a', layers: ['hell'], emit: 3, drops: [['cinder', 1], ['coin', 5]] },
  { key: 'fireimp', name: 'Fire Imp', kind: 'walker', body: 'imp', hp: 95, damage: 28, weight: 6,
    w: 0.85, h: 1.5, colour: '#c2543a', layers: ['hell'], emit: 4, drops: [['cinder', 2], ['coin', 9]] },
  { key: 'lavaslime', name: 'Lava Slime', kind: 'slime', body: 'slime', hp: 70, damage: 24, weight: 7,
    w: 1.2, h: 0.95, colour: '#e0702f', layers: ['hell'], emit: 5, drops: [['gel', 3], ['coin', 6]] },
  { key: 'boneserpent', name: 'Bone Serpent', kind: 'worm', body: 'worm', hp: 140, damage: 32, weight: 4,
    w: 1.2, h: 1.2, colour: '#d8d2bf', layers: ['hell', 'hellcaves'], drops: [['bone', 5], ['coin', 13]] },
  { key: 'demon', name: 'Demon', kind: 'flyer', body: 'demon', hp: 120, damage: 30, weight: 5,
    w: 1.3, h: 1.6, colour: '#9c3f6a', layers: ['hell'], drops: [['cinder', 2], ['coin', 11]] },

  // --- hell caves and below --------------------------------------------------------------------
  { key: 'cinderwraith', name: 'Cinder Wraith', kind: 'flyer', body: 'demon', hp: 130, damage: 34, weight: 9,
    w: 1.1, h: 1.5, colour: '#b5542f', layers: ['hellcaves'], emit: 5, drops: [['cinder', 3], ['coin', 12]] },
  { key: 'magmacrawler', name: 'Magma Crawler', kind: 'crawler', body: 'spider', hp: 115, damage: 30, weight: 8,
    w: 1.2, h: 0.8, colour: '#7a3324', layers: ['hellcaves'], emit: 3, drops: [['cinder', 2], ['coin', 10]] },
  { key: 'obsidianhusk', name: 'Obsidian Husk', kind: 'walker', body: 'humanoid', hp: 200, damage: 38, weight: 5,
    w: 1.2, h: 1.9, colour: '#2e2838', layers: ['hellcaves'], drops: [['obsidian', 3], ['coin', 18]] },

  // --- sky and space -----------------------------------------------------------------------------
  { key: 'harpy', name: 'Harpy', kind: 'flyer', body: 'bird', hp: 65, damage: 19, weight: 10,
    w: 1.2, h: 1.4, colour: '#cfb88a', layers: ['sky'], drops: [['feather', 2], ['coin', 6]] },
  { key: 'clouddrifter', name: 'Cloud Drifter', kind: 'flyer', body: 'cloud', hp: 40, damage: 12, weight: 7,
    w: 1.4, h: 1.0, colour: '#dfe7f2', layers: ['sky'], drops: [['feather', 1], ['coin', 4]] },
  { key: 'voidwyrm', name: 'Void Wyrm', kind: 'worm', body: 'worm', hp: 180, damage: 36, weight: 6,
    w: 1.3, h: 1.3, colour: '#3c3a58', layers: ['space'], drops: [['stardust', 2], ['coin', 16]] },
  // --- the blood moon ------------------------------------------------------------------
  // Only during the event, only on the surface, and all three are worse than what the
  // night usually holds. A blood moon should be a reason to be indoors.
  { key: 'bloodzombie', name: 'Blood Zombie', kind: 'walker', body: 'humanoid', hp: 85,
    damage: 22, weight: 12, w: 0.85, h: 1.75, colour: '#8e3a3a', layers: ['surface'],
    event: 'bloodmoon', night: true, day: false,
    drops: [['rottenflesh', 2], ['coin', 9]] },
  { key: 'dripper', name: 'Drippler', kind: 'flyer', body: 'maw', hp: 70, damage: 20,
    weight: 10, w: 1.1, h: 1.1, colour: '#a83a44', layers: ['surface'],
    event: 'bloodmoon', night: true, day: false, emit: 2,
    drops: [['tissue', 2], ['coin', 8]] },
  { key: 'bloodslime', name: 'Blood Slime', kind: 'slime', body: 'slime', hp: 60,
    damage: 18, weight: 9, w: 1.3, h: 1.0, colour: '#b0333c', layers: ['surface'],
    event: 'bloodmoon', night: true, day: false,
    drops: [['gel', 3], ['coin', 7]] },

  // --- the king --------------------------------------------------------------------------
  // Summoned, never spawned. `summonOnly` is checked by matches(), so no pool anywhere
  // can contain it - which is stronger and more honest than giving it a layer filter
  // that happens never to match.
  { key: 'kingslime', name: 'King Slime', kind: 'king', body: 'kingslime', hp: 1400,
    damage: 34, weight: 0, w: 4.2, h: 3.0, colour: '#58b05a',
    boss: true, summonOnly: true, emit: 3,
    drops: [['gel', 40], ['coin', 260]],
    bossDrops: ['royal-gel', 'kings-crown'] },

  { key: 'hollloweye', name: 'The Hollow Eye', kind: 'hover', body: 'bigeye', hp: 1800,
    damage: 30, weight: 0, w: 3.4, h: 3.4, colour: '#b4484f',
    boss: true, summonOnly: true, emit: 5,
    drops: [['lens', 10], ['coin', 420]],
    bossDrops: ['hollow-lens', 'seers-eye'] },

  { key: 'starjelly', name: 'Star Jelly', kind: 'flyer', body: 'jelly', hp: 70, damage: 20, weight: 9,
    w: 1.0, h: 1.0, colour: '#8f9ce8', layers: ['space'], emit: 6, drops: [['stardust', 1], ['coin', 6]] }
];

const ENEMY_BY_KEY = {};
for (const e of ENEMIES) ENEMY_BY_KEY[e.key] = e;

// --- spawn selection --------------------------------------------------------------------

function matches(spec, ctx) {
  if (spec.summonOnly) return false;
  // An event enemy exists only during its event, and an event does not suppress the
  // ordinary roster: a blood moon is the usual night with worse things added to it.
  if (spec.event && ctx.event !== spec.event) return false;
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
    dead: false,
    boss: !!spec.boss,
    // A boss shrinks as it is hurt. Kept as a scale rather than as a second pair of
    // dimensions so that everything else - collision, drawing, the hit test - keeps
    // reading width and height and nothing has to know a boss is special.
    scale: 1,
    minionCooldown: 0,
    charge: 0,
    windUp: 0,
    enraged: false,
    sinceSeen: 0,
    // How far through its own gait this creature is. Advanced by the distance it actually
    // covers rather than by the clock, so a shambling walker's legs move at the speed its
    // legs would have to move, and something stopped against a wall stops moving its legs
    // instead of running on the spot. Flyers and swimmers, whose wings and fins beat
    // whether or not they are getting anywhere, add a steady term as well.
    anim: 0
  };
}

// Gait speed per archetype: how much animation one tile of travel buys, and how much is
// added per second regardless.
const GAIT = {
  // A slime's wobble runs whether or not it is going anywhere, which is the whole
  // character of the thing: it sits there quivering.
  slime: { perTile: 0.4, perSecond: 2.4 },
  walker: { perTile: 2.1, perSecond: 0 },
  flyer: { perTile: 0.4, perSecond: 7.5 },
  swimmer: { perTile: 0.9, perSecond: 2.6 },
  crawler: { perTile: 3.2, perSecond: 0 },
  worm: { perTile: 1.4, perSecond: 1.2 },
  // The king quivers faster than its subjects, and visibly faster as it shrinks.
  king: { perTile: 0.5, perSecond: 3.1 },
  // Wings beat regardless of whether it is getting anywhere, like every other flyer.
  hover: { perTile: 0.3, perSecond: 8 }
};

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
// How many can be alive at once during an event. Measured the same way the ordinary cap
// was: at ten the surface was impassable rather than dangerous.
const EVENT_ALIVE = 9;

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
  function contextAt(x, y, dayPhase, event) {
    const biome = worldgen.biomeAt(world.seed, Math.floor(x)).key;
    const layer = worldgen.layerAt(Math.floor(y)).key;
    const wet = liquidAt(x, y) !== 0;
    // Underground is never daylit, whatever the clock says.
    const surfaceish = layer === 'surface' || layer === 'sky' || layer === 'space';
    const day = surfaceish ? (dayPhase < 0.25 || dayPhase > 0.75) : false;
    return { biome, layer, wet, day, event: event || null };
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

  // Put a boss into the world beside the player. Summoned rather than spawned: nothing
  // in the spawn table can ever choose one, so this is the only way one arrives.
  function summon(key, player) {
    const spec = ENEMY_BY_KEY[key];
    if (!spec || !spec.boss) return null;
    if (list.some(e => e.boss)) return null;        // one at a time
    const arch = ARCHETYPES[spec.kind];
    for (const side of [1, -1]) {
      for (let away = 7; away < 26; away += 1) {
        const x = Math.floor(player.x + side * away);
        const probe = { width: spec.w, height: spec.h };
        if (arch && arch.flies) {
          // Something that flies wants open air above the player, not a floor.
          const y = Math.floor(player.y) - 9;
          if (overlaps(probe, x, y)) continue;
          const boss = makeEnemy(spec, x, y);
          list.push(boss);
          return boss;
        }
        const y = findFloor(x, Math.floor(player.y) - 14, Math.floor(player.y) + 10, probe);
        if (y === null) continue;
        const boss = makeEnemy(spec, x, y);
        list.push(boss);
        return boss;
      }
    }
    return null;
  }

  function bossAlive() {
    return list.find(e => e.boss) || null;
  }

  function trySpawn(player, dayPhase, event) {
    // A boss and its minions do not count against the ordinary cap, and nothing
    // ordinary spawns while one is alive: the fight is the fight.
    if (list.some(e => e.boss)) return null;
    if (list.length >= (event ? EVENT_ALIVE : MAX_ALIVE)) return null;
    // A few columns per attempt, so one unlucky column does not cost a whole tick.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const side = rng() < 0.5 ? -1 : 1;
      const x = Math.floor(player.x + side * (SPAWN_MIN + rng() * (SPAWN_MAX - SPAWN_MIN)));
      const y0 = Math.floor(player.y - SPAWN_MAX * 0.6);
      const y1 = Math.floor(player.y + SPAWN_MAX * 0.6);

      // The pool is decided at the player's own altitude band for this column, so a
      // surface spawn is chosen from the surface roster even if the scan reaches deeper.
      const ctx = contextAt(x, player.y, dayPhase, event);
      const spec = chooseFrom(poolFor(ctx), rng());
      if (!spec) continue;

      const spots = candidatesIn(x, y0, y1, spec);
      if (spots.length === 0) continue;
      const y = spots[Math.min(spots.length - 1, Math.floor(rng() * spots.length))];
      if (suppressed(x, y)) continue;
      // And the chosen spot must still belong to the roster it was drawn from.
      const here = contextAt(x, y, dayPhase, event);
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

    // Bosses first, before any of the archetype branches below. The flying boss has
    // gravity 0, which the ordinary flyer branch claims, so a dispatch placed after it
    // never ran at all: the Hollow Eye hovered like a bat and never charged once.
    if (arch.boss) {
      if (arch.flies) stepHoverBoss(enemy, arch, player, dt, toward);
      else stepBoss(enemy, arch, player, dt, toward);
      return;
    }

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

  // The king. Hops like a slime, then breaks every rule a slime obeys.
  function stepBoss(enemy, arch, player, dt, toward) {
    // Shrink with the health that is left. Smaller is faster and harder to hit, so the
    // fight tightens as it is won rather than petering out.
    const left = Math.max(0, enemy.hp / enemy.maxHp);
    const want = arch.shrinkTo + (1 - arch.shrinkTo) * left;
    if (Math.abs(want - enemy.scale) > 0.001) {
      // Shrink about the feet, not the top-left corner, or the king rises off the floor
      // every time it is hit.
      const base = enemy.y + enemy.height;
      const mid = enemy.x + enemy.width / 2;
      enemy.scale = want;
      enemy.width = enemy.spec.w * enemy.scale;
      enemy.height = enemy.spec.h * enemy.scale;
      enemy.x = mid - enemy.width / 2;
      enemy.y = base - enemy.height;
    }
    const rush = 2 - enemy.scale;          // 1 at full size, ~1.5 at its smallest

    // Teleport when the player runs. Distance is not an answer to this fight.
    enemy.sinceSeen += dt;
    const away = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (away > arch.teleportRange && enemy.sinceSeen > arch.teleportAfter) {
      const side = Math.sign(player.x - enemy.x) || 1;
      const landing = findFloor(Math.floor(player.x - side * 6), Math.floor(player.y) - 10,
        Math.floor(player.y) + 14, enemy);
      if (landing !== null) {
        enemy.teleported = { from: { x: enemy.x, y: enemy.y } };
        enemy.x = Math.floor(player.x - side * 6);
        enemy.y = landing;
        enemy.vx = 0;
        enemy.vy = 0;
        enemy.sinceSeen = 0;
      }
    } else if (away < arch.teleportRange * 0.7) {
      enemy.sinceSeen = 0;
    }

    // Throw off minions, so ignoring the room is not an answer either.
    bossMinions(enemy, arch, dt);

    enemy.vy = Math.min(arch.maxFall, enemy.vy + arch.gravity * dt);
    if (enemy.onGround && enemy.timer > arch.hopEvery / rush) {
      enemy.timer = 0;
      enemy.vy = -arch.hop;
      enemy.vx = toward * arch.speed * rush;
    } else if (!enemy.onGround) {
      enemy.vx += toward * arch.speed * arch.air * dt;
    } else {
      enemy.vx *= 0.78;
    }
    moveAxis(enemy, enemy.vx * dt, 0);
    enemy.onGround = false;
    moveAxis(enemy, 0, enemy.vy * dt);
    enemy.facing = toward;
  }

  // Everything a boss does that is not about how it moves: shrinking, calling for help,
  // and crossing into its second half. Shared, because the two bosses disagree about
  // movement and agree about everything else.
  function bossMinions(enemy, arch, dt) {
    if (!arch.minion) return;
    enemy.minionCooldown -= dt;
    if (enemy.minionCooldown > 0) return;
    enemy.minionCooldown = arch.spawnEvery;
    const spec = ENEMY_BY_KEY[arch.minion];
    if (!spec) return;
    const alive = list.filter(e => e.summonedBy === enemy.key).length;
    if (alive >= arch.minions) return;
    const child = makeEnemy(spec, enemy.x + enemy.width / 2 - spec.w / 2,
      enemy.y + enemy.height * 0.4);
    child.summonedBy = enemy.key;
    child.vy = -8;
    child.vx = (Math.random() - 0.5) * 8;
    list.push(child);
  }

  // A boss that flies, hovers out of reach, and charges in a straight line it chooses
  // before it starts and cannot change afterwards.
  function stepHoverBoss(enemy, arch, player, dt, toward) {
    const left = Math.max(0, enemy.hp / enemy.maxHp);
    enemy.enraged = left <= arch.enrageAt;
    // Enraged it stops calling for help: the second half of the fight is only the boss.
    if (!enemy.enraged) bossMinions(enemy, arch, dt);

    const px = player.x + 0.4;
    const py = player.y + 0.9;
    const cx = enemy.x + enemy.width / 2;
    const cy = enemy.y + enemy.height / 2;

    enemy.charge = enemy.charge || 0;
    enemy.chargeCooldown = enemy.chargeCooldown === undefined
      ? arch.chargeEvery : enemy.chargeCooldown;

    if (enemy.charge > 0) {
      // Committed. It cannot steer, which is what makes a charge dodgeable.
      enemy.charge -= dt;
      moveAxis(enemy, enemy.vx * dt, 0);
      moveAxis(enemy, 0, enemy.vy * dt);
      if (enemy.charge <= 0) {
        enemy.chargeCooldown = arch.chargeEvery
          * (enemy.enraged ? arch.enrageCharge : 1);
        enemy.vx = 0;
        enemy.vy = 0;
      }
      return;
    }

    if (enemy.windUp > 0) {
      // The tell. It hangs still, and then it comes.
      enemy.windUp -= dt;
      enemy.vx = 0;
      enemy.vy = 0;
      if (enemy.windUp <= 0) {
        const dx = px - cx;
        const dy = py - cy;
        const len = Math.hypot(dx, dy) || 1;
        const speed = arch.chargeSpeed * (enemy.enraged ? arch.enrageSpeed : 1);
        enemy.vx = (dx / len) * speed;
        enemy.vy = (dy / len) * speed;
        enemy.charge = arch.chargeFor;
      }
      return;
    }

    enemy.chargeCooldown -= dt;
    if (enemy.chargeCooldown <= 0) {
      enemy.windUp = enemy.enraged ? arch.enrageWindUp : arch.windUp;
      return;
    }

    // Otherwise hover above the player, drifting rather than tracking exactly, so it is
    // somewhere near rather than welded to the top of your head.
    const wantX = px - enemy.width / 2;
    const wantY = py - arch.hoverAbove - enemy.height / 2;
    const dx = wantX - enemy.x;
    const dy = wantY - enemy.y;
    const len = Math.hypot(dx, dy) || 1;
    const bob = Math.sin(enemy.timer * 1.7) * arch.drift;
    enemy.vx = (dx / len) * arch.speed;
    enemy.vy = (dy / len) * arch.speed + bob;
    moveAxis(enemy, enemy.vx * dt, 0);
    moveAxis(enemy, 0, enemy.vy * dt);
    enemy.facing = toward;
  }

  // The first row in a column range where this body would stand on solid ground. Used
  // for the teleport, which must not land the king inside the rock.
  function findFloor(x, y0, y1, body) {
    for (let y = y0; y <= y1; y += 1) {
      if (overlaps(body, x, y)) continue;
      let floor = false;
      for (let dx = 0; dx < Math.ceil(body.width); dx += 1) {
        if (solid(x + dx, y + body.height + 0.1)) floor = true;
      }
      if (floor) return y;
    }
    return null;
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

  function step(player, dt, dayPhase, event) {
    cooldown -= dt;
    if (cooldown <= 0) {
      // A blood moon is not merely a different roster: it is more of everything, which
      // is what makes it a reason to be indoors rather than a change of scenery.
      cooldown = event ? SPAWN_EVERY * 0.45 : SPAWN_EVERY;
      trySpawn(player, dayPhase, event);
    }
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const enemy = list[i];
      if (enemy.dead) { list.splice(i, 1); continue; }
      // Anything the player has walked away from is forgotten rather than simulated.
      // A boss is not: it teleports to you instead, so running away is not a way out.
      if (!enemy.boss && Math.hypot(enemy.x - player.x, enemy.y - player.y) > DESPAWN) {
        list.splice(i, 1);
        continue;
      }
      const wasX = enemy.x;
      const wasY = enemy.y;
      stepOne(enemy, player, dt);
      const gait = GAIT[enemy.spec.kind] || GAIT.walker;
      enemy.anim += Math.hypot(enemy.x - wasX, enemy.y - wasY) * gait.perTile
        + gait.perSecond * dt;
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

  return { list, step, trySpawn, summon, bossAlive, touching, at, damage, contextAt,
    poolFor, clear, candidatesIn,
    get count() { return list.length; } };
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
const EXPORTS_enemy = { ENEMIES, BY_KEY: ENEMY_BY_KEY, ARCHETYPES, GAIT, poolFor, chooseFrom, matches,
  makeEnemy, makeSwarm, SPAWN_MIN, SPAWN_MAX, DESPAWN, MAX_ALIVE, EVENT_ALIVE, SPAWN_EVERY };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_enemy;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.enemy = EXPORTS_enemy;
}
