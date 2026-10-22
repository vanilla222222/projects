'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const ctx = vm.createContext({ console, performance, setTimeout, clearTimeout });
const scripts = ['elements','graph','valence','stereo','naming-core','naming-chain','naming-ring','naming-scaffolds','naming-general','common-names-extra','naming-elements','properties','layout','smiles','reactions','molecular-identity','reaction-stereo','reaction-rules','reaction-rules-extra','reaction-rules-extra2','reaction-aromatic','reaction-rules-extra3','reaction-rules-extra4','reaction-rules-extra5','reaction-catalog','retro-stock','retro','retro-families-extra','retro-families-extra2'];
scripts.forEach((name) => vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),ctx,{filename:name+'.js'}));
const run = (code) => vm.runInContext(code,ctx);
run(`function r5Compound(smiles,role){return {smiles,fragment:smilesToFragment(smiles),role:role||'reactant',equiv:1};}
function r5Predict(smiles,reagents,conditions){const r=predictReaction([r5Compound(smiles),...reagents.map(s=>r5Compound(s,'reagent'))],{...defaultReactionConditions(),...conditions});return [r.best,...r.alternatives].filter(Boolean);}
function r5Product(smiles,reagents,conditions,id,expected){return r5Predict(smiles,reagents,conditions).some(o=>o.id===id && o.products.some(p=>moleculeSame(p.fragment||p.isomericSmiles||p.smiles,expected)));}
function r5Retro(target,id){const g=retroFromSmiles(target),t=retroTarget(g);t.edits=[];t.currentTransform=id;return RETRO_TRANSFORMS.find(x=>x.id===id).match(t).some(spec=>{const v=retroTryVerify(spec,t.smiles);return v&&v.outcome.id===id});}
`);
let checks=0;
function check(code,expected,label){assert.equal(run(code),expected,label);checks++;}
const sia = 'B(C(C)C(C)C)C(C)C(C)C';
for(const [substrate,product] of [['CCC#C','CCCC=O'],['C#CC','CCC=O'],['C#Cc1ccccc1','O=CCc1ccccc1']]) {
  check(`r5Product('${substrate}',['${sia}','OO'],{solvents:['thf'],additives:['naoh']},'alkyne-hydroboration-oxidation','${product}')`,true,'Alkyne to aldehyde: '+substrate);
}
for(const s of ['C#C','CC#CC','CC#CC#C','C=CCC#C','OCCC#C','NCCC#C','CCC']) {
  check(`r5Predict('${s}',['${sia}','OO'],{solvents:['thf'],additives:['naoh']}).some(o=>o.id==='alkyne-hydroboration-oxidation')`,false,'Alkyne excluded: '+s);
}
check(`r5Predict('CCC#C',['B','OO'],{solvents:['thf'],additives:['naoh']}).some(o=>o.id==='alkyne-hydroboration-oxidation')`,false,'BH3 is not the bulky alkyne reagent');
check(`r5Predict('CCC#C',['B(CCCCC)CCCCC','OO'],{solvents:['thf'],additives:['naoh']}).some(o=>o.id==='alkyne-hydroboration-oxidation')`,false,'Constitutionally different dialkylborane excluded');
check(`r5Predict('CCC#C',['${sia}'],{solvents:['thf'],additives:['naoh']}).some(o=>o.id==='alkyne-hydroboration-oxidation')`,false,'Explicit oxidative workup required');
check(`r5Predict('CCC#C',['${sia}','OO'],{solvents:['thf']}).some(o=>o.id==='alkyne-hydroboration-oxidation')`,false,'Base workup required');
check(`r5Predict('CCC#C',['${sia}','OO'],{solvents:['water'],additives:['naoh']}).some(o=>o.id==='alkyne-hydroboration-oxidation')`,false,'Supported reaction solvent required');
check(`r5Product('[13CH]#CCC',['${sia}','OO'],{solvents:['thf'],additives:['naoh']},'alkyne-hydroboration-oxidation','CCC[13CH]=O')`,true,'Terminal carbon isotope reaches aldehyde carbon');

