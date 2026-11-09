'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{JSDOM,VirtualConsole}=require(process.env.PROFILER_JSDOM_PATH||'jsdom');
(async()=>{
 const errors=[],downloads=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(String(e)));
 const dom=await JSDOM.fromFile(path.resolve(__dirname,'../library-inspector.html'),{resources:'usable',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.Blob=Blob;w.HTMLElement.prototype.scrollIntoView=()=>{};w.URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:fixture';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};}});
 try{
  const w=dom.window,d=w.document;if(d.readyState!=='complete')await new Promise(r=>w.addEventListener('load',r,{once:true}));assert.deepEqual(errors,[]);assert.ok(w.ReferenceSupport,'Support helper must be loaded in the real page');
  const rows=w.CuratedReferences.library(w.eval('LIBRARY')),counts=w.LibraryCatalog.catalogSummary(rows).evidenceCounts,control=d.getElementById('catalog-evidence'),total=()=>Number(d.getElementById('catalog-result-total').textContent.replaceAll(',','')),change=(id,value)=>{const el=d.getElementById(id);el.value=value;el.dispatchEvent(new w.Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));};
  assert.equal(control.options.length,w.ReferenceSupport.DEFINITIONS.length+1);const all=total();assert.equal(all,rows.length);assert.match(d.getElementById('catalog-evidence-summary').textContent,/Measured physical properties:/);
  for(const key of ['measuredPhysical','standardizedBinding','functionalAssay','sourceAction','noImportedObservations']){
   change('catalog-evidence',key);assert.equal(total(),counts[key]);assert.ok(total()>0);for(const label of d.querySelectorAll('#catalog-table .catalog-evidence-labels'))assert.ok(label.dataset.support.split(' ').includes(key),'Every displayed row matches '+key);
  }
  change('catalog-evidence','measuredPhysical');const propertyCount=total();d.getElementById('catalog-export').click();assert.equal(downloads.length,1);const csv=await downloads[0].text();assert.equal(csv.split('\r\n').filter(Boolean).length,propertyCount+1,'Export includes all filtered pages');assert.ok(csv.includes('Measured physical properties'));assert.ok(csv.includes('Standardized ChEMBL binding'));assert.ok(csv.includes('Imported observation count'));
  change('catalog-search-field','name');change('catalog-search','Benzene');assert.ok(total()>0&&total()<propertyCount);const name=d.querySelector('#catalog-table .dossier-button').dataset.reference;d.querySelector('#catalog-table .dossier-button').click();assert.equal(d.querySelector('#reference-dossier h2').textContent,w.ReferenceResearchUI.model.dossier(name).label);const old=total();d.querySelector('#catalog-table .dossier-button').click();assert.equal(total(),old,'Opening a dossier does not duplicate catalog rows');
  d.getElementById('catalog-reset').click();assert.equal(control.value,'all');assert.equal(total(),all);const topology=d.querySelector('[data-category="Properties and topology"]');assert.ok([...topology.querySelectorAll('[data-tag]')].every(button=>!/^Evidence: |^Curated collection: |^Curated panel: /.test(button.dataset.tag)),'Evidence and curated tags have dedicated filter sections');assert.deepEqual(errors,[]);
  console.log('Reference support DOM: overlapping evidence counts, real filters, row states, all-page filtered CSV, dossier navigation and reset passed');
 }finally{dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
