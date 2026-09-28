const MOLFILE_SETTINGS = {
  bondLength: 1.5,
};

const MOLFILE_CHARGE_CODES = { 1: 3, 2: 2, 3: 1, '-1': 5, '-2': 6, '-3': 7 };
const MOLFILE_CODE_CHARGES = { 1: 3, 2: 2, 3: 1, 5: -1, 6: -2, 7: -3 };
const MOLFILE_STEREO_CODES = { wedge: 1, hash: 6 };

class MolfileError extends Error {}

function molfilePad(value, width) {
  return String(value).padStart(width, ' ');
}

function molfileCoordinate(value) {
  return molfilePad((Math.abs(value) < 5e-5 ? 0 : value).toFixed(4), 10);
}

function molfilePropertyLines(tag, pairs) {
  const lines = [];
  for (let i = 0; i < pairs.length; i += 8) {
    const chunk = pairs.slice(i, i + 8);
    lines.push('M  ' + tag + molfilePad(chunk.length, 3) + chunk.map((pair) => ' ' + molfilePad(pair[0], 3) + ' ' + molfilePad(pair[1], 3)).join(''));
  }
  return lines;
}

function graphToMolfile(graph, atomIds, title) {
  const ids = new Set(atomIds || graph.atoms.map((atom) => atom.id));
  const atoms = graph.atoms.filter((atom) => ids.has(atom.id));
  const bonds = graph.bonds.filter((bond) => ids.has(bond.atomA) && ids.has(bond.atomB));
  if (atoms.length > 999 || bonds.length > 999) {
    throw new MolfileError('MOL V2000 files hold at most 999 atoms and 999 bonds');
  }
  const index = new Map(atoms.map((atom, i) => [atom.id, i + 1]));
  const scale = MOLFILE_SETTINGS.bondLength / LAYOUT_SETTINGS.bondLength;
  const cx = atoms.reduce((sum, atom) => sum + atom.x, 0) / (atoms.length || 1);
  const cy = atoms.reduce((sum, atom) => sum + atom.y, 0) / (atoms.length || 1);
  const charges = [];
  const isotopes = [];
  const lines = [
    String(title || '').replace(/[\r\n]+/g, ' ').slice(0, 80),
    '  ChemGraph          2D',
    '',
    molfilePad(atoms.length, 3) + molfilePad(bonds.length, 3) + '  0  0  0  0  0  0  0  0999 V2000',
  ];
  atoms.forEach((atom, i) => {
    const charge = atom.charge || 0;
    if (charge) {
      charges.push([i + 1, charge]);
    }
    if (atom.element === 'D') {
      isotopes.push([i + 1, 2]);
    }
    const symbol = atom.element === 'D' ? 'H' : atom.element;
    lines.push(molfileCoordinate((atom.x - cx) * scale) + molfileCoordinate(-(atom.y - cy) * scale) + molfileCoordinate(0) +
      ' ' + symbol.padEnd(3, ' ') + ' 0' + molfilePad(MOLFILE_CHARGE_CODES[charge] || 0, 3) + '  0  0  0  0  0  0  0  0  0  0');
  });
  bonds.forEach((bond) => {
    lines.push(molfilePad(index.get(bond.atomA), 3) + molfilePad(index.get(bond.atomB), 3) + molfilePad(bond.order, 3) +
      molfilePad(bond.order === 1 ? MOLFILE_STEREO_CODES[bond.stereo] || 0 : 0, 3) + '  0  0  0');
  });
  return lines.concat(molfilePropertyLines('CHG', charges), molfilePropertyLines('ISO', isotopes), ['M  END']).join('\n') + '\n';
}

function graphToSdf(graph, records) {
  return records.map((record) => graphToMolfile(graph, record.atomIds, record.title) +
    (record.title ? '>  <NAME>\n' + record.title.replace(/[\r\n]+/g, ' ') + '\n\n' : '') + '$$$$\n').join('');
}

