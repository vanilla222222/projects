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
run(`function chemoFixture(smiles,additives){
 const compounds=[{smiles,fragment:smilesToFragment(smiles),role:'reactant',equiv:'1'}];
 const conditions={...defaultReactionConditions(),solvents:['ether'],additives};
 additives.filter(id=>['lialh4','nabh4','pcc'].includes(id)).forEach(id=>{const r={lialh4:'[Li+].[AlH4-]',nabh4:'[Na+].[BH4-]',pcc:'[O-][Cr](=O)(=O)Cl.c1cc[nH+]cc1'}[id];compounds.push({smiles:r,fragment:smilesToFragment(r),role:'reagent',equiv:'1'});});
 conditions.additives=additives.filter(id=>!['lialh4','nabh4','pcc'].includes(id));
 const prediction=predictReaction(compounds,conditions);
 return {prediction,scope:reactionScopeAssess(compounds,conditions,prediction.best)};
}`);
check("chemoFixture('CC(=O)CCC(=O)OC(C)(C)C',['lialh4']).scope.sites.some(s=>s.group==='tBuEster'&&s.susceptible)",true,'LAH susceptibility includes tert-butyl ester');
check("chemoFixture('CC(=O)CCC(=O)OC(C)(C)C',['nabh4']).scope.sites.some(s=>s.group==='tBuEster'&&s.susceptible)",false,'NaBH4 does not acquire ester susceptibility');
check("chemoFixture('CC(=O)CCC(=O)OC(C)(C)C',['lialh4']).prediction.best.chemoselectivity.changed.includes('tBuEster')",true,'Bulk reduction reports both ketone and protected ester edits');
check("chemoFixture('CC(=O)CCC(=O)O',['lialh4']).prediction.best.chemoselectivity.suggestion.includes('tert-butyl')",false,'An ester is not suggested as a LAH-resistant acid mask');
check("(()=>{const f=chemoFixture('OCCC(C)(C)O',['pcc']);return f.prediction.best.chemoselectivity===null;})()",true,'Tertiary alcohol is not a PCC competing oxidation site');
check("chemoFixture('OCCC(C)(C)O',['pcc']).scope.selectivity.susceptibleCount",1,'Audit and predictor share PCC alcohol susceptibility');
check("chemoFixture('CC(=O)CCC(=O)OC(C)(C)C',['lialh4']).scope.selectivity.susceptibleCount",2,'Ketone and tert-butyl ester both enter the audit');
check("chemoFixture('CC(=O)CCC(=O)OC(C)(C)C',['nabh4']).scope.selectivity.susceptibleCount",1,'Mild reduction has one susceptible carbonyl class');
check("chemoFixture('CC(=O)CCC(=O)OC(C)(C)C',['lialh4']).prediction.best.products.some(p=>moleculeSame(p.fragment||p.smiles,'CC(O)CCCO'))",true,'Full reduction retains its correct main product');
check("chemoFixture('CC(=O)CCC(=O)OC(C)(C)C',['nabh4']).prediction.best.products.some(p=>moleculeSame(p.fragment||p.smiles,'CC(O)CCC(=O)OC(C)(C)C'))",true,'Mild reduction retains the ester');
check("chemoFixture('OCCC(O)CC',['pcc']).scope.selectivity.susceptibleCount",2,'Two oxidizable alcohols stay susceptible');
check("chemoFixture('OCCC(O)CC',['pcc']).scope.selectivity.status",'multiple-sites','Bulk oxidation is not presented as selective');
check("rxChemoProtectionSuggestion('acid',{id:'organometallic'})",'','Organometallic acid-mask advice also excludes electrophilic ester');
check("rxChemoProtectionSuggestion('ketone',{id:'alanate'}).includes('acetal')",true,'Applicable acetal advice remains available');
check(`(()=>{
 const compounds=[{smiles:'CC(=O)CCC(=O)OC(C)(C)C',fragment:smilesToFragment('CC(=O)CCC(=O)OC(C)(C)C'),role:'reactant'},
 {smiles:'[Li+].[AlH4-]',fragment:smilesToFragment('[Li+].[AlH4-]'),role:'reagent'}];
 const context=reactionContext(compounds,{...defaultReactionConditions(),solvents:['ether']});
 const outcome={products:[{smiles:'CCO'},{smiles:'CC(=O)OC(C)(C)C'}],consumes:compounds.map(compound=>({compound})),warnings:[]};
 return rxChemoselectivity(context,outcome).competing.some(c=>c.group==='tBuEster');
})()`,true,'Susceptible groups in secondary product components are still counted');
console.log(checks+' chemoselectivity corrections passed');
