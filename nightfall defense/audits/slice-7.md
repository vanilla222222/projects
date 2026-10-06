# Slice 7 audit: offline earnings and idle automation

## What shipped

### Offline cash
When you come back, the game pays you for the time you were away. The payout comes from a closed-form estimate. No sim runs while you are offline.

- **Farm wave:** for each board, the farm wave is the best wave that board can safely farm.
  - Start from the best clear without a loss (`farm.safe`, tracked by auto-farm and normal play).
  - The farm wave is never lower than `floor(0.85 x cleared)` and never higher than `cleared`.
  - If ponies were sold after `farm.safe` was set, the farm wave drops by one for every 1.2x of lost board value.
  - An empty board earns nothing.
- **Cash per run:** `farmCash(n)` adds up the kill cash of wave n's spawn list. It includes elite multipliers, Boss Bounty, splitter children, map `killCash` and star `killMul`.
- **Time per run:** `farmTime(n)` = spawn duration (Swift for 2★ and up) + half the path walk + 6s overhead. If the board has a measured clear time for that exact wave, that time is used instead.
- **Rate:** `rate = min(cash/time, activeIncome) x eff x (1 + 0.2 x Night Shift)`, with `eff = 0.2`.
  - `activeIncome` is an EMA of real wave income per second: decay 0.85, covering won and lost waves plus overhead.
  - Bounding by `activeIncome` means a board that keeps losing never earns more offline than it earns online.
- **Payout:** `payout = rate x min(away, cap)` for the active map.
  - Other maps with ponies on their boards earn 25% of their own rate into their own board cash.
- **Cap:** 8h, plus 2h per level of Long Watch (`util_offline`, up to 16h). Night Shift (`eco_offline`) adds +20% rate per level.
- **Welcome-back modal:**
  - Shows time away (with a "capped" note), one row per map (name, farm wave, cash, active map highlighted), the total, and a single Claim button. There is no ad 2x.
  - Escape or Enter also claims. The Claim button gets focus on open, and the modal fits at 390px.
- **Small gaps:** gaps under 10s pay nothing. Gaps from 10s to 60s pay silently with a banner. From 60s up, the modal opens.
- **Timestamps:**
  - `lastSeen` is written on every save, but not while the modal is still unclaimed.
  - `touchSeen` only moves the timestamp forward.
  - If the clock goes backwards (`lastSeen` in the future), the game pays nothing, shows a "The clock went back" banner and keeps the future timestamp, so the same window cannot be claimed twice.

### Background tab
On `visibilitychange` to visible, the frame clock resets and the game catches up with the same estimate.
- Under 60s away, it pays silently with a "+X cash while the tab was hidden" banner.
- From 60s up, it opens the welcome-back modal.

### Auto-farm
- **Turning it on:** an Auto-farm toggle on the wave card, with a target picker: "Best safe wave (wN)" or any cleared wave.
  - It turns off Auto-start, and Auto-start turns it off.
  - The header chip "Farm wN" shows while it is on and turns red after one loss.
- **Loop:** each run starts on its own 1.6s after the last one ends, or 2.2s after a loss.
  - A win increases `runs`.
  - The first loss retries the same wave.
  - The second loss in a row stops farming, drops the target (and the selected wave) back one wave, lowers `farm.safe`, and shows a banner: "Auto-farm stopped: wave N lost twice, dropped back to wave N-1".
- **Clear times:** clear times from farming feed `farm.secs` and the income EMA used offline.

### Auto-upgrade rules
- **Rules dialog:** opened from the "Rules" button on the wave card, or from "Upgrade rules" in a pony's info panel.
  - Tabs: one per race, plus the selected pony.
  - Up to 8 rules per scope, which can be moved up or down and deleted.
- **Rule kinds:**
  - Damage to level N
  - Rate to level N
  - Follow path X to node N, then path Y to node M
  - Cheapest available buy
- **Pony overrides:** a pony can follow its race rules or have its own list ("Give this pony its own rules" / "Follow race rules").
- **Global settings:**
  - On/off.
  - When to run: at wave end, every second, or both.
  - Cash reserve: keep 0/10/20/30/50% of cash.
- **Execution:**
  - Each pony takes its first rule that can act and is affordable above the reserve.
  - Among ponies, the lowest priority index goes first, then the cheapest cost.
  - Execution repeats until nothing is affordable (guarded at 400 buys).
- **Status:** a chip on the Rules button shows "on · N". At 390px the dialog grid collapses to one column and rows wrap. The e2e checks every control stays inside the dialog.

### Auto-place presets (plan slots)
- **Slots:** each map has 3 named plan slots, and Muster Plans (`util_auto`) adds 2 more for 5.
  - Each slot stores ponies (race, position, paths, infinite levels, targeting mode) and the hero position.
  - Slots survive star-ups.
- **Saving:** save, rename, overwrite (with a second tap to confirm), delete. Each card shows pony count, race mix, cost and date.
- **Restoring:** after a star-up, the empty board shows "Restore plan: NAME", and the wave card shows a hint banner.
  - Restoring buys everything affordable right away, cheapest first, then queues the rest.
  - A progress box (name, %, bar, next buy, Cancel) and a header chip "Plan N%" track it.
  - The queue keeps buying every second as cash arrives, and a banner reports when the plan is fully rebuilt.
  - The legacy single star-up preset still works as a fallback.

