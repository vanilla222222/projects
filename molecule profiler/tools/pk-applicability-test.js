'use strict';
const assert=require('node:assert/strict');
for(const f of ['smiles','mol','smarts','stereo','descriptors','fingerprints'])Object.assign(global,require('../js/'+f));
global.PKFeatures=require('../js/pk-features');
const gate=require('../js/pk-applicability'),{PK_MODELS}=require('../data/pk-models');
const mol=s=>buildMolecule(parseSmiles(s));
for(const s of ['CCO','c1ccncc1','c1cc[nH]c1','C[NH3+]','C[N+](=O)[O-]','CS(=O)(=O)C','CC(=O)[O-]'])assert.ok(gate.assess(mol(s)).eligible,s);
for(const [s,reason] of [['CCO.O','Disconnected'],['CC[Si](C)(C)C','Elements'],['[13CH3]CO','Isotope'],['C[CH2]','open-shell'],['C[O]','open-shell'],['[NH4+].[Cl-]','Disconnected']]){
 const m=mol(s),result=gate.assess(m);assert.equal(result.eligible,false,s);assert.match(result.reasons.join(' '),new RegExp(reason));
 // A deliberately matching in-range vector must never override graph exclusion.
 const f=PKFeatures.features(m,describe(m),fingerprint(m,'ecfp4s'));
 for(const model of Object.values(PK_MODELS.models)){const p=gate.predict(model,f,m);assert.equal(p.available,false);assert.equal(p.outsideDomain,true);assert.equal(p.chemistry.policyVersion,'pk-chemistry-gate-v1');}
}
assert.equal(gate.assess(null).eligible,false);
// Model output and calibrated interval must be unchanged for eligible structures.
const m=mol('CC(=O)Oc1ccccc1C(=O)O'),f=PKFeatures.features(m,describe(m),fingerprint(m,'ecfp4s'));
for(const model of Object.values(PK_MODELS.models)){const {chemistry,...actual}=gate.predict(model,f,m);assert.deepEqual(actual,PKFeatures.predict(model,f));assert.ok(chemistry.eligible);}
console.log('PK applicability: fragments, elements, isotope labels, open-shell/valence withholding and unchanged eligible inference passed');

const pharmacology=require('../js/pharmacology');
for(const kind of ['acid','base']){
 const profile=pharmacology.ionizationProfile(7,kind,2);assert.equal(profile.length,15);
 assert.equal(profile[7].neutralFraction,.5);
 for(let i=1;i<15;i++)assert.ok(kind==='acid'?profile[i].neutralFraction<profile[i-1].neutralFraction:profile[i].neutralFraction>profile[i-1].neutralFraction);
 assert.ok(profile.every(p=>Number.isFinite(p.logD)&&p.neutralFraction>=0&&p.neutralFraction<=1));
}
assert.throws(()=>pharmacology.ionizationProfile(NaN,'base',2));
console.log('Conditional pH profiles: midpoint, acid/base monotonicity, finite ranges and invalid input passed');
