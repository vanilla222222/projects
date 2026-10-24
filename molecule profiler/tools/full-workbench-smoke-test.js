'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');const {JSDOM}=require(process.env.PROFILER_JSDOM_PATH||'jsdom'),root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://example.test/'}),w=dom.window,ctx=dom.getInternalVMContext();
w.fetch=async()=>({ok:false,status:404,json:async()=>({error:'Browser mode'})});w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};w.HTMLElement.prototype.scrollIntoView=function(){};
(async()=>{
 for(const match of html.matchAll(/<script src="([^"?]+)(?:\?[^"]*)?"><\/script>/g))vm.runInContext(fs.readFileSync(path.join(root,match[1]),'utf8'),ctx,{filename:match[1]});
 for(let i=0;i<500;i++){if(w.PharmacologyUI.getSnapshot()?.candidateComparison)break;await new Promise(r=>setTimeout(r,10));}
 let s=w.PharmacologyUI.getSnapshot();assert.ok(s.candidateComparison?.rows.length===25,'Full app startup populates dashboard');assert.ok(s.independentResearch,'Native tool snapshot survives all render wrappers');
 const ids=[...w.document.querySelectorAll('[id]')].map(e=>e.id);assert.equal(new Set(ids).size,ids.length,'All dynamic IDs are unique with every module loaded');
 w.document.getElementById('smiles-input').value='Methoxy example, NCCc1ccc(OC)c(OC)c1OC';w.document.getElementById('run').click();
 for(let i=0;i<500;i++){s=w.PharmacologyUI.getSnapshot();if(s?.inputSmiles==='NCCc1ccc(OC)c(OC)c1OC')break;await new Promise(r=>setTimeout(r,10));}
 assert.equal(s.candidateComparison.rows.length,25);assert.ok(s.candidateComparison.rows.every(r=>r.synthesis?.routeEstablished===false),'Every design has preparation review with no invented route');assert.ok(s.candidateComparison.rows.some(r=>r.releaseKind==='different-analogue'));
 const box=w.document.querySelector('#ion-multi-sites fieldset');box.querySelector('[type=checkbox]').checked=true;for(const [key,value] of [['pka','9'],['low','8.5'],['high','9.5'],['source','Explicit smoke-test assumption']])box.querySelector('[id$="-'+key+'"]').value=value;w.document.getElementById('ion-multi-run').click();assert.equal(w.PharmacologyUI.getSnapshot().multiSiteIonization.states.length,2,'Ionization form exports both charge states');
 w.WorkspaceUI.select('candidates');assert.equal(w.document.getElementById('candidate-dashboard').hidden,false);w.WorkspaceUI.select('validation');assert.equal(w.document.getElementById('validation-workbench').hidden,false);
 console.log('Full application smoke: all scripts, startup, mixed-site input, snapshots and navigation passed.');w.close();
})().catch(e=>{console.error(e);w.close();process.exitCode=1;});
