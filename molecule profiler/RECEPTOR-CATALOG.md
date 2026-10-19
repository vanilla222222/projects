# Receptor biology catalog and ligand annotation handoff

The signalling explorer has a receptor view and the existing signalling-molecule view. The catalog contains 146 human receptor, assembly and related regulatory records across 36 families. It covers all 51 currently linked receptor-related target rows, with 95 additional catalog entries awaiting a target row. This is an expanded selected catalog, not an inventory of every human receptor.

Each card contains receptor identity, endogenous signals, main signalling mechanism, biological functions, qualitative consequences of activation and blockade, limitations, direct source links and legacy target-link status. The shared action glossary covers agonists, partial agonists, antagonists, inverse agonists, positive/negative allosteric modulation, biased signalling, channel opening/blockade, kinase inhibition and binding-only evidence. Search includes gene symbols, aliases, functions and endogenous signals. Family, target-type and curation filters are independent.

## Files and boundaries

| File | Purpose |
| --- | --- |
| `data/receptor-catalog.js` | Stable receptor identities and educational biology summaries |
| `data/receptor-ligand-annotations.js` | Source-backed molecule/action annotations; initially empty |
| `js/receptor-catalog.js` | Search, legacy mapping, annotation validation and empty scaffold export |
| `js/receptor-explorer-ui.js` | Receptor cards, filters, glossary and downloads |
| `reference-explorer.js` | Existing molecule view, now with family-level receptor navigation |
| `data/targets.js` | Existing target-scoring ligand dataset; unchanged by this expansion |
| `data/library.js` | Chemical structures and names; unchanged by this expansion |

Do not turn all scaffold entries into scoring targets merely to increase coverage. Empty scaffold entries have no curated ligand evidence. The catalog does not infer affinity, agonism, antagonism or clinical effects for user-supplied structures. An existing target ligand list establishes neither functional action nor selectivity.

## Adding molecules and actions

1. Locate the receptor by stable catalog ID. Export its scaffold from the card, or export all scaffolds with the toolbar button. Extend an existing target row when the handoff lists one; do not insert a duplicate under an alias.
2. Verify chemical identity and add the molecule to the structure library through the existing curation process.
3. Add a target-scoring ligand only when independent evidence supports that relationship. Use exact library names and the existing target schema. The exported template has `name`, `gene`, `family`, `organism`, `note` and an empty `ligands` array. For a receptor complex, the template's `gene` field is the stable complex ID, not a claim that it is one HGNC gene.
4. Add an action annotation to `RECEPTOR_LIGAND_ANNOTATIONS` only with direct evidence. Its required fields are listed below. The validator hides malformed annotations and reports a count; the regression test fails on them.
5. Run the catalog, reference-audit and complete validation tests. If curated scoring targets change, review and update the target-count baseline and retrieval benchmark through the existing reference workflow.

| Annotation field | Meaning |
| --- | --- |
| `receptorId` | Stable catalog ID; case sensitive |
| `ligandName` | Exact structure-library name |
| `action` | One supported vocabulary value below |
| `evidenceType` | `functional` for an action, or `binding` for `binding_only` |
| `sourceUrl` | Direct HTTPS experimental/curated evidence record, not a general search page |
| `species` | Actual tested species; never silently extrapolate animal findings to humans |
| `assay` | Experimental system, including relevant assembly, variant or cell context |
| `endpoint` | Measured functional response or binding endpoint |
| `probeLigand` | Required for `pam` and `nam` |
| `referenceLigand`, `pathways` | Required for `biased`; at least two compared pathways |
| `note` | Optional interpretation details, uncertainty and limitations |

Supported actions: `agonist`, `partial_agonist`, `antagonist`, `inverse_agonist`, `pam`, `nam`, `channel_blocker`, `channel_opener`, `inhibitor`, `modulator`, `biased`, `binding_only`. `modulator` still requires functional evidence. A binding Ki, Kd or displacement IC50 alone cannot establish any functional action. Do not infer actions from scaffold similarity or import them from an unspecified aggregate ligand list. The field validator enforces metadata presence and evidence categories; it cannot establish that a citation actually supports a claim, so scientific review is still required.

## Assemblies and exceptions

Complex IDs include `GABAA`, `GABAB`, `NMDA`, `AMPA`, `KAINATE`, `GLYR`, `NACHR_A4B2`, `NACHR_A7`, `NACHR_A3B4` and `NACHR_MUSCLE`. Their gene lists describe subunit components, not a fixed stoichiometry or a claim that every listed subunit is mandatory. Legacy mappings `GABRA1` → `GABAA`, `GABBR1` → `GABAB`, `GRIN1` → `NMDA`, and `CHRNA4` → `NACHR_A4B2` are explicitly labelled subunit mappings. They do not validate assembly-specific pharmacology of the older ligand list.

GABA-B requires B1/B2; the NMDA card distinguishes co-agonism and channel block. P2X5 variant constraints, P2X6 heteromeric assembly and kainate-subunit partner requirements are disclosed. `ABCC8` is a channel regulatory subunit, with channel opening/closing language rather than ordinary receptor agonism. HER2 is not assigned a direct soluble agonist. Human `HTR5BP` is excluded as a nonfunctional pseudogene rather than added as a functional 5-HT5B receptor.

## Sources and limitations

