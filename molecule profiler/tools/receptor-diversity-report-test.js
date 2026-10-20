'use strict';
// Snapshot integrity and coverage consistency; not a chemistry validation test.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),report=require('../validation/receptor-scaffold-diversity.json');
const api=require('../js/receptor-catalog'),{RECEPTOR_REFERENCE_CATALOG:c}=require('../data/receptor-catalog');
const {LIBRARY}=require('../data/library'),{TARGETS}=require('../data/targets');
const {RECEPTOR_LIGAND_ANNOTATIONS:a}=require('../data/receptor-ligand-annotations');
assert.equal(report.schemaVersion,1);assert.ok(report.rdkitVersion);
assert.deepEqual(Object.keys(report.sourceSha256).sort(),['data/library.js','data/targets.js','data/receptor-catalog.js',
 'data/receptor-ligand-annotations.js','js/receptor-catalog.js','tools/receptor-diversity-audit.py'].sort());
for(const [file,digest] of Object.entries(report.sourceSha256)){
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),digest,
  'Diversity snapshot is stale; rerun tools/receptor-diversity-audit.py: '+file);
}
assert.equal(report.rows.length,c.receptors.length);
assert.equal(new Set(report.rows.map(r=>r.id)).size,report.rows.length);
for(const row of report.rows){
 const receptor=c.receptors.find(r=>r.id===row.id);assert.ok(receptor);
 assert.equal(row.sourcedProfiles,api.coverage(receptor,TARGETS,LIBRARY,a).sourcedProfiles);
 for(const key of ['sourcedProfiles','ringProfiles','acyclicProfiles','distinctRingScaffolds','largestRingScaffoldProfiles'])
  assert.ok(Number.isSafeInteger(row[key])&&row[key]>=0,key);
 assert.equal(row.ringProfiles+row.acyclicProfiles,row.sourcedProfiles);
 assert.equal(row.distinctRingScaffolds,row.ringScaffolds.length);
 assert.equal(new Set(row.ringScaffolds.map(s=>s.smiles)).size,row.ringScaffolds.length);
 assert.ok(row.ringScaffolds.every(s=>typeof s.smiles==='string'&&s.smiles.length&&Number.isSafeInteger(s.profiles)&&s.profiles>0));
 assert.equal(row.ringScaffolds.reduce((n,s)=>n+s.profiles,0),row.ringProfiles);
 const largest=Math.max(0,...row.ringScaffolds.map(s=>s.profiles));
 assert.equal(row.largestRingScaffoldProfiles,largest);
 assert.equal(row.largestRingScaffoldFractionOfRingProfiles,row.ringProfiles?largest/row.ringProfiles:null);
}
console.log('Receptor scaffold snapshot: current source hashes, coverage counts, separate acyclic profiles and ring-scaffold totals passed');
