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
  ui.openDossier('Valsartan');assert.ok(d.querySelector('#reference-dossier .identity-correction'));assert.ok(!d.querySelector('#reference-dossier .research-warning'));assert.ok(d.getElementById('reference-dossier').textContent.includes('Historical SMILES'));
  ui.openDossier('2C-B');[...d.querySelectorAll('#reference-dossier button')].find(b=>b.textContent==='Compare this compound').click();
  assert.equal(d.querySelectorAll('#research-compare-selected button').length,1);assert.ok(d.getElementById('research-tools').open);assert.ok(d.getElementById('research-compare-results').textContent.includes('Emax 45'));
  const input=d.getElementById('research-compare-input');input.value='2C-C';d.getElementById('research-compare-add').click();assert.equal(d.querySelectorAll('#research-compare-selected button').length,2);
  assert.ok(d.querySelector('#research-compare-results table'));d.getElementById('research-compare-clear').click();assert.equal(d.querySelectorAll('#research-compare-selected button').length,0);
  for(const name of ['Fenoldopam','SKF-38393','SCH-23390','Valsartan']){ui.openDossier(name);assert.ok(d.querySelector('#reference-dossier .identity-correction'));assert.ok(!d.querySelector('#reference-dossier .research-warning'));assert.equal(ui.model.dossier(name).identityWarnings.length,0);assert.ok(ui.model.dossier(name).records.length);}
  assert.ok(ui.openDossier(w.CURATED_REFERENCES.records.find(r=>r.id==='family-001-37456').compounds[0].libraryNames[0]));assert.ok(d.getElementById('reference-dossier').textContent.includes('0.811'));assert.ok(d.getElementById('reference-dossier').textContent.includes('194–202'));assert.ok(d.getElementById('reference-dossier').textContent.includes('Hydromorphone = 100%'));
  ui.loadFamilies();const family=d.getElementById('research-matrix-family');family.value='Family motif: Ortho-biphenyltetrazoles';d.getElementById('research-matrix-load').click();
  assert.ok(d.querySelector('#research-matrix-results table'));assert.ok(d.getElementById('research-matrix-status').textContent.includes('21 in family'));
  const cell=d.querySelector('#research-matrix-results button.matrix-evidence');assert.ok(cell);cell.click();assert.equal(d.querySelector('#reference-dossier h2').textContent,ui.model.dossier(cell.dataset.reference).label);
  assert.ok([...d.querySelectorAll('#reference-dossier .research-evidence')].some(n=>n.dataset.target===cell.dataset.target&&n.open));
  d.getElementById('research-review-kind').value='identity';d.getElementById('research-review-load').click();assert.equal(d.querySelectorAll('#research-review-results>details').length,4);
  const reviewSearch=d.getElementById('research-review-search');reviewSearch.value='Valsartan';reviewSearch.dispatchEvent(new w.Event('input'));assert.equal(d.querySelectorAll('#research-review-results>details').length,1);assert.ok(d.getElementById('research-review-results').textContent.includes('resolved source correction'));assert.ok(d.querySelector('#research-review-results a[href="NAMED-FAMILY-003.md"]'));
  d.getElementById('research-review-kind').value='action';reviewSearch.value='Quetiapine';d.getElementById('research-review-load').click();assert.ok(d.getElementById('research-review-results').textContent.includes('No adjudication'));
  d.getElementById('research-curation-category').value='diversity';d.getElementById('research-curation-load').click();assert.ok(d.querySelectorAll('#research-curation-results>details').length);assert.ok(d.getElementById('research-curation-results').textContent.includes('planning threshold'));
  assert.ok(d.querySelector('#research-curation-results a[href*="reference-explorer.html?receptor="]'));const csv=ui.queueCsv();assert.ok(csv.includes('Source URLs'));assert.ok(csv.includes('https://'));assert.ok(csv.includes('diversity:'));
  let downloaded=false;d.addEventListener('click',e=>{if(e.target.download==='reference-curation-queue.csv'){downloaded=true;e.preventDefault();}});d.getElementById('research-curation-export').click();assert.ok(downloaded);
  d.getElementById('research-curation-category').value='review';d.getElementById('research-curation-load').click();[...d.querySelectorAll('#research-curation-results button')].find(b=>b.textContent==='Open review').click();assert.ok(d.querySelector('#research-review-results>details'));
  const ids=[...d.querySelectorAll('[id]')].map(n=>n.id);assert.equal(new Set(ids).size,ids.length,'Unique inspector IDs');
  assert.deepEqual(errors,[]);console.log('Research DOM: dossiers, comparisons, matrix drill-down, source reviews, curation navigation and CSV download passed');
 }finally{dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
