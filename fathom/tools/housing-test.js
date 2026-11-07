'use strict';
// Housing and villagers. Room validation is a flood fill that has to fail safely: run it
// in an open cave and a naive version walks the whole world. Every case here is a room
// described as a picture, so what is being tested is visible rather than implied.

const tiles = require('../js/tiles.js');
const housing = require('../js/housing.js');
const villager = require('../js/villager.js');
const craft = require('../js/craft.js');

let checks = 0;
let failures = 0;
function ok(cond, label) {
  checks += 1;
  if (!cond) { failures += 1; console.log('FAIL: ' + label); }
}

// '#' stone, '.' air with a background, ' ' air with none, 'D' door, 'T' torch,
// 'B' bench, 'C' chair, 'd' open door, '=' platform.
function makeBox(rows) {
  const h = rows.length;
  const w = rows[0].length;
  const grid = new Uint16Array(w * h);
  const walls = new Uint16Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const ch = rows[y][x];
      const i = y * w + x;
      if (ch !== ' ' && ch !== '#') walls[i] = tiles.wallIdOf('oakback');
      if (ch === '#') grid[i] = tiles.idOf('stone');
      else if (ch === 'T') grid[i] = tiles.idOf('torch');
      else if (ch === 'B') grid[i] = tiles.idOf('oakbench');
      else if (ch === 'C') grid[i] = tiles.idOf('oakchair');
      else if (ch === '=') grid[i] = tiles.idOf('oakplatform');
      else if (ch === 'D' || ch === 'd') {
        let top = y;
        while (top > 0 && rows[top - 1][x] === ch) top -= 1;
        grid[i] = tiles.cellOf(ch === 'D' ? 'oakdoor' : 'oakdooropen',
          0, Math.min(2, y - top)).id;
      } else grid[i] = tiles.AIR;
    }
  }
  const inside = (x, y) => x >= 0 && x < w && y >= 0 && y < h;
  return {
    w,
    h,
    get(x, y) { return inside(x, y) ? grid[y * w + x] : tiles.idOf('stone'); },
    set(x, y, id) { if (inside(x, y)) grid[y * w + x] = id; return true; },
    getWall(x, y) { return inside(x, y) ? walls[y * w + x] : 0; },
    setWall(x, y, id) { if (inside(x, y)) walls[y * w + x] = id; return true; }
  };
}

// A complete, valid house: sealed, walled, with a door, a light, a bench and a chair.
const GOOD = [
  '##############',
  '#....T.......#',
  '#............#',
  '#............#',
  '#............#',
  '#..B......C..#',
  '######D#######',
  '######D#######',
  '######D#######'
];

// --- 1. a complete house passes ----------------------------------------------------------
{
  const world = makeBox(GOOD);
  const result = housing.validateRoom(world, tiles, 5, 3);
  ok(result.valid, 'a complete house failed: ' + result.problems.join(' '));
  ok(result.area >= housing.MIN_AREA, 'the room measured only ' + result.area + ' tiles');
  ok(result.survey.light && result.survey.surface && result.survey.seat && result.survey.door,
    'the survey missed something that is plainly in the room');
}

// --- 2. each missing thing is reported, and only that thing -------------------------------
function withoutTile(rows, ch) {
  return rows.map(row => row.split(ch).join('.'));
}
{
  const cases = [
    ['T', 'light'],
    ['B', 'table'],
    ['C', 'chair']
  ];
  for (const [ch, word] of cases) {
    const world = makeBox(withoutTile(GOOD, ch));
    const result = housing.validateRoom(world, tiles, 5, 3);
    ok(!result.valid, 'a house with no ' + word + ' was accepted');
    ok(result.problems.some(p => p.toLowerCase().includes(word)),
      'removing ' + ch + ' did not report a missing ' + word + ': '
      + result.problems.join(' '));
    ok(result.problems.length === 1,
      'removing ' + ch + ' reported ' + result.problems.length + ' problems, not 1');
  }
}

