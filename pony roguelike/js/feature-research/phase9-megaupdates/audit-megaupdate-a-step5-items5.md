# Audit — Mega Update A, step 5: the `data/items-5.js` slice (105 items)

One of four parallel content slices over
`feature-research/phase9-megaupdates/step5-target-items.md`. This slice owns
**every row whose `source file` is `items-5.js` — 105 of the 250**, the largest
share, because the infra pass redistributed `items-2.js`'s tradeoff quota here
(infra-audit deviation 4). No row outside that set was touched.

## Role split — and why there are no combos here

| Role | Count | What was authored |
| --- | --- | --- |
| `classSynergy` | 82 | a `classSynergy: { <classId>: { field, amount } }` map on the item's `data/items-5.js` entry + a rewritten `desc` naming the classes in-fiction |
| `tradeoff` | 23 | a Soy-Milk-style drawback as an additive **negative term in `recalcPlayerStats`** (`systems/items-1.js`) + the drawback stated in the `desc` |
| `combo` | **0** | the target list assigns this file no combo rows |

82 + 23 = 105. **`js/systems/items-synergy.js` and `js/ui/ui.js` were therefore
not edited at all by this slice** — no `SYNERGY_COMBOS` entry to append, hence
no `flag`, hence no badge span or `SYNERGY_BADGES` entry to add.

## Files changed

| File | Change |
| --- | --- |
| `js/data/items-5.js` | 105 item entries: 82 gained a `classSynergy` map (210 class/field entries total), all 105 gained a rewritten `desc`. No item added, removed, renamed or re-typed; no `quality`/`pools`/`locked`/`unlockedBy`/`attackLayer` field touched. |
| `js/systems/items-1.js` | **8 purely additive blocks** inside `recalcPlayerStats`, one per stat channel, each tagged `// Mega Update A step 5 — items-5.js tradeoff drawbacks (see data/items-5.js)`. No existing line edited or removed (verified by diff — the change is 20 inserted lines, 0 deleted). |
| `js/systems/items-synergy.js` | **untouched** (no combo rows in this slice). |
| `js/ui/ui.js` | **untouched** (no new flags). |
| `js/CODE_REFERENCE.md` | New `##### Step-5 content slice — data/items-5.js (105 items)` subsection under the existing `systems/items-synergy.js` section, alongside the `items-4.js` and `items-2.js` slice subsections. The general `classSynergy` / `SYNERGY_COMBOS` / clamp machinery was already documented by the infra pass and was not duplicated. |

## Design notes

**`classSynergy` was authored by what the item *is*, not by which stat it
prints.** Each map names 2-3 classes and is deliberately silent for the other
22+ — a class with no entry is the correct default, per the infra contract. The
recurring shapes:

- *the class whose identity the stat already is*: the recharge trophies favour
  Sea Pony and Windigo (the two slowest casters in the game), the speed
  trophies favour Kelpie and Crystal Pony (the two slowest legs), the crit
  items favour Kirin and Zebra (who land one heavy blow at a time and want the
  multiplier, not the frequency).
- *rerouting a dead effect*: **heart-container items are worthless to
  `noRedContainers` classes**, so `halegirth` gives Pony Bot and Kirin
  `bossDamageTakenMult: -0.1` instead, and `hallowedheart` gives Pony Bot
  lifesteal / Kirin dodge / Breezie boss mitigation. Same reasoning for
  `ashenreliquary`: its "ranged bolts detonate" line is dead on a melee class,
  so an Earth Pony gets `bombRadiusMult: +0.12` from it instead.
- *the active items* grant whatever the class can actually spend the effect on
  (a Diamond Dog packs `boilingtonic` tighter; a Mule haggles `glassbeacon`'s
  coins down).

