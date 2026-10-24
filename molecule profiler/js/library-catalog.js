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
    if (sourceRecord(entry)) return entry.source.provider==='ChEBI'?'chebi':'sourced';
    const cls = String(entry && entry.cls || '').trim();
    if (cls === 'ESOL reference') return 'esol';
    if (cls === 'Ester reference' || cls === 'Ether reference' || cls === 'Ketone reference') return 'series';
    if (cls === 'Fragment') return 'fragment';
    return 'other';
  }
  function norm(value) { return String(value == null ? '' : value).trim().toLocaleLowerCase('en'); }
  function metadata(context) { return context || { names: root.LIBRARY_NAME_METADATA, tags: root.LIBRARY_TAG_METADATA }; }
  function matchedRecord(dataset, entry) {
    if (!entry || !dataset || !dataset.entries || !Object.prototype.hasOwnProperty.call(dataset.entries, entry.name)) return null;
    const record=dataset.entries[entry.name];
    return record && record.librarySmiles===entry.smiles ? record : null;
  }
  function sourceRecord(entry) {
    const source=entry?.source;
    if(!source || !/^\d+$/.test(source.id) || source.librarySmiles!==entry.smiles)return null;
    const expected=source.provider==='DrugCentral'?'https://drugcentral.org/drugcard/'+source.id
      :source.provider==='ChEBI'?'https://www.ebi.ac.uk/chebi/searchId.do?chebiId=CHEBI:'+source.id:null;
    return expected && source.url===expected ? source : null;
  }
  function nameRecord(entry, context) {
    const recorded=matchedRecord(metadata(context).names, entry);
    if(recorded)return recorded;
    const source=sourceRecord(entry);
    return source?{librarySmiles:entry.smiles,preferredName:entry.name,nameKind:source.nameKind,
      sourceUrl:source.url,aliases:[source.provider+' '+source.id,source.provider==='ChEBI'?'CHEBI:'+source.id:null,source.cas,source.inchiKey].filter(Boolean)}:null;
  }
  function displayName(entry, context) { return nameRecord(entry,context)?.preferredName || entry.name; }
  function aliasesFor(entry, context) { return nameRecord(entry,context)?.aliases || []; }
  function tagsFor(entry, context) {
    const tags=matchedRecord(metadata(context).tags,entry)?.tags;
    return Array.isArray(tags) ? tags.filter(t=>typeof t==='string'&&t.trim()) : (entry.cls?['Label: '+entry.cls]:[]);
  }
  function searchText(entry, context) { return norm([entry.name,displayName(entry,context),...aliasesFor(entry,context),entry.cls,entry.formula,...tagsFor(entry,context)].join(' ')); }
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
  function catalogQuery(entries, options, context) {
    const rows = Array.isArray(entries) ? entries : [];
    const o = options || {};
    const tokens = norm(o.query).split(/\s+/).filter(Boolean);
    const group = GROUPS.some(g => g.key === o.group) ? o.group : 'all';
    const cls = String(o.cls || '');
    const sort = ['name', 'cls', 'formula', 'group','tag','tagCount'].includes(o.sort) ? o.sort : 'name';
    const tagAliases={'indole motif':'family motif: indoles','pyridine motif':'family motif: pyridines'};
    const tagQuery=tagAliases[norm(o.tag)]||norm(o.tag);
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
      if(Array.isArray(o.tags) && !o.tags.every(wanted=>tags.some(tag=>norm(tag)===norm(wanted))))return;
      const haystack = searchText(entry,context);
      if (!tokens.every(token => haystack.includes(token))) return;
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
    return { total: matches.length, pages, page, perPage,
      rows: matches.slice((page - 1) * perPage, page * perPage) };
  }
  function csvCell(value) {
    let s = String(value == null ? '' : value);
    if (/^\s*[=+@-]/.test(s) && !/^-\d+(?:\.\d+)?$/.test(s.trim())) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function catalogCsv(entries, options, context) {
    // Exports index metadata, not unverified measured properties.
    const result = catalogQuery(entries, { ...(options || {}), perPage: 100, page: 1 },context);
    const all = [];
    for (let page = 1; page <= result.pages; page++) {
      all.push(...catalogQuery(entries, { ...(options || {}), perPage: 100, page },context).rows);
    }
    const lines = [['Name','Reference ID','Tags','Collection','Formula','SMILES','Name form','Name source'].map(csvCell).join(',')];
    for (const item of all) {
      lines.push([item.label,item.entry.name,item.tags.join('; '),item.group,item.entry.formula,item.entry.smiles,nameRecord(item.entry,context)?.nameKind||'Library label',nameRecord(item.entry,context)?.sourceUrl||''].map(csvCell).join(','));
    }
    return lines.join('\r\n') + '\r\n';
  }
  const api = { GROUPS, groupFor, sourceRecord, nameRecord, displayName, aliasesFor, tagsFor, searchText, catalogSummary, catalogQuery, catalogCsv };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LibraryCatalog = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
