'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const ctx = vm.createContext({ console, performance, setTimeout, clearTimeout });
for (const match of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="([^"]+)"/g)) {
  if (match[1] !== 'js/app.js') vm.runInContext(fs.readFileSync(path.join(root, match[1]), 'utf8'), ctx, { filename: match[1] });
}
const run = (code) => vm.runInContext(code, ctx);
run(`function q14(smiles,conditions,reagents){
  const compounds=smiles.map((smiles,i)=>({smiles,fragment:smilesToFragment(smiles),role:i?'reagent':'reactant',equiv:1}));
  (reagents||[]).forEach(smiles=>compounds.push({smiles,fragment:smilesToFragment(smiles),role:'reagent',equiv:1}));
  const r=predictReaction(compounds,{...defaultReactionConditions(),...conditions});
  return [r.best,...r.alternatives].filter(Boolean);
}`);
let checks = 0;
function check(code, expected, label) { assert.equal(run(code), expected, label); checks++; }

check(`q14(['O=C(C(O)c1ccccc1)c1ccccc1'],{solvents:['water'],temperature:90},['O[N+](=O)[O-]']).some(o=>o.id==='benzoin-oxidation'&&o.products.some(p=>moleculeSame(p.smiles,'O=C(C(=O)c1ccccc1)c1ccccc1')))`, true, 'Benzoin oxidizes to benzil');
check(`q14(['O=C(C(O)c1ccccc1)c1ccccc1'],{solvents:['water'],temperature:25},['O[N+](=O)[O-]']).some(o=>o.id==='benzoin-oxidation')`, false, 'Benzoin oxidation retains its thermal regime');
check(`q14(['OCC(O)c1ccccc1'],{solvents:['water'],temperature:90},['O[N+](=O)[O-]']).some(o=>o.id==='benzoin-oxidation')`, false, 'A vicinal diol without the ketone is not forced into benzoin oxidation');
check(`q14(['O=C(CCO)c1ccccc1'],{solvents:['water'],temperature:90},['O[N+](=O)[O-]']).some(o=>o.id==='benzoin-oxidation')`, false, 'A nonadjacent alcohol and ketone do not form an alpha-diketone');

check(`q14(['O=Cc1ccccc1','CN(=O)=O'],{solvents:['ethanol'],temperature:25},['CC[O-].[Na+]']).some(o=>o.id==='henry'&&o.products.some(p=>moleculeSame(p.smiles,'O=N(CC(O)c1ccccc1)=O')))`, true, 'Nitromethane and benzaldehyde form the Henry adduct');
check(`q14(['CC(C)=O','CCN(=O)=O'],{solvents:['ethanol'],temperature:25},['CC[O-].[Na+]']).some(o=>o.id==='henry'&&o.products.some(p=>moleculeSame(p.smiles,'CC(C)(O)C(C)N(=O)=O')))`, true, 'A simple ketone and primary nitroalkane are supported');
check(`q14(['O=Cc1ccccc1','O=N(c1ccccc1)=O'],{solvents:['ethanol'],temperature:25},['CC[O-].[Na+]']).some(o=>o.id==='henry')`, false, 'Nitrobenzene has no alpha-H nitronate carbon');
check(`q14(['CCOC(C)=O','CN(=O)=O'],{solvents:['ethanol'],temperature:25},['CC[O-].[Na+]']).some(o=>o.id==='henry')`, false, 'An ester is not treated as the encoded carbonyl partner');
check(`q14(['O=Cc1ccccc1','CN(=O)=O'],{solvents:['ethanol'],temperature:25}).some(o=>o.id==='henry')`, false, 'Henry addition requires a base regime');

console.log('Reaction expansion round 6: ' + checks + ' checks passed.');
