# Plan: Part 1, "Crowded ground" (soil, shared tiles, competition)

Source: [roadmap.md](../roadmap.md), Part 1.

The goal: each land tile holds up to two plants, a canopy and an understory. Plants compete for a finite soil nutrient store, pooled over the tile and its 8 neighbours. The same tile weighs most. Starved plants lose health and die, and dead plants return nutrients.

## Data layout: a plane per slot

All per-plant arrays in `PlantLayer` grow from `n` to `2n`:
- Slot index `p = slot*n + i`.
- `slot 0` is the canopy; `slot 1` is the understory.
- Indices `< n` keep their current meaning (the canopy plane), so tile-indexed reads still work for canopy plants.

The arrays affected are `species`, `biomass`, `cap`, `growth`, `floor`, `tox`, `disp` and `genome` (`2n*PG`). The per-tile arrays stay at `n`: `water`, `depth`, `habit` and `seasonAmp`.

**Slot rule:** `slotOf(genome, water)`. Land and water tiles both get two slots.
- On land, a plant whose `wood >= 0.3` goes in slot 0 (tree, conifer, palm, shrub, cactus).
- Otherwise it goes in slot 1 (grass, moss, reed).
- On water, a kelp-type genome goes in slot 0, as a tall forest. Plankton and algae go in slot 1.
  - The threshold is the same gene split that `plantCategory` uses to pick kelp. Record the exact rule in the audit.
- Seeds only land in the slot their own genome maps to.
- Water founders must seed both slots, and shade applies under kelp.

## New genes (PG 6 → 8)

| Gene | Name | Effect | Cost |
| --- | --- | --- | --- |
| g6 | shade tolerance | Understory growth under canopy = `light = 1 - shadeFrac*(1 - shade)` | `growth *= 1 - 0.3*shade` |
| g7 | root vigour | Weights the plant's share of pooled nutrients | `growth *= 1 - 0.2*root` |

- `PLANT_WEIGHTS` gets two entries, `0.7` and `0.7`.
- `PLANT_ARCHETYPES` founders get values:
  - moss: shade ≈ 0.8
  - reed: shade ≈ 0.3
  - grass: shade ≈ 0.15
  - trees and conifers: shade 0.3–0.5
  - root vigour: 0.35–0.65, varied by founder
- `plantTraitsFrom` returns `shade` and `root`.
- `main.js` `PLANT_TRAITS` gets the rows "Shade tolerance" and "Root vigour".

## New file: `js/sim/soil.js`, `SoilLayer`

- **Storage:** `nutrient` is a Float32Array of size n. It starts at `world.fertility`, clamped to `SOIL_MAX = 1.5`.
- **Refill:** `nutrient += (fertility - nutrient) * SOIL_REFILL` each tick. The rate is small, about 0.003.
- **`step(plants)`**, run each tick after the plant demand pass:
  1. Build `demand[i]`, the sum over both slots on tile i of `biomass * UPTAKE * (0.5 + root)`.
  2. For each plant `p` on tile `i`, compute its pressure:
     `ownDemand + SAME_TILE_W * otherSlotDemand + NEIGHBOUR_W * Σ demand[8 neighbours]`,
     with `SAME_TILE_W ≈ 1.3` and `NEIGHBOUR_W ≈ 0.35`.
  3. The plant's satisfaction is `sat[p] = min(1, nutrient[i] * SUPPLY / pressure)`.
  4. The tile's withdrawal is `Σ own demand * sat`, floored at 0.
- **`returnMatter(i, amount)`:** adds dead biomass times `RECYCLE` (≈ 0.15) to the tile, clamped to `SOIL_MAX`.
- Every tunable is a named top-level const.
- `PlantLayer` owns an instance at `plants.soil`. It is DOM-free, so it runs in `run.js`.

## `js/sim/plants.js` changes

- **Allocation:** allocate at `2n`. Add `health` (Float32, 2n, starts at 1) and `sat` (Float32, 2n).
- **Loops:** `step`, `_seed`, `_spread`, `_assign`, `_set`, `_clear`, `refreshSpeciesMeans`, `edible` and `graze` all loop or index over slot planes.
- **Light:** understory `K` and `r` are scaled each tick by `light` from the canopy on the same tile:
  - `shadeFrac = SHADE_MAX * min(1, canopyBiomass / 2.0)`, with `SHADE_MAX ≈ 0.8`.
  - Canopy plants have `light = 1`.
  - `cap` stays fixed at `_set`; the light scaling applies only inside `step`.
- **Health**, from `sat`:
  - If `sat >= SAT_OK` (≈ 0.75), `health += HEALTH_RECOVER`.
  - Otherwise, `health -= (SAT_OK - sat) * HEALTH_DECAY`.
  - Health is clamped to 0..1.
  - Growth rate is multiplied by `0.35 + 0.65*health`.
  - `_spread` is skipped when `health < 0.4`.
  - When `health <= 0` the plant dies: call `soil.returnMatter` with its biomass, then `_clear`, and count it in `plants.starved`.
