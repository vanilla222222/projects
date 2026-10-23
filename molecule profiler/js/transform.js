'use strict';

const WRITE_ORGANIC = new Set(['B', 'C', 'N', 'O', 'P', 'S', 'F', 'Cl', 'Br', 'I']);

const WRITE_TWO_LETTER = new Set(['Cl', 'Br']);

function transformError(message) {
  const error = new Error(message);
  error.transform = true;
  return error;
}

function needsBracket(atom) {
  if (atom.chirality) return true;
  if (!WRITE_ORGANIC.has(atom.element)) return true;
  if (atom.charge) return true;
  if (atom.isotope) return true;
  if (atom.aromatic && atom.element !== 'C') return true;
  return false;
}

function hydrogenText(count) {
  if (!count) return '';
  return count === 1 ? 'H' : 'H' + count;
}

function chargeText(charge) {
  if (!charge) return '';
  const sign = charge > 0 ? '+' : '-';
  const size = Math.abs(charge);
  return size === 1 ? sign : sign + size;
}

function chiralTag(atom, emitted) {
  if (!atom.chirality || !atom.order) return '';
  if (!/^@@?$/.test(atom.chirality)) return '';
  const parity = permutationParity(atom.order, emitted);
  if (parity === null) return '';
  const flipped = parity ? (atom.chirality === '@' ? '@@' : '@') : atom.chirality;
  return flipped;
}

function permutationParity(reference, emitted) {
  if (reference.length !== emitted.length) return null;
  const target = emitted.slice();
  let swaps = 0;
  for (let i = 0; i < reference.length; i += 1) {
    if (target[i] === reference[i]) continue;
    const found = target.indexOf(reference[i], i + 1);
    if (found < 0) return null;
    target[found] = target[i];
    target[i] = reference[i];
    swaps += 1;
  }
  return swaps % 2;
}

function writeAtom(atom, count, emitted) {
  const symbol = atom.aromatic ? atom.element.toLowerCase() : atom.element;
  if (!needsBracket(atom)) return symbol;
  return '[' + (atom.isotope || '') + symbol + chiralTag(atom, emitted)
    + hydrogenText(count) + chargeText(atom.charge || 0) + ']';
}

function writeBond(bond, graph, from) {
  if (bond.aromatic) return '';
  if (bond.order === 2) return '=';
  if (bond.order === 3) return '#';
  if (bond.order === 4) return '$';
  // Direction is relative to the emitted traversal, including ring endpoints.
  if (bond.dir) return (bond.a === from ? bond.dir : -bond.dir) > 0 ? '/' : '\\';
  if (graph.atoms[bond.a].aromatic && graph.atoms[bond.b].aromatic) return '-';
  return '';
}

function writeSmiles(graph) {
  const size = graph.atoms.length;
  const links = graph.atoms.map(() => []);
  graph.bonds.forEach((bond, index) => {
    links[bond.a].push({ atom: bond.b, bond: index });
    links[bond.b].push({ atom: bond.a, bond: index });
  });
  graph.atoms.forEach((atom, index) => {
    atom.index = index;
    atom.neighbors = links[index];
  });

  const visited = new Array(size).fill(false);
  const spent = new Array(graph.bonds.length).fill(false);
  const nodes = new Array(size).fill(null);
  let label = 0;

  const count = (atom) => (
    typeof atom.totalH === 'number' ? atom.totalH : implicitHydrogens(graph, atom)
  );

  const walk = (id, parent) => {
    visited[id] = true;
    const node = {
      closures: [], children: [], head: [], ringOrder: [], childOrder: [], token: '', atom: id
    };
    nodes[id] = node;
    if (parent !== null) node.head.push(parent);
    if (count(graph.atoms[id])) node.head.push(null);
    links[id].forEach((link) => {
      if (spent[link.bond] || !visited[link.atom]) return;
      spent[link.bond] = true;
      label += 1;
      const tag = label < 10 ? String(label) : '%' + label;
      const symbol = writeBond(graph.bonds[link.bond], graph, id);
      node.closures.push(symbol + tag);
      node.ringOrder.push(link.atom);
      nodes[link.atom].closures.push(writeBond(graph.bonds[link.bond], graph, link.atom) + tag);
      nodes[link.atom].ringOrder.push(id);
    });
    links[id].forEach((link) => {
      if (spent[link.bond] || visited[link.atom]) return;
      spent[link.bond] = true;
      node.childOrder.push(link.atom);
      node.children.push({ bond: link.bond, node: walk(link.atom, id) });
    });
    return node;
  };

  const render = (node) => {
    let out = node.token + node.closures.join('');
    node.children.forEach((child, index) => {
      const text = writeBond(graph.bonds[child.bond], graph, node.atom) + render(child.node);
      out += index === node.children.length - 1 ? text : '(' + text + ')';
    });
    return out;
  };

  const roots = [];
  for (let id = 0; id < size; id += 1) {
    if (!visited[id]) roots.push(walk(id, null));
  }
  nodes.forEach((node) => {
    if (!node) return;
    const atom = graph.atoms[node.atom];
    const emitted = node.head.concat(node.ringOrder, node.childOrder);
    node.token = writeAtom(atom, count(atom), emitted);
  });
  return roots.map(render).join('.');
}

