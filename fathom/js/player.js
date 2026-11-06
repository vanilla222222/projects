'use strict';
// Player state and tile collision. Movement resolves one axis at a time against the tile
// grid, which is what stops the familiar bugs: sliding into a wall no longer cancels gravity,
// and walking into a corner no longer wedges you inside it. The solver is pure so
// tools/physics-test.js can assert a player never ends a step overlapping a solid tile.

const GRAVITY = 52;
const MOVE_SPEED = 9.2;
const AIR_CONTROL = 0.62;
const JUMP_SPEED = 15.2;
const MAX_FALL = 46;
const FRICTION = 0.78;
const COYOTE = 0.1;
const REACH = 6.2;

// Water. Static water would be a wall of blue you fall through, so these three numbers are
// what make an ocean somewhere you can actually go: you sink slowly, you move slower, and
// holding jump swims you upward. Breath is tracked in stats; this file only does motion.
const SWIM_GRAVITY = 11;
const SWIM_MAX_FALL = 5.4;
const SWIM_SPEED = 0.62;
const SWIM_RISE = 6.4;
const WATER_DRAG = 0.86;

function makePlayer(x, y) {
  return {
    x, y, vx: 0, vy: 0,
    width: 0.78, height: 1.72,
    facing: 1, onGround: false, coyote: 0,
    health: 100, maxHealth: 100, breath: 1,
    mining: null, selected: 0,
    fell: 0, landed: 0, breath: 1,
    speedScale: 1, canDoubleJump: false, usedAir: false, heldJump: false
  };
}

function overlapsSolid(world, tiles, x, y, w, h) {
  const x0 = Math.floor(x);
  const x1 = Math.floor(x + w - 1e-6);
  const y0 = Math.floor(y);
  const y1 = Math.floor(y + h - 1e-6);
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      if (tiles.isSolid(world.get(tx, ty))) return true;
    }
  }
  return false;
}

// A platform stops you only from above, and only when you are falling onto it. The test
// needs the body's position before the move as well as after, because "landing on it" is
// the condition that the feet were above the deck and are now below: a platform you are
// already inside, or one you are rising through, has to let you pass.
//
// Without the previous position this cannot be decided at all. A platform checked on
// position alone either blocks you the instant you jump up into it, or never catches you.
function landsOnPlatform(world, tiles, x, prevY, nextY, w, h) {
  if (nextY <= prevY) return false;                 // rising or level: pass through
  const feetBefore = prevY + h;
  const feetAfter = nextY + h;
  const deck = Math.floor(feetAfter);
  if (Math.floor(feetBefore - 1e-6) >= deck) return false;   // already below the deck
  const x0 = Math.floor(x);
  const x1 = Math.floor(x + w - 1e-6);
  for (let tx = x0; tx <= x1; tx += 1) {
    if (tiles.tile(world.get(tx, deck)).platform) return true;
  }
  return false;
}

// Whether the player is standing on a platform deck right now, which is what lets the
// down key drop them through one.
function onPlatform(world, tiles, x, y, w, h) {
  const deck = Math.floor(y + h + 1e-4);
  const x0 = Math.floor(x);
  const x1 = Math.floor(x + w - 1e-6);
  for (let tx = x0; tx <= x1; tx += 1) {
    if (tiles.tile(world.get(tx, deck)).platform) return true;
  }
  return false;
}

// If the player is already inside a solid tile — a block placed on them, a spawn in a tree
// trunk — no amount of axis resolution frees them, because every candidate position also
// overlaps. Lift them out first, upward, which is the direction that is open in practice.
function unstick(player, world, tiles, limit) {
  if (!overlapsSolid(world, tiles, player.x, player.y, player.width, player.height)) return 0;
  for (let lift = 1; lift <= limit; lift += 1) {
    const y = player.y - lift;
    if (!overlapsSolid(world, tiles, player.x, y, player.width, player.height)) {
      player.y = y;
      player.vy = Math.min(player.vy, 0);
      return lift;
    }
  }
  for (const dir of [1, -1]) {
    for (let push = 1; push <= limit; push += 1) {
      const x = player.x + dir * push;
      if (!overlapsSolid(world, tiles, x, player.y, player.width, player.height)) {
        player.x = x;
        player.vx = 0;
        return push;
      }
    }
  }
  return -1;
}

// Whether the tile at the player's chest is liquid. Chest rather than feet, so standing
// in a puddle does not make you swim and wading does not stop you walking.
// Deep enough to swim in. A tile holding a splash of water is something you wade through;
// only a tile that is mostly full should take your feet off the ground.
const SWIM_DEPTH = 0.45;

// How wet a tile is, 0 to 1. Driven by the water level rather than by the block id,
// because a waterlogged shell or frond is every bit as swimmable as open water and
// checking for a water tile would have left dry pockets to fall through.
function liquidFraction(world, tiles, x, y) {
  if (tiles.isSolid(world.get(x, y))) return 0;
  if (!world.getLevel) return tiles.tile(world.get(x, y)).liquid ? 1 : 0;
  return world.getLevel(x, y) / (world.LEVEL_FULL || 255);
}

function inLiquid(player, world, tiles) {
  return liquidFraction(world, tiles, Math.floor(player.x + player.width / 2),
    Math.floor(player.y + player.height * 0.35)) >= SWIM_DEPTH;
}

function submerged(player, world, tiles) {
  return liquidFraction(world, tiles, Math.floor(player.x + player.width / 2),
    Math.floor(player.y + 0.2)) >= SWIM_DEPTH;
}

