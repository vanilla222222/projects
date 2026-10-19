'use strict';
const assert=require('node:assert/strict');
const batch=require('../validation/chembl-receptor-binding-batch.json');
const {LIBRARY}=require('../data/library.js'),{TARGETS}=require('../data/targets.js');
const {RECEPTOR_LIGAND_ANNOTATIONS:annotations,RECEPTOR_BINDING_SOURCE:source}=require('../data/receptor-ligand-annotations.js');
const api=require('../js/receptor-catalog.js');
const {RECEPTOR_REFERENCE_CATALOG:catalog}=require('../data/receptor-catalog.js');
for(const file of ['smiles','mol'])Object.assign(global,require('../js/'+file+'.js'));
assert.equal(batch.applied,true);assert.equal(batch.goal,50);
assert.equal(source.release,batch.sourceDatabase.chembl_db_version);
assert.equal(source.licenseUrl,'https://creativecommons.org/licenses/by-sa/3.0/');
const library=new Map(LIBRARY.map(e=>[e.name,e]));let selected=0;
for(const panel of batch.panels){
 assert.equal(panel.targetComponent.accession,panel.accession);
 assert.ok(panel.targetComponent.target_component_synonyms.some(s=>s.syn_type==='GENE_SYMBOL'&&s.component_synonym===panel.gene));
 const target=TARGETS.find(t=>t.gene===panel.gene),profiles=new Set();
 for(const record of panel.selected){
  const a=record.activity,assay=record.assay,entry=library.get(record.entry.name);
  assert.equal(a.target_chembl_id,panel.chemblTargetId);assert.equal(a.target_organism,'Homo sapiens');
  assert.ok(['Ki','Kd'].includes(a.standard_type));assert.equal(a.assay_type,'B');
  assert.equal(a.standard_relation,'=');assert.equal(a.standard_units,'nM');
  assert.ok(Number(a.standard_value)>0&&Number(a.standard_value)<=1000);
  assert.equal(a.src_id,1);assert.equal(a.potential_duplicate,0);assert.ok(!a.data_validity_comment&&!a.assay_variant_mutation&&!a.assay_variant_accession);
  assert.equal(assay.confidence_score,9);assert.equal(assay.relationship_type,'D');
  assert.equal(assay.target_chembl_id,panel.chemblTargetId);assert.equal(assay.assay_organism,'Homo sapiens');assert.equal(assay.assay_type,'B');assert.ok(!assay.variant_sequence);
  assert.ok(!/unknown origin/i.test(assay.description));assert.ok(!('ligand_efficiency' in a));
  assert.ok(entry&&target.ligands.includes(entry.name));assert.equal(entry.smiles,record.entry.smiles);assert.equal(entry.formula,record.entry.formula);
  assert.equal(molecularFormula(buildMolecule(parseSmiles(entry.smiles))),entry.formula);
  const annotation=annotations.find(x=>x.receptorId===panel.gene&&x.identityKey===record.identityKey&&x.curationSource==='chembl-human-binding-v1');
  assert.ok(annotation);assert.equal(annotation.activityId,a.activity_id);assert.equal(annotation.ligandName,entry.name);
  assert.equal(annotation.librarySmiles,entry.smiles);assert.equal(annotation.action,'binding_only');assert.equal(annotation.evidenceType,'binding');
  assert.equal(annotation.assayId,a.assay_chembl_id);assert.equal(annotation.documentId,a.document_chembl_id);
  assert.ok(!profiles.has(record.identityKey),'Duplicate counted profile within '+panel.gene);profiles.add(record.identityKey);selected++;
 }
 assert.equal(profiles.size,panel.count);assert.equal(panel.remaining,Math.max(0,50-panel.count));
}
const report=api.coverageReport(catalog.receptors,TARGETS,LIBRARY,annotations);
for(const panel of batch.panels)assert.equal(report.rows.find(r=>r.id===panel.gene).sourcedProfiles,panel.count);
assert.equal(report.annotationIssues,0);
console.log('ChEMBL binding snapshot: '+selected+' source-linked associations, direct human assay identity, strict endpoints, unique profiles, current structures and coverage verified');
