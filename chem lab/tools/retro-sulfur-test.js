#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const context = vm.createContext({ console, setTimeout, clearTimeout });
const files = ['elements', 'graph', 'valence', 'stereo', 'naming-core', 'naming-chain', 'naming-ring', 'naming-scaffolds', 'naming-general', 'common-names-extra', 'naming-elements', 'properties', 'layout', 'smiles', 'reactions', 'reaction-stereo', 'reaction-rules', 'reaction-rules-extra', 'reaction-rules-extra2', 'reaction-aromatic', 'reaction-rules-extra3', 'retro'];
files.forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, 'js', file + '.js'), 'utf8'), context, { filename: file + '.js' }));
const run = (code) => vm.runInContext(code, context);
run(`function sulfurSpecs(smiles, id) {
  const g = retroFromSmiles(smiles), t = retroTarget(g);
  t.edits = []; t.currentTransform = id;
  return {t, specs: RETRO_TRANSFORMS.find(x => x.id === id).match(t)};
}`);
let checks = 0;
function check(code, expected, label) { assert.equal(run(code), expected, label); checks++; }
for (const target of ['CCSCC', 'CSC', 'CSc1ccccc1']) {
  check(`(() => { const x = sulfurSpecs('${target}', 'thiolate-alkylation'); return x.specs.some(s => { const v=retroTryVerify(s,x.t.smiles); return v && v.outcome.id==='thiolate-alkylation'; }); })()`, true, target + ' thioether precursor passes forward prediction');
}
for (const target of ['CCSC(C)C', 'CCSC(C)(C)C']) {
  check(`(() => { const x = sulfurSpecs('${target}', 'thiolate-alkylation'); return x.specs.some(s => !!retroTryVerify(s,x.t.smiles)); })()`, true, target + ' permits primary ethyl cut only');
}
for (const target of ['CC(C)SC(C)C', 'c1ccccc1Sc1ccccc1', 'C1CCSCC1', 'CS(=O)C', 'CS(=O)(=O)C']) {
  check(`sulfurSpecs('${target}','thiolate-alkylation').specs.length`, 0, target + ' has no modeled acyclic primary SN2 cut');
}
for (const target of ['CS', 'CCS', 'Sc1ccccc1']) {
  check(`(() => { const x = sulfurSpecs('${target}', 'disulfide-reduction'); const v=x.specs.length===1 && retroTryVerify(x.specs[0],x.t.smiles); return !!v && v.outcome.id==='disulfide-reduction'; })()`, true, target + ' symmetric disulfide precursor forward-verifies');
}
for (const target of ['CCSCC', 'SCCS', 'C=S', 'CC[S-]']) {
  check(`sulfurSpecs('${target}','disulfide-reduction').specs.length`, 0, target + ' is outside neutral monothiol retro scope');
}
check(`(() => { const s='C'.repeat(30)+'S'; return sulfurSpecs(s,'disulfide-reduction').specs.length; })()`, 0, 'dimer size bound rejects oversized precursor');
check(`(() => { const g=retroFromSmiles('CCSCC'); const before=JSON.stringify(g); const r=retroDisconnect(g,undefined,{budgetMs:10000,protect:false}); return r.candidates.some(c=>c.transform==='thiolate-alkylation') && JSON.stringify(g)===before; })()`, true, 'public retro API includes forward-verified thioether candidate without mutating target');
check(`retroDisconnectSmiles('CCS',{budgetMs:10000,protect:false}).candidates.some(c=>c.transform==='disulfide-reduction' && c.outcomeId==='disulfide-reduction')`, true, 'public retro API includes forward-verified disulfide reduction');
check(`retroDisconnectSmiles('CC(C)(C)CSC(C)(C)C',{budgetMs:10000,protect:false}).candidates.some(c=>c.transform==='thiolate-alkylation')`, false, 'neopentyl and tertiary cuts do not produce accepted SN2 routes');
console.log('Sulfur retrosynthesis checks passed: ' + checks);
