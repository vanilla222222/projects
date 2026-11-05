'use strict';
// Inventory and stats. The inventory rules are the fiddly ones: stacking, splitting, swapping
// and section restrictions all have to survive a mouse doing them in any order.
const assert = require('node:assert/strict');
const { makeInventory, STACK_MAX } = require('../js/inventory.js');
const stats = require('../js/stats.js');

let checks = 0;
function check(c, m) { assert.ok(c, m); checks += 1; }

const block = (key) => ({ key, kind: 'block' });
const armour = (key) => ({ key, kind: 'armor' });
const charm = (key) => ({ key, kind: 'accessory' });

// Layout
let inv = makeInventory();
check(inv.section('hotbar').size === 10, 'hotbar should be 10 slots');
check(inv.section('main').size === 40, 'backpack should be 40 slots');
check(inv.section('armor').size === 3, 'armour should be 3 slots');
check(inv.section('accessory').size === 6, 'accessories should be 6 slots');

// Stacking fills partial stacks before opening new slots.
inv.add(block('dirt'), 10);
inv.add(block('dirt'), 5);
check(inv.slots[0].count === 15, 'a second pickup opened a new slot instead of stacking');
check(inv.slots[1] === null, 'stacking leaked into a second slot');
check(inv.countOf('dirt') === 15, 'countOf disagrees with the slots');

// Overflow spills into the next slot at exactly the stack limit.
inv = makeInventory();
const left = inv.add(block('stone'), STACK_MAX + 7);
check(left === 0, 'a backpack-sized pickup reported leftovers');
check(inv.slots[0].count === STACK_MAX, 'first slot did not fill to the stack limit');
check(inv.slots[1].count === 7, 'the overflow did not land in the next slot');

// A full inventory returns what it could not take rather than destroying it.
inv = makeInventory();
const capacity = (inv.section('hotbar').size + inv.section('main').size) * STACK_MAX;
const over = inv.add(block('dirt'), capacity + 500);
check(over === 500, 'a full inventory swallowed ' + (500 - over) + ' items');

// Click: take, place, swap.
inv = makeInventory();
inv.add(block('dirt'), 5);
inv.clickSlot(0);
check(inv.held && inv.held.count === 5, 'clicking a stack did not pick it up');
check(inv.slots[0] === null, 'the slot kept its stack after being picked up');
inv.clickSlot(20);
check(inv.slots[20].count === 5 && inv.held === null, 'clicking an empty slot did not drop the stack');

// Click onto a like stack merges; onto an unlike stack swaps.
inv = makeInventory();
inv.add(block('dirt'), 5, 'hotbar');
inv.slots[20] = { key: 'dirt', kind: 'block', count: 3 };
inv.clickSlot(0);
inv.clickSlot(20);
check(inv.slots[20].count === 8 && inv.held === null, 'like stacks did not merge on click');
inv.slots[21] = { key: 'stone', kind: 'block', count: 2 };
inv.clickSlot(20);
inv.clickSlot(21);
check(inv.slots[21].key === 'dirt' && inv.held.key === 'stone', 'unlike stacks did not swap');

// Right click halves an untouched stack, and places one at a time from the hand.
inv = makeInventory();
inv.held = null;
inv.add(block('sand'), 7, 'hotbar');
inv.splitSlot(0);
check(inv.held.count === 4 && inv.slots[0].count === 3, 'splitting 7 did not give 4 and 3');
inv.splitSlot(1);
check(inv.slots[1].count === 1 && inv.held.count === 3, 'right click did not place a single item');

// Section restrictions: armour only in armour slots, and never a block.
inv = makeInventory();
inv.held = armour('helm');
const armorAt = inv.section('armor').from;
check(inv.clickSlot(armorAt), 'armour was refused by an armour slot');
check(inv.slots[armorAt].key === 'helm', 'the armour did not land in the slot');
inv.held = block('dirt');
check(!inv.clickSlot(armorAt + 1), 'an armour slot accepted a block');
inv.held = charm('ring');
check(!inv.clickSlot(armorAt + 1), 'an armour slot accepted an accessory');
const charmAt = inv.section('accessory').from;
check(inv.clickSlot(charmAt), 'an accessory slot refused an accessory');

// Equipment does not stack.
inv = makeInventory();
inv.add(armour('helm'), 4);
check(inv.slots[0].count === 1, 'armour stacked, which would let one helmet become four');

