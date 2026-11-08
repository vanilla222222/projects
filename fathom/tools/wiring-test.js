'use strict';

const assert = require('node:assert/strict');
const wiring = require('../js/wiring');
const tiles = require('../js/tiles');
const worldgen = require('../js/worldgen');
const chunks = require('../js/chunks');
const enemy = require('../js/enemy');

function testWorld() {
  const map = new Map();
  const levels = new Map();
  const key = (x, y) => x + ':' + y;
  return {
    LEVEL_FULL: 8,
    get: (x, y) => map.get(key(x, y)) || tiles.AIR,
    set: (x, y, id) => map.set(key(x, y), id),
    getLevel: (x, y) => levels.get(key(x, y)) || 0,
    setLevel(x, y, level, id) {
      levels.set(key(x, y), level);
      this.set(x, y, level ? id : tiles.AIR);
      return true;
    }
  };
}

{
  const world = testWorld();
  let doorCalls = 0;
  let occupied = false;
  const circuit = wiring.makeWiring(world, tiles, {
    door: () => { doorCalls += 1; },
    occupied: () => occupied
  });
  for (let x = -2; x <= 3; x += 1) assert.equal(circuit.add(x, 0), true);
  assert.equal(circuit.add(0, 0), false);
  assert.equal(circuit.add(1, 1), true);
  assert.equal(circuit.add(8, 0), true);
  world.set(-2, 0, tiles.idOf('wire-switch'));
  world.set(0, 0, tiles.idOf('wire-lamp'));
  world.set(3, 0, tiles.idOf('actuator-block'));
  world.set(1, 0, tiles.cellOf('oakdoor', 0, 0).id);
  world.set(1, 1, tiles.cellOf('oakdoor', 0, 1).id);
  world.set(8, 0, tiles.idOf('wire-lamp'));
  assert.equal(circuit.pulse(-2, 0), 7);
  assert.equal(tiles.tile(world.get(0, 0)).emit, 11);
  assert.equal(tiles.tile(world.get(8, 0)).emit, 0);
  assert.equal(doorCalls, 1);
  assert.equal(tiles.isSolid(world.get(3, 0)), false);
  occupied = true;
  circuit.pulse(-2, 0);
  assert.equal(tiles.isSolid(world.get(3, 0)), false);
  occupied = false;
  circuit.pulse(-2, 0);
  assert.equal(tiles.isSolid(world.get(3, 0)), true);
  assert.equal(circuit.remove(-1, 0), true);
  assert.equal(circuit.pulse(-2, 0), 1);
}

{
  const world = testWorld();
  const water = tiles.idOf('water'), lava = tiles.idOf('lava');
  const circuit = wiring.makeWiring(world, tiles);
  for (let x = 0; x < 4; x += 1) circuit.add(x, 0);
  world.set(0, 0, tiles.idOf('pressure-plate'));
  world.set(1, 0, tiles.idOf('inlet-pump'));
  world.set(3, 0, tiles.idOf('outlet-pump'));
  world.setLevel(1, -1, 7, water);
  world.setLevel(3, -1, 4, lava);
  circuit.step(0, { x: 0, y: 0 });
  assert.equal(world.getLevel(1, -1), 7);
  assert.equal(world.get(3, -1), lava);
  world.setLevel(3, -1, 4, water);
  circuit.step(0.1, { x: 0, y: 0 });
  assert.equal(world.getLevel(1, -1), 7);
  circuit.step(0.2, null);
  circuit.step(0.3, { x: 0, y: 0 });
  assert.equal(world.getLevel(1, -1), 3);
  assert.equal(world.getLevel(3, -1), 8);
}

{
  const world = testWorld();
  let statues = 0;
  let darts = 0;
  const hooks = { statue: () => ++statues, trap: () => ++darts };
  const circuit = wiring.makeWiring(world, tiles, hooks);
  for (let x = 0; x < 3; x += 1) circuit.add(x, 0);
  world.set(0, 0, tiles.idOf('wire-timer'));
  world.set(1, 0, tiles.idOf('stone-slime-statue'));
  world.set(2, 0, tiles.idOf('dart-trap'));
  assert.equal(circuit.toggleTimer(0, 0, 0), true);
  circuit.step(1.9);
  assert.equal(darts, 0);
  circuit.step(2);
  circuit.step(4);
  assert.deepEqual([statues, darts], [1, 2]);
  circuit.step(14);
  assert.deepEqual([statues, darts], [2, 3]);
  const restored = wiring.makeWiring(world, tiles, hooks);
  restored.restore(JSON.parse(JSON.stringify(circuit.serialize())), 20);
  restored.step(22);
  assert.equal(darts, 4);
  restored.clearDevice(0, 0);
  restored.step(25);
  assert.equal(darts, 4);
}

{
  const world = testWorld();
  const circuit = wiring.makeWiring(world, tiles);
  for (let x = 0; x < 1025; x += 1) circuit.add(x, 0);
  world.set(0, 0, tiles.idOf('wire-lamp'));
  assert.equal(circuit.pulse(0, 0), -1);
  assert.equal(tiles.tile(world.get(0, 0)).emit, 0);
}

