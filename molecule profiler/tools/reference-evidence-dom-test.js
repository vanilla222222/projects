'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url'),{JSDOM,VirtualConsole}=require(process.env.PROFILER_JSDOM_PATH||'jsdom');
(async()=>{
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(String(e)));
 const file=path.resolve(__dirname,'../library-inspector.html'),dom=await JSDOM.fromFile(file,{url:pathToFileURL(file).href,resources:'usable',runScripts:'dangerously',virtualConsole:vc});
 try{
  const w=dom.window,d=w.document;if(d.readyState!=='complete')await new Promise(r=>w.addEventListener('load',r,{once:true}));
  assert.ok(w.ReferenceEvidence,'Inspector must load the curated disclosure helper');
  function input(id,value){const el=d.getElementById(id);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));el.dispatchEvent(new w.Event('change',{bubbles:true}));}
  for(const [name,kind,action]of [['Valsartan','Curated action classification','antagonist'],['2C-C','Measured functional assay','partial agonist']]){
   input('catalog-search-field','name');input('catalog-search','"'+name+'"');
   const row=[...d.querySelectorAll('#catalog-table tbody tr')].find(r=>r.querySelector('[data-reference]')?.dataset.reference===name);assert.ok(row,name);
   const disclosure=[...row.querySelectorAll('details')].find(e=>e.querySelector('summary')?.textContent.startsWith('Receptor evidence'));assert.ok(disclosure,'Curated action needs a disclosure for '+name);
   disclosure.open=true;disclosure.dispatchEvent(new w.Event('toggle'));
   assert.ok(disclosure.textContent.includes(kind));assert.ok(disclosure.textContent.includes(action));assert.ok(disclosure.textContent.includes('Homo sapiens'));
   assert.ok([...disclosure.querySelectorAll('a')].some(a=>a.href.startsWith('https://')&&a.rel==='noopener noreferrer'));
   const count=disclosure.querySelectorAll('li').length;disclosure.dispatchEvent(new w.Event('toggle'));assert.equal(disclosure.querySelectorAll('li').length,count,'Repeated opens must not duplicate rows');
  }
  const classes=[...d.querySelectorAll('#catalog-families>details')].find(e=>e.dataset.category==='Source ligand classes');assert.ok(classes);assert.match(classes.textContent,/do not establish a structural family/);
  const properties=[...d.querySelectorAll('#catalog-families>details')].find(e=>e.dataset.category==='Properties and topology');assert.ok(!properties.querySelector('[data-tag^="Source ligand class: "]'));
  assert.deepEqual(errors,[]);console.log('Inspector curated disclosures: visible source classification and functional assay context, links, no duplicate rows and separate source ligand class category passed');
 }finally{dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
