'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});
let checks=0;const check=(code,e,label)=>{assert.equal(vm.runInContext(code,ctx),e,label);checks++;};
vm.runInContext(`function passeriniFixture(inputs=['CC=O','CC(=O)O','[C-]#[N+]C(C)(C)C'],amounts=[1,1,1],conditions={},roles=['reactant','reactant','reactant']){
 const compounds=inputs.map((smiles,i)=>({smiles,role:roles[i]||'reactant',equiv:amounts[i]===undefined?1:amounts[i],fragment:smilesToFragment(smiles)})),c={...defaultReactionConditions(),solvents:['dcm'],temperature:25,...conditions},before=JSON.stringify(compounds),p=predictReaction(compounds,c);
 return {compounds,conditions:c,out:[p.best,...p.alternatives].find(o=>o&&o.id==='passerini'),unchanged:before===JSON.stringify(compounds)};
}
function passeriniReverse(target){const t=retroTarget(retroFromSmiles(target));t.edits=[];t.currentTransform='passerini';return RETRO_TRANSFORMS.find(x=>x.id==='passerini').match(t).map(s=>retroTryVerify(s,target)).filter(Boolean);}`,ctx);
for(const [inputs,product] of [
 [['CC=O','CC(=O)O','[C-]#[N+]C'],'CC(OC(C)=O)C(=O)NC'],
 [['CC=O','CC(=O)O','[C-]#[N+]C(C)(C)C'],'CC(OC(C)=O)C(=O)NC(C)(C)C'],
 [['O=Cc1ccccc1','CCC(=O)O','[C-]#[N+]C1CCCCC1'],'CCC(=O)OC(c1ccccc1)C(=O)NC1CCCCC1'],
 [['CCC=O','O=C(O)c1ccccc1','[C-]#[N+]CC'],'CCC(OC(=O)c1ccccc1)C(=O)NCC'],
 [['O=CCc1ccccc1','CC(=O)O','[C-]#[N+]C(C)(C)C'],'CC(=O)OC(Cc1ccccc1)C(=O)NC(C)(C)C']
]){Object.assign(ctx,{inputs,product});
 check('!!passeriniFixture(inputs).out',true,'Bounded three-component endpoint available '+inputs[0]);
 check('passeriniFixture(inputs).out.products.some(p=>moleculeSame(p.isomericSmiles||p.smiles,product))',true,'Fixed alpha-acyloxy amide graph '+inputs[0]);
 check('passeriniFixture(inputs).out.products[0].stereo.kind','racemic','New alpha centre is an uncontrolled mixture');
 check('passeriniFixture(inputs).out.multicomponent.operations',1,'One net preparation operation');
 check('passeriniFixture(inputs).out.stoichiometry.conversion',1,'Equimolar components support net stoichiometry');
 check('passeriniFixture(inputs).unchanged',true,'Input graphs unchanged');
 check('passeriniReverse(product).length>0',true,'Reverse decomposition is forward verified');
 check("(()=>{const f=passeriniFixture(inputs),mass=c=>{const g=reactionFragmentGraph(c.fragment||smilesToFragment(c.isomericSmiles||c.smiles));return computeProperties(g,g.atoms.map(a=>a.id)).exactMass;};return Math.abs(f.compounds.reduce((n,c)=>n+mass(c),0)-mass(f.out.products[0]))<1e-7;})()",true,'Net mass conserved across all three components');
}
for(const inputs of [
 ['CC(=O)C','CC(=O)O','[C-]#[N+]C'],['CC=O','CC(=O)O','CC#N'],['CC=O','CC(=O)O','CN=C=O'],
 ['O=CCCC=O','CC(=O)O','[C-]#[N+]C'],['OCCC=O','CC(=O)O','[C-]#[N+]C'],['NCCC=O','CC(=O)O','[C-]#[N+]C'],
 ['CC=O','O=C(O)Cc1ccccc1','[C-]#[N+]C'],['CC=[18O]','CC(=O)O','[C-]#[N+]C'],['CC=O','CC(=[18O])O','[C-]#[N+]C'],
 ['CC=O','CC(=O)O','[C-]#[N+]C','CN'],['C=CC=O','CC(=O)O','[C-]#[N+]C'],['C[C@H](CC)C=O','CC(=O)O','[C-]#[N+]C']
]){ctx.inputs=inputs;check('!!passeriniFixture(inputs).out',false,'Unsupported competing/ketone/isotope scope excluded '+inputs.join(' / '));}
for(const conditions of [{solvents:['water']},{solvents:['methanol']},{solvents:['dcm','water']},{additives:['et3n']},{temperature:80}]){ctx.conditions=conditions;check('!!passeriniFixture(undefined,undefined,conditions).out',false,'Unsupported medium/additives/temperature excluded');}
for(const amounts of [[0.5,1,1],[1,0.5,1],[1,1,0.5]]){ctx.amounts=amounts;check('passeriniFixture(undefined,amounts).out.stoichiometry.extent',0.5,'Each component limits the absolute reaction extent');}
check("(()=>{const f=passeriniFixture(undefined,[1,0.5,1]),p=predictReaction([...f.compounds].reverse(),f.conditions);return [p.best,...p.alternatives].find(o=>o&&o.id==='passerini').stoichiometry.conversion;})()",0.5,'Component ordering cannot hide underloading');
check("!!passeriniFixture(undefined,undefined,{},['reactant','catalyst','reactant']).out",false,'Catalyst role cannot bypass consumed acid loading');
for(const amount of [0.5,1]){ctx.amount=amount;check("(()=>{const f=passeriniFixture(undefined,[1,1,amount]);return routeWorkspaceValidateStep({from:'CC=O',to:'CC(OC(C)=O)C(=O)NC(C)(C)C',ruleId:'passerini',compounds:f.compounds,conditions:f.conditions}).status;})()",amount===1?'verified':'unverified','Saved route loading '+amount);}
check("(()=>{const f=passeriniFixture();return routeWorkspaceValidateStep({from:'CC=O',to:'C[C@H](OC(C)=O)C(=O)NC(C)(C)C',ruleId:'passerini',compounds:f.compounds,conditions:f.conditions}).status;})()",'unverified','Racemate cannot certify a pure enantiomer');
check("(()=>{const target='CC(OC(C)=O)C(=O)NC(C)(C)C',j=pathFinderCreate('CC=O',target,{maxDepth:1,maxRoutes:1,budgetMs:5000});while(j.status==='running')j.step(100);return j.status==='found'&&j.route.length===1&&j.route[0].candidate.transform==='passerini'&&retroForwardCheck(j.route[0].candidate,target);})()",true,'Linear planner uses one forward-verified multicomponent operation');
check("(()=>{const target='CC(OC(C)=O)C(=O)NC(C)(C)C',j=pathFinderCreate('CC=O',target,{maxDepth:1,maxRoutes:1,budgetMs:5000,recipeTree:true});while(j.status==='running')j.step(100);return j.status==='found'&&j.recipeTrees.some(t=>t.candidate.transform==='passerini'&&t.metrics.steps===1&&t.children.length===3&&t.children.every(n=>!!n.stock));})()",true,'Recipe Tree requires all three available leaves');
check("(()=>{const j=pathFinderCreate('CC=O','CC(OC(C)=O)C(=O)NC(C)(C)C',{maxDepth:1,maxRoutes:1,budgetMs:5000,forbiddenRules:['passerini']});while(j.status==='running')j.step(100);return j.status!=='found';})()",true,'Same one-step budget without the new method has no matching route');
check("(()=>{const f=passeriniFixture(),r=retroDisconnectSmiles('C[C@H](OC(C)=O)C(=O)NC(C)(C)C',{protect:false,budgetMs:5000});return !r.candidates.some(c=>c.transform==='passerini'&&!['racemic','mismatch'].includes(c.stereo));})()",true,'Public retrosynthesis does not advertise a stereopure Passerini preparation');
check("stockTier('[C-]#[N+]C(C)(C)C').tier",2,'Canonical isocyanide is available as tier-two model stock');
console.log('Passerini: '+checks+' checks passed.');
