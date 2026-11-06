'use strict';
// Platforms and doors. Both are tiles whose whole point is that they are not simply solid
// or not solid, so both are exactly the kind of thing that half-works: a platform that
// catches you from below, a door that stays shut. Each claim here is one a player would
// notice being wrong within a minute of meeting it.

const tiles = require('../js/tiles.js');
const physics = require('../js/player.js');

let checks = 0;
let failures = 0;
function ok(cond, label) {
  checks += 1;
  if (!cond) { failures += 1; console.log('FAIL: ' + label); }
}

// A tiny world described as a picture: '#' solid, '=' platform, 'D' closed door, ' ' air.
function makeBox(rows) {
  const h = rows.length;
  const w = rows[0].length;
  const grid = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const ch = rows[y][x];
      const i = y * w + x;
      if (ch === '#') grid[i] = tiles.idOf('stone');
      else if (ch === '=') grid[i] = tiles.idOf('oakplatform');
      else if (ch === 'D' || ch === 'd') {
        // Doors in a picture are drawn as a vertical run; each row becomes the matching
        // cell of the object so the fixture is a real door and not three door tops.
        let top = y;
        while (top > 0 && (rows[top - 1][x] === ch)) top -= 1;
        const cell = tiles.cellOf(ch === 'D' ? 'oakdoor' : 'oakdooropen', 0, Math.min(2, y - top));
        grid[i] = cell.id;
      }
      else grid[i] = tiles.AIR;
    }
  }
  const inside = (x, y) => x >= 0 && x < w && y >= 0 && y < h;
  return {
    w,
    h,
    LEVEL_FULL: 255,
    get(x, y) { return inside(x, y) ? grid[y * w + x] : tiles.idOf('stone'); },
    set(x, y, id) { if (inside(x, y)) grid[y * w + x] = id; return true; },
    getLevel() { return 0; }
  };
}

function run(world, player, input, steps, dt) {
  for (let i = 0; i < steps; i += 1) physics.step(player, world, tiles, input, dt || 1 / 120);
  return player;
}

const NONE = { left: false, right: false, jump: false, down: false, dig: false };

// --- 1. the whole wood set is coherent -------------------------------------------------
ok(tiles.WOODS.length >= 4, 'too few wood species');
for (const w of tiles.WOODS) {
  for (const part of ['log', 'wood', 'platform', 'chair', 'table', 'bench']) {
    const spec = tiles.BY_KEY[w.key + part];
    ok(!!spec, w.name + ' is missing its ' + part);
    if (spec) ok(spec.wood === w.key, w.key + part + ' is not tagged with its species');
  }
  // Doors are multi-tile objects now, so they live in the object registry rather than
  // as a single tile.
  for (const part of ['door', 'dooropen']) {
    const def = tiles.MULTI[w.key + part];
    ok(!!def, w.name + ' is missing its ' + part);
    if (!def) continue;
    ok(def.w === 1 && def.h === 3, w.key + part + ' is not one tile wide and three tall');
    ok(def.cells.length === 3, w.key + part + ' does not have three cells');
    def.cells.forEach((cell, i) => {
      ok(cell.wood === w.key, w.key + part + ' cell ' + i + ' is not tagged with its species');
      ok(cell.part.dy === i, w.key + part + ' cell ' + i + ' has the wrong offset');
      // From any cell, the origin must come back as the top of the object.
      const origin = tiles.originOf(cell, 40, 100 + i);
      ok(origin && origin.x === 40 && origin.y === 100,
        w.key + part + ' cell ' + i + ' does not resolve to its own origin');
    });
  }
  ok(!!tiles.WALL_BY_KEY[w.key + 'back'], w.name + ' has no background');
  // A log must be walk-through and must drop that species' wood.
  const log = tiles.BY_KEY[w.key + 'log'];
  ok(!log.solid, w.key + ' logs are solid, so a forest would be a wall');
  ok(log.drops === w.key + 'wood', w.key + ' logs do not drop their own wood');
  // The two door halves must point at each other.
  const shut = tiles.MULTI[w.key + 'door'].cells[0];
  const open = tiles.MULTI[w.key + 'dooropen'].cells[0];
  ok(shut.solid && !open.solid, w.key + ' door does not change solidity when it opens');
  ok(shut.swings === w.key + 'dooropen' && open.swings === w.key + 'door',
    w.key + ' door states do not swing into each other');
  ok(shut.drops === open.drops, w.key + ' door drops a different item depending on state');
  ok(shut.drops === w.key + 'door', w.key + ' door does not drop itself');
  // A platform is never solid, or it would not be a platform.
  ok(!tiles.BY_KEY[w.key + 'platform'].solid, w.key + ' platform is solid');
  ok(tiles.BY_KEY[w.key + 'bench'].station === 'workbench',
    w.key + ' bench is not a crafting station');
}

