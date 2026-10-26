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
function amineSpecs(target,id){const t=retroTarget(retroFromSmiles(target));t.edits=[];t.currentTransform=id;return {t,specs:RETRO_TRANSFORMS.find(x=>x.id===id).match(t)};}
function amineVerified(target,id){const r=amineSpecs(target,id);return r.specs.filter(spec=>{const v=retroTryVerify(spec,r.t.smiles);return v&&v.outcome.id===id;});}
function aminePredict(reactants,reagents,conditions){const compounds=reactants.map(smiles=>({smiles,role:'reactant'})).concat((reagents||[]).map(smiles=>({smiles,role:'reagent'}))).map(retroCompound);return predictReaction(compounds,normalizeReactionConditions(conditions||{}));}
function amineOutcome(result,id){return [result.best,...result.alternatives].filter(Boolean).find(o=>o.id===id);}
`);
for (const target of ['NCc1ccccc1','NCCc1ccccc1','NCCO','NCC(=O)O']) {
  check(`amineVerified(${JSON.stringify(target)},'reductive-amination').length > 0`, true, 'Ammonia reductive amination forward-verifies: ' + target);
  check(`retroDisconnectSmiles(${JSON.stringify(target)},{protect:false,budgetMs:10000}).candidates.some(c=>c.transform==='reductive-amination')`, true, 'Public search exposes reductive amination: ' + target);
}
for (const target of ['NCc1ccccc1','NCCc1ccccc1']) {
  check(`amineVerified(${JSON.stringify(target)},'gabriel-hydrazinolysis').length > 0`, true, 'Aryl-substituted N-alkylphthalimide forward-verifies: ' + target);
  check(`retroDisconnectSmiles(${JSON.stringify(target)},{protect:false,budgetMs:10000}).candidates.some(c=>c.transform==='gabriel-hydrazinolysis')`, true, 'Public search exposes Gabriel release: ' + target);
}
check(`(()=>{const r=aminePredict(['O=CC1=CC=CC=C1','N'],['[Na+].[BH3-]C#N'],{solvents:['methanol']}),o=amineOutcome(r,'reductive-amination');return !!o&&o.consumes.filter(Boolean).length===3&&!!retroFindProduct(o.products,'NCc1ccccc1');})()`,true,'Forward outcome retains carbonyl, ammonia and hydride consumption');
check(`amineOutcome(aminePredict(['O=CC1=CC=CC=C1','N'],[],{solvents:['methanol']}),'imine')===undefined`,true,'Ammonia support does not broaden ordinary imine formation');
check(`amineVerified('NCCO','gabriel-hydrazinolysis').length`,0,'Gabriel extra-oxygen scope remains conservative');
check(`amineVerified('NCCO','curtius-hydrolysis').length`,0,'Curtius competing-functionality scope remains unchanged');
check(`amineVerified('NCCO','isocyanate-hydrolysis').length`,0,'Isocyanate competing-functionality scope remains unchanged');
check(`(()=>{const g=retroFromSmiles('NCc1ccccc1'),before=JSON.stringify(g),r=retroDisconnect(g,undefined,{protect:false,budgetMs:10000});return JSON.stringify(g)===before&&['reductive-amination','gabriel-hydrazinolysis','curtius-hydrolysis','isocyanate-hydrolysis'].every(id=>r.candidates.some(c=>c.transform===id));})()`,true,'All four simple primary-amine routes verify without target mutation');
console.log('Primary amine retrosynthesis: ' + checks + ' checks passed.');
