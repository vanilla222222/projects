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
function bkSpecs(target){const t=retroTarget(retroFromSmiles(target));t.edits=[];t.currentTransform='beckmann';return {t,specs:RETRO_TRANSFORMS.find(x=>x.id==='beckmann').match(t)};}
function bkVerified(target){const r=bkSpecs(target);return r.specs.filter(spec=>{const v=retroTryVerify(spec,r.t.smiles);return v&&v.outcome.id==='beckmann';});}
function bkPredict(reactants,conditions){return predictReaction(reactants.map(smiles=>retroCompound({smiles,role:'reactant'})),normalizeReactionConditions(conditions||{}));}
function bkOutcome(result,id){return [result.best,...result.alternatives].filter(Boolean).find(o=>o.id===id);}
function bkForward(start,target,conditions={solvents:['none'],additives:['h2so4'],temperature:110}){const r=bkPredict([start],conditions);return [r.best,...r.alternatives].filter(Boolean).find(o=>o.id==='beckmann'&&retroFindProduct(o.products,target));}
`);
check(`!!bkForward('CC(C)=NO','CC(=O)NC')`,true,'Acetone oxime forward-verifies to N-methylacetamide');
check(`!!bkForward('C1CCCCC1=NO','O=C1NCCCCC1')`,true,'Cyclohexanone oxime forward-verifies to caprolactam');
check(`!!bkForward('CC(=NO)c1ccccc1','CC(=O)Nc1ccccc1')`,true,'Acetophenone oxime forward-verifies with aryl migration');
check(`!!bkForward('CCC(C)=NO','CC(=O)NCC')`,true,'Butanone oxime forward-verifies with ethyl migration');
check(`bkForward('CC(C)=NO','CC(=O)NC').consumes.filter(Boolean).length`,1,'Forward outcome records ketoxime consumption');
check(`bkOutcome(bkPredict(['CC(C)=NO'],{solvents:['none'],temperature:110}),'beckmann')===undefined`,true,'No Beckmann outcome is claimed without acid');
check(`bkOutcome(bkPredict(['CC=NO'],{solvents:['none'],additives:['h2so4'],temperature:110}),'beckmann-nitrile')!==undefined`,true,'Aldoxime dehydration remains a separate outcome');
check(`bkOutcome(bkPredict(['CC=NO'],{solvents:['none'],additives:['h2so4'],temperature:110}),'beckmann')===undefined`,true,'Aldoxime does not invent an amide rearrangement');

check(`bkVerified('CC(=O)NC').length`,1,'N-methylacetamide has one verified reverse candidate');
check(`bkVerified('CC(=O)NC')[0].precursors[0].smiles===retroCanonicalSmiles('CC(C)=NO')`,true,'N-methylacetamide disconnects to acetone oxime');
check(`bkVerified('O=C1NCCCCC1')[0].precursors[0].smiles===retroCanonicalSmiles('C1CCCCC1=NO')`,true,'Caprolactam disconnects to cyclohexanone oxime');
check(`bkVerified('CC(=O)Nc1ccccc1')[0].precursors[0].smiles===retroCanonicalSmiles('CC(=NO)c1ccccc1')`,true,'Acetanilide disconnects to acetophenone oxime');
check(`bkVerified('CC(=O)NCC')[0].precursors[0].smiles===retroCanonicalSmiles('CCC(C)=NO')`,true,'N-ethylacetamide disconnects to butanone oxime');
check(`bkVerified('CCC(=O)NC').length`,0,'Forward verification rejects the wrong butanone migration regioisomer');
check(`bkVerified('CC(=O)N').length`,0,'Primary amides are not ketoxime rearrangement products');
check(`bkVerified('CC(=O)N(C)C').length`,0,'Tertiary amides are excluded');
check(`bkVerified('CC(=O)OC').length`,0,'Esters are not mistaken for amides');
check(`bkVerified('CC(=O)NCCC(C)=O').length`,0,'Additional carbonyl functionality is conservatively rejected');
check(`bkVerified('CC(=O)NCCN').length`,0,'Additional nitrogen functionality is conservatively rejected');
check(`bkSpecs('CC(=O)NC').specs[0].conditions.additives.join('|')`,'h2so4','Reverse candidate retains acid conditions');
check(`bkSpecs('CC(=O)NC').specs[0].conditions.temperature`,110,'Reverse candidate uses hot Beckmann conditions');
check(`['CC(=O)NC','O=C1NCCCCC1'].every(target=>retroDisconnectSmiles(target,{protect:false,budgetMs:10000}).candidates.some(c=>c.transform==='beckmann'))`,true,'Public reverse search exposes amide and lactam disconnections');
check(`(()=>{const g=retroFromSmiles('CC(=O)Nc1ccccc1'),before=JSON.stringify(g),t=retroTarget(g);t.edits=[];t.currentTransform='beckmann';RETRO_TRANSFORMS.find(x=>x.id==='beckmann').match(t);return JSON.stringify(g)===before;})()`,true,'Beckmann disconnection does not mutate the target');

run(`var bkJob=pathFinderCreate('CC(C)=NO','CC(=O)NC',{maxDepth:1,budgetMs:10000});while(bkJob.status==='running')bkJob.step(100);`);
check(`bkJob.status==='found'&&bkJob.routes.some(route=>route.length===1&&route[0].candidate.transform==='beckmann'&&retroForwardCheck(route[0].candidate,route[0].to))`,true,'Path Finder returns a forward-verified amide route');
run(`var bkLactamJob=pathFinderCreate('C1CCCCC1=NO','O=C1NCCCCC1',{maxDepth:1,budgetMs:10000});while(bkLactamJob.status==='running')bkLactamJob.step(100);`);
check(`bkLactamJob.status==='found'&&bkLactamJob.routes.some(route=>route.length===1&&route[0].candidate.transform==='beckmann'&&retroForwardCheck(route[0].candidate,route[0].to))`,true,'Path Finder returns a forward-verified lactam route');
console.log('Beckmann retrosynthesis: ' + checks + ' checks passed.');
