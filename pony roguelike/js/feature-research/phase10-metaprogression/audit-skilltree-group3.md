# Audit — Skill tree megaupdate, Group 3 (dragon / windigo / kelpie / breezie / dnbpony)

Phase 10 Part B, content-implementer pass. 250 new character skill-tree nodes,
50 per character.

## Files changed

| File | Change |
| --- | --- |
| `js/achievements/skilltree-characters-4c.js` | Placeholder skeleton replaced with the full 250-node data file + `SKILL_TREE_UF_BOUNDS_4C`, the `ST`/`UF`/`FL` effect-literal helpers, `SKILL_TREE_CHARACTER_CONFIG_4C` and `buildCharacterSkillNodes4C`. |
| `js/CODE_REFERENCE.md` | New section "Skill tree — Phase 10 Part B, Group 3", inserted immediately before Group 5's section (line 5065). |
| `feature-research/phase10-metaprogression/audit-skilltree-group3.md` | This file (new). |

Nothing else was touched. `index.html`, `skilltree.js`, `entities.js`, the
`combat-*.js` files and the sibling `skilltree-characters-4{a,b,d,e}.js` files
are all unmodified — no engine change of any kind was required.

## Topology

Four branches per character hung directly off the existing `char_hub_<classId>`
node, sized 13 / 13 / 12 / 12 = 50. Branch letters `i`, `j`, `k`, `l`. Every
branch is a chain that forks once near the top so the player commits to a side.
No a–h node is re-parented, edited, or depended on: a node's `parent` is either
its own character's hub or another key in the same branch.

## Per-character summary

### dragon — hold-to-charge fire breath
- **i · Furnace Breath** — fire rate and raw jet damage; the cursed *Sootlung* gates the whole payoff half.
- **j · Scaled Hide** — `damageTakenMult` armor plus a fear line; the cursed *Brittle Scale Rot* (+14% damage taken) is the sole parent of everything below it.
- **k · The Short Jet** — stretches the deliberately-short `baseRangeTiles`-derived range; cursed *Guttering Flame* reverses part of it.
- **l · Prismatic Maw** — *The Prismatic Maw* grants `crystalVolley` (`uniqueFlag`) + a mandatory `crystalShardCount` seed of 3, converting the piercing beam into a cursor-converging shard fan. Three *Facet* nodes take the count to its 6 clamp. **Loses the fire jet entirely.**

### windigo — innate 12% freeze, slow heavy frost bolts
- **i · Killing Frost** — spends her last 0.05 of `freezeChance` headroom, then carries the fiction on `vulnerableChance` / `stunChance`.
- **j · The Long Winter** — fights the 0.8s fire cooldown against bolt weight; cursed *Frostbitten Grip* and *Leaden Snow*.
- **k · Heart of Ice** — bodiless spirit: `dodgeChance` + `damageTakenMult`; cursed *Anchored to the Storm*.
- **l · The Blizzard's Wake** — grants `innateFireRing` (`uniqueFlag`) + `fireRingRadius`, taken to its 60px clamp. **She can no longer fire a single bolt** (`combat-1.js` gates normal attack dispatch on that flag). Ring DPS is `rangedDamage / fireCooldown`, so the branch's ranged-damage and cooldown nodes keep mattering post-conversion.

### kelpie — 2.25-tile melee reach, slow and heavy
- **i · The Long Reach** — reach vs. swing speed; cursed *Overextended* (+5% `meleeCooldown`) and *Bloated Bulk*.
- **j · The Luring Song** — `charmChance` / `fearChance`; cursed *Hollow Promise* and *Drowning Dread*.
- **k · Brackish Hide** — `damageTakenMult` + `venomChance`; cursed *Rot in the Lungs* (+14% damage taken) and *Silt Lung*.
- **l · The Drowned Thralls** — grants `summonsChangelings` (`uniqueFlag`) plus mandatory `changelingMinionDmg` / `changelingMinionRadius` seeds (both are 0 for her, so minions would be inert without them), with `maxChangelingMinions` (+2 → 4) and `changelingSummonCooldown` (−3s → 5s) sub-lines. Paid for in movement speed.

