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
const run = code => vm.runInContext(code, ctx);
let checks=0;
function check(code, expected, label) { assert.equal(run(code),expected,label);checks++; }
run(`function nitrogenForward(substrate,agent,conditions={}) {
  const compounds=[substrate,agent].filter(Boolean).map((smiles,i)=>({smiles,fragment:smilesToFragment(smiles),role:i?'reagent':'reactant',equiv:'1'}));
  const result=predictReaction(compounds,{...defaultReactionConditions(),solvents:['ethanol'],temperature:25,...conditions});
  return [result.best,...result.alternatives].filter(Boolean);
}`);
for(const [substrate,agent,id,product] of [
  ['CC(C)=O','NO','oxime','CC(C)=NO'],
  ['CC(C)=O','[H]N([H])O','oxime','CC(C)=NO'],
  ['CC(C)=O','[H]N([H])N','hydrazone','CC(C)=NN'],
  ['CC=[18O]','NO','oxime','CC=NO'],
  ['CC(C)=O','[15NH2]O','oxime','CC(C)=[15N]O'],
  ['CC(C)=O','N[18OH]','oxime','CC(C)=N[18OH]'],
  ['[13CH3]C(C)=O','NO','oxime','[13CH3]C(C)=NO'],
  ['CC(=O)CC(C)=O','NO','oxime','CC(=NO)CC(C)=NO'],
  ['CC(C)=O','NN','hydrazone','CC(C)=NN'],
  ['CC=[18O]','NN','hydrazone','CC=NN'],
  ['CC(C)=O','[15NH2]N','hydrazone','CC(C)=[15N]N'],
  ['CC(C)=O','N[15NH2]','hydrazone','CC(C)=N[15NH2]'],
  ['CC(=O)CC(C)=O','NN','hydrazone','CC(=NN)CC(C)=NN']
]) {
  ctx.substrate=substrate;ctx.agent=agent;ctx.id=id;ctx.product=product;
  run(`var nitrogenResults=nitrogenForward(substrate,agent);`);
  check(`nitrogenResults.some(o=>o.id===id&&o.products.some(p=>moleculeSame(p.fragment||p.smiles,product)))`,true,'Condensation preserves expected elemental/isotope identity: '+substrate+' + '+agent);
  check(`nitrogenResults.filter(o=>o.id===id).every(o=>o.evidence.references.length>0&&!!o.evidence.scope)`,true,'Condensation retains its sourced scope');
}
for(const [agent,product] of [['N','Cc1ccc(C)[nH]1'],['[15NH3]','Cc1ccc(C)[15nH]1'],['CN','Cc1ccc(C)n1C']]) {
  ctx.agent=agent;ctx.product=product;
  check(`nitrogenForward('CC(=O)CCC(C)=O',agent,{temperature:80}).some(o=>o.id==='paal-knorr-pyrrole'&&o.products.some(p=>moleculeSame(p.fragment||p.smiles,product)))`,true,'Paal–Knorr retains the nitrogen donor: '+agent);
}
check(`nitrogenForward('CC(=O)CCC(C)=O',null,{temperature:80,additives:['h2so4']}).some(o=>o.id==='paal-knorr-furan'&&o.products.some(p=>moleculeSame(p.fragment||p.smiles,'Cc1ccc(C)o1')))`,true,'Acid-catalysed furan product is reproduced');
check(`nitrogenForward('CC(=O)CC(C)=O',null,{temperature:80,additives:['h2so4']}).some(o=>o.id==='paal-knorr-furan')`,false,'A 1,3-diketone is not mistaken for a 1,4-dicarbonyl');
check(`nitrogenForward('CC(=O)CCC(C)=O','CNC',{temperature:80}).some(o=>o.id==='paal-knorr-pyrrole')`,false,'Secondary amine cannot supply an N-substituted pyrrole');
check(`nitrogenForward('CC(N)=O','NO').some(o=>o.id==='oxime')`,false,'An amide is not treated as an aldehyde or ketone');
check(`nitrogenForward('CCO','NN').some(o=>o.id==='hydrazone')`,false,'An alcohol is not a hydrazone substrate');
console.log('Reaction expansion round 9: '+checks+' checks passed.');
