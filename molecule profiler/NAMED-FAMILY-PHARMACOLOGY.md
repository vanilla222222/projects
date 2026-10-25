# Additional structural families and human pharmacology

Five previously absent structural filters now classify the composed library.
Nineteen selected named references have exact IUPHAR structures, full
source-provided InChIKeys, and a cited human receptor action classification.
Their source graphs already exist in the library and are reused.

| New structural family | Matching graphs | Selected named references and human action assignments |
| --- | ---: | --- |
| Aryloxypropanolamines | 101 | Atenolol, betaxolol and metoprolol: ADRB1 antagonists; propranolol: ADRB2 antagonist |
| Imidazolines | 82 | Clonidine and brimonidine: ADRA2A agonists; naphazoline and oxymetazoline: ADRA2A partial agonists |
| Tetrahydrobenzazepines | 18 | Fenoldopam: DRD1 agonist; SKF-38393: DRD1 partial agonist; SCH-23390: DRD1 antagonist |
| Phenothiazines | 93 | Chlorpromazine, fluphenazine and perphenazine: DRD2 antagonists; promethazine: HRH1 antagonist |
| Aminobutyrophenones | 59 | Haloperidol and benperidol: DRD2 antagonists; spiperone: DRD4 antagonist; pipamperone: HTR2A antagonist |

Matching counts describe explicit structural queries, not counts of compounds
with experimentally established activity. Only the selected ligand/target pairs
receive the cited action. Other targets and activities are outside this selected
record; no global selectivity or exclusive mechanism is assigned.

## Evidence scope and attribution

The source is the pinned **IUPHAR/BPS Guide to PHARMACOLOGY 2026.3.1** snapshot
in `validation/sources/receptor-actions-iuphar.json`, licensed **CC BY-SA 4.0**.
These adapted selections retain the complete selected ligand and interaction
rows, original target and ligand IDs, direct source URL, references, and snapshot
SHA-256 per record. Raw Type and Action fields are both preserved, including a
source's finer classification such as “Full agonist.”

A curated action classification is not a newly transcribed functional assay
measurement. Records are exported as `evidenceType: source_classification`,
with their source witness, and are visibly labeled in the receptor explorer.
The importer does not convert affinity into an EC50 or efficacy measurement.
The existing measured 2C and MOR observations remain `functional` evidence.

The annotation contract requires the human species, target gene, ligand and
target IDs, source URL, action mapping and snapshot identity to agree with the
selected row. A target/action mismatch or a different graph loses its
annotation. These additional classifications do not count toward the strict
50-profile binding quota.

## Identity conflicts

The older `Fenoldopam`, `SKF-38393` and `SCH-23390` named graphs differ from the
source graphs. Their conflicts are recorded explicitly. The source graphs are
already present under other stable reference keys, so their verified source
names are made searchable and only those exact graphs receive the new action.
Historical namesakes are not silently given the source pharmacology.

## Reproduction

The five SMARTS definitions and positive/negative fixtures are in
`data/family-definitions.json`. Reviewed entries are
`data/curated-reference-entries/family-002-*.json`.

```sh
python tools/build-curated-references.py --check
node tools/named-family-actions-test.js
node tools/family-pharmacology-test.js
```
