'use strict';
// Educational receptor biology; no inferred ligand actions or affinities.
// See RECEPTOR-CATALOG.md for stable IDs, source scope and annotation contracts.
const RECEPTOR_REFERENCE_CATALOG = {
  "schemaVersion": 1,
  "compiledAt": "2026-10-19",
  "species": "Homo sapiens",
  "interpretation": "Receptor activation, inhibition and tissue outcomes are different levels of evidence. These qualitative summaries are not calibrated predictions, compound safety assessments or clinical advice.",
  "sourcePolicy": "NCBI Gene identity/function records were retrieved through NCBI E-utilities on the compilation date. Additional primary studies and curated pathway records support selected mechanisms and consequences. The summaries are original educational synthesis, not a systematic clinical evidence review.",
  "exclusions": [
    {
      "id": "HTR5BP",
      "reason": "Human 5-HT5B is a pseudogene, not included as a functional human receptor.",
      "sourceUrl": "https://www.ncbi.nlm.nih.gov/gene/645694"
    }
  ],
  "actionTerms": [
    {
      "id": "agonist",
      "label": "Agonist",
      "description": "Activates a receptor in a defined assay; receptor reserve can change the observed response."
    },
    {
      "id": "partial_agonist",
      "label": "Partial agonist",
      "description": "Has lower maximal efficacy than a reference agonist in the same system; can oppose a stronger agonist by competition."
    },
    {
      "id": "antagonist",
      "label": "Antagonist",
      "description": "Blocks an agonist response. Neutral antagonism does not require suppression of constitutive activity."
    },
    {
      "id": "inverse_agonist",
      "label": "Inverse agonist",
      "description": "Reduces constitutive receptor signalling; requires demonstrated basal activity, not simply displacement of an agonist."
    },
    {
      "id": "pam",
      "label": "Positive allosteric modulator (PAM)",
      "description": "Amplifies a specified ligand response through another binding site; probe, pathway and assay matter."
    },
    {
      "id": "nam",
      "label": "Negative allosteric modulator (NAM)",
      "description": "Reduces a specified ligand response through another binding site; not necessarily a neutral antagonist."
    },
    {
      "id": "biased",
      "label": "Biased signalling",
      "description": "A ligand favours particular pathways relative to a reference; assay and pathway comparisons are required."
    },
    {
      "id": "channel_blocker",
      "label": "Channel blocker",
      "description": "Reduces ion conduction; voltage, channel state and use dependence can matter."
    },
    {
      "id": "channel_opener",
      "label": "Channel opener",
      "description": "Favours ion-channel opening; consequences depend on ion gradients and cell type."
    },
    {
      "id": "inhibitor",
      "label": "Enzyme / kinase inhibitor",
      "description": "Reduces catalytic activity; inhibition of a receptor kinase differs from ordinary orthosteric antagonism."
    },
    {
      "id": "binding_only",
      "label": "Binding evidence only",
      "description": "Binding or affinity measurements alone do not establish activation, blockade or clinical effects."
    }
  ],
  "receptors": [
    {
      "id": "HTR1A",
      "name": "5-HT1A receptor",
      "family": "Serotonin",
      "kind": "GPCR",
      "genes": [
        "HTR1A"
      ],
      "aliases": [
        "5-HT-1A",
        "5-HT1A",
        "5HT1a",
        "ADRB2RL1",
        "ADRBRL1",
        "G-21",
        "PFMCD"
      ],
      "mechanism": "Gi/o; usually lowers adenylyl cyclase activity",
      "endogenousLigands": "Serotonin",
      "description": "Somatodendritic autoreceptor and postsynaptic regulator of neuronal activity and stress circuits.",
      "activation": "Can inhibit firing or transmitter release; circuit location changes the net response.",
      "blockade": "Prevents serotonin-driven 5-HT1A responses; does not simply reverse all serotonergic effects.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "HTR1A"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: HTR1A",
          "url": "https://www.ncbi.nlm.nih.gov/gene/3350",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "HTR1B",
      "name": "5-HT1B receptor",
      "family": "Serotonin",
      "kind": "GPCR",
      "genes": [
        "HTR1B"
      ],
      "aliases": [
        "5-HT-1B",
        "5-HT-1D-beta",
        "5-HT1B",
        "5-HT1DB",
        "HTR1D2",
        "HTR1DB",
        "S12"
      ],
      "mechanism": "Gi/o; usually lowers adenylyl cyclase activity",
      "endogenousLigands": "Serotonin",
      "description": "Presynaptic transmitter regulation and vascular smooth-muscle signalling.",
      "activation": "Can inhibit transmitter release and promote cranial vessel contraction.",
      "blockade": "Can remove presynaptic feedback; effects depend on the innervated circuit.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "HTR1B"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: HTR1B",
          "url": "https://www.ncbi.nlm.nih.gov/gene/3351",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "HTR1D",
      "name": "5-HT1D receptor",
      "family": "Serotonin",
      "kind": "GPCR",
      "genes": [
        "HTR1D"
      ],
      "aliases": [
        "5-HT1D",
        "HT1DA",
        "HTR1DA",
        "HTRL",
        "RDC4"
      ],
      "mechanism": "Gi/o; usually lowers adenylyl cyclase activity",
      "endogenousLigands": "Serotonin",
      "description": "Regulates transmitter release in trigeminal and other neuronal pathways.",
      "activation": "Can reduce trigeminal neuropeptide release.",
      "blockade": "Prevents receptor-mediated suppression of release; clinical consequences require evidence.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "HTR1D"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: HTR1D",
          "url": "https://www.ncbi.nlm.nih.gov/gene/3352",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "HTR1E",
      "name": "5-HT1E receptor",
      "family": "Serotonin",
      "kind": "GPCR",
      "genes": [
        "HTR1E"
      ],
      "aliases": [
        "5-HT1E"
      ],
      "mechanism": "Gi/o; usually lowers adenylyl cyclase activity",
      "endogenousLigands": "Serotonin",
      "description": "Brain-expressed serotonin receptor with incompletely established physiological roles.",
      "activation": "Reduces cAMP in suitable assays; human organism-level effects remain uncertain.",
      "blockade": "Blocks ligand responses; no established standalone clinical effect can be assigned.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "HTR1E"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: HTR1E",
          "url": "https://www.ncbi.nlm.nih.gov/gene/3354",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "HTR1F",
      "name": "5-HT1F receptor",
      "family": "Serotonin",
      "kind": "GPCR",
      "genes": [
        "HTR1F"
      ],
      "aliases": [
        "5-HT-1F",
        "5-HT1F",
        "5HT6",
        "HTR1EL",
        "MR77"
      ],
      "mechanism": "Gi/o; usually lowers adenylyl cyclase activity",
      "endogenousLigands": "Serotonin",
      "description": "Serotonergic regulation of trigeminal sensory pathways.",
      "activation": "Can suppress trigeminal signalling; activation need not imply vasoconstriction.",
      "blockade": "Blocks receptor-mediated signalling; not an established clinical outcome prediction.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "HTR1F"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: HTR1F",
          "url": "https://www.ncbi.nlm.nih.gov/gene/3355",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "HTR5A",
      "name": "5-HT5A receptor",
      "family": "Serotonin",
      "kind": "GPCR",
      "genes": [
        "HTR5A"
      ],
      "aliases": [
        "5-HT5A"
      ],
      "mechanism": "Gi/o; usually lowers adenylyl cyclase activity",
      "endogenousLigands": "Serotonin",
      "description": "Brain serotonin receptor involved in neuronal signalling; physiological attribution remains limited.",
      "activation": "Can reduce cAMP; behavioural effects are context dependent.",
      "blockade": "Blocks receptor activation; specific human outcomes remain insufficiently established.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "HTR5A"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: HTR5A",
          "url": "https://www.ncbi.nlm.nih.gov/gene/3361",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "HTR2A",
      "name": "5-HT2A receptor",
      "family": "Serotonin",
      "kind": "GPCR",
      "genes": [
        "HTR2A"
      ],
      "aliases": [
        "5-HT2A",
        "HTR2"
      ],
      "mechanism": "Gq/11; phospholipase C and intracellular calcium signalling",
      "endogenousLigands": "Serotonin",
      "description": "Cortical circuit modulation, vascular tone and platelet responses.",
      "activation": "Can alter cortical processing and promote smooth-muscle or platelet responses; ligand and tissue matter.",
      "blockade": "Can suppress 5-HT2A-mediated responses; clinical effects also involve other receptors.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "HTR2A"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: HTR2A",
          "url": "https://www.ncbi.nlm.nih.gov/gene/3356",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "HTR2B",
      "name": "5-HT2B receptor",
      "family": "Serotonin",
      "kind": "GPCR",
      "genes": [
        "HTR2B"
      ],
      "aliases": [
        "5-HT(2B)",
        "5-HT-2B",
        "5-HT2B"
      ],
      "mechanism": "Gq/11; phospholipase C and intracellular calcium signalling",
      "endogenousLigands": "Serotonin",
      "description": "Peripheral serotonin signalling, including heart-valve and vascular cells.",
      "activation": "Sustained agonism can promote valve-cell proliferation and is a cardiac safety concern.",
      "blockade": "Blocks receptor signalling; does not establish that a compound is cardioprotective.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "HTR2B"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: HTR2B",
          "url": "https://www.ncbi.nlm.nih.gov/gene/3357",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "Rothman et al., Circulation (2000)",
          "url": "https://pubmed.ncbi.nlm.nih.gov/11104741/",
          "scope": "Functional receptor study supporting the association between 5-HT2B agonism and drug-associated valve disease; not a per-molecule risk estimate.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "HTR2C",
      "name": "5-HT2C receptor",
      "family": "Serotonin",
      "kind": "GPCR",
      "genes": [
        "HTR2C"
      ],
      "aliases": [
        "5-HT1C",
        "5-HT2C",
        "5-HTR2C",
        "5HTR2C",
        "HTR1C"
      ],
      "mechanism": "Gq/11; phospholipase C and intracellular calcium signalling",
      "endogenousLigands": "Serotonin",
      "description": "Regulates hypothalamic feeding and other central neural circuits.",
      "activation": "Can suppress food intake and alter monoamine circuit activity.",
      "blockade": "Can affect appetite and neural signalling; net effects depend on selectivity and exposure.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "HTR2C"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: HTR2C",
          "url": "https://www.ncbi.nlm.nih.gov/gene/3358",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "HTR4",
      "name": "5-HT4 receptor",
      "family": "Serotonin",
      "kind": "GPCR",
      "genes": [
        "HTR4"
      ],
      "aliases": [
        "5-HT4",
        "5-HT4R"
      ],
      "mechanism": "Gs; typically increases cAMP",
      "endogenousLigands": "Serotonin",
      "description": "Enteric neurotransmission and gastrointestinal motility; also expressed in heart and brain.",
      "activation": "Can facilitate enteric transmitter release and motility.",
      "blockade": "Can reduce 5-HT4-driven facilitation; not a general gastrointestinal shutdown.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "HTR4"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: HTR4",
          "url": "https://www.ncbi.nlm.nih.gov/gene/3360",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "HTR6",
      "name": "5-HT6 receptor",
      "family": "Serotonin",
      "kind": "GPCR",
      "genes": [
        "HTR6"
      ],
      "aliases": [
        "5-HT6",
        "5-HT6R"
      ],
      "mechanism": "Gs; typically increases cAMP",
      "endogenousLigands": "Serotonin",
      "description": "Predominantly central receptor involved in neuronal network modulation.",
      "activation": "Raises cAMP; effects on cognition cannot be inferred from activation alone.",
      "blockade": "Investigated in cognitive disorders; antagonism alone is not proof of benefit.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "HTR6"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: HTR6",
          "url": "https://www.ncbi.nlm.nih.gov/gene/3362",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "HTR7",
      "name": "5-HT7 receptor",
      "family": "Serotonin",
      "kind": "GPCR",
      "genes": [
        "HTR7"
      ],
      "aliases": [
        "5-HT7"
      ],
      "mechanism": "Gs; typically increases cAMP",
      "endogenousLigands": "Serotonin",
      "description": "Circadian, thermoregulatory and smooth-muscle signalling.",
      "activation": "Can relax some smooth muscle and alter neuronal circadian signalling.",
      "blockade": "Can alter these responses; human behavioural outcomes are context dependent.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "HTR7"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: HTR7",
          "url": "https://www.ncbi.nlm.nih.gov/gene/3363",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "DRD1",
      "name": "Dopamine D1 receptor",
      "family": "Dopamine",
      "kind": "GPCR",
      "genes": [
        "DRD1"
      ],
      "aliases": [
        "D1R",
        "DADR",
        "DRD1A"
      ],
      "mechanism": "Gs/olf; typically increases cAMP",
      "endogenousLigands": "Dopamine",
      "description": "Striatal motor circuits and renal and vascular signalling.",
      "activation": "Can facilitate D1-pathway activity and change vascular tone.",
      "blockade": "Can reduce D1-mediated signalling and influence motor or cognitive circuits.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "DRD1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: DRD1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1812",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "DRD5",
      "name": "Dopamine D5 receptor",
      "family": "Dopamine",
      "kind": "GPCR",
      "genes": [
        "DRD5"
      ],
      "aliases": [
        "DBDR",
        "DRD1B",
        "DRD1L2"
      ],
      "mechanism": "Gs/olf; typically increases cAMP",
      "endogenousLigands": "Dopamine",
      "description": "D1-like receptor in central and peripheral signalling.",
      "activation": "Increases cAMP; specific behavioural effects are not determined by coupling alone.",
      "blockade": "Prevents D5 signalling; selective human pharmacology remains limited.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "DRD5"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: DRD5",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1816",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "DRD2",
      "name": "Dopamine D2 receptor",
      "family": "Dopamine",
      "kind": "GPCR",
      "genes": [
        "DRD2"
      ],
      "aliases": [
        "D2DR",
        "D2R"
      ],
      "mechanism": "Gi/o; cAMP inhibition and ion-channel modulation",
      "endogenousLigands": "Dopamine",
      "description": "Motor, pituitary prolactin and presynaptic dopamine feedback pathways.",
      "activation": "Can inhibit prolactin release and modify motor circuits; autoreceptors can reduce dopamine release.",
      "blockade": "Can raise prolactin and produce motor adverse effects; clinical responses depend on context.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "DRD2"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: DRD2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1813",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "DRD3",
      "name": "Dopamine D3 receptor",
      "family": "Dopamine",
      "kind": "GPCR",
      "genes": [
        "DRD3"
      ],
      "aliases": [
        "D3DR",
        "ETM1",
        "FET1"
      ],
      "mechanism": "Gi/o; cAMP inhibition and ion-channel modulation",
      "endogenousLigands": "Dopamine",
      "description": "D2-like receptor enriched in limbic and motivational circuitry.",
      "activation": "Modulates limbic signalling; a single predictable motivational effect is not established.",
      "blockade": "Blocks D3 responses; selective clinical effects require direct evidence.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "DRD3"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: DRD3",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1814",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "DRD4",
      "name": "Dopamine D4 receptor",
      "family": "Dopamine",
      "kind": "GPCR",
      "genes": [
        "DRD4"
      ],
      "aliases": [
        "D4DR"
      ],
      "mechanism": "Gi/o; cAMP inhibition and ion-channel modulation",
      "endogenousLigands": "Dopamine",
      "description": "D2-like receptor involved in cortical neuronal modulation.",
      "activation": "Changes inhibitory intracellular signalling; behavioural direction varies across circuits.",
      "blockade": "Prevents D4 signalling; not sufficient to predict cognition or psychiatric effects.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "DRD4"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: DRD4",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1815",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "ADRA1A",
      "name": "Alpha-1A adrenoceptor",
      "family": "Adrenergic alpha-1",
      "kind": "GPCR",
      "genes": [
        "ADRA1A"
      ],
      "aliases": [
        "ADRA1C",
        "ADRA1L1",
        "ALPHA1AAR"
      ],
      "mechanism": "Gq/11; intracellular calcium signalling",
      "endogenousLigands": "Noradrenaline and adrenaline",
      "description": "Smooth-muscle regulation, including lower urinary tract.",
      "activation": "Can contract urinary and vascular smooth muscle.",
      "blockade": "Can relax lower urinary tract muscle and contribute to postural hypotension.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "ADRA1A"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: ADRA1A",
          "url": "https://www.ncbi.nlm.nih.gov/gene/148",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "ADRA1B",
      "name": "Alpha-1B adrenoceptor",
      "family": "Adrenergic alpha-1",
      "kind": "GPCR",
      "genes": [
        "ADRA1B"
      ],
      "aliases": [
        "ADRA1",
        "ALPHA1BAR"
      ],
      "mechanism": "Gq/11; intracellular calcium signalling",
      "endogenousLigands": "Noradrenaline and adrenaline",
      "description": "Vascular smooth-muscle and other adrenergic signalling.",
      "activation": "Can promote smooth-muscle contraction and vascular resistance.",
      "blockade": "Can reduce alpha-1B-mediated vascular tone; selectivity matters.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "ADRA1B"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: ADRA1B",
          "url": "https://www.ncbi.nlm.nih.gov/gene/147",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "ADRA1D",
      "name": "Alpha-1D adrenoceptor",
      "family": "Adrenergic alpha-1",
      "kind": "GPCR",
      "genes": [
        "ADRA1D"
      ],
      "aliases": [
        "ADRA1",
        "ADRA1A",
        "ADRA1R",
        "ALPHA1",
        "DAR",
        "dJ779E11.2"
      ],
      "mechanism": "Gq/11; intracellular calcium signalling",
      "endogenousLigands": "Noradrenaline and adrenaline",
      "description": "Vascular and lower urinary tract smooth-muscle signalling.",
      "activation": "Can promote smooth-muscle contraction.",
      "blockade": "Can reduce receptor-mediated contraction; organ effects depend on distribution.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "ADRA1D"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: ADRA1D",
          "url": "https://www.ncbi.nlm.nih.gov/gene/146",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "ADRA2A",
      "name": "Alpha-2A adrenoceptor",
      "family": "Adrenergic alpha-2",
      "kind": "GPCR",
      "genes": [
        "ADRA2A"
      ],
      "aliases": [
        "ADRA2",
        "ADRA2R",
        "ADRAR",
        "ALPHA2AAR",
        "FPLD8"
      ],
      "mechanism": "Gi/o; presynaptic release inhibition and other pathways",
      "endogenousLigands": "Noradrenaline and adrenaline",
      "description": "Central sympathetic feedback and presynaptic noradrenaline regulation.",
      "activation": "Can reduce sympathetic outflow, blood pressure and transmitter release; sedation can occur.",
      "blockade": "Can remove inhibitory feedback and increase sympathetic activity.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "ADRA2A"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: ADRA2A",
          "url": "https://www.ncbi.nlm.nih.gov/gene/150",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "ADRA2B",
      "name": "Alpha-2B adrenoceptor",
      "family": "Adrenergic alpha-2",
      "kind": "GPCR",
      "genes": [
        "ADRA2B"
      ],
      "aliases": [
        "ADRA2L1",
        "ADRA2RL1",
        "ADRARL1",
        "ALPHA2BAR",
        "FAME2",
        "alpha-2BAR"
      ],
      "mechanism": "Gi/o; presynaptic release inhibition and other pathways",
      "endogenousLigands": "Noradrenaline and adrenaline",
      "description": "Peripheral vascular and other adrenergic signalling.",
      "activation": "Can cause peripheral vasoconstriction; differs from central alpha-2A effects.",
      "blockade": "Can reduce alpha-2B-mediated contraction; whole-body effects are not uniform.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "ADRA2B"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: ADRA2B",
          "url": "https://www.ncbi.nlm.nih.gov/gene/151",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "ADRA2C",
      "name": "Alpha-2C adrenoceptor",
      "family": "Adrenergic alpha-2",
      "kind": "GPCR",
      "genes": [
        "ADRA2C"
      ],
      "aliases": [
        "ADRA2L2",
        "ADRA2RL2",
        "ADRARL2",
        "ALPHA2CAR"
      ],
      "mechanism": "Gi/o; presynaptic release inhibition and other pathways",
      "endogenousLigands": "Noradrenaline and adrenaline",
      "description": "Presynaptic catecholamine regulation and temperature-related vascular responses.",
      "activation": "Can restrain catecholamine release in relevant tissues.",
      "blockade": "Can remove inhibitory feedback; selective clinical outcomes remain context dependent.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "ADRA2C"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: ADRA2C",
          "url": "https://www.ncbi.nlm.nih.gov/gene/152",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "ADRB1",
      "name": "Beta-1 adrenoceptor",
      "family": "Adrenergic beta",
      "kind": "GPCR",
      "genes": [
        "ADRB1"
      ],
      "aliases": [
        "ADRB1R",
        "B1AR",
        "BETA1AR",
        "FNSS2",
        "RHR"
      ],
      "mechanism": "Gs; typically increases cAMP",
      "endogenousLigands": "Adrenaline and noradrenaline",
      "description": "Cardiac rate and contractility; renal renin release.",
      "activation": "Can increase heart rate, contractile force and renin release.",
      "blockade": "Can reduce cardiac work; bradycardia and reduced contractility can occur.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "ADRB1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: ADRB1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/153",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "ADRB2",
      "name": "Beta-2 adrenoceptor",
      "family": "Adrenergic beta",
      "kind": "GPCR",
      "genes": [
        "ADRB2"
      ],
      "aliases": [
        "ADRB2R",
        "ADRBR",
        "ARB2",
        "B2AR",
        "BAR",
        "BETA2AR"
      ],
      "mechanism": "Gs; typically increases cAMP",
      "endogenousLigands": "Adrenaline and noradrenaline",
      "description": "Airway, vascular and uterine smooth-muscle relaxation.",
      "activation": "Can relax airways; tremor and potassium shifts can occur.",
      "blockade": "Can impair bronchodilation and provoke bronchospasm in susceptible individuals.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "ADRB2"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: ADRB2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/154",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "ADRB3",
      "name": "Beta-3 adrenoceptor",
      "family": "Adrenergic beta",
      "kind": "GPCR",
      "genes": [
        "ADRB3"
      ],
      "aliases": [
        "BETA3AR"
      ],
      "mechanism": "Gs; typically increases cAMP",
      "endogenousLigands": "Adrenaline and noradrenaline",
      "description": "Bladder detrusor relaxation and adipose signalling.",
      "activation": "Can relax the bladder during filling and influence lipolysis.",
      "blockade": "Can block these responses; selective human antagonist effects are not well established.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "ADRB3"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: ADRB3",
          "url": "https://www.ncbi.nlm.nih.gov/gene/155",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "CHRM1",
      "name": "Muscarinic M1 receptor",
      "family": "Muscarinic",
      "kind": "GPCR",
      "genes": [
        "CHRM1"
      ],
      "aliases": [
        "HM1",
        "M1",
        "M1R"
      ],
      "mechanism": "Gq/11; phospholipase C and calcium signalling",
      "endogenousLigands": "Acetylcholine",
      "description": "Cortical, hippocampal and autonomic neuronal modulation.",
      "activation": "Can increase neuronal responsiveness; effects depend on circuit and concurrent acetylcholine.",
      "blockade": "Can impair cognitive processing; peripheral effects depend on subtype selectivity.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "CHRM1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: CHRM1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1128",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "CHRM3",
      "name": "Muscarinic M3 receptor",
      "family": "Muscarinic",
      "kind": "GPCR",
      "genes": [
        "CHRM3"
      ],
      "aliases": [
        "EGBRS",
        "HM3",
        "PBS",
        "m3AChR"
      ],
      "mechanism": "Gq/11; phospholipase C and calcium signalling",
      "endogenousLigands": "Acetylcholine",
      "description": "Glandular secretion, smooth-muscle contraction and endothelial signalling.",
      "activation": "Can increase secretions and contract airway or bladder muscle; endothelium can instead promote vasodilation.",
      "blockade": "Can reduce secretions and relax airway or bladder muscle; dry mouth and retention can occur.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "CHRM3"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: CHRM3",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1131",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "CHRM5",
      "name": "Muscarinic M5 receptor",
      "family": "Muscarinic",
      "kind": "GPCR",
      "genes": [
        "CHRM5"
      ],
      "aliases": [
        "HM5"
      ],
      "mechanism": "Gq/11; phospholipase C and calcium signalling",
      "endogenousLigands": "Acetylcholine",
      "description": "Central cholinergic modulation, including dopaminergic and vascular circuits.",
      "activation": "Can activate calcium-linked signalling; selective human outcomes remain uncertain.",
      "blockade": "Blocks M5 responses; cannot reliably predict behaviour from subtype label alone.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "CHRM5"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: CHRM5",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1133",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "CHRM2",
      "name": "Muscarinic M2 receptor",
      "family": "Muscarinic",
      "kind": "GPCR",
      "genes": [
        "CHRM2"
      ],
      "aliases": [
        "HM2"
      ],
      "mechanism": "Gi/o; cAMP inhibition and potassium-channel regulation",
      "endogenousLigands": "Acetylcholine",
      "description": "Cardiac vagal slowing and presynaptic feedback.",
      "activation": "Can slow heart rate and atrioventricular conduction.",
      "blockade": "Can reduce vagal cardiac restraint and increase heart rate.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "CHRM2"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: CHRM2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1129",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "CHRM4",
      "name": "Muscarinic M4 receptor",
      "family": "Muscarinic",
      "kind": "GPCR",
      "genes": [
        "CHRM4"
      ],
      "aliases": [
        "HM4",
        "M4R"
      ],
      "mechanism": "Gi/o; cAMP inhibition and potassium-channel regulation",
      "endogenousLigands": "Acetylcholine",
      "description": "Central presynaptic and postsynaptic modulation of motor circuits.",
      "activation": "Can inhibit transmitter release and alter striatal activity.",
      "blockade": "Can remove cholinergic inhibitory modulation; whole-person effects need evidence.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "CHRM4"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: CHRM4",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1132",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "HRH1",
      "name": "Histamine H1 receptor",
      "family": "Histamine",
      "kind": "GPCR",
      "genes": [
        "HRH1"
      ],
      "aliases": [
        "H1-R",
        "H1R",
        "HH1R",
        "hisH1"
      ],
      "mechanism": "Gq/11; calcium-linked signalling",
      "endogenousLigands": "Histamine",
      "description": "Allergic vascular and sensory responses; central wakefulness.",
      "activation": "Can promote itch, vascular leakage and smooth-muscle responses.",
      "blockade": "Can reduce allergic symptoms; brain-penetrant blockade can cause sedation.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "HRH1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: HRH1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/3269",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "HRH2",
      "name": "Histamine H2 receptor",
      "family": "Histamine",
      "kind": "GPCR",
      "genes": [
        "HRH2"
      ],
      "aliases": [
        "H2R",
        "HH2R"
      ],
      "mechanism": "Gs; typically increases cAMP",
      "endogenousLigands": "Histamine",
      "description": "Gastric acid secretion and other histamine responses.",
      "activation": "Can stimulate acid secretion by gastric parietal cells.",
      "blockade": "Can reduce histamine-driven gastric acid secretion.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "HRH2"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: HRH2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/3274",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "HRH3",
      "name": "Histamine H3 receptor",
      "family": "Histamine",
      "kind": "GPCR",
      "genes": [
        "HRH3"
      ],
      "aliases": [
        "GPCR97",
        "HH3R"
      ],
      "mechanism": "Gi/o; inhibitory feedback and immune signalling",
      "endogenousLigands": "Histamine",
      "description": "Presynaptic histamine autoreceptor and heteroreceptor in the CNS.",
      "activation": "Can reduce histamine and other transmitter release.",
      "blockade": "Antagonism or inverse agonism can increase histaminergic transmission and wakefulness.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "HRH3"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: HRH3",
          "url": "https://www.ncbi.nlm.nih.gov/gene/11255",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "Pitolisant randomized trial, Lancet Neurology (2013)",
          "url": "https://pubmed.ncbi.nlm.nih.gov/24107292/",
          "scope": "Clinical evidence for one H3 inverse agonist in narcolepsy; not evidence for all H3 ligands.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "HRH4",
      "name": "Histamine H4 receptor",
      "family": "Histamine",
      "kind": "GPCR",
      "genes": [
        "HRH4"
      ],
      "aliases": [
        "AXOR35",
        "BG26",
        "GPCR105",
        "GPRv53",
        "H4",
        "H4R",
        "HH4R"
      ],
      "mechanism": "Gi/o; inhibitory feedback and immune signalling",
      "endogenousLigands": "Histamine",
      "description": "Immune-cell migration and inflammatory signalling.",
      "activation": "Can promote immune-cell chemotaxis and inflammatory responses.",
      "blockade": "Can reduce some histamine-driven immune responses; clinical effects require direct evidence.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "HRH4"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: HRH4",
          "url": "https://www.ncbi.nlm.nih.gov/gene/59340",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "ADORA1",
      "name": "Adenosine A1 receptor",
      "family": "Adenosine",
      "kind": "GPCR",
      "genes": [
        "ADORA1"
      ],
      "aliases": [
        "RDC7"
      ],
      "mechanism": "Gi/o; cAMP inhibition",
      "endogenousLigands": "Adenosine",
      "description": "Neuronal release inhibition and cardiac conduction regulation.",
      "activation": "Can reduce neuronal activity and slow atrioventricular conduction.",
      "blockade": "Can remove adenosine-mediated restraint; cardiac and CNS effects differ.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "ADORA1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: ADORA1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/134",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "ADORA3",
      "name": "Adenosine A3 receptor",
      "family": "Adenosine",
      "kind": "GPCR",
      "genes": [
        "ADORA3"
      ],
      "aliases": [
        "A3AR"
      ],
      "mechanism": "Gi/o; cAMP inhibition",
      "endogenousLigands": "Adenosine",
      "description": "Immune and tissue-stress signalling.",
      "activation": "Modulates inflammatory and stress pathways with species-dependent effects.",
      "blockade": "Blocks A3 responses; no single protective or harmful human outcome follows.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "ADORA3"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: ADORA3",
          "url": "https://www.ncbi.nlm.nih.gov/gene/140",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "ADORA2A",
      "name": "Adenosine A2A receptor",
      "family": "Adenosine",
      "kind": "GPCR",
      "genes": [
        "ADORA2A"
      ],
      "aliases": [
        "A2aR",
        "ADORA2",
        "RDC8"
      ],
      "mechanism": "Gs; usually raises cAMP; A2B can also recruit Gq",
      "endogenousLigands": "Adenosine",
      "description": "Striatal modulation, vascular relaxation and immune regulation.",
      "activation": "Can dilate vessels and modify motor and inflammatory responses.",
      "blockade": "Can alter striatal motor signalling and remove immune restraint; context matters.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "ADORA2A"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: ADORA2A",
          "url": "https://www.ncbi.nlm.nih.gov/gene/135",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "ADORA2B",
      "name": "Adenosine A2B receptor",
      "family": "Adenosine",
      "kind": "GPCR",
      "genes": [
        "ADORA2B"
      ],
      "aliases": [
        "ADORA2"
      ],
      "mechanism": "Gs; usually raises cAMP; A2B can also recruit Gq",
      "endogenousLigands": "Adenosine",
      "description": "Lower-affinity adenosine sensing in stress, vascular and immune tissues.",
      "activation": "Can change vascular tone and inflammatory mediator release at elevated adenosine.",
      "blockade": "Can reduce A2B responses; effects vary across inflammation and tissue injury models.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "ADORA2B"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: ADORA2B",
          "url": "https://www.ncbi.nlm.nih.gov/gene/136",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "MTNR1A",
      "name": "Melatonin MT1 receptor",
      "family": "Melatonin",
      "kind": "GPCR",
      "genes": [
        "MTNR1A"
      ],
      "aliases": [
        "MEL-1A-R",
        "MT1"
      ],
      "mechanism": "Primarily Gi/o; circadian signalling",
      "endogenousLigands": "Melatonin",
      "description": "Circadian and sleep-related signalling in the brain and peripheral tissues.",
      "activation": "Can suppress suprachiasmatic neuronal activity and support sleep timing.",
      "blockade": "Can interfere with melatonin-driven responses; does not predict insomnia in every setting.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "MTNR1A"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: MTNR1A",
          "url": "https://www.ncbi.nlm.nih.gov/gene/4543",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "MTNR1B",
      "name": "Melatonin MT2 receptor",
      "family": "Melatonin",
      "kind": "GPCR",
      "genes": [
        "MTNR1B"
      ],
      "aliases": [
        "FGQTL2",
        "MEL-1B-R",
        "MT2"
      ],
      "mechanism": "Primarily Gi/o; circadian signalling",
      "endogenousLigands": "Melatonin",
      "description": "Circadian phase regulation and peripheral metabolic signalling.",
      "activation": "Can shift circadian responses; effects depend on timing.",
      "blockade": "Can prevent MT2-mediated phase responses; metabolic effects are context dependent.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "MTNR1B"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: MTNR1B",
          "url": "https://www.ncbi.nlm.nih.gov/gene/4544",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "OPRM1",
      "name": "Mu opioid receptor",
      "family": "Opioid",
      "kind": "GPCR",
      "genes": [
        "OPRM1"
      ],
      "aliases": [
        "LMOR",
        "M-OR-1",
        "MOP",
        "MOR",
        "MOR1",
        "OPRM"
      ],
      "mechanism": "Gi/o; release inhibition and ion-channel modulation",
      "endogenousLigands": "Beta-endorphin and enkephalins",
      "description": "Pain processing, gastrointestinal motility and respiratory control.",
      "activation": "Can produce analgesia, constipation and respiratory depression; tolerance and dependence can develop.",
      "blockade": "Can oppose mu-mediated effects and precipitate withdrawal in opioid-dependent individuals.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "OPRM1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: OPRM1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/4988",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "OPRK1",
      "name": "Kappa opioid receptor",
      "family": "Opioid",
      "kind": "GPCR",
      "genes": [
        "OPRK1"
      ],
      "aliases": [
        "K-OR-1",
        "KOP",
        "KOR",
        "KOR-1",
        "KOR1",
        "OPRK"
      ],
      "mechanism": "Gi/o; release inhibition and ion-channel modulation",
      "endogenousLigands": "Dynorphins",
      "description": "Dynorphin-sensitive pain, stress and motivational pathways.",
      "activation": "Can modulate pain and cause dysphoric effects; context and brain access matter.",
      "blockade": "Can reduce kappa responses; clinical benefit cannot be assumed.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "OPRK1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: OPRK1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/4986",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "OPRD1",
      "name": "Delta opioid receptor",
      "family": "Opioid",
      "kind": "GPCR",
      "genes": [
        "OPRD1"
      ],
      "aliases": [
        "DOP",
        "DOR",
        "DOR1",
        "OPRD"
      ],
      "mechanism": "Gi/o; release inhibition and ion-channel modulation",
      "endogenousLigands": "Enkephalins",
      "description": "Enkephalin-sensitive pain and affective signalling.",
      "activation": "Can modify pain and mood-related circuits; some agonists show seizure liability in models.",
      "blockade": "Blocks delta responses; cannot establish a uniform mood or pain outcome.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "OPRD1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: OPRD1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/4985",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "OPRL1",
      "name": "Nociceptin/orphanin FQ receptor",
      "family": "Opioid",
      "kind": "GPCR",
      "genes": [
        "OPRL1"
      ],
      "aliases": [
        "KOR-3",
        "KOR3",
        "NOCIR",
        "NOP",
        "NOPr",
        "OOR",
        "OPRL",
        "ORL1",
        "PNOCR"
      ],
      "mechanism": "Gi/o; release inhibition and ion-channel modulation",
      "endogenousLigands": "Nociceptin/orphanin FQ",
      "description": "Nociceptin-sensitive regulation of pain, stress and autonomic pathways.",
      "activation": "Can facilitate or inhibit pain depending on site and context.",
      "blockade": "Blocks nociceptin responses; not equivalent to blocking classical opioid receptors.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "OPRL1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: OPRL1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/4987",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "CNR1",
      "name": "Cannabinoid CB1 receptor",
      "family": "Cannabinoid",
      "kind": "GPCR",
      "genes": [
        "CNR1"
      ],
      "aliases": [
        "CANN6",
        "CB-R",
        "CB1",
        "CB1A",
        "CB1K5",
        "CB1R",
        "CNR"
      ],
      "mechanism": "Gi/o; presynaptic and immune signalling",
      "endogenousLigands": "Anandamide and 2-arachidonoylglycerol; potency depends on system",
      "description": "Presynaptic regulation of transmitter release in central and peripheral tissues.",
      "activation": "Can alter memory, coordination, appetite and pain processing; location matters.",
      "blockade": "Can reduce CB1 responses; central inverse agonism can carry psychiatric adverse effects.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "CNR1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: CNR1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1268",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "CNR2",
      "name": "Cannabinoid CB2 receptor",
      "family": "Cannabinoid",
      "kind": "GPCR",
      "genes": [
        "CNR2"
      ],
      "aliases": [
        "CB-2",
        "CB2",
        "CX5"
      ],
      "mechanism": "Gi/o; presynaptic and immune signalling",
      "endogenousLigands": "Anandamide and 2-arachidonoylglycerol; potency depends on system",
      "description": "Immune-cell and other peripheral signalling; expression changes with disease.",
      "activation": "Can modify immune responses; anti-inflammatory effects are not universal.",
      "blockade": "Can oppose CB2-mediated responses; human clinical consequences remain context dependent.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "CNR2"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: CNR2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1269",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "TAAR1",
      "name": "Trace amine-associated receptor 1",
      "family": "Trace amine",
      "kind": "GPCR",
      "genes": [
        "TAAR1"
      ],
      "aliases": [
        "TA1",
        "TAR1",
        "TRAR1"
      ],
      "mechanism": "Predominantly Gs-linked; signalling varies by assay",
      "endogenousLigands": "Trace amines including beta-phenethylamine and tyramine",
      "description": "Modulates monoaminergic cellular and neuronal signalling.",
      "activation": "Can change monoamine-system activity; not equivalent to directly activating dopamine receptors.",
      "blockade": "Can remove TAAR1-mediated modulation; human clinical outcomes remain uncertain.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "TAAR1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: TAAR1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/134864",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "HCRTR1",
      "name": "Orexin OX1 receptor",
      "family": "Orexin",
      "kind": "GPCR",
      "genes": [
        "HCRTR1"
      ],
      "aliases": [
        "ORXR1",
        "OX1R",
        "OXR1"
      ],
      "mechanism": "Gq and other G-protein pathways",
      "endogenousLigands": "Orexin A preferentially; orexin B is less potent",
      "description": "Arousal, autonomic and motivational signalling.",
      "activation": "Can promote arousal-related responses; ligand and circuit matter.",
      "blockade": "Can reduce orexin-driven arousal; OX1 and OX2 roles overlap but differ.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "HCRTR1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: HCRTR1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/3061",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "Orexin antagonist randomized trial (2012)",
          "url": "https://pubmed.ncbi.nlm.nih.gov/23197752/",
          "scope": "Clinical sleep evidence for dual orexin antagonism; does not isolate the OX1 subtype.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "HCRTR2",
      "name": "Orexin OX2 receptor",
      "family": "Orexin",
      "kind": "GPCR",
      "genes": [
        "HCRTR2"
      ],
      "aliases": [
        "ORXR2",
        "OX2R",
        "OXR2"
      ],
      "mechanism": "Gq and other G-protein pathways",
      "endogenousLigands": "Orexin A and orexin B",
      "description": "Maintenance of wakefulness and sleep-state stability.",
      "activation": "Can promote and stabilize wakefulness.",
      "blockade": "Can promote sleep; loss of orexin signalling is associated with narcolepsy.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "HCRTR2"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: HCRTR2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/3062",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "Orexin antagonist randomized trial (2012)",
          "url": "https://pubmed.ncbi.nlm.nih.gov/23197752/",
          "scope": "Clinical sleep evidence for dual orexin antagonism; not a selective-subtype trial.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "TACR1",
      "name": "Neurokinin NK1 receptor",
      "family": "Tachykinin",
      "kind": "GPCR",
      "genes": [
        "TACR1"
      ],
      "aliases": [
        "NK1R",
        "NKIR",
        "SPR",
        "TAC1R"
      ],
      "mechanism": "Predominantly Gq/11",
      "endogenousLigands": "Substance P preferentially",
      "description": "Substance-P-sensitive emetic, sensory and inflammatory signalling.",
      "activation": "Can drive emetic and neurogenic inflammatory pathways.",
      "blockade": "Can suppress NK1-mediated emetic signalling; other effects depend on tissue.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "TACR1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: TACR1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/6869",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "TACR2",
      "name": "Neurokinin NK2 receptor",
      "family": "Tachykinin",
      "kind": "GPCR",
      "genes": [
        "TACR2"
      ],
      "aliases": [
        "NK2R",
        "NKNAR",
        "SKR",
        "TAC2R"
      ],
      "mechanism": "Predominantly Gq/11",
      "endogenousLigands": "Neurokinin A preferentially",
      "description": "Neurokinin-A-sensitive smooth-muscle signalling.",
      "activation": "Can contract airway, intestinal and other smooth muscle.",
      "blockade": "Can reduce NK2-mediated contraction.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "TACR2"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: TACR2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/6865",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "TACR3",
      "name": "Neurokinin NK3 receptor",
      "family": "Tachykinin",
      "kind": "GPCR",
      "genes": [
        "TACR3"
      ],
      "aliases": [
        "HH11",
        "NK-3R",
        "NK3",
        "NK3R",
        "NKR",
        "TAC3R",
        "TAC3RL"
      ],
      "mechanism": "Predominantly Gq/11",
      "endogenousLigands": "Neurokinin B preferentially",
      "description": "Neurokinin-B-sensitive hypothalamic and neuroendocrine signalling.",
      "activation": "Can influence thermoregulatory and reproductive neuroendocrine circuits.",
      "blockade": "Can reduce vasomotor symptoms in relevant clinical settings; effects are context dependent.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "TACR3"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: TACR3",
          "url": "https://www.ncbi.nlm.nih.gov/gene/6870",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "Fezolinetant phase 2b randomized trial (2020)",
          "url": "https://pubmed.ncbi.nlm.nih.gov/32102086/",
          "scope": "Clinical vasomotor-symptom evidence for a specific NK3 antagonist; not a class-wide benefit guarantee.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "NPY1R",
      "name": "Neuropeptide Y Y1 receptor",
      "family": "Neuropeptide Y",
      "kind": "GPCR",
      "genes": [
        "NPY1R"
      ],
      "aliases": [
        "NPY1-R",
        "NPYR"
      ],
      "mechanism": "Predominantly Gi/o",
      "endogenousLigands": "Neuropeptide Y and peptide YY",
      "description": "Feeding, vascular and neural NPY responses.",
      "activation": "Can promote vasoconstriction and alter feeding circuits.",
      "blockade": "Can reduce Y1-mediated responses; selective clinical effects are uncertain.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "NPY1R"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: NPY1R",
          "url": "https://www.ncbi.nlm.nih.gov/gene/4886",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "NPY2R",
      "name": "Neuropeptide Y Y2 receptor",
      "family": "Neuropeptide Y",
      "kind": "GPCR",
      "genes": [
        "NPY2R"
      ],
      "aliases": [
        "NPY2-R"
      ],
      "mechanism": "Predominantly Gi/o",
      "endogenousLigands": "Neuropeptide Y and peptide YY, including PYY(3-36)",
      "description": "Presynaptic feedback and gut-brain satiety pathways.",
      "activation": "Can inhibit transmitter release and support satiety pathways.",
      "blockade": "Can remove presynaptic or satiety-related signalling; net feeding effects vary.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "NPY2R"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: NPY2R",
          "url": "https://www.ncbi.nlm.nih.gov/gene/4887",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "NPY4R",
      "name": "Neuropeptide Y Y4 receptor",
      "family": "Neuropeptide Y",
      "kind": "GPCR",
      "genes": [
        "NPY4R"
      ],
      "aliases": [
        "NPY4-R",
        "PP1",
        "PPYR1",
        "Y4"
      ],
      "mechanism": "Predominantly Gi/o",
      "endogenousLigands": "Pancreatic polypeptide preferentially",
      "description": "Pancreatic-polypeptide-sensitive gut-brain signalling.",
      "activation": "Can influence satiety and digestive signalling.",
      "blockade": "Blocks Y4 responses; human outcome attribution remains limited.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "NPY4R"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: NPY4R",
          "url": "https://www.ncbi.nlm.nih.gov/gene/5540",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "NPY5R",
      "name": "Neuropeptide Y Y5 receptor",
      "family": "Neuropeptide Y",
      "kind": "GPCR",
      "genes": [
        "NPY5R"
      ],
      "aliases": [
        "NPY5-R",
        "NPYR5",
        "NPYY5-R"
      ],
      "mechanism": "Predominantly Gi/o",
      "endogenousLigands": "Neuropeptide Y and peptide YY",
      "description": "Hypothalamic NPY signalling associated with food intake.",
      "activation": "Can support feeding-related responses.",
      "blockade": "Can oppose Y5 responses; does not establish weight-loss efficacy.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "NPY5R"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: NPY5R",
          "url": "https://www.ncbi.nlm.nih.gov/gene/4889",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "SSTR1",
      "name": "Somatostatin SST1 receptor",
      "family": "Somatostatin",
      "kind": "GPCR",
      "genes": [
        "SSTR1"
      ],
      "aliases": [
        "SRIF-2",
        "SS-1-R",
        "SS1-R",
        "SS1R",
        "SST1"
      ],
      "mechanism": "Gi/o; release inhibition",
      "endogenousLigands": "Somatostatin and cortistatin",
      "description": "Endocrine and neural secretory regulation.",
      "activation": "Can restrain secretion and cell-signalling pathways.",
      "blockade": "Can remove SST1-mediated inhibition; selective human effects are uncertain.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "SSTR1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: SSTR1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/6751",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "SSTR2",
      "name": "Somatostatin SST2 receptor",
      "family": "Somatostatin",
      "kind": "GPCR",
      "genes": [
        "SSTR2"
      ],
      "aliases": [
        "SST2"
      ],
      "mechanism": "Gi/o; release inhibition",
      "endogenousLigands": "Somatostatin and cortistatin",
      "description": "Pituitary, gastrointestinal and neuroendocrine-cell signalling.",
      "activation": "Can suppress hormone secretion and modulate cell growth.",
      "blockade": "Can remove inhibitory control over secretion in responsive tissues.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "SSTR2"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: SSTR2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/6752",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "SSTR3",
      "name": "Somatostatin SST3 receptor",
      "family": "Somatostatin",
      "kind": "GPCR",
      "genes": [
        "SSTR3"
      ],
      "aliases": [
        "SS-3-R",
        "SS3-R",
        "SS3R",
        "SSR-28",
        "SST3"
      ],
      "mechanism": "Gi/o; release inhibition",
      "endogenousLigands": "Somatostatin and cortistatin",
      "description": "Neuronal cilia and endocrine-cell signalling.",
      "activation": "Can alter cAMP and cellular responses; organism-level outcomes vary.",
      "blockade": "Blocks SST3 signalling; selective clinical effects are not established.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "SSTR3"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: SSTR3",
          "url": "https://www.ncbi.nlm.nih.gov/gene/6753",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "SSTR4",
      "name": "Somatostatin SST4 receptor",
      "family": "Somatostatin",
      "kind": "GPCR",
      "genes": [
        "SSTR4"
      ],
      "aliases": [
        "SS-4-R",
        "SS4-R",
        "SS4R",
        "SST4"
      ],
      "mechanism": "Gi/o; release inhibition",
      "endogenousLigands": "Somatostatin and cortistatin",
      "description": "Neural and peripheral modulatory signalling.",
      "activation": "Can influence pain and inflammatory pathways in experimental systems.",
      "blockade": "Blocks SST4 responses; no general clinical outcome is established.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "SSTR4"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: SSTR4",
          "url": "https://www.ncbi.nlm.nih.gov/gene/6754",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "SSTR5",
      "name": "Somatostatin SST5 receptor",
      "family": "Somatostatin",
      "kind": "GPCR",
      "genes": [
        "SSTR5"
      ],
      "aliases": [
        "SS-5-R",
        "SST5"
      ],
      "mechanism": "Gi/o; release inhibition",
      "endogenousLigands": "Somatostatin and cortistatin",
      "description": "Pituitary and pancreatic hormone regulation.",
      "activation": "Can suppress hormone release, including insulin in responsive cells.",
      "blockade": "Can remove inhibitory secretory control; glycaemic effects depend on the full system.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "SSTR5"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: SSTR5",
          "url": "https://www.ncbi.nlm.nih.gov/gene/6755",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "AVPR1A",
      "name": "Vasopressin V1A receptor",
      "family": "Vasopressin and oxytocin",
      "kind": "GPCR",
      "genes": [
        "AVPR1A"
      ],
      "aliases": [
        "AVPR V1a",
        "AVPR1",
        "V1aR"
      ],
      "mechanism": "Gq/11; calcium signalling",
      "endogenousLigands": "Vasopressin",
      "description": "Vascular smooth-muscle and central vasopressin signalling.",
      "activation": "Can promote vasoconstriction; central effects depend on circuit.",
      "blockade": "Can reduce V1A-driven contraction; behaviour cannot be inferred from blockade alone.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "AVPR1A"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: AVPR1A",
          "url": "https://www.ncbi.nlm.nih.gov/gene/552",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "AVPR1B",
      "name": "Vasopressin V1B receptor",
      "family": "Vasopressin and oxytocin",
      "kind": "GPCR",
      "genes": [
        "AVPR1B"
      ],
      "aliases": [
        "AVPR3",
        "V1bR",
        "VPR3"
      ],
      "mechanism": "Gq/11; calcium signalling",
      "endogenousLigands": "Vasopressin",
      "description": "Pituitary stress-axis regulation.",
      "activation": "Can support ACTH release in the appropriate hormonal context.",
      "blockade": "Can reduce V1B-mediated pituitary responses; does not switch off the stress axis.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "AVPR1B"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: AVPR1B",
          "url": "https://www.ncbi.nlm.nih.gov/gene/553",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "OXTR",
      "name": "Oxytocin receptor",
      "family": "Vasopressin and oxytocin",
      "kind": "GPCR",
      "genes": [
        "OXTR"
      ],
      "aliases": [
        "OT-R",
        "OTR"
      ],
      "mechanism": "Gq/11; calcium signalling",
      "endogenousLigands": "Oxytocin",
      "description": "Uterine contraction, milk ejection and central neural modulation.",
      "activation": "Can contract uterus and mammary myoepithelial cells; social effects are not universal.",
      "blockade": "Can inhibit oxytocin-mediated contraction; whole-body outcomes depend on exposure.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "OXTR"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: OXTR",
          "url": "https://www.ncbi.nlm.nih.gov/gene/5021",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "AVPR2",
      "name": "Vasopressin V2 receptor",
      "family": "Vasopressin and oxytocin",
      "kind": "GPCR",
      "genes": [
        "AVPR2"
      ],
      "aliases": [
        "ADHR",
        "DI1",
        "DIR",
        "DIR3",
        "NDI",
        "NDI1",
        "V2R"
      ],
      "mechanism": "Gs; increases renal cAMP",
      "endogenousLigands": "Vasopressin",
      "description": "Renal collecting-duct water reabsorption.",
      "activation": "Can increase aquaporin-2 trafficking and water retention.",
      "blockade": "Can increase free-water excretion; sodium disturbances can occur.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "AVPR2"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: AVPR2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/554",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "AGTR1",
      "name": "Angiotensin AT1 receptor",
      "family": "Angiotensin",
      "kind": "GPCR",
      "genes": [
        "AGTR1"
      ],
      "aliases": [
        "AG2S",
        "AGTR1B",
        "AT1",
        "AT1AR",
        "AT1B",
        "AT1BR",
        "AT1R",
        "AT2R1",
        "ATR1",
        "HAT1R"
      ],
      "mechanism": "Predominantly Gq/11; calcium and additional signalling pathways",
      "endogenousLigands": "Angiotensin II",
      "description": "Vascular constriction, aldosterone signalling and fluid-pressure regulation.",
      "activation": "Can increase vascular resistance and support sodium retention.",
      "blockade": "Can reduce AT1 responses; hypotension, potassium changes and renal effects can occur.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "AGTR1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: AGTR1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/185",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "AGTR2",
      "name": "Angiotensin AT2 receptor",
      "family": "Angiotensin",
      "kind": "GPCR",
      "genes": [
        "AGTR2"
      ],
      "aliases": [
        "AT2",
        "ATGR2",
        "MRX88"
      ],
      "mechanism": "Context-dependent noncanonical signalling, including phosphatases and nitric-oxide-linked responses",
      "endogenousLigands": "Angiotensin II",
      "description": "Developmental and adult tissue-response signalling.",
      "activation": "Can support vasodilatory and tissue-remodelling responses in some systems.",
      "blockade": "Blocks AT2 signalling; effects should not be equated with AT1 blockade.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "AGTR2"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: AGTR2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/186",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "BDKRB1",
      "name": "Bradykinin B1 receptor",
      "family": "Bradykinin",
      "kind": "GPCR",
      "genes": [
        "BDKRB1"
      ],
      "aliases": [
        "B1BKR",
        "B1R",
        "BKB1R",
        "BKR1",
        "BRADYB1"
      ],
      "mechanism": "Predominantly Gq/11",
      "endogenousLigands": "Des-Arg metabolites of bradykinin and kallidin",
      "description": "Often induced during inflammation; responds to des-Arg kinins.",
      "activation": "Can promote inflammatory pain and vascular responses.",
      "blockade": "Can reduce B1-mediated responses; clinical effects remain context dependent.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "BDKRB1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: BDKRB1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/623",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "BDKRB2",
      "name": "Bradykinin B2 receptor",
      "family": "Bradykinin",
      "kind": "GPCR",
      "genes": [
        "BDKRB2"
      ],
      "aliases": [
        "B2R",
        "BK-2",
        "BK2",
        "BKR2",
        "BRB2"
      ],
      "mechanism": "Predominantly Gq/11",
      "endogenousLigands": "Bradykinin and kallidin",
      "description": "Constitutive endothelial, sensory and smooth-muscle kinin signalling.",
      "activation": "Can promote vascular dilation, permeability and pain.",
      "blockade": "Can reduce bradykinin-mediated oedema and other B2 responses.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "BDKRB2"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: BDKRB2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/624",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "EDNRA",
      "name": "Endothelin ETA receptor",
      "family": "Endothelin",
      "kind": "GPCR",
      "genes": [
        "EDNRA"
      ],
      "aliases": [
        "ET-A",
        "ETA",
        "ETA-R",
        "ETAR",
        "ETRA",
        "MFDA",
        "hET-AR"
      ],
      "mechanism": "Predominantly Gq/11",
      "endogenousLigands": "Endothelin peptides",
      "description": "Vascular smooth-muscle contraction and growth signalling.",
      "activation": "Can raise vascular resistance and promote proliferative responses.",
      "blockade": "Can reduce ETA-mediated vasoconstriction; systemic effects depend on exposure.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "EDNRA"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: EDNRA",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1909",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "EDNRB",
      "name": "Endothelin ETB receptor",
      "family": "Endothelin",
      "kind": "GPCR",
      "genes": [
        "EDNRB"
      ],
      "aliases": [
        "ABCDS",
        "ET-B",
        "ET-BR",
        "ETB",
        "ETB1",
        "ETBR",
        "ETRB",
        "HSCR",
        "HSCR2",
        "WS4A"
      ],
      "mechanism": "Predominantly Gq/11",
      "endogenousLigands": "Endothelin peptides",
      "description": "Endothelial clearance and dilation, plus smooth-muscle effects.",
      "activation": "Can promote endothelial nitric oxide release or smooth-muscle contraction depending on cell type.",
      "blockade": "Can block both protective endothelial and contractile responses; not uniformly vasodilating.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "EDNRB"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: EDNRB",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1910",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "CYSLTR1",
      "name": "Cysteinyl leukotriene CysLT1 receptor",
      "family": "Leukotriene",
      "kind": "GPCR",
      "genes": [
        "CYSLTR1"
      ],
      "aliases": [
        "CYSLT1",
        "CYSLT1R",
        "CYSLTR",
        "HMTMF81"
      ],
      "mechanism": "Predominantly Gq and/or Gi pathways",
      "endogenousLigands": "LTD4 and other cysteinyl leukotrienes",
      "description": "Leukotriene-driven airway and inflammatory responses.",
      "activation": "Can contract airways and promote inflammatory responses.",
      "blockade": "Can reduce cysteinyl-leukotriene-mediated bronchoconstriction.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "CYSLTR1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: CYSLTR1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/10800",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "CYSLTR2",
      "name": "Cysteinyl leukotriene CysLT2 receptor",
      "family": "Leukotriene",
      "kind": "GPCR",
      "genes": [
        "CYSLTR2"
      ],
      "aliases": [
        "CYSLT2",
        "CYSLT2R",
        "GPCR21",
        "HG57",
        "HPN321",
        "KPG_011",
        "PSEC0146",
        "hGPCR21"
      ],
      "mechanism": "Predominantly Gq and/or Gi pathways",
      "endogenousLigands": "LTC4 and LTD4",
      "description": "Vascular permeability and inflammatory signalling.",
      "activation": "Can increase vascular permeability and alter tissue responses.",
      "blockade": "Can oppose CysLT2 responses; clinical effects are less established than CysLT1 blockade.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "CYSLTR2"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: CYSLTR2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/57105",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "LTB4R",
      "name": "Leukotriene BLT1 receptor",
      "family": "Leukotriene",
      "kind": "GPCR",
      "genes": [
        "LTB4R"
      ],
      "aliases": [
        "BLT1",
        "BLTR",
        "CMKRL1",
        "GPR16",
        "LTB4R1",
        "LTBR1",
        "P2RY7",
        "P2Y7"
      ],
      "mechanism": "Predominantly Gq and/or Gi pathways",
      "endogenousLigands": "Leukotriene B4",
      "description": "High-affinity leukotriene B4 signalling in leukocyte recruitment.",
      "activation": "Can promote leukocyte migration and activation.",
      "blockade": "Can reduce BLT1-driven recruitment; infection and inflammation context matters.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "LTB4R"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: LTB4R",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1241",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "LTB4R2",
      "name": "Leukotriene BLT2 receptor",
      "family": "Leukotriene",
      "kind": "GPCR",
      "genes": [
        "LTB4R2"
      ],
      "aliases": [
        "BLT2",
        "BLTR2",
        "JULF2",
        "KPG_004",
        "LTB4-R 2",
        "LTB4-R2",
        "NOP9"
      ],
      "mechanism": "Predominantly Gq and/or Gi pathways",
      "endogenousLigands": "12-HHT and leukotriene B4; assay-dependent preference",
      "description": "Lipid-mediated inflammatory and epithelial responses.",
      "activation": "Can modify inflammatory and barrier signalling.",
      "blockade": "Can block BLT2 responses; a uniform anti-inflammatory effect cannot be assumed.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "LTB4R2"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: LTB4R2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/56413",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "GRM1",
      "name": "Metabotropic glutamate mGlu1 receptor",
      "family": "Metabotropic glutamate group I",
      "kind": "GPCR",
      "genes": [
        "GRM1"
      ],
      "aliases": [
        "GPRC1A",
        "MGLU1",
        "MGLUR1",
        "PPP1R85",
        "SCA44",
        "SCAR13"
      ],
      "mechanism": "Gq/11; phospholipase C and calcium",
      "endogenousLigands": "Glutamate",
      "description": "Postsynaptic neuronal modulation and synaptic plasticity.",
      "activation": "Can enhance calcium-linked neuronal responses.",
      "blockade": "Can reduce mGlu1-mediated modulation; motor and sensory effects depend on location.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "GRM1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: GRM1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2911",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "GRM5",
      "name": "Metabotropic glutamate mGlu5 receptor",
      "family": "Metabotropic glutamate group I",
      "kind": "GPCR",
      "genes": [
        "GRM5"
      ],
      "aliases": [
        "GPRC1E",
        "MGLUR5",
        "PPP1R86",
        "mGlu5"
      ],
      "mechanism": "Gq/11; phospholipase C and calcium",
      "endogenousLigands": "Glutamate",
      "description": "Postsynaptic modulation, plasticity and interaction with other receptors.",
      "activation": "Can amplify glutamate-linked signalling in suitable circuits.",
      "blockade": "Can reduce mGlu5 responses; cognitive and behavioural outcomes are not predictable from binding alone.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "GRM5"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: GRM5",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2915",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "GRM2",
      "name": "Metabotropic glutamate mGlu2 receptor",
      "family": "Metabotropic glutamate group II/III",
      "kind": "GPCR",
      "genes": [
        "GRM2"
      ],
      "aliases": [
        "GLUR2",
        "GPRC1B",
        "MGLUR2",
        "mGlu2"
      ],
      "mechanism": "Gi/o; often inhibits presynaptic release",
      "endogenousLigands": "Glutamate",
      "description": "Presynaptic glutamatergic feedback.",
      "activation": "Can reduce transmitter release in relevant synapses.",
      "blockade": "Can remove inhibitory glutamate feedback.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "GRM2"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: GRM2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2912",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "GRM3",
      "name": "Metabotropic glutamate mGlu3 receptor",
      "family": "Metabotropic glutamate group II/III",
      "kind": "GPCR",
      "genes": [
        "GRM3"
      ],
      "aliases": [
        "GLUR3",
        "GPRC1C",
        "MGLUR3",
        "mGlu3"
      ],
      "mechanism": "Gi/o; often inhibits presynaptic release",
      "endogenousLigands": "Glutamate",
      "description": "Neuronal and glial modulation of glutamate signalling.",
      "activation": "Can regulate release and glial responses.",
      "blockade": "Can block mGlu3 responses; neuronal and glial consequences differ.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "GRM3"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: GRM3",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2913",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "GRM4",
      "name": "Metabotropic glutamate mGlu4 receptor",
      "family": "Metabotropic glutamate group II/III",
      "kind": "GPCR",
      "genes": [
        "GRM4"
      ],
      "aliases": [
        "GPRC1D",
        "MGLUR4",
        "mGlu4"
      ],
      "mechanism": "Gi/o; often inhibits presynaptic release",
      "endogenousLigands": "Glutamate",
      "description": "Presynaptic regulation in motor and other circuits.",
      "activation": "Can inhibit transmitter release.",
      "blockade": "Can remove mGlu4-mediated inhibitory modulation.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "GRM4"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: GRM4",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2914",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "GRM6",
      "name": "Metabotropic glutamate mGlu6 receptor",
      "family": "Metabotropic glutamate group II/III",
      "kind": "GPCR",
      "genes": [
        "GRM6"
      ],
      "aliases": [
        "CSNB1B",
        "GPRC1F",
        "MGLUR6",
        "mGlu6"
      ],
      "mechanism": "Gi/o; often inhibits presynaptic release",
      "endogenousLigands": "Glutamate",
      "description": "Retinal ON-bipolar-cell signalling.",
      "activation": "Can close downstream TRPM1 channels through the retinal signalling cascade.",
      "blockade": "Can disrupt ON-pathway transmission; not a generic CNS glutamate effect.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "GRM6"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: GRM6",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2916",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "GRM7",
      "name": "Metabotropic glutamate mGlu7 receptor",
      "family": "Metabotropic glutamate group II/III",
      "kind": "GPCR",
      "genes": [
        "GRM7"
      ],
      "aliases": [
        "GLUR7",
        "GPRC1G",
        "MGLU7",
        "MGLUR7",
        "NEDSHBA",
        "PPP1R87"
      ],
      "mechanism": "Gi/o; often inhibits presynaptic release",
      "endogenousLigands": "Glutamate",
      "description": "Presynaptic glutamate sensing and release regulation.",
      "activation": "Can restrain release at active synapses; context matters.",
      "blockade": "Can remove mGlu7-mediated feedback.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "GRM7"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: GRM7",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2917",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "GRM8",
      "name": "Metabotropic glutamate mGlu8 receptor",
      "family": "Metabotropic glutamate group II/III",
      "kind": "GPCR",
      "genes": [
        "GRM8"
      ],
      "aliases": [
        "GLUR8",
        "GPRC1H",
        "MGLUR8",
        "mGlu8"
      ],
      "mechanism": "Gi/o; often inhibits presynaptic release",
      "endogenousLigands": "Glutamate",
      "description": "Presynaptic inhibitory modulation.",
      "activation": "Can reduce transmitter release in relevant pathways.",
      "blockade": "Can remove mGlu8-mediated inhibitory control.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "GRM8"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: GRM8",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2918",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "P2RY1",
      "name": "P2Y1 receptor",
      "family": "P2Y purinergic",
      "kind": "GPCR",
      "genes": [
        "P2RY1"
      ],
      "aliases": [
        "P2Y1",
        "SARCC"
      ],
      "mechanism": "Predominantly Gq; P2Y11 additionally Gs",
      "endogenousLigands": "ADP",
      "description": "ADP-sensitive signalling including platelet activation.",
      "activation": "Can initiate platelet shape change and aggregation-related signalling.",
      "blockade": "Can reduce the P2Y1 component of platelet responses.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "P2RY1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: P2RY1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/5028",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "P2RY2",
      "name": "P2Y2 receptor",
      "family": "P2Y purinergic",
      "kind": "GPCR",
      "genes": [
        "P2RY2"
      ],
      "aliases": [
        "HP2U",
        "P2RU1",
        "P2U",
        "P2U1",
        "P2UR",
        "P2Y2",
        "P2Y2R"
      ],
      "mechanism": "Predominantly Gq; P2Y11 additionally Gs",
      "endogenousLigands": "ATP and UTP",
      "description": "ATP/UTP-sensitive epithelial and inflammatory signalling.",
      "activation": "Can support epithelial secretion and other calcium responses.",
      "blockade": "Can reduce P2Y2-mediated responses; organ effects vary.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "P2RY2"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: P2RY2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/5029",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "P2RY4",
      "name": "P2Y4 receptor",
      "family": "P2Y purinergic",
      "kind": "GPCR",
      "genes": [
        "P2RY4"
      ],
      "aliases": [
        "NRU",
        "P2P",
        "P2Y4",
        "UNR"
      ],
      "mechanism": "Predominantly Gq; P2Y11 additionally Gs",
      "endogenousLigands": "UTP in human systems",
      "description": "UTP-sensitive signalling in epithelial and other tissues.",
      "activation": "Can alter secretion and smooth-muscle responses.",
      "blockade": "Blocks P2Y4 signalling; nucleotide pharmacology differs by species.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "P2RY4"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: P2RY4",
          "url": "https://www.ncbi.nlm.nih.gov/gene/5030",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "P2RY6",
      "name": "P2Y6 receptor",
      "family": "P2Y purinergic",
      "kind": "GPCR",
      "genes": [
        "P2RY6"
      ],
      "aliases": [
        "P2Y6"
      ],
      "mechanism": "Predominantly Gq; P2Y11 additionally Gs",
      "endogenousLigands": "UDP",
      "description": "UDP-sensitive immune and tissue-response signalling.",
      "activation": "Can modify inflammatory-cell and smooth-muscle responses.",
      "blockade": "Can reduce P2Y6 responses; whole-body inflammatory outcomes vary.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "P2RY6"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: P2RY6",
          "url": "https://www.ncbi.nlm.nih.gov/gene/5031",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "P2RY11",
      "name": "P2Y11 receptor",
      "family": "P2Y purinergic",
      "kind": "GPCR",
      "genes": [
        "P2RY11"
      ],
      "aliases": [
        "P2Y11"
      ],
      "mechanism": "Predominantly Gq; P2Y11 additionally Gs",
      "endogenousLigands": "ATP",
      "description": "ATP-sensitive cAMP and calcium signalling, including immune cells.",
      "activation": "Can activate both Gs and Gq-linked responses.",
      "blockade": "Blocks P2Y11 responses; translation from rodent models is limited by species differences.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "P2RY11"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: P2RY11",
          "url": "https://www.ncbi.nlm.nih.gov/gene/5032",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "P2RY12",
      "name": "P2Y12 receptor",
      "family": "P2Y purinergic",
      "kind": "GPCR",
      "genes": [
        "P2RY12"
      ],
      "aliases": [
        "ADPG-R",
        "BDPLT8",
        "HORK3",
        "P2T(AC)",
        "P2Y(12)R",
        "P2Y(AC)",
        "P2Y(ADP)",
        "P2Y(cyc)",
        "P2Y12",
        "SP1999"
      ],
      "mechanism": "Predominantly Gi/o",
      "endogenousLigands": "ADP",
      "description": "ADP-sensitive platelet aggregation and microglial signalling.",
      "activation": "Can reinforce platelet aggregation.",
      "blockade": "Can reduce platelet aggregation and increase bleeding risk.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "P2RY12"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: P2RY12",
          "url": "https://www.ncbi.nlm.nih.gov/gene/64805",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "P2RY13",
      "name": "P2Y13 receptor",
      "family": "P2Y purinergic",
      "kind": "GPCR",
      "genes": [
        "P2RY13"
      ],
      "aliases": [
        "FKSG77",
        "GPCR1",
        "GPR86",
        "GPR94",
        "P2Y13",
        "SP174"
      ],
      "mechanism": "Predominantly Gi/o",
      "endogenousLigands": "ADP",
      "description": "ADP-sensitive signalling in several tissues.",
      "activation": "Can inhibit cAMP and change cellular responses.",
      "blockade": "Blocks P2Y13 responses; selective clinical effects remain uncertain.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "P2RY13"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: P2RY13",
          "url": "https://www.ncbi.nlm.nih.gov/gene/53829",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "P2RY14",
      "name": "P2Y14 receptor",
      "family": "P2Y purinergic",
      "kind": "GPCR",
      "genes": [
        "P2RY14"
      ],
      "aliases": [
        "BPR105",
        "GPR105",
        "P2Y14"
      ],
      "mechanism": "Predominantly Gi/o",
      "endogenousLigands": "UDP and UDP-sugars",
      "description": "UDP-sugar-sensitive inflammatory and metabolic signalling.",
      "activation": "Can modify immune-cell recruitment and responses.",
      "blockade": "Can reduce P2Y14 responses; clinical implications remain under investigation.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "P2RY14"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: P2RY14",
          "url": "https://www.ncbi.nlm.nih.gov/gene/9934",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "P2RX1",
      "name": "P2X1-containing receptor",
      "family": "P2X purinergic",
      "kind": "Ligand-gated ion channel",
      "genes": [
        "P2RX1"
      ],
      "aliases": [
        "P2X1"
      ],
      "mechanism": "ATP-gated cation channel; assembly-dependent",
      "endogenousLigands": "ATP",
      "description": "Rapid purinergic transmission in smooth muscle and platelets.",
      "activation": "Opens cation channels and can promote contraction or platelet responses.",
      "blockade": "Can reduce P2X1-mediated currents and associated responses.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "P2RX1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: P2RX1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/5023",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "P2RX2",
      "name": "P2X2-containing receptor",
      "family": "P2X purinergic",
      "kind": "Ligand-gated ion channel",
      "genes": [
        "P2RX2"
      ],
      "aliases": [
        "DFNA41",
        "P2X2"
      ],
      "mechanism": "ATP-gated cation channel; assembly-dependent",
      "endogenousLigands": "ATP",
      "description": "Purinergic neuronal and sensory transmission.",
      "activation": "Opens cation channels; response depends on subunit assembly.",
      "blockade": "Can reduce P2X2-containing channel currents.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "P2RX2"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: P2RX2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/22953",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "P2RX3",
      "name": "P2X3-containing receptor",
      "family": "P2X purinergic",
      "kind": "Ligand-gated ion channel",
      "genes": [
        "P2RX3"
      ],
      "aliases": [
        "P2X3"
      ],
      "mechanism": "ATP-gated cation channel; assembly-dependent",
      "endogenousLigands": "ATP",
      "description": "Sensory afferent signalling, including cough and nociception.",
      "activation": "Can excite sensory nerves.",
      "blockade": "Can reduce receptor-mediated sensory responses; taste effects depend on selectivity.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "P2RX3"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: P2RX3",
          "url": "https://www.ncbi.nlm.nih.gov/gene/5024",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "P2RX4",
      "name": "P2X4-containing receptor",
      "family": "P2X purinergic",
      "kind": "Ligand-gated ion channel",
      "genes": [
        "P2RX4"
      ],
      "aliases": [
        "P2X4",
        "P2X4R"
      ],
      "mechanism": "ATP-gated cation channel; assembly-dependent",
      "endogenousLigands": "ATP",
      "description": "Neural, immune and endothelial ATP sensing.",
      "activation": "Can change cation influx and inflammatory or vascular responses.",
      "blockade": "Can reduce P2X4-mediated responses; cellular context matters.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "P2RX4"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: P2RX4",
          "url": "https://www.ncbi.nlm.nih.gov/gene/5025",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "P2RX5",
      "name": "P2X5-containing receptor",
      "family": "P2X purinergic",
      "kind": "Ligand-gated ion channel",
      "genes": [
        "P2RX5"
      ],
      "aliases": [
        "LRH-1",
        "P2X5",
        "P2X5R"
      ],
      "mechanism": "ATP-gated cation channel; assembly-dependent",
      "endogenousLigands": "ATP",
      "description": "ATP-gated signalling with human splice-variant constraints.",
      "activation": "Channel function depends on sequence and assembly; no uniform organism effect is established.",
      "blockade": "Blocks functional P2X5 responses when present; variant context must be specified.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "P2RX5"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: P2RX5",
          "url": "https://www.ncbi.nlm.nih.gov/gene/5026",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "Human P2X5 variant functional study (2010)",
          "url": "https://pubmed.ncbi.nlm.nih.gov/20223879/",
          "scope": "Primary experimental evidence for the stated subunit/variant constraint; does not establish a response for every ligand or species.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "P2RX6",
      "name": "P2X6-containing receptor",
      "family": "P2X purinergic",
      "kind": "Ligand-gated ion channel",
      "genes": [
        "P2RX6"
      ],
      "aliases": [
        "P2RXL1",
        "P2X6",
        "P2XM"
      ],
      "mechanism": "ATP-gated cation channel; assembly-dependent",
      "endogenousLigands": "ATP",
      "description": "Subunit contributing mainly to heteromeric purinergic channels.",
      "activation": "Function depends on assembly with other P2X subunits.",
      "blockade": "Must be interpreted at the assembled-channel level, not from the subunit alone.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "P2RX6"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: P2RX6",
          "url": "https://www.ncbi.nlm.nih.gov/gene/9127",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "P2X6 assembly study (2006)",
          "url": "https://pubmed.ncbi.nlm.nih.gov/16452399/",
          "scope": "Primary experimental evidence for the stated subunit/variant constraint; does not establish a response for every ligand or species.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "P2RX7",
      "name": "P2X7 receptor",
      "family": "P2X purinergic",
      "kind": "Ligand-gated ion channel",
      "genes": [
        "P2RX7"
      ],
      "aliases": [
        "P2X7"
      ],
      "mechanism": "ATP-gated cation channel; assembly-dependent",
      "endogenousLigands": "ATP",
      "description": "Immune-cell ATP sensing at relatively high extracellular ATP.",
      "activation": "Can promote inflammatory mediator release and prolonged permeability changes.",
      "blockade": "Can reduce P2X7-mediated inflammatory responses; disease context and host defence matter.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "P2RX7"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: P2RX7",
          "url": "https://www.ncbi.nlm.nih.gov/gene/5027",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "Reactome: ATP binding to P2X7",
          "url": "https://reactome.org/content/detail/R-HSA-877178",
          "scope": "ATP-gated cation-channel and permeability-response context.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "GLP1R",
      "name": "GLP-1 receptor",
      "family": "Peptide metabolic",
      "kind": "GPCR",
      "genes": [
        "GLP1R"
      ],
      "aliases": [
        "GLP-1",
        "GLP-1-R",
        "GLP-1R"
      ],
      "mechanism": "Gs; cAMP-linked endocrine signalling",
      "endogenousLigands": "Glucagon-like peptide 1",
      "description": "Glucose-dependent insulin secretion, satiety and gastrointestinal signalling.",
      "activation": "Can support glucose-dependent insulin release and reduce food intake; gastrointestinal effects can occur.",
      "blockade": "Can reduce GLP-1 responses; glycaemic effects depend on physiological state.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "GLP1R"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: GLP1R",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2740",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "GIPR",
      "name": "GIP receptor",
      "family": "Peptide metabolic",
      "kind": "GPCR",
      "genes": [
        "GIPR"
      ],
      "aliases": [
        "PGQTL2"
      ],
      "mechanism": "Gs; cAMP-linked endocrine signalling",
      "endogenousLigands": "Glucose-dependent insulinotropic polypeptide",
      "description": "Glucose-dependent insulin secretion and other metabolic responses.",
      "activation": "Can enhance glucose-dependent insulin secretion.",
      "blockade": "Can reduce GIP-mediated responses; does not establish an overall weight effect.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "GIPR"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: GIPR",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2696",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "GCGR",
      "name": "Glucagon receptor",
      "family": "Peptide metabolic",
      "kind": "GPCR",
      "genes": [
        "GCGR"
      ],
      "aliases": [
        "GGR",
        "GL-R",
        "MVAH"
      ],
      "mechanism": "Gs; cAMP-linked endocrine signalling",
      "endogenousLigands": "Glucagon",
      "description": "Hepatic glucose production and metabolic regulation.",
      "activation": "Can increase hepatic glucose output.",
      "blockade": "Can reduce glucagon-driven glucose production; broader metabolic consequences require assessment.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "GCGR"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: GCGR",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2642",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "GHSR",
      "name": "Ghrelin receptor",
      "family": "Peptide gut and stress",
      "kind": "GPCR",
      "genes": [
        "GHSR"
      ],
      "aliases": [
        "GHDP",
        "GHS-R1a",
        "GHSR-1a"
      ],
      "mechanism": "Predominantly Gq/11; phospholipase C and calcium signalling",
      "endogenousLigands": "Ghrelin (functional GHS-R1a isoform)",
      "description": "Growth-hormone release and feeding-related signalling; can show constitutive activity.",
      "activation": "Can promote growth-hormone secretion and feeding responses.",
      "blockade": "Neutral antagonism and inverse agonism differ when constitutive activity is present.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "GHSR"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: GHSR",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2693",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "CCKAR",
      "name": "Cholecystokinin CCK1 receptor",
      "family": "Peptide gut and stress",
      "kind": "GPCR",
      "genes": [
        "CCKAR"
      ],
      "aliases": [
        "CCK-1R",
        "CCK-A",
        "CCK1-R",
        "CCK1R",
        "CCKRA"
      ],
      "mechanism": "Predominantly Gq/11; phospholipase C and calcium signalling",
      "endogenousLigands": "Cholecystokinin",
      "description": "Gallbladder contraction, digestive secretion and satiety signalling.",
      "activation": "Can contract gallbladder and support satiety responses.",
      "blockade": "Can reduce CCK1-mediated digestive and satiety responses.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "CCKAR"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: CCKAR",
          "url": "https://www.ncbi.nlm.nih.gov/gene/886",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "CCKBR",
      "name": "Cholecystokinin CCK2 receptor",
      "family": "Peptide gut and stress",
      "kind": "GPCR",
      "genes": [
        "CCKBR"
      ],
      "aliases": [
        "CCK-2R",
        "CCK-B",
        "CCK2R",
        "GASR"
      ],
      "mechanism": "Predominantly Gq/11; phospholipase C and calcium signalling",
      "endogenousLigands": "Gastrin and cholecystokinin",
      "description": "Gastrin-sensitive gastric acid regulation and central CCK signalling.",
      "activation": "Can stimulate gastric acid-related pathways.",
      "blockade": "Can reduce CCK2-mediated responses; central and gastric actions differ.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "CCKBR"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: CCKBR",
          "url": "https://www.ncbi.nlm.nih.gov/gene/887",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "CRHR1",
      "name": "Corticotropin-releasing factor CRF1 receptor",
      "family": "Peptide gut and stress",
      "kind": "GPCR",
      "genes": [
        "CRHR1"
      ],
      "aliases": [
        "CRF-R",
        "CRF-R-1",
        "CRF-R1",
        "CRF1",
        "CRFR-1",
        "CRFR1",
        "CRH-R-1",
        "CRH-R1",
        "CRHR",
        "CRHR1L"
      ],
      "mechanism": "Predominantly Gs; adenylyl cyclase and cAMP signalling",
      "endogenousLigands": "Corticotropin-releasing hormone and urocortin 1",
      "description": "Pituitary and central stress-axis signalling.",
      "activation": "Can support ACTH release and stress-related responses.",
      "blockade": "Can reduce CRF1 responses; clinical stress outcomes are not guaranteed.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "CRHR1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: CRHR1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1394",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "CRHR2",
      "name": "Corticotropin-releasing factor CRF2 receptor",
      "family": "Peptide gut and stress",
      "kind": "GPCR",
      "genes": [
        "CRHR2"
      ],
      "aliases": [
        "CRF-RB",
        "CRF2",
        "CRFR2",
        "HM-CRF"
      ],
      "mechanism": "Predominantly Gs; adenylyl cyclase and cAMP signalling",
      "endogenousLigands": "Urocortins; subtype- and assay-dependent",
      "description": "Urocortin-sensitive central and peripheral stress signalling.",
      "activation": "Can alter stress, cardiovascular and feeding responses.",
      "blockade": "Blocks CRF2 responses; effects are tissue- and ligand-dependent.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "CRHR2"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: CRHR2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1395",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "CCR2",
      "name": "Chemokine CCR2 receptor",
      "family": "Chemokine",
      "kind": "GPCR",
      "genes": [
        "CCR2"
      ],
      "aliases": [
        "CC-CKR-2",
        "CCR-2",
        "CCR2A",
        "CCR2B",
        "CD192",
        "CKR2",
        "CKR2A",
        "CKR2B",
        "CMKBR2",
        "MCP-1-R",
        "PCLUD"
      ],
      "mechanism": "Predominantly Gi/o; cell migration pathways",
      "endogenousLigands": "CCL2 and other receptor-active chemokines",
      "description": "Chemokine-directed monocyte recruitment.",
      "activation": "Can guide cell migration and inflammatory recruitment.",
      "blockade": "Can reduce CCR2-mediated recruitment; host defence context matters.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "CCR2"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: CCR2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/729230",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "CCR5",
      "name": "Chemokine CCR5 receptor",
      "family": "Chemokine",
      "kind": "GPCR",
      "genes": [
        "CCR5"
      ],
      "aliases": [
        "CC-CKR-5",
        "CCCKR5",
        "CCR-5",
        "CD195",
        "CKR-5",
        "CKR5",
        "CMKBR5",
        "IDDM22"
      ],
      "mechanism": "Predominantly Gi/o; cell migration pathways",
      "endogenousLigands": "CCL3, CCL4 and CCL5",
      "description": "Immune-cell trafficking; also an HIV entry co-receptor.",
      "activation": "Can promote chemokine responses; viral entry is a distinct co-receptor process.",
      "blockade": "Can reduce chemokine responses; some antagonists also prevent CCR5-dependent viral entry.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "CCR5"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: CCR5",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1234",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "CXCR3",
      "name": "Chemokine CXCR3 receptor",
      "family": "Chemokine",
      "kind": "GPCR",
      "genes": [
        "CXCR3"
      ],
      "aliases": [
        "CD182",
        "CD183",
        "CKR-L2",
        "CMKAR3",
        "GPR9",
        "IP10-R",
        "Mig-R",
        "MigR"
      ],
      "mechanism": "Predominantly Gi/o; cell migration pathways",
      "endogenousLigands": "CXCL9, CXCL10 and CXCL11",
      "description": "Activated lymphocyte trafficking.",
      "activation": "Can promote chemotaxis in responsive immune cells.",
      "blockade": "Can reduce CXCR3-driven recruitment; inflammatory outcomes are context dependent.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "CXCR3"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: CXCR3",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2833",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "CXCR4",
      "name": "Chemokine CXCR4 receptor",
      "family": "Chemokine",
      "kind": "GPCR",
      "genes": [
        "CXCR4"
      ],
      "aliases": [
        "CD184",
        "D2S201E",
        "FB22",
        "HM89",
        "HSY3RR",
        "LCR1",
        "LESTR",
        "NPY3R",
        "NPYR",
        "NPYRL",
        "NPYY3R",
        "WHIM",
        "WHIMS",
        "WHIMS1"
      ],
      "mechanism": "Predominantly Gi/o; cell migration pathways",
      "endogenousLigands": "CXCL12",
      "description": "CXCL12-mediated cell retention, migration and developmental signalling.",
      "activation": "Can retain or attract cells along CXCL12 gradients.",
      "blockade": "Can mobilize haematopoietic cells; immune and developmental functions require context.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "CXCR4"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: CXCR4",
          "url": "https://www.ncbi.nlm.nih.gov/gene/7852",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "AR",
      "name": "Androgen receptor",
      "family": "Nuclear steroid",
      "kind": "Nuclear receptor",
      "genes": [
        "AR"
      ],
      "aliases": [
        "AIS",
        "AR8",
        "DHTR",
        "HPCX3",
        "HUMARA",
        "HYSP1",
        "KD",
        "NR3C4",
        "SBMA",
        "SMAX1",
        "TFM"
      ],
      "mechanism": "Ligand-regulated transcription; cofactor- and tissue-dependent",
      "endogenousLigands": "Testosterone and dihydrotestosterone",
      "description": "Androgen-responsive transcription in reproductive, muscle and other tissues.",
      "activation": "Can regulate androgen-dependent growth and differentiation.",
      "blockade": "Can suppress androgen-driven transcription; effects depend on tissue and partial agonism.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "AR"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: AR",
          "url": "https://www.ncbi.nlm.nih.gov/gene/367",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "ESR1",
      "name": "Estrogen receptor alpha",
      "family": "Nuclear steroid",
      "kind": "Nuclear receptor",
      "genes": [
        "ESR1"
      ],
      "aliases": [
        "ER",
        "ESR",
        "ESRA",
        "ESTRR",
        "Era",
        "NR3A1"
      ],
      "mechanism": "Ligand-regulated transcription; cofactor- and tissue-dependent",
      "endogenousLigands": "Oestradiol and other oestrogens",
      "description": "Oestrogen-responsive reproductive, bone and other transcriptional programmes.",
      "activation": "Can change cell growth and tissue function according to cofactors.",
      "blockade": "Can inhibit some oestrogen responses; selective modulators can agonize in other tissues.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "ESR1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: ESR1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2099",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "ESR2",
      "name": "Estrogen receptor beta",
      "family": "Nuclear steroid",
      "kind": "Nuclear receptor",
      "genes": [
        "ESR2"
      ],
      "aliases": [
        "ER-BETA",
        "ESR-BETA",
        "ESRB",
        "ESTRB",
        "Erb",
        "NR3A2",
        "ODG8"
      ],
      "mechanism": "Ligand-regulated transcription; cofactor- and tissue-dependent",
      "endogenousLigands": "Oestradiol and other oestrogens",
      "description": "Oestrogen-responsive transcription with distribution and functions distinct from ER-alpha.",
      "activation": "Can change tissue-specific transcription; cannot be treated as identical to ER-alpha.",
      "blockade": "Can block ER-beta responses; selective human outcomes require evidence.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "ESR2"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: ESR2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2100",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "PGR",
      "name": "Progesterone receptor",
      "family": "Nuclear steroid",
      "kind": "Nuclear receptor",
      "genes": [
        "PGR"
      ],
      "aliases": [
        "NR3C3",
        "PR"
      ],
      "mechanism": "Ligand-regulated transcription; cofactor- and tissue-dependent",
      "endogenousLigands": "Progesterone",
      "description": "Progesterone-responsive reproductive and other transcriptional regulation.",
      "activation": "Can support progesterone-responsive endometrial and reproductive programmes.",
      "blockade": "Can disrupt progesterone-dependent reproductive responses.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "PGR"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: PGR",
          "url": "https://www.ncbi.nlm.nih.gov/gene/5241",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "NR3C1",
      "name": "Glucocorticoid receptor",
      "family": "Nuclear steroid",
      "kind": "Nuclear receptor",
      "genes": [
        "NR3C1"
      ],
      "aliases": [
        "GCCR",
        "GCR",
        "GCRST",
        "GR",
        "GRL"
      ],
      "mechanism": "Ligand-regulated transcription; cofactor- and tissue-dependent",
      "endogenousLigands": "Cortisol and other glucocorticoids",
      "description": "Stress-hormone regulation of metabolism and immune transcription.",
      "activation": "Can suppress some inflammatory pathways while changing metabolic and endocrine function.",
      "blockade": "Can oppose glucocorticoid responses; endocrine feedback and context matter.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "NR3C1"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: NR3C1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2908",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "NR3C2",
      "name": "Mineralocorticoid receptor",
      "family": "Nuclear steroid",
      "kind": "Nuclear receptor",
      "genes": [
        "NR3C2"
      ],
      "aliases": [
        "MCR",
        "MLR",
        "MR",
        "NR3C2VIT"
      ],
      "mechanism": "Ligand-regulated transcription; cofactor- and tissue-dependent",
      "endogenousLigands": "Aldosterone and cortisol; tissue enzymes influence access",
      "description": "Salt balance and cardiovascular tissue responses.",
      "activation": "Can promote renal sodium retention and potassium loss.",
      "blockade": "Can reduce sodium-retaining responses; potassium can rise.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "NR3C2"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: NR3C2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/4306",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "PPARA",
      "name": "PPAR-alpha",
      "family": "Nuclear metabolic",
      "kind": "Nuclear receptor",
      "genes": [
        "PPARA"
      ],
      "aliases": [
        "NR1C1",
        "PPAR",
        "PPAR-alpha",
        "PPARalpha",
        "hPPAR"
      ],
      "mechanism": "Ligand-regulated transcription",
      "endogenousLigands": "Endogenous lipid mediators and fatty acids; ligand-dependent",
      "description": "Transcriptional regulation of fatty-acid metabolism.",
      "activation": "Can increase fatty-acid oxidation programmes.",
      "blockade": "Can reduce PPAR-alpha transcriptional responses.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "PPARA"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: PPARA",
          "url": "https://www.ncbi.nlm.nih.gov/gene/5465",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "PPARD",
      "name": "PPAR-delta",
      "family": "Nuclear metabolic",
      "kind": "Nuclear receptor",
      "genes": [
        "PPARD"
      ],
      "aliases": [
        "FAAR",
        "NR1C2",
        "NUC1",
        "NUCI",
        "NUCII",
        "PPARB"
      ],
      "mechanism": "Ligand-regulated transcription",
      "endogenousLigands": "Fatty acids and lipid-derived mediators",
      "description": "Lipid utilisation and metabolic transcription across tissues.",
      "activation": "Can alter oxidative metabolic programmes.",
      "blockade": "Can oppose these transcriptional responses; clinical effects remain context dependent.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "PPARD"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: PPARD",
          "url": "https://www.ncbi.nlm.nih.gov/gene/5467",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "PPARG",
      "name": "PPAR-gamma",
      "family": "Nuclear metabolic",
      "kind": "Nuclear receptor",
      "genes": [
        "PPARG"
      ],
      "aliases": [
        "CIMT1",
        "FPLD3",
        "GLM1",
        "NR1C3",
        "PPARG1",
        "PPARG2",
        "PPARG5",
        "PPARgamma"
      ],
      "mechanism": "Ligand-regulated transcription",
      "endogenousLigands": "Lipid-derived ligands; endogenous physiological ligand assignments are context dependent",
      "description": "Adipocyte differentiation and insulin-sensitivity-related transcription.",
      "activation": "Can enhance insulin-sensitizing programmes; fluid retention can occur.",
      "blockade": "Can oppose PPAR-gamma responses; no uniform glycaemic outcome can be assumed.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "PPARG"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: PPARG",
          "url": "https://www.ncbi.nlm.nih.gov/gene/5468",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "RARA",
      "name": "Retinoic acid receptor alpha",
      "family": "Nuclear metabolic",
      "kind": "Nuclear receptor",
      "genes": [
        "RARA"
      ],
      "aliases": [
        "NR1B1",
        "RAR",
        "RARalpha"
      ],
      "mechanism": "Ligand-regulated transcription",
      "endogenousLigands": "Retinoic acids",
      "description": "Retinoid-dependent differentiation and developmental transcription.",
      "activation": "Can alter differentiation programmes.",
      "blockade": "Can disrupt retinoid-driven transcription; developmental context is important.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "RARA"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: RARA",
          "url": "https://www.ncbi.nlm.nih.gov/gene/5914",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "RARB",
      "name": "Retinoic acid receptor beta",
      "family": "Nuclear metabolic",
      "kind": "Nuclear receptor",
      "genes": [
        "RARB"
      ],
      "aliases": [
        "HAP",
        "MCOPS12",
        "NR1B2",
        "RARbeta",
        "RARbeta1",
        "RRB2"
      ],
      "mechanism": "Ligand-regulated transcription",
      "endogenousLigands": "Retinoic acids",
      "description": "Retinoid-responsive differentiation and growth regulation.",
      "activation": "Can change tissue-specific differentiation programmes.",
      "blockade": "Can oppose RAR-beta responses; effects vary across tissue and disease models.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "RARB"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: RARB",
          "url": "https://www.ncbi.nlm.nih.gov/gene/5915",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "RARG",
      "name": "Retinoic acid receptor gamma",
      "family": "Nuclear metabolic",
      "kind": "Nuclear receptor",
      "genes": [
        "RARG"
      ],
      "aliases": [
        "NR1B3",
        "RARC",
        "RARgamma"
      ],
      "mechanism": "Ligand-regulated transcription",
      "endogenousLigands": "Retinoic acids",
      "description": "Retinoid-responsive epithelial and skeletal programmes.",
      "activation": "Can change differentiation and growth responses.",
      "blockade": "Can oppose RAR-gamma transcriptional activity.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "RARG"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: RARG",
          "url": "https://www.ncbi.nlm.nih.gov/gene/5916",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "VDR",
      "name": "Vitamin D receptor",
      "family": "Nuclear metabolic",
      "kind": "Nuclear receptor",
      "genes": [
        "VDR"
      ],
      "aliases": [
        "NR1I1",
        "PPP1R163"
      ],
      "mechanism": "Ligand-regulated transcription",
      "endogenousLigands": "1,25-dihydroxyvitamin D3",
      "description": "Calcium/phosphate homeostasis and other transcriptional responses.",
      "activation": "Can increase intestinal mineral absorption and regulate other genes.",
      "blockade": "Can oppose vitamin-D-responsive transcription; mineral balance may be affected.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "VDR"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: VDR",
          "url": "https://www.ncbi.nlm.nih.gov/gene/7421",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "THRA",
      "name": "Thyroid hormone receptor alpha",
      "family": "Nuclear metabolic",
      "kind": "Nuclear receptor",
      "genes": [
        "THRA"
      ],
      "aliases": [
        "AR7",
        "CHNG6",
        "EAR7",
        "ERB-T-1",
        "ERBA",
        "ERBA1",
        "NR1A1",
        "THRA1",
        "THRA2",
        "THRalpha",
        "THRalpha1",
        "THRalpha2",
        "TRalpha",
        "TRalpha1",
        "TRalpha2",
        "c-ERBA-1",
        "c-erbA"
      ],
      "mechanism": "Ligand-regulated transcription",
      "endogenousLigands": "Triiodothyronine (T3)",
      "description": "Thyroid-hormone regulation of cardiac, skeletal and other tissues.",
      "activation": "Can change thyroid-responsive transcription and tissue metabolism.",
      "blockade": "Can oppose thyroid-hormone responses in receptor-expressing tissues.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "THRA"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: THRA",
          "url": "https://www.ncbi.nlm.nih.gov/gene/7067",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "THRB",
      "name": "Thyroid hormone receptor beta",
      "family": "Nuclear metabolic",
      "kind": "Nuclear receptor",
      "genes": [
        "THRB"
      ],
      "aliases": [
        "C-ERBA-2",
        "C-ERBA-BETA",
        "ERBA2",
        "GRTH",
        "NR1A2",
        "PRTH",
        "THR1",
        "THRB1",
        "THRB2",
        "THRbeta",
        "THRbeta1",
        "TRb",
        "TRbeta",
        "TRbeta1",
        "Thrbeta2"
      ],
      "mechanism": "Ligand-regulated transcription",
      "endogenousLigands": "Triiodothyronine (T3)",
      "description": "Thyroid-hormone regulation including liver and endocrine feedback.",
      "activation": "Can change metabolic transcription and pituitary feedback.",
      "blockade": "Can oppose TR-beta responses; feedback and tissue selectivity matter.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "THRB"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: THRB",
          "url": "https://www.ncbi.nlm.nih.gov/gene/7068",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "EGFR",
      "name": "EGF receptor",
      "family": "Receptor tyrosine kinase",
      "kind": "Catalytic receptor",
      "genes": [
        "EGFR"
      ],
      "aliases": [
        "ERBB",
        "ERBB1",
        "ERRP",
        "HER1",
        "NISBD2",
        "NNCIS",
        "PIG61",
        "mENA"
      ],
      "mechanism": "Ligand-dependent receptor dimerization/activation and phosphorylation",
      "endogenousLigands": "EGF-family ligands",
      "description": "Epithelial growth, survival and repair signalling.",
      "activation": "Can activate growth and survival pathways; dysregulation can support cancer.",
      "blockade": "Kinase inhibition or receptor blockade can reduce signalling; skin and gut effects can occur.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "EGFR"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: EGFR",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1956",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "ERBB2",
      "name": "HER2/ERBB2 receptor",
      "family": "Receptor tyrosine kinase",
      "kind": "Catalytic receptor",
      "genes": [
        "ERBB2"
      ],
      "aliases": [
        "CD340",
        "HER-2",
        "HER-2/neu",
        "HER2",
        "MLN 19",
        "MLN-19",
        "NEU",
        "NGL",
        "TKR1",
        "VSCN2",
        "c-ERB-2",
        "c-ERB2",
        "p185(erbB2)"
      ],
      "mechanism": "Ligand-dependent receptor dimerization/activation and phosphorylation",
      "endogenousLigands": "No established direct soluble activating ligand; acts as an ERBB dimerization partner",
      "description": "Growth-factor receptor partner with no established direct soluble activating ligand.",
      "activation": "Dimerization with other ERBB receptors can drive growth signalling.",
      "blockade": "Can reduce HER2-driven signalling; this is not ordinary orthosteric antagonism.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "ERBB2"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: ERBB2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2064",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "KDR",
      "name": "VEGFR2 receptor",
      "family": "Receptor tyrosine kinase",
      "kind": "Catalytic receptor",
      "genes": [
        "KDR"
      ],
      "aliases": [
        "CD309",
        "FLK1",
        "VEGFR",
        "VEGFR2"
      ],
      "mechanism": "Ligand-dependent receptor dimerization/activation and phosphorylation",
      "endogenousLigands": "VEGF-family ligands",
      "description": "Vascular endothelial growth-factor signalling and angiogenesis.",
      "activation": "Can promote endothelial growth and vascular permeability.",
      "blockade": "Can inhibit angiogenesis; blood-pressure and wound-healing effects can occur.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "KDR"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: KDR",
          "url": "https://www.ncbi.nlm.nih.gov/gene/3791",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "PDGFRB",
      "name": "PDGF receptor beta",
      "family": "Receptor tyrosine kinase",
      "kind": "Catalytic receptor",
      "genes": [
        "PDGFRB"
      ],
      "aliases": [
        "CD140B",
        "IBGC4",
        "IMF1",
        "JTK12",
        "KOGS",
        "OPDKD",
        "PDGFR",
        "PDGFR-1",
        "PDGFR1",
        "PENTT"
      ],
      "mechanism": "Ligand-dependent receptor dimerization/activation and phosphorylation",
      "endogenousLigands": "PDGF-family ligands",
      "description": "Pericyte, stromal and mesenchymal growth signalling.",
      "activation": "Can promote migration and proliferation in responsive cells.",
      "blockade": "Can reduce PDGF-driven responses; tissue-repair effects require context.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "PDGFRB"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: PDGFRB",
          "url": "https://www.ncbi.nlm.nih.gov/gene/5159",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "KIT",
      "name": "KIT receptor",
      "family": "Receptor tyrosine kinase",
      "kind": "Catalytic receptor",
      "genes": [
        "KIT"
      ],
      "aliases": [
        "C-Kit",
        "CD117",
        "MASTC",
        "PBT",
        "SCFR"
      ],
      "mechanism": "Ligand-dependent receptor dimerization/activation and phosphorylation",
      "endogenousLigands": "Stem cell factor (KIT ligand)",
      "description": "Stem-cell-factor signalling in haematopoietic, pigment and other cells.",
      "activation": "Can support survival and differentiation of responsive cells.",
      "blockade": "Can reduce KIT signalling; normal-cell and mutation-specific effects differ.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "KIT"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: KIT",
          "url": "https://www.ncbi.nlm.nih.gov/gene/3815",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "ALK",
      "name": "ALK receptor",
      "family": "Receptor tyrosine kinase",
      "kind": "Catalytic receptor",
      "genes": [
        "ALK"
      ],
      "aliases": [
        "ALK1",
        "CD246",
        "NBLST3"
      ],
      "mechanism": "Ligand-dependent receptor dimerization/activation and phosphorylation",
      "endogenousLigands": "ALKAL-family ligands",
      "description": "Developmental growth-factor receptor signalling; oncogenic variants can signal independently.",
      "activation": "Can activate growth and survival pathways; mutation and fusion context matter.",
      "blockade": "Kinase inhibition can suppress ALK-driven signalling; resistance variants alter response.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "ALK"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: ALK",
          "url": "https://www.ncbi.nlm.nih.gov/gene/238",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "MET",
      "name": "MET receptor",
      "family": "Receptor tyrosine kinase",
      "kind": "Catalytic receptor",
      "genes": [
        "MET"
      ],
      "aliases": [
        "AUTS9",
        "DA11",
        "DFNB97",
        "HGFR",
        "RCCP2",
        "c-Met"
      ],
      "mechanism": "Ligand-dependent receptor dimerization/activation and phosphorylation",
      "endogenousLigands": "Hepatocyte growth factor",
      "description": "Hepatocyte-growth-factor-mediated motility, growth and repair.",
      "activation": "Can promote cell migration, survival and proliferation.",
      "blockade": "Can reduce HGF/MET responses; normal repair and oncogenic contexts differ.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "MET"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: MET",
          "url": "https://www.ncbi.nlm.nih.gov/gene/4233",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "FLT3",
      "name": "FLT3 receptor",
      "family": "Receptor tyrosine kinase",
      "kind": "Catalytic receptor",
      "genes": [
        "FLT3"
      ],
      "aliases": [
        "CD135",
        "FLK-2",
        "FLK2",
        "STK1"
      ],
      "mechanism": "Ligand-dependent receptor dimerization/activation and phosphorylation",
      "endogenousLigands": "FLT3 ligand",
      "description": "Haematopoietic progenitor growth and differentiation.",
      "activation": "Can support progenitor-cell signalling; activating mutations can drive disease.",
      "blockade": "Can inhibit FLT3-driven signalling; mutation and selectivity affect outcomes.",
      "caution": "Qualitative receptor biology, not a prediction for a supplied molecule. Effects depend on tissue, species, exposure, selectivity and signalling pathway.",
      "targetAliases": [
        "FLT3"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: FLT3",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2322",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "HTR3A",
      "name": "5-HT3 receptors",
      "family": "Serotonin",
      "kind": "Receptor complex",
      "genes": [
        "HTR3A",
        "HTR3B",
        "HTR3C",
        "HTR3D",
        "HTR3E"
      ],
      "aliases": [
        "5-HT-3",
        "5-HT3-E",
        "5-HT3A",
        "5-HT3B",
        "5-HT3E",
        "5-HT3R",
        "5-HT3c1",
        "5HT3D",
        "5HT3R",
        "HTR3"
      ],
      "mechanism": "Ligand-gated cation channel",
      "endogenousLigands": "Serotonin",
      "description": "Fast serotonergic excitation, including emetic and sensory pathways.",
      "activation": "Opening depolarizes responsive cells and can support nausea pathways.",
      "blockade": "Channel blockade can suppress 5-HT3-mediated emetic responses.",
      "caution": "Optional accessory subunits change pharmacology; HTR3A can form functional homomers.",
      "targetAliases": [
        "HTR3A"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: HTR3A",
          "url": "https://www.ncbi.nlm.nih.gov/gene/3359",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: HTR3B",
          "url": "https://www.ncbi.nlm.nih.gov/gene/9177",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: HTR3C",
          "url": "https://www.ncbi.nlm.nih.gov/gene/170572",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: HTR3D",
          "url": "https://www.ncbi.nlm.nih.gov/gene/200909",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: HTR3E",
          "url": "https://www.ncbi.nlm.nih.gov/gene/285242",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "GABAA",
      "name": "GABA-A receptors",
      "family": "GABA",
      "kind": "Receptor complex",
      "genes": [
        "GABRA1",
        "GABRB2",
        "GABRG2"
      ],
      "aliases": [
        "CAE2",
        "DEE19",
        "DEE74",
        "DEE92",
        "ECA2",
        "ECA4",
        "EIEE19",
        "EIEE74",
        "EJM",
        "EJM5",
        "FEB8",
        "GEFSP3",
        "ICEE2"
      ],
      "mechanism": "Ligand-gated anion channel",
      "endogenousLigands": "GABA",
      "description": "Fast inhibitory signalling in many mature CNS neurons.",
      "activation": "Opening or positive modulation usually increases inhibition; chloride gradients can reverse the effect.",
      "blockade": "Blockade or negative modulation can reduce inhibition and increase seizure susceptibility.",
      "caution": "Subunit assembly and chloride gradients matter; PAMs are not interchangeable with direct agonists.",
      "targetAliases": [
        "GABAA"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "legacyTargetAliases": [
        "GABRA1"
      ],
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: GABRA1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2554",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: GABRB2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2561",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: GABRG2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2566",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "GABAB",
      "name": "GABA-B receptor",
      "family": "GABA",
      "kind": "Receptor complex",
      "genes": [
        "GABBR1",
        "GABBR2"
      ],
      "aliases": [
        "DEE59",
        "EIEE59",
        "GABABR1",
        "GABABR2",
        "GABBR1-3",
        "GB1",
        "GPR51",
        "GPRC3A",
        "GPRC3B",
        "HG20",
        "HRIHFB2099",
        "NDPLHS",
        "NEDLC"
      ],
      "mechanism": "Gi/o-coupled receptor heterodimer",
      "endogenousLigands": "GABA",
      "description": "Slow presynaptic and postsynaptic inhibitory modulation.",
      "activation": "Can reduce transmitter release and neuronal excitability; sedation and muscle relaxation may occur.",
      "blockade": "Can remove inhibitory modulation; effects depend on circuit and endogenous GABA.",
      "caution": "Functional receptor requires both GABA-B1 and GABA-B2; do not annotate either as a complete independent receptor.",
      "targetAliases": [
        "GABAB"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "legacyTargetAliases": [
        "GABBR1"
      ],
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: GABBR1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2550",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: GABBR2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/9568",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "GABA-B receptor functional variant study (2024)",
          "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11788220/",
          "scope": "Experimental evidence for obligatory B1/B2 assembly and allosteric modulation in the studied systems.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "NMDA",
      "name": "NMDA receptors",
      "family": "Ionotropic glutamate",
      "kind": "Receptor complex",
      "genes": [
        "GRIN1",
        "GRIN2A",
        "GRIN2B",
        "GRIN2C",
        "GRIN2D",
        "GRIN3A",
        "GRIN3B"
      ],
      "aliases": [
        "DEE101",
        "DEE27",
        "DEE46",
        "EB11",
        "EIEE27",
        "EIEE46",
        "EPND",
        "FESD",
        "GluN1",
        "GluN2A",
        "GluN2B",
        "GluN2C",
        "GluN2D",
        "GluN3A",
        "GluN3B",
        "LKS",
        "MRD6",
        "MRD8",
        "NDHMSD",
        "NDHMSR",
        "NMD-R1",
        "NMDA1",
        "NMDAR-L",
        "NMDAR1",
        "NMDAR2A",
        "NMDAR2B",
        "NMDAR2C",
        "NMDAR2D",
        "NMDAR3A",
        "NR1",
        "NR2A",
        "NR2B",
        "NR2C",
        "NR2D",
        "NR3",
        "NR3A",
        "NR3B",
        "hNR1",
        "hNR3"
      ],
      "mechanism": "Ligand- and voltage-dependent cation channel",
      "endogenousLigands": "Glutamate plus glycine or D-serine",
      "description": "Coincidence detection, calcium entry and synaptic plasticity.",
      "activation": "Canonical GluN1/GluN2 assemblies require co-agonist and appropriate voltage; excessive activation can contribute to excitotoxicity.",
      "blockade": "Can reduce excitatory transmission; effects depend on binding site, subunits and use dependence.",
      "caution": "Assembly-specific; GluN3-containing channels can differ from canonical GluN1/GluN2 receptors. Co-agonist-site activity, channel block and glutamate-site antagonism are different mechanisms.",
      "targetAliases": [
        "NMDA"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "legacyTargetAliases": [
        "GRIN1"
      ],
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: GRIN1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2902",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: GRIN2A",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2903",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: GRIN2B",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2904",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: GRIN2C",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2905",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: GRIN2D",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2906",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: GRIN3A",
          "url": "https://www.ncbi.nlm.nih.gov/gene/116443",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: GRIN3B",
          "url": "https://www.ncbi.nlm.nih.gov/gene/116444",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "Reactome: NMDA activation",
          "url": "https://reactome.org/content/detail/R-HSA-438066",
          "scope": "Mechanistic context for co-agonism and voltage-dependent magnesium block.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "AMPA",
      "name": "AMPA receptors",
      "family": "Ionotropic glutamate",
      "kind": "Receptor complex",
      "genes": [
        "GRIA1",
        "GRIA2",
        "GRIA3",
        "GRIA4"
      ],
      "aliases": [
        "GLUH1",
        "GLUR-C",
        "GLUR-K3",
        "GLUR1",
        "GLUR2",
        "GLUR3",
        "GLUR4",
        "GLUR4C",
        "GLURA",
        "GLURB",
        "GLURC",
        "GLURD",
        "GluA1",
        "GluA2",
        "GluA3",
        "GluA4",
        "GluA4-ATD",
        "GluR-K2",
        "HBGR1",
        "HBGR2",
        "MRD67",
        "MRT76",
        "MRX94",
        "MRXSW",
        "NEDLIB",
        "NEDSGA",
        "gluR-2",
        "gluR-B",
        "iGluR3"
      ],
      "mechanism": "Ligand-gated cation channel",
      "endogenousLigands": "Glutamate",
      "description": "Major fast excitatory transmission in the CNS.",
      "activation": "Opening supports depolarization; calcium permeability depends strongly on subunits and editing.",
      "blockade": "Can reduce fast excitatory transmission; neurological effects depend on selectivity.",
      "caution": "Tetrameric assembly and GluA2 editing matter; genes are components, not four separate complete receptors.",
      "targetAliases": [
        "AMPA"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: GRIA1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2890",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: GRIA2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2891",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: GRIA3",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2892",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: GRIA4",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2893",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "KAINATE",
      "name": "Kainate receptors",
      "family": "Ionotropic glutamate",
      "kind": "Receptor complex",
      "genes": [
        "GRIK1",
        "GRIK2",
        "GRIK3",
        "GRIK4",
        "GRIK5"
      ],
      "aliases": [
        "EAA1",
        "EAA2",
        "EAA3",
        "EAA4",
        "EAA5",
        "EEA3",
        "GLR5",
        "GLR6",
        "GLR7",
        "GLUK6",
        "GLUR5",
        "GLUR6",
        "GLUR7",
        "GRIK",
        "GRIK2",
        "GluK1",
        "GluK2",
        "GluK3",
        "GluK4",
        "GluK4-2",
        "GluK5",
        "GluR7a",
        "KA1",
        "KA2",
        "MRT6",
        "NEDLAS",
        "gluR-5"
      ],
      "mechanism": "Ligand-gated cation channel",
      "endogenousLigands": "Glutamate",
      "description": "Excitatory currents and presynaptic release modulation.",
      "activation": "Can depolarize cells or modulate release; excessive activation can promote seizures.",
      "blockade": "Can reduce kainate-mediated responses; net circuit effects vary.",
      "caution": "GluK4 and GluK5 need partner subunits to form functional channels.",
      "targetAliases": [
        "KAINATE"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: GRIK1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2897",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: GRIK2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2898",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: GRIK3",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2899",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: GRIK4",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2900",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: GRIK5",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2901",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "Kainate subunit functional study (2014)",
          "url": "https://pubmed.ncbi.nlm.nih.gov/25139762/",
          "scope": "Primary experimental evidence for the stated subunit/variant constraint; does not establish a response for every ligand or species.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "GLYR",
      "name": "Glycine receptors",
      "family": "Glycine",
      "kind": "Receptor complex",
      "genes": [
        "GLRA1",
        "GLRA2",
        "GLRA3",
        "GLRB"
      ],
      "aliases": [
        "GLR",
        "HKPX1",
        "HKPX2",
        "MRXSP",
        "STHE"
      ],
      "mechanism": "Ligand-gated anion channel",
      "endogenousLigands": "Glycine",
      "description": "Fast inhibitory transmission, prominent in spinal cord and brainstem.",
      "activation": "Usually increases inhibitory chloride conductance in mature neurons.",
      "blockade": "Can remove inhibition and produce severe motor excitation or convulsions.",
      "caution": "Distinct from the NMDA glycine co-agonist site; chloride gradients and assembly matter.",
      "targetAliases": [
        "GLYR"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: GLRA1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2741",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: GLRA2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2742",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: GLRA3",
          "url": "https://www.ncbi.nlm.nih.gov/gene/8001",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: GLRB",
          "url": "https://www.ncbi.nlm.nih.gov/gene/2743",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "NACHR_A4B2",
      "name": "Nicotinic alpha4beta2-containing receptors",
      "family": "Nicotinic acetylcholine",
      "kind": "Receptor complex",
      "genes": [
        "CHRNA4",
        "CHRNB2"
      ],
      "aliases": [
        "BFNC",
        "EBN",
        "EBN1",
        "EFNL3",
        "NACHR",
        "NACHRA4",
        "NACRA4",
        "nAChRB2"
      ],
      "mechanism": "Ligand-gated cation channel",
      "endogenousLigands": "Acetylcholine",
      "description": "Central cholinergic signalling and attention-related circuits.",
      "activation": "Can transiently excite neurons; continued exposure can desensitize receptors.",
      "blockade": "Can reduce cholinergic excitation; a simple opposite behavioural effect is not assured.",
      "caution": "Multiple stoichiometries exist; CHRNA4 alone is not a complete receptor.",
      "targetAliases": [
        "NACHR_A4B2"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "legacyTargetAliases": [
        "CHRNA4"
      ],
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: CHRNA4",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1137",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: CHRNB2",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1141",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI conserved domain: CHRNA4",
          "url": "https://www.ncbi.nlm.nih.gov/Structure/cdd/cd19017",
          "scope": "Subunit-assembly and alpha4beta2 stoichiometry context.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "NACHR_A7",
      "name": "Nicotinic alpha7 receptor",
      "family": "Nicotinic acetylcholine",
      "kind": "Receptor complex",
      "genes": [
        "CHRNA7"
      ],
      "aliases": [
        "CHRNA7-2",
        "NACHRA7",
        "a7nAChR",
        "nAChR7"
      ],
      "mechanism": "Ligand-gated cation channel",
      "endogenousLigands": "Acetylcholine",
      "description": "Rapid cholinergic signalling with substantial calcium permeability.",
      "activation": "Can transiently increase cation influx; rapid desensitization changes the response.",
      "blockade": "Can reduce alpha7-mediated currents; clinical cognitive effects remain uncertain.",
      "caution": "Homomeric channel; partial agonism and PAM type must be specified.",
      "targetAliases": [
        "NACHR_A7"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: CHRNA7",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1139",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "NACHR_A3B4",
      "name": "Nicotinic alpha3beta4-containing receptors",
      "family": "Nicotinic acetylcholine",
      "kind": "Receptor complex",
      "genes": [
        "CHRNA3",
        "CHRNB4"
      ],
      "aliases": [
        "BAIPRCK",
        "LNCR2",
        "NACHRA3",
        "PAOD2"
      ],
      "mechanism": "Ligand-gated cation channel",
      "endogenousLigands": "Acetylcholine",
      "description": "Autonomic ganglionic and central cholinergic transmission.",
      "activation": "Can stimulate autonomic neurons; net organ effects depend on the pathway.",
      "blockade": "Can reduce ganglionic transmission and disturb autonomic function.",
      "caution": "Additional subunits and stoichiometry affect pharmacology.",
      "targetAliases": [
        "NACHR_A3B4"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: CHRNA3",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1136",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: CHRNB4",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1143",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "NACHR_MUSCLE",
      "name": "Adult muscle nicotinic receptor",
      "family": "Nicotinic acetylcholine",
      "kind": "Receptor complex",
      "genes": [
        "CHRNA1",
        "CHRNB1",
        "CHRND",
        "CHRNE"
      ],
      "aliases": [
        "ACHRA",
        "ACHRB",
        "ACHRD",
        "ACHRE",
        "CHRNA",
        "CHRNB",
        "CMS1A",
        "CMS1A1",
        "CMS1B",
        "CMS1D",
        "CMS1E",
        "CMS2A",
        "CMS2C",
        "CMS3A",
        "CMS3B",
        "CMS3C",
        "CMS4A",
        "CMS4B",
        "CMS4C",
        "FCCMS",
        "FIM1",
        "FIMG",
        "FIMG1",
        "MGI",
        "SCCMS"
      ],
      "mechanism": "Ligand-gated cation channel",
      "endogenousLigands": "Acetylcholine",
      "description": "Neuromuscular-junction transmission.",
      "activation": "Brief activation initiates contraction; sustained activation can cause depolarizing blockade.",
      "blockade": "Can prevent neuromuscular transmission and cause paralysis, including respiratory weakness.",
      "caution": "Adult and fetal assemblies differ; receptor activation is not always sustained muscle contraction.",
      "targetAliases": [
        "NACHR_MUSCLE"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: CHRNA1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1134",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: CHRNB1",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1140",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: CHRND",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1144",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: CHRNE",
          "url": "https://www.ncbi.nlm.nih.gov/gene/1145",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    },
    {
      "id": "ABCC8",
      "name": "SUR1 regulatory subunit",
      "family": "Channel-associated signalling",
      "kind": "Regulatory subunit",
      "genes": [
        "ABCC8",
        "KCNJ11"
      ],
      "aliases": [
        "ABC36",
        "BIR",
        "HHF1",
        "HHF2",
        "HI",
        "HRINS",
        "IKATP",
        "KIR6.2",
        "MODY12",
        "MODY13",
        "MRP8",
        "PHHI",
        "PNDM2",
        "PNDM3",
        "SUR",
        "SUR1",
        "SUR1delta2",
        "TNDM2",
        "TNDM3"
      ],
      "mechanism": "Regulatory subunit of ATP-sensitive potassium channels",
      "endogenousLigands": "Intracellular nucleotide state",
      "description": "SUR1 regulates Kir6.2-containing potassium channels in pancreatic beta cells and other tissues.",
      "activation": "Channel opening can reduce beta-cell excitability and insulin secretion.",
      "blockade": "Channel closing can increase insulin secretion and cause hypoglycaemia.",
      "caution": "Not a conventional neurotransmitter receptor; describe channel opening/closing rather than generic agonism/antagonism.",
      "targetAliases": [
        "ABCC8"
      ],
      "species": "Homo sapiens",
      "evidenceType": "educational_summary",
      "identityCheckedAt": "2026-10-19",
      "sources": [
        {
          "label": "NCBI Gene: ABCC8",
          "url": "https://www.ncbi.nlm.nih.gov/gene/6833",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        },
        {
          "label": "NCBI Gene: KCNJ11",
          "url": "https://www.ncbi.nlm.nih.gov/gene/3767",
          "scope": "Human gene identity and biological-function context. This record alone does not establish every clinical activation or blockade outcome.",
          "accessedAt": "2026-10-19"
        }
      ],
      "ligandAnnotations": []
    }
  ]
};
if(typeof module!=='undefined'&&module.exports)module.exports={RECEPTOR_REFERENCE_CATALOG};
