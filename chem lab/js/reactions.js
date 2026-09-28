const REACTION_SOLVENTS = [
  { id: 'none', name: 'None (neat)', smiles: '', bp: null, dielectric: null, protic: false },
  { id: 'water', name: 'Water', smiles: 'O', bp: 100, dielectric: 80.1, protic: true },
  { id: 'methanol', name: 'Methanol', smiles: 'CO', bp: 65, dielectric: 32.7, protic: true },
  { id: 'ethanol', name: 'Ethanol', smiles: 'CCO', bp: 78, dielectric: 24.5, protic: true },
  { id: 'ipa', name: 'Isopropanol', smiles: 'CC(C)O', bp: 82, dielectric: 17.9, protic: true },
  { id: 'tbuoh', name: 'tert-Butanol', smiles: 'CC(C)(C)O', bp: 82, dielectric: 12.5, protic: true },
  { id: 'acoh', name: 'Acetic acid', smiles: 'CC(=O)O', bp: 118, dielectric: 6.2, protic: true },
  { id: 'dmso', name: 'DMSO', smiles: 'CS(C)=O', bp: 189, dielectric: 46.7, protic: false },
  { id: 'dmf', name: 'DMF', smiles: 'CN(C)C=O', bp: 153, dielectric: 36.7, protic: false },
  { id: 'mecn', name: 'Acetonitrile', smiles: 'CC#N', bp: 82, dielectric: 37.5, protic: false },
  { id: 'acetone', name: 'Acetone', smiles: 'CC(C)=O', bp: 56, dielectric: 20.7, protic: false },
  { id: 'dcm', name: 'Dichloromethane', smiles: 'ClCCl', bp: 40, dielectric: 8.9, protic: false },
  { id: 'chloroform', name: 'Chloroform', smiles: 'ClC(Cl)Cl', bp: 61, dielectric: 4.8, protic: false },
  { id: 'thf', name: 'THF', smiles: 'C1CCOC1', bp: 66, dielectric: 7.6, protic: false },
  { id: 'ether', name: 'Diethyl ether', smiles: 'CCOCC', bp: 35, dielectric: 4.3, protic: false },
  { id: 'dioxane', name: '1,4-Dioxane', smiles: 'C1COCCO1', bp: 101, dielectric: 2.3, protic: false },
  { id: 'etoac', name: 'Ethyl acetate', smiles: 'CCOC(C)=O', bp: 77, dielectric: 6.0, protic: false },
  { id: 'toluene', name: 'Toluene', smiles: 'Cc1ccccc1', bp: 111, dielectric: 2.4, protic: false },
  { id: 'benzene', name: 'Benzene', smiles: 'c1ccccc1', bp: 80, dielectric: 2.3, protic: false },
  { id: 'hexane', name: 'Hexane', smiles: 'CCCCCC', bp: 69, dielectric: 1.9, protic: false },
  { id: 'ccl4', name: 'Carbon tetrachloride', smiles: 'ClC(Cl)(Cl)Cl', bp: 77, dielectric: 2.2, protic: false },
  { id: 'pyridine', name: 'Pyridine', smiles: 'c1ccncc1', bp: 115, dielectric: 12.4, protic: false },
  { id: 'nh3', name: 'Liquid ammonia', smiles: 'N', bp: -33, dielectric: 16.9, protic: true },
];

