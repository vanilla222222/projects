#!/usr/bin/env node
'use strict';
/* ============================================================
   audit-balance-extract.js — Phase 9 balance-audit outlier scan.

   Regex/statement-level extraction (NOT a full JS parser) of stat
   coefficients from:
     - js/systems/items-1.js / items-2.js  (recalcPlayerStats formulas)
     - js/achievements/skilltree-characters-2.js (hand-authored 'stat' nodes)
     - js/achievements/skilltree-characters.js (generated 'stat' nodes — for
       count/sanity only, not flagged: these come from one shared AMOUNT
       table so they're uniform by construction)

   Also loads js/data/items-1..5.js and trinkets-1..2.js (regex-based, not
   vm-eval, to avoid needing the full POOLS_* / dependency graph) to get
   id -> quality (items) and id -> exists (trinkets), and id -> desc text.

   Usage: node audit-balance-extract.js [--repo <path>]
   Prints a full report to stdout. Also writes JSON summaries to
   /tmp for the fix-review step to consume (paths printed at the end).
   ============================================================ */

const fs = require('fs');
const path = require('path');

const argIdx = process.argv.indexOf('--repo');
const REPO = argIdx !== -1 ? process.argv[argIdx + 1] : process.cwd();

function read(p) { return fs.readFileSync(path.join(REPO, p), 'utf8'); }

// ---------------------------------------------------------------
// 1. Load item/trinket id -> {quality, desc, name} via regex over data files
// ---------------------------------------------------------------
function extractDefs(files, hasQuality) {
  const out = {};
  for (const f of files) {
    const src = read(f);
    // Match `id: { id:'id', ... quality:N ..., desc:'...' }` blocks.
    // Entries are single-object-literal-per-line-group; find each top-level
    // `key:   { id:'key', ... }` and capture up to the matching closing `}`
    // at brace-depth 0 relative to the entry's own `{`.
    const re = /^\s*([a-zA-Z0-9_]+):\s*\{\s*id:'\1'/gm;
    let m;
    while ((m = re.exec(src))) {
      const id = m[1];
      const start = m.index + m[0].indexOf('{'); // position of the opening '{'
      let depth = 0, i = start, end = -1;
      for (; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
      }
      if (end === -1) continue;
      const block = src.slice(start, end + 1);
      const qMatch = hasQuality ? block.match(/quality:\s*(\d+)/) : null;
      const dMatch = block.match(/desc:\s*'((?:[^'\\]|\\.)*)'/);
      const nMatch = block.match(/name:\s*'((?:[^'\\]|\\.)*)'|name:\s*"((?:[^"\\]|\\.)*)"/);
      out[id] = {
        id,
        quality: qMatch ? Number(qMatch[1]) : null,
        desc: dMatch ? dMatch[1] : null,
        name: nMatch ? (nMatch[1] || nMatch[2]) : null,
        file: f,
      };
    }
  }
  return out;
}

const ITEM_FILES = ['js/data/items-1.js', 'js/data/items-2.js', 'js/data/items-3.js', 'js/data/items-4.js', 'js/data/items-5.js'];
const TRINKET_FILES = ['js/data/trinkets-1.js', 'js/data/trinkets-2.js'];

const ITEMS = extractDefs(ITEM_FILES, true);
const TRINKETS = extractDefs(TRINKET_FILES, false);

console.log(`Loaded ${Object.keys(ITEMS).length} ITEMS defs, ${Object.keys(TRINKETS).length} TRINKETS defs.\n`);

// ---------------------------------------------------------------
// 2. Split systems/items-1.js + items-2.js into top-level
//    `player.X = <expr>;` / `player.X += <expr>;` statements, tracking
//    paren depth so multi-line expressions are captured whole.
// ---------------------------------------------------------------
const SYSTEM_FILES = ['js/systems/items-1.js', 'js/systems/items-2.js'];

