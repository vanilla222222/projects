# Phase 7h (cont.) — The Void Between, PART 1 (floorKey `'8D'`) achievement audit

Sub-batch 3 of ~4 covering the D-branch's ~800-achievement allocation. Scope: **floorKey `'8D'` only** (floorNum 7), a 33-entry themed enemy roster. `'8D'` has no superboss of its own — the region's superboss, `singularity`, sits on `'10D'` and is covered by the next sub-batch.

## Files changed

- `js/achievements/defs-11.js` — **new file**. 91 achievements (33 `addTierSet` calls + 19 `addAchievement` calls), plus the `checkVoidBetweenCollection` helper and `VOIDBETWEEN_8D_ROSTER_IDS`/`VOIDBETWEEN_WATCH_IDS`.
- `index.html` — one new `<script src="js/achievements/defs-11.js"></script>` line, after `defs-10.js`, before `logic.js`.
- `js/data/items-5.js` — 81 new `vbtrophy_*` trophy passive items + 5 new capstone items (`hullshardcore`, `driftwardenplate`, `hullblinkanchor`, `voidchronometer`, `voidbetweenheart`).
- `js/data/trinkets-2.js` — 3 new capstone trinkets (`voidsummonschit`, `shadowhulkveil`, `hollowdriftpouch`), `pendingReward:true`.
- `js/data/familiars-2.js` — 2 new capstone familiars (`hulkmarksmandrone`, `coldstarwisp`), `behavior:'orbiter'`.
- `js/systems/items-1.js` — wired all 91 new pickups into `recalcPlayerStats`: 81 trophies round-robin across the luck/speed/meleeDamage/rangedDamage/fire-rate channels; capstones added to the matching channel (melee+ranged "+1 all attacks", stun chance, fire-rate, shop discount).
- `js/systems/items-2.js` — added `driftwardenplate` to the heart-container `applyPassiveEffect` chain.
- `js/systems/combat-2.js` — added the `VOIDBETWEEN_WATCH_IDS`-guarded call to `checkVoidBetweenCollection(game)` in `handleEnemyDeath`.
- `js/game.js` — `startFloor()`: new `floorNum === 7` case (`exploration_reach_8d` + `challenge_voidbetween_8d_speedrun`), inside the existing `floorPath === 'D'` block. `descend()`: new `floorPath === 'D' && dungeon.floorNum === 7` block (placed right after the existing `floorsClearedNoDamage` bump, before the D-branch progression advances `floorNum`) firing `challenge_voidbetween_8d_nodamage`/`_frugal`/`_untouched`.
- `js/CODE_REFERENCE.md` — updated the `defs-1.js through defs-10.js` heading/count to `defs-1.js through defs-11.js` / 2627, and added a new Phase 7h (cont.) Void Between PART 1 subsection following the exact style of the Observatory/Orrery subsections.

## Investigation summary (Step 1)

- Read `defs-9.js` (Observatory) in full as the structural precedent for trophy/capstone/Collection patterns; also skimmed `defs-10.js` (Orrery) for the analogous single-floorKey adaptation needed here.
- Confirmed the live `'8D'` roster via `grep -n "floorKey:'8D'" js/data/enemies/types-4.js`: 33 enemies (`voidwisp`, `derelictmoth`, `wreckspark`, `hullplate`, `driftram`, `silentturret`, `driftleaper`, `voidslinger`, `wreckmortar`, `stardrift`, `hulkwatcher`, `debrissatellite`, `hulltunneler`, `driftmites`, `wreckhusk`, `voidcaller`, `hullmender`, `driftwarden`, `hulkmarksman`, `hullblink`, `shadowhulk`, `derelicthound`, `comethusk`, `wreckslinger`, `hullspark`, `duskmoth`, `hulkram`, `driftmortar`, `wrecktunneler`, `driftsatellite`, `derelictsentinel`, `driftblink`, `hullbulwark`), one entry per AI behavior family.
- Confirmed `D_PALETTES.voidbetween` in `js/data/stages.js`: `accent:'#9ab8ff'` (cold pale blue), `floorA:'#141426'`/`floorB:'#1a1a30'` near-black indigo — used throughout for capstone flavor/color choices.
- Re-confirmed reward-pool exhaustion: `shopDiscount` (12/12 `SHOP_KIND_LABELS` kinds already used), `pillColorId` (40/40 `PILL_COLORS` entries used), `enemyId` (60/60 `locked:true` enemies in `types-4.js` already used) — all fully exhausted, unchanged from every prior Phase 7f/7g/7h finding.
- Checked pre-existing achievement collisions on all 33 `'8D'` ids: `grep -l "bestiaryId:'<id>'" js/achievements/defs-*.js` for each returned nothing — zero collisions, confirmed live.
- Confirmed `addTierSet`/`addAchievement`/`unlockAchievement`/`bumpBestiaryCount`/`checkBestiaryAchievements` machinery in `core.js`/`logic.js` needed no changes — every predicate shape used here (bestiary kill-count ladder, bestiary breadth via a bespoke scoped checker, Predicate D hand-wired hooks) already exists.
- Investigated `game.js`'s `descend()`/`startFloor()` for the exact no-superboss floor-clear pattern: `descend()` already runs a floorNum-agnostic `floorsClearedNoDamage` bump using `player.tookDamageThisFloor` at the top, evaluated BEFORE `this.dungeon.floorNum` advances — the natural, already-existing anchor point for a floorKey-scoped no-damage check that doesn't depend on a boss room. Reused that same timing rather than inventing new floor-clear detection.

