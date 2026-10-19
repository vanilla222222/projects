# Target ranking and metabolism engine revisions

These revisions improve reference retrieval, deterministic search behaviour, diagnostics and data consistency. They do not establish experimentally validated prediction of receptor binding, functional action, enzyme isoform, clearance, metabolite abundance or human exposure.

## Target retrieval: ensemble-v1

The optional experimental multi-fingerprint mode compares each query/reference pair using three 2D views: stereo-aware ECFP4, FCFP4 pharmacophore features and atom-pair fingerprints. The per-reference score is their geometric mean Tanimoto. Target ranking uses 70% of the nearest-reference score plus 30% of the mean of the top three available distinct fingerprint profiles. Those weights are fixed engineering choices, not fitted coefficients or binding probabilities. This is not SwissTargetPrediction's trained 2D/3D method; there are no molecular conformers, protein structures, docking scores or trained activity classifiers here.

The index is built once over referenced ligand names. Query fingerprints and rankings are cached on each molecule. Property-only references, missing names and parse failures are excluded and counted. References indistinguishable under stereo-aware ECFP4, ECFP6 and atom-pair count profiles are grouped for ensemble support. Such grouping is not canonical molecular identity and cannot establish independent scaffold diversity. Legacy mode keeps name-level reference counting and the chosen similarity-panel fingerprint/metric.

The evidence view shows the top three supporting references and their component scores. The operational support count uses per-reference ensemble similarity at least 0.35 and all three component scores at least 0.20. These thresholds are uncalibrated and must not be interpreted as positive/negative binding cutoffs. Fingerprint views are correlated evidence, not independent experiments. A receptor-related target filter is available. Unlisted targets are unassessed, never predicted inactive. Neither mode infers agonism, antagonism, potency or selectivity from similarity.

Full CSV uses the selected ranking mode, target scope and organism; it records algorithm version, rank score, nearest score, mean, support count and applicability description. It retains the top-50 export cap. The minimum-score/display-count controls affect the on-screen view; the full CSV retains the top 50 in the selected biological scope. The old ECFP4/Tanimoto benchmark is not displayed as evidence for the ensemble or a different selected fingerprint/metric.

Legacy nearest-neighbour ranking remains the default because the latest internal comparison is mixed. The new method is available for explicit comparison, not presented as a uniformly more accurate replacement. Legacy display tie-breaking preserves the original target order.

## Internal evaluation

`tools/target-ranking-evaluate.js` samples 100 fingerprint-profile groups deterministically across sorted reference names. Each query's complete indistinguishable profile group is withheld from every target, reducing alias/self-match leakage. The ground truth is the target labels attached to the representative curated library name; missing labels are unknown, not validated negatives. This is neither scaffold-disjoint validation nor an external measured-activity test. It cannot estimate specificity or calibrate probabilities. The sample is small and selection-dependent.

`validation/target-ranking-ensemble-v1.json` records the complete per-query ranks, aggregate top-k retrieval, Node version, reference counts, and SHA-256 of the library, targets and ranking module. No score weights were fitted to that sample. Reproduce it with:

```sh
node tools/target-ranking-evaluate.js --report validation/target-ranking-ensemble-v1.json
```

Report improvements as internal curated-label retrieval only. Broader gains require verified assay-linked positives, negatives, temporal/scaffold splits and an independently reviewed external benchmark.

Latest recorded 100-query comparison on the combined reference snapshot:

| Method | Top 1 | Top 5 | Top 10 |
| --- | ---: | ---: | ---: |
| Legacy | 83% | 89% | 92% |
| Experimental ensemble | 80% | 91% | 92% |

This mixed result is why the legacy method remains the default. Expanding the library also changes this deterministic sample, so compare methods within a shared report rather than comparing percentages across snapshots.

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
