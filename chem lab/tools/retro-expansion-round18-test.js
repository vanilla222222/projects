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
run(`function rt18(target,id){
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
  ['CC(=O)C(C)(C)C','pinacol'], ['CC(=O)C(C)C','pinacol'],
  ['C1=CCC=CC1','birch'], ['COC1=CCC=CC1','birch'], ['CC1=CCC=CC1','birch'],
  ['CC[Mg]Br','grignard-formation'], ['C[Mg]I','grignard-formation'],
  ['Br[Mg]c1ccccc1','grignard-formation'], ['[13CH3]C[Mg]Br','grignard-formation'],
  ['CC(=O)[O-]','haloform-carboxylate'], ['O=C([O-])c1ccccc1','haloform-carboxylate']
];
for(const [target,id] of positives) {
  ctx.target=target;ctx.id=id;
  check('rt18(target,id).specs.length>0',true,'Reverse proposal exists: '+id+' '+target);
  check('rt18(target,id).verified.length>0',true,'Exact target is forward reproduced: '+id+' '+target);
  check('rt18(target,id).unchanged',true,'Reverse matching preserves its input: '+id);
  check(`rt18(target,id).verified.every(s=>retroTryVerify(s,target).outcome.id===(id==='haloform-carboxylate'?'haloform':id))`,true,'Intended forward method is used: '+id);
}
for(const [target,id] of [
  ['CC(C)=O','pinacol'], ['CCOC(C)=O','pinacol'],
  ['C1=CC=CCC1','birch'], ['C1CCCCC1','birch'], ['c1ccccc1','birch'],
  ['Br[Mg]Br','grignard-formation'], ['OCC[Mg]Br','grignard-formation'],
  ['CC(=O)O','haloform-carboxylate'], ['O=C[O-]','haloform-carboxylate'],
  ['CC(=O)[O-].[Na+]','haloform-carboxylate']
]) {
  ctx.target=target;ctx.id=id;
  check('rt18(target,id).verified.length',0,'Unsupported or non-reproduced target is excluded: '+id+' '+target);
}
check(`rt18('CC(=O)C(C)(C)C','pinacol').verified.some(s=>moleculeSame(s.precursors[0].smiles,'CC(O)(C)C(O)(C)C'))`,true,'Pinacolone recovers pinacol');
check(`rt18('CC(=O)C(C)C','pinacol').verified.some(s=>moleculeSame(s.precursors[0].smiles,'CC(O)C(O)(C)C'))`,true,'Hydride-shift proposal recovers the vicinal diol');
check(`rt18('COC1=CCC=CC1','birch').verified.every(s=>moleculeSame(s.precursors[0].smiles,'COc1ccccc1')&&s.conditions.additives.includes('nanh3')&&s.conditions.solvents.includes('ethanol'))`,true,'Birch recovers anisole with both encoded reductant and alcohol solvent');
check(`rt18('CC[Mg]Br','grignard-formation').verified.every(s=>moleculeSame(s.precursors[0].smiles,'CCBr')&&s.conditions.additives.includes('mg')&&s.conditions.solvents.includes('ether'))`,true,'Magnesium insertion recovers bromoethane and ether conditions');
check(`rt18('CC(=O)[O-]','haloform-carboxylate').verified.every(s=>moleculeSame(s.precursors[0].smiles,'CC(C)=O')&&s.reagents.some(r=>r.label==='I2')&&s.reagents.some(r=>r.smiles==='[OH-]'))`,true,'Haloform reverse uses the ketone, iodine and explicit hydroxide without inventing a counterion');

for(const [start,target,id] of [
  ['CC(O)(C)C(O)(C)C','CC(=O)C(C)(C)C','pinacol'],
  ['c1ccccc1','C1=CCC=CC1','birch'],
  ['CCBr','CC[Mg]Br','grignard-formation'],
  ['CC(C)=O','CC(=O)[O-]','haloform-carboxylate']
]) {
  ctx.start=start;ctx.target=target;ctx.id=id;
  run(`var routeJob=pathFinderCreate(start,target,{maxDepth:1,maxRoutes:5,budgetMs:10000});while(routeJob.status==='running')routeJob.step(100);`);
  check('routeJob.status','found','Path Finder uses the new method: '+id);
  check(`routeJob.routes.some(r=>r.length===1&&r[0].candidate.transform===id&&retroForwardCheck(r[0].candidate,r[0].to))`,true,'New planner edge independently replays: '+id);
}
run(`var magnesiumBlocked=pathFinderCreate('CCBr','CC[Mg]Br',{maxDepth:1,budgetMs:10000,forbiddenReagents:['Mg']});while(magnesiumBlocked.status==='running')magnesiumBlocked.step(100);`);
check('magnesiumBlocked.status==="found"',false,'Magnesium exclusion blocks the preparation step');
console.log('Retro expansion round 18: '+checks+' checks passed.');
