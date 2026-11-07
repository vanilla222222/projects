'use strict';
// Buffs: effects that expire. A potion you drank four minutes ago, a campfire you are
// standing near, the warmth of a bed you have not left yet.
//
// A buff is deliberately the same kind of thing as an accessory or a set bonus - a bag of
// modifier fields that craft.js knows how to fold into the player's effects - so nothing
// in the game has to learn a second way of changing a number. The only thing a buff adds
// is a clock.
//
// Two kinds, and the difference matters:
//
//   - A **drunk** buff is given once with a duration and counts down. Drinking the same
//     potion again replaces the remaining time rather than stacking it, which is
//     Terraria's rule and the reason a stack of forty potions is not a way to be
//     permanently invincible.
//   - A **standing** buff is refreshed every moment its source is in reach - a campfire,
//     a lantern - and fades a second or two after you walk away. It is given a short
//     duration and simply re-given while you are near, so "am I still near it" never has
//     to be asked: it answers itself by the buff running out.

const BUFFS = {
  swiftness: { name: 'Swiftness', text: 'Move 25% faster', seconds: 240,
    colour: '#8fd1e8', effect: { speed: 1.25 } },
  ironskin: { name: 'Ironskin', text: 'Defence +8', seconds: 240,
    colour: '#a8a29b', effect: { defense: 8 } },
  regeneration: { name: 'Regeneration', text: 'Health returns three times as fast',
    seconds: 180, colour: '#e05c6a', effect: { regen: 3 } },
  gills: { name: 'Gills', text: 'Breathe underwater', seconds: 150,
    colour: '#4f9fd8', effect: { breath: true } },
  spelunking: { name: 'Spelunking', text: 'Mining power +25%', seconds: 300,
    colour: '#c9a542', effect: { power: 1.25 } },
  shine: { name: 'Shine', text: 'You give off light', seconds: 300,
    colour: '#ffd79a', effect: { glow: 8 } },
  archery: { name: 'Archery', text: 'Arrows hit 20% harder and fly faster', seconds: 180,
    colour: '#8a6038', effect: { ranged: 1.2, arrowSpeed: 1.2 } },
  rage: { name: 'Rage', text: 'Melee hits 20% harder', seconds: 180,
    colour: '#c0472f', effect: { melee: 1.2 } },
  clarity: { name: 'Clarity', text: 'Magic hits 20% harder and costs 15% less',
    seconds: 180, colour: '#7f8fe8', effect: { magic: 1.2, manaCost: 0.85 } },
  featherfall: { name: 'Feather Fall', text: 'Falls hurt far less', seconds: 240,
    colour: '#d8d2c2', effect: { fallMul: 0.3 } },

  // Standing buffs. Short by design: they are re-given every moment their source is in
  // reach, so the duration is only how long they outlive walking away from it.
  cosy: { name: 'Cosy', text: 'Health returns faster near a fire', seconds: 2.5,
    colour: '#e2743a', standing: true, effect: { regen: 1.8 } }
};

// What grants a standing buff, and how far it reaches. Keyed by the tile's own key, so a
// new warm thing is one line here and one tile.
const HEARTHS = {
  campfire: { buff: 'cosy', range: 14 },
  torch: { buff: 'cosy', range: 5 },
  lantern: { buff: 'cosy', range: 8 }
};

function makeBuffs() {
  // key -> seconds remaining. A plain object because it is saved as one.
  const held = {};

  // Give a buff, or refresh it. Never stacks: the longer of what is left and what is
  // being given wins, so drinking a second potion early is not punished and drinking
  // forty is not a way to be invincible for an hour.
  function give(key, seconds) {
    const spec = BUFFS[key];
    if (!spec) return false;
    const want = seconds === undefined ? spec.seconds : seconds;
    held[key] = Math.max(held[key] || 0, want);
    return true;
  }

  function remove(key) {
    delete held[key];
  }

  function step(dt) {
    for (const key of Object.keys(held)) {
      held[key] -= dt;
      if (held[key] <= 0) delete held[key];
    }
    return held;
  }

  function has(key) {
    return (held[key] || 0) > 0;
  }

  function remaining(key) {
    return held[key] || 0;
  }

  // The modifier bags of everything currently held, for craft.equipEffects.
  function effects() {
    const out = [];
    for (const key of Object.keys(held)) {
      if (BUFFS[key]) out.push(BUFFS[key].effect);
    }
    return out;
  }

  // What to show, longest-lasting first so the list does not reshuffle every second.
  function list() {
    return Object.keys(held)
      .filter(key => BUFFS[key])
      .map(key => ({ key, spec: BUFFS[key], seconds: held[key] }))
      .sort((a, b) => b.seconds - a.seconds);
  }

  function clear() {
    for (const key of Object.keys(held)) delete held[key];
  }

  function serialize() {
    const out = {};
    // A standing buff is not saved: it belongs to where you were, not to you, and it
    // would be re-given within a frame of loading anyway if its source is still there.
    for (const key of Object.keys(held)) {
      if (!BUFFS[key] || BUFFS[key].standing) continue;
      out[key] = Math.round(held[key] * 10) / 10;
    }
    return out;
  }

  function restore(saved) {
    clear();
    for (const [key, seconds] of Object.entries(saved || {})) {
      if (BUFFS[key] && seconds > 0) held[key] = seconds;
    }
  }

  return { give, remove, step, has, remaining, effects, list, clear, serialize, restore,
    get count() { return Object.keys(held).length; } };
}

// Which standing buffs a position earns, by looking for the things that grant them. The
// scan is a box rather than a circle because the world is a grid and the difference is
// not visible; the cost is what decides the range, and a campfire reaching fourteen tiles
// is a 29x29 scan done a few times a second rather than every frame.
function hearthsNear(world, tiles, px, py) {
  const found = new Set();
  let reach = 0;
  for (const spec of Object.values(HEARTHS)) reach = Math.max(reach, spec.range);
  const x0 = Math.floor(px) - reach;
  const x1 = Math.floor(px) + reach;
  const y0 = Math.floor(py) - reach;
  const y1 = Math.floor(py) + reach;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const spec = tiles.tile(world.get(x, y));
      const hearth = spec && HEARTHS[spec.key];
      if (!hearth) continue;
      if (Math.abs(x - px) > hearth.range || Math.abs(y - py) > hearth.range) continue;
      found.add(hearth.buff);
    }
  }
  return [...found];
}

const EXPORTS_buffs = { BUFFS, HEARTHS, makeBuffs, hearthsNear };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_buffs;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.buffs = EXPORTS_buffs;
}
