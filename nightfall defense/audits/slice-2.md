# Slice 2 audit: map system and maps 2 to 5

## What shipped

- **Maps as data.** Each entry in `MAPS` (in `js/core.js`) holds:
  - route polylines, as one or more routes per spawn, with forks expressed as split routes;
  - no-build `blocks` (trees, crystals, rocks), `decor`, a palette, `lights`, `bridges` and `wind`;
  - `hpShift`, `hpMul`, `cashMul` and `startCash`;
  - an ordered list of 10 bosses, plus a name, blurb and feature line for the map select screen.

  `placeBlockReason` gives the reason a spot is blocked (path, tree, crystal, rock, pony). `lightAt` gives the range factor at a point. `crossings` finds where a route crosses itself.
- **Per-map boards.**
  - Each map keeps its own board: wave progress, best wave, first clears, towers, cash and records.
  - `switchMap` saves the active board and loads the target map's board, or creates a new one with `mapStartCash`. Switching is refused while a wave is running.
  - A map unlocks when the previous map reaches wave 50 (`UNLOCK_AT`).
- **Map select.**
  - The header panel has a "Map N · name / Maps" button. It opens a modal grid of cards, and each card shows:
    - a drawn preview made with the same painter as the board;
    - the feature line, the blurb, and the best wave out of 100 with a progress bar;
    - a lock line, or "Playing" for the current map.
  - Clicking a locked card gives a "Clear wave 50 on ..." banner.
  - When wave 50 is cleared for the first time, an unlock banner names the next map, plays a chime and pulses the map button.
  - At 390px the cards stack in one column.
- **The five maps:**
  1. **Moonlit Road.** Unchanged. The balance fingerprint is still `7f2e7f8d`.
  2. **Whispering Woods.** A winding S-path. Trees block building, and trying to build on one shows "A tree is in the way".
  3. **Crystal Caverns.** The path forks, so enemies split between two exits.
     - The cave is dark: ponies have 65% range unless they stand in a crystal's glow.
     - Rendering: a darkness overlay with glowing pools cut out around each crystal, with dashed pool edges.
     - Range circles show both the reduced range and a faint full-range circle. The ghost shows "65% range" when placed in the dark.
  4. **Stormy Cliffs.** The path crosses itself on a wooden bridge.
     - Enemies under the bridge are drawn before the bridge image and enemies on top after it.
     - Wind gusts push flyers back or sideways. During a gust:
       - streaks blow across the board;
       - a "GUST ← flyers pushed back" meter appears;
       - a wind sound plays;
       - the wave preview warns about wind.
  5. **Castle of Shadows.** Two spawn gates feed two spiral roads into one keep. It has the hardest bosses.
- **Waves and bosses.**
  - Every map has 100 waves and its own 10 named bosses, in `MAP_BOSSES`. Each boss has its own look, set with sprite colour, crown and tint, and its own ability mix. Abilities include:
    - sprint, burrow, blink, brood and regen aura;
    - shell, armor, phase, twin and haste aura;
    - windrider, staged forms and splits.
  - Boss HP and rewards scale with the map's HP and cash curves. Examples include the Thornback Boar, the Prism Wyrm, the Eye of the Storm, the Lich Regent and the Shadow Queen.
- **Save.**
  - `ver: 3`, and the key is still `nightfall-defense-save-v1`.
  - ver 1 saves migrate to ver 2 and then ver 3, and ver 2 saves migrate to ver 3. Migration puts the old single board (towers, cash, wave, best, first clears and records) onto the Moonlit Road board.
  - e2e covers both migration paths.
- **Balance bot.**
  - `tools/balance.js` runs every map in parallel child processes.
  - On maps 2 to 5 it places ponies on a coverage grid that is scored against route samples from every branch. The score respects no-build zones and darkness.
  - Map 1 keeps the slice 1 slot plan, so its numbers stay identical.
  - The bot writes `tools/balance-results.json`. `MAP=<id>` runs one map, and `MAPTUNE` overrides map fields for tuning.

## Tuning approach

Damage grows only about as fast as cash^0.16, so raising cash alone could never offset the HP curve. Each map therefore offsets the slice 1 HP curve:

- Map k (with k = 0 for map 1) uses `hpShift = 49k` and `cashMul = 1.2^(49k)`.
- Its starting cash is the bot's net worth at wave 50 on the map before it.
- As a result, map N+1's wave 1 uses the same base HP and kill cash as map N's wave 50, and the player starts with what a wave-50 player owns.
- `hpMul` is then the only free setting. I searched it per map until wave 100 fell in about 5 to 8 hours.

| map | hpShift | hpMul | cashMul | startCash |
| --- | --- | --- | --- | --- |
| moonlit | 0 | 1 | 1 | 160 |
| woods | 49 | 0.7 | 7.58e3 | 1.96e7 |
| caverns | 98 | 0.125 | 5.75e7 | 1.37e11 |
| cliffs | 147 | 0.07 | 4.36e11 | 1.08e15 |
| castle | 196 | 0.01 | 3.31e15 | 7.93e18 |

## Balance results

Command: `PAR=4 node tools/balance.js`, which took 257s real time. Results are in `tools/balance-results.json`.