Amount bands, all comfortably inside `ITEM_SYNERGY_FIELD_CLAMPS`: chance fields
0.04-0.06, `luck` 1-2, `speed` 5-10 px/s, `meleeDamage`/`rangedDamage` 0.4-1,
`meleeRange` 8 px, `boltSpeed` 30-40, `meleeCooldown`/`fireCooldown` -0.02 to
-0.06 s, `critMultiplier` 0.2-0.4, `magnetRadius` 20-25, `bombRadiusMult`
0.08-0.15, `bossDamageBonus` 0.05-0.08, `bossDamageTakenMult` -0.05 to -0.1,
`dealDiscount` 0.25, `shopDiscountBonus` 0.05-0.08. No clamp was widened.

**The 23 tradeoff drawbacks** are real costs, not flavour, and every one is
visible on the pedestal before pickup. They land in eight `recalcPlayerStats`
channels:

| Channel | Items | Amount | Sign note |
| --- | --- | --- | --- |
| speed multiplier | `beckoningvestment`, `feintingsigil`, `haleribcage`, `mastervaultkey`, `sleetedcirclet` | -0.05 to -0.08 | |
| `meleeDamage` + `rangedDamage` | `emberwick`, `lopingreliquary` | -0.5 each | |
| `rangedDamage` only | `crackedrune`, `asheneffigy` | -0.5 | the `Math.max(0.5, …)` floor means a melee class never feels these — deliberate, both items are ranged-bolt items |
| `rateDenom` | `longeffigy`, `numbingmantle` | -0.08 / -0.06 | **`rateDenom` is the divisor** (`rateMult = 1 / rateDenom`), so a negative term here makes attacks *slower* — inverted relative to every other row |
| `luck` | `blessedhalo`, `forsakensignet`, `crackedpendant` | -1 | also costs -0.6% on every luck-scaled on-hit status via `luckBonus` |
| `dodgeChance` | `crackedcloak`, `hallowedpendant` | -0.04 | |
| `critChance` | `deepgauntlet`, `forsakenlocket`, `whirringeffigy`, `monarchbracer` | -0.04 to -0.06 | |
| `bossDamageTakenMult` | `blastmaster`, `martyrsvow`, `ancientcloak` | **+0.10 / +0.12** | that formula is `1 - <reductions>`, so a POSITIVE term means MORE damage taken; its `Math.max(0.25, …)` is a floor on the multiplier, so the penalty is never clipped |

## Verification

| # | Check | Result |
| --- | --- | --- |
| 1 | `node --check` on `js/data/items-5.js`, `js/systems/items-1.js`, `js/systems/items-synergy.js`, `js/ui/ui.js` | PASS |
| 2 | `node feature-research/phase9-megaupdates/verify-step5-synergy.js` | **ALL PASS (9842 assertions, 0 failures)** — 2180 OLD-vs-NEW field comparisons, 0 mismatches; 0 drift mismatches across 8 repeated recalcs |
| 3 | `ITEM_LIST.length` | **864 — unchanged** |
| 4 | All 105 target rows present and correctly roled in `items-5.js` (scripted cross-check against the target list) | PASS — 82 classSynergy / 23 tradeoff, 0 missing maps, 0 stray maps on tradeoff rows |
| 5 | Slice sanity harness (real `index.html` script order in a `vm`): every one of the **210** class/field entries targets a real `classId`, a field in `ITEM_SYNERGY_FIELDS`, and actually moves that field for that class | PASS — 210/210, 0 problems |
| 6 | Same harness: no drift on any of the 210 entries after an extra `recalcPlayerStats` | PASS — 0 drift |
| 7 | Same harness: each of the 23 tradeoff items produces its negative delta (checked on both a melee class and a ranged class, so the `Math.max(0.5, …)` ranged floor is covered) | PASS — 23/23 |
| 8 | `js/systems/items-1.js` diff is insert-only | PASS — 20 lines added, 0 removed |

Registry state after this slice: `SYNERGY_COMBOS.length = 32` (5 legacy + 27
appended by the other three slices — none of them mine); 153 items across all
files now carry `classSynergy`, 82 of them from this slice.

