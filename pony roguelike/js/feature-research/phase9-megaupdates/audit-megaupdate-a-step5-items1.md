# Audit — Mega Update A, step 5: the `data/items-1.js` slice (65 items)

One of four parallel content slices over
`feature-research/phase9-megaupdates/step5-target-items.md`. Scope: **only the
65 rows whose `source file` is `items-1.js`** — 19 `classSynergy`, 38 `combo`,
8 `tradeoff`. No row's assigned role was changed, no item was added or removed,
and no row outside the quota was touched.

## Files changed

| File | Change |
| --- | --- |
| `js/data/items-1.js` | All 65 quota items rewritten: 12 gained a `classSynergy` map, all 65 gained a rewritten `desc` naming their new per-class behaviour, combo membership, or drawback. |
| `js/systems/items-synergy.js` | **Append-only**, below the `// --- NEW combos` marker and below the `items-4.js` / `items-2.js` slices' blocks: 19 new `SYNERGY_COMBOS` entries, all default `stage:'post'`, none declaring a `flag`. No core function, clamp table or field list touched. |
| `js/systems/items-1.js` | **Additive only** — 7 new lines/line-groups inside `recalcPlayerStats`, one per tradeoff penalty site, each tagged `Mega Update A step 5, items-1 slice — … tradeoff drawback`. No existing line modified. |
| `js/CODE_REFERENCE.md` | New `##### Step-5 content slice — data/items-1.js (65 items)` subsection after the `items-5.js` one. |
| `js/ui/ui.js` | **Not touched** — see "Deviations" 2. |
| `index.html` | Not touched. |

## The finding that shaped the whole slice: the layers cannot see active items

Both synergy layers resolve ownership out of `player.passives`
(`applyItemClassSynergyBonuses` reads `p[it.id]`; `isSynergyComboActive` reads
`p[id]` for `items`/`anyOf`). An **active** item never lands there:
`items-2.js`'s `applyItemToPlayer` routes `type:'active'` to
`player.pickupActiveItem(item)` (entities.js), and that is the **only** other
write path — `grep -rn "passives\["` over `js/` returns exactly two hits, the
HUD read in `ui.js` and the `applyPassiveEffect` increment.

A `classSynergy` map on an active item is therefore dead data, and so is any
combo naming an active in `items`/`anyOf`. **11 of this slice's 65 rows are
actives** — 7 `classSynergy` (`moonshard`, `vialcourage`, `allseeingeye`,
`lunaraffinity`, `dawnbringer`, `angelstears`, `sombrasbargain`), 2 `combo`
(`bombsatchel`, `largepenny`), 2 `tradeoff` (`thundercloud`, `blinkcrystal`).
This slice is the only one of the four whose quota contains actives, which is
why the limit surfaced here.

Handled entirely through documented escape hatches, without touching a core
function:

- the 7 active `classSynergy` rows carry **no `classSynergy` field**; their
  per-class meaning is expressed as `SYNERGY_COMBOS` entries whose `when`
  predicate tests `player.activeItem.id` together with `player.classId`. Since
  the field is absent, there is nothing to double-apply if the layer is ever
  extended to cover actives — the combos would simply be deleted.
- the 2 active `combo` rows keep their passive partners in `items` and add the
  active as a `when` clause (`satchelCharge`, `fatPurse`).
- the 2 active `tradeoff` rows get `recalcPlayerStats` terms guarded on
  `player.activeItem && player.activeItem.id === '…'`.

**Caveat (open risk 1 below):** `pickupActiveItem` does not call
`recalcPlayerStats`, so an active-conditioned bonus/penalty lands on the *next*
recalc rather than instantly.

## The 65 items

