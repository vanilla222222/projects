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
run(`function rt10(target,id){
  const graph=retroFromSmiles(target),before=JSON.stringify(graph),t=retroTarget(graph);
  t.edits=[];t.currentTransform=id;
  const specs=RETRO_TRANSFORMS.find(x=>x.id===id).match(t);
  const verified=specs.filter(spec=>{const v=retroTryVerify(spec,t.smiles);return v&&v.outcome.id===id;});
  return {specs,verified,unchanged:before===JSON.stringify(graph),target:t.smiles};
}`);
let checks = 0;
function check(code, expected, label) { assert.equal(run(code), expected, label); checks++; }
const positives = [
  ['C1CO1', 'epoxide-closure'],
  ['CC#N', 'amide-dehydration'],
  ['CC(=O)O', 'pinnick'],
  ['CC(=O)O', 'ester-hydrolysis'],
];
for (const [target, id] of positives) {
  ctx.target = target; ctx.id = id;
  check('rt10(target,id).specs.length > 0', true, 'Reverse graph edit exists: ' + id);
  check('rt10(target,id).verified.length > 0', true, 'Forward replay verifies the exact target: ' + id);
  check('rt10(target,id).unchanged', true, 'Reverse matching does not mutate the target: ' + id);
}
const negatives = [
  ['CCO', 'epoxide-closure'],
  ['CC(N)=O', 'amide-dehydration'],
  ['CC(=O)C', 'pinnick'],
  ['CCOC(C)=O', 'ester-hydrolysis'],
  ['CCO', 'ester-hydrolysis'],
];
for (const [target, id] of negatives) {
  ctx.target = target; ctx.id = id;
  check('rt10(target,id).verified.length', 0, 'Unsupported substrate class is rejected: ' + id);
}
check(`rt10('C1CO1','epoxide-closure').specs.length===1&&rt10('C1CO1','epoxide-closure').verified.every(v=>moleculeSame(v.precursors[0].smiles,'OCCBr')&&v.reagents.some(r=>r.label==='NaOH'))`, true, 'Epoxide reverse is deduplicated and recovers 2-bromoethanol plus base');
check(`rt10('CC#N','amide-dehydration').verified.every(v=>moleculeSame(v.precursors[0].smiles,'CC(N)=O')&&v.reagents.some(r=>r.label==='SOCl2'))`, true, 'Nitrile reverse recovers acetamide and thionyl chloride');
check(`rt10('CC(=O)O','pinnick').verified.every(v=>moleculeSame(v.precursors[0].smiles,'CC=O')&&v.conditions.additives.includes('naclo2'))`, true, 'Pinnick reverse recovers acetaldehyde and the sodium-chlorite additive');
check(`rt10('CC(=O)O','ester-hydrolysis').verified.some(v=>moleculeSame(v.precursors[0].smiles,'CC(=O)OC'))&&rt10('CC(=O)O','ester-hydrolysis').verified.some(v=>moleculeSame(v.precursors[0].smiles,'CCOC(C)=O'))`, true, 'Ester hydrolysis offers both methyl and ethyl ester precursors');
check(`rt10('CC(=O)O','ester-hydrolysis').verified.every(v=>v.conditions.temperature===100&&v.reagents.some(r=>r.label==='HCl'))`, true, 'Acidic ester hydrolysis retains its heated aqueous-acid conditions');

const routes = [
  ['OCCBr', 'C1CO1', 'epoxide-closure'],
  ['CC(N)=O', 'CC#N', 'amide-dehydration'],
  ['CC=O', 'CC(=O)O', 'pinnick'],
  ['CC(=O)OC', 'CC(=O)O', 'ester-hydrolysis'],
];
for (const [start, target, id] of routes) {
  ctx.start = start; ctx.target = target; ctx.id = id;
  run(`var routeJob=pathFinderCreate(start,target,{maxDepth:1,maxRoutes:20,budgetMs:10000});while(routeJob.status==='running')routeJob.step(100);`);
  check('routeJob.status', 'found', 'Path Finder connects the endpoints: ' + id);
  check(`routeJob.routeRecipes.some(route=>route.length===1&&route[0].candidate.transform===id&&retroForwardCheck(route[0].candidate,route[0].to))`, true, 'Path Finder pathway is independently forward-verified (recipe variants grouped): ' + id);
}
console.log('Retro expansion round 10: ' + checks + ' checks passed.');
