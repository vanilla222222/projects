'use strict';
// Native-free offline audit of primary rows, uncertainty semantics and generated consumers.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),snapshotFile='validation/sources/freesolv-properties-003.json';
const bytes=fs.readFileSync(path.join(root,snapshotFile)),snapshot=JSON.parse(bytes),snapshotSha=crypto.createHash('sha256').update(bytes).digest('hex');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const table=fs.readFileSync(path.join(root,snapshot.sourceFile)),lines=table.toString('utf8').split(/\r?\n/);
assert.equal(hash(table),'2d13f095713bc39b85f85dd7b4e5483fbb12fc694bf253bb1d92a4c4d484f260');
assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+table.length+'\0'),table])).digest('hex'),'6c6dbf5d27e646db5a540288ece636f9c915f363');
for(const [file,blob] of Object.entries(snapshot.sourceFileGitBlobs)){
 const raw=fs.readFileSync(path.join(root,file));assert.equal(hash(raw),snapshot.sourceFileSha256[file]);
 assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+raw.length+'\0'),raw])).digest('hex'),blob);
}
const {LIBRARY:raw}=require('../data/library.js'),{CURATED_REFERENCES:compiled}=require('../data/curated-references.js');
const api=require('../js/curated-references.js'),effective=api.library(raw,compiled);
const files=fs.readdirSync(path.join(root,'data/curated-reference-entries')).filter(n=>/^property-freesolv3-.*\.json$/.test(n));
assert.equal(files.length,100);assert.equal(snapshot.selection.length,100);assert.equal(snapshot.rows.length,100);assert.equal(snapshot.ligands.length,100);
const prior={...compiled,records:compiled.records.filter(r=>!r.id.startsWith('property-freesolv3-'))};
const catalog=require('../js/library-catalog.js'),nameMetadata=require('../data/library-names.js').LIBRARY_NAME_METADATA;
const sourceIds=new Set();let defaults=0,estimates=0,unresolved=0,multiple=0;
for(const file of files){
 const record=JSON.parse(fs.readFileSync(path.join(root,'data/curated-reference-entries',file),'utf8'));
 assert.equal(file,record.id+'.json');assert.equal(record.compounds.length,1);assert.equal(record.evidence.length,1);
 const c=record.compounds[0],e=record.evidence[0],line=lines[e.sourceRow-1],parts=line.split(';');
 const f=[...parts.slice(0,9),parts.slice(9).join(';')].map(v=>v.trim());
 assert.ok(!Object.hasOwn(c,'sourceName'),'Property enrichment must not change preferred names');
 assert.equal(e.sourceRecord,line);assert.equal(e.sourceId,f[0]);assert.ok(!sourceIds.has(e.sourceId));sourceIds.add(e.sourceId);
 assert.ok(snapshot.rows.includes(line));assert.ok(snapshot.selection.some(s=>s.sourceId===e.sourceId&&s.stableLibraryKey===c.name));
 assert.equal(e.value,Number(f[3]));assert.equal(e.uncertainty,Number(f[4]));assert.equal(e.experimentalReference,f[7]);assert.equal(e.context,f[9]);
 assert.equal(e.kind,'measured_property');assert.equal(e.target,'Hydration free energy');assert.equal(e.unit,'kcal/mol');assert.equal(e.relation,'=');
 const defaulted=f[9].toLowerCase().includes('assigned a default value');
 assert.equal(e.uncertaintyKind,defaulted?'source-assigned default uncertainty':'source-reported estimate');
 if(defaulted)defaults++;else estimates++;
 const urls=[...f[7].matchAll(/10\.\d{4,9}\/[^\s,;]+/g)].map(m=>'https://doi.org/'+m[0]);
 assert.deepEqual(e.originalReferences,urls);
 if(urls.length){assert.equal(e.originalReference,urls[0]);if(urls.length>1)multiple++;}
 else {assert.equal(f[7],'SAMPL4_Guthrie');assert.ok(!Object.hasOwn(e,'originalReference'));assert.match(e.referenceStatus,/Unresolved/);unresolved++;}
 assert.equal(e.sourceFile,snapshotFile);assert.equal(e.sourceSha256,snapshotSha);assert.equal(e.sourceTableSha256,hash(table));
 assert.equal(c.identitySource.sourceFile,snapshotFile);assert.equal(c.identitySource.sourceSha256,snapshotSha);
 const identity=c.identitySource.sourceRecord;assert.ok(snapshot.ligands.some(l=>JSON.stringify(l)===JSON.stringify(identity)));
 assert.equal(identity.sourceId,e.sourceId);assert.equal(identity.rawRow,line);assert.equal(identity.sourceSMILES,f[1]);assert.equal(identity.smiles,c.smiles);assert.equal(identity.formula,c.formula);assert.equal(identity.inchiKey,c.inchiKey);
 assert.match(identity.identifierOrigin,/RDKit-derived/);assert.match(e.conditions.temperature,/Not specified/);assert.match(e.conditions.pH,/Not specified/);
 assert.equal(c.identitySource.licenseMetadata.observedAtRevision,'6c7d19b4b565537365ffd22006aa2cd4643200c6');
 for(const field of ['sd','standardDeviation','panel','action'])assert.ok(!Object.hasOwn(e,field));
 const stored=raw.find(x=>x.name===c.name),entry=effective.find(x=>x.name===c.name);assert.ok(stored&&entry,'Enrichment must reuse an existing graph key');
 assert.equal(stored.formula,c.formula);assert.equal(entry.formula,c.formula);
 assert.deepEqual(api.nameRecord(entry,compiled),api.nameRecord(entry,prior),'Preferred name must survive enrichment');
 global.CURATED_REFERENCES=compiled;const afterName=catalog.displayName(entry,{names:nameMetadata});
 global.CURATED_REFERENCES=prior;const beforeName=catalog.displayName(entry,{names:nameMetadata});global.CURATED_REFERENCES=compiled;
 assert.equal(afterName,beforeName,'Display name must survive enrichment');
 const generated=compiled.records.find(r=>r.id===record.id);assert.ok(generated,'Rebuild curated references for '+record.id);
 assert.equal(generated.evidence[0].value,e.value);assert.equal(generated.evidence[0].uncertainty,e.uncertainty);
 assert.ok(generated.compounds[0].libraryNames.includes(c.name));assert.ok(api.forEntry(entry,compiled).some(r=>r.id===record.id));
 assert.ok(!api.forEntry({...entry,smiles:entry.smiles+' '},compiled).some(r=>r.id===record.id),'Changed graph must not inherit measured evidence');
}
assert.deepEqual([defaults,estimates,unresolved,multiple],[95,5,10,0]);
for(const file of fs.readdirSync(path.join(root,'data/curated-reference-entries')).filter(n=>n.endsWith('.json')&&!n.startsWith('property-freesolv3-'))){
 const text=fs.readFileSync(path.join(root,'data/curated-reference-entries',file),'utf8'),record=JSON.parse(text);
 if(record.evidence.some(e=>e.kind==='measured_property'))for(const id of text.match(/mobley_\d+/g)||[])assert.ok(!sourceIds.has(id),'Do not duplicate prior measured source '+id);
}
console.log('FreeSolv batch three: 100 primary-row measurements, exact source witnesses, varied uncertainty and generated evidence guards verified');
