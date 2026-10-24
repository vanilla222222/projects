# Named amine study collection

This update adds 61 source-named phenethylamine- and tryptamine-related compounds and exposes named study collections in the reference-library filters. Existing compounds are reused rather than duplicated. These collections include familiar compounds and named research metabolites; not every name is widely known.

New examples include N-acetyltryptamine, N-feruloylserotonin, N-arachidonoylserotonin, N-palmitoylserotonin, N-oleoylserotonin, N-stearoylserotonin and L-tryptophanamide. The source records are ChEBI curated entries, not invented names or ChEMBL-only labels.

## Different amide structures

N-acyltryptamines have an amide on the terminal side-chain nitrogen. N-acetyltryptamine and melatonin fit this structural motif. Indole-3-carboxamides attach a carboxamide directly to the indole ring. Tryptophanamides contain the amino-acid-derived carboxamide structure. These motifs have separate library filters. “Tryptamide” alone is ambiguous; inspect the actual graph. Motif membership does not imply shared pharmacology or activity.

## Source and validation

Source: ChEBI, EMBL-EBI, curated three-star SDF snapshot 2026-10-06, retrieved 2026-10-24, https://ftp.ebi.ac.uk/pub/databases/chebi/SDF/chebi_3_stars.sdf.gz . Data licensed CC BY 4.0, https://creativecommons.org/licenses/by/4.0/ . Selected records and calculated tags are adaptations; no endorsement is implied.

Some supplied indole SMILES disagree with the source InChI. This import explicitly uses the supplied InChI, requires its full InChIKey and elemental formula to agree, then validates browser serialization against that graph. Both the original source SMILES and the source InChI are retained in the import evidence. No nitrogen hydrogens are guessed or manually repaired. Source names, charges and supplied stereochemistry are preserved; no analogues are generated.

`validation/sources/amine-study.json` retains the selected source records; `validation/amine-study-import.json` records accepted and excluded entries. Structural checks establish source consistency, not experimental identity, potency, safety, human effects or validated ADME predictions.
