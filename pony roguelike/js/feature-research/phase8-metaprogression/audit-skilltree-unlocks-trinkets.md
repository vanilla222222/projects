# Phase 8e slice 2/4 — 25 new trinkets + `skilltree-unlocks-trinkets.js`

## Files changed

- `js/data/trinkets-2.js` — appended a new labeled block (25 `sk8t_`-prefixed
  `locked:true` trinkets) at the end of the `Object.assign(TRINKETS, {...})`
  call, before its closing `});`.
- `js/systems/items-1.js` — added `t === 'sk8t_...'` terms to 15
  `recalcPlayerStats` formulas: `speed`, `meleeDamage`/`rangedDamage` (shared
  block, both touched identically), `rateDenom` (fire rate), `rangeBonusTiles`
  (range), `critChance`, `critMultiplier`, `luck`, `lifestealChance`,
  `venomChance`, `freezeChance`, `magnetRadius`, `bombRadiusMult`,
  `tearFlags.pierce`, `multishotExtra`, `dodgeChance`, `shopDiscountBonus`.
- `js/systems/combat-2.js` — 3 edits: added `sk8t_giltclasp` to the coin-value
  `coinMult` ternary chain in the `'coin'` pickup case; added an
  `sk8t_boneshakerpouch` branch to the on-kill pickup-drop `else if` chain
  (same shape as `powderpouch`); folded `sk8t_direkegcharm` into the `case
  'bomb':` extra-bomb condition alongside `powderflask`.
- `js/systems/familiars.js` — factored the repeated
  `player.trinketId === 'swarmcollar' ? 0.85 : 1` ternary (7 call sites) into
  a new `familiarRateMult(player)` helper, which now also recognizes
  `sk8t_stormcollar` (0.88 multiplier); all 7 call sites updated to call the
  helper.
- `js/achievements/skilltree-unlocks-trinkets.js` — **new file**: 1 hub node
  (`unlock_trinkets_hub`, parent `unlock_hub`) + 25 leaf nodes, one per new
  trinket, appended onto `SKILL_TREE_NODES`/`SKILL_TREE_NODES_BY_ID`.
- `index.html` — added `<script src="js/achievements/skilltree-unlocks-trinkets.js"></script>`
  after the last existing `skilltree-unlocks-*.js` tag (`skilltree-unlocks-items.js`).
