'use strict';
// Mining power. A tile accumulates damage and breaks at 100; each swing adds the tool's
// power, doubled on soft ground, and adds nothing at all when the power is below the tile's
// requirement. That last rule is the whole progression gate: a wooden pick cannot scratch
// deep slate however long you hold the button. REFERENCE.md records where the model is from.

// Terraria breaks every tile once it has taken 100 damage and separates the tiers by
// pickaxe power and swing speed alone. With six ores rather than dozens that collapses:
// anything over 100 power one-shots the whole world and the late tiers tie everywhere.
// So a Fathom tile carries its own toughness, defaulting to Terraria's 100, and depth
// costs time as well as permission. REFERENCE.md lists this as a departure.
const BREAK_AT = 100;

// Tools come in three jobs, as in Terraria: a pickaxe breaks blocks, an axe fells trees,
// a hammer takes down background walls. Holding the wrong one does nothing, which is what
// makes the starting set of four a set rather than four copies of the same thing.
const TOOLS = {
  'wood-pick': { name: 'Wooden Pickaxe', job: 'pick', power: 30, useTime: 0.32, tier: 0 },
  'wood-axe': { name: 'Wooden Axe', job: 'axe', power: 32, useTime: 0.34, tier: 0 },
  'wood-hammer': { name: 'Wooden Hammer', job: 'hammer', power: 30, useTime: 0.38, tier: 0 },

  'tin-pick': { name: 'Tin Pickaxe', job: 'pick', power: 38, useTime: 0.29, tier: 1 },
  'tin-axe': { name: 'Tin Axe', job: 'axe', power: 42, useTime: 0.3, tier: 1 },
  'tin-hammer': { name: 'Tin Hammer', job: 'hammer', power: 40, useTime: 0.34, tier: 1 },

  'copper-pick': { name: 'Copper Pickaxe', job: 'pick', power: 45, useTime: 0.27, tier: 2 },
  'copper-axe': { name: 'Copper Axe', job: 'axe', power: 50, useTime: 0.28, tier: 2 },
  'copper-hammer': { name: 'Copper Hammer', job: 'hammer', power: 48, useTime: 0.32, tier: 2 },

  'iron-pick': { name: 'Iron Pickaxe', job: 'pick', power: 55, useTime: 0.24, tier: 3 },
  'iron-axe': { name: 'Iron Axe', job: 'axe', power: 62, useTime: 0.25, tier: 3 },
  'iron-hammer': { name: 'Iron Hammer', job: 'hammer', power: 60, useTime: 0.28, tier: 3 },

  'silver-pick': { name: 'Silver Pickaxe', job: 'pick', power: 65, useTime: 0.22, tier: 4 },
  'silver-axe': { name: 'Silver Axe', job: 'axe', power: 72, useTime: 0.23, tier: 4 },
  'silver-hammer': { name: 'Silver Hammer', job: 'hammer', power: 70, useTime: 0.25, tier: 4 },

  'gold-pick': { name: 'Gold Pickaxe', job: 'pick', power: 75, useTime: 0.2, tier: 5 },
  'gold-axe': { name: 'Gold Axe', job: 'axe', power: 84, useTime: 0.21, tier: 5 },
  'gold-hammer': { name: 'Gold Hammer', job: 'hammer', power: 80, useTime: 0.23, tier: 5 },

  'cobalt-pick': { name: 'Cobalt Pickaxe', job: 'pick', power: 100, useTime: 0.17, tier: 6 },
  'cobalt-axe': { name: 'Cobalt Axe', job: 'axe', power: 108, useTime: 0.18, tier: 6 },
  'cobalt-hammer': { name: 'Cobalt Hammer', job: 'hammer', power: 104, useTime: 0.20, tier: 6 },

  'emberite-pick': { name: 'Emberite Pickaxe', job: 'pick', power: 125, useTime: 0.14, tier: 7 },
  'emberite-axe': { name: 'Emberite Axe', job: 'axe', power: 134, useTime: 0.15, tier: 7 },
  'emberite-hammer': { name: 'Emberite Hammer', job: 'hammer', power: 128, useTime: 0.17, tier: 7 },

  'rift-pick': { name: 'Rift Pickaxe', job: 'pick', power: 180, useTime: 0.12, tier: 8 },

  'meteor-pick': { name: 'Meteor Pickaxe', job: 'pick', power: 55, useTime: 0.23, tier: 9 },
  'meteor-axe': { name: 'Meteor Axe', job: 'axe', power: 64, useTime: 0.23, tier: 9 },
  'meteor-hammer': { name: 'Meteor Hammer', job: 'hammer', power: 62, useTime: 0.25, tier: 9 },

  'aetherite-pick': { name: 'Aetherite Pickaxe', job: 'pick', power: 200, useTime: 0.105, tier: 10 },
  'aetherite-axe': { name: 'Aetherite Axe', job: 'axe', power: 208, useTime: 0.115, tier: 10 },
  'aetherite-hammer': { name: 'Aetherite Hammer', job: 'hammer', power: 205, useTime: 0.13, tier: 10 }
};