const REACTION_ADDITIVES = [
  { id: 'h2so4', name: 'H₂SO₄', group: 'Acid', label: 'H2SO4', smiles: 'OS(=O)(=O)O' },
  { id: 'hcl', name: 'HCl', group: 'Acid', label: 'HCl', smiles: 'Cl' },
  { id: 'hbr', name: 'HBr', group: 'Acid', label: 'HBr', smiles: 'Br' },
  { id: 'tsoh', name: 'TsOH', group: 'Acid', label: 'TsOH', smiles: 'Cc1ccc(cc1)S(=O)(=O)O' },
  { id: 'h3po4', name: 'H₃PO₄', group: 'Acid', label: 'H3PO4', smiles: 'OP(=O)(O)O' },
  { id: 'naoh', name: 'NaOH', group: 'Base', label: 'NaOH', smiles: '[Na+].[OH-]' },
  { id: 'koh', name: 'KOH', group: 'Base', label: 'KOH', smiles: '[K+].[OH-]' },
  { id: 'naoet', name: 'NaOEt', group: 'Base', label: 'NaOEt', smiles: '[Na+].CC[O-]' },
  { id: 'kotbu', name: 'KOtBu', group: 'Base', label: 'KOtBu', smiles: '[K+].CC(C)(C)[O-]' },
  { id: 'nah', name: 'NaH', group: 'Base', label: 'NaH', smiles: '[Na+].[H-]' },
  { id: 'lda', name: 'LDA', group: 'Base', label: 'LDA', smiles: '[Li+].CC(C)[N-]C(C)C' },
  { id: 'k2co3', name: 'K₂CO₃', group: 'Base', label: 'K2CO3', smiles: '[K+].[K+].[O-]C([O-])=O' },
  { id: 'et3n', name: 'Et₃N', group: 'Base', label: 'Et3N', smiles: 'CCN(CC)CC' },
  { id: 'pyr', name: 'Pyridine', group: 'Base', label: 'pyridine', smiles: 'c1ccncc1' },
  { id: 'cs2co3', name: 'Cs₂CO₃', group: 'Base', label: 'Cs2CO3', smiles: '[Cs+].[Cs+].[O-]C([O-])=O' },
  { id: 'k3po4', name: 'K₃PO₄', group: 'Base', label: 'K3PO4', smiles: '[K+].[K+].[K+].[O-]P([O-])([O-])=O' },
  { id: 'nanh2', name: 'NaNH₂', group: 'Base', label: 'NaNH2', smiles: '[Na+].[NH2-]' },
  { id: 'imidazole', name: 'Imidazole', group: 'Base', label: 'imidazole', smiles: 'c1cnc[nH]1' },
  { id: 'dmap', name: 'DMAP', group: 'Base', label: 'DMAP', smiles: 'CN(C)c1ccncc1' },
  { id: 'piperidine', name: 'Piperidine', group: 'Base', label: 'piperidine', smiles: '' },
  { id: 'dbu', name: 'DBU', group: 'Base', label: 'DBU', smiles: 'C1CCC2=NCCCN2CC1' },
  { id: 'alcl3', name: 'AlCl₃', group: 'Lewis acid', label: 'AlCl3', smiles: 'Cl[Al](Cl)Cl' },
  { id: 'febr3', name: 'FeBr₃', group: 'Lewis acid', label: 'FeBr3', smiles: 'Br[Fe](Br)Br' },
  { id: 'bf3', name: 'BF₃', group: 'Lewis acid', label: 'BF3', smiles: 'FB(F)F' },
  { id: 'zncl2', name: 'ZnCl₂', group: 'Lewis acid', label: 'ZnCl2', smiles: 'Cl[Zn]Cl' },
  { id: 'pdc', name: 'Pd/C', group: 'Catalyst', label: 'Pd/C', smiles: '' },
  { id: 'pt', name: 'PtO₂', group: 'Catalyst', label: 'PtO2', smiles: '' },
  { id: 'ni', name: 'Raney Ni', group: 'Catalyst', label: 'Raney Ni', smiles: '' },
  { id: 'lindlar', name: 'Lindlar', group: 'Catalyst', label: 'Lindlar', smiles: '' },
  { id: 'pdpph3', name: 'Pd(PPh₃)₄', group: 'Catalyst', label: 'Pd(PPh3)4', smiles: '' },
  { id: 'hgso4', name: 'HgSO₄', group: 'Catalyst', label: 'HgSO4', smiles: '' },
  { id: 'pdoac2', name: 'Pd(OAc)₂', group: 'Catalyst', label: 'Pd(OAc)2', smiles: '' },
  { id: 'cui', name: 'CuI', group: 'Catalyst', label: 'CuI', smiles: '[Cu]I' },
  { id: 'grubbs', name: 'Grubbs II', group: 'Catalyst', label: 'Grubbs II', smiles: '' },
  { id: 'oso4', name: 'OsO₄', group: 'Catalyst', label: 'OsO4', smiles: 'O=[Os](=O)(=O)=O' },
  { id: 'dcc', name: 'DCC', group: 'Coupling', label: 'DCC', smiles: 'C1CCC(CC1)N=C=NC1CCCCC1' },
  { id: 'edc', name: 'EDC', group: 'Coupling', label: 'EDC', smiles: 'CCN=C=NCCCN(C)C' },
  { id: 'dmp', name: 'Dess–Martin', group: 'Oxidant', label: 'DMP', smiles: '' },
  { id: 'jones', name: 'CrO₃ (Jones)', group: 'Oxidant', label: 'CrO3', smiles: 'O=[Cr](=O)=O' },
  { id: 'nmo', name: 'NMO', group: 'Oxidant', label: 'NMO', smiles: 'C[N+]1([O-])CCOCC1' },
  { id: 'nanh3', name: 'Na / NH₃(l)', group: 'Reductant', label: 'Na, NH3(l)', smiles: '' },
  { id: 'znhg', name: 'Zn(Hg)', group: 'Reductant', label: 'Zn(Hg)', smiles: '' },
  { id: 'zncu', name: 'Zn(Cu)', group: 'Reductant', label: 'Zn(Cu)', smiles: '' },
  { id: 'peroxide', name: 'ROOR', group: 'Initiator', label: 'ROOR', smiles: '' },
  { id: 'aibn', name: 'AIBN', group: 'Initiator', label: 'AIBN', smiles: 'CC(C)(C#N)N=NC(C)(C)C#N' },
  { id: 'pdcl2', name: 'PdCl₂', group: 'Catalyst', label: 'PdCl2', smiles: 'Cl[Pd]Cl' },
  { id: 'cucl', name: 'CuCl', group: 'Catalyst', label: 'CuCl', smiles: '[Cu]Cl' },
  { id: 'cubr', name: 'CuBr', group: 'Catalyst', label: 'CuBr', smiles: '[Cu]Br' },
  { id: 'cucn', name: 'CuCN', group: 'Catalyst', label: 'CuCN', smiles: '[Cu]C#N' },
  { id: 'tempo', name: 'TEMPO', group: 'Catalyst', label: 'TEMPO', smiles: '' },
  { id: 'naio4', name: 'NaIO₄', group: 'Oxidant', label: 'NaIO4', smiles: '' },
  { id: 'naclo2', name: 'NaClO₂', group: 'Oxidant', label: 'NaClO2', smiles: '' },
  { id: 'naocl', name: 'NaOCl (bleach)', group: 'Oxidant', label: 'NaOCl', smiles: '[Na+].[O-]Cl' },
  { id: 'mno2', name: 'MnO₂', group: 'Oxidant', label: 'MnO2', smiles: 'O=[Mn]=O' },
  { id: 'tollens', name: 'Tollens’ reagent', group: 'Oxidant', label: 'Ag(NH3)2+', smiles: '' },
  { id: 'zn', name: 'Zn', group: 'Reductant', label: 'Zn', smiles: '[Zn]' },
  { id: 'fe', name: 'Fe', group: 'Reductant', label: 'Fe', smiles: '[Fe]' },
  { id: 'mg', name: 'Mg', group: 'Reductant', label: 'Mg', smiles: '' },
  { id: 'sncl2', name: 'SnCl₂', group: 'Reductant', label: 'SnCl2', smiles: '' },
  { id: 'cecl3', name: 'CeCl₃', group: 'Lewis acid', label: 'CeCl3', smiles: 'Cl[Ce](Cl)Cl' },
  { id: 'dead', name: 'DEAD', group: 'Coupling', label: 'DEAD', smiles: 'CCOC(=O)N=NC(=O)OCC' },
  { id: 'diad', name: 'DIAD', group: 'Coupling', label: 'DIAD', smiles: 'CC(C)OC(=O)N=NC(=O)OC(C)C' },
  { id: 'nano2', name: 'NaNO₂', group: 'Reagent', label: 'NaNO2', smiles: '[Na+].[O-]N=O' },
  { id: 'ki', name: 'KI', group: 'Reagent', label: 'KI', smiles: '[K+].[I-]' },
  { id: 'hbf4', name: 'HBF₄', group: 'Reagent', label: 'HBF4', smiles: '' },
  { id: 'tscl', name: 'TsCl', group: 'Reagent', label: 'TsCl', smiles: 'Cc1ccc(cc1)S(Cl)(=O)=O' },
  { id: 'mscl', name: 'MsCl', group: 'Reagent', label: 'MsCl', smiles: 'CS(Cl)(=O)=O' },
  { id: 'pocl3', name: 'POCl₃', group: 'Reagent', label: 'POCl3', smiles: 'ClP(Cl)(Cl)=O' },
  { id: 'p2o5', name: 'P₂O₅', group: 'Reagent', label: 'P2O5', smiles: '' },
  { id: 'me3si', name: 'Me₃S⁺ I⁻', group: 'Reagent', label: 'Me3SI', smiles: 'C[S+](C)C.[I-]' },
  { id: 'me3soi', name: 'Me₃S(O)⁺ I⁻', group: 'Reagent', label: 'Me3SOI', smiles: '' },
  { id: 'ag2o', name: 'Ag₂O', group: 'Reagent', label: 'Ag2O', smiles: '' },
];

