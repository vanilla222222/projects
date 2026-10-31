'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),research=require('../js/reference-research');
const urls=['https://doi.org/10.1080/09593338709384509','https://doi.org/10.1038/313384a0'];
assert.deepEqual(research.primaryReferences({originalReferences:[urls[0],' '+urls[1]+' ',urls[0]],originalReference:urls[0]}),urls);
assert.deepEqual(research.primaryReferences({originalReferences:['SAMPL4_Guthrie','javascript:alert(1)','http://example.org/paper','https://user:password@example.org/paper',null],originalReference:'SAMPL4_Guthrie'}),[]);
assert.deepEqual(research.primaryReferences({originalReference:urls[0]}),[urls[0]]);
const {model}=require('./reference-research-test'),data=require('../data/curated-references').CURATED_REFERENCES;
const dmsoRecord=data.records.find(r=>r.id==='property-freesolv2-8578590'),dmso=model.dossier(dmsoRecord.compounds[0].libraryNames[0]).observations.find(o=>o.recordId===dmsoRecord.id);
const unpublishedRecord=data.records.find(r=>r.evidence.some(e=>/unpublished/i.test(e.experimentalReference||'')));assert.ok(unpublishedRecord);const unpublished=model.dossier(unpublishedRecord.compounds[0].libraryNames[0]).observations.find(o=>o.recordId===unpublishedRecord.id);assert.match(unpublished.referenceStatus,/unpublished/i);assert.ok(unpublished.originalReferences.every(url=>unpublished.originalReferenceLabel.includes(url.slice('https://doi.org/'.length))),'Only explicitly supplied DOIs can be linked');
assert.deepEqual(dmso.originalReferences,urls);assert.ok(dmso.originalReferenceLabel.includes(' and '));
const unresolved=model.entries.flatMap(e=>model.dossier(e.name).observations).filter(o=>o.originalReferenceLabel==='SAMPL4_Guthrie');assert.ok(unresolved.length>=7);
for(const o of unresolved)assert.deepEqual(o.originalReferences,[],'Unresolved source labels cannot become invented URLs');
const root=path.resolve(__dirname,'..'),metadata=require('../data/library-receptor-tags').LIBRARY_RECEPTOR_METADATA,source=new Map();
for(const file of fs.readdirSync(path.join(root,'validation')).filter(f=>/^chembl-receptor-binding-batch(?:-\d+)?\.json$/.test(f))){
 const relative='validation/'+file,raw=fs.readFileSync(path.join(root,relative)),batch=JSON.parse(raw),hash=crypto.createHash('sha256').update(raw).digest('hex');
 batch.panels.forEach((panel,pi)=>panel.selected.forEach((record,si)=>{
  const key=panel.gene+':'+record.activity.activity_id;assert.ok(!source.has(key));source.set(key,{record,relative,hash,location:`panels[${pi}].selected[${si}]`});
 }));
}
let binding=0,classified=0;
for(const [name,entry]of Object.entries(metadata.entries))for(const e of entry.evidence){
 if(!['ChEMBL','ChEMBL curated action classification'].includes(e.provider))continue;
 const witness=source.get(e.receptorId+':'+e.activityId);assert.ok(witness);const a=witness.record.activity;
 assert.equal(e.documentJournal,a.document_journal);assert.equal(e.documentYear,a.document_year);
 assert.equal(e.sourceFile,witness.relative);assert.equal(e.sourceSha256,witness.hash);assert.equal(e.sourceLocation,witness.location);
 const observation=model.dossier(name).observations.find(o=>o.activityId===e.activityId&&o.provider===e.provider);assert.ok(observation);
 assert.equal(observation.documentJournal,a.document_journal);assert.equal(observation.documentYear,a.document_year);
 if(e.provider==='ChEMBL'){
  binding++;assert.equal(observation.value,Number(a.standard_value));assert.equal(observation.metric,a.standard_type);assert.equal(observation.unit,a.standard_units);assert.equal(observation.relation,a.standard_relation);assert.equal(observation.action,'');
 }else{classified++;assert.equal(observation.value,undefined);assert.equal(observation.metric,undefined);assert.deepEqual(observation.actions,e.actions);}
}
assert.equal(binding,source.size,'Every retained binding row must preserve its bibliographic metadata');assert.ok(classified>=31);
console.log('Reference citations: both DMSO primary links, deduplication and unresolved labels; '+binding+' binding / '+classified+' action journal-year/source witnesses preserved without measurement changes');
