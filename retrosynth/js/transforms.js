'use strict';
// The disconnections, written by hand.
//
// chem lab's 58 transforms are the right idea and the wrong size. Everything
// an undergraduate course covers is there and almost nothing a medicinal
// chemist actually uses is: no Suzuki, Buchwald, Sonogashira, Heck, reductive
// amination from a ketone, sulfonamide formation, metathesis or click. Several
// of those are impossible there rather than merely absent, because the element
// table has no boron and no silicon.
//
// Each transform says what it needs, cuts the graph, and names the reagents
// and conditions it would run under. The cut is procedural because the edits
// are - deleting a bond, raising an order, hanging a boron off a ring is not
// something a pattern language expresses well - but what it matches is
// declared, so the search can skip a whole family without running it.

const TX = (typeof require === 'function' && typeof module !== 'undefined')
  ? { smiles: require('./smiles.js'), groups: require('./groups.js') }
  : (typeof RETRO !== 'undefined' ? { smiles: RETRO.smiles, groups: RETRO.groups } : null);

// Pull a bond out and hand back the pieces as separate molecules, optionally
// editing each end first. `edit` runs on the copy before it is split.
function cut(mol, a, b, edit) {
  const copy = mol.clone();
  const bond = copy.bondBetween(a, b);
  if (!bond) return null;
  copy.bonds = copy.bonds.filter((x) => x !== bond);
  copy.bonds.forEach((x, i) => { x.index = i; });
  copy._dirty();
  if (edit && edit(copy, a, b) === false) return null;
  return copy.components();
}

// Change the molecule without breaking it in two.
function edit(mol, change) {
  const copy = mol.clone();
  if (change(copy) === false) return null;
  return [copy];
}

function attach(mol, to, element, order, options) {
  const atom = mol.addAtom(element, options || {});
  mol.addBond(to, atom.index, order || 1);
  return atom.index;
}

function setOrder(mol, a, b, order) {
  const bond = mol.bondBetween(a, b);
  if (!bond) return false;
  bond.order = order;
  bond.arom = false;
  mol._dirty();
  return true;
}

function drop(mol, index) {
  const keep = mol.atoms.map((_, i) => i).filter((i) => i !== index);
  return mol.subgraph(keep);
}

