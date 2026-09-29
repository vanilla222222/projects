const STAMP_DEFINITIONS = {
  benzene: { sides: 6, label: 'Benzene', glyph: '⬡', bondPattern: 'aromatic' },
  cyclohexane: { sides: 6, label: 'Cyclohexane', glyph: '⬡', bondPattern: 'single' },
  cyclopentane: { sides: 5, label: 'Cyclopentane', glyph: '⬠', bondPattern: 'single' },
  cyclopropane: { sides: 3, label: 'Cyclopropane', glyph: '△', bondPattern: 'single' },
  cyclobutane: { sides: 4, label: 'Cyclobutane', glyph: '□', bondPattern: 'single' },
  cycloheptane: { sides: 7, label: 'Cycloheptane', glyph: '⬠', bondPattern: 'single' },
  pyridine: {
    sides: 6,
    label: 'Pyridine',
    glyph: '⬡',
    bondPattern: 'aromatic',
    elements: ['C', 'C', 'C', 'N', 'C', 'C'],
  },
  furan: {
    sides: 5,
    label: 'Furan',
    glyph: '⬠',
    bondPattern: 'furanoid',
    heteroIndex: 2,
    elements: ['C', 'C', 'O', 'C', 'C'],
  },
  thiophene: {
    sides: 5,
    label: 'Thiophene',
    glyph: '⬠',
    bondPattern: 'furanoid',
    heteroIndex: 2,
    elements: ['C', 'C', 'S', 'C', 'C'],
  },
  pyrrole: {
    sides: 5,
    label: 'Pyrrole',
    glyph: '⬠',
    bondPattern: 'furanoid',
    heteroIndex: 2,
    elements: ['C', 'C', 'N', 'C', 'C'],
  },
  imidazole: {
    sides: 5,
    label: 'Imidazole',
    glyph: '⬠',
    bondPattern: 'furanoid',
    heteroIndex: 2,
    elements: ['C', 'C', 'N', 'C', 'N'],
  },
  pyrazole: {
    sides: 5,
    label: 'Pyrazole',
    glyph: '⬠',
    bondPattern: 'furanoid',
    heteroIndex: 3,
    elements: ['C', 'C', 'C', 'N', 'N'],
  },
  thiazole: {
    sides: 5,
    label: 'Thiazole',
    glyph: '⬠',
    bondPattern: 'furanoid',
    heteroIndex: 2,
    elements: ['C', 'C', 'S', 'C', 'N'],
  },
  oxazole: {
    sides: 5,
    label: 'Oxazole',
    glyph: '⬠',
    bondPattern: 'furanoid',
    heteroIndex: 2,
    elements: ['C', 'C', 'O', 'C', 'N'],
  },
  piperidine: {
    sides: 6,
    label: 'Piperidine',
    glyph: '⬡',
    bondPattern: 'single',
    elements: ['C', 'C', 'C', 'N', 'C', 'C'],
  },
  morpholine: {
    sides: 6,
    label: 'Morpholine',
    glyph: '⬡',
    bondPattern: 'single',
    elements: ['C', 'C', 'O', 'C', 'C', 'N'],
  },
  cyclooctane: { sides: 8, label: 'Cyclooctane', glyph: '⬠', bondPattern: 'single' },
  pyrrolidine: {
    sides: 5,
    label: 'Pyrrolidine',
    glyph: '⬠',
    bondPattern: 'single',
    elements: ['C', 'C', 'N', 'C', 'C'],
  },
  azetidine: {
    sides: 4,
    label: 'Azetidine',
    glyph: '□',
    bondPattern: 'single',
    elements: ['C', 'C', 'N', 'C'],
  },
  piperazine: {
    sides: 6,
    label: 'Piperazine',
    glyph: '⬡',
    bondPattern: 'single',
    elements: ['C', 'C', 'N', 'C', 'C', 'N'],
  },
  thiomorpholine: {
    sides: 6,
    label: 'Thiomorpholine',
    glyph: '⬡',
    bondPattern: 'single',
    elements: ['C', 'C', 'S', 'C', 'C', 'N'],
  },
  tetrahydrofuran: {
    sides: 5,
    label: 'Tetrahydrofuran',
    glyph: '⬠',
    bondPattern: 'single',
    elements: ['C', 'C', 'O', 'C', 'C'],
  },
  tetrahydrothiophene: {
    sides: 5,
    label: 'Tetrahydrothiophene',
    glyph: '⬠',
    bondPattern: 'single',
    elements: ['C', 'C', 'S', 'C', 'C'],
  },
  azepane: {
    sides: 7,
    label: 'Azepane',
    glyph: '⬠',
    bondPattern: 'single',
    elements: ['C', 'C', 'C', 'N', 'C', 'C', 'C'],
  },
  oxirane: { sides: 3, label: 'Oxirane', glyph: '△', bondPattern: 'single', elements: ['C', 'C', 'O'] },
  aziridine: { sides: 3, label: 'Aziridine', glyph: '△', bondPattern: 'single', elements: ['C', 'C', 'N'] },
  oxetane: { sides: 4, label: 'Oxetane', glyph: '□', bondPattern: 'single', elements: ['C', 'C', 'C', 'O'] },
  oxane: { sides: 6, label: 'Oxane', glyph: '⬡', bondPattern: 'single', elements: ['C', 'C', 'O', 'C', 'C', 'C'] },
};

