'use strict';
(function(root){
 if(!root.document||!root.PharmacologyUI||!root.ProdrugExplorer)return;
 const doc=root.document,$=id=>doc.getElementById(id),host=$('prodrug-site-evidence');if(!host)return;
 const make=(tag,text)=>{const e=doc.createElement(tag);if(text!==undefined)e.textContent=String(text);return e;};
 const button=(text,fn)=>{const b=make('button',text);b.type='button';b.addEventListener('click',fn);return b;};
 const parse=s=>buildMolecule(parseSmiles(s));
 const download=(name,text,type='text/plain;charset=utf-8')=>{const url=root.URL.createObjectURL(new root.Blob([text],{type})),a=make('a');a.href=url;a.download=name;a.click();root.setTimeout(()=>root.URL.revokeObjectURL(url),1000);};
 const section=make('section');section.id='prodrug-explorer';section.className='pk-research-extension';
 section.append(make('h4','Molecule-site explorer'),make('p','Compatibility describes implemented structural rules. Reaction-class hypotheses are unvalidated for this molecule. Documented compound relationships remain in the reference viewer above; they are not assigned to these generated options.'));
 const selectedReason=make('p');selectedReason.id='prodrug-explorer-site-reason';selectedReason.setAttribute('role','status');
 const scanDetails=make('details'),scanSummary=make('summary'),filterLabel=make('label','Show atoms '),filter=make('select');filter.id='prodrug-explorer-filter';
 [['all','Every atom'],['compatible','Compatible atoms'],['unsupported','Atoms without a supported rule']].forEach(([v,t])=>{const o=make('option',t);o.value=v;filter.append(o);});filterLabel.append(filter);
 const scanRows=make('div');scanRows.id='prodrug-explorer-atoms';scanRows.className='prodrug-table-scroll';scanDetails.append(scanSummary,filterLabel,scanRows);section.append(selectedReason,scanDetails);
 const compare=make('section');compare.className='pk-research-extension';compare.append(make('h4','Candidate property comparison'),make('p','Build a shortlist from different sites, or compare up to five designs at the selected site. Values in parentheses are changes from the input component. Lower or higher values do not establish better ADME. WLOGP is estimated; HBD/HBA use strict counts.'));
 const compareStatus=make('p');compareStatus.id='prodrug-explorer-compare-status';compareStatus.setAttribute('role','status');
 const compareButton=button('Compare designs at selected site',()=>{
  const atom=Number($('prodrug-reference-atom').value);if(!record||!inputMode())return;
  const report=root.ProdrugCandidates.generate(record.mol,{atom,limit:5});
  report.rows.forEach(addCandidate);compareStatus.textContent=report.rows.length?'Added eligible designs. Up to 12 distinct candidates can be compared.':report.reasons.join(' ');renderComparison();
 });compareButton.id='prodrug-explorer-compare-site';
 const compareClear=button('Clear shortlist',()=>{shortlist=[];compareStatus.textContent='Shortlist cleared.';renderComparison();});
 const compareSmiles=button('Download SMILES for SwissADME',()=>{const data=comparison();download('molecule-site-comparison.smi',data.rows.map(r=>r.smiles+'\t'+r.name.replace(/[\t\r\n]/g,' ')).join('\n')+'\n');});compareSmiles.id='prodrug-explorer-export-smiles';
 const compareCsv=button('Download property CSV',()=>{
  const fields=['mw','logp','tpsa','hbd','hba','rotatableBonds','charge'],data=comparison(),quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const rows=[['Name','SMILES','Evidence','MW (g/mol)','WLOGP estimate','TPSA (angstrom^2)','HBD strict','HBA strict','Rotatable bonds','Formal charge',...fields.map(k=>'Delta '+k)],...data.rows.map(r=>[r.name,r.smiles,r.evidenceLevel,...fields.map(k=>r.values?.[k]??''),...fields.map(k=>r.delta?.[k]??'')])];
  download('molecule-site-properties.csv',rows.map(r=>r.map(quote).join(',')).join('\r\n')+'\r\n','text/csv;charset=utf-8');
 });compareCsv.id='prodrug-explorer-export-csv';
 const compareTable=make('div');compareTable.id='prodrug-explorer-comparison';compareTable.className='prodrug-table-scroll';
 compare.append(compareButton,compareClear,compareSmiles,compareCsv,compareStatus,compareTable);section.append(compare);
 const routeHost=make('section');routeHost.className='pk-research-extension';routeHost.id='prodrug-explorer-route';
 routeHost.append(make('h4','Release-step explorer'),make('p','Start from a preview above, then choose which fragment and transformation to follow. Every released fragment is retained. Up to four steps can be explored; no dominant pathway, conversion speed or active product is predicted.'));
 const routeStatus=make('p');routeStatus.id='prodrug-explorer-route-status';routeStatus.setAttribute('role','status');
 const routeView=make('div');routeView.id='prodrug-explorer-route-view';
 const routeLabel=make('label','Next fragment and step '),routeSelect=make('select');routeSelect.id='prodrug-explorer-route-option';routeLabel.append(routeSelect);
 const advance=button('Preview next step',()=>{
  try{const options=root.ProdrugExplorer.options(route),option=options[Number(routeSelect.value)];route=root.ProdrugExplorer.advance(route,option);routeError='';renderRoute();}catch(e){routeStatus.textContent=e.message;}
 });advance.id='prodrug-explorer-route-next';
 const undo=button('Undo last step',()=>{if(!route?.steps.length)return;const steps=route.steps.slice(0,-1),old=route;route=root.ProdrugExplorer.start(old.startSmiles,old.targetSmiles);for(const step of steps){const option=root.ProdrugExplorer.options(route).find(o=>o.productId===step.consumed.id&&o.pathId===step.pathway.id);route=root.ProdrugExplorer.advance(route,option);}renderRoute();});undo.id='prodrug-explorer-route-undo';
 const routeExport=button('Download pathway JSON',()=>{if(route)download('hypothetical-release-pathway.json',JSON.stringify(route,null,2)+'\n','application/json');});routeExport.id='prodrug-explorer-export-route';
 routeHost.append(routeStatus,routeLabel,advance,undo,routeExport,routeView);section.append(routeHost);host.append(section);
 let record=null,scan=null,shortlist=[],route=null,routeError='';
 const snapshot=()=>root.PharmacologyUI.getSnapshot(),inputMode=()=>$('prodrug-reference-select').value==='__input__';
 function addCandidate(row){
  if(shortlist.some(r=>Pharmacology.exactGraph(parse(r.smiles),parse(row.smiles))))return;
  if(shortlist.length<12)shortlist.push(row);
 }
 function comparison(){return record?root.ProdrugExplorer.comparison(record.mol,shortlist):{rows:[]};}
 function renderScan(){
  section.hidden=!record||!inputMode();if(section.hidden)return;
  const atom=Number($('prodrug-reference-atom').value),site=scan?.atoms.find(a=>a.atom===atom);
  selectedReason.textContent=site?site.element+(site.atom+1)+' · '+site.reason+' '+site.evidenceLevel:'';
  compareButton.disabled=!site?.options.some(o=>o.mode==='design');
  scanSummary.textContent='All-atom scan · '+(scan?.compatibleAtoms||0)+' of '+(scan?.atoms.length||0)+' atoms have supported options';
  scanRows.replaceChildren();const table=make('table'),caption=make('caption','Atom numbers follow the input SMILES. Counts describe options, not evidence strength or expected benefit.'),head=make('tr');
  ['Atom','Supported options','Reason and evidence'].forEach(t=>head.append(make('th',t)));const thead=make('thead');thead.append(head);table.append(caption,thead);const tbody=make('tbody');
  for(const a of scan?.atoms||[]){
   if(filter.value==='compatible'&&!a.compatible||filter.value==='unsupported'&&a.compatible)continue;
   const tr=make('tr');if(a.atom===atom)tr.className='prodrug-selected-atom';const td=make('td'),select=button(a.element+(a.atom+1),()=>{$('prodrug-reference-atom').value=String(a.atom);$('prodrug-reference-atom').dispatchEvent(new root.Event('change'));});select.setAttribute('aria-label','Inspect input atom '+(a.atom+1)+' '+a.element);td.append(select);tr.append(td,make('td',a.options.length));const explanation=make('td');explanation.append(make('p',a.reason),make('small',a.evidenceLevel));tr.append(explanation);tbody.append(tr);
  }table.append(tbody);scanRows.append(table);
  const s=snapshot();if(s)s.prodrugSiteExplorer={inputSmiles:record.smiles,...scan};
 }
 function renderComparison(){
  const report=comparison(),s=snapshot();if(s)s.prodrugSiteComparison=record?{inputSmiles:record.smiles,...report}:null;
  compareTable.replaceChildren();compareSmiles.disabled=compareCsv.disabled=!report.rows.some(r=>r.role==='candidate');
  if(!report.rows.length){compareTable.append(make('p',report.reason||'No comparison is available.'));return;}
  const table=make('table'),caption=make('caption','Input and '+(report.rows.length-1)+' shortlisted design(s). '+report.scope);table.append(caption);const head=make('tr');
  ['Structure','MW (g/mol)','WLOGP estimate','TPSA (Å²)','HBD','HBA','Rotatable bonds','Charge'].forEach(t=>head.append(make('th',t)));const thead=make('thead');thead.append(head);table.append(thead);const body=make('tbody');
  for(const row of report.rows){const tr=make('tr'),name=make('td');name.append(make('strong',row.name),make('small',row.evidenceLevel));const details=make('details');details.append(make('summary','SMILES'),make('code',row.smiles));name.append(details);tr.append(name);
   for(const key of ['mw','logp','tpsa','hbd','hba','rotatableBonds','charge']){const value=row.values?.[key],delta=row.delta?.[key],digits=['mw','logp','tpsa'].includes(key)?2:0;tr.append(make('td',Number.isFinite(value)?value.toFixed(digits)+(row.role==='candidate'&&Number.isFinite(delta)?' ('+(delta>0?'+':'')+delta.toFixed(digits)+')':''):'Unavailable'));}body.append(tr);
  }table.append(body);compareTable.append(table);
 }
 function renderRoute(){
  routeView.replaceChildren();routeSelect.replaceChildren();const options=root.ProdrugExplorer.options(route);
  options.forEach((o,i)=>{const option=make('option',o.productId+' · '+o.label);option.value=String(i);routeSelect.append(option);});advance.disabled=!options.length;routeSelect.disabled=!options.length;undo.disabled=!route?.steps.length;routeExport.disabled=!route;
  routeStatus.textContent=route?route.steps.length+' step(s) explored. '+(route.targetPresent?'The frontier contains an exact structural match to the design parent; biological release remains unvalidated.':route.targetSmiles?'The design parent has not been reached by the selected steps.':'No parent-regeneration claim is assigned.')+(route.steps.length>=4?' Four-step exploration limit reached.':!options.length?' No further supported rule matches the remaining fragments.':''):'Start a pathway from a design or existing-group preview.';
  if(routeError)routeStatus.textContent=routeError;
  if(route){
   const start=make('details');start.append(make('summary','Starting structure'),make('code',route.startSmiles));routeView.append(start);
   for(const step of route.steps){const item=make('details');item.open=true;item.append(make('summary','Step '+step.number+' · '+step.pathway.label),make('p',root.ProdrugExplorer.evidenceLevel),make('p',step.hypothesis),make('p',step.formalInput),make('p','Consumes '+step.consumed.id+': '+step.consumed.smiles));
    step.products.forEach(p=>item.append(make('p',p.id+': '+p.smiles)));
    const notes=make('ul');step.limitations.concat(step.stereoChanges.map(s=>s.change)).forEach(t=>notes.append(make('li',t)));item.append(notes);
    if(/^https:\/\//.test(step.source.url)){const a=make('a',step.source.title);a.href=step.source.url;a.target='_blank';a.rel='noopener noreferrer';item.append(a);}routeView.append(item);
   }
   routeView.append(make('h5','Remaining fragments · all equivalents retained'));
   const figures=make('div');figures.className='prodrug-candidate-grid';
   for(const p of route.frontier){const figure=make('figure');figure.append(make('figcaption',p.id+' · '+(p.fromStep?'from step '+p.fromStep:'starting molecule')));
    if(typeof depictSvg==='function'){try{const view=make('div');view.className='prodrug-candidate-structure';view.innerHTML=depictSvg(parse(p.smiles),{title:p.id});figure.append(view);}catch(_){}}
    const analyze=make('button','Analyze fragment');analyze.type='button';analyze.dataset.pharmSmiles=p.smiles;analyze.dataset.pharmName='Hypothetical pathway fragment '+p.id;figure.append(make('code',p.smiles),analyze);figures.append(figure);
   }routeView.append(figures);
  }
  const s=snapshot();if(s)s.prodrugReleasePathway=route?{inputSmiles:record.smiles,...route}:null;
 }
 function resetRoute(){route=null;routeError='';renderRoute();}
 function attachPreviewActions(){
  if(!record||!inputMode())return;const s=snapshot(),design=s?.prodrugSiteDesign?.candidate,cleavage=s?.prodrugSiteCleavage,preview=$('prodrug-design-preview');
  if(design){const add=button('Add design to comparison',()=>{addCandidate(design);renderComparison();compareStatus.textContent='Shortlist contains '+shortlist.length+' distinct design(s), maximum 12.';});add.id='prodrug-explorer-add-design';preview.append(add);}
  if(design||cleavage){const start=button('Explore release steps',()=>{
   try{route=root.ProdrugExplorer.start(design?design.smiles:record.smiles,design?design.recoveredParentSmiles:null);if(cleavage){const option=root.ProdrugExplorer.options(route).find(o=>o.pathId===cleavage.pathway.id&&o.atom===cleavage.pathway.atoms[0]);route=root.ProdrugExplorer.advance(route,option);}routeError='';renderRoute();routeHost.scrollIntoView?.({block:'nearest'});}catch(e){routeError=e.message;renderRoute();}
  });start.id='prodrug-explorer-start-route';preview.append(start);}
 }
 filter.addEventListener('change',renderScan);
 for(const id of ['prodrug-reference-atom','prodrug-design-site','prodrug-design-template','prodrug-reference-select','prodrug-reference-type','prodrug-site-action-mode'])$(id).addEventListener('change',()=>{resetRoute();renderScan();});
 $('prodrug-design-use-input').addEventListener('click',()=>{resetRoute();renderScan();});
 $('prodrug-design-build').addEventListener('click',()=>{resetRoute();attachPreviewActions();});
 const original=root.PharmacologyUI.render;
 root.PharmacologyUI.render=function(next,ranks){
  record=null;scan=null;shortlist=[];route=null;routeError='';compareStatus.textContent='';filter.value='all';original(next,ranks);record=next;scan=root.ProdrugExplorer.scan(next.mol);renderScan();renderComparison();renderRoute();
 };
 section.hidden=true;renderRoute();
})(globalThis);
