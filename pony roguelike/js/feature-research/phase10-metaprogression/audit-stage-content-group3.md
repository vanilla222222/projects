# Phase 10 — stage content GROUP 3 (audit)

Stages 10-13 of the extended main route: Trench Depths, Deep Dark, Meta Realm and
Hyperspace — floorNum 27-34, the hardest tier in the game, ending on
`MAIN_ROUTE_FINAL_FLOOR` (34, "Hyperspace — The Last Exit").

Authored: **60 trash enemies, 16 regular bosses, 4 superbosses, 8 floor-feature rooms,
7 new obstacle kinds, 80 bespoke AI functions.** Every placeholder this group owned was
deleted, not extended.

## Files changed

| File | Change |
| --- | --- |
| `js/systems/ai-stage10-13.js` | **new** — all 80 behavior bodies + 8 shared helpers, published into `ENEMY_BEHAVIOR_HANDLERS` |
| `js/data/enemies/stage10-13-enemies.js` | 4 placeholders → 60 enemies (15 per stage), each with its own behavior |
| `js/data/enemies/stage10-13-bosses.js` | 4 placeholders → 16 bosses (4 per stage) |
| `js/data/enemies/stage10-13-superbosses.js` | 4 stat-reuse placeholders → 4 superbosses with bespoke AI |
| `js/data/roomTemplates/stage10-13-floorfeature.js` | 4 `{"m":[[1]]}` placeholders → 8 designed rooms, one per floor |
| `js/data/collectibles.js` | +7 `OBSTACLES` kinds in one additive "CONTENT GROUP 3" block (nothing existing touched) |
| `index.html` | +1 `<script>` for the new AI file, after `ai-stage7-9.js` |
| `js/CODE_REFERENCE.md` | new "Phase 10 — stage content GROUP 3" section |

Not touched, as required: `combat-3.js`, `ai-1..4.js`, `types-*.js`, `bosses.js`,
`superbosses.js`, `roomTemplates/floorfeature.js`, `dungeon.js`, `entities.js`,
`game.js`, `room.js`, and both other groups' `stageN-M-*.js` files.

---

## Content

### Stage identities (one idea each, escalating)

| Stage | floorNum | Idea | What the roster does with it |
| --- | --- | --- | --- |
| 10 Trench Depths | 27-28 | **Pressure** | Area denial around a point, not aimed shots: collapsing rings, eight-way vents, delayed crush columns. Teaches spacing. |
| 11 Deep Dark | 29-30 | **Information** | Half the roster is invisible, dormant, or behind you. Costs you *knowing where things are*, not reaction time. |
| 12 Meta Realm | 31-32 | **The game misbehaving** | Rewinds, off-screen spawns, walls that are not there, an enemy that deletes the room. Every pattern breaks a rule floors 0-30 established, and every one is still deterministic. |
| 13 Hyperspace | 33-34 | **Velocity** | Everything faster than anything met before; lines, folds and sweeps rather than aimed shots. Stacks all three earlier lessons. |

### Enemies (60)

15 per stage, `stage:` 10/11/12/13 — verified 15/15/15/15 programmatically. Every entry
has a `desc`, a unique `behavior` string, and its own AI function. No archetype from
`ai-1/ai-2.js` is reused anywhere in this group.

`hp` runs 29-42 (stage 10), 33-46 (11), 41-52 (12), 44-64 (13); `speed` 0-96 → 0-126;
`dmg` 2-4. `xpTier` is set but is **not** used for an intra-stage ramp — the coordination
doc's quirk 3 (parity is inverted on the new stages) makes that unreliable, so the ramp is
carried by `hp`/`speed`/pattern instead. `weight` is raised only on the intended
room-carriers (`tdcrusher`, `ddstalker`, `ddfang`, `ddcrawler`, `mrglitch`, `hslancer`,
`hsdrone`). `burstRadius` is set on the two whose AoE lands away from their own body
(`tdcolumn`, `mrassert`), because `render.js`'s `drawEnemy` sizes the ground-target marker
from it.

### Bosses (16) and superbosses (4)

Four bosses per stage, each a mechanic no other boss in the game has — an anchored
fortress that fires a turning cross, a boss that only acts while the player holds still, a
charge that is aimed at where you *were* and never corrected, a four-version "patch notes"
fight, one that walks through walls and deletes cover, one whose every attack converges.
Twelve of the sixteen call `g3Waves` for the two staggered minion waves the existing
superbosses use.

Superbosses (`palestine`, `warden`, `notch`, `kirkinator` — ids and names exactly as
specified) all get **bespoke** AI rather than the stat-reuse convention `superbosses.js`
documents, matching what Group 2 did:

- **Palestine DNB** — 3 HP bands, each adding a layer (collapse rings → + a rotating
  pressure cross → + a lunge threaded through both), with a still beat on every change.
