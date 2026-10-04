# Part 2 item 2: graphics pass audit

This pass changed rendering and UI only. Sim logic, world generation and the biome classification and colour tables were not touched. The base is commit ad45c35.

All testing used headless Chromium with the SwiftShader software GL, at a 1400×900 viewport, on seed 4242 after 400 ticks, in the default worker mode. There were two screenshot sessions, one before and one after the changes.

## Changes

### Terrain (js/render.js, `TERRAIN_FS`)

| Change | What it does | Visible from |
|---|---|---|
| GPU hillshade | The normal comes from four filtered taps of a new `R16F` altitude texture (`altTex`, clamped to sea level) and is lit from the NW. It replaces the per-tile baked shade in the normal views. Slopes are smooth inside tiles and no longer step at tile edges. | all zooms |
| Depth tint | Deep water shifts toward a cooler blue, on top of the existing darkening. | all zooms |
| Soft shore | A thin foam line where the filtered water channel crosses 0.5, plus a darker wet-sand band on the land side. | about 2.5–7 device px per tile |
| Land grain | Two octaves of value noise vary brightness by ±7% on dry land. | about 5–14 device px per tile |

The data views (`u_overlay = 1`) still use the baked CPU shade and skip all of the new effects, so their colours are the same as before.

### Sprites (js/render.js, js/icons.js)

- The atlas cell is now 128 px (it was 64), and the sprite shader samples with an LOD bias of -0.6. Zoomed-in sprites are sharp and zoomed-out ones are less blurry.
- The outline stroke is now the stroke width plus 2.2 (it was plus 1.8), in a slightly darker ink, `rgba(8,11,10,0.92)`, for contrast on any terrain.
- Juveniles are paler (`JUV_PALE` went from 0.3 to 0.42) and up to 14% wider (`JUV_ROUND`), so they read as round young. Larvae are unchanged.
- Elders are now greyed through `_elderTint`: the colours are desaturated toward a warm grey, more strongly as `ef` falls to 0.6. Alpha went from 0.8 to 0.92, so elders stay visible but look old instead of just faint.

### Rainfall view

- Storms in the Rainfall view draw as storm cells (`u_cell`): a dashed, slowly rotating ring with dark and light lines, dense rain streaks or snow flakes inside, and a faint fill. The cell stands out from the wet-ground ramp under it. It draws whether or not the Weather overlay switch is on.
- A new `#rainLegend` card (top left of the map, shown only in Rainfall) has the dry-to-soaked ramp plus swatches for a rain cell and a snow cell.

### Render loop waste

- `getBoundingClientRect` used to force a layout read every frame. A `ResizeObserver` now sets `_sizeDirty`, and `draw` resizes only when that flag is set.
- The live data views used to rebuild their 256-entry ramp lookup table every 500 ms. These tables are now cached (`rampFor` / `RAMP_LUTS`).
- `draw` used to build a smoothstep closure every frame. It now uses the module-level `smooth01`.

## Screenshots

All screenshots are in `/tmp/claude-0/-home-user-projects/a6d12805-aecf-5923-b265-93c142f30be4/scratchpad/p2g/` and are not committed:

- `before-*.png`: biome-fit, biome-z6, biome-z18, biome-z40, rain-fit, rain-storm-z10, biome-storm-z8.
- `after-*.png`: the same set, plus biome-juv-z30, which shows pale round young and greyed elders.

## Frame time

These timings are `draw` plus `gl.finish()` in ms, on SwiftShader, with few samples, so they are noisy.

| View | Before (median / p90) | After (median / p90) |
|---|---|---|
| biome fit | 6.2 / 11.9 | 6.7 / 11.2 |
| biome z6 | 5.9 / 13.4 | 6.8 / 17.1 |
| biome z18 | 5.9 / 7.2 | 5.9 / 14.2 |
| biome z40 | 0.8 / 6.9 | 4.2 / 8.7 |
| rain fit | 1.7 / 10.1 | 0.7 / 6.1 |
| rain storm z10 | 1.6 / 2.9 | 2.7 / 5.6 |

Overall the two runs are about equal within the noise. The four extra terrain texture taps and the noise cost something on a CPU rasterizer, but should be negligible on a real GPU. The removed layout read and table rebuilds save main-thread CPU in every mode. A real-GPU check would be worthwhile.

## Open issues

- The 128 px atlas is 1536×1792 for each of the two atlases, plus mips, so it uses about four times the GPU memory of the 64 px atlas. Building it at startup also takes longer. If memory matters on low-end devices, 96 px would be a middle ground.
- The storm moves between being located and being photographed, so in `after-rain-storm-z10` the cell sits toward the top right of the frame.
- In the Rainfall view, storm cells ignore the Weather overlay switch. This is deliberate, because the cells are the main point of that view.
- The foam line follows the filtered water channel, so its shape is only as smooth as the domain warp. At very high zoom it can show slight tile-scale kinks.
- The biome colour overrides in `setMode` were left untouched while worldgen work is in progress.
