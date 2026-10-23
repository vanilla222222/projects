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


const fixtures=[['NCCc1ccc(OC)cc1',1],['Oc1ccc(OC)cc1',1],['CC(=O)c1ccc(OC)cc1',1],['COc1cc(OC)c(OC)cc1CCN',3],['COC(=O)c1ccc(OC)cc1',1],['NCCc1ccc(OC)c(OC)c1OC',3],['[Cl-].[NH3+]CCc1ccc(OC)cc1',1],['c1cc(OC)ccc1CCN',1],['COc1ccc(/C=C/C)cc1',1]];
for(const [input,count] of fixtures){
 render(input);const groups=w.CleavableGroups.redesignGroups(run('buildMolecule(parseSmiles(testInput))')).filter(g=>g.kind==='methoxy');
 ok(groups.length===count,'Recognize every methoxy on substituted ring: '+input);
 ok(!$('prodrug-ether-group').parentElement.hidden&&$('prodrug-ether-group').options.length===count+1,'Each group has a named selection: '+input);
 ok(groups.some(g=>String(g.oxygenAtom)===$('prodrug-design-site').value)&&$('prodrug-design-template').value.startsWith('redesign:'),'Default targets methoxy despite competing amine / OH / ester: '+input);
 for(const group of groups){
  change('prodrug-ether-group',group.id);
  ok($('prodrug-site-action-mode').value==='redesign'&&$('prodrug-ether-group').value===group.id&&$('prodrug-reference-atom').value===String(group.oxygenAtom),'Named group synchronizes mode and input oxygen');
  ok($('prodrug-design-template').options.length===7&&Array.from($('prodrug-design-template').options).every(o=>o.value.startsWith(group.id+':')),'Seven variants target only the chosen methoxy');
  ok(w.document.querySelector('#prodrug-site-evidence > .prodrug-site-depiction svg .bond.hot'),'Whole O–C methoxy bond is highlighted');
  $('prodrug-design-build').click();
  ok(snapshot.prodrugSiteRedesign?.modifiedCarbon===group.atom&&snapshot.prodrugSiteRedesign.selectedAtom===group.oxygenAtom&&!snapshot.prodrugSiteDesign&&!snapshot.prodrugSiteCleavage,'Preview modifies exactly chosen carbon and retains original numbering');
  $('prodrug-explorer-start-route').click();ok(snapshot.prodrugReleasePathway.targetRole.includes('different'),'Release explorer retains different-target scope');
 }
}
render('NCCc1ccc(OC)cc1');change('prodrug-design-site','0');ok($('prodrug-design-site').value==='0'&&!$('prodrug-design-template').value.startsWith('redesign:'),'Explicit amine selection is respected');
change('prodrug-site-action-mode','design');change('prodrug-ether-group',$('prodrug-ether-group').options[1].value);ok($('prodrug-site-action-mode').value==='redesign'&&!$('prodrug-design-build').disabled,'Named methoxy selection exits a restrictive parent-only filter');
render('COC');const dimethyl=Array.from($('prodrug-ether-group').options).filter(o=>o.value);ok(dimethyl.length===2,'Both sides of dimethyl ether have named choices');change('prodrug-ether-group',dimethyl[1].value);ok($('prodrug-ether-group').value===dimethyl[1].value&&$('prodrug-design-template').value.startsWith(dimethyl[1].value+':'),'Shared oxygen does not reset the chosen carbon side');
for(const input of ['COC(=O)c1ccccc1','CCCC','c1ccc(Oc2ccccc2)cc1']){render(input);ok($('prodrug-ether-group').parentElement.hidden&&!snapshot.prodrugSiteRedesign&&!snapshot.prodrugReleasePathway,'Methyl ester, unsupported input and diaryl ether do not inherit methoxy choices');}
render('COc1ccccc1');change('prodrug-reference-select','enalapril');ok($('prodrug-ether-group').parentElement.hidden,'Reference mode hides current-input group choices');
console.log('Methoxy group selection: '+checks+' checks passed.');dom.window.close();