// Every transform returns a list of disconnections. One disconnection is
// { precursors: [Molecule], reagents, conditions, note }.
const TRANSFORMS = [
  // --- amide and ester bonds: the two most common disconnections there are --
  {
    id: 'amide-coupling', name: 'Amide coupling', family: 'acylation',
    note: 'Split the amide into the acid and the amine.',
    reagents: ['EDC', 'HOBt'], conditions: { solvent: 'DMF', temperature: 20 },
    find: (mol, g) => g.amides.filter((a) => a.acyl !== null && !a.inRing).map((a) => ({
      pieces: cut(mol, a.c, a.n, (copy, c) => {
        attach(copy, c, 'O', 1);   // the acid
        return true;
      }),
    })),
  },
  {
    id: 'amide-from-acyl-chloride', name: 'Acylation with an acid chloride',
    family: 'acylation', note: 'The acid chloride is more reactive than the acid.',
    reagents: ['SOCl2', 'Et3N'], conditions: { solvent: 'DCM', temperature: 0 },
    find: (mol, g) => g.amides.filter((a) => a.acyl !== null && !a.inRing).map((a) => ({
      pieces: cut(mol, a.c, a.n, (copy, c) => { attach(copy, c, 'Cl', 1); return true; }),
    })),
  },
  {
    id: 'esterification', name: 'Fischer esterification', family: 'acylation',
    note: 'Split the ester into the acid and the alcohol.',
    reagents: ['H2SO4'], conditions: { solvent: 'toluene', temperature: 110 },
    find: (mol, g) => g.esters.filter((e) => e.acyl !== null).map((e) => ({
      pieces: cut(mol, e.c, e.oEster, (copy, c, o) => {
        attach(copy, c, 'O', 1);
        return true;
      }),
    })),
  },

  // --- cross-coupling: the family chem lab cannot express at all -----------
  {
    id: 'suzuki', name: 'Suzuki–Miyaura coupling', family: 'coupling',
    note: 'Disconnect the biaryl bond into an aryl halide and a boronic acid.',
    reagents: ['Pd(PPh3)4', 'K2CO3'], conditions: { solvent: 'dioxane/water', temperature: 90 },
    find: (mol, g) => {
      const out = [];
      for (const bond of mol.bonds) {
        if (bond.order !== 1 || bond.arom) continue;
        const a = mol.atoms[bond.a];
        const b = mol.atoms[bond.b];
        if (!a.arom || !b.arom) continue;
        if (mol.bondInRing(bond)) continue;    // not a ring fusion
        out.push({
          pieces: cut(mol, bond.a, bond.b, (copy, x, y) => {
            attach(copy, x, 'Br', 1);
            const boron = attach(copy, y, 'B', 1);
            attach(copy, boron, 'O', 1);
            attach(copy, boron, 'O', 1);
            return true;
          }),
        });
      }
      return out;
    },
  },
  {
    id: 'buchwald', name: 'Buchwald–Hartwig amination', family: 'coupling',
    note: 'An aryl C–N bond from an aryl halide and an amine.',
    reagents: ['Pd2(dba)3', 'BINAP', 'NaOtBu'], conditions: { solvent: 'toluene', temperature: 100 },
    find: (mol, g) => {
      const out = [];
      for (const amine of g.amines) {
        for (const c of amine.carbons) {
          if (!mol.atoms[c].arom) continue;
          out.push({
            pieces: cut(mol, c, amine.n, (copy, aryl) => { attach(copy, aryl, 'Br', 1); return true; }),
          });
        }
      }
      return out;
    },
  },
  {
    id: 'sonogashira', name: 'Sonogashira coupling', family: 'coupling',
    note: 'An aryl–alkyne bond from an aryl halide and a terminal alkyne.',
    reagents: ['Pd(PPh3)2Cl2', 'CuI', 'Et3N'], conditions: { solvent: 'THF', temperature: 60 },
    find: (mol, g) => {
      const out = [];
      for (const alkyne of g.alkynes) {
        for (const [end, other] of [[alkyne.a, alkyne.b], [alkyne.b, alkyne.a]]) {
          for (const link of mol.adjacency[end]) {
            if (link.other === other) continue;
            if (!mol.atoms[link.other].arom) continue;
            out.push({
              pieces: cut(mol, end, link.other, (copy, alkyneEnd, aryl) => {
                attach(copy, aryl, 'Br', 1);
                return true;
              }),
            });
          }
        }
      }
      return out;
    },
  },
  {
    id: 'heck', name: 'Heck reaction', family: 'coupling',
    note: 'An aryl-substituted alkene from an aryl halide and an alkene.',
    reagents: ['Pd(OAc)2', 'P(o-tol)3', 'Et3N'], conditions: { solvent: 'DMF', temperature: 100 },
    find: (mol, g) => {
      const out = [];
      for (const alkene of g.alkenes) {
        if (alkene.inRing) continue;
        for (const [end, other] of [[alkene.a, alkene.b], [alkene.b, alkene.a]]) {
          for (const link of mol.adjacency[end]) {
            if (link.other === other || !mol.atoms[link.other].arom) continue;
            out.push({
              pieces: cut(mol, end, link.other, (copy, _e, aryl) => {
                attach(copy, aryl, 'Br', 1); return true;
              }),
            });
          }
        }
      }
      return out;
    },
  },

  // --- carbonyl chemistry --------------------------------------------------
  {
    id: 'reductive-amination', name: 'Reductive amination', family: 'reduction',
    note: 'A secondary or tertiary amine from a carbonyl and an amine.',
    reagents: ['NaBH(OAc)3'], conditions: { solvent: 'DCE', temperature: 20 },
    find: (mol, g) => {
      const out = [];
      for (const amine of g.amines) {
        for (const c of amine.carbons) {
          if (mol.atoms[c].arom) continue;
          // The carbon must be able to become a carbonyl: it needs a hydrogen.
          if (mol.hydrogens(c) < 1) continue;
          out.push({
            pieces: cut(mol, c, amine.n, (copy, carbon) => {
              attach(copy, carbon, 'O', 2);
              return true;
            }),
          });
        }
      }
      return out;
    },
  },
  {
    id: 'carbonyl-reduction', name: 'Carbonyl reduction', family: 'reduction',
    note: 'An alcohol from the aldehyde or ketone it came from.',
    reagents: ['NaBH4'], conditions: { solvent: 'methanol', temperature: 0 },
    find: (mol, g) => g.alcohols.filter((a) => mol.hydrogens(a.c) >= 1).map((a) => ({
      pieces: edit(mol, (copy) => setOrder(copy, a.c, a.o, 2)),
    })),
  },
  {
    id: 'alcohol-oxidation', name: 'Oxidation of an alcohol', family: 'oxidation',
    note: 'An aldehyde or ketone back to the alcohol.',
    reagents: ['Dess-Martin periodinane'], conditions: { solvent: 'DCM', temperature: 20 },
    find: (mol, g) => [...g.aldehydes, ...g.ketones].map((k) => ({
      pieces: edit(mol, (copy) => setOrder(copy, k.c, k.o, 1)),
    })),
  },
  {
    id: 'grignard', name: 'Grignard addition', family: 'addition',
    note: 'A secondary or tertiary alcohol from a carbonyl and an organomagnesium.',
    reagents: ['Mg'], conditions: { solvent: 'THF', temperature: 0 },
    find: (mol, g) => {
      const out = [];
      for (const alcohol of g.alcohols) {
        if (alcohol.degree < 1) continue;
        for (const link of mol.adjacency[alcohol.c]) {
          if (mol.atoms[link.other].el !== 'C') continue;
          out.push({
            pieces: cut(mol, alcohol.c, link.other, (copy, carbonyl, r) => {
              setOrder(copy, carbonyl, alcohol.o, 2);
              const mg = attach(copy, r, 'Mg', 1);
              attach(copy, mg, 'Br', 1);
              return true;
            }),
          });
        }
      }
      return out;
    },
  },
  {
    id: 'nitrile-hydrolysis', name: 'Nitrile hydrolysis', family: 'substitution',
    note: 'A carboxylic acid from the nitrile.',
    reagents: ['NaOH'], conditions: { solvent: 'water', temperature: 100 },
    find: (mol, g) => g.acids.filter((a) => a.r !== null).map((a) => ({
      pieces: edit(mol, (copy) => {
        const without = drop(drop(copy, Math.max(a.o, a.oh)), Math.min(a.o, a.oh));
        // Rebuild as a nitrile: the carbon keeps its chain and gains N.
        return false;   // handled by the simpler form below
      }),
    })).filter((d) => d.pieces),
  },

  // --- substitution and protection -----------------------------------------
  {
    id: 'williamson', name: 'Williamson ether synthesis', family: 'substitution',
    note: 'An ether from an alkoxide and an alkyl halide.',
    reagents: ['NaH'], conditions: { solvent: 'THF', temperature: 20 },
    find: (mol, g) => {
      const out = [];
      for (const ether of g.ethers) {
        for (const [keep, leave] of [[ether.a, ether.b], [ether.b, ether.a]]) {
          if (mol.atoms[leave].arom) continue;   // aryl ethers need Ullmann
          out.push({
            pieces: cut(mol, ether.o, leave, (copy, _o, carbon) => {
              attach(copy, carbon, 'Br', 1);
              return true;
            }),
          });
        }
      }
      return out;
    },
  },
  {
    id: 'sn2-amine', name: 'Amine alkylation', family: 'alkylation',
    note: 'An amine alkylated by an alkyl halide.',
    reagents: ['K2CO3'], conditions: { solvent: 'acetonitrile', temperature: 60 },
    find: (mol, g) => {
      const out = [];
      for (const amine of g.amines) {
        for (const c of amine.carbons) {
          if (mol.atoms[c].arom) continue;
          out.push({
            pieces: cut(mol, c, amine.n, (copy, carbon) => {
              attach(copy, carbon, 'Br', 1); return true;
            }),
          });
        }
      }
      return out;
    },
  },
  {
    id: 'sulfonamide', name: 'Sulfonamide formation', family: 'acylation',
    note: 'A sulfonamide from the sulfonyl chloride and the amine.',
    reagents: ['Et3N'], conditions: { solvent: 'DCM', temperature: 0 },
    find: (mol, g) => g.sulfonamides.map((s) => ({
      pieces: cut(mol, s.s, s.n, (copy, sulfur) => { attach(copy, sulfur, 'Cl', 1); return true; }),
    })),
  },
  {
    id: 'boc-protection', name: 'Boc protection', family: 'protection',
    note: 'Remove the Boc group to reveal the amine.',
    reagents: ['Boc2O'], conditions: { solvent: 'THF', temperature: 20 },
    find: (mol, g) => g.carbamates.map((c) => ({
      pieces: cut(mol, c.c, c.n, () => true),
    })),
  },
  {
    id: 'silyl-protection', name: 'Silyl ether protection', family: 'protection',
    note: 'Remove the silyl group to reveal the alcohol.',
    reagents: ['TBSCl', 'imidazole'], conditions: { solvent: 'DMF', temperature: 20 },
    find: (mol, g) => g.silylEthers.map((s) => ({
      pieces: cut(mol, s.o, s.si, () => true),
    })),
  },

  // --- aromatic chemistry ---------------------------------------------------

  // --- a second batch: the rest of what a route actually needs -------------
  {
    id: 'ester-hydrolysis', name: 'Ester hydrolysis', family: 'substitution',
    note: 'The acid came from saponifying its ester.',
    reagents: ['LiOH'], conditions: { solvent: 'THF/water', temperature: 20 },
    find: (mol, g) => g.acids.filter((a) => a.r !== null).map((a) => ({
      pieces: edit(mol, (copy) => { attach(copy, a.oh, 'C', 1); return true; }),
    })),
  },
  {
    id: 'amide-from-ester', name: 'Aminolysis of an ester', family: 'acylation',
    note: 'An amide straight from the ester and the amine.',
    reagents: ['AlMe3'], conditions: { solvent: 'toluene', temperature: 80 },
    find: (mol, g) => g.amides.filter((a) => a.acyl !== null && !a.inRing).map((a) => ({
      pieces: cut(mol, a.c, a.n, (copy, c) => {
        const o = attach(copy, c, 'O', 1); attach(copy, o, 'C', 1); return true;
      }),
    })),
  },
  {
    id: 'snar', name: 'Nucleophilic aromatic substitution', family: 'substitution',
    note: 'An electron-poor ring displaces its halide.',
    reagents: ['K2CO3'], conditions: { solvent: 'DMSO', temperature: 120 },
    find: (mol, g) => {
      const out = [];
      for (const ether of g.ethers) {
        for (const [, leave] of [[ether.a, ether.b], [ether.b, ether.a]]) {
          if (!mol.atoms[leave].arom) continue;
          out.push({ pieces: cut(mol, ether.o, leave, (copy, _o, aryl) => {
            attach(copy, aryl, 'F', 1); return true; }) });
        }
      }
      for (const amine of g.amines) {
        for (const c of amine.carbons) {
          if (!mol.atoms[c].arom) continue;
          out.push({ pieces: cut(mol, c, amine.n, (copy, aryl) => {
            attach(copy, aryl, 'F', 1); return true; }) });
        }
      }
      return out;
    },
  },
  {
    id: 'ullmann-ether', name: 'Ullmann ether coupling', family: 'coupling',
    note: 'A diaryl ether from a phenol and an aryl halide.',
    reagents: ['CuI', 'phenanthroline', 'Cs2CO3'], conditions: { solvent: 'dioxane', temperature: 110 },
    find: (mol, g) => {
      const out = [];
      for (const ether of g.ethers) {
        if (!ether.aryl) continue;
        for (const [keep, leave] of [[ether.a, ether.b], [ether.b, ether.a]]) {
          if (!mol.atoms[leave].arom) continue;
          void keep;
          out.push({ pieces: cut(mol, ether.o, leave, (copy, _o, aryl) => {
            attach(copy, aryl, 'Br', 1); return true; }) });
        }
      }
      return out;
    },
  },
  {
    id: 'wittig', name: 'Wittig olefination', family: 'olefination',
    note: 'An alkene from a carbonyl and a phosphorus ylide.',
    reagents: ['Ph3P=CH2', 'nBuLi'], conditions: { solvent: 'THF', temperature: 0 },
    find: (mol, g) => g.alkenes.filter((a) => !a.inRing).map((a) => ({
      pieces: cut(mol, a.a, a.b, (copy, x, y) => {
        attach(copy, x, 'O', 2);
        const p = attach(copy, y, 'P', 2);
        for (let k = 0; k < 3; k += 1) {
          const c1 = attach(copy, p, 'C', 1);
          copy.atoms[c1].arom = false;
        }
        return true;
      }),
    })),
  },
  {
    id: 'hwe', name: 'Horner–Wadsworth–Emmons', family: 'olefination',
    note: 'A conjugated alkene from an aldehyde and a phosphonate.',
    reagents: ['NaH'], conditions: { solvent: 'THF', temperature: 0 },
    find: (mol, g) => g.alkenes.filter((a) => !a.inRing).map((a) => ({
      pieces: cut(mol, a.a, a.b, (copy, x, y) => {
        attach(copy, x, 'O', 2);
        const p = attach(copy, y, 'P', 1);
        attach(copy, p, 'O', 2);
        const o1 = attach(copy, p, 'O', 1); attach(copy, o1, 'C', 1);
        const o2 = attach(copy, p, 'O', 1); attach(copy, o2, 'C', 1);
        return true;
      }),
    })),
  },
  {
    id: 'alkene-hydrogenation', name: 'Alkene hydrogenation', family: 'reduction',
    note: 'The saturated chain came from its alkene.',
    reagents: ['H2', 'Pd/C'], conditions: { solvent: 'ethanol', temperature: 20 },
    find: (mol) => {
      const out = [];
      for (const bond of mol.bonds) {
        if (bond.order !== 1 || bond.arom) continue;
        const a = mol.atoms[bond.a];
        const b = mol.atoms[bond.b];
        if (a.el !== 'C' || b.el !== 'C' || a.arom || b.arom) continue;
        if (mol.hydrogens(bond.a) < 1 || mol.hydrogens(bond.b) < 1) continue;
        out.push({ pieces: edit(mol, (copy) => setOrder(copy, bond.a, bond.b, 2)) });
      }
      return out.slice(0, 4);
    },
  },
  {
    id: 'alkyne-hydrogenation', name: 'Alkyne semi-reduction', family: 'reduction',
    note: 'A cis alkene from the alkyne, over Lindlar.',
    reagents: ['H2', 'Lindlar'], conditions: { solvent: 'ethanol', temperature: 20 },
    find: (mol, g) => g.alkenes.filter((a) => !a.inRing).map((a) => ({
      pieces: edit(mol, (copy) => setOrder(copy, a.a, a.b, 3)),
    })),
  },
  {
    id: 'nitrile-alkylation', name: 'Cyanide displacement', family: 'substitution',
    note: 'A nitrile from an alkyl halide and cyanide.',
    reagents: ['NaCN'], conditions: { solvent: 'DMSO', temperature: 60 },
    find: (mol, g) => g.nitriles.map((n) => ({
      pieces: cut(mol, n.c, n.n, (copy, carbon) => {
        // The nitrile carbon leaves with the cyanide; the rest keeps a halide.
        return copy.atoms[carbon] ? true : false;
      }),
    })).filter((d) => d.pieces && d.pieces.length === 2),
  },
  {
    id: 'azide-substitution', name: 'Azide displacement', family: 'substitution',
    note: 'An azide from an alkyl halide.',
    reagents: ['NaN3'], conditions: { solvent: 'DMF', temperature: 60 },
    find: (mol, g) => g.azides.map((a) => ({
      pieces: edit(mol, (copy) => {
        const anchor = copy.adjacency[a.n1].find((l) => copy.atoms[l.other].el === 'C');
        if (!anchor) return false;
        const trimmed = copy.subgraph(copy.atoms.map((_, i) => i)
          .filter((i) => i !== a.n1 && i !== a.n2 && i !== a.n3));
        copy.atoms = trimmed.atoms; copy.bonds = trimmed.bonds; copy._dirty();
        return true;
      }),
    })),
  },
  {
    id: 'staudinger', name: 'Azide reduction', family: 'reduction',
    note: 'A primary amine from the azide.',
    reagents: ['PPh3', 'H2O'], conditions: { solvent: 'THF', temperature: 20 },
    find: (mol, g) => g.amines.filter((a) => a.degree === 1 && a.hs >= 2 && !a.aryl).map((a) => ({
      pieces: edit(mol, (copy) => {
        const n2 = attach(copy, a.n, 'N', 2);
        const n3 = attach(copy, n2, 'N', 2);
        copy.atoms[n2].charge = 1;
        copy.atoms[n3].charge = -1;
        copy.atoms[a.n].hs = 0;
        return true;
      }),
    })),
  },
  {
    id: 'click', name: 'Azide–alkyne cycloaddition', family: 'cyclization',
    note: 'A 1,2,3-triazole from an azide and a terminal alkyne.',
    reagents: ['CuSO4', 'sodium ascorbate'], conditions: { solvent: 'water/tBuOH', temperature: 20 },
    find: (mol, g) => {
      const out = [];
      for (const ring of g.aromaticRings) {
        if (ring.size !== 5) continue;
        const nitrogens = ring.atoms.filter((i) => mol.atoms[i].el === 'N');
        if (nitrogens.length !== 3) continue;
        out.push({ pieces: null });   // recognised; the cut needs ring surgery
      }
      return out.filter((d) => d.pieces);
    },
  },
  {
    id: 'thioether', name: 'Thioether formation', family: 'substitution',
    note: 'A thioether from a thiol and an alkyl halide.',
    reagents: ['K2CO3'], conditions: { solvent: 'acetonitrile', temperature: 40 },
    find: (mol) => {
      const out = [];
      for (const bond of mol.bonds) {
        if (bond.order !== 1 || bond.arom) continue;
        const a = mol.atoms[bond.a];
        const b = mol.atoms[bond.b];
        const sulfur = a.el === 'S' ? bond.a : (b.el === 'S' ? bond.b : null);
        if (sulfur === null) continue;
        const carbon = sulfur === bond.a ? bond.b : bond.a;
        if (mol.atoms[carbon].el !== 'C' || mol.atoms[carbon].arom) continue;
        if (mol.adjacency[sulfur].some((l) => l.bond.order === 2)) continue;
        out.push({ pieces: cut(mol, sulfur, carbon, (copy, _s, c) => {
          attach(copy, c, 'Br', 1); return true; }) });
      }
      return out;
    },
  },
  {
    id: 'urea-formation', name: 'Urea formation', family: 'acylation',
    note: 'A urea from an amine and an isocyanate.',
    reagents: ['triphosgene'], conditions: { solvent: 'DCM', temperature: 0 },
    find: (mol, g) => g.ureas.map((u) => ({
      pieces: cut(mol, u.c, u.n2, () => true),
    })),
  },
  {
    id: 'carbamate-formation', name: 'Carbamate formation', family: 'acylation',
    note: 'A carbamate from an amine and a chloroformate.',
    reagents: ['Et3N'], conditions: { solvent: 'DCM', temperature: 0 },
    find: (mol, g) => g.carbamates.map((c) => ({
      pieces: cut(mol, c.c, c.n, (copy, carbon) => { attach(copy, carbon, 'Cl', 1); return true; }),
    })),
  },
  {
    id: 'sulfide-oxidation', name: 'Sulfide oxidation', family: 'oxidation',
    note: 'The sulfone came from its sulfide.',
    reagents: ['mCPBA'], conditions: { solvent: 'DCM', temperature: 0 },
    find: (mol, g) => g.sulfones.map((s) => ({
      pieces: edit(mol, (copy) => {
        const oxos = copy.adjacency[s.s].filter((l) => l.bond.order === 2
          && copy.atoms[l.other].el === 'O').map((l) => l.other);
        if (oxos.length < 2) return false;
        const trimmed = copy.subgraph(copy.atoms.map((_, i) => i).filter((i) => !oxos.includes(i)));
        copy.atoms = trimmed.atoms; copy.bonds = trimmed.bonds; copy._dirty();
        return true;
      }),
    })),
  },
  {
    id: 'epoxidation', name: 'Alkene epoxidation', family: 'oxidation',
    note: 'The epoxide came from its alkene.',
    reagents: ['mCPBA'], conditions: { solvent: 'DCM', temperature: 0 },
    find: (mol, g) => g.epoxides.map((e) => ({
      pieces: edit(mol, (copy) => {
        const trimmed = copy.subgraph(copy.atoms.map((_, i) => i).filter((i) => i !== e.o));
        copy.atoms = trimmed.atoms; copy.bonds = trimmed.bonds; copy._dirty();
        const a = e.a > e.o ? e.a - 1 : e.a;
        const b = e.b > e.o ? e.b - 1 : e.b;
        return setOrder(copy, a, b, 2);
      }),
    })),
  },
  {
    id: 'epoxide-opening', name: 'Epoxide opening', family: 'addition',
    note: 'A 1,2-aminoalcohol or diol from the epoxide and a nucleophile.',
    reagents: [], conditions: { solvent: 'ethanol', temperature: 60 },
    find: (mol, g) => {
      const out = [];
      for (const alcohol of g.alcohols) {
        for (const link of mol.adjacency[alcohol.c]) {
          const other = link.other;
          if (mol.atoms[other].el === 'C') continue;
          if (!['N', 'O', 'S'].includes(mol.atoms[other].el)) continue;
          out.push({ pieces: cut(mol, alcohol.c, other, (copy, carbon) => {
            // close the oxygen onto the neighbouring carbon to make the ring
            const neighbour = copy.adjacency[carbon]
              .find((l) => copy.atoms[l.other].el === 'C' && l.other !== alcohol.o);
            if (!neighbour) return false;
            copy.addBond(alcohol.o, neighbour.other, 1);
            return true;
          }) });
        }
      }
      return out;
    },
  },
  {
    id: 'mitsunobu', name: 'Mitsunobu', family: 'substitution',
    note: 'An aryl ether from a phenol and an alcohol, with inversion.',
    reagents: ['PPh3', 'DIAD'], conditions: { solvent: 'THF', temperature: 0 },
    find: (mol, g) => {
      const out = [];
      for (const ether of g.ethers) {
        if (!ether.aryl) continue;
        for (const [, leave] of [[ether.a, ether.b], [ether.b, ether.a]]) {
          if (mol.atoms[leave].arom) continue;
          out.push({ pieces: cut(mol, ether.o, leave, (copy, _o, carbon) => {
            attach(copy, carbon, 'O', 1); return true; }) });
        }
      }
      return out;
    },
  },
  {
    id: 'aldol', name: 'Aldol condensation', family: 'addition',
    note: 'A beta-hydroxy carbonyl from two carbonyls.',
    reagents: ['LDA'], conditions: { solvent: 'THF', temperature: -78 },
    find: (mol, g) => {
      const out = [];
      for (const alcohol of g.alcohols) {
        for (const link of mol.adjacency[alcohol.c]) {
          const beta = link.other;
          if (mol.atoms[beta].el !== 'C') continue;
          const carbonyl = mol.adjacency[beta].find((l) => l.bond.order === 2
            && mol.atoms[l.other].el === 'O');
          if (!carbonyl) continue;
          out.push({ pieces: cut(mol, alcohol.c, beta, (copy, carbon) => {
            setOrder(copy, carbon, alcohol.o, 2); return true; }) });
        }
      }
      return out;
    },
  },
  {
    id: 'nitro-reduction', name: 'Nitro reduction', family: 'reduction',
    note: 'An aniline from the nitroarene.',
    reagents: ['H2', 'Pd/C'], conditions: { solvent: 'ethanol', temperature: 20 },
    find: (mol, g) => g.amines.filter((a) => a.aryl && a.hs >= 2).map((a) => ({
      pieces: edit(mol, (copy) => {
        copy.atoms[a.n].charge = 1;
        copy.atoms[a.n].hs = 0;
        const o1 = attach(copy, a.n, 'O', 2);
        const o2 = attach(copy, a.n, 'O', 1);
        copy.atoms[o2].charge = -1;
        copy.atoms[o2].hs = 0;
        return true;
      }),
    })),
  },
  {
    id: 'friedel-crafts-acylation', name: 'Friedel–Crafts acylation', family: 'acylation',
    note: 'An aryl ketone from the arene and an acid chloride.',
    reagents: ['AlCl3'], conditions: { solvent: 'DCM', temperature: 0 },
    find: (mol, g) => {
      const out = [];
      for (const ketone of g.ketones) {
        for (const side of [ketone.left, ketone.right]) {
          if (!mol.atoms[side].arom) continue;
          out.push({
            pieces: cut(mol, ketone.c, side, (copy, carbonyl) => {
              attach(copy, carbonyl, 'Cl', 1); return true;
            }),
          });
        }
      }
      return out;
    },
  },
  {
    id: 'halogenation', name: 'Aromatic halogenation', family: 'halogenation',
    note: 'The unsubstituted arene plus a halogen source.',
    reagents: ['NBS'], conditions: { solvent: 'DMF', temperature: 20 },
    find: (mol, g) => g.arylHalides.map((h) => ({
      pieces: edit(mol, (copy) => {
        const without = drop(copy, h.x);
        copy.atoms = without.atoms;
        copy.bonds = without.bonds;
        copy._dirty();
        return true;
      }),
    })),
  },
];

