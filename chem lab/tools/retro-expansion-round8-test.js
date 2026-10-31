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
run(`function rt8(target,id,rule){
  const graph=retroFromSmiles(target),before=JSON.stringify(graph),t=retroTarget(graph);
  t.edits=[];t.currentTransform=id;
  const specs=RETRO_TRANSFORMS.find(x=>x.id===id).match(t);
  const verified=specs.filter(spec=>{const v=retroTryVerify(spec,t.smiles);return v&&v.outcome.id===rule;});
  return {specs,verified,unchanged:before===JSON.stringify(graph),target:t.smiles};
}`);
let checks = 0;
function check(code, expected, label) { assert.equal(run(code), expected, label); checks++; }
const positives = [
  ['CC(=O)Cl', 'acid-chloride', 'acid-chloride'],
  ['CC(O)C', 'oxymercuration', 'oxymercuration'],
  ['CC=O', 'dibal-ester', 'dibal'],
  ['CC=O', 'dibal-nitrile', 'dibal'],
];
for (const [target, id, rule] of positives) {
  ctx.target = target; ctx.id = id; ctx.rule = rule;
  check('rt8(target,id,rule).specs.length > 0', true, 'Reverse graph edit exists: ' + id);
  check('rt8(target,id,rule).verified.length > 0', true, 'Forward replay verifies the exact target: ' + id);
  check('rt8(target,id,rule).unchanged', true, 'Reverse matching does not mutate the target: ' + id);
}
const negatives = [
  ['CC(=O)O', 'acid-chloride', 'acid-chloride'],
  ['CCCO', 'oxymercuration', 'oxymercuration'],
  ['CC(=O)C', 'dibal-ester', 'dibal'],
  ['CC(=O)C', 'dibal-nitrile', 'dibal'],
  ['CC(O)C', 'dibal-nitrile', 'dibal'],
];
for (const [target, id, rule] of negatives) {
  ctx.target = target; ctx.id = id; ctx.rule = rule;
  check('rt8(target,id,rule).verified.length', 0, 'Unsupported structure or regiochemistry is rejected: ' + id);
}
check(`rt8('CC(=O)Cl','acid-chloride','acid-chloride').verified.every(v=>v.precursors.length===1&&moleculeSame(v.precursors[0].smiles,'CC(=O)O')&&v.reagents.some(r=>r.label==='SOCl2'))`, true, 'Acyl-chloride reverse recovers acetic acid and thionyl chloride');
check(`rt8('CC(O)C','oxymercuration','oxymercuration').verified.every(v=>moleculeSame(v.precursors[0].smiles,'C=CC')&&v.reagents.some(r=>r.label==='Hg(OAc)2')&&v.reagents.some(r=>r.label==='NaBH4'))`, true, 'Oxymercuration reverse recovers propene and both required reagents');
check(`rt8('CC(O)C','oxymercuration','oxymercuration').specs.length===1`, true, 'Symmetric alkene proposals are deduplicated');
check(`rt8('CC=O','dibal-ester','dibal').verified.some(v=>moleculeSame(v.precursors[0].smiles,'CC(=O)OC'))&&rt8('CC=O','dibal-ester','dibal').verified.some(v=>moleculeSame(v.precursors[0].smiles,'CCOC(C)=O'))`, true, 'Cold DIBAL reverse offers both methyl and ethyl ester precursors');
check(`rt8('CC=O','dibal-nitrile','dibal').verified.every(v=>moleculeSame(v.precursors[0].smiles,'CC#N')&&v.conditions.temperature===-78)`, true, 'Nitrile reverse recovers acetonitrile under cold DIBAL conditions');

const routes = [
  ['CC(=O)O', 'CC(=O)Cl', 'acid-chloride'],
  ['C=CC', 'CC(O)C', 'oxymercuration'],
  ['CC(=O)OC', 'CC=O', 'dibal-ester'],
  ['CC#N', 'CC=O', 'dibal-nitrile'],
];
for (const [start, target, id] of routes) {
  ctx.start = start; ctx.target = target; ctx.id = id;
  run(`var routeJob=pathFinderCreate(start,target,{maxDepth:1,maxRoutes:20,budgetMs:10000});while(routeJob.status==='running')routeJob.step(100);`);
  check('routeJob.status', 'found', 'Path Finder connects the endpoints: ' + id);
  check(`routeJob.routeRecipes.some(route=>route.length===1&&route[0].candidate.transform===id&&retroForwardCheck(route[0].candidate,route[0].to))`, true, 'Path Finder route is independently forward-verified: ' + id);
}
console.log('Retro expansion round 8: ' + checks + ' checks passed.');
