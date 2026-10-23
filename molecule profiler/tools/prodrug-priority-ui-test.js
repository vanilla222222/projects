'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.PROFILER_JSDOM_PATH||'jsdom'),root=path.join(__dirname,'..');
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.test/'}),ctx=dom.getInternalVMContext(),w=dom.window;
for(const name of ['smiles','mol','smarts','stereo','transform','descriptors','pharmacology','prodrug-candidates','cleavable-groups','prodrug-explorer','prodrug-priority','depict'])vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'data/pharmacology-evidence.js'),'utf8'),ctx);
let snapshot,downloaded,filename;w.PharmacologyUI={render(record){snapshot={inputSmiles:record.smiles};},getSnapshot(){return snapshot;}};
w.Blob=class{constructor(parts){this.text=parts.join('');}};w.URL.createObjectURL=b=>{downloaded=b;return 'blob:test';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){filename=this.download;};
for(const name of ['prodrug-site-evidence','prodrug-explorer-ui'])vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),ctx);
const $=id=>w.document.getElementById(id),run=s=>vm.runInContext(s,ctx);let checks=0;const ok=(v,s)=>{assert.ok(v,s);checks++;};
function render(smiles){w.testInput=smiles;w.PharmacologyUI.render({smiles,mol:run('buildMolecule(parseSmiles(testInput))')},[]);}
function change(id,value){$(id).value=value;$(id).dispatchEvent(new w.Event('change'));}
async function reviewed(){for(let i=0;i<100;i++){if(!$('prodrug-priority-review').disabled)return;await new Promise(r=>setTimeout(r,5));}throw Error('Review did not complete');}
async function main(){
 render('CC(=O)O');ok($('prodrug-priority-review').disabled&&$('prodrug-priority-status').textContent.includes('Add designs'),'Empty shortlist explains next action');
 $('prodrug-explorer-compare-site').click();ok(!$('prodrug-priority-review').disabled&&!snapshot.prodrugResearchReview,'Shortlist enables explicit review');
 $('prodrug-priority-review').click();ok($('prodrug-priority-review').disabled,'Review prevents duplicate concurrent work');await reviewed();
 ok(snapshot.prodrugResearchReview.rows.length===5,'All five shortlisted designs reviewed');
 ok($('prodrug-priority-results').querySelectorAll('tbody tr').length===5,'Criteria table contains five candidates');
 ok($('prodrug-priority-results').textContent.includes('Methanol')&&$('prodrug-priority-results').querySelector('a[href="https://www.cdc.gov/niosh/npg/npgd0397.html"]'),'Methanol concern has an authoritative source link');
 ok($('prodrug-priority-results').textContent.includes('unlisted')&&$('prodrug-priority-results').textContent.includes('no safety conclusion'),'Unlisted products retain unknown safety status');
 change('prodrug-priority-sort','mw');change('prodrug-priority-direction','desc');
 const first=$('prodrug-priority-results').querySelector('tbody tr').dataset.candidateId,expected=w.ProdrugPriority.sort(snapshot.prodrugResearchReview.rows,'mw','desc')[0].id;
 ok(first===expected&&snapshot.prodrugResearchReview.view.criterion==='mw','Criterion sorting and exported snapshot view agree');
 change('prodrug-priority-route-filter','unresolved');ok($('prodrug-priority-results').querySelectorAll('tbody tr').length===0,'Route coverage filter does not invent unresolved rows');
 change('prodrug-priority-route-filter','found');$('prodrug-priority-results').querySelector('button[data-priority-route]').click();
 ok(snapshot.prodrugReleasePathway.targetPresent,'Selected reviewed route opens in release explorer');
 $('prodrug-priority-export').click();const exported=JSON.parse(downloaded.text);
 ok(filename==='prodrug-research-review.json'&&exported.rows.length===5&&exported.view.routeFilter==='found','Export contains full criteria and selected view');
 ok(exported.rows.some(r=>r.byproducts.some(p=>p.source?.url)),'Export retains product concern provenance');
 $('prodrug-design-build').click();$('prodrug-explorer-add-design').click();ok(!snapshot.prodrugResearchReview&&$('prodrug-priority-results').textContent===''&&$('prodrug-priority-export').disabled,'Shortlist event invalidates old review');
 $('prodrug-priority-review').click();render('CCO');await new Promise(r=>setTimeout(r,20));
 ok(!snapshot.prodrugResearchReview&&$('prodrug-priority-results').textContent===''&&$('prodrug-priority-review').disabled,'Input change cancels pending review without stale output');
 render('CC[NH3+]');$('prodrug-explorer-compare-site').click();$('prodrug-priority-review').click();await reviewed();
 ok(snapshot.prodrugResearchReview.rows.every(r=>r.route.status!=='found'&&r.byproducts===null),'Charge mismatch remains unresolved with unknown byproducts');
 ok($('prodrug-priority-results').textContent.includes('Not enumerated'),'Unresolved row explains missing byproducts');
 change('prodrug-priority-route-filter','found');ok($('prodrug-priority-results').querySelectorAll('tbody tr').length===0,'Found filter omits unresolved candidates');
 change('prodrug-reference-select','enalapril');ok($('prodrug-explorer').hidden,'Reference mode does not show unrelated generated priority rows');
 render('CCO.O');ok(!snapshot.prodrugResearchReview&&$('prodrug-priority-review').disabled&&$('prodrug-priority-export').disabled,'Unsupported input clears priority state');
 console.log('Prodrug research priority UI: '+checks+' checks passed.');dom.window.close();
}
main().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});
