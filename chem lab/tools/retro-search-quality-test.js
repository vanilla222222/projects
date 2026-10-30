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

// A shared intermediate is expanded at its shallowest graph depth, but can
// also occur on a longer branch. Enforce the budget on each enumerated path.
run(`
function depthNode(smiles, stock = false) {
  return { smiles, skeleton: 0, stock: stock ? {tier: 1, smiles} : null, ands: [] };
}
function depthEdge(parent, children, operations = 1) {
  const candidate = {key: parent.smiles, precursors: children.map(c => ({smiles: c.smiles, skeleton: 0})), outcome: {}};
  if (operations > 1) candidate.pgSteps = Array.from({length: operations}, () => ({outcome: {}, role: 'step'}));
  parent.ands.push({candidate, children, solved: true});
}
const depthRoot = depthNode('target'), depthShared = depthNode('shared'), depthLong = depthNode('long'), depthStock = depthNode('stock', true);
depthEdge(depthRoot, [depthShared]);
depthEdge(depthRoot, [depthLong]);
depthEdge(depthLong, [depthShared]);
depthEdge(depthShared, [depthStock]);
const depthJob = {root: depthRoot, options: {maxDepth: 2}};
`);
check(`rsearchEnumerate(depthJob, depthRoot, new Set(), 20).length`, 1, 'Shared intermediates cannot leak an over-depth alternative');
check(`rsearchEnumerate(depthJob, depthRoot, new Set(), 20).every(r => rsearchScore(r).longest <= 2)`, true, 'Every emitted branch respects the operation budget');
check(`rsearchEnumerate({...depthJob, options: {maxDepth: 3}}, depthRoot, new Set(), 20).length`, 2, 'Increasing depth retains both valid alternatives');
run(`const protectedRoot = depthNode('protected'); depthEdge(protectedRoot, [depthStock], 3); const protectedJob = {root: protectedRoot, options: {maxDepth: 2}};`);
check(`rsearchEnumerate(protectedJob, protectedRoot, new Set(), 20).length`, 0, 'Protection triplets cannot count as a single operation');
check(`rsearchEnumerate({...protectedJob, options: {maxDepth: 3}}, protectedRoot, new Set(), 20).length`, 1, 'A protection triplet fits an exact three-operation budget');
check(`rsearchEnumerate(depthJob, depthStock, new Set(), 20, 0).length`, 1, 'Stock leaves are allowed exactly at the depth limit');
run(`const convergentRoot = depthNode('convergent'), otherBranch = depthNode('other'); depthEdge(otherBranch, [depthStock]); depthEdge(convergentRoot, [depthShared, otherBranch]); const convergentJob = {root: convergentRoot, options: {maxDepth: 2}};`);
check(`rsearchEnumerate(convergentJob, convergentRoot, new Set(), 20).length`, 1, 'Convergent branches each receive the remaining depth budget');

run('stockTier = originalStockTier;');
console.log('Retrosynthesis search quality: ' + checks + ' checks passed.');
