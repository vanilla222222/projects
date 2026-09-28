const NAME_ROOTS = [
  '',
  'meth',
  'eth',
  'prop',
  'but',
  'pent',
  'hex',
  'hept',
  'oct',
  'non',
  'dec',
  'undec',
  'dodec',
  'tridec',
  'tetradec',
  'pentadec',
  'hexadec',
  'heptadec',
  'octadec',
  'nonadec',
  'icos',
  'heneicos',
  'docos',
  'tricos',
  'tetracos',
  'pentacos',
  'hexacos',
  'heptacos',
  'octacos',
  'nonacos',
  'triacont',
];
const ALKYL_PREFIXES = NAME_ROOTS.map((root) => (root ? root + 'yl' : ''));
const HALOGEN_PREFIXES = { F: 'fluoro', Cl: 'chloro', Br: 'bromo', I: 'iodo' };
const MULTIPLIER_PREFIXES = {
  2: 'di',
  3: 'tri',
  4: 'tetra',
  5: 'penta',
  6: 'hexa',
  7: 'hepta',
  8: 'octa',
  9: 'nona',
  10: 'deca',
  11: 'undeca',
  12: 'dodeca',
  13: 'trideca',
  14: 'tetradeca',
  15: 'pentadeca',
  16: 'hexadeca',
  17: 'heptadeca',
  18: 'octadeca',
  19: 'nonadeca',
  20: 'icosa',
};
const MAX_NAMED_CHAIN = NAME_ROOTS.length - 1;
const MAX_BRANCH_LENGTH = NAME_ROOTS.length - 1;
const MIN_RING_SIZE = 3;
const MAX_RING_SIZE = 8;

const INORGANIC_NAMES = {
  H2O4S: 'sulfuric acid',
  H3O4P: 'phosphoric acid',
  HNO3: 'nitric acid',
  Cl2O2S: 'sulfuryl chloride',
  Cl3OP: 'phosphoryl chloride',
  H3O3P: 'phosphorous acid',
  H2O3S: 'sulfurous acid',
  HNO2: 'nitrous acid',
};

