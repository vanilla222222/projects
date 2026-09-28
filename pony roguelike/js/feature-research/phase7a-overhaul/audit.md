# Phase 7a Overhaul — Audit

Scaffolding pass for the run-structure expansion: two new main-route floors, two new
C-branch floors, an entirely new D-branch (the Planetarium path), 7 new superbosses, a
175-slot reward-pool backfill, and one pre-existing bug fixed. Enemy/boss rosters for the
new floorKeys are deliberately **not** in this phase (7b-7d); the documented
`resolveGenericEnemy`/`resolveGenericBoss` fallback chain covers them until then, and that
was re-traced rather than assumed (see Verification §9).

---

## Files changed

| File | What changed |
|---|---|
| `js/data/stages.js` | `FLOOR_NAMES` 13→15 entries; `STAGE_LIST` +6 bestiary entries; `C_FLOOR_NAMES` extended to floorNum 10/11; `C_LAST_FLOORNUM` 9→11; `C_FLOOR_KEYS` +`10:'11C'`,`11:'12C'`; new `D_FLOOR_NAMES`/`D_LAST_FLOORNUM`/`D_FLOOR_KEYS`/`D_PALETTES`/`dPaletteFor`; `floorLabelFor`/`floorNameFor`/`floorKeyFor` each gained a D branch; `cPaletteFor` gained a 4th region; new `C_PALETTES.mangroves`, `HOLLOW_CHORUS_PALETTE`, `FINAL_WAVEFORM_PALETTE` |
| `js/game.js` | `descend()` +D diversion, +D terminal block, +floorNum 12/13 hardcoded hops; `isLastFloorOfRun()` +D line, +12/13; `startFloor()` bestiary marking for C/D/linear floors, +D pendingBossType block, C chain extended, main chain +12/13/14, `deepdiver` gate widened to `!this.floorPath`; `onBossDefeated()` `isBonusBossRoom` floorPath fix |
| `js/systems/dungeon.js` | `planetarium` added to `SPECIAL_ROOM_TYPES` + `AUTO_OPEN_ROOM_TYPES`; new `planetariumNode` placement (floorNum 2, main route only); `secondBossNode` floorPath fix; `planetariumNode` added to the return object |
| `js/systems/room.js` | `planetarium` added to `chooseShapeForNode`'s 65/35 shape roll; new `node.type === 'planetarium'` population branch (one `branchSpots` entry, branch `'D'`, label `'4D'`) |
| `js/ui/render.js` | `currentPalette()` +D branch, +floorNum 12/13/14; new `paintPortalTile`, `paintStarfieldTile`, `rebuildPlanetariumTiles`; `rebuildTileLayer` early special case |
| `js/core/theme.js` | `Theme.door.planetarium` |
| `js/main.js` | `showWin()` three-way deed clause (main / C / D) |
| `js/achievements/logic.js` | `statDefaults` += `dBranchFloorsVisited`, `dBranchRunsCompleted` |
| `js/achievements/defs-1.js` | `NEW_CLASS_REWARD_ITEMS` +50, `NEW_CLASS_REWARD_FAMILIARS` +40, `NEW_CLASS_REWARD_STARS` +25 |
| `js/data/enemies/superbosses.js` | +7 superbosses |
| `js/data/trinkets-2.js` | +60 locked trinkets |
| `js/data/items-5.js` | +50 locked items |
| `js/data/familiars-2.js` | +40 locked familiars |
| `js/data/collectibles.js` | +25 locked stars in `STAR_TYPES` |
| `js/systems/stars.js` | +25 real `case` bodies in `applyStarEffect` |
| `js/systems/items-1.js` | 20 new wiring blocks in `recalcPlayerStats` — every one of the 60 trinkets and 50 items has a real stat term |
| `js/data/economy.js` | `ROOM_TYPE_LIST` += `planetarium` (bestiary Rooms tab) |
| `js/ui/ui.js` | `roomTypeColor`/`ROOM_TYPE_ICON`/`ROOM_TYPE_LEGEND` += `planetarium` |
| `js/CODE_REFERENCE.md` | Updated in the same pass — 33 `Phase 7a` annotations across the stages / dungeon / room / render / theme / game / achievements / superbosses / ui sections |

