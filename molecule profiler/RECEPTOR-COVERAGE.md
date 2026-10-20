# Fifty-entry receptor coverage goal

The project goal is at least **50 distinct source-linked ligand profiles for
every receptor/assembly record in the current catalog**. The catalog currently
has 146 records. This is a coverage target, not a claim that fifty experimentally
established ligands exist for every orphan receptor or assembly.

The explorer shows two separate quantities: legacy/imported listed names and
source-linked distinct profiles. A long legacy list is not automatically a
verified assay dataset. Source-linked profiles count only current, resolved
structure/evidence links with audited graph-group keys; aliases, stale structure
snapshots and unresolved names cannot inflate the progress figure. Distinct
profiles are not independent scaffolds and do not establish predictive accuracy.

## First assay-linked expansion

The first batch targets HRH2, CHRM1, CHRM2, CHRM3, ADRB1, ADRB2, ADORA1, ADORA2A,
AGTR1 and CYSLTR1. These already have scoring rows and were below the old
50-listed-name target. New unnamed research compounds use stable ChEMBL IDs
rather than recalled drug names. Existing library names are reused only when
the isomeric canonical molecular graph agrees with the source structure.

`tools/curate-receptor-bindings.py` checks the human single-protein target against
a UniProt accession and the primary gene-symbol annotation. It accepts ChEMBL
literature-source binding Ki/Kd values only: exact `=` relation, nM units,
0 < value <= 1,000, no duplicate/data-validity flags or assay variants. Assays
must have direct target assignment, confidence score 9, and explicit human
organism. Unknown-origin descriptions are excluded. A confidence score of 9 is
ChEMBL's assay-to-target mapping category, not confidence in our prediction or
an independent assay quality rating.

Each selected association retains a compound ID, activity ID, assay ID,
document ID, assay description, standardized value, source graph, target identity
and cached-request hashes/times. The snapshot is in
`validation/chembl-receptor-binding-batch.json`. All imported annotations are
**binding_only**. Neither ChEMBL's action label nor scaffold resemblance is used
to assert agonism, antagonism, selectivity or clinical effects.

The script groups protonation/tautomer alternatives for counting with RDKit
(uncharger and tautomer canonicalization; stereo removal disabled). It stores
the source molecular graph unchanged apart from SMILES serialization. This
counting convention does not establish pharmacological interchangeability.
Incomplete tautomer enumerations, disconnected structures, unsupported elements, radicals, very small/large
structures and browser/RDKit formula disagreements are excluded. Selection is
by activity ID among the examined rows, capped at 2,000 rows per target by
default. It is neither exhaustive nor optimized for scaffold diversity, and the
report records source availability and truncation.

## Reproduce and extend

```sh
python -B tools/curate-receptor-bindings.py --output candidate-batch.json
python -B tools/curate-receptor-bindings-test.py
```

The first command is read-only by default. `--apply` is the explicit mutation
mode, adding structures, associations and binding-only annotations. Cached
responses permit repeatable `--offline` runs. Reapplying a panel replaces this importer’s previous binding-only annotations
for that panel and preserves other manually curated evidence. The tool checks source hashes before
applying so changes made during acquisition cannot be overwritten.

For additional targets, first add and independently verify the gene/accession
mapping in the tool. It refuses ambiguous target mappings. Missing target rows require the explicit
`--add-targets` mode described below. Complexes require an assembly-aware workflow; single-protein assay
confidence rules must not be applied to them as if they were ordinary GPCRs.
A failed lookup or a shortfall must stay visible, not be filled with inferred
ligands. Extending the query cap changes the examined population and must be
recorded with the resulting source snapshot.

Use the explorer's **Export 50-entry coverage report** button for all 146 rows,
including empty panels. Run the receptor coverage, catalog, reference integrity,
independent structural audits and complete regression suite after additions.
Regenerate retrieval benchmarks for the new reference snapshot. Internal
retrieval performance remains separate from experimental pharmacology validation.

