# Phase 2 overhaul — audit

## Files changed

- `js/CODE_REFERENCE.md` — Step 0a (retroactive Phase 1 docs) + Step 0b (Phase 2 docs).
- `js/systems/ai-2.js` — added `aiSkirmisher`, `aiWhiplash` (new regular-enemy behaviors).
- `js/systems/ai-3.js` — added `aiBossEclipseWraith`, `aiBossIronBastion` (new non-summoning boss patterns).
- `js/systems/combat-3.js` — registered all 4 new behaviors in `updateEnemy`'s `switch (e.behavior)`.
- `js/core/utils-2.js` — added `skirmisher`/`whiplash` gear-mark blocks to `_humanoidStatic`.
- `js/data/enemies/types-1.js` — 8 new `ENEMY_TYPES` entries: `boneskirmisher`, `rattleraider` (stage 0), `brambleflail`, `vinewhip` (stage 1), `sandskirmisher`, `dustraider` (stage 2), `cinderlash`, `emberwhip` (stage 3).
- `js/data/enemies/types-2.js` — 1 new `ENEMY_TYPES` entry: `gutterskirmisher` (floorKey `'3C'`).
- `js/data/enemies/types-3.js` — 1 new `ENEMY_TYPES` entry: `drainlash` (floorKey `'5C'`).
- `js/data/enemies/bosses.js` — 2 new `BOSS_TYPES` entries: `eclipsewraith`, `ironbastion` (both stage 0).

No files were deleted or restructured; every change is additive except the doc rewrites in CODE_REFERENCE.md (which edit existing prose in place to keep counts/facts current).

## Step 0a — retroactive Phase 1 documentation

All read from the actual current code (not guessed) before writing:

