const EMPTY_ELEMENT_NAME = { full: '', common: null, systematicPrimary: null };

const INORGANIC_ION_NAMES = {
  'F|-1': 'fluoride',
  'Cl|-1': 'chloride',
  'Br|-1': 'bromide',
  'I|-1': 'iodide',
  'O|-2': 'oxide',
  'S|-2': 'sulfide',
  'HS|-1': 'hydrogen sulfide',
  'Se|-2': 'selenide',
  'HO|-1': 'hydroxide',
  'O2|-2': 'peroxide',
  'H4N|1': 'ammonium',
  'H3O|1': 'oxonium',
  'CN|-1': 'cyanide',
  'CNO|-1': 'cyanate',
  'CNS|-1': 'thiocyanate',
  'N3|-1': 'azide',
  'NO2|-1': 'nitrite',
  'NO3|-1': 'nitrate',
  'CO3|-2': 'carbonate',
  'CHO3|-1': 'hydrogen carbonate',
  'O4S|-2': 'sulfate',
  'HO4S|-1': 'hydrogen sulfate',
  'O3S|-2': 'sulfite',
  'HO3S|-1': 'hydrogen sulfite',
  'O4P|-3': 'phosphate',
  'HO4P|-2': 'hydrogen phosphate',
  'H2O4P|-1': 'dihydrogen phosphate',
  'ClO|-1': 'hypochlorite',
  'ClO2|-1': 'chlorite',
  'ClO3|-1': 'chlorate',
  'ClO4|-1': 'perchlorate',
  'BrO3|-1': 'bromate',
  'IO3|-1': 'iodate',
  'IO4|-1': 'periodate',
  'O3Se|-2': 'selenite',
  'O4Se|-2': 'selenate',
  'BH4|-1': 'tetrahydroborate',
  'BF4|-1': 'tetrafluoroborate',
  'AlH4|-1': 'tetrahydroaluminate',
  'MnO4|-1': 'permanganate',
  'CrO4|-2': 'chromate',
  'Cr2O7|-2': 'dichromate',
  'AsO4|-3': 'arsenate',
  'Te|-2': 'telluride',
  'As|-3': 'arsenide',
  'At|-1': 'astatide',
};

const INORGANIC_ION_COMMON = {
  'tetrahydroborate': 'borohydride',
  'hydrogen carbonate': 'bicarbonate',
  'hydrogen sulfate': 'bisulfate',
  'tetrahydroaluminate': 'aluminium hydride',
};

const ANION_COMMON_NAMES = {
  'methanolate': 'methoxide',
  'ethanolate': 'ethoxide',
  'propan-1-olate': 'propoxide',
  'propan-2-olate': 'isopropoxide',
  'butan-1-olate': 'butoxide',
  '2-methylpropan-2-olate': 'tert-butoxide',
  'benzenolate': 'phenoxide',
  'methanesulfonate': 'mesylate',
  'trifluoromethanesulfonate': 'triflate',
  '4-methylbenzene-1-sulfonate': 'tosylate',
  'N-isopropylpropan-2-aminide': 'diisopropylamide',
  '1,1,1,3,3,3-hexamethyldisilazan-2-ide': 'bis(trimethylsilyl)amide',
  'ethanoate': 'acetate',
  'methanoate': 'formate',
};

const SALT_COMMON_NAMES = {
  'lithium N-isopropylpropan-2-aminide': 'lithium diisopropylamide (LDA)',
  'lithium 1,1,1,3,3,3-hexamethyldisilazan-2-ide': 'lithium bis(trimethylsilyl)amide (LiHMDS)',
  'sodium 1,1,1,3,3,3-hexamethyldisilazan-2-ide': 'sodium bis(trimethylsilyl)amide (NaHMDS)',
  'potassium 1,1,1,3,3,3-hexamethyldisilazan-2-ide': 'potassium bis(trimethylsilyl)amide (KHMDS)',
  'potassium 2-methylpropan-2-olate': 'potassium tert-butoxide (KOtBu)',
  'sodium tetrahydroborate': 'sodium borohydride',
  'N,N,N-tributylbutan-1-aminium fluoride': 'tetrabutylammonium fluoride (TBAF)',
  'lithium tetrahydroborate': 'lithium borohydride',
  'N,N-dimethylmethaniminium iodide': 'Eschenmoser\'s salt',
};

const ORGANOMETALLIC_COMMON_NAMES = {
  'bis(cyclopenta-2,4-dien-1-yl)iron': 'ferrocene',
  'dimethylmercury': 'dimethylmercury',
  'methylmercury chloride': 'methylmercury chloride',
  'butyllithium': 'n-butyllithium (n-BuLi)',
  'sec-butyllithium': 'sec-butyllithium (s-BuLi)',
  'tert-butyllithium': 'tert-butyllithium (t-BuLi)',
  'methyllithium': 'methyllithium (MeLi)',
  'phenyllithium': 'phenyllithium (PhLi)',
  'phenylmagnesium bromide': 'phenylmagnesium bromide (PhMgBr)',
  'methylmagnesium bromide': 'methylmagnesium bromide (MeMgBr)',
  'methylmagnesium chloride': 'methylmagnesium chloride (MeMgCl)',
  'methylmagnesium iodide': 'methylmagnesium iodide (MeMgI)',
  'ethylmagnesium bromide': 'ethylmagnesium bromide (EtMgBr)',
  'isopropylmagnesium chloride': 'isopropylmagnesium chloride (iPrMgCl)',
  'tert-butylmagnesium chloride': 'tert-butylmagnesium chloride (t-BuMgCl)',
  'ethenylmagnesium bromide': 'vinylmagnesium bromide',
  '(prop-2-en-1-yl)magnesium bromide': 'allylmagnesium bromide',
  'benzylmagnesium chloride': 'benzylmagnesium chloride (BnMgCl)',
  'diethylzinc': 'diethylzinc (Et2Zn)',
  'dimethylzinc': 'dimethylzinc (Me2Zn)',
};

const TIN_COMMON_NAMES = {
  'tributylstannane': 'tributyltin hydride (Bu3SnH)',
  'tributyl(chloro)stannane': 'tributyltin chloride (Bu3SnCl)',
  'chlorotrimethylstannane': 'trimethyltin chloride (Me3SnCl)',
  'tetramethylstannane': 'tetramethyltin',
  'tetrabutylstannane': 'tetrabutyltin',
  'tributyl(ethenyl)stannane': 'tributyl(vinyl)tin',
  'tributyl(phenyl)stannane': 'tributyl(phenyl)tin',
};

const BORON_COMMON_NAMES = {
  'trimethoxyborane': 'trimethyl borate',
  'triethoxyborane': 'triethyl borate',
  'triisopropoxyborane': 'triisopropyl borate',
  'trifluoroborane': 'boron trifluoride',
  'trichloroborane': 'boron trichloride',
  'tribromoborane': 'boron tribromide',
  '4,4,5,5-tetramethyl-1,3,2-dioxaborolane': 'pinacolborane (HBpin)',
  '4,4,4\',4\',5,5,5\',5\'-octamethyl-2,2\'-bi(1,3,2-dioxaborolane)': 'bis(pinacolato)diboron (B2pin2)',
  'triethylborane': 'triethylborane (TEB)',
  'tetraphenylborate': 'tetraphenylborate',
};

const SILICON_COMMON_NAMES = {
  '1,1,1,3,3,3-hexamethyldisiloxane': 'hexamethyldisiloxane (HMDSO)',
  '1,1,1,3,3,3-hexamethyldisilazane': 'hexamethyldisilazane (HMDS)',
  '1,1,1,2,2,2-hexamethyldisilane': 'hexamethyldisilane',
  '1,1,3,3-tetramethyldisiloxane': 'tetramethyldisiloxane (TMDSO)',
  'trimethyl(phenyl)silane': 'phenyltrimethylsilane',
  'trimethylsilanecarbonitrile': 'trimethylsilyl cyanide (TMSCN)',
  'azidotrimethylsilane': 'trimethylsilyl azide (TMSN3)',
  'trimethylsilyl trifluoromethanesulfonate': 'trimethylsilyl triflate (TMSOTf)',
  'tert-butyldimethylsilyl trifluoromethanesulfonate': 'tert-butyldimethylsilyl triflate (TBSOTf)',
  'triisopropylsilyl trifluoromethanesulfonate': 'triisopropylsilyl triflate (TIPSOTf)',
  'chlorodimethylsilane': 'chlorodimethylsilane',
  'triisopropylsilane': 'triisopropylsilane (TIPS-H)',
};