{
  const world = chunks.makeWorld(20260105, worldgen);
  const { x, y } = worldgen.dungeonLayout(world.seed);
  assert.equal(tiles.tile(world.get(x + 5, y + 17)).circuit, 'switch');
  assert.equal(tiles.tile(world.get(x + 14, y + 17)).circuit, 'puzzle-gate');
  assert.equal(tiles.tile(world.get(x + 21, y + 16)).chest, 'ossuary-workshop-cache');
  assert.ok(world.getContainer(x + 21, y + 16).some(item => item.key === 'wire-cutters'));
  const circuit = wiring.makeWiring(world, tiles, { puzzle: point => world.set(point.x, point.y, tiles.AIR) });
  for (let dx = 5; dx <= 16; dx += 1) circuit.add(x + dx, y + 17);
  assert.equal(circuit.pulse(x + 5, y + 17), 12);
  assert.equal(world.get(x + 14, y + 17), tiles.AIR);
  assert.equal(tiles.tile(world.get(x + 16, y + 17)).emit, 11);

  const swarm = enemy.makeSwarm(world, tiles, { worldgen });
  assert.equal(swarm.summonPractice('dungeonkeeper', x + 7, y + 15), false);
  assert.equal(swarm.summonPractice('greenslime', x + 7, y + 15), true);
  assert.equal(swarm.list[0].practice, true);
}

{
  const world = testWorld();
  const circuit = wiring.makeWiring(world, tiles);
  for (const channel of ['blue', 'green', 'copper']) circuit.add(0, 0, channel);
  circuit.add(-1, 0, 'blue');
  circuit.add(1, 0, 'green');
  circuit.add(0, 1);
  circuit.add(0, -1, 'blue');
  world.set(0, 0, tiles.idOf('and-relay'));
  world.set(0, 1, tiles.idOf('wire-lamp'));
  world.set(0, -1, tiles.idOf('wire-lamp'));
  circuit.pulse(-1, 0, 0, 'blue');
  assert.equal(tiles.tile(world.get(0, 1)).emit, 0);
  assert.equal(tiles.tile(world.get(0, -1)).emit, 11);
  const loaded = wiring.makeWiring(world, tiles);
  loaded.restore(JSON.parse(JSON.stringify(circuit.serialize())));
  loaded.pulse(1, 0, 0, 'green');
  assert.equal(tiles.tile(world.get(0, 1)).emit, 11);
  assert.equal(tiles.tile(world.get(0, -1)).emit, 11);
  loaded.pulse(1, 0, 0, 'green');
  assert.equal(tiles.tile(world.get(0, 1)).emit, 11);
  world.set(0, 0, tiles.idOf('or-relay'));
  loaded.pulse(1, 0, 0, 'green');
  assert.equal(tiles.tile(world.get(0, 1)).emit, 0);
}

{
  const world = chunks.makeWorld(20260105, worldgen);
  world.enableHardmode();
  const { x, y } = worldgen.dungeonLayout(world.seed);
  assert.equal(tiles.tile(world.get(x, y + 58)).circuit, 'lower-seal');
  assert.equal(tiles.tile(world.get(x + 7, y + 73)).circuit, 'relay-gate');
  assert.equal(tiles.tile(world.get(x + 14, y + 74)).circuit, 'drain-gate');
  assert.equal(world.getLevel(x + 18, y + 72), world.LEVEL_FULL);
  assert.equal(world.getLevel(x + 21, y + 72), 0);
  assert.equal(tiles.tile(world.get(x + 14, y + 75)).climb, true);
  const circuit = wiring.makeWiring(world, tiles, {
    puzzle: (point, type) => {
      assert.equal(type, 'drain-gate');
      assert.equal(world.getLevel(x + 18, y + 72), 0, 'gate pulses after pumps');
      world.set(point.x, point.y, tiles.idOf('rope'));
    }
  });
  for (let dx = 11; dx <= 21; dx += 1) circuit.add(x + dx, y + 73);
  circuit.add(x + 14, y + 74);
  assert.equal(circuit.pulse(x + 11, y + 73), 12);
  assert.equal(world.getLevel(x + 21, y + 72), world.LEVEL_FULL);
  assert.equal(tiles.tile(world.get(x + 14, y + 74)).climb, true);
  for (const [index, dx] of worldgen.MECHANIST_CACHES.entries()) {
    assert.equal(tiles.tile(world.get(x + dx, y + 98)).chest, 'mechanist-armory');
    assert.equal(world.getContainer(x + dx, y + 98)[0].key, worldgen.MECHANIST_WEAPONS[index]);
  }
  const swarm = enemy.makeSwarm(world, tiles, { worldgen, dungeonOpen: () => true });
  const boss = swarm.summon('ossuarymechanist', { x: x + 14, y: y + 98 },
    { left: x - 23, right: x + 24, top: y + 78, bottom: y + 100 });
  assert.equal(boss?.spec.key, 'ossuarymechanist');
  assert.equal(swarm.contextAt(x, y + 94, 0.1).lowerOssuary, true);
}

console.log('Wiring checks passed across propagation, pumps, timers, cooldowns, persistence and the Ossuary');
