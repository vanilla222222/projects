'use strict';
// Reference-library index and integrity metadata only.
// Category labels are derived from library class names, NOT evidence of identity
// verification, experimental measurement, or biological activity.
(function (root) {
  const GROUPS = Object.freeze([
    { key: 'all', label: 'All collections', description: 'Every listed structure, regardless of provenance.' },
    { key: 'other', label: 'Other named/reference entries', description: 'No externally verified identity or provenance is implied.' },
    { key: 'esol', label: 'ESOL-labelled references', description: 'Labelled as belonging to the ESOL reference subset; experimental measurements are not verified here.' },
    { key: 'series', label: 'Ester / ether / ketone series', description: 'Class-labelled homolog series useful as illustrative structural examples.' },
    { key: 'fragment', label: 'Fragment examples', description: 'Fragment-sized structural entries; not experimentally verified reference annotations.' }
  ]);
  function groupFor(entry) {
    const cls = String(entry && entry.cls || '').trim();
    if (cls === 'ESOL reference') return 'esol';
    if (cls === 'Ester reference' || cls === 'Ether reference' || cls === 'Ketone reference') return 'series';
    if (cls === 'Fragment') return 'fragment';
    return 'other';
  }
  function norm(value) { return String(value == null ? '' : value).trim().toLocaleLowerCase('en'); }
  function catalogSummary(entries) {
    const rows = Array.isArray(entries) ? entries : [];
    const groups = { other: 0, esol: 0, series: 0, fragment: 0 };
    const classes = new Map();
    const names = new Set(), smiles = new Set();
    let missingNames = 0, missingFormulas = 0, missingSmiles = 0;
    let duplicateNames = 0, duplicateExactSmiles = 0;
    for (const entry of rows) {
      const name = norm(entry && entry.name), formula = String(entry && entry.formula || '').trim();
      const structure = String(entry && entry.smiles || '').trim();
      const cls = String(entry && entry.cls || 'Unclassified').trim() || 'Unclassified';
      groups[groupFor(entry)]++;
      classes.set(cls, (classes.get(cls) || 0) + 1);
      if (!name) missingNames++; else if (names.has(name)) duplicateNames++; else names.add(name);
      if (!formula) missingFormulas++;
      if (!structure) missingSmiles++; else if (smiles.has(structure)) duplicateExactSmiles++; else smiles.add(structure);
    }
    return {
      total: rows.length, groups, missingNames, missingFormulas, missingSmiles,
      duplicateNames, duplicateExactSmiles,
      classes: [...classes].map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    };
  }
  function catalogQuery(entries, options) {
    const rows = Array.isArray(entries) ? entries : [];
    const o = options || {};
    const tokens = norm(o.query).split(/\s+/).filter(Boolean);
    const group = GROUPS.some(g => g.key === o.group) ? o.group : 'all';
    const cls = String(o.cls || '');
    const sort = ['name', 'cls', 'formula', 'group'].includes(o.sort) ? o.sort : 'name';
    const perPage = [25, 50, 100].includes(Number(o.perPage)) ? Number(o.perPage) : 50;
    const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
    const matches = [];
    rows.forEach((entry, index) => {
      const kind = groupFor(entry);
      if (group !== 'all' && kind !== group) return;
      if (cls && String(entry.cls || '') !== cls) return;
      const haystack = norm(entry.name) + ' ' + norm(entry.cls) + ' ' + norm(entry.formula);
      if (!tokens.every(token => haystack.includes(token))) return;
      matches.push({ entry, index, group: kind });
    });
    matches.sort((a, b) => {
      const lhs = sort === 'group' ? a.group : a.entry[sort];
      const rhs = sort === 'group' ? b.group : b.entry[sort];
      return collator.compare(String(lhs || ''), String(rhs || '')) || a.index - b.index;
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
  function catalogCsv(entries, options) {
    // Exports index metadata, not unverified measured properties.
    const result = catalogQuery(entries, { ...(options || {}), perPage: 100, page: 1 });
    const all = [];
    for (let page = 1; page <= result.pages; page++) {
      all.push(...catalogQuery(entries, { ...(options || {}), perPage: 100, page }).rows);
    }
    const lines = [['Name', 'Class', 'Collection', 'Formula'].map(csvCell).join(',')];
    for (const item of all) {
      lines.push([item.entry.name, item.entry.cls, item.group, item.entry.formula].map(csvCell).join(','));
    }
    return lines.join('\r\n') + '\r\n';
  }
  const api = { GROUPS, groupFor, catalogSummary, catalogQuery, catalogCsv };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LibraryCatalog = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