const SELENIUM_INORGANIC_NAMES = {
  'H2Se|0': 'hydrogen selenide',
  'O2Se|0': 'selenium dioxide',
  'O3Se|0': 'selenium trioxide',
  'H2O3Se|0': 'selenous acid',
  'H2O4Se|0': 'selenic acid',
};

const SELENIUM_COMMON_NAMES = {
  '2-amino-3-selanylpropanoic acid': 'selenocysteine',
  '2-amino-4-(methylselanyl)butanoic acid': 'selenomethionine',
  'benzeneselenol': 'selenophenol',
};

const SELENIUM_WORD_MAP = [
  [/thiophen/g, 'selenophen'],
  [/disulfide/g, 'diselenide'],
  [/sulfide/g, 'selenide'],
  [/sulfoxide/g, 'selenoxide'],
  [/sulfone/g, 'selenone'],
  [/sulfonic acid/g, 'selenonic acid'],
  [/sulfinic acid/g, 'seleninic acid'],
  [/sulfonate/g, 'selenonate'],
  [/sulfinate/g, 'seleninate'],
  [/sulfonyl/g, 'selenonyl'],
  [/sulfinyl/g, 'seleninyl'],
  [/sulfanyl/g, 'selanyl'],
  [/mercapto/g, 'selanyl'],
  [/thiocyanate/g, 'selenocyanate'],
  [/thiourea/g, 'selenourea'],
  [/thione/g, 'selone'],
  [/thiol/g, 'selenol'],
  [/thia/g, 'selena'],
  [/thio/g, 'seleno'],
];

function withElementNamingFlag(flag, fn) {
  ELEMENT_NAMING_STATE[flag] += 1;
  try {
    return fn();
  } finally {
    ELEMENT_NAMING_STATE[flag] -= 1;
  }
}

function elementGraphCopy(graph, atomIds, mapAtom) {
  const keep = new Set(atomIds);
  const copy = new Graph();
  graph.atoms.filter((a) => keep.has(a.id)).forEach((a) => {
    const next = mapAtom ? mapAtom(a) : a;
    if (!next) {
      return;
    }
    const atom = { id: a.id, element: next.element, x: a.x, y: a.y };
    if (next.charge) {
      atom.charge = next.charge;
    }
    copy.atoms.push(atom);
  });
  const ids = new Set(copy.atoms.map((a) => a.id));
  graph.bonds.filter((b) => ids.has(b.atomA) && ids.has(b.atomB)).forEach((b) => {
    copy.bonds.push({ id: b.id, atomA: b.atomA, atomB: b.atomB, order: b.order, stereo: b.stereo });
  });
  copy.nextAtomId = graph.nextAtomId;
  copy.nextBondId = graph.nextBondId;
  return { copy, ids: [...ids] };
}

function elementFormulaKey(graph, atomIds) {
  const counts = {};
  atomIds.forEach((id) => {
    const atom = graph.getAtom(id);
    counts[atom.element] = (counts[atom.element] || 0) + 1;
    const h = implicitHydrogenCount(atom.element, atom.charge || 0, graph.totalBondOrder(id));
    if (h) {
      counts.H = (counts.H || 0) + h;
    }
  });
  const keys = Object.keys(counts).sort();
  const order = counts.C
    ? ['C'].concat(counts.H ? ['H'] : [], keys.filter((k) => k !== 'C' && k !== 'H'))
    : keys;
  return order.map((k) => k + (counts[k] > 1 ? counts[k] : '')).join('');
}

function elementNeighbours(graph, atomIds, id) {
  const idSet = new Set(atomIds);
  return graph.bondsForAtom(id)
    .map((bond) => ({ id: bond.atomA === id ? bond.atomB : bond.atomA, order: bond.order }))
    .filter((link) => idSet.has(link.id))
    .map((link) => Object.assign(link, { atom: graph.getAtom(link.id) }));
}

function elementDetail(full, table) {
  return full ? { full, common: (table && table[full]) || COMMON_NAMES[full] || null, systematicPrimary: full } : null;
}

function elementComponents(graph, atomIds) {
  const remaining = new Set(atomIds);
  const components = [];
  while (remaining.size) {
    const start = remaining.values().next().value;
    const component = [start];
    remaining.delete(start);
    for (let i = 0; i < component.length; i += 1) {
      elementNeighbours(graph, atomIds, component[i]).forEach((link) => {
        if (remaining.has(link.id)) {
          remaining.delete(link.id);
          component.push(link.id);
        }
      });
    }
    components.push(component);
  }
  return components;
}

function extendedElementName(graph, atomIds) {
  const atoms = atomIds.map((id) => graph.getAtom(id)).filter(Boolean);
  const components = elementComponents(graph, atomIds);
  if (components.length > 1) {
    return nameSaltDetailed(graph, components) || EMPTY_ELEMENT_NAME;
  }
  if (atoms.some((atom) => atom.element === 'Se')) {
    return seleniumName(graph, atomIds) || EMPTY_ELEMENT_NAME;
  }
  if (atoms.length > 1 && atoms.some((atom) => ALKALI_METALS.has(atom.element))) {
    return metalCompoundName(graph, atomIds) || EMPTY_ELEMENT_NAME;
  }
  if (atoms.length > 1 && atoms.some((atom) => DIVALENT_METALS.has(atom.element))) {
    return divalentMetalName(graph, atomIds) || EMPTY_ELEMENT_NAME;
  }
  if (atoms.some((atom) => !LEGACY_NAMED_ELEMENTS.has(atom.element))) {
    return generalElementName(graph, atomIds) || EMPTY_ELEMENT_NAME;
  }
  if (atoms.some((atom) => atom.element === 'Sn')) {
    return stannaneName(graph, atomIds) || EMPTY_ELEMENT_NAME;
  }
  if (atoms.some((atom) => atom.element === 'B')) {
    return boronName(graph, atomIds) || EMPTY_ELEMENT_NAME;
  }
  const net = ELEMENT_NAMING_STATE.ignoreCharges ? 0 : atoms.reduce((sum, atom) => sum + (atom.charge || 0), 0);
  if (net !== 0) {
    return ionName(graph, atomIds) || EMPTY_ELEMENT_NAME;
  }
  if (!ELEMENT_NAMING_STATE.ignoreCharges && atoms.some((atom) => atom.charge)) {
    const zwitterion = zwitterionName(graph, atomIds);
    if (zwitterion) {
      return zwitterion;
    }
  }
  if (atoms.some((atom) => atom.element === 'Si') && !ELEMENT_NAMING_STATE.allowSilicon) {
    return siliconName(graph, atomIds) || EMPTY_ELEMENT_NAME;
  }
  return null;
}

function seleniumName(graph, atomIds) {
  const atoms = atomIds.map((id) => graph.getAtom(id));
  if (atoms.some((atom) => atom.element === 'S' || ['B', 'Li', 'Na', 'K'].includes(atom.element))) {
    return null;
  }
  const net = atoms.reduce((sum, atom) => sum + (atom.charge || 0), 0);
  const inorganic = SELENIUM_INORGANIC_NAMES[elementFormulaKey(graph, atomIds) + '|' + net] ||
    INORGANIC_ION_NAMES[elementFormulaKey(graph, atomIds) + '|' + net];
  if (inorganic) {
    return { full: inorganic, common: inorganic, systematicPrimary: null };
  }
  const { copy, ids } = elementGraphCopy(graph, atomIds, (a) => (a.element === 'Se' ? { element: 'S', charge: a.charge } : a));
  const detail = nameStructureDetailed(copy, ids);
  if (!detail.full || detail.full === molecularFormula(copy, ids)) {
    return null;
  }
  const full = SELENIUM_WORD_MAP.reduce((name, [pattern, word]) => name.replace(pattern, word), detail.full);
  if (/sulf|thi|mercapto/.test(full)) {
    return null;
  }
  return { full, common: SELENIUM_COMMON_NAMES[full] || null, systematicPrimary: full };
}