- `js/CODE_REFERENCE.md` — added a short paragraph in the `data/trinkets-1.js,
  trinkets-2.js` section documenting the `sk8t_` batch, and a new
  `### achievements/skilltree-unlocks-trinkets.js` subsection (mirroring the
  three sibling slices' entries) under the skill-tree docs.

No star/familiar/item files touched. No sibling slice's files touched
(`skilltree-unlocks-stars.js`, `skilltree-unlocks-familiars.js`,
`skilltree-unlocks-items.js` were read for pattern reference only).

## Verification output

### `node --check` on every touched JS file
```
js/data/trinkets-1.js: OK
js/data/trinkets-2.js: OK
js/systems/items-1.js: OK
js/systems/combat-2.js: OK
js/systems/familiars.js: OK
js/achievements/skilltree-unlocks-trinkets.js: OK
```

### `node:vm` harness (loads real trinkets-1.js/trinkets-2.js/skilltree.js/skilltree-unlocks-trinkets.js)
```
PASS: exactly 25 new trinket ids listed
PASS: each new trinket id defined exactly once as an object key
PASS: all 25 present in final TRINKETS
PASS: every TRINKETS key is unique (no accidental object-literal collision)
PASS: 26 new skill nodes total (1 hub + 25 leaves)
PASS: no duplicate node ids in SKILL_TREE_NODES
PASS: unlock_trinkets_hub exists and parents to unlock_hub
PASS: all 25 leaves reachable from unlock_trinkets_hub via parent chain
PASS: no cycles in SKILL_TREE_NODES parent chains
PASS: no orphan nodes (parent always resolves)
PASS: every new leaf has a valid {unlock, trinket, id} effect matching a real TRINKETS key
PASS: hub node has effect:null

ALL CHECKS PASSED
```
(The cycle/orphan/dup-id checks run over the FULL `SKILL_TREE_NODES` array,
i.e. including whatever the sibling stars/familiars/items slices had already
landed at the time this ran — still clean.)

### grep cross-check — every `sk8t_` id has an implementation reference
```
sk8t_ironclasp      -> js/systems/items-1.js
sk8t_windveil        -> js/systems/items-1.js
sk8t_leadenlocket    -> js/systems/items-1.js
sk8t_hairspring      -> js/systems/items-1.js
sk8t_boggedgear      -> js/systems/items-1.js
sk8t_farcastbead     -> js/systems/items-1.js
sk8t_narrowscope     -> js/systems/items-1.js
sk8t_glasscannon     -> js/systems/items-1.js
sk8t_deadeyeclasp    -> js/systems/items-1.js
sk8t_ricochetcoil    -> js/systems/items-1.js
sk8t_fourleafpin     -> js/systems/items-1.js
sk8t_witchhazelcharm -> js/systems/items-1.js
sk8t_eelskinwrap     -> js/systems/items-1.js
sk8t_lodestonecharm  -> js/systems/items-1.js
sk8t_cinderpouch     -> js/systems/items-1.js
sk8t_awlspike        -> js/systems/items-1.js
sk8t_twinnotch       -> js/systems/items-1.js
sk8t_hungryfangcharm -> js/systems/items-1.js
sk8t_direstingpin    -> js/systems/items-1.js
sk8t_rimeclasp       -> js/systems/items-1.js
sk8t_hagglerspurse   -> js/systems/items-1.js
sk8t_giltclasp       -> js/systems/combat-2.js
sk8t_boneshakerpouch -> js/systems/combat-2.js
sk8t_stormcollar     -> js/systems/familiars.js
sk8t_direkegcharm    -> js/systems/combat-2.js
```
All 25 wired, none forgotten.

### grep — script tag present in `index.html`
```
236:<script src="js/achievements/skilltree-unlocks-trinkets.js"></script>
```
(Follows the last `skilltree-unlocks-items.js` tag, itself the last of the
sibling-slice tags found at edit time.)

## The 25 new trinkets

Stat-modifying (21, in `recalcPlayerStats`/`items-1.js` unless noted):

| id | effect |
|---|---|
| `sk8t_ironclasp` | +1 damage to all attacks, -10% movement speed |
| `sk8t_windveil` | +9% movement speed |
| `sk8t_leadenlocket` | +14% movement speed, -1 Luck |
| `sk8t_hairspring` | attacks/shots recharge 6% faster |
| `sk8t_boggedgear` | attacks/shots recharge 5% faster, -5% movement speed |
| `sk8t_farcastbead` | +1 tile attack range |
| `sk8t_narrowscope` | +1 tile attack range, -5% crit chance |
| `sk8t_glasscannon` | +8% crit chance, -1 damage to all attacks |
| `sk8t_deadeyeclasp` | +6% crit chance |
| `sk8t_ricochetcoil` | +0.4 crit multiplier |
| `sk8t_fourleafpin` | +2 Luck |
| `sk8t_witchhazelcharm` | +1 Luck, -8% movement speed |
| `sk8t_eelskinwrap` | +5% dodge chance |
| `sk8t_lodestonecharm` | +30px pickup magnet radius |
| `sk8t_cinderpouch` | +12% bomb blast radius |
| `sk8t_awlspike` | ranged bolts pierce +1 enemy |
| `sk8t_twinnotch` | +1 extra ranged bolt (multishot), -8% movement speed |
| `sk8t_hungryfangcharm` | +5% chance any hit heals half a heart (lifesteal) |
| `sk8t_direstingpin` | +4% flat poison chance on hit (not luck-scaled, bosses immune) |
| `sk8t_rimeclasp` | +4% flat freeze chance on hit (not luck-scaled, bosses immune) |
| `sk8t_hagglerspurse` | -8% shop prices |
| `sk8t_giltclasp` | +12% coin value (`combat-2.js` coinMult chain) |

Proc/timing (4, touching combat/familiar code for genuine variety):

| id | effect |
|---|---|
| `sk8t_boneshakerpouch` | 5% chance an enemy drops a bomb on death (`combat-2.js` kill-drop chain) |
| `sk8t_stormcollar` | familiars strike/fire 12% more often (`familiars.js`, new `familiarRateMult` helper) |
| `sk8t_direkegcharm` | bomb pickups give one extra bomb (`combat-2.js` `case 'bomb'`) |

(Counted `sk8t_giltclasp` under stat-modifying since it's a simple additive
value-multiplier lookup, not a proc/timing effect — even though its file is
`combat-2.js` rather than `items-1.js`. Combat/familiar-file-touching total
is 4, within the 3-6 budget.)

## Deviations / notes

- **`familiarRateMult` refactor**: rather than adding a new
  `player.trinketId === 'sk8t_stormcollar' ? 0.88 : 1` term alongside the
  existing `swarmcollar` ternary at all 7 call sites (duplicating the
  expression 7 times), I factored both trinkets into one shared
  `familiarRateMult(player)` helper function and updated all 7 call sites to
  use it. Behaviorally identical to the ad-hoc-duplication approach for
  `swarmcollar` (still returns 0.85 for it) and adds `sk8t_stormcollar`
  cleanly; this is a minor structural deviation from "just add a term" but
  keeps the file DRY rather than pasting the same ternary logic 7 more times.
- Two ids used a name mirroring an existing item elsewhere in a sibling
  slice's audit note (`sk8i_ironclasp`, a heart-container item, appears in
  `skilltree-unlocks-items.js`'s doc) — no actual collision: prefixes are
  disjoint (`sk8i_` vs `sk8t_`) and this was confirmed via the harness's
  "each new trinket id defined exactly once" and "every TRINKETS key is
  unique" checks.
- No `game.js` per-floor/per-room hooks were used (only `combat-2.js` and
  `familiars.js`, per the task's explicit file list for non-stat-modifying
  effects).
