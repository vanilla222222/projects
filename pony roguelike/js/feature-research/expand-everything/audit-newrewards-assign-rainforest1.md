# Audit — New Rewards Assigned: 7C/8C "Rainforest" Slayer t1/t2

Batch 3 of 4 covering the 528 reward-less `_t1`/`_t2` Slayer achievements.
Scope this batch: the 66 enemies tagged `floorKey:'7C'` or `'8C'` in
`js/enemies.js` — 132 achievements (`slayer_<id>_t1` and `_t2` for each).
Batch 2 (5C/6C "Sewers") was read as the live template; every pool was
CONTINUED from batch 2's stopping offset, verified by a fresh whole-file
grep rather than by trusting the running totals.

## Files changed

- `js/achievements.js` — the ONLY file edited.
  - 132 reward fields added: one per `slayer_<id>_t1` and `_t2` tier object,
    inside the 66 `addTierSet` calls of the 7C/8C section (lines 1837-2102).
  - The 7C/8C section header comment (lines 1829-1837) updated — it claimed
    "only the TOP rung carries a reward … Rungs 1 and 2 are flavour-only",
    which is no longer true.
  - Nothing else. Total diff is exactly 140 lines: 66 old tier lines out /
    66 new tier lines in, plus 3 header-comment lines out / 5 in. Every
    changed line falls between 1833 and 2102, i.e. inside the 7C/8C block.
    All `_t3` rungs (`itemId:'slayertrophy_<id>'`) are byte-identical, and
    the `sb_*` superboss grid, the 3C/4C and 5C/6C blocks, the 9C/10C block
    and every non-Slayer achievement are untouched.

Read-only, untouched as instructed: `js/data.js`, `js/enemies.js`,
`js/room.js`, `js/dungeon.js`, `js/stages.js`, `js/game.js`, `js/ai.js`.

## Pre-check: `TIER_REWARD_KEYS`

Line 155 of `js/achievements.js` still reads:

    const TIER_REWARD_KEYS = ['itemId', 'trinketId', 'familiarId', 'starId',
      'pickupKind', 'pillColorId', 'enemyId', 'classId', 'shopDiscount'];

Batch 1's fix (adding `pillColorId` / `enemyId`) is intact — confirmed by
grep, not assumed. Both keys are needed by this batch (10 `pillColorId`,
15 `enemyId` rewards), and `addTierSet`'s copy loop at line 174 iterates
`TIER_REWARD_KEYS`, so all 132 new fields survive onto the built objects.

## Enemy-set derivation

`floorKey:'7C'|'8C'` matches **74** entries in `js/enemies.js`. Eight of them
(lines 1866-1886) are `locked:true` **reward-pool** enemies in the bestiary
unlock block — not spawning floor enemies and not Slayer targets. Filtering to
entries WITHOUT `locked:true` on the entry itself yields exactly the **66**
main-block enemies (lines 1412-1559, 33 on 7C + 33 on 8C), which is the set
that has `slayer_<id>_t1/_t2/_t3` ladders. All 66 matched a
`slayer_<id>` `addTierSet` uniquely (script aborted on any missing or
ambiguous match; none occurred).

## Pool derivation (and the comment trap)

Pools were extracted by **brace-balanced entry parsing**, not by line grep, so
a multi-line entry's `locked:true` is attributed to the entry that owns it and
never to a neighbouring section-header comment. The `ENEMY_TYPES` trap flagged
from batch 2 was re-checked explicitly: each of the 15 enemy ids used was
re-grepped and confirmed to sit on a physical line that carries BOTH
`id:'<id>'` and `locked:true` and is not a comment line (lines 1825-1862).

Pool sizes recovered from source, matching the brief exactly:

| Pool | Definition | Size |
|---|---|---|
| `PILL_COLORS` | `locked:true` | 40 |
| `ENEMY_TYPES` | `locked:true` (own entry) | 60 |
| `TRINKETS` | `locked:true` + `pendingReward:true` | 150 |
| `ITEMS` | newest 150 `locked:true` (the 876 locked items include the older `unlockedBy` set and the `slayertrophy_*` rewards; the reward pool is the trailing 150) | 150 |
| `FAMILIAR_TYPES` | newest 150 `locked:true` (of 219 locked) | 150 |

A live whole-file grep of `js/achievements.js` before editing found batches 1+2
had claimed exactly 20 / 29 / 72 / 72 / 71 of these — matching the brief's
running totals, so the remainders were 20 / 31 / 78 / 78 / 79. Ids were drawn
from the FRONT of each remainder in table-declaration order.

## Pool usage this batch

