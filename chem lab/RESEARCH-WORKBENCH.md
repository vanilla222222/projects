# Retrosynthesis research workbench

The full-route planner and the canvas disconnection explorer share research settings. These configure a finite, forward-verified structural model; they are not experimental feasibility, yield, purity or safety predictions.

## Workflow

1. Set a starting material and target in the full-route workbench. Names resolve locally; SMILES is more precise.
2. Set inventory and reaction exclusions, then choose a research protocol in the sidebar.
3. Run a bounded search and compare the routes. Inspect policy rejection reasons when fewer routes are returned.
4. States fill automatically from the local catalog; manual S/L/G/Aq(solvent) overrides remain available beside intermediates. The optional purification view remains an idealized selected-product-only display.
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

## Automatic states and optional PubChem data

Automatic mode uses supported PubChem temperature intervals when cached, then the local reagent catalog's ambient/supplied form. Otherwise, a recorded solvent may produce a clearly labeled assumed solution. Unknown neat compounds remain unresolved rather than being arbitrarily classified. Manual overrides always take precedence; choosing Automatic restores inference. A saved inferred form is recalculated for the current recipe instead of being mistaken for a manual override.

Each structure exposes a melting/boiling data panel. Its lookup button sends that structure to PubChem. The optional **Auto-fetch PubChem MP/BP** toggle does this for up to 20 distinct structures per session; it is off by default. Requests are serialized with at least 500 ms between starts, deduplicated by canonical isomeric structure, timed out after 15 seconds, and cached locally for up to seven days (40 records / 200 KB). An unsuccessful refresh retains previously fetched data with a visible message. No API key is required.

The PUG-REST response must return one exact matching structure before its CID is used for PUG-View annotations. Structure standardization mismatches do not apply data silently. Raw values, ranges, sources, qualifiers and retrieval dates are shown. Kelvin/Fahrenheit values are converted for phase reasoning; decomposition, estimated, form-specific or unsupported uncertainty values are not used for assignment. Boiling-point data need an explicit near-one-atmosphere condition.

Temperature-based phase inference is for **25 °C and approximately 1 atm**, not an operating-temperature phase-equilibrium simulation. Below all supported melting intervals can indicate S; supported normal boiling intervals can establish G; L requires being above the supported melting intervals and below the normal boiling intervals. Boundary/conflicting intervals do not resolve one phase, and melting information alone cannot distinguish L from G above the melting range. Contradictory fetched intervals cannot silently fall back to a conflicting catalog phase. Solvent fallback remains an explicit assumption, not a solubility prediction.

API references: [PubChem PUG-View](https://pubchem.ncbi.nlm.nih.gov/pug_view/) and [PUG-REST](https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest). Integration tests use synthetic contract responses; they do not substitute for live-service or experimental validation.
