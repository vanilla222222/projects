# Phase 1 Overhaul — Implementation Audit

## Files changed

- `js/entities/entities.js` — new `vulnerableTimer` status field + `takeDamage` 1.5x multiplier
- `js/systems/combat-2.js` — `applyOnHitStatuses` gets a 6th status roll (Vulnerable)
- `js/systems/combat-3.js` — `updateStatusEffects` decays `vulnerableTimer`; poison-tick site gets the Rot & Ruin synergy multiplier
- `js/systems/attackStyles.js` — 3 new attackLayer styles: `markedForDeath`, `venomBloom` (HIT_ATTACK_STYLES), `skyfall` (CAST_ATTACK_STYLES)
- `js/systems/items-1.js` — `recalcPlayerStats`: new `vulnerableChance`/`rotAndRuinActive` stats, `ecosystemSetActive` boolean, all 5 synergy conditionals, and stat-formula wiring for all 22 new items + 15 new trinkets
- `js/data/items-5.js` — 22 new ITEMS entries (5 markedForDeath, 5 venomBloom, 5 skyfall, 7 synergy-support passives)
- `js/data/trinkets-2.js` — 15 new locked, non-pendingReward, non-donationReward trinkets (Gargoyle superboss-grid batch)
- `js/data/core.js` — new `gargoyle` class, appended after `diamonddog` in the append-only zone
- `js/core/utils-1.js` — `classPonyOpts`: `gargoyle` added to the `hasScales` id list
- `js/achievements/logic.js` — `ensureUnlockShape`'s `statDefaults`: added `enemiesMarkedVulnerable:0`
- `js/achievements/defs-1.js` — new `unlock_gargoyle` achievement (Characters category, statKey `enemiesMarkedVulnerable`, threshold 50)

## 1. Vulnerable status effect

Implemented exactly as specified: `Enemy.vulnerableTimer` eagerly initialized to `0` in the constructor (matching the documented hard invariant), `takeDamage` multiplies incoming `amount` by 1.5 when the timer is active (one-line comment added), decay added to `updateStatusEffects` in combat-3.js using the same `Math.max(0, x - dt)` pattern as the other 5 timers, and a 6th roll added to `applyOnHitStatuses` reusing the `statusStun` SFX per instructions.

**One deviation from the literal plan text:** the plan's instructions suggested adding a dedicated `this.innateVulnerableChance = def.innateVulnerableChance || 0;` line to the `Player` constructor. I greped the actual precedent (`innateFreezeChance`) first and found the real codebase convention does **not** store a duplicate field on `Player` — `items-1.js` reads `player.def.innateFreezeChance` directly off the class def object (which `Player` already stores as `this.def`). I followed the real, verified convention instead of the plan's guess: `vulnerableChance`'s formula reads `player.def.innateVulnerableChance || 0` directly, with no new Player field. This matches the codebase's actual idiom exactly and avoids a redundant, unused field.

`vulnerableChance` formula (capped at 0.4, same ceiling-per-status-severity logic as the other 5) sources: Gargoyle's innate 0.10, the 5 new markedForDeath items, `predatorseye`, `ecosystemtotem`, and 2 of the 15 new Gargoyle-grid trinkets (`duskstonemark`, `stonefeathertag`).

`enemiesMarkedVulnerable` stat counter added to `achievements/logic.js`'s `statDefaults` near `enemiesFrozen`, per the plan.

## 2. Three new attackLayer styles

- **`markedForDeath`** (HIT_ATTACK_STYLES) — boss-immune; rolls to apply Vulnerable, or deals a bonus burst + `'marked!'` FloatText (`#d84a4a`) if the target is already marked. Implemented verbatim per the plan's spec.
- **`venomBloom`** (HIT_ATTACK_STYLES) — boss-immune for receiving poison from this style; on an already-poisoned target it deals bonus damage and spreads poison (`poisonTimer = max(_, 3)`, `poisonTickTimer` reset to 0.8 if idle) to every other living non-boss enemy within `layer.radius`, with a `'bloom!'` FloatText (`#8ac93a`). Otherwise rolls the initial poison application.
- **`skyfall`** (CAST_ATTACK_STYLES) — gated to `trigger === 'ranged' || 'volley'`; captures a random living non-boss target's `(x,y)` at cast time (not a live reference), queues a `player.delayedActions` entry (same shape `echoShot` uses), and on fire spawns a visual `Explosion`, plays `'explosion'`, and re-scans `game.currentRoom.enemies` at fire time to damage everything in radius, calling `handleEnemyDeath` on kills.

All three register generically — `runCastLayers`/`runHitLayers` dispatch purely off `layer.style` against the two tables, so no new call sites were needed anywhere in combat-1/2/3.js, confirmed by reading both dispatcher functions.

