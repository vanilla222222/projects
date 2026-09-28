# Audit — Remove Slayer achievement category (Phase 9)

Removed the `'Slayer'` achievement category entirely. Deleted its trophy-item
rewards. Migrated every non-trophy reward (real enemy unlocks, pill-color
unlocks, trinkets, familiars) into a new `'Mastery'` category so nothing
playable became unobtainable.

A prior attempt at this task was correctly aborted because its initial
scoping assumed all Slayer rewards were pure trophy items — a full scan
(redone from scratch here, not trusted from the prior attempt) found 584 of
1679 Slayer achievements actually granted a real, non-trophy reward.

## Files changed

- `js/achievements/defs-2.js` through `defs-12.js` — every `category:'Slayer'`
  `addAchievement`/`addTierSet` call removed (805 source statements, verified
  file-by-file against a real count before touching anything).
- `js/achievements/defs-mastery.js` — **new file**. 584 migrated real-reward
  achievements under `category:'Mastery'`.
- `index.html` — added `<script src="js/achievements/defs-mastery.js">` right
  after `defs-12.js`, before `bestiary-tiers.js`.
- `js/achievements/logic.js` — removed `'Slayer'` from
  `ACHIEVEMENT_CATEGORY_ORDER`; updated the surrounding comment block (it
  previously called `Mastery` "reserved and empty," which was already false
  before this change — 20 pre-existing Mastery statements existed — and is
  now doubly false with the migrated content added).
- `js/data/items-2.js`, `items-3.js`, `items-4.js`, `items-5.js` — deleted
  1095 trophy item defs (only the ones actually granted by a Slayer
  achievement — see the naming-pattern caveat below).
- `js/systems/items-1.js` — removed 1132 dead `(p.<trophyId> || 0)` luck
  formula terms (referencing the 1095 deleted ids, some ids appeared in more
  than one formula line) plus their now-orphaned "trophy batch" header
  comments; 19 lines that mixed a Slayer-trophy term with a still-live
  Challenge/Exploration-trophy term on the same line were edited term-by-term
  rather than deleted wholesale.
- `js/CODE_REFERENCE.md` — documented the removal (new Phase 9 subsection),
  updated the `category` value list, `ACHIEVEMENT_CATEGORY_ORDER` listing,
  and `ACHIEVEMENTS.length` figures.

Tooling written for this task (kept in `feature-research/phase9-megaupdates/`
for traceability, not part of the shipped game):
`scan-slayer.js` (Step 1 classification), `split-statements.js`/
`split-props.js` (brace-depth-aware, string-safe source splitters used for
precise deletion), `run-migration.js` (drives the actual edits),
`verify.js` (the mandatory regression harness), `slayer-scan-output.json`
(the Step-1 scan's real output, restored from a pre-edit backup after an
accidental overwrite — see "Deviations" below).

## Step 1 — real classification (not the prior scan's estimates)

Ran a Node `vm` harness that loads the real game files in `index.html`'s
`<script>` order through `defs-12.js` (`js/core/*`, `js/data/*`,
`js/achievements/core.js` + `defs-1.js`–`defs-12.js`) into one JS context,
exactly like the browser, then inspected the real `ACHIEVEMENTS` array
(tier-expansion handled by the actual `addTierSet` code, not by counting
source statements).

Real output (pre-edit, from the untouched backup):

```
Total ACHIEVEMENTS (all categories) post tier-expansion: 2807
Total Slayer achievements (post tier-expansion): 1679

Distinct itemId values granted by Slayer achievements: 1265
itemId values NOT matching trophy patterns (need inspection): 170
   (all 170 confirmed by direct ITEMS lookup to be genuine functional
    passives/actives — e.g. ashensigil, gildedcrown, cursedvial, oldbell,
    starchartrelic, gearclutchcore — none are trophy items, all classified REAL)

=== FINAL CLASSIFICATION ===
Total Slayer achievements: 1679
TROPHY (delete, no migration): 1095
REAL (migrate to Mastery): 584
UNKNOWN (needs manual look): 0

REAL breakdown by reward field:
    trinketId : 162
    itemId : 170
    familiarId : 157
    enemyId : 57
    pillColorId : 38
```

Trophy-naming patterns confirmed by sampling real item ids: `slayertrophy_*`,
`hcfwtrophy_*`, `mgtrophy_*`, `obstrophy_slayer_*`, `ortrophy_slayer_*`,
`vbtrophy_slayer_*`, `vbtrophy2_slayer_*` — these matched the prompt's list
exactly, no additional patterns found.

