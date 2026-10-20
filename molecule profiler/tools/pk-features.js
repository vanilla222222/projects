'use strict';
for(const f of ['smiles','mol','smarts','stereo','descriptors','fingerprints'])Object.assign(global,require('../js/'+f));
const {features}=require('../js/pk-features');
const rows=JSON.parse(require('fs').readFileSync(0,'utf8'));
console.log(JSON.stringify(rows.map(smiles=>{try{const mol=buildMolecule(parseSmiles(smiles));return features(mol,describe(mol),fingerprint(mol,'ecfp4s'));}catch(error){return {error:String(error.message)};}})));
