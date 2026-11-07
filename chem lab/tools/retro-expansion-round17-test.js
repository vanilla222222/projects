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
run(`function rt17(target,id){
  const graph=retroFromSmiles(target),before=JSON.stringify(graph),t=retroTarget(graph);
  const requested=computeProperties(graph,graph.atoms.map(a=>a.id)).isomericSmiles;
  t.edits=[];t.currentTransform=id;
  const specs=RETRO_TRANSFORMS.find(x=>x.id===id).match(t);
  const verified=specs.filter(spec=>{const v=retroTryVerify(spec,requested);return !!v&&moleculeSame(v.product.fragment||v.product.isomericSmiles||v.product.smiles,requested);});
  return {specs,verified,unchanged:before===JSON.stringify(graph),target:requested};
}`);
let checks = 0;
function check(code, expected, label) { assert.equal(run(code), expected, label); checks++; }

const positives = [
  ['C1=CCCC1','ring-closing-metathesis'], ['C1=CCCCC1','ring-closing-metathesis'],
  ['C1=CCCCCC1','ring-closing-metathesis'], ['C1=CCCCCCC1','ring-closing-metathesis'],
  ['O1CC=CC1','ring-closing-metathesis'],
  ['C/C=C/C','cross-metathesis'], ['CC/C=C/CC','cross-metathesis'],
  ['C/C=C/C','dissolving-metal'], ['CC/C=C/CC','dissolving-metal'],
  ['OCc1ccccc1','cannizzaro-alcohol'], ['CC(C)(C)CO','cannizzaro-alcohol'], ['CO','cannizzaro-alcohol']
];
for(const [target,id] of positives) {
  ctx.target=target;ctx.id=id;
  check('rt17(target,id).specs.length>0',true,'Reverse proposal exists: '+id+' '+target);
  check('rt17(target,id).verified.length>0',true,'Exact product is forward reproduced: '+id+' '+target);
  check('rt17(target,id).unchanged',true,'Reverse matching preserves its input: '+id);
  check(`rt17(target,id).verified.every(s=>retroTryVerify(s,target).outcome.id===({'ring-closing-metathesis':'rcm','cannizzaro-alcohol':'cannizzaro'}[id]||id))`,true,'Expected forward method is used: '+id);
}
for(const [target,id] of [
  ['C1=CCC1','ring-closing-metathesis'], ['C1=CCCCCCCC1','ring-closing-metathesis'],
  ['CC=CC','ring-closing-metathesis'], ['C1=CCCCC1','cross-metathesis'],
  ['C=C(C)C','cross-metathesis'], ['C=C','dissolving-metal'],
  ['C1=CCCCC1','dissolving-metal'], ['CCO','cannizzaro-alcohol'], ['CC(C)O','cannizzaro-alcohol']
]) {
  ctx.target=target;ctx.id=id;
  check('rt17(target,id).verified.length',0,'Unsupported or non-reproduced target is excluded: '+id+' '+target);
}
for(const id of ['cross-metathesis','dissolving-metal']) {
  ctx.id=id;ctx.target='C/C=C'+String.fromCharCode(92)+'C';
  check('rt17(target,id).verified.length',0,'Encoded trans product cannot exactly reproduce a cis request: '+id);
}
check(`rt17('C1=CCCC1','ring-closing-metathesis').verified.every(s=>s.precursors.length===1&&moleculeSame(s.precursors[0].smiles,'C=CCCCC=C')&&s.conditions.additives.includes('grubbs'))`,true,'Cyclopentene recovers hepta-1,6-diene and Grubbs conditions');
check(`rt17('CC/C=C/CC','cross-metathesis').verified.every(s=>s.precursors.length===2&&s.precursors.every(p=>moleculeSame(p.smiles,'CCC=C')))`,true,'Hex-3-ene reverse retains two but-1-ene reactant entries');
check(`rt17('CC/C=C/CC','dissolving-metal').verified.every(s=>s.precursors.length===1&&moleculeSame(s.precursors[0].smiles,'CCC#CCC')&&s.conditions.additives.includes('nanh3'))`,true,'Trans alkene recovers the internal alkyne and Na/NH3 conditions');
check(`rt17('OCc1ccccc1','cannizzaro-alcohol').verified.every(s=>s.precursors.length===1&&moleculeSame(s.precursors[0].smiles,'O=Cc1ccccc1')&&s.reagents.some(r=>r.label==='NaOH'))`,true,'Cannizzaro recovers benzaldehyde and hydroxide');
check(`rt17('[13CH3]/C=C/C','cross-metathesis').verified.some(s=>s.precursors.some(p=>p.smiles.includes('13C')))`,true,'Metathesis retains isotope-labelled product substituents');

for(const [start,target,id,rule] of [
  ['C=CCCCC=C','C1=CCCC1','ring-closing-metathesis','metathesis'],
  ['CCC=C','CC/C=C/CC','cross-metathesis','metathesis'],
  ['CCC#CCC','CC/C=C/CC','dissolving-metal','dissolving-metal'],
  ['O=Cc1ccccc1','OCc1ccccc1','cannizzaro-alcohol','cannizzaro']
]) {
  ctx.start=start;ctx.target=target;ctx.id=id;ctx.rule=rule;
  run(`var forbiddenRules=RX_RULES.filter(r=>r.id!==rule&&!(rule==='dissolving-metal'&&r.id==='reduction')).map(r=>r.id);var routeJob=pathFinderCreate(start,target,{maxDepth:1,maxRoutes:5,budgetMs:10000,forbiddenRules});while(routeJob.status==='running')routeJob.step(100);`);
  check('routeJob.status','found','Path Finder uses the new method: '+id);
  check(`routeJob.routeRecipes.some(r=>r.length===1&&r[0].candidate.transform===id&&retroForwardCheck(r[0].candidate,r[0].to))`,true,'New planner edge independently replays: '+id);
}
for(const [start,rule] of [['CC=C','metathesis'],['CC#CC','dissolving-metal']]) {
  ctx.start=start;ctx.rule=rule;ctx.target='C/C=C'+String.fromCharCode(92)+'C';
  run(`var forbiddenRules=RX_RULES.filter(r=>r.id!==rule&&!(rule==='dissolving-metal'&&r.id==='reduction')).map(r=>r.id);var cisJob=pathFinderCreate(start,target,{maxDepth:1,budgetMs:10000,forbiddenRules});while(cisJob.status==='running')cisJob.step(100);`);
  check('cisJob.status==="found"',false,'Path Finder rejects a cis target under the encoded trans-only branch: '+rule);
}
for(const [materials,expected] of [[[],'exhausted'],[['CCC=C'],'found']]) {
  ctx.materials=materials;
  run(`var forbiddenRules=RX_RULES.filter(r=>r.id!=='metathesis').map(r=>r.id);var materialJob=pathFinderCreate('CC=C','C/C=C/CC',{maxDepth:1,stockPolicy:'custom',availableMaterials:materials,budgetMs:10000,forbiddenRules});while(materialJob.status==='running')materialJob.step(100);`);
  check('materialJob.status',expected,'Cross-metathesis requires its second partner: '+JSON.stringify(materials));
}
console.log('Retro expansion round 17: '+checks+' checks passed.');
