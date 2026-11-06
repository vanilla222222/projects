'use strict';
// Tile registry. `solid` blocks movement, `opacity` is how much light a tile removes per
// step, `emit` is the light a tile produces, `hardness` is mining time in seconds with a
// base pickaxe. Colours are the base used to bake procedural textures, so the game needs
// no image assets at all.

const AIR = 0;
const TILES = [
  { id: 0, key: 'air', name: 'Air', solid: false, opacity: 0, emit: 0, hardness: 0, colour: null },
  { id: 1, key: 'dirt', name: 'Dirt', solid: true, opacity: 48, emit: 0, hardness: 0.35, colour: '#6b4a2f', grain: 0.14 , toughness: 100 },
  { id: 2, key: 'grass', name: 'Grass', solid: true, opacity: 48, emit: 0, hardness: 0.35, colour: '#4f7d35', grain: 0.16 , toughness: 100 , grassTop: true, soil: '#6b4a2f' },
  { id: 3, key: 'stone', name: 'Stone', solid: true, opacity: 56, emit: 0, hardness: 0.9, colour: '#6e6e78', grain: 0.11 , toughness: 100 },
  { id: 4, key: 'clay', name: 'Clay', solid: true, opacity: 48, emit: 0, hardness: 0.5, colour: '#9c5c44', grain: 0.1 , toughness: 90 },
  { id: 5, key: 'sand', name: 'Sand', solid: true, opacity: 44, emit: 0, hardness: 0.3, colour: '#cbb279', grain: 0.12 , toughness: 80 },
  { id: 6, key: 'snow', name: 'Snow', solid: true, opacity: 40, emit: 0, hardness: 0.3, colour: '#dde7ef', grain: 0.08 , toughness: 80 },
  { id: 7, key: 'ice', name: 'Ice', solid: true, opacity: 24, emit: 0, hardness: 0.6, colour: '#9fc6dd', grain: 0.07 },
  { id: 8, key: 'granite', name: 'Granite', solid: true, opacity: 60, emit: 0, hardness: 1.3, colour: '#55506b', grain: 0.13 , toughness: 150 },
  { id: 9, key: 'basalt', name: 'Basalt', solid: true, opacity: 64, emit: 0, hardness: 1.8, colour: '#3a3740', grain: 0.12 , require: 45 , toughness: 210 },
  { id: 10, key: 'slate', name: 'Deep Slate', solid: true, opacity: 64, emit: 0, hardness: 2.2, colour: '#2f3440', grain: 0.1 , require: 65 , toughness: 300 },
  { id: 11, key: 'copper', name: 'Copper Ore', solid: true, opacity: 56, emit: 0, hardness: 1.1, colour: '#b5703c', grain: 0.2, ore: true , toughness: 110 },
  { id: 12, key: 'iron', name: 'Iron Ore', solid: true, opacity: 56, emit: 0, hardness: 1.5, colour: '#a08a7a', grain: 0.2, ore: true , toughness: 130 },
  { id: 13, key: 'silver', name: 'Silver Ore', solid: true, opacity: 56, emit: 0, hardness: 1.9, colour: '#c3cdd6', grain: 0.22, ore: true , require: 35 , toughness: 160 },
  { id: 14, key: 'gold', name: 'Gold Ore', solid: true, opacity: 56, emit: 0, hardness: 2.3, colour: '#d7ab46', grain: 0.22, ore: true , require: 45 , toughness: 190 },
  { id: 15, key: 'cobalt', name: 'Cobalt Ore', solid: true, opacity: 56, emit: 0, hardness: 3, colour: '#3f7fb5', grain: 0.24, ore: true , require: 65 , toughness: 250 },
  { id: 16, key: 'emberite', name: 'Emberite Ore', solid: true, opacity: 56, emit: 3, hardness: 3.6, colour: '#c6482c', grain: 0.26, ore: true , require: 100 , toughness: 330 },
  { id: 17, key: 'wood', name: 'Wood', solid: true, opacity: 40, emit: 0, hardness: 0.5, colour: '#7a5330', grain: 0.1 , toughness: 90 },
  { id: 18, key: 'leaves', name: 'Leaves', solid: false, opacity: 20, emit: 0, hardness: 0.2, colour: '#3f6b2c', grain: 0.22 },
  { id: 19, key: 'plank', name: 'Plank', solid: true, opacity: 40, emit: 0, hardness: 0.6, colour: '#9a6c3f', grain: 0.07 },
  { id: 20, key: 'brick', name: 'Stone Brick', solid: true, opacity: 60, emit: 0, hardness: 1.4, colour: '#777281', grain: 0.06 },
  { id: 21, key: 'torch', name: 'Torch', solid: false, opacity: 0, emit: 14, hardness: 0.05, colour: '#ffb347', grain: 0 },
  { id: 22, key: 'lantern', name: 'Lantern', solid: false, opacity: 0, emit: 18, hardness: 0.1, colour: '#ffd98a', grain: 0 },
  { id: 23, key: 'glowmoss', name: 'Glowmoss', solid: false, opacity: 4, emit: 8, hardness: 0.15, colour: '#5fe0b0', grain: 0.2 },
  { id: 24, key: 'crystal', name: 'Cave Crystal', solid: true, opacity: 12, emit: 11, hardness: 1.2, colour: '#8fa8ff', grain: 0.18 , require: 45 , toughness: 160 },
  { id: 25, key: 'mushroom', name: 'Glowcap', solid: false, opacity: 4, emit: 7, hardness: 0.1, colour: '#b58ae0', grain: 0.2 },
  { id: 26, key: 'vine', name: 'Vine', solid: false, opacity: 12, emit: 0, hardness: 0.1, colour: '#4a7a30', grain: 0.2 },
  { id: 27, key: 'trunk', name: 'Tree Trunk', solid: false, opacity: 26, emit: 0, hardness: 0.5, colour: '#7a5330', grain: 0.1, drops: 'wood' },
  { id: 28, key: 'glass', name: 'Glass', solid: true, opacity: 6, emit: 0, hardness: 0.4, colour: '#c8e4ef', grain: 0.03 },
  // Crafting stations. Terraria's are multi-tile furniture; Fathom's occupy one tile each
  // and are walked through rather than stood on, so a station never blocks a tunnel.
  // `station` is the name recipes ask for. REFERENCE.md lists this as a departure.
  { id: 29, key: 'workbench', name: 'Work Bench', solid: false, opacity: 8, emit: 0, hardness: 0.2, colour: '#8a6038', grain: 0.12, toughness: 60, station: 'workbench' },
  { id: 30, key: 'furnace', name: 'Furnace', solid: false, opacity: 8, emit: 10, hardness: 0.4, colour: '#6a5348', grain: 0.14, toughness: 90, station: 'furnace' },
  { id: 31, key: 'anvil', name: 'Iron Anvil', solid: false, opacity: 8, emit: 0, hardness: 0.6, colour: '#71737d', grain: 0.1, toughness: 120, station: 'anvil' },

  // Water. Static for now: it fills a basin to sea level and does not flow, so an ocean is
  // a real body of water you swim through rather than an empty pit. `liquid` marks it for
  // the renderer, which draws it translucent over whatever wall is behind.
  { id: 32, key: 'water', name: 'Water', solid: false, opacity: 12, emit: 0, hardness: 0, colour: '#2f6ea8', grain: 0, liquid: true, toughness: 20 },

  // Jungle and marsh ground.
  { id: 33, key: 'mud', name: 'Mud', solid: true, opacity: 50, emit: 0, hardness: 0.4, colour: '#4e3a2a', grain: 0.13, toughness: 95 },
  { id: 34, key: 'junglegrass', name: 'Jungle Grass', solid: true, opacity: 50, emit: 0, hardness: 0.4, colour: '#3f7a2e', grain: 0.17, toughness: 95, drops: 'mud' , grassTop: true, soil: '#4e3a2a' },
  { id: 35, key: 'peat', name: 'Peat', solid: true, opacity: 52, emit: 0, hardness: 0.4, colour: '#3b3324', grain: 0.15, toughness: 90 },

  // The two blights. Both generate, because an endless world never has to choose.
  { id: 36, key: 'blight', name: 'Blightstone', solid: true, opacity: 60, emit: 0, hardness: 1.6, colour: '#4a3f63', grain: 0.12, require: 45, toughness: 220 },
  { id: 37, key: 'blightgrass', name: 'Blighted Grass', solid: true, opacity: 52, emit: 0, hardness: 0.5, colour: '#6a5a8c', grain: 0.16, toughness: 110, drops: 'dirt' , grassTop: true, soil: '#3a3148' },
  { id: 38, key: 'flesh', name: 'Fleshstone', solid: true, opacity: 60, emit: 0, hardness: 1.6, colour: '#6e2f33', grain: 0.12, require: 45, toughness: 220 },
  { id: 39, key: 'fleshgrass', name: 'Fleshy Grass', solid: true, opacity: 52, emit: 0, hardness: 0.5, colour: '#9c3f45', grain: 0.16, toughness: 110, drops: 'dirt' , grassTop: true, soil: '#4a2426' },

  // Badlands strata and the shore.
  { id: 40, key: 'redclay', name: 'Red Clay', solid: true, opacity: 50, emit: 0, hardness: 0.6, colour: '#a85436', grain: 0.11, toughness: 100 },
  { id: 41, key: 'sandstone', name: 'Sandstone', solid: true, opacity: 58, emit: 0, hardness: 1, colour: '#9c8150', grain: 0.1, toughness: 130 },
  { id: 42, key: 'saltcrust', name: 'Salt Crust', solid: true, opacity: 46, emit: 0, hardness: 0.5, colour: '#d8d2c0', grain: 0.09, toughness: 90 },

  // Foliage and surface props. All non-solid and all `decor`, which means one swing takes
  // them whatever you are holding, they never block movement, and they are swept away if
  // the block they stand on is mined. Each biome plants its own, which is most of what
  // makes two patches of grass read as two different places.
  { id: 43, key: 'tuft', name: 'Grass Tuft', solid: false, opacity: 0, emit: 0, hardness: 0.05, colour: '#5f9b3c', grain: 0, decor: true, drops: null },
  { id: 44, key: 'flower', name: 'Wildflower', solid: false, opacity: 0, emit: 0, hardness: 0.05, colour: '#d9d06a', grain: 0, decor: true },
  { id: 45, key: 'jungletuft', name: 'Jungle Fern', solid: false, opacity: 0, emit: 0, hardness: 0.05, colour: '#49a23a', grain: 0, decor: true, drops: null },
  { id: 46, key: 'bamboo', name: 'Bamboo', solid: false, opacity: 4, emit: 0, hardness: 0.2, colour: '#8fb24a', grain: 0, decor: true, toughness: 40 },
  { id: 47, key: 'cactus', name: 'Cactus', solid: false, opacity: 6, emit: 0, hardness: 0.3, colour: '#4f7f46', grain: 0, decor: true, toughness: 50 },
  { id: 48, key: 'deadbush', name: 'Dead Bush', solid: false, opacity: 0, emit: 0, hardness: 0.05, colour: '#8a6b42', grain: 0, decor: true, drops: null },
  { id: 49, key: 'shell', name: 'Shell', solid: false, opacity: 0, emit: 0, hardness: 0.05, colour: '#e8d8c6', grain: 0, decor: true },
  { id: 50, key: 'seaweed', name: 'Seaweed', solid: false, opacity: 2, emit: 0, hardness: 0.05, colour: '#3f7a5c', grain: 0, decor: true, drops: null },
  { id: 51, key: 'coral', name: 'Coral', solid: false, opacity: 2, emit: 1, hardness: 0.2, colour: '#d9686f', grain: 0, decor: true },
  { id: 52, key: 'blightshroom', name: 'Blight Cap', solid: false, opacity: 0, emit: 6, hardness: 0.05, colour: '#9b74d8', grain: 0, decor: true },
  { id: 53, key: 'fleshshroom', name: 'Crimson Cap', solid: false, opacity: 0, emit: 6, hardness: 0.05, colour: '#d8565e', grain: 0, decor: true },
  { id: 54, key: 'frostshard', name: 'Frost Shard', solid: false, opacity: 2, emit: 2, hardness: 0.1, colour: '#b8dff0', grain: 0, decor: true },
  { id: 55, key: 'reeds', name: 'Reeds', solid: false, opacity: 2, emit: 0, hardness: 0.05, colour: '#7c8f3e', grain: 0, decor: true, drops: null },

  // Blighted wood, so a blighted tree stops looking like an ordinary one.
  { id: 56, key: 'blighttrunk', name: 'Blighted Trunk', solid: false, opacity: 26, emit: 0, hardness: 0.5, colour: '#564770', grain: 0.1, drops: 'wood', toughness: 90 },
  { id: 57, key: 'fleshtrunk', name: 'Crimson Trunk', solid: false, opacity: 26, emit: 0, hardness: 0.5, colour: '#6d3338', grain: 0.1, drops: 'wood', toughness: 90 }
];

