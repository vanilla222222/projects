# Audit — Skill Tree UI polish pass

Scope: rendering/layout/CSS only. No changes to node data (`skilltree-characters.js`)
or purchase/effect engine functions (`canBuySkillNode`, `buySkillNode`,
`getSkillTreeStatBonus`, `applySkillTreeStatBonuses`, `computeSkillTreeLayout`).

## Files changed

- `index.html` — `#skillTreeScreen` gains a `skilltree-overlay` class alongside
  the existing `screen hidden overlay achv-overlay`.
- `style.css` — new `.skilltree-overlay` rule block (full-screen sizing,
  overrides `.achv-overlay`'s centered/padded layout for this panel only);
  `.skilltree-node` content model changed (glyph inside circle + label
  outside, below); new `.skilltree-node-glyph` rule; `.skilltree-node-label`
  repositioned to `position:absolute; top:100%`; `.skilltree-canvas` gained
  `transform-origin:0 0` for the zoom transform.
- `js/achievements/skilltree.js` — `SKILL_TREE_ROW_HEIGHT` bumped `110` → `130`
  and new `SKILL_TREE_BOTTOM_LABEL_ROOM` (`40`) constant added, both to make
  room for the now-external node labels; `buildSkillTreePanel` now renders a
  one-letter `.skilltree-node-glyph` inside each circle plus the existing
  `.skilltree-node-label` (unchanged text, just repositioned via CSS); added a
  non-passive `wheel` listener on `.skilltree-scroll` implementing zoom via
  `canvas.style.transform = 'scale(zoom)'`, clamped `[0.4, 2]` with
  `Util.clamp`, step `0.1`, reset to `1` on every panel rebuild.
- `js/CODE_REFERENCE.md` — `### achievements/skilltree.js` section updated:
  constants list, `buildSkillTreePanel()` description, and the "wired into
  index.html" paragraph now mention the glyph/label split, the wheel-zoom
  listener, and the `.skilltree-overlay` full-screen class.

## What each requirement did

1. **Full-screen overlay** — `.skilltree-overlay` (applied alongside
   `.achv-overlay`, which is untouched and still used as-is by Achievements/
   Bestiary) overrides `padding` to a small `14px 16px 12px` (down from
   `.achv-overlay`'s `40px 16px`) and sets `overflow:hidden` on the outer
   panel. The base `.overlay` class already sets `position:absolute; inset:0`
   (full viewport) — achv-overlay's padding was what visually shrank the
   panel, so removing most of it plus giving `#skillTreeList` `flex:1 1 auto`
   (with `max-width:none`, overriding the shared `.achv-list`'s
   `max-width:760px`) makes the tree-canvas area consume all remaining space
   between the pinned `<h2>`/summary at top and the pinned Close button at
   bottom (both stay in normal flex flow — no floating-corner button needed;
   flex-direction:column from `.screen`/`.overlay` keeps them at the ends).
2. **Scroll-wheel zoom** — `wheel` listener on `.skilltree-scroll` (the
   scroll viewport), `{ passive: false }` + `e.preventDefault()` so page
   scroll never fires; each tick adjusts a local `zoom` variable by `±0.1`,
   clamped `[0.4, 2]` via the already-imported `Util.clamp`, applied as
   `canvas.style.transform = 'scale(zoom)'` with `transform-origin:0 0`
   (top-left anchored, no pan-to-cursor math). `zoom` is a local variable
   inside `buildSkillTreePanel`, so it is not persisted anywhere and always
   starts at `1` on open or on any panel rebuild (e.g. after a purchase).
3. **Circular node buttons** — `SKILL_TREE_NODE_SIZE` was already used for
   both `el.style.width` and `el.style.height` (both `74px`), so the button
   box was already square; the actual problem was long node names (up to
   ~22 characters) rendered as centered text inside a 74px circle with no
   overflow handling, which would visually overflow the circle for most
   real node names. Fixed by moving the full name to `.skilltree-node-label`,
   an absolutely-positioned sibling child pinned at `top:100%` below the
   circle (unclipped, since `.skilltree-node` has no `overflow:hidden` — the
   circle shape itself still comes from `border-radius:50%` on the button's
   own background/border, independent of `overflow`), and giving the circle
   itself only a compact one-letter `.skilltree-node-glyph` (`node.name`'s
   first character, uppercased) as its inside content.
   `SKILL_TREE_ROW_HEIGHT` was bumped from `110` to `130` and a new
   `SKILL_TREE_BOTTOM_LABEL_ROOM` (`40px`) added to the canvas height
   calculation so the below-circle labels have vertical room and the
   bottom-most row's label isn't clipped by the canvas's own bounding box.

## Verification performed

- `node --check js/achievements/skilltree.js` — passes.
- Manual re-read of the CSS/JS diffs for selector correctness: confirmed
  `.skilltree-overlay`, `.skilltree-node-glyph` used consistently between
  `style.css` and `index.html`/`skilltree.js` via `grep`.
- Confirmed the `wheel` listener is attached to `.skilltree-scroll` (the
  actual scroll/viewport element the user's mouse sits over) with
  `{ passive: false }`, required for `preventDefault()` to take effect on
  wheel events in modern browsers.
- Confirmed `Util.clamp` is already used elsewhere in this same file
  (`getSkillTreeStatBonus`), so it's a safe, already-available dependency —
  no new global assumed.
- No browser available in this environment — no screenshot verification was
  possible; this was a careful static read-back only, per the task's own
  allowance for that limitation.

## Deviations from the spec

- Spec offered either "shrink text to fit inside the circle" or "move the
  label outside the circle" — chose the outside-label option per its own
  suggestion, judged cleaner than trying to fit up to ~22-character names
  in a 74px circle at a legible font size.
- Added a one-letter glyph inside the circle (not explicitly requested) so
  the circle isn't a visually empty color blob once the name moved outside;
  this is pure rendering, no new data field, uses `node.name.charAt(0)`.
- Close button was left in normal document flow (bottom of the flex column)
  rather than the alternative "floating close button in a corner" the spec
  offered as an option — both were listed as acceptable; in-flow was simpler
  and avoids any z-index/overlap edge cases.
- `SKILL_TREE_ROW_HEIGHT` (130) and the new `SKILL_TREE_BOTTOM_LABEL_ROOM`
  (40) are pixel-layout constants changed to accommodate the outside-label
  choice above — not touched for any other reason, and `computeSkillTreeLayout`
  itself (the abstract column/row placement algorithm) was left untouched.
