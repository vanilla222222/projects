'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const {PHARMACOLOGY_EVIDENCE:evidence}=require('../data/pharmacology-evidence');
(async()=>{
 const errors=[],downloads=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(String(e)));
 const dom=await JSDOM.fromFile(path.join(__dirname,'../index.html'),{resources:'usable',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.Blob=Blob;w.URL.createObjectURL=b=>{downloads.push(b);return 'blob:fixture';};w.URL.revokeObjectURL=()=>{};
  w.HTMLAnchorElement.prototype.click=function(){};w.HTMLElement.prototype.scrollIntoView=function(){};
 }});
 try{
  const w=dom.window,d=w.document,$=id=>d.getElementById(id);
  if(d.readyState!=='complete')await new Promise(r=>w.addEventListener('load',r,{once:true}));
  async function until(test){const end=Date.now()+45000;while(!test()&&Date.now()<end)await new Promise(r=>setTimeout(r,25));assert.ok(test(),errors.join('\n'));}
  await until(()=>$('results').hidden===false&&w.PharmacologyUI?.getSnapshot());assert.deepEqual(errors,[]);
  assert.equal($('tgt-mode').value,'ensemble');assert.match($('tgt-motifs').textContent,/structural motifs/);
  assert.equal($('met-low-details').open,false);assert.ok($('met-bench').closest('details'));assert.equal($('met-bench').closest('details').open,false);
  const snap=w.PharmacologyUI.getSnapshot();assert.ok(snap.predictions.halfLife);assert.ok(snap.predictions.logD74);
  assert.match($('pk-predictions').textContent,/Held-out/);assert.match($('prodrug-status').textContent,/unknown/);
  function input(id,value){$(id).value=value;$(id).dispatchEvent(new w.Event('input',{bubbles:true}));}
  input('pk-pka','7.4');input('pk-ph','7.4');assert.match($('pk-ion-result').textContent,/50%/);
  assert.equal($('pk-profile-details').hidden,false);assert.equal($('pk-profile').tBodies[0].rows.length,15);
  input('pk-pka-source','Fixture source');input('pk-clearance','10');input('pk-volume','100');assert.match($('pk-half-scenario').textContent,/6.93/);
  input('pk-clearance','0');assert.match($('pk-half-scenario').textContent,/positive/);input('pk-clearance','10');
  $('pharmacology-export').click();const sidecar=JSON.parse(await downloads.at(-1).text());
  assert.equal(sidecar.scenarios.phProfile.length,15);assert.ok(sidecar.chemistryEligibility.eligible);
  assert.equal(sidecar.scenarios.inputs.pkaSource,'Fixture source');assert.equal(sidecar.scenarios.inputs.pka,7.4);
  assert.ok(sidecar.modelInformation.halfLife.sourceUrl);assert.ok(sidecar.modelSourceSha256['js/pk-features.js']);
  $('smiles-input').value='Mixture, CCO.O';$('run').click();
  await until(()=>w.PharmacologyUI.getSnapshot().inputSmiles==='CCO.O'&&!$('run').disabled);
  const unsupported=w.PharmacologyUI.getSnapshot();assert.equal(unsupported.predictions.halfLife.available,false);assert.match(unsupported.predictions.halfLife.reason,/Disconnected/);assert.equal($('pk-profile-details').hidden,true);
  const r=evidence.relationships.find(r=>r.prodrug.name==='Lisdexamfetamine');
  $('smiles-input').value='Lisdexamfetamine, '+r.prodrug.smiles;$('run').click();
  await until(()=>w.PharmacologyUI.getSnapshot().inputSmiles===r.prodrug.smiles&&!$('run').disabled);
  assert.match($('prodrug-status').textContent,/Documented prodrug/);assert.match($('prodrug-matches').textContent,/Dextroamphetamine/);
  assert.match($('pk-observations').textContent,/less than 1 h/);assert.match($('prodrug-enumeration').textContent,/Dextroamphetamine/);
  assert.equal($('pk-pka').value,'','Do not carry a prior molecule pKa into a new query');
  assert.equal($('pk-pka-source').value,'');
  $('smiles-input').value='Dextroamphetamine, '+r.active.smiles;$('run').click();
  await until(()=>w.PharmacologyUI.getSnapshot().inputSmiles===r.active.smiles&&!$('run').disabled);
  assert.match($('prodrug-examples').textContent,/Lisdexamfetamine/);assert.match($('pk-observations').textContent,/10–11.3 h/);
  const before=$('smiles-input').value;const details=$('effect-context').querySelector('summary');if(details){details.click();assert.equal($('smiles-input').value,before);}
  if(!$('met-low-details').hidden){$('met-low-details').open=true;assert.ok(d.querySelector('#met-low tbody').children.length);}
  $('export-full').click();const csv=await downloads.at(-1).text();assert.match(csv,/metabolism/);assert.match(csv,/diagnostics.ruleApplications/);
  assert.deepEqual(errors,[]);console.log('Pharmacology DOM: model evidence, controls, provenance JSON, prodrug/active distinction, per-molecule reset, conditional context and collapsed metabolism passed');
 }finally{dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
