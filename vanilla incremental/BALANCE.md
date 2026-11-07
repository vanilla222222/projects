# Required expansion progression

## Main path and required chapter

The initial Mines → Mastery → Rebirth → Smeltery → Workshop progression keeps its hour-scale resource costs. In the reference model those four stages remain approximately 57, 61, 59 and 55 minutes. Statistics and Achievements are utility tabs and have no expansion projects.

Building Workshop automatically begins the mandatory expansion chain:

**Mining → Mastery → Rebirth → Smeltery → Forest → Sawmill → Workshop**

Each addition has five milestones. All five must be completed before the next addition begins; there is no optional project selection or paid Blueprint Office. Finishing an expansion opens its successor automatically, including any missing base-tab access. In particular, Smeltery expansion opens Forest and Forest expansion builds Sawmill without the old Silicon or Spruce-log unlock fees. Previously owned base tabs stay open for legacy saves, while expansion order still cannot be skipped.

## Twenty-minute calibration

A project snapshots production estimates at the moment it begins, creating five fixed fresh-production quotas. Estimates use recent output (60 seconds, or a full seven-minute recipe-rotation window for aggregate ingots), with analytical fallbacks for newly introduced resources. Per-project development factors account for expected upgrade growth. Beam estimates are capped by sustainable log supply, rather than nominal saw speed.

Existing inventory does not count toward a quota. A separate production ledger records actual new output, so spending resources and rebirthing do not erase progress, and very large lifetime totals cannot swallow small increments through floating-point precision. Targets never change after the project begins. Elapsed playtime does not unlock or complete an expansion.

Reference expected-yield model: two active mining/chopping actions per second, seed 42:

| Expansion | Modeled minutes |
| --- | ---: |
| Mining / Geode seams | 18.67 |
| Mastery / Ore schools | 19.08 |
| Rebirth / Legacy talents | 20.58 |
| Smeltery / Electrum | 18.75 |
| Forest / Nursery | 17.67 |
| Sawmill / Beam joinery | 18.17 |
| Workshop / Engineering schools | 20.92 |

The three stored runs (seeds 42, 7 and 99) put the additions around 17–21 minutes each, roughly 2 hours 15 minutes of added progression in total. See `expansion-results.json` for the full timings. These are model estimates, not measured playtest guarantees. Choices, machine assignments, stock availability, upgrade spending, offline sessions and ore variance can change completion times.

## Reference strategy

`balance-sim.cjs` loads actual game formulas and purchases through `model-harness.cjs`. Ore income uses weighted expected visits, Chest output and an approximate Vein bonus; TNT spillover is not explicitly simulated. It buys basic upgrades/mastery using a 15% spending reserve, mining tools at 25%, makes one initial rebirth, and develops the existing industrial upgrades.

During Electrum development it assigns two available smelters to Electrum. During joinery it pauses Steel production to avoid competing for Charcoal, keeps saws on supplied logs, and uses Nursery planting/fuel reserve when available. Sawmill cuts produce offcuts; three offcuts feed one Beam batch. Pausing the joiner refunds a reserved batch exactly once. Workshop research specialization improves one existing bonus rather than granting a second tab or another research currency.

Progress and features survive rebirth and save/reload. Offline production contributes to the current project through the same production hooks, but is excluded from live rate sampling. Only the active project's output counts; work is not banked toward future projects.

## Validation

Run:

- `node --test "vanilla incremental/game.test.cjs" "vanilla incremental/expansion.test.cjs"`
- `node "vanilla incremental/balance-sim.cjs"`

Tests cover strict order, automatic handoffs, no stockpile/time bypass, unlock rewards without extra fees, resource transactions, save/rebirth persistence, actual alloy and Beam production, Nursery fuel reserve, large-number ledgers and reference progression windows. The older `balance-results.json` records the pre-expansion calibration only; its downstream Forest/Sawmill unlock timings no longer describe the mandatory chapter.

Browser/phone interaction still needs live playtesting; the production model and static checks do not replace it.
