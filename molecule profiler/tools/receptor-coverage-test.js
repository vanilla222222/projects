'use strict';
const assert=require('node:assert/strict'),api=require('../js/receptor-catalog.js');
const receptor={id:'TEST',name:'Test receptor',family:'Test'};
const targets=[{gene:'TEST',ligands:['A','Alias','Stale','Unknown','Property']}];
const library=[{name:'A',smiles:'CCO'},{name:'Alias',smiles:'OCC'},{name:'Stale',smiles:'CCCO'},
 {name:'Property',smiles:'CCCC',propertyOnly:true}];
const annotation=(name,smiles,key='a'.repeat(64))=>({receptorId:'TEST',ligandName:name,identityKey:key,librarySmiles:smiles,
 action:'binding_only',evidenceType:'binding',sourceUrl:'https://example.org/assay/1',species:'Homo sapiens',assay:'Binding assay',endpoint:'Ki = 1 nM'});
const annotations=[annotation('A','CCO'),annotation('Alias','OCC'),annotation('Stale','different','b'.repeat(64)),annotation('Property','CCCC','c'.repeat(64))];
const c=api.coverage(receptor,targets,library,annotations);
assert.equal(c.listedNames,5);assert.equal(c.resolvedNames,3);assert.equal(c.sourcedProfiles,1);assert.equal(c.remaining,49);
assert.equal(api.coverage(receptor,[],library,annotations).sourcedProfiles,0,'orphaned annotations must not count');
assert.equal(api.coverage(receptor,targets,library,[{...annotations[0],identityKey:'not audited'}]).sourcedProfiles,0);
const report=api.coverageReport([receptor],targets,library,[annotations[0],{...annotations[1],evidenceType:'functional'}]);
assert.equal(report.annotationIssues,1);assert.equal(report.atGoal,0);
assert.equal(api.browse([receptor],{coverage:'below_goal'},targets,annotations,library).length,1);
assert.equal(api.browse([receptor],{coverage:'at_goal'},targets,annotations,library).length,0);
// Direct cards and filters must reject the same invalid evidence as the full report.
const invalidEvidence=[null,undefined,{...annotations[0],sourceUrl:'http://example.org/assay'},
 {...annotations[0],evidenceType:'functional'}, {...annotations[0],action:'agonist'},
 {...annotations[0],species:''},{...annotations[0],assay:''},{...annotations[0],endpoint:''}];
for(const bad of invalidEvidence){
 assert.doesNotThrow(()=>api.coverage(receptor,targets,library,[bad]));
 assert.equal(api.coverage(receptor,targets,library,[bad]).sourcedProfiles,0);
 assert.equal(api.coverageReport([receptor],targets,library,[bad]).rows[0].sourcedProfiles,0);
 assert.equal(api.browse([receptor],{coverage:'annotated'},targets,[bad],library).length,0);
}
const fifty=Array.from({length:50},(_,i)=>({...annotation('Ligand'+i,'C',i.toString(16).padStart(64,'0')),sourceUrl:'http://invalid.example'}));
const fiftyLibrary=fifty.map(a=>({name:a.ligandName,smiles:'C'}));
const fiftyTargets=[{gene:'TEST',ligands:fifty.map(a=>a.ligandName)}];
assert.equal(api.browse([receptor],{coverage:'at_goal'},fiftyTargets,fifty,fiftyLibrary).length,0);
assert.equal(api.browse([receptor],{coverage:'below_goal'},fiftyTargets,fifty,fiftyLibrary).length,1);
const mixed=[...invalidEvidence,annotations[0],annotations[1]];
assert.equal(api.coverage(receptor,targets,library,mixed).sourcedProfiles,1);
assert.equal(api.coverageReport([receptor],targets,library,mixed).rows[0].sourcedProfiles,1);
const {RECEPTOR_REFERENCE_CATALOG:catalog}=require('../data/receptor-catalog.js');
const {TARGETS}=require('../data/targets.js'),{LIBRARY}=require('../data/library.js'),{RECEPTOR_LIGAND_ANNOTATIONS}=require('../data/receptor-ligand-annotations.js');
const actual=api.coverageReport(catalog.receptors,TARGETS,LIBRARY,RECEPTOR_LIGAND_ANNOTATIONS);
for(const receptor of catalog.receptors)assert.deepEqual(
 api.coverage(receptor,TARGETS,LIBRARY,RECEPTOR_LIGAND_ANNOTATIONS),
 actual.rows.find(row=>row.id===receptor.id),'Card/report coverage must agree for '+receptor.id);
assert.equal(actual.annotationIssues,0);assert.equal(actual.rows.length,146);
assert.ok(actual.rows.every(r=>r.sourcedProfiles<=r.resolvedNames));
console.log('Receptor 50-entry coverage: audited-profile deduplication, stale/unresolved/property-only exclusions, evidence validation and gap filters passed');
