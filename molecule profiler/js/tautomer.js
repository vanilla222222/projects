'use strict';
// Restricted amide/lactam to imidic-acid/lactim normalization. Many externally sourced rows
// store an amide drawn as its iminol tautomer, which overstates TPSA and the donor count;
// TAUTOMER-ARTEFACT.md measures the scale and explains why the transform is restricted to
// this one shift rather than a general tautomer canonicalization. This module deliberately does
// not touch js/descriptors.js: that file's sha256 is pinned in thirteen validation and regression
// records as the code a past result was produced against, so callers ask for the normalized view
// through tautomerView() instead and the stored descriptors stay byte-identical. A ring nitrogen can accept
// only one hydrogen, so at most one lactim per nitrogen is converted: 2,6-dihydroxypyridine
// becomes the 2-pyridone, not an impossible double lactam.
const ACYCLIC = '[CX3](=[NX2])[OX2H1]';
const AROMATIC = '[$(c:n)][OX2H1]';

function plainAtom(atom) {
  return !atom.bracket && !atom.charge && !atom.isotope && atom.explicitH === null;
}

function acyclicSites(mol) {
  const sites = [];
  for (const atom of mol.atoms) {
    if (atom.element !== 'C' || atom.aromatic) continue;
    let imine = null;
    let hydroxyl = null;
    for (const link of atom.neighbors) {
      const other = mol.atoms[link.atom];
      const bond = mol.bonds[link.bond];
      if (other.element === 'N' && bond.order === 2 && !bond.aromatic && !other.aromatic) imine = link;
      else if (other.element === 'O' && bond.order === 1 && !bond.aromatic
        && other.degree === 1 && other.totalH === 1) hydroxyl = link;
    }
    if (imine && hydroxyl && plainAtom(mol.atoms[imine.atom]) && plainAtom(mol.atoms[hydroxyl.atom])) {
      sites.push({ carbon: atom.index, imine: imine.bond, hydroxyl: hydroxyl.bond });
    }
  }
  return sites;
}

function aromaticSites(mol) {
  const sites = [];
  for (const atom of mol.atoms) {
    if (atom.element !== 'O' || atom.totalH !== 1 || atom.degree !== 1) continue;
    const link = atom.neighbors[0];
    const carbon = mol.atoms[link.atom];
    const bond = mol.bonds[link.bond];
    if (!carbon.aromatic || carbon.element !== 'C' || bond.order !== 1 || bond.aromatic) continue;
    let nitrogen = null;
    for (const ring of carbon.neighbors) {
      const other = mol.atoms[ring.atom];
      if (other.element === 'N' && other.aromatic && mol.bonds[ring.bond].aromatic
        && other.totalH === 0 && plainAtom(other)) nitrogen = other.index;
    }
    if (nitrogen !== null && plainAtom(atom)) {
      sites.push({ oxygen: atom.index, bond: link.bond, nitrogen });
    }
  }
  const claimed = new Set();
  return sites.filter((site) => {
    if (claimed.has(site.nitrogen)) return false;
    claimed.add(site.nitrogen);
    return true;
  });
}

function normalizeTautomer(mol) {
  const acyclic = acyclicSites(mol);
  const aromatic = aromaticSites(mol);
  if (!acyclic.length && !aromatic.length) return { changed: false, sites: 0, mol };
  const atoms = mol.atoms.map((atom) => Object.assign({}, atom));
  const bonds = mol.bonds.map((bond) => Object.assign({}, bond));
  for (const site of acyclic) {
    bonds[site.imine].order = 1;
    bonds[site.hydroxyl].order = 2;
  }
  for (const site of aromatic) {
    bonds[site.bond].order = 2;
    atoms[site.nitrogen] = Object.assign({}, atoms[site.nitrogen], { bracket: true, explicitH: 1 });
  }
  return {
    changed: true,
    sites: acyclic.length + aromatic.length,
    acyclic: acyclic.length,
    aromatic: aromatic.length,
    mol: buildMolecule({ atoms, bonds })
  };
}

function tautomerView(mol, descriptors) {
  const result = normalizeTautomer(mol);
  if (!result.changed) return { normalized: false, sites: 0 };
  return {
    normalized: true,
    sites: result.sites,
    acyclic: result.acyclic,
    aromatic: result.aromatic,
    tpsa: descriptors.tpsa(result.mol),
    hbd: descriptors.lipinskiHBD(result.mol),
    hbdStrict: descriptors.strictHBD(result.mol)
  };
}

if (typeof module !== 'undefined' && module.exports) {
  const molModule = require('./mol.js');
  global.buildMolecule = molModule.buildMolecule;
  module.exports = { normalizeTautomer, tautomerView, acyclicSites, aromaticSites, ACYCLIC, AROMATIC };
}