function stampRingBondOrder(definition, edgeIndex) {
  if (definition.bondPattern === 'aromatic') {
    return edgeIndex % 2 === 0 ? 2 : 1;
  }
  if (definition.bondPattern === 'furanoid') {
    const heteroIndex = definition.heteroIndex || 0;
    const relative = (edgeIndex - heteroIndex + definition.sides) % definition.sides;
    return relative % 2 === 0 ? 1 : 2;
  }
  return 1;
}

function stampElementAt(definition, vertexIndex) {
  return definition.elements ? definition.elements[vertexIndex] : 'C';
}

function stampRingRadius(sides) {
  return INTERACTION_SETTINGS.bondLength / (2 * Math.sin(Math.PI / sides));
}

const CUSTOM_STAMPS = {};

const FUSED_STAMPS = {
  naphthalene: { label: 'Naphthalene', smiles: 'c1ccc2ccccc2c1' },
  tetralin: { label: 'Tetralin', smiles: 'c1ccc2CCCCc2c1' },
  indole: { label: 'Indole', smiles: 'c1ccc2[nH]ccc2c1' },
  benzofuran: { label: 'Benzofuran', smiles: 'c1ccc2occc2c1' },
  quinoline: { label: 'Quinoline', smiles: 'c1ccc2ncccc2c1' },
  isoquinoline: { label: 'Isoquinoline', smiles: 'c1ccc2cnccc2c1' },
  tryptoline: { label: 'Tetrahydro-β-carboline', smiles: 'C1NCCc2c1[nH]c1ccccc21' },
  noraporphine: { label: 'Noraporphine', smiles: 'C1Cc2cccc3c2C(N1)Cc1ccccc1-3' },
  ergoline: { label: 'Ergoline', smiles: 'C1CC2C(CC3=CNC4=CC=CC2=C34)NC1' },
};

function fusedStampFragment(stampKey) {
  const fused = FUSED_STAMPS[stampKey];
  if (!fused) {
    return null;
  }
  if (!fused.fragment) {
    fused.fragment = smilesToFragment(fused.smiles);
  }
  return fused.fragment;
}

