'use strict';
(function () {
  const rows = typeof LIBRARY !== 'undefined' && Array.isArray(LIBRARY) ? LIBRARY : [];
  const engine = typeof LibraryCatalog !== 'undefined' ? LibraryCatalog : null;
  if (!engine) return;
  const $ = id => document.getElementById(id);
  const query = $('catalog-search'), group = $('catalog-group'), cls = $('catalog-class');
  const sort = $('catalog-sort'), size = $('catalog-size');
  const tbody = $('catalog-table').querySelector('tbody'), summary = $('catalog-summary');
  const pageLabel = $('catalog-page'), prev = $('catalog-previous'), next = $('catalog-next');
  const stats = engine.catalogSummary(rows);
  const categoryLabels = new Map(engine.GROUPS.map(item => [item.key, item.label]));
  let page = 1;
  for (const key of ['other', 'series', 'esol', 'fragment']) {
    $('catalog-' + key).textContent = stats.groups[key].toLocaleString();
  }
  $('catalog-total').textContent = stats.total.toLocaleString();
  $('catalog-quality').textContent = stats.missingNames + ' missing names; ' +
    stats.missingFormulas + ' blank formulas; ' + stats.missingSmiles + ' blank SMILES; ' +
    stats.duplicateNames + ' case-insensitive duplicate names; ' +
    stats.duplicateExactSmiles + ' duplicate exact SMILES. These are text-level checks, not chemical verification.';
  for (const entry of stats.classes) {
    const opt = document.createElement('option');
    opt.value = entry.name;
    opt.textContent = entry.name + ' (' + entry.count + ')';
    cls.appendChild(opt);
  }
  function cell(tr, text, type) {
    const td = document.createElement(type || 'td');
    td.textContent = String(text == null ? '' : text);
    tr.appendChild(td);
    return td;
  }
  function settings() {
    return { query: query.value, group: group.value, cls: cls.value,
      sort: sort.value, perPage: Number(size.value), page };
  }
  function render() {
    const view = engine.catalogQuery(rows, settings());
    page = view.page;
    const fragment = document.createDocumentFragment();
    for (const item of view.rows) {
      const tr = document.createElement('tr');
      cell(tr, item.index + 1);
      cell(tr, item.entry.name);
      cell(tr, item.entry.cls);
      const collection = cell(tr, '');
      const tag = document.createElement('span');
      tag.className = 'catalog-tag';
      tag.textContent = categoryLabels.get(item.group);
      collection.appendChild(tag);
      const structure = cell(tr, item.entry.formula);
      const smiles = document.createElement('code');
      smiles.textContent = item.entry.smiles || 'Missing structure';
      structure.appendChild(smiles);
      fragment.appendChild(tr);
    }
    if (!view.rows.length) {
      const tr = document.createElement('tr');
      const td = cell(tr, 'No matching entries. Try clearing a filter.');
      td.colSpan = 5;
      fragment.appendChild(tr);
    }
    tbody.replaceChildren(fragment);
    const from = view.total ? (view.page - 1) * view.perPage + 1 : 0;
    const to = view.total ? from + view.rows.length - 1 : 0;
    summary.textContent = 'Showing ' + from + '–' + to + ' of ' +
      view.total.toLocaleString() + ' matching entries (' + stats.total.toLocaleString() + ' in library).';
    pageLabel.textContent = 'Page ' + view.page + ' of ' + view.pages;
    prev.disabled = view.page <= 1;
    next.disabled = view.page >= view.pages;
  }
  for (const control of [query, group, cls, sort, size]) {
    control.addEventListener(control === query ? 'input' : 'change', () => { page = 1; render(); });
  }
  prev.addEventListener('click', () => { page--; render(); });
  next.addEventListener('click', () => { page++; render(); });
  $('catalog-export').addEventListener('click', () => {
    const csv = engine.catalogCsv(rows, settings());
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'molecule-reference-index.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  render();
})();
