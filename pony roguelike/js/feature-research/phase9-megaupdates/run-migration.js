'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = '/home/vanilla/Downloads/adele2';
const { splitCalls } = require('./split-statements.js');
const { splitProps } = require('./split-props.js');

const scan = JSON.parse(fs.readFileSync(path.join(__dirname, 'slayer-scan-output.json'), 'utf8'));
const trophyIdSet = new Set(scan.trophyItemIds);
const realDefs = scan.realAchievementDefs;

// ---------------------------------------------------------------
// Step A: build defs-mastery.js from realDefs
// ---------------------------------------------------------------
const ICON_MAP = { '💀': '🎖️', '👹': '🔬', '👑': '🏵️' };
function jsStr(s) { return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; }

const masteryLines = [];
masteryLines.push("'use strict';");
masteryLines.push('// achievements/defs-mastery.js — the \'Mastery\' category. Every REAL-reward');
masteryLines.push('// achievement migrated out of the deleted \'Slayer\' category lands here,');
masteryLines.push('// unchanged in trigger (same bestiarySection/bestiaryId/threshold) and reward');
masteryLines.push('// (same itemId/trinketId/familiarId/enemyId/pillColorId), so no unlock became');
masteryLines.push('// unobtainable when Slayer\'s pure-trophy entries were removed. See');
masteryLines.push('// feature-research/phase9-megaupdates/audit-remove-slayer.md.');
masteryLines.push('');

for (const a of realDefs) {
  const newId = a.id.replace(/^slayer/, 'mastery');
  const newName = a.name.replace(/Hunter/g, 'Mastery');
  const icon = ICON_MAP[a.icon] || a.icon;
  const fields = [];
  fields.push('id:' + jsStr(newId));
  fields.push('name:' + jsStr(newName));
  fields.push('icon:' + jsStr(icon));
  fields.push('desc:' + jsStr(a.desc));
  fields.push("category:'Mastery'");
  if (a.bestiarySection) fields.push('bestiarySection:' + jsStr(a.bestiarySection));
  if (a.bestiaryId) fields.push('bestiaryId:' + jsStr(a.bestiaryId));
  if (a.threshold != null) fields.push('threshold:' + a.threshold);
  if (a.distinctThreshold != null) fields.push('distinctThreshold:' + a.distinctThreshold);
  if (a.statKey) fields.push('statKey:' + jsStr(a.statKey));
  for (const rf of ['itemId', 'trinketId', 'familiarId', 'enemyId', 'pillColorId', 'starId', 'pickupKind', 'classId', 'shopDiscount']) {
    if (a[rf] != null) fields.push(rf + ':' + jsStr(a[rf]));
  }
  masteryLines.push('addAchievement({ ' + fields.join(', ') + ' });');
}
masteryLines.push('');
fs.writeFileSync(path.join(ROOT, 'js/achievements/defs-mastery.js'), masteryLines.join('\n'));
console.log('Wrote js/achievements/defs-mastery.js with', realDefs.length, 'entries.');

// ---------------------------------------------------------------
// Step B: delete category:'Slayer' calls from defs-2..12.js
// ---------------------------------------------------------------
let totalDeleted = 0;
for (let n = 1; n <= 12; n++) {
  const f = path.join(ROOT, 'js/achievements/defs-' + n + '.js');
  let src = fs.readFileSync(f, 'utf8');
  const calls = splitCalls(src);
  const slayerCalls = calls.filter(c => c.text.includes("category:'Slayer'"));
  if (!slayerCalls.length) continue;
  // delete from the end backwards so earlier offsets stay valid
  for (let i = slayerCalls.length - 1; i >= 0; i--) {
    const c = slayerCalls[i];
    let delEnd = c.end;
    if (src[delEnd] === '\n') delEnd++;
    src = src.slice(0, c.start) + src.slice(delEnd);
  }
  fs.writeFileSync(f, src);
  totalDeleted += slayerCalls.length;
  console.log('defs-' + n + '.js: deleted', slayerCalls.length, 'Slayer statements');
}
console.log('Total Slayer statements deleted from defs files:', totalDeleted);

