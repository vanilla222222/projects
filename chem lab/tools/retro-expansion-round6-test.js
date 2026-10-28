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
const run = (code) => vm.runInContext(code, ctx);
run(`function rt6(target,id){
  const graph=retroFromSmiles(target),before=JSON.stringify(graph),t=retroTarget(graph);
  t.edits=[];t.currentTransform=id;
  const specs=RETRO_TRANSFORMS.find(x=>x.id===id).match(t);
  const verified=specs.filter(spec=>{const v=retroTryVerify(spec,t.smiles);return v&&v.outcome.id===id;});
  return {specs,verified,unchanged:before===JSON.stringify(graph),target:t.smiles};
}`);
let checks = 0;
function check(code, expected, label) { assert.equal(run(code), expected, label); checks++; }
const positives = [
  ['O=C(C(=O)c1ccccc1)c1ccccc1', 'benzoin-oxidation'],
  ['O=N(CC(O)c1ccccc1)=O', 'henry'],
  ['O=C(C(O)c1ccccc1)c1ccccc1', 'benzoin'],
  ['NCC1=CC=CC=C1', 'staudinger'],
  ['ClCC1=CC=CC=C1', 'appel'],
  ['N#CC(O)c1ccccc1', 'cyanohydrin'],
  ['CC(=O)c1ccccc1', 'wacker'],
  ['C1=CC=C(C2CC2)C=C1', 'simmons-smith'],
  ['NC1CCCCC1', 'nitro-reduction'],
];
for (const [target, id] of positives) {
  ctx.target = target; ctx.id = id;
  check('rt6(target,id).specs.length > 0', true, 'Reverse graph edit exists: ' + id);
  check('rt6(target,id).verified.length > 0', true, 'Forward replay verifies the exact target: ' + id);
  check('rt6(target,id).unchanged', true, 'Reverse matching does not mutate the target: ' + id);
}
const negatives = [
  ['O=C(CCO)c1ccccc1', 'benzoin-oxidation'],
  ['O=N(c1ccccc1)=O', 'henry'],
  ['O=C(C(O)c1ccc(C)cc1)c1ccccc1', 'benzoin'],
  ['CNCC1=CC=CC=C1', 'staudinger'],
  ['ClC1=CC=CC=C1', 'appel'],
  ['OCC1=CC=CC=C1', 'cyanohydrin'],
  ['CCC(=O)c1ccccc1', 'wacker'],
  ['C1=CC=C(C2CCC2)C=C1', 'simmons-smith'],
];
for (const [target, id] of negatives) {
  ctx.target = target; ctx.id = id;
  check('rt6(target,id).verified.length', 0, 'Unsupported substrate is rejected: ' + id);
}
check(`rt6('O=N(CC(O)c1ccccc1)=O','henry').verified.every(v=>v.precursors.length===2)`, true, 'Henry disconnection retains both carbon fragments');
check(`rt6('O=C(C(O)c1ccccc1)c1ccccc1','benzoin').verified.every(v=>v.precursors.length===2&&v.precursors[0].smiles===v.precursors[1].smiles)`, true, 'Benzoin self-condensation recovers two identical aldehydes');
check(`rt6('NCC1=CC=CC=C1','staudinger').verified.every(v=>v.reagents.some(r=>r.label==='Triphenylphosphine'))`, true, 'Staudinger reverse retains phosphine and aqueous hydrolysis');
check(`rt6('CC(=O)c1ccccc1','wacker').verified.every(v=>moleculeSame(v.precursors[0].smiles,'C=Cc1ccccc1'))`, true, 'Wacker reverse recovers the terminal alkene');
console.log('Retro expansion round 6: ' + checks + ' checks passed.');
