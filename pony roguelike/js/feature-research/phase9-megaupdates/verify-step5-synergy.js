// verify-step5-synergy.js — Mega Update A step 5 regression harness.
// Loads the real index.html script order twice in isolated vm contexts:
//   NEW  = the working tree (SYNERGY_COMBOS registry + items-synergy.js)
//   OLD  = the same tree with the 5 legacy synergies textually reverted to
//          their pre-migration hardcoded form and items-synergy.js omitted
// then runs recalcPlayerStats 8x for a save owning every legacy-synergy item
// across several classIds and asserts (a) OLD and NEW agree on every numeric
// stat and every synergy flag, and (b) nothing drifts across repeated calls.
// Run: node feature-research/phase9-megaupdates/verify-step5-synergy.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '../..');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const SCRIPTS = [];
const re = /<script src="([^"]+)"><\/script>/g;
let m;
while ((m = re.exec(html))) SCRIPTS.push(m[1]);

// --- textual revert of the migration, for the OLD context -------------------
const REVERTS = [
  [`  const ecosystemSetActive = applySynergyComboFlag(player, 'ecosystemSet');`,
   `  const ecosystemSetActive =
    ((p.huntersmark || 0) + (p.quarrysigil || 0) + (p.wardenseye || 0) + (p.branderstag || 0) + (p.snareglyph || 0)) > 0 &&
    ((p.plaguebud || 0) + (p.witherpetal || 0) + (p.bloomrot || 0) + (p.plaguebloom || 0) + (p.rotcrown || 0)) > 0 &&
    ((p.cometshard || 0) + (p.stormcaller || 0) + (p.skyrend || 0) + (p.meteorcrest || 0) + (p.celestialfall || 0)) > 0;`],
  [`  applySynergyComboFlag(player, 'packBond');
  applySynergyComboFlag(player, 'twinFangs');`,
   `  player.ecosystemSetActive = ecosystemSetActive;
  player.packBondActive = !!(player.familiars && player.familiars.length >= 3);
  player.twinFangsActive = (p.fangguard || 0) > 0 && (p.quiverstring || 0) > 0;`],
  [`    + comboBonus(player, 'ecosystemSet', 'meleeDamage')
    + comboBonus(player, 'packBond', 'meleeDamage'));`,
   `    + (ecosystemSetActive ? 0.3 : 0)
    + (player.familiars && player.familiars.length >= 3 ? 0.3 : 0));`],
  [`    + comboBonus(player, 'ecosystemSet', 'rangedDamage')
    + comboBonus(player, 'packBond', 'rangedDamage'));`,
   `    + (ecosystemSetActive ? 0.3 : 0)
    + (player.familiars && player.familiars.length >= 3 ? 0.3 : 0));`],
  [`  applySynergyComboFlag(player, 'rotAndRuin');`,
   `  player.rotAndRuinActive = player.vulnerableChance > 0 && player.venomChance > 0;`],
  [`  applySynergyComboFlag(player, 'marksmansEye');`,
   `  player.marksmansEyeActive = player.critChance >= 0.20 && player.vulnerableChance > 0;`],
  [`    + comboBonus(player, 'marksmansEye', 'critMultiplier'));`,
   `    + (player.marksmansEyeActive ? 0.4 : 0));`],
  [`    + comboBonus(player, 'packBond', 'speedMult'), 0.25, 2.2); // Synergy D: Pack Bond (amount lives in SYNERGY_COMBOS, systems/items-synergy.js)`,
   `    + (player.familiars && player.familiars.length >= 3 ? 0.05 : 0), 0.25, 2.2); // Synergy D: Pack Bond`],
  [`    + comboBonus(player, 'twinFangs', 'critChance'));`,
   `    + ((p.fangguard || 0) > 0 && (p.quiverstring || 0) > 0 ? 0.05 : 0));`],
  [`  applyItemClassSynergyBonuses(player);
  applyItemComboSynergies(player);`, ``]
];

function sourceFor(mode){
  let src = '';
  for (const f of SCRIPTS) {
    if (mode === 'old' && f === 'js/systems/items-synergy.js') continue;
    let text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (mode === 'old' && f === 'js/systems/items-1.js') {
      for (const [nu, old] of REVERTS) {
        if (text.indexOf(nu) === -1) throw new Error('revert target not found: ' + nu.slice(0, 60));
        text = text.split(nu).join(old);
      }
    }
    src += text + '\n';
  }
  return src;
}

