// Curated core rule evidence. Load after reaction-catalog.js.
// Scope strings are implementation audits, not copied literature procedures.
// References support reaction classes; no entry establishes experimental
// validation, conversion, selectivity or safety for an arbitrary query.
const CORE_REACTION_EVIDENCE_SOURCES = {
  "grignardCompatibility": [
    "John McMurry: Grignard carbonyl addition and incompatible functional groups",
    "https://openstax.org/books/organic-chemistry/pages/17-5-alcohols-from-carbonyl-compounds-grignard-reaction",
    "teaching"
  ],
  "coldPermanganate": [
    "Hunt and Spinney: hydroxylation of alkenes with cold alkaline permanganate",
    "https://chem.ucalgary.ca/courses/351/Carey5th/Ch15/ch15-3-3.html",
    "teaching"
  ],
  "benzylicOxidation": [
    "John McMurry: oxidation of aromatic side chains",
    "https://openstax.org/books/organic-chemistry/pages/16-8-oxidation-of-aromatic-compounds",
    "teaching"
  ],
  "borohydrideAcyl": [
    "Chaikin and Brown: Reduction of Aldehydes, Ketones and Acid Chlorides by Sodium Borohydride (1949)",
    "https://doi.org/10.1021/ja01169a033",
    "primary"
  ],
  "alkene": [
    "John McMurry, Organic Chemistry: alkene reaction summary",
    "https://openstax.org/books/organic-chemistry/pages/8-summary-of-reactions",
    "teaching"
  ],
  "alkyne": [
    "John McMurry, Organic Chemistry: alkyne reaction summary",
    "https://openstax.org/books/organic-chemistry/pages/9-summary",
    "teaching"
  ],
  "halide": [
    "John McMurry: competing SN1, SN2, E1 and E2 pathways",
    "https://openstax.org/books/organic-chemistry/pages/11-12-a-summary-of-reactivity-sn1-sn2-e1-e1cb-and-e2",
    "teaching"
  ],
  "acid": [
    "John McMurry: reactions of carboxylic acids",
    "https://openstax.org/books/organic-chemistry/pages/21-3-reactions-of-carboxylic-acids",
    "teaching"
  ],
  "acyl": [
    "John McMurry: chemistry of acid halides",
    "https://openstax.org/books/organic-chemistry/pages/21-4-chemistry-of-acid-halides",
    "teaching"
  ],
  "derivatives": [
    "John McMurry: carboxylic acid derivative reaction summary",
    "https://openstax.org/books/organic-chemistry/pages/21-summary",
    "teaching"
  ],
  "ester": [
    "John McMurry: chemistry of esters",
    "https://openstax.org/books/organic-chemistry/pages/21-6-chemistry-of-esters",
    "teaching"
  ],
  "nitrile": [
    "John McMurry: chemistry of nitriles",
    "https://openstax.org/books/organic-chemistry/pages/20-7-chemistry-of-nitriles",
    "teaching"
  ],
  "enolate": [
    "John McMurry: alkylation of enolate ions",
    "https://openstax.org/books/organic-chemistry/pages/22-7-alkylation-of-enolate-ions",
    "teaching"
  ],
  "alpha": [
    "John McMurry: carbonyl alpha-substitution reaction summary",
    "https://openstax.org/books/organic-chemistry/pages/22-summary-of-reactions",
    "teaching"
  ],
  "aldol": [
    "John McMurry: the aldol reaction",
    "https://openstax.org/books/organic-chemistry/pages/23-1-carbonyl-condensations-the-aldol-reaction",
    "teaching"
  ],
  "condensation": [
    "John McMurry: carbonyl condensation summary",
    "https://openstax.org/books/organic-chemistry/pages/23-summary",
    "teaching"
  ],
  "dieckmann": [
    "John McMurry: intramolecular Claisen condensation",
    "https://openstax.org/books/organic-chemistry/pages/23-9-intramolecular-claisen-condensations-the-dieckmann-cyclization",
    "teaching"
  ],
  "robinson": [
    "John McMurry: Robinson annulation",
    "https://openstax.org/books/organic-chemistry/pages/23-12-the-robinson-annulation-reaction",
    "teaching"
  ],
  "named": [
    "Mandeep Dalal, A Textbook of Organic Chemistry, Vol. I: condensation mechanisms",
    "https://www.dalalinstitute.com/wp-content/uploads/Books/A-Textbook-of-Organic-Chemistry-Volume-1/ATOOCV1-12-4-Mechanism-of-Condensation-Reactions-Involving-Enolates-Aldol-Knoevenagel-Claisen-Mannich-Benzoin-Perkin-and-Stobbe-Reactions.pdf",
    "teaching"
  ],
  "aromatic": [
    "John McMurry: aromatic substitution reactions",
    "https://openstax.org/books/organic-chemistry/pages/16-2-other-aromatic-substitutions",
    "teaching"
  ],
  "friedel": [
    "John McMurry: aromatic chemistry reaction summary",
    "https://openstax.org/books/organic-chemistry/pages/16-summary-of-reactions",
    "teaching"
  ],
  "snar": [
    "John McMurry: nucleophilic aromatic substitution",
    "https://openstax.org/books/organic-chemistry/pages/16-6-nucleophilic-aromatic-substitution",
    "teaching"
  ],
  "alcohol": [
    "John McMurry: reactions of alcohols",
    "https://openstax.org/books/organic-chemistry/pages/17-6-reactions-of-alcohols",
    "teaching"
  ],
  "oxidation": [
    "John McMurry: oxidation of alcohols",
    "https://openstax.org/books/organic-chemistry/pages/17-7-oxidation-of-alcohols",
    "teaching"
  ],
  "ether": [
    "John McMurry: ethers, epoxides, thiols and sulfides reaction summary",
    "https://openstax.org/books/organic-chemistry/pages/18-summary-of-reactions",
    "teaching"
  ],
  "carbonyl": [
    "John McMurry: aldehyde and ketone reaction summary",
    "https://openstax.org/books/organic-chemistry/pages/19-summary-of-reactions",
    "teaching"
  ],
  "grignard": [
    "John McMurry: organomagnesium formation in the alkyl-halide reaction summary",
    "https://openstax.org/books/organic-chemistry/pages/10-summary-of-reactions",
    "teaching"
  ],
  "carboxylation": [
    "John McMurry: preparation of carboxylic acids",
    "https://openstax.org/books/organic-chemistry/pages/20-5-preparing-carboxylic-acids",
    "teaching"
  ],
  "acetylide": [
    "John McMurry: alkylation of acetylide anions",
    "https://openstax.org/books/organic-chemistry/pages/9-8-alkylation-of-acetylide-anions",
    "teaching"
  ],
  "amine": [
    "John McMurry: reactions of amines",
    "https://openstax.org/books/organic-chemistry/pages/24-7-reactions-of-amines",
    "teaching"
  ],
  "cleavage": [
    "John McMurry: oxidative cleavage of alkenes and diols",
    "https://openstax.org/books/organic-chemistry/pages/8-8-oxidation-of-alkenes-cleavage-to-carbonyl-compounds",
    "teaching"
  ],
  "epoxide": [
    "John McMurry: epoxidation and hydroxylation",
    "https://openstax.org/books/organic-chemistry/pages/8-7-oxidation-of-alkenes-epoxidation-and-hydroxylation",
    "teaching"
  ],
  "hydration": [
    "John McMurry: hydration of alkynes",
    "https://openstax.org/books/organic-chemistry/pages/9-4-hydration-of-alkynes",
    "teaching"
  ],
  "wacker": [
    "Smidt et al., The Oxidation of Olefins with Palladium Chloride Catalysts (1962)",
    "https://doi.org/10.1002/anie.196200801",
    "primary"
  ],
  "pinnick": [
    "Bal, Childers and Pinnick, Oxidation of alpha,beta-unsaturated aldehydes (1981)",
    "https://www.sciencedirect.com/science/article/pii/S0040402001979633",
    "primary"
  ],
  "radical": ["John McMurry: allylic radical bromination", "https://openstax.org/books/organic-chemistry/pages/10-3-preparing-alkyl-halides-from-alkenes-allylic-bromination", "teaching"],
  "pcc": ["ACS GCI Pharmaceutical Roundtable: PCC oxidation", "https://reagents.acsgcipr.org/reagent-guides/oxidation-to-aldehyde-and-ketones/list-of-reagents/pcc-review-on-cr-vi-oxidation/", "teaching"],
  "swern": ["ACS GCI Pharmaceutical Roundtable: Swern oxidation", "https://reagents.acsgcipr.org/reagent-guides/oxidation-to-aldehyde-and-ketones/list-of-reagents/dmso-oxalyl-chloride-swern-oxidation/", "teaching"],
  "mno2": ["ACS GCI Pharmaceutical Roundtable: manganese dioxide oxidation", "https://reagents.acsgcipr.org/reagent-guides/oxidation-to-aldehyde-and-ketones/list-of-reagents/manganese-dioxide-mno2/", "teaching"],
  "aldehydeOxidation": ["John McMurry: oxidation of aldehydes and ketones", "https://openstax.org/books/organic-chemistry/pages/19-3-oxidation-of-aldehydes-and-ketones", "teaching"],
  "tempo": [
    "Hinzmann et al., Selective TEMPO-Oxidation of Alcohols to Aldehydes (2020)",
    "https://doi.org/10.1002/ejoc.201901365",
    "primary"
  ]
};
const CORE_REACTION_EVIDENCE_ROWS = [
  [
    "hydrogenation",
    "Reduction",
    "Alkenes/alkynes with H2 and a recognized metal catalyst are saturated; the Lindlar branch converts recognized alkynes to syn alkenes.",
    "Hydrogen and a supported catalyst must be supplied.",
    "All matching unsaturations are edited; catalyst poisoning, pressure-dependent chemoselectivity and selective partial conversion are not simulated.",
    [
      "alkene",
      "alkyne"
    ]
  ],
  [
    "hydroboration",
    "Addition",
    "A recognized borane reagent adds to the selected alkene, placing OH on the locally less-substituted carbon after oxidative work-up.",
    "Peroxide/base work-up is assumed if not supplied and is reported as a warning.",
    "This rule edits one selected alkene and does not implement general alkyne hydroboration or borane competition with every reducible group.",
    [
      "alkene"
    ]
  ],
  [
    "halide",
    "Substitution and elimination",
    "Recognized alkyl halides branch among substitution and elimination using substrate degree, nucleophile/base tags, solvent and temperature.",
    "The encoded nucleophile and base classifications stand in for reagent behavior.",
    "SN1/SN2/E1/E2 competition, rearrangement and regioisomer ratios use local heuristics, not measured rates.",
    [
      "halide"
    ]
  ],
  [
    "fischer",
    "Acyl substitution",
    "A recognized carboxylic acid/alcohol pair under encoded acid catalysis is joined as an ester.",
    "The displayed ester assumes the condensation/work-up sequence.",
    "Equilibrium, water removal, steric inhibition and acid-sensitive side reactions are not quantitatively modeled.",
    [
      "acid"
    ]
  ],
  [
    "reduction",
    "Reduction",
    "NaBH4 edits recognized aldehyde/ketone groups; acyl chloride competition is flagged rather than modeled as selective carbonyl reduction. LiAlH4 additionally handles the explicitly encoded acid derivative, nitrile and epoxide branches.",
    "Alcohol/amine products assume the stated or conventional protonating work-up.",
    "Hydride identity is simplified; individual substrate selectivity and every potentially reducible functional group are not covered.",
    [
      "carbonyl",
      "derivatives",
      "nitrile",
      "borohydrideAcyl"
    ]
  ],
  [
    "acid-chloride",
    "Acyl substitution",
    "SOCl2 or oxalyl chloride converts each recognized carboxylic acid group into an acyl chloride; accompanying alcohols generate a warning.",
    "The dehydrating chlorinating reagent must be recognized by the local tagger.",
    "The rule does not model activator loading, solvent-dependent rates or competing chlorination of other functions.",
    [
      "acid"
    ]
  ],
  [
    "acyl",
    "Acyl substitution",
    "Recognized acyl chlorides react with supported water, alcohol or amine nucleophiles to give the corresponding acid, ester or amide.",
    "The local nucleophile priority selects which partner is incorporated.",
    "Multiple nucleophiles, base equivalents and acylation-site competition are not an exhaustive reaction network.",
    [
      "acyl"
    ]
  ],
  [
    "amide-dehydration",
    "Acyl substitution",
    "Recognized primary amides lose the carbonyl oxygen under SOCl2, POCl3 or a recognized dehydrant to form nitriles.",
    "The amide must have two implicit N hydrogens in the matched pattern.",
    "Secondary/tertiary amides and alternative dehydration products are outside this pattern.",
    [
      "nitrile"
    ]
  ],
  [
    "amide-hydrolysis",
    "Acyl substitution",
    "Supported amide groups undergo encoded acid/water or hydroxide hydrolysis, returning acid or carboxylate and an amine fragment.",
    "Hydrolysis conditions and subsequent protonation state are represented by the chosen branch.",
    "Below 80 C a warning is given rather than a kinetic calculation; resistant amides and degradation pathways are not predicted.",
    [
      "derivatives"
    ]
  ],
  [
    "enolate-alkylation",
    "Carbonyl C–C formation",
    "An active-methylene donor with a soft base, or a matched carbonyl donor with strong base, alkylates a selected methyl/primary halide.",
    "The encoded base and alpha-site selector stand in for enolate formation.",
    "Kinetic/thermodynamic site preference, C/O alkylation and multiple alkylation are simplified; larger halides are excluded.",
    [
      "enolate"
    ]
  ],
  [
    "ester-exchange",
    "Acyl substitution",
    "The first recognized ester undergoes aminolysis with supported amine/ammonia or exchange with solvent alcohol under acid or alkoxide catalysis.",
    "Transesterification assumes the solvent alcohol supplies the incoming alkoxy group.",
    "Equilibria and reaction rates are not calculated; low-temperature aminolysis produces a warning and competing ester sites are not exhaustively searched.",
    [
      "ester"
    ]
  ],
  [
    "saponification",
    "Acyl substitution",
    "Supported esters are hydrolyzed in the encoded aqueous acid or hydroxide branch to acid/carboxylate plus alcohol.",
    "Water and the selected acid/base branch determine the represented product form.",
    "The rule does not predict a hydrolysis rate, equilibrium conversion or every sensitive group in the substrate.",
    [
      "ester",
      "derivatives"
    ]
  ],
  [
    "nitrile-hydrolysis",
    "Acyl substitution",
    "Recognized nitriles under hydroxide or strong acid with water proceed to the encoded carboxylate/acid product.",
    "The model represents hydrolysis through the amide stage as an overall transformation.",
    "Temperature warnings do not model kinetics or selective stopping at an amide.",
    [
      "nitrile"
    ]
  ],
  [
    "sulfonylation",
    "Acyl substitution",
    "A recognized sulfonyl chloride with two S=O bonds, one S–C bond and one S–Cl bond reacts with one selected alcohol or neutral N–H amine site to form a sulfonate ester or sulfonamide.",
    "The matched neutral nucleophile and sulfonyl chloride are available in the assigned roles.",
    "The alcohol source documents tosylation; the amine branch is supported by the amine text. Site competition and protecting-group compatibility remain local heuristics.",
    [
      "alcohol",
      "amine"
    ]
  ],
  [
    "acetylide",
    "Carbonyl C–C formation",
    "A terminal alkyne and supported strong base form an acetylide that alkylates a methyl/primary halide or adds to an aldehyde/ketone.",
    "The carbonyl addition branch assumes protonating work-up.",
    "Secondary/tertiary halides are rejected; general alkyne functionalization and all competing acid-base sites are not implemented.",
    [
      "acetylide",
      "carbonyl"
    ]
  ],
  [
    "hydration",
    "Addition",
    "Water plus recognized strong acid hydrates the selected alkene; a matched alkyne additionally requires the mercury tag and gives the encoded carbonyl.",
    "Alkyne hydration includes enol-to-carbonyl tautomerization.",
    "Regiochemistry is locally ranked; exhaustive carbocation rearrangements and mixtures from unsymmetrical internal alkynes are not enumerated.",
    [
      "alkene",
      "hydration"
    ]
  ],
  [
    "alpha-halogenation",
    "Substitution and elimination",
    "Br2, Cl2 or I2 with encoded acid catalysis halogenates one alpha site of the first matched aldehyde/ketone.",
    "Acetic-acid solvent also counts as acid catalysis in this implementation.",
    "The selected alpha site and mono-halogenation are simplified; PBr3 suppresses this branch and no kinetic distribution is measured.",
    [
      "alpha"
    ]
  ],
  [
    "dehydration",
    "Substitution and elimination",
    "Recognized alcohols under the encoded acid/temperature conditions give an alkene or the supported intermolecular ether branch.",
    "Acid activation is represented through local reagent tags and temperature thresholds.",
    "Rearrangement, ether versus alkene competition and regioisomer proportions are heuristic.",
    [
      "alcohol",
      "ether"
    ]
  ],
  [
    "grignard-extra",
    "Carbonyl C–C formation",
    "A recognized Grignard adds to CO2 or a nitrile when the guard finds no protic donor, competing aldehyde/ketone/ester substrate or recognized carbonyl/nitrile solvent.",
    "The acid or ketone product represents hydrolytic work-up of the organomagnesium adduct.",
    "The guard is finite and does not guarantee compatibility with every acidic hydrogen or electrophilic group.",
    [
      "carboxylation",
      "nitrile",
      "grignardCompatibility"
    ]
  ],
  [
    "grignard",
    "Carbonyl C–C formation",
    "Recognized organomagnesium carbon donors add to the supported aldehyde, ketone or acid-derivative carbonyl patterns to give alcohol products.",
    "Dry conditions and protonating work-up are part of the represented sequence. Protic donors trigger quench; recognized carbonyl/nitrile solvents instead return unresolved solvent-competition hints.",
    "Other acidic functions, steric effects and reagent-dependent 1,2/1,4 selectivity are incompletely represented.",
    [
      "carbonyl",
      "derivatives",
      "grignardCompatibility"
    ]
  ],
  [
    "grignard-formation",
    "Organometallic chemistry",
    "A selected supported organic halide plus magnesium forms the encoded R-Mg-X fragment. Protic donors, recognized carbonyl/nitrile solvents and carbonyl/nitrile functions on listed substrates block isolated-formation assignment.",
    "Ether or THF is the intended solvent; other solvent choices generate a warning.",
    "Metal activation, induction, coupling side products and all incompatible functional groups are not simulated.",
    [
      "grignard",
      "grignardCompatibility"
    ]
  ],
  [
    "radical",
    "Radical chemistry",
    "Recognized radical initiator/light conditions with halogen or NBS replace a locally ranked alkyl, allylic or benzylic hydrogen.",
    "A ranked structural site is used as a proxy for radical stabilization.",
    "All abstraction sites, chain kinetics, overhalogenation and real product ratios are not calculated.",
    [
      "radical",
      "grignard"
    ]
  ],
  [
    "wittig",
    "Carbonyl C–C formation",
    "A recognized phosphorus ylide or encoded in-situ ylide branch replaces an aldehyde/ketone C=O with a C=C bond.",
    "The reagent must match the local ylide/phosphonium and base patterns.",
    "E/Z selection and conversion are simplified; the summary source establishes the reaction class, not this implementation’s stereochemical ranking.",
    [
      "carbonyl"
    ]
  ],
  [
    "halogenation",
    "Addition",
    "Recognized halogen adds to supported C=C/C≡C bonds; the water branch gives a locally oriented halohydrin.",
    "The selected halogen and water availability determine the modeled branch.",
    "Anti-addition geometry is represented where supported, but solvent competition and every regio/stereoisomer are not exhaustively modeled.",
    [
      "alkene",
      "alkyne"
    ]
  ],
  [
    "nitration",
    "Aromatic substitution",
    "Nitric acid plus the encoded sulfuric-acid condition nitrates a ranked aromatic hydrogen using local directing and activation rules.",
    "The aromaticity and substituent classifiers determine candidate sites.",
    "Strongly deficient unactivated rings are excluded; directing ratios, aniline protonation and polysubstitution remain simplified.",
    [
      "aromatic"
    ]
  ],
  [
    "sulfonation",
    "Aromatic substitution",
    "Recognized SO3 installs a sulfonic acid group at a ranked aromatic site; aqueous strong acid enables the encoded reverse desulfonation branch.",
    "The chosen branch represents the forward or reverse net substitution.",
    "Temperature warnings do not calculate reversibility or equilibrium; directing effects and multiple sulfonation are not exhaustive.",
    [
      "aromatic"
    ]
  ],
  [
    "aromatic",
    "Aromatic substitution",
    "Supported arenes undergo recognized Lewis-acid halogenation or Friedel-Crafts alkylation/acylation branches at locally ranked positions.",
    "The encoded arene, electrophile and catalyst patterns determine whether a branch is offered.",
    "Deactivation, rearrangement and ortho/para distributions are simplified; a match does not establish compatibility for heteroarenes.",
    [
      "aromatic",
      "friedel"
    ]
  ],
  [
    "snar",
    "Aromatic substitution",
    "A selected aryl halide activated by encoded ortho/para withdrawing groups or ring nitrogens reacts with a supported amine, alkoxide or hydroxide.",
    "A palladium catalyst suppresses this uncatalyzed SNAr branch.",
    "Activation and leaving-group ranking are structural heuristics; benzyne pathways and all heteroarene substitution patterns are not covered.",
    [
      "snar"
    ]
  ],
  [
    "aldol",
    "Carbonyl C–C formation",
    "A supported enolate base and enolizable aldehyde/ketone give a selected self, crossed or intramolecular aldol; encoded warm conditions can dehydrate it.",
    "The local donor/acceptor and alpha-site selectors choose one candidate from competing possibilities.",
    "Mixed enolizable partners can give several products; no complete stereochemical or kinetic distribution is established.",
    [
      "aldol",
      "condensation"
    ]
  ],
  [
    "claisen",
    "Carbonyl C–C formation",
    "A supported non-hydroxide enolate base enables selected self/crossed ester condensation, ketone acylation or intramolecular Dieckmann cyclization.",
    "An available alpha hydrogen and the locally chosen donor/ester are required.",
    "Alkoxide matching, ring preference, work-up and competing condensations are simplified and do not establish a preparative yield.",
    [
      "condensation",
      "dieckmann"
    ]
  ],
  [
    "cyanide-carbonyl",
    "Carbonyl C–C formation",
    "Cyanide adds to a supported aldehyde/ketone under the encoded acid branch; a supported aromatic aldehyde can instead undergo the benzoin branch without acid.",
    "Substrates bearing recognized halides suppress this carbonyl branch in the local competition guard.",
    "Cyanohydrin equilibrium and benzoin cross-selectivity are not measured; only the locally selected carbonyl is transformed.",
    [
      "carbonyl",
      "named"
    ]
  ],
  [
    "knoevenagel",
    "Carbonyl C–C formation",
    "A recognized amine catalyst joins a supported active-methylene donor to a selected aldehyde/ketone; the encoded malonic-acid branch includes Doebner decarboxylation.",
    "The donor classifier requires the locally supported activating groups.",
    "Ketone reactivity and alkene geometry are simplified; the source supports condensation mechanisms rather than every encoded decarboxylation condition.",
    [
      "named"
    ]
  ],
  [
    "mannich",
    "Carbonyl C–C formation",
    "Recognized formaldehyde, a supported amine and an enolizable carbonyl substrate give one selected beta-amino carbonyl candidate.",
    "The model treats iminium formation and carbon-carbon bond formation as a net transformation.",
    "Competing alpha sites, iminium equilibria and other carbonyl/amine combinations are not exhaustively searched.",
    [
      "named"
    ]
  ],
  [
    "michael",
    "Carbonyl C–C formation",
    "A supported active-methylene/enolate donor or encoded amine donor adds to a recognized conjugated acceptor; amine additions are restricted to ester/nitrile acceptors.",
    "The encoded donor/base pairing represents nucleophile formation.",
    "Only one ranked donor/acceptor pair is used; 1,2/1,4 competition, reversibility and diastereoselectivity are not quantitative.",
    [
      "condensation"
    ]
  ],
  [
    "robinson",
    "Carbonyl C–C formation",
    "A supported base joins a selected ketone enolate donor to the encoded terminal enone acceptor and closes the supported six-membered-ring product.",
    "The displayed annulation includes Michael addition, intramolecular aldol and dehydration.",
    "The engine gives a low-temperature warning and omits general fused-ring and stereochemical scope; the source documents the class rather than every ketone/enone pair.",
    [
      "robinson"
    ]
  ],
  [
    "oxidation",
    "Oxidation",
    "PCC or permanganate oxidizes recognized primary/secondary alcohols. Separate permanganate alkene and alkyl-benzylic branches require recorded water medium and a supported cold-alkaline or heated neutral/acidic regime.",
    "Cold <=10 C and heated >=60 C are conservative implementation scope bounds, not measured kinetic transitions. The cold branch assumes dilute oxidant; neutral acids represent the work-up endpoint.",
    "Other/mixed media, intermediate temperatures and hot alkaline salt endpoints are unresolved. Oxidant concentration, loading and kinetics are not quantitatively modeled; hot benzylic competition is flagged.",
    [
      "oxidation",
      "pcc",
      "cleavage",
      "epoxide",
      "coldPermanganate",
      "benzylicOxidation"
    ]
  ],
  [
    "oxidation-extra",
    "Oxidation",
    "DMP, encoded Swern reagents or Jones conditions oxidize recognized nontertiary alcohols to the selected carbonyl/acid endpoint.",
    "Swern requires encoded oxalyl chloride/DMSO; absence of amine base or low temperature produces a warning rather than blocking every candidate.",
    "Sources document DMP/chromium alcohol oxidation and the activated-DMSO Swern class; individual activation steps and every reagent-sensitive group are not validated by this graph-editing model.",
    [
      "oxidation",
      "swern"
    ]
  ],
  [
    "epoxide",
    "Addition",
    "Recognized epoxides open with the supported acidic, anionic or organometallic nucleophiles using local substitution and anti-opening rules.",
    "The reagent and solvent tags determine acidic versus nucleophilic opening.",
    "Only encoded epoxide sites and regio/stereo choices are modeled; reactions of arbitrary strained ethers or catalyst systems are outside scope.",
    [
      "ether"
    ]
  ],
  [
    "epoxide-closure",
    "Substitution and elimination",
    "A recognized base closes a selected vicinal halohydrin into an epoxide by intramolecular substitution.",
    "The alcohol and leaving-group carbons must satisfy the local adjacency pattern.",
    "Conformation, competing elimination and all possible cyclic closure sizes are not evaluated.",
    [
      "epoxide"
    ]
  ],
  [
    "hydrohalogenation",
    "Addition",
    "Recognized HX adds to the selected alkene/alkyne using local Markovnikov ranking; the HBr peroxide/light branch gives the encoded radical alternative.",
    "The radical alternative is limited to the HBr-specific reagent pattern.",
    "Carbocation rearrangement, partial alkyne addition and real product ratios are simplified.",
    [
      "alkene",
      "alkyne"
    ]
  ],
  [
    "epoxidation",
    "Oxidation",
    "Recognized mCPBA transfers oxygen across a selected nonaromatic alkene to give the encoded epoxide.",
    "The alkene classifier and stored stereo information determine the local transformation.",
    "The rule is not a general oxidation compatibility screen; chemoselectivity among multiple susceptible groups is incomplete.",
    [
      "epoxide"
    ]
  ],
  [
    "osmium",
    "Oxidation",
    "Recognized OsO4 adds two OH groups syn across the selected alkene; NMO is recognized as the encoded reoxidant.",
    "Without NMO the displayed branch assumes stoichiometric osmium rather than catalytic turnover.",
    "Ligand-controlled asymmetric dihydroxylation, rates and chemoselectivity among several alkenes are outside this rule.",
    [
      "epoxide"
    ]
  ],
  [
    "ozonolysis",
    "Oxidation",
    "Recognized ozone cleaves supported alkene/alkyne sites into the locally encoded carbonyl/acid fragments.",
    "The represented endpoint assumes the work-up branch encoded by the selected conditions.",
    "Work-up chemistry and site selection are simplified; not every oxidation-sensitive group or product decomposition pathway is modeled.",
    [
      "cleavage",
      "alkyne"
    ]
  ],
  [
    "periodate",
    "Oxidation",
    "Recognized periodate cleaves the carbon-carbon bond of a selected adjacent diol, replacing the two carbinol groups with carbonyl groups.",
    "The recognized OH groups must lie on directly bonded carbons.",
    "The source supports vicinal-diol cleavage; cyclic ester accessibility, competing alpha-hydroxy carbonyls and every polyol cleavage sequence are not modeled.",
    [
      "cleavage"
    ]
  ],
  [
    "mild-oxidants",
    "Oxidation",
    "Chlorite oxidizes recognized aldehydes; activated MnO2 targets matched allylic/benzylic alcohols; Tollens targets aldehydes; TEMPO plus bleach targets primary alcohols.",
    "The chlorite branch assumes buffered/scavenged work-up; TEMPO requires the encoded hypochlorite co-oxidant.",
    "Pinnick and TEMPO papers support those branches; the ACS guide covers activated MnO2 and the textbook covers aldehyde oxidation. Buffer, scavenger, loading, Tollens-test response and substrate-specific selectivity require checks beyond the local rule.",
    [
      "pinnick",
      "tempo",
      "mno2",
      "aldehydeOxidation"
    ]
  ],
  [
    "wacker",
    "Oxidation",
    "A recognized Pd(II) reagent and water convert the selected supported terminal alkene to the encoded methyl ketone.",
    "Catalytic turnover assumes reoxidation; missing encoded copper/O2 gives a warning.",
    "No complete catalyst cycle, chloride dependence or substrate-specific aldehyde/ketone selectivity model is implemented; the original authors’ paper supports the reaction class.",
    [
      "wacker"
    ]
  ],
  [
    "alcohol-halide",
    "Substitution and elimination",
    "Recognized alcohols react with encoded HX, SOCl2 or PBr3 branches to replace a selected OH group with halogen.",
    "The chosen reagent branch sets the local substitution and stereo treatment.",
    "Carbocation rearrangement and competing elimination are heuristics; general functional-group compatibility is not guaranteed.",
    [
      "alcohol"
    ]
  ],
  [
    "double-elimination",
    "Substitution and elimination",
    "A supported strong base removes two HX units from a selected geminal or vicinal dihalide pattern to produce an alkyne.",
    "The encoded substrate adjacency and available beta hydrogens are required.",
    "Base equivalents, terminal-acetylide protonation and competition with single elimination are simplified; the source supports the dihalide-to-alkyne class.",
    [
      "alkyne"
    ]
  ],
  [
    "hofmann-elimination",
    "Substitution and elimination",
    "Recognized hydroxide or silver oxide enables beta-elimination from a selected quaternary ammonium site to the locally least-substituted alkene.",
    "The input must already contain the encoded ammonium functionality; exhaustive methylation is not automatically planned by this rule.",
    "Below 100 C the engine warns rather than calculating a rate; conformational control and competing dealkylation are not exhausted.",
    [
      "amine"
    ]
  ],
  [
    "williamson",
    "Substitution and elimination",
    "Recognized strong base activates an alcohol, or encoded weaker base activates a phenol, for ether formation with a selected alkyl halide.",
    "The local donor/base combination stands in for alkoxide or phenoxide preparation.",
    "Tertiary halides are excluded and secondary substrates warn of elimination; solvent and site ranking are simplified.",
    [
      "ether",
      "halide"
    ]
  ]
];
const CORE_REACTION_EVIDENCE_IDS = Object.freeze(CORE_REACTION_EVIDENCE_ROWS.map((row) => row[0]));
CORE_REACTION_EVIDENCE_ROWS.forEach(([id, family, scope, assumption, limitation, sourceIds]) => {
  const prior = REACTION_CATALOG_CURATED[id] || {};
  REACTION_CATALOG_CURATED[id] = Object.assign({}, prior, {
    family, scope, assumptions: [assumption], limitations: [limitation],
    references: sourceIds.map((key) => {
      const [title, url, kind] = CORE_REACTION_EVIDENCE_SOURCES[key];
      return { title, url, kind };
    }),
    sourceReview: { date: '2026-10-22', level: 'reaction-class', implementation: 'Local pattern/condition audit; no substrate-specific experimental validation.' },
  });
});
