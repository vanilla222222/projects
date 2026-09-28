# Audit — Skill Tree: camera persistence fix + per-character topology reshape (Phase 8f)

Two independent fixes to the already-shipped skill tree, per the build-opus
brief. Neither touches node `id`/`name`/`desc`/`effect(s)` content anywhere.

## Files changed

- `js/achievements/skilltree.js` — camera-persistence fix: hoisted `zoom`/
  `panX`/`panY` from function-locals inside `buildSkillTreePanel()` to
  module-level `skillTreeZoom`/`skillTreePanX`/`skillTreePanY`, added
  `resetSkillTreeCamera()`, and rewired the wheel/drag handlers and the
  default-view computation to read/write the hoisted variables. Comment
  updated at the pan/zoom block to describe the new persistence behavior.
- `js/main.js` — the three call sites that open the skill tree panel now
  reset the camera explicitly before building: `KeyK`'s `toggleOverlay`,
  `#pauseSkillTreeBtn`'s `openOverlay`, and `#skillTreeBtn`'s `openOverlay`
  all changed from passing `buildSkillTreePanel` directly to passing
  `() => { resetSkillTreeCamera(); buildSkillTreePanel(); }`. The internal
  purchase-triggered rebuild (inside `buildSkillTreePanel`'s buy-button
  click handler) still calls `buildSkillTreePanel()` directly, with no
  reset, so a purchase leaves the camera exactly where the player left it.
- `js/achievements/skilltree-characters.js` — replaced the single global
  `PARENT_KEY` lookup (identical shape for all 25 characters) with a new
  `SKILL_TREE_CHAR_TOPOLOGY` table: one hand-designed `{key: fullParentId}`
  map per `classId`, covering that file's 10 keys (`a1/a2a/a3a/a2b/a3b/
  b1/b2a/b3a/b2b/b3b`). `buildCharacterSkillNodes` now resolves each node's
  `parent` via this table instead of the old flat map. No other change to
  this file's shape/export mechanism; `SKILL_TREE_CHARACTER_CONFIG`'s node
  content (`name`/`desc`) is completely untouched.
- `js/achievements/skilltree-characters-2.js` — same treatment: new
  `SKILL_TREE_CHAR_TOPOLOGY_2` table (10 keys `c1/c2a/c3a/c2b/c3b/d1/d2a/
  d3a/d2b/d3b`), `buildCharacterSkillNodes2` resolves parents via it. Node
  content (`name`/`desc`/`effects`) completely untouched.
- `js/CODE_REFERENCE.md` — updated the `buildSkillTreePanel()` bullet
  (camera-persistence behavior, `resetSkillTreeCamera`, the new open-vs-
  rebuild distinction) and the wiring paragraph in the `### achievements/
  skilltree.js` section; updated the Topology bullet in the `###
  achievements/skilltree-characters.js` section to describe the hand-varied
  per-character topology table and its cross-file id-string resolution.

No other files were touched. No node ids, names, descriptions, effects, or
amounts were added, removed, or edited anywhere — this is a pure `parent`-
field reassignment plus the camera JS fix.

## Fix 1 — camera persistence

**Root cause confirmed by reading `buildSkillTreePanel()` in full**: `zoom`,
`panX`, `panY` were declared with `let` *inside* `buildSkillTreePanel()`,
so every call — including the one the buy-button's own click handler makes
right after a successful purchase (`if (buySkillNode(node.id))
buildSkillTreePanel();`) — got a fresh `zoom = 1; panX = 0; panY = 0;` and
recomputed the default centered-on-`start` view from scratch, discarding
whatever the player had panned/zoomed to.

**Fix**: `skillTreeZoom`/`skillTreePanX`/`skillTreePanY` now live at module
scope, initialized to `null`/`0`/`0`. `skillTreeZoom == null` is the "unset"
sentinel; `buildSkillTreePanel()` only computes+applies the default view
when it sees that sentinel, otherwise it reuses whatever's already there
and just calls `applyTransform()`. `resetSkillTreeCamera()` sets the
sentinel back. The three real "open the panel" call sites in `main.js`
(`KeyK`, `#pauseSkillTreeBtn`, `#skillTreeBtn`) now call
`resetSkillTreeCamera()` immediately before `buildSkillTreePanel()`; the
purchase-triggered internal rebuild does not, so it inherits the persisted
camera state. The wheel-zoom and click-drag handlers were also updated to
read/write the same hoisted variables (they previously closed over the
function-local `zoom`/`panX`/`panY`, which is exactly why the persistence
bug existed in the first place — those handlers only ever mutated a copy
that got thrown away on the next rebuild anyway).

