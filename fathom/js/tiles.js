'use strict';
// Tile registry. `solid` blocks movement, `opacity` is how much light a tile removes per
// step, `emit` is the light a tile produces, `hardness` is mining time in seconds with a
// base pickaxe. Colours are the base used to bake procedural textures, so the game needs
// no image assets at all.

// A local copy of the shading helper. tiles.js is loaded before texture.js and must not
// depend on it; the duplication is four lines and the alternative is a load-order rule.
function shadeHex(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = amount >= 0 ? c + (255 - c) * amount : c * (1 + amount);
    return Math.max(0, Math.min(255, Math.round(v)));
  });
  return '#' + ch.map((c) => c.toString(16).padStart(2, '0')).join('');
}

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
  { id: 12, key: 'iron', name: 'Iron Ore', require: 45, solid: true, opacity: 56, emit: 0, hardness: 1.5, colour: '#a08a7a', grain: 0.2, ore: true , toughness: 130 },
  { id: 13, key: 'silver', name: 'Silver Ore', solid: true, opacity: 56, emit: 0, hardness: 1.9, colour: '#c3cdd6', grain: 0.22, ore: true , require: 55 , toughness: 160 },
  { id: 14, key: 'gold', name: 'Gold Ore', solid: true, opacity: 56, emit: 0, hardness: 2.3, colour: '#d7ab46', grain: 0.22, ore: true , require: 65 , toughness: 190 },
  { id: 15, key: 'cobalt', name: 'Cobalt Ore', solid: true, opacity: 56, emit: 0, hardness: 3, colour: '#3f7fb5', grain: 0.24, ore: true , require: 75 , toughness: 250 },
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
  { id: 57, key: 'fleshtrunk', name: 'Crimson Trunk', solid: false, opacity: 26, emit: 0, hardness: 0.5, colour: '#6d3338', grain: 0.1, drops: 'wood', toughness: 90 },

  // The deep layers. Ash and brimstone are hell's rock; obsidian is what lava leaves
  // where it meets water, and is the hardest thing in the world to cut.
  { id: 58, key: 'ash', name: 'Ash', solid: true, opacity: 52, emit: 0, hardness: 0.6, colour: '#4a4247', grain: 0.14, toughness: 120 },
  { id: 59, key: 'brimstone', name: 'Brimstone', solid: true, opacity: 62, emit: 3, hardness: 2, colour: '#6b3326', grain: 0.13, require: 65, toughness: 280 },
  { id: 60, key: 'obsidian', name: 'Obsidian', solid: true, opacity: 66, emit: 0, hardness: 2.6, colour: '#241f2e', grain: 0.06, require: 75, toughness: 310 },
  { id: 61, key: 'cinderstone', name: 'Cinderstone', solid: true, opacity: 60, emit: 1, hardness: 1.5, colour: '#3b2f33', grain: 0.12, require: 45, toughness: 240 },

  // Lava. A liquid like water, so it flows through the same simulation, but it burns and
  // it lights its own caverns. `hot` is what tells the rest of the game it hurts.
  { id: 62, key: 'lava', name: 'Lava', solid: false, opacity: 10, emit: 11, hardness: 0, colour: '#d2502a', grain: 0, liquid: true, hot: true, toughness: 20 },

  // Sky and space.
  { id: 63, key: 'skystone', name: 'Skystone', solid: true, opacity: 56, emit: 0, hardness: 1.1, colour: '#8d93a8', grain: 0.1, toughness: 140 },
  { id: 64, key: 'starrock', name: 'Starrock', solid: true, opacity: 58, emit: 2, hardness: 1.6, colour: '#4b4a63', grain: 0.12, require: 45, toughness: 200 },
  { id: 65, key: 'tin', name: 'Tin Ore', solid: true, opacity: 56, emit: 0, hardness: 1, colour: '#a9a79c', grain: 0.2, ore: true, toughness: 105 },
  { id: 66, key: 'cloud', name: 'Cloud', solid: true, opacity: 18, emit: 0, hardness: 0.15, colour: '#e8eef6', grain: 0.04, toughness: 40 },

  // Gems. Ores for every purpose that matters - they generate in the same banded blobs,
  // they are drawn the same way, they take a pickaxe - but nothing smelts them: a gem is
  // used as it comes out of the rock. They are what magic is made of.
  { id: 67, key: 'amethyst', name: 'Amethyst', solid: true, opacity: 40, emit: 2, hardness: 1.1, colour: '#9b59d0', grain: 0.16, ore: true, gem: true, toughness: 110 },
  { id: 68, key: 'topaz', name: 'Topaz', solid: true, opacity: 40, emit: 2, hardness: 1.3, colour: '#e0a63c', grain: 0.16, ore: true, gem: true, toughness: 125 },
  { id: 69, key: 'sapphire', name: 'Sapphire', solid: true, opacity: 40, emit: 3, hardness: 1.6, colour: '#3f7fd8', grain: 0.16, ore: true, gem: true, require: 35, toughness: 145 },
  { id: 70, key: 'emerald', name: 'Emerald', solid: true, opacity: 40, emit: 3, hardness: 1.9, colour: '#3fb56a', grain: 0.16, ore: true, gem: true, require: 35, toughness: 165 },
  { id: 71, key: 'ruby', name: 'Ruby', solid: true, opacity: 40, emit: 4, hardness: 2.2, colour: '#d8344c', grain: 0.16, ore: true, gem: true, require: 45, toughness: 185 },
  { id: 72, key: 'diamond', name: 'Diamond', solid: true, opacity: 30, emit: 5, hardness: 2.6, colour: '#bfe8f0', grain: 0.16, ore: true, gem: true, require: 55, toughness: 210 },

  // Rope. Not solid, so it blocks nothing and holds nothing up; `climb` is the whole of
  // it, and the physics reads that flag rather than the tile's identity, so anything
  // climbable added later works the same way for free.
  // Meteorite. It is not generated with the world: a meteor falls where a meteor falls,
  // and the crater is written into the edit diff like anything else the player did.
  { id: 73, key: 'meteorite', name: 'Meteorite', solid: true, opacity: 56, emit: 5, hardness: 2.4, colour: '#8a5c52', grain: 0.2, ore: true, require: 45, toughness: 200 },
  { id: 74, key: 'rope', name: 'Rope', solid: false, opacity: 2, emit: 0, hardness: 0.05, colour: '#b89a62', grain: 0, climb: true, toughness: 10 },

  // A campfire: the first thing in the world that does something simply by being near
  // you rather than by being used.
  { id: 75, key: 'campfire', name: 'Campfire', solid: false, opacity: 0, emit: 13, hardness: 0.2, colour: '#e2743a', grain: 0, toughness: 40 }
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
  { id: 15, key: 'sandstonewall', name: 'Sandstone Wall', colour: '#5a4a2e', opacity: 7, natural: true },
  { id: 16, key: 'ashwall', name: 'Ash Wall', colour: '#2b2529', opacity: 7, natural: true },
  { id: 17, key: 'brimstonewall', name: 'Brimstone Wall', colour: '#3d1d16', opacity: 7, natural: true },
  { id: 18, key: 'skywall', name: 'Sky Wall', colour: '#4c5266', opacity: 6, natural: true }
];

