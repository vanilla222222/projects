# Phase 10 — stage content GROUP 2 (audit)

Stages 7-9 of the extended main route: **Ocean** (`ocean`, floorNum 21-22), **The Sea
Floor** (`seafloor`, 23-24) and **Trench** (`trench`, 25-26). 45 trash enemies, 12
regular bosses, 3 superbosses, 6 floor-feature rooms, 6 new obstacle kinds, and 60
bespoke AI routines — one per creature, none shared with any other creature.

## Files changed

| File | Change |
| --- | --- |
| `js/systems/ai-stage7-9.js` | **new** — all 60 behavior functions + one `Object.assign(ENEMY_BEHAVIOR_HANDLERS, {...})` |
| `js/data/enemies/stage7-9-enemies.js` | placeholders replaced — 45 entries (15/15/15) |
| `js/data/enemies/stage7-9-bosses.js` | placeholders replaced — 12 entries (4/4/4) |
| `js/data/enemies/stage7-9-superbosses.js` | placeholders replaced — Japan DNB / DeanNB / Israel DNB Prime Prime, bespoke AI |
| `js/data/roomTemplates/stage7-9-floorfeature.js` | placeholders replaced — 6 templates, one per floorNum 21-26 |
| `js/data/collectibles.js` | **additive only** — one contiguous "CONTENT GROUP 2" block of 6 `OBSTACLES` kinds, appended after Group 1's block |
| `index.html` | **one line + comment** — `<script src="js/systems/ai-stage7-9.js">` immediately after `ai-stage4-6.js` |
| `js/CODE_REFERENCE.md` | new "Phase 10 — stage content GROUP 2" section appended, matching Group 1's section style |

Files explicitly **not** touched, as scoped: `js/systems/combat-3.js`, `js/systems/ai-1..4.js`,
`js/data/enemies/types-*.js`, `js/data/enemies/bosses.js`, `js/data/enemies/superbosses.js`,
`js/data/roomTemplates/floorfeature.js`, `js/systems/dungeon.js`, `js/entities/entities.js`,
`js/game.js`, and every `stage4-6-*` / `stage10-13-*` file.

---

## Task 1 — the AI file, and why no shared file was edited

`combat-3.js`'s `updateEnemy` dispatches on `e.behavior` through a shared `switch`, and
its `default` case consults `ENEMY_BEHAVIOR_HANDLERS` before falling back to `aiChase`
with a one-time console warning. That registry is the entire reason this pass could run
concurrently with Groups 1 and 3: `ai-stage7-9.js` declares its own functions and ends
with a single `Object.assign(ENEMY_BEHAVIOR_HANDLERS, {...})` of all 60 keys. Zero
switch cases added, zero lines of `combat-3.js` or `ai-1..4.js` changed.

**Load position.** `index.html`, directly after `ai-stage4-6.js` (itself after `ai-4.js`,
itself after `combat-3.js`). The only load-time requirement is that
`ENEMY_BEHAVIOR_HANDLERS` already exists; every other global the file uses
(`chaseSeek`, `seekVector`, `tryMoveEntity`, `fireProjectileAt`/`fireProjectileAngle`,
`findNearestFloor`, `Projectile`, `Explosion`, `damagePlayer`, `playerDamageAmount`,
`handleEnemyDeath`, `Enemy`, `ENEMY_TYPES`, `aiWander`, `Util`, `TILE`) is only touched
from inside a function body, i.e. at call time, so its own position is otherwise free.

**Per-entity state.** `entities.js` is outside this group's ownership, so no field could
be added to the `Enemy`/`Boss` constructors. Wherever possible the routines reuse the
constructor's eagerly seeded fields (`attackTimer`, `fireTimer`, `telegraph`,
`dashing`/`dashTimer`/`dashVX`/`dashVY`, `lobX`/`lobY`, `spinTimer`/`spinAngle`,
`pyres`, `pulseCount`/`pulseTimer`/`exhaustTimer`, `submerged`, `shielded`, `orbitDir`,
`blinkTimer`, `burrowTimer`, `healTimer`, `minionsSpawned`, `phaseIndex`/`phaseShift`,
`pattern`, `enraged`). Anything else is seeded on first tick through `s79Init(e, key,
default)` — never assumed, because one `-= dt` against `undefined` NaNs an enemy
permanently inert and there is no constructor line to catch it.