// ---------------------------------------------------------------
// Step C: delete trophy item defs from items-2..5.js
// ---------------------------------------------------------------
let totalItemsDeleted = 0;
for (let n = 1; n <= 5; n++) {
  const f = path.join(ROOT, 'js/data/items-' + n + '.js');
  let src = fs.readFileSync(f, 'utf8');
  const props = splitProps(src);
  const trophyProps = props.filter(p => trophyIdSet.has(p.key));
  if (!trophyProps.length) continue;
  for (let i = trophyProps.length - 1; i >= 0; i--) {
    const p = trophyProps[i];
    let delEnd = p.end;
    if (src[delEnd] === '\n') delEnd++;
    src = src.slice(0, p.start) + src.slice(delEnd);
  }
  fs.writeFileSync(f, src);
  totalItemsDeleted += trophyProps.length;
  console.log('items-' + n + '.js: deleted', trophyProps.length, 'trophy item defs');
}
console.log('Total trophy item defs deleted:', totalItemsDeleted);

// ---------------------------------------------------------------
// Step D: clean up dead (p.<trophyId> || 0) formula terms in items-1.js
// (js/systems/items-1.js, NOT js/data/items-1.js)
// ---------------------------------------------------------------
const sysItemsPath = path.join(ROOT, 'js/systems/items-1.js');
let sysSrc = fs.readFileSync(sysItemsPath, 'utf8');
const lines = sysSrc.split('\n');
const termRe = /\+\s*[\d.]+\s*\*\s*\(p\.[a-zA-Z0-9_]+\s*\|\|\s*0\)/g;
let termsRemoved = 0;
let linesDeleted = 0;
const outLines = [];
for (const line of lines) {
  const matches = [...line.matchAll(termRe)];
  if (!matches.length) { outLines.push(line); continue; }
  const toRemove = matches.filter(m => trophyIdSet.has(m[0].match(/p\.([a-zA-Z0-9_]+)/)[1]));
  if (!toRemove.length) { outLines.push(line); continue; }
  if (toRemove.length === matches.length) {
    // every term on this line is a dead trophy reference — check whether the
    // WHOLE line (minus indentation) is composed only of these terms; if so
    // drop the line entirely instead of leaving an empty husk
    const codeOnly = line.trim();
    const allTermsConcat = matches.map(m => m[0]).join('');
    // matches may have single spaces between them in source; compare with
    // spaces stripped so ordering/adjacency differences don't false-negative
    if (codeOnly.replace(/\s+/g, '') === allTermsConcat.replace(/\s+/g, '')) {
      linesDeleted++;
      termsRemoved += toRemove.length;
      continue; // drop line
    }
  }
  // partial removal: strip just the dead terms, leave everything else
  let newLine = line;
  for (let i = toRemove.length - 1; i >= 0; i--) {
    const m = toRemove[i];
    newLine = newLine.slice(0, m.index) + newLine.slice(m.index + m[0].length);
  }
  // collapse any double-spaces created mid-line (never touches leading indent,
  // since that run is preceded by start-of-string, not a non-space char)
  newLine = newLine.replace(/(\S) {2,}/g, '$1 ');
  termsRemoved += toRemove.length;
  outLines.push(newLine);
}
sysSrc = outLines.join('\n');

// second pass: drop now-orphaned "trophy batch" header comments — a comment
// line immediately followed by another comment line (or end of the luck
// formula) means every code line it used to introduce got deleted above
const finalLines = sysSrc.split('\n');
const kept2 = [];
for (let i = 0; i < finalLines.length; i++) {
  const line = finalLines[i];
  const isTrophyHeaderComment = /^\s*\/\/.*trophy batch/i.test(line);
  const next = finalLines[i + 1] || '';
  if (isTrophyHeaderComment && (/^\s*\/\//.test(next) || next.trim() === '')) {
    continue; // orphaned header, drop it
  }
  kept2.push(line);
}
sysSrc = kept2.join('\n');
fs.writeFileSync(sysItemsPath, sysSrc);
console.log('js/systems/items-1.js: removed', termsRemoved, 'dead trophy formula terms across', linesDeleted, 'fully-dead lines');
