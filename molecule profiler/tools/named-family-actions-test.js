'use strict';
const assert=require('node:assert/strict');
const {CURATED_REFERENCES:d}=require('../data/curated-references'),{LIBRARY}=require('../data/library'),{TARGETS}=require('../data/targets');
const api=require('../js/curated-references'),receptors=require('../js/receptor-catalog'),{RECEPTOR_REFERENCE_CATALOG:catalog}=require('../data/receptor-catalog');
const rows=api.library(LIBRARY,d),records=d.records.filter(r=>r.id.startsWith('family-002-')),byname=new Map(rows.map(e=>[e.name,e]));
assert.equal(records.length,19);assert.equal(d.familyDefinitions.length,14);
const expected={'Aryloxypropanolamines':4,'Imidazolines':4,'Tetrahydrobenzazepines':3,'Phenothiazines':4,'Aminobutyrophenones':4};
const targets=api.targets(TARGETS,d);
for(const [family,count] of Object.entries(expected)){
 const selected=records.filter(r=>r.familyDefinition===family);assert.equal(selected.length,count);
 assert.ok(d.familyDefinitions.some(x=>x.name===family));assert.ok(d.familyCoverage.find(x=>x.name===family).currentEntries>=count);
 for(const r of selected){const c=r.compounds[0],e=r.evidence[0];assert.equal(e.kind,'source_classification');assert.equal(e.sourceRecord['Target Species'],'Human');assert.equal(e.sourceRecord['Target Gene Symbol'],r.panel.gene);assert.equal(c.inchiKey,c.identitySource.sourceLigand.InChIKey);
  for(const name of c.libraryNames){const entry=byname.get(name);assert.ok(api.tags(entry,d).includes('Family motif: '+family));assert.ok(api.tags(entry,d).includes('Evidence: Curated action classification'));assert.ok(targets.find(t=>t.gene===r.panel.gene).ligands.includes(name));assert.equal(api.nameRecord(entry,d).preferredName,c.sourceName);}
 }
}
const annotations=api.annotations([],rows,d).filter(a=>a.curatedReferenceId.startsWith('family-002-'));
assert.equal(annotations.length,19);assert.deepEqual(receptors.validateAnnotations(annotations,catalog.receptors,rows),[]);
assert.ok(annotations.every(a=>a.evidenceType==='source_classification'&&!a.value&&!a.metric),'Database action classifications must not become new assay measurements');
assert.deepEqual(annotations.reduce((n,a)=>(n[a.action]=(n[a.action]||0)+1,n),{}),{partial_agonist:3,antagonist:13,agonist:3});
const fixture=annotations.find(a=>a.action==='partial_agonist');
for(const bad of [
 {...fixture,action:'antagonist'},
 {...fixture,species:'Rattus norvegicus'},
 {...fixture,receptorId:'ADRB2'},
 {...fixture,sourceUrl:'https://www.guidetopharmacology.org/GRAC/LigandDisplayForward?ligandId=999999'},
 {...fixture,classification:{...fixture.classification,sourceSnapshotSha256:'missing'}},
 {...fixture,classification:{...fixture.classification,sourceRecord:{...fixture.classification.sourceRecord,'Target Species':'Rat'}}},
 {...fixture,evidenceType:'binding'}
])assert.ok(receptors.validateAnnotations([bad],catalog.receptors,rows).length,'Invalid source classification must be rejected');
const propranolol=records.find(r=>r.compounds[0].sourceName==='propranolol');assert.equal(propranolol.panel.gene,'ADRB2');assert.equal(propranolol.evidence[0].action,'antagonist');
const promethazine=records.find(r=>r.compounds[0].sourceName==='promethazine');assert.equal(promethazine.panel.gene,'HRH1','Phenothiazine membership alone must not assign DRD2');
const stale=rows.map(e=>e.name===fixture.ligandName?{...e,smiles:'stale'}:e);assert.ok(!api.annotations([],stale,d).some(a=>a.curatedReferenceId===fixture.curatedReferenceId),'Changed graph must lose its action witness');
const {RECEPTOR_LIGAND_ANNOTATIONS:base}=require('../data/receptor-ligand-annotations');
const before=receptors.coverageReport(catalog.receptors,targets,rows,base),after=receptors.coverageReport(catalog.receptors,targets,rows,base.concat(annotations));
assert.deepEqual(after.rows.map(r=>[r.id,r.sourcedProfiles]),before.rows.map(r=>[r.id,r.sourcedProfiles]),'Curated classifications must not inflate the historical binding-profile quota');
const conflicts=records.filter(r=>r.compounds[0].legacyNamesakeGraphConflicts?.length);assert.equal(conflicts.length,3);
for(const r of conflicts)for(const name of r.compounds[0].legacyNamesakeGraphConflicts){assert.ok(!api.forEntry(byname.get(name),d).includes(r),'Legacy namesake must not inherit source pharmacology');assert.ok(api.tags(byname.get(name),d).includes('Evidence: Identity conflict'),'Namesake conflict must be visible in the inspector');}
console.log('New named families: five graph-defined families, 19 exact-source human action classifications, provenance guards, conflicting-action/species rejection and no inferred assay values passed');
