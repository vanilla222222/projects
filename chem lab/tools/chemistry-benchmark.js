#!/usr/bin/env node
'use strict';
// Fixed expectations and their source links live in chemistry-fixtures.json.
// Run from any directory: node "chem lab/tools/chemistry-benchmark.js".
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'chemistry-fixtures.json'), 'utf8'));
const context = vm.createContext({ console, performance, setTimeout, clearTimeout });
// Exercise the same engine modules and load order as the current application.
const scripts = [...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g)]
  .map(match=>match[1]).filter(file=>file!=='js/app.js');
scripts.forEach(file=>vm.runInContext(fs.readFileSync(path.join(root,file.split('?')[0]),'utf8'),context,{filename:file}));
const run = (code) => vm.runInContext(code, context);
const plain = (value) => JSON.parse(JSON.stringify(value));
run(`
function benchmarkGraph(smiles) { return reactionFragmentGraph(smilesToFragment(smiles)); }
function benchmarkProps(graph) { return computeProperties(graph, graph.atoms.map(a => a.id)); }
function benchmarkKey(smiles) {
  if (typeof moleculeIdentity === 'function') return moleculeIdentity(smiles).connectivityKey;
  return reactionGraphProperties(benchmarkGraph(smiles)).smiles;
}
function benchmarkStereo(graph) {
  const ids = graph.atoms.map(a => a.id);
  return { tetrahedral: findStereocenters(graph, ids).map(s => s.type).sort(),
    doubleBond: findStereoDoubleBonds(graph, ids).map(s => s.type).sort() };
}
function benchmarkSignature(graph) {
  const p = benchmarkProps(graph);
  return { formula: p.formula, charge: p.charge,
    atoms: graph.atoms.length, bonds: graph.bonds.length,
    orders: graph.bonds.map(b => b.order).sort(), stereo: benchmarkStereo(graph) };
}
`);
let assertions = 0;
const totals = {};
function check(group, test) {
  try { test(); assertions++; totals[group] = (totals[group] || 0) + 1; }
  catch (error) { error.message = group + ': ' + error.message; throw error; }
}
for (const item of fixtures.naming) {
  context.item = item;
  for (const reverse of [false, true]) {
    context.reverse = reverse;
    const result = plain(run(`(() => {
      const graph = benchmarkGraph(item.smiles);
      if (reverse) { graph.atoms.reverse(); graph.bonds.reverse(); }
      const before = JSON.stringify(graph);
      const detail = nameStructureDetailed(graph, graph.atoms.map(a => a.id));
      return { full: detail.full, unchanged: before === JSON.stringify(graph) };
    })()`));
    check('naming', () => assert.equal(result.full, item.expected, item.smiles + (reverse ? ' reordered' : '')));
    check('immutability', () => assert.equal(result.unchanged, true, item.smiles));
  }
}
for (const item of fixtures.reactions.concat(fixtures.negativeReactions)) {
  context.item = item;
  const result = plain(run(`(() => {
    const compounds = item.compounds.map(c => Object.assign({}, c, { fragment: smilesToFragment(c.smiles) }));
    const before = JSON.stringify(compounds);
    const outcome = predictReaction(compounds, Object.assign({}, defaultReactionConditions(), item.conditions));
    const selected = [outcome.best, ...outcome.alternatives].filter(Boolean).find(o => o.id === item.rule);
    return { found: !!selected, unchanged: before === JSON.stringify(compounds),
      loadingCeiling:selected&&selected.stoichiometry?selected.stoichiometry.conversion:null,
      actual: selected ? selected.products.map(p => benchmarkKey(p.isomericSmiles || p.smiles)).sort() : [],
      expected: item.products.map(benchmarkKey).sort() };
  })()`));
  if (item.products.length) {
    check('reaction-positive', () => assert.equal(result.found, true, item.label));
    check('reaction-products', () => assert.deepEqual(result.actual, result.expected, item.label));
  } else check('reaction-negative', () => assert.equal(result.found, false, item.label));
  if(item.loadingCeiling!==undefined)check('loading-ceiling',()=>assert.equal(result.loadingCeiling,item.loadingCeiling,item.label));
  check('immutability', () => assert.equal(result.unchanged, true, item.label));
}
for (const smiles of fixtures.roundTrips) {
  context.smiles = smiles;
  const result = plain(run(`(() => {
    const graph = benchmarkGraph(smiles);
    const original = benchmarkSignature(graph);
    const p = reactionGraphProperties(graph);
    const roundtrip = benchmarkGraph(p.isomericSmiles || p.smiles);
    const reaction = rxioParseReactionSmiles(rxioToReactionSmiles([{smiles, role: 'reactant'}], [{smiles}]));
    return { original, exported: benchmarkSignature(roundtrip),
      rxnSmiles: benchmarkSignature(benchmarkGraph(reaction.compounds[0].smiles)) };
  })()`));
  check('SMILES-roundtrip', () => assert.deepEqual(result.exported, result.original, smiles));
  check('reaction-SMILES-roundtrip', () => assert.deepEqual(result.rxnSmiles, result.original, smiles));
}
for (const smiles of fixtures.molfileRoundTrips) {
  context.smiles = smiles;
  const result = plain(run(`(() => {
    const graph = benchmarkGraph(smiles);
    const block = graphToMolfile(graph, null, 'benchmark');
    const mol = molRecordToGraph(parseMolRecord(block));
    const parsed = rxioParseRxn(rxioToRxn([{smiles, role:'reactant'}], [{smiles}]));
    return { original: benchmarkSignature(graph), molfile: benchmarkSignature(mol),
      rxn: benchmarkSignature(benchmarkGraph(parsed.compounds[0].smiles)) };
  })()`));
  check('MOL-roundtrip', () => assert.deepEqual(result.molfile, result.original, smiles));
  check('RXN-roundtrip', () => assert.deepEqual(result.rxn, result.original, smiles));
}
for (const item of fixtures.stereo) {
  context.item = item;
  const actual = plain(run('benchmarkStereo(benchmarkGraph(item.smiles))'));
  check('stereo-expectation', () => assert.deepEqual(actual, item.expected, item.smiles));
}
for (const smiles of fixtures.invalidSmiles) {
  context.smiles = smiles;
  check('invalid-input', () => assert.throws(() => run('smilesToFragment(smiles)'), undefined, smiles));
}
console.log('Chemistry benchmark: ' + assertions + ' assertions passed.');
console.log(Object.entries(totals).map(([group, count]) => group + '=' + count).join(', '));
console.log('Coverage is a finite regression set, not a population accuracy estimate.');
