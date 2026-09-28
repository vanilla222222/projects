# Layered attacks — items batch 2 (25 conversions + 3 new verbs)

Files touched: `js/data.js`, `js/attackStyles.js` only. Pure addition — none of the
existing 10 converted items or 10 verb handlers were modified.

## Task 2 — 3 new style verbs

All three follow the header comment's split rule (cast-time = reacts to "you
attacked" and can't depend on knowing individual hits; hit-time = needs the one
specific enemy in `ctx.hits[0]`), and reuse only existing engine primitives
(`Enemy.takeDamage`, `Projectile`, `handleEnemyDeath`, `Sound.play`, `FloatText`,
`bumpStat`).

| verb | table | why it was needed |
|---|---|---|
| `scatterVolley` | `CAST_ATTACK_STYLES` | "Barrage Core" / "Double Barrel" are shotgun-flavoured; none of the 10 existing verbs sprays a *fan* of extra bolts. Fires once per attack EVENT, scales off `meleeDamage` on a melee trigger and `rangedDamage` otherwise. Spawned bolts are untagged (same as `onKillFragments`' shards) so they can't re-trigger layers. |
| `frostShatter` | `HIT_ATTACK_STYLES` | Ice-themed items ("Frozen Thorn", "Cold Heart") had no fitting verb. On a landed hit it chills the target via the **already-existing** `enemy.freezeTimer` field (same boss-immunity rule + `bumpStat('enemiesFrozen')` + `Sound.play('statusFreeze')` that `applyOnHitStatuses` and `familiars.js` already use — no new cross-file field), and an already-frozen target shatters for bonus damage on that same hit instead. |
| `impactBurst` | `HIT_ATTACK_STYLES` | Distinct from `chainLightning`: that arcs to exactly one extra enemy, this splashes *every* enemy packed around the struck target. Needs the specific victim as its epicentre, hence hit-time. |

## Task 1 — 25 items converted

Every one was a pure stat-bonus passive whose id appears **only** as a
`player.passives.<id>` count in `recalcPlayerStats`'s stat sums (verified by
grepping `js/items.js` + `js/combat.js` — the only other hits were
`achievements.js` `itemId:` unlock references, which are inert here). No item
with a bespoke `if (item.id === '…')` branch was touched; `mirrorshard` was left
alone.

| id | quality | style | what changed |
|---|---|---|---|
| ironwill | 1 | groundSlam | kept +1 dmg; melee swings now stomp a small ring (r58, 0.3x) |
| sentrywreckersfist | 4 | groundSlam | kept +2 dmg/+8% dodge; wide hard ring (r95, 0.6x) |
| bruiserswraps | 1 | knockbackPulse | kept +1 dmg; hits shove target back (str 4) |
| warhorn | 3 | knockbackPulse | kept +2 dmg; hits blast target back (str 8) |
| slayerssigil | 1 | chainLightning | kept +1 dmg; weak arc to 1 enemy (r90, 0.3x) |
| voltaiccore | 4 | chainLightning | kept +2 dmg/+5% crit; strong long arc (r150, 0.7x) |
| overchargedbattery | 1 | chargeNova | kept +1 dmg; every 9th attack, small shock (r70, 0.7x) |
| detonationspecialistbadge | 4 | chargeNova | kept +2 dmg/+30% bomb; every 4th attack, big blast (r120, 1.6x) |
| shadowring | 2 | orbitBlades | kept +2 Luck; 2 shadow blades orbit (r46, 0.45x) |
| arenachampionsbelt | 4 | orbitBlades | kept +2 dmg/+10% speed; 3 heavy blades (r54, 0.6x) |
| cinderclaw | 1 | onKillFragments | kept +1 dmg; kills scatter 2 embers (0.25x) |
| executionersmark | 3 | onKillFragments | kept +2 dmg; kills scatter 4 shards (0.5x) |
| assassinsedge | 1 | echoShot | kept +5% crit; weak delayed echo (0.3s, 0.3x) |
| executionersfocus | 3 | echoShot | kept +8% crit/crit dmg; strong echo (0.2s, 0.6x) |
| razorwing | 1 | mirrorConvert | kept crit dmg; weak cross-style hit (0.25x) |
| haloedcrown | 2 | mirrorConvert | kept +1 dmg/+5% crit; cross-style hit (0.45x) |
| endlessquiver | 1 | ricochetBolt | kept +1 pierce; bolts bounce once |
| siegebreaker | 3 | ricochetBolt | kept +2 dmg; bolts bounce twice |
| hollowsoul | 2 | bloodPact | kept +2 dmg/-1 Luck; spend HP for bonus dmg (0.6x) |
| cursedhalo | 2 | bloodPact | kept +1 dmg/+1 Luck; spend HP for bonus dmg (0.55x) |
| frozenthorn | 1 | frostShatter | kept +6% freeze; 15% chill / 0.25x shatter |
| coldheart | 4 | frostShatter | kept luck-scaled freeze; 35% chill / 0.6x shatter |
| ironhoofgauntlet | 4 | impactBurst | kept +2 dmg/+10% speed; splash around target (r70, 0.5x) |
| barragecore | 3 | scatterVolley | kept fire rate/pierce; +2 bolts in a fan (0.35x) |
| doublebarrel | 3 | scatterVolley | kept extra bolt; +2 bolts in a wide fan (0.3x) |

