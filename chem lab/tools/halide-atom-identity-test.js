'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});
let checks=0;const check=(c,e,label)=>{assert.equal(vm.runInContext(c,ctx),e,label);checks++;};
vm.runInContext(`function halideFixture(inputs,id,conditions={}){const compounds=inputs.map((smiles,i)=>({smiles,fragment:smilesToFragment(smiles),role:i?'reagent':'reactant'})),before=JSON.stringify(compounds),p=predictReaction(compounds,{...defaultReactionConditions(),...conditions});return {out:[p.best,...p.alternatives].find(o=>o&&o.id===id),unchanged:before===JSON.stringify(compounds)};}`,ctx);
// Fixed endpoints: replacement of oxygen is not elemental transmutation.
for(const [inputs,id,expected,conditions] of [
 [['CC[18OH]','O=S(Cl)Cl'],'alcohol-halide','CCCl',{}],
 [['C[13CH2][18OH]','P(Br)(Br)Br'],'alcohol-halide','C[13CH2]Br',{}],
 [['CC[18OH]','Br'],'alcohol-halide','CCBr',{}],
 [['CC(=[18O])[17OH]','O=S(Cl)Cl'],'acid-chloride','CC(=[18O])Cl',{}],
 [['CC(=O)[17OH]','O=C(Cl)C(=O)Cl'],'acid-chloride','CC(=O)Cl',{}],
 [['CC[18OH]','P(c1ccccc1)(c1ccccc1)c1ccccc1','ClC(Cl)(Cl)Cl'],'appel','CCCl',{}],
 [['C[C@H]([18OH])CC','P(Br)(Br)Br'],'alcohol-halide','C[C@@H](Br)CC',{}],
 [['C[C@@H]([18OH])CC','P(Br)(Br)Br'],'alcohol-halide','C[C@H](Br)CC',{}],
 [['C[C@H]([18OH])CC','O=S(Cl)Cl'],'alcohol-halide','C[C@H](Cl)CC',{}],
 [['C[C@H]([18OH])CC','O=S(Cl)Cl','n1ccccc1'],'alcohol-halide','C[C@@H](Cl)CC',{}],
 [['C[C@H]([18OH])C[C@H](F)C','P(c1ccccc1)(c1ccccc1)c1ccccc1','BrC(Br)(Br)Br'],'appel','C[C@@H](Br)C[C@H](F)C',{}],
 [['CC([18OH])C(C)C','Br'],'alcohol-halide','CCC(Br)(C)C',{}],
 [['[18OH]CC[17OH]','O=S(Cl)Cl'],'alcohol-halide','ClCCCl',{}]
]){Object.assign(ctx,{inputs,id,expected,conditions});
 check('!!halideFixture(inputs,id,conditions).out',true,'Rule available '+inputs.join(' / '));
 check('halideFixture(inputs,id,conditions).out.products.some(p=>moleculeSame(p.isomericSmiles||p.smiles,expected))',true,'Fixed isotope/stereo endpoint '+inputs[0]+' / '+id);
 check('halideFixture(inputs,id,conditions).unchanged',true,'No input mutation '+inputs[0]);
 check("halideFixture(inputs,id,conditions).out.products.every(p=>!/(?:17|18)(?:Cl|Br|I)/.test(p.isomericSmiles||p.smiles))",true,'Oxygen isotope does not transfer to halogen');
}
check("halideFixture(['CC([18OH])C(C)C','Br'],'alcohol-halide').out.minor.some(p=>moleculeSame(p.isomericSmiles||p.smiles,'CC(Br)C(C)C'))",true,'Rearrangement keeps the unrearranged alternative');
console.log('Halide atom identity: '+checks+' checks passed.');