function splitStatements(src) {
  const stmts = [];
  const re = /player\.([a-zA-Z0-9_]+)\s*(=|\+=)(?!=)/g;
  let m;
  while ((m = re.exec(src))) {
    const stat = m[1];
    // skip assignments that are just booleans/flags we know aren't numeric
    // stat channels (still record generically; filtered later by content)
    const exprStart = m.index + m[0].length;
    let depth = 0, i = exprStart, end = -1;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') depth--;
      else if (c === ';' && depth <= 0) { end = i; break; }
    }
    if (end === -1) continue;
    const exprText = src.slice(exprStart, end);
    // location for line-number reporting
    const line = src.slice(0, m.index).split('\n').length;
    stmts.push({ stat, exprText, line });
    re.lastIndex = end;
  }
  return stmts;
}

let allStatements = [];
for (const f of SYSTEM_FILES) {
  const src = read(f);
  const stmts = splitStatements(src).map(s => Object.assign(s, { file: f }));
  allStatements = allStatements.concat(stmts);
}

console.log(`Found ${allStatements.length} player.X = / += statements across ${SYSTEM_FILES.join(', ')}.\n`);

// ---------------------------------------------------------------
// 3. Within each statement's expression text, extract every coefficient
//    term referencing a known ITEMS id or TRINKETS id.
// ---------------------------------------------------------------

const itemCoeffs = []; // {id, stat, coeff, raw, file, line}
const trinketCoeffs = []; // {id, stat, coeff, raw, file, line, tradeoffOther}
const unanalyzable = []; // {id, kind, reason, sampleText}

const itemIdSet = new Set(Object.keys(ITEMS));
const trinketIdSet = new Set(Object.keys(TRINKETS));

// Track which ids we found ANY reference to (for cross-check with "not
// auto-analyzable" reporting: an id mentioned in the formula file whose
// shape didn't match any of our regexes).
const itemIdsSeenRaw = new Set();
const trinketIdsSeenRaw = new Set();

