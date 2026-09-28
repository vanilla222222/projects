# Audit — Phase 10 Part B skill tree, Group 2

Scope: 250 new skill-tree nodes, 50 each for **hypogriff, seapony, ponybot, griffin,
kirin**.

## Files changed

| File | Change |
|---|---|
| `js/achievements/skilltree-characters-4b.js` | Placeholder skeleton replaced with the full 250-node content set (`SKILL_TREE_CHARACTER_CONFIG_4B`, `SKILL_TREE_PARENT_4B`, `SKILL_TREE_ORDER_4B`, `buildCharacterSkillNodes4B`). |
| `js/CODE_REFERENCE.md` | Appended "Skill tree — Phase 10 Part B, Group 2" section, matching the Group 5 section's style/position. |
| `feature-research/phase10-metaprogression/audit-skilltree-group2.md` | This file. |

Nothing else was touched. `index.html`, `skilltree.js`, `entities.js`, `combat-*.js` and
the other `skilltree-characters-4*.js` files are unmodified.

## Topology

One shared key→parent map for all five characters. Four branches (`i`,`j`,`k`,`l`) hung
straight off `char_hub_<classId>`; no existing a–h node re-parented or edited.

```
char_hub_<classId>
  +- i1 -> i2 -> i3 -+- i4 (CURSED gate) -+- i5a -> i6a -> i7a
  |                  |                    +- i5b -> i6b -> i7b
  |                  +- i8 -> i9 -> i10
  +- j1 (13)   +- k1 (12)   +- l1 (12)          13+13+12+12 = 50
```

20 cursed gates total (one per branch per character). Both deep chains in every branch
are structurally unreachable without buying that branch's curse first (`canBuySkillNode`
requires the single `parent`). Each branch keeps a 2–3 node ungated spur off `X3` so a
player always has something buyable without eating the curse.

Costs: 1 for ordinary nodes, 2 for mechanic-granting/knob capstones, 3 for the three
biggest (griffin *Raking Feather Line*, kirin *Nirik Ignition*, kirin *Ember-Cooled Hide*).

## Per-character summary

### hypogriff (melee flier, redMax 4)
Branches: **i** Talonfall (dive/melee → `shockwaveAttack` + `rockCoinChance`), **j**
Thermal Rider (flight/reach → `damageTakenMult` −0.10), **k** Skysheared Hide (dodge /
on-kill heal / lifesteal → `damageTakenMult` −0.08), **l** Hunter's Fixation (crit/melee →
*Glass Stoop*: +8% melee damage for +12% damage taken).
Tradeoffs: `shockwaveAttack` costs +4% `meleeCooldown`; `rockCoinChance` costs −4% magnet;
each armour node costs speed or melee damage; the four curses cost −0.05/−0.10 speed and
−0.10/−0.08 melee damage.

### seapony (slow ranged, redMax 6)
Branches: **i** Rolling Tide (heavy bolt → `unlimitedRange`), **j** Undertow Legs
(speed → `canFly`), **k** Deep Pressure (`damageTakenMult` −0.10, procs, lifesteal),
**l** Tidal Cadence (rate-vs-weight → `laser`).
Tradeoffs: `unlimitedRange` −5% bolt speed; `canFly` −6% ranged damage; `laser` +10%
`fireCooldown`; *Riptide Cadence* trades 4% ranged damage for 3% cooldown inside one node;
curses are +5% `fireCooldown`, −5% ranged damage ×2, −4% speed.

### ponybot (laser, no red containers, 1.25× damage taken)
Branches: **i** Overcharged Emitter (laser power + `startingPickup 'blue'` ×2), **j**
Servo Chassis (speed/dodge + `startingPickup 'blue'` ×1), **k** Drone Foundry
(`canBuildTurrets`, `turretDamageMult` +0.15, `maxTurrets` +2), **l** Firmware Redline
(cycle rate vs shot weight).
Deliberate exclusions: no `onKillHealChance`/`lifestealChance` (redMax 0 makes red-heart
healing dead) and no `damageTakenMult` (see Deviations).
Tradeoffs: +2 blue costs +6% `fireCooldown`; +1 blue costs −3% speed; turret grant costs
−6% ranged damage, the turret knobs −3% speed / −5% ranged damage; *Siege Capacitor* is
+10% ranged damage for +8% `fireCooldown`.

