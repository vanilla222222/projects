'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url'),{JSDOM,VirtualConsole}=require('jsdom'),{observation,source}=require('./chembl-evidence-test');
(async()=>{
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(String(e)));
 const file=path.resolve(__dirname,'../library-inspector.html'),dom=await JSDOM.fromFile(file,{url:pathToFileURL(file).href,resources:'usable',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.HTMLElement.prototype.scrollIntoView=()=>{};}});
 try{
  if(dom.window.document.readyState!=='complete')await new Promise(r=>dom.window.addEventListener('load',r,{once:true}));
  const ui=dom.window.ReferenceResearchUI;assert.ok(ui,errors.join('\n'));const card=ui.observation(observation),text=card.textContent;
  assert.match(text,/ChEMBL standardized binding result: Ki = 125.89 nM \(ChEMBL standardized binding\)/);
  assert.match(text,/Original reported result: pKi = 6.9/);assert.match(text,/Host-cell species: Not reported/);assert.match(text,/Assay organism: Homo sapiens/);assert.match(text,/Target-assignment confidence score: 9/);assert.match(text,/Source database release: ChEMBL_37/);assert.match(text,/Activity ID: 12345/);assert.match(text,/Source snapshot: validation\/source-fixture.json/);assert.match(text,/Source location: panels\[0\].selected\[0\]/);assert.ok(text.includes(source.sourceSha256));assert.match(text,/Binding does not establish functional action/);
  const visible=card.cloneNode(true);for(const raw of visible.querySelectorAll('pre'))raw.remove();assert.ok(!/Participant result|source scale|reported SD|±|agonist/.test(visible.textContent),'Binding presentation must not imply functional action, unknown scale or experimental uncertainty');
  for(const url of [source.sourceUrl,source.documentUrl,source.moleculeUrl,source.targetUrl,source.activityUrl]){const link=[...card.querySelectorAll('a')].find(a=>a.href===url);assert.ok(link,'Visible source link: '+url);assert.equal(link.rel,'noopener noreferrer');}
  assert.equal(ui.valueLabel({...observation,value:undefined,endpoint:''}),'No numeric binding measurement transferred');assert.deepEqual(errors,[]);
  const data=dom.window.CHEMBL_CALCULATED_PROPERTIES,name=Object.keys(data.entries)[0];ui.openDossier(name);
  const panel=dom.window.document.querySelector('.chembl-calculated-properties');assert.ok(panel);assert.match(panel.textContent,/Calculated locally with RDKit/);assert.match(panel.textContent,/not experimental measurements or ChEMBL-reported property values/);
  assert.equal(panel.querySelectorAll('tbody tr').length,Object.keys(data.methods).length);const computed=dom.window.getComputedStyle;assert.equal(computed(panel.querySelector('table')).minWidth,'0');assert.equal(computed(panel.querySelector('tbody tr')).display,'table-row');assert.equal(computed(panel.querySelector('td')).display,'table-cell');
  for(const row of panel.querySelectorAll('tbody tr'))assert.equal(Number(row.querySelector('td').textContent),Number(data.entries[name].calculated[row.dataset.property].toFixed(({molecularWeight:2,exactMass:5,cLogP:3,tpsa:2})[row.dataset.property]||0)));
  assert.ok(!ui.model.dossier(name).observations.some(o=>o.kind==='measured_property'&&o.sourceFile==='data/chembl-properties.js'),'Local descriptors cannot become measured properties');
  console.log('ChEMBL dossier DOM: standardized vs original binding result, direct source links, provenance, assay context and binding-only scope passed');
 }finally{dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
