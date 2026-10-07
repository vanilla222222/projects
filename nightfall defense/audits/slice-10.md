# Slice 10 audit: endless mode, leaderboard, save codes, performance and final polish

## What shipped

### Endless mode
- **Unlock:** endless opens per map after that map's first star. The Endless screen lists all five maps with the current star, best wave at that star, and either a start button or the reason the map is locked.
- **Board:** each run plays on a challenge sandbox, so the main board, cash and progress are untouched.
  - The run uses the profile's research, hero, achievements and cosmetics.
  - "Use my layout" copies the main board's ponies into the sandbox, paid from the run's starting cash.
  - Starting cash is the map's start cash plus 70% of the skip cash for wave 100 at that star.
  - The run has 20 lives.
- **Waves:**
  - Waves run from 101 with no cap.
  - HP is wave 100's HP × 0.4 × 1.03 per wave past 100.
  - Kill cash is ×1.2 and clear cash ×1.2.
  - Bosses keep their rotation.
- **Mutators:**
  - One mutator is added every 10 waves (at 111, 121 and so on).
  - The pool holds 12: Regrowth, Haste, Shielded, Splitting, Armoured fliers, Fog, Elite surge, Boss pairs, Teeming, Thick hides, Lean times and Iron bosses.
  - The order is a seeded shuffle per run. After all 12 are used, they stack in ranks (×2, ×3...).
  - Active mutators show as pills on the run card, each with a tooltip.
- **Milestones:** every tenth wave that beats the best for that map and star pays 2 + star Moonstones. It shows a banner and a sound, and nothing is paid twice for the same wave.
- **Records:**
  - The best wave is kept per map and star (`endless.best['moonlit:1']`).
  - The end screen shows wave reached, time, Moonstones earned, mutators faced, the leaderboard rank and whether it is a new best.

### Local leaderboard (L or the Leaderboard button)
- The top 10 runs are kept per map and star.
- Each row shows wave, time, date, hero, herd (race badges with counts) and mutator count. The best row is gold.
- There are map tabs and 1★ to 5★ tabs, each with a run count. It opens on the current map and star.
- It has an empty state, and a link to the leaderboard from the endless end screen.

### Save codes (Settings, "Save code")
- **Export:**
  - The format is `NDS<ver>.<length>.<base64url of LZW-packed UTF-8 JSON>.<FNV-1a checksum>`.
  - The code is selected in a read-only textarea. "Copy code" uses the Clipboard API, and if that fails it falls back to selecting the text with `execCommand('copy')`.
- **Import:**
  - The paste box ignores whitespace and line breaks.
  - "Check code" validates the tag, length, checksum, decompression and JSON, and plain JSON saves are also accepted.
  - A failed check shows a clear error.
  - A preview shows stars, Moonstones, DNBs defeated, achievements, research levels, playtime, heroes, endless best and every map's progress.
  - Codes from older versions say they will be updated, and are migrated through the normal migration chain to v11.
  - Importing needs a second confirming tap ("Replace my save"), then reloads.

### Performance
- **Pooling:**
  - Enemies are recycled through a free list after in-place compaction of the enemy array.
  - Projectiles are recycled into a 600-entry free list.
  - Particle records are recycled too. Effect records are fixed-shape and go back into a 900-entry free list when they expire. 57 of the 63 effect call sites use the pool; the rare beam and star records still allocate.
  - The determinism hash of a five-map, 30-wave sim run with particle snapshots is identical before and after pooling.
- **Other sim work:** the aegis aura is throttled, and enemy, projectile and effect arrays are compacted in place without `filter`.
- **Rendering:**
  - Static layers (ground, road, scenery, decor) are painted once into an offscreen background canvas and rebuilt only on resize or map or season change.
  - Enemy and projectile sprites are cached per type, colour, flags and radius. The 300-enemy scene uses 8 sprite keys.
- **Low effects:**
  - A settings toggle switches to fewer particles (the newest 160), no glow, and cached sprites.
  - Auto-low turns on by itself when the frame interval passes 24 ms with 80 or more DNBs, and turns off below 40 DNBs.

