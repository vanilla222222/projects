# Existing-reference measurements, scaffold tags and source assay context

FreeSolv batch004 adds 100 experimental hydration free energies to existing
exact graphs. The pinned source rows, original units and identity witnesses are
retained. Of the uncertainties, 92 are source-assigned defaults and eight are
source estimates; neither is relabeled as a standard deviation. Two references
remain unresolved SAMPL4_Guthrie labels. One row supplies two DOI links. Missing
temperature and pH remain unknown. The experimental and calculated GAFF columns
happen to agree for neopentane; the imported value still comes from the
experimental column. Prior batches and preferred names remain unchanged.

ChEMBL assay annotations now expose literal source format/BAO identifiers,
assay-type, confidence and target-relationship descriptions, subcellular fraction
and test type where retained. These describe the source record, not an
independent quality score, selectivity or host-cell species. All 1,881 binding
records preserve their existing numbers and exact-graph gate. The 31 source
action classifications remain separate from measurements.

Twenty-two retained activity records contain source timing context. Both
original and ChEMBL-standardized representations are displayed without local
conversion; timing is not a measured compound property. Five records report
original pA2 endpoints standardized to Kd by ChEMBL. A visible note distinguishes
that database representation from a directly transcribed equilibrium-binding
measurement. No functional action is inferred from it.

Two additional explicit ring queries tag quinuclidine and 1,4-dihydropyridine
scaffolds on existing structures. These are substructure membership, permit the
specified substitution/charge cases and imply no receptor action. Positive and
neighboring-ring controls cover the query boundaries. ChEMBL coverage tests now
use nonempty ChEMBL identifiers rather than mere membership in the descriptor
file, which covers the whole effective library.

Generated artifacts are rebuilt through tools/repin.py. Native importer,
structural-boundary and assay-source tests supplement the complete Node suite
and dossier DOM checks. The release history is pinned to the actual published
commit after validation.
