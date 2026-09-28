# Audit — Phase 8e slice 1/4: skill-tree-unlocked stars

25 brand-new stars (`sk8s_` id prefix), each gated behind its own new
skill-tree "unlock" leaf under a new `unlock_stars_hub`, itself a new child
of the previously-childless `unlock_hub`. Ran in parallel with three sibling
slices (trinkets/familiars/items) touching the same `unlock_hub` in
isolation — no sibling files touched.

## Files changed

- `js/data/collectibles.js` — appended 25 new `STAR_TYPES` entries (all
  `locked:true`, id-prefixed `sk8s_`), right after the existing Phase 7a
  batch, before the `STAR_LIST = Object.values(STAR_TYPES)` line.
- `js/systems/stars.js` — appended 25 new `case 'sk8s_...':` blocks to
  `applyStarEffect`'s switch, right after the existing `'alphard'` case.
- `js/achievements/skilltree-unlocks-stars.js` — **new file**. Defines
  `SKILL_TREE_STARS_NODES` (1 hub + 25 leaves) and appends them onto
  `SKILL_TREE_NODES`/`SKILL_TREE_NODES_BY_ID`.
- `index.html` — added
  `<script src="js/achievements/skilltree-unlocks-stars.js"></script>`
  immediately after the last existing `skilltree-*` tag
  (`skilltree-general.js`).
- `js/CODE_REFERENCE.md` — added a Phase 8e paragraph to the existing
  `data/collectibles.js — STAR_TYPES...` section, and a new
  `### achievements/skilltree-unlocks-stars.js` section right after the
  `skilltree-general.js` section.

## Verification

### 1. `node --check`

```
$ node --check js/systems/stars.js && node --check js/achievements/skilltree-unlocks-stars.js
(no output — both clean)
```

### 2. Node `vm` harness

Loads real `js/data/collectibles.js`, `js/achievements/skilltree.js`, and
`js/achievements/skilltree-unlocks-stars.js` into one sandboxed `vm`
context (stub `Util`/`document`/`loadUnlocks`/`saveUnlocks`/
`ensureUnlockShape`, a 1-entry `CLASSES` stub — none of those are touched
by the pure-data append this slice performs). Full output:

```
PASS: exactly 25 sk8s_ star ids in STAR_TYPES (got 25)
PASS: no sk8s_ id collides with a pre-existing STAR_TYPES key
PASS: SKILL_TREE_STARS_NODES.length === 26 (1 hub + 25 leaves) (got 26)
PASS: no duplicate ids across all 30 SKILL_TREE_NODES
PASS: unlock_stars_hub is present
PASS: unlock_stars_hub.parent === unlock_hub
PASS: no orphans: every leaf parent resolves to a real node
PASS: no cycles: every leaf parent chain terminates at start
PASS: all 25 leaves reachable from unlock_stars_hub
PASS: reachable set from unlock_stars_hub is exactly hub + 25 leaves (got 26)
PASS: every leaf effect is {type:unlock, category:star} with a real STAR_TYPES id
PASS: the 25 leaf effect.ids exactly match the 25 sk8s_ STAR_TYPES ids
PASS: all 25 leaf node ids start with sk8s_

ALL CHECKS PASSED
```

(Node count of 30 in the harness = only `skilltree.js`'s own scaffold nodes
— `start` + 1 stubbed class hub + `unlock_hub` + `general_hub` = 4 — plus
this slice's 26; `skilltree-characters*.js`/`skilltree-general.js`/sibling
`skilltree-unlocks-*.js` files aren't loaded in this isolated harness, by
design — this slice only needs to prove its own 26 nodes are internally
sound and correctly parented onto the real `unlock_hub`.)

### 3. Grep cross-checks

```
$ grep -c "case 'sk8s_" js/systems/stars.js
25

$ grep -n "skilltree" index.html
  <div id="skillTreeScreen" class="screen hidden overlay achv-overlay skilltree-overlay">
<script src="js/achievements/skilltree.js"></script>
<script src="js/achievements/skilltree-characters.js"></script>
<script src="js/achievements/skilltree-characters-2.js"></script>
<script src="js/achievements/skilltree-general.js"></script>
<script src="js/achievements/skilltree-unlocks-stars.js"></script>
<script src="js/achievements/skilltree-unlocks-familiars.js"></script>   # sibling slice, landed independently

# every case 'sk8s_...' label has a matching node id in skilltree-unlocks-stars.js
$ for id in $(grep -oE "case 'sk8s_[a-z_]+':" js/systems/stars.js | sed "s/case '//;s/'://"); do
    grep -q "id:'$id'" js/achievements/skilltree-unlocks-stars.js || echo "MISSING NODE for $id"
  done
(no output — no typo drift)
```

