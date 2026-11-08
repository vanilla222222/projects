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

const WILDLIFE_SPECIMENS = typeof require === 'function'
  ? require('./tiles.js').CRITTER_SPECIMENS : CRITTER_SPECIMENS;

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
    enrageAt: 0.5, enrageSpeed: 1.5, enrageCharge: 0.5, enrageWindUp: 0.3 },
  furnace: { gravity: 0, boss: true, flies: true, speed: 3.6, hoverAbove: 4, drift: 3.8,
    chargeEvery: 4.2, windUp: 1, chargeSpeed: 22, chargeFor: 1.0,
    spawnEvery: 5.8, minion: 'fireimp', minions: 2,
    enrageAt: 0.42, enrageSpeed: 1.25, enrageCharge: 0.55, enrageWindUp: 0.62 },
  guardian: { gravity: 0, boss: true, flies: true, speed: 3.4, hoverAbove: 2.5, drift: 5,
    chargeEvery: 4.8, windUp: 1.15, chargeSpeed: 26, chargeFor: 0.72,
    spawnEvery: 6, minion: 'ashsentinel', minions: 2,
    enrageAt: 0.52, enrageSpeed: 1.2, enrageCharge: 0.48, enrageWindUp: 0.75 },
  sovereign: { gravity: 0, boss: true, flies: true, speed: 6, hoverAbove: 6, drift: 4,
    chargeEvery: 3.1, windUp: 0.82, chargeSpeed: 24, chargeFor: 1.05,
    spawnEvery: 4, minion: 'voidshade', minions: 3,
    enrageAt: 0.38, enrageSpeed: 1.42, enrageCharge: 0.6, enrageWindUp: 0.45 },
  archon: { gravity: 0, boss: true, flies: true, speed: 6.8, hoverAbove: 5, drift: 4.2,
    chargeEvery: 3.5, windUp: 1.1, chargeSpeed: 29, chargeFor: 0.8,
    spawnEvery: 4.4, minion: 'voidstalker', minions: 3, enrageAt: 0.45,
    enrageSpeed: 1.28, enrageCharge: 0.66, enrageWindUp: 0.65, followUp: 0.35 },
  thunderbird: { gravity: 0, boss: true, flies: true, speed: 6.2, hoverAbove: 7, drift: 4,
    chargeEvery: 3.2, windUp: 0.8, chargeSpeed: 24, chargeFor: 0.72, spawnEvery: 5.2,
    minion: 'dunefalcon', minions: 2, enrageAt: 0.5, enrageSpeed: 1.25, enrageCharge: 0.65,
    enrageWindUp: 0.56, followUp: 0.42 },
  scourge: { gravity: 0, boss: true, flies: true, burrows: true, speed: 5.4, hoverAbove: -7, drift: 3,
    chargeEvery: 3.6, windUp: 0.85, chargeSpeed: 25, chargeFor: 0.87, spawnEvery: 5.8,
    minion: 'glassborer', minions: 2, enrageAt: 0.45, enrageSpeed: 1.33, enrageCharge: 0.62,
    enrageWindUp: 0.5 },
  aurora: { gravity: 0, boss: true, flies: true, speed: 5.5, hoverAbove: 5, drift: 5,
    chargeEvery: 3.5, windUp: 1.05, chargeSpeed: 27, chargeFor: 0.78, spawnEvery: 5.4,
    minion: 'rimewisp', minions: 3, enrageAt: 0.48, enrageSpeed: 1.2,
    enrageCharge: 0.58, enrageWindUp: 0.66, followUp: 0.48 },
  hornetqueen: { gravity: 0, boss: true, flies: true, speed: 6.6, hoverAbove: 5.2, drift: 4,
    chargeEvery: 3.4, windUp: 0.86, chargeSpeed: 24, chargeFor: 0.74, spawnEvery: 4.3,
    minion: 'orchidwasp', minions: 4, enrageAt: 0.48, enrageSpeed: 1.3,
    enrageCharge: 0.63, enrageWindUp: 0.6, followUp: 0.42 },
  strangler: { gravity: 0, boss: true, flies: true, speed: 4.6, hoverAbove: 3.5, drift: 3,
    chargeEvery: 4.1, windUp: 1.2, chargeSpeed: 29, chargeFor: 0.9, spawnEvery: 5.2,
    minion: 'templeroot', minions: 2, enrageAt: 0.44, enrageSpeed: 1.35,
    enrageCharge: 0.55, enrageWindUp: 0.72 },
  fenwidow: { gravity: 0, boss: true, flies: true, speed: 5.9, hoverAbove: 3.3, drift: 3.8,
    chargeEvery: 3.6, windUp: 0.92, chargeSpeed: 28, chargeFor: 0.72, spawnEvery: 4.5,
    minion: 'peatspider', minions: 3, enrageAt: 0.5, enrageSpeed: 1.25,
    enrageCharge: 0.62, enrageWindUp: 0.62, followUp: 0.44 },
  cairnshade: { gravity: 0, boss: true, flies: true, speed: 5.1, hoverAbove: 4.4, drift: 3,
    chargeEvery: 4.1, windUp: 1.1, chargeSpeed: 29, chargeFor: 0.85, spawnEvery: 5,
    minion: 'cairnhusk', minions: 2, enrageAt: 0.45, enrageSpeed: 1.26,
    enrageCharge: 0.6, enrageWindUp: 0.72, followUp: 0.49 },
  ochredrake: { gravity: 0, boss: true, flies: true, speed: 5.8, hoverAbove: 4, drift: 4.1,
    chargeEvery: 3.8, windUp: 1.0, chargeSpeed: 28, chargeFor: 0.82, spawnEvery: 5.1,
    minion: 'siltbat', minions: 3, enrageAt: 0.46, enrageSpeed: 1.27,
    enrageCharge: 0.6, enrageWindUp: 0.64, followUp: 0.46 },
  sunscarab: { gravity: 0, boss: true, flies: true, speed: 5.8, hoverAbove: 3, drift: 3,
    chargeEvery: 3.9, windUp: 1.15, chargeSpeed: 30, chargeFor: 0.78, spawnEvery: 4.8,
    minion: 'courtcarapace', minions: 2, enrageAt: 0.47, enrageSpeed: 1.28,
    enrageCharge: 0.60, enrageWindUp: 0.68, followUp: 0.48 },
  winterroot: { gravity: 0, boss: true, flies: true, speed: 5.4, hoverAbove: 4, drift: 4,
    chargeEvery: 4, windUp: 1.15, chargeSpeed: 29, chargeFor: 0.8, spawnEvery: 5.1,
    minion: 'winterbark', minions: 2, enrageAt: 0.46, enrageSpeed: 1.28,
    enrageCharge: 0.59, enrageWindUp: 0.69, followUp: 0.46 },
  standard: { gravity: 0, boss: true, flies: true, speed: 5.6, hoverAbove: 3.9, drift: 3,
    chargeEvery: 3.8, windUp: 1.05, chargeSpeed: 27, chargeFor: 0.82, spawnEvery: 5,
    minion: 'chalksentry', minions: 2, enrageAt: 0.47, enrageSpeed: 1.27,
    enrageCharge: 0.59, enrageWindUp: 0.66, followUp: 0.46 },
  starwyvern: { gravity: 0, boss: true, flies: true, speed: 9.4, hoverAbove: 4.4, drift: 8,
    chargeEvery: 4.1, windUp: 1.1, chargeSpeed: 31, chargeFor: 0.82, enrageAt: 0.5,
    enrageSpeed: 1.24, enrageCharge: 0.72, enrageWindUp: 0.67, followUp: 0.45 },
  glasscolossus: { gravity: 50, maxFall: 42, hop: 11.5, hopEvery: 1.7, speed: 6.5, air: 0.64,
    boss: true, teleportAfter: 3.4, teleportRange: 30, spawnEvery: 7, minions: 0, shrinkTo: 0.72 },
  coilserpent: { gravity: 0, boss: true, flies: true, burrows: true, speed: 7.2, hoverAbove: -3, drift: 5,
    chargeEvery: 4.3, windUp: 0.95, chargeSpeed: 24, chargeFor: 0.83, enrageAt: 0.5,
    enrageSpeed: 1.25, enrageCharge: 0.73, enrageWindUp: 0.65 },
  zenithengine: { gravity: 0, boss: true, flies: true, speed: 5.7, hoverAbove: 7, drift: 7,
    chargeEvery: 5.8, windUp: 1.2, chargeSpeed: 20, chargeFor: 0.6, enrageAt: 0.5,
    enrageSpeed: 1.17, enrageCharge: 0.75, enrageWindUp: 0.7 },
  prism: { gravity: 0, boss: true, flies: true, speed: 5.5,
    enrageAt: 0.5, minion: 'deepreefeye', spawnEvery: 5.6, minions: 2 }

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
  { key: 'kingslime', name: 'King Slime', kind: 'king', body: 'kingslime', hp: 1000,
    damage: 34, weight: 0, w: 4.2, h: 3.0, colour: '#58b05a',
    boss: true, summonOnly: true, emit: 3,
    drops: [['gel', 40], ['coin', 260]],
    bossDrops: ['royal-gel', 'kings-crown'] },

  { key: 'hollloweye', name: 'The Hollow Eye', kind: 'hover', body: 'bigeye', hp: 1450,
    damage: 30, weight: 0, w: 3.4, h: 3.4, colour: '#b4484f',
    boss: true, summonOnly: true, emit: 5,
    drops: [['lens', 10], ['coin', 420]],
    bossDrops: ['hollow-lens', 'seers-eye'] },

  { key: 'furnacewarden', name: 'The Furnace Warden', kind: 'furnace', body: 'demon',
    hp: 3200, damage: 48, weight: 0, w: 4.5, h: 3.7, colour: '#e06140',
    boss: true, summonOnly: true, emit: 8,
    drops: [['cinder', 15], ['coin', 650]], bossDrops: [['furnace-core', 3]] },

  { key: 'ashsentinel', name: 'Ash Sentinel', kind: 'walker', body: 'golem', hp: 260,
    damage: 41, weight: 8, w: 1.4, h: 2, colour: '#7a586b', layers: ['trench'],
    drops: [['cinder', 3], ['coin', 16]] },
  { key: 'trenchmaw', name: 'Trench Maw', kind: 'flyer', body: 'maw', hp: 210,
    damage: 38, weight: 7, w: 1.6, h: 1.2, colour: '#9f5664', layers: ['trench'],
    drops: [['cinder', 2], ['coin', 14]] },
  { key: 'voidstalker', name: 'Void Stalker', kind: 'crawler', body: 'spider', hp: 360,
    damage: 49, weight: 9, w: 1.6, h: 1.3, colour: '#6650a3', layers: ['void'],
    drops: [['stardust', 2], ['coin', 22]] },
  { key: 'voidshade', name: 'Void Shade', kind: 'flyer', body: 'cloud', hp: 295,
    damage: 44, weight: 8, w: 1.5, h: 1.6, colour: '#8273c7', layers: ['void'], emit: 4,
    drops: [['stardust', 3], ['coin', 19]] },
  { key: 'ossuarymechanist', name: 'Ossuary Mechanist', kind: 'archon', body: 'golem', hp: 15800,
    damage: 125, weight: 0, w: 4.6, h: 4.4, colour: '#c695e8', boss: true, summonOnly: true,
    minion: 'ossuary-coil', emit: 9, drops: [['coin', 2850]], bossDrops: ['mechanist-core', ['mechanist-key', 3]] },
  { key: 'ossuary-sentinel', name: 'Circuit Sentinel', kind: 'walker', body: 'golem', hp: 540,
    damage: 67, weight: 10, w: 1.2, h: 2.4, colour: '#9573bb', dungeon: true, lowerOssuary: true,
    drops: [['wire-spool', 4], ['coin', 46]] },
  { key: 'ossuary-coil', name: 'Arc Coil', kind: 'flyer', body: 'eye', hp: 340,
    damage: 55, weight: 8, w: 1.3, h: 1.3, colour: '#7da8ed', dungeon: true, lowerOssuary: true, emit: 7,
    drops: [['wire-spool', 2], ['coin', 32]] },
  { key: 'dungeonkeeper', name: 'Ossuary Keeper', kind: 'guardian', body: 'skeleton', hp: 2350,
    damage: 39, weight: 0, w: 3.8, h: 4, colour: '#c1d9e5', boss: true, summonOnly: true,
    minion: 'ossuary-skull', emit: 5, drops: [['bone', 14], ['coin', 410]], bossDrops: ['dungeon-key'] },
  { key: 'ossuary-guard', name: 'Crypt Guard', kind: 'walker', body: 'skeleton', hp: 108,
    damage: 25, weight: 12, w: 0.85, h: 1.9, colour: '#a2b7c9', dungeon: true,
    drops: [['bone', 2], ['coin', 12], ['dungeon-key', 1]] },
  { key: 'ossuary-skull', name: 'Lantern Skull', kind: 'flyer', body: 'skull', hp: 75,
    damage: 21, weight: 6, w: 1.1, h: 1.1, colour: '#99d8ee', dungeon: true, emit: 5,
    drops: [['bone', 1], ['coin', 9]] },
  { key: 'ashguardian', name: 'Ashvault Guardian', kind: 'guardian', body: 'golem', hp: 4600,
    damage: 55, weight: 0, w: 4.2, h: 3.8, colour: '#b07780', boss: true, summonOnly: true,
    emit: 7, drops: [['cinder', 12], ['coin', 780]], bossDrops: [['guardian-seal', 5]] },
  { key: 'voidsovereign', name: 'Void Sovereign', kind: 'sovereign', body: 'bigeye', hp: 7200,
    damage: 72, weight: 0, w: 5, h: 4.2, colour: '#9378dc', boss: true, summonOnly: true,
    emit: 9, drops: [['stardust', 12], ['coin', 1350]], bossDrops: [['void-heart', 2]] },

  { key: 'mirebrood', name: 'Mire Broodmother', kind: 'king', body: 'kingslime', hp: 1450,
    damage: 29, weight: 0, w: 3.6, h: 3, colour: '#73905b', boss: true, summonOnly: true, emit: 3,
    drops: [['gel', 22], ['coin', 300]], bossDrops: ['mire-pearl'] },
  { key: 'granitecolossus', name: 'Granite Colossus', kind: 'guardian', body: 'golem', hp: 2550,
    damage: 41, weight: 0, w: 3.2, h: 3.1, colour: '#839bc2', boss: true, summonOnly: true, emit: 4,
    drops: [['crystal', 5], ['coin', 520]], bossDrops: ['granite-eye'] },
  { key: 'riftarchon', name: 'The Rift Archon', kind: 'archon', body: 'demon', hp: 9700,
    damage: 86, weight: 0, w: 5.2, h: 4.2, colour: '#a581e4', boss: true, summonOnly: true, emit: 10,
    drops: [['stardust', 18], ['coin', 1850]], bossDrops: ['rift-core'] },

  { key: 'briarhare', name: 'Briar Hare', kind: 'walker', body: 'lizard', hp: 26,
    damage: 6, weight: 6, w: 0.85, h: 0.65, colour: '#9b7754', biomes: ['forest'], layers: ['surface'], night: false,
    drops: [['leather', 1], ['coin', 3]] },
  { key: 'canopyjay', name: 'Canopy Jay', kind: 'flyer', body: 'bird', hp: 27,
    damage: 7, weight: 5, w: 0.95, h: 0.9, colour: '#5d91a9', biomes: ['forest'], layers: ['surface'], night: false,
    drops: [['feather', 2], ['coin', 3]] },
  { key: 'barkmite', name: 'Bark Mite', kind: 'crawler', body: 'beetle', hp: 35,
    damage: 9, weight: 6, w: 0.8, h: 0.7, colour: '#786743', biomes: ['forest'], layers: ['surface'],
    drops: [['chitin', 1], ['coin', 4]] },
  { key: 'duskowl', name: 'Dusk Owl', kind: 'flyer', body: 'bird', hp: 43,
    damage: 11, weight: 5, w: 1, h: 1, colour: '#7e7194', biomes: ['forest'], layers: ['surface'], day: false,
    drops: [['feather', 2], ['coin', 5]] },
  { key: 'rootcrawler', name: 'Root Crawler', kind: 'crawler', body: 'spider', hp: 63,
    damage: 15, weight: 7, w: 1.15, h: 0.8, colour: '#92734c', biomes: ['forest'], layers: ['caves'],
    drops: [['chitin', 2], ['coin', 6]] },
  { key: 'mossling', name: 'Mossling', kind: 'slime', body: 'slime', hp: 54,
    damage: 12, weight: 7, w: 1, h: 0.85, colour: '#7a9e59', biomes: ['forest'], layers: ['caves'],
    drops: [['gel', 2], ['coin', 5]] },
  { key: 'lanternmoth', name: 'Lantern Moth', kind: 'flyer', body: 'wasp', hp: 73,
    damage: 16, weight: 6, w: 1.1, h: 1.0, colour: '#dfaa70', emit: 4, biomes: ['forest'], layers: ['caves'],
    drops: [['glowmoss', 1], ['coin', 7]] },
  { key: 'amberburrower', name: 'Amber Burrower', kind: 'worm', body: 'worm', hp: 130,
    damage: 23, weight: 6, w: 1.05, h: 1.0, colour: '#b5804f', biomes: ['forest'], layers: ['deep'],
    drops: [['wormtooth', 2], ['coin', 10]] },
  { key: 'heartwoodhusk', name: 'Heartwood Husk', kind: 'walker', body: 'golem', hp: 165,
    damage: 26, weight: 7, w: 1.3, h: 1.8, colour: '#745451', biomes: ['forest'], layers: ['deep'],
    drops: [['oaklog', 3], ['coin', 12]] },
  { key: 'sporewraith', name: 'Spore Wraith', kind: 'flyer', body: 'cloud', hp: 112,
    damage: 21, weight: 6, w: 1.1, h: 1.2, colour: '#819f91', biomes: ['forest'], layers: ['deep'],
    drops: [['glowmoss', 2], ['coin', 10]] },
  { key: 'forestmimic', name: 'Heartwood Mimic', kind: 'walker', body: 'mimic', hp: 275,
    damage: 32, weight: 0, w: 1.8, h: 1.5, colour: '#8e949e', hiddenSpawn: true,
    drops: [['mimic-tooth', 2], ['coin', 120]] },
  { key: 'briarwarden', name: 'The Briar Warden', kind: 'king', body: 'golem', hp: 1650,
    damage: 34, weight: 0, w: 3.6, h: 3, colour: '#8c764c', boss: true, summonOnly: true, emit: 3,
    drops: [['oaklog', 12], ['coin', 340]], bossDrops: ['briar-heart'] },
  { key: 'rootcrown', name: 'The Root Crown', kind: 'guardian', body: 'spider', hp: 3500,
    damage: 48, weight: 0, w: 4, h: 3, colour: '#a6806f', boss: true, summonOnly: true, emit: 5,
    drops: [['chitin', 12], ['coin', 680]], bossDrops: ['rootcrown-core'] },

  ...[
    ['dunefalcon', 'Dune Falcon', 'surface', 'flyer', 'bird', 38, 10, '#b48a65', 'feather'],
    ['sandjackal', 'Sand Jackal', 'surface', 'walker', 'lizard', 46, 12, '#c89a5b', 'leather'],
    ['dustscarab', 'Dust Scarab', 'surface', 'crawler', 'beetle', 42, 11, '#997744', 'chitin'],
    ['mirageeye', 'Mirage Eye', 'surface', 'flyer', 'eye', 56, 14, '#cda56e', 'lens'],
    ['glassborer', 'Glass Borer', 'caves', 'worm', 'worm', 76, 17, '#bd8c57', 'wormtooth'],
    ['saltstinger', 'Salt Stinger', 'caves', 'crawler', 'spider', 83, 18, '#ad8067', 'stinger'],
    ['cisternjelly', 'Cistern Jelly', 'caves', 'swimmer', 'jelly', 89, 19, '#84aea8', 'gel'],
    ['amberreaver', 'Amber Reaver', 'deep', 'crawler', 'beetle', 155, 25, '#d29749', 'chitin'],
    ['tombshade', 'Tomb Shade', 'deep', 'flyer', 'cloud', 130, 23, '#9e828d', 'stardust'],
    ['fossilguard', 'Fossil Guard', 'deep', 'walker', 'skeleton', 180, 29, '#c4aa83', 'bone']
  ].map(([key, name, layer, kind, body, hp, damage, colour, loot]) => ({
    key, name, kind, body, hp, damage, colour, weight: 6, w: layer === 'deep' ? 1.3 : 1.05,
    h: body === 'skeleton' ? 1.8 : 1, biomes: ['desert'], layers: [layer],
    wet: kind === 'swimmer', day: key === 'mirageeye' ? false : undefined,
    drops: [[loot, 1], ['coin', layer === 'deep' ? 12 : layer === 'caves' ? 7 : 4]]
  })),
  { key: 'desertmimic', name: 'Dune Mimic', kind: 'walker', body: 'mimic', hp: 315,
    damage: 36, weight: 0, w: 1.8, h: 1.5, colour: '#c3a275', hiddenSpawn: true,
    drops: [['dune-fang', 2], ['coin', 145]] },
  { key: 'thunderbird', name: 'Thunderbird', kind: 'thunderbird', body: 'bird', hp: 1900,
    damage: 36, weight: 0, w: 4.3, h: 2.8, colour: '#d8ab64', boss: true, summonOnly: true, emit: 6,
    drops: [['feather', 14], ['coin', 420]], bossDrops: ['storm-plume'] },
  { key: 'desertscourge', name: 'Desert Scourge', kind: 'scourge', body: 'worm', hp: 3550,
    damage: 47, weight: 0, w: 4.1, h: 2.9, colour: '#cb9a58', boss: true, summonOnly: true, emit: 3,
    drops: [['wormtooth', 12], ['coin', 710]], bossDrops: ['scourge-scale'] },

  ...[
    ['snowhare', 'Snow Hare', 'surface', 'walker', 'lizard', 31, 8, '#cbdde2', 'leather'],
    ['frostkite', 'Frost Kite', 'surface', 'flyer', 'bird', 39, 11, '#81a4bf', 'feather'],
    ['snowprowler', 'Snow Prowler', 'surface', 'walker', 'humanoid', 57, 15, '#8fa9ad', 'rottenflesh'],
    ['sleetmite', 'Sleet Mite', 'surface', 'crawler', 'beetle', 42, 12, '#93b6c5', 'chitin'],
    ['iceborer', 'Ice Borer', 'caves', 'worm', 'worm', 81, 18, '#88c0d3', 'wormtooth'],
    ['rimewisp', 'Rime Wisp', 'caves', 'flyer', 'cloud', 74, 17, '#acd4e1', 'glowmoss'],
    ['frostweaver', 'Frostweaver', 'caves', 'crawler', 'spider', 93, 19, '#819ac5', 'chitin'],
    ['glacierhusk', 'Glacier Husk', 'deep', 'walker', 'golem', 184, 29, '#6588a9', 'crystal'],
    ['paleoracle', 'Pale Oracle', 'deep', 'flyer', 'eye', 138, 24, '#ada0d0', 'lens'],
    ['icebound', 'Icebound', 'deep', 'walker', 'skeleton', 165, 27, '#b2c7d5', 'bone']
  ].map(([key, name, layer, kind, body, hp, damage, colour, loot]) => ({
    key, name, kind, body, hp, damage, colour, weight: 6,
    w: layer === 'deep' ? 1.25 : 1, h: ['skeleton', 'golem', 'humanoid'].includes(body) ? 1.8 : 1,
    biomes: ['tundra'], layers: [layer], emit: key === 'rimewisp' ? 4 : 0,
    drops: [[loot, 1], ['coin', layer === 'deep' ? 12 : layer === 'caves' ? 7 : 4]]
  })),
  { key: 'tundramimic', name: 'Rime Mimic', kind: 'walker', body: 'mimic', hp: 330,
    damage: 37, weight: 0, w: 1.8, h: 1.5, colour: '#8fbdca', hiddenSpawn: true,
    drops: [['rime-fang', 2], ['coin', 155]] },
  { key: 'rimehorn', name: 'Rimehorn', kind: 'king', body: 'golem', hp: 2050,
    damage: 38, weight: 0, w: 4.2, h: 3, colour: '#a1bacb', boss: true, summonOnly: true, emit: 4,
    drops: [['snow', 16], ['coin', 440]], bossDrops: ['rimehorn-shard'] },
  { key: 'aurorawraith', name: 'Aurora Wraith', kind: 'aurora', body: 'cloud', hp: 3800,
    damage: 51, weight: 0, w: 4.3, h: 3.2, colour: '#9d9bdb', boss: true, summonOnly: true, emit: 8,
    drops: [['crystal', 7], ['coin', 750]], bossDrops: ['aurora-thread'] },

  ...[
    ['orchidwasp', 'Orchid Wasp', 'surface', 'flyer', 'wasp', 49, 14, '#c798b6', 'stinger'],
    ['canopytoucan', 'Canopy Toucan', 'surface', 'flyer', 'bird', 43, 11, '#e1ad55', 'feather'],
    ['vinepanther', 'Vine Panther', 'surface', 'walker', 'lizard', 64, 15, '#516752', 'leather'],
    ['bambooscarab', 'Bamboo Scarab', 'surface', 'crawler', 'beetle', 55, 12, '#859e52', 'chitin'],
    ['mossviper', 'Moss Viper', 'caves', 'worm', 'worm', 89, 20, '#749163', 'wormtooth'],
    ['poolleech', 'Pool Leech', 'caves', 'swimmer', 'leech', 82, 18, '#647d77', 'gel'],
    ['lanternmantis', 'Lantern Mantis', 'caves', 'crawler', 'spider', 102, 23, '#a5b76a', 'chitin'],
    ['templeroot', 'Temple Root', 'deep', 'walker', 'golem', 193, 31, '#8a6d46', 'mahoganylog'],
    ['emeraldmaw', 'Emerald Maw', 'deep', 'flyer', 'maw', 164, 27, '#679379', 'stinger'],
    ['sporeoracle', 'Spore Oracle', 'deep', 'flyer', 'cloud', 148, 26, '#b6a37f', 'glowmoss']
  ].map(([key, name, layer, kind, body, hp, damage, colour, loot]) => ({
    key, name, kind, body, hp, damage, colour, weight: 6,
    w: layer === 'deep' ? 1.35 : 1.05, h: body === 'golem' ? 1.9 : 1,
    biomes: ['jungle'], layers: [layer], wet: kind === 'swimmer', emit: key === 'lanternmantis' ? 4 : 0,
    drops: [[loot, 1], ['coin', layer === 'deep' ? 13 : layer === 'caves' ? 8 : 5]]
  })),
  { key: 'junglemimic', name: 'Vinebound Mimic', kind: 'walker', body: 'mimic', hp: 360,
    damage: 40, weight: 0, w: 1.8, h: 1.5, colour: '#879763', hiddenSpawn: true,
    drops: [['vinebound-fang', 2], ['coin', 175]] },
  { key: 'orchidqueen', name: 'Orchid Queen', kind: 'hornetqueen', body: 'wasp', hp: 2350,
    damage: 41, weight: 0, w: 4.3, h: 2.9, colour: '#d6a766', boss: true, summonOnly: true, emit: 5,
    drops: [['stinger', 12], ['coin', 490]], bossDrops: ['orchid-stinger'] },
  { key: 'amberroot', name: 'Amberroot Strangler', kind: 'strangler', body: 'maw', hp: 4250,
    damage: 54, weight: 0, w: 4.5, h: 3.4, colour: '#b58e53', boss: true, summonOnly: true, emit: 6,
    drops: [['mahoganylog', 12], ['coin', 820]], bossDrops: ['amberroot-heart'] },

  ...[
    ['reedskipper', 'Reed Skipper', 'surface', 'slime', 'slime', 37, 10, '#8ca264', 'gel'],
    ['bogheron', 'Bog Heron', 'surface', 'flyer', 'bird', 43, 12, '#a3abb1', 'feather'],
    ['mudskulk', 'Mud Skulk', 'surface', 'walker', 'lizard', 57, 14, '#756f4c', 'leather'],
    ['mosquito', 'Blood Mosquito', 'surface', 'flyer', 'wasp', 42, 13, '#935a65', 'stinger'],
    ['peatspider', 'Peat Spider', 'caves', 'crawler', 'spider', 95, 20, '#796750', 'chitin'],
    ['lanternleech', 'Lantern Leech', 'caves', 'swimmer', 'leech', 92, 19, '#7d9f89', 'gel'],
    ['siltborer', 'Silt Borer', 'caves', 'worm', 'worm', 96, 21, '#8c7762', 'wormtooth'],
    ['fenrevenant', 'Fen Revenant', 'deep', 'walker', 'humanoid', 178, 28, '#74887c', 'rottenflesh'],
    ['blackfenmaw', 'Blackfen Maw', 'deep', 'flyer', 'maw', 172, 28, '#59696d', 'bone'],
    ['mirelantern', 'Mire Lantern', 'deep', 'flyer', 'cloud', 154, 26, '#b0b878', 'glowmoss']
  ].map(([key, name, layer, kind, body, hp, damage, colour, loot]) => ({
    key, name, kind, body, hp, damage, colour, weight: 6,
    w: layer === 'deep' ? 1.35 : 1.05, h: body === 'humanoid' ? 1.9 : 1,
    biomes: ['marsh'], layers: [layer], wet: kind === 'swimmer', emit: key.includes('lantern') ? 4 : 0,
    drops: [[loot, 1], ['coin', layer === 'deep' ? 13 : layer === 'caves' ? 8 : 5]]
  })),
  { key: 'marshmimic', name: 'Siltbound Mimic', kind: 'walker', body: 'mimic', hp: 355,
    damage: 39, weight: 0, w: 1.8, h: 1.5, colour: '#898264', hiddenSpawn: true,
    drops: [['siltbound-fang', 2], ['coin', 170]] },
  { key: 'reedking', name: 'The Reed King', kind: 'king', body: 'kingslime', hp: 2150,
    damage: 39, weight: 0, w: 4, h: 3, colour: '#87975b', boss: true, summonOnly: true, emit: 3,
    drops: [['gel', 20], ['coin', 460]], bossDrops: ['reed-crown'] },
  { key: 'fenwidow', name: 'The Blackfen Widow', kind: 'fenwidow', body: 'spider', hp: 3950,
    damage: 51, weight: 0, w: 4.4, h: 3.1, colour: '#71586d', boss: true, summonOnly: true, emit: 5,
    drops: [['chitin', 12], ['coin', 770]], bossDrops: ['blackfen-silk'] },

  ...[
    ['cliffkite', 'Cliff Kite', 'surface', 'flyer', 'bird', 45, 12, '#9a8671', 'feather'],
    ['craghare', 'Crag Hare', 'surface', 'walker', 'lizard', 39, 10, '#a99b89', 'leather'],
    ['screeclaw', 'Scree Claw', 'surface', 'crawler', 'beetle', 54, 13, '#786c63', 'chitin'],
    ['ridgewisp', 'Ridge Wisp', 'surface', 'flyer', 'cloud', 52, 14, '#a5a0c8', 'glowmoss'],
    ['quarrymite', 'Quarry Mite', 'caves', 'crawler', 'spider', 88, 19, '#827466', 'chitin'],
    ['shardborer', 'Shard Borer', 'caves', 'worm', 'worm', 94, 21, '#8a829a', 'wormtooth'],
    ['echobat', 'Echo Bat', 'caves', 'flyer', 'bat', 80, 18, '#6f6586', 'leather'],
    ['cairnhusk', 'Cairn Husk', 'deep', 'walker', 'golem', 201, 32, '#786d85', 'crystal'],
    ['slateoracle', 'Slate Oracle', 'deep', 'flyer', 'eye', 155, 26, '#9286b0', 'lens'],
    ['cairnsentry', 'Cairn Sentry', 'deep', 'walker', 'skeleton', 186, 30, '#aaa099', 'bone']
  ].map(([key, name, layer, kind, body, hp, damage, colour, loot]) => ({
    key, name, kind, body, hp, damage, colour, weight: 6,
    w: layer === 'deep' ? 1.35 : 1.05, h: ['golem', 'skeleton'].includes(body) ? 1.9 : 1,
    biomes: ['highlands'], layers: [layer], emit: key === 'ridgewisp' ? 4 : 0,
    drops: [[loot, 1], ['coin', layer === 'deep' ? 13 : layer === 'caves' ? 8 : 5]]
  })),
  { key: 'highlandsmimic', name: 'Cairn Mimic', kind: 'walker', body: 'mimic', hp: 375,
    damage: 41, weight: 0, w: 1.8, h: 1.5, colour: '#958caa', hiddenSpawn: true,
    drops: [['cairn-fang', 2], ['coin', 180]] },
  { key: 'cragbreaker', name: 'Cragbreaker', kind: 'king', body: 'golem', hp: 2400,
    damage: 43, weight: 0, w: 4.1, h: 3, colour: '#9d8b77', boss: true, summonOnly: true, emit: 3,
    drops: [['granite', 15], ['coin', 500]], bossDrops: ['cragbreaker-horn'] },
  { key: 'cairnshade', name: 'The Cairnshade', kind: 'cairnshade', body: 'cloud', hp: 4400,
    damage: 56, weight: 0, w: 4.3, h: 3.2, colour: '#a096c0', boss: true, summonOnly: true, emit: 6,
    drops: [['crystal', 8], ['coin', 850]], bossDrops: ['cairn-echo'] },

  ...[
    ['clayrunner', 'Clay Runner', 'surface', 'walker', 'lizard', 42, 11, '#bb7860', 'leather'],
    ['russetkite', 'Russet Kite', 'surface', 'flyer', 'bird', 49, 13, '#b77953', 'feather'],
    ['scrubmite', 'Scrub Mite', 'surface', 'crawler', 'beetle', 52, 13, '#94775a', 'chitin'],
    ['ochrewisp', 'Ochre Wisp', 'surface', 'flyer', 'cloud', 55, 14, '#cda76f', 'glowmoss'],
    ['kilnborer', 'Kiln Borer', 'caves', 'worm', 'worm', 94, 21, '#bb7252', 'wormtooth'],
    ['claystalker', 'Clay Stalker', 'caves', 'crawler', 'spider', 98, 21, '#a66d60', 'chitin'],
    ['siltbat', 'Silt Bat', 'caves', 'flyer', 'bat', 82, 18, '#897080', 'leather'],
    ['ochrehusk', 'Ochre Husk', 'deep', 'walker', 'golem', 205, 33, '#a57555', 'crystal'],
    ['catacombeye', 'Catacomb Eye', 'deep', 'flyer', 'eye', 157, 27, '#b78b92', 'lens'],
    ['claybound', 'Claybound', 'deep', 'walker', 'skeleton', 190, 30, '#b9937b', 'bone']
  ].map(([key, name, layer, kind, body, hp, damage, colour, loot]) => ({
    key, name, kind, body, hp, damage, colour, weight: 6,
    w: layer === 'deep' ? 1.35 : 1.05, h: ['golem', 'skeleton'].includes(body) ? 1.9 : 1,
    biomes: ['badlands'], layers: [layer], emit: key === 'ochrewisp' ? 4 : 0,
    drops: [[loot, 1], ['coin', layer === 'deep' ? 13 : layer === 'caves' ? 8 : 5]]
  })),
  { key: 'badlandsmimic', name: 'Ochre Mimic', kind: 'walker', body: 'mimic', hp: 380,
    damage: 41, weight: 0, w: 1.8, h: 1.5, colour: '#ad8062', hiddenSpawn: true,
    drops: [['ochre-fang', 2], ['coin', 185]] },
  { key: 'claybehemoth', name: 'Clay Behemoth', kind: 'king', body: 'golem', hp: 2450,
    damage: 43, weight: 0, w: 4.2, h: 3, colour: '#b6795b', boss: true, summonOnly: true, emit: 3,
    drops: [['redclay', 16], ['coin', 510]], bossDrops: ['behemoth-core'] },
  { key: 'ochredrake', name: 'Ochre Drake', kind: 'ochredrake', body: 'demon', hp: 4450,
    damage: 56, weight: 0, w: 4.4, h: 3.2, colour: '#c99766', boss: true, summonOnly: true, emit: 6,
    drops: [['bone', 12], ['coin', 860]], bossDrops: ['ochre-scale'] },

  ...[
    ['grassrunner', 'Grass Runner', 'surface', 'walker', 'lizard', 42, 11, '#b89a5d', 'leather'],
    ['acaciakite', 'Acacia Kite', 'surface', 'flyer', 'bird', 48, 12, '#a69064', 'feather'],
    ['goldentick', 'Golden Tick', 'surface', 'crawler', 'beetle', 51, 13, '#b7964f', 'chitin'],
    ['heatshimmer', 'Heat Shimmer', 'surface', 'flyer', 'cloud', 56, 14, '#e0b47b', 'glowmoss'],
    ['termiteguard', 'Termite Guard', 'caves', 'crawler', 'beetle', 89, 20, '#95754f', 'chitin'],
    ['dustborer', 'Dust Borer', 'caves', 'worm', 'worm', 93, 21, '#a28256', 'wormtooth'],
    ['amberwasp', 'Amber Wasp', 'caves', 'flyer', 'wasp', 84, 19, '#c59048', 'stinger'],
    ['courtcarapace', 'Court Carapace', 'deep', 'crawler', 'beetle', 200, 32, '#a27e54', 'chitin'],
    ['suncryptshade', 'Suncrypt Shade', 'deep', 'flyer', 'cloud', 161, 27, '#bbaa81', 'stardust'],
    ['sunbones', 'Sun Bones', 'deep', 'walker', 'skeleton', 187, 30, '#c2ae81', 'bone']
  ].map(([key, name, layer, kind, body, hp, damage, colour, loot]) => ({
    key, name, kind, body, hp, damage, colour, weight: 6,
    w: layer === 'deep' ? 1.35 : 1.05, h: body === 'skeleton' ? 1.9 : 1,
    biomes: ['savanna'], layers: [layer], emit: key === 'heatshimmer' ? 4 : 0,
    drops: [[loot, 1], ['coin', layer === 'deep' ? 13 : layer === 'caves' ? 8 : 5]]
  })),
  { key: 'savannamimic', name: 'Gilt Mimic', kind: 'walker', body: 'mimic', hp: 385,
    damage: 41, weight: 0, w: 1.8, h: 1.5, colour: '#bc9e62', hiddenSpawn: true,
    drops: [['gilt-fang', 2], ['coin', 185]] },
  { key: 'sunmane', name: 'Sunmane', kind: 'king', body: 'lizard', hp: 2500,
    damage: 44, weight: 0, w: 4.4, h: 3, colour: '#bc9457', boss: true, summonOnly: true, emit: 4,
    drops: [['leather', 14], ['coin', 520]], bossDrops: ['sunmane-tuft'] },
  { key: 'sunscarab', name: 'Sun Court Scarab', kind: 'sunscarab', body: 'beetle', hp: 4500,
    damage: 57, weight: 0, w: 4.6, h: 3.1, colour: '#c49e55', boss: true, summonOnly: true, emit: 6,
    drops: [['chitin', 13], ['coin', 870]], bossDrops: ['sun-carat'] },

  ...[
    ['pinehare', 'Pine Hare', 'surface', 'walker', 'lizard', 37, 10, '#b6a18a', 'leather'],
    ['needlejay', 'Needle Jay', 'surface', 'flyer', 'bird', 46, 12, '#788d9e', 'feather'],
    ['barkscarab', 'Bark Scarab', 'surface', 'crawler', 'beetle', 51, 13, '#847558', 'chitin'],
    ['sleetowl', 'Sleet Owl', 'surface', 'flyer', 'bird', 55, 14, '#a4b5b8', 'feather'],
    ['resinborer', 'Resin Borer', 'caves', 'worm', 'worm', 94, 21, '#a88a62', 'wormtooth'],
    ['pitchmite', 'Pitch Mite', 'caves', 'crawler', 'spider', 88, 20, '#806d6a', 'chitin'],
    ['pinewisp', 'Pine Wisp', 'caves', 'flyer', 'cloud', 83, 18, '#86a499', 'glowmoss'],
    ['winterbark', 'Winterbark', 'deep', 'walker', 'golem', 195, 31, '#80949d', 'pinelog'],
    ['barroweye', 'Barrow Eye', 'deep', 'flyer', 'eye', 156, 26, '#a094b6', 'lens'],
    ['needlebones', 'Needle Bones', 'deep', 'walker', 'skeleton', 183, 29, '#bdc2b1', 'bone']
  ].map(([key, name, layer, kind, body, hp, damage, colour, loot]) => ({
    key, name, kind, body, hp, damage, colour, weight: 6,
    w: layer === 'deep' ? 1.35 : 1.05, h: ['golem', 'skeleton'].includes(body) ? 1.9 : 1,
    biomes: ['taiga'], layers: [layer], emit: key === 'pinewisp' ? 4 : 0,
    drops: [[loot, 1], ['coin', layer === 'deep' ? 13 : layer === 'caves' ? 8 : 5]]
  })),
  { key: 'taigamimic', name: 'Pitchlock Mimic', kind: 'walker', body: 'mimic', hp: 365,
    damage: 40, weight: 0, w: 1.8, h: 1.5, colour: '#827c64', hiddenSpawn: true,
    drops: [['pitchlock-fang', 2], ['coin', 175]] },
  { key: 'pinemaw', name: 'Pinemaw', kind: 'king', body: 'lizard', hp: 2300,
    damage: 42, weight: 0, w: 4.3, h: 3, colour: '#887153', boss: true, summonOnly: true, emit: 3,
    drops: [['pinelog', 15], ['coin', 500]], bossDrops: ['pinemaw-claw'] },
  { key: 'winterroot', name: 'Winterroot Keeper', kind: 'winterroot', body: 'golem', hp: 4300,
    damage: 55, weight: 0, w: 4.4, h: 3.3, colour: '#8ba6aa', boss: true, summonOnly: true, emit: 6,
    drops: [['crystal', 8], ['coin', 840]], bossDrops: ['winterroot-core'] },

  ...[
    ['prairiehare', 'Prairie Hare', 'surface', 'walker', 'lizard', 29, 8, '#b59673', 'leather'],
    ['windlark', 'Wind Lark', 'surface', 'flyer', 'bird', 36, 10, '#b6a279', 'feather'],
    ['meadowmite', 'Meadow Mite', 'surface', 'crawler', 'beetle', 42, 11, '#849154', 'chitin'],
    ['thistlewisp', 'Thistle Wisp', 'surface', 'flyer', 'cloud', 48, 13, '#b192ac', 'glowmoss'],
    ['chalkborer', 'Chalk Borer', 'caves', 'worm', 'worm', 76, 17, '#c0ad8e', 'wormtooth'],
    ['cellarweaver', 'Cellar Weaver', 'caves', 'crawler', 'spider', 84, 18, '#8c7761', 'chitin'],
    ['draftbat', 'Draft Bat', 'caves', 'flyer', 'bat', 68, 16, '#847d96', 'leather'],
    ['chalksentry', 'Chalk Sentry', 'deep', 'walker', 'golem', 171, 27, '#b7ad9f', 'crystal'],
    ['standardshade', 'Standard Shade', 'deep', 'flyer', 'cloud', 141, 24, '#8e9cb2', 'stardust'],
    ['palelevy', 'Pale Levy', 'deep', 'walker', 'skeleton', 156, 26, '#beb69e', 'bone']
  ].map(([key, name, layer, kind, body, hp, damage, colour, loot]) => ({
    key, name, kind, body, hp, damage, colour, weight: 6,
    w: layer === 'deep' ? 1.3 : 1, h: ['golem', 'skeleton'].includes(body) ? 1.8 : 1,
    biomes: ['plains'], layers: [layer], emit: key === 'thistlewisp' ? 3 : 0,
    drops: [[loot, 1], ['coin', layer === 'deep' ? 12 : layer === 'caves' ? 7 : 4]]
  })),
  { key: 'plainsmimic', name: 'Chalklock Mimic', kind: 'walker', body: 'mimic', hp: 320,
    damage: 36, weight: 0, w: 1.8, h: 1.5, colour: '#a9a08b', hiddenSpawn: true,
    drops: [['chalklock-fang', 2], ['coin', 155]] },
  { key: 'windmillwarden', name: 'Windmill Warden', kind: 'king', body: 'golem', hp: 1750,
    damage: 34, weight: 0, w: 3.9, h: 3, colour: '#a28c70', boss: true, summonOnly: true, emit: 3,
    drops: [['oaklog', 12], ['coin', 390]], bossDrops: ['windmill-gear'] },
  { key: 'buriedstandard', name: 'The Buried Standard', kind: 'standard', body: 'cloud', hp: 3650,
    damage: 48, weight: 0, w: 4.1, h: 3.2, colour: '#8d9fb6', boss: true, summonOnly: true, emit: 5,
    drops: [['bone', 12], ['coin', 730]], bossDrops: ['standard-thread'] },

  { key: 'shadejay', name: 'Shade Jay', kind: 'flyer', body: 'bird', hp: 35, damage: 9, weight: 6, w: 1.05, h: 1, colour: '#a68ab5', biomes: ['blight'], layers: ['surface'], wet: false, drops: [['feather', 1], ['coin', 4]] },
  { key: 'sporehare', name: 'Spore Hare', kind: 'walker', body: 'lizard', hp: 39, damage: 11, weight: 6, w: 1.05, h: 1, colour: '#a18c87', biomes: ['blight'], layers: ['surface'], wet: false, drops: [['leather', 1], ['coin', 4]] },
  { key: 'rotmite', name: 'Rot Mite', kind: 'crawler', body: 'beetle', hp: 43, damage: 13, weight: 6, w: 1.05, h: 1, colour: '#7c8090', biomes: ['blight'], layers: ['surface'], wet: false, drops: [['chitin', 1], ['coin', 4]] },
  { key: 'gloamwisp', name: 'Gloam Wisp', kind: 'flyer', body: 'cloud', hp: 47, damage: 15, weight: 6, w: 1.05, h: 1, colour: '#a68ab5', biomes: ['blight'], layers: ['surface'], wet: false, drops: [['glowmoss', 1], ['coin', 4]] },
  { key: 'sporeborer', name: 'Spore Borer', kind: 'worm', body: 'worm', hp: 90, damage: 17, weight: 6, w: 1.05, h: 1, colour: '#a18c87', biomes: ['blight'], layers: ['caves'], wet: false, drops: [['wormtooth', 1], ['coin', 8]] },
  { key: 'chapelweaver', name: 'Chapel Weaver', kind: 'crawler', body: 'spider', hp: 95, damage: 19, weight: 6, w: 1.05, h: 1, colour: '#7c8090', biomes: ['blight'], layers: ['caves'], wet: false, drops: [['chitin', 1], ['coin', 8]] },
  { key: 'shadebat', name: 'Shade Bat', kind: 'flyer', body: 'bat', hp: 100, damage: 21, weight: 6, w: 1.05, h: 1, colour: '#a68ab5', biomes: ['blight'], layers: ['caves'], wet: false, drops: [['leather', 1], ['coin', 8]] },
  { key: 'rootshade', name: 'Root Shade', kind: 'flyer', body: 'maw', hp: 161, damage: 23, weight: 6, w: 1.35, h: 1, colour: '#a18c87', biomes: ['blight'], layers: ['deep'], wet: false, drops: [['bone', 1], ['coin', 12]] },
  { key: 'hollowhusk', name: 'Hollow Husk', kind: 'walker', body: 'golem', hp: 169, damage: 25, weight: 6, w: 1.35, h: 1.8, colour: '#7c8090', biomes: ['blight'], layers: ['deep'], wet: false, drops: [['crystal', 1], ['coin', 12]] },
  { key: 'gloambones', name: 'Gloam Bones', kind: 'walker', body: 'skeleton', hp: 177, damage: 27, weight: 6, w: 1.35, h: 1.8, colour: '#a68ab5', biomes: ['blight'], layers: ['deep'], wet: false, drops: [['bone', 1], ['coin', 12]] },
  { key: 'blightmimic', name: 'Shade Mimic', kind: 'walker', body: 'mimic', hp: 375, damage: 41, weight: 0, w: 1.8, h: 1.5, colour: '#a68ab5', hiddenSpawn: true, drops: [['shade-fang', 2], ['coin', 180]] },
  { key: 'sporecrown', minion: 'rotmite', name: 'Spore Crown', kind: 'king', body: 'kingslime', hp: 2100, damage: 39, weight: 0, w: 4.2, h: 3, colour: '#9a7cb4', boss: true, summonOnly: true, emit: 4, drops: [['coin', 420]], bossDrops: ['spore-crown-fragment'] },
  { key: 'hollowroot', minion: 'hollowhusk', name: 'Hollowroot', kind: 'guardian', body: 'maw', hp: 3900, damage: 51, weight: 0, w: 4.4, h: 3.2, colour: '#9e719f', boss: true, summonOnly: true, emit: 5, drops: [['coin', 840]], bossDrops: ['hollowroot-knot'] },
  { key: 'bloodjay', name: 'Blood Jay', kind: 'flyer', body: 'bird', hp: 35, damage: 9, weight: 6, w: 1.05, h: 1, colour: '#bf8186', biomes: ['crimson'], layers: ['surface'], wet: false, drops: [['feather', 1], ['coin', 4]] },
  { key: 'crimskulk', name: 'Crim Skulk', kind: 'walker', body: 'lizard', hp: 39, damage: 11, weight: 6, w: 1.05, h: 1, colour: '#a18c87', biomes: ['crimson'], layers: ['surface'], wet: false, drops: [['leather', 1], ['coin', 4]] },
  { key: 'veinmite', name: 'Vein Mite', kind: 'crawler', body: 'beetle', hp: 43, damage: 13, weight: 6, w: 1.05, h: 1, colour: '#7c8090', biomes: ['crimson'], layers: ['surface'], wet: false, drops: [['chitin', 1], ['coin', 4]] },
  { key: 'redwisp', name: 'Red Wisp', kind: 'flyer', body: 'cloud', hp: 47, damage: 15, weight: 6, w: 1.05, h: 1, colour: '#bf8186', biomes: ['crimson'], layers: ['surface'], wet: false, drops: [['glowmoss', 1], ['coin', 4]] },
  { key: 'veinborer', name: 'Vein Borer', kind: 'worm', body: 'worm', hp: 90, damage: 17, weight: 6, w: 1.05, h: 1, colour: '#a18c87', biomes: ['crimson'], layers: ['caves'], wet: false, drops: [['wormtooth', 1], ['coin', 8]] },
  { key: 'marrowweaver', name: 'Marrow Weaver', kind: 'crawler', body: 'spider', hp: 95, damage: 19, weight: 6, w: 1.05, h: 1, colour: '#7c8090', biomes: ['crimson'], layers: ['caves'], wet: false, drops: [['chitin', 1], ['coin', 8]] },
  { key: 'crimbat', name: 'Crim Bat', kind: 'flyer', body: 'bat', hp: 100, damage: 21, weight: 6, w: 1.05, h: 1, colour: '#bf8186', biomes: ['crimson'], layers: ['caves'], wet: false, drops: [['leather', 1], ['coin', 8]] },
  { key: 'marrowmaw', name: 'Marrow Maw', kind: 'flyer', body: 'maw', hp: 161, damage: 23, weight: 6, w: 1.35, h: 1, colour: '#a18c87', biomes: ['crimson'], layers: ['deep'], wet: false, drops: [['bone', 1], ['coin', 12]] },
  { key: 'veinhusk', name: 'Vein Husk', kind: 'walker', body: 'golem', hp: 169, damage: 25, weight: 6, w: 1.35, h: 1.8, colour: '#7c8090', biomes: ['crimson'], layers: ['deep'], wet: false, drops: [['crystal', 1], ['coin', 12]] },
  { key: 'redbones', name: 'Red Bones', kind: 'walker', body: 'skeleton', hp: 177, damage: 27, weight: 6, w: 1.35, h: 1.8, colour: '#bf8186', biomes: ['crimson'], layers: ['deep'], wet: false, drops: [['bone', 1], ['coin', 12]] },
  { key: 'crimsonmimic', name: 'Vein Mimic', kind: 'walker', body: 'mimic', hp: 375, damage: 41, weight: 0, w: 1.8, h: 1.5, colour: '#bf8186', hiddenSpawn: true, drops: [['vein-fang', 2], ['coin', 180]] },
  { key: 'bloodcrest', minion: 'bloodjay', name: 'Bloodcrest', kind: 'hover', body: 'bird', hp: 2200, damage: 40, weight: 0, w: 4.2, h: 3.2, colour: '#be756a', boss: true, summonOnly: true, emit: 4, drops: [['coin', 420]], bossDrops: ['bloodcrest-plume'] },
  { key: 'veinwarden', minion: 'veinhusk', name: 'Vein Warden', kind: 'guardian', body: 'golem', hp: 4050, damage: 52, weight: 0, w: 4.4, h: 3.2, colour: '#a75760', boss: true, summonOnly: true, emit: 5, drops: [['coin', 840]], bossDrops: ['veinward-core'] },
  { key: 'reefneedle', name: 'Reef Needle', kind: 'swimmer', body: 'fish', hp: 35, damage: 9, weight: 6, w: 1.05, h: 1, colour: '#7a9ea0', biomes: ['ocean'], layers: ['surface'], wet: true, drops: [['finleather', 1], ['coin', 4]] },
  { key: 'tidejelly', name: 'Tide Jelly', kind: 'swimmer', body: 'jelly', hp: 39, damage: 11, weight: 6, w: 1.05, h: 1, colour: '#a18c87', biomes: ['ocean'], layers: ['surface'], wet: true, drops: [['gel', 1], ['coin', 4]] },
  { key: 'reefleech', name: 'Reef Leech', kind: 'swimmer', body: 'leech', hp: 43, damage: 13, weight: 6, w: 1.05, h: 1, colour: '#7c8090', biomes: ['ocean'], layers: ['surface'], wet: true, drops: [['gel', 1], ['coin', 4]] },
  { key: 'breakerfin', name: 'Breakerfin', kind: 'swimmer', body: 'fish', hp: 47, damage: 15, weight: 6, w: 1.05, h: 1, colour: '#7a9ea0', biomes: ['ocean'], layers: ['surface'], wet: true, drops: [['finleather', 1], ['coin', 4]] },
  { key: 'drownedjelly', name: 'Drowned Jelly', kind: 'swimmer', body: 'jelly', hp: 90, damage: 17, weight: 6, w: 1.05, h: 1, colour: '#a18c87', biomes: ['ocean'], layers: ['caves'], wet: true, drops: [['gel', 1], ['coin', 8]] },
  { key: 'kelpmaw', name: 'Kelp Maw', kind: 'swimmer', body: 'leech', hp: 95, damage: 19, weight: 6, w: 1.05, h: 1, colour: '#7c8090', biomes: ['ocean'], layers: ['caves'], wet: true, drops: [['gel', 1], ['coin', 8]] },
  { key: 'sinkfin', name: 'Sinkfin', kind: 'swimmer', body: 'fish', hp: 100, damage: 21, weight: 6, w: 1.05, h: 1, colour: '#7a9ea0', biomes: ['ocean'], layers: ['caves'], wet: true, drops: [['finleather', 1], ['coin', 8]] },
  { key: 'abysshusk', name: 'Abyss Husk', kind: 'walker', body: 'golem', hp: 161, damage: 23, weight: 6, w: 1.35, h: 1.8, colour: '#a18c87', biomes: ['ocean'], layers: ['deep'], wet: false, drops: [['crystal', 1], ['coin', 12]] },
  { key: 'deepreefeye', name: 'Deep Reef Eye', kind: 'flyer', body: 'eye', hp: 169, damage: 25, weight: 6, w: 1.35, h: 1, colour: '#7c8090', biomes: ['ocean'], layers: ['deep'], wet: false, drops: [['lens', 1], ['coin', 12]] },
  { key: 'saltbones', name: 'Salt Bones', kind: 'walker', body: 'skeleton', hp: 177, damage: 27, weight: 6, w: 1.35, h: 1.8, colour: '#7a9ea0', biomes: ['ocean'], layers: ['deep'], wet: false, drops: [['bone', 1], ['coin', 12]] },
  { key: 'oceanmimic', name: 'Barnacle Mimic', kind: 'walker', body: 'mimic', hp: 375, damage: 41, weight: 0, w: 1.8, h: 1.5, colour: '#7a9ea0', hiddenSpawn: true, drops: [['barnacle-fang', 2], ['coin', 180]] },
  { key: 'reefleviathan', minion: 'reefneedle', name: 'Reef Leviathan', kind: 'scourge', body: 'fish', hp: 2650, damage: 43, weight: 0, w: 4.2, h: 3.2, colour: '#69a5ad', boss: true, summonOnly: true, emit: 4, drops: [['coin', 420]], bossDrops: ['reef-fin'] },
  { key: 'abyssaleye', minion: 'deepreefeye', name: 'Abyssal Eye', kind: 'sovereign', body: 'bigeye', hp: 4650, damage: 56, weight: 0, w: 4.4, h: 3.2, colour: '#6284ac', boss: true, summonOnly: true, emit: 5, drops: [['coin', 840]], bossDrops: ['abyssal-pearl'] },

  { key: 'sandpiper', name: 'Sandpiper', kind: 'flyer', body: 'bird', hp: 35, damage: 9, weight: 6, w: 1.05, h: 1, colour: '#a9b89e', biomes: ['beach'], layers: ['surface'], wet: false, drops: [['feather', 1], ['coin', 4]] },
  { key: 'driftcrab', name: 'Drift Crab', kind: 'walker', body: 'crab', hp: 39, damage: 11, weight: 6, w: 1.05, h: 1, colour: '#a18c87', biomes: ['beach'], layers: ['surface'], wet: false, drops: [['shell', 1], ['coin', 4]] },
  { key: 'dunecrawler', name: 'Dune Crawler', kind: 'crawler', body: 'beetle', hp: 43, damage: 13, weight: 6, w: 1.05, h: 1, colour: '#7c8090', biomes: ['beach'], layers: ['surface'], wet: false, drops: [['chitin', 1], ['coin', 4]] },
  { key: 'spraywisp', name: 'Spray Wisp', kind: 'flyer', body: 'cloud', hp: 47, damage: 15, weight: 6, w: 1.05, h: 1, colour: '#a9b89e', biomes: ['beach'], layers: ['surface'], wet: false, drops: [['glowmoss', 1], ['coin', 4]] },
  { key: 'saltborer', name: 'Salt Borer', kind: 'worm', body: 'worm', hp: 90, damage: 17, weight: 6, w: 1.05, h: 1, colour: '#a18c87', biomes: ['beach'], layers: ['caves'], wet: false, drops: [['wormtooth', 1], ['coin', 8]] },
  { key: 'brinejelly', name: 'Brine Jelly', kind: 'swimmer', body: 'jelly', hp: 95, damage: 19, weight: 6, w: 1.05, h: 1, colour: '#7c8090', biomes: ['beach'], layers: ['caves'], wet: true, drops: [['gel', 1], ['coin', 8]] },
  { key: 'wrackbat', name: 'Wrack Bat', kind: 'flyer', body: 'bat', hp: 100, damage: 21, weight: 6, w: 1.05, h: 1, colour: '#a9b89e', biomes: ['beach'], layers: ['caves'], wet: false, drops: [['leather', 1], ['coin', 8]] },
  { key: 'saltmarrowguard', name: 'Saltmarrow Guard', kind: 'walker', body: 'skeleton', hp: 161, damage: 23, weight: 6, w: 1.35, h: 1.8, colour: '#a18c87', biomes: ['beach'], layers: ['deep'], wet: false, drops: [['bone', 1], ['coin', 12]] },
  { key: 'drifthusk', name: 'Drift Husk', kind: 'walker', body: 'golem', hp: 169, damage: 25, weight: 6, w: 1.35, h: 1.8, colour: '#7c8090', biomes: ['beach'], layers: ['deep'], wet: false, drops: [['crystal', 1], ['coin', 12]] },
  { key: 'brineoracle', name: 'Brine Oracle', kind: 'flyer', body: 'eye', hp: 177, damage: 27, weight: 6, w: 1.35, h: 1, colour: '#a9b89e', biomes: ['beach'], layers: ['deep'], wet: false, drops: [['lens', 1], ['coin', 12]] },
  { key: 'beachmimic', name: 'Driftlock Mimic', kind: 'walker', body: 'mimic', hp: 375, damage: 41, weight: 0, w: 1.8, h: 1.5, colour: '#a9b89e', hiddenSpawn: true, drops: [['driftlock-fang', 2], ['coin', 180]] },
  { key: 'breakwatercrab', minion: 'driftcrab', name: 'Breakwater Crab', kind: 'king', body: 'crab', hp: 1950, damage: 37, weight: 0, w: 4.2, h: 3, colour: '#c68d66', boss: true, summonOnly: true, emit: 4, drops: [['coin', 420]], bossDrops: ['breakwater-claw'] },
  { key: 'saltmarrow', minion: 'saltmarrowguard', name: 'Saltmarrow', kind: 'guardian', body: 'skeleton', hp: 3880, damage: 49, weight: 0, w: 4.4, h: 3.2, colour: '#a5b8ae', boss: true, summonOnly: true, emit: 5, drops: [['coin', 840]], bossDrops: ['saltmarrow-bone'] },

  { key: 'hallowwisp', name: 'Hallow Wisp', kind: 'flyer', body: 'cloud', hp: 420, damage: 48,
    weight: 10, w: 1.1, h: 1.25, colour: '#d5a5ee', layers: ['surface', 'caves'], biomes: ['hallow'], emit: 5,
    drops: [['stardust', 3], ['coin', 25]] },
  { key: 'prismcrawler', name: 'Prism Crawler', kind: 'crawler', body: 'beetle', hp: 490, damage: 56,
    weight: 9, w: 1.25, h: 1.1, colour: '#8dd9d9', layers: ['caves', 'deep'], biomes: ['hallow'],
    drops: [['crystal', 3], ['coin', 30]] },
  { key: 'drownedarchivist', name: 'Drowned Archivist', kind: 'archon', body: 'jelly', hp: 40800,
    damage: 176, weight: 0, w: 5.6, h: 4.9, colour: '#86c9d7', boss: true, summonOnly: true,
    emit: 9, barrage: 'starburst', drops: [['coin', 7600]], bossDrops: ['archivist-core'] },
  { key: 'lenscustodian', name: 'Lens Custodian', kind: 'archon', body: 'golem', hp: 36500,
    damage: 169, weight: 0, w: 5.3, h: 4.7, colour: '#c1a9ef', boss: true, summonOnly: true,
    emit: 9, barrage: 'starburst', drops: [['coin', 6800]], bossDrops: ['lens-vault-core'] },
  { key: 'foundrywarden', name: 'Starfall Warden', kind: 'archon', body: 'golem', hp: 32800,
    damage: 162, weight: 0, w: 5.7, h: 4.9, colour: '#bd9dea', boss: true, summonOnly: true,
    emit: 10, barrage: 'foundry', minion: 'foundry-drone', drops: [['coin', 5800]], bossDrops: ['foundry-prism'] },
  { key: 'foundry-drone', name: 'Repulsor Drone', kind: 'flyer', body: 'eye', hp: 680,
    damage: 85, weight: 9, w: 1.1, h: 1.05, colour: '#ae95ea', layers: ['space'], foundry: true, push: 1.7,
    drops: [['stardust', 3], ['coin', 60]] },
  { key: 'foundry-sentry', name: 'Landing Sentry', kind: 'walker', body: 'golem', hp: 1050,
    damage: 105, weight: 7, w: 1.5, h: 2.5, colour: '#9fa5cb', layers: ['space'], foundry: true, push: 1.35,
    drops: [['stardust', 2], ['coin', 80]] },
  { key: 'starwyvern', name: 'Astraeus, the Star Wyvern', kind: 'starwyvern', body: 'worm', hp: 26400,
    damage: 146, weight: 0, w: 8.2, h: 4.4, colour: '#b9c9fa', boss: true, summonOnly: true,
    emit: 9, barrage: 'starburst', drops: [['coin', 4750]], bossDrops: ['starwyvern-plume'] },
  { key: 'wildwyvern', name: 'Wild Wyvern', kind: 'flyer', body: 'worm', hp: 840,
    damage: 91, weight: 15, w: 4.2, h: 2.2, colour: '#91c6ea', layers: ['space'], wyvernsUnlocked: true,
    emit: 5, drops: [['wyvern-essence', 3], ['stardust', 2], ['coin', 70]] },
  { key: 'glasscolossus', name: 'Glass Colossus', kind: 'glasscolossus', body: 'golem', hp: 18500,
    damage: 126, weight: 0, w: 5.4, h: 5.6, colour: '#91d9d7', boss: true, summonOnly: true,
    barrage: 'shatter', emit: 8, drops: [['coin', 3300]], bossDrops: [['colossus-core', 2]] },
  { key: 'coilserpent', name: 'Coil Serpent', kind: 'coilserpent', body: 'worm', hp: 21400,
    damage: 126, weight: 0, w: 7, h: 3.4, colour: '#d5a26a', boss: true, summonOnly: true,
    barrage: 'cross', emit: 7, drops: [['coin', 3300]], bossDrops: [['serpent-core', 2]] },
  { key: 'zenithengine', name: 'Zenith Engine', kind: 'zenithengine', body: 'bird', hp: 20200,
    damage: 126, weight: 0, w: 6, h: 4.1, colour: '#c596e8', boss: true, summonOnly: true,
    barrage: 'fan', emit: 9, drops: [['coin', 3300]], bossDrops: [['zenith-core', 2]] },
  { key: 'prismsentinel', name: 'Prism Sentinel', kind: 'prism', body: 'golem', hp: 12800,
    damage: 95, weight: 0, w: 4.7, h: 4.6, colour: '#d6a6ed', boss: true, summonOnly: true,
    emit: 10, drops: [['coin', 2600]], bossDrops: ['prism-heart'] },

  { key: 'starjelly', name: 'Star Jelly', kind: 'flyer', body: 'jelly', hp: 70, damage: 20, weight: 9,
    w: 1.0, h: 1.0, colour: '#8f9ce8', layers: ['space'], emit: 6, drops: [['stardust', 1], ['coin', 6]] }
];

