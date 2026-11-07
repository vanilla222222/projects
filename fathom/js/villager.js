'use strict';
// Villagers. Somebody moves into a house you built, stands in it, and sells you things.
//
// They are deliberately not enemies with the sign flipped: a villager has a home it
// belongs to, stays near it, walks rather than chases, and cannot be hit. What it
// mostly does is give the buildings a reason to exist - a room you made is a room
// somebody lives in, which is a different feeling from a room you made.
//
// Arrival conditions are the interesting part. Each villager wants something of the
// player before it will move in, so the roster arrives in an order that follows what the
// player has actually done rather than all at once the moment the first house is built.

const VILLAGERS = [
  {
    key: 'guide', name: 'the Guide', colour: '#7fa35c', hair: '#5d4322',
    wants: () => true,
    wantsText: 'moves in as soon as there is a room',
    greeting: 'Dig down and you will find copper before long. Dig further and you will find worse. Carry rope.',
    stock: [
      { key: 'torch', count: 20, price: 10 },
      { key: 'oakwood', count: 25, price: 20 },
      { key: 'wood-pick', count: 1, price: 80 },
      { key: 'rope', count: 20, price: 50 }
    ]
  },
  {
    key: 'merchant', name: 'the Merchant', colour: '#b58b4a', hair: '#3a2c1c',
    wants: (p) => p.coins >= 250,
    wantsText: 'arrives once you carry 250 coins',
    greeting: 'Everything has a price, and mine are better than dying for it.',
    stock: [
      { key: 'bucket', count: 1, price: 180 },
      { key: 'arrow', count: 50, price: 60 },
      { key: 'rope', count: 30, price: 70 },
      { key: 'tin-bar', count: 5, price: 90 },
      { key: 'copper-bar', count: 5, price: 120 },
      { key: 'healing-salve', count: 3, price: 150 },
      { key: 'lantern-charm', count: 1, price: 900 }
    ]
  },
  {
    key: 'smith', name: 'the Smith', colour: '#8e5a52', hair: '#241a16',
    wants: (p) => p.bars >= 40,
    wantsText: 'arrives once you have smelted 40 bars',
    greeting: 'Bring me ore and I will tell you what it is worth. Bring me bars and I will sell you better.',
    stock: [
      { key: 'iron-bar', count: 5, price: 160 },
      { key: 'iron-pick', count: 1, price: 700 },
      { key: 'iron-sword', count: 1, price: 650 },
      { key: 'iron-bow', count: 1, price: 620 },
      { key: 'iron-arrow', count: 40, price: 180 },
      { key: 'iron-helmet', count: 1, price: 420 },
      { key: 'iron-chest', count: 1, price: 540 },
      { key: 'grapple', count: 1, price: 1100 }
    ]
  },
  {
    key: 'nurse', name: 'the Nurse', colour: '#c4707c', hair: '#8a3f4c',
    wants: (p) => p.deaths >= 1 || p.deepest >= 160,
    wantsText: 'arrives after your first death or 160 tiles of depth',
    greeting: 'Hold still. This will cost you, and it will cost less than dying again.',
    heals: true,
    healPrice: 60,
    stock: []
  },
  {
    key: 'delver', name: 'the Delver', colour: '#6b7fa8', hair: '#2b3344',
    wants: (p) => p.deepest >= 700,
    wantsText: 'arrives once you have been 700 tiles down',
    greeting: 'Hell is not the bottom. The bottom is further than you want to know.',
    stock: [
      { key: 'diving-gear', count: 1, price: 1200 },
      { key: 'feather-fall', count: 1, price: 1100 },
      { key: 'crystal-hook', count: 1, price: 1900 },
      { key: 'silver-bar', count: 5, price: 320 },
      { key: 'crystal', count: 10, price: 240 },
      { key: 'amethyst', count: 4, price: 260 },
      { key: 'topaz', count: 4, price: 320 }
    ]
  },
  {
    key: 'builder', name: 'the Builder', colour: '#aa8656', hair: '#70442b',
    wants: p => p.bars >= 10, wantsText: 'arrives after you smelt 10 bars',
    greeting: 'One resident per furnished room. Build two nearby homes to power a town pylon.',
    stock: [{ key: 'oakwood', count: 40, price: 38 }, { key: 'oakback', count: 60, price: 45 },
      { key: 'oakdoor', count: 1, price: 30 }, { key: 'oakchair', count: 1, price: 18 },
      { key: 'oaktable', count: 1, price: 25 }, { key: 'town-pylon', count: 1, price: 500 }]
  },
  {
    key: 'keeper', name: 'the Storage Keeper', colour: '#7870ac', hair: '#312747',
    wants: p => p.bars >= 15, wantsText: 'arrives after you smelt 15 bars',
    greeting: 'Place a heart, then add storage units nearby. Access terminals share that stock across this world.',
    stock: [{ key: 'storage-heart', count: 1, price: 300 }, { key: 'storage-unit', count: 1, price: 180 },
      { key: 'storage-access', count: 1, price: 150 }, { key: 'storage-crafter', count: 1, price: 350 }]
  },
  {
    key: 'angler', name: 'the Angler', colour: '#59918c', hair: '#4d3730',
    wants: p => p.deepest >= 100, wantsText: 'arrives once you explore 100 tiles below sea level',
    greeting: 'Try pools in different biomes. A fresh catch makes better trail food than a bag of ore.',
    stock: [{ key: 'wood-rod', count: 1, price: 85 }, { key: 'cooked-fish', count: 3, price: 100 },
      { key: 'gills-potion', count: 2, price: 170 }]
  },
  {
    key: 'alchemist', name: 'the Alchemist', colour: '#8568a1', hair: '#50324e',
    wants: p => p.deepest >= 260, wantsText: 'arrives once you explore 260 tiles below sea level',
    greeting: 'A potion takes seconds to drink. Walking back down a cavern takes rather longer.',
    stock: [{ key: 'regen-potion', count: 2, price: 140 }, { key: 'ironskin-potion', count: 2, price: 180 },
      { key: 'spelunk-potion', count: 2, price: 220 }, { key: 'clarity-potion', count: 2, price: 200 }]
  },
  {
    key: 'wayfarer', name: 'the Wayfarer', colour: '#5886a5', hair: '#352c47',
    wants: p => p.deepest >= 450, wantsText: 'arrives once you explore 450 tiles below sea level',
    greeting: 'Establish a second town before you can travel. Both pylons need two occupied homes nearby.',
    stock: [{ key: 'town-pylon', count: 1, price: 420 }, { key: 'rope', count: 60, price: 95 },
      { key: 'storage-access', count: 1, price: 125 }, { key: 'shine-potion', count: 2, price: 170 }]
  },
  { key: 'forester', name: 'the Forester', colour: '#76905a', hair: '#553b2d',
    wants: p => p.bars >= 5, wantsText: 'arrives after you smelt 5 bars',
    greeting: 'A stand of trees can keep a whole town supplied.',
    stock: [{ key: 'pinewood', count: 30, price: 60 }, { key: 'acaciawood', count: 30, price: 65 },
      { key: 'oakbed', count: 1, price: 95 }] },
  { key: 'cook', name: 'the Cook', colour: '#ca8054', hair: '#50312d',
    wants: p => p.deepest >= 120, wantsText: 'arrives after reaching 120 tiles of depth',
    greeting: 'Eat before heading back into the caves.',
    stock: [{ key: 'cooked-fish', count: 5, price: 145 }, { key: 'healing-salve', count: 4, price: 180 },
      { key: 'campfire', count: 1, price: 65 }] },
  { key: 'fletcher', name: 'the Fletcher', colour: '#92884d', hair: '#382e25',
    wants: p => p.bars >= 25, wantsText: 'arrives after you smelt 25 bars',
    greeting: 'The right arrow matters more than a fancy bow.',
    stock: [{ key: 'copper-bow', count: 1, price: 350 }, { key: 'iron-arrow', count: 70, price: 195 },
      { key: 'archery-potion', count: 3, price: 160 }] },
  { key: 'lapidary', name: 'the Lapidary', colour: '#aa70a4', hair: '#362746',
    wants: p => p.deepest >= 380, wantsText: 'arrives after reaching 380 tiles of depth',
    greeting: 'Bring specimens from different layers. The cut can wait.',
    stock: [{ key: 'topaz', count: 3, price: 230 }, { key: 'sapphire', count: 3, price: 310 },
      { key: 'clarity-potion', count: 4, price: 240 }] },
  { key: 'diver', name: 'the Diver', colour: '#4b8cad', hair: '#243548',
    wants: p => p.deepest >= 560, wantsText: 'arrives after reaching 560 tiles of depth',
    greeting: 'Mark the pockets of air on your way in. You may need them on the way out.',
    stock: [{ key: 'diving-gear', count: 1, price: 900 }, { key: 'gills-potion', count: 5, price: 310 },
      { key: 'gold-rod', count: 1, price: 750 }] },
  { key: 'firekeeper', name: 'the Firekeeper', colour: '#b75d49', hair: '#512c38',
    wants: p => p.deepest >= 1250, wantsText: 'arrives after reaching 1,250 tiles of depth',
    greeting: 'Carry obsidian into Hell. Carry an exit plan out of it.',
    stock: [{ key: 'obsidian-charm', count: 1, price: 820 }, { key: 'ember-arrow', count: 50, price: 240 },
      { key: 'seared-fish', count: 4, price: 240 }] }

];

