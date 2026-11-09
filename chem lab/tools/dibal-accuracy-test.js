'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});
const run=c=>vm.runInContext(c,ctx);let checks=0;const check=(c,e,label)=>{assert.equal(run(c),e,label);checks++;};
run(`function dibalFixture(smiles,conditions={},extra=[],amount=1){
 const compounds=[{smiles,role:'reactant',equiv:1},{smiles:'CC(C)C[AlH]CC(C)C',role:'reagent',equiv:amount},...extra.map(smiles=>({smiles,role:'reagent',equiv:1}))].map(c=>({...c,fragment:smilesToFragment(c.smiles)}));
 const c={...defaultReactionConditions(),solvents:['toluene'],temperature:-78,atmosphere:'n2',...conditions},before=JSON.stringify(compounds),prediction=predictReaction(compounds,c);
 return {compounds,conditions:c,prediction,outcome:[prediction.best,...prediction.alternatives].find(o=>o&&o.id==='dibal'),unchanged:before===JSON.stringify(compounds)};
}`);
for(const [s,p]of [['CC#N','CC=O'],['CCC#N','CCC=O'],['C[13C]#[15N]','C[13CH]=O'],['CC(=O)OC','CC=O'],['CC(=[18O])OC','CC=[18O]']]){Object.assign(ctx,{s,p});
 check('dibalFixture(s).outcome.products.some(x=>moleculeSame(x.isomericSmiles||x.smiles,p))',true,'Fixed cold DIBAL graph endpoint '+s);
 check('dibalFixture(s).unchanged',true,'Starting structure/isotope labels unchanged '+s);
}
check("dibalFixture('C[13C]#[15N]').outcome.workupAtoms.nitrogenIsotopes[0]",15,'Departing nitrogen isotope remains nitrogen provenance');
check("dibalFixture('C[13C]#[15N]').outcome.products.every(p=>!p.isomericSmiles.includes('15O'))",true,'Nitrogen label cannot be transmuted into oxygen label');
check("dibalFixture('C[13C]#[15N]').outcome.workupAtoms.oxygenSource.includes('separate')",true,'Introduced oxygen has an explicit work-up source assumption');
check("dibalFixture('CC#N').outcome.productSurvival.status",'workup-boundary','Hydrolytic endpoint is not treated as present in the dry reaction medium');
for(const solvent of ['water','methanol','ethanol','acetone','etoac','mecn','dmf']){ctx.solvent=solvent;
 check("!!dibalFixture('CC#N',{solvents:[solvent]}).outcome",false,'Unsupported protic/reactive medium excludes clean endpoint '+solvent);
 check("dibalFixture('CC#N',{solvents:[solvent]}).prediction.hints.some(h=>h.includes('DIBAL'))",true,'Specific compatibility reason exposed '+solvent);
}
for(const s of ['OCC(=O)OC','NCCC=O','SCCC=O','CN([2H])CCC=O']){ctx.s=s;check('!!dibalFixture(s).outcome',false,'Unencoded proton-donor consumption is not ignored '+s);}
check("!!dibalFixture('CC#N',{},['O']).outcome",false,'Explicit water reagent is not silently moved to work-up');
check("!!dibalFixture('CC#N',{solvents:['toluene','acetone']}).outcome",false,'Inert cosolvent cannot hide reactive solvent');
check("!!dibalFixture('CC#N',{temperature:25}).outcome",false,'Warm nitrile product is left outside cold-only endpoint scope');
check("dibalFixture('CC(=O)OC',{temperature:25},[],2).outcome.products.some(p=>moleculeSame(p.isomericSmiles||p.smiles,'CCO'))",true,'Existing warm ester alcohol branch retained');
check("dibalFixture('CC(=O)C',{temperature:25}).outcome.products.some(p=>moleculeSame(p.isomericSmiles||p.smiles,'CC(O)C'))",true,'Ordinary ketone reduction remains available');
check("!!dibalFixture('CN(C)CCC=O').outcome",true,'Tertiary nitrogen without NH is not a blanket proton-donor rejection');
check("(()=>{const f=dibalFixture('CC#N');return reactionScopeAssess(f.compounds,{...f.conditions,solvents:['water']},f.outcome).reasons.some(r=>r.code==='dibal-mixture-conflict'&&r.level==='conflict');})()",true,'Stale dry-mixture outcome cannot hide changed protic medium');
check("(()=>{const f=dibalFixture('CC#N');return routeWorkspaceValidateStep({from:'CC#N',to:'CC=O',ruleId:'dibal',compounds:f.compounds,conditions:{...f.conditions,solvents:['water']}}).status;})()",'unverified','Saved route rejects incompatible reaction-stage water');
check("(()=>{const f=dibalFixture('C[13C]#[15N]');return routeWorkspaceValidateStep({from:'C[13C]#[15N]',to:'C[13CH]=O',ruleId:'dibal',compounds:f.compounds,conditions:f.conditions}).status;})()",'verified','Correctly labelled saved endpoint verifies');
check("(()=>{const j=pathFinderCreate('CC#N','CC=O',{maxDepth:1,maxRoutes:1,budgetMs:5000});while(j.status==='running')j.step(100);return j.status==='found'&&j.route.length===1&&j.route.every(l=>retroForwardCheck(l.candidate,l.to));})()",true,'Native cold-nitrile route stays forward verified');
check("(()=>{const f=dibalFixture('CC(=O)OC',{temperature:25},['CC#N'],2);return !f.outcome;})()",true,'Separate nitrile input cannot be ignored in a warm ester reduction');
check("(()=>{const f=dibalFixture('CC#N',{},['CC(=O)OC']);return f.outcome.compatibilityConflicts.some(b=>b.code==='dibal-other-input')&&routeStepAssessment({outcome:f.outcome}).status==='blocked';})()",true,'Cold extra electrophile remains inspectable but blocks clean single-input preparation');
check("!!dibalFixture('CN(C)C(=O)CCC=O').outcome",false,'Unmodeled amide on the same aldehyde substrate is not declared inert');
check("!!dibalFixture('COC(=O)CCC(=O)Cl').outcome",false,'Acyl chloride on the same ester substrate cannot be ignored');
console.log('DIBAL accuracy: '+checks+' checks passed.');