// --- wood species ---------------------------------------------------------------------
// Every tree species yields its own lumber, and every lumber has its own building set:
// a block, a background, a platform, a door, a chair, a table and a work bench. Tools and
// armour are deliberately not on this list - they take any wood, because a progression
// gated on finding the right tree would be tedious rather than interesting.
//
// The set is generated rather than written out, because six species times eight tiles is
// forty-eight entries that must all agree with each other, and a hand-written table of
// that size is a list of chances to make one of them different by accident.
const WOODS = [
  { key: 'oak', name: 'Oak', colour: '#7a5330', tree: 'oak' },
  { key: 'pine', name: 'Pine', colour: '#6a5440', tree: 'pine' },
  { key: 'mahogany', name: 'Mahogany', colour: '#8a4f2e', tree: 'jungle' },
  { key: 'acacia', name: 'Acacia', colour: '#a2763f', tree: 'acacia' },
  { key: 'shade', name: 'Shadewood', colour: '#564770', tree: 'blight' },
  { key: 'crim', name: 'Crimwood', colour: '#6d3338', tree: 'crimson' }
];

const WOOD_BY_TREE = {};
for (const w of WOODS) WOOD_BY_TREE[w.tree] = w;

function pushTile(spec) {
  spec.id = TILES.length;
  TILES.push(spec);
  return spec;
}

// --- multi-tile objects ----------------------------------------------------------------
// A door is three tiles tall and a chest is two by two, but the world stores one byte per
// tile, so an object cannot carry its own extent. Each cell therefore gets its own tile
// id, tagged with which cell of which object it is. From any cell the origin is
// (x - part.dx, y - part.dy), which is all the code needs to use, break or draw the whole
// thing as one piece.
//
// The alternative - one tile id plus a side table of object positions - would need that
// table saved, synchronised with every edit, and consulted on every collision test. Cell
// tiles cost ids, which are cheap here, and nothing else.
function defineMulti(key, name, w, h, build) {
  const cells = [];
  for (let dy = 0; dy < h; dy += 1) {
    for (let dx = 0; dx < w; dx += 1) {
      const spec = build(dx, dy);
      spec.key = key + '_' + dx + dy;
      spec.name = name;
      spec.part = { of: key, dx, dy, w, h };
      cells.push(pushTile(spec));
    }
  }
  MULTI[key] = { key, name, w, h, cells };
  return MULTI[key];
}

const MULTI = {};

// The origin of the object this tile belongs to, or null if it is an ordinary tile.
function originOf(spec, x, y) {
  if (!spec || !spec.part) return null;
  return { x: x - spec.part.dx, y: y - spec.part.dy, of: spec.part.of,
    w: spec.part.w, h: spec.part.h };
}

// The cell tile of a multi-tile object at a given offset.
function cellOf(key, dx, dy) {
  const def = MULTI[key];
  if (!def) return null;
  return def.cells[dy * def.w + dx];
}

for (const w of WOODS) {
  const dark = shadeHex(w.colour, -0.22);
  // The standing trunk. Non-solid, so a forest is never a wall, and it drops its lumber.
  pushTile({ key: w.key + 'log', name: w.name + ' Log', solid: false, opacity: 26, emit: 0,
    hardness: 0.5, colour: w.colour, grain: 0.1, toughness: 90, wood: w.key,
    drops: w.key + 'wood', trunkOf: w.key });
  pushTile({ key: w.key + 'wood', name: w.name + ' Wood', solid: true, opacity: 40, emit: 0,
    hardness: 0.5, colour: w.colour, grain: 0.1, toughness: 90, wood: w.key });
  // A platform: you stand on it from above and walk up through it from below.
  pushTile({ key: w.key + 'platform', name: w.name + ' Platform', solid: false, opacity: 6,
    emit: 0, hardness: 0.3, colour: w.colour, grain: 0.08, toughness: 60, wood: w.key,
    platform: true });
  // A door is one tile wide and three tall, as in Terraria, so a doorway is a doorway
  // rather than a stack of separate hatches each with its own handle.
  defineMulti(w.key + 'door', w.name + ' Door', 1, 3, (dx, dy) => ({
    solid: true, opacity: 34, emit: 0, hardness: 0.5, colour: dark, grain: 0.07,
    toughness: 80, wood: w.key, door: 'closed', swings: w.key + 'dooropen',
    drops: w.key + 'door', doorRow: dy
  }));
  defineMulti(w.key + 'dooropen', w.name + ' Door', 1, 3, (dx, dy) => ({
    solid: false, opacity: 4, emit: 0, hardness: 0.5, colour: dark, grain: 0.07,
    toughness: 80, wood: w.key, door: 'open', swings: w.key + 'door',
    drops: w.key + 'door', doorRow: dy
  }));
  pushTile({ key: w.key + 'chair', name: w.name + ' Chair', solid: false, opacity: 4, emit: 0,
    hardness: 0.2, colour: w.colour, grain: 0.06, toughness: 40, wood: w.key, furniture: 'chair' });
  pushTile({ key: w.key + 'table', name: w.name + ' Table', solid: false, opacity: 8, emit: 0,
    hardness: 0.25, colour: w.colour, grain: 0.06, toughness: 50, wood: w.key, furniture: 'table' });
  // A bed: four wide, two tall, and the thing that makes dying somewhere far from the
  // origin survivable.
  defineMulti(w.key + 'bed', w.name + ' Bed', 4, 2, (dx, dy) => ({
    solid: false, opacity: 8, emit: 0, hardness: 0.3, colour: w.colour, grain: 0.05,
    toughness: 60, wood: w.key, bed: true, drops: w.key + 'bed', bedCell: { dx, dy }
  }));
  pushTile({ key: w.key + 'bench', name: w.name + ' Work Bench', solid: false, opacity: 8,
    emit: 0, hardness: 0.25, colour: w.colour, grain: 0.1, toughness: 60, wood: w.key,
    station: 'workbench', furniture: 'bench' });
}