function hydrogenSpec(body) {
  const head = body.match(/^(\d*)(se|as|te|[A-Z][a-z]?|[a-z]|\*)/);
  if (!head) return null;
  let symbol = head[2];
  if (symbol.length === 2 && /[A-Z]/.test(symbol.charAt(0)) && !ELEMENT_SYMBOLS.has(symbol)) {
    symbol = symbol.charAt(0);
  }
  let rest = body.slice(head[1].length + symbol.length);
  const chiral = rest.match(/^@{1,2}(TH|AL|SP|TB|OH)?\d*/);
  if (chiral && chiral[0]) rest = rest.slice(chiral[0].length);
  const count = rest.match(/^H(\d+)?/);
  if (!count) return null;
  return count[1] ? Number(count[1]) : 1;
}

function bracketLabel(body) {
  let depth = 0;
  let cut = -1;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body.charAt(i);
    if (ch === '(' || ch === '[') depth += 1;
    else if (ch === ')' || ch === ']') depth -= 1;
    else if (ch === ':' && !depth && /\d/.test(body.charAt(i + 1) || '')) { cut = i; break; }
  }
  if (cut < 0) return { map: 0, body: body, h: hydrogenSpec(body) };
  const digits = body.slice(cut + 1).match(/^\d+/)[0];
  const clean = body.slice(0, cut) + body.slice(cut + 1 + digits.length);
  return { map: Number(digits), body: clean, h: hydrogenSpec(clean) };
}

function scanTemplate(text) {
  const atoms = [];
  let clean = '';
  let i = 0;
  while (i < text.length) {
    const ch = text.charAt(i);
    if (ch === '[') {
      let depth = 0;
      let k = i;
      for (; k < text.length; k += 1) {
        if (text.charAt(k) === '[') depth += 1;
        else if (text.charAt(k) === ']') { depth -= 1; if (!depth) break; }
      }
      if (depth) throw transformError('Unclosed bracket atom in "' + text + '"');
      const found = bracketLabel(text.slice(i + 1, k));
      atoms.push(found);
      clean += '[' + found.body + ']';
      i = k + 1;
      continue;
    }
    if (ch === '%') { clean += text.substr(i, 3); i += 3; continue; }
    if (/\d/.test(ch) || '()-=#$:~@/\\!&,;.'.indexOf(ch) >= 0) { clean += ch; i += 1; continue; }
    const two = text.substr(i, 2);
    if (WRITE_TWO_LETTER.has(two)) {
      atoms.push({ map: 0, body: two, h: null });
      clean += two;
      i += 2;
      continue;
    }
    if (/[A-Za-z*]/.test(ch)) {
      atoms.push({ map: 0, body: ch, h: null });
      clean += ch;
      i += 1;
      continue;
    }
    throw transformError('Cannot read "' + text + '" near position ' + i);
  }
  return { atoms: atoms, text: clean };
}

function parseTransform(smirks) {
  const halves = String(smirks).split('>>');
  if (halves.length !== 2) throw transformError('A transform needs exactly one ">>"');
  const left = scanTemplate(halves[0]);
  const right = scanTemplate(halves[1]);
  const query = compileSmarts(left.text);
  const product = parseSmiles(right.text);
  if (query.atoms.length !== left.atoms.length) {
    throw transformError('Reactant atom count disagrees with the map scan in "' + smirks + '"');
  }
  if (product.atoms.length !== right.atoms.length) {
    throw transformError('Product atom count disagrees with the map scan in "' + smirks + '"');
  }
  return {
    smirks: String(smirks),
    query: query,
    product: product,
    reactantMaps: left.atoms.map((atom) => atom.map),
    productAtoms: right.atoms
  };
}

