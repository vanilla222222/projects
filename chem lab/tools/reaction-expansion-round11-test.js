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
run(`function rearrangementForward(inputs,conditions={}) {
  const compounds=inputs.map((smiles,i)=>({smiles,fragment:smilesToFragment(smiles),role:i?'reagent':'reactant',equiv:'1'}));
  const result=predictReaction(compounds,{...defaultReactionConditions(),temperature:25,...conditions});
  return {compounds,outcomes:[result.best,...result.alternatives].filter(Boolean)};
}`);
for(const [inputs,conditions,id,product] of [
  [['CC(O)(C)C(O)(C)C'],{solvents:['water'],additives:['h2so4']},'pinacol','CC(=O)C(C)(C)C'],
  [['CC(O)C(O)(C)C'],{solvents:['water'],additives:['h2so4']},'pinacol','CC(=O)C(C)C'],
  [['c1ccccc1'],{solvents:['ethanol'],additives:['nanh3'],temperature:-33},'birch','C1=CCC=CC1'],
  [['COc1ccccc1'],{solvents:['ethanol'],additives:['nanh3'],temperature:-33},'birch','COC1=CCC=CC1'],
  [['CCBr'],{solvents:['ether'],additives:['mg'],atmosphere:'n2'},'grignard-formation','CC[Mg]Br'],
  [['CC(C)=O','II','[OH-]'],{solvents:['water']},'haloform','CC(=O)[O-]']
]) {
  ctx.inputs=inputs;ctx.conditions=conditions;ctx.id=id;ctx.product=product;
  run(`var rearrangementResults=rearrangementForward(inputs,conditions);`);
  check(`rearrangementResults.outcomes.some(o=>o.id===id&&o.products.some(p=>moleculeSame(p.fragment||p.smiles,product)))`,true,'Expected forward product: '+id);
  check(`rearrangementResults.outcomes.filter(o=>o.id===id).every(o=>o.evidence.references.length>0&&!!o.evidence.scope)`,true,'Forward method retains its sourced scope: '+id);
}
for(const [inputs,conditions,id] of [
  [['CC(O)(C)C(O)(C)C'],{solvents:['water']},'pinacol'],
  [['OCCO'],{additives:['h2so4']},'pinacol'],
  [['c1ccccc1'],{solvents:['ether'],additives:['nanh3']},'birch'],
  [['c1ccccc1'],{solvents:['ethanol']},'birch'],
  [['OCCBr'],{solvents:['ether'],additives:['mg']},'grignard-formation'],
  [['NCCBr'],{solvents:['ether'],additives:['mg']},'grignard-formation'],
  [['CCBr'],{solvents:['ethanol'],additives:['mg']},'grignard-formation'],
  [['CCC(=O)CC','II','[OH-]'],{solvents:['water']},'haloform']
]) {
  ctx.inputs=inputs;ctx.conditions=conditions;ctx.id=id;
  check(`rearrangementForward(inputs,conditions).outcomes.some(o=>o.id===id)`,false,'Unsupported forward substrate/conditions are excluded: '+id+' '+inputs.join(' + '));
}
run(`var labelledCleavage=rearrangementForward(['[13CH3]C(=O)c1ccccc1','II','[OH-]'],{solvents:['water']}).outcomes.find(o=>o.id==='haloform');`);
check(`labelledCleavage.products.some(p=>moleculeSame(p.fragment||p.smiles,'[13CH](I)(I)I'))`,true,'The original labelled methyl carbon becomes labelled iodoform');
check(`labelledCleavage.products.some(p=>moleculeSame(p.fragment||p.smiles,'O=C([O-])c1ccccc1'))`,true,'Methyl-carbon label does not leak into the carboxylate');
check(`labelledCleavage.products.reduce((n,p)=>n+reactionFragmentGraph(reactionProductFragment(p)).atoms.filter(a=>a.element==='C'&&a.isotope===13).length*p.count,0)`,1,'The methyl-carbon label is retained exactly once across products');
check(`rearrangementForward(['C[13C](=O)c1ccccc1','II','[OH-]'],{solvents:['water']}).outcomes.find(o=>o.id==='haloform').products.some(p=>moleculeSame(p.fragment||p.smiles,'O=[13C]([O-])c1ccccc1'))`,true,'A carbonyl-carbon label remains on the carboxylate');
check(`labelledCleavage.products.length===2&&labelledCleavage.products.every(p=>p.count===1)`,true,'Haloform and carboxylate remain separate product entries');
console.log('Reaction expansion round 11: '+checks+' checks passed.');