Verified: `node --check` on `skilltree.js` and `main.js` (both clean — see
below). Not smoke-tested in a browser per the no-heavy-smoke-testing
preference; this is a light sanity check only, the user verifies by
playing.

## Fix 2 — per-character topology reshape

### Method

Each character's 20 existing nodes decompose into exactly four original
"branches" (`A`=`a1/a2a/a3a/a2b/a3b`, `B`=`b1/...`, `C`=`c1/...`,
`D`=`d1/...`), each shaped `opener → {subpath1 → leaf1, subpath2 → leaf2}`.
The brief's one hard constraint — a node that was deeper in its *own*
original chain must still require strictly more prior purchases to reach
than a shallower node in that *same* chain — reduces to: within each
branch, the opener must remain an ancestor of both subpath heads, and each
subpath head must remain an ancestor of its own leaf. Everything else
(which node hangs off which, how many levels deep, how wide, whether a
branch attaches straight to the hub or gets grafted deep inside another
branch — even a branch defined in the *other* file) was fair game.

A small design/generation script
(`design_topology.js`/`plans.js`/`generate.js`, not checked into the repo —
scratch tooling only) modeled four "internal shapes" per branch (`Y`, a
straight 5-node `chain`, a `latefork` where the second subpath forks off
the first subpath instead of the opener, and a `chain2` wide-fork-partway
variant), plus an "attach point" per branch (the hub, or any specific node
belonging to an earlier-placed branch — including a node from the *other*
file, resolved purely by id string since both files load before the panel
is ever built). It then validated every one of the 25 hand-authored plans
programmatically (ancestor-order constraint, acyclic, fully reachable) and
computed a "shape signature" (hub-direct-child count, sorted subtree sizes,
max depth) per character to steer real variety before the topology was
transcribed into the two source files as explicit `{classId: {key:
fullParentId}} ` tables (`SKILL_TREE_CHAR_TOPOLOGY` /
`SKILL_TREE_CHAR_TOPOLOGY_2`).

### A mathematical bound on signature variety (why 15/25, not 25/25)

Because each of the four original branches is a fixed 5-node block whose
5 nodes must always land together in whatever subtree contains its
opener's attachment point (the ancestor constraint forces this — a
branch's own nodes can never be split across two different top-level
hub-children), every hub-direct child's subtree size is necessarily a
multiple of 5, and the four blocks can only be partitioned among hub
children in one of exactly 5 ways: `{4}`, `{3,1}`, `{2,2}`, `{2,1,1}`,
`{1,1,1,1}`. That means the crude `(hub children, subtree sizes)` part of
a "shape signature" has a **hard ceiling of 5 distinct values** across any
number of characters — this is a real structural fact of the "20 fixed
nodes, order-preserving" puzzle, not a shortcoming of the topology design.

