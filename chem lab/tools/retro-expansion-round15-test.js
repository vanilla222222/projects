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
run(`function rt15(target,id){
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
  ['CNC(C)=O','amide-coupling'], ['CN(C)C(C)=O','amide-coupling'],
  ['O=C(N1CCCCC1)c1ccccc1','amide-coupling'],
  ['CCOC(C)=O','steglich'], ['CC(=O)Oc1ccccc1','steglich'],
  ['CC(N)=O','ester-aminolysis'], ['CNC(C)=O','ester-aminolysis'], ['CN(C)C(C)=O','ester-aminolysis'],
  ['CCOC(C)=O','transesterification'], ['COC(=O)c1ccccc1','transesterification'],
];
for(const [target,id] of positives) {
  ctx.target=target;ctx.id=id;
  check('rt15(target,id).specs.length>0',true,'Reverse edit exists: '+id+' '+target);
  check('rt15(target,id).verified.length>0',true,'Exact product is forward reproduced: '+id+' '+target);
  check('rt15(target,id).unchanged',true,'Target graph is unchanged: '+id);
  check(`rt15(target,id).verified.every(s=>retroTryVerify(s,target).outcome.id===(id==='ester-aminolysis'?'aminolysis':id))`,true,'Intended forward method is used: '+id);
}
for(const [target,id] of [
  ['CCOC(C)=O','amide-coupling'], ['CC(N)=O','amide-coupling'],
  ['CC(=O)O','steglich'], ['O=C1OCCC1','steglich'],
  ['CCOC(C)=O','ester-aminolysis'], ['O=C1NCCC1','ester-aminolysis'],
  ['CC(C)OC(C)=O','transesterification'], ['CC(=O)Oc1ccccc1','transesterification'],
  ['CC(=O)O','transesterification']
]) {
  ctx.target=target;ctx.id=id;
  check('rt15(target,id).verified.length',0,'Unsupported target is excluded: '+id+' '+target);
}
check(`rt15('CNC(C)=O','amide-coupling').verified.every(s=>s.precursors.some(p=>moleculeSame(p.smiles,'CC(=O)O'))&&s.precursors.some(p=>moleculeSame(p.smiles,'CN'))&&s.reagents.some(r=>r.label==='DCC'))`,true,'Coupling recovers the acid, amine and DCC');
check(`rt15('CCOC(C)=O','steglich').verified.every(s=>s.precursors.some(p=>moleculeSame(p.smiles,'CCO'))&&s.precursors.some(p=>moleculeSame(p.smiles,'CC(=O)O'))&&s.conditions.additives.includes('dmap'))`,true,'Steglich esterification includes both partners and DMAP');
check(`rt15('CC(N)=O','ester-aminolysis').verified.every(s=>s.precursors.some(p=>moleculeSame(p.smiles,'COC(C)=O'))&&s.precursors.some(p=>moleculeSame(p.smiles,'N')))`,true,'Primary amide aminolysis explicitly requires ammonia');
check(`rt15('CCOC(C)=O','transesterification').verified.every(s=>s.precursors.some(p=>moleculeSame(p.smiles,'COC(C)=O'))&&s.precursors.some(p=>p.role==='solvent'&&moleculeSame(p.smiles,'CCO')))`,true,'Alcohol exchange retains ethanol as an explicit material');
check(`rt15('[13CH3]C(=O)OCC','transesterification').verified.some(s=>s.precursors.some(p=>p.smiles.includes('13C')))`,true,'Exchange retains the acyl carbon isotope label');

for(const [start,target,id,forbiddenRules] of [
  ['CC(=O)O','CNC(C)=O','amide-coupling',['acyl']],
  ['CCO','CCOC(C)=O','steglich',['fischer','mitsunobu','acyl','transesterification']],
  ['COC(C)=O','CNC(C)=O','ester-aminolysis',['amide-coupling']],
  ['COC(C)=O','CCOC(C)=O','transesterification',['fischer','steglich','mitsunobu','acyl']],
  ['C[C@H](O)CC','C[C@H](OC(C)=O)CC','steglich',['fischer','mitsunobu','acyl','transesterification']]
]) {
  ctx.start=start;ctx.target=target;ctx.id=id;ctx.forbiddenRules=forbiddenRules;
  run(`var routeJob=pathFinderCreate(start,target,{maxDepth:1,maxRoutes:5,budgetMs:10000,forbiddenRules});while(routeJob.status==='running')routeJob.step(100);`);
  check('routeJob.status','found','Path Finder uses the new method: '+id);
  check(`routeJob.routes.some(r=>r.length===1&&r[0].candidate.transform===id&&retroForwardCheck(r[0].candidate,r[0].to))`,true,'New planner edge independently replays: '+id);
}
for(const [materials,expected] of [[[], 'exhausted'],[['CCO'],'found']]) {
  ctx.materials=materials;
  run(`var inventoryJob=pathFinderCreate('COC(C)=O','CCOC(C)=O',{maxDepth:1,stockPolicy:'custom',availableMaterials:materials,forbiddenRules:['fischer','steglich','mitsunobu','acyl'],budgetMs:10000});while(inventoryJob.status==='running')inventoryJob.step(100);`);
  check('inventoryJob.status',expected,'Alcohol-exchange inventory policy: '+JSON.stringify(materials));
}
console.log('Retro expansion round 15: '+checks+' checks passed.');
