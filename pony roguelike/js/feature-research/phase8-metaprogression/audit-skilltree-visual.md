# Phase 8b-visual — Skill Tree visual renderer: audit

Replaces `buildSkillTreePanel()`'s flat `.achv-row` list rendering (Phase 8b
scaffold) with an actual visual tree: nodes positioned by a tidy-tree layout
algorithm and connected by SVG lines, root at top growing downward. Pure
rendering change — the data model (`SKILL_TREE_NODES` shape, `parent` field,
`isSkillNodeOwned`/`canBuySkillNode`/`buySkillNode`) is untouched, and no new
leaf-node content was added (still 28 nodes: `start` + 27 hubs).

## Files changed

- `js/achievements/skilltree.js` —
  - **NEW** `computeSkillTreeLayout(nodes)` — pure function (no DOM), takes
    an optional nodes array (defaults to the module-level
    `SKILL_TREE_NODES`), builds a parent→children adjacency map, and
    recursively computes a `{x, y}` slot per node in abstract column/row
    units (post-order: leaves claim the next free column via a shared
    counter, internal nodes' `x` = average of children's `x`, `y` = depth).
    Returns `{positions: {nodeId:{x,y}}, edges:[{from,to}]}`. Handles
    arbitrary branching/depth, not just today's 2-level shape.
  - **NEW** `SKILL_TREE_COLUMN_WIDTH`/`SKILL_TREE_ROW_HEIGHT`/
    `SKILL_TREE_NODE_SIZE`/`SKILL_TREE_PADDING` (130/110/74/50) — pixel
    constants for converting layout units to screen positions.
  - **REPLACED** `buildSkillTreePanel()`'s body (same name/signature, so
    `main.js`'s `openOverlay('skillTreeScreen', buildSkillTreePanel)` /
    `toggleOverlay` wiring needed no changes). Now: computes the layout,
    finds its pixel bounding box, builds a `.skilltree-scroll` >
    `.skilltree-canvas` (sized to the bounding box) containing an absolutely
    positioned `.skilltree-svg` edge layer (one `<line>` per parent-child
    edge, parent bottom-center to child top-center, gold `.owned` class when
    the child is owned) and one absolutely positioned `.skilltree-node`
    button per node on top (classed `.owned`/`.buyable`/`.locked`, `title`
    attribute carrying name/cost/desc as a native tooltip, click handler on
    `.buyable` nodes only, calling `buySkillNode` then re-invoking
    `buildSkillTreePanel()` on success — identical purchase flow to before).
    The summary-line logic (`#skillTreeSummary` text) is untouched.