const COMMON_NAMES = {
  'hexane-1,2,3,4,5,6-hexaol': 'sorbitol',
  'pentane-1,2,3,4,5-pentol': 'xylitol',
  'butane-1,2,3,4-tetraol': 'erythritol',
  'cyclohexane-1,2,3,4,5,6-hexol': 'inositol',
  '2,3,5,6-tetrahydro-1,4-dioxine': '1,4-dioxane',
  '2,3-dihydro-1H-indene': 'indane',
  '1,2,3,4-tetrahydronaphthalene': 'tetralin',
  '1,2-diphenyldiazene': 'azobenzene',
  '1,2-diphenylhydrazine': 'hydrazobenzene',
  '1,3,5-triazine-2,4,6-triamine': 'melamine',
  '1,2,3,6-tetrahydropyridine': 'tetrahydropyridine',
  '1-methyl-4-phenyl-1,2,3,6-tetrahydropyridine': 'MPTP',
  'sulfanylmethanediamine': 'thiourea',
  '2-amino-5-guanidinopentanoic acid': 'arginine',
  '2-amino-3-carboxypropanoic acid': 'aspartic acid',
  'hexane-1,6-diamine': 'hexamethylenediamine',
  'butane-1,4-diamine': 'putrescine',
  'pentane-1,5-diamine': 'cadaverine',
  '1,2-benzenediol': 'catechol',
  '3-(1-methylpyrrolidin-2-yl)pyridine': 'nicotine',
  '2,6-diaminohexanoic acid': 'lysine',
  '2-amino-3-hydroxypropanoic acid': 'serine',
  '2-amino-3-hydroxybutanoic acid': 'threonine',
  '2-amino-3-sulfanylpropanoic acid': 'cysteine',
  '2-amino-4-(methylsulfanyl)butanoic acid': 'methionine',
  '2-amino-3-methylbutanoic acid': 'valine',
  '2-amino-4-methylpentanoic acid': 'leucine',
  '2-amino-3-methylpentanoic acid': 'isoleucine',
  '2-amino-3-phenylpropanoic acid': 'phenylalanine',
  '2-amino-3-(4-hydroxyphenyl)propanoic acid': 'tyrosine',
  '2-amino-3-(1H-indol-3-yl)propanoic acid': 'tryptophan',
  '2-aminobutanedioic acid': 'aspartic acid',
  '2-aminopentanedioic acid': 'glutamic acid',
  '2,4-diamino-4-oxobutanoic acid': 'asparagine',
  '2,5-diamino-5-oxopentanoic acid': 'glutamine',
  'pyrrolidine-2-carboxylic acid': 'proline',
  '2-amino-3-(imidazol-4-yl)propanoic acid': 'histidine',
  '2-amino-5-((amino-iminomethyl)amino)pentanoic acid': 'arginine',
  '4-(1-hydroxy-2-(methylamino)ethyl)benzene-1,2-diol': 'epinephrine',
  '4-(2-amino-1-hydroxyethyl)benzene-1,2-diol': 'norepinephrine',
  '3-(2-(dimethylamino)ethyl)-1H-indol-5-ol': 'bufotenine',
  '9H-purin-6-amine': 'adenine',
  '9H-purine': 'purine',
  '5-methylpyrimidine-2,4(1H,3H)-dione': 'thymine',
  'pyrimidine-2,4(1H,3H)-dione': 'uracil',
  '3,7-dihydro-1H-purine-2,6-dione': 'xanthine',
  '1,3,7-trimethyl-3,7-dihydro-1H-purine-2,6-dione': 'caffeine',
  '2-benzofuran-1,3-dione': 'phthalic anhydride',
  '1H-isoindole-1,3(2H)-dione': 'phthalimide',
  '2H-isoindole-1,3-dione': 'phthalimide',
  '10H-phenothiazine': 'phenothiazine',
  '5H-dibenzo[b,f]azepine-5-carboxamide': 'carbamazepine',
  '7-chloro-1-methyl-5-phenyl-1,3-dihydro-2H-1,4-benzodiazepin-2-one': 'diazepam',
  '7-chloro-5-phenyl-1,3-dihydro-2H-1,4-benzodiazepin-2-one': 'nordazepam',
  '3-(10,11-dihydro-5H-dibenzo[b,f]azepin-5-yl)-N,N-dimethylpropan-1-amine': 'imipramine',
  '3-(10,11-dihydro-5H-dibenzo[b,f]azepin-5-yl)-N-methylpropan-1-amine': 'desipramine',
  'N,N-dimethyl-3-(10H-phenothiazin-10-yl)propan-1-amine': 'promazine',
  '3-(2-chloro-10H-phenothiazin-10-yl)-N,N-dimethylpropan-1-amine': 'chlorpromazine',
  '2-methylnaphthalene-1,4-dione': 'menadione',
  'anthracene-9,10-dione': 'anthraquinone',
  '3,4,5-trihydroxybenzoic acid': 'gallic acid',
  '4-aminobenzene-1-sulfonamide': 'sulfanilamide',
  'ethyl 4-aminobenzoate': 'benzocaine',
  '2-(6-methoxy-naphthalen-2-yl)propanoic acid': 'naproxen',
  '5,5-diethylpyrimidine-2,4,6(1H,3H,5H)-trione': 'barbital',
  '3,7-dimethyl-3,7-dihydro-1H-purine-2,6-dione': 'theobromine',
  '1,3-dimethyl-3,7-dihydro-1H-purine-2,6-dione': 'theophylline',
  'pyrimidine-2,4,6(1H,3H,5H)-trione': 'barbituric acid',
  'quinolin-2(1H)-one': '2-quinolone',
  '2H-chromen-2-one': 'coumarin',
  '1,3-dihydro-2H-indol-2-one': 'oxindole',
  'pyrrolidine-2,5-dione': 'succinimide',
  '1H-pyrrole-2,5-dione': 'maleimide',
  'furan-2,5-dione': 'maleic anhydride',
  'acetyl acetate': 'acetic anhydride',
  'naphthalene-1,4-dione': '1,4-naphthoquinone',
  'pyridin-2(1H)-one': '2-pyridone',
  'benzene-1,2-dicarboxylic acid': 'phthalic acid',
  '3-phenylprop-2-enoic acid': 'cinnamic acid',
  'trifluoroacetic acid': 'TFA',
  'diethyl propanedioate': 'diethyl malonate',
  'butane-2,3-dione': 'diacetyl',
  'ethanedial': 'glyoxal',
  '1,1\'-biphenyl': 'biphenyl',
  'decahydronaphthalene': 'decalin',
  '2-acetoxybenzoic acid': 'aspirin',
  'N-(4-hydroxyphenyl)acetamide': 'paracetamol',
  '2-(4-isobutylphenyl)propanoic acid': 'ibuprofen',
  'propane-1,2,3-diol': 'glycerol',
  'ethane-1,2-diol': 'ethylene glycol',
  'ethoxyethane': 'diethyl ether',
  'tetrahydrofuran': 'THF',
  'dimethyl sulfoxide': 'DMSO',
  'N,N-dimethylformamide': 'DMF',
  'but-2-enedioic acid': 'fumaric acid',
  '3-carboxy-3-hydroxypentanedioic acid': 'citric acid',
  '2-hydroxypropanoic acid': 'lactic acid',
  'ethanedioic acid': 'oxalic acid',
  'butanedioic acid': 'succinic acid',
  'hexanedioic acid': 'adipic acid',
  'aminoacetic acid': 'glycine',
  'aminoethanoic acid': 'glycine',
  '(methylamino)ethanoic acid': 'sarcosine',
  '2-aminopropanoic acid': 'alanine',
  'buta-1,3-diene': 'butadiene',
  '2-methylbuta-1,3-diene': 'isoprene',
  'prop-2-enenitrile': 'acrylonitrile',
  'prop-2-enoic acid': 'acrylic acid',
  'prop-2-enal': 'acrolein',
  'ethenylbenzene': 'styrene',
  'benzene-1,2-diol': 'catechol',
  'benzene-1,3-diol': 'resorcinol',
  'benzene-1,4-diol': 'hydroquinone',
  'cyclohexa-2,5-diene-1,4-dione': 'benzoquinone',
  '1-phenylethanone': 'acetophenone',
  'diphenylmethanone': 'benzophenone',
  'N,N-diethylethanamine': 'triethylamine',
  'phenylmethanol': 'benzyl alcohol',
  'dodecanoic acid': 'lauric acid',
  'hexadecanoic acid': 'palmitic acid',
  'octadecanoic acid': 'stearic acid',
  'octadec-9-enoic acid': 'oleic acid',
  'methanesulfonic acid': 'MsOH',
  '4-methylbenzene-1-sulfonic acid': 'TsOH',
  '2-hydroxybenzoic acid': 'salicylic acid',
  '4-aminobenzoic acid': 'PABA',
  'pyridine-3-carboxamide': 'nicotinamide',
  'pyridine-3-carboxylic acid': 'niacin',
  '2-methylphenol': 'o-cresol',
  '3-methylphenol': 'm-cresol',
  '4-methylphenol': 'p-cresol',
  'hydroxymethanoic acid': 'carbonic acid',
  'pyrrolidinone': '2-pyrrolidone',
  'iminomethanediamine': 'guanidine',
  'N,N-dimethyltryptamine': 'DMT',
  '5-hydroxytryptamine': 'serotonin',
  '5-hydroxy-N,N-dimethyltryptamine': 'bufotenin',
  '4-hydroxy-N,N-dimethyltryptamine': 'psilocin',
  '3,4-dihydroxyphenethylamine': 'dopamine',
  '3,4,5-trimethoxyphenethylamine': 'mescaline',
  '4-hydroxyphenethylamine': 'tyramine',
  '4-hydroxy-N,N-dimethylphenethylamine': 'hordenine',
  '4-hydroxy-N-methylphenethylamine': 'N-methyltyramine',
  '3,4-dimethoxyphenethylamine': 'homoveratrylamine',
  '4-hydroxy-3-methoxyphenethylamine': '3-methoxytyramine',
  '3,4-dihydroxy-N-methylphenethylamine': 'epinine',
  '1-(2-amino-2-methylpropyl)-4-bromo-2,5-dimethoxybenzene': 'ALEPH',
  '1-(2-amino-2-methylpropyl)-4-ethylthio-2,5-dimethoxybenzene': 'ALEPH-2',
  '(2-amino-2-methylpropyl)benzene': 'phentermine',
  '(2-methyl-2-(methylamino)propyl)benzene': 'mephentermine',
  '3-(trifluoromethyl)-N-ethylamphetamine': 'fenfluramine',
  'N-methyl-1-phenyl-N-phenylmethylpropan-2-amine': 'benzphetamine',
  'N-((2-chlorophenyl)methyl)-1-phenylpropan-2-amine': 'clobenzorex',
  '4-(2-amino-1-hydroxyethyl)phenol': 'octopamine',
  '4-(1-hydroxy-2-(methylamino)ethyl)phenol': 'synephrine',
  '3-(1-hydroxy-2-(methylamino)ethyl)phenol': 'phenylephrine',
  '(2-amino-1-hydroxypropyl)benzene': 'norephedrine',
  '(1-hydroxy-2-(methylamino)propyl)benzene': 'ephedrine',
  '4-(1-hydroxy-2-isopropylaminoethyl)benzene-1,2-diol': 'isoproterenol',
  '3,4-methylenedioxyamphetamine': 'MDA',
  '3,4-methylenedioxy-N-methylamphetamine': 'MDMA',
  '3,4-methylenedioxy-N-ethylamphetamine': 'MDEA',
  '3,4-methylenedioxy-5-methoxyamphetamine': 'MMDA',
  '2-methoxy-4,5-methylenedioxyamphetamine': 'MMDA-2',
  '3,4-methylenedioxy-N-propylamphetamine': 'MDPR',
  '3,4-methylenedioxy-N-butylamphetamine': 'MDBU',
  '1,2-methylenedioxy-4-(2-isopropylaminopropyl)benzene': 'MDIP',
  '4-fluoroamphetamine': '4-FA',
  '4-fluoro-N-methylamphetamine': '4-FMA',
  '4-chloroamphetamine': '4-CA',
  '4-ethylamphetamine': '4-EA',
  '2-(3,5-dimethoxy-4-(prop-2-en-1-yloxy)phenyl)ethanamine': 'Allylescaline',
  '2-(4-isopropoxy-3,5-dimethoxyphenyl)ethanamine': 'Isoproscaline',
  '4-butoxy-3,5-dimethoxyphenethylamine': 'Buscaline',
  '4-methoxyamphetamine': 'PMA',
  '4-methoxy-N-methylamphetamine': 'PMMA',
  'N-methylamphetamine': 'methamphetamine',

  'methanoic acid': 'formic acid',
  'ethanoic acid': 'acetic acid',
  'propanoic acid': 'propionic acid',
  'butanoic acid': 'butyric acid',
  'pentanoic acid': 'valeric acid',
  'hexanoic acid': 'caproic acid',
  'octanoic acid': 'caprylic acid',
  'decanoic acid': 'capric acid',
  'methanal': 'formaldehyde',
  'ethanal': 'acetaldehyde',
  'propanal': 'propionaldehyde',
  'butanal': 'butyraldehyde',
  'propan-2-one': 'acetone',
  'butan-2-one': 'methyl ethyl ketone',
  'ethanenitrile': 'acetonitrile',
  'propanenitrile': 'propionitrile',
  'butanenitrile': 'butyronitrile',
  'methanamine': 'methylamine',
  'ethanamine': 'ethylamine',
  'propan-2-amine': 'isopropylamine',
  '2-methylpropan-2-ol': 'tert-butanol',
  '2-methylpropan-1-ol': 'isobutanol',
  '2-methylpropanoic acid': 'isobutyric acid',
  'propan-2-ol': 'isopropanol',
  'trichloromethane': 'chloroform',
  'tetrachloromethane': 'carbon tetrachloride',
  'triiodomethane': 'iodoform',
  'dichloromethane': 'DCM',

  benzenamine: 'aniline',
  benzenol: 'phenol',
  methylbenzene: 'toluene',
  '1,2-dimethylbenzene': 'o-xylene',
  '1,3-dimethylbenzene': 'm-xylene',
  '1,4-dimethylbenzene': 'p-xylene',
  benzenethiol: 'thiophenol',
  methoxybenzene: 'anisole',

  '2,5-dimethoxyphenethylamine': '2C-H',
  '4-bromo-2,5-dimethoxyphenethylamine': '2C-B',
  '4-iodo-2,5-dimethoxyphenethylamine': '2C-I',
  '4-chloro-2,5-dimethoxyphenethylamine': '2C-C',
  '4-ethyl-2,5-dimethoxyphenethylamine': '2C-E',
  '4-iodo-2,5-dimethoxy-N-(2-methoxybenzyl)phenethylamine': '25I-NBOMe',
  '4-bromo-2,5-dimethoxy-N-(2-methoxybenzyl)phenethylamine': '25B-NBOMe',
  '4-chloro-2,5-dimethoxy-N-(2-methoxybenzyl)phenethylamine': '25C-NBOMe',
  '4-iodo-2,5-dimethoxy-N-benzylphenethylamine': '25I-NBH',
  '4-iodo-2,5-dimethoxy-N-(2-fluorobenzyl)phenethylamine': '25I-NBF',
  '2,5-dimethoxy-4-methylamphetamine': 'DOM',
  '4-bromo-2,5-dimethoxyamphetamine': 'DOB',
  '4-iodo-2,5-dimethoxyamphetamine': 'DOI',
  '4-chloro-2,5-dimethoxyamphetamine': 'DOC',
  '5-methoxy-N,N-dimethyltryptamine': '5-MeO-DMT',
  '5-methoxytryptamine': '5-MT',
  'N,N-diethyltryptamine': 'DET',
  '4-hydroxy-N-methyltryptamine': 'norpsilocin',
  'N-methyltryptamine': 'NMT',

  'N,N-dipropyltryptamine': 'DPT',
  'N,N-dibutyltryptamine': 'DBT',
  'N-ethyl-N-propyltryptamine': 'EPT',
  'N-ethyl-N-methyltryptamine': 'MET',
  'N-methyl-N-propyltryptamine': 'MPT',
  '4-hydroxy-N,N-diethyltryptamine': '4-HO-DET',
  '4-hydroxy-N,N-dipropyltryptamine': '4-HO-DPT',
  '4-hydroxy-N-ethyl-N-methyltryptamine': '4-HO-MET',
  '4-hydroxy-N-methyl-N-propyltryptamine': '4-HO-MPT',
  '4-hydroxy-N-ethyl-N-propyltryptamine': '4-HO-EPT',
  '4-hydroxytryptamine': '4-HO-T',
  '5-methoxy-N,N-diethyltryptamine': '5-MeO-DET',
  '5-methoxy-N-ethyl-N-methyltryptamine': '5-MeO-MET',
  '5-methoxy-N,N-dipropyltryptamine': '5-MeO-DPT',
  '5-fluoro-N,N-dimethyltryptamine': '5-Fluoro-DMT',
  '5-chloro-N,N-dimethyltryptamine': '5-Chloro-DMT',
  '5-bromo-N,N-dimethyltryptamine': '5-Bromo-DMT',
  '6-fluoro-N,N-dimethyltryptamine': '6-Fluoro-DMT',
  '2-methyl-N,N-dimethyltryptamine': '2,N,N-TMT',
  '4-methyl-N,N-dimethyltryptamine': '4,N,N-TMT',
  '5-methyl-N,N-dimethyltryptamine': '5-N,N-TMT',
  '7-methyl-N,N-dimethyltryptamine': '7,N,N-TMT',
  '4-hydroxy-5-methoxy-N,N-dimethyltryptamine': 'psilomethoxin',
  '5-(N-methylsulfamoyl)methyl-N,N-dimethyltryptamine': 'sumatriptan',
  '5-(1,2,4-triazol-1-yl)methyl-N,N-dimethyltryptamine': 'rizatriptan',
  '5-(pyrrolidin-1-ylsulfonyl)methyl-N,N-dimethyltryptamine': 'almotriptan',
  '3-(1-methylpiperidin-4-yl)-5-(N-methylsulfamoyl)ethylindole': 'naratriptan',
  '3-(1-methylpyrrolidin-2-yl)methyl-5-(phenylsulfonyl)ethylindole': 'eletriptan',
  '6-(N-methylamino)-3-carbamoyltetrahydrocarbazole': 'frovatriptan',
  '5-(2-oxo-1,3-oxazolidin-4-yl)methyl-N,N-dimethyltryptamine': 'zolmitriptan',
  '5-carbamoyltryptamine': '5-CT',
  '5-benzyloxytryptamine': '5-BT',
  '6-methyl-lysergol': 'lysergol',
  '6-methyl-N-(1-hydroxypropan-2-yl)lysergamide': 'ergometrine',
  '6-methyl-N-(1-hydroxy-2-methylpropan-2-yl)lysergamide': 'methylergometrine',
  '1,6-dimethyl-N-(1-hydroxybutan-2-yl)lysergamide': 'methysergide',
  '4-(2-aminoethyl)-8-bromo-2,3,6,7-tetrahydrobenzodifuran': '2C-B-FLY',
  '6-ethyl-N,N-diethyllysergamide': 'ETH-LAD',
  '6-methyl-N,N-dipropyllysergamide': 'PRO-LAD',
  '6-methyl-lysergamide': 'LSA',
  '6-allyl-N,N-diethyllysergamide': 'AL-LAD',
  '1-propionyl-6-methyl-N,N-diethyllysergamide': '1P-LSD',
  '1-acetyl-6-methyl-N,N-diethyllysergamide': 'ALD-52',
  '2-bromo-6-methyl-N,N-diethyllysergamide': 'BOL-148',
  '1-butyryl-6-methyl-N,N-diethyllysergamide': '1B-LSD',
  '1-valeryl-6-methyl-N,N-diethyllysergamide': '1V-LSD',
  '1-cyclopropanecarbonyl-6-methyl-N,N-diethyllysergamide': '1cP-LSD',
  '6-methyl-2,4-dimethylazetidide': 'LSZ',
  'N,N-diisopropyltryptamine': 'DiPT',
  '5-methoxy-N,N-diisopropyltryptamine': '5-MeO-DiPT',
  'alpha-methyltryptamine': 'AMT',
  'alpha-ethyltryptamine': 'AET',
  'N,N-diallyltryptamine': 'DALT',
  '5-methoxy-N,N-diallyltryptamine': '5-MeO-DALT',
  '4-hydroxy-N,N-diallyltryptamine': 'daltocin',
  'N-allyl-N-methyltryptamine': 'MALT',
  '5-methoxy-N-allyl-N-methyltryptamine': '5-MeO-MALT',
  '4-hydroxy-N-allyl-N-methyltryptamine': 'maltocin',
  '5-methoxy-N-isopropyl-N-methyltryptamine': '5-MeO-MiPT',
  '4-hydroxy-N-isopropyl-N-methyltryptamine': 'miprocin',
  '4-hydroxy-N,N-diisopropyltryptamine': 'iprocin',
  'N-cyclopropyl-N-methyltryptamine': 'McPT',
  '4-hydroxy-N-cyclopropyl-N-methyltryptamine': '4-HO-McPT',
  'N-ethyl-N-isopropyltryptamine': 'EiPT',
  '5-methoxy-N-ethyl-N-isopropyltryptamine': '5-MeO-EiPT',
  'N-isopropyl-N-propyltryptamine': 'PiPT',
  'N-allyl-N-isopropyltryptamine': 'iPALT',
  '5-methoxy-N-allyl-N-isopropyltryptamine': 'ASR-3001',
  'N-allyl-N-propyltryptamine': 'PALT',
  '5-methoxy-N-methyltryptamine': '5-MeO-NMT',
  '5-methoxy-N-isopropyltryptamine': '5-MeO-NiPT',
  '4-hydroxy-N-ethyltryptamine': '4-HO-NET',
  '4-hydroxy-N-propyltryptamine': '4-HO-NPT',
  '4-hydroxy-N-isopropyltryptamine': '4-HO-NiPT',
  '4-hydroxy-N-allyltryptamine': '4-HO-NALT',
  '4-hydroxy-N,N-dibutyltryptamine': '4-HO-DBT',
  '5-methoxy-N,N-dibutyltryptamine': '5-MeO-DBT',
  '5-hydroxy-N-ethyl-N-methyltryptamine': '5-HO-MET',
  '6-hydroxy-N,N-diethyltryptamine': '6-HO-DET',
  '5-methylthio-N,N-dimethyltryptamine': '5-MeS-DMT',
  '4-methylthio-N,N-dimethyltryptamine': '4-MeS-DMT',
  '4-hydroxy-1-methyl-N,N-dimethyltryptamine': '1-methylpsilocin',
  '5-methoxy-2-methyl-N,N-dimethyltryptamine': '5-MeO-2,N,N-TMT',
  '4-acetoxy-N-isopropyl-N-methyltryptamine': 'mipracetin',
  '4-acetoxy-N,N-diisopropyltryptamine': 'ipracetin',
  '4-acetoxy-N-ethyl-N-isopropyltryptamine': 'ethipracetin',
  '4-acetoxy-N-methyl-N-propyltryptamine': '4-AcO-MPT',
  '4-acetoxy-N-ethyl-N-propyltryptamine': '4-AcO-EPT',
  '4-acetoxy-N,N-diallyltryptamine': 'daltacetin',
  '4-acetoxy-N-allyl-N-methyltryptamine': '4-AcO-MALT',
  '4-acetoxy-N-cyclopropyl-N-methyltryptamine': '4-AcO-McPT',
  '5-acetoxy-N,N-dimethyltryptamine': 'O-acetylbufotenine',
  '4-propionyloxy-N,N-dimethyltryptamine': '4-PrO-DMT',
  '4-propionyloxy-N,N-diethyltryptamine': '4-PrO-DET',
  '4-propionyloxy-N-ethyl-N-methyltryptamine': '4-PrO-MET',
  '4-propionyloxy-N,N-dipropyltryptamine': '4-PrO-DPT',
  '4-propionyloxy-N,N-diisopropyltryptamine': '4-PrO-DiPT',
  '4-propionyloxy-N-isopropyl-N-methyltryptamine': '4-PrO-MiPT',
  '4-propionyloxy-N-ethyl-N-isopropyltryptamine': '4-PrO-EiPT',
  '4-propionyloxy-N-methyl-N-propyltryptamine': '4-PrO-MPT',
  '4-propionyloxy-N,N-diallyltryptamine': '4-PrO-DALT',
  '5-methoxy-alpha-methyltryptamine': '5-MeO-AMT',
  '5-methoxy-alpha-ethyltryptamine': '5-MeO-AET',
  '4-hydroxy-alpha-methyltryptamine': '4-HO-AMT',
  '4-methyl-alpha-methyltryptamine': '4-methyl-AMT',
  '5-fluoro-alpha-methyltryptamine': '5-fluoro-AMT',
  '6-fluoro-alpha-methyltryptamine': '6-fluoro-AMT',
  '5-hydroxy-alpha-methyltryptamine': 'α-methylserotonin',
  'alpha-methyl-N,N-dimethyltryptamine': 'α,N,N-TMT',
  '5-methoxy-alpha-methyl-N-methyltryptamine': 'α,N,O-TMS',
  '5-methoxy-alpha-methyl-N,N-dimethyltryptamine': 'α,N,N,O-TeMS',
  '2-(1H-inden-3-yl)-N,N-dimethylethanamine': 'C-DMT',
  '1-(2-(dimethylamino)ethyl)indole': 'isoDMT',
  '1-(2-(dimethylamino)ethyl)-6-methoxyindole': '6-MeO-isoDMT',
  '3-(2-(dimethylamino)ethyl)-5-methoxybenzofuran': 'dimemebfe',
  '3-(2-aminopropyl)-5-methoxybenzofuran': 'mebfap',
  '3-(2-diisopropylaminoethyl)-5-methoxybenzofuran': '5-MeO-DiBF',
  '3-(2-aminopropyl)benzothiophene': '3-APBT',
  '5-(2-aminopropyl)benzothiophene': '5-APBT',
  '6-(2-aminopropyl)benzothiophene': '6-APBT',
  '1-(2,3-dihydrobenzofuran-6-yl)propan-2-amine': '6-APDB',
  '1-(1H-indol-3-yl)-2-(pyrrolidin-1-yl)ethane': 'pyr-T',
  '1-(1H-indol-3-yl)-2-(piperidin-1-yl)ethane': 'pip-T',
  '1-(5-methoxy-1H-indol-3-yl)-2-(pyrrolidin-1-yl)ethane': '5-MeO-pyr-T',
  '3-(1-methylpyrrolidin-2-yl)methylindole': 'MPMI',
  '3-(1-methylpyrrolidin-2-yl)methyl-5-methoxyindole': '5-MeO-MPMI',
  '3-(1-methylpyrrolidin-2-yl)methyl-4-hydroxyindole': 'lucigenol',
  '2,3,4,9-tetrahydro-1H-β-carboline': 'tryptoline',
  '1-methyl-2,3,4,9-tetrahydro-1H-β-carboline': 'tetrahydroharman',
  '6-methoxy-2,3,4,9-tetrahydro-1H-β-carboline': 'pinoline',
  '6-methoxy-1-methyl-2,3,4,9-tetrahydro-1H-β-carboline': '6-MeO-THH',
  '7-hydroxy-1-methyl-4,9-dihydro-3H-β-carboline': 'harmalol',
  '10,11-dihydroxyaporphine': 'apomorphine',
  '10,11-dihydroxynoraporphine': 'norapomorphine',
  '10,11-dihydroxy-N-propylnoraporphine': 'N-propylnorapomorphine',
  '10,11-dihydroxy-N-ethylnoraporphine': 'N-ethylnorapomorphine',
  '11-hydroxy-10-methoxyaporphine': 'apocodeine',
  '1,2-dimethoxyaporphine': 'nuciferine',
  '1,2,9,10-tetramethoxyaporphine': 'glaucine',
  '2,9-dihydroxy-1,10-dimethoxyaporphine': 'boldine',
  '1,2-methylenedioxyaporphine': 'roemerine',
  '1,2-methylenedioxynoraporphine': 'anonaine',
  '9,10-dimethoxy-1,2-methylenedioxyaporphine': 'dicentrine',
  '10,11-methylenedioxy-N-propylnoraporphine': 'MDO-NPA',
  '5-benzyl-2-methyl-2,3,4,5-tetrahydro-1H-γ-carboline': 'mebhydroline',
  '1-(4,12-dimethyl-4,8-diazatricyclo[7.4.0.0²,⁷]trideca-1(13),2(7),9,11-tetraen-8-yl)-2-(6-methylpyridin-3-yl)ethane': 'latrepirdine',
  '1-(2-aminopropyl)-1H-indazol-6-ol': 'AL-38022A',
  '4,6-dioxatricyclo[7.3.0.0³,⁷]dodeca-1,3(7),8-trien-11-amine': 'MDAI',
  '(4-bromo-2,5-dimethoxybicyclo[4.2.0]octa-1,3,5-trien-7-yl)methanamine': 'TCB-2',
  '10-chloro-2-methyl-4-azabicyclo[5.4.0]undeca-1(11),7,9-triene': 'lorcaserin',
  '3-(trifluoromethyl)amphetamine': 'norfenfluramine',
  '3-methoxy-4-methylamphetamine': 'MMA',
  '4-methylamphetamine': '4-MA',

  '2,5-dimethoxy-4-propylphenethylamine': '2C-P',
  '4-fluoro-2,5-dimethoxyphenethylamine': '2C-F',
  '2,5-dimethoxy-4-methylphenethylamine': '2C-D',
  '4-butyl-2,5-dimethoxyphenethylamine': '2C-Bu',
  '4-ethyl-2,5-dimethoxyamphetamine': 'DOET',
  '2,5-dimethoxy-4-propylamphetamine': 'DOPR',
  '4-butyl-2,5-dimethoxyamphetamine': 'DOBU',
  '2,5-dimethoxyamphetamine': 'DOH',
  '2,4,5-trimethoxyamphetamine': 'TMA-2',
  '3,4,5-trimethoxyamphetamine': 'TMA',
  '2,4,6-trimethoxyamphetamine': 'TMA-6',
  '2,3,4-trimethoxyamphetamine': 'TMA-3',
  '2,3,5-trimethoxyamphetamine': 'TMA-4',
  '2,3,6-trimethoxyamphetamine': 'TMA-5',
  '4-ethoxy-3,5-dimethoxyphenethylamine': 'escaline',
  '3,5-dimethoxy-4-propoxyphenethylamine': 'proscaline',
  '3,4,5-trimethoxy-N,N-dimethylphenethylamine': 'trichocereine',
  '2,5-dimethoxy-3,4-dimethylphenethylamine': '2C-G',
  '3-ethyl-2,5-dimethoxy-4-methylphenethylamine': '2C-G-3',
  '3,4-diethyl-2,5-dimethoxyphenethylamine': '2C-G-4',

  '2,5-dimethoxy-4-methylthiophenethylamine': '2C-T',
  '4-ethylthio-2,5-dimethoxyphenethylamine': '2C-T-2',
  '2,5-dimethoxy-4-propylthiophenethylamine': '2C-T-7',
  '2-(4-isopropylsulfanyl-2,5-dimethoxyphenyl)ethanamine': '2C-T-4',
  '2-(2,5-dimethoxy-4-(sec-butylsulfanyl)phenyl)ethanamine': '2C-T-8',
  '4-butylthio-2,5-dimethoxyphenethylamine': '2C-T-9',
  '4-(2-fluoroethyl)thio-2,5-dimethoxyphenethylamine': '2C-T-21',
  '2-(4-cyclopropylmethylsulfanyl-2,5-dimethoxyphenyl)ethanamine': '2C-T-15',
  '2,5-dimethoxy-4-nitrophenethylamine': '2C-N',
  '1-(3-aminopropyl)-4-bromo-2,5-dimethoxybenzene': '3C-B',
  '1-(3-aminopropyl)-4-chloro-2,5-dimethoxybenzene': '3C-C',
  '1-(3-aminopropyl)-4-iodo-2,5-dimethoxybenzene': '3C-I',
  '1-(3-aminopropyl)-2,5-dimethoxy-4-methylbenzene': '3C-D',
  '1-(3-aminopropyl)-4-ethyl-2,5-dimethoxybenzene': '3C-E',
  '1-(3-aminopropyl)-2,5-dimethoxy-4-propylbenzene': '3C-P',
  '1-(4-aminobutyl)-4-bromo-2,5-dimethoxybenzene': '4C-B',
  '1-(4-aminobutyl)-2,5-dimethoxy-4-methylbenzene': '4C-D',
  '1-(4-aminobutyl)-2,5-dimethoxy-4-propylbenzene': '4C-P',

  '(2-amino-1-oxopropyl)benzene': 'cathinone',
  '(2-(methylamino)-1-oxopropyl)benzene': 'methcathinone',
  '1-(2-(methylamino)-1-oxopropyl)-4-methylbenzene': 'mephedrone',
  '1,2-methylenedioxy-4-(2-(methylamino)-1-oxopropyl)benzene': 'methylone',
  '1,2-methylenedioxy-4-(2-(ethylamino)-1-oxopropyl)benzene': 'ethylone',
  '1,2-methylenedioxy-4-(2-(methylamino)-1-oxobutyl)benzene': 'butylone',
  '(2-(methylamino)-1-oxobutyl)benzene': 'buphedrone',
  '(2-(methylamino)-1-oxopentyl)benzene': 'pentedrone',
  '(2-(ethylamino)-1-oxopentyl)benzene': 'N-ethylpentedrone',
  '1-(2-(methylamino)-1-oxopropyl)-3-methylbenzene': '3-MMC',
  '1-(2-amino-1-oxoethyl)-4-bromo-2,5-dimethoxybenzene': 'bk-2C-B',
  '2,3-dihydro-1H-inden-2-amine': '2-AI',
  'N-methyl-2,3-dihydro-1H-inden-2-amine': 'NM-2-AI',
  '5-iodo-2,3-dihydro-1H-inden-2-amine': '5-IAI',
  '5-methoxy-6-methyl-2,3-dihydro-1H-inden-2-amine': 'MMAI',
  '2-(methylamino)-2-phenylcyclohexan-1-one': 'deschloroketamine',
  '2-(2-fluorophenyl)-2-(methylamino)cyclohexan-1-one': '2F-DCK',
  '1-(1-(3-methoxyphenyl)cyclohexyl)piperidine': '3-MeO-PCP',
  '1,2-diphenyl-1-(piperidin-1-yl)ethane': 'diphenidine',
  'N-ethyl-1,2-diphenylethanamine': 'ephenidine',
  '1-(2-methoxyphenyl)-2-phenyl-1-(piperidin-1-yl)ethane': 'methoxphenidine',
  '2-(3-fluorophenyl)-3-methylmorpholine': '3-FPM',
  'ethyl phenyl-(piperidin-2-yl)acetate': 'ethylphenidate',
  'methyl (4-fluorophenyl)-(piperidin-2-yl)acetate': '4F-MPH',
  '1-(2-(ethylamino)-1-oxopropyl)-4-methylbenzene': '4-MEC',
  '1-(2-(methylamino)-1-oxopropyl)-4-fluorobenzene': 'flephedrone',
  '1-phenyl-2-(pyrrolidin-1-yl)pentan-1-one': 'alpha-PVP',
  '1-(1,3-benzodioxol-5-yl)-2-(pyrrolidin-1-yl)pentan-1-one': 'MDPV',
  '4-acetoxy-N,N-dimethyltryptamine': 'psilacetin',
  '4-acetoxy-N,N-diethyltryptamine': 'ethacetin',
  '4-acetoxy-N,N-dipropyltryptamine': 'depracetin',
  '4-acetoxy-N-ethyl-N-methyltryptamine': 'metacetin',
  '4-phosphoryloxy-N,N-dimethyltryptamine': 'psilocybin',
  '4-phosphoryloxy-N-methyltryptamine': 'baeocystin',
  '4-phosphoryloxytryptamine': 'norbaeocystin',
  '4-phosphoryloxy-N,N-diethyltryptamine': 'ethocybin',

  'naphthalen-1-ol': '1-naphthol',
  'naphthalen-2-ol': '2-naphthol',
  'naphthalen-1-amine': '1-naphthylamine',
  'naphthalen-2-amine': '2-naphthylamine',
  'quinolin-8-ol': 'oxine',
  '2-methylquinoline': 'quinaldine',
  '1-methylβ-carboline': 'harman',
  '7-methoxy-1-methylβ-carboline': 'harmine',
  '7-hydroxy-1-methylβ-carboline': 'harmol',
  '6-methyl-N,N-diethyllysergamide': 'LSD',
  '5-(2-aminopropyl)benzofuran': '5-APB',
  '6-(2-aminopropyl)benzofuran': '6-APB',
  '5-(2-(methylamino)propyl)benzofuran': '5-MAPB',
  '6-(2-(methylamino)propyl)benzofuran': '6-MAPB',
  '5-(2-(methylamino)propyl)benzothiophene': '5-MAPBT',
  '6-(2-(methylamino)propyl)benzothiophene': '6-MAPBT',
  '4-(2-aminopropyl)-8-bromobenzodifuran': 'Bromo-DragonFly',
  '1-(8-bromo-4,10-dioxatricyclo[7.3.0.0³,⁷]dodeca-1(9),2,5,7,11-pentaen-2-yl)propan-2-amine': 'Bromo-DragonFly',
  '4-(2-aminoethyl)-8-bromobenzodifuran': '2C-B-DragonFly',
  '4-(2-aminopropyl)-8-iodobenzodifuran': 'Iodo-DragonFly',
  '4-(2-aminoethyl)-8-iodobenzodifuran': '2C-I-DragonFly',
  '4-(2-aminopropyl)-8-chlorobenzodifuran': 'Chloro-DragonFly',
  '4-(2-aminoethyl)-8-chlorobenzodifuran': '2C-C-DragonFly',
  'N-phenyl-N-(1-(2-phenylethyl)piperidin-4-yl)propanamide': 'fentanyl',
  '6-(dimethylamino)-4,4-diphenylheptan-3-one': 'methadone',
  '1-(3-methoxyphenyl)-2-(dimethylaminomethyl)cyclohexan-1-ol': 'tramadol',
  '1,13-dimethyl-10-(3-methylbut-2-en-1-yl)-10-azatricyclo[7.3.1.0²,⁷]trideca-2(7),3,5-trien-4-ol': 'pentazocine',
  '3-cyclopropylmethyl-16-(1-hydroxy-1,2,2-trimethylpropyl)-15-methoxy-13-oxa-3-azahexacyclo[13.2.2.1²,⁸.0¹,⁶.0⁶,¹⁴.0⁷,¹²]icosa-7,9,11-trien-11-ol': 'buprenorphine',
  '17-methyl-17-azatetracyclo[7.5.3.0¹,¹⁰.0²,⁷]heptadeca-2(7),3,5-trien-4-ol': 'levorphanol',
  '17-(prop-2-en-1-yl)-17-azatetracyclo[7.5.3.0¹,¹⁰.0²,⁷]heptadeca-2(7),3,5-trien-4-ol': 'levallorphan',
  '17-cyclobutylmethyl-17-azatetracyclo[7.5.3.0¹,¹⁰.0²,⁷]heptadeca-2(7),3,5-triene-4,10-diol': 'butorphanol',
  '3-cyclopropylmethyl-16-(1-hydroxy-1-methylethyl)-15-methoxy-13-oxa-3-azahexacyclo[13.2.2.1²,⁸.0¹,⁶.0⁶,¹⁴.0⁷,¹²]icosa-7,9,11-trien-11-ol': 'diprenorphine',
  '22-cyclopropylmethyl-14-oxa-11,22-diazaheptacyclo[13.9.1.0¹,¹³.0²,²¹.0⁴,¹².0⁵,¹⁰.0¹⁹,²⁵]pentacosa-4(12),5,7,9,15,17,19(25)-heptaene-2,16-diol': 'naltrindole',
  '4-cyclopropylmethyl-14-methyl-12-oxa-4-azapentacyclo[9.6.1.0¹,¹³.0⁵,¹⁷.0⁷,¹⁸]octadeca-7(18),8,10-triene-10,17-diol': 'nalmefene',
  '15-amino-1-methyltricyclo[7.5.1.0²,⁷]pentadeca-2(7),3,5-trien-4-ol': 'dezocine',
  'ethyl 1-methyl-4-phenylpiperidine-4-carboxylate': 'meperidine',
  'methyl 1-(2-phenylethyl)-4-(phenyl-propanoylamino)piperidine-4-carboxylate': 'carfentanil',
  'N-(4-methoxymethyl-1-(2-(thiophen-2-yl)ethyl)piperidin-4-yl)-N-phenylpropanamide': 'sufentanil',
  'methyl 1-(2-methoxycarbonylethyl)-4-(phenyl-propanoylamino)piperidine-4-carboxylate': 'remifentanil',
  'N-(1-(2-(4-ethyl-5-oxo-4,5-dihydro-1H-tetrazol-1-yl)ethyl)-4-methoxymethylpiperidin-4-yl)-N-phenylpropanamide': 'alfentanil',
  '4-(4-(4-chlorophenyl)-4-hydroxypiperidin-1-yl)-N,N-dimethyl-2,2-diphenylbutanamide': 'loperamide',
  '3-(3-(dimethylamino)-1-ethyl-2-methylpropyl)phenol': 'tapentadol',
  '4-methoxy-17-methyl-17-azatetracyclo[7.5.3.0¹,¹⁰.0²,⁷]heptadeca-2(7),3,5-triene': 'dextromethorphan',
  '10-cyclopropylmethyl-1,13-dimethyl-10-azatricyclo[7.3.1.0²,⁷]trideca-2(7),3,5-trien-4-ol': 'cyclazocine',
  '1,13-dimethyl-10-(2-phenylethyl)-10-azatricyclo[7.3.1.0²,⁷]trideca-2(7),3,5-trien-4-ol': 'phenazocine',
  '(3,4-dichlorophenyl)-N-methyl-N-(2-(pyrrolidin-1-yl)cyclohexyl)acetamide': 'U-50488',
  '4-((2,5-dimethyl-4-(prop-2-en-1-yl)piperazin-1-yl)-(3-methoxyphenyl)methyl)-N,N-diethylbenzamide': 'SNC-80',
  '2-(5-azatricyclo[7.4.0.0²,⁶]trideca-1(9),2(6),3,7-tetraen-3-yl)ethanamine': 'noramine',
  '2-(5-azatricyclo[7.4.0.0²,⁶]trideca-1(9),2(6),3,7-tetraen-3-yl)-N,N-dimethylethanamine': 'N,N-dimethylnoramine',
};

