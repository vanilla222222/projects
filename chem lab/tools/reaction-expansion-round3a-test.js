'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const ctx = vm.createContext({ console, performance, setTimeout, clearTimeout });
const scripts = ['elements','graph','valence','stereo','naming-core','naming-chain','naming-ring','naming-scaffolds','naming-general','common-names-extra','naming-elements','properties','layout','smiles','reactions','molecular-identity','reaction-stereo','reaction-rules','reaction-rules-extra','reaction-rules-extra2','reaction-aromatic','reaction-rules-extra3','reaction-rules-extra4','reaction-rules-extra5','reaction-rules-extra6','reaction-catalog','retro-stock','retro','retro-families-extra','retro-families-extra2'];
scripts.forEach((name) => vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),ctx,{filename:name+'.js'}));
const run = (code) => vm.runInContext(code,ctx);
run(`function r5Compound(smiles,role){return {smiles,fragment:smilesToFragment(smiles),role:role||'reactant',equiv:1};}
function r5Predict(smiles,reagents,conditions){const r=predictReaction([r5Compound(smiles),...reagents.map(s=>r5Compound(s,'reagent'))],{...defaultReactionConditions(),...conditions});return [r.best,...r.alternatives].filter(Boolean);}
function r5Product(smiles,reagents,conditions,id,expected){return r5Predict(smiles,reagents,conditions).some(o=>o.id===id && o.products.some(p=>moleculeSame(p.fragment||p.isomericSmiles||p.smiles,expected)));}
function r5Retro(target,id){const g=retroFromSmiles(target),t=retroTarget(g);t.edits=[];t.currentTransform=id;return RETRO_TRANSFORMS.find(x=>x.id===id).match(t).some(spec=>{const v=retroTryVerify(spec,t.smiles);return v&&v.outcome.id===id});}
`);
let checks=0;
function check(code,expected,label){assert.equal(run(code),expected,label);checks++;}

