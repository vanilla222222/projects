'use strict';
// Characters and worlds are stored separately and are not locked to each other: a character
// carries its inventory, equipment and stats into any world, exactly as REFERENCE.md records.
// Each is split into a cheap index and a heavy record, so listing the menu does not parse
// every world's edit diff.
//
// Fathom has no world size and no choice of evil biome. The world is endless, so size means
// nothing, and both evils can simply exist somewhere out along the x axis.

const INDEX_CHARACTERS = 'fathom.characters';
const PROFILE_WORLDGEN = typeof require === 'function' ? require('./worldgen.js') : FATHOM.worldgen;
const INDEX_WORLDS = 'fathom.worlds';
const RECORD_CHARACTER = 'fathom.character.';
const RECORD_WORLD = 'fathom.world.';
const LAST_PLAYED = 'fathom.last';
const FORMAT = 1;

const SKIN_TONES = ['#f1c5a0', '#e0a579', '#c88a5d', '#9c6340', '#6f462c', '#4a2f1e'];
const HAIR_COLOURS = ['#2f2a28', '#5b3a22', '#a8702f', '#d9b55e', '#8d2f2f', '#3c5a8a', '#6a4a7a', '#cfd4dc'];
const SHIRT_COLOURS = ['#4a6fa5', '#3f7a54', '#8a4448', '#6a4a7a', '#b5823c', '#394657'];
const PANTS_COLOURS = ['#2f3b52', '#3e3a33', '#45324a', '#2c4038', '#52402c'];

// A seed may be typed as a number or as words. Words are hashed, so "deepwood" always gives
// the same world, and the resolved number is shown so it can be written down or shared.
function parseSeed(text) {
  const trimmed = String(text === undefined || text === null ? '' : text).trim();
  if (trimmed === '') return (Math.random() * 0x7fffffff) | 0;
  if (/^-?\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    if (Number.isSafeInteger(n)) return n | 0;
  }
  let h = 0x811c9dc5;
  for (let i = 0; i < trimmed.length; i += 1) {
    h ^= trimmed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}

function newId(prefix, taken) {
  let n = 1;
  while (taken.has(prefix + n)) n += 1;
  return prefix + n;
}

function makeProfiles(storage) {
  function readJSON(key, fallback) {
    try {
      const raw = storage.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      const parsed = JSON.parse(raw);
      return parsed === null ? fallback : parsed;
    } catch (err) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  function listCharacters() {
    const index = readJSON(INDEX_CHARACTERS, []);
    return Array.isArray(index) ? index : [];
  }

  function listWorlds() {
    const index = readJSON(INDEX_WORLDS, []);
    return Array.isArray(index) ? index : [];
  }

  function pickColours(seedText) {
    const n = Math.abs(parseSeed(seedText));
    return {
      skin: SKIN_TONES[n % SKIN_TONES.length],
      hair: HAIR_COLOURS[(n >> 3) % HAIR_COLOURS.length],
      shirt: SHIRT_COLOURS[(n >> 7) % SHIRT_COLOURS.length],
      pants: PANTS_COLOURS[(n >> 11) % PANTS_COLOURS.length]
    };
  }

  function createCharacter(options) {
    const opts = options || {};
    const index = listCharacters();
    const id = newId('c', new Set(index.map((e) => e.id)));
    const name = String(opts.name || 'Delver').slice(0, 24).trim() || 'Delver';
    const entry = { id, name, created: Date.now(), playedSeconds: 0,
      colours: opts.colours || pickColours(name + id) };
    index.push(entry);
    writeJSON(INDEX_CHARACTERS, index);
    writeJSON(RECORD_CHARACTER + id, { format: FORMAT, id, name, colours: entry.colours,
      inventory: opts.inventory || null, stats: opts.stats || null });
    return entry;
  }

  function createWorld(options) {
    const opts = options || {};
    const index = listWorlds();
    const id = newId('w', new Set(index.map((e) => e.id)));
    const seed = parseSeed(opts.seed);
    const name = String(opts.name || 'Fathom').slice(0, 24).trim() || 'Fathom';
    const settings = PROFILE_WORLDGEN.normalizeWorldSettings(opts.settings);
    const entry = { id, name, seed, created: Date.now(), playedSeconds: 0 };
    index.push(entry);
    writeJSON(INDEX_WORLDS, index);
    writeJSON(RECORD_WORLD + id, { format: FORMAT, id, seed, name, settings, world: null, dayPhase: 0.12, spawn: null });
    return { ...entry, settings };
  }

  function loadCharacter(id) {
    return readJSON(RECORD_CHARACTER + id, null);
  }

  function loadWorld(id) {
    return readJSON(RECORD_WORLD + id, null);
  }

  function saveCharacter(id, payload) {
    const existing = loadCharacter(id);
    if (!existing) return false;
    const merged = { ...existing, ...payload, format: FORMAT, id };
    if (!writeJSON(RECORD_CHARACTER + id, merged)) return false;
    const index = listCharacters();
    const entry = index.find((e) => e.id === id);
    if (entry) {
      if (payload.playedSeconds !== undefined) entry.playedSeconds = payload.playedSeconds;
      if (payload.colours) entry.colours = payload.colours;
      entry.lastPlayed = Date.now();
      writeJSON(INDEX_CHARACTERS, index);
    }
    return true;
  }

  function saveWorld(id, payload) {
    const existing = loadWorld(id);
    if (!existing) return false;
    const merged = { ...existing, ...payload, format: FORMAT, id, seed: existing.seed };
    if (payload.settings) {
      const original = PROFILE_WORLDGEN.normalizeWorldSettings(existing.settings);
      merged.settings = PROFILE_WORLDGEN.normalizeWorldSettings({ ...original, ...payload.settings });
      for (const field of PROFILE_WORLDGEN.WORLD_SETTINGS) {
        if (field.generation) merged.settings[field.key] = original[field.key];
      }
    }
    if (!writeJSON(RECORD_WORLD + id, merged)) return false;
    const index = listWorlds();
    const entry = index.find((e) => e.id === id);
    if (entry) {
      if (payload.playedSeconds !== undefined) entry.playedSeconds = payload.playedSeconds;
      if (!payload.settings) entry.lastPlayed = Date.now();
      writeJSON(INDEX_WORLDS, index);
    }
    return true;
  }

  function removeCharacter(id) {
    const index = listCharacters().filter((e) => e.id !== id);
    writeJSON(INDEX_CHARACTERS, index);
    try { storage.removeItem(RECORD_CHARACTER + id); } catch (err) { /* already gone */ }
    return true;
  }

  function removeWorld(id) {
    const index = listWorlds().filter((e) => e.id !== id);
    writeJSON(INDEX_WORLDS, index);
    try { storage.removeItem(RECORD_WORLD + id); } catch (err) { /* already gone */ }
    return true;
  }

  function rememberLast(characterId, worldId) {
    writeJSON(LAST_PLAYED, { characterId, worldId });
  }

  function lastPlayed() {
    return readJSON(LAST_PLAYED, null);
  }

  return { listCharacters, listWorlds, createCharacter, createWorld,
    loadCharacter, loadWorld, saveCharacter, saveWorld,
    removeCharacter, removeWorld, rememberLast, lastPlayed, pickColours };
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
const EXPORTS_profile = { makeProfiles, parseSeed, FORMAT,
    SKIN_TONES, HAIR_COLOURS, SHIRT_COLOURS, PANTS_COLOURS };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_profile;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.profile = EXPORTS_profile;
}
