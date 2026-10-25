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
const legacy=api.rank(q,index,{mode:'legacy'}).find(r=>r.target.gene==='A');
assert.equal(legacy.count,3);assert.equal(legacy.distinctCount,2);
assert.equal(legacy.support,row.support,'support must use distinct ensemble profiles regardless of ranking mode');
assert.equal(legacy.matchingProfiles,1);assert.equal(row.matchingProfiles,1);
assert.ok(row.evidence.some(e=>e.sameProfile));
assert.match(row.applicability,/not independent prediction/);
assert.equal(api.rank(q,index,{excludeProfile:q.profile})[0].matchingProfiles,0);
assert.equal(api.rank(q,index,{mode:'legacy',method:'ecfp6',metric:'dice'}).find(r=>r.target.gene==='A').support,row.support);
const untouched=JSON.stringify(targets);api.rank(q,index,{});assert.equal(JSON.stringify(targets),untouched);
const mirrorIndex=api.createIndex([{name:'R',smiles:'N[C@@H](C)C(=O)O'},{name:'S',smiles:'N[C@H](C)C(=O)O'}],
 [{gene:'R',ligands:['R']},{gene:'S',ligands:['S']}],engine);
const mirror=api.rank(api.query(engine.parse('N[C@@H](C)C(=O)O'),mirrorIndex),mirrorIndex,{});
assert.equal(mirror[0].target.gene,'R');assert.ok(mirror[1].score<1,'stereochemical disagreement must affect the ensemble');
console.log('Target ranking: multi-view scoring, grouped references, self-profile holdout, stereochemistry, scopes and exclusions passed');
assert.match(rows.find(r=>r.target.gene==='B').coverage,/Single-profile/);assert.equal(rows.find(r=>r.target.gene==='B').belowCoverageGoal,true);assert.match(row.coverage,/Sparse/);assert.match(api.coverageLabel(10),/Below/);assert.match(api.coverageLabel(50),/source qualification/);
const baseTargets=require('../data/targets').TARGETS,adr=baseTargets.find(t=>t.gene==='ADRA1B');assert.equal(adr.ligands.length,50);for(const n of ['Promazine','Nortriptyline','Lofepramine'])assert.ok(!adr.ligands.includes(n),'Do not restore source-unqualified class labels to the binding-only panel');
// An incomplete new panel must not compete, even on an exact known-reference query.
const pending={...targets[0],gene:'PENDING',lookupOnly:true};
const pendingIndex=api.createIndex(library,[...targets,pending],engine);
for(const mode of ['legacy','ensemble'])assert.ok(api.rank(api.query(engine.parse('CCO'),pendingIndex),pendingIndex,{mode}).every(r=>r.target.gene!=='PENDING'));
assert.ok(pendingIndex.entries.has('Ethanol'),'Lookup-only references remain available to the index');
const live=require('./load-reference-context');
for(const gene of ['TAAR1','GRM2','GRM5','CNR1','CNR2'])assert.equal(live.targets.find(t=>t.gene===gene).lookupOnly,true,gene+' must not enter ranking below its coverage floor');
console.log('Incomplete new panels: lookup evidence retained, excluded from both ranking methods');
