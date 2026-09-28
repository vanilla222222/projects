# Phase 10 Part B — skill tree megaupdate, Group 4 audit

Group 4 of 5. Scope: **`js/achievements/skilltree-characters-4d.js` only**.
250 new character skill-tree nodes, 50 each for `crystalpony`, `mule`, `alicorn`,
`changeling`, `diamonddog`.

## Files changed

| File | Change |
|---|---|
| `js/achievements/skilltree-characters-4d.js` | Skeleton → 250 nodes. The only code file touched. |
| `js/CODE_REFERENCE.md` | Appended "Skill tree — Phase 10 Part B, Group 4" section after Group 5's, same style/position. |
| `feature-research/phase10-metaprogression/audit-skilltree-group4.md` | This document. |

Untouched, as required: `index.html` (the `<script>` tag for 4d was already wired),
`skilltree.js`, `entities.js`, `combat-2.js`, and every other `skilltree-characters-4*.js`
(4a/4b/4c/4e belong to concurrent implementers).

## Topology

Four fresh branches per character, each hung directly off `char_hub_<classId>`. No
existing a–h node is re-parented, edited or removed.

```
char_hub_<classId>
  +- x1 -> x2 -+- x3a -> x4a -> x5a -> x6a -> x7 [-> x9]
               +- x3b -> x4b -> x5b -> x6b -> x8

x = i (13 nodes), j (12), k (13), l (12)        13+12+13+12 = 50
```

Every `x3b` is a `cursed:true` gate (one negative `stat` effect, nothing else) and is the
sole parent of the entire b-side chain beneath it — the `-characters-3.js` convention.
20 cursed nodes total (4 per character). Cost is 1 point per node uniformly.

## Per-character summary

### crystalpony (branches i/j/k/l)

- **i — Facet Convergence (13).** The user's explicit ask. Eleven nodes reduce
  `crystalVolleySpacing` (seeded from `CRYSTAL_VOLLEY_SPACING_DEFAULT` = 34 in
  `combat-2.js`) by a total of **−24**, bounded `min:-24, max:12` → a **10px floor**,
  chosen well clear of 0 because `playerCrystalVolleyAttack` reads
  `player.crystalVolleySpacing || CRYSTAL_VOLLEY_SPACING_DEFAULT` and a 0 would snap back
  to 34. Tradeoffs carried in-branch: −3% ranged damage (`i1`), −3% speed (`i4a`), +5%
  damage taken (`i6b`), +8% damage taken (`i9`), and the cursed `i3b` (−4% ranged damage).
