# Phase 8d — Skill Tree general-upgrade nodes: audit

Adds the 25 general-upgrade skill nodes under the existing `general_hub`
node (a leaf with zero children coming into this phase), bringing
`SKILL_TREE_NODES` to 553 total (528 from Phases 8b/8c + 25 new). Pure data
addition plus a small, targeted `room.js` edit extending pool-nudge
coverage to three previously-unwrapped reward pools — no `skilltree.js`
engine function (`canBuySkillNode`, `buySkillNode`, `applySkillTreePoolNudge`,
`applySkillTreeStartingPickups`, `computeSkillTreeLayout`, etc.) was changed.

## Files changed

- **NEW** `js/achievements/skilltree-general.js` — `SKILL_TREE_GENERAL_NODES`
  (25 hand-authored node objects, `poolWeight`/`startingPickup` effects,
  cost 1 each), followed by a closing loop that pushes every node onto
  `SKILL_TREE_NODES` and registers it in `SKILL_TREE_NODES_BY_ID` — the same
  append pattern `skilltree-characters.js`/`skilltree-characters-2.js` use.
- `index.html` — added `<script src="js/achievements/skilltree-general.js"></script>`
  immediately after the existing `js/achievements/skilltree-characters-2.js`
  tag (line 231/232).
- `js/systems/room.js` — extended pool-nudge coverage: wrapped the three
  room-clear call sites that were still raw `Util.weighted(CONST)` —
  `BOMB_TIER_POOL`/`KEY_TIER_POOL` (common-tier bomb/key rolls inside
  `spawnClearRoomPickup`) and `CHEST_TYPE_POOL` (legendary-tier chest roll,
  same function) — with `applySkillTreePoolNudge(pool, 'PoolName')`, matching
  the pattern already used for `COMMON_CATEGORY_POOL`/`COMMON_PENNY_POOL`/
  `COMMON_HEART_POOL`/`RARE_POOL`/`LEGENDARY_POOL`. For `BOMB_TIER_POOL`/
  `KEY_TIER_POOL` the existing `.filter(t => !t.locked || isPickupKindUnlocked(t.id))`
  now runs **before** the nudge, since `applySkillTreePoolNudge`'s cloned
  array only carries `{id,w}` and would silently drop the `locked` flag the
  filter depends on. The other two `CHEST_TYPE_POOL` call sites (procedural
  room population, not room-clear rewards) and `rollGenericPickupKind()`'s
  own `BOMB_TIER_POOL`/`KEY_TIER_POOL` rolls (the generic-pickup re-roll used
  by chests/sacks/sacrifice spikes, not room-clear) were deliberately left
  untouched — out of scope for "room-clear reward pool" general-upgrade
  nodes per the brief.
- `js/CODE_REFERENCE.md` — new `### achievements/skilltree-general.js`
  subsection immediately after the existing `### achievements/skilltree-characters.js`
  section (topology, weight-sizing rule, pool-nudge coverage extension,
  `startingPickup` field mapping), plus an in-place edit to the existing
  `spawnClearRoomPickup` bullet updating the pool list and removing the
  now-stale "today it's a strict no-op" note.

## Topology (25 nodes, five hand-shaped sub-branches off `general_hub`)

