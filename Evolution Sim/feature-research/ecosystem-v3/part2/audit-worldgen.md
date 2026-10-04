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

## Biome area shares (Medium 320×210, %)

| Biome | 42 | 7 | 123 |
| --- | --- | --- | --- |
| Mangrove | 1.74 | 2.46 | 2.57 |
| Coral reef | 1.23 | 2.20 | 2.14 |
| Salt flat | 3.66 | 0.87 | 1.07 |
| Steppe | 3.96 | 6.46 | 3.91 |
| Cloud forest | 0.43 | 0.07 | 0.12 |
| Tundra bog | 0.00 | 0.20 | 0.20 |
| River | 1.57 | 2.05 | 2.20 |
| Lake | 2.38 | 2.46 | 2.03 |
| Alpine | 4.28 | 7.25 | 5.63 |

- **Land share:** 0.64 on all three seeds.
- **Landmasses of at least 30 tiles:** 8 on seed 42 (three continents), 2 on seed 7 (one large continent) and 4 on seed 123.
- **Old generator:** about 0.65 land share, a single landmass, and about 17% alpine.
- **Generation time:** about 1.0 s, against about 0.65 s for the old generator.

## Gates (3000 ticks, Medium, seeds 42 / 7 / 123)

| Gate | Base (ad45c35) | New |
| --- | --- | --- |
| ms/tick | 40.96 / 40.79 / 42.85 (mean 41.53) | 43.85 / 41.99 / 41.71 (mean 42.52, +2.4%) |
| Founder animal species | 34 / 34 / 34 | 34 / 34 / 34 |
| Classes alive at 3000 (fish, amph, rept, mamm, bird, invert) | all; amph 241 / 582 / 246 | all; amph 20 / 109 / 101 |
| Bird niches at 3000 (seed, insect, fisher, raptor, carrion) | 128/120/8/3/22, 17/102/12/6/22, 11/56/10/27/21 | 22/21/7/20/20, 63/24/30/20/25, 15/35/1/9/28 |
| Lowest niche count from tick 500 | ≥ 2 | 0 for the seed and raptor niches on seed 42 at some point (both recovered by 3000); fisher fell to 1 on seed 123 |
| Animal species at 3000 | 33 / 31 / 36 | 37 / 34 / 35 |
| Save, load and step 500 (det.js, seed 42) | — | stats, full state and RNGs equal |
| Old save loads (base save at tick 300 loaded by new code) | — | world identical (gen 2), steps, re-saves, continuation equal |

The founder count comes from the species roster, not from the map, so it is 34 on both versions.

## Open issues

- **Amphibians:** amphibians are fewer, most of all on seed 42 (mean 52 against 124 on base). The likely causes are fewer ponds and wetland edges near continents and the saline thirst penalty.
- **Bird niches:** bird niches swing more. On seed 42 the seed and raptor niches touched 0 before migration brought them back, and on seed 123 the fisher niche ended at 1.
- **Large salt basins on seed 42:** seed 42 has a 3.7% salt flat share at Medium, in big basins enclosed by mountains. Lowering `WG_SALT_HUM` or capping the basin size would shrink them.
- **Rare biomes:** tundra bog is absent on seed 42, and cloud forest is rare on seeds 7 and 123.
- **Rivers:** rivers cover a little less of the map than on the old generator (1.6–2.2% against about 2.5–3%).
- **Render:** the render code was not changed beyond biome colours. The graphics agent's terrain shading may want to treat `isDelta` and `isSalt`.
