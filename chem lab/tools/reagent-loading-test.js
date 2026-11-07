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
let checks=0;
function check(code, expected, label) { assert.equal(run(code),expected,label);checks++; }
run(`function loadingFixture(substrate,reagent,amount,solvents=['ether'],substrateAmount='1'){
 const compounds=[{smiles:substrate,fragment:smilesToFragment(substrate),role:'reactant',equiv:substrateAmount},
 {smiles:reagent,fragment:smilesToFragment(reagent),role:'reagent',equiv:amount}];
 const conditions={...defaultReactionConditions(),solvents,atmosphere:'n2'};
 const prediction=predictReaction(compounds,conditions),outcome=prediction.best;
 return {compounds,conditions,outcome,assessment:routeStepAssessment({outcome,compounds,conditions})};
}`);
check("loadingFixture('CCOC(C)=O','C[Mg]Br','1').outcome.stoichiometry.conversion",0.5,'One equivalent bounds the two-addition net transformation at half');
check("loadingFixture('CCOC(C)=O','C[Mg]Br','1').assessment.status",'blocked','Incomplete loading cannot certify complete conversion');
for(const [substrate,reagent,amount,ceiling] of [
 ['CCOC(C)=O','C[Mg]Br','0.5',0.25],['CCOC(C)=O','C[Mg]Br','2',1],['CCOC(C)=O','C[Mg]Br','3',1],
 ['CC(C)=O','[Na+].[BH4-]','0.125',0.5],['CC(C)=O','[Na+].[BH4-]','0.25',1],
 ['CC(=O)CCC(C)=O','[Na+].[BH4-]','0.25',0.5],['CC(=O)CCC(C)=O','[Na+].[BH4-]','0.5',1],
 ['CCOC(C)=O','[Li+].[AlH4-]','0.25',0.5],['CCOC(C)=O','[Li+].[AlH4-]','0.5',1]
]){
 ctx.substrate=substrate;ctx.reagent=reagent;ctx.amount=amount;ctx.ceiling=ceiling;
 check('loadingFixture(substrate,reagent,amount).outcome.stoichiometry.conversion',ceiling,'Amount-based upper bound '+substrate+' '+amount);
 check("loadingFixture(substrate,reagent,amount).assessment.status",ceiling<1?'blocked':'no-encoded-conflict','Completion gate '+amount+' '+reagent);
 check("loadingFixture(substrate,reagent,amount).outcome.stoichiometry.basis",'stoichiometric-upper-bound','Not an experimental prediction');
}
for(const amount of ['0','-1','NaN','garbage','']){
 ctx.amount=amount;
 check("loadingFixture('CCOC(C)=O','C[Mg]Br',amount).outcome.stoichiometry.completion",'unknown','Unresolved recorded amount is not one equivalent '+amount);
 check("loadingFixture('CCOC(C)=O','C[Mg]Br',amount).assessment.status",'blocked','Unknown loading does not certify completion '+amount);
}
check("loadingFixture('CCOC(C)=O','C[Mg]Br','4 mmol',['ether'],'2 mmol').outcome.stoichiometry.conversion",1,'Absolute amounts normalize to the recorded substrate basis');
check("loadingFixture('CCOC(C)=O','C[Mg]Br','1',['ether'],'2').outcome.stoichiometry.conversion",0.25,'Ceiling respects substrate amount');
check("loadingFixture('CCOC(C)=O','C[Mg]Br','1').outcome.products.some(p=>moleculeSame(p.fragment||p.smiles,'CC(C)=O'))",false,'One equivalent does not invent selective ketone isolation');
check("loadingFixture('CCOC(C)=O','C[Mg]Br','1').outcome.warnings.some(w=>w.includes('not a predicted conversion, yield or product distribution'))",true,'Limit is not presented as a mixture prediction');
run(`var low=loadingFixture('CCOC(C)=O','C[Mg]Br','1');var sufficient=loadingFixture('CCOC(C)=O','C[Mg]Br','2');`);
check("routeWorkspaceValidateStep({from:'CCOC(C)=O',to:'CC(C)(C)O',ruleId:'grignard',compounds:low.compounds,conditions:low.conditions}).status",'unverified','Saved route rejects insufficient loading');
check("routeWorkspaceValidateStep({from:'CCOC(C)=O',to:'CC(C)(C)O',ruleId:'grignard',compounds:sufficient.compounds,conditions:sufficient.conditions}).status",'verified','Saved route accepts sufficient modeled loading');
check("reactionScopeAssess(low.compounds,low.conditions,low.outcome).reasons.some(r=>r.code==='reagent-loading'&&r.level==='conflict')",true,'Scope exposes the loading conflict');
run(`var explicitSpec={precursors:[{smiles:'CCOC(C)=O',role:'reactant',equiv:'1'}],reagents:[{smiles:'C[Mg]Br',role:'reagent',equiv:'1'}],conditions:{solvents:['ether']}};var explicitBefore=JSON.stringify(explicitSpec);`);
check("!!retroTryVerify(explicitSpec,'CC(C)(C)O')",false,'Raw verification does not silently top up recorded loading');
check('JSON.stringify(explicitSpec)===explicitBefore',true,'Explicit input specification is unchanged');
run(`var autoSpec={precursors:[{smiles:'CCOC(C)=O',role:'reactant'}],reagents:[{smiles:'C[Mg]Br',role:'reagent'}],conditions:{solvents:['ether']}};var autoBefore=JSON.stringify(autoSpec);var planned=retroTryVerify(autoSpec,'CC(C)(C)O');`);
check('!!planned',true,'Unspecified generated recipe can plan the net minimum');
check('planned.reagents[0].equiv','2','Planned Grignard demand is recorded');
check('JSON.stringify(autoSpec)===autoBefore',true,'Planning does not rewrite the supplied specification');
run(`var cascadeLoading=(equiv)=>reactionCascadeRun('CCOC(C)=O',[{reagents:[{smiles:'C[Mg]Br',equiv}],conditions:{solvents:['ether']},target:'CC(C)(C)O'}]);`);
check("cascadeLoading('1').status",'blocked','Underloaded staged reaction cannot be complete');
check("cascadeLoading('2').status",'complete','Sufficient staged loading is preserved');
check("cascadeLoading('2').stages[0].compounds[1].equiv",'2','Stage record keeps the amount');
check("cascadeLoading('0').status",'invalid','Invalid stage loading is not replaced by one');
check("cascadeLoading('2 mmol').status",'invalid','Staged absolute amounts need a carried-material scale');
check(`(()=>{const c=[{smiles:'CCO',role:'reactant',equiv:'1'},{smiles:'CC(=O)O',role:'reactant',equiv:'2'}].map(c=>({...c,fragment:smilesToFragment(c.smiles)}));const r=predictReaction(c,{...defaultReactionConditions(),additives:['h2so4']});const o=[r.best,...r.alternatives].find(o=>o?.id==='fischer');return o.stoichiometry.conversion===1&&o.stoichiometry.rows[0].compound===c[0];})()`,true,'Excess partner does not falsely limit the first carried reactant');
check(`(()=>{const original=rglLookup;try{rglLookup=()=>null;return loadingFixture('CCOC(C)=O','C[Mg]Br','1 mL').outcome.stoichiometry.completion;}finally{rglLookup=original;}})()`,'unknown','Unconvertible volume is not parsed as equivalents');
run("var plannedCandidates=retroDisconnectSmiles('CC(C)(C)O',{budgetMs:10000,protect:false}).candidates.filter(c=>c.transform==='grignard');");
check("plannedCandidates.length>0&&plannedCandidates.every(c=>!rxLoadingConflict(c.outcome)&&retroForwardCheck(c,'CC(C)(C)O'))",true,'Generated recipe quantities survive independent replay');
check("routeWorkspaceValidateStep({from:'CCOC(C)=O',to:'CC(C)(C)O',ruleId:'grignard',yield:50,compounds:low.compounds,conditions:low.conditions}).status",'unverified','A yield override cannot certify complete underloaded conversion');
check("routeWorkspaceStepYield({from:'CCOC(C)=O',to:'CC(C)(C)O',yield:null},{status:'unverified',outcome:low.outcome})",null,'Unverified completion is not silently displayed as a predicted step yield');
console.log('Reagent loading: '+checks+' checks passed');
