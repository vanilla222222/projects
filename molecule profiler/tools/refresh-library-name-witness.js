'use strict';
// Refresh the library witness only for an append-only extension that introduces
// no new CHEMBL-ID naming candidates. Existing name evidence is not reinterpreted.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ref=process.argv[2];
if(!ref||!/^[0-9a-f]{40}$/.test(ref))throw Error('Pass the full commit holding the previously audited library');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const prior=cp.execFileSync('git',['show',ref+':molecule profiler/data/library.js'],{cwd:root,maxBuffer:20*1024*1024});
const reportPath=path.join(root,'validation/library-name-provenance.json'),report=JSON.parse(fs.readFileSync(reportPath));
assert.equal(hash(prior),report.libraryExtensionWitness?.previousLibrarySha256||report.librarySha256,'Base commit must match the previous audited library exactly');
assert.equal(hash(fs.readFileSync(path.join(root,'data/library-names.js'))),report.dataSha256,'Name evidence changed; run the full name-curation pipeline');
const ctx={module:{exports:{}}};vm.runInNewContext(prior.toString(),ctx);
const before=JSON.parse(JSON.stringify(ctx.module.exports.LIBRARY)),{LIBRARY:after}=require('../data/library'),byName=new Map(after.map(e=>[e.name,e]));
for(const entry of before)assert.deepEqual(byName.get(entry.name),entry,'Existing source entry changed: '+entry.name);
const oldNames=new Set(before.map(e=>e.name)),added=after.filter(e=>!oldNames.has(e.name));
assert.ok(added.length>0);assert.equal(after.length,before.length+added.length);
assert.ok(added.every(e=>!/^CHEMBL\d+$/.test(e.name)),'New identifier entries require the full name-curation pipeline');
report.librarySha256=hash(fs.readFileSync(path.join(root,'data/library.js')));
report.libraryExtensionWitness={baseCommit:ref,previousLibrarySha256:hash(prior),unchangedEntries:before.length,addedNames:added.map(e=>e.name),refreshToolSha256:hash(fs.readFileSync(__filename))};
fs.writeFileSync(reportPath,JSON.stringify(report,null,1)+'\n');
console.log('Name evidence preserved: all '+before.length+' prior entries unchanged; '+added.length+' named additions introduce no new naming candidates');
