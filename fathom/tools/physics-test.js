'use strict';
// The invariant that matters: whatever the input, a player never ends a step inside a solid
// tile. Everything else about movement is taste; that one is a bug.
const assert = require('node:assert/strict');
const tiles = require('../js/tiles.js');
const gen = require('../js/worldgen.js');
const { makeWorld } = require('../js/chunks.js');
const physics = require('../js/player.js');
const stats = require('../js/stats.js');

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


// --- ropes ----------------------------------------------------------------------------
// A rope is not solid and holds nothing up; the whole of it is that gravity stops and
// the jump key becomes "up". What is worth proving is that it is climbable both ways,
// that stepping off it drops you, and that it is a way up rather than a free lift.
{
  const W = 24;
  const H = 60;
  const FLOOR = 40;
  const ROPE_X = 10;
  const rope = tiles.idOf('rope');
  const stone = tiles.idOf('stone');
  const shaft = {
    get(x, y) {
      if (x < 0 || x >= W || y < 0 || y >= H) return stone;
      if (y >= FLOOR) return stone;
      return x === ROPE_X && y > 20 ? rope : tiles.AIR;
    }
  };
  const climber = physics.makePlayer(ROPE_X, FLOOR - 2);
  assert.ok(physics.onClimbable(climber, shaft, tiles), 'standing on a rope is not climbing');

  // Up.
  const startedAt = climber.y;
  for (let i = 0; i < 60 * 2; i += 1) {
    physics.step(climber, shaft, tiles, { jump: true }, 1 / 60);
  }
  assert.ok(climber.y < startedAt - 6,
    'two seconds of climbing rose only ' + (startedAt - climber.y).toFixed(1) + ' tiles');
  assert.ok(climber.y > 20, 'the climber went past the top of the rope');
  const topped = climber.y;

  // Holding nothing: a rope holds you where you are rather than letting you slide.
  for (let i = 0; i < 60; i += 1) physics.step(climber, shaft, tiles, {}, 1 / 60);
  assert.ok(Math.abs(climber.y - topped) < 0.1,
    'a second of hanging on a rope slid ' + (climber.y - topped).toFixed(2) + ' tiles');

  // Down.
  for (let i = 0; i < 60; i += 1) physics.step(climber, shaft, tiles, { down: true }, 1 / 60);
  assert.ok(climber.y > topped + 3, 'climbing down a rope went nowhere');

  // And stepping off it falls. The rope is one tile wide, so moving sideways leaves it.
  const stepper = physics.makePlayer(ROPE_X, 26);
  for (let i = 0; i < 60; i += 1) physics.step(stepper, shaft, tiles, { right: true }, 1 / 60);
  assert.ok(!physics.onClimbable(stepper, shaft, tiles), 'walking sideways stayed on the rope');
  assert.ok(stepper.y > 26, 'stepping off a rope did not fall');
  checks += 6;
}

// --- the grappling hook ----------------------------------------------------------------
// The hook itself lives in game.js, but the one thing it asks of the physics is that a
// hooked player is not pulled down while being reeled in. That is the whole contract.
{
  const air = { get: () => tiles.AIR };
  const hung = physics.makePlayer(0, 0);
  hung.hooked = true;
  hung.vy = 0;
  for (let i = 0; i < 60 * 3; i += 1) physics.step(hung, air, tiles, {}, 1 / 60);
  assert.ok(Math.abs(hung.vy) < 0.001,
    'a hooked player accelerated to ' + hung.vy.toFixed(2) + ': gravity is still on');
  assert.ok(Math.abs(hung.y) < 0.01, 'a hooked player drifted ' + hung.y.toFixed(2) + ' tiles');

  // And releasing restores gravity rather than leaving the player floating.
  hung.hooked = false;
  for (let i = 0; i < 30; i += 1) physics.step(hung, air, tiles, {}, 1 / 60);
  assert.ok(hung.vy > 1, 'letting go of the hook left the player floating');
  checks += 3;
}


// --- water arrests a fall ------------------------------------------------------------
// Terraria's rule, and the one that makes diving into a pool a way down rather than a
// death. The code has always had it; nothing had ever checked it, and it is exactly the
// kind of line that gets lost in a refactor and is never noticed until someone dies at
// the bottom of a shaft they have used fifty times.
{
  const H = 90;
  const FLOOR = 70;
  const POOL_TOP = 64;
  const stone = tiles.idOf('stone');
  const water = tiles.idOf('water');
  const shaft = {
    get(x, y) {
      if (y >= FLOOR) return stone;
      if (x < -2 || x > 2) return stone;
      return y >= POOL_TOP ? water : tiles.AIR;
    },
    getLevel(x, y) { return (y >= POOL_TOP && y < FLOOR && x >= -2 && x <= 2) ? 255 : 0; },
    LEVEL_FULL: 255
  };
  const dry = {
    get(x, y) {
      if (y >= FLOOR) return stone;
      return (x < -2 || x > 2) ? stone : tiles.AIR;
    },
    getLevel() { return 0; },
    LEVEL_FULL: 255
  };

  // The same fall, once onto rock and once into water.
  const onto = (world) => {
    const faller = physics.makePlayer(0, 10);
    let worst = 0;
    for (let i = 0; i < 60 * 12; i += 1) {
      physics.step(faller, world, tiles, {}, 1 / 60);
      worst = Math.max(worst, faller.landed);
      if (faller.onGround && i > 30) break;
    }
    return { landed: worst, y: faller.y };
  };

  const hard = onto(dry);
  const wet = onto(shaft);
  assert.ok(hard.landed > stats.SAFE_FALL,
    'the dry fall was only ' + hard.landed.toFixed(1) + ' tiles: the fixture is wrong');
  assert.ok(stats.fallDamage(hard.landed) > 0, 'a fifty-tile drop onto rock did not hurt');
  assert.equal(wet.landed, 0,
    'falling into water recorded a ' + wet.landed.toFixed(1) + '-tile landing');
  assert.equal(stats.fallDamage(wet.landed), 0, 'falling into water hurt');
  checks += 4;
}

// Wings have a finite charge, glide after it is spent, and recharge on landing.
{
  const platform = { get: (x, y) => y >= 40 ? tiles.idOf('stone') : tiles.AIR };
  const flyer = physics.makePlayer(10, 40 - 1.72);
  flyer.onGround = true;
  flyer.flight = 1.15;
  const dt = 1 / 120;
  for (let i = 0; i < 180; i += 1) physics.step(flyer, platform, tiles, { jump: true }, dt);
  assert.ok(flyer.y < 30 && !flyer.onGround, 'wings did not extend the jump');
  assert.equal(flyer.flightUsed, flyer.flight);
  assert.ok(flyer.wingsSpread && flyer.vy <= 5, 'spent wings failed to glide');
  physics.step(flyer, platform, tiles, {}, dt);
  assert.equal(flyer.wingsSpread, false);
  for (let i = 0; i < 480; i += 1) physics.step(flyer, platform, tiles, {}, dt);
  assert.equal(flyer.flightUsed, 0);
  assert.equal(flyer.onGround, true);
  checks += 6;
}

console.log('Physics: ' + checks + ' invariants held over ' + steps.toLocaleString()
  + ' simulated steps across six columns; 0 ended inside a solid tile');
