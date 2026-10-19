# Target ranking and metabolism engine revisions

These revisions improve reference retrieval, deterministic search behaviour, diagnostics and data consistency. They do not establish experimentally validated prediction of receptor binding, functional action, enzyme isoform, clearance, metabolite abundance or human exposure.

## Target retrieval: ensemble-v1.1

The optional experimental multi-fingerprint mode compares each query/reference pair using three 2D views: stereo-aware ECFP4, FCFP4 pharmacophore features and atom-pair fingerprints. The per-reference score is their geometric mean Tanimoto. Target ranking uses 70% of the nearest-reference score plus 30% of the mean of the top three available distinct fingerprint profiles. Those weights are fixed engineering choices, not fitted coefficients or binding probabilities. This is not SwissTargetPrediction's trained 2D/3D method; there are no molecular conformers, protein structures, docking scores or trained activity classifiers here.

The index is built once over referenced ligand names. Query fingerprints and rankings are cached on each molecule. Property-only references, missing names and parse failures are excluded and counted. References indistinguishable under stereo-aware ECFP4, ECFP6 and atom-pair count profiles are grouped for ensemble support. Such grouping is not canonical molecular identity and cannot establish independent scaffold diversity. Legacy scoring keeps name-level references and the chosen similarity-panel fingerprint/metric. In both modes, the displayed distinct-profile and support counts are deduplicated by fingerprint profile. Support always uses the ensemble definition below, regardless of the selected ranking metric. Matching query/reference profiles are explicitly flagged as reference matches, not independent predictions or proof of molecular identity.

The evidence view shows the top three supporting references and their component scores. The operational support count uses per-reference ensemble similarity at least 0.35 and all three component scores at least 0.20. These thresholds are uncalibrated and must not be interpreted as positive/negative binding cutoffs. Fingerprint views are correlated evidence, not independent experiments. A receptor-related target filter is available. Unlisted targets are unassessed, never predicted inactive. Neither mode infers agonism, antagonism, potency or selectivity from similarity.

Full CSV uses the selected ranking mode, target scope and organism; it records algorithm version, rank score, nearest score, mean, support count and applicability description. It retains the top-50 export cap. The minimum-score/display-count controls affect the on-screen view; the full CSV retains the top 50 in the selected biological scope. The old ECFP4/Tanimoto benchmark is not displayed as evidence for the ensemble or a different selected fingerprint/metric.

Legacy nearest-neighbour ranking remains the default because the latest internal comparison is mixed. The new method is available for explicit comparison, not presented as a uniformly more accurate replacement. Legacy display tie-breaking preserves the original target order.

## Internal evaluation

`tools/target-ranking-evaluate.js` now evaluates every indexed fingerprint-profile group by default, rather than an alphabetically spaced 100-query sample. SHA-256 profile ordering supports a reproducible `--limit N` quick check. Each query's complete indistinguishable profile group is withheld from every target. The report records the representative name, aliases, target labels and profile hash; labels are never transferred between aliases. The ground truth remains curated labels, with missing labels unknown rather than validated negatives.

Schema v2 records display ranks and guaranteed/possible top-k bounds for ties in both rank score and mean, so arbitrary target ordering cannot masquerade as stronger retrieval. It also reports per-target macro top-five recall: each target has equal weight, including labels with no remaining references after holdout. This exposes uneven target coverage hidden by a query-level average. It is neither scaffold-disjoint validation nor an external measured-activity test and cannot establish specificity or calibrate probabilities.

Reproduce the complete current evaluation with:

```sh
node tools/target-ranking-evaluate.js --report validation/target-ranking-full-profile-v1.json
```

The committed report covers 1,342 profiles, 132 targets and 3,116 library entries. 19 queries have no rankable curated label after holdout. Display-order retrieval percentages are:

| Method | Top 1 | Top 5 | Top 10 | Target macro top 5, guaranteed–possible |
| --- | ---: | ---: | ---: | ---: |
| Legacy | 83.31% | 90.91% | 92.55% | 47.75–49.27% |
| Experimental ensemble | 83.98% | 91.28% | 93.37% | 48.34–49.92% |

The ensemble has a modest advantage on this full internal snapshot, while target-balanced coverage remains much weaker. This does not support a claim of generally accurate receptor prediction. Legacy remains the default. Neither formula nor weights were tuned to these results. The old `target-ranking-ensemble-v1.json` is a historical 100-query schema-v1 report and should not be compared as a longitudinal improvement figure. Compare methods within the same report and reference snapshot. Broader claims require verified assay-linked positives, negatives, temporal/scaffold splits and external review.