const REACTION_ATMOSPHERES = [
  { id: 'air', name: 'Air', label: '' },
  { id: 'n2', name: 'N₂ (inert)', label: 'N2' },
  { id: 'ar', name: 'Ar (inert)', label: 'Ar' },
  { id: 'h2', name: 'H₂', label: 'H2' },
  { id: 'o2', name: 'O₂', label: 'O2' },
];

const REACTION_ENERGY = [
  { id: 'heat', name: 'Thermal', label: '' },
  { id: 'light', name: 'Light (hν)', label: 'hν' },
  { id: 'microwave', name: 'Microwave', label: 'MW' },
];

const REACTION_ROLES = ['reactant', 'reagent', 'catalyst', 'solvent'];

const REACTION_TEMPERATURE_PRESETS = [
  { id: 'dry-ice', name: '−78 °C', value: -78 },
  { id: 'ice', name: '0 °C', value: 0 },
  { id: 'rt', name: 'rt', value: 25 },
  { id: 'reflux', name: 'Reflux', value: null },
];

const REACTION_LIMITS = { tempMin: -100, tempMax: 300, maxCompounds: 12, maxAdditives: 8, maxSolvents: 3 };

const REACTION_SCHEME_SETTINGS = { gap: 45, plusGap: 30, arrowLength: 150, emptyWidth: 60 };

