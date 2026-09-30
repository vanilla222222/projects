# Part 1 UI slice: audit

## Files changed

- `js/render.js`: added the `nutrients` ramp, `SICK_RGB`/`SICK_MIX`, the `soilField` scratch, the 500 ms nutrients re-bake in `draw`, the slot-aware `_updateVegetation` (colour from the canopy if its biomass is above 0.3, else the understory; alpha from summed biomass; health tint), `_tinted` plus the `_tint` scratch, and a two-icon `_pushPlants` with capacity for 2 instances per tile.
- `js/main.js`: `PLANT_TRAITS` gained Shade tolerance (g6) and Root vigour (g7), `renderDetail` gained a plant Health cell, `updateTooltip` gained a nutrient meta line and one row per occupied slot, and click selection now uses `plants.topSpecies(t)`.
- `index.html`: added the Nutrients button to `#viewModes`. The `soil.js` script tag was already present and was not duplicated.
- `CODE_REFERENCE.md`: updated only the Renderer and App/main sections.
- `feature-research/ecosystem-expansion/part1/screenshots/nutrients.png` and `understory.png` (new).

## Tests run

| Test | Result |
| --- | --- |
| `node --check js/render.js`, `node --check js/main.js` | OK |
| `grep -nE '//\|/\*' js/render.js js/main.js` | No matches (exit 1). The HEAD baseline is 0 for both files. |
| Headless `--dump-dom "index.html?play#7"` (swiftshader, 20 s virtual) | Exit 0. `#mapError` is `hidden`. The only console output is `"World 320×210 ready in 1173 ms"`, with no errors or uncaught exceptions. |
| Screenshot probe over CDP (`scratchpad/probe-ui.html` + `cdp_shot.py`) | No `Runtime.exceptionThrown`. The only console log is the world-ready line. |
| Isolated renderer probe (seed 7, 400 ticks) | Zoom-20 draw takes about 1 ms on the CPU with 1737 sprites, and capacity stays at 8192. Land tiles with both slots: 41539 of 45278. Mean health 0.992. |

## Checklist

- **No new comments:** `grep -cE '//|/\*'` gives `js/main.js:0` and `js/render.js:0`.
- **CODE_REFERENCE entries present** (grep):
  - L661–662: the `nutrients` mode and `soilField` re-bake.
  - L673, L678: the vegTex slot choice and health tint.
  - L701: `_tinted`.
  - L724–726: the understory icon at 0.6×, health-tinted, with capacity for 2 per tile.
  - L827, L829: the Health cell, Shade tolerance and Root vigour.
  - L834–838: `topSpecies` click, the nutrient meta line and slot rows.
- **Screenshots exist:** `nutrients.png` (774 KB, seed 7, tick 400, Nutrients button active) and `understory.png` (1.07 MB, seed 7, tick 504, zoom 30; shrub canopy icons with smaller understory icons at the lower-left, and several olive/brown health-tinted canopies).

## Deviations

- The screenshots were taken over CDP (a Python `websockets` driver in the scratchpad) instead of Chrome's `--screenshot` flag. `--screenshot`/`--dump-dom` with a probe page never finished under `--virtual-time-budget` or `--timeout`: the page JS completed, but Chrome never finished. The app itself still passed the plain `--dump-dom` check. No app code was added for this.
- `understory.png` is taken at tick 504 (spring, year 2), not at the tick-400 winter. At tick 400 the chosen area was mostly under snow, which hid the icons.
- The spot was picked automatically as a warm tile area with the most mixed canopy/bare/both-slot tiles and the lowest health. It reads as a shrubland patch with gaps rather than a sharp forest edge.

## Open risks

- **Winter snow in the Nutrients view:** the terrain shader applies winter snow in every mode, so in winter the Nutrients view is partly whitened (visible at the top of `nutrients.png`). The other ramp views already behave this way.
- **Water in the Nutrients view:** water tiles are coloured by their soil value like land. They are not masked, the same as the existing Soil (fertility) view.
- **Re-bake cost:** re-baking every 500 ms in Nutrients mode re-runs the full `setMode` loop (about 67k tiles) and a texture upload. That is cheap now, but it scales with map size.
- **Faint health tint:** mean plant health was about 0.99 at tick 400, so the tint is subtle in most places until soil depletion bites. It depends on the concurrent sim tuning.
