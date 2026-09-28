# Audit — New Rewards Assigned: 3C/4C "Gutters" Slayer t1/t2

Batch 1 of 4 covering the 528 reward-less `_t1`/`_t2` Slayer achievements.
Scope this batch: the 66 enemies tagged `floorKey:'3C'` or `'4C'` in
`js/enemies.js` — 132 achievements.

## Files changed

- `js/achievements.js` — the ONLY file edited.
  - 132 reward fields added (one per `slayer_<id>_t1` and `_t2` tier object,
    lines ~1282-1720, inside the 66 `addTierSet` calls for 3C/4C enemies).
  - `TIER_REWARD_KEYS` (line ~155) extended with `'pillColorId'` and
    `'enemyId'` — **required bug fix, see Deviations**.
  - Two comment blocks refreshed (the `addTierSet` doc-comment's reward-field
    list, and the 3C/4C section header that claimed rungs 1-2 are flavour-only).

Read-only, untouched as instructed: `js/data.js`, `js/enemies.js`,
`js/room.js`, `js/dungeon.js`, `js/stages.js`, `js/game.js`, `js/ai.js`.

## Pool usage this batch

Budget target was ~1/4 of each pool so the remaining 3 batches don't starve.
Total pool across the 5 tables is 550 rewards for 528 achievements, so the
per-batch scale is 132/550 = 0.24.

| Pool | Source table | Pool size | Used this batch | Target (~1/4) | Remaining |
|---|---|---|---|---|---|
| Pill colors | `PILL_COLORS` (`locked:true`) | 40 | **10** | 10 | 30 |
| Enemies | `ENEMY_TYPES` (`locked:true`) | 60 | **14** | 15 | 46 |
| Trinkets | `TRINKETS` (`locked:true` + `pendingReward:true`) | 150 | **36** | 37 | 114 |
| Items | `ITEMS` (newest 150 `locked:true`) | 150 | **36** | 37 | 114 |
| Familiars | `FAMILIAR_TYPES` (newest 150 `locked:true`) | 150 | **36** | 37 | 114 |
| | | **550** | **132** | 136 | **418** |

The 136 in the target column overshoots the 132 slots available, so enemies,
trinkets, items and familiars each gave up one slot. Every pool is still on
pace: 418 rewards remain for the 396 achievements left in batches 2-4.

Ids were drawn from the FRONT of each pool in table-declaration order, so
batches 2-4 continue from a clean offset (pills 10, enemies 14, trinkets 36,
items 36, familiars 36).

`pendingReward:true` was left in place on all 36 trinkets used — it is the
marker that keeps them out of `SUPERBOSS_REWARDS` via that pool's
`&& !t.pendingReward` filter, not a bug.

## Verification

All checks run against the final on-disk file.

**Syntax.** `node --check` passes on `js/achievements.js` and on every other
file in `js/` (full 25-file sweep, zero failures).

**Runtime load.** `js/data.js` + `js/enemies.js` + `js/achievements.js`
evaluated together in a `vm` context (DOM stubbed) to inspect the real
`ACHIEVEMENTS` array rather than the source text:

    achievements built:       1698
    SUPERBOSS_REWARDS length: 300   (strict assertion intact — pool uncorrupted)
    slayer *_t1/_t2 defs:     528
      ... now carrying a reward: 132
      breakdown: trinketId 36, itemId 36, familiarId 36, enemyId 14, pillColorId 10

This is the load-bearing check: it proves the rewards survive `addTierSet`'s
`TIER_REWARD_KEYS` copy loop and land on the actual achievement defs, not
just in the source.

**Completeness — 132/132.** Each of the 66 enemies' `addTierSet` blocks was
re-parsed and its three tier literals inspected individually:

- 66/66 ladders found, each with exactly 3 tiers.
- t1 and t2: **exactly one** of the 7 reward field types present on each.
  Zero missing, zero doubled. (bad list: empty)
- t3: all 66 still `{ threshold:50, itemId:'slayertrophy_<id>' }`, unmodified.
- Every enemy's t1 type differs from its t2 type — enforced at generation and
  re-confirmed from the file.

**Duplicate-reward proof — WHOLE file.** Every
`itemId`/`trinketId`/`familiarId`/`starId`/`pillColorId`/`enemyId` string
literal in `js/achievements.js` was extracted and counted, including the
300-entry `sb_*` superboss grid, the 264 `slayertrophy_*` t3 rewards, the
Mastery/Misc/Character/Exploration/Challenge entries, and the 132 new claims:

    total reward-id occurrences: 941
    distinct reward ids:         941
    ids appearing more than once:  0

