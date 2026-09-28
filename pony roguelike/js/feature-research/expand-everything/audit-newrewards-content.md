# audit — newrewards-content

Authoring dispatch: 450 brand-new, unclaimed, `locked:true` reward entries
(150 trinkets / 150 items / 150 familiars) so the NEXT dispatch has a supply
to point the ~547 reward-less achievements at. **No existing trinket, item,
familiar, or achievement definition was touched.**

---

## 1. Files changed

| File | What changed |
|---|---|
| `js/data.js` | +150 `TRINKETS`, +150 `ITEMS`, +150 `FAMILIAR_TYPES` entries, each in its own commented `NEWREWARDS-CONTENT BATCH` block appended to the end of its table. Nothing above those blocks was edited. |
| `js/items.js` | Wiring only. 26 new `// newrewards-content batch trinkets/passives` term blocks inside `recalcPlayerStats`; 6 ids appended to `applyPassiveEffect`'s `grantHeartContainer(1)` chain; 30 new `case` blocks appended to `useActiveEffect`'s switch. No existing term, cap, or comment altered. |
| `js/achievements.js` | **One line** — `SUPERBOSS_REWARDS`'s filter gained `&& !t.pendingReward`, plus a 5-line explanatory comment. See §5 (Deviations). No achievement definition touched. |

Nothing else in `js/` was opened for writing. `js/stars.js`, `js/pills.js`,
`js/enemies.js`, `js/room.js`, `js/dungeon.js`, `js/stages.js`, `js/ai.js`,
`js/combat.js`, `js/entities.js`, `js/game.js`, `js/familiars.js` are unmodified.

---

## 2. Exact final counts

### A. Trinkets — 150 added (`TRINKETS` 290 → 440)

* 75 single-effect "reskins" of an existing additive channel
* 75 multi-channel combos — of which **29** pay a real downside
  (−1 damage / −6…−10% speed / −1 Luck / −5% fire rate) for a full-strength
  upside, and 46 are two reduced-magnitude upsides
* All 150 carry `locked:true` **and** `pendingReward:true` (see §5)

Channel usage (effect instances, 225 total across the 150 entries):

| channel | n | channel | n | channel | n |
|---|---|---|---|---|---|
| speed | 24 | luck | 20 | firerate | 15 |
| charm | 14 | damage | 13 | lifesteal | 12 |
| bossdmg | 12 | stun | 12 | bossdr | 11 |
| crit | 10 | onkillheal | 9 | magnet | 9 |
| range | 8 | venom | 8 | freeze | 8 |
| bomb | 8 | fear | 7 | shopdisc | 7 |
| dodge | 6 | critmult | 6 | dealdisc | 1 |
| pierce | 1 | homing | 1 | spectral | 1 |
| explosive | 1 | multishot | 1 | | |

### B. Items — 150 added (`ITEMS` 925 → 1075)

**120 passive / 30 active.**

Passive quality histogram: **q1 60, q2 35, q3 18, q4 7**
Active quality histogram: **q1 11, q2 11, q3 8** (no q4 actives, matching the
existing table, which also has none)

* All 150 use `pools:POOLS_ALL` (the existing default — 857 of the 925 pre-existing items do)
* Passives: 81 single-channel, 33 two-channel, **6 heart-container grants**
* Actives: `maxCharge` 2×1, 3×6, 4×11, 5×3, 6×9 — all inside the existing 1-8 range
* Active effect archetypes, every one a reuse of a shape already in
  `useActiveEffect`: roomnuke 4, blast 4, heal 4, invincible 4, fullheal 2,
  shield 2, stunall 2, coins 2, speed 1, bombs 1, slow 1, blink 1, gift 1, reveal 1

Passive channel usage (147 effect instances across the 114 non-heart passives):
firerate 13, onkillheal 10, bossdmg 9, shopdisc 8, venom 8, luck 8, fear 8,
magnet 8, speed 7, dodge 7, range 7, lifesteal 6, damage 6, bomb 6, crit 6,
stun 5, charm 4, freeze 4, critmult 4, bossdr 4, explosive 4, pierce 4, dealdisc 1.

### C. Familiars — 150 added (`FAMILIAR_TYPES` 159 → 309)

**50 orbiter / 50 shooter / 50 proc.**

* orbiter `dmg` spread: 1×20, 2×20, 3×10; 10 of the 50 carry `freezeChance`
  (0.12/0.15, the two values already in the table)
* shooter `dmg` spread: 1×25, 2×20, 3×5; `cooldown` 0.85-2.3, `boltSpeed` 220-340
* proc `procType` split: **heal 14, coin 12, luckpulse 12, charge 12** — no
  fifth procType invented
* Every `dmg` is a Floor-1 baseline read through `familiarDamage(dmg, floorNum)`,
  exactly like the existing entries; all values are copies of magnitude tuples
  already present in the table.

---

## 3. Wiring-completeness proof

Verification was scripted, not spot-checked, and re-run after each batch.

