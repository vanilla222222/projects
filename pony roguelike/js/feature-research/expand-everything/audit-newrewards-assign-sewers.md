# Audit — New Rewards Assigned: 5C/6C "Sewers" Slayer t1/t2

Batch 2 of 4 covering the 528 reward-less `_t1`/`_t2` Slayer achievements.
Scope this batch: the 66 enemies tagged `floorKey:'5C'` or `'6C'` in
`js/enemies.js` — 132 achievements (`slayer_<id>_t1` and `_t2` for each).
Batch 1 (3C/4C "Gutters") was used as the exact template; every pool was
CONTINUED from batch 1's stopping offset, not restarted.

## Files changed

- `js/achievements.js` — the ONLY file edited.
  - 132 reward fields added: one per `slayer_<id>_t1` and `_t2` tier object,
    inside the 66 `addTierSet` calls of the 5C/6C section (lines ~1563-2000).
  - The 5C/6C section header comment (line ~1550) updated — it claimed
    "only the TOP rung carries a reward … Rungs 1 and 2 are flavour-only",
    which is no longer true.
  - Nothing else. `_t3` rungs, the `sb_*` superboss grid, the 3C/4C block,
    the 7C-10C blocks and every non-Slayer achievement are byte-identical.

Read-only, untouched as instructed: `js/data.js`, `js/enemies.js`,
`js/room.js`, `js/dungeon.js`, `js/stages.js`, `js/game.js`, `js/ai.js`.

## Reward-dispatch pre-check (carried over from batch 1)

`TIER_REWARD_KEYS` (line 155) still reads:

    const TIER_REWARD_KEYS = ['itemId', 'trinketId', 'familiarId', 'starId',
      'pickupKind', 'pillColorId', 'enemyId', 'classId', 'shopDiscount'];

