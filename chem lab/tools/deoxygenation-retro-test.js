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
function deoxySpecs(target,id){const t=retroTarget(retroFromSmiles(target));t.edits=[];t.currentTransform=id;return {t,specs:RETRO_TRANSFORMS.find(x=>x.id===id).match(t)};}
function deoxyVerified(target,id){const r=deoxySpecs(target,id);return r.specs.filter(spec=>{const v=retroTryVerify(spec,r.t.smiles);return v&&v.outcome.id===id;});}
function deoxyPredict(reactants,reagents,conditions){const compounds=reactants.map(smiles=>({smiles,role:'reactant'})).concat((reagents||[]).map(smiles=>({smiles,role:'reagent'}))).map(retroCompound);return predictReaction(compounds,normalizeReactionConditions(conditions||{}));}
function deoxyOutcome(result,id){return [result.best,...result.alternatives].filter(Boolean).find(o=>o.id===id);}
`);
check(`(()=>{const o=deoxyOutcome(deoxyPredict(['CC=O'],['NN','[K+].[OH-]'],{solvents:['none'],temperature:180}),'wolff-kishner');return !!o&&!!retroFindProduct(o.products,'CC');})()`,true,'Hot basic hydrazine conditions forward-verify Wolff–Kishner deoxygenation');
check(`deoxyOutcome(deoxyPredict(['CC=O'],['NN','[K+].[OH-]'],{solvents:['none'],temperature:180}),'wolff-kishner').consumes.filter(Boolean).length`,2,'Wolff–Kishner outcome records carbonyl and hydrazine consumption');
check(`deoxyOutcome(deoxyPredict(['CC=O'],['NN','[K+].[OH-]'],{solvents:['none'],temperature:25}),'wolff-kishner')===undefined`,true,'Cool conditions no longer claim Wolff–Kishner deoxygenation');
check(`deoxyOutcome(deoxyPredict(['CC=O'],['NN','[K+].[OH-]'],{solvents:['none'],temperature:25}),'hydrazone')!==undefined`,true,'Cool hydrazine conditions still predict hydrazone formation');
check(`(()=>{const o=deoxyOutcome(deoxyPredict(['CC(C)=O'],['Cl'],{solvents:['water'],additives:['znhg'],temperature:100}),'clemmensen');return !!o&&!!retroFindProduct(o.products,'CCC');})()`,true,'Acidic zinc amalgam conditions forward-verify Clemmensen deoxygenation');

for (const id of ['wolff-kishner','clemmensen']) {
  check(`deoxyVerified('CC',${JSON.stringify(id)}).length`,1,id+' exposes ethane from acetaldehyde');
  check(`deoxyVerified('CC',${JSON.stringify(id)})[0].precursors[0].smiles==='CC=O'`,true,id+' regenerates the aldehyde precursor');
  check(`deoxyVerified('CCC',${JSON.stringify(id)}).length`,2,id+' distinguishes aldehyde and ketone precursors for propane');
  check(`deoxyVerified('C1CCCCC1',${JSON.stringify(id)}).length`,1,id+' deduplicates equivalent cyclohexane sites');
  check(`deoxyVerified('CC1=CC=CC=C1',${JSON.stringify(id)}).some(s=>s.precursors[0].smiles==='O=CC1=CC=CC=C1')`,true,id+' supports an aryl aldehyde precursor');
  check(`deoxyVerified('C1=CC=CC=C1',${JSON.stringify(id)}).length`,0,id+' rejects aromatic positions');
  check(`deoxyVerified('CC(=O)CC',${JSON.stringify(id)}).length`,0,id+' avoids ambiguous multiple-carbonyl deoxygenation');
}
check(`deoxySpecs('CC','wolff-kishner').specs[0].reagents.map(x=>x.smiles).join('|')`,'NN|[K+].[OH-]','Wolff–Kishner reverse conditions retain hydrazine and hydroxide');
check(`deoxySpecs('CC','clemmensen').specs[0].conditions.additives.includes('znhg')`,true,'Clemmensen reverse conditions retain zinc amalgam');
check(`['wolff-kishner','clemmensen'].every(id=>retroDisconnectSmiles('CC',{protect:false,budgetMs:10000}).candidates.some(c=>c.transform===id))`,true,'Public reverse search exposes both deoxygenation transforms');
check(`(()=>{const g=retroFromSmiles('CCC'),before=JSON.stringify(g),t=retroTarget(g);t.edits=[];RETRO_TRANSFORMS.filter(x=>['wolff-kishner','clemmensen'].includes(x.id)).forEach(x=>x.match(t));return JSON.stringify(g)===before;})()`,true,'Deoxygenation disconnections do not mutate the target');

run(`var deoxyJob=pathFinderCreate('CC=O','CC',{maxDepth:1,budgetMs:10000});while(deoxyJob.status==='running')deoxyJob.step(100);`);
check('deoxyJob.status','found','Path Finder connects acetaldehyde to ethane at depth one');
check(`deoxyJob.routes.some(route=>route.length===1&&['wolff-kishner','clemmensen'].includes(route[0].candidate.transform)&&retroForwardCheck(route[0].candidate,route[0].to))`,true,'Path Finder returns a forward-verified deoxygenation route');
console.log('Carbonyl deoxygenation: ' + checks + ' checks passed.');