// Chests. Two by two, with a loot table decided by where they are found: a cabin in the
// caves holds different things from one in the deep. Contents are generated from the
// position rather than stored, like everything else here, and only become an edit once
// the player has taken something out.
const CHESTS = [
  { key: 'woodchest', name: 'Wooden Chest', colour: '#8a6038', band: 'caves' },
  { key: 'ironchest', name: 'Iron Chest', colour: '#8e949e', band: 'deep' },
  { key: 'goldchest', name: 'Gilded Chest', colour: '#c9a542', band: 'rich' }
];

for (const c of CHESTS) {
  defineMulti(c.key, c.name, 2, 2, () => ({
    solid: false, opacity: 10, emit: 0, hardness: 0.4, colour: c.colour, grain: 0.05,
    toughness: 70, chest: c.key, drops: c.key
  }));
}

// A life crystal: two by two, glowing, and the only thing in the world that makes the
// player permanently stronger. Terraria's, and worth copying exactly because it is the
// reward that makes going down worth doing.
defineMulti('lifecrystal', 'Life Crystal', 2, 2, () => ({
  solid: false, opacity: 0, emit: 6, hardness: 0.3, colour: '#e0405c', grain: 0,
  toughness: 50, crystal: 'life', drops: null
}));

// Pots. They stand on cave floors, they break in one hit, and what is in them is decided
// by where they are, so the same pot always holds the same thing.
defineMulti('pot', 'Clay Pot', 1, 1, () => ({
  solid: false, opacity: 2, emit: 0, hardness: 0.05, colour: '#9a6a48', grain: 0.08,
  toughness: 10, pot: true, drops: null
}));

// Append IDs so existing saves retain every previously registered tile.
for (const [key, name, colour, townDevice] of [
  ['town-pylon', 'Town Pylon', '#63d4ba', 'pylon'],
  ['storage-heart', 'Storage Heart', '#c27aee', 'heart'],
  ['storage-unit', 'Storage Unit', '#9a81bc', 'unit'],
  ['storage-vault', 'Reinforced Storage Unit', '#e1a956', 'vault'],
  ['storage-access', 'Storage Access', '#6dace0', 'access'],
  ['storage-crafter', 'Storage Crafting Terminal', '#ee9770', 'crafter']
]) {
  pushTile({ key, name, colour, townDevice, solid: false, opacity: 3, emit: 5, toughness: 65 });
}

for (const [key, name, colour, solid, emit] of [
  ['ashvault-brick', 'Ashvault Brick', '#514152', true, 0],
  ['ashvault-gate', 'Ashvault Gate', '#ab735c', true, 3],
  ['ashvault-spikes', 'Ashvault Spikes', '#cf785a', false, 2],
  ['voidstone', 'Voidstone', '#27233f', true, 0],
  ['void-crystal', 'Void Crystal', '#9c81dc', true, 8]
]) {
  pushTile({ key, name, colour, solid, emit, opacity: solid ? 60 : 2, hardness: 2.8,
    toughness: key === 'void-crystal' ? 410 : 240, require: key === 'void-crystal' ? 125 : 0,
    spikeDamage: key === 'ashvault-spikes' ? 34 : 0,
    drops: key === 'ashvault-gate' ? null : key });
}
defineMulti('ashvault-cache', 'Ashvault Reliquary', 2, 2, () => ({
  solid: false, opacity: 8, emit: 6, hardness: 0.5, colour: '#9d786d',
  toughness: 120, chest: 'ashvault-cache', drops: 'ashvault-cache'
}));
WALLS.push({ id: WALLS.length, key: 'ashvault-wall', name: 'Ashvault Wall', colour: '#302538', opacity: 7 });
WALLS.push({ id: WALLS.length, key: 'void-wall', name: 'Void Wall', colour: '#19172c', opacity: 7 });

pushTile({ key: 'aetherite', name: 'Aetherite Ore', colour: '#8de8d3', solid: true,
  opacity: 56, emit: 5, hardness: 4, toughness: 520, require: 175, basePowerGate: true, ore: true, grain: 0.2 });

defineMulti('forest-mimic', 'Iron Chest', 2, 2, () => ({
  solid: false, opacity: 10, emit: 0, hardness: 0.4, colour: '#8e949e', grain: 0.05,
  toughness: 70, chest: 'forest-mimic', mimic: 'forestmimic', drops: null
}));

defineMulti('desert-mimic', 'Iron Chest', 2, 2, () => ({
  solid: false, opacity: 10, emit: 0, hardness: 0.4, colour: '#8e949e', grain: 0.05,
  toughness: 70, chest: 'desert-mimic', mimic: 'desertmimic', drops: null
}));

defineMulti('tundra-mimic', 'Iron Chest', 2, 2, () => ({
  solid: false, opacity: 10, emit: 0, hardness: 0.4, colour: '#8e949e', grain: 0.05,
  toughness: 70, chest: 'tundra-mimic', mimic: 'tundramimic', drops: null
}));

pushTile({ key: 'glacier-spikes', name: 'Glacier Spikes', colour: '#a2cfdf',
  solid: false, opacity: 2, emit: 2, hardness: 0.4, toughness: 55, spikeDamage: 37 });

defineMulti('jungle-mimic', 'Iron Chest', 2, 2, () => ({
  solid: false, opacity: 10, emit: 0, hardness: 0.4, colour: '#8e949e', grain: 0.05,
  toughness: 70, chest: 'jungle-mimic', mimic: 'junglemimic', drops: null
}));

defineMulti('marsh-mimic', 'Iron Chest', 2, 2, () => ({
  solid: false, opacity: 10, emit: 0, hardness: 0.4, colour: '#8e949e', grain: 0.05,
  toughness: 70, chest: 'marsh-mimic', mimic: 'marshmimic', drops: null
}));

