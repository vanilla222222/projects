# Rebalance — layered attacks, items batch 3 (final)

Scope: `js/data.js` only. No new style verbs added (Task 2 declined — see below).
Pure addition: none of the 35 previously-converted items and none of the 13 existing
handlers were touched.

## Selection / safety method

Candidates were generated programmatically: every `type:'passive'` entry in `ITEM_LIST`
with no existing `attackLayer`, whose id appears **only** inside `recalcPlayerStats`
(`js/items.js` lines 1–990) and **nowhere** in `applyPassiveEffect`/the rest of
`js/items.js` (lines 991+) or anywhere in `js/combat.js`. That set was then narrowed by
desc shape (`desc` starts with `+`, one or two plain stat sentences — no bespoke
mechanics) and by combat-suitable name/icon flavor. `mirrorshard`, all `type:'active'`
items, and every already-converted id were excluded by construction.

## Style-spread reasoning

Distribution before this batch was 3 each for ten styles, 2 for `scatterVolley` and
`frostShatter`, 1 for `impactBurst`. Quotas were set to close that gap: +4 `impactBurst`,
+3 `frostShatter`, +3 `scatterVolley`, +3 for each of the other ten. Final spread is
6/6/6/6/6/6/6/6/6/6 and 5/5/5 — flat across all 13 styles at 75 items total.

Params were scaled off the item's own `quality`, staying inside the numeric bands the
batch-1/batch-2 conversions already established per style (e.g. `groundSlam` 55–95
radius / 0.25–0.6 power; `chargeNova` every 4–10; `frostShatter` chance 0.15–0.35;
`orbitBlades` 2 blades / 42–46 radius at q1, 3 blades / 56 radius at q4).

## Items converted (40)

| id | q | style | what changed |
|---|---|---|---|
| ironshoes | 1 | groundSlam | radius 55, power 0.25 — weakest ground crack |
| wrathfulhorn | 2 | groundSlam | radius 70, power 0.4 |
| graniteknuckles | 2 | groundSlam | radius 72, power 0.4 |
| gildedhoof | 1 | knockbackPulse | strength 4 |
| bouldershoulder | 1 | knockbackPulse | strength 5 |
| rubblerunner | 2 | knockbackPulse | strength 6 |
| voidcharm | 1 | impactBurst | radius 45, power 0.25 |
| demolitionistsbadge | 1 | impactBurst | radius 48, power 0.28 |
| rubblekingscrown | 2 | impactBurst | radius 58, power 0.35 |
| blastresistantvest | 2 | impactBurst | radius 60, power 0.38 |
| bossbane | 1 | chargeNova | every 10, radius 65, power 0.6 |
| damnedsoul | 1 | chargeNova | every 10, radius 70, power 0.65 |
| hoardersblessing | 3 | chargeNova | every 6, radius 105, power 1.35 |
| embercharm | 1 | scatterVolley | 2 bolts, spread 1.0, power 0.25 |
| dragonfirecore | 2 | scatterVolley | 2 bolts, spread 0.9, power 0.32 |
| insecticidevial | 3 | scatterVolley | 3 bolts, spread 1.0, power 0.38 |
| thunderfragment | 1 | chainLightning | range 95, power 0.3 |
| shockcollar | 1 | chainLightning | range 100, power 0.32 |
| stormlocket | 1 | chainLightning | range 105, power 0.35 |
| frostbite | 1 | frostShatter | chance 0.15, duration 1.0, power 0.25 |
| stormseal | 1 | frostShatter | chance 0.16, duration 1.1, power 0.28 |
| frostedbell | 2 | frostShatter | chance 0.22, duration 1.4, power 0.38 |
| bloodoffering | 1 | bloodPact | hpCost 0.1, power 0.35 |
| demonhoof | 1 | bloodPact | hpCost 0.1, power 0.38 |
| undefeatedchampion | 2 | bloodPact | hpCost 0.1, power 0.5 |
| eagleeye | 1 | mirrorConvert | power 0.25 |
| radiantglove | 1 | mirrorConvert | power 0.28 |
| championssash | 2 | mirrorConvert | power 0.4 |
| velvetcirclet | 1 | echoShot | delay 0.3, power 0.3 |
| sacredlight | 1 | echoShot | delay 0.3, power 0.32 |
| midasfingertip | 3 | echoShot | delay 0.22, power 0.5 |
| jadequill | 1 | ricochetBolt | 1 bounce |
| sapphiretoken | 1 | ricochetBolt | 1 bounce |
| gamblerscoin | 2 | ricochetBolt | 1 bounce |
| giantslayersbelt | 1 | orbitBlades | 2 blades, radius 42, dmg 0.35 |
| gildedseal | 1 | orbitBlades | 2 blades, radius 44, dmg 0.38 |
| championscrown | 4 | orbitBlades | 3 blades, radius 56, dmg 0.65 — strongest orbit |
| swarmbreaker | 1 | onKillFragments | 2 fragments, power 0.22 |
| trophyrack | 1 | onKillFragments | 2 fragments, power 0.25 |
| curatorspendant | 3 | onKillFragments | 3 fragments, power 0.42 |

Each of the 40 kept its original stat sentence; one plain tooltip sentence describing the
new layer was appended to `desc`.

## New verbs

None. Task 2 is optional, and the batch's stated priority was evening out the spread
across the existing 13. A 14th–16th verb added now would either land with zero items
carrying it, or force items away from the under-represented styles the quotas were built
to fill. `js/attackStyles.js` is unmodified.

## Totals

- Batch 1: 10 items
- Batch 2: 25 items
- Batch 3: 40 items
- **Total: 75 items carrying `attackLayer`, across 13 style verbs.**

## Verification output

`node --check js/data.js` → pass. `node --check js/attackStyles.js` → pass.

```
syntax OK
total items with attackLayer: 75
total handler names: 13 echoShot,mirrorConvert,groundSlam,chargeNova,ricochetBolt,orbitBlades,scatterVolley,chainLightning,knockbackPulse,onKillFragments,bloodPact,frostShatter,impactBurst
orphaned styles: 0 (must be 0)
ITEM_LIST length: 1075 (must still be 1075 — you are only editing existing entries), dupe ids: 0 (must be 0)
spread: {"groundSlam":6,"bloodPact":6,"chargeNova":6,"frostShatter":5,"impactBurst":5,"orbitBlades":6,"knockbackPulse":6,"ricochetBolt":6,"mirrorConvert":6,"scatterVolley":5,"echoShot":6,"onKillFragments":6,"chainLightning":6}
```
