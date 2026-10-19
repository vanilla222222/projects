'use strict';
// Run: node tools/reference-audit-test.js
// Non-destructive data integrity tests. Not a chemical structure validator.
const assert=require('node:assert/strict');
const path=require('node:path');
const {LIBRARY}=require('../data/library.js');
const {TARGETS}=require('../data/targets.js');
const {SIGNAL_REFERENCE_PROFILES}=require('../data/signalling-profiles.js');
const {REFERENCE_AUDIT_BASELINE}=require('../data/reference-audit-baseline.js');
const {auditLibrary}=require('../reference-audit.js');
const a=auditLibrary(LIBRARY,TARGETS,SIGNAL_REFERENCE_PROFILES);
assert.ok(a.entries>=REFERENCE_AUDIT_BASELINE.entries,'Unexpected reduction in library entries');
assert.equal(a.missingSmiles,0,'Library entries missing SMILES');
assert.equal(a.missingFormula,0,'Library entries missing molecular formulas');
assert.equal(a.duplicateNames.length,0,'Duplicate reference names');
assert.equal(a.missingProfiles.length,0,'Profiles without a matching library molecule');
assert.equal(a.orphanedLigands.length,0,'Target ligand name missing from library');
assert.equal(a.targets,REFERENCE_AUDIT_BASELINE.targets,'Unexpected change in target count');
assert.equal(a.duplicateSmiles.length,0,'Duplicate exact SMILES');
console.log(JSON.stringify({passed:true,entries:a.entries,missingFormula:a.missingFormula,targets:a.targets,sparseTargets:a.sparseTargets,profiles:a.profiles},null,2));
