# Phase 8c — Skill Tree character nodes: audit

Adds the 250 character skill nodes (10 per character × 25 `CLASSES` entries),
bringing `SKILL_TREE_NODES` to 278 total (28 scaffold nodes from Phase
8b + 250 new). Pure data addition — no `skilltree.js` engine function
(`canBuySkillNode`, `buySkillNode`, `getSkillTreeStatBonus`,
`applySkillTreeStatBonuses`, `computeSkillTreeLayout`, `buildSkillTreePanel`,
etc.) was changed.

## Files changed

- **NEW** `js/achievements/skilltree-characters.js` — `SKILL_TREE_CHARACTER_CONFIG`
  (25-entry authoring table: `classId`, `statA`, `statB`, hand-written
  `{name, desc}` for each of the 10 node keys `a1/a2a/a3a/a2b/a3b/b1/b2a/b3a/b2b/b3b`),
  a small generator (`buildCharacterSkillNodes`) that mechanically expands
  that config into the 250 `SKILL_TREE_CHARACTER_NODES` objects (ids,
  `parent` pointers, `cost:1`, `effect:{type:'stat',...}` derived from the
  template — only the `name`/`desc` strings are hand-authored, per the
  plan), then a closing loop that pushes every node onto `SKILL_TREE_NODES`
  and registers it in `SKILL_TREE_NODES_BY_ID`.
- `index.html` — added `<script src="js/achievements/skilltree-characters.js"></script>`
  immediately after the existing `js/achievements/skilltree.js` tag (line 229/230).
- `js/achievements/skilltree.js` — comment-only edit to the file-header note
  (no engine code touched): updated the "375 leaf nodes ... not defined
  here" note to point at `skilltree-characters.js` now covering the 250
  character nodes, leaving 100 unlock + 25 general-upgrade nodes for
  Phase 8d/8e.
- `js/CODE_REFERENCE.md` — new `### achievements/skilltree-characters.js`
  subsection immediately after the existing `### achievements/skilltree.js`
  section, describing the topology, stat/amount conventions, the
  ≤0.25-worst-case design rule, the `fireCooldown`/`meleeCooldown` exclusion
  rationale, and the new 278-node total.

## Topology template (applied identically to all 25 characters)

```
char_hub_<classId>
  +- char_<classId>_a1                       (branch A opener)
  |    +- char_<classId>_a2a -> char_<classId>_a3a   (subpath 1)
  |    +- char_<classId>_a2b -> char_<classId>_a3b   (subpath 2)
  +- char_<classId>_b1                       (branch B opener)
       +- char_<classId>_b2a -> char_<classId>_b3a   (subpath 1)
       +- char_<classId>_b2b -> char_<classId>_b3b   (subpath 2)
```

Cost 1/node uniformly. Amounts: opener (`a1`/`b1`) `0.05`, depth-2 subpath
nodes (`a2a`/`a2b`/`b2a`/`b2b`) `0.04` each, depth-3 leaves (`a3a`/`a3b`/
`b3a`/`b3b`) `0.03` each. Worst case per branch (opener + both full subpath
chains, all 5 nodes bought) = `0.05+0.04+0.04+0.03+0.03 = 0.19`, under the
engine's `SKILL_TREE_STAT_CAP` of `0.25`.

## Verification harness output

Ran a throwaway Node `vm` harness (adapted from the Phase 8b-visual harness
pattern) that loads `js/data/core.js` (real `CLASSES`), `js/achievements/skilltree.js`,
and `js/achievements/skilltree-characters.js` into one sandboxed `vm`
context (with a real `Util.clamp`, and stub `document`/`loadUnlocks`/
`saveUnlocks`/`ensureUnlockShape` since none of those are touched by the
functions under test), then asserts:

```
classIds count: 25
PASS: SKILL_TREE_NODES.length === 278 (got 278)
PASS: SKILL_TREE_CHARACTER_NODES.length === 250 (got 250)
PASS: all 25 characters match the exact 10-node branching topology template with correct parent pointers
PASS: every character-node effect.stat is in SKILL_TREE_STAT_FIELDS and effect.classId matches owning character
PASS: every character node has cost === 1
PASS: every character x stat worst-case sum <= 0.25 (STAT_CAP)
PASS: no duplicate node ids across all 278 nodes
PASS: computeSkillTreeLayout runs without error on full 278-node set
PASS: computeSkillTreeLayout returns 278 positions (got 278)
PASS: no x-collisions among same-depth leaf nodes in full layout

10 passed, 0 failed
ALL PASSED
```

