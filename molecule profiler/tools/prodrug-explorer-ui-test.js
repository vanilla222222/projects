'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.PROFILER_JSDOM_PATH||'jsdom'),root=path.join(__dirname,'..');
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.test/'}),ctx=dom.getInternalVMContext(),w=dom.window;
for(const name of ['smiles','mol','smarts','stereo','transform','descriptors','pharmacology','prodrug-candidates','cleavable-groups','prodrug-explorer','depict'])vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'data/pharmacology-evidence.js'),'utf8'),ctx);
let snapshot,downloaded,filename;w.PharmacologyUI={render(record){snapshot={inputSmiles:record.smiles};},getSnapshot(){return snapshot;}};
w.Blob=class{constructor(parts){this.text=parts.join('');}};w.URL.createObjectURL=b=>{downloaded=b;return 'blob:test';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){filename=this.download;};
for(const name of ['prodrug-site-evidence','prodrug-explorer-ui'])vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),ctx);
const $=id=>w.document.getElementById(id),run=s=>vm.runInContext(s,ctx);let checks=0;const ok=(v,s)=>{assert.ok(v,s);checks++;};
function render(smiles){w.testInput=smiles;w.PharmacologyUI.render({smiles,mol:run('buildMolecule(parseSmiles(testInput))')},[]);}
function change(id,value){$(id).value=value;$(id).dispatchEvent(new w.Event('change'));}
render('NCCO');
ok(!$('prodrug-explorer').hidden&&$('prodrug-explorer-atoms').querySelectorAll('tbody tr').length===4,'Every atom has an inspection row');
ok($('prodrug-explorer-site-reason').textContent.includes('primary amine'),'Selected handle has explanation');
change('prodrug-explorer-filter','unsupported');ok($('prodrug-explorer-atoms').querySelectorAll('tbody tr').length===2,'Unsupported filter works');
$('prodrug-explorer-atoms').querySelector('button').click();ok($('prodrug-reference-atom').value==='1'&&$('prodrug-design-build').disabled,'Scan click selects original atom and updates existing builder');
change('prodrug-reference-atom','0');$('prodrug-explorer-compare-site').click();
ok(snapshot.prodrugSiteComparison.rows.length===6,'Selected site populates five candidate comparisons plus input');
ok(snapshot.prodrugSiteComparison.rows[1].values.mw>0&&$('prodrug-explorer-comparison').textContent.includes('WLOGP estimate'),'Calculated properties and estimated logP labelled');
change('prodrug-design-site','3');$('prodrug-design-build').click();$('prodrug-explorer-add-design').click();ok(snapshot.prodrugSiteComparison.rows.length===7,'Shortlist retains candidates across sites');
$('prodrug-explorer-add-design').click();ok(snapshot.prodrugSiteComparison.rows.length===7,'Repeated design deduplicates');
$('prodrug-explorer-export-smiles').click();ok(filename.endsWith('.smi')&&downloaded.text.split('\n').filter(Boolean).length===7,'SMILES export includes parent and every comparison design');
$('prodrug-explorer-export-csv').click();ok(filename.endsWith('.csv')&&downloaded.text.includes('WLOGP estimate')&&downloaded.text.includes('Delta mw'),'Property export retains units and deltas');
render('CCN');ok(snapshot.prodrugSiteComparison.rows.length===1&&!snapshot.prodrugReleasePathway,'New input resets shortlist and pathway');
$('prodrug-design-build').click();$('prodrug-explorer-start-route').click();
ok(snapshot.prodrugReleasePathway.steps.length===0&&!$('prodrug-explorer-route-next').disabled,'Candidate starts a route with available choices');
for(const kind of ['ester','hydroxymethyl-linker','carbamic-acid']){
 const options=w.ProdrugExplorer.options(snapshot.prodrugReleasePathway),index=options.findIndex(o=>o.kind===kind);ok(index>=0,'Step available: '+kind);$('prodrug-explorer-route-option').value=String(index);$('prodrug-explorer-route-next').click();
}
ok(snapshot.prodrugReleasePathway.targetPresent&&snapshot.prodrugReleasePathway.frontier.length===4,'Three-step route reaches parent while retaining all byproducts');
ok($('prodrug-explorer-route-status').textContent.includes('biological release remains unvalidated'),'Parent structural match does not become biological evidence');
ok($('prodrug-explorer-route-view').querySelectorAll('figure').length===4,'Every frontier fragment is depicted');
$('prodrug-explorer-export-route').click();ok(JSON.parse(downloaded.text).steps.length===3&&filename.endsWith('.json'),'Full route can be exported');
$('prodrug-explorer-route-undo').click();ok(snapshot.prodrugReleasePathway.steps.length===2&&!snapshot.prodrugReleasePathway.targetPresent,'Undo restores prior intermediate and target status');
change('prodrug-design-template','amine-propionyloxy');ok(!snapshot.prodrugReleasePathway&&!$('prodrug-explorer-route-view').textContent,'Template changes clear stale route');
change('prodrug-reference-select','enalapril');ok($('prodrug-explorer').hidden&&snapshot.prodrugSiteEvidence.status==='documented-reference-site','Reference evidence stays separate from generated scan');
$('prodrug-design-use-input').click();ok(!$('prodrug-explorer').hidden,'Explorer returns for current input');
render('COc1ccccc1');$('prodrug-design-build').click();$('prodrug-explorer-start-route').click();ok(snapshot.prodrugReleasePathway.steps.length===1&&!snapshot.prodrugReleasePathway.targetSmiles,'Existing-group preview starts a route without claiming input regeneration');
render('[Cl-].CC[NH3+]');ok(snapshot.prodrugSiteExplorer.atoms[0].reason.includes('counterion')&&snapshot.prodrugSiteComparison.rows[0].smiles==='CC[NH3+]','Salt scan and comparison scope are explicit');
render('CCO.O');ok($('prodrug-explorer-compare-site').disabled&&snapshot.prodrugSiteComparison.rows.length===0&&snapshot.prodrugSiteExplorer.atoms.every(a=>a.reason.includes('Input-level check')),'Unsupported input clears old comparison and explains block');