function silylEsterName(graph, atomIds, si) {
  const oxygens = elementNeighbours(graph, atomIds, si).filter((link) => link.atom.element === 'O' && link.order === 1);
  if (oxygens.length !== 1) {
    return null;
  }
  const oxygen = oxygens[0].id;
  const acyl = elementNeighbours(graph, atomIds, oxygen).find((link) => link.id !== si);
  if (!acyl) {
    return null;
  }
  const oxo = elementNeighbours(graph, atomIds, acyl.id).filter((link) => link.order === 2 && link.atom.element === 'O').length;
  if (!((acyl.atom.element === 'C' && oxo === 1) || (acyl.atom.element === 'S' && oxo === 2))) {
    return null;
  }
  const ctx = genContext(graph, atomIds);
  const silyl = genSubstituent(ctx, si, oxygen, 1);
  if (!silyl) {
    return null;
  }
  const silylSide = new Set([si]);
  const stack = [si];
  while (stack.length) {
    const current = stack.pop();
    elementNeighbours(graph, atomIds, current).forEach((link) => {
      if (link.id !== oxygen && !silylSide.has(link.id)) {
        silylSide.add(link.id);
        stack.push(link.id);
      }
    });
  }
  const { copy, ids } = elementGraphCopy(graph, atomIds, (a) => (silylSide.has(a.id) ? null : a));
  const acid = nameStructureDetailed(copy, ids);
  const pattern = /(sulfon)?ic acid$/;
  if (!acid.full || !pattern.test(acid.full)) {
    return null;
  }
  const silylWord = genFullyWrapped(silyl) ? silyl.slice(1, -1) : silyl;
  const full = silylWord + ' ' + acid.full.replace(/ic acid$/, 'ate');
  const commonAcid = acid.common && /ic acid$/.test(acid.common) && !/ /.test(acid.common.replace(/ acid$/, ''))
    ? silylWord + ' ' + acid.common.replace(/ic acid$/, 'ate')
    : null;
  return { full, common: SILICON_COMMON_NAMES[full] || commonAcid, systematicPrimary: full };
}

function siliconName(graph, atomIds) {
  const silicons = atomIds.filter((id) => graph.getAtom(id).element === 'Si');
  if (silicons.length === 1) {
    const ester = silylEsterName(graph, atomIds, silicons[0]);
    if (ester) {
      return ester;
    }
    const silane = silaneName(graph, atomIds);
    if (silane) {
      return elementDetail(silane, SILICON_COMMON_NAMES);
    }
  }
  if (silicons.length === 2) {
    const disilane = disilaneName(graph, atomIds, silicons);
    if (disilane) {
      return elementDetail(disilane, SILICON_COMMON_NAMES);
    }
  }
  const regular = withElementNamingFlag('allowSilicon', () => nameStructureDetailed(graph, atomIds));
  return regular && regular.full && /sil/.test(regular.full) ? regular : null;
}

function disilaneName(graph, atomIds, silicons) {
  const ctx = genContext(graph, atomIds);
  const [a, b] = silicons;
  if (ctx.ringSet.has(a) || ctx.ringSet.has(b)) {
    return null;
  }
  if ([a, b].some((si) => ctx.adjacency.get(si).some((link) => link.order !== 1))) {
    return null;
  }
  let bridge = null;
  let parent = null;
  if (ctx.adjacency.get(a).some((link) => link.id === b)) {
    parent = 'disilane';
  } else {
    const shared = ctx.adjacency.get(a).find((link) => ctx.adjacency.get(b).some((other) => other.id === link.id));
    if (!shared) {
      return null;
    }
    bridge = shared.id;
    const bridgeEl = graph.getAtom(bridge).element;
    const bridgeLinks = ctx.adjacency.get(bridge);
    if (bridgeEl === 'O' && bridgeLinks.length === 2) {
      parent = 'disiloxane';
    } else if (bridgeEl === 'N' && bridgeLinks.length === 2 && (!graph.getAtom(bridge).charge || ELEMENT_NAMING_STATE.ignoreCharges)) {
      parent = 'disilazane';
    } else {
      return null;
    }
  }
  const lastLocant = bridge === null ? 2 : 3;
  const groups = [];
  for (const si of [a, b]) {
    const names = [];
    for (const link of ctx.adjacency.get(si)) {
      if (link.id === bridge || link.id === a || link.id === b) {
        continue;
      }
      const name = genSubstituent(ctx, link.id, si, 1);
      if (!name || (name !== 'hydroxy' && GEN_PRINCIPAL_PREFIX_PATTERN.test(name))) {
        return null;
      }
      names.push(name);
    }
    groups.push(names);
  }
  const build = (first, second) => {
    const entries = [];
    first.forEach((name) => entries.push({ name, locant: 1 }));
    second.forEach((name) => entries.push({ name, locant: lastLocant }));
    const hydroxy = entries.filter((e) => e.name === 'hydroxy').map((e) => e.locant).sort((x, y) => x - y);
    const prefixes = entries.filter((e) => e.name !== 'hydroxy');
    const order = prefixes.slice().sort((x, y) => {
      const kx = genSortKey(x.name);
      const ky = genSortKey(y.name);
      return kx < ky ? -1 : kx > ky ? 1 : x.locant - y.locant;
    }).map((e) => e.locant);
    const key = hydroxy.concat([99], prefixes.map((e) => e.locant).sort((x, y) => x - y), [99], order);
    const prefixText = prefixes.length ? genAssemblePrefixes(prefixes) : '';
    const stem = prefixText + parent;
    const name = hydroxy.length === 0
      ? stem
      : (hydroxy.length > 1 ? stem : stem.slice(0, -1)) + '-' + hydroxy.join(',') + '-' + (hydroxy.length > 1 ? MULTIPLIER_PREFIXES[hydroxy.length] : '') + 'ol';
    return { key, name };
  };
  const forward = build(groups[0], groups[1]);
  const backward = build(groups[1], groups[0]);
  const cmp = forward.key.findIndex((v, i) => v !== backward.key[i]);
  return cmp === -1 || forward.key[cmp] < backward.key[cmp] ? forward.name : backward.name;
}

function pinacolBoronRing(graph, atomIds, boronId) {
  const oxygens = elementNeighbours(graph, atomIds, boronId).filter((link) => link.atom.element === 'O' && link.order === 1);
  if (oxygens.length !== 2) {
    return null;
  }
  const carbons = [];
  const members = new Set([boronId]);
  for (const o of oxygens) {
    const links = elementNeighbours(graph, atomIds, o.id);
    const carbon = links.find((link) => link.id !== boronId);
    if (links.length !== 2 || !carbon || carbon.atom.element !== 'C' || carbon.order !== 1) {
      return null;
    }
    members.add(o.id);
    carbons.push(carbon.id);
  }
  if (carbons[0] === carbons[1] || !elementNeighbours(graph, atomIds, carbons[0]).some((link) => link.id === carbons[1] && link.order === 1)) {
    return null;
  }
  for (const c of carbons) {
    members.add(c);
    const methyls = elementNeighbours(graph, atomIds, c).filter((link) => !members.has(link.id) && !carbons.includes(link.id) && !oxygens.some((o) => o.id === link.id));
    if (methyls.length !== 2 || methyls.some((m) => m.atom.element !== 'C' || m.order !== 1 || elementNeighbours(graph, atomIds, m.id).length !== 1)) {
      return null;
    }
    methyls.forEach((m) => members.add(m.id));
  }
  return { oxygens: oxygens.map((o) => o.id), members };
}

function boronCentralName(ctx, boronId, excluded) {
  const names = [];
  for (const link of ctx.adjacency.get(boronId)) {
    if (excluded.has(link.id)) {
      continue;
    }
    const name = genSubstituent(ctx, link.id, boronId, 1);
    if (!name) {
      return null;
    }
    names.push(name);
  }
  return names;
}

