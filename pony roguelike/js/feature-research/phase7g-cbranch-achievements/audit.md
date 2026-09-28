# Phase 7g audit — C-branch (`'11C'`/Mangrove DNB) achievement batch

**Note on provenance:** the implementer that authored this batch was terminated mid-session by an
API session-limit error immediately after finishing all data/code edits, before it could write this
audit or the CODE_REFERENCE.md entry. This file was reconstructed and verified independently
(orchestrator pass) by re-deriving the exact numbers from the live codebase rather than from the
implementer's own claims — every number below was re-checked via a fresh Node harness load, not
copied from a partial transcript.

## Files changed

- `js/achievements/defs-8.js` — **new file**, 93 achievements.
- `index.html` — one new `<script src="js/achievements/defs-8.js"></script>` line, after `defs-7.js`, before `logic.js`.
- `js/data/items-5.js` — Phase 7g trophy items block (`mgtrophy_*`, 80 entries) + Phase 7g capstone items block (`barnaclecrown`, `mangrovecanopyheart`, `tidewardenaegis`, `viperscoil`, `tidalclock`).
- `js/data/trinkets-2.js` — Phase 7g capstone trinkets (`rootboundtalon`, `crocshadefang`, `stillbrackwater`, `emptycreel`, `brackishvariant`), all `locked:true, pendingReward:true` (so `SUPERBOSS_REWARDS`'s `TRINKET_LIST.filter` sweep skips them).
- `js/data/familiars-2.js` — Phase 7g capstone familiars (`siltswarmling`, `saltboundwisp`, `lasttidewatcher`).
- `js/systems/items-1.js` — every one of the 80 trophies + 8 capstone items/trinkets wired into a real `recalcPlayerStats` formula term (luck/speed/meleeDamage/rangedDamage/fire-rate channels), marked with `// Phase 7g` comments.
- `js/game.js` — two new hook blocks: a `floorNum === 10` reach/speedrun check (mirrors the Phase 7f floorNum 12/13 pattern) and a `superbossId === 'mangrove'` Challenge block in `onBossDefeated()` (mirrors the existing `polish`/`wobbler`/`subdrop` blocks).
- `js/systems/combat-2.js` — one new hook in `handleEnemyDeath`, guarded by a Mangroves-scoped watch-id `Set`, calling a bespoke `checkMangrovesCollection(game)` function (declared in `defs-8.js`) for the Collection category's scoped breadth achievements.
- `js/CODE_REFERENCE.md` — Phase 7g subsection added (this pass).

## Achievement breakdown (93 total, verified via live harness)

- **Slayer (66 achievements, 33 `addTierSet` calls, 2 tiers each)** — bestiary kill-count ladders over `'11C'`'s 33-entry roster (21 base behaviors + 12 flavor variants), ids `slayer_<enemyid>_t1`/`_t2`.
- **Exploration (14 achievements)**: `exploration_reach_11c` (floor-reach milestone) + `exploration_meet_mangrove` (first `mangrove` encounter) + 12 "First Sight" Predicate-B achievements (`bestiarySection:'enemyKills'`, `threshold:1`) over a representative slice of the `'11C'` roster.
- **Challenge (7 achievements, hand-wired Predicate D)**: `challenge_mangrove_flawless`, `challenge_mangrove_floor_nodamage`, `challenge_mangrove_onehearted`, `challenge_mangrove_speedkill`, `challenge_mangrove_frugal`, `challenge_mangrove_untouched_run` (all in `mangrove`'s `onBossDefeated()` block, reusing existing `tookDamageThisBossRoom`/`tookDamageThisFloor`/`tookDamageThisRun`/`redMax`/`visitedShopThisRun` flags — no new stat), plus `challenge_mangroves_speedrun` (floorNum 10 `startFloor()` check reusing `game.runElapsed`).
- **Collection (6 achievements)**: `collection_mangroves_roster_t1`/`_t2`/`_t3` (11/22/33 of the full roster), `collection_mangroves_flavors` (all 12 flavor variants), `collection_mangroves_originals` (all 21 base behaviors), `collection_mangroves_grand` (all 33 + `mangrove` itself = 34). Backed by `checkMangrovesCollection`, reading the existing `unlocks.bestiary.enemyKills` bucket — no new stat, no new bestiary bucket, same pattern as Phase 7f's `checkHollowChorusFinalWaveformCollection`.

Does **not** touch the pre-existing `sb_mangrove_<class>` superboss grid (25 achievements, `defs-1.js`'s `SUPERBOSS_REWARDS` loop).

## Reward-economy finding

Consistent with Phase 7f's finding: `shopDiscount`, `pillColorId`, and `enemyId` reward pools were re-confirmed exhausted (no new collisions attempted against them). Strategy: 80 freshly-minted single-purpose `mgtrophy_*` trophy items (collision-free by construction) for the Slayer/Exploration/Challenge bulk, plus 13 freshly-minted capstone items/trinkets/familiars (Mangroves-themed: silt-brown brackish water, salt-bleached roots, tidal — accent `#d8c88a`) for the ladder-capstone/Collection-grand/hardest-Challenge rungs. Every reward is wired into a real stat effect — none is inert.

## Verification (re-run independently, exact numbers)

1. `node --check js/achievements/defs-8.js` → clean.
2. Full sweep of every `js/**/*.js` via `node --check` → **ALL CLEAN**, zero failures.
3. Node `vm` harness loading every `index.html` `<script>` except `main.js`/`ui.js`/`render.js`/`roomEditor.js`/`bestiary.js` (all achievement defs files + `logic.js` included) → loads with **zero thrown errors**.
4. `ACHIEVEMENTS.length`: 2083 (post-7f) → **2176** (delta **93**, exact match to the batch's own count).
5. Zero duplicate achievement `id`s across the full 2176-entry array.
6. Reward-target collision scan across the FULL array (`itemId`/`trinketId`/`familiarId`/`starId`/`pillColorId`/`enemyId`): **24 collisions found, all on `itemId:championscrown`** — this is the pre-existing, intentional 25-way share among all `completionist_<class>` achievements (documented and flagged as expected in Phase 7f's audit too). **Zero new collisions introduced by this batch.**
7. Cross-checked all 93 reward-target ids referenced in `defs-8.js` (80 `mgtrophy_*` + 13 capstones) against their data-table definitions: **all 93 exist, fully defined, zero missing/dangling references** — this specifically ruled out the risk that the implementer's session-limit termination left a half-wired reward.
8. Category split (re-derived from the live array, not implementer claims): Slayer 66 / Exploration 14 / Challenge 7 / Collection 6 = 93.
9. Confirmed via grep that all new `js/game.js`/`combat-2.js` hooks exist and are wired at real, reachable call sites (not dead code) — `floorNum === 10` block in `startFloor()`, `superbossId === 'mangrove'` block in `onBossDefeated()`, the Mangroves watch-id `Set` guard in `handleEnemyDeath`.

## Deviations from plan

None beyond what Phase 7f itself already established as precedent (trophy-item reward strategy, scoped-breadth Collection bespoke function). No new stat-tracking code was needed beyond the two mirrors of existing per-floor/per-superboss hook patterns — consistent with the "minimal and precedented" directive.
