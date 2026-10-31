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
run(`function rt14(target,id){
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
  ['CC(Br)C(=O)O', 'hvz'],
  ['BrCC(=O)O', 'hvz'],
  ['CCOS(C)(=O)=O', 'sulfonate'],
  ['CC(C)OS(=O)(=O)c1ccc(C)cc1', 'sulfonate'],
  ['CNS(C)(=O)=O', 'sulfonamide'],
  ['CN(C)S(C)(=O)=O', 'sulfonamide'],
  ['O=S(=O)(c1ccc(C)cc1)N1CCCCC1', 'sulfonamide'],
  ['CC(C)=O', 'beta-keto-decarboxylation'],
  ['CC(=O)c1ccccc1', 'beta-keto-decarboxylation'],
];
for (const [target, id] of positives) {
  ctx.target = target; ctx.id = id;
  check('rt14(target,id).specs.length > 0', true, 'Reverse graph edit exists: ' + id + ' ' + target);
  check('rt14(target,id).verified.length > 0', true, 'Forward replay verifies the target: ' + id + ' ' + target);
  check('rt14(target,id).unchanged', true, 'Reverse matching does not mutate the target: ' + id);
  check(`rt14(target,id).verified.every(s=>retroTryVerify(s,target).outcome.id===(id==='beta-keto-decarboxylation'?'decarboxylation':id))`,true,'Replay uses the intended forward method: '+id);
}
for (const [target, id] of [
  ['BrCCC(=O)O','hvz'], ['CC(Cl)C(=O)O','hvz'], ['CCC(=O)O','hvz'],
  ['CS(=O)(=O)O','sulfonate'], ['CCOS(C)=O','sulfonate'],
  ['COS(=O)(=O)N','sulfonamide'], ['CS(=O)NC','sulfonamide'],
  ['CC=O','beta-keto-decarboxylation'], ['CCOC(C)=O','beta-keto-decarboxylation'],
  ['CC(C)(C)C(=O)C(C)(C)C','beta-keto-decarboxylation']
]) {
  ctx.target = target; ctx.id = id;
  check('rt14(target,id).verified.length', 0, 'Unsupported target is rejected: ' + id + ' ' + target);
}
check(`rt14('CC(Br)C(=O)O','hvz').verified.every(s=>s.precursors.length===1&&moleculeSame(s.precursors[0].smiles,'CCC(=O)O')&&s.reagents.some(r=>r.label==='Br2')&&s.reagents.some(r=>r.label==='PBr3'))`, true, 'HVZ recovers propionic acid and both required reagents');
check(`rt14('CCOS(C)(=O)=O','sulfonate').verified.every(s=>s.precursors.length===2&&s.precursors.some(p=>moleculeSame(p.smiles,'CCO'))&&s.precursors.some(p=>moleculeSame(p.smiles,'CS(=O)(=O)Cl'))&&s.conditions.additives.includes('et3n'))`, true, 'Mesylation recovers ethanol, mesyl chloride and base conditions');
check(`rt14('CN(C)S(C)(=O)=O','sulfonamide').verified.every(s=>s.precursors.some(p=>moleculeSame(p.smiles,'CNC'))&&s.precursors.some(p=>moleculeSame(p.smiles,'CS(=O)(=O)Cl')))`, true, 'Tertiary sulfonamide recovers an N-H secondary amine');
check(`rt14('CC(C)=O','beta-keto-decarboxylation').verified.some(s=>s.precursors.length===1&&moleculeSame(s.precursors[0].smiles,'CC(=O)CC(=O)O')&&s.conditions.temperature>=100)`, true, 'Decarboxylation recovers acetoacetic acid and heat');
check(`rt14('[13CH3]COS(C)(=O)=O','sulfonate').verified.some(s=>s.precursors.some(p=>p.smiles.includes('13C')))`, true, 'Sulfonate disconnection retains spectator isotope labels');

for (const [start,target,id] of [
  ['CCC(=O)O','CC(Br)C(=O)O','hvz'],
  ['CCO','CCOS(C)(=O)=O','sulfonate'],
  ['CN','CNS(C)(=O)=O','sulfonamide'],
  ['C[C@H](O)CC','C[C@H](OS(C)(=O)=O)CC','sulfonate'],
  ['CC(=O)CC(=O)O','CC(C)=O','beta-keto-decarboxylation']
]) {
  ctx.start=start;ctx.target=target;ctx.id=id;
  run(`var routeJob=pathFinderCreate(start,target,{maxDepth:1,maxRoutes:5,budgetMs:10000});while(routeJob.status==='running')routeJob.step(100);`);
  check('routeJob.status','found','Path Finder connects the endpoints: '+id);
  check(`routeJob.routeRecipes.some(r=>r.length===1&&r[0].candidate.transform===id&&retroForwardCheck(r[0].candidate,r[0].to))`,true,'New Path Finder edge is independently reproduced: '+id);
}
run(`var inventoryJob=pathFinderCreate('CCO','CCOS(C)(=O)=O',{maxDepth:1,stockPolicy:'custom',availableMaterials:[],budgetMs:10000});while(inventoryJob.status==='running')inventoryJob.step(100);`);
check('inventoryJob.status','exhausted','Sulfonyl chloride cannot be invented when the custom inventory is empty');
run(`var inventoryJob=pathFinderCreate('CCO','CCOS(C)(=O)=O',{maxDepth:1,stockPolicy:'custom',availableMaterials:['CS(=O)(=O)Cl'],budgetMs:10000});while(inventoryJob.status==='running')inventoryJob.step(100);`);
check('inventoryJob.status','found','Explicitly stocked mesyl chloride supplies the second building block');
console.log('Retro expansion round 14: '+checks+' checks passed.');