// Orders are completed once per world, with the sponsor available in town.
const TOWN_ORDERS = [
  ['first-light', 'guide', 'First Light', [['gel', 8]], [['torch', 30], ['coin', 55]]],
  ['rope-line', 'guide', 'A Line Down', [['stone', 24]], [['rope', 45], ['coin', 65]]],
  ['stockroom', 'merchant', 'Stock the Counter', [['copper-bar', 5]], [['healing-salve', 3], ['coin', 170]]],
  ['cold-iron', 'smith', 'Cold Iron', [['iron-bar', 10]], [['iron-arrow', 55], ['coin', 245]]],
  ['silver-order', 'smith', 'Bright Metal', [['silver-bar', 8]], [['spelunk-potion', 4], ['coin', 325]]],
  ['medical', 'nurse', 'Emergency Supplies', [['healing-salve', 3]], [['regen-potion', 4], ['coin', 140]]],
  ['cave-lights', 'delver', 'Lights Below', [['crystal', 8], ['glowmoss', 12]], [['shine-potion', 6], ['coin', 310]]],
  ['frames', 'builder', 'Window Frames', [['glass', 15], ['oakwood', 24]], [['oakback', 60], ['coin', 190]]],
  ['waystation', 'builder', 'Second Settlement', [['topaz', 3], ['copper-bar', 8]], [['town-pylon', 1], ['coin', 210]]],
  ['extra-capacity', 'keeper', 'Extra Capacity', [['tin-bar', 8], ['amethyst', 2]], [['storage-unit', 1], ['coin', 130]]],
  ['remote-stock', 'keeper', 'Remote Stockroom', [['glass', 12], ['iron-bar', 6]], [['storage-crafter', 1], ['coin', 180]]],
  ['river-survey', 'angler', 'River Survey', [['bass', 3], ['trout', 2]], [['iron-rod', 1], ['coin', 125]]],
  ['salt-catch', 'angler', 'Saltwater Haul', [['swordfish', 2], ['shrimp', 4]], [['gills-potion', 5], ['coin', 220]]],
  ['brewing', 'alchemist', 'A Fresh Batch', [['bottle', 8], ['amethyst', 3]], [['clarity-potion', 5], ['coin', 155]]],
  ['trail-lamps', 'wayfarer', 'Trail Markers', [['torch', 35], ['rope', 25]], [['storage-access', 1], ['coin', 180]]],
  ['hardwood', 'forester', 'Hardwood Shipment', [['pinelog', 12], ['acacialog', 12]], [['trail-buckle', 1], ['coin', 195]]],
  ['pantry', 'cook', 'Fill the Pantry', [['cooked-fish', 5]], [['healing-salve', 5], ['coin', 175]]],
  ['flight', 'fletcher', 'Straight Flight', [['feather', 14], ['iron-bar', 4]], [['iron-arrow', 95], ['coin', 210]]],
  ['gemcase', 'lapidary', 'Gem Case', [['topaz', 3], ['sapphire', 3], ['ruby', 2]], [['prism-brooch', 1], ['coin', 430]]],
  ['sea-relics', 'diver', 'Sea Relics', [['shell', 15], ['finleather', 2]], [['tidal-locket', 1], ['coin', 370]]],
  ['forge-feast', 'firekeeper', 'Forge Feast', [['seared-fish', 4], ['cinder', 10]], [['forge-gauntlet', 1], ['coin', 470]]],
  ['warden-proof', 'firekeeper', 'Proof of the Warden', [['furnace-core', 1]], [['emberite-bar', 8], ['coin', 800]]]
].map(([id, sponsor, name, needs, rewards]) => ({ id, sponsor, name, needs, rewards }));

