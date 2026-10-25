'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.PROFILER_JSDOM_PATH||'jsdom'),root=path.join(__dirname,'..');
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{runScripts:'outside-only',pretendToBeVisual:true,url:'https://example.test/'}),w=dom.window,ctx=dom.getInternalVMContext();
w.indexedDB=require(process.env.PROFILER_FAKE_IDB_PATH||'fake-indexeddb').indexedDB;w.TextEncoder=TextEncoder;w.fetch=async()=>({ok:false,status:404,json:async()=>({})});w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};w.HTMLElement.prototype.scrollIntoView=function(){};
const $=id=>w.document.getElementById(id),tick=()=>new Promise(r=>setTimeout(r,0));
(async()=>{try{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const m of html.matchAll(/<script src="([^"?]+)(?:\?[^\"]*)?"><\/script>/g))vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});
 for(let i=0;i<500&&!w.PharmacologyUI?.getSnapshot()?.candidateComparison;i++)await new Promise(r=>setTimeout(r,10));
 assert.ok(w.PharmacologyUI.getSnapshot()?.candidateComparison);await tick();
 w.WorkspaceUI.select('overview');assert.equal(w.document.querySelectorAll('#results > .grid > article:not([hidden])').length,1);assert.ok(w.document.querySelector('#structure').closest('article').dataset.overviewPrimary);
 assert.equal(w.document.querySelectorAll('.workspace-group').length,4);assert.equal(w.document.querySelectorAll('#workspace-nav button[data-view]').length,17);assert.equal(w.document.querySelectorAll('.workspace-group[open]').length,0);
 assert.ok(w.document.querySelector('.input-panel').classList.contains('compose-collapsed'));$('workbench-compose-toggle').click();assert.equal($('workbench-compose-toggle').getAttribute('aria-expanded'),'true');$('workbench-compose-toggle').click();
 w.document.querySelector('.sidebar-compose').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.equal($('workbench-compose-toggle').getAttribute('aria-expanded'),'true');$('workbench-compose-toggle').click();
 assert.equal(w.document.querySelector('#report-validation').closest('details').open,false);w.dispatchEvent(new w.Event('beforeprint'));assert.ok(w.document.querySelector('#report-validation').closest('details').open);w.dispatchEvent(new w.Event('afterprint'));assert.equal(w.document.querySelector('#report-validation').closest('details').open,false);
 assert.ok($('wedge-note').closest('details'));assert.ok($('tgt-mode').closest('article').contains($('targets')));
 for(const button of w.document.querySelectorAll('#workspace-nav button[data-view]')){w.WorkspaceUI.select(button.dataset.view);assert.equal(w.WorkspaceUI.getActive(),button.dataset.view);assert.equal($('workspace-picker').value,button.dataset.view);if(button.closest('details'))assert.ok(button.closest('details').open);}
 $('workspace-picker').value='analogues';$('workspace-picker').dispatchEvent(new w.Event('change'));assert.equal(w.WorkspaceUI.getActive(),'analogues');assert.equal($('analogue-panel').hidden,false);assert.equal(w.document.querySelectorAll('.workspace-group[open]').length,1);
 assert.equal($('analogue-search').closest('details').open,false);assert.equal($('analogue-inspector').open,false);let inspected=false;$('analogue-inspector').scrollIntoView=()=>{inspected=true;};w.document.querySelector('[data-analogue-index]').click();assert.ok($('analogue-inspector').open);assert.ok(inspected,'Inspect scrolls to the comparison after opening it');assert.ok($('analogue-detail').textContent.includes('unvalidated design'));
 w.WorkspaceUI.select('overview');w.document.querySelector('[data-open-workspace=properties]').click();assert.equal(w.WorkspaceUI.getActive(),'properties');assert.equal($('physchem').closest('article').hidden,false);
 $('module-search').value='atom contributions';$('module-search').dispatchEvent(new w.Event('input'));assert.equal($('results').dataset.workspace,'search');assert.equal($('atoms').closest('article').hidden,false);assert.equal($('structure').closest('article').hidden,true);
 const quality=$('quality-summary');quality.hidden=false;$('quality-status').textContent='One test input flag';const flag=w.document.createElement('li');flag.textContent='Review test flag';$('quality-issues').append(flag);await tick();assert.ok($('quality-drawer').open);assert.match($('quality-brief').textContent,/test input flag/);
 assert.equal(new Set([...w.document.querySelectorAll('[id]')].map(e=>e.id)).size,w.document.querySelectorAll('[id]').length);
 console.log('Calm workspace: compact startup, all 17 routes, grouped/mobile navigation, search, shortcuts, retained evidence/print context, input flags and analogue disclosures passed.');
 }finally{await w.ProjectNotebooks?.close();w.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
