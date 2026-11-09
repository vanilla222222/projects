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
run(`function esterPlans(target){const t=retroTarget(retroFromSmiles(target));t.edits=[];t.currentTransform='steglich';const transform=RETRO_TRANSFORMS.find(x=>x.id==='steglich');const spec=transform.match(t)[0];spec.transform=transform;spec.key=retroSpecKey(spec);spec.record=retroSpecRecord(t,spec,0);const sink={};const v=retroTryVerify(spec,t.smiles,sink);spec.attempt={verified:v,result:sink.result};return {direct:v,raw:sink.result,plans:retroProtectPlans(spec,t)};}
function esterPrediction(acid,alcohol,amount=1.1){return predictReaction([{smiles:acid,fragment:smilesToFragment(acid),role:'reactant',equiv:1},{smiles:alcohol,fragment:smilesToFragment(alcohol),role:'reactant',equiv:1},{smiles:RETRO23_REAGENTS.dcc.smiles,fragment:smilesToFragment(RETRO23_REAGENTS.dcc.smiles),role:'reagent',equiv:amount}],normalizeReactionConditions({solvents:['dcm'],additives:['dmap'],temperature:25}));}`);
for(const [alcohol,target] of [['COCCO','COc1ccc(C(=O)OCCOC)cc1'],['CN(C)CCO','COc1ccc(C(=O)OCCN(C)C)cc1'],['COc1ccc(O)cc1','COc1ccc(C(=O)Oc2ccc(OC)cc2)cc1']]){
 run(`var prediction=esterPrediction('COc1ccc(C(=O)O)cc1',${JSON.stringify(alcohol)});`);
 check('prediction.best.id','steglich','Functionalized alcohol/phenol forms ester');
 check(`moleculeSame(prediction.best.products[0].smiles,${JSON.stringify(target)})`,true,'Fixed complex ester connectivity');
 check('!!rxLoadingConflict(prediction.best)',false,'Sufficient DCC loading');
}
for(const target of ['NCCOC(=O)c1ccc(OC)cc1','CNCCOC(=O)c1ccc(OC)cc1','[13CH2](N)COC(=O)c1ccc(OC)cc1']){
 run(`var planResult=esterPlans(${JSON.stringify(target)});`);
 check('!!planResult.direct',false,'Unprotected O-acylation cannot bypass N competition');
 check('planResult.raw.best.id','amide-coupling','Free amine acylates preferentially');
 check(`planResult.raw.best.chemoselectivity.changed.includes('amine')`,true,'Activated acid audited');
 check(`planResult.plans.some(p=>p.protection.id==='boc')`,true,'Protected Steglich plan exists');
 check('planResult.plans.every(p=>p.pgSteps.length===3)',true,'Three real operations');
 check('planResult.plans.every(p=>!routeStepAssessment(p).blockers.length)',true,'Every operation passes shared guards');
 check(`planResult.plans.every(p=>moleculeSame(p.pgSteps[2].product.smiles,${JSON.stringify(target)}))`,true,'Unprotected endpoint and isotope preserved');
}
check(`esterPrediction('O=C(O)CCN','CCO').best.chemoselectivity.competing.some(c=>c.group==='amine')`,true,'Acid-side amine is a competitor too');
check(`!!rxLoadingConflict(esterPrediction('COc1ccc(C(=O)O)cc1','COCCO',0.5).best)`,true,'Explicit insufficient DCC remains blocked');
for(const temperature of [25,80]){
 check(`protectionAssess('CC(C)(C)OC(=O)NCCO',[retroCompound(RETRO23_REAGENTS.dcc)],normalizeReactionConditions({solvents:['dcm'],temperature:${temperature}})).status`,temperature===25?'compatible':'unknown','Only bounded mild coupling regime is covered');
}
run(`var job=pathFinderCreate('NCCO','NCCOC(=O)c1ccc(OC)cc1',{maxDepth:3,maxRoutes:1,stockPolicy:'custom',availableMaterials:['COc1ccc(C(=O)O)cc1'],forbiddenRules:['fischer','acyl','mitsunobu']});while(job.status==='running')job.step(100);`);
check('job.status','found','Path Finder uses supplied complex acid');
check('job.route.length',3,'No hidden protection operations');
check(`job.route.map(l=>l.candidate.planning.kind).join(',')`,'protect,reaction,deprotect','Planner displays each operation');
check(`job.route.every(l=>retroForwardCheck(l.candidate,l.to))`,true,'Whole route replays');
console.log('Complex ester coupling: '+checks+' checks passed.');
