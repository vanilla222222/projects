// Descriptors are separate from graph-editing functions so rule scope and
// evidence can be searched without executing a prediction. References describe
// the reaction class; they do not validate a query, a local yield or this code.
const REACTION_CATALOG_VERSION = 1;
const REACTION_CATALOG_DEFAULTS = {
  assumptions: ['The input structure, roles and selected conditions are correct.', 'Only the functional groups and competing pathways encoded by this rule are evaluated.'],
  limitations: ['A rule match is a generated candidate, not an experimental finding.', 'Local scores, product ratios and yield estimates are not measured values for this substrate.'],
};

const REACTION_CATALOG_CURATED = {
  aldol: {
    family: 'Carbonyl C–C formation',
    references: [{ title: 'Hunt and Spinney, University of Calgary: aldol addition and condensation', url: 'https://www.chem.ucalgary.ca/courses/350/Carey5th/Ch18/ch18-3-5.html', kind: 'teaching' }],
  },
  michael: {
    family: 'Carbonyl C–C formation',
    references: [{ title: 'University of Calgary: Michael conjugate addition', url: 'https://chem.ucalgary.ca/courses/351/Carey5th/Ch21/ch21-4-3.html', kind: 'teaching' }],
  },
  robinson: {
    family: 'Carbonyl C–C formation',
    references: [{ title: 'University of Calgary: Robinson annulation', url: 'https://chem.ucalgary.ca/courses/351/Carey5th/Ch18/ch18-4-4.html', kind: 'teaching' }],
  },
  acetal: {
    family: 'Protecting groups',
    references: [{ title: 'University of Calgary: carbonyl protecting groups', url: 'https://www.chem.ucalgary.ca/courses/350/Carey5th/Ch17/ch17-3-4-3.html', kind: 'teaching' }],
  },
  protection: {
    family: 'Protecting groups',
    references: [{ title: 'University of Calgary: protecting groups in peptide synthesis', url: 'https://www.chem.ucalgary.ca/courses/353/Carey5th/Ch27/ch27-6.html', kind: 'teaching' }],
    limitations: ['The linked peptide chapter supports amine protection; it does not document every silyl or ether branch in this combined rule.'],
  },
  oxidation: {
    family: 'Oxidation',
    references: [{ title: 'John McMurry, OpenStax: oxidation of alcohols', url: 'https://openstax.org/books/organic-chemistry/pages/17-7-oxidation-of-alcohols', kind: 'teaching' }],
    limitations: ['The source supports the alcohol oxidation class; local substrate competition and ratios are implementation assumptions.'],
  },
  hydrogenation: {
    family: 'Reduction', scope: 'Catalytic addition of hydrogen to supported alkenes and alkynes, including the separately encoded Lindlar branch.',
    references: [{ title: 'Hunt and Spinney, University of Calgary: hydrogenation of alkenes', url: 'https://chem.ucalgary.ca/courses/351/Carey5th/Ch06/ch6-3.html', kind: 'teaching' }, { title: 'University of Calgary: hydrogenation of alkynes', url: 'https://www.chem.ucalgary.ca/courses/353/Carey5th/Ch09/ch9-6.html', kind: 'teaching' }],
  },
  hydroboration: {
    family: 'Addition', scope: 'Supported alkene hydroboration followed by an assumed oxidative work-up when it is not explicitly supplied.',
    assumptions: ['The usual peroxide/base work-up is assumed when absent; the prediction warning records that assumption.'],
    references: [{ title: 'Hunt and Spinney, University of Calgary: alkene hydroboration–oxidation', url: 'https://www3.chem.ucalgary.ca/courses/351/Carey5th/Ch06/ch6-6.html', kind: 'teaching' }],
  },
  halide: {
    family: 'Substitution and elimination', scope: 'Encoded alkyl-halide substitution/elimination branches selected using local substrate, base and solvent heuristics.',
    limitations: ['The relative ordering of competing SN1/SN2/E1/E2 products is heuristic, not a kinetic model.'],
    references: [{ title: 'Hunt and Spinney, University of Calgary: nucleophilic substitution', url: 'https://www3.chem.ucalgary.ca/courses/351/Carey5th/Ch08/ch8-0.html', kind: 'teaching' }, { title: 'University of Calgary: SN2 mechanism and substrate reactivity', url: 'https://www3.chem.ucalgary.ca/courses/353/Carey5th/Ch08/ch8-4.html', kind: 'teaching' }],
  },
  fischer: {
    family: 'Acyl substitution', scope: 'The supported acid/alcohol pair forms an ester under the encoded acid-catalysed conditions.',
    assumptions: ['Equilibrium conversion is represented by local estimates; removal of water and actual concentrations are not simulated.'],
    references: [{ title: 'Hunt and Spinney, University of Calgary: preparation of esters', url: 'https://www3.chem.ucalgary.ca/courses/353/Carey5th/Ch19/ch19-3-1-3.html', kind: 'teaching' }],
  },
  reduction: {
    family: 'Reduction', scope: 'NaBH4 and LiAlH4 branches for the carbonyl classes explicitly recognized by the implementation.',
    references: [{ title: 'University of Calgary: LiAlH4 reduction of esters', url: 'https://www3.chem.ucalgary.ca/courses/353/Carey5th/Ch20/ch20-3-3-2.html', kind: 'teaching' }],
    limitations: ['This reference documents the ester/LiAlH4 branch; other branches need their own rule-specific reference.'],
  },
  'baeyer-villiger': {
    family: 'Oxidation', scope: 'Oxygen insertion beside supported ketones with the locally encoded migration preference.',
    limitations: ['Migration preference is a simplified ranking; substrate-specific selectivity is not established. Alkene-containing substrates are deferred to the separate epoxidation rule.'],
    references: [{ title: 'Hunt and Spinney, University of Calgary: Baeyer–Villiger reaction', url: 'https://www3.chem.ucalgary.ca/courses/351/Carey5th/Ch17/ch17-3-5-2.html', kind: 'teaching' }],
  },
  'thiolate-alkylation': {
    family: 'Sulfur', scope: 'Thiolate or base-activated thiol substitution at methyl/accessibly primary alkyl halides; tertiary and neopentyl sites are excluded.',
    references: [{ title: 'University of Calgary: synthesis of sulfides', url: 'https://www.chem.ucalgary.ca/courses/350/Carey5th/Ch16/ch16-7-1.html', kind: 'teaching' }],
  },
  'disulfide-reduction': {
    family: 'Sulfur', scope: 'TCEP reduction of a supported disulfide under the encoded aqueous conditions.',
    references: [{ title: 'Burns et al., Selective Reduction of Disulfides by Tris(2-carboxyethyl)phosphine, J. Org. Chem. (1991)', url: 'https://doi.org/10.1021/jo00008a014', kind: 'primary' }],
  },
};

