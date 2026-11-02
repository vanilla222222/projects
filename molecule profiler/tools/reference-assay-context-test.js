'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{model}=require('./reference-research-test');
const metadata=require('../data/library-receptor-tags').LIBRARY_RECEPTOR_METADATA;
const fields={assayFormatId:'bao_format',assayFormat:'bao_label',assayTypeDescription:'assay_type_description',assayConfidenceDescription:'confidence_description',assayRelationshipType:'relationship_type',assayRelationshipDescription:'relationship_description',assaySubcellularFraction:'assay_subcellular_fraction',assayTestType:'assay_test_type'},source=new Map();
for(const file of fs.readdirSync(path.join(__dirname,'../validation')).filter(f=>/^chembl-receptor-binding-batch(?:-\d+)?\.json$/.test(f)))for(const panel of JSON.parse(fs.readFileSync(path.join(__dirname,'../validation',file))).panels)for(const row of panel.selected){const key=panel.gene+':'+row.activity.activity_id;assert.ok(!source.has(key));source.set(key,row);}
let binding=0,classified=0,pa2=0,time=0;const formats=new Set();
for(const [name,entry]of Object.entries(metadata.entries))for(const e of entry.evidence){
 if(!['ChEMBL','ChEMBL curated action classification'].includes(e.provider))continue;
 const raw=source.get(e.receptorId+':'+e.activityId);assert.ok(raw);const observation=model.dossier(name).observations.find(o=>o.activityId===e.activityId&&o.provider===e.provider);assert.ok(observation);
 for(const [field,key]of Object.entries(fields)){assert.equal(e[field],raw.assay[key]);assert.equal(observation[field],raw.assay[key]);}
 assert.deepEqual(e.sourceActivityProperties,raw.activity.activity_properties);assert.deepEqual(observation.sourceActivityProperties,raw.activity.activity_properties);
 if(e.provider==='ChEMBL'){
  binding++;formats.add(observation.assayFormat);time+=Number(observation.sourceActivityProperties.length>0);pa2+=Number(observation.originalMetric==='pA2');
  assert.equal(observation.value,Number(raw.activity.standard_value));assert.equal(observation.metric,raw.activity.standard_type);assert.equal(observation.unit,'nM');assert.equal(observation.action,'');assert.equal(observation.hostSpecies,'Not reported');
 }else{classified++;assert.equal(observation.value,undefined);assert.equal(observation.metric,undefined);assert.deepEqual(observation.actions,e.actions);}
}
assert.equal(binding,source.size);assert.equal(pa2,5);assert.equal(time,22);assert.ok(classified>=31);assert.ok(formats.has('cell-based format')&&formats.has('single protein format'));
console.log('Assay context: '+binding+' source rows / '+classified+' classifications preserve literal format and assignment annotations; 5 pA2 standardizations and 22 source timing contexts preserve result/action boundaries');
