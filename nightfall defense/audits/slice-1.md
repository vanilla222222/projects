# Slice 1 audit: balance, feel and polish

## What shipped

- **Seeded randomness.** Every wave attempt gets its own mulberry32 stream, seeded by `hashSeed(S.seed, wave, attempts played)`. Crits, stuns, procs and spawn jitter all draw from `run.rng`, so the same save and the same choices give the same fight, and the balance runs repeat exactly.
- **Data-driven map and waves.** `MAPS.moonlit` holds the route polylines, palette, decor, HP and cash multipliers, and the boss order. `WAVEGEN` holds the wave rules. `waveSpec(n, map)` returns the spawn list, counts, theme, boss and duration. Rendering, placement checks and pony facing all read from the map. Maps 2 to 5 only need new `MAPS` entries.
- **Difficulty.** HP growth is a piecewise-linear curve (`TUNE.hpCurve`) instead of one growth rate. Three late bosses got lower `hpMul`: Bramble King 0.7 to 0.5, Twin Shade 0.25 to 0.17, and Nightmother 0.27 to 0.16.
- **Game speed.** 1x, 2x and 4x, plus pause, in a speed bar on the board. The speed is saved. Space pauses during a wave, P pauses, and F cycles the speed. The fixed timestep scales with speed, capped at 8 steps × speed per frame.
- **Feedback:**
  - Damage numbers are pooled per enemy every 0.16s and get a crit and a boss style.
  - Hit flashes, death puffs, and projectile trails.
  - A boss-spawn screen shake that can be turned off.
  - A boss health bar showing name, count and HP. It moves below the speed bar on narrow boards.
  - A wave preview with enemy-mix icons, counts and tooltips, a spawn timeline, a boss card, and warnings when no pony can hit flyers or magical enemies.
  - An "Up next" mix while a wave runs.
- **Sound.** `js/audio.js` is a WebAudio synth with sounds for hit, crit, kill, leak, place, upgrade, sell, boss, boss down, win, lose, click and deny.
  - It uses per-sound throttles, a cap of 24 voices and a compressor.
  - Hit and kill counters are pooled per frame, so 4x speed does not flood the output.
  - There is a header mute button and an M hotkey. Audio unlocks on the first input.
- **Quality of life:**
  - Hotkeys 1, 2 and 3 pick ponies, and each race button shows its key.
  - U opens upgrades for the pony under the cursor and pulses the panel.
  - S arms the sell and a second S sells. B upgrades max affordable. Holding Shift shows every range. Esc cancels.
  - An "Upgrade max affordable" button buys the cheapest affordable upgrade first among chosen paths and endless training, and shows its count and cost ahead of time.
  - Tooltips on every node pip, buy button, training button, race button and enemy chip. Tapping a pip on touch pins its tooltip.
  - Per-pony stats in the info panel: total dealt, kills, this wave, and share. A "Herd ledger" card lists the top 5 ponies by damage plus totals.
- **Settings panel:** sound, volume, shake, damage numbers, and number format (short, scientific or full), with a hotkey list and a "restore defaults" button. Settings are stored in the save.
- **Save.** The key stays `nightfall-defense-save-v1`. Saves now carry `ver: 2`. The v1 format (`v: 1`) migrates through `MIGRATIONS[1]`, which adds map, seed, stats, default settings and per-pony damage.

## Gates

| Gate | Result |
| --- | --- |
| No console errors at 1280px and 390px | Pass. Every e2e page checks console and page errors. Two tests run at 390x844, one of them checks for no horizontal scroll. |
| `tools/e2e.js` passes, extended | Pass, 8 of 8 (5 new tests, listed below) |
| `tools/balance.js` runs, result recorded | Pass. Output below. Two runs gave byte-identical stdout. |
| Old saves load and migrate, same key, `ver` field | Pass, covered by e2e |
| No code comments, no build step | Pass, checked with grep |

New e2e tests:
- Speed and pause: 4x moves game time faster than 1x, pause stops it, and the Space, F and P keys work.
- Hotkeys and upgrades: 1, 2, 3, Esc, U, B, Shift and S-S. Also buy max, the pip tooltip, damage numbers, per-pony stats and the ledger.
- Wave 10: the wave preview, boss card, boss bar and "Up next" row.
- At 390px: settings survive a reload, the save has `ver` 2, defaults can be restored, and there is no horizontal scroll.
- Migration: a v1 save loads and is resaved as v2.

## Balance

Command: `node tools/balance.js`. It took 69s real time per run. Both runs printed fingerprint `7f2e7f8d` and identical output.

```
wave  10  0.09h  towers 5    losses 0
wave  20  0.19h  towers 14   losses 0
wave  30  0.32h  towers 25   losses 0
wave  40  0.98h  towers 40   losses 8
wave  50  1.29h  towers 53   losses 10
wave  60  1.82h  towers 73   losses 15
wave  70  2.00h  towers 83   losses 15
wave  80  2.29h  towers 96   losses 16
wave  90  4.31h  towers 120  losses 36
wave 100  6.02h  towers 134  losses 54
decade hours: 1-10 0.09  11-20 0.10  21-30 0.13  31-40 0.66  41-50 0.31  51-60 0.52  61-70 0.19  71-80 0.29  81-90 2.02  91-100 1.71
smoothness: worst decade-to-decade ratio 7.00x, most losses on one wave 18
fingerprint 7f2e7f8d
losses by wave: 33x1 37x1 38x1 39x3 40x2 41x1 45x1 60x5 76x1 86x5 90x15 100x18
reached wave 100 in 6.02h of game time (154 attempts, 54 losses, 162 farm runs)
wave 50 at 1.29h (target ~2h), wave 100 at 6.02h (target ~6h)
```

**Starting point.** The slice began with a flat-ish curve. The bot reached wave 50 at 0.60h and wave 100 at 1.33h with no losses. The first steeper curves overshot: wave 31–40 took 2–3h, and the bot hit hard walls at 52, 60 and 68, and later at 86, 90 and 100.

**Tuning.** I tried about 30 candidates over five batches. The final curve:
- grows 1.25 to 1.20 through wave 20;
- eases to 1.16 around wave 35, which spreads the old 30–45 wall over the decade;
- rises to 1.17 at wave 45;
- drops to 1.09 after wave 55 and tapers to 1.058 at wave 100.

**Result.** Wave 100 lands at 6.0h, on target. Losses in the 30s are spread over 33–45 (no single wave above 3) instead of piling onto one wave. The late 86–100 stretch is now about 3.7h of steady farming and no longer a stall.

**Known gaps:**
- Wave 50 arrives at 1.3h, short of the 2h target. Every curve that pushed wave 50 to 2h either walled wave 31–40 or pushed wave 100 past 9h, because the bot's power growth flattens late. The bot also buys optimally and never idles, so human time to wave 50 should run longer than the bot's.
- Boss waves 90 and 100 still account for most late losses (15 and 18). That is the intended "boss spike", but it is the steepest point on the curve.
- Waves 61–80 are quick (about 0.2h per decade) before the 81–100 climb. A later slice could add mid-game content, such as new enemy types (slice 4), to fill that stretch.

## Known issues

- The balance bot plays only map 1. Set `MAP=<id>` to run it on other maps once they exist.
- Sound needs a user gesture before it plays, which is browser policy. Mute and volume apply right away.
- Damage numbers are pooled per enemy, so a single hit inside a 0.16s window is not shown on its own.
- The pip tooltip hides when its panel scrolls, by design, so it never floats away from its pip.
- The Map 2 button is still a locked placeholder until slice 2.
