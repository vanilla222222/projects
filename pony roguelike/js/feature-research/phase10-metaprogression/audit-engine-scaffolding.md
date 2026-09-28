# Phase 10 — engine scaffolding pass (audit)

Foundational, content-free pass: extended main route (data only), a global damage cap, a
per-floor special-object room hook, two skill-tree engine knobs, and path gating for the
C/D branches. No enemies, bosses, superbosses, skill-tree nodes or rebalance work — all
explicitly out of scope for this dispatch.

## Files changed

| File | Change |
| --- | --- |
| `js/data/stages.js` | +10 `STAGES` entries (idx 4-13), +20 `FLOOR_NAMES` entries (idx 15-34), new `LEGACY_STAGE_COUNT` and `OLD_MAIN_ROUTE_FINAL_FLOOR` consts, two-range `stageIndexForFloor` |
| `js/systems/combat-1.js` | `playerDamageAmount` final line now caps at 4 |
| `js/systems/dungeon.js` | `'floorfeature'` room type + guaranteed attach on new floors + returned node; `cpathgate`/`planetarium` attaches gated on `isPathUnlocked` |
| `js/data/roomTemplates/floorfeature.js` | **new file** — one plain placeholder template |
| `js/data/collectibles.js` | +`OBSTACLES.floorswitch` placeholder kind |
| `js/achievements/skilltree.js` | `SKILL_TREE_STAT_CAP_OVERRIDES` + per-stat clamp in `getSkillTreeStatBonus` |
| `js/entities/entities.js` | +`Player.crystalVolleySpacing` shadow field |
| `js/systems/combat-2.js` | `CRYSTAL_VOLLEY_SPACING` → `CRYSTAL_VOLLEY_SPACING_DEFAULT`; offsets read the shadow field |
| `js/achievements/core.js` | +`isPathUnlocked(path)`; save-shape doc block updated |
| `js/achievements/logic.js` | `ensureUnlockShape` defaults `unlocks.unlockedPaths`; +`unlockPath(path, game)` |
| `js/game.js` | `descend()` grants `C` (main-route clear) and `D` (C-route clear) |
| `index.html` | +`<script src="js/data/roomTemplates/floorfeature.js">` after `normal-4.js` |
| `js/CODE_REFERENCE.md` | new "Phase 10 — engine scaffolding" section at the end |

## Task 1 — extended main route

- **`OLD_MAIN_ROUTE_FINAL_FLOOR = 14`** (exported const in stages.js) — the pre-Phase-10 final
  main-route floor, "The One True Descent" (HUD floor 15). `FLOOR_NAMES.length` was 15
  (floorNum 0-14) before this pass; it is now **35**, and `MAX_FLOORS` stays derived.
