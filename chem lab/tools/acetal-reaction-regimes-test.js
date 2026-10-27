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
let checks = 0;
function check(code, expected, label) { assert.equal(run(code), expected, label); checks++; }
run(`
function acetalPrediction(reactants,reagents,conditions,id){
 const compounds=reactants.map(smiles=>({smiles,role:'reactant'})).concat(reagents.map(smiles=>({smiles,role:'reagent'}))).map(retroCompound);
 const normalized=normalizeReactionConditions(conditions),result=predictReaction(compounds,normalized);
 const outcome=[result.best,...result.alternatives].filter(Boolean).find(o=>o.id===id);
 return {compounds,conditions:normalized,outcome,assessment:outcome&&routeStepAssessment({outcome,compounds,conditions:normalized})};
}
var pccAcetal=acetalPrediction(['OCC1OCCO1'],['[O-][Cr](=O)(=O)Cl.c1cc[nH+]cc1'],{solvents:['dcm']},'oxidation-pcc');
var wkAcetal=acetalPrediction(['O=CCC1OCCO1'],['NN','[K+].[OH-]'],{solvents:['none'],temperature:180},'wolff-kishner');
var clemmensenAcetal=acetalPrediction(['O=CCC1OCCO1'],['Cl'],{solvents:['water'],additives:['znhg'],temperature:100},'clemmensen');
`);
check(`!!pccAcetal.outcome&&retroFindProduct(pccAcetal.outcome.products,'O=CC1OCCO1')!==null`,true,'PCC oxidizes the alcohol while retaining the acetal');
check(`pccAcetal.outcome.protectionAssessment.status`,'compatible','PCC is a characterized acetal-compatible oxidation regime');
check(`pccAcetal.assessment.blockers.length`,0,'The planner no longer blocks PCC oxidation because of generic otherReactive');
check(`!!wkAcetal.outcome&&retroFindProduct(wkAcetal.outcome.products,'CCC1OCCO1')!==null`,true,'Wolff–Kishner deoxygenates the aldehyde while retaining the acetal');
check(`wkAcetal.outcome.protectionAssessment.status`,'compatible','Hydrazine and high temperature do not create false acetal conflicts');
check(`wkAcetal.assessment.blockers.length`,0,'The planner accepts the bounded basic Wolff–Kishner regime');
check(`!!clemmensenAcetal.outcome&&clemmensenAcetal.assessment.blockers.length>0`,true,'Clemmensen remains blocked by aqueous-acid acetal hydrolysis');
check(`protectionAssess('CC1OCCO1',['otherReactive']).status`,'unknown','Unclassified reaction regimes remain conservatively unknown');

run(`var acetalDeoxyJob=pathFinderCreate('O=CCC1OCCO1','CCC1OCCO1',{maxDepth:1,budgetMs:10000});while(acetalDeoxyJob.status==='running')acetalDeoxyJob.step(100);`);
check(`acetalDeoxyJob.status`,'found','Path Finder now connects an acetal-bearing aldehyde to its deoxygenated product');
check(`acetalDeoxyJob.routes.some(route=>route.length===1&&route[0].candidate.transform==='wolff-kishner'&&retroForwardCheck(route[0].candidate,route[0].to))`,true,'The returned acetal route passes forward verification');
run(`var acetalOxidationJob=pathFinderCreate('OCC1OCCO1','O=CC1OCCO1',{maxDepth:1,budgetMs:10000});while(acetalOxidationJob.status==='running')acetalOxidationJob.step(100);`);
check(`acetalOxidationJob.status`,'found','Path Finder now connects an acetal-bearing alcohol to its aldehyde');
console.log('Acetal reaction regimes: ' + checks + ' checks passed.');
