'use strict';
const assert=require('node:assert/strict');global.indexedDB=require(process.env.PROFILER_FAKE_IDB_PATH||'fake-indexeddb').indexedDB;const b=require('../js/project-notebooks.js');
(async()=>{
 const original={inputSmiles:'CCO',scenarios:{pka:9}},r=b.capture({name:'Ethanol',smiles:'CCO'},original,{title:'Project',notes:'<script>no execution</script>',selected:[{name:'Design',smiles:'CCOC'}],versions:{app:'v1'}});original.scenarios.pka=1;assert.equal(r.snapshot.scenarios.pka,9,'Snapshot is immutable by copy');
 const p=await b.save(r);assert.equal(p.revisions.length,1);await Promise.all([b.save({...r,notes:'Second'},p.id),b.save({...r,notes:'Third'},p.id)]);let saved=(await b.list())[0];assert.equal(saved.revisions.length,3,'Concurrent saves append atomically instead of losing history');assert.equal(saved.revisions[0].notes,'<script>no execution</script>');
 const imported=await b.importProject(b.exportProject(saved));assert.notEqual(imported.id,saved.id);assert.equal((await b.list()).length,2,'Import cannot replace an existing project');
 await b.archive(p.id);assert.ok((await b.list()).find(x=>x.id===p.id).archived);await b.archive(p.id,false);assert.equal((await b.list()).find(x=>x.id===p.id).archived,false);
 await assert.rejects(b.importProject('{"format":"wrong","revisions":[]}'));assert.throws(()=>b.capture({smiles:'CC'},null));assert.throws(()=>b.capture({smiles:'CC'},{x:'x'.repeat(6*1024*1024)}),/5 MB/);
 for(let i=0;i<7;i++)await b.save(r,p.id);await assert.rejects(b.save(r,p.id),/Ten revisions/);saved=(await b.list()).find(x=>x.id===p.id);assert.equal(saved.revisions.length,10,'A full notebook is retained, never silently truncated');
 assert.equal(b.capture({smiles:'CC'}, {}, {selected:Array.from({length:100},()=>({smiles:'CCO'}))}).selectedDesigns.length,100);assert.throws(()=>b.capture({smiles:'CC'}, {}, {selected:Array.from({length:101},()=>({smiles:'CCO'}))}),/at most 100/);
 await b.close();console.log('Project notebooks: snapshot copies, atomic revisions, safe import, archive/restore, quotas and retained history passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
