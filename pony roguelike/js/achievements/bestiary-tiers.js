'use strict';

const BESTIARY_TIER_THRESHOLDS = {
  enemy:      [50, 250, 1000, 5000, 25000, 125000],
  boss:       [10, 40, 150, 500, 2000, 8000],
  superboss:  [1, 5, 15, 50, 200, 800],
  item:       [3, 10, 30, 100, 300, 900],
  trinket:    [3, 10, 30, 100, 300, 900],
  familiar:   [3, 10, 30, 100, 300, 900],
  star:       [3, 10, 30, 100, 300, 900],
  pill:       [3, 10, 30, 100, 300, 900],
  object:     [5, 20, 75, 250, 800, 2500],
  pickup:     [10, 40, 150, 500, 2000, 8000],
  roomtype:   [3, 10, 30, 100, 300, 900],
  stage:      [1, 3, 10, 30, 90, 270],

  familiarUseCount: [25, 100, 400, 1500, 6000, 24000],
};

const BESTIARY_TIER_NAMES = ['copper', 'silver', 'gold', 'platinum', 'diamond', 'obsidian'];

const BESTIARY_TIER_ICONS = { copper:'🟠', silver:'⚪', gold:'🟡', platinum:'💠', diamond:'💎', obsidian:'🖤' };
const BESTIARY_TIER_COLORS = { copper:'#b87333', silver:'#c0c0c0', gold:'#ffd700', platinum:'#e5e4e2', diamond:'#b9f2ff', obsidian:'#9a5fe0' };

function bestiaryTierFor(category, count){
  const ladder = BESTIARY_TIER_THRESHOLDS[category];
  if (!ladder) return 0;
  const n = count || 0;
  let tier = 0;
  for (let i = 0; i < ladder.length; i++) if (n >= ladder[i]) tier = i + 1;
  return tier;
}

function bestiaryTierName(tier){ return tier > 0 ? BESTIARY_TIER_NAMES[tier - 1] : null; }
function bestiaryTierLabel(tier){
  const n = bestiaryTierName(tier);
  return n ? (n.charAt(0).toUpperCase() + n.slice(1) + ' tier') : '';
}

function bestiaryTierProgressHint(category, count){
  const ladder = BESTIARY_TIER_THRESHOLDS[category];
  if (!ladder) return null;
  const n = count || 0;
  for (let i = 0; i < ladder.length; i++) {
    if (n < ladder[i]) {
      const nextName = BESTIARY_TIER_NAMES[i];
      return Util.formatNum(n) + ' / ' + Util.formatNum(ladder[i]) + ' to ' + nextName.charAt(0).toUpperCase() + nextName.slice(1);
    }
  }
  return null;
}