**Important scope correction found during Step 1 verification, not in the
prompt's context:** several of these same naming-pattern *families* are
ALSO used by achievements in OTHER still-live categories — e.g.
`hcfwtrophy_challenge_hc_floor_nodamage` (category `'Challenge'`),
`hcfwtrophy_exploration_meet_wobbler` (category `'Exploration'`),
`mgtrophy_exploration_floor11c`, `obstrophy_challenge_floor_nodamage`,
`vbtrophy_meet_wreckspark`, etc. 1138 item defs total match the seven
trophy-naming regexes across `items-2.js`–`items-5.js`, but only **1095**
of those are actually referenced by a Slayer achievement — the other **43**
belong to Challenge/Exploration achievements that were not touched by this
task. Deleting all 1138 by pattern alone would have broken 43 still-live,
non-Slayer achievements. Verified the reverse too: all 1095 Slayer-granted
trophy ids are referenced ONLY by Slayer achievements (zero shared with any
other category) — safe to delete outright. Same caveat applied to the
`items-1.js` formula cleanup: 2081 total `(p.X || 0)` terms exist in that
file, only 1132 (referencing exactly the 1095 confirmed Slayer-only trophy
ids) were removed; the other ~949 (including 188 other trophy-like ids
belonging to Mastery/Exploration/Challenge/Collection) were left alone.

