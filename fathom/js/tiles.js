'use strict';
// Tile registry. `solid` blocks movement, `opacity` is how much light a tile removes per
// step, `emit` is the light a tile produces, `hardness` is mining time in seconds with a
// base pickaxe. Colours are the base used to bake procedural textures, so the game needs
// no image assets at all.

const AIR = 0;
const TILES = [
  { id: 0, key: 'air', name: 'Air', solid: false, opacity: 0, emit: 0, hardness: 0, colour: null },
  { id: 1, key: 'dirt', name: 'Dirt', solid: true, opacity: 48, emit: 0, hardness: 0.35, colour: '#6b4a2f', grain: 0.14 },
  { id: 2, key: 'grass', name: 'Grass', solid: true, opacity: 48, emit: 0, hardness: 0.35, colour: '#4f7d35', grain: 0.16 },
  { id: 3, key: 'stone', name: 'Stone', solid: true, opacity: 56, emit: 0, hardness: 0.9, colour: '#6e6e78', grain: 0.11 },
  { id: 4, key: 'clay', name: 'Clay', solid: true, opacity: 48, emit: 0, hardness: 0.5, colour: '#9c5c44', grain: 0.1 },
  { id: 5, key: 'sand', name: 'Sand', solid: true, opacity: 44, emit: 0, hardness: 0.3, colour: '#cbb279', grain: 0.12 },
  { id: 6, key: 'snow', name: 'Snow', solid: true, opacity: 40, emit: 0, hardness: 0.3, colour: '#dde7ef', grain: 0.08 },
  { id: 7, key: 'ice', name: 'Ice', solid: true, opacity: 24, emit: 0, hardness: 0.6, colour: '#9fc6dd', grain: 0.07 },
  { id: 8, key: 'granite', name: 'Granite', solid: true, opacity: 60, emit: 0, hardness: 1.3, colour: '#55506b', grain: 0.13 },
  { id: 9, key: 'basalt', name: 'Basalt', solid: true, opacity: 64, emit: 0, hardness: 1.8, colour: '#3a3740', grain: 0.12 },
  { id: 10, key: 'slate', name: 'Deep Slate', solid: true, opacity: 64, emit: 0, hardness: 2.2, colour: '#2f3440', grain: 0.1 },
  { id: 11, key: 'copper', name: 'Copper Ore', solid: true, opacity: 56, emit: 0, hardness: 1.1, colour: '#b5703c', grain: 0.2, ore: true },
  { id: 12, key: 'iron', name: 'Iron Ore', solid: true, opacity: 56, emit: 0, hardness: 1.5, colour: '#a08a7a', grain: 0.2, ore: true },
  { id: 13, key: 'silver', name: 'Silver Ore', solid: true, opacity: 56, emit: 0, hardness: 1.9, colour: '#c3cdd6', grain: 0.22, ore: true },
  { id: 14, key: 'gold', name: 'Gold Ore', solid: true, opacity: 56, emit: 0, hardness: 2.3, colour: '#d7ab46', grain: 0.22, ore: true },
  { id: 15, key: 'cobalt', name: 'Cobalt Ore', solid: true, opacity: 56, emit: 0, hardness: 3, colour: '#3f7fb5', grain: 0.24, ore: true },
  { id: 16, key: 'emberite', name: 'Emberite Ore', solid: true, opacity: 56, emit: 3, hardness: 3.6, colour: '#c6482c', grain: 0.26, ore: true },
  { id: 17, key: 'wood', name: 'Wood', solid: true, opacity: 40, emit: 0, hardness: 0.5, colour: '#7a5330', grain: 0.1 },
  { id: 18, key: 'leaves', name: 'Leaves', solid: false, opacity: 20, emit: 0, hardness: 0.2, colour: '#3f6b2c', grain: 0.22 },
  { id: 19, key: 'plank', name: 'Plank', solid: true, opacity: 40, emit: 0, hardness: 0.6, colour: '#9a6c3f', grain: 0.07 },
  { id: 20, key: 'brick', name: 'Stone Brick', solid: true, opacity: 60, emit: 0, hardness: 1.4, colour: '#777281', grain: 0.06 },
  { id: 21, key: 'torch', name: 'Torch', solid: false, opacity: 0, emit: 14, hardness: 0.05, colour: '#ffb347', grain: 0 },
  { id: 22, key: 'lantern', name: 'Lantern', solid: false, opacity: 0, emit: 18, hardness: 0.1, colour: '#ffd98a', grain: 0 },
  { id: 23, key: 'glowmoss', name: 'Glowmoss', solid: false, opacity: 4, emit: 8, hardness: 0.15, colour: '#5fe0b0', grain: 0.2 },
  { id: 24, key: 'crystal', name: 'Cave Crystal', solid: true, opacity: 12, emit: 11, hardness: 1.2, colour: '#8fa8ff', grain: 0.18 },
  { id: 25, key: 'mushroom', name: 'Glowcap', solid: false, opacity: 4, emit: 7, hardness: 0.1, colour: '#b58ae0', grain: 0.2 },
  { id: 26, key: 'vine', name: 'Vine', solid: false, opacity: 12, emit: 0, hardness: 0.1, colour: '#4a7a30', grain: 0.2 },
  { id: 27, key: 'trunk', name: 'Tree Trunk', solid: false, opacity: 26, emit: 0, hardness: 0.5, colour: '#7a5330', grain: 0.1, drops: 'wood' },
  { id: 28, key: 'glass', name: 'Glass', solid: true, opacity: 6, emit: 0, hardness: 0.4, colour: '#c8e4ef', grain: 0.03 }
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
  { id: 10, key: 'glasswall', name: 'Glass Wall', colour: '#39525c', opacity: 2 }
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AIR, TILES, BY_KEY, tile, isSolid, opacityOf, emitOf, idOf,
    NO_WALL, WALLS, WALL_BY_KEY, wall, wallOpacityOf, wallIdOf };
}
