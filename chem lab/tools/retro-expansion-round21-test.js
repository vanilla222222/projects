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
run(`function rt21(target,id){
  const graph=retroFromSmiles(target),before=JSON.stringify(graph),t=retroTarget(graph);
  const requested=computeProperties(graph,graph.atoms.map(a=>a.id)).isomericSmiles;
  t.edits=[];t.currentTransform=id;
  const specs=RETRO_TRANSFORMS.find(x=>x.id===id).match(t);
  const verified=specs.filter(spec=>{const v=retroTryVerify(spec,requested);return !!v&&moleculeSame(v.product.fragment||v.product.isomericSmiles||v.product.smiles,requested);});
  return {specs,verified,unchanged:before===JSON.stringify(graph),target:requested};
}`);
let checks = 0;
function check(code, expected, label) { assert.equal(run(code), expected, label); checks++; }


for(const target of ['C=CC(C)CC=C','C=CC(C)(C)CC=C','C=CC(CC)CC=C','C=CC([13CH3])CC=C']){
 ctx.target=target;
 check("rt21(target,'cope-rearrangement').specs.length>0",true,'Proposal '+target);
 check("rt21(target,'cope-rearrangement').verified.length>0",true,'Exact forward replay '+target);
 check("rt21(target,'cope-rearrangement').unchanged",true,'Target unchanged '+target);
 check("rt21(target,'cope-rearrangement').verified.every(s=>retroTryVerify(s,target).outcome.id==='cope')",true,'Correct family '+target);
}
for(const target of ['C=CCCC=C','C=CCC=C','C=CC(O)CC=C','CCCCCC','C1=CCCCC1']){
 ctx.target=target;check("rt21(target,'cope-rearrangement').verified.length",0,'Degenerate or unsupported '+target);
}
run("var cSpec=rt21('C=CC(C)CC=C','cope-rearrangement').verified[0];var copeJob=pathFinderCreate(cSpec.precursors[0].smiles,'C=CC(C)CC=C',{maxDepth:1,maxRoutes:5,budgetMs:10000});while(copeJob.status==='running')copeJob.step(100);");
check('copeJob.status','found','Planner finds the rearrangement');
check("copeJob.routes.some(r=>r.length===1&&r[0].candidate.transform==='cope-rearrangement'&&retroForwardCheck(r[0].candidate,r[0].to))",true,'Planner edge replays');
check("!!retroTryVerify({...cSpec,conditions:{...cSpec.conditions,temperature:25}},'C=CC(C)CC=C')",false,'Unheated plain Cope does not replay');
check("cSpec.precursors.length===1&&cSpec.reagents.length===0&&cSpec.conditions.temperature>=100",true,'Rearrangement has one explicit substrate and heated conditions');
console.log('Cope reverse: '+checks+' checks passed');
