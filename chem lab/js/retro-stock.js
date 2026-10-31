const STOCK_LIMITS = { maxUser: 5000, storageKey: 'stock', defaultUserTier: 1, nameTier: 3, maxTier: 3 };

const STOCK_BUILTIN = [
  { smiles: 'O', tier: 1, name: 'water' },
  { smiles: 'O=C=O', tier: 1, name: 'carbon dioxide' },
  { smiles: 'CO', tier: 1, name: 'methanol' },
  { smiles: 'CCO', tier: 1, name: 'ethanol' },
  { smiles: 'CCCO', tier: 1, name: '1-propanol' },
  { smiles: 'CC(C)O', tier: 1, name: 'isopropanol' },
  { smiles: 'CCCCO', tier: 1, name: '1-butanol' },
  { smiles: 'CCC(C)O', tier: 1, name: '2-butanol' },
  { smiles: 'CC(C)CO', tier: 1, name: 'isobutanol' },
  { smiles: 'CC(C)(C)O', tier: 1, name: 'tert-butanol' },
  { smiles: 'OCCO', tier: 1, name: 'ethylene glycol' },
  { smiles: 'OCC(CO)O', tier: 1, name: 'glycerol' },
  { smiles: 'CC(=O)O', tier: 1, name: 'acetic acid' },
  { smiles: 'O=CO', tier: 1, name: 'formic acid' },
  { smiles: 'CCC(=O)O', tier: 1, name: 'propanoic acid' },
  { smiles: 'CC(C)=O', tier: 1, name: 'acetone' },
  { smiles: 'CCC(C)=O', tier: 1, name: 'butanone' },
  { smiles: 'C=O', tier: 1, name: 'formaldehyde' },
  { smiles: 'CC=O', tier: 1, name: 'acetaldehyde' },
  { smiles: 'C1=CC=CC=C1', tier: 1, name: 'benzene' },
  { smiles: 'CC1=CC=CC=C1', tier: 1, name: 'toluene' },
  { smiles: 'CC1=CC=CC=C1C', tier: 1, name: 'o-xylene' },
  { smiles: 'CC=1C=CC=C(C)C1', tier: 1, name: 'm-xylene' },
  { smiles: 'CC1=CC=C(C)C=C1', tier: 1, name: 'p-xylene' },
  { smiles: 'CCC1=CC=CC=C1', tier: 1, name: 'ethylbenzene' },
  { smiles: 'C=CC1=CC=CC=C1', tier: 1, name: 'styrene' },
  { smiles: 'OC1=CC=CC=C1', tier: 1, name: 'phenol' },
  { smiles: 'NC1=CC=CC=C1', tier: 1, name: 'aniline' },
  { smiles: 'O=C(C1=CC=CC=C1)O', tier: 1, name: 'benzoic acid' },
  { smiles: 'O=CC1=CC=CC=C1', tier: 1, name: 'benzaldehyde' },
  { smiles: 'OCC1=CC=CC=C1', tier: 1, name: 'benzyl alcohol' },
  { smiles: 'ClC1=CC=CC=C1', tier: 1, name: 'chlorobenzene' },
  { smiles: 'O=N(C1=CC=CC=C1)=O', tier: 1, name: 'nitrobenzene' },
  { smiles: 'C1CCCCC1', tier: 1, name: 'cyclohexane' },
  { smiles: 'OC1CCCCC1', tier: 1, name: 'cyclohexanol' },
  { smiles: 'O=C1CCCCC1', tier: 1, name: 'cyclohexanone' },
  { smiles: 'C1=CCCCC1', tier: 1, name: 'cyclohexene' },
  { smiles: 'C=C', tier: 1, name: 'ethylene' },
  { smiles: 'C=CC', tier: 1, name: 'propene' },
  { smiles: 'C=C(C)C', tier: 1, name: 'isobutylene' },
  { smiles: 'C=CC=C', tier: 1, name: '1,3-butadiene' },
  { smiles: 'C#C', tier: 1, name: 'acetylene' },
  { smiles: 'CCOC(C)=O', tier: 1, name: 'ethyl acetate' },
  { smiles: 'CCOCC', tier: 1, name: 'diethyl ether' },
  { smiles: 'C1CCOC1', tier: 1, name: 'THF' },
  { smiles: 'ClCCl', tier: 1, name: 'dichloromethane' },
  { smiles: 'ClC(Cl)Cl', tier: 1, name: 'chloroform' },
  { smiles: 'ClC(Cl)(Cl)Cl', tier: 1, name: 'carbon tetrachloride' },
  { smiles: 'CC#N', tier: 1, name: 'acetonitrile' },
  { smiles: 'CN(C)C=O', tier: 1, name: 'DMF' },
  { smiles: 'CS(C)=O', tier: 1, name: 'DMSO' },
  { smiles: 'CCCCCC', tier: 1, name: 'hexane' },
  { smiles: 'C=1C=CN=CC1', tier: 1, name: 'pyridine' },
  { smiles: 'CN', tier: 1, name: 'methylamine' },
  { smiles: 'CNC', tier: 1, name: 'dimethylamine' },
  { smiles: 'CN(C)C', tier: 1, name: 'trimethylamine' },
  { smiles: 'CCN', tier: 1, name: 'ethylamine' },
  { smiles: 'CCNCC', tier: 1, name: 'diethylamine' },
  { smiles: 'CCN(CC)CC', tier: 1, name: 'triethylamine' },
  { smiles: 'N', tier: 1, name: 'ammonia' },
  { smiles: 'CC(=O)OC(C)=O', tier: 1, name: 'acetic anhydride' },
  { smiles: 'ClC(C)=O', tier: 1, name: 'acetyl chloride' },
  { smiles: 'NC(N)=O', tier: 1, name: 'urea' },
  { smiles: 'O=C1C2=CC=CC=C2C(=O)O1', tier: 1, name: 'phthalic anhydride' },
  { smiles: 'O=C1C=CC(=O)O1', tier: 1, name: 'maleic anhydride' },
  { smiles: 'C=1C=CC2=CC=CC=C2C1', tier: 1, name: 'naphthalene' },
  { smiles: 'C=CC(=C)C', tier: 1, name: 'isoprene' },
  { smiles: 'CC(C)=CC(C)=O', tier: 1, name: 'mesityl oxide' },
  { smiles: 'O=C(CC(CC(=O)O)(C(=O)O)O)O', tier: 1, name: 'citric acid' },
  { smiles: 'Cl', tier: 1, name: 'hydrogen chloride' },
  { smiles: 'Br', tier: 1, name: 'hydrogen bromide' },
  { smiles: 'O=S(=O)(O)O', tier: 1, name: 'sulfuric acid' },
  { smiles: '[O-][N+](=O)O', tier: 1, name: 'nitric acid' },
  { smiles: '[Na+].[OH-]', tier: 1, name: 'sodium hydroxide' },
  { smiles: '[K+].[OH-]', tier: 1, name: 'potassium hydroxide' },
  { smiles: '[H][H]', tier: 1, name: 'hydrogen' },
  { smiles: 'ClCl', tier: 1, name: 'chlorine' },
  { smiles: 'BrBr', tier: 1, name: 'bromine' },
  { smiles: 'OO', tier: 1, name: 'hydrogen peroxide' },
  { smiles: 'I', tier: 2, name: 'hydrogen iodide' },
  { smiles: 'B', tier: 2, name: 'borane' },
  { smiles: '[BH4-].[Na+]', tier: 2, name: 'sodium borohydride' },
  { smiles: '[AlH4-].[Li+]', tier: 2, name: 'lithium aluminium hydride' },
  { smiles: 'ClS(Cl)=O', tier: 2, name: 'thionyl chloride' },
  { smiles: 'BrP(Br)Br', tier: 2, name: 'phosphorus tribromide' },
  { smiles: 'C=1C=C[NH+]=CC1.Cl[Cr]([O-])(=O)=O', tier: 2, name: 'PCC' },
  { smiles: '[K+].[O-][Mn](=O)(=O)=O', tier: 2, name: 'potassium permanganate' },
  { smiles: '[C-]#N.[Na+]', tier: 2, name: 'sodium cyanide' },
  { smiles: 'ClC=1C=CC=C(C1)C(=O)OO', tier: 2, name: 'mCPBA' },
  { smiles: 'CC[O-].[Na+]', tier: 2, name: 'sodium ethoxide' },
  { smiles: 'C[O-].[Na+]', tier: 2, name: 'sodium methoxide' },
  { smiles: 'CC(C)(C)[O-].[K+]', tier: 2, name: 'potassium tert-butoxide' },
  { smiles: '[BH3-]C#N.[Na+]', tier: 2, name: 'sodium cyanoborohydride' },
  { smiles: 'CC(C)(C)OC(=O)OC(=O)OC(C)(C)C', tier: 2, name: 'Boc anhydride' },
  { smiles: 'ClC(=O)OCC1=CC=CC=C1', tier: 2, name: 'benzyl chloroformate' },
  { smiles: 'ClC(=O)OCC1C2=CC=CC=C2C2=CC=CC=C21', tier: 2, name: 'Fmoc chloride' },
  { smiles: 'Cl[Si](C)(C)C(C)(C)C', tier: 2, name: 'TBSCl' },
  { smiles: 'Cl[Si](C1=CC=CC=C1)(C1=CC=CC=C1)C(C)(C)C', tier: 2, name: 'TBDPSCl' },
  { smiles: 'Cl[Si](C(C)C)(C(C)C)C(C)C', tier: 2, name: 'TIPSCl' },
  { smiles: 'Cl[Si](C)(C)C', tier: 2, name: 'TMSCl' },
  { smiles: 'BrCC1=CC=CC=C1', tier: 2, name: 'benzyl bromide' },
  { smiles: 'ClCC1=CC=CC=C1', tier: 2, name: 'benzyl chloride' },
  { smiles: 'ClCC1=CC=C(C=C1)OC', tier: 2, name: 'PMB chloride' },
  { smiles: 'OCCCO', tier: 2, name: '1,3-propanediol' },
  { smiles: 'OCCCCO', tier: 2, name: '1,4-butanediol' },
  { smiles: 'CI', tier: 2, name: 'methyl iodide' },
  { smiles: 'BrC', tier: 2, name: 'methyl bromide' },
  { smiles: 'BrCC', tier: 2, name: 'ethyl bromide' },
  { smiles: 'CCI', tier: 2, name: 'ethyl iodide' },
  { smiles: 'BrCCC', tier: 2, name: '1-bromopropane' },
  { smiles: 'CCCI', tier: 2, name: '1-iodopropane' },
  { smiles: 'BrCCCC', tier: 2, name: '1-bromobutane' },
  { smiles: 'ClCCCC', tier: 2, name: '1-chlorobutane' },
  { smiles: 'CCCCI', tier: 2, name: '1-iodobutane' },
  { smiles: 'BrCCCCC', tier: 2, name: '1-bromopentane' },
  { smiles: 'BrCCCCCC', tier: 2, name: '1-bromohexane' },
  { smiles: 'BrC(C)C', tier: 2, name: '2-bromopropane' },
  { smiles: 'CC(C)I', tier: 2, name: '2-iodopropane' },
  { smiles: 'ClC(C)(C)C', tier: 2, name: 'tert-butyl chloride' },
  { smiles: 'BrC(C)(C)C', tier: 2, name: 'tert-butyl bromide' },
  { smiles: 'BrC(C)CC', tier: 2, name: '2-bromobutane' },
  { smiles: 'BrC1CCCCC1', tier: 2, name: 'bromocyclohexane' },
  { smiles: 'BrCC=C', tier: 2, name: 'allyl bromide' },
  { smiles: 'ClCC=C', tier: 2, name: 'allyl chloride' },
  { smiles: 'BrCC#C', tier: 2, name: 'propargyl bromide' },
  { smiles: 'BrCCBr', tier: 2, name: '1,2-dibromoethane' },
  { smiles: 'ClCCCl', tier: 2, name: '1,2-dichloroethane' },
  { smiles: 'BrCCCBr', tier: 2, name: '1,3-dibromopropane' },
  { smiles: 'BrCCCCBr', tier: 2, name: '1,4-dibromobutane' },
  { smiles: 'BrCC(=O)OCC', tier: 2, name: 'ethyl bromoacetate' },
  { smiles: 'BrCC(=O)OC', tier: 2, name: 'methyl bromoacetate' },
  { smiles: 'ClCC(Cl)=O', tier: 2, name: 'chloroacetyl chloride' },
  { smiles: 'ClCC(=O)O', tier: 2, name: 'chloroacetic acid' },
  { smiles: 'Br[Mg]C', tier: 2, name: 'methylmagnesium bromide' },
  { smiles: 'Br[Mg]CC', tier: 2, name: 'ethylmagnesium bromide' },
  { smiles: 'Br[Mg]CCC', tier: 2, name: 'propylmagnesium bromide' },
  { smiles: 'Br[Mg]C(C)C', tier: 2, name: 'isopropylmagnesium bromide' },
  { smiles: 'Br[Mg]CCCC', tier: 2, name: 'butylmagnesium bromide' },
  { smiles: 'Br[Mg]C1=CC=CC=C1', tier: 2, name: 'phenylmagnesium bromide' },
  { smiles: 'Br[Mg]C=C', tier: 2, name: 'vinylmagnesium bromide' },
  { smiles: 'Br[Mg]CC1=CC=CC=C1', tier: 2, name: 'benzylmagnesium bromide' },
  { smiles: 'Br[Mg]C(C)(C)C', tier: 2, name: 'tert-butylmagnesium bromide' },
  { smiles: 'CCCCCO', tier: 2, name: '1-pentanol' },
  { smiles: 'CCCCCCO', tier: 2, name: '1-hexanol' },
  { smiles: 'CCCCCCCCO', tier: 2, name: '1-octanol' },
  { smiles: 'C=CCO', tier: 2, name: 'allyl alcohol' },
  { smiles: 'C#CCO', tier: 2, name: 'propargyl alcohol' },
  { smiles: 'CCC(C)(C)O', tier: 2, name: '2-methyl-2-butanol' },
  { smiles: 'OCCC1=CC=CC=C1', tier: 2, name: '2-phenylethanol' },
  { smiles: 'CC(C1=CC=CC=C1)O', tier: 2, name: '1-phenylethanol' },
  { smiles: 'OC1CCCC1', tier: 2, name: 'cyclopentanol' },
  { smiles: 'COCCO', tier: 2, name: '2-methoxyethanol' },
  { smiles: 'NCCO', tier: 2, name: 'ethanolamine' },
  { smiles: 'NCCCO', tier: 2, name: '3-amino-1-propanol' },
  { smiles: 'NCCCCO', tier: 2, name: '4-amino-1-butanol' },
  { smiles: 'OCCNCCO', tier: 2, name: 'diethanolamine' },
  { smiles: 'CCC=O', tier: 2, name: 'propanal' },
  { smiles: 'CCCC=O', tier: 2, name: 'butanal' },
  { smiles: 'CC(C)C=O', tier: 2, name: 'isobutyraldehyde' },
  { smiles: 'CCCCC=O', tier: 2, name: 'pentanal' },
  { smiles: 'CCCCCC=O', tier: 2, name: 'hexanal' },
  { smiles: 'CC(C)(C)C=O', tier: 2, name: 'pivaldehyde' },
  { smiles: 'C=CC=O', tier: 2, name: 'acrolein' },
  { smiles: 'CC=CC=O', tier: 2, name: 'crotonaldehyde' },
  { smiles: 'O=CC=CC1=CC=CC=C1', tier: 2, name: 'cinnamaldehyde' },
  { smiles: 'CC1=CC=C(C=C1)C=O', tier: 2, name: '4-methylbenzaldehyde' },
  { smiles: 'COC1=CC=C(C=C1)C=O', tier: 2, name: '4-methoxybenzaldehyde' },
  { smiles: 'ClC1=CC=C(C=C1)C=O', tier: 2, name: '4-chlorobenzaldehyde' },
  { smiles: 'O=CC1=CC=C(C=C1)N(=O)=O', tier: 2, name: '4-nitrobenzaldehyde' },
  { smiles: 'O=CC1=CC=C(C=C1)O', tier: 2, name: '4-hydroxybenzaldehyde' },
  { smiles: 'O=CC1=CC=CC=C1O', tier: 2, name: 'salicylaldehyde' },
  { smiles: 'O=CC1=CC=CO1', tier: 2, name: 'furfural' },
  { smiles: 'CCCC(C)=O', tier: 2, name: '2-pentanone' },
  { smiles: 'CCC(CC)=O', tier: 2, name: '3-pentanone' },
  { smiles: 'CC(C(C)C)=O', tier: 2, name: '3-methyl-2-butanone' },
  { smiles: 'CC(C(C)(C)C)=O', tier: 2, name: 'pinacolone' },
  { smiles: 'O=C1CCCC1', tier: 2, name: 'cyclopentanone' },
  { smiles: 'O=C1CCCCCC1', tier: 2, name: 'cycloheptanone' },
  { smiles: 'CC(C1=CC=CC=C1)=O', tier: 2, name: 'acetophenone' },
  { smiles: 'CCC(C1=CC=CC=C1)=O', tier: 2, name: 'propiophenone' },
  { smiles: 'O=C(C1=CC=CC=C1)C1=CC=CC=C1', tier: 2, name: 'benzophenone' },
  { smiles: 'CC1=CC=C(C=C1)C(C)=O', tier: 2, name: '4-methylacetophenone' },
  { smiles: 'C=CC(C)=O', tier: 2, name: 'methyl vinyl ketone' },
  { smiles: 'O=C1C=CCCC1', tier: 2, name: '2-cyclohexenone' },
  { smiles: 'CC(CC(C)=O)=O', tier: 2, name: 'acetylacetone' },
  { smiles: 'CCCC(=O)O', tier: 2, name: 'butanoic acid' },
  { smiles: 'CC(C)C(=O)O', tier: 2, name: 'isobutyric acid' },
  { smiles: 'CC(C)(C)C(=O)O', tier: 2, name: 'pivalic acid' },
  { smiles: 'C=CC(=O)O', tier: 2, name: 'acrylic acid' },
  { smiles: 'C=C(C)C(=O)O', tier: 2, name: 'methacrylic acid' },
  { smiles: 'CC=CC(=O)O', tier: 2, name: 'crotonic acid' },
  { smiles: 'O=C(C(=O)O)O', tier: 2, name: 'oxalic acid' },
  { smiles: 'O=C(CC(=O)O)O', tier: 2, name: 'malonic acid' },
  { smiles: 'O=C(CCC(=O)O)O', tier: 2, name: 'succinic acid' },
  { smiles: 'O=C(CCCC(=O)O)O', tier: 2, name: 'glutaric acid' },
  { smiles: 'O=C(CCCCC(=O)O)O', tier: 2, name: 'adipic acid' },
  { smiles: 'CC(C(=O)O)O', tier: 2, name: 'lactic acid' },
  { smiles: 'NCC(=O)O', tier: 2, name: 'glycine' },
  { smiles: 'CC(C(=O)O)N', tier: 2, name: 'alanine' },
  { smiles: 'O=C(C=CC1=CC=CC=C1)O', tier: 2, name: 'cinnamic acid' },
  { smiles: 'NC1=CC=C(C=C1)C(=O)O', tier: 2, name: '4-aminobenzoic acid' },
  { smiles: 'O=C(C1=CC=C(C=C1)N(=O)=O)O', tier: 2, name: '4-nitrobenzoic acid' },
  { smiles: 'O=C(C1=CC=C(C=C1)O)O', tier: 2, name: '4-hydroxybenzoic acid' },
  { smiles: 'O=C(C1=CC=CC=C1O)O', tier: 2, name: 'salicylic acid' },
  { smiles: 'CC1=CC=C(C=C1)C(=O)O', tier: 2, name: '4-methylbenzoic acid' },
  { smiles: 'ClC1=CC=C(C=C1)C(=O)O', tier: 2, name: '4-chlorobenzoic acid' },
  { smiles: 'BrC1=CC=C(C=C1)C(=O)O', tier: 2, name: '4-bromobenzoic acid' },
  { smiles: 'O=C(CC1=CC=CC=C1)O', tier: 2, name: 'phenylacetic acid' },
  { smiles: 'ClC(C1=CC=CC=C1)=O', tier: 2, name: 'benzoyl chloride' },
  { smiles: 'ClC(CC)=O', tier: 2, name: 'propionyl chloride' },
  { smiles: 'ClC(CCC)=O', tier: 2, name: 'butyryl chloride' },
  { smiles: 'ClC(C(C)C)=O', tier: 2, name: 'isobutyryl chloride' },
  { smiles: 'ClC(C(C)(C)C)=O', tier: 2, name: 'pivaloyl chloride' },
  { smiles: 'ClC(C(Cl)=O)=O', tier: 2, name: 'oxalyl chloride' },
  { smiles: 'ClC(C1=CC=C(C=C1)N(=O)=O)=O', tier: 2, name: '4-nitrobenzoyl chloride' },
  { smiles: 'CC(=O)OC', tier: 2, name: 'methyl acetate' },
  { smiles: 'CCOC=O', tier: 2, name: 'ethyl formate' },
  { smiles: 'CCC(=O)OCC', tier: 2, name: 'ethyl propanoate' },
  { smiles: 'COC(C1=CC=CC=C1)=O', tier: 2, name: 'methyl benzoate' },
  { smiles: 'CCOC(C1=CC=CC=C1)=O', tier: 2, name: 'ethyl benzoate' },
  { smiles: 'C=CC(=O)OC', tier: 2, name: 'methyl acrylate' },
  { smiles: 'C=CC(=O)OCC', tier: 2, name: 'ethyl acrylate' },
  { smiles: 'C=C(C)C(=O)OC', tier: 2, name: 'methyl methacrylate' },
  { smiles: 'CCOC(CC(=O)OCC)=O', tier: 2, name: 'diethyl malonate' },
  { smiles: 'COC(CC(=O)OC)=O', tier: 2, name: 'dimethyl malonate' },
  { smiles: 'CCOC(CC(C)=O)=O', tier: 2, name: 'ethyl acetoacetate' },
  { smiles: 'CC(CC(=O)OC)=O', tier: 2, name: 'methyl acetoacetate' },
  { smiles: 'CCOC(C(=O)OCC)=O', tier: 2, name: 'diethyl oxalate' },
  { smiles: 'COC(=O)OC', tier: 2, name: 'dimethyl carbonate' },
  { smiles: 'CCOC(=O)OCC', tier: 2, name: 'diethyl carbonate' },
  { smiles: 'CCOC(CC#N)=O', tier: 2, name: 'ethyl cyanoacetate' },
  { smiles: 'O=C1CCCO1', tier: 2, name: 'gamma-butyrolactone' },
  { smiles: 'O=C1CCC(=O)O1', tier: 2, name: 'succinic anhydride' },
  { smiles: 'CC(N)=O', tier: 2, name: 'acetamide' },
  { smiles: 'CC(N(C)C)=O', tier: 2, name: 'N,N-dimethylacetamide' },
  { smiles: 'NC(C1=CC=CC=C1)=O', tier: 2, name: 'benzamide' },
  { smiles: 'C=CC#N', tier: 2, name: 'acrylonitrile' },
  { smiles: 'N#CC1=CC=CC=C1', tier: 2, name: 'benzonitrile' },
  { smiles: 'CCC#N', tier: 2, name: 'propionitrile' },
  { smiles: 'N#CCC#N', tier: 2, name: 'malononitrile' },
  { smiles: 'NC1=CC=C(C=C1)O', tier: 2, name: '4-aminophenol' },
  { smiles: 'COC1=CC=CC=C1', tier: 2, name: 'anisole' },
  { smiles: 'FC1=CC=CC=C1', tier: 2, name: 'fluorobenzene' },
  { smiles: 'BrC1=CC=CC=C1', tier: 2, name: 'bromobenzene' },
  { smiles: 'IC1=CC=CC=C1', tier: 2, name: 'iodobenzene' },
  { smiles: 'BrC1=CC=C(C)C=C1', tier: 2, name: '4-bromotoluene' },
  { smiles: 'ClC1=CC=C(C)C=C1', tier: 2, name: '4-chlorotoluene' },
  { smiles: 'BrC1=CC=CC=C1C', tier: 2, name: '2-bromotoluene' },
  { smiles: 'BrC1=CC=C(C=C1)OC', tier: 2, name: '4-bromoanisole' },
  { smiles: 'BrC1=CC=C(C=C1)O', tier: 2, name: '4-bromophenol' },
  { smiles: 'BrC1=CC=C(C=C1)N', tier: 2, name: '4-bromoaniline' },
  { smiles: 'BrC1=CC=C(C=C1)N(=O)=O', tier: 2, name: '1-bromo-4-nitrobenzene' },
  { smiles: 'BrC1=CC=C(C=C1)F', tier: 2, name: '1-bromo-4-fluorobenzene' },
  { smiles: 'CC1=CC=C(C=C1)I', tier: 2, name: '4-iodotoluene' },
  { smiles: 'COC1=CC=C(C=C1)I', tier: 2, name: '4-iodoanisole' },
  { smiles: 'ClC1=CC=C(C=C1)N(=O)=O', tier: 2, name: '1-chloro-4-nitrobenzene' },
  { smiles: 'FC1=CC=C(C=C1)N(=O)=O', tier: 2, name: '1-fluoro-4-nitrobenzene' },
  { smiles: 'ClC1=CC=C(C=C1N(=O)=O)N(=O)=O', tier: 2, name: '1-chloro-2,4-dinitrobenzene' },
  { smiles: 'FC1=CC=C(C=C1N(=O)=O)N(=O)=O', tier: 2, name: '1-fluoro-2,4-dinitrobenzene' },
  { smiles: 'CC1=CC=C(C=C1)N', tier: 2, name: 'p-toluidine' },
  { smiles: 'CC1=CC=CC=C1N', tier: 2, name: 'o-toluidine' },
  { smiles: 'COC1=CC=C(C=C1)N', tier: 2, name: 'p-anisidine' },
  { smiles: 'NC1=CC=C(C=C1)N(=O)=O', tier: 2, name: '4-nitroaniline' },
  { smiles: 'NC1=CC=CC(=C1)N(=O)=O', tier: 2, name: '3-nitroaniline' },
  { smiles: 'O=N(C1=CC=C(C=C1)O)=O', tier: 2, name: '4-nitrophenol' },
  { smiles: 'O=N(C1=CC=CC=C1O)=O', tier: 2, name: '2-nitrophenol' },
  { smiles: 'CC1=CC=C(C=C1)N(=O)=O', tier: 2, name: '4-nitrotoluene' },
  { smiles: 'CC1=CC=CC=C1N(=O)=O', tier: 2, name: '2-nitrotoluene' },
  { smiles: 'ClC1=CC=C(C=C1)N', tier: 2, name: '4-chloroaniline' },
  { smiles: 'CC1=CC=C(C=C1)O', tier: 2, name: 'p-cresol' },
  { smiles: 'CC1=CC=CC=C1O', tier: 2, name: 'o-cresol' },
  { smiles: 'CC1=CC=CC(=C1)O', tier: 2, name: 'm-cresol' },
  { smiles: 'OC1=CC=CC=C1O', tier: 2, name: 'catechol' },
  { smiles: 'COC1=CC=CC=C1O', tier: 2, name: 'guaiacol' },
  { smiles: 'COC1=CC(=CC=C1O)C=O', tier: 2, name: 'vanillin' },
  { smiles: 'C=1C=CC2=C(C1)OCO2', tier: 2, name: '1,3-benzodioxole' },
  { smiles: 'O=CC=1C=CC2=C(C1)OCO2', tier: 2, name: 'piperonal' },
  { smiles: 'C=CCC1=CC=CC=C1', tier: 2, name: 'allylbenzene' },
  { smiles: 'OC=1C=CC=C(C1)O', tier: 2, name: 'resorcinol' },
  { smiles: 'OC1=CC=C(C=C1)O', tier: 2, name: 'hydroquinone' },
  { smiles: 'COC1=CC=C(C=C1)O', tier: 2, name: '4-methoxyphenol' },
  { smiles: 'OC1=CC=C2C=CC=CC2=C1', tier: 2, name: '2-naphthol' },
  { smiles: 'OC1=CC=CC2=CC=CC=C21', tier: 2, name: '1-naphthol' },
  { smiles: 'CN(C)C1=CC=CC=C1', tier: 2, name: 'N,N-dimethylaniline' },
  { smiles: 'CNC1=CC=CC=C1', tier: 2, name: 'N-methylaniline' },
  { smiles: 'C=1C=CC(=CC1)NC1=CC=CC=C1', tier: 2, name: 'diphenylamine' },
  { smiles: 'NCC1=CC=CC=C1', tier: 2, name: 'benzylamine' },
  { smiles: 'NNC1=CC=CC=C1', tier: 2, name: 'phenylhydrazine' },
  { smiles: 'OB(C1=CC=CC=C1)O', tier: 2, name: 'phenylboronic acid' },
  { smiles: 'CC1=CC=C(B(O)O)C=C1', tier: 2, name: '4-methylphenylboronic acid' },
  { smiles: 'COC1=CC=C(B(O)O)C=C1', tier: 2, name: '4-methoxyphenylboronic acid' },
  { smiles: 'FC1=CC=C(B(O)O)C=C1', tier: 2, name: '4-fluorophenylboronic acid' },
  { smiles: 'C#CC1=CC=CC=C1', tier: 2, name: 'phenylacetylene' },
  { smiles: 'C#CCCCC', tier: 2, name: '1-hexyne' },
  { smiles: 'C#CC', tier: 2, name: 'propyne' },
  { smiles: 'C=1C=CC(=CC1)C1=CC=CC=C1', tier: 2, name: 'biphenyl' },
  { smiles: 'C=1C=COC1', tier: 2, name: 'furan' },
  { smiles: 'C=1C=CSC1', tier: 2, name: 'thiophene' },
  { smiles: 'C=1C=CNC1', tier: 2, name: 'pyrrole' },
  { smiles: 'C1=CC=C2C(=C1)C=CN2', tier: 2, name: 'indole' },
  { smiles: 'CCCN', tier: 2, name: 'propylamine' },
  { smiles: 'CC(C)N', tier: 2, name: 'isopropylamine' },
  { smiles: 'CCCCN', tier: 2, name: 'butylamine' },
  { smiles: 'CC(C)(C)N', tier: 2, name: 'tert-butylamine' },
  { smiles: 'NC1CCCCC1', tier: 2, name: 'cyclohexylamine' },
  { smiles: 'C1CCNCC1', tier: 2, name: 'piperidine' },
  { smiles: 'C1COCCN1', tier: 2, name: 'morpholine' },
  { smiles: 'C1CCNC1', tier: 2, name: 'pyrrolidine' },
  { smiles: 'C1CNCCN1', tier: 2, name: 'piperazine' },
  { smiles: 'NCCN', tier: 2, name: 'ethylenediamine' },
  { smiles: 'NN', tier: 2, name: 'hydrazine' },
  { smiles: 'C=CCC', tier: 2, name: '1-butene' },
  { smiles: 'C=CCCCC', tier: 2, name: '1-hexene' },
  { smiles: 'C=CCCCCCC', tier: 2, name: '1-octene' },
  { smiles: 'C1=CCCC1', tier: 2, name: 'cyclopentene' },
  { smiles: 'CC=C(C)C', tier: 2, name: '2-methyl-2-butene' },
  { smiles: 'C=COC(C)=O', tier: 2, name: 'vinyl acetate' },
  { smiles: 'C1CO1', tier: 2, name: 'ethylene oxide' },
  { smiles: 'CC1CO1', tier: 2, name: 'propylene oxide' },
  { smiles: 'ClCC1CO1', tier: 2, name: 'epichlorohydrin' },
  { smiles: 'C=1C=CC(=CC1)C1CO1', tier: 2, name: 'styrene oxide' },
  { smiles: 'C=1C=CCC1', tier: 2, name: 'cyclopentadiene' },
  { smiles: 'BrN1C(CCC1=O)=O', tier: 2, name: 'N-bromosuccinimide' },
  { smiles: 'O=C1CCC(N1)=O', tier: 2, name: 'succinimide' },
  { smiles: 'O=C1C2=CC=CC=C2C(N1)=O', tier: 2, name: 'phthalimide' },
  { smiles: 'ClC(=O)OCC', tier: 2, name: 'ethyl chloroformate' },
  { smiles: 'ClC(=O)OC', tier: 2, name: 'methyl chloroformate' },
  { smiles: 'ClS(C1=CC=C(C)C=C1)(=O)=O', tier: 2, name: 'tosyl chloride' },
  { smiles: 'ClS(C)(=O)=O', tier: 2, name: 'mesyl chloride' },
  { smiles: 'C=1C=CC(=CC1)P(C1=CC=CC=C1)C1=CC=CC=C1', tier: 2, name: 'triphenylphosphine' },
  { smiles: 'C=P(C1=CC=CC=C1)(C1=CC=CC=C1)C1=CC=CC=C1', tier: 2, name: 'methylenetriphenylphosphorane' },
  { smiles: 'CCOC(C=P(C1=CC=CC=C1)(C1=CC=CC=C1)C1=CC=CC=C1)=O', tier: 2, name: '(carbethoxymethylene)triphenylphosphorane' },
  { smiles: 'CC=P(C1=CC=CC=C1)(C1=CC=CC=C1)C1=CC=CC=C1', tier: 2, name: 'ethylidenetriphenylphosphorane' },
  { smiles: 'COB(OC)OC', tier: 2, name: 'trimethyl borate' },
  { smiles: 'C1=COCCC1', tier: 2, name: '3,4-dihydro-2H-pyran' },
  { smiles: 'C=COCC', tier: 2, name: 'ethyl vinyl ether' },
  { smiles: 'O=S(C1=CC=CC=C1)(=O)O', tier: 2, name: 'benzenesulfonic acid' },
  { smiles: 'CC1=CC=C(C=C1)S(=O)(=O)O', tier: 2, name: 'p-toluenesulfonic acid' },
  { smiles: 'BrC1=CC=CC=N1', tier: 3, name: '2-bromopyridine' },
  { smiles: 'BrC1=CC=CN=C1', tier: 3, name: '3-bromopyridine' },
  { smiles: 'BrC1=CC=C(C=C1)C=O', tier: 3, name: '4-bromobenzaldehyde' },
  { smiles: 'O=CC1=CC=C(B(O)O)C=C1', tier: 3, name: '4-formylphenylboronic acid' },
  { smiles: 'COC1=CC=CC(B(O)O)=C1', tier: 3, name: '3-methoxyphenylboronic acid' },
  { smiles: 'OB(C1=CC=CS1)O', tier: 3, name: '2-thienylboronic acid' },
  { smiles: 'BrC1=CC=C(C#N)C=C1', tier: 3, name: '4-bromobenzonitrile' },
  { smiles: 'IC1=CC=C(C=C1)N(=O)=O', tier: 3, name: '1-iodo-4-nitrobenzene' },
  { smiles: 'BrC1=CC=C(C=C1)C(C)=O', tier: 3, name: '4-bromoacetophenone' },
  { smiles: 'BrC1=CC=C(C=C1)C(=O)OC', tier: 3, name: 'methyl 4-bromobenzoate' },
  { smiles: 'BrC1=CC=C(C=C1)C(=O)OCC', tier: 3, name: 'ethyl 4-bromobenzoate' },
  { smiles: 'BrC=1C=CC=C(C1)OC', tier: 3, name: '3-bromoanisole' },
  { smiles: 'BrC1=CC=CC2=CC=CC=C12', tier: 3, name: '1-bromonaphthalene' },
  { smiles: 'BrC1=CC=C2C=CC=CC2=C1', tier: 3, name: '2-bromonaphthalene' },
  { smiles: 'C=CB(O)O', tier: 3, name: 'vinylboronic acid' },
  { smiles: 'NC1CC1', tier: 3, name: 'cyclopropylamine' },
  { smiles: 'CC(C)(C)OC(N1CCNCC1)=O', tier: 3, name: 'N-Boc-piperazine' },
  { smiles: 'O=C1CCNCC1', tier: 3, name: '4-piperidone' },
  { smiles: 'BrC(C)C(=O)OCC', tier: 3, name: 'ethyl 2-bromopropanoate' },
  { smiles: 'CCOC(C1=CC=C(C=C1)N(=O)=O)=O', tier: 3, name: 'ethyl 4-nitrobenzoate' },
  { smiles: 'ClC(C1=CC=C(C=C1)N)=O', tier: 3, name: '4-aminobenzoyl chloride' },
  { smiles: 'C=CC(C1=CC=CC=C1)=O', tier: 3, name: 'phenyl vinyl ketone' },
  { smiles: 'CCCCCCCCCCCCO', tier: 3, name: '1-dodecanol' },
  { smiles: 'FC1=CC=C(C=C1)C(=O)O', tier: 3, name: '4-fluorobenzoic acid' },
  { smiles: 'FC1=CC=C(C=C1)O', tier: 3, name: '4-fluorophenol' },
  { smiles: 'FC1=CC=C(C=C1)N', tier: 3, name: '4-fluoroaniline' },
  { smiles: 'BrC1=CC=C(C=C1)C(F)(F)F', tier: 3, name: '4-bromobenzotrifluoride' },
  { smiles: 'CN1CCNCC1', tier: 3, name: '1-methylpiperazine' },
  { smiles: 'CC(C)(C)C1=CC=C(C=C1)O', tier: 3, name: '4-tert-butylphenol' },
  { smiles: 'CC(C)(C)C1=CC=CC=C1', tier: 3, name: 'tert-butylbenzene' },
  { smiles: 'CC(C)C1=CC=CC=C1', tier: 3, name: 'cumene' },
  { smiles: 'CC1=CC=C(C=C1)OC', tier: 3, name: '4-methylanisole' },
  { smiles: 'BrCCCCCCCCCCCC', tier: 3, name: '1-bromododecane' },
  { smiles: 'CCCCCCCCCCCC(=O)O', tier: 3, name: 'lauric acid' },
  { smiles: 'OCC(C1=CC=CC=C1)O', tier: 3, name: '1-phenyl-1,2-ethanediol' },
  { smiles: 'O=C1C=CC(C=C1)=O', tier: 3, name: '1,4-benzoquinone' },
  { smiles: 'C=1C=CC2=CC3=CC=CC=C3C=C2C1', tier: 3, name: 'anthracene' },
  { smiles: 'NC1=CC=CC=N1', tier: 3, name: '2-aminopyridine' },
  { smiles: 'ClC1=CC=NC=C1', tier: 3, name: '4-chloropyridine' },
  { smiles: 'BrCC(=O)OC(C)(C)C', tier: 3, name: 'tert-butyl bromoacetate' },
  { smiles: 'O=C(C1CCCCC1)O', tier: 3, name: 'cyclohexanecarboxylic acid' },
  { smiles: 'CC1=CC(CC(C)(C)C1)=O', tier: 3, name: 'isophorone' },
  { smiles: 'OCC1CCCCC1', tier: 3, name: 'cyclohexylmethanol' },
  { smiles: 'CC(CC(C)C)=O', tier: 3, name: '4-methyl-2-pentanone' },
  { smiles: 'CCCCCCCC=O', tier: 3, name: 'octanal' },
  { smiles: 'CC(C)CCO', tier: 3, name: 'isoamyl alcohol' },
  { smiles: 'CC(=O)OCCC(C)C', tier: 3, name: 'isoamyl acetate' },
  { smiles: 'CCCCOC(C)=O', tier: 3, name: 'butyl acetate' },
  { smiles: 'O=C(CCC(=O)O)C1=CC=CC=C1', tier: 3, name: '3-benzoylpropionic acid' },
  { smiles: 'FC(C(=O)O)(F)F', tier: 2, name: 'trifluoroacetic acid' },
  { smiles: 'CCCC[N+](CCCC)(CCCC)CCCC.[F-]', tier: 2, name: 'TBAF' },
  { smiles: 'C1=CNC=N1', tier: 2, name: 'imidazole' },
  { smiles: '[H-].[Na+]', tier: 2, name: 'sodium hydride' },
  { smiles: '[K+].[K+].[O-]C([O-])=O', tier: 2, name: 'potassium carbonate' },
  // Additional everyday laboratory and aromatic building blocks. Tier two
  // remains a stock-policy approximation, not a claim about local availability.
  { smiles: 'COCCOC', tier: 2, name: '1,2-dimethoxyethane' },
  { smiles: 'C1COCCO1', tier: 2, name: '1,4-dioxane' },
  { smiles: 'CC(C)(C)OC', tier: 2, name: 'methyl tert-butyl ether' },
  { smiles: 'CC1CCCO1', tier: 2, name: '2-methyltetrahydrofuran' },
  { smiles: 'COCC1=CC=CC=C1', tier: 2, name: 'benzyl methyl ether' },
  { smiles: 'CCOC1=CC=CC=C1', tier: 2, name: 'phenetole' },
  { smiles: 'C=1C=CC(=CC1)OC1=CC=CC=C1', tier: 2, name: 'diphenyl ether' },
  { smiles: 'COC1=CC=CC=C1OC', tier: 2, name: 'veratrole' },
  { smiles: 'COC1=CC=C2C=CC=CC2=C1', tier: 2, name: '2-methoxynaphthalene' },
  { smiles: 'CC(C1=CC=C(C=C1)OC)=O', tier: 2, name: '4-methoxyacetophenone' },
  { smiles: 'CC(C1=CC=C(C=C1)O)=O', tier: 2, name: '4-hydroxyacetophenone' },
  { smiles: 'CC(C1=CC=CC=C1O)=O', tier: 2, name: '2-hydroxyacetophenone' },
  { smiles: 'CC(C1=CC=C(C=C1)N)=O', tier: 2, name: '4-aminoacetophenone' },
  { smiles: 'CC(C1=CC=C(C=C1)N(=O)=O)=O', tier: 2, name: '4-nitroacetophenone' },
  { smiles: 'O=C(C1=CC=CC=C1)C(C1=CC=CC=C1)O', tier: 2, name: 'benzoin' },
  { smiles: 'O=C(C1=CC=CC=C1)C(C1=CC=CC=C1)=O', tier: 2, name: 'benzil' },
  { smiles: 'O=C(CC1=CC=CC=C1)C1=CC=CC=C1', tier: 2, name: 'deoxybenzoin' },
  { smiles: 'OC(C1=CC=CC=C1)C(C1=CC=CC=C1)O', tier: 2, name: 'hydrobenzoin' },
  { smiles: 'CN(=O)=O', tier: 2, name: 'nitromethane' },
  { smiles: 'CCN(=O)=O', tier: 2, name: 'nitroethane' },
  { smiles: 'CCCN(=O)=O', tier: 2, name: '1-nitropropane' },
  { smiles: 'CC(C)N(=O)=O', tier: 2, name: '2-nitropropane' },
  { smiles: 'O=N(C1CCCCC1)=O', tier: 2, name: 'nitrocyclohexane' },
  { smiles: 'O=N(CC1=CC=CC=C1)=O', tier: 2, name: 'phenylnitromethane' },
  { smiles: 'O=CC=O', tier: 2, name: 'glyoxal' },
  { smiles: 'O=CC(=O)O', tier: 2, name: 'glyoxylic acid' },
  { smiles: 'CC(C(=O)O)=O', tier: 2, name: 'pyruvic acid' },
  { smiles: 'O=C(C1=CC=CC=C1)C(=O)O', tier: 2, name: 'phenylglyoxylic acid' },
  { smiles: 'CCOC(C=O)=O', tier: 2, name: 'ethyl glyoxylate' },
  { smiles: 'CC(C(=O)OC)=O', tier: 2, name: 'methyl pyruvate' },
  { smiles: 'CCOC(C(C)=O)=O', tier: 2, name: 'ethyl pyruvate' },
  { smiles: 'O=CCO', tier: 2, name: 'glycolaldehyde' },
  { smiles: 'O=CC(CO)O', tier: 2, name: 'glyceraldehyde' },
  { smiles: 'O=C(CO)CO', tier: 2, name: '1,3-dihydroxyacetone' },
  { smiles: 'CC(C(C)=O)=O', tier: 2, name: '2,3-butanedione' },
  { smiles: 'CC(C(C)O)O', tier: 2, name: '2,3-butanediol' },
  { smiles: 'CC(CO)O', tier: 2, name: '1,2-propanediol' },
  { smiles: 'CC(C)(C(C)(C)O)O', tier: 2, name: 'pinacol' },
  { smiles: 'OC1CCCCC1O', tier: 2, name: '1,2-cyclohexanediol' },
  { smiles: 'OC1CCCC1O', tier: 2, name: '1,2-cyclopentanediol' },
  { smiles: 'OCCCCCO', tier: 2, name: '1,5-pentanediol' },
  { smiles: 'OCCCCCCO', tier: 2, name: '1,6-hexanediol' },
  { smiles: 'CC(CCC(C)O)O', tier: 2, name: '2,5-hexanediol' },
  { smiles: 'NCCCN', tier: 2, name: '1,3-diaminopropane' },
  { smiles: 'NCCCCN', tier: 2, name: '1,4-diaminobutane' },
  { smiles: 'NCCCCCCN', tier: 2, name: '1,6-hexanediamine' },
  { smiles: 'CNCCO', tier: 2, name: '2-(methylamino)ethanol' },
  { smiles: 'C=1C=CC(=CC1)CNCC1=CC=CC=C1', tier: 2, name: 'dibenzylamine' },
  { smiles: 'NCCC1=CC=CC=C1', tier: 2, name: '2-phenylethylamine' },
  { smiles: 'NCCC1=CC=C(C=C1)O', tier: 2, name: 'tyramine' },
  { smiles: 'NCCC1=CC=C(C(=C1)O)O', tier: 2, name: 'dopamine' },
  { smiles: 'NCC=1C=CC2=C(C1)OCO2', tier: 2, name: 'piperonylamine' },
  { smiles: 'OCC=1C=CC2=C(C1)OCO2', tier: 2, name: 'piperonyl alcohol' },
  { smiles: 'O=C(C=1C=CC2=C(C1)OCO2)O', tier: 2, name: 'piperonylic acid' },
  { smiles: 'NCCC=1C=CC2=C(C1)OCO2', tier: 2, name: '3,4-methylenedioxyphenethylamine' },
  { smiles: 'COC1=CC=C(C=C1OC)C=O', tier: 2, name: 'veratraldehyde' },
  { smiles: 'COC1=CC=C(C=C1OC)C(=O)O', tier: 2, name: '3,4-dimethoxybenzoic acid' },
  { smiles: 'COC1=CC=C(C=C1OC)CCN', tier: 2, name: '3,4-dimethoxyphenethylamine' },
  { smiles: 'O=CCC1=CC=CC=C1', tier: 2, name: 'phenylacetaldehyde' },
  { smiles: 'O=CCCC1=CC=CC=C1', tier: 2, name: 'hydrocinnamaldehyde' },
  { smiles: 'CC(C=O)C1=CC=CC=C1', tier: 2, name: '2-phenylpropanal' },
  { smiles: 'O=C(CCC1=CC=CC=C1)O', tier: 2, name: 'hydrocinnamic acid' },
  { smiles: 'CC(C1=CC=CC=C1)C(=O)O', tier: 2, name: '2-phenylpropionic acid' },
  { smiles: 'C=CCC1=CC=C(C(=C1)OC)O', tier: 2, name: 'eugenol' },
  { smiles: 'CC=CC1=CC=C(C(=C1)OC)O', tier: 2, name: 'isoeugenol' },
  { smiles: 'C=CCC=1C=CC2=C(C1)OCO2', tier: 2, name: 'safrole' },
  { smiles: 'CC=CC=1C=CC2=C(C1)OCO2', tier: 2, name: 'isosafrole' },
  { smiles: 'CC=CC1=CC=C(C=C1)OC', tier: 2, name: 'anethole' },
  { smiles: 'C=CCC1=CC=C(C=C1)OC', tier: 2, name: 'estragole' },
  { smiles: 'OC=1C=CC2=C(C1)OCO2', tier: 2, name: 'sesamol' },

  // Common inorganic acids, elements, and metals. These entries use the same
  // strict charged and component-aware identities as the reaction engine.
  { smiles: 'O=P(O)(O)O', tier: 1, name: 'phosphoric acid' },
  { smiles: 'OB(O)O', tier: 2, name: 'boric acid' },
  { smiles: 'F', tier: 2, name: 'hydrogen fluoride' },
  { smiles: 'O=NO', tier: 2, name: 'nitrous acid' },
  { smiles: 'O=S(O)O', tier: 2, name: 'sulfurous acid' },
  { smiles: 'ClS(=O)(=O)O', tier: 2, name: 'chlorosulfonic acid' },
  { smiles: '[C-]#[O+]', tier: 2, name: 'carbon monoxide' },
  { smiles: 'C', tier: 1, name: 'methane' },
  { smiles: 'O=O', tier: 1, name: 'oxygen' },
  { smiles: 'N#N', tier: 1, name: 'nitrogen' },
  { smiles: 'II', tier: 2, name: 'iodine' },
  { smiles: 'S', tier: 2, name: 'sulfur' },
  { smiles: 'P', tier: 2, name: 'phosphorus' },
  { smiles: '[Fe]', tier: 1, name: 'iron' },
  { smiles: '[Zn]', tier: 1, name: 'zinc' },
  { smiles: '[Cu]', tier: 2, name: 'copper' },
  { smiles: '[Ni]', tier: 2, name: 'nickel' },
  { smiles: '[Co]', tier: 2, name: 'cobalt' },
  { smiles: '[Mn]', tier: 2, name: 'manganese' },
  { smiles: '[Pd]', tier: 2, name: 'palladium' },
  { smiles: '[Pt]', tier: 2, name: 'platinum' },
  { smiles: '[Ag]', tier: 2, name: 'silver' },
  { smiles: '[Ti]', tier: 2, name: 'titanium' },
  { smiles: '[Cr]', tier: 2, name: 'chromium' },

  // Everyday bases, salts, drying agents, and Lewis acids.
  { smiles: '[Li+].[OH-]', tier: 1, name: 'lithium hydroxide' },
  { smiles: '[Ca+2].[OH-].[OH-]', tier: 1, name: 'calcium hydroxide' },
  { smiles: '[Mg+2].[OH-].[OH-]', tier: 2, name: 'magnesium hydroxide' },
  { smiles: '[Ba+2].[OH-].[OH-]', tier: 2, name: 'barium hydroxide' },
  { smiles: '[Na+].[Na+].[O-]C([O-])=O', tier: 1, name: 'sodium carbonate' },
  { smiles: '[Na+].[O-]C(=O)O', tier: 1, name: 'sodium bicarbonate' },
  { smiles: '[K+].[O-]C(=O)O', tier: 1, name: 'potassium bicarbonate' },
  { smiles: '[Li+].[Li+].[O-]C([O-])=O', tier: 2, name: 'lithium carbonate' },
  { smiles: '[Cs+].[Cs+].[O-]C([O-])=O', tier: 2, name: 'caesium carbonate' },
  { smiles: '[Ca+2].[O-]C([O-])=O', tier: 1, name: 'calcium carbonate' },
  { smiles: '[NH4+].[NH4+].[O-]C([O-])=O', tier: 2, name: 'ammonium carbonate' },
  { smiles: '[Na+].[Na+].[Na+].[O-]P([O-])([O-])=O', tier: 2, name: 'sodium phosphate' },
  { smiles: '[Na+].[Na+].[O-]P([O-])(=O)O', tier: 1, name: 'disodium hydrogen phosphate' },
  { smiles: '[Na+].[O-]P(=O)(O)O', tier: 1, name: 'sodium dihydrogen phosphate' },
  { smiles: '[K+].[K+].[K+].[O-]P([O-])([O-])=O', tier: 2, name: 'potassium phosphate' },
  { smiles: 'CC([O-])=O.[Na+]', tier: 1, name: 'sodium acetate' },
  { smiles: 'CC([O-])=O.[K+]', tier: 1, name: 'potassium acetate' },
  { smiles: 'CC([O-])=O.[NH4+]', tier: 1, name: 'ammonium acetate' },
  { smiles: '[Na+].[O-]C=O', tier: 1, name: 'sodium formate' },
  { smiles: '[Na+].[O-]C(C1=CC=CC=C1)=O', tier: 2, name: 'sodium benzoate' },
  { smiles: 'FC(C([O-])=O)(F)F.[Na+]', tier: 2, name: 'sodium trifluoroacetate' },
  { smiles: 'CC(C)(C)[O-].[Na+]', tier: 2, name: 'sodium tert-butoxide' },
  { smiles: 'CC(C)(C)[O-].[Li+]', tier: 2, name: 'lithium tert-butoxide' },
  { smiles: '[NH2-].[Na+]', tier: 2, name: 'sodium amide' },
  { smiles: '[K+].[NH2-]', tier: 2, name: 'potassium amide' },
  { smiles: 'CC(C)[N-]C(C)C.[Li+]', tier: 2, name: 'LDA' },
  { smiles: '[H-].[Li+]', tier: 2, name: 'lithium hydride' },
  { smiles: '[H-].[K+]', tier: 2, name: 'potassium hydride' },
  { smiles: '[Ca+2].[H-].[H-]', tier: 2, name: 'calcium hydride' },
  { smiles: '[Cl-].[Na+]', tier: 1, name: 'sodium chloride' },
  { smiles: '[Cl-].[K+]', tier: 1, name: 'potassium chloride' },
  { smiles: '[Cl-].[Li+]', tier: 2, name: 'lithium chloride' },
  { smiles: '[Cl-].[NH4+]', tier: 1, name: 'ammonium chloride' },
  { smiles: '[Cl-].[Cl-].[Mg+2]', tier: 1, name: 'magnesium chloride' },
  { smiles: '[Ca+2].[Cl-].[Cl-]', tier: 1, name: 'calcium chloride' },
  { smiles: '[Br-].[Na+]', tier: 1, name: 'sodium bromide' },
  { smiles: '[Br-].[K+]', tier: 1, name: 'potassium bromide' },
  { smiles: '[Br-].[Li+]', tier: 2, name: 'lithium bromide' },
  { smiles: '[Br-].[NH4+]', tier: 1, name: 'ammonium bromide' },
  { smiles: '[I-].[Na+]', tier: 1, name: 'sodium iodide' },
  { smiles: '[I-].[K+]', tier: 1, name: 'potassium iodide' },
  { smiles: '[I-].[NH4+]', tier: 2, name: 'ammonium iodide' },
  { smiles: '[F-].[Na+]', tier: 2, name: 'sodium fluoride' },
  { smiles: '[F-].[K+]', tier: 2, name: 'potassium fluoride' },
  { smiles: '[Cs+].[F-]', tier: 2, name: 'caesium fluoride' },
  { smiles: '[Na+].[Na+].[O-]S([O-])(=O)=O', tier: 1, name: 'sodium sulfate' },
  { smiles: '[K+].[K+].[O-]S([O-])(=O)=O', tier: 1, name: 'potassium sulfate' },
  { smiles: '[Na+].[Na+].[O-]S([O-])=O', tier: 1, name: 'sodium sulfite' },
  { smiles: '[Na+].[O-]S(=O)O', tier: 1, name: 'sodium bisulfite' },
  { smiles: '[Na+].[Na+].[O-]S(=O)S([O-])(=O)=O', tier: 2, name: 'sodium metabisulfite' },
  { smiles: '[Na+].[Na+].[O-]S(=O)(=O)[S-]', tier: 2, name: 'sodium thiosulfate' },
  { smiles: '[Na+].[Na+].[O-]S(=O)S([O-])=O', tier: 2, name: 'sodium dithionite' },
  { smiles: '[Na+].[O-][N+]([O-])=O', tier: 1, name: 'sodium nitrate' },
  { smiles: '[K+].[O-][N+]([O-])=O', tier: 1, name: 'potassium nitrate' },
  { smiles: '[NH4+].[O-][N+]([O-])=O', tier: 2, name: 'ammonium nitrate' },
  { smiles: '[Na+].[O-]N=O', tier: 1, name: 'sodium nitrite' },
  { smiles: '[C-]#N.[K+]', tier: 2, name: 'potassium cyanide' },
  { smiles: '[Cu+2].[O-]S([O-])(=O)=O', tier: 2, name: 'copper sulfate' },
  { smiles: 'Cl[Fe]Cl', tier: 2, name: 'iron(II) chloride' },
  { smiles: 'Cl[Fe](Cl)Cl', tier: 2, name: 'iron(III) chloride' },
  { smiles: 'Cl[Zn]Cl', tier: 2, name: 'zinc chloride' },
  { smiles: 'Cl[Al](Cl)Cl', tier: 2, name: 'aluminium chloride' },
  { smiles: 'Cl[Ni]Cl', tier: 2, name: 'nickel chloride' },
  { smiles: 'Cl[Co]Cl', tier: 2, name: 'cobalt chloride' },
  { smiles: 'Cl[Mn]Cl', tier: 2, name: 'manganese chloride' },
  { smiles: '[Ag+].[O-][N+]([O-])=O', tier: 2, name: 'silver nitrate' },

  // Common reductants, oxidants, coupling reagents, and reaction additives.
  { smiles: '[BH4-].[Li+]', tier: 2, name: 'lithium borohydride' },
  { smiles: 'CC(=O)O[BH-](OC(C)=O)OC(C)=O.[Na+]', tier: 2, name: 'sodium triacetoxyborohydride' },
  { smiles: 'CC(C)C[AlH]CC(C)C', tier: 2, name: 'DIBAL-H' },
  { smiles: 'CCCC[Li]', tier: 2, name: 'n-butyllithium' },
  { smiles: 'CC[Zn]CC', tier: 2, name: 'diethylzinc' },
  { smiles: 'CCCC[SnH](CCCC)CCCC', tier: 3, name: 'tributyltin hydride' },
  { smiles: 'NO', tier: 2, name: 'hydroxylamine' },
  { smiles: 'CN(C)C1=CC=NC=C1', tier: 2, name: 'DMAP' },
  { smiles: 'C1CCC2=NCCCN2CC1', tier: 2, name: 'DBU' },
  { smiles: 'CCN(C(C)C)C(C)C', tier: 2, name: 'DIPEA' },
  { smiles: 'C1CN2CCN1CC2', tier: 2, name: 'DABCO' },
  { smiles: 'Br[Fe](Br)Br', tier: 2, name: 'iron(III) bromide' },
  { smiles: 'FB(F)F', tier: 2, name: 'boron trifluoride' },
  { smiles: '[Cu]I', tier: 2, name: 'copper(I) iodide' },
  { smiles: 'Cl[Cu]', tier: 2, name: 'copper(I) chloride' },
  { smiles: 'Br[Cu]', tier: 2, name: 'copper(I) bromide' },
  { smiles: '[Cu]C#N', tier: 2, name: 'copper(I) cyanide' },
  { smiles: 'O=[Os](=O)(=O)=O', tier: 2, name: 'osmium tetroxide' },
  { smiles: 'O=[Cr](=O)=O', tier: 2, name: 'chromium trioxide' },
  { smiles: 'C[N+]1(CCOCC1)[O-]', tier: 2, name: 'NMO' },
  { smiles: 'O=[Mn]=O', tier: 2, name: 'manganese dioxide' },
  { smiles: 'Cl[O-].[Na+]', tier: 1, name: 'sodium hypochlorite' },
  { smiles: '[Na+].[O-][I+3]([O-])([O-])[O-]', tier: 2, name: 'sodium periodate' },
  { smiles: '[Ag]O[Ag]', tier: 2, name: 'silver oxide' },
  { smiles: 'Cl[Pd]Cl', tier: 2, name: 'palladium chloride' },
  { smiles: 'Cl[Ce](Cl)Cl', tier: 2, name: 'cerium(III) chloride' },
  { smiles: 'C(=NC1CCCCC1)=NC1CCCCC1', tier: 2, name: 'DCC' },
  { smiles: 'CCN=C=NCCCN(C)C', tier: 2, name: 'EDC' },
  { smiles: 'CCOC(N=NC(=O)OCC)=O', tier: 2, name: 'DEAD' },
  { smiles: 'CC(C)OC(N=NC(=O)OC(C)C)=O', tier: 2, name: 'DIAD' },
  { smiles: 'ClP(Cl)(Cl)=O', tier: 2, name: 'phosphoryl chloride' },
  { smiles: 'ClC1=C(Cl)C(C(C#N)=C(C#N)C1=O)=O', tier: 2, name: 'DDQ' },
  { smiles: 'CC(C)(C#N)N=NC(C)(C)C#N', tier: 2, name: 'AIBN' },
  { smiles: 'C[Si](C)(C)C=[N+]=[N-]', tier: 2, name: 'TMS diazomethane' },
  { smiles: 'ClN1C(CCC1=O)=O', tier: 2, name: 'N-chlorosuccinimide' },
  { smiles: 'IN1C(CCC1=O)=O', tier: 2, name: 'N-iodosuccinimide' },
  { smiles: 'CC(=O)OO', tier: 2, name: 'peracetic acid' },
  { smiles: 'CCCC[N+](CCCC)(CCCC)CCCC.[Br-]', tier: 2, name: 'tetrabutylammonium bromide' },
  { smiles: 'CCCC[N+](CCCC)(CCCC)CCCC.[Cl-]', tier: 2, name: 'tetrabutylammonium chloride' },
  { smiles: 'C[Si](C)(C)C#N', tier: 2, name: 'TMS cyanide' },
  { smiles: 'C[Si](C)(C)N=[N+]=[N-]', tier: 2, name: 'TMS azide' },
  { smiles: 'CC[SiH](CC)CC', tier: 2, name: 'triethylsilane' },
  { smiles: '[N-]=[N+]=N.[Na+]', tier: 2, name: 'sodium azide' },
  { smiles: 'C[S+](C)C.[I-]', tier: 2, name: 'trimethylsulfonium iodide' },

  // Additional solvents and common bulk feedstocks.
  { smiles: 'CCCCC', tier: 1, name: 'pentane' },
  { smiles: 'CCCCCCC', tier: 1, name: 'heptane' },
  { smiles: 'CCCCCCCC', tier: 2, name: 'octane' },
  { smiles: 'C1CCCC1', tier: 1, name: 'cyclopentane' },
  { smiles: 'CC1CCCCC1', tier: 1, name: 'methylcyclohexane' },
  { smiles: 'CC1=CC(C)=CC(C)=C1', tier: 2, name: 'mesitylene' },
  { smiles: 'COC1CCCC1', tier: 2, name: 'cyclopentyl methyl ether' },
  { smiles: 'CN1CCCC1=O', tier: 2, name: 'NMP' },
  { smiles: 'CC(=O)OC(C)C', tier: 1, name: 'isopropyl acetate' },
  { smiles: 'FC(CO)(F)F', tier: 2, name: 'trifluoroethanol' },
  { smiles: 'FC(C(C(F)(F)F)O)(F)F', tier: 3, name: 'hexafluoroisopropanol' },
  { smiles: 'N[C@@H](CO)C(=O)O', tier: 2, name: 'serine' },
  { smiles: 'N[C@@H](CC1=CC=CC=C1)C(=O)O', tier: 2, name: 'phenylalanine' },
  { smiles: 'CC(C)[C@@H](C(=O)O)N', tier: 2, name: 'valine' },
  { smiles: 'CC(C)C[C@@H](C(=O)O)N', tier: 2, name: 'leucine' },
  { smiles: 'O=C([C@@H]1CCCN1)O', tier: 2, name: 'proline' },
  { smiles: 'N[C@@H](CS)C(=O)O', tier: 2, name: 'cysteine' },
  { smiles: 'N[C@@H](CC1=CC=C(C=C1)O)C(=O)O', tier: 2, name: 'tyrosine' },
  { smiles: 'N[C@@H](CC1=CNC2=CC=CC=C12)C(=O)O', tier: 2, name: 'tryptophan' },
  { smiles: 'OC[C@@H]1[C@H]([C@@H]([C@H](C(O)O1)O)O)O', tier: 2, name: 'glucose' },
  { smiles: 'CC(C)[C@@H]1CC[C@@H](C)C[C@H]1O', tier: 2, name: 'menthol' },
  { smiles: 'CC1(C)C2CCC1(C)C(C2)=O', tier: 2, name: 'camphor' },
  { smiles: 'C1=CC=C2C(=C1)C=CC=N2', tier: 2, name: 'quinoline' },
  { smiles: 'C1=CC=C2C=NC=CC2=C1', tier: 2, name: 'isoquinoline' },
  { smiles: 'C=1C=NC=NC1', tier: 2, name: 'pyrimidine' },
  { smiles: 'C=1C=NC=CN1', tier: 2, name: 'pyrazine' },
  { smiles: 'C1=CC=NN=C1', tier: 2, name: 'pyridazine' },
  { smiles: 'C=1C=NNC1', tier: 2, name: 'pyrazole' },
  { smiles: 'C1=COC=N1', tier: 2, name: 'oxazole' },
  { smiles: 'C=1C=NOC1', tier: 2, name: 'isoxazole' },
  { smiles: 'C1=CSC=N1', tier: 2, name: 'thiazole' },
  { smiles: 'C1=CC=C2C(=C1)N=CN2', tier: 2, name: 'benzimidazole' },
  { smiles: 'C1=CC=C2C(=C1)C=CO2', tier: 2, name: 'benzofuran' },
  { smiles: 'C1=CC=C2C(=C1)C=CS2', tier: 2, name: 'benzothiophene' },
  { smiles: 'CS', tier: 2, name: 'methanethiol' },
  { smiles: 'CCS', tier: 2, name: 'ethanethiol' },
  { smiles: 'SC1=CC=CC=C1', tier: 2, name: 'benzenethiol' },
  { smiles: 'CSC1=CC=CC=C1', tier: 2, name: 'thioanisole' },
  { smiles: 'CSC', tier: 2, name: 'dimethyl sulfide' },
  { smiles: 'CSSC', tier: 2, name: 'dimethyl disulfide' },
  { smiles: 'NC(N)=S', tier: 2, name: 'thiourea' },
  { smiles: 'S=C=S', tier: 2, name: 'carbon disulfide' },
  { smiles: 'ClCC#N', tier: 2, name: 'chloroacetonitrile' },
  { smiles: 'BrCC#N', tier: 2, name: 'bromoacetonitrile' },
  { smiles: 'ICC(=O)O', tier: 2, name: 'iodoacetic acid' },
];

