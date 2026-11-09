'use strict';
// Settings, checked the way the schema makes possible: once, over every entry.
//
// The reason the schema exists is that a hand-written validator drifts from the
// UI and from the docs. So these tests are mostly loops over SCHEMA rather than
// a list of cases - a setting added tomorrow is tested the moment it is
// declared, and a setting that cannot survive a round trip fails here rather
// than silently resetting itself in somebody's shared link.

const S = require('../js/settings.js');

let checks = 0;
let failures = 0;
function ok(cond, label) {
  checks += 1;
  if (!cond) { failures += 1; console.log('FAIL: ' + label); }
}
function throws(fn, label) {
  checks += 1;
  try { fn(); failures += 1; console.log('FAIL (expected a throw): ' + label); }
  catch (err) { void err; }
}

// --- the schema is well formed -------------------------------------------
{
  const seen = new Set();
  for (const entry of S.SCHEMA) {
    ok(!!entry.key, 'a schema entry has no key');
    ok(!seen.has(entry.key), 'duplicate setting key: ' + entry.key);
    seen.add(entry.key);
    ok(S.GROUPS.includes(entry.group), entry.key + ' is in unknown group ' + entry.group);
    ok(!!entry.label, entry.key + ' has no label for its control');
    ok(['int', 'number', 'bool', 'enum', 'list', 'text'].includes(entry.type),
      entry.key + ' has unknown type ' + entry.type);
    if (entry.type === 'enum') {
      ok(Array.isArray(entry.values) && entry.values.length > 1,
        entry.key + ' is an enum with fewer than two choices');
      ok(entry.values.includes(entry.def), entry.key + ' defaults outside its own values');
    }
    if (entry.type === 'int' || entry.type === 'number') {
      ok(entry.min !== undefined && entry.max !== undefined, entry.key + ' is unbounded');
      if (entry.def !== null) {
        ok(entry.def >= entry.min && entry.def <= entry.max,
          entry.key + ' defaults outside its own bounds');
      }
    }
  }
  // Aliases must be unique too, or one setting silently shadows another.
  const aliases = new Map();
  for (const entry of S.SCHEMA) {
    for (const alias of [entry.key, ...(entry.alias || [])]) {
      const low = alias.toLowerCase();
      ok(!aliases.has(low) || aliases.get(low) === entry.key,
        'alias "' + alias + '" is claimed by both ' + aliases.get(low) + ' and ' + entry.key);
      aliases.set(low, entry.key);
    }
  }
}

// --- defaults are valid --------------------------------------------------
{
  const d = S.defaults();
  ok(Object.keys(d).length === S.SCHEMA.length, 'defaults() misses a setting');
  const normalized = S.normalize(d);
  ok(JSON.stringify(normalized) === JSON.stringify(d), 'defaults do not survive normalize()');
  ok(S.toCommand(d) === '', 'defaults produce a non-empty command: ' + S.toCommand(d));
  ok(S.toQuery(d) === '', 'defaults produce a non-empty query');
}

// --- every setting round-trips through every channel ---------------------
// A value that is deliberately not the default, per type.
function sample(entry) {
  if (entry.type === 'bool') return !entry.def;
  if (entry.type === 'enum') {
    // The first alternative that stands on its own: some choices need a
    // companion setting (catalogue:inventory wants an inventory to search),
    // and the point here is to exercise the channel, not the cross-field rule.
    for (const value of entry.values) {
      if (value === entry.def) continue;
      try { S.normalize({ [entry.key]: value }); return value; } catch (err) { void err; }
    }
    return entry.def;
  }
  if (entry.type === 'int') {
    const mid = Math.min(entry.max, Math.max(entry.min, (entry.def === null ? entry.min : entry.def) + 1));
    return mid === entry.def ? Math.max(entry.min, entry.def - 1) : mid;
  }
  if (entry.type === 'number') {
    const base = entry.def === null ? entry.min : entry.def;
    const next = Math.min(entry.max, base + 1.5);
    return next === entry.def ? Math.max(entry.min, base - 1) : next;
  }
  if (entry.type === 'list') {
    if (entry.of === 'family') return ['coupling', 'reduction'];
    if (entry.of === 'hazard') return ['explosive', 'pyrophoric'];
    if (entry.of === 'element') return ['Cr', 'Os'];
    return ['alpha', 'beta'];
  }
  return 'something';
}

for (const entry of S.SCHEMA) {
  const value = sample(entry);
  let settings;
  try {
    settings = S.normalize({ [entry.key]: value });
  } catch (err) {
    ok(false, entry.key + ' rejected its own sample value: ' + err.message);
    continue;
  }

  const viaCommand = S.parse(S.toCommand(settings));
  ok(JSON.stringify(viaCommand[entry.key]) === JSON.stringify(settings[entry.key]),
    entry.key + ' does not survive the typed syntax: '
    + JSON.stringify(settings[entry.key]) + ' -> ' + JSON.stringify(viaCommand[entry.key]));

  const viaQuery = S.fromQuery(S.toQuery(settings));
  ok(JSON.stringify(viaQuery[entry.key]) === JSON.stringify(settings[entry.key]),
    entry.key + ' does not survive a URL: '
    + JSON.stringify(settings[entry.key]) + ' -> ' + JSON.stringify(viaQuery[entry.key]));

  // And every alias reaches the same setting.
  for (const alias of entry.alias || []) {
    const viaAlias = S.parse(alias + ':' + (Array.isArray(value) ? value.join(',') : value));
    const expected = entry.type === 'bool' ? S.normalize({ [entry.key]: value })[entry.key]
      : settings[entry.key];
    ok(JSON.stringify(viaAlias[entry.key]) === JSON.stringify(expected),
      'alias "' + alias + '" does not set ' + entry.key);
  }
}