## The 25 new stars

All `locked:true` in `STAR_TYPES`, unlocked one-for-one by their matching
skill-tree leaf (not the achievement ladder, not superboss rewards).

| star id | effect |
|---|---|
| `sk8s_pyrrha` | +4 damage for the rest of this room |
| `sk8s_cinder` | Moderate AoE damage to every enemy, scaled to floor depth |
| `sk8s_direstrike` | Deals 75% of the strongest enemy's current HP as damage to it |
| `sk8s_gale` | Knockback nova — blasts every enemy away from you |
| `sk8s_pyroclast` | Drops 4 bombs on the ground |
| `sk8s_thessaly` | +2 red hearts |
| `sk8s_wren` | +3 blue hearts |
| `sk8s_gilded` | Fully restores red AND blue hearts |
| `sk8s_medic` | Drops 3 hearts on the ground |
| `sk8s_frostbind` | Freezes every enemy for 6 seconds |
| `sk8s_venomkiss` | Poisons every enemy for 8 seconds |
| `sk8s_dreadhowl` | Terrifies every enemy — they flee for 6 seconds |
| `sk8s_puppeteer` | Charms the strongest enemy in the room for 14 seconds |
| `sk8s_thornveil` | Blocks the next 2 hits |
| `sk8s_aegis` | Invincible for 15 seconds |
| `sk8s_battery` | Fully recharges the active item |
| `sk8s_farsight` | +1 tile of attack range, permanent (rest of the run) |
| `sk8s_fortune` | +1 Luck, permanent (rest of the run) |
| `sk8s_cartographer` | Reveals the whole floor map, secret rooms included |
| `sk8s_demolition` | Destroys every destructible object in the room |
| `sk8s_prospector` | Drops 5 coins on the ground |
| `sk8s_quartermaster` | Drops 2 keys and 2 bombs on the ground |
| `sk8s_alchemist` | Drops 3 pills on the ground |
| `sk8s_shrine` | Spawns a free item pedestal in this room |
| `sk8s_borealis` | +60% speed for the rest of this room |

Every effect reuses an existing mechanism already present in `stars.js`
(`starDamageBonus`, `starSpeedMult`, `heal`/`healBlue`, `damageAllEnemies`,
`freezeAllEnemies`, `applyRoomWideStatus`, `knockbackNova`,
`luckyPennies`/`starRangeBonus`, `activeCharge`, `eyeUsed`/`revealMap`,
`destroyAllObstacles`, `scatterStarPickups`, `addItemOrTrinketPedestal`) —
no new per-frame system, no new field beyond the already-established
`starRangeBonus` accumulator pattern (Izar's, reused unmodified by
`sk8s_farsight`).

## Skill-tree topology

```
unlock_stars_hub ("Stellar Cartography", parent: unlock_hub, cost 1)
  +- sk8s_pyrrha
  +- sk8s_cinder -> sk8s_direstrike -> sk8s_gale
  +- sk8s_pyroclast
  +- sk8s_thessaly -> sk8s_wren -> sk8s_gilded
  +- sk8s_medic
  +- sk8s_frostbind -> sk8s_venomkiss
  +- sk8s_dreadhowl -> sk8s_puppeteer
  +- sk8s_thornveil -> sk8s_aegis
  +- sk8s_battery -> sk8s_farsight -> sk8s_fortune
  +- sk8s_cartographer -> sk8s_demolition
  +- sk8s_prospector -> sk8s_quartermaster -> sk8s_alchemist
  +- sk8s_shrine
  +- sk8s_borealis
```

13 branches directly off the hub, ranging from single standalone leaves
(4 of them) to 2-deep (4 branches) and 3-deep (3 branches) chains — varied
width/depth per the "hand-varied, tree-like" brief, without introducing any
non-star intermediate hub nodes (the task specifies exactly 26 total nodes:
1 hub + 25 leaves).

## Deviations from the brief

None. One judgment call: the brief's example topology descriptions (and the
`skilltree-general.js` precedent) use extra sub-hub nodes per branch, but
the verification spec for this slice explicitly counts "26 new skill nodes
(1 hub + 25 leaves)" — so branching here is expressed purely through
leaf-parents-leaf chains rather than adding non-unlock hub nodes, to match
that exact node count.