function completeTownOrder(inventory, order, kindOf) {
  if (!order.needs.every(([key, count]) => inventory.countOf(key) >= count)) return 'missing';
  const snapshot = inventory.serialize();
  for (const [key, count] of order.needs) inventory.take(key, count);
  for (const [key, count] of order.rewards) {
    if (inventory.add({ key, kind: kindOf(key) }, count) > 0) {
      inventory.restore(snapshot);
      return 'full';
    }
  }
  return 'complete';
}

const VILLAGER_BY_KEY = {};
for (const v of VILLAGERS) VILLAGER_BY_KEY[v.key] = v;

const WALK_SPEED = 2.1;
const WANDER_RANGE = 9;          // tiles either side of home before turning back
const TALK_RANGE = 4.5;

function makeVillager(spec, home) {
  return {
    key: spec.key,
    spec,
    home: { x: home.x, y: home.y },
    x: home.x,
    y: home.y,
    vx: 0,
    vy: 0,
    facing: 1,
    width: 0.78,
    height: 1.72,
    onGround: false,
    pause: 0,
    // Gait phase, advanced by distance walked, so the renderer can step their legs at
    // the speed their legs would actually have to move.
    anim: 0
  };
}

// Which villagers would move in, given what the player has done. Returns specs, not
// instances: who arrives is a question about progress, where they live is a question
// about buildings, and keeping those apart keeps both testable.
function eligible(progress) {
  return VILLAGERS.filter(v => v.wants(progress));
}

