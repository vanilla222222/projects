'use strict';
(function(root){
 const data=()=>root.CURATED_REFERENCES||{records:[],entries:{},extraLibrary:[]};
 const libraryCache=new WeakMap();
 function library(base,d=data()){const cached=libraryCache.get(base);if(cached?.data===d)return cached.entries;const names=new Set(base.map(e=>e.name)),entries=base.concat(d.extraLibrary.filter(e=>!names.has(e.name)));libraryCache.set(base,{data:d,entries});return entries;}
 function forEntry(entry,d=data()){
  const m=d.entries[entry.name];if(!m||m.librarySmiles!==entry.smiles)return [];
  const ids=new Set(m.recordIds);return d.records.filter(r=>ids.has(r.id));
 }
 function tags(entry,d=data()){const m=d.entries[entry.name];return m?.librarySmiles===entry.smiles?m.tags:[];}
 function matches(mol,d=data()){
  if(!root.Pharmacology)return [];
  return d.records.filter(r=>r.compounds.some(c=>{try{return root.Pharmacology.exactGraph(mol,root.buildMolecule(root.parseSmiles(c.smiles)));}catch(_){return false;}}));
 }
 let evidenceBase=null,evidenceData=null,evidenceResult=null;
 function pharmacology(base,d=data()){
  if(base===evidenceBase&&d===evidenceData)return evidenceResult;
  const relationships=(base?.relationships||[]).slice();
  for(const r of d.records)for(const link of r.relationships||[]){if(link.kind!=='prodrug')continue;
   const prodrug=r.compounds[link.from],active=r.compounds[link.to];
   relationships.push({prodrug,active,activation:link.mechanism,note:r.note,sourceUrl:r.evidence[0].sourceUrl,evidenceType:'documented_relationship',curatedReferenceId:r.id});
  }
  evidenceBase=base;evidenceData=d;evidenceResult={...base,relationships};return evidenceResult;
 }
 function selection(search,d=data()){
  const params=new URLSearchParams(search),id=params.get('curated'),raw=params.get('compound');
  if(!id||!/^\d+$/.test(raw||''))return null;
  const c=d.records.find(r=>r.id===id)?.compounds[Number(raw)];return c||null;
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
   r.compounds.forEach((c,i)=>{const p=el('p',c.role+': '+c.name+' · '+c.formula+' '),b=el('a','Analyze '+c.name);b.href='index.html?curated='+encodeURIComponent(r.id)+'&compound='+i;p.append(b);const source=el('a','Structure source');source.href=c.sourceUrl;source.target='_blank';source.rel='noopener noreferrer';p.append(doc.createTextNode(' · '),source);card.append(p);});
   for(const e of r.evidence){const p=el('p',[e.kind,e.target,e.sourceClassification,e.endpoint,e.species,e.assay,e.context].filter(Boolean).join(' · '));const a=el('a','Evidence source');a.href=e.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';p.append(doc.createTextNode(' '),a);card.append(p);}
   host.append(card);
  }
  if(!records.length)host.append(el('p','No curated exact-graph record in this collection. Missing evidence means unknown.'));
 }
 const api={library,targets,forEntry,tags,matches,pharmacology,selection,render};root.CuratedReferences=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
