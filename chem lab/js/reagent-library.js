const REAGENT_LIBRARY = [
  { id: 'water', name: 'Water', smiles: 'O', mw: 18.02, density: 1.0, form: 'liquid', conc: null, equiv: null, hazard: [] },
  { id: 'methanol', name: 'Methanol', smiles: 'CO', mw: 32.04, density: 0.792, form: 'liquid', conc: null, equiv: null, hazard: ['GHS02', 'GHS06', 'GHS08'] },
  { id: 'ethanol', name: 'Ethanol', smiles: 'CCO', mw: 46.07, density: 0.789, form: 'liquid', conc: null, equiv: null, hazard: ['GHS02', 'GHS07'] },
  { id: 'ipa', name: 'Isopropanol', smiles: 'CC(C)O', mw: 60.1, density: 0.786, form: 'liquid', conc: null, equiv: null, hazard: ['GHS02', 'GHS07'] },
  { id: 'tbuoh', name: 'tert-Butanol', smiles: 'CC(C)(C)O', mw: 74.12, density: 0.781, form: 'liquid', conc: null, equiv: null, hazard: ['GHS02', 'GHS07'] },
  { id: 'acoh', name: 'Acetic acid', smiles: 'CC(=O)O', mw: 60.05, density: 1.049, form: 'liquid', conc: null, equiv: null, hazard: ['GHS02', 'GHS05'] },
  { id: 'dmso', name: 'DMSO', smiles: 'CS(C)=O', mw: 78.13, density: 1.1, form: 'liquid', conc: null, equiv: null, hazard: [] },
  { id: 'dmf', name: 'DMF', smiles: 'CN(C)C=O', mw: 73.09, density: 0.944, form: 'liquid', conc: null, equiv: null, hazard: ['GHS02', 'GHS07', 'GHS08'] },
  { id: 'mecn', name: 'Acetonitrile', smiles: 'CC#N', mw: 41.05, density: 0.786, form: 'liquid', conc: null, equiv: null, hazard: ['GHS02', 'GHS07'] },
  { id: 'acetone', name: 'Acetone', smiles: 'CC(C)=O', mw: 58.08, density: 0.784, form: 'liquid', conc: null, equiv: null, hazard: ['GHS02', 'GHS07'] },
  { id: 'dcm', name: 'Dichloromethane', smiles: 'ClCCl', mw: 84.93, density: 1.325, form: 'liquid', conc: null, equiv: null, hazard: ['GHS07', 'GHS08'] },
  { id: 'chloroform', name: 'Chloroform', smiles: 'ClC(Cl)Cl', mw: 119.38, density: 1.489, form: 'liquid', conc: null, equiv: null, hazard: ['GHS06', 'GHS08'] },
  { id: 'thf', name: 'THF', smiles: 'C1CCOC1', mw: 72.11, density: 0.889, form: 'liquid', conc: null, equiv: null, hazard: ['GHS02', 'GHS07', 'GHS08'] },
  { id: 'ether', name: 'Diethyl ether', smiles: 'CCOCC', mw: 74.12, density: 0.713, form: 'liquid', conc: null, equiv: null, hazard: ['GHS02', 'GHS07'] },
  { id: 'dioxane', name: '1,4-Dioxane', smiles: 'C1COCCO1', mw: 88.11, density: 1.033, form: 'liquid', conc: null, equiv: null, hazard: ['GHS02', 'GHS07', 'GHS08'] },
  { id: 'etoac', name: 'Ethyl acetate', smiles: 'CCOC(C)=O', mw: 88.11, density: 0.902, form: 'liquid', conc: null, equiv: null, hazard: ['GHS02', 'GHS07'] },
  { id: 'toluene', name: 'Toluene', smiles: 'Cc1ccccc1', mw: 92.14, density: 0.867, form: 'liquid', conc: null, equiv: null, hazard: ['GHS02', 'GHS07', 'GHS08'] },
  { id: 'benzene', name: 'Benzene', smiles: 'c1ccccc1', mw: 78.11, density: 0.876, form: 'liquid', conc: null, equiv: null, hazard: ['GHS02', 'GHS07', 'GHS08'] },
  { id: 'hexane', name: 'Hexane', smiles: 'CCCCCC', mw: 86.18, density: 0.659, form: 'liquid', conc: null, equiv: null, hazard: ['GHS02', 'GHS07', 'GHS08', 'GHS09'] },
  { id: 'ccl4', name: 'Carbon tetrachloride', smiles: 'ClC(Cl)(Cl)Cl', mw: 153.82, density: 1.594, form: 'liquid', conc: null, equiv: null, hazard: ['GHS06', 'GHS08'] },
  { id: 'pyridine', aliases: ['pyr'], name: 'Pyridine', smiles: 'c1ccncc1', mw: 79.1, density: 0.982, form: 'liquid', conc: null, equiv: null, hazard: ['GHS02', 'GHS07'] },
  { id: 'nh3', name: 'Ammonia', smiles: 'N', mw: 17.03, density: 0.682, form: 'gas', conc: null, equiv: null, hazard: ['GHS04', 'GHS05', 'GHS06', 'GHS09'] },
  { id: 'h2so4', name: 'Sulfuric acid', smiles: 'OS(=O)(=O)O', mw: 98.08, density: 1.83, form: 'liquid', conc: null, equiv: 0.1, hazard: ['GHS05'] },
  { id: 'hcl', aliases: ['Cl'], name: 'Hydrogen chloride', smiles: 'Cl', mw: 36.46, density: null, form: 'gas', conc: null, equiv: 1, hazard: ['GHS04', 'GHS05', 'GHS06'] },
  { id: 'hbr', aliases: ['Br'], name: 'Hydrogen bromide', smiles: 'Br', mw: 80.91, density: null, form: 'gas', conc: null, equiv: 1, hazard: ['GHS04', 'GHS05', 'GHS07'] },
  { id: 'hi', aliases: ['I'], name: 'Hydrogen iodide', smiles: 'I', mw: 127.91, density: null, form: 'gas', conc: null, equiv: 1, hazard: ['GHS04', 'GHS05'] },
  { id: 'tsoh', name: 'p-Toluenesulfonic acid', smiles: 'Cc1ccc(cc1)S(=O)(=O)O', mw: 172.2, density: null, form: 'solid', conc: null, equiv: 0.05, hazard: ['GHS05', 'GHS07'] },
  { id: 'h3po4', name: 'Phosphoric acid', smiles: 'OP(=O)(O)O', mw: 98.0, density: null, form: 'solid', conc: null, equiv: 0.1, hazard: ['GHS05'] },
  { id: 'hno3', name: 'Nitric acid', smiles: 'O[N+](=O)[O-]', mw: 63.01, density: 1.51, form: 'liquid', conc: null, equiv: 1.1, hazard: ['GHS03', 'GHS05'] },
  { id: 'naoh', aliases: ['hydroxide'], name: 'Sodium hydroxide', smiles: '[Na+].[OH-]', mw: 40.0, density: null, form: 'solid', conc: null, equiv: 2, hazard: ['GHS05'] },
  { id: 'koh', name: 'Potassium hydroxide', smiles: '[K+].[OH-]', mw: 56.11, density: null, form: 'solid', conc: null, equiv: 2, hazard: ['GHS05', 'GHS07'] },
  { id: 'naoet', aliases: ['ethoxide'], name: 'Sodium ethoxide', smiles: '[Na+].CC[O-]', mw: 68.05, density: null, form: 'solid', conc: null, equiv: 1.1, hazard: ['GHS02', 'GHS05'] },
  { id: 'kotbu', aliases: ['tertButoxide'], name: 'Potassium tert-butoxide', smiles: '[K+].CC(C)(C)[O-]', mw: 112.21, density: null, form: 'solid', conc: null, equiv: 1.2, hazard: ['GHS02', 'GHS05'] },
  { id: 'nah', name: 'Sodium hydride', smiles: '[Na+].[H-]', mw: 24.0, density: null, form: 'solid', conc: null, equiv: 1.2, hazard: ['GHS02'] },
  { id: 'lda', name: 'LDA (2.0 M in THF)', smiles: '[Li+].CC(C)[N-]C(C)C', mw: 107.12, density: null, form: 'solution', conc: 2.0, equiv: 1.1, hazard: ['GHS02', 'GHS05'] },
  { id: 'k2co3', name: 'Potassium carbonate', smiles: '[K+].[K+].[O-]C([O-])=O', mw: 138.21, density: null, form: 'solid', conc: null, equiv: 2, hazard: ['GHS07'] },
  { id: 'et3n', name: 'Triethylamine', smiles: 'CCN(CC)CC', mw: 101.19, density: 0.726, form: 'liquid', conc: null, equiv: 1.5, hazard: ['GHS02', 'GHS05', 'GHS06'] },
  { id: 'cs2co3', name: 'Caesium carbonate', smiles: '[Cs+].[Cs+].[O-]C([O-])=O', mw: 325.82, density: null, form: 'solid', conc: null, equiv: 2, hazard: ['GHS07', 'GHS08'] },
  { id: 'k3po4', name: 'Potassium phosphate', smiles: '[K+].[K+].[K+].[O-]P([O-])([O-])=O', mw: 212.27, density: null, form: 'solid', conc: null, equiv: 2, hazard: ['GHS07'] },
  { id: 'nanh2', name: 'Sodium amide', smiles: '[Na+].[NH2-]', mw: 39.01, density: null, form: 'solid', conc: null, equiv: 1.1, hazard: ['GHS02', 'GHS05'] },
  { id: 'imidazole', name: 'Imidazole', smiles: 'c1cnc[nH]1', mw: 68.08, density: null, form: 'solid', conc: null, equiv: 2, hazard: ['GHS05', 'GHS07', 'GHS08'] },
  { id: 'dmap', name: 'DMAP', smiles: 'CN(C)c1ccncc1', mw: 122.17, density: null, form: 'solid', conc: null, equiv: 0.1, hazard: ['GHS06'] },
  { id: 'dbu', name: 'DBU', smiles: 'C1CCC2=NCCCN2CC1', mw: 152.24, density: 1.018, form: 'liquid', conc: null, equiv: 1.2, hazard: ['GHS05', 'GHS06'] },
  { id: 'alcl3', name: 'Aluminium chloride', smiles: 'Cl[Al](Cl)Cl', mw: 133.34, density: null, form: 'solid', conc: null, equiv: 1.1, hazard: ['GHS05'] },
  { id: 'febr3', name: 'Iron(III) bromide', smiles: 'Br[Fe](Br)Br', mw: 295.56, density: null, form: 'solid', conc: null, equiv: 0.1, hazard: ['GHS05'] },
  { id: 'bf3', name: 'Boron trifluoride', smiles: 'FB(F)F', mw: 67.81, density: null, form: 'gas', conc: null, equiv: 1, hazard: ['GHS04', 'GHS05', 'GHS06'] },
  { id: 'zncl2', name: 'Zinc chloride', smiles: 'Cl[Zn]Cl', mw: 136.29, density: null, form: 'solid', conc: null, equiv: 1, hazard: ['GHS05', 'GHS07', 'GHS09'] },
  { id: 'cui', name: 'Copper(I) iodide', smiles: '[Cu]I', mw: 190.45, density: null, form: 'solid', conc: null, equiv: 0.05, hazard: ['GHS07', 'GHS09'] },
  { id: 'oso4', name: 'Osmium tetroxide', smiles: 'O=[Os](=O)(=O)=O', mw: 254.23, density: null, form: 'solid', conc: null, equiv: 0.02, hazard: ['GHS05', 'GHS06'] },
  { id: 'dcc', name: 'DCC', smiles: 'C1CCC(CC1)N=C=NC1CCCCC1', mw: 206.33, density: null, form: 'solid', conc: null, equiv: 1.1, hazard: ['GHS05', 'GHS06'] },
  { id: 'edc', name: 'EDC', smiles: 'CCN=C=NCCCN(C)C', mw: 155.24, density: 0.877, form: 'liquid', conc: null, equiv: 1.2, hazard: ['GHS05', 'GHS07'] },
  { id: 'jones', name: 'Chromium trioxide', smiles: 'O=[Cr](=O)=O', mw: 99.99, density: null, form: 'solid', conc: null, equiv: 1, hazard: ['GHS03', 'GHS05', 'GHS06', 'GHS08', 'GHS09'] },
  { id: 'nmo', name: 'NMO', smiles: 'C[N+]1([O-])CCOCC1', mw: 117.15, density: null, form: 'solid', conc: null, equiv: 1.2, hazard: ['GHS07'] },
  { id: 'aibn', name: 'AIBN', smiles: 'CC(C)(C#N)N=NC(C)(C)C#N', mw: 164.21, density: null, form: 'solid', conc: null, equiv: 0.1, hazard: ['GHS02', 'GHS07'] },
  { id: 'pdcl2', name: 'Palladium(II) chloride', smiles: 'Cl[Pd]Cl', mw: 177.33, density: null, form: 'solid', conc: null, equiv: 0.05, hazard: ['GHS05', 'GHS07'] },
  { id: 'cucl', name: 'Copper(I) chloride', smiles: '[Cu]Cl', mw: 99.0, density: null, form: 'solid', conc: null, equiv: 1, hazard: ['GHS07', 'GHS09'] },
  { id: 'cubr', name: 'Copper(I) bromide', smiles: '[Cu]Br', mw: 143.45, density: null, form: 'solid', conc: null, equiv: 1, hazard: ['GHS05'] },
  { id: 'cucn', name: 'Copper(I) cyanide', smiles: '[Cu]C#N', mw: 89.56, density: null, form: 'solid', conc: null, equiv: 1, hazard: ['GHS06', 'GHS09'] },
  { id: 'naocl', name: 'Sodium hypochlorite (bleach, 0.7 M)', smiles: '[Na+].[O-]Cl', mw: 74.44, density: null, form: 'solution', conc: 0.7, equiv: 1.1, hazard: ['GHS05', 'GHS09'] },
  { id: 'mno2', name: 'Manganese dioxide', smiles: 'O=[Mn]=O', mw: 86.94, density: null, form: 'solid', conc: null, equiv: 10, hazard: ['GHS07'] },
  { id: 'zn', name: 'Zinc', smiles: '[Zn]', mw: 65.38, density: null, form: 'solid', conc: null, equiv: 2, hazard: ['GHS02', 'GHS09'] },
  { id: 'fe', name: 'Iron', smiles: '[Fe]', mw: 55.85, density: null, form: 'solid', conc: null, equiv: 3, hazard: [] },
  { id: 'cecl3', name: 'Cerium(III) chloride', smiles: 'Cl[Ce](Cl)Cl', mw: 246.47, density: null, form: 'solid', conc: null, equiv: 1, hazard: ['GHS07'] },
  { id: 'dead', name: 'DEAD', smiles: 'CCOC(=O)N=NC(=O)OCC', mw: 174.15, density: 1.106, form: 'liquid', conc: null, equiv: 1.2, hazard: ['GHS01', 'GHS07', 'GHS08'] },
  { id: 'diad', name: 'DIAD', smiles: 'CC(C)OC(=O)N=NC(=O)OC(C)C', mw: 202.21, density: 1.027, form: 'liquid', conc: null, equiv: 1.2, hazard: ['GHS07', 'GHS08'] },
  { id: 'nano2', name: 'Sodium nitrite', smiles: '[Na+].[O-]N=O', mw: 69.0, density: null, form: 'solid', conc: null, equiv: 1.1, hazard: ['GHS03', 'GHS06', 'GHS09'] },
  { id: 'ki', name: 'Potassium iodide', smiles: '[K+].[I-]', mw: 166.0, density: null, form: 'solid', conc: null, equiv: 1.5, hazard: [] },
  { id: 'tscl', name: 'Tosyl chloride', smiles: 'Cc1ccc(cc1)S(Cl)(=O)=O', mw: 190.64, density: null, form: 'solid', conc: null, equiv: 1.2, hazard: ['GHS05'] },
  { id: 'mscl', name: 'Mesyl chloride', smiles: 'CS(Cl)(=O)=O', mw: 114.55, density: 1.48, form: 'liquid', conc: null, equiv: 1.2, hazard: ['GHS05', 'GHS06'] },
  { id: 'pocl3', name: 'Phosphoryl chloride', smiles: 'ClP(Cl)(Cl)=O', mw: 153.33, density: 1.645, form: 'liquid', conc: null, equiv: 1.2, hazard: ['GHS05', 'GHS06', 'GHS08'] },
  { id: 'me3si', name: 'Trimethylsulfonium iodide', smiles: 'C[S+](C)C.[I-]', mw: 204.07, density: null, form: 'solid', conc: null, equiv: 1.2, hazard: ['GHS07'] },
  { id: 'ddq', name: 'DDQ', smiles: 'N#CC1=C(C#N)C(=O)C(Cl)=C(Cl)C1=O', mw: 227.0, density: null, form: 'solid', conc: null, equiv: 1.1, hazard: ['GHS06'] },
  { id: 'tmschn2', name: 'TMS-diazomethane (2.0 M in hexanes)', smiles: 'C[Si](C)(C)C=[N+]=[N-]', mw: 114.23, density: null, form: 'solution', conc: 2.0, equiv: 1.2, hazard: ['GHS02', 'GHS06', 'GHS08'] },
  { id: 'borane', name: 'Borane (1.0 M BH3·THF)', smiles: 'B', mw: 13.83, density: null, form: 'solution', conc: 1.0, equiv: 0.4, hazard: ['GHS02', 'GHS07'] },
  { id: 'nabh4', name: 'Sodium borohydride', smiles: '[Na+].[BH4-]', mw: 37.83, density: null, form: 'solid', conc: null, equiv: 1, hazard: ['GHS02', 'GHS05', 'GHS06'] },
  { id: 'lialh4', name: 'Lithium aluminium hydride', smiles: '[Li+].[AlH4-]', mw: 37.95, density: null, form: 'solid', conc: null, equiv: 1, hazard: ['GHS02', 'GHS05'] },
  { id: 'nabh3cn', aliases: ['cyanoborohydride'], name: 'Sodium cyanoborohydride', smiles: '[Na+].[BH3-]C#N', mw: 62.84, density: null, form: 'solid', conc: null, equiv: 1.5, hazard: ['GHS02', 'GHS05', 'GHS06'] },
  { id: 'dibal', name: 'DIBAL-H (1.0 M)', smiles: 'CC(C)C[AlH]CC(C)C', mw: 142.22, density: null, form: 'solution', conc: 1.0, equiv: 1.1, hazard: ['GHS02', 'GHS05'] },
  { id: 'socl2', name: 'Thionyl chloride', smiles: 'ClS(Cl)=O', mw: 118.97, density: 1.638, form: 'liquid', conc: null, equiv: 1.5, hazard: ['GHS05', 'GHS07'] },
  { id: 'pbr3', name: 'Phosphorus tribromide', smiles: 'BrP(Br)Br', mw: 270.69, density: 2.852, form: 'liquid', conc: null, equiv: 0.4, hazard: ['GHS05'] },
  { id: 'h2', name: 'Hydrogen', smiles: '[H][H]', mw: 2.02, density: null, form: 'gas', conc: null, equiv: 1, hazard: ['GHS02', 'GHS04'] },
  { id: 'pcc', name: 'PCC', smiles: '[O-][Cr](=O)(=O)Cl.c1cc[nH+]cc1', mw: 215.56, density: null, form: 'solid', conc: null, equiv: 1.5, hazard: ['GHS03', 'GHS07', 'GHS08', 'GHS09'] },
  { id: 'kmno4', name: 'Potassium permanganate', smiles: '[O-][Mn](=O)(=O)=O.[K+]', mw: 158.03, density: null, form: 'solid', conc: null, equiv: 1, hazard: ['GHS03', 'GHS07', 'GHS09'] },
  { id: 'cyanide', name: 'Sodium cyanide', smiles: '[C-]#N.[Na+]', mw: 49.01, density: null, form: 'solid', conc: null, equiv: 1.2, hazard: ['GHS06', 'GHS09'] },
  { id: 'mcpba', name: 'mCPBA', smiles: 'OOC(=O)c1cccc(Cl)c1', mw: 172.57, density: null, form: 'solid', conc: null, equiv: 1.2, hazard: ['GHS02', 'GHS07'] },
  { id: 'bromine', name: 'Bromine', smiles: 'BrBr', mw: 159.81, density: 3.102, form: 'liquid', conc: null, equiv: 1, hazard: ['GHS05', 'GHS06', 'GHS09'] },
  { id: 'chlorine', name: 'Chlorine', smiles: 'ClCl', mw: 70.9, density: null, form: 'gas', conc: null, equiv: 1, hazard: ['GHS03', 'GHS04', 'GHS06', 'GHS09'] },
  { id: 'nbs', name: 'NBS', smiles: 'BrN1C(=O)CCC1=O', mw: 177.98, density: null, form: 'solid', conc: null, equiv: 1.05, hazard: ['GHS05', 'GHS07'] },
  { id: 'buli', name: 'n-Butyllithium (2.5 M in hexanes)', smiles: 'CCCC[Li]', mw: 64.06, density: null, form: 'solution', conc: 2.5, equiv: 1.1, hazard: ['GHS02', 'GHS05', 'GHS08', 'GHS09'] },
  { id: 'mei', name: 'Methyl iodide', smiles: 'CI', mw: 141.94, density: 2.28, form: 'liquid', conc: null, equiv: 1.5, hazard: ['GHS06', 'GHS08'] },
  { id: 'acetylChloride', name: 'Acetyl chloride', smiles: 'CC(=O)Cl', mw: 78.5, density: 1.104, form: 'liquid', conc: null, equiv: 1.1, hazard: ['GHS02', 'GHS05'] },
  { id: 'aceticAnhydride', name: 'Acetic anhydride', smiles: 'CC(=O)OC(C)=O', mw: 102.09, density: 1.082, form: 'liquid', conc: null, equiv: 1.5, hazard: ['GHS02', 'GHS05', 'GHS06'] },
  { id: 'boc2o', name: 'Boc anhydride', smiles: 'CC(C)(C)OC(=O)OC(=O)OC(C)(C)C', mw: 218.25, density: null, form: 'solid', conc: null, equiv: 1.1, hazard: ['GHS02', 'GHS06'] },
  { id: 'cbzcl', name: 'Benzyl chloroformate', smiles: 'O=C(Cl)OCc1ccccc1', mw: 170.59, density: 1.195, form: 'liquid', conc: null, equiv: 1.1, hazard: ['GHS05', 'GHS08'] },
  { id: 'fmoccl', name: 'Fmoc chloride', smiles: 'O=C(Cl)OCC1c2ccccc2-c2ccccc21', mw: 258.7, density: null, form: 'solid', conc: null, equiv: 1.1, hazard: ['GHS05'] },
  { id: 'tbscl', name: 'TBS chloride', smiles: 'CC(C)(C)[Si](C)(C)Cl', mw: 150.72, density: null, form: 'solid', conc: null, equiv: 1.2, hazard: ['GHS02', 'GHS05'] },
  { id: 'tbdpscl', name: 'TBDPS chloride', smiles: 'CC(C)(C)[Si](Cl)(c1ccccc1)c1ccccc1', mw: 274.86, density: 1.057, form: 'liquid', conc: null, equiv: 1.2, hazard: ['GHS05'] },
  { id: 'tipscl', name: 'TIPS chloride', smiles: 'CC(C)[Si](Cl)(C(C)C)C(C)C', mw: 192.8, density: 0.901, form: 'liquid', conc: null, equiv: 1.2, hazard: ['GHS05'] },
  { id: 'tmscl', name: 'TMS chloride', smiles: 'C[Si](C)(C)Cl', mw: 108.64, density: 0.856, form: 'liquid', conc: null, equiv: 1.2, hazard: ['GHS02', 'GHS05'] },
  { id: 'tbaf', name: 'TBAF (1.0 M in THF)', smiles: 'CCCC[N+](CCCC)(CCCC)CCCC.[F-]', mw: 261.46, density: null, form: 'solution', conc: 1.0, equiv: 1.2, hazard: ['GHS02', 'GHS05'] },
  { id: 'bnbr', name: 'Benzyl bromide', smiles: 'BrCc1ccccc1', mw: 171.04, density: 1.438, form: 'liquid', conc: null, equiv: 1.2, hazard: ['GHS05', 'GHS07'] },
  { id: 'pmbcl', name: 'PMB chloride', smiles: 'COc1ccc(CCl)cc1', mw: 156.61, density: 1.155, form: 'liquid', conc: null, equiv: 1.2, hazard: ['GHS05'] },
  { id: 'isobutylene', name: 'Isobutylene', smiles: 'C=C(C)C', mw: 56.11, density: null, form: 'gas', conc: null, equiv: 3, hazard: ['GHS02', 'GHS04'] },
  { id: 'ethyleneGlycol', name: 'Ethylene glycol', smiles: 'OCCO', mw: 62.07, density: 1.113, form: 'liquid', conc: null, equiv: 2, hazard: ['GHS07', 'GHS08'] },
  { id: 'propanediol', name: '1,3-Propanediol', smiles: 'OCCCO', mw: 76.09, density: 1.053, form: 'liquid', conc: null, equiv: 2, hazard: [] },
  { id: 'pph3', name: 'Triphenylphosphine', smiles: 'P(c1ccccc1)(c1ccccc1)c1ccccc1', mw: 262.29, density: null, form: 'solid', conc: null, equiv: 1.2, hazard: ['GHS07', 'GHS08'] },
];

