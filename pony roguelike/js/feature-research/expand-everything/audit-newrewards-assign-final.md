# Audit — New Rewards Assigned: 9C/10C Slayer + all remaining reward-less achievements

**FINAL batch** of the reward-wiring project (batches 1-3 covered 3C/4C, 5C/6C,
7C/8C). Two parts: Part A wires the last 132 Slayer `_t1`/`_t2` rungs
(66 enemies on floors 9C/10C), Part B wires every remaining reward-less
achievement anywhere in the file (19 of them, across Characters /
Miscellaneous / Exploration / Challenge).

## Files changed

- `js/achievements.js` — the **ONLY** file edited.
  - **Part A:** 132 reward fields added, one per `slayer_<id>_t1` and `_t2`
    tier object, inside the 66 `addTierSet` calls of the
    `C-branch DEEP RAINFOREST Slayer ladders (floors 9C + 10C)` section
    (lines ~2104-2372). No `_t3` rung was touched — all 66 keep their
    pre-existing `itemId:'slayertrophy_<id>'`.
  - **Part B:** 19 reward fields added across 6 sites (3 `addAchievement`
    calls in section 1b, `starseeker`/`stargazer`/`rerollregular` in
    section 8b, and 4 `addTierSet` ladders).
  - 6 comment blocks refreshed — they asserted these achievements were
    *deliberately* reward-free "because every locked id in data.js is
    already spoken for". That was true when written but is false after the
    expand-everything content pass added the five new locked pools, and
    leaving them would have read as a contradiction of the code below them.
    Rewritten to say what is now true and why the Superbosses pool is still
    safe. Comment text only, no behaviour change.

Read-only, untouched as instructed: `js/data.js`, `js/enemies.js`,
`js/room.js`, `js/dungeon.js`, `js/stages.js`, `js/game.js`, `js/ai.js`,
and every already-rewarded achievement including the `sb_*` superboss grid
and all `classId`/`shopDiscount` holders.

## Pre-flight checks

`TIER_REWARD_KEYS` (line ~155) verified to still contain **both**
`'pillColorId'` and `'enemyId'` — read from disk, not assumed:

    const TIER_REWARD_KEYS = ['itemId', 'trinketId', 'familiarId', 'starId',
      'pickupKind', 'pillColorId', 'enemyId', 'classId', 'shopDiscount'];

Live pool counts were measured, not trusted from the handoff. Every table
was parsed by evaluating the real source in a `vm` sandbox (so `locked:true`
is read as a parsed boolean on the actual entry — the section-header comment
that also contains the literal string `locked:true` cannot produce a false
positive this way), then cross-referenced against every reward id already
claimed anywhere in `ACHIEVEMENTS`.

| Pool | Source | Locked total | Claimed by batches 1-3 + pre-existing | Available |
|---|---|---|---|---|
| Pill colours | `PILL_COLORS` | 40 | 30 | **10** |
| Enemies | `ENEMY_TYPES` (`locked:true`) | 60 | 44 | **16** |
| Trinkets | `TRINKETS` (`locked` + `pendingReward`) | 150 | 108 | **42** |
| Items | `ITEMS` (`locked:true`) | 876 | 834 | **42** |
| Familiars | `FAMILIAR_TYPES` (`locked:true`) | 219 | 175 | **44** |
| | | | | **154** |

Every one of the five figures matched the handoff estimate exactly. (The
items/familiars "locked total" columns look larger than the stated 150 only
because those tables contain older locked entries — e.g. the 876 locked
items include all the `slayertrophy_*` passives — whose availability is
already accounted for by the "claimed" column. The *available* count is the
number that matters and it is 42 / 44 as stated.)

Reward-less achievements before this batch, measured the same way:
**151 total** = 132 Slayer (`slayer_<id>_t1`/`_t2` for exactly the 66
9C/10C enemies that own a ladder) + 19 non-Slayer. 154 available vs 151
needed, so the batch fits with 3 to spare.

## Part A — 9C/10C Slayer, exact coverage

**66 / 66 enemies covered. 132 / 132 achievements covered. Zero left over.**

