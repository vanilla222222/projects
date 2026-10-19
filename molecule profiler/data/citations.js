'use strict';

const RULESETS = {
  brenk: {
    label: 'Brenk',
    citation: 'Brenk R, Schipani A, James D, Krasowski A, Gilbert IH, Frearson J, Wyatt PG (2008). '
      + 'Lessons learnt from assembling screening libraries for drug discovery for neglected diseases. '
      + 'ChemMedChem 3(3):435-444.',
    doi: '10.1002/cmdc.200700139',
    url: 'https://doi.org/10.1002/cmdc.200700139',
    coverage: '47 of the 105 patterns in the machine-readable form of this rule set (RDKit\'s BRENK filter catalogue).',
    encoding: 'own'
  },
  pains: {
    label: 'PAINS',
    citation: 'Baell JB, Holloway GA (2010). New substructure filters for removal of pan assay interference '
      + 'compounds (PAINS) from screening libraries and for their exclusion in bioassays. '
      + 'J Med Chem 53(7):2719-2740.',
    doi: '10.1021/jm901137j',
    url: 'https://doi.org/10.1021/jm901137j',
    coverage: '4 of the 480 patterns in the paper\'s supplementary tables (RDKit\'s PAINS_A, PAINS_B and PAINS_C catalogues). '
      + 'Those four are the catechol and quinone redox-cycling classes; the other 476, mostly fused heterocyclic '
      + 'frequent-hitter scaffolds, are not implemented.',
    encoding: 'own'
  },
  warhead: {
    label: 'Covalent warhead',
    citation: 'Gehringer M, Laufer SA (2019). Emerging and re-emerging warheads for targeted covalent inhibitors: '
      + 'applications in medicinal chemistry and chemical biology. J Med Chem 62(12):5673-5724.',
    doi: '10.1021/acs.jmedchem.8b01153',
    url: 'https://doi.org/10.1021/acs.jmedchem.8b01153',
    coverage: 'This review catalogues warhead chemistry rather than publishing a substructure filter. '
      + 'The four patterns flagged here are warhead classes it discusses; they are our encoding, not a published filter.',
    encoding: 'own'
  },
  kazius: {
    label: 'Kazius',
    citation: 'Kazius J, McGuire R, Bursi R (2005). Derivation and validation of toxicophores for mutagenicity '
      + 'prediction. J Med Chem 48(1):312-320.',
    doi: '10.1021/jm040835a',
    url: 'https://doi.org/10.1021/jm040835a',
    coverage: '10 alerts taken from the toxicophore set derived in this paper from 4337 Ames-tested compounds. '
      + 'The paper derives more than we encode.',
    encoding: 'own'
  },
  benigniBossa: {
    label: 'Benigni-Bossa',
    citation: 'Benigni R, Bossa C, Jeliazkova N, Netzeva T, Worth A (2008). The Benigni/Bossa rulebase for '
      + 'mutagenicity and carcinogenicity - a module of Toxtree. JRC Scientific and Technical Reports, EUR 23241 EN. '
      + 'Mechanistic background: Benigni R, Bossa C (2011). Mechanisms of chemical carcinogenicity and mutagenicity: '
      + 'a review with implications for predictive toxicology. Chem Rev 111(4):2507-2536.',
    doi: '10.1021/cr100222q',
    url: 'https://publications.jrc.ec.europa.eu/repository/handle/JRC43157',
    coverage: '18 alerts taken from the Toxtree rulebase, which carries more than we encode.',
    encoding: 'own'
  },
  herg: {
    label: 'hERG heuristic',
    citation: 'Jamieson C, Moir EM, Rankovic Z, Wishart G (2006). Medicinal chemistry of hERG optimizations: '
      + 'highlights and hang-ups. J Med Chem 49(17):5029-5046. PMID 16913693.',
    doi: '',
    url: 'https://pubmed.ncbi.nlm.nih.gov/16913693/',
    coverage: 'This review surveys how medicinal chemists reduce hERG affinity; the recurring theme is a basic '
      + 'centre on a lipophilic scaffold. The three-term cut-off used here (basic amine, WLOGP >= 3.7, MW >= 250) '
      + 'is our own crude reading of that theme, not a model or a threshold the paper states.',
    encoding: 'own'
  },
  computed: {
    label: 'Computed',
    citation: 'No published rule. Counted from our own ring perception or descriptor values.',
    doi: '',
    url: '',
    coverage: 'These rows are not substructure alerts at all. They are properties we compute and then threshold, '
      + 'and nothing published backs the threshold.',
    encoding: 'own'
  },
  mechanism: {
    label: 'Mechanistic literature',
    citation: 'No published substructure filter. Each alert in this group carries its own primary reference, '
      + 'given per row.',
    doi: '',
    url: '',
    coverage: 'These eleven alerts exist in no published rule set. We wrote them from the primary mechanistic '
      + 'literature to cover toxicophores the published rule sets miss, and each one names the paper it came from.',
    encoding: 'own'
  }
};

const RULESETS_NOT_IMPLEMENTED = [
  {
    label: 'Lilly MedChem Rules',
    citation: 'Bruns RF, Watson IA (2012). Rules for identifying potentially reactive or promiscuous compounds. '
      + 'J Med Chem 55(22):9763-9772.',
    doi: '10.1021/jm301008n',
    reason: 'The rules are published as a demerit-scoring program rather than a plain substructure list, and '
      + 'reproducing the demerit arithmetic from the paper alone would be guesswork. Nothing here implements them.'
  },
  {
    label: 'NIH, ZINC and ChEMBL filters',
    citation: 'Shipped as catalogues in RDKit\'s FilterCatalogParams (NIH, ZINC, ChEMBL and its sub-catalogues).',
    doi: '',
    reason: 'Not implemented. We did not want to transcribe patterns we had not read in their source publications, '
      + 'so no alert here claims these catalogues.'
  }
];

const ALERT_ENCODING_NOTE = 'Every SMARTS pattern in this tool was written here from the published description of the '
  + 'alert, then checked against RDKit\'s matcher on the reference library. None was copied from the authors\' '
  + 'machine-readable files, so a pattern may be narrower or broader than theirs even where the citation is exact. '
  + 'Treat the counts above as our coverage of each rule set, not as an implementation of it.';
