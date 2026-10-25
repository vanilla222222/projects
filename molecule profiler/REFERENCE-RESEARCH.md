# Reference research tools

## Compound dossiers

Open a dossier from any library result, or use `library-inspector.html?reference=STABLE_LIBRARY_KEY`. The panel stays beside the results on wide displays and follows them on smaller screens. It shows the supplied graph, formula, source identities, aliases, exact-graph evidence, relationships and identity warnings. Evidence remains expandable and includes original source rows and snapshot hashes where available. No selected sets or notes are persisted.

Evidence attaches through the existing exact stored-graph guards. Source names can label stable code keys without changing their identities. Multi-compound observations select only that participant's structured values. Unreported conditions remain unreported; a source-designated control does not establish universal inactivity. Historical imported receptor records remain visibly identified as imports and do not constitute a new independent identity review.

Validation: `node tools/reference-research-test.js`; browser DOM: `NODE_PATH=... node tools/reference-research-dom-test.js`.

## Assay-aware comparison

Add up to six compounds from a dossier or by exact name/key. This is a transient comparison, not a saved workspace. Groups require the same reported target, receptor and host species, assay, tested form, endpoint, units, evidence kind, conditions and source. Missing assay/target species keeps individual observations separate. Different sources and signalling pathways are never pooled. Matching fields do not establish complete experimental equivalence. Values are not averaged, converted across endpoint types or ranked. Emax retains its reference agonist and censored control values retain their relation operator. Identity review flags stay visible.

## Family evidence matrix

The matrix includes structural families and compound series from existing graph tags. Compound rows and target columns paginate separately; filters select human targets or all reported species and optionally hide entries without evidence. Each cell links to the dossier and opens that target's evidence. Multiple evidence states may coexist. Measured functional evidence, imported binding, curated classifications, assay measurements, source-designated controls and bounded low activity remain distinct. Missing evidence never becomes a negative result. Identity warnings remain visible on affected cells. Counts describe indexed entries, not independent substances or complete experimental coverage. Broad source target names are retained rather than silently mapped to a single gene. Family indexing and evidence matrices are generated only when requested.

## Conflict review centre

Identity candidates come from graph-guarded curated identity flags. Action candidates collect differing explicit action classifications for the same stored graph, target and receptor species. Full agonist is normalized to agonist for this comparison; partial and inverse agonism remain distinct. This detector does not adjudicate differences: assay conditions, pathway and reference efficacy can explain them. Binding affinity is never used to infer an action conflict.

The centre retains all source witnesses and links both legacy and source graphs. `data/reference-reviews.js` records dated curation decisions and their context. Guarded/scoped unresolved states document that new assignments were withheld or limited; they do not claim identity repair or source adjudication. Unreviewed candidates explicitly show no decision history. New decisions are made through reviewed version-controlled data changes, not by dismissing a warning in the browser.

## Coverage-driven curation queue

Tasks follow a transparent workflow order: identity disagreements, action differences, missing imported functional evidence, missing assay-matched negative-control links, and sparse curated scaffold coverage. This order is not an evidence-quality score. Families with imported classifications/binding but no directly measured functional observation produce functional-evidence tasks. A reported functional result without a transcribed number produces a separate transcription task. Controls are matched by target, receptor/host species, assay and source; a missing imported relation does not mean the original study omitted controls. Source-designated controls are not universal inactivity claims.

Scaffold tasks use the existing audited curated-panel ring-scaffold counts. The planning threshold is explicitly selectable (2, 3 or 5); acyclic profile counts remain separate. It is not a whole-library diversity or prediction-accuracy metric. Tasks link to dossiers, family matrices, target references, review candidates and sources. Candidate lists point to existing index entries rather than recommending arbitrary new structures. Families overlap, so their tasks and compound counts must not be summed as independent gaps.

The queue is generated on demand, has category/search filters and pagination, and exports the full filtered task list with source URLs as CSV. It never changes source evidence, auto-resolves disputes, or persists researcher selections. Curation decisions still require a reviewed data change.
