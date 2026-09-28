# Audit: Mega A step 4 — mandatory cursed gates across character, general, and unlock skill-tree branches

## Status: COMPLETE

All three parts of the approved plan landed, the full verification harness
passes with zero failures, and `js/CODE_REFERENCE.md` was updated in the same
pass. No engine code was touched — `js/achievements/skilltree.js` is
byte-identical. Nothing is half-finished.

## Files changed

- `js/achievements/skilltree-characters-3.js` — **Part 1.** Added
  `SKILL_TREE_CHAR_GATE_CONFIG_3` (26 entries), two small phrasing lookup
  tables (`SKILL_TREE_GATE_CURSE_FLAVOR_3`, `SKILL_TREE_GATE_STAT_LABEL_3`),
  and extended the existing `buildCharacterSkillNodes3` generator to emit
  **26 new cursed gate nodes**. Header comment block updated (node count
  500 → 526, cursed count 174 → 200).
- `js/achievements/skilltree-general.js` — **Part 2.** Added the
  `skillTreeGlobalDebuffEffects(stat, amount)` helper and **2 new cursed
  gate nodes** (`gen_rare_gate`, `gen_leg_gate`); re-pointed `gen_rare_hub`
  and `gen_leg_hub` at them. Header topology comment updated.
- `js/achievements/skilltree-unlocks-items.js` — **Part 3.** +6 gates
  (`sk8i_gate_1..6`).
- `js/achievements/skilltree-unlocks-trinkets.js` — **Part 3.** +10 gates
  (`sk8t_gate_1..10`).
- `js/achievements/skilltree-unlocks-familiars.js` — **Part 3.** +7 gates
  (`sk8f_gate_1..7`).
- `js/achievements/skilltree-unlocks-stars.js` — **Part 3.** +8 gates
  (`sk8s_gate_1..8`).
- `js/CODE_REFERENCE.md` — updated all six of the above files' sections
  (new gate machinery, id conventions, per-file stat/magnitude choices,
  updated per-file and running node counts, new `SKILL_TREE_NODES` total).

**Not touched:** `js/achievements/skilltree.js` (engine), `index.html` (no new
files, so no new script tags), `skilltree-characters.js`,
`skilltree-characters-2.js`.

**Total: 59 new nodes (26 + 2 + 31). `SKILL_TREE_NODES` 1157 → 1216.**

## Design as implemented

### The splice pattern (all three parts)

Identical everywhere, and purely structural — there is no cursed-node code in
the engine. A gate node `G` is inserted between an existing parent `P` and an
existing child `C`: `G.parent = P.id`, then `C.parent` is changed from `P.id`
to `G.id`. `C.parent` is the **only** field on any pre-existing node that this
step rewrote. Since `canBuySkillNode` only requires a node's single `parent`
to be owned, `C` becomes unreachable without first buying `G` and eating its
debuff. Every gate is `cost:1`, `cursed:true`, and carries **only**
negative-amount `stat` effects.

### Part 1 — character trees (26 gates)

After Mega A step 3, every branch opener (`e1/f1/g1/h1`) was cursed, but only
~half the branches also cursed their `X2b` node, so 26 of the 100 payoff
leaves (`e3b/f3b/g3b/h3b`) reached their branch's deepest reward for free.
This step gates exactly those 26.

- Ids: `char_<classId>_<e|f|g|h>x` (e.g. `char_earth_gx`). Verified
  collision-free against all 1157 pre-existing ids.
- Emitted from the file's own generator rather than appended as loose objects,
  keeping the file's authoring style. `SKILL_TREE_CHAR_TOPOLOGY_3` is
  unchanged; the gate is emitted immediately before its `X3b` node and the
  `X3b` node is *constructed* with the gate as its parent, so no node object
  is ever mutated after creation.
- Each gate's debuff lands on the **same stat that branch's own cursed opener
  (`X1`) already reduces**, at `-0.03` — the exact magnitude the existing
  cursed `X2b` nodes use. A gated branch therefore reads as one escalating
  cost on one field, and the cap arithmetic stays on the field that branch was
  already budgeted against.
- Names/descs are generated from a `{curse, site, stat}` table using the
  file's own established phrasing. `curse` is a curse-phrase that character's
  tree does not already use; `site` reuses that branch's own `2b` site noun.