## Reward strategy (Step 2)

- **BULK**: 81 freshly-minted `vbtrophy_*` trophy passive items (`quality:1`, `locked:true`, `unlockedBy`), each granting one of the same five +1-stat archetypes every prior Phase 7f/7g/7h batch cycled: +1 Luck, +5% movement speed, +1 melee damage, +1 ranged damage, "recharge slightly faster" (fire-rate). Assigned round-robin (index mod 5) across the flattened declaration order (66 Slayer tier ids, then the Challenge no-damage trophy, then the Exploration reach trophy, then 11 meet-trophies, then 2 Collection trophies) — identical channel-assignment method to `defs-9.js`/`defs-10.js`.
- **CAPSTONE (10 of 91 — within the 8-15 bound)**: Void-Between-themed (cold, empty, drifting derelict wreckage, dying starlight, accent `#9ab8ff`), fully separate from `SUPERBOSS_REWARDS`:
  - 6 Slayer flagship tier-3 rewards (one per distinct AI behavior not already showcased on a single trophy rung): `hullshardcore` (item, splitter/`wreckhusk`), `voidsummonschit` (trinket, summoner/`voidcaller`), `driftwardenplate` (item, shielder/`driftwarden`), `hulkmarksmandrone` (familiar, sniper/`hulkmarksman`), `hullblinkanchor` (item, teleporter/`hullblink`), `shadowhulkveil` (trinket, ambusher/`shadowhulk`).
  - 3 Challenge capstones: `voidchronometer` (item, speedrun), `hollowdriftpouch` (trinket, frugal), `coldstarwisp` (familiar, untouched-run).
  - 1 Collection grand-tier capstone: `voidbetweenheart` (item, full 33-roster).
- Every achievement has a real, functioning reward — verified by cross-referencing every `itemId`/`trinketId`/`familiarId` in `defs-11.js` against its data-table definition (zero dangling references) and by confirming every minted pickup is referenced by exactly one achievement.

## Authoring summary (Step 3) — achievement counts by category

| Category | Count | Shape |
|---|---:|---|
| Slayer | 72 | 33 `addTierSet` calls: 27 non-flagship enemies get 2 tiers (10/40), 6 flagship enemies get 3 tiers (10/40/100, tier 3 = capstone) |
| Challenge | 4 | `challenge_voidbetween_8d_speedrun`/`_nodamage`/`_frugal`/`_untouched` — all Predicate D, hand-wired in `game.js` |
| Exploration | 12 | `exploration_reach_8d` + 11 "First Sight" Predicate-B achievements (1/3 of the roster) |
| Collection | 3 | `collection_voidbetween_t1`/`_t2`/`_t3` (11/22/33 of the 33-entry roster) via a bespoke scoped-breadth checker |
| **Total** | **91** | within the 90-110 target band |

## File placement (Step 4)

- `js/achievements/defs-11.js` created; `index.html` gained one script line after `defs-10.js`, before `logic.js`.
- New locked pickups landed in the same data files prior batches used: `items-5.js` (trophies + item capstones), `trinkets-2.js` (trinket capstones), `familiars-2.js` (familiar capstones).

## CODE_REFERENCE.md (Step 5)

Added a new Phase 7h (cont.) Void Between PART 1 subsection in `js/CODE_REFERENCE.md`, following the exact style/structure of the Observatory (`defs-9.js`) and Orrery (`defs-10.js`) subsections (Reward-economy / Slayer / Challenge / Exploration / Collection / Verified bullets). Also updated the `defs-1.js through defs-10.js` heading and its `ACHIEVEMENTS.length` figure to `defs-1.js through defs-11.js` / 2627.

## Verification (mandatory — exact output)