```
map        w50     w100    reached  hpMul      cashMul    startCash  worth50
moonlit    1.291   6.022   100      1.00e+0    1.00e+0    1.60e+2    1.96e+7
woods      1.808   7.787   100      7.00e-1    7.58e+3    1.96e+7    1.37e+11
caverns    0.498   5.367   100      1.25e-1    5.75e+7    1.37e+11   1.07e+15
cliffs     0.63    5.73    100      7.00e-2    4.36e+11   1.08e+15   7.93e+18
castle     0.521   5.046   100      1.00e-2    3.31e+15   7.93e+18   6.50e+22
woods wave 1 vs moonlit wave 50: hp x0.70, kill cash x1.00, start cash vs worth50 x1.00
caverns wave 1 vs woods wave 50: hp x0.18, kill cash x1.00, start cash vs worth50 x1.00
cliffs wave 1 vs caverns wave 50: hp x0.56, kill cash x1.00, start cash vs worth50 x1.00
castle wave 1 vs cliffs wave 50: hp x0.14, kill cash x1.00, start cash vs worth50 x1.00
```

| map | fingerprint | hours per decade (waves 1-10 … 91-100) | losses |
| --- | --- | --- | --- |
| moonlit | 7f2e7f8d | .09 .10 .13 .66 .31 .52 .19 .29 2.02 1.71 | 54 (worst wave 100, 18) |
| woods | ced7db76 | .13 .22 .98 .23 .26 .29 .32 .33 .36 4.68 | 36 (wave 30 ×8, wave 100 ×28) |
| caverns | d3bb2db5 | .07 .08 .10 .11 .13 .15 .18 .20 .23 4.11 | 44 (wave 92 ×29, wave 97 ×15) |
| cliffs | 51061f37 | .10 .10 .12 .12 .19 .23 .26 .33 1.88 2.39 | 22 (wave 90 ×10, wave 92 ×12) |
| castle | 313cfc3f | .12 .08 .09 .10 .13 .16 .19 .22 3.67 .29 | 36 (wave 1 ×2, wave 90 ×34) |

- Map 1 matches slice 1 exactly: wave 50 at 1.29h, wave 100 at 6.02h, fingerprint `7f2e7f8d`.
- Kill cash and starting cash hand over exactly, at ×1.00, from map N's wave 50 to map N+1's wave 1. HP at map N+1's wave 1 is 0.14 to 0.7 times map N's wave 50.

## E2E

`tools/e2e.js` serves on port 8803 and uses the given Chromium path and flags. Setting `SHOTS=<dir>` saves screenshots. New tests:

- **Old ver 2 save:** it moves onto the Moonlit Road board, keeping its wave, towers and records.
- **Map select at 390px:**
  - previews are drawn and three maps start locked;
  - clicking a locked card is refused with a banner;
  - clearing wave 50 unlocks Woods, with a banner and a pulsing map button;
  - switching to Woods gives a fresh board with Woods starting cash;
  - trees block building;
  - a pony can be placed on Woods;
  - switching back to Moonlit restores the old board exactly, and switching to Woods again restores the Woods board.
- **Every map renders and plays:**
  - forks split enemies across both exits;
  - the darkness overlay is drawn and crystal light changes range;
  - the bridge and wind gusts appear, and a gust event fires;
  - Castle spawns from both gates.

Results across the three allowed runs:

| Run | Result | Failures and fixes |
| --- | --- | --- |
| 1 | 9 of 11 passed | **Locked-card click:** Playwright will not click an `aria-disabled` card, so the test now uses `force: true`. **Map loop:** it stepped after a run ended; it now breaks out when the run is gone. |
| 2 | 9 of 11 passed | **Pony placement on Woods:** the test picked a spot in the corner under the HUD; it now picks the free spot nearest the board centre. **Console 404:** a 404 for `/favicon.ico` was counted as a console error. |
| 3 | 10 of 11 passed | **Console 404 again:** the browser asked for `/favicon.ico` while on the root landing page, which has no icon link. |

For the favicon 404:
- The game page now declares `<link rel="icon" href="data:,">`.
- The e2e console filter now ignores errors whose source is `favicon.ico`.
- No Playwright runs were left, so that last filter change has not been run. Every gameplay check passed in run 3.

I reviewed the screenshots from runs 2 and 3:
- At 390px the map modal and the Woods board are readable, with no horizontal scroll.
- Caverns shows dark ground with crystal glow pools and the "65% range" label.
- Cliffs shows the bridge, wind streaks and the gust meter.
- Castle shows the two gates and the spiral into the keep.

Every js file passes `node --check`. There are no code comments and no build step.

## Known issues

- **The difficulty curve is back-loaded on maps 2 to 5.** Because of the HP shift, those maps run past the end of the slice 1 curve.
  - Waves 1 to 50 take only about 0.5h on Caverns, Cliffs and Castle, against 1.3 to 1.8h on maps 1 and 2.
  - Most of the time on maps 2 to 5 is spent on one wall in waves 90 to 100: Woods at 100, Caverns at 92, Cliffs at 90 and 92, Castle at 90.
  - Wave 100 lands at 5 to 7.8h on every map, but each map's worst decade is 6 to 18 times its previous one.
  - A gentler late HP curve per map would smooth this. It needs its own tuning pass.
- **Very steep `hpMul` response.** For example, on Castle 0.01 gives 5.0h to wave 100 while 0.012 stalls at wave 90. Small changes to towers or bosses will need the map multipliers re-tuned.
- **Castle loses wave 1 twice in the bot run.** With two gates, the bot's opening covers one spiral first. A human opening should be fine, but Castle's wave 1 is harsh.
- **The map-select e2e passes the unlock step by force-clearing waves 1 to 50 inside the page,** using boosted towers. It tests the unlock flow, not real play to wave 50.
- **Tower base costs are not scaled per map.** Starting cash makes them trivial on maps 2 to 5, so the early shop is dominated by upgrades and endless training.
