# Part 3b slice 3 audit: drawing

## Files changed

- `js/render.js`:
  - New constants: `TERR_MIX`, `TERR_SAT`, `TERR_FADE`, `TERR_EDGE_MIX`, `TERR_EDGE_DARK`, `ELDER_ALPHA`, `EGG_ZOOM`, `EGG_PX`, `EGG_BASE`, `EGG_SIZE_K`, `EGG_WATER_ALPHA` and `EGG_PALE`.
  - `setMode`: a new Territory tint with a `terrOwner` closure, saturation boost, dark outlines and a fade.
  - `_refreshSpeciesLookup`: the color writes moved into a new `_writeCol(id, sp)`.
  - `draw`: a `flat` flag drives `u_overlay`, `u_warp` and `u_cloud`.
  - `_pushAnimals`: sizes scaled by `gf`, elder alpha, and the egg pass call.
  - New `_eggTint` and `_pushEggs`.
- `js/icons.js`: a new `egg` icon, appended last (index 144, 145 icons, 13 atlas rows).
- `CODE_REFERENCE.md`, Icons and Renderer sections only:
  - the egg icon;
  - the `u_overlay`, `u_warp` and `u_cloud` rows;
  - the Territory view;
  - `_eggTint` and `_writeCol`;
  - the life-stage sizing and elder alpha;
  - the egg pass, the capacity note and the globals list.
- `complexities.md`: the `js/icons.js` and `js/render.js` rows.
- `feature-research/ecosystem-v2/part3b/screenshots/territory.png`, `lifestages.png` and `designs.png`.
- Not touched: `js/main.js` (no tooltip glue was needed) and `js/sim/*`.

## Decisions

- **Territory owner:** the owner is the individual animal (`terrUid`), not the species. Adjacent territories of one species therefore also get outlines. The outline color is the species `rgbDark` × 0.7 at full mix, because at 0.8 mix the outline barely showed through the linear texture filter.
- **Territory fade:** the fade factor is `min(1, (terrUntil - tick)/10)`. It applies to both the fill and the outline.
- **Territory layers:** in Territory mode, `u_overlay = 1`, so snow, shore, depth shading and shimmer are off. The domain warp and bug clouds are also off. Plant cover was already off (`vegOn`).
- **Juvenile sizing:** `gf` multiplies the size after the `12/zoom` pixel floor, so juveniles stay smaller at every zoom. Dots, shadows and highlight rings use the same factor.
- **Elders:** an elder is an animal with `ef < 1`, drawn at alpha × 0.8.
- **Egg pass:** eggs draw between the shadows and the animal bodies, only at `zoom >= 3`. There are no dots below that zoom.
- **Egg size:** `max(4px, 0.34 + 0.24*sizeGene)` tiles.
- **Egg colors:** body is the species light color mixed 15% toward white, dark is the species body color, and light is white. With plain species colors, blue fish eggs vanished on blue water (first attempt).
- **Egg-only species:** these are daughter species with population 0, so they are not in `registry.living`. `_pushEggs` writes their colors on demand through `_writeCol`.

## Deviations

- **Clutch jitter:** there is no renderer-side jitter. `animals._reproduce` already places each egg at a random point in 0.15–0.85 of the tile, so clutches are already spread. Extra jitter would only move eggs off their true positions.
- **Territory screenshot:** it is at zoom 6 on the densest territory area, year 10 (tick 4320), rather than the whole-map view. At full-map scale, the 1-tile outlines are sub-pixel.
- **Parallel sim edits:** the sim was being edited in parallel. One early probe run hit a transient `HERB_RESCUE is not defined` from the other implementer's in-progress `ecosystem.js`. The re-run was clean. Group counts in the screenshots reflect that in-progress sim; for example, seed 42 shows few omnivores.

## Checklist

- [x] Territory: 80% fill, 1.4× saturation, `rgbDark` outlines on owner changes, a 10-tick fade, and veg and overlay layers off.
- [x] Juveniles drawn at `gf` × size for sprites, dots, shadows and rings.
- [x] Elders drawn at alpha 0.8.
- [x] `egg` icon added (145 icons). Eggs are drawn at zoom ≥ 3, tinted by species, with no dots when zoomed out.
- [x] Headless Chromium, seed 42:
  - no console errors or exceptions at ticks 1200, 2400, 3600 and 4320;
  - checked in both the Territory and the zoomed life views;
  - the probe hooks `window.error` and `console.error`, and CDP exception events are logged.
- [x] Screenshots viewed:
  - `territory.png`: yellow and cyan territories with dark outlines, including the internal borders between overlapping claims.
  - `lifestages.png`: tick 3600 at a shore. It shows pink seahorse egg clutches, small juvenile seahorses beside adults, and horses on land.
  - `designs.png`: the egg in raw roles and in the in-game tint for five species palettes, at 96, 32, 16 and 12 px, on dark and light backgrounds.
- [x] The comment grep `git diff -U0 -- js/render.js js/icons.js | grep '^+' | grep -E '//|/\*'` is empty.
- [x] `CODE_REFERENCE.md` (Icons and Renderer) and `complexities.md` (render.js and icons.js rows) updated.
- [x] No git state changes.
- [ ] Elder fading is subtle at 0.8 alpha, as the plan specifies. It is hard to pick out in `lifestages.png`.
