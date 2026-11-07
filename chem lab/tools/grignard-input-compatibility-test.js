'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});
const run=c=>vm.runInContext(c,ctx);let checks=0;
const check=(code,want,label)=>{assert.equal(run(code),want,label);checks++;};
// Source-linked finite compatibility deductions; no reaction distribution is assumed.
run(`function inputFixture(target,other,role='reagent',formation=false){
 const compounds=[{smiles:target,role:'reactant'},...(!formation?[{smiles:'C[Mg]Br',role:'reagent'}]:[]),...(other?[{smiles:other,role}]:[])].map(c=>({...c,fragment:smilesToFragment(c.smiles),equiv:'2'}));
 const conditions={...defaultReactionConditions(),solvents:['ether'],atmosphere:'n2',additives:formation?['mg']:[]};
 const before=JSON.stringify(compounds),prediction=predictReaction(compounds,conditions);
 return {compounds,conditions,prediction,unchanged:before===JSON.stringify(compounds),outcomes:[prediction.best,...prediction.alternatives].filter(Boolean)};
}
function inputHas(f,id){return f.outcomes.some(o=>o.id===id);}`);
const families=[['CC=O','grignard',false],['CC#N','grignard-nitrile',false],['O=C=O','grignard-carboxylation',false],['CCBr','grignard-formation',true]];
for(const donor of ['CS','CS[2H]','C#CC','[2H]C#CC','Oc1ccccc1','O[2H]']){
 ctx.donor=donor;
 for(const [target,id,formation] of families){Object.assign(ctx,{target,id,formation});check("inputHas(inputFixture(target,donor,'reagent',formation),id)",false,'Donor '+donor+' blocks clean '+id);}
}
for(const role of ['reactant','reagent','catalyst','solvent']){
 ctx.role=role;
 check("inputHas(inputFixture('CC=O','CCO',role),'grignard')",false,'OH donor role cannot hide conflict: '+role);
 check("inputHas(inputFixture('CC=O','CS',role),'grignard')",false,'SH donor role cannot hide conflict: '+role);
 check("inputHas(inputFixture('CC=O','C#CC',role),'grignard')",false,'Terminal alkyne role cannot hide conflict: '+role);
}
for(const [target,id,formation] of families){Object.assign(ctx,{target,id,formation});
 for(const control of ['CSC','CC#CC','CCOCC','CN(C)C']){ctx.control=control;check("inputHas(inputFixture(target,control,'reagent',formation),id)",true,'Compatible control '+control+' retains '+id);}
 check("inputFixture(target,'CS','reagent',formation).unchanged",true,'Conflict does not mutate '+id+' input graphs');
}
for(const [target,id,formation] of families){Object.assign(ctx,{target,id,formation});
 check("inputHas(inputFixture(target,'CC(=O)C','catalyst',formation),id)",false,'Catalyst electrophile blocks clean '+id);
 check("inputHas(inputFixture(target,'CC#N','solvent',formation),id)",false,'Explicit solvent structure blocks clean '+id);
}
check("(()=>{const f=inputFixture('CC=O','CCC(=O)OC','reagent'),o=f.outcomes.find(o=>o.id==='grignard');return o.chemoselectivity.competing.some(c=>c.source==='unconsumed-input'&&c.group==='ester');})()",true,'Reagent-role electrophile remains an explicit unresolved branch');
check("(()=>{const f=inputFixture('CC=O','CCC(=O)OC','reagent'),o=f.outcomes.find(o=>o.id==='grignard');return routeStepAssessment({outcome:o}).status;})()",'blocked','Planner rejects unopposed endpoint with extra ester');
check("inputHas(inputFixture('SCCC=O',null),'grignard')",false,'SH on the target also blocks addition');
check("inputHas(inputFixture('C#CCCC=O',null),'grignard')",false,'Terminal alkyne on target blocks addition');
check("inputHas(inputFixture('SCCCBr',null,'reactant',true),'grignard-formation')",false,'SH on formation precursor blocks isolated Grignard');
check("(()=>{const f=inputFixture('CC=O',null),o=f.outcomes.find(o=>o.id==='grignard');const added={smiles:'CS',fragment:smilesToFragment('CS'),role:'catalyst'};return reactionScopeAssess([...f.compounds,added],f.conditions,o).reasons.some(r=>r.code==='grignard-proton-donor'&&r.level==='conflict');})()",true,'Saved branch is rejected after donor is added');
check("(()=>{const f=inputFixture('CC=O',null),o=f.outcomes.find(o=>o.id==='grignard');const added={smiles:'CC(=O)C',fragment:smilesToFragment('CC(=O)C'),role:'catalyst'};return reactionScopeAssess([...f.compounds,added],f.conditions,o).reasons.some(r=>r.code==='grignard-reactive-input'&&r.level==='conflict');})()",true,'Saved branch is rejected after catalyst electrophile is added');
check("(()=>{const f=inputFixture('CC=O','CS');return f.prediction.hints.some(h=>h.includes('isotope transfer'));})()",true,'Unsupported donor chemistry returns bounded hint rather than invented product');
check("(()=>{const f=inputFixture('CC=O',null);f.compounds[1]={smiles:'C#C[Mg]Br',fragment:smilesToFragment('C#C[Mg]Br'),role:'reagent',equiv:'1'};const p=predictReaction(f.compounds,f.conditions);return [p.best,...p.alternatives].some(o=>o&&o.id==='grignard');})()",true,'Existing metalated alkynyl donor is not mistaken for a free terminal alkyne');
check("(()=>{const f=inputFixture('O=C=O','CC#N','reagent'),o=f.outcomes.find(o=>o.id==='grignard-carboxylation');return !!o&&routeStepAssessment({outcome:o}).status==='blocked';})()",true,'CO2 endpoint cannot silently preserve competing nitrile');
check("(()=>{const f=inputFixture('CC=O','O=C=O','reagent'),o=f.outcomes.find(o=>o.id==='grignard');return !!o&&o.chemoselectivity.competing.some(c=>c.group==='carbonDioxide');})()",true,'Carbonyl addition audits extra CO2 input');
check("inputHas(inputFixture('CCBr','O=C=O','catalyst',true),'grignard-formation')",false,'CO2 auxiliary prevents isolated formation');
check("inputHas(inputFixture('CC#N','CN(C)C=O','reactant'),'grignard-nitrile')",false,'Nitrile branch does not ignore an amide electrophile');
check("inputHas(inputFixture('O=C=O',null),'grignard-carboxylation')",true,'Single CO2 substrate stays supported');
console.log('Grignard complete-input compatibility: '+checks+' checks passed.');
