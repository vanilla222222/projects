'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const {LIBRARY}=require('../data/library'),{LIBRARY_NAME_METADATA:n}=require('../data/library-names'),{LIBRARY_TAG_METADATA:t}=require('../data/library-tags');
const names=require('../validation/library-name-provenance.json'),tags=require('../validation/library-tag-provenance.json');
const api=require('../js/library-catalog'),ctx={names:n,tags:t};
assert.equal(hash('data/library.js'),names.librarySha256);
assert.equal(hash('tools/curate-library-names.py'),names.toolSha256);
assert.equal(hash('data/library-names.js'),names.dataSha256);
assert.equal(hash('data/library-tags.js'),tags.dataSha256);
for(const [file,digest] of Object.entries(tags.sourceSha256))assert.equal(hash(file),digest,'Stale tags: '+file);
assert.equal(Object.keys(t.entries).length,LIBRARY.length);
assert.equal(Object.keys(n.entries).length,names.resolved);
const byName=new Map(LIBRARY.map(e=>[e.name,e]));
for(const [id,record] of Object.entries(n.entries)){
 assert.equal(record.librarySmiles,byName.get(id)?.smiles);assert.ok(record.preferredName.trim());
 assert.ok(record.sourceUrl.startsWith('https://'));assert.ok(!/^CHEMBL\d+$/.test(record.preferredName));
 if(record.matchType)assert.ok(record.nameKind.includes('standardized form'));
}
for(const entry of LIBRARY){
 const record=t.entries[entry.name];assert.equal(record.librarySmiles,entry.smiles);
 assert.ok(record.tags.length>=10);assert.equal(new Set(record.tags).size,record.tags.length);
 assert.equal(api.tagsFor(entry,ctx).length,record.tags.length);
}
const named=LIBRARY.find(e=>n.entries[e.name]);assert.ok(named);
assert.equal(api.catalogQuery([named],{query:named.name},ctx).rows.some(r=>r.entry===named),true);
assert.equal(api.catalogQuery([named],{query:api.displayName(named,ctx)},ctx).total,1);
const tag=api.tagsFor(named,ctx)[0];assert.equal(api.catalogQuery([named],{tag},ctx).total,1);
const aromatic=api.catalogQuery(LIBRARY,{tag:'Aromatic',perPage:100},ctx);
assert.ok(aromatic.total>0);assert.ok(aromatic.rows.every(r=>r.tags.includes('Aromatic')&&!r.tags.includes('Nonaromatic')));
assert.equal(aromatic.total+api.catalogQuery(LIBRARY,{tag:'Nonaromatic'},ctx).total,LIBRARY.length);
assert.equal(api.catalogQuery([named],{tags:[tag,'nonexistent tag']},ctx).total,0);
const stale={...named,smiles:'different graph'};
assert.equal(api.displayName(stale,ctx),named.name);assert.equal(api.nameRecord(stale,ctx),null);
assert.deepEqual(api.tagsFor(stale,ctx),['Label: '+stale.cls]);
const csv=api.catalogCsv([named],{tag},ctx);assert.ok(csv.includes('Reference ID'));assert.ok(csv.includes(named.name));assert.ok(csv.includes('Name form'));
console.log('Library metadata: sourced-name and tag freshness, stable keys, graph guards, tag filtering, aliases and export passed');
