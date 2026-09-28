# Phase 7h (cont.) — The Orrery (floors '6D'/'7D') achievement batch audit

Second of ~4 sequential D-branch achievement sub-batches. Precedent: `defs-9.js`
(The Observatory, `feature-research/phase7h-dbranch-achievements/audit-observatory.md`).
Identical shape (2 floorKeys, 66 enemies, 1 superboss), so this batch reused
Observatory's design decisions wherever they generalize cleanly.

## Files changed

- `js/achievements/defs-10.js` — **new file**, 180 achievements (144 Slayer / 8
  Challenge / 21 Exploration / 7 Collection).
- `index.html` — one new `<script src="js/achievements/defs-10.js"></script>`
  line, after `defs-9.js`, before `logic.js`.
- `js/data/items-5.js` — 160 `ortrophy_*` trophy passive items + 7 non-heart
  capstone items (`gearclutchcore`, `gearblinkanchor`, `ringblinkanchor`,
  `brassringchronometer`, `apexchronometer`, `gearworkheart`, `orreryheart`) +
  3 heart-container capstone items (`ringwardenplating`, `apexwardenplating`,
  `geartriadcore`).
- `js/data/trinkets-2.js` — 6 capstone trinkets (`meridiansummonschit`,
  `shadowcogveil`, `zenithsummonschit`, `nightgearveil`, `stillmechanism`,
  `emptygearbox`), all `pendingReward:true`.
- `js/data/familiars-2.js` — 4 capstone orbiter familiars
  (`meridianmarksmandrone`, `apexsniperdrone`, `gearworkwisp`, `orrerywisp`).
- `js/systems/items-1.js` — 5 new `recalcPlayerStats` channel blocks (luck,
  speed, meleeDamage, rangedDamage, fire-rate — 32 trophy ids each) plus the
  capstone item/trinket terms in the meleeDamage, rangedDamage, fire-rate,
  and stun-chance formulas.
- `js/systems/items-2.js` — extended the existing heart-container
  `applyPassiveEffect` OR-chain with `ringwardenplating`/`apexwardenplating`/
  `geartriadcore`.
- `js/game.js` — `startFloor()`: new floorNum===5/6 reach+speedrun hooks
  beside the existing D-branch chain. `onBossDefeated()`: new
  `superbossId === 'orrery'` Challenge block mirroring the `astrolabe` one.
- `js/systems/combat-2.js` — one new guarded hook line in
  `handleEnemyDeath` calling `checkOrreryCollection(game)`.
- `js/CODE_REFERENCE.md` — updated the defs-1..10 rollup line and added the
  "Phase 7h (cont.) — The Orrery" subsection after the Observatory one.

## Investigation findings

- 6D/7D roster ids and names re-confirmed live via `grep -n
  "floorKey:'6D'"` / `"floorKey:'7D'"` against `js/data/enemies/types-4.js`
  — 33 entries each, matching the plan's stated shape.
- `orrery` superboss confirmed in `js/data/enemies/superbosses.js`: `hp:70`,
  `behavior:'bossBrickGolem'`, `color:'#e0b45a'`, `icon:'🪐'`.
- `sb_orrery_<class>` achievements confirmed **already exist** — generated
  dynamically by `defs-1.js`'s `'sb_' + bossId + '_' + classId` loop over
  `SUPERBOSSES`, not literal strings anywhere. Not touched.
- Grepped all 66 new enemy ids plus `'orrery'` across every
  `js/achievements/defs-*.js` — zero hits. No pre-existing Slayer-achievement
  workaround needed.
- Reward-pool exhaustion re-confirmed unchanged from defs-7f/7g/7h
  (Observatory): `shopDiscount`/`pillColorId`/`enemyId` all fully claimed.
- Collision scan of every new pickup id (180 total: 160 trophies + 20
  capstones) against the whole `js/` tree — zero hits before wiring anything
  in.

## Reward strategy