### Tutorial
- There are five steps:
  1. Place a pony.
  2. Start a wave.
  3. Change the speed.
  4. Buy an upgrade.
  5. A prestige hint about stars, Moonstones and endless.
- Each step highlights its target and advances when the action is done. Speed and upgrade also have a Next button.
- The card moves to the top of the screen when its target sits low on the screen, and off-screen targets are scrolled into view.
- **When it shows:**
  - It shows only on a truly fresh save.
  - Saves with any progress (cleared waves, towers, stars or Moonstones) are marked as done and never see it.
- It can be skipped from every step, and replayed from Settings ("Replay the tutorial").

### Credits
- A short credits page in Settings covers what the game is, how it is made and the thanks.

### Accessibility
- **Colourblind mode:**
  - It uses a blue and orange palette instead of green and red.
  - DNBs get shape cues: a star for bosses, a triangle for fliers, a diamond for magical, a square for armoured, twin dots for swarms, and a ring for stealth.
  - Health bars are thicker, split into quarters, and get a white edge when low. Shields are white, and the road gets direction markers.
- **Readable font:** a plainer typeface with more letter and word spacing and a larger hint size.
- **Interface size:** Small, Normal, Large and Extra large (0.85 to 1.3), applied to the header, side panel and dialogs.
- **Keyboard navigation:**
  - Every modal traps Tab and Shift+Tab focus.
  - Arrow keys move between buttons, and Escape closes.
  - Settings returns focus to the control that opened it.
  - L opens the leaderboard.

### Save v11
- `SAVE_VER = 11`.
- Migration 10 to 11 adds `endless` (best, top and runs) and the new settings (`lowFx`, `cb`, `font`, `ui`, `tut`).
- `cleanEndless` validates keys, waves, top lists and herd entries.

## Balance (`tools/balance.js`, final)

Hours of play to reach a wave, bot profile, default hero per map:

| map | star | hero | w50 (h) | w100 (h) | slowest decade |
|---|---|---|---|---|---|
| moonlit | 0★ | nova | 1.589 | 5.527 | 81–90, 2.10h |
| woods | 0★ | ironmane | 1.69 | 6.467 | |
| caverns | 0★ | nova | 2.078 | 5.957 | |
| cliffs | 0★ | skyflick | 2.084 | 6.604 | |
| castle | 0★ | duskfang | 1.865 | 5.253 | |
| moonlit | 1★ | nova | 1.211 | 5.743 | |
| moonlit | 5★ | nova | 0.504 | 7.645 | |

- Offline minutes per wave at wave 20: woods 84, caverns 61, castle 57, cliffs 64, moonlit 51.
- Challenges: all 54 challenge checks are won on the first try by the bot (`tools/challenge-check.js`).
- Endless with a progressed profile:
  - woods 1★ reaches wave 129 in 0.84h;
  - castle 1★ reaches wave 149 in 0.87h.

## Performance numbers

- **Node sim** (`node tools/perf.js`): moonlit, 24 towers, 300 DNBs alive the whole time, 4x speed (four sim steps per frame), 600 frames.
  - Before pooling: avg 3.2–4.1 ms per frame.
  - After pooling: avg 1.25–1.58 ms, p95 1.5–1.9 ms, max 2.0–3.4 ms, against a 16.7 ms budget.
  - In a five-map 30-wave run, the particle pool made 10 records and reused 4,535.
- **Browser** (e2e, headless Chromium with SwiftShader software GL on a 4-core container): 300 DNBs alive at 4x, rAF measured over 4s.

  | effects | fps | frame avg | p95 | max |
  |---|---|---|---|---|
  | normal | 7.4 | 135.6 ms | 166.7 ms | 183.4 ms |
  | low effects | 9.1 | 109.7 ms | 133.3 ms | 183.4 ms |

  - Auto-low engaged in both runs (low-path share 100%).
  - Low effects cut live particles from 147 to 4.
  - **The 60 fps target was not demonstrated in this environment.** The container has no GPU, and every canvas draw is rasterised in software. The sim itself costs about 1.5 ms per frame, so the rest of the frame is software rasterisation, which a real GPU-backed browser does far faster.
  - On a normal desktop browser these numbers should be much better. That was not measured here and is not claimed.