// --- bad values are refused, with a reason -------------------------------
for (const entry of S.SCHEMA) {
  if (entry.type === 'int' || entry.type === 'number') {
    throws(() => S.normalize({ [entry.key]: entry.max + 1 }), entry.key + ' accepted a value above its maximum');
    throws(() => S.normalize({ [entry.key]: entry.min - 1 }), entry.key + ' accepted a value below its minimum');
    throws(() => S.normalize({ [entry.key]: 'banana' }), entry.key + ' accepted a non-number');
  }
  if (entry.type === 'enum') {
    throws(() => S.normalize({ [entry.key]: 'nonsense' }), entry.key + ' accepted a value outside its enum');
  }
}
throws(() => S.normalize({ nosuchthing: 1 }), 'an unknown setting was accepted');
throws(() => S.parse('nosuchthing:1'), 'the typed syntax accepted an unknown setting');
throws(() => S.parse('depth'), 'the typed syntax accepted a bare non-boolean');
throws(() => S.normalize([]), 'an array was accepted as settings');

// --- cross-field rules ----------------------------------------------------
throws(() => S.normalize({ minTemp: 100, maxTemp: 0 }), 'a temperature window with min above max was accepted');
ok(S.normalize({ minTemp: 0, maxTemp: 100 }).maxTemp === 100, 'a valid temperature window was refused');
throws(() => S.normalize({
  weightSteps: 0, weightCost: 0, weightPrecedent: 0, weightConvergence: 0, weightProtection: 0,
}), 'all ranking weights at zero was accepted');
throws(() => S.normalize({ catalogue: 'inventory' }), 'inventory-only with an empty inventory was accepted');
throws(() => S.normalize({ families: ['coupling'], banFamilies: ['coupling'] }),
  'a family both required and banned was accepted');
throws(() => S.normalize({ families: ['nonsense'] }), 'an unknown reaction family was accepted');
throws(() => S.normalize({ banHazards: ['spicy'] }), 'an unknown hazard class was accepted');

// --- booleans, written every way -----------------------------------------
for (const [text, expected] of [['cryo:off', false], ['cryo:false', false], ['cryo:no', false],
  ['cryo:0', false], ['!cryo', false], ['-cryo', false],
  ['cryo:on', true], ['cryo:true', true], ['cryo', true]]) {
  ok(S.parse(text).allowCryogenic === expected, '"' + text + '" should mean ' + expected);
}

// --- layers compose in order ---------------------------------------------
{
  const profile = S.normalize({ maxDepth: 10, beamWidth: 60, scale: 'kilogram' });
  const url = 'depth=12';
  const typed = 'beam:100';
  const call = { maxRoutes: 3 };
  const final = S.resolve([profile, S.fromQuery(url), typed, call]);
  ok(final.maxDepth === 12, 'the URL should override the profile: got ' + final.maxDepth);
  ok(final.beamWidth === 100, 'the typed command should override the URL: got ' + final.beamWidth);
  ok(final.maxRoutes === 3, 'the per-search layer should apply: got ' + final.maxRoutes);
  ok(final.scale === 'kilogram', 'the profile should survive where nothing overrides it');
  ok(final.budgetMs === S.defaults().budgetMs, 'an untouched setting should keep its default');
}
{
  // A later layer that says nothing must not reset an earlier one.
  const final = S.resolve([{ maxDepth: 15 }, {}, '']);
  ok(final.maxDepth === 15, 'an empty layer wiped an earlier setting: got ' + final.maxDepth);
}

// --- a shared link survives the trip --------------------------------------
{
  const wanted = S.normalize({
    maxDepth: 14, beamWidth: 80, strategy: 'iterative', weightCost: 4, weightSteps: 0.5,
    banElements: ['Cr', 'Os', 'Hg'], banHazards: ['carcinogen'], allowCryogenic: false,
    scale: 'kilogram', maxTemp: 120, catalogue: 'both', maxPricePerGram: 50,
    banFamilies: ['metathesis'], protection: 'manual', stereo: 'mixtures',
  });
  const link = S.toQuery(wanted);
  ok(JSON.stringify(S.fromQuery(link)) === JSON.stringify(wanted),
    'a fully specified policy did not survive a URL round trip');
  const typed = S.toCommand(wanted);
  ok(JSON.stringify(S.parse(typed)) === JSON.stringify(wanted),
    'a fully specified policy did not survive the typed syntax: ' + typed);
  ok(link.length < 400, 'the shared link is unwieldy at ' + link.length + ' characters');
}

console.log('\n' + S.SCHEMA.length + ' settings in ' + S.GROUPS.length + ' groups, '
  + 'reachable as objects, typed commands, URLs and layered overrides');
console.log(checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
