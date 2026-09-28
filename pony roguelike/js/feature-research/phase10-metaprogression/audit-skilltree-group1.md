# Audit — Skill tree Phase 10 Part B, Content Group 1

**Scope:** 250 new skill-tree nodes, 50 each for `earth`, `pegasus`, `unicorn`,
`batpony`, `zebra`. Branch letters **i / j / k / l**.

## Files changed

| File | Change |
| --- | --- |
| `js/achievements/skilltree-characters-4a.js` | Placeholder skeleton replaced with the full 250-node content table (`SKILL_TREE_CHARACTER_CONFIG_4A`) + `buildCharacterSkillNodes4A`. **Only source file touched.** |
| `js/CODE_REFERENCE.md` | New section "Skill tree — Phase 10 Part B, Group 1", inserted immediately before the existing Group 3 section. |
| `feature-research/phase10-metaprogression/audit-skilltree-group1.md` | This file (new). |

Not touched: `index.html`, `skilltree.js`, `entities.js`, any `combat-*.js`, and any
other `skilltree-characters-4*.js`.

## Topology

Four fresh branches per character hung directly off `char_hub_<classId>`. No existing
a–h node is re-parented or edited. All four branches share one wide, shallow shape
(max depth 5 purchases from the hub):

```
X1                       (X = i|j|k|l; parent = char_hub_<classId>)
 +- X2                    +- X3
 |   +- X4                |   +- X6
 |   |   +- X8            |   |   +- X10
 |   |       +- X12       |   |       +- X13   (13-node branches only)
 |   +- X5                |   +- X7
 |       +- X9            |       +- X11
```

Branch sizes **i:13, j:13, k:12, l:12 = 50** per character.

`parent` in the config table is either `'hub'` or a branch key within the same
character, so a parent reference cannot dangle outside this file plus the hub.

## Per-character summary

### earth — the immovable bruiser
- **i Bedrock Bulwark** — a genuine armour line: `damageTakenMult` `uniqueField`,
  −0.23 summed over 10 nodes, paid for with speed and melee cooldown.
- **j Quakestep** — `shockwaveAttack` `uniqueFlag` (her swing shatters rock/tallrock)
  plus `baseRangeTiles` as ground tremor (+1.5, exactly its own bound), plus
  stun/fear from ground slams.
- **k Furrowed Fortune** — luck / magnet / crit / vulnerable, the pure-stat branch.
- **l Skyfurrow Heresy** — the transformation: `canFly` `uniqueFlag`.

**Tradeoff examples:**
1. `char_earth_l1` *Hollow Bones* (cursed, −5% melee damage) is the sole parent of the
   whole branch, and `char_earth_l2` *Skyfurrow* pairs the `canFly` grant with
   `damageTakenMult` **+0.05** on the same node — she can fly, she hits softer, and she
   is easier to hurt.
2. `char_earth_i11` *Anvil Posture* — +5% melee damage **and** −3% movement speed on one
   node, sitting behind the cursed `i7` (+4% melee cooldown).

### pegasus — the fast, flimsy flier
- **i Gale Buffet** — wing-buffet `baseRangeTiles` (+1.30), a wing-downdraft
  `shockwaveAttack`, and its own `rockCoinChance` payout (+0.09).
- **j Featherframe** — shrinks `player.radius` from 12 → 8.4px over 9 nodes.
- **k Weatherworker** — freeze / charm / luck.
- **l Stormchaser** — speed / crit / melee.

**Tradeoff examples:**
1. The whole **j** branch: every radius node either carries `damageTakenMult` **+0.04**
   itself (`j2`, `j12`) or sits behind the cursed `j5` *Brittle Pinions*
   (`damageTakenMult` +0.05). Net +0.07 fragility for a ~30% smaller hitbox.
2. `char_pegasus_i3` *Downdraft Slam* — the `shockwaveAttack` grant costs +4% melee
   cooldown on the same node.

**Deliberate omission:** no `dodgeChance` anywhere. `-characters-2.js` already gives her
+0.24 of the 0.25 cap; anything added here would be clamped away.

### unicorn — the horn
- **i Runeforge** — rangedDamage / crit / vulnerable.
- **j Shardsong** — the attack transformation (see below).
- **k Farsight** — rangeTiles / boltSpeed, capped by an `unlimitedRange` grant.
- **l Wardweave** — dodge / fear / `damageTakenMult` / `radius`.