const cases = [
 ['anhydride-hydrolysis','CC(=O)OC(C)=O',[],{solvents:['water']},'CC(=O)O'],
 ['anhydride-hydrolysis','O=C1OC(=O)CC1',[],{solvents:['water']},'O=C(O)CCC(=O)O'],
 ['anhydride-alcoholysis','CC(=O)OC(C)=O',['CCO'],{additives:['et3n']},'CCOC(C)=O'],
 ['anhydride-alcoholysis','CC(=O)OC(C)=O',['Oc1ccccc1'],{additives:['et3n']},'CC(=O)Oc1ccccc1'],
 ['anhydride-alcoholysis','CC(=O)OC(C)=O',['O=C(O)c1ccccc1O'],{additives:['h2so4']},'O=C(O)c1ccccc1OC(C)=O'],
 ['anhydride-aminolysis','CC(=O)OC(C)=O',['CN'],{},'CNC(C)=O'],
 ['anhydride-aminolysis','CC(=O)OC(C)=O',['CNC'],{},'CC(=O)N(C)C'],
 ['anhydride-aminolysis','CC(=O)OC(C)=O',['N'],{},'CC(N)=O'],
 ['anhydride-reduction','CC(=O)OC(C)=O',['[Li+].[AlH4-]'],{solvents:['thf']},'CCO'],
 ['anhydride-reduction','O=C1OC(=O)CC1',['[Li+].[AlH4-]'],{solvents:['thf']},'OCCCCO'],
 ['anhydride-formation','CCC(=O)Cl',['CC(=O)[O-]'],{solvents:['ether']},'CCC(=O)OC(C)=O'],
 ['hydroxy-acid-lactonization','OCCCC(=O)O',[],{additives:['h2so4'],temperature:80,solvents:['toluene']},'O=C1OCCC1'],
 ['hydroxy-acid-lactonization','OCCCCC(=O)O',[],{additives:['h2so4'],temperature:80,solvents:['toluene']},'O=C1OCCCC1'],
 ['rosenmund-reduction','CCC(=O)Cl',[],{additives:['rosenmund'],atmosphere:'h2',solvents:['toluene']},'CCC=O'],
 ['rosenmund-reduction','O=C(Cl)c1ccccc1',[],{additives:['rosenmund'],atmosphere:'h2',solvents:['toluene']},'O=Cc1ccccc1'],
 ['peracid-aldehyde-oxidation','CCC=O',['OOC(=O)c1cccc(Cl)c1'],{},'CCC(=O)O'],
 ['peracid-aldehyde-oxidation','O=Cc1ccccc1',['OOC(=O)c1cccc(Cl)c1'],{},'O=C(O)c1ccccc1'],
];
for(const [id,s,rs,c,p] of cases)check(`r5Product(${JSON.stringify(s)},${JSON.stringify(rs)},${JSON.stringify(c)},${JSON.stringify(id)},${JSON.stringify(p)})`,true,id+' '+s);
const negatives = [
 ['anhydride-hydrolysis','CC(=O)OC(C)=O',[],{}],
 ['anhydride-hydrolysis','CCOC(C)=O',[],{solvents:['water']}],
 ['anhydride-alcoholysis','CC(=O)OC(=O)CC',['CCO'],{additives:['et3n']}],
 ['anhydride-alcoholysis','O=C1OC(=O)CC1',['CCO'],{additives:['et3n']}],
 ['anhydride-alcoholysis','CC(=O)OC(C)=O',['CCO'],{}],
 ['anhydride-alcoholysis','CC(=O)OC(C)=O',['OCCO'],{additives:['et3n']}],
 ['anhydride-alcoholysis','CC(=O)OC(C)=O',['NCCO'],{additives:['et3n']}],
 ['anhydride-alcoholysis','CC(=O)OC(C)=O',['CCO'],{additives:['et3n'],solvents:['water']}],
 ['anhydride-aminolysis','CC(=O)OC(C)=O',['CN(C)C'],{}],
 ['anhydride-aminolysis','CC(=O)OC(C)=O',['NCCN'],{}],
 ['anhydride-aminolysis','CC(=O)OC(C)=O',['CN'],{additives:['h2so4']}],
 ['anhydride-reduction','CC(=O)OC(C)=O',['[Na+].[BH4-]'],{solvents:['thf']}],
 ['anhydride-reduction','CC(=O)OC(C)=O',['[Li+].[AlH4-]'],{solvents:['water']}],
 ['anhydride-formation','CCC(=O)Cl',['CC(=O)O'],{solvents:['ether']}],
 ['anhydride-formation','CCC(=O)Cl',['CC(=O)[O-]'],{solvents:['water']}],
 ['hydroxy-acid-lactonization','OCCC(=O)O',[],{additives:['h2so4'],temperature:80}],
 ['hydroxy-acid-lactonization','OCCCCCC(=O)O',[],{additives:['h2so4'],temperature:80}],
 ['hydroxy-acid-lactonization','OCCCC(=O)O',[],{temperature:80}],
 ['hydroxy-acid-lactonization','OCCCC(=O)O',[],{additives:['h2so4'],temperature:80,solvents:['water']}],
 ['rosenmund-reduction','CCC(=O)Cl',[],{additives:['pd'],atmosphere:'h2',solvents:['toluene']}],
 ['rosenmund-reduction','CCC(=O)Cl',[],{additives:['rosenmund'],solvents:['toluene']}],
 ['rosenmund-reduction','C=CC(=O)Cl',[],{additives:['rosenmund'],atmosphere:'h2',solvents:['toluene']}],
 ['peracid-aldehyde-oxidation','CC(C)=O',['OOC(=O)c1cccc(Cl)c1'],{}],
 ['peracid-aldehyde-oxidation','C=CC=O',['OOC(=O)c1cccc(Cl)c1'],{}],
 ['peracid-aldehyde-oxidation','NCCC=O',['OOC(=O)c1cccc(Cl)c1'],{}],
];
for(const[id,s,rs,c] of negatives)check(`r5Predict(${JSON.stringify(s)},${JSON.stringify(rs)},${JSON.stringify(c)}).some(o=>o.id===${JSON.stringify(id)})`,false,'Exclude '+id+' '+s);
check(`r5Product('[13CH3]C(=O)OC(C)=O',[],{solvents:['water']},'anhydride-hydrolysis','[13CH3]C(=O)O')`,true,'Isotope retained in anhydride hydrolysis');
check(`r5Product('C[C@H](F)CC=O',['OOC(=O)c1cccc(Cl)c1'],{},'peracid-aldehyde-oxidation','C[C@H](F)CC(=O)O')`,true,'Remote tetrahedral stereo retained');
check(`(()=>{const o=r5Predict('CC(=O)OC(C)=O',[],{solvents:['water']}).find(x=>x.id==='anhydride-hydrolysis');return o.products.length===1&&o.products[0].count===2;})()`,true,'Symmetric hydrolysis retains two acid equivalents');
check(`(()=>{const o=r5Predict('CC(=O)OC(C)=O',['[Li+].[AlH4-]'],{solvents:['thf']}).find(x=>x.id==='anhydride-reduction');return o.products.length===1&&o.products[0].count===2;})()`,true,'Anhydride reduction retains two alcohol equivalents');
check(`(()=>{const o=r5Predict('CC(=O)OC(C)=O',['CCO'],{additives:['et3n']}).find(x=>x.id==='anhydride-alcoholysis');return o.products.some(p=>moleculeSame(p.fragment||p.smiles,'CC(=O)O'));})()`,true,'Alcoholysis retains acid coproduct');
check(`r5Predict('[13CH3]C(=O)OC(C)=O',['CCO'],{additives:['et3n']}).some(o=>o.id==='anhydride-alcoholysis')`,false,'Isotope-distinct acyl halves are not symmetry-equivalent');
check(`r5Predict('CCC(=O)Cl',['CC(=O)[O-]','CCO'],{solvents:['ether']}).some(o=>o.id==='anhydride-formation')`,false,'Anhydride formation rejects competing alcohol');
check(`r5Predict('CCC(=O)Cl',['OCC(=O)[O-]'],{solvents:['ether']}).some(o=>o.id==='anhydride-formation')`,false,'Hydroxy carboxylate excluded');
check(`r5Predict('CC(=O)OC(C)=O',['OCCOC'],{additives:['h2so4']}).some(o=>o.id==='anhydride-alcoholysis')`,false,'Competing ether excluded');
check(`r5Predict('CC(=O)OC(C)=O',['OCC(=O)OC'],{additives:['h2so4']}).some(o=>o.id==='anhydride-alcoholysis')`,false,'Hydroxy ester partner excluded');
check(`r5Predict('CCC(=O)Cl',['CC(=O)[O-]','N'],{solvents:['ether']}).some(o=>o.id==='anhydride-formation')`,false,'Ammonia competes with carboxylate');
check(`r5Predict('O=CCl',[],{additives:['rosenmund'],atmosphere:'h2',solvents:['toluene']}).some(o=>o.id==='rosenmund-reduction')`,false,'Formyl chloride excluded');
check(`r5Predict('CC(=O)OC(C)=O',['[2H]N([2H])C'],{}).some(o=>o.id==='anhydride-aminolysis')`,false,'Explicit NH proton topology unsupported');
check(`r5Predict('CCC=O',['OOC(=O)c1cccc(Cl)c1'],{}).find(o=>o.id==='peracid-aldehyde-oxidation').type`,'Oxidation','Oxidation classified correctly');
check(`r5Predict('CCC(=O)Cl',[],{additives:['rosenmund'],atmosphere:'h2',solvents:['toluene']}).find(o=>o.id==='rosenmund-reduction').type`,'Reduction','Rosenmund classified correctly');
check(`RX6_DEFINITIONS.every(d=>{const r=RX_RULES.find(x=>x.id===d[0]);return r.catalog.scope&&r.catalog.assumptions.length&&r.catalog.limitations.length&&r.catalog.references.length;})`,true,'Every new rule has scoped evidence');
console.log('Reaction expansion round 3A: '+checks+' checks passed.');
