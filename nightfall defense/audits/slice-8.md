# Slice 8 audit: challenges and achievements

## What shipped

### Challenge sandbox
- `startChallenge(P, id, now)` builds a sandbox board X from the profile.
  - The sandbox shares only profile-level keys (stats, achievements, bonus, daily, chalDone, chalBest, rp, tokens).
  - It has its own map board, cash, lives and wave range, kept in `X.chal = {id, kind, def, mods, from, to, lives, t, waves, over, result}`.
- Starting cash is `(mapStartCash + 0.85 x skipCash(from-1)) x 3`.
  - Kill and clear cash are scaled by `CHAL_ECO = { start 3, kill 2, clear 2, hp 0.4, boss 0.55, soft 0.15 }`, so a 20-wave band plays as a short, dense run.
- The main boards are never touched. Map select, star-up and offline payouts are refused while a challenge runs.
  - Quitting (two taps on "Quit challenge" or X), losing or winning returns to the exact main board.
- When a challenge ends, the end screen shows waves held, lives, time and score, with "Try again" for retries.
- Score: `waves x 1000 + (won ? lives x 100 + 5000 + max(0, 4000 - 2t) : 0)`.

### Modifiers (15)
- Unicorns only, Grounded, No selling, Flyers only, Double speed, Short sight, No hero, Boss tide, Shadow march, Armored horde, Small herd, Golden start, Thick hides, Glass cannon.
- One life is used by permanent challenges only. The daily pool is the other 14.
- Clashing pairs are excluded from the daily (`CHAL_CLASH`), for example flyers+grounded, armored+tough and armored+short.

### Daily challenge
- Seeded from the UTC date (`YYYY-MM-DD`). The seed picks:
  - a map;
  - a 20-wave band from `DAILY_BANDS` (moonlit, woods and caverns start at 1/11/21, cliffs at 1, castle at 1/11);
  - 2 or 3 mods by weight, capped at a total weight of 3.5.
- A Moonstone reward is paid on the first win of each UTC day: `15 + min(10, streak - 1)`.
- Tracked: streak (consecutive winning days), best streak, local best score and runs per day.

### Permanent challenges (12)

| id | name | map / waves | mods | diff | reward |
| --- | --- | --- | --- | --- | --- |
| horn | Horn and Hoof | moonlit 1-20 | unicorns | 1 | 15 Moonstones |
| nosell | Nothing to Sell | moonlit 1-25 | nosell, limit 8 | 2 | 10 research points |
| feather | Featherfall | cliffs 1-20 | flyers | 2 | hero Skyflick |
| lightless | Lightless | caverns 1-20 | stealth | 3 | Lantern token |
| iron | Iron Tide | castle 1-20 | armored | 3 | 15 research points |
| glass | Glass Gate | moonlit 11-30 | onelife | 4 | 40 Moonstones |
| rest | Hero's Rest | woods 1-25 | nohero, short | 3 | hero Ironmane |
| rush | Boss Rush | moonlit 1-25 | bosses5 | 3 | Boss Crown token |
| stampede | Stampede | woods 1-20 | double | 3 | 30 Moonstones |
| golden | Golden Hooves | cliffs 1-25 | rich | 2 | Gilded Hooves token |
| few | Few and Proud | castle 1-25 | limit 5, tough | 4 | hero Duskfang |
| nightfall | Nightfall | castle 21-40 | stealth, armored, bosses5 | 5 | 60 Moonstones + Nightfall Banner |

- Rewards are paid once (`chalDone`). Later wins only update `chalBest`.
- The list screen shows rules, reward, difficulty stars, state ("Not yet won" / "Won, best N") and the daily card at the top.
- A challenge whose map is not yet open can still be played.

### Achievements (61)
- Categories: progress 12, combat 9, economy 8, heroes 7, races 8, stars 6, challenges 6, secrets 5 (hidden until unlocked).
- Each achievement gives a small permanent bonus:
  - combat: 0.25-1% damage, attack speed or range;
  - economy: 0.5-1% kill cash, clear cash or starting cash;
  - hero XP: 5-10%.
  - `recalcBonus` sums the bonuses into `P.bonus`. Pony stats use `x(1 + bonus)`, and economy goes through `bon(S, k)` in kill cash, clear cash, map start cash and hero XP.
