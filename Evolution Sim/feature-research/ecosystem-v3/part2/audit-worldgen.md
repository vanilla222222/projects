# Part 2 audit: world generation and new biomes

Items 3 and 4 of Part 2: a reworked world generator and six new biomes.

## What changed

- **Generator version.** `WorldMap` takes `options.gen`. The default is `WG_GEN` (3). Gen 2 is the old generator, and on seeds 42, 7 and 123 its output matches the pre-rework code tile for tile.
- **Gen 3 generation (`js/mapGenerator.js`):**
  - **Continents and islands:** continents are placed as spread-out ellipses and islands as small stamps, both sampled through a two-scale domain warp so the coasts look fractal.
  - **Straits:** Voronoi straits keep the continents apart.
  - **Ridges and sea level:** mountain ridges are masked to inland tiles, and sea level is set by quantile so the ocean share is 34%.
  - **Wind and rain:** a per-row wind sweep (westerlies or trade winds) drops rain on windward slopes and leaves rain shadows behind ridges.
  - **Lakes and rivers:** there are 1.6× as many lake basins, and lakes get outflow rivers.
  - **Salt basins:** a dry, warm lake becomes an endorheic salt flat.
  - **Deltas:** a large river mouth gets a delta with 2–3 arms and sediment fans.
  - **No NaN:** `_sanitizeFields` removes NaN tiles. Gen 2 seed 123 had one.
- **New and newly used biomes (`js/biomes.js`):**
  - `SALT_FLAT`, `TUNDRA_BOG` and `CORAL_REEF` are appended to the biome list, so the old ids do not change.
  - `MANGROVE`, `CLOUD_FOREST` and `STEPPE` already existed, but the old generator never produced them. Gen 3 now classifies tiles as these biomes.
  - The legend and the biome view read `BIOME_LIST` and `BIOME_COLOR_TABLE`, so the new biomes appear in them without UI changes.
- **Plant pressures (`js/sim/plants.js`):**
  - Habitat penalties: salt flat 0.3, tundra bog 0.7, mangrove 1.05, cloud forest 1.15 and coral reef 1.5.
  - The `biomeFit` factor in `capFor` and the seed-bank gate:
    - Salt hurts shallow-rooted plants on salt flat and mangrove.
    - Woody plants are held back on salt flat, steppe and tundra bog, but favoured in mangrove.
    - Shade-tolerant plants gain in cloud forest.
  - Coral reef counts as water.
  - The GPU only reads `cap`, which is computed on the CPU, so it needs no change.
- **Animal pressures (`js/sim/animals.js`):**
  - Walk bit 64 marks saline tiles (salt flat and mangrove), where water loss is ×1.5.
  - Walk bit 128 marks mire and reef tiles (tundra bog, bog and coral reef). Land animals move at 0.7× speed there, and water prey get +0.2 cover from attack.
- **Saves (`js/save.js`, `js/simClient.js`, `js/simWorker.js`):**
  - The header gains `worldGen`. Decode rebuilds the world with `gen = worldGen || 2`, so a save made before this change regenerates its original world.
  - `SAVE_VERSION` stays 2.

## Follow-up fixes

These address open issues 1–3 from the first gate run.

- **Fresh water for amphibians:**
  - Gen 3 places 2.5× as many ponds (`WG_POND_MUL`).
  - Rivers start at a 0.8× flow threshold (`WG_RIVER_K`).
  - The land humidity ceiling rose from 0.66 to 0.72 (`WG_HUM_HI`), which adds forest and wetter river catchments.
  - Amphibians pay 1.1× water loss on saline tiles instead of 1.5× (`SALT_THIRST_AMPH`).
- **Bird niches:** `BIRD_REVIVE` went from 5 to 10, so `_migrations` refills a bird niche before it can die out between its 60-tick checks.
- **Salt basins:**
  - Candidates are taken driest first.
  - Each basin may turn at most 0.3% of the map into salt flat (`WG_SALT_BASIN`), and the total is capped at 0.8% (`WG_SALT_SHARE`).
  - A basin bigger than its share keeps its deep core as a terminal lake, and only its shallow rim becomes salt flat.
