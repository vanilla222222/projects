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

## Structure search

Paste a concrete SMILES query or use the connectivity sketcher. Identity preserves element, isotope, charge, hydrogen count and bond labels; specified stereo can be required or ignored. No tautomer or salt standardization is applied. Substructure matching is topological and ignores stereo, with explicit isotope/charge constraints retained. Similarity uses this project's unfolded ECFP4 bit sets (optionally stereo-aware) and Tanimoto; it is not RDKit's fingerprint implementation or a pharmacology prediction. Matching atoms are highlighted for identity/substructure hits. A connectivity sketch does not assign stereochemistry, isotopes or charges; use SMILES for those.

The background worker scans the full composed library and displays at most 100 hits, retaining the total. Cancelling terminates the worker. Each graph match has a search budget; parser failures and budget limits are reported as unresolved rather than negative results. A cooperative asynchronous fallback supports environments without workers. Tests cover graph/stereo/charge/isotope constraints, atom mappings, sketches and cancellation.

## Family SAR explorer

A concrete core is matched to measured members of the selected family. Assay/source groups preserve target, receptor/host species, tested form, units and context. Only exact positive numeric EC50/IC50/Ki/Kd observations with reported assay and species enter quantitative views; source classifications and bounds are excluded. Duplicate stable aliases of the same curated observation are collapsed. Default 2C plots preserve the three published study groups and their 32 observations.

Depictions highlight the matched core and use rigid 2D alignment without reflection on common drawing bounds. They are not 3D conformations or a maximum-common-substructure claim. Log-endpoint plots show Emax only where every observation supplies the same reference; otherwise the vertical dimension simply lists observations. SD bars remain SD, with no significance claim, averaging or cross-study pooling. Numeric tables and source locations remain accessible alongside the plots.

## Matched molecular pairs

`tools/build-reference-pairs.py` generates single-cut relations only from the 107 reviewed curated source graphs. It includes hydrogen substitutions, requires a common core of at least six heavy atoms and half of each parent, and limits variable fragments to eight heavy atoms. Cuts are non-ring single bonds. Every retained core/variable fragment pair is reassembled with RDKit and must reproduce the full source isomeric graph; no stereo is stripped. Symmetric alternatives can yield multiple valid relations for one compound pair. The index contains 647 structural relations, not 647 independent experiments.

The browser verifies stable graph witnesses against the current library. Endpoint differences require exact positive measurements for both compounds, the same endpoint/units and reported assay/species/form/context/source group. Bounds and classifications never produce exact fold changes. B/A is the concentration-endpoint ratio; Δp(B−A) = log10(A/B), so positive means a lower concentration endpoint for B. This is not an Emax difference or statistical significance claim. User-selected 10/100/1000-fold thresholds flag activity-cliff candidates only. Family/target filters, structural-only mode, pagination, fragment depictions and source links expose the limits.

Rebuild/check with `python tools/build-reference-pairs.py [--check]`. The index pins its input and builder hashes and RDKit version.

## Probe and control finder

Only compounds explicitly documented with a probe role in graph-guarded curated records are admitted. The current source collection contains two probe identities, (+)-JQ1 and GSK-J1, with their documented controls. Target/assay phrase and species filters operate on source-reported context; no gene/domain equivalence or probe status is inferred. Related controls from another reported domain/assay remain visible with an explicit scope warning. The optional matched-control requirement demands an explicit negative-control relation with matching reported target, species, assay and source.

Control values retain their participant, relation operator and assay. Source caveats remain visible: BET-family binding does not establish BRD4-only or cellular selectivity, and GSK-J1's KDM5 caveat remains qualitative. No explicitly designated quantitative counter-screens are currently imported; this is shown as missing evidence, not selectivity. Future curated assay rows may use `counterScreen: true` to identify their documented purpose; ordinary target observations are not silently reclassified as counter-screens.

## Claim-to-experiment tracing

Each dossier opens a trace from the stored graph and identity witnesses to reported actions, numeric observations, imported binding, controls, measured properties and relationships. Claims group statements for the same target/species/endpoint or explicit relation; each original source row retains its assay, conditions, bounds, uncertainty, source location, snapshot hash and raw witness. Source classifications do not become new functional measurements, binding does not establish an action, hydration free energy does not become solubility, and relationships do not establish conversion rates.

Known identity and action review candidates remain attached to affected claims. Row counts are counts of imported source representations, not independent experiments or replications; the same publication may appear through multiple imports. Primary-figure-derived identifiers retain their stated origin and are not described as independently registry-confirmed. Relationships only describe their explicitly indexed participants. Missing evidence stays unknown.