const BIO_STAMPS = {
  glycine: { label: 'Glycine', smiles: 'NCC(=O)O', group: 'amino' },
  alanine: { label: 'L-Alanine', smiles: 'C[C@H](N)C(=O)O', group: 'amino' },
  valine: { label: 'L-Valine', smiles: 'CC(C)[C@H](N)C(=O)O', group: 'amino' },
  leucine: { label: 'L-Leucine', smiles: 'CC(C)C[C@H](N)C(=O)O', group: 'amino' },
  isoleucine: { label: 'L-Isoleucine', smiles: 'CC[C@H](C)[C@H](N)C(=O)O', group: 'amino' },
  proline: { label: 'L-Proline', smiles: 'OC(=O)[C@@H]1CCCN1', group: 'amino' },
  phenylalanine: { label: 'L-Phenylalanine', smiles: 'N[C@@H](Cc1ccccc1)C(=O)O', group: 'amino' },
  tryptophan: { label: 'L-Tryptophan', smiles: 'N[C@@H](Cc1c[nH]c2ccccc12)C(=O)O', group: 'amino' },
  methionine: { label: 'L-Methionine', smiles: 'CSCC[C@H](N)C(=O)O', group: 'amino' },
  serine: { label: 'L-Serine', smiles: 'OC[C@H](N)C(=O)O', group: 'amino' },
  threonine: { label: 'L-Threonine', smiles: 'C[C@@H](O)[C@H](N)C(=O)O', group: 'amino' },
  cysteine: { label: 'L-Cysteine', smiles: 'SC[C@H](N)C(=O)O', group: 'amino' },
  tyrosine: { label: 'L-Tyrosine', smiles: 'N[C@@H](Cc1ccc(O)cc1)C(=O)O', group: 'amino' },
  asparagine: { label: 'L-Asparagine', smiles: 'NC(=O)C[C@H](N)C(=O)O', group: 'amino' },
  glutamine: { label: 'L-Glutamine', smiles: 'NC(=O)CC[C@H](N)C(=O)O', group: 'amino' },
  'aspartic-acid': { label: 'L-Aspartic acid', smiles: 'OC(=O)C[C@H](N)C(=O)O', group: 'amino' },
  'glutamic-acid': { label: 'L-Glutamic acid', smiles: 'OC(=O)CC[C@H](N)C(=O)O', group: 'amino' },
  lysine: { label: 'L-Lysine', smiles: 'NCCCC[C@H](N)C(=O)O', group: 'amino' },
  arginine: { label: 'L-Arginine', smiles: 'NC(=N)NCCC[C@H](N)C(=O)O', group: 'amino' },
  histidine: { label: 'L-Histidine', smiles: 'N[C@@H](Cc1c[nH]cn1)C(=O)O', group: 'amino' },
  'd-glucose': { label: 'D-Glucose', smiles: 'O=C[C@H](O)[C@@H](O)[C@H](O)[C@H](O)CO', group: 'sugar' },
  'd-galactose': { label: 'D-Galactose', smiles: 'O=C[C@H](O)[C@@H](O)[C@@H](O)[C@H](O)CO', group: 'sugar' },
  'd-mannose': { label: 'D-Mannose', smiles: 'O=C[C@@H](O)[C@@H](O)[C@H](O)[C@H](O)CO', group: 'sugar' },
  'd-fructose': { label: 'D-Fructose', smiles: 'OCC(=O)[C@@H](O)[C@H](O)[C@H](O)CO', group: 'sugar' },
  'd-ribose': { label: 'D-Ribose', smiles: 'O=C[C@H](O)[C@H](O)[C@H](O)CO', group: 'sugar' },
  'd-deoxyribose': { label: '2-Deoxy-D-ribose', smiles: 'O=CC[C@H](O)[C@H](O)CO', group: 'sugar' },
  'alpha-d-glucopyranose': { label: 'D-Glucopyranose (α)', smiles: 'OC[C@H]1O[C@H](O)[C@H](O)[C@@H](O)[C@@H]1O', group: 'sugar' },
  'beta-d-glucopyranose': { label: 'D-Glucopyranose (β)', smiles: 'OC[C@H]1O[C@@H](O)[C@H](O)[C@@H](O)[C@@H]1O', group: 'sugar' },
  'beta-d-ribofuranose': { label: 'D-Ribofuranose (β)', smiles: 'OC[C@H]1O[C@@H](O)[C@H](O)[C@@H]1O', group: 'sugar' },
  adenine: { label: 'Adenine', smiles: 'Nc1ncnc2[nH]cnc12', group: 'base' },
  guanine: { label: 'Guanine', smiles: 'Nc1nc2[nH]cnc2c(=O)[nH]1', group: 'base' },
  cytosine: { label: 'Cytosine', smiles: 'Nc1cc[nH]c(=O)n1', group: 'base' },
  thymine: { label: 'Thymine', smiles: 'Cc1c[nH]c(=O)[nH]c1=O', group: 'base' },
  uracil: { label: 'Uracil', smiles: 'O=c1cc[nH]c(=O)[nH]1', group: 'base' },
};

function bioStampFragment(stampKey) {
  const bio = Object.prototype.hasOwnProperty.call(BIO_STAMPS, stampKey) ? BIO_STAMPS[stampKey] : null;
  if (!bio) {
    return null;
  }
  if (!bio.fragment) {
    bio.fragment = smilesToFragment(bio.smiles);
  }
  return bio.fragment;
}

