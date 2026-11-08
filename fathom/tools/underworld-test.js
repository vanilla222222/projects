'use strict';

const assert = require('node:assert/strict');
const overworld = require('../js/worldgen');
const { makeUnderworldGenerator, brineTide } = require('../js/underworld');
const tiles = require('../js/tiles');
const enemy = require('../js/enemy');
const fishing = require('../js/fishing');
const craft = require('../js/craft');
const { makeWorld } = require('../js/chunks');

const seed = overworld.generationSeed(73);
const underworld = makeUnderworldGenerator(overworld);
const sea = underworld.SEA_LEVEL;
const centers = [-2, -1, 0, 1, 2].map(band => band * underworld.bandWidth);
assert.equal(new Set(centers.map(x => underworld.biomeAt(seed, x).key)).size, 5);
assert.equal(underworld.baseTileAt(seed, 0, sea - 1), tiles.idOf('underworld-return'));
assert.notEqual(overworld.baseTileAt(seed, 0, sea - 1), tiles.idOf('underworld-return'));
for (const center of centers) {
  const biome = underworld.biomeAt(seed, center);
  const targets = [[center + 84, underworld.surfaceHeight(seed, center + 84)],
    [center - 76, sea + 102], [center + 24, sea + 236]];
  for (const [index, [x, y]] of targets.entries()) {
    const site = underworld.biomeSiteAt(seed, x, y);
    assert.equal(site.name, biome.structures[index]);
    if (index) {
      assert.equal(underworld.baseTileAt(seed, x, y), tiles.idOf('underworld-shrine'));
      assert.ok(enemy.BY_KEY[biome.key + '-guardian-' + index].underworldGuardian);
    }
    if (!site.mimic) assert.ok(underworld.baseContainerAt(seed, site.x + 5, site.floor - 2).length);
  }
  for (const layer of ['surface', 'caves', 'deep']) {
    const pool = enemy.poolFor({ biome: biome.key, layer, wet: false, day: true, underworld: true });
    assert.ok(pool.length > 0 && pool.every(spec => spec.underworld));
    assert.ok(!enemy.poolFor({ biome: biome.key, layer, wet: false, day: true }).some(spec => spec.underworld));
  }
  const liquid = biome.key === 'ember-bloom' ? 'lava' : 'water';
  assert.ok(fishing.catchesFor({ biome: biome.key, layer: 'surface', liquid, amount: fishing.POOL })
    .some(entry => entry.key === biome.fish.key));
  assert.ok(craft.RECIPES.some(recipe => recipe.out.key === biome.key + '-bar'));
  let ore = false, wood = false, pool = false;
  for (let x = center - 80; x <= center + 80; x += 1) {
    for (let y = sea - 28; y <= sea + 140; y += 1) {
      const tile = underworld.baseTileAt(seed, x, y);
      ore ||= tile === tiles.idOf(biome.key + '-ore');
      wood ||= tile === tiles.idOf(biome.key + '-wood');
      pool ||= tile === tiles.idOf(liquid);
    }
  }
  assert.ok(ore && wood && pool, biome.name + ' lacks generated resources');
}
const world = makeWorld(seed, underworld);
world.set(3, sea - 2, tiles.idOf('ashwood-wood'));
const restored = makeWorld(seed, underworld);
restored.restore(JSON.parse(JSON.stringify(world.serialize())));
assert.equal(restored.get(3, sea - 2), tiles.idOf('ashwood-wood'));

console.log('Underworld checks passed for five biomes, three structure bands, local loot, enemies, fishing, and save round trips');

