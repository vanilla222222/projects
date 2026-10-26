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
run(`function rt5Specs(target,id){const t=retroTarget(retroFromSmiles(target));t.edits=[];t.currentTransform=id;return {t,specs:RETRO_TRANSFORMS.find(x=>x.id===id).match(t)};}
function rt5Verified(target,id){const r=rt5Specs(target,id);return r.specs.filter(spec=>{const v=retroTryVerify(spec,r.t.smiles);return v&&v.outcome.id===id;});}
`);
let checks = 0;
function check(code, expected, label) { assert.equal(run(code), expected, label); checks++; }
const positives = [
 ['O=C(O)CCC(=O)O','anhydride-hydrolysis'],
 ['CCOC(C)=O','anhydride-alcoholysis'],
 ['CC(=O)Oc1ccccc1','anhydride-alcoholysis'],
 ['CNC(C)=O','anhydride-aminolysis'],
 ['CC(=O)N(C)C','anhydride-aminolysis'],
 ['OCCCCO','anhydride-reduction']
];
for (const [target,id] of positives) {
  check(`rt5Verified(${JSON.stringify(target)},${JSON.stringify(id)}).length > 0`, true, 'Forward-verified reverse: ' + id + ' / ' + target);
  check(`(()=>{const g=retroFromSmiles(${JSON.stringify(target)}),before=JSON.stringify(g),r=retroDisconnect(g,undefined,{protect:false,budgetMs:10000});return before===JSON.stringify(g)&&r.candidates.some(c=>c.transform===${JSON.stringify(id)});})()`, true, 'Public search exposes verified candidate without target mutation: ' + id + ' / ' + target);
}
const negatives = [
 ['CCOC(C)=O','anhydride-hydrolysis'],
 ['COCC(=O)OC','anhydride-alcoholysis'],
 ['CC(=O)N(C)CCN','anhydride-aminolysis'],
 ['OCC(C)O','anhydride-reduction'],
 ['O=CCCO','anhydride-reduction']
];
for (const [target,id] of negatives) check(`rt5Verified(${JSON.stringify(target)},${JSON.stringify(id)}).length`, 0, 'Unsupported target rejected: ' + id + ' / ' + target);
check(`(()=>{const r=rt5Verified('CCOC(C)=O','anhydride-alcoholysis');return r.length>0&&r.every(s=>s.precursors.length===2&&s.precursors.some(p=>p.smiles==='CC(=O)OC(C)=O')&&s.precursors.some(p=>p.smiles==='CCO'));})()`, true, 'Alcoholysis recovers anhydride and alcohol precursors');
check(`(()=>{const r=rt5Verified('CNC(C)=O','anhydride-aminolysis');return r.length>0&&r.every(s=>s.precursors.length===2&&s.precursors.some(p=>p.smiles==='CC(=O)OC(C)=O')&&s.precursors.some(p=>p.smiles==='CN'));})()`, true, 'Aminolysis recovers anhydride and amine precursors');
check(`(()=>{const r=rt5Verified('OCCCCO','anhydride-reduction');return r.length>0&&r.every(s=>s.precursors.length===1&&s.reagents.some(x=>x.smiles==='[Li+].[AlH4-]'));})()`, true, 'Reduction retains LiAlH4 and dry THF conditions');
console.log('Retro expansion round 5: ' + checks + ' checks passed.');