function boronName(graph, atomIds) {
  const atoms = atomIds.map((id) => graph.getAtom(id));
  if (atoms.some((atom) => ['Si', 'Li', 'Na', 'K', 'Se'].includes(atom.element))) {
    return null;
  }
  const borons = atoms.filter((atom) => atom.element === 'B');
  if (atoms.some((atom) => atom.charge && atom.element !== 'B')) {
    return null;
  }
  if (borons.some((atom) => atom.charge && atom.charge !== -1)) {
    return null;
  }
  const ctx = genContext(graph, atomIds);
  if (borons.length === 2) {
    return diboronName(graph, atomIds, borons);
  }
  if (borons.length !== 1) {
    return null;
  }
  const boron = borons[0];
  const links = ctx.adjacency.get(boron.id);
  if (links.some((link) => link.order !== 1)) {
    return null;
  }
  if (boron.charge === -1) {
    const inorganic = INORGANIC_ION_NAMES[elementFormulaKey(graph, atomIds) + '|-1'];
    if (inorganic) {
      return { full: inorganic, common: INORGANIC_ION_COMMON[inorganic] || inorganic, systematicPrimary: null };
    }
    if (links.length !== 4 || ctx.ringSet.has(boron.id)) {
      return null;
    }
    const names = boronCentralName(ctx, boron.id, new Set());
    return names ? elementDetail(genAssembleCentralPrefixes(names) + 'borate', BORON_COMMON_NAMES) : null;
  }
  if (links.length > 3) {
    return null;
  }
  const pin = pinacolBoronRing(graph, atomIds, boron.id);
  if (pin) {
    const rest = links.filter((link) => !pin.oxygens.includes(link.id));
    const entries = [4, 4, 5, 5].map((locant) => ({ name: 'methyl', locant }));
    if (rest.length === 1) {
      const name = genSubstituent(ctx, rest[0].id, boron.id, 1);
      if (!name) {
        return null;
      }
      entries.push({ name, locant: 2 });
    }
    return elementDetail(genAssemblePrefixes(entries) + '-1,3,2-dioxaborolane', BORON_COMMON_NAMES);
  }
  if (ctx.ringSet.has(boron.id)) {
    return null;
  }
  const names = boronCentralName(ctx, boron.id, new Set());
  if (!names) {
    return null;
  }
  const hydroxy = names.filter((name) => name === 'hydroxy').length;
  const others = names.filter((name) => name !== 'hydroxy');
  let full;
  if (hydroxy === 3) {
    full = 'boric acid';
  } else if (hydroxy === 2) {
    if (others.length === 0) {
      full = 'boronic acid';
    } else {
      const complex = /^\(.*\)$/.test(others[0]) || !/[\d(),\s]|-/.test(others[0].replace(/^(tert|sec)-/, ''));
      full = (complex ? others[0] : '(' + others[0] + ')') + 'boronic acid';
    }
  } else if (hydroxy === 1 && others.length === 2) {
    full = genAssembleCentralPrefixes(others) + 'borinic acid';
  } else {
    full = genAssembleCentralPrefixes(names) + 'borane';
  }
  return elementDetail(full, BORON_COMMON_NAMES);
}

function diboronName(graph, atomIds, borons) {
  const [a, b] = borons;
  if (!elementNeighbours(graph, atomIds, a.id).some((link) => link.id === b.id)) {
    return null;
  }
  const pa = pinacolBoronRing(graph, atomIds, a.id);
  const pb = pinacolBoronRing(graph, atomIds, b.id);
  if (!pa || !pb || pa.members.size + pb.members.size !== atomIds.length) {
    return null;
  }
  return elementDetail('4,4,4\',4\',5,5,5\',5\'-octamethyl-2,2\'-bi(1,3,2-dioxaborolane)', BORON_COMMON_NAMES);
}

function metalCompoundName(graph, atomIds) {
  const atoms = atomIds.map((id) => graph.getAtom(id));
  const metals = atoms.filter((atom) => ALKALI_METALS.has(atom.element));
  const partners = [];
  for (const metal of metals) {
    const links = elementNeighbours(graph, atomIds, metal.id);
    if (metal.charge || links.length !== 1 || links[0].order !== 1 || ALKALI_METALS.has(links[0].atom.element)) {
      return null;
    }
    partners.push(links[0]);
  }
  if (partners.every((link) => link.atom.element === 'C')) {
    if (metals.length !== 1) {
      return null;
    }
    const ctx = genContext(graph, atomIds);
    const name = genSubstituent(ctx, partners[0].id, metals[0].id, 1);
    if (!name) {
      return null;
    }
    const wrapped = /^\(.*\)$/.test(name) || !/[\d(),\s]|-/.test(name.replace(/^(tert|sec)-/, '')) ? name : '(' + name + ')';
    return elementDetail(wrapped + METAL_ION_NAMES[metals[0].element], ORGANOMETALLIC_COMMON_NAMES);
  }
  if (!partners.every((link) => ['O', 'S', 'N', 'F', 'Cl', 'Br', 'I', 'Se'].includes(link.atom.element))) {
    return null;
  }
  const extra = new Map();
  partners.forEach((link) => extra.set(link.id, (extra.get(link.id) || 0) + 1));
  const metalIds = new Set(metals.map((m) => m.id));
  const { copy, ids } = elementGraphCopy(graph, atomIds, (a) => (
    metalIds.has(a.id) ? null : extra.has(a.id) ? { element: a.element, charge: (a.charge || 0) - extra.get(a.id) } : a
  ));
  const anion = nameStructureDetailed(copy, ids);
  if (!anion.full) {
    return null;
  }
  const cations = new Map();
  metals.forEach((m) => cations.set(m.element, (cations.get(m.element) || 0) + 1));
  return saltDetailFromParts(
    Array.from(cations.entries()).map(([element, count]) => ({ full: METAL_ION_NAMES[element], common: METAL_ION_NAMES[element], count })),
    [{ full: anion.full, common: anion.common || anion.full, count: 1 }]
  );
}

function saltMultiplied(count, name) {
  if (count === 1) {
    return name;
  }
  return /[\d\s(),-]/.test(name) ? genMult(count, name, true) : MULTIPLIER_PREFIXES[count] + name;
}

function saltDetailFromParts(cations, anions) {
  const byName = (x, y) => (x.full < y.full ? -1 : x.full > y.full ? 1 : 0);
  const sortedCations = cations.slice().sort(byName);
  const sortedAnions = anions.slice().sort(byName);
  const full = sortedCations.map((c) => saltMultiplied(c.count, c.full)).concat(sortedAnions.map((a) => saltMultiplied(a.count, a.full))).join(' ');
  const plainCommon = sortedCations.map((c) => c.common).concat(sortedAnions.map((a) => a.common)).join(' ');
  return { full, common: SALT_COMMON_NAMES[full] || plainCommon, systematicPrimary: full };
}

function ionBaseName(name) {
  return name.replace(/\(\d?[+-]\)$/, '');
}

function nameSaltDetailed(graph, componentAtomIds) {
  const parts = [];
  let net = 0;
  for (const ids of componentAtomIds) {
    const charge = ids.reduce((sum, id) => sum + (graph.getAtom(id).charge || 0), 0);
    if (charge === 0) {
      continue;
    }
    const detail = nameStructureDetailed(graph, ids);
    if (!detail.full) {
      return null;
    }
    net += charge;
    const base = ionBaseName(detail.full);
    const stock = charge > 0 && ids.length === 1 ? stockName(graph.getAtom(ids[0]).element, charge) : null;
    parts.push({ charge, full: base, common: stock || ionBaseName(detail.common || detail.full) });
  }
  if (net !== 0 || parts.length < 2) {
    return null;
  }
  const group = (list) => {
    const map = new Map();
    list.forEach((p) => {
      const entry = map.get(p.full) || { full: p.full, common: p.common, count: 0 };
      entry.count += 1;
      map.set(p.full, entry);
    });
    return Array.from(map.values());
  };
  return saltDetailFromParts(group(parts.filter((p) => p.charge > 0)), group(parts.filter((p) => p.charge < 0)));
}

