'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});
const run=c=>vm.runInContext(c,ctx);let checks=0;const check=(c,e,label)=>{assert.equal(run(c),e,label);checks++;};
run(`function polyol(s,n,amount=n){const c=[{smiles:s,role:'reactant',equiv:1},{smiles:'CBr',role:'reactant',equiv:amount},{smiles:'[Na+].[H-]',role:'reagent',equiv:n}].map(c=>({...c,fragment:smilesToFragment(c.smiles)}));const conditions={...defaultReactionConditions(),solvents:['thf']},p=predictReaction(c,conditions);return {c,conditions,outcome:[p.best,...p.alternatives].find(o=>o&&o.id==='exhaustive-o-methylation')};}
function polyReverse(s){const t=retroTarget(retroFromSmiles(s));t.edits=[];t.currentTransform='exhaustive-o-methylation';return RETRO_TRANSFORMS.find(x=>x.id===t.currentTransform).match(t);}`);
for(const [s,p,n]of [['OCC(O)CO','COCC(OC)COC',3],['Oc1cc(O)cc(O)c1','COc1cc(OC)cc(OC)c1',3],['Oc1c(O)c(O)c(O)cc1','COc1c(OC)c(OC)c(OC)cc1',4]]){Object.assign(ctx,{s,p,n});
 check('polyol(s,n).outcome.bulkTransformation.sites',n,'Site count is derived from the whole substrate '+s);
 check('polyol(s,n).outcome.products.some(x=>moleculeSame(x.isomericSmiles||x.smiles,p))',true,'Fixed exhaustive endpoint '+p);
 check('polyol(s,n).outcome.stoichiometry.rows.find(r=>r.compound.smiles==="CBr").need',n,'Methyl demand scales to every OH '+n);
 check('polyol(s,n,n-1).outcome.stoichiometry.conversion',(n-1)/n,'Underloading retains substrate-based theoretical ceiling '+n);
 check("routeStepAssessment({outcome:polyol(s,n,n-1).outcome}).status",'blocked','Incomplete loading cannot claim full target '+n);
 check('polyReverse(p).some(spec=>{const v=retroTryVerify(spec,p);return v&&spec.precursors.some(c=>moleculeSame(c.smiles,s));})',true,'Reverse template recovers and verifies parent '+s);
}
check("polyReverse('COc1cc(OC)cc(OC)c1').length",2,'Symmetry-equivalent reverse cuts deduplicate to distinct parents');
check("polyReverse('COc1c(OC)c(OC)c(OC)cc1').length<=RETRO_LIMITS.maxPerTransform",true,'Existing proposal cap remains in force');
check("(()=>{const specs=polyReverse('COc1c(OC)c(OC)c(OC)cc1');return [2,3,4].every(n=>specs.some(s=>s.precursors[1].equiv===n));})()",true,'Bounded proposals retain different batch-size opportunities');
check("polyReverse('NCC(OCC)OC').length",0,'Declared incompatible elements are pruned before forward replay');
check("polyReverse('COCC(O)COC').length",0,'Reverse shortcut does not leave an OH selectively unmethylated');
check("!!polyol('OCC(O)C(O)C(O)CO',5).outcome",false,'Five-OH substrates stay outside the finite batch model');
check("(()=>{const j=pathFinderCreate('OCC(O)CO','COCC(OC)COC',{maxDepth:1,maxRoutes:1,budgetMs:5000});while(j.status==='running')j.step(100);return j.status==='found'&&j.route.length===1&&j.route[0].candidate.outcome.bulkTransformation.sites===3;})()",true,'Three-OH target uses one native verified operation');
check("(()=>{const j=pathFinderCreate('COc1cc(O)cc(O)c1','COc1cc(OC)cc(OC)c1',{maxDepth:1,maxRoutes:1,budgetMs:5000});while(j.status==='running')j.step(100);return j.status==='found'&&j.route.length===1&&j.route[0].candidate.outcome.bulkTransformation.sites===2;})()",true,'Existing methoxy group is retained while both remaining OH sites react');
check("(()=>{const j=pathFinderCreate('Oc1c(O)c(O)c(O)cc1','COc1c(OC)c(OC)c(OC)cc1',{maxDepth:1,maxRoutes:1,budgetMs:5000,recipeTree:true});while(j.status==='running')j.step(100);return j.status==='found'&&j.recipeTrees.some(t=>t.metrics.steps===1&&t.candidate.outcome.bulkTransformation.sites===4);})()",true,'Recipe Tree counts four-site exhaustive conversion once');
console.log('Polyol methylation: '+checks+' checks passed.');
