const NAME_SMILES = {
  'water': 'O',
  'ammonia': 'N',
  'caffeine': 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C',
  'aspirin': 'CC(=O)Oc1ccccc1C(=O)O',
  'acetylsalicylic acid': 'CC(=O)Oc1ccccc1C(=O)O',
  'paracetamol': 'CC(=O)Nc1ccc(O)cc1',
  'acetaminophen': 'CC(=O)Nc1ccc(O)cc1',
  'ibuprofen': 'CC(C)Cc1ccc(C(C)C(=O)O)cc1',
  'salicylic acid': 'OC(=O)c1ccccc1O',
  'benzene': 'c1ccccc1',
  'toluene': 'Cc1ccccc1',
  'xylene': 'Cc1ccccc1C',
  'o-xylene': 'Cc1ccccc1C',
  'm-xylene': 'Cc1cccc(C)c1',
  'p-xylene': 'Cc1ccc(C)cc1',
  'styrene': 'C=Cc1ccccc1',
  'naphthalene': 'c1ccc2ccccc2c1',
  'anthracene': 'c1ccc2cc3ccccc3cc2c1',
  'pyridine': 'c1ccncc1',
  'pyrrole': 'c1cc[nH]c1',
  'furan': 'c1ccoc1',
  'thiophene': 'c1ccsc1',
  'indole': 'c1ccc2[nH]ccc2c1',
  'imidazole': 'c1c[nH]cn1',
  'quinoline': 'c1ccc2ncccc2c1',
  'isoquinoline': 'c1ccc2cnccc2c1',
  'phenanthrene': 'c1ccc2c(c1)ccc1ccccc12',
  'pyrene': 'c1cc2ccc3cccc4ccc(c1)c2c34',
  'acridine': 'c1ccc2nc3ccccc3cc2c1',
  'carbazole': 'c1ccc2c(c1)[nH]c1ccccc12',
  'fluorene': 'c1ccc2c(c1)Cc1ccccc12',
  'biphenyl': 'c1ccc(cc1)-c1ccccc1',
  'azulene': 'c1ccc2cccc2cc1',
  'indene': 'C1=Cc2ccccc2C1',
  'tetralin': 'c1ccc2CCCCc2c1',
  '1,2,3,4-tetrahydronaphthalene': 'c1ccc2CCCCc2c1',
  'decalin': 'C1CCC2CCCCC2C1',
  'cyclooctatetraene': 'C1=CC=CC=CC=C1',
  '1-naphthol': 'Oc1cccc2ccccc12',
  '2-naphthol': 'Oc1ccc2ccccc2c1',
  '2-methoxynaphthalene': 'COc1ccc2ccccc2c1',
  'benzofuran': 'c1ccc2occc2c1',
  'benzothiophene': 'c1ccc2sccc2c1',
  'benzimidazole': 'c1ccc2[nH]cnc2c1',
  'indazole': 'c1ccc2[nH]ncc2c1',
  'quinoxaline': 'c1ccc2nccnc2c1',
  'coumarin': 'O=c1ccc2ccccc2o1',
  'xanthene': 'c1ccc2c(c1)Cc1ccccc1O2',
  'purine': 'c1ncc2[nH]cnc2n1',
  'pyrimidine': 'c1cncnc1',
  'pyrazine': 'c1cnccn1',
  'pyridazine': 'c1ccnnc1',
  '1,3,5-triazine': 'c1ncncn1',
  'pyrazole': 'c1cc[nH]n1',
  'oxazole': 'c1cocn1',
  'isoxazole': 'c1cnoc1',
  'thiazole': 'c1cscn1',
  'n-methylpyrrole': 'Cn1cccc1',
  '1-methylpyrrole': 'Cn1cccc1',
  '2-chloropyridine': 'Clc1ccccn1',
  '3-chloropyridine': 'Clc1cccnc1',
  '4-chloropyridine': 'Clc1ccncc1',
  'maleic anhydride': 'O=C1OC(=O)C=C1',
  'furan-2,5-dione': 'O=C1OC(=O)C=C1',
  'p-benzoquinone': 'O=C1C=CC(=O)C=C1',
  'dimethyl acetylenedicarboxylate': 'COC(=O)C#CC(=O)OC',
  'dmad': 'COC(=O)C#CC(=O)OC',
  'piperidine': 'C1CCNCC1',
  'pyrrolidine': 'C1CCNC1',
  'morpholine': 'C1COCCN1',
  'piperazine': 'C1CNCCN1',
  'tetrahydrofuran': 'C1CCOC1',
  'thf': 'C1CCOC1',
  '1,4-dioxane': 'C1COCCO1',
  'dioxane': 'C1COCCO1',
  'dmso': 'CS(C)=O',
  'dimethyl sulfoxide': 'CS(C)=O',
  'dmf': 'CN(C)C=O',
  'dimethylformamide': 'CN(C)C=O',
  'n,n-dimethylformamide': 'CN(C)C=O',
  'acetonitrile': 'CC#N',
  'acetone': 'CC(C)=O',
  'diethyl ether': 'CCOCC',
  'ether': 'CCOCC',
  'dichloromethane': 'ClCCl',
  'dcm': 'ClCCl',
  'chloroform': 'ClC(Cl)Cl',
  'carbon tetrachloride': 'ClC(Cl)(Cl)Cl',
  'urea': 'NC(N)=O',
  'phenol': 'Oc1ccccc1',
  'aniline': 'Nc1ccccc1',
  'anisole': 'COc1ccccc1',
  'benzaldehyde': 'O=Cc1ccccc1',
  'benzoic acid': 'OC(=O)c1ccccc1',
  'benzonitrile': 'N#Cc1ccccc1',
  'acetophenone': 'CC(=O)c1ccccc1',
  'benzophenone': 'O=C(c1ccccc1)c1ccccc1',
  'benzyl alcohol': 'OCc1ccccc1',
  'benzyl bromide': 'BrCc1ccccc1',
  'benzyl chloride': 'ClCc1ccccc1',
  'nitrobenzene': '[O-][N+](=O)c1ccccc1',
  'thiophenol': 'Sc1ccccc1',
  'formaldehyde': 'C=O',
  'acetaldehyde': 'CC=O',
  'formic acid': 'OC=O',
  'acetic acid': 'CC(=O)O',
  'acetic anhydride': 'CC(=O)OC(C)=O',
  'acetyl chloride': 'CC(=O)Cl',
  'ethyl acetate': 'CCOC(C)=O',
  'methyl acetate': 'COC(C)=O',
  'oxalic acid': 'OC(=O)C(=O)O',
  'malonic acid': 'OC(=O)CC(=O)O',
  'succinic acid': 'OC(=O)CCC(=O)O',
  'citric acid': 'OC(=O)CC(O)(CC(=O)O)C(=O)O',
  'lactic acid': 'CC(O)C(=O)O',
  'glycerol': 'OCC(O)CO',
  'ethylene glycol': 'OCCO',
  'ethylene': 'C=C',
  'acetylene': 'C#C',
  'propylene': 'CC=C',
  'isobutylene': 'CC(C)=C',
  'isoprene': 'CC(=C)C=C',
  'butadiene': 'C=CC=C',
  'isopropanol': 'CC(C)O',
  'isopropyl alcohol': 'CC(C)O',
  'tert-butanol': 'CC(C)(C)O',
  'triethylamine': 'CCN(CC)CC',
  'pyruvic acid': 'CC(=O)C(=O)O',
  'glycine': 'NCC(=O)O',
  'alanine': 'C[C@H](N)C(=O)O',
  'l-alanine': 'C[C@H](N)C(=O)O',
  'serine': 'N[C@@H](CO)C(=O)O',
  'phenylalanine': 'N[C@@H](Cc1ccccc1)C(=O)O',
  'valine': 'CC(C)[C@H](N)C(=O)O',
  'leucine': 'CC(C)C[C@H](N)C(=O)O',
  'proline': 'OC(=O)[C@@H]1CCCN1',
  'cysteine': 'N[C@@H](CS)C(=O)O',
  'tyrosine': 'N[C@@H](Cc1ccc(O)cc1)C(=O)O',
  'tryptophan': 'N[C@@H](Cc1c[nH]c2ccccc12)C(=O)O',
  'glucose': 'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O',
  'vanillin': 'COc1cc(C=O)ccc1O',
  'menthol': 'CC(C)[C@@H]1CC[C@@H](C)C[C@H]1O',
  'camphor': 'CC1(C)C2CCC1(C)C(=O)C2',
  'cholesterol': 'CC(C)CCC[C@@H](C)[C@H]1CC[C@H]2[C@@H]3CC=C4C[C@@H](O)CC[C@]4(C)[C@H]3CC[C@]12C',
  'nicotine': 'CN1CCC[C@H]1c1cccnc1',
  'dopamine': 'NCCc1ccc(O)c(O)c1',
  'serotonin': 'NCCc1c[nH]c2ccc(O)cc12',
  'adrenaline': 'CNC[C@H](O)c1ccc(O)c(O)c1',
  'epinephrine': 'CNC[C@H](O)c1ccc(O)c(O)c1',
  'histamine': 'NCCc1c[nH]cn1',
  'phenethylamine': 'NCCc1ccccc1',
  'sarcosine': 'CNCC(=O)O',
  'benzylamine': 'NCc1ccccc1',
  'boc anhydride': 'CC(C)(C)OC(=O)OC(=O)OC(C)(C)C',
  'di-tert-butyl dicarbonate': 'CC(C)(C)OC(=O)OC(=O)OC(C)(C)C',
  'tbscl': 'Cl[Si](C)(C)C(C)(C)C',
  'tmscl': 'C[Si](C)(C)Cl',
  'sodium chloride': '[Na+].[Cl-]',
  'sodium hydroxide': '[Na+].[OH-]',
  'potassium hydroxide': '[K+].[OH-]',
  'sodium bicarbonate': '[Na+].OC([O-])=O',
  'sodium carbonate': '[Na+].[Na+].[O-]C([O-])=O',
  'magnesium chloride': '[Mg+2].[Cl-].[Cl-]',
  'calcium carbonate': '[Ca+2].[O-]C([O-])=O',
  'sulfuric acid': 'OS(=O)(=O)O',
  'nitric acid': 'O[N+](=O)[O-]',
  'hydrochloric acid': 'Cl',
  'hydrogen chloride': 'Cl',
  'phosphoric acid': 'OP(=O)(O)O',
  'carbon dioxide': 'O=C=O',
  'carbon monoxide': '[C-]#[O+]',
  'methane': 'C',
  'phenylmagnesium bromide': 'Br[Mg]c1ccccc1',
  'methylmagnesium bromide': 'C[Mg]Br',
  'n-butyllithium': 'CCCC[Li]',
  'butyllithium': 'CCCC[Li]',
  'diethylzinc': 'CC[Zn]CC',
  'tributyltin hydride': 'CCCC[SnH](CCCC)CCCC',
};

