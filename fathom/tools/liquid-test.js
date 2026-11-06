'use strict';
// Flowing water. The properties worth proving are the ones a player would notice being
// wrong: water is neither created nor destroyed, it never crosses solid rock, a surface
// goes flat and then stops costing anything, and the same start always gives the same end.

const tiles = require('../js/tiles.js');
const liquidModule = require('../js/liquid.js');

let checks = 0;
let failures = 0;
function ok(cond, label) {
  checks += 1;
  if (!cond) { failures += 1; console.log('FAIL: ' + label); }
}

const FULL = 255;
const WATER = tiles.idOf('water');
const STONE = tiles.idOf('stone');

// A small fixed-size world, so a test can describe a situation as a picture and read the
// result back as one. It implements exactly the surface liquid.js asks of the real world.
function makeBox(rows) {
  const h = rows.length;
  const w = rows[0].length;
  const grid = new Uint16Array(w * h);
  const level = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const ch = rows[y][x];
      const i = y * w + x;
      if (ch === '#') grid[i] = STONE;
      else if (ch === '~') { grid[i] = WATER; level[i] = FULL; }
      else grid[i] = tiles.AIR;
    }
  }
  const inside = (x, y) => x >= 0 && x < w && y >= 0 && y < h;
  return {
    w,
    h,
    LEVEL_FULL: FULL,
    // Outside the box is solid, so nothing can leak off the edge and be miscounted as lost.
    get(x, y) { return inside(x, y) ? grid[y * w + x] : STONE; },
    set(x, y, id) { if (inside(x, y)) grid[y * w + x] = id; return true; },
    getLevel(x, y) { return inside(x, y) && grid[y * w + x] === WATER ? level[y * w + x] : 0; },
    setLevel(x, y, v) {
      if (!inside(x, y)) return false;
      const i = y * w + x;
      const amount = Math.max(0, Math.min(FULL, Math.round(v)));
      if (amount === 0) { if (grid[i] === WATER) grid[i] = tiles.AIR; level[i] = 0; return true; }
      if (grid[i] !== WATER) {
        if (tiles.isSolid(grid[i])) return false;
        grid[i] = WATER;
      }
      level[i] = amount;
      return true;
    },
    render() {
      const out = [];
      for (let y = 0; y < h; y += 1) {
        let line = '';
        for (let x = 0; x < w; x += 1) {
          const i = y * w + x;
          if (grid[i] === STONE) line += '#';
          else if (grid[i] === WATER) line += level[i] >= FULL ? '~' : (level[i] > FULL / 2 ? '+' : '.');
          else line += ' ';
        }
        out.push(line);
      }
      return out;
    }
  };
}

function run(rows, passes) {
  const box = makeBox(rows);
  const liquid = liquidModule.makeLiquid(box, tiles);
  liquid.activateRegion(0, 0, box.w, box.h);
  const before = liquid.volumeIn(0, 0, box.w, box.h);
  const result = passes === undefined
    ? liquid.settleAll(3000)
    : (() => { for (let i = 0; i < passes; i += 1) liquid.step(Infinity); return { passes, settled: liquid.activeCount === 0 }; })();
  const after = liquid.volumeIn(0, 0, box.w, box.h);
  return { box, liquid, before, after, result };
}

// --- 1. a column of water in a sealed basin settles flat, and stops ---------------------
{
  const { box, liquid, before, after, result } = run([
    '##########',
    '#   ~    #',
    '#   ~    #',
    '#   ~    #',
    '#   ~    #',
    '#        #',
    '#        #',
    '##########'
  ]);
  ok(result.settled, 'a basin never reached equilibrium in 3000 passes');
  ok(before === after, 'volume changed while settling: ' + before + ' -> ' + after);
  ok(liquid.activeCount === 0, 'settled water is still costing simulation time');

  // The surface must be flat: every column holding water holds the same amount, give or
  // take the one unit that integer division cannot split.
  const totals = [];
  for (let x = 1; x < box.w - 1; x += 1) {
    let t = 0;
    for (let y = 1; y < box.h - 1; y += 1) t += box.getLevel(x, y);
    totals.push(t);
  }
  // Flatness has an exact guarantee, and it is not "every column is equal". Sideways flow
  // moves toward the floored average of a cell and its neighbours, so two adjacent columns
  // can sit one unit apart with no legal move between them. Across n columns that permits
  // a gradient of up to n-1 units out of 255 - about a hundredth of a tile - which is the
  // right thing to assert. Demanding a single flat number would be demanding a bug.
  let worstStep = 0;
  for (let i = 1; i < totals.length; i += 1) {
    worstStep = Math.max(worstStep, Math.abs(totals[i] - totals[i - 1]));
  }
  ok(worstStep <= liquid.MIN_FLOW + 1,
    'adjacent columns differ by ' + worstStep + ', more than one unit of flow');
  const spread = Math.max(...totals) - Math.min(...totals);
  ok(spread <= totals.length, 'the settled surface slopes by ' + spread
    + ' across ' + totals.length + ' columns, more than one unit each');
  ok(spread / FULL < 0.05, 'the settled surface is visibly tilted');

  // And it sat down, not up: the lowest open row must be the fullest.
  let bottom = 0;
  let top = 0;
  for (let x = 1; x < box.w - 1; x += 1) {
    bottom += box.getLevel(x, box.h - 2);
    top += box.getLevel(x, 1);
  }
  ok(bottom > top, 'water did not sink: bottom row holds ' + bottom + ', top row ' + top);
  console.log('\na column settling in a basin:');
  for (const line of box.render()) console.log('  |' + line + '|');
}

