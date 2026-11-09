'use strict';
// What a molecule contains, in the terms a chemist disconnects by.
//
// Every transform needs the same question answered - where are the amides,
// which halides are on an aromatic ring, is that alcohol primary - so it is
// answered once per molecule and handed round. chem lab does the same thing
// and it is the right shape; the difference here is coverage, because a
// transform cannot exist for a group the perception cannot see. Boronic acids,
// sulfonamides, silyl ethers and aryl halides are all here precisely because
// the couplings that need them are the ones chem lab has no way to express.

function groupsOf(mol) {
  const found = {
    alcohols: [], phenols: [], aldehydes: [], ketones: [], acids: [], esters: [],
    amides: [], amines: [], nitriles: [], nitros: [], halides: [], arylHalides: [],
    ethers: [], alkenes: [], alkynes: [], aromaticRings: [], epoxides: [],
    boronics: [], sulfonamides: [], sulfones: [], ureas: [], carbamates: [],
    silylEthers: [], thiols: [], azides: [], imines: [], acylHalides: [],
  };
  const inRing = mol.ringMembership();
  const seenBond = new Set();

  const near = (i) => mol.adjacency[i];
  const elementsAround = (i) => near(i).map((l) => mol.atoms[l.other].el);
  const doubleTo = (i, el) => near(i).find((l) => l.bond.order === 2 && mol.atoms[l.other].el === el);
  const singleTo = (i, el) => near(i).filter((l) => l.bond.order === 1 && mol.atoms[l.other].el === el);

  // Degree of substitution at a carbon, counting only carbons.
  const carbonsAt = (i) => near(i).filter((l) => mol.atoms[l.other].el === 'C').length;

  for (let i = 0; i < mol.atoms.length; i += 1) {
    const atom = mol.atoms[i];

    // --- carbonyls, split by what else is on the carbon --------------------
    if (atom.el === 'C' && doubleTo(i, 'O')) {
      const oxo = doubleTo(i, 'O').other;
      const singles = near(i).filter((l) => l.bond.order === 1);
      const oxygens = singles.filter((l) => mol.atoms[l.other].el === 'O');
      const nitrogens = singles.filter((l) => mol.atoms[l.other].el === 'N');
      const halogens = singles.filter((l) => ['Cl', 'Br', 'I', 'F'].includes(mol.atoms[l.other].el));
      const carbons = singles.filter((l) => mol.atoms[l.other].el === 'C');

      if (halogens.length) {
        found.acylHalides.push({ c: i, o: oxo, x: halogens[0].other });
      } else if (nitrogens.length && oxygens.length) {
        found.carbamates.push({ c: i, o: oxo, n: nitrogens[0].other, or: oxygens[0].other });
      } else if (nitrogens.length >= 2) {
        found.ureas.push({ c: i, o: oxo, n1: nitrogens[0].other, n2: nitrogens[1].other });
      } else if (nitrogens.length === 1) {
        found.amides.push({
          c: i, o: oxo, n: nitrogens[0].other,
          acyl: carbons.length ? carbons[0].other : null,
          nSubstituents: carbonsAt(nitrogens[0].other),
          inRing: !!inRing[i] && !!inRing[nitrogens[0].other],
        });
      } else if (oxygens.length === 1) {
        const o = oxygens[0].other;
        const beyond = near(o).filter((l) => l.other !== i);
        if (beyond.length === 0 || mol.hydrogens(o) > 0) {
          found.acids.push({ c: i, o: oxo, oh: o, r: carbons.length ? carbons[0].other : null });
        } else {
          found.esters.push({
            c: i, o: oxo, oEster: o, alkyl: beyond[0].other,
            acyl: carbons.length ? carbons[0].other : null,
          });
        }
      } else if (carbons.length === 2) {
        found.ketones.push({ c: i, o: oxo, left: carbons[0].other, right: carbons[1].other,
          inRing: !!inRing[i] });
      } else if (carbons.length === 1) {
        found.aldehydes.push({ c: i, o: oxo, r: carbons[0].other });
      }
    }

    // --- oxygen-based ------------------------------------------------------
    if (atom.el === 'O' && !atom.arom && mol.hydrogens(i) === 1) {
      const attached = near(i).filter((l) => l.bond.order === 1);
      if (attached.length === 1) {
        const c = attached[0].other;
        const carbon = mol.atoms[c];
        const isCarbonyl = carbon.el === 'C' && !!doubleTo(c, 'O');
        if (!isCarbonyl) {
          if (carbon.arom) found.phenols.push({ o: i, c });
          else if (carbon.el === 'C') {
            found.alcohols.push({ o: i, c, degree: carbonsAt(c), inRing: !!inRing[c] });
          } else if (carbon.el === 'B') {
            // handled with the boron below
          }
        }
      }
    }
    if (atom.el === 'O' && !atom.arom && mol.hydrogens(i) === 0) {
      const attached = near(i).filter((l) => l.bond.order === 1);
      if (attached.length === 2) {
        const [a, b] = attached.map((l) => l.other);
        const carbonyl = [a, b].some((x) => mol.atoms[x].el === 'C' && doubleTo(x, 'O'));
        const silicon = [a, b].some((x) => mol.atoms[x].el === 'Si');
        if (silicon) {
          found.silylEthers.push({ o: i, si: mol.atoms[a].el === 'Si' ? a : b,
            c: mol.atoms[a].el === 'Si' ? b : a });
        } else if (!carbonyl) {
          if (inRing[i] && inRing[a] && inRing[b] && mol.bondBetween(a, b)) {
            found.epoxides.push({ o: i, a, b });
          } else {
            found.ethers.push({ o: i, a, b,
              aryl: mol.atoms[a].arom || mol.atoms[b].arom });
          }
        }
      }
    }

    // --- nitrogen-based ----------------------------------------------------
    if (atom.el === 'N' && !atom.arom && !near(i).some((l) => l.bond.order === 3)
        && !near(i).some((l) => l.bond.order === 2 && mol.atoms[l.other].el === 'C')) {
      // A nitrile or imine nitrogen is not an amine, however many single bonds
      // it also has.
      const singles = near(i).filter((l) => l.bond.order === 1);
      const isAmide = singles.some((l) => mol.atoms[l.other].el === 'C' && doubleTo(l.other, 'O'));
      const isNitro = atom.charge > 0 && elementsAround(i).filter((e) => e === 'O').length >= 2;
      const isSulfonamide = singles.some((l) => mol.atoms[l.other].el === 'S'
        && near(l.other).filter((k) => k.bond.order === 2 && mol.atoms[k.other].el === 'O').length === 2);
      if (isNitro) {
        found.nitros.push({ n: i, c: singles.filter((l) => mol.atoms[l.other].el === 'C').map((l) => l.other)[0] });
      } else if (isSulfonamide) {
        const s = singles.find((l) => mol.atoms[l.other].el === 'S').other;
        found.sulfonamides.push({ n: i, s,
          c: near(s).filter((l) => mol.atoms[l.other].el === 'C').map((l) => l.other)[0] });
      } else if (!isAmide) {
        const carbons = singles.filter((l) => mol.atoms[l.other].el === 'C');
        found.amines.push({
          n: i, degree: carbons.length, hs: mol.hydrogens(i),
          aryl: carbons.some((l) => mol.atoms[l.other].arom),
          carbons: carbons.map((l) => l.other),
        });
      }
      // Azide: N-N=N or N=N=N
      const nitrogensNear = near(i).filter((l) => mol.atoms[l.other].el === 'N');
      if (nitrogensNear.length === 1) {
        const mid = nitrogensNear[0].other;
        const far = near(mid).filter((l) => l.other !== i && mol.atoms[l.other].el === 'N');
        if (far.length === 1 && mol.atoms[far[0].other].charge !== 0) {
          found.azides.push({ n1: i, n2: mid, n3: far[0].other });
        }
      }
    }
    if (atom.el === 'N' && near(i).some((l) => l.bond.order === 3)) {
      const link = near(i).find((l) => l.bond.order === 3);
      if (mol.atoms[link.other].el === 'C') found.nitriles.push({ n: i, c: link.other });
    }
    if (atom.el === 'N' && !atom.arom && doubleTo(i, 'C')) {
      found.imines.push({ n: i, c: doubleTo(i, 'C').other });
    }

    // --- sulfur and boron ---------------------------------------------------
    if (atom.el === 'S' && mol.hydrogens(i) === 1 && near(i).length === 1) {
      found.thiols.push({ s: i, c: near(i)[0].other });
    }
    if (atom.el === 'S') {
      const oxos = near(i).filter((l) => l.bond.order === 2 && mol.atoms[l.other].el === 'O');
      const carbons = near(i).filter((l) => mol.atoms[l.other].el === 'C');
      if (oxos.length === 2 && carbons.length === 2) {
        found.sulfones.push({ s: i, left: carbons[0].other, right: carbons[1].other });
      }
    }
    if (atom.el === 'B') {
      const oxygens = singleTo(i, 'O');
      const carbons = near(i).filter((l) => mol.atoms[l.other].el === 'C');
      if (oxygens.length >= 2 && carbons.length === 1) {
        found.boronics.push({ b: i, c: carbons[0].other, aryl: mol.atoms[carbons[0].other].arom });
      }
    }

    // --- halides -------------------------------------------------------------
    if (['F', 'Cl', 'Br', 'I'].includes(atom.el) && near(i).length === 1) {
      const c = near(i)[0].other;
      const carbon = mol.atoms[c];
      if (carbon.el === 'C') {
        const record = { x: i, c, halogen: atom.el, degree: carbonsAt(c) };
        if (carbon.arom) found.arylHalides.push(record);
        else if (!doubleTo(c, 'O')) found.halides.push(record);
      }
    }
  }

  // --- bonds rather than atoms ---------------------------------------------
  for (const bond of mol.bonds) {
    if (seenBond.has(bond.index)) continue;
    seenBond.add(bond.index);
    const a = mol.atoms[bond.a];
    const b = mol.atoms[bond.b];
    if (bond.arom) continue;
    if (bond.order === 2 && a.el === 'C' && b.el === 'C') {
      found.alkenes.push({ a: bond.a, b: bond.b, bond: bond.index, inRing: mol.bondInRing(bond) });
    }
    if (bond.order === 3 && a.el === 'C' && b.el === 'C') {
      found.alkynes.push({ a: bond.a, b: bond.b, bond: bond.index,
        terminal: mol.hydrogens(bond.a) > 0 || mol.hydrogens(bond.b) > 0 });
    }
  }

  for (const ring of mol.rings()) {
    if (ring.every((i) => mol.atoms[i].arom)) {
      found.aromaticRings.push({
        atoms: ring.slice(),
        size: ring.length,
        heteroatoms: ring.filter((i) => mol.atoms[i].el !== 'C').length,
      });
    }
  }

  return found;
}

// A one-line summary, for explaining to a person why a transform did or did
// not apply.
function describe(found) {
  const parts = [];
  for (const [name, list] of Object.entries(found)) {
    if (list.length) parts.push(list.length + ' ' + name);
  }
  return parts.join(', ') || 'nothing recognised';
}

const EXPORTS_groups = { groupsOf, describe };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_groups;
} else if (typeof RETRO !== 'undefined') {
  RETRO.groups = EXPORTS_groups;
}