defineMulti('highlands-mimic', 'Iron Chest', 2, 2, () => ({
  solid: false, opacity: 10, emit: 0, hardness: 0.4, colour: '#8e949e', grain: 0.05,
  toughness: 70, chest: 'highlands-mimic', mimic: 'highlandsmimic', drops: null
}));

pushTile({ key: 'hallowgrass', name: 'Hallow Grass', colour: '#aa8bc7', solid: true,
  opacity: 48, emit: 0, hardness: 0.4, grassTop: true, soil: '#755d88', grain: 0.14 });
pushTile({ key: 'prismstone', name: 'Prismstone', colour: '#817298', solid: true,
  opacity: 56, emit: 0, hardness: 2, toughness: 160, grain: 0.18 });
for (const [key, name, colour] of [
  ['ray-crystal', 'Ray Crystal', '#ffd6a1'], ['storm-crystal', 'Storm Crystal', '#8bd4ea'],
  ['ward-crystal', 'Ward Crystal', '#d4a5ef']
]) {
  pushTile({ key, name, colour, solid: true, opacity: 45, emit: 7, hardness: 2.4,
    toughness: 245, require: 175, basePowerGate: true, ore: true, grain: 0.15 });
}
for (const [key, name, colour, require] of [
  ['palladium', 'Palladium Ore', '#cf8457', 200],
  ['mythril', 'Mythril Ore', '#68b9a8', 225],
  ['adamantite', 'Adamantite Ore', '#db6f8b', 255]
]) {
  pushTile({ key, name, colour, solid: true, opacity: 56, emit: 4, hardness: 4,
    toughness: require * 3, require, basePowerGate: true, ore: true, grain: 0.21 });
}

for (const [key, name, colour, solid] of [
  ['dungeon-brick', 'Ossuary Brick', '#47577a', true],
  ['dungeon-gate', 'Ossuary Seal', '#cbad67', true],
  ['dungeon-bell', 'Ossuary Bell', '#e0bf7c', false]
]) pushTile({ key, name, colour, solid, opacity: solid ? 60 : 3, toughness: 240,
  emit: key === 'dungeon-brick' ? 0 : 6, drops: null });
defineMulti('dungeon-cache', 'Gilded Ossuary Cache', 2, 2, () => ({
  solid: false, opacity: 8, emit: 4, colour: '#b99454', toughness: 95, chest: 'dungeon-cache', drops: null
}));
WALLS.push({ id: WALLS.length, key: 'dungeon-wall', name: 'Ossuary Wall', colour: '#252d49', opacity: 7 });

const WORKSHOP_PLANS = [];
function workshopFixture(key, name, colour, fixture, need, station, extra = {}) {
  pushTile({ key, name, colour, fixture, solid: false, opacity: 4,
    toughness: 50, hardness: 0.25, emit: 0, ...extra });
  WORKSHOP_PLANS.push({ out: { key, kind: 'block', count: 1 }, need, station });
}

for (const [key, name, colour, station, need, emit] of [
  ['heavy-workbench', 'Heavy Workbench', '#a48c76', 'workbench', [['#wood', 14], ['iron-bar', 5]], 0],
  ['sawmill', 'Sawmill', '#a47753', 'heavy-workbench', [['#wood', 12], ['iron-bar', 4]], 0],
  ['alchemy-table', 'Alchemy Table', '#79ac9d', 'heavy-workbench', [['glass', 8], ['silver-bar', 3]], 4],
  ['cauldron', 'Cauldron', '#9c7770', 'heavy-workbench', [['stone', 8], ['iron-bar', 6], ['torch', 2]], 6],
  ['loom', 'Loom', '#be9170', 'sawmill', [['#wood', 10], ['rope', 4]], 0]
]) workshopFixture(key, name, colour, key, need, station, { station: key, emit });

const SAWMILL_FIXTURES = [
  ['armchair', 'Armchair', 8, 'chair'], ['stool', 'Stool', 4, 'chair'],
  ['banquet-table', 'Banquet Table', 13, 'table'], ['writing-desk', 'Writing Desk', 9, 'table'],
  ['wardrobe', 'Wardrobe', 10], ['bookcase', 'Bookcase', 10],
  ['dresser', 'Dresser', 8], ['barrel-decor', 'Decorative Barrel', 6],
  ['crate-decor', 'Decorative Crate', 5], ['planter', 'Planter', 5],
  ['trellis', 'Trellis', 6], ['clock', 'Clock', 8],
  ['shield-plaque', 'Shield Plaque', 5], ['figurehead', 'Figurehead', 7],
  ['birdhouse', 'Birdhouse', 5], ['display-stand', 'Display Stand', 6],
  ['rail', 'Decorative Rail', 4], ['coat-rack', 'Coat Rack', 5],
  ['lantern-post', 'Lantern Post', 7], ['candelabra', 'Candelabra', 7],
  ['rocking-chair', 'Rocking Chair', 7, 'chair'], ['settee', 'Settee', 10, 'chair'],
  ['lectern', 'Lectern', 7, 'table'], ['vanity', 'Vanity', 10, 'table'],
  ['sideboard', 'Sideboard', 9, 'table'], ['wine-rack', 'Wine Rack', 8],
  ['tool-rack', 'Tool Rack', 6], ['shutter', 'Shutter', 5],
  ['lattice', 'Lattice Panel', 5], ['wheel', 'Decorative Wheel', 6]
];
for (const wood of WOODS) {
  for (const [shape, name, cost, furniture] of SAWMILL_FIXTURES) {
    const emit = shape === 'lantern-post' || shape === 'candelabra' ? 9 : 0;
    const need = [[wood.key + 'wood', cost]];
    if (emit) need.push(['torch', 1]);
    if (shape === 'clock') need.push(['iron-bar', 1]);
    workshopFixture(wood.key + '-' + shape, wood.name + ' ' + name, wood.colour,
      shape, need, 'sawmill', { furniture, emit });
  }
}