- `style.css` — new block appended after the existing
  `.skill-buy-btn`/`.skill-row` rules (which are left in place, now dead
  code, in case a future pass wants a fallback — not removed since nothing
  else in the plan asked for their removal and `.skill-row`/`.skill-buyable`
  aren't reused by anything else):
  `.skilltree-scroll` (scroll viewport, `overflow-x:auto` — added here
  rather than on `.achv-list` itself, since `.achv-list` is shared with the
  Achievements/Bestiary panels and per the plan shouldn't gain a horizontal
  scrollbar), `.skilltree-canvas` (relatively positioned, sized inline via
  JS), `.skilltree-svg` (`position:absolute; inset:0; pointer-events:none`),
  `.skilltree-edge` / `.skilltree-edge.owned`, `.skilltree-node` (circular
  button, dark-panel gradient background matching the existing `.achv-row`
  palette), `.skilltree-node.owned` (gold border/glow, matching
  `.achv-row.done`'s existing gold treatment), `.skilltree-node.buyable`
  (purple accent border/glow with a pulse animation, matching
  `.skill-row.skill-buyable`'s existing purple), `.skilltree-node.locked`
  (dimmed/greyscale, `cursor:default`).
- `js/CODE_REFERENCE.md` — edited the existing `### achievements/skilltree.js`
  section in place: added `computeSkillTreeLayout`, the four pixel
  constants, and rewrote the `buildSkillTreePanel()` bullet to describe the
  new SVG-plus-absolutely-positioned-nodes rendering instead of the old flat
  `.achv-row` list. No other bullets in that section changed (node shape,
  effect types, engine functions, purchase flow are all identical to 8b).

## Verification

1. **`node --check js/achievements/skilltree.js`** — clean (only JS file
   touched this pass; `style.css`/`CODE_REFERENCE.md` have no JS syntax to
   check).

2. **Node `vm` harness** (throwaway, run from the scratchpad, not committed)
   — loaded `skilltree.js` into a sandboxed context with a fake `CLASSES`
   (25 entries, matching the real per-character hub count), a real
   `Util.clamp`/`Util.weighted`, fake `loadUnlocks`/`saveUnlocks`/
   `ensureUnlockShape`, and a stub `document` (unused by the layout
   function itself, only needed so the file parses/runs — `document` is
   only touched inside `buildSkillTreePanel`, which the harness never
   calls). Pulled `SKILL_TREE_NODES`/`computeSkillTreeLayout` out of the vm
   context's lexical scope (top-level `const` in `vm.runInContext` doesn't
   land as an own property of the sandbox object) via a second
   `vm.runInContext` call in the same context. Full output:

   ```
   PASS: exactly 28 positions returned
   PASS: start node is at minimum y (root, top)
   PASS: every non-root node's y is exactly parent's y + 1
   PASS: no two leaf nodes at same depth share an x
   PASS: edges array has exactly 27 entries
   PASS: each edge's from/to matches real parent/id fields
   PASS: extended: char_hub_cls1 (depth1) children syn_a/b/c at depth2
   PASS: extended: syn_c1/syn_c2 (grandchildren) at depth3
   PASS: extended: deepest nodes correct depth = 3 (start=0,hub=1,synC=2,synC1/2=3)
   PASS: extended: no x-collisions among leaves (incl. new branching)
   PASS: extended: edges count = 27 + 5 new = 32

   11 passed, 0 failed
   ALL PASSED
   ```

   Covers every assertion the plan asked for on the real 28-node dataset
   (position count, root at min y, exact parent-y+1 depth for every
   non-root node, no x-collisions among same-depth leaves, 27 edges each
   matching a real `parent`/`id` pair), then extends `SKILL_TREE_NODES`
   with synthetic branching content on a copy of the array — three new
   children (`syn_a`/`syn_b`/`syn_c`) under `char_hub_cls1`, and two further
   grandchildren (`syn_c1`/`syn_c2`) under `syn_c`, i.e. 3 levels deep with
   branching at two different points — and re-runs `computeSkillTreeLayout`
   on that extended set, confirming depths land correctly (hub=1, new
   children=2, grandchildren=3) and no x-collisions appear among the new
   leaves, proving the algorithm generalizes to future multi-level
   branching content without changes.

3. No browser available in this environment — the DOM-building code was
   reviewed by hand for structural soundness (correct `createElement`/
   `createElementNS` usage for the SVG namespace, correct class names
   matching the new CSS, positioning via inline `style.left`/`style.top` in
   pixels derived from the layout function's column/row units) but not
   screenshot-verified; that's left for the user to check in-browser per
   house convention (no heavy smoke testing — land the change, light sanity
   check, report).

## Deviations from the plan

- None of substance. The plan's suggested test also asked to assert "no two
  sibling nodes share the same x… actually more precisely: no two leaf
  nodes at the same depth share an x" — implemented as literally specified
  (leaf-only, depth-keyed collision check), since internal (hub) nodes are
  expected to share x-coordinates with their own averaged position in
  degenerate cases and that's not a bug.
- Left `.skill-row`/`.skill-buyable`/`.skill-buy-btn` CSS rules in
  `style.css` in place rather than deleting them, since `buildSkillTreePanel`
  no longer emits those classes but nothing in the plan asked for a cleanup
  pass on now-unused CSS, and deleting them isn't necessary for correctness.
- Did not touch `index.html` — `#skillTreeList`/`#skillTreeSummary`/
  `#skillTreeScreen` markup and `main.js`'s wiring were already sufficient;
  the new DOM is built entirely inside `#skillTreeList` by JS, as the plan
  intended by keeping `buildSkillTreePanel`'s signature/wiring unchanged.
