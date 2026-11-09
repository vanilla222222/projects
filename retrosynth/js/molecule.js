'use strict';
// The molecular graph.
//
// chem lab's graph is {id, element, x, y} and {id, atomA, atomB, order}, with
// charge bolted on from outside and coordinates baked in. Coordinates belong to
// a drawing, not to a molecule, and a model that cannot hold a charge natively
// cannot hold an enolate, a quaternary ammonium or a borohydride. This one
// carries what the chemistry needs and nothing about how it is drawn.

const MOL_ELEMENTS = (typeof require === 'function' && typeof module !== 'undefined')
  ? require('./elements.js')
  : (typeof RETRO !== 'undefined' ? RETRO.elements : null);

class Molecule {
  constructor() {
    this.atoms = [];
    this.bonds = [];
    this._adj = null;      // atom index -> [{bond, other}], rebuilt lazily
    this._rings = null;
  }

  // --- building ----------------------------------------------------------
  invertSubstitution(center, leaving, incoming) {
    const atom = this.atoms[center];
    if (!atom.chiral || !atom.chiralNbrs?.includes(leaving)) return false;
    atom.chiralNbrs = atom.chiralNbrs.map(neighbor => neighbor === leaving ? incoming : neighbor);
    atom.chiral = atom.chiral === '@' ? '@@' : '@';
    return true;
  }

  addAtom(element, options) {
    const o = options || {};
    const atom = {
      index: this.atoms.length,
      el: element,
      charge: o.charge || 0,
      iso: o.iso || 0,
      arom: !!o.arom,
      // Hydrogens written explicitly in brackets. -1 means "work it out".
      hs: o.hs === undefined ? -1 : o.hs,
      map: o.map || 0,
      // '@' or '@@' as parsed. The tag only means anything together with the
      // order the neighbours were written in, because it says "looking from
      // the first one, the rest run clockwise or anticlockwise". Reordering
      // the neighbours without flipping the tag quietly inverts the centre,
      // which is how 63% of chiral molecules came back as their own mirror
      // image before this was recorded.
      chiral: o.chiral || null,
      // Where the implicit hydrogen sits in that order: 0 when the atom opens
      // the string, 1 when something precedes it.
      hPos: o.hPos === undefined ? 0 : o.hPos,
      // The neighbour indices, in the order the tag is expressed against,
      // with -1 for the implicit hydrogen. Held explicitly rather than
      // recovered from bond order, because bond order changes whenever atoms
      // are renumbered and the tag would then silently mean the mirror image.
      chiralNbrs: o.chiralNbrs ? o.chiralNbrs.slice() : null,
      nbrOrder: [],
    };
    this.atoms.push(atom);
    this._dirty();
    return atom;
  }

  addBond(a, b, order, options) {
    if (a === b) return null;
    const existing = this.bondBetween(a, b);
    if (existing) return existing;
    const o = options || {};
    const bond = {
      index: this.bonds.length,
      a, b,
      order: order === undefined ? 1 : order,
      arom: !!o.arom,
      dir: o.dir || 0,       // +1 for '/', -1 for '\', 0 otherwise
    };
    this.bonds.push(bond);
    this.atoms[a].nbrOrder.push(b);
    this.atoms[b].nbrOrder.push(a);
    this._dirty();
    return bond;
  }

  _dirty() { this._adj = null; this._rings = null; }

  // --- reading -----------------------------------------------------------
  get adjacency() {
    if (this._adj) return this._adj;
    const adj = this.atoms.map(() => []);
    for (const bond of this.bonds) {
      adj[bond.a].push({ bond, other: bond.b });
      adj[bond.b].push({ bond, other: bond.a });
    }
    this._adj = adj;
    return adj;
  }

  neighbours(index) { return this.adjacency[index]; }
  degree(index) { return this.adjacency[index].length; }

  bondBetween(a, b) {
    for (const link of this.adjacency[a] || []) {
      if (link.other === b) return link.bond;
    }
    return null;
  }

  // Bond orders summed, counting an aromatic bond as 1 plus the ring's share.
  // Kekulised molecules do not need the adjustment; aromatic-flagged ones do,
  // and the implicit-hydrogen rule in elements.js expects it that way.
  bondOrderSum(index) {
    let sum = 0;
    for (const link of this.adjacency[index]) {
      sum += link.bond.arom ? 1 : link.bond.order;
    }
    return sum;
  }

