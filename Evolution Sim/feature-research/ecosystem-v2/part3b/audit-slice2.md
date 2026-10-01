# Part 3b Slice 2 audit: balance fixes

## Files changed

- `js/sim/animals.js`: balance constants (`GEN_TAX`, `GEN_LO`, `GEN_HI`, `COLD_UPKEEP`, `DRY_COST`, `SCAV_PLANT`, `EGG_LURE`, `HERB_GRAZE`), `_genT`, `DRY_COST` in `_decode`, `plantK`/`meatK` in `step` (graze, fruit, carrion), meat factor in `_attack`, cold upkeep in the cost, water animals eat eggs, egg lure in `_pickForage`.
- `js/sim/eggs.js`: `EGG_FAIL`, base failure roll in `step` (uses `animals.rng`).
- `js/sim/ecosystem.js`: `HERB_RESCUE = 30`; herbivore rescue tests land herbivores alone.
- `js/sim/plants.js`: `OLD_SEED`, `_selfSeed` on old-age death, water seedlings spared by `graze`, `PLANT_LIFE_WOOD` 30 → 40.
- `CODE_REFERENCE.md`: plants constants and life-stage notes, animal balance constants table and step notes, egg eating, eggs constants and step, ecosystem globals and `_migrations`.
- `complexities.md`: notes for animals, plants, eggs and ecosystem (scores unchanged).

## Final constants

| Constant | Plan | Final | Within ±50% |
| --- | --- | --- | --- |
| `HERB_RESCUE` | 30 | 30 | yes |
| `GEN_TAX` | 0.3 | 0.22 | yes |
| `COLD_UPKEEP` | 0.15 | 0.15 | yes |
| `HERB_GRAZE` (item 4) | up to +30% | 1.15 | yes |
| `SCAV_PLANT` | 0.5 | 0.5 (land, `scav > 0.5` only) | yes |
| `DRY_COST` | 0.08 | 0.08 | yes |
| `EGG_FAIL` | 0.001 | 0.0015 | yes |
| `EGG_LURE` | (new) | 4.5 | n/a |
| `OLD_SEED` | 1 | 1 | yes |
| `PLANT_LIFE_WOOD` | retry 40 | 40 (kept: no group died) | yes |

Item 4 diagnostic (seeds 42 and 123, years 5-10, before changes): grazing intake/cost 1.0-1.08, herbivores eating 58-71% of ticks, about half of herbivore ticks below 30% of `emax`, mean edible biomass on the current tile 0.16-0.24. Intake was the limit, so `HERB_GRAZE` 1.15 was applied.

## Results (final constants; runs `L4_*` in the scratchpad, 3 processes in parallel)

Values are seeds 42 / 7 / 123.

| Target | Part 3 / Slice P | 3000 ticks | Year 35 | Met |
| --- | --- | --- | --- | --- |
| Land herbivores ≥150, at most 2 rescues | P3 y35: 1 / 190 / 86 | 2666 / 2072 / 1441 | 2184 / 1219 / 909; 0 rescues | yes |
| Land scavengers ≤1000 and alive | P3 y35 42: 4363 | 2 / 2 / 8 | 10 / 27 / 7 | yes (low, fragile) |
| Herbivore mean diet ≤0.2 | n/a | 0.059 / 0.117 / 0.071 | 0.142 / 0.197 / 0.220 | 2 of 3 |
| Thirst share (cum/rolling) ≥2% y35, ≤10% at 3000 | P3 y35: 1.0 / 1.3 / 1.3 | 4.6 / 6.2 / 5.1 | 3.3 / 3.7 / 2.4 | yes |
| Egg loss 20-60% | n/a | 11.9 / 17.1 / 10.6 | 16.8 / 16.5 / 22.1 | seed 123 only |
| Hatches in water, amph, reptile | n/a | all > 0 | all > 0 | yes |
| Juveniles 15-40% of land | 15.7 / 18.1 / 23.1 | 30.7 / 38.9 / 36.1 | 30.5 / 33.5 / 29.7 | yes |
| Elders 5-20% | n/a | 15.6 / 10.0 / 14.6 | 30.4 / 22.1 / 22.3 | 3000 yes, y35 no |
| Mean age at old-age death ±10% | 819 / 781 / 755 (3000) | 781 / 717 / 762 (−4.6 / −8.2 / +0.9%) | 596 / 580 / 615 (no P3 ref) | yes at 3000 |
| All 9 groups alive | SP 3000: 42 and 7 lost a group | yes / yes / yes | yes / yes / yes | yes (42 waterCarn 0 at t15000, revived) |
| Plant cover within 5% of P3 (59.8k) | SP y35 42: 46680 | 57054 / 57030 / 56932 (−4.6%) | 52426 / 54149 / 55427 (−12.3 / −9.5 / −7.3%) | 3000 yes, y35 no |
| Tree/grass age ratio ≥5 | SP y35 42: 4.11 | 4.57 / 4.18 / 4.41 | 5.22 / 6.46 / 3.83 | 2 of 3 at y35 |
| ms/tick at 3000 (≤ +25%, 23-28) | 17.9 / 18.6 / 20.2 | 22.97 / 23.97 / 25.88 | n/a | inside 23-28 band; +28-29% vs P3 |
| Browser seed 42, no console errors | | not run (no browser in this environment) | | not verified |

Earlier round with `GEN_TAX` 0.15 and `PLANT_LIFE_WOOD` 30 (`L3_*`) gave year-35 herbivore diet 0.26 / 0.24 / 0.19, egg loss 12.7 / 15.7 / 34.0 and tree/grass 5.98 / 4.21 / 4.26, so 0.22 with wood 40 was kept.

## Deviations

- `SCAV_PLANT` applies only to land animals with `scav > 0.5`. The continuous form also taxed the water crustacean archetype (scav 0.65) and collapsed water omnivores.
- `EGG_LURE` value was not given in the plan; 4.5 was chosen.
- Egg loss stays below 20% on seeds 42 and 7 at the +50% `EGG_FAIL` ceiling. Fish lay among their own species, so water herbivores rarely stand on other species' eggs (2 of 206 sampled visits). Meeting it needs a new mechanic, not a tuning change.
- Year-35 elders (22-30%) and cover (−7 to −12%) miss. Both come mostly from Slice P lifespans; slice 2 raised seed 42 cover from Slice P's 46.7k to 52.4k.
- Herbivore diet 0.22 on seed 123 at year 35 is just over the target. A higher `GEN_TAX` (0.3) killed land omnivores on seed 7 at 3000 ticks.
- ms/tick exceeds +25% of Part 3 by 3-4 points (populations are larger), though it is inside the 23-28 band.

## Checklist

- [x] Items 1-9 implemented
- [x] All constants within ±50%
- [x] 3000-tick and year-35 runs on seeds 42, 7, 123
- [x] `CODE_REFERENCE.md` and `complexities.md` updated
- [x] Comment grep on `js` diff prints nothing
- [ ] Egg loss 20-60% on every seed
- [ ] Year-35 elders, cover, tree/grass on every seed
- [ ] Browser check
