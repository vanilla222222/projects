'use strict';
const assert=require('node:assert/strict');
const {CURATED_REFERENCES:d}=require('../data/curated-references'),{LIBRARY}=require('../data/library'),{TARGETS}=require('../data/targets');
const api=require('../js/curated-references'),receptor=require('../js/receptor-catalog'),{RECEPTOR_REFERENCE_CATALOG:catalog}=require('../data/receptor-catalog');
const rows=api.library(LIBRARY,d),byname=new Map(rows.map(e=>[e.name,e])),records=d.records.filter(r=>r.id.startsWith('family-004-'));
assert.equal(records.length,14);assert.ok(d.familyDefinitions.length>=23);
const expected={'Benzisothiazoles':6,'Dibenzodiazepines':4,'Dibenzothiazepines':2,'Pyrimidinylpiperazines':2};
const targets=api.targets(TARGETS,d);
for(const [family,count]of Object.entries(expected)){
 const selected=records.filter(r=>r.familyDefinition===family);assert.equal(selected.length,count);
 assert.ok(d.familyDefinitions.some(f=>f.name===family));assert.ok(d.familyCoverage.find(f=>f.name===family).currentEntries>=count);
 for(const r of selected){const c=r.compounds[0],e=r.evidence[0];assert.equal(c.inchiKey,c.identitySource.sourceLigand.InChIKey);assert.equal(e.sourceRecord['Target Species'],'Human');assert.equal(e.sourceRecord['Target Gene Symbol'],r.panel.gene);
  for(const name of c.libraryNames){assert.ok(api.tags(byname.get(name),d).includes('Family motif: '+family));assert.ok(targets.find(t=>t.gene===r.panel.gene).ligands.includes(name));assert.equal(api.nameRecord(byname.get(name),d).preferredName,c.sourceName);}
 }
}
const annotations=api.annotations([],rows,d).filter(a=>a.curatedReferenceId.startsWith('family-004-'));
assert.equal(annotations.length,14);assert.deepEqual(receptor.validateAnnotations(annotations,catalog.receptors,rows),[]);
assert.ok(annotations.every(a=>a.evidenceType==='source_classification'&&a.value===undefined&&a.metric===undefined));
const expectedActions={ziprasidone:{DRD2:'antagonist',HTR2A:'antagonist',HTR1A:'partial_agonist'},perospirone:{DRD2:'antagonist',DRD3:'antagonist',DRD4:'antagonist'},clozapine:{DRD2:'antagonist',DRD4:'antagonist',HTR2A:'inverse_agonist',HRH1:'antagonist'},quetiapine:{DRD2:'antagonist',HRH1:'antagonist'},buspirone:{HTR1A:'partial_agonist'},tandospirone:{HTR1A:'agonist'}};
for(const r of records){const c=r.compounds[0],e=r.evidence[0];assert.equal(e.action,expectedActions[c.sourceName][e.receptorId]);assert.ok(c.libraryNames.every(n=>LIBRARY.some(b=>b.name===n)),'Reuse existing exact graphs');}
assert.equal(records.find(r=>r.compounds[0].sourceName==='tandospirone').evidence[0].sourceRecord.Action,'Full agonist');
assert.ok(!records.some(r=>r.compounds[0].sourceName==='quetiapine'&&r.panel.gene==='HTR2A'),'Conflicting source HTR2A action rows are outside this selected batch');
const partial=annotations.find(a=>a.classification.sourceRecord.Ligand==='buspirone');
assert.ok(receptor.validateAnnotations([{...partial,action:'agonist'}],catalog.receptors,rows).length,'A partial agonist must not become a full agonist');
console.log('Family batch 004: four structural families, six identities, 14 human action records, multi-target evidence and distinct action scopes passed');
