'use strict';
// Crafting. Two rules carry most of the behaviour, both taken from Terraria: a recipe is
// shown only when you already hold everything it needs, and a station counts as available
// when it sits inside a box 5 tiles left/right and 3 tiles up/down of the player. The
// first means the list is a description of what you can do right now rather than a
// catalogue to read; the second means walking away from the bench closes the bench.

// Tool names live in the mining registry; reach it the same way in Node and the browser.
const CRAFT_TOOLS = (typeof require === 'function') ? require('./mining.js').TOOLS : TOOLS;
// Same for the wall registry. Reaching for a bare global worked in the browser and
// silently returned 'block' in Node, which would have rebuilt a refunded wall as a block.
const CRAFT_WALLS = (typeof require === 'function')
  ? require('./tiles.js').WALL_BY_KEY : WALL_BY_KEY;
const CRAFT_TILES = (typeof require === 'function')
  ? require('./tiles.js') : FATHOM.tiles;
// Resolved at call time rather than at load time. buffs.js is loaded after this file in
// the browser, so naming `BUFFS` here would read a `const` before its declaration and
// throw on load - which is the same trap the two lookups above are written around, and
// which I walked straight into anyway.

const STATION_REACH_X = 5;
const STATION_REACH_Y = 3;

// Items that are not tiles: bars and tools. Tiles supply their own name and colour, so
// only these need a registry. `kind` decides how a slot draws and whether it stacks.
const HARDMODE_METALS = [
  { key: 'palladium', name: 'Palladium', colour: '#cf8457', defense: 25, damage: 130,
    bonus: { key: 'renewal', name: 'Renewal', text: 'Health regenerates 50% faster', regen: 1.5 } },
  { key: 'mythril', name: 'Mythril', colour: '#68b9a8', defense: 29, damage: 147,
    bonus: { key: 'conduit', name: 'Conduit', text: 'Magic costs 20% less mana', manaCost: 0.8 } },
  { key: 'adamantite', name: 'Adamantite', colour: '#db6f8b', defense: 34, damage: 164,
    bonus: { key: 'adamant', name: 'Adamant', text: 'Defence +8 and weapon damage +10%', defense: 8, melee: 1.1, ranged: 1.1, magic: 1.1 } },
  { key: 'lunarium', name: 'Lunarium', colour: '#93c9e8', defense: 40, damage: 248,
    spell: 'ward', bonus: { key: 'moonwake', name: 'Moonwake', text: 'Flight +0.25s and health regenerates 25% faster',
      flightBonus: 0.25, regen: 1.25 } },
  { key: 'solarium', name: 'Solarium', colour: '#ebad68', defense: 45, damage: 268,
    spell: 'pierce', bonus: { key: 'sunflare', name: 'Sunflare', text: 'Melee and ranged damage +16%', melee: 1.16, ranged: 1.16 } },
  { key: 'eventide', name: 'Eventide', colour: '#b29ae9', defense: 50, damage: 289,
    spell: 'chain', bonus: { key: 'duskfall', name: 'Duskfall', text: 'Weapon damage +18% and magic costs 15% less',
      melee: 1.18, ranged: 1.18, magic: 1.18, manaCost: 0.85 } }
];

const ITEMS = {
  'tin-bar': { name: 'Tin Bar', kind: 'bar', colour: '#b3b1a6' },
  'copper-bar': { name: 'Copper Bar', kind: 'bar', colour: '#c07a42' },
  'iron-bar': { name: 'Iron Bar', kind: 'bar', colour: '#a8a29b' },
  'silver-bar': { name: 'Silver Bar', kind: 'bar', colour: '#cdd2dc' },
  'gold-bar': { name: 'Gold Bar', kind: 'bar', colour: '#e0c054' },
  'cobalt-bar': { name: 'Cobalt Bar', kind: 'bar', colour: '#3f7fb5' },
  'emberite-bar': { name: 'Emberite Bar', kind: 'bar', colour: '#d4663a' },
  // Smelted from what falls out of the sky after the King is dead. The only metal in the
  // game that is not in the ground.
  'meteor-bar': { name: 'Meteor Bar', kind: 'bar', colour: '#a06a5c' },
  // Buckets. Two items rather than one with a flag, so a full bucket stacks separately
  // from an empty one and the hotbar shows at a glance which you are holding.
  bucket: { name: 'Empty Bucket', kind: 'tool', colour: '#9aa3ad' },
  'water-bucket': { name: 'Water Bucket', kind: 'tool', colour: '#3f86c4' },

  // Loot. Everything an enemy leaves behind, so a drop has a name in the backpack and an
  // icon rather than a grey square.
  gel: { name: 'Gel', kind: 'loot', colour: '#6fc26f' },
  rottenflesh: { name: 'Rotten Flesh', kind: 'loot', colour: '#7d6a4e' },
  lens: { name: 'Lens', kind: 'loot', colour: '#9fd4e8' },
  feather: { name: 'Feather', kind: 'loot', colour: '#d8d2c2' },
  chitin: { name: 'Chitin', kind: 'loot', colour: '#b5783e' },
  stinger: { name: 'Stinger', kind: 'loot', colour: '#e0c050' },
  leather: { name: 'Leather', kind: 'loot', colour: '#8a6038' },
  bone: { name: 'Bone', kind: 'loot', colour: '#e2dcc8' },
  wormtooth: { name: 'Worm Tooth', kind: 'loot', colour: '#cfc6ae' },
  shadowscale: { name: 'Shadow Scale', kind: 'loot', colour: '#7a5fa8' },
  tissue: { name: 'Vile Tissue', kind: 'loot', colour: '#a8404a' },
  finleather: { name: 'Shark Fin', kind: 'loot', colour: '#7b8792' },
  cinder: { name: 'Cinder', kind: 'loot', colour: '#d2622f' },
  stardust: { name: 'Stardust', kind: 'loot', colour: '#aab4f0' },
  arrow: { name: 'Arrow', kind: 'ammo', colour: '#b9a271' },
  'iron-arrow': { name: 'Iron Arrow', kind: 'ammo', colour: '#9aa0a8' },
  'ember-arrow': { name: 'Ember Arrow', kind: 'ammo', colour: '#e2743a' },
  coin: { name: 'Copper Coin', kind: 'coin', colour: '#c98762' },

  // Things that fall out of the sky, and things you use rather than wear or swing.
  // A `use` item is spent where it stands: the only way max mana goes up, and the only
  // healing that does not involve standing still and waiting.
  fallenstar: { name: 'Fallen Star', kind: 'loot', colour: '#ffe9a0' },
  manacrystal: { name: 'Mana Crystal', kind: 'use', colour: '#6f7fe0', use: { mana: 20 },
    text: 'Raises maximum mana by 20' },
  'healing-salve': { name: 'Healing Salve', kind: 'use', colour: '#e05c6a', use: { heal: 70 },
    text: 'Restores 70 health' },
  'mana-salve': { name: 'Mana Salve', kind: 'use', colour: '#5c8ae0', use: { restore: 60 },
    text: 'Restores 60 mana' },
  // Rods, and what comes out of the water. A fish is food: cooked at a furnace it is the
  // cheapest healing in the game, which is the point of a pond near the house.
  'wood-rod': { name: 'Wooden Rod', kind: 'tool', colour: '#8a6038', rod: true,
    text: 'Right click at water to cast, and again to pull' },
  'iron-rod': { name: 'Iron Rod', kind: 'tool', colour: '#a8a29b', rod: true,
    text: 'Right click at water to cast, and again to pull' },
  'gold-rod': { name: 'Gilded Rod', kind: 'tool', colour: '#e0c054', rod: true,
    text: 'Right click at water to cast, and again to pull' },
  'hellfire-rod': { name: 'Hellfire Rod', kind: 'tool', colour: '#c2543a', rod: true,
    text: 'The only rod that survives lava' },
  junk: { name: 'Old Boot', kind: 'loot', colour: '#6a5b52' },
  slag: { name: 'Lump of Slag', kind: 'loot', colour: '#5f4038' },

  // Fish. Where you caught one says where you have been, which is most of why there
  // are this many of them.
  bass: { name: 'Bass', kind: 'loot', colour: '#7f8f6a' },
  goldfish: { name: 'Goldfish', kind: 'loot', colour: '#e0a63c' },
  trout: { name: 'Trout', kind: 'loot', colour: '#9fb0c0' },
  icepike: { name: 'Ice Pike', kind: 'loot', colour: '#bfe8f0' },
  perch: { name: 'Perch', kind: 'loot', colour: '#c0a060' },
  piranha: { name: 'Piranha', kind: 'loot', colour: '#c0523f' },
  oasiscarp: { name: 'Oasis Carp', kind: 'loot', colour: '#d8b06a' },
  shrimp: { name: 'Shrimp', kind: 'loot', colour: '#e49a86' },
  swordfish: { name: 'Swordfish', kind: 'loot', colour: '#5f7f9f' },
  rotgill: { name: 'Rotgill', kind: 'loot', colour: '#8a6f9f' },
  cavefish: { name: 'Cave Fish', kind: 'loot', colour: '#8a8f9a' },
  glowfish: { name: 'Glowfish', kind: 'loot', colour: '#9fe8d0' },
  mudeel: { name: 'Mud Eel', kind: 'loot', colour: '#6a5a3a' },
  frostminnow: { name: 'Frost Minnow', kind: 'loot', colour: '#cfe4f0' },
  shadowcarp: { name: 'Shadow Carp', kind: 'loot', colour: '#6a4f8a' },
  deepshrimp: { name: 'Deep Shrimp', kind: 'loot', colour: '#c07a86' },
  flarefin: { name: 'Flarefin', kind: 'loot', colour: '#e2743a' },
  obsidifish: { name: 'Obsidifish', kind: 'loot', colour: '#3a3042' },
  magmasnail: { name: 'Magma Snail', kind: 'loot', colour: '#d2502a' },

  // Crates. Each kind comes out of one kind of place and holds what that place is
  // worth, which is the reason to fish somewhere particular rather than anywhere.
  crate: { name: 'Sealed Crate', kind: 'use', colour: '#8a6038', use: { open: 'crate' },
    text: 'Open it and see' },
  oceancrate: { name: 'Ocean Crate', kind: 'use', colour: '#3f86c4', use: { open: 'oceancrate' },
    text: 'Pulled from deep salt water' },
  junglecrate: { name: 'Jungle Crate', kind: 'use', colour: '#3f8a3a', use: { open: 'junglecrate' },
    text: 'Pulled from a jungle pool' },
  frozencrate: { name: 'Frozen Crate', kind: 'use', colour: '#8fc8e6', use: { open: 'frozencrate' },
    text: 'Pulled from freezing water' },
  stonecrate: { name: 'Stone Crate', kind: 'use', colour: '#8e949e', use: { open: 'stonecrate' },
    text: 'Pulled from a flooded cavern' },
  hellcrate: { name: 'Hellforged Crate', kind: 'use', colour: '#c2543a', use: { open: 'hellcrate' },
    text: 'Pulled out of lava' },

  'cooked-fish': { name: 'Cooked Fish', kind: 'use', colour: '#d8a06a',
    use: { heal: 45 }, text: 'Restores 45 health' },
  'seared-fish': { name: 'Seared Fish', kind: 'use', colour: '#e2743a',
    use: { heal: 110 }, text: 'Restores 110 health' },

  // Grappling hooks. A hook is a tool rather than a weapon: it is fired with its own
  // key, it does no damage, and what it changes is where you can go. `range` is how far
  // the head flies before giving up, `speed` how fast it flies, and `pull` how hard the
  // rope reels you in once it has bitten.
  grapple: { name: 'Grappling Hook', kind: 'tool', colour: '#9aa3ad',
    grapple: { range: 18, speed: 46, pull: 16 }, text: 'Fire with G' },
  'crystal-hook': { name: 'Crystal Hook', kind: 'tool', colour: '#8fa8ff',
    grapple: { range: 30, speed: 62, pull: 22 }, text: 'Fire with G. Longer, faster' },

  // A bottle, and the potions made in one. A potion is a `use` item like any other; what
  // makes it a potion is that what it does is give a buff, which expires.
  bottle: { name: 'Bottle', kind: 'use', colour: '#bcd4e0', use: { buff: null },
    text: 'Empty. Fill it with something.' },

  'swift-potion': { name: 'Swiftness Potion', kind: 'use', colour: '#8fd1e8', use: { buff: 'swiftness' } },
  'ironskin-potion': { name: 'Ironskin Potion', kind: 'use', colour: '#a8a29b', use: { buff: 'ironskin' } },
  'regen-potion': { name: 'Regeneration Potion', kind: 'use', colour: '#e05c6a', use: { buff: 'regeneration' } },
  'gills-potion': { name: 'Gills Potion', kind: 'use', colour: '#4f9fd8', use: { buff: 'gills' } },
  'spelunk-potion': { name: 'Spelunking Potion', kind: 'use', colour: '#c9a542', use: { buff: 'spelunking' } },
  'shine-potion': { name: 'Shine Potion', kind: 'use', colour: '#ffd79a', use: { buff: 'shine' } },
  'archery-potion': { name: 'Archery Potion', kind: 'use', colour: '#8a6038', use: { buff: 'archery' } },
  'rage-potion': { name: 'Rage Potion', kind: 'use', colour: '#c0472f', use: { buff: 'rage' } },
  'clarity-potion': { name: 'Clarity Potion', kind: 'use', colour: '#7f8fe8', use: { buff: 'clarity' } },
  'feather-potion': { name: 'Feather Fall Potion', kind: 'use', colour: '#d8d2c2', use: { buff: 'featherfall' } },

  'shade-fang': { name: 'Shade Fang', kind: 'loot', colour: '#a68ab5' },
  'spore-crown-fragment': { name: 'Spore Crown Fragment', kind: 'loot', colour: '#9a7cb4' },
  'spore-idol': { name: 'Spore Idol', kind: 'use', colour: '#9a7cb4', use: { summon: 'sporecrown', layer: 'surface', biome: 'blight' }, text: 'Summon in the Blight' },
  'hollowroot-knot': { name: 'Hollowroot Knot', kind: 'loot', colour: '#9e719f' },
  'hollowroot-sigil': { name: 'Hollowroot Sigil', kind: 'use', colour: '#9e719f', use: { summon: 'hollowroot', layer: 'deep', biome: 'blight' }, text: 'Summon in the Blight' },
  'vein-fang': { name: 'Vein Fang', kind: 'loot', colour: '#bf8186' },
  'bloodcrest-plume': { name: 'Bloodcrest Plume', kind: 'loot', colour: '#be756a' },
  'bloodcrest-lure': { name: 'Bloodcrest Lure', kind: 'use', colour: '#be756a', use: { summon: 'bloodcrest', layer: 'surface', biome: 'crimson' }, text: 'Summon in the Crimson' },
  'veinward-core': { name: 'Veinward Core', kind: 'loot', colour: '#a75760' },
  'vein-seal': { name: 'Vein Seal', kind: 'use', colour: '#a75760', use: { summon: 'veinwarden', layer: 'deep', biome: 'crimson' }, text: 'Summon in the Crimson' },
  'barnacle-fang': { name: 'Barnacle Fang', kind: 'loot', colour: '#7a9ea0' },
  'reef-fin': { name: 'Reef Fin', kind: 'loot', colour: '#69a5ad' },
  'reef-conch': { name: 'Reef Conch', kind: 'use', colour: '#69a5ad', use: { summon: 'reefleviathan', layer: 'surface', biome: 'ocean' }, text: 'Summon in the Ocean' },
  'abyssal-pearl': { name: 'Abyssal Pearl', kind: 'loot', colour: '#6284ac' },
  'abyssal-signal': { name: 'Abyssal Signal', kind: 'use', colour: '#6284ac', use: { summon: 'abyssaleye', layer: 'deep', biome: 'ocean' }, text: 'Summon in the Ocean' },
  'copper-coin': { name: 'Copper Coin', kind: 'coin', colour: '#c98762', text: 'Worth 1 copper' },
  'silver-coin': { name: 'Silver Coin', kind: 'coin', colour: '#bcc9d6', text: 'Worth 100 copper' },
  'gold-coin': { name: 'Gold Coin', kind: 'coin', colour: '#f1c35b', text: 'Worth 10,000 copper' },
  'platinum-coin': { name: 'Platinum Coin', kind: 'coin', colour: '#bde6e7', text: 'Worth 1,000,000 copper' },
  'onyx-coin': { name: 'Onyx Coin', kind: 'coin', colour: '#746685', text: 'Worth 100,000,000 copper' },
  'prism-sigil': { name: 'Prism Sigil', kind: 'use', colour: '#e6b4f2',
    use: { summon: 'prismsentinel', layer: 'sky' }, text: 'Summon among the sky islands' },
  'prism-heart': { name: 'Prism Heart', kind: 'loot', colour: '#e6b4f2' },
  'driftlock-fang': { name: 'Driftlock Fang', kind: 'loot', colour: '#a9b89e' },
  'breakwater-claw': { name: 'Breakwater Claw', kind: 'loot', colour: '#c68d66' },
  'breakwater-shell': { name: 'Breakwater Shell', kind: 'use', colour: '#c68d66', use: { summon: 'breakwatercrab', layer: 'surface', biome: 'beach' }, text: 'Summon in the Shore' },
  'saltmarrow-bone': { name: 'Saltmarrow Bone', kind: 'loot', colour: '#a5b8ae' },
  'saltmarrow-token': { name: 'Saltmarrow Token', kind: 'use', colour: '#a5b8ae', use: { summon: 'saltmarrow', layer: 'deep', biome: 'beach' }, text: 'Summon in the Shore' },
  'chalklock-fang': { name: 'Chalklock Fang', kind: 'loot', colour: '#c0b69e' },
  'windmill-gear': { name: 'Windmill Gear', kind: 'loot', colour: '#bba782' },
  'standard-thread': { name: 'Standard Thread', kind: 'loot', colour: '#a2b7cd' },
  'windmill-token': { name: 'Windmill Token', kind: 'use', colour: '#bba782',
    use: { summon: 'windmillwarden', layer: 'surface', biome: 'plains' }, text: 'Summon on the Plains surface' },
  'standard-pennant': { name: 'Standard Pennant', kind: 'use', colour: '#a2b7cd',
    use: { summon: 'buriedstandard', layer: 'deep', biome: 'plains' }, text: 'Summon in the deep Plains' },
  'pitchlock-fang': { name: 'Pitchlock Fang', kind: 'loot', colour: '#b1aa84' },
  'pinemaw-claw': { name: 'Pinemaw Claw', kind: 'loot', colour: '#b09a72' },
  'winterroot-core': { name: 'Winterroot Core', kind: 'loot', colour: '#a4c8cc' },
  'pine-totem': { name: 'Pine Totem', kind: 'use', colour: '#b09a72',
    use: { summon: 'pinemaw', layer: 'surface', biome: 'taiga' }, text: 'Summon on the Taiga surface' },
  'winterroot-bell': { name: 'Winterroot Bell', kind: 'use', colour: '#a4c8cc',
    use: { summon: 'winterroot', layer: 'deep', biome: 'taiga' }, text: 'Summon in the deep Taiga' },
  'gilt-fang': { name: 'Gilt Fang', kind: 'loot', colour: '#c2a566' },
  'sunmane-tuft': { name: 'Sunmane Tuft', kind: 'loot', colour: '#cc9b61' },
  'sun-carat': { name: 'Sun Carat', kind: 'loot', colour: '#e3bd70' },
  'sunmane-idol': { name: 'Sunmane Idol', kind: 'use', colour: '#cc9b61',
    use: { summon: 'sunmane', layer: 'surface', biome: 'savanna' }, text: 'Summon on the Savanna surface' },
  'sun-court-seal': { name: 'Sun Court Seal', kind: 'use', colour: '#e3bd70',
    use: { summon: 'sunscarab', layer: 'deep', biome: 'savanna' }, text: 'Summon in the deep Savanna' },
  'ochre-fang': { name: 'Ochre Fang', kind: 'loot', colour: '#c99766' },
  'behemoth-core': { name: 'Behemoth Core', kind: 'loot', colour: '#b6795b' },
  'ochre-scale': { name: 'Ochre Scale', kind: 'loot', colour: '#c99766' },
  'clay-effigy': { name: 'Clay Effigy', kind: 'use', colour: '#b6795b',
    use: { summon: 'claybehemoth', layer: 'surface', biome: 'badlands' }, text: 'Summon on the Badlands surface' },
  'ochre-sigil': { name: 'Ochre Sigil', kind: 'use', colour: '#c99766',
    use: { summon: 'ochredrake', layer: 'deep', biome: 'badlands' }, text: 'Summon in the deep Badlands' },
  'cairn-fang': { name: 'Cairn Fang', kind: 'loot', colour: '#b6acd0' },
  'cragbreaker-horn': { name: 'Cragbreaker Horn', kind: 'loot', colour: '#a99c84' },
  'cairn-echo': { name: 'Cairn Echo', kind: 'loot', colour: '#b6acd0' },
  'crag-totem': { name: 'Crag Totem', kind: 'use', colour: '#a99c84',
    use: { summon: 'cragbreaker', layer: 'surface', biome: 'highlands' }, text: 'Summon on the Highlands surface' },
  'cairn-bell': { name: 'Cairn Bell', kind: 'use', colour: '#b6acd0',
    use: { summon: 'cairnshade', layer: 'deep', biome: 'highlands' }, text: 'Summon in the deep Highlands' },
  'siltbound-fang': { name: 'Siltbound Fang', kind: 'loot', colour: '#a69a75' },
  'reed-crown': { name: 'Reed Crown', kind: 'loot', colour: '#a2ad70' },
  'blackfen-silk': { name: 'Blackfen Silk', kind: 'loot', colour: '#b38eaf' },
  'reed-sigil': { name: 'Reed Sigil', kind: 'use', colour: '#a2ad70',
    use: { summon: 'reedking', layer: 'surface', biome: 'marsh' }, text: 'Summon on the Mire surface' },
  'blackfen-spool': { name: 'Blackfen Spool', kind: 'use', colour: '#b38eaf',
    use: { summon: 'fenwidow', layer: 'deep', biome: 'marsh' }, text: 'Summon in the deep Mire' },
  'vinebound-fang': { name: 'Vinebound Fang', kind: 'loot', colour: '#a6b87e' },
  'orchid-stinger': { name: 'Orchid Stinger', kind: 'loot', colour: '#e3ac72' },
  'amberroot-heart': { name: 'Amberroot Heart', kind: 'loot', colour: '#bf925c' },
  'orchid-lure': { name: 'Orchid Lure', kind: 'use', colour: '#e3ac72',
    use: { summon: 'orchidqueen', layer: 'surface', biome: 'jungle' }, text: 'Summon on the Jungle surface' },
  'amberroot-idol': { name: 'Amberroot Idol', kind: 'use', colour: '#bf925c',
    use: { summon: 'amberroot', layer: 'deep', biome: 'jungle' }, text: 'Summon in the deep Jungle' },
  'rime-fang': { name: 'Rime Fang', kind: 'loot', colour: '#a8d7e0' },
  'rimehorn-shard': { name: 'Rimehorn Shard', kind: 'loot', colour: '#b1d9e6' },
  'aurora-thread': { name: 'Aurora Thread', kind: 'loot', colour: '#b7a4e8' },
  'rime-horn': { name: 'Rime Horn', kind: 'use', colour: '#b1d9e6',
    use: { summon: 'rimehorn', layer: 'surface', biome: 'tundra' }, text: 'Summon on the Tundra surface' },
  'aurora-lantern': { name: 'Aurora Lantern', kind: 'use', colour: '#b7a4e8',
    use: { summon: 'aurorawraith', layer: 'deep', biome: 'tundra' }, text: 'Summon in the deep Tundra' },
  'dune-fang': { name: 'Dune Fang', kind: 'loot', colour: '#d9be89' },
  'storm-plume': { name: 'Storm Plume', kind: 'loot', colour: '#e6bf69' },
  'scourge-scale': { name: 'Scourge Scale', kind: 'loot', colour: '#cd9b63' },
  'storm-feather': { name: 'Storm Feather', kind: 'use', colour: '#e6bf69',
    use: { summon: 'thunderbird', layer: 'surface', biome: 'desert' }, text: 'Summon on the Desert surface' },
  'desert-medallion': { name: 'Desert Medallion', kind: 'use', colour: '#cd9b63',
    use: { summon: 'desertscourge', layer: 'caves', biome: 'desert' }, text: 'Summon in the Underground Desert' },
  'mimic-tooth': { name: 'Mimic Tooth', kind: 'loot', colour: '#ecd9a9' },
  'briar-heart': { name: 'Briar Heart', kind: 'loot', colour: '#b2a75a' },
  'rootcrown-core': { name: 'Root Crown Core', kind: 'loot', colour: '#a6806f' },
  'briar-idol': { name: 'Briar Idol', kind: 'use', colour: '#989454',
    use: { summon: 'briarwarden', layer: 'surface', biome: 'forest' }, text: 'Summon in the surface Forest' },
  'rootcrown-idol': { name: 'Root Crown Idol', kind: 'use', colour: '#a6806f',
    use: { summon: 'rootcrown', layer: 'deep', biome: 'forest' }, text: 'Summon in the deep Forest' },
  'aetherite-bar': { name: 'Aetherite Bar', kind: 'bar', colour: '#8de8d3' },
  'rift-core': { name: 'Rift Core', kind: 'loot', colour: '#b493e9' },
  'mire-pearl': { name: 'Mire Pearl', kind: 'loot', colour: '#80bd8c' },
  'granite-eye': { name: 'Granite Eye', kind: 'loot', colour: '#9fb1c5' },
  'mire-idol': { name: 'Mire Idol', kind: 'use', colour: '#76a76a',
    use: { summon: 'mirebrood', layer: 'caves' }, text: 'Summon the Mire Broodmother in the Caves' },
  'granite-idol': { name: 'Granite Idol', kind: 'use', colour: '#839bc2',
    use: { summon: 'granitecolossus', layer: 'deep' }, text: 'Summon the Granite Colossus in the Deep Caverns' },
  'rift-sigil': { name: 'Rift Sigil', kind: 'use', colour: '#b493e9',
    use: { summon: 'riftarchon', layer: 'void' }, text: 'Summon the Rift Archon in the Void' },
  'ashvault-key': { name: 'Ashvault Key', kind: 'use', colour: '#dda677' },
  'siege-core': { name: 'Astral Siege Core', kind: 'loot', colour: '#a7bdf0' },
  'astral-standard': { name: 'Astral Standard', kind: 'use', colour: '#a7bdf0',
    use: { summon: 'astralregent', siege: true, layer: 'space' }, text: 'Raise it on the middle Astral Siege platform' },
  'railbreaker-drive': { name: 'Railbreaker Drive', kind: 'loot', colour: '#d4a478' },
  'railbreaker-whistle': { name: 'Railbreaker Whistle', kind: 'use', colour: '#c29177',
    use: { summon: 'railbreaker', runawayMine: true }, text: 'Use below the flooded spur in the Runaway Mine' },
  'cargo-cart': { name: 'Cargo Cart', kind: 'loot', colour: '#a6a2b0',
    text: 'Use on rail, then use again to open your cargo hold.' },
  'archivist-core': { name: 'Archivist Core', kind: 'loot', colour: '#95d3d9' },
  'tide-seal': { name: 'Tide Seal', kind: 'use', colour: '#83bfd3',
    use: { summon: 'drownedarchivist', archive: true }, text: 'Use below the Tidal Archive floodgate' },
  'lens-vault-core': { name: 'Lens Vault Core', kind: 'loot', colour: '#b9dcf4' },
  'lens-sigil': { name: 'Lens Sigil', kind: 'use', colour: '#bdabed',
    use: { summon: 'lenscustodian', lensVault: true }, text: 'Use beyond the Lens Vault beam gate' },
  'foundry-prism': { name: 'Foundry Prism', kind: 'loot', colour: '#bcb4ef' },
  'warden-igniter': { name: 'Warden Igniter', kind: 'use', colour: '#e3a4ce',
    use: { summon: 'foundrywarden', foundry: true }, text: 'Use on the Foundry arena beyond the landing pads' },
  'wyvern-essence': { name: 'Wyvern Essence', kind: 'loot', colour: '#a7dff6',
    text: 'Dropped by wild wyverns in Space. Used to craft wings.' },
  'starwyvern-plume': { name: 'Star Wyvern Plume', kind: 'loot', colour: '#c0b4ff' },
  'starcall-horn': { name: 'Starcall Horn', kind: 'use', colour: '#b8b0ec',
    use: { summon: 'starwyvern', layer: 'space' }, text: 'Sound the horn in Space above the sky islands' },
  'colossus-core': { name: 'Colossus Core', kind: 'loot', colour: '#91d9d7' },
  'serpent-core': { name: 'Serpent Core', kind: 'loot', colour: '#d5a26a' },
  'zenith-core': { name: 'Zenith Core', kind: 'loot', colour: '#c596e8' },
  'glass-effigy': { name: 'Glass Effigy', kind: 'use', colour: '#91d9d7',
    use: { summon: 'glasscolossus' }, text: 'Summon the Glass Colossus on open ground' },
  'induction-coil': { name: 'Induction Coil', kind: 'use', colour: '#d5a26a',
    use: { summon: 'coilserpent' }, text: 'Summon the Coil Serpent in a wide arena' },
  'zenith-beacon': { name: 'Zenith Beacon', kind: 'use', colour: '#c596e8',
    use: { summon: 'zenithengine' }, text: 'Summon the Zenith Engine with room overhead' },
  'mechanist-core': { name: 'Mechanist Core', kind: 'loot', colour: '#be99ec' },
  'mechanist-key': { name: 'Mechanist Armory Key', kind: 'loot', colour: '#a4b8ef' },
  'clockwork-heart': { name: 'Clockwork Heart', kind: 'use', colour: '#c185d4',
    use: { summon: 'ossuarymechanist', lowerOssuary: true }, text: 'Use in the lower Ossuary arena' },
  'dungeon-key': { name: 'Gilded Ossuary Key', kind: 'loot', colour: '#dbbb6d' },
  'bone-toll': { name: 'Bone Clapper', kind: 'use', colour: '#d4ccb3',
    use: { summon: 'dungeonkeeper', night: true, dungeon: true }, text: 'Ring the Ossuary Bell at night' },
  'vault-relic': { name: 'Vault Relic', kind: 'loot', colour: '#b891c2' },
  'guardian-seal': { name: 'Guardian Seal', kind: 'loot', colour: '#e6b09e' },
  'void-heart': { name: 'Void Heart', kind: 'loot', colour: '#9973d7' },
  'guardian-effigy': { name: 'Guardian Effigy', kind: 'use', colour: '#a27483',
    use: { summon: 'ashguardian', layer: 'trench', vault: true }, text: 'Summon inside an Ashvault' },
  'void-beacon': { name: 'Void Beacon', kind: 'use', colour: '#9d85d2',
    use: { summon: 'voidsovereign', layer: 'void' }, text: 'Summon the Void Sovereign in the Void' },
  'furnace-core': { name: 'Furnace Core', kind: 'loot', colour: '#f28e59' },
  'cinder-idol': { name: 'Cinder Idol', kind: 'use', colour: '#bd624e',
    use: { summon: 'furnacewarden', layer: 'hell' }, text: 'Summons the Furnace Warden in Hell' },
  // A summon. Used where you stand, like everything else of kind `use`, and what it does
  // is put something in the world that will not leave until one of you is dead.
  slimecrown: { name: 'Slime Crown', kind: 'use', colour: '#e0c054',
    use: { summon: 'kingslime' }, text: 'Summons the King Slime' },
  bloodshotlens: { name: 'Bloodshot Lens', kind: 'use', colour: '#b4484f',
    use: { summon: 'hollloweye', night: true }, text: 'Summons the Hollow Eye. Use it at night.' }
};

