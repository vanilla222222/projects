'use strict';
(function() {
  const $=id=>document.getElementById(id);
  const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
  const data=RECEPTOR_REFERENCE_CATALOG, receptors=data.receptors;
  const targets=typeof TARGETS!=='undefined'?TARGETS:[];
  const library=typeof LIBRARY!=='undefined'?LIBRARY:[];
  const proposed=typeof RECEPTOR_LIGAND_ANNOTATIONS!=='undefined'?RECEPTOR_LIGAND_ANNOTATIONS:[];
  const errors=ReceptorCatalog.validateAnnotations(proposed,receptors,library);
  const invalid=new Set(errors.map(x=>x.index));
  const annotations=proposed.filter((a,index)=>!invalid.has(index));
  const detail=$('receptor-detail'),results=$('receptor-results');
  let selected=null;
  function mode(receptorMode) {
    $('receptor-browser').hidden=!receptorMode;
    $('molecule-browser').hidden=receptorMode;
    $('view-receptors').setAttribute('aria-pressed',String(receptorMode));
    $('view-molecules').setAttribute('aria-pressed',String(!receptorMode));
  }
  $('view-receptors').addEventListener('click',()=>mode(true));
  $('view-molecules').addEventListener('click',()=>mode(false));
  function external(label,url) {
    const a=node('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
  }
  function download(name,value) {
    const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}));
    const a=node('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function options(id,values) {
    [...new Set(values)].sort().forEach(value=>{const option=node('option',value);option.value=value;$(id).append(option);});
  }
  options('receptor-family',receptors.map(r=>r.family));
  options('receptor-kind',receptors.map(r=>r.kind));
  function show(r,focus) {
    selected=r.id;
    detail.replaceChildren(node('h2',r.name),node('p',r.id+' · '+r.family+' · '+r.kind,'eyebrow'),node('p',r.description));
    const dl=node('dl');
    for(const [key,value] of [['Catalog ID',r.id],['Species',r.species],['Gene / subunit genes',r.genes.join(', ')],
      ['Endogenous signals',r.endogenousLigands],['Main signalling',r.mechanism]])dl.append(node('dt',key),node('dd',value));
    detail.append(dl);
    const permalink=node('a','Link to this receptor');permalink.href='reference-explorer.html?receptor='+encodeURIComponent(r.id);detail.append(permalink);
    const effects=node('div',undefined,'effect-grid');
    const addEffect=(heading,text)=>{const section=node('section',undefined,'effect-card');section.append(node('h3',heading),node('p',text));effects.append(section);};
    addEffect(r.kind==='Catalytic receptor'?'Activation / pathway stimulation':r.id==='ABCC8'?'Channel opening':'Agonism / activation',r.activation);
    addEffect(r.kind==='Catalytic receptor'?'Blockade / kinase inhibition':r.id==='ABCC8'?'Channel closing':'Antagonism / blockade',r.blockade);
    detail.append(effects,node('p',r.caution,'context-note'),node('p',data.interpretation,'muted'));
    detail.append(node('h3','Existing ligand links and annotation readiness'));
    const linked=ReceptorCatalog.links(r,targets);
    if(!linked.length) detail.append(node('p','Awaiting ligand curation. This receptor is registered but has no linked target row in the current scoring dataset.'));
    linked.forEach(({target,mapping})=>{
      detail.append(node('p',target.name+' ('+target.gene+'): '+(target.ligands||[]).length+' legacy listed ligand names.'));
      if(mapping==='legacy_subunit')detail.append(node('p','Legacy subunit mapping only. The older target row does not establish a specific receptor assembly.','context-note'));
      const disclosure=node('details');disclosure.append(node('summary','View legacy ligand names (actions unassigned)'));
      disclosure.append(node('p',(target.ligands||[]).join(', ')||'No listed ligands.'));detail.append(disclosure);
    });
    const curated=annotations.filter(a=>a.receptorId===r.id);
    if(!curated.length)detail.append(node('p','No source-backed functional-action annotations have been curated here yet. Listed ligand names are not automatically agonists or antagonists.','muted'));
    else {
      const ul=node('ul');curated.forEach(a=>{const li=node('li');li.append(node('strong',a.ligandName+' — '+a.action.replace(/_/g,' ')),
        node('p',a.species+' · '+a.assay+' · '+a.endpoint+(a.note?' · '+a.note:'')),external('Evidence source',a.sourceUrl));ul.append(li);});detail.append(ul);
    }
    detail.append(node('h3','Sources and evidence scope'));
    const sources=node('ul');r.sources.forEach(s=>{const li=node('li');li.append(external(s.label,s.url),node('p',s.scope,'muted'));sources.append(li);});
    detail.append(sources,node('p','Educational summaries have not undergone a systematic clinical evidence review. No potency, dose, compound-specific activity or safety conclusion is assigned.','muted'));
    const exportButton=node('button','Export this receptor scaffold');exportButton.type='button';exportButton.addEventListener('click',()=>download('receptor-'+r.id+'-scaffold.json',ReceptorCatalog.createHandoff([r],targets)));detail.append(exportButton);
    if(focus)detail.focus();
    renderList();
  }
  function renderList() {
    const filtered=ReceptorCatalog.browse(receptors,{
      search:$('receptor-search').value,family:$('receptor-family').value,
      kind:$('receptor-kind').value,coverage:$('receptor-coverage').value
    },targets,annotations);
    $('receptor-count').textContent=filtered.length+' of '+receptors.length+' receptor / related targets';
    const focusedId=document.activeElement && document.activeElement.dataset.receptorId;
    results.replaceChildren();
    if(!filtered.length)results.append(node('p','No receptors match these filters.'));
    filtered.forEach(r=>{
      const b=node('button',r.name,'item');b.type='button';b.dataset.receptorId=r.id;b.setAttribute('aria-pressed',String(r.id===selected));
      b.append(node('span',r.id+' · '+r.family,'muted item-meta'));
      if(!ReceptorCatalog.links(r,targets).length)b.append(node('span','Awaiting ligand curation','pill'));
      b.addEventListener('click',()=>show(r,false));results.append(b);if(focusedId===r.id)b.focus();
    });
    if(selected && !filtered.some(r=>r.id===selected)) {
      selected=null;detail.replaceChildren(node('h2','Select a receptor'),node('p','Choose from the filtered results.'));
    }
  }
  for(const id of ['receptor-search','receptor-family','receptor-kind','receptor-coverage'])$(id).addEventListener(id==='receptor-search'?'input':'change',renderList);
  $('receptor-reset').addEventListener('click',()=>{for(const id of ['receptor-search','receptor-family','receptor-kind','receptor-coverage'])$(id).value='';renderList();$('receptor-search').focus();});
  $('receptor-export').addEventListener('click',()=>download('receptor-catalog-scaffolds.json',ReceptorCatalog.createHandoff(receptors,targets)));
  $('receptor-json').addEventListener('click',()=>download('receptor-reference-catalog.json',data));
  const glossary=$('action-glossary');
  data.actionTerms.forEach(term=>{const section=node('section');section.append(node('h3',term.label),node('p',term.description));glossary.append(section);});
  const awaiting=receptors.filter(r=>!ReceptorCatalog.links(r,targets).length).length;
  $('receptor-summary').textContent=receptors.length+' catalog records across '+new Set(receptors.map(r=>r.family)).size+' families · '+awaiting+' awaiting linked target rows · '+annotations.length+' source-backed action annotations.';
  if(errors.length)$('annotation-status').textContent=errors.length+' annotation validation issue(s); affected records are hidden until corrected.';
  document.addEventListener('molecule-profiler:receptor-search',event=>{
    mode(true);for(const id of ['receptor-search','receptor-family','receptor-kind','receptor-coverage'])$(id).value='';
    $('receptor-search').value=event.detail.query;renderList();$('receptor-browser').scrollIntoView({block:'start'});$('receptor-search').focus();
  });
  const requested=new URLSearchParams(location.search).get('receptor');
  const initial=receptors.find(r=>r.id===requested)||receptors[0];
  renderList();if(initial)show(initial,false);
})();