- Ten new `STAGES` entries in the fixed order given, each with a real hand-picked palette in
  the exact existing shape: `frozendesert`, `badlands`, `beach`, `ocean`, `seafloor`,
  `trench`, `trenchdepths`, `deepdark`, `metarealm`, `hyperspace`. Colour arc: pale ice →
  rust/ochre badlands → bright sand+cyan beach → progressively darker blues out to a
  near-black Deep Dark, then two deliberately unnatural hues (Meta Realm's green-on-violet,
  Hyperspace's magenta-on-indigo) for the two "outside the fiction" stages.
- Twenty new `FLOOR_NAMES` entries appended, two per stage, following the existing
  "Stage — Sub-area" style.
- `stageIndexForFloor` split into two ranges keyed off `OLD_MAIN_ROUTE_FINAL_FLOOR`; the
  legacy branch clamps to `LEGACY_STAGE_COUNT - 1` (3), **not** `STAGES.length - 1`, which is
  what preserves the old behavior now that `STAGES` is longer. Verified by evaluating the
  module standalone: floors `0,1,2,3,4,5,6,7,8,10,12,14` → `0,0,1,1,2,2,3,3,3,3,3,3`
  (identical to the old formula), and `15,16,17,20,25,33,34,40` → `4,4,5,6,9,13,13,13`.
- `floorKeyFor`, all branch/C/D/finale palettes and every floor 8-14 special case untouched.
- Hardcoded-floor-count sweep: the only non-derived consumers of the floor count are
  `ui/roomEditor.js` (uses `MAX_FLOORS` — derived, its toggle grid just grows to 35) and
  `render.js`/`room.js`/`game.js`, which index `STAGES[stageIndexForFloor(...)]` and are
  index-safe. No genuine breakage found, so nothing else was touched.

## Task 2 — global damage cap

`playerDamageAmount` now ends `return Math.min(4, Math.max(0.5, Math.round(amount*2)/2));`.
Cap applied *after* the half-heart snap so the cap value stays on HUD granularity. No call
site touched.

## Task 3 — per-floor special-object hook

`'floorfeature'` added to `SPECIAL_ROOM_TYPES` (1-entrance cap) and to `AUTO_OPEN_ROOM_TYPES`
(it holds a stage object, not a locked reward — matches `crystal`/`sombra`/`shrine`, which is
the convention checked before choosing). `generateDungeon` attaches one, guaranteed, only when
`floorNum > OLD_MAIN_ROUTE_FINAL_FLOOR`, and returns `floorfeatureNode`. New
`roomTemplates/floorfeature.js` holds a single empty `{"m":[[1]]}` so the pool is non-empty
(an empty pool would silently drop `attachSpecial` onto its blank-procedural fallback).
`OBSTACLES.floorswitch` is an inert walkable placeholder carrying `pushX/pushY:0` to document
the directional shape; nothing references it, so it cannot spawn.

## Task 4 — skill-tree engine bits

- `SKILL_TREE_STAT_CAP_OVERRIDES = { lifestealChance: 0.10 }`, consulted in
  `getSkillTreeStatBonus` as `overrides[stat] != null ? overrides[stat] : SKILL_TREE_STAT_CAP`
  (`!= null` rather than `??`, matching the file's existing ES-level style). Every other stat,
  including all other chance fields, is byte-identical in behavior.
- `Player.crystalVolleySpacing` mirrors `crystalShardCount` exactly; `combat-2.js`'s constant
  renamed to `CRYSTAL_VOLLEY_SPACING_DEFAULT` and used only as the seed plus a defensive
  fallback in the offset math. Output is unchanged at the default 34px.
- No skill-tree nodes authored, no new `skilltree-characters-N.js` file created.

## Task 5 — path gating

`unlocks.unlockedPaths = {C:false, D:false}` defaulted in `ensureUnlockShape`;
`isPathUnlocked` (core.js, beside `isEnemyUnlocked`) reads the run snapshot so a path earned
mid-run opens next run; `unlockPath` (logic.js, beside `bumpStat`) writes the live save and
toasts. Grants sit in `descend()`: `C` in the main-route win branch guarded by
`!this.floorPath && this.dungeon.floorNum >= OLD_MAIN_ROUTE_FINAL_FLOOR` (the floorNum guard
is essential — that same branch also fires on the 6/8-floor pre-Polish runs), `D` in the
C-branch win branch next to `bumpStat('cBranchRunsCompleted', …)`. Both gate rooms in
`generateDungeon` now additionally require `isPathUnlocked(...)`; locked = the room doesn't
generate, matching the locked-enemy filtering convention.

## Verification

- `node --check` clean on all 11 edited `.js` files plus the new one.
- `stageIndexForFloor` exercised standalone (see Task 1) — legacy range provably unchanged.
- Every edited region re-read; no changes outside the listed scope.
- `index.html`: the new script tag sits with the other room-template files, after `core.js`
  (which defines `ROOM_TEMPLATES`) — the new file assigns `ROOM_TEMPLATES.floorfeature`, so
  load order matters and is correct. `room-editor.html` does not load room-template files, so
  it needed no change.
- Grep for the old `CRYSTAL_VOLLEY_SPACING` name: only one hit, inside a history comment in
  `entities.js`. No dangling code reference.

## Deviations

- Added `LEGACY_STAGE_COUNT = 4` (not in the plan). Without it, keeping the legacy clamp
  correct would have meant a literal `3` inside `stageIndexForFloor`; the const makes the
  "why isn't this `STAGES.length - 1`" reason explicit.
- `unlockPath` was placed in `logic.js` (the persistence/hooks file, beside `bumpStat`) while
  `isPathUnlocked` went in `core.js` (the gate-helper file), matching the existing split
  rather than co-locating them.

## Open risks

1. **Reserved skill-node letters `i`-`l`.** The next phase's ~1250 character nodes must use
   branch-letter keys `i` through `l`; `a`-`h` are already in use across
   `skilltree-characters.js`, `-2.js` and `-3.js`. Nothing in this pass consumes them.
2. **Existing saves lose C/D access once.** `unlockedPaths` starts `false` for everyone,
   including players who had already used the C or D branch, because a save carries no record
   of "reached the old final floor". Per project convention this is accepted as a one-time
   inconvenience — clear the main route once under this build to re-open C, then the C route
   to re-open D. No save-migration heuristic was attempted.
3. **Lifesteal nodes are a live nerf.** Several existing character branches sum above 10 points
   of `lifestealChance` (e.g. Zebra/Kirin/Dragon `e2a+e3a+e3b` = 15). Fully-bought lifesteal
   builds drop to 10 points. This is the intended effect of the cap override, but it is a
   balance change to already-purchased trees, not just to future ones.
4. **New stages have no bestiary pages.** `STAGE_LIST` gained no entries, so
   `game.js`'s `markBestiarySeen('seenStages', STAGES[...].id)` on floors 15+ would record ids
   with no page. Unreachable today (`descend` still ends the run at floorNum 14) and expected
   to be filled by the content phase — flagged so it isn't forgotten.
5. **`OBSTACLES.floorswitch` adds one Bestiary Objects row** that can never be discovered
   (total goes 24 → 25). The `exploration_objectsseen` ladder's top rung is a hardcoded 24, so
   no achievement becomes unreachable; only the tab's `done/total` line reads one short at
   completion until the placeholder is replaced with real content.
6. **Floors 15-34 are data-only.** `descend()` was deliberately not extended (out of scope), so
   nothing reaches them yet and the `floorfeature` hook, while wired and guaranteed, never
   fires in play until the route extension lands.
