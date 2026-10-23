'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
const scripts=['elements','graph','valence','stereo','naming-core','naming-chain','naming-ring','naming-scaffolds','naming-general','common-names-extra','naming-elements','properties','layout','smiles','reactions','molecular-identity','reaction-stereo','reaction-rules','reaction-rules-extra','reaction-rules-extra2','reaction-aromatic','reaction-rules-extra3','reaction-rules-extra4','reaction-rules-extra5','reaction-rules-extra6','reaction-rules-extra7','reaction-rules-extra8','reaction-rules-extra9','reaction-rules-extra13','reaction-catalog','retro-stock','retro','retro-families-extra8'];
scripts.forEach(n=>vm.runInContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'),ctx,{filename:n}));const run=c=>vm.runInContext(c,ctx);
run(`function q13(ss,c){const r=predictReaction(ss.map((smiles,i)=>({smiles,fragment:smilesToFragment(smiles),role:i?'reagent':'reactant',equiv:1})),{...defaultReactionConditions(),...c});return [r.best,...r.alternatives].filter(Boolean);}`);
let checks=0;
for(const [id,donor,conditions]of [
 ['negishi','Br[Zn]c1ccccc1',{solvents:['thf'],additives:['pdpph3'],atmosphere:'n2',temperature:25}],
 ['kumada','Br[Mg]c1ccccc1',{solvents:['thf'],additives:['nicl2dppp'],atmosphere:'n2',temperature:25}],
 ['stille','C[Sn](C)(C)c1ccccc1',{solvents:['nmp'],additives:['pdc','cui','asph3'],atmosphere:'n2',temperature:100}],
]){
 ctx.id=id;ctx.donor=donor;ctx.conditions=conditions;
 assert.equal(run(`q13(['Brc1ccc(C)cc1',donor],conditions).some(o=>o.id===id&&o.products.some(p=>moleculeSame(p.isomericSmiles||p.smiles,'Cc1ccc(-c2ccccc2)cc1')))`),true,id+' product');checks++;
 assert.equal(run(`q13(['Brc1ccc(O)cc1',donor],conditions).some(o=>o.id===id)`),false,id+' excludes protic substrate');checks++;
 assert.equal(run(`(()=>{const t=retroTarget(retroFromSmiles('Cc1ccc(-c2ccccc2)cc1'));t.edits=[];t.currentTransform=id;return RETRO_TRANSFORMS.find(x=>x.id===id).match(t).some(s=>{const v=retroTryVerify(s,t.smiles);return v&&v.outcome.id===id;});})()`),true,id+' reverse forward-verifies');checks++;
}
assert.equal(run(`q13(['Brc1ccccc1','C[Sn](C)(C)C'],{solvents:['nmp'],additives:['pdc','cui','asph3'],temperature:100,atmosphere:'n2'}).some(o=>o.id==='stille')`),false,'tetramethyltin has no selected aryl transfer');checks++;
console.log('Cross-coupling expansion: '+checks+' focused checks passed.');