function step(player, world, tiles, input, dt) {
  unstick(player, world, tiles, 4);
  const swimming = inLiquid(player, world, tiles);
  player.swimming = swimming;
  player.submerged = swimming && submerged(player, world, tiles);
  const scale = player.speedScale || 1;
  const speed = (swimming ? MOVE_SPEED * SWIM_SPEED : MOVE_SPEED) * scale;
  const accel = player.onGround ? 1 : AIR_CONTROL;
  if (input.left) player.vx -= speed * accel * dt * 9;
  if (input.right) player.vx += speed * accel * dt * 9;
  if (!input.left && !input.right) player.vx *= Math.pow(FRICTION, dt * 60);
  if (swimming) player.vx *= Math.pow(WATER_DRAG, dt * 60);
  player.vx = Math.max(-speed, Math.min(speed, player.vx));
  if (Math.abs(player.vx) < 0.02) player.vx = 0;
  if (player.vx > 0) player.facing = 1;
  else if (player.vx < 0) player.facing = -1;

  player.coyote = player.onGround ? COYOTE : Math.max(0, player.coyote - dt);
  if (swimming) {
    // In water, jump is a continuous swim stroke rather than a one-shot impulse.
    if (input.jump) player.vy = Math.max(player.vy - SWIM_RISE * dt * 9, -SWIM_RISE);
    player.vy = Math.min(SWIM_MAX_FALL, player.vy + SWIM_GRAVITY * dt);
  } else {
    if (input.jump && player.coyote > 0) {
      player.vy = -JUMP_SPEED;
      player.coyote = 0;
      player.onGround = false;
      player.usedAir = false;
    } else if (input.jump && !player.heldJump && player.canDoubleJump && !player.usedAir
      && !player.onGround) {
      // The second jump, once, until the feet touch something again. Tracking whether
      // the key was already held is what stops one press spending both jumps.
      player.vy = -JUMP_SPEED * 0.88;
      player.usedAir = true;
    }
    if (player.onGround) player.usedAir = false;
    player.vy = Math.min(MAX_FALL, player.vy + GRAVITY * dt);
  }

  let dx = player.vx * dt;
  const stepX = Math.sign(dx) * Math.min(Math.abs(dx), 0.25);
  let remainingX = dx;
  while (Math.abs(remainingX) > 1e-9) {
    const move = Math.abs(remainingX) > 0.25 ? stepX : remainingX;
    const nextX = player.x + move;
    if (overlapsSolid(world, tiles, nextX, player.y, player.width, player.height)) {
      const stepUpY = player.y - 1;
      const canStepUp = player.onGround
        && !overlapsSolid(world, tiles, nextX, stepUpY, player.width, player.height);
      if (canStepUp) {
        player.x = nextX;
        player.y = stepUpY;
      } else {
        player.vx = 0;
        break;
      }
    } else {
      player.x = nextX;
    }
    remainingX -= move;
  }

  let remainingY = player.vy * dt;
  const stepY = Math.sign(remainingY) * Math.min(Math.abs(remainingY), 0.25);
  player.onGround = false;
  // Holding down drops you through a platform you are standing on, so a platform is a
  // floor you can choose to ignore rather than one you have to break.
  const dropping = input.down && onPlatform(world, tiles, player.x, player.y,
    player.width, player.height);
  while (Math.abs(remainingY) > 1e-9) {
    const move = Math.abs(remainingY) > 0.25 ? stepY : remainingY;
    const nextY = player.y + move;
    if (overlapsSolid(world, tiles, player.x, nextY, player.width, player.height)) {
      if (move > 0) player.onGround = true;
      player.vy = 0;
      break;
    }
    if (!dropping && landsOnPlatform(world, tiles, player.x, player.y, nextY,
      player.width, player.height)) {
      // Settle exactly on the deck rather than a fraction into it.
      player.y = Math.floor(nextY + player.height) - player.height;
      player.onGround = true;
      player.vy = 0;
      break;
    }
    player.y = nextY;
    remainingY -= move;
  }
  player.heldJump = !!input.jump;
  player.onPlatform = onPlatform(world, tiles, player.x, player.y, player.width, player.height);

  // How far the body has fallen without touching anything. Water arrests a fall, which is
  // both how it works and what makes diving into a pool a way down rather than a death.
  if (swimming) {
    player.fell = 0;
  } else if (player.onGround) {
    player.landed = player.fell;
    player.fell = 0;
  } else if (player.vy > 0) {
    player.fell = (player.fell || 0) + player.vy * dt;
  } else {
    player.fell = 0;
  }
  return player;
}

function aimTile(player, pointer) {
  const px = player.x + player.width / 2;
  const py = player.y + player.height * 0.4;
  const dx = pointer.x - px;
  const dy = pointer.y - py;
  const dist = Math.hypot(dx, dy);
  if (dist > REACH) {
    const k = REACH / dist;
    return { x: Math.floor(px + dx * k), y: Math.floor(py + dy * k), inReach: false, dist };
  }
  return { x: Math.floor(pointer.x), y: Math.floor(pointer.y), inReach: true, dist };
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
const EXPORTS_player = { makePlayer, step, overlapsSolid, unstick, aimTile, inLiquid, submerged, liquidFraction, SWIM_DEPTH,
  landsOnPlatform, onPlatform,
    GRAVITY, MOVE_SPEED, JUMP_SPEED, REACH, MAX_FALL };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_player;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.player = EXPORTS_player;
}