const stockState = { user: new Map(), builtin: null, names: null, canonical: new Map(), load: null, save: null };

function stockCanonical(smiles) {
  const text = String(smiles || '').trim();
  if (!text) {
    return '';
  }
  if (stockState.canonical.has(text)) {
    return stockState.canonical.get(text);
  }
  let out = '';
  try {
    const graph = reactionFragmentGraph(smilesToFragment(text));
    const components = graph.connectedComponents();
    out = components.length < 2
      ? computeProperties(graph, graph.atoms.map((a) => a.id)).isomericSmiles || ''
      : components.map((c) => computeProperties(graph, c.atomIds).isomericSmiles || '').sort().join('.');
  } catch (error) {
    out = '';
  }
  stockState.canonical.set(text, out);
  return out;
}

function stockBuiltinMap() {
  if (!stockState.builtin) {
    stockState.builtin = new Map();
    STOCK_BUILTIN.forEach((entry) => {
      if (!stockState.builtin.has(entry.smiles)) {
        stockState.builtin.set(entry.smiles, entry);
      }
    });
  }
  return stockState.builtin;
}

function stockNameMap() {
  if (!stockState.names) {
    stockState.names = new Map();
    const table = typeof NAME_SMILES === 'object' && NAME_SMILES ? NAME_SMILES : {};
    Object.keys(table).forEach((name) => {
      const smiles = stockCanonical(table[name]);
      if (smiles && !stockState.names.has(smiles)) {
        stockState.names.set(smiles, name);
      }
    });
  }
  return stockState.names;
}