### breezie — pixie-sized, 2 red hearts, `unlimitedRange` dust motes
- **i · Motes That Never Fall** — the endless flurry: fire cooldown, bolt speed, venom.
- **j · Thistledown Hide** — surviving on two hearts. Cursed *Paper Wings* (+15% `damageTakenMult`) is the sole gate on the entire padding/dodge spine.
- **k · Pollen Trail** — `charmChance`, magnet radius, luck; cursed *Sneezing Fit*.
- **l · Borrowed Ember** — the only node in the tree that turns a `uniqueFlag` **off**: grants `charged` and revokes `unlimitedRange`. Her motes stop being infinite-range, she gains a dragon's charged jet, `chargeTime` seeds to +0.35 (her def has none), and `rangeTiles` suddenly matters. Capped off by *Emberheart*, which trades −5% `freezeChance` for the last of the range.

### dnbpony — DNB capstone unlock, fastest fire rate
- **i · Bassline** — exploits the large `rangedDamage` headroom the a–h files left him, plus `stunChance`. Cursed *Clipped Signal* and *Overdriven Rail*.
- **j · Tempo** — speed and `critChance`; cursed *Rushed Timing* and *Dropped Beat*.
- **k · Subwoofer** — `charmChance` / `fearChance` / `damageTakenMult`; cursed *Ear Bleed*.
- **l · Speaker Stacks** — grants `canBuildTurrets` (`uniqueFlag`) + `turretDamageMult` (to its 0.60 clamp) + `maxTurrets` (+2 → 5). The turret build interval **is** `fireCooldown` (`updateTurretBuild`), so *Feedback Loop*'s +5% `fireCooldown` is a genuine double cost.

## Tradeoff accounting

Every branch is gated. Across the 250 nodes:

- **20 `cursed:true` nodes** (4 per character) — debuff-only, and each is the sole
  parent of everything beneath it, so `canBuySkillNode`'s single-`parent`
  requirement makes the payoff structurally unreachable without eating the cost.
- **35 two-effect trade nodes** — a real upside paired with a real negative in the
  same `effects:[...]` array.
