'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
const scripts=['elements','graph','valence','stereo','naming-core','naming-chain','naming-ring','naming-scaffolds','naming-general','common-names-extra','naming-elements','properties','layout','smiles','reactions','molecular-identity','reaction-stereo','reaction-rules','reaction-rules-extra','reaction-rules-extra2','reaction-aromatic','reaction-rules-extra3','reaction-rules-extra4','reaction-rules-extra5','reaction-rules-extra6','reaction-rules-extra7','reaction-rules-extra8','reaction-rules-extra9','reaction-rules-extra13','reaction-catalog','retro-stock','retro','retro-families-extra8'];
scripts.forEach(n=>vm.runInContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'),ctx,{filename:n}));const run=c=>vm.runInContext(c,ctx);
run(`function h13(ss,c,id,target){const r=predictReaction(ss.map((smiles,i)=>({smiles,fragment:smilesToFragment(smiles),role:i?'reagent':'reactant'})),{...defaultReactionConditions(),...c});return [r.best,...r.alternatives].filter(Boolean).some(o=>o.id===id&&(!target||o.products.some(p=>moleculeSame(p.isomericSmiles||p.smiles,target))));}`);
const k={solvents:['thf'],additives:['nicl2dppp'],atmosphere:'n2',temperature:25},s={solvents:['nmp'],additives:['pdc','cui','asph3'],atmosphere:'n2',temperature:100};
let checks=0;const check=(ss,c,id,target,want=true)=>{assert.equal(run(`h13(${JSON.stringify(ss)},${JSON.stringify(c)},${JSON.stringify(id)},${JSON.stringify(target)})`),want,ss.join(' + '));checks++;};
check(['Brc1ccccn1','Br[Mg]c1ccccc1'],k,'kumada','c1ccc(-c2ccccn2)cc1');
check(['Brc1ccsc1','Br[Mg]c1ccccc1'],k,'kumada','c1ccc(-c2ccsc2)cc1');
check(['Brc1ccccc1','Br[Mg]c1cccs1'],k,'kumada','c1ccc(-c2cccs2)cc1');
check(['Ic1ccccc1','CCCC[Sn](CCCC)(CCCC)c1cccs1'],s,'stille','c1ccc(-c2cccs2)cc1');
check(['Brc1cc[nH]c1','Br[Mg]c1ccccc1'],k,'kumada',null,false);
check(['Brc1ccoc1','Br[Mg]c1ccccc1'],k,'kumada',null,false);
check(['Brc1ccc(C=O)cn1','Br[Mg]c1ccccc1'],k,'kumada',null,false);
check(['Brc1ccccn1','Br[Zn]c1ccccc1'],{solvents:['thf'],additives:['pdpph3'],atmosphere:'n2'},'negishi',null,false);
for(const [target,id]of [['c1ccc(-c2ccccn2)cc1','kumada'],['c1ccc(-c2cccs2)cc1','stille']]){
 assert.equal(run(`(()=>{const t=retroTarget(retroFromSmiles('${target}'));t.edits=[];t.currentTransform='${id}';return RETRO_TRANSFORMS.find(x=>x.id==='${id}').match(t).some(p=>{const v=retroTryVerify(p,t.smiles);return v&&v.outcome.id==='${id}';});})()`),true,id+' heteroaryl reverse');checks++;
}
console.log('Heteroaryl coupling: '+checks+' focused checks passed.');