941 distinct ids from 941 occurrences — no value is granted twice anywhere in
the file. (Baseline before this batch was 809 distinct; 809 + 132 = 941, so
every one of the 132 new claims is genuinely new.)

**Source-table existence.** All 132 ids were checked back against the exact
locked pools harvested from the evaluated `js/data.js`/`js/enemies.js`
objects (not a text grep): 0 ids missing from their source pool, 0 typos. Pool
membership was itself verified at harvest time — pills 40 `locked:true` of 100,
enemies 60 of 679, trinkets 150 `locked:true`+`pendingReward:true`, items
newest 150 (all confirmed `locked:true`), familiars newest 150 (all confirmed
`locked:true`). A pre-flight grep confirmed 0/40, 0/60, 0/150, 0/150, 0/150
of these were already claimed by any existing achievement.

**Out-of-scope untouched.** Reward-less `{ threshold:5 }, { threshold:20 }`
ladder pairs remaining in the file: **198** = 264 C-branch ladders - 66 done.
The 5C-10C batches are exactly as they were.

## Deviations

**1. `TIER_REWARD_KEYS` had to be extended (real bug, fixed).**
`unlockAchievement` grew `pillColorId` and `enemyId` branches in a recent
dispatch, but `addTierSet`'s copy loop —

    for (const key of TIER_REWARD_KEYS) if (tier[key] != null) def[key] = tier[key];

— was never updated to match, so its whitelist still read
`['itemId','trinketId','familiarId','starId','pickupKind','classId','shopDiscount']`.
Any `pillColorId`/`enemyId` placed on a tier would have been **silently
dropped**: the achievement would build fine, unlock fine, and grant nothing.
Both keys were added to the array. This is inside `js/achievements.js` and was
unavoidable — 24 of this batch's 132 rewards (and every pill/enemy reward in
batches 2-4) are dead without it. Nothing else about `addTierSet` changed, and
the existing 7 keys keep their order and behaviour.

**2. Batch split 10/14/36/36/36 instead of the suggested 10/15/37/37/37.**
The suggested numbers sum to 136, four more than the 132 slots this batch has.
Trimmed one each from enemies, trinkets, items and familiars; pills kept all 10.
Still comfortably proportional.

**3. 70 enemies carry `floorKey:'3C'`/`'4C'`, not 66.** The extra four —
`sumppike`, `effluentmite`, `culvertlobber`, `pipewhistle` — are
`locked:true` members of the 60-entry ENEMY_TYPES reward pool itself, and have
no Slayer ladder of their own. Excluding them gives exactly the expected 66
ladders / 132 achievements. They remain available as rewards (none of the 14
enemy rewards used this batch happens to be one of them, but they are eligible
for later batches).

## Assignments