### griffin (rapid ranged flier)
Branches: **i** Featherstorm (rate → `laser`), **j** Aerial Hunter (speed →
`damageTakenMult` −0.12), **k** Talon Hunt (crit + lifesteal → *Bone-Cracker Quills*),
**l** Gale Feathers (cadence → `unlimitedRange`).
Tradeoffs: `laser` +8% `fireCooldown` / −4% ranged damage; *Planted Pinions* −5%
`fireCooldown` for −5% speed; *Bone-Cracker Quills* +10% ranged damage for +10%
`fireCooldown` (deliberately un-griffins the griffin); `unlimitedRange` −6% bolt speed;
*Frantic Molt* −3% cooldown for −5% ranged damage.

### kirin (0.5 hearts, hottest wrath)
Branches: **i** Nirik Kindling (damage → `charged` + `chargeTime` fire breath), **j**
Ashen Hooves (dodge/evade → `damageTakenMult` −0.20), **k** Streamlet Silence (stun /
charm / freeze / venom → `unlimitedRange`), **l** Forge Cadence (rate → `laser`).
Tradeoffs: charged fire breath costs the charge itself plus the jet's short reach;
*Flashpoint Temper* buys 0.15s of charge back for −5% ranged damage; `laser` −10% ranged
damage; `unlimitedRange` −6% bolt speed; *Ember-Cooled Hide* −3% speed; curses are +5%/+6%
`fireCooldown`, −5% ranged damage, −5% crit.
No healing nodes (redMax 0.5).

## Chance-stat and stat-cap totals

`4B sum` = this file only. `combined` = every skilltree file (a–h + 4a–4e) for that
(classId, stat), i.e. what `getSkillTreeStatBonus` clamps. Cap 0.25, except
`lifestealChance` 0.10.

