# Audit: Part 3b slice P (plant life stages)

## Files changed

- `js/sim/plants.js`: life-stage and seed-bank constants; `floorM`, `age`, `life`, `seedDens`, `seedSp`, `seedGenome`, `stages`, `oldDeaths`, `germinated`, `grazedSeedlings` and `snow`; `matureAt`, `_germinate` and `_bank`; changes to `_set`, `_seedFounder`, `_assign`, `graze`, `step`, `_spread`, `plantSeed` and `reassignSpecies`.
- `js/sim/ecosystem.js`: the `stats.plantStages` literal and its copy in `_computeStats`, plus `plants.snow = weather.snow`.
- `js/render.js`: `OLD_RGB` and `OLD_MIX`; `_tinted(..., old)`; seedling size scaling and old greying in `_pushPlants`.
- `CODE_REFERENCE.md`: Plants (constants, fields, `matureAt`, `plantSeed`, step, a new "Life stages and seed bank" mechanics block, `reassignSpecies`), Ecosystem (`stats.plantStages`, the `snow` assignment) and Renderer (the `_tinted` old mix, seedling size).
- `complexities.md`: notes on `plants.js` and `render.js`.
- `feature-research/ecosystem-v2/part3b/screenshots/plants.png`: the screenshot.
- `animals.js` was not touched.

## Decisions

- Ages are Uint16 counts of 8-tick units. Ageing and old-death rolls happen on `tick & 7 === 0`. Stage counts are taken every tick; `seedTiles` is taken on age-step ticks.
- Lifespan in years is `1.5 + 30*wood^2` (fungi 1 year), with ±15% jitter.
  - The 30 gives grass 1.5–4.2 years and trees 12–35 years.
- A slot is a seedling while `age < max(5% of life, 30 ticks)`. A seedling:
  - has a floor of 0 (the floor is restored from `floorM` when it matures);
  - has its K ramped from 0.3 up to 1;
  - does not fruit or spread;
  - is killed when a bite leaves it below 0.03.
- A slot is old once `age > 0.8*life`. An old slot has 0.6× growth, 0.5× fruit and a grey tint. Past `0.9*life` it has an exponential death hazard.
- Seed bank: each tile holds one genome and species with a density from 0 to 1. Banking and germination work as follows.
  - Seeds are banked by `_spread`'s same-species skip (using the parent genome, so the coin still comes before mutation for performance) and by failed but climate-viable `plantSeed` attempts. This includes dry (`moistMul < 0.9`) and snowy land tiles.
  - The stored genome is replaced with probability `add/(d+add)`.
  - Germination chance is `GERM_P*d*moistMul*(1-snow)` into the empty target slot. Success halves the density; failure clears the bank.
- `_assign` keeps the age on an in-place same-species upgrade. Without this, upgrades reset age, which halved biomass and pushed seedlings above 30%.
- Founders start at a random age from 0 to 0.8×life, so the map does not age in lockstep.

## Final constants

| Constant | Value | Plan / note |
| --- | --- | --- |
| AGE_STEP | 8 | |
| PLANT_LIFE_BASE / PLANT_LIFE_WOOD | 1.5 / 30 | 40 tested: tree/grass ratio 6.2 at y35, but groups went extinct at 3000 on seeds 42 and 7, so it was rejected |
| FUNGUS_LIFE | 1 | |
| LIFE_JITTER | 0.15 | |
| SEEDLING_FRAC / SEEDLING_MIN | 0.05 / 30 | tuned −50% from 0.1 / 60 |
| SEEDLING_K0 / SEEDLING_KILL | 0.3 / 0.03 | 0.45 and 0.015 tested with no gain |
| OLD_FRAC / OLD_GROWTH / OLD_FRUIT | 0.8 / 0.6 / 0.5 | |
| OLD_DEATH_FRAC / OLD_DEATH_P / OLD_DEATH_K | 0.9 / 0.006 / 8 | P tuned +50% |
| SEED_DRY / SEED_ADD / SEED_MAX | 0.9 / 0.1 / 1 | |
| SEED_DECAY / SEED_MIN | 0.985 / 0.02 | |
| GERM_P / GERM_USE | 0.12 / 0.5 | GERM_P tuned +50% |

## Results

### 3000 ticks (3 seeds in parallel)