function stockLookup(smiles) {
  const user = stockState.user.get(smiles);
  if (user) {
    return { tier: user.tier, source: 'user', name: user.name || '', smiles: user.smiles };
  }
  const builtin = stockBuiltinMap().get(smiles);
  if (builtin) {
    return { tier: builtin.tier, source: 'builtin', name: builtin.name, smiles: builtin.smiles };
  }
  const name = stockNameMap().get(smiles);
  return name ? { tier: STOCK_LIMITS.nameTier, source: 'names', name } : null;
}

function stockTier(smiles) {
  const text = String(smiles || '').trim();
  if (!text) {
    return null;
  }
  const direct = stockLookup(text);
  if (direct) {
    return direct;
  }
  const canonical = stockCanonical(text);
  return canonical && canonical !== text ? stockLookup(canonical) : null;
}

function stockInStock(smiles, maxTier) {
  const info = stockTier(smiles);
  return !!info && info.tier <= (maxTier || STOCK_LIMITS.maxTier);
}

function stockParseTier(value) {
  const tier = parseInt(value, 10);
  return tier >= 1 && tier <= STOCK_LIMITS.maxTier ? tier : STOCK_LIMITS.defaultUserTier;
}

function stockParseLine(line) {
  const text = line.trim();
  if (!text || text.startsWith('#')) {
    return null;
  }
  const cells = text.includes(',') ? text.split(',').map((c) => c.trim()) : text.includes('\t') ? text.split('\t').map((c) => c.trim()) : text.split(/\s+/);
  const smiles = cells[0];
  if (!smiles || /^smiles$/i.test(smiles)) {
    return null;
  }
  return { input: smiles, name: cells.length > 1 ? cells[1] : '', tier: stockParseTier(cells[2]) };
}

