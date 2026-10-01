# Part 3, slice 2 (animals): audit

## Files changed

| File | Change |
| --- | --- |
| `js/sim/animals.js` | `AG` 15 (genes 11–14: terr, herd, cold, dry), weights, gene tails on every archetype, 8 new role-tagged archetypes (amph: frog, newt, salamander, crocodile; reptile: lizard, tortoise, monitor, snake), 8 new categories and labels, domain 2 with `DOMAIN_BIT`/walk bit 4 (`setWeather`), thirst and water seeking (`_seekWater`, `_pickWater`, state 5), dehydration cost and death, territory (`terr*` tile arrays, `_stamp`, `_homeK`, `_chaseRival`, `_nearest` mode 3), herds (centroid pull, attack safety, contact boost), cold-blooded metabolism and slowdown, `_clim` with `dry`, `_pickCarrion`, `RES_NUDGE`, new fields `terr herd cold dry hr water hx hy`, `landDeaths`, `deaths.thirst`, `holders`. |
| `js/sim/disease.js` | `RES_DUR` 0.6: infection duration `*(1 - RES_DUR*res)`. |
| `js/sim/soil.js` | `carrionCell` per 6×6 grid cell, rebuilt every `CARRION_CELL_EVERY` (10) steps. |
| `js/sim/ecosystem.js` | 9 `STAT_GROUPS` (`amphib`, `reptile`), classification order, `animals.setWeather` before founders, amph placement at `waterDist <= 2`, amph/reptile revival, `pick()` skips role-tagged archetypes, `_thirstStats`, `_herdStats`, stats `thirstDeaths thirstShare herds territories deaths`. |
| `js/main.js` | Crash safety only: `GROUP_COLORS.amphib` `#5fbf9a`, `GROUP_COLORS.reptile` `#c9a043`, tooltip state 5 "seeking water". |
| `CODE_REFERENCE.md` | Animals, Soil, Disease and Ecosystem entries. |
| `complexities.md` | animals.js 8.5 → 9, ecosystem.js 6 → 6.5, with notes. |

## Final constants (animals.js unless noted)

| Constant | Plan | Final |
| --- | --- | --- |
| `THIRST` | 0.004 | **0.02** |
| `THIRSTY` | 0.35 | 0.35 |
| `DRINK_WET` | 0.35 | **0.6** |
| `AMPH_DRINK_WET`, `AMPH_DRY`, `AMPH_RANGE`, `AMPH_DEPTH` | 0.5, 2, 5, 0.35 | same |
| `DEHYDRATE_COST` | 2.5 | 2.5 |
| `DEHYDRATE_DEATH` | 0.004 | **0.02** |
| `FRUIT_WATER`, `GRAZE_WATER`, `MEAT_WATER` | 0.15, 0.02, 0.2 | same |
| `WATERHOLE`, `WATER_SAMPLES` | 0.25, 8 | same |
| `COLD_META` | 0.45 | **0.225** |
| `COLD_SLOW` | 0.6 | **0.9** |
| `TERR_MIN`, `TERR_EVERY`, `TERR_HOLD` | 0.5, 10, 30 | same |
| `TERR_RIVAL`, `TERR_BITE`, `TERR_REPRO`, `TERR_COST` | 0.3, 0.15, 0.15, 0.08 | same |
| `HERD_MIN`, `HERD_PULL`, `HERD_SAFE`, `HERD_SAFE_N`, `HERD_CONTACT` | 0.4, 0.6, 0.5, 6, 0.6 | same |
| `RES_NUDGE` | 0.02 | 0.02 |
| `RES_DUR` (disease.js) | 0.6 | 0.6 |
| `CARRION_CELL_EVERY` (soil.js) | 10 | 10 |
| `THIRST_EVERY`, `THIRST_WINDOW`, `HERD_STAT_POP` (ecosystem.js) | 60, 8, 12 | same |

## Numbers (seeds 42 / 7 / 123)

Runner: `part3run.js <seed> 5,6.25,10,20,35`. Runs are deterministic; the 3000-tick timing comes from a separate clean 3-seed parallel run (`s2f_*`), the same load as the Part 2 and slice-1 baselines.

### Gates

| Gate | 42 | 7 | 123 | Status |
| --- | --- | --- | --- | --- |
| ms/tick at 3000 (Part 2 base) | 27.0 (31.2) | 28.1 (33.7) | 30.8 (36.4) | pass (−13 to −17%) |
| ms/tick at 3000 (slice 1) | vs 34.5 | vs 34.4 | vs 43.2 | pass |
| Plant cover at 3000 (Part 2) | 59833 (59886) | 59853 (59926) | 59846 (59699) | pass (<0.3%) |
| 9 groups + 4 niches at 3000 | yes | yes | yes | pass |
| 9 groups + 4 niches at year 35 | yes (landHerb 1) | **no: waterHerb 0** | yes | 2/3 |

### Targets