function makeContext(){
  const fakeCtx = new Proxy({}, { get(t, p){ if (p in t) return t[p]; return function(){ return fakeCtx; }; } });
  fakeCtx.createLinearGradient = () => ({ addColorStop(){} });
  fakeCtx.createRadialGradient = () => ({ addColorStop(){} });
  fakeCtx.measureText = () => ({ width: 0 });
  const fakeEl = { addEventListener(){}, getContext: () => fakeCtx, style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    appendChild(){}, setAttribute(){}, getAttribute(){}, remove(){}, dataset: {}, children: [], querySelectorAll: () => [],
    querySelector: () => null, focus(){}, blur(){}, value: '', textContent: '', innerHTML: '' };
  const sandbox = {
    console,
    localStorage: { getItem: () => null, setItem(){}, removeItem(){} },
    document: { createElement: () => fakeEl, getElementById: () => fakeEl, addEventListener(){}, querySelectorAll: () => [], querySelector: () => null, body: fakeEl, documentElement: fakeEl },
    Audio: function(){ return { play(){ return Promise.resolve(); }, pause(){}, cloneNode: () => ({ play(){ return Promise.resolve(); } }) }; },
    requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
    navigator: { userAgent: 'node' }, addEventListener(){}, removeEventListener(){},
    innerWidth: 1024, innerHeight: 768, performance: { now: () => Date.now() },
    AudioContext: function(){ return { createGain: () => ({ connect(){}, gain: { value: 0 } }), createOscillator: () => ({ connect(){}, start(){}, stop(){}, frequency: { value: 0 } }), destination: {}, resume(){ return Promise.resolve(); } }; },
    setTimeout, clearTimeout, setInterval, clearInterval, Math, Date, JSON
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  return vm.createContext(sandbox);
}

// Every item that participates in a legacy synergy, plus the enablers needed
// to switch all 5 flags on at once (venom + 20% crit + a Vulnerable source).
const LEGACY_ITEMS = ['huntersmark','quarrysigil','wardenseye','branderstag','snareglyph',
  'plaguebud','witherpetal','bloomrot','plaguebloom','rotcrown',
  'cometshard','stormcaller','skyrend','meteorcrest','celestialfall',
  'fangguard','quiverstring','venom','stormbarrel','predatorseye'];
const CLASS_IDS = ['earth','unicorn','pegasus','dragon','ponybot'];
const FLAGS = ['ecosystemSetActive','rotAndRuinActive','marksmansEyeActive','packBondActive','twinFangsActive'];
const RUNS = 8;

function harness(mode){
  const ctx = makeContext();
  vm.runInContext(sourceFor(mode), ctx, { filename: 'bundle-' + mode + '.js' });
  const script = `
    (function(){
      const out = {};
      const classIds = ${JSON.stringify(CLASS_IDS)};
      for (const cid of classIds) {
        for (const owned of [true, false]) {
          const pl = new Player(cid);
          if (owned) { for (const id of ${JSON.stringify(LEGACY_ITEMS)}) pl.passives[id] = (id === 'stormbarrel' ? 2 : 1); }
          pl.familiars = owned ? [{},{},{}] : [];
          const snaps = [];
          for (let i = 0; i < ${RUNS}; i++) {
            recalcPlayerStats(pl);
            const s = {};
            for (const k in pl) { const v = pl[k]; if (typeof v === 'number' || typeof v === 'boolean') s[k] = v; }
            snaps.push(s);
          }
          out[cid + '|' + (owned ? 'owned' : 'bare')] = snaps;
        }
      }
      return JSON.stringify(out);
    })()`;
  return JSON.parse(vm.runInContext(script, ctx));
}

let fails = 0, checks = 0;
function check(ok, label){ checks++; if (!ok) { fails++; console.log('  FAIL: ' + label); } }

console.log('Loading OLD (pre-migration) bundle...');
const oldRes = harness('old');
console.log('Loading NEW (migrated) bundle...');
const newRes = harness('new');

console.log('\n--- (a) OLD vs NEW equivalence (call 1 and call ' + RUNS + ') ---');
for (const key in newRes) {
  for (const idx of [0, RUNS - 1]) {
    const a = oldRes[key][idx], b = newRes[key][idx];
    const keys = new Set(Object.keys(a).concat(Object.keys(b)));
    for (const k of keys) {
      if (k.indexOf('_itemClassSynergyBase') === 0 || k.indexOf('_itemComboBase') === 0) continue;
      check(a[k] === b[k], key + ' call#' + (idx + 1) + ' ' + k + ': old=' + a[k] + ' new=' + b[k]);
    }
  }
}
console.log('  ' + checks + ' field comparisons, ' + fails + ' mismatches');

console.log('\n--- (b) no drift across ' + RUNS + ' repeated recalcs (NEW) ---');
const before = fails;
for (const key in newRes) {
  const first = newRes[key][0];
  for (let i = 1; i < RUNS; i++) {
    for (const k in first) check(first[k] === newRes[key][i][k], key + ' drift on ' + k + ': call1=' + first[k] + ' call' + (i + 1) + '=' + newRes[key][i][k]);
  }
}
console.log('  drift mismatches: ' + (fails - before));

console.log('\n--- (c) the 5 legacy synergy flags + bonuses ---');
for (const cid of CLASS_IDS) {
  const owned = newRes[cid + '|owned'][RUNS - 1], bare = newRes[cid + '|bare'][RUNS - 1];
  const on = FLAGS.filter(f => owned[f]);
  console.log('  ' + cid + ' owned: flags on = [' + on.join(', ') + '] meleeDamage=' + owned.meleeDamage +
    ' rangedDamage=' + owned.rangedDamage + ' critMultiplier=' + owned.critMultiplier);
  check(on.length === 5, cid + ' expected all 5 legacy flags active, got ' + on.length);
  check(FLAGS.every(f => bare[f] === false), cid + ' bare save should have no synergy flags');
}

console.log('\n--- (d) ITEM_LIST size unchanged ---');
const ctx = makeContext();
vm.runInContext(sourceFor('new'), ctx, { filename: 'bundle-count.js' });
const n = vm.runInContext('ITEM_LIST.length', ctx);
console.log('  ITEM_LIST.length = ' + n);
check(n === 864, 'ITEM_LIST length should be 864, got ' + n);
const nSyn = vm.runInContext('ITEM_LIST.filter(i => i.classSynergy).length', ctx);
console.log('  items carrying classSynergy = ' + nSyn + ' (expected 0 this pass)');
const nCombo = vm.runInContext('SYNERGY_COMBOS.length', ctx);
console.log('  SYNERGY_COMBOS.length = ' + nCombo + ' (5 legacy)');
// >= 5 (not === 5): the 5 legacy combos must always survive the migration, but
// the step-5 content slices each APPEND new stage:'post' combos below the
// "--- NEW combos" marker, so the exact count grows as content lands.
check(nCombo >= 5, 'expected at least the 5 legacy combos, got ' + nCombo);

console.log('\n--- (e) live smoke of the two NEW layers (injected, not persisted) ---');
const probe = vm.runInContext(`(function(){
  // give an ordinary item a classSynergy entry and register a post-stage combo
  const it = ITEMS['luckyclover'];
  it.classSynergy = { earth: { field: 'critChance', amount: 0.10 }, unicorn: { field: 'meleeDamage', amount: 1 } };
  SYNERGY_COMBOS.push({ id: 'probeCombo', name: 'Probe', desc: 'test', flag: 'probeComboActive',
    items: ['luckyclover','venom'], effects: [{ field: 'critChance', amount: 0.05 }] });
  SYNERGY_COMBOS_BY_ID['probeCombo'] = SYNERGY_COMBOS[SYNERGY_COMBOS.length - 1];
  const out = {};
  for (const cid of ['earth','unicorn']) {
    const pl = new Player(cid);
    pl.passives['luckyclover'] = 1; pl.passives['venom'] = 1;
    const snaps = [];
    for (let i = 0; i < 8; i++) { recalcPlayerStats(pl); snaps.push({ crit: pl.critChance, md: pl.meleeDamage, flag: pl.probeComboActive }); }
    // now drop the items and recalc: bonuses must fully unwind to the base
    pl.passives['luckyclover'] = 0; pl.passives['venom'] = 0;
    recalcPlayerStats(pl);
    const bare = new Player(cid); recalcPlayerStats(bare);
    out[cid] = { snaps, dropped: { crit: pl.critChance, md: pl.meleeDamage, flag: pl.probeComboActive },
                 reference: { crit: bare.critChance, md: bare.meleeDamage } };
  }
  return JSON.stringify(out);
})()`, ctx);
const pr = JSON.parse(probe);
for (const cid in pr) {
  const s = pr[cid].snaps;
  console.log('  ' + cid + ': crit=' + s[0].crit.toFixed(4) + ' md=' + s[0].md + ' comboFlag=' + s[0].flag +
    ' | after dropping items crit=' + pr[cid].dropped.crit.toFixed(4) + ' md=' + pr[cid].dropped.md +
    ' (fresh-player reference crit=' + pr[cid].reference.crit.toFixed(4) + ' md=' + pr[cid].reference.md + ')');
  for (let i = 1; i < 8; i++) check(s[i].crit === s[0].crit && s[i].md === s[0].md, cid + ' probe drift at call ' + (i + 1));
  check(s[0].flag === true, cid + ' probe combo flag should be active');
  check(Math.abs(pr[cid].dropped.crit - pr[cid].reference.crit) < 1e-9, cid + ' critChance did not unwind to base after dropping items');
  check(Math.abs(pr[cid].dropped.md - pr[cid].reference.md) < 1e-9, cid + ' meleeDamage did not unwind to base after dropping items');
}

console.log('\n' + (fails === 0 ? 'ALL PASS' : fails + ' FAILURES') + ' (' + checks + ' assertions)');
process.exit(fails === 0 ? 0 : 1);