Every one of the 584 REAL entries turned out to be a per-enemy bestiary
kill-count ladder (`bestiarySection:'enemyKills'`, `bestiaryId`, `threshold`
— no `statKey` or distinct-breadth Slayer entries existed), each carrying
exactly one reward field (`itemId`/`trinketId`/`familiarId`/`enemyId`/
`pillColorId` — no `starId`/`pickupKind`/`classId`/`shopDiscount` rewards
were found among Slayer's real entries), which made the migration a
mechanical 1:1 field copy plus an `id`/`name`/`icon`/`category` reskin.

## Step 2 — migration to Mastery

For each of the 584 REAL-reward Slayer achievements, created exactly one
`addAchievement` entry in the new `js/achievements/defs-mastery.js`,
preserving the identical `bestiarySection`/`bestiaryId`/`threshold` trigger
and the identical reward field/value. Transform rules used:

- `id`: `slayer_<x>_t<n>` → `mastery_<x>_t<n>` (`id.replace(/^slayer/, 'mastery')`).
- `name`: `'... Hunter ...'` → `'... Mastery ...'` (literal substring swap).
- `icon`: `💀`→`🎖️` (578 of 584), `👹`→`🔬` (2), `👑`→`🏵️` (4).
- `desc`/`category`: `desc` left verbatim (still an accurate description of
  the same trigger regardless of category name); `category` set to
  `'Mastery'`.

`'Mastery'` was already a real, non-empty category before this change (20
pre-existing source statements / 52 expanded entries using
`masterytrophy_*`/`explorationtrophy_*` reward items — those items were
NOT part of the Slayer-trophy deletion set and were left untouched). The
584 migrated entries land alongside those, for 636 total `Mastery` entries
post-migration.

`ACHIEVEMENT_CATEGORY_ORDER` already reserved a `'Mastery'` slot (right
after `'Slayer'`'s old slot), so only `'Slayer'` needed removing from that
array — no new slot needed adding.

## Step 3 — Slayer statement deletion

Wrote a brace/paren-depth-aware, string-literal-aware statement splitter
(`split-statements.js`) that finds every top-level `addAchievement(...)`/
`addTierSet(...)` call in a defs file as an exact `{start, end}` source
span (verified round-trip-safe: reassembling a file from its split spans
reproduces the original byte-for-byte, tested on all 12 files before any
deletion). Removed every span whose text contains `category:'Slayer'`,
each file's non-Slayer statements and comments left untouched.

Per-file deletion counts (statements, i.e. pre-tier-expansion):

| file | deleted |
|---|---|
| defs-2.js | 243 |
| defs-3.js | 136 |
| defs-4.js | 133 |
| defs-5.js | 6 |
| defs-6.js | 3 |
| defs-7.js | 20 |
| defs-8.js | 33 |
| defs-9.js | 66 |
| defs-10.js | 66 |
| defs-11.js | 33 |
| defs-12.js | 66 |
| **total** | **805** |

805 matches the count independently confirmed by `grep -c "category:'Slayer'"`
per file before editing. `defs-1.js` had zero Slayer statements (untouched).
No file's total statement count dropped to zero — every touched file still
has other categories' content.

## Step 4 — trophy item deletion

Wrote the same kind of splitter for `Object.assign(ITEMS, {...})` object
properties (`split-props.js`), same round-trip-safety verification.
Deleted exactly the 1095 trophy item defs confirmed in Step 1 (not all 1138
pattern matches — see the scope correction above):

| file | deleted |
|---|---|
| items-2.js | 118 |
| items-3.js | 264 |
| items-4.js | 136 |
| items-5.js | 577 |
| **total** | **1095** |

## Step 5 — dead formula cleanup

`js/systems/items-1.js` had 2081 `(p.<id> || 0)` terms feeding the luck
formula; 1132 referenced one of the 1095 deleted trophy ids (a handful of
ids appear on more than one formula line). Removal was done term-by-term,
not line-by-line, because 19 lines mixed a now-dead Slayer-trophy term with
a still-live Challenge/Exploration-trophy term (e.g. line
`+ 1 * (p.hcfwtrophy_r_polyrhythm_t3 || 0) + 1 * (p.hcfwtrophy_r_syncopehopper_t2 || 0) + 1 * (p.hcfwtrophy_challenge_hc_floor_nodamage || 0)`
had its first two terms removed, the third (Challenge) kept). Lines that
were composed *entirely* of dead terms were dropped outright (405 lines);
"trophy batch" header comments left with no surviving code beneath them
were also dropped. `node --check` confirms the resulting formula is still
syntactically valid; the full-file `vm` load (see Verification) confirms
`recalcPlayerStats` still parses and the rest of the game's scripts load
cleanly afterward.

## Step 6 — peripheral systems (all confirmed unaffected)

- `unlockAchievement`'s Superbosses→Completionist cascade
  (`js/achievements/logic.js` ~line 244) only checks `def.category ===
  'Superbosses'` — never referenced `'Slayer'`, unaffected.
- `js/achievements/bestiary-tiers.js`/`js/ui/bestiary.js` read
  `unlocks.bestiary.enemyKills` directly — independent of the achievement
  layer, unaffected (confirmed via grep, not assumed).
- `isEnemyUnlocked`/`isPillColorUnlocked`/`isTrinketUnlocked`/
  `isFamiliarUnlocked` (`js/achievements/core.js`) and their callers in
  `js/systems/room.js` read `unlocks.unlockedX[id]` generically — dispatched
  by `unlockAchievement`'s reward-field type, not by category, so the new
  Mastery entries populate the exact same unlock buckets Slayer used to.
- The remaining ~17 non-functional `Slayer`/`slayer` text hits left in the
  repo after this change (checked via `grep -rl Slayer js/`) are: stale
  historical comments in defs files describing past design work (harmless,
  e.g. "C-branch DEEP RAINFOREST Slayer ladders"), the `addTierSet`
  docstring's illustrative example in `core.js` (`category: 'Slayer'` as
  sample text, never executed), unrelated item/trinket/achievement names
  that merely contain the substring "slayer" (`slayerssigil`,
  `giantslayersbelt`, `giantslayerbead`, achievement ids `veteranslayer`/
  `swarmslayer`/`harbingerslayer`/`giantslayer2` — all pre-existing
  Miscellaneous-category content unrelated to the Slayer category), and
  `js/CODE_REFERENCE.md`'s historical phase-by-phase narrative (left as
  historical record, with a new Phase 9 section documenting current state).
  None of these affect runtime behavior.

## Verification (mandatory harness — `verify.js`)

Ran against the real post-edit source files (all defs-\*.js + defs-mastery.js
+ all items-\*.js), loaded via `vm` in index.html's real script order.