- **Gen 2 unchanged:** gen 2 output is still tile-identical to base on seeds 42, 7 and 123.
- **Variant test:** the second test run compared the fixes with the humidity ceiling at 0.66 and at 0.72. The 0.72 version gave more amphibians (mean of per-seed averages 154 against 103) and better timing, so it was kept.

## Biome area shares (Medium 320×210, %)

| Biome | 42 | 7 | 123 |
| --- | --- | --- | --- |
| Mangrove | 1.96 | 2.89 | 2.97 |
| Coral reef | 1.16 | 2.14 | 2.10 |
| Salt flat | 0.30 | 0.48 | 0.79 |
| Steppe | 3.70 | 5.61 | 3.32 |
| Cloud forest | 0.56 | 0.14 | 0.19 |
| Tundra bog | 0.03 | 0.42 | 0.26 |
| River | 2.12 | 2.65 | 2.75 |
| Lake | 5.74 | 2.85 | 2.31 |
| Pond | 0.66 | 0.77 | 0.77 |
| Wetland | 5.64 | 6.85 | 8.13 |
| Alpine | 4.27 | 7.21 | 5.60 |

- **Land share:** 0.61, 0.64 and 0.64 on seeds 42, 7 and 123.
- **Landmasses of at least 30 tiles:** 8, 2 and 4.
- **Old generator:** about 0.65 land share, a single landmass, and about 17% alpine.
- **Generation time:** about 1.0–1.2 s, against about 0.65 s for the old generator.

## Gates (final run; base and new run side by side; 3000 ticks, Medium, seeds 42 / 7 / 123)

| Gate | Base (ad45c35) | New |
| --- | --- | --- |
| ms/tick | 42.27 / 41.01 / 43.81 (mean 42.36) | 44.92 / 41.91 / 41.27 (mean 42.70, +0.8%) |
| Founder animal species | 34 / 34 / 34 | 34 / 34 / 34 |
| Classes alive at 3000 (fish/amph/rept/mamm/bird/invert) | 1621/241/723/1058/281/2328, 1127/582/464/1360/159/1910, 1473/246/836/944/125/3084 | 3275/338/547/1027/167/2659, 2297/141/660/1501/171/1275, 2702/72/1080/1467/168/1414 |
| Amphibian mean from tick 1000 | 124 / 329 / 154 | 296 / 115 / 50 (first run: 52 / 89 / 53) |
| Bird niches at 3000 (seed/insect/fisher/raptor/carrion) | 128/120/8/3/22, 17/102/12/6/22, 11/56/10/27/21 | 95/12/38/6/16, 55/37/10/24/45, 65/35/31/6/31 |
| Lowest niche count from tick 500 | 39/8/2/2/5, 5/5/4/3/5, 11/21/3/3/9 | 40/12/8/4/8, 9/22/2/4/6, 4/35/6/2/10 (none reach 0; first run had 0s on seed 42) |
| Animal species at 3000 | 33 / 31 / 36 | 39 / 35 / 36 |
| Save, load and step 500 (det.js, seed 42) | — | stats, full state (17.4 MB) and RNGs equal |
| Old save loads (base save at tick 300 loaded by new code) | — | world identical (gen 2), steps, re-saves, continuation equal |

The founder count comes from the species roster, not from the map, so it is 34 on both versions.

## Open issues

- **Amphibians on seeds 7 and 123:** amphibians are now above base on seed 42 but below it on seeds 7 and 123, most of all on 123 (mean 50 against 154, ending at 72). That is up from the first run (53), but not back to base.
- **Fewer trees on seeds 42 and 123:** tree slots are about half of base on seed 42 and two thirds on 123, because gen 3 has more open plains and steppe. Seed 7 has more trees than base.
- **Low niche floors:** the seed niche on seed 123 still dips to 4 and the raptor niche to 2, so the niches stay alive but some floors are low.
- **Render:** the render code was not changed beyond biome colours. The graphics agent's terrain shading may want to treat `isDelta` and `isSalt`.
