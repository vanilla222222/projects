# Retrosynth

Retrosynth explores reaction-rule suggestions for SMILES structures. Open
`index.html` to use it without installing dependencies. Serve the directory over
HTTP to run searches in a worker with progress updates and cancellation.

## Search modes

| Mode | Input | Result |
|---|---|---|
| Route | Target | Routes ending at the selected stock policy |
| Path | Target and named start | Routes that use the named start, including paths through stocked intermediates |
| Analogues | Target | Related structures, optionally filtered through route search |

Use the examples to load a question, then select Search. Advanced settings
include the stock policy, search limits, model verification, and settings
import or sharing. Download JSON to preserve the results and the settings that
produced them.

## Search methods

| Method | How it explores |
|---|---|
| Best-first | Follows the route score and unfinished work |
| Breadth | Explores shallower states before deeper ones |
| Depth | Continues down deeper branches first |
| Iterative | Raises the step limit one pass at a time under one time and size budget |

The rule library includes halohydrin ring closure and Diels–Alder cuts that
separate a cyclohexene ring into diene and alkene partners, including some bridged
adducts. Forward checks cover acetal formation, Diels–Alder, epoxidation and
halohydrin closure. Where a modelled reaction leaves a newly formed stereocentre
unresolved, warning mode shows the uncertainty and strict mode excludes the step.
Amine SN2 substitution and amine opening of epoxides track inversion when the
reacting centre is specified. Epoxide opening enumerates both eligible attack
sites, so the model can flag competing regioisomers.

Run `node tools/literature-test.js` for a small published-route benchmark.
It reports route recovery, elapsed time and the search stop reason per example.
The comparisons use structures and disconnections. They do not reproduce the
experimental conditions or validate stereochemical outcomes.

## Reading results

The search samples extra complete routes within the same time and state budget.
It shows one route per final disconnection before showing variants with the same
immediate precursors. In Ranking, choose the balanced score, fewer steps, fewer
uncertain steps, or fewer assumed starting materials. These preferences order
the sampled routes.

Route steps appear in forward order. Starting materials are labelled as entered
inventory, built-in stock, assumed small molecules, or the named start. The
built-in catalogue is local and does not verify supplier availability. Inventory
mode accepts only the compounds entered by the user.

Strict mode requires a forward rule that reproduces the target without modelled
alternatives. Warn mode also shows unchecked or ambiguous steps. Forward
results describe the rule model and do not establish experimental outcomes.
Settings that require unavailable data, such as supplier prices and hazard
classification, are marked in the interface. Searches reject non-default values
for those settings.

The search has time, depth, and size limits. A search that returns no route is
bounded by those limits, the reaction rules, and the available starting materials.

## Tests

```sh
node tools/all.js
node tools/corpus-check.js <csv> 20000
```

The suite covers SMILES parsing and canonicalization, settings, stock, route
search, and worker messages. The corpus check requires a local input CSV.