```
general_hub
  +- gen_loot_hub            "Coin Instinct"        (COMMON_CATEGORY_POOL.penny +2)
  |    +- gen_loot_coins     "Sharper Eye for Silver" (COMMON_PENNY_POOL.nickel +2)
  |    |    +- gen_loot_coins2 "Gilded Instinct"     (COMMON_PENNY_POOL.dime +1)
  |    +- gen_loot_luck      "Fortunate Find"        (COMMON_PENNY_POOL.luckypenny +1)
  +- gen_loot_hearts         "Vital Instinct"        (COMMON_CATEGORY_POOL.heart +2)
  |    +- gen_loot_blueheart "Soulbound Affinity"    (COMMON_HEART_POOL.heartBlue +3)
  |    +- gen_loot_doubleheart "Twin Heart Sense"    (COMMON_HEART_POOL.doubleheart +1)
  +- gen_supply_hub          "Explosive Instinct"    (COMMON_CATEGORY_POOL.bomb +3)
  |    +- gen_supply_doublebomb "Twin Fuse"          (BOMB_TIER_POOL.doublebomb +2)
  |         +- gen_supply_goldbomb "Golden Fuse"     (BOMB_TIER_POOL.goldbomb +1)
  +- gen_supply_key_hub      "Locksmith's Instinct"  (COMMON_CATEGORY_POOL.key +3)
  |    +- gen_supply_doublekey "Twin Ward"           (KEY_TIER_POOL.doublekey +2)
  |         +- gen_supply_goldkey "Golden Ward"      (KEY_TIER_POOL.goldkey +1)
  +- gen_start_hub           "Packed Satchel"        (startingPickup bombs +1)
  |    +- gen_start_keys     "Ready Keyring"         (startingPickup keys +1)
  +- gen_start_coins         "Spare Change"          (startingPickup coins +3)
  |    +- gen_start_coins2   "Deeper Pockets"        (startingPickup coins +2)
  +- gen_start_blue          "Soul Reserve"          (startingPickup blue +1)
  +- gen_rare_hub            "Starlit Favor"         (RARE_POOL.star +3)
  |    +- gen_rare_sack      "Bountiful Sack"        (RARE_POOL.sack +3)
  |    +- gen_rare_battery   "Charged Instinct"      (RARE_POOL.battery +3)
  |         +- gen_rare_generous "Generous Recovery" (RARE_POOL.battery +2, COMMON_HEART_POOL.halfheartBlue +2)
  +- gen_leg_hub             "Trinket Sense"         (LEGENDARY_POOL.trinket +3)
  |    +- gen_leg_familiar   "Companion Call"        (LEGENDARY_POOL.familiar +1)
  +- gen_chest_hub           "Cursed Curiosity"      (CHEST_TYPE_POOL.cursed +2)
```

Deliberately organic: five branches of varied width (1 to 7 nodes) and
depth (1 to 3 levels), not a repeated template — matching the topology
philosophy from the Phase 8f rebuild (`audit-skilltree-topology-camera.md`).
`gen_chest_hub` is an intentional single-leaf branch, not padded out to
match its siblings.

## Weight-sizing worst-case table (base weight → worst-case stacked weight)

| Pool.id | base | worst-case stacked | ratio |
|---|---|---|---|
| COMMON_CATEGORY_POOL.penny | 25 | 27 | 1.08x |
| COMMON_PENNY_POOL.nickel | 7 | 9 | 1.29x |
| COMMON_PENNY_POOL.dime | 2 | 3 | 1.50x |
| COMMON_PENNY_POOL.luckypenny | 1 | 2 | 2.00x |
| COMMON_CATEGORY_POOL.heart | 25 | 27 | 1.08x |
| COMMON_HEART_POOL.heartBlue | 25 | 28 | 1.12x |
| COMMON_HEART_POOL.doubleheart | 3 | 4 | 1.33x |
| COMMON_CATEGORY_POOL.bomb | 25 | 28 | 1.12x |
| BOMB_TIER_POOL.doublebomb | 8 | 10 | 1.25x |
| BOMB_TIER_POOL.goldbomb | 2 | 3 | 1.50x |
| COMMON_CATEGORY_POOL.key | 25 | 28 | 1.12x |
| KEY_TIER_POOL.doublekey | 8 | 10 | 1.25x |
| KEY_TIER_POOL.goldkey | 2 | 3 | 1.50x |
| RARE_POOL.star | 20 | 23 | 1.15x |
| RARE_POOL.sack | 20 | 23 | 1.15x |
| RARE_POOL.battery | 15 | 20 | 1.33x |
| COMMON_HEART_POOL.halfheartBlue | 10 | 12 | 1.20x |
| LEGENDARY_POOL.trinket | 48 | 51 | 1.06x |
| LEGENDARY_POOL.familiar | 2 | 3 | 1.50x |
| CHEST_TYPE_POOL.cursed | 10 | 12 | 1.20x |

