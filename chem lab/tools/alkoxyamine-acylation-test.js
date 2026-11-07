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
run(`function alkoxyAcyl(acid,amine,chloride=false,amount=1.1){const spec=retroSpec([{smiles:acid,role:'reactant',equiv:1},{smiles:amine,role:'reactant',equiv:1}],chloride?[]:[{...RETRO23_REAGENTS.dcc,equiv:amount}],{solvents:['dcm'],additives:chloride?['pyr']:['dmap'],temperature:25});return predictReaction(spec.precursors.concat(spec.reagents).map(retroCompound),normalizeReactionConditions(spec.conditions));}`);
for(const [amine,target] of [['CON','CONC(=O)c1ccc(OC)cc1'],['CONC','CON(C)C(=O)c1ccc(OC)cc1'],['CCON','CCONC(=O)c1ccc(OC)cc1'],['[13CH3]O[15NH]C','[13CH3]O[15N](C)C(=O)c1ccc(OC)cc1']]){
 for(const chloride of [false,true]){
  run(`var r=alkoxyAcyl(${JSON.stringify(chloride?'COc1ccc(C(=O)Cl)cc1':'COc1ccc(C(=O)O)cc1')},${JSON.stringify(amine)},${chloride});`);
  check('r.best.id',chloride?'acyl-substitution':'amide-coupling','Both encoded activation routes acylate N');
  check(`moleculeSame(r.best.products[0].smiles,${JSON.stringify(target)})`,true,'Fixed N-acyl product, including isotope identity');
  check(`r.best.warnings.some(w=>/N-alkoxyamide/.test(w))`,true,'Product family explained');
  check('!!rxLoadingConflict(r.best)',false,'Full recipe loading');
 }
}
for(const smiles of ['NO','CON(C)C','CO[NH2+]C','CONC(=O)C','CC(=O)ON','COON','C[O+](C)N']){
 check(`rxAcylAmineSites(retroFromSmiles(${JSON.stringify(smiles)})).filter(s=>s.alkoxyamine).length`,0,'Unsupported nitrogen/oxygen state excluded: '+smiles);
}
check(`rxAcylAmineSites(retroFromSmiles('CON')).length`,1,'Neutral methoxyamine included');
check(`rxAnalyze(retroFromSmiles('CON')).amines.length`,0,'Other amine rule scopes remain unchanged');
check(`rxAcylAmineSites(retroFromSmiles('CONC(=O)C')).length`,0,'Product cannot be acylated repeatedly');
run(`var competing=alkoxyAcyl('COc1ccc(C(=O)O)cc1','CONCCO');`);
check(`moleculeSame(competing.best.products[0].smiles,'CON(CCO)C(=O)c1ccc(OC)cc1')`,true,'N-acyl branch for alkoxyamino-alcohol');
check(`competing.best.chemoselectivity.competing.some(s=>s.group==='alcohol')`,true,'Retained OH remains a competing site');
check(`!!rxLoadingConflict(alkoxyAcyl('CC(=O)O','CONC',false,0.5).best)`,true,'Insufficient DCC cannot be hidden');
check(`alkoxyAcyl('CC(=O)O','COCCO').best.id`,'steglich','Ordinary methoxy alcohol still forms ester');
run(`var target='CON(C)C(=O)c1ccc(OC)cc1';var job=pathFinderCreate('CONC',target,{maxDepth:1,maxRoutes:1,stockPolicy:'custom',availableMaterials:['COc1ccc(C(=O)O)cc1']});while(job.status==='running')job.step(100);`);
check('job.status','found','Reverse planner recognizes N-methoxyamide');
check('job.route.length',1,'Direct coupling counted as one step');
check('job.route[0].candidate.outcomeId','amide-coupling','Planner uses supported coupling');
check(`retroForwardCheck(job.route[0].candidate,job.route[0].to)`,true,'Route independently replays');
for(const order of [['CO','CON'],['CON','CO']]){
 run(`var ordered=predictReaction(['CC(=O)Cl',...${JSON.stringify(order)}].map(smiles=>retroCompound({smiles,role:'reactant',equiv:1})),normalizeReactionConditions({solvents:['dcm'],additives:['pyr'],temperature:25}));`);
 check(`moleculeSame(ordered.best.products[0].smiles,'CONC(C)=O')`,true,'N acylation does not depend on input order');
 check(`ordered.best.chemoselectivity.otherInputs.some(s=>s.group==='alcohol')`,true,'Other recorded alcohol remains a competitor');
}
console.log('Alkoxyamine acylation: '+checks+' checks passed.');
