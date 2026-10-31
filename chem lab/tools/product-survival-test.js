'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});
const run=c=>vm.runInContext(c,ctx);let checks=0;const check=(c,e,label)=>{assert.equal(run(c),e,label);checks++;};
run(`function hxProduct(acid='Br',amount=1,smiles='CC#C'){
 const compounds=[{smiles,role:'reactant',equiv:1},{smiles:acid,role:'reagent',equiv:amount}].map(c=>({...c,fragment:smilesToFragment(c.smiles)}));
 const conditions={...defaultReactionConditions(),solvents:['ether']},prediction=predictReaction(compounds,conditions);
 return {compounds,conditions,outcome:[prediction.best,...prediction.alternatives].find(o=>o&&o.id==='hydrohalogenation')};
}`);
for(const acid of ['Br','Cl','I']){ctx.acid=acid;
 check('hxProduct(acid,1).outcome.productSurvival.status','review','One-equivalent vinyl endpoint still exposes susceptibility '+acid);
 check("hxProduct(acid,1).outcome.productSurvival.issues[0].availability",'modeled-exhaustion','Theoretical exhaustion is distinguished from product stability '+acid);
 check('hxProduct(acid,2).outcome.productSurvival.status','conflict','Excess HX conflicts with stopping at unsaturated endpoint '+acid);
 check("routeStepAssessment({outcome:hxProduct(acid,2).outcome}).blockers.some(b=>b.code==='product-further-addition')",true,'Planner rejects clean partial endpoint with excess '+acid);
 check("hxProduct(acid,2,'C=CC').outcome.productSurvival.status",'no-encoded-alert','Saturated alkene-addition control has no remaining pi site '+acid);
}
check("(()=>{const f=hxProduct('Br',1),o=f.outcome,more=f.compounds.map(c=>({...c,equiv:c.role==='reagent'?2:1}));return reactionScopeAssess(more,f.conditions,o).reasons.some(r=>r.code==='product-further-addition'&&r.level==='conflict');})()",true,'Saved one-equivalent result is reaudited against current excess');
check("(()=>{const f=hxProduct('Br',2);return routeWorkspaceValidateStep({from:'CC#C',to:f.outcome.products[0].isomericSmiles,ruleId:'hydrohalogenation',compounds:f.compounds,conditions:f.conditions}).status;})()",'unverified','Workspace cannot certify the reactive vinyl endpoint');
check("(()=>{const f=hxProduct(),before=JSON.stringify(f);reactionScopeAssess(f.compounds,f.conditions,f.outcome);return before===JSON.stringify(f);})()",true,'Product audit and scope replay do not mutate saved inputs/results');
check("(()=>{const compounds=['CC(=O)C','[Na+].[BH4-]','[O-][Cr](=O)(=O)Cl.c1cc[nH+]cc1'].map((smiles,i)=>({smiles,fragment:smilesToFragment(smiles),role:i?'reagent':'reactant',equiv:1}));const p=predictReaction(compounds,{...defaultReactionConditions(),solvents:['ether']});const o=[p.best,...p.alternatives].find(o=>o&&o.id==='reduction-nabh4');return o.productSurvival.issues.some(i=>i.reagent==='pcc'&&i.group==='alcohol'&&i.availability==='not-quantified');})()",true,'Newly created alcohol is checked against an additional recorded oxidant');
check("(()=>{const c=['CC=O','C[Mg]Br'].map((smiles,i)=>({smiles,role:i?'reagent':'reactant',fragment:smilesToFragment(smiles)}));const p=predictReaction(c,{...defaultReactionConditions(),solvents:['ether']});return [p.best,...p.alternatives].find(o=>o&&o.id==='grignard').productSurvival.status;})()",'workup-boundary','Net Grignard alcohol is not assumed to coexist with unquenched reagent');
check("(()=>{const f=hxProduct('Br',1);return f.outcome.productSurvival.coverage.includes('no kinetics');})()",true,'Audit states its finite non-kinetic scope');
check("(()=>{const compounds=['CC=O','CN'].map(smiles=>({smiles,role:'reactant',fragment:smilesToFragment(smiles)})),p=predictReaction(compounds,defaultReactionConditions());const o=[p.best,...p.alternatives].find(o=>o&&o.id==='imine');return !!o&&o.productSurvival.status==='not-assessed';})()",true,'Missing susceptibility coverage is not called stable');
check("(()=>{const f=hxProduct('Br',0.5),fixed=f.compounds.map(c=>({...c,equiv:1}));return !reactionScopeAssess(fixed,f.conditions,f.outcome).reasons.some(r=>r.code==='reagent-loading');})()",true,'Corrected current quantities clear stale recorded underloading');
console.log('Product survival: '+checks+' checks passed.');