// Armour. Four pieces rather than Terraria's three, because boots were asked for. Every
// two points of defence take one off an incoming hit, to a floor of one, so armour never
// makes you untouchable.
//
// Generated per metal rather than written out, for the same reason the wood sets are: six
// tiers times four pieces is twenty-four entries that must all agree.
const ARMOUR_TIERS = [
  ...HARDMODE_METALS.map(m => ({ key: m.key, name: m.name, colour: m.colour,
    base: m.defense, bar: m.key + '-bar', cost: 26, bonus: m.bonus })),
  { key: 'prism', name: 'Prismweave', colour: '#d4a5ef', base: 24, bar: null,
    craft: [['mythril-bar', 6], ['ward-crystal', 3]], station: 'anvil',
    bonus: { key: 'refraction', name: 'Refraction', text: 'Magic damage +18% and 15% lower mana costs',
      magic: 1.18, manaCost: 0.85 } },

  { key: 'wood', name: 'Wooden', colour: '#8a6038', base: 2, bar: null, cost: null,
    bonus: { key: 'scavenger', name: 'Scavenger', text: 'Dropped items fly to you from further away', pickup: 2.4 } },
  { key: 'tin', name: 'Tin', colour: '#b3b1a6', base: 3, bar: 'tin-bar', cost: 16,
    bonus: { key: 'tinker', name: 'Tinker', text: 'Tools swing 10% faster', swing: 0.9 } },
  { key: 'copper', name: 'Copper', colour: '#c07a42', base: 4, bar: 'copper-bar', cost: 20,
    bonus: { key: 'prospector', name: 'Prospector', text: 'Mining power +10%', power: 1.1 } },
  { key: 'iron', name: 'Iron', colour: '#a8a29b', base: 6, bar: 'iron-bar', cost: 24,
    bonus: { key: 'ironclad', name: 'Ironclad', text: 'Defence +4', defense: 4 } },
  { key: 'silver', name: 'Silver', colour: '#cdd2dc', base: 8, bar: 'silver-bar', cost: 26,
    bonus: { key: 'quicksilver', name: 'Quicksilver', text: 'Move 15% faster', speed: 1.15 } },
  { key: 'gold', name: 'Gold', colour: '#e0c054', base: 10, bar: 'gold-bar', cost: 28,
    bonus: { key: 'gilded', name: 'Gilded', text: 'Health regenerates twice as fast', regen: 2 } },
  { key: 'cobalt', name: 'Cobalt', colour: '#3f7fb5', base: 13, bar: 'cobalt-bar', cost: 30,
    bonus: { key: 'deepdiver', name: 'Deep Diver', text: 'Breathe underwater indefinitely', breath: true } },
  { key: 'emberite', name: 'Emberite', colour: '#d4663a', base: 17, bar: 'emberite-bar', cost: 34,
    bonus: { key: 'emberheart', name: 'Emberheart', text: 'Lava does not burn you', fireproof: true } },

  { key: 'aetherite', name: 'Aetherite', colour: '#8de8d3', base: 22, bar: 'aetherite-bar', cost: 24,
    bonus: { key: 'skyforged', name: 'Skyforged', text: 'Double jump, take 65% less fall damage, and emit light',
      doubleJump: true, fallMul: 0.35, glow: 5 } },

  // Three sets that are not metal. Metal armour is a ladder - each tier is strictly
  // better than the last - and a ladder has no room for a choice. These trade defence
  // for a class: they are weaker than the metal of their depth and they are the only way
  // to make one kind of weapon hit harder, so wearing one is a decision about how you
  // intend to fight rather than about how deep you have been.
  //
  // `craft` replaces bar/cost: the per-piece recipe, scaled by the piece's share.
  { key: 'apprentice', name: 'Apprentice', colour: '#6a5aa8', base: 3, bar: null, cost: null,
    labels: ['Hat', 'Robe', 'Trousers', 'Slippers'], station: 'workbench',
    craft: [['leather', 6], ['amethyst', 3]],
    bonus: { key: 'apprentice', name: 'Apprentice', text: 'Magic costs 20% less mana', manaCost: 0.8 } },
  { key: 'adept', name: 'Adept', colour: '#3f6ac0', base: 7, bar: null, cost: null,
    labels: ['Hood', 'Robe', 'Trousers', 'Slippers'], station: 'anvil',
    craft: [['sapphire', 4], ['emerald', 3], ['silver-bar', 4]],
    bonus: { key: 'adept', name: 'Adept', text: 'Magic hits 25% harder', magic: 1.25 } },
  { key: 'bone', name: 'Bone', colour: '#d8d2bf', base: 6, bar: null, cost: null,
    labels: ['Skull', 'Ribs', 'Greaves', 'Boots'], station: 'anvil',
    craft: [['bone', 10], ['leather', 4]],
    bonus: { key: 'marksman', name: 'Marksman', text: 'Arrows hit 25% harder', ranged: 1.25 } },
  { key: 'meteor', name: 'Meteor', colour: '#a06a5c', base: 11, bar: null, cost: null,
    labels: ['Helm', 'Suit', 'Leggings', 'Boots'], station: 'anvil',
    craft: [['meteor-bar', 9]],
    bonus: { key: 'meteoric', name: 'Meteoric', text: 'Magic costs 40% less mana', manaCost: 0.6 } },
  { key: 'brigand', name: 'Brigand', colour: '#7a5a3a', base: 6, bar: null, cost: null,
    labels: ['Cowl', 'Jerkin', 'Breeches', 'Boots'], station: 'anvil',
    craft: [['leather', 8], ['chitin', 6], ['iron-bar', 3]],
    bonus: { key: 'brawler', name: 'Brawler', text: 'Melee hits 25% harder', melee: 1.25 } }
];

const HUNTER_GEAR_ROLES = [
  ['melee', 'Vanguard', '#c3896d', 1, 'meleeReach', 0.5, 'melee reach'],
  ['ranged', 'Sharpshooter', '#a0bf76', 0.87, 'arrowSpeed', 1.1, 'projectile speed'],
  ['magic', 'Spellbinder', '#a796da', 0.74, 'manaCost', 0.9, 'mana cost'],
  ['summoner', 'Spiritkeeper', '#82c9c3', 0.78, 'spiritInterval', 0.9, 'spirit attack interval'],
  ['thrower', 'Skirmisher', '#ddb67a', 0.85, 'throwBlast', 1.18, 'blast radius']
];

for (const [stage, name, base, metal, power, materials] of [
  ['trail', 'Trail', 5, 'copper-bar', 1.10, ['chitin', 'feather', 'lens', 'gel', 'leather']],
  ['cinder', 'Cinder', 15, 'emberite-bar', 1.13, ['bone', 'cinder', 'cinder', 'gel', 'cinder']],
  ['rift', 'Rift', 25, 'mythril-bar', 1.16, ['bone', 'feather', 'stardust', 'stardust', 'cinder']],
  ['astral', 'Astral', 45, 'eventide-bar', 1.19, ['wyvern-essence', 'stardust', 'stardust', 'wyvern-essence', 'stardust']]
]) {
  HUNTER_GEAR_ROLES.forEach(([role, title, colour, defense, field, value, effect], index) => {
    const key = 'hunt-' + stage + '-' + role;
    const detail = field === 'meleeReach' ? '+0.5 tiles ' + effect
      : (value > 1 ? '+' : '') + Math.round((value - 1) * 100) + '% ' + effect;
    ARMOUR_TIERS.push({ key, name: name + ' ' + title, colour, base: Math.round(base * defense),
      craft: [[materials[index], ['wyvern-essence', 'lens'].includes(materials[index]) ? 3 : 6], [metal, 4]],
      station: 'anvil',
      bonus: { key, name: title, text: '+' + Math.round((power - 1) * 100) + '% ' + role + ' damage, ' + detail,
        [role]: power, [field]: value } });
  });
}

// Each piece carries a share of the tier's defence: the breastplate most, the boots least.
const ARMOUR_PIECES = [
  { slot: 'head', suffix: 'helmet', label: 'Helm', share: 0.9, woodCost: 20 },
  { slot: 'chest', suffix: 'chest', label: 'Mail', share: 1.3, woodCost: 30 },
  { slot: 'legs', suffix: 'legs', label: 'Greaves', share: 1.0, woodCost: 25 },
  { slot: 'feet', suffix: 'boots', label: 'Boots', share: 0.6, woodCost: 15 }
];

const ARMOUR = {};
for (const tier of ARMOUR_TIERS) {
  for (const piece of ARMOUR_PIECES) {
    const labels = tier.labels || ARMOUR_PIECES.map(p => p.label);
    ARMOUR[tier.key + '-' + piece.suffix] = {
      name: tier.name + ' ' + labels[ARMOUR_PIECES.indexOf(piece)],
      slot: piece.slot,
      defense: Math.max(1, Math.round(tier.base * piece.share)),
      colour: tier.colour,
      tier: tier.key
    };
  }
}

const ARMORY_SET_BONUSES = new Map();
for (const chapter of CRAFT_TILES.ARMORY_CHAPTERS) {
  for (const [style, role, multiplier] of [
    ['melee', 'Vanguard', 1.18], ['ranged', 'Marksman', 1.20], ['magic', 'Arcanist', 1.22]
  ]) {
    const tier = chapter.key + '-' + style;
    const name = chapter.material + ' ' + role;
    ARMORY_SET_BONUSES.set(tier, { key: tier, name,
      text: '+' + Math.round((multiplier - 1) * 100) + '% ' + style + ' damage',
      [style]: multiplier });
    for (const piece of ARMOUR_PIECES) {
      ARMOUR[tier + '-' + piece.suffix] = { name: name + ' ' + piece.label,
        slot: piece.slot, tier, colour: chapter.colour,
        defense: Math.max(1, Math.round(chapter.defense * piece.share
          * (style === 'melee' ? 1 : style === 'ranged' ? 0.85 : 0.72))) };
    }
  }
}

// Wearing all four pieces of one metal grants that metal's bonus. A set bonus is what
// makes a complete suit worth the detour rather than four separate upgrades.
function setBonusFor(worn) {
  const tiers = worn.filter(Boolean).map(key => ARMOUR[key] && ARMOUR[key].tier);
  if (tiers.length !== 4 || tiers.some(t => !t || t !== tiers[0])) return null;
  const tier = ARMOUR_TIERS.find(t => t.key === tiers[0]);
  return tier?.bonus || ARMORY_SET_BONUSES.get(tiers[0]) || null;
}

