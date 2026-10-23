'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
const modules=['elements','graph','valence','stereo','naming-core','naming-chain','naming-ring','naming-scaffolds','naming-general','common-names-extra','naming-elements','properties','layout','smiles','reactions','molecular-identity','reaction-stereo','reaction-rules','reaction-rules-extra','reaction-rules-extra2','reaction-aromatic','reaction-rules-extra3','reaction-rules-extra4','reaction-rules-extra5','reaction-rules-extra6','reaction-rules-extra7','reaction-rules-extra8','reaction-rules-extra9','reaction-rules-extra12','reaction-catalog','retro-stock','retro','retro-families-extra7'];
modules.forEach(n=>vm.runInContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'),ctx,{filename:n}));const run=c=>vm.runInContext(c,ctx);
run(`function lactam(s,additives=['dcc']){const r=predictReaction([{smiles:s,fragment:smilesToFragment(s),role:'reactant'}],{...defaultReactionConditions(),solvents:['dmf'],additives});return [r.best,...r.alternatives].filter(Boolean).find(o=>o.id==='amino-acid-lactamization');}`);
let checks=0;for(const [s,p]of [['NCCCC(=O)O','O=C1CCCN1'],['NCCCCC(=O)O','O=C1CCCCN1']]){assert.equal(run(`(()=>{const o=lactam('${s}');return !!o&&o.products.some(p=>moleculeSame(p.isomericSmiles||p.smiles,'${p}'));})()`),true);checks++;}
assert.equal(run(`!!lactam('NCCCC(=O)O',[])`),false);checks++;
assert.equal(run(`!!lactam('NCC(=O)O')`),false);checks++;
assert.equal(run(`!!lactam('NCC[C@H](C)C(=O)O')`),false);checks++;
assert.equal(run(`(()=>{const t=retroTarget(retroFromSmiles('O=C1CCCN1'));t.edits=[];t.currentTransform='amino-acid-lactamization';return RETRO_TRANSFORMS.find(x=>x.id===t.currentTransform).match(t).some(s=>!!retroTryVerify(s,t.smiles));})()`),true);checks++;
console.log('Lactamization: '+checks+' focused checks passed.');
