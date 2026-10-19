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
const {RECEPTOR_REFERENCE_CATALOG:catalog}=require('../data/receptor-catalog.js');
const {TARGETS}=require('../data/targets.js'),{LIBRARY}=require('../data/library.js'),{RECEPTOR_LIGAND_ANNOTATIONS}=require('../data/receptor-ligand-annotations.js');
const actual=api.coverageReport(catalog.receptors,TARGETS,LIBRARY,RECEPTOR_LIGAND_ANNOTATIONS);
assert.equal(actual.annotationIssues,0);assert.equal(actual.rows.length,146);
assert.ok(actual.rows.every(r=>r.sourcedProfiles<=r.resolvedNames));
console.log('Receptor 50-entry coverage: audited-profile deduplication, stale/unresolved/property-only exclusions, evidence validation and gap filters passed');