| itemId | q | role | what it got |
| --- | --- | --- | --- |
| `allseeingeye` | 1 | classSynergy | classSynergy (ACTIVE) — combo `huntersEye`: batpony/griffin/gargoyle holding it get +0.05 critChance. |
| `angelstears` | 2 | classSynergy | classSynergy (ACTIVE) — combo `hollowVessel`: ponybot/kirin have no red hearts to restore, so it armours them (-0.08 bossDamageTakenMult). |
| `coinmagnet` | 1 | classSynergy | classSynergy — seapony/kelpie +30 magnetRadius (too slow to chase pickups), diamonddog +0.05 shopDiscountBonus. |
| `damageup` | 1 | classSynergy | classSynergy — zebra +0.6 meleeDamage, kirin +0.8 rangedDamage, ponybot -0.02 fireCooldown (a rapid laser wants rate, not a flat +1). |
| `dawnbringer` | 2 | classSynergy | classSynergy (ACTIVE) — combo `dawnriderWings`: pegasus/hypogriff/changedling holding it get +10 speed. |
| `featherweight` | 1 | classSynergy | classSynergy — mule +12 speed, diamonddog/kelpie -0.04 meleeCooldown (the heavy-footed feel a lightened load most). |
| `firerateup` | 1 | classSynergy | classSynergy — dragon +0.5 / crystalpony +0.4 rangedDamage (charged shots barely feel a cooldown cut), seapony -0.04 fireCooldown. |
| `hpup` | 2 | classSynergy | classSynergy — rerouted for the two noRedContainers classes: ponybot -0.08 bossDamageTakenMult, kirin +0.08 dodgeChance; changeling +0.04 onKillHealChance. |
| `infernalcompass` | 1 | classSynergy | classSynergy — batpony +0.05 lifestealChance, changeling +0.05 onKillHealChance, kirin +0.08 bossDamageBonus. |
| `lunaraffinity` | 1 | classSynergy | classSynergy (ACTIVE) — combo `moonlitAffinity`: batpony/alicorn/windigo holding it get +1 luck. |
| `moonshard` | 2 | classSynergy | classSynergy (ACTIVE) — combo `moonshardResonance`: unicorn/alicorn/crystalpony holding it get +0.4 rangedDamage. |
| `nightlens` | 2 | classSynergy | classSynergy — batpony +8 speed, griffin +0.05 critChance, gargoyle +0.05 vulnerableChance (each reads the dark differently). |
| `seraphplume` | 2 | classSynergy | classSynergy — kirin/ponybot +0.08 dodgeChance instead of the unusable heart container, alicorn +0.05 onKillHealChance. |
| `seraphshield` | 1 | classSynergy | classSynergy — kirin +0.08 / breezie +0.06 dodgeChance, ponybot -0.06 bossDamageTakenMult (the frailest lean on i-frames hardest). |
| `sombrasbargain` | 2 | classSynergy | classSynergy (ACTIVE) — combo `bargainOfBlood`: batpony/changeling/changelingqueen holding it get +0.06 lifestealChance. |
| `spikedbard` | 2 | classSynergy | classSynergy — earth/diamonddog +0.5 meleeDamage, ponybot -0.06 bossDamageTakenMult (plating finally holds on a fragile chassis). |
| `starlitcompass` | 1 | classSynergy | classSynergy — crystalpony +2 luck, alicorn/filly +1 luck (the Crystal room answers its own kind). |
| `vialcourage` | 2 | classSynergy | classSynergy (ACTIVE) — combo `vialOfNerve`: kirin/breezie/ponybot holding it get +0.06 dodgeChance. |
| `wraithrounds` | 2 | classSynergy | classSynergy — unicorn +0.5 / griffin +0.3 rangedDamage, breezie +40 boltSpeed; silent for every melee class by design. |
| `ascendantcharm` | 2 | combo | combo `fortunesTrine` — +2 luck. |
| `blackheart` | 1 | combo | combo `bloodTithe` (core member) — +0.06 lifesteal, +0.3 melee/ranged. |
| `blessedhoof` | 1 | combo | combo `gallopsGrace` (anyOf: pool-speed half). |
| `bloodpact` | 1 | combo | combo `bloodTithe` (core member) — +0.06 lifesteal, +0.3 melee/ranged. |
| `bombrangeup` | 1 | combo | combo `demolitionKit` (+0.2 bombRadiusMult, +1 luck) and `satchelCharge` (its passive half). |
| `bombsatchel` | 1 | combo | combo `satchelCharge` (ACTIVE half, via `when` on player.activeItem) — +0.15 bombRadiusMult. |
| `boxer` | 2 | combo | combo `killingEdge` (anyOf: crit-chance half). |
| `cursedlocket` | 1 | combo | combo `bloodTithe` (anyOf buffer half). |
| `despairtoken` | 1 | combo | combo `courtOfWhispers` — +0.06 charm and +0.06 fear. |
| `directmalice` | 1 | combo | combo `concussivePair` — +0.05 stun, +0.3 meleeDamage. |
| `downyfeather` | 1 | combo | combo `gallopsGrace` (anyOf: common-speed half) — +12 speed, +0.04 dodge. |
| `envyshard` | 1 | combo | combo `courtOfWhispers`. |
| `gildedwing` | 1 | combo | combo `gallopsGrace` (anyOf: pool-speed half). |
| `gluttonyscoin` | 1 | combo | combo `fatPurse` — +1 luck, +0.08 shopDiscountBonus. |
| `graceofthedawn` | 1 | combo | combo `killingEdge` (anyOf: crit-chance half) — +0.05 crit, +0.3 critMultiplier. |
| `guardianhalo` | 2 | combo | combo `wardedPilgrim` (anyOf halo half). |
| `haloguidance` | 2 | combo | combo `guidedVolley` (anyOf homing-lens half). |
| `hardhitter` | 4 | combo | combo `concussivePair`. |
| `hexedtracker` | 2 | combo | combo `guidedVolley` (anyOf homing-lens half). |
| `holywater` | 1 | combo | combo `wardedPilgrim` — +0.08 bossDamageBonus, -0.08 bossDamageTakenMult, +0.04 dodge. |
| `largepenny` | 1 | combo | combo `fatPurse` (ACTIVE half, via `when` on player.activeItem). |
| `luckup` | 1 | combo | combo `fortunesTrine`. |
| `moonlitpetal` | 1 | combo | combo `demolitionKit`. |
| `piercingshot` | 1 | combo | combo `guidedVolley` — +40 boltSpeed, +0.3 rangedDamage. |
| `plaguebreath` | 1 | combo | combo `twinVenoms`. |
| `prospectorspick` | 1 | combo | combo `demolitionKit`. |
| `puritycharm` | 2 | combo | combo `fortunesTrine`. |
| `rangeup` | 1 | combo | combo `guidedVolley`. |
| `razorfocus` | 1 | combo | combo `killingEdge` (anyOf: crit-damage half). |
| `shadowstep` | 1 | combo | combo `gallopsGrace` (anyOf: pool-speed half). |
| `souldrain` | 1 | combo | combo `killingEdge` (anyOf: crit-chance half). |
| `speedup` | 1 | combo | combo `gallopsGrace` (anyOf: common-speed half). |
| `terrifying` | 1 | combo | combo `courtOfWhispers`. |
| `thickmane` | 2 | combo | combo `bloodTithe` (anyOf buffer half). |
| `venom` | 1 | combo | combo `twinVenoms` — +0.06 venomChance, +0.3 rangedDamage. |
| `voidwhisper` | 1 | combo | combo `wardedPilgrim`. |
| `whisperingkey` | 1 | combo | combo `fatPurse`. |
| `wingedgrace` | 1 | combo | combo `wardedPilgrim` (anyOf halo half). |
| `blinkcrystal` | 3 | tradeoff | tradeoff (ACTIVE) — -0.06 dodgeChance while held, guarded on player.activeItem.id. |
| `brimstonevial` | 3 | tradeoff | tradeoff — -0.10 inside the speed multiplier. |
| `luckyclover` | 3 | tradeoff | tradeoff — -0.05 critChance (fortune spent on loot, not aim). |
| `multishot` | 3 | tradeoff | tradeoff — -0.5 rangedDamage only (the split-shot cost). |
| `prismveil` | 3 | tradeoff | tradeoff — -40 boltSpeed via a follow-up line after the flat boltSpeed assignment, floored at 120. |
| `radiantburst` | 3 | tradeoff | tradeoff — -0.10 on rateDenom, i.e. slower attacks (inverted sign convention). |
| `secondwind` | 4 | tradeoff | tradeoff — -1 on BOTH meleeDamage and rangedDamage (strength held in reserve). |
| `thundercloud` | 3 | tradeoff | tradeoff (ACTIVE) — -0.10 speed multiplier while held, guarded on player.activeItem.id. |