// --- 3. a room with no door is not a house --------------------------------------------------
{
  const world = makeBox(GOOD.map(row => row.split('D').join('#')));
  const result = housing.validateRoom(world, tiles, 5, 3);
  ok(!result.valid, 'a sealed box with no door was accepted as a house');
  ok(result.problems.some(p => p.includes('door')), 'the missing door was not reported');
}

// --- 4. a platform counts as a way in ---------------------------------------------------------
{
  const world = makeBox(GOOD.map(row => row.split('D').join('=')));
  const result = housing.validateRoom(world, tiles, 5, 3);
  ok(result.valid, 'a house entered by a platform was rejected: '
    + result.problems.join(' '));
}

// --- 5. an open door still seals the room ------------------------------------------------------
{
  const world = makeBox(GOOD.map(row => row.split('D').join('d')));
  const result = housing.validateRoom(world, tiles, 5, 3);
  ok(result.valid, 'an open door stopped the room being a house: '
    + result.problems.join(' '));
}

// --- 6. a hole in the wall leaks ------------------------------------------------------------------
{
  // The room's right wall is breached into a long open corridor. A hole that opens onto
  // the edge of the fixture proves nothing: out of bounds reads as solid, so the fill
  // stops there and the room is merely one tile larger.
  const holed = [
    '############################################',
    '#....T.......#                             #',
    '#............#                             #',
    '#.............                             #',
    '#............#                             #',
    '#..B......C..#                             #',
    '######D#####################################',
    '######D#####################################'
  ];
  const world = makeBox(holed);
  const result = housing.validateRoom(world, tiles, 5, 3);
  ok(!result.valid, 'a room breached into open space was accepted');
  ok(result.problems.some(p => p.includes('background') || p.includes('Too large')
    || p.includes('sealed')),
    'a breached room was not reported as breached: ' + result.problems.join(' '));
}

// --- 7. missing background is counted ----------------------------------------------------------------
{
  const world = makeBox(GOOD);
  world.setWall(5, 2, 0);
  world.setWall(6, 2, 0);
  const result = housing.validateRoom(world, tiles, 5, 3);
  ok(!result.valid, 'a room missing two backgrounds was accepted');
  ok(result.problems.some(p => p.includes('2 tiles have no background')),
    'the count of missing backgrounds was wrong: ' + result.problems.join(' '));
}

// --- 8. the fill is bounded in open ground -----------------------------------------------------------
{
  // A wide open space with a floor: exactly the case that would walk the world.
  const rows = [];
  for (let i = 0; i < 20; i += 1) rows.push(' '.repeat(200));
  rows.push('#'.repeat(200));
  const world = makeBox(rows);
  const started = Date.now();
  const result = housing.validateRoom(world, tiles, 100, 10);
  const took = Date.now() - started;
  ok(!result.valid, 'open ground was accepted as a house');
  ok(result.problems.some(p => p.includes('sealed')),
    'open ground was not reported as unsealed: ' + result.problems.join(' '));
  ok(took < 500, 'validating open ground took ' + took + 'ms');
}

// --- 9. a room that is too small, and one that is too big ------------------------------------------------
{
  const tiny = makeBox([
    '#####',
    '#.T.#',
    '#.B.#',
    '##D##',
    '##D##'
  ]);
  const result = housing.validateRoom(tiny, tiles, 2, 1);
  ok(!result.valid, 'a four-tile room was accepted as a house');
  ok(result.problems.some(p => p.includes('Too small')), 'a tiny room was not called small');
}

