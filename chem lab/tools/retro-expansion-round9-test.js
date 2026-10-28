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
run(`function rt9(target,id){
  const graph=retroFromSmiles(target),before=JSON.stringify(graph),t=retroTarget(graph);
  t.edits=[];t.currentTransform=id;
  const specs=RETRO_TRANSFORMS.find(x=>x.id===id).match(t);
  const verified=specs.filter(spec=>{const v=retroTryVerify(spec,t.smiles);return v&&v.outcome.id===id;});
  return {specs,verified,unchanged:before===JSON.stringify(graph),target:t.smiles};
}`);
let checks = 0;
function check(code, expected, label) { assert.equal(run(code), expected, label); checks++; }
const positives = [
  ['CC(=O)c1ccccc1', 'grignard-nitrile'],
  ['CC#CC', 'acetylide-alkylation'],
  ['CCOC(=O)C(C#N)=Cc1ccccc1', 'knoevenagel'],
  ['CC(=O)O', 'amide-hydrolysis'],
];
for (const [target, id] of positives) {
  ctx.target = target; ctx.id = id;
  check('rt9(target,id).specs.length > 0', true, 'Reverse graph edit exists: ' + id);
  check('rt9(target,id).verified.length > 0', true, 'Forward replay verifies the exact target: ' + id);
  check('rt9(target,id).unchanged', true, 'Reverse matching does not mutate the target: ' + id);
}
const negatives = [
  ['O=Cc1ccccc1', 'grignard-nitrile'],
  ['CC(C)C#CC(C)C', 'acetylide-alkylation'],
  ['C=Cc1ccccc1', 'knoevenagel'],
  ['CCOC(C)=O', 'amide-hydrolysis'],
  ['CC(N)=O', 'amide-hydrolysis'],
];
for (const [target, id] of negatives) {
  ctx.target = target; ctx.id = id;
  check('rt9(target,id).verified.length', 0, 'Unsupported substrate class is rejected: ' + id);
}
check(`rt9('CC(=O)c1ccccc1','grignard-nitrile').verified.some(v=>v.precursors.some(p=>moleculeSame(p.smiles,'CC#N'))&&v.precursors.some(p=>moleculeSame(p.smiles,'Br[Mg]c1ccccc1')))`, true, 'Nitrile–Grignard reverse recovers acetonitrile and phenylmagnesium bromide');
check(`rt9('CC(=O)c1ccccc1','grignard-nitrile').verified.some(v=>v.precursors.some(p=>moleculeSame(p.smiles,'N#Cc1ccccc1'))&&v.precursors.some(p=>p.smiles.includes('Mg')))`, true, 'The alternative nitrile–Grignard disconnection is retained');
check(`rt9('CC#CC','acetylide-alkylation').specs.length===1&&rt9('CC#CC','acetylide-alkylation').verified.every(v=>v.precursors.some(p=>moleculeSame(p.smiles,'CC#C'))&&v.precursors.some(p=>moleculeSame(p.smiles,'CBr')))`, true, 'Acetylide alkylation is deduplicated and recovers propyne plus methyl bromide');
check(`rt9('CCOC(=O)C(C#N)=Cc1ccccc1','knoevenagel').verified.every(v=>v.precursors.some(p=>moleculeSame(p.smiles,'O=Cc1ccccc1'))&&v.precursors.some(p=>moleculeSame(p.smiles,'CCOC(=O)CC#N')))`, true, 'Knoevenagel reverse recovers benzaldehyde and ethyl cyanoacetate');
check(`rt9('CC(=O)O','amide-hydrolysis').verified.every(v=>moleculeSame(v.precursors[0].smiles,'CC(N)=O')&&v.conditions.temperature===100)`, true, 'Amide hydrolysis recovers acetamide under heated acidic conditions');

const routes = [
  ['N#Cc1ccccc1', 'CC(=O)c1ccccc1', 'grignard-nitrile'],
  ['CBr', 'CC#CC', 'acetylide-alkylation'],
  ['CCOC(=O)CC#N', 'CCOC(=O)C(C#N)=Cc1ccccc1', 'knoevenagel'],
  ['CC(N)=O', 'CC(=O)O', 'amide-hydrolysis'],
];
for (const [start, target, id] of routes) {
  ctx.start = start; ctx.target = target; ctx.id = id;
  run(`var routeJob=pathFinderCreate(start,target,{maxDepth:1,maxRoutes:20,budgetMs:10000});while(routeJob.status==='running')routeJob.step(100);`);
  check('routeJob.status', 'found', 'Path Finder connects the endpoints: ' + id);
  check(`routeJob.routes.some(route=>route.length===1&&route[0].candidate.transform===id&&retroForwardCheck(route[0].candidate,route[0].to))`, true, 'Path Finder route is independently forward-verified: ' + id);
}
console.log('Retro expansion round 9: ' + checks + ' checks passed.');
