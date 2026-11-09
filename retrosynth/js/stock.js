'use strict';
// Where a route is allowed to stop.
//
// chem lab's planner stops at a depth limit, which answers a different
// question: it tells you three steps of chemistry, not how to make the thing.
// A route should end where you can place an order, so the stopping rule is a
// catalogue.
//
// The built-in list is the shelf of an ordinary synthetic lab - feedstocks,
// common building blocks, the reagents the transforms themselves produce -
// written out rather than derived, so it can be read and argued with. Two
// other rules sit alongside it: anything small enough is a commodity, and
// anything the user says they already have is free.

const STOCK_SMILES = (
  // solvents and one-carbon sources
  'C O CO C=O OC=O CC(O)=O CCO CC(C)O CCCO CCCCO OCCO OCCCO '
  // simple acids, amines, alcohols
  + 'N CN CCN CCCN CCCCN NCCN CNC CCNCC NC(=O)C NCCO '
  + 'CC(=O)Cl CCC(O)=O CCCC(O)=O OC(=O)C(O)=O OC(=O)CC(O)=O '
  // halides and alkylating agents
  + 'CBr CI CCBr CCI CCCBr BrCC=C BrCc1ccccc1 ClCc1ccccc1 CS(=O)(=O)OC '
  // benzene and its common substituted forms
  + 'c1ccccc1 Cc1ccccc1 Oc1ccccc1 Nc1ccccc1 Brc1ccccc1 Ic1ccccc1 Clc1ccccc1 '
  + 'OC(=O)c1ccccc1 O=Cc1ccccc1 CC(=O)c1ccccc1 N#Cc1ccccc1 O=[N+]([O-])c1ccccc1 '
  + 'OB(O)c1ccccc1 Nc1ccc(Br)cc1 Oc1ccc(Br)cc1 OC(=O)c1ccc(Br)cc1 '
  + 'Cc1ccc(S(=O)(=O)Cl)cc1 Cc1ccc(S(=O)(=O)O)cc1 '
  // di-substituted benzenes, the usual coupling partners
  + 'Brc1ccccc1Br Brc1ccc(Br)cc1 Nc1ccccc1N OC(=O)c1ccccc1C(O)=O '
  + 'OB(O)c1ccc(F)cc1 OB(O)c1ccc(Cl)cc1 OB(O)c1ccc(C)cc1 OB(O)c1ccc(OC)cc1 '
  // heterocycles a medicinal chemist starts from
  + 'c1ccncc1 c1ccc2ccccc2c1 c1cc[nH]c1 c1ccoc1 c1ccsc1 c1cnc[nH]1 c1ccc2[nH]ccc2c1 '
  + 'Brc1ccncc1 Nc1ccncc1 OC(=O)c1ccncc1 Clc1ccncc1 Clc1ncccn1 Brc1cccnc1 '
  + 'O=c1cc[nH]c(=O)[nH]1 c1cnc2[nH]ccc2c1 '
  // carbonyls and building blocks
  + 'CC(C)=O CCC(C)=O O=C1CCCCC1 O=C1CCCC1 CC(=O)CC(C)=O O=CC=O '
  + 'C=CC(O)=O C=CC#N C=CC=O CC(=C)C(O)=O '
  // protecting-group reagents
  + 'CC(C)(C)OC(=O)OC(=O)OC(C)(C)C O=C(Cl)OCc1ccccc1 C[Si](C)(C)Cl CC(C)(C)[Si](C)(C)Cl '
  // rings and chains
  + 'C1CC1 C1CCC1 C1CCCC1 C1CCCCC1 C1CCNCC1 C1CCOCC1 C1CNCCN1 C1COCCN1 '
  + 'OC1CCNCC1 NC1CCNCC1 O=C1CCNCC1 C1CC1N '
  // small acids, amino acids, sulfur
  + 'CSC CS CCS OS(=O)(=O)O NS(=O)(=O)O C[C@H](N)C(O)=O NCC(O)=O '
  + 'OCC(N)CO OC(=O)CN OC(=O)[C@@H]1CCCN1 '
  // alkynes, nitriles, azides
  + 'C#C C#CC C#Cc1ccccc1 CC#N N=[N+]=[N-] '
  // phenols and hydroxy acids, which turn up as halves of half the esters
  // in the catalogue and were conspicuously missing: without salicylic acid
  // the engine could not finish aspirin, which is the one route everybody
  // tries first.
  + 'Oc1ccccc1C(O)=O Oc1ccccc1C=O Oc1ccc(C(O)=O)cc1 Oc1ccccc1C Oc1ccc(C)cc1 '
  + 'Oc1ccc(Cl)cc1 Oc1ccc(OC)cc1 COc1ccccc1 COc1ccc(C=O)cc1 OCc1ccccc1 '
  // boronic acids. A Suzuki needs one on the shelf or the coupling is just a
  // longer way of saying no.
  + 'OB(O)C OB(O)CC OB(O)C=C OB(O)c1ccncc1 OB(O)c1cccnc1 OB(O)c1ccc(N)cc1 '
  + 'OB(O)c1ccc(C(O)=O)cc1 OB(O)c1ccc(C#N)cc1 OB(O)c1ccccc1C OB(O)c1cccs1 '
  + 'OB(O)c1ccc2ccccc2c1 OB(O)c1ccc(CO)cc1 OB(O)c1ccc([N+]([O-])=O)cc1 '
  // aryl halides to couple them with
  + 'Brc1ccc(C)cc1 Brc1ccc(OC)cc1 Brc1ccc(C#N)cc1 Brc1ccc(C(O)=O)cc1 '
  + 'Brc1ccc([N+]([O-])=O)cc1 Brc1ccc(F)cc1 Ic1ccc(C)cc1 Clc1ccc(C#N)cc1 '
  + 'Brc1cccc(Br)c1 Brc1ccc2ccccc2c1 Brc1ccsc1 Brc1cc[nH]c1 '
  // amines and anilines
  + 'Nc1ccc(C)cc1 Nc1ccc(OC)cc1 Nc1ccc(F)cc1 Nc1ccc(Cl)cc1 Nc1ccc(C(O)=O)cc1 '
  + 'Nc1ccccc1C(O)=O Nc1ccccc1O NCc1ccccc1 CNc1ccccc1 Nc1ccc(S(N)(=O)=O)cc1 '
  // acids and acid chlorides
  + 'OC(=O)c1ccc(C)cc1 OC(=O)c1ccc(OC)cc1 OC(=O)c1ccc(Cl)cc1 OC(=O)c1ccc(F)cc1 '
  + 'OC(=O)c1ccc([N+]([O-])=O)cc1 OC(=O)c1cccnc1 OC(=O)c1ccco1 OC(=O)c1cccs1 '
  + 'ClC(=O)c1ccccc1 OC(=O)CCC(O)=O OC(=O)C=CC(O)=O OC(=O)CCCCC(O)=O '
  // aldehydes and ketones
  + 'O=Cc1ccc(C)cc1 O=Cc1ccc(OC)cc1 O=Cc1ccc(Cl)cc1 O=Cc1ccncc1 O=Cc1ccco1 '
  + 'CCC=O CCCC=O CC(C)C=O O=CC1CC1 CC(=O)CC '
  // alkyl halides and sulfonates
  + 'CCCCBr BrCCBr BrCCCBr ICC CCOS(C)(=O)=O BrCC(=O)OCC BrCC#N '
).trim().split(/\s+/);

