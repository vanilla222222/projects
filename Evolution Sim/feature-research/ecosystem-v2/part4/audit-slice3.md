# Part 4 · Slice 3 audit (save and load)

## Files changed

| File | Change |
| --- | --- |
| `js/save.js` (new) | `EvoSave`: generic, identity-preserving serializer for the whole `Ecosystem` in a gzip container (magic, JSON header, 8-byte-aligned typed-array section) and a two-pass loader. |
| `js/main.js` | `installWorld` (shared by new world and load), `showBusy`/`hideBusy`/`showMessage`, `saveWorld`, `saveMeta`, `loadWorld`, `applyLoaded`, `LAYER_SWITCHES`, `OPTION_SWITCHES`, `app.busy`, `app.messageTimer`. |
| `index.html` | Save (down arrow) and Load (up arrow) buttons after New world, a hidden `#loadInput` (`.evo`), a Save / Load help line, and the `js/save.js` script tag after `tree.js`. |
| `css/style.css` | `.map-error` text is light so messages read on the dark scrim; at ≤1700 px the brand subtitle hides and the topbar gaps tighten so the extra buttons keep the topbar on one line at 1600 px. |
| `CODE_REFERENCE.md` | Script order, app state, world lifecycle with save and load, a new Save section. |
| `complexities.md` | `js/save.js` at 5.5. |

No sim files were touched, so ms/tick is unchanged.

## Test results

- **Determinism (Node `vm`, Medium 320×210):** 1500 ticks → save → load → 500 more ticks on both the original and the loaded copy. Seeds 42, 7 and 123: `stats` identical, RNG states identical, and a full re-save of both worlds byte-identical. Aliases (`plants.moistMul === weather.moistMul`, `animals.eggs === eggs`, `plants.disease === disease`) survive.
- **Size (Medium, seed 42):** 14.4 MB at tick 1500, 15.6 MB at year 5 (tick 2400); seeds 7 and 123 are 14.1 and 14.3 MB at tick 1500. Save takes about 1.2–2 s and load about 0.5–1.7 s.
- **Browser (Playwright, headless Chromium, SwiftShader, 1600×900, seed 42 at year 6):** save downloads `evosim-42-y6.evo`; New world, then Load, restores the tick, identical `stats`, the camera, view mode (`water`), speed (3×), the Bug swarms switch, the seed field and the hash. After loading, the script ran the world, cycled every view, opened the tree in both modes, opened help and toggled Weather. Loading a non-save file shows "Could not load bad.evo: Not a save file (could not decompress). The current world was kept." and leaves the world running. The only console error is the Google Fonts request failing through the sandbox proxy (environment, not app).
- **Screenshot:** `screenshots/save-load.png`, the loaded world with the new topbar buttons (viewed).

## Deviations

- **No skip lists or pool trimming.** The serializer walks the object graph generically and saves everything except the `WorldMap`, which the sim never mutates (checked after 3000 ticks) and which is regenerated from seed. This makes the save lossless and keeps new sim fields saved automatically, at the cost of size.
- **Size target missed:** 15.6 MB vs the ≤ 10 MB target at year 5. Plant genomes and the seed bank (live high-entropy floats) are most of it. Zeroing empty plant slots saved under 2% and byte-plane shuffling made gzip worse. Skipping and rebuilding derived arrays could save about 25%, but each rebuild is a determinism risk, so it was left out.
- Help gained a Save / Load line; the topbar got a ≤1700 px breakpoint.

## Checklist

- [x] Save and Load buttons, `.evo` download, hidden file input
- [x] gzip container with JSON header and typed-array section
- [x] Load restores sim, options, view, layers, speed and camera; errors keep the current world
- [x] Determinism gate on seeds 42, 7 and 123
- [ ] ≤ 10 MB at year 5 (15.6 MB, see deviations)
- [x] No new code comments
- [x] Docs updated
