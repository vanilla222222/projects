const RXIO_ROLE_ORDER = ['reagent', 'catalyst', 'solvent'];

function rxioCompoundSmiles(compound) {
  if (compound && compound.fragment) {
    return reactionIsomericSmiles(compound.fragment, compound.smiles);
  }
  return compound ? compound.isomericSmiles || compound.smiles || '' : '';
}

function rxioToReactionSmiles(compounds, products) {
  const list = compounds || [];
  const left = list.filter((c) => c.role === 'reactant').map(rxioCompoundSmiles).filter(Boolean);
  const middle = [];
  RXIO_ROLE_ORDER.forEach((role) => {
    list.filter((c) => c.role === role).map(rxioCompoundSmiles).filter(Boolean).forEach((s) => middle.push(s));
  });
  const right = (products || []).map((p) => (typeof p === 'string' ? p : rxioCompoundSmiles(p))).filter(Boolean);
  return left.join('.') + '>' + middle.join('.') + '>' + right.join('.');
}

function rxioFragmentCharge(fragment) {
  return fragment.atoms.reduce((sum, atom) => sum + (atom.charge || 0), 0);
}

function rxioSplitSide(text) {
  const side = String(text || '').trim();
  if (!side) return [];
  const parts = side.split('.');
  if (parts.some((part) => !part.trim())) {
    throw new Error('A reaction component is empty (check the dot separators)');
  }
  const out = [];
  let pending = [];
  let charge = 0;
  parts.forEach((part) => {
    const fragment = smilesToFragment(part.trim());
    pending.push(part.trim());
    charge += rxioFragmentCharge(fragment);
    if (charge === 0) {
      out.push(pending.join('.'));
      pending = [];
    }
  });
  if (pending.length) {
    out.push(pending.join('.'));
  }
  return out;
}

function rxioParseReactionSmiles(text) {
  const line = String(text || '').trim().split(/\s+/)[0] || '';
  const sides = line.split('>');
  if (sides.length !== 3) {
    throw new Error('A reaction SMILES has the form reactants>agents>products');
  }
  const compounds = [];
  rxioSplitSide(sides[0]).forEach((smiles) => compounds.push({ smiles, role: 'reactant' }));
  rxioSplitSide(sides[1]).forEach((smiles) => {
    const fragment = smilesToFragment(smiles);
    const guessed = reactionGuessRole({ smiles, fragment }, compounds);
    compounds.push({ smiles, role: guessed === 'reactant' ? 'reagent' : guessed });
  });
  const products = rxioSplitSide(sides[2]).map((smiles) => ({ smiles }));
  if (!compounds.length && !products.length) {
    throw new Error('The reaction SMILES is empty');
  }
  return { compounds, products };
}

function rxioMolBlock(item, title) {
  const fragment = item.fragment || smilesToFragment(typeof item === 'string' ? item : item.isomericSmiles || item.smiles);
  const graph = reactionFragmentGraph(fragment);
  return graphToMolfile(graph, null, title || '');
}

function rxioToRxn(compounds, products) {
  const list = compounds || [];
  const reactants = list.filter((c) => c.role === 'reactant');
  const agents = list.filter((c) => RXIO_ROLE_ORDER.includes(c.role));
  const prods = products || [];
  const pad = (n) => String(n).padStart(3, ' ');
  const lines = ['$RXN', '', '  ChemGraph', '', pad(reactants.length) + pad(prods.length) + (agents.length ? pad(agents.length) : '')];
  const block = (item) => '$MOL\n' + rxioMolBlock(item, item.name || item.label || '');
  return lines.join('\n') + '\n' + reactants.concat(prods, agents).map(block).join('');
}

function rxioParseRxn(text) {
  const clean = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trimStart();
  const lines = clean.split('\n');
  if (!/^\$RXN\b/.test(lines[0] || '')) {
    throw new Error('Not an RXN file');
  }
  if (/V3000/.test(lines[0])) {
    throw new Error('RXN V3000 files are not supported — save as V2000');
  }
  const counts = lines[4] || '';
  const readCount = (start, optional) => {
    const field = counts.slice(start, start + 3).trim();
    if (optional && !field) return 0;
    if (!/^\d{1,3}$/.test(field)) throw new Error('Invalid RXN molecule counts line');
    return Number(field);
  };
  const reactantCount = readCount(0, false);
  const productCount = readCount(3, false);
  const agentCount = readCount(6, true);
  const totalCount = reactantCount + productCount + agentCount;
  if (!totalCount) throw new Error('The RXN file is empty');
  const records = clean.split(/^\$MOL[ \t]*\n/m).slice(1);
  if (records.length !== totalCount) {
    throw new Error('The RXN molecule records do not match its counts line (including agents)');
  }
  const toSmiles = (record) => {
    const mol = parseMolRecord(record);
    const graph = molRecordToGraph(mol);
    const props = reactionGraphProperties(graph);
    return { smiles: props.isomericSmiles || props.smiles, title: mol.title };
  };
  const compounds = [];
  records.slice(0, reactantCount).forEach((record) => compounds.push(Object.assign(toSmiles(record), { role: 'reactant' })));
  const products = records.slice(reactantCount, reactantCount + productCount).map(toSmiles);
  records.slice(reactantCount + productCount, reactantCount + productCount + agentCount).forEach((record) => {
    const item = toSmiles(record);
    const guessed = reactionGuessRole({ smiles: item.smiles, fragment: smilesToFragment(item.smiles) }, compounds);
    compounds.push(Object.assign(item, { role: guessed === 'reactant' ? 'reagent' : guessed }));
  });
  return { compounds, products };
}

function rxioLooksLikeReaction(text) {
  const t = String(text || '').trim();
  return /^\$RXN/.test(t) || /^[^\s>]*>[^\s>]*>[^\s>]*(\s|$)/.test(t);
}
