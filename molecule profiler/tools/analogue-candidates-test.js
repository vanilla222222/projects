'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console});
for(const name of ['smiles','mol','smarts','stereo','transform','pharmacology','pk-applicability','analogue-edit-extensions','analogue-candidates'])vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);run('function generate(s,options){return AnalogueCandidates.generate(buildMolecule(parseSmiles(s)),options);}');
const fixtures=['c1ccccc1','Oc1ccccc1','COc1ccccc1','CCOc1ccccc1','COc1cc(OC)cc(NCCO)c1','CNCCO','CCO','CCCl','CCBr','CC(=O)O','CC(=O)N','CC(=S)N','CCS','c1cc[nH]c1','c1ncc[nH]1','c1ccoc1','c1ccsc1','c1ccncc1','C[NH2+]Cc1ccccc1','C[NH3+]','[13CH3]c1ccccc1','[13CH3]Oc1ccccc1','[18OH]CC','C[19F]','c1cc[13cH]cc1','N[C@H](C)c1ccccc1','C[C@H](O)c1ccccc1','C/C=C/c1ccccc1','C/C=C\\c1ccccc1','C[C@H]1CC[C@@H](O)CC1C','CN1CCOCC1'];
const reports=[];
for(const smiles of fixtures){ctx.input=smiles;const result=JSON.parse(run('JSON.stringify(generate(input,{limit:100}))'));assert.ok(result.rows.length>0,smiles+': '+result.reasons.join(' '));assert.ok(run('(()=>{const p=buildMolecule(parseSmiles(input)),before=JSON.stringify(p);AnalogueCandidates.generate(p);return before===JSON.stringify(p);})()'),'Immutable input '+smiles);assert.ok(result.rows.every(r=>!r.experimentalValidation&&r.site.atom>=0&&r.family&&r.operation));assert.ok(result.coverage.attempted<=400&&result.rows.length<=100);reports.push({parent:smiles,report:result});}
assert.equal(run("generate('c1ccccc1',{families:['aryl','aza']}).rows.length"),11,'Symmetry-equivalent benzene positions deduplicate across ten substituents plus ring nitrogen');
for(const smiles of ['CCO.O','[CH2]c1ccccc1','[Na+]','C[C@H]1CC[C@@H](O)CC1']){ctx.input=smiles;assert.equal(run('generate(input).rows.length'),0,smiles);}
assert.equal(run("generate('Oc1ccccc1',{limit:2}).rows.length"),2);assert.equal(run("generate('c1ccccc1',{limit:0}).rows.length"),0);assert.equal(run('AnalogueCandidates.generate(null).rows.length'),0);
assert.equal(run("generate('CC(=O)N',{families:['amine']}).rows.length"),0,'Amide N is not treated as an ordinary amine');
assert.equal(run("generate('CC(=O)O',{families:['oxygen']}).rows.length"),0,'Acid ester changes stay in their explicit acid family');
assert.equal(run("generate('COc1ccccc1',{families:['ether']}).rows.length"),3,'Methoxy handles are explicitly compatible');
assert.ok(run("generate('COc1ccccc1',{atom:0}).rows.every(r=>r.sites.some(s=>s.atom===0))"),'Original-input site selection');assert.equal(run("generate('CCO',{families:['invented']}).rows.length"),0);
assert.ok(run("(()=>{const a=generate('COc1ccccc1',{limit:25}).rows,b=generate('COc1ccccc1',{limit:30}).rows;return b.length===30&&a.every((r,i)=>r.smiles===b[i].smiles);})()"),'Larger deterministic batches retain the first 25');
const extraFixtures={carbon:'CC(O)CC',dialkyl:'CCCN',noxygen:'CCCN',homologue:'CCCCO',arylExpanded:'c1ccccc1',arylExchange:'Clc1ccc(C(=O)O)cc1',regio:'COc1ccc(C(=O)O)cc1',dealkoxy:'COc1ccccc1',paired:'c1ccccc1',fiveRing:'CC(=O)c1ccccc1',fusion:'c1ccccc1'};
for(const [family,parent]of Object.entries(extraFixtures)){ctx.input=parent;ctx.family=family;const report=JSON.parse(run('JSON.stringify(generate(input,{families:[family],limit:100}))'));assert.ok(report.rows.length>0,family+': '+report.reasons);assert.ok(report.rows.every(r=>r.family===family&&r.changes&&r.sites.length));reports.push({parent,report});}
assert.ok(run("generate('c1ccccc1',{families:['arylExpanded'],limit:100}).rows.some(r=>r.edit.startsWith('Nitro'))"),'Nitro attachment consumes its explicit substitutable N–H, leaving a valid nitro group');
assert.ok(run("generate('CCCCO',{families:['homologue'],limit:100}).rows.some(r=>r.changes.kind==='contract')"),'Contraction is available independently of insertion');
assert.equal(run("generate('CC(=O)N',{families:['dialkyl','noxygen']}).rows.length"),0,'Amides are not ordinary amines');
assert.equal(run("generate('COc1ccccc1',{families:['regio']}).rows.length"),0,'Symmetry-equivalent relocations do not generate the parent');
assert.ok(run("generate('COc1ccc(C(=O)O)cc1',{families:['regio']}).rows.length>=2"),'Substituted aromatic inputs expose distinct alkoxy locations');
assert.ok(run("generate('c1ccccc1',{families:['paired'],atom:3,limit:100}).rows.every(r=>r.sites.some(s=>s.atom===3))"),'Secondary sites are selectable for paired changes');
ctx.input='C[C@H](O)C(=O)Oc1ccccc1';const chiralRing=JSON.parse(run("JSON.stringify(generate(input,{families:['fiveRing','fusion','dealkoxy'],limit:100}))"));assert.ok(chiralRing.rows.length);assert.ok(chiralRing.rows.every(r=>r.smiles.includes('@')));reports.push({parent:ctx.input,report:chiralRing});
assert.equal(run("generate('CC(=O)Oc1ccccc1',{families:['regio']}).rows.length"),0,'Aryl esters are not alkoxy relocation sites');
assert.equal(run("generate('c1ccc2c(c1)OCO2',{families:['regio','dealkoxy']}).rows.length"),0,'Ring-tethered ethers are not pendant branches');
ctx.input='O=C(O)c1ccc(Cl)cc1';const haloRegio=JSON.parse(run("JSON.stringify(generate(input,{families:['regio','arylExchange'],limit:100}))"));assert.ok(haloRegio.rows.some(r=>r.changes.kind==='relocate'));assert.ok(haloRegio.rows.some(r=>r.changes.kind==='removeBranch'));reports.push({parent:ctx.input,report:haloRegio});
if(process.argv.includes('--json'))console.log(JSON.stringify(reports));else console.log('Analogue engine: general and historical fixtures, 22 edit families, symmetry, site/family filters, isotope/stereo guards, immutable inputs and bounded deterministic sampling passed.');