**Tradeoff examples:**
1. `char_unicorn_j2` *Shardsong Awakening* — six effects on one node: `charged` +
   `crystalVolley` `uniqueFlag`s, `crystalShardCount` +3, `chargeTime` +0.55s, and
   `rangedDamage` **−0.05**. Her loose bolts are gone; she now holds and releases a fan
   of converging shards that ignores range. It sits behind the cursed `j1` *Held Breath*
   (+5% fire cooldown), and the deepest charge-time refund (`j8`) sits behind a second
   cursed node `j5` *Long Draw* (+0.2s charge).
2. `char_unicorn_k9` *Unbounded Bolt* — `unlimitedRange` grant paired with
   `boltSpeed` −0.05, behind the cursed `k5` *Thinned Weave* (−4% ranged damage).

### batpony — the night hunter that feeds
- **i Echolocation** — `baseRangeTiles` (+1.30) + crit + stun.
- **j Bloodfeast** — her innate lifedrink pushed: lifesteal + on-kill heal + venom.
- **k Roost Swarm** — borrowed `summonsChangelings`.
- **l Nightwing** — dodge / `radius` / speed / crit.

**Tradeoff examples:**
1. `char_batpony_k1` *Splitting the Colony* (cursed, −5% melee damage) gates the whole
   swarm; `k5` *Feeding the Roost* (cursed, +5% `damageTakenMult`) gates the third
   roostmate; `k9` *Ravenous Brood* pairs +0.1 minion dps with −4% of her own melee.
2. `char_batpony_j1` *Thirst* (cursed, +5% `damageTakenMult`) is the sole parent of every
   lifesteal/on-kill node, and `j12` *Blood Frenzy* adds +4% melee damage **and** +4%
   damage taken.

**Implementation note:** `changelingMinionDmg`/`changelingMinionRadius` default to **0**
for every class without the queen's `def` fields, so the grant node seeds them (0.45 dps
/ 22px) itself — without that the swarm would be a visible but completely inert cosmetic.

### zebra — the apothecary brawler
- **i Apothecary's Satchel** — stun / charm / fear / vulnerable brews.
- **j Gourd and Sling** — thrown-gourd `baseRangeTiles` (+1.30), `shockwaveAttack` as
  pigment-grinding, `rockCoinChance` (+0.09).
- **k Warpaint** — `damageTakenMult` −0.24 + `radius` −1.2.
- **l The Bone Toll** — her signature melee spikes, bought in hide.

**Tradeoff examples:**
1. `char_zebra_l1` *The Bone Toll* (cursed, `damageTakenMult` **+0.06**) gates the whole
   branch; `l5` *Ribs Showing* (cursed, +0.05) gates the +7% melee payoff; `l12`
   *Last Toll* adds another +0.04. The branch's full melee/crit gain costs +0.15 damage
   taken.
2. `char_zebra_i12` *Solvent Coating* — +3% vulnerable and +4% melee cooldown on one node.

**Deliberate omission:** no `venomChance` anywhere. `-characters-2.js` already gives her
+0.24 of the 0.25 cap.

## Chance-stat totals (verified by script over the fully-loaded node set)

`mine` = this file only. `all` = `skilltree-characters.js` + `-2.js` + `-3.js` + this
file. Cap is 0.25 except `lifestealChance` (0.10, `SKILL_TREE_STAT_CAP_OVERRIDES`).

