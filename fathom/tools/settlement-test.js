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

assert.equal(ledger.rangerTrail.started, false);
Object.assign(ledger.rangerTrail, { started: true, town: '10:20', camp: { x: 50, y: 24 },
  restored: true, deliveredTo: '410:20' });
const stored = JSON.parse(JSON.stringify(ledger.serialize()));
const restored = settlement.makeSettlementLedger(stored);
assert.deepEqual(restored.serialize(), stored);
assert.equal(restored.count('fish'), 2);
assert.equal(restored.rangerTrail.deliveredTo, '410:20');
assert.equal(restored.rangerTrail.completed, false);
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

assert.equal(settlement.QUESTLINES.length, 19);
assert.equal(new Set(settlement.QUESTLINES.map(line => line.id)).size, 19);
for (const line of settlement.QUESTLINES) {
  assert.equal(line.steps.length, 3);
  for (const step of line.steps) {
    for (const [key] of [...step.reward, ...(step.needs || [])]) itemExists(key);
  }
}
restored.increment('hunt:forest');
restored.increment('hunt:forest');
assert.equal(settlement.makeSettlementLedger(restored.serialize()).count('hunt:forest'), 2);

for (const region of [...worldgen.BIOMES, ...tiles.UNDERWORLD_BIOMES]) {
  const jobs = [0, 1, 2].map(day => settlement.settlementDaily(devices[0], region.key, day));
  assert.equal(new Set(jobs.map(job => job.name)).size, 3);
  assert.deepEqual(settlement.settlementDaily(devices[0], region.key, 3), jobs[0]);
  for (const job of jobs) for (const [key] of [...job.reward, ...(job.needs || [])]) itemExists(key);
}
restored.town(devices[0]).daily = { day: 5, start: 2, done: true };
assert.deepEqual(settlement.makeSettlementLedger(JSON.parse(JSON.stringify(restored.serialize())))
  .town(devices[0]).daily, { day: 5, start: 2, done: true });
assert.equal(worldgen.worldSettingValues().day, 1440);

{
  const chapters = settlement.CAMPAIGN;
  assert.equal(chapters.length, 13);
  const main = new Set(chapters.flatMap(chapter => chapter.trio ? craft.HARDMODE_TRIO : chapter.bosses || []));
  const side = Object.keys(settlement.CAMPAIGN_HUNTS);
  assert.equal(side.length, 35);
  assert.deepEqual([...main, ...side].sort(), enemy.ENEMIES.filter(spec => spec.boss && !spec.portalTrial && !spec.underworld).map(spec => spec.key).sort());
  for (const chapter of chapters) for (const [key] of chapter.reward) itemExists(key);
  const ready = (id, wins, flags) => settlement.campaignChapterReady(
    chapters.find(chapter => chapter.id === id), new Set(wins), new Set(flags), craft.HARDMODE_TRIO);
  assert.equal(ready('first-forge', [], []), false);
  assert.equal(ready('first-forge', [], ['forge']), true);
  assert.equal(ready('machines', craft.HARDMODE_TRIO.slice(1), []), false);
  assert.equal(ready('machines', craft.HARDMODE_TRIO, []), true);
  assert.equal(ready('machines', ['starwyvern'], []), true);
  assert.equal(ready('astral', ['astralregent'], []), false);
  assert.equal(ready('astral', ['astralregent'], ['astral']), true);
}

{
  const world = require('../js/chunks').makeWorld(41, worldgen);
  const sites = worldgen.portalTrialSites(41);
  assert.equal(sites.length, 10);
  assert.deepEqual(sites.map(site => worldgen.layerAt(site.y).key).sort(),
    ['hell', 'hell', 'hell', 'sky', 'space', 'space', 'space', 'void', 'void', 'void']);
  assert.equal(new Set(sites.map(site => site.reward)).size, 10);
  assert.equal(sites.filter(site => site.reward.startsWith('portal-fragment-')).length, 9);
  assert.equal(sites.find(site => site.reward === 'portal-activator').layer, 'sky');
  const first = sites[0];
  const seal = tiles.idOf('portal-trial-seal');
  assert.notEqual(world.get(first.x, first.y - 1), seal);
  world.set(first.x + 1, first.y - 1, tiles.idOf('stone'));
  assert.equal(world.enablePortalHunt(), true);
  assert.equal(world.enablePortalHunt(), false);
  for (const site of sites) {
    assert.equal(world.get(site.x, site.y - 1), seal);
    assert.equal(world.portalSiteAt(site.x, site.y - 1).id, site.id);
    assert.equal(world.getLevel(site.x, site.y - 2), 0);
    assert.equal(enemy.BY_KEY[site.boss].portalTrial, site.id);
    assert.equal(craft.ITEMS[site.reward].portalComponent, true);
  }
  const restoredWorld = require('../js/chunks').makeWorld(41, worldgen);
  restoredWorld.restore(JSON.parse(JSON.stringify(world.serialize())));
  assert.equal(restoredWorld.get(first.x, first.y - 1), seal);
  assert.equal(restoredWorld.get(first.x + 1, first.y - 1), tiles.idOf('stone'));
}