- **Invasion:** in `_spread`, a weakened resident loses more easily. Its strength is multiplied by `(0.5 + 0.5*health)`.
- **Cycling:** every death (starved, low K, or replaced) returns biomass through `soil.returnMatter`.
- **`edible(i, reach)`:** sums both slots.
- **`graze(i, amount, reach)`:** takes from the understory first, then the canopy. It stores `this.grazeTox`, the tox of the eaten matter weighted by biomass.
- **New helpers:**
  - `topSpecies(i)` returns the canopy species if present, else the understory species.
  - `cover(i)` returns the combined floor.
- **Stats:**
  - `coverTiles` counts tiles with any plant.
  - `totalBiomass` sums both planes.
  - `refreshSpeciesMeans` also sets `sp.health` to the mean health.

## `js/sim/animals.js` (minimal)

- Grazing tox: `plants.tox[tile]` becomes `plants.grazeTox`, read after `graze`.
- Cover in `_attack`: `plants.floor[tile]` becomes `plants.cover(tile)`.
- No other changes.

## `js/sim/ecosystem.js`

- No tick-order change. `plants.step` calls `soil.step` internally.

## `js/render.js`

- **Vegetation texture:** colour comes from the canopy species if its biomass > 0.3, else the understory species.
  - Lerp toward brown `(150, 120, 50)` by `(1 - health) * 0.65`.
  - Alpha comes from the summed biomass.
- **Icons:** `_pushPlants` draws the canopy icon as it does now. If the understory is present:
  - draw it as a second, smaller icon (×0.6), offset toward the lower-left of the tile;
  - health-tint both by passing a tinted per-tile colour scratch to `_put`;
  - grow the instance buffer if its capacity assumes one plant per tile.
- **New `nutrients` view:**
  - add a `RAMPS.nutrients` ramp from barren grey-brown to rich dark green;
  - its field is `plants.soil.nutrient / SOIL_MAX`, written to a scratch Float32Array;
  - while the mode is `nutrients`, re-bake it about every 500 ms from `render()`, since `setMode` otherwise runs only on click.
- **Species id reads:** the `plants.species` reads at about lines 405 and 589 use slot-aware access.

## `js/main.js`, `index.html`

- **`index.html`:**
  - add `<button data-mode="nutrients">Nutrients</button>` to `#viewModes`;
  - add a `js/sim/soil.js` script tag before `plants.js`.
- **Tooltip (`updateTooltip`):** one row per occupied slot, showing icon, name, "canopy"/"understory", biomass and health %. It also adds a soil nutrient line to the tile meta.
- **Click selection (about line 555):** use `plants.topSpecies(t)`.
- **`renderDetail` for plant species:** add a "Health" cell from `sp.health`. The traits list now shows 8 genes.

## Docs

- **`CODE_REFERENCE.md`:**
  - **Plants:** the slot plane layout, `slotOf`, g6 and g7, light/shade, health, `grazeTox`, `topSpecies`, `cover` and `starved`.
  - **New "Soil" section:** `SoilLayer`, the constants and the pooled pressure formula.
  - **Animals:** grazing across slots, and cover.
  - **Renderer:** the Nutrients view, the second icon and the health tint.
  - **App/main:** the tooltip rows and the Health cell.
  - **World generation:** fertility now seeds the soil.
- **`complexities.md`:**
  - add `js/sim/soil.js` at about 4;
  - raise `js/sim/plants.js` to 7.5;
  - leave the others unless their expandability changes.
- **Audit:** `feature-research/ecosystem-expansion/part1/audit.md`, starting with the Files changed list.

## Tests

1. `node --check` on every changed or new JS file.
2. No new comments: `grep -nE '//|/\*'` on `soil.js`, `plants.js`, `animals.js`, `render.js` and `main.js`. Compare the counts to the pre-edit baseline, which should be zero for the files from the rework.
3. Headless sim:
   - Use a copy of the scratchpad `run.js` with `soil.js` added to its load list.
   - Also print: the share of land tiles with both slots, mean health, `plants.starved`, and mean and min soil nutrient.
   - Run seeds 42, 7 and 123 for 3000 ticks each.
   - **Pass:**
     - all 6 trophic groups are above 0 on every seed;
     - understory co-occupancy is above 10% of forested tiles;
     - `starved > 0`, and starvation isn't wiping out the plants: cover stays within ±25% of the pre-change baseline;
     - ms/tick is at most 1.25× the baseline measured before editing.
   - The implementer records the baseline numbers first, then tunes only the new constants to pass.
4. Headless render with no errors: dump-dom shows no error overlay.

## Screenshots (major change)

Saved to `feature-research/ecosystem-expansion/part1/screenshots/`:
- `nutrients.png`: the Nutrients view on seed 7 after a few hundred ticks.
- `understory.png`: a zoomed forest edge (zoom ≥ 9) showing canopy and understory icons, with some health tint.

How they're taken:
- Headless Chromium, the same command as the rework.
- A scratchpad probe page loads `index.html?play#7` in an iframe and sets the mode and camera through the page's globals.
- No app code is added just for screenshots.

## Out of scope

- Fruit, flowers, fungi, dead-matter layers, bugs and disease, which are Parts 2–4.
- Plant migrations.
- Refactors outside the listed touch points.
- Retuning existing animal constants, unless the balance gate fails. If it does, the implementer stops and reports rather than tuning animals.
- New code comments of any kind.
- git commits.
