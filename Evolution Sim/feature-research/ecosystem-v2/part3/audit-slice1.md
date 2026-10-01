# Part 3, slice 1 (water and weather): audit

## Files changed

- `js/sim/weather.js` (new): the `WeatherLayer` class and its constants.
- `js/sim/plants.js`: a new `moistMul` field (default `null`). The growth rate `r` in `step` is multiplied by `moistMul[i]`.
- `js/sim/ecosystem.js`:
  - `options.weather` (default true).
  - The `WeatherLayer` is built after the plants on RNG stream `seed+888`, and `plants.moistMul` is wired to it.
  - `setOn` and `step` run after `plants.step`. The season passed in is 0 when seasons are off.
  - `stats.weather = {storms, rainTiles, snowTiles, drought, droughts}` and `stats.meanWet`.
- `index.html`: a `js/sim/weather.js` script tag between `disease.js` and `ecosystem.js`.
- `CODE_REFERENCE.md`:
  - a new Weather section (constants, fields, methods, tuning notes);
  - Plants: the `moistMul` field and the growth formula;
  - Ecosystem: the option, RNG stream, fields, stats and step order;
  - the script-order line in the header.
- `complexities.md`:
  - a new `js/sim/weather.js` entry, scored 5;
  - the `ecosystem.js` note now mentions the weather wiring.
- `feature-research/ecosystem-v2/part3/audit-slice1.md` (this file).

Scratchpad files, not in the repo:
- `part3run.js`: a copy of `part2run2.js` that loads `weather.js` (set `NOWX=1` to skip it) and adds a `weather` block to each `RESULT`.
- `wxonly.js`: a weather-only harness (world, plants and weather) used for fast constant sweeps.
- `wxdiag.js`: the wetness histogram diagnostic.
- `wxcheck.js`: checks for `waterDist`, drought and the on/off toggle.
- `p3s0/js`: a snapshot of the Part 2 final code, used as the baseline.
- Results: `p3s1_base_*.txt`, `p3s1_new_*.txt` and `p3s1_35_*.txt`.

## Final constants

| Constant | Value | Plan |
| --- | --- | --- |
| `WEATHER_EVERY` | 4 | every 4 ticks |
| `WATER_DIST_MAX` | 40 | 40 |
| `MAX_STORMS` | 8 | 8 |
| `STORM_P` | 0.2 per update | not given |
| `STORM_SEASON` | 0.8, multiplier `1 - 0.8*season` | "rises in the wet season" |
| `STORM_R_MIN`, `STORM_R_MAX` | 6, 18 | 6–18 |
| `STORM_RAIN` | 0.25 (×0.6–1.4 per storm) | not given |
| `STORM_SPEED` | 0.7 tiles/tick (×0.6–1.4) | not given |
| `STORM_LIFE_MIN`, `STORM_LIFE_MAX` | 120, 360 | not given |
| `STORM_SAMPLES` | 5 (spawn at the most humid sample) | "biased toward high humidity" |
| `WIND_TURN` | 0.01 rad/update | "slowly rotating" |
| `EVAP` | 0.0017, proportional | not given |
| `SNOW_T` | 0.28 | 0.28 |
| `SEASON_T` | 0.08 | 0.08 |
| `SNOW_MELT` | 0.02 per update | not given |
| `SNOW_SHOW` | 0.1 | not given |
| `POOL_WET` | 0.7 | 0.7 |
| `DROUGHT_P` | 0.2 | 0.2 |
| `DROUGHT_MIN`, `DROUGHT_MAX` | 240, 720 | 240–720 |
| `DROUGHT_STORMS` | 0.2 | −80% |
| `DROUGHT_EVAP` | 2 | ×2 |
| `DROUGHT_MOIST` | 0.8 when `wet < 0.1` | 0.8 |
| `DRY_FLOW` | 0.5 | not given |
| `MOIST_BASE`, `MOIST_K` | 0.8, 0.4 | 0.8 + 0.4·wet |

**How the values were tuned.** Weather does not depend on animals, so tuning used `wxonly.js` (35 years in about 10 s).

- The first pass had `EVAP` 0.006, `STORM_P` 0.06 and `STORM_RAIN` 0.12. It gave a mean wet of 0.10 and a mean `moistMul` of about 0.85.
- The wetness histogram showed that 63% of land sat below 0.1. Coverage, not rain amount, was the limit: storms saturate the tiles under them at 1 and leave the rest dry.
- Lowering `EVAP` to 0.0015–0.002 was the lever that worked. Faster storms with less rain each spread the water further before it clamps at 1.
- Of 11 sweeps, variant K was kept.

## Numbers

**3000 ticks.** The baseline (`p3s0`, Part 2 final) and the new code ran at the same time, 9 processes on 12 cores with a load average of about 18.

