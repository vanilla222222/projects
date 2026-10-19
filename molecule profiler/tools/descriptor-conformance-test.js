'use strict';
const assert=require('node:assert/strict');
for(const file of ['smiles','mol','smarts','descriptors','rules'])Object.assign(global,require('../js/'+file+'.js'));
const fixture=require('../validation/descriptor-rdkit-cases.json');
let count=0;
for(const row of fixture.cases)for(const input of row.inputs){
 const actual=crippen(buildMolecule(parseSmiles(input)));
 for(const key of ['logp','mr'])assert.ok(Math.abs(actual[key]-row[key])<1e-7,
  row.name+' '+key+': '+actual[key]+' versus RDKit '+row[key]+' for '+input);
 count++;
}
console.log('RDKit '+fixture.rdkitVersion+' descriptor fixtures: '+count+' alternate representations passed (implementation equivalence only)');
