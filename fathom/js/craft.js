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
  ? require('./tiles.js') : { BY_KEY, TILES, WOODS };
// Resolved at call time rather than at load time. buffs.js is loaded after this file in
// the browser, so naming `BUFFS` here would read a `const` before its declaration and
// throw on load - which is the same trap the two lookups above are written around, and
// which I walked straight into anyway.

const STATION_REACH_X = 5;
const STATION_REACH_Y = 3;

// Items that are not tiles: bars and tools. Tiles supply their own name and colour, so
// only these need a registry. `kind` decides how a slot draws and whether it stacks.
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
  coin: { name: 'Coin', kind: 'coin', colour: '#d8b43c' },

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

// Wearing all four pieces of one metal grants that metal's bonus. A set bonus is what
// makes a complete suit worth the detour rather than four separate upgrades.
function setBonusFor(worn) {
  const tiers = worn.filter(Boolean).map(key => ARMOUR[key] && ARMOUR[key].tier);
  if (tiers.length !== 4 || tiers.some(t => !t || t !== tiers[0])) return null;
  const tier = ARMOUR_TIERS.find(t => t.key === tiers[0]);
  return tier ? tier.bonus : null;
}

// Accessories. The slots have been there since the inventory was built and nothing has
// ever filled them; each of these changes one number the player can feel.
const ACCESSORIES = {
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
  melee: 'mul', ranged: 'mul', magic: 'mul',
  manaCost: 'mul', manaRegen: 'mul', arrowSpeed: 'mul',
  glow: 'max',
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

// Ammunition. A bow fires whatever is best in the backpack rather than whatever slot is
// selected, which is Terraria's rule and spares the player a second hotbar.
const AMMO = {
  arrow: { bonus: 0, colour: '#b9a271', speed: 1 },
  'iron-arrow': { bonus: 7, colour: '#9aa0a8', speed: 1.1 },
  'ember-arrow': { bonus: 14, colour: '#e2743a', speed: 1.15, burns: true }
};

// The best ammunition held, by the damage it adds. `countOf` is passed in rather than an
// inventory, so this is a pure function of what is carried.
function bestAmmo(countOf) {
  let best = null;
  for (const [key, spec] of Object.entries(AMMO)) {
    if (!countOf(key)) continue;
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
    lines.push(cls === 'magic' ? 'Magic weapon'
      : (cls === 'ranged' ? 'Ranged weapon' : 'Melee weapon'));
    lines.push(weapon.damage + ' damage');
    lines.push(weapon.useTime.toFixed(2) + 's per swing');
    if (cls === 'melee') lines.push(weapon.reach.toFixed(1) + ' tiles of reach');
    else lines.push(weapon.reach + ' tiles of range');
    if (weapon.mana) lines.push(weapon.mana + ' mana a shot');
    if (weapon.ammo) lines.push('Fires the best arrow you carry');
    if (weapon.drop) lines.push('Only dropped, never made');
    return { name: nameOf(key, tilesModule), kind, lines };
  }
  const armour = ARMOUR[key];
  if (armour) {
    const tier = ARMOUR_TIERS.find(t => t.key === armour.tier);
    lines.push('Armour, worn on the ' + armour.slot);
    lines.push(armour.defense + ' defence');
    if (tier && tier.bonus) lines.push('Full set: ' + tier.bonus.text);
    return { name: nameOf(key, tilesModule), kind, lines };
  }
  const acc = ACCESSORIES[key];
  if (acc) {
    lines.push('Accessory');
    if (acc.text) lines.push(acc.text);
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
    if (item.use.buff) {
      const table = (typeof require === 'function')
        ? require('./buffs.js').BUFFS
        : (typeof BUFFS === 'undefined' ? {} : BUFFS);
      const buff = table[item.use.buff];
      if (buff) {
        lines.push(buff.text);
        lines.push('Lasts ' + Math.round(buff.seconds / 60) + ' minutes');
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

// Which class a weapon belongs to, which decides which multiplier it is scaled by. Read
// off the weapon rather than stored on it, so a new weapon cannot forget to declare one.
function classOf(weapon) {
  if (!weapon) return 'melee';
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


// Which stations are in reach. Scanning the box is cheap enough to do every frame, and
// doing it that way means a station the player mines out stops counting immediately.
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
    'frostminnow', 'shadowcarp', 'deepshrimp'].includes(key),
  // Everything out of the lava cooks too, and into something better: hell is further to
  // go, and the fish there are worth the trip.
  '#lavafish': (key) => ['flarefin', 'obsidifish', 'magmasnail'].includes(key),
  '#wood': (key) => {
    const spec = CRAFT_TILES.BY_KEY[key];
    return !!(spec && spec.wood && key.endsWith('wood'));
  }
};

// Everything a tag stands for. Tiles and items both, because `#wood` is a family of
// tiles and `#fish` is a family of items, and a tag that could only ever mean tiles would
// have quietly matched nothing at all.
function tagMembers(tag) {
  const test = TAGS[tag];
  if (!test) return [];
  const out = [];
  for (const spec of CRAFT_TILES.TILES) if (test(spec.key)) out.push(spec.key);
  for (const key of Object.keys(ITEMS)) if (test(key) && out.indexOf(key) === -1) out.push(key);
  return out;
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
function spend(inventory, key, count) {
  if (key[0] !== '#') {
    inventory.take(key, count);
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

function canAfford(inventory, recipe) {
  return recipe.need.every(([key, count]) => heldOf(inventory, key) >= count);
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
  for (const [key, count] of recipe.need) {
    for (const entry of spend(inventory, key, count)) taken.push(entry);
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
const EXPORTS_craft = { RECIPES, ITEMS, WEAPONS, ARMOUR, ARMOUR_TIERS, ARMOUR_PIECES,
  ACCESSORIES, setBonusFor, equipEffects, TAGS, tagMembers, heldOf, spend, STATION_REACH_X, STATION_REACH_Y,
    stationsNear, canAfford, available, atStation, craft, kindOf, nameOf,
    classOf, dropOnly, AMMO, bestAmmo, grappleOf, describe,
    EFFECT_FIELDS, baseEffects, applyEffect };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_craft;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.craft = EXPORTS_craft;
}