| Seed | ms/tick base → new | Δ | Groups alive (new) | Niches | Plant cover base → new | Storms now / mean | Snow tiles | Droughts (start ticks) | Mean `moistMul` outside droughts (during) | Storm spawns by quarter (Sp/Su/Au/Wi) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 42 | 31.18 → 34.52 | +10.7% | 7/7 | 4/4 | 59886 → 59915 (+0.05%) | 2 / 4.79 | 6993 | 1 (1920) | 0.989 (0.992) | 17/15/40/26 |
| 7 | 33.69 → 34.39 | +2.1% | 7/7 (the baseline lost `waterOmni`) | 4/4 | 59926 → 59947 (+0.04%) | 2 / 4.45 | 5525 | 2 (480, 2880) | 0.972 (0.962) | 15/14/36/22 |
| 123 | 36.40 → 43.15 | +18.5% | 7/7 | 4/4 | 59699 → 59813 (+0.19%) | 3 / 5.36 | 5002 | 1 (1440) | 1.036 (1.041) | 18/14/38/20 |

- The weather layer on its own costs about 0.5 ms/tick (`wxonly.js`).
- Most of the extra time on seed 123 comes from a larger population, not from weather work. At tick 3000 there were 2349 land herbivores against 919 in the baseline, and 3396 fish against 1121.

**Year 35 (`p3s1_35_*.txt`, same load).**

| Seed | ms/tick (the window from year 20 to 35) | Groups (land H/O/C/S \| water H/O/C) | All 7 alive | Niches | Plant cover (Part 2 final) | Droughts by year 35 | Mean `moistMul` outside droughts (during) | Mean wet (range) | Snow tiles | Highest base temperature with snow |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 42 | 53.0 | 79 1046 108 767 \| 7 4897 77 | yes | 4/4 | 59784 (59784) | 5 | 1.001 (0.967) | 0.534 (0.383–0.625) | 8376 | 0.360 |
| 7 | 51.1 | 87 1975 37 3 \| 1 4686 190 | yes | 4/4 | 59818 (59787) | 6 | 1.003 (0.975) | 0.534 (0.345–0.621) | 7318 | 0.360 |
| 123 | 48.4 | 2 1496 145 3 \| 40 5301 2 | yes | 4/4 | 59872 (59226) | 2 | 1.045 (1.014) | 0.442 (0.442–0.674) | 4614 | 0.360 |

- Storm spawns by quarter over 35 years were 75/84/217/148, 77/89/222/155 and 81/91/210/136. Storms spawn all year, and autumn and winter have about 2.3× the spawns of spring and summer.
- Snow only lies on tiles with a base temperature ≤ 0.36, which is `SNOW_T + SEASON_T`. The mean base temperature of snowy tiles is 0.14–0.16, against a land median of 0.42–0.54.
- Part 2's year-35 ms/tick was 46.5 / 48.1 / 48.4 under a similar but lighter load (about 12 processes).

## Gates

| Gate | Result |
| --- | --- |
| ms/tick at 3000 ticks within +25% | **Pass:** +10.7%, +2.1% and +18.5%. |
| All 7 animal groups and 4 bug niches alive | **Pass** at 3000 ticks and at year 35 on all 3 seeds. Year 35 is thin in places: water herbivores are down to 1 on seed 7, and land herbivores to 2 and land scavengers to 3 on seed 123. |
| Plant cover within 10% | **Pass:** within 0.2% at 3000 ticks and within 1.1% at year 35. |
| Mean `moistMul` 0.95–1.05 outside droughts | **Pass:** 0.972–1.036 at 3000 ticks, and 1.001–1.045 over 35 years. |
| Storms year-round, skewed to the wet season | **Pass**, see the spawn quarters above. |
| Snow only in cold areas | **Pass**, see the snow figures above. |
| At least 1 drought per seed by year 35 | **Pass:** 5, 6 and 2. |

## Deviations from the plan

**Interpretations:**
- **Evaporation is proportional:** `wet -= wet*EVAP*(0.5+T)`, not a fixed subtraction. A fixed amount dried tiles to 0 between storms, and a mean wet of about 0.5 could not be reached.
- **The dry season is suppressed as well as the wet season boosted.** The spawn multiplier is `1 - 0.8*season`, so it is 0.2× at the dry peak and 1.8× at the wet peak.
- **`wet` starts at `world.humidity`** on land tiles, which keeps the start-up transient short.

**Storms and water tiles:**
- Storms spawn anywhere on the map, including over the sea. Rain and snow are only applied to land tiles (`plants.water === 0`).
- Water tiles keep `wet` and `snow` at 0 and `moistMul` at 1.

**`waterDist` and `fresh`:**
- `waterDist` does not traverse ocean tiles. Unreached tiles, ocean included, hold the cap of 40.
- Pools set `fresh` every update, but they are not BFS sources. This matches the plan's rule of rebuilding only on drought changes.

