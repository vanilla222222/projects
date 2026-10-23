'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.PROFILER_JSDOM_PATH||'jsdom'),root=path.join(__dirname,'..');
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.test/'}),ctx=dom.getInternalVMContext(),w=dom.window;
for(const file of ['js/smiles','js/mol','js/smarts','js/stereo','js/transform','js/sites','js/descriptors','js/fingerprints','js/rules','data/metabolism','js/metabolism','js/pharmacology','js/prodrug-candidates','js/cleavable-groups','js/candidate-info'])vm.runInContext(fs.readFileSync(path.join(root,file+'.js'),'utf8'),ctx);
let snapshot;w.PharmacologyUI={render(record){snapshot={inputSmiles:record.smiles};},getSnapshot(){return snapshot;}};
vm.runInContext(fs.readFileSync(path.join(root,'js/pharmacology-upgrade.js'),'utf8'),ctx);
const $=id=>w.document.getElementById(id),run=s=>vm.runInContext(s,ctx);let checks=0;const ok=(v,s)=>{assert.ok(v,s);checks++;};
function render(smiles){w.testSmiles=smiles;w.PharmacologyUI.render({name:'Named input',smiles,mol:run('buildMolecule(parseSmiles(testSmiles))')},[]);}
async function complete(count){const start=Date.now();while(!$('candidate-info-status').textContent.includes(count+' / '+count+' complete.')){if(Date.now()-start>20000)throw Error('Candidate information did not complete: '+$('candidate-info-status').textContent);await new Promise(r=>setTimeout(r,10));}}
(async()=>{
 render('NCCc1ccc(OC)c(OC)c1OC');
 ok(w.document.querySelectorAll('.candidate-basic-info').length===25&&w.document.querySelectorAll('.candidate-metabolites').length===25,'Every card, including collapsed position groups, receives basic facts and a metabolite section');
 ok(snapshot.prodrugCandidates.rows.every(r=>r.information.formula&&r.information.name.value.includes('Named input')),'Formula and descriptive name exported immediately');
 await complete(25);
 ok(snapshot.prodrugCandidates.rows.every(r=>r.information.metabolites.status!=='pending'&&r.information.metabolites.status!=='unavailable'),'All 25 predictions finish automatically');
 ok(w.document.querySelectorAll('.candidate-metabolites ol').length===25&&Array.from(w.document.querySelectorAll('.candidate-metabolites ol')).every(l=>l.children.length<=3),'Up to three products displayed for every generated design');
 ok(snapshot.prodrugCandidates.rows.every(r=>r.information.metabolites.order==='priority'),'Default ranking is priority, not assumed abundance');
 ok(w.document.querySelectorAll('button[data-pharm-smiles]').length===25,'Candidate analysis handoffs preserved');
 ok(w.document.querySelector('.candidate-info-methods').textContent.includes('not measured abundance')&&w.document.querySelector('.candidate-info-methods').textContent.includes('not generated IUPAC'),'Naming and prediction limits visible in shared explanation');
 $('candidate-metabolite-order').value='mass';$('candidate-metabolite-order').dispatchEvent(new w.Event('change'));await complete(25);
 ok(snapshot.prodrugCandidates.rows.every(r=>r.information.metabolites.order==='mass'&&r.information.metabolites.rows.every((m,i,a)=>!i||a[i-1].molecularWeight>=m.molecularWeight)),'Batch sorting updates every card and exported summary');
 const stale=snapshot;render('COc1ccccc1');render('CCCC');await new Promise(r=>setTimeout(r,20));
 ok(w.document.querySelectorAll('.prodrug-candidate-card').length===0&&!snapshot.prodrugCandidates.rows.length&&$('candidate-metabolite-order').disabled,'Input with no candidates clears cards, prediction jobs and ordering control');
 ok(snapshot!==stale&&snapshot.inputSmiles==='CCCC'&&!$('candidate-info-status').textContent,'Cancelled jobs cannot update a new input snapshot or progress');
 render('CCN(C)C');await complete(1);
 ok(w.document.querySelector('.candidate-bbb').textContent.includes('Not assessed')&&snapshot.prodrugCandidates.rows[0].information.bbb.reason.includes('charged'),'Charged N-oxide has an explicit BBB limitation');
 console.log('Candidate information UI: '+checks+' checks passed.');dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});