function reactionCatalogFamily(rule) {
  const explicit = {
    'enolate-alkylation': 'Carbonyl C–C formation', 'alpha-halogenation': 'Substitution and elimination',
    dehydration: 'Substitution and elimination', radical: 'Radical chemistry',
    'aromatic-diels-alder': 'Cycloaddition', sigmatropic: 'Rearrangement',
    carbodiimide: 'Acyl substitution', diazonium: 'Aromatic substitution',
    epoxide: 'Addition', 'epoxide-closure': 'Substitution and elimination', hydrohalogenation: 'Addition',
  };
  if (explicit[rule.id]) return explicit[rule.id];
  const name = (rule.id + ' ' + rule.name).toLowerCase();
  if (/protect|boc|cbz|fmoc|silyl|acetal|benzyl/.test(name)) return 'Protecting groups';
  if (/sulfur|sulfide|sulfoxide|sulfone|thiol/.test(name)) return 'Sulfur';
  if (/oxid|ozon|osmium|periodate|wacker|epoxid|baeyer/.test(name)) return 'Oxidation';
  if (/reduc|hydrogenation|luche|birch|clemmensen|dibal|hydrazine/.test(name)) return 'Reduction';
  if (/suzuki|heck|sonogashira|buchwald|coupling/.test(name)) return 'Coupling';
  if (/aromat|diazonium|snar|friedel|nitration|sulfonation/.test(name)) return 'Aromatic substitution';
  if (/ester|amide|acyl|fischer|sapon|carbodiimide|nitrile-hydrolysis/.test(name)) return 'Acyl substitution';
  if (/aldol|claisen|enolate|michael|mannich|robinson|knoevenagel|cyanide-carbonyl/.test(name)) return 'Carbonyl C–C formation';
  if (/rearrang|pinacol|sigmatropic/.test(name)) return 'Rearrangement';
  if (/diels|cyclo|simmons/.test(name)) return 'Cycloaddition';
  if (/halide|williamson|elimin|substit|finkelstein/.test(name)) return 'Substitution and elimination';
  if (/hydrat|halogenation|hydroboration|grignard|wittig|acetylide|epoxide/.test(name)) return 'Addition';
  return 'Other transformations';
}

