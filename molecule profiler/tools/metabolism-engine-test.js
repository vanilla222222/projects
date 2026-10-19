'use strict';
const assert=require('node:assert/strict');
for(const file of ['js/smiles','js/mol','js/smarts','js/transform','js/sites','data/toxalerts','data/alerts','data/metabolism','js/descriptors','js/fingerprints','js/rules','js/tox','js/metabolism'])Object.assign(global,require('../'+file+'.js'));
function record(smiles){const mol=buildMolecule(parseSmiles(smiles)),d=describe(mol);return {smiles,mol,d,v:evaluate(d)};}
const aspirin=record('CC(=O)Oc1ccccc1C(=O)O');
assert.equal(metabolicTree(aspirin,{depth:0}).metabolites.length,0);
for(const depth of [-1,4,Infinity,1.5])assert.throws(()=>metabolicTree(aspirin,{depth}),/depth/);
assert.throws(()=>metabolicTree(aspirin,{maxNodes:0}),/budget/);
assert.throws(()=>metabolicTree(aspirin,{phases:['bad']}),/phase/);
const full=metabolicTree(aspirin,{depth:1,maxNodes:120});
const capped=metabolicTree(aspirin,{depth:1,maxNodes:4});
assert.equal(capped.nodes.length,4);assert.equal(capped.truncated,true);
assert.deepEqual(capped.metabolites.map(n=>n.score),full.metabolites.slice(0,3).map(n=>n.score),'budget must retain strongest generation candidates');
const original=METABOLISM;global.METABOLISM=original.slice().reverse();
const reversed=metabolicTree(aspirin,{depth:1,maxNodes:4});global.METABOLISM=original;
assert.deepEqual(reversed.metabolites.map(n=>metaboliteKey(n.mol,n.d)),capped.metabolites.map(n=>metaboliteKey(n.mol,n.d)),'capping must not depend on reaction-list order');
const tree=metabolicTree(aspirin,{depth:2,maxNodes:120});
for(const node of tree.metabolites){
 const parent=tree.nodes[node.parent];
 assert.ok(parent.depth<node.depth,'representative routes must not cycle');
 assert.ok(Math.abs(parent.score*node.weight-node.score)<1e-12,'score must match displayed route');
 assert.equal(node.steps[0].from,node.parent);assert.equal(node.steps[0].rule,node.rule);
 assert.equal(node.steps[0].enzyme,node.enzyme);assert.equal(node.steps[0].siteFactor,node.siteFactor);
 assert.ok(parent.children.includes(node.id));
}
assert.equal(tree.diagnostics.ruleErrors.length,0);
assert.ok(tree.diagnostics.transformMatches>0);
global.METABOLISM=[...original,{name:'Deliberately invalid fixture',phase:'I',smirks:'broken',weight:1}];
const damaged=metabolicTree(aspirin,{depth:1});global.METABOLISM=original;
assert.equal(damaged.diagnostics.ruleErrors.length,1,'rule failures must be surfaced, not silently swallowed');
assert.ok(damaged.metabolites.length>0);
console.log('Metabolism: generation budgets, rule-order invariance, coherent representative paths, diagnostics and settings passed');