const WORKSHOP_DYES = [
  ['natural', 'Natural', '#dfca9b', null], ['scarlet', 'Scarlet', '#c95668', 'ruby'],
  ['azure', 'Azure', '#5c91d4', 'sapphire'], ['verdant', 'Verdant', '#62ad7f', 'emerald'],
  ['golden', 'Golden', '#e2b559', 'topaz'], ['violet', 'Violet', '#9a70c4', 'amethyst'],
  ['pearl', 'Pearl', '#e1ddd0', 'shell'], ['charcoal', 'Charcoal', '#66647a', 'obsidian']
];
const LOOM_FIXTURES = [
  ['rug', 'Rug', 3], ['curtain', 'Curtain', 3], ['banner', 'Banner', 2],
  ['cushion', 'Cushion', 2], ['tapestry', 'Tapestry', 4],
  ['canopy', 'Canopy', 4], ['screen', 'Folding Screen', 3],
  ['runner', 'Runner', 2], ['valance', 'Valance', 2],
  ['drapes', 'Drapes', 4], ['pennant', 'Pennant', 2],
  ['ottoman', 'Ottoman', 3, 'chair'], ['bolster', 'Bolster', 2],
  ['quilt', 'Quilt Display', 4], ['parasol', 'Parasol', 4]
];
for (const [key, name, colour] of WORKSHOP_DYES) {
  for (const [shape, label, cost, furniture] of LOOM_FIXTURES) {
    const need = [[key + '-fabric', cost]];
    if (['screen', 'canopy', 'ottoman', 'parasol'].includes(shape)) need.push(['#wood', 3]);
    workshopFixture(key + '-' + shape, name + ' ' + label, colour, shape, need, 'loom', { furniture });
  }
}

for (const [material, label, colour, ingredient] of [
  ['stone', 'Stone', '#9a9bac', 'stone'],
  ['gilt', 'Gilt', '#d4aa58', 'gold-bar'],
  ['obsidian', 'Obsidian', '#76658d', 'obsidian']
]) {
  for (const [motif, name] of [
    ['owl', 'Owl'], ['serpent', 'Serpent'], ['knight', 'Knight'],
    ['slime', 'Slime'], ['guardian', 'Guardian'], ['star', 'Star'],
    ['bat', 'Bat'], ['spider', 'Spider'], ['zombie', 'Zombie'], ['mimic', 'Mimic'],
    ['demon-eye', 'Demon Eye'], ['skeleton', 'Skeleton'], ['harpy', 'Harpy'], ['worm', 'Worm'],
    ['lantern-skull', 'Lantern Skull'], ['kingslime', 'King Slime'],
    ['dungeonkeeper', 'Ossuary Keeper'], ['prismsentinel', 'Prism Sentinel']
  ]) workshopFixture(material + '-' + motif + '-statue', label + ' ' + name + ' Statue', colour,
    motif + '-statue', material === 'stone' ? [['stone', 14]] : [[ingredient, material === 'gilt' ? 4 : 10], ['stone', 4]], 'heavy-workbench');
}

for (const glyph of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
  const type = /[0-9]/.test(glyph) ? 'Number' : 'Letter';
  workshopFixture('stone-glyph-' + glyph.toLowerCase(), type + ' ' + glyph + ' Statue',
    '#b4b5c5', 'glyph-statue', [['stone', 6]], 'heavy-workbench', { glyph });
}

const WALL_BY_KEY = {};
for (const w of WOODS) {
  WALLS.push({ id: WALLS.length, key: w.key + 'back', name: w.name + ' Background',
    colour: shadeHex(w.colour, -0.45), opacity: 7, wood: w.key });
}

// Append variants so the numeric IDs already written to world saves stay stable.
const MASONRY_SOURCES = [
  'dirt', 'stone', 'clay', 'sand', 'snow', 'ice', 'granite', 'basalt', 'slate', 'brick',
  'mud', 'peat', 'blight', 'flesh', 'redclay', 'sandstone', 'saltcrust', 'ash', 'brimstone',
  'obsidian', 'cinderstone', 'skystone', 'starrock', 'glass', 'crystal', 'meteorite',
  'voidstone', 'void-crystal', 'prismstone', 'ray-crystal', 'storm-crystal', 'ward-crystal',
  'oakwood', 'pinewood', 'mahoganywood', 'acaciawood', 'shadewood', 'crimwood',
  'copper', 'tin', 'iron', 'silver', 'gold', 'cobalt', 'emberite', 'aetherite',
  'palladium', 'mythril', 'adamantite', 'amethyst', 'topaz', 'sapphire', 'emerald', 'ruby', 'diamond'
];
const masonryIngredients = new Map(TILES.map(spec => [spec.key, spec]));
for (const source of MASONRY_SOURCES) {
  const { name, colour } = masonryIngredients.get(source);
  const polished = 'polished-' + source;
  for (const [key, label, masonry, ingredient] of [
    [polished, 'Polished ' + name, 'polished', source],
    [source + '-masonry-brick', name + ' Masonry Brick', 'brick', polished],
    [source + '-paving', name + ' Pavers', 'paver', polished],
    [source + '-pillar', name + ' Pillar Block', 'pillar', polished]
  ]) {
    pushTile({ key, name: label, colour, masonry, solid: true, opacity: 55,
      toughness: 85, hardness: 1, emit: 0 });
    WORKSHOP_PLANS.push({ out: { key, kind: 'block', count: 4 },
      need: [[ingredient, 4]], station: 'heavy-workbench' });
  }
  const wallKey = source + '-masonry-wall';
  WALLS.push({ id: WALLS.length, key: wallKey, name: name + ' Masonry Wall',
    colour: shadeHex(colour, -0.34), opacity: 7 });
  WORKSHOP_PLANS.push({ out: { key: wallKey, kind: 'wall', count: 4 },
    need: [[source + '-masonry-brick', 1]], station: 'heavy-workbench' });
  for (const [shape, label, cost, furniture] of [
    ['stool', 'Masonry Stool', 4, 'chair'], ['banquet-table', 'Masonry Table', 8, 'table'],
    ['planter', 'Masonry Planter', 5], ['display-stand', 'Masonry Pedestal', 5]
  ]) workshopFixture(source + '-masonry-' + shape, name + ' ' + label,
    colour, shape, [[polished, cost]], 'heavy-workbench', { furniture });
}