The 26 pairs: earth g/h, pegasus h, batpony g/h, zebra h, seapony g/h,
ponybot h, kirin g/h, dragon h, kelpie g/h, breezie h, crystalpony g/h,
mule h, changeling g/h, diamonddog h, changedling g/h, changelingqueen h,
engineerpony g/h.

**Net result: all 100 payoff leaves in that file are now behind at least one
mandatory curse.**

### Part 2 — general branch (2 gates)

Exactly as specified: `gen_rare_gate` and `gen_leg_gate`, both parented to
`general_hub`, with `gen_rare_hub` / `gen_leg_hub` re-pointed at them. Both
`-0.02` on `luck` (thematic fit for "fortune"). `gen_loot_hub`,
`gen_supply_hub`, `gen_start_hub`, `gen_chest_hub` and all their children are
untouched.

### Part 3 — unlock branches (31 gates) and the classId question

**Engine finding (resolved by reading, before writing any nodes):**
`getSkillTreeStatBonus` matches `eff.classId === classId` against the live
`player.classId`. There is **no `'ALL'` wildcard**, and adding one would be an
engine change (out of scope). The other class-agnostic effect types are all
unusable as debuffs here: a negative `startingPickup` amount would drive
`player.bombs`/`keys`/`coins`/`blueCurrent` below zero (`applySkillTreeStarting
Pickups` has no floor), and a negative `poolWeight` bonus could drive a pool
entry's weight to zero or below inside `Util.weighted`.