function molecularFormula(graph, atomIds) {
  const counts = {};
  atomIds.forEach((id) => {
    const atom = graph.getAtom(id);
    if (!atom) {
      return;
    }
    counts[atom.element] = (counts[atom.element] || 0) + 1;
    const hydrogens = Math.max(
      0,
      maxValenceFor(atom.element) - graph.totalBondOrder(id)
    );
    if (hydrogens > 0) {
      counts.H = (counts.H || 0) + hydrogens;
    }
  });

  const order = [];
  if (counts.C) {
    order.push('C');
  }
  if (counts.H) {
    order.push('H');
  }
  Object.keys(counts)
    .filter((element) => element !== 'C' && element !== 'H')
    .sort()
    .forEach((element) => order.push(element));

  return order
    .map((element) => (counts[element] > 1 ? element + counts[element] : element))
    .join('');
}

function polishAromaticName(name) {
  if (!name) {
    return name;
  }
  return name
    .replace(/benzen-1-ol$/, 'phenol')
    .replace(/benzen-1-amine$/, 'aniline')
    .replace(/benzen-1-thiol$/, 'benzenethiol')
    .replace(/(^|-)(di(?:methyl|ethyl)amino|methylamino|ethylamino|trifluoromethyl|trichloromethyl)(?=[a-z-])(?!rex)/g, '$1($2)')
    .replace(/(di|tri)(di(?:methyl|ethyl)amino)/g, (m, mult, group) => (mult === 'di' ? 'bis(' : 'tris(') + group + ')')
    .replace(/\(aminosulfonyl\)/g, 'sulfamoyl')
    .replace(/\(hydroxysulfonyl\)/g, 'sulfo')
    .replace(/acetylamino/g, 'acetamido')
    .replace(/mercapto/g, 'sulfanyl');
}

function indicatedHydrogenStyle(name) {
  return name.replace(/(^|[a-z)(])(?<!iso|benz|H-|\d)(pyrrol|indol|imidazol|pyrazol)(?=e(?![a-z])|-\d)/g,
    (m, lead, ring) => lead + (/[a-z)]/.test(lead) ? '-' : '') + '1H-' + ring);
}

