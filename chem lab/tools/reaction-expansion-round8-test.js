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
run(`function couplingForward(substrate,partner,agent,additives=[]) {
  const compounds=[substrate,partner,agent].filter(Boolean).map((smiles,i)=>({smiles,fragment:smilesToFragment(smiles),role:i===2?'reagent':'reactant',equiv:'1'}));
  const result=predictReaction(compounds,{...defaultReactionConditions(),solvents:['dcm'],additives,temperature:25});
  return [result.best,...result.alternatives].filter(Boolean);
}
const couplingDcc='C1CCC(CC1)N=C=NC1CCCCC1', couplingEdc='CCN=C=NCCCN(C)C';
const fakeDcc='C1CCC(CC1)N=CC=NC1CCCC1', fakeEdc='CCN=CC=NCCN(C)C';
`);
for(const [agent,partner,id,product] of [
  ['couplingDcc','CN','amide-coupling','CNC(C)=O'],
  ['couplingEdc','CNC','amide-coupling','CN(C)C(C)=O'],
  ['couplingDcc','CCO','steglich','CCOC(C)=O'],
  ['couplingEdc','Oc1ccccc1','steglich','CC(=O)Oc1ccccc1']
]) {
  ctx.partner=partner;ctx.id=id;ctx.product=product;
  run(`var couplingResults=couplingForward('CC(=O)O',partner,${agent},['dmap']);`);
  check(`couplingResults.some(o=>o.id===id&&o.products.some(p=>moleculeSame(p.fragment||p.smiles,product)))`,true,'Coupling produces the expected product with '+agent);
  check(`couplingResults.filter(o=>o.id===id).every(o=>o.evidence.references.length>0&&!!o.evidence.scope)`,true,'Coupling retains its sourced scope');
}
for(const [fake,real,formula] of [['fakeDcc','couplingDcc','C13H22N2'],['fakeEdc','couplingEdc','C8H17N3']]) {
  check(`reactionGraphProperties(reactionFragmentGraph(smilesToFragment(${fake}))).formula`,formula,'Negative control has the coupling agent formula');
  check(`reactionGraphProperties(reactionFragmentGraph(smilesToFragment(${real}))).formula`,formula,'Positive reagent has the same formula');
  check(`(()=>{const g=reactionFragmentGraph(smilesToFragment(${fake}));return rxSpeciesTag(g,g.atoms.map(a=>a.id))?.tag==='carbodiimide';})()`,false,'Formula isomer is not classified as a carbodiimide');
  check(`couplingForward('CC(=O)O','CN',${fake}).some(o=>o.id==='amide-coupling')`,false,'Formula isomer cannot activate amide coupling');
  check(`couplingForward('CC(=O)O','CCO',${fake},['dmap']).some(o=>o.id==='steglich')`,false,'Formula isomer cannot activate Steglich esterification');
}
check(`couplingForward('CC(=O)O','CN',null).some(o=>o.id==='amide-coupling')`,false,'Unactivated acid and amine do not become an amide');
check(`couplingForward('CC(=O)O','CN(C)C',couplingDcc).some(o=>o.id==='amide-coupling')`,false,'A tertiary amine is not an N-H coupling partner');
console.log('Reaction expansion round 8: '+checks+' checks passed.');
