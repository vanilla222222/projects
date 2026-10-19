'use strict';

// Measures the predicted properties against published experimental data.
// Log S comes from Delaney's ESOL equation and is scored against the measured
// aqueous solubilities in his own supporting data, plus the independent DLS-100
// set. The Crippen log P is scored against measured octanol/water log D at
// pH 7.4 from the MoleculeNet lipophilicity set, which is a different quantity
// for any ionisable compound, so the gap there is reported as a ceiling rather
// than as an error in the estimate. Every dataset is recorded with its source
// URL, its SHA-256 and its row count so the numbers can be reproduced.
// With --dump <file of SMILES> it instead prints our log P, log S and molar
// refractivity per line, which is how tools/crippen-conformance.py compares the
// Crippen implementation against RDKit's.
// Generated report: data/propcases.js. Do not edit that by hand.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
load('js/rules.js');

const SOURCES = {
  esol: 'https://deepchemdata.s3.us-west-1.amazonaws.com/datasets/delaney-processed.csv',
  dls: 'https://raw.githubusercontent.com/PatWalters/solubility/master/dls_100_unique.csv',
  logd: 'https://deepchemdata.s3.us-west-1.amazonaws.com/datasets/Lipophilicity.csv'
};

function arg(name) {
  const index = process.argv.indexOf('--' + name);
  return index > -1 ? process.argv[index + 1] : null;
}

function splitCsv(line) {
  const out = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(field); field = ''; }
    else field += ch;
  }
  out.push(field);
  return out;
}

function readCsv(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r/g, '');
  const lines = text.split('\n').filter((line) => line.length);
  const head = splitCsv(lines[0]);
  return {
    sha256: crypto.createHash('sha256').update(text).digest('hex'),
    rows: lines.slice(1).map((line) => {
      const cells = splitCsv(line);
      const row = {};
      head.forEach((key, i) => { row[key] = cells[i]; });
      return row;
    })
  };
}

function stats(pairs) {
  const n = pairs.length;
  if (!n) return null;
  let sumAbs = 0;
  let sumSq = 0;
  let sumErr = 0;
  let within1 = 0;
  let meanY = 0;
  let meanX = 0;
  pairs.forEach(([x, y]) => { meanY += y; meanX += x; });
  meanY /= n;
  meanX /= n;
  let sst = 0;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  pairs.forEach(([x, y]) => {
    const err = x - y;
    sumAbs += Math.abs(err);
    sumSq += err * err;
    sumErr += err;
    if (Math.abs(err) <= 1) within1 += 1;
    sst += (y - meanY) * (y - meanY);
    sxy += (x - meanX) * (y - meanY);
    sxx += (x - meanX) * (x - meanX);
    syy += (y - meanY) * (y - meanY);
  });
  return {
    n: n,
    mae: +(sumAbs / n).toFixed(3),
    rmse: +Math.sqrt(sumSq / n).toFixed(3),
    bias: +(sumErr / n).toFixed(3),
    r2: +(1 - sumSq / sst).toFixed(3),
    pearson: +(sxy / Math.sqrt(sxx * syy)).toFixed(3),
    within1Pct: +(within1 * 100 / n).toFixed(1)
  };
}

function quantile(values, q) {
  const sorted = values.slice().sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const low = Math.floor(pos);
  const high = Math.ceil(pos);
  return sorted[low] + (sorted[high] - sorted[low]) * (pos - low);
}

const DOMAIN_KEYS = ['mw', 'logp', 'tpsa', 'rotatableBonds', 'aromaticProportion', 'heavyAtoms'];

function domain(records) {
  const out = {};
  DOMAIN_KEYS.forEach((key) => {
    const values = records.map((d) => d[key]).filter((value) => typeof value === 'number');
    out[key] = [+quantile(values, 0.01).toFixed(2), +quantile(values, 0.99).toFixed(2)];
  });
  return out;
}

function score(label, file, smilesKey, valueKey, predict, sourceUrl, note, keep) {
  const table = readCsv(file);
  const pairs = [];
  const used = [];
  let failed = 0;
  let skipped = 0;
  table.rows.forEach((row) => {
    const smiles = (row[smilesKey] || '').trim();
    const measured = parseFloat(row[valueKey]);
    if (!smiles || !isFinite(measured)) { skipped += 1; return; }
    let d;
    try {
      const mol = moleculeFromSmiles(smiles);
      if (keep && !keep(mol)) { skipped += 1; return; }
      d = describe(mol);
    } catch (err) {
      failed += 1;
      return;
    }
    const value = predict(d);
    if (!isFinite(value)) { failed += 1; return; }
    pairs.push([value, measured]);
    used.push(d);
  });
  const result = stats(pairs);
  result.label = label;
  result.source = sourceUrl;
  result.file = path.basename(file);
  result.sha256 = table.sha256;
  result.csvRows = table.rows.length;
  result.parseFailed = failed;
  result.noValue = skipped;
  result.domain = domain(used);
  if (note) result.note = note;
  return result;
}

