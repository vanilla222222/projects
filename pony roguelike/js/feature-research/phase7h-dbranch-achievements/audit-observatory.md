# Phase 7h (Observatory sub-batch) — audit

Implements the first of ~4 sequential D-branch achievement sub-batches: **The Observatory** (floorKeys `'4D'`/`'5D'`, floorNum 3/4), a 66-enemy combined roster (33 per floorKey) plus superboss `astrolabe`. Follows Phase 7f (`defs-7.js`)/7g (`defs-8.js`)'s precedent closely, scaled ~2x for covering two floorKeys instead of one.

## Files changed

- `js/achievements/defs-9.js` — **new file**. 180 achievements (144 Slayer / 8 Challenge / 21 Exploration / 7 Collection), plus the `OBSERVATORY_4D_ROSTER_IDS`/`OBSERVATORY_5D_ROSTER_IDS`/`OBSERVATORY_SUPERBOSS_IDS`/`OBSERVATORY_WATCH_IDS` consts and the `checkObservatoryCollection(game)` bespoke breadth-checker.
- `index.html` — added `<script src="js/achievements/defs-9.js"></script>` after the `defs-8.js` line, before `logic.js`.
- `js/data/items-5.js` — appended 160 `obstrophy_*` trophy passive items + 10 capstone items (`starchartrelic`, `brasswardensplating`, `stardriftanchor`, `nebulacoreshard`, `astrolabewardenplate`, `voidriftanchor`, `brasschronometer`, `astrolabechronometer`, `lensarrayheart`, `astrolabecoreheart`).
- `js/data/trinkets-2.js` — appended 6 capstone trinkets (`shatteredlensfragment`, `cometshadowveil`, `astralbeaconchit`, `eclipseveilcloak`, `stillorbit`, `emptylenscase`), all `pendingReward:true`.
- `js/data/familiars-2.js` — appended 4 capstone orbiter familiars (`lensmarksmandrone`, `precisionopticdrone`, `stargazerwisp`, `observatorywisp`).
- `js/systems/items-1.js` — wired all 160 `obstrophy_*` trophies into the existing 5-channel `recalcPlayerStats` formula (luck/speed/meleeDamage/rangedDamage/fire-rate, 32 ids per channel), plus capstone wiring: `starchartrelic`/`stardriftanchor`/`nebulacoreshard`/`voidriftanchor`/`brasschronometer`/`astrolabechronometer`/`lensarrayheart`/`astrolabecoreheart` into meleeDamage+rangedDamage ("+1 all attacks"); `cometshadowveil`/`eclipseveilcloak` into the fire-rate formula; `shatteredlensfragment` into `critChance`; `astralbeaconchit` into `stunChance`; `emptylenscase` into the shop-discount formula.
- `js/systems/items-2.js` — added `brasswardensplating`/`astrolabewardenplate` to `applyPassiveEffect`'s heart-container chain (`player.grantHeartContainer(1)`).
- `js/game.js` — new `superbossId === 'astrolabe'` block in `onBossDefeated()` (mirrors the `wobbler`/`subdrop`/`mangrove` blocks) for the 6 astrolabe Challenge achievements; two new `floorNum === 3`/`4` checks inside the existing `floorPath === 'D'` branch of `startFloor()` for `exploration_reach_4d`/`_5d` and `challenge_observatory_4d_speedrun`/`_5d_speedrun`.
- `js/systems/combat-2.js` — one new guarded hook in `handleEnemyDeath`: `if (OBSERVATORY_WATCH_IDS.has(enemy.type.id)) checkObservatoryCollection(game);`.
- `js/CODE_REFERENCE.md` — updated the `defs-1.js`–`defs-8.js` section header to `defs-1.js`–`defs-9.js` (2356 total), and added the "Phase 7h — The Observatory" subsection following the exact style of the Phase 7f/7g subsections.

## Investigation findings (Step 1)

- `js/data/enemies/types-4.js` confirmed 33 live entries at `floorKey:'4D'` and 33 at `floorKey:'5D'` (66 total, both grep-counted and manually enumerated from source).
- `js/data/enemies/superbosses.js`: `astrolabe: { id:'astrolabe', name:'Astrolabe DNB', hp:63, dmg:3, speed:88, radius:27, color:'#c9b06a', dark:'#6a5a24', behavior:'bossGlassScorpion', icon:'🧭' }` — confirmed matches the dispatch's stated fields exactly.
- Grepped `js/achievements/defs-*.js` for every one of the 66 enemy ids plus `astrolabe`: zero hits. No second-ladder workaround (like Phase 7f's `slayer2_*` for floorKey `'13'`) was needed anywhere in this file — every id here is genuinely fresh.
- Re-confirmed `shopDiscount`/`pillColorId`/`enemyId` reward-pool exhaustion (same finding as Phase 7f/7g, unchanged): 12/41/61 achievements respectively already reference these fields elsewhere in `js/achievements/*.js`, all pools fully claimed. None used in this batch.

## Reward strategy (Step 2)

- **Bulk (160 achievements)**: freshly-minted `obstrophy_*` trophy passive items, `locked:true`/`unlockedBy:'<achId>'`, round-robined across the same five `recalcPlayerStats` channels Phase 7f/7g used — luck (+1), speed (+5%), meleeDamage (+1), rangedDamage (+1), fire-rate (+3% recharge) — 32 trophies per channel.
- **Capstone (20 achievements)**: fresh locked items/trinkets/familiars, Observatory-themed (dusty brass/tarnished gold/cracked lens glass/drifting star-dust, accent `#c9b06a`), fully separate from `SUPERBOSS_REWARDS`'s consumed pool (the 6 trinkets all carry `pendingReward:true` so `defs-1.js`'s `TRINKET_LIST.filter(t => t.locked && !t.donationReward && !t.pendingReward)` sweep skips them).
- Every one of the 180 achievements has exactly one reward field (`itemId`/`trinketId`/`familiarId`) and every reward id is referenced by exactly one achievement — verified programmatically, see below.