**Not modified** (explicit plan constraint): `buildRoomTiles`, `doorSlotCells` (both
`js/systems/room.js`), `checkDoorTransition` (`js/systems/combat-2.js`). Verified — see §12.

---

## Structural decisions

### Main route — floorNum table

| floorNum | Label | Name | Superboss | Branch split? |
|---|---|---|---|---|
| 11 | Floor 12 | The Shattered Refrain | `nhm` / `vanilladnb` | A/B |
| **12** | **Floor 13** | **The Hollow Chorus** | **`wobbler`** | no — linear |
| **13** | **Floor 14** | **The Final Waveform** | **`subdrop`** | no — linear |
| **14** | **Floor 15** | The One True Descent | `onetruednb` *(unchanged, relocated)* | no |

`MAX_FLOORS` auto-updates to 15 (`FLOOR_NAMES.length`). The two new floors follow the
single-superboss-per-floorNum pattern of floorNum 5/7 (Polish/Tyrone), **not** the A/B-forked
pattern of 8-11, so neither takes a `floorBranch` ternary and neither gets a bonus boss room.

The hand-trace the plan flagged was confirmed real: for floorNum 12 the old fallthrough
computed `next = 13`, and `13 >= maxFloorsThisRun` (max 8) is always true, so without explicit
hardcoded lines the run would have won two floors early. `descend()` now has
`if (floorNum === 12) { startFloor(13); return; }` and the same for 13, inserted after the
existing 8-11 chain and **before** the fallthrough. floorNum 14 deliberately has no line and
falls through to the win check, which is correct and unchanged.

### C-branch — floorNum table

| floorNum | Label | Region | Superboss |
|---|---|---|---|
| 2-3 | 3C/4C | Gutters | — |
| 4-5 | 5C/6C | Sewers | `drenched` (6C) |
| 6-9 | 7C-10C | Rainforest | `brazil` (8C), `israelprime` (9C), **`monsoon` (10C)** |
| **10** | **11C** | **Mangroves** | **`mangrove`** |
| **11** | **12C** | **Mangroves** | `kirk` *(unchanged, relocated from 10C)* |

`C_LAST_FLOORNUM` 9 → 11. As the plan predicted, **no code change was needed** in either
`descend()`'s C terminal check or `isLastFloorOfRun()`'s C line — both already read the
constant. Both lines were re-read to confirm this rather than assumed.

### D-branch — floorNum table (all new)

Gate: `planetarium` room, floorNum 2 (HUD Floor 3), placed unconditionally on that floor and
only on the main route. Mirrors `cpathgate` one floor lower.

| floorNum | Label | Region | Superboss |
|---|---|---|---|
| 3-4 | 4D/5D | The Observatory | `astrolabe` (5D) |
| 5-6 | 6D/7D | The Orrery | `orrery` (7D) |
| 7-9 | 8D/9D/10D | The Void Between | `singularity` (10D — finale) |

`D_LAST_FLOORNUM = 9`. One superboss at the end of each region, matching the plan.
`dBranchRunsCompleted` bumped from the single win branch; `dBranchFloorsVisited` added
alongside it to complete the mirror of the two C counters (see Deviations).

### The 7 new superbosses

All reuse an existing `bossXxx` AI — no new AI code. Where two share a region they are paired
as one glass cannon / one siege body, matching the A/B-pair discipline.

