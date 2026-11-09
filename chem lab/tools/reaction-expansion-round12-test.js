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
run(`function nitrogenEtherForward(inputs,conditions={}) {
  const compounds=inputs.map((smiles,i)=>({smiles,fragment:smilesToFragment(smiles),role:i?'reagent':'reactant',equiv:'1'}));
  const result=predictReaction(compounds,{...defaultReactionConditions(),temperature:25,...conditions});
  return [result.best,...result.alternatives].filter(Boolean);
}
const etherPph3='P(c1ccccc1)(c1ccccc1)c1ccccc1',etherDead='CCOC(=O)N=NC(=O)OCC';
`);
for(const [inputs,conditions,id,product] of [
  [['CC(C)=O','CN'],{solvents:['toluene']},'imine','CC(C)=NC'],
  [['CC=[18O]','CN'],{solvents:['toluene']},'imine','CC=NC'],
  [['CC(C)=O','[15NH2]C'],{solvents:['toluene']},'imine','CC(C)=[15N]C'],
  [['CC(C)=O','CNC'],{solvents:['toluene']},'enamine','C=C(C)N(C)C'],
  [['CC(C)=O','[15NH](C)C'],{solvents:['toluene']},'enamine','C=C(C)[15N](C)C'],
  [['CCCC[N+](C)(C)C','[Na+].[OH-]'],{solvents:['water'],temperature:140},'hofmann-elimination','CCC=C']
]) {
  ctx.inputs=inputs;ctx.conditions=conditions;ctx.id=id;ctx.product=product;
  run(`var familyResults=nitrogenEtherForward(inputs,conditions);`);
  check(`familyResults.some(o=>o.id===id&&o.products.some(p=>moleculeSame(p.fragment||p.smiles,product)))`,true,'Expected forward product and isotope identity: '+id+' '+inputs.join(' + '));
  check(`familyResults.filter(o=>o.id===id).every(o=>o.evidence.references.length>0&&!!o.evidence.scope)`,true,'Forward method retains its sourced scope: '+id);
}
for(const [alcohol,phenol,product] of [
  ['CCO','Oc1ccccc1','CCOc1ccccc1'],
  ['CCO','[18OH]c1ccccc1','CC[18O]c1ccccc1'],
  ['CC[18OH]','Oc1ccccc1','CCOc1ccccc1'],
  ['C[C@H](O)CC','Oc1ccccc1','C[C@@H](Oc1ccccc1)CC']
]) {
  ctx.alcohol=alcohol;ctx.phenol=phenol;ctx.product=product;
  check(`nitrogenEtherForward([alcohol,phenol,etherPph3,etherDead],{solvents:['thf']}).some(o=>o.id==='mitsunobu'&&o.products.some(p=>moleculeSame(p.fragment||p.smiles,product)))`,true,'Mitsunobu ether preserves oxygen origin and encoded inversion: '+alcohol+' + '+phenol);
}
for(const [inputs,conditions,id] of [
  [['CC(C)=O','CN(C)C'],{solvents:['toluene']},'imine'],
  [['O=Cc1ccccc1','CNC'],{solvents:['toluene']},'enamine'],
  [['CCCC[N+](C)(C)C'],{solvents:['water'],temperature:140},'hofmann-elimination'],
  [['C[N+](C)(C)C','[Na+].[OH-]'],{solvents:['water'],temperature:140},'hofmann-elimination']
]) {
  ctx.inputs=inputs;ctx.conditions=conditions;ctx.id=id;
  check(`nitrogenEtherForward(inputs,conditions).some(o=>o.id===id)`,false,'Unsupported substrate or missing reagent is excluded: '+id);
}
check(`nitrogenEtherForward(['CC(C)(C)O','Oc1ccccc1',etherPph3,etherDead],{solvents:['thf']}).some(o=>o.id==='mitsunobu')`,false,'Tertiary alcohol is excluded from Mitsunobu substitution');
check(`nitrogenEtherForward(['CCO','Oc1ccccc1',etherPph3],{solvents:['thf']}).some(o=>o.id==='mitsunobu')`,false,'Missing azo reagent cannot give a Mitsunobu ether');
check(`nitrogenEtherForward(['CCCC[15N+](C)(C)C','[Na+].[OH-]'],{solvents:['water'],temperature:140}).some(o=>o.id==='hofmann-elimination'&&o.products.some(p=>moleculeSame(p.fragment||p.smiles,'[15N](C)(C)C')))`,true,'The labelled ammonium nitrogen remains in the amine coproduct');
console.log('Reaction expansion round 12: '+checks+' checks passed.');
