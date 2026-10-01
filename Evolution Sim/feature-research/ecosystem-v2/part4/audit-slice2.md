# Part 4 · Slice 2 audit (UI: views, weather widget, cards, detail, tooltip, family tree, help, keys)

## Files changed

| File | Change |
| --- | --- |
| `js/tree.js` (new) | `FamilyTree`: species-lineage and kingdom timelines on a canvas, with a year grid, connectors, extinct styling, label fallbacks (right, left, then an inside pill), a hover tooltip, drag-pan with click-to-select, and wheel zoom on both axes. |
| `js/main.js` | Weather badge (`updateWeatherBadge`, `WEATHER_LOOK`); five extra stat cards (`STAT_EXTRA`, `updateExtraStat`); the `optWeather` and `showWeather` switches; detail Habitat and Stages cells (`stageCounts`, `animalStage`, a `wide` cell flag); four new `ANIMAL_TRAITS`; a tooltip stage and water line; overlay control (`showOverlay`, `openTree`, `openHelp`, `closeOverlay`, `app.tree`, `app.overlay`); keys T, ?/H and W, with Esc closing the overlay first; the tree is redrawn on UI refresh, resize and selection. |
| `index.html` | Weather badge and `?` help button in the topbar; Rainfall and Water view buttons; Weather and Weather overlay switches; a Weather event filter; a Family tree button in the Lineage heading; the overlay shell (tree body and help body); a `js/tree.js` script tag after `charts.js`. |
| `css/style.css` | A `--scrim` token in all three token sets; weather badge, help button, small button, `.stat-value small`, `.detail-grid div.wide`, overlay, tree and help styles; the trait grid's last column widened to `minmax(58px, auto)`; `.clock` gap 14 → 10 px. |
| `js/icons.js` | Five icons appended: `cloud`, `rain`, `snow`, `drop`, `flag` (150 in total). |
| `CODE_REFERENCE.md` | Main.js state, globals, panels, detail, tooltip and keyboard table; a new Overlays subsection; a new Tree (`js/tree.js`) section; the new icons in the Icons section. |
| `complexities.md` | `js/tree.js` added at 5.5; `js/main.js` raised from 6 to 6.5 with a note; the icon count updated. |

`js/render.js`, `js/sim/weather.js` and `js/sim/ecosystem.js` were not touched. The new history keys are read as `h[k] || []`.

## Test results

Headless Chromium (SwiftShader WebGL2), seed 42, Medium. The probe (`scratchpad/p4s2probe.html`) ran at tick 2640 (year 6) and at tick 9600 (year 21). It reported `errs: []` and 0 exceptions in every run.

- **Views:** all 13 modes were cycled (biome, plants, heat, moisture, height, soil, nutrients, litter, bugs, disease, territory, rain, water), each through its button, with `renderer.mode` matching each time. Slice 1 had landed, so rain and water are real modes.
- **Weather switch:** off gives badge "Off" with `eco.options.weather === false`; on gives "Storms ×N" and `true`. W toggles `#showWeather` and `renderer.showWeather`.
- **Weather badge:** the title at year 21 reads "Weather: Storms ×7 / Mean wetness 52% / Rain on 1.4k tiles · snow on 9.8k tiles / 3 droughts so far".
- **Stat cards (year 21):**
  - Thirst deaths 2.8k (1% of land deaths)
  - Herds 1
  - Territories 2
  - Eggs 1.1k (95k laid, 88k hatched, 1.4k eaten, 4.0k failed)
  - Life stages 7.1k with 25% elders
- **Detail:** Habitat and Stages cells are present ("570 juv · 1.6k adult · 779 elder · 607 eggs"). The traits list Territorial, Herding, Cold-blooded/Warm-blooded and Drought tolerance.
- **Tooltip:** "grazing · juvenile · age 10 / energy 26% · water 100%".
- **Species tree:** the only animal with a descendant at year 21 is Rhinabranchus (id 29), whose lineage has 2 nodes.
  - Clicking the child bar selected Lacustropterus (161), and the title followed it.
  - The plant tree has 2 of 20 nodes and the pathogen tree 25 of 82.
  - No bug species had children.
- **Kingdom tree:** "All animals · 46 species", 0 merged. Clicking a node selected id 25 and moved the focus to it.
- **Keys and overlay:** T opens the tree. Esc closes the overlay but leaves the detail open, and a second Esc closes the detail. `?` and `h` open help. The help button toggles it, and a click on the scrim closes it.
- **Screenshots** (`screenshots/`, each one viewed):
  - `tree.png`: lineage mode, with the focus label on a pill and the extinct child label.
  - `tree-kingdom.png`: kingdom mode.
  - `help-detail.png`: the help overlay with the detail Habitat and Stages cells beside it.
  - `topbar-cards.png`: the topbar with the weather badge on one line at 1600 px, plus the new cards.
  - `help.png`.

## Deviations

- **Speciation is rare.** Animal speciation hardly happens on seed 42 (by year 21 only one animal has a child), so the species-mode animal tree is small (2 nodes). Kingdom mode, and plant and pathogen lineages, exercise the larger layouts.
- **Small additions needed to make the plan work:**
  - The `.clock` gap went from 14 to 10 px, so the topbar with the new badge and help button stays on one line at 1600 px.
  - The trait grid's value column is now `minmax(58px, auto)`, so "Warm-blooded" fits.
  - Keydown ignores Ctrl, Meta and Alt combos, so browser shortcuts such as Ctrl+W are not captured.
  - A click on the scrim closes the overlay, and the `?` button toggles help.
  - The tree follows `selectSpecies` while it is open.
  - The tree's vertical scroll is clamped so the rows never start below the top edge.
- **Extra screenshots:** `tree-kingdom.png` and `help.png` were taken in addition to the three required.

## Checklist

- [x] Items 1–9 of the slice implemented (views, weather widget, cards, detail rows, tooltip, family tree, weather filter, help, keys)
- [x] Did not touch `js/render.js`, `js/sim/weather.js` or `js/sim/ecosystem.js`
- [x] History reads use `h[k] || []`
- [x] New colours go through tokens (`--scrim`, kept in sync in the dark and both light sets); the tree reads theme tokens
- [x] No new comments (grep of the diff for `//`, `/*` and `<!--` on added lines, and of `js/tree.js`: none)
- [x] No console errors (seed 42, years 6 and 21)
- [x] Screenshots taken and viewed
- [x] Docs updated (`CODE_REFERENCE.md`: main.js UI, Overlays and the new Tree section; `complexities.md`: tree.js 5.5, main.js 6.5)
- [x] No state-changing git commands