Sources:
- [ChEMBL web-service documentation](https://chembl.gitbook.io/chembl-interface-documentation/web-services/chembl-data-web-services)
- [ChEMBL assay confidence categories](https://chembl.gitbook.io/chembl-interface-documentation/frequently-asked-questions/chembl-data-questions)

## Completed first batch

Nine panels each have 50 sourced profiles: HRH2, CHRM1, CHRM2, CHRM3, ADRB1, ADRB2,
ADORA1, ADORA2A and AGTR1. CYSLTR1 has one qualifying profile and a visible gap of
49 under this query policy; that is not a claim that other ligands or functional
evidence do not exist. The batch adds 451 assay-linked associations and 334 new
structures, taking the library from 2,782 to 3,116 entries. Across the catalog,
33 panels now have at least 50 resolved listed names; nine have reached the
stricter newly sourced 50-profile target. The remaining catalog backlog is
retained in `validation/receptor-ligand-coverage.json`.

The expanded structures exposed small-ring aromaticity support that was missing
from the descriptor engine. Three-/four-membered conjugated rings now participate
in aromaticity perception, with additional RDKit regression controls. The general
RDKit integrity audit also treats nonaromatic unsaturated sulfur rings as review
flags, because valid thiazolinone-type structures can produce that pattern;
invalid structures and formula contradictions still fail. These corrections do
not change the imported binding observations or infer functional mechanisms.

## Second batch and new scoring rows

The next batch covers MTNR1A, PPARG, RARA, P2RY12, HRH3, HRH4, CHRM4, CHRM5,
MTNR1B, ADRB3, DRD5, ADORA2B, HTR4 and HTR5A. Its source snapshot is
`validation/chembl-receptor-binding-batch-2.json`. Source availability and filter
shortfalls remain recorded for every panel.

The explicit `--add-targets` option permits new scoring rows when the catalog ID
is the exact primary gene, the catalog lists only that gene, the receptor kind
is supported, and a unique human ChEMBL single-protein target matches the
reviewed accession and primary gene symbol. At least one selected assay-backed
ligand is required before a new row is written. Assembly records and ambiguous
mappings are rejected. Each new row retains unassigned functional action and
selectivity; registration alone does not establish a predictive model.

```sh
python -B tools/curate-receptor-bindings.py --add-targets \
  --genes MTNR1A,PPARG,RARA,P2RY12,HRH3,HRH4,CHRM4,CHRM5,MTNR1B,ADRB3,DRD5,ADORA2B,HTR4,HTR5A \
  --output candidate-batch-2.json
```

Use `--apply` after reviewing the snapshot. Imports preserve manual annotations,
retain per-record ChEMBL release provenance, and prepare all output files before
writing them. Source hashes cover the catalog as well as the molecule, target
and annotation datasets. Regression checks examine every published batch, rather
than only the first one. Explorer search now includes linked ligand names and
ChEMBL molecule IDs, making the added references discoverable by their source ID.

The completed second batch adds 679 associations and 565 structures. MTNR1A,
PPARG, P2RY12, HRH3, HRH4, CHRM4, CHRM5, MTNR1B, ADRB3, DRD5, ADORA2B, HTR4 and
HTR5A each reach 50 source-linked profiles; RARA has 29 and retains a gap of 21.
The catalog now has 22 panels at the strict sourced-profile goal and 46 with at
least 50 resolved listed names. Ten new scoring rows reduce awaiting catalog
registrations from 95 to 85. The library has 3,681 structures and 142 scoring
targets, with 1,130 source-linked ligand observations across both batches.

These figures reflect the stated Ki/Kd query policy. Shortfalls are not proof
that no additional binding-IC50, functional or other experimental evidence
exists. Those endpoints require an explicitly documented extension of the
curation protocol, with their experimental interpretation preserved.