**Droughts:**
- The drought roll happens once a year at `tick % YEAR_TICKS === 0`. The one-year gap is measured from the end of the previous drought, so a drought can start as early as tick 480 (seed 7 does this).
- `setOn(false)` ends a running drought silently.
- The effect of a drought on `moistMul` is mild: the mean dips by 0.02–0.03. The plan only doubles evaporation, and at the tuned `EVAP` wetness takes several hundred ticks to fall. The `wet < 0.1` penalty therefore reaches few tiles. A stronger drought would need a larger `DROUGHT_EVAP` or a direct `wet` cut at the start, which is a design decision left to slice 2 or later.

**Constants and stats:**
- New constants the plan did not name: `STORM_P`, `STORM_RAIN`, `STORM_SPEED`, the storm life range, `STORM_SAMPLES`, `WIND_TURN`, `EVAP`, `SNOW_MELT`, `SNOW_SHOW` and `DRY_FLOW`. All plan values are unchanged.
- `stats.weather.rainTiles` counts land tiles rained on in the last update.
- `stats.weather.snowTiles` counts land tiles with snow cover above 0.1. It is a cover count, not a snowfall count.
- `stats.weather.drought` is a boolean.

**Not done in this slice:**
- The headless browser check. The plan lists it as a Part 3 gate, but the slice 1 brief did not ask for it.
- Weather events use the default `•` glyph until slice 3 adds `EVENT_GLYPH.weather`.

## Checklist

- [x] **No new comments.**
  - `diff -r scratchpad/p3s0/js js | grep '^>' | grep -E '//|/\*'` is empty.
  - `grep -E '//|/\*' js/sim/weather.js` is empty.
  - The only `index.html` change is the script tag.
- [x] **No per-tick allocations.**
  - The storm pool is preallocated. The BFS uses a preallocated Int32 queue, and the rain stamp is an Int32 `_mark` with a pass counter.
  - The only work done every tick is setting `season`/`seasonT` and the `tick % 4` check.
- [x] **`CODE_REFERENCE.md` has all the new entries:**
  - the `## Weather (\`js/sim/weather.js\`)` section;
  - the Plants `moistMul` field and the growth formula;
  - the Ecosystem `weather: true` option, the `seed+888` stream, the `stats.weather` and `meanWet` fields, and step 4 (weather after plants).
- [x] **`complexities.md`** has the `js/sim/weather.js` row, scored 5.
- [x] **The `options.weather` toggle works** (`wxcheck.js`). While it is off, `wet` stays frozen, `moistMul` is 1 everywhere and there are no storms. Turning it back on resumes the weather. With seasons off, `seasonT` is 0.
- [x] **`index.html` script order:** `disease.js`, then `weather.js`, then `ecosystem.js`.

## Notes for slice 2

**API:**
- `eco.weather` is the layer. It is `null` if `weather.js` is not loaded, so guard with `if (W)`.
- **Fields:**
  - `waterDist` (Uint8, 0 on fresh lake, river or pond tiles, capped at 40);
  - `fresh` (Uint8, includes pools);
  - `wet` and `snow` (Float32);
  - `drought` (bool);
  - `effTemp(i)`, or inline `world.temperature[i] + W.seasonT`.
- `waterDist` and `fresh` only change when a drought starts or ends. Pools also change `fresh`, every 4 ticks.

**Update timing:**
- `weather.step` runs before bugs and animals within a tick. Animals see this tick's `seasonT` and the wetness from the latest update, which happens every 4 ticks.

**Drinking and `waterDist`:**
- Every lake, river and pond tile is a water tile for plants (`plants.water = 1`; on seed 42 that is 2019, 1849 and 310 tiles). The land tile next to one has `waterDist` 1, so the plan's `waterDist <= 1` drinking test works from the bank.
- `wet` and `snow` are 0 on those tiles, and `fresh` on them only changes at drought boundaries (`_setFresh`).
- On seed 42, about 17k tiles are within 5 steps of fresh water and about 18k are capped at 40. Many of the capped tiles are ocean, but dry inland tiles far from water also exist. A thirst gradient step on a capped tile has no direction, so fall back to foraging or to `wet` (mean about 0.5, with pools above 0.7).
- During a drought, the number of fresh tiles drops by about 28% on seed 42 (4178 → 3013).

**Behaviour to expect:**
- Thirst pressure from droughts will be driven mostly by `fresh` and `waterDist` shrinking, not by `wet`, because `wet` falls slowly.
- Seed 123 has only 2 droughts in 35 years, and its second starts at tick 16320. Thirst-share targets measured at year 35 on that seed will mostly reflect non-drought years.

**Tuning caveat:**
- Weather is deterministic per seed and independent of animals. Changing any weather constant, or the order of weather RNG calls, changes every downstream run. Keep the order of RNG calls in `step` if slice 2 adds draws, or give new draws their own stream.