function ionSiteKind(graph, atomIds, atom) {
  const links = elementNeighbours(graph, atomIds, atom.id);
  if (atom.charge === -1) {
    if (links.some((link) => link.order !== 1)) {
      return null;
    }
    if (atom.element === 'O' && links.length === 1) {
      const other = links[0].atom;
      const otherLinks = elementNeighbours(graph, atomIds, other.id);
      const oxo = otherLinks.filter((link) => link.order === 2 && link.atom.element === 'O').length;
      if (other.element === 'C') {
        return oxo === 1 ? 'carboxylate' : oxo === 0 ? 'alkoxide' : null;
      }
      if (other.element === 'S') {
        return oxo === 2 ? 'sulfonate' : oxo === 1 ? 'sulfinate' : null;
      }
      if (other.element === 'Si') {
        return 'alkoxide';
      }
      return null;
    }
    if (atom.element === 'S' && links.length === 1 && links[0].atom.element === 'C') {
      return 'thiolate';
    }
    if (atom.element === 'N' && links.length === 2) {
      return 'amide';
    }
    return null;
  }
  if (atom.charge === 1 && atom.element === 'N') {
    const triple = links.find((link) => link.order === 3);
    if (triple) {
      return links.length === 2 && triple.atom.element === 'N' && elementNeighbours(graph, atomIds, triple.id).length === 1 ? 'diazonium' : null;
    }
    const double = links.find((link) => link.order === 2);
    if (double && double.atom.element === 'C') {
      const bond = graph.bondsForAtom(atom.id).find((b) => b.atomA === double.id || b.atomB === double.id);
      if (!isRingDoubleBond(graph, atomIds, bond)) {
        return 'iminium';
      }
    }
    return double || links.some((link) => link.atom.aromatic) ? 'azinium' : 'ammonium';
  }
  if (atom.charge === 1 && (atom.element === 'S' || atom.element === 'O') && links.length === 3 && links.every((link) => link.order === 1 && link.atom.element === 'C')) {
    return atom.element === 'S' ? 'sulfonium' : 'oxonium';
  }
  if (atom.charge === 1 && atom.element === 'P' && links.length === 4 && links.every((link) => link.order === 1 && link.atom.element === 'C')) {
    return 'phosphonium';
  }
  return null;
}

function suffixMultiplicity(name, suffix) {
  const match = name.match(new RegExp('(di|tri|tetra)?' + suffix + '$'));
  if (!match) {
    return 0;
  }
  return match[1] === 'di' ? 2 : match[1] === 'tri' ? 3 : match[1] === 'tetra' ? 4 : 1;
}

function countAcidGroups(graph, atomIds, kind) {
  const idSet = new Set(atomIds);
  let total = 0;
  atomIds.forEach((id) => {
    const atom = graph.getAtom(id);
    if (kind === 'carboxylate' ? atom.element !== 'C' : atom.element !== 'S') {
      return;
    }
    const links = elementNeighbours(graph, atomIds, id);
    const oxo = links.filter((link) => link.order === 2 && link.atom.element === 'O').length;
    const hydroxyish = links.filter((link) => link.order === 1 && link.atom.element === 'O' && elementNeighbours(graph, atomIds, link.id).length === 1).length;
    if ((kind === 'carboxylate' ? oxo === 1 : oxo === 2) && hydroxyish >= 1 && idSet.has(id)) {
      total += kind === 'carboxylate' && oxo === 1 && hydroxyish === 2 ? 2 : 1;
    }
  });
  return total;
}

function transformAnionName(name, kind, count, total) {
  if (kind === 'carboxylate' || kind === 'sulfonate' || kind === 'sulfinate') {
    const pattern = kind === 'carboxylate' ? /ic acid$/ : kind === 'sulfonate' ? /sulfonic acid$/ : /sulfinic acid$/;
    const replacement = kind === 'carboxylate' ? 'ate' : kind === 'sulfonate' ? 'sulfonate' : 'sulfinate';
    if (!pattern.test(name)) {
      return null;
    }
    const base = name.replace(pattern, replacement);
    if (count === total) {
      return base;
    }
    return total === 2 && count === 1 ? 'hydrogen ' + base : null;
  }
  if (kind === 'alkoxide' || kind === 'thiolate') {
    const suffix = kind === 'alkoxide' ? 'ol' : 'thiol';
    if (kind === 'alkoxide' && /thiol$/.test(name)) {
      return null;
    }
    return suffixMultiplicity(name, suffix) === count ? name + 'ate' : null;
  }
  if (kind === 'amide' && count === 1) {
    if (/disilazane$/.test(name)) {
      return name.replace(/disilazane$/, 'disilazan-2-ide');
    }
    return /amine$/.test(name) ? name.replace(/amine$/, 'aminide') : null;
  }
  return null;
}

function transformCationName(name, kind, count) {
  if (kind === 'ammonium') {
    return suffixMultiplicity(name, 'amine') === count ? name.replace(/amine$/, 'aminium') : null;
  }
  if (kind === 'azinium' && count === 1) {
    const match = name.match(/(isoquinoline|quinoline|pyridine)$/);
    if (!match) {
      return null;
    }
    const locant = match[1] === 'isoquinoline' ? 2 : 1;
    return name.slice(0, -1) + '-' + locant + '-ium';
  }
  return null;
}

function cationCommonName(name, kind) {
  if (!name) {
    return null;
  }
  if (kind === 'ammonium' && /amine$/.test(name)) {
    return name.replace(/amine$/, 'ammonium');
  }
  if (kind === 'ammonium' && name === 'aniline') {
    return 'anilinium';
  }
  if (kind === 'azinium' && /^(pyridine|quinoline|isoquinoline)$/.test(name)) {
    return name.slice(0, -1) + 'ium';
  }
  return null;
}

const AZINIUM_COMMON_NAMES = {
  'pyridin-1-ium': 'pyridinium',
  'quinolin-1-ium': 'quinolinium',
  'isoquinolin-2-ium': 'isoquinolinium',
  '1-methylpyridin-1-ium': 'N-methylpyridinium',
};

function anionCommonName(full, neutralCommon, kind, count, total) {
  if (ANION_COMMON_NAMES[full]) {
    return ANION_COMMON_NAMES[full];
  }
  if (neutralCommon && ['carboxylate', 'sulfonate'].includes(kind) && /ic acid$/.test(neutralCommon) && !/ /.test(neutralCommon.replace(/ acid$/, ''))) {
    const base = neutralCommon.replace(/ic acid$/, 'ate');
    return count === total ? base : 'hydrogen ' + base;
  }
  return null;
}

function quaternaryCommonName(graph, atomIds, centerId, word) {
  const ctx = genContext(graph, atomIds);
  if (ctx.ringSet.has(centerId)) {
    return null;
  }
  const names = [];
  for (const link of ctx.adjacency.get(centerId)) {
    const name = genSubstituent(ctx, link.id, centerId, 1);
    if (!name) {
      return null;
    }
    names.push(name);
  }
  return genAssembleCentralPrefixes(names) + word;
}