// Walls are the background layer. A tile can hold a wall and a block at once: the block is
// what you collide with, the wall is what remains behind when you mine the block out, and it
// is what makes a dug tunnel read as carved rock rather than a hole in the image.
const NO_WALL = 0;
const WALLS = [
  { id: 0, key: 'none', name: 'None', colour: null, opacity: 0 },
  { id: 1, key: 'dirtwall', name: 'Dirt Wall', colour: '#3a2d24', opacity: 7, natural: true },
  { id: 2, key: 'stonewall', name: 'Stone Wall', colour: '#2f2f38', opacity: 8, natural: true },
  { id: 3, key: 'granitewall', name: 'Granite Wall', colour: '#2b2838', opacity: 8, natural: true },
  { id: 4, key: 'basaltwall', name: 'Basalt Wall', colour: '#231f26', opacity: 9, natural: true },
  { id: 5, key: 'slatewall', name: 'Slate Wall', colour: '#1b1f27', opacity: 9, natural: true },
  { id: 6, key: 'sandwall', name: 'Sandstone Wall', colour: '#5f5231', opacity: 7, natural: true },
  { id: 7, key: 'snowwall', name: 'Snow Wall', colour: '#6a7682', opacity: 6, natural: true },
  { id: 8, key: 'plankwall', name: 'Plank Wall', colour: '#4a3420', opacity: 7 },
  { id: 9, key: 'brickwall', name: 'Brick Wall', colour: '#3b3741', opacity: 8 },
  { id: 10, key: 'glasswall', name: 'Glass Wall', colour: '#39525c', opacity: 2 },
  { id: 11, key: 'mudwall', name: 'Mud Wall', colour: '#2e241a', opacity: 7, natural: true },
  { id: 12, key: 'blightwall', name: 'Blight Wall', colour: '#2c2440', opacity: 7, natural: true },
  { id: 13, key: 'fleshwall', name: 'Flesh Wall', colour: '#401c20', opacity: 7, natural: true },
  { id: 14, key: 'redclaywall', name: 'Red Clay Wall', colour: '#5e2f1e', opacity: 7, natural: true },
  { id: 15, key: 'sandstonewall', name: 'Sandstone Wall', colour: '#5a4a2e', opacity: 7, natural: true }
];

const WALL_BY_KEY = {};
for (const wall of WALLS) WALL_BY_KEY[wall.key] = wall;

function wall(id) {
  return WALLS[id] || WALLS[0];
}

function wallOpacityOf(id) {
  return wall(id).opacity || 0;
}

function wallIdOf(key) {
  const found = WALL_BY_KEY[key];
  if (!found) throw new Error('unknown wall key: ' + key);
  return found.id;
}

const BY_KEY = {};
for (const tile of TILES) BY_KEY[tile.key] = tile;

function tile(id) {
  return TILES[id] || TILES[0];
}

function isSolid(id) {
  return tile(id).solid;
}

function opacityOf(id) {
  return tile(id).opacity;
}

function emitOf(id) {
  return tile(id).emit;
}

function idOf(key) {
  const found = BY_KEY[key];
  if (!found) throw new Error('unknown tile key: ' + key);
  return found.id;
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
const EXPORTS_tiles = { AIR, TILES, BY_KEY, tile, isSolid, opacityOf, emitOf, idOf,
    NO_WALL, WALLS, WALL_BY_KEY, wall, wallOpacityOf, wallIdOf };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_tiles;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.tiles = EXPORTS_tiles;
}