for(const [substrate,product] of [['CCC(=O)O','CCCO'],['O=C(O)c1ccccc1','OCc1ccccc1'],['ClCC(=O)O','ClCCO']]) {
  check(`r5Product('${substrate}',['B'],{solvents:['thf']},'borane-acid-reduction','${product}')`,true,'Acid to alcohol: '+substrate);
}
for(const s of ['CCC(=O)OC','CCC(=O)[O-]','O=C(O)CCC(=O)O','C=CCC(=O)O','NCCC(=O)O','OCCC(=O)O','CC(=O)CC(=O)O','CCO']) {
  check(`r5Predict('${s}',['B'],{solvents:['thf']}).some(o=>o.id==='borane-acid-reduction')`,false,'Acid reduction excluded: '+s);
}
check(`r5Predict('CCC(=O)O',['B'],{solvents:['thf','water']}).some(o=>o.id==='borane-acid-reduction')`,false,'No simultaneous aqueous solvent');
check(`r5Predict('CCC(=O)O',['B','OO'],{solvents:['thf']}).some(o=>o.id==='borane-acid-reduction')`,false,'Oxidation mixture not interpreted as acid reduction');
check(`r5Predict('CCC(=O)O',[],{solvents:['thf']}).some(o=>o.id==='borane-acid-reduction')`,false,'Borane required');
check(`r5Product('C[C@H](F)C(=O)O',['B'],{solvents:['thf']},'borane-acid-reduction','C[C@H](F)CO')`,true,'Untouched stereocentre survives acid reduction');

for(const [substrate,product] of [['COc1ccccc1','Oc1ccccc1'],['COc1ccc(Br)cc1','Oc1ccc(Br)cc1'],['Cc1ccc(OC)cc1','Cc1ccc(O)cc1']]) {
  check(`r5Product('${substrate}',['BrB(Br)Br'],{solvents:['dcm'],temperature:0},'aryl-ether-demethylation','${product}')`,true,'Aryl methyl cleavage: '+substrate);
}
for(const s of ['CCOc1ccccc1','c1ccccc1Oc1ccccc1','COCC','COc1ccc(OC)cc1','COc1ccc(N)cc1','COc1ccc(C=C)cc1','COc1ccc(O)cc1']) {
  check(`r5Predict('${s}',['BrB(Br)Br'],{solvents:['dcm'],temperature:0}).some(o=>o.id==='aryl-ether-demethylation')`,false,'Cleavage excluded: '+s);
}
check(`r5Predict('COc1ccccc1',['BrB(Br)Br'],{solvents:['dcm','water'],temperature:0}).some(o=>o.id==='aryl-ether-demethylation')`,false,'Dry cleavage stage required');
check(`r5Predict('COc1ccccc1',['BrB(Br)Br'],{solvents:['dcm'],temperature:80}).some(o=>o.id==='aryl-ether-demethylation')`,false,'Outside encoded temperature scope');
check(`r5Predict('COc1ccccc1',['FB(F)F'],{solvents:['dcm'],temperature:0}).some(o=>o.id==='aryl-ether-demethylation')`,false,'BF3 is not BBr3');
check(`r5Product('[13CH3]Oc1ccccc1',['BrB(Br)Br'],{solvents:['dcm'],temperature:0},'aryl-ether-demethylation','Oc1ccccc1')`,true,'Isotope on departing methyl is not retained in phenol');

for(const [target,id] of [['CCCC=O','alkyne-hydroboration-oxidation'],['CCCO','borane-acid-reduction'],['Oc1ccccc1','aryl-ether-demethylation']]) {
  check(`r5Retro('${target}','${id}')`,true,'New retro candidate forward-verifies: '+id);
}
check(`r5Retro('CC(C)C=O','alkyne-hydroboration-oxidation')`,false,'Alpha-branched aldehyde has no terminal-alkyne precursor');
check(`r5Retro('CC(C)O','borane-acid-reduction')`,false,'Secondary alcohol is not acid-reduction endpoint');
check(`r5Retro('CCO','aryl-ether-demethylation')`,false,'Aliphatic alcohol is not aryl demethylation endpoint');
check(`(()=>{const g=retroFromSmiles('Oc1ccccc1'),before=JSON.stringify(g);const r=retroDisconnect(g,undefined,{protect:false,budgetMs:10000});return r.candidates.some(c=>c.transform==='aryl-ether-demethylation') && before===JSON.stringify(g);})()`,true,'Public retro includes family and does not mutate target');
check(`RX_RULES.filter(r=>['alkyne-hydroboration-oxidation','borane-acid-reduction','aryl-ether-demethylation'].includes(r.id)).every(r=>r.catalog.scope&&r.catalog.assumptions.length&&r.catalog.limitations.length&&r.catalog.references.length)`,true,'New families expose scope and evidence');
check(`reactionRuleDescriptor('aryl-ether-demethylation').references[0].url`,'https://doi.org/10.15227/orgsyn.049.0050','Primary aryl ether source');
console.log('Reaction expansion round 2: '+checks+' checks passed.');
