#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const context = vm.createContext({ console, setTimeout, clearTimeout });
const scripts = ['elements','graph','valence','stereo','naming-core','naming-chain','naming-ring','naming-scaffolds','naming-general','common-names-extra','naming-elements','properties','layout','smiles','reactions','reaction-stereo','reaction-rules','reaction-rules-extra','reaction-rules-extra2','reaction-aromatic','reaction-rules-extra3','reaction-rules-extra4','retro','retro-families-extra'];
scripts.forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, 'js', file + '.js'), 'utf8'), context, { filename: file + '.js' }));
const run = (code) => vm.runInContext(code, context);
run(`function expCompound(smiles, role) { return {smiles,fragment:smilesToFragment(smiles),role:role||'reactant',equiv:1}; }
function expPredict(substrate, reagent, conditions) {
 const r=predictReaction([expCompound(substrate),...(reagent?[expCompound(reagent,'reagent')]:[])],Object.assign(defaultReactionConditions(),conditions));
 return [r.best,...r.alternatives].filter(Boolean);
}
function expProduct(substrate,reagent,conditions,id,expected) {
 const g=reactionFragmentGraph(smilesToFragment(expected));const key=reactionGraphProperties(g).smiles;
 return expPredict(substrate,reagent,conditions).some(o=>o.id===id && o.products.some(p=>p.smiles===key));
}
function expSpecs(smiles,id) {const g=retroFromSmiles(smiles),t=retroTarget(g);t.edits=[];t.currentTransform=id;return {t,specs:RETRO_TRANSFORMS.find(x=>x.id===id).match(t)};}
`);
let checks = 0;
function check(code, expected, label) { assert.equal(run(code), expected, label); checks++; }

for (const [s,p] of [['CCBr','CCI'],['CCl','CI'],['ClCCc1ccccc1','ICCc1ccccc1']]) {
  check(`expProduct('${s}','[Na+].[I-]',{solvents:['acetone']},'finkelstein','${p}')`,true,'Finkelstein expected product '+s);
}
for (const s of ['CC(C)Br','CC(C)(C)Cl','CC(C)(C)CBr','Clc1ccccc1','C=CCl','CCF','CC(Cl)CBr']) {
  check(`expPredict('${s}','[Na+].[I-]',{solvents:['acetone']}).some(o=>o.id==='finkelstein')`,false,'Unsupported Finkelstein substrate '+s);
}
check(`expPredict('CCBr','[Na+].[I-]',{solvents:['water']}).some(o=>o.id==='finkelstein')`,false,'Acetone is required');
check(`expPredict('CCBr','[Na+].[Cl-]',{solvents:['acetone']}).some(o=>o.id==='finkelstein')`,false,'Iodide is required');
check(`expPredict('CCBr','[I-]',{solvents:['acetone']}).some(o=>o.id==='finkelstein')`,false,'Supported counterion is required');
check(`expPredict('CCBr','[Na+].[I-]',{solvents:['acetone','water']}).some(o=>o.id==='finkelstein')`,false,'Added water is outside precipitation model');

for (const [s,p] of [['CSC','CS(=O)C'],['CSc1ccccc1','CS(=O)c1ccccc1'],['C1CCSCC1','O=S1CCCCC1']]) {
  check(`expProduct('${s}',null,{additives:['naio4'],solvents:['water','methanol'],temperature:0},'sulfide-sulfoxide','${p}')`,true,'Periodate expected product '+s);
}
for (const s of ['CS','CSSC','CS(=O)C','CS(=O)(=O)C','c1ccsc1','CSCC(O)CO','CSCCSC']) {
  check(`expPredict('${s}',null,{additives:['naio4'],solvents:['water'],temperature:0}).some(o=>o.id==='sulfide-sulfoxide')`,false,'Unsupported periodate substrate '+s);
}
check(`expPredict('CSC',null,{additives:['naio4'],solvents:['water'],temperature:25}).some(o=>o.id==='sulfide-sulfoxide')`,false,'Cold model excludes warm conditions');
check(`expPredict('CSC',null,{additives:['naio4'],solvents:['dcm'],temperature:0}).some(o=>o.id==='sulfide-sulfoxide')`,false,'Aqueous model requires water');

for (const [s,p] of [['CCS(=O)CC','CCS(=O)(=O)CC'],['CS(=O)c1ccccc1','CS(=O)(=O)c1ccccc1']]) {
  check(`expProduct('${s}','OOC(=O)c1cccc(Cl)c1',{solvents:['dcm']},'sulfoxide-sulfone','${p}')`,true,'Peracid expected sulfone '+s);
}
for (const s of ['CCSCC','CCS(=O)(=O)CC','C=CCS(=O)C','CC(=O)CS(=O)C','CNCCS(=O)C']) {
  check(`expPredict('${s}','OOC(=O)c1cccc(Cl)c1',{solvents:['dcm']}).some(o=>o.id==='sulfoxide-sulfone')`,false,'Unsupported peracid substrate '+s);
}

for (const [s,p] of [['CS','CSSC'],['CCS','CCSSCC'],['Sc1ccccc1','c1ccccc1SSc1ccccc1']]) {
  check(`expProduct('${s}','II',{solvents:['mecn','water']},'thiol-disulfide','${p}')`,true,'Iodine expected symmetric disulfide '+s);
}
for (const s of ['SCCS','CSC','CSSC','C=CCS','OCCS']) {
  check(`expPredict('${s}','II',{solvents:['mecn','water']}).some(o=>o.id==='thiol-disulfide')`,false,'Unsupported thiol coupling substrate '+s);
}
check(`expPredict('CCS','II',{solvents:['mecn']}).some(o=>o.id==='thiol-disulfide')`,false,'Wet solvent required');
check(`(() => {const r=predictReaction([expCompound('CS'),expCompound('CCS'),expCompound('II','reagent')],{...defaultReactionConditions(),solvents:['mecn','water']});return [r.best,...r.alternatives].filter(Boolean).some(o=>o.id==='thiol-disulfide');})()`,false,'No arbitrary mixed-thiol selectivity');

for (const [target,id] of [['CCI','finkelstein'],['CS(=O)c1ccccc1','sulfide-sulfoxide'],['CCS(=O)(=O)CC','sulfoxide-sulfone'],['CCSSCC','thiol-disulfide']]) {
  check(`(() => {const x=expSpecs('${target}','${id}');return x.specs.some(s=>{const v=retroTryVerify(s,x.t.smiles);return v&&v.outcome.id==='${id}';});})()`,true,'New retro '+id+' forward verifies');
}
check(`expSpecs('CSSCC','thiol-disulfide').specs.length`,0,'Mixed disulfide not assigned symmetric route');
check(`(() => {const g=retroFromSmiles('CS(=O)c1ccccc1'),before=JSON.stringify(g);const r=retroDisconnect(g,undefined,{protect:false,budgetMs:10000});return r.candidates.some(c=>c.transform==='sulfide-sulfoxide')&&JSON.stringify(g)===before;})()`,true,'Public retro API includes new rule without input mutation');
check(`RX_RULES.filter(r=>['finkelstein','sulfide-sulfoxide','sulfoxide-sulfone','thiol-disulfide'].includes(r.id)).every(r=>r.catalog.references.length&&r.catalog.scope&&r.catalog.limitations.length)`,true,'Every added rule has evidence and scope metadata');
console.log('Reaction expansion: ' + checks + ' checks passed.');
