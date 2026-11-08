'use strict';

const assert = require('node:assert/strict');
const settlement = require('../js/settlement');
const craft = require('../js/craft');
const tiles = require('../js/tiles');
const enemy = require('../js/enemy');
const worldgen = require('../js/worldgen');

const ledger = settlement.makeSettlementLedger();
const devices = [{ x: 10, y: 20 }, { x: 210, y: 20 }, { x: 410, y: 20 }];
assert.equal(ledger.found(devices[0], 'forest'), true);
assert.equal(ledger.found(devices[0], 'desert'), false);
assert.equal(ledger.found(devices[1], 'forest'), true);
assert.equal(ledger.found(devices[2], 'desert'), true);

const forest = ledger.town(devices[0]);
const desert = ledger.town(devices[2]);
assert.equal(ledger.mark(forest, 'survey', 'ruin-a'), false);
for (let i = 1; i <= 6; i += 1) assert.equal(ledger.mark(forest, 'hunt'), i === 6);
assert.equal(ledger.mark(forest, 'hunt'), false);
assert.equal(ledger.progress(forest), 6);
assert.equal(ledger.mark(desert, 'survey', 'ruin-a'), false);
assert.equal(ledger.mark(desert, 'survey', 'ruin-a'), false);
assert.equal(ledger.progress(desert), 1);
assert.equal(ledger.mark(desert, 'survey', 'ruin-b'), true);

assert.deepEqual([...ledger.charterRegions(devices, () => 3)], []);
for (const device of devices) ledger.town(device).rank = 2;
assert.deepEqual([...ledger.charterRegions(devices, () => 2)], ['forest', 'desert']);
assert.deepEqual([...ledger.charterRegions(devices, device => device.x < 400 ? 2 : 1)], ['forest']);

assert.equal(ledger.record('fish', 'bass'), true);
assert.equal(ledger.record('fish', 'bass'), false);
assert.equal(ledger.record('fish', 'trout'), true);
assert.equal(ledger.count('fish'), 2);
ledger.claimed.add('network:2');
ledger.shipment = { from: '10:20', to: '410:20', cargo: ['rope', 15] };
ledger.prizes.set(1, [['solarium-bar', 5], ['coin', 4000]]);
assert.deepEqual(ledger.finish(1, 84.2), { clears: 1, best: 85 });
assert.deepEqual(ledger.finish(1, 88), { clears: 2, best: 85 });
assert.deepEqual(ledger.finish(1, 71.3), { clears: 3, best: 72 });

const stored = JSON.parse(JSON.stringify(ledger.serialize()));
const restored = settlement.makeSettlementLedger(stored);
assert.deepEqual(restored.serialize(), stored);
assert.equal(restored.count('fish'), 2);
assert.equal(restored.town(devices[0]).kills, 6);
assert.equal(restored.town(devices[2]).marks.length, 2);

function itemExists(key) {
  assert.notEqual(craft.nameOf(key, tiles), key, 'Unknown item ' + key);
}

for (const region of [...worldgen.BIOMES, ...worldgen.LAYERS, worldgen.HALLOW_BIOME]) {
  const role = settlement.settlementRole(region.key);
  assert.ok(settlement.JOBS[settlement.settlementJob(region.key)]);
  assert.equal(tiles.BY_KEY[role.station].station, role.station);
  for (const [key] of [...role.stock, ...role.supplies]) itemExists(key);
}
for (const milestone of [...settlement.MILESTONES, ...settlement.NETWORK]) {
  for (const [key] of milestone.reward) itemExists(key);
}
for (const contract of settlement.EXPEDITIONS) {
  itemExists(contract.ore);
  for (const key of contract.bosses) assert.equal(enemy.BY_KEY[key].boss, true);
}

console.log('Settlement checks passed across fieldwork, charters, trade, collections, expedition records and save round trips');
