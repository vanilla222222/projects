# Part 4 plan: new UIs

Source: roadmap Part 4, plus the Part 3b leftovers (stage and egg stats, and juvenile energy in the tooltip).
- No code comments anywhere.
- Polish the current look rather than redesign it (Decision 2).
- Sim balance is not touched. The only sim edits are new log events and new history keys.

Slice order: **1 ∥ 2**, then **3**.
- Slice 1 only touches `render.js`, `weather.js` and `ecosystem.js`.
- Slice 2 owns `main.js`, `index.html`, `css/style.css` and the new `js/tree.js`.
- Slice 3 (save and load) adds `js/save.js` and small hooks in `main.js` and `index.html`, after slice 2 lands.

## Slice 1: map-side weather and views (`render.js`, `weather.js`, `ecosystem.js`)

1. **Live weather overlay.** Storms are drawn over the map, and a renderer flag `showWeather` (default on) switches the overlay on and off.
   - **Clouds:** each active storm in `eco.weather.storms` (`on,x,y,r,rain`) is drawn as a soft, semi-transparent cloud disc. The discs are noise-edged and drift with the storm.
   - **Precipitation:** animated streaks inside the disc. They are rain when `effTemp` at the storm centre is at or above `SNOW_T`, and flakes when below.
   - **Fading:** the density scales with `rain` and zoom. Clouds fade at high zoom so animals stay readable.
   - **Implementation:** a new `_pushWeather` pass using the existing instanced sprites, or a small dedicated quad pass. The implementer picks whichever is cheaper, and it stays in `render.js`.
2. **New map views:**
   - **`rain` (Rainfall):** live. The field is `wet` plus the storm discs' rain intensity, on a dry-tan → blue ramp. Snow is tinted white, as in Moisture.
   - **`water` (Water/Thirst):** live.
     - Drinkable tiles (`fresh`) are bright blue, and non-fresh water is dim.
     - Land is shaded by `waterDist` on a ramp from near (teal) to far (sand/red).
     - Animals with `water < THIRSTY` get a red marker, and `water <= 0` a stronger one. This reuses the disease-view marker path.
   - Both views are added to `RAMPS` and `LIVE_MODES`, and each gets a branch in `setMode`.
3. **Storm events** in `weather.js` `_spawnStorm`:
   - Log `'weather'` events such as "Storm over <region>" or "Blizzard" (snow) for storms with `r >= 12`.
   - Rate-limit to one storm event per 240 ticks.
   - Keep the existing drought start and end events.
4. **History keys** in `ecosystem.js`: push `thirstDeaths`, `herds`, `territories` and `eggs` (the current egg count) with the existing history samples, so the new stat cards get sparklines.
   - `stats.stages` and `stats.eggs` are unchanged.
   - Nothing else changes in the sim.

## Slice 2: panels, topbar, tree and help (`main.js`, `index.html`, `css/style.css`, new `js/tree.js`)

1. **View buttons and switches:**
   - Add `Rainfall` and `Water` buttons in `#viewModes`.
   - Add a `Weather` switch next to Seasons (`optWeather`). It is passed into the `Ecosystem` options, and a live change sets `eco.options.weather`.
   - Add a "Weather overlay" layer toggle next to the Plants, Animals and Swarms toggles. It sets `renderer.showWeather`.
2. **Topbar weather widget** next to `#seasonBadge`:
   - An icon plus a short label: Clear, Rain, Snow, Storms ×N or Drought.
   - The tooltip gives the mean wetness %, rain and snow tile counts, and the droughts so far.
   - It is read from `stats.weather` and `meanWet`, and shows "Off" when weather is off.
3. **Stat cards** (built in `buildStatCards` and `updateStats`):
   - Thirst deaths, with the sub-line "x% of land deaths" from `thirstShare`.
   - Herds.
   - Territories.
   - Eggs, with the sub-line "laid / hatched / eaten / failed".
   - A wide Life-stages card with the sub-line "juveniles · adults · elders" and elder %.
   - Sparklines come from the slice 1 history keys and fall back to `[]`.
4. **Species detail (animals):**
   - New `ANIMAL_TRAITS` rows: Territorial (gene 11), Herding (12), Cold-blooded (13, formatted Cold-/Warm-blooded) and Drought tolerance (14).
   - A **Habitat** line in the grid: Land, Water or Amphibious from the domain, plus "· dry-adapted" when gene 14 > 0.6.
   - A **Stages** line for the species' juveniles, adults and elders, plus eggs. These are counted on demand when the detail renders, by looping the pool.
5. **Tooltip:**
   - Show the stage (juvenile, adult or elder).
   - Energy is shown against `emax*gf`, clamped to 100%.
   - Add water % for land and amphibious animals.