const REACTION_NAME_ALIASES = {
  bromine: 'BrBr',
  chlorine: 'ClCl',
  iodine: 'II',
  fluorine: 'FF',
  hydrogen: '[H][H]',
  oxygen: 'O=O',
  ozone: '[O-][O+]=O',
  'hydrogen peroxide': 'OO',
  'hydrogen bromide': 'Br',
  'hydrogen chloride': 'Cl',
  'hydrogen iodide': 'I',
  'sulfuric acid': 'OS(=O)(=O)O',
  'nitric acid': 'O[N+](=O)[O-]',
  'sodium hydroxide': '[Na+].[OH-]',
  'potassium hydroxide': '[K+].[OH-]',
  'sodium borohydride': '[Na+].[BH4-]',
  nabh4: '[Na+].[BH4-]',
  'lithium aluminium hydride': '[Li+].[AlH4-]',
  'lithium aluminum hydride': '[Li+].[AlH4-]',
  lialh4: '[Li+].[AlH4-]',
  lah: '[Li+].[AlH4-]',
  'thionyl chloride': 'ClS(Cl)=O',
  socl2: 'ClS(Cl)=O',
  'phosphorus tribromide': 'BrP(Br)Br',
  pbr3: 'BrP(Br)Br',
  nbs: 'BrN1C(=O)CCC1=O',
  'n-bromosuccinimide': 'BrN1C(=O)CCC1=O',
  mcpba: 'OOC(=O)c1cccc(Cl)c1',
  'sodium azide': '[Na+].[N-]=[N+]=[N-]',
  'sodium cyanide': '[Na+].[C-]#N',
  'potassium permanganate': '[K+].[O-][Mn](=O)(=O)=O',
  kmno4: '[K+].[O-][Mn](=O)(=O)=O',
  'methyl iodide': 'CI',
  mei: 'CI',
  'sodium cyanoborohydride': '[Na+].[BH3-]C#N',
  nabh3cn: '[Na+].[BH3-]C#N',
  'sodium triacetoxyborohydride': '[Na+].CC(=O)O[BH-](OC(C)=O)OC(C)=O',
  'nabh(oac)3': '[Na+].CC(=O)O[BH-](OC(C)=O)OC(C)=O',
  stab: '[Na+].CC(=O)O[BH-](OC(C)=O)OC(C)=O',
  buli: 'CCCC[Li]',
  'methylenetriphenylphosphorane': 'C=P(c1ccccc1)(c1ccccc1)c1ccccc1',
  'ethylidenetriphenylphosphorane': 'CC=P(c1ccccc1)(c1ccccc1)c1ccccc1',
  '(carbethoxymethylene)triphenylphosphorane': 'CCOC(=O)C=P(c1ccccc1)(c1ccccc1)c1ccccc1',
  'methyltriphenylphosphonium bromide': 'C[P+](c1ccccc1)(c1ccccc1)c1ccccc1.[Br-]',
  dcc: 'C1CCC(CC1)N=C=NC1CCCCC1',
  'dicyclohexylcarbodiimide': 'C1CCC(CC1)N=C=NC1CCCCC1',
  'n,n\'-dicyclohexylcarbodiimide': 'C1CCC(CC1)N=C=NC1CCCCC1',
  edc: 'CCN=C=NCCCN(C)C',
  dmap: 'CN(C)c1ccncc1',
  '4-dimethylaminopyridine': 'CN(C)c1ccncc1',
  boc2o: 'CC(C)(C)OC(=O)OC(=O)OC(C)(C)C',
  'di-tert-butyl dicarbonate': 'CC(C)(C)OC(=O)OC(=O)OC(C)(C)C',
  tbscl: 'CC(C)(C)[Si](C)(C)Cl',
  'tert-butyldimethylsilyl chloride': 'CC(C)(C)[Si](C)(C)Cl',
  tmscl: 'C[Si](C)(C)Cl',
  'trimethylsilyl chloride': 'C[Si](C)(C)Cl',
  tipscl: 'CC(C)[Si](Cl)(C(C)C)C(C)C',
  tbaf: 'CCCC[N+](CCCC)(CCCC)CCCC.[F-]',
  'tetrabutylammonium fluoride': 'CCCC[N+](CCCC)(CCCC)CCCC.[F-]',
  dibal: 'CC(C)C[AlH]CC(C)C',
  'dibal-h': 'CC(C)C[AlH]CC(C)C',
  'diisobutylaluminium hydride': 'CC(C)C[AlH]CC(C)C',
  oso4: 'O=[Os](=O)(=O)=O',
  'osmium tetroxide': 'O=[Os](=O)(=O)=O',
  nmo: 'C[N+]1([O-])CCOCC1',
  'n-methylmorpholine n-oxide': 'C[N+]1([O-])CCOCC1',
  nanh2: '[Na+].[NH2-]',
  sodamide: '[Na+].[NH2-]',
  'sodium amide': '[Na+].[NH2-]',
  diiodomethane: 'ICI',
  ch2i2: 'ICI',
  diethylzinc: 'CC[Zn]CC',
  cui: '[Cu]I',
  'copper(i) iodide': '[Cu]I',
  hydrazine: 'NN',
  hydroxylamine: 'NO',
  'mercury(ii) acetate': 'CC(=O)O[Hg]OC(C)=O',
  'hg(oac)2': 'CC(=O)O[Hg]OC(C)=O',
  cro3: 'O=[Cr](=O)=O',
  'chromium trioxide': 'O=[Cr](=O)=O',
  pph3: 'c1ccc(cc1)P(c1ccccc1)c1ccccc1',
  triphenylphosphine: 'c1ccc(cc1)P(c1ccccc1)c1ccccc1',
  cbr4: 'BrC(Br)(Br)Br',
  'carbon tetrabromide': 'BrC(Br)(Br)Br',
  tfa: 'OC(=O)C(F)(F)F',
  'trifluoroacetic acid': 'OC(=O)C(F)(F)F',
  'oxalyl chloride': 'ClC(=O)C(=O)Cl',
  '(cocl)2': 'ClC(=O)C(=O)Cl',
  dmso: 'CS(C)=O',
  'carbon dioxide': 'O=C=O',
  co2: 'O=C=O',
  'dry ice': 'O=C=O',
  'phenylboronic acid': 'OB(O)c1ccccc1',
  dbu: 'C1CCC2=NCCCN2CC1',
  'triethyl phosphonoacetate': 'CCOC(=O)CP(=O)(OCC)OCC',
  'diethyl malonate': 'CCOC(=O)CC(=O)OCC',
  'ethyl acetoacetate': 'CCOC(=O)CC(C)=O',
  'malonic acid': 'OC(=O)CC(O)=O',
  'tosyl chloride': 'Cc1ccc(cc1)S(Cl)(=O)=O',
  tscl: 'Cc1ccc(cc1)S(Cl)(=O)=O',
  'mesyl chloride': 'CS(Cl)(=O)=O',
  mscl: 'CS(Cl)(=O)=O',
  dead: 'CCOC(=O)N=NC(=O)OCC',
  diad: 'CC(C)OC(=O)N=NC(=O)OC(C)C',
  pocl3: 'ClP(Cl)(Cl)=O',
  'phosphorus oxychloride': 'ClP(Cl)(Cl)=O',
  formaldehyde: 'C=O',
  'lithium dimethylcuprate': '[Li+].C[Cu-]C',
  'lithium dibutylcuprate': '[Li+].CCCC[Cu-]CCCC',
  'lithium diphenylcuprate': '[Li+].c1ccccc1[Cu-]c1ccccc1',
  mvk: 'CC(=O)C=C',
  'methyl vinyl ketone': 'CC(=O)C=C',
  'sodium hypochlorite': '[Na+].[O-]Cl',
  naocl: '[Na+].[O-]Cl',
  'trimethylsulfonium iodide': 'C[S+](C)C.[I-]',
  'sodium nitrite': '[Na+].[O-]N=O',
  nano2: '[Na+].[O-]N=O',
  'potassium iodide': '[K+].[I-]',
  ki: '[K+].[I-]',
  'ethyl bromoacetate': 'CCOC(=O)CBr',
  'cyclohexanone oxime': 'ON=C1CCCCC1',
  'acetophenone oxime': 'CC(=NO)c1ccccc1',
  pinacol: 'CC(C)(O)C(C)(C)O',
  'hexane-2,5-dione': 'CC(=O)CCC(C)=O',
  '2,5-hexanedione': 'CC(=O)CCC(C)=O',
  'allyl phenyl ether': 'C=CCOc1ccccc1',
  'allyl vinyl ether': 'C=CCOC=C',
  'benzenediazonium chloride': '[Cl-].N#[N+]c1ccccc1',
  '1-fluoro-2,4-dinitrobenzene': 'Fc1ccc(cc1[N+]([O-])=O)[N+]([O-])=O',
  'sanger reagent': 'Fc1ccc(cc1[N+]([O-])=O)[N+]([O-])=O',
  '4-fluoronitrobenzene': 'Fc1ccc(cc1)[N+]([O-])=O',
  '2-methylcyclohexanone': 'CC1CCCCC1=O',
  'cyclohexenone': 'O=C1CCCC=C1',
  'tetramethylammonium hydroxide': 'C[N+](C)(C)C.[OH-]',
};

function reactionAliasSmiles(text) {
  const key = String(text || '').trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(REACTION_NAME_ALIASES, key)) {
    return REACTION_NAME_ALIASES[key];
  }
  const solvent = REACTION_SOLVENTS.find((x) => x.smiles && x.name.toLowerCase() === key);
  if (solvent) {
    return solvent.smiles;
  }
  const additive = REACTION_ADDITIVES.find((x) => x.smiles && (x.label.toLowerCase() === key || x.id === key));
  return additive ? additive.smiles : null;
}

