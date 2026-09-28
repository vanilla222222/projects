// select-step5-targets.js — Mega Update A step 5, deliverable 2.
// Picks the 250 "generic -> redesigned" target items and writes
// feature-research/phase9-megaupdates/step5-target-items.md.
// Deterministic (no RNG); re-running reproduces the same list.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '../..');
const R = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const FILES = ['js/data/items-1.js','js/data/items-2.js','js/data/items-3.js','js/data/items-4.js','js/data/items-5.js'];
const ctx = vm.createContext({ console });
vm.runInContext(R('js/data/core.js') + FILES.map(R).join('\n') + R('js/data/lists.js'), ctx);
const ITEMS = vm.runInContext('ITEMS', ctx);

// which file each item id is declared in
const srcOf = {};
const texts = {};
for (const f of FILES) {
  const text = R(f); texts[f] = text;
  const re = /^\s{2}([A-Za-z0-9_]+):\s*\{/gm;
  let m; while ((m = re.exec(text))) if (ITEMS[m[1]] && !srcOf[m[1]]) srcOf[m[1]] = f;
}

// the 19 legacy-synergy items (SYNERGY_COMBOS memberships, systems/items-synergy.js)
const LEGACY = new Set(['huntersmark','quarrysigil','wardenseye','branderstag','snareglyph',
  'plaguebud','witherpetal','bloomrot','plaguebloom','rotcrown',
  'cometshard','stormcaller','skyrend','meteorcrest','celestialfall','fangguard','quiverstring',
  'ecosystemtotem','predatorseye']);

// items whose recalcPlayerStats arithmetic already carries a negative term,
// or whose desc already states a drawback => not "pure upside".
const SYS = R('js/systems/items-1.js') + R('js/systems/items-2.js');
function hasNegative(it){
  const d = it.desc || '';
  if (/(^|\s)[-−]\s?\d/.test(d)) return true;
  if (/\b(but|lose|lost|cannot|can't|instead of|at the cost|in exchange|halve[ds]?|reduced|slower|weaker|drawback|sacrific)/i.test(d)) return true;
  const re = new RegExp('[-−]\\s*[0-9.]*\\s*\\*?\\s*\\(p\\.' + it.id + '\\b');
  if (re.test(SYS)) return true;
  return false;
}

const eligible = {};
for (const f of FILES) eligible[f] = [];
for (const id in ITEMS) {
  const it = ITEMS[id];
  if (!srcOf[id]) continue;
  if (it.attackLayer) continue;      // already transformative
  if (LEGACY.has(id)) continue;      // already in a legacy synergy
  // NOTE (documented deviation from the dispatch): `locked`/`unlockedBy` is
  // NOT a disqualifier. 620 of the 864 items carry locked:true — it is the
  // norm rather than a mark of "already special", and items-4.js is 100%
  // locked, so excluding them would leave only 204 eligible items overall and
  // zero from items-4.js, making the 65/40/40/105 quota impossible. Locked
  // items are ordinary flat-stat items that simply need an unlock first.
  eligible[srcOf[id]].push(it);
}

const QUOTA = { 'js/data/items-1.js': 65, 'js/data/items-2.js': 40, 'js/data/items-4.js': 40, 'js/data/items-5.js': 105 };

// ---- stratified pick: match each file's own quality-tier proportions -------
const picked = [];
for (const f in QUOTA) {
  const pool = eligible[f];
  const byQ = { 1: [], 2: [], 3: [], 4: [] };
  for (const it of pool) byQ[it.quality || 1].push(it);
  const want = {};
  let assigned = 0;
  for (const q of [1,2,3,4]) { want[q] = Math.min(byQ[q].length, Math.floor(QUOTA[f] * byQ[q].length / pool.length)); assigned += want[q]; }
  // hand out the rounding remainder to the tiers with the most headroom
  while (assigned < QUOTA[f]) {
    let best = null, bestSlack = 0;
    for (const q of [1,2,3,4]) { const slack = byQ[q].length - want[q]; if (slack > bestSlack) { bestSlack = slack; best = q; } }
    if (best === null) break;
    want[best]++; assigned++;
  }
  for (const q of [1,2,3,4]) {
    // spread across pools: round-robin the tier's items by their pool signature
    const groups = {};
    for (const it of byQ[q]) { const k = (it.pools || []).join(','); (groups[k] || (groups[k] = [])).push(it); }
    const keys = Object.keys(groups).sort();
    const out = [];
    for (let i = 0; out.length < want[q]; i++) {
      let progressed = false;
      for (const k of keys) if (groups[k][i]) { out.push(groups[k][i]); progressed = true; if (out.length === want[q]) break; }
      if (!progressed) break;
    }
    for (const it of out) picked.push(it);
  }
}
if (picked.length !== 250) throw new Error('picked ' + picked.length + ', expected 250');

// The proportional pick mirrors the corpus, which is heavily quality-1, so it
// yields fewer quality-3/4 pure-upside items than the 35 "tradeoff" slots need.
// Top up by swapping the tail quality-1 picks for unpicked quality-4/3
// pure-upside items from the SAME file (keeps the per-file quota exact and the
// tier mix still close to each file's own proportions).
const pickedIds = new Set(picked.map(i => i.id));
function pureHigh(f){ return eligible[f].filter(i => i.quality >= 3 && !pickedIds.has(i.id) && !hasNegative(i)).sort((a, b) => (b.quality - a.quality) || a.id.localeCompare(b.id)); }
function tradeoffCount(){ return picked.filter(i => i.quality >= 3 && !hasNegative(i)).length; }
for (const f of ['js/data/items-5.js','js/data/items-1.js','js/data/items-4.js','js/data/items-2.js']) {
  const spare = pureHigh(f);
  while (tradeoffCount() < 36 && spare.length) {
    const idx = picked.map((it, i) => ({ it, i })).filter(x => srcOf[x.it.id] === f && x.it.quality === 1).pop();
    if (!idx) break;
    const add = spare.shift();
    pickedIds.delete(idx.it.id); pickedIds.add(add.id);
    picked[idx.i] = add;
  }
}

// ---- role assignment ------------------------------------------------------
// tradeoff: 35 quality 3-4 items that are pure upside today
const roles = {};
const tradeoffCands = picked.filter(it => (it.quality >= 3) && !hasNegative(it));
// spread the 35 across the four source files proportionally to the quota
const tShare = { 'js/data/items-1.js': 9, 'js/data/items-2.js': 6, 'js/data/items-4.js': 6, 'js/data/items-5.js': 14 };
let tradeoffs = 0;
for (const f in tShare) {
  let n = 0;
  for (const it of tradeoffCands) { if (srcOf[it.id] !== f || roles[it.id]) continue; roles[it.id] = 'tradeoff'; n++; tradeoffs++; if (n === tShare[f]) break; }
}
for (const it of tradeoffCands) { if (tradeoffs >= 35) break; if (roles[it.id]) continue; roles[it.id] = 'tradeoff'; tradeoffs++; }

// combo: 55 items, themed into 13 groups by the mechanic their desc mentions
const THEMES = [
  ['crit',        /\bcrit/i],
  ['venom',       /\bvenom|\bpoison/i],
  ['freeze',      /\bfreeze|\bfrost|\bfrozen/i],
  ['stun',        /\bstun/i],
  ['charm-fear',  /\bcharm|\bfear/i],
  ['luck',        /\bluck/i],
  ['speed',       /\bspeed|\bmovement/i],
  ['hearts',      /heart|\bheal|\blifesteal/i],
  ['bombs',       /\bbomb|\bblast|\bexplo/i],
  ['economy',     /\bcoin|\bshop|\bprice|\bdeal|\bkey/i],
  ['range',       /\brange|\btile|\bpierc|\bhoming|\bbolt/i],
  ['firerate',    /fire rate|attack speed|cooldown|\bswing/i],
  ['boss',        /\bboss|\bcurse|\bdodge|\barmor|\bshield/i]
];
function themeOf(it){
  for (const [name, re] of THEMES) if (re.test(it.desc || '')) return name;
  return 'misc';
}
const comboBuckets = {};
for (const it of picked) {
  if (roles[it.id]) continue;
  const th = themeOf(it);
  if (th === 'misc') continue;
  (comboBuckets[th] || (comboBuckets[th] = [])).push(it);
}
const groupHint = {};
let combos = 0;
const themeNames = THEMES.map(t => t[0]).filter(t => comboBuckets[t]);
// ~4-5 items per new SYNERGY_COMBOS entry, 13 groups -> 55 items
const perTheme = {};
for (const t of themeNames) perTheme[t] = 4;
for (let i = 0; i < 55 - themeNames.length * 4 && i < themeNames.length; i++) perTheme[themeNames[i]]++;
for (const t of themeNames) {
  let n = 0;
  for (const it of comboBuckets[t]) {
    if (combos >= 55 || n >= perTheme[t]) break;
    roles[it.id] = 'combo'; groupHint[it.id] = 'combo-group: ' + t + '-1'; n++; combos++;
  }
}
for (const t of themeNames) { // top up if a theme ran dry
  for (const it of comboBuckets[t]) { if (combos >= 55) break; if (roles[it.id]) continue; roles[it.id] = 'combo'; groupHint[it.id] = 'combo-group: ' + t + '-2'; combos++; }
}
// everything else: classSynergy
let cs = 0;
for (const it of picked) if (!roles[it.id]) { roles[it.id] = 'classSynergy'; cs++; }

// ---- write the markdown ---------------------------------------------------
const order = ['js/data/items-1.js','js/data/items-2.js','js/data/items-4.js','js/data/items-5.js'];
const esc = s => String(s || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
let md = `# Mega Update A — step 5: the 250 target items\n\n`;
md += `Generated by \`feature-research/phase9-megaupdates/select-step5-targets.js\` (deterministic; re-run to reproduce).\n\n`;
md += `**This file is the scope contract for the step-5 slice implementers.** Only the items listed below may be redesigned in this effort. Do not add \`classSynergy\`/combo membership/tradeoff downsides to any item that is not in this table, and do not change an item's assigned role.\n\n`;
md += `Selection rule: no existing \`attackLayer\` (those items are already transformative), not one of the 19 legacy-synergy items, stratified to each file's own quality-tier proportions and round-robined across pool signatures, then topped up with quality-3/4 pure-upside items so the 35 tradeoff slots can be filled.\n\n`;
md += `\`locked\`/\`unlockedBy\` items ARE in scope (deviation from the original dispatch, see the step-5 audit): 620 of the 864 items are \`locked:true\` and items-4.js is 100% locked, so excluding them would leave only 204 eligible items and none from items-4.js.\n\n`;
md += `Roles: **classSynergy** = gets a \`classSynergy\` map (per-class unique effect); **combo** = becomes a member of a new \`SYNERGY_COMBOS\` entry (see the \`combo group hint\` column for the tentative grouping); **tradeoff** = quality 3/4, currently pure upside, gets a Soy-Milk-style built-in drawback.\n\n`;
const counts = { classSynergy: 0, combo: 0, tradeoff: 0 };
for (const it of picked) counts[roles[it.id]]++;
md += `Totals: ${picked.length} items — classSynergy ${counts.classSynergy}, combo ${counts.combo}, tradeoff ${counts.tradeoff}.\n`;
md += `Per file: ` + order.map(f => `${f.replace('js/data/','')} ${picked.filter(i => srcOf[i.id] === f).length}`).join(', ') + `.\n\n`;

for (const f of order) {
  const rows = picked.filter(i => srcOf[i.id] === f).sort((a, b) => (a.quality - b.quality) || a.id.localeCompare(b.id));
  const qc = [1,2,3,4].map(q => `q${q}:${rows.filter(r => r.quality === q).length}`).join(' ');
  md += `## ${f} — ${rows.length} items (${qc})\n\n`;
  md += `| itemId | source file | quality | current desc (verbatim) | assigned redesign role | combo group hint |\n`;
  md += `| --- | --- | --- | --- | --- | --- |\n`;
  for (const it of rows) md += `| ${it.id} | ${f.replace('js/data/','')} | ${it.quality} | ${esc(it.desc)} | ${roles[it.id]} | ${groupHint[it.id] || ''} |\n`;
  md += `\n`;
}
fs.writeFileSync(path.join(ROOT, 'feature-research/phase9-megaupdates/step5-target-items.md'), md);
console.log('picked', picked.length, JSON.stringify(counts));
for (const f of order) console.log(' ', f, picked.filter(i => srcOf[i.id] === f).length,
  [1,2,3,4].map(q => 'q' + q + ':' + picked.filter(i => srcOf[i.id] === f && i.quality === q).length).join(' '),
  '| pools sigs:', new Set(picked.filter(i => srcOf[i.id] === f).map(i => (i.pools || []).join(','))).size);
console.log('combo groups:', [...new Set(Object.values(groupHint))].join(', '));