- Hero milestones: field a hero, hero level 10 and 30, unlock Ironmane, Skyflick and Duskfang, unlock every hero.
- On unlock, a toast plays with a sound and shows the bonus text.
- The Achievements screen (A) has category tabs, progress bars (log scale for large goals), and a bonus total.

### Stats page (T)
- Kills: total, by DNB type, bosses, elites.
- Earnings: cash earned, Moonstones earned.
- Playtime: active and offline.
- Progress: waves cleared, star-ups.
- Favourites: favourite pony race and favourite hero (by kills).
- Per-map records: best wave, stars, kills, boss wins, waves won and tried, time played.
- The page fits 390px.

### UI and hotkeys
- A new meta row on the wave card: Challenges (G), Achievements (A), Stats (T).
- The in-run challenge card shows name, difficulty, mods, wave progress bar, lives, timer and quit.
- Switching boards now refreshes HUD, build bar, wave box, info, rules chip and challenge card at once, without waiting for the next UI tick.

### Save
- `ver: 9` under the same key `nightfall-defense-save-v1`.
- `MIGRATIONS[8]` rebuilds `stats.waves`, `stats.starUps`, `stats.moonEarned` and `stats.mapKills` from boards, stars and records.
  - It adds empty `ach`, `feats`, `daily`, `chalDone`, `chalBest`, `rp` and `tokens`.
  - Versions 1-7 chain through the earlier migrations first.
- After loading, `checkAch(S, true)` unlocks achievements earned by past progress quietly. One "N achievements unlocked from past progress" banner shows instead of N toasts.
- A challenge in progress is not saved, and the save always holds the main board.

## Balance

### Baseline: achievements off (ACH=0), identical to slice 7

| map | w50 h | w100 h | fingerprint |
| --- | --- | --- | --- |
| moonlit | 1.747 | 6.698 | ac9c5793 |
| woods | 2.287 | 6.812 | 80395fb7 |
| caverns | 2.188 | 7.037 | 16054004 |
| cliffs | 2.06 | 6.14 | 450e839c |
| castle | 2.245 | 6.244 | 3e36c44 |

### First bonus table (too strong)
The first table gave about 1-2% per achievement. The ACH=1 rows pre-seed 26 achievements a 0★ player plausibly has after a first map. The dynamic rows unlock achievements as the bot earns them.

| map | ACH=1 w50 | ACH=1 w100 | dynamic w50 | dynamic w100 |
| --- | --- | --- | --- | --- |
| moonlit | 1.515 | 3.783 | 1.515 | 3.783 |
| woods | 1.372 | 3.038 | 1.958 | 3.977 |
| caverns | 1.276 | 2.679 | 1.802 | 3.418 |
| cliffs | 1.341 | 2.847 | 1.804 | 4.185 |
| castle | 1.242 | 2.69 | 1.656 | 3.858 |

Zeroing every bonus with a preload reproduced the slice-7 fingerprints exactly, so the bonus sizes alone caused the speed-up.

### Retune
- Scale sweeps at ACH=1 (f scales combat bonuses):
  - f=0.5 still gave w100 of 3.7-4.6h;
  - f=0.25 gave moonlit 5.5h;
  - f=0 gave moonlit 6.4h and castle 5.4h.
- Economy bonuses compound through the whole curve, so start and cash bonuses were cut to 1% (0.5% for the two cheapest).
- Combat bonuses became mostly 0.25%, with 0.5% for mid-game feats and 1% only for the max-star and 12-challenge achievements.
- A jitter ensemble on an intermediate table showed the bot's chaotic noise at w100 is about ±0.6h (for example woods 4.34-5.38h from tiny perturbations).

### Final table, ACH=1 (`tools/balance-results.json`)

| map | w50 h | w100 h |
| --- | --- | --- |
| moonlit | 1.606 | 6.044 |
| woods | 2.132 | 4.533 |
| caverns | 1.89 | 4.731 |
| cliffs | 2.037 | 5.599 |
| castle | 1.915 | 5.114 |