| class | stat | mine | all | cap | clamped? |
| --- | --- | ---: | ---: | ---: | --- |
| earth | critChance | +0.07 | 0.23 | 0.25 | no |
| earth | dodgeChance | +0.10 | 0.10 | 0.25 | no |
| earth | fearChance | +0.06 | 0.06 | 0.25 | no |
| earth | stunChance | +0.10 | 0.10 | 0.25 | no |
| earth | vulnerableChance | +0.10 | 0.10 | 0.25 | no |
| pegasus | charmChance | +0.10 | 0.10 | 0.25 | no |
| pegasus | critChance | +0.13 | 0.13 | 0.25 | no |
| pegasus | dodgeChance | 0 | 0.24 | 0.25 | no (untouched on purpose) |
| pegasus | freezeChance | +0.13 | 0.13 | 0.25 | no |
| pegasus | stunChance | +0.07 | 0.07 | 0.25 | no |
| unicorn | charmChance | 0 | 0.24 | 0.25 | no (untouched on purpose) |
| unicorn | critChance | +0.19 | 0.19 | 0.25 | no |
| unicorn | dodgeChance | +0.10 | 0.10 | 0.25 | no |
| unicorn | fearChance | +0.10 | 0.10 | 0.25 | no |
| unicorn | vulnerableChance | +0.10 | 0.10 | 0.25 | no |
| unicorn | freezeChance / stunChance / venomChance | 0 | 0.15 each | 0.25 | no |
| batpony | critChance | +0.14 | 0.14 | 0.25 | no |
| batpony | dodgeChance | +0.13 | 0.13 | 0.25 | no |
| batpony | **lifestealChance** | **+0.08** | **0.08** | **0.10** | no |
| batpony | onKillHealChance | +0.06 | **0.25** | 0.25 | no (exactly at cap) |
| batpony | stunChance | +0.07 | 0.07 | 0.25 | no |
| batpony | venomChance | +0.10 | 0.10 | 0.25 | no |
| zebra | charmChance | +0.10 | 0.10 | 0.25 | no |
| zebra | critChance | +0.14 | 0.19 | 0.25 | no |
| zebra | fearChance | +0.10 | 0.10 | 0.25 | no |
| zebra | stunChance | +0.10 | 0.10 | 0.25 | no |
| zebra | vulnerableChance | +0.13 | 0.13 | 0.25 | no |
| zebra | venomChance | 0 | 0.24 | 0.25 | no (untouched on purpose) |
| zebra | lifestealChance | **0** | 0.15 | 0.10 | **CLAMPED — pre-existing** |

The single clamped row (`zebra lifestealChance` 0.15 vs the 0.10 override) comes entirely
from `skilltree-characters-3.js`'s `e2a`/`e3a`/`e3b`. This file contributes **0** to it
and neither causes nor worsens it. Flagged for whoever owns the Phase 9 file.

Non-chance stat highs from this file (all under cap combined with prior files):
`pegasus speed` 0.24, `zebra speed` 0.23, `earth critChance` 0.23, `pegasus meleeDamage`
0.22, `zebra meleeDamage` 0.22, `unicorn rangeTiles` 0.21.

## uniqueField groups (all bounds verified identical per `classId|field`)

| classId \| field | nodes | summed bonus | bounds | clamped? |
| --- | ---: | ---: | --- | --- |
| earth \| damageTakenMult | 10 | −0.18 | [−0.25, 0.25] | no |
| earth \| baseRangeTiles | 6 | +1.50 | [0, 1.5] | no (exactly at bound) |
| pegasus \| baseRangeTiles | 5 | +1.30 | [0, 1.5] | no |
| pegasus \| rockCoinChance | 3 | +0.09 | [0, 0.12] | no |
| pegasus \| radius | 9 | −3.60 | [−3.6, 3.6] | no (exactly at bound) |
| pegasus \| damageTakenMult | 6 | +0.07 | [−0.25, 0.25] | no |
| unicorn \| crystalShardCount | 3 | +5 | [0, 5] | no (exactly at bound) |
| unicorn \| chargeTime | 5 | +0.20 | [0, 1.2] | no |
| unicorn \| damageTakenMult | 4 | −0.12 | [−0.25, 0.25] | no |
| unicorn \| radius | 2 | −1.0 | [−2, 2] | no |
| batpony \| baseRangeTiles | 5 | +1.30 | [0, 1.5] | no |
| batpony \| damageTakenMult | 5 | +0.10 | [−0.25, 0.25] | no |
| batpony \| changelingMinionDmg | 4 | +0.82 | [0, 1.0] | no |
| batpony \| changelingMinionRadius | 5 | +40 | [0, 40] | no (exactly at bound) |
| batpony \| maxChangelingMinions | 1 | +1 | [0, 1] | no |
| batpony \| changelingSummonCooldown | 2 | −2.5 | [−4, 0] | no |
| batpony \| radius | 3 | −1.2 | [−2, 2] | no |
| zebra \| baseRangeTiles | 5 | +1.30 | [0, 1.5] | no |
| zebra \| rockCoinChance | 3 | +0.09 | [0, 0.12] | no |
| zebra \| damageTakenMult | 9 | −0.09 | [−0.25, 0.25] | no |
| zebra \| radius | 3 | −1.2 | [−2, 2] | no |

`uniqueFlag` grants (8 total): `earth_j3` shockwaveAttack, `earth_l2` canFly,
`pegasus_i3` shockwaveAttack, `unicorn_j2` charged + crystalVolley, `unicorn_k9`
unlimitedRange, `batpony_k2` summonsChangelings, `zebra_j3` shockwaveAttack.

## Verification performed