function placeCustomStamp(graph, custom, point, originAtomId, anchorId) {
  let cx = 0;
  let cy = 0;
  custom.atoms.forEach((a) => {
    cx += a.x;
    cy += a.y;
  });
  cx /= custom.atoms.length;
  cy /= custom.atoms.length;
  let anchor = custom.atoms.find((a) => a.id === anchorId) || custom.atoms[0];
  if (anchorId === undefined) {
    custom.atoms.forEach((a) => {
      if (Math.hypot(a.x - cx, a.y - cy) > Math.hypot(anchor.x - cx, anchor.y - cy)) {
        anchor = a;
      }
    });
  }
  let angle = 0;
  let cosA = 1;
  let sinA = 0;
  let shiftX = point.x;
  let shiftY = point.y;
  const hasOrigin = originAtomId !== null && originAtomId !== undefined;
  let origin = null;
  if (hasOrigin) {
    origin = graph.getAtom(originAtomId);
    if (!origin) {
      return null;
    }
    const target = snappedBondTarget(graph, origin, point);
    angle =
      Math.atan2(target.y - origin.y, target.x - origin.x) -
      Math.atan2(cy - anchor.y, cx - anchor.x);
    cosA = Math.cos(angle);
    sinA = Math.sin(angle);
    const rx = (anchor.x - cx) * cosA - (anchor.y - cy) * sinA;
    const ry = (anchor.x - cx) * sinA + (anchor.y - cy) * cosA;
    shiftX = target.x - rx;
    shiftY = target.y - ry;
  }
  const map = new Map();
  const created = [];
  custom.atoms.forEach((a) => {
    const dx = a.x - cx;
    const dy = a.y - cy;
    const atom = graph.addAtom(
      a.element,
      shiftX + dx * cosA - dy * sinA,
      shiftY + dx * sinA + dy * cosA
    );
    if (Number.isInteger(a.charge) && a.charge !== 0) {
      atom.charge = a.charge;
    }
    map.set(a.id, atom);
    created.push(atom);
  });
  custom.bonds.forEach((b) => {
    const bond = graph.addBond(map.get(b.atomA).id, map.get(b.atomB).id);
    if (bond) {
      bond.order = b.order;
      if (b.order === 1 && (b.stereo === 'wedge' || b.stereo === 'hash')) {
        bond.stereo = b.stereo;
      }
    }
  });
  if (hasOrigin) {
    graph.addBond(originAtomId, map.get(anchor.id).id);
  }
  return created;
}

function placeStamp(graph, stampKey, point, originAtomId) {
  const abbreviation = abbreviationKeyForStamp(stampKey);
  if (abbreviation) {
    return placeAbbreviation(graph, abbreviation, point, originAtomId);
  }
  if (CUSTOM_STAMPS[stampKey]) {
    return placeCustomStamp(graph, CUSTOM_STAMPS[stampKey], point, originAtomId);
  }
  const fusedFragment = fusedStampFragment(stampKey);
  if (fusedFragment) {
    return placeCustomStamp(graph, fusedFragment, point, originAtomId);
  }
  const bioFragment = bioStampFragment(stampKey);
  if (bioFragment) {
    return placeCustomStamp(graph, bioFragment, point, originAtomId);
  }
  const definition = STAMP_DEFINITIONS[stampKey];
  if (!definition) {
    return null;
  }
  const sides = definition.sides;
  const exteriorTurn = (2 * Math.PI) / sides;
  const vertices = [];

  if (originAtomId !== null && originAtomId !== undefined) {
    const origin = graph.getAtom(originAtomId);
    if (!origin) {
      return null;
    }
    const target = snappedBondTarget(graph, origin, point);
    const first = graph.addAtom(stampElementAt(definition, 0), target.x, target.y);
    graph.addBond(originAtomId, first.id);
    vertices.push(first);
    let angle = Math.atan2(target.y - origin.y, target.x - origin.x);
    let prev = first;
    for (let i = 1; i < sides; i++) {
      angle += exteriorTurn;
      const nx = prev.x + Math.cos(angle) * INTERACTION_SETTINGS.bondLength;
      const ny = prev.y + Math.sin(angle) * INTERACTION_SETTINGS.bondLength;
      const atom = graph.addAtom(stampElementAt(definition, i), nx, ny);
      graph.addBond(prev.id, atom.id);
      vertices.push(atom);
      prev = atom;
    }
    graph.addBond(prev.id, first.id);
  } else {
    const radius = stampRingRadius(sides);
    for (let i = 0; i < sides; i++) {
      const angle = -Math.PI / 2 + i * exteriorTurn;
      vertices.push(
        graph.addAtom(
          stampElementAt(definition, i),
          point.x + Math.cos(angle) * radius,
          point.y + Math.sin(angle) * radius
        )
      );
    }
    for (let i = 0; i < sides; i++) {
      graph.addBond(vertices[i].id, vertices[(i + 1) % sides].id);
    }
  }

  for (let i = 0; i < sides; i++) {
    const bond = graph.getBond(vertices[i].id, vertices[(i + 1) % sides].id);
    if (bond) {
      bond.order = stampRingBondOrder(definition, i);
    }
  }

  return vertices;
}