To get genuine per-character variety beyond that ceiling, the signature
used for verification also includes **max tree depth**, which varies
continuously with each branch's internal shape (`Y` branches cap out at
depth 3 from their own root; `chain`/`chain2`/`latefork` branches reach
depth 4-5) and with how deeply branches get grafted into each other. This
is the richer, three-part signature the harness actually computes and
reports (see below) — **15 of 25 distinct** with this metric, distributed
across all 5 possible size-partitions, with 0 of 25 exactly matching the
literal old rigid-template signature (`4 hub children | [5,5,5,5] |
depth 4`). The bar was set at 15 (matching the brief's example number)
after confirming 15 is what a reasonable-effort hand-crafted pass actually
achieves against this bound — pushing further would mean either exceeding
the informal "no cookie-cutter template take 2" guidance by leaning harder
on merges (fewer, bigger branches for more characters) or accepting some
`{1,1,1,1}`-partition characters that only differ from the old template by
one branch's internal shape (a real but small structural difference).

### Verification harness output

Node `vm` harness (`verify.js`, adapted from the established Phase
8b/8c loader pattern), loading the real `js/core/utils-1.js` (for `Util`),
`js/data/core.js` (real `CLASSES`), `js/achievements/skilltree.js`,
`skilltree-characters.js`, and `skilltree-characters-2.js` into one
sandboxed `vm` context, then running all 7 checks from the brief:

```
PASS: total node count is 528
PASS: no duplicate node ids
PASS: classId count is 25
PASS: every character has exactly 20 nodes
PASS: no orphaned/dangling-parent nodes across all 25 characters
PASS: no cycles across all 25 characters

Shape signatures (nHubChildren | sorted subtree sizes | max depth):
  earth              4|5,5,5,5|depth6
  pegasus            3|5,5,10|depth8
  unicorn            2|10,10|depth9
  batpony            2|5,15|depth12
  zebra              1|20|depth12
  hypogriff          4|5,5,5,5|depth5
  seapony            3|5,5,10|depth8
  ponybot            2|10,10|depth9
  griffin            2|5,15|depth11
  kirin              4|5,5,5,5|depth5
  dragon             3|5,5,10|depth8
  windigo            2|10,10|depth7
  kelpie             1|20|depth13
  breezie            2|5,15|depth11
  dnbpony            4|5,5,5,5|depth6
  crystalpony        3|5,5,10|depth9
  mule               2|10,10|depth7
  alicorn            2|5,15|depth10
  changeling         1|20|depth15
  diamonddog         4|5,5,5,5|depth5
  gargoyle           3|5,5,10|depth7
  changedling        2|10,10|depth8
  changelingqueen    2|5,15|depth12
  filly              4|5,5,5,5|depth6
  engineerpony       1|20|depth16
Distinct signatures: 15 / 25
PASS: not all 25 characters share the OLD rigid-template signature (4|5,5,5,5|depth4)
PASS: at least 15 distinct shape signatures across the 25 characters (bar chosen per the mathematically-bounded partition space — see audit)
PASS: per-character per-stat worst-case sum stays within [-0.25, 0.25]
PASS: computeSkillTreeLayout runs without error on the reshaped 528-node set
PASS: computeSkillTreeLayout produces 528 positions
PASS: no x-collisions among same-depth leaves

============================
ALL CHECKS PASSED
```

`node --check` on all three touched skill-tree files:

```
OK: js/achievements/skilltree.js
OK: js/achievements/skilltree-characters.js
OK: js/achievements/skilltree-characters-2.js
```

(`js/main.js` was also `node --check`ed clean separately, for the camera
fix's call-site edits.)

The partition breakdown actually used across the 25 characters: `{1,1,1,1}`
× 6 (earth, hypogriff, kirin, dnbpony, diamonddog, filly — each with a
different mix of branch-internal shapes, so depths split 5/6 rather than
all sitting at the original's depth 4), `{2,1,1}` × 5, `{2,2}` × 5, `{3,1}`
× 5, `{4}` × 4 (zebra/kelpie/changeling/engineerpony — full single-chain
merges of all four branches, each with a different merge order/shape mix
giving 4 distinct depths: 12/13/15/16).

## Deviations from the brief

- **Signature bar**: the brief said "assert at least, say, 15+ ... adjust
  the exact bar to whatever you actually achieve." Achieved exactly 15/25
  distinct on the richer 3-part signature; see the mathematical-bound
  discussion above for why the simpler 2-part (children+sizes only)
  signature is hard-capped at 5 distinct values regardless of design
  effort, given the "20 fixed nodes, 4 order-preserving 5-node blocks"
  shape of the puzzle. This isn't a shortfall against the brief — the
  bound is a structural fact of preserving depth-implied power level per
  the brief's own trade-off-preservation requirement — but it's called out
  explicitly here since the brief's "not all 25 share the OLD template
  signature" phrasing could be read as implying much higher raw variety
  should be trivially achievable.
- **Design/generation scripts** (`design_topology.js`, `plans.js`,
  `generate.js`, `verify.js`) were scratch tooling used to derive and
  validate the 25 topology tables and are not part of this deliverable's
  file changes — they live only in the session scratchpad, not the repo.
  The actual topology data was transcribed by hand from their output into
  the two source files as the `SKILL_TREE_CHAR_TOPOLOGY`/`_2` tables.
- Everything else matches the brief as given.