// Accessories. The slots have been there since the inventory was built and nothing has
// ever filled them; each of these changes one number the player can feel.
const ACCESSORIES = {
  'wyvern-wings': { name: 'Wyvern Wings', colour: '#9dd7ee', flight: 1.15, fallMul: 0,
    text: 'Hold Jump to fly and glide. Negates fall damage.' },
  'starweave-wings': { name: 'Starweave Wings', colour: '#c2a8ff', flight: 1.7, fallMul: 0, glow: 4,
    text: 'Hold Jump to fly and glide. Negates fall damage.' },
  'triune-emblem': { name: 'Triune Emblem', colour: '#d6b9e8',
    text: 'Defence +9 and all weapon damage +10%', effect: { defense: 9, melee: 1.1, ranged: 1.1, magic: 1.1 } },
  'beach-clasp': { name: 'Shore Clasp', colour: '#a9b89e', text: 'Move 8% faster and pick up items from farther away', speed: 1.08, pickup: 1.4 },
  'breakwater-band': { name: 'Breakwater Band', colour: '#c68d66', text: 'Defence +5 and breath lasts twice as long', defense: 5, breathMul: 2 },
  'saltmarrow-charm': { name: 'Saltmarrow Charm', colour: '#a5b8ae', text: 'Health regenerates 25% faster and take 20% less fall damage', regen: 1.25, fallMul: 0.8 },
  'blight-clasp': { name: 'Blight Clasp', colour: '#a68ab5', text: 'Move 8% faster and pick up items from farther away', speed: 1.08, pickup: 1.4 },
  'spore-band': { name: 'Spore Band', colour: '#9a7cb4', text: 'Magic damage +12% and emits light', magic: 1.12, glow: 4 },
  'hollowroot-wrap': { name: 'Hollowroot Wrap', colour: '#9e719f', text: 'Defence +7 and health regenerates 20% faster', defense: 7, regen: 1.2 },
  'crimson-clasp': { name: 'Crimson Clasp', colour: '#bf8186', text: 'Move 8% faster and pick up items from farther away', speed: 1.08, pickup: 1.4 },
  'bloodcrest-quiver': { name: 'Bloodcrest Quiver', colour: '#be756a', text: 'Arrows deal 13% more damage and travel 20% faster', ranged: 1.13, arrowSpeed: 1.2 },
  'veinward-aegis': { name: 'Veinward Aegis', colour: '#a75760', text: 'Defence +8 and melee damage +10%', defense: 8, melee: 1.1 },
  'ocean-clasp': { name: 'Ocean Clasp', colour: '#7a9ea0', text: 'Move 8% faster and pick up items from farther away', speed: 1.08, pickup: 1.4 },
  'reef-talisman': { name: 'Reef Talisman', colour: '#69a5ad', text: 'Breath lasts three times as long and defence +4', breathMul: 3, defense: 4 },
  'abyssal-focus': { name: 'Abyssal Focus', colour: '#6284ac', text: 'Mana regenerates 25% faster and emits light', manaRegen: 1.25, glow: 6 },
  'windmill-brace': { name: 'Windmill Brace', colour: '#bba782', text: 'Defence +4 and tools swing 10% faster', defense: 4, swing: 0.9 },
  'standard-sash': { name: 'Standard Sash', colour: '#a2b7cd', text: 'Arrows deal 12% more damage and defence +5', ranged: 1.12, defense: 5 },
  'chalklock-clasp': { name: 'Chalklock Clasp', colour: '#c0b69e', text: 'Pick up items from farther away and move 8% faster', pickup: 1.45, speed: 1.08 },
  'pinemaw-grip': { name: 'Pinemaw Grip', colour: '#b09a72', text: 'Melee damage +12% and tools swing 8% faster', melee: 1.12, swing: 0.92 },
  'winterroot-band': { name: 'Winterroot Band', colour: '#a4c8cc', text: 'Defence +7 and health regenerates 20% faster', defense: 7, regen: 1.2 },
  'pitchlock-clasp': { name: 'Pitchlock Clasp', colour: '#b1aa84', text: 'Take 20% less fall damage and pick up items from farther away', fallMul: 0.8, pickup: 1.4 },
  'sunmane-sash': { name: 'Sunmane Sash', colour: '#cc9b61', text: 'Move 12% faster and melee damage +10%', speed: 1.12, melee: 1.1 },
  'sun-court-ring': { name: 'Sun Court Ring', colour: '#e3bd70', text: 'Defence +7 and mana regenerates 25% faster', defense: 7, manaRegen: 1.25 },
  'gilt-clasp': { name: 'Gilt Clasp', colour: '#c2a566', text: 'Pick up items from farther away and emit light', pickup: 1.55, glow: 3 },
  'clayguard': { name: 'Clayguard', colour: '#b6795b', text: 'Defence +7 and mining power +8%', defense: 7, power: 1.08 },
  'drake-scale': { name: 'Drake Scale', colour: '#c99766', text: 'Melee damage +14% and 25% less lava damage', melee: 1.14, lavaDamage: 0.75 },
  'ochre-clasp': { name: 'Ochre Clasp', colour: '#c99766', text: 'Move 10% faster and defence +4', speed: 1.1, defense: 4 },
  'crag-belt': { name: 'Crag Belt', colour: '#a99c84', text: 'Defence +6 and take 30% less fall damage', defense: 6, fallMul: 0.7 },
  'cairn-chime': { name: 'Cairn Chime', colour: '#b6acd0', text: 'Magic damage +12% and mana regenerates 20% faster', magic: 1.12, manaRegen: 1.2 },
  'cairn-clasp': { name: 'Cairn Clasp', colour: '#b6acd0', text: 'Defence +4 and pick up items from farther away', defense: 4, pickup: 1.4 },
  'reed-circlet': { name: 'Reed Circlet', colour: '#a2ad70', text: 'Health regenerates 25% faster and breath lasts twice as long', regen: 1.25, breathMul: 2 },
  'blackfen-wrap': { name: 'Blackfen Wrap', colour: '#b38eaf', text: 'Magic costs 15% less mana and defence +5', manaCost: 0.85, defense: 5 },
  'siltbound-clasp': { name: 'Siltbound Clasp', colour: '#a69a75', text: 'Move 10% faster and pick up items from farther away', speed: 1.1, pickup: 1.35 },

  'orchid-quiver': { name: 'Orchid Quiver', colour: '#e3ac72', text: 'Arrows deal 14% more damage and move 20% faster', ranged: 1.14, arrowSpeed: 1.2 },
  'amberroot-bulwark': { name: 'Amberroot Bulwark', colour: '#bf925c', text: 'Defence +8 and health regenerates 25% faster', defense: 8, regen: 1.25 },
  'vinebound-clasp': { name: 'Vinebound Clasp', colour: '#a6b87e', text: 'Move 10% faster and take 25% less fall damage', speed: 1.1, fallMul: 0.75 },

  'rimeguard': { name: 'Rimeguard', colour: '#b1d9e6', text: 'Defence +6 and 20% less fall damage', defense: 6, fallMul: 0.8 },
  'aurora-veil': { name: 'Aurora Veil', colour: '#b7a4e8', text: 'Magic damage +15% and emits light', magic: 1.15, glow: 4 },
  'glacier-clasp': { name: 'Glacier Clasp', colour: '#a8d7e0', text: 'Move 12% faster and defence +3', speed: 1.12, defense: 3 },

  'storm-crest': { name: 'Storm Crest', colour: '#e6bf69', text: 'Arrows deal 12% more damage and move 25% faster', ranged: 1.12, arrowSpeed: 1.25 },
  'scourge-guard': { name: 'Scourge Guard', colour: '#cd9b63', text: 'Defence +6 and mining power +8%', defense: 6, power: 1.08 },
  'dune-clasp': { name: 'Dune Clasp', colour: '#d9be89', text: 'Move 10% faster and pick up items from farther away', speed: 1.10, pickup: 1.35 },

  'briar-brooch': { name: 'Briar Brooch', colour: '#b2a75a', text: 'Defence +4 and health regenerates 25% faster', defense: 4, regen: 1.25 },
  'rootcrown-ring': { name: 'Root Crown Ring', colour: '#a6806f', text: 'Melee damage +15% and defence +5', melee: 1.15, defense: 5 },
  'mimic-clasp': { name: 'Mimic Clasp', colour: '#ecd9a9', text: 'Pick up items from farther away', pickup: 1.65 },

  'mire-talisman': { name: 'Mire Talisman', colour: '#80bd8c', text: 'Health regenerates 20% faster and breath lasts twice as long', regen: 1.2, breathMul: 2 },
  'granite-aegis': { name: 'Granite Aegis', colour: '#9fb1c5', text: 'Defence +7 and take 25% less fall damage', defense: 7, fallMul: 0.75 },
  'aetherstep': { name: 'Aetherstep', colour: '#8de8d3', text: 'Double jump, move 20% faster, and take half fall damage', doubleJump: true, speed: 1.2, fallMul: 0.5 },

  'sovereign-mantle': { name: 'Sovereign Mantle', colour: '#a994e4',
    text: 'Defence +12, move 12% faster, and emit light', defense: 12, speed: 1.12, glow: 7 },

  'trail-buckle': { name: 'Trail Buckle', colour: '#bd955f', text: 'Move 8% faster and take 20% less fall damage', speed: 1.08, fallMul: 0.8 },
  'tidal-locket': { name: 'Tidal Locket', colour: '#62b9c6', text: 'Breath lasts twice as long and defence +3', breathMul: 2, defense: 3 },
  'prism-brooch': { name: 'Prism Brooch', colour: '#b28ddd', text: 'Mana regenerates 25% faster and gives off light', manaRegen: 1.25, glow: 3 },
  'forge-gauntlet': { name: 'Forge Gauntlet', colour: '#e18359', text: 'Melee damage +12% and lava damage reduced by 20%', melee: 1.12, lavaDamage: 0.8 },
  'cloud-charm': { name: 'Cloud Charm', colour: '#dfe7f2', text: 'Jump a second time in mid-air', doubleJump: true },
  'diving-gear': { name: 'Diving Gear', colour: '#4f9fd8', text: 'Breath lasts three times as long', breathMul: 3 },
  'feather-fall': { name: 'Feather Charm', colour: '#d8d2c2', text: 'Falls hurt far less', fallMul: 0.25 },
  'miners-charm': { name: "Miner's Charm", colour: '#c9a542', text: 'Mining power +15%', power: 1.15 },
  'swift-boots': { name: 'Swift Boots', colour: '#b5733c', text: 'Move 20% faster', speed: 1.2 },
  'shellguard': { name: 'Shellguard', colour: '#e8d8c6', text: 'Defence +5', defense: 5 },
  'obsidian-charm': { name: 'Obsidian Charm', colour: '#534263',
    text: 'Lava damage reduced by 45%', lavaDamage: 0.55 },
  'warden-heart': { name: 'Warden Heart', colour: '#f28e59',
    text: 'Health regenerates 40% faster and defence +4', regen: 1.4, defense: 4 },
  'ember-ward': { name: 'Ember Ward', colour: '#d2622f', text: 'Lava does not burn you', fireproof: true },
  'lantern-charm': { name: 'Glowstone Charm', colour: '#ffd79a', text: 'You give off light', glow: 9 },

  // One for each way of fighting. These are the reason a class is a choice rather than
  // a label: the weapon decides what you swing, the accessories decide whether it was
  // worth specialising.
  'mana-flower': { name: 'Mana Flower', colour: '#7f8fe8', text: 'Magic costs 15% less mana', manaCost: 0.85 },
  'focus-crystal': { name: 'Focus Crystal', colour: '#cfe8f0', text: 'Magic hits 15% harder', magic: 1.15 },
  'arcane-band': { name: 'Arcane Band', colour: '#9b59d0', text: 'Mana returns twice as fast', manaRegen: 2 },
  quiver: { name: 'Quiver', colour: '#8a6038', text: 'Arrows hit 15% harder', ranged: 1.15 },
  'scout-lens': { name: 'Scout Lens', colour: '#9fd4e8', text: 'Arrows fly faster and further', arrowSpeed: 1.45 },
  'brawler-band': { name: 'Brawler Band', colour: '#b5783e', text: 'Melee hits 15% harder', melee: 1.15 },
  'iron-grip': { name: 'Iron Grip', colour: '#a8a29b', text: 'Everything swings 15% faster', swing: 0.85 },

  // Dropped, never crafted. Each comes off one kind of thing, so the way to get one is
  // to go where that thing lives and kill it - which is what makes a roster of enemies
  // into a map of what is worth hunting.
  'night-eye': { name: 'Eye of Night', colour: '#b4484f', text: 'You give off a dim red light', glow: 7, drop: 'demoneye' },
  'jelly-amulet': { name: 'Jelly Amulet', colour: '#d472a8', text: 'Mana returns 60% faster', manaRegen: 1.6, drop: 'jellyfish' },
  'star-cloak': { name: 'Star Cloak', colour: '#8f9ce8', text: 'Magic costs 20% less and you glow', manaCost: 0.8, glow: 6, drop: 'starjelly' },
  'talon-band': { name: 'Talon Band', colour: '#6b5a44', text: 'Arrows hit 12% harder and fly further', ranged: 1.12, arrowSpeed: 1.2, drop: 'vulture' },
  'fang-pendant': { name: 'Fang Pendant', colour: '#7b8792', text: 'Melee hits 12% harder', melee: 1.12, drop: 'shark' },
  'bat-wing': { name: "Bat's Wing", colour: '#6a5b52', text: 'Falls hurt far less and you jump again in the air', fallMul: 0.3, doubleJump: true, drop: 'giantbat' },
  'obsidian-shield': { name: 'Obsidian Shield', colour: '#2e2838', text: 'Defence +8, and lava does not burn you', defense: 8, fireproof: true, drop: 'obsidianhusk' },
  'stinger-brooch': { name: 'Stinger Brooch', colour: '#e0c050', text: 'Move 12% faster and swing 10% faster', speed: 1.12, swing: 0.9, drop: 'hornet' },
  'blood-charm': { name: 'Blood Charm', colour: '#8e3a3a', text: 'Defence +4, and health returns 60% faster', defense: 4, regen: 1.6, drop: 'bloodzombie' },
  'demon-heart': { name: 'Demon Heart', colour: '#9c3f6a', text: 'Magic hits 18% harder', magic: 1.18, drop: 'demon' },

  // The king's. Not rare drops but certain ones: beating a boss gives you both, because
  // a fight you have to prepare for should not then also be a lottery.
  'royal-gel': { name: 'Royal Gel', colour: '#8fd98f', text: 'Slimes no longer attack you', slimeFriend: true, drop: 'kingslime' },
  'hollow-lens': { name: 'Hollow Lens', colour: '#b4484f', text: 'Arrows hit 15% harder and fly much faster', ranged: 1.15, arrowSpeed: 1.5, drop: 'hollloweye' },
  'seers-eye': { name: "Seer's Eye", colour: '#d8b0b4', text: 'Magic hits 10% harder, and you see in the dark', magic: 1.1, glow: 10, drop: 'hollloweye' },
  'kings-crown': { name: "King's Crown", colour: '#e0c054', text: 'Everything you do hits 12% harder', melee: 1.12, ranged: 1.12, magic: 1.12, drop: 'kingslime' }
};

// Every effect the worn equipment adds up to. One function, so the game never has to
// remember which piece grants what.
// How each effect field combines. Written once, as a table, because it was written three
// times - for accessories, for set bonuses, and nearly for buffs - and the three had
// quietly drifted apart: a set bonus carrying `arrowSpeed` or `slimeFriend` did nothing
// at all, and so did an accessory carrying `pickup`. Nobody would have noticed until
// somebody wore the thing and it had no effect.
const EFFECT_FIELDS = {
  defense: 'add',
  speed: 'mul', power: 'mul', swing: 'mul', regen: 'mul', pickup: 'mul',
  breathMul: 'mul', fallMul: 'mul', lavaDamage: 'mul',
  melee: 'mul', ranged: 'mul', magic: 'mul', summoner: 'mul', thrower: 'mul',
  meleeReach: 'add', spiritReach: 'add', spiritInterval: 'mul', throwBlast: 'mul', throwSpeed: 'mul', fishingPower: 'mul',
  manaCost: 'mul', manaRegen: 'mul', arrowSpeed: 'mul',
  glow: 'max', flight: 'max', flightBonus: 'add',
  doubleJump: 'flag', fireproof: 'flag', slimeFriend: 'flag'
};

function baseEffects() {
  const out = { bonus: null };
  for (const [field, how] of Object.entries(EFFECT_FIELDS)) {
    out[field] = how === 'mul' ? 1 : (how === 'flag' ? false : 0);
  }
  return out;
}

// Fold one modifier - an accessory, a set bonus, a buff - into an effects object.
function applyEffect(out, mod) {
  if (!mod) return out;
  for (const [field, how] of Object.entries(EFFECT_FIELDS)) {
    const value = mod[field];
    if (value === undefined) continue;
    if (how === 'add') out[field] += value;
    else if (how === 'mul') out[field] *= value;
    else if (how === 'max') out[field] = Math.max(out[field], value);
    else if (value) out[field] = true;
  }
  // `breath` is a word rather than a number: it means the limit goes away entirely.
  if (mod.breath) out.breathMul = Infinity;
  return out;
}

function equipEffects(wornArmour, wornAccessories, buffEffects) {
  const out = baseEffects();
  for (const key of wornArmour) {
    const piece = key && ARMOUR[key];
    if (piece) out.defense += piece.defense;
  }
  for (const key of wornAccessories) applyEffect(out, key && ACCESSORIES[key]);
  const bonus = setBonusFor(wornArmour);
  if (bonus) {
    out.bonus = bonus;
    applyEffect(out, bonus);
  }
  // Buffs are the same kind of thing as everything else here: a bag of modifiers that
  // happens to expire.
  for (const mod of buffEffects || []) applyEffect(out, mod);
  return out;
}


// Weapons. Separate from pickaxes: a pickaxe can be swung at an enemy and will hurt it,
// but badly, which is the whole reason to make a sword.
const WEAPONS = {
  'iron-musket': { name: 'Iron Musket', damage: 28, useTime: 0.42, reach: 47, ranged: true, ammo: 'bullet' },
  'prism-lance': { name: 'Prism Lance', damage: 132, useTime: 0.34, reach: 48, magic: true,
    mana: 15, bolt: '#ffd6a1', spell: 'pierce' },
  'storm-conduit': { name: 'Storm Conduit', damage: 115, useTime: 0.37, reach: 44, magic: true,
    mana: 18, bolt: '#8bd4ea', spell: 'chain' },
  'ward-scepter': { name: 'Ward Scepter', damage: 103, useTime: 0.36, reach: 42, magic: true,
    mana: 17, bolt: '#d4a5ef', spell: 'ward' },

  'tin-sword': { name: 'Tin Sword', damage: 13, useTime: 0.32, reach: 2.7 },
  // A bow is a weapon that spends ammunition and reaches across the screen, so its
  // "reach" is the arrow's range rather than an arm's length.
  'wood-bow': { name: 'Wooden Bow', damage: 9, useTime: 0.42, reach: 26, ranged: true, ammo: 'arrow' },
  'wood-sword': { name: 'Wooden Sword', damage: 11, useTime: 0.34, reach: 2.6 },
  'copper-sword': { name: 'Copper Sword', damage: 16, useTime: 0.31, reach: 2.8 },
  'iron-sword': { name: 'Iron Sword', damage: 24, useTime: 0.28, reach: 3.0 },
  'silver-sword': { name: 'Silver Sword', damage: 32, useTime: 0.26, reach: 3.1 },
  'gold-sword': { name: 'Gold Sword', damage: 41, useTime: 0.24, reach: 3.2 },
  'cobalt-sword': { name: 'Cobalt Sword', damage: 58, useTime: 0.21, reach: 3.4 },
  'emberite-sword': { name: 'Emberite Sword', damage: 78, useTime: 0.18, reach: 3.6 },

  // --- ranged ---------------------------------------------------------------------
  // A bow's `reach` is the arrow's range rather than an arm's length. Better bows throw
  // the same arrow harder and further, and better arrows are worth carrying for any bow.
  'tin-bow': { name: 'Tin Bow', damage: 12, useTime: 0.40, reach: 28, ranged: true, ammo: 'arrow' },
  'meteor-bow': { name: 'Meteor Bow', damage: 39, useTime: 0.25, reach: 42, ranged: true, ammo: 'arrow' },
  'aetherite-bow': { name: 'Aetherite Bow', damage: 98, useTime: 0.18, reach: 58, ranged: true, ammo: 'arrow' },
  'copper-bow': { name: 'Copper Bow', damage: 14, useTime: 0.38, reach: 30, ranged: true, ammo: 'arrow' },
  'iron-bow': { name: 'Iron Bow', damage: 19, useTime: 0.35, reach: 34, ranged: true, ammo: 'arrow' },
  'bone-bow': { name: 'Bone Bow', damage: 24, useTime: 0.3, reach: 36, ranged: true, ammo: 'arrow' },
  'silver-bow': { name: 'Silver Bow', damage: 28, useTime: 0.3, reach: 38, ranged: true, ammo: 'arrow' },
  'gold-bow': { name: 'Gold Bow', damage: 35, useTime: 0.27, reach: 40, ranged: true, ammo: 'arrow' },
  'cobalt-bow': { name: 'Cobalt Bow', damage: 48, useTime: 0.23, reach: 44, ranged: true, ammo: 'arrow' },
  'vault-bow': { name: 'Vault Bow', damage: 78, useTime: 0.21, reach: 53, ranged: true, ammo: 'arrow' },
  'aether-sabre': { name: 'Aether Sabre', damage: 118, useTime: 0.20, reach: 4.4 },
  'refracted-maul': { name: 'Repulsing Shatter Maul', damage: 221, useTime: 0.34, reach: 4.7,
    cleave: true, knockback: 2.4, colour: '#b5a1ef' },
  'refracted-repeater': { name: 'Piercing Induction Repeater', damage: 176, useTime: 0.21, reach: 68, ranged: true,
    ammo: 'bullet', pierce: 5, colour: '#a9caf8' },
  'refracted-focus': { name: 'Chaining Zenith Focus', damage: 189, useTime: 0.29, reach: 50, magic: true,
    mana: 17, spell: 'chain', bolt: '#a6c3f0' },
  'shatter-maul': { name: 'Shatter Maul', damage: 232, useTime: 0.34, reach: 4.7, cleave: true, colour: '#91d9d7' },
  'induction-repeater': { name: 'Induction Repeater', damage: 178, useTime: 0.21, reach: 65, ranged: true,
    ammo: 'bullet', pierce: true, colour: '#d5a26a' },
  'zenith-focus': { name: 'Zenith Focus', damage: 192, useTime: 0.29, reach: 50, magic: true,
    mana: 17, spell: 'ward', bolt: '#c596e8' },
  'relay-cleaver': { name: 'Relay Cleaver', damage: 196, useTime: 0.28, reach: 4.6, cleave: true, colour: '#d694e0' },
  'coil-carbine': { name: 'Coil Carbine', damage: 159, useTime: 0.23, reach: 64, ranged: true, ammo: 'bullet', pierce: true, colour: '#8ebbe7' },
  'lattice-scepter': { name: 'Lattice Scepter', damage: 173, useTime: 0.28, reach: 48,
    magic: true, mana: 17, spell: 'chain', bolt: '#aeb9ff' },
  'ossuary-sabre': { name: 'Graveglass Sabre', damage: 56, useTime: 0.23, reach: 3.7, colour: '#9fcde4' },
  'ossuary-bow': { name: 'Cryptstring Bow', damage: 43, useTime: 0.23, reach: 46, ranged: true, ammo: 'arrow', colour: '#91abbf' },
  'ossuary-staff': { name: 'Pale Lantern', damage: 52, useTime: 0.29, reach: 43, magic: true, mana: 8, bolt: '#a1d3e9' },
  'ashblade': { name: 'Ashblade', damage: 91, useTime: 0.22, reach: 3.9 },
  'relic-staff': { name: 'Relic Staff', damage: 92, useTime: 0.27, reach: 46, magic: true, mana: 12, bolt: '#cb9deb' },
  'emberite-bow': { name: 'Emberite Bow', damage: 64, useTime: 0.2, reach: 48, ranged: true, ammo: 'arrow' },
  'talon-sling': { name: 'Talon Sling', damage: 21, useTime: 0.22, reach: 32, ranged: true, ammo: 'arrow', drop: 'harpy' },

  // --- magic -----------------------------------------------------------------------
  // A staff spends mana instead of ammunition and throws a bolt that ignores gravity and
  // lights what it passes. That is the whole trade: magic costs a pool that refills by
  // itself, so it never runs out and never fires as fast as you would like.
  'amethyst-staff': { name: 'Amethyst Staff', damage: 17, useTime: 0.42, reach: 26, magic: true, mana: 6, bolt: '#9b59d0' },
  'topaz-staff': { name: 'Topaz Staff', damage: 22, useTime: 0.4, reach: 28, magic: true, mana: 7, bolt: '#e0a63c' },
  'sapphire-staff': { name: 'Sapphire Staff', damage: 28, useTime: 0.38, reach: 30, magic: true, mana: 8, bolt: '#3f7fd8' },
  'emerald-staff': { name: 'Emerald Staff', damage: 35, useTime: 0.36, reach: 32, magic: true, mana: 10, bolt: '#3fb56a' },
  'ruby-staff': { name: 'Ruby Staff', damage: 44, useTime: 0.34, reach: 34, magic: true, mana: 12, bolt: '#d8344c' },
  'diamond-staff': { name: 'Diamond Staff', damage: 57, useTime: 0.3, reach: 38, magic: true, mana: 14, bolt: '#bfe8f0' },
  'furnace-lance': { name: 'Furnace Lance', damage: 64, useTime: 0.31, reach: 5.1 },
  'cinder-scepter': { name: 'Cinder Scepter', damage: 66, useTime: 0.29, reach: 37, magic: true, mana: 12, bolt: '#ff995a' },
  'meteor-blaster': { name: 'Meteor Blaster', damage: 40, useTime: 0.14, reach: 34, magic: true, mana: 7, bolt: '#ffb05a' },
  'imp-staff': { name: 'Imp Staff', damage: 50, useTime: 0.26, reach: 30, magic: true, mana: 9, bolt: '#e2743a', drop: 'fireimp' },

  // --- dropped melee ------------------------------------------------------------------
  'meteor-sword': { name: 'Meteor Sword', damage: 52, useTime: 0.22, reach: 3.3 },
  'shark-fang': { name: 'Shark Fang', damage: 34, useTime: 0.2, reach: 2.9, drop: 'shark' },
  'hornet-lance': { name: 'Hornet Lance', damage: 30, useTime: 0.34, reach: 4.4, drop: 'hornet' },
  'stone-fist': { name: 'Stone Fist', damage: 62, useTime: 0.46, reach: 3.4, drop: 'rockgolem' },
  'bone-flail': { name: 'Bone Flail', damage: 40, useTime: 0.38, reach: 4.0, drop: 'armouredskeleton' }
};