const LOOKUP_STEMS = {
  meth: 1, eth: 2, prop: 3, but: 4, pent: 5, hex: 6, hept: 7, oct: 8, non: 9, dec: 10, undec: 11, dodec: 12,
};

const LOOKUP_SUBSTITUENTS = {
  'tert-butyl': 'C(C)(C)C',
  'sec-butyl': 'C(C)CC',
  'isobutyl': 'CC(C)C',
  'isopropyl': 'C(C)C',
  '(propan-2-yl)': 'C(C)C',
  'propan-2-yl': 'C(C)C',
  'trifluoromethyl': 'C(F)(F)F',
  'methyl': 'C',
  'ethyl': 'CC',
  'propyl': 'CCC',
  'butyl': 'CCCC',
  'pentyl': 'CCCCC',
  'hexyl': 'CCCCCC',
  'ethenyl': 'C=C',
  'vinyl': 'C=C',
  'ethynyl': 'C#C',
  'phenyl': 'c%1ccccc%1',
  'benzyl': 'Cc%1ccccc%1',
  'fluoro': 'F',
  'chloro': 'Cl',
  'bromo': 'Br',
  'iodo': 'I',
  'hydroxy': 'O',
  'amino': 'N',
  'nitro': '[N+](=O)[O-]',
  'cyano': 'C#N',
  'methoxy': 'OC',
  'ethoxy': 'OCC',
  'propoxy': 'OCCC',
  'butoxy': 'OCCCC',
  'pentyloxy': 'OCCCCC',
  'hexyloxy': 'OCCCCCC',
  'phenoxy': 'Oc%1ccccc%1',
  '(benzyloxy)': 'OCc%1ccccc%1',
  'benzyloxy': 'OCc%1ccccc%1',
  'formyl': 'C=O',
  'acetyl': 'C(C)=O',
  'carboxy': 'C(=O)O',
  'sulfanyl': 'S',
  'mercapto': 'S',
  '(methylsulfanyl)': 'SC',
  'methylsulfanyl': 'SC',
  'oxo': '=O',
};

