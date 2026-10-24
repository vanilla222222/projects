'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.join(__dirname,'..');for(const n of ['smiles','mol','smarts','stereo','descriptors','rules','pharmacology','input-workflow','prediction-benchmarks'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const b=PredictionBenchmarks;let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const result=b.evaluateRows([{smiles:'CCO',observed:1},{smiles:'OCC',observed:1},{smiles:'CC',observed:0},{smiles:'C[NH3+]',observed:1},{smiles:'invalid',observed:0},{smiles:'CCC',observed:''},{smiles:'CO',observed:0},{smiles:'OC',observed:1}], 'bbb');
ok(result.inputRows===8&&result.scored===2&&result.abstained===1&&result.excluded===5,'Explicit counts include exact duplicates, conflicts, malformed labels, charge and parse errors');
ok(result.rows.filter(r=>r.reason?.includes('Conflicting')).length===2,'All conflicting exact-graph records excluded');
ok(result.rows[0].status==='scored'&&result.rows[1].predicted===null,'Exact duplicate scored only once');
const c=b.classification([{observed:1,predicted:1},{observed:1,predicted:0},{observed:0,predicted:0},{observed:0,predicted:1}]);
ok(c.accuracy===.5&&c.sensitivity===.5&&c.specificity===.5&&c.balancedAccuracy===.5&&c.mcc===0,'Confusion matrix and balanced metrics');
ok(c.accuracy95CI[0]<.5&&c.accuracy95CI[1]>.5,'Binomial confidence interval encloses estimate');
ok(b.classification([{observed:1,predicted:1}]).balancedAccuracy===null&&b.classification([{observed:1,predicted:1}]).mcc===null,'Undefined single-class metrics remain null');
const r=b.regression([{observed:1,predicted:2},{observed:3,predicted:2}]);ok(r.mae===1&&r.rmse===1&&r.bias===0&&r.r2===0,'Regression metrics');
ok(b.regression([])===null&&b.regression([{observed:1,predicted:1}]).r2===null,'Empty or constant observations do not fabricate R²');
ok(b.parseCSV('smiles,observed,name\nCCO,1,"A, B"')[0].name==='A, B','CSV quoting preserves names');
assert.throws(()=>b.parseCSV('smiles,observed,smiles\nCCO,1,C'),/Unique/);checks++;
assert.throws(()=>b.parseCSV('smiles,observed\nCCO,'+'1\nCCO,1'.repeat(501)),/Maximum/);checks++;
assert.throws(()=>b.evaluateRows([], 'logD'),/Choose/);checks++;
ok(b.evaluateRows([{smiles:'CCO',observed:2}], 'bbb').excluded===1,'BBB labels must be exactly binary');
ok(b.evaluateRows([{smiles:'CCO',observed:0}], 'logS').scored===1,'Zero is a valid measured value');
const report=JSON.parse(fs.readFileSync(path.join(root,'validation/independent-benchmarks.json')));
for(const [name,hash] of Object.entries(report.sourceHashes)){ok(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex')===hash,'Report model hash matches '+name);}
for(const d of report.datasets){const r=d.result;ok(r.scored+r.excluded+r.abstained===r.inputRows&&r.metrics.n===r.scored,'Published benchmark counts are consistent');}
ok(report.datasets.find(d=>d.id==='bbbp').result.metrics.accuracy<report.datasets.find(d=>d.id==='bbbp').result.metrics.majorityBaseline,'Weak overall BBB accuracy is retained honestly');
console.log('Prediction benchmarks: '+checks+' checks passed.');