function defaultReactionConditions() {
  return {
    temperature: 25,
    reflux: false,
    solvents: [],
    additives: [],
    atmosphere: 'air',
    energy: 'heat',
    pressure: 1,
    time: '',
    concentration: '',
    notes: '',
  };
}

function reactionSolvent(id) {
  return REACTION_SOLVENTS.find((s) => s.id === id) || null;
}

function reactionAdditive(id) {
  return REACTION_ADDITIVES.find((a) => a.id === id) || null;
}

function reactionRefluxTemperature(conditions) {
  const bps = (conditions.solvents || []).map(reactionSolvent).filter((s) => s && s.bp !== null).map((s) => s.bp);
  return bps.length ? Math.min.apply(null, bps) : null;
}

function reactionEffectiveTemperature(conditions) {
  if (conditions.reflux) {
    const bp = reactionRefluxTemperature(conditions);
    return bp === null ? conditions.temperature : bp;
  }
  return conditions.temperature;
}

function normalizeReactionConditions(raw) {
  const base = defaultReactionConditions();
  const c = raw && typeof raw === 'object' ? raw : {};
  const t = Number(c.temperature);
  if (Number.isFinite(t)) {
    base.temperature = Math.max(REACTION_LIMITS.tempMin, Math.min(REACTION_LIMITS.tempMax, Math.round(t)));
  }
  base.reflux = c.reflux === true;
  if (Array.isArray(c.solvents)) {
    base.solvents = c.solvents.filter((id, i, all) => reactionSolvent(id) && id !== 'none' && all.indexOf(id) === i).slice(0, REACTION_LIMITS.maxSolvents);
  }
  if (Array.isArray(c.additives)) {
    base.additives = c.additives.filter((id, i, all) => reactionAdditive(id) && all.indexOf(id) === i).slice(0, REACTION_LIMITS.maxAdditives);
  }
  if (REACTION_ATMOSPHERES.some((a) => a.id === c.atmosphere)) {
    base.atmosphere = c.atmosphere;
  }
  if (REACTION_ENERGY.some((e) => e.id === c.energy)) {
    base.energy = c.energy;
  }
  const p = Number(c.pressure);
  if (Number.isFinite(p) && p > 0 && p <= 500) {
    base.pressure = p;
  }
  ['time', 'concentration', 'notes'].forEach((key) => {
    if (typeof c[key] === 'string') {
      base[key] = c[key].slice(0, key === 'notes' ? 200 : 40);
    }
  });
  if (base.reflux && reactionRefluxTemperature(base) === null) {
    base.reflux = false;
  }
  return base;
}

function reactionTemperatureText(conditions) {
  const t = reactionEffectiveTemperature(conditions);
  if (conditions.reflux) {
    return 'reflux (' + t + ' °C)';
  }
  if (t >= 20 && t <= 25) {
    return 'rt';
  }
  return (t < 0 ? '−' + Math.abs(t) : String(t)) + ' °C';
}

const REACTION_SHORT_FORMULAS = { AlH4Li: 'LiAlH4', BH4Na: 'NaBH4', HNaO: 'NaOH', HKO: 'KOH', C2H5NaO: 'NaOEt', C4H9KO: 'KOtBu', C6H14LiN: 'LDA', HNa: 'NaH', C4H9Li: 'BuLi', BrH: 'HBr', ClH: 'HCl', FH: 'HF', H2O4S: 'H2SO4', H3O4P: 'H3PO4', HNO3: 'HNO3', Cl2OS: 'SOCl2', Br3P: 'PBr3', H2O2: 'H2O2', C13H22N2: 'DCC', C8H17N3: 'EDC', C7H10N2: 'DMAP', C10H18O5: 'Boc2O', C6H15ClSi: 'TBSCl', C3H9ClSi: 'TMSCl', C9H21ClSi: 'TIPSCl', C8H19Al: 'DIBAL-H', O4Os: 'OsO4', C5H11NO2: 'NMO', H2NNa: 'NaNH2', CuI: 'CuI', H4N2: 'N2H4', H3NO: 'NH2OH', C4H6HgO4: 'Hg(OAc)2', CrO3: 'CrO3', C18H15P: 'PPh3', CBr4: 'CBr4', C2HF3O2: 'TFA', C2Cl2O2: '(COCl)2', C2H6OS: 'DMSO', C4H10Zn: 'Et2Zn', C9H16N2: 'DBU', Cl2Pd: 'PdCl2', ClCu: 'CuCl', BrCu: 'CuBr', CCuN: 'CuCN', ClNaO: 'NaOCl', MnO2: 'MnO2', Cl3OP: 'POCl3', C7H7ClO2S: 'TsCl', CH3ClO2S: 'MsCl', C6H10N2O4: 'DEAD', C8H14N2O4: 'DIAD', NNaO2: 'NaNO2', IK: 'KI', Cl3Ce: 'CeCl3' };

function reactionShortLabel(x) {
  if (x.label) {
    return x.label;
  }
  const abbreviation = /\(([^()]+)\)$/.exec(x.name || '');
  if (abbreviation) {
    return abbreviation[1];
  }
  return REACTION_SHORT_FORMULAS[x.formula] || x.formula || x.input;
}

function reactionConditionLabels(conditions, compounds) {
  const c = normalizeReactionConditions(conditions);
  const reagentNames = (compounds || [])
    .filter((x) => x.role === 'reagent' || x.role === 'catalyst')
    .map(reactionShortLabel);
  const additiveNames = c.additives.map((id) => reactionAdditive(id).label);
  const atmosphere = REACTION_ATMOSPHERES.find((a) => a.id === c.atmosphere);
  const top = reagentNames.concat(additiveNames);
  if (atmosphere.label) {
    top.push(atmosphere.label + (c.pressure !== 1 ? ' (' + c.pressure + ' atm)' : ''));
  }
  const energy = REACTION_ENERGY.find((e) => e.id === c.energy);
  if (energy.label) {
    top.push(energy.label);
  }
  const solventNames = c.solvents.map((id) => reactionSolvent(id).name)
    .concat((compounds || []).filter((x) => x.role === 'solvent').map((x) => x.label || x.formula || x.input));
  const bottom = [];
  if (solventNames.length) {
    bottom.push(solventNames.join('/'));
  }
  bottom.push(reactionTemperatureText(c));
  if (c.time.trim()) {
    bottom.push(c.time.trim());
  }
  if (c.concentration.trim()) {
    bottom.push(c.concentration.trim());
  }
  return { above: top.join(', '), below: bottom.join(', ') };
}

