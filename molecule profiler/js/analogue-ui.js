'use strict';
(function(root){
 if(!root.document||!root.PharmacologyUI)return;
 const doc=root.document,panel=doc.getElementById('analogue-panel'),make=(tag,text)=>{const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 if(!panel)return;
 const status=make('p'),cards=make('div'),download=make('button','Download analogue SMILES');status.setAttribute('role','status');cards.className='prodrug-candidate-grid';download.type='button';download.disabled=true;panel.append(status,download,cards);
 let report=null;
 const original=root.PharmacologyUI.render;
 root.PharmacologyUI.render=function(record,ranks){
  report=null;cards.replaceChildren();download.disabled=true;original(record,ranks);
  report=root.AnalogueCandidates.generate(record.mol);const snapshot=root.PharmacologyUI.getSnapshot();if(snapshot)snapshot.analogueCandidates={inputSmiles:record.smiles,...report};
  status.textContent=report.reasons.join(' ');download.disabled=!report.rows.length;
  report.rows.forEach(row=>{const card=make('article');card.className='prodrug-candidate-card';card.append(make('h3',row.name));
   if(typeof depictSvg==='function'){try{const view=make('div');view.className='prodrug-candidate-structure';view.innerHTML=depictSvg(buildMolecule(parseSmiles(row.smiles)),{title:row.name});card.append(view);}catch(_){}}
   const button=make('button','Analyze analogue');button.type='button';button.dataset.smiles=row.smiles;button.dataset.name=row.name;
   card.append(make('code',row.smiles),make('p',row.limitations[0]),button);cards.append(card);
  });
 };
 panel.addEventListener('click',event=>{const b=event.target.closest('button[data-smiles]');if(!b)return;doc.getElementById('smiles-input').value=b.dataset.name+', '+b.dataset.smiles;doc.getElementById('run').click();});
 download.addEventListener('click',()=>{if(!report?.rows.length)return;const url=URL.createObjectURL(new Blob([report.rows.map(r=>r.smiles+'\t'+r.name+' | unvalidated structural design').join('\n')+'\n'],{type:'text/plain;charset=utf-8'})),a=make('a');a.href=url;a.download='unvalidated-analogues.smi';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
})(globalThis);