for (const stmt of allStatements) {
  const { stat, exprText, file, line } = stmt;

  // --- raw-reference detection (for unanalyzable bookkeeping) ---
  for (const mm of exprText.matchAll(/p\.([a-zA-Z0-9_]+)/g)) itemIdsSeenRaw.add(mm[1]);
  for (const mm of exprText.matchAll(/t\s*===\s*'([a-zA-Z0-9_]+)'/g)) trinketIdsSeenRaw.add(mm[1]);

  // Pattern A: [sign] N * (p.ID || 0)   — explicit coefficient
  for (const mm of exprText.matchAll(/([+\-]?)\s*([0-9]+(?:\.[0-9]+)?)\s*\*\s*\(p\.([a-zA-Z0-9_]+)\s*\|\|\s*0\)/g)) {
    const [, sign, numStr, id] = mm;
    if (!itemIdSet.has(id)) continue;
    let coeff = Number(numStr);
    if (sign === '-') coeff = -coeff;
    itemCoeffs.push({ id, stat, coeff, raw: mm[0].trim(), file, line });
  }

  // Pattern B: [sign] (p.ID || 0)  with NO following '*'  — implicit coeff 1
  for (const mm of exprText.matchAll(/([+\-])\s*\(p\.([a-zA-Z0-9_]+)\s*\|\|\s*0\)(?!\s*\*)/g)) {
    const [, sign, id] = mm;
    if (!itemIdSet.has(id)) continue;
    // avoid double counting terms already matched by pattern A (those are
    // preceded by `N *`, so check the char immediately before this match
    // isn't part of a `* (` we already consumed — pattern A's match
    // includes the sign+number+*, so overlap only happens if pattern A's
    // regex matched starting earlier at the same '(' — filter by checking
    // the substring right before the match for a trailing '*'.
    const before = exprText.slice(0, mm.index);
    if (/\*\s*$/.test(before)) continue;
    let coeff = sign === '-' ? -1 : 1;
    itemCoeffs.push({ id, stat, coeff, raw: mm[0].trim(), file, line });
  }

  // Pattern C: (p.ID ? A : B)  boolean-gated ternary (A the "on" value)
  for (const mm of exprText.matchAll(/\(p\.([a-zA-Z0-9_]+)\s*\?\s*(-?[0-9]+(?:\.[0-9]+)?)\s*:\s*(-?[0-9]+(?:\.[0-9]+)?)\)/g)) {
    const [, id, aStr, bStr] = mm;
    if (!itemIdSet.has(id)) continue;
    const a = Number(aStr), b = Number(bStr);
    if (b === 0) {
      itemCoeffs.push({ id, stat, coeff: a, raw: mm[0].trim(), file, line });
    } else {
      // two-sided — both branches nonzero; not a simple "gated bonus", note
      // as unanalyzable-but-recorded (trade-off shape, skip auto-flagging).
      unanalyzable.push({ id, kind: 'item', reason: 'two-sided boolean ternary (both branches nonzero)', sampleText: mm[0].trim(), file, line, stat });
    }
  }

  // Pattern D: [sign] (t === 'ID' ? N : 0)  — trinket single-sided
  for (const mm of exprText.matchAll(/([+\-])\s*\(t\s*===\s*'([a-zA-Z0-9_]+)'\s*\?\s*(-?[0-9]+(?:\.[0-9]+)?)\s*:\s*0\)/g)) {
    const [, sign, id, numStr] = mm;
    if (!trinketIdSet.has(id)) continue;
    let coeff = Number(numStr);
    if (sign === '-') coeff = -coeff;
    trinketCoeffs.push({ id, stat, coeff, raw: mm[0].trim(), file, line });
  }

  // Pattern E: (t === 'ID' ? A : B) two-sided trinket trade-off (B != 0)
  for (const mm of exprText.matchAll(/\(t\s*===\s*'([a-zA-Z0-9_]+)'\s*\?\s*(-?[0-9]+(?:\.[0-9]+)?)\s*:\s*(-?[0-9]+(?:\.[0-9]+)?)\)/g)) {
    const [, id, aStr, bStr] = mm;
    if (!trinketIdSet.has(id)) continue;
    const b = Number(bStr);
    if (b !== 0) {
      unanalyzable.push({ id, kind: 'trinket', reason: 'two-sided trinket ternary trade-off (both branches nonzero)', sampleText: mm[0].trim(), file, line, stat });
    }
    // if b === 0 it was already captured by pattern D above (same regex
    // shape minus the ": 0" literal) — no double counting since D requires
    // literal "0" and this alt only fires here when b != 0.
  }
}

// Ids referenced in formulas but never captured by any pattern above -> unanalyzable
for (const id of itemIdsSeenRaw) {
  if (!itemIdSet.has(id)) continue; // not an ITEMS id (local var etc.)
  const captured = itemCoeffs.some(c => c.id === id) || unanalyzable.some(u => u.id === id && u.kind === 'item');
  if (!captured) unanalyzable.push({ id, kind: 'item', reason: 'referenced but shape not matched by any pattern (e.g. attackLayer-routed, or nonstandard expression)', sampleText: '(see manual grep)', file: '-', line: '-' });
}
for (const id of trinketIdsSeenRaw) {
  if (!trinketIdSet.has(id)) continue;
  const captured = trinketCoeffs.some(c => c.id === id) || unanalyzable.some(u => u.id === id && u.kind === 'trinket');
  if (!captured) unanalyzable.push({ id, kind: 'trinket', reason: 'referenced but shape not matched by any pattern', sampleText: '(see manual grep)', file: '-', line: '-' });
}

console.log(`Extracted ${itemCoeffs.length} item coefficient terms, ${trinketCoeffs.length} trinket coefficient terms.`);
console.log(`Unanalyzable / non-standard-shape references: ${unanalyzable.length}\n`);

// ---------------------------------------------------------------
// 4. Group + flag outliers
// ---------------------------------------------------------------
function mean(a) { return a.reduce((s, x) => s + x, 0) / a.length; }
function stdev(a, m) { return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / a.length); }

