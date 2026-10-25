# Reference and model review fixes

## Retrieval benchmark and the running app

The app and benchmark use `ReferenceContext.create` to compose the same base
library, reviewed identity corrections, curated structures and target panels.
The benchmark excludes property-only target references, as the app does. Only
listed target references need fingerprinting during benchmark generation.

Nearest-neighbour ties follow the actual app: nearest score, top-three mean,
then original target order. Toy holdouts compare the optimized evaluator against
the app ranking engine across five fingerprints and both metrics, including
shared ligands, aliases, empty sets and singleton panels. Historical cached
score-only evaluation remains available for reproducing older reports.

`data/benchmark.js` carries composition metadata and SHA-256 witnesses for its
input data and ranking implementation. Validation rejects stale source bytes.
The browser withholds numbers on a composition mismatch, another method, or a
filtered target/organism league. Name holdout can retain structural aliases;
the UI labels this limitation. It is not scaffold-held-out or external validation.

Regenerate with `node tools/retrieval-benchmark.js --write` after relevant data or
ranking changes. Run `node tools/reference-context-test.js` and
`node tools/retrieval-evaluate-test.js` to check the source and parity contracts.

## Similarity pool eligibility

Unassigned bulk ChEBI/DrugCentral imports no longer enter the default similarity
pool solely because they have a source-provided name. Graph-matched imported
receptor evidence, reviewed pharmacology/control records, or explicit named
target membership retains eligibility. Property/illustrative flags still exclude
entries. Manually named structural references retain their existing scope;
no class label becomes proof of pharmacology. The optional checkbox restores the
complete structural pool. Nothing is deleted or relabeled as inactive, and the
inspector/structure search still covers the entire collection.

## BBB comparison uncertainty

The report now retains the exact held-out row pairing, probabilities, fixed
predictions, scaffold IDs, passive-screen status and applicability decisions.
Both methods receive 95% intervals from 2,000 paired scaffold-cluster percentile
bootstrap resamples: whole scaffold groups move together, and each resample uses
the same multiplicities for both methods. The report includes a paired interval
for their balanced-accuracy difference, plus model ROC AUC and Brier intervals.
Single-class bootstrap draws are counted and excluded explicitly.

An exact two-sided binomial McNemar comparison is also reported, with all four
correct/incorrect pair counts. It tests marginal correctness, not balanced
accuracy, and treats compound pairs as independent; shared scaffolds limit that
p-value's interpretation. It does not settle the balanced-accuracy gain. The
cluster interval is conditional on the fixed split and fitted model, and does
not cover retraining, split selection or external-population uncertainty. No test
result changes calibration, threshold, domain gate or model weights.

The independent binomial and bootstrap fixtures run with
`python tools/bbb-statistics-test.py`. Reproduction also runs native/exported
prediction parity and checks the numerical model payload against its prior hash.

## Sparse panels and binding-only associations

Target rows now report distinct fingerprint profiles separately from name
counts. One-profile panels are labeled lookup-only and do not display a recovery
percentage even when aliases would permit a name-holdout trial. Panels below
five profiles are marked sparse; panels below the 50-profile goal remain visibly
below goal. Having 50 structural profiles does not itself establish source
qualification, assay coverage, selectivity or predictive validity. These changes
do not manufacture new references or claim all target panels meet the goal.

Fourteen class-derived ADRA1B associations were removed from its binding-only
panel because no graph-matched ADRA1B source evidence for those named entries was
present in the current evidence index. The original 50 assay-linked references
remain. This is a correction to imported panel scope, not evidence that the
removed compounds are inactive. Metadata source witnesses, diversity audit and
the composed retrieval benchmark were regenerated.

## Fingerprint preparation and caching

Similarity reference fingerprints are calculated in a classic worker. The UI
shows preparation progress and ignores results from an older query/view. Worker
construction/loading failures fall back to cooperative batches with an
approximately six-millisecond work budget between event-loop yields. Target
ranking and other analysis work retain their separate implementation.

An IndexedDB cache stores reference fingerprints only, preserving Sets and Maps.
Keys include a SHA-256 engine version, the reference-composition change key and
fingerprint method. The engine version pins parser, molecule builder, stereo and
fingerprint source bytes; regenerate it with `node tools/build-fingerprint-version.js`
after changing those files. Invalid/incompatible cached values are ignored;
unavailable storage and quota failures do not prevent computation. In-memory
caches also invalidate when an entry's stored graph changes.

Worker imports, five-method native parity, structured-clone persistence,
version/graph invalidation, blocked-worker fallback and a complete composed
library scan are exercised by `tools/reference-fingerprints-test.js`. DOM checks
exercise the app's blocked-worker fallback and default eligibility pool. Full
CSV exports await the same pool as the similarity table and abort if selection
settings change while preparing fingerprints. No measured browser timing or
complete elimination of other main-thread analysis costs is claimed.
