'use strict';
// Test actual import/clear event handlers with deferred file reads. No browser APIs
// or chemistry are simulated beyond the handoff to the separately tested analyse().
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
const elements = new Map(), events = new Map(), analyzed = [];
function element(id) {
  if (!elements.has(id)) elements.set(id,{
    value:'',textContent:'',hidden:false,disabled:false,
    classList:{add(){}}, addEventListener(type,fn){events.set(id+':'+type,fn);}
  });
  return elements.get(id);
}
const context = vm.createContext({
  fileReadSequence:0, activeAnalysis:null, records:[],preparedBatchRows:[],
  InputWorkflow:require('../js/input-workflow.js'),
  document:{getElementById:element,dispatchEvent(){}}, Event:class {},setAnalysisBusy(){},
  analyse(){context.fileReadSequence++;analyzed.push(element('smiles-input').value);}
});
vm.runInContext(source.slice(source.indexOf('async function importMoleculeFile('),
  source.indexOf("\ndocument.getElementById('molecule-file').addEventListener('change', importMoleculeFile)")),context);
vm.runInContext(source.slice(source.indexOf("document.getElementById('clear').addEventListener('click'"),
  source.indexOf("\ndocument.getElementById('export').addEventListener")),context);
function deferredFile(name) {
  let resolve,reject;
  const promise=new Promise((ok,bad)=>{resolve=ok;reject=bad;});
  const target={value:name,files:[{name,size:100,text:()=>promise}]};
  return {target,resolve,reject};
}
const start=file=>context.importMoleculeFile({target:file.target});
(async()=>{
  const stale=deferredFile('old.smi'), fresh=deferredFile('new.smi');
  const old=start(stale), current=start(fresh);
  fresh.resolve('Water, O'); await current;
  stale.resolve('Ethanol, CCO'); await old;
  assert.deepEqual(analyzed,['Water, O']);
  assert.equal(element('smiles-input').value,'Water, O');

  const pending=deferredFile('pending.smi');
  const clearing=start(pending);
  events.get('clear:click')();
  pending.resolve('CCC'); await clearing;
  assert.equal(element('smiles-input').value,'');
  assert.equal(analyzed.length,1, 'Clear must prevent a pending import from starting analysis');

  const failing=deferredFile('old-error.smi');
  const failure=start(failing);
  context.analyse(); // Starting a manual/new analysis invalidates an older file read.
  element('status').textContent='Newer results';
  failing.reject(Error('old read failure')); await failure;
  assert.equal(element('status').textContent,'Newer results', 'stale errors must not overwrite newer status');

  element('smiles-input').value='Previous input';
  const invalid=deferredFile('invalid.json');
  const invalidJob=start(invalid);
  invalid.resolve('[]'); await invalidJob;
  assert.equal(element('smiles-input').value,'Previous input');
  assert.match(element('status').textContent,/not a Molecule Profiler/);
  assert.equal(invalid.target.value,'');

  const huge={target:{value:'huge.smi',files:[{size:1024*1024+1,text(){assert.fail('oversized files must not be read');}}]}};
  await start(huge);
  assert.match(element('status').textContent,/too large/);
  console.log('File import: latest-read wins, Clear invalidation, stale errors, JSON preflight and size limits passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
