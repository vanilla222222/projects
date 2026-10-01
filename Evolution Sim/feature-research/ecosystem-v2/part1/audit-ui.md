# Part 1, slice C (UI and render): audit

## Files changed

| File | Change |
| --- | --- |
| `index.html` | `#themeBtn` in `.clock`. The three cards get `data-card` (ecosystem, populations, map), and their heads get `role=button`, `tabindex=0`, `aria-expanded` and a `.chev`. New `#showSwarms` switch ("Bug swarms", on). Every tab gets a `title` and a `.tab-label`; the Events tab gets `data-icon="events"`. |
| `css/style.css` | Spacing and radius tokens (`--sp-1..4`, `--r-sm`, `--r-lg`). About 30 color tokens replace hard-coded colors, including the `--c-*` role colors and chart ink, with a light token set duplicated under `prefers-color-scheme: light` and `[data-theme='light']`. Collapsible cards (`.chev`, `.card.collapsed`). Tabs show icon and count on every tab and the label only on the active one, with tighter spacing. The species row grid gets a sub-line, category tag, extinct tag and sparkline; the `.sp-bar` rules are removed. Role tags use `color-mix`. |
| `js/main.js` | `GROUP_COLORS.landScav`, a crash fix needed for slice A's new group. Theme (`THEMES`, `setTheme`, `storeGet`/`storeSet`), `setupCards`, `sparkSVG` rows, tab counts through `formatCount`, the `Scavenging` trait row, and the `#showSwarms` wiring. |
| `js/render.js` | Bug cloud texture (`bugTex`, `_updateBugCloud`, texture unit 3) with noise-shaped, blurred, drifting haze. The haze crossfades to dot particles between zoom 9 and 14 (`CLOUD_FADE`). Also: `showSwarms`, a zoom-gated domain warp (`WARP_ZOOM`), depth darkening and a shore band, a second shimmer octave, stronger hillshade (factor 20, clamp 0.62–1.28), animal shadows at zoom ≥ 6, and `BUG_PER_DENSITY` 4→2. |
| `js/charts.js` | `chartInk()`: axis and grid colors come from CSS tokens, so charts stay readable in the light theme. |
| `CODE_REFERENCE.md` | Renderer section (uniforms, effects, `bugTex`, hillshade, swarms, shadows, fields, constants), Charts (`chartInk`) and App section (theme, cards, sparkline, storage, tabs, rows, Scavenging, `landScav`). |
| `complexities.md` | render.js 7→7.5, main.js 5.5→6, style.css 3→3.5, with notes. |
| `screenshots/overview.png`, `screenshots/overview-light.png` | New. |

## Test results

- **`run6.js` seed 42 (3000 ticks):** completes. Disease consistency checks show 0 mismatches, and all groups are alive, including `landScav` at 34.
- **Headless Chromium** (`index.html#42`, max speed to year 5, tick 1923):
  - **0 console errors, 0 exceptions.**
  - **Theme:** auto → light → dark → auto. The background, button title and `localStorage` all change.
  - **Cards:** each of the 3 cards collapses (content hidden, state stored) and expands (`aria-expanded=true`). The population chart redraws at 239×150 right after expanding.
  - **Tabs:** every tab renders. Rows equal sparks on the species tabs: Plants 27, Land 10, Water 4, Bugs 13, Disease 3. Events has 55 items.
  - **Scavenger detail:** Longesorex (hyena icon), "Scavenger · terrestrial", Scavenging 79%.
  - **Zoom 2, 6, 10 and 16:** all render.
  - **Bug swarms switch at z16:** 18923 sprites with it on and 5832 with it off, then 18923 again when switched back on.
- **Tab overflow:** measured as `scrollWidth` against `clientWidth`, with every count forced and each tab made active in turn.

| Width | Counts "888" | Counts "1.2k" |
| --- | --- | --- |
| 1280 px | 329 / 329, 2 px spare | 329 / 329, 2 px spare |
| 1000 px | 299 / 299, 2 px spare | 299 / 299, 2 px spare |

- **FPS:** on SwiftShader, a CPU renderer, so the absolute numbers are low. The baseline was taken before the render edits, at tick about 1920.

| View | Before: rAF fps / draw ms | After: rAF fps / draw ms |
| --- | --- | --- |
| Paused, z2 | 10 / 1.37 | 10.2 / 2.09 |
| Paused, z6 | 12.7 / 0.76 | 10.5 / 1.80 |
| Paused, z10 | 1.9 / 6.27 (51k sprites) | 2.2 / 9.56 (39k sprites) |
| Paused, z16 | 2.5 / 3.70 (26k) | 3.3 / 3.56 (19k) |
| Running max, z6 | 7.9 / 0.86, 15.5 ms/tick | 10.0 / 1.75, 15.8 ms/tick |

The extra cost at low zoom is the per-pixel noise (warp and clouds), which is expensive on a CPU rasterizer and cheap on a real GPU. At high zoom, halving `BUG_PER_DENSITY` more than pays for the shadows.

## Deviations

- **Events tab** has an icon but no count, because an event count is not a species count.
- **`.sp-bar`** population bar is replaced by the sparkline rather than shown next to it, because the row has no room for both.
- **`js/charts.js`** was edited (`chartInk`), because without it the light-theme axes were unreadable.
- **Tab counts** go through `formatCount`, so a tab count is at most 4 characters.
- **Screenshot tab counts** were forced to 3 digits, since the natural counts at year 5 are mostly 1–2 digits. The data is otherwise real.
- **Shadows** switch on with a hard cut at zoom 6, not a fade.
- **Warp and clouds** are disabled in the overlay (`RAMPS`) views, so the data views stay exact.
- **Stat card title** uses the STAT_GROUPS label "Scavengers" as-is; no UI-side rename.
- **Bug clouds** are shaded in the terrain shader from a per-tile texture, blurred with 4 taps, rather than drawn as sprites.

## Checklist

- [x] No comments added: `git diff -U0 -- index.html css/style.css js/main.js js/render.js | grep '^+' | grep -E '//|/\*'` returns nothing.
- [x] CODE_REFERENCE entries grep-verified against the code: `u_bugs`, `u_warp`, `u_cloud`, `bugTex`, `_updateBugCloud`, `showSwarms`, `SHADOW_ZOOM`, `CLOUD_FADE`, `WARP_ZOOM`, `BUG_CLOUD_FULL`, `setTheme`, `setupCards`, `sparkSVG`, `storeGet`, `chartInk`, `landScav`, `Scavenging`, `CARDS_KEY`, `THEME_KEY`.
- [x] complexities.md updated (render.js 7.5, main.js 6, style.css 3.5).
- [x] `screenshots/overview.png` exists: dark theme, seed 42, year 5, zoom 7 over a coast, with depth shading, bug clouds and 3-digit tab counts. `overview-light.png` is also saved.
