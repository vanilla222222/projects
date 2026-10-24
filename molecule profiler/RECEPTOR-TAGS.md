# Receptor binding and action tags

The reference explorer provides tags for every one of the **146 receptors or receptor groups** in the existing receptor catalogue, and 14 action categories. Each target has separate binding and receptor/action-pair tags. Select **Show receptor tags without imported evidence** to see disabled zero-count combinations: they mean no imported evidence, not that the action is impossible or the compound inactive.

Use **Receptor action: DRD2 · Antagonist** when a receptor and action must belong to the same source association. Combining the independent **Receptor: DRD2** and **Action: Antagonist** filters can also include a compound with DRD2 evidence and antagonism at another receptor. Existing AND/OR/exclusion controls apply to all tags.

The current snapshot annotates **1,705 library entries**, including **509 with action classifications across 115 receptor groups**. It includes 1,878 exact-graph IUPHAR-linked library/source associations and 1,820 existing ChEMBL binding associations; these counts overlap and are not independent experiments. See the [per-receptor coverage report](validation/library-receptor-tags.json).

## Action vocabulary

Agonist, full agonist, partial agonist, antagonist, inverse agonist, modulator, positive allosteric modulator (PAM), negative allosteric modulator (NAM), neutral allosteric ligand, channel blocker, channel opener, inhibitor, activator and biased agonist have separate tags. Full/partial/biased agonists also receive the broader agonist tag; allosteric classifications receive the broader modulator tag. Inverse agonism is kept separate from agonism and neutral antagonism. Some categories currently have no imported matches.

These are **source classifications**, not predicted activities or newly established experimental conclusions. A source can classify a compound as an agonist while the listed measurement is a binding assay. The classification and measurement must be interpreted separately. Affinity values, activity thresholds, compound names, structural motifs and broad historical class labels never generate a functional-action tag. Conflicting classifications are preserved with their source records rather than silently resolved.

## Sources and attribution

- **IUPHAR/BPS Guide to PHARMACOLOGY (GtoPdb), release 2026.3.1, published 2026-10-12**, retrieved 2026-10-24. [Database](https://www.guidetopharmacology.org/), [download information](https://www.guidetopharmacology.org/download.jsp), [web services](https://www.guidetopharmacology.org/webServices.jsp). Adapted source records and their derived classifications are distributed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Attribution: IUPHAR/BPS Guide to PHARMACOLOGY and its curators. These adaptations filter human records, join exact graphs, map catalogue IDs and organize source classifications as tags; no endorsement is implied.
- Existing **ChEMBL_37** assay-linked binding annotations retain their [CC BY-SA 3.0 attribution](CHEMBL-DATA-NOTICE.md) and remain binding-only. Their existing target-link and exact stored-SMILES guards are retained.

The pinned subset at `validation/sources/receptor-actions-iuphar.json` retains the original selected CSV rows, version, original-download URLs, full-download SHA-256 hashes, human target/HGNC mapping rows and ligand structures. The source snapshot contains only relevant matched data rather than an entire database mirror. Derived source links and assay, receptor-site, ligand-context, subtype and publication fields are available under **Receptor evidence** on each result row. A source link identifies the target/ligand association; the pinned row preserves the specific imported measurement.

## Identity and target mapping

Only exact canonical isomeric-graph matches to stored library SMILES are accepted. No salt stripping, neutralization, tautomer matching, stereo relaxation, name-only matching or similarity propagation is used. A source record can annotate multiple library entries only when their exact stored graphs agree. At runtime, changed stored SMILES invalidate that entry's receptor metadata.

Single targets are mapped by human HGNC symbol. Explicit source complex IDs map GABA-B and 5-HT3 complexes. GABA-A, NMDA, AMPA, kainate, glycine and 5-HT3 catalogue entries are broad receptor groups: a tag can represent a source-tested member or subunit context within that group. It does **not** establish the action at every subtype or subunit composition. The original source target and assay composition remain attached. Specific nicotinic heteromers are not inferred from an isolated subunit record.

Human target records only are imported. An action depends on the source's assay, concentration, pathway and reference/probe ligand where reported. Missing context remains missing; the app does not invent it. No clinical benefit, selectivity, potency ranking or safety is inferred.

## Reproduce and verify

Run `python tools/build-receptor-tags.py` with RDKit installed to regenerate from the pinned subset. To refresh raw inputs, download the three CSV files named in the snapshot, prefix their local filenames with `iuphar-`, and pass `--source-dir DIRECTORY`; mixed release headers are rejected. Source refreshes require review of release, identities and classifications.

Run `node tools/receptor-tags-test.js` and `python tools/receptor-tags-source-test.py`. `validation/library-receptor-tags.json` records input/output hashes and per-receptor action coverage. The existing graph-tag and molecular-name datasets are unchanged.
