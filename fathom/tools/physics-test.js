'use strict';
// The invariant that matters: whatever the input, a player never ends a step inside a solid
// tile. Everything else about movement is taste; that one is a bug.
const assert = require('node:assert/strict');
const tiles = require('../js/tiles.js');
const gen = require('../js/worldgen.js');
const { makeWorld } = require('../js/chunks.js');
const physics = require('../js/player.js');

const SEED = 20260105;
const world = makeWorld(SEED, gen);
let checks = 0;
let steps = 0;

// Spawn clear of trunks and foliage, the way the game's own spawn search does.
function spawn(x) {
  for (let probe = 0; probe < 32; probe += 1) {
    const col = x + probe;
    const surface = gen.surfaceHeight(SEED, col);
    const player = physics.makePlayer(col + 0.1, surface - 3);
    if (!physics.overlapsSolid(world, tiles, player.x, player.y, player.width, player.height)) {
      return player;
    }
  }
  throw new Error('no clear spawn near column ' + x);
}

// Random inputs over real terrain, in several biomes, must never end inside rock.
let embedded = 0;
let worstDepth = 0;
for (const column of [0, 320, -480, 1500, -2600, 7777]) {
  const player = spawn(column);
  let rand = 1234567 ^ column;
  const next = () => {
    rand ^= rand << 13; rand ^= rand >>> 17; rand ^= rand << 5; rand >>>= 0;
    return rand / 4294967296;
  };
  for (let i = 0; i < 4000; i += 1) {
    const input = { left: next() < 0.34, right: next() < 0.34, jump: next() < 0.11 };
    physics.step(player, world, tiles, input, 1 / 60);
    steps += 1;
    if (physics.overlapsSolid(world, tiles, player.x, player.y, player.width, player.height)) {
      embedded += 1;
      const d = Math.floor(player.y) - gen.surfaceHeight(SEED, Math.floor(player.x));
      if (d > worstDepth) worstDepth = d;
    }
  }
}
assert.equal(embedded, 0, embedded + ' of ' + steps + ' steps ended inside a solid tile'
  + (embedded ? ' (worst depth ' + worstDepth + ')' : ''));
checks += 1;

// A player dropped into a sealed pocket stays in it rather than falling through the floor.
const sealed = makeWorld(SEED, gen);
const bx = 40;
const by = gen.surfaceHeight(SEED, bx) - 12;
for (let y = by; y < by + 6; y += 1) {
  for (let x = bx; x < bx + 6; x += 1) {
    const edge = y === by || y === by + 5 || x === bx || x === bx + 5;
    sealed.set(x, y, edge ? tiles.idOf('brick') : tiles.AIR);
  }
}
const boxed = physics.makePlayer(bx + 2, by + 2);
for (let i = 0; i < 600; i += 1) {
  physics.step(boxed, sealed, tiles, { left: i % 7 < 3, right: i % 11 < 4, jump: i % 5 === 0 }, 1 / 60);
}
// Let it settle before asserting it is standing: the loop above jumps every fifth frame, so
// the final step legitimately leaves the player mid-air.
for (let i = 0; i < 90; i += 1) physics.step(boxed, sealed, tiles, {}, 1 / 60);
assert.ok(boxed.x > bx && boxed.x + boxed.width < bx + 6,
  'player escaped a sealed box horizontally to x=' + boxed.x.toFixed(2));
assert.ok(boxed.y > by && boxed.y + boxed.height < by + 6,
  'player escaped a sealed box vertically to y=' + boxed.y.toFixed(2));
assert.ok(boxed.onGround, 'player in a sealed box is not resting on its floor');
checks += 3;

// A player buried by a placed block is lifted out rather than wedged forever.
const buried = makeWorld(SEED, gen);
const px = 200;
const py = gen.surfaceHeight(SEED, px) - 6;
for (let y = py - 1; y < py + 3; y += 1) {
  for (let x = px - 1; x < px + 3; x += 1) buried.set(x, y, tiles.AIR);
}
const victim = physics.makePlayer(px, py);
for (let y = py; y < py + 2; y += 1) buried.set(px, y, tiles.idOf('stone'));
assert.ok(physics.overlapsSolid(buried, tiles, victim.x, victim.y, victim.width, victim.height),
  'the burial did not actually embed the player');
const lift = physics.unstick(victim, buried, tiles, 4);
assert.ok(lift > 0, 'unstick failed to free a buried player');
assert.ok(!physics.overlapsSolid(buried, tiles, victim.x, victim.y, victim.width, victim.height),
  'player is still embedded after unstick');
checks += 3;

// Terminal velocity is enforced, so a long fall cannot tunnel through thin ground.
const faller = physics.makePlayer(0, 10);
const empty = { get: () => tiles.AIR };
for (let i = 0; i < 1200; i += 1) physics.step(faller, empty, tiles, {}, 1 / 60);
assert.ok(faller.vy <= physics.MAX_FALL + 1e-6, 'fall speed ' + faller.vy + ' exceeded the cap');
checks += 1;

// Reach is clamped: a far pointer yields a tile on the reach circle, not at the pointer.
const reacher = physics.makePlayer(0, 0);
const far = physics.aimTile(reacher, { x: 400, y: 0 });
assert.equal(far.inReach, false, 'a pointer 400 tiles away reported as in reach');
assert.ok(Math.abs(far.x) <= physics.REACH + 1, 'clamped aim landed at x=' + far.x);
const near = physics.aimTile(reacher, { x: 2, y: 1 });
assert.equal(near.inReach, true, 'a pointer 2 tiles away reported as out of reach');
checks += 3;

console.log('Physics: ' + checks + ' invariants held over ' + steps.toLocaleString()
  + ' simulated steps across six columns; 0 ended inside a solid tile');
