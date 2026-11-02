'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const context = vm.createContext({ console, performance, setTimeout, clearTimeout });
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/<script src="([^"]+)"/g)) {
  if (match[1] !== 'js/app.js') vm.runInContext(fs.readFileSync(path.join(root, match[1]), 'utf8'), context, { filename: match[1] });
}
const run = (code) => vm.runInContext(code, context);
let checks=0;
function check(code,expected,label){assert.equal(run(code),expected,label);checks++;}
for(const [smiles,phase] of [['CCO','L'],['OCC','L'],['CC(C)=O','L'],['[H][H]','G'],['CC(C)(C)OC(=O)OC(=O)OC(C)(C)C','S']])check(`reactionMaterialStateResolve(undefined,${JSON.stringify(smiles)}).phase`,phase,'Local catalog form '+smiles);
check(`reactionMaterialStateResolve(undefined,'CCO').automatic`,true,'Default is automatic');
check(`reactionMaterialStateResolve({phase:'S'},'CCO').phase`,'S','Explicit override survives');
check(`reactionMaterialStateResolve({phase:'unknown'},'CCO').phase`,'L','Automatic reset works');
check(`reactionMaterialStateResolve(undefined,'OCCCCCCCCCO',{solvents:['thf']}).phase`,'Aq','Unknown form uses declared medium assumption');
check(`reactionMaterialStateResolve(undefined,'OCCCCCCCCCO',{solvents:['thf']}).basis`,'assumed-medium','Assumption labeled');
check(`reactionMaterialStateResolve(undefined,'OCCCCCCCCCO',{solvents:['thf']}).solvent`,'THF','Solvent named');
check(`reactionMaterialStateResolve(undefined,'OCCCCCCCCCO',{solvents:['none']}).phase`,'unknown','No arbitrary solid/liquid guess for unknown neat compound');
check(`reactionMaterialStateResolve(undefined,'[Li+].CC(C)[N-]C(C)C').solvent`,'THF','Catalog-specified carrier');
run(`reactionPlanningMaterialState('OCCCCCCCCCO',{phase:'unknown'});`);
check(`reactionPlanningMaterialState('OCCCCCCCCCO',undefined,{solvents:['thf']}).solvent`,'THF','Planning context propagated');
check(`reactionPlanningMaterialState('OCCCCCCCCCO',undefined,{solvents:['dcm']}).solvent`,'Dichloromethane','Automatic state recalculates rather than leaking another recipe solvent');
run(`reactionPlanningMaterialState('OCCCCCCCCCO',{phase:'S'});`);
check(`reactionPlanningMaterialState('OCCCCCCCCCO',undefined,{solvents:['dcm']}).phase`,'S','Manual phase wins over inferred medium');
run(`var link={from:'CCO',to:'OCCCCCCCCCCO',candidate:{conditions:normalizeReactionConditions({solvents:['dcm']}),compounds:[retroCompound({smiles:'CCO',role:'reactant'})]}};var annotated=reactionPlanningRouteLink(link);`);
check('annotated.toState.phase','Aq','Saved route receives inferred phase');check('annotated.toState.automatic',true,'Automatic provenance retained');
check(`reactionMaterialStateNormalize(annotated.toState).basis`,'assumed-medium','Provenance survives persistence normalization');
check(`reactionMaterialStateResolve({phase:'Aq',solvent:''},'CCO').phase`,'unknown','Incomplete manual solution cannot silently fall back to neat liquid');
run(`reactionPlanningMaterialState('CCO',{phase:'Aq',solvent:''});`);check(`reactionPlanningMaterialState('CCO').needsSolvent`,true,'Incomplete manual solution remains explicit in planning controls');
check(`reactionMaterialStateResolve({phase:'unknown'},'CCO').phase`,'L','Explicit Automatic still restores catalog inference');
console.log('Automatic material states: '+checks+' checks passed.');