for (const metal of HARDMODE_METALS) {
  ITEMS[metal.key + '-bar'] = { name: metal.name + ' Bar', kind: 'bar', colour: metal.colour };
  WEAPONS[metal.key + '-sword'] = { name: metal.name + ' Sword', damage: metal.damage, useTime: 0.19, reach: 4.5 };
  WEAPONS[metal.key + '-bow'] = { name: metal.name + ' Bow', damage: metal.damage - 30,
    useTime: 0.18, reach: 60, ranged: true, ammo: 'arrow' };
  WEAPONS[metal.key + '-rifle'] = { name: metal.name + ' Rifle', damage: metal.damage - 18,
    useTime: 0.22, reach: 62, ranged: true, ammo: 'bullet', colour: metal.colour };
  WEAPONS[metal.key + '-staff'] = { name: metal.name + ' Staff',
    damage: metal.damage - 32, useTime: 0.28, reach: 56, magic: true,
    mana: 18, spell: metal.spell, bolt: metal.colour };
}

// Ammunition. A bow fires whatever is best in the backpack rather than whatever slot is
// selected, which is Terraria's rule and spares the player a second hotbar.
const AMMO = {
  arrow: { bonus: 0, colour: '#b9a271', speed: 1 },
  'iron-arrow': { bonus: 7, colour: '#9aa0a8', speed: 1.1 },
  'ember-arrow': { bonus: 14, colour: '#e2743a', speed: 1.15, burns: true }
};

const AMMO_METALS = [
  ['tin', 'Tin', '#b3b1a6', 3], ['copper', 'Copper', '#c07a42', 5], ['iron', 'Iron', '#a8a29b', 7],
  ['silver', 'Silver', '#cdd2dc', 9], ['gold', 'Gold', '#e0c054', 12], ['cobalt', 'Cobalt', '#3f7fb5', 15],
  ['emberite', 'Emberite', '#d4663a', 18], ['meteor', 'Meteor', '#a06a5c', 13], ['aetherite', 'Aetherite', '#8de8d3', 22],
  ...HARDMODE_METALS.map((m, i) => [m.key, m.name, m.colour, 26 + i * 5])
];
for (const [metal, name, colour, bonus] of AMMO_METALS) {
  for (const family of ['arrow', 'bullet']) {
    const key = metal + '-' + family;
    if (AMMO[key]) continue;
    ITEMS[key] = { name: name + ' ' + (family === 'arrow' ? 'Arrow' : 'Bullet'), kind: 'ammo', colour };
    AMMO[key] = { family, bonus, colour, speed: family === 'bullet' ? 1.8 : 1.12 };
  }
}
ITEMS.bullet = { name: 'Bullet', kind: 'ammo', colour: '#a8a29b' };
AMMO.bullet = { family: 'bullet', bonus: 0, colour: '#a8a29b', speed: 1.75 };

// The best ammunition held, by the damage it adds. `countOf` is passed in rather than an
// inventory, so this is a pure function of what is carried.
function bestAmmo(countOf, family = 'arrow', preferred = []) {
  for (const key of preferred) {
    if (AMMO[key] && (AMMO[key].family || 'arrow') === family && countOf(key)) return key;
  }
  let best = null;
  for (const [key, spec] of Object.entries(AMMO)) {
    if ((spec.family || 'arrow') !== family || !countOf(key)) continue;
    if (!best || spec.bonus > AMMO[best].bonus) best = key;
  }
  return best;
}

// The hook a held item fires, if it fires one. Read off the item rather than stored on
// the player, so swapping hooks mid-swing simply changes the next shot.
function grappleOf(item) {
  const spec = item && ITEMS[item.key];
  return spec && spec.grapple ? spec.grapple : null;
}

// What an item is, in words, for the tooltip. A stat the player cannot see is a stat
// that does not exist: by this point the game has four armour sets whose whole purpose is
// a number, and two dozen accessories that each change one, and none of it was legible.
//
// It lives here rather than in the interface because what an item does is a fact about
// the item, and because a function that returns lines of text can be tested and a panel
// of DOM cannot.
function describe(key, tilesModule) {
  const lines = [];
  const kind = kindOf(key);
  const weapon = WEAPONS[key];
  if (weapon) {
    const cls = classOf(weapon);
    lines.push(cls === 'thrower' ? 'Thrower weapon' : cls === 'summoner' ? 'Summoner weapon' : cls === 'magic' ? 'Magic weapon'
      : (cls === 'ranged' ? 'Ranged weapon' : 'Melee weapon'));
    lines.push(weapon.damage + ' damage');
    if (weapon.throwStyle) lines.push('Reusable · no ammunition', {
      returning: 'Returns to you and can hit again on the way back',
      fan: 'Throws three blades in a fan',
      blast: 'Bursts on impact without damaging terrain',
      pierce: 'Javelin pierces up to three enemies'
    }[weapon.throwStyle]);
    if (weapon.summon) lines.push('Click to call a spirit. It fights while this focus is held.',
      'Spirit attack · ' + weapon.summon);
    if (weapon.signature) lines.push(COMBAT_SIGNATURES[weapon.signature]);
    if (weapon.rhythm) {
      lines.push('Attack rhythm · ' + weapon.rhythm.join(' → '));
      for (const beat of weapon.rhythm) lines.push(beat + ' · ' + COMBAT_BEATS[beat][1]);
    }
    if (weapon.summon) lines.push('Click an enemy to direct the spirit’s attacks');
    if (weapon.scatter) lines.push('Fires five close-range pellets for one bullet');
    if (weapon.volley) lines.push('Fires a three-shot fan for one round of ammo');
    lines.push(weapon.useTime.toFixed(2) + 's per swing');
    if (cls === 'melee') lines.push(weapon.reach.toFixed(1) + ' tiles of reach');
    else lines.push(weapon.reach + ' tiles of range');
    if (weapon.mana) lines.push(weapon.mana + ' mana a shot');
    if (weapon.ammo) lines.push('Fires the best ' + weapon.ammo + ' you carry');
    if (weapon.spell === 'pierce' || weapon.pierce) lines.push('Pierces up to ' + (Number(weapon.pierce) > 1 ? weapon.pierce : 3) + ' enemies');
    if (weapon.knockback) lines.push('Knockback ×' + weapon.knockback);
    if (weapon.cleave) lines.push('Also hits enemies within three tiles of the target');
    if (weapon.spell === 'chain') lines.push('Arcs to up to two nearby enemies');
    if (weapon.spell === 'ward') lines.push('Casting grants +14 defence for four seconds');
    if (weapon.armory) lines.push(weapon.armory + ' · Only dropped or found in caches');
    else if (weapon.drop) lines.push('Only dropped, never made');
    return { name: nameOf(key, tilesModule), kind, lines };
  }
  const ammo = AMMO[key];
  if (ammo) {
    lines.push('+' + ammo.bonus + ' damage');
    if (ammo.pierce) lines.push('Penetrates up to ' + ammo.pierce + ' targets');
    if (ammo.shove) lines.push('Heavy knockback on impact');
    if (ammo.burns) lines.push('Sears nearby enemies on impact');
    return { name: nameOf(key, tilesModule), kind, lines };
  }
  const armour = ARMOUR[key];
  if (armour) {
    const tier = ARMOUR_TIERS.find(t => t.key === armour.tier);
    lines.push('Armour, worn on the ' + armour.slot);
    lines.push(armour.defense + ' defence');
    const bonus = tier?.bonus || ARMORY_SET_BONUSES.get(armour.tier);
    if (bonus) lines.push('Full set: ' + bonus.text);
    return { name: nameOf(key, tilesModule), kind, lines };
  }
  const acc = ACCESSORIES[key];
  if (acc) {
    lines.push('Accessory');
    if (acc.text) lines.push(acc.text);
    if (acc.effectLines) lines.push(...acc.effectLines);
    if (acc.flight) lines.push(acc.flight + 's of flight per takeoff');
    if (acc.drop) lines.push('Only dropped, never made');
    return { name: nameOf(key, tilesModule), kind, lines };
  }
  const item = ITEMS[key];
  if (item && item.rod) {
    const rod = (typeof require === 'function')
      ? require('./fishing.js').RODS[key]
      : (typeof RODS === 'undefined' ? null : RODS[key]);
    lines.push(rod && rod.lava ? 'Fishing rod, and lavaproof' : 'Fishing rod');
    if (rod) lines.push('Power ' + rod.power.toFixed(2));
    lines.push('Right click at liquid to cast, and again when it dips');
    return { name: nameOf(key, tilesModule), kind, lines };
  }
  if (item && item.use && item.use.open) {
    lines.push('Used where you stand');
    if (item.text) lines.push(item.text);
    lines.push('Open it and see what is inside');
    return { name: nameOf(key, tilesModule), kind, lines };
  }
  if (item && item.grapple) {
    lines.push('Grappling hook');
    lines.push(item.grapple.range + ' tiles of rope');
    lines.push('Press G to fire, G again to let go');
    return { name: nameOf(key, tilesModule), kind, lines };
  }
  if (item && item.use) {
    lines.push('Used where you stand');
    const buffKey = item.use.meal ? 'meal-' + item.use.meal : item.use.buff;
    if (buffKey) {
      const table = (typeof require === 'function')
        ? require('./buffs.js').BUFFS
        : (typeof BUFFS === 'undefined' ? {} : BUFFS);
      const buff = table[buffKey];
      if (buff) {
        lines.push(buff.text);
        const seconds = Math.round(buff.seconds * (item.use.duration || 1));
        lines.push('Lasts ' + Math.floor(seconds / 60) + 'm ' + seconds % 60 + 's');
      }
    }
    if (item.text) lines.push(item.text);
    return { name: nameOf(key, tilesModule), kind, lines };
  }
  if (AMMO[key]) {
    lines.push('Ammunition');
    lines.push(AMMO[key].bonus > 0 ? '+' + AMMO[key].bonus + ' damage' : 'The plain sort');
    return { name: nameOf(key, tilesModule), kind, lines };
  }
  const tool = CRAFT_TOOLS[key];
  if (tool) {
    lines.push(tool.job === 'axe' ? 'Axe' : (tool.job === 'hammer' ? 'Hammer' : 'Pickaxe'));
    lines.push('Power ' + tool.power);
    lines.push(tool.useTime.toFixed(2) + 's per swing');
    return { name: nameOf(key, tilesModule), kind, lines };
  }
  // Walls are the background layer: they are what is left behind when a block is mined
  // out, and what stops enemies spawning in a room you built.
  const wallSpec = CRAFT_WALLS[key];
  if (wallSpec) {
    lines.push('Background wall');
    lines.push('Stops things spawning in the room behind it');
    return { name: nameOf(key, tilesModule), kind, lines };
  }
  const tile = tilesModule && tilesModule.BY_KEY[key];
  if (tile) {
    if (tile.climb) lines.push('Climb it with jump and crouch');
    else if (tile.station) lines.push('Crafting station: ' + tile.station);
    else if (tile.solid) lines.push('A block you can place');
    else lines.push('Placed, but nothing stands on it');
    if (tile.emit) lines.push('Gives off light');
    if (tile.require) lines.push('Needs a pickaxe of power ' + tile.require);
    return { name: nameOf(key, tilesModule), kind, lines };
  }
  if (item) {
    lines.push(kind === 'bar' ? 'A bar, for making things'
      : (kind === 'coin' ? 'Spend it with a villager' : 'A material'));
    return { name: nameOf(key, tilesModule), kind, lines };
  }
  return { name: nameOf(key, tilesModule), kind, lines };
}

const ARMORY_HANDLING = {
  melee: [
    [0.75, 0.19, 3.1, {}], [0.91, 0.31, 4.6, { cleave: true }],
    [1.27, 0.49, 3.8, { cleave: true, knockback: 2.4 }],
    [0.88, 0.24, 3.6, {}], [1.12, 0.33, 3.0, { knockback: 1.8 }]
  ],
  ranged: [
    [0.63, 0.23, 32, { ammo: 'arrow' }], [1.03, 0.43, 55, { ammo: 'arrow', pierce: 2 }],
    [0.78, 0.28, 44, { ammo: 'bullet' }], [1.23, 0.52, 67, { ammo: 'bullet', pierce: 3 }],
    [0.51, 0.15, 39, { ammo: 'bullet' }]
  ],
  magic: [
    [0.68, 0.24, 36, { mana: 4 }], [1.16, 0.43, 55, { mana: 9, spell: 'pierce' }],
    [0.83, 0.38, 44, { mana: 10, spell: 'chain' }], [0.79, 0.45, 39, { mana: 11, spell: 'ward' }],
    [1.35, 0.55, 43, { mana: 13 }]
  ]
};
for (const chapter of CRAFT_TILES.ARMORY_CHAPTERS) {
  for (const [style, forms] of Object.entries(CRAFT_TILES.ARMORY_FORMS)) {
    forms.forEach((form, i) => {
      const [scale, useTime, reach, traits] = ARMORY_HANDLING[style][i];
      WEAPONS[chapter.key + '-' + form] = {
        name: chapter.material + ' ' + form[0].toUpperCase() + form.slice(1),
        damage: Math.round(chapter.power * scale), useTime, reach, ...traits,
        colour: chapter.colour, bolt: chapter.colour, armory: chapter.name,
        ranged: style === 'ranged', magic: style === 'magic',
        drop: chapter.key + (i === 4 ? '-roamer' : '-warden')
      };
    });
  }
}

// Which class a weapon belongs to, which decides which multiplier it is scaled by. Read
// off the weapon rather than stored on it, so a new weapon cannot forget to declare one.
function classOf(weapon) {
  if (!weapon) return 'melee';
  if (weapon.throwStyle) return 'thrower';
  if (weapon.summon) return 'summoner';
  if (weapon.magic) return 'magic';
  if (weapon.ranged) return 'ranged';
  return 'melee';
}

// Everything that is only ever dropped, never crafted: the roster of what is worth
// hunting. Derived rather than listed, so an item cannot be in one place and not the
// other.
function dropOnly() {
  const out = [];
  for (const [key, w] of Object.entries(WEAPONS)) if (w.drop) out.push({ key, from: w.drop, kind: 'tool' });
  for (const [key, a] of Object.entries(ACCESSORIES)) if (a.drop) out.push({ key, from: a.drop, kind: 'accessory' });
  return out;
}

// out: what you get. need: what it costs. station: null means by hand, anywhere.
// A need key starting with '#' is a tag: '#wood' is any species' wood.
const RECIPES = [
  { out: { key: 'astral-standard', kind: 'use', count: 1 },
    need: [['wyvern-essence', 5], ['adamantite-bar', 6], ['stardust', 12]], station: 'refraction-bench' },
  { out: { key: 'railbreaker-whistle', kind: 'use', count: 1 },
    need: [['iron-bar', 6], ['wire-spool', 8], ['emberite-bar', 2]], station: 'anvil' },
  { out: { key: 'cargo-cart', kind: 'loot', count: 1 },
    need: [['minecart', 1], ['iron-bar', 6], ['#wood', 10]], station: 'railworks-bench' },
  { out: { key: 'tide-seal', kind: 'use', count: 1 },
    need: [['shell', 12], ['mythril-bar', 5], ['storm-crystal', 4]], station: 'optics-bench' },
  { out: { key: 'lens-sigil', kind: 'use', count: 1 },
    need: [['ward-crystal', 4], ['adamantite-bar', 4], ['wire-spool', 8]], station: 'signal-bench' },
  { out: { key: 'warden-igniter', kind: 'use', count: 1 },
    need: [['wyvern-essence', 6], ['adamantite-bar', 4], ['stardust', 5]], station: 'anvil' },
  { out: { key: 'refracted-maul', kind: 'tool', count: 1 },
    need: [['shatter-maul', 1], ['ward-crystal', 4]], station: 'refraction-bench' },
  { out: { key: 'refracted-repeater', kind: 'tool', count: 1 },
    need: [['induction-repeater', 1], ['ray-crystal', 4]], station: 'refraction-bench' },
  { out: { key: 'refracted-focus', kind: 'tool', count: 1 },
    need: [['zenith-focus', 1], ['storm-crystal', 4]], station: 'refraction-bench' },
  { out: { key: 'starcall-horn', kind: 'use', count: 1 },
    need: [['aetherite-bar', 5], ['stardust', 12], ['adamantite-bar', 4]], station: 'anvil' },
  { out: { key: 'wyvern-wings', kind: 'accessory', count: 1 },
    need: [['wyvern-essence', 14], ['feather', 12], ['aetherite-bar', 5]], station: 'anvil' },
  { out: { key: 'starweave-wings', kind: 'accessory', count: 1 },
    need: [['wyvern-wings', 1], ['wyvern-essence', 12], ['starwyvern-plume', 1], ['stardust', 8]], station: 'anvil' },
  ...[
    ['glass-effigy', 'ray-crystal'], ['induction-coil', 'storm-crystal'], ['zenith-beacon', 'ward-crystal']
  ].map(([key, crystal]) => ({ out: { key, kind: 'use', count: 1 },
    need: [['adamantite-bar', 3], ['mythril-bar', 2], ['palladium-bar', 2], [crystal, 3]], station: 'anvil' })),
  { out: { key: 'shatter-maul', kind: 'tool', count: 1 },
    need: [['colossus-core', 1], ['adamantite-bar', 8]], station: 'anvil' },
  { out: { key: 'induction-repeater', kind: 'tool', count: 1 },
    need: [['serpent-core', 1], ['adamantite-bar', 8]], station: 'anvil' },
  { out: { key: 'zenith-focus', kind: 'tool', count: 1 },
    need: [['zenith-core', 1], ['adamantite-bar', 8]], station: 'anvil' },
  { out: { key: 'triune-emblem', kind: 'accessory', count: 1 },
    need: [['colossus-core', 1], ['serpent-core', 1], ['zenith-core', 1]], station: 'anvil' },
  { out: { key: 'clockwork-heart', kind: 'use', count: 1 },
    need: [['palladium-bar', 3], ['wire-spool', 10], ['bone', 8]], station: 'heavy-workbench' },
  { out: { key: 'bone-toll', kind: 'use', count: 1 }, need: [['bone', 8], ['iron-bar', 3]], station: 'anvil' },
  // Torches are the one thing you must be able to make before anything else.
  { out: { key: 'torch', kind: 'block', count: 3 }, need: [['#wood', 1]], station: null },

  // Work bench: the shaping station. Wood and stone into structure and the next stations.
  { out: { key: 'furnace', kind: 'block', count: 1 }, need: [['stone', 20], ['#wood', 4], ['torch', 3]], station: 'workbench' },
  { out: { key: 'brickwall', kind: 'wall', count: 4 }, need: [['stone', 1]], station: 'workbench' },
  { out: { key: 'anvil', kind: 'block', count: 1 }, need: [['copper-bar', 5]], station: 'workbench' },

  // Wooden tools and armour. These take any wood, because gating a pickaxe on finding
  // one particular tree would be tedious rather than interesting.
  { out: { key: 'wood-pick', kind: 'tool', count: 1 }, need: [['#wood', 12]], station: 'workbench' },
  { out: { key: 'wood-axe', kind: 'tool', count: 1 }, need: [['#wood', 10]], station: 'workbench' },
  { out: { key: 'wood-hammer', kind: 'tool', count: 1 }, need: [['#wood', 10]], station: 'workbench' },
  { out: { key: 'wood-sword', kind: 'tool', count: 1 }, need: [['#wood', 14]], station: 'workbench' },
  { out: { key: 'wood-bow', kind: 'tool', count: 1 }, need: [['#wood', 16]], station: 'workbench' },
  { out: { key: 'arrow', kind: 'ammo', count: 12 }, need: [['#wood', 2], ['stone', 1]], station: 'workbench' },

  // Furnace: ore into bars, and sand into glass. Smelting is the whole point of depth.
  { out: { key: 'tin-bar', kind: 'bar', count: 1 }, need: [['tin', 3]], station: 'furnace' },
  { out: { key: 'copper-bar', kind: 'bar', count: 1 }, need: [['copper', 3]], station: 'furnace' },
  { out: { key: 'iron-bar', kind: 'bar', count: 1 }, need: [['iron', 3]], station: 'furnace' },
  { out: { key: 'silver-bar', kind: 'bar', count: 1 }, need: [['silver', 4]], station: 'furnace' },
  { out: { key: 'gold-bar', kind: 'bar', count: 1 }, need: [['gold', 4]], station: 'furnace' },
  { out: { key: 'cobalt-bar', kind: 'bar', count: 1 }, need: [['cobalt', 4]], station: 'furnace' },
  { out: { key: 'emberite-bar', kind: 'bar', count: 1 }, need: [['emberite', 4], ['obsidian', 1]], station: 'furnace' },
  { out: { key: 'glass', kind: 'block', count: 2 }, need: [['sand', 2]], station: 'furnace' },
  { out: { key: 'meteor-bar', kind: 'bar', count: 1 }, need: [['meteorite', 4]], station: 'furnace' },

  // Anvil: bars into metal tools. Each pickaxe opens the rock that holds the next.
  { out: { key: 'town-pylon', kind: 'block', count: 1 }, need: [['topaz', 2], ['copper-bar', 6], ['glass', 4]], station: 'anvil' },
  { out: { key: 'storage-heart', kind: 'block', count: 1 }, need: [['amethyst', 2], ['copper-bar', 5]], station: 'anvil' },
  { out: { key: 'storage-unit', kind: 'block', count: 1 }, need: [['#wood', 12], ['tin-bar', 4]], station: 'workbench' },
  { out: { key: 'storage-vault', kind: 'block', count: 1 }, need: [['storage-unit', 1], ['silver-bar', 6]], station: 'anvil' },
  { out: { key: 'storage-access', kind: 'block', count: 1 }, need: [['glass', 4], ['tin-bar', 4]], station: 'workbench' },
  { out: { key: 'storage-crafter', kind: 'block', count: 1 }, need: [['storage-access', 1], ['iron-bar', 6]], station: 'anvil' },
  { out: { key: 'bucket', kind: 'tool', count: 1 }, need: [['iron-bar', 3]], station: 'anvil' },
  { out: { key: 'tin-pick', kind: 'tool', count: 1 }, need: [['tin-bar', 8], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'tin-axe', kind: 'tool', count: 1 }, need: [['tin-bar', 7], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'tin-hammer', kind: 'tool', count: 1 }, need: [['tin-bar', 7], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'tin-sword', kind: 'tool', count: 1 }, need: [['tin-bar', 7], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'copper-pick', kind: 'tool', count: 1 }, need: [['copper-bar', 7], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'copper-axe', kind: 'tool', count: 1 }, need: [['copper-bar', 8], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'copper-hammer', kind: 'tool', count: 1 }, need: [['copper-bar', 8], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'iron-pick', kind: 'tool', count: 1 }, need: [['iron-bar', 9], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'iron-axe', kind: 'tool', count: 1 }, need: [['iron-bar', 10], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'iron-hammer', kind: 'tool', count: 1 }, need: [['iron-bar', 10], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'silver-pick', kind: 'tool', count: 1 }, need: [['silver-bar', 8], ['#wood', 4]], station: 'anvil' },
  { out: { key: 'gold-pick', kind: 'tool', count: 1 }, need: [['gold-bar', 9], ['#wood', 4]], station: 'anvil' },
  { out: { key: 'cobalt-pick', kind: 'tool', count: 1 }, need: [['cobalt-bar', 11], ['#wood', 5]], station: 'anvil' },
  { out: { key: 'emberite-pick', kind: 'tool', count: 1 }, need: [['emberite-bar', 13], ['#wood', 6]], station: 'anvil' },
  { out: { key: 'copper-sword', kind: 'tool', count: 1 }, need: [['copper-bar', 8], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'iron-sword', kind: 'tool', count: 1 }, need: [['iron-bar', 10], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'silver-sword', kind: 'tool', count: 1 }, need: [['silver-bar', 8], ['#wood', 4]], station: 'anvil' },
  { out: { key: 'gold-sword', kind: 'tool', count: 1 }, need: [['gold-bar', 10], ['#wood', 4]], station: 'anvil' },
  { out: { key: 'cobalt-sword', kind: 'tool', count: 1 }, need: [['cobalt-bar', 13], ['#wood', 5]], station: 'anvil' },
  { out: { key: 'emberite-sword', kind: 'tool', count: 1 }, need: [['emberite-bar', 16], ['#wood', 6]], station: 'anvil' }
];