for (const specimen of WILDLIFE_SPECIMENS) {
  const existing = ENEMIES.find(spec => spec.key === specimen.key);
  if (existing) {
    existing.specimen = specimen;
    existing.neutral = true;
    continue;
  }
  const flying = ['bird', 'wasp'].includes(specimen.body) || specimen.key.endsWith('firefly');
  ENEMIES.push({
    key: specimen.key, name: specimen.name, kind: flying ? 'flyer' : 'walker',
    body: specimen.body, hp: 12, damage: 0, weight: 3,
    w: flying ? 0.85 : 0.73, h: flying ? 0.66 : 0.6, colour: specimen.colour,
    biomes: specimen.biomes || undefined, layers: specimen.gem ? ['caves', 'deep'] : ['surface'],
    day: specimen.clock !== 'night', night: specimen.clock !== 'day',
    emit: specimen.rare === 'crystal' || specimen.key.endsWith('firefly') ? 5 : 0,
    specimen, passive: true, hiddenSpawn: Boolean(specimen.rare),
    drops: specimen.rare === 'crystal' ? [[specimen.gem, 2]] : []
  });
}

const ENEMY_BY_KEY = {};
for (const e of ENEMIES) ENEMY_BY_KEY[e.key] = e;

// --- spawn selection --------------------------------------------------------------------