function stockImport(text) {
  const report = { added: 0, updated: 0, skipped: [], total: 0 };
  String(text || '').split(/\r?\n/).forEach((line, index) => {
    const entry = stockParseLine(line);
    if (!entry) {
      return;
    }
    const smiles = stockCanonical(entry.input);
    if (!smiles) {
      report.skipped.push({ line: index + 1, text: line.trim(), reason: 'unreadable SMILES' });
      return;
    }
    if (!stockState.user.has(smiles) && stockState.user.size >= STOCK_LIMITS.maxUser) {
      report.skipped.push({ line: index + 1, text: line.trim(), reason: 'list full' });
      return;
    }
    report[stockState.user.has(smiles) ? 'updated' : 'added'] += 1;
    stockState.user.set(smiles, { smiles, name: entry.name, tier: entry.tier });
  });
  report.total = stockState.user.size;
  stockPersist();
  return report;
}

function stockAdd(smiles, name, tier) {
  const canonical = stockCanonical(smiles);
  if (!canonical) {
    return null;
  }
  const entry = { smiles: canonical, name: name || '', tier: stockParseTier(tier) };
  stockState.user.set(canonical, entry);
  stockPersist();
  return entry;
}

function stockRemove(smiles) {
  const canonical = stockState.user.has(smiles) ? smiles : stockCanonical(smiles);
  const removed = stockState.user.delete(canonical);
  if (removed) {
    stockPersist();
  }
  return removed;
}