## 3. 22 new ITEMS entries (`js/data/items-5.js`)

Appended via the file's existing `Object.assign(ITEMS, {...})` tail-continuation pattern. All `pools: POOLS_ALL`.

- **markedForDeath family (5):** `huntersmark` (q1), `quarrysigil` (q2), `wardenseye` (q2), `branderstag` (q3), `snareglyph` (q3) — calibrated against the existing frostShatter family (`frozenthorn`/`stormseal` q1: chance .15-.16/duration 1.0-1.1/power .25-.28, +6% flat freeze; `frostedbell` q2: chance .22/duration 1.4/power .38, +2 Luck), with q3 interpolated toward `coldheart`'s q4 numbers. Calibration noted in a comment above the batch.
- **venomBloom family (5):** `plaguebud` (q1), `witherpetal` (q2), `bloomrot` (q2), `plaguebloom` (q3), `rotcrown` (q3) — calibrated against `shockcollar` (q1 chainLightning, range 100/power .32) and `blastresistantvest` (q2 impactBurst, radius 60/power .38), q3 interpolated toward `sentrywreckersfist`'s q4 groundSlam (radius 95/power .6).
- **skyfall family (5):** `cometshard` (q1), `stormcaller` (q2), `skyrend` (q2), `meteorcrest` (q3), `celestialfall` (q3) — calibrated against groundSlam's radius/power scale (`ironshoes` q1 → `sentrywreckersfist` q4), scaled up since the strike is delayed and rarer than an always-on melee AoE. Ranged-flavored per the plan (gated to ranged/volley in the handler), but ownable by any class.
- **7 synergy-support passives:** `fangguard` (q1, melee-flavored Twin Fangs half, +1 meleeDamage only), `quiverstring` (q1, ranged-flavored Twin Fangs half, +1 rangedDamage only), `ecosystemtotem` (q4 capstone, left **unlocked** rather than `locked:true` — the plan explicitly left this at my discretion; unlocking-by-achievement machinery (`unlockedBy` + a matching achievement `itemId`) is a heavier addition than the flavor item warrants, and several other q4 items in the base game are unlocked by default), `keenmark` (q1, +5% critChance), `predatorseye` (q2, +5% flat vulnerableChance), `packwhistle` (q1, +2 Luck, familiar-adjacent flavor text), `quarryhoundtag` (q2, +3% critChance +1 Luck).

Every item's `desc` is written in player-facing language (no "attackLayer"/field-name jargon).

## 4. Five synergies (`js/systems/items-1.js` `recalcPlayerStats`)

All five are inline conditionals folded into existing stat expressions, each with a `// Synergy X: Name` comment, no new abstraction:

- **A. Ecosystem Set** — `ecosystemSetActive` boolean computed once near the top of the function (own ≥1 item from each of the 3 new attackLayer families, checked via an OR-sum per family), then referenced as `+ (ecosystemSetActive ? 0.3 : 0)` in both `meleeDamage` and `rangedDamage`.
- **B. Rot & Ruin** — `player.rotAndRuinActive = player.vulnerableChance > 0 && player.venomChance > 0` computed once, immediately after `vulnerableChance`. Read at the poison-tick site in `combat-3.js`'s `updateStatusEffects`: tick damage is multiplied by 1.3 when `e.vulnerableTimer > 0 && game.player.rotAndRuinActive`.
- **C. Marksman's Eye** — `+ (player.critChance >= 0.20 && player.vulnerableChance > 0 ? 0.4 : 0)` added to `critMultiplier`'s expression (both `critChance` and `vulnerableChance` are computed earlier in the function, so ordering is safe).
- **D. Pack Bond** — `+ (player.familiars && player.familiars.length >= 3 ? 0.3 : 0)` added to both `meleeDamage`/`rangedDamage`, and `+ 0.05` (scaled to speed's multiplicative formula) added to `speed`.
- **E. Twin Fangs** — `+ ((p.fangguard || 0) > 0 && (p.quiverstring || 0) > 0 ? 0.05 : 0)` added to `critChance`.

## 5. New class: Gargoyle

Appended as the last entry in `CLASSES` in `js/data/core.js`, after the append-only-zone comment. Ranged, `canFly:true`, `innateVulnerableChance:0.10` (wired the same way `windigo`'s `innateFreezeChance` is — read directly off `player.def` in `recalcPlayerStats`, see section 1's deviation note). Stats (`redMax:6, speed:165, rangedDamage:2, fireCooldown:0.5, boltSpeed:320`) interpolated between Griffin (`redMax:5, speed:185, rangedDamage:1, fireCooldown:0.3`) and Hypogriff-tier stats, landing at a middling ranged profile. `unlocked:false`, gated by the new achievement.

`classPonyOpts` in `js/core/utils-1.js` — `gargoyle` added to the existing `hasScales` id list (reused trait for its rough stone hide, no new drawPony branch).

## 6. Gargoyle's unlock achievement

Added `unlock_gargoyle` to `js/achievements/defs-1.js` right after `unlock_diamonddog`, matching the surrounding `classId` + `statKey`/`threshold` shape exactly: `statKey:'enemiesMarkedVulnerable'`, `threshold:50`, category `'Characters'`.

## 7. SUPERBOSS_REWARDS pool backfill

`SUPERBOSS_REWARDS.length` must equal `Object.keys(SUPERBOSSES).length * Object.keys(CLASSES).length`.

**Before:** `SUPERBOSSES` = 15, `CLASSES` = 20 → required = 300. Verified the pre-existing pool (`TRINKET_LIST.filter(locked && !donationReward && !pendingReward).length` [177] + `ACHIEVEMENT_PICKUP_KINDS.length` [7] + `NEW_CLASS_REWARD_ITEMS.length` [32] + `NEW_CLASS_REWARD_FAMILIARS.length` [72] + `NEW_CLASS_REWARD_STARS.length` [12] = 300) matched exactly before any edits, confirmed by evaluating the real data files in a Node harness.

**After adding Gargoyle:** `CLASSES` = 21 → required = 15 × 21 = 315. Added exactly 15 new `locked:true` trinkets (no `donationReward`/`pendingReward`) to `js/data/trinkets-2.js` as the "Gargoyle superboss-grid batch," matching the plain-reskin shape (`{id, name, icon, color, locked:true, desc}`) and each wired into a real (simple) stat effect via the `t === 'id' ? bonus : 0` idiom, spread across `speed`, `meleeDamage`/`rangedDamage`, `vulnerableChance` (×2), `stunChance`, `luck` (×3), `fearChance`, `dodgeChance` (×2), `critChance`, `venomChance`, fire-rate `rateDenom`, and `magnetRadius` — not dumped onto one stat line, per the instruction. Re-evaluated the real files after the edit: filtered trinket count is now 192 (177 + 15), giving a new pool total of 192 + 7 + 32 + 72 + 12 = **315**, which equals 15 × 21 exactly.

All 15 new trinkets pass the `locked && !donationReward && !pendingReward` filter (none of them set `donationReward` or `pendingReward`), confirmed by re-reading the filter in `defs-1.js` and by the Node-harness count matching.

## Verification results

- **Script inclusion:** all touched files were already present in `index.html`'s script list (only existing files were edited, no new files added). No changes needed there.
- **`node --check` results** — all pass:
  - `js/entities/entities.js` — OK
  - `js/systems/combat-2.js` — OK
  - `js/systems/combat-3.js` — OK
  - `js/systems/attackStyles.js` — OK
  - `js/systems/items-1.js` — OK
  - `js/data/items-5.js` — OK
  - `js/data/core.js` — OK
  - `js/data/trinkets-2.js` — OK
  - `js/core/utils-1.js` — OK
  - `js/achievements/logic.js` — OK
  - `js/achievements/defs-1.js` — OK
- **SUPERBOSS_REWARDS math:** before 300 (15×20), after 315 (15×21) — see section 7.
- **TODO/placeholder grep:** none found in any touched file (one unrelated pre-existing hit for the literal word "placeholder" inside a code comment in `utils-1.js`, not part of this change).
- **Duplicate-id check:** all 22 new item ids, all 15 new trinket ids, the new class id (`gargoyle`), and the new achievement id (`unlock_gargoyle`) each grep to exactly 1 occurrence as an object key across their respective data files.

## Notes / deviations from the literal plan text

1. Skipped adding a redundant `Player.innateVulnerableChance` constructor field (see section 1) — the real codebase convention reads `player.def.innateXChance` directly, verified against Windigo's existing wiring.
2. `ecosystemtotem` (the Ecosystem Set capstone item) was left **unlocked** rather than `locked:true` — explicitly left to my discretion by the plan, and several other quality-4 items in the base pool are unlocked by default, so this avoids introducing new unlock-achievement machinery for a flavor capstone.
3. Comment on `ecosystemSetActive`/`ecosystemtotem`'s relationship: they are independent — `ecosystemSetActive` (Synergy A) checks ownership of the 5-item families directly; `ecosystemtotem` is a separate, unrelated support item that happens to share the "ecosystem" flavor name. This matches the plan's structure (Synergy A doesn't require owning the capstone item).