function analyzeGroups(entries, keyFn, minN) {
  const groups = new Map();
  for (const e of entries) {
    const k = keyFn(e);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  }
  const flagged = [];
  const groupReport = [];
  for (const [k, list] of groups) {
    if (list.length < minN) continue;
    const vals = list.map(e => e.coeff);
    const m = mean(vals);
    const sd = stdev(vals, m);
    groupReport.push({ key: k, n: list.length, mean: m, stdev: sd, entries: list });
    if (sd === 0) continue; // no variance, nothing to flag
    for (const e of list) {
      const dev = Math.abs(e.coeff - m);
      const absOk = Math.abs(e.coeff) >= 2 * Math.abs(m);
      const sdOk = m !== 0 ? dev > 2.5 * sd : Math.abs(e.coeff) > 2.5 * sd;
      if (sdOk && absOk) {
        const sign = e.coeff < 0 ? -1 : 1;
        const suggested = sign * Math.abs(m) * 1.5;
        flagged.push(Object.assign({}, e, { groupKey: k, groupMean: m, groupStdev: sd, groupN: list.length, suggested }));
      }
    }
  }
  return { flagged, groupReport };
}

const itemGroups = analyzeGroups(itemCoeffs, e => `q${ITEMS[e.id] && ITEMS[e.id].quality}|${e.stat}`, 4);
const trinketGroups = analyzeGroups(trinketCoeffs, e => e.stat, 4);

// --- skill tree stat nodes (hand-authored, skilltree-characters-2.js) ---
// Shape in this file: SKILL_TREE_CHARACTER_CONFIG_2 = [ { classId:'x',
// nodes:{ c1:{ name:'...', desc:'...', effects:[{type:'stat',...}] },
// c2a:{...}, ... } }, ... ]; node ids are synthesized later as
// 'char_'+classId+'_'+key (see buildCharacterSkillNodes2 at file end) — we
// reproduce that id here so Step-3 fixes can locate nodes by id.
function braceMatch(src, openIdx) {
  let depth = 0, i = openIdx, end = -1;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  return end;
}

const skSrc = read('js/achievements/skilltree-characters-2.js');
const skEntries = [];
const classBlockRe = /classId:\s*'([a-zA-Z0-9_]+)',\s*nodes:\s*\{/g;
let cbm;
while ((cbm = classBlockRe.exec(skSrc))) {
  const classId = cbm[1];
  const nodesOpen = cbm.index + cbm[0].length - 1; // the '{' of nodes:{
  const nodesEnd = braceMatch(skSrc, nodesOpen);
  if (nodesEnd === -1) continue;
  const nodesBlockStart = nodesOpen + 1;
  const nodesBlock = skSrc.slice(nodesBlockStart, nodesEnd);
  const keyRe = /(?:^|[,\s])([a-zA-Z0-9_]+):\{\s*name:/g;
  let km;
  while ((km = keyRe.exec(nodesBlock))) {
    const key = km[1];
    const openIdx = km.index + km[0].indexOf('{');
    const end = braceMatch(nodesBlock, openIdx);
    if (end === -1) continue;
    const block = nodesBlock.slice(openIdx, end + 1);
    const dMatch = block.match(/desc:\s*'((?:[^'\\]|\\.)*)'/);
    const nodeId = 'char_' + classId + '_' + key;
    const absOffset = nodesBlockStart + openIdx;
    const line = skSrc.slice(0, absOffset).split('\n').length;
    for (const em of block.matchAll(/\{\s*type:\s*'stat',\s*classId:\s*'([a-zA-Z0-9_]+)',\s*stat:\s*'([a-zA-Z0-9_]+)',\s*amount:\s*(-?[0-9]+(?:\.[0-9]+)?)\s*\}/g)) {
      const [, effClassId, stat, amountStr] = em;
      skEntries.push({ id: nodeId, classId: effClassId, stat, coeff: Number(amountStr), desc: dMatch ? dMatch[1] : null, line, key });
    }
    keyRe.lastIndex = openIdx + (end - openIdx); // resume after this block
  }
  classBlockRe.lastIndex = nodesEnd;
}