// Matching axes and hammers follow the existing metal costs. Meteor is an optional
// iron-power sidegrade, while Aetherite requires ore gathered with the Rift Pickaxe.
for (const [metal, bars, wood, jobs] of [
  ['silver', 8, 4, ['axe', 'hammer']],
  ['gold', 9, 4, ['axe', 'hammer']],
  ['cobalt', 11, 5, ['axe', 'hammer']],
  ['emberite', 13, 6, ['axe', 'hammer']],
  ['meteor', 9, 4, ['pick', 'axe', 'hammer']],
  ['aetherite', 10, 6, ['pick', 'axe', 'hammer']]
]) {
  for (const job of jobs) {
    const need = [[metal + '-bar', bars], ['#wood', wood]];
    if (metal === 'meteor' && job === 'pick') need.push(['iron-bar', 2]);
    RECIPES.push({ out: { key: metal + '-' + job, kind: 'tool', count: 1 }, need, station: 'anvil' });
  }
}
for (const [metal, bars, wood] of [['tin', 7, 7], ['meteor', 10, 10], ['aetherite', 12, 12]]) {
  RECIPES.push({ out: { key: metal + '-bow', kind: 'tool', count: 1 },
    need: [[metal + '-bar', bars], ['#wood', wood]], station: 'anvil' });
}

for (const [metal] of AMMO_METALS) {
  for (const family of ['arrow', 'bullet']) {
    const key = metal + '-' + family;
    if (key === 'iron-arrow') continue;
    RECIPES.push({ out: { key, kind: 'ammo', count: family === 'bullet' ? 36 : 28 },
      need: [[metal + '-bar', 1], ...(family === 'arrow' ? [['#wood', 2]] : [])], station: 'anvil' });
  }
}
RECIPES.push(
  { out: { key: 'bullet', kind: 'ammo', count: 50 }, need: [['tin-bar', 1]], station: 'anvil' },
  { out: { key: 'iron-musket', kind: 'tool', count: 1 }, need: [['iron-bar', 9], ['#wood', 6]], station: 'anvil' },
  { out: { key: 'prism-sigil', kind: 'use', count: 1 }, need: [['rift-core', 1], ['aetherite-bar', 5]], station: 'anvil' },
  { out: { key: 'prism-lance', kind: 'tool', count: 1 }, need: [['ray-crystal', 8], ['palladium-bar', 6]], station: 'anvil' },
  { out: { key: 'storm-conduit', kind: 'tool', count: 1 }, need: [['storm-crystal', 8], ['mythril-bar', 6]], station: 'anvil' },
  { out: { key: 'ward-scepter', kind: 'tool', count: 1 }, need: [['ward-crystal', 8], ['palladium-bar', 6]], station: 'anvil' }
);
for (const metal of HARDMODE_METALS) {
  const bar = metal.key + '-bar';
  RECIPES.push({ out: { key: bar, kind: 'bar', count: 1 }, need: [[metal.key, 3]], station: 'furnace' });
  const jobs = ['pick', 'axe', 'hammer', 'sword', 'bow', 'rifle'];
  jobs.push('staff');
  for (const job of jobs) {
    RECIPES.push({ out: { key: metal.key + '-' + job, kind: 'tool', count: 1 },
      need: [[bar, job === 'rifle' ? 11 : 8], ['#wood', 4]], station: 'anvil' });
  }
}

// Armour, every tier and piece. Wooden mail is made from any lumber at a bench; metal
// mail is made from bars at an anvil, because beating sheet takes an anvil.
for (const tier of ARMOUR_TIERS) {
  for (const piece of ARMOUR_PIECES) {
    const key = tier.key + '-' + piece.suffix;
    // A class set names its own ingredients; each piece costs them in proportion to how
    // much of the set's defence it carries, so the breastplate is always the expensive
    // one and nothing has to be written out four times.
    if (tier.craft) {
      RECIPES.push({ out: { key, kind: 'armor', count: 1 },
        need: tier.craft.map(([k, n]) => [k, Math.max(1, Math.round(n * piece.share))]),
        station: tier.station || 'workbench' });
      continue;
    }
    if (!tier.bar) {
      RECIPES.push({ out: { key, kind: 'armor', count: 1 },
        need: [['#wood', piece.woodCost]], station: 'workbench' });
      continue;
    }
    const bars = Math.max(4, Math.round(tier.cost * piece.share / 2));
    RECIPES.push({ out: { key, kind: 'armor', count: 1 },
      need: [[tier.bar, bars]], station: 'anvil' });
  }
}

// Accessories. Each one is a detour worth making, so each costs something you only have
// after going somewhere particular.
RECIPES.push(
  { out: { key: 'cloud-charm', kind: 'accessory', count: 1 }, need: [['feather', 12], ['silver-bar', 6]], station: 'anvil' },
  { out: { key: 'diving-gear', kind: 'accessory', count: 1 }, need: [['finleather', 2], ['glass', 10], ['copper-bar', 8]], station: 'anvil' },
  { out: { key: 'feather-fall', kind: 'accessory', count: 1 }, need: [['feather', 20], ['tin-bar', 8]], station: 'anvil' },
  { out: { key: 'miners-charm', kind: 'accessory', count: 1 }, need: [['gold-bar', 8], ['crystal', 6]], station: 'anvil' },
  { out: { key: 'swift-boots', kind: 'accessory', count: 1 }, need: [['leather', 8], ['iron-bar', 10]], station: 'anvil' },
  { out: { key: 'shellguard', kind: 'accessory', count: 1 }, need: [['shell', 12], ['chitin', 8], ['iron-bar', 6]], station: 'anvil' },
  { out: { key: 'trail-buckle', kind: 'accessory', count: 1 }, need: [['leather', 5], ['copper-bar', 3]], station: 'anvil' },
  { out: { key: 'tidal-locket', kind: 'accessory', count: 1 }, need: [['shell', 12], ['sapphire', 2]], station: 'anvil' },
  { out: { key: 'prism-brooch', kind: 'accessory', count: 1 }, need: [['topaz', 2], ['ruby', 2], ['silver-bar', 3]], station: 'anvil' },
  { out: { key: 'forge-gauntlet', kind: 'accessory', count: 1 }, need: [['emberite-bar', 4], ['obsidian', 5], ['leather', 3]], station: 'anvil' },
  { out: { key: 'obsidian-charm', kind: 'accessory', count: 1 }, need: [['obsidian', 6], ['gold-bar', 2]], station: 'anvil' },
  { out: { key: 'cinder-idol', kind: 'use', count: 1 }, need: [['cinder', 8], ['emberite-bar', 3]], station: 'anvil' },
  { out: { key: 'ashvault-key', kind: 'use', count: 1 }, need: [['furnace-core', 1], ['obsidian', 4]], station: 'anvil' },
  { out: { key: 'guardian-effigy', kind: 'use', count: 1 }, need: [['cinder', 8], ['emberite-bar', 3]], station: 'anvil' },
  { out: { key: 'ashblade', kind: 'tool', count: 1 }, need: [['guardian-seal', 1], ['vault-relic', 1], ['emberite-bar', 8]], station: 'anvil' },
  { out: { key: 'vault-bow', kind: 'tool', count: 1 }, need: [['guardian-seal', 1], ['vault-relic', 1], ['chitin', 10]], station: 'anvil' },
  { out: { key: 'relic-staff', kind: 'tool', count: 1 }, need: [['guardian-seal', 1], ['vault-relic', 1], ['diamond', 2]], station: 'anvil' },
  { out: { key: 'void-beacon', kind: 'use', count: 1 }, need: [['guardian-seal', 1], ['void-crystal', 5]], station: 'anvil' },
  { out: { key: 'sovereign-mantle', kind: 'accessory', count: 1 }, need: [['void-heart', 1], ['void-crystal', 8], ['silver-bar', 6]], station: 'anvil' },
  { out: { key: 'blight-clasp', kind: 'accessory', count: 1 }, need: [['shade-fang', 2], ['silver-bar', 3]], station: 'anvil' },
  { out: { key: 'spore-idol', kind: 'use', count: 1 }, need: [['blightshroom', 4], ['iron-bar', 3]], station: 'anvil' },
  { out: { key: 'spore-band', kind: 'accessory', count: 1 }, need: [['spore-crown-fragment', 1], ['iron-bar', 4]], station: 'anvil' },
  { out: { key: 'hollowroot-sigil', kind: 'use', count: 1 }, need: [['shadelog', 6], ['silver-bar', 3]], station: 'anvil' },
  { out: { key: 'hollowroot-wrap', kind: 'accessory', count: 1 }, need: [['hollowroot-knot', 1], ['silver-bar', 4]], station: 'anvil' },
  { out: { key: 'crimson-clasp', kind: 'accessory', count: 1 }, need: [['vein-fang', 2], ['silver-bar', 3]], station: 'anvil' },
  { out: { key: 'bloodcrest-lure', kind: 'use', count: 1 }, need: [['crimlog', 4], ['iron-bar', 3]], station: 'anvil' },
  { out: { key: 'bloodcrest-quiver', kind: 'accessory', count: 1 }, need: [['bloodcrest-plume', 1], ['iron-bar', 4]], station: 'anvil' },
  { out: { key: 'vein-seal', kind: 'use', count: 1 }, need: [['tissue', 6], ['silver-bar', 3]], station: 'anvil' },
  { out: { key: 'veinward-aegis', kind: 'accessory', count: 1 }, need: [['veinward-core', 1], ['silver-bar', 4]], station: 'anvil' },
  { out: { key: 'ocean-clasp', kind: 'accessory', count: 1 }, need: [['barnacle-fang', 2], ['silver-bar', 3]], station: 'anvil' },
  { out: { key: 'reef-conch', kind: 'use', count: 1 }, need: [['shell', 4], ['iron-bar', 3]], station: 'anvil' },
  { out: { key: 'reef-talisman', kind: 'accessory', count: 1 }, need: [['reef-fin', 1], ['iron-bar', 4]], station: 'anvil' },
  { out: { key: 'abyssal-signal', kind: 'use', count: 1 }, need: [['finleather', 6], ['silver-bar', 3]], station: 'anvil' },
  { out: { key: 'abyssal-focus', kind: 'accessory', count: 1 }, need: [['abyssal-pearl', 1], ['silver-bar', 4]], station: 'anvil' },
  { out: { key: 'beach-clasp', kind: 'accessory', count: 1 }, need: [['driftlock-fang', 2], ['silver-bar', 3]], station: 'anvil' },
  { out: { key: 'breakwater-shell', kind: 'use', count: 1 }, need: [['shell', 4], ['iron-bar', 3]], station: 'anvil' },
  { out: { key: 'breakwater-band', kind: 'accessory', count: 1 }, need: [['breakwater-claw', 1], ['iron-bar', 4]], station: 'anvil' },
  { out: { key: 'saltmarrow-token', kind: 'use', count: 1 }, need: [['bone', 6], ['silver-bar', 3]], station: 'anvil' },
  { out: { key: 'saltmarrow-charm', kind: 'accessory', count: 1 }, need: [['saltmarrow-bone', 1], ['silver-bar', 4]], station: 'anvil' },
  { out: { key: 'windmill-token', kind: 'use', count: 1 }, need: [['oaklog', 10], ['tin-bar', 4], ['chitin', 3]], station: 'anvil' },
  { out: { key: 'standard-pennant', kind: 'use', count: 1 }, need: [['bone', 8], ['leather', 5], ['silver-bar', 3]], station: 'anvil' },
  { out: { key: 'windmill-brace', kind: 'accessory', count: 1 }, need: [['windmill-gear', 1], ['iron-bar', 3]], station: 'anvil' },
  { out: { key: 'standard-sash', kind: 'accessory', count: 1 }, need: [['standard-thread', 1], ['leather', 6]], station: 'anvil' },
  { out: { key: 'chalklock-clasp', kind: 'accessory', count: 1 }, need: [['chalklock-fang', 2], ['iron-bar', 4]], station: 'anvil' },
  { out: { key: 'pine-totem', kind: 'use', count: 1 }, need: [['pinelog', 12], ['bone', 5], ['iron-bar', 2]], station: 'anvil' },
  { out: { key: 'winterroot-bell', kind: 'use', count: 1 }, need: [['crystal', 6], ['pinelog', 10], ['silver-bar', 4]], station: 'anvil' },
  { out: { key: 'pinemaw-grip', kind: 'accessory', count: 1 }, need: [['pinemaw-claw', 1], ['leather', 6]], station: 'anvil' },
  { out: { key: 'winterroot-band', kind: 'accessory', count: 1 }, need: [['winterroot-core', 1], ['silver-bar', 5]], station: 'anvil' },
  { out: { key: 'pitchlock-clasp', kind: 'accessory', count: 1 }, need: [['pitchlock-fang', 2], ['iron-bar', 4]], station: 'anvil' },
  { out: { key: 'sunmane-idol', kind: 'use', count: 1 }, need: [['acacialog', 12], ['leather', 5], ['iron-bar', 2]], station: 'anvil' },
  { out: { key: 'sun-court-seal', kind: 'use', count: 1 }, need: [['topaz', 3], ['chitin', 8], ['silver-bar', 4]], station: 'anvil' },
  { out: { key: 'sunmane-sash', kind: 'accessory', count: 1 }, need: [['sunmane-tuft', 1], ['leather', 6]], station: 'anvil' },
  { out: { key: 'sun-court-ring', kind: 'accessory', count: 1 }, need: [['sun-carat', 1], ['gold-bar', 4]], station: 'anvil' },
  { out: { key: 'gilt-clasp', kind: 'accessory', count: 1 }, need: [['gilt-fang', 2], ['silver-bar', 4]], station: 'anvil' },
  { out: { key: 'clay-effigy', kind: 'use', count: 1 }, need: [['stone', 18], ['chitin', 5], ['iron-bar', 2]], station: 'anvil' },
  { out: { key: 'ochre-sigil', kind: 'use', count: 1 }, need: [['bone', 8], ['topaz', 3], ['silver-bar', 4]], station: 'anvil' },
  { out: { key: 'clayguard', kind: 'accessory', count: 1 }, need: [['behemoth-core', 1], ['iron-bar', 4]], station: 'anvil' },
  { out: { key: 'drake-scale', kind: 'accessory', count: 1 }, need: [['ochre-scale', 1], ['gold-bar', 3]], station: 'anvil' },
  { out: { key: 'ochre-clasp', kind: 'accessory', count: 1 }, need: [['ochre-fang', 2], ['silver-bar', 4]], station: 'anvil' },
  { out: { key: 'crag-totem', kind: 'use', count: 1 }, need: [['stone', 20], ['bone', 5], ['iron-bar', 2]], station: 'anvil' },
  { out: { key: 'cairn-bell', kind: 'use', count: 1 }, need: [['crystal', 7], ['silver-bar', 4]], station: 'anvil' },
  { out: { key: 'crag-belt', kind: 'accessory', count: 1 }, need: [['cragbreaker-horn', 1], ['leather', 6]], station: 'anvil' },
  { out: { key: 'cairn-chime', kind: 'accessory', count: 1 }, need: [['cairn-echo', 1], ['sapphire', 2]], station: 'anvil' },
  { out: { key: 'cairn-clasp', kind: 'accessory', count: 1 }, need: [['cairn-fang', 2], ['silver-bar', 4]], station: 'anvil' },
  { out: { key: 'reed-sigil', kind: 'use', count: 1 }, need: [['peat', 12], ['gel', 10], ['iron-bar', 2]], station: 'anvil' },
  { out: { key: 'blackfen-spool', kind: 'use', count: 1 }, need: [['chitin', 8], ['amethyst', 3], ['silver-bar', 3]], station: 'anvil' },
  { out: { key: 'reed-circlet', kind: 'accessory', count: 1 }, need: [['reed-crown', 1], ['shell', 6]], station: 'anvil' },
  { out: { key: 'blackfen-wrap', kind: 'accessory', count: 1 }, need: [['blackfen-silk', 1], ['leather', 6]], station: 'anvil' },
  { out: { key: 'siltbound-clasp', kind: 'accessory', count: 1 }, need: [['siltbound-fang', 2], ['silver-bar', 4]], station: 'anvil' },
  { out: { key: 'orchid-lure', kind: 'use', count: 1 }, need: [['stinger', 5], ['mahoganylog', 10], ['iron-bar', 2]], station: 'anvil' },
  { out: { key: 'amberroot-idol', kind: 'use', count: 1 }, need: [['mahoganylog', 14], ['emerald', 2], ['gold-bar', 3]], station: 'anvil' },
  { out: { key: 'orchid-quiver', kind: 'accessory', count: 1 }, need: [['orchid-stinger', 1], ['leather', 5]], station: 'anvil' },
  { out: { key: 'amberroot-bulwark', kind: 'accessory', count: 1 }, need: [['amberroot-heart', 1], ['gold-bar', 4]], station: 'anvil' },
  { out: { key: 'vinebound-clasp', kind: 'accessory', count: 1 }, need: [['vinebound-fang', 2], ['silver-bar', 4]], station: 'anvil' },
  { out: { key: 'rime-horn', kind: 'use', count: 1 }, need: [['snow', 15], ['bone', 4], ['iron-bar', 2]], station: 'anvil' },
  { out: { key: 'aurora-lantern', kind: 'use', count: 1 }, need: [['crystal', 6], ['sapphire', 2], ['silver-bar', 3]], station: 'anvil' },
  { out: { key: 'rimeguard', kind: 'accessory', count: 1 }, need: [['rimehorn-shard', 1], ['iron-bar', 4]], station: 'anvil' },
  { out: { key: 'aurora-veil', kind: 'accessory', count: 1 }, need: [['aurora-thread', 1], ['sapphire', 3]], station: 'anvil' },
  { out: { key: 'glacier-clasp', kind: 'accessory', count: 1 }, need: [['rime-fang', 2], ['silver-bar', 3]], station: 'anvil' },
  { out: { key: 'storm-feather', kind: 'use', count: 1 }, need: [['feather', 8], ['topaz', 2], ['copper-bar', 2]], station: 'anvil' },
  { out: { key: 'desert-medallion', kind: 'use', count: 1 }, need: [['wormtooth', 5], ['chitin', 6], ['iron-bar', 3]], station: 'anvil' },
  { out: { key: 'storm-crest', kind: 'accessory', count: 1 }, need: [['storm-plume', 1], ['copper-bar', 4]], station: 'anvil' },
  { out: { key: 'scourge-guard', kind: 'accessory', count: 1 }, need: [['scourge-scale', 1], ['iron-bar', 6]], station: 'anvil' },
  { out: { key: 'dune-clasp', kind: 'accessory', count: 1 }, need: [['dune-fang', 2], ['silver-bar', 3]], station: 'anvil' },
  { out: { key: 'briar-idol', kind: 'use', count: 1 }, need: [['oaklog', 10], ['chitin', 4], ['copper-bar', 3]], station: 'anvil' },
  { out: { key: 'rootcrown-idol', kind: 'use', count: 1 }, need: [['oaklog', 12], ['crystal', 5], ['gold-bar', 3]], station: 'anvil' },
  { out: { key: 'briar-brooch', kind: 'accessory', count: 1 }, need: [['briar-heart', 1], ['copper-bar', 3]], station: 'anvil' },
  { out: { key: 'rootcrown-ring', kind: 'accessory', count: 1 }, need: [['rootcrown-core', 1], ['silver-bar', 4]], station: 'anvil' },
  { out: { key: 'mimic-clasp', kind: 'accessory', count: 1 }, need: [['mimic-tooth', 2], ['iron-bar', 3]], station: 'anvil' },
  { out: { key: 'mire-idol', kind: 'use', count: 1 }, need: [['gel', 16], ['chitin', 5], ['iron-bar', 2]], station: 'anvil' },
  { out: { key: 'granite-idol', kind: 'use', count: 1 }, need: [['crystal', 6], ['silver-bar', 4]], station: 'anvil' },
  { out: { key: 'mire-talisman', kind: 'accessory', count: 1 }, need: [['mire-pearl', 1], ['shell', 8]], station: 'anvil' },
  { out: { key: 'granite-aegis', kind: 'accessory', count: 1 }, need: [['granite-eye', 1], ['gold-bar', 5]], station: 'anvil' },
  { out: { key: 'rift-sigil', kind: 'use', count: 1 }, need: [['void-heart', 1], ['void-crystal', 8]], station: 'anvil' },
  { out: { key: 'rift-pick', kind: 'tool', count: 1 }, need: [['rift-core', 1], ['emberite-pick', 1], ['emberite-bar', 8]], station: 'anvil' },
  { out: { key: 'aetherite-bar', kind: 'bar', count: 1 }, need: [['aetherite', 2]], station: 'furnace' },
  { out: { key: 'aetherstep', kind: 'accessory', count: 1 }, need: [['aetherite-bar', 8], ['feather', 10]], station: 'anvil' },
  { out: { key: 'aether-sabre', kind: 'tool', count: 1 }, need: [['aetherite-bar', 12], ['void-crystal', 3]], station: 'anvil' },
  { out: { key: 'warden-heart', kind: 'accessory', count: 1 }, need: [['furnace-core', 1], ['obsidian', 6]], station: 'anvil' },
  { out: { key: 'furnace-lance', kind: 'tool', count: 1 }, need: [['furnace-core', 1], ['emberite-bar', 8]], station: 'anvil' },
  { out: { key: 'cinder-scepter', kind: 'tool', count: 1 }, need: [['furnace-core', 1], ['ruby', 2], ['emberite-bar', 6]], station: 'anvil' },
  { out: { key: 'ember-ward', kind: 'accessory', count: 1 }, need: [['cinder', 15], ['obsidian', 10], ['emberite-bar', 4]], station: 'anvil' },
  { out: { key: 'lantern-charm', kind: 'accessory', count: 1 }, need: [['crystal', 8], ['glowmoss', 12], ['gold-bar', 4]], station: 'anvil' }
);

