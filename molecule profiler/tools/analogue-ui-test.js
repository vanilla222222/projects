'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.PROFILER_JSDOM_PATH||'jsdom'),root=path.join(__dirname,'..');
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.test/'}),ctx=dom.getInternalVMContext(),w=dom.window;
for(const name of ['smiles','mol','smarts','stereo','transform','pharmacology','pk-applicability','analogue-candidates','depict','pk-decay','prodrug-candidates'])vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),ctx);
let snapshot,downloadText,runCount=0;
w.PharmacologyUI={render(record){snapshot={inputSmiles:record.smiles};},getSnapshot(){return snapshot;}};
w.URL.createObjectURL=blob=>{downloadText=blob;return 'blob:test';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
w.document.getElementById('run').addEventListener('click',()=>runCount++);
for(const name of ['analogue-ui','pharmacology-upgrade','prodrug-site-evidence'])vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),ctx);
function render(smiles){w.testInput=smiles;const mol=vm.runInContext('buildMolecule(parseSmiles(testInput))',ctx);w.PharmacologyUI.render({smiles,mol,name:'Fixture'},[]);}
const panel=w.document.getElementById('analogue-panel');
render('Oc1ccccc1');assert.ok(snapshot.analogueCandidates.rows.length>0);assert.equal(panel.querySelectorAll('button[data-smiles]').length,snapshot.analogueCandidates.rows.length);assert.ok(snapshot.prodrugCandidates.rows.length);
const button=panel.querySelector('button[data-smiles]');button.click();assert.equal(runCount,1);assert.ok(w.document.getElementById('smiles-input').value.includes(button.dataset.smiles));
panel.querySelector('button').click();assert.ok(downloadText,'Download created from current rows');
render('CCO');assert.equal(snapshot.analogueCandidates.rows.length,0);assert.equal(panel.querySelectorAll('button[data-smiles]').length,0);assert.ok(panel.querySelector('button').disabled);
render('C[NH2+]CCO');assert.equal(snapshot.prodrugCandidates.rows.length,25);assert.equal(snapshot.analogueCandidates.rows.length,0);
console.log('Analogue UI: rendering, chained prodrug integration, candidate handoff, download and changed-input clearing passed.');dom.window.close();
