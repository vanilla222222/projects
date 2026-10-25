'use strict';
(function(root){
 const data=()=>root.CURATED_REFERENCES||{records:[],entries:{},extraLibrary:[]};
 function library(base,d=data()){const names=new Set(base.map(e=>e.name));return base.concat(d.extraLibrary.filter(e=>!names.has(e.name)));}
 function forEntry(entry,d=data()){
  const m=d.entries[entry.name];if(!m||m.librarySmiles!==entry.smiles)return [];
  const ids=new Set(m.recordIds);return d.records.filter(r=>ids.has(r.id));
 }
 function tags(entry,d=data()){const m=d.entries[entry.name];return m?.librarySmiles===entry.smiles?m.tags:[];}
 function matches(mol,d=data()){
  if(!root.Pharmacology)return [];
  return d.records.filter(r=>r.compounds.some(c=>{try{return root.Pharmacology.exactGraph(mol,root.buildMolecule(root.parseSmiles(c.smiles)));}catch(_){return false;}}));
 }
 // Source classifications add named associations, never inferred actions or potency.
 function targets(base,d=data()){
  const out=base.map(t=>({...t,ligands:t.ligands.slice()}));
  for(const r of d.records){if(!r.panel)continue;
   let t=out.find(t=>t.gene===r.panel.gene);
   if(!t){t={...r.panel,organism:'Human',ligands:[],note:'Named IUPHAR source associations. Similarity does not transfer source action or potency.'};out.push(t);}
   t.ligands=[...new Set(t.ligands.concat(r.compounds.flatMap(c=>c.libraryNames)))];
  }return out;
 }
 function render(host,records){
  const doc=host.ownerDocument,el=(tag,text)=>{const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;return e;};host.replaceChildren();
  for(const r of records){const card=el('details');card.append(el('summary',r.title));card.append(el('p',r.note));
   for(const c of r.compounds){const p=el('p',c.role+': '+c.name+' · '+c.formula+' '),b=el('button','Analyze '+c.name);b.type='button';b.dataset.pharmSmiles=c.smiles;b.dataset.pharmName=c.name;p.append(b);card.append(p);}
   for(const e of r.evidence){const p=el('p',[e.kind,e.target,e.endpoint,e.species,e.assay,e.context].filter(Boolean).join(' · '));const a=el('a','Evidence source');a.href=e.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';p.append(doc.createTextNode(' '),a);card.append(p);}
   host.append(card);
  }
  if(!records.length)host.append(el('p','No curated exact-graph record in this collection. Missing evidence means unknown.'));
 }
 const api={library,targets,forEntry,tags,matches,render};root.CuratedReferences=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
