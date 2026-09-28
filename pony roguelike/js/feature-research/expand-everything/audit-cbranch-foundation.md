# Audit — C-branch foundation (3C–10C alternate path)

## Files changed

| File | What changed |
|---|---|
| `js/data.js` | +52 new `locked:true` trinkets (C-BRANCH BATCH, appended to `TRINKETS`); 28 existing `ITEMS` entries flipped from unlocked to `locked:true` |
| `js/achievements.js` | `NEW_CLASS_REWARD_ITEMS` grown 4 → 34; section-2 header comment re-derived for the 300-slot grid |
| `js/items.js` | `recalcPlayerStats` — all 52 new trinkets wired into existing additive stat sums (no new effect hooks) |
| `js/enemies.js` | +4 `SUPERBOSSES` entries (`drenched`, `brazil`, `israelprime`, `kirk`); stale "pool not resized yet" NOTE replaced |
| `js/stages.js` | `C_FLOOR_NAMES`, `C_LAST_FLOORNUM`, `floorLabelFor`, `floorNameFor`, `C_FLOOR_KEYS`, `floorKeyFor` 3rd arg, `C_PALETTES` (3 palettes) + `cPaletteFor` |
| `js/render.js` | `currentPalette()` — C-branch check placed first |
| `js/dungeon.js` | `'cpathgate'` added to `SPECIAL_ROOM_TYPES` + `AUTO_OPEN_ROOM_TYPES`; `cpathgateNode = floorNum === 1 ? attachSpecial('cpathgate') : null`; returned on the dungeon |
| `js/room.js` | `chooseShapeForNode` small-room list += `cpathgate`; `populateRoomProcedural` `cpathgate` case (one `branchSpots` entry, branch `'C'`); `currentFloorPath()` helper; `resolveGenericEnemy`/`resolveGenericBoss` take an optional 3rd `floorPath` arg |
| `js/game.js` | `ROOM_LABELS.cpathgate`; `this.floorPath = null` in `startRun`; C-branch `pendingBossType` block; `deepdiver` gated off the C path; `descend()` `branch === 'C'` entry + C-path progression/win block; `isLastFloorOfRun()` C branch |
| `js/ui.js` | HUD floor readout uses `floorLabelFor`/`floorNameFor`; `cpathgate` minimap icon, legend entry and colour |
| `js/main.js` | Death/win summaries use `floorLabelFor`/`floorNameFor`; win text says "silenced Kirk DNB" on a C run |

`node --check` passes on **every** file in `js/` (full sweep run at the end, and after each step).

## C-path trace (verified by sandbox evaluation, not by eye)

Entry: floor 2 (`floorNum === 1`) always generates a `cpathgate` room. Its single
`branchSpots` entry calls `descend('C')` → `floorPath = 'C'`, `startFloor(2)`.

| Label | floorNum | Theme / palette | Superboss | `floorKeyFor(f, null, 'C')` | Display name |
|---|---|---|---|---|---|
| 3C | 2 | Gutters | — | `3C` | Gutters — Overflow Channels |
| 4C | 3 | Gutters | — | `4C` | Gutters — The Silt Run |
| 5C | 4 | Sewers | — | `5C` | Sewers — Effluent Mains |
| 6C | 5 | Sewers | **Drenched DNB** | `6C` | Sewers — The Drowned Mix |
| 7C | 6 | Rainforest | — | `7C` | Rainforest — Canopy Floor |
| 8C | 7 | Rainforest | **Brazil DNB** | `8C` | Rainforest — Emerald Deep |
| 9C | 8 | Rainforest | **Israel DNB Prime** | `9C` | Rainforest — The Prime Grove |
| 10C | 9 | Rainforest | **Kirk DNB** | `10C` | Rainforest — Kirk's Last Set |

Ending: Kirk DNB dies → `onBossDefeated` grants the normal boss stairs (its room
IS `dungeon.bossNode`, so `isBonusBossRoom` is false) → `checkStairs` → `descend()`
with no branch → the `floorPath === 'C'` block sees `floorNum >= C_LAST_FLOORNUM (9)`
→ `this.state = 'win'; endRunUnlocks();`. `isLastFloorOfRun()` returns true there,
so the pit already reads **ESCAPE** rather than **DOWN**.

