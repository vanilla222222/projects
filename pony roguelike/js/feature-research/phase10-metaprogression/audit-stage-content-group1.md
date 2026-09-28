# Phase 10 — stage content GROUP 1 (audit)

Content pass for stages 4-6 of the extended main route: Frozen Desert (floorNum 15-16),
Badlands (17-18), Beach (19-20). Replaces every group-1 placeholder with designed
content — 45 enemies, 12 bosses, 3 superbosses, 6 floor-feature rooms, and 60 bespoke
AI functions.

## Files changed

| File | Change |
| --- | --- |
| `js/systems/ai-stage4-6.js` | **new** — all 60 behavior functions + one `Object.assign(ENEMY_BEHAVIOR_HANDLERS, {...})` registration block |
| `js/data/enemies/stage4-6-enemies.js` | placeholders → 45 enemies (15 per stage) |
| `js/data/enemies/stage4-6-bosses.js` | placeholders → 12 bosses (4 per stage) |
| `js/data/enemies/stage4-6-superbosses.js` | 3 stat-reuse placeholders → 3 bespoke-AI superbosses (same ids/names) |
| `js/data/roomTemplates/stage4-6-floorfeature.js` | 3 empty placeholders → 6 real rooms, one per floor |
| `js/data/collectibles.js` | **+9 `OBSTACLES` kinds** (additive; the file is unowned, the `floorswitch` placeholder was left alone) |
| `index.html` | **+1 `<script>` tag** for `ai-stage4-6.js`, after `ai-4.js` |
| `js/CODE_REFERENCE.md` | new "Phase 10 — stage content GROUP 1" section, appended after the coordination pass's section |

No other file was touched. In particular `combat-3.js`, `types-*.js`, `bosses.js`,
`superbosses.js`, `roomTemplates/floorfeature.js`, `ai-1..4.js`, `dungeon.js`, `room.js`,
`render.js` and the other groups' `stageN-M-*.js` files are byte-identical.

---

## The AI file, and why there is one

The coordination doc predates `ENEMY_BEHAVIOR_HANDLERS` and still says the three groups
must share `combat-3.js`'s dispatch switch and the `ai-1..4.js` bodies — its own open
risk #5 calls that the most likely way the parallel passes collide. That risk is now
moot: `combat-3.js`'s `default` case consults the registry before falling back to
`aiChase`, so a new file that populates the registry needs no switch case at all.
Group 1 therefore ships one new file and edits neither shared file.

Placement in `index.html` is forced from both directions: **after `combat-3.js`**, because
`ENEMY_BEHAVIOR_HANDLERS` is a `const` and touching it earlier is a TDZ throw; **after
`ai-1..4.js`** in spirit (every function calls `chaseSeek`/`seekVector`/
`fireProjectileAngle`/`aiWander`), though those are function declarations hoisted onto the
global object and only resolved at call time, so this half is convention, not necessity.
It sits between `ai-4.js` and `familiars.js`, i.e. inside the systems block and above
everything that runs a frame.

### Structure

- ~10 `g1`-prefixed helpers (`g1Ring`, `g1Fan`, `g1Dash`/`g1StartDash`, `g1Blink`,
  `g1Boom`, `g1Spawn`, `g1Retreat`, `g1Strafe`, `g1ShovePlayer`, `g1AimAtPlayer`). Sharing
  these is what keeps 60 functions at 8-20 lines each; what each creature *does* with them
  is what differs. `g1ShovePlayer` is the only genuinely new primitive — `tryMoveEntity`
  applied to `game.player`, which is collision-checked and is how the pull/riptide
  patterns move the player without teleporting them through walls.
- 45 trash behaviors, 12 boss behaviors, 3 superboss behaviors.
- One registration block at the bottom — the file's single point of contact with the
  rest of the codebase.

### State discipline