function wildlifeVariant(spec, roll) {
  if (!spec.specimen || spec.specimen.rare) return spec;
  const gem = spec.specimen.gem;
  const variant = gem && roll < 1 / 1100 ? gem + '-' + spec.key
    : roll < 1 / 180 ? 'gold-' + spec.key : spec.key;
  return ENEMY_BY_KEY[variant] || spec;
}

function matches(spec, ctx) {
  if (spec.summonOnly || spec.hiddenSpawn || (spec.wyvernsUnlocked && !ctx.wyvernsUnlocked)) return false;
  // An event enemy exists only during its event, and an event does not suppress the
  // ordinary roster: a blood moon is the usual night with worse things added to it.
  if (Boolean(spec.dungeon) !== Boolean(ctx.dungeon)) return false;
  if (Boolean(spec.lowerOssuary) !== Boolean(ctx.lowerOssuary)) return false;
  if (Boolean(spec.foundry) !== Boolean(ctx.foundry)) return false;
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
  starwyvern: { perTile: 1.3, perSecond: 6.2 },
  glasscolossus: { perTile: 1.5, perSecond: 1.4 },
  coilserpent: { perTile: 1.2, perSecond: 3.8 },
  zenithengine: { perTile: 0.5, perSecond: 9.2 },
  prism: { perTile: 0.4, perSecond: 8 },
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
  hover: { perTile: 0.3, perSecond: 8 },
  furnace: { perTile: 0.45, perSecond: 6 },
  guardian: { perTile: 0.35, perSecond: 6 },
  sovereign: { perTile: 0.4, perSecond: 10 },
  archon: { perTile: 0.45, perSecond: 11 },
  thunderbird: { perTile: 0.4, perSecond: 10 },
  scourge: { perTile: 0.45, perSecond: 7 },
  aurora: { perTile: 0.5, perSecond: 9 },
  hornetqueen: { perTile: 0.46, perSecond: 10 },
  strangler: { perTile: 0.4, perSecond: 7 },
  fenwidow: { perTile: 0.46, perSecond: 10 },
  cairnshade: { perTile: 0.43, perSecond: 9 },
  ochredrake: { perTile: 0.45, perSecond: 9 },
  sunscarab: { perTile: 0.47, perSecond: 9 },
  winterroot: { perTile: 0.44, perSecond: 9 },
  standard: { perTile: 0.44, perSecond: 9 }
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
    const biome = (world.biomeAt?.(Math.floor(x), Math.floor(y)) || worldgen.biomeAt(world.seed, Math.floor(x))).key;
    const layer = worldgen.layerAt(Math.floor(y)).key;
    const wet = liquidAt(x, y) !== 0;
    // Underground is never daylit, whatever the clock says.
    const surfaceish = layer === 'surface' || layer === 'sky' || layer === 'space';
    const day = surfaceish ? (dayPhase < 0.25 || dayPhase > 0.75) : false;
    const site = worldgen.dungeonAt?.(world.seed, Math.floor(x), Math.floor(y));
    const dungeon = !!site && y > site.y && !!deps.dungeonOpen?.();
    const lowerOssuary = dungeon && y > site.y + 58 && !!world.hardmode;
    return { biome, layer, wet, day, dungeon, lowerOssuary,
      foundry: layer === 'space' && !!deps.wyvernsUnlocked?.() && !!worldgen.foundryAt?.(world.seed, x, y),
      wyvernsUnlocked: layer === 'space' && !!deps.wyvernsUnlocked?.(), event: event || null };
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
  function summon(key, player, arena) {
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
          const above = Math.floor(player.y) - 9;
          const y = arena ? Math.max(arena.top, Math.min(above, arena.bottom - spec.h)) : above;
          if (arena && (x < arena.left || x + spec.w > arena.right)) continue;
          if (!arch.burrows && overlaps(probe, x, y)) continue;
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

  function wakeMimic(x, y, key = 'forestmimic') {
    const spec = ENEMY_BY_KEY[key];
    if (!spec?.hiddenSpawn) return null;
    const mimic = makeEnemy(spec, x, y + 2 - spec.h);
    if (overlaps(mimic, mimic.x, mimic.y)) return null;
    list.push(mimic);
    return mimic;
  }

  function summonPractice(key, x, y) {
    const spec = ENEMY_BY_KEY[key];
    if (!spec || spec.boss || list.filter(enemy => enemy.practice && !enemy.dead).length >= 6) return false;
    const enemy = makeEnemy(spec, x + 0.5 - spec.w / 2, y + 1 - spec.h);
    if (overlaps(enemy, enemy.x, enemy.y)) return false;
    enemy.practice = true;
    list.push(enemy);
    return true;
  }

  function bossAlive() {
    return list.find(e => e.boss) || null;
  }

  function trySpawn(player, dayPhase, event) {
    // A boss and its minions do not count against the ordinary cap, and nothing
    // ordinary spawns while one is alive: the fight is the fight.
    if (list.some(e => e.boss)) return null;
    if (list.length >= (event ? EVENT_ALIVE : MAX_ALIVE)) return null;
    const habitat = contextAt(player.x, player.y, dayPhase, event);
    const inOssuary = habitat.dungeon;
    const surface = habitat.layer === 'surface' && !event;
    if (surface && list.filter(enemy => !enemy.spec.specimen).length >= 4
      && list.filter(enemy => enemy.spec.specimen).length >= 5) return null;
    const spawnMin = inOssuary || habitat.foundry ? 12 : SPAWN_MIN;
    const spawnMax = inOssuary || habitat.foundry ? 27 : SPAWN_MAX;
    // A few columns per attempt, so one unlucky column does not cost a whole tick.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const side = rng() < 0.5 ? -1 : 1;
      const x = Math.floor(player.x + side * (spawnMin + rng() * (spawnMax - spawnMin)));
      const y0 = Math.floor(player.y - SPAWN_MAX * 0.6);
      const y1 = Math.floor(player.y + SPAWN_MAX * 0.6);

      // The pool is decided at the player's own altitude band for this column, so a
      // surface spawn is chosen from the surface roster even if the scan reaches deeper.
      const ctx = contextAt(x, player.y, dayPhase, event);
      let pool = poolFor(ctx);
      if (surface && !inOssuary) {
        const wildlife = list.filter(enemy => enemy.spec.specimen).length;
        const hostile = list.length - wildlife;
        pool = pool.filter(spec => spec.specimen ? wildlife < 5 : hostile < 4);
        if (rng() < 0.6) pool = pool.filter(spec => spec.specimen);
      }
      const spec = chooseFrom(pool, rng());
      if (!spec) continue;

      const spots = candidatesIn(x, y0, y1, spec);
      if (spots.length === 0) continue;
      const y = spots[Math.min(spots.length - 1, Math.floor(rng() * spots.length))];
      if (suppressed(x, y)) continue;
      // And the chosen spot must still belong to the roster it was drawn from.
      const here = contextAt(x, y, dayPhase, event);
      if (!matches(spec, here)) continue;

      const variant = spec.specimen ? wildlifeVariant(spec, rng()) : spec;
      const enemy = makeEnemy(variant, x, y);
      enemy.homeX = x;
      enemy.homeY = y;
      if (variant.body === 'bird' && here.biome === 'forest' && here.layer === 'surface') enemy.neutral = true;
      list.push(enemy);
      return enemy;
    }
    return null;
  }

  function damage(enemy, amount) {
    const plated = enemy.spec.barrage === 'shatter' && enemy.hp > enemy.maxHp / 2 && !enemy.beams;
    const shielded = enemy.key === 'lenscustodian' && deps.lensLit && !deps.lensLit();
    enemy.hp -= shielded ? 0 : plated ? Math.max(1, Math.round(amount * 0.74)) : amount;
    enemy.hurt = 0.18;
    enemy.provoked = true;
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
      if (enemy.key === 'lenscustodian') enemy.shielded = !!deps.lensLit && !deps.lensLit();
      if (enemy.key === 'prismsentinel') stepPrismBoss(enemy, arch, player, dt, toward);
      else if (arch.flies && !(enemy.spec.barrage === 'foundry' && enemy.beams)) stepHoverBoss(enemy, arch, player, dt, toward);
      else if (!enemy.beams) stepBoss(enemy, arch, player, dt, toward);
      if (enemy.spec.barrage) stepHardmodeBarrage(enemy, player, dt);
      return;
    }

    if (enemy.spec.passive || ((enemy.spec.neutral || enemy.neutral) && !enemy.provoked)) {
      const direction = enemy.provoked ? -toward : Math.sin(enemy.timer * 0.86 + (enemy.homeX || 0));
      enemy.facing = direction < 0 ? -1 : 1;
      moveAxis(enemy, direction * (enemy.provoked ? 3.2 : 1.35) * dt, 0);
      if (arch.gravity) {
        enemy.vy = Math.min(12, enemy.vy + arch.gravity * dt);
        moveAxis(enemy, 0, enemy.vy * dt);
      } else {
        const targetY = (enemy.homeY ?? enemy.y) + Math.sin(enemy.timer * 1.8) * 1.7;
        moveAxis(enemy, 0, Math.max(-2, Math.min(2, (targetY - enemy.y) * 2)) * dt);
      }
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
    const minion = enemy.spec.minion || arch.minion;
    if (!minion) return;
    enemy.minionCooldown -= dt;
    if (enemy.minionCooldown > 0) return;
    enemy.minionCooldown = arch.spawnEvery;
    const spec = ENEMY_BY_KEY[minion];
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
  function stepHardmodeBarrage(enemy, player, dt) {
    const pattern = enemy.spec.barrage;
    const enraged = enemy.hp <= enemy.maxHp / 2;
    if (pattern === 'shatter') enemy.enraged = enraged;
    const cooldown = enraged ? 2.75 : 4.1;
    const elapsed = (enemy.barrageTime || 0) + dt;
    if (elapsed < cooldown || (pattern === 'shatter' && !enemy.beams && !enemy.onGround)) {
      enemy.barrageTime = Math.min(elapsed, cooldown);
      return;
    }
    if (pattern === 'foundry' && !enemy.beams) {
      const site = worldgen.foundryAt?.(world.seed, player.x, player.y);
      if (site) {
        const pad = [38, 47, 56][(enemy.foundryVolley || 0) % 3];
        enemy.x = site.x + pad - enemy.width / 2;
        enemy.y = site.y - 17;
        enemy.foundryVolley = (enemy.foundryVolley || 0) + 1;
      }
    }
    const x = enemy.x + enemy.width / 2;
    const y = pattern === 'shatter' ? enemy.y + enemy.height - 0.35 : enemy.y + enemy.height / 2;
    if (!enemy.beams) {
      const aim = Math.atan2(player.y + player.height / 2 - y, player.x + player.width / 2 - x);
      const fan = enraged ? [-0.66, -0.44, -0.22, 0, 0.22, 0.44, 0.66] : [-0.48, -0.24, 0, 0.24, 0.48];
      const angles = pattern === 'shatter' ? [0, Math.PI]
        : pattern === 'cross' ? [aim - 0.25, aim + 0.25, aim - 1.12, aim + 1.12]
          : pattern === 'starburst' ? Array.from({ length: enraged ? 12 : 8 }, (_, i) =>
            aim + i * Math.PI * 2 / (enraged ? 12 : 8)) : fan.map(offset => aim + offset);
      enemy.beams = { live: false, range: pattern === 'shatter' ? 17 : 23, angles, origin: pattern === 'shatter' ? 'feet' : null,
        colour: enemy.spec.colour };
    }
    const warning = enraged ? 0.62 : 0.9;
    if (elapsed < cooldown + warning) {
      enemy.barrageTime = elapsed;
      return;
    }
    deps.bossBarrage?.(enemy, { x, y, angles: enemy.beams.angles, pattern, enraged });
    enemy.beams = null;
    enemy.barrageTime = 0;
  }

  function stepPrismBoss(enemy, arch, player, dt, toward) {
    enemy.enraged = enemy.hp / enemy.maxHp <= arch.enrageAt;
    if (!enemy.enraged) bossMinions(enemy, arch, dt);
    const cycle = enemy.timer % 5;
    const px = player.x + player.width / 2, py = player.y + player.height / 2;
    const cx = enemy.x + enemy.width / 2, cy = enemy.y + enemy.height / 2;
    enemy.facing = toward;
    if (cycle < 2.2) {
      enemy.beams = null;
      const dx = px - cx + Math.sin(enemy.timer) * 7;
      const dy = py - cy - 6;
      const len = Math.hypot(dx, dy) || 1;
      moveAxis(enemy, dx / len * arch.speed * dt, 0);
      moveAxis(enemy, 0, dy / len * arch.speed * dt);
      enemy.beamAim = Math.atan2(py - cy, px - cx);
      return;
    }
    if (cycle > 4.5) { enemy.beams = null; return; }
    const live = cycle >= 3.25;
    const sweep = live ? (cycle - 3.25) * 1.12 - 0.7 : -0.7;
    const angle = (enemy.beamAim || 0) + sweep;
    enemy.beams = { live, range: 26, angles: enemy.enraged ? [angle - 0.38, angle, angle + 0.38] : [angle] };
  }

  function stepHoverBoss(enemy, arch, player, dt, toward) {
    function move() {
      if (arch.burrows) {
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
      } else {
        moveAxis(enemy, enemy.vx * dt, 0);
        moveAxis(enemy, 0, enemy.vy * dt);
      }
    }
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
      move();
      if (enemy.charge <= 0) {
        if (enemy.enraged && arch.followUp && !enemy.followUp) {
          enemy.followUp = true;
          enemy.windUp = arch.followUp;
        } else {
          enemy.followUp = false;
          enemy.chargeCooldown = arch.chargeEvery * (enemy.enraged ? arch.enrageCharge : 1);
        }
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
    move();
    enemy.facing = toward;
  }

  // The first row in a column range where this body would stand on solid ground. Used
  // for the teleport, which must not land the king inside the rock.
  function findFloor(x, y0, y1, body) {
    for (let floorY = Math.ceil(y0 + body.height); floorY <= Math.floor(y1 + body.height); floorY += 1) {
      const y = floorY - body.height;
      if (overlaps(body, x, y)) continue;
      for (let dx = 0; dx < Math.ceil(body.width); dx += 1) {
        if (solid(x + dx, floorY)) return y;
      }
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
  function prismHit(enemy, player) {
    if (!enemy.beams?.live) return false;
    const dx = player.x + player.width / 2 - (enemy.x + enemy.width / 2);
    const dy = player.y + player.height / 2 - (enemy.y + enemy.height / 2);
    return enemy.beams.angles.some(angle => {
      const along = dx * Math.cos(angle) + dy * Math.sin(angle);
      const across = dx * Math.sin(angle) - dy * Math.cos(angle);
      return along >= 0 && along <= enemy.beams.range && Math.abs(across) <= 0.72;
    });
  }

  function touching(player) {
    for (const enemy of list) {
      if (enemy.dead || enemy.spec.passive || ((enemy.spec.neutral || enemy.neutral) && !enemy.provoked)) continue;
      if (prismHit(enemy, player)) return enemy;
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
      if (!enemy.dead && x >= enemy.x && x <= enemy.x + enemy.width
        && y >= enemy.y && y <= enemy.y + enemy.height) return enemy;
    }
    return null;
  }

  function clear() {
    list.length = 0;
  }

  return { list, step, trySpawn, summon, summonPractice, wakeMimic, bossAlive, touching, at, damage, contextAt,
    poolFor, clear, candidatesIn,
    get count() { return list.length; } };
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
const EXPORTS_enemy = { ENEMIES, BY_KEY: ENEMY_BY_KEY, ARCHETYPES, GAIT, poolFor, wildlifeVariant, chooseFrom, matches,
  makeEnemy, makeSwarm, SPAWN_MIN, SPAWN_MAX, DESPAWN, MAX_ALIVE, EVENT_ALIVE, SPAWN_EVERY };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_enemy;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.enemy = EXPORTS_enemy;
}