- **j — The Long Draw (12).** `chargeTime` in both directions; *Deep Draw*/*Overdrawn
  Facet* buy +14% ranged damage for +0.14s of charge (the Soy Milk of the branch), cursed
  `j3b` gates a snap-fire `fireCooldown` line.
- **k — Crystal Sentries (13).** Borrows `canBuildTurrets` (`uniqueFlag`) re-flavored as
  planted shards; `turretDamageMult` +0.50 (its max), `maxTurrets` +4 → clamped to +3.
  Paid for with −12% ranged damage across `k1`/`k3b`/`k9` and +12% damage taken.
- **l — Gemhide (12).** `damageTakenMult` −0.19, her 8-heart identity, bought with speed
  and bolt speed; freeze/dodge/on-kill-heal flavor.

### mule (branches i/j/k/l)

No unique flag exists for this class in `data/core.js`, so its identity is built rather
than amplified.

- **i — Prospector's Pick (13).** Borrows `shockwaveAttack` (`uniqueFlag`; dispatched
  generically in `combat-1.js`'s `playerMeleeAttack`) for +5% `meleeCooldown`, then a
  `rockCoinChance` line summing +0.20 against a 0.15 max.
- **j — Overloaded Packs (12).** `damageTakenMult` UP (+0.21 gross) traded for luck,
  magnet radius and reach; −0.15 speed across the branch.
- **k — Stubborn Bulwark (13).** Spends `damageTakenMult` back down to the −0.25 floor,
  costing reach, melee damage and the last of her speed. Stun/fear/dodge payoffs.
- **l — Beast of Burden (12).** The deliberately plainer stat spine (on-kill heal, melee
  damage, crit) — the "some pure stat nodes" part of the mandate.

`startingPickup` was deliberately NOT used for the pack-animal fantasy: that effect type
carries no `classId` and `applySkillTreeStartingPickups` grants it to **every** class, so
it can never be a mule-specific node.

### alicorn (branches i/j/k/l)

- **i — Corona (13).** Deepens the `innateFireRing` granted by `-characters-2.js`:
  `fireRingRadius` +16 on top of the existing +18 → clamped to its 30 ceiling, plus the
  `rangedDamage`/`fireCooldown` that `updateFireRingAttack` literally computes ring dps
  from. +14% damage taken across `i6a`/`i9`.
- **j — Conjured Wards (12).** Borrows `canBuildTurrets`; `turretDamageMult` +0.50 (max),
  `maxTurrets` +4 → clamped +3; −12% ranged damage paid across `j1`/`j3b`/`j7`.
- **k — Fragile Divinity (13).** Her 4-heart frame as an explicit dial: +0.20
  `damageTakenMult` early for offense, −0.28 much deeper in.
- **l — Starlit Horn (12).** The horn's plain stat spine (ranged damage, bolt speed, luck,
  crit).

### changeling (branches i/j/k/l)

- **i — Hive Mother (13).** Grants `summonsChangelings` (`uniqueFlag`), then must build it
  from nothing: her seeded `changelingMinionDmg`/`changelingMinionRadius` are **0**, so the
  flag alone does nothing. Branch pays for `changelingMinionDmg` +0.60/s (its max),
  `changelingMinionRadius` +22px, `maxChangelingMinions` +2 → 4, `changelingSummonCooldown`
  −4.5 → clamped −4 (8s → 4s, matching the Queen's). Cost: −13% ranged damage, +6% damage
  taken. At full stack ≈2.4 dps of minion damage against her own ≈3.5 dps, i.e. support,
  not replacement.
- **j — Unmired (12).** `fireZoneRootMult` +0.60 (its max) → 0.25 → **0.85**, lifting her
  single largest live drawback (quarter speed while holding her own pool down). She is the
  only class this field is reachable for: `combat-1.js` gates `miredInOwnFire` on
  `player.greenFireAttack`. Paid with −3% ranged damage, −4% speed (cursed `j3b`), +6%
  damage taken.
- **k — The Deeper Pool (13).** Spends the last `fireZoneRadius` (+6 → exactly 30) and
  `fireZoneRange` (+4 → exactly 20) headroom; on-kill-heal/venom payoffs; +8% damage taken
  on the `k9` capstone.
- **l — Carapace (12).** `damageTakenMult` −0.16 plus the infiltrator stat spine.

### diamonddog (branches i/j/k/l)

Deliberately receives **no** borrowed `uniqueFlag`. Every ranged-damage-driven mechanic in
the game (fire ring, green fire, turrets) computes its damage from `player.rangedDamage`,
which is **0** for a melee class — granting her one would be a dead node. Her 50 work the
knobs her own shockwave identity actually owns:

- **i — Pickaxe Claw (13).** `rockCoinChance` last +0.02 (lands exactly on its 0.15 max),
  claw reach via `rangeTiles`, melee damage bought with `meleeCooldown` and speed.
- **j — Gem Hoard (12).** Greed: magnet radius and luck to their exact 0.25 caps, paid in
  speed and +6% damage taken.
- **k — Kennel Hide (13).** `damageTakenMult` −0.22 (near its −0.25 floor), paid in speed,
  melee damage, swing time and reach; rubble-flavored stun/venom/lifesteal.
- **l — Deep Tunnels (12).** The plainer spine (melee cooldown, melee damage, crit).

## `uniqueFlag` nodes (4 total)

| Node | Flag | Cost carried on the same node |
|---|---|---|
| `char_crystalpony_k1` | `canBuildTurrets` | −5% ranged damage |
| `char_mule_i1` | `shockwaveAttack` | +5% melee cooldown |
| `char_alicorn_j1` | `canBuildTurrets` | −5% ranged damage |
| `char_changeling_i1` | `summonsChangelings` | −5% ranged damage |

## Verification

Harness: loads `skilltree.js` plus all eight `skilltree-characters*.js` files in a `vm`
sandbox over a stubbed `CLASSES`, then walks `SKILL_TREE_NODES` via `nodeEffects`.

```
4D nodes: {"crystalpony":50,"mule":50,"alicorn":50,"changeling":50,"diamonddog":50} total 250 | tree total 2304
dup ids: none | dangling parents: 0 | classId mismatches: 0
cursed nodes in 4D: 20 | malformed cursed: none
```

- `node --check js/achievements/skilltree-characters-4d.js` — clean.
- **250 nodes, exactly 50 per character.** No id collisions anywhere in the 2304-node
  tree (a–h, 4a–4e inclusive). Every `parent` resolves. Every effect's `classId` matches
  its owning character. All 20 `cursed:true` nodes carry exactly one negative `stat`
  effect and nothing else.
- `crystalVolleySpacing` nodes verified to spell the field name exactly and to bound at
  `min:-24, max:12` on every contributing effect (the tightest-bounds rule in
  `applySkillTreeUniqueFieldBonuses` therefore yields a clean 10px floor / 46px ceiling).

### Chance-stat and stat totals per (classId, stat)

Recomputed across **all** skilltree files. `a–h` = pre-existing contribution, `4D adds` =
this group's contribution.

| class | stat | chance? | a-h | 4D adds | total | cap | ok |
|---|---|---|---|---|---|---|---|
| crystalpony | boltSpeed |  | 0.03 | +0.12 | 0.15 | 0.25 | ok |
| crystalpony | critChance |  | 0 | +0.2 | 0.2 | 0.25 | ok |
| crystalpony | dodgeChance | yes | 0.16 | +0.06 | 0.22 | 0.25 | ok |
| crystalpony | fireCooldown |  | 0 | -0.2 | -0.2 | 0.25 | ok |
| crystalpony | freezeChance | yes | 0 | +0.12 | 0.12 | 0.25 | ok |
| crystalpony | lifestealChance | yes | 0.15 | +0 | 0.15 | 0.1 | OVER |
| crystalpony | luck |  | 0.05 | +0.12 | 0.17 | 0.25 | ok |
| crystalpony | magnetRadius |  | 0 | +0.18 | 0.18 | 0.25 | ok |
| crystalpony | onKillHealChance | yes | 0.15 | +0.08 | 0.23 | 0.25 | ok |
| crystalpony | rangeTiles |  | 0 | +0.1 | 0.1 | 0.25 | ok |
| crystalpony | rangedDamage |  | -0.06 | -0.06 | -0.12 | 0.25 | ok |
| crystalpony | speed |  | 0.16 | -0.09 | 0.07 | 0.25 | ok |
| mule | boltSpeed |  | 0.16 | +0 | 0.16 | 0.25 | ok |
| mule | critChance |  | 0 | +0.17 | 0.17 | 0.25 | ok |
| mule | dodgeChance | yes | 0 | +0.1 | 0.1 | 0.25 | ok |
| mule | fearChance | yes | 0 | +0.1 | 0.1 | 0.25 | ok |
| mule | fireCooldown |  | 0.15 | +0 | 0.15 | 0.25 | ok |
| mule | lifestealChance | yes | 0.24 | +0 | 0.24 | 0.1 | OVER |
| mule | luck |  | 0.15 | +0.09 | 0.24 | 0.25 | ok |
| mule | magnetRadius |  | 0.05 | +0.2 | 0.25 | 0.25 | ok |
| mule | meleeCooldown |  | -0.18 | +0.05 | -0.13 | 0.25 | ok |
| mule | meleeDamage |  | 0.05 | +0.2 | 0.25 | 0.25 | ok |
| mule | onKillHealChance | yes | 0 | +0.15 | 0.15 | 0.25 | ok |
| mule | rangeTiles |  | 0.15 | +0.04 | 0.19 | 0.25 | ok |
| mule | speed |  | 0 | -0.18 | -0.18 | 0.25 | ok |
| mule | stunChance | yes | 0 | +0.15 | 0.15 | 0.25 | ok |
| mule | vulnerableChance | yes | 0 | +0.15 | 0.15 | 0.25 | ok |
| alicorn | boltSpeed |  | 0.15 | +0.1 | 0.25 | 0.25 | ok |
| alicorn | charmChance | yes | 0 | +0.1 | 0.1 | 0.25 | ok |
| alicorn | critChance |  | 0 | +0.21 | 0.21 | 0.25 | ok |
| alicorn | dodgeChance | yes | 0 | +0.12 | 0.12 | 0.25 | ok |
| alicorn | fireCooldown |  | -0.18 | -0.07 | -0.25 | 0.25 | ok |
| alicorn | lifestealChance | yes | 0 | +0.08 | 0.08 | 0.1 | ok |
| alicorn | luck |  | 0 | +0.15 | 0.15 | 0.25 | ok |
| alicorn | magnetRadius |  | 0.15 | +0.08 | 0.23 | 0.25 | ok |
| alicorn | meleeCooldown |  | 0.15 | +0 | 0.15 | 0.25 | ok |
| alicorn | rangeTiles |  | 0.15 | +0.08 | 0.23 | 0.25 | ok |
| alicorn | rangedDamage |  | 0.05 | +0.1 | 0.15 | 0.25 | ok |
| alicorn | speed |  | 0.05 | -0.05 | 0 | 0.25 | ok |
| changeling | boltSpeed |  | 0.16 | +0 | 0.16 | 0.25 | ok |
| changeling | critChance |  | 0 | +0.05 | 0.05 | 0.25 | ok |
| changeling | dodgeChance | yes | 0 | +0.1 | 0.1 | 0.25 | ok |
| changeling | fearChance | yes | 0 | +0.1 | 0.1 | 0.25 | ok |
| changeling | fireCooldown |  | 0.15 | -0.1 | 0.05 | 0.25 | ok |
| changeling | lifestealChance | yes | 0 | +0.08 | 0.08 | 0.1 | ok |
| changeling | luck |  | 0 | +0.07 | 0.07 | 0.25 | ok |
| changeling | magnetRadius |  | 0 | +0.14 | 0.14 | 0.25 | ok |
| changeling | meleeCooldown |  | 0.15 | +0 | 0.15 | 0.25 | ok |
| changeling | onKillHealChance | yes | 0 | +0.2 | 0.2 | 0.25 | ok |
| changeling | rangeTiles |  | 0.16 | +0 | 0.16 | 0.25 | ok |
| changeling | rangedDamage |  | 0.02 | +0.06 | 0.08 | 0.25 | ok |
| changeling | speed |  | 0.05 | +0.02 | 0.07 | 0.25 | ok |
| changeling | venomChance | yes | 0 | +0.11 | 0.11 | 0.25 | ok |
| diamonddog | charmChance | yes | 0.15 | +0 | 0.15 | 0.25 | ok |
| diamonddog | critChance |  | 0 | +0.22 | 0.22 | 0.25 | ok |
| diamonddog | fearChance | yes | 0.15 | +0 | 0.15 | 0.25 | ok |
| diamonddog | freezeChance | yes | 0.15 | +0 | 0.15 | 0.25 | ok |
| diamonddog | lifestealChance | yes | 0 | +0.06 | 0.06 | 0.1 | ok |
| diamonddog | luck |  | 0 | +0.25 | 0.25 | 0.25 | ok |
| diamonddog | magnetRadius |  | 0.05 | +0.2 | 0.25 | 0.25 | ok |
| diamonddog | meleeCooldown |  | -0.18 | -0.05 | -0.23 | 0.25 | ok |
| diamonddog | meleeDamage |  | 0.05 | +0.2 | 0.25 | 0.25 | ok |
| diamonddog | onKillHealChance | yes | 0 | +0.12 | 0.12 | 0.25 | ok |
| diamonddog | rangeTiles |  | 0 | +0.16 | 0.16 | 0.25 | ok |
| diamonddog | speed |  | 0 | -0.13 | -0.13 | 0.25 | ok |
| diamonddog | stunChance | yes | 0 | +0.15 | 0.15 | 0.25 | ok |
| diamonddog | venomChance | yes | 0 | +0.1 | 0.1 | 0.25 | ok |
| diamonddog | vulnerableChance | yes | 0.16 | +0.06 | 0.22 | 0.25 | ok |


Two rows report `OVER`. **Both are pre-existing a–h saturations that Group 4 adds exactly
`+0` to**, and both are engine-clamped to 0.10 at read time by
`getSkillTreeStatBonus`/`SKILL_TREE_STAT_CAP_OVERRIDES`:

- `crystalpony.lifestealChance` = 0.15, all of it from `-characters-3.js`.
- `mule.lifestealChance` = 0.24, all of it from `-characters-2.js`.

Both were treated as fully spent and received no new nodes here. **Every other
(classId, stat) pair in the five characters is within its cap**, with several landing
exactly on 0.25 by design (mule magnetRadius/meleeDamage, alicorn boltSpeed/fireCooldown,
diamonddog luck/magnetRadius/meleeDamage).

### `uniqueField` totals

| class | uniqueField | a-h | 4D adds | total |
|---|---|---|---|---|
| crystalpony | chargeTime | -0.24 | +0.12 | -0.12 |
| crystalpony | crystalShardCount | 3 | +0 | 3 |
| crystalpony | crystalVolleySpacing | 0 | -24 | -24 |
| crystalpony | damageTakenMult | 0 | +0.06 | 0.06 |
| crystalpony | maxTurrets | 0 | +4 | 4 |
| crystalpony | turretDamageMult | 0 | +0.5 | 0.5 |
| mule | damageTakenMult | 0 | -0.25 | -0.25 |
| mule | rockCoinChance | 0 | +0.2 | 0.2 |
| alicorn | damageTakenMult | 0 | +0.11 | 0.11 |
| alicorn | fireRingRadius | 18 | +16 | 34 |
| alicorn | maxTurrets | 0 | +4 | 4 |
| alicorn | turretDamageMult | 0 | +0.5 | 0.5 |
| changeling | changelingMinionDmg | 0 | +0.6 | 0.6 |
| changeling | changelingMinionRadius | 0 | +22 | 22 |
| changeling | changelingSummonCooldown | 0 | -4.5 | -4.5 |
| changeling | damageTakenMult | 0 | +0.04 | 0.04 |
| changeling | fireZoneRadius | 24 | +6 | 30 |
| changeling | fireZoneRange | 16 | +4 | 20 |
| changeling | fireZoneRootMult | 0 | +0.6 | 0.6 |
| changeling | maxChangelingMinions | 0 | +2 | 2 |
| diamonddog | damageTakenMult | 0 | -0.22 | -0.22 |
| diamonddog | rockCoinChance | 0.13 | +0.02 | 0.15 |

Sums that exceed their declared `[min,max]` are intentional over-authoring and are clamped
by `applySkillTreeUniqueFieldBonuses`: `mule.rockCoinChance` +0.20 → 0.15,
`crystalpony.maxTurrets`/`alicorn.maxTurrets` +4 → 3, `alicorn.fireRingRadius` 34 → 30,
`changeling.changelingSummonCooldown` −4.5 → −4. Everything else lands on or inside its
bound.

## Deviations from the brief

1. **`crystalShardCount` not extended for crystalpony.** `-characters-2.js`'s c-branch
   already sums shard count to its own `max:3`, and `applySkillTreeUniqueFieldBonuses`
   takes the *tightest* bounds across contributing effects — so any further node there
   (positive or negative) would be clamped to a no-op whenever the old branch is owned.
   Volley identity was extended through `crystalVolleySpacing` (the requested feature) and
   `chargeTime` instead.
2. **No `startingPickup` node for mule**, despite the pack-animal fantasy being the
   obvious fit. That effect type has no `classId` field and
   `applySkillTreeStartingPickups` applies it to every class — a "mule-specific" starting
   supplies node would silently buff all 25 characters.
3. **No borrowed `uniqueFlag` for diamonddog.** Fire ring, green fire and turrets all
   derive damage from `player.rangedDamage`, which is 0 for a melee class; every candidate
   flag would have been a dead node. Her uniqueness is carried by `rockCoinChance`,
   `rangeTiles` claw reach and `damageTakenMult` instead.
4. **`summonsChangelings` was given only to changeling**, not to diamonddog (whose "pack
   of hounds" fantasy fits mechanically — `changelingMinionDmg` is a flat dps field, not
   ranged-damage-derived). `render.js`'s `drawChangelingMinions` always draws minions as
   green changelings via `Util.drawChangelingMinion`, so a diamond dog summoning them
   would read as a rendering bug. Deferred rather than shipped.

## Open risks

- **Fully compressed volley power level.** At the 10px floor crystalpony's three (or six,
  with the old c-branch) shards converge on essentially one point, which is a large
  effective damage multiplier at range. It is gated behind 11 nodes plus −3% ranged
  damage, −3% speed and +13% damage taken, but this is the single most likely thing in
  Group 4 to need a numbers pass after play. The floor is one constant (`min:-24`,
  repeated on 11 effects in the `sp()` helper) if it needs tightening.
- **Borrowed turrets on a charged class.** Crystal Pony holds her attack key to charge;
  Engineer's turret build is on a separate `input.build` key (`main.js`), so the two
  should not interact — but that combination has never existed before and is untested in
  play.
- **Changeling summons + green fire held simultaneously.** `updateChangelingSummons` and
  `updateGreenFireAttack` both run off the same `player.fireZone`-adjacent plumbing but
  minions carry their own state; the Queen already runs both, so this is believed safe.
- **`fireZoneRootMult` at 0.85** removes most of the changeling's defining drawback. It
  costs six nodes, a cursed −4% speed and +6% damage taken, but it is a genuine
  identity-softening change rather than a stat bump — worth a look during play.
- No smoke test was run beyond `node --check` and the static harness above, per the
  standing "no heavy smoke testing" instruction: the user verifies by playing.