  hydrogens(index) {
    const atom = this.atoms[index];
    if (atom.hs >= 0) return atom.hs;
    if (!MOL_ELEMENTS) return 0;
    return MOL_ELEMENTS.implicitHydrogens(
      atom.el, atom.charge, this.bondOrderSum(index), atom.arom);
  }

  heavyAtomCount() { return this.atoms.length; }

  formula() {
    const counts = new Map();
    let hydrogens = 0;
    for (let i = 0; i < this.atoms.length; i += 1) {
      const el = this.atoms[i].el;
      counts.set(el, (counts.get(el) || 0) + 1);
      hydrogens += this.hydrogens(i);
    }
    if (hydrogens) counts.set('H', (counts.get('H') || 0) + hydrogens);
    // Hill order: carbon, then hydrogen, then everything alphabetically.
    const keys = [...counts.keys()].sort();
    const order = [];
    if (counts.has('C')) order.push('C');
    if (counts.has('H')) order.push('H');
    for (const key of keys) if (key !== 'C' && key !== 'H') order.push(key);
    return order.map((el) => el + (counts.get(el) > 1 ? counts.get(el) : '')).join('');
  }

  mass() {
    if (!MOL_ELEMENTS) return 0;
    let total = 0;
    for (let i = 0; i < this.atoms.length; i += 1) {
      total += MOL_ELEMENTS.massOf(this.atoms[i].el)
        + this.hydrogens(i) * MOL_ELEMENTS.massOf('H');
    }
    return total;
  }

  // --- pieces -------------------------------------------------------------
  // Connected components, as their own molecules. A reaction routinely makes
  // two things at once, and a precursor set is several molecules in one graph.
  components() {
    const seen = new Int8Array(this.atoms.length);
    const out = [];
    for (let start = 0; start < this.atoms.length; start += 1) {
      if (seen[start]) continue;
      const group = [];
      const stack = [start];
      seen[start] = 1;
      while (stack.length) {
        const at = stack.pop();
        group.push(at);
        for (const link of this.adjacency[at]) {
          if (!seen[link.other]) { seen[link.other] = 1; stack.push(link.other); }
        }
      }
      out.push(this.subgraph(group.sort((x, y) => x - y)));
    }
    return out;
  }

  subgraph(indices) {
    const keep = new Map();
    const out = new Molecule();
    for (const index of indices) {
      const atom = this.atoms[index];
      keep.set(index, out.addAtom(atom.el, atom).index);
    }
    for (const bond of this.bonds) {
      if (keep.has(bond.a) && keep.has(bond.b)) {
        out.addBond(keep.get(bond.a), keep.get(bond.b), bond.order, bond);
      }
    }
    // Chirality references neighbours by index, so it has to be renumbered
    // with everything else. A centre whose neighbours left the subgraph has
    // no meaningful tag any more and loses it.
    for (const index of indices) {
      const source = this.atoms[index];
      const copy = out.atoms[keep.get(index)];
      if (!source.chiralNbrs) { copy.chiralNbrs = null; continue; }
      const mapped = source.chiralNbrs.map((n) => (n === -1 ? -1 : (keep.has(n) ? keep.get(n) : null)));
      if (mapped.some((n) => n === null)) { copy.chiralNbrs = null; copy.chiral = null; }
      else copy.chiralNbrs = mapped;
    }
    return out;
  }

  clone() { return this.subgraph(this.atoms.map((_, i) => i)); }

  // --- rings --------------------------------------------------------------
  // A cycle basis, found by spanning tree plus one cycle per non-tree edge.
  // Not a smallest-set-of-smallest-rings, which is both expensive and famously
  // ill-defined; for deciding "is this bond in a ring" and "how big", a basis
  // is what the transforms actually ask for.
  rings() {
    if (this._rings) return this._rings;
    const parent = new Int32Array(this.atoms.length).fill(-1);
    const depth = new Int32Array(this.atoms.length).fill(-1);
    const treeBond = new Int32Array(this.atoms.length).fill(-1);
    const found = [];
    for (let root = 0; root < this.atoms.length; root += 1) {
      if (depth[root] !== -1) continue;
      depth[root] = 0;
      const queue = [root];
      const inTree = new Set();
      while (queue.length) {
        const at = queue.shift();
        for (const link of this.adjacency[at]) {
          if (depth[link.other] === -1) {
            depth[link.other] = depth[at] + 1;
            parent[link.other] = at;
            treeBond[link.other] = link.bond.index;
            inTree.add(link.bond.index);
            queue.push(link.other);
          } else if (!inTree.has(link.bond.index)) {
            inTree.add(link.bond.index);
            // Walk both ends up to their meeting point.
            let x = at;
            let y = link.other;
            const left = [x];
            const right = [y];
            while (depth[x] > depth[y]) { x = parent[x]; left.push(x); }
            while (depth[y] > depth[x]) { y = parent[y]; right.push(y); }
            while (x !== y) { x = parent[x]; left.push(x); y = parent[y]; right.push(y); }
            right.pop();
            found.push(left.concat(right.reverse()));
          }
        }
      }
    }
    this._rings = found;
    return found;
  }

