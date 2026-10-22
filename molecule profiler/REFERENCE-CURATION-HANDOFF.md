# Reference curation status and takeover

The latest inherited reference milestone is commit `1530420`: 59 GABA-A-related
structures and an expanded GABRA1 panel, following morphinan and steroid work.
At takeover the library contained 2,782 entries and 132 target panels; the
subsequent assay-linked expansion is recorded in RECEPTOR-COVERAGE.md.

Continuing curation prioritizes identity and assay provenance over a minimum
number of labels. The existing scaffold-derivation scripts and formula checks
establish internal consistency; they cannot establish compound identity,
receptor subtype specificity or measured activity. Labels in `targets.js` are
legacy curated associations and must not be treated as uniformly source-verified
human binding measurements. GABRA1 is used as the legacy GABA-A panel key; it does
not establish selective action at isolated alpha-1 subunits. Functional GABA-A
receptors are assemblies, and action depends on subunit composition and site.

## Read-only external identity checks

```sh
python tools/pubchem-reference-audit.py --gene GABRA1 --output validation/pubchem-gabaa.json
python tools/pubchem-reference-audit-test.py
```

The checker resolves each exact library name through PubChem PUG REST, retains
CID, source SMILES/formula/InChIKey, request and record links, retrieval time,
raw source properties, response hash and local source hashes. RDKit compares
isomeric canonical graphs. Connectivity-only matches disclose stereochemical
differences; ambiguous names, failed lookups and graph differences require
review. The tool never rewrites a structure or transfers activity claims.
Name resolution can select an unintended form: even matching graphs are database
agreement, not an experimental identity determination.

Cache responses for repeatable offline runs with `--cache PATH --offline`.
A cached response keeps its original retrieval time. Fresh acquisition requires
a different or cleared cache. Missing or unreadable source structures are
reported, rather than passed as verified. The committed report is a snapshot;
check its source hashes before treating it as current.

Receptor action annotations remain separate in `data/receptor-ligand-annotations.js`.
Use `RECEPTOR-CATALOG.md`: binding alone does not establish agonism, antagonism,
allosteric modulation or pathway bias. No additional target labels are justified
merely by an identity match or shared scaffold.

## Calculation corrections during takeover

The independent full-library Crippen comparison identified inaccurate aromatic
ring/bond typing and an overly broad charged-nitrogen rule. Corrected handling
retains existing partial-aromatic input behaviour while rejecting neutral odd
carbon rings and exocyclic-carbon interrupted rings as locally aromatic merely
because the SMILES used lowercase atoms. Rejected ring bonds are removed before
Kekule assignment, preserving bonds shared with accepted aromatic rings.

`validation/descriptor-rdkit-cases.json` has RDKit-generated regression values for
56 representations, including aromatic/Kekule pairs, the six original larger
logP discrepancies, charged nitrogens and partial-aromatic input controls.
`tools/descriptor-conformance-test.js` runs in the normal Node suite.

```sh
python tools/library-descriptor-audit.py --output validation/library-descriptor-rdkit.json
```

Across all 2,782 current library inputs: zero calculation/parse errors; 2,779 logP
and 2,780 molar-refractivity values agree within 1e-7. No logP difference exceeds
0.05 (previously six did; worst 1.1035, now 0.0484). Two refractivity differences
remain, maximum 0.884. The report names every residual: riboflavin, 1-formyl-LSD
and carboplatin (the latter's logP difference is 0.0025). These require
further aromaticity/atom-type investigation. Agreement with RDKit is
implementation equivalence, not agreement with measured partition coefficients,
solubility, metabolism or pharmacology.

## Reviewed GABA-A-panel identity findings

The 79-name PubChem snapshot found 69 exact isomeric-graph matches initially,
five stereochemistry-only differences and five graph differences. Review led to
four corrections: **alpidem** (CID 54897), **flumazenil** (3373), **gaboxadol**
(3448) and **zaleplon** (5719). Their formulas did not change. Three are also
corrected in the inherited derivation script to prevent regeneration of the
old structures. Source responses, previous structures and replacements are
retained in the two validation JSON reports.

**Chlordiazepoxide was deliberately retained.** The existing N-oxide graph has
InChIKey `ANTSCNMPPGJYLG-UHFFFAOYSA-N`, supported by
[FDA GSRS](https://precision.fda.gov/ginas/app/ui/substances/6RZ6XEZ3CR) and
[ChEBI:3611](https://www.ebi.ac.uk/chebi/CHEBI:3611). The current name-resolved
PubChem CID 2712 gives a different graph/key. This remains a reported source
disagreement, not proof that the retained entry is incorrect. The audit exits
nonzero while that graph difference remains; the saved report is still written.

After corrections, the snapshot contains 73 exact graph matches, the one reviewed
source disagreement, and five stereochemistry-only differences: ethchlorvynol,
etomidate, meclonazepam, topiramate and vinbarbital. These differences require
compound-form review and were not silently rewritten. Structure agreement does
not validate the associated GABRA1 activity labels.

Fused 5+7 aromatic systems (azulene) and charged seven-membered rings are explicit
boundary regressions, so fixing false local aromaticity does not erase valid
fused-system aromaticity. The model remains incomplete; the residual descriptor
differences listed above are retained in the independent report. Methodological
reference: [RDKit Book, aromaticity](https://www.rdkit.org/docs/RDKit_Book.html).

A known input-representation gap remains for nevirapine: its current library
SMILES agrees with RDKit for these descriptors, while an alternate Kekule form
can still be misclassified by the seven-membered heterocycle logic. The fixture
records that uncovered input explicitly; the passing count does not include it.
This is one reason not to claim complete aromaticity conformance.

## Subsequent coverage expansion

The library now has 3,116 entries after the first ChEMBL_37 binding-reference
batch. The full-library descriptor comparison has been regenerated: 3,112 logP
and 3,113 molar-refractivity values agree with RDKit within 1e-7, with no logP
difference above 0.05. Three refractivity residuals remain, maximum 0.884. The
new dye-like CHEMBL405526 joins the previously documented riboflavin and
1-formyl-LSD refractivity cases; carboplatin still has a small logP residual.
There are now 62 passing descriptor input representations. The historical
2,782-entry figures above describe the preceding correction milestone.

The second coverage batch expands the library to 3,681 entries and the scoring
registry to 142 targets. The regenerated same-graph Crippen comparison has 3,677
logP and 3,678 molar-refractivity values within 1e-7 of RDKit. Residual counts and
maximum differences are unchanged: four small logP residuals (maximum 0.0484)
and three refractivity residuals (maximum 0.884). The complete per-query source
records and remaining coverage shortfalls are retained with the second batch.


The third receptor-binding batch adds 177 structures, taking the library to
3,858 entries. Independent RDKit checks found no invalid structures or formula
mismatches. All 177 additions agree with the same-graph Crippen logP/MR
implementation within 1e-7; the previous four logP and three MR residuals remain
unchanged. The complete audit is `validation/library-descriptor-rdkit.json`.
This is computed-descriptor equivalence, not experimental property validation.


The fourth receptor batch adds 149 structures, taking the library to 4,007.
All 149 additions agree with the same-graph RDKit Crippen logP/MR audit within
1e-7; the earlier four logP and three MR residuals are unchanged. The scaffold
audit additionally recomputes identities for all counted source profiles and
reports ring-scaffold concentration separately from acyclic profiles. Neither
audit establishes measured-property or biological prediction accuracy.
