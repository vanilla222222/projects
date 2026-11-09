'use strict';
// What is in a chest. Contents are a pure function of the chest's position and the world
// seed, exactly like the tiles around it, and only become stored data once the player has
// taken something out. A world with ten thousand untouched chests therefore costs nothing
// to save, and two players on the same seed find the same sword in the same cabin.
//
// A table is a list of entries with a weight, an amount range, and how likely it is to
// appear at all. Rolling each entry independently rather than picking one means a chest
// can hold several things, which is what makes opening one interesting rather than a
// single coin flip.

const TABLES = {
  // A cabin in the upper caves: survival kit, a weapon if you are lucky.
  caves: {
    rolls: 4,
    guaranteed: [['torch', 8, 20], ['coin', 25, 90]],
    entries: [
      { key: 'copper-bar', min: 3, max: 8, chance: 0.5 },
      { key: 'tin-bar', min: 3, max: 9, chance: 0.5 },
      { key: 'iron-bar', min: 2, max: 5, chance: 0.3 },
      { key: 'arrow', min: 20, max: 60, chance: 0.45 },
      { key: 'gel', min: 5, max: 15, chance: 0.4 },
      { key: 'oakwood', min: 20, max: 50, chance: 0.4 },
      { key: 'copper-pick', min: 1, max: 1, chance: 0.14 },
      { key: 'copper-sword', min: 1, max: 1, chance: 0.14 },
      { key: 'wood-bow', min: 1, max: 1, chance: 0.12 },
      { key: 'wood-helmet', min: 1, max: 1, chance: 0.1 },
      { key: 'wood-chest', min: 1, max: 1, chance: 0.1 }
    ]
  },
  // Deeper: better metal, and the tools that open the next layer down.
  deep: {
    rolls: 4,
    guaranteed: [['torch', 12, 30], ['coin', 90, 260]],
    entries: [
      { key: 'iron-bar', min: 5, max: 14, chance: 0.6 },
      { key: 'silver-bar', min: 3, max: 10, chance: 0.45 },
      { key: 'gold-bar', min: 2, max: 7, chance: 0.3 },
      { key: 'arrow', min: 40, max: 120, chance: 0.5 },
      { key: 'bone', min: 4, max: 12, chance: 0.4 },
      { key: 'iron-pick', min: 1, max: 1, chance: 0.18 },
      { key: 'iron-sword', min: 1, max: 1, chance: 0.18 },
      { key: 'silver-pick', min: 1, max: 1, chance: 0.1 },
      { key: 'bucket', min: 1, max: 1, chance: 0.15 }
    ]
  },
  // The rare one: what you hope for.
  rich: {
    rolls: 5,
    guaranteed: [['gold-bar', 4, 10], ['coin', 400, 1100]],
    entries: [
      { key: 'gold-bar', min: 5, max: 15, chance: 0.7 },
      { key: 'cobalt-bar', min: 3, max: 9, chance: 0.4 },
      { key: 'emberite-bar', min: 2, max: 6, chance: 0.22 },
      { key: 'gold-pick', min: 1, max: 1, chance: 0.25 },
      { key: 'gold-sword', min: 1, max: 1, chance: 0.25 },
      { key: 'cobalt-pick', min: 1, max: 1, chance: 0.12 },
      { key: 'stardust', min: 2, max: 6, chance: 0.2 }
    ]
  }
};

// Which table a chest at this depth draws from, if the chest kind does not say.
function bandForDepth(depth) {
  if (depth > 760) return 'rich';
  if (depth > 320) return 'deep';
  return 'caves';
}

// Roll a chest. Pure in (seed, x, y): the same chest always holds the same things.
function rollChest(seed, x, y, band, deps) {
  const table = TABLES[band] || TABLES.caves;
  const unit = deps.unit;
  const kindOf = deps.kindOf;
  const out = [];

  for (const [key, min, max] of table.guaranteed) {
    const n = min + Math.floor(unit(seed, x, y, 7001) * (max - min + 1));
    out.push({ key, kind: kindOf(key), count: n });
  }

  let placed = 0;
  for (let i = 0; i < table.entries.length && placed < table.rolls; i += 1) {
    const entry = table.entries[i];
    if (unit(seed, x, y, 7100 + i * 7) > entry.chance) continue;
    const span = entry.max - entry.min;
    const n = entry.min + Math.floor(unit(seed, x, y, 7300 + i * 11) * (span + 1));
    if (n <= 0) continue;
    out.push({ key: entry.key, kind: kindOf(entry.key), count: n });
    placed += 1;
  }
  return out;
}

// Every item key any table can produce, so a test can check they all exist.
function allLootKeys() {
  const keys = new Set();
  for (const table of Object.values(TABLES)) {
    for (const [key] of table.guaranteed) keys.add(key);
    for (const entry of table.entries) keys.add(entry.key);
  }
  return [...keys];
}

const EXPORTS_loot = { TABLES, bandForDepth, rollChest, allLootKeys };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_loot;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.loot = EXPORTS_loot;
}
