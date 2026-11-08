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
    speedScale: 1, canDoubleJump: false, usedAir: false, heldJump: false,
    flight: 0, flightUsed: 0, wingsSpread: false, cart: null
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

// How fast a rope is climbed, and how much sideways control there is while on one.
const CLIMB_SPEED = 6.2;
const CLIMB_DRIFT = 0.3;

// Whether any tile the body overlaps is climbable. Checked along the body's own centre
// column, so stepping half off a rope lets go of it - which is how you get off one.
function onClimbable(player, world, tiles) {
  const x = Math.floor(player.x + player.width / 2);
  const y0 = Math.floor(player.y);
  const y1 = Math.floor(player.y + player.height - 0.01);
  for (let y = y0; y <= y1; y += 1) {
    if (tiles.tile(world.get(x, y)).climb) return true;
  }
  return false;
}

function railAt(world, tiles, x, y) {
  return tiles.tile(world.get(x, y)).rail;
}

function mountMinecart(player, world, tiles, x, y) {
  if (!railAt(world, tiles, x, y) || overlapsSolid(world, tiles,
    x + 0.5 - player.width / 2, y - player.height, player.width, player.height)) return false;
  player.x = x + 0.5 - player.width / 2;
  player.y = y - player.height;
  player.cart = { x, y, speed: 0, stopReady: false };
  player.vx = player.vy = player.fell = player.landed = 0;
  player.onGround = true;
  return true;
}

function dismountMinecart(player, jump = false) {
  player.cart = null;
  player.vx = 0;
  player.vy = jump ? -7 : 0;
  player.onGround = false;
  player.coyote = 0;
}

function stepMinecart(player, world, tiles, input, dt) {
  const cart = player.cart;
  const rail = railAt(world, tiles, cart.x, cart.y);
  if (input.jump || !rail) {
    dismountMinecart(player, Boolean(input.jump && rail));
    player.heldJump = Boolean(input.jump);
    return false;
  }
  const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
  if (rail === 'stop' && !direction) cart.stopReady = true;
  const limit = rail === 'brake' ? 4 : 34;
  if (rail === 'stop' && !cart.stopReady) cart.speed = 0;
  else if (input.down) cart.speed *= Math.pow(0.78, dt * 60);
  else if (direction) {
    if (rail === 'powered' || direction * cart.speed < 22) {
      cart.speed += direction * (rail === 'powered' ? 54 : 30) * dt;
      if (rail !== 'powered') cart.speed = Math.max(-22, Math.min(22, cart.speed));
    } else cart.speed = direction * Math.max(22, Math.abs(cart.speed) - 12 * dt);
  }
  else cart.speed *= Math.pow(0.994, dt * 60);
  cart.speed = Math.max(-limit, Math.min(limit, cart.speed));

  let distance = cart.speed * dt;
  while (Math.abs(distance) > 1e-7) {
    const dx = Math.sign(distance) * Math.min(Math.abs(distance), 0.16);
    const nx = player.x + dx;
    const tx = Math.floor(nx + player.width / 2);
    let ty = cart.y;
    if (tx !== cart.x) {
      const source = railAt(world, tiles, cart.x, cart.y);
      const offsets = source === 'upper' ? [-1, 0, 1] : source === 'lower' ? [1, 0, -1] : [0, -1, 1];
      const step = offsets.find(offset => railAt(world, tiles, tx, cart.y + offset)
        && !overlapsSolid(world, tiles, nx, cart.y + offset - player.height, player.width, player.height));
      if (step === undefined) {
        cart.speed = 0;
        break;
      }
      ty += step;
    }
    if (overlapsSolid(world, tiles, nx, ty - player.height, player.width, player.height)) {
      cart.speed = 0;
      break;
    }
    const entered = tx !== cart.x;
    player.x = nx;
    player.y = ty - player.height;
    cart.x = tx;
    cart.y = ty;
    if (entered) {
      cart.stopReady = false;
      const next = railAt(world, tiles, tx, ty);
      if (next === 'stop') {
        cart.speed = 0;
        break;
      }
      if (next === 'brake' && Math.abs(cart.speed) > 4) {
        cart.speed = Math.sign(cart.speed) * 4;
        break;
      }
    }
    distance -= dx;
  }
  player.vx = cart.speed;
  player.vy = player.fell = player.landed = 0;
  player.onGround = true;
  player.onPlatform = true;
  player.climbing = player.wingsSpread = false;
  player.swimming = inLiquid(player, world, tiles);
  player.submerged = player.swimming && submerged(player, world, tiles);
  if (cart.speed) player.facing = Math.sign(cart.speed);
  return true;
}

