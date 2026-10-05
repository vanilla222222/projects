# Part 2 item 6: performance audit

Base is commit efe6232. Everything ran headless in Node on the CPU path: map 320×210 (Medium), seeds 42, 7 and 123, 3000 ticks each. The harness loads the sim the same way the worker's `importScripts` does.

- **Test runs:** one full multi-seed run, comparing base and branch back to back per seed. Short single-seed runs (500 to 1500 ticks) were used to check bit-identity and to profile.
- **Result:** the simulation output is bit-identical to base on every seed tested. The CPU cut is only 2.5% on average, well short of the 15% target. Snapshot bytes per frame fell about 21%, and save files shrank about 19.5%.

## Changes

| Commit | Area | What |
|---|---|---|
| b50f995 | animals, plants, bugs | Species population sums are cached per tick. The move-angle trig tables were moved out of the hot loop. |
| 96914c7 | soil, disease | The soil step is split into `_uptake`, `_rows` and `_flow`, and the disease step into separate loops. Each loop now gets its own stable optimized code instead of one large function that OSR'd and deopted. |
| b7a0463 | plants (+ gpu/plantGpu.js cpuPart) | Germination and seed-bank decay now run in one pass (`_seedPass`) with a cached species lookup. The same change is mirrored in the GPU path's CPU part. |
| 077f3b8, reverted by 2d2f90d | animals | An early-rejection change to `_nearest` was bit-identical but measured about 25% slower in a replay microbenchmark, so it was reverted. |
| 51cc73c | animals, plants | `_newSpecies` sets `lifeSum`, `lifeN`, `colonyAlert`, `tools` (animals) and `animalSeeds` (plants) up front. Species objects now share one hidden class per group instead of several. |
| 2c3485c | simWorker.js | Field snapshots skip grids whose contents have not changed since the last send. See below. |
| b4f5325 | save.js, plants, soil, weather, bugs | Saves drop derived arrays and byte-shuffle wide numeric grids. If gzip is unavailable, the file is written uncompressed. See below. |

## ms/tick (3000 ticks, Medium 320×210)

| Seed | Base | Branch | Cut | Output |
|---|---|---|---|---|
| 42 | 20.03 | 19.51 | 2.6% | identical |
| 7 | 18.73 | 18.24 | 2.6% | identical |
| 123 | 18.70 | 18.27 | 2.3% | identical |
| Mean | 19.15 | 18.67 | 2.5% | |

"Identical" means the full end-of-run stats report matches base exactly, apart from timing. That report covers class counts, bird niches, minima, averages, speciations, deaths, nutrition, symbiosis, brain and disasters. A 500-tick hash over animal and plant arrays plus the RNG states also matches base (c116a9e6914e). The machine is noisy, at about ±3% from run to run, so the per-seed cuts are only approximate.

### Survival (branch, identical to base)

All six classes and all five bird niches stayed alive through 3000 ticks on every seed.

- **Seed 42.**
  - Lowest counts from tick 500: fish 638, amph 48, rept 110, mamm 357, bird 138, invert 496.
  - Lowest bird-niche counts: seed 41, insect 21, fisher 6, raptor 4, carrion 6.
- **Seed 7.**
  - Lowest counts from tick 500: fish 697, amph 104, rept 75, mamm 447, bird 77, invert 178.
  - Lowest bird-niche counts: seed 8, insect 9, fisher 5, raptor 2, carrion 10.
- **Seed 123.** 
  - Lowest counts from tick 500: fish 602, amph 41, rept 168, mamm 646, bird 68, invert 322.
  - Lowest bird-niche counts: seed 6, insect 24, fisher 3, raptor 5, carrion 9.

## Profile, seed 42, ticks 300 to 1300 (self time)

| Before (base) | | After (branch) | |
|---|---|---|---|
| plants.step | 37.0% | plants.step | 36.9% |
| animals.step | 12.1% | animals.step | 12.1% |
| soil.step | 9.2% | soil._flow + _uptake | 8.2% |
| animals._nearest | 4.9% | animals._nearest | 5.1% |
| bugs.step | 4.6% | bugs.step | 4.9% |
| plants._spread | 3.5% | animals._pickForage | 3.7% |
| animals._pickForage | 3.5% | ecosystem.step | 2.7% |
| ecosystem.step | 3.4% | plants.plantSeed | 1.9% |
| plants.plantSeed | 1.8% | plants._seedPass | 1.7% |
| plants.refreshSpeciesMeans | 1.4% | core.mutateGenes | 1.6% |

Total profiled time fell from 19.05 s to 17.95 s over the same 1000 ticks, about 6% with the profiler on. Line attribution mixes in inlined callees, so the `_spread`/`_bank` share moved into `_seedPass` and `plantSeed`. The plant per-slot growth loop is still over a third of the tick.

## Worker snapshots

Field snapshots now skip a grid when it holds the same array object as last time and its contents still match a shadow copy. The comparison runs over Int32 or Uint8 views, so -0 and NaN do not cause false matches.

