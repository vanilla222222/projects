'use strict';
// Optional real-DOM integration check using jsdom@26.1.0. It executes the actual
// explorer scripts, but cannot validate Chromium rendering or visual layout.
// Run with jsdom on NODE_PATH: node tools/receptor-explorer-dom-test.js
const assert=require('node:assert/strict');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
(async()=>{
  const errors=[],downloads=[];
  const console=new VirtualConsole();console.on('jsdomError',error=>errors.push(String(error)));
  const dom=await JSDOM.fromFile(path.join(__dirname,'../reference-explorer.html'),{
    resources:'usable',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:console,
    beforeParse(window){
      window.Blob=Blob;
      window.URL.createObjectURL=blob=>{downloads.push({blob});return 'blob:fixture-'+downloads.length;};
      window.URL.revokeObjectURL=()=>{};
      window.HTMLAnchorElement.prototype.click=function(){if(this.download)downloads.at(-1).name=this.download;};
      window.HTMLElement.prototype.scrollIntoView=function(){};
    }
  });
  try {
    if(dom.window.document.readyState!=='complete')await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(Error('Explorer resource loading timed out')),20000);
      dom.window.addEventListener('load',()=>{clearTimeout(timeout);resolve();},{once:true});
    });
    const w=dom.window,d=w.document,$=id=>d.getElementById(id);
    const change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new w.Event(id==='receptor-search'?'input':'change',{bubbles:true}));};
    assert.deepEqual(errors,[]);
    assert.match($('receptor-summary').textContent,/146 catalog records/);
    assert.match($('receptor-summary').textContent,/95 awaiting/);
    assert.equal($('receptor-results').querySelectorAll('button').length,146);
    assert.equal($('molecule-browser').hidden,true);
    for(const id of ['HTR1E','HTR2B','DRD5','GABAB','NMDA','NACHR_A4B2','P2RX6','ERBB2','ABCC8','GRM6']){
      const button=$('receptor-results').querySelector('[data-receptor-id="'+id+'"]');
      assert.ok(button,id+' missing from results');button.focus();button.click();
      assert.ok($('receptor-detail').textContent.includes(id));
      assert.equal($('receptor-detail').querySelectorAll('.effect-card').length,2);
      assert.ok($('receptor-detail').querySelector('a[href^="https://www.ncbi.nlm.nih.gov/gene/"]'));
      assert.equal(d.activeElement.dataset.receptorId,id,'rebuilding results must preserve keyboard focus');
    }
    change('receptor-search','HTR1F');
    assert.equal($('receptor-results').querySelectorAll('button').length,1);
    $('receptor-reset').click();change('receptor-family','Dopamine');
    assert.equal($('receptor-results').querySelectorAll('button').length,5);
    change('receptor-coverage','awaiting');
    assert.equal($('receptor-results').querySelectorAll('button').length,1);
    $('receptor-results').querySelector('button').click();
    assert.match($('receptor-detail').textContent,/Awaiting ligand curation/);
    $('receptor-reset').click();change('receptor-coverage','annotated');
    assert.equal($('receptor-results').querySelectorAll('button').length,10);
    change('receptor-coverage','at_goal');assert.equal($('receptor-results').querySelectorAll('button').length,9);
    $('receptor-results').querySelector('[data-receptor-id="HRH2"]').click();
    assert.equal($('receptor-detail').querySelector('progress').value,50);
    assert.match($('receptor-detail').textContent,/functional action unassigned/);
    const evidenceButton=[...$('receptor-detail').querySelectorAll('button')].find(b=>b.textContent==='Export source-linked ligand evidence');
    evidenceButton.click();const evidence=JSON.parse(await downloads.at(-1).blob.text());
    assert.equal(evidence.ligands.length,50);assert.ok(evidence.ligands.every(a=>a.action==='binding_only'));
    $('receptor-coverage-export').click();const coverage=JSON.parse(await downloads.at(-1).blob.text());
    assert.equal(coverage.receptors,146);assert.equal(coverage.atGoal,9);
    change('receptor-coverage','below_goal');assert.equal($('receptor-results').querySelectorAll('button').length,137);
    $('receptor-reset').click();
    $('receptor-export').click();
    const handoff=JSON.parse(await downloads.at(-1).blob.text());
    assert.equal(handoff.receptors.length,146);
    assert.equal(handoff.ligandAnnotations.length,0);
    assert.ok(handoff.receptors.every(r=>r.targetTemplate.ligands.length===0));
    $('receptor-json').click();
    const catalog=JSON.parse(await downloads.at(-1).blob.text());
    assert.equal(catalog.receptors.length,146);
    assert.equal($('action-glossary').querySelectorAll('h3').length,catalog.actionTerms.length);
    $('view-molecules').click();assert.equal($('molecule-browser').hidden,false);
    assert.ok($('results').querySelectorAll('button').length>0);
    const related=[...$('detail').querySelectorAll('button')].find(b=>b.textContent==='Browse related receptor biology');
    assert.ok(related);related.click();
    assert.equal($('receptor-browser').hidden,false);
    assert.equal($('molecule-browser').hidden,true);
    assert.equal($('receptor-search').value,'cholin');
    assert.ok([...$('receptor-results').querySelectorAll('button')].some(b=>b.dataset.receptorId==='CHRM1'));
    assert.ok($('audit-output').textContent.includes('Library:'));
    assert.deepEqual(errors,[]);
    process.stdout.write('Explorer DOM integration: script loading, receptor cards, filters, preserved focus, JSON scaffolds, glossary, molecule cross-navigation and audit passed\n');
  } finally {dom.window.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
