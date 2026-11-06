'use strict';
// Flowing water. Each water tile carries a level from 1 to LEVEL_FULL, and the simulation
// moves volume downward first and then sideways toward equilibrium. Three decisions keep
// it from eating the frame on an infinite world:
//
//   - Only cells on the active set are considered. A cell joins when its own level changes
//     or a neighbour's does, and leaves when a pass moves nothing out of it. Still water is
//     therefore free, which matters when every ocean in the world is still water.
//   - A pass has a budget. Whatever is left over waits for the next frame rather than
//     stalling the loop, so a burst collapse costs several frames instead of one long one.
//   - Movements below MIN_FLOW are refused. Sideways flow targets the average of a cell
//     and its open neighbours and never moves past it, so equal cells exchange nothing and
//     the set still empties; MIN_FLOW is what stops a long shallow sheet from taking a
//     pass per unit. At 2 it left a settled surface uneven by up to 17 units across eight
//     columns, which is visible, so it is 1 and the averaging does the work.
//
// Order matters to the result, so cells are processed bottom-up and then left to right.
// That makes a pass deterministic, which is what lets the tests assert an exact outcome
// rather than an approximate one.

const MIN_FLOW = 1;
const MAX_FALL_PER_STEP = 255;
const DEFAULT_BUDGET = 1400;

function makeLiquid(world, tiles, options) {
  const opts = options || {};
  // What a liquid becomes when it meets a different one. Lava quenched by water is the
  // only pair for now, and it leaves the hardest rock in the world behind.
  const QUENCH = opts.quench === undefined ? 'obsidian' : opts.quench;
  const full = world.LEVEL_FULL;
  const minFlow = opts.minFlow === undefined ? MIN_FLOW : opts.minFlow;
  const active = new Set();

  function key(x, y) {
    return x + ',' + y;
  }

  function parse(k) {
    const comma = k.indexOf(',');
    return [Number(k.slice(0, comma)), Number(k.slice(comma + 1))];
  }

  function passable(x, y) {
    return !tiles.isSolid(world.get(x, y));
  }

  function liquidIdAt(x, y) {
    const id = world.get(x, y);
    return tiles.tile(id).liquid ? id : 0;
  }

  // Two different liquids meeting is not a transfer. Both are consumed at the boundary
  // and leave rock, which is what stops a lava flow and a sea from interleaving forever.
  function quench(x, y, otherX, otherY) {
    if (!QUENCH || !tiles.BY_KEY[QUENCH]) return false;
    world.setLevel(otherX, otherY, 0);
    world.setLevel(x, y, 0);
    world.set(otherX, otherY, tiles.idOf(QUENCH));
    activateAround(x, y);
    activateAround(otherX, otherY);
    return true;
  }

  function levelAt(x, y) {
    return world.getLevel(x, y);
  }

  // Any change wakes the cell and its four neighbours: water that has just lost volume may
  // now be able to pull from the side, and water above may now be able to fall.
  function activate(x, y) {
    active.add(key(x, y));
  }

  function activateAround(x, y) {
    activate(x, y);
    activate(x - 1, y);
    activate(x + 1, y);
    activate(x, y - 1);
    activate(x, y + 1);
  }

  function move(fromX, fromY, toX, toY, amount) {
    if (amount < 1) return 0;
    const fromLevel = levelAt(fromX, fromY);
    const toLevel = levelAt(toX, toY);
    const kind = liquidIdAt(fromX, fromY);
    const other = liquidIdAt(toX, toY);
    if (other && kind && other !== kind) {
      return quench(fromX, fromY, toX, toY) ? 1 : 0;
    }
    const room = full - toLevel;
    const moved = Math.min(amount, fromLevel, room);
    if (moved < 1) return 0;
    if (!world.setLevel(toX, toY, toLevel + moved, kind)) return 0;
    world.setLevel(fromX, fromY, fromLevel - moved);
    activateAround(fromX, fromY);
    activateAround(toX, toY);
    return moved;
  }

  // One cell's turn. Returns how much volume left it.
  function settle(x, y) {
    let level = levelAt(x, y);
    if (level <= 0) return 0;
    let moved = 0;

    // Down first. Water always prefers to fall, and falling is the only move that can
    // empty a cell completely.
    if (passable(x, y + 1)) {
      moved += move(x, y, x, y + 1, Math.min(level, MAX_FALL_PER_STEP));
      level = levelAt(x, y);
      if (level <= 0) return moved;
    }

    // Then sideways, toward the average of whichever sides can accept water. Averaging
    // across both at once is what makes a surface go flat instead of oscillating.
    const sides = [];
    if (passable(x - 1, y)) sides.push(x - 1);
    if (passable(x + 1, y)) sides.push(x + 1);
    if (sides.length === 0) return moved;

    let total = level;
    for (const sx of sides) total += levelAt(sx, y);
    const target = Math.floor(total / (sides.length + 1));

    for (const sx of sides) {
      const sideLevel = levelAt(sx, y);
      const want = target - sideLevel;
      if (want < minFlow) continue;
      moved += move(x, y, sx, y, Math.min(want, levelAt(x, y) - target));
    }
    return moved;
  }

  // Run one simulation pass over the active set. Cells that move nothing are dropped, so a
  // basin that has reached equilibrium costs nothing on the next frame.
  function step(budget) {
    const limit = budget === undefined ? DEFAULT_BUDGET : budget;
    if (active.size === 0) return { processed: 0, moved: 0, remaining: 0 };

    // Bottom-up, then left to right: deterministic, and it lets a falling column collapse
    // in one pass rather than one row per pass.
    const cells = [...active].map(parse)
      .sort((a, b) => (b[1] - a[1]) || (a[0] - b[0]));
    active.clear();

    let processed = 0;
    let moved = 0;
    for (const [x, y] of cells) {
      if (processed >= limit) {
        // Over budget: put the rest back and finish next frame.
        activate(x, y);
        continue;
      }
      processed += 1;
      const level = levelAt(x, y);
      if (level <= 0) continue;
      const out = settle(x, y);
      moved += out;
      // A cell that moved nothing is at rest. It will be woken again by a neighbour.
      if (out > 0) activate(x, y);
    }
    return { processed, moved, remaining: active.size };
  }

  // Wake every water tile in a region, and every cell next to a hole in it. Used when a
  // chunk loads near the player and when an edit opens a wall that water should pour out of.
  function activateRegion(x0, y0, w, h) {
    for (let y = y0; y < y0 + h; y += 1) {
      for (let x = x0; x < x0 + w; x += 1) {
        if (levelAt(x, y) > 0) activate(x, y);
      }
    }
  }

  function volumeIn(x0, y0, w, h) {
    let total = 0;
    for (let y = y0; y < y0 + h; y += 1) {
      for (let x = x0; x < x0 + w; x += 1) total += levelAt(x, y);
    }
    return total;
  }

  // Run to equilibrium, or give up and say so. Tests use this; the game never does,
  // because the game always has another frame.
  function settleAll(maxPasses) {
    const cap = maxPasses === undefined ? 4000 : maxPasses;
    let passes = 0;
    while (active.size > 0 && passes < cap) {
      step(Infinity);
      passes += 1;
    }
    return { passes, settled: active.size === 0 };
  }

  return { activate, activateAround, activateRegion, step, settleAll, volumeIn,
    levelAt, MIN_FLOW: minFlow,
    get activeCount() { return active.size; } };
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
const EXPORTS_liquid = { makeLiquid, MIN_FLOW, DEFAULT_BUDGET };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_liquid;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.liquid = EXPORTS_liquid;
}
