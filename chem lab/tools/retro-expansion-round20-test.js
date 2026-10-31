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
run(`function rt20(target,id){
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
 ['O=CCCC=C','claisen-vinyl'], ['CC(=O)CCC=C','claisen-vinyl'],
 ['O=[13CH]CCC=C','claisen-vinyl'], ['[18O]=CCCC=C','claisen-vinyl'],
 ['C=CCc1ccccc1O','claisen-aromatic'], ['C=CCc1cc(C)ccc1O','claisen-aromatic'],
 ['C=CCc1ccccc1[18OH]','claisen-aromatic']
];
for(const [target,id] of positives){
 ctx.target=target;ctx.id=id;
 check('rt20(target,id).specs.length>0',true,'Proposal '+target);
 check('rt20(target,id).verified.length>0',true,'Exact forward replay '+target);
 check('rt20(target,id).unchanged',true,'Input immutable '+target);
 check("rt20(target,id).verified.every(s=>retroTryVerify(s,target).outcome.id==='claisen-rearrangement')",true,'Correct forward family '+target);
}
for(const [target,id] of [
 ['O=CCC=C','claisen-vinyl'],['O=CCCCC=C','claisen-vinyl'],['CC(=O)OCCC=C','claisen-vinyl'],
 ['C=CCc1cccc(O)c1','claisen-aromatic'],['C=CCc1ccc(O)cc1','claisen-aromatic'],
 ['C=CCc1ccccc1OC','claisen-aromatic'],['CCCCc1ccccc1O','claisen-aromatic']
]){ctx.target=target;ctx.id=id;check('rt20(target,id).verified.length',0,'Unsupported target '+target);}
for(const [start,target,id] of [
 ['C=CCOC=C','O=CCCC=C','claisen-vinyl'],
 ['C=CCOc1ccccc1','C=CCc1ccccc1O','claisen-aromatic']
]){
 ctx.start=start;ctx.target=target;ctx.id=id;
 run("var job=pathFinderCreate(start,target,{maxDepth:1,maxRoutes:5,budgetMs:10000});while(job.status==='running')job.step(100);");
 check('job.status','found','Planner '+id);
 check('job.routes.some(r=>r.length===1&&r[0].candidate.transform===id&&retroForwardCheck(r[0].candidate,r[0].to))',true,'Verified planner edge '+id);
}
run(`function claisenForward(smiles,temperature){
 return predictReaction([{smiles,fragment:smilesToFragment(smiles),role:'reactant',equiv:'1'}],{...defaultReactionConditions(),solvents:['none'],temperature});
}`);
for(const [start,target] of [
 ['C=CCOC=C','O=CCCC=C'],['C=CC[18O]C=C','[18O]=CCCC=C'],
 ['C=CCOc1ccccc1','C=CCc1ccccc1O'],['C=CC[18O]c1ccccc1','C=CCc1ccccc1[18OH]']
]){
 ctx.start=start;ctx.target=target;
 check("[claisenForward(start,200).best,...claisenForward(start,200).alternatives].filter(Boolean).some(o=>o.id==='claisen-rearrangement'&&o.products.some(p=>moleculeSame(p.fragment||p.smiles,target)))",true,'Forward identity '+start);
 check("[claisenForward(start,25).best,...claisenForward(start,25).alternatives].filter(Boolean).some(o=>o.id==='claisen-rearrangement')",false,'Heating required '+start);
}
check("rt20('[18O]=CCCC=C','claisen-vinyl').verified.every(s=>s.precursors.some(p=>moleculeSame(p.smiles,'C=CC[18O]C=C')))",true,'Vinyl ether oxygen becomes carbonyl oxygen');
check("rt20('C=CCc1ccccc1[18OH]','claisen-aromatic').verified.every(s=>s.precursors.some(p=>moleculeSame(p.smiles,'C=CC[18O]c1ccccc1')))",true,'Aryl ether oxygen becomes phenol oxygen');
console.log(checks+' Claisen reverse, planner and forward checks passed');
