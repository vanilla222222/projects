'use strict';
for(const file of ['js/smiles','js/mol','js/smarts','js/transform','js/sites','data/toxalerts','data/alerts','data/metabolism','js/descriptors','js/fingerprints','js/rules','js/tox','js/metabolism'])Object.assign(global,require('../'+file+'.js'));
const parents=[['Aspirin','CC(=O)Oc1ccccc1C(=O)O'],['Paracetamol','CC(=O)Nc1ccc(O)cc1'],['Ibuprofen','CC(C)Cc1ccc(cc1)C(C)C(=O)O']];
const products=parents.flatMap(([name,smiles])=>{
 const mol=buildMolecule(parseSmiles(smiles)),d=describe(mol);
 const tree=metabolicTree({name,smiles,mol,d,v:evaluate(d)},{depth:2,maxNodes:120});
 return tree.metabolites.map(node=>({parent:name,smiles:node.smiles,rule:node.rule,formula:node.d.formula}));
});
console.log(JSON.stringify({schemaVersion:1,scope:'Syntax, sanitization and formula checks only; not evidence of in-vivo metabolism.',products}));
