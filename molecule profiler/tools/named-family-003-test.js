'use strict';
const assert=require('node:assert/strict');
const {CURATED_REFERENCES:d}=require('../data/curated-references'),{LIBRARY}=require('../data/library'),{TARGETS}=require('../data/targets');
const api=require('../js/curated-references'),receptor=require('../js/receptor-catalog'),{RECEPTOR_REFERENCE_CATALOG:catalog}=require('../data/receptor-catalog');
const rows=api.library(LIBRARY,d),byname=new Map(rows.map(e=>[e.name,e])),records=d.records.filter(r=>r.id.startsWith('family-003-'));
assert.equal(records.length,18);assert.ok(d.familyDefinitions.length>=19);
const expected={'Adenine ribonucleosides':6,'Thiazolidinediones':3,'Benzhydrylpiperazines':3,'Dibenzocycloheptene-related cores':3,'Ortho-biphenyltetrazoles':3};
const targets=api.targets(TARGETS,d);
for(const [family,count]of Object.entries(expected)){
 const selected=records.filter(r=>r.familyDefinition===family);assert.equal(selected.length,count);
 assert.ok(d.familyDefinitions.some(f=>f.name===family));assert.ok(d.familyCoverage.find(f=>f.name===family).currentEntries>=count);
 for(const r of selected){const c=r.compounds[0],e=r.evidence[0];assert.equal(c.inchiKey,c.identitySource.sourceLigand.InChIKey);assert.equal(e.sourceRecord['Target Species'],'Human');assert.equal(e.sourceRecord['Target Gene Symbol'],r.panel.gene);
  for(const name of c.libraryNames){assert.ok(api.tags(byname.get(name),d).includes('Family motif: '+family));assert.ok(targets.find(t=>t.gene===r.panel.gene).ligands.includes(name));assert.equal(api.nameRecord(byname.get(name),d).preferredName,c.sourceName);}
 }
}
const annotations=api.annotations([],rows,d).filter(a=>a.curatedReferenceId.startsWith('family-003-'));
assert.equal(annotations.length,19);assert.deepEqual(receptor.validateAnnotations(annotations,catalog.receptors,rows),[]);
assert.ok(annotations.every(a=>a.evidenceType==='source_classification'&&a.value===undefined&&a.metric===undefined));
assert.equal(annotations.filter(a=>a.action==='agonist').length,9);assert.equal(annotations.filter(a=>a.action==='antagonist').length,9);assert.equal(annotations.filter(a=>a.action==='inverse_agonist').length,1);
const inverse=annotations.find(a=>a.action==='inverse_agonist');assert.equal(inverse.receptorId,'HRH1');assert.equal(inverse.classification.sourceRecord.Ligand,'cetirizine');assert.equal(inverse.classification.sourceRecord.Type,'Antagonist');assert.equal(inverse.classification.sourceRecord.Action,'Inverse agonist');
assert.ok(receptor.validateAnnotations([{...inverse,action:'antagonist'}],catalog.receptors,rows).length,'Inverse agonist classification must not collapse into antagonist');
assert.ok(records.filter(r=>r.familyDefinition==='Thiazolidinediones').every(r=>r.panel.family==='Nuclear receptor'&&r.panel.gene==='PPARG'));
const valsartan=records.find(r=>r.compounds[0].sourceName==='valsartan');assert.ok(valsartan.compounds[0].smiles.includes('@'),'Source stereochemistry must be retained');assert.ok(valsartan.compounds[0].correctedLegacyNames.includes('Valsartan'));assert.match(valsartan.note,/stereo\/tautomer/);
assert.ok(api.forEntry(byname.get('Valsartan'),d).includes(valsartan),'Corrected named reference uses the reviewed source form');assert.ok(!api.forEntry(d.identityCorrections.find(f=>f.name==='Valsartan').before,d).includes(valsartan),'Historical unspecified form must not inherit source stereochemistry');
assert.ok(records.filter(r=>r.familyDefinition==='Adenine ribonucleosides').every(r=>r.compounds[0].smiles.includes('@')));
console.log('Family batch 003: five structural families, 18 exact-source human action records, inverse agonism, nuclear receptor mapping and stereo/tautomer boundaries passed');
