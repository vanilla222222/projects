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
run(`function rt19(target,id){
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
  ['CC(C)=NC','imine-formation'], ['CC=NC','imine-formation'], ['CN=C1CCCCC1','imine-formation'],
  ['CC(C)=[15N]C','imine-formation'],
  ['C=C(C)N(C)C','enamine-formation'], ['C=CN(C)C','enamine-formation'], ['C1=C(N2CCCC2)CCCC1','enamine-formation'],
  ['CCOc1ccccc1','mitsunobu-ether'], ['COc1ccccc1','mitsunobu-ether'], ['CC[18O]c1ccccc1','mitsunobu-ether'],
  ['CCC=C','hofmann-elimination'], ['C=C(C)C','hofmann-elimination'], ['C=C','hofmann-elimination']
];
for(const [target,id] of positives) {
  ctx.target=target;ctx.id=id;
  check('rt19(target,id).specs.length>0',true,'Reverse proposal exists: '+id+' '+target);
  check('rt19(target,id).verified.length>0',true,'Exact product is forward reproduced: '+id+' '+target);
  check('rt19(target,id).unchanged',true,'Reverse matching preserves its input: '+id);
  check(`rt19(target,id).verified.every(s=>retroTryVerify(s,target).outcome.id===({'imine-formation':'imine','enamine-formation':'enamine','mitsunobu-ether':'mitsunobu'}[id]||id))`,true,'Intended forward family reproduces the target: '+id);
}
for(const [target,id] of [
  ['CC(C)=NO','imine-formation'], ['CC(C)=NN','imine-formation'], ['CC(C)=N','imine-formation'],
  ['CCN(C)C','enamine-formation'], ['CC(C)=NC','enamine-formation'], ['Cn1cccc1','enamine-formation'],
  ['CCOCC','mitsunobu-ether'], ['CC(C)(C)Oc1ccccc1','mitsunobu-ether'], ['c1ccc(Oc2ccccc2)cc1','mitsunobu-ether'],
  ['C/C=C/C','hofmann-elimination'], ['C1=CCCCC1','hofmann-elimination']
]) {
  ctx.target=target;ctx.id=id;
  check('rt19(target,id).verified.length',0,'Unsupported target is excluded: '+id+' '+target);
}
check(`rt19('CC(C)=NC','imine-formation').verified.every(s=>s.precursors.some(p=>moleculeSame(p.smiles,'CC(C)=O'))&&s.precursors.some(p=>moleculeSame(p.smiles,'CN')))`,true,'Imine route includes acetone and methylamine');
check(`rt19('C=C(C)N(C)C','enamine-formation').verified.every(s=>s.precursors.some(p=>moleculeSame(p.smiles,'CC(C)=O'))&&s.precursors.some(p=>moleculeSame(p.smiles,'CNC')))`,true,'Enamine route includes acetone and dimethylamine');
check(`rt19('CCOc1ccccc1','mitsunobu-ether').verified.every(s=>s.precursors.some(p=>moleculeSame(p.smiles,'CCO'))&&s.precursors.some(p=>moleculeSame(p.smiles,'Oc1ccccc1'))&&s.reagents.some(r=>r.label==='PPh3')&&s.reagents.some(r=>r.label==='DEAD'))`,true,'Ether route includes both substrates and Mitsunobu reagents');
check(`rt19('CC[18O]c1ccccc1','mitsunobu-ether').verified.every(s=>s.precursors.some(p=>moleculeSame(p.smiles,'[18OH]c1ccccc1')))`,true,'Product oxygen label belongs to the phenol precursor');
check(`rt19('CCC=C','hofmann-elimination').verified.every(s=>moleculeSame(s.precursors[0].smiles,'CCCC[N+](C)(C)C')&&s.conditions.temperature>=100&&s.reagents.some(r=>r.label==='NaOH'))`,true,'Hofmann route proposes the trimethylammonium precursor and heated hydroxide conditions');
for(const [start,target,id] of [
  ['CC(C)=O','CC(C)=NC','imine-formation'],
  ['CC(C)=O','C=C(C)N(C)C','enamine-formation'],
  ['CCO','CCOc1ccccc1','mitsunobu-ether'],
  ['CCCC[N+](C)(C)C','CCC=C','hofmann-elimination']
]) {
  ctx.start=start;ctx.target=target;ctx.id=id;
  run(`var routeJob=pathFinderCreate(start,target,{maxDepth:1,maxRoutes:5,budgetMs:10000});while(routeJob.status==='running')routeJob.step(100);`);
  check('routeJob.status','found','Path Finder uses the new method: '+id);
  check(`routeJob.routes.some(r=>r.length===1&&r[0].candidate.transform===id&&retroForwardCheck(r[0].candidate,r[0].to))`,true,'New planner edge independently replays: '+id);
}
for(const [materials,expected] of [[[],'exhausted'],[['CN'],'found']]) {
  ctx.materials=materials;
  run(`var inventoryJob=pathFinderCreate('CC(C)=O','CC(C)=NC',{maxDepth:1,stockPolicy:'custom',availableMaterials:materials,budgetMs:10000});while(inventoryJob.status==='running')inventoryJob.step(100);`);
  check('inventoryJob.status',expected,'Primary amine obeys custom inventory: '+JSON.stringify(materials));
}
run(`var blockedEther=pathFinderCreate('CCO','CCOc1ccccc1',{maxDepth:1,budgetMs:10000,forbiddenReagents:['PPh3']});while(blockedEther.status==='running')blockedEther.step(100);`);
check(`blockedEther.routes.some(r=>r.some(l=>l.candidate.transform==='mitsunobu-ether'))`,false,'Mitsunobu reagent exclusion blocks the new ether route');
console.log('Retro expansion round 19: '+checks+' checks passed.');
