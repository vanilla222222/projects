'use strict';
// Exercise the application analysis transaction with the real chemistry engine.
// Rendering is stubbed; this does not replace the real Chromium suite.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
for (const file of ['smiles','mol','smarts','descriptors','rules']) Object.assign(global,require('../js/'+file+'.js'));
const source = fs.readFileSync(path.join(root,'js/app.js'),'utf8');
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    value:'', hidden:false, disabled:false, textContent:'', children:[], attributes:{},
    classList:{toggle(){},remove(){},add(){}},
    setAttribute(key,value){this.attributes[key]=value;},
    replaceChildren(){this.children=[];}, appendChild(child){this.children.push(child);}
  });
  return elements.get(id);
}
const yields = [];
const scheduler = require('../js/cooperative-batch.js');
const context = vm.createContext({
  ...Object.fromEntries(['parseSmiles','buildMolecule','describe','evaluate'].map(key=>[key,global[key]])),
  InputWorkflow:require('../js/input-workflow.js'),
  CooperativeBatch:{run:(rows,fn,opts)=>scheduler.run(rows,fn,{
    ...opts,chunkSize:1,now:()=>0,yieldControl:()=>new Promise(resolve=>yields.push(resolve))
  })},
  records:[{name:'Previous'}], preparedBatchRows:[], latestInputIssues:[], activeAnalysis:null,
  document:{getElementById:element,createElement:()=>({textContent:''}),dispatchEvent(){}},
  Event:class {},current:0,simPage:1,batchPage:1,
  renderTabs(){},renderBatch(){},renderCurrent(){}
});
vm.runInContext(source.slice(source.indexOf('function parsesAsSmiles('),source.indexOf('\nfunction renderTabs(')),context);
vm.runInContext(source.slice(source.indexOf('function batchRow('),source.indexOf('\nfunction synchronizeBatchSelection(')),context);
const get = code=>vm.runInContext(code,context);
async function drain() {
  while(yields.length) { yields.shift()(); await Promise.resolve(); await Promise.resolve(); }
}
(async()=>{
  element('smiles-input').value='name,smiles\nWater,O\nBroken,C1CC\nEthanol,CCO';
  const job=get('analyse()');
  assert.equal(element('run').disabled,true);
  assert.equal(get('records[0].name'),'Previous', 'previous results stay intact while processing');
  await drain(); await job;
  assert.equal(get('records.length'),2);
  assert.equal(get('latestInputIssues[0].line'),3);
  assert.equal(get('preparedBatchRows.length'),2);
  const expected=evaluate(describe(buildMolecule(parseSmiles('CCO'))));
  assert.deepEqual(JSON.parse(JSON.stringify(get('records[1].v'))),JSON.parse(JSON.stringify(expected)),
    'scheduling must preserve the synchronous chemistry output');
  assert.equal(element('run').disabled,false);
  assert.equal(element('analysis-progress').hidden,true);
  assert.equal(element('status').textContent,'2 analyzed · 1 skipped');

  const retained=get('records');
  element('smiles-input').value='O\nCCO\nCCC';
  const cancelled=get('analyse()');
  yields.shift()(); await Promise.resolve(); await Promise.resolve();
  get('activeAnalysis.cancelled=true');
  await drain(); await cancelled;
  assert.equal(get('records'),retained, 'cancellation must not publish partial results');
  assert.match(element('status').textContent,/cancelled/);
  assert.equal(element('export').disabled,false);

  // A replaced job must not overwrite a newer result or its progress/status.
  element('smiles-input').value='O\nCCO';
  const old=get('analyse()');
  element('smiles-input').value='name,smiles\nPropane,CCC';
  const newer=get('analyse()');
  await drain(); await Promise.all([old,newer]);
  assert.equal(get('records.length'),1);
  assert.equal(get('records[0].name'),'Propane');
  assert.equal(element('status').textContent,'1 analyzed · 0 skipped');

  // Clear invalidates the job before clearing published state.
  element('smiles-input').value='CCO\nCCC';
  const clearing=get('analyse()');
  get('activeAnalysis.cancelled=true; activeAnalysis=null; records=[]; preparedBatchRows=[]; setAnalysisBusy(false)');
  element('status').textContent='';
  await drain(); await clearing;
  assert.equal(get('records.length'),0);
  assert.equal(element('status').textContent,'');
  assert.equal(element('export').disabled,true);
  console.log('Analysis lifecycle: chemistry equivalence, partial input success, cancellation, replacement and clear passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