Per project convention, no heavy browser smoke-testing — the user verifies by
playing. (The harness prints a pre-existing, unrelated `achievements.js:
superboss achievement count (550) does not match the reward pool size (575)`
warning on load; it predates step 5 entirely.)

## Deviations

1. **No combo work, and no `ui/ui.js` edit.** The dispatch briefed all three
   roles, but this file's 105 rows are 82 `classSynergy` + 23 `tradeoff` and
   **zero `combo`** — verified by counting the role column of every
   `items-5.js` row in the target list. Authoring combos here would have meant
   inventing rows outside the scope contract, so none were written.
2. **Heart-container penalties were not used for any tradeoff.** The obvious
   `witheredapple` precedent (`grantHeartContainer(-1)`) lives in
   `js/systems/items-2.js`'s `applyPassiveEffect`, which is **outside this
   slice's permitted edit set**. Every drawback is therefore a
   `recalcPlayerStats` term instead — the other sanctioned option in the
   dispatch. `haleribcage`, the one heart-container tradeoff row, pays in
   movement speed rather than in the heart it grants.
3. **Two drawbacks are class-conditional in practice.** `crackedrune` and
   `asheneffigy` cost -0.5 `rangedDamage`, which the `Math.max(0.5, …)` floor
   swallows for a melee class that fires no bolts. That is correct — both items
   *are* ranged-bolt items, so a melee class gets neither the upside nor the
   downside — but it does mean their drawback is invisible on ~half the roster.

## Open risks

- **The per-field `classSynergy` clamp is a shared budget**, and a player
  hoarding many of this slice's items for one class can cap out: e.g. Mule
  stacking `luckytoken` + `cometdustpouch` + `skeletonkeyring` +
  `hcfwtrophy_*` luck rows crosses the `luck` ±3 clamp, and Diamond Dog
  stacking `demolitionrig` + `wildprism` + `vagrantwhistle` + `cherrybomb` +
  `sparkfuse` crosses `bombRadiusMult` ±0.25. This is by design (the clamp is
  the budget), but it means the late items in such a stack are worth nothing —
  the same note the `items-2.js` slice raised. No clamp was widened.
- **The `rateDenom` sign inversion is a footgun** for the next person adding a
  recharge penalty: a negative term there is *slower*, unlike every other
  channel. It is commented at the insertion site and documented in
  `CODE_REFERENCE.md`, but the convention itself is unguarded.
- **`bossDamageTakenMult` penalties only bite against bosses.** `blastmaster`,
  `martyrsvow` and `ancientcloak` are pure upside in every ordinary room; their
  cost is paid only in boss fights. That is the intended shape (each is a
  boss-flavoured item), but it makes them weaker drawbacks than the flat ones.
- **`classSynergy` applies after `applySkillTreeStatBonuses`**, so these
  bonuses are additive on top of the skill tree's multiplicative ones — the
  infra audit's standing risk, unchanged by this slice.

## Full item list (105)

