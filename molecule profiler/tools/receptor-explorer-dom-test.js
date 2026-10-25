'use strict';
// Optional real-DOM integration check using jsdom@26.1.0. It executes the actual
// explorer scripts, but cannot validate Chromium rendering or visual layout.
// Run with jsdom on NODE_PATH: node tools/receptor-explorer-dom-test.js
const assert=require('node:assert/strict');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const {CURATED_REFERENCES}=require('../data/curated-references');
const curated=require('../js/curated-references'),{TARGETS}=require('../data/targets'),{LIBRARY}=require('../data/library'),{RECEPTOR_REFERENCE_CATALOG}=require('../data/receptor-catalog');
const mergedLibrary=curated.library(LIBRARY,CURATED_REFERENCES);
const expectedAnnotations=curated.annotations(require('../data/receptor-ligand-annotations').RECEPTOR_LIGAND_ANNOTATIONS,mergedLibrary,CURATED_REFERENCES);
const expectedCoverage=require('../js/receptor-catalog').coverageReport(RECEPTOR_REFERENCE_CATALOG.receptors,curated.targets(TARGETS,CURATED_REFERENCES),mergedLibrary,expectedAnnotations);
const annotatedReceptors=new Set(expectedAnnotations.map(a=>a.receptorId)).size;
const awaiting=expectedCoverage.rows.filter(r=>!r.hasTarget);
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
    assert.ok($('receptor-summary').textContent.includes(awaiting.length+' awaiting'));
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
    $('receptor-reset').click();change('receptor-search',awaiting[0].id);change('receptor-coverage','awaiting');
    assert.equal($('receptor-results').querySelectorAll('button').length,1);
    $('receptor-results').querySelector('button').click();
    assert.match($('receptor-detail').textContent,/Awaiting ligand curation/);
    $('receptor-reset').click();change('receptor-coverage','annotated');
    assert.equal($('receptor-results').querySelectorAll('button').length,annotatedReceptors);
    change('receptor-coverage','at_goal');assert.equal($('receptor-results').querySelectorAll('button').length,expectedCoverage.atGoal);
    $('receptor-results').querySelector('[data-receptor-id="HRH2"]').click();
    assert.equal($('receptor-detail').querySelector('progress').value,50);
    assert.match($('receptor-detail').textContent,/functional action unassigned/);
    const evidenceButton=[...$('receptor-detail').querySelectorAll('button')].find(b=>b.textContent==='Export source-linked ligand evidence');
    evidenceButton.click();const evidence=JSON.parse(await downloads.at(-1).blob.text());
    assert.equal(evidence.ligands.length,50);assert.ok(evidence.ligands.every(a=>a.action==='binding_only'));
    $('receptor-coverage-export').click();const coverage=JSON.parse(await downloads.at(-1).blob.text());
    assert.equal(coverage.receptors,146);assert.equal(coverage.atGoal,expectedCoverage.atGoal);
    $('receptor-reset').click();change('receptor-search','HTR2A');$('receptor-results').querySelector('[data-receptor-id="HTR2A"]').click();
    [...$('receptor-detail').querySelectorAll('button')].find(b=>b.textContent==='Export source-linked ligand evidence').click();
    const twoC=JSON.parse(await downloads.at(-1).blob.text()).ligands.filter(a=>a.curatedReferenceId?.startsWith('2c-study-'));
    assert.equal(twoC.length,32);assert.ok(twoC.every(a=>a.action==='partial_agonist'&&a.species==='Homo sapiens'));
    assert.equal(twoC.find(a=>a.ligandName==='2C-O-22').efficacy.value,35);
    $('receptor-reset').click();
    change('receptor-search','DRD1');$('receptor-results').querySelector('[data-receptor-id="DRD1"]').click();
    assert.ok($('receptor-detail').textContent.includes('curated action classification'));
    [...$('receptor-detail').querySelectorAll('button')].find(b=>b.textContent==='Export source-linked ligand evidence').click();
    const classified=JSON.parse(await downloads.at(-1).blob.text()).ligands.filter(a=>a.curatedReferenceId?.startsWith('family-002-'));
    assert.equal(classified.length,3);assert.deepEqual(classified.map(a=>a.action).sort(),['agonist','antagonist','partial_agonist']);assert.ok(classified.every(a=>a.evidenceType==='source_classification'&&a.classification.sourceRecord['Target Species']==='Human'));
    $('receptor-reset').click();
    change('receptor-search','PPARG');$('receptor-results').querySelector('[data-receptor-id="PPARG"]').click();
    [...$('receptor-detail').querySelectorAll('button')].find(b=>b.textContent==='Export source-linked ligand evidence').click();
    const nuclear=JSON.parse(await downloads.at(-1).blob.text()).ligands.filter(a=>a.curatedReferenceId?.startsWith('family-003-'));
    assert.equal(nuclear.length,3);assert.ok(nuclear.every(a=>a.action==='agonist'&&a.receptorId==='PPARG'));
    $('receptor-reset').click();change('receptor-search','HRH1');$('receptor-results').querySelector('[data-receptor-id="HRH1"]').click();
    [...$('receptor-detail').querySelectorAll('button')].find(b=>b.textContent==='Export source-linked ligand evidence').click();
    const inverse=JSON.parse(await downloads.at(-1).blob.text()).ligands.find(a=>a.classification?.sourceRecord.Ligand==='cetirizine');assert.ok(inverse);assert.equal(inverse.action,'inverse_agonist');assert.equal(inverse.evidenceType,'source_classification');
    $('receptor-reset').click();
    change('receptor-coverage','below_goal');assert.equal($('receptor-results').querySelectorAll('button').length,expectedCoverage.receptors-expectedCoverage.atGoal);
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
