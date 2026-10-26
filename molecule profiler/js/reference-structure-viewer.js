'use strict';
(function(root){
 const doc=root.document;
 let dialog,opener,resize;
 const el=(tag,text)=>{const node=doc.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
 function close(){if(typeof dialog.close==='function')dialog.close();else{dialog.removeAttribute('open');restore();}}
 function restore(){if(resize)root.removeEventListener('resize',resize);resize=null;if(opener?.isConnected)opener.focus();}
 function enlarge(svgMarkup,label,source){
  if(!dialog){dialog=el('dialog');dialog.className='dossier-structure-dialog';dialog.setAttribute('aria-labelledby','structure-viewer-title');dialog.addEventListener('close',restore);dialog.addEventListener('keydown',event=>{if(event.key==='Escape'&&typeof dialog.close!=='function'){event.preventDefault();close();}});doc.body.append(dialog);}
  dialog.replaceChildren();opener=source;
  const header=el('header'),title=el('h2',label),dismiss=el('button','Close');title.id='structure-viewer-title';dismiss.type='button';dismiss.autofocus=true;dismiss.addEventListener('click',close);header.append(title,dismiss);
  const controls=el('div');controls.className='structure-viewer-controls';
  const minus=el('button','−'),fit=el('button','Fit'),plus=el('button','+'),status=el('output');
  for(const [button,name]of [[minus,'Zoom out'],[fit,'Fit structure to view'],[plus,'Zoom in']]){button.type='button';button.setAttribute('aria-label',name);}
  status.setAttribute('aria-live','polite');controls.append(minus,fit,plus,status);
  const canvas=el('div');canvas.className='structure-viewer-canvas';canvas.tabIndex=0;canvas.setAttribute('role','region');canvas.setAttribute('aria-label','Molecular structure; scroll to inspect when zoomed');canvas.innerHTML=svgMarkup;
  dialog.append(header,controls,canvas);const svg=canvas.querySelector('svg'),box=svg.getAttribute('viewBox').split(/\s+/).map(Number);let zoom=1;
  function render(){const width=canvas.clientWidth||900,height=canvas.clientHeight||550,base=Math.min(Math.max(80,width-40),Math.max(80,height-40)*box[2]/box[3]);svg.style.width=(base*zoom)+'px';svg.style.height='auto';status.textContent=Math.round(zoom*100)+'% of fit';minus.disabled=zoom<=0.5;plus.disabled=zoom>=4;}
  minus.addEventListener('click',()=>{zoom=Math.max(0.5,zoom/1.25);render();});plus.addEventListener('click',()=>{zoom=Math.min(4,zoom*1.25);render();});fit.addEventListener('click',()=>{zoom=1;render();canvas.scrollLeft=canvas.scrollTop=0;});
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  resize=render;root.addEventListener('resize',resize);render();dismiss.focus();
 }
 function mount(host,{smiles,label}){
  host.className='research-structure';
  try{
   const markup=root.depictSvg(root.buildMolecule(root.parseSmiles(smiles)),{scale:32,pad:28,title:label+' — stored structure'}),preview=el('div');preview.className='dossier-structure-preview';preview.innerHTML=markup;
   const button=el('button','Enlarge structure');button.type='button';button.className='structure-enlarge';button.setAttribute('aria-haspopup','dialog');button.addEventListener('click',()=>enlarge(markup,label,button));
   host.append(preview,button);
  }catch(_){host.append(el('p','Depiction unavailable. Stored SMILES remains available below.'));}
 }
 root.ReferenceStructureViewer={mount};
})(globalThis);
