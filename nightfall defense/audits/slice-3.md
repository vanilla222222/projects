# Slice 3 audit: bat and crystal ponies, rebalance

## What shipped

### Bat Pony (hotkey 4)
- **Role:** night hunter.
- **Base stats:** cost 80, range 145, damage 7, rate 1.6.
- **Echo Fang:** quick sonic bites that can target flyers and deal +50% damage to fast or sprinting DNBs. It cannot harm magical DNBs.
- **Paths** (10 nodes each), with their signatures:

  | path | signature | effect |
  | --- | --- | --- |
  | Nightstalker | Midnight Feast | Fast DNBs take triple damage and are slowed by bites. |
  | Echolocation | Deep Echo | A sonar pulse reveals DNBs within twice the range for 4s: any pony can hit them and they take +20%. The bat also bites burrowed DNBs. |
  | Colony | Swarm Night | Releases 8 seeking swarm bats every 7s. |
  | Crimson Fang | Blood Moon | Every bite crits and hits every valid target for 5s. |
  | Night Terror | Dread Screech | An area stun plus a +25% damage-taken hex. |

- **Stealth hook:** Echolocation node 1 sets `s.detects` and node 5 sets `s.detectR`. `isHidden(e)` and `canTarget` already respect `detects`. Slice 4 only has to set the hidden flag on enemies.

### Crystal Pony (hotkey 5)
- **Role:** gem support.
- **Base stats:** cost 110, range 130, damage 7, rate 0.8.
- **Heartglow aura:** +4% damage and +2% rate to ponies within its range. It fires shards at ground DNBs and cannot see flyers or harm magical DNBs.
- **Light on Crystal Caverns:** it is a light source (`lightR` 110, raised by Lumen). Ponies in its glow escape the 65% darkness range penalty. `lightSources(S)` feeds both the core and the render overlay.
- **Paths** (10 nodes each), with their signatures:

  | path | signature | effect |
  | --- | --- | --- |
  | Resonance | Harmonic Chorus | A periodic +25% attack-speed surge for the aura. |
  | Crystal Wall | Prism Fortress | A wall segment on the nearest path point slows ground DNBs. It pulses 6x damage plus a stun. |
  | Spellshard | Dispel Prism | Shards can hit magical DNBs and strip their magic so any pony can hit them. |
  | Lumen | Dawnstone | Bigger light, more range for the aura, and the whole aura detects stealth. |
  | Geode Burst | Crystal Cataclysm | A periodic 15x eruption with an encase. |

### Shared rules for both races
- Pick-2 path limit.
- Infinite Damage and Rate upgrades.
- Cost x1.5 per copy (`towerGrowth`).
- Tooltips, the stat panel, node preview lines (including "Detects stealthy DNBs"), shop buttons in a 5-column grid that fits 390px, and info tags.
- Procedural body art, projectiles (sonic arcs, crystal shards), effects (sonar rings, wall, light pools, swarm bats, eruptions) and sounds.

### Save
- `ver: 4`, under the same key `nightfall-defense-save-v1`.
- v1, v2 and v3 saves migrate. Towers keep paths with 5 entries.
- The e2e suite covers the v1 to v4 and v2 to v4 migrations.

## Economy and price redesign
- **Per-map prices.** Each map has a `priceMul` (woods 1.9e3, caverns 1.44e7, cliffs 1.09e11, castle 8.3e14). Tower base cost, node costs and the infinite upgrades all scale by `t.pm`.
  - In price units, every map now starts with about the same buying power as moonlit at the equivalent point. That makes the first purchases on a new map meaningful instead of trivial.
- **Fair Castle start.** Castle no longer takes early losses: 0 losses through wave 10, and the first decade takes 0.18h.
- **Crystal nerf.** Multiple crystal auras stack with diminishing weight: the strongest counts fully, then each further aura counts at 0.3x of the one before (`stackBuff`). Base aura values are +4% damage and +2% rate. Before this, ten crystals turned every pony into a multiplier engine and trivialised the late game.
- **Favicon.** The game page has `<link rel="icon" href="data:,">`, so it makes no favicon request. The migration tests now seed saves with `addInitScript` instead of visiting the root page, which has no icon link and produced a stray 404 in the console watcher.

## HP curve changes
- **Moonlit `TUNE.hpCurve`:**
  ```
  [[1,1.25],[10,1.21],[20,1.2],[30,1.185],[35,1.16],[45,1.17],[50,1.15],[55,1.105],[60,1.1],[80,1.085],[100,1.05]]
  ```
