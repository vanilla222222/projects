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
  arrow: { name: 'Arrow', kind: 'ammo', colour: '#b9a271' }
};

// Armour. Four pieces rather than Terraria's three, because boots were asked for, and
// each contributes defence: every two points of defence takes one point off an incoming
// hit, to a floor of one, so armour never makes you untouchable.
const ARMOUR = {
  'wood-helmet': { name: 'Wooden Helmet', slot: 'head', defense: 2, colour: '#8a6038' },
  'wood-chest': { name: 'Wooden Breastplate', slot: 'chest', defense: 3, colour: '#8a6038' },
  'wood-legs': { name: 'Wooden Greaves', slot: 'legs', defense: 2, colour: '#8a6038' },
  'wood-boots': { name: 'Wooden Boots', slot: 'feet', defense: 1, colour: '#8a6038' }
};

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
  'emberite-sword': { name: 'Emberite Sword', damage: 78, useTime: 0.18, reach: 3.6 }
};

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
  { out: { key: 'wood-helmet', kind: 'armor', count: 1 }, need: [['#wood', 20]], station: 'workbench' },
  { out: { key: 'wood-chest', kind: 'armor', count: 1 }, need: [['#wood', 30]], station: 'workbench' },
  { out: { key: 'wood-legs', kind: 'armor', count: 1 }, need: [['#wood', 25]], station: 'workbench' },
  { out: { key: 'wood-boots', kind: 'armor', count: 1 }, need: [['#wood', 15]], station: 'workbench' },

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
    { out: { key: w.key + 'bench', kind: 'block', count: 1 }, need: [[wood, 10]], station: null }
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
  if (ARMOUR[key]) return 'armor';
  if (WEAPONS[key]) return 'tool';
  if (ITEMS[key]) return ITEMS[key].kind;
  if (CRAFT_TOOLS[key]) return 'tool';
  if (CRAFT_WALLS[key]) return 'wall';
  return 'block';
}



function nameOf(key, tiles) {
  if (key === '#wood') return 'Wood';
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
const EXPORTS_craft = { RECIPES, ITEMS, WEAPONS, ARMOUR, TAGS, tagMembers, heldOf, spend, STATION_REACH_X, STATION_REACH_Y,
    stationsNear, canAfford, available, atStation, craft, kindOf, nameOf };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_craft;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.craft = EXPORTS_craft;
}
