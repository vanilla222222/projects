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
 function nameRecord(entry,d=data()){
  for(const r of forEntry(entry,d))for(const c of r.compounds){
   if(c.sourceName&&c.libraryNames.includes(entry.name))return {librarySmiles:entry.smiles,preferredName:c.sourceName,nameKind:'Source-provided reference name',sourceUrl:c.sourceUrl,aliases:[c.name,...(c.aliases||[])]};
  }return null;
 }
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
 function rankingEvidence(r){return (r.evidence||[]).filter(e=>e.kind==='source_classification'||(e.kind==='functional_assay'&&e.species==='Homo sapiens'&&e.rankEligible!==false&&e.receptorId===r.panel?.gene));}
 function targets(base,d=data()){
  const out=base.map(t=>({...t,ligands:t.ligands.slice()}));
  for(const r of d.records){if(!r.panel||!rankingEvidence(r).length)continue;
   let t=out.find(t=>t.gene===r.panel.gene);
   if(!t){t={...r.panel,organism:'Human',ligands:[],note:'Source-linked human pharmacology observations. Similarity does not transfer source action or potency.'};out.push(t);}
   t.ligands=[...new Set(t.ligands.concat(r.compounds.flatMap(c=>c.libraryNames)))];
  }return out;
 }
 function annotations(base,library,d=data()){
  const byname=new Map(library.map(e=>[e.name,e])),out=base.slice();
  for(const r of d.records)for(const e of r.evidence||[]){
   const classified=e.kind==='source_classification'&&e.action&&e.receptorId&&e.sourceProvider==='IUPHAR/BPS Guide to PHARMACOLOGY'&&e.sourceRecord;
   if((e.kind!=='functional_assay'&&!classified)||e.species!=='Homo sapiens'||e.rankEligible===false)continue;
   for(const c of r.compounds)for(const name of c.libraryNames||[]){const entry=byname.get(name);if(!entry||!forEntry(entry,d).includes(r))continue;
    const measured=Object.fromEntries(['metric','value','relation','sd','lower','upper','conditions','sourceLocation','sourceSha256','sourceRecord','unit','uncertaintyKind','efficacy','originalValue','originalSd','originalUnit','hostSpecies','testedForm'].filter(k=>e[k]!==undefined).map(k=>[k,e[k]]));
    const provenance=classified?{classification:{provider:e.sourceProvider,license:'CC BY-SA 4.0',sourceSnapshotSha256:e.sourceSha256,ligandId:e.sourceRecord['Ligand ID'],targetId:e.sourceRecord['Target ID'],sourceRecord:e.sourceRecord}}:{};
    out.push({...measured,...provenance,receptorId:e.receptorId,ligandName:name,librarySmiles:entry.smiles,action:e.action,evidenceType:classified?'source_classification':'functional',species:e.species,assay:e.assay,endpoint:e.endpoint,sourceUrl:e.sourceUrl,note:(classified?'Curated database action classification; no functional potency or efficacy measurement assigned. ':'Assay-specific functional evidence. ')+(e.testedForm||'')+' Separate from the strict binding-profile quota.',curatedReferenceId:r.id});
   }
  }return out;
 }
 function render(host,records){
  const doc=host.ownerDocument,el=(tag,text)=>{const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;return e;};host.replaceChildren();
  for(const r of records){const card=el('details');card.append(el('summary',r.title));card.append(el('p',r.note));
   r.compounds.forEach((c,i)=>{const p=el('p',c.role+': '+c.name+' · '+c.formula+' '),b=el('a','Analyze '+c.name);b.href='index.html?curated='+encodeURIComponent(r.id)+'&compound='+i;p.append(b);const source=el('a','Structure source');source.href=c.sourceUrl;source.target='_blank';source.rel='noopener noreferrer';p.append(doc.createTextNode(' · '),source);card.append(p);});
   for(const e of r.evidence){const p=el('p',[e.kind,e.target,e.action?.replace(/_/g,' '),e.sourceClassification,e.endpoint,e.species,e.assay,e.testedForm,e.context].filter(Boolean).join(' · '));const a=el('a','Evidence source');a.href=e.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';p.append(doc.createTextNode(' '),a);card.append(p);}
   host.append(card);
  }
  if(!records.length)host.append(el('p','No curated exact-graph record in this collection. Missing evidence means unknown.'));
 }
 const api={library,targets,annotations,rankingEvidence,forEntry,tags,nameRecord,matches,pharmacology,selection,render};root.CuratedReferences=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