for (const biome of tiles.UNDERWORLD_BIOMES) {
  const liquid = biome.key === 'ember-bloom' ? 'lava' : 'water';
  const surface = { biome: biome.key, layer: 'surface', liquid, amount: fishing.POOL };
  const cave = { ...surface, layer: 'caves' };
  assert.ok(fishing.catchesFor(surface).some(entry => entry.key === biome.crate.key));
  assert.ok(!fishing.catchesFor(surface).some(entry => entry.key === biome.caveFish.key));
  assert.ok(fishing.catchesFor(cave).some(entry => entry.key === biome.caveFish.key));
  assert.equal(craft.ITEMS[biome.crate.key].use.open, biome.crate.key);
  const loot = fishing.crateContents(() => 0, seed, 0, 0, biome.crate.key);
  assert.ok(loot.some(entry => entry.key === biome.key + '-ore'));
  assert.ok(loot.some(entry => craft.ACCESSORIES[entry.key]));
  for (const fish of [biome.fish, biome.caveFish]) {
    assert.ok(craft.RECIPES.some(recipe => recipe.out.key === fish.key + '-stew' && recipe.station === 'cauldron'));
  }
}
assert.equal(fishing.RODS['kilnline-rod'].lava, true);
assert.ok(fishing.RODS['saltroot-rod'].power > fishing.RODS['gold-rod'].power);

const route = tiles.UNDERWORLD_CAMPAIGN;
assert.equal(route.length, 15);
for (const key of ['key', 'structure', 'summon', 'trophy']) {
  assert.equal(new Set(route.map(encounter => encounter[key])).size, 15);
}
const directions = new Set();
for (let i = 1; i <= 8; i += 1) {
  const routeSeed = overworld.generationSeed(i);
  const realm = makeWorld(routeSeed, underworld);
  const sites = route.map(encounter => underworld.campaignSite(routeSeed, encounter));
  const direction = Math.sign(sites[0].x);
  directions.add(direction);
  for (const [index, site] of sites.entries()) {
    const { encounter, x, floor } = site;
    assert.equal(underworld.campaignSiteAt(routeSeed, x, floor - 1).encounter, encounter);
    assert.equal(realm.get(x, floor - 1), tiles.idOf('underworld-campaign-seal'));
    if (index % 3 === 2) {
      assert.equal(underworld.biomeAt(routeSeed, site.left).key === underworld.biomeAt(routeSeed, site.right).key, false);
    } else assert.equal(underworld.biomeAt(routeSeed, x).key, encounter.biome);
    assert.equal(craft.ITEMS[encounter.summon].use.summon, encounter.key);
    assert.ok(craft.RECIPES.some(recipe => recipe.out.key === encounter.summon && recipe.station === 'anvil'));
    assert.ok(craft.RECIPES.some(recipe => recipe.out.kind === 'accessory' && recipe.need.some(([key]) => key === encounter.trophy)));
    const player = { x, y: floor - 2, width: 0.8, height: 1.8 };
    let volleys = 0;
    const swarm = enemy.makeSwarm(realm, tiles, { worldgen: underworld, random: () => 0.5,
      bossBarrage: () => { volleys += 1; } });
    const boss = swarm.summon(encounter.key, player, { ...site, top: site.top + 1 });
    assert.ok(boss, encounter.name + ' could not spawn in ' + encounter.structure);
    assert.equal(boss.spec.bossDrops[0][0], encounter.trophy);
    assert.equal(swarm.summon(encounter.key, player, site), null);
    for (let step = 0; step < 420; step += 1) swarm.step(player, 1 / 60, 0.5);
    assert.ok(volleys > 0, encounter.name + ' did not fire a barrage');
    assert.ok(boss.x >= site.left && boss.x + boss.width <= site.right);
  }
}
assert.equal(directions.size, 2);
console.log('All 15 campaign arenas, summons, barrages and trophy recipes verified in both world orientations');