console.log(`Skill-tree hand-authored 'stat' effects found: ${skEntries.length} (skilltree-characters-2.js)\n`);

const skillGroups = analyzeGroups(skEntries, e => e.stat, 4);

// ---------------------------------------------------------------
// 5. Report
// ---------------------------------------------------------------
function printFlagged(title, flagged, idLookup) {
  console.log(`\n=== ${title}: ${flagged.length} flagged ===`);
  for (const f of flagged) {
    const label = idLookup ? idLookup(f) : f.id;
    console.log(`  [${f.groupKey}] id=${f.id}${label ? ' (' + label + ')' : ''} stat=${f.stat} coeff=${f.coeff} | group n=${f.groupN} mean=${f.groupMean.toFixed(4)} stdev=${f.groupStdev.toFixed(4)} | suggested=${f.suggested.toFixed(4)} | ${f.file}:${f.line} | raw: ${f.raw || ''}`);
  }
}

printFlagged('ITEM outliers', itemGroups.flagged, f => (ITEMS[f.id] && ITEMS[f.id].name) || '');
printFlagged('TRINKET outliers', trinketGroups.flagged, f => (TRINKETS[f.id] && TRINKETS[f.id].name) || '');
printFlagged('SKILL-TREE stat-node outliers', skillGroups.flagged, f => f.classId);

console.log(`\n=== Unanalyzable references (${unanalyzable.length}) ===`);
for (const u of unanalyzable) {
  console.log(`  [${u.kind}] id=${u.id} @ ${u.file}:${u.line} stat=${u.stat || '-'} — ${u.reason} :: ${u.sampleText}`);
}

console.log(`\n=== Group summary (items) — ${itemGroups.groupReport.length} groups with n>=4 ===`);
for (const g of itemGroups.groupReport.sort((a,b)=>a.key.localeCompare(b.key))) {
  console.log(`  ${g.key}: n=${g.n} mean=${g.mean.toFixed(4)} stdev=${g.stdev.toFixed(4)} vals=[${g.entries.map(e=>e.coeff).join(', ')}]`);
}
console.log(`\n=== Group summary (trinkets) — ${trinketGroups.groupReport.length} groups with n>=4 ===`);
for (const g of trinketGroups.groupReport.sort((a,b)=>a.key.localeCompare(b.key))) {
  console.log(`  ${g.key}: n=${g.n} mean=${g.mean.toFixed(4)} stdev=${g.stdev.toFixed(4)} vals=[${g.entries.map(e=>e.coeff).join(', ')}]`);
}
console.log(`\n=== Group summary (skill tree stat nodes) — ${skillGroups.groupReport.length} groups with n>=4 ===`);
for (const g of skillGroups.groupReport.sort((a,b)=>a.key.localeCompare(b.key))) {
  console.log(`  ${g.key}: n=${g.n} mean=${g.mean.toFixed(4)} stdev=${g.stdev.toFixed(4)} vals=[${g.entries.map(e=>e.coeff).join(', ')}]`);
}

// dump machine-readable copies for follow-up tooling
const outDir = path.join(REPO, 'feature-research', 'phase9-megaupdates');
fs.writeFileSync(path.join(outDir, 'audit-balance-flagged.json'), JSON.stringify({
  itemFlagged: itemGroups.flagged, trinketFlagged: trinketGroups.flagged, skillFlagged: skillGroups.flagged,
  unanalyzable,
  counts: { items: Object.keys(ITEMS).length, trinkets: Object.keys(TRINKETS).length, skillStatEffects: skEntries.length },
}, null, 2));

console.log(`\nWrote machine-readable flags to feature-research/phase9-megaupdates/audit-balance-flagged.json`);
console.log(`\nCounts: ITEMS=${Object.keys(ITEMS).length} TRINKETS=${Object.keys(TRINKETS).length} skill-stat-effects=${skEntries.length}`);
