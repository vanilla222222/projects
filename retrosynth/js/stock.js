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
  // --- a wider shelf -------------------------------------------------------
  // The catalogue was the binding constraint, not the chemistry: targets came
  // back unsolvable because a perfectly ordinary starting material was absent.
  // These are the racks a synthetic lab actually orders from.
  // anhydrides and activated acyl donors, which is how acylations really run
  + 'CC(=O)OC(C)=O O=C(OC(=O)C1CC1)C1CC1 ClC(=O)OCC ClC(=O)OC(C)C O=C(Cl)C(Cl)=O '
  + 'ClC(=O)c1ccc(Cl)cc1 ClC(=O)c1ccc(OC)cc1 ClC(=O)CCl ClC(=O)C(C)(C)C '
  // aliphatic acids and diacids
  + 'CC(C)C(O)=O CC(C)(C)C(O)=O OC(=O)C1CC1 OC(=O)C1CCC1 OC(=O)C1CCCCC1 '
  + 'OC(=O)CC(C)C OC(=O)CCc1ccccc1 OC(=O)Cc1ccccc1 OC(=O)CCl OC(=O)CBr OC(=O)C(F)(F)F '
  + 'OC(=O)CCC(O)=O OC(=O)CCCC(O)=O OC(=O)c1ccccc1F OC(=O)c1ccccc1Cl OC(=O)c1ccccc1OC '
  // amines: primary, secondary, cyclic, benzylic
  + 'CC(C)N CC(C)(C)N NC1CC1 NC1CCC1 NC1CCCC1 NC1CCCCC1 NCC1CC1 NCCc1ccccc1 '
  + 'CN(C)C CCN(CC)CC C1CCNC1 C1CNC1 CN1CCNCC1 OC1CCN(C)CC1 NCCN(C)C NCCOC '
  + 'NCc1ccncc1 NCc1cccnc1 NCc1ccco1 NCc1cccs1 Nc1ncccn1 Nc1ccccn1 Nc1cccnc1 '
  // alcohols and diols
  + 'OCC1CC1 OCc1ccncc1 OC1CCCCC1 OC1CCNCC1 OCCOC OCCN OCC(F)(F)F OC(C)(C)C '
  + 'OCCCCO OCC(O)CO C1CCC(O)CC1 '
  // aryl halides across the substitution patterns a coupling needs
  + 'Brc1ccc(OC(F)(F)F)cc1 Brc1ccc(C(F)(F)F)cc1 Brc1ccc(S(C)(=O)=O)cc1 '
  + 'Brc1cccc(C(O)=O)c1 Brc1cccc(N)c1 Brc1cccc(O)c1 Brc1cccc(OC)c1 Brc1cccc(C#N)c1 '
  + 'Brc1ccc(N(C)C)cc1 Brc1ccc(O)cc1 Brc1ccc(CO)cc1 Brc1ccc(C=O)cc1 Brc1ccc(C(C)=O)cc1 '
  + 'Ic1ccccc1 Ic1ccc(OC)cc1 Ic1ccncc1 Clc1ccccc1Cl Clc1ccc(C(F)(F)F)cc1 '
  + 'Brc1ccncn1 Brc1cnccn1 Brc1ccc2ncccc2c1 Brc1ccc2[nH]ccc2c1 Brc1cc2ccccc2o1 '
  // boronic acids and esters, the other half of every Suzuki
  + 'OB(O)c1ccc(F)c(F)c1 OB(O)c1ccc(OC(F)(F)F)cc1 OB(O)c1ccc(C(F)(F)F)cc1 '
  + 'OB(O)c1cccc(C(O)=O)c1 OB(O)c1cccc(N)c1 OB(O)c1cccc(OC)c1 OB(O)c1ccc(O)cc1 '
  + 'OB(O)c1ccncn1 OB(O)c1cnccn1 OB(O)c1cc[nH]c1 OB(O)c1ccc2[nH]ccc2c1 '
  + 'OB(O)C1CC1 OB(O)C1CCCCC1 CC1(C)OB(OC1(C)C)c1ccccc1 '
  // heteroaryl cores
  + 'c1ccc2ncccc2c1 c1cnc2ccccc2c1 c1ccc2nccnc2c1 c1cnccn1 c1cncnc1 c1cc2ccccc2[nH]1 '
  + 'c1cc2ccccc2o1 c1cc2ccccc2s1 c1cnn[nH]1 c1cn[nH]c1 c1cnoc1 c1cnsc1 c1ncco1 c1nccs1 '
  + 'Clc1ncccn1 Clc1ccncn1 Clc1nccs1 Clc1ncco1 Clc1ccc2ncccc2c1 Nc1nccs1 Nc1ncco1 '
  + 'Oc1ncccn1 O=c1cc[nH]cn1 O=c1[nH]cnc2[nH]cnc12 '
  // saturated rings: the fragments modern medicinal chemistry is built from
  + 'C1COCCO1 C1CCOC1 C1CCSC1 C1CNCCO1 C1CN(C)CCN1 O=C1CCCN1 O=C1CCNC1 O=C1CCCCN1 '
  + 'OC1CCOCC1 NC1COC1 NC1CCOCC1 OC1CCC(N)CC1 OC(=O)C1CCNCC1 OC(=O)C1CCOCC1 '
  + 'OC(=O)C1CC1 CC1(C)CCNCC1 FC1(F)CCNCC1 N1CCC2(CC1)CCOCC2 '
  // sulfonyl chlorides and sulfonamides
  + 'CS(=O)(=O)Cl CCS(=O)(=O)Cl ClS(=O)(=O)c1ccccc1 ClS(=O)(=O)c1ccc(C)cc1 '
  + 'ClS(=O)(=O)c1ccc(F)cc1 NS(=O)(=O)c1ccccc1 CS(C)=O '
  // aldehydes and ketones
  + 'O=Cc1ccc(F)cc1 O=Cc1ccc(C#N)cc1 O=Cc1ccc(N(C)C)cc1 O=Cc1cccnc1 O=Cc1cccs1 '
  + 'O=Cc1ccc2ccccc2c1 O=CC1CCCCC1 CC(=O)c1ccc(F)cc1 CC(=O)c1ccc(OC)cc1 '
  + 'O=C1CCN(C)CC1 O=C1CCOCC1 O=C1CCC(=O)C1 CC(=O)CC(=O)OCC '
  // alkyl halides, tosylates, and other electrophiles
  + 'CCCCCBr BrCCCCBr ClCCCl BrCC(F)(F)F ICCI CCCI BrC1CCCCC1 BrCc1ccncc1 '
  + 'ClCc1ccccc1Cl BrCC(=O)c1ccccc1 CC(Br)C(O)=O '
  // alkenes, alkynes and nitriles
  + 'C=CCN C=CCO C=CC1CC1 C#CCO C#CCN C#CC(C)(C)O C#Cc1ccncc1 CCC#N CC(C)C#N '
  + 'N#CCC#N N#Cc1ccncc1 N#Cc1ccc(F)cc1 '
  // amino acids and chiral pool
  + 'C[C@@H](N)C(O)=O N[C@@H](CC(O)=O)C(O)=O N[C@@H](Cc1ccccc1)C(O)=O '
  + 'N[C@@H](CO)C(O)=O N[C@@H](C(C)C)C(O)=O OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O '
  + 'C[C@H](O)C(O)=O O[C@H](C(O)=O)[C@@H](O)C(O)=O '
  // protecting groups and coupling reagents that appear as precursors
  + 'O=C(OCc1ccccc1)Cl CC(C)(C)[Si](Cl)(c1ccccc1)c1ccccc1 CC(C)[Si](Cl)(C(C)C)C(C)C '
  + 'COc1ccc(CCl)cc1 O=C1c2ccccc2C(=O)N1O '
  // substituted saturated rings. Every one of these turned up as the missing
  // half of a route that was otherwise complete, which is the shape the gap
  // always takes: not absent chemistry, an absent shelf.
  + 'c1ccc(C2CCNCC2)cc1 OC(=O)C1CCN(C(=O)OC(C)(C)C)CC1 OC(=O)C1CCNCC1 '
  + 'CC(C)(C)OC(=O)N1CCNCC1 CC(C)(C)OC(=O)N1CCC(N)CC1 CC(C)(C)OC(=O)N1CCC(O)CC1 '
  + 'CC(C)(C)OC(=O)N1CCC(=O)CC1 CC(C)(C)OC(=O)N1CCC(C(O)=O)CC1 '
  + 'c1ccc(N2CCNCC2)cc1 CN1CCC(N)CC1 OC1CCN(Cc2ccccc2)CC1 '
  // the aryl propanoic acids and their precursors
  + 'CC(C)Cc1ccccc1 CC(C)Cc1ccc(C(C)=O)cc1 CC(C)Cc1ccc(C=O)cc1 CC(c1ccccc1)C(O)=O '
  + 'CC(C)Cc1ccc(C(C)O)cc1 CC(=O)c1ccc(C)cc1 '
).trim().split(/\s+/);

function makeStock(smilesModule, options) {
  const o = options || {};
  const smallEnough = o.maxHeavyAtoms === undefined ? 3 : o.maxHeavyAtoms;
  const canonical = new Set();
  const failed = [];
  const inventory = new Set();

  function add(text, owned) {
    try {
      const key = smilesModule.canonical(text);
      if (key) {
        canonical.add(key);
        if (owned) inventory.add(key);
      }
      return true;
    } catch (err) { failed.push(text); return false; }
  }

  for (const entry of (o.catalogue || STOCK_SMILES)) add(entry);
  for (const entry of (o.inventory || [])) add(entry, true);

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
        try {
          const atoms = (mol || smilesModule.parse(key)).atoms;
          found = atoms.filter(atom => atom.el !== 'H').length <= smallEnough;
        } catch (err) { void err; }
      }
      cache.set(key, found);
      return found;
    },
    source(key) {
      if (inventory.has(key)) return 'inventory';
      if (canonical.has(key)) return 'built-in stock';
      return this.has(key) ? 'assumed small molecule' : null;
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
