'use strict';
// Independent source-column checks against the retained upstream bytes. Native
// RDKit identity checks additionally run in tools/freesolv-properties-test.py.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
for(const file of ['smiles','mol','stereo'])Object.assign(global,require('../js/'+file));
const pharmacology=require('../js/pharmacology'),root=path.resolve(__dirname,'..'),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),read=p=>fs.readFileSync(path.join(root,p));
const snapshotPath='validation/sources/freesolv-properties-001.json',bytes=read(snapshotPath),source=JSON.parse(bytes),table=read(source.sourceFile),lines=table.toString().split('\n');
assert.equal(sha(table),source.sourceSha256);assert.equal(crypto.createHash('sha1').update(Buffer.from('blob '+table.length+'\0')).update(table).digest('hex'),source.sourceGitBlob);
for(const [file,hash]of Object.entries(source.sourceFileSha256))assert.equal(sha(read(file)),hash,'Pinned source changed: '+file);
assert.equal(source.sourceRevision,'134cd763f95d54d818fc0618095aa01cbe470fc3');assert.notEqual(source.licenseMetadata.observedAtRevision,source.sourceRevision,'Licensing observation must not be backdated to the data revision');
const library=require('../data/library').LIBRARY,curated=require('../data/curated-references').CURATED_REFERENCES,byName=new Map(library.map(e=>[e.name,e])),mapped=new Set();let defaults=0;
assert.equal(source.selection.length,12);assert.equal(new Set(source.selection.map(s=>s.sourceId)).size,12);
for(const selected of source.selection){
 const record=curated.records.find(r=>r.id.startsWith('property-freesolv-')&&r.evidence.some(e=>e.sourceId===selected.sourceId));assert.ok(record,'Missing curated property row '+selected.sourceId);assert.equal(record.panel,undefined,'Properties cannot create target panels');assert.equal(record.compounds.length,1);assert.equal(record.evidence.length,1);
 const compound=record.compounds[0],e=record.evidence[0],fields=e.sourceRecord.split(';',10).map(s=>s.trim());assert.equal(fields[0],selected.sourceId);assert.equal(e.sourceRecord,lines[e.sourceRow-1]);assert.ok(source.rows.includes(e.sourceRecord));
 assert.equal(e.kind,'measured_property');assert.equal(e.value,Number(fields[3]));assert.equal(e.uncertainty,Number(fields[4]));assert.equal(e.unit,'kcal/mol');assert.equal(e.relation,'=');assert.equal(e.sd,undefined);assert.equal(e.action,undefined);assert.equal(e.receptorId,undefined);assert.equal(e.species,undefined);assert.equal(e.sourceSha256,sha(bytes));assert.equal(e.sourceGitBlob,source.sourceGitBlob);assert.equal(e.sourceTableSha256,sha(table));
 const assigned=fields[9].includes('assigned a default value');if(assigned){defaults++;assert.equal(e.uncertaintyKind,'source-assigned default uncertainty');}else assert.equal(e.uncertaintyKind,'source-reported estimate');
 assert.match(e.conditions.temperature,/Not specified/);assert.match(e.conditions.pH,/Not specified/);assert.equal(compound.smiles,fields[1]);assert.match(compound.identitySource.identifierOrigin,/RDKit-derived/);assert.match(e.originalReference,/^https:\/\/doi\.org\//);assert.ok(fields[7].includes(e.originalReference.slice('https://doi.org/'.length)));
 assert.ok(compound.libraryNames.includes(selected.stableLibraryKey));for(const name of compound.libraryNames){const entry=byName.get(name);assert.ok(entry,'Enrichment cannot add an overlay structure');assert.equal(entry.formula,compound.formula);assert.ok(pharmacology.exactGraph(buildMolecule(parseSmiles(entry.smiles)),buildMolecule(parseSmiles(fields[1]))),'Properties must match the stored graph');mapped.add(name);}
}
assert.equal(defaults,11);assert.ok(mapped.has('Acetone'));assert.ok(mapped.has('methyl methyl ketone'),'Both existing acetone graph aliases must retain evidence');
console.log('FreeSolv sources: 12 upstream rows / '+mapped.size+' existing keys, exact source columns, pinned bytes, explicit uncertainty, missing conditions and no inferred pharmacology passed');