## Achievement categories (Step 3)

- **Slayer (144)**: 66 `addTierSet` calls (one per enemy, both floorKeys) — 54 enemies get a 2-tier ladder (10/40 kills), 12 flagship enemies (6 per floorKey, one per distinct AI behavior not otherwise showcased: splitter/summoner/shielder/ambusher/sniper/teleporter) get a 3rd tier (threshold 100) granting a unique capstone reward instead of another trophy.
  - 4D flagships: `dustcluster` (splitter), `constellationcaller` (summoner), `brasswarden` (shielder), `shadowcomet` (ambusher), `telescopemarksman` (sniper), `stardriftblink` (teleporter).
  - 5D flagships: `nebulacluster` (splitter), `astralcaller` (summoner), `astrolabewarden` (shielder), `eclipsecomet` (ambusher), `precisionmarksman` (sniper), `voidblink` (teleporter).
- **Challenge (8)**: `challenge_astrolabe_flawless`/`_floor_nodamage`/`_onehearted`/`_speedkill`/`_frugal`/`_untouched_run` (superboss-room block in `onBossDefeated()`) + `challenge_observatory_4d_speedrun`/`_5d_speedrun` (per-floorKey reach-time checks in `startFloor()`). All reuse existing per-run flags — no new stat-tracking.
- **Exploration (21)**: `exploration_reach_4d`/`_5d` (per-floorKey reach milestones) + `exploration_meet_astrolabe` + 18 "First Sight" achievements (9 per floorKey, one per distinct AI behavior family, riding the existing `bumpBestiaryCount`/Predicate-B infra — no new code).
- **Collection (7)**: `collection_observatory_4d_t1`/`_t2`/`_t3` (11/22/33 of the 4D roster), the mirrored `_5d_t1`/`_t2`/`_t3` for 5D, and `collection_observatory_grand` (all 66 regular enemies + `astrolabe` = 67) — backed by the new `checkObservatoryCollection(game)` function, hooked into `combat-2.js`'s `handleEnemyDeath` guarded by the 67-id `OBSERVATORY_WATCH_IDS` `Set`. No new stat-tracking — reads the same `unlocks.bestiary.enemyKills` bucket `bumpBestiaryCount` already writes.

## Verification (mandatory checks, exact output)

