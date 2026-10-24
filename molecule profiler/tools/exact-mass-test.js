'use strict';
const assert=require('node:assert/strict');
const {parseSmiles}=require('../js/smiles');
const {buildMolecule,exactMass,molecularWeight}=require('../js/mol');
const fixture=require('../validation/exact-mass-rdkit-cases.json');
for(const row of fixture.cases){
 const mol=buildMolecule(parseSmiles(row.smiles));
 assert.ok(Math.abs(exactMass(mol)-row.exactMass)<1e-7,row.smiles);
}
for(const smiles of ['C[37Cl]','C[81Br]','[127I]C']){
 const labelled=buildMolecule(parseSmiles(smiles));
 const ordinary=buildMolecule(parseSmiles(smiles.replace(/\[(\d+)([A-Za-z]+)\]/g,'$2')));
 assert.notEqual(molecularWeight(labelled),molecularWeight(ordinary));
}
const unavailable=buildMolecule(parseSmiles('[999CH4]'));
assert.ok(Number.isNaN(exactMass(unavailable)));
assert.ok(Number.isNaN(molecularWeight(unavailable)));
console.log('Exact masses: '+fixture.cases.length+' independent RDKit fixtures, ionic electron correction, stable isotope labels and unknown-isotope abstention passed.');
