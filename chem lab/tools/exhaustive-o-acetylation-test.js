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
run(`function acetyl(s,equiv=6,changes={}){const compounds=[{smiles:s,role:'reactant',equiv:1},{smiles:'CC(=O)OC(C)=O',role:'reagent',equiv}].map(retroCompound);return predictReaction(compounds,normalizeReactionConditions({solvents:['dcm'],additives:['pyr'],temperature:25,...changes}));}`);
for(const [start,target,n] of [['OCCO','CC(=O)OCCOC(C)=O',2],['OCC(O)CO','CC(=O)OCC(OC(C)=O)COC(C)=O',3],['OCC(O)C(O)CO','CC(=O)OCC(OC(C)=O)C(OC(C)=O)COC(C)=O',4],['COCC(O)CO','COCC(OC(C)=O)COC(C)=O',2],['Oc1ccccc1O','CC(=O)Oc1ccccc1OC(C)=O',2],['[13CH2](O)CO','[13CH2](OC(C)=O)COC(C)=O',2]]){
 run(`var r=acetyl(${JSON.stringify(start)});`);
 check('r.best.id','exhaustive-o-acetylation','Bulk outcome');
 check(`r.best.products.some(p=>moleculeSame(p.smiles,${JSON.stringify(target)}))`,true,'Fixed exhaustive product');
 check('r.best.bulkTransformation.sites',n,'Every OH counted');
 check(`r.best.products.find(p=>moleculeSame(p.smiles,'CC(=O)O')).count`,n,'Acetic acid coproduct balance');
 check('!!rxLoadingConflict(r.best)',false,'Sufficient loading');
 check(`r.best.chemoselectivity===null`,true,'No remaining competing OH');
}
check(`!!rxLoadingConflict(acetyl('OCCO',1).best)`,true,'Insufficient loading blocked');
for(const start of ['CCO','OCC(O)C(O)C(O)CO','NCC(O)CO','OC(O)CO','OCC(O)(C)C','OCC1OC1O','OCC(O)C=O','OCC(O)C=C'])check(`rx6RuleExhaustiveOAcetylation(reactionContext([retroCompound({smiles:${JSON.stringify(start)},role:'reactant'}),retroCompound({smiles:'CC(=O)OC(C)=O',role:'reagent'})],normalizeReactionConditions({solvents:['dcm'],additives:['pyr'],temperature:25}))).length`,0,'Excluded scope '+start);
for(const change of [{solvents:['water']},{additives:[]},{additives:['pyr','naoh']},{temperature:80}])check(`acetyl('OCCO',3,${JSON.stringify(change)}).best?.id==='exhaustive-o-acetylation'`,false,'Condition boundary');
run(`var job=pathFinderCreate('OCCO','CC(=O)OCCOC(C)=O',{maxDepth:1,maxRoutes:1,stockPolicy:'custom',availableMaterials:['CC(=O)OC(C)=O']});while(job.status==='running')job.step(100);`);
check('job.status','found','One-step exhaustive route');check('job.route.length',1,'One actual operation');check(`retroForwardCheck(job.route[0].candidate,job.route[0].to)`,true,'Replay');
console.log('Exhaustive O-acetylation: '+checks+' checks passed.');
