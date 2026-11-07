'use strict';
const assert=require('node:assert/strict');
const {CHEMBL_CALCULATED_PROPERTIES:data}=require('../data/chembl-properties.js');
const {LIBRARY:rawLibrary}=require('../data/library.js');
const references=require('../data/curated-references.js').CURATED_REFERENCES;
const curated=require('../js/curated-references.js');
const LIBRARY=curated.library(rawLibrary,references);
const api=require('../js/chembl-properties.js');
const context=api.create(data);
const crypto=require('node:crypto'),path=require('node:path');
const sha=p=>crypto.createHash('sha256').update(require('node:fs').readFileSync(path.join(__dirname,'..',p))).digest('hex');
const report=require('../validation/chembl-properties.json');
assert.equal(report.dataSha256,sha('data/chembl-properties.js'));
assert.equal(report.toolSha256,sha('tools/build-chembl-properties.py'));
for(const [file,digest]of Object.entries(report.sourceSha256))assert.equal(sha(file),digest,'Stale calculated-property source: '+file);
assert.equal(context.metadata,data);
assert.equal(data.entryCount,LIBRARY.length,'Every effective reference graph gets calculated descriptors');
const annotations=require('../data/receptor-ligand-annotations.js').RECEPTOR_LIGAND_ANNOTATIONS.filter(a=>a.chemblMoleculeId);
assert.equal(data.chemblEntryCount,new Set(annotations.map(a=>a.ligandName)).size);
assert.equal(data.annotationCount,annotations.length);
let matched=0;
for(const entry of LIBRARY){
 const record=context.get(entry);
 assert.ok(Object.hasOwn(data.entries,entry.name),'Missing effective reference '+entry.name);
 matched++;
 assert.equal(record,data.entries[entry.name]);
 assert.equal(record.librarySmiles,entry.smiles);
 assert.equal(context.get({...entry,smiles:entry.smiles+' '}),null,'Exact stored graph guard must reject changed input');
 assert.ok(Object.values(record.calculated).every(Number.isFinite));
}
assert.equal(matched,data.entryCount);
const byRawName=new Map(rawLibrary.map(e=>[e.name,e]));
for(const fix of references.identityCorrections){
 assert.equal(context.get(byRawName.get(fix.name)),null,'Historical uncorrected graph cannot receive corrected descriptors');
 assert.equal(data.entries[fix.name].librarySmiles,fix.after.smiles);
}
for(const entry of references.extraLibrary)assert.equal(context.get(entry).librarySmiles,entry.smiles,'Source overlay reference must have descriptors');
const unannotated=LIBRARY.find(e=>data.entries[e.name].annotationCount===0&&!curated.forEntry(e,references).length);
assert.ok(unannotated,'Exercise a key with no ChEMBL or curated observation');
assert.deepEqual(data.entries[unannotated.name].chemblMoleculeIds,[]);
assert.deepEqual(data.entries[unannotated.name].sourceReleases,[]);
for(const key of ['evidence','tags','actions','measured_property'])assert.equal(data.entries[unannotated.name][key],undefined,'Calculated values must not invent evidence');
for(const entry of [null,undefined,{}, {name:'__proto__',smiles:'CCO'}])assert.equal(context.get(entry),null);
assert.equal(api.create({entries:data.entries,schemaVersion:99,kind:data.kind}).get(LIBRARY[0]),null);
assert.equal(api.create({entries:data.entries,schemaVersion:1,kind:'measured_property'}).get(LIBRARY[0]),null);
// A null explicit dataset may use the browser global. With no such global the
// accessor remains unavailable, rather than inventing a calculation.
const priorGlobal=global.CHEMBL_CALCULATED_PROPERTIES;delete global.CHEMBL_CALCULATED_PROPERTIES;
assert.equal(api.create(null).get(LIBRARY[0]),null);global.CHEMBL_CALCULATED_PROPERTIES=priorGlobal;
const vm=require('node:vm'),fs=require('node:fs');
const browser={};vm.createContext(browser);
vm.runInContext(fs.readFileSync(require.resolve('../data/chembl-properties.js'),'utf8'),browser);
vm.runInContext(fs.readFileSync(require.resolve('../js/chembl-properties.js'),'utf8'),browser);
const entry=LIBRARY.find(e=>Object.hasOwn(data.entries,e.name));
assert.equal(browser.ChEMBLProperties.get(entry).librarySmiles,entry.smiles);
assert.equal(browser.ChEMBLProperties.get({...entry,smiles:'different'}),null);
console.log('Local calculated descriptors: '+matched+' effective graph keys, reviewed replacements, overlays, stale graph guards and browser/CommonJS API verified');
