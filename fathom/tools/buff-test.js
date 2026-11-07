'use strict';
// Buffs. A buff is the same kind of thing as an accessory - a bag of modifier fields -
// with a clock on it, so most of what is worth testing is the clock and the folding.
//
// The claims: a buff expires, drinking the same potion twice does not stack, a standing
// buff fades when you walk away from what granted it, every buff really changes something
// through the same path a worn accessory does, and a buff survives a save except for the
// standing ones, which belong to where you were rather than to you.

const buffs = require('../js/buffs.js');
const craft = require('../js/craft.js');
const tiles = require('../js/tiles.js');

let checks = 0;
let failures = 0;
function ok(cond, label) {
  checks += 1;
  if (!cond) { failures += 1; console.log('FAIL: ' + label); }
}

// --- 1. the table is sane ----------------------------------------------------------------
const keys = Object.keys(buffs.BUFFS);
ok(keys.length >= 10, 'only ' + keys.length + ' buffs exist');
for (const key of keys) {
  const spec = buffs.BUFFS[key];
  ok(typeof spec.name === 'string' && spec.name.length > 0, key + ' has no name');
  ok(typeof spec.text === 'string' && spec.text.length > 0, key + ' cannot explain itself');
  ok(spec.seconds > 0, key + ' lasts ' + spec.seconds + ' seconds');
  ok(spec.standing ? spec.seconds <= 10 : spec.seconds >= 60,
    key + ' lasts ' + spec.seconds + 's, which is wrong for its kind');
  ok(/^#[0-9a-f]{6}$/i.test(spec.colour), key + ' has no colour');
  ok(spec.effect && Object.keys(spec.effect).length > 0, key + ' changes nothing');
  // Every field a buff sets has to be one the effects system knows how to fold in, or
  // the buff silently does nothing at all.
  for (const field of Object.keys(spec.effect)) {
    ok(craft.EFFECT_FIELDS[field] !== undefined || field === 'breath',
      key + ' sets ' + field + ', which no effect is made of');
  }
}

// --- 2. every buff really changes the player ------------------------------------------------
// Folded through the same path a worn accessory takes, and compared against wearing
// nothing: a buff whose effect never reaches equipEffects is a buff that does nothing.
for (const key of keys) {
  const plain = craft.equipEffects([], [], []);
  const with1 = craft.equipEffects([], [], [buffs.BUFFS[key].effect]);
  let changed = false;
  for (const field of Object.keys(plain)) {
    if (plain[field] !== with1[field]) changed = true;
  }
  ok(changed, 'the buff ' + key + ' changed nothing about the player');
}

// --- 3. the clock ------------------------------------------------------------------------------
{
  const held = buffs.makeBuffs();
  ok(held.count === 0, 'a new set of buffs is not empty');
  ok(held.give('swiftness'), 'swiftness could not be given');
  ok(!held.give('nosuchbuff'), 'a buff that does not exist was given');
  ok(held.has('swiftness'), 'swiftness was given and is not held');
  ok(held.remaining('swiftness') === buffs.BUFFS.swiftness.seconds,
    'swiftness did not start at its full duration');

  // It counts down and then it is gone.
  held.step(100);
  ok(held.has('swiftness'), 'swiftness expired early');
  ok(Math.abs(held.remaining('swiftness') - (buffs.BUFFS.swiftness.seconds - 100)) < 1e-9,
    'swiftness did not count down by the time that passed');
  held.step(1000);
  ok(!held.has('swiftness'), 'swiftness outlived its own duration');
  ok(held.count === 0, 'an expired buff is still being held');

  // Drinking again does not stack: the longer of the two wins, so a stack of forty
  // potions is not an hour of invincibility.
  held.give('ironskin');
  held.step(10);
  const left = held.remaining('ironskin');
  held.give('ironskin');
  ok(held.remaining('ironskin') === buffs.BUFFS.ironskin.seconds,
    'drinking again did not refresh the duration');
  ok(held.remaining('ironskin') < left + buffs.BUFFS.ironskin.seconds,
    'drinking again stacked the duration');
  // And a refresh never shortens what is left.
  held.give('ironskin', 5);
  ok(held.remaining('ironskin') === buffs.BUFFS.ironskin.seconds,
    'a shorter dose cut an existing buff short');

  held.remove('ironskin');
  ok(!held.has('ironskin'), 'a removed buff is still held');
}

// --- 4. what is held reaches the player ----------------------------------------------------------
{
  const held = buffs.makeBuffs();
  held.give('ironskin');
  held.give('swiftness');
  const effects = craft.equipEffects([], [], held.effects());
  ok(effects.defense === 8, 'ironskin gave ' + effects.defense + ' defence');
  ok(Math.abs(effects.speed - 1.25) < 1e-9, 'swiftness gave speed ' + effects.speed);
  // Two buffs that touch the same number multiply rather than one winning.
  held.give('cosy');
  held.give('regeneration');
  const both = craft.equipEffects([], [], held.effects());
  ok(Math.abs(both.regen - 3 * 1.8) < 1e-9,
    'two regeneration sources gave ' + both.regen + ' rather than 5.4');
  // And the list is longest-first, so it does not reshuffle while being read.
  const list = held.list();
  ok(list.length === held.count, 'the list is not everything held');
  for (let i = 1; i < list.length; i += 1) {
    ok(list[i - 1].seconds >= list[i].seconds, 'the buff list is not in order');
  }
}

// --- 5. saving -------------------------------------------------------------------------------------
{
  const held = buffs.makeBuffs();
  held.give('swiftness');
  held.give('cosy');
  const saved = JSON.parse(JSON.stringify(held.serialize()));
  ok(saved.swiftness > 0, 'a drunk buff was not saved');
  ok(saved.cosy === undefined,
    'a standing buff was saved: it belongs to where you were, not to you');

  const back = buffs.makeBuffs();
  back.restore(saved);
  ok(back.has('swiftness'), 'a drunk buff did not survive a reload');
  ok(Math.abs(back.remaining('swiftness') - saved.swiftness) < 0.2,
    'a reloaded buff came back with the wrong time on it');
  back.restore({ nosuchbuff: 90, swiftness: -5 });
  ok(back.count === 0, 'a reload accepted a buff that does not exist or has expired');
}

// --- 6. hearths ---------------------------------------------------------------------------------------
{
  // Every hearth must be a real tile that gives a real buff, or it warms nothing.
  for (const [key, spec] of Object.entries(buffs.HEARTHS)) {
    ok(!!tiles.BY_KEY[key], 'the hearth ' + key + ' is not a tile');
    ok(!!buffs.BUFFS[spec.buff], 'the hearth ' + key + ' gives ' + spec.buff
      + ', which is not a buff');
    ok(buffs.BUFFS[spec.buff].standing,
      'the hearth ' + key + ' gives ' + spec.buff + ', which is not a standing buff');
    ok(spec.range > 0 && spec.range <= 30, 'the hearth ' + key + ' reaches ' + spec.range);
  }

  // A campfire warms what is near it and nothing that is not.
  const fire = tiles.idOf('campfire');
  const world = {
    get(x, y) { return (x === 0 && y === 0) ? fire : tiles.AIR; }
  };
  const range = buffs.HEARTHS.campfire.range;
  ok(buffs.hearthsNear(world, tiles, 0, 0).includes('cosy'), 'standing in a fire is not cosy');
  ok(buffs.hearthsNear(world, tiles, range - 1, 0).includes('cosy'),
    'a fire ' + (range - 1) + ' tiles away did not warm anything');
  ok(!buffs.hearthsNear(world, tiles, range + 2, 0).includes('cosy'),
    'a fire warmed something ' + (range + 2) + ' tiles away, past its own range');
  ok(buffs.hearthsNear({ get: () => tiles.AIR }, tiles, 0, 0).length === 0,
    'an empty world warmed somebody');

  // And walking away from it lets the buff run out rather than leaving it on forever.
  const held = buffs.makeBuffs();
  for (const key of buffs.hearthsNear(world, tiles, 1, 0)) held.give(key);
  ok(held.has('cosy'), 'standing by a fire did not make anybody cosy');
  held.step(buffs.BUFFS.cosy.seconds + 0.1);
  ok(!held.has('cosy'), 'the cosy buff outlived walking away from the fire');
}

// --- 7. every buff is reachable ---------------------------------------------------------------------
// A buff nothing can grant is dead code. Either a potion gives it or a hearth does.
{
  const granted = new Set();
  for (const item of Object.values(craft.ITEMS)) {
    if (item.use && item.use.buff) granted.add(item.use.buff);
  }
  for (const spec of Object.values(buffs.HEARTHS)) granted.add(spec.buff);
  for (const key of keys) {
    ok(granted.has(key), 'nothing in the game can give the buff ' + key);
  }
}

console.log('\n' + keys.length + ' buffs: '
  + keys.map(k => buffs.BUFFS[k].name).join(', '));
console.log(checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