- w50 is inside 1.5-2.5h on every map.
- The w100 mean is 5.21h. Woods (4.53) and caverns (4.73) sit just under the 5h target, inside the bot noise band. A real player has fewer achievements on a second map's first push than the pre-seeded set assumes. This was accepted rather than over-fitted to one noisy run.

### Offline sanity (ACH=1), minutes for one hour away at w20/w40/w60/w80/w100

| map | w20 | w40 | w60 | w80 | w100 |
| --- | --- | --- | --- | --- | --- |
| moonlit | 52 | 33 | 85 | 46 | 67 |
| woods | 77 | 56 | 55 | 36 | 48 |
| caverns | 111 | 130 | 101 | 43 | 78 |
| cliffs | 62 | 57 | 63 | 42 | 52 |
| castle | 123 | 80 | 78 | 21 | 52 |

### Challenge winnability (`tools/challenge-results.json`)
The challenge checker plays each run with the balance bot, retrying up to 3 times.

| set | runs | won | won first try |
| --- | --- | --- | --- |
| base bands (no mods) | 12 | 12 | 12 |
| permanent challenges | 12 | 12 | 12 |
| daily, 60 dates | 60 | 60 | 60 |
| every allowed mod pair, every band | 430 | 430 | 428 |

- The two retries were castle 11 short+limit and moonlit 21 unicorns+limit (won on try 3).
- The previous band set, which included cliffs 11 and moonlit 31, won only 416/430 pairs, so those bands were dropped from `DAILY_BANDS`.

## E2E
`tools/e2e.js` has 31 tests plus the root page check (32 results), served from port 8809.

| run | result | notes |
| --- | --- | --- |
| 1 | 26/32 | six failures, listed below |
| 2 | 32/32 | no console errors at 1280 or 390 |

Run 1 failures and fixes:
- Map select: the test's expected start cash ignored the achievement start bonus. The test now passes the profile.
- Star-up: the board reset before `checkAch` ran, so a start bonus unlocked by the star-up was missing from the fresh board. The game now runs `checkAch` before building the new board.
- Plan saved: the "1/3" chip waited for the next UI tick. Saving now refreshes it at once.
- Daily defeat: the test expected a best score above 0 after losing on wave 1. It now checks for a best of 0 or more and that the score is shown.
- Permanent challenge UI and the challenge card at 390px: the card and build bar waited for the next UI tick after the board switch. `enterBoard` now refreshes them at once.

New tests:
- **Daily:** opens the list (12 cards, daily card with 2-3 mods), starts on a sandbox and checks the main board is untouched. It then loses (defeat screen, no Moonstones), tries again, wins (Moonstones paid once, streak 1, best score) and checks the save holds the main board, `ver: 9` and `ch_d1`.
- **Permanent challenge:** unicorns-only is enforced in core and in the build bar, and the card shows name and mods. A win pays 15 Moonstones once, a second win pays nothing, and quitting with X leaves the board alone.
- **Achievement:** the toast shows the bonus text with a sound. Pony damage rises by 1.0075x and rate by 1.0025x. The screen has tabs and progress bars, and the bonus survives a reload.
- **Stats at 390px:** kills by type, playtime, favourites and map records, plus fit checks for the achievements, challenges and in-run challenge card.
- **Migration:** a v8 save migrates to v9 and unlocks achievements from past progress quietly.

## Known issues
- A challenge in progress is not saved. Reloading mid-run drops back to the main board, and a daily attempt counts when it starts.
- The w100 results at ACH=1 have about ±0.6h of bot noise. Woods and caverns land slightly under 5h in the final run.
- The hardest daily bands (cliffs 11+, moonlit 31) were removed to keep every combination winnable. Those wave ranges appear only in permanent challenges.
- Winnability was checked with the balance bot's placement heuristic. A human may find some mod pairs (Small herd with Short sight or Unicorns only) harder or easier than the bot did.
- Secret achievements show as "???" with a generic line until unlocked, with no per-achievement hint.