Every entry is at or under the 2x guideline. `COMMON_PENNY_POOL.luckypenny`
sits exactly at 2x (1 → 2) since it's a single `+1` node on an
already-negligible base weight of 1 within a 100-total pool — accepted as
"roughly no more than doubled" per the brief's own wording, and the
pool-wide impact is negligible regardless (a 1-point swing out of 100).
`RARE_POOL.battery` combines two nodes (`gen_rare_battery` +3 and
`gen_rare_generous` +2) for a worst-case total of +5 on a base of 15
(1.33x), still comfortably under 2x.

## Verification harness output

Ran a throwaway Node `vm` harness (adapted from the Phase 8c harness
pattern; top-level `const`/`function` declared inside `vm.runInContext`
don't land as own properties of the sandbox object, so values were pulled
out via a second `vm.runInContext(name, sandbox)` call per name — same
technique as the Phase 8b-visual harness) that loads `js/data/core.js` (real
`CLASSES`), `js/data/economy.js`, `js/data/collectibles.js` (real
`BOMB_TIER_POOL`/`KEY_TIER_POOL`), `js/achievements/skilltree.js`,
`js/achievements/skilltree-characters.js`,
`js/achievements/skilltree-characters-2.js`, and
`js/achievements/skilltree-general.js` into one sandboxed context (with a
real `Util.clamp`, stub `Util.weighted`/`Util.randi`/`Util.chance`, and stub
`document`/`loadUnlocks`/`saveUnlocks`/`ensureUnlockShape` since none of
those are touched by the functions under test). Full output:

```
PASS: SKILL_TREE_NODES.length === 553 (got 553)
PASS: SKILL_TREE_GENERAL_NODES.length === 25 (got 25)
PASS: no duplicate ids across all 553 nodes
PASS: general_hub subtree has exactly 25 descendant nodes (got 25)
PASS: general_hub subtree exactly equals the 25 SKILL_TREE_GENERAL_NODES ids (reachable set == authored set)
PASS: no cycles: every general node's parent chain terminates cleanly at general_hub
PASS: no orphans: every general node's parent resolves to a real node
  real pool names used at applySkillTreePoolNudge call sites in room.js: COMMON_CATEGORY_POOL, COMMON_PENNY_POOL, COMMON_HEART_POOL, BOMB_TIER_POOL, KEY_TIER_POOL, RARE_POOL, LEGENDARY_POOL, CHEST_TYPE_POOL
PASS: every poolWeight effect's pool string matches a real applySkillTreePoolNudge call site in room.js
PASS: every poolWeight effect's id exists as a real entry in the target pool constant

  worst-case stacked pool-weight check (base -> base+stackedBonus, threshold 2x base):
    COMMON_CATEGORY_POOL.penny: base=25 +stacked=2 -> 27  (1.08x)
    COMMON_PENNY_POOL.nickel: base=7 +stacked=2 -> 9  (1.29x)
    COMMON_PENNY_POOL.dime: base=2 +stacked=1 -> 3  (1.50x)
    COMMON_PENNY_POOL.luckypenny: base=1 +stacked=1 -> 2  (2.00x)
    COMMON_CATEGORY_POOL.heart: base=25 +stacked=2 -> 27  (1.08x)
    COMMON_HEART_POOL.heartBlue: base=25 +stacked=3 -> 28  (1.12x)
    COMMON_HEART_POOL.doubleheart: base=3 +stacked=1 -> 4  (1.33x)
    COMMON_CATEGORY_POOL.bomb: base=25 +stacked=3 -> 28  (1.12x)
    BOMB_TIER_POOL.doublebomb: base=8 +stacked=2 -> 10  (1.25x)
    BOMB_TIER_POOL.goldbomb: base=2 +stacked=1 -> 3  (1.50x)
    COMMON_CATEGORY_POOL.key: base=25 +stacked=3 -> 28  (1.12x)
    KEY_TIER_POOL.doublekey: base=8 +stacked=2 -> 10  (1.25x)
    KEY_TIER_POOL.goldkey: base=2 +stacked=1 -> 3  (1.50x)
    RARE_POOL.star: base=20 +stacked=3 -> 23  (1.15x)
    RARE_POOL.sack: base=20 +stacked=3 -> 23  (1.15x)
    RARE_POOL.battery: base=15 +stacked=5 -> 20  (1.33x)
    COMMON_HEART_POOL.halfheartBlue: base=10 +stacked=2 -> 12  (1.20x)
    LEGENDARY_POOL.trinket: base=48 +stacked=3 -> 51  (1.06x)
    LEGENDARY_POOL.familiar: base=2 +stacked=1 -> 3  (1.50x)
    CHEST_TYPE_POOL.cursed: base=10 +stacked=2 -> 12  (1.20x)
PASS: no pool entry targeted by general nodes exceeds ~2x its base weight under worst-case stacking
PASS: every startingPickup effect's pickup is one of bombs/keys/coins/blue
PASS: every general node has cost===1, non-empty name and desc
PASS: computeSkillTreeLayout runs without error on full 553-node set
PASS: computeSkillTreeLayout returns 553 positions (got 553)
PASS: no x-collisions among nodes at the same depth in full layout
PASS: worst-case per-branch character stat sum (0.19) still <= SKILL_TREE_STAT_CAP (0.25)
PASS: SKILL_TREE_CHARACTER_CONFIG still has 25 entries (unaffected by this phase)

17 passed, 0 failed
ALL PASSED
```

