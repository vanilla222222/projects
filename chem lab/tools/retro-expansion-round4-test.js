'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const ctx = vm.createContext({ console, performance, setTimeout, clearTimeout });
const scripts = ['elements','graph','valence','stereo','naming-core','naming-chain','naming-ring','naming-scaffolds','naming-general','common-names-extra','naming-elements','properties','layout','smiles','reactions','molecular-identity','reaction-stereo','reaction-rules','reaction-rules-extra','reaction-rules-extra2','reaction-aromatic','reaction-rules-extra3','reaction-rules-extra4','reaction-rules-extra5','reaction-rules-extra6','reaction-rules-extra7','reaction-rules-extra8','reaction-rules-extra9','reaction-catalog','reaction-evidence-core','reaction-evidence-named','retro-stock','retro','retro-families-extra','retro-families-extra2','retro-families-extra3','retro-families-extra4','retro-families-extra5','retro-families-extra6','retro-families-extra7','retro-families-extra8','reaction-rules-extra10','reaction-rules-extra11','reaction-rules-extra12','reaction-rules-extra13'];
scripts.forEach(name => vm.runInContext(fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), ctx, { filename: name + '.js' }));
const run = code => vm.runInContext(code, ctx);
run(`function rt4Specs(target,id){const t=retroTarget(retroFromSmiles(target));t.edits=[];t.currentTransform=id;return {t,specs:RETRO_TRANSFORMS.find(x=>x.id===id).match(t)};}
function rt4Verified(target,id){const r=rt4Specs(target,id);return r.specs.filter(spec=>{const v=retroTryVerify(spec,r.t.smiles);return v&&v.outcome.id===id;});}
`);
let checks = 0;
function check(code, expected, label) { assert.equal(run(code), expected, label); checks++; }
const positives = [
 ['O=C(OCC1=CC=CC=C1)C1=CC=CC=C1','tishchenko'],
 ['O=C(O)C=Cc1ccccc1','perkin-condensation'],
 ['O=C(O)C(O)(c1ccccc1)c1ccccc1','benzilic-rearrangement'],
 ['CC(C)=C(C)C','mcmurry'],
 ['O=C1CCCC1O','acyloin-cyclization'],
 ['c1ccsc1','paal-knorr-thiophene'],
 ['Cc1nc(C)cs1','hantzsch-thiazole']
];
for (const [target,id] of positives) {
  check(`rt4Verified(${JSON.stringify(target)},${JSON.stringify(id)}).length > 0`, true, 'Forward-verified reverse: ' + id);
  check(`(()=>{const g=retroFromSmiles(${JSON.stringify(target)}),before=JSON.stringify(g),r=retroDisconnect(g,undefined,{protect:false,budgetMs:10000});return before===JSON.stringify(g)&&r.candidates.some(c=>c.transform===${JSON.stringify(id)});})()`, true, 'Public search exposes verified candidate without target mutation: ' + id);
}
const negatives = [
 ['CCOC(C)=O','tishchenko'],
 ['CC=CC(=O)O','perkin-condensation'],
 ['O=C(O)C(O)(c1ccccc1)c1ccc(C)cc1','benzilic-rearrangement'],
 ['CC=C(C)C','mcmurry'],
 ['CCO','paal-knorr-thiophene'],
 ['Cc1ncc(C)o1','hantzsch-thiazole']
];
for (const [target,id] of negatives) check(`rt4Verified(${JSON.stringify(target)},${JSON.stringify(id)}).length`, 0, 'Unsupported target rejected: ' + id);
check(`(()=>{const r=rt4Specs('O=C(O)C=Cc1ccccc1','perkin-condensation');return r.specs.every(s=>s.precursors.length===2&&s.precursors.some(p=>p.smiles==='CC(=O)OC(C)=O'));})()`, true, 'Perkin route retains both required reactants');
check(`(()=>{const r=rt4Specs('Cc1nc(C)cs1','hantzsch-thiazole');return r.specs.every(s=>s.precursors.length===2);})()`, true, 'Hantzsch route is a two-component disconnection');
console.log('Retro expansion round 4: ' + checks + ' checks passed.');
