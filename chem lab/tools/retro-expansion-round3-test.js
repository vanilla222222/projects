'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const ctx = vm.createContext({ console, performance, setTimeout, clearTimeout });
const scripts = ['elements','graph','valence','stereo','naming-core','naming-chain','naming-ring','naming-scaffolds','naming-general','common-names-extra','naming-elements','properties','layout','smiles','reactions','molecular-identity','reaction-stereo','reaction-rules','reaction-rules-extra','reaction-rules-extra2','reaction-aromatic','reaction-rules-extra3','reaction-rules-extra4','reaction-rules-extra5','reaction-rules-extra6','reaction-rules-extra7','reaction-rules-extra8','reaction-catalog','reaction-evidence-core','reaction-evidence-named','retro-stock','retro','retro-families-extra','retro-families-extra2','retro-families-extra3'];
scripts.forEach(name => vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),ctx,{filename:name+'.js'}));
const run = code => vm.runInContext(code,ctx);
run(`function rt3Specs(target,id){const t=retroTarget(retroFromSmiles(target));t.edits=[];t.currentTransform=id;return {t,specs:RETRO_TRANSFORMS.find(x=>x.id===id).match(t)};}
function rt3Verified(target,id){const r=rt3Specs(target,id);return r.specs.filter(spec=>{const v=retroTryVerify(spec,r.t.smiles);return v&&v.outcome.id===id;});}
`);
let checks = 0;
function check(code,expected,label){assert.equal(run(code),expected,label);checks++;}
const positives = [
 ['O=C1OCCC1','hydroxy-acid-lactonization'],
 ['O=C1OCCCC1','hydroxy-acid-lactonization'],
 ['CCC=O','rosenmund-reduction'],
 ['O=Cc1ccccc1','rosenmund-reduction'],
 ['CCC(=O)O','peracid-aldehyde-oxidation'],
 ['CC(=O)OC(C)=O','anhydride-formation'],
 ['CCC(=O)OC(C)=O','anhydride-formation'],
 ['C1CCOC1','intramolecular-williamson'],
 ['C1CCOCC1','intramolecular-williamson'],
 ['C[N+](C)(C)[O-]','amine-n-oxidation'],
 ['CN(C)C','amine-oxide-deoxygenation'],
 ['CSc1ccccc1','sulfoxide-deoxygenation'],
 ['CCSC(C)=O','thiol-acylation'],
 ['CC(=O)O','thioester-hydrolysis'],
 ['CS(=O)(=O)O','sulfonyl-chloride-hydrolysis'],
 ['CCC(N)=O','nitrile-peroxide-hydration'],
 ['CCSCCCC','thiol-ene'],
];
for(const [target,id] of positives) {
  check(`rt3Verified(${JSON.stringify(target)},${JSON.stringify(id)}).length > 0`,true,'Forward-verified reverse: '+id+' / '+target);
  check(`(()=>{const g=retroFromSmiles(${JSON.stringify(target)}),before=JSON.stringify(g),t=retroTarget(g);t.edits=[];RETRO_TRANSFORMS.find(x=>x.id===${JSON.stringify(id)}).match(t);return before===JSON.stringify(g);})()`,true,'Target unchanged: '+id);
}
const negatives = [
 ['CC(=O)OCC','hydroxy-acid-lactonization'],
 ['CC(C)=O','rosenmund-reduction'],
 ['COC(C)=O','peracid-aldehyde-oxidation'],
 ['CC(=O)O','anhydride-formation'],
 ['CCOCC','intramolecular-williamson'],
 ['C1COC1','intramolecular-williamson'],
 ['C1CCCCCOC1','intramolecular-williamson'],
 ['CN(C)C','amine-n-oxidation'],
 ['CNC','amine-oxide-deoxygenation'],
 ['CSC','sulfoxide-deoxygenation'],
 ['CCOC(C)=O','thiol-acylation'],
 ['CC(=O)OC','thioester-hydrolysis'],
 ['CS(=O)(=O)OC','sulfonyl-chloride-hydrolysis'],
 ['CCC(=O)NC','nitrile-peroxide-hydration'],
 ['CSC','thiol-ene'],
];
for(const [target,id] of negatives) check(`rt3Verified(${JSON.stringify(target)},${JSON.stringify(id)}).length > 0`,false,'Unsupported reverse rejected: '+id+' / '+target);
check(`rt3Verified('C[C@H](F)CC(=O)O','peracid-aldehyde-oxidation').length>0`,true,'Untouched stereocentre remains forward-verifiable');
check(`rt3Verified('[13CH3]C(=O)O','peracid-aldehyde-oxidation').length>0`,true,'Carbon isotope remains forward-verifiable');
check(`(()=>{const g=retroFromSmiles('C[C@H](F)CC(=O)O'),before=JSON.stringify(g);const result=retroDisconnect(g,undefined,{protect:false,budgetMs:10000});const c=result.candidates.find(x=>x.transform==='peracid-aldehyde-oxidation');return before===JSON.stringify(g)&&!!c&&c.stereo==='retained'&&c.precursors.some(p=>p.isomericSmiles.includes('@'));})()`,true,'Public candidate carries preserved stereochemistry and leaves target unchanged');
check(`RETRO_TRANSFORMS.filter(x=>${JSON.stringify([...new Set(positives.map(x=>x[1]))])}.includes(x.id)).length`,13,'Thirteen new forward-checked disconnections registered');
console.log('Retro expansion round 3: '+checks+' checks passed.');