### Save
- `ver: 8` under the same key `nightfall-defense-save-v1`.
- New fields:
  - `lastSeen`
  - `rules`
  - `slots` (per map)
  - per board `farm` and `build`
- `MIGRATIONS[7]` adds the defaults, and the chain from v1 is unchanged. The e2e covers v1, v5, v6 and v7 saves loading and resaving as v8.

## Balance

### Main table (0★), unchanged from base 231106c

| map | w50 h | w100 h | fingerprint |
| --- | --- | --- | --- |
| moonlit | 1.747 | 6.698 | ac9c5793 |
| woods | 2.287 | 6.812 | 80395fb7 |
| caverns | 2.188 | 7.037 | 16054004 |
| cliffs | 2.06 | 6.14 | 450e839c |
| castle | 2.245 | 6.244 | 3e36c44 |

Every time and fingerprint matches the base commit. The farm and offline code never runs inside a wave, and the bot never turns on rules or auto-farm.

The slice-6 audit listed cliffs as 2.26/5.95. That row was measured before the knockback cooldown commit; the base itself gives 2.06/6.14 with the same fingerprint.

### Offline sanity check
`tools/balance.js` now records, at waves 20/40/60/80/100 of each climb:
- the 8h offline payout from `offlineGain`;
- the bot's active income over the previous 30 minutes of game time, including losses and farm runs.

It prints the payout as minutes of active play.

Target: 30 to 90 minutes.

| map | w20 | w40 | w60 | w80 | w100 |
| --- | --- | --- | --- | --- | --- |
| moonlit | 52m | 33m | 80m | 53m | 64m |
| woods | 80m | 53m | 55m | 45m | 49m |
| caverns | 125m | 115m | 95m | 49m | 79m |
| cliffs | 63m | 41m | 61m | 32m | 34m |
| castle | 138m | 79m | 73m | 17m | 51m |

- **Overall:** median 55m, mean 65m. 20 of 25 points fall inside 30 to 90.
- **Above the band:** early caverns and castle w20. The bot loses many waves there, so its recent online income is lower than the board's farm income.
- **Below the band:** castle w80. The bot had sold down its board, so the farm wave dropped to w68.
- **Tuning:** `eff` was tuned from 0.35 (median about 96m) to 0.2. Minutes scale linearly with `eff`. `OFFTUNE='{"eff":x}'` overrides it for experiments.

## E2E
`tools/e2e.js` has 27 tests, served from port 8808. Final run: 27/27 pass, with no console errors at 1280 or 390.

New tests:
- **Welcome back (390px):** seeded save with `lastSeen` 3h02m ago. Checks:
  - modal rows, focus and fit;
  - claim pays the total exactly once;
  - clock rollback pays nothing and keeps the timestamp;
  - a 30s hidden tab catches up silently with a banner;
  - a 20h absence caps at 8h;
  - Escape claims;
  - a dispatched `visibilitychange` opens the modal;
  - research raises the rate 1.4x and the cap to 10h.
- **Auto-farm (1280px):**
  - the toggle and chip work;
  - the run starts on its own;
  - the loop restarts after clears;
  - the first loss retries with the red chip;
  - the second loss stops farming and drops back to wave 4 with a banner;
  - a chosen wave is farmed.
- **Rules (390px):**
  - add a damage rule and a path rule, reorder, delete;
  - the dialog fits;
  - the chip updates;
  - the per-second buy fires;
  - the wave-end buy fires;
  - the info-panel button opens the pony tab;
  - a pony's own rate rule works with a 50% reserve.
- **Plans (1280px and 390px):**
  - 3 open and 2 locked slots;
  - save, and overwrite needs a second tap;
  - forced clear, then star-up, then "Restore plan: Opening";
  - a partial restore shows progress and the chip;
  - cash finishes the queue with identical ponies and a banner;
  - Muster Plans opens 5 slots;
  - the dialog and wave card fit at 390px;
  - the v8 save holds slots, rules and `lastSeen`.
- **Migration:** a v7 save migrates to v8 with idle defaults and no modal.

Existing tests were updated from ver 7 to 8, and from 32 to 34 research nodes.

The 3 Playwright runs went as follows:
- Run 1: the plan comparison depended on buy order. It now compares sorted.
- Run 2: the test bought Muster Plans without its prerequisite, Sturdy Gate.
- Run 3: all tests pass.

## Known issues
- The offline estimate is a model, not a sim. Boards that are badly matched to their farm wave can land outside 30 to 90 minutes: about 2x at worst early on, and 17m when a board was sold down.
- The 25% earnings on other maps uses each board's own farm wave, without checking whether that board's research or star makes the run safe.
- Auto-farm keeps running in a background tab only as far as the browser throttles frames. A hidden tab pays through the offline catch-up instead, so farming time is not paid twice.
- Plan restores place ponies at saved positions. If a newer map layout changes the path, positions that are now blocked are skipped and counted as done.