### Collision check against a normal run

`floorKeyFor(2..9, null, null)` returns `null, null, null, null, null, null, '9A', '10A'` —
i.e. byte-identical to before this change. The C mapping is only reachable when
`floorPath === 'C'`, and every floorNum-sensitive branch checks that flag **first**:

- `descend()` — C block precedes the floorNum 8/9/10/11 chain and always returns.
- `startFloor()`'s `pendingBossType` chain — C block is the leading `if`, the whole
  normal chain is now its `else`.
- `isLastFloorOfRun()` — C branch first.
- `currentPalette()` — C branch first.
- `floorKeyFor()` — C branch first, and returns `null` (never falls through) for any
  floorNum outside 2–9.
- `unlockAchievement('deepdiver')` at `floorNum === 8` — explicitly excluded on the
  C path, since floorNum 8 there is 9C, not the normal floor 9.
- HUD/summary floor text — `floorLabelFor`/`floorNameFor` both take `floorPath`.

`floorBranch` is never written on a C run, so the A/B ternaries in the normal chain
are unreachable rather than merely inert.

**Deliberately left shared:** `dungeon.js`'s `secondBossNode` and `game.js`'s
`isBonusBossRoom` both fire on floorNum 8/9/10/11 regardless of path, so 9C and 10C
each also get a bonus (non-superboss) boss room. The two conditions stay in lockstep
with each other, so this is consistent rather than broken, and reads as a fair perk
on the two deepest C floors. Flagging it as a conscious non-change.

### Enemy/boss pools

`resolveGenericEnemy`/`resolveGenericBoss` now pass `floorPath` into `floorKeyFor`.
Rather than thread a 3rd argument through all ~8 call sites (every one of which is
inside a live run), `currentFloorPath()` reads `game.floorPath` by default, with a
`typeof game !== 'undefined'` guard so the standalone room editor is unaffected. An
explicit argument still wins where one is passed (`startFloor` passes `'C'`).

No `'3C'`–`'10C'`-tagged `ENEMY_TYPES`/`BOSS_TYPES` exist yet (out of scope, later
dispatch), so `floorKey` pools come back empty and both resolvers fall through to
their normal stage pool. That is the pre-existing, already-exercised fallback path.

## Reward-pool arithmetic proof

`SUPERBOSS_REWARDS` is `TRINKET_LIST.filter(t => t.locked && !t.donationReward)`
+ `ACHIEVEMENT_PICKUP_KINDS` + `NEW_CLASS_REWARD_ITEMS` + `NEW_CLASS_REWARD_FAMILIARS`
+ `NEW_CLASS_REWARD_STARS`.

```
trinkets   125 (before)  + 52 (C-BRANCH BATCH, all locked, none donationReward) = 177
pickups      7 (untouched)                                                      =   7
items        4 (before)  + 28 (flipped locked:true in data.js)                  =  34
familiars   72 (untouched — already fully tapped)                               =  72
stars       12 (untouched — already fully tapped)                               =  12
                                                                          total = 300

grid = Object.keys(SUPERBOSSES).length x Object.keys(CLASSES).length
     = 15 x 20
     = 300
```

Measured, not assumed — a sandbox load of `theme/utils/audio/data/enemies/stages/achievements`
reports `pool 300`, `grid 300`, `SUPERBOSSES 15`, `CLASSES 20`, and **300 unique**
reward objects (no repeats). `achievements.js`'s own count-mismatch `console.warn`
does not fire, where it did fire mid-edit at 220 vs 300 — so the check is live and
genuinely satisfied.

52 + 28 = 80 = the 4 new superbosses x 20 classes. The split landed at 52/28 rather
than the spec's nominal 50/30 because the trinket half was authored around the
existing stat sums in `items.js` and came out at 52; the item half was then sized to
close the gap exactly.

### Item reclassification — gating verified before flipping