| Seed | Cover (base → P) | Seedlings | Old deaths (grass / shrub / tree) | Germinations | Grazed seedlings | ms/tick (base → P) | Groups alive |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 42 | 59835 → 56408 (−5.7%) | 9.8% | 41579 / 2405 / 1368 | 55365 | 68877 | 17.2 → 19.9 (whole run 18.0) | all |
| 7 | 59798 → 56137 (−6.1%) | 10.1% | 42495 / 6437 / 663 | 63143 | 62271 | 23.9 → 20.5 (18.9) | all |
| 123 | 59846 → 56464 (−5.7%) | 12.2% | 36080 / 307 / 1237 | 59754 | 106083 | 26.5 → 22.2 (20.0) | all |

`stats.plantStages` at t=3000 on seed 42: `{seedTiles 58187, seedlings 9120, mature 71172, old 12758, oldDeaths 81627, germinated 55365, grazedSeedlings 68877}`.

### Seed 42 to year 35

| Year | Cover | Seedlings | Old | Tree/grass mean age | Old deaths (grass / shrub / tree / fungus / water) | Germinations | ms/tick |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 5 | 56572 | 7.4% | 13532 | 4.77 | 36245 / 1758 / 963 / 262 / 28935 | 41377 | 17.4 |
| 10 | 54412 | 12.9% | 10357 | 5.21 | 55609 / 3378 / 2450 / 2274 / 52335 | 98802 | 24.0 |
| 20 | 50784 | 13.9% | 12174 | 5.26 | 78630 / 3901 / 5368 / 41220 / 78751 | 226841 | 31.6 |
| 30 | 47934 | 13.5% | 14737 | 4.92 | 95263 / 4186 / 11608 / 156593 / 98236 | 350501 | 33.0 |
| 35 | 46680 | 15.2% | 13390 | 4.11 | 100681 / 4336 / 14758 / 231369 / 107061 | 417380 | 32.3 |

At year 35 the mean age is 7.73 years for trees and 1.88 years for grasses. All groups were alive at every checkpoint. Part 3's run to year 35 logged 36–53 ms/tick.

### Targets

| Target | Result |
| --- | --- |
| Cover within 8% of Part 3 | Pass at 3000 ticks (−5.7 to −6.1%). **Fail** in the long run: −22% at y35 (46.7k vs about 59.8k). |
| Seedlings 5–25% of occupied slots | Pass (5.9–16.5% at every checkpoint) |
| oldDeaths > 0 for grass, shrub and tree by y35 | Pass |
| Tree mean age ≥ 5× grass | Partial: 5.2 from y10 to y20, then 4.9 at y30 and 4.1 at y35; 4.2–4.6 at 3000 ticks |
| Germinations > 0 on every seed | Pass |
| All animal groups alive | Pass (3 seeds at 3000 ticks, and seed 42 to y35) |
| ms/tick within +25% | Pass (18.0–20.0 vs 17.2–26.5 at 3000 ticks; long run below Part 3) |
| Browser console errors | None: headless Chrome, seed 42 at tick 2400, `errs []` |

## Deviations

- `ecosystem.js` sets `plants.snow = weather.snow` in addition to the stats line. Snow gates banking and germination.
- Founder ages are randomized; `_assign` keeps the age on in-place upgrades.
- The seedling K ramp is applied after the `K < 0.015` check, so young plants are not culled as shaded.
- Seeds are banked only when climate-viable (`fit >= 0.04`), with the dry/snow gate after the fit check. A failed germination clears the bank. `GERM_USE`, `SEED_ADD` and `SEED_MAX` were my own choices.
- `_spread` banks the unmutated parent genome on a same-species skip.
- Long-run cover declines by about 1.1k tiles per 5 years. Diagnostics showed the gaps are mostly in water (grazing kills of seedlings), glacier, alpine and tundra, where only founders had established. GERM_P, OLD_DEATH_P, SEEDLING_KILL and SEEDLING_K0 variants within ±50% did not stop it. **This is unresolved.**
- The tree/grass ratio target is missed after year 25. Raising PLANT_LIFE_WOOD to 40 fixes the ratio but broke group survival.

## Checklist

- [x] Baseline on seeds 42, 7 and 123 at 3000 ticks
- [x] Implemented within slice P scope; `animals.js` untouched
- [x] Verified on 3 seeds at 3000 ticks
- [x] Seed 42 run to year 35
- [x] `stats.plantStages` reported
- [x] Browser check with no console errors
- [x] `screenshots/plants.png`: seedlings beside mature plants, greyed old conifers
- [x] `CODE_REFERENCE.md` and `complexities.md` updated
- [x] Comment grep is empty
- [ ] Long-run cover target (see Deviations)
- [ ] Tree/grass ≥ 5× at year 35 (see Deviations)
