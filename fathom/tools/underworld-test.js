'use strict';

const assert = require('node:assert/strict');
const overworld = require('../js/worldgen');
const { makeUnderworldGenerator } = require('../js/underworld');
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