`isItemUnlocked(id)` is exactly `!!currentUnlocks().unlockedItems[id]`, and
`unlockAchievement` writes `unlocks.unlockedItems[def.itemId] = true` for **any**
achievement def carrying an `itemId` — there is no `TIER_REWARD_KEYS`-specific or
secondary gate. The original four (`dragonfirecore`/`frostboundcloak`/
`tidecallersscale`/`gustwovenveil`) are therefore unlocked solely by their superboss-grid
achievement, and the 28 new ones behave identically: obtainable only via the grid,
matching precedent. The only consumer of `locked` on an item is `room.js`'s
`!i.locked || isItemUnlocked(i.id)` pool filter.

All 28 were screened to be **not already referenced by any `itemId:` in
achievements.js**, so no reward is duplicated and the grid's one-to-one invariant
holds (confirmed by the 300-unique count above). The 28:

`polishedcloak, gildedseal, roaringrune, forgottenemblem, voidwhisper, velvetcirclet,
feraltalisman, rustedcharm, jadequill, frostedbell, runicgauntlet, shadowring,
sapphirelocket, gildedring, vividcompass, quietorb, goldenboots, sacredtoken,
forgottenrune, blessedbell, ambershard, sacredsash, goldenmedallion, amberfragment,
hollowwhistle, goldengauntlet, sunkenglove, wildcloak`

They were picked from the strong/flavourful mid-band (boss damage, crit, luck, coin
value, lifesteal, bomb radius, pierce, speed, fire rate). The trivial baseline items
(`ironshoes`, `damageup`, `luckup`, `hpup`, plain "+1 damage" reskins) were
deliberately left unlocked.

## Deviations from the spec, and why

1. **Trinket effects were wired into `items.js`, which the spec did not ask for.**
   The spec said the 52 trinkets join the reward pool "with zero other code changes",
   which is true of the *pool*. But every trinket carries a `desc` promising an
   effect, and trinket effects in this codebase are hardcoded `t === 'id'` terms in
   `recalcPlayerStats` — 52 silently-inert trinkets would be 52 duds. Each new
   trinket was therefore designed to land in a sum that already exists, and added as
   one term to that sum, following the "reskins that fold into an existing additive
   sum" precedent stated in `data.js`'s own batch comment. No new stat, hook or cap
   was introduced.

2. **The C palettes are flat objects, not `{A, B}` pairs.** The spec described them
   as "palette-pair objects following the exact `BRANCH_PALETTES` shape". There is no
   A/B split on the C path (`floorBranch` is never set), so an A/B pair would be dead
   structure. They follow `FINAL_PALETTE`'s flat shape instead — same field set,
   same source file, selected through `cPaletteFor(floorNum)`.

3. **52/28 rather than 50/30.** See the arithmetic above; the total is what is
   load-bearing and it is exactly 300.

4. **`resolveGenericEnemy`/`resolveGenericBoss` read `game.floorPath` by default
   instead of taking a threaded argument at all ~8 call sites.** Minimal diff, and it
   cannot desync from the run's actual state. An explicit 3rd argument still overrides.

5. **Win-screen text was touched.** The spec said to fix it only if hardcoded to the
   normal finale — it was ("banished the DNBs"). Two one-line ternaries now read
   "silenced Kirk DNB" on a C run, in `showWin` and `buildRunSummary`.

6. **`ui.js`/`main.js` were edited** though not named in the spec: `FLOOR_NAMES` is
   indexed by raw floorNum at three call sites, which on a C run would have shown
   "Floor 7 — The Inferno" on 8C. Those three sites now go through the new
   `floorLabelFor`/`floorNameFor` helpers.

## Explicitly not done (out of scope, per the spec)

`'3C'`–`'10C'` `ENEMY_TYPES`/`BOSS_TYPES` entries; `slayer_*` achievements; any new
AI in `js/ai.js` (all four new superbosses reuse existing `bossXxx` routines —
`bossStormbringer`, `bossCanopyStalker`, `bossIsrael`, `bossOneTrueDnb`); `js/pills.js`;
the star-room / HUD-panel / shop-depth / class-attack work from earlier dispatches.
