# Part 1 audit: understory slots, soil nutrients, plant health

## Files changed

| File | Change | Owner |
| --- | --- | --- |
| `js/sim/soil.js` | New. `SoilLayer` and the `SOIL_*` constants. | sim implementer |
| `js/sim/plants.js` | Two slot planes (`p = slot*n + i`), `PG = 8` (g6 shade, g7 root), `slotOf`, light/shade, health and starvation, per-slot seeding, slot-aware spread, `topSpecies`, `cover`, `grazeTox`, `starved`, nutrient recycling. | sim implementer |
| `js/sim/animals.js` | 3 lines: toxicity penalty reads `plants.grazeTox`; prey cover reads `plants.cover(tile)`. | sim implementer |
| `js/render.js` | Nutrients ramp and view, vegetation colour from canopy/understory with health tint, understory icons. | UI slice. A first pass was written by the sim implementer before the split; the second implementer (UI agent) owns it from then on. |
| `js/main.js` | `PLANT_TRAITS` rows for genes 6 and 7, Health cell, tooltip slot rows and nutrients %, click selection via `topSpecies`. | Same as `render.js`. |
| `index.html` | `soil.js` script tag before `plants.js` (added by the orchestrator); Nutrients mode button (sim implementer, before the split). | mixed |
| `CODE_REFERENCE.md` | Load order, Species table, Plants section rewritten for slots/genes/health/light/spread, new Soil section, Animals grazing and cover notes, World generation fertility-to-soil note. The Renderer and App/main sections belong to the UI agent and were not touched in this pass. | sim implementer |
| `complexities.md` | Added `js/sim/soil.js` (4); `js/sim/plants.js` 7 to 7.5. | sim implementer |
| `feature-research/ecosystem-expansion/part1/audit.md` | This file. | sim implementer |

The UI slice (render.js, main.js, the Renderer and App/main sections of CODE_REFERENCE.md, and screenshots) is by the other agent. The public API it depends on was not renamed: `topSpecies`, `cover`, `health`, `sat`, `soil.nutrient`, `SOIL_MAX`, `starved`, `grazeTox`, and the plane layout `p = slot*n + i`.

## Chosen constants

Soil (`js/sim/soil.js`):

| Constant | Value |
| --- | --- |
| `SOIL_MAX` | 1.5 |
| `SOIL_REFILL` | 0.003 |
| `SOIL_UPTAKE` | 0.0004 |
| `SOIL_SUPPLY` | 0.006 |
| `SOIL_SAME_TILE_W` | 1.5 (plan: about 1.3) |
| `SOIL_NEIGHBOUR_W` | 0.35 |
| `SOIL_RECYCLE` | 0.15 |

Plants (`js/sim/plants.js`): `SHADE_MAX` 0.8, `SHADE_FULL_BIOMASS` 2.0, `SAT_OK` 0.75, `HEALTH_RECOVER` 0.02, `HEALTH_DECAY` 0.04, `HEALTH_SPREAD_MIN` 0.4. `PLANT_WEIGHTS` gains 0.7, 0.7 for genes 6 and 7. The growth cost is `*(1-0.3*shade)*(1-0.2*root)`.

Founder shade and root genes:

| Founder | shade | root |
| --- | --- | --- |
| succulent | 0.2 | 0.6 |
| savanna grass | 0.15 | 0.45 |
| jungle tree | 0.35 | 0.5 |
| broadleaf | 0.45 | 0.55 |
| meadow grass | 0.15 | 0.4 |
| berry shrub | 0.4 | 0.5 |
| conifer | 0.4 | 0.35 |
| moss | 0.8 | 0.35 |
| reed | 0.3 | 0.65 |
| steppe brush | 0.3 | 0.6 |
| algae | 0.6 | 0.4 |
| kelp | 0.3 | 0.5 |
| plankton | 0.5 | 0.35 |

No existing animal constants were changed.

### Slot rule

- Land: `wood >= 0.3` gives slot 0 (canopy), otherwise slot 1 (understory).
- Water: `prefMoist > 0.45 && wood > 0.25` (the kelp test `plantCategory` uses) gives slot 0; algae and plankton go to slot 1.

## Baseline vs after (300x200, 3000 ticks, headless node vm)

The baseline was recorded with the original sources before any edit. "Both" is the share of occupied tiles holding a plant in both slots: over forest (canopy-occupied) tiles, and over all land tiles with a plant.

| Seed | Run | LH | LO | LC | WH | WO | WC | Cover | Both / forest | Both / land | Mean health | Starved | Soil mean / min | Mean ms/tick |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 42 | base | 2576 | 6 | 211 | 1018 | 29 | 56 | 59951 | n/a | n/a | n/a | n/a | n/a | 7.23 (8.02 under load) |
| 42 | after | 1007 | 494 | 405 | 1025 | 56 | 7 | 59968 | 89.0% | 88.7% | 0.934 | 62377 | 0.263 / 0.076 | 14.28 |
| 7 | base | 2743 | 28 | 146 | 1140 | 140 | 77 | 59997 | n/a | n/a | n/a | n/a | n/a | 8.18 (13.5 under load) |
| 7 | after | 771 | 46 | 102 | 599 | 221 | 43 | 59921 | 82.9% | 82.0% | 0.910 | 79275 | 0.293 / 0.052 | 12.90 |
| 123 | base | 3925 | 1092 | 20 | 1234 | 661 | 47 | 59987 | n/a | n/a | n/a | n/a | n/a | 10.7 (15.1 under load) |
| 123 | after | 2406 | 573 | 180 | 821 | 220 | 8 | 59806 | 86.6% | 84.5% | 0.924 | 91142 | 0.328 / 0.000 | 19.31 |