// add() never fills the trash slot.
inv = makeInventory();
inv.add(block('dirt'), STACK_MAX * 60);
const trashAt = inv.section('trash').from;
check(inv.slots[trashAt] === null, 'a pickup filled the trash slot');

// Quick-move bounces a stack between the two grids.
inv = makeInventory();
inv.add(block('dirt'), 5, 'hotbar');
check(inv.quickMove(0), 'quick-move refused a hotbar stack');
check(inv.slots[0] === null && inv.countOf('dirt') === 5, 'quick-move lost the stack');

// Sort merges partial stacks of the same thing.
inv = makeInventory();
const mainAt = inv.section('main').from;
inv.slots[mainAt] = { key: 'dirt', kind: 'block', count: 5 };
inv.slots[mainAt + 3] = { key: 'dirt', kind: 'block', count: 6 };
inv.slots[mainAt + 7] = { key: 'stone', kind: 'block', count: 2 };
inv.sort('main');
check(inv.countOf('dirt') === 11, 'sort changed how much dirt there was');
const dirtStacks = inv.slots.filter((slot) => slot && slot.key === 'dirt');
check(dirtStacks.length === 1 && dirtStacks[0].count === 11,
  'sort left ' + dirtStacks.length + ' dirt stacks instead of merging them into one');
check(inv.countOf('stone') === 2, 'sort disturbed the stone stack');

// A save round trip preserves the slots exactly.
const snapshot = inv.serialize();
const restored = makeInventory();
restored.restore(snapshot);
check(JSON.stringify(restored.serialize()) === JSON.stringify(snapshot), 'inventory did not survive a save');

// ---- stats ----
const s = stats.makeStats();
check(s.maxHealth === 100 && s.health === 100, 'a new character should start at 100 health');
check(s.maxMana === 20 && s.mana === 20, 'a new character should start at 20 mana');
check(stats.hearts(s) === 5, 'starting health should read as 5 hearts');
check(stats.stars(s) === 1, 'starting mana should read as 1 star');

stats.damage(s, 30);
check(s.health === 70, 'damage did not apply');
check(stats.damage(s, 30) === 0, 'a second hit landed during invulnerability');

// Regeneration waits, then climbs, and climbs further standing still.
const moving = stats.makeStats();
const still = stats.makeStats();
stats.damage(moving, 50);
stats.damage(still, 50);
for (let i = 0; i < 60; i += 1) stats.step(moving, 1 / 60, true);
check(moving.health === 50, 'health regenerated during the post-damage delay');
for (let i = 0; i < 600; i += 1) {
  stats.step(moving, 1 / 60, true);
  stats.step(still, 1 / 60, false);
}
check(moving.health > 50, 'health never regenerated');
check(still.health > moving.health, 'standing still did not regenerate faster than moving');

// Health and mana never exceed their maxima.
const full = stats.makeStats();
stats.heal(full, 9999);
check(full.health === full.maxHealth, 'healing went past the maximum');
for (let i = 0; i < 2000; i += 1) stats.step(full, 1 / 60, false);
check(full.mana === full.maxMana, 'mana regenerated past the maximum');

// Crystals raise the cap and stop at it.
const grown = stats.makeStats();
let raises = 0;
while (stats.raiseMaxHealth(grown)) raises += 1;
check(grown.maxHealth === 400, 'health cap should be 400, got ' + grown.maxHealth);
check(raises === 15, 'reaching the health cap should take 15 crystals, took ' + raises);
let manaRaises = 0;
while (stats.raiseMaxMana(grown)) manaRaises += 1;
check(grown.maxMana === 200, 'mana cap should be 200, got ' + grown.maxMana);
check(manaRaises === 9, 'reaching the mana cap should take 9 crystals, took ' + manaRaises);

// Mana is spent only when there is enough.
const caster = stats.makeStats();
check(stats.spendMana(caster, 15), 'a 15-mana cast failed with 20 mana');
check(caster.mana === 5, 'the cast did not deduct');
check(!stats.spendMana(caster, 15), 'a cast succeeded without the mana for it');
check(caster.mana === 5, 'a failed cast still deducted mana');

// Death and respawn.
const doomed = stats.makeStats();
stats.damage(doomed, 999);
check(doomed.dead && doomed.health === 0, 'lethal damage did not kill');
stats.step(doomed, 10, false);
check(doomed.health === 0, 'a dead character regenerated');
stats.respawn(doomed);
check(!doomed.dead && doomed.health === doomed.maxHealth, 'respawn did not restore the character');

console.log('Inventory and stats: ' + checks + ' checks passed');
