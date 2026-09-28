# Phase 7h (cont.) — The Void Between, PART 2 (floorKeys `'9D'`/`'10D'` + `singularity`) achievement audit

Sub-batch 4 of 4 — the LAST of the D-branch's ~800-achievement allocation, and the batch that closes out Phase 7h. Scope: floorKey `'9D'` (floorNum 8), floorKey `'10D'` (floorNum 9), and the D-branch finale superboss `singularity`, which lives on `'10D'`. Structural precedent: `defs-10.js` (The Orrery, `audit-orrery.md`) — the identical 2-floorKey + 66-enemy + 1-superboss shape, scaled to the same 180 achievements. NOT `defs-11.js`'s smaller single-floorKey PART 1 shape.

## Files changed

- `js/achievements/defs-12.js` — **new file**, 180 achievements (144 Slayer / 8 Challenge / 21 Exploration / 7 Collection) via 66 `addTierSet` + 36 `addAchievement` calls, plus the `checkVoidBetween2Collection` helper and `VOIDBETWEEN2_9D_ROSTER_IDS`/`VOIDBETWEEN2_10D_ROSTER_IDS`/`VOIDBETWEEN2_SUPERBOSS_IDS`/`VOIDBETWEEN2_WATCH_IDS`.
- `index.html` — one new `<script src="js/achievements/defs-12.js"></script>` line, after `defs-11.js`, before `logic.js`.
- `js/data/items-5.js` — 160 `vbtrophy2_*` trophy passive items + 10 capstone items (`emberhuskcore`, `darkwardenplating`, `nullblinkanchor`, `horizonhuskcore`, `horizonwardenplating`, `eventblinkanchor`, `emberchronometer`, `eventchronometer`, `lastlightheart`, `eventhorizonheart`).
- `js/data/trinkets-2.js` — 6 capstone trinkets (`nullsummonschit`, `hollowstalkerveil`, `eventsummonschit`, `silentstalkerveil`, `collapsedmoment`, `emptyeventpurse`), all `pendingReward:true`.
- `js/data/familiars-2.js` — 4 capstone orbiter familiars (`nightmarksmandrone`, `gravmarksmandrone`, `horizonwisp`, `singularitywisp`).
- `js/systems/items-1.js` — the 160 trophies wired into `recalcPlayerStats` across the five existing D-branch channel blocks (luck, speed, meleeDamage, rangedDamage, fire-rate — 32 trophy ids each), plus the capstone item/trinket terms in the meleeDamage, rangedDamage, fire-rate, stun-chance, and shop-discount formulas.
- `js/systems/items-2.js` — extended the existing heart-container `applyPassiveEffect` OR-chain with `darkwardenplating`/`horizonwardenplating`.
- `js/game.js` — `startFloor()`: new `floorNum === 8` / `floorNum === 9` reach+speedrun hooks inside the existing `floorPath === 'D'` block. `onBossDefeated()`: new `superbossId === 'singularity'` Challenge block mirroring the `orrery` one exactly.
- `js/systems/combat-2.js` — one new guarded hook line in `handleEnemyDeath` calling `checkVoidBetween2Collection(game)`, added directly beside (never replacing) the existing `VOIDBETWEEN_WATCH_IDS` check.
- `js/CODE_REFERENCE.md` — updated the `defs-1.js through defs-11.js` heading/"eleven files" sentence/`ACHIEVEMENTS.length` figure to `defs-12.js` / twelve files / 2807 and added `defs-12.js` (66 calls) to the per-file `addTierSet` list; added the Phase 7h Void Between PART 2 subsection after the PART 1 one; added the terse "**Phase 7h is now complete**" note matching the existing "Phase 7d is now complete" precedent's phrasing.

## Investigation findings

- `'9D'`/`'10D'` roster ids, display names, and AI behaviors re-confirmed live via `grep -n "floorKey:'9D'"` / `"floorKey:'10D'"` against `js/data/enemies/types-4.js` — 33 entries each, matching the dispatch's stated list exactly (ids and behavior families both), including the two splitter/summoner targets (`fadinghusk`/`nullcaller` → `embermites`; `horizonhusk`/`eventcaller` → `collapsemites`).
- `singularity` superboss confirmed in `js/data/enemies/superbosses.js`: `hp:79`, `dmg:4`, `behavior:'bossSlagbound'` (reused AI), `color:'#9ab8ff'`, `icon:'🌌'`, name `'The Singularity'`. Confirmed wired at `game.js`'s `floorNum === 9` `pendingBossType` assignment (10D). Untouched.
- `sb_singularity_<class>` achievements confirmed **already exist** — 25 of them, generated dynamically by `defs-1.js`'s `'sb_' + bossId + '_' + classId` loop over `SUPERBOSSES`, not literal strings anywhere. Not touched, and no hand-written `sb_singularity_*` entries were added.
- Grepped all 66 new enemy ids plus `'singularity'` across every `js/achievements/defs-*.js` — zero hits. No pre-existing Slayer-achievement workaround needed anywhere.
- Reward-pool exhaustion re-confirmed unchanged from every prior Phase 7f/7g/7h batch: `shopDiscount` (12/12 `SHOP_KIND_LABELS` kinds), `pillColorId` (40/40 `PILL_COLORS`), `enemyId` (60/60 `locked:true` enemies) — all fully claimed. Noted, not fixed.
- Collision scan of every new id (180 pickups + all new achievement ids + `vbtrophy2_`, `VOIDBETWEEN2_*`, `checkVoidBetween2Collection`, `voidbetween2`) against the whole `js/` tree and `index.html` — zero hits before wiring anything in. In particular the `vbtrophy2_` prefix and the `checkVoidBetween2Collection`/`VOIDBETWEEN2_WATCH_IDS` names are provably distinct from PART 1's `vbtrophy_`/`checkVoidBetweenCollection`/`VOIDBETWEEN_WATCH_IDS`.