| Target | 3000: 42 / 7 / 123 | Year 35: 42 / 7 / 123 | Status |
| --- | --- | --- | --- |
| Thirst % of land deaths, cumulative (rolling 1 yr) | 4.7 (1.4) / 4.1 (0.9) / 2.9 (1.5) | 1.0 (0.2) / 1.3 (0.1) / 1.3 (3.7) | met early (year 5: 5.3 / 5.6 / 3.3), falls later |
| Droughts | 1 / 2 / 1 | 5 / 6 / 2 | pass |
| Terr carn vs herb (≥2×) | 0.48 v 0.06 / 0.51 v 0.05 / 0.44 v 0.06 | 0.16 v 0.21 / 0.39 v 0.34 / 0.45 v 0.24 | pass at 3000; drifts by year 35 |
| Herd herb > carn | 0.52 v 0.10 / 0.46 v 0.09 / 0.50 v 0.08 | 0.16 v 0.17 / 0.20 v 0.16 / 0.20 v 0.16 | pass except 42 year 35 |
| Amph mean `waterDist` ≤ 3 | 2.19 / 1.81 / 2.07 | 1.64 / 1.45 / 1.78 | pass |
| Reptile T ≥ land T + 0.1 | 0.64 v 0.38 / 0.70 v 0.50 / 0.76 v 0.50 | 0.67 v 0.48 / 0.58 v 0.41 / 0.68 v 0.50 | pass |
| Resistance of most-infected species, year 5 → 35 | Cursorefelis 0.159 → 0.171 / Rufialagus 0.151 → 0.279 / Argagnathus 0.176 → 0.094 (fell) | | pass (2/3) |
| Carrion % of scavenger energy (cumulative) | 25.5 / 26.6 / 45.2 | 60.5 / 28.9 / 20.2 | pass |
| `stats.herds` / `stats.territories` | 5 / 5 / 5 ; 27 / 85 / 19 | 2 / 2 / 0 ; 209 / 351 / 25 | reported |

Year-35 group counts: 42 `landHerb 1 landOmni 94 landCarn 8 landScav 4363 waterHerb 72 waterOmni 1910 waterCarn 12 amphib 59 reptile 489`; 7 `190 733 54 1 0 4708 94 596 603`; 123 `86 485 69 173 26 5416 18 18 701`.

**Watch item, land herbivores:** 1023 / 1118 / 862 at 3000, 1 / 190 / 86 at year 35 (slice 1 was 79 / 87 / 2). Still thin, and the late take-over by land scavengers (42) and water omnivores (all seeds) predates slice 2. Water herbivores at year 35 were already 7 / 1 / 40 in slice 1; no existing revival rule fires because `waterHerb + waterOmni` stays large.

## Deviations

1. **Thirst constants.** The plan's `THIRST` 0.004 / `DRINK_WET` 0.35 / `DEHYDRATE_DEATH` 0.004 gave 0 thirst deaths: grazing water and the many wet tiles kept animals full, and gradient seeking always reached water. Final 0.02 / 0.6 / 0.02 (all beyond ±50%). A starvation death while dehydrated (`water <= 0`) is also counted as `deaths.thirst`. This gives 3–6% of land deaths in years 1–6. The share then falls to 1–1.3% cumulative by year 35 as populations settle near water; no mass die-off in dry interiors.
2. **Loss formula** uses `0.6 + temp + seasonT + (drought ? 0.4 : 0)`, which matches the plan's `0.4*drought` term with the seasonal temperature added.
3. **Amphibian walk bit excludes ocean.** With the plan rule (all water with depth < 0.35) amphibians colonised shallow sea coasts (where `waterDist` is 40), so mean `waterDist` reached 7–28 by year 35. They are now restricted to shallow non-ocean water.
4. **Cold-blooded tuning.** At `COLD_META` 0.45, reptiles reached 2300–7500 by year 35 and displaced every land group. Final values are 0.225 / `COLD_SLOW` 0.9, both at the ±50% limit.
5. **`pick()` in migrations skips role-tagged archetypes**, so the old herbivore and predator revival never draws an amphibian or reptile.
6. `HERD_STAT_EVERY` is defined, but `_herdStats` runs inside the existing 20-tick block.

## What slice 3 must add

1. Icons: frog, newt, salamander, crocodile, tortoise, lizard, snake, monitor (plus any further variants per the plan). Until then they fall back to `ICONS.dot` / `ICON_INDEX.dot`, with no crash.
2. `ANIMAL_ICON_VARIANTS` entries for the 8 new categories.
3. Final `GROUP_COLORS` for `amphib` and `reptile` (placeholders `#5fbf9a`, `#c9a043` are in).
4. Stat-card tooltip domain text: it still uses `g.domain ? 'Water' : 'Land'`, so Amphibians shows "Water". It needs Land / Water / Amphibious.
5. Species tabs: `speciesInTab` and `updateTabCounts` treat domain `'amph'` as neither land nor water, so amphibian species appear in no tab.
6. The state 5 label "seeking water" is already in the tooltip states array.

## Checklist

- [x] No new comments: `diff -r p3s1snap/js js | grep '^>' | grep -cE '//|/\*'` → 0.
- [x] CODE_REFERENCE.md entries, by grep: `G_TERR` 1, `carrionCell` 2, `RES_DUR` 1, `RES_NUDGE` 2, `amphib` 10, `_thirstStats` 2, `domain 2` 4, `THIRST` 4.
- [x] complexities.md: animals.js `| 9 |`, ecosystem.js `| 6.5 |`.
- [x] No git state changes.
- [ ] Year-35 all-groups gate on seed 7 (waterHerb 0). Next step: a water-herbivore revival that fires on `waterHerb === 0` (a scope addition needing approval).
- [ ] The thirst share after year 10 is below 3%. Next step: decide whether the target is meant as an early-run or a long-run figure.