```
=== 1. Zero Slayer entries remain ===
Slayer entries remaining: 0 PASS

=== 2. Critical regression check: every REAL Slayer reward still granted ===
Distinct real reward values before changes: 584
Missing after changes: 0 PASS
Migrated rewards NOT granted by exactly one achievement: 0 PASS

=== 3. Zero trophy-patterned item ids remain in ITEMS ===
Trophy ids still present in ITEMS: 0 PASS

=== 4. Zero references to deleted trophy ids in items-1.js/items-2.js (systems) ===
Total dead-id references found: 0 PASS

=== 5. node --check on touched/new files ===
node --check: PASS (all files)

=== 6. No duplicate achievement ids ===
Duplicate ids: 0 PASS

=== 7. Final ACHIEVEMENTS.length ===
Old total (pre-change, all categories): 2807
New total (post-change, all categories): 1712
Delta: -1095
Expected delta = -(trophyCount) since REAL entries migrated 1:1: -1095

=== Mastery category sanity ===
Mastery entries: 636 MISMATCH (see note below — this line's own comparison
                  was wrong, not the game data; see "Deviations")
```

Additional checks run beyond the harness script:
- `node --check` on every `.js` file in the repo (not just touched files):
  **0 failures**.
- Full-`vm` load of all 79 `<script>` tags in `index.html`'s real order
  (achievements/data/systems/UI layers): loads cleanly through
  `js/ui/render.js`; `js/main.js` itself needs real browser DOM APIs
  (`window.addEventListener` etc.) that a minimal Node stub can't fully
  emulate — this is a pre-existing harness limitation unrelated to this
  change, not a regression (nothing achievement/item/data-related failed).

**Critical regression check detail**: built the set of every distinct
`{field}:{value}` reward pair granted by any REAL Slayer achievement from
the Step 1 scan's pre-edit output (584 distinct values across
trinketId/familiarId/enemyId/pillColorId/itemId), then confirmed after all
edits that every single one is still granted by exactly one achievement in
the final `ACHIEVEMENTS` array. Zero missing, zero duplicated.

## Before → after counts

- `ACHIEVEMENTS.length`: **2807 → 1712** (delta **-1095**), exactly the
  trophy-only deletion count — the 584 real entries were migrated 1:1 (net
  zero from migration: -584 removed from Slayer, +584 added to Mastery),
  so the entire delta is the 1095 deleted trophy achievements.
- Slayer category: 1679 achievements → 0 (removed).
- Mastery category: 52 (pre-existing) → 636 (52 pre-existing + 584 migrated).
- Trophy item defs: 1095 deleted from `js/data/items-2.js`–`items-5.js`
  (out of 1138 total items matching the trophy naming-pattern family; the
  other 43 belong to still-live Challenge/Exploration achievements and were
  left in place).
- `js/systems/items-1.js`: 1132 dead formula terms removed (405 lines
  dropped entirely, the rest term-edited in place).

## Deviations from the task's context numbers, and why

- The prompt's "~805 `category:'Slayer'` statements" was a source-statement
  count; the real post-tier-expansion `ACHIEVEMENTS` entry count is 1679 —
  confirmed by loading the real files, exactly as instructed, rather than
  trusting the estimate.
- The prompt's trophy-pattern list was accurate as given, but its
  implication that all items matching those seven patterns are Slayer
  trophies was NOT fully accurate — 43 of 1138 pattern-matching items
  belong to Challenge/Exploration achievements and were correctly excluded
  from deletion (see Step 1 scope correction above). This is exactly the
  kind of scoping error the prior aborted attempt made in a different spot;
  it was caught here before any deletion by cross-referencing every trophy
  id's achievement `category`, not just its own name pattern.
- Operational mistake caught and fixed during this task: `scan-slayer.js`
  was accidentally re-run *after* the destructive edits (to sanity-check
  its own logic), which overwrote `slayer-scan-output.json` — the file the
  regression check depends on — with an empty post-edit scan (0 Slayer
  entries found, since they'd already been deleted). This was caught
  immediately (the verification harness's "before" counts came back as 0,
  which was obviously wrong) before reporting done. Fixed by re-deriving
  the correct pre-edit baseline from a full `js/`+`index.html` backup taken
  before any edits, re-running the Step 1 scan logic against that backup
  (reproducing the exact original 2807/1679/1095/584 numbers), and
  re-running the full verification harness against the corrected baseline
  — final results above are from that corrected run.
- The verification script's own "Mastery entries" sanity line reads
  `MISMATCH` because it naively compared `636` against `584` (the migrated
  count only) instead of `584 + the 52 pre-existing Mastery entries`. This
  is a flaw in that one throwaway print line, not a data problem — the
  actual `Mastery` category content (636 entries: 52 original + 584
  migrated, zero duplicate ids, all 584 migrated rewards independently
  confirmed present in Step 2 of the harness) is correct.