// --- 10. who moves in, and when ---------------------------------------------------------------------------
{
  const none = villager.eligible({ coins: 0, bars: 0, deaths: 0, deepest: 0 });
  ok(none.length === 1 && none[0].key === 'guide',
    'a player who has done nothing should attract exactly the guide');
  const rich = villager.eligible({ coins: 500, bars: 0, deaths: 0, deepest: 0 });
  ok(rich.some(v => v.key === 'merchant'), 'carrying coin did not attract the merchant');
  const all = villager.eligible({ coins: 9999, bars: 99, deaths: 3, deepest: 2000 });
  ok(all.length === villager.VILLAGERS.length,
    'a player who has done everything should attract everybody');
  for (const v of villager.VILLAGERS) {
    ok(typeof v.wantsText === 'string' && v.wantsText.length > 0,
      v.key + ' cannot explain what it wants');
    ok(typeof v.greeting === 'string' && v.greeting.length > 0, v.key + ' has nothing to say');
    for (const entry of v.stock) {
      ok(entry.price > 0 && entry.count > 0, v.key + ' sells ' + entry.key + ' nonsensically');
      // A shop selling something with no name is a shop selling a grey square.
      ok(craft.nameOf(entry.key, tiles) !== entry.key,
        v.key + ' sells ' + entry.key + ', which has no readable name');
      ok(['block', 'wall', 'tool', 'bar', 'armor', 'ammo', 'loot', 'coin', 'accessory',
        'use'].includes(craft.kindOf(entry.key)),
        v.key + ' sells ' + entry.key + ', which is of no known kind');
    }
  }
}

// --- 11. somebody moves into a valid house, and only one somebody per house ---------------------------------
{
  const world = makeBox(GOOD);
  const village = villager.makeVillage(world, tiles, { housing });
  const progress = { coins: 0, bars: 0, deaths: 0, deepest: 0 };
  const first = village.settle(progress, 5, 3);
  ok(!!first.moved, 'nobody moved into a valid house');
  ok(first.moved.key === 'guide', 'the first arrival was ' + first.moved.key);
  ok(village.count === 1, 'the village holds ' + village.count + ' after one arrival');

  // The same room again must not attract a second copy of the same person.
  const second = village.settle(progress, 5, 3);
  ok(!second.moved, 'the guide moved in twice');

  // A newly eligible resident needs a different room.
  const third = village.settle({ coins: 400, bars: 0, deaths: 0, deepest: 0 }, 5, 3);
  ok(!third.moved && third.occupant === first.moved, 'an occupied room admitted another resident');
  ok(village.nearbyHomes(5, 3, 45) === 1, 'the occupied room did not count toward its town');

  // And an occupant stands on the floor, not in the ceiling.
  for (const v of village.list) {
    ok(!tiles.isSolid(world.get(Math.floor(v.x), Math.floor(v.y))),
      v.key + ' was placed inside a solid tile');
  }
}

// --- 12. villagers stay near home and never fall out of the world ---------------------------------------------
{
  const world = makeBox(GOOD);
  const village = villager.makeVillage(world, tiles, { housing });
  village.settle({ coins: 0, bars: 0, deaths: 0, deepest: 0 }, 5, 3);
  const who = village.list[0];
  const home = who.home.x;
  let worst = 0;
  for (let i = 0; i < 4000; i += 1) {
    village.step(1 / 60);
    worst = Math.max(worst, Math.abs(who.x - home));
    ok(who.y < world.h + 2, 'a villager fell out of the world');
  }
  ok(worst <= villager.WANDER_RANGE + 2,
    'a villager wandered ' + worst.toFixed(1) + ' tiles from home');
  ok(worst > 0.5, 'a villager never moved at all');
}

// --- 13. villagers survive a save -----------------------------------------------------------------------------
{
  const world = makeBox(GOOD);
  const village = villager.makeVillage(world, tiles, { housing });
  village.settle({ coins: 400, bars: 0, deaths: 0, deepest: 0 }, 5, 3);
  village.settle({ coins: 400, bars: 0, deaths: 0, deepest: 0 }, 5, 3);
  const saved = JSON.parse(JSON.stringify(village.serialize()));

  const reloaded = villager.makeVillage(world, tiles, { housing });
  reloaded.restore(saved);
  ok(reloaded.count === village.count,
    'reload brought back ' + reloaded.count + ' of ' + village.count + ' villagers');
  ok(reloaded.list.every(v => !!v.spec), 'a reloaded villager lost its identity');
  ok(reloaded.list.every(v => !!v.home), 'a reloaded villager lost its home');
}

