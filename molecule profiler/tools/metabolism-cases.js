'use strict';

// Known-answer tests for the metabolism engine.
//
//   node tools/metabolism-cases.js            print the report
//   node tools/metabolism-cases.js --write    also regenerate data/metcases.js
//
// Each case is a drug whose major human metabolite is documented in the
// literature, written as a SMILES. The engine is run exactly as the page runs
// it, every enumerated metabolite is canonicalised, and the case asks one
// question: does the documented metabolite appear at all, and if so in which
// band. Nothing here checks concentrations; the engine does not predict any.

const path = require('path');
const fs = require('fs');

const base = path.join(__dirname, '..');
function load(file, names) {
  const mod = require(path.join(base, file));
  (names || Object.keys(mod)).forEach((name) => { global[name] = mod[name]; });
  return mod;
}

const sm = load('js/smiles.js');
const molmod = load('js/mol.js');
load('js/smarts.js');
load('js/transform.js');
load('js/sites.js');
load('data/toxalerts.js');
load('data/alerts.js');
load('data/metabolism.js');
load('js/descriptors.js');
load('js/fingerprints.js');
load('js/rules.js');
load('js/tox.js');
const met = load('js/metabolism.js');

function canon(smiles) {
  const mol = molmod.moleculeFromSmiles(smiles);
  return met.metaboliteKey(mol, describe(mol));
}

function record(name, smiles) {
  const mol = molmod.moleculeFromSmiles(smiles);
  const d = describe(mol);
  return { name: name, smiles: smiles, mol: mol, d: d, v: evaluate(d) };
}

