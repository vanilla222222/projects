'use strict';
const assert=require('node:assert/strict');
const api=require('../js/library-catalog');
const rows=require('../data/library').LIBRARY;
const added=rows.filter(r=>r.source?.provider==='ChEBI'&&r.source?.batch==='002');
assert.equal(added.length,5000);
assert.ok(api.catalogQuery(rows,{group:'chebi'}).total>=added.length);
for(const entry of [added[0],added[1234],added.at(-1)]){
 assert.equal(api.sourceRecord(entry),entry.source);
 for(const query of [entry.name,'CHEBI:'+entry.source.id,entry.source.inchiKey]){
  const result=api.catalogQuery(rows,{group:'chebi',query,perPage:100});
  assert.ok(result.rows.some(r=>r.entry===entry),query);
 }
 assert.equal(api.sourceRecord({...entry,smiles:'changed'}),null);
 assert.equal(api.sourceRecord({...entry,source:{...entry.source,url:'https://example.test/'}}),null);
 assert.ok(api.catalogCsv([entry],{}).includes(entry.source.url));
}
assert.equal(api.catalogSummary(rows).groups.chebi,rows.filter(r=>r.source?.provider==='ChEBI').length);
console.log('ChEBI batch 002 catalogue: 5000 entries, name/source-ID/InChIKey lookup, collection counts, graph-bound source attribution and CSV passed.');