const TRANSFORM_CACHE = new Map();

function compileTransform(smirks) {
  if (!TRANSFORM_CACHE.has(smirks)) TRANSFORM_CACHE.set(smirks, parseTransform(smirks));
  return TRANSFORM_CACHE.get(smirks);
}

function samePair(bond, a, b) {
  return (bond.a === a && bond.b === b) || (bond.a === b && bond.b === a);
}

function orderSum(bonds, id) {
  let total = 0;
  bonds.forEach((bond) => {
    if (bond.keep === false) return;
    if (bond.a === id || bond.b === id) total += bond.order;
  });
  return total;
}

function neighbourKey(bonds, id, live) {
  const out = [];
  bonds.forEach((bond) => {
    if (live && !bond.keep) return;
    if (bond.a === id) out.push(bond.b + '/' + bond.order);
    else if (bond.b === id) out.push(bond.a + '/' + bond.order);
  });
  return out.sort().join(',');
}
function unchangedCentre(mol, atoms, bonds, id) {
  if (atoms[id].element !== mol.atoms[id].element) return false;
  if (atoms[id].totalH !== mol.atoms[id].totalH) return false;
  return neighbourKey(bonds, id, true) === neighbourKey(mol.bonds, id, false);
}
function runTransform(mol, tf, match) {
  const atoms = mol.atoms.map((atom) => ({
    element: atom.element,
    aromatic: !!atom.aromatic,
    charge: atom.charge || 0,
    isotope: atom.isotope || null,
    totalH: atom.totalH,
    chirality: atom.chirality || null,
    order: Array.isArray(atom.order) ? atom.order.slice() : null,
    keep: true,
    template: false
  }));
  const bonds = mol.bonds.map((bond) => ({
    a: bond.a, b: bond.b, order: bond.order, aromatic: !!bond.aromatic, keep: true
  }));

  const productMaps = new Set();
  tf.productAtoms.forEach((atom) => { if (atom.map) productMaps.add(atom.map); });

  const mapped = new Map();
  const touched = [];
  tf.reactantMaps.forEach((label, qi) => {
    const id = match[qi];
    touched.push(id);
    if (!label) { atoms[id].keep = false; return; }
    if (!productMaps.has(label)) { atoms[id].keep = false; return; }
    mapped.set(label, id);
  });

  const before = new Map();
  mapped.forEach((id) => { before.set(id, orderSum(bonds, id)); });

  bonds.forEach((bond) => {
    if (!atoms[bond.a].keep || !atoms[bond.b].keep) bond.keep = false;
  });

  const productBonds = new Set();
  tf.product.bonds.forEach((bond) => {
    const a = tf.productAtoms[bond.a].map;
    const b = tf.productAtoms[bond.b].map;
    if (a && b) productBonds.add(a < b ? a + ':' + b : b + ':' + a);
  });
  tf.query.bonds.forEach((bond) => {
    const a = tf.reactantMaps[bond.a];
    const b = tf.reactantMaps[bond.b];
    if (!a || !b || !mapped.has(a) || !mapped.has(b)) return;
    if (productBonds.has(a < b ? a + ':' + b : b + ':' + a)) return;
    const live = bonds.find((item) => item.keep && samePair(item, mapped.get(a), mapped.get(b)));
    if (live) live.keep = false;
  });

  const ids = new Array(tf.productAtoms.length).fill(-1);
  tf.productAtoms.forEach((spec, pj) => {
    const raw = tf.product.atoms[pj];
    if (spec.map && mapped.has(spec.map)) {
      const id = mapped.get(spec.map);
      ids[pj] = id;
      const atom = atoms[id];
      atom.template = true;
      if (raw.element !== '*') {
        atom.element = raw.element;
        atom.aromatic = !!raw.aromatic;
      }
      atom.charge = raw.charge || 0;
      if (raw.isotope) atom.isotope = raw.isotope;
      return;
    }
    atoms.push({
      element: raw.element,
      aromatic: !!raw.aromatic,
      charge: raw.charge || 0,
      isotope: raw.isotope || null,
      totalH: spec.h === null ? null : spec.h,
      keep: true,
      template: true
    });
    ids[pj] = atoms.length - 1;
  });

  tf.product.bonds.forEach((bond) => {
    const a = ids[bond.a];
    const b = ids[bond.b];
    const live = bonds.find((item) => item.keep && samePair(item, a, b));
    if (live) {
      live.order = bond.order;
      live.aromatic = !!bond.aromatic;
      return;
    }
    bonds.push({ a: a, b: b, order: bond.order, aromatic: !!bond.aromatic, keep: true });
  });

  tf.productAtoms.forEach((spec, pj) => {
    if (!spec.map || !mapped.has(spec.map)) return;
    const atom = atoms[ids[pj]];
    if (spec.h !== null) { atom.totalH = spec.h; return; }
    if (!needsBracket(atom)) { atom.totalH = null; return; }
    const shift = orderSum(bonds, ids[pj]) - before.get(ids[pj]);
    atom.totalH = Math.max(0, (atom.totalH || 0) - shift);
  });

  atoms.forEach((atom, id) => {
    if (!atom.keep || atom.template || id >= mol.atoms.length) return;
    if (!needsBracket(atom)) atom.totalH = null;
    else if (orderSum(bonds, id) !== orderSum(mol.bonds, id)) atom.totalH = null;
  });

  atoms.forEach((atom, id) => {
    if (!atom.keep || !atom.chirality) return;
    if (id >= mol.atoms.length || !unchangedCentre(mol, atoms, bonds, id)) {
      atom.chirality = null;
      atom.order = null;
    }
  });

  return assemble(atoms, bonds, touched);
}