const REAGENT_HAZARDS = {
  GHS01: 'Explosive',
  GHS02: 'Flammable',
  GHS03: 'Oxidiser',
  GHS04: 'Compressed gas',
  GHS05: 'Corrosive',
  GHS06: 'Acutely toxic',
  GHS07: 'Harmful / irritant',
  GHS08: 'Health hazard',
  GHS09: 'Environmental hazard',
};

let rglCanonicalCache = null;
const rglLookupCache = new Map();

function rglCanonical(smiles) {
  if (!smiles) {
    return '';
  }
  try {
    return reactionGraphProperties(reactionFragmentGraph(smilesToFragment(smiles))).smiles || '';
  } catch (error) {
    return '';
  }
}

function rglIndex() {
  if (!rglCanonicalCache) {
    rglCanonicalCache = new Map();
    REAGENT_LIBRARY.forEach((entry) => {
      const key = rglCanonical(entry.smiles);
      if (key && !rglCanonicalCache.has(key)) {
        rglCanonicalCache.set(key, entry);
      }
    });
  }
  return rglCanonicalCache;
}

function rglLookup(key) {
  const text = String(key || '').trim();
  if (!text) {
    return null;
  }
  const byId = REAGENT_LIBRARY.find((entry) => entry.id === text || (entry.aliases || []).includes(text));
  if (byId) {
    return byId;
  }
  if (!rglLookupCache.has(text)) {
    rglLookupCache.set(text, rglIndex().get(rglCanonical(text)) || null);
  }
  return rglLookupCache.get(text);
}

function rglHazardText(code) {
  return REAGENT_HAZARDS[code] || code;
}