| Enemy | `_t1` reward | `_t2` reward |
|---|---|---|
| `gutterrat` | `trinket`: `heavywedge` | `item`: `ashensigil` |
| `runoffwisp` | `familiar`: `russetchit` | `trinket`: `irontooth` |
| `gasbloat` | `item`: `gildedcrown` | `familiar`: `boghusk` |
| `grateguard` | `trinket`: `roughspur` | `item`: `weatheredidol` |
| `silthog` | `familiar`: `claynut` | `trinket`: `brutalrivet` |
| `drainspout` | `item`: `runicrelic` | `familiar`: `indigoscarab` |
| `gutterhopper` | `trinket`: `brutalcleat` | `item`: `ashentalisman` |
| `sewerspitter` | `familiar`: `meadowscarab` | `trinket`: `nimbleribbon` |
| `sludgemortar` | `item`: `fortunaterelic` | `familiar`: `brightbead` |
| `eelweaver` | `trinket`: `dartingribbon` | `item`: `heavyamulet` |
| `gratewatcher` | `familiar`: `tidalhusk` | `trinket`: `fleetquill` |
| `gnatswirl` | `item`: `crackedamulet` | `familiar`: `umbercog` |
| `mudburrower` | `trinket`: `swiftlace` | `item`: `ashencloak` |
| `gutterlarvae` | `familiar`: `indigomite` | `trinket`: `skimmingwisp` |
| `bloatsack` | `item`: `runicpendant` | `familiar`: `sootybramble` |
| `ratcaller` | `trinket`: `fourleafpip` | `item`: `airymedallion` |
| `algaemender` | `familiar`: `emberscarab` | `trinket`: `fourleafdram` |
| `drainwarden` | `item`: `bluntsignet` | `familiar`: `marblecrab` |
| `pipemarksman` | `trinket`: `auspiciouschit` | `item`: `widecirclet` |
| `overflowblink` | `familiar`: `rimesnail` | `trinket`: `serendipitysprig` |
| `sumplurker` | `item`: `chippedamulet` | `familiar`: `velvettick` |
| `sludgehulk` | `trinket`: `auspiciousknot` | `item`: `hallowedmantle` |
| `drainskitter` | `familiar`: `meadowcog` | `trinket`: `exactingsight` |
| `brinespitter` | `item`: `weatheredcharm` | `familiar`: `sablewhorl` |
| `fumedrone` | `trinket`: `sharpedge` | `item`: `weatheredgauntlet` |
| `gutterswoop` | `familiar`: `prismknuckle` | `trinket`: `keenfacet` |
| `rustcharger` | `item`: `scatteringeffigy` | `familiar`: `saffronmite` |
| `flotsamlobber` | `trinket`: `exactingfacet` | `item`: `wispinggauntlet` |
| `gritdelver` | `familiar`: `cindersnail` | `trinket`: `hairlinesplinter` |
| `driftcircler` | `item`: `pallidcirclet` | `familiar`: `rimetick` |
| `drainwatcher` | `trinket`: `clickingratchet` | `item`: `ancientrune` |
| `culvertmarksman` | `familiar`: `lunarcrab` | `trinket`: `snappytrigger` |
| `puddleblink` | `item`: `pullingsignet` | `familiar`: `opalknuckle` |
| `sewerrat` | `enemy`: `ossuarysaint` | `trinket`: `quickratchet` |
| `fetidflier` | `item`: `leviathanpendant` | `familiar`: `verdantshard` |
| `rotbladder` | `enemy`: `reliquarymite` | `trinket`: `clickingescapement` |
| `rustplate` | `item`: `runictalisman` | `familiar`: `cobaltsprocket` |
| `brinehog` | `enemy`: `pallbearer` | `trinket`: `longglass` |
| `standpipeturret` | `item`: `hallowedcharm` | `familiar`: `coralcog` |
| `culvertleaper` | `enemy`: `candlewake` | `trinket`: `outreachglass` |
| `bilgespitter` | `item`: `hallowedlocket` | `familiar`: `stormbeetle` |
| `refusemortar` | `pill`: `obsidian` | `enemy`: `mistlestag` |
| `bilgeweaver` | `trinket`: `horizonspan` | `item`: `breezylocket` |
| `culvertwatcher` | `familiar`: `bognut` | `pill`: `quartz` |
| `carrionswirl` | `enemy`: `fungalchoir` | `trinket`: `leviathanbane` |
| `muckborer` | `item`: `viciousrune` | `familiar`: `sablepip` |
| `rotgrubs` | `pill`: `garnet` | `enemy`: `dewdancer` |
| `rotsack` | `trinket`: `behemothtag` | `item`: `overlookcrown` |
| `broodcaller` | `familiar`: `sablehusk` | `pill`: `amethyst` |
| `muckmender` | `enemy`: `heartseedling` | `trinket`: `ogretag` |
| `cisternwarden` | `item`: `weatheredreliquary` | `familiar`: `tidalchit` |
| `outfallmarksman` | `pill`: `citrine` | `enemy`: `glasswake` |
| `backflowblink` | `trinket`: `colossussigil` | `item`: `woundcharm` |
| `cisternlurker` | `familiar`: `meadowpebble` | `pill`: `turquoise` |
| `floodbrute` | `enemy`: `mirageoracle` | `trinket`: `redoubtslab` |
| `scumskitter` | `item`: `tollinglocket` | `familiar`: `cindersprocket` |
| `effluentspitter` | `pill`: `sapphire` | `enemy`: `gildedscarab` |
| `miasmadrone` | `trinket`: `redoubtrampart` | `item`: `gildedeffigy` |
| `gnatveil` | `familiar`: `driftknuckle` | `pill`: `aquamarine` |
| `tidecharger` | `enemy`: `sunveilmoth` | `trinket`: `wardingrampart` |
| `weirmortar` | `item`: `ashensignet` | `familiar`: `palehusk` |
| `drownedhulk` | `pill`: `malachite` | `enemy`: `cinderchoir` |
| `eddycircler` | `trinket`: `thirstyfang` | `item`: `ashenrelic` |
| `overflowwatcher` | `familiar`: `lunarchit` | `pill`: `moonstone` |
| `siltmarksman` | `enemy`: `pyrecircler` | `trinket`: `leechingfang` |
| `cisternblink` | `item`: `forsakenamulet` | `familiar`: `umbercrab` |
