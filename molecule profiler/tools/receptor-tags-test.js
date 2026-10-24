'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {LIBRARY:l}=require('../data/library'),{LIBRARY_TAG_METADATA:tags}=require('../data/library-tags'),{LIBRARY_RECEPTOR_METADATA:m}=require('../data/library-receptor-tags'),api=require('../js/library-catalog');
const report=require('../validation/library-receptor-tags.json'),catalog=require('../data/receptor-catalog').RECEPTOR_REFERENCE_CATALOG;
const ctx={tags,receptors:m},hash=p=>crypto.createHash('sha256').update(fs.readFileSync(require('node:path').join(__dirname,'..',p))).digest('hex');
assert.equal(hash('data/library-receptor-tags.js'),report.dataSha256);for(const [p,h]of Object.entries(report.sourceSha256))assert.equal(hash(p),h,p);
assert.equal(m.definitions.length,new Set(m.definitions.map(d=>d.tag)).size);
for(const r of catalog.receptors){assert.ok(m.definitions.some(d=>d.tag==='Binding: '+r.id));for(const a of m.definitions.filter(d=>d.category==='Receptor actions'))assert.ok(m.definitions.some(d=>d.tag==='Receptor action: '+r.id+' · '+a.tag.slice(8)));}
const get=n=>l.find(e=>e.name===n),has=(n,t)=>api.tagsFor(get(n),ctx).includes(t);
assert.ok(has('Dopamine','Receptor action: DRD2 · Agonist'));assert.ok(has('Haloperidol','Receptor action: DRD2 · Antagonist'));assert.ok(has('Caffeine','Receptor action: ADORA2A · Antagonist'));assert.ok(has('Diazepam','Receptor action: GABAA · Positive allosteric modulator (PAM)'));assert.ok(!has('Diazepam','Receptor action: GABAA · Agonist'));
assert.ok(api.catalogQuery(l,{tags:['Receptor action: DRD2 · Agonist']},ctx).rows.some(r=>r.entry.name==='Dopamine'));
assert.ok(api.catalogQuery([get('Dopamine')],{tags:['Receptor: DRD2','Action: Agonist']},ctx).total===1);
assert.equal(api.catalogQuery([get('Dopamine')],{tags:['Receptor action: DRD2 · Antagonist']},ctx).total,0);
assert.equal(api.catalogQuery([get('Dopamine')],{query:'D2R'},ctx).total,1);
assert.ok(api.catalogCsv([get('Dopamine')],{},ctx).includes('Receptor action: DRD2 · Agonist'));
const stale={...get('Dopamine'),smiles:'CC'};assert.deepEqual(api.receptorEvidence(stale,ctx),[]);assert.ok(!api.tagsFor(stale,ctx).some(t=>t.startsWith('Action:')));
const byname=new Map(l.map(e=>[e.name,e]));for(const [name,e]of Object.entries(m.entries)){assert.equal(e.librarySmiles,byname.get(name).smiles);assert.equal(e.tags.length,new Set(e.tags).size);for(const t of e.tags.filter(t=>t.startsWith('Receptor action: '))){const d=m.definitions.find(d=>d.tag===t);assert.ok(e.evidence.some(s=>s.receptorId===d.receptorId&&s.actions.includes(d.action)));}for(const s of e.evidence){assert.ok(['Human','Homo sapiens'].includes(s.species));assert.ok(s.sourceUrl.startsWith('https://'));if(s.provider==='ChEMBL')assert.deepEqual(s.actions,[]);}}
console.log('Receptor tags: all receptor/action definitions, sourced positives, binding/action separation, exact-pair filters, aliases, exports, stale-graph guards and source freshness passed.');
