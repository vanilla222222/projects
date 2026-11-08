'use strict';
// Characters, worlds and the seeds that name them. The property that matters is separation:
// a character must carry its things into any world, and deleting a world must not touch it.
const assert = require('node:assert/strict');
const { makeProfiles, parseSeed } = require('../js/profile.js');

let checks = 0;
function check(c, m) { assert.ok(c, m); checks += 1; }

function memoryStorage() {
  const mem = new Map();
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
    get size() { return mem.size; },
    keys: () => [...mem.keys()]
  };
}

// ---- seeds ----
check(parseSeed('deepwood') === parseSeed('deepwood'), 'the same words gave two different worlds');
check(parseSeed('deepwood') !== parseSeed('deepwoods'), 'two different words gave the same world');
check(parseSeed('12345') === 12345, 'a numeric seed was not taken literally');
check(parseSeed('-7') === -7, 'a negative numeric seed was not taken literally');
check(parseSeed('  41  ') === 41, 'a padded numeric seed was not trimmed');
check(Number.isInteger(parseSeed('')), 'a blank seed did not produce an integer');
const blanks = new Set();
for (let i = 0; i < 40; i += 1) blanks.add(parseSeed(''));
check(blanks.size > 30, 'blank seeds are not random enough: ' + blanks.size + ' of 40 distinct');
check(Number.isInteger(parseSeed('🜨 unicode ✦')), 'a unicode seed did not hash to an integer');

// ---- creation ----
let store = memoryStorage();
let p = makeProfiles(store);
check(p.listCharacters().length === 0 && p.listWorlds().length === 0, 'a fresh store was not empty');

const alice = p.createCharacter({ name: 'Alice' });
const bob = p.createCharacter({ name: 'Bob' });
check(alice.id !== bob.id, 'two characters share an id');
check(p.listCharacters().length === 2, 'the character index did not grow');

const home = p.createWorld({ name: 'Home', seed: 'deepwood' });
const caves = p.createWorld({ name: 'Caves', seed: '900' });
check(home.seed === parseSeed('deepwood'), 'the world did not keep its named seed');
check(caves.seed === 900, 'the world did not keep its numeric seed');
check(home.id !== caves.id, 'two worlds share an id');

// Names are trimmed and bounded, and a blank name still gives something playable.
const unnamed = p.createCharacter({ name: '   ' });
check(unnamed.name.length > 0, 'a blank character name produced an empty name');
const longName = p.createCharacter({ name: 'x'.repeat(200) });
check(longName.name.length <= 24, 'a 200-character name was not bounded');

// ---- separation ----
p.saveCharacter(alice.id, { inventory: [{ key: 'gold', kind: 'block', count: 12 }],
  stats: { health: 80, maxHealth: 120, mana: 20, maxMana: 40 },
  bestiary: { canopyjay: { defeated: 0, caught: 2 } } });
p.saveWorld(home.id, { world: { seed: home.seed, edits: { '0:6': [[3, 0]] } } });

const aliceIn = p.loadCharacter(alice.id);
check(aliceIn.inventory[0].count === 12, 'the character did not keep its inventory');
check(aliceIn.stats.maxHealth === 120, 'the character did not keep its stats');
check(aliceIn.bestiary.canopyjay.caught === 2, 'the character did not keep its Bestiary');

// The same character entering a different world still has everything.
const afterOtherWorld = p.loadCharacter(alice.id);
check(afterOtherWorld.inventory[0].key === 'gold',
  'a character lost its inventory by being read alongside another world');

// Deleting a world leaves characters untouched, and vice versa.
p.removeWorld(home.id);
check(p.listWorlds().length === 1, 'removing a world did not shrink the index');
check(p.loadWorld(home.id) === null, 'the removed world record is still readable');
check(p.loadCharacter(alice.id).inventory[0].count === 12, 'deleting a world damaged a character');
p.removeCharacter(bob.id);
check(p.loadCharacter(alice.id) !== null, 'deleting one character removed another');
check(p.loadWorld(caves.id) !== null, 'deleting a character removed a world');

// A world keeps its seed even if a save tries to change it: the terrain must not move.
p.saveWorld(caves.id, { seed: 123456, world: { seed: 123456, edits: {} } });
check(p.loadWorld(caves.id).seed === 900, 'a save was allowed to change a world seed');

// ---- durability ----
// A storage that refuses writes must not throw; the game should keep running unsaved.
const readOnly = {
  getItem: () => null,
  setItem: () => { throw new Error('QuotaExceededError'); },
  removeItem: () => {}
};
const blocked = makeProfiles(readOnly);
check(blocked.listCharacters().length === 0, 'a blocked store did not read as empty');
let threw = false;
try { blocked.createCharacter({ name: 'Nobody' }); } catch (err) { threw = true; }
check(!threw, 'a full storage threw instead of failing quietly');

// Corrupt records read as absent rather than crashing.
store = memoryStorage();
p = makeProfiles(store);
store.setItem('fathom.characters', '{not json');
check(Array.isArray(p.listCharacters()) && p.listCharacters().length === 0,
  'a corrupt index did not read as empty');
const recovered = p.createCharacter({ name: 'Recovered' });
check(p.listCharacters().length === 1, 'could not create a character after a corrupt index');
check(p.loadCharacter(recovered.id).name === 'Recovered', 'the recovered character did not save');

// Heavy records live apart from the index, so listing never parses a world's edits.
store = memoryStorage();
p = makeProfiles(store);
const w = p.createWorld({ name: 'Big', seed: 'x' });
p.saveWorld(w.id, { world: { seed: w.seed, edits: { '0:0': Array.from({ length: 500 }, (_, i) => [i, 3]) } } });
const indexRaw = store.getItem('fathom.worlds');
check(indexRaw.length < 400, 'the world index carries the edit diff; it is ' + indexRaw.length + ' bytes');
check(p.loadWorld(w.id).world.edits['0:0'].length === 500, 'the world record lost its edits');

console.log('Profiles: ' + checks + ' checks passed across seeds, creation, separation and durability');