function makeVillage(world, tiles, deps) {
  const { housing } = deps;
  const list = [];


  function overlaps(body, x, y) {
    const x0 = Math.floor(x);
    const x1 = Math.floor(x + body.width - 1e-6);
    const y0 = Math.floor(y);
    const y1 = Math.floor(y + body.height - 1e-6);
    for (let ty = y0; ty <= y1; ty += 1) {
      for (let tx = x0; tx <= x1; tx += 1) {
        if (tiles.isSolid(world.get(tx, ty))) return true;
      }
    }
    return false;
  }

  // Try to settle anyone eligible who has nowhere to live, into the room the player is
  // standing in. Returns the villager that moved in, if any.
  function survey(x, y) {
    const room = housing.validateRoom(world, tiles, x, y);
    const occupant = room.valid && list.find(v => room.cells.some(cell =>
      cell.x === Math.floor(v.home.x) && cell.y === Math.round(v.home.y + 0.72)));
    return { room, occupant };
  }

  function settle(progress, x, y, key) {
    const { room, occupant } = survey(x, y);
    if (!room.valid || occupant) return { moved: null, room, occupant };
    const existing = key && list.find(v => v.key === key);
    const spec = existing?.spec || eligible(progress).find(v => key ? v.key === key : !list.some(n => n.key === v.key));
    const anchor = spec && housing.roomAnchor(world, tiles, room.cells);
    if (!anchor) return { moved: null, room };
    const placed = makeVillager(spec, { x: anchor.x + 0.1, y: anchor.y - 0.72 });
    if (existing) Object.assign(existing, placed);
    else list.push(placed);
    return { moved: existing || placed, room };
  }

  function nearbyHomes(x, y, radius) {
    const counted = new Set();
    let count = 0;
    for (const v of list) {
      const hx = Math.floor(v.home.x), hy = Math.round(v.home.y + 0.72);
      const key = hx + ':' + hy;
      if (counted.has(key) || Math.hypot(hx - x, hy - y) > radius) continue;
      const room = housing.validateRoom(world, tiles, hx, hy);
      if (!room.valid) continue;
      for (const cell of room.cells) counted.add(cell.x + ':' + cell.y);
      count += 1;
    }
    return count;
  }

  function step(dt, player) {
    for (const v of list) {
      if (player && (Math.abs(v.home.x - player.x) > 90 || Math.abs(v.home.y - player.y) > 70)) continue;
      // Gravity and a floor, so a villager whose house is mined out falls rather than
      // hanging in the air.
      v.vy = Math.min(40, v.vy + 46 * dt);
      const nextY = v.y + v.vy * dt;
      if (overlaps(v, v.x, nextY)) {
        v.vy = 0;
        v.onGround = true;
      } else {
        v.y = nextY;
        v.onGround = false;
      }

      if (!v.onGround) continue;
      v.pause -= dt;
      if (v.pause > 0) { v.vx = 0; continue; }
      if (v.vx === 0) v.vx = Math.random() < 0.5 ? -WALK_SPEED : WALK_SPEED;

      // Turn back at the edge of the wander range, at a wall, or at a drop.
      const ahead = v.x + Math.sign(v.vx) * 0.6;
      const wall = overlaps(v, ahead, v.y);
      const edge = !tiles.isSolid(world.get(Math.floor(ahead), Math.floor(v.y + v.height + 0.1)));
      const far = Math.abs(v.x - v.home.x) > WANDER_RANGE;
      if (wall || edge || far) {
        v.vx = -v.vx;
        if (far) v.vx = Math.sign(v.home.x - v.x) * WALK_SPEED;
        v.pause = 0.6 + Math.random() * 1.4;
        continue;
      }
      const nextX = v.x + v.vx * dt;
      if (!overlaps(v, nextX, v.y)) { v.anim += Math.abs(nextX - v.x) * 2.3; v.x = nextX; }
      else v.vx = -v.vx;
      v.facing = Math.sign(v.vx) || v.facing;
    }
    return list;
  }

  function nearest(px, py) {
    let best = null;
    let bestDist = TALK_RANGE;
    for (const v of list) {
      const d = Math.hypot(v.x - px, v.y - py);
      if (d < bestDist) { best = v; bestDist = d; }
    }
    return best;
  }

  function serialize() {
    return list.map(v => ({ key: v.key, x: v.x, y: v.y,
      home: { x: v.home.x, y: v.home.y } }));
  }

  function restore(saved) {
    list.length = 0;
    for (const entry of saved || []) {
      const spec = VILLAGER_BY_KEY[entry.key];
      if (!spec) continue;
      const v = makeVillager(spec, entry.home || entry);
      v.x = entry.x;
      v.y = entry.y;
      list.push(v);
    }
  }

  return { list, survey, settle, nearbyHomes, step, nearest, serialize, restore,
    get count() { return list.length; } };
}