  ringMembership() {
    const inRing = new Int8Array(this.atoms.length);
    for (const ring of this.rings()) for (const at of ring) inRing[at] = 1;
    return inRing;
  }

  bondInRing(bond) {
    for (const ring of this.rings()) {
      for (let i = 0; i < ring.length; i += 1) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        if ((a === bond.a && b === bond.b) || (a === bond.b && b === bond.a)) return true;
      }
    }
    return false;
  }

  // Constitutional symmetry classes: the refinement above, stopped before the
  // tie-breaking that forces a total order. Two atoms share a class when the
  // graph cannot tell them apart.
  //
  // This is what says whether a stereocentre is real. An atom carrying @ whose
  // neighbours are not all in different classes has no stereochemistry to
  // record - the 1 and 4 positions of a cyclohexane reach each other by two
  // identical CH2CH2 paths, so a tag there means nothing and is free to flip
  // whichever way the string happens to be written. Left in place, those tags
  // made the writer oscillate between two equally correct spellings forever,
  // which breaks every comparison built on string identity.
  symmetryClasses() {
    const n = this.atoms.length;
    if (!n) return [];
    const invariant = (i) => {
      const atom = this.atoms[i];
      return [this.degree(i), this.bondOrderSum(i), atom.el,
        atom.charge, this.hydrogens(i), atom.arom ? 1 : 0, atom.iso].join('|');
    };
    let ranks = rankOf(this.atoms.map((_, i) => invariant(i)));
    for (let pass = 0; pass < n + 2; pass += 1) {
      const keys = this.atoms.map((_, i) => {
        const around = this.adjacency[i]
          .map((link) => (link.bond.arom ? 1.5 : link.bond.order) + ':' + ranks[link.other])
          .sort();
        return ranks[i] + '>' + around.join(',');
      });
      const next = rankOf(keys);
      if (samePartition(ranks, next)) break;
      ranks = next;
    }
    return ranks;
  }

  // Drop chirality tags that describe nothing, so two spellings of the same
  // compound cannot differ by one.
  dropFalseStereocentres() {
    const classes = this.symmetryClasses();
    for (let i = 0; i < this.atoms.length; i += 1) {
      const atom = this.atoms[i];
      if (!atom.chiral) continue;
      const seen = new Set();
      let duplicate = false;
      for (const link of this.adjacency[i]) {
        if (seen.has(classes[link.other])) { duplicate = true; break; }
        seen.add(classes[link.other]);
      }
      if (duplicate) { atom.chiral = null; atom.chiralNbrs = null; }
    }
    return this;
  }

  // --- aromaticity ----------------------------------------------------
  // Perceived, not trusted. A molecule can arrive written either way -
  // c1ccccc1 or C1=CC=CC=C1 - and unless both end up in the same
  // representation they compare as different compounds, which would make the
  // search treat benzene and benzene as two separate problems.
  //
  // Deliberately conservative: rings of five to seven atoms, every atom flat,
  // and a Huckel count of 4n+2. Anything it is unsure about is left alone,
  // because wrongly calling a ring aromatic produces SMILES that other
  // toolkits refuse to read.
  perceiveAromaticity() {
    const contribution = (index, ring) => {
      const atom = this.atoms[index];
      const inRing = new Set(ring);
      let doubleInRing = false;
      let doubleOutOfRing = null;
      for (const link of this.adjacency[index]) {
        if (link.bond.order === 2 || link.bond.arom) {
          if (inRing.has(link.other)) doubleInRing = true;
          else doubleOutOfRing = this.atoms[link.other].el;
        }
        if (link.bond.order === 3) return null;   // never flat enough
      }
      if (doubleInRing) return 1;
      if (doubleOutOfRing) {
        // A carbonyl hanging off the ring, as in a pyridinone. These rings are
        // genuinely aromatic by most definitions, and promoting one from a
        // Kekule drawing produced SMILES that RDKit refused to read - 14 of
        // 20,000 structures. A ring left in its Kekule form is still correct,
        // so perception stops here rather than guessing; a molecule that
        // arrives already written as aromatic keeps the flags it came with.
        return null;
      }
      if (atom.charge < 0 && atom.el === 'C') return 2;
      if (atom.charge > 0 && atom.el === 'C') return 0;
      if (['N', 'O', 'S', 'Se', 'P'].includes(atom.el)) return 2;   // a lone pair
      return null;
    };

    for (const ring of this.rings()) {
      if (ring.length < 5 || ring.length > 7) continue;
      let electrons = 0;
      let usable = true;
      for (const index of ring) {
        const share = contribution(index, ring);
        if (share === null) { usable = false; break; }
        electrons += share;
      }
      if (!usable) continue;
      if ((electrons - 2) % 4 !== 0) continue;
      for (const index of ring) this.atoms[index].arom = true;
      for (let i = 0; i < ring.length; i += 1) {
        const bond = this.bondBetween(ring[i], ring[(i + 1) % ring.length]);
        if (bond) { bond.arom = true; bond.order = 1; }
      }
    }
    this._dirty();
    return this;
  }

  // --- canonical ranking ---------------------------------------------------
  // Morgan-style refinement: start from a local invariant per atom, then
  // repeatedly replace each atom's rank with a hash of its own rank and its
  // sorted neighbours' ranks until the partition stops splitting. Ties are
  // broken one atom at a time so the result is a total order, which is what
  // makes a canonical SMILES canonical.
  canonicalRanks() {
    const n = this.atoms.length;
    if (!n) return [];
    const invariant = (i) => {
      const atom = this.atoms[i];
      return [this.degree(i), this.bondOrderSum(i), atom.el,
        atom.charge, this.hydrogens(i), atom.arom ? 1 : 0, atom.iso].join('|');
    };
    let ranks = rankOf(this.atoms.map((_, i) => invariant(i)));

    for (let pass = 0; pass < n + 2; pass += 1) {
      const keys = this.atoms.map((_, i) => {
        const around = this.adjacency[i]
          .map((link) => (link.bond.arom ? 1.5 : link.bond.order) + ':' + ranks[link.other])
          .sort();
        return ranks[i] + '>' + around.join(',');
      });
      const next = rankOf(keys);
      if (samePartition(ranks, next)) break;
      ranks = next;
    }

    // Break remaining ties deterministically, lowest rank first.
    for (;;) {
      const counts = new Map();
      for (const rank of ranks) counts.set(rank, (counts.get(rank) || 0) + 1);
      let tied = -1;
      for (let i = 0; i < n; i += 1) {
        if (counts.get(ranks[i]) > 1 && (tied === -1 || ranks[i] < ranks[tied])) tied = i;
      }
      if (tied === -1) break;
      const keys = this.atoms.map((_, i) => (i === tied ? ranks[i] - 0.5 : ranks[i]));
      ranks = rankOf(keys.map((k, i) => String(k).padStart(12, '0') + ':' + i * 0));
      // Refine again after the break so the distinction propagates.
      for (let pass = 0; pass < n + 2; pass += 1) {
        const refined = this.atoms.map((_, i) => {
          const around = this.adjacency[i]
            .map((link) => (link.bond.arom ? 1.5 : link.bond.order) + ':' + ranks[link.other])
            .sort();
          return ranks[i] + '>' + around.join(',');
        });
        const next = rankOf(refined);
        if (samePartition(ranks, next)) break;
        ranks = next;
      }
    }
    return ranks;
  }
}

// Shared rank assignment: identical keys get identical ranks, ordered by key.
function rankOf(keys) {
  const sorted = [...new Set(keys)].sort();
  const place = new Map(sorted.map((key, i) => [key, i]));
  return keys.map((key) => place.get(key));
}

function samePartition(a, b) {
  if (a.length !== b.length) return false;
  const map = new Map();
  for (let i = 0; i < a.length; i += 1) {
    if (!map.has(a[i])) map.set(a[i], b[i]);
    else if (map.get(a[i]) !== b[i]) return false;
  }
  return new Set(a).size === new Set(b).size;
}

const EXPORTS_molecule = { Molecule };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_molecule;
} else if (typeof RETRO !== 'undefined') {
  RETRO.molecule = EXPORTS_molecule;
}