// Separate towns can host residents, but legacy roommates count as one occupied house.
{
  const rows = GOOD.map(row => row + '##' + row);
  const world = makeBox(rows);
  const village = villager.makeVillage(world, tiles, { housing });
  const progress = { coins: 400 };
  const first = village.settle(progress, 5, 3);
  const second = village.settle(progress, GOOD[0].length + 7, 3, 'merchant');
  ok(first.moved && second.moved, 'separate homes cannot take separate residents');
  ok(village.nearbyHomes(5, 3, 45) === 2, 'two houses do not power a pylon');
  world.setWall(5, 3, 0);
  ok(village.nearbyHomes(5, 3, 45) === 1, 'a damaged house still powers the pylon');
}

{
  const heart = { type: 'heart', x: 0, y: 0 };
  const unit = { type: 'unit', x: 4, y: 0 };
  const vault = { type: 'vault', x: 40, y: 0 };
  const relay = { type: 'heart', x: 40, y: 0 };
  const capacity = villager.townStorageCapacity;
  ok(capacity([heart, unit, vault], 24) === 40, 'an unlinked vault added capacity');
  ok(capacity([heart, unit, vault, relay], 24) === 120, 'linked units did not add their capacity');
  ok(capacity([heart, unit, vault, relay], 24, heart) === 80, 'heart removal did not disconnect its unit');
  const items = [];
  const port = villager.townStoragePort(items, () => 2, 10);
  const stone = { key: 'stone', kind: 'block' };
  ok(port.add(stone, 23) === 3 && port.countOf('stone') === 20, 'storage failed to cap a deposit');
  port.take('stone', 14);
  ok(items.length === 1 && items[0].count === 6, 'withdraw did not free stacks');
  const recipe = { need: [['stone', 5]], out: { key: 'brick', kind: 'block', count: 2 } };
  ok(craft.craft(port, recipe) && port.countOf('brick') === 2 && port.countOf('stone') === 1,
    'crafting did not consume and produce stored items');
}

{
  const ids = new Set();
  for (const order of villager.TOWN_ORDERS) {
    ok(!ids.has(order.id), 'duplicate town order ' + order.id);
    ids.add(order.id);
    ok(!!villager.BY_KEY[order.sponsor], 'missing sponsor for ' + order.id);
    for (const [key, count] of [...order.needs, ...order.rewards]) {
      ok(count > 0 && craft.nameOf(key, tiles) !== key, order.id + ' uses unknown item ' + key);
    }
  }
  const inventory = require('../js/inventory.js').makeInventory();
  const order = villager.TOWN_ORDERS[0];
  ok(villager.completeTownOrder(inventory, order, craft.kindOf) === 'missing', 'order accepted without supplies');
  inventory.add({ key: 'gel', kind: 'loot' }, 8);
  ok(villager.completeTownOrder(inventory, order, craft.kindOf) === 'complete', 'order could not be completed');
  ok(inventory.countOf('gel') === 0 && inventory.countOf('torch') === 30 && inventory.countOf('coin') === 55,
    'order did not exchange supplies and rewards');
  inventory.add({ key: 'gel', kind: 'loot' }, 8);
  const before = inventory.serialize();
  const oversized = { ...order, rewards: [['torch', 1000000]] };
  ok(villager.completeTownOrder(inventory, oversized, craft.kindOf) === 'full', 'oversized reward should fail');
  ok(JSON.stringify(inventory.serialize()) === JSON.stringify(before), 'failed order changed the inventory');
}

console.log('\n' + villager.VILLAGERS.length + ' villagers: '
  + villager.VILLAGERS.map(v => v.name.replace(/^the /, '') + ' (' + v.wantsText + ')').join('; '));
console.log(checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
