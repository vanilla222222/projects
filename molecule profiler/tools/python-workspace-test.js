'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.PROFILER_JSDOM_PATH||'jsdom'),root=path.resolve(__dirname,'..');
const dom=new JSDOM('<script src="js/python-kernel.js"></script><div id="results"><div class="grid"></div></div>',{runScripts:'outside-only',url:'https://example.test/molecule%20profiler/'}),w=dom.window,ctx=dom.getInternalVMContext();
let snapshot=null,pendingRun=null,terminated=0;
w.PharmacologyUI={render:r=>{snapshot={inputSmiles:r.smiles,candidateComparison:{rows:[{name:'Design',smiles:'CCOC',properties:{mw:74}}]}};},getSnapshot:()=>snapshot};
class FakeWorker{postMessage(m){if(m.type==='init')queueMicrotask(()=>this.onmessage({data:{id:m.id,type:'done',versions:{python:'3.13.2',pyodide:'0.29.3'}}}));else pendingRun={worker:this,m};}terminate(){terminated++;}}
w.Worker=FakeWorker;w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};
for(const file of ['js/python-kernel.js','js/python-workspace-ui.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
const el=id=>w.document.getElementById(id),tick=()=>new Promise(r=>setTimeout(r,0));
function finish(text='test output\n'){const {worker,m}=pendingRun;worker.onmessage({data:{id:m.id,type:'output',text,stream:'stdout'}});worker.onmessage({data:{id:m.id,type:'done'}});}
(async()=>{try{
 w.PharmacologyUI.render({name:'First',smiles:'CCO',d:{formula:'C2H6O',mw:46}});el('python-code').value="print(query_smiles)";el('python-run').click();await tick();assert.equal(pendingRun.m.context.molecule.smiles,'CCO');assert.equal(pendingRun.m.context.candidates.length,1);finish();await tick();assert.equal(snapshot.pythonExperiment.input.molecule.smiles,'CCO');assert.equal(snapshot.pythonExperiment.code,"print(query_smiles)");assert.match(el('python-output').textContent,/test output/);
 el('python-run').click();await tick();assert.ok(!('pythonExperiment' in pendingRun.m.context.evidence),'Previous experiment is not recursively copied');w.PharmacologyUI.render({name:'Second',smiles:'CCC',d:{mw:44}});finish('old structure result\n');await tick();assert.equal(snapshot.pythonExperiment,undefined,'Stale input run is not attached to new structure');assert.equal(w.PythonWorkspaceUI.getLastRun().input.molecule.smiles,'CCO');
 el('python-run').click();await tick();const old=pendingRun;el('python-stop').click();await tick();assert.ok(terminated>0);assert.equal(el('python-run').disabled,false);old.worker.onmessage({data:{id:old.m.id,type:'done'}});assert.equal(snapshot.pythonExperiment,undefined);assert.equal(el('python-code').value,"print(query_smiles)");
 el('python-run').click();await tick();finish('fresh\n');await tick();assert.equal(snapshot.pythonExperiment.input.molecule.smiles,'CCC');el('python-reset').click();assert.match(el('python-status').textContent,/Reset/);
 console.log('Python UI passed: exact input capture, notebook snapshot, recursive-copy prevention, stale-input handling, stop, restart and reset.');
}finally{w.PythonWorkspaceUI.stop();w.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