const dungeons = tiles.UNDERWORLD_DUNGEONS;
assert.equal(dungeons.length, 5);
assert.equal(new Set(dungeons.map(encounter => encounter.order.join())).size, 5);
for (let i = 1; i <= 8; i += 1) {
  const dungeonSeed = overworld.generationSeed(i);
  const realm = makeWorld(dungeonSeed, underworld);
  const volleySizes = [];
  for (const encounter of dungeons) {
    const site = underworld.dungeonSite(dungeonSeed, encounter);
    const { x, top, floor, entrance, cache, conduits, waystone } = site;
    assert.equal(underworld.biomeAt(dungeonSeed, x).key, encounter.biome);
    assert.equal(underworld.encounterSiteAt(dungeonSeed, x, floor - 1).encounter, encounter);
    assert.equal(realm.get(x + 3, entrance - 1), tiles.idOf('underworld-dungeon-tablet'));
    for (let y = entrance; y < top; y += 1) assert.equal(realm.get(x, y), tiles.idOf('rope'));
    for (const dx of [-1, 0, 1]) assert.equal(realm.get(x + dx, top), tiles.idOf('underworld-dungeon-lock'));
    for (const conduit of conduits) {
      assert.equal(realm.get(conduit.x, conduit.y), tiles.idOf('underworld-conduit'));
      assert.ok(tiles.isSolid(realm.get(conduit.x, conduit.y + 1)));
    }
    assert.equal(realm.get(x, floor - 1), tiles.idOf('underworld-campaign-seal'));
    assert.equal(realm.get(waystone.x, waystone.y), tiles.idOf('underworld-waystone'));
    assert.equal(tiles.tile(realm.get(cache.x, cache.y)).chest, 'goldchest');
    assert.ok(underworld.baseContainerAt(dungeonSeed, cache.x, cache.y).some(item => item.key === encounter.biome + '-relic'));
    assert.equal(craft.ITEMS[encounter.summon].use.summon, encounter.key);
    assert.equal(craft.bossPrerequisite(encounter.key, new Set()), null);
    assert.ok(craft.RECIPES.some(recipe => recipe.out.kind === 'accessory' && recipe.need.some(([key]) => key === encounter.trophy)));
    const player = { x, y: floor - 2, width: 0.8, height: 1.8 };
    const volleys = [];
    const swarm = enemy.makeSwarm(realm, tiles, { worldgen: underworld, random: () => 0.5,
      bossBarrage: (_, shot) => volleys.push(shot.angles) });
    assert.ok(swarm.summon(encounter.key, player, { ...site, top: top + 1 }));
    for (let step = 0; step < 360; step += 1) swarm.step(player, 1 / 60, 0.5);
    assert.ok(volleys.length && volleys[0].every(Number.isFinite));
    volleySizes.push(volleys[0].length);
  }
  assert.deepEqual(volleySizes, [2, 5, 4, 4, 8]);
}
console.log('All five optional dungeons verified across seeds, including conduits, caches, boss volleys and loot recipes');

assert.equal(brineTide(0.9).low, true);
assert.equal(brineTide(0.04).low, true);
assert.equal(brineTide(0.12).low, false);
assert.equal(brineTide(0.7).low, false);
assert.ok(Math.abs(brineTide(0.82).untilChange - 0.25) < 1e-9);
for (let i = 1; i <= 8; i += 1) {
  const genSeed = overworld.generationSeed(i);
  const ruin = underworld.tidalRuin(genSeed);
  assert.equal(underworld.biomeAt(genSeed, ruin.x).key, 'brine-depths');
  for (const [point, key] of [[ruin.hatch, 'tidal-hatch'], [ruin.exit, 'tidal-exit'], [ruin.archive, 'tidal-archive']]) {
    assert.equal(underworld.baseTileAt(genSeed, point.x, point.y), tiles.idOf(key));
    assert.ok(tiles.isSolid(underworld.baseTileAt(genSeed, point.x, point.y + 1)));
  }
  const sluice = underworld.dungeonSite(genSeed, dungeons.find(encounter => encounter.key === 'undertow-warden'));
  assert.equal(underworld.baseTileAt(genSeed, sluice.x - 12, sluice.floor - 1), tiles.idOf('tidekeeper-cell'));
}
assert.ok(fishing.RODS['tideglass-rod'].power > fishing.RODS['saltroot-rod'].power);
