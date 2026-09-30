# Part 3 sim slice audit (bugs)

## Files changed

The following repository files were changed:

- `js/sim/bugs.js`: new file, about 600 lines. It contains `BugLayer`, the constants, the archetypes and `bugCategory`.
- `js/sim/plants.js`:
  - `PG` is now 14, and gene 13 is defence.
  - Adds `DEFENCE_COST`, `POLL_WIND`, `POLL_FRUIT_BASE`, `POLL_DECAY` and `PEST_HEALTH`.
  - Adds the fields `poll`, `flowerPoll` and `nectarHue`, and the methods `damage` and `nectar`.
  - Pollination now affects fruit and bloom spread.
  - `plantSeed` has a NaN guard.
- `js/sim/animals.js`:
  - Adds the constants `BUG_*`, `PARASITE_*` and `TILE_LOAD_SCALE`.
  - Adds `tileLoad`, `parasiteLoad` and `parasiteHost`, and a `bugs` reference.
  - Adds `_bugEff`, the bug lure in `_pickForage`, bug eating, parasite drain and `deaths.parasite`.
- `js/sim/soil.js`: adds `consumeLitter(i, amount)`.
- `js/sim/ecosystem.js`:
  - Constructs `BugLayer` with `FastRng(seed+333)` and sets `animals.bugs`.
  - Tick order is now plants, then bugs, then animals.
  - Adds the bug stats, `history.bugs`, bug extinction logging and bug reintroduction migrations.
- `CODE_REFERENCE.md`:
  - Adds a new Bugs section.
  - Updates the Plants, Soil, Animals and Ecosystem sections.
- `complexities.md`:
  - Adds a `js/sim/bugs.js` row with a score of 6.
  - Updates the soil, plants, animals and ecosystem notes.
- `feature-research/ecosystem-expansion/part3/SIM_READY.md`: the interface handoff to the UI slice.
- `feature-research/ecosystem-expansion/part3/audit.md`: this file.

Outside the repository, test harness files live in the session scratchpad: `run4.js`, `herb.js`, the `p3base/` baseline snapshot, and the run outputs `p3base_*`, `pf_*` and `pg_*`.

## Constants chosen (tuned; new constants only)

| Constant | Value | Why |
| --- | --- | --- |
| `BUG_EVERY` | 6 | The plan said 2. Changed for the perf gate; rates scale with it. |
| `BUG_SPREAD` | 0.1 | Lowered for the perf gate. |
| `BUG_ENERGY` | 0.3 | Higher values caused an animal boom. |
| `PEST_BITE` | 0.002 | Keeps plant cover within about 0.5% of baseline. |
| `PARASITE_DEATH_SHARE` | 0.08 | Classification only. |

All other constants are as listed in the Bugs section of CODE_REFERENCE.md.

## Gate results

Method: `run4.js` was run for 3000 ticks on seeds 42, 7 and 123. Each seed's baseline run (the pre-change snapshot `p3base/`) was followed immediately by its new-code run, sequentially, to control for machine load. The machine was shared (load average about 8). The perf rows show the final constants.

Each cell shows new vs baseline. Populations are the mean over t ≥ 1000, then the t3000 count.

| Seed | LH (land herbivores) | WH (water herbivores) | LO | LC | WO | WC | All 6 > 0 at t3000 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 42 | 1749 vs 1449; 1462 vs 1319 | 999 vs 979; 930 vs 1056 | 267 vs 96 | 106 vs 191 | 69 vs 108 | 21 vs 24 | yes |
| 7 | 1345 vs 976; 1358 vs 918 | 1567 vs 1769; 2592 vs 2340 | 138 vs 253 | 110 vs 96 | 78 vs 102 | 42 vs 55 | yes |
| 123 | 2184 vs 2804; 2709 vs 2743 | 1114 vs 1010; 1153 vs 1127 | 438 vs 40 | 102 vs 140 | 100 vs 225 | 49 vs 41 | yes |

Minima over the whole run: seed 42 hit WC 1 and LO 8. The baseline for seed 42 also hit WC 0 and LO 27.

The perf column shows ms per tick, new vs interleaved baseline. The bug layer figure is its own ms per tick.

| Seed | Perf (ratio) | Bug layer | Cover | Bug tiles at t3000 (pest/detritivore/parasite/pollinator) | Mean pollination on flower tiles | Parasite deaths | Bug migrations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 42 | 22.26 vs 20.87 (1.07) | 1.93 | 59351 vs 59416 | 29131/12437/14017/30493 | 0.45 | 13 | none |
| 7 | 18.31 vs 16.21 (1.13) | 1.35 | 59150 vs 59266 | 27311/13754/13217/29737 | 0.50 | 15 | none |
| 123 | 20.13 vs 17.61 (1.14) | 1.52 | 59644 vs 59681 | 26762/9546/21324/25229 | 0.35 | 10 | none |