function ionName(graph, atomIds) {
  const atoms = atomIds.map((id) => graph.getAtom(id));
  const net = atoms.reduce((sum, atom) => sum + (atom.charge || 0), 0);
  const inorganic = INORGANIC_ION_NAMES[elementFormulaKey(graph, atomIds) + '|' + net];
  if (inorganic) {
    return { full: inorganic, common: INORGANIC_ION_COMMON[inorganic] || inorganic, systematicPrimary: null };
  }
  const charged = atoms.filter((atom) => atom.charge);
  const sites = charged.filter((atom) => !elementNeighbours(graph, atomIds, atom.id).some((link) => (link.atom.charge || 0) * atom.charge < 0));
  if (sites.length === 0 || sites.some((atom) => Math.sign(atom.charge) !== Math.sign(net))) {
    return null;
  }
  const kinds = sites.map((atom) => ionSiteKind(graph, atomIds, atom));
  if (kinds.some((kind) => !kind) || new Set(kinds).size !== 1) {
    return null;
  }
  const kind = kinds[0];
  const count = sites.length;
  if (kind === 'phosphonium') {
    if (count !== 1) {
      return null;
    }
    const full = quaternaryCommonName(graph, atomIds, sites[0].id, 'phosphanium');
    return full ? { full, common: full.replace(/phosphanium$/, 'phosphonium'), systematicPrimary: full } : null;
  }
  if (kind === 'sulfonium' || kind === 'oxonium') {
    if (count !== 1) {
      return null;
    }
    const word = kind === 'sulfonium' ? 'sulfanium' : 'oxidanium';
    const full = quaternaryCommonName(graph, atomIds, sites[0].id, word);
    return full ? { full, common: full.replace(new RegExp(word + '$'), kind), systematicPrimary: full } : null;
  }
  if (kind === 'iminium' || kind === 'diazonium') {
    if (count !== 1) {
      return null;
    }
    const full = kind === 'iminium' ? iminiumName(graph, atomIds, sites[0]) : diazoniumName(graph, atomIds, sites[0]);
    return full ? { full, common: CATION_COMMON_NAMES[full] || null, systematicPrimary: full } : null;
  }
  const neutral = withElementNamingFlag('ignoreCharges', () => nameStructureDetailed(graph, atomIds));
  if (!neutral.full) {
    return null;
  }
  if (net < 0) {
    const total = ['carboxylate', 'sulfonate'].includes(kind) ? countAcidGroups(graph, atomIds, kind) : count;
    const full = transformAnionName(neutral.full, kind, count, total);
    if (!full) {
      return null;
    }
    return { full, common: anionCommonName(full, neutral.common, kind, count, total), systematicPrimary: full };
  }
  const full = transformCationName(neutral.full, kind, count);
  if (!full) {
    return null;
  }
  const quaternary = kind === 'ammonium' && count === 1 && elementNeighbours(graph, atomIds, sites[0].id).length === 4
    ? quaternaryCommonName(graph, atomIds, sites[0].id, 'ammonium')
    : null;
  return { full, common: quaternary || cationCommonName(neutral.common, kind) || AZINIUM_COMMON_NAMES[full] || null, systematicPrimary: full };
}

const CATION_COMMON_NAMES = {
  'N,N-dimethylmethaniminium': 'dimethylmethyleneiminium',
  'benzenediazonium': 'benzenediazonium',
};

const ZWITTERION_COMMON_NAMES = {
  '(trimethylazaniumyl)ethanoate': 'glycine betaine',
};

function elementBranch(graph, atomIds, startId, blockedId) {
  const seen = new Set([startId]);
  const stack = [startId];
  while (stack.length) {
    const current = stack.pop();
    elementNeighbours(graph, atomIds, current).forEach((link) => {
      if (link.id !== blockedId && !seen.has(link.id)) {
        seen.add(link.id);
        stack.push(link.id);
      }
    });
  }
  return seen;
}

function nitrogenPrefix(names) {
  const sorted = names.slice().sort((a, b) => (genSortKey(a) < genSortKey(b) ? -1 : genSortKey(a) > genSortKey(b) ? 1 : 0));
  const complex = (name) => /[\s()0-9,-]/.test(name.replace(/^(tert|sec)-/, '')) || genCompoundPrefix(name);
  const wrap = (name) => (complex(name) ? '(' + name + ')' : name);
  if (sorted.length === 2 && sorted[0] === sorted[1]) {
    return 'N,N-' + genMult(2, sorted[0], complex(sorted[0]));
  }
  return sorted.map((name) => 'N-' + wrap(name)).join('-');
}

