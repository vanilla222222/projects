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

const WALL_BY_KEY = {};
for (const w of WOODS) {
  WALLS.push({ id: WALLS.length, key: w.key + 'back', name: w.name + ' Background',
    colour: shadeHex(w.colour, -0.45), opacity: 7, wood: w.key });
}
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
const EXPORTS_tiles = { AIR, TILES, BY_KEY, WOODS, WOOD_BY_TREE, shadeHex,
  MULTI, defineMulti, originOf, cellOf, pushTile, CHESTS, tile, isSolid, opacityOf, emitOf, idOf,
    NO_WALL, WALLS, WALL_BY_KEY, wall, wallOpacityOf, wallIdOf };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_tiles;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.tiles = EXPORTS_tiles;
}