function step(player, world, tiles, input, dt) {
  if (player.cart && stepMinecart(player, world, tiles, input, dt)) return;
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

  // On a rope, and on the hook, gravity is simply off. Both are states where the
  // player is held by something, and in both the vertical speed is decided elsewhere -
  // by which key is down, or by the hook's pull - so letting gravity also have a say
  // produces a fight between two rules.
  const climbing = !swimming && onClimbable(player, world, tiles);
  player.climbing = climbing;
  player.wingsSpread = false;
  if (player.onGround) player.flightUsed = 0;

  player.coyote = player.onGround ? COYOTE : Math.max(0, player.coyote - dt);
  if (player.hooked) {
    // The hook sets vx and vy; all that is left here is a little air control, so a
    // player hanging from a hook can still swing.
    player.usedAir = false;
    player.vx *= Math.pow(0.995, dt * 60);
  } else if (climbing) {
    player.vx *= Math.pow(0.6, dt * 60);
    player.vx = Math.max(-MOVE_SPEED * CLIMB_DRIFT, Math.min(MOVE_SPEED * CLIMB_DRIFT, player.vx));
    if (input.jump) player.vy = -CLIMB_SPEED;
    else if (input.down) player.vy = CLIMB_SPEED;
    else player.vy = 0;
    player.usedAir = false;
    player.coyote = COYOTE;
  } else if (swimming) {
    // In water, jump is a continuous swim stroke rather than a one-shot impulse.
    if (input.jump) player.vy = Math.max(player.vy - SWIM_RISE * dt * 9, -SWIM_RISE);
    player.vy = Math.min(SWIM_MAX_FALL, player.vy + SWIM_GRAVITY * dt);
  } else {
    if (input.jump && player.coyote > 0) {
      player.vy = -JUMP_SPEED;
      player.coyote = 0;
      player.onGround = false;
      player.usedAir = false;
    } else if (input.jump && player.flight > 0 && player.flightUsed < player.flight && !player.onGround) {
      const thrust = Math.min(dt, player.flight - player.flightUsed);
      player.flightUsed += thrust;
      player.vy = Math.max(-JUMP_SPEED * 0.82, player.vy - 105 * thrust);
      player.wingsSpread = true;
    } else if (input.jump && !player.heldJump && player.canDoubleJump && !player.usedAir
      && !player.onGround) {
      // The second jump, once, until the feet touch something again. Tracking whether
      // the key was already held is what stops one press spending both jumps.
      player.vy = -JUMP_SPEED * 0.88;
      player.usedAir = true;
    }
    if (player.onGround) player.usedAir = false;
    player.vy = Math.min(MAX_FALL, player.vy + GRAVITY * dt);
    if (input.jump && player.flight > 0 && !player.onGround && player.vy > 0) {
      player.vy = Math.min(player.vy, 5);
      player.wingsSpread = true;
    }
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
  // floor you can choose to ignore rather than one you have to break. A rope through a
  // platform is the normal way to build a shaft, so climbing down one passes through
  // the deck as well.
  const dropping = (input.down || climbing) && onPlatform(world, tiles, player.x, player.y,
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
const EXPORTS_player = { onClimbable, CLIMB_SPEED, CLIMB_DRIFT, makePlayer, step, overlapsSolid, unstick, aimTile, inLiquid, submerged, liquidFraction, SWIM_DEPTH,
  landsOnPlatform, onPlatform, mountMinecart, dismountMinecart,
    GRAVITY, MOVE_SPEED, JUMP_SPEED, REACH, MAX_FALL };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_player;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.player = EXPORTS_player;
}
