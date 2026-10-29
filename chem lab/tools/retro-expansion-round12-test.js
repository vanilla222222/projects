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
run(`function rt12(target,id){
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
  ['O=CCCCCC=O', 'ozonolysis'],
  ['O=CCCCCC=O', 'periodate'],
  ['CCOC(=O)/C=C/c1ccccc1', 'hwe'],
  ['BrCC1CCC(=O)O1', 'halolactonization'],
];
for (const [target, id] of positives) {
  ctx.target = target; ctx.id = id;
  check('rt12(target,id).specs.length > 0', true, 'Reverse graph edit exists: ' + id);
  check('rt12(target,id).verified.length > 0', true, 'Forward replay verifies the exact target: ' + id);
  check('rt12(target,id).unchanged', true, 'Reverse matching does not mutate the target: ' + id);
}

const negatives = [
  ['CC=O', 'ozonolysis'],
  ['CC(=O)O', 'ozonolysis'],
  ['CC=O', 'periodate'],
  ['CC(=O)O', 'periodate'],
  ['C/C=C/C', 'hwe'],
  ['CCOC(=O)CC', 'hwe'],
  ['BrCCCC', 'halolactonization'],
  ['BrCC(=O)OC', 'halolactonization'],
];
for (const [target, id] of negatives) {
  ctx.target = target; ctx.id = id;
  check('rt12(target,id).verified.length', 0, 'Unsupported or nonverifiable substrate is rejected: ' + id);
}

check(`rt12('O=CCCCCC=O','ozonolysis').verified.every(v=>v.precursors.length===1&&moleculeSame(v.precursors[0].smiles,'C1=CCCCC1')&&v.reagents.some(r=>r.label==='O3')&&v.reagents.some(r=>r.label==='Me2S'))`, true, 'Ozonolysis recovers cyclohexene and the reductive work-up conditions');
check(`rt12('O=CCCCCC=O','periodate').verified.every(v=>v.precursors.length===1&&moleculeSame(v.precursors[0].smiles,'OC1CCCCC1O')&&v.reagents.some(r=>r.label==='NaIO4'))`, true, 'Periodate cleavage recovers cyclohexane-1,2-diol and sodium periodate');
check(`rt12('CCOC(=O)/C=C/c1ccccc1','hwe').verified.every(v=>v.precursors.length===2&&v.precursors.some(p=>moleculeSame(p.smiles,'O=Cc1ccccc1'))&&v.precursors.some(p=>moleculeSame(p.smiles,'CCOC(=O)CP(=O)(OCC)OCC'))&&v.reagents.some(r=>r.label==='NaH'))`, true, 'HWE recovers benzaldehyde, the activated phosphonate and NaH');
check(`(()=>{const info=stockTier('CCOC(=O)CP(=O)(OCC)OCC');return !!info&&info.source==='builtin'&&info.tier===2&&info.name==='triethyl phosphonoacetate';})()`, true, 'The HWE phosphonate donor is recognized tier-two built-in stock');
run(`function hweStereo12(target){
  const graph=retroFromSmiles(target),t=retroTarget(graph),transform=RETRO_TRANSFORMS.find(x=>x.id==='hwe');
  t.edits=[];t.currentTransform='hwe';const spec=transform.match(t)[0];if(!spec)return '';
  const verified=retroTryVerify(spec,t.smiles);if(!verified)return '';
  Object.assign(spec,{transform,key:'test',record:t.edits[0]});const candidate=retroCandidate(t,spec,verified);
  return candidate&&candidate.stereo;
}`);
check(`hweStereo12('CCOC(=O)/C=C/c1ccccc1')`, 'set', 'The E-target HWE candidate has established alkene geometry');
check(`hweStereo12('CCOC(=O)/C=C\\c1ccccc1')`, 'racemic', 'A Z request is explicitly labelled as stereochemical uncertainty rather than an exact E match');
check(`rt12('BrCC1CCC(=O)O1','halolactonization').verified.every(v=>v.precursors.length===1&&moleculeSame(v.precursors[0].smiles,'O=C(O)CCC=C')&&v.reagents.some(r=>r.label==='Br2')&&v.reagents.some(r=>r.label==='Na2CO3'))`, true, 'Bromolactonization recovers pent-4-enoic acid and its cyclization conditions');
run(`var haloComp=['O=C(O)CCC=C','BrBr','[Na+].[Na+].[O-]C([O-])=O'].map((smiles,i)=>({smiles,fragment:smilesToFragment(smiles),role:i?'reagent':'reactant',equiv:1}));var haloPrediction=predictReaction(haloComp,{...defaultReactionConditions(),solvents:['water'],temperature:25});`);
check(`haloPrediction.best.id==='bromolactonization'&&haloPrediction.best.products.some(p=>moleculeSame(p.smiles,'BrCC1CCC(=O)O1'))`, true, 'Specific intramolecular bromolactonization outranks generic alkene bromination');

const routes = [
  ['C1=CCCCC1', 'O=CCCCCC=O', 'ozonolysis'],
  ['OC1CCCCC1O', 'O=CCCCCC=O', 'periodate'],
  ['O=Cc1ccccc1', 'CCOC(=O)/C=C/c1ccccc1', 'hwe'],
  ['O=C(O)CCC=C', 'BrCC1CCC(=O)O1', 'halolactonization'],
];
for (const [start, target, id] of routes) {
  ctx.start = start; ctx.target = target; ctx.id = id;
  run(`var routeJob=pathFinderCreate(start,target,{maxDepth:1,maxRoutes:20,budgetMs:10000,forbiddenRules:id==='hwe'?['wittig']:[]});while(routeJob.status==='running')routeJob.step(100);`);
  check('routeJob.status', 'found', 'Path Finder connects the endpoints: ' + id);
  check(`routeJob.routes.some(route=>route.length===1&&route[0].candidate.transform===id&&retroForwardCheck(route[0].candidate,route[0].to))`, true, 'Path Finder route is independently forward-verified: ' + id);
}
console.log('Retro expansion round 12: ' + checks + ' checks passed.');