The 66 are exactly the `floorKey:'9C'`/`'10C'` enemies that own a Slayer
ladder. Note `ENEMY_TYPES` carries **74** entries tagged 9C/10C; the other 8
(`graveorchid`, `shrikesniper`, `quagmiredelver`, `bilebrewer`, `doomchoir`,
`gildedmantis`, `reliquarysplitter`, `cursemites`) have no
`slayer_<id>_*` achievement at all — they are `locked:true` bestiary-reward
enemies, not laddered ones — so there was nothing to wire on them. Four of
them are instead *used as rewards* in this batch.

Pool split for Part A (t1 and t2 of any given enemy always use two
**different** reward types — verified programmatically, 0 violations):

| Pool | Used in Part A |
|---|---|
| `familiarId` | 39 |
| `itemId` | 36 |
| `trinketId` | 36 |
| `enemyId` | 13 |
| `pillColorId` | 8 |
| **Total** | **132** |

Ids were drawn from the FRONT of each remaining pool in table-declaration
order, continuing batches 1-3's convention. `pendingReward:true` was left
in place on every trinket used — it is the flag that keeps them out of
`SUPERBOSS_REWARDS` via that pool's `&& !t.pendingReward` filter.

Full assignment (66 rows):

|Enemy|t1|t2|
|---|---|---|
| `slayer_blightprowler` | `familiarId:'brightbloom'` | `itemId:'broadvest'` |
| `slayer_waspflit` | `trinketId:'reaperanklet'` | `familiarId:'marblecoffer'` |
| `slayer_sporebulb` | `familiarId:'brightcoffer'` | `itemId:'pullingidol'` |
| `slayer_heartwoodplate` | `trinketId:'clangingquill'` | `familiarId:'brightcell'` |
| `slayer_boarram` | `familiarId:'ashencrow'` | `itemId:'poppingtalisman'` |
| `slayer_curarevine` | `trinketId:'parchedgear'` | `familiarId:'coraldynamo'` |
| `slayer_mantellafrog` | `familiarId:'gildedvessel'` | `itemId:'ashengauntlet'` |
| `slayer_blightspitter` | `familiarId:'sootypoultice'` | `trinketId:'jarringlace'` |
| `slayer_gallmortar` | `itemId:'ancientcloak'` | `trinketId:'crimsonchunk'` |
| `slayer_anacondaweaver` | `itemId:'sleetedcirclet'` | `familiarId:'feralshrew'` |
| `slayer_obeliskwatcher` | `trinketId:'dreadtag'` | `familiarId:'palesprite'` |
| `slayer_sporeswirl` | `trinketId:'septicspur'` | `itemId:'lopingreliquary'` |
| `slayer_heartrootborer` | `familiarId:'frostcharm'` | `itemId:'monarchbracer'` |
| `slayer_driverants` | `familiarId:'jadejar'` | `trinketId:'bulwarkknot'` |
| `slayer_blightsack` | `itemId:'asheneffigy'` | `trinketId:'bilioustoken'` |
| `slayer_brooddrummer` | `itemId:'crackedpendant'` | `familiarId:'copperbell'` |
| `slayer_mosswortmender` | `trinketId:'tollingstub'` | `familiarId:'ivorybalm'` |
| `slayer_monolithwarden` | `trinketId:'colossusstub'` | `itemId:'cursedvial'` |
| `slayer_toxinmarksman` | `familiarId:'marblecup'` | `itemId:'wilddraught'` |
| `slayer_rotblink` | `familiarId:'gildedhare'` | `trinketId:'whisperingnail'` |
| `slayer_pumalurker` | `itemId:'boilingtonic'` | `trinketId:'adoringwisp'` |
| `slayer_mahoganybrute` | `itemId:'glassdraught'` | `familiarId:'brightshrew'` |
| `slayer_blightrunner` | `trinketId:'dotingrivet'` | `familiarId:'indigohen'` |
| `slayer_wartspitter` | `trinketId:'reapertooth'` | `itemId:'cinderphial'` |
| `slayer_waspbomber` | `familiarId:'copperhare'` | `itemId:'vagrantcharge'` |
| `slayer_macawstriker` | `familiarId:'velvetbell'` | `trinketId:'whirringcleat'` |
| `slayer_crocram` | `itemId:'boilingprism'` | `trinketId:'adoringcoil'` |
| `slayer_fungusmortar` | `itemId:'oldbell'` | `familiarId:'cinnabarhen'` |
| `slayer_wormdelver` | `trinketId:'anchoredchit'` | `familiarId:'mossywick'` |
| `slayer_hornetcircler` | `trinketId:'crimsonposy'` | `itemId:'stormlantern'` |
| `slayer_stelawatcher` | `familiarId:'fenbalm'` | `itemId:'oldwhistle'` |
| `slayer_rotshade` | `familiarId:'palehen'` | `trinketId:'fondedge'` |
| `slayer_menhirbulk` | `itemId:'radiantbell'` | `trinketId:'gleamingknuckle'` |
| `slayer_cursedprowler` | `itemId:'glassbeacon'` | `familiarId:'driftpoultice'` |
| `slayer_plagueflit` | `trinketId:'bracedwishbone'` | `familiarId:'jadecoffer'` |
| `slayer_cankerbloom` | `trinketId:'dulldram'` | `itemId:'oldhorn'` |
| `slayer_sanctumplate` | `enemyId:'ocelotlurker'` | `familiarId:'lunarmole'` |
| `slayer_gaurram` | `trinketId:'frostbitplume'` | `itemId:'vagrantwhistle'` |
| `slayer_hexthorn` | `enemyId:'pollencircler'` | `familiarId:'onyxcup'` |
| `slayer_gildedfrog` | `trinketId:'giantanklet'` | `itemId:'sacredcharge'` |
| `slayer_hexcobra` | `enemyId:'termitewarden'` | `familiarId:'tidaljar'` |
| `slayer_cursemortar` | `trinketId:'scavengedsight'` | `itemId:'emberlantern'` |
| `slayer_constrictorweaver` | `enemyId:'blowgunsniper'` | `familiarId:'mossysprite'` |
| `slayer_shrinewatcher` | `trinketId:'tollingribbon'` | `itemId:'wardenchalice'` |
| `slayer_miasmaswirl` | `enemyId:'carrionmender'` | `familiarId:'ivorybloom'` |
| `slayer_deeprootborer` | `trinketId:'blastwideplate'` | `itemId:'wakingbell'` |
| `slayer_siafuants` | `enemyId:'fungusplitter'` | `familiarId:'sootymole'` |
| `slayer_cursesack` | `pillColorId:'thunder'` | `itemId:'hollowbeacon'` |
| `slayer_hivehierophant` | `trinketId:'rendingwhorl'` | `enemyId:'plaguegnats'` |
| `slayer_fungusmender` | `itemId:'heraldprism'` | `familiarId:'indigowick'` |
| `slayer_shrinewarden` | `pillColorId:'ember'` | `trinketId:'mourningfang'` |
| `slayer_hexmarksman` | `familiarId:'indigobalm'` | `enemyId:'graveorchid'` |
| `slayer_miasmablink` | `itemId:'gravecenser'` | `pillColorId:'magma'` |
| `slayer_ghostjaguar` | `enemyId:'shrikesniper'` | `trinketId:'skimmingrift'` |
| `slayer_kapokbrute` | `familiarId:'verdantmole'` | `itemId:'glasstonic'` |
| `slayer_cursedrunner` | `trinketId:'acridveil'` | `pillColorId:'soot'` |
| `slayer_bufospitter` | `enemyId:'bilebrewer'` | `familiarId:'silverdynamo'` |
| `slayer_plaguebomber` | `pillColorId:'mercury'` | `itemId:'wardenwhistle'` |
| `slayer_harpyshrieker` | `trinketId:'clangingchip'` | `enemyId:'gildedmantis'` |
| `slayer_rootram` | `itemId:'mooncharge'` | `familiarId:'sootynymph'` |
| `slayer_rotmortar` | `pillColorId:'platinum'` | `trinketId:'concussiveescapement'` |
| `slayer_scolodelver` | `familiarId:'embersprite'` | `enemyId:'reliquarysplitter'` |
| `slayer_wraithcircler` | `itemId:'heralddraught'` | `pillColorId:'brass'` |
| `slayer_sepulcherwatcher` | `enemyId:'cursemites'` | `trinketId:'graspingcasing'` |
| `slayer_miasmashade` | `familiarId:'umbermagpie'` | `itemId:'heraldwhistle'` |
| `slayer_zigguratbulk` | `trinketId:'hagglersplinter'` | `pillColorId:'ultraviolet'` |

