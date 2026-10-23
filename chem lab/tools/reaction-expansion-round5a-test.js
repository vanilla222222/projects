'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
const modules=['elements','graph','valence','stereo','naming-core','naming-chain','naming-ring','naming-scaffolds','naming-general','common-names-extra','naming-elements','properties','layout','smiles','reactions','molecular-identity','reaction-stereo','reaction-rules','reaction-rules-extra','reaction-rules-extra2','reaction-aromatic','reaction-rules-extra3','reaction-rules-extra4','reaction-rules-extra5','reaction-rules-extra6','reaction-rules-extra7','reaction-rules-extra8','reaction-rules-extra9','reaction-rules-extra10','reaction-catalog','retro-stock','retro','retro-families-extra5'];
modules.forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'),ctx,{filename:f}));
const run=c=>vm.runInContext(c,ctx);run(`function q10(ss,c,id,expected){const r=predictReaction(ss.map((smiles,i)=>({smiles,fragment:smilesToFragment(smiles),role:i?'reagent':'reactant'})),{...defaultReactionConditions(),...c});const o=[r.best,...r.alternatives].filter(Boolean).find(o=>o.id===id);return expected?!!o&&o.products.some(p=>moleculeSame(p.isomericSmiles||p.smiles,expected)):!!o;}`);
let checks=0;const cases=[
 ['mpv-reduction',['CC(=O)C'],{solvents:['ipa'],additives:['al-ipa'],temperature:80},'CC(O)C',['CC(=O)OC']],
 ['oppenauer-oxidation',['CC(O)CC'],{solvents:['acetone'],additives:['al-ipa'],temperature:60},'CC(=O)CC',['CCO']],
 ['tishchenko',['O=Cc1ccccc1'],{additives:['na-obn'],temperature:25},'O=C(OCc1ccccc1)c1ccccc1',['CCC=O']],
 ['perkin-condensation',['O=Cc1ccccc1','CC(=O)OC(C)=O'],{additives:['naoac'],temperature:160},'O=C(O)C=Cc1ccccc1',['CCC=O','CC(=O)OC(C)=O']],
 ['darzens',['CC=O','CCOC(=O)CCl'],{solvents:['ethanol'],additives:['naoet']},'CCOC(=O)C1OC1C',['CC=O','CCOC(=O)C(C)(Cl)C']],
 ['benzilic-rearrangement',['O=C(c1ccccc1)C(=O)c1ccccc1'],{solvents:['water'],additives:['koh'],temperature:80},'O=C(O)C(O)(c1ccccc1)c1ccccc1',['CC(=O)C(=O)C']],
 ['hunsdiecker',['CCCC(=O)O','BrBr'],{solvents:['ccl4'],additives:['ag2o']},'CCCBr',['CC(C)C(=O)O','BrBr']],
 ['kolbe-schmitt',['Oc1ccccc1','O=C=O'],{solvents:['none'],additives:['naoh'],temperature:125,pressure:100},'O=C(O)c1ccccc1O',['COc1ccccc1','O=C=O']],
 ['mcmurry',['CC(=O)C'],{solvents:['thf'],additives:['mcmurry'],temperature:65},'CC(C)=C(C)C',['CC(=O)OC']],
 ['acyloin-cyclization',['CCOC(=O)CCC(=O)OCC'],{solvents:['ether'],additives:['acyloin'],atmosphere:'n2'},'O=C1CCC1O',['CCOC(=O)CC']]
];
for(const [id,ss,c,product,negative]of cases){assert.equal(run(`q10(${JSON.stringify(ss)},${JSON.stringify(c)},'${id}',${JSON.stringify(product)})`),true,id+' product');checks++;assert.equal(run(`q10(${JSON.stringify(negative)},${JSON.stringify(c)},'${id}')`),false,id+' exclusion');checks++;}
for(const [target,id]of [['CC(O)C','mpv-reduction'],['CC(=O)CC','oppenauer-oxidation'],['CCOC(=O)C1OC1C','darzens'],['CCCBr','hunsdiecker'],['O=C(O)c1ccccc1O','kolbe-schmitt']]){
 assert.equal(run(`(()=>{const t=retroTarget(retroFromSmiles('${target}'));t.edits=[];t.currentTransform='${id}';return RETRO_TRANSFORMS.find(x=>x.id==='${id}').match(t).some(s=>!!retroTryVerify(s,t.smiles));})()`),true,id+' reverse verifies');checks++;
}
console.log('Reaction expansion round 5a: '+checks+' focused checks passed.');
