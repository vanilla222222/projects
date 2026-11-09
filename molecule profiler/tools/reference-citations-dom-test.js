'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url'),{JSDOM,VirtualConsole}=require(process.env.PROFILER_JSDOM_PATH||'jsdom');
(async()=>{
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(String(e)));const file=path.resolve(__dirname,'../library-inspector.html'),dom=await JSDOM.fromFile(file,{url:pathToFileURL(file).href,resources:'usable',runScripts:'dangerously',virtualConsole:vc});
 try{
  const w=dom.window;if(w.document.readyState!=='complete')await new Promise(r=>w.addEventListener('load',r,{once:true}));const ui=w.ReferenceResearchUI;
  const record=w.CURATED_REFERENCES.records.find(r=>r.id==='property-freesolv2-8578590'),o=ui.model.dossier(record.compounds[0].libraryNames[0]).observations.find(o=>o.recordId===record.id),card=ui.observation(o);
  const primary=[...card.querySelectorAll('a')].filter(a=>a.textContent.startsWith('Primary reference'));
  assert.equal(primary.length,2);assert.deepEqual(primary.map(a=>a.href),['https://doi.org/10.1080/09593338709384509','https://doi.org/10.1038/313384a0']);assert.ok(primary.every(a=>a.rel==='noopener noreferrer'));
  const unresolved=ui.observation({...o,originalReferences:[],originalReference:'',originalReferenceLabel:'SAMPL4_Guthrie'});assert.ok(unresolved.textContent.includes('SAMPL4_Guthrie'));assert.ok(![...unresolved.querySelectorAll('a')].some(a=>a.textContent.startsWith('Primary reference')));
  const unpublished=ui.observation({...o,originalReferences:[o.originalReferences[0]],referenceStatus:'Source identifies unpublished data; supplied DOI retained as cited'});assert.ok(unpublished.querySelector('a').textContent.startsWith('Cited reference'));assert.ok(![...unpublished.querySelectorAll('a')].some(a=>a.textContent.startsWith('Primary reference')));
  for(const provider of ['ChEMBL','ChEMBL curated action classification']){
   const source={...o,kind:provider==='ChEMBL'?'imported_binding':'imported_classification',provider,action:'',originalReferences:[],originalReference:'',documentJournal:'J Med Chem',documentYear:2005,documentId:'CHEMBL1145166',documentUrl:'https://www.ebi.ac.uk/chembl/explore/document/CHEMBL1145166',value:undefined};
   const rendered=ui.observation(source);assert.match(rendered.textContent,/Source-listed journal: J Med Chem/);assert.match(rendered.textContent,/Source-listed publication year: 2005/);assert.match(rendered.textContent,/primary paper identity has not been independently verified/);assert.ok(rendered.querySelector('a[href="'+source.documentUrl+'"]'));
  }
  assert.deepEqual(errors,[]);console.log('Citation DOM: two unique primary links, unresolved labels and source-qualified ChEMBL journal/year for binding and classifications passed');
 }finally{dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