## Part B — every remaining reward-less achievement, exact list

**19 / 19 covered.** These are all the achievements anywhere in the file
carrying none of the nine reward keys after Part A. Categories: Characters
(3), Miscellaneous (6), Exploration (6), Challenge (4).

| Achievement id | Reward added |
|---|---|
| `crystalpony_volley` | `itemId:'wildprism'` |
| `changeling_greenfire` | `itemId:'emberbeacon'` |
| `diamonddog_shockwave` | `itemId:'leadenbracer'` |
| `starseeker` | `familiarId:'lunarvessel'` |
| `stargazer` | `familiarId:'lunarbloom'` |
| `rerollregular` | `trinketId:'fourleafstone'` |
| `misc_rerollaltar_t1` | `trinketId:'airylocket'` |
| `misc_rerollaltar_t2` | `itemId:'hallowedsignet'` |
| `misc_rerollaltar_t3` | `familiarId:'hearthcell'` |
| `exploration_starrooms_t1` | `pillColorId:'iridescent'` |
| `exploration_starrooms_t2` | `trinketId:'lightlattice'` |
| `cbranch_entered` | `pillColorId:'tar'` |
| `exploration_cbranchfloors_t1` | `trinketId:'frostbittag'` |
| `exploration_cbranchfloors_t2` | `itemId:'deepflask'` |
| `exploration_cbranchfloors_t3` | `enemyId:'boglurker'` |
| `cbranch_complete` | `enemyId:'quagmiredelver'` |
| `challenge_cbranchwins_t1` | `trinketId:'ogrehasp'` |
| `challenge_cbranchwins_t2` | `familiarId:'frostvessel'` |
| `challenge_cbranchwins_t3` | `enemyId:'doomchoir'` |

