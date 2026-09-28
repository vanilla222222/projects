# Phase 10 — stage content coordination pass (audit)

Infra/coordination pass. Two jobs: make the extended main route actually walkable
(floor 14 stops ending the run, floor 34 starts ending it), and lay down pre-registered
file skeletons so three parallel content implementers never touch the same file.
No real content authored — one placeholder per stage per file, nothing more.

## Files changed

| File | Change |
| --- | --- |
| `js/data/stages.js` | +`MAIN_ROUTE_FINAL_FLOOR = MAX_FLOORS - 1` (34) |
| `js/game.js` | `descend()` extended-route range block; `isLastFloorOfRun()` matching line; `startFloor()` bestiary branch for floorNum 15+; two comment blocks corrected |
| `index.html` | +12 `<script>` tags in three load-order-critical positions |
| `js/data/enemies/stage4-6-enemies.js` | **new** — 3 placeholder enemies, stages 4-6 |
| `js/data/enemies/stage7-9-enemies.js` | **new** — 3 placeholder enemies, stages 7-9 |
| `js/data/enemies/stage10-13-enemies.js` | **new** — 4 placeholder enemies, stages 10-13 |
| `js/data/enemies/stage4-6-bosses.js` | **new** — 3 placeholder bosses |
| `js/data/enemies/stage7-9-bosses.js` | **new** — 3 placeholder bosses |
| `js/data/enemies/stage10-13-bosses.js` | **new** — 4 placeholder bosses |
| `js/data/enemies/stage4-6-superbosses.js` | **new** — ICE Agent DNB, Mexico DNB, G5 DNB |
| `js/data/enemies/stage7-9-superbosses.js` | **new** — Japan DNB, DeanNB, Israel DNB Prime Prime |
| `js/data/enemies/stage10-13-superbosses.js` | **new** — Palestine DNB, Warden DNB, Notch DNB, The One True Kirkinator |
| `js/data/roomTemplates/stage4-6-floorfeature.js` | **new** — 3 floor-gated placeholder templates |
| `js/data/roomTemplates/stage7-9-floorfeature.js` | **new** — 3 floor-gated placeholder templates |
| `js/data/roomTemplates/stage10-13-floorfeature.js` | **new** — 4 floor-gated placeholder templates |
| `feature-research/phase10-metaprogression/stage-content-targets.md` | **new** — the coordination doc |
| `js/CODE_REFERENCE.md` | new "Phase 10 — stage content coordination pass" section |

---

## Task 1 — extending the main route past floor 14

### What the win flow actually was

`descend()` is the only place `state = 'win'` is ever set (grep confirms: three sites, all
in `descend`). There is no separate credits/run-summary module to touch —
`main.js:528`'s `game.state === 'win'` block renders the win screen off that flag, and
`endRunUnlocks()` does the persistence. So "the win flow" is exactly `this.state = 'win';
endRunUnlocks(); return;` and nothing else, which is why this change could be confined to
which floors *reach* those three lines.

Pre-change main-path chain: `floorNum 8..13` each had a hardcoded `startFloor(n+1)` early
return; **floorNum 14 deliberately had none**, so it fell into
`const next = floorNum + 1; if (next >= this.maxFloorsThisRun) { …unlockPath('C')…; win }`.
`maxFloorsThisRun` is only ever 6 or 8, so 15 >= 8 won the run.

### The change

One block inserted after the `floorNum === 13` line and before `const next = …`:

```js
if (this.dungeon.floorNum >= OLD_MAIN_ROUTE_FINAL_FLOOR && this.dungeon.floorNum < MAIN_ROUTE_FINAL_FLOOR) {
  if (this.dungeon.floorNum === OLD_MAIN_ROUTE_FINAL_FLOOR) unlockPath('C', this);
  this.startFloor(this.dungeon.floorNum + 1);
  return;
}
```

