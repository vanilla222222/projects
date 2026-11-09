# How far the ligand labels can honestly go

`data/targets.js` holds 154 targets, each with a list of ligand label names. The goal was 50 per
target. This records how far pinned evidence actually reaches, and why most targets stop well
short. It is the target-side counterpart of `CLASS-FIFTY-LIMITS.md`.

## What was added

148 labels across 17 targets, taking the corpus from 5,439 to **5,587** labels. Every one resolves
exactly to an existing `data/library.js` row, so the unresolved-label count stays at **0** and no
new library row was needed — `needs-rows.json` came back empty, which was measured, not assumed.

| | before | after |
|---|---|---|
| ligand labels | 5,439 | 5,587 |
| targets under 50 | 91 | 90 |
| targets at or over 50 | 63 | 64 |
| labels resolving to no library row | 0 | 0 |

One target crossed the line: **`HTR1F`, 26 to 54.**

## What the evidence was

Every label traces to `validation/sources/receptor-actions-iuphar.json` (IUPHAR/BPS GtoPdb
2026.3.1, retrieved 2026-10-24, CC BY-SA 4.0), matched to targets by **gene symbol** rather than
display name, since the snapshot's names carry markup like `5-HT<sub>1A</sub> receptor`. Of the
148, 121 carry a numeric affinity and the remaining 27 are annotated interactions with an action
but no transcribed value. By action: 64 inhibitor, 61 agonist, 21 antagonist, 2 channel blocker,
none unspecified.

The other pinned snapshots — ChEMBL, ChEBI, DrugCentral, PubChem, FreeSolv — **carry no target
field**, so they cannot evidence a relationship at all and were used only to establish compound
identity. The three `2c-*-functional.json` files and the nitazene and named-family pharmacology
files were wired in and run; both targets they cover are already over 50, so they contributed
nothing.

Two tiers. **89 labels are exact**: the pinned ligand name is itself a library row name. **59 are
identity matches**: the pinned name is not a library row name, but the InChIKey derived from the
pinned SMILES is identical to that from an existing row, so that row's name is used. This is
necessary because sourced rows are stored lower-case and many are named by accession or IUPAC name
— `CHEMBL15245` is yohimbine, and `3-[4-(3-chlorophenyl)piperazin-1-yl]-1,1-diphenylpropan-2-ol`
is BRL-15572. The identity tier never invents a row and never asserts a relationship; it only
decides which existing row is the compound the pinned interaction names. The exact-only figure is
89 labels and 0 targets reaching 50.

## Why 74 targets cannot grow at all

Not for want of searching. **71 are simply absent from the only pinned pharmacology source**,
because GtoPdb is a GPCR, ion-channel and nuclear-receptor catalogue of 143 target rows. Absent
from it, and therefore closed on present evidence:

- every enzyme — `PTGS1`, `PTGS2`, `ACHE`, `MAOA`, `MAOB`, `CYP3A4`, `HMGCR`, `DHFR` and the rest
- every kinase not in the snapshot — `BTK`, `ABL1`, `BRAF`, `SRC`, `JAK1`, `JAK2`, `JAK3`
- every transporter — `SLC6A4`, `SLC6A3`, `ABCB1`
- the voltage-gated channels `SCN5A` and `KCNH2`
- all 19 non-human targets, including `pncA`, `embB`, `inhA`, `folA`, `UL23` and `nfsA`

The remaining 3 are present in the snapshot but every ligand it names for them is already
labelled.

16 targets grow without reaching 50. The kinases are the clearest case: `FLT3` 2 to 12, `KDR` 3 to
20, `EGFR` 4 to 15, `MET` 1 to 7, `KIT` 4 to 11, `ALK` 1 to 4. The snapshot holds real inhibitor
pharmacology for them, just not fifty compounds' worth.

**So the 50-label target is not reachable for most of this panel from the sources in the
repository.** Reaching it would need a pharmacology source with enzyme, kinase and transporter
coverage — a ChEMBL activity import rather than the structure-only snapshot we hold. Until then
the honest figure per target is what the evidence supports, and this document is the record of it.

## Two findings from the same measurement

**The `Tretinoin` row is mis-drawn, confirmed independently.** Pinned `tretinoin` (all-trans
retinoic acid) is `SHGAZHPCJJPHSC-YCNIQYBTSA-N`; the stored `Tretinoin` row,
`CC1=C(C=CC(C)=CC=C(C)C=CC(=O)O)C(C)(C)CCC1`, yields `XJJMOYWPACUDRV-UHFFFAOYSA-N`. The **first
InChIKey block differs**, so this is a connectivity error and not a stereochemistry one — the
chain methyl is on the wrong carbon. No label was proposed from it, and `RARA` loses nothing,
because pinned `tretinoin` resolves by InChIKey to `CHEMBL38`, already one of its labels.

**54 compounds are present in the library under a different name than the pinned source uses.**
These need an alias or a rename, not a new row, and they cannot simply be added under the pinned
spelling because target matching is exact and case-sensitive: `Ibrutinib` and `ibrutinib` would be
two labels for one compound. Recorded with their GtoPdb identifiers and InChIKeys for whenever
aliasing is taken on.
