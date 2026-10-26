'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),actions=require('../js/reference-actions');
const observation=(action,extra={})=>({kind:'source_classification',target:'TEST',species:'Homo sapiens',action,...extra});
assert.deepEqual(actions.canonicalActions(observation('Full agonist')),['agonist']);
assert.deepEqual(actions.canonicalActions(observation('Partial agonist',{actions:['agonist','partial_agonist']})),['partial_agonist']);
assert.deepEqual(actions.canonicalActions(observation('Biased agonist',{actions:['agonist','biased']})),['biased']);
for(const [specific,label]of [['pam','positive allosteric modulator (PAM)'],['nam','negative allosteric modulator (NAM)'],['neutral_allosteric','neutral allosteric ligand']]){
 assert.deepEqual(actions.canonicalActions(observation('Positive',{actions:['modulator',specific]})),[specific]);assert.equal(actions.label(specific),label);
 assert.deepEqual(actions.reviewActions([observation('',{actions:['modulator']}),observation('',{actions:[specific]})]),[]);
}
assert.deepEqual(actions.reviewActions([observation('',{actions:['pam']}),observation('',{actions:['nam']})]),['pam','nam']);
assert.deepEqual(actions.reviewActions([observation('Full agonist'),observation('agonist')]),[]);
assert.deepEqual(actions.reviewActions([observation('Full agonist'),observation('Partial agonist')]),['agonist','partial_agonist']);
assert.deepEqual(actions.reviewActions([observation('agonist'),observation('antagonist')]),['agonist','antagonist']);
assert.deepEqual(actions.reviewActions([observation('',{actions:['pam']}),observation('',{actions:['nam'],species:'Mus musculus'})]),[]);
assert.deepEqual(actions.reviewActions([observation('',{actions:['pam']}),observation('',{actions:['nam'],target:'OTHER'})]),[]);
for(const kind of ['imported_binding','measured_property','control_comparison','identity_reference'])assert.deepEqual(actions.canonicalActions(observation('agonist',{kind,actions:['agonist'],value:100,relation:'>'})),[]);
assert.deepEqual(actions.canonicalActions(observation('Positive',{kind:'imported_classification',actions:[]})),[]);
assert.deepEqual(actions.canonicalActions(observation('arbitrary unknown action')),[]);
// Browser helper is self-contained and does not depend on CommonJS or prior scripts.
const browser={};vm.runInNewContext(fs.readFileSync(require.resolve('../js/reference-actions'),'utf8'),browser);assert.equal(browser.ReferenceActions.label('pam'),actions.label('pam'));
// Live observations: canonical wording must replace raw IUPHAR directional tokens.
global.ReferenceSAR=require('../js/reference-sar');const {model}=require('./reference-research-test'),claims=require('../js/reference-claims').create(model);
for(const [name,target,canonical,literal]of [['Alprazolam','GABAA','pam','Positive'],['Amlodipine','P2RX4','nam','Negative'],['Anandamide','GLYR','pam','Potentiation'],['Axitinib','KDR','inhibitor','Inhibition'],['Amantadine','NMDA','channel_blocker','None'],['staurosporine','CHRM4','neutral_allosteric','Neutral']]){
 const trace=claims.trace(name),c=trace.claims.find(c=>c.type==='action'&&c.target===target&&c.id.endsWith('|'+canonical));assert.ok(c,name+' / '+target);assert.ok(c.label.includes(actions.label(canonical)));assert.ok(c.witnesses.some(o=>o.sourceAction===literal),'Literal source wording remains available');
 assert.ok(!trace.claims.some(c=>c.type==='action'&&c.target===target&&/\|(?:positive|negative|none|neutral|inhibition|potentiation)$/.test(c.id)),'Raw qualifiers are not actions');
}
const quet=claims.trace('Quetiapine').claims.filter(c=>c.type==='action'&&c.target==='HTR2A');assert.ok(quet.some(c=>c.id.endsWith('|agonist')));assert.ok(quet.some(c=>c.id.endsWith('|antagonist')));
const bounded=model.entries.map(e=>model.dossier(e.name)).find(d=>d.observations.some(o=>o.kind==='control_comparison'&&o.relation==='>'));assert.ok(bounded);const bound=bounded.observations.find(o=>o.kind==='control_comparison'&&o.relation==='>');assert.ok(!claims.trace(bounded.entry.name).claims.some(c=>c.type==='action'&&c.witnesses.some(o=>o.id===bound.id)),'A bounded control result is not an action');
console.log('Canonical actions: live PAM/NAM/inhibitor/blocker/neutral claims, literal provenance, scoped conflicts, alias deduplication, partial/full differences and binding/bound separation passed');
