'use strict';
const assert=require('node:assert/strict');
const {CHEMBL_CALCULATED_PROPERTIES:data}=require('../data/chembl-properties.js');
const {LIBRARY}=require('../data/library.js');
const api=require('../js/chembl-properties.js');
const context=api.create(data);
const crypto=require('node:crypto'),path=require('node:path');
const sha=p=>crypto.createHash('sha256').update(require('node:fs').readFileSync(path.join(__dirname,'..',p))).digest('hex');
const report=require('../validation/chembl-properties.json');
assert.equal(report.dataSha256,sha('data/chembl-properties.js'));
assert.equal(report.toolSha256,sha('tools/build-chembl-properties.py'));
for(const [file,digest]of Object.entries(report.sourceSha256))assert.equal(sha(file),digest,'Stale calculated-property source: '+file);
assert.equal(context.metadata,data);
assert.ok(data.entryCount>30);
let matched=0;
for(const entry of LIBRARY){
 const record=context.get(entry);
 if(!Object.hasOwn(data.entries,entry.name)){assert.equal(record,null);continue;}
 matched++;
 assert.equal(record,data.entries[entry.name]);
 assert.equal(record.librarySmiles,entry.smiles);
 assert.equal(context.get({...entry,smiles:entry.smiles+' '}),null,'Exact stored graph guard must reject changed input');
 assert.ok(Object.values(record.calculated).every(Number.isFinite));
}
assert.equal(matched,data.entryCount);
for(const entry of [null,undefined,{}, {name:'__proto__',smiles:'CCO'}])assert.equal(context.get(entry),null);
assert.equal(api.create({entries:data.entries,schemaVersion:99,kind:data.kind}).get(LIBRARY[0]),null);
assert.equal(api.create({entries:data.entries,schemaVersion:1,kind:'measured_property'}).get(LIBRARY[0]),null);
assert.equal(api.create(null).get(LIBRARY[0]),null);
const vm=require('node:vm'),fs=require('node:fs');
const browser={};vm.createContext(browser);
vm.runInContext(fs.readFileSync(require.resolve('../data/chembl-properties.js'),'utf8'),browser);
vm.runInContext(fs.readFileSync(require.resolve('../js/chembl-properties.js'),'utf8'),browser);
const entry=LIBRARY.find(e=>Object.hasOwn(data.entries,e.name));
assert.equal(browser.ChEMBLProperties.get(entry).librarySmiles,entry.smiles);
assert.equal(browser.ChEMBLProperties.get({...entry,smiles:'different'}),null);
console.log('Local ChEMBL-linked calculated descriptors: '+matched+' exact graph keys, stale graph guards and browser/CommonJS API verified');
