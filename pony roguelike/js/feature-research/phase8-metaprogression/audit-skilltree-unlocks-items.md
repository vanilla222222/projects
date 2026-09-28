# Audit — Phase 8e slice 4/4: skilltree-unlocks-items.js

25 brand-new passive items, each gated behind its own new skill-tree unlock
node. Ran in parallel with 3 sibling slices (stars/trinkets/familiars);
their files were not touched.

## Files changed

- `js/data/items-5.js` — appended 25 new `sk8i_`-prefixed passive item
  entries (all `locked:true`, `pools:POOLS_ALL` except `sk8i_pullstone`/
  `sk8i_sharpwhet`/`sk8i_swiftdodge` which use `pools:POOLS_SPECIAL`,
  matching the existing convention for magnet/crit-multiplier/dodge items).
- `js/systems/items-1.js` — 17 edits to `recalcPlayerStats`, one
  `N * (p.sk8i_id || 0)` (or equivalent) term per stat-bearing item, added
  at the existing formula site for that stat (speed, meleeDamage,
  rangedDamage, luck, rateDenom, rangeBonusTiles, magnetRadius, critChance,
  critMultiplier, lifestealChance, freezeChance, venomChance, charmChance,
  onKillHealChance, dodgeChance, bombRadiusMult, tearFlags.pierce,
  multishotExtra).
- `js/systems/items-2.js` — 1 edit to `applyPassiveEffect`'s heart-container
  special-case chain: `sk8i_ironclasp` added to the `grantHeartContainer(1)`
  branch, `sk8i_secondheart` added to the `grantHeartContainer(2)` branch.
- `js/achievements/skilltree-unlocks-items.js` — **new file**. 1 hub node
  (`unlock_items_hub`, child of `unlock_hub`) + 25 leaf nodes, appended onto
  `SKILL_TREE_NODES`/`SKILL_TREE_NODES_BY_ID`.
- `index.html` — added
  `<script src="js/achievements/skilltree-unlocks-items.js"></script>`
  after the last existing `skilltree-*` tag found at edit time
  (`skilltree-unlocks-familiars.js`, added concurrently by a sibling slice).
- `js/CODE_REFERENCE.md` — added a note in the ITEMS-table section (near the
  existing familiars-batch note) and a new
  `### achievements/skilltree-unlocks-items.js` section (mirroring the
  stars/familiars sections) describing the file, the `sk8i_` prefix
  convention, and the 25 items.

## Verification

### 1. `node --check` on every touched JS file

```
OK: js/data/items-1.js
OK: js/data/items-2.js
OK: js/data/items-3.js
OK: js/data/items-4.js
OK: js/data/items-5.js
OK: js/achievements/skilltree-unlocks-items.js
OK: js/systems/items-1.js
OK: js/systems/items-2.js
```

### 2. `node:vm` harness

Loads real `js/data/items-1.js` … `items-5.js`, `js/data/lists.js`,
`js/achievements/skilltree.js`, and the new
`js/achievements/skilltree-unlocks-items.js` into one sandboxed context,
then checks item/id collisions, node-graph connectivity, and effect
validity:

```
PASS: exactly 25 new item ids listed
PASS: all 25 new items exist in ITEMS
PASS: no duplicate keys among the 25 new item ids
PASS: all 25 new items are locked:true, type:passive, with pools set
PASS: exactly 26 new skill nodes (1 hub + 25 leaves)
PASS: no duplicate node ids in SKILL_TREE_NODES
PASS: unlock_items_hub exists and parents to unlock_hub
PASS: all 25 leaf nodes reachable from unlock_items_hub via parent chain, no cycles
PASS: no orphan nodes (parent always resolves)
PASS: every unlock effect has category:item and a real ITEMS id
PASS: the 25 leaf nodes unlock exactly the 25 new items, one each

Summary: ALL CHECKS PASSED
```

(Harness source kept at
`/tmp/claude-1000/.../scratchpad/verify-items.js` for this session — not
committed to the repo, per the "don't touch production" scope; rerunnable
by anyone who wants to re-derive it from the description above.)

### 3. `sk8i_` stat-wiring grep

Every `sk8i_` id checked for at least one `p.sk8i_id` reference in
`items-1.js`/`items-2.js`, or an equivalent `item.id === 'sk8i_id'`
special-case in `items-2.js`. 24 of 25 have a `p.sk8i_id` stat term.
`sk8i_ricochetcoin` has none — deliberately: like the existing
`gamblerscoin` item, its entire effect is its `attackLayer` (`ricochetBolt`),
which is dispatched per-owned-item independent of `recalcPlayerStats`, not
an aggregated `N * count` stat term. Confirmed not an oversight by cross-
checking `gamblerscoin`'s own `ricochetBolt` layer has the identical shape
with no dedicated `p.gamblerscoin`-in-a-ricochet-formula term either (it
only shows up in luck/crit formulas, unrelated to the ricochet mechanic
itself).