- **Maps 2–5:** each has its own `hpCurve` plus an `hpShift` of 14–17, with `hpMul` 1. Growth tapers to about 1.03–1.05 per wave near 100, so the last decades climb steadily instead of hitting a wall.
- **Lich Regent:** the castle wave-90 boss's `hpMul` went from 0.2 to 0.12.
- **Fingerprints:**
  - The core with neutral tuning keeps `7f2e7f8d` (slice-2 baseline).
  - The new bot with five races gives moonlit `8d06900c`, woods `816433f6`, caverns `757f7cd6`, cliffs `ccfaab74` and castle `12f9ce47`.

## Balance (`node tools/balance.js`, bot buys all five races)

| map | wave 50 | wave 100 | reached | losses by wave |
| --- | --- | --- | --- | --- |
| Moonlit Road | 1.32h | 6.47h | 100 | 34x1 37x1 38x1 39x1 41x6 44x1 86x5 90x5 100x45 |
| Whispering Woods | 2.03h | 5.59h | 100 | 23x1 27x3 34x2 39x1 100x10 |
| Crystal Caverns | 2.36h | 5.83h | 100 | 12x3 16x5 17x3 19x4 26x9 33x4 36x1 37x1 68x1 76x7 92x19 |
| Stormy Cliffs | 2.13h | 4.93h | 100 | 18x1 23x1 26x1 27x2 34x2 36x2 90x2 100x6 |
| Castle of Shadows | 1.71h | 5.49h | 100 | 15x1 18x1 19x2 26x3 36x1 76x1 90x25 |

Decade hours:

| map | 1-10 | 11-20 | 21-30 | 31-40 | 41-50 | 51-60 | 61-70 | 71-80 | 81-90 | 91-100 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| moonlit | 0.09 | 0.10 | 0.13 | 0.40 | 0.61 | 0.15 | 0.17 | 0.19 | 1.06 | 3.58 |
| woods | 0.17 | 0.28 | 0.73 | 0.66 | 0.18 | 0.21 | 0.30 | 0.40 | 0.44 | 2.21 |
| caverns | 0.09 | 0.90 | 0.70 | 0.55 | 0.12 | 0.14 | 0.28 | 0.82 | 0.23 | 1.99 |
| cliffs | 0.16 | 0.34 | 0.72 | 0.69 | 0.21 | 0.23 | 0.29 | 0.36 | 0.68 | 1.24 |
| castle | 0.18 | 0.53 | 0.49 | 0.33 | 0.18 | 0.20 | 0.26 | 0.41 | 2.69 | 0.23 |

- **Bot behaviour.**
  - It follows per-race plans.
  - It places crystals beside clusters of damage dealers.
  - It buys races by share (earth 0.3, unicorn 0.3, pegasus 0.15, bat 0.15, crystal 0.1), with bats on Nightstalker plus Crimson Fang and crystals on Resonance plus Lumen.
  - `BOT_RACES` can restrict the races it uses.
- **Tuning env vars:** `DIAG=<wave>`, `MAP`, `MAPS`, `LIMIT_H`, `TUNE` and `MAPTUNE`.

## E2E (`node tools/e2e.js`)
All 12 tests pass:
- place/upgrade/win with every race;
- lose/reset;
- speed/pause;
- hotkeys;
- **bat and crystal:** hotkeys 4/5, shop at 390px, rising copy cost, node and infinite purchases, crystal aura buffing a neighbour, the bat hitting flyers that an earth pony cannot, and stealth `detects` hook assertions;
- boss UI;
- settings;
- v1 and v2 migrations;
- map select at phone width;
- every map plays;
- the root page.

## Known issues
- **Castle wave 90.** The wave-90 boss wave (Lich Regent) is still the hardest single wave: 25 bot losses and 2.7h for that decade.
- **Moonlit wave 100.** The final wave on moonlit costs 45 losses. It is a deliberate boss spike but steep.
- **Fast mid-game.** Waves 41–90 on maps 2–5 sit close to the game-time floor of about 0.15–0.3h per decade, so the mid-game goes fast and the spikes carry the time.
- **HP is not price-scaled.** Damage is not price-scaled, so HP on maps 2–5 is moonlit-scale (wave-1 HP about 2e2–4e2). Map difficulty comes from curves, bosses and features, and the price multiplier handles the cash side. The slice-2 numbers that grew across maps are gone.
- **Stealth is only a hook.** No enemy is hidden yet, so the reveal paths only matter against burrowing bosses until slice 4.
- **Bot path coverage.** The balance bot does not use the Crystal Wall, Spellshard or Geode paths, so those are tested only by e2e and hand play.
