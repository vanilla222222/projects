'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');for(const name of ['smiles','mol','smarts','stereo','descriptors','rules','pharmacology','input-workflow','prediction-benchmarks'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'));
const job=JSON.parse(fs.readFileSync(0,'utf8'));const report=PredictionBenchmarks.evaluateRows(job.rows,job.endpoint,{maxRows:10000});
console.log(JSON.stringify(report));
