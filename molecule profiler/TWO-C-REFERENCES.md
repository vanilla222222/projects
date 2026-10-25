# 2C references and measured pharmacology

The curated collection covers **30 distinct named compounds**, including **17
structures** missing from the historical library. All 30 have measured human
5-HT2A receptor activation data. Thirty-two observations are retained because
2C-T-4 and 2C-T-7 occur in two studies; the results remain separate.

| Selected primary-study cohort | Coverage | Primary source |
| --- | ---: | --- |
| Core: 2C-B, C, D, E, H, I, N, P, T-2, T-4, T-7 | 11/11 | [Rickli et al.](https://doi.org/10.1016/j.neuropharm.2015.08.034) |
| Thio: 2C-T-1, T-3, T-4, T-7, T-16, T-19, T-21.5, T-22, T-25, T-27, T-28, T-30, T-31, T-33 | 14/14 | [Luethi et al.](https://doi.org/10.1016/j.neuropharm.2017.07.012) |
| Alkoxy: 2C-O-2, O-3, O-16, O-21, O-21.5, O-22, O-27 | 7/7 | [Kolaczynska et al.](https://doi.org/10.3389/fphar.2019.01423) |

These counts mean the selected study cohorts are covered. They do not establish
an exhaustive inventory of every reported or possible 2C analogue, or complete
pharmacology at every receptor. Older entries outside these cohorts can still
lack reviewed functional data. NBOMe, FLY and alpha-methyl compounds are not
silently counted as these parent 2C study members.

## Identity review

Parent graphs were transcribed from the primary structure figures and checked
against their explicit compound names and substituent definitions. The stored
full InChIKeys and formulas are calculated by RDKit from those reviewed graphs;
they are **not independently supplied registry identifiers**. This distinction
is recorded in each identity source and evidence card. The independent pinned
IUPHAR 2C-B key is also a regression fixture. Existing exact graphs are reused,
including **2C-T / 2C-T-1**. No analogue enumeration supplies an identity.

The experiments used hydrochloride salts. The structure index stores the neutral
parents depicted by the studies, with the assayed form disclosed separately.
Neither salt removal from an unknown material nor a measured salt identity is
claimed by a parent reference.

## Pharmacology interpretation

Each entry supplies HTR2A target support and a **partial agonist** annotation for
the cited calcium assay. The receptor is human; NIH-3T3 host cells are mouse
fibroblasts. Receptor species and host-cell species are separate fields.

EC50 measures the concentration giving half of that compound's response range
in the assay. Emax is its maximal response relative to serotonin, set to 100%.
They describe different properties: a fitted EC50 can accompany a very small
Emax. The low 2C-T-31 response is therefore preserved explicitly. The observed
partial action is specific to the receptor, assay and source, and is not
transferred to a related query graph or interpreted as a clinical effect.

Original micromolar units in the core study are retained alongside exact
conversion to nanomolar units. Uncertainty is **SD**, not SEM or a confidence
interval. Functional EC50 values are never relabeled as Ki. The source tables
supply the imported numbers; an inconsistent prose range in the alkoxy paper
does not override the 2C-O-3 table value.

## Sources and reproduction

The three `validation/sources/2c-*-functional.json` snapshots retain only the
selected factual identity and human 5-HT2A functional fields, with direct primary
source links. The alkoxy paper is CC BY 4.0; the other papers retain their stated
copyright. No synthesis instructions, human doses or potency optimization
conclusions are imported.

`data/curated-reference-entries/2c-study-*.json` links each named reference to
its source rows and source hashes. The compiler generates the collection,
functional action tags, target support, exports and visible study-coverage
counts. All new references have functional pharmacology; a structural match
alone does not establish activity.

```sh
python tools/build-curated-references.py --check
node tools/two-c-reference-test.js
node tools/curated-references-test.js
```
