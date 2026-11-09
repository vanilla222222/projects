'use strict';
// Run the reaction the other way, and see what you would really get.
//
// A retro step is a claim: "these precursors, under these conditions, give that
// product". The claim is easy to make and often wrong, because a disconnection
// looks at one site while a real reaction sees every site. Couple an acid to a
// diamine and you get two amides and a mixture; acylate an amino alcohol and
// the question is which end reacted.
//
// So the forward rules here are not the inverse of the cuts. Inverting a cut
// verifies only that the bookkeeping is consistent, which it always is. These
// start from the precursors and find *every* place the reaction could happen,
// then ask two separate questions:
//
//   does the intended product come out at all?   - if not, the step is wrong
//   does anything else come out too?             - if so, the step is ambiguous
//
// Ambiguity is not failure. It is the thing a chemist answers with a
// protecting group, and saying which step needs one is more useful than
// silently offering a route that would give a mixture.

const FW = (typeof require === 'function' && typeof module !== 'undefined')
  ? { smiles: require('./smiles.js'), groups: require('./groups.js'), molecule: require('./molecule.js') }
  : (typeof RETRO !== 'undefined'
    ? { smiles: RETRO.smiles, groups: RETRO.groups, molecule: RETRO.molecule } : null);

// Put several molecules into one graph so a reaction can join them.
function combine(mols) {
  const Molecule = FW.molecule.Molecule;
  const out = new Molecule();
  const offsets = [];
  for (const mol of mols) {
    offsets.push(out.atoms.length);
    const base = out.atoms.length;
    for (const atom of mol.atoms) out.addAtom(atom.el, atom);
    for (const bond of mol.bonds) out.addBond(base + bond.a, base + bond.b, bond.order, bond);
  }
  return { mol: out, offsets };
}

function without(mol, indices) {
  const drop = new Set(indices);
  return mol.subgraph(mol.atoms.map((_, i) => i).filter((i) => !drop.has(i)));
}

// Join two atoms and remove the leaving groups, then hand back the product.
function join(mol, a, b, remove, order) {
  const copy = mol.clone();
  copy.addBond(a, b, order || 1);
  const trimmed = without(copy, remove);
  return trimmed;
}

// Everything attached to `from` through `via`, so a whole leaving group can go.
function branchFrom(mol, via, from) {
  const seen = new Set([from, via]);
  const stack = [via];
  const out = [via];
  while (stack.length) {
    const at = stack.pop();
    for (const link of mol.adjacency[at]) {
      if (seen.has(link.other)) continue;
      seen.add(link.other);
      out.push(link.other);
      stack.push(link.other);
    }
  }
  return out;
}

// Everything in the mixture that an acylating agent would attack, in roughly
// the order it would attack them. Listing only the intended one is how a
// forward check comes back clean on a molecule that would plainly give a
// mixture: acylate an amino alcohol and the oxygen is right there too.
function nucleophiles(mol, g) {
  const out = [];
  for (const amine of g.amines) if (amine.hs >= 1) out.push({ at: amine.n, kind: 'amine' });
  for (const thiol of g.thiols) out.push({ at: thiol.s, kind: 'thiol' });
  for (const alcohol of g.alcohols) out.push({ at: alcohol.o, kind: 'alcohol' });
  for (const phenol of g.phenols) out.push({ at: phenol.o, kind: 'phenol' });
  return out;
}

