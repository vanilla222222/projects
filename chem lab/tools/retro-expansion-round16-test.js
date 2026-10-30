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
run(`function rt16(target,id){
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
  ['CC(C)=NO','oxime-formation'], ['CC=NO','oxime-formation'], ['C1CCC(=NO)CC1','oxime-formation'],
  ['CC(=NO)CC(C)=NO','oxime-formation'], ['CC(C)=[15N][18OH]','oxime-formation'],
  ['CC(C)=NN','hydrazone-formation'], ['CC=NN','hydrazone-formation'], ['C1CCC(=NN)CC1','hydrazone-formation'],
  ['Cc1ccc(C)o1','paal-knorr-furan'], ['c1ccoc1','paal-knorr-furan'],
  ['Cc1ccc(C)[nH]1','paal-knorr-pyrrole'], ['Cc1ccc(C)n1C','paal-knorr-pyrrole'],
  ['Cc1ccc(C)n1c2ccccc2','paal-knorr-pyrrole'], ['Cc1ccc(C)[15nH]1','paal-knorr-pyrrole']
];
for(const [target,id] of positives) {
  ctx.target=target;ctx.id=id;
  check('rt16(target,id).specs.length>0',true,'Reverse edit exists: '+id+' '+target);
  check('rt16(target,id).verified.length>0',true,'Exact target is forward reproduced: '+id+' '+target);
  check('rt16(target,id).unchanged',true,'Reverse matching preserves its input: '+id);
  check(`rt16(target,id).verified.every(s=>retroTryVerify(s,target).outcome.id===({'oxime-formation':'oxime','hydrazone-formation':'hydrazone'}[id]||id))`,true,'The intended forward family reproduces the product: '+id);
}
for(const [target,id] of [
  ['CC(C)=NOC','oxime-formation'], ['CC(C)=O','oxime-formation'],
  ['CC(=NO)CC(C)=O','oxime-formation'],
  ['CC(C)=NNC','hydrazone-formation'], ['CC(C)=N','hydrazone-formation'],
  ['C1CCOC1','paal-knorr-furan'], ['c1ccsc1','paal-knorr-furan'],
  ['c1ccncc1','paal-knorr-pyrrole'], ['C1CCNC1','paal-knorr-pyrrole']
]) {
  ctx.target=target;ctx.id=id;
  check('rt16(target,id).verified.length',0,'Unsupported or non-reproduced target is excluded: '+id+' '+target);
}
check(`rt16('CC(C)=NO','oxime-formation').verified.every(s=>s.precursors.some(p=>moleculeSame(p.smiles,'CC(C)=O'))&&s.precursors.some(p=>moleculeSame(p.smiles,'NO')))`,true,'Oxime route explicitly includes hydroxylamine');
check(`rt16('CC(C)=NN','hydrazone-formation').verified.every(s=>s.precursors.some(p=>moleculeSame(p.smiles,'CC(C)=O'))&&s.precursors.some(p=>moleculeSame(p.smiles,'NN')))`,true,'Hydrazone route explicitly includes hydrazine');
check(`rt16('Cc1ccc(C)o1','paal-knorr-furan').verified.every(s=>s.precursors.length===1&&moleculeSame(s.precursors[0].smiles,'CC(=O)CCC(C)=O')&&s.conditions.additives.includes('h2so4'))`,true,'Furan disconnection recovers the 1,4-diketone and acid conditions');
check(`rt16('Cc1ccc(C)n1C','paal-knorr-pyrrole').verified.every(s=>s.precursors.some(p=>moleculeSame(p.smiles,'CC(=O)CCC(C)=O'))&&s.precursors.some(p=>moleculeSame(p.smiles,'CN')))`,true,'N-methyl pyrrole recovers methylamine as a building block');
check(`rt16('CC(C)=[15N][18OH]','oxime-formation').verified.every(s=>s.precursors.some(p=>p.smiles.includes('15N')&&p.smiles.includes('18O')))`,true,'Labelled N/O donor atoms stay in the explicit precursor');

for(const [start,target,id,availableMaterials] of [
  ['CC(C)=O','CC(C)=NO','oxime-formation',[]],
  ['CC(C)=O','CC(C)=NN','hydrazone-formation',[]],
  ['CC(=O)CCC(C)=O','Cc1ccc(C)o1','paal-knorr-furan',[]],
  ['CC(=O)CCC(C)=O','Cc1ccc(C)[nH]1','paal-knorr-pyrrole',['N']],
  ['CC(=O)CCC(C)=O','Cc1ccc(C)n1C','paal-knorr-pyrrole',['CN']]
]) {
  ctx.start=start;ctx.target=target;ctx.id=id;ctx.availableMaterials=availableMaterials;
  run(`var routeJob=pathFinderCreate(start,target,{maxDepth:1,maxRoutes:5,budgetMs:10000,availableMaterials});while(routeJob.status==='running')routeJob.step(100);`);
  check('routeJob.status','found','Path Finder uses the new method: '+id);
  check(`routeJob.routes.some(r=>r.length===1&&r[0].candidate.transform===id&&retroForwardCheck(r[0].candidate,r[0].to))`,true,'New planner edge independently replays: '+id);
}
for(const [materials,expected] of [[[],'exhausted'],[['NO'],'found']]) {
  ctx.materials=materials;
  run(`var inventoryJob=pathFinderCreate('CC(C)=O','CC(C)=NO',{maxDepth:1,stockPolicy:'custom',availableMaterials:materials,budgetMs:10000});while(inventoryJob.status==='running')inventoryJob.step(100);`);
  check('inventoryJob.status',expected,'Hydroxylamine obeys custom inventory: '+JSON.stringify(materials));
}
console.log('Retro expansion round 16: '+checks+' checks passed.');