// --- the three ways of fighting -----------------------------------------------------
// Gem staffs, bows and the arrows for them, and one accessory per class. A gem is used
// as it comes out of the rock - nothing smelts one - so a staff is the first thing a new
// gem is good for, and finding a deeper gem is finding a better weapon.
RECIPES.push(
  { out: { key: 'amethyst-staff', kind: 'tool', count: 1 }, need: [['amethyst', 8], ['#wood', 10]], station: 'workbench' },
  { out: { key: 'topaz-staff', kind: 'tool', count: 1 }, need: [['topaz', 8], ['#wood', 10]], station: 'workbench' },
  { out: { key: 'sapphire-staff', kind: 'tool', count: 1 }, need: [['sapphire', 8], ['#wood', 12], ['silver-bar', 2]], station: 'anvil' },
  { out: { key: 'emerald-staff', kind: 'tool', count: 1 }, need: [['emerald', 8], ['#wood', 12], ['silver-bar', 3]], station: 'anvil' },
  { out: { key: 'ruby-staff', kind: 'tool', count: 1 }, need: [['ruby', 8], ['#wood', 14], ['gold-bar', 3]], station: 'anvil' },
  { out: { key: 'diamond-staff', kind: 'tool', count: 1 }, need: [['diamond', 8], ['#wood', 14], ['gold-bar', 5]], station: 'anvil' },

  { out: { key: 'copper-bow', kind: 'tool', count: 1 }, need: [['copper-bar', 8], ['#wood', 8]], station: 'anvil' },
  { out: { key: 'iron-bow', kind: 'tool', count: 1 }, need: [['iron-bar', 9], ['#wood', 8]], station: 'anvil' },
  { out: { key: 'bone-bow', kind: 'tool', count: 1 }, need: [['bone', 14], ['leather', 4]], station: 'anvil' },
  { out: { key: 'silver-bow', kind: 'tool', count: 1 }, need: [['silver-bar', 10], ['#wood', 9]], station: 'anvil' },
  { out: { key: 'gold-bow', kind: 'tool', count: 1 }, need: [['gold-bar', 10], ['#wood', 9]], station: 'anvil' },
  { out: { key: 'cobalt-bow', kind: 'tool', count: 1 }, need: [['cobalt-bar', 12], ['#wood', 10]], station: 'anvil' },
  { out: { key: 'emberite-bow', kind: 'tool', count: 1 }, need: [['emberite-bar', 14], ['#wood', 12]], station: 'anvil' },
  { out: { key: 'iron-arrow', kind: 'ammo', count: 16 }, need: [['iron-bar', 1], ['#wood', 2]], station: 'anvil' },
  { out: { key: 'ember-arrow', kind: 'ammo', count: 16 }, need: [['cinder', 2], ['arrow', 16]], station: 'anvil' },

  { out: { key: 'mana-flower', kind: 'accessory', count: 1 }, need: [['fallenstar', 6], ['emerald', 3]], station: 'anvil' },
  { out: { key: 'focus-crystal', kind: 'accessory', count: 1 }, need: [['diamond', 3], ['gold-bar', 6]], station: 'anvil' },
  { out: { key: 'arcane-band', kind: 'accessory', count: 1 }, need: [['amethyst', 5], ['sapphire', 5], ['silver-bar', 6]], station: 'anvil' },
  { out: { key: 'quiver', kind: 'accessory', count: 1 }, need: [['leather', 10], ['feather', 15]], station: 'anvil' },
  { out: { key: 'scout-lens', kind: 'accessory', count: 1 }, need: [['lens', 4], ['glass', 8], ['topaz', 2]], station: 'anvil' },
  { out: { key: 'brawler-band', kind: 'accessory', count: 1 }, need: [['chitin', 10], ['ruby', 2], ['iron-bar', 8]], station: 'anvil' },
  { out: { key: 'iron-grip', kind: 'accessory', count: 1 }, need: [['leather', 6], ['iron-bar', 10]], station: 'anvil' },

  // Things used rather than worn. A mana crystal takes five fallen stars, which is
  // Terraria's number and about one clear night of looking up.
  { out: { key: 'manacrystal', kind: 'use', count: 1 }, need: [['fallenstar', 5]], station: null },
  // Enough gel that you have had to clear a lot of slime to afford it, which is the
  // right way to be introduced to their king.
  { out: { key: 'meteor-sword', kind: 'tool', count: 1 }, need: [['meteor-bar', 12], ['#wood', 4]], station: 'anvil' },
  // The blaster fires fast and cheap rather than hard: with the Meteor set its bolts
  // cost almost nothing, which is Terraria's joke about the Space Gun and worth keeping.
  { out: { key: 'meteor-blaster', kind: 'tool', count: 1 }, need: [['meteor-bar', 14], ['diamond', 2]], station: 'anvil' },
  { out: { key: 'bottle', kind: 'use', count: 2 }, need: [['glass', 1]], station: 'workbench' },
  { out: { key: 'swift-potion', kind: 'use', count: 2 }, need: [['bottle', 2], ['feather', 3]], station: 'workbench' },
  { out: { key: 'ironskin-potion', kind: 'use', count: 2 }, need: [['bottle', 2], ['iron-bar', 1]], station: 'workbench' },
  { out: { key: 'regen-potion', kind: 'use', count: 2 }, need: [['bottle', 2], ['glowmoss', 3]], station: 'workbench' },
  { out: { key: 'gills-potion', kind: 'use', count: 2 }, need: [['bottle', 2], ['shell', 3]], station: 'workbench' },
  { out: { key: 'spelunk-potion', kind: 'use', count: 2 }, need: [['bottle', 2], ['crystal', 2]], station: 'workbench' },
  { out: { key: 'shine-potion', kind: 'use', count: 2 }, need: [['bottle', 2], ['blightshroom', 2]], station: 'workbench' },
  { out: { key: 'archery-potion', kind: 'use', count: 2 }, need: [['bottle', 2], ['lens', 1], ['feather', 2]], station: 'workbench' },
  { out: { key: 'rage-potion', kind: 'use', count: 2 }, need: [['bottle', 2], ['chitin', 2]], station: 'workbench' },
  { out: { key: 'clarity-potion', kind: 'use', count: 2 }, need: [['bottle', 2], ['amethyst', 2]], station: 'workbench' },
  { out: { key: 'feather-potion', kind: 'use', count: 2 }, need: [['bottle', 2], ['feather', 5]], station: 'workbench' },
  { out: { key: 'campfire', kind: 'block', count: 1 }, need: [['#wood', 10], ['torch', 3]], station: null },
  { out: { key: 'wood-rod', kind: 'tool', count: 1 }, need: [['#wood', 12]], station: 'workbench' },
  { out: { key: 'iron-rod', kind: 'tool', count: 1 }, need: [['iron-bar', 6], ['#wood', 6]], station: 'anvil' },
  { out: { key: 'gold-rod', kind: 'tool', count: 1 }, need: [['gold-bar', 8], ['silver-bar', 4]], station: 'anvil' },
  // Lava eats anything else. Made of the two things that do not burn.
  { out: { key: 'hellfire-rod', kind: 'tool', count: 1 }, need: [['emberite-bar', 6], ['obsidian', 12]], station: 'anvil' },
  { out: { key: 'cooked-fish', kind: 'use', count: 1 }, need: [['#fish', 1]], station: 'furnace' },
  { out: { key: 'seared-fish', kind: 'use', count: 1 }, need: [['#lavafish', 1]], station: 'furnace' },
  { out: { key: 'rope', kind: 'block', count: 8 }, need: [['#wood', 2]], station: 'workbench' },
  { out: { key: 'grapple', kind: 'tool', count: 1 }, need: [['iron-bar', 10], ['leather', 4]], station: 'anvil' },
  { out: { key: 'crystal-hook', kind: 'tool', count: 1 }, need: [['crystal', 10], ['gold-bar', 6], ['leather', 4]], station: 'anvil' },
  { out: { key: 'slimecrown', kind: 'use', count: 1 }, need: [['gel', 24], ['iron-bar', 3]], station: 'anvil' },
  // The first eyes supply the lenses for a silver-tier night summon.
  { out: { key: 'bloodshotlens', kind: 'use', count: 1 }, need: [['lens', 5], ['silver-bar', 2]], station: 'anvil' },
  { out: { key: 'healing-salve', kind: 'use', count: 2 }, need: [['gel', 4], ['glowmoss', 2]], station: 'workbench' },
  { out: { key: 'mana-salve', kind: 'use', count: 2 }, need: [['fallenstar', 1], ['glowmoss', 2]], station: 'workbench' }
);

// Every species gets the same building set, by hand and from its own lumber. Written as
// a loop rather than six copies: thirty-six near-identical recipe lines is thirty-six
// chances to give one species the wrong cost by accident.
for (const w of CRAFT_TILES.WOODS) {
  const wood = w.key + 'wood';
  RECIPES.push(
    { out: { key: wood, kind: 'block', count: 1 }, need: [[w.key + 'log', 1]], station: null },
    { out: { key: w.key + 'back', kind: 'wall', count: 4 }, need: [[wood, 1]], station: null },
    { out: { key: w.key + 'platform', kind: 'block', count: 2 }, need: [[wood, 1]], station: null },
    { out: { key: w.key + 'door', kind: 'block', count: 1 }, need: [[wood, 6]], station: null },
    { out: { key: w.key + 'chair', kind: 'block', count: 1 }, need: [[wood, 4]], station: null },
    { out: { key: w.key + 'table', kind: 'block', count: 1 }, need: [[wood, 8]], station: null },
    { out: { key: w.key + 'bench', kind: 'block', count: 1 }, need: [[wood, 10]], station: null },
    { out: { key: w.key + 'bed', kind: 'block', count: 1 }, need: [[wood, 15], ['gel', 5]], station: 'workbench' }
  );
}


RECIPES.push(...CRAFT_TILES.WORKSHOP_PLANS);
ITEMS.minecart = { name: 'Minecart', kind: 'loot', colour: '#9aa6b6',
  text: 'Use on rail. Move to drive, Down to brake, Jump to exit.' };
RECIPES.push(
  { out: { key: 'minecart', kind: 'loot', count: 1 }, need: [['iron-bar', 5], ['#wood', 6]], station: 'anvil' },
  { out: { key: 'minecart-rail', kind: 'block', count: 12 }, need: [['iron-bar', 1], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'rail-junction', kind: 'block', count: 2 }, need: [['minecart-rail', 4], ['wire-spool', 2]], station: 'anvil' },
  { out: { key: 'brake-rail', kind: 'block', count: 2 }, need: [['minecart-rail', 2], ['copper-bar', 1]], station: 'anvil' },
  { out: { key: 'stop-rail', kind: 'block', count: 2 }, need: [['minecart-rail', 2], ['iron-bar', 1]], station: 'anvil' }
);
ITEMS['critter-net'] = { name: 'Critter Net', kind: 'loot', colour: '#bbd4b1',
  text: 'Use on a nearby critter to catch it alive.' };
RECIPES.push({ out: { key: 'critter-net', kind: 'loot', count: 1 },
  need: [['#wood', 5], ['rope', 3]], station: 'workbench' });
for (const specimen of CRAFT_TILES.CRITTER_SPECIMENS) {
  ITEMS['critter-' + specimen.key] = { name: specimen.name, kind: 'loot', colour: specimen.colour,
    critter: specimen.key, text: specimen.rare === 'crystal'
      ? 'Crystal specimen · ' + specimen.gem + ' · Use on an empty terrarium.'
      : 'Live specimen · Use on an empty terrarium.' };
}
ITEMS['wire-spool'] = { name: 'Copper Wire', kind: 'loot', colour: '#d28d5d',
  text: 'Hold to see circuits. Use on a tile to lay one segment.' };
for (const [key, name, colour, wireChannel] of [
  ['blue-wire', 'Blue Wire', '#80c4ff', 'blue'], ['green-wire', 'Green Wire', '#7be4ae', 'green']
]) {
  ITEMS[key] = { name, colour, kind: 'loot', wireChannel, text: 'A separate circuit channel. Can cross other wires.' };
  RECIPES.push({ out: { key, kind: 'loot', count: 12 }, need: [['wire-spool', 12]], station: 'signal-bench' });
}
ITEMS['wire-cutters'] = { name: 'Wire Cutters', kind: 'loot', colour: '#9cb5bf',
  text: 'Hold to see circuits. Use on a wire to remove and recover it.' };
RECIPES.push(
  { out: { key: 'wire-spool', kind: 'loot', count: 12 }, need: [['copper-bar', 1]], station: 'anvil' },
  { out: { key: 'wire-cutters', kind: 'loot', count: 1 }, need: [['iron-bar', 2]], station: 'anvil' }
);
function workshopItem(key, item, count, need, station) {
  ITEMS[key] = item;
  RECIPES.push({ out: { key, kind: item.kind, count }, need, station });
}

for (const [key, name, colour, dye] of CRAFT_TILES.WORKSHOP_DYES) {
  const thread = key + '-thread';
  workshopItem(thread, { name: name + ' Thread', colour, kind: 'loot', textile: 'thread' }, 4,
    dye ? [['natural-thread', 4], [dye, 1]] : [['rope', 2]], 'loom');
  workshopItem(key + '-fabric', { name: name + ' Fabric', colour, kind: 'loot', textile: 'fabric' }, 2,
    [[thread, 3]], 'loom');
}

for (const [base, reagent] of [
  ['swift', 'feather'], ['ironskin', 'iron-bar'], ['regen', 'glowmoss'],
  ['gills', 'shell'], ['spelunk', 'crystal'], ['shine', 'blightshroom'],
  ['archery', 'lens'], ['rage', 'chitin'], ['clarity', 'amethyst'], ['feather', 'feather']
]) {
  const original = base + '-potion';
  const source = ITEMS[original];
  RECIPES.find(recipe => recipe.out.key === original).station = 'alchemy-table';
  for (const [tier, label, duration, extra] of [
    ['field', 'Field', 0.65, []],
    ['refined', 'Refined', 1.5, [['glowmoss', 1]]],
    ['grand', 'Grand', 2.25, [['fallenstar', 1]]]
  ]) {
    const need = tier === 'field' ? [['bottle', 1], [reagent, 1]] : [[original, 1], ...extra];
    workshopItem(tier + '-' + original, { ...source, name: label + ' ' + source.name,
      use: { ...source.use, duration }, potionTier: tier }, 1, need, 'alchemy-table');
  }
}

for (const [fish, quality] of [
  ['bass', 0], ['trout', 1], ['icepike', 2], ['perch', 0], ['oasiscarp', 1],
  ['swordfish', 3], ['cavefish', 2], ['glowfish', 3], ['shadowcarp', 4], ['obsidifish', 5],
  ['piranha', 1], ['shrimp', 0], ['deepshrimp', 3], ['flarefin', 4], ['magmasnail', 5]
]) {
  for (const [dish, name, serving, garnish, baseHeal] of [
    ['broth', 'Broth', 'hearty', null, 28], ['skewer', 'Skewer', 'trail', 'mushroom', 36],
    ['chowder', 'Chowder', 'hearty', 'shell', 53], ['hotpot', 'Hotpot', 'focus', 'glowmoss', 42]
  ]) {
    const ingredient = ITEMS[fish];
    const heal = baseHeal + quality * 12;
    const need = [[fish, 1]];
    if (garnish) need.push([garnish, 1]);
    workshopItem(fish + '-' + dish, { name: ingredient.name + ' ' + name, kind: 'use',
      colour: ingredient.colour, dish, use: { meal: serving, heal },
      text: 'Restores ' + heal + ' health. Replaces your current meal buff.' }, 1, need, 'cauldron');
  }
}

// Which stations are in reach. Scanning the box is cheap enough to do every frame, and
// doing it that way means a station the player mines out stops counting immediately.
const SUMMON_FOCI = [
  ['Twig', '#wood', 10, 18, 0.78, 12, '#a3cb73', 'strike'],
  ['Iron', 'iron-bar', 8, 32, 0.66, 14, '#b1b6bf', 'twin'],
  ['Gold', 'gold-bar', 9, 49, 0.59, 16, '#f9ca6d', 'ward'],
  ['Cobalt', 'cobalt-bar', 10, 69, 0.52, 17, '#69aff2', 'chain'],
  ['Emberite', 'emberite-bar', 11, 91, 0.48, 18, '#ff8a60', 'burst'],
  ['Void', 'void-crystal', 10, 107, 0.43, 19, '#ae84e7', 'twin'],
  ['Aetherite', 'aetherite-bar', 11, 123, 0.41, 20, '#b5dfff', 'ward'],
  ['Palladium', 'palladium-bar', 10, 148, 0.39, 21, '#f8b27a', 'chain'],
  ['Mythril', 'mythril-bar', 10, 176, 0.38, 22, '#75d7ac', 'burst'],
  ['Adamantite', 'adamantite-bar', 10, 208, 0.36, 23, '#ea777a', 'twin'],
  ['Lunarium', 'lunarium-bar', 10, 242, 0.35, 24, '#b9c4f3', 'ward'],
  ['Solarium', 'solarium-bar', 10, 267, 0.34, 25, '#ffd07a', 'burst'],
  ['Eventide', 'eventide-bar', 10, 300, 0.33, 26, '#d4aaf2', 'chain']
];
for (const [name, material, count, damage, useTime, reach, colour, summon] of SUMMON_FOCI) {
  const key = name.toLowerCase() + '-spirit-focus';
  WEAPONS[key] = { name: name + ' Spirit Focus', damage, useTime, reach, colour, summon };
  RECIPES.push({ out: { key, kind: 'tool', count: 1 }, need: [[material, count]], station: material === '#wood' ? 'workbench' : 'anvil' });
}

for (const [key, name, material, damage, mana, colour, spell] of [
  ['spark-wand', 'Spark Wand', '#wood', 11, 2, '#f1bb73', null],
  ['cobalt-conduit', 'Cobalt Conduit', 'cobalt-bar', 56, 6, '#77baff', 'chain'],
  ['aetherite-wand', 'Aetherite Wand', 'aetherite-bar', 105, 8, '#c2eaff', 'pierce']
]) {
  WEAPONS[key] = { name, damage, mana, spell, magic: true, reach: 36, useTime: 0.32, bolt: colour };
  RECIPES.push({ out: { key, kind: 'tool', count: 1 }, need: [[material, 9]], station: material === '#wood' ? 'workbench' : 'anvil' });
}

for (const [key, name, material, power] of [
  ['spirit-thread', 'Spirit Thread', 'iron-bar', 1.10],
  ['warden-binding', 'Warden Binding', 'furnace-core', 1.14],
  ['astral-binding', 'Astral Binding', 'eventide-bar', 1.16]
]) {
  ACCESSORIES[key] = { name, colour: '#c6b4f4', text: 'Spirit damage +' + Math.round((power - 1) * 100) + '%', summoner: power };
  RECIPES.push({ out: { key, kind: 'accessory', count: 1 }, need: [[material, material === 'furnace-core' ? 1 : 5]], station: 'anvil' });
}

for (const key of ['meteor-bow', 'emberite-bow', 'solarium-bow']) WEAPONS[key].volley = true;
for (const key of ['meteor-sword', 'emberite-sword', 'solarium-sword']) WEAPONS[key].cleave = true;

// Crossbows trade recovery time for heavy, flatter shots and reliable penetration.
const RANGER_CROSSBOWS = [
  ['wood', 'Wooden', '#wood', 20, 0.72, 32, 2],
  ['iron', 'Iron', 'iron-bar', 36, 0.61, 40, 2],
  ['gold', 'Gold', 'gold-bar', 58, 0.56, 46, 2],
  ['cobalt', 'Cobalt', 'cobalt-bar', 86, 0.49, 50, 3],
  ['emberite', 'Emberite', 'emberite-bar', 113, 0.47, 54, 2],
  ['aetherite', 'Aetherite', 'aetherite-bar', 147, 0.44, 59, 3],
  ...HARDMODE_METALS.map((metal, index) => [
    metal.key, metal.name, metal.key + '-bar', Math.round(metal.damage * 1.55),
    0.43 - index * 0.012, 62 + index * 2, 2 + index % 3
  ])
];
for (const [key, name, material, damage, useTime, reach, pierce] of RANGER_CROSSBOWS) {
  WEAPONS[key + '-crossbow'] = { name: name + ' Crossbow', damage, useTime, reach, pierce, ranged: true, ammo: 'bolt' };
  RECIPES.push({ out: { key: key + '-crossbow', kind: 'tool', count: 1 },
    need: [[material, key === 'wood' ? 18 : 10], ['rope', 4]], station: key === 'wood' ? 'workbench' : 'anvil' });
}

for (const [key, name, metal, damage, useTime, reach, scatter] of [
  ['tin-handcannon', 'Tin Hand Cannon', 'tin', 19, 0.52, 30, 0],
  ['copper-pepperbox', 'Copper Pepperbox', 'copper', 14, 0.37, 36, 0],
  ['silver-scattergun', 'Silver Scattergun', 'silver', 28, 0.52, 30, 0.24],
  ['gold-carbine', 'Gold Carbine', 'gold', 38, 0.28, 52, 0],
  ['cobalt-rifle', 'Cobalt Marksman Rifle', 'cobalt', 57, 0.32, 65, 0],
  ['emberite-blunderbuss', 'Emberite Blunderbuss', 'emberite', 62, 0.39, 37, 0.26],
  ['aetherite-carbine', 'Aetherite Carbine', 'aetherite', 85, 0.19, 61, 0]
]) {
  WEAPONS[key] = { name, damage, useTime, reach, scatter, ranged: true, ammo: 'bullet',
    pierce: key === 'cobalt-rifle' ? 2 : undefined };
  RECIPES.push({ out: { key, kind: 'tool', count: 1 }, need: [[metal + '-bar', 10], ['#wood', 5]], station: 'anvil' });
}

for (const [key, name, colour, bonus, speed] of [
  ['wood', 'Wooden', '#ab8052', 0, 1.28],
  ...AMMO_METALS.map(([key, name, colour, bonus]) => [key, name, colour, bonus, 1.42])
]) {
  const ammo = key === 'wood' ? 'bolt' : key + '-bolt';
  ITEMS[ammo] = { name: key === 'wood' ? 'Bolt' : name + ' Bolt', kind: 'ammo', colour };
  AMMO[ammo] = { family: 'bolt', bonus, colour, speed };
  RECIPES.push({ out: { key: ammo, kind: 'ammo', count: key === 'wood' ? 24 : 32 },
    need: key === 'wood' ? [['#wood', 2], ['stone', 1]] : [[key + '-bar', 1], ['#wood', 1]],
    station: key === 'wood' ? 'workbench' : 'anvil' });
}

for (const [key, name, family, colour, bonus, trait, ingredient] of [
  ['barbed-arrow', 'Barbed Arrow', 'arrow', '#d8ae92', 5, { shove: 7 }, 'bone'],
  ['bodkin-bolt', 'Bodkin Bolt', 'bolt', '#abbce3', 8, { pierce: 4 }, 'silver-bar'],
  ['punch-bullet', 'Punch Bullet', 'bullet', '#e5b176', 9, { shove: 11 }, 'gold-bar']
]) {
  ITEMS[key] = { name, kind: 'ammo', colour };
  AMMO[key] = { family, colour, bonus, speed: family === 'bullet' ? 1.75 : family === 'bolt' ? 1.45 : 1.12, ...trait };
  RECIPES.push({ out: { key, kind: 'ammo', count: 24 }, need: [[family, 24], [ingredient, 1]], station: 'anvil' });
}

