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
function bvSpecs(target){const t=retroTarget(retroFromSmiles(target));t.edits=[];t.currentTransform='baeyer-villiger';return {t,specs:RETRO_TRANSFORMS.find(x=>x.id==='baeyer-villiger').match(t)};}
function bvVerified(target){const r=bvSpecs(target);return r.specs.filter(spec=>{const v=retroTryVerify(spec,r.t.smiles);return v&&v.outcome.id==='baeyer-villiger';});}
function bvPredict(reactants,reagents,conditions){const compounds=reactants.map(smiles=>({smiles,role:'reactant'})).concat((reagents||[]).map(smiles=>({smiles,role:'reagent'}))).map(retroCompound);return predictReaction(compounds,normalizeReactionConditions(conditions||{}));}
function bvOutcome(result,id){return [result.best,...result.alternatives].filter(Boolean).find(o=>o.id===id);}
function bvForward(start,target){const r=bvPredict([start],['OOC(=O)c1cccc(Cl)c1'],{solvents:['dcm'],temperature:20});return [r.best,...r.alternatives].filter(Boolean).find(o=>o.id==='baeyer-villiger'&&retroFindProduct(o.products,target));}
`);
check(`!!bvForward('CC(C)=O','CC(=O)OC')`,true,'Acetone forward-verifies to methyl acetate');
check(`!!bvForward('O=C1CCCCC1','O=C1OCCCCC1')`,true,'Cyclohexanone forward-verifies to caprolactone');
check(`!!bvForward('CC(=O)c1ccccc1','CC(=O)Oc1ccccc1')`,true,'Acetophenone forward-verifies with aryl migration');
check(`!!bvForward('CC(=O)C(C)(C)C','CC(=O)OC(C)(C)C')`,true,'Tertiary migration forward-verifies');
check(`bvForward('CC(C)=O','CC(=O)OC').consumes.filter(Boolean).length`,2,'Forward outcome records ketone and peracid consumption');
check(`bvOutcome(bvPredict(['C=CC(C)=O'],['OOC(=O)c1cccc(Cl)c1'],{solvents:['dcm'],temperature:20}),'baeyer-villiger')===undefined`,true,'Alkene substrate no longer receives a competing Baeyer–Villiger outcome');
check(`bvOutcome(bvPredict(['C=CC(C)=O'],['OOC(=O)c1cccc(Cl)c1'],{solvents:['dcm'],temperature:20}),'epoxidation')!==undefined`,true,'Dedicated epoxidation remains available for the alkene substrate');
check(`bvOutcome(bvPredict(['CC(C)=O'],['OOC(=O)c1cccc(Cl)c1'],{solvents:['dcm'],temperature:20}),'epoxidation')===undefined`,true,'Saturated ketone does not invent an epoxidation outcome');

check(`bvVerified('CC(=O)OC').length`,1,'Methyl acetate has one verified reverse candidate');
check(`bvVerified('CC(=O)OC')[0].precursors[0].smiles===retroCanonicalSmiles('CC(C)=O')`,true,'Methyl acetate disconnects to acetone');
check(`bvVerified('O=C1OCCCCC1')[0].precursors[0].smiles===retroCanonicalSmiles('O=C1CCCCC1')`,true,'Caprolactone disconnects to cyclohexanone');
check(`bvVerified('CC(=O)Oc1ccccc1')[0].precursors[0].smiles==='CC(C1=CC=CC=C1)=O'`,true,'Phenyl acetate disconnects to acetophenone');
check(`bvVerified('CC(=O)OC(C)(C)C')[0].precursors[0].smiles===retroCanonicalSmiles('CC(=O)C(C)(C)C')`,true,'Tert-butyl acetate disconnects to pinacolone');
check(`bvVerified('CCC(=O)OC').length`,0,'Forward verification rejects the wrong butanone regioisomer');
check(`bvVerified('CC(=O)O').length`,0,'Carboxylic acids are not treated as ketone-insertion products');
check(`bvVerified('CC(=O)OCCC(C)=O').length`,0,'Additional carbonyl functionality is conservatively rejected');
check(`bvVerified('C=CCOC(C)=O').length`,0,'Alkene-containing ester is excluded from the selective reverse rule');
check(`bvSpecs('CC(=O)OC').specs[0].reagents[0].smiles===RETRO_REAGENTS.mcpba.smiles`,true,'Reverse candidate retains mCPBA');
check(`bvSpecs('CC(=O)OC').specs[0].conditions.solvents.join('|')`,'dcm','Reverse candidate retains dry DCM conditions');
check(`['CC(=O)OC','O=C1OCCCCC1'].every(target=>retroDisconnectSmiles(target,{protect:false,budgetMs:10000}).candidates.some(c=>c.transform==='baeyer-villiger'))`,true,'Public reverse search exposes ester and lactone disconnections');
check(`(()=>{const g=retroFromSmiles('CC(=O)OC(C)(C)C'),before=JSON.stringify(g),t=retroTarget(g);t.edits=[];t.currentTransform='baeyer-villiger';RETRO_TRANSFORMS.find(x=>x.id==='baeyer-villiger').match(t);return JSON.stringify(g)===before;})()`,true,'Baeyer–Villiger disconnection does not mutate the target');

run(`var bvJob=pathFinderCreate('CC(C)=O','CC(=O)OC',{maxDepth:1,budgetMs:10000});while(bvJob.status==='running')bvJob.step(100);`);
check('bvJob.status','found','Path Finder connects acetone to methyl acetate at depth one');
check(`bvJob.routes.some(route=>route.length===1&&route[0].candidate.transform==='baeyer-villiger'&&retroForwardCheck(route[0].candidate,route[0].to))`,true,'Path Finder returns a forward-verified ester route');
run(`var bvLactoneJob=pathFinderCreate('O=C1CCCCC1','O=C1OCCCCC1',{maxDepth:1,budgetMs:10000});while(bvLactoneJob.status==='running')bvLactoneJob.step(100);`);
check('bvLactoneJob.status','found','Path Finder connects cyclohexanone to caprolactone at depth one');
check(`bvLactoneJob.routes.some(route=>route.length===1&&route[0].candidate.transform==='baeyer-villiger'&&retroForwardCheck(route[0].candidate,route[0].to))`,true,'Path Finder returns a forward-verified lactone route');
console.log('Baeyer–Villiger retrosynthesis: ' + checks + ' checks passed.');
