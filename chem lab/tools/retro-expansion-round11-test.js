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
run(`function rt11(target,id){
  const graph=retroFromSmiles(target),before=JSON.stringify(graph),t=retroTarget(graph);
  t.edits=[];t.currentTransform=id;
  const specs=RETRO_TRANSFORMS.find(x=>x.id===id).match(t);
  const verified=specs.filter(spec=>{const v=retroTryVerify(spec,t.smiles);return v&&v.outcome.id===id;});
  return {specs,verified,unchanged:before===JSON.stringify(graph),target:t.smiles};
}`);
let checks = 0;
function check(code, expected, label) { assert.equal(run(code), expected, label); checks++; }
const positives = [
  ['CC(=O)CBr', 'alpha-halogenation'],
  ['CC(O)CC(=O)OC', 'reformatsky'],
  ['C1CO1', 'corey-chaykovsky'],
  ['C#C', 'double-elimination'],
];
for (const [target, id] of positives) {
  ctx.target = target; ctx.id = id;
  check('rt11(target,id).specs.length > 0', true, 'Reverse graph edit exists: ' + id);
  check('rt11(target,id).verified.length > 0', true, 'Forward replay verifies the exact target: ' + id);
  check('rt11(target,id).unchanged', true, 'Reverse matching does not mutate the target: ' + id);
}
const negatives = [
  ['CCO', 'alpha-halogenation'],
  ['CC(=O)OC', 'reformatsky'],
  ['C1CCO1', 'corey-chaykovsky'],
  ['CCO', 'corey-chaykovsky'],
  ['C=C', 'double-elimination'],
];
for (const [target, id] of negatives) {
  ctx.target = target; ctx.id = id;
  check('rt11(target,id).verified.length', 0, 'Unsupported substrate class is rejected: ' + id);
}
check(`rt11('CC(=O)CBr','alpha-halogenation').verified.every(v=>moleculeSame(v.precursors[0].smiles,'CC(C)=O')&&v.reagents.some(r=>r.label==='Br2')&&v.reagents.some(r=>r.label==='HCl'))`, true, 'Alpha bromination recovers acetone, bromine and acid catalyst');
check(`rt11('CC(=O)CCl','alpha-halogenation').verified.every(v=>moleculeSame(v.precursors[0].smiles,'CC(C)=O')&&v.reagents.some(r=>r.label==='Cl2'))`, true, 'Alpha chlorination recovers acetone and chlorine');
check(`rt11('CC(O)CC(=O)OC','reformatsky').verified.every(v=>v.precursors.length===2&&v.precursors.some(p=>moleculeSame(p.smiles,'CC=O'))&&v.precursors.some(p=>moleculeSame(p.smiles,'BrCC(=O)OC'))&&v.reagents.some(r=>r.label==='Zn'))`, true, 'Reformatsky reverse recovers acetaldehyde, methyl bromoacetate and zinc');
check(`rt11('C1CO1','corey-chaykovsky').verified.every(v=>moleculeSame(v.precursors[0].smiles,'C=O')&&v.reagents.some(r=>r.label==='Trimethylsulfonium iodide')&&v.reagents.some(r=>r.label==='NaH'))`, true, 'Corey–Chaykovsky reverse recovers formaldehyde and the sulfur-ylide conditions');
check(`rt11('C#C','double-elimination').verified.every(v=>moleculeSame(v.precursors[0].smiles,'BrCCBr')&&v.reagents.some(r=>r.label==='NaNH2'))`, true, 'Double elimination recovers 1,2-dibromoethane and sodamide');

const routes = [
  ['CC(C)=O', 'CC(=O)CBr', 'alpha-halogenation'],
  ['CC=O', 'CC(O)CC(=O)OC', 'reformatsky'],
  ['C=O', 'C1CO1', 'corey-chaykovsky'],
  ['BrCCBr', 'C#C', 'double-elimination'],
];
for (const [start, target, id] of routes) {
  ctx.start = start; ctx.target = target; ctx.id = id;
  run(`var routeJob=pathFinderCreate(start,target,{maxDepth:1,maxRoutes:20,budgetMs:10000});while(routeJob.status==='running')routeJob.step(100);`);
  check('routeJob.status', 'found', 'Path Finder connects the endpoints: ' + id);
  check(`routeJob.routeRecipes.some(route=>route.length===1&&route[0].candidate.transform===id&&retroForwardCheck(route[0].candidate,route[0].to))`, true, 'Path Finder route is independently forward-verified: ' + id);
}
console.log('Retro expansion round 11: ' + checks + ' checks passed.');