const THROWER_LADDER = [
  ['oak-boomerang', 'Oak Boomerang', '#wood', 12, 0.52, 15, '#c99158', 'returning'],
  ['tin-knives', 'Tin Knives', 'tin-bar', 16, 0.37, 19, '#b6b4a2', 'fan'],
  ['iron-javelin', 'Iron Javelin', 'iron-bar', 34, 0.47, 24, '#bfc8cf', 'pierce'],
  ['gold-chakram', 'Gold Chakram', 'gold-bar', 49, 0.42, 25, '#f1bd61', 'returning'],
  ['cobalt-darts', 'Cobalt Darts', 'cobalt-bar', 64, 0.33, 27, '#67a7e5', 'fan'],
  ['emberite-flask', 'Emberite Flask', 'emberite-bar', 104, 0.57, 25, '#f17a49', 'blast'],
  ['void-disc', 'Void Disc', 'void-crystal', 105, 0.43, 31, '#ae84e7', 'returning'],
  ['aetherite-javelin', 'Aetherite Javelin', 'aetherite-bar', 137, 0.41, 36, '#8ddbc9', 'pierce'],
  ['palladium-knives', 'Palladium Knives', 'palladium-bar', 145, 0.32, 33, '#f3b882', 'fan'],
  ['mythril-charge', 'Mythril Charge', 'mythril-bar', 218, 0.47, 34, '#86e0bb', 'blast'],
  ['adamantite-disc', 'Adamantite Disc', 'adamantite-bar', 199, 0.35, 37, '#e77b82', 'returning'],
  ['lunarium-javelin', 'Lunarium Javelin', 'lunarium-bar', 265, 0.36, 42, '#b5c8f2', 'pierce'],
  ['solarium-flask', 'Solarium Flask', 'solarium-bar', 307, 0.40, 39, '#ffce72', 'blast'],
  ['eventide-stars', 'Eventide Stars', 'eventide-bar', 286, 0.29, 43, '#d9aff3', 'fan']
];
for (const [key, name, material, damage, useTime, reach, colour, throwStyle] of THROWER_LADDER) {
  WEAPONS[key] = { name, damage, useTime, reach, colour, throwStyle };
  RECIPES.push({ out: { key, kind: 'tool', count: 1 }, need: [[material, material === '#wood' ? 12 : 9]],
    station: material === '#wood' ? 'workbench' : 'anvil' });
}

for (const [key, name, material, bonus] of [
  ['throwers-wrap', 'Thrower’s Wrap', 'iron-bar', 10],
  ['cinder-bandolier', 'Cinder Bandolier', 'emberite-bar', 14],
  ['astral-bracer', 'Astral Bracer', 'eventide-bar', 16]
]) {
  ACCESSORIES[key] = { name, colour: '#d9ac79', text: 'Throwing damage +' + bonus + '%', thrower: 1 + bonus / 100 };
  RECIPES.push({ out: { key, kind: 'accessory', count: 1 }, need: [[material, 5], ['rope', 6]], station: 'anvil' });
}

for (const [key, name, enemy, material, effect, text] of [
  ['scarab-grip', 'Scarab Grip', 'antlion', null, { meleeReach: 0.35 }, 'Melee reach +0.35 tiles'],
  ['harpy-fletching', 'Harpy Fletching', 'harpy', null, { arrowSpeed: 1.13 }, 'Projectile speed +13%'],
  ['watcher-prism', 'Watcher Prism', 'demoneye', null, { manaRegen: 1.18 }, 'Mana regeneration +18%'],
  ['batwing-idol', 'Batwing Idol', 'cavebat', null, { spiritInterval: 0.92 }, 'Spirit attacks 8% sooner'],
  ['imp-fuse', 'Imp Fuse', 'fireimp', null, { throwBlast: 1.16 }, 'Throwing blast radius +16%'],
  ['vault-grip', 'Vault Grip', null, 'guardian-seal', { melee: 1.12, meleeReach: 0.25 }, 'Melee damage +12% and reach +0.25 tiles'],
  ['wyvern-sight', 'Wyvern Sight', null, 'wyvern-essence', { ranged: 1.12, arrowSpeed: 1.08 }, 'Ranged damage +12% and projectile speed +8%'],
  ['regent-prism', 'Regent Prism', null, 'siege-core', { magic: 1.14, manaCost: 0.94 }, 'Magic damage +14% and mana cost −6%'],
  ['sovereign-idol', 'Sovereign Idol', null, 'void-heart', { summoner: 1.12, spiritInterval: 0.94 }, 'Spirit damage +12% and attacks 6% sooner'],
  ['regent-fuse', 'Regent Fuse', null, 'siege-core', { thrower: 1.14, throwBlast: 1.1 }, 'Throwing damage +14% and blast radius +10%']
]) {
  ACCESSORIES[key] = { name, colour: '#dec0a5', text, ...effect, ...(enemy ? { drop: enemy } : {}) };
  if (material) RECIPES.push({ out: { key, kind: 'accessory', count: 1 },
    need: [[material, material === 'wyvern-essence' ? 6 : 1], ['silver-bar', 3]], station: 'anvil' });
}

const EXPEDITION_ACCESSORIES = [
  // Rare drops from ordinary enemies.
  ['moss-magnet', 'Moss Magnet', 'greenslime', '#91c76c', { pickup: 1.3 }, 'Pickup range +30%'],
  ['grave-torc', 'Grave Torc', 'zombie', '#a2a77d', { melee: 1.07, defense: 2 }, 'Melee damage +7% and defence +2'],
  ['frostglass-eye', 'Frostglass Eye', 'frostwight', '#a8ddec', { manaCost: 0.91, glow: 3 }, 'Mana cost −9% and emits light'],
  ['carrion-fletch', 'Carrion Fletch', 'vulture', '#d2ad7c', { ranged: 1.08, fallMul: 0.85 }, 'Ranged damage +8% and fall damage −15%'],
  ['crag-tether', 'Crag Tether', 'cragstalker', '#c8a88a', { meleeReach: 0.2, fallMul: 0.76 }, 'Melee reach +0.2 tiles and fall damage −24%'],
  ['wasp-whistle', 'Wasp Whistle', 'hornet', '#f0c860', { spiritReach: 3, summoner: 1.05 }, 'Spirit targeting range +3 tiles and damage +5%'],
  ['reed-lanyard', 'Reed Lanyard', 'boglurker', '#9ab373', { breathMul: 1.35, pickup: 1.16 }, 'Breath lasts 35% longer and pickup range +16%'],
  ['breaker-claw', 'Breaker Claw', 'crab', '#f5987a', { thrower: 1.09, defense: 2 }, 'Throwing damage +9% and defence +2'],
  ['tidewick', 'Tidewick', 'jellyfish', '#82d1d4', { glow: 7, breathMul: 1.2 }, 'Emits light and breath lasts 20% longer'],
  ['bloodsilk-cord', 'Bloodsilk Cord', 'bloodcrawler', '#db808c', { throwSpeed: 1.11, thrower: 1.06 }, 'Throw speed +11% and throwing damage +6%'],
  ['burrowers-loop', 'Burrower’s Loop', 'giantworm', '#bc9a7c', { power: 1.12, pickup: 1.15 }, 'Mining power +12% and pickup range +15%'],
  ['salamander-seal', 'Salamander Seal', 'salamander', '#f1a477', { lavaDamage: 0.8, throwBlast: 1.12 }, 'Lava damage −20% and throwing blast radius +12%'],
  ['golem-knuckle', 'Golem Knuckle', 'rockgolem', '#c1b8a8', { melee: 1.11, defense: 3 }, 'Melee damage +11% and defence +3'],
  ['ashflight-pin', 'Ashflight Pin', 'hellbat', '#e1a0a1', { arrowSpeed: 1.15, lavaDamage: 0.86 }, 'Projectile speed +15% and lava damage −14%'],
  ['furnace-gland', 'Furnace Gland', 'magmacrawler', '#ef9066', { throwBlast: 1.15, lavaDamage: 0.82 }, 'Throwing blast radius +15% and lava damage −18%'],
  ['cloudspun-loop', 'Cloudspun Loop', 'clouddrifter', '#c4e3f3', { fallMul: 0.58, speed: 1.05 }, 'Fall damage −42% and movement speed +5%'],
  ['trench-lantern', 'Trench Lantern', 'ashsentinel', '#eac08e', { glow: 9, manaRegen: 1.12 }, 'Emits light and mana regeneration +12%'],
  ['shade-thread', 'Shade Thread', 'voidshade', '#c29ce8', { spiritReach: 4, spiritInterval: 0.95 }, 'Spirit range +4 tiles and attack interval −5%'],
  ['void-fletching', 'Void Fletching', 'voidwyrm', '#a999e5', { ranged: 1.09, arrowSpeed: 1.12 }, 'Ranged damage +9% and projectile speed +12%'],
  ['drone-lens', 'Drone Lens', 'foundry-drone', '#9cd6e9', { magic: 1.10, manaCost: 0.93 }, 'Magic damage +10% and mana cost −7%'],

  // Crafted alternatives use reliable enemy materials or guaranteed boss rewards.
  ['gel-lined-boots', 'Gel-Lined Boots', [['gel', 12], ['leather', 3]], '#a0c280', { speed: 1.07, fallMul: 0.84 }, 'Movement speed +7% and fall damage −16%'],
  ['bone-votive', 'Bone Votive', [['bone', 12], ['gel', 8]], '#dfcda7', { summoner: 1.08, spiritReach: 2 }, 'Spirit damage +8% and targeting range +2 tiles'],
  ['lens-sheath', 'Lens Sheath', [['lens', 5], ['leather', 4]], '#cc83af', { magic: 1.08, manaRegen: 1.11 }, 'Magic damage +8% and mana regeneration +11%'],
  ['chitin-sling', 'Chitin Sling', [['chitin', 8], ['rope', 4]], '#d9b875', { throwSpeed: 1.13 }, 'Throw speed +13%'],
  ['feather-sight', 'Feather Sight', [['feather', 8], ['lens', 3]], '#d5c9a6', { ranged: 1.08, arrowSpeed: 1.06 }, 'Ranged damage +8% and projectile speed +6%'],
  ['shellbound-torc', 'Shellbound Torc', [['shell', 10], ['bone', 6]], '#d3a392', { meleeReach: 0.22, breathMul: 1.25 }, 'Melee reach +0.22 tiles and breath lasts 25% longer'],
  ['cinder-votive', 'Cinder Votive', [['cinder', 10], ['bone', 8]], '#ec9e71', { summoner: 1.10, glow: 5 }, 'Spirit damage +10% and emits light'],
  ['ember-counterweight', 'Ember Counterweight', [['cinder', 12], ['iron-bar', 3]], '#e09c6c', { thrower: 1.10, throwSpeed: 1.08 }, 'Throwing damage +10% and throw speed +8%'],
  ['warden-pauldrons', 'Warden Pauldrons', [['furnace-core', 1], ['bone', 12]], '#d99373', { melee: 1.11, defense: 5 }, 'Melee damage +11% and defence +5'],
  ['ashvault-sextant', 'Ashvault Sextant', [['guardian-seal', 1], ['lens', 5]], '#e6bd8c', { pickup: 1.3, glow: 8 }, 'Pickup range +30% and emits light'],
  ['void-compass', 'Void Compass', [['void-heart', 1], ['stardust', 10]], '#bfaae7', { speed: 1.08, glow: 9 }, 'Movement speed +8% and emits light'],
  ['rift-splinter', 'Rift Splinter', [['rift-core', 1], ['lens', 8]], '#9ebde7', { magic: 1.13, manaRegen: 1.1 }, 'Magic damage +13% and mana regeneration +10%'],
  ['prismatic-quiver', 'Prismatic Quiver', [['prism-heart', 1], ['feather', 12]], '#e0acd9', { ranged: 1.13, arrowSpeed: 1.1 }, 'Ranged damage +13% and projectile speed +10%'],
  ['wyvern-bell', 'Wyvern Bell', [['wyvern-essence', 9], ['stardust', 8]], '#b4ddec', { summoner: 1.12, spiritReach: 4 }, 'Spirit damage +12% and targeting range +4 tiles'],
  ['foundry-gyroscope', 'Foundry Gyroscope', [['foundry-prism', 1], ['wyvern-essence', 5]], '#d3a9e6', { throwSpeed: 1.16, throwBlast: 1.12 }, 'Throw speed +16% and blast radius +12%'],
  ['regents-gorget', 'Regent’s Gorget', [['siege-core', 1], ['wyvern-essence', 8]], '#f3c798', { melee: 1.15, meleeReach: 0.35 }, 'Melee damage +15% and reach +0.35 tiles']
];
for (const [key, name, source, colour, effect, text] of EXPEDITION_ACCESSORIES) {
  const drop = typeof source === 'string' ? source : null;
  ACCESSORIES[key] = { name, colour, text, ...effect, ...(drop ? { drop } : {}) };
  if (!drop) RECIPES.push({ out: { key, kind: 'accessory', count: 1 }, need: source, station: 'anvil' });
}

// Each route keeps a distinct utility tradeoff as its materials advance.
const GENERAL_ACCESSORY_STAGES = [
  ['Trail', '#c59f71', 'leather', 'gel', 'workbench', ['zombie', 'greenslime']],
  ['Copper', '#d3926a', 'copper-bar', 'feather', 'anvil', ['vulture', 'antlion']],
  ['Iron', '#aeb9c1', 'iron-bar', 'bone', 'anvil', ['skeleton', 'giantworm']],
  ['Gold', '#e9c474', 'gold-bar', 'chitin', 'anvil', ['rockgolem', 'hornet']],
  ['Cobalt', '#82bde8', 'cobalt-bar', 'leather', 'anvil', ['salamander', 'giantbat']],
  ['Ember', '#ea916d', 'emberite-bar', 'cinder', 'anvil', ['hellbat', 'magmacrawler']],
  ['Void', '#b39ce8', 'void-crystal', 'stardust', 'anvil', ['voidstalker', 'voidshade']],
  ['Aether', '#8edbc9', 'aetherite-bar', 'feather', 'anvil', []],
  ['Adamant', '#e99099', 'adamantite-bar', 'stardust', 'anvil', []],
  ['Eventide', '#ddbcf2', 'eventide-bar', 'wyvern-essence', 'anvil', []]
];

const GENERAL_ACCESSORY_ROUTES = [
  ['pathfinder', 'Pathfinder Boots', (speed, n) => [{ speed: 1 + speed, fallMul: 1 - n / 2 },
    'Movement speed +' + percent(speed) + '% and fall damage −' + percent(n / 2) + '%']],
  ['mason', 'Mason’s Grip', (speed, n) => [{ power: 1 + n, swing: 1 - speed / 2 },
    'Mining power +' + percent(n) + '% and swing interval −' + percent(speed / 2) + '%']],
  ['bulwark', 'Bulwark Clasp', (speed, n, tier) => [{ defense: 2 + tier, speed: 0.97 },
    'Defence +' + (2 + tier) + ' and movement speed −3%']],
  ['mender', 'Mender’s Sash', (speed, n) => [{ regen: 1 + n * 1.5, pickup: 1 + speed / 2 },
    'Regeneration +' + percent(n * 1.5) + '% and pickup range +' + percent(speed / 2) + '%']],
  ['deepwater', 'Deepwater Locket', (speed, n) => [{ breathMul: 1.2 + n * 2, glow: 2 },
    'Breath lasts ' + percent(0.2 + n * 2) + '% longer and emits light']],
  ['cinderwalk', 'Cinderwalk Soles', (speed, n) => [{ lavaDamage: 1 - n, speed: 1 + speed / 3 },
    'Lava damage −' + percent(n) + '% and movement speed +' + percent(speed / 3) + '%']],
  ['lamplighter', 'Lamplighter Lens', (speed, n, tier) => [{ glow: 4 + tier, pickup: 1 + n },
    'Emits light and pickup range +' + percent(n) + '%']],
  ['softfall', 'Softfall Harness', (speed, n) => [{ fallMul: 1 - n * 1.8, defense: 1 },
    'Fall damage −' + percent(n * 1.8) + '% and defence +1']],
  ['salvage', 'Salvage Satchel', (speed, n) => [{ pickup: 1 + n * 2, power: 1 + speed / 2 },
    'Pickup range +' + percent(n * 2) + '% and mining power +' + percent(speed / 2) + '%']],
  ['traveler', 'Traveler’s Knot', (speed, n, tier) => {
    if (tier < 7) return [{ breathMul: 1.1 + n, fallMul: 1 - n / 2, defense: 1 },
      'Breath lasts ' + percent(0.1 + n) + '% longer, fall damage −' + percent(n / 2) + '% and defence +1'];
    const flightBonus = 0.2 + (tier - 7) * 0.1;
    return [{ flightBonus, fallMul: 1 - n / 2 },
      'Wing flight +' + flightBonus.toFixed(1) + 's and fall damage −' + percent(n / 2) + '%'];
  }]
];

function percent(value) { return Math.round(value * 100); }

for (const [tier, [stage, colour, material, reagent, station, enemies]] of GENERAL_ACCESSORY_STAGES.entries()) {
  const speed = (4 + tier) / 100;
  const utility = (8 + tier * 2) / 100;
  const dropSlots = [tier % 10, (tier + 4) % 10];
  for (const [route, [key, name, build]] of GENERAL_ACCESSORY_ROUTES.entries()) {
    const id = 'utility-' + stage.toLowerCase() + '-' + key;
    const [effect, text] = build(speed, utility, tier);
    const drop = enemies[dropSlots.indexOf(route)];
    ACCESSORIES[id] = { name: stage + ' ' + name, colour, text, ...effect, ...(drop ? { drop } : {}) };
    if (!drop) RECIPES.push({ out: { key: id, kind: 'accessory', count: 1 },
      need: [[material, 3 + route % 3], [reagent, 4 + route % 4]], station });
  }
}

// Use the same stacking rules as equipment. Fusion retains the inputs' effects
// while occupying one slot, and uses actual accessories as recipe ingredients.
function addTinkerRecipe(key, name, first, second, colour) {
  const combined = baseEffects();
  applyEffect(combined, ACCESSORIES[first]);
  applyEffect(combined, ACCESSORIES[second]);
  delete combined.bonus;
  const effectLines = [first, second].flatMap(part => {
    const accessory = ACCESSORIES[part];
    return accessory.effectLines || (accessory.text ? [accessory.text] : []);
  });
  ACCESSORIES[key] = { name, colour, effectLines, ...combined };
  RECIPES.push({ out: { key, kind: 'accessory', count: 1 },
    need: [[first, 1], [second, 1]], station: 'tinkers-workshop' });
}

const TINKER_UTILITY_PAIRS = [
  ['wayfarers-treads', 'Wayfarer’s Treads', 'pathfinder', 'softfall'],
  ['quarry-harness', 'Quarry Harness', 'mason', 'salvage'],
  ['field-medic', 'Field Medic’s Kit', 'mender', 'bulwark'],
  ['divers-beacon', 'Diver’s Beacon', 'deepwater', 'lamplighter'],
  ['forge-treads', 'Forge Treads', 'cinderwalk', 'pathfinder'],
  ['spelunkers-kit', 'Spelunker’s Kit', 'lamplighter', 'mason'],
  ['surveyors-harness', 'Surveyor’s Harness', 'traveler', 'softfall'],
  ['rescue-satchel', 'Rescue Satchel', 'deepwater', 'mender']
];
for (const [stage, colour] of GENERAL_ACCESSORY_STAGES) {
  const tier = stage.toLowerCase();
  for (const [key, name, first, second] of TINKER_UTILITY_PAIRS) {
    addTinkerRecipe('tinker-' + tier + '-' + key, stage + ' ' + name,
      'utility-' + tier + '-' + first, 'utility-' + tier + '-' + second, colour);
  }
}

for (const [key, name, first, second, colour] of [
  ['cloudstep-boots', 'Cloudstep Boots', 'swift-boots', 'cloud-charm', '#bac7eb'],
  ['deep-diver-kit', 'Deep Diver Kit', 'diving-gear', 'tidewick', '#79c7d5'],
  ['delvers-lantern', 'Delver’s Lantern', 'miners-charm', 'lantern-charm', '#ebce84'],
  ['ashwalk-harness', 'Ashwalk Harness', 'obsidian-charm', 'feather-fall', '#c1949d'],
  ['vanguard-clasp', 'Vanguard Clasp', 'brawler-band', 'iron-grip', '#d2957c'],
  ['wardens-hand', 'Warden’s Hand', 'vault-grip', 'warden-pauldrons', '#eeb184'],
  ['hunters-sight', 'Hunter’s Sight', 'quiver', 'feather-sight', '#aacc94'],
  ['astral-marksman-kit', 'Astral Marksman Kit', 'prismatic-quiver', 'wyvern-sight', '#d3b8ea'],
  ['arcane-bloom', 'Arcane Bloom', 'mana-flower', 'arcane-band', '#b39ce4'],
  ['regents-focus', 'Regent’s Focus', 'regent-prism', 'rift-splinter', '#e5b4ef'],
  ['spirit-keeper-idol', 'Spirit Keeper Idol', 'spirit-thread', 'batwing-idol', '#b7abc8'],
  ['astral-spirit-bell', 'Astral Spirit Bell', 'sovereign-idol', 'wyvern-bell', '#c9b2e8'],
  ['hunters-bandolier', 'Hunter’s Bandolier', 'throwers-wrap', 'chitin-sling', '#d9a36d'],
  ['foundry-bombardier-kit', 'Foundry Bombardier Kit', 'regent-fuse', 'foundry-gyroscope', '#ecad8c'],
  ['starweave-flight-kit', 'Starweave Flight Kit', 'starweave-wings', 'utility-eventide-traveler', '#dbc5f5'],
  ['explorers-mantle', 'Explorer’s Mantle', 'cloudstep-boots', 'delvers-lantern', '#c8c2ab']
]) addTinkerRecipe(key, name, first, second, colour);

const COMBAT_SIGNATURES = {
  sweep: 'Sweeps through enemies in the aimed arc',
  lunge: 'Thrusts through a narrow line and lunges toward the aim',
  guard: 'Raises a short defence ward with each swing',
  wave: 'Sends a shockwave through enemies in the aimed line',
  ricochet: 'Shots bounce off solid surfaces',
  burst: 'Fires three staggered rounds per bullet',
  seeker: 'Bolts curve toward visible enemies',
  spellfan: 'Casts three bolts in a wide arc',
  rune: 'Leaves a rune that bursts when an enemy approaches',
  bank: 'Can bank off walls before bursting',
  fuse: 'Arms a charge on impact, then bursts after a short delay'
};
for (const [signature, keys] of Object.entries({
  sweep: ['bone-flail', 'meteor-sword', 'emberite-sword', 'solarium-sword'],
  lunge: ['furnace-lance', 'aether-sabre', 'eventide-sword'],
  guard: ['ashblade', 'adamantite-sword'],
  wave: ['shatter-maul', 'lunarium-sword'],
  ricochet: ['tin-handcannon', 'cobalt-rifle', 'lunarium-bow'],
  burst: ['copper-pepperbox', 'induction-repeater', 'aetherite-carbine'],
  seeker: ['amethyst-staff', 'diamond-staff', 'eventide-staff'],
  spellfan: ['ruby-staff', 'cinder-scepter', 'solarium-staff'],
  rune: ['ward-scepter', 'zenith-focus', 'mythril-staff'],
  bank: ['emberite-flask', 'solarium-flask'],
  fuse: ['mythril-charge']
})) {
  for (const key of keys) WEAPONS[key].signature = signature;
}
for (const chapter of CRAFT_TILES.ARMORY_CHAPTERS) {
  for (const [form, signature] of Object.entries({
    glaive: 'lunge', maul: 'wave', cutlass: 'sweep', warpick: 'guard',
    carbine: 'ricochet', repeater: 'burst', wand: 'seeker', scepter: 'rune', focus: 'spellfan'
  })) WEAPONS[chapter.key + '-' + form].signature = signature;
}

