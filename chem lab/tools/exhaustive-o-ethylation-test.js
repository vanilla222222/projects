'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});
let checks=0;const check=(code,e,label)=>{assert.equal(vm.runInContext(code,ctx),e,label);checks++;};
vm.runInContext(`function ethylFixture(smiles,donor='CCBr',amount=2,baseAmount=2,conditions={},extras=[]){
 const compounds=[{smiles,role:'reactant',equiv:1},{smiles:donor,role:'reactant',equiv:amount},{smiles:'[K+].[K+].[O-]C([O-])=O',role:'reagent',equiv:baseAmount},...extras.map(smiles=>({smiles,role:'catalyst',equiv:1}))].map(c=>({...c,fragment:smilesToFragment(c.smiles)})),c={...defaultReactionConditions(),solvents:['dmf'],...conditions},before=JSON.stringify(compounds),p=predictReaction(compounds,c);
 return {compounds,conditions:c,outcome:[p.best,...p.alternatives].find(o=>o&&o.id==='exhaustive-o-ethylation'),unchanged:before===JSON.stringify(compounds)};
}
function ethylReverse(target){const t=retroTarget(retroFromSmiles(target));t.edits=[];t.currentTransform='exhaustive-o-ethylation';return RETRO_TRANSFORMS.find(x=>x.id===t.currentTransform).match(t).map(s=>retroTryVerify(s,t.smiles)).filter(Boolean);}`,ctx);
for(const [s,p,n] of [['Oc1ccccc1O','CCOc1ccccc1OCC',2],['Oc1ccc(O)cc1','CCOc1ccc(OCC)cc1',2],['Oc1cc(O)cc(O)c1','CCOc1cc(OCC)cc(OCC)c1',3],['COc1cc(O)ccc1O','COc1cc(OCC)ccc1OCC',2],['Oc1c(O)c(O)c(O)cc1','CCOc1c(OCC)c(OCC)c(OCC)cc1',4],['C[C@H](OC)c1cc(O)ccc1O','C[C@H](OC)c1cc(OCC)ccc1OCC',2]]){
 Object.assign(ctx,{s,p,n});
 check('!!ethylFixture(s,"CCBr",n,n).outcome',true,'Exhaustive phenolic conversion available '+s);
 check('ethylFixture(s,"CCBr",n,n).outcome.products.some(x=>moleculeSame(x.isomericSmiles||x.smiles,p))',true,'Fixed complete endpoint '+s);
 check('ethylFixture(s,"CCBr",n,n).outcome.bulkTransformation.sites',n,'Site count matches loading '+s);
 check('ethylFixture(s,"CCBr",n,n).outcome.stoichiometry.conversion',1,'Full loading supports net endpoint '+s);
 check('ethylFixture(s,"CCBr",n,n).unchanged',true,'Inputs unchanged '+s);
 check('ethylReverse(p).length>0',true,'Reverse proposals replay forward '+p);
}
for(const s of ['OCCO','Oc1ccccc1CO','Nc1cc(O)ccc1O','O=Cc1cc(O)ccc1O','C=CCc1cc(O)ccc1O','Oc1ccccc1','Oc1cc(O)c(O)c(O)c1O']){ctx.s=s;check('!!ethylFixture(s).outcome',false,'Unsupported/single-site scope excluded '+s);}
for(const donor of ['CBr','CCCBr','CC(C)Br','ClCCBr']){ctx.donor=donor;check("!!ethylFixture('Oc1ccccc1O',donor).outcome",false,'No arbitrary alkylation generalization '+donor);}
check("!!ethylFixture('Oc1ccccc1O','CCI').outcome",true,'Ethyl iodide remains supported');
check("ethylFixture('Oc1ccccc1O','[13CH3]CBr').outcome.products.some(p=>moleculeSame(p.isomericSmiles||p.smiles,'[13CH3]COc1ccccc1OC[13CH3]'))",true,'Transferred ethyl-carbon labels retained');
check("ethylReverse('[13CH3]COc1ccccc1OC[13CH3]').length",0,'Reverse stock cannot invent labelled ethyl donor');
check("ethylFixture('Oc1ccccc1O','CCBr',1).outcome.stoichiometry.conversion",0.5,'Half donor loading cannot certify full endpoint');
check("ethylFixture('Oc1ccccc1O','CCBr',2,1).outcome.stoichiometry.conversion",0.5,'Half base loading cannot certify full endpoint');
check("(()=>{const f=ethylFixture('Oc1ccccc1O','CCBr',1);const p=predictReaction([...f.compounds].reverse(),f.conditions);return [p.best,...p.alternatives].find(o=>o&&o.id==='exhaustive-o-ethylation').stoichiometry.conversion;})()",0.5,'Input order cannot change loading basis');
for(const conditions of [{solvents:['water']},{solvents:['ethanol']},{solvents:['dmf','acetone']},{additives:['et3n']}]){ctx.conditions=conditions;check("!!ethylFixture('Oc1ccccc1O','CCBr',2,2,conditions).outcome",false,'Unsupported mixed conditions excluded');}
check("!!ethylFixture('Oc1ccccc1O','CCBr',2,2,{},['CCO']).outcome",false,'Hidden extra catalyst-role substrate excluded');
for(const amount of [1,2]){ctx.amount=amount;check("(()=>{const f=ethylFixture('Oc1ccccc1O','CCBr',amount);return routeWorkspaceValidateStep({from:'Oc1ccccc1O',to:'CCOc1ccccc1OCC',ruleId:'exhaustive-o-ethylation',compounds:f.compounds,conditions:f.conditions}).status;})()",amount===2?'verified':'unverified','Saved loading gate '+amount);}
check("(()=>{const j=pathFinderCreate('Oc1ccccc1O','CCOc1ccccc1OCC',{maxDepth:1,maxRoutes:1,budgetMs:5000});while(j.status==='running')j.step(100);return j.status==='found'&&j.route.length===1&&j.route[0].candidate.transform==='exhaustive-o-ethylation'&&retroForwardCheck(j.route[0].candidate,j.route[0].to);})()",true,'Linear planner uses one verified operation');
check("(()=>{const j=pathFinderCreate('Oc1ccccc1O','CCOc1ccccc1OCC',{maxDepth:1,maxRoutes:1,budgetMs:5000,recipeTree:true});while(j.status==='running')j.step(100);return j.status==='found'&&j.recipeTrees.some(t=>t.metrics.steps===1&&t.candidate.transform==='exhaustive-o-ethylation');})()",true,'Recipe Tree uses one complete operation');
check("(()=>{const target='C[C@H](OC)c1cc(OCC)ccc1OCC',r=retroDisconnectSmiles(target,{budgetMs:10000,protect:false});return r.candidates.some(c=>c.transform==='exhaustive-o-ethylation'&&c.precursors.some(p=>(p.isomericSmiles||p.smiles).includes('@'))&&retroForwardCheck(c,target));})()",true,'Public reverse pipeline restores and forward-verifies spectator stereochemistry');
check("(()=>{const t=retroTarget(retroFromSmiles('CCOc1c(OCC)c(OCC)c(OCC)c(OCC)c1OCC'));t.edits=[];t.currentTransform='exhaustive-o-ethylation';const specs=RETRO_TRANSFORMS.find(x=>x.id===t.currentTransform).match(t);return specs.length>0&&specs.length<=RETRO_LIMITS.maxPerTransform&&specs.every(s=>!!retroTryVerify(s,t.smiles));})()",true,'Subset enumeration remains bounded and forward verified');
check("(()=>{const f=ethylFixture('Oc1ccccc1O');f.compounds[2].role='catalyst';f.compounds[2].equiv=0.1;const p=predictReaction(f.compounds,f.conditions);return [p.best,...p.alternatives].some(o=>o&&o.id==='exhaustive-o-ethylation');})()",false,'Catalyst role cannot bypass base loading');
console.log('Exhaustive O-ethylation: '+checks+' checks passed.');
