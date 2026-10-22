#!/usr/bin/env node
'use strict';

// Run from any directory: node "chem lab/tools/naming-regression-test.js"
// Parent selection follows IUPAC Blue Book P-44.1.1:
// https://iupac.qmul.ac.uk/BlueBook/P4.html
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ console });
const scripts = [
  'elements', 'graph', 'valence', 'stereo', 'naming-core', 'naming-chain',
  'naming-ring', 'naming-scaffolds', 'naming-general', 'common-names-extra',
  'naming-elements', 'properties', 'smiles',
];
for (const script of scripts) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', script + '.js'), 'utf8'), context, { filename: script + '.js' });
}

const cases = [
  ['CCC(CO)CCO', '2-ethylbutane-1,4-diol'],
  ['CC(O)CCCC(CO)CC', '2-ethylheptane-1,6-diol'],
  ['CCC(CN)CCN', '2-ethylbutane-1,4-diamine'],
  ['CCC(CS)CCS', '2-ethylbutane-1,4-dithiol'],
  ['CCC(CC)CO', '2-ethylbutan-1-ol'],
  ['N#CC(CC)CCC', '2-ethylpentanenitrile'],
  ['O=C(O)C(C(=O)O)CCC', '2-propylpropanedioic acid'],
  ['CC(=O)C(CO)CCC', '3-(hydroxymethyl)hexan-2-one'],
  ['CC(Cl)C(F)C', '2-chloro-3-fluorobutane'],
  ['C=CC#C', 'but-1-en-3-yne'],
  ['CC(O)C', 'propan-2-ol'],
];
let checks = 0;
for (const [smiles, expected] of cases) {
  for (const reverse of [false, true]) {
    context.smiles = smiles;
    context.reverse = reverse;
    const result = vm.runInContext(`(() => {
      const mol = parseSmiles(smiles);
      const {graph, ids} = smilesBuildGraph(mol);
      if (reverse) {
        graph.atoms.reverse();
        graph.bonds.reverse();
        ids.reverse();
      }
      const before = JSON.stringify(graph);
      const detail = nameStructureDetailed(graph, ids);
      return { detail, unchanged: before === JSON.stringify(graph) };
    })()`, context);
    assert.equal(result.detail.full, expected, smiles + (reverse ? ' (reordered)' : ''));
    assert.equal(result.detail.systematicPrimary, expected, smiles + ' systematic parent');
    assert.equal(result.unchanged, true, smiles + ' must not mutate the structure');
    checks += 3;
  }
}
// Collinear coordinates carry no E/Z information. Place only the two alkene
// carbons and their carboxyl substituents to specify each geometry explicitly.
for (const [geometry, expectedCommon] of [[null, null], ['E', 'fumaric acid'], ['Z', 'maleic acid']]) {
  context.geometry = geometry;
  const result = vm.runInContext(`(() => {
    const {graph, ids} = smilesBuildGraph(parseSmiles('O=C(O)C=CC(=O)O'));
    if (geometry) {
      graph.getAtom(ids[3]).x = 0;
      graph.getAtom(ids[4]).x = 1;
      graph.getAtom(ids[1]).y = 1;
      graph.getAtom(ids[5]).y = geometry === 'E' ? -1 : 1;
    }
    return nameStructureDetailed(graph, ids);
  })()`, context);
  assert.equal(result.full, (geometry ? '(' + geometry + ')-' : '') + 'but-2-enedioic acid');
  assert.equal(result.common, expectedCommon);
  checks += 2;
}
console.log('Naming regression: ' + checks + ' assertions passed (' + cases.length + ' structures in both graph orders, plus unspecified/E/Z acid geometry).');