const LOOKUP_ARENES = {
  'benzene': null,
  'phenol': 'O',
  'aniline': 'N',
  'benzenamine': 'N',
  'benzoic acid': 'C(=O)O',
  'benzaldehyde': 'C=O',
  'benzonitrile': 'C#N',
  'toluene': 'C',
  'anisole': 'OC',
  'benzenethiol': 'S',
  'acetophenone': 'C(C)=O',
  'benzamide': 'C(N)=O',
};

const LOOKUP_ESTER_ALKYLS = {
  methyl: 'C', ethyl: 'CC', propyl: 'CCC', isopropyl: 'C(C)C', 'propan-2-yl': 'C(C)C', butyl: 'CCCC',
  'tert-butyl': 'C(C)(C)C', benzyl: 'Cc%1ccccc%1', phenyl: 'c%1ccccc%1', vinyl: 'C=C', ethenyl: 'C=C',
};

const LOOKUP_CATIONS = {
  sodium: '[Na+]', potassium: '[K+]', lithium: '[Li+]', caesium: '[Cs+]', cesium: '[Cs+]', ammonium: '[NH4+]',
};

function lookupNormalize(text) {
  return String(text || '').toLowerCase().replace(/[‐-―]/g, '-').replace(/\s+/g, ' ').trim();
}

