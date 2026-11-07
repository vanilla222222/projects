'use strict';
// The live world: a map of generated chunks keyed by coordinate, with player edits layered
// over generation. An edited chunk remembers only its diff, so a save file is the seed plus
// the tiles the player actually changed rather than the world.

// A full tile of water. Stored in one byte, so this is the largest value that fits and
// still leaves room to halve repeatedly without the rounding swallowing the remainder.
const LEVEL_FULL = 255;

// Bitsets travel as base64. btoa/atob exist in the browser; Buffer is the Node spelling.
function packBits(bits) {
  if (typeof Buffer !== 'undefined') return Buffer.from(bits).toString('base64');
  let binary = '';
  for (let i = 0; i < bits.length; i += 1) binary += String.fromCharCode(bits[i]);
  return btoa(binary);
}

function unpackBits(text, length) {
  try {
    if (typeof Buffer !== 'undefined') {
      const buf = Buffer.from(text, 'base64');
      const out = new Uint8Array(length);
      out.set(buf.subarray(0, length));
      return out;
    }
    const binary = atob(text);
    const out = new Uint8Array(length);
    for (let i = 0; i < Math.min(length, binary.length); i += 1) out[i] = binary.charCodeAt(i);
    return out;
  } catch (err) {
    // A corrupt or truncated entry costs the player a patch of revealed map, which is
    // not worth refusing to load a world over.
    return null;
  }
}

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
  // What is inside each chest, keyed by its origin. Absent means "whatever the generator
  // says", so an untouched world of chests costs nothing to save; a chest the player has
  // opened and changed gets an entry.
  const containers = new Map();
  // Which tiles the player has seen, one bit each, a bitset per chunk. A chunk is 48x48,
  // so that is 288 bytes rather than the 2,304 a byte-per-tile array would take, and a
  // map of a thousand explored chunks saves in a quarter of a megabyte.
  const explored = new Map();
  const dirty = new Set();
  let renderRevision = 0;
  let hardmode = false;
  let protectedChunks = new Set();
  let liquidRevision = 0;

  // A one-entry memo in front of the chunk map. Every read of the world goes through
  // here, and every one of them was building the string `cx + ':' + cy` and hashing it:
  // the renderer's tile pass alone does about thirteen thousand reads a frame, because
  // each solid tile also asks about its eight neighbours for the edge mask. The reads
  // arrive in near-perfect spatial order, so remembering the last chunk turns almost all
  // of them into two integer comparisons.
  let memoCx = NaN;
  let memoCy = NaN;
  let memoChunk = null;

  function forgetMemo() {
    memoCx = NaN;
    memoCy = NaN;
    memoChunk = null;
  }

  function hardmodeApplies(cx, cy) {
    return hardmode && !protectedChunks.has(chunkKey(cx, cy));
  }

  function enableHardmode() {
    if (hardmode) return false;
    hardmode = true;
    protectedChunks = new Set([...explored.keys(), ...edits.keys(), ...wallEdits.keys(), ...levels.keys()]);
    for (const key of containers.keys()) {
      const [x, y] = key.split(',').map(Number);
      protectedChunks.add(chunkKey(Math.floor(x / generator.CHUNK), Math.floor(y / generator.CHUNK)));
    }
    loaded.clear();
    forgetMemo();
    renderRevision += 1;
    return true;
  }

  function biomeAt(x, y) {
    const cx = Math.floor(x / generator.CHUNK), cy = Math.floor(y / generator.CHUNK);
    const altitude = generator.altitudeOf?.(y);
    return altitude >= -110 && altitude <= 740 && hardmodeApplies(cx, cy) && generator.isHallowRegion?.(seed, x)
      ? generator.HALLOW_BIOME : generator.biomeAt(seed, x);
  }

  function acceptGeneratedChunk(cx, cy, chunk) {
    const key = chunkKey(cx, cy);
    if (loaded.has(key)) return loaded.get(key);
    if (hardmodeApplies(cx, cy) && generator.hardmodeTileAt) {
      const size = generator.CHUNK;
      for (let index = 0; index < chunk.tiles.length; index += 1) {
        const x = cx * size + index % size, y = cy * size + Math.floor(index / size);
        chunk.tiles[index] = generator.hardmodeTileAt(seed, x, y, chunk.tiles[index]);
      }
    }
    const diff = edits.get(key);
    if (diff) for (const [index, id] of diff) chunk.tiles[index] = id;
    const wallDiff = wallEdits.get(key);
    if (wallDiff) for (const [index, id] of wallDiff) chunk.walls[index] = id;
    loaded.set(key, chunk);
    return chunk;
  }

  function chunkAt(cx, cy) {
    if (cx === memoCx && cy === memoCy) return memoChunk;
    const chunk = loaded.get(chunkKey(cx, cy))
      || acceptGeneratedChunk(cx, cy, generator.generateChunk(seed, cx, cy));
    memoCx = cx;
    memoCy = cy;
    memoChunk = chunk;
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
    renderRevision += 1;
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
    renderRevision += 1;
    let diff = edits.get(key);
    if (!diff) {
      diff = new Map();
      edits.set(key, diff);
    }
    const base = generator.baseTileAt(seed, x, y);
    const original = hardmodeApplies(cx, cy) && generator.hardmodeTileAt
      ? generator.hardmodeTileAt(seed, x, y, base) : base;
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
  function getLevel(x, y, id = get(x, y)) {
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
    liquidRevision += 1;
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

  // --- containers -----------------------------------------------------------------
  function containerKey(x, y) {
    return x + ',' + y;
  }

  function getContainer(x, y) {
    const key = containerKey(x, y);
    const stored = containers.get(key);
    if (stored) return stored;
    if (!generator.baseContainerAt) return null;
    return generator.baseContainerAt(seed, x, y);
  }

  function setContainer(x, y, items) {
    containers.set(containerKey(x, y), items);
    dirty.add(chunkKey(Math.floor(x / generator.CHUNK), Math.floor(y / generator.CHUNK)));
  }

  function clearContainer(x, y) {
    containers.delete(containerKey(x, y));
  }

  // --- exploration ------------------------------------------------------------------
  const EXPLORED_BYTES = (generator.CHUNK * generator.CHUNK) >> 3;

  function exploredSlot(cx, cy, create) {
    const key = chunkKey(cx, cy);
    let bits = explored.get(key);
    if (!bits && create) {
      bits = new Uint8Array(EXPLORED_BYTES);
      explored.set(key, bits);
    }
    return bits;
  }

  function markExplored(x, y) {
    const cx = Math.floor(x / generator.CHUNK);
    const cy = Math.floor(y / generator.CHUNK);
    const bits = exploredSlot(cx, cy, true);
    const lx = x - cx * generator.CHUNK;
    const ly = y - cy * generator.CHUNK;
    const index = ly * generator.CHUNK + lx;
    bits[index >> 3] |= 1 << (index & 7);
  }

  function isExplored(x, y) {
    const cx = Math.floor(x / generator.CHUNK);
    const cy = Math.floor(y / generator.CHUNK);
    const bits = explored.get(chunkKey(cx, cy));
    if (!bits) return false;
    const lx = x - cx * generator.CHUNK;
    const ly = y - cy * generator.CHUNK;
    const index = ly * generator.CHUNK + lx;
    return (bits[index >> 3] & (1 << (index & 7))) !== 0;
  }

  function exploredCount() {
    let n = 0;
    for (const bits of explored.values()) {
      for (let i = 0; i < bits.length; i += 1) {
        let b = bits[i];
        while (b) { n += b & 1; b >>= 1; }
      }
    }
    return n;
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
      if (cx < cx0 || cx > cx1 || cy < cy0 || cy > cy1) {
        loaded.delete(key);
        forgetMemo();
      }
    }
  }

  function editCount() {
    let n = 0;
    for (const diff of edits.values()) n += diff.size;
    for (const diff of wallEdits.values()) n += diff.size;
    for (const slot of levels.values()) n += slot.size;
    n += containers.size;
    return n;
  }

  function serialize() {
    const out = {};
    for (const [key, diff] of edits) out[key] = [...diff.entries()];
    const wallOut = {};
    for (const [key, diff] of wallEdits) wallOut[key] = [...diff.entries()];
    const levelOut = {};
    for (const [key, slot] of levels) levelOut[key] = [...slot.entries()];
    const boxes = {};
    for (const [key, items] of containers) boxes[key] = items;
    // Exploration is stored as base64 rather than an array of numbers: a chunk's 288
    // bytes become 384 characters instead of roughly 1,100.
    const seen = {};
    for (const [key, bits] of explored) seen[key] = packBits(bits);
    return { seed, hardmode, protectedChunks: [...protectedChunks], edits: out, wallEdits: wallOut, levels: levelOut,
      containers: boxes, explored: seen };
  }

  function restore(saved) {
    renderRevision += 1;
    hardmode = !!saved.hardmode;
    protectedChunks = new Set(saved.protectedChunks || []);
    edits.clear();
    wallEdits.clear();
    levels.clear();
    containers.clear();
    explored.clear();
    loaded.clear();
    forgetMemo();
    for (const [key, list] of Object.entries(saved.edits || {})) {
      edits.set(key, new Map(list));
    }
    for (const [key, list] of Object.entries(saved.wallEdits || {})) {
      wallEdits.set(key, new Map(list));
    }
    for (const [key, list] of Object.entries(saved.levels || {})) {
      levels.set(key, new Map(list));
    }
    for (const [key, items] of Object.entries(saved.containers || {})) {
      containers.set(key, items);
    }
    for (const [key, text] of Object.entries(saved.explored || {})) {
      const bits = unpackBits(text, EXPLORED_BYTES);
      if (bits) explored.set(key, bits);
    }
  }

  return { seed, get, set, biomeAt, enableHardmode, get hardmode() { return hardmode; }, getWall, setWall, getLevel, setLevel, LEVEL_FULL, isWallSafe,
    getContainer, setContainer, clearContainer,
    markExplored, isExplored, exploredCount, chunkAt, acceptGeneratedChunk, hasChunk: (cx, cy) => loaded.has(chunkKey(cx, cy)), evictOutside, editCount, serialize, restore,
    get renderRevision() { return renderRevision; },
    get liquidRevision() { return liquidRevision; },
    get loadedCount() { return loaded.size; }, takeDirty() { const d = [...dirty]; dirty.clear(); return d; } };
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
const EXPORTS_chunks = { makeWorld, chunkKey, LEVEL_FULL, packBits, unpackBits };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_chunks;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.chunks = EXPORTS_chunks;
}
