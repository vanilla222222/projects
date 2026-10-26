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

### Prefer named pharmacology references

For new expansions, prefer drugs, endogenous ligands and established research
compounds with source-provided names and documented target evidence. Use
`--named-only` to require a ChEMBL `molecule_pref_name` on each qualifying
activity record. Database IDs and CAS numbers alone do not qualify as names.
New structures use the preferred name; if that name already labels a different
graph (ignoring capitalization), a bracketed ChEMBL compound ID distinguishes
the source form. Exact graph matches reuse their existing stable library keys.
The original source name and compound ID remain in the activity snapshot.
A further conflicting name/graph aborts the import rather than silently
relabelling a different structure.

This filter adds a naming requirement to the same strict human Ki/Kd binding
protocol. It does not establish an approved indication or functional mechanism.
Binding-only evidence remains binding-only; agonism and antagonism require
separate functional evidence. Keep shortfalls visible instead of adding unnamed
structures merely to reach fifty. Historical identifier-based batches remain
available and are not removed by this preference.

The next named-compound panel uses reviewed human UniProt mappings:
[OPRM1/P35372](https://www.uniprot.org/uniprotkb/P35372/entry),
[OPRD1/P41143](https://www.uniprot.org/uniprotkb/P41143/entry),
[OPRK1/P41145](https://www.uniprot.org/uniprotkb/P41145/entry) and
[OPRL1/P41146](https://www.uniprot.org/uniprotkb/P41146/entry).
The importer independently checks the accession and primary gene annotation
against the human ChEMBL single-protein target before accepting its assays.

```sh
python -B tools/curate-receptor-bindings.py --named-only --add-targets \
  --genes OPRM1,OPRD1,OPRK1,OPRL1 --output named-opioid-candidate.json
```

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

Coverage cards, evidence filters, and exported coverage reports apply the same annotation contract. Invalid source URLs, missing assay context, and unsupported functional-action claims cannot count toward the 50-profile goal. Malformed annotations are rejected rather than crashing coverage browsing. This contract checks record completeness and consistency; it does not independently validate the cited experiment.


## Third batch: adenosine A3 and alpha-adrenoceptors

`validation/chembl-receptor-binding-batch-3.json` retains the selected ChEMBL_37
assay records for ADORA3, ADRA1A, ADRA1B, ADRA1D, ADRA2A, ADRA2B and ADRA2C.
Each panel has 50 distinct source-linked profiles under the same Ki/Kd policy.
The batch adds 350 binding associations and 177 structures, reusing exact
isomeric graph matches already in the library. Five new scoring rows are
registered: ADORA3, ADRA1B, ADRA1D, ADRA2B and ADRA2C. Existing ADRA1A and
ADRA2A ligand lists are extended, preserving their earlier entries.

A3 reaches the 2,000-activity examination cap. The snapshot records this limit;
the selected profiles are neither an exhaustive inventory nor a diversity-
optimized sample. Multi-receptor target records, incomplete tautomer enumerations
and unsupported structures do not count. No functional action or selectivity is
inferred from these binding measurements.

```sh
python -B tools/curate-receptor-bindings.py --add-targets \
  --genes ADORA3,ADRA1A,ADRA1B,ADRA1D,ADRA2A,ADRA2B,ADRA2C \
  --output candidate-batch-3.json
```

Review the snapshot before adding `--apply`. Preserve all earlier batch snapshots
as historical source records.

After this batch, the library contains 3,858 structures and 147 scoring targets,
with 1,480 source-linked observations across the three snapshots. There are
29 catalog panels at the strict 50-profile goal and 51 with at least 50 resolved
listed names. Sixty-six catalog records link to scoring rows; 80 await them.
These are coverage counts, not independent scaffold counts or accuracy metrics.

`validation/receptor-batch-3-regression.json` records the local Node regression
run and its before/after source digest. The digest identifies the tested working
source; the recorded Git revision is its parent commit when the source is dirty.
Regression success checks implementation consistency, not experimental accuracy.

## Fifth batch: named opioid and nociceptin references

`validation/chembl-receptor-binding-batch-5.json` uses the named-only policy
above and records 110 human binding associations: OPRM1 36, OPRD1 24, OPRK1 44
and OPRL1 6. Each query examines at most 2,000 activity records and reaches that
cap. Gaps of 14, 26, 6 and 44 remain visible. These counts describe this bounded
query and do not imply that other named ligands or other endpoint types are
absent. No unnamed records are added to fill the gaps.

The batch adds 59 source structures and registers OPRL1 as a scoring target.
Some structures provide specified stereochemistry absent from older named
entries; they are retained separately and must not be described as 59 distinct
new drug identities. Existing graph keys and structures are preserved. Source
names retain their source capitalization; bracketed source IDs distinguish name
collisions between different graphs. Binding observations
do not assign agonism, antagonism, an indication or selectivity.

There are now 4,066 library structures, 150 scoring targets and 1,820 sourced
binding annotations. Sixty-nine catalog records link to scoring rows and 77
await them. Thirty-three panels meet the strict sourced-profile goal; 51 have
at least 50 resolved listed names. The updated coverage and scaffold snapshots
retain the distinction between list size, sourced profiles and chemical diversity.


## Fourth batch: dopamine and serotonin coverage gaps

`validation/chembl-receptor-binding-batch-4.json` records 230 ChEMBL_37 human
binding associations and 149 added structures. DRD1, DRD2, DRD3 and DRD4 each
have 50 distinct source-linked profiles. HTR1E has four and HTR1F has 26; their
gaps remain 46 and 24 under the unchanged strict Ki/Kd protocol. These two
receptors gain scoring rows only for the qualifying source-backed entries.
Shortfalls do not establish that other endpoint types or experiments are absent.

DRD2, DRD3 and DRD4 reach the 2,000-activity examination cap. The snapshot
retains the cap flag and all selected assay/document records. Existing dopamine
ligand lists are extended, not replaced. No functional action is inferred.

```sh
python -B tools/curate-receptor-bindings.py --add-targets \
  --genes DRD1,DRD2,DRD3,DRD4,HTR1E,HTR1F \
  --output candidate-batch-4.json
```

Review before applying. After this batch there are 4,007 structures, 149 scoring
targets and 1,710 source-linked binding observations. Thirty-three catalog
panels meet the strict 50-profile goal; 51 have at least 50 resolved listed names.
Sixty-eight catalog records link to target rows, while 78 await them.

The separate [scaffold-diversity audit](RECEPTOR-DIVERSITY.md) recomputes current
source-profile identities and describes ring-scaffold concentration. Its counts
are descriptive reference-set properties, not predictive validation.
`validation/receptor-batch-4-regression.json` stores the local regression run
and its tested source digest; the Git revision identifies the parent commit
when the tested working source is dirty.

## Sixth batch: incomplete curated panels remain lookup-only

`validation/chembl-receptor-binding-batch-6.json` examines TAAR1, GRM2, GRM5,
CNR1 and CNR2 with the unchanged named-only, human single-protein Ki/Kd protocol.
The 10,000-row cap is not reached by any of these queries: all 41, 205, 429,
2,682 and 3,745 returned activity rows, respectively, were examined. This is
complete for that bounded endpoint query, not all pharmacological literature.
Human UniProt gene/accession witnesses are retained in
`validation/sources/sparse-panel-target-identities.json`; ChEMBL independently
confirms each accession, primary gene symbol and single-protein target.

| Panel | Qualifying named binding profiles | Gap to 50 |
| --- | ---: | ---: |
| TAAR1 | 0 | 50 |
| GRM2 | 2 | 48 |
| GRM5 | 5 | 45 |
| CNR1 | 26 | 24 |
| CNR2 | 28 | 22 |

The import adds 61 binding associations and 32 source structures. Existing
curated functional/classification records and legacy identities remain intact.
Zero qualifying TAAR1 binding profiles does not invalidate its separately
sourced human functional observations or imply inactivity.

These five panels are **lookup-only**, excluded from both target-ranking modes
and the retrieval benchmark. Their compounds, source annotations and explorer
records remain inspectable. New curated panels default to lookup-only; the
binding importer admits a new panel to ranking only at the full 50-profile goal.
Reapplying an incomplete imported panel can lift that restriction once its
qualifying profile count meets the goal. Registration and display labels alone
cannot satisfy this admission rule. Earlier legacy ranking panels retain their
existing behavior and visible coverage limitations.

This resolves premature admission of the five panels to general ranking; it
does **not** claim their evidence shortfalls have been filled. Functional EC50,
binding IC50, non-human assays and unnamed structures have not been substituted
to inflate the strict named-binding counts. Neither meeting a coverage goal nor
an internal retrieval benchmark establishes predictive validity.

Reproduce acquisition with:

```sh
python -B tools/curate-receptor-bindings.py --named-only --add-targets \
  --genes TAAR1,GRM2,GRM5,CNR1,CNR2 --max-activities 10000 \
  --output candidate-batch-6.json
```

Review before applying. The name-witness refresh tool accepts an earlier commit
only when every prior library entry is unchanged and additions introduce no new
CHEMBL-ID naming candidates. The GSK-J4 identity source row is now pinned in a
small standalone snapshot with its original library commit and hash, so library
extensions cannot invalidate that unchanged source observation.
