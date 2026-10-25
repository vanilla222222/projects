'use strict';
(function(root){
 const api=root.ReferenceResearch,catalog=root.LibraryCatalog,curated=root.CuratedReferences;if(!api||!catalog||!curated)return;
 const model=api.createModel({entries:curated.library(LIBRARY),catalog,curated,data:root.CURATED_REFERENCES});
 const $=id=>document.getElementById(id),el=(tag,t)=>{const n=document.createElement(tag);if(t!==undefined)n.textContent=t;return n;};
 function link(label,url){const a=el('a',label);if(/^https?:\/\//.test(url||'')){a.href=url;a.target='_blank';a.rel='noopener noreferrer';}return a;}
 function detail(label,value,host){if(value==null||value==='')return;const p=el('p');p.append(el('strong',label+': '),el('span',typeof value==='object'?JSON.stringify(value):String(value)));host.append(p);}
 function observation(o){const d=el('details');d.className='research-evidence';d.append(el('summary',[o.targetLabel||o.kind,o.action.replace(/_/g,' '),o.kind.replace(/_/g,' ')].filter(Boolean).join(' · ')));
  for(const [label,value]of [['Endpoint',o.endpoint],['Receptor / target species',o.species],['Host-cell species',o.hostSpecies],['Assay',o.assay],['Tested form',o.testedForm],['Conditions',o.conditions],['Uncertainty',o.uncertaintyKind],['Source location',o.sourceLocation],['Context',o.context]])detail(label,value,d);
  d.append(link('Evidence source ↗',o.sourceUrl));const raw=el('details');raw.append(el('summary','Source record and provenance'));detail('Record',o.recordId||'Imported receptor row',raw);detail('Snapshot SHA-256',o.sourceSha256,raw);raw.append(el('pre',JSON.stringify(o.raw,null,2)));d.append(raw);return d;
 }
 function openDossier(name,{focus=true}={}){const d=model.dossier(name);if(!d)return false;const host=$('reference-dossier');host.replaceChildren();
  const title=el('h2',d.label);title.tabIndex=-1;host.append(el('span','COMPOUND DOSSIER'),title);detail('Stable library key',d.entry.name,host);
  const picture=el('div');picture.className='research-structure';try{picture.innerHTML=depictSvg(buildMolecule(parseSmiles(d.entry.smiles)),{title:d.label+' — supplied structure'});}catch(_){picture.append(el('p','Depiction unavailable. Stored SMILES remains available below.'));}host.append(picture);
  for(const [label,value]of [['Formula',d.entry.formula],['Aliases',d.aliases.join('; ')]])detail(label,value,host);
  const graph=el('details');graph.append(el('summary','Stored structure (SMILES)'),el('code',d.entry.smiles));host.append(graph);
  const sourceLinks=new Map();if(d.identity?.sourceUrl)sourceLinks.set(d.identity.sourceUrl,'Identity source');
  const seenIdentities=new Set();for(const r of d.records)for(const c of r.compounds.filter(c=>c.libraryNames.includes(name))){if(seenIdentities.has(c.inchiKey))continue;seenIdentities.add(c.inchiKey);detail('Full InChIKey',c.inchiKey,host);detail('Identifier origin',c.identitySource?.identifierOrigin||c.identitySource?.provider,host);sourceLinks.set(c.sourceUrl,'Structure source');}
  for(const [url,label]of sourceLinks)host.append(link(label+' ↗',url));
  for(const w of d.identityWarnings){const p=el('p','Identity review: this legacy graph differs from the source identity '+w.sourceName+'. Evidence on the corrected source graph is not transferred.');p.className='research-warning';p.append(link('Review source ↗',w.sourceUrl));host.append(p);}
  const r=d.records[0],analyze=el('a',r?'Analyze source reference ↗':'Open analyzer ↗'),ci=r?.compounds.findIndex(c=>c.libraryNames.includes(name));if(r)analyze.href='index.html?curated='+encodeURIComponent(r.id)+'&compound='+ci;else analyze.href='index.html';host.append(analyze);const permalink=el('a','Link to this dossier');permalink.href='library-inspector.html?reference='+encodeURIComponent(name);permalink.dataset.permalink='true';host.append(permalink);
  host.append(el('h3','Evidence · '+d.observations.length));if(!d.observations.length)host.append(el('p','No imported evidence for this stored graph. This does not establish inactivity.'));
  for(const o of d.observations)host.append(observation(o));
  for(const r of d.records.filter(r=>r.relationships?.length)){const p=el('details');p.append(el('summary',r.title));detail('Context',r.note,p);for(const rel of r.relationships)detail(rel.kind.replace(/_/g,' '),r.compounds[rel.from].name+' → '+r.compounds[rel.to].name,p);host.append(p);}
  const tags=el('details');tags.append(el('summary','Structural families and tags'),el('p',d.tags.join(' · ')));host.append(tags);
  const url=new URL(root.location.href);url.searchParams.set('reference',name);try{root.history.replaceState(null,'',url);}catch(_){}
  if(focus){title.focus({preventScroll:true});if(root.innerWidth<1500)host.scrollIntoView({block:'start',behavior:'auto'});}return true;
 }
 document.addEventListener('reference:open',e=>openDossier(e.detail.name));
 root.ReferenceResearchUI={model,openDossier,observation,el,detail,link};
 const requested=new URLSearchParams(root.location.search).get('reference');if(requested&&!openDossier(requested,{focus:false}))$('reference-dossier').append(el('p','Requested reference was not found. Choose a result to inspect.'));
})(globalThis);