Also:

```
$ node --check js/achievements/skilltree-characters.js
(clean, no output)
$ node --check js/achievements/skilltree.js
(clean, no output)
$ grep -n "skilltree" index.html
229:<script src="js/achievements/skilltree.js"></script>
230:<script src="js/achievements/skilltree-characters.js"></script>
```

## Stat pairings (classId → branch A stat / branch B stat)

| classId | Branch A | Branch B |
|---|---|---|
| earth | meleeDamage | luck |
| pegasus | speed | meleeDamage |
| unicorn | rangedDamage | boltSpeed |
| batpony | meleeDamage | speed |
| zebra | meleeDamage | critChance |
| hypogriff | speed | meleeDamage |
| seapony | rangedDamage | critChance |
| ponybot | rangedDamage | rangeTiles |
| griffin | speed | boltSpeed |
| kirin | rangedDamage | critChance |
| dragon | rangedDamage | rangeTiles |
| windigo | rangedDamage | boltSpeed |
| kelpie | meleeDamage | rangeTiles |
| breezie | speed | boltSpeed |
| dnbpony | rangedDamage | speed |
| crystalpony | rangedDamage | luck |
| mule | meleeDamage | magnetRadius |
| alicorn | rangedDamage | speed |
| changeling | rangedDamage | speed |
| diamonddog | meleeDamage | magnetRadius |
| gargoyle | rangedDamage | critChance |
| changedling | speed | rangedDamage |
| changelingqueen | rangedDamage | magnetRadius |
| filly | meleeDamage | luck |
| engineerpony | rangedDamage | magnetRadius |

Pairings were chosen to match each class's kit/flavor read from `js/data/core.js`
(e.g. Ponybot's laser gets `rangedDamage`/`rangeTiles` — "room-spanning
laser"; Mule/Diamond Dog/Engineer Pony/Changeling Queen get `magnetRadius`
for their loot-gathering/hoarding/hive-provisioning themes; Griffin/Breezie
get pure `speed`/`boltSpeed` pairs with no damage branch at all, matching
their "trades power for speed" descriptions). Overlap across characters
(e.g. several `rangedDamage`/`critChance` or `meleeDamage`/`luck` pairs) is
expected and accepted per the brief — 25 characters against 8 usable stats
guarantees repeats; each pairing is differentiated by its 10 hand-written
name/desc strings, not by contorting stat choice to avoid repetition.

## Deviations from the plan

- **`fireCooldown`/`meleeCooldown` excluded from all 25 pairings.**
  `getSkillTreeStatBonus` (`skilltree.js`) clamps a stat's summed bonus to
  `[0, SKILL_TREE_STAT_CAP]` via `Util.clamp(total, 0, SKILL_TREE_STAT_CAP)`
  before `applySkillTreeStatBonuses` multiplies the stat by `(1 + bonus)`.
  For every other stat in the allowlist, "bigger is better" so a positive
  clamped bonus is a buff. For `fireCooldown`/`meleeCooldown`, lower is
  better (faster attacks) — a genuinely helpful node would need a
  *negative* amount, but the `[0, cap]` clamp floors any negative sum to
  `0`, silently discarding it. Authoring a positive-amount node on either
  field would be a real node that actively makes the character *worse*
  (slower attacks) the moment it's bought, which contradicts "genuine
  flavor content" for a buff tree. Since the plan only requires picking 2
  of the 10 allowlisted stats per character (not all 10 across the roster),
  the fix was simply never selecting those two fields — all 250 nodes use
  only the other 8 (`speed`, `meleeDamage`, `rangedDamage`, `critChance`,
  `luck`, `rangeTiles`, `boltSpeed`, `magnetRadius`). Flagging this
  explicitly since it's a data-authoring choice, not a bug fix — the engine
  itself was not touched. Noted in both `skilltree-characters.js`'s header
  comment and the new `CODE_REFERENCE.md` subsection.
- No other deviations. Topology, amounts, cost, ids, file organization, and
  script-tag placement all match the plan as given.
