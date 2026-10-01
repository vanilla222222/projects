# Slice 6 audit: hibernation, dormancy and torpor

Built on 2e7eee2 (the slice 5 merge). The test budget was 3 runs: one probe (1500 ticks), one gate batch (3 seeds × new and base, 3000 ticks) and one determinism check.

## Files changed

- `js/sim/animals.js`:
  - **Gene:** `AG` 20 → 21, `G_DORMANCY = 20`, `ANIMAL_WEIGHTS` gains 0.5. Founders get `FOUNDER_DORM[cls]` (fish .1, amphibian .5, reptile .5, mammal .3, bird .3, invert .45), plus `FOUNDER_DORM_COLD` (0.25) for `prefTemp < 0.4`. The meta cost in `_decode` is multiplied by `1 + DORM_COST*g`.
  - **Pool fields:** `dorm` (0 awake, 1 hibernating, 2 brumating, 3 aestivating, 4 torpor) and `dormT` (ticks dormant, negative = torpor cooldown) in `ANIMAL_FIELDS_I`, so they are saved with the pool. Counters `dormEntered`, `dormStarved` (non-torpor wakes below `DORM_WAKE_E`), `dormBurned`.
  - **Methods:** `_dormWant(i, t, W)` (picks the kind or 0), `_dormEnter`, `_dormWake`, `_dormStep`. `_dormTrack(sp, s)` sets `sp.dormShare` and logs "<name> went into <kind>" (threshold `DORM_EVENT`, rearm `DORM_REARM`, species with at least `DORM_EVENT_POP`).
  - **Step:** dormant animals take the short path right after their tile is known: they burn `DORM_BURN[kind]` of normal upkeep (scaled down by the gene, `DORM_GENE_BURN`), draw energy from fat, hold no territory or pack, and wake when conditions end, when energy falls below `DORM_WAKE_E`, or for torpor after `TORPOR_TICKS`. Entry is checked every `DORM_EVERY` ticks before the confuse branch. Hibernators and brumators with a home walk to it first (state 7, "heading to den") and enter there; without a home they enter in place.
  - **Kinds:** hibernation (endotherm mammals, gene > `DORM_MIN`, `season < DORM_SEASON`, tile below `DORM_T`, fat above `DORM_FAT`); brumation (ectotherms, same cold rule, energy above `DORM_ECTO_E` of max instead of fat); aestivation (gene > `DORM_MIN`, `season > AEST_SEASON`, `wet < AEST_WET` or water below `AEST_WATER`); torpor (small endotherms, mass < `TORPOR_MASS`, gene > `TORPOR_MIN`, energy below `TORPOR_E`, cold tile). `DORM_HYST` keeps them from flickering at the threshold.
  - **Interactions:** `_nearest` skips dormant predators and dormant prey at home; `_attack` raises the catch chance ×`DORMANT_CATCH` (cap 0.95) on dormant prey, and a failed attack wakes it; `_social` skips dormant animals; `_sus` multiplies by `1 + DORM_SUS`; infection time counts down at 1/`DORM_ITIME` and disease drain at `DORM_SICK`.
  - **Species means:** `refreshSpeciesMeans` sums grow to `AG+9`, slots `AG+5..AG+8` count dormant animals by kind.
- `js/sim/eggs.js`: `DIA_MIN` 0.4, `DIA_MAX` 400, the Uint16 `dia` array (`_grow`, `lay`, `_compact`). Non-water eggs with a dormancy gene above `DIA_MIN` pause instead of failing from snow or drying, and pause in cold winter tiles. Counters `diapause` and `diaHatched`.
- `js/sim/bugs.js`: `BUG_RESERVE` 0.03, `BUG_RES_DIE` 0.012, `BUG_RES_FIT` 0.05, the Uint8 `dorm` grid (4n), counters `reserve` and `reserveWoke`. In winter a fit cell that drops under `BUG_MIN` becomes a reserve at density 0 (not eaten, no spread), dies at `BUG_RES_DIE` per step and returns at `BUG_RESERVE` in spring. `_set`/`_clear` reset `dorm`.
- `js/simWorker.js`: bugs `SNAP_GRIDS` gains `'dorm'`.
- `js/sim/plants.js`: `SEED_REST_DRY` 0.7, `seedResting`, `stages.seedDormant`, new `_seedTick(i, tick)`. A seed bank on a snowy tile or one with `moistMul < SEED_REST_DRY` rests: no decay, no germination.
- `js/gpu/plantGpu.js`: the JS seed-bank loop calls the same `_seedTick` and copies `seedResting` into `stages.seedDormant`.
- `js/sim/ecosystem.js`: `stats.dormancy`, `stats.dormCls`, `_dormStats()` every 20 ticks, `history.dormancy`.
- `js/main.js`: `STAT_EXTRA` Dormancy card (bear, `#8fa7d6`, wide, sub-line), "N dormant" on class cards, `ANIMAL_TRAITS` Dormancy, tooltip "heading to den" and the dormancy words.
- `js/render.js`: `DORM_ALPHA`, `DORM_SHRINK`, `DORM_WIDE`, `DORM_ZOOM`; dormant sprites dim, shrink and curl wider, with a `sleep` marker at zoom 6+.
- `js/icons.js`: `sleep` icon (two stroked Z shapes), appended after `flag`.
- `CODE_REFERENCE.md`: gene table, founder dormancy, weights, a Dormancy subsection, eggs, bugs, plants seed bank, stats, UI cards, tooltip, render, icons, `SNAP_GRIDS`.