## Verification

| # | Check | Result |
| --- | --- | --- |
| 1 | `node feature-research/phase9-megaupdates/verify-step5-synergy.js` | **PASS — 9842 assertions, 0 failures.** (a) 2180 OLD-vs-NEW field comparisons, 0 mismatches; (b) 0 drift over 8 repeated recalcs; (c) all 5 legacy flags on for a full-synergy save, none for a bare one, all 5 classes; (e) live smoke of both layers clean. |
| 2 | `node --check` on `js/data/items-1.js`, `js/systems/items-synergy.js`, `js/systems/items-1.js` | PASS |
| 3 | `ITEM_LIST.length` | **864 — unchanged** |
| 4 | `SYNERGY_COMBOS.length` | 32 = 5 legacy + 4 (`items-4`) + 4 (`items-2`) + **19 (this slice)** |
| 5 | Slice self-check (scratch script, run inside the harness's own vm bundle): every one of the 12 `classSynergy` maps uses a real `classId`, a field in `ITEM_SYNERGY_FIELDS`, a numeric amount, and a per-entry magnitude inside its own field clamp; every one of the 19 combos exists, has no explicit `stage`, declares no `flag`, references only real item ids, and targets only sanctioned fields | **0 problems** |
| 6 | Live behaviour probes | See below — all as designed |

Live probes (all run inside the real bundle, `recalcPlayerStats` repeated 6x
after each change to prove no drift):

- **classSynergy fires, is class-specific, and unwinds.** `hpup` on a Pony Bot:
  `bossDamageTakenMult` 1 -> 0.92, still 0.92 after 6 more recalcs, back to 1
  when the item is dropped. Same item on an Earth Pony (no entry): 1 -> 1.
- **A combo fires and does not drift.** `twinVenoms` on a Unicorn owning Venom +
  Plague Breath: active, `rangedDamage` 1.6 -> 1.9, `venomChance` 0.24
  (0.12 + 0.06 + the combo's 0.06); identical after 6 more recalcs.
- **An active-gated combo fires and releases.** `hollowVessel` on a Pony Bot:
  `bossDamageTakenMult` 1 -> 0.92 while holding Angel's Tears, back to 1 when
  the active is cleared.
- **Tradeoffs bite.** Unicorn owning Multi Shot + Second Wind + Prism Veil +
  Lucky Clover: `boltSpeed` 360 -> 320, `critChance` 0 -> -0.032 (-0.05 clover,
  +0.018 from its own +3 luck), `rangedDamage` 1.6 -> 0.5 (clipped by recalc's
  pre-existing `Math.max(0.5, …)` floor). Earth Pony: `speed` 150 -> 135 while
  holding Thundercloud; `dodgeChance` 0 -> -0.06 while holding Blink Crystal.

Per project convention, no heavy browser smoke-testing — the user verifies by
playing. (The harness prints the pre-existing, unrelated
`achievements.js: superboss achievement count (550) does not match the reward
pool size (575)` warning on load; it predates this pass.)

## Deviations from the contract

1. **The 7 active `classSynergy` rows carry no `classSynergy` field.** The
   contract's step 3 says to add one; doing so would have shipped data the
   engine never reads, backed by desc text promising the player behaviour that
   never happens. Their per-class meaning is delivered by class-gated combos
   instead (see the finding above). The role assignment itself is unchanged —
   every one of those 7 items still means something different per class.
2. **No new combo declares a `flag`, and `ui/ui.js` was not touched.** Two
   independent reasons, either sufficient. (a) The badge `<span>`s live in
   `index.html`'s `#synergyBar`, which is outside the permitted edit set, so a
   flag would be set but never shown — the infra audit's own HUD-badge open
   risk. (b) More decisively, the `items-2.js` slice's audit documents that a
   new flag **fails the required harness**: `verify-step5-synergy.js`'s
   OLD-vs-NEW section diffs every field on the player, the OLD build omits
   `items-synergy.js` entirely, so a new flag reads `old=undefined` /
   `new=false`. Mid-pass I did briefly find an `ensureSynergyBadge()` helper in
   `ui.js` (added by the `items-2.js` slice) that would have made badges
   addable from `ui.js` alone, and drafted 4 badges against it; on re-reading,
   that helper was no longer on disk (that slice was still in flight), so I
   dropped the flags rather than race a concurrent writer on a shared file. The
   4 combos that would have carried badges — `bloodTithe`, `courtOfWhispers`,
   `killingEdge`, `wardedPilgrim` — are stat-only and named in their members'
   descs, exactly like the other 15.
3. **`prismveil`'s penalty is a follow-up line, not a term in a sum.**
   `player.boltSpeed = player.def.boltSpeed || 340` is a flat assignment, and
   the contract forbids modifying an existing line, so the -40 rides on its own
   `if (p.prismveil) player.boltSpeed = Math.max(120, …)` line immediately
   after. Floored at 120 so no stack of copies can stall a bolt outright.

## Open risks

1. **Active-item conditions apply one recalc late.** `pickupActiveItem` does
   not call `recalcPlayerStats`, and neither does `useActiveItem`, so the four
   active-conditioned effects in this slice (`satchelCharge`, `fatPurse`, the 7
   class stand-ins, and the `thundercloud`/`blinkcrystal` penalties) land on the
   next recalc — any pill/star/item/familiar pickup. They are rebuilt from
   scratch each pass, so nothing compounds and nothing lingers beyond that one
   delay, but swapping actives can briefly carry the old item's modifier. The
   one-line fix (a `recalcPlayerStats(player)` after `pickupActiveItem` in
   `items-2.js`'s `applyItemToPlayer`) is outside this slice's edit set;
   recommended for whoever owns that file.
2. **The real fix for the whole class of problems** is to teach
   `applyItemClassSynergyBonuses` and `isSynergyComboActive` to count
   `player.activeItem` as one owned copy. That is a ~2-line change to two core
   functions and would let the 7 stand-in combos collapse back into ordinary
   `classSynergy` maps. Deliberately not done here (core functions are
   off-limits to slices); flagged for the infra owner.
3. **`critChance` and `dodgeChance` can go negative** on a character with no
   other source of that stat (measured: -0.032 and -0.06 above). Harmless —
   `Util.chance(p)` is `Math.random() < p` — and arguably correct, since a
   drawback should only cost you what you actually have. Noted because it is
   visible in a debug readout.
4. **Shared clamp budget.** Every post-stage combo's contribution to a field is
   summed across ALL FOUR slices before the single per-field clamp applies, and
   likewise for the whole `classSynergy` channel. This slice's amounts are
   deliberately small for that reason, but a late-run player holding items from
   several slices will cap out on the busiest channels (`luck`, `critChance`,
   `speed`). That is the documented design, not a bug — no clamp was widened.
5. **No clamp looked wrong for this slice's designs**, so none was touched. The
   only place the ceiling bound me at all was `luck` (±3): `fortunesTrine`'s +2
   plus `demolitionKit`'s +1 plus `moonlitAffinity`'s +1 already exceeds it if
   all three are live, which is intended — they share one budget.
