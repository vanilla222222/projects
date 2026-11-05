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

const TOOLS = {
  'wood-pick': { name: 'Wooden Pickaxe', power: 35, useTime: 0.3, tier: 0 },
  'copper-pick': { name: 'Copper Pickaxe', power: 45, useTime: 0.27, tier: 1 },
  'iron-pick': { name: 'Iron Pickaxe', power: 55, useTime: 0.24, tier: 2 },
  'silver-pick': { name: 'Silver Pickaxe', power: 65, useTime: 0.22, tier: 3 },
  'gold-pick': { name: 'Gold Pickaxe', power: 75, useTime: 0.2, tier: 4 },
  'cobalt-pick': { name: 'Cobalt Pickaxe', power: 100, useTime: 0.17, tier: 5 },
  'emberite-pick': { name: 'Emberite Pickaxe', power: 125, useTime: 0.14, tier: 6 }
};

// Doubled power, as Terraria does for dirt, clay and sand: the soft ground you move through
// rather than the rock you work at.
// Head colour per tier, so a glance at the hotbar says which pickaxe you are holding.
const TIER_COLOURS = ['#8a6a42', '#b5733c', '#8f8f97', '#c9ccd6', '#e0c054', '#3f7fb5', '#d4663a'];

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

function damagePerHit(power, tileSpec) {
  if (!tileSpec) return 0;
  if (INSTANT.has(tileSpec.key)) return toughnessOf(tileSpec);
  if (power < requirementOf(tileSpec)) return 0;
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TOOLS, TIER_COLOURS, SOFT, INSTANT, BREAK_AT, toolSpec, powerOf, useTimeOf,
    requirementOf, toughnessOf, canMine, tierColour, isTool, damagePerHit, hitsFor, secondsFor, requirementName };
}
