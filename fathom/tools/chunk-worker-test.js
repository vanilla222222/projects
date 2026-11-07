'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const gen = require('../js/worldgen.js');
const tiles = require('../js/tiles.js');
const { makeWorld } = require('../js/chunks.js');

const workerDir = path.join(__dirname, '../workers');
let result;
const context = vm.createContext({
  self: {
    postMessage(chunk, transfers) {
      assert.equal(transfers[0], chunk.tiles.buffer);
      assert.equal(transfers[1], chunk.walls.buffer);
      result = chunk;
    }
  },
  importScripts(...names) {
    for (const name of names) vm.runInContext(fs.readFileSync(path.join(workerDir, name), 'utf8'), context);
  }
});
vm.runInContext(fs.readFileSync(path.join(workerDir, 'chunk.js'), 'utf8'), context);

const seed = 7291;
const cx = -2;
const cy = 8;
const x = cx * gen.CHUNK;
const y = cy * gen.CHUNK;
context.self.onmessage({ data: { seed, cx, cy } });
const expected = gen.generateChunk(seed, cx, cy);
assert.deepEqual(Array.from(result.tiles), Array.from(expected.tiles));
assert.deepEqual(Array.from(result.walls), Array.from(expected.walls));

const world = makeWorld(seed, gen);
const tile = expected.tiles[0] === tiles.AIR ? tiles.idOf('stone') : tiles.AIR;
const wall = expected.walls[0] === 0 ? tiles.wallIdOf('dirtwall') : 0;
world.set(x, y, tile);
world.setWall(x, y, wall);
world.evictOutside(0, 0, 0, 0);
assert.equal(world.hasChunk(cx, cy), false);
world.acceptGeneratedChunk(cx, cy, result);
assert.equal(world.get(x, y), tile);
assert.equal(world.getWall(x, y), wall);
assert.equal(world.acceptGeneratedChunk(cx, cy, expected), result);
console.log('Worker output, transfer buffers, saved edits and duplicate chunk checks passed');
