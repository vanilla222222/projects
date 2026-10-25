# Additional named families: batch 003

Five structural filters are paired with **18 exact-source human receptor action
records**. All selected source identities reuse existing graphs in the index.

| Structural family | Matching graphs | Selected references and action assignments |
| --- | ---: | --- |
| Adenine ribonucleosides | 138 | CCPA: ADORA1; CGS 21680 and regadenoson: ADORA2A; NECA: ADORA2B; piclidenoson and Cl-IB-MECA: ADORA3 — agonists |
| Thiazolidinediones | 7 | Rosiglitazone, pioglitazone and troglitazone — PPARG agonists |
| Benzhydrylpiperazines | 26 | Cetirizine — HRH1 inverse agonist; hydroxyzine and cyclizine — HRH1 antagonists |
| Dibenzocycloheptene-related cores | 39 | Amitriptyline — CHRM1 antagonist; nortriptyline — ADRA1A antagonist; cyproheptadine — HRH1 antagonist |
| Ortho-biphenyltetrazoles | 21 | Losartan, valsartan and EXP3174 — AGTR1 antagonists |

Structural match counts overlap with other families and do not establish
pharmacology for every matching graph. Each selected ligand receives one cited
human target/action classification; this is not a complete receptor profile or
a claim of selectivity. The presence of historical compounds does not state
current approval or recommend clinical use.

## Source and evidence scope

Adapted selections come from the pinned **IUPHAR/BPS Guide to PHARMACOLOGY
2026.3.1** snapshot, **CC BY-SA 4.0**. Each entry retains the source-provided
SMILES, full InChIKey, complete selected ligand/interaction rows, target and
ligand IDs, direct source URL and source SHA-256. The compiler checks molecular
identity before assigning target support.

The records are labeled **curated action classifications**, distinct from the
measured functional assay observations in other collections. The original Type
and Action fields remain available. In particular, a source Type of Antagonist
with an Action of Inverse agonist is preserved as inverse agonism, without
inventing an efficacy measurement. Target, species, source IDs and action must
agree with the raw classification witness. PPAR gamma keeps its nuclear
receptor classification.

## Structural scope and identity review

Adenine ribonucleoside filtering permits 5-prime substitutions and ignores stereo
for family membership; reviewed ligand identities retain full source stereo.
The thiazolidinedione query requires the two carbonyls. Benzhydrylpiperazines
require the diphenylmethyl group directly bonded to piperazine nitrogen, which
excludes benzhydryl ethers. The dibenzocycloheptene-related core requires an
all-carbon central ring, excluding its nitrogen and oxygen replacements. The
biphenyltetrazole query permits tetrazole proton-position tautomers as a motif.

Exact evidence matching is stricter than a family query. The legacy Valsartan
entry differs from the source in stereo/tautomer representation and is flagged
for review. The exact source graph is already present under another stable key;
only that graph receives the new source record. This does not mean that an
alternative tautomer is a different chemical substance or that unspecified
stereo establishes the source enantiomer.

Definitions and positive/negative fixtures are in `data/family-definitions.json`;
entries are `data/curated-reference-entries/family-003-*.json`.

```sh
python tools/build-curated-references.py --check
node tools/named-family-003-test.js
node tools/family-pharmacology-test.js
```
