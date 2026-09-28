# Audit — Skill Tree Megaupdate, Group 5 (Phase 10 Part B)

Characters: **gargoyle, changedling, changelingqueen, filly, engineerpony**.
250 new nodes, 50 per character. Branch letters **i / j / k / l**.

## Files changed

| File | Change |
| --- | --- |
| `js/achievements/skilltree-characters-4e.js` | Placeholder skeleton replaced with the full 250-node content set (config table + shared topology + build loop + push into `SKILL_TREE_NODES`). Only file in this group's scope that was touched. |
| `js/CODE_REFERENCE.md` | Appended one subsection, "Skill tree — Phase 10 Part B, Group 5", matching the existing style. |
| `feature-research/phase10-metaprogression/audit-skilltree-group5.md` | This document. |

**Not touched** (other groups / engine): `index.html`, `js/achievements/skilltree.js`,
`js/entities/entities.js`, `js/systems/combat-*.js`, and every other
`skilltree-characters-4*.js`.

## Topology

Identical for all five characters, four branches hung straight off `char_hub_<classId>`:

```
char_hub_<classId>
  +- i1 -+- i2a -> i3a -> i4a -> i5a -> i6 -> i8      (13)
  |      +- i2b -> i3b -> i4b -> i5b -> i7 -> i9
  +- j1  (same shape)                                  (13)
  +- k1  (same shape, no k9)                           (12)
  +- l1  (same shape, no l9)                           (12)
```

No node from branches a–h is re-parented, mutated, or re-costed. Every node costs 1
point and uses the plural `effects:[...]` shape.

## Per-character summary

### gargoyle — the stone sentinel
Unique mechanic: `innateVulnerableChance` 0.10 (marks prey for the whole room).
`skilltree-characters-2.js` had already spent `vulnerableChance` to +0.19, so this pass
spends the last 0.06 and expresses "marked prey" through fields nothing had touched.

- **i (Stone Hide)** — a two-way `damageTakenMult` knob. *Granite Hide → Cathedral
  Ballast* buys −25% damage taken with speed and swing time; the cursed **Sun-Cracked
  Shell** (+12% damage taken, debuff-only) gates a lifesteal / on-kill-heal spine.
- **j (The Mark)** — cursed **Mark Without Malice** (−5% ranged damage) opens the last of
  the vulnerable headroom plus a fear spine; cursed **Brittle Concentration** gates venom.
- **k (Vantage / Petrification)** — `rangeTiles` + `boltSpeed`; cursed **Cracked
  Jawstone** (−5% crit) gates the stun ("Petrifying Gaze") spine.
- **l (Nightfall)** — magnet + crit; cursed **Daylight Dormancy** / **Hairline Fracture**
  (luck) gate the freeze spine.

Cursed nodes: 5. Tradeoff-bundled nodes: 5.

### changedling — the unfinished change
Unique mechanic: `innateFireRing` / `fireRingRadius` — a permanent mobile ring of green
fire, at 4 hearts of shell and half the base Changeling's dps.

- **i (Smouldering)** — cursed `fireCooldown` opener (ring pulses slower); ring-radius
  widening and ranged damage on the a-spine, with *Chitin Furnace* paying +8% damage
  taken. Cursed **Thin-Shelled** (+12% damage taken) gates lifesteal / on-kill-heal.
- **j (Green Flame)** — cursed **Guttering Wick** (−5% speed) opens a venom spine;
  cursed **Sputtering Ring** *narrows the ring itself* to gate the fear spine.
- **k (Feral Wings)** — speed / dodge / magnet; cursed **Brittle Wing-Case** (−5% melee)
  gates charm.
- **l (Half-Formed Brood)** — the capstone. Cursed **Split Attention** (−6% ranged) opens
  **Call of the Unfinished**, which grants `summonsChangelings` (`uniqueFlag`) *and* seeds
  `changelingMinionDmg` (she has none natively), for −4% speed. Deeper: summon-cooldown
  cuts, two extra brood slots (the second costs +10% damage taken), minion burn radius,
  and *Mother in Miniature* (−4% ranged). Cursed **Shared Flame** narrows her own ring
  again — the brood is literally taken out of her fire.

Cursed nodes: 5. Tradeoff-bundled nodes: 6.

