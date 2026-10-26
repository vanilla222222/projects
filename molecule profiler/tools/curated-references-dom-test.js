'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..');
async function page(file,query=''){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(String(e)));
 const dom=await JSDOM.fromFile(path.join(root,file),{url:pathToFileURL(path.join(root,file)).href+query,resources:'usable',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.HTMLElement.prototype.scrollIntoView=()=>{};w.Worker=class{constructor(){throw Error('Blocked worker fixture');}};w.URL.createObjectURL=()=> 'blob:fixture';w.URL.revokeObjectURL=()=>{};}});
 if(dom.window.document.readyState!=='complete')await new Promise(r=>dom.window.addEventListener('load',r,{once:true}));
 return {dom,w:dom.window,d:dom.window.document,errors};
}
(async()=>{
 let p=await page('library-inspector.html');
 try{
  const {w,d}=p,button=[...d.querySelectorAll('#catalog-families button')].find(b=>b.dataset.tag==='Curated collection: Chemical probes and controls');assert.ok(button);button.click();
  assert.ok(Number(d.getElementById('catalog-result-total').textContent)>0);
  const links=[...d.querySelectorAll('#catalog-table a')].filter(a=>a.textContent.startsWith('Analyze '));assert.ok(links.length);
  for(const a of links){const u=new URL(a.href);assert.ok(w.CuratedReferences.selection(u.search));}
  assert.ok(d.body.textContent.includes('Curated panel diversity'));
  const csv=w.LibraryCatalog.catalogCsv(w.CuratedReferences.library(w.eval('LIBRARY')),{tags:['Curated collection: Chemical probes and controls']});assert.ok(csv.includes('Curated collection: Chemical probes and controls'));
  assert.ok(d.getElementById('catalog-study-coverage').textContent.includes('11/11'));
  assert.ok(d.getElementById('catalog-study-coverage').textContent.includes('14/14'));
  assert.ok(d.getElementById('catalog-study-coverage').textContent.includes('7/7'));
  button.click();const twoC=[...d.querySelectorAll('#catalog-families button')].find(b=>b.dataset.tag==='Curated collection: 2C measured pharmacology');assert.ok(twoC);twoC.click();
  assert.equal(Number(d.getElementById('catalog-result-total').textContent),30);
  twoC.click();const classified=[...d.querySelectorAll('#catalog-families button')].find(b=>b.dataset.tag==='Evidence: Curated action classification');assert.ok(classified);classified.click();
  const classifiedNames=new Set(w.CURATED_REFERENCES.records.filter(r=>r.evidence.some(e=>e.kind==='source_classification'&&e.action&&e.species==='Homo sapiens')).flatMap(r=>r.compounds.flatMap(c=>c.libraryNames)));
  assert.equal(Number(d.getElementById('catalog-result-total').textContent),classifiedNames.size);
  const family=[...d.querySelectorAll('#catalog-families button')].find(b=>b.dataset.tag==='Family motif: Aminobutyrophenones');assert.ok(family);family.click();
  assert.equal(Number(d.getElementById('catalog-result-total').textContent),4);
  assert.deepEqual(p.errors,[]);
 }finally{p.dom.window.close();}
 p=await page('index.html','?curated=prodrug-fosphenytoin&compound=0');
 try{
  const {w,d}=p;const until=async fn=>{const end=Date.now()+60000;while(!fn()&&Date.now()<end)await new Promise(r=>setTimeout(r,25));assert.ok(fn(),p.errors.join('\n'));};
  await until(()=>w.PharmacologyUI?.getSnapshot()?.curatedReferences?.some(r=>r.id==='prodrug-fosphenytoin'));
  await until(()=>d.getElementById('sim-summary').textContent.includes('reference structures ranked'));
  assert.ok(d.querySelector('#similar tbody tr[data-smiles]'));assert.ok(d.getElementById('sim-scope-count').textContent.includes('unassigned bulk structures'));
  const count=Number(d.getElementById('sim-summary').textContent.split(' ')[0]);assert.ok(count>5000&&count<6000,'Default eligibility pool should exclude unassigned bulk imports');
  let s=w.PharmacologyUI.getSnapshot();assert.ok(s.prodrugs.asProdrug.some(r=>r.curatedReferenceId==='prodrug-fosphenytoin'));
  assert.ok(d.getElementById('prodrug-matches').textContent.toLowerCase().includes('phenytoin'));
  assert.ok(d.getElementById('curated-reference-evidence').querySelector('a[href*="compound=1"]'));
  const sourceRecord=w.CURATED_REFERENCES.records.find(r=>r.id==='control-jq1'),positive=sourceRecord.compounds[0],negative=sourceRecord.compounds[1];
  assert.ok(!w.Pharmacology.exactGraph(w.buildMolecule(w.parseSmiles(positive.smiles)),w.buildMolecule(w.parseSmiles(negative.smiles))));
  d.getElementById('smiles-input').value='control, '+negative.smiles;d.getElementById('run').click();
  await until(()=>w.PharmacologyUI.getSnapshot()?.inputSmiles===negative.smiles);
  s=w.PharmacologyUI.getSnapshot();assert.ok(s.curatedReferences.some(r=>r.id==='control-jq1'));assert.ok(!s.curatedReferences.some(r=>r.id==='probe-jq1'),'Positive-enantiomer binding measurement must not transfer');assert.equal(s.prodrugs.asProdrug.length,0);
  const twoC=w.CURATED_REFERENCES.records.find(r=>r.id==='2c-study-2c-o-22');
  d.getElementById('smiles-input').value='2C source, '+twoC.compounds[0].smiles;d.getElementById('run').click();await until(()=>w.PharmacologyUI.getSnapshot()?.inputSmiles===twoC.compounds[0].smiles);
  s=w.PharmacologyUI.getSnapshot();const evidence=s.curatedReferences.find(r=>r.id===twoC.id).evidence[0];assert.equal(evidence.action,'partial_agonist');assert.equal(evidence.value,460);assert.equal(evidence.efficacy.value,35);
  assert.ok(d.getElementById('curated-reference-evidence').textContent.includes('partial agonist'));
  const classified=w.CURATED_REFERENCES.records.find(r=>r.id.startsWith('family-002-')&&r.compounds[0].sourceName==='promethazine');
  d.getElementById('smiles-input').value='source action, '+classified.compounds[0].smiles;d.getElementById('run').click();await until(()=>w.PharmacologyUI.getSnapshot()?.inputSmiles===classified.compounds[0].smiles);
  s=w.PharmacologyUI.getSnapshot();const action=s.curatedReferences.find(r=>r.id===classified.id).evidence[0];assert.equal(action.kind,'source_classification');assert.equal(action.receptorId,'HRH1');assert.equal(action.action,'antagonist');assert.equal(action.value,undefined);
  assert.deepEqual(p.errors,[]);
 }finally{p.dom.window.close();}
 console.log('Curated DOM: collection filters, working known-reference links, diversity summary, exact prodrug display/export and enantiomer evidence separation passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
