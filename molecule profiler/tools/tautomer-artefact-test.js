'use strict';
// Measures the stored amide-as-iminol tautomer artefact on every validation run, so the
// number is read off the library rather than rediscovered. Method and consequences are
// recorded in TAUTOMER-ARTEFACT.md. The two queries run in the project's own SMARTS
// engine and reproduce the RDKit partition exactly.
const assert = require('node:assert/strict');
for (const file of ['smiles', 'mol', 'smarts', 'descriptors']) Object.assign(global, require('../js/' + file + '.js'));
const { LIBRARY } = require('../data/library.js');

const ACYCLIC_IMIDIC = '[CX3](=[NX2])[OX2H1]';
const AROMATIC_LACTIM = '[$(c:n)][OX2H1]';

const EXPECTED = {
  imidicOnly: 1689,
  lactimOnly: 299,
  both: 32,
  union: 2020,
  byClass: [
    ['ChEBI named compound', 2007],
    ['ChEMBL binding reference', 9],
    ['Antiviral', 1],
    ['DrugCentral named compound', 1],
    ['Fragment', 1],
    ['Immunosuppressant', 1]
  ]
};

const CONTROLS = [
  ['CC(=N)O', true, false],
  ['OC(=N)c1ccccc1', true, false],
  ['CC(N)=O', false, false],
  ['Oc1nncc2ccccc12', false, true],
  ['O=c1[nH]nc(C)c2ccccc12', false, false],
  ['CCOc1ncccn1', false, false],
  ['Oc1ccccc1', false, false]
];

function molecule(smiles) {
  return buildMolecule(parseSmiles(smiles));
}

for (const [smiles, imidic, lactim] of CONTROLS) {
  const mol = molecule(smiles);
  assert.equal(hasSmartsMatch(ACYCLIC_IMIDIC, mol), imidic, 'acyclic imidic acid query on ' + smiles);
  assert.equal(hasSmartsMatch(AROMATIC_LACTIM, mol), lactim, 'aromatic lactim query on ' + smiles);
}

const counts = { imidicOnly: 0, lactimOnly: 0, both: 0, union: 0 };
const byClass = new Map();
let unparsable = 0;
for (const entry of LIBRARY) {
  let mol;
  try {
    mol = molecule(entry.smiles);
  } catch (error) {
    unparsable += 1;
    continue;
  }
  const imidic = hasSmartsMatch(ACYCLIC_IMIDIC, mol);
  const lactim = hasSmartsMatch(AROMATIC_LACTIM, mol);
  if (!imidic && !lactim) continue;
  if (imidic && lactim) counts.both += 1;
  else if (imidic) counts.imidicOnly += 1;
  else counts.lactimOnly += 1;
  counts.union += 1;
  byClass.set(entry.cls, (byClass.get(entry.cls) || 0) + 1);
}

assert.equal(unparsable, 0, 'every library row parses');
assert.equal(counts.imidicOnly, EXPECTED.imidicOnly, 'rows matching only the acyclic imidic acid query');
assert.equal(counts.lactimOnly, EXPECTED.lactimOnly, 'rows matching only the aromatic lactim query');
assert.equal(counts.both, EXPECTED.both, 'rows matching both queries');
assert.equal(counts.union, EXPECTED.union, 'rows presenting the artefact');
assert.equal(counts.imidicOnly + counts.lactimOnly + counts.both, counts.union, 'the partition covers the union');

const measuredByClass = [...byClass.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
assert.deepEqual(measuredByClass, EXPECTED.byClass, 'classes carrying the artefact');
const sourcedClasses = new Set(['ChEBI named compound', 'DrugCentral named compound', 'PubChem named compound']);
const sourced = measuredByClass.filter(([cls]) => sourcedClasses.has(cls)).reduce((total, [, n]) => total + n, 0);
assert.equal(sourced, 2008, 'artefact rows in the externally sourced catch-all classes');
assert.equal(counts.union - sourced, 12, 'artefact rows written by hand');

assert.equal(tpsa(molecule('CC(=N)O')).toFixed(2), '44.08', 'TPSA of the iminol form');
assert.equal(tpsa(molecule('CC(N)=O')).toFixed(2), '43.09', 'TPSA of the amide form');
assert.ok(tpsa(molecule('CC(=N)O')) > tpsa(molecule('CC(N)=O')), 'the artefact overstates TPSA');

console.log(
  'Tautomer artefact: ' + counts.union + ' of ' + LIBRARY.length + ' rows present a stored amide as its iminol ('
    + counts.imidicOnly + ' acyclic imidic acid, ' + counts.lactimOnly + ' aromatic lactim, ' + counts.both
    + ' both; ' + sourced + ' externally sourced, ' + (counts.union - sourced) + ' hand-written)'
);
