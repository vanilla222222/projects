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

function makePlayer(x, y) {
  return {
    x, y, vx: 0, vy: 0,
    width: 0.78, height: 1.72,
    facing: 1, onGround: false, coyote: 0,
    health: 100, maxHealth: 100, breath: 1,
    mining: null, selected: 0
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

function step(player, world, tiles, input, dt) {
  unstick(player, world, tiles, 4);
  const accel = player.onGround ? 1 : AIR_CONTROL;
  if (input.left) player.vx -= MOVE_SPEED * accel * dt * 9;
  if (input.right) player.vx += MOVE_SPEED * accel * dt * 9;
  if (!input.left && !input.right) player.vx *= Math.pow(FRICTION, dt * 60);
  player.vx = Math.max(-MOVE_SPEED, Math.min(MOVE_SPEED, player.vx));
  if (Math.abs(player.vx) < 0.02) player.vx = 0;
  if (player.vx > 0) player.facing = 1;
  else if (player.vx < 0) player.facing = -1;

  player.coyote = player.onGround ? COYOTE : Math.max(0, player.coyote - dt);
  if (input.jump && player.coyote > 0) {
    player.vy = -JUMP_SPEED;
    player.coyote = 0;
    player.onGround = false;
  }

  player.vy = Math.min(MAX_FALL, player.vy + GRAVITY * dt);

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
  while (Math.abs(remainingY) > 1e-9) {
    const move = Math.abs(remainingY) > 0.25 ? stepY : remainingY;
    const nextY = player.y + move;
    if (overlapsSolid(world, tiles, player.x, nextY, player.width, player.height)) {
      if (move > 0) player.onGround = true;
      player.vy = 0;
      break;
    }
    player.y = nextY;
    remainingY -= move;
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { makePlayer, step, overlapsSolid, unstick, aimTile,
    GRAVITY, MOVE_SPEED, JUMP_SPEED, REACH, MAX_FALL };
}