Plus `MAIN_ROUTE_FINAL_FLOOR = MAX_FLOORS - 1` (= 34, derived from `FLOOR_NAMES.length`,
so it can't drift) in `stages.js`, and the mirror line in `isLastFloorOfRun()`:
`if (f >= OLD_MAIN_ROUTE_FINAL_FLOOR) return f >= MAIN_ROUTE_FINAL_FLOOR;` — that function
carries an explicit "keep in lockstep with descend()" comment, so skipping it would have
mislabelled floors 15-34's stairs as "ESCAPE".

### The `unlockPath('C')` grant

Trigger condition is **unchanged**: taking the stairs on floorNum 14 on the Main path.
It moved *location* only, because the win branch it lived in is no longer reachable from
floor 14. Three things keep it safe:

1. The new call fires on `floorNum === OLD_MAIN_ROUTE_FINAL_FLOOR` exactly — the same
   moment the old one did (the old guard was `>= 14`, but 14 was the only main-path value
   that could reach the win branch, so `===` and `>=` were equivalent there).
2. `unlockPath` is idempotent (`if (unlocks.unlockedPaths[path]) return;`), so a second
   call is a no-op.
3. The win branch's original guard `if (!this.floorPath && floorNum >= OLD_MAIN_ROUTE_FINAL_FLOOR) unlockPath('C', this)`
   was **left in place**, so it also fires at floorNum 34 as a belt-and-braces re-grant.

### Trace (done twice, second time reading the file top-down)

| From | Path taken | Result |
| --- | --- | --- |
| floorNum 5, 6-floor run | `next=6 >= 6` → win branch; guard `5 >= 14` false | win, no unlock — **unchanged** |
| floorNum 7, 8-floor run | `descend(branch)` from Tyrone's fork → `startFloor(8)` | branch, never reaches the chain — **unchanged** |
| floorNum 13 → 14 | hardcoded `startFloor(14)` line, above the new block | **unchanged** |
| floorNum 14 → 15 | new block: `14>=14 && 14<34` → `unlockPath('C')`, `startFloor(15)` | **was win, now continues** — the intended change |
| floorNum 15…33 | new block, no unlock call (`!== 14`) | advance |
| floorNum 33 → 34 | new block: `33 < 34` → `startFloor(34)` | advance |
| floorNum 34 | new block false (`34 < 34` fails) → `next=35 >= 8` → win | **win, and only here** |
| C path, any floor | C block returns above the chain | **unchanged** |
| D path, any floor | D block returns above the chain | **unchanged** |

### C/D path final floors — no change needed

`C_LAST_FLOORNUM` (11) and `D_LAST_FLOORNUM` (9) are consumed by two blocks in `descend()`
that both sit **above** the main-path chain and unconditionally `return`, and by the two
matching lines at the top of `isLastFloorOfRun()`. Nothing I touched is above them or
alters `floorPath`. C/D floorNum ranges (2-11 and 3-9) don't overlap the new block's
14-33 window in any case. **Confirmed: no change required, and none made.**

### One extra fix Task 1 forced

`startFloor`'s bestiary line had no branch for floorNum 15+ (unreachable before this
pass). With the route open, floorNum 15 would have hit `else if (floorNum >= 12)` and
recorded stage id `'16'`, or — since `floorBranch` stays sticky from floor 9's fork —
`'16a'`. Added a leading `else if (floorNum > OLD_MAIN_ROUTE_FINAL_FLOOR)` that records
`STAGES[stageIndexForFloor(floorNum)].id` instead, matching what floors 0-7 do. Floors
12/13/14 keep their `'13'/'14'/'15'` ids byte-identically (the new branch's condition is
`> 14`, so it cannot claim them).

---

## Task 2 — the twelve skeleton files

### Merge mechanism, per file kind (copied, not invented)

Read first, then matched:

- **`types-4.js`** → `Object.assign(ENEMY_TYPES, {...})`. `ENEMY_TYPES` is a `const`
  declared in `types-1.js`; `lists.js` then does `const ENEMY_LIST = Object.values(ENEMY_TYPES)`
  **once**. My three enemy files use `Object.assign` identically and are registered in
  `index.html` between `types-4.js` and `lists.js`, so the snapshot picks them up. This is
  the one case where load order alone is sufficient.
- **`bosses.js`** → `const BOSS_TYPES = {…}` followed by `const BOSS_LIST = Object.values(BOSS_TYPES)`
  on the file's last line. A later file therefore **cannot** rely on the snapshot, and
  cannot re-declare the `const`. My boss files declare a local
  `STAGEn_m_BOSS_TYPES`, then `Object.assign(BOSS_TYPES, X)` **and**
  `BOSS_LIST.push(...Object.values(X))`. Both are needed: `resolveGenericBoss` filters
  `BOSS_LIST`, while id lookups go through `BOSS_TYPES`.
