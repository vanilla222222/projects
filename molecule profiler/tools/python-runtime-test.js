'use strict';
const {Worker}=require('node:worker_threads'),path=require('node:path'),assert=require('node:assert/strict');
const worker=new Worker(`const {parentPort,workerData}=require('node:worker_threads');const {pathToFileURL,fileURLToPath}=require('node:url');global.self=global;self.location={href:pathToFileURL(workerData).href};self.postMessage=m=>parentPort.postMessage(m);global.importScripts=u=>{const api=require(fileURLToPath(u));global.loadPyodide=opts=>api.loadPyodide({...opts,indexURL:fileURLToPath(opts.indexURL)});};require('node:vm').runInThisContext(require('node:fs').readFileSync(workerData,'utf8'),{filename:workerData});parentPort.on('message',data=>self.onmessage({data}));`,{eval:true,workerData:path.resolve(__dirname,'../js/python-worker.js')});
let sequence=0;
function request(type,data={}){const id=++sequence;let output='';return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{worker.terminate();reject(Error('Test timed out'));},30000);const message=m=>{if(m.id!==id)return;if(m.type==='output')output+=m.text;else{cleanup();resolve({...m,output});}};const error=e=>{cleanup();reject(e);};function cleanup(){clearTimeout(timer);worker.off('message',message);worker.off('error',error);}worker.on('message',message);worker.on('error',error);worker.postMessage({id,type,...data});});}
(async()=>{try{
 const init=await request('init');assert.equal(init.type,'done',JSON.stringify(init));assert.equal(init.versions.pyodide,'0.29.3');assert.match(init.versions.python,/^3\.13\./);
 const context={molecule:{name:'Aspirin',smiles:'CC(=O)Oc1ccccc1C(=O)O',descriptors:{formula:'C9H8O4'}},candidates:[{properties:{mw:200}},{properties:{mw:220}}],evidence:{source:'test'}};
 const run=await request('run',{context,code:"import statistics\nsaved_value = 42\nprint(molecule['descriptors']['formula'])\nprint(statistics.mean(c['properties']['mw'] for c in candidates))"});assert.equal(run.type,'done');assert.match(run.output,/C9H8O4\n210/);
 const next=await request('run',{context:{...context,molecule:{...context.molecule,name:'Changed'}},code:"print(saved_value)\nprint(molecule['name'])\nmolecule['name']='Edited in Python'"});assert.match(next.output,/42\nChanged/);assert.equal(context.molecule.name,'Aspirin');
 const error=await request('run',{context,code:"raise ValueError('Expected test error')"});assert.equal(error.type,'error');assert.match(error.message,/Expected test error/);
 assert.match((await request('run',{context,code:'print(saved_value + 1)'})).output,/43/);
 const capped=await request('run',{context,code:"print('x' * 150000)"});assert.ok(capped.output.length<=100100);assert.match(capped.output,/Output limited/);
 worker.postMessage({id:++sequence,type:'run',context,code:'while True: pass'});await new Promise(r=>setTimeout(r,100));await worker.terminate();
 console.log('Actual browser-worker CPython WASM passed: execution, copied data, persistence, errors, output cap and infinite-loop termination.');
}finally{await worker.terminate();}})().catch(e=>{console.error(e);process.exitCode=1;});