- `node --check js/achievements/skilltree-characters-4a.js` — clean.
- Bundled `core.js` + `skilltree.js` + all four character-node files in load order and
  evaluated them, then asserted against the live arrays:
  - 250 nodes; exactly 50 per classId for all five.
  - **0** duplicate ids across the entire `SKILL_TREE_NODES` array.
  - **0** dangling `parent` references (every parent resolves in `SKILL_TREE_NODES_BY_ID`).
  - **0** effects whose `classId` disagrees with the node's own classId.
  - **0** nodes with an empty `effects` array; **0** nodes missing `name` or `desc`.
  - 26 `cursed:true` nodes, all debuff-only.
  - Per-`(classId, stat)` and per-`(classId|field)` sums as tabled above; bound
    consistency checked per `uniqueField` group.
- File re-read end to end for brace/paren balance and internal consistency.
- No runtime smoke test (per standing project preference — the user verifies by playing).

## Deviations from the brief

1. **`crystalVolleySpacing` dropped for unicorn.** The Shardsong transformation originally
   also seeded `crystalVolleySpacing` +34 and had three "widen the fan" nodes. Removed at
   the coordinator's direction. Mechanically this is a no-op for behaviour:
   `combat-2.js` reads `player.crystalVolleySpacing || CRYSTAL_VOLLEY_SPACING_DEFAULT`, so
   an unseeded (0) unicorn already gets the default 34px spread. The three freed nodes were
   retargeted to `boltSpeed` (+0.04/+0.03/+0.03) and renamed/rewritten to match
   (*Quickened Shards*, *Loosed Clean*, *Shardflight*) — shard flight speed is a real,
   already-wired knob for those projectiles.
2. **Fire-zone / fire-ring / turret mechanics not borrowed for the melee classes.** The
   brief invited borrowed mechanics; `greenFireAttack`, `innateFireRing` and
   `canBuildTurrets` were considered for earth/pegasus/batpony/zebra and rejected. All
   three derive damage from `player.rangedDamage`, which is 0 for every melee class
   (`updateGreenFireAttack` / `updateFireRingAttack` compute
   `dps = player.rangedDamage / fireCooldown`; `updateTurretBuild` snapshots
   `player.rangedDamage * turretDamageMult`), and the first two additionally suppress the
   normal attack dispatch (`if (!player.greenFireAttack && !player.innateFireRing)`), so
   granting one would leave the character with **no working attack at all**.
3. **`redMax` (max hearts) not used** despite being an attractive meta lever. It is
   mutated during a run (devil-deal hearts in `combat-2.js`, eternal-heart loss in
   `entities.js`), and `applySkillTreeUniqueFieldBonuses` rewrites
   `player[field] = pristineBase + clampedBonus` on **every** `recalcPlayerStats` call —
   which would silently revert those in-run changes.

## Open risks

1. **`baseRangeTiles` lands one recalc late.** `recalcPlayerStats` derives
   `rangeTiles`/`meleeRange` from `baseRangeTiles` *before*
   `applySkillTreeUniqueFieldBonuses` (its last statement) raises `baseRangeTiles`, so the
   bonus is visible from the *next* recalc onward. This is a pre-existing Phase 8c-2
   pattern (kelpie/dragon already ship `baseRangeTiles` nodes with the same behaviour), not
   something introduced here — but four of the five characters in this group now lean on
   it, so if it is ever fixed it should be fixed once in `skilltree.js`/`items-1.js`
   rather than per-file.
2. **Bat pony's roost bumps the queen's unlock counter.** `updateChangelingSummons` calls
   `bumpStat('changelingMinionsSummoned', 1, game)` unconditionally, so a bat pony running
   Roost Swarm will progress Changeling Queen's unlock. Harmless, arguably a feature, but
   worth knowing.
3. **`player.radius` is a new uniqueField target.** No other file writes `player.radius`
   (verified by grep), so the pristine-base capture is safe. It affects collision, being
   hit, and the drawn pony size; nothing in the group shrinks it below 8.4px (pegasus,
   full 9-node buy).
4. **Zebra's pre-existing `lifestealChance` overflow** (0.15 against a 0.10 cap, entirely
   from `-characters-3.js`) means three of her Phase 9 nodes are partly dead. Out of scope
   for this file; flagged for the Phase 9 owner.
5. **Unicorn's Shardsong is a one-way door within a run's meta-state.** Once `j2` is
   bought it applies to every unicorn run — there is no per-run opt-out in the engine.
   This matches the existing precedent (earth's `shockwaveAttack` from `-2.js`, alicorn's
   `innateFireRing`), and the node's `desc` states plainly that her loose bolts are gone.
