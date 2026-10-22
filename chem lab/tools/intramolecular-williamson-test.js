'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..'), ctx = vm.createContext({console, performance, setTimeout, clearTimeout});
const modules = ['elements','graph','valence','stereo','naming-core','naming-chain','naming-ring','naming-scaffolds','naming-general','common-names-extra','naming-elements','properties','layout','smiles','reactions','molecular-identity','reaction-stereo','reaction-rules','reaction-rules-extra','reaction-rules-extra8','reaction-catalog'];
modules.forEach(f => vm.runInContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'),ctx,{filename:f}));
const run = code => vm.runInContext(code,ctx);
run(`function cyPredict(smiles, conditions={}) {
  const result=predictReaction([{smiles,fragment:smilesToFragment(smiles),role:'reactant',equiv:1}],{...defaultReactionConditions(),solvents:['thf'],additives:['nah'],...conditions});
  return [result.best,...result.alternatives].filter(Boolean).find(o=>o.id==='intramolecular-williamson');
}`);
let checks=0;
for (const [substrate, product] of [['OCCCCBr','C1CCOC1'],['OCCCCCCl','C1CCOCC1'],['OCCCCI','C1CCOC1'],['C[C@H](O)CCCBr','C[C@H]1CCCO1'],['O[13CH2]CCCBr','O1[13CH2]CCC1']]) {
  assert.equal(run(`(()=>{const p=cyPredict(${JSON.stringify(substrate)});return !!p && p.products.length===1 && moleculeSame(p.products[0].isomericSmiles||p.products[0].smiles,${JSON.stringify(product)});})()`),true,substrate);checks++;
}
for(const substrate of ['OCCBr','OCCCBr','OCCCCCCBr','OCCCC(Br)C','OCCC(C)(C)CBr','OCCCCF','OCCCCBr.O','OCC(O)CCBr','OCCC(Br)CBr','OCC=CCBr','OCCC(N)CBr','OCCC(=O)CBr','OCC1CCC1Br','[2H]OCCCCBr']) {
  assert.equal(run(`!!cyPredict(${JSON.stringify(substrate)})`),false,'Excluded '+substrate);checks++;
}
for(const conditions of [{additives:[]},{additives:['naoh']},{solvents:['water']},{solvents:['thf','water']},{additives:['nah','hcl']},{solvents:['toluene']}]) {
  assert.equal(run(`!!cyPredict('OCCCCBr',${JSON.stringify(conditions)})`),false,'Missing/incompatible condition '+JSON.stringify(conditions));checks++;
}
assert.equal(run(`!!cyPredict('OCCCCBr',{solvents:['dmf']})`),true);checks++;
assert.equal(run(`reactionRuleDescriptor('intramolecular-williamson').references.length`),2);checks++;
console.log('Intramolecular Williamson: '+checks+' checks passed.');