| id | Name | Icon | Floor | hp / dmg / spd / radius | Reused AI | Calibrated against |
|---|---|---|---|---|---|---|
| `wobbler` | WobblerDNB | 〰️ | Floor 13 | 73/4/94/27 | `bossEclipseWraith` | 12A/12B pair (70) → onetruednb (76) |
| `subdrop` | SubdropDNB | 🔻 | Floor 14 | 75/4/58/35 | `bossIronBastion` | same span, one step higher (`burstRadius:100`) |
| `monsoon` | Monsoon DNB | 🌀 | 10C | 74/4/90/28 | `bossBlizzardWraith` | israelprime (72) → kirk (78) |
| `mangrove` | Mangrove DNB | 🌿 | 11C | 76/4/64/34 | `bossVineHorror` | same span, one step higher |
| `astrolabe` | Astrolabe DNB | 🧭 | 5D | 63/3/88/27 | `bossGlassScorpion` | polish (60, floorNum 5) |
| `orrery` | Orrery DNB | 🪐 | 7D | 70/4/60/34 | `bossBrickGolem` | tyrone (62, floorNum 7), a siege body so heavier |
| `singularity` | The Singularity | 🌌 | 10D | 79/4/80/35 | `bossSlagbound` | kirk (78) / onetruednb (76) — a genuine finale |

`hp` is identity-scale, not absolute: `bossHpScale` is `1.28^floorNum`, so authoring
"floor-sized" numbers would scale twice — every value above is authored against the existing
superbosses at a comparable *relative* position. `dmg` caps at 4 half-hearts because
`playerDamageAmount` adds its own +1 past the Inferno. All 7 behaviors were verified to have a
live `case` in `combat-3.js`'s dispatch (Verification §3).

### Planetarium visual treatment

- `Theme.door.planetarium` = `{open:'#6a5ce0', locked:'#2e2870'}`.
- `rebuildTileLayer` gets an early `node.type === 'planetarium'` special case that delegates to
  a new `rebuildPlanetariumTiles(node, pal, ctx)` and returns, leaving the normal path
  completely untouched. The three staleness-bookkeeping fields are still set, since `drawTiles`
  reads them for every room alike.
- **Walls/void → starfield.** `T_WALL`/`T_SECRET`/`T_VOID` all paint `paintStarfieldTile`: a
  depth-tinted `pal.voidC` fill plus 0-3 stars, radius/alpha from a per-star "magnitude", the
  brightest few picking up `pal.accent` and a faint halo. Placement is deterministic off
  `tileRand(x, y, salt)` — the same helper the stone/floor texture uses — so the sky stays put
  across rebakes instead of resampling every time a door unlocks.
- **Floor tiles still render.** Same checkerboard, but lifted and rim-lit on every edge facing
  open sky rather than receiving the usual sunken ambient occlusion. Purely a paint change:
  `node.tiles` is read exactly as-is.
- **Doors → portals.** New `paintPortalTile(ctx, px, py, color)`: radial-gradient core, bright
  inner ring, dark outer keyline. Applied to both `T_DOOR` tiles and the special-room door
  slots; slots keep the *destination room type's* colour so the signposting survives.
- **Baked static, not live-overlaid** — chosen deliberately. The tile cache is the entire
  reason room tiles cost nothing per frame; an animated door would have to either dirty
  `node._tileCanvas` every frame or add a second per-frame pass over every door cell, and
  neither is worth it for a room the player crosses once. Hence `paintPortalTile` takes no
  `now` parameter.
- `node.type === 'planetarium'` is used directly as the renderer's key — no extra flag is set
  in `room.js` — so there is exactly one source of truth for "is this the star room".

### The pre-existing bonus-boss-room bug

`dungeon.js`'s `secondBossNode` and `game.js`'s `isBonusBossRoom` both tested
`floorNum === 8 || 9 || 10 || 11` with **no `floorPath` guard**. On the C-branch, floorNum 8/9
are 9C/10C and incidentally satisfied it, generating a bonus boss room that path was never
meant to have — and this phase's new C floors (11C/12C at floorNum 10/11) plus the whole
D-branch (floorNum 3-9) would have widened the collision considerably.

