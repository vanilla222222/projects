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
function stereocentre(mol, index) {
  if (mol.atoms[index].el !== 'C' || mol.hydrogens(index) > 1) return false;
  const links = mol.adjacency[index];
  if (links.length + mol.hydrogens(index) !== 4 || links.some(l => l.bond.order !== 1)) return false;
  const classes = mol.symmetryClasses();
  return new Set(links.map(l => classes[l.other])).size === links.length;
}

function flagStereo(product, sites) {
  if (sites.some(index => stereocentre(product, index))) product.unresolvedStereo = true;
  return product;
}

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
        const product = without(copy, [carbonyl.o]);
        out.push(flagStereo(product, [carbonyl.c - Number(carbonyl.o < carbonyl.c)]));
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
      out.push(flagStereo(copy, [carbonyl.c]));
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
      out.push(flagStereo(copy, [alkene.a, alkene.b]));
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

  'acetal-formation': (mol, g) => {
    const out = [];
    for (const { c, o } of [...g.aldehydes, ...g.ketones]) {
      for (let i = 0; i < g.alcohols.length; i += 1) {
        for (const second of g.alcohols.slice(i + 1)) {
          const copy = mol.clone();
          copy.addBond(c, g.alcohols[i].o, 1);
          copy.addBond(c, second.o, 1);
          out.push(flagStereo(without(copy, [o]), [c - Number(o < c)]));
        }
      }
    }
    return out;
  },
  'diels-alder': (mol, g) => {
    const out = [];
    for (const central of mol.bonds) {
      if (central.order !== 1) continue;
      const { a:b, b:c } = central;
      if (mol.atoms[b].el !== 'C' || mol.atoms[c].el !== 'C') continue;
      for (const left of mol.adjacency[b]) {
        for (const right of mol.adjacency[c]) {
          const a = left.other, d = right.other;
          if (left.bond.order !== 2 || right.bond.order !== 2 || a === d
            || mol.atoms[a].el !== 'C' || mol.atoms[d].el !== 'C') continue;
          for (const alkene of g.alkenes) {
            for (const [e, f] of [[alkene.a, alkene.b], [alkene.b, alkene.a]]) {
              if (new Set([a, b, c, d, e, f]).size !== 6) continue;
              const copy = mol.clone();
              for (const [x, y, order] of [[a,b,1],[b,c,2],[c,d,1],[e,f,1]]) {
                Object.assign(copy.bondBetween(x, y), { order, dir:0 });
              }
              copy.addBond(d, e, 1);
              copy.addBond(f, a, 1);
              out.push(flagStereo(copy, [a,d,e,f]));
            }
          }
        }
      }
    }
    return out;
  },
  'halohydrin-closure': (mol, g) => g.alcohols.flatMap(alcohol =>
    g.halides.filter(halide => ['Cl', 'Br', 'I'].includes(halide.halogen)
      && mol.hydrogens(halide.c) > 0 && mol.bondBetween(alcohol.c, halide.c)?.order === 1)
      .map(halide => {
        const product = join(mol, alcohol.o, halide.c, [halide.x]);
        return flagStereo(product, [alcohol.c, halide.c].map(c => c - Number(halide.x < c)));
      })),
  'epoxidation': (mol, g) => g.alkenes.map(({ a, b }) => {
    const copy = mol.clone();
    Object.assign(copy.bondBetween(a, b), { order:1, dir:0 });
    const oxygen = copy.addAtom('O');
    copy.addBond(a, oxygen.index, 1);
    copy.addBond(b, oxygen.index, 1);
    return flagStereo(copy, [a,b]);
  }),

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
  const groups = FW.groups.groupsOf(mol);
  let products;
  try { products = FORWARD[step.transform](mol, groups) || []; }
  catch (err) { void err; return { checked: true, ok: false, selective: false,
    note: 'the forward reaction could not be run' }; }

  const made = new Set();
  const unresolved = new Set();
  for (const product of products) {
    for (const piece of product.components()) {
      try {
        const text = FW.smiles.canonicalWrite(piece);
        if (text) {
          made.add(text);
          if (product.unresolvedStereo) unresolved.add(text);
        }
      } catch (err) { void err; }
    }
  }
  // A precursor that simply survives is not a product.
  for (const precursor of step.precursors) made.delete(precursor);

  const ok = made.has(step.product);
  const stereo = unresolved.has(step.product);
  const interference = step.transform === 'alkene-hydrogenation' && (groups.alkynes.length || groups.nitros.length)
    ? 'An alkyne or nitro group could also be reduced'
    : step.transform === 'epoxidation' && groups.thiols.length
      ? 'A thiol could also be oxidized' : null;
  const others = [...made].filter((m) => m !== step.product);
  const warnings = [
    others.length && ('The model also predicts ' + others.length + ' alternative product'
      + (others.length === 1 ? '' : 's')),
    stereo && 'The model leaves stereochemistry unresolved',
    interference,
  ].filter(Boolean);
  return {
    checked: true,
    ok,
    selective: ok && warnings.length === 0,
    stereo,
    interference,
    alternatives: others.slice(0, 4),
    note: ok ? warnings.join(' · ') || 'No alternative product found by the model'
      : 'Running it forwards does not give the product',
  };
}

const EXPORTS_forward = { FORWARD, VERIFIABLE, verify, combine };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_forward;
} else if (typeof RETRO !== 'undefined') {
  RETRO.forward = EXPORTS_forward;
}
