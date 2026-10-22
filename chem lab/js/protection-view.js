// Display conservative group-preservation checks alongside predictions. This
// assessment does not change a product or assert experimental compatibility.
function reactionProtectionAssessment(ctx) {
  if (typeof protectionAssess !== 'function') return null;
  const assessments = ctx.substrates.map((s) => {
    const assessment = protectionAssess(s.graph, ctx);
    return { assessment, substrate: s.compound && s.compound.smiles || '' };
  }).filter((item) => item.assessment && item.assessment.sites.length);
  if (!assessments.length) return null;
  const sites = assessments.flatMap(({assessment, substrate}) => assessment.sites.map((s) => ({...s, substrate})));
  const status = sites.some((s) => s.status === 'conflict') ? 'conflict' : sites.some((s) => s.status === 'unknown') ? 'unknown' : 'compatible';
  const references = [...new Map(assessments.flatMap(({assessment}) => assessment.references || []).map((r) => [r.url, r])).values()];
  return { status, sites, references };
}

function protectionAssessmentElement(assessment) {
  const make = (tag, text) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; return el; };
  const box = make('details'); box.className = 'rx-evidence protection-assessment';
  const label = { compatible: 'No encoded conflict', conflict: 'Cleavage or reaction risk', unknown: 'Compatibility unresolved' };
  box.append(make('summary', 'Protecting-group preservation · ' + (label[assessment.status] || label.unknown)));
  box.append(make('p', 'Detected motifs may be intended functionality rather than protecting groups. Checks apply to the encoded conditions and known group liabilities. Intentional deprotection can trigger a cleavage warning. No encoded conflict does not establish experimental compatibility.'));
  const list = make('ul');
  (assessment.sites || []).forEach((site) => {
    const item = make('li');
    item.append(make('strong', (site.label || site.id) + ': ' + (label[site.status] || label.unknown) + '. '));
    item.append(document.createTextNode((site.reasons || []).join(' ')));
    list.append(item);
  });
  box.append(list);
  (assessment.references || []).filter((r) => r && /^https:\/\//.test(r.url || '')).forEach((r) => {
    const a = make('a', r.title || r.url); a.href = r.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    const p = make('p'); p.append(a); box.append(p);
  });
  return box;
}

function protectionGuideElement() {
  const make = (tag, text) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; return el; };
  const box = make('details'); box.id = 'rx-protection-guide'; box.className = 'rx-rule-explorer';
  box.append(make('summary', 'Protecting-group reference'));
  box.append(make('p', 'Recognized motifs and encoded removal liabilities. This guide is broader than automatic planning: a group is offered in a route only when its installation, main reaction and removal are forward verified and pass compatibility checks.'));
  const label = make('label', 'Search protecting groups '), search = make('input');
  search.type = 'search'; search.setAttribute('aria-label', 'Search protecting groups'); label.append(search);
  const list = make('div');
  const render = () => {
    const term = search.value.trim().toLowerCase(); list.replaceChildren();
    protectionCatalog().filter((g) => [g.id,g.label,g.kind,g.install,g.remove].join(' ').toLowerCase().includes(term)).forEach((group) => {
      const card = make('details'); card.className = 'rx-evidence';
      card.append(make('summary', group.label + ' · ' + group.kind), make('p', 'Installation: ' + group.install), make('p', 'Removal: ' + group.remove));
      card.append(make('p', 'Known cleavage or reaction threats: ' + (group.liabilities.map((v) => v.replace(/([A-Z])/g, ' $1').toLowerCase()).join(', ') || 'No general guarantee; assess the selected reaction conditions.')));
      group.references.forEach((r) => { if (!/^https:\/\//.test(r.url || '')) return; const a=make('a',r.title||r.url); a.href=r.url; a.target='_blank'; a.rel='noopener noreferrer'; const p=make('p'); p.append(a); card.append(p); });
      list.append(card);
    });
    if (!list.children.length) list.append(make('p','No matching protecting group in the local registry.'));
  };
  search.addEventListener('input', render); box.append(label,list); render();
  return box;
}