function townStorageCapacity(devices, radius, excluding) {
  const hearts = devices.filter(d => d !== excluding && d.type === 'heart');
  return devices.reduce((total, d) => {
    if (d === excluding || (d.type !== 'unit' && d.type !== 'vault')) return total;
    const connected = hearts.some(h => Math.hypot(h.x - d.x, h.y - d.y) <= radius);
    return total + (connected ? (d.type === 'vault' ? 80 : 40) : 0);
  }, 0);
}

function townStoragePort(storageItems, capacity, maxStack) {
  return {
    countOf(key) {
      return storageItems.reduce((n, item) => n + (item.key === key ? item.count : 0), 0);
    },
    take(key, count) {
      for (let i = storageItems.length - 1; i >= 0 && count > 0; i -= 1) {
        const item = storageItems[i];
        if (item.key !== key) continue;
        const moved = Math.min(item.count, count);
        item.count -= moved;
        count -= moved;
        if (!item.count) storageItems.splice(i, 1);
      }
    },
    add(item, count) {
      for (const stack of storageItems) {
        if (stack.key !== item.key || !count) continue;
        const moved = Math.min(maxStack - stack.count, count);
        stack.count += moved;
        count -= moved;
      }
      const limit = capacity();
      while (count && storageItems.length < limit) {
        const moved = Math.min(count, maxStack);
        storageItems.push({ key: item.key, kind: item.kind, count: moved });
        count -= moved;
      }
      return count;
    }
  };
}

const EXPORTS_villager = { VILLAGERS, TOWN_ORDERS, completeTownOrder, BY_KEY: VILLAGER_BY_KEY, eligible, makeVillager, makeVillage, townStorageCapacity, townStoragePort,
  WALK_SPEED, WANDER_RANGE, TALK_RANGE };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_villager;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.villager = EXPORTS_villager;
}
