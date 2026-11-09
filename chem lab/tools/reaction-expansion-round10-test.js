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
run(`function olefinForward(inputs,conditions={}) {
  const compounds=inputs.map((smiles,i)=>({smiles,fragment:smilesToFragment(smiles),role:i?'reagent':'reactant',equiv:'1'}));
  const result=predictReaction(compounds,{...defaultReactionConditions(),temperature:25,...conditions});
  return {compounds,outcomes:[result.best,...result.alternatives].filter(Boolean)};
}`);
for(const [inputs,conditions,id,product] of [
  [['C=CCCCC=C'],{solvents:['dcm'],additives:['grubbs']},'rcm','C1=CCCC1'],
  [['C=CCCCCC=C'],{solvents:['dcm'],additives:['grubbs']},'rcm','C1=CCCCC1'],
  [['CC=C','CCC=C'],{solvents:['dcm'],additives:['grubbs']},'cross-metathesis','C/C=C/CC'],
  [['CCC#CCC'],{additives:['nanh3'],temperature:-33},'dissolving-metal','CC/C=C/CC'],
  [['O=Cc1ccccc1','[Na+].[OH-]'],{solvents:['water']},'cannizzaro','OCc1ccccc1']
]) {
  ctx.inputs=inputs;ctx.conditions=conditions;ctx.id=id;ctx.product=product;
  run(`var olefinResults=olefinForward(inputs,conditions);`);
  check(`olefinResults.outcomes.some(o=>o.id===id&&o.products.some(p=>moleculeSame(p.fragment||p.smiles,product)))`,true,'Expected forward product: '+id);
  check(`olefinResults.outcomes.filter(o=>o.id===id).every(o=>o.evidence.references.length>0&&!!o.evidence.scope)`,true,'Forward method retains its sourced scope: '+id);
}
for(const [inputs,conditions,id] of [
  [['C=CCCCC=C'],{solvents:['dcm']},'rcm'],
  [['CC=C','CCC=C'],{solvents:['dcm']},'cross-metathesis'],
  [['C=CCCC=C'],{solvents:['dcm'],additives:['grubbs']},'rcm'],
  [['CCC#C'],{additives:['nanh3']},'dissolving-metal'],
  [['CC=CC'],{additives:['nanh3']},'dissolving-metal'],
  [['CC=O','[Na+].[OH-]'],{solvents:['water']},'cannizzaro']
]) {
  ctx.inputs=inputs;ctx.conditions=conditions;ctx.id=id;
  check(`olefinForward(inputs,conditions).outcomes.some(o=>o.id===id)`,false,'Unsupported forward conditions/substrate are excluded: '+id+' '+inputs.join(' + '));
}
run(`var labelledCannizzaro=olefinForward(['O=Cc1ccccc1','[Na+].[18OH-]'],{solvents:['water']});var labelledOutcome=labelledCannizzaro.outcomes.find(o=>o.id==='cannizzaro');`);
check(`labelledOutcome.products.some(p=>moleculeSame(p.fragment||p.smiles,'[Na+].[18O-]C(=O)c1ccccc1'))`,true,'Hydroxide oxygen label enters the carboxylate coproduct');
check(`labelledOutcome.products.some(p=>moleculeSame(p.fragment||p.smiles,'OCc1ccccc1'))`,true,'Alcohol product remains unlabelled when the label is only on hydroxide');
check(`labelledOutcome.consumes.find(x=>x.compound===labelledCannizzaro.compounds[0]).need`,2,'Cannizzaro requires two aldehyde equivalents');
check(`labelledOutcome.products.length===2&&labelledOutcome.products.every(p=>p.count===1)`,true,'One alcohol and one carboxylate are retained as separate products');
check(`olefinForward(['O=Cc1ccccc1'],{solvents:['water'],additives:['naoh']}).outcomes.some(o=>o.id==='cannizzaro')`,true,'Condition-additive hydroxide remains supported');
check(`(()=>{const out=olefinForward(['[18O]=Cc1ccccc1','[Na+].[18OH-]'],{solvents:['water']}).outcomes.find(o=>o.id==='cannizzaro');return out.products.reduce((n,p)=>n+reactionFragmentGraph(reactionProductFragment(p)).atoms.filter(a=>a.element==='O'&&a.isotope===18).length*p.count,0);})()`,3,'Two aldehyde oxygen labels plus one hydroxide oxygen label survive in the two products');
console.log('Reaction expansion round 10: '+checks+' checks passed.');
