# Audit: Part 1, slice B (icons)

## Files changed
- `js/icons.js`: 5 shape helpers (`ell`, `ellR`, `spokes`, `starPath`, `ringOf`), 81 new icons appended after `blight`, atlas `cols` 8 → 12.
- `CODE_REFERENCE.md`: Icons section only (new icon lists, helpers, 12-column atlas formula).
- `complexities.md`: `js/icons.js` row only.
- `feature-research/ecosystem-v2/part1/screenshots/designs.png`, `plant-designs.png`: review galleries.

## Checklist
- [x] Icons appended in plan order; existing indices unchanged (`blight` = 52, first new icon `tallgrass` = 53); 134 total.
- [x] 81 new icons. The plan says 80, but its own list has 81 names: 36 plant variants, 18 land animals, 12 water animals, 5 bugs, 5 pathogens and 5 UI icons. All 81 are present.
- [x] Format is `[role, path, stroke?]` on a 32×32 grid. Animals face right; `owl`, `hawk`, `starfish`, `ray` and `moth` are shown front-on or from above, as the plan allows. All three roles are used; fixed colours appear only where they are natural (fruit, flowers, bark, sand, shells, orca patches, `shadow` black).
- [x] `buildIconAtlas` uses 12 columns (12×12 grid, 768×768 px at 64 px cells); nothing else in it changed.
- [x] `node --check js/icons.js` passes; a VM load finds no NaN or undefined path data, and every role is valid.
- [x] Screenshots built and reviewed at 72, 24 and 16 px. Redraws after review: `ape` (it read as a table, now a knuckle-walking gorilla), `jackal` (removed deer-like spots), `porcini` (stem net), `stinkhorn` (removed the fly), plus cleanup of `diatom`, `chanterelle` and `badger` path data.
- [x] `git diff -U0 -- js/icons.js | grep '^+' | grep -E '//|/\*'` returns nothing.
- [x] No edits to `js/sim/*`; no git state-changing commands.