### changelingqueen — the hive-mother
`-characters-2.js` had already maxed her minion **count** (`maxChangelingMinions` +3/3)
and **summon rate** (`changelingSummonCooldown` −1.9/−2). This pass takes the knobs it
left alone.

- **i (Brood Reach)** — `changelingMinionRadius` (untouched until now) ×4, then the last
  0.30 of `changelingMinionDmg`. Cursed **Thin Crown** (+12% damage taken) gates a
  bodyguard / carapace spine that buys the armor back with speed.
- **j (Her Own Flame)** — the first nodes anywhere to upgrade her personal
  `greenFireAttack` pool: `fireZoneRadius` +20, `fireZoneRange` +24. Cursed **Mired in Her
  Own Fire** *deepens* the self-root (`fireZoneRootMult` −0.10) before *Hovering Monarch*
  / *Untethered Flame* / *Empress in the Blaze* lift it to +0.40 net.
- **k (Love-Fed Monarch)** — charm to its ceiling, lifesteal to its 0.10 ceiling (one
  node paying −4% melee); cursed **Isolated on the Throne** (−5% luck) gates crit.
- **l (Hive Terror)** — fear / vulnerable / magnet; cursed **Weight of the Crown** and
  **Cracked Regalia** gate the spines.

Cursed nodes: 5. Tradeoff-bundled nodes: 5.

### filly — hooves too small for a proper kick
Unique mechanic: `innateCharmChance` 0.25. Charm had only 0.06 of headroom left, so the
branch structure tells a "growing up" story instead.

- **i (Too Small to Kick)** — **Borrowed Pickaxe** grants `shockwaveAttack`
  (`uniqueFlag`; dispatched generically from `combat-1.js`'s `playerMeleeAttack`, so a
  melee class picks it up cleanly) at +5% `meleeCooldown`, feeding a `rockCoinChance`
  sub-line and magnet nodes. Cursed **Knees Too Weak** (+12% damage taken) gates the
  `meleeDamage` climb, which ends on *All Grown Up* (−3% speed).
- **j (Nopony Can Say No)** — the last of charm, then vulnerable and fear; cursed
  **Puppy-Eyes Fatigue** opens it and cursed **Sugar Crash** (+5% `meleeCooldown`) gates
  the speed / dodge spine.
- **k (Schoolyard Tricks)** — stun to its ceiling + crit; cursed **Scraped Knees** gates
  venom.
- **l (Snowball Fight)** — cursed **Winter Coat Too Thin** opens freeze + on-kill-heal;
  cursed **Overexcited** gates magnet / crit, and *Best Friends Forever* refunds 10%
  damage taken.

Cursed nodes: 5. Tradeoff-bundled nodes: 4.

### engineerpony — the turret tinkerer
Unique mechanic: `canBuildTurrets`. `-characters-2.js` had pushed `turretDamageMult` to
+0.34/0.4 and `maxTurrets` to its full +2, so only 0.06 of turret headroom remained.

- **i (Turret Doctrine)** — the last 0.06 of `turretDamageMult`, then emplacement range.
  Cursed **All Power to the Guns** (+12% damage taken) gates cover/armor nodes that buy
  it back, ending on *Workshop Discipline* (−4% speed).
- **j (Railgun)** — cursed **Capacitor Drain** (+6% `fireCooldown`) opens a bolt-speed
  spine ending in **Beyond the Wall**: `unlimitedRange` via `uniqueFlag`, for −6% ranged
  damage. Cursed **Overheated Chamber** gates a vulnerable spine.
- **k (Chemistry Set)** — venom to its ceiling, lifesteal to 0.10 (one node −4% melee);
  cursed **Fumes in the Workshop** gates on-kill-heal.
- **l (Scrap Economy)** — magnet to its ceiling and luck; cursed **Stripped Gears** pays
  for her mobility *out of turret damage* (`turretDamageMult` −0.05), and *Field
  Efficiency* takes another −0.03.

Cursed nodes: 5. Tradeoff-bundled nodes: 5.

