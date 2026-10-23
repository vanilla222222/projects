'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console});
for(const name of ['smiles','mol','smarts','stereo','transform','pharmacology','pk-applicability','analogue-candidates'])vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run('function generate(s,options){return AnalogueCandidates.generate(buildMolecule(parseSmiles(s)),options);}');
assert.equal(run("generate('c1ccccc1').rows.length"),3,'Symmetry-equivalent sites deduplicate');
for(const smiles of ['Oc1ccccc1','C[NH2+]Cc1ccccc1','[13CH3]c1ccccc1','N[C@H](C)c1ccccc1','CCCl','C/C=C/c1ccccc1','C/C=C\\c1ccccc1']){
 ctx.input=smiles;assert.ok(run('generate(input).rows.length')>0,smiles);
 assert.ok(run(`(()=>{const p=buildMolecule(parseSmiles(input)),before=JSON.stringify(p),r=AnalogueCandidates.generate(p);return before===JSON.stringify(p)&&r.rows.every(x=>!x.experimentalValidation)&&r.rows.every((a,i)=>r.rows.slice(i+1).every(b=>!Pharmacology.exactGraph(buildMolecule(parseSmiles(a.smiles)),buildMolecule(parseSmiles(b.smiles)))));})()`));
}
assert.ok(run("generate('[13CH3]c1ccccc1').rows.every(r=>r.smiles.includes('[13C'))"));
assert.ok(run("generate('N[C@H](C)c1ccccc1').rows.every(r=>r.smiles.includes('@'))"));
for(const smiles of ['CCO','CCO.O','[CH2]c1ccccc1','[Na+]','C[19F]']){ctx.input=smiles;assert.equal(run('generate(input).rows.length'),0,smiles);}
assert.equal(run("generate('Oc1ccccc1',{limit:2}).rows.length"),2);
assert.equal(run("generate('c1ccccc1',{limit:0}).rows.length"),0);
assert.equal(run('AnalogueCandidates.generate(null).rows.length'),0);
console.log('Analogues: symmetry, ionic inputs, isotope/stereo retention, immutable input, unsupported chemistry and limits passed.');
