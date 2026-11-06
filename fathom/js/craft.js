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
    text: 'Restores 60 mana' }
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
  'cloud-charm': { name: 'Cloud Charm', colour: '#dfe7f2', text: 'Jump a second time in mid-air', doubleJump: true },
  'diving-gear': { name: 'Diving Gear', colour: '#4f9fd8', text: 'Breath lasts three times as long', breathMul: 3 },
  'feather-fall': { name: 'Feather Charm', colour: '#d8d2c2', text: 'Falls hurt far less', fallMul: 0.25 },
  'miners-charm': { name: "Miner's Charm", colour: '#c9a542', text: 'Mining power +15%', power: 1.15 },
  'swift-boots': { name: 'Swift Boots', colour: '#b5733c', text: 'Move 20% faster', speed: 1.2 },
  'shellguard': { name: 'Shellguard', colour: '#e8d8c6', text: 'Defence +5', defense: 5 },
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
  'demon-heart': { name: 'Demon Heart', colour: '#9c3f6a', text: 'Magic hits 18% harder', magic: 1.18, drop: 'demon' }
};

// Every effect the worn equipment adds up to. One function, so the game never has to
// remember which piece grants what.
function equipEffects(wornArmour, wornAccessories) {
  const out = { defense: 0, speed: 1, power: 1, swing: 1, regen: 1, pickup: 1,
    breathMul: 1, fallMul: 1, doubleJump: false, fireproof: false, glow: 0, bonus: null,
    // One multiplier per damage class, plus the two numbers that decide whether magic is
    // worth using at all: what a spell costs and how fast the pool comes back.
    melee: 1, ranged: 1, magic: 1, manaCost: 1, manaRegen: 1, arrowSpeed: 1 };
  for (const key of wornArmour) {
    const piece = key && ARMOUR[key];
    if (piece) out.defense += piece.defense;
  }
  for (const key of wornAccessories) {
    const acc = key && ACCESSORIES[key];
    if (!acc) continue;
    if (acc.defense) out.defense += acc.defense;
    if (acc.speed) out.speed *= acc.speed;
    if (acc.power) out.power *= acc.power;
    if (acc.breathMul) out.breathMul *= acc.breathMul;
    if (acc.fallMul) out.fallMul *= acc.fallMul;
    if (acc.doubleJump) out.doubleJump = true;
    if (acc.fireproof) out.fireproof = true;
    if (acc.glow) out.glow = Math.max(out.glow, acc.glow);
    if (acc.swing) out.swing *= acc.swing;
    if (acc.melee) out.melee *= acc.melee;
    if (acc.ranged) out.ranged *= acc.ranged;
    if (acc.magic) out.magic *= acc.magic;
    if (acc.manaCost) out.manaCost *= acc.manaCost;
    if (acc.manaRegen) out.manaRegen *= acc.manaRegen;
    if (acc.arrowSpeed) out.arrowSpeed *= acc.arrowSpeed;
    if (acc.regen) out.regen *= acc.regen;
  }
  const bonus = setBonusFor(wornArmour);
  if (bonus) {
    out.bonus = bonus;
    if (bonus.defense) out.defense += bonus.defense;
    if (bonus.speed) out.speed *= bonus.speed;
    if (bonus.power) out.power *= bonus.power;
    if (bonus.swing) out.swing *= bonus.swing;
    if (bonus.regen) out.regen *= bonus.regen;
    if (bonus.pickup) out.pickup *= bonus.pickup;
    if (bonus.breath) out.breathMul = Infinity;
    if (bonus.fireproof) out.fireproof = true;
    if (bonus.melee) out.melee *= bonus.melee;
    if (bonus.ranged) out.ranged *= bonus.ranged;
    if (bonus.magic) out.magic *= bonus.magic;
    if (bonus.manaCost) out.manaCost *= bonus.manaCost;
    if (bonus.manaRegen) out.manaRegen *= bonus.manaRegen;
  }
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
  'copper-bow': { name: 'Copper Bow', damage: 14, useTime: 0.38, reach: 30, ranged: true, ammo: 'arrow' },
  'iron-bow': { name: 'Iron Bow', damage: 19, useTime: 0.35, reach: 34, ranged: true, ammo: 'arrow' },
  'bone-bow': { name: 'Bone Bow', damage: 24, useTime: 0.3, reach: 36, ranged: true, ammo: 'arrow' },
  'silver-bow': { name: 'Silver Bow', damage: 28, useTime: 0.3, reach: 38, ranged: true, ammo: 'arrow' },
  'gold-bow': { name: 'Gold Bow', damage: 35, useTime: 0.27, reach: 40, ranged: true, ammo: 'arrow' },
  'cobalt-bow': { name: 'Cobalt Bow', damage: 48, useTime: 0.23, reach: 44, ranged: true, ammo: 'arrow' },
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
  'imp-staff': { name: 'Imp Staff', damage: 50, useTime: 0.26, reach: 30, magic: true, mana: 9, bolt: '#e2743a', drop: 'fireimp' },

  // --- dropped melee ------------------------------------------------------------------
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
  { out: { key: 'anvil', kind: 'block', count: 1 }, need: [['iron-bar', 5]], station: 'workbench' },

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
  { out: { key: 'emberite-bar', kind: 'bar', count: 1 }, need: [['emberite', 5]], station: 'furnace' },
  { out: { key: 'glass', kind: 'block', count: 2 }, need: [['sand', 2]], station: 'furnace' },

  // Anvil: bars into metal tools. Each pickaxe opens the rock that holds the next.
  { out: { key: 'bucket', kind: 'tool', count: 1 }, need: [['iron-bar', 3]], station: 'anvil' },
  { out: { key: 'tin-pick', kind: 'tool', count: 1 }, need: [['tin-bar', 8], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'tin-axe', kind: 'tool', count: 1 }, need: [['tin-bar', 7], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'tin-hammer', kind: 'tool', count: 1 }, need: [['tin-bar', 7], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'tin-sword', kind: 'tool', count: 1 }, need: [['tin-bar', 7], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'copper-pick', kind: 'tool', count: 1 }, need: [['copper-bar', 10], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'copper-axe', kind: 'tool', count: 1 }, need: [['copper-bar', 8], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'copper-hammer', kind: 'tool', count: 1 }, need: [['copper-bar', 8], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'iron-pick', kind: 'tool', count: 1 }, need: [['iron-bar', 12], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'iron-axe', kind: 'tool', count: 1 }, need: [['iron-bar', 10], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'iron-hammer', kind: 'tool', count: 1 }, need: [['iron-bar', 10], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'silver-pick', kind: 'tool', count: 1 }, need: [['silver-bar', 12], ['#wood', 4]], station: 'anvil' },
  { out: { key: 'gold-pick', kind: 'tool', count: 1 }, need: [['gold-bar', 12], ['#wood', 4]], station: 'anvil' },
  { out: { key: 'cobalt-pick', kind: 'tool', count: 1 }, need: [['cobalt-bar', 15], ['#wood', 5]], station: 'anvil' },
  { out: { key: 'emberite-pick', kind: 'tool', count: 1 }, need: [['emberite-bar', 18], ['#wood', 6]], station: 'anvil' },
  { out: { key: 'copper-sword', kind: 'tool', count: 1 }, need: [['copper-bar', 8], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'iron-sword', kind: 'tool', count: 1 }, need: [['iron-bar', 10], ['#wood', 3]], station: 'anvil' },
  { out: { key: 'silver-sword', kind: 'tool', count: 1 }, need: [['silver-bar', 10], ['#wood', 4]], station: 'anvil' },
  { out: { key: 'gold-sword', kind: 'tool', count: 1 }, need: [['gold-bar', 10], ['#wood', 4]], station: 'anvil' },
  { out: { key: 'cobalt-sword', kind: 'tool', count: 1 }, need: [['cobalt-bar', 13], ['#wood', 5]], station: 'anvil' },
  { out: { key: 'emberite-sword', kind: 'tool', count: 1 }, need: [['emberite-bar', 16], ['#wood', 6]], station: 'anvil' }
];

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
  '#wood': (key) => {
    const spec = CRAFT_TILES.BY_KEY[key];
    return !!(spec && spec.wood && key.endsWith('wood'));
  }
};

function tagMembers(tag) {
  const test = TAGS[tag];
  if (!test) return [];
  return CRAFT_TILES.TILES.filter(t => test(t.key)).map(t => t.key);
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



function nameOf(key, tiles) {
  if (key === '#wood') return 'Wood';
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
    classOf, dropOnly, AMMO, bestAmmo };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_craft;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.craft = EXPORTS_craft;
}
