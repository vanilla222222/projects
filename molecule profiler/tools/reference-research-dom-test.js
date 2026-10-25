'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url'),{JSDOM,VirtualConsole}=require('jsdom');
(async()=>{
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(String(e)));
 const file=path.resolve(__dirname,'../library-inspector.html');
 const dom=await JSDOM.fromFile(file,{url:pathToFileURL(file).href+'?reference=2C-B',resources:'usable',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.HTMLElement.prototype.scrollIntoView=()=>{};w.URL.createObjectURL=()=> 'blob:fixture';w.URL.revokeObjectURL=()=>{};}});
 try{
  if(dom.window.document.readyState!=='complete')await new Promise(r=>dom.window.addEventListener('load',r,{once:true}));
  const w=dom.window,d=w.document,ui=w.ReferenceResearchUI;assert.ok(ui,errors.join('\n'));
  assert.equal(d.querySelector('#reference-dossier h2').textContent,'2C-B');assert.ok(d.querySelector('#reference-dossier svg'));
  assert.ok(d.getElementById('reference-dossier').textContent.includes('Mus musculus'));
  const b=d.querySelector('button.dossier-button');assert.ok(b);b.click();assert.deepEqual(errors,[]);assert.equal(d.querySelector('#reference-dossier h2').textContent,ui.model.dossier(b.dataset.reference).label);
  assert.equal(new URL(d.querySelector('[data-permalink]').href).searchParams.get('reference'),b.dataset.reference);
  ui.openDossier('Valsartan');assert.ok(d.querySelector('#reference-dossier .research-warning'));assert.ok(!d.getElementById('reference-dossier').textContent.includes('family-003-3937-agtr1:'));
  ui.openDossier('2C-B');[...d.querySelectorAll('#reference-dossier button')].find(b=>b.textContent==='Compare this compound').click();
  assert.equal(d.querySelectorAll('#research-compare-selected button').length,1);assert.ok(d.getElementById('research-tools').open);assert.ok(d.getElementById('research-compare-results').textContent.includes('Emax 45'));
  const input=d.getElementById('research-compare-input');input.value='2C-C';d.getElementById('research-compare-add').click();assert.equal(d.querySelectorAll('#research-compare-selected button').length,2);
  assert.ok(d.querySelector('#research-compare-results table'));d.getElementById('research-compare-clear').click();assert.equal(d.querySelectorAll('#research-compare-selected button').length,0);
  ui.loadFamilies();const family=d.getElementById('research-matrix-family');family.value='Family motif: Ortho-biphenyltetrazoles';d.getElementById('research-matrix-load').click();
  assert.ok(d.querySelector('#research-matrix-results table'));assert.ok(d.getElementById('research-matrix-status').textContent.includes('21 in family'));
  const cell=d.querySelector('#research-matrix-results button.matrix-evidence');assert.ok(cell);cell.click();assert.equal(d.querySelector('#reference-dossier h2').textContent,ui.model.dossier(cell.dataset.reference).label);
  assert.ok([...d.querySelectorAll('#reference-dossier .research-evidence')].some(n=>n.dataset.target===cell.dataset.target&&n.open));
  assert.deepEqual(errors,[]);console.log('Research DOM: dossier navigation, source structures, deep links and identity warnings passed');
 }finally{dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