- **`superbosses.js`** → same shape as bosses.js; same two-step used.
- **`floorfeature.js`** → `ROOM_TEMPLATES.floorfeature = [ … ]`. My files `.push(...)` onto
  that array, which is both the room-editor export form and precisely what that file's own
  header comment tells later phases to do.

### Entries added (placeholders only)

10 enemies (`placeholder_<stage>_1`, `behavior:'chaser'`, `xpTier:2`, `stage:` 4-13 — one
per stage), 13 bosses (`behavior:'bossWarlord'`, `stage:` 4-13 — one per stage), 10
superbosses under the exact names given, and 10 floor-feature templates
(`{"m":[[1]],"f":[a,b]}`, one per stage).

Superboss `behavior` values reuse existing routines per the established convention:
`bossFrostSentinel`, `bossSandWyrm`, `bossStormbringer` (×2), `bossIronBastion`,
`bossIsrael`, `bossEclipseWraith`, `bossSlagbound`, `bossBrickGolem`, `bossOneTrueDnb`.
All ten were grepped against `combat-3.js`'s dispatch switch — each has exactly one
`case`. `'chaser'` and `'bossWarlord'` likewise. No behavior string in any new file is
undispatched.

Superbosses are **not** wired into `game.js`'s floorNum dispatch, as instructed — they
register into `SUPERBOSSES`/`SUPERBOSS_LIST` and wait for the content pass.

### Floor gating

`f:[…]` is the existing filter: `dungeon.js`'s `templateAllowsFloor` runs
`if (tmpl.f && !tmpl.f.includes(floorNum)) return false;`. Values are floorNums, not HUD
floors: 15-16, 17-18, … 33-34. The base pool's untagged `{"m":[[1]]}` has no `f`, so it
stays eligible on every floor and the pool can never empty — which matters, since
`generateDungeon` attaches a `floorfeature` room **guaranteed** on every floorNum > 14.

### index.html load order

Three insertion points, each chosen by the constraint above:

1. enemy files **between** `types-4.js` and `lists.js` (before the `ENEMY_LIST` snapshot);
2. boss files **after** `bosses.js`, superboss files **after** `superbosses.js` (both
   objects must exist before merging; both files push their own list entries);
3. floorfeature files **after** `floorfeature.js` (which is itself after `core.js`, where
   `ROOM_TEMPLATES` is declared).

Every new file only references globals declared strictly above it: `ENEMY_TYPES`
(types-1.js), `BOSS_TYPES`/`BOSS_LIST` (bosses.js), `SUPERBOSSES`/`SUPERBOSS_LIST`
(superbosses.js), `ROOM_TEMPLATES` (roomTemplates/core.js). Nothing below the data block
was reordered. `room-editor.html` loads no enemy or room-template files, so it needed no
change (same finding as the previous pass).

---

## Verification

- **`node --check` clean** on all 14 touched/created `.js` files (`game.js`, `stages.js`,
  and the 12 new ones).
- **Behavior-name validity:** every `behavior:` string in the new files grepped against
  `js/systems/combat-3.js` — 12/12 have exactly one `case`.
- **Id collisions:** grepped all 23 new ids (`placeholder_*`, `iceagent`, `mexico`, `g5`,
  `japan`, `deannb`, `israelprimeprime`, `palestine`, `warden`, `notch`, `kirkinator`)
  across `js/` — zero hits outside the new files. `israelprimeprime` deliberately extends
  the existing `israel`/`israelprime` line without colliding with either.