Style spread (all 35 items): mirrorConvert 3, chainLightning 3, onKillFragments 3,
groundSlam 3, echoShot 3, ricochetBolt 3, chargeNova 3, bloodPact 3, orbitBlades 3,
knockbackPulse 3, frostShatter 2, scatterVolley 2, impactBurst 1.

## Verification

1. `node --check js/data.js` — pass. `node --check js/attackStyles.js` — pass.

2. Sandbox check output:

```
total items with attackLayer: 35 (should be 10 + however many you added)
 - vampfang -> bloodPact
 - stormbarrel -> chargeNova
 - coldheart -> frostShatter
 - warhorn -> knockbackPulse
 - ironwill -> groundSlam
 - razorwing -> mirrorConvert
 - doublebarrel -> scatterVolley
 - spiderring -> orbitBlades
 - haloedcrown -> mirrorConvert
 - crystalfang -> mirrorConvert
 - hollowsoul -> bloodPact
 - cinderclaw -> onKillFragments
 - cursedhalo -> bloodPact
 - siegebreaker -> ricochetBolt
 - chainreaction -> chainLightning
 - slayerssigil -> chainLightning
 - executionersmark -> onKillFragments
 - dragonshoardshard -> onKillFragments
 - worldbreakergauntlet -> groundSlam
 - endlessquiver -> ricochetBolt
 - barragecore -> scatterVolley
 - assassinsedge -> echoShot
 - executionersfocus -> echoShot
 - deathsprecisionblade -> echoShot
 - phoenixfeathershard -> knockbackPulse
 - overchargedbattery -> chargeNova
 - voltaiccore -> chainLightning
 - bruiserswraps -> knockbackPulse
 - ironhoofgauntlet -> impactBurst
 - arenachampionsbelt -> orbitBlades
 - sentrywreckersfist -> groundSlam
 - detonationspecialistbadge -> chargeNova
 - windsweptcloak -> ricochetBolt
 - frozenthorn -> frostShatter
 - shadowring -> orbitBlades
```

35 = 10 existing + 25 new.

3. Style-name cross-check — 13 distinct style strings used in data.js, 13 handlers
defined in attackStyles.js, exact 1:1 match, no typos:

```
handlers: echoShot mirrorConvert groundSlam chargeNova ricochetBolt orbitBlades
          scatterVolley | chainLightning knockbackPulse onKillFragments bloodPact
          frostShatter impactBurst
used:     bloodPact chainLightning chargeNova echoShot frostShatter groundSlam
          impactBurst knockbackPulse mirrorConvert onKillFragments orbitBlades
          ricochetBolt scatterVolley
```

4. Duplicate ids: `ITEM_LIST length 1075, duplicate ids: 0` — identical length to
the pre-edit baseline (1075), confirming only existing entries were extended.