for (const [key, name, colour, circuit, need] of [
  ['wire-switch', 'Circuit Switch', '#bfa16d', 'switch', [['iron-bar', 1], ['wire-spool', 2]]],
  ['pressure-plate', 'Pressure Plate', '#b5926b', 'plate', [['iron-bar', 1], ['wire-spool', 2]]],
  ['wire-timer', 'Two-Second Timer', '#9e93c9', 'timer', [['glass', 1], ['silver-bar', 1], ['wire-spool', 3]]],
  ['wire-lamp', 'Circuit Lamp', '#b7a480', 'lamp', [['glass', 2], ['torch', 1], ['wire-spool', 2]]],
  ['dart-trap', 'Right-Facing Dart Trap', '#a89ca4', 'trap', [['iron-bar', 2], ['stone', 4], ['wire-spool', 2]]],
  ['inlet-pump', 'Inlet Pump', '#67b0c7', 'inlet', [['iron-bar', 4], ['wire-spool', 3]]],
  ['outlet-pump', 'Outlet Pump', '#d09264', 'outlet', [['iron-bar', 4], ['wire-spool', 3]]],
  ['actuator-block', 'Retractable Actuator Block', '#7f93a5', 'actuator', [['stone', 2], ['iron-bar', 1], ['wire-spool', 1]]]
]) {
  const pair = circuit === 'lamp' || circuit === 'actuator' ? key + '-on' : undefined;
  const solid = circuit === 'actuator';
  workshopFixture(key, name, colour, key, need, 'heavy-workbench',
    { circuit, circuitPair: pair, solid, opacity: solid ? 55 : 4 });
  if (pair) pushTile({ key: pair, name, colour, fixture: key, circuit,
    circuitPair: key, solid: false, opacity: 4, emit: circuit === 'lamp' ? 11 : 0,
    toughness: 50, hardness: 0.25, drops: key, powered: true });
}

pushTile({ key: 'ossuary-circuit-gate', name: 'Ossuary Circuit Gate', colour: '#729ba4',
  fixture: 'actuator-block', circuit: 'puzzle-gate', solid: true, opacity: 55, drops: null });
defineMulti('ossuary-workshop-cache', 'Mechanist Cache', 2, 2, () => ({
  solid: false, opacity: 8, emit: 4, colour: '#84b6af',
  toughness: 95, chest: 'ossuary-workshop-cache', drops: null
}));

for (const tile of TILES) {
  const enemy = /^(?:stone|gilt|obsidian)-(slime|bat|spider|zombie|demon-eye|skeleton)-statue$/.exec(tile.key)?.[1];
  if (enemy) tile.statueEnemy = { slime: 'greenslime', bat: 'cavebat', spider: 'cragstalker', 'demon-eye': 'demoneye' }[enemy] || enemy;
}

for (const [key, name, colour, circuit, solid] of [
  ['lower-ossuary-seal', 'Hardmode Ossuary Seal', '#796b9a', 'lower-seal', true],
  ['ossuary-relay-gate', 'Relay Gate', '#a381d0', 'relay-gate', true],
  ['ossuary-drain-gate', 'Reservoir Gate', '#6e9abf', 'drain-gate', true],
  ['ossuary-shutter', 'Mechanist Shutter', '#7761a9', 'arena-shutter', true],
  ['ossuary-shutter-open', 'Retracted Mechanist Shutter', '#7761a9', 'arena-shutter', false],
  ['ossuary-dart', 'Mechanist Dart Launcher', '#aa749e', 'arena-trap', false],
  ['ossuary-reservoir-inlet', 'Reservoir Inlet', '#67b0c7', 'inlet', true],
  ['ossuary-reservoir-outlet', 'Reservoir Outlet', '#d09264', 'outlet', true],
  ['ossuary-bulkhead', 'Ossuary Bulkhead', '#514967', 'bulkhead', true]
]) pushTile({ key, name, colour, circuit, solid, opacity: solid ? 60 : 4, drops: null,
  fixture: circuit === 'arena-trap' ? 'dart-trap' : circuit === 'inlet' || circuit === 'outlet'
    ? circuit + '-pump' : 'actuator-block', powered: key === 'ossuary-shutter-open' });

defineMulti('mechanist-armory', 'Sealed Mechanist Armory', 2, 2, () => ({
  solid: false, opacity: 8, emit: 5, colour: '#b093dd', toughness: 95, chest: 'mechanist-armory', drops: null
}));

workshopFixture('signal-bench', 'Signal Bench', '#ac90d8', 'wire-timer',
  [['mechanist-core', 1], ['wire-spool', 12], ['iron-bar', 5]], 'heavy-workbench', { station: 'signal-bench', emit: 5 });
for (const [key, name, colour, logic] of [
  ['and-relay', 'AND Relay', '#7fa6d8', 'and'], ['or-relay', 'OR Relay', '#8fcaa4', 'or']
]) workshopFixture(key, name, colour, 'wire-switch', [['wire-spool', 4], ['silver-bar', 2]],
  'signal-bench', { logic });

const CRITTER_FAMILIES = [
  ['canopyjay', 'Canopy Jay', 'bird', '#5d91a9', ['forest'], 'day'],
  ['duskowl', 'Dusk Owl', 'bird', '#7e7194', ['forest'], 'night'],
  ['briarhare', 'Briar Hare', 'lizard', '#9b7754', ['forest'], 'day'],
  ['meadow-mouse', 'Meadow Mouse', 'lizard', '#c19d8c', ['forest', 'plains']],
  ['red-squirrel', 'Red Squirrel', 'lizard', '#ca7c58', ['forest', 'taiga'], 'day'],
  ['monarch', 'Monarch', 'wasp', '#e6a154', ['forest', 'plains', 'savanna'], 'day'],
  ['moon-moth', 'Moon Moth', 'wasp', '#b0c4d8', ['forest', 'jungle'], 'night'],
  ['firefly', 'Firefly', 'beetle', '#e6da7a', ['forest', 'marsh'], 'night'],
  ['pond-frog', 'Pond Frog', 'lizard', '#78a96a', ['marsh', 'jungle', 'forest']],
  ['sand-skink', 'Sand Skink', 'lizard', '#cfaa74', ['desert', 'badlands'], 'day'],
  ['snowhare', 'Snow Hare', 'lizard', '#d4deeb', ['taiga', 'tundra'], 'day'],
  ['shore-crab', 'Shore Crab', 'crab', '#ce806c', ['beach', 'ocean']],
  ['cave-moth', 'Cave Moth', 'wasp', '#a899c0', null, null, 'amethyst'],
  ['burrow-snail', 'Burrow Snail', 'beetle', '#bd9a61', null, null, 'topaz'],
  ['frost-glider', 'Frost Glider', 'bird', '#89bdd8', null, null, 'sapphire'],
  ['moss-gecko', 'Moss Gecko', 'lizard', '#80b58c', null, null, 'emerald'],
  ['ember-cricket', 'Ember Cricket', 'beetle', '#c17f78', null, null, 'ruby'],
  ['cavern-mouse', 'Cavern Mouse', 'lizard', '#b4b6ce', null, null, 'diamond']
];
const CRITTER_GEMS = {
  amethyst: '#ba8ade', topaz: '#f4cb71', sapphire: '#80c1f3',
  emerald: '#7cdda4', ruby: '#ee8290', diamond: '#b9f2f7'
};
const CRITTER_SPECIMENS = CRITTER_FAMILIES.flatMap(([key, name, body, colour, biomes, clock, gem]) => {
  const base = { key, name, body, colour, biomes, clock, gem };
  const variants = [base, { ...base, key: 'gold-' + key, name: 'Gold ' + name, colour: '#e9bf60', rare: 'gold' }];
  if (gem) {
    variants.push({ ...base, key: gem + '-' + key, name: gem[0].toUpperCase() + gem.slice(1) + ' ' + name,
      colour: CRITTER_GEMS[gem], rare: 'crystal' });
  }
  return variants;
});