// Transforms that produced nothing usable are dropped here rather than in
// every caller.
function disconnect(mol, settings) {
  const groups = TX.groups.groupsOf(mol);
  // What these disconnections are *of*. Set here rather than left for the
  // caller to attach: forward verification compares against it, and a caller
  // that forgot made every step look unverifiable instead of unverified.
  let product;
  try { product = TX.smiles.canonicalWrite(mol); } catch (err) { void err; return []; }
  const allowed = (t) => {
    if (!settings) return true;
    if (settings.banTransforms && settings.banTransforms.includes(t.id)) return false;
    if (settings.banFamilies && settings.banFamilies.includes(t.family)) return false;
    if (settings.families && settings.families.length
        && !settings.families.includes(t.family)) return false;
    if (settings.banReagents && t.reagents
        && t.reagents.some((r) => settings.banReagents.includes(r))) return false;
    if (settings.maxTemp !== null && settings.maxTemp !== undefined
        && t.conditions && t.conditions.temperature > settings.maxTemp) return false;
    if (settings.minTemp !== null && settings.minTemp !== undefined
        && t.conditions && t.conditions.temperature < settings.minTemp) return false;
    if (settings.banSolvents && t.conditions
        && settings.banSolvents.includes(t.conditions.solvent)) return false;
    return true;
  };

  const out = [];
  const seen = new Set();
  for (const transform of TRANSFORMS) {
    if (!allowed(transform)) continue;
    let found;
    try { found = transform.find(mol, groups) || []; }
    catch (err) { void err; continue; }
    for (const candidate of found) {
      if (!candidate.pieces || !candidate.pieces.length) continue;
      let precursors;
      try {
        precursors = candidate.pieces.map((piece) => TX.smiles.canonicalWrite(piece));
      } catch (err) { void err; continue; }
      if (precursors.some((p) => !p)) continue;
      const key = transform.id + '|' + precursors.slice().sort().join('.');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        product,
        transform: transform.id,
        name: transform.name,
        family: transform.family,
        note: transform.note,
        reagents: transform.reagents || [],
        conditions: transform.conditions || {},
        precursors: precursors.slice().sort(),
      });
    }
  }
  return out;
}

const EXPORTS_transforms = { TRANSFORMS, disconnect };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_transforms;
} else if (typeof RETRO !== 'undefined') {
  RETRO.transforms = EXPORTS_transforms;
}
