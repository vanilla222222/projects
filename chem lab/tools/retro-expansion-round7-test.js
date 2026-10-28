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
run(`function rt7(target,id){
  const graph=retroFromSmiles(target),before=JSON.stringify(graph),t=retroTarget(graph);
  t.edits=[];t.currentTransform=id;
  const specs=RETRO_TRANSFORMS.find(x=>x.id===id).match(t);
  const verified=specs.filter(spec=>{const v=retroTryVerify(spec,t.smiles);return v&&v.outcome.id===id;});
  return {specs,verified,unchanged:before===JSON.stringify(graph),target:t.smiles};
}`);
let checks = 0;
function check(code, expected, label) { assert.equal(run(code), expected, label); checks++; }
const positives = [
  ['O=C(O)c1ccccc1', 'grignard-carboxylation'],
  ['C#CC(O)c1ccccc1', 'acetylide-addition'],
  ['CC(=O)c1ccccc1', 'alkyne-hydration'],
  ['CC(O)CBr', 'halohydrin'],
];
for (const [target, id] of positives) {
  ctx.target = target; ctx.id = id;
  check('rt7(target,id).specs.length > 0', true, 'Reverse graph edit exists: ' + id);
  check('rt7(target,id).verified.length > 0', true, 'Forward replay verifies the exact target: ' + id);
  check('rt7(target,id).unchanged', true, 'Reverse matching does not mutate the target: ' + id);
}
const negatives = [
  ['O=C(O)O', 'grignard-carboxylation'],
  ['CCO', 'acetylide-addition'],
  ['CCO', 'alkyne-hydration'],
  ['CC(O)CCBr', 'halohydrin'],
  ['CC(Br)CO', 'halohydrin'],
];
for (const [target, id] of negatives) {
  ctx.target = target; ctx.id = id;
  check('rt7(target,id).verified.length', 0, 'Unsupported structure or regiochemistry is rejected: ' + id);
}
check(`rt7('O=C(O)c1ccccc1','grignard-carboxylation').verified.every(v=>v.precursors.some(p=>moleculeSame(p.smiles,'O=C=O'))&&v.precursors.some(p=>p.smiles.includes('Mg')))`, true, 'Carboxylation recovers carbon dioxide and the Grignard reagent');
check(`rt7('C#CC(O)c1ccccc1','acetylide-addition').verified.every(v=>v.precursors.length===2&&v.precursors.some(p=>moleculeSame(p.smiles,'C#C'))&&v.precursors.some(p=>moleculeSame(p.smiles,'O=Cc1ccccc1')))`, true, 'Acetylide addition recovers acetylene and benzaldehyde');
check(`rt7('CC(=O)c1ccccc1','alkyne-hydration').verified.every(v=>moleculeSame(v.precursors[0].smiles,'C#Cc1ccccc1'))`, true, 'Alkyne hydration recovers phenylacetylene');
check(`rt7('CC(O)CBr','halohydrin').verified.every(v=>moleculeSame(v.precursors[0].smiles,'C=CC')&&v.reagents.some(r=>r.smiles==='BrBr')&&v.reagents.some(r=>r.smiles==='O'))`, true, 'Halohydrin reverse recovers propene, bromine and water');
check(`stockTier('O=C=O').tier===1&&stockTier('O=C=O').source==='builtin'`, true, 'Carbon dioxide is available as a common built-in feedstock');

const routes = [
  ['Br[Mg]c1ccccc1', 'O=C(O)c1ccccc1', 'grignard-carboxylation'],
  ['C#C', 'C#CC(O)c1ccccc1', 'acetylide-addition'],
  ['C#Cc1ccccc1', 'CC(=O)c1ccccc1', 'alkyne-hydration'],
  ['C=CC', 'CC(O)CBr', 'halohydrin'],
];
for (const [start, target, id] of routes) {
  ctx.start = start; ctx.target = target; ctx.id = id;
  run(`var routeJob=pathFinderCreate(start,target,{maxDepth:1,maxRoutes:1,budgetMs:10000});while(routeJob.status==='running')routeJob.step(100);`);
  check('routeJob.status', 'found', 'Path Finder connects the endpoints: ' + id);
  check(`routeJob.routes.some(route=>route.length===1&&route[0].candidate.transform===id&&retroForwardCheck(route[0].candidate,route[0].to))`, true, 'Path Finder route is independently forward-verified: ' + id);
}
console.log('Retro expansion round 7: ' + checks + ' checks passed.');