function iminiumName(graph, atomIds, nitrogen) {
  const links = elementNeighbours(graph, atomIds, nitrogen.id);
  const carbon = links.find((link) => link.order === 2);
  const subs = links.filter((link) => link.order === 1);
  const removed = new Set();
  for (const link of subs) {
    const branch = elementBranch(graph, atomIds, link.id, nitrogen.id);
    if (branch.has(carbon.id)) {
      return null;
    }
    branch.forEach((id) => removed.add(id));
  }
  const { copy, ids } = elementGraphCopy(graph, atomIds, (atom) => (removed.has(atom.id) ? null : atom.id === nitrogen.id ? { element: 'N' } : atom));
  const imine = nameStructureDetailed(copy, ids).full;
  if (!imine || !/imine$/.test(imine) || /^\(/.test(imine) || /N-/.test(imine)) {
    return null;
  }
  if (!subs.length) {
    return imine.replace(/imine$/, 'iminium');
  }
  const ctx = genContext(graph, atomIds);
  const names = subs.map((link) => genSubstituent(ctx, link.id, nitrogen.id, 1));
  if (names.some((name) => !name)) {
    return null;
  }
  const prefix = nitrogenPrefix(names);
  const firstExisting = genSortKey(imine.replace(/^[0-9,]+-/, ''));
  const hasPrefix = !/^(meth|eth|prop|but|pent|hex|hept|oct|non|dec|cyclo)/.test(imine.replace(/^[0-9,]+-/, ''));
  if (hasPrefix && genSortKey(names.slice().sort()[0]) > firstExisting) {
    return null;
  }
  return prefix + (/^[0-9]/.test(imine) ? '-' : '') + imine.replace(/imine$/, 'iminium');
}

function diazoniumName(graph, atomIds, nitrogen) {
  const links = elementNeighbours(graph, atomIds, nitrogen.id);
  const terminal = links.find((link) => link.order === 3);
  const { copy, ids } = elementGraphCopy(graph, atomIds, (atom) => (
    atom.id === nitrogen.id ? { element: 'C' } : atom.id === terminal.id ? { element: 'O' } : atom
  ));
  copy.bonds.find((b) => (b.atomA === nitrogen.id && b.atomB === terminal.id) || (b.atomB === nitrogen.id && b.atomA === terminal.id)).order = 2;
  const center = copy.getAtom(nitrogen.id);
  const hydroxy = copy.addAtom('O', center.x + 30, center.y + 30);
  copy.addBond(nitrogen.id, hydroxy.id);
  ids.push(hydroxy.id);
  const acid = nameStructureDetailed(copy, ids).full;
  if (!acid) {
    return null;
  }
  if (/^(.*)benzoic acid$/.test(acid)) {
    return acid.replace(/benzoic acid$/, 'benzenediazonium');
  }
  if (/-carboxylic acid$/.test(acid) && !/carboxylic acid.*carboxylic acid/.test(acid)) {
    return acid.replace(/-carboxylic acid$/, '-diazonium');
  }
  return null;
}

function zwitterionName(graph, atomIds) {
  const atoms = atomIds.map((id) => graph.getAtom(id));
  const sites = atoms.filter((atom) => atom.charge && !elementNeighbours(graph, atomIds, atom.id).some((link) => (link.atom.charge || 0) * atom.charge < 0));
  const cations = sites.filter((atom) => atom.charge === 1);
  const anions = sites.filter((atom) => atom.charge === -1);
  if (cations.length !== 1 || anions.length !== 1 || sites.length !== 2 || cations[0].element !== 'N') {
    return null;
  }
  const anionKind = ionSiteKind(graph, atomIds, anions[0]);
  if (!['carboxylate', 'sulfonate'].includes(anionKind) || countAcidGroups(graph, atomIds, anionKind) !== 1) {
    return null;
  }
  const nitrogen = cations[0];
  const links = elementNeighbours(graph, atomIds, nitrogen.id);
  if (links.some((link) => link.order !== 1)) {
    return null;
  }
  if (links.length === 4) {
    return quaternaryZwitterionName(graph, atomIds, nitrogen, anions[0], anionKind);
  }
  const neutral = withElementNamingFlag('ignoreCharges', () => nameStructureDetailed(graph, atomIds));
  if (!neutral.full) {
    return null;
  }
  const ctx = genContext(graph, atomIds);
  let cationic;
  if (ctx.ringSet.has(nitrogen.id)) {
    const match = neutral.full.match(/(aziridine|azetidine|pyrrolidine|piperidine|azepane)-(\d+)-(carboxylic acid|sulfonic acid)$/);
    if (!match || links.length !== 2) {
      return null;
    }
    cationic = neutral.full.slice(0, -match[0].length) + match[1].slice(0, -1) + '-1-ium-' + match[2] + '-' + match[3];
  } else {
    const amide = links.some((link) => elementNeighbours(graph, atomIds, link.id).some((next) => next.order === 2 && next.atom.element !== 'C'));
    if (amide || links.some((link) => link.atom.element !== 'C') || (neutral.full.match(/amino/g) || []).length !== 1 || /(di|tri|tetra)amino/.test(neutral.full)) {
      return null;
    }
    cationic = neutral.full.replace('amino', 'azaniumyl');
  }
  const full = transformAnionName(cationic, anionKind, 1, 1);
  if (!full) {
    return null;
  }
  return { full, common: neutral.common ? neutral.common + ' zwitterion' : null, systematicPrimary: full };
}

function quaternaryZwitterionName(graph, atomIds, nitrogen, anion, anionKind) {
  const links = elementNeighbours(graph, atomIds, nitrogen.id);
  const others = [];
  let backbone = null;
  for (const link of links) {
    const branch = elementBranch(graph, atomIds, link.id, nitrogen.id);
    if (branch.has(anion.id)) {
      if (backbone) {
        return null;
      }
      backbone = link;
    } else {
      others.push({ link, branch });
    }
  }
  if (!backbone) {
    return null;
  }
  const removed = new Set();
  others.forEach((entry) => entry.branch.forEach((id) => removed.add(id)));
  const { copy, ids } = elementGraphCopy(graph, atomIds, (atom) => (
    removed.has(atom.id) ? null : atom.id === nitrogen.id ? { element: 'Cl' } : atom.id === anion.id ? { element: 'O' } : atom
  ));
  const acid = nameStructureDetailed(copy, ids).full;
  const match = acid && acid.match(/^(\d+-)?chloro((meth|eth|prop|but|pent|hex)an(oic acid|esulfonic acid|e-1-sulfonic acid))$/);
  if (!match) {
    return null;
  }
  const ctx = genContext(graph, atomIds);
  const names = others.map((entry) => genSubstituent(ctx, entry.link.id, nitrogen.id, 1));
  if (names.some((name) => !name)) {
    return null;
  }
  const full = transformAnionName((match[1] || '') + '(' + genAssembleCentralPrefixes(names) + 'azaniumyl)' + match[2], anionKind, 1, 1);
  return full ? { full, common: ZWITTERION_COMMON_NAMES[full] || null, systematicPrimary: full } : null;
}

const HALIDE_WORDS = { F: 'fluoride', Cl: 'chloride', Br: 'bromide', I: 'iodide' };

function divalentMetalName(graph, atomIds) {
  const atoms = atomIds.map((id) => graph.getAtom(id));
  const metals = atoms.filter((atom) => DIVALENT_METALS.has(atom.element));
  if (metals.length !== 1 || atoms.some((atom) => atom.element === 'Sn' || ALKALI_METALS.has(atom.element))) {
    return null;
  }
  const metal = metals[0];
  const links = elementNeighbours(graph, atomIds, metal.id);
  if (metal.charge || links.length !== 2 || links.some((link) => link.order !== 1 || link.atom.charge)) {
    return null;
  }
  const word = METAL_ION_NAMES[metal.element];
  const carbons = links.filter((link) => link.atom.element === 'C');
  if (carbons.length) {
    const others = links.filter((link) => link.atom.element !== 'C');
    if (others.some((link) => !HALIDE_WORDS[link.atom.element] || elementNeighbours(graph, atomIds, link.id).length !== 1)) {
      return null;
    }
    const ctx = genContext(graph, atomIds);
    const names = carbons.map((link) => genSubstituent(ctx, link.id, metal.id, 1));
    if (names.some((name) => !name)) {
      return null;
    }
    const organo = genAssembleCentralPrefixes(names) + word;
    return elementDetail(others.length ? organo + ' ' + HALIDE_WORDS[others[0].atom.element] : organo, ORGANOMETALLIC_COMMON_NAMES);
  }
  if (!links.every((link) => ['O', 'S', 'N', 'F', 'Cl', 'Br', 'I'].includes(link.atom.element))) {
    return null;
  }
  const extra = new Map();
  links.forEach((link) => extra.set(link.id, (extra.get(link.id) || 0) + 1));
  const { copy, ids } = elementGraphCopy(graph, atomIds, (a) => (
    a.id === metal.id ? null : extra.has(a.id) ? { element: a.element, charge: (a.charge || 0) - extra.get(a.id) } : a
  ));
  const anions = new Map();
  for (const component of elementComponents(copy, ids)) {
    const detail = nameStructureDetailed(copy, component);
    if (!detail.full) {
      return null;
    }
    const entry = anions.get(detail.full) || { full: detail.full, common: detail.common || detail.full, count: 0 };
    entry.count += 1;
    anions.set(detail.full, entry);
  }
  return saltDetailFromParts([{ full: word, common: word, count: 1 }], Array.from(anions.values()));
}

function stannaneName(graph, atomIds) {
  const atoms = atomIds.map((id) => graph.getAtom(id));
  const tins = atoms.filter((atom) => atom.element === 'Sn');
  if (tins.length !== 1 || atoms.some((atom) => atom.charge || (atom.element !== 'Sn' && NAMING_UNSUPPORTED_ELEMENTS.has(atom.element)))) {
    return null;
  }
  const tin = tins[0].id;
  const ctx = genContext(graph, atomIds);
  const links = ctx.adjacency.get(tin);
  if (ctx.ringSet.has(tin) || links.some((link) => link.order !== 1)) {
    return null;
  }
  const names = links.map((link) => genSubstituent(ctx, link.id, tin, 1));
  if (names.some((name) => !name || GEN_PRINCIPAL_PREFIX_PATTERN.test(name))) {
    return null;
  }
  return elementDetail(genAssembleCentralPrefixes(names) + 'stannane', TIN_COMMON_NAMES);
}

const LEGACY_NAMED_ELEMENTS = new Set(['H', 'D', 'C', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Br', 'I', 'B', 'Si', 'Se', 'Li', 'Na', 'K', 'Cs', 'Mg', 'Ca', 'Zn', 'Sn']);

const PARENT_HYDRIDE_WORDS = {
  Al: 'alumane', Ga: 'gallane', In: 'indigane', Tl: 'thallane', Ge: 'germane', Pb: 'plumbane',
  As: 'arsane', Sb: 'stibane', Bi: 'bismuthane', Te: 'tellane', Po: 'polane', At: 'astatane',
};

const PARENT_HYDRIDE_COMMON_NAMES = {
  'arsane': 'arsine',
  'stibane': 'stibine',
  'bismuthane': 'bismuthine',
  'tellane': 'hydrogen telluride',
  'triphenylarsane': 'triphenylarsine',
  'triphenylstibane': 'triphenylstibine',
  'triphenylbismuthane': 'triphenylbismuth',
  'trimethylalumane': 'trimethylaluminium',
  'triethylalumane': 'triethylaluminium',
  'tris(2-methylpropyl)alumane': 'triisobutylaluminium',
  'bis(2-methylpropyl)alumane': 'diisobutylaluminium hydride (DIBAL-H)',
  'triisobutylalumane': 'triisobutylaluminium',
  'diisobutylalumane': 'diisobutylaluminium hydride (DIBAL-H)',
  'trimethylgallane': 'trimethylgallium',
  'tetrakis(acetyloxy)plumbane': 'lead(IV) acetate',
  'tetraethylplumbane': 'tetraethyllead',
  'tetramethylplumbane': 'tetramethyllead',
  'tetramethylgermane': 'tetramethylgermanium',
};

const BINARY_ANION_WORDS = { F: 'fluoride', Cl: 'chloride', Br: 'bromide', I: 'iodide', O: 'oxide', S: 'sulfide' };

const BINARY_COMMON_OVERRIDES = {
  'osmium tetraoxide': 'osmium tetroxide',
  'ruthenium tetraoxide': 'ruthenium tetroxide',
  'titanium tetrachloride': 'titanium tetrachloride',
};

const STOCK_EXEMPT_METALS = new Set(['Al', 'Ga', 'Zn', 'Cd', 'Ag', 'Sc', 'Y', 'La']);

const ROMAN_NUMERALS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

function elementWord(symbol) {
  const element = periodicElement(symbol);
  return element ? element.name.toLowerCase() : symbol;
}

function stockName(symbol, oxidation) {
  const element = periodicElement(symbol);
  if (!element || !isMetalElement(symbol) || ['alkali', 'alkaline'].includes(element.category) || STOCK_EXEMPT_METALS.has(symbol) || !ROMAN_NUMERALS[oxidation]) {
    return null;
  }
  return elementWord(symbol) + '(' + ROMAN_NUMERALS[oxidation] + ')';
}

function binaryMultiplier(count) {
  return count === 1 ? '' : MULTIPLIER_PREFIXES[count] || String(count);
}

function binaryCompoundName(graph, atomIds, central, links) {
  if (!links.length || atomIds.length !== links.length + 1) {
    return null;
  }
  const partner = links[0].atom.element;
  const word = BINARY_ANION_WORDS[partner];
  if (!word || links.some((link) => link.atom.element !== partner || link.atom.charge || elementNeighbours(graph, atomIds, link.id).length !== 1)) {
    return null;
  }
  if (partner !== 'O' && partner !== 'S' && links.some((link) => link.order !== 1)) {
    return null;
  }
  if ((partner === 'O' || partner === 'S') && links.some((link) => link.order === 1)) {
    return null;
  }
  const name = elementWord(central.element);
  const full = name + ' ' + binaryMultiplier(links.length) + word;
  const oxidation = links.reduce((sum, link) => sum + link.order, 0);
  const stock = stockName(central.element, oxidation);
  let common;
  if (stock) {
    common = stock + ' ' + word;
  } else if (isMetalElement(central.element)) {
    common = name + ' ' + word;
  } else {
    common = full.replace(/([a-z])[ao]oxide$/, '$1oxide');
  }
  return { full, common: BINARY_COMMON_OVERRIDES[full] || common, systematicPrimary: full };
}

function singleAtomElementName(atom) {
  const charge = atom.charge || 0;
  const word = elementWord(atom.element);
  if (charge) {
    return { full: word + '(' + Math.abs(charge) + (charge > 0 ? '+' : '-') + ')', common: null, systematicPrimary: null };
  }
  const hydride = PARENT_HYDRIDE_WORDS[atom.element];
  const full = hydride && implicitHydrogenCount(atom.element, 0, 0) > 0 ? hydride : word;
  return { full, common: PARENT_HYDRIDE_COMMON_NAMES[full] || null, systematicPrimary: full };
}

function parentHydrideName(graph, atomIds, central, links, binary) {
  const word = PARENT_HYDRIDE_WORDS[central.element];
  if (!word || central.charge || links.some((link) => link.order !== 1 || link.atom.charge)) {
    return null;
  }
  const ctx = genContext(graph, atomIds);
  if (ctx.ringSet.has(central.id)) {
    return null;
  }
  const names = links.map((link) => genSubstituent(ctx, link.id, central.id, 1));
  if (names.some((name) => !name || GEN_PRINCIPAL_PREFIX_PATTERN.test(name))) {
    return null;
  }
  const standard = { 13: 3, 14: 4, 15: 3, 16: 2, 17: 1 }[periodicElement(central.element).group] || links.length;
  const prefixes = genAssembleCentralPrefixes(names);
  const full = links.length > standard ? prefixes + '-\u03bb' + links.length + '-' + word : prefixes + word;
  return { full, common: PARENT_HYDRIDE_COMMON_NAMES[full] || (binary && binary.common) || COMMON_NAMES[full] || null, systematicPrimary: full };
}

function metalSaltSplit(graph, atomIds, metal, links, cation) {
  const extra = new Map();
  links.forEach((link) => extra.set(link.id, (extra.get(link.id) || 0) + 1));
  const { copy, ids } = elementGraphCopy(graph, atomIds, (a) => (
    a.id === metal.id ? null : extra.has(a.id) ? { element: a.element, charge: (a.charge || 0) - extra.get(a.id) } : a
  ));
  const anions = new Map();
  for (const component of elementComponents(copy, ids)) {
    const detail = nameStructureDetailed(copy, component);
    if (!detail.full) {
      return null;
    }
    const entry = anions.get(detail.full) || { full: detail.full, common: detail.common || detail.full, count: 0 };
    entry.count += 1;
    anions.set(detail.full, entry);
  }
  return saltDetailFromParts([cation], Array.from(anions.values()));
}

function generalMetalName(graph, atomIds, metal, links) {
  if (metal.charge || !links.length || links.some((link) => link.order !== 1 || link.atom.charge)) {
    return null;
  }
  const ctx = genContext(graph, atomIds);
  if (ctx.ringSet.has(metal.id)) {
    return null;
  }
  const word = elementWord(metal.element);
  const carbons = links.filter((link) => link.atom.element === 'C');
  if (carbons.length) {
    const halides = links.filter((link) => link.atom.element !== 'C');
    if (halides.some((link) => !HALIDE_WORDS[link.atom.element] || link.atom.element !== halides[0].atom.element || elementNeighbours(graph, atomIds, link.id).length !== 1)) {
      return null;
    }
    const names = carbons.map((link) => genSubstituent(ctx, link.id, metal.id, 1));
    if (names.some((name) => !name)) {
      return null;
    }
    const organo = genAssembleCentralPrefixes(names) + word;
    const full = halides.length ? organo + ' ' + binaryMultiplier(halides.length) + HALIDE_WORDS[halides[0].atom.element] : organo;
    return elementDetail(full, ORGANOMETALLIC_COMMON_NAMES);
  }
  if (!links.every((link) => ['O', 'S', 'N', 'F', 'Cl', 'Br', 'I'].includes(link.atom.element))) {
    return null;
  }
  const stock = stockName(metal.element, links.length);
  return metalSaltSplit(graph, atomIds, metal, links, { full: word, common: stock || word, count: 1 });
}

function generalElementName(graph, atomIds) {
  const atoms = atomIds.map((id) => graph.getAtom(id));
  const net = atoms.reduce((sum, atom) => sum + (atom.charge || 0), 0);
  const inorganic = INORGANIC_ION_NAMES[elementFormulaKey(graph, atomIds) + '|' + net];
  if (inorganic) {
    return { full: inorganic, common: INORGANIC_ION_COMMON[inorganic] || inorganic, systematicPrimary: null };
  }
  if (atoms.length === 1) {
    return singleAtomElementName(atoms[0]);
  }
  const centres = atoms.filter((atom) => !LEGACY_NAMED_ELEMENTS.has(atom.element));
  if (centres.length !== 1) {
    return null;
  }
  const central = centres[0];
  const links = elementNeighbours(graph, atomIds, central.id);
  const binary = central.charge ? null : binaryCompoundName(graph, atomIds, central, links);
  if (PARENT_HYDRIDE_WORDS[central.element]) {
    const hydride = parentHydrideName(graph, atomIds, central, links, binary);
    if (hydride) {
      return hydride;
    }
  }
  if (binary) {
    return binary;
  }
  if (isMetalElement(central.element)) {
    return generalMetalName(graph, atomIds, central, links);
  }
  return null;
}

function explicitHydrogenName(graph, atomIds) {
  const atoms = atomIds.map((id) => graph.getAtom(id)).filter(Boolean);
  const hydrogens = atoms.filter((atom) => atom.element === 'H');
  if (!hydrogens.length) {
    return null;
  }
  if (hydrogens.length === atoms.length) {
    if (atoms.length === 1) {
      const charge = atoms[0].charge || 0;
      const label = charge > 0 ? 'hydron' : charge < 0 ? 'hydride' : 'hydrogen atom';
      return { full: label, common: charge > 0 ? 'proton' : label, systematicPrimary: null };
    }
    if (atoms.length === 2 && graph.getBond(atoms[0].id, atoms[1].id) && !atoms.some((atom) => atom.charge)) {
      return { full: 'dihydrogen', common: 'hydrogen', systematicPrimary: null };
    }
    return EMPTY_ELEMENT_NAME;
  }
  const idSet = new Set(atomIds);
  const removable = hydrogens.every((atom) => {
    const links = graph.bondsForAtom(atom.id).filter((bond) => idSet.has(bond.atomA) && idSet.has(bond.atomB));
    if (atom.charge || links.length !== 1 || links[0].order !== 1) {
      return false;
    }
    const other = graph.getAtom(links[0].atomA === atom.id ? links[0].atomB : links[0].atomA);
    return other.element !== 'H' && other.element !== 'D';
  });
  if (!removable) {
    return EMPTY_ELEMENT_NAME;
  }
  const { copy, ids } = elementGraphCopy(graph, atomIds, (a) => (a.element === 'H' ? null : a));
  return nameStructureDetailed(copy, ids);
}