// Which tool a given tile answers to. Anything with a background wall is hammer work,
// a standing trunk is axe work, and the rest is for a pickaxe.
// What breaking this tile leaves on the ground, or null for nothing.
//
// Three cases, and two of them were collapsed into one by a `||` until a pot made it
// obvious: `drops: null` means the tile leaves nothing behind, `drops: 'something'` names
// what it leaves, and no `drops` at all means it leaves itself. Under the old spelling
// every tile declared to drop nothing - grass tufts, ferns, dead bushes, seaweed, reeds -
// dropped a copy of itself instead.
//
// A cell of a multi-tile object leaves the whole object, never the cell: a lone
// `oakdoor_00` is an item that cannot be placed back and should never exist.
function dropsOf(spec) {
  if (!spec) return null;
  if (spec.drops === null) return null;
  if (spec.part) return spec.part.of;
  return spec.drops || spec.key;
}

function jobFor(spec, isWall) {
  if (isWall) return 'hammer';
  if (spec && spec.trunkOf) return 'axe';
  return 'pick';
}


// Doubled power, as Terraria does for dirt, clay and sand: the soft ground you move through
// rather than the rock you work at.
// Head colour per tier, so a glance at the hotbar says which pickaxe you are holding.
const TIER_COLOURS = ['#8a6a42', '#a9a79c', '#b5733c', '#8f8f97', '#c9ccd6', '#e0c054', '#3f7fb5', '#d4663a', '#a484e5', '#a06a5c', '#8de8d3'];

const SOFT = new Set(['dirt', 'grass', 'sand', 'snow', 'clay', 'mud']);

// Anything that is scenery rather than rock comes away in one swing whatever you hold.
const INSTANT = new Set(['leaves', 'vine', 'torch', 'glowmoss', 'mushroom', 'trunk', 'lantern']);

function tierColour(item) {
  const spec = item ? toolSpec(item.key) : null;
  return spec ? TIER_COLOURS[spec.tier] || '#8894a8' : '#8894a8';
}

function isTool(item) {
  return !!(item && toolSpec(item.key));
}

function toolSpec(key) {
  return TOOLS[key] || null;
}

function powerOf(item) {
  if (!item) return 0;
  const spec = toolSpec(item.key);
  return spec ? spec.power : 0;
}

function useTimeOf(item) {
  const spec = item ? toolSpec(item.key) : null;
  return spec ? spec.useTime : 0.4;
}

function toughnessOf(tileSpec) {
  return tileSpec && tileSpec.toughness ? tileSpec.toughness : BREAK_AT;
}

function requirementOf(tileSpec) {
  return tileSpec && tileSpec.require ? tileSpec.require : 0;
}

function canMine(power, tileSpec) {
  if (!tileSpec) return false;
  if (INSTANT.has(tileSpec.key)) return true;
  return power >= requirementOf(tileSpec);
}

function damagePerHit(power, tileSpec, basePower = power) {
  if (!tileSpec) return 0;
  if (INSTANT.has(tileSpec.key)) return toughnessOf(tileSpec);
  if ((tileSpec.basePowerGate ? basePower : power) < requirementOf(tileSpec)) return 0;
  return SOFT.has(tileSpec.key) ? power * 2 : power;
}

function hitsFor(power, tileSpec) {
  const per = damagePerHit(power, tileSpec);
  if (per <= 0) return Infinity;
  return Math.ceil(toughnessOf(tileSpec) / per);
}

// The first swing lands the moment the button goes down, so a tile that takes n hits
// costs n-1 waits. Reporting n * useTime would overstate every number in the table.
function secondsFor(item, tileSpec) {
  const hits = hitsFor(powerOf(item), tileSpec);
  if (!Number.isFinite(hits)) return Infinity;
  return (hits - 1) * useTimeOf(item);
}

// What the player is told when a tile will not break: naming the tier is more use than
// "you need a better pickaxe".
function requirementName(tileSpec) {
  const need = requirementOf(tileSpec);
  let best = null;
  for (const [key, spec] of Object.entries(TOOLS)) {
    if (spec.power < need) continue;
    if (!best || spec.power < TOOLS[best].power) best = key;
  }
  return best ? TOOLS[best].name : 'a stronger pickaxe';
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
const EXPORTS_mining = { TOOLS, TIER_COLOURS, jobFor, dropsOf, SOFT, INSTANT, BREAK_AT, toolSpec, powerOf, useTimeOf,
    requirementOf, toughnessOf, canMine, tierColour, isTool, damagePerHit, hitsFor, secondsFor, requirementName };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_mining;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.mining = EXPORTS_mining;
}