Notes on Part B choices:

- The three section-1b signature-attack achievements got **items**, and
  deliberately still carry **no `classId`** — that key is a *reward* here,
  not a gate, and adding it would fire a bogus "New class unlocked" toast
  for an already-unlocked class (the file's own comment warns about this).
- The drowned-path ladders' top rungs and `cbranch_complete` got
  **`enemyId`** bestiary unlocks (`boglurker`, `quagmiredelver`,
  `doomchoir` — all 9C/10C-tagged locked enemies), which reads as the
  branch giving up more of its own inhabitants.
- Star/reroll achievements got star- and luck-flavoured ids
  (`lunarvessel`, `lunarbloom`, `iridescent`, `fourleafstone`).
- `exploration_starrooms_t3` and the other `shopDiscount:'star'` holder
  were **not** touched — they already had a reward.
- Three `_t3` rungs appear in this list (`misc_rerollaltar_t3`,
  `exploration_cbranchfloors_t3`, `challenge_cbranchwins_t3`). The
  "no `_t3`" instruction scopes to **Slayer** `_t3` rungs (which already
  carry `slayertrophy_*`); these are non-Slayer ladders that were fully
  reward-less, and Part B's brief explicitly covers "any category". Leaving
  them would have left the final count at 3 instead of 0.

## Duplicate check — whole file, all reward keys

Performed on the real parsed `ACHIEVEMENTS` array (1698 entries) after the
edits, over **all nine** reward keys — `itemId`, `trinketId`, `familiarId`,
`starId`, `pickupKind`, `pillColorId`, `enemyId`, `classId`, `shopDiscount`
— covering this batch's 151 new claims, batches 1-3's claims, the
pre-existing grid, and the `sb_*` superboss block:

    DUPS 1
      itemId:championscrown -> completionist_earth, completionist_pegasus,
        completionist_unicorn, completionist_batpony, completionist_zebra,
        completionist_hypogriff, completionist_seapony, completionist_ponybot,
        completionist_griffin, completionist_kirin, completionist_dragon,
        completionist_windigo, completionist_kelpie, completionist_breezie,
        completionist_dnbpony, completionist_crystalpony, completionist_mule,
        completionist_alicorn, completionist_changeling, completionist_diamonddog

That is the **one known pre-existing intentional exception** (all 20
`completionist_<class>` achievements share the same crown by design), and it
is untouched by this batch. **Zero other duplicates exist anywhere in the
file.** The 151 new claims were also checked against each other in isolation:
0 internal duplicates.

## Source-table verification

All 151 ids used were confirmed to exist as genuine `locked:true` entries in
their source table:

    verified 151 / 151    enemyId strict-own-physical-line: 16 / 16
    failures: 0

The 16 `enemyId` values were held to the stricter check the batch-2 trap
demands — `locked:true` must appear on the entry's **own physical line**, and
the line must not be a comment. The other four pools declare entries across
two physical lines (`id:` on the first, `locked:true` on the second), so
those were matched within the entry body; the `vm`-parsed check above
independently confirms `locked === true` on the real object for all 151.

## Syntax + runtime verification

Run incrementally during the batch and again at the end against the final
on-disk file.

- `node --check js/achievements.js` — **passes**.
- Full sweep: `node --check` on all **24** files in `js/` — **zero failures**.
- Runtime load in a `vm` context (`utils.js` + `data.js` + `enemies.js` +
  `achievements.js`, with `document`/`window`/`localStorage` stubbed):

      ACHIEVEMENTS built:       1698   (unchanged — no achievement added or lost)
      SUPERBOSS_REWARDS length: 300    (strict assertion intact, pool uncorrupted)

## TRUE final project-wide reward-less count

Measured on the parsed `ACHIEVEMENTS` array — every achievement in the
project, not just the C branch — as "carries none of the nine keys in
`TIER_REWARD_KEYS`":

    rewardless total: 0

**The final count is 0.** Every one of the 1698 achievements in the project
now carries at least one reward field. Nothing was left uncovered, and no
achievement had to be skipped for pool exhaustion.

## Pool state after this batch

| Pool | Available before | Used this batch | **Remaining** |
|---|---|---|---|
| `pillColorId` | 10 | 10 | **0** |
| `enemyId` | 16 | 16 | **0** |
| `trinketId` | 42 | 41 | **1** |
| `itemId` | 42 | 41 | **1** |
| `familiarId` | 44 | 43 | **1** |
| | 154 | **151** | **3** |

The three survivors are `trinketId:'drainingquill'`, `itemId:'frostflask'`
and `familiarId:'runiccup'` — the tail of each pool. They are genuinely
unclaimed and available to any future achievement.

## Deviations and gaps

- **No gaps.** Both parts reached 100% coverage (132/132 and 19/19) and the
  project-wide reward-less count is 0. Nothing had to be deferred, and the
  escape hatch in the brief (leaving low-priority `t1`/Miscellaneous rungs
  reward-less) was not needed.
- **Deviation 1 — comments rewritten.** Six comment blocks stated these
  achievements were deliberately reward-free because no locked id was safe
  to reuse. Correct when written, wrong after the new pools landed, and
  directly contradicted by the code they introduce. Updated rather than left
  stale, matching what batch 1 did for the same reason. Comment text only.
- **Deviation 2 — three non-Slayer `_t3` rungs were given rewards** (see the
  Part B note above). Reading "no `_t3`" as covering these would have left
  the final count at 3 rather than 0, against Part B's explicit "any
  category, whatever the actual live count is" instruction. No Slayer `_t3`
  rung was touched.
- **Observation — 74 vs 66 9C/10C enemies.** The brief said 66; `ENEMY_TYPES`
  actually tags 74 with `floorKey:'9C'`/`'10C'`. The 66 figure is correct for
  *achievements*: only 66 of the 74 own a Slayer ladder. The other 8 are
  reward-pool enemies with no ladder, so Part A's scope is unchanged.
- **Superboss grid untouched.** `SUPERBOSS_REWARDS` still asserts at exactly
  300, and all trinkets used here retain `pendingReward:true`, which is what
  keeps them outside that pool.