Only fields the `Enemy` constructor initializes are used for arithmetic (`attackTimer`,
`fireTimer`, `telegraph`, `dashTimer`, `pathTimer`/`pathDir`, `burrowTimer`, `healTimer`,
`blinkTimer`, `weavePhase`, `orbitDir`, `submerged`, `shielded`, `dashing`, `vx/vy`,
`minionsSpawned`, `triggered`, `lobTimer`/`lobX`/`lobY`, `lastPX/lastPY`). Extra
per-behavior state uses `g1`-prefixed properties, every one defaulted on first touch
(`e.g1phase = e.g1phase || 0`, `e.g1roll = (e.g1roll || 1) + …`), so nothing ever does
math on `undefined` — the same rule the constructor's own comment states.

### Pattern variety (the "genuinely distinguishable" requirement)

The 15 per stage are built from deliberately different primitives, not stat swaps:
ricochet movers, momentum/overshoot movers, axis-locked railers, limited-turn-rate
carvers, blink-repositioners, burrow-ambushers, orbiters that fire inward, rooted
rotating-cross turrets, burst-chasers, wake-droppers, delayed-impact lobbers,
burst-then-reload gunners, player-pullers, player-shovers, a rooter that freezes the
player, an accelerating relentless closer, a shielded unit with a scheduled vulnerability
window, and a hp-reactive unit that speeds up as it dies. Four use `flies:true`.

Bosses each get a committed attack state, an approach state and a one-shot minion wave at
a health threshold — the house shape from `ai-2.js` — but the attack states differ
(slam+ring, storm-vanish spiral, escalating burrow rings, three-dash combo, charge/lob
mix, orbit-drag-then-spiral, dive+feather-fan, burrow-lunge chain, sweeping surf walls
with a centre gap, sidle+claw-slam+shell, strafing runs that leave drops, nested
counter-rotating rings).

### Superbosses — deviating from the stat-reuse convention, on purpose

`superbosses.js`'s own comments establish that a superboss reuses an existing `aiBossXxx`
and differentiates on stats; the coordination doc explicitly leaves the call to the
content pass for these ten. Group 1 writes bespoke AI for all three, each an explicit
three-phase cycle driven by `e.g1phase` plus two minion thresholds:

- **ICE Agent DNB** — raid dashes behind a frost cone → four corner blinks it is
  `shielded` through → stationary counter-rotating double spiral.
- **Mexico DNB** — six fast rounds → a stationary **reload** phase that is the player's
  entire damage window → three cross-room stampede charges laying grit rings.
- **G5 DNB** — rotating five-point star barrage → jetwash passes that shove the player and
  leave surf walls in their wake → an undertow phase that drags the player in while
  pulsing tight rings. The hardest fight in the group, matching stage 6's position.

---

## Difficulty calibration

Both calibration rules in the coordination doc were treated as binding.

**hp is identity.** Trash `hp` is authored on `enemyHpScale`'s shared scale (1.20^floorNum,
already 15x-38x at these depths), where legacy trash spans 1-6. Group 1 runs **4-9 / 5-10 /
6-11** across the three stages: above every legacy stage at every slot, monotonically
increasing, and nowhere near "floor 20 sized" numbers that would scale twice. Bosses are
authored against the existing 44-62 table: **46-52 / 50-56 / 54-60**. Superbosses against
the existing 60-79 band: **66 / 68 / 70** — above group 1's own bosses, just past the
legacy floor-5-to-9 superbosses (60-66), leaving room for groups 2 and 3 above.

**dmg above 4 is wasted.** Trash tops out at 3, bosses at 3, superbosses at 4. The
superbosses' 4 is the only place the cap is touched, which is exactly what makes them
read as a step up from their own stage's bosses. Every other difficulty lever is pattern,
count and hp.

`xpTier` is deliberately *not* used as an intra-stage ramp — the doc's quirk #3 (new stages
start on an odd floorNum, so the first floor of a pair gets the *wider* pool) makes that
impossible. Tier 2 simply marks the heavier half of each roster. `weight` biases the
featured-enemy roll: swarmy units 1.2-1.4, set-piece/rooted units 0.6-0.8.

---

## Floor-feature rooms

Six templates, **one per floor** rather than one per stage, so a stage's two floors are
visibly different rooms instead of a coin flip between the same two:

