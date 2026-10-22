'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
for(const f of ['smiles','mol','smarts','stereo','descriptors','fingerprints'])Object.assign(global,require('../js/'+f));
const api=require('../js/pharmacology'),pk=require('../js/pk-features'),motifs=require('../js/structural-evidence');
const {PK_MODELS:models}=require('../data/pk-models'),evaluation=require('../validation/pk-model-evaluation.json');
const {PHARMACOLOGY_EVIDENCE:data}=require('../data/pharmacology-evidence'),source=require('../validation/pharmacology-evidence-provenance.json');
const {REFERENCE_MOTIFS:references}=require('../data/reference-motifs');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',f))).digest('hex');
for(const [f,h] of Object.entries(evaluation.sourceSha256))assert.equal(hash(f),h,'Stale model input: '+f);
assert.equal(hash('data/pk-models.js'),evaluation.modelSha256);
assert.equal(hash('tools/build-pharmacology-evidence.py'),source.toolSha256);assert.equal(hash('data/pharmacology-evidence.js'),source.dataSha256);
for(const [f,h] of Object.entries(references.sourceSha256))assert.equal(hash(f),h,'Stale motif source: '+f);
const mol=s=>buildMolecule(parseSmiles(s));
assert.ok(api.exactGraph(mol('CCO'),mol('OCC')));assert.ok(!api.exactGraph(mol('CCO'),mol('COC')));
assert.ok(api.exactGraph(mol('c1ccccc1'),mol('C1=CC=CC=C1')));
assert.ok(!api.exactGraph(mol('[13CH3]CO'),mol('CCO')));
assert.ok(!api.exactGraph(mol('CN'),mol('C[NH3+]')));
assert.ok(!api.exactGraph(mol('N[C@H](C)C(=O)O'),mol('N[C@@H](C)C(=O)O')));
assert.ok(!api.exactGraph(mol('N[C@H](C)C(=O)O'),mol('NC(C)C(=O)O')));
assert.ok(api.relatedGraph(mol('N[C@H](C)C(=O)O'),mol('NC(C)C(=O)O')));
assert.throws(()=>api.halfLife(Number.MIN_VALUE,1e300));
assert.throws(()=>api.ionization(-1e308,1e308,'acid',1));
assert.ok(!api.exactGraph(mol('F/C=C/F'),mol('F/C=C\\F')));
assert.ok(!api.exactGraph(mol('F/C=C/F'),mol('FC=CF')));
for(const r of data.relationships){
 assert.ok(api.prodrugs(mol(r.prodrug.smiles),data).asProdrug.includes(r));
 assert.ok(api.prodrugs(mol(r.active.smiles),data).examplesForActive.includes(r));
 assert.equal(molecularFormula(mol(r.prodrug.smiles)),r.prodrug.formula);
 assert.equal(molecularFormula(mol(r.active.smiles)),r.active.formula);
 assert.ok(r.sourceUrl.startsWith('https://'));
}
assert.equal(api.prodrugs(mol('CCOC(=O)C'),data).asProdrug.length,0,'A cleavable ester alone cannot establish prodrug status');
assert.ok(Math.abs(api.halfLife(10,100)-6.931471805599453)<1e-12);
for(const v of [0,-1,NaN,Infinity,null])assert.throws(()=>api.halfLife(v,10));
for(const kind of ['acid','base']){const p=api.ionization(7.4,7.4,kind,2);assert.equal(p.neutralFraction,.5);assert.ok(Math.abs(p.logD-(2-Math.log10(2)))<1e-12);}
assert.ok(api.ionization(0,7,'acid',1).neutralFraction<1e-6);
assert.ok(Number.isFinite(api.ionization(-1000,1000,'acid',1).logD));
assert.throws(()=>api.ionization(null,7,'base',2));
for(const fixture of evaluation.parity){
 const m=mol(fixture.smiles),feature=pk.features(m,describe(m),fingerprint(m,'ecfp4s'));
 assert.deepEqual(feature.values,fixture.features);
 const model=models.models[fixture.model],pred=model.trees.reduce((s,t)=>s+pk.tree(feature.values,t),0)/model.trees.length;
 assert.ok(Math.abs(pred-fixture.predictionTransformed)<1e-10,'Python/JavaScript tree parity');
}
for(const [id,model] of Object.entries(models.models)){
 const r=evaluation.models[id];if(model.enabled)assert.ok(r.metrics.mae<r.metrics.medianBaselineMae*.95);
 const sets=Object.values(r.partitions).map(part=>new Set(part.map(x=>x.scaffold)));
 for(let i=0;i<sets.length;i++)for(let j=i+1;j<sets.length;j++)assert.ok([...sets[i]].every(x=>!sets[j].has(x)),'Scaffold leakage');
 const huge={values:Array(268).fill(0),bits:Array(256).fill(0)};huge.values[0]=1e8;
 assert.equal(pk.predict(model,huge).available,false,'Withhold domain extrapolation');
}
assert.deepEqual(motifs.detect(mol('c1ccc2[nH]ccc2c1')),['indole']);
assert.ok(motifs.detect(mol('CN(C)CCc1c[nH]c2ccccc12')).includes('tryptamine'));
assert.deepEqual(motifs.reference({name:'Levodopa',smiles:'stale'},references),[]);
const ranking=require('../js/target-ranking');
const entries=[{name:'Indole',smiles:'c1ccc2[nH]ccc2c1'},{name:'Tryptamine',smiles:'NCCc1c[nH]c2ccccc12'},{name:'Ethanol',smiles:'CCO'}];
const targets=[{name:'Synthetic target fixture',gene:'TEST',family:'GPCR',organism:'Human',ligands:entries.map(x=>x.name)}];
const engine={parse:mol,fingerprint,tanimoto,dice},plain=ranking.createIndex(entries,targets,engine);
const enriched=ranking.createIndex(entries,targets,{...engine,referenceMotifs:e=>motifs.detect(mol(e.smiles)),queryMotifs:motifs.detect});
const q=mol('c1ccc2[nH]ccc2c1'),a=ranking.rank(ranking.query(q,plain),plain,{}),b=ranking.rank(ranking.query(q,enriched),enriched,{});
assert.equal(a[0].rankScore,b[0].rankScore,'Do not add an unvalidated motif affinity bonus');
assert.equal(b[0].motifEvidence.find(x=>x.id==='indole').support,2);
assert.ok(!('action' in b[0]),'No functional action inferred from motifs');
console.log('Pharmacology: source freshness, conservative graph identity/stereo, prodrug relations, conditional equations, leakage guards, model parity/domain and motif support passed');