render('COc1ccccc1');change('prodrug-site-action-mode','redesign');
ok($('prodrug-design-template').options.length===7&&$('prodrug-design-template').value.startsWith('redesign:'),'Dedicated ether redesign mode offers seven ester variants');
$('prodrug-design-build').click();
ok(snapshot.prodrugSiteRedesign.status==='designed'&&!snapshot.prodrugSiteDesign&&!snapshot.prodrugSiteCleavage,'Redesign snapshot remains separate from original-parent designs and existing cleavage');
ok($('prodrug-design-preview').querySelectorAll('figure').length===3&&$('prodrug-design-preview').textContent.includes('DIFFERENT RELEASE TARGET'),'Preview depicts input, ester-bearing ether and OH target');
ok(!$('prodrug-explorer-add-design')&&$('prodrug-explorer-start-route'),'Redesign cannot enter original-parent comparison; release route available');
const etherDesign=snapshot.prodrugSiteRedesign;
ok($('prodrug-design-preview').querySelector('button[data-pharm-smiles]').dataset.pharmSmiles===etherDesign.smiles,'Analyze handoff uses exact redesign');
Array.from($('prodrug-design-preview').querySelectorAll('button')).find(b=>b.textContent.includes('Download')).click();ok(downloaded.text.includes(etherDesign.smiles)&&downloaded.text.includes(etherDesign.releaseTargetSmiles),'SMILES export labels redesigned molecule and distinct release target');
$('prodrug-explorer-start-route').click();ok(snapshot.prodrugReleasePathway.targetRole.includes('different from original'),'Route retains distinct target role');
for(const kind of ['ester','ether-hemiacetal']){const options=w.ProdrugExplorer.options(snapshot.prodrugReleasePathway);$('prodrug-explorer-route-option').value=String(options.findIndex(o=>o.kind===kind));$('prodrug-explorer-route-next').click();}
ok(snapshot.prodrugReleasePathway.targetPresent&&$('prodrug-explorer-route-status').textContent.includes('differs from the original ether'),'Two-step UI route reaches OH analogue without claiming original recovery');
$('prodrug-explorer-route-undo').click();ok(snapshot.prodrugReleasePathway.targetRole&&!snapshot.prodrugReleasePathway.targetPresent,'Undo preserves redesigned target scope');
change('prodrug-site-action-mode','design');ok(!snapshot.prodrugSiteRedesign&&$('prodrug-design-build').disabled&&!snapshot.prodrugReleasePathway,'Parent-recovery filter excludes ether redesign and clears stale snapshot');
change('prodrug-site-action-mode','redesign');render('CCCC');ok($('prodrug-design-build').disabled&&!snapshot.prodrugSiteRedesign,'Unsupported input clears ether preview');
console.log('Molecule-site explorer UI: '+checks+' checks passed.');dom.window.close();