function lookupRingDigits(smiles) {
  const used = (smiles.replace(/\[[^\]]*\]/g, '').match(/\d/g) || []).map(Number);
  let next = used.length ? Math.max(...used) + 1 : 1;
  const seen = new Map();
  return smiles.replace(/%(\d)/g, (m, local) => {
    if (!seen.has(local)) {
      seen.set(local, next++);
    }
    return String(seen.get(local));
  });
}

function lookupAssemble(skeleton) {
  let counter = 2;
  const renumber = (branch) => {
    const map = new Map();
    return branch.replace(/%(\d)/g, (m, local) => {
      if (!map.has(local)) {
        map.set(local, counter++);
      }
      return String(map.get(local));
    });
  };
  let out = '';
  skeleton.atoms.forEach((atom, index) => {
    if (index > 0) {
      out += { 1: '', 2: '=', 3: '#' }[skeleton.orders[index - 1]] || '';
    }
    out += atom.symbol;
    if (skeleton.ring && index === 0) {
      out += '1';
    }
    if (skeleton.ring && index === skeleton.atoms.length - 1) {
      out += ({ 1: '', 2: '=', 3: '#' }[skeleton.closure] || '') + '1';
    }
    atom.branches.forEach((branch) => {
      out += '(' + renumber(branch) + ')';
    });
  });
  return counter > 10 ? null : out;
}

