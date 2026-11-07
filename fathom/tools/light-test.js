'use strict';
const assert = require('node:assert/strict');
const tiles = require('../js/tiles.js');
const { ambientAtDepth, makeLightField } = require('../js/light.js');

const field = makeLightField(tiles);
const width = 33;
const height = 21;
const air = tiles.AIR;
const torch = tiles.idOf('torch');
const crystal = tiles.idOf('crystal');
const stone = tiles.idOf('stone');
const depth = 200;
const surface = () => 0;
const compute = (get, y = depth) => field.compute({ get }, 0, y, width, height, 255, 0, surface);

assert.equal(ambientAtDepth(0), 88);
assert.ok(ambientAtDepth(30) < ambientAtDepth(10));
assert.ok(ambientAtDepth(depth) <= 12);

compute(() => air);
assert.ok(field.buffer.every(value => value === 0), 'deep open air received sunlight');
compute(() => air, -20);
assert.ok(field.at(16, 10, 0) > 200, 'surface view lost daylight');

compute((x, y) => x === 16 && y === depth + 10 ? crystal : air);
const naturalLight = field.at(21, 10, 0);
compute((x, y) => x === 16 && y === depth + 10 ? torch : air);
assert.ok(field.at(21, 10, 0) > naturalLight + 100, 'torch did not outperform crystal glow');
assert.ok(field.at(28, 10, 0) > 0, 'torch light stopped short in open air');

compute((x, y) => {
  if (x >= 19 && x <= 21) return stone;
  return x === 16 && y === depth + 10 ? torch : air;
});
assert.equal(field.at(22, 10, 0), 0, 'torch shone through solid rock');
compute(() => air);
assert.ok(field.buffer.every(value => value === 0), 'removed torch left stale light');

console.log('Depth falloff, sunlight, torch range, rock occlusion and light invalidation passed');