function stockClear() {
  stockState.user.clear();
  stockPersist();
}

function stockUserList() {
  return [...stockState.user.values()].map((e) => Object.assign({}, e));
}

function stockSerialize() {
  return JSON.stringify({ version: 1, entries: stockUserList().map((e) => [e.smiles, e.name, e.tier]) });
}

function stockRestore(text) {
  stockState.user.clear();
  let data = null;
  try {
    data = typeof text === 'string' ? JSON.parse(text) : text;
  } catch (error) {
    data = null;
  }
  const entries = data && Array.isArray(data.entries) ? data.entries : [];
  entries.slice(0, STOCK_LIMITS.maxUser).forEach((row) => {
    if (Array.isArray(row) && typeof row[0] === 'string' && row[0]) {
      stockState.user.set(row[0], { smiles: row[0], name: typeof row[1] === 'string' ? row[1] : '', tier: stockParseTier(row[2]) });
    }
  });
  return stockState.user.size;
}

function stockSetStorage(load, save) {
  stockState.load = typeof load === 'function' ? load : null;
  stockState.save = typeof save === 'function' ? save : null;
  if (stockState.load) {
    let text = null;
    try {
      text = stockState.load(STOCK_LIMITS.storageKey);
    } catch (error) {
      text = null;
    }
    if (text) {
      stockRestore(text);
    }
  }
  return stockState.user.size;
}

function stockPersist() {
  if (!stockState.save) {
    return false;
  }
  try {
    stockState.save(STOCK_LIMITS.storageKey, stockSerialize());
    return true;
  } catch (error) {
    return false;
  }
}

function stockUseLocalStorage() {
  try {
    if (typeof localStorage === 'undefined' || !localStorage) {
      return 0;
    }
    return stockSetStorage((key) => localStorage.getItem(key), (key, value) => localStorage.setItem(key, value));
  } catch (error) {
    return 0;
  }
}

if (typeof window !== 'undefined') {
  stockUseLocalStorage();
}