**Shared helpers**, prefixed `s79` so they cannot collide with Group 1's `g1*` or Group
3's set: `s79Init`, `s79Aim`, `s79Ring`, `s79Arc`, `s79Drag`, `s79Pyre`/`s79Pyres`,
`s79Warp`, `s79Spawn`, `s79Phase`.

Two of those deserve a note:

- **`s79Drag`** is the group's signature mechanic (Undertow Maw, Tide Caller, Maelstrom,
  Trenchmaw, Japan DNB). It applies `tryMoveEntity` to `game.player`, which means a pull
  goes through exactly the same collision path as ordinary player movement — a current
  can drag you around a corner but never through a wall. That is the same reasoning
  `combat-1.js`'s own current push uses, and Group 1 arrived at the same primitive
  independently (`g1ShovePlayer`).
- **`s79Pyre`/`s79Pyres`** queue delayed ground bursts on the enemy's own `pyres` array —
  the field `aiBossDuneRavager` already uses — rather than in a global list, so pending
  blasts die with their owner instead of detonating after the room is cleared.

### Unique-AI accounting

60 creatures, 60 behavior strings, 60 functions, one-to-one, machine-verified (see
Verification). "Unique" here means genuinely distinguishable movement/attack shape, not
a stat swap. The three stages were given separate design throughlines so the uniqueness
reads at the stage level too:

- **Ocean** — *your position is not yours.* Surges that cannot correct mid-coast, shark
  passes that go through you rather than to you, suction, ricochets, and a support
  enemy (`foamherald`) that shoves every OTHER enemy a step toward you.
- **The Sea Floor** — *concealment and windows.* Burrowers, blink trails that shoot
  backward, a shoal that scatters out of your burst window, a ward that gives its shell
  away, and a light/dark boss where damage only lands in the light.
- **Trench** — *crushing pressure, no room.* Phase-strikers, closing coils, a mirror that
  matches your movement instead of chasing it, walls with one walking gap, and columns
  that are both the geometry and the damage.

---

## Task 2 — stat calibration (the part most likely to be argued with)

Both calibration rules from the coordination doc were applied literally.

**`hp` is identity, not an absolute.** `growth.js` multiplies trash hp by
`enemyHpScale = 1.20^floorNum` (~46x at floorNum 21, ~68x at 26) and boss hp by
`bossHpScale = 1.36^floorNum` (~1100x at 21, ~3800x at 26). Authoring "floor 25 sized"
numbers applies the curve twice.

| Band | Legacy top (stage 3) | Group 1 (stages 4-6) | **Group 2 (stages 7-9)** |
| --- | --- | --- | --- |
| Trash `hp` | 2-9 | 4-11 | **3-12 / 7-16 / 10-18** |
| Boss `hp` | 40-58 | 46-60 | **58-64 / 64-72 / 74-80** |
| Superboss `hp` | 60-79 (Kirk 78 is the top) | 66/68/70 | **82 / 85 / 88** |
| Trash `speed` | 40-145 | — | **0-142** |

Every band sits strictly above Group 1's and strictly below what Group 3 will need for
stages 10-13, so the monotonic ordering the coordination doc requires holds by
construction, verified against Group 1's landed content rather than against its
placeholders.

**`dmg` above 4 is wasted.** `combat-1.js`'s `playerDamageAmount` hard-caps a single
source at 4 half-hearts, and bosses additionally get `bossDmgScale` on top. Machine-checked:
**zero** entries in any of the three data files exceed `dmg:4`. Trash sits at 1-4 (mostly
2-3), bosses at 3-4, superbosses at 4. Boss/superboss *projectiles* are passed literal
2-3 rather than `e.dmg`, matching what every existing `aiBossXxx` does.

