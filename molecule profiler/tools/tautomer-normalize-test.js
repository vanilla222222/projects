'use strict';
// Checks the restricted amide/lactam to imidic-acid/lactim normalization in js/tautomer.js:
// its controls, its invariants over the whole library, and that it is exposed alongside the
// stored descriptors rather than replacing them. TAUTOMER-ARTEFACT.md records the measurement.
const assert = require('node:assert/strict');
for (const file of ['smiles', 'mol', 'smarts', 'descriptors', 'rules']) Object.assign(global, require('../js/' + file + '.js'));
const { normalizeTautomer } = require('../js/tautomer.js');
const { LIBRARY } = require('../data/library.js');

function mol(smiles) {
  return buildMolecule(parseSmiles(smiles));
}

const CONTROLS = [
  ['CC(=N)O', 1, 1, 0, 'CC(N)=O'],
  ['OC(=N)c1ccccc1', 1, 1, 0, 'NC(=O)c1ccccc1'],
  ['Oc1nncc2ccccc12', 1, 0, 1, null],
  ['CC(N)=O', 0, 0, 0, null],
  ['Oc1ccccc1', 0, 0, 0, null],
  ['CCOc1ncccn1', 0, 0, 0, null],
  ['O=c1[nH]nc(C)c2ccccc12', 0, 0, 0, null]
];
for (const [smiles, sites, acyclic, aromatic, equivalent] of CONTROLS) {
  const before = mol(smiles);
  const result = normalizeTautomer(before);
  assert.equal(result.sites, sites, smiles + ': normalizable sites');
  assert.equal(result.changed, sites > 0, smiles + ': changed');
  if (sites) {
    assert.equal(result.acyclic, acyclic, smiles + ': acyclic sites');
    assert.equal(result.aromatic, aromatic, smiles + ': aromatic sites');
    assert.equal(molecularFormula(result.mol), molecularFormula(before), smiles + ': composition is preserved');
    assert.ok(tpsa(result.mol) < tpsa(before), smiles + ': the artefact overstates TPSA');
  }
  if (equivalent) {
    assert.equal(tpsa(result.mol).toFixed(4), tpsa(mol(equivalent)).toFixed(4),
      smiles + ': normalizes onto ' + equivalent);
  }
}

const twoHydroxyls = mol('Oc1cccc(O)n1');
const claimed = normalizeTautomer(twoHydroxyls);
assert.equal(claimed.sites, 1, 'a ring nitrogen accepts only one hydrogen');
assert.equal(molecularFormula(claimed.mol), molecularFormula(twoHydroxyls),
  'pyridine-2,6-diol keeps its composition');

const counts = { normalized: 0, acyclic: 0, aromatic: 0, formulaChanged: 0, tpsaUp: 0, tpsaFlat: 0 };
const flaggedNotNormalized = [];
for (const entry of LIBRARY) {
  let before;
  try {
    before = mol(entry.smiles);
  } catch (error) {
    continue;
  }
  const result = normalizeTautomer(before);
  if (!result.changed) {
    if (hasSmartsMatch('[CX3](=[NX2])[OX2H1]', before) || hasSmartsMatch('[$(c:n)][OX2H1]', before)) {
      flaggedNotNormalized.push(entry.name);
    }
    continue;
  }
  counts.normalized += 1;
  counts.acyclic += result.acyclic;
  counts.aromatic += result.aromatic;
  if (molecularFormula(result.mol) !== molecularFormula(before)) counts.formulaChanged += 1;
  const after = tpsa(result.mol);
  const original = tpsa(before);
  if (after > original + 1e-9) counts.tpsaUp += 1;
  else if (Math.abs(after - original) <= 1e-9) counts.tpsaFlat += 1;
}

assert.equal(counts.normalized, 2019, 'library rows the restricted transform normalizes');
assert.equal(counts.acyclic, 3306, 'acyclic imidic-acid sites normalized');
assert.equal(counts.aromatic, 405, 'aromatic lactim sites normalized');
assert.equal(counts.formulaChanged, 0, 'the transform never changes composition');
assert.equal(counts.tpsaUp, 0, 'the transform never raises TPSA');
assert.equal(counts.tpsaFlat, 0, 'the transform always lowers TPSA where it applies');
assert.deepEqual(flaggedNotNormalized, ['2-hydroxytryptophan'],
  'rows the artefact queries flag that the restricted transform cannot convert');

const descriptorModule = require('../js/descriptors.js');
const { tautomerView } = require('../js/tautomer.js');
const iminol = mol('CC(=N)O');
const view = tautomerView(iminol, descriptorModule);
assert.equal(descriptorModule.tpsa(iminol).toFixed(2), '44.08', 'the stored structure keeps its TPSA');
assert.equal(view.normalized, true, 'the view reports the normalization');
assert.equal(view.tpsa.toFixed(2), '43.09', 'the view reports the normalized TPSA');
assert.equal(tautomerView(mol('CC(N)=O'), descriptorModule).normalized, false, 'an amide needs no normalization');
assert.equal(tautomerView(mol('CC(N)=O'), descriptorModule).sites, 0, 'an amide has no normalizable site');

const described = describe(iminol);
assert.ok(!('tautomer' in described),
  'describe() is left alone: js/descriptors.js is sha256-pinned in thirteen validation records');
assert.equal(described.tpsa.toFixed(2), '44.08', 'describe() still reports the stored structure');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const descriptorHash = crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(__dirname, '..', 'js', 'descriptors.js'))).digest('hex');
assert.equal(descriptorHash, '2612d387dbe7a7d0d789984c8c062c5a3c6ae43781021e4f225659bc7a98ee4e',
  'js/descriptors.js still matches the hash its regression records pin');

console.log(
  'Tautomer normalization: ' + counts.normalized + ' library rows converted ('
    + counts.acyclic + ' acyclic imidic-acid sites, ' + counts.aromatic
    + ' aromatic lactim sites), 0 composition changes, TPSA lowered in every case'
);
