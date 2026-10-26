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
function qualityStock(smiles) {
  return { target: smiles, candidate: null, children: [], stock: { tier: 1, smiles }, skeleton: 0 };
}
function qualityNode(smiles, conversion, children) {
  return {
    target: smiles,
    candidate: {
      key: smiles,
      outcome: { stoichiometry: { conversion } },
      precursors: children.map(child => ({ smiles: child.target, skeleton: 0 }))
    },
    children,
    stock: null,
    skeleton: 0
  };
}
const originalStockTier = stockTier;
`);

check(`(() => {
  const route = qualityNode('CC(=O)O', 0.5, [qualityNode('CCO', 0.5, [qualityStock('C')])]);
  const m = rsearchScore(route);
  return m.yield === 25 && m.steps === 2 && m.longest === 2 && !m.convergent;
})()`, true, 'Linear route retains sequential step-yield multiplication');

check(`(() => {
  const route = qualityNode('target', 1, [
    qualityNode('left', 0.5, [qualityStock('L')]),
    qualityNode('right', 0.5, [qualityStock('R')])
  ]);
  const m = rsearchScore(route);
  return m.yield === 50 && m.steps === 3 && m.longest === 2 && m.convergent && m.yieldModel === 'linear-product-or-convergent-bottleneck';
})()`, true, 'Independent convergent branches use the weakest branch, not a serial 25 percent yield');

check(`(() => {
  const route = qualityNode('target', 0.8, [
    qualityNode('left', 0.5, [qualityStock('L')]),
    qualityNode('right', 0.9, [qualityStock('R')])
  ]);
  return rsearchScore(route).yield === 40;
})()`, true, 'Root conversion applies to the weakest convergent branch');

check(`rsearchFilter([{metrics: {steps: 3, yield: 50, stock: 1, pg: 0, score: 1}}], {minYield: 50}).length`, 1, 'Yield filters retain the corrected convergent estimate');

check(`(() => {
  stockTier = () => ({ tier: 1, source: 'test', smiles: 'CCO' });
  return rsearchStock('CCC', 2) === null;
})()`, true, 'A stock record with different connectivity cannot terminate a route');

check(`(() => {
  stockTier = () => ({ tier: 1, source: 'test', smiles: 'N[C@@H](C)O' });
  return rsearchStock('N[C@H](C)O', 2) === null;
})()`, true, 'The opposite enantiomer cannot satisfy a stereospecific stock requirement');

check(`(() => {
  stockTier = () => ({ tier: 1, source: 'test', smiles: 'N[C@@H](C)O' });
  const hit = rsearchStock('N[C@@H](C)O', 2);
  return !!hit && hit.tier === 1;
})()`, true, 'An exact stereochemical stock identity remains valid');

check(`(() => {
  stockTier = () => ({ tier: 1, source: 'test', smiles: 'CCBr' });
  const hit = rsearchStock('Br[Mg]CC', 2);
  return !!hit && hit.source === 'grignard' && hit.smiles === 'CCBr';
})()`, true, 'Grignard fallback retains the verified parent-halide identity');

run('stockTier = originalStockTier;');
console.log('Retrosynthesis search quality: ' + checks + ' checks passed.');
