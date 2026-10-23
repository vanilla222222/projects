'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.PROFILER_JSDOM_PATH||'jsdom'),root=path.join(__dirname,'..');
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.test/'}),ctx=dom.getInternalVMContext(),w=dom.window;
for(const name of ['smiles','mol','smarts','stereo','transform','descriptors','pharmacology','prodrug-candidates','cleavable-groups','prodrug-explorer','prodrug-priority','depict'])vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'data/pharmacology-evidence.js'),'utf8'),ctx);
let snapshot;w.PharmacologyUI={render(record){snapshot={inputSmiles:record.smiles};},getSnapshot(){return snapshot;}};
w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
for(const name of ['prodrug-site-evidence','prodrug-explorer-ui','workspace-ui','layout-ui'])vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),ctx);
const $=id=>w.document.getElementById(id),run=s=>vm.runInContext(s,ctx);let checks=0;const ok=(v,s)=>{assert.ok(v,s);checks++;};
function render(smiles){w.testInput=smiles;w.PharmacologyUI.render({smiles,mol:run('buildMolecule(parseSmiles(testInput))')},[]);}
function change(id,value){$(id).value=value;$(id).dispatchEvent(new w.Event('change'));}
function workspace(id){$('workspace-nav').querySelector('[data-view="'+id+'"]').click();}
function studio(id){$('design-studio-nav').querySelector('[data-studio-view="'+id+'"]').click();}
const exportIds=['export','export-full','export-full-dictionary','export-snapshot','export-research'];
ok(exportIds.every(id=>$(id).closest('details')===$('analysis-export-menu')),'Existing export IDs retained in one disclosure');
ok($('smiles-input').labels.length===1&&$('molecule-file').labels.length===1,'Input and import have explicit labels');
ok(w.document.querySelector('.about').tagName==='DETAILS','Long methodology has its own disclosure');
$('results').hidden=false;workspace('design');ok(!$('prodrug-panel').hidden&&$('analogue-panel').hidden&&$('pharmacokinetics-panel').hidden,'Prodrug studio is a focused top-level workspace');
workspace('analogues');ok(!$('analogue-panel').hidden&&$('prodrug-panel').hidden,'Analogues have their own workspace');
workspace('exposure');ok(!$('pharmacokinetics-panel').hidden&&!$('ionization-panel').hidden&&$('prodrug-panel').hidden,'Exposure groups PK and ionization');
workspace('metabolism');ok($('prodrug-panel').hidden&&$('analogue-panel').hidden,'Metabolism no longer contains large design tools');
$('module-search').value='cleavable';$('module-search').dispatchEvent(new w.Event('input'));ok(!$('prodrug-panel').hidden&&$('results').dataset.workspace==='search','Section search still finds prodrug tools');
workspace('design');render('NCCO');
ok($('prodrug-panel').dataset.studioView==='build'&&$('prodrug-reference-select').value==='__input__','New analysis opens current input in site builder');
ok($('design-studio-nav').querySelectorAll('[aria-pressed="true"]').length===1,'Exactly one workflow view selected');
ok($('prodrug-explorer-comparison').closest('section').dataset.studioPiece==='comparison'&&$('prodrug-priority').dataset.studioPiece==='comparison','Comparison and priority form one workflow view');
$('prodrug-design-build').click();const smiles=snapshot.prodrugSiteDesign.candidate.smiles;
$('prodrug-explorer-add-design').click();ok($('prodrug-panel').dataset.studioView==='comparison'&&snapshot.prodrugSiteComparison.rows.length===2,'Adding design navigates to populated comparison');
ok(w.document.activeElement.dataset.studioView==='comparison','Automatic navigation moves focus to visible workflow control');
studio('build');ok(snapshot.prodrugSiteDesign.candidate.smiles===smiles,'View changes preserve current preview and shortlist');
$('prodrug-explorer-start-route').click();ok($('prodrug-panel').dataset.studioView==='route'&&snapshot.prodrugReleasePathway.startSmiles===smiles,'Starting route navigates to release view');
studio('references');change('prodrug-reference-select','enalapril');ok(snapshot.prodrugSiteEvidence.status==='documented-reference-site'&&$('prodrug-panel').dataset.studioView==='references','Reference inspection remains supported');
studio('comparison');ok($('prodrug-reference-select').value==='__input__'&&!$('prodrug-explorer').hidden,'Returning to design tools restores current-input context');
const first=$('design-studio-nav').querySelector('button');first.focus();first.dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',bubbles:true}));ok($('prodrug-panel').dataset.studioView==='references'&&w.document.activeElement.dataset.studioView==='references','Workflow supports End-key navigation');
$('analysis-export-menu').open=true;$('analysis-export-menu').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));ok(!$('analysis-export-menu').open&&w.document.activeElement.tagName==='SUMMARY','Export menu closes with Escape and restores focus');
render('CCO');ok($('prodrug-panel').dataset.studioView==='build'&&!snapshot.prodrugReleasePathway&&snapshot.prodrugSiteComparison.rows.length===1,'Changed input resets workflow and old research state');
ok($('prodrug-explorer-comparison').tabIndex===0,'Wide results region can receive keyboard focus');
console.log('Layout and workflow: '+checks+' checks passed.');dom.window.close();