- **Merge reasoning (can't run a page load):** after all scripts execute,
  `ENEMY_TYPES` has the 10 new keys (Object.assign before the snapshot) so `ENEMY_LIST`
  contains them; `BOSS_TYPES`/`BOSS_LIST` and `SUPERBOSSES`/`SUPERBOSS_LIST` each get both
  halves explicitly, so both views agree; `ROOM_TEMPLATES.floorfeature` grows from 1 to 11
  entries. The one mechanism I could not observe directly is the `ENEMY_LIST` snapshot
  timing — it is inferred from `lists.js` line 3 (`const ENEMY_LIST = Object.values(ENEMY_TYPES);`)
  plus the `index.html` ordering, which is exactly the contract `types-2/3/4.js` already
  rely on.
- **Pool reachability:** `resolveGenericBoss(floorNum, branch)` → `floorKeyFor` returns
  `null` for floorNum 15+ → falls to `BOSS_LIST.filter(b => b.stage === stageIndexForFloor(floorNum))`,
  which now matches the new placeholders. `resolveGenericEnemy` reaches them via its
  second filter (`stage` only) — see the risk note below on `xpTier`.
- **Floors 0-13 and C/D unchanged:** verified by the trace table above; every legacy line
  in `descend()` was left byte-identical and the new block is bounded on both sides.

---

## Deviations

1. **Added `MAIN_ROUTE_FINAL_FLOOR`** (not in the plan) rather than writing a literal 34
   in `game.js`. Derived from `MAX_FLOORS`, mirroring how `OLD_MAIN_ROUTE_FINAL_FLOOR`
   already documents the other boundary.
2. **Touched `startFloor`'s bestiary branch.** Strictly beyond "floor advance", but Task 1
   makes floorNum 15+ reachable and the existing branch would have minted junk stage ids
   (`'16'`, `'16a'`) on the very first new floor. Flagged rather than silently deferred.
3. **`unlockPath('C')` call moved location** (not trigger). The task said don't change the
   condition; the old call site is unreachable from floor 14 now by construction, so the
   call was re-sited at the identical moment and the old guarded call left in place too.
4. **Boss/superboss files use a named local const + push**, which is a *shape* not present
   in the codebase (existing boss/superboss data lives in exactly one file each, so no
   precedent existed for "a second file merging in"). The two primitives —
   `Object.assign` onto the type object, and mutating the list — are both existing
   conventions; only their combination is new, and it is forced by the snapshot.
5. **12 new files, not 9.** The task header said "3 files per group" but enumerated four
   items (enemies / bosses / superbosses / floorfeature); I built all four per group.

---

## Open risks

1. **Task 1 is the high-risk change in this pass, and it is a genuine behavior change to
   the game's ending.** The run no longer ends where every existing save's muscle memory
   says it does; a player who reaches floor 15 will now keep descending into twenty floors
   of placeholder content. Between this pass and the content pass, the main route is in a
   deliberately *worse* playable state than before — twenty floors of one-chaser-enemy,
   one-warlord-boss rooms with no superbosses. If that is not acceptable to ship
   intermediately, this pass and the content pass must land together.
2. **No superboss on any floor 15-34 yet.** `resolveGenericBoss` gives every one of those
   floors a placeholder regular boss instead. Intentional (dispatch wiring is the content
   pass's), but it means the run currently has no final boss at floorNum 34 — clearing a
   placeholder wins the game.
3. **`xpTier` parity is inverted on the new stages.** `resolveGenericEnemy` filters on
   `(e.xpTier||1) <= 1 + (floorNum % FLOORS_PER_STAGE)`. Legacy stages start on even
   floorNums, the new ones start on odd (15), so within each new stage the *first* floor
   gets the wider pool and the second the narrower — the reverse of the intent. It
   degrades safely via the unfiltered fallback (which is why the `xpTier:2` placeholders
   still spawn on floorNum 16), but content implementers cannot use `xpTier` for an
   intra-stage difficulty ramp. Documented in the coordination doc; not fixed here,
   because changing that formula would alter legacy-stage spawn pools.
4. **Bestiary totals grow by 33 undiscoverable placeholder rows** (10 enemies, 13 bosses,
   10 superbosses) — `bestiary.js` builds its tabs straight off `ENEMY_LIST`/`BOSS_LIST`/
   `SUPERBOSS_LIST`. Completion percentages will read short until the content pass
   replaces them. Same class of issue as the previous pass's `OBSTACLES.floorswitch` note.
   Also still open from that pass: `STAGE_LIST` has no pages for the ten new stage ids,
   which `startFloor` now actively records.
5. **Three groups will all edit `js/systems/combat-3.js`** (the AI dispatch switch) and the
   `ai-1..4.js` files. Those are the only genuinely shared files left, and the file split
   in this pass cannot protect them. The coordination doc asks each group to append one
   contiguous, group-labelled block to each switch; a merge conflict there is the most
   likely way the parallel passes collide.
6. **Difficulty is entirely unbalanced.** Placeholder stats are a crude monotonic ramp
   purely so the ordering is visible; they are not tuned against `bossHpScale`
   (1.28^floorNum), which at floorNum 34 is astronomically large. Nothing on floors 15-34
   should be assumed playable until the content pass tunes it.