All 175 component gene identities were resolved to current human NCBI Gene records through NCBI E-utilities on 2026-10-19. Cards link to those exact gene records. These support gene identity and biological-function context; they do not individually substantiate every possible clinical consequence. Additional record-level primary studies and curated Reactome pathways support selected assembly and outcome statements. Descriptions are original qualitative educational synthesis and have not undergone systematic clinical evidence review. Tissue, receptor reserve, assembly, endogenous tone, species, exposure, selective modulation and signalling bias all affect the response.

The glossary uses the [Assay Guidance Manual on GPCR ligand characterization](https://www.ncbi.nlm.nih.gov/books/NBK549462/) and [IUPHAR recommendations on allosterism](https://pmc.ncbi.nlm.nih.gov/articles/PMC11060431/). Other key sources appear on the individual receptor cards. Clinical evidence for one ligand does not establish a class-wide effect or a response for a new molecule.

## Checks

From `molecule profiler/`:

```sh
node tools/receptor-catalog-test.js
node tools/run-validation.js --report validation-report.json
```

The optional DOM integration test executes the actual HTML/scripts with jsdom 26.1.0, installed outside the repository, and exercises cards, search, filters, focus retention, exports, glossary, molecule navigation and the audit view:

```sh
NODE_PATH=/path/to/jsdom/node_modules node tools/receptor-explorer-dom-test.js
```

This is not a rendering engine test. Chromium visual layout, mobile rendering and the full browser suite remain unverified in the restricted development environment. No hosted Actions workflows are added by this feature.

## Stable IDs by family

| Family | Stable IDs |
| --- | --- |
| Adenosine | `ADORA1`, `ADORA3`, `ADORA2A`, `ADORA2B` |
| Adrenergic alpha-1 | `ADRA1A`, `ADRA1B`, `ADRA1D` |
| Adrenergic alpha-2 | `ADRA2A`, `ADRA2B`, `ADRA2C` |
| Adrenergic beta | `ADRB1`, `ADRB2`, `ADRB3` |
| Angiotensin | `AGTR1`, `AGTR2` |
| Bradykinin | `BDKRB1`, `BDKRB2` |
| Cannabinoid | `CNR1`, `CNR2` |
| Channel-associated signalling | `ABCC8` |
| Chemokine | `CCR2`, `CCR5`, `CXCR3`, `CXCR4` |
| Dopamine | `DRD1`, `DRD5`, `DRD2`, `DRD3`, `DRD4` |
| Endothelin | `EDNRA`, `EDNRB` |
| GABA | `GABAA`, `GABAB` |
| Glycine | `GLYR` |
| Histamine | `HRH1`, `HRH2`, `HRH3`, `HRH4` |
| Ionotropic glutamate | `NMDA`, `AMPA`, `KAINATE` |
| Leukotriene | `CYSLTR1`, `CYSLTR2`, `LTB4R`, `LTB4R2` |
| Melatonin | `MTNR1A`, `MTNR1B` |
| Metabotropic glutamate group I | `GRM1`, `GRM5` |
| Metabotropic glutamate group II/III | `GRM2`, `GRM3`, `GRM4`, `GRM6`, `GRM7`, `GRM8` |
| Muscarinic | `CHRM1`, `CHRM3`, `CHRM5`, `CHRM2`, `CHRM4` |
| Neuropeptide Y | `NPY1R`, `NPY2R`, `NPY4R`, `NPY5R` |
| Nicotinic acetylcholine | `NACHR_A4B2`, `NACHR_A7`, `NACHR_A3B4`, `NACHR_MUSCLE` |
| Nuclear metabolic | `PPARA`, `PPARD`, `PPARG`, `RARA`, `RARB`, `RARG`, `VDR`, `THRA`, `THRB` |
| Nuclear steroid | `AR`, `ESR1`, `ESR2`, `PGR`, `NR3C1`, `NR3C2` |
| Opioid | `OPRM1`, `OPRK1`, `OPRD1`, `OPRL1` |
| Orexin | `HCRTR1`, `HCRTR2` |
| P2X purinergic | `P2RX1`, `P2RX2`, `P2RX3`, `P2RX4`, `P2RX5`, `P2RX6`, `P2RX7` |
| P2Y purinergic | `P2RY1`, `P2RY2`, `P2RY4`, `P2RY6`, `P2RY11`, `P2RY12`, `P2RY13`, `P2RY14` |
| Peptide gut and stress | `GHSR`, `CCKAR`, `CCKBR`, `CRHR1`, `CRHR2` |
| Peptide metabolic | `GLP1R`, `GIPR`, `GCGR` |
| Receptor tyrosine kinase | `EGFR`, `ERBB2`, `KDR`, `PDGFRB`, `KIT`, `ALK`, `MET`, `FLT3` |
| Serotonin | `HTR1A`, `HTR1B`, `HTR1D`, `HTR1E`, `HTR1F`, `HTR5A`, `HTR2A`, `HTR2B`, `HTR2C`, `HTR4`, `HTR6`, `HTR7`, `HTR3A` |
| Somatostatin | `SSTR1`, `SSTR2`, `SSTR3`, `SSTR4`, `SSTR5` |
| Tachykinin | `TACR1`, `TACR2`, `TACR3` |
| Trace amine | `TAAR1` |
| Vasopressin and oxytocin | `AVPR1A`, `AVPR1B`, `OXTR`, `AVPR2` |