| classId | stat | 4B sum | combined | cap | status |
|---|---|---|---|---|---|
| griffin | boltSpeed | +0.10 | +0.15 | 0.25 | ok |
| griffin | charmChance | +0.06 | +0.21 | 0.25 | ok |
| griffin | critChance | +0.21 | +0.21 | 0.25 | ok |
| griffin | dodgeChance | +0.08 | +0.08 | 0.25 | ok |
| griffin | fearChance | +0.03 | +0.18 | 0.25 | ok |
| griffin | fireCooldown | +0.03 | −0.15 | 0.25 | ok |
| griffin | freezeChance | +0.03 | +0.18 | 0.25 | ok |
| griffin | lifestealChance | +0.08 | +0.08 | 0.10 | ok |
| griffin | luck | +0.12 | +0.12 | 0.25 | ok |
| griffin | magnetRadius | +0.12 | +0.12 | 0.25 | ok |
| griffin | onKillHealChance | +0.00 | +0.24 | 0.25 | ok (untouched on purpose) |
| griffin | rangeTiles | +0.08 | +0.08 | 0.25 | ok |
| griffin | rangedDamage | +0.15 | +0.15 | 0.25 | ok |
| griffin | speed | +0.02 | +0.07 | 0.25 | ok |
| griffin | stunChance | +0.03 | +0.03 | 0.25 | ok |
| griffin | venomChance | +0.06 | +0.06 | 0.25 | ok |
| griffin | vulnerableChance | +0.06 | +0.21 | 0.25 | ok |
| hypogriff | charmChance | +0.03 | +0.03 | 0.25 | ok |
| hypogriff | critChance | +0.10 | +0.25 | 0.25 | ok (exactly at cap) |
| hypogriff | dodgeChance | +0.13 | +0.13 | 0.25 | ok |
| hypogriff | fearChance | +0.09 | +0.09 | 0.25 | ok |
| hypogriff | fireCooldown | +0.00 | +0.15 | 0.25 | ok |
| hypogriff | lifestealChance | +0.07 | +0.07 | 0.10 | ok |
| hypogriff | luck | +0.07 | +0.22 | 0.25 | ok |
| hypogriff | magnetRadius | +0.05 | +0.05 | 0.25 | ok |
| hypogriff | meleeCooldown | +0.01 | −0.17 | 0.25 | ok |
| hypogriff | meleeDamage | +0.19 | +0.24 | 0.25 | ok |
| hypogriff | onKillHealChance | +0.11 | +0.11 | 0.25 | ok |
| hypogriff | rangeTiles | +0.12 | +0.12 | 0.25 | ok |
| hypogriff | rangedDamage | +0.00 | +0.15 | 0.25 | ok |
| hypogriff | speed | +0.15 | +0.20 | 0.25 | ok |
| hypogriff | stunChance | +0.00 | +0.24 | 0.25 | ok (untouched on purpose) |
| hypogriff | venomChance | +0.03 | +0.03 | 0.25 | ok |
| hypogriff | vulnerableChance | +0.09 | +0.09 | 0.25 | ok |
| kirin | boltSpeed | +0.09 | +0.09 | 0.25 | ok |
| kirin | charmChance | +0.09 | +0.09 | 0.25 | ok |
| kirin | critChance | +0.15 | +0.20 | 0.25 | ok |
| kirin | dodgeChance | +0.08 | +0.24 | 0.25 | ok |
| kirin | fireCooldown | +0.01 | −0.17 | 0.25 | ok |
| kirin | freezeChance | +0.13 | +0.13 | 0.25 | ok |
| kirin | lifestealChance | **+0.00** | +0.15 | 0.10 | **pre-existing over-cap, not from this file** |
| kirin | luck | +0.20 | +0.20 | 0.25 | ok |
| kirin | magnetRadius | +0.15 | +0.15 | 0.25 | ok |
| kirin | onKillHealChance | +0.00 | +0.15 | 0.25 | ok (untouched on purpose) |
| kirin | rangeTiles | +0.10 | +0.10 | 0.25 | ok |
| kirin | rangedDamage | +0.13 | +0.18 | 0.25 | ok |
| kirin | speed | +0.03 | +0.19 | 0.25 | ok |
| kirin | stunChance | +0.13 | +0.13 | 0.25 | ok |
| kirin | venomChance | +0.14 | +0.14 | 0.25 | ok |
| kirin | vulnerableChance | +0.00 | +0.24 | 0.25 | ok (untouched on purpose) |
| ponybot | boltSpeed | +0.00 | +0.15 | 0.25 | ok |
| ponybot | charmChance | +0.03 | +0.03 | 0.25 | ok |
| ponybot | critChance | +0.20 | +0.20 | 0.25 | ok |
| ponybot | dodgeChance | +0.15 | +0.15 | 0.25 | ok |
| ponybot | fearChance | +0.03 | +0.03 | 0.25 | ok |
| ponybot | fireCooldown | +0.14 | −0.04 | 0.25 | ok |
| ponybot | freezeChance | +0.06 | +0.06 | 0.25 | ok |
| ponybot | luck | +0.11 | +0.11 | 0.25 | ok |
| ponybot | magnetRadius | +0.09 | +0.24 | 0.25 | ok |
| ponybot | rangeTiles | +0.08 | +0.13 | 0.25 | ok |
| ponybot | rangedDamage | +0.22 | +0.24 | 0.25 | ok |
| ponybot | speed | +0.04 | +0.04 | 0.25 | ok |
| ponybot | stunChance | +0.06 | +0.22 | 0.25 | ok |
| ponybot | venomChance | +0.06 | +0.21 | 0.25 | ok |
| ponybot | vulnerableChance | +0.03 | +0.03 | 0.25 | ok |
| seapony | boltSpeed | +0.01 | +0.17 | 0.25 | ok |
| seapony | charmChance | +0.03 | +0.03 | 0.25 | ok |
| seapony | critChance | +0.17 | +0.22 | 0.25 | ok |
| seapony | dodgeChance | +0.06 | +0.06 | 0.25 | ok |
| seapony | fearChance | +0.03 | +0.03 | 0.25 | ok |
| seapony | fireCooldown | +0.05 | −0.13 | 0.25 | ok |
| seapony | freezeChance | +0.00 | +0.24 | 0.25 | ok (untouched on purpose) |
| seapony | lifestealChance | +0.08 | +0.08 | 0.10 | ok |
| seapony | luck | +0.12 | +0.12 | 0.25 | ok |
| seapony | magnetRadius | +0.07 | +0.23 | 0.25 | ok |
| seapony | meleeCooldown | +0.00 | +0.15 | 0.25 | ok |
| seapony | onKillHealChance | +0.08 | +0.08 | 0.25 | ok |
| seapony | rangeTiles | +0.06 | +0.21 | 0.25 | ok |
| seapony | rangedDamage | +0.13 | +0.18 | 0.25 | ok |
| seapony | speed | +0.17 | +0.17 | 0.25 | ok |
| seapony | stunChance | +0.06 | +0.06 | 0.25 | ok |
| seapony | venomChance | +0.06 | +0.06 | 0.25 | ok |
| seapony | vulnerableChance | +0.09 | +0.09 | 0.25 | ok |

### uniqueField groups (sum vs the tightest `[min,max]` intersection across all files)

