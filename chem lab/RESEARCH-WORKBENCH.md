# Retrosynthesis research workbench

The full-route planner and the canvas disconnection explorer share research settings. These configure a finite, forward-verified structural model; they are not experimental feasibility, yield, purity or safety predictions.

## Workflow

1. Set a starting material and target in the full-route workbench. Names resolve locally; SMILES is more precise.
2. Set inventory and reaction exclusions, then choose a research protocol in the sidebar.
3. Run a bounded search and compare the routes. Inspect policy rejection reasons when fewer routes are returned.
4. Assign recorded S/L/G/Aq(solvent) states beside intermediates. The optional purification view remains an idealized selected-product-only display.
5. Save a candidate to Route Workspace or open a step in Reactions. Saved routes retain their research settings as historical provenance; editing a route rechecks chemistry but does not rerun the original search constraints.

In the canvas popup, **Plan a full route** transfers the current target to the full-route workbench. Popup settings filter and rank cached, forward-verified disconnections. Full-route time/node controls apply to Path Finder, not the popup's internal proposal generation.

## Hard constraints and preferences

| Setting | Meaning |
| --- | --- |
| Priority | Balanced ordering, fewest operations, fewest protection operations, milder recorded conditions, or lower recorded isolation burden. These reorder found candidates within the same bounded search, not a global optimum proof. |
| Selectivity | Standard/review preserve all encoded blockers. Strict additionally excludes recorded heuristic or unresolved selectivity warnings. Review cannot rescue an invalid selective reaction. |
| Stereochemistry | Exact preparation; mixtures only at unspecified centres; or a required forward-supported resolution operation. Drawn R/S and E/Z identities are never discarded. No resolution transformations are currently encoded, so requiring resolution can return no routes. |
| Equipment | Exclude above-atmospheric pressure, subzero cooling, photochemistry, recorded electrochemistry or encoded specialized catalysts. Classification uses recorded conditions and finite reagent tags, not exhaustive equipment inference. |
| Conditions | Inclusive recorded temperature limits; exclusions for recorded acid/base/aqueous conditions and inert-atmosphere/encoded sensitive inputs. Effective reflux temperatures use the existing solvent model. |
| Intermediate restrictions | Exact structures and recognized functional groups in intermediate products and precursor building blocks. Requested endpoints are permitted. Functional-group detection is limited to the encoded inventory. |
| Purification | Prefer a recorded method, or impose a maximum recorded chromatography count. Unknown methods do not satisfy a hard count limit. Current idealized purification does not infer a validated extraction/crystallization/distillation/chromatography method. |
| Search | Optional 100–30,000 ms time budget, 1–200 explored structures, and 1–60 proposals per node. Recipe trees retain their eight-branch cap and depth cap of eight. |
| Diversity | Balanced greedy diversity; best-ranked paths first; or maximum distinctness requiring at most 50% overlap of encoded intermediate/family features. Maximum distinctness may return fewer than the requested number of routes. |
| Evidence | Standard verification; required references; curated scope plus references; or explicitly exploratory pattern proposals. All modes retain forward identity, loading and compatibility gates. References describe reaction classes, not validation of every substrate. |

Protection installation, main reaction and removal are separate operations and all undergo hard policy checks. Explicit mask programs also apply research policies to installation/removal and completed routes.

The condition-burden heuristic sums distance from 25 °C (one point per 25 °C), pressure above one atmosphere, and recorded light/inert-atmosphere flags. Isolation burden combines operation boundaries, recorded purification checkpoints, and recorded/unknown method preferences; it is not a prediction of laboratory purification counts. Ranking heuristics do not assign measured probabilities or experimental yields. Purification preference cannot distinguish methods that have not been recorded. Reaction-only metrics exclude unmodeled purification losses.

## Profiles and persistence

Built-ins: Balanced research, Simple equipment, Exact stereochemistry and Fewest operations. Up to 20 named profiles can be saved locally, replaced or deleted. A portable version-1 JSON profile includes research settings and the existing inventory/reagent/protection/depth/route-count controls. Endpoints and phase history are excluded so the profile can be reused with another target.

Import/export is bounded to 50 KB. Invalid ranges, enums, boolean types, structures and functional-group IDs are rejected rather than silently applied. Current settings persist when browser storage is available. Open workbench panels refresh shared settings when shown.

A running search uses an immutable settings snapshot. Changing controls does not reinterpret existing routes; rerun to apply the changes. Results expose their recorded protocol, and saved-route JSON preserves the research settings.

## Validation

Focused tests exercise actual linear/tree searches, protected operations, stereochemical restrictions, condition/equipment exclusions, route ranking, profiles, invalid imports and the settings DOM. The standard validation runner discovers these suites automatically. The independent RDKit oracle remains separate from UI tests.