Also:

```
$ node --check js/achievements/skilltree-general.js
(clean, no output)
$ node --check js/systems/room.js
(clean, no output)
$ grep -n "skilltree" index.html
229:<script src="js/achievements/skilltree.js"></script>
230:<script src="js/achievements/skilltree-characters.js"></script>
231:<script src="js/achievements/skilltree-characters-2.js"></script>
232:<script src="js/achievements/skilltree-general.js"></script>
```

## Deviations from the plan

- **Extended pool-nudge coverage to `BOMB_TIER_POOL`/`KEY_TIER_POOL`/
  `CHEST_TYPE_POOL`.** The plan flagged this as optional ("only do it if it
  meaningfully expands what a 'simple general upgrade' can target"). Wrapped
  all three since they meaningfully expand the design space (double/gold
  bomb-and-key tier nudges, cursed-chest odds) without adding engine
  complexity — each is a one-line `Util.weighted(CONST)` →
  `Util.weighted(applySkillTreePoolNudge(CONST, 'Name'))` edit identical in
  shape to the five call sites already wrapped in Phase 8b. Only the two
  room-clear call sites for `BOMB_TIER_POOL`/`KEY_TIER_POOL` and the one
  room-clear call site for `CHEST_TYPE_POOL` were touched — the procedural
  room-population `CHEST_TYPE_POOL` rolls and `rollGenericPickupKind()`'s
  `BOMB_TIER_POOL`/`KEY_TIER_POOL` rolls were left alone as out of scope for
  "room-clear reward pool" nodes.
- **`COMMON_PENNY_POOL.luckypenny` sits exactly at the 2x line** (1 → 2 under
  `gen_loot_luck`'s single `+1`). Documented above: it's the smallest base
  weight in the whole target set, a single non-stackable node, and a 1-point
  swing inside a 100-total pool has negligible practical effect even at
  "double". No other entry reaches 2x (next-highest is 1.50x).
- No other deviations. Node count, topology shape, cost, ids, file
  organization, and script-tag placement all match the plan as given.
