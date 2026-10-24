'use strict';
(function () {
  const rows = typeof LIBRARY !== 'undefined' && Array.isArray(LIBRARY) ? LIBRARY : [];
  const engine = typeof LibraryCatalog !== 'undefined' ? LibraryCatalog : null;
  if (!engine) return;
  const $ = id => document.getElementById(id);
  const query = $('catalog-search'), group = $('catalog-group'), tagFilter = $('catalog-tag');
  const sort = $('catalog-sort'), size = $('catalog-size');
  const tbody = $('catalog-table').querySelector('tbody'), summary = $('catalog-summary');
  const pageLabel = $('catalog-page'), prev = $('catalog-previous'), next = $('catalog-next');
  const stats = engine.catalogSummary(rows);
  const categoryLabels = new Map(engine.GROUPS.map(item => [item.key, item.label]));
  let page = 1;
  for (const key of ['sourced', 'chebi', 'other', 'series', 'esol', 'fragment']) {
    $('catalog-' + key).textContent = stats.groups[key].toLocaleString();
  }
  $('catalog-total').textContent = stats.total.toLocaleString();
  $('catalog-quality').textContent = stats.missingNames + ' missing names; ' +
    stats.missingFormulas + ' blank formulas; ' + stats.missingSmiles + ' blank SMILES; ' +
    stats.duplicateNames + ' case-insensitive duplicate names; ' +
    stats.duplicateExactSmiles + ' duplicate exact SMILES. These are text-level checks, not chemical verification.';
  for (const entry of stats.tags) {
    const opt = document.createElement('option');
    opt.value = entry.name;
    opt.label = entry.name + ' (' + entry.count + ')';
    $('catalog-tag-options').appendChild(opt);
  }
  const registry=new Map(stats.tags.map(t=>[t.name,t.count]));
  const definitions=globalThis.LIBRARY_TAG_METADATA?.familyDefinitions||[];
  const familyNames=[...new Set([...definitions.map(d=>d.tag),...stats.tags.filter(t=>t.name.startsWith('Family motif: ')).map(t=>t.name)])].sort();
  const sections=[['Structural families',familyNames],['Functional groups',stats.tags.filter(t=>t.name.endsWith(' motif')).map(t=>t.name)],['Reference class labels',stats.tags.filter(t=>t.name.startsWith('Label: ')).map(t=>t.name)],['Study collections',stats.tags.filter(t=>t.name.startsWith('Study collection: ')).map(t=>t.name)],['Binding reference families',stats.tags.filter(t=>t.name.startsWith('Binding family: ')).map(t=>t.name)]];
  const familyButtons=[],familySections=[];
  for(const [title,names] of sections){
    const section=document.createElement('details');section.className='catalog-family-section';section.open=title==='Structural families';
    const heading=document.createElement('summary');heading.textContent=title+' · '+names.length;section.append(heading);
    const list=document.createElement('div');list.className='catalog-family-list';section.append(list);
    for(const name of names){const count=registry.get(name)||0,button=document.createElement('button');button.type='button';button.className='catalog-tag';
      button.textContent=name.replace(/^(Family motif: |Study collection: |Label: |Binding family: )/,'')+' ('+count+')';button.dataset.tag=name;
      button.setAttribute('aria-label','Filter by '+name);button.disabled=!count;
      button.title=name.startsWith('Label: ')?'Original reference classification; not independently inferred activity.':definitions.find(d=>d.tag===name)?.smarts||name;
      button.addEventListener('click',()=>{tagFilter.value=name;page=1;render();tagFilter.focus();});
      list.append(button);familyButtons.push(button);
    }
    $('catalog-families').append(section);familySections.push(section);
  }
  function findFamilies(){
    const term=$('catalog-family-search').value.trim().toLowerCase();let visible=0;
    for(const section of familySections){let count=0;for(const button of section.querySelectorAll('button')){button.hidden=!button.dataset.tag.toLowerCase().includes(term);if(!button.hidden){count++;visible++;}}
      section.hidden=!count;if(term&&count)section.open=true;
    }
    $('catalog-family-count').textContent=visible+' of '+familyButtons.length+' selectors'+(term?' match your search':' · counts use the complete library');
  }
  $('catalog-family-search').addEventListener('input',findFamilies);findFamilies();

  function cell(tr, text, type) {
    const td = document.createElement(type || 'td');
    td.textContent = String(text == null ? '' : text);
    tr.appendChild(td);
    return td;
  }
  function settings() {
    return { query: query.value, group: group.value, tag: tagFilter.value,
      sort: sort.value, perPage: Number(size.value), page };
  }
  function render() {
    familyButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.tag===tagFilter.value)));
    const view = engine.catalogQuery(rows, settings());
    page = view.page;
    const fragment = document.createDocumentFragment();
    for (const item of view.rows) {
      const tr = document.createElement('tr');
      cell(tr, item.index + 1);
      const name=cell(tr,item.label);
      const record=engine.nameRecord(item.entry);
      if(record){const small=document.createElement('small');small.className='catalog-id';small.textContent=item.entry.name+' · '+record.nameKind;name.appendChild(small);
        const source=document.createElement('a');source.href=record.sourceUrl;source.textContent='Name source';source.target='_blank';source.rel='noopener noreferrer';name.appendChild(source);}
      else if(/^CHEMBL\d+$/.test(item.entry.name)){const note=document.createElement('small');note.className='catalog-id';note.textContent='Name not verified; identifier retained';name.appendChild(note);}
      const tagCell=cell(tr,'');tagCell.className='catalog-tags-cell';
      const tags=document.createElement('div');tags.className='catalog-tags';
      let extraTags;
      item.tags.slice().sort((a,b)=>{const rank=t=>t.startsWith('Family motif: ')?0:t.endsWith(' motif')?1:t.startsWith('Study collection: ')?2:3;return rank(a)-rank(b)||a.localeCompare(b);}).forEach((label,index)=>{let target=tags;
        if(index===10){const more=document.createElement('details'),head=document.createElement('summary');head.textContent='+'+(item.tags.length-10)+' tags';more.appendChild(head);extraTags=document.createElement('div');extraTags.className='catalog-tags';more.appendChild(extraTags);tags.appendChild(more);}
        if(index>=10)target=extraTags;
        const button=document.createElement('button');button.type='button';button.className='catalog-tag';button.textContent=label;button.setAttribute('aria-label','Filter by tag '+label);
        button.addEventListener('click',()=>{tagFilter.value=label;page=1;render();tagFilter.focus();});target.appendChild(button);
      });tagCell.appendChild(tags);
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
  for (const control of [query, group, tagFilter, sort, size]) {
    control.addEventListener(control === query || control===tagFilter ? 'input' : 'change', () => { page = 1; render(); });
  }
  $('catalog-clear-tags').addEventListener('click',()=>{tagFilter.value='';page=1;render();tagFilter.focus();});
  $('catalog-reset').addEventListener('click',()=>{query.value='';group.value='all';tagFilter.value='';sort.value='name';size.value='50';$('catalog-family-search').value='';findFamilies();page=1;render();query.focus();});
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