function makeStock(smilesModule, options) {
  const o = options || {};
  const smallEnough = o.maxHeavyAtoms === undefined ? 3 : o.maxHeavyAtoms;
  const canonical = new Set();
  const failed = [];

  function add(text) {
    try {
      const key = smilesModule.canonical(text);
      if (key) canonical.add(key);
      return true;
    } catch (err) { failed.push(text); return false; }
  }

  for (const entry of (o.catalogue || STOCK_SMILES)) add(entry);
  for (const entry of (o.inventory || [])) add(entry);

  const cache = new Map();

  return {
    size: canonical.size,
    rejected: failed,
    // `key` is expected to be an already-canonical SMILES.
    has(key, mol) {
      const hit = cache.get(key);
      if (hit !== undefined) return hit;
      let found = canonical.has(key);
      if (!found && smallEnough > 0) {
        // Anything this small is a commodity. The alternative is a search that
        // patiently takes methanol apart.
        const atoms = mol ? mol.atoms.length
          : (key.match(/[A-Za-z]/g) || []).length;
        found = atoms <= smallEnough;
      }
      cache.set(key, found);
      return found;
    },
    list() { return [...canonical].sort(); },
  };
}

const EXPORTS_stock = { STOCK_SMILES, makeStock };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_stock;
} else if (typeof RETRO !== 'undefined') {
  RETRO.stock = EXPORTS_stock;
}
