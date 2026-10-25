'use strict';
const assert=require('node:assert/strict');for(const f of ['smiles','mol','stereo','fingerprints'])Object.assign(global,require('../js/'+f));global.Pharmacology=require('../js/pharmacology');global.ReferenceStructure=require('../js/reference-structure');const {model}=require('./reference-research-test'),api=require('../js/reference-sar'),sar=api.create(model),result=sar.groups('Series: 2C / 2C-x phenethylamines','COc1cc(CCN)c(OC)cc1');
assert.equal(result.observations,32);assert.equal(result.groups.length,3);assert.deepEqual(result.groups.map(g=>g.rows.length).sort((a,b)=>a-b),[7,11,14]);
assert.ok(result.groups.every(g=>g.rows.every(r=>r.observation.value>0&&r.observation.relation==='='&&r.mapping.length===result.query.atoms.length)));
assert.equal(sar.groups('Family motif: Benzisothiazoles','c1ccccc1').observations,0,'Classifications must not become SAR potency');
const fitted=api.fitCoordinates([{x:0,y:0},{x:1,y:0},{x:0,y:1}],[{x:4,y:5},{x:4,y:6},{x:3,y:5}],[0,1,2]);for(let i=0;i<3;i++){const expected=[{x:0,y:0},{x:1,y:0},{x:0,y:1}][i];assert.ok(Math.hypot(fitted[i].x-expected.x,fitted[i].y-expected.y)<1e-9);}assert.ok((fitted[1].x-fitted[0].x)*(fitted[2].y-fitted[0].y)-(fitted[1].y-fitted[0].y)*(fitted[2].x-fitted[0].x)>0,'No reflection');
assert.throws(()=>sar.groups('Series: 2C / 2C-x phenethylamines','not a structure'));
console.log('Family SAR: complete 11/14/7 measured cohorts, source/assay separation, source-classification exclusion and reflection-free core alignment passed');
