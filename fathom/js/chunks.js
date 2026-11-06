'use strict';
// The live world: a map of generated chunks keyed by coordinate, with player edits layered
// over generation. An edited chunk remembers only its diff, so a save file is the seed plus
// the tiles the player actually changed rather than the world.

// A full tile of water. Stored in one byte, so this is the largest value that fits and
// still leaves room to halve repeatedly without the rounding swallowing the remainder.
const LEVEL_FULL = 255;

function chunkKey(cx, cy) {
  return cx + ':' + cy;
}

// The world has no floor and no ceiling. y is any integer: negative is sky and space,
// large positive is hell and the trench below it. Nothing here clamps, so a chunk at any
// altitude generates the same way as any other.
function makeWorld(seed, generator) {
  const loaded = new Map();
  const edits = new Map();
  const wallEdits = new Map();
  // How full each water tile is, 1..LEVEL_FULL. Only partial tiles are stored: a water
  // tile with no entry here is full, which is what generation produces, so an ocean costs
  // nothing to represent and only the tiles a player has disturbed take up space.
  const levels = new Map();
  const dirty = new Set();

  function chunkAt(cx, cy) {
    const key = chunkKey(cx, cy);
    let chunk = loaded.get(key);
    if (chunk) return chunk;
    chunk = generator.generateChunk(seed, cx, cy);
    const diff = edits.get(key);
    if (diff) for (const [index, id] of diff) chunk.tiles[index] = id;
    const wallDiff = wallEdits.get(key);
    if (wallDiff) for (const [index, id] of wallDiff) chunk.walls[index] = id;
    loaded.set(key, chunk);
    return chunk;
  }

  function get(x, y) {
    const cx = Math.floor(x / generator.CHUNK);
    const cy = Math.floor(y / generator.CHUNK);
    const chunk = chunkAt(cx, cy);
    const lx = x - cx * generator.CHUNK;
    const ly = y - cy * generator.CHUNK;
    return chunk.tiles[ly * generator.CHUNK + lx];
  }

  function getWall(x, y) {
    const cx = Math.floor(x / generator.CHUNK);
    const cy = Math.floor(y / generator.CHUNK);
    const chunk = chunkAt(cx, cy);
    const lx = x - cx * generator.CHUNK;
    const ly = y - cy * generator.CHUNK;
    return chunk.walls[ly * generator.CHUNK + lx];
  }

  function setWall(x, y, id) {
    const cx = Math.floor(x / generator.CHUNK);
    const cy = Math.floor(y / generator.CHUNK);
    const key = chunkKey(cx, cy);
    const chunk = chunkAt(cx, cy);
    const lx = x - cx * generator.CHUNK;
    const ly = y - cy * generator.CHUNK;
    const index = ly * generator.CHUNK + lx;
    if (chunk.walls[index] === id) return false;
    chunk.walls[index] = id;
    let diff = wallEdits.get(key);
    if (!diff) {
      diff = new Map();
      wallEdits.set(key, diff);
    }
    if (id === generator.baseWallAt(seed, x, y)) diff.delete(index);
    else diff.set(index, id);
    if (diff.size === 0) wallEdits.delete(key);
    dirty.add(key);
    return true;
  }

  function set(x, y, id) {
    const cx = Math.floor(x / generator.CHUNK);
    const cy = Math.floor(y / generator.CHUNK);
    const key = chunkKey(cx, cy);
    const chunk = chunkAt(cx, cy);
    const lx = x - cx * generator.CHUNK;
    const ly = y - cy * generator.CHUNK;
    const index = ly * generator.CHUNK + lx;
    if (chunk.tiles[index] === id) return false;
    chunk.tiles[index] = id;
    let diff = edits.get(key);
    if (!diff) {
      diff = new Map();
      edits.set(key, diff);
    }
    const original = generator.baseTileAt(seed, x, y);
    if (id === original) diff.delete(index);
    else diff.set(index, id);
    if (diff.size === 0) edits.delete(key);
    dirty.add(key);
    return true;
  }

  // Safe walls stop enemies spawning in front of them and are what a built structure needs;
  // naturally generated walls do neither. The rule is "the player put it there", and that is
  // already recorded in the wall edit diff, so safety needs no storage of its own.
  // --- water levels ---------------------------------------------------------------
  // A level is meaningless without water in the tile, so these two always agree: setting
  // a level of zero removes the water, and removing the water forgets the level.
  // Water can occupy any tile that is not solid, not only a water tile: a shell or a
  // frond on the sea bed is waterlogged rather than a hole in the ocean. The stored map
  // is an override over the generator's answer, the same shape as tile and wall edits.
  function getLevel(x, y) {
    const id = get(x, y);
    if (generator.isSolidId(id)) return 0;
    const cx = Math.floor(x / generator.CHUNK);
    const cy = Math.floor(y / generator.CHUNK);
    const slot = levels.get(chunkKey(cx, cy));
    if (slot) {
      const lx = x - cx * generator.CHUNK;
      const ly = y - cy * generator.CHUNK;
      const found = slot.get(ly * generator.CHUNK + lx);
      if (found !== undefined) return found;
    }
    if (generator.isLiquidId(id)) return LEVEL_FULL;
    return generator.baseLevelAt ? generator.baseLevelAt(seed, x, y) : 0;
  }

  // `liquidId` says which liquid is being placed. It matters because the level map stores
  // only an amount: without it, lava flowing into an empty tile would arrive as water.
  function setLevel(x, y, value, liquidId) {
    const amount = Math.max(0, Math.min(LEVEL_FULL, Math.round(value)));
    const cx = Math.floor(x / generator.CHUNK);
    const cy = Math.floor(y / generator.CHUNK);
    const key = chunkKey(cx, cy);
    const lx = x - cx * generator.CHUNK;
    const ly = y - cy * generator.CHUNK;
    const index = ly * generator.CHUNK + lx;
    let slot = levels.get(key);

    const base = generator.baseLevelAt ? generator.baseLevelAt(seed, x, y) : 0;
    if (amount === 0) {
      if (generator.isLiquidId(get(x, y))) set(x, y, 0);
      // Only store a zero when the generator would have said otherwise: draining a tile
      // that was never wet costs nothing.
      if (base === 0) {
        if (slot) {
          slot.delete(index);
          if (slot.size === 0) levels.delete(key);
        }
        return true;
      }
      if (!slot) {
        slot = new Map();
        levels.set(key, slot);
      }
      slot.set(index, 0);
      dirty.add(key);
      return true;
    }
    const here = get(x, y);
    if (generator.isSolidId(here)) return false;
    // Air becomes water; a frond or a shell simply gets wet and stays what it is.
    if (!generator.isLiquidId(here) && here === 0) {
      set(x, y, liquidId || generator.WATER_ID);
    }
    if (amount >= LEVEL_FULL && base >= LEVEL_FULL) {
      if (slot) {
        slot.delete(index);
        if (slot.size === 0) levels.delete(key);
      }
      dirty.add(key);
      return true;
    }
    if (!slot) {
      slot = new Map();
      levels.set(key, slot);
    }
    slot.set(index, amount);
    dirty.add(key);
    return true;
  }

  function isWallSafe(x, y) {
    if (getWall(x, y) === 0) return false;
    const cx = Math.floor(x / generator.CHUNK);
    const cy = Math.floor(y / generator.CHUNK);
    const diff = wallEdits.get(chunkKey(cx, cy));
    if (!diff) return false;
    const lx = x - cx * generator.CHUNK;
    const ly = y - cy * generator.CHUNK;
    return diff.has(ly * generator.CHUNK + lx);
  }

  function evictOutside(cx0, cy0, cx1, cy1) {
    for (const key of [...loaded.keys()]) {
      const [cx, cy] = key.split(':').map(Number);
      if (cx < cx0 || cx > cx1 || cy < cy0 || cy > cy1) loaded.delete(key);
    }
  }

  function editCount() {
    let n = 0;
    for (const diff of edits.values()) n += diff.size;
    for (const diff of wallEdits.values()) n += diff.size;
    for (const slot of levels.values()) n += slot.size;
    return n;
  }

  function serialize() {
    const out = {};
    for (const [key, diff] of edits) out[key] = [...diff.entries()];
    const wallOut = {};
    for (const [key, diff] of wallEdits) wallOut[key] = [...diff.entries()];
    const levelOut = {};
    for (const [key, slot] of levels) levelOut[key] = [...slot.entries()];
    return { seed, edits: out, wallEdits: wallOut, levels: levelOut };
  }

  function restore(saved) {
    edits.clear();
    wallEdits.clear();
    levels.clear();
    loaded.clear();
    for (const [key, list] of Object.entries(saved.edits || {})) {
      edits.set(key, new Map(list));
    }
    for (const [key, list] of Object.entries(saved.wallEdits || {})) {
      wallEdits.set(key, new Map(list));
    }
    for (const [key, list] of Object.entries(saved.levels || {})) {
      levels.set(key, new Map(list));
    }
  }

  return { seed, get, set, getWall, setWall, getLevel, setLevel, LEVEL_FULL, isWallSafe, chunkAt, evictOutside, editCount, serialize, restore,
    get loadedCount() { return loaded.size; }, takeDirty() { const d = [...dirty]; dirty.clear(); return d; } };
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
const EXPORTS_chunks = { makeWorld, chunkKey, LEVEL_FULL };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_chunks;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.chunks = EXPORTS_chunks;
}