function assemble(atoms, bonds, touched) {
  const live = bonds.filter((bond) => bond.keep && atoms[bond.a].keep && atoms[bond.b].keep);
  const links = atoms.map(() => []);
  live.forEach((bond) => {
    links[bond.a].push(bond.b);
    links[bond.b].push(bond.a);
  });
  const group = new Array(atoms.length).fill(-1);
  let groups = 0;
  atoms.forEach((atom, id) => {
    if (!atom.keep || group[id] >= 0) return;
    const stack = [id];
    group[id] = groups;
    while (stack.length) {
      const current = stack.pop();
      links[current].forEach((next) => {
        if (group[next] >= 0) return;
        group[next] = groups;
        stack.push(next);
      });
    }
    groups += 1;
  });
  const anchored = new Set();
  atoms.forEach((atom, id) => { if (atom.keep && atom.template) anchored.add(group[id]); });

  const index = new Map();
  const kept = [];
  atoms.forEach((atom, id) => {
    if (!atom.keep || !anchored.has(group[id])) return;
    index.set(id, kept.length);
    kept.push(atom);
  });
  if (!kept.length) return null;
  kept.forEach((atom) => {
    if (!atom.chirality || !atom.order) return;
    const moved = [];
    let lost = false;
    atom.order.forEach((slot) => {
      if (slot === null) { moved.push(null); return; }
      if (typeof slot !== 'number' || !index.has(slot)) { lost = true; return; }
      moved.push(index.get(slot));
    });
    if (lost) {
      atom.chirality = null;
      atom.order = null;
      return;
    }
    atom.order = moved;
  });
  const edges = [];
  live.forEach((bond) => {
    if (!index.has(bond.a) || !index.has(bond.b)) return;
    edges.push({ a: index.get(bond.a), b: index.get(bond.b), order: bond.order, aromatic: bond.aromatic });
  });
  const smiles = writeSmiles({ atoms: kept, bonds: edges });
  return { smiles: smiles, fragments: smiles.split('.'), touched: touched };
}

function applyTransform(mol, smirks, diagnostics) {
  const tf = compileTransform(smirks);
  const found = smartsMatches(tf.query, mol, { mapping: true });
  if(diagnostics){diagnostics.matches=found.length;diagnostics.rejected=0;}
  const products = [];
  const seen = new Set();
  found.forEach((match) => {
    let result = null;
    try { result = runTransform(mol, tf, match); } catch (error) { result = null;if(diagnostics)diagnostics.rejected++; }
    if (!result || seen.has(result.smiles)) return;
    seen.add(result.smiles);
    products.push(result);
  });
  return products;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    writeSmiles, parseTransform, compileTransform, applyTransform, runTransform, needsBracket
  };
}