// Starter gear teaches each class. Later weapons have a three-attack rhythm.
for (const [index, biome] of CRAFT_TILES.UNDERWORLD_BIOMES.entries()) {
  const { key, accent, oreName, fish, caveFish, crate } = biome;
  ITEMS[key + '-bar'] = { name: oreName + ' Bar', kind: 'bar', colour: accent };
  ITEMS[key + '-relic'] = { name: biome.name + ' Relic', kind: 'loot', colour: accent };
  ITEMS[crate.key] = { name: crate.name, kind: 'use', colour: accent,
    use: { open: crate.key }, text: 'Open for local ore, relics, and a chance at fishing gear.' };
  for (const [catchIndex, entry] of [fish, caveFish].entries()) {
    ITEMS[entry.key] = { name: entry.name, kind: 'loot', colour: accent };
    const dish = entry.key + '-stew';
    const meal = ['hearty', 'trail', 'focus'][(index + catchIndex) % 3];
    ITEMS[dish] = { name: entry.name + ' Stew', kind: 'use', colour: accent, use: { meal, heal: 105 + catchIndex * 30 },
      text: 'Restores ' + (105 + catchIndex * 30) + ' health and grants the ' + meal + ' meal buff.' };
    RECIPES.push({ out: { key: dish, kind: 'use', count: 1 },
      need: [[entry.key, 1], [catchIndex ? 'glowmoss' : 'mushroom', 1]], station: 'cauldron' });
  }
  const weapon = [
    ['pyre-glaive', 'Pyre Glaive', { damage: 348, useTime: 0.23, reach: 5.1, signature: 'lunge' }],
    ['sun-glass-crossbow', 'Sun Glass Crossbow', { damage: 494, useTime: 0.37, reach: 67, ranged: true, ammo: 'bolt', pierce: 4 }],
    ['brine-oracle', 'Brine Oracle', { damage: 365, useTime: 0.30, reach: 53, magic: true, mana: 13, bolt: accent, signature: 'rune' }],
    ['flamebloom-idol', 'Flamebloom Idol', { damage: 342, useTime: 0.31, reach: 28, summon: 'burst' }],
    ['gloom-quartz-disc', 'Gloom Quartz Disc', { damage: 349, useTime: 0.32, reach: 45, throwStyle: 'returning' }]
  ][index];
  WEAPONS[weapon[0]] = { name: weapon[1], colour: accent, underworld: true, ...weapon[2] };
  RECIPES.push(
    { out: { key: key + '-bar', kind: 'bar', count: 1 }, need: [[key + '-ore', 3]], station: 'furnace' },
    { out: { key: weapon[0], kind: 'tool', count: 1 },
      need: [[key + '-bar', 10], [key + '-relic', 8], ['eventide-bar', 2]], station: 'anvil' }
  );
}

for (const { key, name, summon, summonName, trophy, biome, colour, structure, index } of [...CRAFT_TILES.UNDERWORLD_CAMPAIGN, ...CRAFT_TILES.UNDERWORLD_DUNGEONS]) {
  ITEMS[summon] = { name: summonName, kind: 'use', colour, use: { summon: key, campaign: true },
    text: 'Reusable. Awakens ' + name + ' at ' + structure + '.' };
  ITEMS[trophy] = { name: name + ' Trophy', kind: 'loot', colour };
  RECIPES.push({ out: { key: summon, kind: 'use', count: 1 },
    need: [[biome + '-bar', 2 + index % 3], [biome + '-relic', 2 + index % 3]], station: 'anvil' });
}

for (const [index, [key, name, effect, text]] of [
  ['cinder-vanguard', 'Cinder Vanguard', { melee: 1.20, meleeReach: 0.35 }, 'Melee damage +20% and reach +0.35 tiles'],
  ['mirage-marksman', 'Mirage Marksman', { ranged: 1.20, arrowSpeed: 1.12 }, 'Ranged damage +20% and arrow speed +12%'],
  ['brine-litany', 'Brine Litany', { magic: 1.20, manaCost: 0.85 }, 'Magic damage +20% and mana cost −15%'],
  ['apiarch-command', 'Apiarch Command', { summoner: 1.20, spiritInterval: 0.86 }, 'Summon damage +20% and time between spirit attacks −14%'],
  ['last-divide-grip', 'Last Divide Grip', { thrower: 1.20, throwSpeed: 1.12 }, 'Throwing damage +20% and throw speed +12%']
].entries()) {
  const leg = CRAFT_TILES.UNDERWORLD_CAMPAIGN.slice(index * 3, index * 3 + 3);
  ACCESSORIES[key] = { name, ...effect, text, colour: leg[0].colour };
  RECIPES.push({ out: { key, kind: 'accessory', count: 1 },
    need: leg.map(encounter => [encounter.trophy, 1]), station: 'anvil' });
}

for (const [index, [key, name, effect, text]] of [
  ['kiln-striders', 'Kiln Striders', { lavaDamage: 0.70, speed: 1.09 }, 'Lava damage −30% and movement speed +9%'],
  ['mirrorstep-brooch', 'Mirrorstep Brooch', { doubleJump: true, fallMul: 0.65 }, 'Double jump and fall damage −35%'],
  ['sluice-divers-lamp', 'Sluice Diver’s Lamp', { breathMul: 2.2, fishingPower: 1.20, glow: 8 }, 'Longer breath, faster bites and emits light'],
  ['sporeheart-clasp', 'Sporeheart Clasp', { regen: 1.32, defense: 9 }, 'Regeneration +32% and defence +9'],
  ['whiteout-pendant', 'Whiteout Pendant', { flightBonus: 0.45, pickup: 1.45 }, 'Longer flight and pickup range +45%']
].entries()) {
  const { trophy, colour, biome } = CRAFT_TILES.UNDERWORLD_DUNGEONS[index];
  ACCESSORIES[key] = { name, ...effect, text, colour };
  RECIPES.push({ out: { key, kind: 'accessory', count: 1 },
    need: [[trophy, 1], [biome + '-bar', 5]], station: 'anvil' });
}

ITEMS['tide-market-scrip'] = { name: 'Tide Market Scrip', kind: 'loot', colour: '#79c8c5' };
ITEMS['lowwater-ledger'] = { name: 'Lowwater Survey Ledger', kind: 'loot', colour: '#e3c38a' };
ITEMS['tideglass-rod'] = { name: 'Tideglass Rod', kind: 'tool', colour: '#83e0d4', rod: true };

for (const [key, name, colour, need] of [
  ['saltroot-rod', 'Saltroot Rod', '#82c2be', [['brine-depths-wood', 8], ['brine-depths-bar', 5], ['rope', 8]]],
  ['kilnline-rod', 'Kilnline Rod', '#ed926d', [['hellfire-rod', 1], ['ember-bloom-bar', 5], ['ember-bloom-relic', 3]]]
]) {
  ITEMS[key] = { name, kind: 'tool', colour, rod: true };
  RECIPES.push({ out: { key, kind: 'tool', count: 1 }, need, station: 'anvil' });
}
for (const [key, name, colour, text, effect] of [
  ['sootfin-brooch', 'Sootfin Brooch', '#ba856c', 'Regeneration +22% and emits light', { regen: 1.22, glow: 5 }],
  ['mirror-float', 'Mirror Float', '#edc492', 'Pickup range +30% and fall damage −18%', { pickup: 1.3, fallMul: 0.82 }],
  ['saltlight-locket', 'Saltlight Locket', '#86d5ce', 'Breath lasts 80% longer and emits light', { breathMul: 1.8, glow: 7 }],
  ['kilnline-spool', 'Kilnline Spool', '#f8a47a', 'Lava damage −24% and faster bites', { lavaDamage: 0.76, fishingPower: 1.14 }],
  ['rime-current-band', 'Rime Current Band', '#bfc0ee', 'Faster bites and movement speed +6%', { fishingPower: 1.18, speed: 1.06 }]
]) ACCESSORIES[key] = { name, colour, text, ...effect };

const STARTER_COMBAT_WEAPONS = new Set([
  'wood-sword', 'tin-sword', 'copper-sword', 'iron-sword', 'silver-sword',
  'wood-bow', 'tin-bow', 'copper-bow', 'iron-bow', 'tin-handcannon',
  'spark-wand', 'amethyst-staff', 'topaz-staff', 'sapphire-staff', 'emerald-staff',
  'twig-spirit-focus', 'iron-spirit-focus', 'gold-spirit-focus', 'cobalt-spirit-focus', 'emberite-spirit-focus',
  'oak-boomerang', 'tin-knives', 'iron-javelin', 'gold-chakram', 'cobalt-darts'
]);
const COMBAT_BEATS = {
  Break: ['#f1b47e', 'hits harder'],
  Recoil: ['#f2c580', 'pushes you away from the hit'],
  Launch: ['#dbe4a0', 'knocks smaller enemies upward'],
  Frost: ['#9eddf5', 'briefly slows enemies'],
  Spark: ['#ffdf82', 'jumps to a second nearby enemy'],
  Mend: ['#a8e5a0', 'restores health on hit'],
  Ward: ['#c8acf7', 'briefly raises defence on hit'],
  Pull: ['#b5a3e6', 'pulls smaller enemies toward you'],
  Pulse: ['#f295a6', 'splashes around the impact'],
  Focus: ['#8ad4fa', 'restores mana on hit']
};

const BEAT_ORDERS = {
  melee: ['Break', 'Launch', 'Ward', 'Recoil', 'Pull', 'Mend', 'Pulse', 'Frost', 'Spark', 'Focus'],
  ranged: ['Recoil', 'Launch', 'Break', 'Spark', 'Frost', 'Pulse', 'Pull', 'Ward', 'Mend', 'Focus'],
  magic: ['Focus', 'Frost', 'Spark', 'Ward', 'Pulse', 'Break', 'Pull', 'Recoil', 'Launch', 'Mend'],
  summoner: ['Spark', 'Pull', 'Ward', 'Mend', 'Pulse', 'Frost', 'Focus', 'Break', 'Launch', 'Recoil'],
  thrower: ['Launch', 'Pulse', 'Recoil', 'Pull', 'Break', 'Frost', 'Ward', 'Spark', 'Mend', 'Focus']
};
for (const [role, order] of Object.entries(BEAT_ORDERS)) {
  const rhythms = [];
  for (let gap = 1; gap <= 8; gap += 1) {
    for (let first = 0; first < order.length - gap - 1; first += 1) {
      for (let third = first + gap + 1; third < order.length; third += 1) {
        rhythms.push([order[first], order[first + gap], order[third]]);
      }
    }
  }
  const weapons = Object.entries(WEAPONS)
    .filter(([key, weapon]) => classOf(weapon) === role && !STARTER_COMBAT_WEAPONS.has(key))
    .sort((a, b) => Number(!!a[1].underworld) - Number(!!b[1].underworld)
      || a[1].damage - b[1].damage || a[0].localeCompare(b[0], 'en'));
  weapons.forEach(([, weapon], index) => {
    weapon.rhythm = rhythms[(index * 37) % rhythms.length];
  });
}

ITEMS['wildlife-trace'] = { name: 'Wildlife Trace', kind: 'loot', colour: '#bba787',
  text: 'Natural material used to furnish a terrarium.' };
RECIPES.push(
  { out: { key: 'empty-terrarium', kind: 'block', count: 1 }, need: [['glass', 5], ['wildlife-trace', 3]], station: 'workbench' },
  { out: { key: 'torch', kind: 'block', count: 6 }, need: [['rottenflesh', 2], ['#wood', 1]], station: null },
  { out: { key: 'lantern', kind: 'block', count: 2 }, need: [['shadowscale', 2], ['glass', 2], ['torch', 2]], station: 'anvil' }
);

function registerEnemyBanners(roster) {
  for (const spec of roster) {
    ITEMS['banner-' + spec.key] = { name: spec.name + ' Banner', kind: 'block', colour: spec.colour,
      banner: spec.key, text: 'Hang from a wall or ceiling. Nearby hits deal 15% more to this enemy.' };
  }
}

function earnedEnemyBanners(spec, defeated, caught, bossCleared) {
  if (spec.boss) return defeated > 0 || bossCleared ? 1 : 0;
  return Math.floor((spec.passive ? caught : defeated) / (spec.passive ? 25 : 50));
}

for (const trial of CRAFT_TILES.PORTAL_TRIALS) {
  const activator = trial.reward === 'portal-activator';
  ITEMS[trial.reward] = { name: activator ? 'Portal Activator' : trial.name + ' Fragment',
    kind: 'loot', colour: trial.colour, portalComponent: true,
    text: 'Keep this for the first subworld portal.' };
}

function stationsNear(world, tiles, px, py) {
  const found = new Set();
  const x0 = Math.floor(px) - STATION_REACH_X;
  const x1 = Math.floor(px) + STATION_REACH_X;
  const y0 = Math.floor(py) - STATION_REACH_Y;
  const y1 = Math.floor(py) + STATION_REACH_Y;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const spec = tiles.tile(world.get(x, y));
      if (spec && spec.station) found.add(spec.station);
    }
  }
  return found;
}

// An ingredient key beginning with '#' is a tag: it matches any item carrying that tag
// rather than one exact key. '#wood' is the only one so far, and it is what lets a
// pickaxe be made from whichever tree happened to be nearest without the recipe list
// having to be written out once per species.
const TAGS = {
  // Any fish cooks the same way, so the furnace takes a tag rather than nine recipes.
  '#fish': (key) => ['bass', 'goldfish', 'trout', 'icepike', 'perch', 'piranha',
    'oasiscarp', 'shrimp', 'swordfish', 'rotgill', 'cavefish', 'glowfish', 'mudeel',
    'frostminnow', 'shadowcarp', 'deepshrimp'].includes(key)
    || CRAFT_TILES.UNDERWORLD_BIOMES.some(biome => biome.key !== 'ember-bloom' && (biome.fish.key === key || biome.caveFish.key === key)),
  // Everything out of the lava cooks too, and into something better: hell is further to
  // go, and the fish there are worth the trip.
  '#lavafish': (key) => ['flarefin', 'obsidifish', 'magmasnail', 'ember-bloom-fish', 'ember-bloom-cave-fish'].includes(key),
  '#wood': (key) => {
    const spec = CRAFT_TILES.BY_KEY[key];
    return !!(spec && spec.wood && key.endsWith('wood'));
  }
};

// Everything a tag stands for. Tiles and items both, because `#wood` is a family of
// tiles and `#fish` is a family of items, and a tag that could only ever mean tiles would
// have quietly matched nothing at all.
const CRAFT_TAG_MEMBERS = Object.fromEntries(Object.entries(TAGS).map(([tag, matches]) => [
  tag, [...new Set([...CRAFT_TILES.TILES.map(spec => spec.key), ...Object.keys(ITEMS)].filter(matches))]
]));

function tagMembers(tag) {
  return CRAFT_TAG_MEMBERS[tag] || [];
}

// How much of an ingredient the inventory holds, counting every member of a tag.
function heldOf(inventory, key) {
  if (key[0] !== '#') return inventory.countOf(key);
  let total = 0;
  for (const member of tagMembers(key)) total += inventory.countOf(member);
  return total;
}

// Spend an ingredient, drawing from whichever tag members are present. Returns what it
// actually took, so a refund can put back exactly that.
function spend(inventory, key, count, range) {
  if (key[0] !== '#') {
    inventory.take(key, count, range);
    return [[key, count]];
  }
  const taken = [];
  let left = count;
  for (const member of tagMembers(key)) {
    if (left <= 0) break;
    const have = inventory.countOf(member);
    if (have <= 0) continue;
    const use = Math.min(have, left);
    inventory.take(member, use);
    taken.push([member, use]);
    left -= use;
  }
  return taken;
}

function tinkerIngredientRange(inventory, recipe) {
  if (recipe.station !== 'tinkers-workshop' || !inventory.sections?.main) return undefined;
  return { from: inventory.sections.hotbar?.from ?? inventory.sections.main.from, to: inventory.sections.main.to };
}

function canAfford(inventory, recipe) {
  const range = tinkerIngredientRange(inventory, recipe);
  return recipe.need.every(([key, count]) =>
    (range ? inventory.countOf(key, range) : heldOf(inventory, key)) >= count);
}

// Terraria shows a recipe only once you hold all of it, so the list never advertises what
// you cannot do. `stations` is a Set, or null for by-hand recipes only.
function available(inventory, stations) {
  return RECIPES.filter(r => {
    if (r.station && !(stations && stations.has(r.station))) return false;
    return canAfford(inventory, r);
  });
}

// Everything a station could make, afforded or not: used to explain an empty list.
function atStation(stations) {
  return RECIPES.filter(r => !r.station || (stations && stations.has(r.station)));
}

function craft(inventory, recipe) {
  if (!canAfford(inventory, recipe)) return false;
  // Take the cost first; if the result will not fit, put back exactly what was taken,
  // which for a tag means the same species it came from rather than an arbitrary one.
  const taken = [];
  const range = tinkerIngredientRange(inventory, recipe);
  for (const [key, count] of recipe.need) {
    for (const entry of spend(inventory, key, count, range)) taken.push(entry);
  }
  const left = inventory.add({ key: recipe.out.key, kind: recipe.out.kind }, recipe.out.count);
  if (left > 0) {
    inventory.take(recipe.out.key, recipe.out.count - left);
    for (const [key, count] of taken) inventory.add({ key, kind: kindOf(key) }, count);
    return false;
  }
  return true;
}

// A key's kind, so refunds and drops rebuild the same item they came from.
function kindOf(key) {
  if (CRAFT_TILES.MULTI && CRAFT_TILES.MULTI[key]) return 'block';
  if (ACCESSORIES[key]) return 'accessory';
  if (ARMOUR[key]) return 'armor';
  if (WEAPONS[key]) return 'tool';
  if (ITEMS[key]) return ITEMS[key].kind;
  if (CRAFT_TOOLS[key]) return 'tool';
  if (CRAFT_WALLS[key]) return 'wall';
  return 'block';
}



// Tags need names of their own: the crafting list shows what a recipe costs, and "#fish"
// is not something to show a player. Kept beside the tag table rather than inside it so
// a tag is a predicate and nothing else.
const TAG_NAMES = { '#wood': 'Wood', '#fish': 'Fish', '#lavafish': 'Lava Fish' };

function nameOf(key, tiles) {
  if (TAG_NAMES[key]) return TAG_NAMES[key];
  if (CRAFT_TILES.MULTI && CRAFT_TILES.MULTI[key]) return CRAFT_TILES.MULTI[key].name;
  if (ACCESSORIES[key]) return ACCESSORIES[key].name;
  if (ARMOUR[key]) return ARMOUR[key].name;
  if (WEAPONS[key]) return WEAPONS[key].name;
  if (ITEMS[key]) return ITEMS[key].name;
  if (CRAFT_TOOLS[key]) return CRAFT_TOOLS[key].name;
  if (tiles) {
    const spec = tiles.BY_KEY[key];
    if (spec) return spec.name;
  }
  if (CRAFT_WALLS[key]) return CRAFT_WALLS[key].name;
  return key;
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
// Each chapter's optional fights unlock after its main fight. They never gate the
// next chapter. Keep the journal and summon checks on the same order.
const HARDMODE_TRIO = ['glasscolossus', 'coilserpent', 'zenithengine'];

const BOSS_CHAPTERS = [
  ['kingslime', 'briarwarden', 'windmillwarden', 'mirebrood'],
  ['hollloweye', 'dungeonkeeper', 'thunderbird', 'desertscourge', 'rimehorn', 'pinemaw', 'orchidqueen',
    'reedking', 'claybehemoth', 'sunmane', 'cragbreaker', 'breakwatercrab'],
  ['furnacewarden', 'railbreaker', 'rootcrown', 'aurorawraith', 'winterroot', 'amberroot', 'fenwidow',
    'granitecolossus', 'cairnshade', 'ochredrake', 'sunscarab', 'buriedstandard',
    'sporecrown', 'bloodcrest', 'reefleviathan', 'saltmarrow'],
  ['ashguardian', 'hollowroot', 'veinwarden', 'abyssaleye'],
  ['voidsovereign'],
  ['riftarchon'],
  ['prismsentinel', 'ossuarymechanist', ...HARDMODE_TRIO],
  ['starwyvern'],
  ['foundrywarden', 'lenscustodian', 'drownedarchivist'],
  ['astralregent']
];

const BOSS_PREREQUISITES = new Map();
for (const [index, [main, ...optional]] of BOSS_CHAPTERS.entries()) {
  BOSS_PREREQUISITES.set(main, BOSS_CHAPTERS[index - 1]?.[0] || null);
  for (const boss of optional) BOSS_PREREQUISITES.set(boss, main);
}

for (const [index, encounter] of CRAFT_TILES.UNDERWORLD_CAMPAIGN.entries()) {
  BOSS_PREREQUISITES.set(encounter.key, CRAFT_TILES.UNDERWORLD_CAMPAIGN[index - 1]?.key || null);
}

function bossPrerequisite(key, defeated) {
  const required = BOSS_PREREQUISITES.get(key);
  if (required && !defeated.has(required)) return required;
  if (key === 'drownedarchivist' && !defeated.has('lenscustodian')) return 'lenscustodian';
  if (key === 'starwyvern') return HARDMODE_TRIO.find(boss => !defeated.has(boss)) || null;
  return null;
}

function restoreBossProgress(saved) {
  const defeated = new Set(saved || []);
  let latest = -1;
  for (const [index, [main]] of BOSS_CHAPTERS.entries()) {
    if (defeated.has(main)) latest = index;
  }
  // Older worlds could fight these out of order. A recorded later main win
  // preserves access to earlier chapters when those worlds load.
  for (let i = 0; i < latest; i += 1) defeated.add(BOSS_CHAPTERS[i][0]);
  return defeated;
}

const EXPORTS_craft = { RECIPES, ITEMS, BOSS_CHAPTERS, HARDMODE_TRIO, bossPrerequisite, restoreBossProgress, WEAPONS, ARMOUR, ARMOUR_TIERS, ARMOUR_PIECES,
  ACCESSORIES, setBonusFor, equipEffects, TAGS, tagMembers, heldOf, spend, STATION_REACH_X, STATION_REACH_Y,
    stationsNear, canAfford, available, atStation, craft, kindOf, nameOf,
    classOf, dropOnly, registerEnemyBanners, earnedEnemyBanners, COMBAT_BEATS, AMMO, bestAmmo, grappleOf, describe,
    EFFECT_FIELDS, baseEffects, applyEffect };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_craft;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.craft = EXPORTS_craft;
}
