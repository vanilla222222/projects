# Additional named families: batch 004

Four new structural filters and **14 human receptor action records for six named compounds** reuse exact existing source-matched graphs. This batch adds pharmacology and navigation rather than arbitrary structures.

| Structural family | Selected references and human action assignments |
| --- | --- |
| Benzisothiazoles | Ziprasidone: DRD2/HTR2A antagonism, HTR1A partial agonism; perospirone: DRD2/DRD3/DRD4 antagonism |
| Dibenzodiazepines | Clozapine: DRD2/DRD4/HRH1 antagonism, HTR2A inverse agonism |
| Dibenzothiazepines | Quetiapine: DRD2/HRH1 antagonism |
| Pyrimidinylpiperazines | Buspirone: HTR1A partial agonism; tandospirone: HTR1A agonism (source classification: Full agonist) |

These are selected source classifications, not complete receptor profiles or clinical efficacy statements. All values remain scoped to exact ligand, human target and raw source row. No EC50, Emax or selectivity is inferred. A structural match does not receive a neighboring compound's pharmacology.

## Provenance and selection

Adapted from the pinned IUPHAR/BPS Guide to PHARMACOLOGY **2026.3.1** snapshot (CC BY-SA 4.0), `validation/sources/receptor-actions-iuphar.json`. Each entry retains the full source ligand and interaction rows, source URL, IDs, full InChIKey and snapshot SHA-256. The records are explicitly labeled curated action classifications, separate from directly measured functional observations.

Quetiapine's source snapshot contains conflicting HTR2A action classifications. This batch selects its unambiguous DRD2 and HRH1 rows and does not add a new HTR2A assignment. The original source snapshot remains available for review. Tandospirone's source Full agonist label remains visible; it does not imply universal efficacy across assays.

## Structural boundaries

Benzisothiazoles require adjacent sulfur and nitrogen, excluding benzothiazoles. The dibenzodiazepine and dibenzothiazepine queries distinguish the nitrogen/nitrogen and nitrogen/sulfur seven-membered central rings, excluding phenothiazines and ordinary single-benzene benzodiazepines. Pyrimidinylpiperazines require a non-fused pyrimidine attached at C2 to piperazine; prazosin's fused quinazoline is excluded. These filters complement the broader historical ring taxonomy.

Definitions and named positive/negative fixtures are in `data/family-definitions.json`; reviewed records are `data/curated-reference-entries/family-004-*.json`. Build validation checks source identity and every family fixture.

```sh
python tools/build-curated-references.py --check
node tools/named-family-004-test.js
```