### Trinkets (150/150)
A harness loads `utils.js` + `data.js` + `items.js`, snapshots the full stat
vector for a bare player (`luck, speed, meleeDamage, rangedDamage,
meleeCooldown, rangeTiles, bossDamageBonus, bossDamageTakenMult,
lifestealChance, critChance, onKillHealChance, venom/stun/charm/freeze/fear
Chance, magnetRadius, bombRadiusMult, tearFlags, multishotExtra, dodgeChance,
critMultiplier, dealDiscount, shopDiscountBonus`), then equips each new trinket
and re-runs `recalcPlayerStats`.

> **pendingReward trinkets with NO measurable stat change: 0**

Grep-level confirmation: every one of the 150 ids appears as a
`t === '<id>'` term in `js/items.js` (0 missing).

### Passive items (120/120)
Same harness, `player.passives[id] = 1`:

> **passives with NO measurable stat change: 0**

The 6 heart-container passives are excluded from that check by construction
(they act in `applyPassiveEffect`, not `recalcPlayerStats`) and were verified
separately — all 6 ids appear in the `grantHeartContainer(1)` chain.

### Active items (30/30)
> **actives NOT present as a `case '<id>':` in `useActiveEffect`: 0**

Each body is a copy of an existing case's shape (`depthDmg()` room nuke,
`Explosion` radial blast, `player.heal`, `redCurrent = redMax`,
`invincibleTimer`, `speedBoostTimer`, `shieldHits`, `stunTimer`,
`Util.randi` coins, `player.bombs`, `game.slowTimer`, `clampToRoom` blink,
`grantPickupEffect` gift, `revealMap`) — no new active mechanic.

### Familiars (150/150)
Field names were validated against what `updateOrbiterFamiliar` /
`updateShooterFamiliar` / `updateProcFamiliar` actually read
(`def.dmg/radius/orbitSpeed/contactCooldown/freezeChance`,
`def.dmg/cooldown/boltSpeed`, `def.procType/interval/amount`):

> **field problems (missing required field, unexpected extra field, unknown procType): 0**

### Id / name uniqueness
Across all three tables *combined* (items + trinkets + familiars, existing + new):

> **1824 ids, 1824 unique. 0 duplicate display names.**

(Uniqueness is only strictly required per-table; it holds globally anyway.)

### Syntax
`node --check` run on **every** file in `js/` after each batch and again at the
end — all pass.

### Whole-table load
`utils.js + data.js + enemies.js + bestiary.js + items.js + achievements.js`
executed in one scope with a DOM stub:

> `SUPERBOSS_REWARDS length 300` — **warnings: 0**

i.e. the superboss achievement grid still resolves one-to-one against its
reward pool, unchanged.

---

## 4. Balance calibration notes

* Trinket magnitudes are drawn only from values already present on existing
  trinkets in the same channel (e.g. damage 1-2, speed 0.08-0.14, crit
  0.05-0.08, magnet 25-40, bossdmg 0.06-0.12). Combo entries use a reduced
  band (~60-70% of the single-effect band) unless they pay a downside.
* Passive magnitudes scale with `quality`: q1 is the smallest existing value in
  that channel, q4 the largest. The five binary "whole-build" channels
  (pierce / homing / spectral / explosive / multishot) and the devil-deal
  discount are barred from quality 1.
* Every channel these feed is already `Math.min`/`Math.max`-capped in
  `recalcPlayerStats`, so the new volume cannot push any stat past a ceiling
  the existing content couldn't already reach.
* Familiar stat tuples are verbatim copies of existing tuples, so the batch
  adds no new power level to the familiar pool at all — only variety.

---

## 5. Deviations

1. **One line changed in `js/achievements.js` (unavoidable).**
   `SUPERBOSS_REWARDS` is built as
   `TRINKET_LIST.filter(t => t.locked && !t.donationReward)` and is asserted to
   be exactly `CLASSES × SUPERBOSSES` = 300 entries, indexed with a
   strictly-incrementing counter and no modulo. Appending 150 locked trinkets
   would have silently inserted them **into the middle of that pool**, shifting
   the 7 pickup kinds + 32 items + 72 familiars + 12 stars past index 300 and
   making them unreachable, while 150 achievements got a reward they were never
   meant to have. Every new trinket therefore carries `pendingReward:true` and
   the filter gained `&& !t.pendingReward`. Verified: the pool is still exactly
   300 and the locked/non-donation/non-pending count is still exactly 177.
   The next dispatch should assign these trinkets explicitly (the flag is inert
   everywhere else in the codebase — it is read at exactly this one site).

2. **Item passive/active ratio.** The brief asked for ~80/20 "matching the
   existing rough ratio". The existing ratio is actually **96.3 / 3.7**
   (891 passive / 34 active). I went with the explicitly requested 80/20
   (120/30) rather than the measured ratio, since the explicit number was the
   instruction; the result nearly doubles the game's active-item pool
   (34 → 64). Flagging it in case the intent was the measured ratio, in which
   case ~144/6 would have been the call.

3. **Content was script-generated**, from a single table that emits the
   `desc` string and the `recalcPlayerStats` term from the same source values —
   which is why no desc in this batch can disagree with its wiring. The
   generator and its frozen output live in the session scratchpad, not in the
   repo.

4. No new gameplay mechanic, hook, stat channel, active-item effect shape, or
   familiar behavior was introduced anywhere. Every entry reuses an existing
   aggregation slot, an existing switch case shape, or an existing familiar
   behavior.
