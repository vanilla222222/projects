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
run(`function sulfurForward(inputs) {
  const compounds=inputs.map((smiles,i)=>({smiles,fragment:smilesToFragment(smiles),role:i?'reagent':'reactant',equiv:'1'}));
  const result=predictReaction(compounds,{...defaultReactionConditions(),solvents:['dcm'],additives:['et3n'],temperature:25});
  return [result.best,...result.alternatives].filter(Boolean);
}`);
for(const [substrate,reagent,id,product] of [
  ['CCO','CS(=O)(=O)Cl','sulfonate','CCOS(C)(=O)=O'],
  ['CC(C)O','Cc1ccc(S(=O)(=O)Cl)cc1','sulfonate','CC(C)OS(=O)(=O)c1ccc(C)cc1'],
  ['CN','CS(=O)(=O)Cl','sulfonamide','CNS(C)(=O)=O'],
  ['CNC','CS(=O)(=O)Cl','sulfonamide','CN(C)S(C)(=O)=O'],
  ['N1CCCCC1','Cc1ccc(S(=O)(=O)Cl)cc1','sulfonamide','O=S(=O)(c1ccc(C)cc1)N1CCCCC1']
]) {
  ctx.inputs=[substrate,reagent];ctx.id=id;ctx.product=product;
  check(`sulfurForward(inputs).some(o=>o.id===id&&o.products.some(p=>moleculeSame(p.fragment||p.smiles,product)))`,true,'Expected forward sulfur substitution: '+product);
  check(`sulfurForward(inputs).filter(o=>o.id===id).every(o=>o.evidence.references.length>0&&!!o.evidence.scope)`,true,'Forward outcome keeps scoped source metadata');
}
for(const inputs of [
  ['CCO','COS(=O)Cl'], // Same formula as mesyl chloride, different sulfur topology.
  ['CN','COS(=O)Cl'],
  ['CCO','ClCS(=O)O'],
  ['CN(C)C','CS(=O)(=O)Cl'],
  ['C[NH3+]','CS(=O)(=O)Cl'],
  ['CCOC','CS(=O)(=O)Cl']
]) {
  ctx.inputs=inputs;
  check(`sulfurForward(inputs).some(o=>['sulfonate','sulfonamide'].includes(o.id))`,false,'Unsupported reagent or nucleophile is excluded: '+inputs.join(' + '));
}
check(`(()=>{const g=reactionFragmentGraph(smilesToFragment('COS(=O)Cl'));return rxSpeciesTag(g,g.atoms.map(a=>a.id))?.tag!=='sulfonylChloride';})()`,true,'Formula isomers cannot masquerade as mesyl chloride');
check(`(()=>{const g=reactionFragmentGraph(smilesToFragment('Clc1ccc(S(=O)(=O)Cl)cc1'));const site=rxySulfonylChlorideSite(g,g.atoms.map(a=>a.id));return !!site&&!!g.getBond(site.s,site.cl)&&rxNeighbors(g,site.cl).length===1;})()`,true,'Leaving chloride is selected from the sulfur bond, not an aryl chloride');
console.log('Reaction expansion round 7: '+checks+' checks passed.');