Soil min 0.000 on seed 123 is the NaN-fertility water tile (index 59465), which the soil reads as 0.

Wall-clock timings were taken with a machine load average of 13 to 18 from other agents, so they are noisy. A CPU-time comparison (`process.cpuUsage`, same runs, interleaved) gave these ms/tick:

| Seed | Base | After | Ratio |
| --- | --- | --- | --- |
| 42 | 12.38 | 16.70 | 1.35 |
| 7 | 13.86 | 16.03 | 1.16 |
| 123 | 19.12 | 19.29 | 1.01 |

### Gate

| Criterion | Result |
| --- | --- |
| All 6 groups above 0 on every seed | PASS |
| Cover within ±25% of baseline | PASS (under 0.3% change) |
| Both-slot co-occupancy above 10% | PASS (82 to 89%) |
| `starved > 0` (starvation actually occurs) | PASS |
| ms/tick at most 1.25x baseline | MIXED: CPU ratio 1.01 and 1.16 pass, seed 42 is 1.35 and fails. Wall-clock ratios under load are worse still. |

Herbivore counts fall on land (fewer, healthier plants per unit demand), but no group dies out, and omnivores and carnivores rise on seed 42.

## Tests

| Command | Result |
| --- | --- |
| `node --check js/sim/soil.js js/sim/plants.js js/sim/animals.js js/render.js js/main.js` (each file) | all ok |
| `node run2.js <seed> 3000` for seeds 42, 7 and 123 (scratchpad runner that loads `soil.js` in the vm and prints the extra metrics) | results in the table above |
| `node run2.js 7 400` smoke run after the docs pass | runs, all groups above 0, 11.5 ms/tick |
| `node p1/run_orig.js <seed> 3000` on a copy of the original sources | baseline rows above |
| `node p1/cpu.js` | CPU-time table above |

## Checklist

- No new comments:

  ```
  $ grep -nE '//|/\*' js/sim/soil.js js/sim/plants.js js/sim/animals.js js/sim/core.js js/sim/ecosystem.js
  (no output, exit 1)
  $ grep -cE '//|/\*' js/render.js js/main.js
  js/main.js:0
  js/render.js:0
  ```

- CODE_REFERENCE entries present:

  ```
  $ grep -n "## Soil\|slotOf\|grazeTox\|topSpecies\|starved\|cover(i)\|seeds the soil" CODE_REFERENCE.md
  134:**`slotOf(g, water, o = 0)`** picks the slot a genome lives in:
  171:- `starved`, a running count of plants killed by nutrient starvation.
  172:- `grazeTox`, the biomass-weighted toxicity of what the last `graze` call removed.
  204:- **`graze(i, amount, reach = 0)`** ... sets `grazeTox` ...
  205:- **`topSpecies(i)`** returns the canopy species id if present, else the understory one ...
  206:- **`cover(i)`** returns `floor[i] + floor[n+i]` ...
  253:## Soil (`js/sim/soil.js`)
  448:**Grazing across slots:** ... `plants.grazeTox` ...
  865:  - `fertility` also seeds the soil ...
  ```

- complexities.md updated: yes (`soil.js` 4, `plants.js` 7.5).
- Screenshots: owned by the UI agent, not produced in this pass.

## Deviations from plan

1. `SOIL_SAME_TILE_W` is 1.5, not about 1.3. At 1.3 water omnivores died out on seed 42.
2. `shade` and `root` are cached in per-plant `Float32Array`s (`2n`) instead of being read from the genome each tick, to cut strided reads in the hot loops.
3. `_spread` was reordered for speed, with the same rules: an upper-bound pre-check skips the two `exp` calls when the child cannot win, `childK` is computed without allocating a traits object, and the 50% same-species replacement coin is drawn before mutation when the target slot already holds the parent's species. That last change alters the rng order and adds a slight bias only for children that would map to a different slot than their parent.
4. The `K < 0.015` decline check uses the light-scaled K, so a deeply shaded understory plant declines and clears like one on a poor tile.
5. Soil treats non-finite fertility and non-finite demand as 0 (the pre-existing NaN tile on seed 123).
6. `render.js`, `main.js` and the Nutrients button in `index.html` were first edited by the sim implementer before the work was split; the UI agent owns them now. The Nutrients texture is re-baked from `draw()` every 500 ms, not from a `render()` function, which does not exist.
7. Resident strength in spread is multiplied by `(0.5 + 0.5*health)`, so weakened plants are easier to displace.

## Open risks

- Performance gate: plant work doubles with the second plane and the soil pass adds three O(n) sweeps. Seed 42 is 1.35x CPU time. The node vm harness also inflates the cost of global and `Math.*` lookups, so browser ratios may differ.
- Measurement noise: every timing was taken under a load average of 13 to 18.
- Co-occupancy is very high (82 to 89%). The understory is rarely excluded; shading and soil thin it but seldom remove it.
- The NaN fertility tile on seed 123 still makes `plants.totalBiomass` NaN on that seed (pre-existing, not fixed here, since world generation is out of scope).
- Land herbivore counts are 40 to 70% below baseline. That is within the gate, but it is a visible change in feel.

## Next steps

1. Re-measure ms/tick on an idle machine, and in the browser, before deciding on the perf gate.
2. If it is still over 1.25x: run `soil.step` every other tick (doubling `SOIL_REFILL` and uptake per step), or fuse the demand pass into the previous tick's growth loop.
3. Cut understory spread attempts (for example scale the spread probability by `light`) to reduce both cost and the very high co-occupancy.
4. Fix the NaN fertility tile at its source in `mapGenerator.js` (separate task).
5. After the UI agent's screenshots, check the Nutrients view against the soil means above (0.26 to 0.33 of `SOIL_MAX`) and tune the ramp stops if the map looks flat.