**Decision (a deliberate improvement on the plan's stated fallback):** rather
than assigning each gate one arbitrary real classId — which would make a
class-neutral unlock branch punish one randomly-chosen character — each gate
carries an `effects` **array** with one identical negative `stat` entry **per
class**, built by `skillTreeGlobalDebuffEffects(stat, amount)`
(`Object.keys(CLASSES).map(...)`). Every entry has a real classId, so the
engine is used exactly as designed, and the penalty is genuinely universal.
The helper lives in `skilltree-general.js`, which `index.html` loads before all
four unlock files; the `effects` array shape is already handled by
`nodeEffects()` and already used by `gen_rare_generous`.

**Capstone selection.** A "capstone" is a childless node whose parent is a
**non-hub** node — i.e. the deepest leaf of a chain that runs two or more
steps past a hub. Leaves hanging directly off a hub (including the sub-hubs in
the items and familiars files, e.g. `sk8i_offense_hub`, `fam_ranged_hub`) are
left free, per the plan's "leave chains of depth 1 untouched". This yields
6 / 10 / 7 / 8. One note: `sk8i_bloodmarble` forks into two capstones
(`sk8i_healcharm`, `sk8i_echobell`), which are two chains, so each gets its own
gate (`sk8i_gate_5` / `sk8i_gate_6`).

**Stat/magnitude assignment**, chosen to keep every per-(classId, stat)
worst-case sum well inside the `[-0.25, 0.25]` cap:

| File | Gates | Stat(s) @ -0.02 each | Worst-case per class |
|---|---|---|---|
| items | 6 | `critChance` | -0.12 |
| trinkets | 10 | `speed` (gates 1-5), `boltSpeed` (gates 6-10) | -0.10 / -0.10 |
| familiars | 7 | `magnetRadius` | -0.14 |
| stars | 8 | `rangeTiles` | -0.16 |
| general | 2 | `luck` | -0.04 |

Trinkets is the only file split across two stats: with all 10 on one stat it
sat at `-0.20`, which passed the cap check but left almost no headroom for
future passes. Splitting it halves that.

## Verification performed

Node `vm` harness at
`/tmp/claude-1000/.../scratchpad/{harness.js,verify.js}` (scratchpad, not
committed), loading `js/data/core.js` → `skilltree.js` →
`skilltree-characters.js` → `-characters-2.js` → `-characters-3.js` →
`skilltree-general.js` → `-unlocks-stars.js` → `-unlocks-familiars.js` →
`-unlocks-items.js` → `-unlocks-trinkets.js`. **Load order confirmed against
`index.html` lines 230-238** — note the real order puts stars/familiars/items/
trinkets in that sequence, not the items-first order the plan sketched; the
harness matches the real file.

| Check | Result |
|---|---|
| `node --check` on all 6 touched JS files | passes |
| Total `SKILL_TREE_NODES` before → after | 1157 → 1216 (+59, exactly the number of gates added) |
| Duplicate node ids | 0 (1216 unique ids across 1216 nodes) |
| Dangling `parent` references | 0 (every `parent` resolves to a real node id) |
| Cursed nodes (`cursed:true`) total | 233 (174 pre-existing + 59 new) |
| Cursed nodes with 0 children | 0 — every cursed node is a real mandatory gate |
| Cursed nodes with a non-negative `stat` effect | 0 — every cursed node is pure debuff, no contamination |
| New gates: `cursed:true` and `cost:1` | 59/59 |
| New gates with exactly 1 child | 59/59 — every gate gates precisely the node it was spliced in front of |
| Nodes re-parented onto a gate | exactly 59, one per gate — no other node's `parent` changed |
| Per-(classId, stat) worst-case sums, all 272 pairs, full node set | 0 out of range; most negative is `pegasus\|meleeCooldown = -0.190` and `dnbpony\|fireCooldown = -0.190`, both **pre-existing** and unchanged by this pass |
| `computeSkillTreeLayout(SKILL_TREE_NODES)` on all 1216 nodes | runs clean, no exceptions |
| New gate names colliding with any other node name | 0 (one collision found during the pass — `char_crystalpony_gx` — and fixed by re-siting it to "Shattered Resolve of the Facets") |
| Splice-target uniqueness | the patch script asserted each `{ id:'<child>', parent:'<oldParent>',` needle matched exactly once per file before rewriting; it would have thrown otherwise |

Per repo convention this data-only change was **not** browser smoke-tested;
the harness above is the light sanity check.

### The 59 splices (old parent → new gate → child)

- **Characters (26):** `char_<c>_<k>2b` → `char_<c>_<k>x` → `char_<c>_<k>3b`,
  for `<c>/<k>` = earth/g, earth/h, pegasus/h, batpony/g, batpony/h, zebra/h,
  seapony/g, seapony/h, ponybot/h, kirin/g, kirin/h, dragon/h, kelpie/g,
  kelpie/h, breezie/h, crystalpony/g, crystalpony/h, mule/h, changeling/g,
  changeling/h, diamonddog/h, changedling/g, changedling/h,
  changelingqueen/h, engineerpony/g, engineerpony/h.
- **General (2):** `general_hub` → `gen_rare_gate` → `gen_rare_hub`;
  `general_hub` → `gen_leg_gate` → `gen_leg_hub`.
- **Items (6):** `sk8i_gamblerbead`→`sk8i_gate_1`→`sk8i_sharpwhet`;
  `sk8i_hawkloupe`→`sk8i_gate_2`→`sk8i_doubleshot`;
  `sk8i_stormtusk`→`sk8i_gate_3`→`sk8i_shatterfang`;
  `sk8i_luckbead`→`sk8i_gate_4`→`sk8i_grandluck`;
  `sk8i_bloodmarble`→`sk8i_gate_5`→`sk8i_healcharm`;
  `sk8i_bloodmarble`→`sk8i_gate_6`→`sk8i_echobell`.
- **Trinkets (10):** `sk8t_ironclasp`→`_gate_1`→`sk8t_glasscannon`;
  `sk8t_leadenlocket`→`_gate_2`→`sk8t_witchhazelcharm`;
  `sk8t_hairspring`→`_gate_3`→`sk8t_boggedgear`;
  `sk8t_farcastbead`→`_gate_4`→`sk8t_narrowscope`;
  `sk8t_deadeyeclasp`→`_gate_5`→`sk8t_ricochetcoil`;
  `sk8t_lodestonecharm`→`_gate_6`→`sk8t_cinderpouch`;
  `sk8t_awlspike`→`_gate_7`→`sk8t_twinnotch`;
  `sk8t_rimeclasp`→`_gate_8`→`sk8t_boneshakerpouch`;
  `sk8t_hagglerspurse`→`_gate_9`→`sk8t_giltclasp`;
  `sk8t_stormcollar`→`_gate_10`→`sk8t_direkegcharm`.
- **Familiars (7):** `fam_orbit_hollowwisp`→`sk8f_gate_1`→`fam_orbit_briarcub`;
  `fam_ranged_focusgleam`→`_gate_2`→`fam_ranged_duskmirror`;
  `fam_support_gildedpurse`→`_gate_3`→`fam_support_batterygrub`;
  `fam_support_wardencub`→`_gate_4`→`fam_support_bastionmoth`;
  `fam_support_packrat`→`_gate_5`→`fam_support_hoardgull`;
  `fam_skirmish_seedgrub`→`_gate_6`→`fam_skirmish_ironlarva`;
  `fam_skirmish_furyimp`→`_gate_7`→`fam_skirmish_gnatswarm`.
- **Stars (8):** `sk8s_direstrike`→`sk8s_gate_1`→`sk8s_gale`;
  `sk8s_wren`→`_gate_2`→`sk8s_gilded`;
  `sk8s_frostbind`→`_gate_3`→`sk8s_venomkiss`;
  `sk8s_dreadhowl`→`_gate_4`→`sk8s_puppeteer`;
  `sk8s_thornveil`→`_gate_5`→`sk8s_aegis`;
  `sk8s_farsight`→`_gate_6`→`sk8s_fortune`;
  `sk8s_cartographer`→`_gate_7`→`sk8s_demolition`;
  `sk8s_quartermaster`→`_gate_8`→`sk8s_alchemist`.

## Deviations from plan

1. **Unlock-gate debuff shape.** The plan's fallback (if no global debuff is
   supported) was "supply a specific real classId per node, e.g. rotate
   through classes." Implemented instead as a per-class `effects` array
   (`skillTreeGlobalDebuffEffects`), giving a genuinely global debuff with
   real classIds and no engine change. Rationale above. This is strictly
   better than rotation for a class-neutral unlock branch, and it is what the
   plan asked for first ("does a non-class-specific global debuff work?" — it
   does, via the effects array).