CSV adds `matchingQueryProfiles` (integer) and a textual `supportMetric` definition; existing fields remain. `distinctFingerprintProfiles` and `supportingProfiles` now correctly count profiles in legacy mode as well. The algorithm version distinguishes this reporting correction from previous exports.

## Metabolism search

The reaction definitions and site-reactivity factors are unchanged. The revised engine collects a generation's unique candidate products before applying the structure budget, then retains the highest relative-weight candidates with deterministic tie ordering. This removes the earlier first-rule-wins bias when the cap is reached. Budgets of 60, 120 or 300 structures include the parent. Programmatic budgets accept 1–500 structures; generation depth accepts 0–3.

A product's representative route is the highest-weight path among its shortest-generation routes. Its parent, enzyme, reaction, phase, site factor, notes, touched atoms and score are assigned together. Deeper revisits are retained as alternate reaching steps but do not recycle a score back through an already expanded structure. This policy avoids contradictory displayed routes and scores; it is not a kinetic reaction-network model or a guarantee of the globally most probable biological path. Candidate scores and enzyme-route sums are not rates, yields or fractions of dose. New generations can still be incomplete when the budget stops expansion.

Diagnostics count rule applications, matched sites, transform failures, unreadable fragments, rule errors, revisited products and generation candidates excluded by budget. Invalid rules no longer fail silently. Small released fragments below the existing traversal floor are reported but not recursively expanded when a larger fragment is retained. Graph-hash product grouping is approximate and does not establish stereochemical identity. No new CYP isoform assignments, pH/tautomer enumeration or kinetic models are introduced.

The historical `major`, `minor`, `trace` machine band keys are retained for compatibility; the UI calls them higher, intermediate and lower **heuristic weight**. They are not observed abundance bands. The known-answer fixture is regenerated for the changed search ordering. All 16 documented products across 14 drugs remain enumerated. Point top-five count changes from 15 to 14 because a tied-score product changes display position; the revised report provides a tie interval of 14 guaranteed to 15 possible top-five hits. No score was altered to move that case back above the cutoff.

`tools/metabolism-engine-test.js` checks budget priority, reaction-order invariance, coherent representative paths, settings and surfaced failures. `tools/metabolism-cases.js` now exits nonzero if any known-answer product is missing. These fixtures are regression checks, not a general independent validation set. The UI discloses when phase, depth or budget differ from the benchmark's two-generation/both-phase/120-structure configuration.

## Independent structural checks and UI tests

`tools/metabolism-rdkit-check.py` generates the two-generation products for aspirin, paracetamol and ibuprofen and checks sanitization and molecular formula independently with RDKit. The initial check covered 159 products with zero failures using RDKit 2026.09.1. It does not establish in-vivo formation, stereochemical correctness, pathway completeness or relevance to other molecules.

```sh
python tools/metabolism-rdkit-check.py
node tools/run-validation.js --report validation-report.json
NODE_PATH=/path/to/jsdom/node_modules node tools/prediction-workflow-dom-test.js
```

The optional jsdom 26.1.0 test executes the actual application and verifies ensemble/legacy switching, receptor scope, supporting-reference details, metabolic budgets/diagnostics and full CSV consistency. It does not validate Chromium rendering or mobile layout. The independent RDKit and internal target-evaluation commands are separate from the Node regression suite. No hosted test workflows or paid services are added.

## Methodological sources

- [SwissTargetPrediction 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6602486/): a trained combined 2D/3D model, cited for comparison rather than as validation of this implementation.
- [SwissTargetPrediction 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC4086140/): reports limitations of close-analogue target prediction and reference-set validation.
- [Human hepatocyte metabolite-identification data (2025)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12587390/): distinguishes reaction-rule enumeration, site models and experimental metabolite identification. These experimental data were not imported into this rule set or used as training data.

## Reference and descriptor accuracy follow-up

The current source includes four reviewed GABA-A-panel structure corrections and
aromaticity/charged-nitrogen calculation fixes. See
[REFERENCE-CURATION-HANDOFF.md](REFERENCE-CURATION-HANDOFF.md) for the source
records, unresolved stereochemistry, chlordiazepoxide database disagreement,
independent full-library descriptor comparison and remaining input limitations.
The target report above has been regenerated for these corrected structures and
now hashes the parser, molecular graph, stereochemistry and fingerprint modules
as well as the ranking module and datasets.

The ChEMBL_37 coverage batch adds assay-linked binding references under the
50-entry goal. [RECEPTOR-COVERAGE.md](RECEPTOR-COVERAGE.md) describes its selection
filters and shortfalls; [CHEMBL-DATA-NOTICE.md](CHEMBL-DATA-NOTICE.md) records data
attribution. Neither increased coverage nor higher retrieval on this expanded
curated label set establishes an improvement against external assays.
