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
    greeting: 'Dig down and you will find copper before long. Dig further and you will find worse.',
    stock: [
      { key: 'torch', count: 20, price: 10 },
      { key: 'oakwood', count: 25, price: 20 },
      { key: 'wood-pick', count: 1, price: 80 }
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
      { key: 'tin-bar', count: 5, price: 90 },
      { key: 'copper-bar', count: 5, price: 120 },
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
      { key: 'iron-helmet', count: 1, price: 420 },
      { key: 'iron-chest', count: 1, price: 540 }
    ]
  },
  {
    key: 'nurse', name: 'the Nurse', colour: '#c4707c', hair: '#8a3f4c',
    wants: (p) => p.deaths >= 1,
    wantsText: 'arrives after you have died once',
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
      { key: 'silver-bar', count: 5, price: 320 },
      { key: 'crystal', count: 10, price: 240 }
    ]
  }
];

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
    pause: 0
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
  const homes = new Map();        // villager key -> anchor

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
  function settle(progress, x, y) {
    const room = housing.validateRoom(world, tiles, x, y);
    if (!room.valid) return { moved: null, room };
    const taken = new Set(list.map(v => v.key));
    for (const spec of eligible(progress)) {
      if (taken.has(spec.key)) continue;
      const anchor = housing.roomAnchor(world, tiles, room.cells);
      if (!anchor) break;
      const villager = makeVillager(spec, { x: anchor.x + 0.1, y: anchor.y - 0.72 });
      list.push(villager);
      homes.set(spec.key, anchor);
      return { moved: villager, room };
    }
    return { moved: null, room, full: true };
  }

  function step(dt) {
    for (const v of list) {
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
      if (!overlaps(v, nextX, v.y)) v.x = nextX;
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
    homes.clear();
    for (const entry of saved || []) {
      const spec = VILLAGER_BY_KEY[entry.key];
      if (!spec) continue;
      const v = makeVillager(spec, entry.home || entry);
      v.x = entry.x;
      v.y = entry.y;
      list.push(v);
      homes.set(spec.key, entry.home || entry);
    }
  }

  return { list, settle, step, nearest, serialize, restore,
    get count() { return list.length; } };
}

const EXPORTS_villager = { VILLAGERS, BY_KEY: VILLAGER_BY_KEY, eligible, makeVillager, makeVillage,
  WALK_SPEED, WANDER_RANGE, TALK_RANGE };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_villager;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.villager = EXPORTS_villager;
}