workshopFixture('empty-terrarium', 'Empty Terrarium', '#91b9b4', 'terrarium',
  [['glass', 5], ['#wood', 2]], 'workbench');
for (const specimen of CRITTER_SPECIMENS) {
  pushTile({ key: 'terrarium-' + specimen.key, name: specimen.name + ' Terrarium', colour: specimen.colour,
    fixture: 'terrarium', specimen, solid: false, opacity: 4, toughness: 35, hardness: 0.2,
    emit: specimen.rare === 'crystal' ? 5 : specimen.key.endsWith('firefly') ? 3 : 0 });
}

for (const [key, name, colour, solid, emit] of [
  ['foundry-alloy', 'Foundry Alloy', '#72678e', true, 0],
  ['foundry-pad', 'Foundry Landing Pad', '#9d80bb', true, 5],
  ['foundry-console', 'Foundry Shortcut Console', '#8ecad8', false, 8],
  ['foundry-pylon', 'Foundry Power Pylon', '#a695e7', false, 10]
]) pushTile({ key, name, colour, solid, opacity: solid ? 55 : 4, emit, drops: null,
  masonry: solid ? 'brick' : undefined, fixture: solid ? undefined : 'wire-timer', foundry: true });
workshopFixture('refraction-bench', 'Refraction Bench', '#a9b7ef', 'alchemy-table',
  [['foundry-prism', 1], ['adamantite-bar', 6], ['glass', 8]], 'heavy-workbench',
  { station: 'refraction-bench', emit: 8 });

for (const [key, name, colour, optic, pair, protectedOptic] of [
  ['beam-emitter', 'Beam Emitter', '#e8b888', 'emitter', 'beam-emitter-off', false],
  ['beam-emitter-off', 'Beam Emitter', '#847b8b', 'off', 'beam-emitter', false],
  ['beam-mirror', 'Beam Mirror', '#a5d9f0', 'slash', 'beam-mirror-turn', false],
  ['beam-mirror-turn', 'Beam Mirror', '#a5d9f0', 'backslash', 'beam-mirror', false],
  ['beam-sensor', 'Beam Sensor', '#a2e2c2', 'sensor', null, false],
  ['vault-emitter', 'Vault Emitter', '#d9aaf4', 'emitter', null, true],
  ['vault-mirror', 'Vault Mirror', '#c4a8eb', 'slash', 'vault-mirror-turn', true],
  ['vault-mirror-turn', 'Vault Mirror', '#c4a8eb', 'backslash', 'vault-mirror', true],
  ['vault-sensor', 'Vault Sensor', '#b1d5e9', 'sensor', null, true]
]) pushTile({ key, name, colour, optic, circuitPair: pair, vault: protectedOptic,
  fixture: 'optics', solid: false, opacity: 4, emit: optic === 'emitter' ? 6 : 0,
  toughness: 45, hardness: 0.22, drops: protectedOptic ? null : key.endsWith('-off') ? 'beam-emitter'
    : key.endsWith('-turn') ? 'beam-mirror' : key });

for (const [key, name, circuit] of [
  ['lens-vault-seal', 'Lens Vault Seal', 'lens-seal'],
  ['lens-vault-gate', 'Lens Vault Gate', 'lens-gate']
]) pushTile({ key, name, colour: '#a68bc7', circuit, vault: true, solid: true,
  fixture: 'actuator-block', opacity: 55, drops: null });

workshopFixture('optics-bench', 'Optics Bench', '#b4dce8', 'alchemy-table',
  [['lens-vault-core', 1], ['glass', 8], ['wire-spool', 8]], 'signal-bench', { station: 'optics-bench', emit: 8 });
WORKSHOP_PLANS.push(
  { out: { key: 'beam-emitter', kind: 'block', count: 1 },
    need: [['ray-crystal', 2], ['glass', 3], ['wire-spool', 3]], station: 'optics-bench' },
  { out: { key: 'beam-mirror', kind: 'block', count: 2 },
    need: [['silver-bar', 1], ['glass', 2]], station: 'optics-bench' },
  { out: { key: 'beam-sensor', kind: 'block', count: 1 },
    need: [['ward-crystal', 1], ['glass', 2], ['wire-spool', 3]], station: 'optics-bench' }
);

for (const [key, name, colour, archive, solid, fixture] of [
  ['archive-stone', 'Archive Masonry', '#506a7a', 'shell', true],
  ['archive-entry', 'Tidal Archive Airlock', '#84bbcb', 'entry', true, 'actuator-block'],
  ['archive-exit', 'Archive Exit Airlock', '#84bbcb', 'exit', false, 'wire-timer'],
  ['archive-return', 'Archive Return Lift', '#92c6bb', 'return', false, 'wire-timer'],
  ['archive-fill', 'Archive Flood Console', '#65a9d0', 'fill', false, 'inlet-pump'],
  ['archive-filled', 'Archive Flood Console', '#a8d5ec', 'filled', false, 'inlet-pump'],
  ['archive-drain', 'Archive Drain Console', '#b2c4a5', 'drain', false, 'outlet-pump'],
  ['archive-gate', 'Archive Floodgate', '#6aa6ac', 'gate', true, 'actuator-block']
]) pushTile({ key, name, colour, archive, solid, fixture, masonry: fixture ? undefined : 'brick',
  opacity: solid ? 55 : 4, emit: fixture ? 5 : 0, drops: null });

