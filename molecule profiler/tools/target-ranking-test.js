'use strict';
const assert=require('node:assert/strict');
const api=require('../js/target-ranking.js');
for(const file of ['smiles','mol','stereo','fingerprints'])Object.assign(global,require('../js/'+file+'.js'));
const engine={parse:smiles=>buildMolecule(parseSmiles(smiles)),fingerprint,tanimoto,dice};
const library=[{name:'Ethanol',smiles:'CCO'},{name:'Ethanol alias',smiles:'OCC'},{name:'Propanol',smiles:'CCCO'},
  {name:'Benzene',smiles:'c1ccccc1'},{name:'Illustration',smiles:'CCO',propertyOnly:true}];
const targets=[{name:'A',gene:'A',family:'GPCR',organism:'Human',ligands:['Ethanol','Ethanol alias','Propanol']},
 {name:'B',gene:'B',family:'Enzyme',organism:'Human',ligands:['Benzene']},
 {name:'Other species',gene:'C',family:'GPCR',organism:'Bacterial',ligands:['Ethanol']},
 {name:'Invalid',gene:'D',ligands:['Missing','Illustration']}];
const index=api.createIndex(library,targets,engine);
const q=api.query(engine.parse('CCO'),index);
const rows=api.rank(q,index,{});
const row=rows.find(r=>r.target.gene==='A');
assert.equal(row.count,3);
assert.equal(row.distinctCount,2,'equivalent fingerprint profiles must not inflate supporting-reference count');
assert.equal(row.score,1);
assert.ok(row.rankScore<=row.score);
assert.deepEqual(row.components,[1,1,1]);
assert.equal(index.issues.length,2);
assert.ok(api.rank(q,index,{organism:'Human',receptorsOnly:true}).every(r=>r.target.gene==='A'));
assert.ok(api.rank(q,index,{excludeProfile:q.profile}).find(r=>r.target.gene==='A').score<1,'all profile aliases must be held out together');
assert.equal(api.rank(q,index,{mode:'legacy'}).find(r=>r.target.gene==='A').distinctCount,3);
const untouched=JSON.stringify(targets);api.rank(q,index,{});assert.equal(JSON.stringify(targets),untouched);
const mirrorIndex=api.createIndex([{name:'R',smiles:'N[C@@H](C)C(=O)O'},{name:'S',smiles:'N[C@H](C)C(=O)O'}],
 [{gene:'R',ligands:['R']},{gene:'S',ligands:['S']}],engine);
const mirror=api.rank(api.query(engine.parse('N[C@@H](C)C(=O)O'),mirrorIndex),mirrorIndex,{});
assert.equal(mirror[0].target.gene,'R');assert.ok(mirror[1].score<1,'stereochemical disagreement must affect the ensemble');
console.log('Target ranking: multi-view scoring, grouped references, self-profile holdout, stereochemistry, scopes and exclusions passed');