// parent, documented metabolite, the route the literature names, and whether the
// metabolite is the dominant one or merely a documented major path.
const CASES = [
  { drug: 'Aspirin', parent: 'CC(=O)Oc1ccccc1C(=O)O',
    metabolite: 'Salicylic acid', smiles: 'OC(=O)c1ccccc1O',
    route: 'ester hydrolysis by carboxylesterase and plasma esterases',
    standing: 'dominant: essentially all absorbed aspirin is deacetylated' },
  { drug: 'Codeine', parent: 'COc1ccc2CC3N(C)CCC45C(Oc1c24)C(O)C=CC35',
    metabolite: 'Morphine', smiles: 'Oc1ccc2CC3N(C)CCC45C(Oc1c24)C(O)C=CC35',
    route: 'CYP2D6 O-demethylation',
    standing: 'minor by mass but the analgesically decisive route' },
  { drug: 'Codeine', parent: 'COc1ccc2CC3N(C)CCC45C(Oc1c24)C(O)C=CC35',
    metabolite: 'Norcodeine', smiles: 'COc1ccc2CC3NCCC45C(Oc1c24)C(O)C=CC35',
    route: 'CYP3A4 N-demethylation',
    standing: 'documented secondary route' },
  { drug: 'Paracetamol', parent: 'CC(=O)Nc1ccc(O)cc1',
    metabolite: 'NAPQI', smiles: 'CC(=O)N=C1C=CC(=O)C=C1',
    route: 'CYP2E1 and CYP3A4 oxidation',
    standing: 'a few percent of dose, and the reason overdose is hepatotoxic' },
  { drug: 'MDMA', parent: 'CC(NC)Cc1ccc2OCOc2c1',
    metabolite: 'MDA', smiles: 'CC(N)Cc1ccc2OCOc2c1',
    route: 'CYP2D6 and CYP1A2 N-demethylation',
    standing: 'documented, about a tenth of the dose' },
  { drug: 'MDMA', parent: 'CC(NC)Cc1ccc2OCOc2c1',
    metabolite: 'HHMA', smiles: 'CC(NC)Cc1ccc(O)c(O)c1',
    route: 'CYP2D6 O-demethylenation',
    standing: 'the dominant route; HMMA is its O-methylated product' },
  { drug: 'Diazepam', parent: 'CN1c2ccc(Cl)cc2C(=NCC1=O)c1ccccc1',
    metabolite: 'Nordazepam', smiles: 'O=C1CN=C(c2ccccc2)c2cc(Cl)ccc2N1',
    route: 'CYP2C19 and CYP3A4 N-demethylation',
    standing: 'dominant first-pass route' },
  { drug: 'Propranolol', parent: 'CC(C)NCC(O)COc1cccc2ccccc12',
    metabolite: 'N-desisopropylpropranolol', smiles: 'NCC(O)COc1cccc2ccccc12',
    route: 'CYP1A2 N-dealkylation',
    standing: 'documented route alongside ring hydroxylation' },
  { drug: 'Amitriptyline', parent: 'CN(C)CCC=C1c2ccccc2CCc2ccccc21',
    metabolite: 'Nortriptyline', smiles: 'CNCCC=C1c2ccccc2CCc2ccccc21',
    route: 'CYP2C19 and CYP3A4 N-demethylation',
    standing: 'dominant, and an active drug in its own right' },
  { drug: 'Caffeine', parent: 'Cn1cnc2c1c(=O)n(C)c(=O)n2C',
    metabolite: 'Paraxanthine', smiles: 'Cn1cnc2c1c(=O)[nH]c(=O)n2C',
    route: 'CYP1A2 N3-demethylation',
    standing: 'about 80% of caffeine clearance' },
  { drug: 'Nicotine', parent: 'CN1CCCC1c1cccnc1',
    metabolite: 'Nornicotine', smiles: 'C1CCNC1c1cccnc1',
    route: 'CYP2A6 N-demethylation',
    standing: 'minor; cotinine, the dominant route, needs an oxidation this engine does not carry' },
  { drug: 'Ibuprofen', parent: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O',
    metabolite: 'Carboxyibuprofen precursor (2-hydroxyibuprofen)', smiles: 'CC(C)(O)Cc1ccc(cc1)C(C)C(=O)O',
    route: 'CYP2C9 hydroxylation',
    standing: 'documented oxidative route' },
  { drug: 'Phenacetin', parent: 'CCOc1ccc(NC(C)=O)cc1',
    metabolite: 'Paracetamol', smiles: 'CC(=O)Nc1ccc(O)cc1',
    route: 'CYP1A2 O-deethylation',
    standing: 'dominant; this is why phenacetin was an analgesic' },
  { drug: 'Tamoxifen', parent: 'CC/C(=C(\\c1ccccc1)c1ccc(OCCN(C)C)cc1)c1ccccc1'.replace(/[/\\]/g, ''),
    metabolite: 'N-desmethyltamoxifen', smiles: 'CCC(=C(c1ccccc1)c1ccc(OCCNC)cc1)c1ccccc1',
    route: 'CYP3A4 N-demethylation',
    standing: 'the dominant circulating metabolite' },
  { drug: 'Valproic acid', parent: 'CCCC(CCC)C(=O)O',
    metabolite: 'Valproate glucuronide', smiles: 'CCCC(CCC)C(=O)OC1OC(C(=O)O)C(O)C(O)C1O',
    route: 'UGT glucuronidation',
    standing: 'dominant, roughly half the dose' },
  { drug: 'Morphine', parent: 'Oc1ccc2CC3N(C)CCC45C(Oc1c24)C(O)C=CC35',
    metabolite: 'Morphine glucuronide', smiles: 'O(c1ccc2CC3N(C)CCC45C(Oc1c24)C(O)C=CC35)C1OC(C(=O)O)C(O)C(O)C1O',
    route: 'UGT2B7 glucuronidation',
    standing: 'dominant; the 3- and 6-glucuronides together are most of the dose' }
];

