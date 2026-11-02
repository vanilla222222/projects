'use strict';
// Guards the JS string escaping of stored SMILES. A double-bond direction marker written as a
// single backslash inside a single-quoted literal is consumed by the JS parser, so the row
// silently loses its geometry while still reading correctly in the source. Markers must be
// written doubled. The 17 rows below predate this check and are pinned by the append-only name
// witness, so they are named here rather than repaired; any row that joins them fails this
// test. LIBRARY-ESCAPING.md records the measurement and the correction path.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { LIBRARY } = require('../data/library.js');

const source = fs.readFileSync(path.join(__dirname, '..', 'data', 'library.js'), 'utf8');

const dropped = [];
let doubled = 0;
let apostrophes = 0;
for (let i = 0; i < source.length; i += 1) {
  if (source[i] !== '\\') continue;
  const next = source[i + 1];
  if (next === '\\') {
    doubled += 1;
    i += 1;
  } else if (next === "'") {
    apostrophes += 1;
    i += 1;
  } else {
    dropped.push({ index: i, next });
  }
}

assert.ok(dropped.every((hit) => hit.next === 'C' || hit.next === 'c'),
  'a dropped backslash should precede the carbon its marker belonged to');

const NAME = /name: '((?:[^'\\]|\\.)*)'/g;
function rowAt(index) {
  const names = [...source.slice(Math.max(0, index - 1600), index).matchAll(NAME)];
  return names.length ? names[names.length - 1][1] : '??';
}

const KNOWN = {
  'Arachidonic acid': 4,
  'N-Arachidonoyl dopamine': 4,
  Virodhamine: 4,
  '2-Oleoylglycerol': 1,
  Cefepime: 1,
  Cefotaxime: 1,
  Ceftazidime: 1,
  Ceftriaxone: 1,
  Cefuroxime: 1,
  Flupentixol: 1,
  Isotretinoin: 1,
  'Prostaglandin D2': 1,
  'Prostaglandin E2': 1,
  'Prostaglandin F2alpha': 1,
  Teriflunomide: 1,
  'Timolol maleate fragment': 1,
  Zuclopenthixol: 1
};

const measured = {};
for (const hit of dropped) {
  const name = rowAt(hit.index);
  measured[name] = (measured[name] || 0) + 1;
}
assert.deepEqual(measured, KNOWN,
  'rows whose stored SMILES loses a direction marker to JS escaping; a new name here is a splice that forgot to double its backslashes');
assert.equal(dropped.length, 26, 'the known baseline of dropped direction markers');
assert.equal(Object.keys(KNOWN).length, 17, 'rows carrying that baseline');
assert.equal(doubled, 3703, 'direction markers written correctly as a doubled backslash');
assert.equal(apostrophes, 21, 'escaped apostrophes in row names');
assert.ok(doubled > dropped.length * 100, 'the overwhelming majority of markers are escaped correctly');

const carried = LIBRARY.filter((entry) => entry.smiles.includes('\\')).length;
assert.equal(carried, 988, 'rows whose direction markers survive module loading');

const DERIVED_CEPHEM = LIBRARY.filter((entry) => entry.cls === 'Cephalosporin' && /^\(6R,7R\)/.test(entry.name));
assert.equal(DERIVED_CEPHEM.length, 112, 'the derived cephalosporin batch');
assert.equal(DERIVED_CEPHEM.filter((entry) => entry.smiles.includes('\\')).length, 78,
  'derived cephalosporin rows carrying a direction marker through module loading');

console.log(
  'Library escaping: ' + carried + ' rows carry a direction marker through module loading, '
    + doubled + ' escaped correctly; ' + dropped.length + ' single backslashes across '
    + Object.keys(KNOWN).length + ' pinned rows still lose one'
);
