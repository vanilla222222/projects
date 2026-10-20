'use strict';
// Executes the real catalogue page; does not establish Chromium visual layout.
const assert=require('node:assert/strict'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const {LIBRARY_NAME_METADATA:n}=require('../data/library-names');
(async()=>{
 const errors=[],downloads=[],console=new VirtualConsole();console.on('jsdomError',e=>errors.push(String(e)));
 const dom=await JSDOM.fromFile(path.join(__dirname,'../library-inspector.html'),{
  resources:'usable',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:console,
  beforeParse(w){w.Blob=Blob;w.URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:fixture';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};}
 });
 try{
  const w=dom.window,d=w.document;
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Page load timeout')),30000);w.addEventListener('load',()=>{clearTimeout(timer);resolve();},{once:true});});
  assert.deepEqual(errors,[]);
  assert.equal(d.getElementById('catalog-class'),null,'Class filter must be replaced');
  assert.ok(d.querySelectorAll('#catalog-tag-options option').length>20);
  assert.ok(d.querySelector('#catalog-table thead').textContent.includes('Tags'));
  const initial=d.querySelector('#catalog-table tbody').textContent;
  const input=(id,value)=>{const el=d.getElementById(id);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
  input('catalog-tag','Amide motif');
  assert.ok(d.querySelectorAll('#catalog-table tbody tr').length>1);
  for(const row of d.querySelectorAll('#catalog-table tbody tr'))assert.ok([...row.querySelectorAll('button.catalog-tag')].some(x=>x.textContent==='Amide motif'));
  const chip=d.querySelector('#catalog-table button.catalog-tag');const chosen=chip.textContent;chip.click();
  assert.equal(d.getElementById('catalog-tag').value,chosen);assert.equal(d.activeElement.id,'catalog-tag');
  d.getElementById('catalog-clear-tags').click();assert.equal(d.getElementById('catalog-tag').value,'');
  assert.equal(d.querySelector('#catalog-table tbody').textContent,initial);
  const [id,record]=Object.entries(n.entries)[0];input('catalog-search',id);
  assert.ok(d.querySelector('#catalog-table tbody').textContent.includes(record.preferredName));
  assert.ok(d.querySelector('#catalog-table tbody').textContent.includes(id));
  input('catalog-search',record.preferredName);assert.ok(d.querySelector('#catalog-table tbody').textContent.includes(id));
  d.getElementById('catalog-sort').value='tagCount';d.getElementById('catalog-sort').dispatchEvent(new w.Event('change'));
  d.getElementById('catalog-export').click();assert.equal(downloads.length,1);
  const csv=await downloads[0].text();assert.ok(csv.includes('Reference ID'));assert.ok(csv.includes(id));assert.ok(csv.includes('Name form'));
  input('catalog-search','');input('catalog-tag','nonexistent tag for test');assert.ok(d.querySelector('#catalog-table tbody').textContent.includes('No matching'));
  assert.deepEqual(errors,[]);
  process.stdout.write('Library DOM: names, stable identifiers, tag search/chips, clearing, focus, sorting, empty results and filtered CSV passed\n');
 }finally{dom.window.close();}
})().catch(error=>{process.stderr.write(String(error.stack||error)+'\n');process.exitCode=1;});