const dumpFile = arg('dump');
if (dumpFile) {
  fs.readFileSync(dumpFile, 'utf8').split('\n').map((line) => line.trim())
    .filter((line) => line.length).forEach((smiles) => {
      try {
        const d = describe(moleculeFromSmiles(smiles));
        console.log([smiles, d.logp.toFixed(4), esolLogS(d).toFixed(4), d.mr.toFixed(4)].join('\t'));
      } catch (err) {
        console.log([smiles, 'NA', 'NA', 'NA'].join('\t'));
      }
    });
  process.exit(0);
}

const out = { generated: new Date().toISOString().slice(0, 10), datasets: {} };

const esolFile = arg('esol');
if (esolFile) {
  out.datasets.logS = score('Delaney ESOL set, measured aqueous solubility',
    esolFile, 'smiles', 'measured log solubility in mols per litre',
    (d) => esolLogS(Object.assign({}, d)), SOURCES.esol,
    'The same compounds Delaney fitted the equation on, so this is a fit quality, not a blind test.');
  const published = readCsv(esolFile);
  const pairs = [];
  published.rows.forEach((row) => {
    const smiles = (row.smiles || '').trim();
    const theirs = parseFloat(row['ESOL predicted log solubility in mols per litre']);
    if (!smiles || !isFinite(theirs)) return;
    let d;
    try { d = describe(moleculeFromSmiles(smiles)); } catch (err) { return; }
    pairs.push([esolLogS(d), theirs]);
  });
  out.datasets.logSAgainstPublished = Object.assign(
    { label: 'Our ESOL output against Delaney\'s own published ESOL numbers', source: SOURCES.esol },
    stats(pairs)
  );
}

const dlsFile = arg('dls');
if (dlsFile) {
  out.datasets.logSBlind = score('DLS-100 set, measured aqueous solubility',
    dlsFile, 'SMILES', 'LogS exp (mol/L)', (d) => esolLogS(d), SOURCES.dls,
    'An independent set Delaney did not fit, so this is the blind error.');
}

const IONISABLE = ['[CX3](=O)[OX2H1]', '[SX4](=O)(=O)[OX2H1]', '[PX4](=O)[OX2H1]',
  '[NX3;H2,H1;!$(N[#6]=[O,N,S]);!$(N[a]);!$(N=*)]', '[NX3;H0;!$(N[#6]=[O,N,S]);!$(N[a]);!$(N=*);!$(N#*)]',
  '[NX4+]', '[O-]', '[n+]', '[OX2H1]c1ccccc1'];

function ionisable(mol) {
  return IONISABLE.some((pattern) => hasSmartsMatch(pattern, mol));
}

const logdFile = arg('logd');
if (logdFile) {
  out.datasets.logP = score('MoleculeNet lipophilicity set, measured log D at pH 7.4',
    logdFile, 'smiles', 'exp', (d) => d.logp, SOURCES.logd,
    'Log D at pH 7.4 is not log P: for an ionisable compound the measured value is lower by the degree of ionisation, so this number bounds the error rather than measuring it.');
  out.datasets.logPNeutral = score('Lipophilicity set, the subset carrying no ionisable group',
    logdFile, 'smiles', 'exp', (d) => d.logp, SOURCES.logd,
    'Restricted to compounds with no acid, no aliphatic amine and no formal charge, where log D at pH 7.4 should equal log P. This is the closest thing to a measured log P error the set supports.',
    (mol) => !ionisable(mol));
}

const report = JSON.stringify(out, null, 2);
Object.keys(out.datasets).forEach((key) => {
  const d = out.datasets[key];
  console.log(key.padEnd(22), 'n=' + String(d.n).padEnd(6), 'MAE=' + d.mae,
    'RMSE=' + d.rmse, 'R2=' + d.r2, 'bias=' + d.bias, 'within1=' + d.within1Pct + '%',
    'unparsed=' + (d.parseFailed === undefined ? '-' : d.parseFailed));
});

if (process.argv.includes('--write')) {
  const header = '// Generated by tools/property-validation.js. Do not edit by hand.\n'
    + '// Predicted properties scored against published experimental measurements.\n';
  fs.writeFileSync(path.join(root, 'data/propcases.js'),
    header + 'const PROPERTY_VALIDATION = ' + report + ';\n\n'
    + 'if (typeof module !== \'undefined\' && module.exports) {\n'
    + '  module.exports = { PROPERTY_VALIDATION };\n}\n');
  console.log('wrote data/propcases.js');
}