// Each rule: given the combined precursors and their groups, list every
// product the reaction could give.
const FORWARD = {
  'amide-coupling': (mol, g) => {
    const out = [];
    for (const acid of g.acids) {
      for (const site of nucleophiles(mol, g)) {
        if (site.at === acid.oh) continue;
        out.push(join(mol, acid.c, site.at, [acid.oh]));
      }
    }
    return out;
  },
  'amide-from-acyl-chloride': (mol, g) => {
    const out = [];
    for (const acyl of g.acylHalides) {
      for (const site of nucleophiles(mol, g)) {
        out.push(join(mol, acyl.c, site.at, [acyl.x]));
      }
    }
    return out;
  },
  'amide-from-ester': (mol, g) => {
    const out = [];
    for (const ester of g.esters) {
      for (const amine of g.amines) {
        if (amine.hs < 1) continue;
        out.push(join(mol, ester.c, amine.n, branchFrom(mol, ester.oEster, ester.c)));
      }
    }
    return out;
  },
  esterification: (mol, g) => {
    const out = [];
    for (const acid of g.acids) {
      for (const site of nucleophiles(mol, g)) {
        if (site.at === acid.oh) continue;
        out.push(join(mol, acid.c, site.at, [acid.oh]));
      }
    }
    return out;
  },
  suzuki: (mol, g) => {
    const out = [];
    for (const halide of g.arylHalides) {
      for (const boronic of g.boronics) {
        out.push(join(mol, halide.c, boronic.c,
          [halide.x, ...branchFrom(mol, boronic.b, boronic.c)]));
      }
    }
    return out;
  },
  buchwald: (mol, g) => {
    const out = [];
    for (const halide of g.arylHalides) {
      for (const amine of g.amines) {
        if (amine.hs < 1) continue;
        out.push(join(mol, halide.c, amine.n, [halide.x]));
      }
    }
    return out;
  },
  sonogashira: (mol, g) => {
    const out = [];
    for (const halide of g.arylHalides) {
      for (const alkyne of g.alkynes) {
        if (!alkyne.terminal) continue;
        const end = mol.hydrogens(alkyne.a) > 0 ? alkyne.a : alkyne.b;
        out.push(join(mol, halide.c, end, [halide.x]));
      }
    }
    return out;
  },
  heck: (mol, g) => {
    const out = [];
    for (const halide of g.arylHalides) {
      for (const alkene of g.alkenes) {
        for (const end of [alkene.a, alkene.b]) {
          if (mol.hydrogens(end) < 1) continue;
          out.push(join(mol, halide.c, end, [halide.x]));
        }
      }
    }
    return out;
  },
  'reductive-amination': (mol, g) => {
    const out = [];
    for (const carbonyl of [...g.aldehydes, ...g.ketones]) {
      for (const amine of g.amines) {
        if (amine.hs < 1) continue;
        const copy = mol.clone();
        copy.addBond(carbonyl.c, amine.n, 1);
        const bond = copy.bondBetween(carbonyl.c, carbonyl.o);
        if (bond) { bond.order = 1; copy._dirty(); }
        out.push(without(copy, [carbonyl.o]));
      }
    }
    return out;
  },
  'carbonyl-reduction': (mol, g) => {
    const out = [];
    for (const carbonyl of [...g.aldehydes, ...g.ketones]) {
      const copy = mol.clone();
      const bond = copy.bondBetween(carbonyl.c, carbonyl.o);
      if (!bond) continue;
      bond.order = 1;
      copy._dirty();
      out.push(copy);
    }
    return out;
  },
  'alcohol-oxidation': (mol, g) => {
    const out = [];
    for (const alcohol of g.alcohols) {
      if (mol.hydrogens(alcohol.c) < 1) continue;
      const copy = mol.clone();
      const bond = copy.bondBetween(alcohol.c, alcohol.o);
      if (!bond) continue;
      bond.order = 2;
      copy._dirty();
      out.push(copy);
    }
    return out;
  },
  'nitro-reduction': (mol, g) => {
    const out = [];
    for (const nitro of g.nitros) {
      const copy = mol.clone();
      const oxygens = copy.adjacency[nitro.n]
        .filter((l) => copy.atoms[l.other].el === 'O').map((l) => l.other);
      copy.atoms[nitro.n].charge = 0;
      copy.atoms[nitro.n].hs = -1;
      out.push(without(copy, oxygens));
    }
    return out;
  },
  sulfonamide: (mol, g) => {
    const out = [];
    for (let i = 0; i < mol.atoms.length; i += 1) {
      if (mol.atoms[i].el !== 'S') continue;
      const chloride = mol.adjacency[i].find((l) => mol.atoms[l.other].el === 'Cl');
      const oxos = mol.adjacency[i].filter((l) => l.bond.order === 2
        && mol.atoms[l.other].el === 'O');
      if (!chloride || oxos.length !== 2) continue;
      for (const amine of g.amines) {
        if (amine.hs < 1) continue;
        out.push(join(mol, i, amine.n, [chloride.other]));
      }
    }
    return out;
  },
  williamson: (mol, g) => {
    const out = [];
    for (const alcohol of [...g.alcohols, ...g.phenols]) {
      for (const halide of g.halides) {
        out.push(join(mol, alcohol.o, halide.c, [halide.x]));
      }
    }
    return out;
  },
  'sn2-amine': (mol, g) => {
    const out = [];
    for (const amine of g.amines) {
      if (amine.hs < 1) continue;
      for (const halide of g.halides) {
        out.push(join(mol, amine.n, halide.c, [halide.x]));
      }
    }
    return out;
  },
  'alkene-hydrogenation': (mol, g) => {
    const out = [];
    for (const alkene of g.alkenes) {
      const copy = mol.clone();
      const bond = copy.bondBetween(alkene.a, alkene.b);
      if (!bond) continue;
      bond.order = 1;
      copy._dirty();
      out.push(copy);
    }
    return out;
  },
  thioether: (mol, g) => {
    const out = [];
    for (const thiol of g.thiols) {
      for (const halide of g.halides) {
        out.push(join(mol, thiol.s, halide.c, [halide.x]));
      }
    }
    return out;
  },
  'acid-reduction': (mol, g) => g.acids.map(acid => {
    const copy = mol.clone();
    copy.bondBetween(acid.c, acid.o).order = 1;
    copy._dirty();
    return without(copy, [acid.oh]);
  }),
  'aldehyde-oxidation': (mol, g) => g.aldehydes.map(aldehyde => {
    const copy = mol.clone();
    const oxygen = copy.addAtom('O', {});
    copy.addBond(aldehyde.c, oxygen.index, 1);
    return copy;
  }),
  'nitrile-reduction': (mol, g) => g.nitriles.map(nitrile => {
    const copy = mol.clone();
    copy.bondBetween(nitrile.c, nitrile.n).order = 1;
    copy.atoms[nitrile.n].hs = -1;
    copy._dirty();
    return copy;
  }),
  'amide-reduction': (mol, g) => g.amides.filter(a => a.acyl !== null).map(a => without(mol, [a.o])),
  'alcohol-dehydration': (mol, g) => g.alcohols.flatMap(alcohol =>
    mol.adjacency[alcohol.c].filter(link => link.bond.order === 1 && mol.atoms[link.other].el === 'C'
      && !mol.atoms[link.other].arom && mol.hydrogens(link.other) > 0).map(link => {
      const copy = mol.clone();
      copy.bondBetween(alcohol.c, link.other).order = 2;
      copy._dirty();
      return without(copy, [alcohol.o]);
    })),
  'imine-condensation': (mol, g) => {
    const out = [];
    for (const carbonyl of [...g.aldehydes, ...g.ketones]) {
      for (const amine of g.amines) {
        if (amine.degree !== 1 || amine.hs !== 2) continue;
        const copy = mol.clone();
        copy.atoms[amine.n].hs = -1;
        copy.addBond(carbonyl.c, amine.n, 2);
        out.push(without(copy, [carbonyl.o]));
      }
    }
    return out;
  },

};

