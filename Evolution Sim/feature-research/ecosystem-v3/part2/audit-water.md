# Audit: Bodies of water (roadmap item 11)

Base commit b46c84a. Commits: 2baeba9, 7ad2928, 41e703a, d587f5e.

## What was built

### Depth

Depth is stored in the plant layer as a derived grid (`plants.depth`), not on the world. World hashes and gen 2/3 worlds are therefore unaffected. It is rebuilt in `_prepareWater()` from a breadth-first distance-to-land field, capped at 16.

| Water type | Depth |
|---|---|
| Rivers | 0.05 to 0.15. Wider rivers (higher flow) are deeper. |
| Deltas | 0.05 |
| Ponds | 0.1 |
| Lakes | 0.12 + 0.04 per tile from the shore, capped at 0.45 |
| Ocean | Shelf of 0.08 + 0.05 per tile from land, never deeper than the old altitude-based depth, minimum 0.04 |
| Coral reef | Capped at 0.15 |

The renderer shades water in three bands: shallow below 0.18, shelf/moderate below 0.4, and deep. The biome legend gains four water swatches: shallow, moderate, deep and brackish.

### Salinity

`plants.sal` is also a derived grid, with three values: 0 fresh, 1 brackish, 2 salt.
- Ocean, reef and salt lakes are salt.
- A second breadth-first pass starts from deltas and from fresh water that touches the sea. Everything it reaches is brackish, up to 3 tiles into the sea and 2 tiles upstream.
- Brackish water shallower than 0.2 gets a ×1.3 fertility bonus. This is the delta.

### Plants

Plant gene 25 is now "fresh affinity" for water plants. A value of 0 means marine, so plants in old saves keep their fit.
- Carrying capacity on water tiles is scaled by `1 - 0.55·|fresh affinity - salinity match|`.
- Four new founder archetypes: water lily, marsh reed, mangrove and pondweed.
- New categories split out of the existing ones: Mangrove (woody brackish), Pondweed (tall fresh), Water lily (flowering fresh).
- New icons: waterlily, lotus, mangrove and pondweed. Each has its own hue.

The GPU path reads capacity and habitat from the CPU, so `js/gpu` needed no kernel change.

### Animals

The animal genome grows from 30 to 32 genes:
- `G_DEPTH`: preferred depth.
- `G_SALT`: preferred salinity, where 0 is fresh and 1 is marine.

How the genes work:
- Water animals pay `m^0.75 · 0.25 · misfit` in extra metabolism. Misfit is `min(1, 1.6·|depth - pref| + 0.9·|sal/2 - pref|)`.
- Founder placement rejects tiles where misfit is above 0.55.
- Land, amphibious and air animals copy these genes unchanged from parent to child, so they never drift.
- Speciation distance weights each of the two genes at 0.6.

Two new omnivore fish founders (diet about 0.5, category "Omnivorous fish"): a freshwater shallow-water species and a marine reef species.

### Saves

- `SAVE_VERSION` is still 2.
- When an old save is loaded, `save.upgrade` pads the 30-gene animal, child-genome, egg and species-mean arrays out to 32 genes, using the defaults depth 0.3 and salinity 0.75.
- `sal` is listed as derived for PlantLayer, so it is rebuilt when missing.
- `SNAP_STATIC` sends `water`, `depth` and `sal` to the main thread.

### Inspector

- The tile tooltip shows the depth band and percentage, plus fresh, brackish or salt water.
- Water animals show "Preferred depth" and "Salinity" traits. Water plants show "Salinity".

## Performance

Headless benchmark, Medium 320x210, 3000 ticks, gen 4. Values are ms/tick averaged after tick 300. Base and run 1 ran in parallel on 4 cores; run 2 had 4 processes in parallel.

| Seed | Base b46c84a | Run 1 (AQ_K 0.35) | Final d587f5e |
|---|---|---|---|
| 42 | 28.48 | 28.28 | 29.55 |
| 7 | 23.87 | 25.05 | 24.21 |
| 123 | 29.17 | 25.65 | 26.36 |
| Mean | 27.17 | 26.33 (-3.1%) | 26.71 (-1.7%) |

The change is within noise. Per-tick cost is one extra multiply-add per water animal. The depth and salinity passes only run when the climate is prepared.

## Gates (final code)

| Gate | Result |
|---|---|
| All 6 classes alive from tick 500 to 3000 (seeds 42, 7, 123) | Pass. Minimum fish population: 158, 336 and 374. |
| All 5 bird niches alive | Pass. Lowest niche minimum is 3 (fisher on seed 42, raptor on seed 42). |
| Save at tick 1500, load, step 500 matches an uninterrupted run (seed 42) | Pass, equal = true |
| Gen 2/3 world hashes match base | Pass. All six hashes are identical. |
| Saves from older code still load | Pass. Base gen 4 save (600 ticks), gen 2 seed 42 save and gen 3 seed 7 save. Gen 4 was checked on both runs; gen 2 and 3 on run 1. |
| SAVE_VERSION | Still 2 |
| `node --check` over all files | 23 files, 0 failures |

Browser smoke test (Chromium with SwiftShader, worker mode, seed 42):
- No page errors.
- The legend contains the brackish entry.
- The depth grid ranges up to 0.88.
- The panels for a water animal and a water plant show the new traits.
- Screenshots show the shelf, deep water and brackish deltas shaded distinctly.

## Ecology observations

Seed 42 water tiles: 4618 fresh, 692 brackish, 22327 salt. By depth: 13155 shallow, 7156 moderate, 7326 deep.

Water plant categories at tick 3000, all present:
- Kelp
- Marsh reed
- Mangrove
- Pondweed
- Seagrass
- Phytoplankton
- Algae
- Water lily

Lily is scarce on seed 123, with 12 tiles.

Omnivore fish at tick 3000: one species per seed, with populations of 122, 24 and 31.

Run 1 used a misfit cost of 0.35 and smaller founder groups. It left omnivore fish at 22, 1 and 1, and the final fish count on seed 42 fell from 3007 (base) to 481. The final tuning lowered the cost to 0.25 and enlarged the founders (50 and 44).

## Open issues

- No surviving water species has a salinity preference below 0.3, on any seed at tick 3000. The freshwater omnivore founder either dies out or drifts towards brackish. Lakes and rivers are small, and most water animals spawn in the sea. Fresh water may need its own founder density or a smaller salinity weight.
- Final fish totals vary widely. On seed 42 they stay below base (494 vs 3007), while invertebrates rise. This needs a longer multi-seed balance pass.
- Lakes deeper than 0.35 lose the amphibian walk bit (`AMPH_DEPTH`). The lake profile was capped at 0.45 to limit this, but large lakes still have amphibian-free centres.
- The ocean shelf uses `min(old depth, shelf profile)`, so very steep coasts can reach deep water within a few tiles. This is intended, but it makes deep-water fish placement sensitive to coastline shape.
