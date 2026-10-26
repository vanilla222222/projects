'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto');for(const f of ['smiles','mol','stereo','fingerprints'])Object.assign(global,require('../js/'+f));global.Pharmacology=require('../js/pharmacology');global.ReferenceStructure=require('../js/reference-structure');global.ReferenceSAR=require('../js/reference-sar');const {model}=require('./reference-research-test'),d=require('../data/reference-matched-pairs').REFERENCE_MATCHED_PAIRS,api=require('../js/reference-pairs'),pairs=api.create(model,d),sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',p))).digest('hex');
assert.equal(d.sourceSha256,sha('data/curated-references.js'));assert.equal(d.builderSha256,sha('tools/build-reference-pairs.py'));assert.equal(d.unresolvedFragmentations,0);assert.ok(d.pairs.some(p=>p.variableA.includes('[H]')||p.variableB.includes('[H]')),'Include hydrogen replacements');
// Pin a published historical subset, not the evolving whole-index totals. Graph
// insertions can reorder every array index, so relations use graph/fragment keys.
const historical=require('../validation/fixtures/reference-pairs-a77c4f0.json');
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
assert.equal(historical.schemaVersion,1);
assert.equal(historical.origin.commit,'a77c4f0688a9064a0d1a3acf54841b3c67f4a01d');
assert.equal(historical.origin.blobSha,'3aae02fe9e312b8ee5e93a3917b54da60dc2e4f2');
assert.equal(historical.origin.sha256,'b776e43d914beb71033891eaf2495fe98e7cae933d2ca4fe1ca8089090bde1f4');
assert.equal(historical.historicalSha256,'a1899f5d96df9840f7067276bc507aac42d8673794b8ec4031fc0f25e001ae29','Do not regenerate the published historical subset from current data');
assert.equal(historical.historicalSha256,digest(historical.historical),'Historical fixture content must remain unchanged');
assert.equal(historical.historical.graphs.length,historical.graphCount);
assert.equal(historical.historical.relationSignatures.length,historical.relationCount);
const byGraph=new Map(d.graphs.map(g=>[g.smiles,g]));
assert.equal(byGraph.size,d.graphs.length,'Current canonical graph identities must be unique');
for(const prior of historical.historical.graphs){
 const current=byGraph.get(prior.smiles);assert.ok(current,'Historical graph removed or changed: '+prior.smiles);
 for(const name of prior.names){assert.ok(current.names.includes(name),'Historical graph alias lost: '+name);assert.equal(current.librarySmiles[name],prior.librarySmiles[name],'Historical library graph witness changed: '+name);}
 for(const id of prior.recordIds)assert.ok(current.recordIds.includes(id),'Historical source-record link lost: '+id);
}
function relationSignature(pair,graphs){
 assert.ok(Number.isInteger(pair.a)&&Number.isInteger(pair.b)&&pair.a!==pair.b,'Distinct valid graph indices required');
 assert.ok(graphs[pair.a]&&graphs[pair.b],'Relation graph index is out of bounds');
 for(const field of ['core','variableA','variableB'])assert.equal(typeof pair[field],'string','Missing fragment identity: '+field);
 const sides=[[graphs[pair.a].smiles,pair.variableA],[graphs[pair.b].smiles,pair.variableB]].sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
 return digest([pair.core,...sides]);
}
const priorGraphs=new Set(historical.historical.graphs.map(g=>g.smiles));
const currentSignatures=d.pairs.map(p=>relationSignature(p,d.graphs));
assert.equal(new Set(currentSignatures).size,currentSignatures.length,'Duplicate structural matched-pair relations');
const retained=d.pairs.filter(p=>priorGraphs.has(d.graphs[p.a].smiles)&&priorGraphs.has(d.graphs[p.b].smiles)).map(p=>relationSignature(p,d.graphs)).sort();
assert.deepEqual(retained,historical.historical.relationSignatures,'The published historical graph subset must retain exactly its structural relations');
// Check that signatures survive reindexing/orientation changes but distinguish a
// different variable fragment. This is independent of the production builder.
const probe=d.pairs[0],reversed=d.graphs.slice().reverse(),flipped={...probe,a:d.graphs.length-1-probe.b,b:d.graphs.length-1-probe.a,variableA:probe.variableB,variableB:probe.variableA};
assert.equal(relationSignature(probe,d.graphs),relationSignature(flipped,reversed));
assert.notEqual(relationSignature(probe,d.graphs),relationSignature({...probe,variableA:probe.variableA+'[H]'},d.graphs));
const result=pairs.results({family:'Series: 2C / 2C-x phenethylamines',target:'HTR2A',onlyComparable:true,perPage:10000});assert.ok(result.items.length>10);for(const p of result.items)for(const e of p.effects){assert.equal(e.a.relation,'=');assert.equal(e.b.relation,'=');assert.equal(e.a.sourceUrl,e.b.sourceUrl);assert.equal(e.a.assay,e.b.assay);assert.ok(Math.abs(e.deltaP-Math.log10(e.a.value/e.b.value))<1e-10);assert.equal(e.metric,'EC50');}
assert.ok(pairs.results({onlyComparable:false}).total>pairs.results({onlyComparable:true}).total,'Structural relations must not fabricate measurements');assert.ok(!pairs.results({onlyComparable:true,perPage:10000}).items.some(p=>p.effects.some(e=>e.a.relation==='>'||e.b.relation==='>')));
const strict=pairs.results({cliffFold:1000,onlyComparable:true,perPage:10000}).items.flatMap(p=>p.effects).filter(e=>e.cliffCandidate).length,loose=pairs.results({cliffFold:10,onlyComparable:true,perPage:10000}).items.flatMap(p=>p.effects).filter(e=>e.cliffCandidate).length;assert.ok(loose>=strict);assert.throws(()=>pairs.results({cliffFold:0}));
// A graph curated only for measured properties cannot create a pharmacological
// potency comparison, even when its structure participates in matched pairs.
const records=new Map(require('../data/curated-references').CURATED_REFERENCES.records.map(r=>[r.id,r]));
const propertyOnlyNames=new Set(d.graphs.filter(g=>{
 const evidence=g.recordIds.flatMap(id=>{assert.ok(records.has(id),'Unknown current source record: '+id);return records.get(id).evidence;});
 return evidence.some(e=>e.kind==='measured_property')&&evidence.every(e=>['measured_property','identity_reference'].includes(e.kind));
}).flatMap(g=>g.names));
for(const pair of pairs.results({onlyComparable:false,perPage:Math.max(1,d.pairs.length)}).items){
 if(pair.namesA.some(n=>propertyOnlyNames.has(n))||pair.namesB.some(n=>propertyOnlyNames.has(n)))assert.equal(pair.effects.length,0,'Property-only structural relations must not acquire potency effects');
 for(const effect of pair.effects)for(const side of [effect.a,effect.b])assert.ok(['functional_assay','control_comparison'].includes(side.kind),'Only explicit assay measurements can support potency comparisons');
}
console.log('Matched pairs: '+historical.graphCount+' historical graphs / '+historical.relationCount+' historical relations preserved within '+d.graphs.length+' current graphs / '+d.pairs.length+' relations; property/assay separation, H substitutions, compatible exact assays, bounds and cliff thresholds passed');