Difficulty is therefore carried by hp, speed, pattern density and room composition. The
Trench in particular gets its step up from overlap (several routines punish standing
still, several punish moving) and from its feature rooms, not from numbers.

### Difficulty ordering within the group

Stage 7 is the loosest — open water, low hp, high mobility, very few things that both
block and hurt. Stage 8 raises hp and adds concealment plus the first real damage-window
gating (`chitinward`, `barnacleclinger`'s cousin `boneyardcrab` is stage 9's harder
version). Stage 9 raises hp again, adds the highest speeds, and is the only stage whose
feature-room object is solid — a Trench feature room is a corridor fight where the walls
also deal damage.

---

## Task 3 — floor-feature rooms and the six new obstacle kinds

Six templates, one per floorNum (`f:[21]` … `f:[26]`), so the two floors of a stage get
visibly different rooms rather than a coin flip between the same two. This follows Group
1's choice; the coordination doc's minimum was one per stage.

| floorNum | Room | Object |
| --- | --- | --- |
| 21 | Crosscurrent Shelf — two opposed two-tile riptide lanes with a bare rock shelf between | `riptidee`/`riptidew` |
| 22 | The Gyre — clockwise riptide ring, forced `spouter` anchored in the eye | all four facings |
| 23 | Bloom Field — 16 blooms in a staggered lattice, pickup as bait on the far wall | `glowbloom` |
| 24 | The Lantern Walk — two offset bloom walls forming a serpentine, forced `ventworm` sweeping it | `glowbloom` |
| 25 | The Squeeze — column walls pinching the room to four one-tile doorways | `pressurecolumn` |
| 26 | Collapse Chamber — column ring with one gap per side, forced `blacksmoker` dead centre | `pressurecolumn` |

Collapse Chamber is the one worth calling out as designed rather than decorated: the
Black Smoker's eruption is a *donut* (the ring of tiles around it detonates, not the tile
it occupies), so the safest square in the room is pressed against the thing generating
the danger, inside a ring you cannot leave quickly.

### The six obstacle kinds — all additive, no engine change

Appended to `data/collectibles.js`'s `OBSTACLES` as one contiguous, group-labelled block
immediately after Group 1's, so the three groups' edits to that shared file merge rather
than interleave.

- `riptiden` / `riptides` / `riptidee` / `riptidew` — the `current` push
  (`combat-1.js`'s `updatePlayer`: `pushX/pushY * CURRENT_PUSH_SPEED` while the player
  overlaps) at magnitude **1.9**, the strongest in the game. The ordering riptide 1.9 >
  Beach tide surge 1.6 > ice slide 1.25 > sewer current 1.0 is deliberate and matches
  the stage ordering. This is the coordination doc's "up to four directional variants"
  allowance spent on **one** object that genuinely needs four facings (The Gyre is a
  rotating ring, which two facings cannot build).
- `glowbloom` — the thornbush mechanism (`hazard` + `attackable:false` + `destructible`):
  non-solid, so you can walk through and simply take the burn; immune to attacks, only a
  bomb clears a patch.
- `pressurecolumn` — the spikedrock mechanism (`hazard` + `solid` + `destructible`):
  blocks like a rock **and** hurts on contact.

**Why the Ocean could not reuse `currentn/s/e/w`.** `dungeon.js`'s
`obstacleAllowedOnFloor` hard-gates those four kinds to `floorPath === 'C'`, independent
of any template floor filter — a main-route template placing one would be rejected
outright by `templateAllowsFloor`. `dungeon.js` is not this group's file, so new kinds
were the only route; they fall through that function's default `true`, and their sole
gate is the `f:[...]` filter on the six templates, which are their only consumer.

Rendering needed no change either: `utils-1.js`'s obstacle draw dispatches the current
tiles on `ob.def.current` (generic, animated chevrons in the push direction), and
anything unmatched falls through to the generic `def.color`/`def.dark` blob.

---

## Verification

`node --check` clean on all six touched/created `.js` files.