function lookupLocants(text) {
  return text.split(',').map((part) => part.trim());
}

function lookupParsePrefixes(text) {
  const groups = [];
  let rest = text;
  const names = Object.keys(LOOKUP_SUBSTITUENTS).sort((a, b) => b.length - a.length);
  while (rest.length) {
    const head = /^(?:([\dNn',]+)-)?(di|tri|tetra|penta|hexa)?/.exec(rest);
    const locantText = head[1] ? head[1].replace(/n/g, 'N') : null;
    const multiplier = head[2] ? { di: 2, tri: 3, tetra: 4, penta: 5, hexa: 6 }[head[2]] : 1;
    let after = rest.slice(head[0].length);
    if (after[0] === '(' && after.indexOf(')') > 0) {
      const inner = after.slice(1, after.indexOf(')'));
      if (Object.prototype.hasOwnProperty.call(LOOKUP_SUBSTITUENTS, inner)) {
        after = inner + after.slice(inner.length + 2);
      }
    }
    let name = names.find((n) => after.startsWith(n));
    if (!name && head[2]) {
      after = rest.slice((head[1] ? head[1].length + 1 : 0));
      name = names.find((n) => after.startsWith(n));
      if (name) {
        groups.push({ locants: locantText ? lookupLocants(locantText) : [null], name });
        rest = after.slice(name.length).replace(/^-/, '');
        continue;
      }
    }
    if (!name) {
      return null;
    }
    const locants = locantText ? lookupLocants(locantText) : new Array(multiplier).fill(null);
    if (locants.length !== multiplier) {
      return null;
    }
    groups.push({ locants, name });
    rest = after.slice(name.length).replace(/^-/, '');
  }
  return groups;
}

const LOOKUP_PARENT_RE = /^(.*?)(cyclo)?(meth|eth|prop|but|pent|hex|hept|oct|non|undec|dodec|dec)(a)?(?:(ane?)|(?:-([\d,]+)-)?(di|tri)?(en|yn))(e)?(?:-([\d,]+)-)?(di|tri|tetra)?(ol|amine|one|al|thiol|nitrile|oic acid|oyl chloride|amide|carboxylic acid)?$/;

function lookupChainSkeleton(match) {
  const [, prefixText, cyclo, stem, , saturated, unsatLocants, unsatMult, unsatKind, finalE, suffixLocants, suffixMult, suffix] = match;
  const length = LOOKUP_STEMS[stem];
  const ring = Boolean(cyclo);
  if (ring && length < 3) {
    return null;
  }
  if (!suffix && !finalE && saturated !== 'ane') {
    return null;
  }
  if (suffix && finalE && !/^(one|ol|al|amine|oic acid|amide|oyl chloride|thiol|nitrile|carboxylic acid)$/.test(suffix)) {
    return null;
  }
  const atoms = Array.from({ length }, () => ({ symbol: 'C', branches: [], nBranches: null }));
  const orders = new Array(Math.max(0, length - 1)).fill(1);
  const skeleton = { atoms, orders, ring, closure: 1 };
  const valid = (loc) => Number.isInteger(loc) && loc >= 1 && loc <= length;
  const setOrder = (loc, order) => {
    if (loc === length && ring) {
      skeleton.closure = order;
    } else if (loc >= 1 && loc < length) {
      orders[loc - 1] = order;
    } else {
      return false;
    }
    return true;
  };
  if (!saturated) {
    const count = unsatMult ? { di: 2, tri: 3 }[unsatMult] : 1;
    const locants = unsatLocants ? lookupLocants(unsatLocants).map(Number) : (length === 2 || (ring && count === 1) ? [1] : null);
    if (!locants || locants.length !== count) {
      return null;
    }
    for (const loc of locants) {
      if (!setOrder(loc, unsatKind === 'en' ? 2 : 3)) {
        return null;
      }
    }
  }
  const nitrogenSubs = [];
  if (suffix) {
    const count = suffixMult ? { di: 2, tri: 3, tetra: 4 }[suffixMult] : 1;
    let locants = suffixLocants ? lookupLocants(suffixLocants).map(Number) : null;
    if (!locants) {
      if (count === 1) {
        locants = [suffix === 'one' && !ring ? 2 : 1];
      } else if (count === 2 && !ring) {
        locants = [1, length];
      } else {
        return null;
      }
    }
    if (locants.length !== count || !locants.every(valid)) {
      return null;
    }
    const chainEnd = (loc) => !ring && (loc === 1 || loc === length);
    for (const loc of locants) {
      const atom = atoms[loc - 1];
      if (suffix === 'ol') {
        atom.branches.push('O');
      } else if (suffix === 'thiol') {
        atom.branches.push('S');
      } else if (suffix === 'amine') {
        atom.nBranches = atom.nBranches || [];
        atom.branches.push('N');
        nitrogenSubs.push(atom);
      } else if (suffix === 'one') {
        if (chainEnd(loc) && length > 1) {
          return null;
        }
        atom.branches.push('=O');
      } else if (['al', 'oic acid', 'nitrile', 'amide', 'oyl chloride'].includes(suffix)) {
        if (!chainEnd(loc)) {
          return null;
        }
        const tail = { al: ['=O'], 'oic acid': ['=O', 'O'], nitrile: ['#N'], amide: ['=O', 'N'], 'oyl chloride': ['=O', 'Cl'] }[suffix];
        atom.branches.push(...tail);
        if (suffix === 'amide') {
          nitrogenSubs.push(atom);
        }
      } else if (suffix === 'carboxylic acid') {
        atom.branches.push('C(=O)O');
      }
    }
  }
  if (prefixText) {
    const groups = lookupParsePrefixes(prefixText);
    if (!groups) {
      return null;
    }
    for (const group of groups) {
      const branch = LOOKUP_SUBSTITUENTS[group.name];
      for (const raw of group.locants) {
        if (raw === 'N' || raw === "N'") {
          const target = nitrogenSubs[raw === 'N' ? 0 : 1];
          if (!target) {
            return null;
          }
          const index = target.branches.map((b) => b[0]).lastIndexOf('N');
          target.branches[index] = target.branches[index] + '(' + branch + ')';
          continue;
        }
        let loc = raw === null ? (ring || length === 1 ? 1 : null) : Number(raw);
        if (loc === null && length === 2) {
          loc = suffix ? 2 : 1;
        }
        if (!valid(loc)) {
          return null;
        }
        atoms[loc - 1].branches.push(branch);
      }
    }
  }
  return skeleton;
}

function lookupAreneSkeleton(prefixText, parent) {
  const atoms = Array.from({ length: 6 }, () => ({ symbol: 'c', branches: [] }));
  const skeleton = { atoms, orders: new Array(5).fill(1), ring: true, closure: 1 };
  if (LOOKUP_ARENES[parent]) {
    atoms[0].branches.push(LOOKUP_ARENES[parent]);
  }
  if (prefixText) {
    const groups = lookupParsePrefixes(prefixText.replace(/-$/, ''));
    if (!groups) {
      return null;
    }
    for (const group of groups) {
      for (const raw of group.locants) {
        const loc = raw === null ? (LOOKUP_ARENES[parent] ? null : 1) : Number(raw);
        if (!Number.isInteger(loc) || loc < 1 || loc > 6 || LOOKUP_SUBSTITUENTS[group.name] === '=O') {
          return null;
        }
        atoms[loc - 1].branches.push(LOOKUP_SUBSTITUENTS[group.name]);
      }
    }
  }
  return skeleton;
}

function lookupSystematic(name) {
  const areneParent = Object.keys(LOOKUP_ARENES).sort((a, b) => b.length - a.length).find((p) => name.endsWith(p));
  if (areneParent) {
    const skeleton = lookupAreneSkeleton(name.slice(0, name.length - areneParent.length), areneParent);
    return skeleton ? lookupAssemble(skeleton) : null;
  }
  const match = LOOKUP_PARENT_RE.exec(name);
  if (!match) {
    return null;
  }
  const skeleton = lookupChainSkeleton(match);
  return skeleton ? lookupAssemble(skeleton) : null;
}

function lookupAcidToEster(acidName, alkylSmiles, anion) {
  const direct = lookupSystematic(acidName);
  const acid = direct ? { smiles: direct } : lookupStructure(acidName, 1);
  if (!acid) {
    return null;
  }
  const smiles = acid.smiles;
  const patterns = [/\(=O\)\(O\)/, /C\(=O\)O(?![\w(])/];
  for (const pattern of patterns) {
    if (pattern.test(smiles)) {
      return smiles.replace(pattern, (m) => (m === '(=O)(O)'
        ? '(=O)(' + (anion ? '[O-]' : 'O' + alkylSmiles) + ')'
        : 'C(=O)' + (anion ? '[O-]' : 'O' + alkylSmiles)));
    }
  }
  return null;
}

let lookupCommonIndex = null;

function lookupCommonTable() {
  if (lookupCommonIndex) {
    return lookupCommonIndex;
  }
  lookupCommonIndex = new Map();
  if (typeof COMMON_NAMES !== 'undefined') {
    Object.keys(COMMON_NAMES).forEach((systematic) => {
      const common = lookupNormalize(COMMON_NAMES[systematic]).replace(/\s*\([^)]*\)$/, '');
      if (!lookupCommonIndex.has(common)) {
        lookupCommonIndex.set(common, []);
      }
      lookupCommonIndex.get(common).push(systematic);
    });
  }
  return lookupCommonIndex;
}

function lookupStructure(text, depth) {
  const name = lookupNormalize(text);
  if (!name || (depth || 0) > 2) {
    return null;
  }
  if (Object.prototype.hasOwnProperty.call(NAME_SMILES, name)) {
    return { smiles: NAME_SMILES[name], source: 'table' };
  }
  const systematic = lookupSystematic(name);
  if (systematic) {
    return { smiles: systematic, source: 'systematic' };
  }
  const words = name.split(' ');
  if (words.length === 2 && /(ate|oate)$/.test(words[1])) {
    const acidName = words[1].replace(/ate$/, 'ic acid');
    if (Object.prototype.hasOwnProperty.call(LOOKUP_CATIONS, words[0])) {
      const anion = lookupAcidToEster(acidName, '', true);
      return anion ? { smiles: LOOKUP_CATIONS[words[0]] + '.' + anion, source: 'systematic' } : null;
    }
    if (Object.prototype.hasOwnProperty.call(LOOKUP_ESTER_ALKYLS, words[0])) {
      const ester = lookupAcidToEster(acidName, LOOKUP_ESTER_ALKYLS[words[0]], false);
      return ester ? { smiles: lookupRingDigits(ester), source: 'systematic' } : null;
    }
  }
  const systematicNames = lookupCommonTable().get(name) || [];
  for (const candidate of systematicNames) {
    const found = lookupStructure(candidate, (depth || 0) + 1);
    if (found) {
      return { smiles: found.smiles, source: 'common' };
    }
  }
  return null;
}

function nameToSmiles(text) {
  const found = lookupStructure(text, 0);
  if (!found) {
    return null;
  }
  try {
    smilesToFragment(found.smiles);
  } catch (error) {
    return null;
  }
  return found;
}