| classId\|field | sum | window | status |
|---|---|---|---|
| hypogriff\|rockCoinChance | +0.06 | [0, 0.25] | ok |
| hypogriff\|damageTakenMult | −0.06 | [−0.4, 0.5] | ok |
| seapony\|damageTakenMult | −0.10 | [−0.4, 0.5] | ok |
| ponybot\|damageTakenMult | −0.14 | [−0.15, 0] | ok — **all from `-characters-2.js`; this file adds none** |
| ponybot\|turretDamageMult | +0.15 | [−0.5, 0.6] | ok |
| ponybot\|maxTurrets | +2 | [−2, 4] | ok |
| griffin\|damageTakenMult | −0.12 | [−0.5, 0.5] | ok |
| kirin\|chargeTime | +0.35 | [0, 1.5] | ok (0.5 grant − 0.15 refund) |
| kirin\|damageTakenMult | −0.20 | [−0.5, 0.5] | ok |

## Verification performed

- `node --check js/achievements/skilltree-characters-4b.js` — clean.
- Harness loading `skilltree.js` + all character files under stubbed `CLASSES`/`Util`:
  - node counts: hypogriff 50, seapony 50, ponybot 50, griffin 50, kirin 50 = **250**;
  - **0** duplicate ids across the whole 2304-node tree (a–h and 4a/4c/4d/4e included);
  - **0** dangling `parent` references (every parent resolves to a real node id);
  - **0** effect errors: every node has a name, a desc and ≥1 effect; every effect's
    `classId` equals its owning character; every `stat` is in `SKILL_TREE_STAT_FIELDS`;
    every `uniqueField` carries `min`/`max`;
  - every cursed node carries only debuff effects;
  - per-(classId, stat) and per-(classId, field) totals as tabled above.
- Full file re-read for brace/paren balance (the builder also fails loudly on a missing
  config key, which would surface as an undefined name/desc in the checks above).

## Deviations from the brief

1. **ponybot `damageTakenMult` intentionally unused.** The brief pointed at ponybot's
   fragility as its signature knob, but `skilltree-characters-2.js` already sums that
   field to −0.14 against a `[-0.15, 0]` window, and
   `applySkillTreeUniqueFieldBonuses` intersects the min/max across contributing effects —
   so any node here would be clamped to ~nothing, and no positive (curse) amount could
   ever apply at all. Its fragility fiction is carried instead by `startingPickup 'blue'`
   (its only life resource), dodge, and stat-side curses.
2. **griffin does not borrow `crystalVolley`.** An earlier draft granted
   `crystalVolley`/`crystalShardCount`/`crystalVolleySpacing` + `charged` as the
   "fanned volley" capstone. Those shadow fields are seeded off `def.crystalVolley` in
   `entities.js` and there is no griffin-side volley mechanic; the capstone was retargeted
   to `laser` (*Raking Feather Line*), which `combat-1.js`'s `playerRangedAttack`
   dispatches generically for any ranged class.
3. **Node count per branch is 13/13/12/12**, not four equal branches — 50 does not divide
   by four.

## Open risks

1. **kirin `lifestealChance` is at +0.15 against a 0.10 cap** — entirely from the a–h
   nodes (`-characters-3.js`), not from this file, which adds 0. The engine clamps it to
   0.10, so ~0.05 of already-shipped node value is dead for that character. Out of this
   group's file scope; flagged for whoever owns `skilltree-characters-3.js`.
2. **griffin can own both `laser` (i6a) and `unlimitedRange` (l7a).** The laser ignores
   range entirely, so a player who buys both gets no benefit from the second. Same
   situation exists for kirin (`laser` in branch l, `unlimitedRange` in branch k). These
   are alternative branches, so it is a build choice rather than a bug, but the desc text
   does not warn about the overlap.
3. **Borrowed-mechanic art/SFX are the donor class's.** A seapony/kirin/griffin `laser`
   renders with Pony Bot's laser FX (`game.laserFX`, `Sound.play('laserShot')`), and
   kirin's `charged` capstone fires the Dragon's `playerFireBreathAttack`. Mechanically
   correct, cosmetically borrowed.
4. **`chargeTime` on kirin only matters once `charged` is granted.** *Flashpoint Temper*
   (i7a) sits directly below *Nirik Ignition* (i6a) so it can never be bought first, but
   if a later pass re-parents branch i, that ordering guarantee is lost.
5. Balance is unplaytested — amounts were budgeted against caps, not against measured DPS.
