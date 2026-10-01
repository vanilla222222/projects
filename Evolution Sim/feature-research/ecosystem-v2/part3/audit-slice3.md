# Audit: Part 3 slice 3 (icons, render, minimal UI)

## Files changed

- `js/icons.js`: 10 new icons (`frog`, `toad`, `newt`, `salamander`, `axolotl`, `lizard`, `snake`, `tortoise`, `monitor`, `crocodile`), appended last. 144 icons, 12 atlas rows.
- `js/sim/animals.js`: 8 new `ANIMAL_ICON_VARIANTS` entries.
- `js/main.js`:
  - `GROUP_COLORS` gets `amphib` `#2fae94` and `reptile` `#b8901c`.
  - Stat card tooltip reads Land, Water or Amphibious.
  - `speciesInTab`, `updateTabCounts` and `selectSpecies` route amphibians to the Land tab.
  - `renderDetail` labels them "amphibious".
  - `EVENT_GLYPH.weather` is `~`.
- `js/render.js`:
  - `LIVE_MODES` adds `humidity` and `territory`.
  - Live Moisture shows `clamp01(humidity + 0.5*wet)` with a white snow tint.
  - The categorical Territory view blends the owner species color at 55%.
- `js/sim/ecosystem.js`: the water herbivore revival also fires when `waterHerb === 0`.
- `index.html`: Territory button in `#viewModes`.
- `css/style.css`: `.ev-weather` rule built from `--amber`.
- `CODE_REFERENCE.md` and `complexities.md`.

## Results

### Seed 7, year 35

| Group | Count |
| --- | --- |
| landHerb | 194 |
| landOmni | 728 |
| landCarn | 32 |
| landScav | 1 |
| waterHerb | 24 |
| waterOmni | 4706 |
| waterCarn | 77 |
| amphib | 613 |
| reptile | 614 |

- All 9 groups and all 4 niches are alive.
- In slice 2, waterHerb was 0 at this point. The new trigger fired at year 34.88 ("Rhinapterus migrated in — the waters were empty").

### 3000-tick regression (versus audit-slice2)

| Seed | ms/tick (slice 2) | ms/tick (now) | Plant cover (slice 2) | Plant cover (now) | Groups and niches alive |
| --- | --- | --- | --- | --- | --- |
| 42 | 27.0 | 23.4 | 59833 | 59833 | all |
| 123 | 30.8 | 26.3 | 59846 | 59846 | all |

Plant cover is identical, so the new trigger did not fire before tick 3000 on either seed.

### Browser, seed 42

- There were no exceptions and no console errors.
- At year 9 there is 1 amphibian species. It is listed in the Land tab, and the tab count includes it.
- The Territory view rendered with 151 claimed tiles live at probe time. The Moisture view was checked during a storm.

## Screenshots (`part3/screenshots/`)

- `designs.png`: the 10 new icons plus `turtle`, in species colors at 96, 32, 16 and 12 px, on dark and light backgrounds.
- `territory.png`: seed 42 at year 9, Territory view, with the Amphibians and Reptiles stat cards visible and the Land tab showing a Frog and a Tortoise.
- `moisture.png`: seed 42 at year 9, live Moisture view zoomed to 9 on a storm (r 16) with 29 amphibians or reptiles nearby.

## Deviations

- The plan text also mentions monitor in the snake slot. I followed the explicit variant list instead, so `snake` maps to snake only.
- The territory screenshot was taken at year 9 (tick 3940), not year 8. The probe steps in 120-tick chunks to tick 3840 or later.
- The moisture screenshot shows a storm, not a drought, because no drought was active.
- When `waterHerb` is 0 and water omnivores exceed 250, the water predator rule, which is the `else` branch, is skipped on that pass. This follows from changing only the condition.

## Checklist

- [x] No new comments: `git diff -U0 HEAD` added lines in the 7 code files, grepped for `//`, `/*` and `<!--`, returned 0 hits.
- [x] CODE_REFERENCE.md covers the Icons table, the variant table, Renderer (live Moisture, Territory, `LIVE_MODES`), the App sections (`GROUP_COLORS`, amphibian tab routing, the weather event glyph, the Territory button) and the Ecosystem revival rule.
- [x] complexities.md notes for render.js and ecosystem.js.
- [x] `designs.png`, `territory.png` and `moisture.png` exist and were viewed.