- **5 transformation capstones** (one per character, all at `l4`) — each hands over
  a whole borrowed mechanic *and* takes something away in the same node. Three of
  them (windigo, breezie, and dragon's `l4`) remove or replace the character's
  native attack outright.

On cooldown fields a **positive** amount is the debuff direction, so five cursed
nodes (`windigo_j9`, `kelpie_i4`, `breezie_i11`, `breezie_k4`, `breezie_l9`) carry
a positive `amount` and are still pure penalties. This is a deliberate deviation
from a naive "cursed ⇒ negative amount" reading of the `-characters-3.js`
convention; the intent (debuff-only) holds.

## Verification

Harness: all four skilltree data files evaluated in one `vm` context on top of a
stubbed `CLASSES`, then the assembled `SKILL_TREE_NODES` inspected.

| Check | Result |
| --- | --- |
| `node --check js/achievements/skilltree-characters-4c.js` | pass |
| New nodes emitted | 250 |
| Nodes per character | dragon 50, windigo 50, kelpie 50, breezie 50, dnbpony 50 |
| Id collisions (with a–h, or within this file) | 0 |
| Dangling `parent` references | 0 |
| Effects whose `classId` ≠ owning character | 0 |
| `uniqueField` bounds drift within a `(classId, field)` pair | 0 |
| `uniqueField` group sums outside their own `[min,max]` | 0 |
| `(classId, stat)` totals over cap, **introduced by this file** | 0 |
| Total tree size | 1054 → 1304 nodes |

## Chance-stat totals

Combined across **all** skilltree files (a–h plus this one), i.e. exactly what
`getSkillTreeStatBonus` sums before clamping. Cap is ±0.25, except
`lifestealChance` at ±0.10 (`SKILL_TREE_STAT_CAP_OVERRIDES`).

| classId | stat | total | cap | note |
| --- | --- | ---: | ---: | --- |
| dragon | critChance | 0.180 | 0.25 | 0.13 of it new |
| dragon | dodgeChance | 0.160 | 0.25 | pre-existing, untouched |
| dragon | fearChance | 0.150 | 0.25 | all new |
| dragon | onKillHealChance | 0.200 | 0.25 | +0.05 new |
| dragon | stunChance | 0.180 | 0.25 | all new |
| dragon | vulnerableChance | 0.150 | 0.25 | pre-existing, untouched |
| dragon | lifestealChance | 0.150 | **0.10** | **pre-existing over-cap; +0.00 added here** |
| windigo | critChance | 0.160 | 0.25 | all new |
| windigo | dodgeChance | 0.150 | 0.25 | all new |
| windigo | freezeChance | 0.240 | 0.25 | +0.05 new (0.19 pre-existing) |
| windigo | onKillHealChance | 0.130 | 0.25 | all new |
| windigo | stunChance | 0.130 | 0.25 | all new |
| windigo | vulnerableChance | 0.230 | 0.25 | all new |
| kelpie | charmChance | 0.190 | 0.25 | all new |
| kelpie | dodgeChance | 0.050 | 0.25 | all new |
| kelpie | fearChance | 0.190 | 0.25 | all new |
| kelpie | onKillHealChance | 0.090 | 0.25 | all new |
| kelpie | venomChance | 0.230 | 0.25 | +0.07 new (0.16 pre-existing) |
| kelpie | lifestealChance | 0.040 | **0.10** | all new; the only lifesteal this file adds |
| breezie | charmChance | 0.190 | 0.25 | all new |
| breezie | critChance | 0.240 | 0.25 | +0.06 new (0.18 pre-existing) |
| breezie | dodgeChance | 0.240 | 0.25 | all new |
| breezie | fearChance | 0.200 | 0.25 | +0.05 new (0.15 pre-existing) |
| breezie | freezeChance | 0.100 | 0.25 | **reduced** from 0.15 by *Emberheart* |
| breezie | onKillHealChance | 0.090 | 0.25 | all new |
| breezie | venomChance | 0.090 | 0.25 | all new |
| breezie | vulnerableChance | 0.150 | 0.25 | pre-existing, untouched |
| breezie | lifestealChance | 0.160 | **0.10** | **pre-existing over-cap; +0.00 added here** |
| dnbpony | charmChance | 0.160 | 0.25 | all new |
| dnbpony | critChance | 0.180 | 0.25 | all new |
| dnbpony | dodgeChance | 0.150 | 0.25 | pre-existing, untouched |
| dnbpony | fearChance | 0.160 | 0.25 | all new |
| dnbpony | onKillHealChance | 0.150 | 0.25 | pre-existing, untouched |
| dnbpony | stunChance | 0.190 | 0.25 | all new |
| dnbpony | lifestealChance | 0.150 | **0.10** | **pre-existing over-cap; +0.00 added here** |

Chance bonuses are concentrated: each character spends them across 3–5 stats and
roughly 12–16 of its 50 nodes, not sprinkled over all 50.

### Non-chance stat totals (all files combined, all within ±0.25)

| classId | stat: total |
| --- | --- |
| dragon | boltSpeed 0.100 · fireCooldown −0.210 · rangeTiles 0.170 · rangedDamage 0.180 · speed −0.060 |
| windigo | boltSpeed −0.010 · fireCooldown −0.230 · luck 0.190 · magnetRadius 0.220 · meleeCooldown 0.150 · meleeDamage −0.050 · rangeTiles 0.150 · rangedDamage 0.190 · speed −0.130 |
| kelpie | boltSpeed 0.150 · fireCooldown 0.150 · luck −0.070 · magnetRadius 0.200 · meleeCooldown −0.220 · meleeDamage 0.160 · rangeTiles 0.170 · speed −0.240 |
| breezie | boltSpeed 0.090 · fireCooldown −0.070 · luck 0.130 · magnetRadius 0.200 · rangeTiles 0.180 · rangedDamage 0.210 · speed −0.040 |
| dnbpony | boltSpeed 0.180 · fireCooldown −0.080 · luck 0.050 · magnetRadius 0.050 · meleeDamage 0.150 · rangedDamage 0.160 · speed 0.160 |

### `uniqueField` totals

| classId · field | sum | bounds | note |
| --- | ---: | --- | --- |
| dragon · chargeTime | 0.00 | [−0.2, 0] | bounds + −0.19 baseline inherited from `-characters-2.js` |
| dragon · crystalShardCount | 6.00 | [0, 6] | at clamp by design |
| dragon · damageTakenMult | −0.02 | [−0.3, 0.6] | |
| dragon · baseRangeTiles | 1.90 | [0, 3] | pre-existing only; untouched here |
| windigo · fireRingRadius | 60.00 | [0, 60] | at clamp by design |
| windigo · damageTakenMult | −0.02 | [−0.3, 0.6] | |
| kelpie · changelingMinionDmg | 6.00 | [0, 6] | at clamp by design |
| kelpie · changelingMinionRadius | 70.00 | [0, 70] | at clamp by design |
| kelpie · maxChangelingMinions | 2.00 | [0, 2] | 2 → 4 minions |
| kelpie · changelingSummonCooldown | −3.00 | [−5, 4] | 8s → 5s |
| kelpie · damageTakenMult | −0.17 | [−0.3, 0.6] | |
| kelpie · baseRangeTiles | 1.20 | [0, 2] | pre-existing only; untouched here |
| breezie · chargeTime | 0.13 | [0, 0.6] | +0.35 seed, then three reductions |
| breezie · damageTakenMult | −0.02 | [−0.4, 0.6] | |
| dnbpony · turretDamageMult | 0.60 | [0, 0.6] | at clamp by design |
| dnbpony · maxTurrets | 2.00 | [0, 2] | 3 → 5 stacks |
| dnbpony · damageTakenMult | 0.16 | [−0.3, 0.6] | net positive: this branch is a glass cannon |

## Deviations from the brief

1. **`dragon|chargeTime` could not be used for buffs.** `-characters-2.js` already
   declares that pair with bounds `[-0.2, 0]` and already sums to −0.19 against
   it — the buff side is saturated. Rather than ship five dead nodes, this file
   reproduces those exact bounds (never widening them, so
   `applySkillTreeUniqueFieldBonuses`' tightest-bounds merge stays order-
   independent) and uses the field in the **penalty** direction only. The four
   penalty amounts sum to exactly +0.19, so a fully-cursed dragon lands back on
   the stock 0.5s charge and every one of those four nodes bites. The charge-speed
   *buffs* originally drafted for branches i/k were retargeted to `fireCooldown`
   and `rangedDamage`, with their `desc` text rewritten to match.
2. **`crystalVolleySpacing` was dropped as a dragon target.** It seeds to 0 for
   any class without `def.crystalVolley`, and `playerCrystalVolleyAttack` reads
   `player.crystalVolleySpacing || CRYSTAL_VOLLEY_SPACING_DEFAULT` — a bonus there
   fights the `||` fallback rather than widening the fan. The three nodes that had
   targeted it were retargeted to `boltSpeed` (×2) and `critChance`, and renamed
   (*Keener Shards*, *Faceted Points*, *Kaleidoscope Jaw*). `crystalShardCount`
   has no such problem (0 + bonus is a valid count) and is kept.
3. **Cursed nodes on cooldown fields carry positive amounts** — see "Tradeoff
   accounting" above. Semantically still debuff-only.
4. **No lifesteal for three of the five characters.** dragon / breezie / dnbpony
   were already past the 0.10 override before this pass; adding any would have
   been a guaranteed no-op after clamping.

## Open risks

- **Pre-existing lifesteal over-cap.** dragon (0.150), breezie (0.160) and dnbpony
  (0.150) all exceed `SKILL_TREE_STAT_CAP_OVERRIDES.lifestealChance` (0.10) from
  the a–h files alone. The engine clamps correctly, so there is no bug — but the
  excess nodes in those older files are partly inert for those three characters.
  Out of scope for this pass; flagged for whoever owns a cap-rebalance.
- **`kelpie|speed` reaches −0.240** in the fully-bought worst case (120 → ~91
  px/s), and `breezie` can end up net-slower than stock too. Both are the intended
  consequence of buying every cursed gate; partial builds are much less extreme.
  Worth a play-feel check.
- **Transformation capstones are irreversible within a run** and permanent across
  the account once bought — a player who buys *The Blizzard's Wake* can never
  again play a bolt-firing windigo. This matches the Soy-Milk brief, but the
  skill tree has no respec, so the `desc` text on all five capstones states the
  loss explicitly and in the first sentence.
- **`breezie` losing `unlimitedRange`** makes her `rangeTiles` live for the first
  time. Her `baseRangeTiles` falls back to the ranged default of 7, which should
  be comfortable, but this is the one conversion whose feel depends on a value
  nothing previously exercised for her.