function oxyPrefixStyle(name) {
  return name
    .replace(/phenylmethyloxy/g, 'benzyloxy')
    .replace(/(^|\d-|\()(pent|hex|hept|oct|non|dec)oxy(?=[a-z(])/g, (m, lead, root) => lead + '(' + root + 'yloxy)')
    .replace(/(^|\d-|\()(pentyl|hexyl|heptyl|octyl|nonyl|decyl|benzyl)oxy(?=[a-z(])/g, (m, lead, alkyl) => lead + '(' + alkyl + 'oxy)');
}

function sulfanylPrefixStyle(name) {
  return oxyPrefixStyle(indicatedHydrogenStyle(name)).replace(/(^|\d-)(methyl|ethyl|propyl|butyl|pentyl|hexyl|isopropyl|benzyl|phenyl)(thio(?!phen|l|u|c|x|a|ur)|sulfanyl|sulfinyl|sulfonyl)(?=[a-z])/g,
    (m, lead, alkyl, kind) => lead + '(' + alkyl + (kind === 'thio' ? 'sulfanyl' : kind) + ')');
}

function nameStructureOnce(graph, atomIds) {
  genMixedNLocants = false;
  lastSubstituentStereoLocants = null;
  lastChainStereoLocants = null;
  lastRingStereoLocants = null;
  lastRingDisplayLocants = null;
  lastScaffoldStereoLocants = null;
  if (!atomIds || atomIds.length === 0) {
    return { full: '', common: null };
  }
  let derived = null;
  try {
    derived = deriveName(graph, atomIds);
  } catch (error) {
    derived = null;
  }
  if (!derived) {
    try {
      derived = generalName(graph, atomIds, false);
    } catch (error) {
      derived = null;
    }
    lastChainStereoLocants = genParentLocants;
    lastRingStereoLocants = null;
    lastRingDisplayLocants = null;
  }
  const hasP = graph.atoms.some((a) => a.element === 'P' && atomIds.includes(a.id));
  if (derived && hasP && !/phosph/.test(derived)) {
    derived = null;
  }
  const primary = polishAromaticName(derived);
  derived = primary;
  const isFinalizedScaffoldName = /(noramine|carboline|carboline-\d+-carboxylic acid|tetrahydrocarbazole|benzodifuran|benzofuran|lysergamide|lysergol|ergoline|ergoline-8-carboxylic acid)$/.test(derived || '');
  if (derived && !isFinalizedScaffoldName) {
    const savedSubstituentLocants = lastSubstituentStereoLocants;
    const savedScaffoldLocants = lastScaffoldStereoLocants;
    const savedRingLocants = lastRingStereoLocants;
    const savedChainLocants = lastChainStereoLocants;
    const savedDisplayLocants = lastRingDisplayLocants;
    try {
      const alt = generalName(graph, atomIds, true);
      const idSetForAlt = new Set(atomIds);
      const acyclic = graph.bonds.filter((b) => idSetForAlt.has(b.atomA) && idSetForAlt.has(b.atomB)).length < atomIds.length;
      const amineParent = acyclic && alt && /amine$/.test(alt) && /amino/.test(derived) && (/(ane|ene|yne)$/.test(derived) || /(^|-)N(,N)?-/.test(alt));
      const fusedSuffix = alt && /(hydroxy|amino|sulfanyl|mercapto)/.test(derived) && /(indole|naphthalene|quinoline|quinoxaline|quinazoline|cinnoline|phthalazine|phenanthrene|acridine|anthracene)$/.test(derived) && /(ol|amine|thiol)$/.test(alt);
      const lostSulfur = alt && graph.atoms.some((a) => a.element === 'S' && idSetForAlt.has(a.id)) && !/sulf|thi|mercapto/.test(derived) && /sulf|thi/.test(alt);
      const sulfurClass = alt && / (di|tri|tetra)?sulf(ide|oxide)$/.test(alt) && /(thio|sulfinyl|sulfanyl)[a-z]*(ane|ene|benzene)$/.test(derived);
      const alcoholParent = alt && /ol$/.test(alt) && /hydroxy/.test(derived) && /(ane|ene)$/.test(derived);
      const wanted = amineParent || fusedSuffix || lostSulfur || sulfurClass || alcoholParent || /carboxy|cyano|formyl|(?<![a-z])oxo(?![a-z])|acetyl|carbamoyl|carbonyl|sulfo|sulfamoyl|acetoxy|propionyloxy|butyryloxy|valeryloxy|benzoyl/.test(derived) || (alt && /'/.test(alt)) || /^benzylbenzene$/.test(derived) || /^\(.*yl\)(meth|eth|prop)ane$/.test(derived);
      const useAlt = alt && wanted && !/bicyclo|spiro|nitrilo/.test(alt);
      derived = useAlt ? polishAromaticName(alt) : derived;
      if (useAlt) {
        lastChainStereoLocants = genParentLocants;
        lastSubstituentStereoLocants = null;
        lastRingStereoLocants = null;
        lastScaffoldStereoLocants = null;
      } else {
        lastSubstituentStereoLocants = savedSubstituentLocants;
        lastScaffoldStereoLocants = savedScaffoldLocants;
        lastRingStereoLocants = savedRingLocants;
        lastRingDisplayLocants = savedDisplayLocants;
        lastChainStereoLocants = savedChainLocants;
        const noLocants = !savedChainLocants && !savedRingLocants && !savedSubstituentLocants && !savedScaffoldLocants;
        if (noLocants && alt && polishAromaticName(alt) === derived) {
          lastChainStereoLocants = genParentLocants;
        }
      }
    } catch (error) {
      derived = derived;
      lastSubstituentStereoLocants = savedSubstituentLocants;
      lastScaffoldStereoLocants = savedScaffoldLocants;
      lastRingStereoLocants = savedRingLocants;
      lastRingDisplayLocants = savedDisplayLocants;
      lastChainStereoLocants = savedChainLocants;
    }
  }
  let common = null;
  if (primary && Object.prototype.hasOwnProperty.call(COMMON_NAMES, primary)) {
    common = COMMON_NAMES[primary];
  } else if (derived && Object.prototype.hasOwnProperty.call(COMMON_NAMES, derived)) {
    common = COMMON_NAMES[derived];
  }
  const systematic = primary || derived;
  if (!derived) {
    try {
      derived = polishAromaticName(generalName(graph, atomIds, true));
      lastChainStereoLocants = derived ? genParentLocants : null;
    } catch (error) {
      derived = null;
    }
    if (derived && hasP && !/phosph/.test(derived)) {
      derived = null;
    }
  }
  const formula = derived || systematic ? null : molecularFormula(graph, atomIds);
  const rawFull = derived || systematic || INORGANIC_NAMES[formula] || formula;
  const full = rawFull ? sulfanylPrefixStyle(rawFull) : rawFull;
  if (!common && Object.prototype.hasOwnProperty.call(COMMON_NAMES, rawFull)) {
    common = COMMON_NAMES[rawFull];
  }
  if (!common && Object.prototype.hasOwnProperty.call(COMMON_NAMES, full)) {
    common = COMMON_NAMES[full];
  }
  if (!common && INORGANIC_NAMES[full]) {
    common = INORGANIC_NAMES[full];
  }
  if (!common && genMixedNLocants && !genLegacyNLocants) {
    const saved = [lastSubstituentStereoLocants, lastScaffoldStereoLocants, lastRingStereoLocants, lastRingDisplayLocants, lastChainStereoLocants, genParentLocants];
    genLegacyNLocants = true;
    try {
      const legacy = nameStructureOnce(graph, atomIds);
      common = legacy.full && /\bN[,-]/.test(legacy.full) ? legacy.common : null;
    } catch (error) {
      common = null;
    }
    genLegacyNLocants = false;
    [lastSubstituentStereoLocants, lastScaffoldStereoLocants, lastRingStereoLocants, lastRingDisplayLocants, lastChainStereoLocants, genParentLocants] = saved;
  }
  return { full, common, systematicPrimary: systematic };
}

function kekuleRings(graph, atomIds) {
  const set = new Set(atomIds);
  const nbrs = new Map(atomIds.map((id) => [id, []]));
  graph.bonds.forEach((bond) => {
    if (set.has(bond.atomA) && set.has(bond.atomB)) {
      nbrs.get(bond.atomA).push({ id: bond.atomB, order: bond.order });
      nbrs.get(bond.atomB).push({ id: bond.atomA, order: bond.order });
    }
  });
  const rings = [];
  const seen = new Set();
  const walk = (path) => {
    const last = path[path.length - 1];
    if (path.length === 6) {
      if (nbrs.get(last).some((e) => e.id === path[0])) {
        const key = path.slice().sort((a, b) => a - b).join(',');
        if (!seen.has(key)) {
          seen.add(key);
          rings.push(path.slice());
        }
      }
      return;
    }
    nbrs.get(last).forEach((e) => {
      if (!path.includes(e.id) && e.id > path[0]) {
        walk(path.concat(e.id));
      }
    });
  };
  atomIds.forEach((id) => walk([id]));
  return rings.filter((ring) => {
    const orders = ring.map((id, i) => nbrs.get(id).find((e) => e.id === ring[(i + 1) % 6]).order);
    if (!orders.every((o, i) => o === (i % 2 === 0 ? orders[0] : 3 - orders[0])) || (orders[0] !== 1 && orders[0] !== 2)) {
      return false;
    }
    return ring.every((id) => {
      const doubles = nbrs.get(id).filter((e) => e.order === 2);
      return doubles.length === 1 && ring.includes(doubles[0].id);
    });
  });
}

function kekuleVariants(graph, atomIds) {
  const signature = (g) => g.bonds.map((b) => b.order).join('');
  const clone = (g) => {
    const copy = new Graph();
    copy.atoms = g.atoms.map((a) => Object.assign({}, a));
    copy.bonds = g.bonds.map((b) => Object.assign({}, b));
    copy.nextAtomId = g.nextAtomId;
    copy.nextBondId = g.nextBondId;
    return copy;
  };
  const start = clone(graph);
  const seen = new Set([signature(start)]);
  const queue = [start];
  const out = [];
  for (let i = 0; i < queue.length && out.length < 15; i++) {
    for (const ring of kekuleRings(queue[i], atomIds)) {
      const next = clone(queue[i]);
      ring.forEach((id, k) => {
        const bond = next.getBond(id, ring[(k + 1) % 6]);
        bond.order = 3 - bond.order;
      });
      const sig = signature(next);
      if (!seen.has(sig)) {
        seen.add(sig);
        queue.push(next);
        out.push(next);
      }
    }
  }
  return out;
}

function nameStructureProtio(graph, atomIds) {
  const first = nameStructureOnce(graph, atomIds);
  if (first.common || !atomIds || atomIds.length === 0) {
    return first;
  }
  for (const variant of kekuleVariants(graph, atomIds)) {
    const alt = nameStructureOnce(variant, atomIds);
    if (alt.common || (!first.systematicPrimary && alt.systematicPrimary)) {
      return alt;
    }
  }
  return first;
}

const ISOTOPE_SPECIAL_NAMES = {
  'water|2': 'deuterium oxide',
  'hydrogen peroxide|2': 'deuterium peroxide',
  'HCl|1': 'deuterium chloride',
  'HBr|1': 'deuterium bromide',
  'sulfuric acid|2': 'deuterosulfuric acid',
  'ammonia|3': 'deuterated ammonia',
};

function protioCopy(graph, atomIds) {
  const keep = new Set(atomIds.filter((id) => graph.getAtom(id).element !== 'D'));
  const copy = new Graph();
  graph.atoms.filter((a) => keep.has(a.id)).forEach((a) => {
    copy.atoms.push(a.charge ? { id: a.id, element: a.element, x: a.x, y: a.y, charge: a.charge } : { id: a.id, element: a.element, x: a.x, y: a.y });
  });
  graph.bonds.filter((b) => keep.has(b.atomA) && keep.has(b.atomB)).forEach((b) => {
    copy.bonds.push({ id: b.id, atomA: b.atomA, atomB: b.atomB, order: b.order, stereo: b.stereo });
  });
  copy.nextAtomId = graph.nextAtomId;
  copy.nextBondId = graph.nextBondId;
  return { copy, ids: [...keep] };
}

const DIASTEREOMER_COMMON_NAMES = {
  ephedrine: { like: 'pseudoephedrine' },
};

function resolveDiastereomerCommonName(common, stereoPrefix) {
  const entry = common && DIASTEREOMER_COMMON_NAMES[common];
  if (!entry) {
    return common;
  }
  const match = stereoPrefix && stereoPrefix.match(/^\(1([RS]),2([RS])\)-$/);
  if (!match) {
    return common;
  }
  return match[1] === match[2] ? entry.like : common;
}

const MORPHINAN_ENANTIOMER_NAMES = {
  dextromethorphan: { levo: 'RRR', levoName: 'levomethorphan', dextroName: 'dextromethorphan' },
  levorphanol: { levo: 'RRR', levoName: 'levorphanol', dextroName: 'dextrorphan' },
  levallorphan: { levo: 'RRR', levoName: 'levallorphan', dextroName: 'dextrallorphan' },
  butorphanol: { levo: 'RSS', levoName: 'butorphanol', dextroName: null },
};

function resolveMorphinanEnantiomer(graph, atomIds, detail) {
  const entry = detail.common && MORPHINAN_ENANTIOMER_NAMES[detail.common];
  if (!entry) {
    return null;
  }
  const skeleton = extractMorphinanSkeleton(graph, atomIds);
  if (!skeleton) {
    return null;
  }
  const { c9, c13, c14 } = skeleton;
  const commonPrefix = buildStereoPrefix(graph, atomIds, new Map([[c9, 9], [c13, 13], [c14, 14]]));
  const match = commonPrefix.match(/^\(9([RS]),13([RS]),14([RS])\)-$/);
  if (!match) {
    return null;
  }
  const fullPrefix = buildStereoPrefix(graph, atomIds, new Map([[c13, 1], [c9, 9], [c14, 10]]));
  const letters = match[1] + match[2] + match[3];
  const inverted = entry.levo.replace(/[RS]/g, (c) => (c === 'R' ? 'S' : 'R'));
  const resolved = letters === entry.levo ? entry.levoName : letters === inverted ? entry.dextroName : null;
  return Object.assign({}, detail, {
    full: fullPrefix + detail.full,
    common: resolved ? commonPrefix + resolved : null,
  });
}

const NAMING_UNSUPPORTED_ELEMENTS = new Set(PERIODIC_ELEMENTS.map((element) => element.symbol).filter((symbol) => !['H', 'C', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Br', 'I'].includes(symbol)));
const METAL_ION_NAMES = { Li: 'lithium', Na: 'sodium', K: 'potassium', Cs: 'caesium', Mg: 'magnesium', Ca: 'calcium', Zn: 'zinc' };
fillElementTable(METAL_ION_NAMES, (element) => (isMetalElement(element.symbol) ? element.name.toLowerCase() : undefined));

const ELEMENT_NAMING_STATE = { ignoreCharges: 0, allowSilicon: 0 };

function unsupportedElementName(graph, atomIds) {
  const atoms = (atomIds || []).map((id) => graph.getAtom(id)).filter(Boolean);
  const special = atoms.some((atom) => NAMING_UNSUPPORTED_ELEMENTS.has(atom.element) && !(atom.element === 'Si' && ELEMENT_NAMING_STATE.allowSilicon));
  const charged = !ELEMENT_NAMING_STATE.ignoreCharges && atoms.some((atom) => atom.charge);
  if (!special && !charged) {
    return null;
  }
  if (atoms.length === 1 && METAL_ION_NAMES[atoms[0].element] && !implicitHydrogenCount(atoms[0].element, atoms[0].charge || 0, 0)) {
    const charge = atoms[0].charge || 0;
    const name = METAL_ION_NAMES[atoms[0].element] + (charge ? '(' + Math.abs(charge) + (charge > 0 ? '+' : '-') + ')' : '');
    return { full: name, common: name, systematicPrimary: null };
  }
  const extended = typeof extendedElementName === 'function' ? extendedElementName(graph, atomIds) : null;
  if (extended) {
    return extended;
  }
  return special ? { full: '', common: null, systematicPrimary: null } : null;
}

function nameStructureDetailed(graph, atomIds) {
  const explicit = typeof explicitHydrogenName === 'function' ? explicitHydrogenName(graph, atomIds) : null;
  if (explicit) {
    return explicit;
  }
  const unsupported = unsupportedElementName(graph, atomIds);
  if (unsupported) {
    return unsupported;
  }
  const place = (prefix, name) => {
    const ester = name.match(/^((?:[a-z]+yl )+)(\S+ate)$/);
    return ester ? ester[1] + prefix + ester[2] : prefix + name;
  };
  const withStereo = (detail, stereoPrefix) => (
    stereoPrefix
      ? Object.assign({}, detail, {
          full: place(stereoPrefix, detail.full),
          common: detail.common ? place(stereoPrefix, resolveDiastereomerCommonName(detail.common, stereoPrefix)) : detail.common,
        })
      : detail
  );

  const dCount = (atomIds || []).filter((id) => {
    const a = graph.getAtom(id);
    return a && a.element === 'D';
  }).length;
  if (dCount === 0) {
    const detail = nameStructureProtio(graph, atomIds);
    const chainLocants = takeLastChainStereoLocants();
    const substituentLocants = takeLastSubstituentStereoLocants();
    const ringLocants = takeLastRingStereoLocants();
    const scaffoldLocants = takeLastScaffoldStereoLocants();
    const displayLocants = takeLastRingDisplayLocants();
    lastNameLocants = chainLocants || ringLocants || scaffoldLocants || displayLocants || null;
    const morphinanDetail = resolveMorphinanEnantiomer(graph, atomIds, detail);
    if (morphinanDetail) {
      return morphinanDetail;
    }
    const stereoPrefix = buildStereoPrefix(graph, atomIds, chainLocants || substituentLocants || ringLocants || scaffoldLocants);
    return withStereo(detail, stereoPrefix);
  }
  const stereoPrefix = buildStereoPrefix(graph, atomIds);
  const { copy, ids } = protioCopy(graph, atomIds);
  if (ids.length === 0) {
    const label = dCount === 1 ? 'deuterium atom' : dCount === 2 ? 'deuterium' : 'D' + dCount;
    return { full: label, common: label, systematicPrimary: null };
  }
  const base = nameStructureProtio(copy, ids);
  const baseName = base.common || base.full;
  const special = ISOTOPE_SPECIAL_NAMES[baseName + '|' + dCount];
  const name = special || baseName + '-d' + (dCount === 1 ? '' : dCount);
  return withStereo({ full: name, common: name, systematicPrimary: base.systematicPrimary }, stereoPrefix);
}

let lastNameLocants = null;

function nameStructureLocants(graph, atomIds) {
  lastNameLocants = null;
  const detail = nameStructureDetailed(graph, atomIds);
  const map = lastNameLocants;
  lastNameLocants = null;
  if (!map || !(detail.full || detail.common)) {
    return null;
  }
  const ids = new Set(atomIds);
  const result = new Map();
  map.forEach((locant, id) => {
    if (ids.has(id)) {
      result.set(id, locant);
    }
  });
  if (!locantMapConsistent(graph, result, detail.full)) {
    return null;
  }
  return { name: detail.common || detail.full, systematic: detail.full, locants: result };
}

function locantMapConsistent(graph, locants, systematic) {
  if (locants.size < 2 || !systematic || (/ /.test(systematic) && !/[0-9]/.test(systematic))) {
    return false;
  }
  const values = Array.from(locants.values()).sort((a, b) => a - b);
  if (values.some((value, index) => value !== index + 1)) {
    return false;
  }
  const start = locants.keys().next().value;
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const id = queue.shift();
    graph.bondsForAtom(id).forEach((bond) => {
      const next = bond.atomA === id ? bond.atomB : bond.atomA;
      if (locants.has(next) && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    });
  }
  if (seen.size !== locants.size) {
    return false;
  }
  const quoted = new Set();
  (systematic.match(/\d+(?:,\d+)*(?=-)/g) || []).forEach((group) => group.split(',').forEach((n) => quoted.add(Number(n))));
  if (quoted.size === 0) {
    return true;
  }
  const branched = [];
  locants.forEach((locant, id) => {
    const outside = graph.bondsForAtom(id).some((bond) => {
      const next = bond.atomA === id ? bond.atomB : bond.atomA;
      const atom = graph.getAtom(next);
      return !locants.has(next) && atom && atom.element !== 'H';
    });
    if (outside) {
      branched.push(locant);
    }
  });
  return Array.from(quoted).every((n) => n <= locants.size) && branched.every((n) => quoted.has(n) || n === 1);
}

function nameStructure(graph, atomIds) {
  const detail = nameStructureDetailed(graph, atomIds);
  return detail.common || detail.full;
}

function buildAdjacency(atomIds, bonds) {
  const adjacency = new Map();
  atomIds.forEach((id) => adjacency.set(id, []));
  bonds.forEach((bond) => {
    adjacency.get(bond.atomA).push({ id: bond.atomB, order: bond.order });
    adjacency.get(bond.atomB).push({ id: bond.atomA, order: bond.order });
  });
  return adjacency;
}

function buildCarbonAdjacency(graph, atomIds, bonds) {
  const adjacency = new Map();
  atomIds.forEach((id) => {
    const atom = graph.getAtom(id);
    if (atom && atom.element === 'C') {
      adjacency.set(id, []);
    }
  });
  bonds.forEach((bond) => {
    if (adjacency.has(bond.atomA) && adjacency.has(bond.atomB)) {
      adjacency.get(bond.atomA).push(bond.atomB);
      adjacency.get(bond.atomB).push(bond.atomA);
    }
  });
  return adjacency;
}

function farthestCarbon(carbonAdjacency, startId) {
  const parents = new Map([[startId, null]]);
  const queue = [startId];
  let endId = startId;
  for (let i = 0; i < queue.length; i++) {
    const currentId = queue[i];
    endId = currentId;
    (carbonAdjacency.get(currentId) || []).forEach((nextId) => {
      if (!parents.has(nextId)) {
        parents.set(nextId, currentId);
        queue.push(nextId);
      }
    });
  }
  return { endId, parents };
}

function pathBetween(parents, endId) {
  const chain = [];
  let cursor = endId;
  while (cursor !== null && cursor !== undefined) {
    chain.push(cursor);
    cursor = parents.get(cursor);
  }
  return chain;
}

function longestCarbonChains(carbonAdjacency) {
  const ids = Array.from(carbonAdjacency.keys()).sort((a, b) => a - b);
  if (ids.length === 0) {
    return [];
  }
  if (ids.length === 1) {
    return [[ids[0]]];
  }

  const chains = [];
  let best = 0;
  ids.forEach((startId) => {
    const search = farthestCarbon(carbonAdjacency, startId);
    search.parents.forEach((parent, endId) => {
      if (endId === startId) {
        return;
      }
      const chain = pathBetween(search.parents, endId);
      if (chain.length > best) {
        best = chain.length;
      }
      chains.push(chain);
    });
  });

  if (best === 0) {
    return ids.map((id) => [id]);
  }

  const longest = chains.filter((chain) => chain.length === best);
  const seen = new Set();
  const unique = [];
  longest.forEach((chain) => {
    const key = chain.join(',');
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    unique.push(chain);
  });
  return unique;
}

function collectBranch(graph, adjacency, startId, fromId) {
  const atoms = [];
  let currentId = startId;
  let previousId = fromId;
  for (;;) {
    const atom = graph.getAtom(currentId);
    if (!atom || atom.element !== 'C') {
      return null;
    }
    atoms.push(currentId);
    if (atoms.length > MAX_BRANCH_LENGTH) {
      return null;
    }
    const onward = (adjacency.get(currentId) || []).filter(
      (neighbor) => neighbor.id !== previousId
    );
    if (onward.length === 0) {
      return atoms;
    }
    if (onward.length > 1 || onward[0].order !== 1) {
      return null;
    }
    previousId = currentId;
    currentId = onward[0].id;
  }
}

function resolveAlkylBranch(graph, adjacency, startId, fromId) {
  const branch = collectBranch(graph, adjacency, startId, fromId);
  if (branch) {
    const name = ALKYL_PREFIXES[branch.length];
    if (!name) {
      return null;
    }
    return { name, atoms: branch };
  }
  if (elementOf(graph, startId) !== 'C') {
    return null;
  }
  const onward = (adjacency.get(startId) || []).filter((entry) => entry.id !== fromId);
  if (onward.length !== 2) {
    return null;
  }
  for (const entry of onward) {
    if (entry.order !== 1 || elementOf(graph, entry.id) !== 'C') {
      return null;
    }
    const beyond = (adjacency.get(entry.id) || []).filter((e) => e.id !== startId);
    if (beyond.length !== 0) {
      return null;
    }
  }
  return { name: 'isopropyl', atoms: [startId, onward[0].id, onward[1].id] };
}

function resolveHaloalkylBranch(graph, adjacency, startId, fromId) {
  const chainAtoms = [];
  const allAtoms = [];
  const halogenEntries = [];
  let currentId = startId;
  let previousId = fromId;
  for (;;) {
    const atom = graph.getAtom(currentId);
    if (!atom || atom.element !== 'C') {
      return null;
    }
    chainAtoms.push(currentId);
    allAtoms.push(currentId);
    if (chainAtoms.length > MAX_BRANCH_LENGTH) {
      return null;
    }
    const neighbors = (adjacency.get(currentId) || []).filter((entry) => entry.id !== previousId);
    const continuations = [];
    for (const entry of neighbors) {
      const el = elementOf(graph, entry.id);
      if (
        Object.prototype.hasOwnProperty.call(HALOGEN_PREFIXES, el) &&
        entry.order === 1 &&
        (adjacency.get(entry.id) || []).length === 1
      ) {
        halogenEntries.push({ name: HALOGEN_PREFIXES[el], locant: chainAtoms.length });
        allAtoms.push(entry.id);
      } else {
        continuations.push(entry);
      }
    }
    if (continuations.length === 0) {
      break;
    }
    if (continuations.length > 1 || continuations[0].order !== 1 || elementOf(graph, continuations[0].id) !== 'C') {
      return null;
    }
    previousId = currentId;
    currentId = continuations[0].id;
  }
  if (halogenEntries.length === 0) {
    return null;
  }
  const rootName = ALKYL_PREFIXES[chainAtoms.length];
  if (!rootName) {
    return null;
  }
  const showLocants = chainAtoms.length > 1;
  const prefix = assembleSubstituentPrefix(halogenEntries, showLocants);
  if (prefix === null) {
    return null;
  }
  return { name: '(' + prefix + rootName + ')', atoms: allAtoms };
}

function resolveAlkenylBranch(graph, adjacency, startId, fromId) {
  const atoms = [];
  let currentId = startId;
  let previousId = fromId;
  let unsaturationLocant = null;
  for (;;) {
    const atom = graph.getAtom(currentId);
    if (!atom || atom.element !== 'C') {
      return null;
    }
    atoms.push(currentId);
    if (atoms.length > MAX_BRANCH_LENGTH) {
      return null;
    }
    const onward = (adjacency.get(currentId) || []).filter((entry) => entry.id !== previousId);
    if (onward.length === 0) {
      break;
    }
    if (onward.length > 1 || elementOf(graph, onward[0].id) !== 'C') {
      return null;
    }
    if (onward[0].order === 2) {
      if (unsaturationLocant !== null) {
        return null;
      }
      unsaturationLocant = atoms.length;
    } else if (onward[0].order !== 1) {
      return null;
    }
    previousId = currentId;
    currentId = onward[0].id;
  }
  if (unsaturationLocant === null) {
    return null;
  }
  const root = NAME_ROOTS[atoms.length];
  if (!root) {
    return null;
  }
  const showLocant = atoms.length > 2;
  const name = showLocant ? root + '-' + unsaturationLocant + '-en-1-yl' : root + 'enyl';
  return { name, atoms };
}

function resolveAlkynylBranch(graph, adjacency, startId, fromId) {
  const atoms = [];
  let currentId = startId;
  let previousId = fromId;
  let unsaturationLocant = null;
  for (;;) {
    const atom = graph.getAtom(currentId);
    if (!atom || atom.element !== 'C') {
      return null;
    }
    atoms.push(currentId);
    if (atoms.length > MAX_BRANCH_LENGTH) {
      return null;
    }
    const onward = (adjacency.get(currentId) || []).filter((entry) => entry.id !== previousId);
    if (onward.length === 0) {
      break;
    }
    if (onward.length > 1 || elementOf(graph, onward[0].id) !== 'C') {
      return null;
    }
    if (onward[0].order === 3) {
      if (unsaturationLocant !== null) {
        return null;
      }
      unsaturationLocant = atoms.length;
    } else if (onward[0].order !== 1) {
      return null;
    }
    previousId = currentId;
    currentId = onward[0].id;
  }
  if (unsaturationLocant === null) {
    return null;
  }
  const root = NAME_ROOTS[atoms.length];
  if (!root) {
    return null;
  }
  const showLocant = atoms.length > 2;
  const name = showLocant ? root + '-' + unsaturationLocant + '-yn-1-yl' : root + 'ynyl';
  return { name, atoms };
}

function resolveAllylBranch(graph, adjacency, startId, fromId) {
  if (elementOf(graph, startId) !== 'C') {
    return null;
  }
  const onward = (adjacency.get(startId) || []).filter((entry) => entry.id !== fromId);
  if (onward.length !== 1 || onward[0].order !== 1) {
    return null;
  }
  const midId = onward[0].id;
  if (elementOf(graph, midId) !== 'C') {
    return null;
  }
  const midOnward = (adjacency.get(midId) || []).filter((entry) => entry.id !== startId);
  if (midOnward.length !== 1 || midOnward[0].order !== 2) {
    return null;
  }
  const endId = midOnward[0].id;
  if (elementOf(graph, endId) !== 'C') {
    return null;
  }
  const endOnward = (adjacency.get(endId) || []).filter((entry) => entry.id !== midId);
  if (endOnward.length !== 0) {
    return null;
  }
  return { name: 'allyl', atoms: [startId, midId, endId] };
}

function resolveCyclopropylBranch(graph, adjacency, startId, fromId) {
  if (elementOf(graph, startId) !== 'C') {
    return null;
  }
  const onward = (adjacency.get(startId) || []).filter((entry) => entry.id !== fromId);
  if (onward.length !== 2 || onward.some((entry) => entry.order !== 1 || elementOf(graph, entry.id) !== 'C')) {
    return null;
  }
  const [a, b] = onward.map((entry) => entry.id);
  const aOnward = (adjacency.get(a) || []).filter((entry) => entry.id !== startId);
  const bOnward = (adjacency.get(b) || []).filter((entry) => entry.id !== startId);
  if (aOnward.length !== 1 || bOnward.length !== 1 || aOnward[0].id !== b || aOnward[0].order !== 1) {
    return null;
  }
  return { name: 'cyclopropyl', atoms: [startId, a, b] };
}

const ACYL_PREFIXES = ['', 'formyl', 'acetyl', 'propionyl', 'butyryl', 'valeryl'];

function resolveAcylBranch(graph, adjacency, startId, fromId) {
  if (elementOf(graph, startId) !== 'C') {
    return null;
  }
  const neighbors = (adjacency.get(startId) || []).filter((entry) => entry.id !== fromId);
  const oxygenEntry = neighbors.find(
    (entry) => entry.order === 2 && elementOf(graph, entry.id) === 'O'
  );
  if (!oxygenEntry) {
    return null;
  }
  if ((adjacency.get(oxygenEntry.id) || []).length !== 1) {
    return null;
  }
  const rest = neighbors.filter((entry) => entry.id !== oxygenEntry.id);
  if (rest.length === 0) {
    return { name: ACYL_PREFIXES[1], atoms: [startId, oxygenEntry.id] };
  }
  if (rest.length !== 1 || rest[0].order !== 1) {
    return null;
  }
  const restElement = elementOf(graph, rest[0].id);
  if (
    Object.prototype.hasOwnProperty.call(HALOGEN_PREFIXES, restElement) &&
    (adjacency.get(rest[0].id) || []).length === 1
  ) {
    return {
      name: HALOGEN_PREFIXES[restElement] + 'carbonyl',
      atoms: [startId, oxygenEntry.id, rest[0].id],
    };
  }
  const branch = collectBranch(graph, adjacency, rest[0].id, startId);
  if (!branch) {
    return null;
  }
  const name = ACYL_PREFIXES[branch.length + 1];
  if (!name) {
    return null;
  }
  return { name, atoms: [startId, oxygenEntry.id].concat(branch) };
}

function resolveCyanoBranch(graph, adjacency, startId, fromId) {
  if (elementOf(graph, startId) !== 'C') {
    return null;
  }
  const neighbors = (adjacency.get(startId) || []).filter((entry) => entry.id !== fromId);
  if (neighbors.length !== 1) {
    return null;
  }
  const nitrogenEntry = neighbors[0];
  if (nitrogenEntry.order !== 3 || elementOf(graph, nitrogenEntry.id) !== 'N') {
    return null;
  }
  if ((adjacency.get(nitrogenEntry.id) || []).length !== 1) {
    return null;
  }
  return { name: 'cyano', atoms: [startId, nitrogenEntry.id] };
}

function resolveCarboxylBranch(graph, adjacency, startId, fromId) {
  if (elementOf(graph, startId) !== 'C') {
    return null;
  }
  const neighbors = (adjacency.get(startId) || []).filter((entry) => entry.id !== fromId);
  if (neighbors.length !== 2) {
    return null;
  }
  const doubleO = neighbors.find(
    (entry) => entry.order === 2 && elementOf(graph, entry.id) === 'O'
  );
  const singleO = neighbors.find(
    (entry) => entry.order === 1 && elementOf(graph, entry.id) === 'O'
  );
  if (!doubleO || !singleO || doubleO === singleO) {
    return null;
  }
  if ((adjacency.get(doubleO.id) || []).length !== 1 || (adjacency.get(singleO.id) || []).length !== 1) {
    return null;
  }
  return { name: 'carboxy', atoms: [startId, doubleO.id, singleO.id] };
}

function resolveEsterBranch(graph, adjacency, startId, fromId) {
  if (elementOf(graph, startId) !== 'C') {
    return null;
  }
  const neighbors = (adjacency.get(startId) || []).filter((entry) => entry.id !== fromId);
  if (neighbors.length !== 2) {
    return null;
  }
  const doubleO = neighbors.find(
    (entry) => entry.order === 2 && elementOf(graph, entry.id) === 'O'
  );
  const singleO = neighbors.find(
    (entry) => entry.order === 1 && elementOf(graph, entry.id) === 'O'
  );
  if (!doubleO || !singleO || doubleO === singleO) {
    return null;
  }
  if ((adjacency.get(doubleO.id) || []).length !== 1) {
    return null;
  }
  const oNeighbors = adjacency.get(singleO.id) || [];
  if (oNeighbors.length !== 2) {
    return null;
  }
  const onward = oNeighbors.filter((entry) => entry.id !== startId);
  if (onward.length !== 1 || onward[0].order !== 1) {
    return null;
  }
  const branch = collectBranch(graph, adjacency, onward[0].id, singleO.id);
  if (!branch) {
    return null;
  }
  const root = NAME_ROOTS[branch.length];
  if (!root) {
    return null;
  }
  return {
    name: root + 'oxycarbonyl',
    atoms: [startId, doubleO.id, singleO.id].concat(branch),
  };
}

function resolveAzetidideRing(graph, adjacency, amideNitrogenId, branchAId, branchBId) {
  if (elementOf(graph, branchAId) !== 'C' || elementOf(graph, branchBId) !== 'C') {
    return null;
  }
  const aNeighbors = (adjacency.get(branchAId) || []).filter((e) => e.id !== amideNitrogenId);
  const bNeighbors = (adjacency.get(branchBId) || []).filter((e) => e.id !== amideNitrogenId);
  const bIds = new Set(bNeighbors.map((e) => e.id));
  const midEntry = aNeighbors.find((e) => bIds.has(e.id));
  const bMidEntry = midEntry && bNeighbors.find((e) => e.id === midEntry.id);
  if (!midEntry || !bMidEntry || midEntry.order !== 1 || bMidEntry.order !== 1) {
    return null;
  }
  const midId = midEntry.id;
  if (elementOf(graph, midId) !== 'C') {
    return null;
  }
  const midOther = (adjacency.get(midId) || []).filter(
    (e) => e.id !== branchAId && e.id !== branchBId
  );
  if (midOther.length !== 0) {
    return null;
  }
  const aExtra = aNeighbors.filter((e) => e.id !== midId);
  const bExtra = bNeighbors.filter((e) => e.id !== midId);
  if (aExtra.length === 0 && bExtra.length === 0) {
    return { name: 'azetidide', atoms: [branchAId, midId, branchBId] };
  }
  if (aExtra.length !== 1 || bExtra.length !== 1) {
    return null;
  }
  if (aExtra[0].order !== 1 || bExtra[0].order !== 1) {
    return null;
  }
  if (elementOf(graph, aExtra[0].id) !== 'C' || elementOf(graph, bExtra[0].id) !== 'C') {
    return null;
  }
  const aExtraFurther = (adjacency.get(aExtra[0].id) || []).filter((e) => e.id !== branchAId);
  const bExtraFurther = (adjacency.get(bExtra[0].id) || []).filter((e) => e.id !== branchBId);
  if (aExtraFurther.length !== 0 || bExtraFurther.length !== 0) {
    return null;
  }
  return {
    name: '2,4-dimethylazetidide',
    atoms: [branchAId, midId, branchBId, aExtra[0].id, bExtra[0].id],
  };
}

function findAzetidideRingAtoms(graph, atomIds, bonds) {
  const adjacency = buildAdjacency(atomIds, bonds);
  const excluded = new Set();
  for (const atomId of atomIds) {
    if (elementOf(graph, atomId) !== 'N') {
      continue;
    }
    const allNeighbors = adjacency.get(atomId) || [];
    if (allNeighbors.length <= 2) {
      continue;
    }
    const neighbors = allNeighbors.filter((entry) => entry.order === 1);
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const ring = resolveAzetidideRing(graph, adjacency, atomId, neighbors[i].id, neighbors[j].id);
        if (ring) {
          ring.atoms.forEach((id) => excluded.add(id));
        }
      }
    }
  }
  return excluded;
}

function collectComponentExcluding(adjacency, startId, excludeId) {
  const visited = new Set([excludeId, startId]);
  const queue = [startId];
  while (queue.length > 0) {
    const current = queue.shift();
    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.id)) {
        visited.add(neighbor.id);
        queue.push(neighbor.id);
      }
    }
  }
  visited.delete(excludeId);
  return Array.from(visited);
}

function resolveBenzylBranch(graph, adjacency, startId, fromId) {
  if (elementOf(graph, startId) !== 'C') {
    return null;
  }
  const onward = (adjacency.get(startId) || []).filter((entry) => entry.id !== fromId);
  if (onward.length !== 1 || onward[0].order !== 1) {
    return null;
  }
  const ipso = onward[0].id;
  if (elementOf(graph, ipso) !== 'C') {
    return null;
  }
  const componentAtoms = collectComponentExcluding(adjacency, ipso, startId);
  const componentSet = new Set(componentAtoms);
  const componentBonds = graph.bonds.filter(
    (bond) => componentSet.has(bond.atomA) && componentSet.has(bond.atomB)
  );
  const trimmed = trimToRing(componentAtoms, componentBonds);
  if (trimmed.remaining.size !== 6 || !trimmed.remaining.has(ipso)) {
    return null;
  }
  for (const id of trimmed.remaining) {
    if (elementOf(graph, id) !== 'C') {
      return null;
    }
  }
  const ring = orderRing(trimmed.remaining, trimmed.active);
  if (!ring) {
    return null;
  }
  const ringOrders = cycleBondOrders(graph, ring);
  if (!ringOrders || !hasAlternatingOrders(ringOrders)) {
    return null;
  }
  const ipsoIndex = ring.indexOf(ipso);
  const forward = ring.slice(ipsoIndex).concat(ring.slice(0, ipsoIndex));
  const backward = [forward[0]].concat(forward.slice(1).reverse());
  const ringAdjacency = buildAdjacency(componentAtoms, componentBonds);
  const ringSet = trimmed.remaining;

  let best = null;
  for (const ordering of [forward, backward]) {
    const visited = new Set(ordering);
    const acc = createAttachmentAccumulator();
    let ok = true;
    for (let i = 0; i < ordering.length; i++) {
      if (
        !collectCoreAttachments(graph, ringAdjacency, ordering[i], i, ringSet, acc, visited, true)
      ) {
        ok = false;
        break;
      }
    }
    if (!ok || visited.size !== componentSet.size) {
      continue;
    }
    if (
      acc.hydroxyls.length > 0 ||
      acc.carbonyls.length > 0 ||
      acc.amines.length > 0 ||
      acc.thiols.length > 0 ||
      acc.nitriles.length > 0
    ) {
      continue;
    }
    const prefixEntries = acc.substituents.map((entry) => ({
      name: entry.name,
      locant: entry.index + 1,
    }));
    const showLocants = prefixEntries.length > 0;
    const prefix = assembleSubstituentPrefix(prefixEntries, showLocants);
    if (prefix === null) {
      continue;
    }
    const key = prefixEntries.map((entry) => entry.locant).sort((a, b) => a - b);
    if (!best || compareLocantLists(key, best.key) < 0) {
      best = { key, prefix };
    }
  }
  if (!best) {
    return null;
  }
  const name = best.prefix ? '(' + best.prefix + 'benzyl)' : 'benzyl';
  return { name, atoms: [startId].concat(componentAtoms) };
}

function resolvePhenylBranch(graph, adjacency, ipso, fromId) {
  if (elementOf(graph, ipso) !== 'C') {
    return null;
  }
  const componentAtoms = collectComponentExcluding(adjacency, ipso, fromId);
  const componentSet = new Set(componentAtoms);
  const componentBonds = graph.bonds.filter(
    (bond) => componentSet.has(bond.atomA) && componentSet.has(bond.atomB)
  );
  const trimmed = trimToRing(componentAtoms, componentBonds);
  if (trimmed.remaining.size !== 6 || !trimmed.remaining.has(ipso)) {
    return null;
  }
  for (const id of trimmed.remaining) {
    if (elementOf(graph, id) !== 'C') {
      return null;
    }
  }
  const ring = orderRing(trimmed.remaining, trimmed.active);
  if (!ring) {
    return null;
  }
  const ringOrders = cycleBondOrders(graph, ring);
  if (!ringOrders || !hasAlternatingOrders(ringOrders)) {
    return null;
  }
  const ipsoIndex = ring.indexOf(ipso);
  const forward = ring.slice(ipsoIndex).concat(ring.slice(0, ipsoIndex));
  const backward = [forward[0]].concat(forward.slice(1).reverse());
  const ringAdjacency = buildAdjacency(componentAtoms, componentBonds);
  const ringSet = trimmed.remaining;

  let best = null;
  for (const ordering of [forward, backward]) {
    const visited = new Set(ordering);
    const acc = createAttachmentAccumulator();
    let ok = true;
    for (let i = 0; i < ordering.length; i++) {
      if (
        !collectCoreAttachments(graph, ringAdjacency, ordering[i], i, ringSet, acc, visited, true)
      ) {
        ok = false;
        break;
      }
    }
    if (!ok || visited.size !== componentSet.size) {
      continue;
    }
    if (
      acc.hydroxyls.length > 0 ||
      acc.carbonyls.length > 0 ||
      acc.amines.length > 0 ||
      acc.thiols.length > 0 ||
      acc.nitriles.length > 0
    ) {
      continue;
    }
    const prefixEntries = acc.substituents.map((entry) => ({
      name: entry.name,
      locant: entry.index + 1,
    }));
    const showLocants = prefixEntries.length > 0;
    const prefix = assembleSubstituentPrefix(prefixEntries, showLocants);
    if (prefix === null) {
      continue;
    }
    const key = prefixEntries.map((entry) => entry.locant).sort((a, b) => a - b);
    if (!best || compareLocantLists(key, best.key) < 0) {
      best = { key, prefix };
    }
  }
  if (!best) {
    return null;
  }
  const name = best.prefix ? '(' + best.prefix + 'phenyl)' : 'phenyl';
  return { name, atoms: [ipso].concat(componentAtoms) };
}

function resolveAminoSubstituent(graph, adjacency, startId, fromId) {
  return (
    resolveAlkylBranch(graph, adjacency, startId, fromId) ||
    resolveAllylBranch(graph, adjacency, startId, fromId) ||
    resolveCyclopropylBranch(graph, adjacency, startId, fromId) ||
    resolveBenzylBranch(graph, adjacency, startId, fromId)
  );
}

function resolveDirectAminoSubstituent(graph, adjacency, nitrogenId, fromId) {
  if (elementOf(graph, nitrogenId) !== 'N') {
    return null;
  }
  const extras = (adjacency.get(nitrogenId) || []).filter((entry) => entry.id !== fromId);
  if (extras.length > 2) {
    return null;
  }
  const atoms = [nitrogenId];
  const names = [];
  for (const extra of extras) {
    if (extra.order !== 1) {
      return null;
    }
    const resolved = resolveAlkylBranch(graph, adjacency, extra.id, nitrogenId);
    if (!resolved) {
      return null;
    }
    names.push(resolved.name);
    resolved.atoms.forEach((id) => atoms.push(id));
  }
  const prefix = buildNitrogenPrefix(names);
  if (prefix === null) {
    return null;
  }
  const name = prefix ? '(' + prefix + 'amino)' : 'amino';
  return { name, atoms };
}

function resolveCarboxamideBranch(graph, adjacency, startId, fromId) {
  if (elementOf(graph, startId) !== 'C') {
    return null;
  }
  const neighbors = (adjacency.get(startId) || []).filter((entry) => entry.id !== fromId);
  if (neighbors.length !== 2) {
    return null;
  }
  const oxygens = neighbors.filter(
    (entry) => entry.order === 2 && elementOf(graph, entry.id) === 'O'
  );
  const sulfurs = neighbors.filter(
    (entry) => entry.order === 2 && elementOf(graph, entry.id) === 'S'
  );
  const nitrogens = neighbors.filter(
    (entry) => entry.order === 1 && elementOf(graph, entry.id) === 'N'
  );
  if (oxygens.length + sulfurs.length !== 1 || nitrogens.length !== 1) {
    return null;
  }
  const isThio = sulfurs.length === 1;
  const oxygen = isThio ? sulfurs[0].id : oxygens[0].id;
  if ((adjacency.get(oxygen) || []).length !== 1) {
    return null;
  }
  const nitrogen = nitrogens[0].id;
  const nitrogenExtras = (adjacency.get(nitrogen) || []).filter((entry) => entry.id !== startId);
  if (nitrogenExtras.length > 2) {
    return null;
  }
  const atoms = [startId, oxygen, nitrogen];
  const names = [];
  for (const extra of nitrogenExtras) {
    if (extra.order !== 1) {
      return null;
    }
    const resolved = resolveAlkylBranch(graph, adjacency, extra.id, nitrogen);
    if (!resolved) {
      return null;
    }
    names.push(resolved.name);
    resolved.atoms.forEach((id) => atoms.push(id));
  }
  const nitrogenPrefix = buildNitrogenPrefix(names);
  if (nitrogenPrefix === null) {
    return null;
  }
  const stem = isThio ? 'carbamothioyl' : 'carbamoyl';
  const name = nitrogenPrefix ? '(' + nitrogenPrefix + stem + ')' : stem;
  return { name, atoms };
}

function resolveAminoAlcoholSubstituent(graph, adjacency, startId, fromId) {
  if (elementOf(graph, startId) !== 'C') {
    return null;
  }
  const neighbors = (adjacency.get(startId) || []).filter((entry) => entry.id !== fromId);
  if (neighbors.length !== 2 && neighbors.length !== 3) {
    return null;
  }
  if (neighbors.some((entry) => entry.order !== 1)) {
    return null;
  }
  let ch2ohEntry = null;
  const otherBranches = [];
  for (const entry of neighbors) {
    if (elementOf(graph, entry.id) !== 'C') {
      return null;
    }
    const subNeighbors = (adjacency.get(entry.id) || []).filter((sub) => sub.id !== startId);
    if (
      subNeighbors.length === 1 &&
      subNeighbors[0].order === 1 &&
      elementOf(graph, subNeighbors[0].id) === 'O' &&
      (adjacency.get(subNeighbors[0].id) || []).length === 1
    ) {
      if (ch2ohEntry) {
        return null;
      }
      ch2ohEntry = { carbon: entry.id, oxygen: subNeighbors[0].id };
    } else {
      const branch = collectBranch(graph, adjacency, entry.id, startId);
      if (!branch) {
        return null;
      }
      otherBranches.push({ entryId: entry.id, atoms: branch });
    }
  }
  if (!ch2ohEntry || otherBranches.length !== neighbors.length - 1) {
    return null;
  }
  otherBranches.sort((a, b) => b.atoms.length - a.atoms.length);
  const mainBranch = otherBranches[0];
  const extraBranches = otherBranches.slice(1);
  if (extraBranches.some((branch) => branch.atoms.length !== 1)) {
    return null;
  }
  const totalLength = 2 + mainBranch.atoms.length;
  const root = NAME_ROOTS[totalLength];
  if (!root) {
    return null;
  }
  const atoms = [startId, ch2ohEntry.carbon, ch2ohEntry.oxygen]
    .concat(mainBranch.atoms)
    .concat(extraBranches.map((branch) => branch.atoms[0]));
  const extraPrefix =
    extraBranches.length === 1
      ? '2-methyl'
      : extraBranches.length > 1
      ? null
      : '';
  if (extraPrefix === null) {
    return null;
  }
  const name = '1-hydroxy' + (extraPrefix ? '-' + extraPrefix : '') + root + 'an-2-yl';
  return { name, atoms };
}

const SATURATED_AZACYCLE_NAMES = { 5: 'pyrrolidin-1-yl', 6: 'piperidin-1-yl' };

function resolveSaturatedAzacycleAt(graph, adjacency, nitrogenId, fromId) {
  const ringNeighbors = (adjacency.get(nitrogenId) || []).filter((entry) => entry.id !== fromId);
  if (ringNeighbors.length !== 2) {
    return null;
  }
  if (ringNeighbors[0].order !== 1 || ringNeighbors[1].order !== 1) {
    return null;
  }
  const e1 = ringNeighbors[0].id;
  const e2 = ringNeighbors[1].id;
  if (elementOf(graph, e1) !== 'C' || elementOf(graph, e2) !== 'C') {
    return null;
  }
  const componentAtoms = collectComponentExcluding(adjacency, e1, nitrogenId);
  if (componentAtoms.indexOf(e2) === -1) {
    return null;
  }
  for (const id of componentAtoms) {
    if (elementOf(graph, id) !== 'C') {
      return null;
    }
  }
  const ringAtoms = [nitrogenId].concat(componentAtoms);
  const name = SATURATED_AZACYCLE_NAMES[ringAtoms.length];
  if (!name) {
    return null;
  }
  const ringSet = new Set(ringAtoms);
  const ringBonds = graph.bonds.filter(
    (bond) => ringSet.has(bond.atomA) && ringSet.has(bond.atomB)
  );
  const ring = orderRing(ringSet, ringBonds);
  if (!ring) {
    return null;
  }
  const orders = cycleBondOrders(graph, ring);
  if (!orders || orders.some((order) => order !== 1)) {
    return null;
  }
  return { name, atoms: ringAtoms };
}

function walkToSulfonylChain(graph, adjacency, startId, fromId, maxChain) {
  let current = startId;
  let prev = fromId;
  const chainAtoms = [];
  for (let i = 0; i < maxChain; i++) {
    if (elementOf(graph, current) !== 'C') {
      return null;
    }
    chainAtoms.push(current);
    const onward = (adjacency.get(current) || []).filter((entry) => entry.id !== prev);
    if (onward.length !== 1 || onward[0].order !== 1) {
      return null;
    }
    const nextId = onward[0].id;
    if (elementOf(graph, nextId) === 'S') {
      return { sulfur: nextId, chainAtoms };
    }
    prev = current;
    current = nextId;
  }
  return null;
}

function resolvePiperidin4ylBranch(graph, adjacency, startId, fromId) {
  if (elementOf(graph, startId) !== 'C') {
    return null;
  }
  const ringNeighbors = (adjacency.get(startId) || []).filter((entry) => entry.id !== fromId);
  if (ringNeighbors.length !== 2) {
    return null;
  }
  if (ringNeighbors[0].order !== 1 || ringNeighbors[1].order !== 1) {
    return null;
  }
  if (elementOf(graph, ringNeighbors[0].id) !== 'C' || elementOf(graph, ringNeighbors[1].id) !== 'C') {
    return null;
  }
  const componentAtoms = collectComponentExcluding(adjacency, ringNeighbors[0].id, startId);
  if (componentAtoms.indexOf(ringNeighbors[1].id) === -1) {
    return null;
  }
  const rawAtoms = [startId].concat(componentAtoms);
  const rawSet = new Set(rawAtoms);
  const rawBonds = graph.bonds.filter(
    (bond) => rawSet.has(bond.atomA) && rawSet.has(bond.atomB)
  );
  const trimmed = trimToRing(rawAtoms, rawBonds);
  if (trimmed.remaining.size !== 6 || !trimmed.remaining.has(startId)) {
    return null;
  }
  const ringAtoms = Array.from(trimmed.remaining);
  const ring = orderRing(trimmed.remaining, trimmed.active);
  if (!ring) {
    return null;
  }
  const orders = cycleBondOrders(graph, ring);
  if (!orders || orders.some((order) => order !== 1)) {
    return null;
  }
  const startIndex = ring.indexOf(startId);
  const nitrogenId = ring[(startIndex + 3) % 6];
  if (elementOf(graph, nitrogenId) !== 'N') {
    return null;
  }
  for (const id of ring) {
    if (id !== nitrogenId && elementOf(graph, id) !== 'C') {
      return null;
    }
  }
  const nitrogenExtras = (adjacency.get(nitrogenId) || []).filter(
    (entry) => ring.indexOf(entry.id) === -1
  );
  if (nitrogenExtras.length > 1) {
    return null;
  }
  const atoms = ringAtoms.slice();
  let prefix = '';
  if (nitrogenExtras.length === 1) {
    if (nitrogenExtras[0].order !== 1) {
      return null;
    }
    const resolved = resolveAlkylBranch(graph, adjacency, nitrogenExtras[0].id, nitrogenId);
    if (!resolved) {
      return null;
    }
    prefix = '1-' + resolved.name;
    resolved.atoms.forEach((id) => atoms.push(id));
  }
  const name = prefix ? '(' + prefix + 'piperidin-4-yl)' : 'piperidin-4-yl';
  return { name, atoms };
}

function resolveSulfamoylMethylBranch(graph, adjacency, startId, fromId) {
  const chain = walkToSulfonylChain(graph, adjacency, startId, fromId, 2);
  if (!chain) {
    return null;
  }
  const { sulfur, chainAtoms } = chain;
  const chainSuffix = ALKYL_PREFIXES[chainAtoms.length];
  const lastChainAtom = chainAtoms[chainAtoms.length - 1];
  const sulfurNeighbors = (adjacency.get(sulfur) || []).filter((entry) => entry.id !== lastChainAtom);
  if (sulfurNeighbors.length !== 3) {
    return null;
  }
  const oxygens = sulfurNeighbors.filter(
    (entry) => entry.order === 2 && elementOf(graph, entry.id) === 'O'
  );
  if (oxygens.length !== 2) {
    return null;
  }
  for (const oxygen of oxygens) {
    if ((adjacency.get(oxygen.id) || []).length !== 1) {
      return null;
    }
  }
  const others = sulfurNeighbors.filter((entry) => entry.order === 1 && !oxygens.includes(entry));
  if (others.length !== 1) {
    return null;
  }
  const other = others[0];
  if (elementOf(graph, other.id) === 'C') {
    const aryl = resolvePhenylBranch(graph, adjacency, other.id, sulfur);
    if (!aryl) {
      return null;
    }
    const atoms = chainAtoms.concat([sulfur], oxygens.map((entry) => entry.id), aryl.atoms);
    return { name: '(' + aryl.name + 'sulfonyl)' + chainSuffix, atoms };
  }
  if (elementOf(graph, other.id) !== 'N') {
    return null;
  }
  const nitrogen = other.id;
  const baseAtoms = chainAtoms.concat([sulfur, nitrogen], oxygens.map((entry) => entry.id));
  const azacycle = resolveSaturatedAzacycleAt(graph, adjacency, nitrogen, sulfur);
  if (azacycle) {
    const atoms = baseAtoms.concat(azacycle.atoms.filter((id) => id !== nitrogen));
    return { name: '(' + azacycle.name + 'sulfonyl)' + chainSuffix, atoms };
  }
  const nitrogenExtras = (adjacency.get(nitrogen) || []).filter((entry) => entry.id !== sulfur);
  if (nitrogenExtras.length > 2) {
    return null;
  }
  const atoms = baseAtoms.slice();
  const names = [];
  for (const extra of nitrogenExtras) {
    if (extra.order !== 1) {
      return null;
    }
    const resolved = resolveAlkylBranch(graph, adjacency, extra.id, nitrogen);
    if (!resolved) {
      return null;
    }
    names.push(resolved.name);
    resolved.atoms.forEach((id) => atoms.push(id));
  }
  const nitrogenPrefix = buildNitrogenPrefix(names);
  if (nitrogenPrefix === null) {
    return null;
  }
  const name = nitrogenPrefix
    ? '(' + nitrogenPrefix + 'sulfamoyl)' + chainSuffix
    : 'sulfamoyl' + chainSuffix;
  return { name, atoms };
}

function resolveTriazolylMethylBranch(graph, adjacency, startId, fromId) {
  if (elementOf(graph, startId) !== 'C') {
    return null;
  }
  const onward = (adjacency.get(startId) || []).filter((entry) => entry.id !== fromId);
  if (onward.length !== 1 || onward[0].order !== 1) {
    return null;
  }
  const n1 = onward[0].id;
  if (elementOf(graph, n1) !== 'N') {
    return null;
  }
  const componentAtoms = collectComponentExcluding(adjacency, n1, startId);
  if (componentAtoms.length !== 5) {
    return null;
  }
  const componentSet = new Set(componentAtoms);
  const componentBonds = graph.bonds.filter(
    (bond) => componentSet.has(bond.atomA) && componentSet.has(bond.atomB)
  );
  const ring = orderRing(componentSet, componentBonds);
  if (!ring) {
    return null;
  }
  let nCount = 0;
  let cCount = 0;
  for (const id of ring) {
    const el = elementOf(graph, id);
    if (el === 'N') {
      nCount++;
    } else if (el === 'C') {
      cCount++;
    } else {
      return null;
    }
  }
  if (nCount !== 3 || cCount !== 2) {
    return null;
  }
  const orders = cycleBondOrders(graph, ring);
  if (!orders) {
    return null;
  }
  const n1Index = ring.indexOf(n1);
  if (!hasFuranPattern(orders, n1Index)) {
    return null;
  }
  return { name: '(1,2,4-triazol-1-yl)methyl', atoms: [startId].concat(componentAtoms) };
}

const SATURATED_AZACYCLE_YL_NAMES = { 5: 'pyrrolidin-2-yl', 6: 'piperidin-2-yl' };

function resolveAzacyclylMethylBranch(graph, adjacency, startId, fromId) {
  if (elementOf(graph, startId) !== 'C') {
    return null;
  }
  const onward = (adjacency.get(startId) || []).filter((entry) => entry.id !== fromId);
  if (onward.length !== 1 || onward[0].order !== 1) {
    return null;
  }
  const ringAttach = onward[0].id;
  if (elementOf(graph, ringAttach) !== 'C') {
    return null;
  }
  const ringNeighbors = (adjacency.get(ringAttach) || []).filter((entry) => entry.id !== startId);
  if (ringNeighbors.length !== 2 || ringNeighbors[0].order !== 1 || ringNeighbors[1].order !== 1) {
    return null;
  }
  const nEntries = ringNeighbors.filter((entry) => elementOf(graph, entry.id) === 'N');
  const cEntries = ringNeighbors.filter((entry) => elementOf(graph, entry.id) === 'C');
  if (nEntries.length !== 1 || cEntries.length !== 1) {
    return null;
  }
  const nitrogenId = nEntries[0].id;
  const cNeighborId = cEntries[0].id;
  const rawAtoms = [ringAttach].concat(collectComponentExcluding(adjacency, cNeighborId, ringAttach));
  if (rawAtoms.indexOf(nitrogenId) === -1) {
    return null;
  }
  const rawSet = new Set(rawAtoms);
  const rawBonds = graph.bonds.filter(
    (bond) => rawSet.has(bond.atomA) && rawSet.has(bond.atomB)
  );
  const trimmed = trimToRing(rawAtoms, rawBonds);
  if (!trimmed.remaining.has(ringAttach) || !trimmed.remaining.has(nitrogenId)) {
    return null;
  }
  const ringName = SATURATED_AZACYCLE_YL_NAMES[trimmed.remaining.size];
  if (!ringName) {
    return null;
  }
  for (const id of trimmed.remaining) {
    if (id !== nitrogenId && elementOf(graph, id) !== 'C') {
      return null;
    }
  }
  const ring = orderRing(trimmed.remaining, trimmed.active);
  if (!ring) {
    return null;
  }
  const orders = cycleBondOrders(graph, ring);
  if (!orders || orders.some((order) => order !== 1)) {
    return null;
  }
  const ringAtoms = Array.from(trimmed.remaining);
  const nitrogenExtras = (adjacency.get(nitrogenId) || []).filter(
    (entry) => ringAtoms.indexOf(entry.id) === -1
  );
  if (nitrogenExtras.length > 1) {
    return null;
  }
  const atoms = [startId].concat(ringAtoms);
  let prefix = '';
  if (nitrogenExtras.length === 1) {
    if (nitrogenExtras[0].order !== 1) {
      return null;
    }
    const resolved = resolveAlkylBranch(graph, adjacency, nitrogenExtras[0].id, nitrogenId);
    if (!resolved) {
      return null;
    }
    prefix = '1-' + resolved.name;
    resolved.atoms.forEach((id) => atoms.push(id));
  }
  const name = (prefix ? '(' + prefix + ringName + ')' : ringName) + 'methyl';
  return { name, atoms };
}

function resolveOxazolidinonylMethylBranch(graph, adjacency, startId, fromId) {
  if (elementOf(graph, startId) !== 'C') {
    return null;
  }
  const onward = (adjacency.get(startId) || []).filter((entry) => entry.id !== fromId);
  if (onward.length !== 1 || onward[0].order !== 1) {
    return null;
  }
  const c4 = onward[0].id;
  if (elementOf(graph, c4) !== 'C') {
    return null;
  }
  const c4Neighbors = (adjacency.get(c4) || []).filter((entry) => entry.id !== startId);
  if (c4Neighbors.length !== 2 || c4Neighbors[0].order !== 1 || c4Neighbors[1].order !== 1) {
    return null;
  }
  const nEntries = c4Neighbors.filter((entry) => elementOf(graph, entry.id) === 'N');
  const cEntries = c4Neighbors.filter((entry) => elementOf(graph, entry.id) === 'C');
  if (nEntries.length !== 1 || cEntries.length !== 1) {
    return null;
  }
  const n3 = nEntries[0].id;
  const c5 = cEntries[0].id;

  const c5Neighbors = (adjacency.get(c5) || []).filter((entry) => entry.id !== c4);
  if (c5Neighbors.length !== 1 || c5Neighbors[0].order !== 1) {
    return null;
  }
  const o1 = c5Neighbors[0].id;
  if (elementOf(graph, o1) !== 'O') {
    return null;
  }

  const o1Neighbors = (adjacency.get(o1) || []).filter((entry) => entry.id !== c5);
  if (o1Neighbors.length !== 1 || o1Neighbors[0].order !== 1) {
    return null;
  }
  const c2 = o1Neighbors[0].id;
  if (elementOf(graph, c2) !== 'C') {
    return null;
  }

  const c2Neighbors = (adjacency.get(c2) || []).filter((entry) => entry.id !== o1);
  if (c2Neighbors.length !== 2) {
    return null;
  }
  const carbonylEntry = c2Neighbors.find(
    (entry) => entry.order === 2 && elementOf(graph, entry.id) === 'O'
  );
  const ringCloseEntry = c2Neighbors.find((entry) => entry.id === n3 && entry.order === 1);
  if (!carbonylEntry || !ringCloseEntry) {
    return null;
  }
  if ((adjacency.get(carbonylEntry.id) || []).length !== 1) {
    return null;
  }

  const n3Extras = (adjacency.get(n3) || []).filter(
    (entry) => entry.id !== c4 && entry.id !== c2
  );
  if (n3Extras.length > 1) {
    return null;
  }
  const atoms = [startId, c4, n3, c2, carbonylEntry.id, o1, c5];
  let prefix = '';
  if (n3Extras.length === 1) {
    if (n3Extras[0].order !== 1) {
      return null;
    }
    const resolved = resolveAlkylBranch(graph, adjacency, n3Extras[0].id, n3);
    if (!resolved) {
      return null;
    }
    prefix = '3-' + resolved.name + '-';
    resolved.atoms.forEach((id) => atoms.push(id));
  }
  const name = '(' + prefix + '2-oxo-1,3-oxazolidin-4-yl)methyl';
  return { name, atoms };
}

function resolveRingAlkylSubstituent(graph, adjacency, startId, fromId) {
  return (
    resolveAlkylBranch(graph, adjacency, startId, fromId) ||
    resolveHaloalkylBranch(graph, adjacency, startId, fromId) ||
    resolveAllylBranch(graph, adjacency, startId, fromId) ||
    resolveAlkenylBranch(graph, adjacency, startId, fromId) ||
    resolveAlkynylBranch(graph, adjacency, startId, fromId) ||
    resolveAcylBranch(graph, adjacency, startId, fromId) ||
    resolveCyanoBranch(graph, adjacency, startId, fromId) ||
    resolveCarboxylBranch(graph, adjacency, startId, fromId) ||
    resolveEsterBranch(graph, adjacency, startId, fromId) ||
    resolveSulfamoylMethylBranch(graph, adjacency, startId, fromId) ||
    resolveTriazolylMethylBranch(graph, adjacency, startId, fromId) ||
    resolveAzacyclylMethylBranch(graph, adjacency, startId, fromId) ||
    resolveOxazolidinonylMethylBranch(graph, adjacency, startId, fromId) ||
    resolvePiperidin4ylBranch(graph, adjacency, startId, fromId) ||
    resolveCarboxamideBranch(graph, adjacency, startId, fromId) ||
    resolveBenzylBranch(graph, adjacency, startId, fromId) ||
    resolvePhenylBranch(graph, adjacency, startId, fromId) ||
    resolveGenericSubstituent(graph, adjacency, startId, fromId)
  );
}

const RETAINED_SUBSTITUENT_NAMES = {
  '2-methylpropyl': 'isobutyl',
  '1-methylpropyl': 'sec-butyl',
  '1,1-dimethylethyl': 'tert-butyl',
  '2,2-dimethylpropyl': 'neopentyl',
  '3-methylbutyl': 'isopentyl',
  '1-methylethenyl': 'prop-1-en-2-yl',
};

function isFunctionalCarbonBranch(graph, adjacency, startId, fromId) {
  return Boolean(
    resolveCarboxylBranch(graph, adjacency, startId, fromId) ||
      resolveCyanoBranch(graph, adjacency, startId, fromId) ||
      resolveEsterBranch(graph, adjacency, startId, fromId) ||
      resolveCarboxamideBranch(graph, adjacency, startId, fromId) ||
      resolveAcylBranch(graph, adjacency, startId, fromId)
  );
}

function collectGenericSubtree(adjacency, startId, fromId) {
  const atoms = [];
  const seen = new Set([fromId]);
  const queue = [startId];
  seen.add(startId);
  while (queue.length > 0) {
    const id = queue.shift();
    atoms.push(id);
    for (const entry of adjacency.get(id) || []) {
      if (entry.id === fromId && id !== startId) {
        return null;
      }
      if (seen.has(entry.id)) {
        if (entry.id !== fromId && !(adjacency.get(entry.id) || []).some((e) => e.id === id)) {
          return null;
        }
        continue;
      }
      seen.add(entry.id);
      queue.push(entry.id);
    }
  }
  return atoms;
}

function longestGenericChains(graph, adjacency, startId, fromId) {
  const results = [];
  const walk = (path) => {
    const tailId = path[path.length - 1];
    const previousId = path.length > 1 ? path[path.length - 2] : fromId;
    let extended = false;
    for (const entry of adjacency.get(tailId) || []) {
      if (entry.id === previousId || elementOf(graph, entry.id) !== 'C') {
        continue;
      }
      if (path.includes(entry.id) || isFunctionalCarbonBranch(graph, adjacency, entry.id, tailId)) {
        continue;
      }
      extended = true;
      walk(path.concat(entry.id));
    }
    if (!extended) {
      results.push(path);
    }
  };
  walk([startId]);
  return results;
}

function resolveGenericSubstituent(graph, adjacency, startId, fromId) {
  if (elementOf(graph, startId) !== 'C') {
    return null;
  }
  const subtree = collectGenericSubtree(adjacency, startId, fromId);
  if (!subtree || subtree.length < 2 || subtree.length > 40) {
    return null;
  }
  const subtreeBonds = subtree.reduce(
    (count, id) => count + (adjacency.get(id) || []).filter((e) => subtree.includes(e.id)).length,
    0
  ) / 2;
  if (subtreeBonds !== subtree.length - 1) {
    return null;
  }
  const candidates = longestGenericChains(graph, adjacency, startId, fromId);
  const maxLength = Math.max(...candidates.map((path) => path.length));
  let best = null;
  for (const chain of candidates.filter((path) => path.length === maxLength)) {
    if (chain.length > MAX_BRANCH_LENGTH) {
      continue;
    }
    const chainSet = new Set(chain);
    const coreSet = new Set(chain);
    coreSet.add(fromId);
    const acc = createAttachmentAccumulator();
    const visited = new Set(chain);
    let ok = true;
    for (let i = 0; i < chain.length && ok; i++) {
      const before = new Set(coreSet);
      ok = collectCoreAttachments(graph, adjacency, chain[i], i, before, acc, visited, true);
    }
    if (!ok || visited.size !== subtree.length || acc.substituents.some((s) => /idene$/.test(s.name))) {
      continue;
    }
    if (acc.nitriles.length > 0 || acc.carbonyls.length > 0 && false) {
      continue;
    }
    const unsaturations = [];
    for (let i = 0; i < chain.length - 1; i++) {
      const bond = graph.getBond(chain[i], chain[i + 1]);
      if (bond && bond.order > 1) {
        unsaturations.push({ kind: bond.order, locant: i + 1 });
      }
    }
    if (unsaturations.length > 1) {
      continue;
    }
    const entries = acc.substituents.map((entry) => ({ name: entry.name, locant: entry.index + 1 }));
    acc.hydroxyls.forEach((index) => entries.push({ name: 'hydroxy', locant: index + 1 }));
    acc.carbonyls.forEach((index) => entries.push({ name: 'oxo', locant: index + 1 }));
    acc.amines.forEach((index) => entries.push({ name: 'amino', locant: index + 1 }));
    acc.thiols.forEach((index) => entries.push({ name: 'mercapto', locant: index + 1 }));
    const score = entries.length;
    if (!best || score > best.score) {
      best = { chain, entries, unsaturations, score };
    }
  }
  if (!best) {
    return null;
  }
  const root = NAME_ROOTS[best.chain.length];
  if (!root) {
    return null;
  }
  const prefix = assembleSubstituentPrefix(best.entries, best.chain.length > 1);
  if (prefix === null) {
    return null;
  }
  let stem = root + 'yl';
  if (best.unsaturations.length === 1) {
    const entry = best.unsaturations[0];
    stem = best.chain.length === 2
      ? root + (entry.kind === 2 ? 'enyl' : 'ynyl')
      : root + '-' + entry.locant + (entry.kind === 2 ? '-en-1-yl' : '-yn-1-yl');
  }
  let name = prefix + stem;
  if (Object.prototype.hasOwnProperty.call(RETAINED_SUBSTITUENT_NAMES, name)) {
    name = RETAINED_SUBSTITUENT_NAMES[name];
    if (/[0-9]/.test(name)) {
      name = '(' + name + ')';
    }
  } else if (/[0-9,]/.test(name) || best.entries.length > 0) {
    name = '(' + name + ')';
  }
  const locants = new Map();
  best.chain.forEach((id, index) => locants.set(id, index + 1));
  lastSubstituentStereoLocants = locants;
  return { name, atoms: subtree };
}

function classifyAttachment(graph, adjacency, neighbor) {
  const atom = graph.getAtom(neighbor.id);
  if (!atom) {
    return null;
  }
  if (atom.element === 'C') {
    if (neighbor.order !== 1 && neighbor.order !== 2) {
      return null;
    }
    return { kind: 'alkyl' };
  }

  const degree = (adjacency.get(neighbor.id) || []).length;
  if (atom.element === 'O') {
    if (degree !== 1) {
      return null;
    }
    if (neighbor.order === 1) {
      return { kind: 'hydroxyl' };
    }
    if (neighbor.order === 2) {
      return { kind: 'carbonyl' };
    }
    return null;
  }
  if (atom.element === 'N') {
    if (degree === 1 && neighbor.order === 3) {
      return { kind: 'nitrile' };
    }
    if (degree === 2 && neighbor.order === 2) {
      const nAdj = adjacency.get(neighbor.id) || [];
      const others = nAdj.filter((entry) => entry.order === 1);
      if (others.length === 1) {
        const oAtom = graph.getAtom(others[0].id);
        const oDegree = (adjacency.get(others[0].id) || []).length;
        if (oAtom && oAtom.element === 'O' && oDegree === 1) {
          return { kind: 'oxime', oId: others[0].id };
        }
      }
      return null;
    }
    if (degree !== 1 || neighbor.order !== 1) {
      return null;
    }
    return { kind: 'amine' };
  }
  if (atom.element === 'S') {
    if (degree !== 1 || neighbor.order !== 1) {
      return null;
    }
    return { kind: 'thiol' };
  }
  if (Object.prototype.hasOwnProperty.call(HALOGEN_PREFIXES, atom.element)) {
    if (degree !== 1 || neighbor.order !== 1) {
      return null;
    }
    return { kind: 'halogen', name: HALOGEN_PREFIXES[atom.element] };
  }
  return null;
}

function elementOf(graph, atomId) {
  const atom = graph.getAtom(atomId);
  return atom ? atom.element : null;
}

function classifyAlkoxy(graph, adjacency, neighbor, fromId) {
  const atom = graph.getAtom(neighbor.id);
  if (!atom || atom.element !== 'O' || neighbor.order !== 1) {
    return null;
  }
  const neighbors = adjacency.get(neighbor.id) || [];
  if (neighbors.length !== 2) {
    return null;
  }
  const onward = neighbors.filter((entry) => entry.id !== fromId);
  if (onward.length !== 1 || onward[0].order !== 1) {
    return null;
  }
  const branch = collectBranch(graph, adjacency, onward[0].id, neighbor.id);
  if (branch) {
    const root = NAME_ROOTS[branch.length];
    if (root && branch.length <= MAX_BRANCH_LENGTH) {
      return { kind: 'alkoxy', name: root + 'oxy', atoms: [neighbor.id].concat(branch) };
    }
  }
  const haloBranch = resolveHaloalkylBranch(graph, adjacency, onward[0].id, neighbor.id);
  if (haloBranch) {
    const stem = haloBranch.name.endsWith('yl') ? haloBranch.name.slice(0, -2) : haloBranch.name;
    return { kind: 'alkoxy', name: stem + 'oxy', atoms: [neighbor.id].concat(haloBranch.atoms) };
  }
  return null;
}

function classifyBenzyloxy(graph, adjacency, neighbor, fromId) {
  const atom = graph.getAtom(neighbor.id);
  if (!atom || atom.element !== 'O' || neighbor.order !== 1) {
    return null;
  }
  const neighbors = adjacency.get(neighbor.id) || [];
  if (neighbors.length !== 2) {
    return null;
  }
  const onward = neighbors.filter((entry) => entry.id !== fromId);
  if (onward.length !== 1 || onward[0].order !== 1) {
    return null;
  }
  const resolved = resolveBenzylBranch(graph, adjacency, onward[0].id, neighbor.id);
  if (!resolved) {
    return null;
  }
  return { kind: 'alkoxy', name: resolved.name + 'oxy', atoms: [neighbor.id].concat(resolved.atoms) };
}

function classifyThioalkoxy(graph, adjacency, neighbor, fromId) {
  const atom = graph.getAtom(neighbor.id);
  if (!atom || atom.element !== 'S' || neighbor.order !== 1) {
    return null;
  }
  const neighbors = adjacency.get(neighbor.id) || [];
  if (neighbors.length !== 2) {
    return null;
  }
  const onward = neighbors.filter((entry) => entry.id !== fromId);
  if (onward.length !== 1 || onward[0].order !== 1) {
    return null;
  }
  const branch = collectBranch(graph, adjacency, onward[0].id, neighbor.id);
  if (branch) {
    const name = ALKYL_PREFIXES[branch.length];
    if (name && branch.length <= MAX_BRANCH_LENGTH) {
      return { kind: 'thioalkoxy', name: name + 'thio', atoms: [neighbor.id].concat(branch) };
    }
  }
  const haloBranch = resolveHaloalkylBranch(graph, adjacency, onward[0].id, neighbor.id);
  if (haloBranch) {
    return { kind: 'thioalkoxy', name: haloBranch.name + 'thio', atoms: [neighbor.id].concat(haloBranch.atoms) };
  }
  return null;
}

function classifyAcyloxy(graph, adjacency, neighbor, fromId) {
  const atom = graph.getAtom(neighbor.id);
  if (!atom || atom.element !== 'O' || neighbor.order !== 1) {
    return null;
  }
  const oNeighbors = adjacency.get(neighbor.id) || [];
  if (oNeighbors.length !== 2) {
    return null;
  }
  const onward = oNeighbors.filter((entry) => entry.id !== fromId);
  if (onward.length !== 1 || onward[0].order !== 1) {
    return null;
  }
  const carbonylC = graph.getAtom(onward[0].id);
  if (!carbonylC || carbonylC.element !== 'C') {
    return null;
  }
  const cNeighbors = (adjacency.get(onward[0].id) || []).filter((entry) => entry.id !== neighbor.id);
  if (cNeighbors.length !== 2) {
    return null;
  }
  const carbonylO = cNeighbors.find((entry) => {
    const a = graph.getAtom(entry.id);
    return a && a.element === 'O' && entry.order === 2 && (adjacency.get(entry.id) || []).length === 1;
  });
  const alkylC = cNeighbors.find((entry) => {
    const a = graph.getAtom(entry.id);
    return a && a.element === 'C' && entry.order === 1;
  });
  if (!carbonylO || !alkylC || carbonylO === alkylC) {
    return null;
  }
  const chain = [alkylC.id];
  let previous = onward[0].id;
  while (true) {
    const current = chain[chain.length - 1];
    const next = (adjacency.get(current) || []).filter((entry) => entry.id !== previous);
    if (next.length === 0) {
      break;
    }
    if (next.length !== 1 || next[0].order !== 1 || elementOf(graph, next[0].id) !== 'C' || chain.length >= 4) {
      return null;
    }
    previous = current;
    chain.push(next[0].id);
  }
  const acylName = { 1: 'acetoxy', 2: 'propionyloxy', 3: 'butyryloxy', 4: 'valeryloxy' }[chain.length];
  return {
    kind: 'acyloxy',
    name: acylName,
    atoms: [neighbor.id, onward[0].id, carbonylO.id].concat(chain),
  };
}

function classifyPhosphoryloxy(graph, adjacency, neighbor, fromId) {
  const atom = graph.getAtom(neighbor.id);
  if (!atom || atom.element !== 'O' || neighbor.order !== 1) {
    return null;
  }
  const oNeighbors = adjacency.get(neighbor.id) || [];
  if (oNeighbors.length !== 2) {
    return null;
  }
  const onward = oNeighbors.filter((entry) => entry.id !== fromId);
  if (onward.length !== 1 || onward[0].order !== 1) {
    return null;
  }
  const phosphorus = graph.getAtom(onward[0].id);
  if (!phosphorus || phosphorus.element !== 'P') {
    return null;
  }
  const pNeighbors = (adjacency.get(onward[0].id) || []).filter((entry) => entry.id !== neighbor.id);
  if (pNeighbors.length !== 3) {
    return null;
  }
  const doubleO = pNeighbors.filter((entry) => {
    const a = graph.getAtom(entry.id);
    return a && a.element === 'O' && entry.order === 2 && (adjacency.get(entry.id) || []).length === 1;
  });
  const hydroxylOs = pNeighbors.filter((entry) => {
    const a = graph.getAtom(entry.id);
    return a && a.element === 'O' && entry.order === 1 && (adjacency.get(entry.id) || []).length === 1;
  });
  if (doubleO.length !== 1 || hydroxylOs.length !== 2) {
    return null;
  }
  return {
    kind: 'phosphoryloxy',
    name: 'phosphoryloxy',
    atoms: [neighbor.id, onward[0].id, doubleO[0].id, hydroxylOs[0].id, hydroxylOs[1].id],
  };
}

function classifyNitro(graph, adjacency, neighbor, fromId) {
  const atom = graph.getAtom(neighbor.id);
  if (!atom || atom.element !== 'N' || neighbor.order !== 1) {
    return null;
  }
  const others = (adjacency.get(neighbor.id) || []).filter((entry) => entry.id !== fromId);
  if (others.length !== 2) {
    return null;
  }
  for (const entry of others) {
    if (entry.order !== 2 || elementOf(graph, entry.id) !== 'O') {
      return null;
    }
    if ((adjacency.get(entry.id) || []).length !== 1) {
      return null;
    }
  }
  return { kind: 'nitro', name: 'nitro', atoms: [neighbor.id, others[0].id, others[1].id] };
}

function classifyAzide(graph, adjacency, neighbor, fromId) {
  const atom = graph.getAtom(neighbor.id);
  if (!atom || atom.element !== 'N' || neighbor.order !== 1) {
    return null;
  }
  const naOthers = (adjacency.get(neighbor.id) || []).filter((entry) => entry.id !== fromId);
  if (naOthers.length !== 1 || naOthers[0].order !== 2 || elementOf(graph, naOthers[0].id) !== 'N') {
    return null;
  }
  const nb = naOthers[0].id;
  const nbOthers = (adjacency.get(nb) || []).filter((entry) => entry.id !== neighbor.id);
  if (nbOthers.length !== 1 || nbOthers[0].order !== 2 || elementOf(graph, nbOthers[0].id) !== 'N') {
    return null;
  }
  const nc = nbOthers[0].id;
  if ((adjacency.get(nc) || []).length !== 1) {
    return null;
  }
  return { kind: 'azide', name: 'azido', atoms: [neighbor.id, nb, nc] };
}

function classifySulfinylOrSulfonyl(graph, adjacency, neighbor, fromId) {
  const atom = graph.getAtom(neighbor.id);
  if (!atom || atom.element !== 'S' || neighbor.order !== 1) {
    return null;
  }
  const sNeighbors = (adjacency.get(neighbor.id) || []).filter((entry) => entry.id !== fromId);
  const oxygens = sNeighbors.filter(
    (entry) => entry.order === 2 && elementOf(graph, entry.id) === 'O'
  );
  for (const o of oxygens) {
    if ((adjacency.get(o.id) || []).length !== 1) {
      return null;
    }
  }
  if (oxygens.length !== 1 && oxygens.length !== 2) {
    return null;
  }
  const rest = sNeighbors.filter((entry) => !oxygens.includes(entry));
  if (rest.length !== 1 || rest[0].order !== 1) {
    return null;
  }
  const suffix = oxygens.length === 1 ? 'sulfinyl' : 'sulfonyl';
  const branch = collectBranch(graph, adjacency, rest[0].id, neighbor.id);
  if (branch) {
    const alkylName = ALKYL_PREFIXES[branch.length];
    if (alkylName && branch.length <= MAX_BRANCH_LENGTH) {
      return {
        kind: 'sulfinyl',
        name: alkylName + suffix,
        atoms: [neighbor.id].concat(oxygens.map((o) => o.id)).concat(branch),
      };
    }
  }
  const haloBranch = resolveHaloalkylBranch(graph, adjacency, rest[0].id, neighbor.id);
  if (haloBranch) {
    return {
      kind: 'sulfinyl',
      name: haloBranch.name + suffix,
      atoms: [neighbor.id].concat(oxygens.map((o) => o.id)).concat(haloBranch.atoms),
    };
  }
  return null;
}

function classifySulfonicAcidOrAmide(graph, adjacency, neighbor, fromId) {
  const atom = graph.getAtom(neighbor.id);
  if (!atom || atom.element !== 'S' || neighbor.order !== 1) {
    return null;
  }
  const sNeighbors = (adjacency.get(neighbor.id) || []).filter((entry) => entry.id !== fromId);
  const oxygens = sNeighbors.filter(
    (entry) => entry.order === 2 && elementOf(graph, entry.id) === 'O'
  );
  for (const o of oxygens) {
    if ((adjacency.get(o.id) || []).length !== 1) {
      return null;
    }
  }
  if (oxygens.length !== 2) {
    return null;
  }
  const rest = sNeighbors.filter((entry) => !oxygens.includes(entry));
  if (rest.length !== 1 || rest[0].order !== 1) {
    return null;
  }
  const tail = rest[0];
  if ((adjacency.get(tail.id) || []).length !== 1) {
    return null;
  }
  const tailAtoms = [neighbor.id, oxygens[0].id, oxygens[1].id, tail.id];
  if (elementOf(graph, tail.id) === 'O') {
    return { kind: 'genericPrefix', name: 'sulfo', atoms: tailAtoms };
  }
  if (elementOf(graph, tail.id) === 'N') {
    return { kind: 'genericPrefix', name: 'sulfamoyl', atoms: tailAtoms };
  }
  return null;
}

function classifySulfonylHalide(graph, adjacency, neighbor, fromId) {
  const atom = graph.getAtom(neighbor.id);
  if (!atom || atom.element !== 'S' || neighbor.order !== 1) {
    return null;
  }
  const sNeighbors = (adjacency.get(neighbor.id) || []).filter((entry) => entry.id !== fromId);
  const oxygens = sNeighbors.filter(
    (entry) => entry.order === 2 && elementOf(graph, entry.id) === 'O'
  );
  for (const o of oxygens) {
    if ((adjacency.get(o.id) || []).length !== 1) {
      return null;
    }
  }
  if (oxygens.length !== 2) {
    return null;
  }
  const rest = sNeighbors.filter((entry) => !oxygens.includes(entry));
  if (rest.length !== 1 || rest[0].order !== 1) {
    return null;
  }
  const tail = rest[0];
  const tailElement = elementOf(graph, tail.id);
  if (
    !Object.prototype.hasOwnProperty.call(HALOGEN_PREFIXES, tailElement) ||
    (adjacency.get(tail.id) || []).length !== 1
  ) {
    return null;
  }
  return {
    kind: 'genericPrefix',
    name: HALOGEN_PREFIXES[tailElement] + 'sulfonyl',
    atoms: [neighbor.id, oxygens[0].id, oxygens[1].id, tail.id],
  };
}

function classifyAminoSubstituent(graph, adjacency, neighbor, fromId) {
  const atom = graph.getAtom(neighbor.id);
  if (!atom || atom.element !== 'N' || neighbor.order !== 1) {
    return null;
  }
  const others = (adjacency.get(neighbor.id) || []).filter((entry) => entry.id !== fromId);
  if (others.length !== 1 && others.length !== 2) {
    return null;
  }
  const names = [];
  const atoms = [neighbor.id];
  for (const entry of others) {
    if (entry.order !== 1) {
      return null;
    }
    const resolved = resolveAlkylBranch(graph, adjacency, entry.id, neighbor.id);
    if (!resolved) {
      return null;
    }
    names.push(resolved.name);
    resolved.atoms.forEach((id) => atoms.push(id));
  }
  let inner;
  if (names.length === 1) {
    inner = names[0] + 'amino';
  } else if (names[0] === names[1]) {
    inner = 'di' + names[0] + 'amino';
  } else {
    const sorted = names.slice().sort();
    inner = sorted[0] + '(' + sorted[1] + ')amino';
  }
  return { kind: 'genericPrefix', name: inner, atoms };
}

function classifyPhosphono(graph, adjacency, neighbor, fromId) {
  const atom = graph.getAtom(neighbor.id);
  if (!atom || atom.element !== 'P' || neighbor.order !== 1) {
    return null;
  }
  const pNeighbors = (adjacency.get(neighbor.id) || []).filter((entry) => entry.id !== fromId);
  if (pNeighbors.length !== 3) {
    return null;
  }
  const doubleO = pNeighbors.filter((entry) => {
    const a = graph.getAtom(entry.id);
    return a && a.element === 'O' && entry.order === 2 && (adjacency.get(entry.id) || []).length === 1;
  });
  const hydroxylOs = pNeighbors.filter((entry) => {
    const a = graph.getAtom(entry.id);
    return a && a.element === 'O' && entry.order === 1 && (adjacency.get(entry.id) || []).length === 1;
  });
  if (doubleO.length !== 1 || hydroxylOs.length !== 2) {
    return null;
  }
  return {
    kind: 'genericPrefix',
    name: 'phosphono',
    atoms: [neighbor.id, doubleO[0].id, hydroxylOs[0].id, hydroxylOs[1].id],
  };
}

function classifyPhosphino(graph, adjacency, neighbor, fromId) {
  const atom = graph.getAtom(neighbor.id);
  if (!atom || atom.element !== 'P' || neighbor.order !== 1) {
    return null;
  }
  const others = (adjacency.get(neighbor.id) || []).filter((entry) => entry.id !== fromId);
  if (others.length > 2) {
    return null;
  }
  const names = [];
  const atoms = [neighbor.id];
  for (const entry of others) {
    if (entry.order !== 1) {
      return null;
    }
    const resolved = resolveAlkylBranch(graph, adjacency, entry.id, neighbor.id);
    if (!resolved) {
      return null;
    }
    names.push(resolved.name);
    resolved.atoms.forEach((id) => atoms.push(id));
  }
  let inner;
  if (names.length === 0) {
    inner = 'phosphino';
  } else if (names.length === 1) {
    inner = names[0] + 'phosphino';
  } else if (names[0] === names[1]) {
    inner = 'di' + names[0] + 'phosphino';
  } else {
    const sorted = names.slice().sort();
    inner = sorted[0] + '(' + sorted[1] + ')phosphino';
  }
  return { kind: 'genericPrefix', name: inner, atoms };
}

function classifyNitroso(graph, adjacency, neighbor, fromId) {
  const atom = graph.getAtom(neighbor.id);
  if (!atom || atom.element !== 'N' || neighbor.order !== 1) {
    return null;
  }
  const others = (adjacency.get(neighbor.id) || []).filter((entry) => entry.id !== fromId);
  if (others.length !== 1 || others[0].order !== 2) {
    return null;
  }
  const o = others[0];
  if (elementOf(graph, o.id) !== 'O' || (adjacency.get(o.id) || []).length !== 1) {
    return null;
  }
  return { kind: 'genericPrefix', name: 'nitroso', atoms: [neighbor.id, o.id] };
}

function classifyHydrazinyl(graph, adjacency, neighbor, fromId) {
  const atom = graph.getAtom(neighbor.id);
  if (!atom || atom.element !== 'N' || neighbor.order !== 1) {
    return null;
  }
  const others = (adjacency.get(neighbor.id) || []).filter((entry) => entry.id !== fromId);
  if (others.length !== 1 || others[0].order !== 1) {
    return null;
  }
  const n2 = others[0];
  if (elementOf(graph, n2.id) !== 'N') {
    return null;
  }
  const n2Others = (adjacency.get(n2.id) || []).filter((entry) => entry.id !== neighbor.id);
  if (n2Others.length !== 0) {
    return null;
  }
  return { kind: 'genericPrefix', name: 'hydrazinyl', atoms: [neighbor.id, n2.id] };
}

function classifySulfenicAcid(graph, adjacency, neighbor, fromId) {
  const atom = graph.getAtom(neighbor.id);
  if (!atom || atom.element !== 'S' || neighbor.order !== 1) {
    return null;
  }
  const others = (adjacency.get(neighbor.id) || []).filter((entry) => entry.id !== fromId);
  if (others.length !== 1 || others[0].order !== 1) {
    return null;
  }
  const o = others[0];
  if (elementOf(graph, o.id) !== 'O' || (adjacency.get(o.id) || []).length !== 1) {
    return null;
  }
  return { kind: 'genericPrefix', name: 'sulfeno', atoms: [neighbor.id, o.id] };
}

function classifyCumulatedCarbonylImide(graph, adjacency, neighbor, fromId, terminalElement, name) {
  const atom = graph.getAtom(neighbor.id);
  if (!atom || atom.element !== 'N' || neighbor.order !== 1) {
    return null;
  }
  const nOthers = (adjacency.get(neighbor.id) || []).filter((entry) => entry.id !== fromId);
  if (nOthers.length !== 1 || nOthers[0].order !== 2 || elementOf(graph, nOthers[0].id) !== 'C') {
    return null;
  }
  const centralC = nOthers[0].id;
  const cOthers = (adjacency.get(centralC) || []).filter((entry) => entry.id !== neighbor.id);
  if (
    cOthers.length !== 1 ||
    cOthers[0].order !== 2 ||
    elementOf(graph, cOthers[0].id) !== terminalElement
  ) {
    return null;
  }
  const terminal = cOthers[0].id;
  if ((adjacency.get(terminal) || []).length !== 1) {
    return null;
  }
  return { kind: 'nitro', name, atoms: [neighbor.id, centralC, terminal] };
}

function classifyIsocyanate(graph, adjacency, neighbor, fromId) {
  return classifyCumulatedCarbonylImide(graph, adjacency, neighbor, fromId, 'O', 'isocyanato');
}

function classifyIsothiocyanate(graph, adjacency, neighbor, fromId) {
  return classifyCumulatedCarbonylImide(graph, adjacency, neighbor, fromId, 'S', 'isothiocyanato');
}

function createAttachmentAccumulator() {
  return {
    substituents: [],
    hydroxyls: [],
    carbonyls: [],
    amines: [],
    thiols: [],
    nitriles: [],
    oximes: [],
  };
}

function collectCoreAttachments(
  graph,
  adjacency,
  coreId,
  index,
  coreIds,
  acc,
  visited,
  allowAlkoxy,
  allowOxime
) {
  const neighbors = adjacency.get(coreId) || [];
  for (const neighbor of neighbors) {
    if (coreIds.has(neighbor.id)) {
      continue;
    }
    let role = classifyAttachment(graph, adjacency, neighbor);
    if (!role && allowAlkoxy) {
      role = classifyAlkoxy(graph, adjacency, neighbor, coreId);
      if (!role) {
        role = classifyBenzyloxy(graph, adjacency, neighbor, coreId);
      }
      if (!role) {
        role = classifyThioalkoxy(graph, adjacency, neighbor, coreId);
      }
      if (!role) {
        role = classifyAcyloxy(graph, adjacency, neighbor, coreId);
      }
      if (!role) {
        role = classifyPhosphoryloxy(graph, adjacency, neighbor, coreId);
      }
      if (!role) {
        role = classifyNitro(graph, adjacency, neighbor, coreId);
      }
      if (!role) {
        role = classifyAzide(graph, adjacency, neighbor, coreId);
      }
      if (!role) {
        role = classifySulfinylOrSulfonyl(graph, adjacency, neighbor, coreId);
      }
      if (!role) {
        role = classifyIsocyanate(graph, adjacency, neighbor, coreId);
      }
      if (!role) {
        role = classifyIsothiocyanate(graph, adjacency, neighbor, coreId);
      }
      if (!role) {
        role = classifySulfonicAcidOrAmide(graph, adjacency, neighbor, coreId);
      }
      if (!role) {
        role = classifySulfonylHalide(graph, adjacency, neighbor, coreId);
      }
      if (!role) {
        role = classifyAminoSubstituent(graph, adjacency, neighbor, coreId);
      }
      if (!role) {
        role = classifyPhosphono(graph, adjacency, neighbor, coreId);
      }
      if (!role) {
        role = classifyPhosphino(graph, adjacency, neighbor, coreId);
      }
      if (!role) {
        role = classifyNitroso(graph, adjacency, neighbor, coreId);
      }
      if (!role) {
        role = classifyHydrazinyl(graph, adjacency, neighbor, coreId);
      }
      if (!role) {
        role = classifySulfenicAcid(graph, adjacency, neighbor, coreId);
      }
    }
    if (!role) {
      return false;
    }
    if (
      role.kind === 'alkoxy' ||
      role.kind === 'thioalkoxy' ||
      role.kind === 'acyloxy' ||
      role.kind === 'phosphoryloxy' ||
      role.kind === 'nitro' ||
      role.kind === 'azide' ||
      role.kind === 'sulfinyl' ||
      role.kind === 'genericPrefix'
    ) {
      acc.substituents.push({ name: role.name, index });
      role.atoms.forEach((id) => visited.add(id));
      continue;
    }
    if (role.kind === 'alkyl') {
      const resolved = resolveRingAlkylSubstituent(graph, adjacency, neighbor.id, coreId);
      if (!resolved || neighbor.order === 3 || (neighbor.order === 2 && !/yl$/.test(resolved.name))) {
        return false;
      }
      acc.substituents.push({ name: neighbor.order === 2 ? resolved.name + 'idene' : resolved.name, index });
      resolved.atoms.forEach((id) => visited.add(id));
      continue;
    }
    if (role.kind === 'halogen') {
      acc.substituents.push({ name: role.name, index });
    } else if (role.kind === 'hydroxyl') {
      acc.hydroxyls.push(index);
    } else if (role.kind === 'carbonyl') {
      acc.carbonyls.push(index);
    } else if (role.kind === 'thiol') {
      acc.thiols.push(index);
    } else if (role.kind === 'nitrile') {
      acc.nitriles.push(index);
    } else if (role.kind === 'oxime') {
      if (!allowOxime) {
        return false;
      }
      acc.oximes.push(index);
      visited.add(role.oId);
    } else {
      acc.amines.push(index);
    }
    visited.add(neighbor.id);
  }
  return true;
}

function chainDegreeAt(chainLength, index) {
  return (index > 0 ? 1 : 0) + (index < chainLength - 1 ? 1 : 0);
}

function compareLocantLists(a, b) {
  const limit = Math.min(a.length, b.length);
  for (let i = 0; i < limit; i++) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }
  return a.length - b.length;
}

function shouldReverseChain(forward, reverse) {
  if (forward.suffixLocants && reverse.suffixLocants) {
    const suffixCompare = compareLocantLists(forward.suffixLocants, reverse.suffixLocants);
    if (suffixCompare !== 0) {
      return suffixCompare > 0;
    }
  }
  const unsaturation = compareLocantLists(forward.unsaturation, reverse.unsaturation);
  if (unsaturation !== 0) {
    return unsaturation > 0;
  }
  if (forward.doubles && reverse.doubles) {
    const doubles = compareLocantLists(forward.doubles, reverse.doubles);
    if (doubles !== 0) {
      return doubles > 0;
    }
  }
  const substituents = compareLocantLists(forward.substituents, reverse.substituents);
  if (substituents !== 0) {
    return substituents > 0;
  }
  if (forward.cited && reverse.cited) {
    return compareLocantLists(forward.cited, reverse.cited) > 0;
  }
  return false;
}

function substituentCitationKey(name) {
  return name.replace(/^\(/, '').replace(/^tert-/, '');
}

function citationOrderLocants(substituents, locants) {
  const groups = new Map();
  substituents.forEach((entry) => {
    if (!groups.has(entry.name)) {
      groups.set(entry.name, []);
    }
    groups.get(entry.name).push(locants[entry.index]);
  });
  const names = Array.from(groups.keys()).sort((a, b) => {
    const ka = substituentCitationKey(a);
    const kb = substituentCitationKey(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  const out = [];
  names.forEach((name) => groups.get(name).sort((a, b) => a - b).forEach((locant) => out.push(locant)));
  return out;
}

function assembleSubstituentPrefix(entries, showLocants) {
  if (entries.length === 0) {
    return '';
  }
  const groups = new Map();
  entries.forEach((entry) => {
    if (!groups.has(entry.name)) {
      groups.set(entry.name, []);
    }
    groups.get(entry.name).push(entry.locant);
  });

  const alphaKey = substituentCitationKey;
  const names = Array.from(groups.keys()).sort((a, b) => {
    const ka = alphaKey(a);
    const kb = alphaKey(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  const parts = [];
  for (const name of names) {
    const locants = groups.get(name).sort((a, b) => a - b);
    let multiplier = '';
    if (locants.length > 1) {
      multiplier = MULTIPLIER_PREFIXES[locants.length] || '';
      if (!multiplier) {
        return null;
      }
      if (name[0] === '(') {
        multiplier = { di: 'bis', tri: 'tris', tetra: 'tetrakis', penta: 'pentakis', hexa: 'hexakis' }[multiplier] || multiplier;
      }
    }
    parts.push((showLocants ? locants.join(',') + '-' : '') + multiplier + (multiplier && /^tert-/.test(name) ? '-' : '') + name);
  }
  return parts.join('-');
}

function buildNitrogenPrefix(names) {
  if (!names || names.length === 0) {
    return '';
  }
  const sorted = names.slice().sort();
  if (sorted.length === 1) {
    return 'N-' + sorted[0];
  }
  if (sorted.length === 2) {
    if (sorted[0] === sorted[1]) {
      return 'N,N-di' + sorted[0];
    }
    return 'N-' + sorted[0] + '-N-' + sorted[1];
  }
  return null;
}

function scaffoldSubstituentEntries(acc) {
  if (acc.carbonyls.length > 0) {
    return null;
  }
  const entries = acc.substituents.map((entry) => ({
    name: entry.name,
    index: entry.index,
  }));
  acc.hydroxyls.forEach((index) => entries.push({ name: 'hydroxy', index }));
  acc.amines.forEach((index) => entries.push({ name: 'amino', index }));
  return entries;
}
function buildSubstituentPrefix(substituents, chainLength, useReverse, showLocants) {
  const entries = substituents.map((substituent) => ({
    name: substituent.name,
    locant: useReverse ? chainLength - substituent.index : substituent.index + 1,
  }));
  return assembleSubstituentPrefix(entries, showLocants);
}

function buildStem(root, unsaturation, showLocants) {
  if (!unsaturation) {
    return root + 'an';
  }
  const infix = unsaturation.kind === 2 ? 'en' : 'yn';
  return showLocants ? root + '-' + unsaturation.locant + '-' + infix : root + infix;
}

const SUFFIX_WORDS = {
  acid: 'oic acid',
  aldehyde: 'al',
  nitrile: 'nitrile',
  ketone: 'one',
  alcohol: 'ol',
  thiol: 'thiol',
  amine: 'amine',
};
const TERMINAL_SUFFIX_KINDS = { acid: true, aldehyde: true, nitrile: true };
const SECONDARY_PREFIX_NAMES = {
  acid: 'carboxy',
  nitrile: 'cyano',
  aldehyde: 'oxo',
  ketone: 'oxo',
  alcohol: 'hydroxy',
  thiol: 'mercapto',
  amine: 'amino',
  oxime: 'hydroxyimino',
};

function attachSuffix(stem, principal, showLocants) {
  if (!principal) {
    return stem + 'e';
  }
  const locants = principal.locants || [principal.locant];
  if (locants.length === 1) {
    if (principal.kind === 'acid') {
      return stem + 'oic acid';
    }
    if (principal.kind === 'aldehyde') {
      return stem + 'al';
    }
    if (principal.kind === 'nitrile') {
      return stem + 'enitrile';
    }
    if (principal.kind === 'thiol') {
      return showLocants ? stem + 'e-' + locants[0] + '-thiol' : stem + 'ethiol';
    }
    if (principal.kind === 'oxime') {
      return (showLocants ? stem + '-' + locants[0] + '-one' : stem + 'one') + ' oxime';
    }
    const suffix =
      principal.kind === 'ketone' ? 'one' : principal.kind === 'alcohol' ? 'ol' : 'amine';
    return showLocants ? stem + '-' + locants[0] + '-' + suffix : stem + suffix;
  }
  let multiplier = MULTIPLIER_PREFIXES[locants.length];
  const word = SUFFIX_WORDS[principal.kind];
  if (!multiplier || !word) {
    return null;
  }
  if (multiplier.endsWith('a') && /^[aeiou]/.test(word)) {
    multiplier = multiplier.slice(0, -1);
  }
  const useLocants = !TERMINAL_SUFFIX_KINDS[principal.kind];
  return stem + 'e' + (useLocants ? '-' + locants.join(',') + '-' : '') + multiplier + word;
}

function isConfirmedRingAtom(adjacency, atomId, excludeId) {
  const componentAtoms = collectComponentExcluding(adjacency, atomId, excludeId);
  const componentSet = new Set(componentAtoms);
  const componentBonds = [];
  componentSet.forEach((id) => {
    (adjacency.get(id) || []).forEach((entry) => {
      if (componentSet.has(entry.id) && id < entry.id) {
        componentBonds.push({ atomA: id, atomB: entry.id });
      }
    });
  });
  const trimmed = trimToRing(componentAtoms, componentBonds);
  return trimmed.remaining.has(atomId) && trimmed.remaining.size >= 3;
}

function findPendantRingAtoms(graph, atomIds, bonds) {
  const adjacency = buildAdjacency(atomIds, bonds);
  const excluded = new Set();
  for (const atomId of atomIds) {
    if (excluded.has(atomId)) {
      continue;
    }
    const neighbors = adjacency.get(atomId) || [];
    for (const neighbor of neighbors) {
      if (neighbor.order !== 1) {
        continue;
      }
      const canAnchorRingBranch = isConfirmedRingAtom(adjacency, atomId, neighbor.id);
      const hasExternalAnchor = neighbors.length > 1;
      const resolved =
        (elementOf(graph, atomId) === 'N' && resolveBenzylBranch(graph, adjacency, neighbor.id, atomId)) ||
        (elementOf(graph, atomId) === 'O' && resolveBenzylBranch(graph, adjacency, neighbor.id, atomId)) ||
        (elementOf(graph, atomId) === 'N' && !isConfirmedRingAtom(adjacency, atomId, neighbor.id) && resolveCyclopropylBranch(graph, adjacency, neighbor.id, atomId)) ||
        (hasExternalAnchor && resolveTriazolylMethylBranch(graph, adjacency, neighbor.id, atomId)) ||
        (hasExternalAnchor && resolveSulfamoylMethylBranch(graph, adjacency, neighbor.id, atomId)) ||
        (hasExternalAnchor && resolveAzacyclylMethylBranch(graph, adjacency, neighbor.id, atomId)) ||
        (hasExternalAnchor && resolveOxazolidinonylMethylBranch(graph, adjacency, neighbor.id, atomId)) ||
        (hasExternalAnchor && resolvePiperidin4ylBranch(graph, adjacency, neighbor.id, atomId)) ||
        (canAnchorRingBranch && resolveBenzylBranch(graph, adjacency, neighbor.id, atomId)) ||
        (canAnchorRingBranch && resolvePhenylBranch(graph, adjacency, neighbor.id, atomId));
      if (resolved) {
        resolved.atoms.forEach((id) => excluded.add(id));
      }
    }
  }
  return excluded;
}

function peelBridgedRings(atomIds, bonds, pendantAtoms) {
  const rankOf = () => {
    const atoms = atomIds.filter((id) => !pendantAtoms.has(id));
    const kept = bonds.filter((b) => !pendantAtoms.has(b.atomA) && !pendantAtoms.has(b.atomB));
    return kept.length - atoms.length + 1;
  };
  let guard = 0;
  while (rankOf() > 4 && guard++ < 8) {
    const live = bonds.filter((b) => !pendantAtoms.has(b.atomA) && !pendantAtoms.has(b.atomB));
    const adj = new Map();
    atomIds.forEach((id) => {
      if (!pendantAtoms.has(id)) {
        adj.set(id, []);
      }
    });
    live.forEach((b) => {
      adj.get(b.atomA).push({ id: b.atomB, bond: b });
      adj.get(b.atomB).push({ id: b.atomA, bond: b });
    });
    let peeled = false;
    const tries = [];
    live.forEach((b) => {
      tries.push({ bond: b, from: b.atomA, to: b.atomB });
      tries.push({ bond: b, from: b.atomB, to: b.atomA });
    });
    for (const { bond, from, to } of tries) {
      if (bond.order !== 1) {
        continue;
      }
      const side = new Set([from]);
      const stack = [from];
      let cyclic = false;
      while (stack.length) {
        const cur = stack.pop();
        for (const e of adj.get(cur)) {
          if (e.bond === bond) {
            continue;
          }
          if (e.id === to) {
            cyclic = true;
            continue;
          }
          if (!side.has(e.id)) {
            side.add(e.id);
            stack.push(e.id);
          }
        }
      }
      if (cyclic) {
        continue;
      }
      const inside = live.filter((b) => side.has(b.atomA) && side.has(b.atomB)).length;
      const rank = inside - side.size + 1;
      if (rank >= 1 && rank <= 2) {
        side.forEach((id) => pendantAtoms.add(id));
        peeled = true;
        break;
      }
    }
    if (!peeled) {
      return;
    }
  }
}

function deriveName(graph, atomIds) {
  lastChainStereoLocants = null;
  const idSet = new Set(atomIds);
  const bonds = graph.bonds.filter(
    (bond) => idSet.has(bond.atomA) && idSet.has(bond.atomB)
  );
  if (bonds.length === atomIds.length + 1) {
    const aminorexCore = extractAminorexCore(atomIds, bonds);
    if (aminorexCore) {
      const aminorexName = nameAminorex(graph, idSet, buildAdjacency(atomIds, bonds), aminorexCore);
      if (aminorexName) {
        return aminorexName;
      }
    }
  }
  const pendantAtoms = findPendantRingAtoms(graph, atomIds, bonds);
  for (const id of findAzetidideRingAtoms(graph, atomIds, bonds)) {
    pendantAtoms.add(id);
  }
  peelBridgedRings(atomIds, bonds, pendantAtoms);
  const coreAtomIds = pendantAtoms.size === 0 ? atomIds : atomIds.filter((id) => !pendantAtoms.has(id));
  const coreBonds =
    pendantAtoms.size === 0
      ? bonds
      : bonds.filter((bond) => !pendantAtoms.has(bond.atomA) && !pendantAtoms.has(bond.atomB));
  if (coreBonds.length === coreAtomIds.length) {
    return deriveRingName(graph, atomIds, bonds, coreAtomIds, coreBonds);
  }
  if (coreBonds.length === coreAtomIds.length + 1) {
    return deriveFusedName(graph, atomIds, bonds, coreAtomIds, coreBonds);
  }
  if (coreBonds.length === coreAtomIds.length + 2) {
    return deriveTricyclicName(graph, atomIds, bonds, coreAtomIds, coreBonds);
  }
  if (coreBonds.length === coreAtomIds.length + 3) {
    return deriveTetracyclicName(graph, atomIds, bonds, coreAtomIds, coreBonds);
  }
  if (coreBonds.length === coreAtomIds.length + 4) {
    return derivePentacyclicName(graph, atomIds, bonds, coreAtomIds, coreBonds);
  }
  if (bonds.length !== atomIds.length - 1) {
    return null;
  }

  const adjacency = buildAdjacency(atomIds, bonds);
  const chains = longestCarbonChains(buildCarbonAdjacency(graph, atomIds, bonds));
  if (chains.length === 0 || chains[0].length > MAX_NAMED_CHAIN) {
    return null;
  }

  const acylName = nameAcyclicAcylDerivative(graph, idSet, adjacency);
  if (acylName) {
    return acylName;
  }

  const chainKey = (chain) => {
    const set = new Set(chain);
    let multiple = 0;
    let attached = 0;
    chain.forEach((id, i) => {
      (adjacency.get(id) || []).forEach((n) => {
        if (set.has(n.id)) {
          multiple += n.order > 1 && chain[i + 1] === n.id ? 1 : 0;
        } else {
          attached += 1;
        }
      });
    });
    return [multiple, attached];
  };
  const ranked = chains.map((chain, i) => ({ chain, i, key: chainKey(chain) }))
    .sort((p, q) => q.key[0] - p.key[0] || q.key[1] - p.key[1] || p.i - q.i).map((x) => x.chain);
  for (const chain of ranked) {
    const name = nameForChain(graph, idSet, adjacency, chain);
    if (name) {
      return name;
    }
  }
  const isNitrileCarbon = (id) => (adjacency.get(id) || []).some((n) => n.order === 3 && graph.getAtom(n.id).element === 'N');
  for (const chain of chains) {
    let trimmed = chain.slice();
    while (trimmed.length > 1 && isNitrileCarbon(trimmed[0])) {
      trimmed = trimmed.slice(1);
    }
    while (trimmed.length > 1 && isNitrileCarbon(trimmed[trimmed.length - 1])) {
      trimmed = trimmed.slice(0, -1);
    }
    if (trimmed.length === chain.length) {
      continue;
    }
    const name = nameForChain(graph, idSet, adjacency, trimmed, chain.filter((id) => !trimmed.includes(id)));
    if (name) {
      return name;
    }
  }
  return null;
}