Both now read `!currentFloorPath() && (...)` / `!this.floorPath && (...)` respectively —
identical in shape, as required, and matching what the surrounding comments already claimed the
mechanic was. `currentFloorPath()` (room.js) was already in use in `dungeon.js` for exactly
this kind of check, so no new plumbing was needed.

### Reward pool composition — 175 new slots

`SUPERBOSSES` 15 → 22, `CLASSES` unchanged at 25, so `SUPERBOSS_REWARDS` must be
`22 × 25 = 550` (was 375). Deliberately mixed per the explicit instruction — not a trinket dump:

| Kind | Count | Where |
|---|---|---|
| Locked trinkets | 60 | `data/trinkets-2.js` (join the pool automatically via the `TRINKET_LIST` filter) |
| Locked items | 50 | `data/items-5.js`, `POOLS_ALL`, named in `NEW_CLASS_REWARD_ITEMS` |
| Locked familiars | 40 | `data/familiars-2.js`, named in `NEW_CLASS_REWARD_FAMILIARS` |
| Locked stars | 25 | `data/collectibles.js`, named in `NEW_CLASS_REWARD_STARS` |
| **Total** | **175** | |

- **Trinkets** spread across 12 stat channels (luck, speed, damage, crit, dodge, magnet radius,
  boss damage, lifesteal, fire rate, bomb radius, the six on-hit statuses, shop discount + crit
  multiplier). Every one is `locked:true`, has no `donationReward`/`pendingReward`, and has a
  real `(t === 'id' ? n : 0)` term in `recalcPlayerStats` — all 60 verified individually.
- **Items** across 11 channels with real quality tiers (1-3) calibrated against the comparable
  existing entries in `items-5.js` per channel. All wired as `n * (p.id || 0)` terms.
- **Familiars** reuse the existing behaviors only — orbiter (6), shooter (7), proc (7), blocker
  (3), thief (3), grower (3), detonator (3), mirror (2), scavenger (2), berserker (2), swarmer
  (2). Field schemas were read off the live entries per behavior rather than guessed (this
  caught an early draft that invented `maxShields`-less blockers and `stealChance`-less
  thieves).
- **Stars** each drive a genuinely new `case` in `applyStarEffect`, built from primitives that
  already existed in `stars.js`: room-wide poison/stun/Vulnerable/charm via
  `applyRoomWideStatus`; a percentage HP cut (`Shaula`); a *strongest*-enemy execute mirroring
  Rigel's weakest (`Algol`); an exhaustive pedestal reroll (`Algenib`); a two-pedestal spawn
  (`Ascella`); combined effects (`Kaus Australis` = sear + knockback nova, `Menkar` = bombs +
  destroy-all-obstacles, `Enif` = reveal + keys, `Zosma` = championize + Vulnerable); and one
  deliberate all-in cost/benefit (`Alphard`: +12 damage for the room, but you drop to 1 red
  heart) — the only star in the game that charges you something.

---

## Verification results

All checks below were run through a Node harness that concatenates the **exact** script list
from `index.html` (63 files, in order) and evaluates it against stubbed
`document`/`window`/`localStorage`/`AudioContext`. **51/51 automated checks pass, 0 fail.**

