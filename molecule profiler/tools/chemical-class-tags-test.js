'use strict';
// Consumer assertions for generated structural tags; native RDKit fixtures live in the Python test.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {LIBRARY}=require('../data/library.js');
const {LIBRARY_TAG_METADATA:metadata}=require('../data/library-tags.js');
const {CHEMBL_CALCULATED_PROPERTIES:chembl}=require('../data/chembl-properties.js');
const catalog=require('../js/library-catalog.js');
const root=path.join(__dirname,'..'),library=new Map(LIBRARY.map(e=>[e.name,e]));
const names=['Quinuclidine scaffolds','1,4-Dihydropyridine scaffolds','Diphenylmethane scaffolds','Tetralin scaffolds','2,3-Dihydrobenzofuran scaffolds','Tetrahydroisoquinoline scaffolds','Chromane scaffolds'];
const report=require('../validation/library-tag-provenance.json');
for(const [file,hash] of Object.entries(report.sourceSha256))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),hash,'Stale tag source: '+file);
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'data/library-tags.js'))).digest('hex'),report.dataSha256);
assert.equal(report.entries,LIBRARY.length);
const definitions=require('../data/family-definitions.json').definitions;
const allDefinitions=[...metadata.familyDefinitions,...definitions];
for(const name of names){
 const tag='Family motif: '+name;
 assert.equal(allDefinitions.filter(d=>d.tag===tag).length,1,'Do not duplicate structural definitions: '+name);
 const definition=metadata.familyDefinitions.find(d=>d.tag===tag);
 assert.ok(definition&&definition.smarts);
 let libraryCount=0,chemblCount=0;
 for(const entry of LIBRARY){
  const stored=metadata.entries[entry.name];
  assert.ok(stored&&stored.librarySmiles===entry.smiles,'Tag record must use current exact stored graph');
  if(stored.tags.includes(tag)){
   libraryCount++;
   if((chembl.entries[entry.name]?.chemblMoleculeIds||[]).length)chemblCount++;
  }
 }
 assert.ok(libraryCount>0&&chemblCount>0,'Motif must reach existing library and ChEMBL-linked keys');
 console.log(name+': '+libraryCount+' library / '+chemblCount+' ChEMBL-linked keys (current graphs)');
}
const cases=[
 ['quinuclidine','Quinuclidine scaffolds',true],['Solifenacin','Quinuclidine scaffolds',true],['Atropine','Quinuclidine scaffolds',false],['Nicotine','Quinuclidine scaffolds',false],
 ['Nifedipine','1,4-Dihydropyridine scaffolds',true],['Amlodipine','1,4-Dihydropyridine scaffolds',true],['levamlodipine','1,4-Dihydropyridine scaffolds',true],['Pyridine','1,4-Dihydropyridine scaffolds',false],['piperidine','1,4-Dihydropyridine scaffolds',false],
 ['Diphenhydramine','Diphenylmethane scaffolds',true],['Benzophenone','Diphenylmethane scaffolds',false],['Biphenyl','Diphenylmethane scaffolds',false],['Bibenzyl','Diphenylmethane scaffolds',false],
 ['tetralin','Tetralin scaffolds',true],['chromane','Tetralin scaffolds',false],
 ['Morphine','2,3-Dihydrobenzofuran scaffolds',true],['chromane','2,3-Dihydrobenzofuran scaffolds',false],
 ['7,8-dichloro-1,2,3,4-tetrahydroisoquinoline','Tetrahydroisoquinoline scaffolds',true],['Papaverine','Tetrahydroisoquinoline scaffolds',false],
 ['chromane','Chromane scaffolds',true],['dronabinol','Chromane scaffolds',true],['tetralin','Chromane scaffolds',false]
];
for(const [name,family,expected] of cases){
 const entry=library.get(name);assert.ok(entry,'Missing structural anchor '+name);
 const tag='Family motif: '+family;
 assert.equal(catalog.tagsFor(entry,{tags:metadata}).includes(tag),expected,name+' / '+family);
 if(expected)assert.equal(catalog.tagsFor({...entry,smiles:entry.smiles+' '},{tags:metadata}).includes(tag),false,'Stale graph must not inherit structural tags');
}
console.log('Structural motifs: generated consumers, exact graphs, named boundaries and source freshness verified');