function reactionParseCompound(text) {
  const input = String(text || '').trim();
  if (!input) {
    throw new Error('Type a SMILES string or a name');
  }
  let smilesError = null;
  try {
    const fragment = smilesToFragment(input);
    return { input, smiles: input, fragment, source: 'smiles' };
  } catch (error) {
    smilesError = error;
  }
  const alias = reactionAliasSmiles(input);
  if (alias) {
    return { input, smiles: alias, fragment: smilesToFragment(alias), source: 'name' };
  }
  const lookup = typeof nameToSmiles === 'function' ? nameToSmiles(input) : null;
  if (lookup && lookup.smiles) {
    return { input, smiles: lookup.smiles, fragment: smilesToFragment(lookup.smiles), source: 'name' };
  }
  const error = new Error(/[a-z]{3}/i.test(input)
    ? 'Not a recognized name or valid SMILES (' + smilesError.message + ')'
    : smilesError.message);
  error.canSearchOnline = /[a-z]{3}/i.test(input);
  throw error;
}

function reactionFragmentGraph(fragment) {
  const temp = new Graph();
  const idMap = new Map();
  fragment.atoms.forEach((a) => {
    const atom = temp.addAtom(a.element, a.x, a.y);
    if (a.charge) {
      atom.charge = a.charge;
    }
    if (a.abbr) {
      atom.abbr = a.abbr;
    }
    if (a.abbrHidden) {
      atom.abbrHidden = true;
    }
    idMap.set(a.id, atom.id);
  });
  fragment.bonds.forEach((b) => {
    const bond = temp.addBond(idMap.get(b.atomA), idMap.get(b.atomB));
    if (bond) {
      bond.order = b.order;
      bond.stereo = b.stereo || null;
    }
  });
  return temp;
}

const REACTION_REAGENT_LABELS = [
  ['Br3P', null, 'phosphorus tribromide (PBr₃)'],
  ['Cl3P', null, 'phosphorus trichloride (PCl₃)'],
  ['Cl5P', null, 'phosphorus pentachloride (PCl₅)'],
  ['Cl3OP', null, 'phosphoryl chloride (POCl₃)'],
  ['Cl2OS', null, 'thionyl chloride (SOCl₂)'],
  ['Cl2O2S', null, 'sulfuryl chloride (SO₂Cl₂)'],
  ['C5H6ClCrNO3', null, 'pyridinium chlorochromate (PCC)'],
  ['H2NNa', null, 'sodium amide (NaNH₂)'],
  ['C7H5ClO3', /^\(3-chlorophenyl\)-hydroxyoxymethanone$/, 'mCPBA (3-chloroperoxybenzoic acid)'],
  ['CH3BNNa', null, 'sodium cyanoborohydride (NaBH₃CN)'],
  ['C6H10BNaO6', null, 'sodium triacetoxyborohydride (NaBH(OAc)₃)'],
  ['C19H17P', null, 'methylenetriphenylphosphorane (Ph₃P=CH₂)'],
  ['C20H19P', null, 'ethylidenetriphenylphosphorane (Ph₃P=CHCH₃)'],
  ['C21H21P', null, 'propylidenetriphenylphosphorane (Ph₃P=CHEt)'],
  ['C22H21O2P', null, '(carbethoxymethylene)triphenylphosphorane (Ph₃P=CHCO₂Et)'],
];

function reactionReagentLabel(name, formula) {
  const entry = REACTION_REAGENT_LABELS.find(([f, pattern]) => f === formula && (pattern ? pattern.test(name) : !/[a-z]{3}/.test(name)));
  return entry ? entry[2] : name;
}

function reactionDescribeFragment(fragment) {
  const temp = reactionFragmentGraph(fragment);
  const ids = temp.atoms.map((a) => a.id);
  const props = computeProperties(temp, ids);
  let name = '';
  try {
    name = nameStructure(temp, ids) || '';
  } catch (error) {
    name = '';
  }
  return { name: reactionReagentLabel(name, props.formula), formula: props.formula, mass: props.averageMass };
}

function reactionGuessRole(compound, existing) {
  const smiles = compound.smiles || '';
  if (REACTION_SOLVENTS.some((s) => s.smiles && s.smiles === smiles) && (existing || []).some((x) => x.role === 'reactant')) {
    return 'solvent';
  }
  const atoms = compound.fragment ? compound.fragment.atoms : [];
  const metals = atoms.filter((a) => typeof isMetalElement === 'function' && isMetalElement(a.element));
  if (metals.some((a) => ['Pd', 'Pt', 'Ni', 'Rh', 'Ru', 'Ir', 'Au', 'Cu', 'Hg'].includes(a.element))) {
    return 'catalyst';
  }
  if (metals.length || atoms.some((a) => a.charge)) {
    return 'reagent';
  }
  const heavy = atoms.filter((a) => a.element !== 'H' && a.element !== 'D').length;
  if (heavy <= 2 && (existing || []).some((x) => x.role === 'reactant')) {
    return 'reagent';
  }
  return 'reactant';
}

function reactionFragmentBox(fragment) {
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  fragment.atoms.forEach((a) => {
    box.minX = Math.min(box.minX, a.x);
    box.minY = Math.min(box.minY, a.y);
    box.maxX = Math.max(box.maxX, a.x);
    box.maxY = Math.max(box.maxY, a.y);
  });
  return box;
}