// Which transforms can be checked at all. Said out loud, because a route made
// of unchecked steps should not look like a route made of checked ones.
const VERIFIABLE = new Set(Object.keys(FORWARD));

function verify(step) {
  if (!VERIFIABLE.has(step.transform)) {
    return { checked: false, ok: true, selective: null,
      note: 'no forward rule for this transform yet' };
  }
  let mols;
  try { mols = step.precursors.map((p) => FW.smiles.parse(p)); }
  catch (err) { void err; return { checked: true, ok: false, selective: false,
    note: 'a precursor could not be read' }; }

  const { mol } = combine(mols);
  let products;
  try { products = FORWARD[step.transform](mol, FW.groups.groupsOf(mol)) || []; }
  catch (err) { void err; return { checked: true, ok: false, selective: false,
    note: 'the forward reaction could not be run' }; }

  const made = new Set();
  for (const product of products) {
    for (const piece of product.components()) {
      try {
        const text = FW.smiles.canonicalWrite(piece);
        if (text) made.add(text);
      } catch (err) { void err; }
    }
  }
  // A precursor that simply survives is not a product.
  for (const precursor of step.precursors) made.delete(precursor);

  const ok = made.has(step.product);
  const others = [...made].filter((m) => m !== step.product);
  return {
    checked: true,
    ok,
    selective: ok && others.length === 0,
    alternatives: others.slice(0, 4),
    note: !ok
      ? 'running it forwards does not give the product'
      : (others.length
        ? 'the same conditions would also give ' + others.length + ' other product'
          + (others.length === 1 ? '' : 's')
        : 'the only product'),
  };
}

const EXPORTS_forward = { FORWARD, VERIFIABLE, verify, combine };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_forward;
} else if (typeof RETRO !== 'undefined') {
  RETRO.forward = EXPORTS_forward;
}
