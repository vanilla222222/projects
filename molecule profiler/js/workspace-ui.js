'use strict';
// Non-destructive workspace navigation over the existing analysis panels.
// The core chemistry calculations and all export APIs remain unchanged.
(function () {
  const views = [
    { id: 'overview', label: 'Overview', description: 'Structure, identity, key properties and major screening summaries.' },
    { id: 'properties', label: 'Properties', description: 'Physical descriptors, stereochemistry, topology and supporting evidence.' },
    { id: 'screening', label: 'Screening', description: 'Rule-based filters and structural alerts. These do not establish safety.' },
    { id: 'metabolism', label: 'Metabolism', description: 'Rule-enumerated biotransformations; candidate products are not experimentally confirmed.' },
    { id: 'discovery', label: 'References', description: 'Similarity, target-reference rankings and related comparisons.' },
    { id: 'data', label: 'Data & export', description: 'Batch results and per-atom descriptors.' },
    { id: 'compare', label: 'Compare', description: 'Compare two to four analyzed molecules side by side, with a reference column and export.' },
    { id: 'all', label: 'All sections', description: 'Browse every analysis module on one page.' }
  ];
  const categories = {
    'Identity': ['overview', 'properties'],
    'Structure': ['overview', 'properties'],
    'Physicochemical': ['overview', 'properties'],
    'Rings & substructure counts': ['properties'],
    'Stereochemistry': ['properties'],
    'Topological indices': ['properties'],
    'Lipophilicity & solubility': ['overview', 'properties'],
    'Descriptor evidence & applicability': ['properties'],
    'Drug-likeness': ['overview', 'screening'],
    'Bioavailability radar': ['overview', 'screening'],
    'Absorption plot': ['screening'],
    'Descriptor distributions': ['data'],
    'Batch table': ['data'],
    'Structural alerts': ['screening'],
    'Toxicity screens': ['screening'],
    'Metabolism': ['metabolism'],
    'Pharmacokinetics & exposure': ['metabolism', 'properties'],
    'Prodrugs & bioactivation': ['metabolism'],
    'Ionization scenarios': ['properties'],
    'Functional effect context': ['discovery'],
    'Dependence-related structural similarity': ['discovery'],
    'Similarity search': ['discovery'],
    'Target prediction': ['discovery'],
    'Atom contributions': ['properties', 'data']
  };
  const keywords = {
    'Identity': 'name formula smiles mass',
    'Structure': '2d molecule diagram depiction atom bonds',
    'Physicochemical': 'tpsa molecular weight donors acceptors',
    'Rings & substructure counts': 'aromatic ring fragments',
    'Stereochemistry': 'chirality isomer cis trans cip',
    'Topological indices': 'connectivity shape kier hall',
    'Lipophilicity & solubility': 'logp logs esol dissolution partition',
    'Descriptor evidence & applicability': 'quality confidence model limitations',
    'Drug-likeness': 'lipinski ghose veber rules',
    'Bioavailability radar': 'oral filters chart',
    'Absorption plot': 'boiled egg blood brain permeability',
    'Descriptor distributions': 'histogram descriptive statistics molecular weight tpsa logp batch',
    'Batch table': 'comparison multiple molecules csv',
    'Structural alerts': 'pains brenk reactive covalent',
    'Toxicity screens': 'toxicology endpoint hazard rules',
    'Metabolism': 'enzymes transformation products phase',
    'Dependence-related structural similarity': 'dependence analogy resemblance neighbours not addiction prediction',
    'Similarity search': 'fingerprint nearest neighbors',
    'Target prediction': 'receptors ligands protein',
    'Atom contributions': 'crippen fragments'
  };
  const nav = document.getElementById('workspace-nav');
  const search = document.getElementById('module-search');
  const description = document.getElementById('workspace-description');
  const grid = document.querySelector('#results > .grid');
  const comparison = document.getElementById('comparison-panel');
  if (!nav || !search || !grid) return;
  const panels = Array.from(grid.querySelectorAll(':scope > article.panel')).map(panel => {
    const title = panel.querySelector('.panel-head h2');
    const name = title ? title.textContent.trim() : '';
    return { panel, name, tags: categories[name] || ['all'], search: (name + ' ' + (keywords[name] || '')).toLowerCase() };
  });
  let active = 'overview';
  try {
    const saved = localStorage.getItem('mp-workspace');
    if (views.some(view => view.id === saved)) active = saved;
  } catch (_) { /* storage optional */ }
  const buttons = views.map(view => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.view = view.id;
    btn.textContent = view.label;
    btn.setAttribute('aria-pressed', 'false');
    nav.appendChild(btn);
    return btn;
  });
  function apply() {
    const term = search.value.trim().toLowerCase();
    let visible = 0;
    for (const item of panels) {
      const show = (!term && (active === 'all' || item.tags.includes(active))) || (term && item.search.includes(term));
      item.panel.hidden = !show;
      if (show) visible++;
    }
    const comparisonVisible = !!comparison && (active === 'compare' || (active === 'all' && !term));
    if (comparison) comparison.hidden = !comparisonVisible;
    grid.hidden = active === 'compare' && !term;
    for (const btn of buttons) btn.setAttribute('aria-pressed', String(btn.dataset.view === active && !term));
    const selected = views.find(view => view.id === active);
    description.textContent = term
      ? visible + (visible === 1 ? ' section matches ' : ' sections match ') + '“' + search.value.trim() + '”. Clear search to return to your selected workspace.'
      : selected.description + ' · ' + visible + (visible === 1 ? ' section' : ' sections');
    grid.classList.toggle('workspace-is-filtered', active !== 'all' || !!term);
  }
  nav.addEventListener('click', event => {
    const button = event.target.closest('button[data-view]');
    if (!button) return;
    active = button.dataset.view;
    search.value = '';
    try { localStorage.setItem('mp-workspace', active); } catch (_) {}
    apply();
  });
  search.addEventListener('input', apply);
  search.addEventListener('keydown', event => {
    if (event.key === 'Escape') { search.value = ''; apply(); search.blur(); }
  });
  // Discoverable keyboard help. Ctrl/Cmd+Enter continues to run analysis in the original app.
  document.addEventListener('keydown', event => {
    const target = event.target;
    const editing = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    if (!editing && event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      search.focus();
    }
  });
  // Long methodological notes remain fully accessible, with a concise default.
  for (const item of panels) {
    const notes = item.panel.querySelectorAll('p.caveat');
    notes.forEach(note => {
      if (note.id || note.querySelector('[id]')) return;
      const details = document.createElement('details');
      details.className = 'method-details';
      details.open = true; // Scientific caveats should be visible on first load.
      const summary = document.createElement('summary');
      summary.textContent = 'Read methods and limitations';
      details.appendChild(summary);
      note.parentNode.insertBefore(details, note);
      details.appendChild(note);
    });
  }
  // Accessible quick return to input while scrolling through longer reports.
  const jump = document.createElement('a');
  jump.className = 'floating-compose';
  jump.href = '#smiles-input';
  jump.textContent = '↑ Edit input';
  jump.setAttribute('aria-label', 'Return to SMILES input');
  document.body.appendChild(jump);
  apply();
})();
