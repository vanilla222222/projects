# Audit: Part 3.1, palette, spawn and paint

Commits: `edbecaa` (plan), `946f7ad` (sim layer), `1e0e7f1` (palette UI), `4fce573` (polish).

## What shipped

- **Palette** (`index.html`, `css/style.css`, `js/main.js`):
  - opened with the sparkle button at the top right of the map or the `G` key
  - six tools: Spawn, Biome, Warmer, Colder, Wetter and Drier, plus a brush size slider (0–12) and an active-tool label in the header
  - `Esc` drops the tool, after the overlay and before the species detail. `Esc` in the search box also drops it.
  - a ring shows the brush footprint at the current zoom
  - with no tool active, pan, zoom, click to select and hover inspection are unchanged. Two-finger pinch cancels a stroke.
  - built only from theme tokens, so it follows light and dark mode
- **Spawn:**
  - a searchable list of living animal and plant species, sorted by population and refreshed every 2 s while open
  - a count slider (1–100). A click or a drag places that many, spread along the stroke.
  - animals clone the species mean with normal mutation and the class clamp. Plants fill empty slots of the right domain.
- **Paint:**
  - the biome brush lists every legend biome, which is `BIOME_LIST` minus CLIFF and FROZEN_DESERT (42 biomes, gen 4 included)
  - a land and water swap rebuilds depth, salinity, walkability, zones, soil terrain, weather evaporation and wetness, the water distance field, bug fit and plant caps, and kills animals that can no longer stand there
  - temperature and moisture brushes change values by ±0.05 per pass
  - drags flush every 120 ms, at most 64 points per action
- **Worker:**
  - a `god` message holds stepping like `save` and syncs or invalidates the WebGPU plant state
  - the next frame is a full snapshot that carries `worldVersion`, the world arrays and the formerly static plant water, depth and salinity
  - the client merges these, and `frame()` calls `renderer.refreshWorld()` when the version changes. This also works while the sim is paused.
- **Event log:**
  - each entry is a `god` event, such as "You spawned 10 Noctaceros", "You painted 303 tiles of Desert" or "You painted 37 tiles of Hills (5 animals lost)"
  - all flushes of one drag merge into a single line
  - a new "God" filter is added to the events tab
- **Saves:**
  - `GodTools` is in `classTable()`, and the edit list is stored in `header.god`
  - on decode, the edits are replayed on the regenerated world before the graph is restored
  - SAVE_VERSION is still 2

## Gates

Three batched runs were used. Results are from the scratchpad harness with 320×210 worlds.

| Gate | Result |
|---|---|
| World hashes, seeds 42/7/123 × gen 2/3/4, no tools | all 9 identical to base 30dd38b |
| State hash after 500 ticks, seeds 42/7/123, no tools | identical to base (`edb5330b…`, `6abecf24…`, `d4cef852…`), `eco.god` never created |
| ms/tick over 500 ticks, base → new (run in parallel pairs) | 42: 26.65 → 26.51 · 7: 24.72 → 25.50 · 123: 24.16 → 24.80, within noise |
| Same actions at same ticks, two runs (seeds 42, 7, 123) | state hashes equal |
| Save after edits, load, step 500 vs uninterrupted run (seeds 42, 7, 123) | state and world hashes equal at load and after 500 ticks |
| Array consistency after edits | `plants.water` matches `WATER_BIOME_SET`, and no land or water animal stands on a tile it can't use |
| Invalid actions (unknown species, CLIFF) | rejected with `{ok:false}`, nothing logged |
| Base save (gen 4, made by 30dd38b code) loads in new code | yes, and steps 300 more ticks |
| Browser smoke, worker and WebGPU mode on, port 8795 | palette opens with `G`; animal spawn 50 → 60; kelp spawn; Desert, Ocean (land → water confirmed on the client grid) and Grassland on water; warmer, colder, wetter and drier drags; Esc drops the tool and drag pans again; God filter shows 9 entries; worker save and load ok; **no console errors** |

The det test covers each actions batch:
- 4 spawns (a land animal, a water animal, a land plant and a water plant)
- one 37-tile stamp of every paintable biome, on alternating land and water
- a merged Desert stroke
- after 100 more ticks, the four climate brushes, a 137-tile ocean on land and grassland on water

`node --check` passes on all 24 js files. There is no `Math.random` in `js/sim`.

## Open issues

- **Land plant spawn can place nothing in a full canopy.** The seed 42 det test's top land plant found no empty slot of its height class within a radius 4 brush. The UI then says "No room for X there." Possible later options are a replace mode or a bigger search area.
- **Biome paint is not re-derived from climate.** It sets the biome and the matching altitude and water flags, but it does not touch temperature or moisture, so painted Desert in a cold, wet place keeps a cold, wet climate. This is intended for direct painting.
- **Save size.** The edit list adds very little, but worlds with many drags store each flush's points. At 64 points per action this is small compared with the grids.
- The hover tooltip still shows while a tool is active. It is useful for reading the tile, but at high zoom it can cover the ring.