1. **`node --check` on every touched file**: `defs-11.js`, `items-5.js`, `trinkets-2.js`, `familiars-2.js`, `items-1.js`, `items-2.js`, `combat-2.js`, `game.js` — all `OK`.
2. **Full repo-wide sweep** (`for f in $(find js -name "*.js"); do node --check "$f" ...`): clean, zero `FAIL` lines.
3. **Node harness** loading every `<script>` from `index.html` except `js/main.js`, `js/ui/ui.js`, `js/ui/render.js`, `js/ui/roomEditor.js`, `js/ui/bestiary.js` (including all `achievements/*.js` files and `logic.js`): `ALL LOADED OK`, zero thrown errors.
4. **`ACHIEVEMENTS.length`**: **2536 before → 2627 after**, delta **91**, exactly matching 72 Slayer + 4 Challenge + 12 Exploration + 3 Collection.
5. **Zero duplicate achievement `id`** across the full 2627-entry array (`duplicate ids = 0`).
6. **Zero *new* reward-target collisions** across the full array — the only collision found is the pre-existing `itemId:championscrown` shared by all 25 `completionist_<class>` achievements (predates this batch, explicitly expected/ignored per the dispatch).
7. **Stat-tracking**: no new stats were added. Every Challenge/Exploration hook reuses existing fields (`player.tookDamageThisFloor`, `player.visitedShopThisRun`, `player.tookDamageThisRun`, `game.runElapsed`) and existing call sites (`bumpBestiaryCount`/`checkBestiaryAchievements` for Slayer/Exploration-meet, a bespoke scoped checker reading the existing `unlocks.bestiary.enemyKills` bucket for Collection). N/A beyond confirming no new stat definitions were needed.
8. **Every new locked pickup has a complete valid data-table entry, referenced by exactly one achievement, and is absent from `SUPERBOSS_REWARDS`'s consumed list**: 91 minted pickups checked (81 trophies + 10 capstones), all with exactly 1 achievement reference; the 3 new trinkets (`voidsummonschit`, `shadowhulkveil`, `hollowdriftpouch`) confirmed absent from `SUPERBOSS_REWARDS`'s consumed `trinketId` set.
9. **Cross-checked every reward-target id referenced in `defs-11.js`** (`itemId`/`trinketId`/`familiarId`) against its actual data-table definition (`ITEMS`/`TRINKETS`/`FAMILIAR_TYPES`): zero missing/dangling references.
10. **Functional smoke test** (live harness, stubbing only `loadUnlocks`/`saveUnlocks`/`toast` — normally provided by the excluded `main.js`/`ui.js`):
    - 10× `bumpBestiaryCount('enemyKills','voidwisp',1)` → `slayer_voidwisp_t1` unlocked, `vbtrophy_slayer_voidwisp_t1` granted. ✅
    - 11 distinct `'8D'` roster kills + `checkVoidBetweenCollection(game)` → `collection_voidbetween_t1` unlocked. ✅
    - Direct `unlockAchievement('challenge_voidbetween_8d_speedrun', game)` → achievement + `voidchronometer` item granted. ✅
    - Live `Player('earth')` with `passives.vbtrophy_slayer_voidwisp_t1 = 1`, after `recalcPlayerStats`: `player.luck === 1` (base 0 + trophy). ✅
    - Live `Player('earth')` with `passives.voidbetweenheart = 1` ("+1 all attacks" capstone), after `recalcPlayerStats`: `meleeDamage` 2→3, `rangedDamage` 0→1 (vs. an unmodified baseline `Player`). ✅
    - Live `Player('earth')`, `applyPassiveEffect(..., ITEMS['driftwardenplate'])` (heart-container capstone): `redMax` 6→7. ✅

## Deviations from the dispatch (with justification)

- **Challenge count is 4, not the 6-8 a superboss-anchored block usually carries.** The dispatch explicitly calls for floorKey-scoped feats here since `'8D'` has no superboss (speedrun/no-shopping/no-damage), and I added a 4th (`_untouched`, reusing `tookDamageThisRun`) as a natural sibling to the other three floor-clear checks, matching the shape (if not the full count) of a superboss's Challenge block. No `_onehearted`/`_flawless`-equivalent exists here since those are inherently boss-room-scoped predicates with no floor-wide equivalent.
- **Collection is 3 tiers, not the 6-tier-plus-grand split** Observatory/Orrery needed for their 2-floorKey slices — called out explicitly in the dispatch as the expected shape for a single-floorKey batch, and confirmed by the file's own doc comment.
- **Total lands at 91**, just above the 90-110 target's lower edge — a deliberate consequence of: 33-enemy roster (half of Observatory/Orrery's 66) × 2-tier ladders, minus the entire superboss-adjacent Challenge tier that inflated those batches' counts, plus a smaller (11-of-33 vs. 18-of-66) but proportionally equivalent (1/3) Exploration first-sight slice.