### 4. Script-tag check

```
$ grep -n "skilltree-unlocks-items" index.html
235:<script src="js/achievements/skilltree-unlocks-items.js"></script>
```

Placed after `skilltree-unlocks-familiars.js` (the last `skilltree-*` tag
present at edit time).

## The 25 new items

All ids prefixed `sk8i_`. Quality shown in parentheses.

| id | q | effect |
|---|---|---|
| `sk8i_glassmarble` | 1 | +1 damage to all attacks |
| `sk8i_windlace` | 1 | +15% movement speed |
| `sk8i_luckbead` | 1 | +1 Luck |
| `sk8i_ironclasp` | 2 | +1 heart container |
| `sk8i_hawkloupe` | 1 | ranged bolts pierce +1 |
| `sk8i_ticktock` | 1 | attacks/shots recharge faster |
| `sk8i_farstep` | 1 | +1 range tile (ranged; melee at reduced rate) |
| `sk8i_pullstone` | 1 | +25px magnet radius |
| `sk8i_bloodmarble` | 2 | 6% chance any hit heals half a heart |
| `sk8i_frostspindle` | 1 | 5% chance to freeze on hit |
| `sk8i_venomthorn` | 1 | 5% chance to poison on hit |
| `sk8i_charmreed` | 1 | 5% chance to charm on hit |
| `sk8i_healcharm` | 2 | 5% chance to heal half a heart on kill |
| `sk8i_gamblerbead` | 2 | +5% critical hit chance |
| `sk8i_sharpwhet` | 2 | +0.3 crit damage multiplier |
| `sk8i_bombshell` | 1 | +10% bomb blast radius |
| `sk8i_secondheart` | 3 | +2 heart containers |
| `sk8i_doubleshot` | 3 | +1 extra ranged bolt (multishot) |
| `sk8i_swiftdodge` | 2 | +5% dodge chance |
| `sk8i_grandluck` | 3 | +3 Luck |
| `sk8i_stormtusk` | 2 | +1 damage; hits knock target back (`knockbackPulse` strength 6) |
| `sk8i_shatterfang` | 2 | +1 damage; melee cracks the ground around target (`impactBurst` radius 50, power 0.3) |
| `sk8i_echobell` | 2 | +1 damage; attacks echo a moment later (`echoShot` delay 0.3, power 0.3) |
| `sk8i_ricochetcoin` | 1 | bolts bounce off one wall (`ricochetBolt` bounces 1) |
| `sk8i_fragmentshard` | 3 | +1 damage; kills launch 2 homing fragments (`onKillFragments` fragments 2, power 0.3) |

## Skill-tree topology

`unlock_items_hub` ("Forgotten Workshop", child of `unlock_hub`, cost 1) with
4 sub-branches (25 leaves total):

- **Offense Cache** (`sk8i_offense_hub`, 9 nodes): `sk8i_glassmarble` (hub
  leaf) → `sk8i_gamblerbead` → `sk8i_sharpwhet`; `sk8i_glassmarble`'s hub
  also parents `sk8i_hawkloupe` → `sk8i_doubleshot`, `sk8i_ticktock`,
  `sk8i_stormtusk` → `sk8i_shatterfang`, and `sk8i_fragmentshard`.
- **Utility Cache** (`sk8i_utility_hub`, 6 nodes): `sk8i_windlace` (hub
  leaf) parents `sk8i_farstep`, `sk8i_pullstone`, `sk8i_bombshell`, and
  `sk8i_luckbead` → `sk8i_grandluck`.
- **Survival Cache** (`sk8i_survival_hub`, 6 nodes): `sk8i_ironclasp` (hub
  leaf) parents `sk8i_secondheart` and `sk8i_swiftdodge`; a second chain off
  the hub directly: `sk8i_bloodmarble` → (`sk8i_healcharm`,
  `sk8i_echobell`).
- **On-Hit Cache** (`sk8i_onhit_hub`, 4 nodes): `sk8i_frostspindle` (hub
  leaf) parents `sk8i_venomthorn`, `sk8i_charmreed`, `sk8i_ricochetcoin`.

1 hub + 9 + 6 + 6 + 4 = 26 nodes, matching the 1-hub + 25-leaf requirement
(the 4 sub-hubs double as their branch's first item-unlock leaf, same
pattern used by `skilltree-unlocks-familiars.js`/`-stars.js`).

## Deviations from the brief

- None of substance. One clarification: `sk8i_ricochetcoin` has no
  dedicated `p.sk8i_ricochetcoin` term in `recalcPlayerStats` because its
  whole effect is the `attackLayer`, which is legitimate (see verification
  §3) — flagged explicitly here since the brief's grep step calls this out
  as something to catch.
- Heart-container items (`sk8i_ironclasp`, `sk8i_secondheart`) were wired
  via the `applyPassiveEffect` special-case id list in `items-2.js`, per
  the brief's instruction, rather than a `recalcPlayerStats` term.