**Load-time simulation.** All five data/AI files were executed in a `vm` context with
stubbed `ENEMY_TYPES` / `BOSS_TYPES` / `BOSS_LIST` / `SUPERBOSSES` / `SUPERBOSS_LIST` /
`ROOM_TEMPLATES` / `ENEMY_BEHAVIOR_HANDLERS`, in `index.html` order. Result: **45**
enemies (15 per stage, confirmed by `stage:` field), **12** bosses (`stage:` sequence
`7,7,7,7,8,8,8,8,9,9,9,9`), **3** superbosses, `ROOM_TEMPLATES.floorfeature` grown from 1
to 7, **60** handlers registered. No exception at load.

**Behavior wiring, machine-checked:**
- 60 distinct `behavior:` strings across the three data files; 60 keys in the registry
  block; the two sets are identical (`used but NOT registered: []`,
  `registered but NOT used: []`).
- Every registry value resolves to a `function` declared in the same file
  (`handler targets missing: []`).
- No behavior string in this group collides with any behavior string anywhere else in
  `js/data/` (`comm -12` against every other enemy/familiar data file: empty), and none
  collides with an existing `case` in `combat-3.js`.
- Helper and AI function names: no collision with any top-level `function` declared
  anywhere else in `js/` (checked against `ai-1..4.js`, `ai-stage4-6.js`, all of
  `js/systems`, `js/core`, `js/data`, `js/ui`, `js/entities`, `game.js`, `main.js`).

**Id collisions.** All 60 new ids grepped against every other file in `js/data/`
(enemies, collectibles, items, familiars, trinkets, pickups). **One hit found and fixed:**
`bonepicker` already exists in `types-1.js` — this group's Sea Floor entry was renamed
`siltpicker` / "DNB Silt Picker". Re-run after the rename: zero collisions.
The six new obstacle ids were grepped against all of `js/` before being added: zero hits.
`israelprimeprime` deliberately extends the `israel` → `israelprime` line without
colliding with either.

**Cross-reference integrity.**
- The three enemy ids spawned from boss AI (`bubblemine`, `lanternshoal`, `blacksmoker`)
  all exist in this group's own enemy file — verified programmatically, so no boss can
  no-op its minion wave.
- The three enemy ids force-placed by feature-room templates (`spouter`, `ventworm`,
  `blacksmoker`) likewise.
- Every obstacle kind referenced by the six templates exists in `OBSTACLES` — verified
  programmatically (`kinds missing: []`).

**Data hygiene.** Every one of the 60 entries carries a `desc` (checked: `missing desc: []`),
matching what `bestiary.js`'s `renderBestiarySimple` reads. No entry exceeds `dmg:4`.

**Two real bugs found and fixed during re-reading of the diff:**
1. `aiOcRicochet` originally bounced off `tryMoveEntity`'s `movedX`/`movedY` booleans. A
   body travelling straight along one axis legitimately has zero motion on the other,
   which those booleans report identically to being blocked — the urchin would have
   flipped its heading every single frame and vibrated in place. Now it compares actual
   displacement against the intended per-axis step.
2. `aiSfFlank` read `player.facingAngle`, which does not exist — `entities.js`'s `Player`
   carries `facing` as a unit `{x,y}` (only `Enemy` has `facingAngle`). Now derives the
   angle from `p.facing` with a default, so the flanker cannot NaN its target point.

Also removed before landing: a dead `Util.angleDiff ? 0 : 0` line in `aiSfVentJet`, and a
`e._s79dt` stash-and-read hack that `s79Phase` used instead of taking `dt` as a
parameter.

Not verified (cannot be, without running the page): actual in-play difficulty, and the
visual read of the new obstacle kinds. Per the project's testing convention this pass
lands the content and reports; the user verifies by playing.

---

## Deviations

1. **Superbosses got bespoke AI**, departing from the established convention (the
   C-branch and Phase 7a blocks in `superbosses.js` both state explicitly that
   superbosses reuse an existing `aiBossXxx` and differentiate on stats). The
   coordination doc left this call to the content implementers; these are the three
   signature fights of the group's stages, and stat-reuse would have made them read as
   recoloured regular bosses. Japan DNB runs 4 HP-banded phases, DeanNB 4, Israel DNB
   Prime Prime 5. Group 1 made the same call independently.