// --- 2. a platform catches you from above ------------------------------------------------
{
  const world = makeBox([
    '........',
    '........',
    '..====..',
    '........',
    '........',
    '########'
  ]);
  const player = physics.makePlayer(3.5, 0.2);
  run(world, player, NONE, 240);
  const deck = 2;
  ok(Math.abs((player.y + player.height) - deck) < 0.05,
    'a falling player did not come to rest on the platform deck (feet at '
    + (player.y + player.height).toFixed(2) + ', deck at ' + deck + ')');
  ok(player.onGround, 'a player standing on a platform is not on the ground');
  ok(player.onPlatform, 'a player standing on a platform does not know it');
}

// --- 3. you rise straight through one from below -----------------------------------------
{
  const world = makeBox([
    '........',
    '........',
    '..====..',
    '........',
    '........',
    '########'
  ]);
  const player = physics.makePlayer(3.5, 3.0);
  player.vy = -24;                                  // launched upward through the deck
  run(world, player, NONE, 20);
  ok(player.y + player.height < 2,
    'a player moving upward was stopped by a platform (feet at '
    + (player.y + player.height).toFixed(2) + ')');
}

// --- 4. holding down drops you through ---------------------------------------------------
{
  const world = makeBox([
    '........',
    '........',
    '..====..',
    '........',
    '........',
    '########'
  ]);
  const player = physics.makePlayer(3.5, 0.2);
  run(world, player, NONE, 240);
  const restedOn = player.y + player.height;
  run(world, player, { ...NONE, down: true }, 240);
  ok(player.y + player.height > restedOn + 1,
    'holding down did not drop the player through the platform');
  ok(Math.abs((player.y + player.height) - 5) < 0.05,
    'after dropping through, the player did not land on the floor below');
}

// --- 5. a platform does not block you sideways --------------------------------------------
{
  const world = makeBox([
    '........',
    '..====..',
    '........',
    '########'
  ]);
  const player = physics.makePlayer(1.2, 0.05);
  const before = player.x;
  run(world, player, { ...NONE, right: true }, 200);
  ok(player.x > before + 1.5, 'a platform blocked horizontal movement at head height');
}

// --- 6. a closed door is a wall, an open one is a doorway -----------------------------------
{
  const shut = makeBox([
    '......',
    '..D...',
    '..D...',
    '######'
  ]);
  const player = physics.makePlayer(0.2, 1.28);
  run(shut, player, { ...NONE, right: true }, 300);
  ok(player.x < 2, 'a closed door let the player walk straight through it (x='
    + player.x.toFixed(2) + ')');

  const open = makeBox([
    '......',
    '..d...',
    '..d...',
    '######'
  ]);
  const walker = physics.makePlayer(0.2, 1.28);
  run(open, walker, { ...NONE, right: true }, 300);
  ok(walker.x > 3, 'an open door still blocked the player (x=' + walker.x.toFixed(2) + ')');
}

// --- 7. a platform is still something you can walk off ---------------------------------------
{
  // Started well clear of the deck: a body that begins already intersecting the platform
  // row is, correctly, below it, and falls straight through.
  const world = makeBox([
    '........',
    '........',
    '........',
    '..==....',
    '........',
    '........',
    '########'
  ]);
  const player = physics.makePlayer(2.2, 0.05);
  run(world, player, NONE, 200);
  ok(player.onPlatform, 'the player did not land on the short platform to begin with');
  run(world, player, { ...NONE, right: true }, 300);
  ok(player.y + player.height > 5, 'the player could not walk off the end of a platform');
}

console.log('\n' + tiles.WOODS.length + ' wood species, '
  + tiles.TILES.filter(t => t.wood).length + ' species tiles, '
  + tiles.WALLS.filter(w => w.wood).length + ' backgrounds');
console.log(checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