function buildReactionScheme(compounds, conditions, products, captions) {
  const reactants = (compounds || []).filter((c) => c.role === 'reactant' && c.fragment);
  const out = { format: 'chemical-graph-fragment', atoms: [], bonds: [], annotations: [] };
  let nextId = 1;
  let cursor = 0;
  const place = (fragment) => {
    const box = reactionFragmentBox(fragment);
    const shiftX = cursor - box.minX;
    const shiftY = -(box.minY + box.maxY) / 2;
    const map = new Map();
    fragment.atoms.forEach((a) => {
      map.set(a.id, nextId);
      const entry = { id: nextId, element: a.element, x: a.x + shiftX, y: a.y + shiftY };
      if (a.charge) {
        entry.charge = a.charge;
      }
      out.atoms.push(entry);
      nextId += 1;
    });
    fragment.bonds.forEach((b) => {
      out.bonds.push({ atomA: map.get(b.atomA), atomB: map.get(b.atomB), order: b.order, stereo: b.stereo || null });
    });
    cursor += box.maxX - box.minX;
    return { x: shiftX + (box.minX + box.maxX) / 2, bottom: (box.maxY - box.minY) / 2 };
  };
  const placeGroup = (group, notes) => {
    const boxes = group.map((fragment, i) => {
      if (i > 0) {
        cursor += REACTION_SCHEME_SETTINGS.plusGap;
        out.annotations.push({ kind: 'plus', x: cursor, y: 0 });
        cursor += REACTION_SCHEME_SETTINGS.plusGap;
      }
      return place(fragment);
    });
    const bottom = Math.max(0, ...boxes.map((b) => b.bottom));
    (notes || []).forEach((text, i) => {
      if (text && boxes[i]) {
        out.annotations.push({ kind: 'text', x: boxes[i].x, y: bottom + 28, text });
      }
    });
  };
  placeGroup(reactants.map((c) => c.fragment));
  if (reactants.length === 0) {
    cursor += REACTION_SCHEME_SETTINGS.emptyWidth;
  }
  cursor += REACTION_SCHEME_SETTINGS.gap;
  const labels = reactionConditionLabels(conditions, compounds);
  const arrow = { kind: 'arrow', x1: cursor, y1: 0, x2: cursor + REACTION_SCHEME_SETTINGS.arrowLength, y2: 0, style: 'forward' };
  if (labels.above) {
    arrow.above = labels.above;
  }
  if (labels.below) {
    arrow.below = labels.below;
  }
  out.annotations.push(arrow);
  cursor = arrow.x2 + REACTION_SCHEME_SETTINGS.gap;
  const shown = (products || []).map((f, i) => ({ f, note: (captions || [])[i] })).filter((p) => p.f && p.f.atoms && p.f.atoms.length);
  placeGroup(shown.map((p) => p.f), shown.map((p) => p.note));
  return out;
}

const REACTION_ROUTE_LIMITS = { maxSteps: 8, labelLength: 120 };

function reactionHeavyAtoms(compound) {
  return compound.fragment ? compound.fragment.atoms.filter((a) => a.element !== 'H').length : 0;
}

function reactionRouteCarried(compounds, previousSmiles, productFragment) {
  const reactants = (compounds || []).filter((c) => c.role === 'reactant');
  const match = previousSmiles ? reactants.find((c) => c.smiles === previousSmiles) : null;
  if (match) {
    return match;
  }
  const limit = productFragment ? productFragment.atoms.filter((a) => a.element !== 'H').length : Infinity;
  const bySize = reactants.slice().sort((a, b) => reactionHeavyAtoms(b) - reactionHeavyAtoms(a));
  return bySize.find((c) => reactionHeavyAtoms(c) <= limit) || bySize[bySize.length - 1] || null;
}

function reactionRouteStep(compounds, conditions, outcome, product, minor, previousSmiles) {
  if (!outcome || !product || !product.smiles) {
    return null;
  }
  const fragment = product.fragment || smilesToFragment(product.smiles);
  const carried = reactionRouteCarried(compounds, previousSmiles, fragment);
  if (!carried) {
    return null;
  }
  const labels = reactionConditionLabels(conditions, compounds);
  const partners = compounds.filter((c) => c.role === 'reactant' && c !== carried).map((c) => (/\(([^()]+)\)$/.test(c.name || '') ? reactionShortLabel(c) : c.label || c.name || c.formula || c.input));
  const above = partners.concat(labels.above ? [labels.above] : []).join(', ');
  const ratio = outcome.ratio && outcome.minor && outcome.minor.length === 1 ? outcome.ratio : null;
  const selectivity = ratio ? ratio[minor ? 1 : 0] : 100;
  const conversion = outcome.stoichiometry && Number.isFinite(outcome.stoichiometry.conversion) ? Math.min(1, outcome.stoichiometry.conversion) : 1;
  const info = reactionDescribeFragment(fragment);
  return {
    from: { smiles: carried.smiles, name: carried.label || carried.name || carried.formula, fragment: carried.fragment },
    to: { smiles: product.smiles, name: info.name || info.formula, fragment },
    reaction: outcome.name,
    above: above.slice(0, REACTION_ROUTE_LIMITS.labelLength),
    below: labels.below.slice(0, REACTION_ROUTE_LIMITS.labelLength),
    yield: Math.max(0, Math.min(100, Math.round(selectivity * conversion))),
  };
}

function reactionRouteYield(steps) {
  if (!steps || steps.length === 0) {
    return null;
  }
  return Math.round(steps.reduce((acc, s) => acc * (Number(s.yield) || 0) / 100, 100) * 10) / 10;
}

