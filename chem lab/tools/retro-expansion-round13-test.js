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
run(`function rt13(target,id){
  const graph=retroFromSmiles(target),before=JSON.stringify(graph),t=retroTarget(graph);
  const requested=computeProperties(graph,graph.atoms.map(a=>a.id)).isomericSmiles;
  t.edits=[];t.currentTransform=id;
  const specs=RETRO_TRANSFORMS.find(x=>x.id===id).match(t);
  const verified=specs.filter(spec=>!!retroTryVerify(spec,requested));
  return {specs,verified,unchanged:before===JSON.stringify(graph),target:requested};
}`);
let checks = 0;
function check(code, expected, label) { assert.equal(run(code), expected, label); checks++; }

const positives = [
  ['CC(O)CN(=O)=O', 'henry'],
  ['CC=CC(C)O', 'luche'],
  ['NCCc1ccccc1', 'hofmann-rearrangement'],
  ['CCOC(C)=O', 'mitsunobu'],
];
for (const [target, id] of positives) {
  ctx.target = target; ctx.id = id;
  check('rt13(target,id).specs.length > 0', true, 'Reverse graph edit exists: ' + id);
  check('rt13(target,id).verified.length > 0', true, 'Forward replay verifies the exact target: ' + id);
  check('rt13(target,id).unchanged', true, 'Reverse matching does not mutate the target: ' + id);
}

const negatives = [
  ['CC(O)CC', 'henry'],
  ['CC(C)O', 'luche'],
  ['CN(C)C', 'hofmann-rearrangement'],
  ['CC(=O)OC(C)(C)C', 'mitsunobu'],
];
for (const [target, id] of negatives) {
  ctx.target = target; ctx.id = id;
  check('rt13(target,id).verified.length', 0, 'Unsupported substrate is rejected: ' + id);
}

check(`rt13('CC(O)CN(=O)=O','henry').verified.every(v=>v.precursors.length===2&&v.precursors.some(p=>moleculeSame(p.smiles,'CC=O'))&&v.precursors.some(p=>moleculeSame(p.smiles,'CN(=O)=O')))`, true, 'Henry recovers acetaldehyde and nitromethane');
check(`rt13('CC=CC(C)O','luche').verified.every(v=>v.precursors.length===1&&moleculeSame(v.precursors[0].smiles,'CC=CC(C)=O')&&v.reagents.some(r=>r.label==='NaBH4')&&v.reagents.some(r=>r.label==='CeCl3'))`, true, 'Luche recovers the enone without reducing the alkene');
check(`rt13('NCCc1ccccc1','hofmann-rearrangement').verified.every(v=>v.precursors.length===1&&moleculeSame(v.precursors[0].smiles,'NC(=O)CCc1ccccc1')&&v.reagents.some(r=>r.label==='Br2')&&v.reagents.some(r=>r.label==='NaOH'))`, true, 'Hofmann recovers the one-carbon-longer primary amide');
check(`rt13('CCOC(C)=O','mitsunobu').verified.every(v=>v.precursors.length===2&&v.precursors.some(p=>moleculeSame(p.smiles,'CCO'))&&v.precursors.some(p=>moleculeSame(p.smiles,'CC(=O)O'))&&v.reagents.some(r=>r.label==='PPh3')&&v.reagents.some(r=>r.label==='DEAD'))`, true, 'Mitsunobu recovers ethanol, acetic acid and its coupling reagents');

const routes = [
  ['CC=O', 'CC(O)CN(=O)=O', 'henry', []],
  ['CC=CC(C)=O', 'CC=CC(C)O', 'luche', []],
  ['NC(=O)CCc1ccccc1', 'NCCc1ccccc1', 'hofmann-rearrangement', []],
  ['CCO', 'CCOC(C)=O', 'mitsunobu', ['fischer', 'acyl']],
];
for (const [start, target, id, forbiddenRules] of routes) {
  ctx.start = start; ctx.target = target; ctx.id = id; ctx.forbiddenRules = forbiddenRules;
  run(`var routeJob=pathFinderCreate(start,target,{maxDepth:1,maxRoutes:20,budgetMs:10000,forbiddenRules});while(routeJob.status==='running')routeJob.step(100);`);
  check('routeJob.status', 'found', 'Path Finder connects the endpoints: ' + id);
  check(`routeJob.routes.some(route=>route.length===1&&route[0].candidate.transform===id&&retroForwardCheck(route[0].candidate,route[0].to))`, true, 'Path Finder route is independently forward-verified: ' + id);
}
console.log('Retro expansion round 13: ' + checks + ' checks passed.');

