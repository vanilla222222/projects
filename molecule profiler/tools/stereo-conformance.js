'use strict';

// Compares this project's stereochemistry perception against RDKit.
// Reads one SMILES per line on stdin (or a file given as the first argument)
// and prints one JSON object per line: stereocentre counts and CIP labels.
// tools/stereo-conformance.py is the other half and does the comparing.
// Generated report: data/stereocases.js. Do not edit that by hand.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
function load(file) {
  const exports = require(path.join(root, file));
  Object.keys(exports).forEach((key) => { global[key] = exports[key]; });
  return exports;
}

load('js/smiles.js');
load('js/mol.js');
load('js/smarts.js');
load('js/descriptors.js');
load('js/stereo.js');

const input = process.argv[2]
  ? fs.readFileSync(process.argv[2], 'utf8')
  : fs.readFileSync(0, 'utf8');

input.split('\n').forEach((line) => {
  const smiles = line.trim();
  if (!smiles) return;
  let out;
  try {
    const mol = moleculeFromSmiles(smiles);
    const stereo = stereoAnalyse(mol);
    out = {
      smiles: smiles,
      centers: stereo.centers.filter((item) => item.stereogenic).map((item) => item.atom),
      specified: stereo.centers.filter((item) => item.stereogenic && item.specified).map((item) => item.atom),
      labels: {},
      bonds: stereo.bonds.filter((item) => item.stereogenic).map((item) => [item.a, item.b]),
      bondLabels: {},
      undetermined: stereo.undetermined,
      elements: {}
    };
    stereo.centers.forEach((item) => {
      out.elements[item.atom] = item.element + ':' + (mol.atoms[item.atom].degree + mol.atoms[item.atom].totalH);
      if (item.label) out.labels[item.atom] = item.label;
    });
    stereo.bonds.forEach((item) => { if (item.label) out.bondLabels[item.a + ',' + item.b] = item.label; });
  } catch (err) {
    out = { smiles: smiles, error: err.message };
  }
  process.stdout.write(JSON.stringify(out) + '\n');
});