workshopFixture('hydraulic-bench', 'Hydraulic Bench', '#80bdc9', 'cauldron',
  [['archivist-core', 1], ['iron-bar', 6], ['wire-spool', 10]], 'optics-bench', { station: 'hydraulic-bench', emit: 6 });
workshopFixture('liquid-sensor', 'Liquid Sensor', '#93cee7', 'optics',
  [['glass', 3], ['wire-spool', 3], ['silver-bar', 1]], 'hydraulic-bench', { liquidSensor: true });
workshopFixture('powered-valve', 'Powered Valve', '#80b1bc', 'actuator-block',
  [['iron-bar', 3], ['wire-spool', 2]], 'hydraulic-bench',
  { valve: true, circuitPair: 'powered-valve-open', solid: true, opacity: 50 });
pushTile({ key: 'powered-valve-open', name: 'Open Powered Valve', colour: '#80b1bc', fixture: 'actuator-block',
  valve: true, circuitPair: 'powered-valve', powered: true, solid: false, opacity: 4,
  toughness: 55, hardness: 0.25, drops: 'powered-valve' });

pushTile({ key: 'marble', name: 'Marble', colour: '#c1c7ca', solid: true, opacity: 55,
  hardness: 1.4, toughness: 110, grain: 0.12 });
pushTile({ key: 'cave-spire', name: 'Mineral Spire', colour: '#9ab5bc', fixture: 'cave-spire',
  solid: false, opacity: 4, toughness: 35, hardness: 0.3 });
pushTile({ key: 'minecart-rail', name: 'Minecart Rail', colour: '#a79ba0', solid: false,
  platform: true, rail: true, opacity: 3, hardness: 0.25, toughness: 45 });

for (const [key, name, colour, rail, circuitPair] of [
  ['rail-junction', 'Rail Junction', '#a38ed0', 'upper', 'rail-junction-lower'],
  ['rail-junction-lower', 'Rail Junction', '#a38ed0', 'lower', 'rail-junction'],
  ['brake-rail', 'Brake Rail', '#ca975f', 'brake'],
  ['stop-rail', 'Stop Rail', '#c57578', 'stop']
]) pushTile({ key, name, colour, rail, circuitPair, platform: true, solid: false,
  opacity: 3, toughness: 45, hardness: 0.25, drops: key === 'rail-junction-lower' ? 'rail-junction' : key });

defineMulti('rail-cache', 'Abandoned Rail Supply Cache', 2, 2, () => ({
  solid: false, opacity: 6, colour: '#a77f60', toughness: 65, chest: 'rail-cache', drops: 'ironchest'
}));

pushTile({ key: 'powered-rail', name: 'Powered Rail', colour: '#edc881', rail: 'powered',
  platform: true, solid: false, opacity: 4, emit: 4, toughness: 50, hardness: 0.25 });
for (const [key, name, mine, solid, fixture, circuit] of [
  ['runaway-masonry', 'Runaway Mine Masonry', 'shell', true],
  ['runaway-entry', 'Runaway Mine Lift', 'entry', true, 'actuator-block'],
  ['runaway-exit', 'Mine Return Lift', 'exit', false, 'wire-timer'],
  ['runaway-repair-gate', 'Bridge Gate', 'repair', true, 'actuator-block'],
  ['runaway-junction-gate', 'Junction Gate', 'junction', true, 'actuator-block'],
  ['runaway-floodgate', 'Flooded Spur Gate', 'flood', true, 'actuator-block', 'mine-floodgate'],
  ['runaway-inlet', 'Spur Inlet', 'pump', true, 'inlet-pump', 'inlet'],
  ['runaway-outlet', 'Spur Outlet', 'pump', true, 'outlet-pump', 'outlet']
]) pushTile({ key, name, mine, solid, fixture, circuit, colour: '#9d7761', drops: null,
  masonry: fixture ? undefined : 'brick', opacity: solid ? 55 : 4, emit: fixture ? 5 : 0 });

workshopFixture('railworks-bench', 'Railworks Bench', '#9b9eac', 'heavy-workbench',
  [['railbreaker-drive', 1], ['iron-bar', 8], ['wire-spool', 6]], 'heavy-workbench',
  { station: 'railworks-bench', emit: 4 });
WORKSHOP_PLANS.push({ out: { key: 'powered-rail', kind: 'block', count: 8 },
  need: [['minecart-rail', 8], ['gold-bar', 2], ['wire-spool', 4]], station: 'railworks-bench' });

for (const [key, name, colour, require] of [
  ['lunarium', 'Lunarium Ore', '#93c9e8', 285],
  ['solarium', 'Solarium Ore', '#ebad68', 325],
  ['eventide', 'Eventide Ore', '#b29ae9', 365]
]) pushTile({ key, name, colour, require, basePowerGate: true, ore: true, solid: true,
  opacity: 55, hardness: 4, toughness: require * 3, grain: 0.21, emit: 5 });

for (const [key, name, colour, solid] of [
  ['siege-alloy', 'Astral Siege Alloy', '#77709c', true],
  ['siege-beacon', 'Astral Siege Pylon', '#b29adf', false]
]) pushTile({ key, name, colour, solid, opacity: solid ? 55 : 4, emit: solid ? 0 : 10,
  siege: true, masonry: solid ? 'brick' : undefined, fixture: solid ? undefined : 'wire-timer', drops: null });

workshopFixture('sky-anchor', 'Sky Anchor', '#93d3e9', 'wire-timer',
  [['siege-core', 1], ['aetherite-bar', 4], ['wire-spool', 4]], 'heavy-workbench',
  { skyAnchor: true, emit: 7 });

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
const EXPORTS_tiles = { AIR, TILES, BY_KEY, WOODS, WORKSHOP_PLANS, WORKSHOP_DYES, CRITTER_SPECIMENS, WOOD_BY_TREE, shadeHex,
  MULTI, defineMulti, originOf, cellOf, pushTile, CHESTS, tile, isSolid, opacityOf, emitOf, idOf,
    NO_WALL, WALLS, WALL_BY_KEY, wall, wallOpacityOf, wallIdOf };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_tiles;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.tiles = EXPORTS_tiles;
}