## Reward strategy

Same as Orrery: BULK = 160 freshly-minted `vbtrophy2_*` trophy passives (`quality:1`, `locked:true`/`unlockedBy`), round-robined by flattened declaration index (`i % 5`) across 5 `recalcPlayerStats` channels — +1 Luck / +5% movement speed / +1 melee damage / +1 ranged damage / recharge-faster — **exactly 32 per channel**. CAPSTONE = 20 pickups (10 items, 6 trinkets, 4 familiars) for the 12 flagship-enemy 3rd tiers, the 5 hardest Challenge rungs (`_flawless` trinket, `_frugal` trinket, `_untouched_run` familiar, `_9d_speedrun` item, `_10d_speedrun` item), and the 3 grand Collection rungs (`_9d_t3` item, `_10d_t3` item, `_grand` familiar) — themed to the region's end state (guttering embers and dying light on 9D, the event horizon and total collapse on 10D, accent `#9ab8ff`), fully separate from `SUPERBOSS_REWARDS`.

## Achievement summary by category

| Category | Count | Notes |
|---|---|---|
| Slayer | 144 | 66 `addTierSet` calls; 54 non-flagship (2 tiers each) + 12 flagship (3 tiers each) |
| Challenge | 8 | 6 `singularity` boss-room feats + 2 per-floorKey speedruns |
| Exploration | 21 | 2 floor-reach + 1 superboss first-sight + 18 enemy first-sight (9/floorKey) |
| Collection | 7 | 3 tiers × 2 floorKeys + 1 grand (67 = 66 roster + `singularity`) |
| **Total** | **180** | |

## Verification (exact output)

1. `node --check` on every touched/new file: clean (`defs-12.js`, `items-5.js`, `trinkets-2.js`, `familiars-2.js`, `items-1.js`, `items-2.js`, `game.js`, `combat-2.js`).
2. Full repo sweep — `for f in $(find js -name "*.js"); do node --check "$f" || echo FAIL; done` — zero FAIL lines.
3. Node harness loaded every `<script>` from `index.html` except `main.js`/`ui.js`/`render.js`/`roomEditor.js`/`bestiary.js` (65 files, including all `achievements/*.js` and `defs-12.js`) — **`ALL LOADED OK`, zero thrown errors**.
4. `ACHIEVEMENTS.length`: **2627 → 2807** (delta **180**, exact match for 144 + 8 + 21 + 7).
5. Zero duplicate achievement `id` across the full 2807-entry array (`duplicate ids = 0`).
6. Zero *new* reward-target collisions — the only collision found across the whole array is the pre-existing `itemId:championscrown` shared by all 25 `completionist_<class>` achievements (predates this batch, expected/ignored per the dispatch).
7. No new stat-tracking code. Every Challenge condition reuses an existing per-run/per-boss-room flag (`tookDamageThisBossRoom`, `tookDamageThisFloor`, `tookDamageThisRun`, `redMax`, `visitedShopThisRun`) or `game.runElapsed`; every Collection/Exploration condition rides the existing `unlocks.bestiary.enemyKills` bucket via `bumpBestiaryCount`.
8. All 180 new minted pickups (160 `vbtrophy2_*` trophies + 20 capstones) have a complete data-table entry: `distinct new pickups referenced = 180 | referenced more than once = 0 | dangling = 0`, and `vbtrophy2_ items defined = 160`.
9. `new trinkets inside SUPERBOSS_REWARDS consumed set = none` — all 6 new trinkets carry `pendingReward:true` and are skipped by `defs-1.js`'s `TRINKET_LIST.filter` sweep. `sb_singularity_* achievements present = 25` (auto-generated, untouched).
10. Every `itemId`/`trinketId`/`familiarId` referenced in `defs-12.js` cross-checked against `ITEMS`/`TRINKETS`/`FAMILIAR_TYPES` — zero missing/dangling references.
11. Functional smoke test (live harness, stubbing only `loadUnlocks`/`saveUnlocks`/`toast` — normally provided by the excluded `main.js`/`ui.js`):
    - 10× `bumpBestiaryCount('enemyKills','starvedhound',1)` → `slayer_starvedhound_t1` unlocked: **true**.
    - 11 distinct `'9D'` roster kills + `checkVoidBetween2Collection(game)` → `collection_voidbetween2_9d_t1` unlocked: **true**.
    - Direct `unlockAchievement('challenge_voidbetween2_flawless', game)` → achievement unlocked **true**, `collapsedmoment` trinket granted **true**.
    - Live `Player('earth')` with `passives.vbtrophy2_slayer_starvedhound_t1 = 1`, after `recalcPlayerStats`: `luck` **0 → 1** vs. an unmodified baseline `Player`.
    - Live `Player('earth')` with `passives.emberhuskcore = 1` ("+1 all attacks" capstone), after `recalcPlayerStats`: `meleeDamage` **2 → 3**, `rangedDamage` **0.5 → 1**.
    - Live `Player('earth')`, `applyPassiveEffect(game, ITEMS['darkwardenplating'])` (heart-container capstone): `redMax` **6 → 7**; same for `horizonwardenplating`: `redMax` **6 → 7**.

## Deviations from the dispatch

None. Scale landed at exactly 180 achievements (144 + 8 + 21 + 7), 160 trophies (32 per channel, exactly), and 20 capstones (10 items / 6 trinkets / 4 familiars) — a 1:1 structural match to `defs-10.js`'s Orrery batch, as specified.