| # | Check | Result |
|---|---|---|
| 1 | `node --check` on every touched file | **PASS** |
| 2 | `node --check` sweep across **all** of `js/**/*.js` (63 files) | **PASS** — 0 failures |
| 3 | Full bundle loads under Node with zero errors and zero `console.warn` from the reward-pool assertion | **PASS** |
| 4 | `SUPERBOSS_REWARDS.length === 550 === 22 × 25`, evaluated against the real data | **PASS** |
| 5 | Every reward-pool entry unique (no modulo reuse) | **PASS** — 0 dupes |
| 6 | Every reward id resolves to a real `TRINKETS`/`ITEMS`/`FAMILIAR_TYPES`/`STAR_TYPES` entry | **PASS** |
| 7 | No duplicate or key/id-mismatched ids in any of the five tables | **PASS** |
| 8 | All 7 superbosses well-formed; every `behavior` has a live `case` in `combat-3.js` | **PASS** |
| 9 | `resolveGenericBoss`/`resolveGenericEnemy` re-traced and exercised on every new (still-empty) floorKey — `11C`, `12C`, `4D`-`10D`, `13`, `14`, `15` | **PASS** — falls through floorKey pool → stage pool → any unlocked, exactly as documented |
| 10 | 60 trinkets: exist, `locked:true`, no `donationReward`/`pendingReward`, wired into `recalcPlayerStats`, present in the pool | **PASS** (all four sub-checks) |
| 11 | 50 items / 40 familiars / 25 stars: exist, locked, wired (items → stat terms, familiars → existing behavior, stars → real `applyStarEffect` case), present in the pool | **PASS** |
| 12 | `buildRoomTiles`, `doorSlotCells`, `checkDoorTransition` unmodified | **PASS** — first two byte-identical to backup; `combat-2.js` (which owns `checkDoorTransition`) byte-identical as a whole file |
| 13 | `generateDungeon` × 12 iterations for **every** new/changed floorNum on **every** path — main 0-14, C 2-11, D 3-9 | **PASS** — 0 exceptions |
| 14 | Bonus boss room appears **only** on main-route floorNum 8-11 | **PASS** — C-branch 8-11 and D-branch 3-9 no longer satisfy it |
| 15 | Planetarium gate appears **only** on main-route floorNum 2 | **PASS** |
| 16 | Planetarium room populates one `{branch:'D', label:'4D'}` branchSpot and spawns 0 enemies | **PASS** |
| 17 | `planetarium` membership in `SPECIAL_ROOM_TYPES` + `AUTO_OPEN_ROOM_TYPES` matches `cpathgate`'s exactly | **PASS** (cpathgate is in both; planetarium now is too) |
| 18 | `floorLabelFor`/`floorNameFor`/`floorKeyFor` return sensible non-null values for every new floorNum × path | **PASS** — main 12/13/14, C 2-11, D 3-9 |
| 19 | A complete 8-key palette object resolves for every floorNum × path combination (main 0-14 × A/B, C 2-11, D 3-9) | **PASS** |
| 20 | All 3 D palettes use the deliberate non-black starfield `voidC` | **PASS** |
| 21 | `dBranchRunsCompleted` / `dBranchFloorsVisited` present in `statDefaults` via `ensureUnlockShape` | **PASS** |
| 22 | `recordWin` re-read and confirmed floorPath-agnostic | **PASS** — no change needed |

### Hand-traced descent sequences

Executed against the real `Game.prototype.descend` / `isLastFloorOfRun` with a stubbed
`startFloor` recording each hop.

| Path | `descend()` hops | Ends in win? | `isLastFloorOfRun()` per hop | Agrees? |
|---|---|---|---|---|
| Main (branch A, `maxFloorsThisRun` 8) | 11 → 12 → 13 → 14 → **win** | yes | `false, false, false, true` | **yes** |
| C-branch | 8 → 9 → 10 → 11 → **win** | yes | `false, false, false, true` | **yes** |
| D-branch | 3 → 4 → 5 → 6 → 7 → 8 → 9 → **win** | yes | `false ×6, true` | **yes** |

Both diversions were traced separately: `descend('C')` sets `floorPath='C'` and lands on
floorNum 2; `descend('D')` sets `floorPath='D'` and lands on floorNum 3.

### Hand-traced `pendingBossType`

`startFloor` run directly for all 12 scripted floors, checking the resolved boss id:

`polish`@5, `tyrone`@7, **`wobbler`@12**, **`subdrop`@13**, **`onetruednb`@14** (main) ·
`drenched`@5C, **`monsoon`@9C**, **`mangrove`@10C**, **`kirk`@11C** (C) ·
**`astrolabe`@4D**, **`orrery`@6D**, **`singularity`@9D** (D) — **all correct**.

Confirmed there is no leftover conflicting `floorNum === 12` branch: the old `onetruednb` line
was *changed* to `floorNum === 14`, not duplicated.

### Not done, per instruction

No browser run, no heavy playtest. The user playtests by playing; the mechanical verification
above was treated as mandatory and is complete.

---

## Deviations from plan

1. **C-branch palette region covers floorNum 10-11, not 9-11.** The plan recommended a new
   region for floorNum 9-11. floorNum 9's name is `Rainforest — The Storm Canopy`, so giving it
   a Mangroves palette would have desynced name from look. `cPaletteFor` is now
   `≤3 gutters, ≤5 sewers, ≤9 rainforest, else mangroves`. The plan explicitly left the region
   choice open ("your choice"); this keeps names and palettes consistent.

2. **Added two palettes for the new main-route floors 13/14.** Not in the plan, but required
   for correctness of intent: `currentPalette()` would otherwise fall through to
   `STAGES[stageIndexForFloor(12)]`, and `stageIndexForFloor` clamps to the last stage — both
   brand-new floors would have silently rendered in the Inferno's palette. Added
   `HOLLOW_CHORUS_PALETTE` / `FINAL_WAVEFORM_PALETTE` as flat objects (same shape as
   `FINAL_PALETTE`, which is the established convention for a linear late floor).

3. **Added `dBranchFloorsVisited` alongside `dBranchRunsCompleted`.** The plan named only
   `dBranchRunsCompleted`. The C-branch has a matched *pair* of counters and the plan repeatedly
   asks the D-branch to be an exact mirror of it; a lone runs counter would have left the mirror
   incomplete and made the future D-branch exploration ladder (7e-7h) need a schema change.
   Bumped from the same place its C twin is — `startFloor`'s path block.

4. **Widened `deepdiver`'s guard from `floorPath !== 'C'` to `!this.floorPath`.** Not called out
   in the plan, but the existing line's own comment states the intent ("floorNum 8 there is 9C,
   not floor 9 of the normal descent") and the D-branch introduces exactly the same collision at
   floorNum 8 (9D). Leaving it would have handed out a main-route depth achievement on the D
   path.

5. **Added `planetarium` to the four room-type metadata lookups** (`data/economy.js`'s
   `ROOM_TYPE_LIST`, and `ui.js`'s `roomTypeColor`/`ROOM_TYPE_ICON`/`ROOM_TYPE_LEGEND`). Not in
   the plan, but `cpathgate` is in all four and a missing entry means a grey unlabelled blob on
   the minimap and a hole in the bestiary's Rooms tab. Phase 6a's audit records the identical
   fix being needed for `shrine`/`arcade`, so this is following established precedent rather
   than inventing scope.

6. **Bestiary stage id `'13'` now names the new floor-13 stage.** The finale moved to floor 15,
   so `STAGE_LIST` gained `'14'` and `'15'` and the existing `'13'` entry was retitled from
   "The One True Descent" to "The Hollow Chorus". The alternative — keeping `'13'` pointing at
   the finale and numbering the new stages oddly — would have left the ids permanently
   misaligned with the floors they name. Practical cost is nil: a save that had seen the old
   floor 13 now shows the new floor 13 as seen.

7. **Familiar counts per behavior differ slightly from an even split.** 40 familiars across 11
   behaviors doesn't divide evenly; the distribution (6/7/7/3/3/3/3/2/2/2/2) weights the
   behaviors with the most existing tuning surface. No behavioral code was added.

Nothing else deviates. The floorNum/label relationships were implemented exactly as specified
and then re-derived independently by the harness in Verification §13-19 and the descent traces.