- **Warden DNB** — the damage window is *earned*: it is unlit and invulnerable, sweeping a
  real-bolt searchlight, and the only thing that forces it to surface for two seconds is
  the beam catching the player. Hiding forever means never hurting it. It also mines the
  dark on a timer so waiting in one corner decays as an option.
- **Notch DNB** — fights by editing the room: places lattice walls (its only rooted,
  punishable state), deletes the nearest cover, rewinds its own position out of a bad
  exchange, spawns Meta Realm creatures, and below 25% strips the arena to bare floor once.
- **The One True Kirkinator** — the run's final boss and the most elaborate function in
  the file: five HP bands (fold / collapse / lance / pulsar) plus a sixth layered state
  where the pulsar sweep never stops and the other three take turns punching through it.
  Every band change is one ring plus a full second of doing nothing — the same courtesy
  `aiBossOneTrueDnb` extends on floorNum 14 — and all sub-pattern state is wiped on
  transition so an outgoing band cannot fire a tail into the incoming one. Two standard
  minion waves plus a third at 12% that no other fight in the game has.

### Floor-feature rooms (8) and objects (7 obstacle kinds)

One designed room per **floor**, not per stage, so a stage's two floors differ:

| floorNum | Room | Built on |
| --- | --- | --- |
| 27 | The Crush Zone | four `crushvent` on the diagonals, one rock block as the only cover |
| 28 | The Black Vents | five `crushvent` + offset pillars — no lane is out of every vent's fire |
| 29 | No Light Reaches | four `lurehorn` + a hard-rock maze, two dormant Pouncers placed *in* the maze |
| 30 | The Long Quiet | one `lurehorn` walled into a tall-rock ring with the pickup beside it |
| 31 | Behind The Curtain | a lattice where every other block is a `phantomwall` |
| 32 | The Author's Margin | a sealed `phantomwall` vault around an item pedestal, with four *real* rocks as the control group |
| 33 | Fold | a `warpstream` pinwheel around the perimeter, dead calm in the middle |
| 34 | The Last Exit | every edge folds **inward**, a Terminus standing in the middle of it |

