'use strict';
// Optional jsdom integration; not Chromium or visual validation.
const assert=require('node:assert/strict');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
(async()=>{
 const errors=[],downloads=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(String(e)));
 const dom=await JSDOM.fromFile(path.join(__dirname,'../index.html'),{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.Blob=Blob;w.URL.createObjectURL=b=>{downloads.push(b);return 'blob:fixture'};w.URL.revokeObjectURL=()=>{};
  w.HTMLAnchorElement.prototype.click=function(){};w.HTMLElement.prototype.scrollIntoView=function(){};
 }});
 try {
  const w=dom.window,d=w.document,$=id=>d.getElementById(id);
  if(d.readyState!=='complete')await new Promise(resolve=>w.addEventListener('load',resolve,{once:true}));
  const deadline=Date.now()+30000;while($('results').hidden && Date.now()<deadline)await new Promise(r=>setTimeout(r,30));
  assert.equal($('results').hidden,false,errors.join('\n'));
  assert.deepEqual(errors,[]);
  assert.equal($('tgt-mode').value,'legacy');
  $('tgt-mode').value='ensemble';$('tgt-mode').dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.match($('tgt-blurb').textContent,/geometric mean/);
  assert.match($('tgt-bench').textContent,/does not validate/);
  assert.ok($('targets').querySelectorAll('tr[data-smiles]').length>0);
  assert.ok($('targets').querySelector('details'));
  const inputBefore=$('smiles-input').value;$('targets').querySelector('details summary').click();
  assert.equal($('smiles-input').value,inputBefore,'evidence expansion must not submit the nearest ligand as a new query');
  function change(id,value){$(id).value=value;$(id).dispatchEvent(new w.Event('change',{bubbles:true}));}
  change('tgt-scope','receptors');
  assert.ok([...$('targets').querySelectorAll('tr[data-smiles]')].every(tr=>['GPCR','Nuclear receptor'].includes(tr.children[3].textContent)||/receptor/i.test(tr.children[1].textContent)),'Receptor scope must classify target families, including adrenoceptor names');
  change('tgt-mode','legacy');assert.match($('tgt-blurb').textContent,/Legacy nearest/);
  change('tgt-mode','ensemble');change('tgt-scope','all');
  change('met-budget','60');assert.match($('met-diagnostics').textContent,/rule applications/);
  assert.match($('met-diagnostics').textContent,/shortest-generation/);
  assert.match($('met-summary').textContent,/heuristic weight/);
  $('export-full').click();const csv=await downloads.at(-1).text();
  assert.ok(csv.includes('rankingScore'));assert.ok(csv.includes('diagnostics.ruleApplications'));
  assert.ok(csv.includes('ensemble'));
  assert.deepEqual(errors,[]);
  console.log('Prediction DOM workflows: ensemble/legacy switching, receptor scope, evidence details, metabolic budgets/diagnostics and consistent full CSV passed');
 }finally{dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
