'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
const scripts=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g)].map(m=>m[1].split('?')[0]).filter(f=>f!=='js/app.js');
scripts.forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));
let checks=0;
for(const smiles of ['C[N+](C)(C)[O-]','C[N+]1([O-])CCOCC1','[O-][n+]1ccccc1','C[N+](=O)[O-]','[O-][N+](=O)c1ccccc1']){
 ctx.input=smiles;
 const result=vm.runInContext(`(()=>{const g=reactionFragmentGraph(smilesToFragment(input)),p=computeProperties(g,g.atoms.map(a=>a.id));return {charges:g.atoms.filter(a=>a.charge).map(a=>a.element+':'+a.charge).sort(),net:p.charge,roundtrip:moleculeSame(input,p.isomericSmiles||p.smiles)};})()`,ctx);
 assert.deepEqual(Array.from(result.charges),['N:1','O:-1'],smiles+' charges preserved');checks++;
 assert.equal(result.net,0,smiles+' net charge');checks++;
 assert.equal(result.roundtrip,true,smiles+' export identity');checks++;
}
assert.equal(vm.runInContext(`(()=>{const c=[{smiles:'CCC#N',fragment:smilesToFragment('CCC#N'),role:'reactant'},{smiles:'OO',fragment:smilesToFragment('OO'),role:'reagent'}],r=predictReaction(c,{...defaultReactionConditions(),solvents:['dmso','water'],additives:['naoh'],temperature:20});const os=[r.best,...r.alternatives].filter(Boolean);return os.some(o=>o.id==='nitrile-peroxide-hydration')&&!os.some(o=>o.id==='nitrile-hydrolysis');})()`,ctx),true,'Cold selective peroxide hydration does not also assert exhaustive acid hydrolysis');checks++;
console.log('SMILES charge and selective endpoint regression: '+checks+' checks passed.');