- **Vulnerable status** — added a dedicated paragraph under `entities/entities.js`'s Enemy section covering `vulnerableTimer` (eager-init 0), the 1.5x `takeDamage` multiplier, the roll site in `combat-2.js`'s `applyOnHitStatuses` (confirmed it lives inside that function, not a separate call — updated the function's doc line accordingly), decay in `combat-3.js`'s `updateStatusEffects`, its Gargoyle `innateVulnerableChance` source, and the `enemiesMarkedVulnerable` achievement counter (added to `logic.js`'s `statDefaults` list in the doc, and to `ensureUnlockShape`'s counter enumeration). Updated the "5 statuses" fact to 6 in the two places that stated a count (`applyOnHitStatuses` and `updateStatusEffects` doc lines) and confirmed Vulnerable follows the identical boss-immunity rule as the other five (nothing ever sets it on a boss, so `takeDamage`'s multiplier is simply never live there — no explicit `isBoss` guard needed in `takeDamage` itself, verified against the actual code).
- **3 new attackLayer styles** — added `markedForDeath`/`venomBloom` to the `HIT_ATTACK_STYLES` list (both places it's enumerated: the `attackLayer` sub-object section under data/items and the full attackStyles.js section) and `skyfall` to `CAST_ATTACK_STYLES`, with full per-style writeups matching the density of neighboring entries (`frostShatter`, `chainLightning`, `echoShot`, etc.). Updated the "13 verbs" claim to 16.
- **22 new ITEMS entries** (items-5.js) — read the actual "PHASE 1 OVERHAUL" block at the tail of the file; documented as a new bullet in the `items-5.js` Batches/history entry, broken into the same 5/5/5/7 grouping the in-file comments use (markedForDeath-family, venomBloom-family, skyfall-family, synergy-support passives), naming representative items per group.
- **15 new locked trinkets** (trinkets-2.js) — read the "GARGOYLE SUPERBOSS-GRID BATCH" comment block; documented in the `trinkets-2.js` Batches/history entry with the same style-channel breakdown convention used for the C-branch batch above it (speed/damage/Vulnerable-chance/stun/luck/fear/dodge/crit/poison/fire-rate/damage+luck/magnetism).
- **5 new synergy conditionals** — grepped every `Synergy A`..`Synergy E` comment in `items-1.js`'s `recalcPlayerStats` and wrote a new `#### Synergies (Phase 1 overhaul)` subsection (items.js doc, right after the `player.attackLayers` bullet) since the doc had no prior synergy-pattern description. Also added a `player.vulnerableChance` bullet to the main stat list (previously entirely undocumented) noting it has no luck-scaled lead term, unlike its five sibling status-chance stats — confirmed by reading the actual formula.
- **Gargoyle class** — added to the `CLASSES` count/list (15→16) with a short paragraph (matching the density of other single-class mentions), an `innateVulnerableChance` schema bullet (mirroring the existing `innateFreezeChance` bullet), and a note in `classPonyOpts`'s doc that it reuses `hasScales`.
- **`unlock_gargoyle` achievement** — covered via the CLASSES section's unlock-hint mention and the `enemiesMarkedVulnerable` statDefaults note; the achievements section doesn't enumerate individual achievement ids elsewhere in the doc (confirmed by reading that whole section), so no additional per-achievement entry was warranted.

No deviations from the assignment in this step.

## Step 0b — Phase 2 documentation

- Added `aiSkirmisher`/`aiWhiplash` writeups to the "Regular enemy behaviors" list, same density/style as neighboring entries (`aiSentry`, `aiLobber`, etc.), explicitly noting neither needed new `Enemy` constructor fields (confirmed `fireTimer`/`attackTimer`/`telegraph` are all already eagerly initialized generically).
- Added `aiBossEclipseWraith`/`aiBossIronBastion` rows to the boss-pattern table, and updated the "17 non-summoning patterns" / "~42 boss cases" counts in the dispatch-overview prose.
- Updated `ENEMY_TYPES`/`BOSS_TYPES` entry counts (679→689, 58→60 — verified by grep-counting `id:` occurrences post-edit) and the per-behavior tuning-field enumeration (added `engageRange`/`retreatRange`/`dashSpeed` and `whipRange`/`whipCooldown`/`whipTelegraph`/`whipDamageMult`).
- Documented the two new `_humanoidStatic` gear marks (chevron for skirmisher, lash line for whiplash), and noted they're static-only (no animated "gear flourish" companion in `drawBrownHumanoid`), matching what was actually implemented.
- While auditing entry/trinket counts for the 0a items, found the ITEMS/TRINKETS header counts were also stale (1075→1097, 440→455 — both already off before this phase, from the Phase-1 batches never having updated them) and corrected them in the same pass since they're directly adjacent to the batches being documented.

No deviations from the plan in this step either — both new regular behaviors and both new boss patterns are implemented, registered, and documented exactly as specified.

## Implementation notes / deviations from the plan text

- **Kiting-away convention**: the plan allowed either mirroring `aiSniper`/`aiAmbusher` or a simple `chaseSeek`-with-flipped-target. `aiSniper`/`aiLobber` both use the "invert `seekVector`, `tryMoveEntity` directly away" pattern (not `chaseSeek`), so `aiSkirmisher`'s retreat copies that exact convention rather than the `chaseSeek`-based fallback the plan sketched, since it's the pattern actually used elsewhere in the file.
- **`damagePlayer` call convention**: confirmed via grep across all of ai-1..4.js that every telegraphed/contact hit uses `damagePlayer(game, playerDamageAmount(game, isBoss, e.dmg), e.type.id)`. `aiWhiplash` uses this exact shape with `e.dmg * (t.whipDamageMult||1)` as the `dmgHalves` argument.
- **`burstRadius` requirement for `aiBossIronBastion`**: confirmed (didn't assume) that `render.js`'s ground-target-marker draw is generic — keyed off `e.lobTimer`/`e.lobX`/`e.lobY`/`e.type.burstRadius`, not gated to any specific boss id/behavior — so reusing `aiBossRotBloom`'s exact `lobTimer`/`lobX`/`lobY` field names plus setting `burstRadius:85` on the `ironbastion` `BOSS_TYPES` entry was sufficient with zero renderer changes.
- **Enemy placement spread**: skirmisher placed in stage 0 (Crypt, ×2), stage 2 (Desert, ×2), floorKey `'3C'` (Gutters, ×1); whiplash placed in stage 1 (Forest, ×2), stage 3 (Inferno, ×2), floorKey `'5C'` (Sewers, ×1) — 3 distinct stage/floorKey groups apiece, each entry calibrated in an inline comment against 1-2 named same-pool existing entries per the plan's instruction.
- **Boss placement**: both new bosses assigned to stage 0 (Crypt), joining `warlord`/`bonesentinel`/`bonecaller`/`gravechorus` in that stage's `resolveGenericBoss` pool, calibrated in an inline comment against `warlord` (glass-cannon comparison) and `bonesentinel` (siege-body comparison).

## Verification

**`node --check` results** (all pass):

```
js/systems/ai-2.js                       OK
js/systems/ai-3.js                       OK
js/systems/combat-3.js                   OK
js/core/utils-2.js                       OK
js/data/enemies/types-1.js               OK
js/data/enemies/types-2.js               OK
js/data/enemies/types-3.js               OK
js/data/enemies/bosses.js                OK
```

Additionally concatenated every script tag from `index.html` (in load order) into one bundle and ran `node --check` on the whole thing — passes (`BUNDLE_OK`), confirming no cross-file syntax issue. Also loaded the full bundle with minimal DOM/localStorage/AudioContext stubs under real Node execution (not just parse-check) — it ran top-to-bottom with no `ReferenceError`/`TypeError`, confirming every new object literal (`ENEMY_TYPES`/`BOSS_TYPES` entries) and function definition executes cleanly at load time.

**Duplicate-id check** — grepped all of `js/data/enemies/*.js` for each of the 12 new ids; every one appears exactly once:

```
boneskirmisher: 1   rattleraider: 1   sandskirmisher: 1   dustraider: 1
gutterskirmisher: 1 brambleflail: 1   vinewhip: 1          cinderlash: 1
emberwhip: 1         drainlash: 1     eclipsewraith: 1     ironbastion: 1
```

**Dispatch-correctness check** — cross-referenced `combat-3.js`'s new `case` lines against the actual function names/behavior strings, all exact matches (no typos, no silent fallback to the `default:` chaser warning):

```
case 'skirmisher': aiSkirmisher(game, e, dt); break;        ↔ function aiSkirmisher(game, e, dt){        (ai-2.js)
case 'whiplash': aiWhiplash(game, e, dt); break;             ↔ function aiWhiplash(game, e, dt){          (ai-2.js)
case 'bossEclipseWraith': aiBossEclipseWraith(game, e, dt);  ↔ function aiBossEclipseWraith(game, e, dt){ (ai-3.js)
case 'bossIronBastion': aiBossIronBastion(game, e, dt);      ↔ function aiBossIronBastion(game, e, dt){   (ai-3.js)
```

Confirmed `behavior:'skirmisher'` appears 5x, `behavior:'whiplash'` 5x, `behavior:'bossEclipseWraith'`/`behavior:'bossIronBastion'` 1x each across the data files, matching the entry counts above and matching the switch-case strings exactly.

**`_humanoidStatic` field-name check** — the two new `else if` blocks test `behavior === 'skirmisher'`/`behavior === 'whiplash'`, both of which are the exact strings registered in `combat-3.js`'s switch and in the `ENEMY_TYPES` entries above — no mismatch.

The game was not run/playtested, per the standing rule and the plan's explicit instruction — syntax check + structural verification only.