// --- 2. water never crosses solid rock --------------------------------------------------
{
  const { box, before, after, result } = run([
    '##########',
    '#~~~~#   #',
    '#~~~~#   #',
    '#~~~~#   #',
    '######   #',
    '#        #',
    '##########'
  ]);
  ok(result.settled, 'the divided tank never settled');
  ok(before === after, 'volume changed across a divider: ' + before + ' -> ' + after);
  let leaked = 0;
  for (let y = 1; y < box.h - 1; y += 1) {
    for (let x = 6; x < box.w - 1; x += 1) leaked += box.getLevel(x, y);
  }
  ok(leaked === 0, leaked + ' units of water crossed a solid wall');
  // The sealed chamber must still hold every drop it started with.
  let held = 0;
  for (let y = 1; y <= 3; y += 1) for (let x = 1; x <= 4; x += 1) held += box.getLevel(x, y);
  ok(held === before, 'the sealed chamber lost water: ' + held + ' of ' + before);
}

// --- 3. water pours off a ledge and finds the floor -------------------------------------
{
  // The shelf is open on its right at the second row: without that gap the chamber is
  // sealed and the test proves nothing but that sealed water stays put.
  const { box, before, after, result } = run([
    '############',
    '#~~~#      #',
    '#~~~       #',
    '####       #',
    '#          #',
    '#          #',
    '############'
  ]);
  ok(result.settled, 'the ledge never settled');
  ok(before === after, 'volume changed pouring off a ledge: ' + before + ' -> ' + after);
  let onFloor = 0;
  for (let x = 1; x < box.w - 1; x += 1) onFloor += box.getLevel(x, box.h - 2);
  ok(onFloor > 0, 'water poured off a ledge and never reached the floor');
  let stranded = 0;
  for (let y = 1; y <= 2; y += 1) for (let x = 1; x <= 3; x += 1) stranded += box.getLevel(x, y);
  ok(stranded < before / 2, 'most of the water stayed on the ledge: ' + stranded + ' of ' + before);
  console.log('\nwater pouring off a ledge:');
  for (const line of box.render()) console.log('  |' + line + '|');
}

// --- 4. a pass is deterministic ---------------------------------------------------------
{
  const shape = [
    '##########',
    '#~~  ~   #',
    '#~   ~~  #',
    '#   ~    #',
    '#        #',
    '##########'
  ];
  const a = run(shape);
  const b = run(shape);
  ok(a.box.render().join('|') === b.box.render().join('|'),
    'two identical runs produced different results');
  ok(a.result.passes === b.result.passes,
    'two identical runs took different numbers of passes');
}

// --- 5. the active set empties, so still water is free ----------------------------------
{
  const { liquid, result } = run([
    '##########',
    '#~~~~~~~~#',
    '#~~~~~~~~#',
    '##########'
  ]);
  ok(result.settled, 'a full tank never settled');
  ok(liquid.activeCount === 0, 'a full tank left ' + liquid.activeCount + ' cells awake');
  // Nothing should have moved at all: it was already at equilibrium.
  const again = liquid.step(Infinity);
  ok(again.moved === 0, 'a settled tank moved ' + again.moved + ' units when poked');
}

// --- 6. the budget is respected and work is never lost ----------------------------------
{
  const box = makeBox([
    '##############',
    '#~~~~~~~~~~~~#',
    '#            #',
    '#            #',
    '#            #',
    '#            #',
    '##############'
  ]);
  const liquid = liquidModule.makeLiquid(box, tiles);
  liquid.activateRegion(0, 0, box.w, box.h);
  const before = liquid.volumeIn(0, 0, box.w, box.h);
  let passes = 0;
  while (liquid.activeCount > 0 && passes < 40000) {
    const r = liquid.step(4);
    ok(r.processed <= 4, 'a pass processed ' + r.processed + ' cells on a budget of 4');
    passes += 1;
  }
  ok(liquid.activeCount === 0, 'budgeted stepping never finished');
  ok(liquid.volumeIn(0, 0, box.w, box.h) === before,
    'budgeted stepping lost water: ' + before + ' -> ' + liquid.volumeIn(0, 0, box.w, box.h));
}

// --- 7. water added at a point spreads, and removing it all leaves dry rock -------------
{
  const box = makeBox([
    '########',
    '#      #',
    '#      #',
    '########'
  ]);
  const liquid = liquidModule.makeLiquid(box, tiles);
  box.setLevel(3, 1, FULL);
  liquid.activateAround(3, 1);
  liquid.settleAll(3000);
  const spread = liquid.volumeIn(0, 0, box.w, box.h);
  ok(spread === FULL, 'a poured bucket changed volume: ' + spread);
  let wetTiles = 0;
  for (let y = 0; y < box.h; y += 1) {
    for (let x = 0; x < box.w; x += 1) if (box.getLevel(x, y) > 0) wetTiles += 1;
  }
  ok(wetTiles > 1, 'a poured bucket did not spread at all');
  ok(box.getLevel(3, 1) < FULL, 'a poured bucket stayed in its own tile');

  for (let y = 0; y < box.h; y += 1) {
    for (let x = 0; x < box.w; x += 1) box.setLevel(x, y, 0);
  }
  for (let y = 1; y < box.h - 1; y += 1) {
    for (let x = 1; x < box.w - 1; x += 1) {
      ok(box.get(x, y) === tiles.AIR, 'draining left a water tile behind at ' + x + ',' + y);
    }
  }
}

console.log('\n' + checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