1. **`node --check` on every touched file**: `js/achievements/defs-9.js`, `js/game.js`, `js/systems/combat-2.js`, `js/systems/items-1.js`, `js/systems/items-2.js`, `js/data/items-5.js`, `js/data/trinkets-2.js`, `js/data/familiars-2.js` — all clean, zero errors.
2. **Full repo sweep** (`for f in $(find js -name "*.js"); do node --check "$f" || echo FAIL; done`) — zero `FAIL` lines, entire `js/` tree clean.
3. **Node harness** loading all `<script>` tags from `index.html` except `js/main.js`, `js/ui/ui.js`, `js/ui/render.js`, `js/ui/roomEditor.js`, `js/ui/bestiary.js` (62 scripts total, run in a shared `vm` context with minimal DOM/localStorage/Audio shims) — **zero thrown errors**, `ACHIEVEMENTS` loads successfully.
4. **`ACHIEVEMENTS.length`**: **2176 before → 2356 after** — delta **180**, exactly matching this batch's authored count (144 Slayer + 8 Challenge + 21 Exploration + 7 Collection, confirmed by slicing the last 180 array entries and tallying `category`).
5. **Zero duplicate achievement `id`** across the full 2356-entry array (checked via a frequency map over every id).
6. **Zero *new* duplicate reward-target collisions**: exactly 1 collision exists game-wide (`itemId:championscrown`, shared by the 25 pre-existing `completionist_<class>` achievements — confirmed pre-existing and untouched by this batch, excluded per the dispatch's instruction). Excluding that one, **zero** collisions remain.
7. **No new stat-tracking code was added** — every Challenge/Exploration hand-wired condition reuses an existing flag (`tookDamageThisBossRoom`/`tookDamageThisFloor`/`tookDamageThisRun`/`redMax`/`visitedShopThisRun`/`game.runElapsed`/`dBranchFloorsVisited`), so this check is N/A by design (same as Phase 7f/7g).
8. **Every new locked pickup** (160 `obstrophy_*` items + 20 capstones = 180 total data-table entries) has a complete valid entry, is referenced by exactly **one** achievement (`refCount` frequency map over all `itemId`/`trinketId`/`familiarId` fields in the batch — max count found: 1), and none of the 6 new capstone trinkets appear in `SUPERBOSS_REWARDS`'s consumed trinket-id set (checked directly against the built `SUPERBOSS_REWARDS` array).
9. **Cross-checked every reward-target id** referenced in `defs-9.js`'s 180 achievements against `ITEMS`/`TRINKETS`/`FAMILIAR_TYPES` — **zero missing/dangling references**.
10. **Functional smoke test** (simulated via the same harness, calling the real `bumpBestiaryCount`/`unlockAchievement`/`applyPassiveEffect`/`recalcPlayerStats` code paths against a live `Player` instance):
    - 10 kills of `lensdrifter` → `slayer_lensdrifter_t1` unlocked, `obstrophy_slayer_lensdrifter_t1` granted.
    - 90 kills of `dustcluster` → `slayer_dustcluster_t1`/`_t2` unlocked (10/40 thresholds), `_t3` (100) correctly still locked at 90 kills.
    - 1 kill of `starshard` → `exploration_meet_starshard` unlocked.
    - 11 distinct 4D-roster kills + explicit `checkObservatoryCollection` call → `collection_observatory_4d_t1` unlocked.
    - All 66 roster kills + `astrolabe` kill + `checkObservatoryCollection` → `collection_observatory_4d_t3`/`_5d_t3`/`_grand` all unlocked, granting `lensarrayheart`/`astrolabecoreheart`/`observatorywisp` respectively.
    - `unlockAchievement('challenge_astrolabe_flawless', ...)` → `stillorbit` trinket granted.
    - Instantiated a real `Player('changedling')` and called `applyPassiveEffect` directly: granting `obstrophy_slayer_lensdrifter_t1` (a luck-channel trophy) moved `player.luck` from `0` → `1`; granting a speed-channel trophy moved `player.speed` from `190` → `199.5` (+5%, exact); granting `brasswardensplating` moved `player.redMax` up via the real `grantHeartContainer(1)` call.

All ten checks pass with the numbers above.

## Deviations from the plan (with justification)

- **2-tier Slayer ladders instead of 3-tier for the full 66-enemy roster** (only 12 flagship enemies get a 3rd tier). The dispatch said "consider 3 tiers instead of 2" as one of several scaling levers, not a hard requirement, and explicitly listed "full roster coverage" and "per-floorKey Exploration/Collection/Challenge" as the other levers. Doing 3 full tiers across all 66 enemies (198 Slayer achievements alone) would have pushed the total well past the 220 ceiling once Challenge/Exploration/Collection were added, or forced those categories to be thinned below what "per-floorKey, not combined" implies. The chosen mix (full 66-enemy 2-tier coverage + 12 flagship 3rd tiers + full per-floorKey Challenge/Exploration/Collection splits) lands the batch at exactly 180 — inside the 180-220 target — while still satisfying "don't be shy about full roster coverage" and "per-floorKey achievements, not just per-region."
- **Two capstone item descriptions changed from an unprecedented "+1 dodge roll charge" mechanic** (`stardriftanchor`/`voidriftanchor`, both themed around teleporter enemies) **to "+1 damage to all attacks."** A grep for `dodgeRoll`/`dodge roll`/`dodgeCharge` across the codebase came back empty — the game has no dodge-roll mechanic to hook into, so that flavor text would have been a purely cosmetic, non-functional reward, violating the "every achievement must have a real, functioning reward" rule. Both items were re-themed to the already-precedented "+1 all attacks" pattern instead, wired into the same meleeDamage/rangedDamage formula terms as the other 4D/5D "all attacks" capstones.
- **`brasswardensplating`/`astrolabewardenplate` ("+1 heart container") required one extra edit to `js/systems/items-2.js`** (adding their ids to `applyPassiveEffect`'s existing heart-container `||`-chain, exactly where `tidewardenaegis` was added for Phase 7g) rather than a pure `items-1.js` formula edit, since heart containers are granted via that special-case call, not the `recalcPlayerStats` formula. Same mechanism Phase 7g's `tidewardenaegis` used; documented as a small, precedented deviation from "wire everything into `items-1.js`" for accuracy.


## Full achievement list (id | category | predicate | reward)

| id | category | predicate | reward |
|---|---|---|---|
| `slayer_lensdrifter_t1` | Slayer | kill lensdrifter x10 | itemId:obstrophy_slayer_lensdrifter_t1 |
| `slayer_lensdrifter_t2` | Slayer | kill lensdrifter x40 | itemId:obstrophy_slayer_lensdrifter_t2 |
| `slayer_dustmote_t1` | Slayer | kill dustmote x10 | itemId:obstrophy_slayer_dustmote_t1 |
| `slayer_dustmote_t2` | Slayer | kill dustmote x40 | itemId:obstrophy_slayer_dustmote_t2 |
| `slayer_starshard_t1` | Slayer | kill starshard x10 | itemId:obstrophy_slayer_starshard_t1 |
| `slayer_starshard_t2` | Slayer | kill starshard x40 | itemId:obstrophy_slayer_starshard_t2 |
| `slayer_brassbulwark_t1` | Slayer | kill brassbulwark x10 | itemId:obstrophy_slayer_brassbulwark_t1 |
| `slayer_brassbulwark_t2` | Slayer | kill brassbulwark x40 | itemId:obstrophy_slayer_brassbulwark_t2 |
| `slayer_comettusk_t1` | Slayer | kill comettusk x10 | itemId:obstrophy_slayer_comettusk_t1 |
| `slayer_comettusk_t2` | Slayer | kill comettusk x40 | itemId:obstrophy_slayer_comettusk_t2 |
| `slayer_spyglassturret_t1` | Slayer | kill spyglassturret x10 | itemId:obstrophy_slayer_spyglassturret_t1 |
| `slayer_spyglassturret_t2` | Slayer | kill spyglassturret x40 | itemId:obstrophy_slayer_spyglassturret_t2 |
| `slayer_astralhopper_t1` | Slayer | kill astralhopper x10 | itemId:obstrophy_slayer_astralhopper_t1 |
| `slayer_astralhopper_t2` | Slayer | kill astralhopper x40 | itemId:obstrophy_slayer_astralhopper_t2 |
| `slayer_novaslinger_t1` | Slayer | kill novaslinger x10 | itemId:obstrophy_slayer_novaslinger_t1 |
| `slayer_novaslinger_t2` | Slayer | kill novaslinger x40 | itemId:obstrophy_slayer_novaslinger_t2 |
| `slayer_gravitymortar_t1` | Slayer | kill gravitymortar x10 | itemId:obstrophy_slayer_gravitymortar_t1 |
| `slayer_gravitymortar_t2` | Slayer | kill gravitymortar x40 | itemId:obstrophy_slayer_gravitymortar_t2 |
| `slayer_constellationweaver_t1` | Slayer | kill constellationweaver x10 | itemId:obstrophy_slayer_constellationweaver_t1 |
| `slayer_constellationweaver_t2` | Slayer | kill constellationweaver x40 | itemId:obstrophy_slayer_constellationweaver_t2 |
| `slayer_domewatcher_t1` | Slayer | kill domewatcher x10 | itemId:obstrophy_slayer_domewatcher_t1 |
| `slayer_domewatcher_t2` | Slayer | kill domewatcher x40 | itemId:obstrophy_slayer_domewatcher_t2 |
| `slayer_planetcircler_t1` | Slayer | kill planetcircler x10 | itemId:obstrophy_slayer_planetcircler_t1 |
| `slayer_planetcircler_t2` | Slayer | kill planetcircler x40 | itemId:obstrophy_slayer_planetcircler_t2 |
| `slayer_dustborer_t1` | Slayer | kill dustborer x10 | itemId:obstrophy_slayer_dustborer_t1 |
| `slayer_dustborer_t2` | Slayer | kill dustborer x40 | itemId:obstrophy_slayer_dustborer_t2 |
| `slayer_starmites_t1` | Slayer | kill starmites x10 | itemId:obstrophy_slayer_starmites_t1 |
| `slayer_starmites_t2` | Slayer | kill starmites x40 | itemId:obstrophy_slayer_starmites_t2 |
| `slayer_dustcluster_t1` | Slayer | kill dustcluster x10 | itemId:obstrophy_slayer_dustcluster_t1 |
| `slayer_dustcluster_t2` | Slayer | kill dustcluster x40 | itemId:obstrophy_slayer_dustcluster_t2 |
| `slayer_dustcluster_t3` | Slayer | kill dustcluster x100 | trinketId:shatteredlensfragment |
| `slayer_constellationcaller_t1` | Slayer | kill constellationcaller x10 | itemId:obstrophy_slayer_constellationcaller_t1 |
| `slayer_constellationcaller_t2` | Slayer | kill constellationcaller x40 | itemId:obstrophy_slayer_constellationcaller_t2 |
| `slayer_constellationcaller_t3` | Slayer | kill constellationcaller x100 | itemId:starchartrelic |
| `slayer_lensmender_t1` | Slayer | kill lensmender x10 | itemId:obstrophy_slayer_lensmender_t1 |
| `slayer_lensmender_t2` | Slayer | kill lensmender x40 | itemId:obstrophy_slayer_lensmender_t2 |
| `slayer_brasswarden_t1` | Slayer | kill brasswarden x10 | itemId:obstrophy_slayer_brasswarden_t1 |
| `slayer_brasswarden_t2` | Slayer | kill brasswarden x40 | itemId:obstrophy_slayer_brasswarden_t2 |
| `slayer_brasswarden_t3` | Slayer | kill brasswarden x100 | itemId:brasswardensplating |
| `slayer_telescopemarksman_t1` | Slayer | kill telescopemarksman x10 | itemId:obstrophy_slayer_telescopemarksman_t1 |
| `slayer_telescopemarksman_t2` | Slayer | kill telescopemarksman x40 | itemId:obstrophy_slayer_telescopemarksman_t2 |
| `slayer_telescopemarksman_t3` | Slayer | kill telescopemarksman x100 | familiarId:lensmarksmandrone |
| `slayer_stardriftblink_t1` | Slayer | kill stardriftblink x10 | itemId:obstrophy_slayer_stardriftblink_t1 |
| `slayer_stardriftblink_t2` | Slayer | kill stardriftblink x40 | itemId:obstrophy_slayer_stardriftblink_t2 |
| `slayer_stardriftblink_t3` | Slayer | kill stardriftblink x100 | itemId:stardriftanchor |
| `slayer_shadowcomet_t1` | Slayer | kill shadowcomet x10 | itemId:obstrophy_slayer_shadowcomet_t1 |
| `slayer_shadowcomet_t2` | Slayer | kill shadowcomet x40 | itemId:obstrophy_slayer_shadowcomet_t2 |
| `slayer_shadowcomet_t3` | Slayer | kill shadowcomet x100 | trinketId:cometshadowveil |
| `slayer_duststrider_t1` | Slayer | kill duststrider x10 | itemId:obstrophy_slayer_duststrider_t1 |
| `slayer_duststrider_t2` | Slayer | kill duststrider x40 | itemId:obstrophy_slayer_duststrider_t2 |
| `slayer_cometsprinter_t1` | Slayer | kill cometsprinter x10 | itemId:obstrophy_slayer_cometsprinter_t1 |
| `slayer_cometsprinter_t2` | Slayer | kill cometsprinter x40 | itemId:obstrophy_slayer_cometsprinter_t2 |
| `slayer_glassslinger_t1` | Slayer | kill glassslinger x10 | itemId:obstrophy_slayer_glassslinger_t1 |
| `slayer_glassslinger_t2` | Slayer | kill glassslinger x40 | itemId:obstrophy_slayer_glassslinger_t2 |
| `slayer_meteorspark_t1` | Slayer | kill meteorspark x10 | itemId:obstrophy_slayer_meteorspark_t1 |
| `slayer_meteorspark_t2` | Slayer | kill meteorspark x40 | itemId:obstrophy_slayer_meteorspark_t2 |
| `slayer_dustmoth_t1` | Slayer | kill dustmoth x10 | itemId:obstrophy_slayer_dustmoth_t1 |
| `slayer_dustmoth_t2` | Slayer | kill dustmoth x40 | itemId:obstrophy_slayer_dustmoth_t2 |
| `slayer_brassram_t1` | Slayer | kill brassram x10 | itemId:obstrophy_slayer_brassram_t1 |
| `slayer_brassram_t2` | Slayer | kill brassram x40 | itemId:obstrophy_slayer_brassram_t2 |
| `slayer_stardustmortar_t1` | Slayer | kill stardustmortar x10 | itemId:obstrophy_slayer_stardustmortar_t1 |
| `slayer_stardustmortar_t2` | Slayer | kill stardustmortar x40 | itemId:obstrophy_slayer_stardustmortar_t2 |
| `slayer_lensborer_t1` | Slayer | kill lensborer x10 | itemId:obstrophy_slayer_lensborer_t1 |
| `slayer_lensborer_t2` | Slayer | kill lensborer x40 | itemId:obstrophy_slayer_lensborer_t2 |
| `slayer_satellitecircler_t1` | Slayer | kill satellitecircler x10 | itemId:obstrophy_slayer_satellitecircler_t1 |
| `slayer_satellitecircler_t2` | Slayer | kill satellitecircler x40 | itemId:obstrophy_slayer_satellitecircler_t2 |
| `slayer_telescopesentinel_t1` | Slayer | kill telescopesentinel x10 | itemId:obstrophy_slayer_telescopesentinel_t1 |
| `slayer_telescopesentinel_t2` | Slayer | kill telescopesentinel x40 | itemId:obstrophy_slayer_telescopesentinel_t2 |
| `slayer_novablink_t1` | Slayer | kill novablink x10 | itemId:obstrophy_slayer_novablink_t1 |
| `slayer_novablink_t2` | Slayer | kill novablink x40 | itemId:obstrophy_slayer_novablink_t2 |
| `slayer_domebulwark_t1` | Slayer | kill domebulwark x10 | itemId:obstrophy_slayer_domebulwark_t1 |
| `slayer_domebulwark_t2` | Slayer | kill domebulwark x40 | itemId:obstrophy_slayer_domebulwark_t2 |
| `slayer_astrolabestalker_t1` | Slayer | kill astrolabestalker x10 | itemId:obstrophy_slayer_astrolabestalker_t1 |
| `slayer_astrolabestalker_t2` | Slayer | kill astrolabestalker x40 | itemId:obstrophy_slayer_astrolabestalker_t2 |
| `slayer_cometwisp_t1` | Slayer | kill cometwisp x10 | itemId:obstrophy_slayer_cometwisp_t1 |
| `slayer_cometwisp_t2` | Slayer | kill cometwisp x40 | itemId:obstrophy_slayer_cometwisp_t2 |
| `slayer_quasarshard_t1` | Slayer | kill quasarshard x10 | itemId:obstrophy_slayer_quasarshard_t1 |
| `slayer_quasarshard_t2` | Slayer | kill quasarshard x40 | itemId:obstrophy_slayer_quasarshard_t2 |
| `slayer_brassaegis_t1` | Slayer | kill brassaegis x10 | itemId:obstrophy_slayer_brassaegis_t1 |
| `slayer_brassaegis_t2` | Slayer | kill brassaegis x40 | itemId:obstrophy_slayer_brassaegis_t2 |
| `slayer_meteortusk_t1` | Slayer | kill meteortusk x10 | itemId:obstrophy_slayer_meteortusk_t1 |
| `slayer_meteortusk_t2` | Slayer | kill meteortusk x40 | itemId:obstrophy_slayer_meteortusk_t2 |
| `slayer_opticturret_t1` | Slayer | kill opticturret x10 | itemId:obstrophy_slayer_opticturret_t1 |
| `slayer_opticturret_t2` | Slayer | kill opticturret x40 | itemId:obstrophy_slayer_opticturret_t2 |
| `slayer_starhopper_t1` | Slayer | kill starhopper x10 | itemId:obstrophy_slayer_starhopper_t1 |
| `slayer_starhopper_t2` | Slayer | kill starhopper x40 | itemId:obstrophy_slayer_starhopper_t2 |
| `slayer_gravslinger_t1` | Slayer | kill gravslinger x10 | itemId:obstrophy_slayer_gravslinger_t1 |
| `slayer_gravslinger_t2` | Slayer | kill gravslinger x40 | itemId:obstrophy_slayer_gravslinger_t2 |
| `slayer_novamortar_t1` | Slayer | kill novamortar x10 | itemId:obstrophy_slayer_novamortar_t1 |
| `slayer_novamortar_t2` | Slayer | kill novamortar x40 | itemId:obstrophy_slayer_novamortar_t2 |
| `slayer_nebulaweaver_t1` | Slayer | kill nebulaweaver x10 | itemId:obstrophy_slayer_nebulaweaver_t1 |
| `slayer_nebulaweaver_t2` | Slayer | kill nebulaweaver x40 | itemId:obstrophy_slayer_nebulaweaver_t2 |
| `slayer_astrariumwatcher_t1` | Slayer | kill astrariumwatcher x10 | itemId:obstrophy_slayer_astrariumwatcher_t1 |
| `slayer_astrariumwatcher_t2` | Slayer | kill astrariumwatcher x40 | itemId:obstrophy_slayer_astrariumwatcher_t2 |
| `slayer_ringcircler_t1` | Slayer | kill ringcircler x10 | itemId:obstrophy_slayer_ringcircler_t1 |
| `slayer_ringcircler_t2` | Slayer | kill ringcircler x40 | itemId:obstrophy_slayer_ringcircler_t2 |
| `slayer_gravityborer_t1` | Slayer | kill gravityborer x10 | itemId:obstrophy_slayer_gravityborer_t1 |
| `slayer_gravityborer_t2` | Slayer | kill gravityborer x40 | itemId:obstrophy_slayer_gravityborer_t2 |
| `slayer_cosmicmites_t1` | Slayer | kill cosmicmites x10 | itemId:obstrophy_slayer_cosmicmites_t1 |
| `slayer_cosmicmites_t2` | Slayer | kill cosmicmites x40 | itemId:obstrophy_slayer_cosmicmites_t2 |
| `slayer_nebulacluster_t1` | Slayer | kill nebulacluster x10 | itemId:obstrophy_slayer_nebulacluster_t1 |
| `slayer_nebulacluster_t2` | Slayer | kill nebulacluster x40 | itemId:obstrophy_slayer_nebulacluster_t2 |
| `slayer_nebulacluster_t3` | Slayer | kill nebulacluster x100 | itemId:nebulacoreshard |
| `slayer_astralcaller_t1` | Slayer | kill astralcaller x10 | itemId:obstrophy_slayer_astralcaller_t1 |
| `slayer_astralcaller_t2` | Slayer | kill astralcaller x40 | itemId:obstrophy_slayer_astralcaller_t2 |
| `slayer_astralcaller_t3` | Slayer | kill astralcaller x100 | trinketId:astralbeaconchit |
| `slayer_glassmender_t1` | Slayer | kill glassmender x10 | itemId:obstrophy_slayer_glassmender_t1 |
| `slayer_glassmender_t2` | Slayer | kill glassmender x40 | itemId:obstrophy_slayer_glassmender_t2 |
| `slayer_astrolabewarden_t1` | Slayer | kill astrolabewarden x10 | itemId:obstrophy_slayer_astrolabewarden_t1 |
| `slayer_astrolabewarden_t2` | Slayer | kill astrolabewarden x40 | itemId:obstrophy_slayer_astrolabewarden_t2 |
| `slayer_astrolabewarden_t3` | Slayer | kill astrolabewarden x100 | itemId:astrolabewardenplate |
| `slayer_precisionmarksman_t1` | Slayer | kill precisionmarksman x10 | itemId:obstrophy_slayer_precisionmarksman_t1 |
| `slayer_precisionmarksman_t2` | Slayer | kill precisionmarksman x40 | itemId:obstrophy_slayer_precisionmarksman_t2 |
| `slayer_precisionmarksman_t3` | Slayer | kill precisionmarksman x100 | familiarId:precisionopticdrone |
| `slayer_voidblink_t1` | Slayer | kill voidblink x10 | itemId:obstrophy_slayer_voidblink_t1 |
| `slayer_voidblink_t2` | Slayer | kill voidblink x40 | itemId:obstrophy_slayer_voidblink_t2 |
| `slayer_voidblink_t3` | Slayer | kill voidblink x100 | itemId:voidriftanchor |
| `slayer_eclipsecomet_t1` | Slayer | kill eclipsecomet x10 | itemId:obstrophy_slayer_eclipsecomet_t1 |
| `slayer_eclipsecomet_t2` | Slayer | kill eclipsecomet x40 | itemId:obstrophy_slayer_eclipsecomet_t2 |
| `slayer_eclipsecomet_t3` | Slayer | kill eclipsecomet x100 | trinketId:eclipseveilcloak |
| `slayer_gravitybrute_t1` | Slayer | kill gravitybrute x10 | itemId:obstrophy_slayer_gravitybrute_t1 |
| `slayer_gravitybrute_t2` | Slayer | kill gravitybrute x40 | itemId:obstrophy_slayer_gravitybrute_t2 |
| `slayer_starstreak_t1` | Slayer | kill starstreak x10 | itemId:obstrophy_slayer_starstreak_t1 |
| `slayer_starstreak_t2` | Slayer | kill starstreak x40 | itemId:obstrophy_slayer_starstreak_t2 |
| `slayer_prismslinger_t1` | Slayer | kill prismslinger x10 | itemId:obstrophy_slayer_prismslinger_t1 |
| `slayer_prismslinger_t2` | Slayer | kill prismslinger x40 | itemId:obstrophy_slayer_prismslinger_t2 |
| `slayer_fluxshard_t1` | Slayer | kill fluxshard x10 | itemId:obstrophy_slayer_fluxshard_t1 |
| `slayer_fluxshard_t2` | Slayer | kill fluxshard x40 | itemId:obstrophy_slayer_fluxshard_t2 |
| `slayer_astralmoth_t1` | Slayer | kill astralmoth x10 | itemId:obstrophy_slayer_astralmoth_t1 |
| `slayer_astralmoth_t2` | Slayer | kill astralmoth x40 | itemId:obstrophy_slayer_astralmoth_t2 |
| `slayer_brassjuggernaut_t1` | Slayer | kill brassjuggernaut x10 | itemId:obstrophy_slayer_brassjuggernaut_t1 |
| `slayer_brassjuggernaut_t2` | Slayer | kill brassjuggernaut x40 | itemId:obstrophy_slayer_brassjuggernaut_t2 |
| `slayer_cometmortar_t1` | Slayer | kill cometmortar x10 | itemId:obstrophy_slayer_cometmortar_t1 |
| `slayer_cometmortar_t2` | Slayer | kill cometmortar x40 | itemId:obstrophy_slayer_cometmortar_t2 |
| `slayer_duskborer_t1` | Slayer | kill duskborer x10 | itemId:obstrophy_slayer_duskborer_t1 |
| `slayer_duskborer_t2` | Slayer | kill duskborer x40 | itemId:obstrophy_slayer_duskborer_t2 |
| `slayer_mooncircler_t1` | Slayer | kill mooncircler x10 | itemId:obstrophy_slayer_mooncircler_t1 |
| `slayer_mooncircler_t2` | Slayer | kill mooncircler x40 | itemId:obstrophy_slayer_mooncircler_t2 |
| `slayer_opticsentinel_t1` | Slayer | kill opticsentinel x10 | itemId:obstrophy_slayer_opticsentinel_t1 |
| `slayer_opticsentinel_t2` | Slayer | kill opticsentinel x40 | itemId:obstrophy_slayer_opticsentinel_t2 |
| `slayer_riftblink_t1` | Slayer | kill riftblink x10 | itemId:obstrophy_slayer_riftblink_t1 |
| `slayer_riftblink_t2` | Slayer | kill riftblink x40 | itemId:obstrophy_slayer_riftblink_t2 |
| `slayer_astralbulwark_t1` | Slayer | kill astralbulwark x10 | itemId:obstrophy_slayer_astralbulwark_t1 |
| `slayer_astralbulwark_t2` | Slayer | kill astralbulwark x40 | itemId:obstrophy_slayer_astralbulwark_t2 |
| `challenge_astrolabe_flawless` | Challenge | (hand-wired) | trinketId:stillorbit |
| `challenge_astrolabe_floor_nodamage` | Challenge | (hand-wired) | itemId:obstrophy_challenge_floor_nodamage |
| `challenge_astrolabe_onehearted` | Challenge | (hand-wired) | itemId:obstrophy_challenge_onehearted |
| `challenge_astrolabe_speedkill` | Challenge | (hand-wired) | itemId:obstrophy_challenge_speedkill |
| `challenge_astrolabe_frugal` | Challenge | (hand-wired) | trinketId:emptylenscase |
| `challenge_astrolabe_untouched_run` | Challenge | (hand-wired) | familiarId:stargazerwisp |
| `challenge_observatory_4d_speedrun` | Challenge | (hand-wired) | itemId:brasschronometer |
| `challenge_observatory_5d_speedrun` | Challenge | (hand-wired) | itemId:astrolabechronometer |
| `exploration_reach_4d` | Exploration | (hand-wired) | itemId:obstrophy_exploration_floor4d |
| `exploration_reach_5d` | Exploration | (hand-wired) | itemId:obstrophy_exploration_floor5d |
| `exploration_meet_astrolabe` | Exploration | kill astrolabe x1 | itemId:obstrophy_exploration_meet_astrolabe |
| `exploration_meet_lensdrifter` | Exploration | kill lensdrifter x1 | itemId:obstrophy_meet_lensdrifter |
| `exploration_meet_dustmote` | Exploration | kill dustmote x1 | itemId:obstrophy_meet_dustmote |
| `exploration_meet_starshard` | Exploration | kill starshard x1 | itemId:obstrophy_meet_starshard |
| `exploration_meet_brassbulwark` | Exploration | kill brassbulwark x1 | itemId:obstrophy_meet_brassbulwark |
| `exploration_meet_comettusk` | Exploration | kill comettusk x1 | itemId:obstrophy_meet_comettusk |
| `exploration_meet_spyglassturret` | Exploration | kill spyglassturret x1 | itemId:obstrophy_meet_spyglassturret |
| `exploration_meet_astralhopper` | Exploration | kill astralhopper x1 | itemId:obstrophy_meet_astralhopper |
| `exploration_meet_gravitymortar` | Exploration | kill gravitymortar x1 | itemId:obstrophy_meet_gravitymortar |
| `exploration_meet_domewatcher` | Exploration | kill domewatcher x1 | itemId:obstrophy_meet_domewatcher |
| `exploration_meet_astrolabestalker` | Exploration | kill astrolabestalker x1 | itemId:obstrophy_meet_astrolabestalker |
| `exploration_meet_cometwisp` | Exploration | kill cometwisp x1 | itemId:obstrophy_meet_cometwisp |
| `exploration_meet_quasarshard` | Exploration | kill quasarshard x1 | itemId:obstrophy_meet_quasarshard |
| `exploration_meet_brassaegis` | Exploration | kill brassaegis x1 | itemId:obstrophy_meet_brassaegis |
| `exploration_meet_meteortusk` | Exploration | kill meteortusk x1 | itemId:obstrophy_meet_meteortusk |
| `exploration_meet_opticturret` | Exploration | kill opticturret x1 | itemId:obstrophy_meet_opticturret |
| `exploration_meet_starhopper` | Exploration | kill starhopper x1 | itemId:obstrophy_meet_starhopper |
| `exploration_meet_novamortar` | Exploration | kill novamortar x1 | itemId:obstrophy_meet_novamortar |
| `exploration_meet_astrariumwatcher` | Exploration | kill astrariumwatcher x1 | itemId:obstrophy_meet_astrariumwatcher |
| `collection_observatory_4d_t1` | Collection | (hand-wired) | itemId:obstrophy_collection_4d_t1 |
| `collection_observatory_4d_t2` | Collection | (hand-wired) | itemId:obstrophy_collection_4d_t2 |
| `collection_observatory_4d_t3` | Collection | (hand-wired) | itemId:lensarrayheart |
| `collection_observatory_5d_t1` | Collection | (hand-wired) | itemId:obstrophy_collection_5d_t1 |
| `collection_observatory_5d_t2` | Collection | (hand-wired) | itemId:obstrophy_collection_5d_t2 |
| `collection_observatory_5d_t3` | Collection | (hand-wired) | itemId:astrolabecoreheart |
| `collection_observatory_grand` | Collection | (hand-wired) | familiarId:observatorywisp |
