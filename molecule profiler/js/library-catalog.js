'use strict';
// Reference-library index and integrity metadata only.
// Category labels are derived from library class names, NOT evidence of identity
// verification, experimental measurement, or biological activity.
(function (root) {
  const GROUPS = Object.freeze([
    { key: 'all', label: 'All collections', description: 'Every listed structure, regardless of provenance.' },
    { key: 'sourced', label: 'DrugCentral named compounds', description: 'Named source records with checked structures; historical snapshot, not a current approval list.' },
    { key: 'chebi', label: 'ChEBI curated compounds', description: 'Named compounds from a curated ChEBI snapshot; source identity is not biological validation.' },
    { key: 'other', label: 'Other named/reference entries', description: 'No externally verified identity or provenance is implied.' },
    { key: 'esol', label: 'ESOL-labelled references', description: 'Labelled as belonging to the ESOL reference subset; experimental measurements are not verified here.' },
    { key: 'series', label: 'Ester / ether / ketone series', description: 'Class-labelled homolog series useful as illustrative structural examples.' },
    { key: 'fragment', label: 'Fragment examples', description: 'Fragment-sized structural entries; not experimentally verified reference annotations.' }
  ]);
  function groupFor(entry) {
    if (sourceRecord(entry)) return entry.source.provider==='ChEBI'?'chebi':entry.source.provider==='DrugCentral'?'sourced':'other';
    const cls = String(entry && entry.cls || '').trim();
    if (cls === 'ESOL reference') return 'esol';
    if (cls === 'Ester reference' || cls === 'Ether reference' || cls === 'Ketone reference') return 'series';
    if (cls === 'Fragment') return 'fragment';
    return 'other';
  }
  function norm(value) { return String(value == null ? '' : value).trim().toLocaleLowerCase('en'); }
  function metadata(context) { return context || { names: root.LIBRARY_NAME_METADATA, tags: root.LIBRARY_TAG_METADATA, receptors: root.LIBRARY_RECEPTOR_METADATA }; }
  function matchedRecord(dataset, entry) {
    if (!entry || !dataset || !dataset.entries || !Object.prototype.hasOwnProperty.call(dataset.entries, entry.name)) return null;
    const record=dataset.entries[entry.name];
    return record && record.librarySmiles===entry.smiles ? record : null;
  }
  function sourceRecord(entry) {
    const source=entry?.source;
    if(!source || !/^\d+$/.test(source.id) || source.librarySmiles!==entry.smiles)return null;
    const expected=source.provider==='DrugCentral'?'https://drugcentral.org/drugcard/'+source.id
      :source.provider==='ChEBI'?'https://www.ebi.ac.uk/chebi/searchId.do?chebiId=CHEBI:'+source.id:source.provider==='PubChem'?'https://pubchem.ncbi.nlm.nih.gov/compound/'+source.id:null;
    return expected && source.url===expected ? source : null;
  }
  function nameRecord(entry, context) {
    const curated=root.CuratedReferences?.nameRecord(entry);if(curated)return curated;
    const recorded=matchedRecord(metadata(context).names, entry);
    if(recorded)return recorded;
    const source=sourceRecord(entry);
    return source?{librarySmiles:entry.smiles,preferredName:entry.name,nameKind:source.nameKind,
      sourceUrl:source.url,aliases:[source.provider+' '+source.id,source.provider==='ChEBI'?'CHEBI:'+source.id:null,source.cas,source.inchiKey].filter(Boolean)}:null;
  }
  function displayName(entry, context) { const preferred=nameRecord(entry,context)?.preferredName;return preferred?preferred.replace(/^(?!(?:cis|trans|tert|sec|exo|endo|syn|anti|alpha|beta|gamma|delta|threo|erythro|rac|epi|sn)-)[a-z](?=[a-z])/,c=>c.toUpperCase()):entry.name; }
  function aliasesFor(entry, context) { return nameRecord(entry,context)?.aliases || []; }
  function tagsFor(entry, context) {
    const tags=matchedRecord(metadata(context).tags,entry)?.tags;
    const base=Array.isArray(tags) ? tags.filter(t=>typeof t==='string'&&t.trim()) : (entry.cls?['Label: '+entry.cls]:[]);
    return [...new Set([...base,...(matchedRecord(metadata(context).receptors,entry)?.tags||[]),...(root.CuratedReferences?.tags(entry)||[])])];
  }
  function receptorEvidence(entry,context) { return matchedRecord(metadata(context).receptors,entry)?.evidence || []; }
  function receptorTerms(entry,context) { const m=metadata(context).receptors;return [...new Set(receptorEvidence(entry,context).map(e=>e.receptorId))].flatMap(id=>{const r=m?.receptors?.[id];return r?[id,r.name,r.family,...r.aliases,...r.genes]:[id];}); }
  function searchText(entry, context) {const r=nameRecord(entry,context),s=sourceRecord(entry);return norm([entry.name,displayName(entry,context),...aliasesFor(entry,context),r?.pubchemCid,r?.chemblId,s?.id,s?.cas,s?.inchiKey,entry.cls,entry.formula,...receptorTerms(entry,context),...tagsFor(entry,context),tagsFor(entry,context).includes('Series: 2C / 2C-x phenethylamines')?'2x phenethylamine 2c-x phenethylamine':''].filter(v=>v!=null).join(' ')); }
  function catalogSummary(entries, context) {
    const rows = Array.isArray(entries) ? entries : [];
    const groups = { sourced: 0, chebi: 0, other: 0, esol: 0, series: 0, fragment: 0 };
    const classes = new Map();
    const tags = new Map();
    const names = new Set(), smiles = new Set();
    let missingNames = 0, missingFormulas = 0, missingSmiles = 0;
    let duplicateNames = 0, duplicateExactSmiles = 0;
    for (const entry of rows) {
      const name = norm(entry && entry.name), formula = String(entry && entry.formula || '').trim();
      const structure = String(entry && entry.smiles || '').trim();
      const cls = String(entry && entry.cls || 'Unclassified').trim() || 'Unclassified';
      groups[groupFor(entry)]++;
      classes.set(cls, (classes.get(cls) || 0) + 1);
      for(const tag of new Set(tagsFor(entry,context))) tags.set(tag,(tags.get(tag)||0)+1);
      if (!name) missingNames++; else if (names.has(name)) duplicateNames++; else names.add(name);
      if (!formula) missingFormulas++;
      if (!structure) missingSmiles++; else if (smiles.has(structure)) duplicateExactSmiles++; else smiles.add(structure);
    }
    return {
      total: rows.length, groups, missingNames, missingFormulas, missingSmiles,
      duplicateNames, duplicateExactSmiles,
      tags:[...tags].map(([name,count])=>({name,count})).sort((a,b)=>a.name.localeCompare(b.name)),
      classes: [...classes].map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    };
  }
  const TAG_ALIASES={
    'agonism':'Action: Agonist','antagonism':'Action: Antagonist','modulation':'Action: Modulator',
    'partial agonism':'Action: Partial agonist','inverse agonism':'Action: Inverse agonist',
    'pam':'Action: Positive allosteric modulator (PAM)','nam':'Action: Negative allosteric modulator (NAM)',
    'indole motif':'Family motif: Indoles','pyridine motif':'Family motif: Pyridines',
    'label: 2c phenethylamine':'Series: 2C / 2C-x phenethylamines','label: 2x phenethylamine':'Series: 2C / 2C-x phenethylamines',
    'family motif: 2cs (2,5-dimethoxyphenethylamines)':'Series: 2C / 2C-x phenethylamines',
    '2c':'Series: 2C / 2C-x phenethylamines','2x':'Series: 2C / 2C-x phenethylamines','2c-x':'Series: 2C / 2C-x phenethylamines'
  };
  function canonicalTag(value){return TAG_ALIASES[norm(value)]||String(value||'').trim();}
  function queryTerms(value){
    const terms=[];for(const m of String(value||'').matchAll(/(-?)"([^"]+)"|(-?)([^\s"]+)/g))terms.push({exclude:(m[1]||m[3])==='-',value:norm(m[2]||m[4])});return terms;
  }
  function catalogQuery(entries, options, context) {
    const rows = Array.isArray(entries) ? entries : [];
    const o = options || {};
    const tokens = queryTerms(o.query);
    const selected=[...new Set((Array.isArray(o.tags)?o.tags:[]).map(t=>norm(canonicalTag(t))))];
    const excluded=[...new Set((Array.isArray(o.excludeTags)?o.excludeTags:[]).map(t=>norm(canonicalTag(t))))];
    const tagMode=o.tagMode==='any'?'any':'all';
    const fields=['all','name','formula','smiles','identifier','tags'];const field=fields.includes(o.field)?o.field:'all';
    const group = GROUPS.some(g => g.key === o.group) ? o.group : 'all';
    const cls = String(o.cls || '');
    const sort = ['name', 'cls', 'formula', 'group','tag','tagCount'].includes(o.sort) ? o.sort : 'name';
    const tagQuery=norm(canonicalTag(o.tag));
    const exactTag=tagQuery && rows.some(entry=>tagsFor(entry,context).some(tag=>norm(tag)===tagQuery));
    const perPage = [25, 50, 100].includes(Number(o.perPage)) ? Number(o.perPage) : 50;
    const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
    const matches = [];
    rows.forEach((entry, index) => {
      const kind = groupFor(entry);
      if (group !== 'all' && kind !== group) return;
      if (cls && String(entry.cls || '') !== cls) return;
      const tags=tagsFor(entry,context),label=displayName(entry,context);
      if(tagQuery && !tags.some(tag=>exactTag?norm(tag)===tagQuery:norm(tag).includes(tagQuery)))return;
      const normalized=new Set(tags.map(norm));
      if(selected.length && !(tagMode==='any'?selected.some(t=>normalized.has(t)):selected.every(t=>normalized.has(t))))return;
      if(excluded.some(t=>normalized.has(t)))return;
      if(o.namedOnly && /^(?:CHEMBL|SCHEMBL|CID|ZINC|DTXSID|AKOS)[: _-]*\d/i.test(label))return;
      const record=nameRecord(entry,context),source=sourceRecord(entry);
      const text=field==='name'?[entry.name,label,...aliasesFor(entry,context)].join(' '):field==='smiles'?entry.smiles:field==='tags'?tags.join(' '):field==='identifier'?[entry.name,...aliasesFor(entry,context),record?.pubchemCid,record?.chemblId,source?.id,source?.cas,source?.inchiKey].filter(Boolean).join(' '):searchText(entry,context);
      if(field==='formula'){if(String(o.query||'').trim()&&String(entry.formula)!==String(o.query).trim())return;}
      else if(field==='smiles'){const raw=String(o.query||'').trim();if(raw&&!String(text).includes(raw))return;}
      else {const haystack=norm(text);if(!tokens.every(t=>t.exclude?!haystack.includes(t.value):haystack.includes(t.value)))return;}
      matches.push({ entry, index, group: kind, label, tags });
    });
    matches.sort((a, b) => {
      if(sort==='tagCount')return b.tags.length-a.tags.length || collator.compare(a.label,b.label) || a.index-b.index;
      const lhs = sort === 'group' ? a.group : sort==='name'?a.label:sort==='tag'?a.tags[0]:a.entry[sort];
      const rhs = sort === 'group' ? b.group : sort==='name'?b.label:sort==='tag'?b.tags[0]:b.entry[sort];
      return collator.compare(String(lhs || ''), String(rhs || '')) || collator.compare(a.label,b.label) || a.index - b.index;
    });
    const pages = Math.max(1, Math.ceil(matches.length / perPage));
    const requested = Number(o.page);
    const page = Number.isFinite(requested) ? Math.min(pages, Math.max(1, Math.floor(requested))) : 1;
    const facets={};if(o.withFacets)for(const row of matches)for(const tag of new Set(row.tags))facets[tag]=(facets[tag]||0)+1;
    return { total: matches.length, pages, page, perPage,facets,
      rows: o.allRows===true?matches:matches.slice((page - 1) * perPage, page * perPage) };
  }
  function csvCell(value) {
    let s = String(value == null ? '' : value);
    if (/^\s*[=+@-]/.test(s) && !/^-\d+(?:\.\d+)?$/.test(s.trim())) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function catalogCsv(entries, options, context) {
    // Exports index metadata, not unverified measured properties.
    const all=catalogQuery(entries,{...(options||{}),perPage:100,page:1,allRows:true,withFacets:false},context).rows;
    const lines = [['Name','Reference ID','Tags','Collection','Formula','SMILES','Name form','Name source'].map(csvCell).join(',')];
    for (const item of all) {
      lines.push([item.label,item.entry.name,item.tags.join('; '),item.group,item.entry.formula,item.entry.smiles,nameRecord(item.entry,context)?.nameKind||'Library label',nameRecord(item.entry,context)?.sourceUrl||''].map(csvCell).join(','));
    }
    return lines.join('\r\n') + '\r\n';
  }
  const api = { receptorEvidence, canonicalTag,queryTerms,GROUPS, groupFor, sourceRecord, nameRecord, displayName, aliasesFor, tagsFor, searchText, catalogSummary, catalogQuery, catalogCsv };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LibraryCatalog = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
