'use strict';
// Chests and their loot. The claims worth proving: every table yields real items, the
// same chest always holds the same things, a chest nobody has touched costs nothing to
// save, and a chest the player has changed survives a save and reload.

const tiles = require('../js/tiles.js');
const worldgen = require('../js/worldgen.js');
const chunks = require('../js/chunks.js');
const craft = require('../js/craft.js');
const loot = require('../js/loot.js');

let checks = 0;
let failures = 0;
function ok(cond, label) {
  checks += 1;
  if (!cond) { failures += 1; console.log('FAIL: ' + label); }
}

const SEED = 20260105;

// --- 1. every loot table names real, obtainable items ----------------------------------
for (const key of loot.allLootKeys()) {
  const named = craft.nameOf(key, tiles);
  ok(named !== key, 'loot item ' + key + ' has no readable name');
  const kind = craft.kindOf(key);
  ok(['block', 'wall', 'tool', 'bar', 'armor', 'ammo', 'loot', 'coin', 'accessory'].includes(kind),
    'loot item ' + key + ' has unknown kind ' + kind);
}
for (const [name, table] of Object.entries(loot.TABLES)) {
  ok(table.rolls > 0, 'table ' + name + ' rolls nothing');
  ok(table.entries.length >= table.rolls,
    'table ' + name + ' cannot fill its own roll count');
  for (const entry of table.entries) {
    ok(entry.min > 0 && entry.max >= entry.min, 'table ' + name + ' entry ' + entry.key
      + ' has a nonsense amount range');
    ok(entry.chance > 0 && entry.chance <= 1,
      'table ' + name + ' entry ' + entry.key + ' has an impossible chance');
  }
}
ok(loot.bandForDepth(100) === 'caves', 'a shallow chest is not a caves chest');
ok(loot.bandForDepth(500) === 'deep', 'a mid chest is not a deep chest');
ok(loot.bandForDepth(900) === 'rich', 'a very deep chest is not a rich chest');

// --- 2. chests generate, in variety, and all four cells of each appear -------------------
const found = [];
for (let slot = -300; slot < 300; slot += 1) {
  const chest = worldgen.structureChest(SEED, slot);
  if (chest) found.push(chest);
}
ok(found.length > 40, 'only ' + found.length + ' chests across 600 structure slots');
const kinds = new Set(found.map(c => c.kind));
for (const kind of ['woodchest', 'ironchest']) {
  ok(kinds.has(kind), 'no ' + kind + ' generated anywhere');
}
let whole = 0;
for (const chest of found) {
  let cells = 0;
  for (let dy = 0; dy < 2; dy += 1) {
    for (let dx = 0; dx < 2; dx += 1) {
      const spec = tiles.tile(worldgen.baseTileAt(SEED, chest.x + dx, chest.y + dy));
      if (spec.chest === chest.kind && spec.part.dx === dx && spec.part.dy === dy) cells += 1;
    }
  }
  if (cells === 4) whole += 1;
}
ok(whole === found.length,
  (found.length - whole) + ' of ' + found.length + ' chests are missing a cell');

// --- 3. contents are deterministic and never empty ------------------------------------
let totalItems = 0;
for (const chest of found) {
  const a = worldgen.baseContainerAt(SEED, chest.x, chest.y);
  const b = worldgen.baseContainerAt(SEED, chest.x, chest.y);
  ok(!!a && a.length > 0, 'a chest at ' + chest.x + ',' + chest.y + ' is empty');
  ok(JSON.stringify(a) === JSON.stringify(b),
    'a chest rolled different contents when asked twice');
  totalItems += a.length;
  for (const item of a || []) {
    ok(item.count > 0, 'a chest holds zero of ' + item.key);
    ok(craft.nameOf(item.key, tiles) !== item.key, 'a chest holds the unnamed ' + item.key);
  }
}
// And not every chest holds the same thing, or the loot table is doing nothing.
const signatures = new Set(found.map(c =>
  (worldgen.baseContainerAt(SEED, c.x, c.y) || []).map(i => i.key).join(',')));
ok(signatures.size > found.length / 3,
  'only ' + signatures.size + ' distinct chest contents across ' + found.length + ' chests');

// --- 4. an untouched world of chests costs nothing to save --------------------------------
{
  const world = chunks.makeWorld(SEED, worldgen);
  const chest = found[0];
  const before = world.editCount();
  const read = world.getContainer(chest.x, chest.y);
  ok(!!read && read.length > 0, 'the live world cannot read a generated chest');
  ok(world.editCount() === before,
    'merely reading a chest created ' + (world.editCount() - before) + ' edits');
  ok(JSON.stringify(world.serialize().containers) === '{}',
    'an untouched world serialises chest contents it never changed');
}

// --- 5. a changed chest survives a save and reload ------------------------------------------
{
  const world = chunks.makeWorld(SEED, worldgen);
  const chest = found[0];
  const taken = world.getContainer(chest.x, chest.y).slice(1);
  world.setContainer(chest.x, chest.y, taken);
  ok(world.editCount() > 0, 'changing a chest recorded no edit');

  const saved = JSON.parse(JSON.stringify(world.serialize()));
  const reloaded = chunks.makeWorld(SEED, worldgen);
  reloaded.restore(saved);
  ok(JSON.stringify(reloaded.getContainer(chest.x, chest.y)) === JSON.stringify(taken),
    'a chest did not survive a save and reload');

  // And an emptied chest stays empty rather than refilling from the generator.
  world.setContainer(chest.x, chest.y, []);
  const second = chunks.makeWorld(SEED, worldgen);
  second.restore(JSON.parse(JSON.stringify(world.serialize())));
  const after = second.getContainer(chest.x, chest.y);
  ok(after && after.length === 0,
    'an emptied chest refilled itself from the generator on reload');
}

// --- 6. chests never generate where they would be absurd -------------------------------------
for (const chest of found) {
  const alt = worldgen.altitudeOf(chest.y);
  ok(alt < 1250, 'a chest generated in hell at altitude ' + alt);
  ok(chest.y > worldgen.surfaceHeight(SEED, chest.x) + 20,
    'a chest generated at or near the surface');
}

const byKind = {};
for (const c of found) byKind[c.kind] = (byKind[c.kind] || 0) + 1;
console.log('\n' + found.length + ' chests across 600 slots: '
  + Object.entries(byKind).map(([k, n]) => k + ' ' + n).join(', '));
console.log('average items per chest: ' + (totalItems / found.length).toFixed(1)
  + ', ' + signatures.size + ' distinct contents');
console.log(checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
