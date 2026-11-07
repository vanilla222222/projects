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
// Reference scope: Chaikin & Brown, JACS 1949, DOI 10.1021/ja01169a033.
// The paper establishes acyl chloride reactivity, not selective outcomes for
// these invented multifunctional fixtures. Expected assertions concern audit
// rejection, not an experimentally established product or product ratio.
run(`function bhCompetition(smiles,solvent='ether',temperature=25){
 const compounds=[{smiles,fragment:smilesToFragment(smiles),role:'reactant',equiv:'1'},
 {smiles:'[Na+].[BH4-]',fragment:smilesToFragment('[Na+].[BH4-]'),role:'reagent',equiv:'1'}];
 const conditions={...defaultReactionConditions(),solvents:[solvent],temperature};
 const before=JSON.stringify(compounds),prediction=predictReaction(compounds,conditions);
 const outcome=[prediction.best,...prediction.alternatives].filter(Boolean).find(o=>o.id==='reduction-nabh4');
 return {compounds,conditions,prediction,outcome,unchanged:before===JSON.stringify(compounds),
 scope:outcome&&reactionScopeAssess(compounds,conditions,outcome),
 assessment:outcome&&routeStepAssessment({outcome,compounds,conditions})};
}`);
for(const smiles of ['CC(=O)CCC(=O)Cl','O=CCCC(=O)Cl','O=C(Cl)c1ccc(C=O)cc1','[13CH3]C(=O)CCC(=O)Cl']){
 ctx.smiles=smiles;
 check("bhCompetition(smiles).outcome.chemoselectivity?.competing.some(c=>c.group==='acylChloride')||false",true,'Competing acyl chloride recognized '+smiles);
 check("bhCompetition(smiles).scope.status",'conflict','Scope does not imply established selectivity '+smiles);
 check("bhCompetition(smiles).assessment.blockers.some(b=>b.code==='competing-sites')",true,'Planner rejects unresolved competition '+smiles);
 check("bhCompetition(smiles).unchanged",true,'Input structures unchanged '+smiles);
}
for(const solvent of ['water','ethanol','methanol','ether','thf','dmf']){
 ctx.solvent=solvent;
 check("bhCompetition('CC(=O)CCC(=O)Cl',solvent).assessment.status",'blocked','A medium choice does not establish unsupported selectivity '+solvent);
}
for(const smiles of ['CC(=O)CCC(=O)OC','CC(=O)CCC(=O)OC(C)(C)C','CC(=O)CCC#N','CC(=O)CCC(=O)N']){
 ctx.smiles=smiles;
 check("!!bhCompetition(smiles).outcome",true,'Existing mild reduction retained '+smiles);
 check("bhCompetition(smiles).assessment.status",'no-encoded-conflict','Other spectator groups do not inherit acyl chloride conflict '+smiles);
 check("bhCompetition(smiles).unchanged",true,'Control unchanged '+smiles);
}
check("bhCompetition('CC(=O)CCC(=O)Cl').outcome.warnings.some(w=>w.includes('not an established selective preparation'))",true,'Unresolved branch is explicitly labelled');
check("bhCompetition('CC(=O)CCC(=O)Cl').outcome.warnings.some(w=>w.includes('Ester, acid or amide groups'))",false,'Acyl chloride is not described as an inert mild-reduction spectator');
check("bhCompetition('CCC(=O)Cl').prediction.hints.some(h=>h.includes('Acyl chlorides can react'))",true,'Standalone unsupported case has an accurate hint');
check("bhCompetition('CCC(=O)Cl').prediction.hints.some(h=>h.includes('too mild'))",false,'No blanket claim of insufficient reducing strength');
check("bhCompetition('CC(=O)CCC(=O)Cl').outcome.evidence.references.some(r=>r.url==='https://doi.org/10.1021/ja01169a033')",true,'Primary reaction-class evidence linked');
run("var rejected=retroDisconnectSmiles('CC(O)CCC(=O)Cl',{budgetMs:10000,protect:false});");
check("rejected.candidates.some(c=>c.transform==='carbonyl-reduction')",false,'Retro engine excludes the unestablished selective disconnection');
check("rejected.compatibilityRejected.some(r=>r.code==='competing-sites')",true,'Retro engine records why the disconnection was rejected');
run("var j=pathFinderCreate('CC(=O)CCC(=O)Cl','CC(O)CCC(=O)Cl',{maxDepth:1,stockPolicy:'custom',availableMaterials:[],budgetMs:5000});while(j.status==='running')j.step(100);");
check("j.routes.some(r=>r.some(l=>l.candidate.outcomeId==='reduction-nabh4'))",false,'Path Finder does not promote the conflicting branch');
check("bhCompetition('CC(=O)CCC(=O)Cl').outcome.warnings.some(w=>w.includes('competing products are not established'))",true,'Competition warning does not invent mixture composition');
console.log('Borohydride competition: '+checks+' checks passed');
