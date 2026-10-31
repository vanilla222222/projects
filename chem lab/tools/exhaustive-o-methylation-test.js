'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});
const run=c=>vm.runInContext(c,ctx);let checks=0;const check=(c,e,label)=>{assert.equal(run(c),e,label);checks++;};
run(`function methylFixture(smiles,methyl='CBr',amount=2,baseAmount=2,conditions={}){
 const compounds=[{smiles,role:'reactant',equiv:1},{smiles:methyl,role:'reactant',equiv:amount},{smiles:'[Na+].[H-]',role:'reagent',equiv:baseAmount}].map(c=>({...c,fragment:smilesToFragment(c.smiles)}));
 const c={...defaultReactionConditions(),solvents:['thf'],...conditions},before=JSON.stringify(compounds),prediction=predictReaction(compounds,c);
 return {compounds,conditions:c,outcome:[prediction.best,...prediction.alternatives].find(o=>o&&o.id==='exhaustive-o-methylation'),unchanged:before===JSON.stringify(compounds)};
}
function methylReverse(target){const t=retroTarget(retroFromSmiles(target));t.edits=[];t.currentTransform='exhaustive-o-methylation';return RETRO_TRANSFORMS.find(x=>x.id===t.currentTransform).match(t).map(s=>retroTryVerify(s,target)).filter(Boolean);}
`);
for(const [s,p] of [['OCCO','COCCOC'],['Oc1ccccc1O','COc1ccccc1OC'],['Oc1ccc(O)cc1','COc1ccc(OC)cc1'],['OCCCO','COCCCOC'],['OCC(O)C','COCC(OC)C']]){Object.assign(ctx,{s,p});
 check('!!methylFixture(s).outcome',true,'Supported exhaustive input '+s);
 check('methylFixture(s).outcome.products.some(x=>moleculeSame(x.isomericSmiles||x.smiles,p))',true,'Both methyl groups appear in fixed endpoint '+p);
 check('methylFixture(s).outcome.bulkTransformation.operations',1,'Two substitutions count as one preparation operation '+s);
 check('routeStepAssessment({outcome:methylFixture(s).outcome}).status','no-encoded-conflict','Exhaustive target does not inherit selective mono-site conflict '+s);
 check('methylReverse(p).length>0',true,'Reverse recipe independently forward verifies '+p);
 check('methylFixture(s).unchanged',true,'Input structure unchanged '+s);
}
check("methylFixture('OCCO','CBr',1).outcome.stoichiometry.conversion",0.5,'One methyl equivalent cannot establish double methylation');
check("routeStepAssessment({outcome:methylFixture('OCCO','CBr',1).outcome}).status",'blocked','Methyl underloading blocks complete route');
check("methylFixture('OCCO','CBr',2,1).outcome.stoichiometry.conversion",0.5,'Encoded base activation demand covers both OH sites');
check("routeStepAssessment({outcome:methylFixture('OCCO','CBr',2,1).outcome}).status",'blocked','Base underloading blocks complete route');
for(const s of ['NCC(O)CO','SCC(O)CO','OCC(O)C=O','OCC(O)C=C','OCC(O)CO','OCO','OCC(O)C1CO1','OCC(O)COO']){ctx.s=s;check('!!methylFixture(s).outcome',false,'Unsupported competing/geminal/extra sites rejected '+s);}
check("!!methylFixture('OCCO','CCBr').outcome",false,'Not generalized to arbitrary alkylation');
check("!!methylFixture('OCCO','CBr',2,2,{solvents:['water']}).outcome",false,'Protic reaction medium excluded');
check("!!methylFixture('OCCO','CBr',2,2,{additives:['h2so4']}).outcome",false,'Added strong acid excluded');
check("!!methylFixture('OCCO','CBr',2,2,{additives:['dead']}).outcome",false,'No shortcut over mixed activation conditions');
check("methylFixture('OCCO','CI').outcome.products.some(p=>moleculeSame(p.smiles,'COCCOC'))",true,'Methyl iodide donor supported');
check("methylFixture('OCCO','[13CH3]Br').outcome.products.some(p=>moleculeSame(p.isomericSmiles||p.smiles,'[13CH3]OCCO[13CH3]'))",true,'Two transferred methyl-carbon isotopes preserved');
check("methylReverse('[13CH3]OCCO[13CH3]').length",0,'Unsupported labelled reverse stock is not silently replaced by unlabeled reagent');
check("(()=>{const f=methylFixture('OCCO');return routeWorkspaceValidateStep({from:'OCCO',to:'COCCOC',ruleId:'exhaustive-o-methylation',compounds:f.compounds,conditions:f.conditions}).status;})()",'verified','Saved exhaustive step replays its exact loading');
check("(()=>{const f=methylFixture('OCCO','CBr',1);return routeWorkspaceValidateStep({from:'OCCO',to:'COCCOC',ruleId:'exhaustive-o-methylation',compounds:f.compounds,conditions:f.conditions}).status;})()",'unverified','Saved underloaded step cannot claim full endpoint');
check("(()=>{const j=pathFinderCreate('OCCO','COCCOC',{maxDepth:1,maxRoutes:1,budgetMs:5000});while(j.status==='running')j.step(100);return j.status==='found'&&j.route.length===1&&j.route[0].candidate.transform==='exhaustive-o-methylation'&&retroForwardCheck(j.route[0].candidate,j.route[0].to);})()",true,'Path Finder uses one independently verified operation for both sites');
check("(()=>{const j=pathFinderCreate('Oc1ccccc1O','COc1ccccc1OC',{maxDepth:1,maxRoutes:1,budgetMs:5000,recipeTree:true});while(j.status==='running')j.step(100);return j.status==='found'&&j.recipeTrees.some(t=>t.metrics.steps===1&&t.candidate.transform==='exhaustive-o-methylation');})()",true,'Recipe Tree also counts the exhaustive diphenol conversion once');
check("(()=>{const f=methylFixture('Oc1ccccc1O');f.compounds[2]={smiles:'[K+].[K+].[O-]C([O-])=O',fragment:smilesToFragment('[K+].[K+].[O-]C([O-])=O'),role:'reagent',equiv:2};const p=predictReaction(f.compounds,f.conditions);return [p.best,...p.alternatives].some(o=>o&&o.id==='exhaustive-o-methylation');})()",true,'Two phenolic sites can use the encoded carbonate-base branch');
check("(()=>{const f=methylFixture('OCCO');f.compounds[2]={smiles:'[K+].[K+].[O-]C([O-])=O',fragment:smilesToFragment('[K+].[K+].[O-]C([O-])=O'),role:'reagent',equiv:2};const p=predictReaction(f.compounds,f.conditions);return [p.best,...p.alternatives].some(o=>o&&o.id==='exhaustive-o-methylation');})()",false,'Carbonate branch is not generalized to aliphatic alcohols');
check("methylFixture('C[C@H](O)CO').outcome.products.some(p=>moleculeSame(p.isomericSmiles||p.smiles,'C[C@H](OC)COC'))",true,'Existing carbon stereochemistry is retained without C-O cleavage');
check("!!methylFixture('CCO').outcome",false,'One-OH substrate keeps ordinary ether rules');
check("!!methylFixture('OCCO','CBr',2,2,{additives:['et3n']}).outcome",false,'Competing amine additive is excluded');
check("(()=>{const f=methylFixture('OCCO');f.compounds.push({smiles:'CN(C)C',role:'catalyst',fragment:smilesToFragment('CN(C)C')});const p=predictReaction(f.compounds,f.conditions);return [p.best,...p.alternatives].some(o=>o&&o.id==='exhaustive-o-methylation');})()",false,'Catalyst role cannot hide competing organic input');
console.log('Exhaustive O-methylation: '+checks+' checks passed.');
