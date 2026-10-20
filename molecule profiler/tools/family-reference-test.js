'use strict';
// Source-linked identity regressions, not experimental pharmacology validation.
const assert=require('node:assert/strict');
const r=require('../validation/family-reference-curation.json');
const {LIBRARY}=require('../data/library');
const byName=new Map(LIBRARY.map(e=>[e.name,e]));
for(const f of ['smiles','mol'])Object.assign(global,require('../js/'+f));
assert.equal(r.applied,true);assert.equal(r.changes.length,9);
for(const x of r.changes){
 const e=byName.get(x.name);assert.ok(e);
 assert.equal(e.smiles,x.sourceSmiles);assert.equal(e.formula,x.sourceFormula);
 assert.notEqual(e.smiles,x.librarySmiles);
 assert.ok(x.sourceUrl.startsWith('https://pubchem.ncbi.nlm.nih.gov/compound/'));
 assert.equal(molecularFormula(buildMolecule(parseSmiles(e.smiles))),e.formula);
}
assert.equal(r.namedSelections.length,6);
for(const x of r.namedSelections){
 assert.ok(x.roleSourceUrl.startsWith('https://dailymed.nlm.nih.gov/'));
 assert.ok(x.documentedRole);assert.ok(x.response.PropertyTable.Properties[0].InChIKey);
 const e=byName.get(x.reusedReferenceId||x.name);assert.ok(e);
 if(!x.reusedReferenceId)assert.equal(e.smiles,x.sourceSmiles);
 assert.equal(molecularFormula(buildMolecule(parseSmiles(e.smiles))),e.formula);
}
for(const e of r.additions){assert.equal(byName.get(e.name).smiles,e.smiles);assert.equal(e.cls,'Amphetamine-related reference');}
const pair=r.namedSelections.slice(0,2);assert.notEqual(pair[0].sourceSmiles,pair[1].sourceSmiles);
assert.ok(pair.every(x=>x.sourceSmiles.includes('@')),'Enantiomer references retain source stereo');
console.log('Named family references: nine reviewed identities, source/formula guards, documented selection roles and explicit amphetamine stereo passed');