`SAVE_VERSION` stays 2. No new classes (`classTable()` unchanged). The new animal fields are pool arrays and saved automatically; the bug `dorm` grid is in `SNAP_GRIDS`.

## WebGPU plant mirror

The seed-bank rule changed, and the change sits inside the `PlantLayer.step` seed loop through `_seedTick`. The seed-bank pass is JS in both paths: `PlantGpu` runs its own JS loop over `seedDens` on age-step ticks, and that loop now calls the same `_seedTick`. The WGSL kernels in `js/gpu/plantKernels.js` never read or write seed banks, so they need no change. The GPU path was not run in this slice (no WebGPU in the test harness).

## Test numbers

Gate, 3000 ticks (about 6 years), new build vs base 2e7eee2, same batch:

| Seed | Build | ms/tick | fish | amph | rept | mamm | bird | invt | bird niches (seed/insect/fisher/raptor/carrion) | groups |
|---|---|---|---|---|---|---|---|---|---|---|
| 42 | new | 26.40 | 803 | 122 | 309 | 776 | 394 | 805 | 104/133/5/86/66 | 25 |
| 42 | base | 26.08 | 807 | 135 | 382 | 574 | 255 | 1175 | 35/151/14/20/35 | 25 |
| 7 | new | 26.23 | 3456 | 83 | 251 | 790 | 203 | 138 | 21/142/10/10/20 | 24 |
| 7 | base | 26.39 | 1444 | 65 | 497 | 685 | 171 | 516 | 44/71/6/13/37 | 25 |
| 123 | new | 28.47 | 3671 | 54 | 657 | 1404 | 155 | 863 | 9/81/14/7/44 | 25 |
| 123 | base | 28.18 | 1964 | 1 | 251 | 1587 | 366 | 896 | 95/211/4/14/42 | 25 |

- Speed: within about ±1% of base.
- Dormancy peaks (seeds 42/7/123): hibernating 36/37/59, brumating 250/72/325, aestivating 1/3/6, torpor 8/7/12, eggs in diapause 95/32/43, bug reserves about 1.8–2.2k slots, resting seed banks 3.3–5.1k tiles.
- Mammal dormancy gene, cold / temperate / tropic tiles: 42: 0.361/0.295/0.318 (tropic n=26); 7: 0.396/0.303/0.285; 123: 0.361/0.289/0.301. Selection pushes it up in the cold in every seed.
- Woke starving: 49/25/58. Dormancy events: 5/2/3 (for example "Argiceros went into hibernation", "Dentatherium went into brumation").
- Bugs: spring counts run slightly above base in later years (seed 42 year 7: 15491 vs about 14398).
- Determinism (`det.js 42 900 200`): stats, full state, RNG and aliases all equal after save/load. Save 13.19 MB.

## Deviations

- The probe counted torpor wakes as starving; `dormStarved` now counts only non-torpor wakes.
- Seed dormancy is in `PlantLayer.step` (through `_seedTick`) rather than outside it; mirrored in `PlantGpu` as above.

## Risks and open items

- Seed 7 ends with 24 groups vs 25 in base.
- Hibernation numbers are modest (about 40–60 mammals at peak). Brumation dominates.
- Fish and invertebrate counts swing between builds; this is RNG divergence, not a trend seen in all seeds.
- Animals with no home go dormant where they stand; there is no search for a sheltered tile.
- Disease in a dormant host only slows down; there is no explicit restart on waking.
- Old saves without `dorm`/`dormT`, egg `dia`, bug `dorm` or the new history keys are not migrated (as in earlier slices).
- No browser screenshot; the Dormancy card, tooltip words and sleep marker were not checked visually.
- The GPU plant path was not run.

## Doc changes

`CODE_REFERENCE.md`: `AG = 21` and gene 20 row, founder dormancy, weights, a full Dormancy subsection (constants, fields, step rules, interactions, events), egg `dia` and `DIA_*`, bug reserves and `BUG_RES*`, plant `_seedTick`, `SEED_REST_DRY` and `stages.seedDormant`, `stats.dormancy`, `dormCls`, `history.dormancy`, the Dormancy card, class card count, trait, tooltip words, render constants and the `sleep` icon, bug `dorm` in `SNAP_GRIDS`.

## Checklist

- [x] Dormancy gene, founders, meta cost
- [x] Hibernation, brumation, aestivation, torpor with entry and wake rules
- [x] Den walk before entering
- [x] Predation, packs and disease interactions
- [x] Egg diapause
- [x] Bug winter reserves
- [x] Seed banks rest in snow and drought, CPU and GPU JS loops
- [x] Stats, history, UI card, tooltip, render, icon
- [x] Gate 3 seeds vs base, determinism
- [x] SAVE_VERSION 2, no new classes, `SNAP_GRIDS` updated
- [ ] Browser screenshot
- [ ] GPU path run
