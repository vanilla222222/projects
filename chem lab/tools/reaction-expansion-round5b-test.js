'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
const modules=['elements','graph','valence','stereo','naming-core','naming-chain','naming-ring','naming-scaffolds','naming-general','common-names-extra','naming-elements','properties','layout','smiles','reactions','molecular-identity','reaction-stereo','reaction-rules','reaction-rules-extra','reaction-rules-extra2','reaction-aromatic','reaction-rules-extra3','reaction-rules-extra4','reaction-rules-extra5','reaction-rules-extra6','reaction-rules-extra7','reaction-rules-extra8','reaction-rules-extra9','reaction-rules-extra11','reaction-catalog','retro-stock','retro','retro-families-extra','retro-families-extra2','retro-families-extra3','retro-families-extra4','retro-families-extra6'];
modules.forEach(n=>vm.runInContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'),ctx,{filename:n+'.js'}));
const run=c=>vm.runInContext(c,ctx);run(`function p11(ss,c,id){const r=predictReaction(ss.map((smiles,i)=>({smiles,fragment:smilesToFragment(smiles),role:i?'reagent':'reactant',equiv:1})),{...defaultReactionConditions(),...c});return [r.best,...r.alternatives].filter(Boolean).find(o=>o.id===id);}function product11(ss,c,id,expected){const o=p11(ss,c,id);if(!o)return false;const actual=o.products.flatMap(p=>Array(p.count||1).fill(p.isomericSmiles||p.smiles));return actual.length===expected.length&&expected.every(s=>{const i=actual.findIndex(a=>moleculeSame(a,s));if(i<0)return false;actual.splice(i,1);return true;});}`);
let checks=0;const dry={solvents:['thf']};
const cases=[
 ['isocyanate-urea',['CN=C=O','CCN'],dry,['CNC(=O)NCC'],['CN=C=O','CCN'],{solvents:['water']}],
 ['isocyanate-carbamate',['CN=C=O','CCO'],dry,['CNC(=O)OCC'],['CN=C=O','OCCO'],dry],
 ['isothiocyanate-thiourea',['CN=C=S','CCN'],dry,['CNC(=S)NCC'],['CN=C=S','NCCN'],dry],
 ['isocyanate-hydrolysis',['CCN=C=O'],{solvents:['water']},['CCN'],['CCN=C=O'],dry],
 ['aldoxime-dehydration',['CCC=NO','CC(=O)OC(C)=O'],{solvents:['dmso'],additives:['k2co3']},['CCC#N'],['CC(=NO)C','CC(=O)OC(C)=O'],{solvents:['dmso'],additives:['k2co3']}],
 ['amide-thionation',['CCC(N)=O'],{solvents:['toluene'],additives:['p2s5'],temperature:110},['CCC(N)=S'],['CCC(N)=O'],{solvents:['water'],additives:['p2s5'],temperature:100}],
 ['thiourea-s-alkylation',['NC(N)=S','CCBr'],{solvents:['ethanol']},['CCSC(N)=[NH2+]'],['NC(N)=S','CC(Br)C'],{solvents:['ethanol']}],
 ['isothiouronium-hydrolysis',['CCSC(N)=[NH2+]'],{solvents:['water'],additives:['naoh'],temperature:80},['CCS','NC(N)=O'],['CCSC(N)=[NH2+]'],dry],
 ['paal-knorr-thiophene',['CC(=O)CCC(C)=O'],{solvents:['toluene'],additives:['p2s5'],temperature:110},['Cc1ccc(C)s1'],['CC(=O)CC(C)=O'],{solvents:['toluene'],additives:['p2s5'],temperature:110}],
 ['hantzsch-thiazole',['CC(N)=S','CC(=O)CBr'],{solvents:['ethanol'],temperature:70},['Cc1nc(C)cs1'],['CC(N)=S','CC(=O)CBr'],{solvents:['water'],temperature:70}],
];
for(const [id,ss,c,expected,bad,bc]of cases){assert.equal(run(`product11(${JSON.stringify(ss)},${JSON.stringify(c)},'${id}',${JSON.stringify(expected)})`),true,id);checks++;assert.equal(run(`!!p11(${JSON.stringify(bad)},${JSON.stringify(bc)},'${id}')`),false,id+' key exclusion');checks++;}
run(`function retro11(smiles,id){const t=retroTarget(retroFromSmiles(smiles));t.edits=[];t.currentTransform=id;return RETRO_TRANSFORMS.find(x=>x.id===id).match(t).some(spec=>{const v=retroTryVerify(spec,t.smiles);return v&&v.outcome.id===id;});}`);
for(const [smiles,id]of [['CNC(=O)NCC','isocyanate-urea'],['CNC(=O)OCC','isocyanate-carbamate'],['CNC(=S)NCC','isothiocyanate-thiourea'],['CCN','isocyanate-hydrolysis'],['CCC#N','aldoxime-dehydration'],['CCC(N)=S','amide-thionation'],['CCSC(N)=[NH2+]','thiourea-s-alkylation'],['CCS','isothiouronium-hydrolysis']]){assert.equal(run(`retro11('${smiles}','${id}')`),true,'Reverse '+id);checks++;}
console.log('Reaction expansion round 5B: '+checks+' focused checks passed.');
