'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = '/home/vanilla/Downloads/adele2';

const files = fs.readFileSync('/tmp/scriptlist2.txt', 'utf8').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 41); // through defs-mastery.js

const sandbox = {
  console,
  window: {},
  document: { getElementById: () => null, createElement: () => ({ style: {}, classList: { add(){}, remove(){} } }) },
  localStorage: { getItem: () => null, setItem: () => {} },
  Math, JSON, Object, Array, Date,
};
sandbox.window = sandbox;
vm.createContext(sandbox);

let loadFailed = false;
for (const f of files) {
  const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
  try {
    vm.runInContext(code, sandbox, { filename: f });
  } catch (e) {
    console.error('FAILED loading', f, e.message);
    loadFailed = true;
  }
}
if (loadFailed) process.exit(1);

vm.runInContext('this.__ACHIEVEMENTS = ACHIEVEMENTS; this.__ITEMS = ITEMS;', sandbox);
const ACHIEVEMENTS = sandbox.__ACHIEVEMENTS;
const ITEMS = sandbox.__ITEMS;

console.log('=== 1. Zero Slayer entries remain ===');
const slayer = ACHIEVEMENTS.filter(a => a.category === 'Slayer');
console.log('Slayer entries remaining:', slayer.length, slayer.length === 0 ? 'PASS' : 'FAIL');

console.log('\n=== 2. Critical regression check: every REAL Slayer reward still granted ===');
const scan = JSON.parse(fs.readFileSync(path.join(__dirname, 'slayer-scan-output.json'), 'utf8'));
const realDefs = scan.realAchievementDefs;
// Build the set of distinct {field:value} reward pairs granted BEFORE changes
const REWARD_FIELDS = ['trinketId', 'familiarId', 'enemyId', 'pillColorId', 'itemId'];
const before = new Set();
for (const a of realDefs) {
  for (const f of REWARD_FIELDS) if (a[f] != null) before.add(f + ':' + a[f]);
}
console.log('Distinct real reward values before changes:', before.size);

const after = new Set();
for (const a of ACHIEVEMENTS) {
  for (const f of REWARD_FIELDS) if (a[f] != null) after.add(f + ':' + a[f]);
}
const missing = [...before].filter(v => !after.has(v));
console.log('Missing after changes:', missing.length, missing.length === 0 ? 'PASS' : 'FAIL');
if (missing.length) console.log(missing);

// also confirm each is granted by exactly one achievement (no dupes introduced)
const dupeCheck = {};
for (const a of ACHIEVEMENTS) {
  for (const f of REWARD_FIELDS) {
    if (a[f] == null) continue;
    const key = f + ':' + a[f];
    if (!before.has(key)) continue; // only care about migrated set
    dupeCheck[key] = (dupeCheck[key] || 0) + 1;
  }
}
const notExactlyOne = Object.entries(dupeCheck).filter(([k, v]) => v !== 1);
console.log('Migrated rewards NOT granted by exactly one achievement:', notExactlyOne.length, notExactlyOne.length === 0 ? 'PASS' : 'FAIL');
if (notExactlyOne.length) console.log(notExactlyOne.slice(0, 20));

console.log('\n=== 3. Zero trophy-patterned item ids remain in ITEMS ===');
const trophyIdSet = new Set(scan.trophyItemIds);
const stillPresent = [...trophyIdSet].filter(id => ITEMS[id]);
console.log('Trophy ids still present in ITEMS:', stillPresent.length, stillPresent.length === 0 ? 'PASS' : 'FAIL');
if (stillPresent.length) console.log(stillPresent);

console.log('\n=== 4. Zero references to deleted trophy ids in items-1.js/items-2.js (systems) ===');
let refHits = 0;
for (const f of ['js/systems/items-1.js', 'js/systems/items-2.js']) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const id of trophyIdSet) {
    if (src.includes(id)) { refHits++; console.log('  hit:', f, id); }
  }
}
console.log('Total dead-id references found:', refHits, refHits === 0 ? 'PASS' : 'FAIL');

console.log('\n=== 5. node --check on touched/new files ===');
const { execSync } = require('child_process');
const touched = [
  'index.html is not JS, skipped',
];
const jsFiles = [
  'js/achievements/defs-mastery.js',
  'js/achievements/logic.js',
  'js/achievements/core.js',
  'js/systems/items-1.js',
  ...Array.from({length:12}, (_,i)=>`js/achievements/defs-${i+1}.js`),
  ...Array.from({length:5}, (_,i)=>`js/data/items-${i+1}.js`),
];
let checkFail = false;
for (const f of jsFiles) {
  try {
    execSync(`node --check "${path.join(ROOT, f)}"`, { stdio: 'pipe' });
  } catch (e) {
    checkFail = true;
    console.log('  SYNTAX ERROR:', f);
    console.log(e.stdout.toString(), e.stderr.toString());
  }
}
console.log('node --check:', checkFail ? 'FAIL' : 'PASS (all files)');

console.log('\n=== 6. No duplicate achievement ids ===');
const idCounts = {};
for (const a of ACHIEVEMENTS) idCounts[a.id] = (idCounts[a.id] || 0) + 1;
const dupeIds = Object.entries(idCounts).filter(([k, v]) => v > 1);
console.log('Duplicate ids:', dupeIds.length, dupeIds.length === 0 ? 'PASS' : 'FAIL');
if (dupeIds.length) console.log(dupeIds.slice(0, 20));

console.log('\n=== 7. Final ACHIEVEMENTS.length ===');
console.log('Old total (pre-change, all categories):', scan.totalAchievements);
console.log('New total (post-change, all categories):', ACHIEVEMENTS.length);
console.log('Delta:', ACHIEVEMENTS.length - scan.totalAchievements);
console.log('Expected delta = -(trophyCount) since REAL entries migrated 1:1:', -scan.trophyCount);

console.log('\n=== Mastery category sanity ===');
const mastery = ACHIEVEMENTS.filter(a => a.category === 'Mastery');
console.log('Mastery entries:', mastery.length, mastery.length === realDefs.length ? 'PASS (matches migrated count)' : 'MISMATCH');
