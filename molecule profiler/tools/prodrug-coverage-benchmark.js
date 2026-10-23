'use strict';
// Run with a historical baseline ref, e.g. node tools/prodrug-coverage-benchmark.js 60699dbe.
// Reports generation coverage on a deterministic sample, not biological validation.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const root=path.join(__dirname,'..'),repo=path.join(root,'..'),baseline=process.argv[2];
if(!baseline)throw Error('Supply a baseline Git ref; its commit must be available locally.');
function context(code){
 const c=vm.createContext({console});
 for(const name of ['smiles','mol','smarts','stereo','transform','pharmacology'])vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),c);
 vm.runInContext(code,c);vm.runInContext(fs.readFileSync(path.join(root,'data/library.js'),'utf8'),c);return c;
}
const before=context(cp.execFileSync('git',['show',baseline+':molecule profiler/js/prodrug-candidates.js'],{cwd:repo,encoding:'utf8'}));
const after=context(fs.readFileSync(path.join(root,'js/prodrug-candidates.js'),'utf8'));
const stats={baseline,sample:200,before:0,after:0,gained:0,lost:0};
for(let i=0;i<stats.sample;i++){
 const code=`(()=>{const row=LIBRARY[Math.floor(${i}*LIBRARY.length/${stats.sample})];try{return ProdrugCandidates.generate(buildMolecule(parseSmiles(row.smiles)),{limit:1}).rows.length>0;}catch(_){return false;}})()`;
 const b=vm.runInContext(code,before),a=vm.runInContext(code,after);stats.before+=+b;stats.after+=+a;stats.gained+=+(!b&&a);stats.lost+=+(b&&!a);
}
console.log(JSON.stringify(stats,null,2));
