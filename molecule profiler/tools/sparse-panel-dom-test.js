'use strict';
// Real DOM/script integration in jsdom; not browser timing or visual QA.
const assert=require('node:assert/strict'),path=require('node:path'),{JSDOM,VirtualConsole}=require('jsdom');
(async()=>{
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(String(e)));
 const dom=await JSDOM.fromFile(path.join(__dirname,'../index.html'),{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.HTMLElement.prototype.scrollIntoView=function(){};}});
 try{
  const w=dom.window,d=w.document,$=id=>d.getElementById(id);
  if(d.readyState!=='complete')await new Promise(r=>w.addEventListener('load',r,{once:true}));
  const deadline=Date.now()+30000;while($('results').hidden&&Date.now()<deadline)await new Promise(r=>setTimeout(r,30));
  assert.equal($('results').hidden,false,errors.join('\n'));
  assert.match($('bbb-research-panel').textContent,/interval includes zero: a balanced-accuracy advantage remains unresolved/);
  for(const mode of ['legacy','ensemble']){
   for(const [id,value]of [['tgt-count','0'],['tgt-min','0'],['tgt-mode',mode]]){$(id).value=value;$(id).dispatchEvent(new w.Event('change',{bubbles:true}));}
   assert.match($('tgt-summary').textContent,/5 additional panels are lookup-only/);
   const rows=[...$('targets').querySelectorAll('tr[data-smiles]')];assert.ok(rows.length>0);
   assert.ok(rows.every(r=>!['TAAR1','GRM2','GRM5','CNR1','CNR2'].includes(r.children[2].textContent)));
  }
  assert.deepEqual(errors,[]);
  console.log('Sparse-panel DOM: both unfiltered ranking modes exclude the five lookup panels; explicit unresolved BBB interval message displayed');
 }finally{dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