Batch 1's fix (adding `pillColorId` / `enemyId`) is intact — verified by grep
AND by runtime: all 10 `pillColorId` and 15 `enemyId` rewards added this batch
survive onto the built achievement objects (see "reward fields surviving
addTierSet" below). `unlockAchievement`'s if/else chain still has all 7 reward
branches wired (`itemId`, `trinketId`, `familiarId`, `starId`, `pickupKind`,
`pillColorId`, `enemyId`) plus `classId` / `shopDiscount`.

## Pool usage this batch

| Pool | Source table | Pool size | Batch 1 | **Batch 2** | Cumulative | Remaining |
|---|---|---|---|---|---|---|
| Pill colors | `PILL_COLORS` (`locked:true`) | 40 | 10 | **10** | 20 (50%) | 20 |
| Enemies | `ENEMY_TYPES` (`locked:true`) | 60 | 14 | **15** | 29 (48%) | 31 |
| Trinkets | `TRINKETS` (`locked:true` + `pendingReward:true`) | 150 | 36 | **36** | 72 (48%) | 78 |
| Items | `ITEMS` (newest 150 `locked:true`) | 150 | 36 | **36** | 72 (48%) | 78 |
| Familiars | `FAMILIAR_TYPES` (newest 150 `locked:true`) | 150 | 36 | **35** | 71 (47%) | 79 |
| | | **550** | 132 | **132** | **264 (48%)** | **286** |

Target was ~10 pills / 15 enemies / 37 trinkets / 37 items / 37 familiars = 136,
which overshoots the 132 slots available, so trinkets, items and familiars each
gave up a slot (36 / 36 / 35). Every pool lands at roughly half consumed after
batches 1+2, as required; 286 rewards remain for the 264 achievements left in
batches 3-4 (7C/8C and 9C/10C).

Ids were drawn from the FRONT of each pool's *unclaimed remainder* in
table-declaration order, so batches 3-4 continue from a clean offset:
pills 20, enemies 29, trinkets 72, items 72, familiars 71.

`pendingReward:true` was left in place on all 36 trinkets used — it is the
marker that keeps them out of `SUPERBOSS_REWARDS`, not a bug.

## Verification

All checks run against the final on-disk file.

**Syntax.** `node --check js/achievements.js` passes; full sweep of all 25
files in `js/` passes with zero failures. (Intermediate `node --check` was run
mid-batch as well, after the bulk field insertion and before the audit.)

**Runtime load.** `js/data.js` + `js/enemies.js` + `js/achievements.js`
evaluated together in a `vm` context (DOM stubbed) to inspect the real
`ACHIEVEMENTS` array rather than the source text:

    achievements built:                 1698
    SUPERBOSS_REWARDS length:            300   (strict assertion intact)
    slayer *_t1/_t2 defs:                528
      ... of which now carry a reward:   264   (= batch 1's 132 + this batch's 132)
    duplicate achievement ids:             0
    reward fields surviving addTierSet: 132/132
    unresolvable new reward ids:        NONE   (every id resolves in ITEMS /
                                                TRINKETS / FAMILIAR_TYPES /
                                                ENEMY_TYPES / PILL_COLORS)

**Coverage — 132 added, none missing, none doubled.** For each of the 66
enemies the full `tiers:[...]` literal was matched against the exact expected
string (t1 field, t2 field, untouched t3 `slayertrophy_<id>`): **66/66 exact
matches**. A separate scan counted reward keys per tier object: every t1 and
every t2 has exactly ONE reward field (0 tiers with 0, 0 tiers with 2+).
Every enemy's t1 and t2 use DIFFERENT reward types.

Bare (reward-less) `{ threshold:5 }` tier openers left in the file: **132**,
distributed 7C 33 / 8C 33 / 9C 33 / 10C 33 — exactly the two future batches,
nothing from 5C/6C left behind. (One further bare `{ threshold:5 },` exists at
line ~2658 on `exploration_starrooms`, a non-Slayer ladder that is deliberately
reward-free per its own comment — out of scope, untouched.)

**Whole-file duplicate-claim proof.** Every literal `itemId` / `trinketId` /
`familiarId` / `pillColorId` / `enemyId` / `starId` / `pickupKind` / `classId`
occurrence in the ENTIRE `js/achievements.js` (batch 1's claims + this batch's
132 + the 300-entry `sb_*` superboss grid + all 264 `slayertrophy_*` top rungs
+ every character/mastery/exploration/completionist entry) was tallied into one
map keyed `<field>:<id>`:

    total distinct reward claims scanned: all matches, zero keys with count > 1
    DUPLICATES: NONE

Note on the documented exception: the 20 `completionist_<class>` achievements
do all award `itemId:'championscrown'`, but they are built by a loop over
`CLASSES`, so the id appears **once** as a literal (line 377) and the scan
never sees it as a duplicate. Confirmed as expected design; not touched.

**Every id exists as a `locked:true` entry in its source table.** All 132 new
ids were re-checked against freshly re-extracted pools:
`ITEMS` NEWREWARDS block (150), `TRINKETS` NEWREWARDS block (150),
`FAMILIAR_TYPES` NEWREWARDS block (150), `PILL_COLORS` `locked:true` (40),
`ENEMY_TYPES` `locked:true` (60). Result: **0 ids outside their pool**.

## Deviations

1. **`zigguratbulk` false positive, caught and fixed before the audit.** The
   first pass at extracting the locked-enemy pool matched `locked:true` inside
   the "ACHIEVEMENT-LOCKED CREATURES (60)" section-header *comment*
   (js/enemies.js line ~1721), which attributed it to the entry immediately
   above it, `zigguratbulk` — an ordinary unlocked 10C enemy. It was briefly
   assigned to `slayer_scaledbulk_t2` and then replaced with `nullshade`, the
   first genuinely-unclaimed entry of the real 60-strong pool. Final file
   contains no reference to `zigguratbulk`; the pool extraction was redone with
   a same-physical-line match and independently re-verified at 60 entries.
2. Familiars took 35 rather than 37 (and trinkets/items 36 rather than 37)
   purely because 10 + 15 + 37 + 37 + 37 = 136 > 132 slots. Cumulative usage is
   still within one entry of the 50% mark for every pool.
3. The 5C/6C section-header comment was edited (a comment, not logic) because
   it asserted rungs 1-2 are flavour-only, which this batch invalidates. Same
   treatment batch 1 gave the 3C/4C header.

## Assignment table (66 enemies × 2 rungs)

t3 is unchanged on every row (`itemId:'slayertrophy_<enemy>'`).

| Enemy | Floor | t1 (5 kills) | t2 (20 kills) |
|---|---|---|---|
| `tunnelrat` | 5C | `itemId:sunkenreliquary` | `trinketId:parchedsipper` |
| `sewerflit` | 5C | `trinketId:parchedfang` | `itemId:sunkenmantle` |
| `methanepod` | 5C | `familiarId:bogburr` | `itemId:couponcloak` |
| `corrodedplate` | 5C | `familiarId:marbleknuckle` | `trinketId:wakewreath` |
| `sludgehog` | 5C | `itemId:woveneffigy` | `trinketId:carrionfeather` |
| `effluentvalve` | 5C | `itemId:hallowedrelic` | `familiarId:prismnut` |
| `pipeleaper` | 5C | `trinketId:scavengedration` | `familiarId:cinderhusk` |
| `toxicspitter` | 5C | `trinketId:tainteddrop` | `itemId:crackedgauntlet` |
| `wastemortar` | 5C | `familiarId:onyxbeetle` | `itemId:ashencrown` |
| `sewereel` | 5C | `familiarId:runicshard` | `trinketId:septicfang` |
| `manholewatcher` | 5C | `itemId:hallowedgauntlet` | `trinketId:blightedampule` |
| `fumeswirl` | 5C | `itemId:quickrelic` | `familiarId:thornmite` |
| `grimeborer` | 5C | `trinketId:concussiveslug` | `familiarId:indigosnail` |
| `sewermaggots` | 5C | `trinketId:leadenchime` | `itemId:weatheredcrown` |
| `bilesack` | 5C | `familiarId:saffronnut` | `itemId:weatheredeffigy` |
| `vermincaller` | 5C | `familiarId:tidalknuckle` | `trinketId:ringinghammer` |
| `slimemender` | 5C | `itemId:sunkentalisman` | `trinketId:adoringpetal` |
| `outfallwarden` | 5C | `itemId:fondsignet` | `familiarId:frostknuckle` |
| `conduitmarksman` | 5C | `trinketId:velvetposy` | `familiarId:gildedpip` |
| `siphonblink` | 5C | `trinketId:fondribbon` | `itemId:ashenrune` |
| `drainlurker` | 5C | `familiarId:solarshard` | `itemId:splittingrelic` |
| `effluenthulk` | 5C | `familiarId:russetsnail` | `trinketId:rimedbead` |
| `scumrunner` | 5C | `itemId:ghostingcharm` | `trinketId:rimedlattice` |
| `corrosionspitter` | 5C | `itemId:fortunateamulet` | `familiarId:emberbat` |
| `gasbladder` | 5C | `trinketId:frostbitflake` | `familiarId:quartzsprite` |
| `sewerbat` | 5C | `trinketId:keeningrattle` | `itemId:greasedreliquary` |
| `ironhog` | 5C | `familiarId:feraldrake` | `itemId:reaperreliquary` |
| `offalmortar` | 5C | `familiarId:mossylobber` | `trinketId:shudderingmask` |
| `sludgedelver` | 5C | `itemId:wovensignet` | `trinketId:pallidwail` |
| `vaporcircler` | 5C | `itemId:howlingreliquary` | `familiarId:prismspitter` |
| `pipewatcher` | 5C | `trinketId:hummingstone` | `familiarId:verdantdrake` |
| `overflowshade` | 5C | `trinketId:graspingcoil` | `itemId:ogrelocket` |
| `scaledbulk` | 5C | `familiarId:lichenhornet` | `enemyId:nullshade` |
| `mainsrat` | 6C | `trinketId:graspingstone` | `itemId:titanlocket` |
| `miasmaflit` | 6C | `familiarId:cobalthornet` | `enemyId:slagmarksman` |
| `sourgaspod` | 6C | `trinketId:fumingkeg` | `itemId:fourleafrelic` |
| `slagplate` | 6C | `familiarId:meadowfinch` | `enemyId:emberwarden` |
| `effluenthog` | 6C | `trinketId:scatteringhorn` | `itemId:hallowedamulet` |
| `runoffvalve` | 6C | `familiarId:claylark` | `enemyId:eclipseherald` |
| `conduitleaper` | 6C | `trinketId:blastwidewick` | `itemId:shudderinglocket` |
| `acidspitter` | 6C | `familiarId:verdantfly` | `enemyId:galewraith` |
| `slurrymortar` | 6C | `trinketId:ghostingcloak` | `itemId:wovenvestment` |
| `drainserpent` | 6C | `familiarId:quartzgnat` | `enemyId:stormsinger` |
| `sluicewatcher` | 6C | `itemId:beckoningcirclet` | `pillColorId:sunstone` |
| `toxinswirl` | 6C | `trinketId:fainthem` | `familiarId:fengnat` |
| `muckdriller` | 6C | `pillColorId:tourmaline` | `enemyId:thunderhusk` |
| `drainmites` | 6C | `itemId:hallowedbracer` | `trinketId:shiftingveil` |
| `tarsack` | 6C | `enemyId:orchidlurker` | `familiarId:coppergnat` |
| `broodtender` | 6C | `pillColorId:cinnabar` | `itemId:thirstycirclet` |
| `biofilmmender` | 6C | `familiarId:lunardrake` | `trinketId:splittingrift` |
| `sluicewarden` | 6C | `enemyId:plumescreamer` | `pillColorId:verdigris` |
| `pipelinemarksman` | 6C | `trinketId:deeprift` | `itemId:couponvestment` |
| `backwashblink` | 6C | `familiarId:rimepuppet` | `enemyId:vinemender` |
| `sumpstalker` | 6C | `itemId:wovenpendant` | `pillColorId:saffron` |
| `sludgebrute` | 6C | `trinketId:pennychit` | `familiarId:ivoryhornet` |
| `toxinskitter` | 6C | `pillColorId:paprika` | `enemyId:idolcircler` |
| `bilespitter` | 6C | `itemId:wovencloak` | `trinketId:thriftledger` |
| `methanedrone` | 6C | `enemyId:nautilusdrifter` | `familiarId:embermoth` |
| `drainmoth` | 6C | `pillColorId:plum` | `itemId:blastcapreliquary` |
| `pistonram` | 6C | `familiarId:quartzwren` | `trinketId:signedcontract` |
| `scourmortar` | 6C | `enemyId:anglerlantern` | `pillColorId:mulberry` |
| `greaseborer` | 6C | `trinketId:threadingbodkin` | `itemId:ironhidevest` |
| `effluenteddy` | 6C | `familiarId:solarwren` | `enemyId:kelpweaver` |
| `outfallwatcher` | 6C | `itemId:threadingcrown` | `pillColorId:cherry` |
| `siphonshade` | 6C | `trinketId:trackingwhisker` | `familiarId:tidalbat` |
| `ironbulk` | 6C | `pillColorId:apricot` | `enemyId:pearlwarden` |