function buildRouteScheme(steps) {
  const out = { format: 'chemical-graph-fragment', atoms: [], bonds: [], annotations: [] };
  if (!steps || steps.length === 0) {
    return out;
  }
  let nextId = 1;
  let cursor = 0;
  let lowest = 0;
  const places = [];
  const place = (fragment, number) => {
    const box = reactionFragmentBox(fragment);
    const shiftX = cursor - box.minX;
    const shiftY = -(box.minY + box.maxY) / 2;
    const map = new Map();
    fragment.atoms.forEach((a) => {
      map.set(a.id, nextId);
      const entry = { id: nextId, element: a.element, x: a.x + shiftX, y: a.y + shiftY };
      if (a.charge) {
        entry.charge = a.charge;
      }
      out.atoms.push(entry);
      nextId += 1;
    });
    fragment.bonds.forEach((b) => {
      out.bonds.push({ atomA: map.get(b.atomA), atomB: map.get(b.atomB), order: b.order, stereo: b.stereo || null });
    });
    lowest = Math.max(lowest, (box.maxY - box.minY) / 2);
    places.push({ x: cursor + (box.maxX - box.minX) / 2, number });
    cursor += box.maxX - box.minX;
  };
  const fragmentOf = (end) => end.fragment || smilesToFragment(end.smiles);
  place(fragmentOf(steps[0].from), 1);
  steps.forEach((step, i) => {
    cursor += REACTION_SCHEME_SETTINGS.gap;
    const below = [step.below, step.yield + '%'].filter(Boolean).join(', ');
    const length = Math.max(REACTION_SCHEME_SETTINGS.arrowLength, Math.max((step.above || '').length, below.length) * 7.5 + 30);
    const arrow = { kind: 'arrow', x1: cursor, y1: 0, x2: cursor + length, y2: 0, style: 'forward', below };
    if (step.above) {
      arrow.above = step.above;
    }
    out.annotations.push(arrow);
    cursor = arrow.x2 + REACTION_SCHEME_SETTINGS.gap;
    place(fragmentOf(step.to), i + 2);
  });
  places.forEach((p) => out.annotations.push({ kind: 'text', x: p.x, y: lowest + 30, text: String(p.number) }));
  out.annotations.push({ kind: 'text', x: cursor / 2, y: lowest + 70, text: 'Overall yield: ' + reactionRouteYield(steps) + '% over ' + steps.length + ' step' + (steps.length === 1 ? '' : 's') });
  return out;
}

function reactionRouteSerialize(steps) {
  return (steps || []).map((s) => ({
    from: { smiles: s.from.smiles, name: s.from.name },
    to: { smiles: s.to.smiles, name: s.to.name },
    reaction: s.reaction, above: s.above, below: s.below, yield: s.yield,
  }));
}

function reactionRouteRestore(raw) {
  const steps = [];
  (Array.isArray(raw) ? raw : []).slice(0, REACTION_ROUTE_LIMITS.maxSteps).forEach((s) => {
    if (!s || !s.from || !s.to || typeof s.from.smiles !== 'string' || typeof s.to.smiles !== 'string') {
      return;
    }
    try {
      const text = (v) => (typeof v === 'string' ? v.slice(0, REACTION_ROUTE_LIMITS.labelLength) : '');
      const y = Number(s.yield);
      steps.push({
        from: { smiles: s.from.smiles, name: text(s.from.name), fragment: smilesToFragment(s.from.smiles) },
        to: { smiles: s.to.smiles, name: text(s.to.name), fragment: smilesToFragment(s.to.smiles) },
        reaction: text(s.reaction), above: text(s.above), below: text(s.below),
        yield: Number.isFinite(y) ? Math.max(0, Math.min(100, Math.round(y))) : 100,
      });
    } catch (error) {
      return;
    }
  });
  return steps;
}

function serializeReactionState(state) {
  return JSON.stringify({
    format: 'chemical-graph-reaction',
    version: 1,
    compounds: (state.compounds || []).map((c) => ({ input: c.input, smiles: c.smiles, role: c.role, equiv: c.equiv, label: c.label || '' })),
    conditions: normalizeReactionConditions(state.conditions),
    route: reactionRouteSerialize(state.route),
  });
}

function restoreReactionState(text) {
  const empty = { compounds: [], conditions: defaultReactionConditions(), route: [] };
  let data = null;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return empty;
  }
  if (!data || data.format !== 'chemical-graph-reaction') {
    return empty;
  }
  const compounds = [];
  (Array.isArray(data.compounds) ? data.compounds : []).slice(0, REACTION_LIMITS.maxCompounds).forEach((c) => {
    if (!c || typeof c.smiles !== 'string') {
      return;
    }
    try {
      const fragment = smilesToFragment(c.smiles);
      const info = reactionDescribeFragment(fragment);
      compounds.push({
        input: typeof c.input === 'string' ? c.input : c.smiles,
        smiles: c.smiles,
        fragment,
        name: info.name,
        formula: info.formula,
        mass: info.mass,
        role: REACTION_ROLES.includes(c.role) ? c.role : 'reactant',
        equiv: typeof c.equiv === 'string' ? c.equiv.slice(0, 20) : '1',
        label: typeof c.label === 'string' ? c.label.slice(0, 40) : '',
      });
    } catch (error) {
      return;
    }
  });
  return { compounds, conditions: normalizeReactionConditions(data.conditions), route: reactionRouteRestore(data.route) };
}

function reactionParseAmount(text) {
  const match = /^\s*(\d+(?:\.\d+)?|\.\d+)\s*(mol\s*%|%|mmol|mol|mg|g|equiv|eq|ml|mL)?\.?\s*$/i.exec(String(text || ''));
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  const unit = (match[2] || 'equiv').toLowerCase().replace(/\s+/g, '');
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  if (unit === 'mol%' || unit === '%') {
    return { kind: 'equiv', value: value / 100 };
  }
  if (unit === 'mmol') {
    return { kind: 'mmol', value };
  }
  if (unit === 'mol') {
    return { kind: 'mmol', value: value * 1000 };
  }
  if (unit === 'mg') {
    return { kind: 'mg', value };
  }
  if (unit === 'g') {
    return { kind: 'mg', value: value * 1000 };
  }
  if (unit === 'ml') {
    return null;
  }
  return { kind: 'equiv', value };
}

function reactionStoichiometry(compounds, scaleMmol) {
  const scale = Number.isFinite(scaleMmol) && scaleMmol > 0 ? scaleMmol : 1;
  return (compounds || []).map((c) => {
    const mw = Number.isFinite(c.mass) && c.mass > 0 ? c.mass : null;
    const row = { name: c.label || c.name || c.formula || c.input, role: c.role, mw, equiv: null, mmol: null, mg: null };
    if (c.role === 'solvent') {
      return row;
    }
    const amount = reactionParseAmount(c.equiv);
    if (!amount) {
      return row;
    }
    if (amount.kind === 'equiv') {
      row.equiv = amount.value;
      row.mmol = amount.value * scale;
    } else if (amount.kind === 'mmol') {
      row.mmol = amount.value;
      row.equiv = amount.value / scale;
    } else if (mw) {
      row.mg = amount.value;
      row.mmol = amount.value / mw;
      row.equiv = row.mmol / scale;
    }
    if (row.mg === null && row.mmol !== null && mw) {
      row.mg = row.mmol * mw;
    }
    return row;
  });
}