| floorNum | Room | Object |
| --- | --- | --- |
| 15 | Slide Hall | eastbound ice-slide corridor, rock bumpers, pits off each lip |
| 16 | The Pinwheel | all four slide facings as a clockwise ring around a pit island |
| 17 | Sink Basin | 12-tile quicksand bowl ringed by rocks |
| 18 | Vent Field | four dust vents on the diagonals, quicksand in the centre |
| 19 | Rip Channel | two full-width opposed tide surges with a still band between |
| 20 | Tide Flats | a two-tile surge wall pushing outward from the seam, 10 tide pools |

Nine new obstacle kinds, all additive reuses of mechanisms that already exist — no engine
file needed a change to support any of them:

- `iceslidan/s/e/w` — the `current` push (`combat-1.js`'s `updatePlayer`:
  `pushX/pushY * CURRENT_PUSH_SPEED`) at magnitude **1.25**, exploiting the fact that
  `pushX/pushY` are multipliers and not flags. This is the doc's "up to four directional
  variants" allowance, spent on one object that genuinely needs four facings (the ring in
  The Pinwheel is the room it exists for).
- `quicksand` (0.85s) and `tidepool` (0.45s) — the Sand Trap's `freeze` mechanism
  (`combat-4.js`'s `isFreezeTrap`): walkable, zero damage, only a loss of control.
- `dustvent` — the fixed-`angles` turret pipeline, but `walkable:true`, so unlike a real
  turret it never blocks the room.
- `tidesurgee/w` — stronger horizontal-only currents (1.6); two facings, not four, because
  a rip channel only needs east/west.

`mud`'s slow is **not** reusable — `combat-1.js` hardcodes `ob.kind === 'mud'` — which is
why the two slow-ish objects use `freeze` instead.

---

## Verification

- **`node --check` clean** on all six touched/created `.js` files.
- **Behavior wiring, scripted, not eyeballed:** 60 registry keys vs 60 `behavior:` strings
  in the three data files → **0 unused handlers, 0 undispatched behaviors, 0 duplicate
  behavior strings**. Registry keys also checked against `combat-3.js`'s `case` labels
  (0 overlap) and my `function` names against all four `ai-*.js` + four `combat-*.js`
  files (0 redeclarations).
- **Id collisions:** all 60 new ids regex-checked against every other file under `js/` —
  the only hits are inside `ai-stage4-6.js` itself (the `g1Spawn` minion references), i.e.
  zero collisions with existing content or with groups 2/3's still-present placeholders.
  The nine new obstacle kinds appear only in `collectibles.js` and my template file.
- **Merge behaviour actually executed**, not just reasoned about: the four data files were
  run in a `vm` context with stub `ENEMY_TYPES`/`BOSS_TYPES`/`BOSS_LIST`/`SUPERBOSSES`/
  `SUPERBOSS_LIST`/`ROOM_TEMPLATES` → 45 / 12 / 3 / 7 (1 fallback + 6 new) as expected.
- **Every obstacle kind referenced by a template exists in `OBSTACLES`** — checked by
  extracting all `'o'` spawns from the parsed templates and matching them back against
  `collectibles.js`.
- **Minion spawn ids resolve:** every `g1Spawn(game, e, '<id>')` target is one of the 45
  enemies in this group's own file, so no boss can spawn a type that doesn't exist
  (`g1Spawn` also no-ops on an unknown id rather than throwing).
- **Per-stage counts:** 15/15/15 enemies, 4/4/4 bosses, 1/1/1 superbosses, 2/2/2 feature
  rooms — counted from the files, not from intent.
- Not done, per the project's "no heavy smoke testing" rule: no browser playthrough. The
  patterns are unplayed.

---

## Deviations

1. **New file `js/systems/ai-stage4-6.js`, and an `index.html` edit.** The coordination
   doc says "do not create new files and do not edit `index.html`", but the group-1 task
   brief explicitly supersedes both for the AI file, and the registry mechanism exists
   precisely so this file can exist. One `<script>` tag added, in the systems block,
   nothing reordered.
2. **`js/data/collectibles.js` edited** (+9 obstacle kinds, one comment block). Sanctioned
   by the task brief as unowned and additive-only. The `floorswitch` placeholder was
   deliberately left in place — another group may still want it.
3. **Six floor-feature templates, not three.** The doc's minimum is one per stage; the task
   brief asks for one per floor. Six is inside the "up to four per group" *object* budget
   read as objects-not-templates: the group ships three themed objects (ice slide,
   quicksand/vent, tide surge/pool), laid out across six rooms.
4. **Superbosses get bespoke AI** rather than the documented stat-reuse convention — the
   coordination doc hands that decision to the content pass, and the task brief directs it.
5. **`desc:` added to all 60 enemy/boss/superboss entries.** No existing `ENEMY_TYPES`,
   `BOSS_TYPES` or `SUPERBOSSES` entry has one, and `bestiary.js` builds its rows from
   `hp/dmg/speed/behavior` and never reads `desc` — so these fields are currently inert.
   They were added because the task asked for real `desc` text on everything, and they are
   the natural place for a future bestiary flavour line to come from. Flagged rather than
   left implicit: this is 60 fields nothing reads yet.
6. **`weight` used** (not mentioned in the brief's field list, but existing convention in
   `types-*.js`) to bias `room.js`'s featured-enemy roll.

---

## Open risks

1. **The three superbosses are still not reachable.** `game.js`'s `startFloor` hard-codes
   floorNum → superboss for the legacy route and sends every floorNum 15+ to
   `resolveGenericBoss`, so floors 16/18/20 currently draw a regular stage boss and ICE
   Agent / Mexico / G5 never spawn. Wiring them is a `game.js` edit — outside group 1's
   file ownership, and it collides with groups 2 and 3 doing the same. **This needs one
   owner and one pass**, exactly as the coordination pass's own open risk #2 predicted.
2. **The nine new obstacle kinds render as generic discs.** `Util.drawObstacle`
   (`core/utils-1.js`) dispatches on `ob.kind` with a rock-shaped `else` fallback, and
   `GROUND_OBSTACLES` in `render.js` is a hardcoded `{pit, mud, sandtrap}`. So an ice slide
   draws as a pale blue rock-like disc in the y-sort rather than as a flat floor decal —
   which is exactly how the existing C-branch `current` tiles already look, so it is
   consistent, but it is not *good*. Fixing it means editing `utils-1.js` and `render.js`,
   both shared and both out of scope. Recommend a single rendering pass across all three
   groups' feature objects once groups 2/3 land.
3. **Bestiary totals grow by 69** (45+12+3 creatures, 9 objects) with no unlock/`locked:`
   entries and no `STAGE_LIST` pages for `frozendesert`/`badlands`/`beach`, which
   `startFloor` now actively records via `markBestiarySeen('seenStages', …)`. Completion
   percentages will read short. Same class of issue the coordination pass already flagged;
   not fixable inside group 1's files.
4. **Nothing here has been played.** Telegraph lengths, projectile speeds and the ring/fan
   counts are authored against the numbers used by comparable existing behaviors, but a
   pattern that reads fine as code can still be unfair at speed — the superbosses' phase
   2s (ICE Agent's shielded blink phase, G5's undertow) are the most likely to need a pass
   after real play. All of them are single-number tunings inside `ai-stage4-6.js`.
5. **Player-shoving is a new interaction surface.** `g1ShovePlayer` is collision-checked,
   so it cannot push through walls, but three enemies, one boss and one superboss use it,
   and stacking several pullers in one room (`blquicksandmaw` × N, which `weight:0.6` makes
   unlikely but not impossible) has never been tested. Pushes are per-frame `dt`-scaled
   except the deliberate one-shot surges, which are the ones to watch.
6. **`dustvent` is walkable *and* a projectile emitter**, a combination no existing
   obstacle uses. `combat-4.js`'s `updateObstacles` reads `def.projectile` independently of
   `walkable`, so it works, but standing directly on top of one is untested (its bolts
   spawn at its own centre and travel outward, so it should be a safe spot — arguably a
   feature, arguably a bug).