const depth = Number(process.env.MET_DEPTH || 2);
const results = CASES.map((item) => {
  const parent = record(item.drug, item.parent);
  const tree = met.metabolicTree(parent, { depth: depth, phases: ['I', 'II'] });
  const wanted = canon(item.smiles);
  const found = tree.metabolites.filter((node) => met.metaboliteKey(node.mol, node.d) === wanted);
  found.sort((a, b) => b.score - a.score);
  const hit = found[0] || null;
  const rank = hit ? tree.metabolites.indexOf(hit) + 1 : null;
  return {
    drug: item.drug,
    metabolite: item.metabolite,
    route: item.route,
    standing: item.standing,
    found: Boolean(hit),
    band: hit ? met.metaboliteBand(hit.score) : null,
    weight: hit ? hit.score : null,
    rank: rank,
    generation: hit ? hit.depth : null,
    tieBestRank: hit ? 1+tree.metabolites.filter(n=>n.score>hit.score+1e-12).length : null,
    tieWorstRank: hit ? tree.metabolites.filter(n=>n.score>=hit.score-1e-12).length : null,
    predictedRoute: hit ? hit.enzyme + ', ' + hit.rule : null,
    enumerated: tree.metabolites.length,
    truncated: tree.truncated
  };
});

const found = results.filter((row) => row.found);
const major = results.filter((row) => row.band === 'major');
const top5 = found.filter((row) => row.rank <= 5);
if(found.length!==CASES.length)process.exitCode=1;

console.log('metabolism known-answer cases, ' + depth + ' generations, phase I and II');
console.log('  ' + results.length + ' documented metabolites across '
  + new Set(CASES.map((item) => item.drug)).size + ' drugs');
console.log('  enumerated at all: ' + found.length + '/' + results.length);
console.log('  in the major band: ' + major.length + '/' + results.length);
console.log('  inside the top five by deterministic display order: ' + top5.length + '/' + results.length);
console.log('  top-five tie interval: '+found.filter(r=>r.tieWorstRank<=5).length+' guaranteed to '+found.filter(r=>r.tieBestRank<=5).length+' possible of '+results.length);
console.log('');
results.forEach((row) => {
  console.log('  ' + (row.found ? (row.band === 'major' ? 'MAJOR ' : row.band === 'minor' ? 'minor ' : 'trace ') : 'MISSED')
    + row.drug.padEnd(14) + '-> ' + row.metabolite.padEnd(34)
    + (row.found ? 'rank ' + String(row.rank).padStart(3) + ' of ' + String(row.enumerated).padEnd(5)
        + 'weight ' + row.weight.toFixed(4) + '  gen ' + row.generation + '  ' + row.predictedRoute : ''));
  if (row.found && row.route.split(' ')[0] !== '') {
    console.log('        documented: ' + row.route + ' — ' + row.standing);
  }
});

if (process.argv.includes('--write')) {
  const payload = {
    generated: new Date().toISOString().slice(0, 10),
    generations: depth,
    cases: results.length,
    drugs: new Set(CASES.map((item) => item.drug)).size,
    enumerated: found.length,
    major: major.length,
    top5: top5.length,
    top5Guaranteed:found.filter(r=>r.tieWorstRank<=5).length,
    top5Possible:found.filter(r=>r.tieBestRank<=5).length,
    rows: results.map((row) => ({
      drug: row.drug, metabolite: row.metabolite, route: row.route, standing: row.standing,
      found: row.found, band: row.band, rank: row.rank,
      weight: row.weight === null ? null : Number(row.weight.toFixed(5)),
      generation: row.generation,tieBestRank:row.tieBestRank,tieWorstRank:row.tieWorstRank, predictedRoute: row.predictedRoute, enumerated: row.enumerated
    }))
  };
  fs.writeFileSync(path.join(base, 'data/metcases.js'), "'use strict';\n\n"
    + '// Generated by tools/metabolism-cases.js. Do not edit by hand.\n'
    + 'const METABOLISM_CASES = ' + JSON.stringify(payload, null, 2) + ';\n\n'
    + "if (typeof module !== 'undefined' && module.exports) {\n"
    + '  module.exports = { METABOLISM_CASES };\n}\n');
  console.log('\nwrote data/metcases.js');
}
