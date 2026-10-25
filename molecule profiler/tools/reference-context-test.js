'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),api=require('../js/reference-context'),context=require('./load-reference-context'),{RETRIEVAL_BENCHMARK:b}=require('../data/benchmark');
assert.deepEqual(b.composition,context.manifest);assert.equal(b.library,context.library.length);assert.equal(b.targets,context.targets.length);assert.ok(b.protocol.includes('aliases can remain'));
for(const [p,h]of Object.entries(b.sourceSha256))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',p))).digest('hex'),h,'Stale retrieval source '+p);
const base=api.manifest([{name:'A',smiles:'CCO'}],[{gene:'A',name:'One',ligands:['A']}]);
for(const [lib,targets]of [[[{name:'A',smiles:'CCC'}],[{gene:'A',name:'One',ligands:['A']}]],[ [{name:'A',smiles:'CCO',propertyOnly:true}],[{gene:'A',name:'One',ligands:['A']}]],[ [{name:'A',smiles:'CCO'}],[{gene:'A',name:'One',ligands:[]}]]])assert.notEqual(api.manifest(lib,targets).key,base.key);
for(const f of context.library.filter(e=>e.identityCorrection))assert.equal(f.smiles,f.identityCorrection.after.smiles);
console.log('Benchmark composition: exact composed identities, panel membership, exclusions and source-byte witnesses passed');
