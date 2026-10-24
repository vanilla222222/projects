'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console});
for(const name of ['smiles','mol','smarts','stereo','transform','pharmacology','pk-applicability','analogue-candidates'])vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);run('function generate(s,options){return AnalogueCandidates.generate(buildMolecule(parseSmiles(s)),options);}');
const fixtures=['c1ccccc1','Oc1ccccc1','COc1ccccc1','CCOc1ccccc1','COc1cc(OC)cc(NCCO)c1','CNCCO','CCO','CCCl','CCBr','CC(=O)O','CC(=O)N','CC(=S)N','CCS','c1cc[nH]c1','c1ncc[nH]1','c1ccoc1','c1ccsc1','c1ccncc1','C[NH2+]Cc1ccccc1','C[NH3+]','[13CH3]c1ccccc1','[13CH3]Oc1ccccc1','[18OH]CC','c1cc[13cH]cc1','N[C@H](C)c1ccccc1','C[C@H](O)c1ccccc1','C/C=C/c1ccccc1','C/C=C\\c1ccccc1','C[C@H]1CC[C@@H](O)CC1C','CN1CCOCC1'];
const reports=[];
for(const smiles of fixtures){ctx.input=smiles;const result=JSON.parse(run('JSON.stringify(generate(input,{limit:100}))'));assert.ok(result.rows.length>0,smiles+': '+result.reasons.join(' '));assert.ok(run('(()=>{const p=buildMolecule(parseSmiles(input)),before=JSON.stringify(p);AnalogueCandidates.generate(p);return before===JSON.stringify(p);})()'),'Immutable input '+smiles);assert.ok(result.rows.every(r=>!r.experimentalValidation&&r.site.atom>=0&&r.family&&r.operation));assert.ok(result.coverage.attempted<=400&&result.rows.length<=100);reports.push({parent:smiles,report:result});}
assert.equal(run("generate('c1ccccc1').rows.length"),11,'Symmetry-equivalent benzene positions deduplicate across ten substituents plus ring nitrogen');
for(const smiles of ['CC','CCO.O','[CH2]c1ccccc1','[Na+]','C[19F]','C[C@H]1CC[C@@H](O)CC1']){ctx.input=smiles;assert.equal(run('generate(input).rows.length'),0,smiles);}
assert.equal(run("generate('Oc1ccccc1',{limit:2}).rows.length"),2);assert.equal(run("generate('c1ccccc1',{limit:0}).rows.length"),0);assert.equal(run('AnalogueCandidates.generate(null).rows.length'),0);
assert.equal(run("generate('CC(=O)N',{families:['amine']}).rows.length"),0,'Amide N is not treated as an ordinary amine');
assert.equal(run("generate('CC(=O)O',{families:['oxygen']}).rows.length"),0,'Acid ester changes stay in their explicit acid family');
assert.equal(run("generate('COc1ccccc1',{families:['ether']}).rows.length"),3,'Methoxy handles are explicitly compatible');
assert.ok(run("generate('COc1ccccc1',{atom:0}).rows.every(r=>r.site.atom===0)"),'Original-input site selection');assert.equal(run("generate('CCO',{families:['invented']}).rows.length"),0);
assert.ok(run("(()=>{const a=generate('COc1ccccc1',{limit:25}).rows,b=generate('COc1ccccc1',{limit:30}).rows;return b.length===30&&a.every((r,i)=>r.smiles===b[i].smiles);})()"),'Larger deterministic batches retain the first 25');
if(process.argv.includes('--json'))console.log(JSON.stringify(reports));else console.log('Analogue engine: 30 fixtures, 11 edit families, symmetry, site/family filters, isotope/stereo guards, immutable inputs and bounded deterministic sampling passed.');
