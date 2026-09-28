'use strict';
// Step 1 classification scan — loads the REAL game files via vm, exactly
// as the browser would (in index.html script order) through defs-12.js,
// then classifies every category:'Slayer' achievement post tier-expansion.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const files = fs.readFileSync('/tmp/scriptlist.txt', 'utf8')
  .split('\n').map(s => s.trim()).filter(Boolean).slice(0, 40); // through defs-12.js

const sandbox = {
  console,
  window: {},
  document: { getElementById: () => null, createElement: () => ({ style: {}, classList: { add(){}, remove(){} } }) },
  localStorage: { getItem: () => null, setItem: () => {} },
  Math, JSON, Object, Array, Date,
};
sandbox.window = sandbox;
vm.createContext(sandbox);

for (const f of files) {
  const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
  try {
    vm.runInContext(code, sandbox, { filename: f });
  } catch (e) {
    console.error('FAILED loading', f, e.message);
    process.exit(1);
  }
}

// top-level `const`/`let` in vm-executed scripts don't become properties of
// the sandbox object (only `var`/function decls do) — pull them out
// explicitly via one more runInContext call in the same persistent context.
vm.runInContext('this.__ACHIEVEMENTS = ACHIEVEMENTS; this.__ITEMS = ITEMS;', sandbox);
const ACHIEVEMENTS = sandbox.__ACHIEVEMENTS;
const ITEMS = sandbox.__ITEMS;
console.log('Total ACHIEVEMENTS (all categories) post tier-expansion:', ACHIEVEMENTS.length);

const slayer = ACHIEVEMENTS.filter(a => a.category === 'Slayer');
console.log('Total Slayer achievements (post tier-expansion):', slayer.length);

// Sample item ids referenced by Slayer itemId rewards, to confirm trophy
// naming patterns before trusting them.
const itemIdRewards = slayer.filter(a => a.itemId).map(a => a.itemId);
const uniqueItemIds = [...new Set(itemIdRewards)];
console.log('\nDistinct itemId values granted by Slayer achievements:', uniqueItemIds.length);

const TROPHY_PATTERNS = [
  /^slayertrophy_/, /^hcfwtrophy_/, /^mgtrophy_/, /^obstrophy_slayer_/,
  /^ortrophy_slayer_/, /^vbtrophy2_slayer_/, /^vbtrophy_slayer_/,
];
function isTrophyId(id) { return TROPHY_PATTERNS.some(re => re.test(id)); }

const nonTrophyItemIds = uniqueItemIds.filter(id => !isTrophyId(id));
console.log('itemId values NOT matching trophy patterns (need inspection):', nonTrophyItemIds.length);
for (const id of nonTrophyItemIds) {
  const it = ITEMS[id];
  console.log('  ', id, '->', it ? (it.type + ' "' + it.name + '"') : '(NOT FOUND IN ITEMS!)');
}

// Full classification
const classified = slayer.map(a => {
  let kind, rewardField, rewardValue, trophy = false;
  if (a.itemId) {
    rewardField = 'itemId'; rewardValue = a.itemId;
    trophy = isTrophyId(a.itemId);
    kind = trophy ? 'TROPHY' : 'REAL';
  } else if (a.trinketId) {
    rewardField = 'trinketId'; rewardValue = a.trinketId; kind = 'REAL';
  } else if (a.familiarId) {
    rewardField = 'familiarId'; rewardValue = a.familiarId; kind = 'REAL';
  } else if (a.pillColorId) {
    rewardField = 'pillColorId'; rewardValue = a.pillColorId; kind = 'REAL';
  } else if (a.enemyId) {
    rewardField = 'enemyId'; rewardValue = a.enemyId; kind = 'REAL';
  } else if (a.starId) {
    rewardField = 'starId'; rewardValue = a.starId; kind = 'REAL';
  } else if (a.pickupKind) {
    rewardField = 'pickupKind'; rewardValue = a.pickupKind; kind = 'REAL';
  } else if (a.classId) {
    rewardField = 'classId'; rewardValue = a.classId; kind = 'REAL';
  } else if (a.shopDiscount) {
    rewardField = 'shopDiscount'; rewardValue = a.shopDiscount; kind = 'REAL';
  } else {
    rewardField = 'NONE'; rewardValue = null; kind = 'UNKNOWN(no reward field!)';
  }
  return { id: a.id, kind, rewardField, rewardValue };
});

const trophyCount = classified.filter(c => c.kind === 'TROPHY').length;
const realCount = classified.filter(c => c.kind === 'REAL').length;
const unknownCount = classified.filter(c => c.kind.startsWith('UNKNOWN')).length;

console.log('\n=== FINAL CLASSIFICATION ===');
console.log('Total Slayer achievements:', slayer.length);
console.log('TROPHY (delete, no migration):', trophyCount);
console.log('REAL (migrate to Mastery):', realCount);
console.log('UNKNOWN (needs manual look):', unknownCount);

const byField = {};
for (const c of classified) if (c.kind === 'REAL') byField[c.rewardField] = (byField[c.rewardField] || 0) + 1;
console.log('\nREAL breakdown by reward field:');
for (const [k, v] of Object.entries(byField)) console.log('  ', k, ':', v);

if (unknownCount) {
  console.log('\nUNKNOWN entries (dump):');
  for (const c of classified) if (c.kind.startsWith('UNKNOWN')) console.log('  ', JSON.stringify(c), JSON.stringify(slayer.find(a=>a.id===c.id)));
}

// Dump full classification + full achievement defs for REAL ones to a JSON
// file, for use by the migration script and the regression check later.
const realDefs = slayer.filter((a, i) => classified[i].kind === 'REAL');
const trophyIds = [...new Set(classified.filter(c => c.kind === 'TROPHY').map(c => c.rewardValue))];

fs.writeFileSync(path.join(__dirname, 'slayer-scan-output.json'), JSON.stringify({
  totalAchievements: ACHIEVEMENTS.length,
  totalSlayer: slayer.length,
  trophyCount, realCount, unknownCount,
  byField,
  trophyItemIds: trophyIds,
  realAchievementDefs: realDefs,
  allSlayerIds: slayer.map(a => a.id),
}, null, 2));
console.log('\nWrote feature-research/phase9-megaupdates/slayer-scan-output.json');
console.log('Distinct trophy item ids referenced:', trophyIds.length);
