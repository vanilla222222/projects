'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const context = vm.createContext({ console });
const scripts = ['elements', 'graph', 'valence', 'stereo', 'naming-core', 'naming-chain', 'naming-ring', 'naming-scaffolds', 'naming-general', 'common-names-extra', 'naming-elements', 'properties', 'layout', 'smiles', 'molfile', 'reactions', 'reagent-library', 'reaction-io'];
scripts.forEach((name) => vm.runInContext(fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), context, { filename: name + '.js' }));
const run = (code) => vm.runInContext(code, context);
const json = (code) => JSON.parse(JSON.stringify(run(code)));

assert.deepEqual(json("rxioSplitSide('[Na+].[OH-].CCO')"), ['[Na+].[OH-]', 'CCO']);
assert.deepEqual(json("rxioSplitSide('[Ca+2].[Cl-].[Cl-].O')"), ['[Ca+2].[Cl-].[Cl-]', 'O']);
assert.deepEqual(json("rxioSplitSide('')"), []);
// Direct property export must include every component and chiral center,
// including when a one-atom counterion is the first canonical DFS root.
run("var ionGraph = reactionFragmentGraph(smilesToFragment('C[NH2+][C@H](C)O.[Cl-]')); var ionProps = computeProperties(ionGraph, ionGraph.atoms.map(a => a.id));");
assert.equal(run("ionProps.isomericSmiles.includes('@') && ionProps.isomericSmiles.includes('[Cl-]')"), true);
assert.equal(run("smilesToFragment(ionProps.isomericSmiles).atoms.length === ionGraph.atoms.length"), true);
assert.equal(run("ionProps.smiles.split('.').length"), 2);
for (const side of ['.CC', 'CC.', 'CC..O']) {
  assert.throws(() => run('rxioSplitSide(' + JSON.stringify(side) + ')'), /empty/);
}
assert.equal(run("rxioParseReactionSmiles('CCO>>CC=O label').products[0].smiles"), 'CC=O');
assert.throws(() => run("rxioParseReactionSmiles('CCO>CC=O')"), /form/);
assert.throws(() => run("rxioParseReactionSmiles('>>')"), /empty/);
run("var sample = rxioToRxn([{smiles:'CCO',role:'reactant'},{smiles:'O',role:'solvent'}],[{smiles:'CC=O'}]);");
assert.equal(run('rxioParseRxn(sample).compounds.length'), 2);
assert.equal(run('rxioParseRxn(sample).products.length'), 1);
assert.equal(run("rxioParseRxn('  \\n' + sample.replace(/\\n/g, '\\r\\n')).compounds.length"), 2);
assert.throws(() => run("rxioParseRxn(sample.slice(0, sample.lastIndexOf('$MOL')))"), /counts line/);
assert.throws(() => run("rxioParseRxn(sample.replace('  1  1  1', ' -1  1  1'))"), /counts line/);
assert.throws(() => run("rxioParseRxn(sample.replace('  1  1  1', '  1  1  0'))"), /counts line/);
assert.throws(() => run("rxioParseRxn('$RXN\\n\\n\\n\\n  0  0\\n')"), /empty/);
console.log('Reaction I/O regression tests passed.');