function looksLikeMolfile(text) {
  const t = String(text || '');
  return /\r?\n/.test(t) && /^.{20,}V[23]000\s*$/m.test(t);
}

function molfileSplitRecords(text) {
  return String(text).replace(/\r\n?/g, '\n').split(/^\$\$\$\$[^\n]*$/m).filter((chunk) => /V[23]000/.test(chunk));
}

function molfileInteger(line, start, width) {
  const value = parseInt(line.substr(start, width), 10);
  return Number.isFinite(value) ? value : 0;
}

function parseMolRecord(record) {
  const lines = record.split('\n');
  const countsIndex = lines.findIndex((line) => /V[23]000\s*$/.test(line));
  if (countsIndex < 0) {
    throw new MolfileError('No counts line found');
  }
  const counts = lines[countsIndex];
  if (/V3000/.test(counts)) {
    throw new MolfileError('MOL V3000 files are not supported — save as V2000');
  }
  const title = countsIndex >= 3 ? lines[countsIndex - 3].trim() : '';
  const atomCount = molfileInteger(counts, 0, 3);
  const bondCount = molfileInteger(counts, 3, 3);
  if (lines.length < countsIndex + 1 + atomCount + bondCount) {
    throw new MolfileError('The file ends before all atoms and bonds are listed');
  }
  const atoms = [];
  for (let i = 0; i < atomCount; i += 1) {
    const line = lines[countsIndex + 1 + i];
    const x = parseFloat(line.substr(0, 10));
    const y = parseFloat(line.substr(10, 10));
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new MolfileError('Unreadable coordinates on atom ' + (i + 1));
    }
    atoms.push({
      x,
      y,
      symbol: line.substr(31, 3).trim(),
      charge: MOLFILE_CODE_CHARGES[molfileInteger(line, 36, 3)] || 0,
      mass: 0,
    });
  }
  const bonds = [];
  for (let i = 0; i < bondCount; i += 1) {
    const line = lines[countsIndex + 1 + atomCount + i];
    bonds.push({
      a: molfileInteger(line, 0, 3) - 1,
      b: molfileInteger(line, 3, 3) - 1,
      order: molfileInteger(line, 6, 3),
      stereo: molfileInteger(line, 9, 3),
    });
  }
  let chargeReset = false;
  for (let i = countsIndex + 1 + atomCount + bondCount; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^M {2}END/.test(line)) {
      break;
    }
    const match = /^M {2}(CHG|ISO)/.exec(line);
    if (!match) {
      continue;
    }
    if (match[1] === 'CHG' && !chargeReset) {
      atoms.forEach((atom) => {
        atom.charge = 0;
      });
      chargeReset = true;
    }
    const n = molfileInteger(line, 6, 3);
    for (let k = 0; k < n; k += 1) {
      const atom = atoms[molfileInteger(line, 9 + k * 8, 4) - 1];
      const value = molfileInteger(line, 13 + k * 8, 4);
      if (atom) {
        atom[match[1] === 'CHG' ? 'charge' : 'mass'] = value;
      }
    }
  }
  return { title, atoms, bonds };
}

