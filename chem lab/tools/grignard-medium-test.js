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
run(`function grigMedium(inputs,solvents){
 const compounds=inputs.filter(smiles=>smiles!=='[Mg]').map((smiles,i)=>({smiles,fragment:smilesToFragment(smiles),role:i?'reagent':'reactant',equiv:'1'}));
 const conditions={...defaultReactionConditions(),solvents,atmosphere:'n2',additives:inputs.includes('[Mg]')?['mg']:[]};const before=JSON.stringify(compounds);
 const r=predictReaction(compounds,conditions);
 return {outcomes:[r.best,...r.alternatives].filter(Boolean),hints:r.hints,compounds,conditions,unchanged:before===JSON.stringify(compounds)};
}`);
check("grigMedium(['CC=O','C[Mg]Br'],['acetone']).outcomes.some(o=>o.id==='grignard')",false,'Acetone solvent does not permit an unopposed target addition');
check("grigMedium(['CCBr','[Mg]'],['mecn']).outcomes.some(o=>o.id==='grignard-formation')",false,'Nitrile solvent does not permit isolated Grignard formation');
check("grigMedium(['CC(=O)CCBr','[Mg]'],['ether']).outcomes.some(o=>o.id==='grignard-formation')",false,'A ketone on the halide precursor is not an inert spectator');
const families=[
 [['CC=O','C[Mg]Br'],'grignard'],[['O=C=O','C[Mg]Br'],'grignard-carboxylation'],
 [['CC#N','C[Mg]Br'],'grignard-nitrile'],[['CCBr','[Mg]'],'grignard-formation']
];
for(const solvent of ['acetone','etoac','mecn','dmf']){
 for(const [inputs,id] of families){
  ctx.solvent=solvent;ctx.inputs=inputs;ctx.id=id;
  check("grigMedium(inputs,[solvent]).outcomes.some(o=>o.id===id)",false,'No clean '+id+' in '+solvent);
  check("grigMedium(inputs,[solvent]).hints.some(h=>h.includes('Solvent competition is not modeled'))",true,'Specific solvent competition hint '+id+' '+solvent);
 }
}
for(const [inputs,id] of families){
 ctx.inputs=inputs;ctx.id=id;
 check("grigMedium(inputs,['thf','acetone']).outcomes.some(o=>o.id===id)",false,'Ether cosolvent cannot hide reactive medium '+id);
 for(const solvent of ['ether','thf']){
  ctx.solvent=solvent;
  check("grigMedium(inputs,[solvent]).outcomes.some(o=>o.id===id)",true,'Existing dry-ether route retained '+id+' '+solvent);
  check("grigMedium(inputs,[solvent]).unchanged",true,'Input graphs unchanged '+id);
 }
}
for(const substrate of ['O=CCCCBr','CCOC(=O)CCBr','N#CCCCBr','CN(C)C(=O)CCBr']){
 ctx.substrate=substrate;
 check("grigMedium([substrate,'[Mg]'],['ether']).outcomes.some(o=>o.id==='grignard-formation')",false,'No isolated organomagnesium with reactive precursor '+substrate);
 check("grigMedium([substrate,'[Mg]'],['ether']).hints.some(h=>h.includes('carbonyl/nitrile electrophile'))",true,'Precursor competition is explained '+substrate);
}
check("grigMedium(['CCBr','[Mg]','CC(C)=O'],['ether']).outcomes.some(o=>o.id==='grignard-formation')",false,'Separate trapping electrophile also prevents isolated-formation assignment');
check("grigMedium(['CC(C)=O','C[Mg]Br'],['ether']).outcomes.some(o=>o.id==='grignard'&&o.products.some(p=>moleculeSame(p.fragment||p.smiles,'CC(C)(C)O')))",true,'Acetone remains a supported explicit substrate in ether');
check("grigMedium(['CC=O','C[Mg]Br'],['acetone']).outcomes.some(o=>o.id==='grignard-quench')",false,'Electrophilic solvent is not mislabelled as proton quench');
check("grigMedium(['CC=O','C[Mg]Br'],['water']).outcomes.some(o=>o.id==='grignard-quench')",true,'Existing water quench is retained');
check("grigMedium(['CCBr','[Mg]'],['ethanol']).outcomes.some(o=>o.id==='grignard-formation')",false,'Existing protic formation conflict is retained');
run("var validMedium=grigMedium(['CC=O','C[Mg]Br'],['ether']);var validOutcome=validMedium.outcomes.find(o=>o.id==='grignard');var alteredMedium={...validMedium.conditions,solvents:['acetone']};");
check("reactionScopeAssess(validMedium.compounds,alteredMedium,validOutcome).reasons.some(r=>r.code==='grignard-reactive-medium'&&r.level==='conflict')",true,'Scope identifies the reactive recorded solvent');
check("reactionScopeAssess(validMedium.compounds,alteredMedium,validOutcome).modelReproduced",false,'Stale ether outcome cannot replay in acetone');
check("routeWorkspaceValidateStep({from:'CC=O',to:validOutcome.products[0].isomericSmiles,ruleId:'grignard',compounds:validMedium.compounds,conditions:alteredMedium}).status",'unverified','Saved route rejects the changed solvent');
check("!!retroTryVerify({precursors:[{smiles:'CC=O',role:'reactant'}],reagents:[{smiles:'C[Mg]Br',role:'reagent'}],conditions:alteredMedium},'CC(O)C')",false,'Raw retrosynthesis cannot verify the unsupported endpoint');
check("JSON.stringify(rxGrignardReactiveSolvents(reactionContext(validMedium.compounds,normalizeReactionConditions({...validMedium.conditions,solvents:['dmf']})))[0].groups)",'["amide"]','Solvent reactivity is recognized from structure');
console.log('Grignard medium: '+checks+' checks passed');
