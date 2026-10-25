'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {CURATED_REFERENCES:d}=require('../data/curated-references'),report=require('../validation/curated-references.json');
const api=require('../js/curated-references'),{LIBRARY}=require('../data/library'),{TARGETS}=require('../data/targets');
const records=d.records.filter(r=>r.id.startsWith('2c-study-')),byname=new Map(api.library(LIBRARY,d).map(e=>[e.name,e]));
assert.equal(records.length,30);assert.equal(records.flatMap(r=>r.evidence).length,32);
assert.deepEqual(d.studyCoverage.map(s=>[s.cohort,s.reviewed,s.expected,s.missing]),[['2c-alkoxy',7,7,[]],['2c-core',11,11,[]],['2c-thio',14,14,[]]]);
for(const [p,h] of Object.entries(report.studySourceSha256))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',p))).digest('hex'),h,'Stale study source');
const target=api.targets(TARGETS,d).find(t=>t.gene==='HTR2A');
const annotations=api.annotations([],Array.from(byname.values()),d).filter(a=>a.curatedReferenceId.startsWith('2c-study-'));
assert.equal(annotations.length,32);
for(const r of records){
 assert.equal(r.compounds.length,1);const c=r.compounds[0];
 assert.match(c.identitySource.identifierOrigin,/RDKit-derived/,'Figure-derived identifiers must be disclosed');
 for(const name of c.libraryNames){assert.ok(target.ligands.includes(name));assert.ok(api.tags(byname.get(name),d).includes('Action: Partial agonist'));assert.ok(!api.tags({...byname.get(name),smiles:'stale'},d).length);}
 for(const e of r.evidence){
  assert.equal(e.action,'partial_agonist');assert.equal(e.species,'Homo sapiens');assert.equal(e.hostSpecies,'Mus musculus');assert.equal(e.receptorId,'HTR2A');
  assert.equal(e.value,e.originalValue*(e.originalUnit==='µM'?1000:1));assert.equal(e.sd,e.originalSd*(e.originalUnit==='µM'?1000:1));
  assert.equal(e.efficacy.value,e.sourceRecord.emaxPercent);assert.equal(e.efficacy.sd,e.sourceRecord.emaxSd);assert.match(e.testedForm,/Hydrochloride/);assert.ok(e.endpoint.includes('SD'));
 }
}
const get=name=>records.find(r=>r.compounds[0].sourceName===name);
assert.equal(get('2C-B').compounds[0].inchiKey,'YMHOBZXQZVXHBM-UHFFFAOYSA-N','Independent pinned IUPHAR identity for 2C-B');
assert.equal(get('2C-B').evidence[0].value,80);assert.equal(get('2C-B').evidence[0].efficacy.value,45);
assert.equal(get('2C-H').evidence[0].value,9400,'Weak measured activation must retain micromolar-to-nanomolar scaling');
assert.equal(get('2C-T-31').evidence[0].efficacy.value,2.8,'Very low efficacy must not become full agonism');
assert.deepEqual(get('2C-T-4').evidence.map(e=>e.value),[220,5.5],'Separate studies must remain separate observations');
assert.deepEqual(get('2C-T-1').compounds[0].libraryNames,['2C-T'],'Source alias must reuse existing graph');
assert.ok(get('2C-T-33').compounds[0].formula.includes('O3'),'Meta-methoxybenzyl source identity must not become a fluorinated analogue');
assert.equal(get('2C-O-3').evidence[0].value,.5,'Use the table value rather than the inconsistent prose range');
const receptorApi=require('../js/receptor-catalog'),{RECEPTOR_REFERENCE_CATALOG:catalog}=require('../data/receptor-catalog');
assert.deepEqual(receptorApi.validateAnnotations(annotations,catalog.receptors,Array.from(byname.values())),[]);
assert.ok(annotations.every(a=>a.efficacy&&a.uncertaintyKind==='SD'&&a.metric==='EC50'));
console.log('2C references: 30 identities, 32 measured observations, complete 11/14/7 study cohorts, partial actions, receptor/host species and original units passed');