2. **Trinkets file uses two stats, not one.** Ten gates on one stat sat at
   `-0.20` of the `-0.25` cap. Split 5/5 across `speed` and `boltSpeed`.
3. **Capstone definition.** Where the plan's two phrasings disagreed
   ("parent is a non-hub node" vs "at least 2 steps from the file hub"), the
   non-hub-parent reading was used, which also matches "leave leaves that hang
   directly off the hub untouched". Under the other reading items would gain
   10 more gates and familiars 2 more. Documented here so it can be revisited
   cheaply if the stricter reading was intended.
4. **Harness load order.** `index.html` loads the unlock files as
   stars → familiars → items → trinkets, not the items-first order the plan
   listed. The harness matches `index.html`.
5. **One gate renamed mid-pass.** `char_crystalpony_gx` was originally
   "Shattered Resolve of the Convergence", which collided with an existing
   node name; re-sited to "Shattered Resolve of the Facets".

## Open risks

- **Pre-existing duplicate node names** (surfaced by the harness, *not*
  introduced or fixed here — out of scope): "Widening Halo"
  (`char_alicorn_c3a` / `char_changedling_c1`), "Overdriven Bassline"
  (`char_dnbpony_d3a` / `char_dnbpony_g3a` — same character, so this one is
  actually visible to a player), "Redlined Payoff" (`char_ponybot_e3b` /
  `char_dnbpony_g3b` / `char_engineerpony_f3b`), "Whisper of Doubt of the
  Molt" (`char_griffin_g1` / `char_changeling_g1` / `char_changedling_e2b`).
  Cheap to fix in a future content pass.
- **Cap headroom is a shared budget.** The `skillTreeGlobalDebuffEffects`
  approach spends the negative half of the `[-0.25, 0.25]` clamp for *every*
  class at once on the chosen stat. Current worst case per stat is `-0.16`
  (stars/`rangeTiles`). Any future pass adding more global gates must re-run
  the per-(classId, stat) cap check rather than assuming headroom.
- **Effect-count growth.** 31 unlock gates × 25 classes = 775 extra effect
  objects. `getSkillTreeStatBonus` skips unowned nodes before reading their
  effects, so the cost is only paid by a player who has actually bought the
  gates; no measurable impact expected, but it is the one place this design
  costs more than a single-classId node would.
- **Not play-tested.** Per repo convention the user verifies by playing. The
  skill-tree panel's layout/rendering was only checked via
  `computeSkillTreeLayout` running clean on all 1216 nodes.

## Next steps

- **Mega A step 5** — redesign ~250 generic items into unique,
  attack-type-differentiated items.
- **Mega B step 6** — run history panel.
- **Mega B step 7** — Isaac-style per-floor curses.
- **Mega B step 8** — pickup GUI polish.