Totals: **25 cursed gate nodes** and **25 tradeoff-bundled nodes** across the 250 — one
in five nodes carries a real cost, on top of every branch opener being a mandatory gate
on 4 of 4 branches for four characters (gargoyle/changedling/changelingqueen/filly) and
3 of 4 for engineerpony (branch k's opener is uncursed; its curse sits at `k2b`).

## Chance-stat / stat total table

Sums are across **all** skilltree files (a–h **plus** this one), per `(classId, stat)`,
worst case = every node owned. Engine ceiling is `SKILL_TREE_STAT_CAP` 0.25, except
`lifestealChance` at 0.10 (`SKILL_TREE_STAT_CAP_OVERRIDES`).

| stat | gargoyle | changedling | changelingqueen | filly | engineerpony |
| --- | --- | --- | --- | --- | --- |
| speed | 0.010 | 0.030 | 0.010 | 0.040 | 0.070 |
| meleeDamage | 0.150 | 0.100 | 0.080 | 0.240 | −0.040 |
| rangedDamage | −0.040 | 0.130 | −0.060 | — | −0.070 |
| critChance | 0.120 | 0.160 | 0.220 | 0.240 | 0.120 |
| luck | 0.060 | 0.160 | −0.090 | −0.070 | 0.170 |
| fireCooldown | −0.150 | −0.130 | — | — | −0.010 |
| meleeCooldown | 0.190 | — | — | −0.080 | — |
| rangeTiles | 0.240 | — | — | — | 0.220 |
| boltSpeed | 0.110 | — | — | — | 0.220 |
| magnetRadius | 0.210 | 0.160 | 0.250 | 0.240 | 0.250 |
| venomChance | 0.210 | 0.250 | — | 0.220 | 0.250 |
| stunChance | 0.210 | — | — | 0.250 | 0.150 |
| charmChance | — | 0.210 | 0.250 | 0.250 | 0.150 |
| freezeChance | 0.210 | — | — | 0.250 | 0.160 |
| fearChance | 0.240 | 0.250 | 0.220 | 0.250 | 0.160 |
| vulnerableChance | 0.250 | 0.060 | 0.120 | 0.250 | 0.220 |
| lifestealChance (cap 0.10) | 0.070 | 0.070 | 0.100 | **0.150 †** | 0.100 |
| onKillHealChance | 0.160 | 0.160 | 0.150 | 0.220 | 0.220 |
| dodgeChance | 0.110 | 0.250 | 0.250 | 0.170 | 0.170 |

† **Pre-existing, not introduced here.** `filly`'s `lifestealChance` was already at 0.150
from `skilltree-characters-3.js` (its `h2a`/`h3a`/`h3b` nodes, authored before the Phase
10 `SKILL_TREE_STAT_CAP_OVERRIDES.lifestealChance = 0.10` ceiling existed). This file adds
**zero** `lifestealChance` to filly. `getSkillTreeStatBonus` clamps it to 0.10 at read
time, so the effect is a harmless dead 0.05 in the a–h data, not a live overshoot.

Every other cell is at or under its ceiling.

### uniqueField totals (sum vs. tightest `[min,max]` across all contributing effects)

| classId \| field | sum | bounds |
| --- | --- | --- |
| gargoyle \| damageTakenMult | −0.18 | [−0.35, 0.5] |
| changedling \| damageTakenMult | 0.20 | [−0.3, 0.5] |
| changedling \| fireRingRadius | 26.00 | [0, 30] |
| changedling \| changelingMinionDmg | 0.65 | [0, 1] |
| changedling \| changelingMinionRadius | 17.00 | [0, 24] |
| changedling \| changelingSummonCooldown | −3.00 | [−5, 0] |
| changedling \| maxChangelingMinions | 2.00 | [0, 3] |
| changelingqueen \| damageTakenMult | −0.10 | [−0.3, 0.5] |
| changelingqueen \| changelingMinionDmg | 0.60 | [0, 0.6] |
| changelingqueen \| changelingMinionRadius | 20.00 | [0, 30] |
| changelingqueen \| changelingSummonCooldown | −1.90 | [−2, 0] |
| changelingqueen \| maxChangelingMinions | 3.00 | [0, 3] |
| changelingqueen \| fireZoneRadius | 20.00 | [0, 25] |
| changelingqueen \| fireZoneRange | 24.00 | [0, 30] |
| changelingqueen \| fireZoneRootMult | 0.40 | [−0.15, 0.5] |
| filly \| damageTakenMult | 0.14 | [−0.3, 0.5] |
| filly \| rockCoinChance | 0.12 | [0, 0.2] |
| engineerpony \| damageTakenMult | 0.04 | [−0.3, 0.5] |
| engineerpony \| turretDamageMult | 0.32 | [0, 0.4] |
| engineerpony \| maxTurrets | 2.00 | [0, 2] |

Every group's sum sits inside its own tightest bounds — no silent clamping. `min`/`max`
are kept identical across every effect targeting the same `classId|field` pair, per the
Phase 8b-uniquefx guidance.

## Verification performed

- `node --check js/achievements/skilltree-characters-4e.js` — clean.
- A `vm`-sandbox harness (stubbed `Util.clamp` + `CLASSES` scraped from `core.js`) loads
  `skilltree.js` then all four character files in `index.html` order and asserts:
  - **250** new nodes, **exactly 50 per character** (`{gargoyle:50, changedling:50,
    changelingqueen:50, filly:50, engineerpony:50}`), tree total 1304.
  - **0** id collisions with branches a–h and **0** duplicates within this file.
  - **0** unresolved `parent` ids (every parent is a real node — `char_hub_<classId>` or
    an earlier node in the same character's set).
  - Every effect's `classId` matches the owning character's id — **0** mismatches.
  - Every node has a non-empty `name`, `desc` and `effects` array.
  - Per-`(classId, stat)` and per-`(classId|field)` totals as tabled above.

The harness reported 4 flagged lines, all inspected and benign: 3 are its naive
"cursed node must be purely negative" check firing on cursed nodes whose debuff is a
**positive** `fireCooldown` / `meleeCooldown` amount (a higher cooldown is strictly
worse — a genuine debuff), and 1 is the pre-existing filly `lifestealChance` overshoot
documented above.

## Deviations from the brief

- **Branch shape.** The brief suggested "several branches of ~10-12 nodes each"; the
  shape landed on is 13/13/12/12 to hit exactly 50 with a uniform two-spine topology
  reusable across all five characters.
- **`i1` is not cursed for two branches.** `gargoyle_k1`, `changedling_k1`,
  `changelingqueen_k1`, `filly_k1` and `engineerpony_k1` are ordinary opener nodes; their
  branch's mandatory curse sits one tier in, at `k2b`, gating the b-spine only. The
  a-spine of those k branches is therefore reachable without a curse — deliberate, so
  each character has one uncursed on-ramp rather than four hard gates off the hub.

## Open risks

1. **filly `lifestealChance` 0.150 (pre-existing).** Not caused by this file; owned by
   `skilltree-characters-3.js`. Clamped to 0.10 at read time, so ~0.05 of that branch's
   value is dead. Fixing it means editing a–h data, which is outside this group's scope.
2. **`changedling` borrowed hive.** `Call of the Unfinished` sets `summonsChangelings`
   via `uniqueFlag`, which is applied last in `applySkillTreeStatBonuses`. Her
   `changelingMinionDmg` / `changelingMinionRadius` both default to 0 for her class, so
   the flag alone would summon harmless minions — the same node therefore seeds
   `changelingMinionDmg` (+0.25) and branch l's b-spine seeds radius (+17). If a player
   buys only the flag node, they get four drifting minions with 0-radius pools: visually
   present, mechanically inert. Not a crash; worth a play-test look.
3. **`engineerpony` `unlimitedRange`.** `combat-1.js`'s bolt lifetime becomes 999s when
   set. `-6%` ranged damage plus the branch's `+6% fireCooldown` opener is the intended
   price; whether that is *enough* price for room-length shots is a balance question a
   play-test should settle.
4. **`changelingqueen` `fireZoneRootMult` net +0.40** takes the self-root from 0.25 to
   0.65 — she still slows in her own pool, but only mildly. Combined with `fireZoneRadius`
   +20 (35 → 55) this is the strongest single-character swing in the file; the cursed
   `Mired in Her Own Fire` (−0.10) and three `rangedDamage` debits are its cost.
5. **`gargoyle` `meleeCooldown` 0.190.** She is a ranged class, so the +0.04 tradeoff on
   *Cathedral Ballast* is a nearly free cost for her. Left as flavour rather than
   re-pointing it at a stat she actually uses, since her genuinely-used fields were
   already budgeted; noted so a future pass does not mistake it for a real drawback.