- **Hot grids:** a grid that changes on 3 sends in a row (`GRID_HOT`) drops its shadow copy and is sent unconditionally. It is tested again after 24 sends (`GRID_RETRY`).
- **Volatile grids:** grids known to change every tick (`SNAP_VOLATILE`: plant species, biomass and other per-slot plant arrays, soil nutrient and litter, bug grids, weather wet and fresh) are never compared.
- **Unchanged paths:** the plant gene payload and the statics are sent exactly as before.
- **Client side:** `simClient.applyFrame` merges each layer with `Object.assign`, so an omitted grid keeps its previous array. The renderer reads arrays fresh every frame.
- **Correctness check:** a harness kept a client-side mirror and compared every SNAP_GRIDS grid against the live sim after each frame for 400 ticks. It found 0 mismatches, plant genes included.
- **Bytes:** 12.3 MB down to 9.8 MB per field frame at 320×210, a 21% cut.
- **Cost:** worker field-snapshot time rose by about 0.4 ms per field frame, which is the shadow compare and copy. Field frames are throttled, so this is far less than 1% of a tick on average.

## Save files

- **Derived arrays are no longer saved.** They are rebuilt on load by new `restoreDerived()` methods that reuse the constructor logic:
  - **PlantLayer:** `water`, `depth`, `habit` and `seasonAmp` come from the world through `_prepareClimate`. `tox`, `disp`, `shade` and `root` are rebuilt from genome offsets 4 to 7. They are never cleared separately from the genome, so the rebuild is exact for every slot.
  - **SoilLayer:** `base` comes from world fertility. `own`, `tile` and `row` are scratch that every step fully rewrites before reading.
  - **WeatherLayer:** `_evapK` comes from world temperature. `_queue` is BFS scratch.
  - **BugLayer:** `app`, `mob` and `rate` come from the genome, but only for slots whose genome was ever set. Never-used slots stay 0, as in the original.
- **Aliasing check:** none of these arrays is referenced from anywhere else in the object graph.
- **Byte shuffle:** typed arrays with at least 4096 elements and elements wider than one byte, other than genome arrays, are byte-shuffled before gzip. The record carries `x: 1`. Shuffling or transposing the genome arrays made them bigger, so they are left alone.
- **Gzip fallback:** without `CompressionStream`, or if compression fails, the file is written raw. On load, a file that starts with the save magic is read raw. Anything else is gunzipped, as before.
- **Compatibility:** `SAVE_VERSION` stays 2. Old saves still contain the derived arrays and have no `x` flags, and they load unchanged. `restoreDerived` runs only when a derived field is missing.

| Seed 42, tick 1500 | Size |
|---|---|
| Base format (gzip) | 16.37 MB |
| New format (gzip) | 13.18 MB (−19.5%) |
| New format, uncompressed fallback | 51.06 MB |

Encode time went from about 1.7 s to 1.5 s in Node. Load takes about 0.8 s.

## Determinism

Test: seed 42, saved at tick 1500, loaded, then 500 ticks stepped on the original and the copy. It was run three ways: with a new save, with a save written by the base `save.js`, and with the uncompressed fallback.

- **New save:** stats JSON identical, all three RNG states identical, re-encoded save bytes identical. The derived arrays match the original both straight after load (scratch excluded) and after 500 ticks (scratch included).
- **Old base-format save:** loads, and its run is identical to the original as well.
- **Old-format re-encode:** re-encoding the loaded copy in the old format gives a different byte stream. The only cause is key order, because rebuilt fields are appended after the loaded ones. Re-encoding in the new format, which skips those fields, is byte-identical.
- **Uncompressed fallback:** loads.

## Open issues

- **15% CPU target not met.** The cut is 2.5% on average, bit-identical. The tick is dominated by the plant per-slot growth loop (37%) and `animals.step` (12%). Both are already tight loops, and the remaining levers change float evaluation order or RNG draw order, which would break bit-identity. A larger cut would need to give up exact reproducibility versus base or move more work onto the GPU path, for example a flat per-slot struct-of-arrays rewrite or skipping empty slots through an occupancy list.
- **Small levers not done:**
  - caching plant genes in bugs (about 1%)
  - `_pickForage` climate lookups (`_clim`, about 14% of that function)
- **Deopt churn.** Several fields start as Smi 0 and later become doubles:
  - DisasterLayer `floodX`/`floodY`, `recovery`, `pioneerYoung`, `pioneerOld`
  - AnimalPool `fatBurned`, `dormBurned`
  - PlantLayer `dispBonus`

  These transitions cause occasional deopts of `animals.step` and of the disaster helpers after tick 300. Initializing them as doubles (for example `-0` or a non-integer sentinel) would avoid this, but the measured impact was negligible, so it was left alone.
- **The `_nearest` early rejection** was correct but slower and has been reverted. The cost is in the extra bound checks per candidate.
- **Snapshot compare cost.** Comparing a grid costs about 1.5 times as much as copying it. Grids that change often fall into the hot path after 3 sends, which caps the loss, but a grid that alternates between changing and not changing still pays for the compare.
- **Save key order.** An object loaded from a new save has its rebuilt derived fields last in key order. This does not affect the simulation, but a byte-compare in the old format between a loaded state and a live one will differ.