New obstacle kinds, all additive reuses of mechanisms that already existed (no engine file
changed to support any of them): `crushvent` (fixed-angle turret pipeline, eight
bearings), `lurehorn` (targeting turret + purplefire's `homing`, 4.5s cadence),
`phantomwall` (the reality break — `walkable:true` carrying `tallhardrock`'s exact colours
and `tall` flag, so it renders as a wall and behaves as floor for movement, enemy pathing,
LoS and projectiles), and `warpstreamn/s/e/w` (the `current` push at 2.4).

The four-facing allowance is spent on **one** object that needs four facings
(`warpstream`), per the coordination doc. Push magnitude 2.4 deliberately tops the
established ordering: sewer current 1.0 < ice slide 1.25 < tide surge 1.6 < riptide 1.9 <
warp stream 2.4, matching stage order. Like Group 2's riptides these cannot reuse
`currentn/s/e/w`, which `dungeon.js`'s `obstacleAllowedOnFloor` hard-gates to
`floorPath === 'C'` — and `dungeon.js` is not this group's file. None of the seven are
gated in `obstacleAllowedOnFloor` (it defaults to `true`); their only gate is the `f:[…]`
filter on the eight templates, which are their sole consumer.

---

## Engineering notes

### No new Enemy constructor field

`entities.js` is out of scope, and its comment is explicit that a field which gets `-= dt`
while undefined goes NaN and freezes the creature silently. So every piece of state this
group needs lives in **one lazily-created bag**, `g3(e)` → `e._g3`, with every numeric
field pre-set to 0 at creation. Engine fields that *are* eagerly initialized are used
directly only where their meaning matches (`attackTimer`, `telegraph`, `dashing`/`dashVX`,
`submerged`, `shielded`, `minionsSpawned`/`minions2`, `hitFlash`), plus
`lobTimer/lobTime/lobX/lobY` specifically because `render.js` draws the ground-target ring
off them — four creatures telegraph through it.

### Deliberate rule-breaks, and why they are safe

- `g3MrGhost` / `g3BossRenderGhost` move by writing `e.x`/`e.y` directly instead of
  through `tryMoveEntity`, i.e. they pass through walls. Both clamp to the room bounds
  every frame, so neither can leave the map or reach an unreachable tile.
- `g3MrEditor`, `g3BossRenderGhost` and `aiG3SbNotch` set `ob.destroyed = true` (plus
  `node.tileLayerDirty`) on room obstacles. This is the same field `explodeAt` sets, so
  nothing downstream sees a state it does not already handle. Room clear is unaffected —
  obstacles are not enemies.
- `g3TdSiphon` heals allies *out of its own HP bar* and can kill itself doing it; it calls
  `handleEnemyDeath` on that path, so its death is a normal death (drops, counters, room
  clear all fire).

### Two bugs found and fixed during self-review

1. **`g3MrAssert`'s marker never expired.** Its fuse branch returned before the tail line
   that ticked `e.lobTimer`, so `render.js` would have drawn a landing ring that stayed on
   screen permanently after the first volley. The decrement now lives inside the branch
   that owns the fuse, and the timer is explicitly zeroed on detonation.
2. **`g3MrClone` was exponential.** Each clone started with `minionsSpawned = 0`, so
   generation N could always produce generation N+1 for as long as the player kept
   damaging them. Now capped twice: once per individual, and once room-wide at six of that
   type, counted live off `node.enemies`.

---

## Verification

- **`node --check` clean** on all six touched/created `.js` files.
- **Behavior coverage, mechanically checked:** 80 distinct behavior strings used across
  the three data files, 80 handlers registered, **0 used-but-unregistered** and 0
  registered-but-unused (the one extra match is the `g3Whatever` example inside the file's
  own header comment). No duplicate handler name. No collision with Group 1's or Group 2's
  handler keys (checked against both `Object.assign(ENEMY_BEHAVIOR_HANDLERS, …)` blocks),
  and none shadows an existing `case` in `combat-3.js`'s switch.
- **Global function names:** the 8 helpers (`g3`, `g3Blast`, `g3Converge`, `g3Wall`,
  `g3Blink`, `g3Spawn`, `g3Waves`, `g3Back`) were grepped against every `^function` in
  `js/` — zero duplicates.
- **Id collisions:** all 80 new enemy/boss/superboss ids and all 7 obstacle ids grepped
  word-wise across `js/`. **One real collision was found and fixed:** `pressurechoir` is
  already a floorKey-`11A` boss in `bosses.js`, so this group's stage-10 boss was renamed
  to `crushchoir` / "The Crush Choir" (behavior and function renamed to match). The other
  flagged hits (`warden`, `notch`) were prose-only matches in comments/`desc` text, not
  ids — both superboss ids are unique. Re-checked after the rename: clean.
- **Cross-file references resolve:** every `ENEMY_TYPES` id referenced by a summon
  (`g3Spawn`/`g3Waves`, 30 distinct ids) exists in this group's enemy file; every obstacle
  kind and every forced enemy id used by the eight templates exists; the eight templates
  gate floors 27,28,29,30,31,32,33,34 — one each, no gaps, no overlaps.
- **Behavior smoke test (light).** A throwaway harness loaded `ai-stage10-13.js` into a
  `vm` context with stubbed engine globals and ticked **all 80 handlers for 600 frames
  each**, draining HP as it went so every HP-band phase machine (including the
  Kirkinator's five bands and its 12% wave) actually transitioned, with the player moving
  on a Lissajous path. Result: **80 ticked, 0 failures** — no throw, no non-finite
  position, no NaN angle or projectile velocity. The harness lives in the scratchpad, not
  in the repo.
- **Win-flow check (explicitly requested).** `game.js`'s `descend()` was re-read: the
  extended-route block is `floorNum >= OLD_MAIN_ROUTE_FINAL_FLOOR && floorNum <
  MAIN_ROUTE_FINAL_FLOOR → startFloor(floorNum + 1)`, so floorNum 34 falls past it into
  `next >= maxFloorsThisRun → state = 'win'; endRunUnlocks()`. Floor 34 is therefore
  already the only Main-path ending, and `isLastFloorOfRun()` mirrors it for the stairs'
  ESCAPE label. **No adjustment was needed and none was made** — this group added data
  only, and nothing here reads or alters `floorNum`, `maxFloorsThisRun` or `floorPath`.

---

## Deviations

1. **One shared file was edited: `js/data/collectibles.js`.** Explicitly permitted by the
   task ("You MAY add new obstacle kind(s) … keep additive/small"). The edit is one
   contiguous appended block of 7 kinds after Groups 1 and 2's blocks; no existing entry,
   including the coordination pass's `floorswitch` placeholder, was modified or removed.
2. **`index.html` was edited** to register the new AI file — also explicitly instructed,
   and placed after `ai-stage7-9.js` (i.e. after `combat-3.js`, which declares the
   registry `const`, and after `ai-1..4.js`, whose helpers the bodies call).
3. **All four superbosses got bespoke AI** rather than the documented stat-reuse
   convention. The task called for it, and Group 2 did the same.
4. **Eight floor-feature rooms, not four.** The doc's minimum is one per stage; the
   allowance permits more, and per-floor rooms make each stage's two floors read
   differently. Groups 1 and 2 both did the same (six each).
5. **One boss renamed post-authoring** (`pressurechoir` → `crushchoir`) purely to clear
   the id collision found in verification.
6. **`xpTier` is not used as a difficulty lever**, per the coordination doc's inverted-
   parity quirk. It is set only so `resolveGenericEnemy`'s first filter has something
   sane to work with.

---

## Open risks

1. **No superboss reaches its floor yet, including the run's final boss.** `game.js`'s
   `startFloor` hard-codes floorNum → `pendingBossType` for the legacy route only and
   sends every floorNum 15+ to `resolveGenericBoss`. All four of this group's superbosses
   register into `SUPERBOSSES`/`SUPERBOSS_LIST` and sit there unused, so **floorNum 34
   currently ends the game on a randomly-rolled regular boss.** `game.js` is outside all
   three groups' ownership, so this is one small shared edit somebody still has to make —
   four lines in the same shape the existing chain uses, e.g.
   `else if (floorNum === 28) this.pendingBossType = SUPERBOSSES.palestine;` and likewise
   30 → `warden`, 32 → `notch`, **34 → `kirkinator`**. Groups 1 and 2 need six more on the
   same chain. This is the single highest-value follow-up in the phase.
2. **Cross-group `hp` calibration is unresolved, and the two curves disagree.** Boss and
   superboss numbers here follow the coordination doc's rule 1 literally (authored against
   the existing 40-58 / 60-79 bands, because `bossHpScale` is 1.36^floorNum). Enemy
   numbers instead continue the *placeholder ramp* the coordination pass laid down
   (18 → 28 across stages 4-9), because that ramp is the only visible inter-group contract
   on trash stats and the task required this group to sit clearly above Group 2. Those two
   choices are individually defensible and jointly unaudited: with `ENEMY_HP_GROWTH` at
   1.20, a stage-13 enemy authored at 44 is ~404× at floorNum 33, which is far more than
   the player's own power grows between floor 14 and floor 33. **Nothing on floors 27-34
   should be assumed playable until someone tunes the ten new stages against real player
   DPS**, and that pass may well conclude the fix belongs in `growth.js`'s curves rather
   than in any group's table. Flagged rather than unilaterally "fixed", since changing
   either curve affects all thirty-five floors.
3. **Bolt density on the deepest floors is untested against a real frame budget.** The
   Kirkinator's layered band emits a 6-arm volley every 0.14s alongside folds and
   collapses, and floorNum 28's feature room has five eight-way vents. Every bolt is a
   `Projectile` with a finite `life`, so nothing leaks, but the peak count on screen is
   higher than anything the game has shipped. Worth a look on lower-end hardware.
4. **Bestiary rows exist with no unlock path.** 80 new entries land in
   `ENEMY_LIST`/`BOSS_LIST`/`SUPERBOSS_LIST`, which `bestiary.js` builds its tabs from,
   and `STAGE_LIST` still has no pages for the ten new stage ids that `startFloor` now
   actively records. No `locked:true` was set on any enemy here, deliberately: there is no
   matching unlock entry to gate them with. Same class of issue the coordination audit
   already raised; it is now 80 rows larger from this group alone.
5. **`phantomwall` is invisible to the room's own generation logic.** It is `walkable`, so
   it never counts as occupying a tile — pickups and enemy spawns can be placed on it and
   enemies path straight through it. That is exactly the intent, but it means a template
   built out of phantom walls provides *no* structural cover, and anyone later reusing the
   kind should not treat it as level geometry.
6. **Two behaviors mutate the room's obstacles.** `g3MrEditor`, `g3BossRenderGhost` and
   `aiG3SbNotch` can leave a feature room stripped bare — including, on floorNum 32, the
   four real rocks that are the whole joke of that room. Intentional, and reversible only
   by regenerating the floor; noted in case a future pass adds anything that assumes a
   room's obstacle list is stable for the room's lifetime.

## Addendum (orchestrator, post-landing)

Group 2 and Group 3 both independently flagged a raw-`hp` discontinuity at the
floorNum 26→27 boundary (Group 2's trash enemies topped out at hp:18, Group 3's
started at hp:29). Rather than defer this to the full rebalance pass, applied a
direct linear rescale of every `hp:` field in `stage10-13-enemies.js` from the
authored 29-64 range down to 20-42 (`new = 20 + (old-29)*22/35`, rounded), via a
one-off script — `dmg`, `speed`, `radius`, and every other field untouched.
Verified: `node --check` clean, per-substage (td/dd/mr/hs) hp ranges still
escalate monotonically (20-28 / 23-31 / 28-34 / 29-42), and the new floor-26→27
boundary (18 → 20) is now a normal step rather than a near-doubling. Bosses and
superbosses were NOT rescaled — their hp bands (58-80 trash-boss / 82-96
superboss) were already authored against the contract's calibration rule and
sit consistently above Group 1/2's boss bands, so no change was needed there.