2. **Six floor-feature templates, not three.** The doc's minimum is one per stage; one
   per *floor* means the two floors of a stage are visibly different rooms. Matches
   Group 1.
3. **Six new `OBSTACLES` kinds in `collectibles.js`**, which is a shared file. The task
   permitted this explicitly ("not claimed by anyone else" — all six ids were grepped
   clean first). Added as one contiguous, group-labelled block for mergeability.
4. **`index.html` was edited** — one `<script>` tag plus a comment, for the new AI file.
   The coordination doc says not to edit `index.html`, but also says a group needing an
   extra file should "register it in the same block"; this group's task prompt required
   the registration directly. The insertion sits inside the Phase 10 AI block, directly
   after Group 1's identical line, so a Group 3 line lands beneath it without conflict.
5. **The `hp` numbers are far below the placeholders they replaced.** The skeleton pass
   left trash at `hp:24-28` for these stages; at floorNum 21-26 that is 1100-1900
   effective HP per trash mob, eight per room. Those placeholders were explicitly flagged
   as untuned in the coordination audit's open risks. This pass follows the doc's
   calibration rule instead of the placeholder ladder. See open risk 2.

---

## Open risks

1. **No floorNum → superboss dispatch.** `game.js`'s `startFloor` hard-codes the mapping
   for the legacy route only and sends every floorNum 15+ to `resolveGenericBoss`, so
   Japan DNB, DeanNB and Israel DNB Prime Prime are registered and reachable by id but
   **do not currently appear on floors 22 / 24 / 26** — those floors draw a random
   regular boss from the stage pool instead. `game.js` is outside every content group's
   file ownership, so this is one small shared edit that still has to be made by someone,
   for all ten new superbosses at once. Same open item Group 1 reports.
2. **Cross-group stat consistency depends on all three groups reading the calibration
   rule the same way.** Group 1's landed content (trash 4-11, bosses 46-60, superbosses
   66-70) and this group's (3-18 / 58-80 / 82-88) are consistent with each other and
   monotonic. If Group 3 authors against the *placeholder* ladder instead (trash hp
   30-36), stages 10-13 will be roughly triple the effective HP of stage 9 on top of five
   more floors of the growth curve, and the ordering will break hard at floorNum 27. Worth
   a cross-check once Group 3 lands.
3. **`xpTier` cannot ramp difficulty inside a stage.** The documented parity quirk holds:
   the new stages start on an odd floorNum, so the *first* floor of each pair draws the
   wider tier-2 pool. `xpTier` is used here purely to mark "heavier creature", never as an
   intra-stage ramp. The intra-stage step is carried by the feature rooms instead (the
   floor-2 room of each stage is the nastier one).
4. **Bestiary rows without pages.** These 60 entries join `ENEMY_LIST`/`BOSS_LIST`/
   `SUPERBOSS_LIST` and therefore appear in the bestiary, but `STAGE_LIST` in `stages.js`
   still has no entries for the ten new stage ids that `startFloor` now records. Pre-existing,
   unowned, and now 60 rows larger from this group alone.
5. **No achievements or mastery ladders** exist for any of these 60 creatures, unlike
   every legacy stage (`defs-mastery.js` has per-enemy tiers for older enemies). Out of
   scope for a content pass, but the gap is now three stages wide.
6. **Two obstacle kinds are damage sources the player can be pushed into.** A riptide
   lane adjacent to a pressure column would be a genuine cheap-hit generator; the six
   templates authored here never place the two within a tile of each other (they are in
   different stages, and no template mixes an object with a hazard obstacle). Anyone
   adding templates later should keep that separation.
7. **`glowbloom` and `pressurecolumn` add two rows to the object bestiary** with no
   unlock path other than reaching floorNum 23/25 — same class of issue as the earlier
   pass's `OBSTACLES.floorswitch` note.
