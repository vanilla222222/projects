'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const {CURATED_REFERENCES:data}=require('../data/curated-references'),report=require('../validation/curated-references.json');
global.CURATED_REFERENCES=data;
for(const f of ['smiles','mol','smarts','stereo'])Object.assign(global,require('../js/'+f));
global.Pharmacology=require('../js/pharmacology');
const api=require('../js/curated-references'),{LIBRARY}=require('../data/library'),{TARGETS}=require('../data/targets');
assert.equal(hash('data/curated-references.js'),report.dataSha256);
assert.equal(hash('data/library.js'),report.librarySha256);
assert.equal(hash('tools/build-curated-references.py'),report.toolSha256);
const files=fs.readdirSync(path.join(root,'data/curated-reference-entries')).filter(f=>f.endsWith('.json')).sort();
assert.deepEqual(files.map(f=>'data/curated-reference-entries/'+f),Object.keys(report.inputSha256).sort());
for(const [f,h] of Object.entries(report.inputSha256))assert.equal(hash(f),h,'Stale entry '+f);
assert.equal(data.records.length,report.records);
const merged=api.library(LIBRARY),byname=new Map(merged.map(e=>[e.name,e]));
assert.equal(merged.length,LIBRARY.length+data.extraLibrary.length);
assert.equal(new Set(merged.map(e=>e.name)).size,merged.length);
for(const r of data.records){
 for(const c of r.compounds){
  const mol=buildMolecule(parseSmiles(c.smiles));assert.equal(molecularFormula(mol),c.formula);
  assert.ok(api.matches(mol).some(x=>x.id===r.id),'Source graph must match '+r.id);
  for(const name of c.libraryNames){const entry=byname.get(name);assert.ok(entry);assert.ok(api.forEntry(entry).some(x=>x.id===r.id));assert.ok(api.tags(entry).length);assert.deepEqual(api.forEntry({...entry,smiles:'stale'}),[]);}
 }
 for(const e of r.evidence){assert.ok(e.sourceUrl.startsWith('https://'));assert.ok(e.endpoint||e.context);if(e.sourceFile)assert.equal(hash(e.sourceFile),e.sourceSha256);}
}
const changed=api.targets(TARGETS);assert.equal(JSON.stringify(TARGETS),JSON.stringify(require('../data/targets').TARGETS));
for(const r of data.records.filter(r=>r.panel)){const t=changed.find(t=>t.gene===r.panel.gene);for(const c of r.compounds)for(const n of c.libraryNames)assert.ok(t.ligands.includes(n));}
// Exact stereo/isotope/charge boundaries: a close neighbour gets no evidence.
const fixture={records:[{id:'stereo',compounds:[{smiles:'N[C@H](C)C(=O)O'}]}]};
assert.equal(api.matches(buildMolecule(parseSmiles('N[C@@H](C)C(=O)O')),fixture).length,0);
assert.equal(api.matches(buildMolecule(parseSmiles('NC(C)C(=O)O')),fixture).length,0);
const tags= require('../js/library-catalog').tagsFor;
for(const r of data.records)for(const c of r.compounds)for(const name of c.libraryNames)assert.ok(tags(byname.get(name)).includes('Curated collection: '+r.collections[0]));
console.log('Curated references:',data.records.length,'entries;',data.extraLibrary.length,'additional structures; source hashes, graph guards, browser formulas and target integration passed');