function reactionRuleDescriptor(id) {
  const rule = typeof RX_RULES === 'undefined' ? null : RX_RULES.find((r) => r.id === id);
  if (!rule) return null;
  const data = Object.assign({}, REACTION_CATALOG_CURATED[id] || {}, rule.catalog || {});
  const references = (data.references || []).filter((r) => r && /^https:\/\//.test(r.url || '')).map((r) => ({ title: String(r.title || r.url), url: r.url, kind: r.kind === 'primary' ? 'primary' : 'teaching' }));
  return {
    version: REACTION_CATALOG_VERSION,
    id: rule.id,
    name: rule.name,
    family: data.family || reactionCatalogFamily(rule),
    scope: data.scope || ('Only the substrate patterns and conditions explicitly matched by the ' + rule.name + ' implementation. Detailed scope has not yet been curated.'),
    assumptions: REACTION_CATALOG_DEFAULTS.assumptions.concat(data.assumptions || []),
    limitations: REACTION_CATALOG_DEFAULTS.limitations.concat(data.limitations || []),
    references,
    sourceStatus: references.length ? 'Reaction-class reference recorded' : 'Rule-specific chemistry reference not yet recorded',
    model: 'Deterministic structural rule',
    evidenceLevel: 'Rule-based prediction',
    experimentalValidation: false,
  };
}

function reactionCatalog(query, filters) {
  const terms = String(query || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const family = filters && filters.family;
  return (typeof RX_RULES === 'undefined' ? [] : RX_RULES).map((r) => reactionRuleDescriptor(r.id)).filter((entry) => {
    if (family && entry.family !== family) return false;
    const text = [entry.id, entry.name, entry.family, entry.scope, entry.assumptions.join(' '), entry.limitations.join(' ')].join(' ').toLowerCase();
    return terms.every((term) => text.includes(term));
  }).sort((a, b) => a.family.localeCompare(b.family) || a.name.localeCompare(b.name));
}

function reactionRegisterRule(rule) {
  if (!rule || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rule.id || '') || typeof rule.name !== 'string' || !rule.name || typeof rule.run !== 'function') throw new Error('A reaction rule needs a stable id, name and run function.');
  if (RX_RULES.some((r) => r.id === rule.id)) throw new Error('Duplicate reaction rule id: ' + rule.id);
  RX_RULES.push(rule);
  return reactionRuleDescriptor(rule.id);
}

function reactionOutcomeEvidence(outcome, rule) {
  const descriptor = reactionRuleDescriptor(rule && rule.id || outcome.rule || outcome.id);
  return Object.assign({}, descriptor || {
    id: rule && rule.id || outcome.rule || outcome.id, name: outcome.name, family: outcome.type,
    scope: 'Local graph-editing rule; detailed scope is not recorded.', assumptions: REACTION_CATALOG_DEFAULTS.assumptions.slice(), limitations: REACTION_CATALOG_DEFAULTS.limitations.slice(), references: [], sourceStatus: 'Rule-specific chemistry reference not yet recorded', model: 'Deterministic structural rule', evidenceLevel: 'Rule-based prediction', experimentalValidation: false,
  }, { outcomeId: outcome.id, application: outcome.reason || '', referenceScope: 'References support the reaction class, not experimental success, selectivity or yield for this query.' });
}

function reactionEvidenceElement(evidence, compact) {
  const make = (tag, text) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; return el; };
  const box = make('details');
  box.className = 'rx-evidence';
  box.open = !compact;
  box.appendChild(make('summary', 'Evidence and scope · ' + (evidence.evidenceLevel || 'Rule-based prediction')));
  box.appendChild(make('p', 'Rule: ' + evidence.id + ' · ' + (evidence.family || 'Other transformations')));
  box.appendChild(make('p', evidence.scope));
  const addList = (label, values) => {
    if (!(values || []).length) return;
    box.appendChild(make('strong', label));
    const list = make('ul');
    values.forEach((value) => list.appendChild(make('li', value)));
    box.appendChild(list);
  };
  addList('Assumptions', evidence.assumptions);
  addList('Limitations', evidence.limitations);
  box.appendChild(make('p', evidence.sourceStatus));
  (evidence.references || []).forEach((reference) => {
    if (!/^https:\/\//.test(reference.url || '')) return;
    const line = make('p');
    const link = make('a', reference.title);
    link.href = reference.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    line.append(link, make('span', ' · ' + reference.kind));
    box.appendChild(line);
  });
  box.appendChild(make('p', evidence.referenceScope || 'References document the reaction class; the implementation and query are not experimentally validated.'));
  return box;
}
