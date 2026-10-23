'use strict';
// Presentation-only organization. Existing nodes, event handlers and scientific
// state stay owned by their original modules.
(function(root){
 const doc=root.document,$=id=>doc.getElementById(id),panel=$('prodrug-panel');if(!panel)return;
 const make=(tag,text)=>{const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 const pieces=[['prodrug-explorer-comparison','comparison'],['prodrug-priority','comparison'],['prodrug-explorer-route','route']];
 for(const [id,piece] of pieces){const node=$(id);if(node)(id==='prodrug-explorer-comparison'?node.closest('section'):node).dataset.studioPiece=piece;}
 const views=[
  {id:'build',label:'Build at a site',description:'Choose an input atom, inspect compatible options and preview a single design or transformation.'},
  {id:'comparison',label:'Compare & review',description:'Collect designs from different sites, compare their properties and review research evidence.'},
  {id:'route',label:'Release steps',description:'Follow a selected design or product through supported formal steps. Every fragment stays in the history.'},
  {id:'candidates',label:'Quick candidates',description:'Browse the bounded set of automatically generated single-site hypotheses.'},
  {id:'references',label:'Reference evidence',description:'Inspect curated compound relationships separately from generated hypotheses.'}
 ];
 const nav=make('nav');nav.className='design-studio-nav';nav.id='design-studio-nav';nav.setAttribute('aria-label','Prodrug studio workflow');
 const header=make('div');header.className='design-studio-heading';const hint=make('p');hint.id='design-studio-description';hint.setAttribute('role','status');const context=make('p');context.id='design-studio-context';header.append(hint,context);
 const buttons=views.map((view,i)=>{const b=make('button');b.type='button';b.dataset.studioView=view.id;b.append(make('span',String(i+1).padStart(2,'0')),doc.createTextNode(view.label));b.setAttribute('aria-pressed','false');nav.append(b);return b;});
 panel.querySelector('.panel-head').after(nav,header);
 function refreshContext(){
  const isInput=$('prodrug-reference-select')?.value==='__input__',atom=$('prodrug-reference-atom')?.selectedOptions[0]?.textContent||'Analyze a molecule to begin',snapshot=root.PharmacologyUI?.getSnapshot(),count=Math.max(0,(snapshot?.prodrugSiteComparison?.rows?.length||1)-1);
  context.textContent=(isInput?'Current input · ':'Displayed reference · ')+atom+' · '+count+' shortlisted';
 }
 function select(id,focus=false){
  const view=views.find(v=>v.id===id);if(!view)return;
  if(['build','comparison','route'].includes(id)&&$('prodrug-reference-select')?.value!=='__input__')$('prodrug-design-use-input')?.click();
  panel.dataset.studioView=id;buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.studioView===id)));hint.textContent=view.description;refreshContext();
  if(focus)buttons.find(b=>b.dataset.studioView===id)?.focus({preventScroll:true});
 }
 nav.addEventListener('click',event=>{const b=event.target.closest('button[data-studio-view]');if(b)select(b.dataset.studioView);});
 nav.addEventListener('keydown',event=>{
  const i=buttons.indexOf(doc.activeElement);if(i<0)return;let next;
  if(event.key==='ArrowRight')next=(i+1)%buttons.length;else if(event.key==='ArrowLeft')next=(i+buttons.length-1)%buttons.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=buttons.length-1;else return;
  event.preventDefault();select(views[next].id,true);
 });
 panel.addEventListener('click',event=>{
  if(event.target.closest('#prodrug-explorer-add-design'))select('comparison',true);
  else if(event.target.closest('#prodrug-explorer-start-route,button[data-priority-route]'))select('route',true);
  else if(event.target.closest('#prodrug-design-use-input')){if(panel.dataset.studioView==='references')select('build');}
  refreshContext();
 });
 $('prodrug-reference-select')?.addEventListener('change',()=>{if($('prodrug-reference-select').value!=='__input__')select('references');refreshContext();});
 panel.addEventListener('change',refreshContext);
 function polishCards(){
  for(const card of panel.querySelectorAll('.prodrug-candidate-card')){
   if(card.querySelector('.candidate-support'))continue;
   const ul=card.querySelector(':scope > ul');if(!ul)continue;const details=make('details');details.className='candidate-support';details.append(make('summary','Sources and limitations'));ul.before(details);details.append(ul);
   for(const p of [...card.querySelectorAll(':scope > p')])if(p.querySelector('a'))details.append(p);
  }
 }
 if(root.PharmacologyUI){const original=root.PharmacologyUI.render;root.PharmacologyUI.render=function(record,ranks){original(record,ranks);polishCards();select('build');};}
 root.ProdrugStudioLayout={select};select('build');
 // Escape dismisses optional input menus while preserving keyboard focus.
 for(const menu of doc.querySelectorAll('.export-menu,.resource-menu'))menu.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.open=false;menu.querySelector('summary').focus();}});
 // Tables scroll inside their own region rather than widening the page.
 for(const region of doc.querySelectorAll('.table-wrap,.prodrug-table-scroll')){region.tabIndex=0;if(!region.hasAttribute('aria-label'))region.setAttribute('aria-label','Scrollable results table');}
})(globalThis);
