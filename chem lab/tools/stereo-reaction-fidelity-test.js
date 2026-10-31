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
run(`function stereoPredict(inputs,conditions={}){
 const compounds=inputs.map((smiles,i)=>({smiles,fragment:smilesToFragment(smiles),role:i?'reagent':'reactant',equiv:'1'}));
 const before=JSON.stringify(compounds);
 const r=predictReaction(compounds,{...defaultReactionConditions(),...conditions});
 return {outcomes:[r.best,...r.alternatives].filter(Boolean),unchanged:before===JSON.stringify(compounds)};
}
const stereoPph3='P(c1ccccc1)(c1ccccc1)c1ccccc1',stereoDead='CCOC(=O)N=NC(=O)OCC';`);
for(const [start,expected] of [
 ['C[C@H](Br)CC','C[C@@H](C#N)CC'],['C[C@@H](Br)CC','C[C@H](C#N)CC'],
 ['C[C@H](Br)C[C@H](F)C','C[C@@H](C#N)C[C@H](F)C'],
 ['C[C@@H](Br)C[C@H](F)C','C[C@H](C#N)C[C@H](F)C']
]){
 ctx.start=start;ctx.expected=expected;
 check("stereoPredict([start,'[C-]#N'],{solvents:['dmf'],temperature:0}).outcomes.some(o=>o.id==='sn2'&&o.products.some(p=>moleculeSame(p.fragment||p.smiles,expected)))",true,'SN2 inversion and spectator retention '+start);
 check("stereoPredict([start,'[C-]#N'],{solvents:['dmf'],temperature:0}).unchanged",true,'SN2 input unchanged');
}
for(const [start,expected] of [
 ['C[C@H](O)CC','C[C@@H](Oc1ccccc1)CC'],['C[C@@H](O)CC','C[C@H](Oc1ccccc1)CC'],
 ['C[C@H](O)C[C@H](F)C','C[C@@H](Oc1ccccc1)C[C@H](F)C'],
 ['C[C@@H](O)C[C@H](F)C','C[C@H](Oc1ccccc1)C[C@H](F)C']
]){
 ctx.start=start;ctx.expected=expected;
 check("stereoPredict([start,'Oc1ccccc1',stereoPph3,stereoDead],{solvents:['thf']}).outcomes.some(o=>o.id==='mitsunobu'&&o.products.some(p=>moleculeSame(p.fragment||p.smiles,expected)))",true,'Mitsunobu inversion and spectator retention '+start);
 check("stereoPredict([start,'Oc1ccccc1',stereoPph3,stereoDead],{solvents:['thf']}).unchanged",true,'Mitsunobu input unchanged');
}
run(`var felkinInputs=['C[C@H](F)C(C)=O','[Na+].[BH4-]'];var felkinConditions={solvents:['ethanol']};var felkin=stereoPredict(felkinInputs,felkinConditions).outcomes.find(o=>o.id==='reduction-nabh4');var felkinTarget=felkin.products[0].isomericSmiles;`);
check("felkin.products[0].stereo.kind",'diastereomers','Felkin outcome is a mixture, not stereopure');
check("felkin.minor[0].stereo.kind",'diastereomers','The other drawn component also belongs to the mixture');
check("!!retroTryVerify({precursors:[{smiles:felkinInputs[0],role:'reactant'}],reagents:[{smiles:felkinInputs[1],role:'reagent'}],conditions:felkinConditions},felkinTarget)",false,'Raw verification rejects a mixture as pure target');
check(`routeWorkspaceValidateStep({from:felkinInputs[0],to:felkinTarget,ruleId:'reduction-nabh4',compounds:felkinInputs.map((smiles,i)=>({smiles,role:i?'reagent':'reactant',equiv:'1'})),conditions:felkinConditions}).status`,'unverified','Saved route validation rejects the pure endpoint');
for(const [inputs,conditions,id] of [
 [['CC(Br)CC','[C-]#N'],{solvents:['dmf'],temperature:0},'sn2'],
 [['CC(O)CC','Oc1ccccc1', 'P(c1ccccc1)(c1ccccc1)c1ccccc1','CCOC(=O)N=NC(=O)OCC'],{solvents:['thf']},'mitsunobu']
]){
 ctx.inputs=inputs;ctx.conditions=conditions;ctx.id=id;
 check("stereoPredict(inputs,conditions).outcomes.find(o=>o.id===id).products[0].isomericSmiles.includes('@')",false,'Unspecified starting center does not acquire absolute configuration '+id);
 check("stereoPredict(inputs,conditions).outcomes.find(o=>o.id===id).products[0].stereo.kind",'racemic','Unspecified input remains a mixture '+id);
}
check("!!retroTryVerify({precursors:[{smiles:felkinInputs[0],role:'reactant'}],reagents:[{smiles:felkinInputs[1],role:'reagent'}],conditions:felkinConditions},felkin.minor[0].isomericSmiles)",false,'Minor Felkin component is not a stereopure preparation either');
check("rxsStereoTargetConflict(felkin.products[0],'CC(F)C(O)C')",null,'Unspecified target is not interpreted as a stereopure request');
run("var stereoRetro=retroDisconnectSmiles(felkinTarget,{budgetMs:10000,protect:false});");
check("stereoRetro.candidates.some(c=>c.transform==='carbonyl-reduction'&&!['racemic','mismatch'].includes(c.stereo))",false,'Retro cannot label mixed reduction as retained pure stereo');
run("var stereoJob=pathFinderCreate(felkinInputs[0],felkinTarget,{maxDepth:1,stockPolicy:'custom',availableMaterials:[],budgetMs:5000});while(stereoJob.status==='running')stereoJob.step(100);");
check("stereoJob.routes.some(r=>r.some(l=>l.candidate.outcomeId==='reduction-nabh4'))",false,'Path Finder cannot promote the mixed reduction to a pure route');
check(`(()=>{const inputs=['C[C@H](Br)CC','[C-]#N'],conditions={solvents:['dmf'],temperature:0};const p=stereoPredict(inputs,conditions).outcomes.find(o=>o.id==='sn2').products[0];return routeWorkspaceValidateStep({from:inputs[0],to:p.isomericSmiles,ruleId:'sn2',compounds:inputs.map((smiles,i)=>({smiles,role:i?'reagent':'reactant',equiv:'1'})),conditions}).status;})()`,'verified','A correctly inverted stereospecific route still verifies');
run("var retainedStereo=retroDisconnectSmiles('C[C@H](OS(C)(=O)=O)CC',{budgetMs:10000,protect:false}).candidates.find(c=>c.transform==='sulfonate');");
check("!!retainedStereo&&retainedStereo.compounds.some(c=>c.role==='reactant'&&c.smiles.includes('@'))",true,'Recorded compounds carry the classified precursor stereo');
check("!!retainedStereo&&retroForwardCheck(retainedStereo,'C[C@H](OS(C)(=O)=O)CC')",true,'Retained stereo independently replays from recorded inputs');
check("(()=>{const o=stereoPredict(['C[C@H](F)C(=O)CCC(=O)OC','[Li+].[AlH4-]'],{solvents:['ether']}).outcomes.find(o=>o.id==='reduction-lialh4');return o.products.some(p=>moleculeSame(p.fragment||p.smiles,'CO')&&!p.stereo)&&o.products.some(p=>p.stereo?.kind==='diastereomers');})()",true,'Achiral coproduct does not inherit the main-component mixture label');
console.log('Stereo reaction fidelity: '+checks+' checks passed');
