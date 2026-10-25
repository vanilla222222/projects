'use strict';
// Family labels describe graphs; only source-backed functional observations
// may contribute receptor action or human target ranking.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {CURATED_REFERENCES:d}=require('../data/curated-references');
const report=require('../validation/curated-references.json');
const {LIBRARY}=require('../data/library');
const {TARGETS}=require('../data/targets');
const api=require('../js/curated-references');
const byname=new Map(api.library(LIBRARY,d).map(e=>[e.name,e]));
const defs=d.familyDefinitions;
assert.equal(defs.length,9);
for(const [file,digest] of Object.entries(report.familySourceSha256))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',file))).digest('hex'),digest,'Stale family source '+file);
for(const def of defs){
  assert.ok(def.description);
  for(const name of def.positiveNames){const e=byname.get(name);assert.ok(e,'Missing positive fixture '+name);assert.ok(api.tags(e,d).includes(def.tag),name+' should match '+def.name);}
  for(const name of def.negativeNames){const e=byname.get(name);assert.ok(e,'Missing negative fixture '+name);assert.ok(!api.tags(e,d).includes(def.tag),name+' should not match '+def.name);}
}
const records=d.records.filter(r=>r.id.startsWith('family-001-'));
assert.equal(records.length,6,'New named references must each have published pharmacology');
const target=api.targets(TARGETS,d).find(t=>t.gene==='OPRM1');assert.ok(target);
for(const id of ['family-001-29642','family-001-32512','family-001-162623891','family-001-162623683','family-001-37456']){
  const r=records.find(x=>x.id===id);assert.ok(r);assert.ok(api.rankingEvidence(r).some(e=>e.kind==='functional_assay'&&e.species==='Homo sapiens'));
  for(const c of r.compounds)for(const name of c.libraryNames)assert.ok(target.ligands.includes(name));
}
const brorphine=records.find(r=>r.id==='family-001-145975294');
assert.equal(api.rankingEvidence(brorphine).length,2,'Both human MOR assay pathways must be eligible for ranking');
assert.ok(target.ligands.includes('Brorphine'));
assert.ok(records.every(r=>r.evidence.some(e=>e.kind==='functional_assay')),'No identity-only additions');
for(const r of records)for(const e of r.evidence.filter(x=>x.kind==='functional_assay')){
  assert.equal(e.receptorId,'OPRM1');assert.equal(e.action,'agonist');assert.ok(e.assay&&e.endpoint&&e.sourceUrl.startsWith('https://'));
  if(e.value!==undefined){assert.match(e.endpoint,/^EC50/);assert.equal(e.unit,'nM');assert.ok(e.value>0);}
}
assert.ok(!defs.some(x=>x.name==='Nitro compounds'),'Amino nitazene must not acquire nitro classification');
assert.ok(records.some(r=>r.compounds.some(c=>c.sourceName==='5-Aminoisotonitazene')));
const amino=records.find(r=>r.id==='family-001-162623891').compounds[0];
const aminoEntry=byname.get(amino.libraryNames[0]);
assert.ok(api.tags(aminoEntry,d).includes('Family motif: Nitazene-related benzimidazoles'));
assert.ok(!api.tags(aminoEntry,d).includes('Family motif: Nitazenes'),'Amino metabolite must not be mislabeled as nitro-substituted');
assert.equal(api.rankingEvidence({panel:{gene:'OPRM1'},evidence:[{kind:'identity_reference'}]}).length,0);
const {PHARMACOLOGY_EVIDENCE:base}=require('../data/pharmacology-evidence');
const annotations=api.annotations([],Array.from(byname.values()),d);
assert.ok(annotations.length>=7);
assert.ok(annotations.every(a=>a.receptorId==='OPRM1'&&a.evidenceType==='functional'));
assert.equal(annotations.filter(a=>a.ligandName==='Brorphine').length,2);
assert.ok(records.some(r=>r.id==='family-001-162623683'&&r.evidence.some(e=>/[Cc]itrate/.test(e.testedForm||''))));
console.log('Family and pharmacology references: nine guarded structural filters, six pharmacology-backed additions, species-aware human ranking and assay-specific values passed');
