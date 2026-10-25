# Reviewed named-reference identity corrections

Four active named-reference keys now use the exact reviewed IUPHAR/BPS Guide to
PHARMACOLOGY source graphs. The original `data/library.js` file is preserved.
The correction overlay retains the complete before entry, original InChIKey,
replacement graph, source key, source URL, decision category and review date.

| Named key | Decision | Source identity |
| --- | --- | --- |
| Fenoldopam | Correct connectivity | IUPHAR ligand 939; TVURRHSHRRELCG-UHFFFAOYSA-N |
| SKF-38393 | Correct connectivity | IUPHAR ligand 935; JUDKOGFHZYMDMF-UHFFFAOYSA-N |
| SCH-23390 | Correct connectivity | IUPHAR ligand 943; GOTMKOSCLKVOGG-UHFFFAOYSA-N |
| Valsartan | Select reported stereochemistry and tetrazole form | IUPHAR ligand 3937; ACWBQPMHZXGDFX-QFIPXVFZSA-N |

The source is the existing pinned IUPHAR/BPS 2026.3.1 snapshot,
`validation/sources/receptor-actions-iuphar.json` (CC BY-SA 4.0).
The source rows, identifiers and SHA-256 witnesses remain in each curated record.
These are corrections to already selected named references, not new structure
imports or new pharmacology experiments.

## Findings and scope

The three historical benzazepine graphs have the expected elemental formulas
but different connectivity. Removing stereochemistry and applying RDKit's
canonical tautomer enumeration still does not match their source graphs.
Matching a formula alone therefore did not validate these identities.

The historical valsartan graph is different: after removing stereochemistry
and canonicalizing tautomers it agrees with the source connectivity. Its
stereochemistry was unspecified; the replacement explicitly chooses the
source-reported stereoisomer. This is an editorial selection for the named
reference, not an inference about an unknown physical sample. An alternative
tetrazole tautomer does not establish a different substance; unspecified stereo
does not establish a racemate or either enantiomer.

All four replacement graphs were already present under other stable keys.
Their existing source classifications now also appear for the corrected named
keys. Additional alias representations do not create additional experiments,
unique compounds, independent replications, or strict binding-profile coverage.
The composed library still has 21,064 entries and 27 overlay-added structures.

## Guards and researcher-facing behavior

`data/reference-identity-corrections.json` selects an exact historical entry and
an already reviewed curated source participant. The compiler rejects stale
original entries, duplicate keys, unverified categories, and inconsistent source
identities. The runtime applies a correction only when the original name,
SMILES and formula and the replacement's reviewed graph, formula and full
InChIKey agree. A changed original graph or replacement witness fails closed.
Raw historical entries cannot acquire curated source evidence by name alone.

The analyzer, explorer, inspector and structure-search worker use the composed
library. Compound dossiers and claim tracing expose correction provenance and
before/after SMILES. Review history retains the initial unresolved notes and
appends the correction decision; completed identity tasks leave the curation
queue. The quetiapine HTR2A action disagreement remains unresolved.

Evidence release tracking records four explicit identity corrections and four
review decisions, with no new measured observations. Derived matched pairs and
family metadata are rebuilt against the corrected composition. Historical
published release snapshots remain unchanged.

## Reproduction

```sh
python tools/build-curated-references.py --check
python tools/build-reference-pairs.py --check
python tools/build-reference-releases.py --check
node tools/identity-corrections-test.js
node tools/reference-research-test.js
```
