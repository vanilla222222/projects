'use strict';
const assert=require('node:assert/strict'),curated=require('../js/curated-references'),catalog=require('../js/library-catalog'),api=require('../js/reference-evidence');
const data=require('../data/curated-references').CURATED_REFERENCES;
global.CURATED_REFERENCES=data;global.CuratedReferences=curated;global.LIBRARY_RECEPTOR_METADATA=require('../data/library-receptor-tags').LIBRARY_RECEPTOR_METADATA;
const rows=curated.library(require('../data/library').LIBRARY),options={curated,catalog,data};let gaps=0;
for(const entry of rows){
 const imported=catalog.receptorEvidence(entry),combined=api.forEntry(entry,options);
 for(const tag of curated.tags(entry).filter(t=>t.startsWith('Receptor action: '))){
  const target=tag.slice('Receptor action: '.length).split(' · ')[0];
  if(imported.some(e=>e.receptorId===target))continue;
  gaps++;assert.ok(combined.some(e=>e.receptorId===target&&['source_classification','functional_assay'].includes(e.evidenceKind)),'Curated evidence missing for '+entry.name+' / '+target);
 }
 assert.deepEqual(catalog.receptorEvidence(entry),imported,'Disclosure must not mutate catalog evidence');
}
assert.ok(gaps>=39,'Exercise the published 39 missing curated target disclosures');
for(const [name,target,kind]of [['Valsartan','AGTR1','source_classification'],['SKF-38393','DRD1','source_classification'],['2C-C','HTR2A','functional_assay']]){
 const entry=rows.find(e=>e.name===name),combined=api.forEntry(entry,options),e=combined.find(e=>e.receptorId===target&&e.evidenceKind===kind);
 assert.ok(e,name);assert.ok(e.sourceUrl.startsWith('https://'));assert.ok(e.sourceType&&e.sourceAction&&e.provider);assert.equal(e.librarySmiles,entry.smiles);
 assert.ok(!api.forEntry({...entry,smiles:'CCO'},options).some(e=>e.evidenceKind),'Stale graph must not receive curated action evidence');
}
const base=rows.find(e=>e.name==='2C-C'),records=curated.forEntry(base,data),duplicateData={...data,records:records.concat(records)};
assert.equal(api.forEntry(base,{...options,data:duplicateData}).filter(e=>e.evidenceKind).length,api.forEntry(base,options).filter(e=>e.evidenceKind).length,'Repeated source records must not duplicate disclosure');
const prop=rows.find(e=>curated.forEntry(e,data).some(r=>r.evidence.some(x=>x.kind==='measured_property')));
assert.ok(prop);assert.ok(!api.forEntry(prop,options).some(e=>e.evidenceKind==='measured_property'),'Property observations do not establish target actions');
const synthetic={...data,records:records.map(r=>({...r,evidence:r.evidence.map(e=>({...e,species:'Mus musculus'}))}))};
assert.ok(!api.forEntry(base,{...options,data:synthetic}).some(e=>e.evidenceKind),'Human action disclosure excludes nonhuman evidence');
assert.deepEqual(catalog.receptorEvidence(base),global.LIBRARY_RECEPTOR_METADATA.entries[base.name]?.evidence||[],'Global catalog evidence must remain unchanged');
console.log('Reference evidence disclosure: '+gaps+' curated target gaps covered; classifications, functional context, stale graphs, duplicate records and property separation passed');