Same as Observatory: BULK = 160 freshly-minted `ortrophy_*` trophy passives
(quality 1, `locked:true`/`unlockedBy`), round-robined across 5
`recalcPlayerStats` channels (luck +1 / speed +5% / melee +1 / ranged +1 /
recharge — 32 each, exactly matching Observatory's per-channel count).
CAPSTONE = 20 pickups (10 items, 6 trinkets, 4 familiars) for the 12
flagship-enemy 3rd tiers, the 5 hardest Challenge rungs, and the 3 grand
Collection rungs — Orrery-themed (brass clockwork, indigo sky, `#e0b45a`
accent), fully separate from `SUPERBOSS_REWARDS`.

## Achievement summary by category

| Category | Count | Notes |
|---|---|---|
| Slayer | 144 | 66 `addTierSet` calls; 54 non-flagship (2 tiers each) + 12 flagship (3 tiers each) |
| Challenge | 8 | 6 superboss-room feats + 2 per-floorKey speedruns |
| Exploration | 21 | 2 floor-reach + 1 superboss first-sight + 18 enemy first-sight (9/floorKey) |
| Collection | 7 | 3 tiers × 2 floorKeys + 1 grand |
| **Total** | **180** | |

## Verification (exact output)

1. `node --check` on every touched file: clean (`defs-10.js`, `items-5.js`,
   `trinkets-2.js`, `familiars-2.js`, `items-1.js`, `items-2.js`, `game.js`,
   `combat-2.js`).
2. Full repo sweep — `for f in $(find js -name "*.js"); do node --check "$f"
   || echo FAIL; done` — zero FAIL lines.
3. Node harness loaded every `<script>` from `index.html` except
   `main.js`/`ui.js`/`render.js`/`roomEditor.js`/`bestiary.js` (63 files,
   including all `achievements/*.js` and `defs-10.js`) — **zero thrown
   errors**.
4. `ACHIEVEMENTS.length`: **2356 → 2536** (delta **180**, exact match).
5. Zero duplicate achievement `id` across the full 2536-entry array.
6. Zero *new* reward-target collisions — the only collision found was the
   pre-existing `itemId:championscrown` shared by 25 `completionist_<class>`
   achievements (predates this batch, expected/ignored per the dispatch).
7. No new stat-tracking code was added — every Challenge condition reuses an
   existing per-run/per-boss-room flag (`tookDamageThisBossRoom`,
   `tookDamageThisFloor`, `tookDamageThisRun`, `redMax`,
   `visitedShopThisRun`) or `game.runElapsed`; every Collection/Exploration
   condition rides the existing `unlocks.bestiary.enemyKills` bucket via
   `bumpBestiaryCount`.
8. Every new locked pickup (180: 160 trophies + 20 capstones) has a complete
   data-table entry, is referenced by exactly one achievement, and none of
   the 6 new trinkets appear in `SUPERBOSS_REWARDS`'s consumed
   (`TRINKET_LIST.filter`) set.
9. Cross-checked every `itemId`/`trinketId`/`familiarId` referenced in
   `defs-10.js` against `ITEMS`/`TRINKETS`/`FAMILIAR_TYPES` — zero
   missing/dangling references.
10. Functional smoke test (live harness, stubbed `loadUnlocks`/`toast`):
    - Killed `gearhound` ×10 via `bumpBestiaryCount` → `slayer_gearhound_t1`
      unlocked: **true**.
    - Killed 11 distinct `'6D'` roster ids → `checkOrreryCollection` unlocked
      `collection_orrery_6d_t1`: **true**.
    - Direct `unlockAchievement('challenge_orrery_flawless', game)` →
      unlocked: **true**.
    - `recalcPlayerStats` with `ortrophy_slayer_gearhound_t1` granted → luck
      1 (expected 1).
    - `recalcPlayerStats` with `ringwardenplating` (heart-only capstone) →
      meleeDamage/rangedDamage stayed at base 1/1, confirming it is
      deliberately absent from the damage formulas (heart container grant
      happens on pickup, not in `recalcPlayerStats`).
    - `recalcPlayerStats` with `gearclutchcore` (+1 all attacks item
      capstone) → meleeDamage/rangedDamage both 2 (expected 2/2).
    - `recalcPlayerStats` with trinket `stillmechanism` (+1 all attacks
      capstone) → meleeDamage/rangedDamage both 2 (expected 2/2).

## Deviations from the dispatch

None. Scale landed at exactly 180 achievements (top of the stated 180-220
range, matching Observatory's own count 1:1 since the shape — 2 floorKeys,
66 enemies, 1 superboss — is identical). Capstone count is 20, within the
requested ~15-25 band.