function molRecordToGraph(mol) {
  const graph = new Graph();
  const ids = [];
  mol.atoms.forEach((atom, index) => {
    let element = atom.symbol;
    if (element === 'H' && atom.mass === 2) {
      element = 'D';
    }
    if (element === 'H') {
      const partners = mol.bonds.filter((bond) => bond.a === index || bond.b === index).map((bond) => mol.atoms[bond.a === index ? bond.b : bond.a]);
      if (!atom.charge && partners.length === 1 && partners[0] && partners[0].symbol !== 'H') {
        ids.push(null);
        return;
      }
    }
    if (!Object.prototype.hasOwnProperty.call(MAX_VALENCE, element)) {
      throw new MolfileError('Element ' + (element || '?') + ' is not supported by the editor');
    }
    const created = graph.addAtom(element, atom.x, atom.y);
    if (atom.charge) {
      created.charge = atom.charge;
    }
    ids.push(created.id);
  });
  const scaleSamples = [];
  mol.bonds.forEach((bond) => {
    if (!mol.atoms[bond.a] || !mol.atoms[bond.b]) {
      throw new MolfileError('A bond refers to a missing atom');
    }
    const a = ids[bond.a];
    const b = ids[bond.b];
    if (a === null || b === null) {
      return;
    }
    if (bond.order < 1 || bond.order > 3) {
      throw new MolfileError(bond.order === 4 ? 'Aromatic bond type 4 is not supported — save a Kekulé structure' : 'Unsupported bond type ' + bond.order);
    }
    const created = graph.addBond(a, b);
    if (!created) {
      return;
    }
    created.order = bond.order;
    if (bond.order === 1 && (bond.stereo === 1 || bond.stereo === 6)) {
      created.stereo = bond.stereo === 1 ? 'wedge' : 'hash';
    }
    scaleSamples.push(Math.hypot(mol.atoms[bond.a].x - mol.atoms[bond.b].x, mol.atoms[bond.a].y - mol.atoms[bond.b].y));
  });
  if (graph.atoms.length === 0) {
    throw new MolfileError('No drawable atoms');
  }
  scaleSamples.sort((p, q) => p - q);
  const median = scaleSamples.length ? scaleSamples[Math.floor(scaleSamples.length / 2)] : 0;
  const flat = graph.atoms.every((atom) => atom.x === graph.atoms[0].x && atom.y === graph.atoms[0].y);
  if (flat || median < 1e-6) {
    if (graph.atoms.length > 1) {
      computeLayout(graph, graph.atoms.map((atom) => atom.id)).forEach((p, id) => {
        const atom = graph.getAtom(id);
        atom.x = p.x;
        atom.y = p.y;
      });
    }
  } else {
    const scale = LAYOUT_SETTINGS.bondLength / median;
    graph.atoms.forEach((atom) => {
      atom.x *= scale;
      atom.y *= -scale;
    });
  }
  graph.chargeRepairs = fixAllValenceProblems(graph, true);
  try {
    smilesValidateGraph(graph);
  } catch (error) {
    throw new MolfileError(error.message);
  }
  return graph;
}

function molfileToFragment(text) {
  const records = molfileSplitRecords(text);
  if (records.length === 0) {
    throw new MolfileError('Not a MOL or SDF file');
  }
  const fragment = { format: 'chemical-graph-fragment', atoms: [], bonds: [], titles: [], chargeRepairs: 0 };
  let nextId = 1;
  let offsetX = 0;
  records.forEach((record) => {
    const mol = parseMolRecord(record);
    const graph = molRecordToGraph(mol);
    fragment.chargeRepairs += graph.chargeRepairs;
    const minX = Math.min.apply(null, graph.atoms.map((atom) => atom.x));
    const maxX = Math.max.apply(null, graph.atoms.map((atom) => atom.x));
    const minY = Math.min.apply(null, graph.atoms.map((atom) => atom.y));
    const maxY = Math.max.apply(null, graph.atoms.map((atom) => atom.y));
    const shift = offsetX - minX;
    const map = new Map();
    graph.atoms.forEach((atom) => {
      map.set(atom.id, nextId);
      const entry = { id: nextId, element: atom.element, x: atom.x + shift, y: atom.y - (minY + maxY) / 2 };
      if (atom.charge) {
        entry.charge = atom.charge;
      }
      fragment.atoms.push(entry);
      nextId += 1;
    });
    graph.bonds.forEach((bond) => {
      fragment.bonds.push({ atomA: map.get(bond.atomA), atomB: map.get(bond.atomB), order: bond.order, stereo: bond.stereo || null });
    });
    fragment.titles.push(mol.title);
    offsetX += maxX - minX + LAYOUT_SETTINGS.bondLength * 3;
  });
  return fragment;
}
