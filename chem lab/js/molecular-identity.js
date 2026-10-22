// Exact, bounded colored-graph identity for the editor's supported chemistry.
// This is an internal identity key, not an InChI or a canonical-SMILES claim.
// Individualization/refinement compares full adjacency encodings; a search
// limit raises an error instead of falling back to a potentially colliding hash.
const MOLECULE_IDENTITY_LIMITS = Object.freeze({ atoms: 180, states: 20000 });

function moleculeIdentityGraph(input) {
  const source = typeof input === 'string' ? smilesToFragment(input) : input;
  if (!source || !Array.isArray(source.atoms) || !Array.isArray(source.bonds) || !source.atoms.length) {
    throw new Error('A molecular identity requires a nonempty structure.');
  }
  if (source.atoms.length > MOLECULE_IDENTITY_LIMITS.atoms) throw new Error('Structure exceeds the molecular identity size limit.');
  const graph = new Graph();
  const map = new Map();
  source.atoms.forEach((atom) => {
    if (map.has(atom.id)) throw new Error('Duplicate atom identifier in molecular identity.');
    const copy = graph.addAtom(atom.element, atom.x || 0, atom.y || 0);
    Object.assign(copy, atom, { id: copy.id });
    map.set(atom.id, copy.id);
  });
  source.bonds.forEach((bond) => {
    const copy = graph.addBond(map.get(bond.atomA), map.get(bond.atomB));
    if (!copy || ![1, 2, 3].includes(bond.order)) throw new Error('Invalid molecular identity bond.');
    Object.assign(copy, bond, { id: copy.id, atomA: copy.atomA, atomB: copy.atomB });
  });
  return graph;
}

function moleculeCanonicalComponent(labels, edges, budget) {
  const n = labels.length;
  const compress = (values) => {
    const sorted = Array.from(new Set(values)).sort();
    const rank = new Map(sorted.map((value, i) => [value, i]));
    return values.map((value) => rank.get(value));
  };
  const refine = (initial) => {
    let colors = initial;
    while (true) {
      const signatures = colors.map((color, i) => JSON.stringify([color, edges[i].map((edge, j) => edge ? [edge, colors[j]] : null).filter(Boolean).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))]));
      const next = compress(signatures);
      if (new Set(next).size === new Set(colors).size) return next;
      colors = next;
    }
  };
  const encode = (colors) => {
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => colors[a] - colors[b]);
    const bonds = [];
    order.forEach((a, i) => order.slice(i + 1).forEach((b, k) => { if (edges[a][b]) bonds.push([i, i + k + 1, edges[a][b]]); }));
    return JSON.stringify([order.map((i) => labels[i]), bonds]);
  };
  const visit = (seed) => {
    if (++budget.states > MOLECULE_IDENTITY_LIMITS.states) throw new Error('Molecular identity symmetry limit exceeded; simplify the structure.');
    const colors = refine(seed);
    const cells = new Map();
    colors.forEach((color, i) => { if (!cells.has(color)) cells.set(color, []); cells.get(color).push(i); });
    const cell = Array.from(cells.entries()).filter((entry) => entry[1].length > 1).sort((a, b) => a[1].length - b[1].length || a[0] - b[0])[0];
    if (!cell) return encode(colors);
    let best = null;
    const tried = [];
    for (const vertex of cell[1]) {
      // Exact twin vertices are interchangeable under an automorphism.
      if (tried.some((other) => labels[vertex] === labels[other] && edges[vertex].every((edge, j) => j === vertex || j === other || edge === edges[other][j]))) continue;
      tried.push(vertex);
      const individualized = colors.slice();
      individualized[vertex] = Math.max(...colors) + 1;
      const code = visit(individualized);
      if (best === null || code < best) best = code;
    }
    return best;
  };
  return visit(compress(labels));
}

function moleculeIdentity(input) {
  const graph = moleculeIdentityGraph(input);
  const ids = graph.atoms.map((atom) => atom.id);
  const ctx = propContext(graph, ids);
  const tetrahedral = new Map(findStereocenters(graph, ids).map((entry) => [entry.atomId, entry.type]));
  const doubleBonds = new Map(findStereoDoubleBonds(graph, ids).filter((entry) => graph.getBondById(entry.bondId).stereoSpecified !== false).map((entry) => [entry.bondId, entry.type]));
  const components = graph.connectedComponents();
  const canonical = (stereo) => {
    const budget = { states: 0 };
    return components.map((component) => {
      const members = component.atomIds;
      const positions = new Map(members.map((id, i) => [id, i]));
      const labels = members.map((id) => {
        const atom = graph.getAtom(id);
        return JSON.stringify([atom.element === 'D' ? 'H' : atom.element, atom.element === 'D' ? 2 : atom.isotope || 0, atom.charge || 0, ctx.hydrogens.get(id), ctx.isAromatic(id) ? 1 : 0, stereo ? tetrahedral.get(id) || '' : '']);
      });
      const edges = members.map(() => members.map(() => ''));
      graph.bonds.forEach((bond) => {
        if (!positions.has(bond.atomA) || !positions.has(bond.atomB)) return;
        const aromatic = ctx.isAromatic(bond.atomA) && ctx.isAromatic(bond.atomB) && ctx.isRingBond(bond.atomA, bond.atomB);
        const label = (aromatic ? 'a' : String(bond.order)) + (stereo ? doubleBonds.get(bond.id) || '' : '');
        const a = positions.get(bond.atomA), b = positions.get(bond.atomB);
        edges[a][b] = label; edges[b][a] = label;
      });
      return moleculeCanonicalComponent(labels, edges, budget);
    }).sort().join('|');
  };
  return {
    key: 'mol-v1:' + canonical(true),
    connectivityKey: 'mol-v1:' + canonical(false),
    smiles: propSmiles(ctx),
    isomericSmiles: propSmiles(ctx, { isomeric: true }),
  };
}

function moleculeSame(a, b, options) {
  const left = moleculeIdentity(a), right = moleculeIdentity(b);
  return options && options.stereo === false ? left.connectivityKey === right.connectivityKey : left.key === right.key;
}
