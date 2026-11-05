'use strict';
// The live world: a map of generated chunks keyed by coordinate, with player edits layered
// over generation. An edited chunk remembers only its diff, so a save file is the seed plus
// the tiles the player actually changed rather than the world.

function chunkKey(cx, cy) {
  return cx + ':' + cy;
}

function makeWorld(seed, generator) {
  const loaded = new Map();
  const edits = new Map();
  const dirty = new Set();

  function chunkAt(cx, cy) {
    const key = chunkKey(cx, cy);
    let chunk = loaded.get(key);
    if (chunk) return chunk;
    chunk = generator.generateChunk(seed, cx, cy);
    const diff = edits.get(key);
    if (diff) for (const [index, id] of diff) chunk[index] = id;
    loaded.set(key, chunk);
    return chunk;
  }

  function get(x, y) {
    if (y < 0 || y >= generator.WORLD_H) return 0;
    const cx = Math.floor(x / generator.CHUNK);
    const cy = Math.floor(y / generator.CHUNK);
    const chunk = chunkAt(cx, cy);
    const lx = x - cx * generator.CHUNK;
    const ly = y - cy * generator.CHUNK;
    return chunk[ly * generator.CHUNK + lx];
  }

  function set(x, y, id) {
    if (y < 0 || y >= generator.WORLD_H) return false;
    const cx = Math.floor(x / generator.CHUNK);
    const cy = Math.floor(y / generator.CHUNK);
    const key = chunkKey(cx, cy);
    const chunk = chunkAt(cx, cy);
    const lx = x - cx * generator.CHUNK;
    const ly = y - cy * generator.CHUNK;
    const index = ly * generator.CHUNK + lx;
    if (chunk[index] === id) return false;
    chunk[index] = id;
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

  function evictOutside(cx0, cy0, cx1, cy1) {
    for (const key of [...loaded.keys()]) {
      const [cx, cy] = key.split(':').map(Number);
      if (cx < cx0 || cx > cx1 || cy < cy0 || cy > cy1) loaded.delete(key);
    }
  }

  function editCount() {
    let n = 0;
    for (const diff of edits.values()) n += diff.size;
    return n;
  }

  function serialize() {
    const out = {};
    for (const [key, diff] of edits) out[key] = [...diff.entries()];
    return { seed, edits: out };
  }

  function restore(saved) {
    edits.clear();
    loaded.clear();
    for (const [key, list] of Object.entries(saved.edits || {})) {
      edits.set(key, new Map(list));
    }
  }

  return { seed, get, set, chunkAt, evictOutside, editCount, serialize, restore,
    get loadedCount() { return loaded.size; }, takeDirty() { const d = [...dirty]; dirty.clear(); return d; } };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { makeWorld, chunkKey };
}