| itemId | name | q | role | what it got |
| --- | --- | --- | --- | --- |
| `apexcalibration` | Apex Calibration | 1 | classSynergy | unicorn critChance 0.03; seapony critMultiplier 0.2; griffin critChance 0.02 |
| `boilingprism` | Boiling Prism | 1 | classSynergy | kirin dodgeChance 0.06; breezie dodgeChance 0.05; ponybot bossDamageTakenMult -0.08 |
| `boilingtonic` | Boiling Tonic | 1 | classSynergy | diamonddog bombRadiusMult 0.1; earth meleeDamage 0.5 |
| `brasslockpick` | Brass Lockpick | 1 | classSynergy | mule shopDiscountBonus 0.05; diamonddog speed 6; filly speed 5 |
| `cherrybomb` | Cherry Bomb | 1 | classSynergy | diamonddog bombRadiusMult 0.12; mule bombRadiusMult 0.08 |
| `cinderphial` | Cinder Phial | 1 | classSynergy | kirin onKillHealChance 0.05; ponybot lifestealChance 0.05; breezie lifestealChance 0.04 |
| `cometdustpouch` | Comet-Dust Pouch | 1 | classSynergy | mule luck 1; filly luck 1 |
| `cursedvial` | Cursed Vial | 1 | classSynergy | unicorn rangedDamage 0.5; engineerpony rangedDamage 0.5; changelingqueen rangedDamage 0.4 |
| `deepflask` | Deep Flask | 1 | classSynergy | crystalpony lifestealChance 0.04; dragon lifestealChance 0.04; earth onKillHealChance 0.04 |
| `driftboots` | Drift Boots | 1 | classSynergy | pegasus speed 8; breezie speed 6; kelpie speed 8 |
| `emberbeacon` | Ember Beacon | 1 | classSynergy | ponybot bossDamageTakenMult -0.08; kirin dodgeChance 0.05; breezie dodgeChance 0.05 |
| `emberdrinkervessel` | Ember-Drinker Vessel | 1 | classSynergy | batpony lifestealChance 0.05; changeling lifestealChance 0.05; kirin lifestealChance 0.04 |
| `freefallcloak` | Freefall Cloak | 1 | classSynergy | pegasus speed 8; hypogriff dodgeChance 0.04; gargoyle speed 6 |
| `glassdraught` | Glass Draught | 1 | classSynergy | batpony onKillHealChance 0.04; changeling onKillHealChance 0.04 |
| `hcfwtrophy_challenge_fw_floor_nodamage` | Untouched Waveform Trophy | 1 | classSynergy | dnbpony speed 6; changedling speed 6 |
| `hcfwtrophy_challenge_fw_onehearted` | Single Frequency Trophy | 1 | classSynergy | kirin rangedDamage 1; seapony rangedDamage 1 |
| `hcfwtrophy_challenge_fw_speedkill` | Quick Flatline Trophy | 1 | classSynergy | dnbpony luck 1; griffin luck 1 |
| `hcfwtrophy_challenge_hc_floor_nodamage` | Untouched Chorus Trophy | 1 | classSynergy | earth luck 1; zebra luck 1 |
| `hcfwtrophy_challenge_hc_onehearted` | Single Beat Trophy | 1 | classSynergy | earth meleeDamage 1; kelpie meleeDamage 1 |
| `hcfwtrophy_challenge_hc_speedkill` | Quick Coda Trophy | 1 | classSynergy | earth meleeCooldown -0.03; mule meleeCooldown -0.04 |
| `hcfwtrophy_exploration_floor13` | First Chorus Trophy | 1 | classSynergy | kelpie speed 7; crystalpony speed 7 |
| `hcfwtrophy_exploration_floor14` | First Flatline Trophy | 1 | classSynergy | zebra meleeDamage 1; hypogriff meleeDamage 0.75 |
| `hcfwtrophy_exploration_meet_deadaircoda` | Dead Air Coda Trophy | 1 | classSynergy | seapony fireCooldown -0.05; windigo fireCooldown -0.05 |
| `hcfwtrophy_exploration_meet_flatlineburrower` | Flatline Burrower Trophy | 1 | classSynergy | diamonddog luck 1; kelpie luck 1 |
| `hcfwtrophy_exploration_meet_flatlinewraith` | The Flatline Wraith Trophy | 1 | classSynergy | batpony luck 1; changeling luck 1 |
| `hcfwtrophy_exploration_meet_hollowcantor` | The Hollow Cantor Trophy | 1 | classSynergy | diamonddog meleeCooldown -0.05; crystalpony fireCooldown -0.04 |
| `hcfwtrophy_exploration_meet_lastovertone` | The Last Overtone Trophy | 1 | classSynergy | unicorn rangedDamage 1; windigo rangedDamage 1 |
| `hcfwtrophy_exploration_meet_silencestalker` | Silence Stalker Trophy | 1 | classSynergy | batpony speed 6; changeling speed 6 |
| `hcfwtrophy_exploration_meet_subdrop` | SubdropDNB Trophy | 1 | classSynergy | dnbpony rangedDamage 0.75; griffin rangedDamage 0.5 |
| `hcfwtrophy_exploration_meet_wobbler` | WobblerDNB Trophy | 1 | classSynergy | pegasus meleeDamage 0.75; filly meleeDamage 0.75 |
| `hcfwtrophy_exploration_meet_zeroamplitude` | The Zero Amplitude Trophy | 1 | classSynergy | ponybot speed 7; engineerpony speed 6 |
| `keenmark` | Keen Mark | 1 | classSynergy | gargoyle vulnerableChance 0.04; earth meleeDamage 0.5; kirin critChance 0.04 |
| `luckytoken` | Lucky Token | 1 | classSynergy | mule luck 2; filly luck 1; engineerpony luck 1 |
| `offeringbowl` | Offering Bowl | 1 | classSynergy | mule magnetRadius 20; breezie magnetRadius 20 |
| `oldbell` | Old Bell | 1 | classSynergy | kelpie speed 8; seapony speed 8; crystalpony speed 6 |
| `packwhistle` | Pack Whistle | 1 | classSynergy | changelingqueen luck 2; engineerpony luck 1; batpony luck 1 |
| `pilgrimssandals` | undefined | 1 | classSynergy | crystalpony speed 8; seapony speed 8; mule speed 6 |
| `protostarember` | Protostar Ember | 1 | classSynergy | kirin rangedDamage 1; zebra meleeDamage 1; ponybot rangedDamage 0.5 |
| `rapidescapement` | Rapid Escapement | 1 | classSynergy | griffin fireCooldown -0.02; dnbpony fireCooldown -0.02; engineerpony fireCooldown -0.04 |
| `shrinecandle` | Shrine Candle | 1 | classSynergy | alicorn luck 1; crystalpony luck 1 |
| `sk8i_pullstone` | Pull Stone | 1 | classSynergy | crystalpony magnetRadius 25; engineerpony magnetRadius 20; diamonddog magnetRadius 20 |
| `skeletonkeyring` | Skeleton Keyring | 1 | classSynergy | mule luck 1; diamonddog luck 1 |
| `sparkfuse` | Spark Fuse | 1 | classSynergy | diamonddog bombRadiusMult 0.1; ponybot bombRadiusMult 0.08 |
| `stardustreaper` | Stardust Reaper | 1 | classSynergy | changeling onKillHealChance 0.05; batpony onKillHealChance 0.05; ponybot onKillHealChance 0.04 |
| `tidallock` | Tidal Lock | 1 | classSynergy | seapony magnetRadius 25; kelpie magnetRadius 20 |
| `vacuumshroud` | Vacuum Shroud | 1 | classSynergy | breezie dodgeChance 0.05; kirin dodgeChance 0.05; ponybot dodgeChance 0.04 |
| `vagrantcharge` | Vagrant Charge | 1 | classSynergy | mule bossDamageTakenMult -0.06; diamonddog bossDamageTakenMult -0.06 |
| `votivecoin` | Votive Coin | 1 | classSynergy | earth meleeDamage 1; alicorn rangedDamage 1; crystalpony rangedDamage 0.5 |
| `wilddraught` | Wild Draught | 1 | classSynergy | windigo freezeChance 0.05; unicorn rangedDamage 0.5 |
| `wildprism` | Wild Prism | 1 | classSynergy | diamonddog bombRadiusMult 0.12; dragon meleeDamage 0.5; ponybot bombRadiusMult 0.1 |
| `ancienttalisman` | Ancient Talisman | 2 | classSynergy | seapony speed 10; mule speed 8; diamonddog speed 8 |
| `ashenreliquary` | Ashen Reliquary | 2 | classSynergy | unicorn rangedDamage 0.5; seapony rangedDamage 0.5; earth bombRadiusMult 0.12 |
| `crackedcirclet` | Cracked Circlet | 2 | classSynergy | unicorn fireCooldown -0.05; changelingqueen fireCooldown -0.05; kelpie meleeCooldown -0.05 |
| `demolitionrig` | Demolition Rig | 2 | classSynergy | diamonddog bombRadiusMult 0.15; ponybot bombRadiusMult 0.1; engineerpony bombRadiusMult 0.1 |
| `devotedrelic` | Devoted Relic | 2 | classSynergy | kelpie meleeRange 8; unicorn boltSpeed 40; breezie boltSpeed 30 |
| `emberlantern` | Ember Lantern | 2 | classSynergy | earth speed 8; kelpie speed 8; mule speed 8 |
| `faithfulbell` | Faithful Bell | 2 | classSynergy | alicorn critChance 0.04; zebra critMultiplier 0.25; filly charmChance 0.04 |
| `forsakentalisman` | Forsaken Talisman | 2 | classSynergy | ponybot bossDamageTakenMult -0.08; kirin bossDamageTakenMult -0.08; dragon bossDamageBonus 0.05 |
| `glassbeacon` | Glass Beacon | 2 | classSynergy | mule shopDiscountBonus 0.05; diamonddog shopDiscountBonus 0.05 |
| `grislycloak` | Grisly Cloak | 2 | classSynergy | gargoyle fearChance 0.05; batpony fearChance 0.05; changedling fearChance 0.04 |
| `halegirth` | Hale Girth | 2 | classSynergy | ponybot bossDamageTakenMult -0.1; kirin bossDamageTakenMult -0.1 |
| `hallowedheart` | Hallowed Heart | 2 | classSynergy | ponybot lifestealChance 0.06; kirin dodgeChance 0.06; breezie bossDamageTakenMult -0.08 |
| `oldhorn` | Old Horn | 2 | classSynergy | mule shopDiscountBonus 0.08; crystalpony shopDiscountBonus 0.05 |
| `oldwhistle` | Old Whistle | 2 | classSynergy | earth stunChance 0.05; filly stunChance 0.04; hypogriff stunChance 0.04 |
| `radiantbell` | Radiant Bell | 2 | classSynergy | zebra stunChance 0.06; diamonddog stunChance 0.05; mule stunChance 0.05 |
| `runicamulet` | Runic Amulet | 2 | classSynergy | filly charmChance 0.06; changelingqueen charmChance 0.05; changeling charmChance 0.05 |
| `runiccloak` | Runic Cloak | 2 | classSynergy | kelpie meleeRange 8; unicorn boltSpeed 40; breezie speed 8 |
| `sacredcharge` | Sacred Charge | 2 | classSynergy | breezie speed 8; griffin fireCooldown -0.04; dnbpony fireCooldown -0.04 |
| `sanctifiedwax` | Sanctified Wax | 2 | classSynergy | alicorn bombRadiusMult 0.08; crystalpony bombRadiusMult 0.08 |
| `scavengedtalisman` | Scavenged Talisman | 2 | classSynergy | kelpie meleeRange 8; changeling onKillHealChance 0.04; batpony onKillHealChance 0.04 |
| `sharpvestment` | Sharp Vestment | 2 | classSynergy | kirin critMultiplier 0.4; breezie critChance 0.04; dragon meleeDamage 0.5 |
| `sk8i_sharpwhet` | Sharp Whetstone | 2 | classSynergy | zebra critMultiplier 0.4; seapony critMultiplier 0.3; ponybot critChance 0.05 |
| `sk8i_swiftdodge` | Swift Dodge Charm | 2 | classSynergy | breezie dodgeChance 0.05; pegasus dodgeChance 0.05; hypogriff dodgeChance 0.05 |
| `slickgauntlet` | Slick Gauntlet | 2 | classSynergy | diamonddog meleeCooldown -0.06; mule meleeCooldown -0.05; earth meleeCooldown -0.04 |
| `stormlantern` | Storm Lantern | 2 | classSynergy | ponybot bossDamageTakenMult -0.1; kirin dodgeChance 0.06; breezie dodgeChance 0.06 |
| `sunkengauntlet` | Sunken Gauntlet | 2 | classSynergy | seapony lifestealChance 0.05; kelpie lifestealChance 0.05 |
| `sunkensigil` | Sunken Sigil | 2 | classSynergy | changeling onKillHealChance 0.05; mule shopDiscountBonus 0.05 |
| `tithepurse` | Tithe Purse | 2 | classSynergy | mule shopDiscountBonus 0.05; diamonddog shopDiscountBonus 0.05; crystalpony dealDiscount 0.25 |
| `vagrantwhistle` | Vagrant Whistle | 2 | classSynergy | diamonddog bombRadiusMult 0.12; mule bombRadiusMult 0.1 |
| `vaultcrackerskit` | undefined | 2 | classSynergy | mule shopDiscountBonus 0.05; engineerpony shopDiscountBonus 0.05 |
| `beckoningvestment` | Beckoning Vestment | 3 | tradeoff | drawback: speed -6% |
| `blastmaster` | Blastmaster | 3 | tradeoff | drawback: +10% boss damage TAKEN |
| `blessedhalo` | Blessed Halo | 3 | tradeoff | drawback: -1 Luck |
| `crackedcloak` | Cracked Cloak | 3 | tradeoff | drawback: -4% dodge |
| `crackedrune` | Cracked Rune | 3 | tradeoff | drawback: -0.5 ranged damage |
| `deepgauntlet` | Deep Gauntlet | 3 | tradeoff | drawback: -5% crit chance |
| `emberwick` | Ember Wick | 3 | tradeoff | drawback: -0.5 melee AND ranged damage |
| `feintingsigil` | Feinting Sigil | 3 | tradeoff | drawback: speed -6% |
| `forsakenlocket` | Forsaken Locket | 3 | tradeoff | drawback: -4% crit chance |
| `forsakensignet` | Forsaken Signet | 3 | tradeoff | drawback: -1 Luck |
| `haleribcage` | Hale Ribcage | 3 | tradeoff | drawback: speed -5% |
| `hallowedpendant` | Hallowed Pendant | 3 | tradeoff | drawback: -4% dodge |
| `longeffigy` | Long Effigy | 3 | tradeoff | drawback: attacks/shots recharge 8% slower |
| `martyrsvow` | undefined | 3 | tradeoff | drawback: +10% boss damage TAKEN |
| `mastervaultkey` | Master Vault Key | 3 | tradeoff | drawback: speed -5% |
| `numbingmantle` | Numbing Mantle | 3 | tradeoff | drawback: attacks/shots recharge 6% slower |
| `whirringeffigy` | Whirring Effigy | 3 | tradeoff | drawback: -4% crit chance |
| `ancientcloak` | Ancient Cloak | 4 | tradeoff | drawback: +12% boss damage TAKEN |
| `asheneffigy` | Ashen Effigy | 4 | tradeoff | drawback: -0.5 ranged damage |
| `ashengauntlet` | Ashen Gauntlet | 4 | classSynergy | ponybot bossDamageTakenMult -0.05; kirin bossDamageTakenMult -0.05; dragon bossDamageBonus 0.08 |
| `crackedpendant` | Cracked Pendant | 4 | tradeoff | drawback: -1 Luck |
| `eternaldevotion` | Eternal Devotion | 4 | classSynergy | alicorn luck 2; crystalpony luck 2; changelingqueen luck 2 |
| `lopingreliquary` | Loping Reliquary | 4 | tradeoff | drawback: -0.5 melee AND ranged damage |
| `monarchbracer` | Monarch Bracer | 4 | tradeoff | drawback: -6% crit chance |
| `sleetedcirclet` | Sleeted Circlet | 4 | tradeoff | drawback: speed -8% |