## Tests

- `tools/e2e.js` now serves the repo itself on port 8811 (in-process static server) and closes every page after each test.
  - It sets `window.__ndNoTut` on pages so older tests are not interrupted by the tutorial, except in the tutorial tests.
- Final run: **44 / 44 passed** at 1280 and 390, with no console errors.
  - The new tests, at both widths:
    - **Endless:** locked before a star; list; start; run card; 10 forced clears; mutator added at 111; milestone Moonstones; quit; end screen with rank; leaderboard entry; and a reload keeping the record.
    - **Leaderboard, save code, credits and accessibility settings:**
      - the leaderboard opens on the current star, with star and map tabs, rows, herd badges, an empty tab and a check that the table is actually laid out;
      - save code export and copy;
      - credits;
      - colourblind, font and UI scale settings applied and persisted;
      - Tab, arrow keys and Escape navigation.
    - **Tutorial:**
      - a fresh save sees all five steps driven by real actions, finishes, and does not reappear after a reload;
      - Replay from Settings, then Skip;
      - a returning v10 save with progress never sees it.
  - A save code import test at 390: an NDS9 code wrapped in line breaks shows a preview with an older-version notice, needs two taps, and migrates to v11.
  - Two browser perf tests: normal effects and low effects, both at 300 DNBs at 4x.
  - Every earlier test was updated for ver 11.
- Runs used: 3 of 3.
  - Run 1 had 14 failures. Most came from pages left open by failed tests, which saturated the CPU. They were fixed with a page registry that closes them after each test, plus three stale version literals and a leaderboard star mismatch.
  - Runs 2 and 3 both passed 44 / 44.
- After run 3, two class-name collisions were fixed (see below). They are covered by a static class-collision audit and a node render smoke test. No browser run was left to recheck them.
- Node checks:
  - a determinism hash covering the sim and particle data;
  - a render smoke test: every map, 6 waves each, low effects off and on, over 60,000 frames with a stub canvas and no exceptions;
  - `node tools/perf.js`;
  - `node --check` on every script.

## Fixes found during the slice
- **Leaderboard dialog collapsed:** it rendered as a thin bar, because its `lb` class reused a 4px progress bar style. It is now `lbdlg`, and the e2e test checks the dialog and table height.
- **Header bar styles leaked:**
  - The leaderboard's best row and the raised tutorial card both used the class `top`, which is the header bar's class, so they picked up flex layout and the UI-scale zoom.
  - They are now `lbtop` and `attop`.
  - A static check over every class added this slice found no other clash with an older rule.
- **Tutorial card covered its target:** on phones the card covered the pony list. It now moves to the top when the target is low, and scrolls off-screen targets into view.

## Known issues
- **Browser frame rate:** the 60 fps target at 300 DNBs and 4x could not be shown in this container's software renderer (7–9 fps here). Sim cost is about 1.5 ms per frame.
- **Starred later maps are quick**, because research carries over between maps: woods 1★ 2.82h, caverns 2★ 1.36h, cliffs 3★ 2.32h, castle 1★ 2.07h to wave 100.
- **Moonlit 81–90 is the slowest decade at 0★** (2.10h). It is intended as a wall, but it is steep.
- **Endless needs research:** a brand-new profile with no research cannot hold wave 101 even with a full board. Endless is tuned for the profile a player has after their first star.
- **Endless run time** counts only time spent inside waves, so runs cleared by test helpers show 0s.
- **Save codes** are long (several KB for a late save). Pasting into some chat apps may wrap them, which the importer tolerates.
- **Leftover effect allocations:** six rare effect call sites (beams, star bursts, rank-ups) still allocate a new record.
