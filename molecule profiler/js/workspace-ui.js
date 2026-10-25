'use strict';
// Non-destructive workspace navigation over the existing analysis panels.
// The core chemistry calculations and all export APIs remain unchanged.
(function (root) {
  const views = [
    { id: 'overview', label: 'Overview', description: 'Structure, identity, key properties and major screening summaries.' },
    { id: 'properties', label: 'Properties', description: 'Physical descriptors, stereochemistry, topology and supporting evidence.' },
    { id: 'screening', label: 'Screening', description: 'Rule-based filters and structural alerts. These do not establish safety.' },
    { id: 'design', label: 'Prodrug studio', description: 'Build at a molecular site, compare designs, inspect release steps or check curated references.' },
    { id: 'candidates', label: 'Candidate comparison', description: 'Compare every quick design and inspect its target identity, cleavage bonds, products and remaining release steps.' },
    { id: 'analogues', label: 'Analogues', description: 'Browse local structural variants independently from prodrug designs.' },
    { id: 'exposure', label: 'Exposure', description: 'Research pharmacokinetic estimates and conditional ionization scenarios.' },
    { id: 'metabolism', label: 'Metabolism', description: 'Rule-enumerated biotransformations; candidate products are not experimentally confirmed.' },
    { id: 'discovery', label: 'References', description: 'Similarity, target-reference rankings and related comparisons.' },
    { id: 'research', label: 'Research tools', description: 'Independent native chemistry, conformers, force fields, reference shapes, fragment edits and docking.' },
    { id: 'python', label: 'Python workspace', description: 'Run Python in your browser against copied molecule, candidate and evidence data.' },
    { id: 'bbb', label: 'BBB research', description: 'Independent scaffold-tested BBBP-label model with calibration, applicability checks and abstention.' },
    { id: 'validation', label: 'Validation', description: 'Fixed-model experimental benchmarks, applicability coverage and your own measurement evaluation.' },
    { id: 'notebooks', label: 'Project notebooks', description: 'Local versioned research projects, notes, selected designs and reproducible evidence snapshots.' },
    { id: 'data', label: 'Data & export', description: 'Batch results and per-atom descriptors.' },
    { id: 'compare', label: 'Compare', description: 'Compare two to four analyzed molecules side by side, with a reference column and export.' },
    { id: 'all', label: 'All sections', description: 'Browse every analysis module on one page.' }
  ];
  const categories = {
    'Independent research tools': ['research'],
    'Python workspace': ['python'],
    'Candidate comparison': ['candidates'],
    'Prediction validation': ['validation'],
    'Identity': ['properties'],
    'Structure': ['overview', 'properties'],
    'Physicochemical': ['properties'],
    'Rings & substructure counts': ['properties'],
    'Stereochemistry': ['properties'],
    'Topological indices': ['properties'],
    'Lipophilicity & solubility': ['properties'],
    'Descriptor evidence & applicability': ['properties'],
    'Drug-likeness': ['screening'],
    'Bioavailability radar': ['screening'],
    'Absorption plot': ['screening'],
    'Descriptor distributions': ['data'],
    'Batch table': ['data'],
    'Structural alerts': ['screening'],
    'Toxicity screens': ['screening'],
    'Metabolism': ['metabolism'],
    'Pharmacokinetics & exposure': ['exposure'],
    'Prodrugs & bioactivation': ['design'],
    'Generated analogues': ['analogues'],
    'Ionization scenarios': ['exposure'],
    'Charge states & pH': ['exposure'],
    'BBB research model': ['bbb'],
    'Project notebooks': ['notebooks'],
    'Functional effect context': ['discovery'],
    'Dependence-related structural similarity': ['discovery'],
    'Similarity search': ['discovery'],
    'Target prediction': ['discovery'],
    'Atom contributions': ['properties', 'data']
  };
  const keywords = {
    'Independent research tools': 'independent native rdkit qed synthetic accessibility pains brenk nih zinc 3d conformers mmff uff forcefield docking vina fragments brics amino acid sidechains',
    'Identity': 'name formula smiles mass',
    'Structure': '2d molecule diagram depiction atom bonds',
    'Physicochemical': 'tpsa molecular weight donors acceptors',
    'Rings & substructure counts': 'aromatic ring fragments',
    'Stereochemistry': 'chirality isomer cis trans cip',
    'Topological indices': 'connectivity shape kier hall',
    'Lipophilicity & solubility': 'logp logs esol dissolution partition',
    'Descriptor evidence & applicability': 'quality confidence model limitations',
    'Candidate comparison': 'quick candidates all 25 designs release target cleavable bonds solubility BBB comparison dashboard',
    'Prediction validation': 'experimental benchmark measurements coverage accuracy performance confidence csv',
    'Drug-likeness': 'lipinski ghose veber rules',
    'Bioavailability radar': 'oral filters chart',
    'Absorption plot': 'boiled egg blood brain permeability',
    'Descriptor distributions': 'histogram descriptive statistics molecular weight tpsa logp batch',
    'Batch table': 'comparison multiple molecules csv',
    'Structural alerts': 'pains brenk reactive covalent',
    'Toxicity screens': 'toxicology endpoint hazard rules',
    'Metabolism': 'enzymes transformation products phase',
    'Prodrugs & bioactivation': 'design studio attachments molecule sites cleavable cleavage release pathways research priority comparison evidence',
    'Generated analogues': 'analogues variants substitutions structural designs',
    'Pharmacokinetics & exposure': 'pk pharmacokinetics half life decay exposure',
    'Ionization scenarios': 'pka ph logd ionization charge',
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
  const groups=[
    {name:'Explore',ids:['properties','screening','exposure','metabolism','bbb']},
    {name:'Design',ids:['analogues','design','candidates']},
    {name:'Research',ids:['discovery','research','python','validation']},
    {name:'Projects & data',ids:['notebooks','compare','data','all']}
  ];
  const sections=groups.map(group=>{const section=document.createElement('details');section.className='workspace-group';const title=document.createElement('summary');title.textContent=group.name;section.append(title);for(const id of group.ids)section.append(buttons.find(b=>b.dataset.view===id));nav.append(section);return section;});
  const mobileLabel=document.createElement('label');mobileLabel.className='workspace-picker-label';mobileLabel.textContent='Workspace';const picker=document.createElement('select');picker.id='workspace-picker';picker.setAttribute('aria-label','Choose workspace');mobileLabel.append(picker);
  const home=document.createElement('option');home.value='overview';home.textContent='Overview';picker.append(home);for(const group of groups){const opt=document.createElement('optgroup');opt.label=group.name;for(const id of group.ids){const o=document.createElement('option');o.value=id;o.textContent=views.find(v=>v.id===id).label;opt.append(o);}picker.append(opt);}document.querySelector('.result-toolbar')?.append(mobileLabel);
  picker.addEventListener('change',()=>{active=picker.value;search.value='';apply();try{localStorage.setItem('mp-workspace',active);}catch(_){}});
  function apply() {
    const term = search.value.trim().toLowerCase();
    document.getElementById('results').dataset.workspace = term ? 'search' : active;
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
    picker.value=active;for(const section of sections){section.open=!!section.querySelector('button[aria-pressed="true"]');}
    const heading=document.querySelector('.result-toolbar-heading h2');if(heading)heading.textContent=term?'Find a tool':selected.label;
    description.textContent = term
      ? visible + (visible === 1 ? ' section matches ' : ' sections match ') + '“' + search.value.trim() + '”. Clear search to return to your selected workspace.'
      : selected.description + ' · ' + visible + (visible === 1 ? ' section' : ' sections');
    grid.classList.toggle('workspace-is-filtered', active !== 'all' || !!term);
    document.body.dataset.workspace=term?'search':active;
    document.dispatchEvent(new CustomEvent('molecule-profiler:workspace',{detail:{view:active,search:term}}));
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
      if(note.matches('[role="status"],.warn'))return;
      const details = document.createElement('details');
      details.className = 'method-details';
      details.open = false; // Full methods remain accessible without dominating the default view.
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
  root.WorkspaceUI={select(id){if(!views.some(v=>v.id===id))return;active=id;search.value='';apply();},getActive:()=>active};
  apply();
})(globalThis);