| Pool | Size | Batch 1 | Batch 2 | **Batch 3** | Cumulative | Remaining for batch 4 |
|---|---|---|---|---|---|---|
| Pill colors | 40 | 10 | 10 | **10** | 30 (75%) | 10 |
| Enemies | 60 | 14 | 15 | **15** | 44 (73%) | 16 |
| Trinkets | 150 | 36 | 36 | **36** | 108 (72%) | 42 |
| Items | 150 | 36 | 36 | **36** | 108 (72%) | 42 |
| Familiars | 150 | 36 | 35 | **35** | 106 (71%) | 44 |
| | **550** | 132 | 132 | **132** | **396 (72%)** | **154** |

The target (~10 / 15 / 37 / 37 / 37) sums to 136, four over the 132 slots
available, so trinkets, items and familiars each gave up a slot — the exact
same 36 / 36 / 35 trim batch 2 applied, keeping the three big pools in step.
Batch 4 inherits 154 rewards for its final 132 achievements, so 9C/10C can
finish cleanly with room to spare in every pool.

First and last id taken per pool this batch (the batch-4 continuation offsets
are the entries immediately after these):

| Pool | First used | Last used | Batch-4 offset |
|---|---|---|---|
| Pill colors | `honey` | `storm` | 30 |
| Enemies | `rasterswarm` | `filthmender` | 44 |
| Trinkets | `mistypane` | `longplume` | 108 |
| Items | `wishinglocket` | `ancientmantle` | 108 |
| Familiars | `meadowsprite` | `runiccharm` | 106 |

`pendingReward:true` was left in place on all 36 trinkets used — it is the
marker that keeps them out of `SUPERBOSS_REWARDS`, not a bug.

## Assignment scheme (t1 ≠ t2 guaranteed)

The 132 reward types were laid out as one ordered token sequence — 36
`trinketId`, 36 `itemId`, 35 `familiarId`, 15 `enemyId`, 10 `pillColorId` —
and enemy *k* (0-65) took tokens *k* and *k+66*. Since the sequence is grouped
by type and no type's run exceeds 66, tokens *k* and *k+66* can never share a
type, so **every enemy's t1 and t2 differ by construction**. Which of the pair
lands on t1 vs t2 alternates by parity of *k*, so the ladder shapes vary down
the block rather than all reading trinket-then-item. Sample:

    slayer_jungleprowler  t1 trinketId:'mistypane'   t2 itemId:'wishinglocket'
    slayer_hornetflit     t1 itemId:'runiccrown'     t2 trinketId:'fulminatenut'
    slayer_monolithbulk   t1 pillColorId:'storm'     t2 itemId:'ancientmantle'

The type-equality check was also asserted per enemy after the fact (see below),
not merely argued from the construction.

## Verification

`node --check js/achievements.js` was run after the edit pass and again after
the header-comment edit; a final sweep ran `node --check` over **every** file
in `js/` (25 files) with zero failures.

**1. All 132 fields present, none missing, none doubled.** For each of the 66
`addTierSet` calls the tier array was re-parsed from the written file and
asserted to have exactly 3 tiers, exactly ONE reward key on t1 and exactly ONE
on t2, the expected key/value on each, and `t1.key !== t2.key`.
Result: **0 failures across all 66 enemies.**

**2. Zero duplicate reward-id claims across the WHOLE file.** Every
`pillColorId`/`enemyId`/`trinketId`/`itemId`/`familiarId` literal anywhere in
`js/achievements.js` — batches 1+2's claims, the pre-existing grid, the
`slayertrophy_*` t3 rewards, the `sb_*` superboss grid and this batch's 132:

| Key | Total occurrences | Unique values | Duplicates |
|---|---|---|---|
| `itemId` | 829 | 829 | **none** |
| `trinketId` | 122 | 122 | **none** |
| `familiarId` | 155 | 155 | **none** |
| `pillColorId` | 30 | 30 | **none** |
| `enemyId` | 44 | 44 | **none** |

Each total is exactly the pre-batch count plus this batch's contribution
(793+36, 86+36, 120+35, 20+10, 29+15), confirming nothing was overwritten.

Note on the documented `championscrown` exception: it is **not** visible as a
duplicate, because the 20 `completionist_<class>` achievements are minted in a
loop (line ~375) from a single literal, so `championscrown` appears once in
source. The exception therefore needed no suppression and the duplicate counts
above are genuinely clean.

**3. Every id used exists as a `locked:true` entry in its source table.** All
132 values were checked back against the parsed pools — 0 misses. The 15
`enemyId` values were additionally re-verified on their own physical source
line as described under "the comment trap".

## Deviations

- Trinkets/items/familiars used 36 / 36 / 35 instead of the suggested
  37 / 37 / 37, because 10+15+37+37+37 = 136 exceeds the 132 slots. This
  mirrors batch 2's identical trim.
- The 7C/8C section header comment was edited (a 4-line block replaced by 6
  lines). This is technically beyond "add one reward field", but leaving it
  would have left an actively false comment, and batch 2 set the same
  precedent for its own block.
- No other deviations. No `_t3` rung, no other floorKey, no `sb_*` entry and
  no non-Slayer achievement was modified.