6. **Family trees** (new `js/tree.js`, and a `<script>` tag after `charts.js`):
   - **Trigger:** a "Family tree" button in the species detail panel, and the key `T`. Both open a dismissible full-map overlay. It is the first modal-style component: an `inset:0` layer, `hidden`, and Esc or ✕ closes it.
   - **Species mode:** the selected species' ancestors, via `parentId`, up to its founder, and all its descendants via `children`.
   - **Kingdom mode:** a tab that shows every species of the selected group. Merged species are hidden.
   - **Layout:**
     - x is time, with a year axis. Each node is a bar from `createdTick` to `extinctTick` (or now), coloured by the species colour.
     - Rows are stacked in a tidy tree order, with a child's row next to its parent, and connectors from the parent bar at the child's birth tick.
     - Extinct species are greyed out, and the current selection is highlighted.
   - **Rendering:** a Canvas 2D, for speed with thousands of strains. Wheel zooms about the cursor, drag pans, and a hover label shows the name, years and peak population.
   - **Click:** clicking a node calls `selectSpecies(id)` and re-centres the tree on it.
   - The tree works for plant, animal, bug and pathogen groups.
7. **Weather filter:** add `<button data-f="weather">Weather</button>` to the event filters, and check that an `.ev-weather` style exists.
8. **Help overlay:**
   - Opened by a `?` button in the topbar, or the `?` or `H` key.
   - It reuses the tree's overlay shell and lists every map view (one line each), the controls, the switches and the keyboard shortcuts.
   - Esc closes it.
9. **Keyboard additions:**
   - `T` opens the tree.
   - `?` and `H` open help.
   - `W` toggles the weather overlay.
   - Esc closes any overlay first, then the detail panel.

## Slice 3: save and load (`js/save.js`, with small hooks in `main.js` and `index.html`)

- **UI:**
  - **Save** and **Load** buttons next to the seed and size controls.
  - Save downloads `evosim-<seed>-y<year>.evo`.
  - Load uses a hidden file input.
- **Format:**
  - A gzip (`CompressionStream`) of a small binary container: a JSON header followed by the raw typed-array buffers.
  - The header holds the version, seed, w, h, the map options, `tick`, the app options and camera, and the JSON state.
  - Typed arrays are stored as `{$ta: type, off, len}` references into the buffer section. Maps and Sets are tagged.
- **Generic serializer:**
  - It walks the own properties of `eco`, `registry`, `plants`, `soil`, `animals`, `eggs`, `bugs`, `weather`, `disease` and `log`.
  - Shared objects (world, layers, registry, log, rngs) become `{$ref: name}`.
  - `Species` `children` and `recentlyExtinct` become id lists.
  - Animal and egg pools save only the first `count` rows, and the capacity is restored from that count.
  - Each class has a skip list for rebuildable scratch data: the spatial grid, `waterDist`, the BFS scratch, `_fruitK`/`_bloomK`, the egg `head`, the palette fields, and the soil and bug scratch arrays.
- **Load:**
  1. Regenerate the `WorldMap` from seed, w and h, and build an `Ecosystem` with the saved options.
  2. Overwrite every saved field in place.
  3. Re-link the aliases (`plants.moistMul` and `plants.snow` to the weather arrays, `animals.setWeather`).
  4. Rebuild `waterDist`, the egg heads, the species palettes, the `children` references and the grid.
  5. Call `renderer.setWorld`, `updateUi(true)` and `app.lastLogVersion = -1`.
  6. On a version mismatch or a corrupt file, show an error line and keep the current world.
- **Determinism gate:** a headless Node test, on seed 42, compares an uninterrupted run with a save-and-load run.
  - The uninterrupted run is 1500 ticks → save → another 500 ticks.
  - The second run loads that save and runs 500 ticks.
  - The two must produce identical `stats` (all group counts, plant biomass, eggs, stages), with the RNG states equal.
  - A size report for Medium goes in the audit. The target is ≤ 10 MB compressed at year 5.

## Tests and gates

- **Sim:** ms/tick on seeds 42 and 7 at 3000 ticks is unchanged (±5%) from Part 3b.
- **Browser:** a headless browser run on seed 42 (the existing `cdp_shot.py` flow) must show no console errors. It needs to:
  - cycle every view;
  - open the tree in both modes and click a node;
  - open help;
  - toggle Weather;
  - save and then load.
- **Render cost:** frame time with the weather overlay on at default zoom stays within +15% of off.
- **No new code comments:** check with a grep of the diff.

## Screenshots (`feature-research/ecosystem-v2/part4/screenshots/`)

1. **`weather.png`:** the map with storm clouds and rain or snow, the topbar widget and the new stat cards. Slices 1 and 2.
2. **`views.png`:** the Water/Thirst and Rainfall views side by side, as two crops.
3. **`tree.png`:** the family-tree overlay in species mode on an animal lineage, with extinct branches greyed out.
4. **`help-detail.png`:** the help overlay, or the species detail with the new trait rows, Habitat and Stages. The implementer picks one.

## Docs

- **`CODE_REFERENCE.md`:** update the Renderer (weather pass, `rain` and `water` views), Weather (storm events), Ecosystem (history keys) and main.js UI sections (stat cards, detail rows, widget, overlays and keys), and add new **Tree** and **Save** sections.
- **`complexities.md`:**
  - `js/tree.js`: about 5.5, new.
  - `js/save.js`: about 6.5, new. Every new persistent field in any layer must be checked against the skip lists.
  - `main.js`: 6 → 6.5.
  - `render.js`: the note is updated.

## Out of scope

- Sim balance changes, including the Part 3b misses.
- Autosave and cloud storage.
- Redesigning the existing panels.
- New code comments.