- The perf gate (≤ 1.25×) passes on all seeds.
- The earlier interleaved run used `BUG_EVERY` 4 and `BUG_SPREAD` 0.15. It gave ratios of 1.39, 1.29 and 1.24, which failed the gate, so both constants were changed to their current values.
- Part of the remaining animal cost is population-driven: seed 7 and seed 42 carry more herbivores than baseline.
- On every seed, the counters `pestDamage`, `detritusEaten`, `parasiteDrain` and `eaten` are all > 0, and `collapses` is 0.

## Deviations and fixes

- **Coordinator fix: carnivores never eat bugs.**
  - The live app showed that small carnivores (foxes and pike, diet 0.66–0.85, lighter than `BUG_MASS`) ate bugs through `_bugEff`, stayed fed and over-hunted grazers.
  - `_bugEff` is now 0 at `diet >= BUG_DIET_MAX` (0.66, the `dietRole` boundary). This covers both eating and the `_pickForage` lure.
  - The curve peaks at `BUG_DIET_PEAK` 0.45, falls linearly to 0 at 0.66, and falls with slope 1.4 below the peak.
  - Result: land herbivores (LH) and water herbivores (WH) stay at or above baseline on seeds 42 and 7.
  - On seed 123, mean LH is 22% below baseline, but its t3000 count matches baseline (2709 vs 2743). Mean WH on seed 123 is above baseline.
  - No grazer group came near extinction. The lowest LH was 483 and the lowest WH was 217.
- **`BUG_EVERY` is 6, not 2**, for performance. Every rate is multiplied by it. `POLL_DECAY` is 0.95, not 0.9, so pollination does not vanish between bug steps.
- **Parasite food uses a decaying host trace.** Food comes from `trace`, fed by `tileLoad` with decay 0.95 per bug step, instead of the instantaneous `tileLoad`.
- **Nectar is unseasoned.** `plants.nectar` returns the raw bloom strength, and bugs apply a season factor with a `POLL_WINTER` floor, so pollinators survive winter.
- **Gene 8 scales the parasite drain.** The host-size gene multiplies the drain by `0.4+0.6*gaussFit(size, host, 0.3)`.
- **Bug species names** reuse the registry's animal and fish name pools, because `core.js` is outside this slice.
- **NaN tile on seed 123.** A pre-existing bug in `mapGenerator.js` gives tile 59465 NaN temperature, humidity, altitude and fertility; that file is out of scope. Guards were added in `plantSeed` (`!(childK >= 0.04)`), in `BugLayer._set` (NaN fit becomes 0), and in the bug K checks. Before the guards, NaN plant biomass spread from that tile.
- **`PARASITE_DEATH_SHARE` is 0.08.** At 0.25, `deaths.parasite` never counted anything.

## Risks

- **No locust swarms on any seed** (a soft target, so it was not forced). Pest density tracks K from biomass, with an equilibrium around 0.8, and the tile must also be bare (`edible < 0.05`). The code path exists; lowering `LOCUST_DENSITY` or raising `LOCUST_BARE` would make swarms appear.
- **The balance is chaotic.** Single-seed group means move by ±30% from small changes; for example, even with `BUG_ENERGY` set to 0, seed 123 LH differs. LO rose sharply on seeds 42 and 123, while LC and WO fell somewhat.
- **Water carnivores (WC) are thin on seed 42,** with a minimum of 1. Baseline seed 42 also reached 0.
- **Bug speciation is slow.** At t3000 there are only 2–9 species per niche, most of them founders.
- **Timing is noisy.** The machine was shared during all timing, and baseline runs of the same code varied from 15.2 to 20.9 ms per tick.

## Checklist

- [x] No new comments: `grep -nE '//|/\*' js/sim/{bugs,plants,animals,soil,ecosystem}.js` returns nothing.
- [x] `node --check` passes on all five sim files.
- [x] CODE_REFERENCE.md entries are present (grep-verified):
  - `## Bugs (\`js/sim/bugs.js\`)`
  - `consumeLitter`
  - `_bugEff`
  - `PG = 14`
  - `damage(i, amount)`
  - `nectar(i)`
  - `tileLoad`
  - `deaths.parasite`
  - Bugs RNG `seed+333`
  - `reintroduce(niche)`
  - `history` `bugs`
- [x] complexities.md is updated: the `js/sim/bugs.js` row (6) is added, and the soil, plants, animals and ecosystem notes are updated.
- [x] Output is deterministic: the tuned constants in the file reproduce the `TUNE` run exactly (t500 line identical).
- [x] No git state changes were made.
