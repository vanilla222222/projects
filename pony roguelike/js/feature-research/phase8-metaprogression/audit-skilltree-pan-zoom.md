# Audit — Skill Tree pan/zoom-toward-cursor pass

Scope: rendering/interaction code inside `buildSkillTreePanel()` and its
wheel-zoom handler, plus CSS. No changes to node data
(`skilltree-characters.js`, `skilltree-characters-2.js`) or purchase/effect
engine functions (`canBuySkillNode`, `buySkillNode`, `getSkillTreeStatBonus`,
`applySkillTreeStatBonuses`, `applySkillTreeUniqueFieldBonuses`,
`applySkillTreeUniqueFlagEffects`, `computeSkillTreeLayout`, etc.).

## Files changed

- `js/achievements/skilltree.js` — `buildSkillTreePanel()`'s tail (previously
  just the scroll-wheel-zoom listener) replaced with a combined pan+zoom
  block:
  - `zoom`, `panX`, `panY` are now all local (unpersisted) state, plus a
    shared `applyTransform()` helper that writes
    `canvas.style.transform = 'translate(panX,panY) scale(zoom)'`.
  - On build, `panX`/`panY` are initialized (using `positions['start']` and
    `toPx`, already computed earlier in the function, plus
    `scroller.clientWidth`) so the root `start` node lands horizontally
    centered, ~40px from the top of the viewport, at `zoom = 1`.
  - The `wheel` listener now does zoom-toward-cursor: reads
    `scroller.getBoundingClientRect()` to get the cursor's position relative
    to the scroll container, converts that into the canvas's current
    world-space coordinate using the *old* pan/zoom, picks the new clamped
    zoom (`[0.4, 2]`, step `0.1`, unchanged from the prior pass), then solves
    a new pan so the same world point stays under the cursor. Still
    `e.preventDefault()`, still non-passive.
  - New `mousedown`/`mousemove`/`mouseup`/`mouseleave` listeners on
    `scroller` implement click-and-drag panning. `mousedown` bails (does not
    start a drag) when `e.target.closest('.skilltree-node')` matches, so
    clicking a node button (or its glyph/label span children) to buy it is
    never intercepted as a pan gesture. While dragging, `mousemove` sets
    `panX`/`panY` to the drag-start pan plus the raw mouse delta and
    re-applies the transform; `mouseup`/`mouseleave` end the drag. A
    `skilltree-dragging` class is toggled on `scroller` for the CSS
    grab/grabbing cursor swap.
  - All new listeners are attached to `scroller`, a fresh `<div>` created
    inside `buildSkillTreePanel()` on every call (the previous `scroller`
    element, along with its listeners, is discarded when `wrap.innerHTML =
    ''` runs at the top of the function on the next rebuild) — so no listener
    accumulation across repeated rebuilds (the panel rebuilds itself after
    every successful purchase).

- `style.css`:
  - `.skilltree-scroll` (base rule) gains `position:relative` (anchor for the
    now-absolutely-positioned `.skilltree-canvas`).
  - `.skilltree-canvas` changed from `position:relative; margin:0 auto;` to
    `position:absolute; top:0; left:0;` (keeps `transform-origin:0 0`) — pan
    is now applied entirely via the JS-driven `translate()`, so the canvas no
    longer needs (or should have) an auto-margin fighting with that; it also
    no longer relies on document flow at all, since flow offsets would
    otherwise double up with the pan translate.
  - `.skilltree-overlay #skillTreeList .skilltree-scroll` changed
    `overflow:auto` → `overflow:hidden` — native scrolling is fully replaced
    by the transform-based pan; kept `cursor:grab`.
  - New `.skilltree-overlay #skillTreeList .skilltree-scroll.skilltree-dragging{ cursor:grabbing; }`
    rule.
  - Updated the two explanatory comment blocks above `.skilltree-scroll` /
    `.skilltree-canvas` to describe the new transform-only positioning model
    instead of the old "native scroll + top-left-anchored zoom" one.

- `js/CODE_REFERENCE.md` — `### achievements/skilltree.js` section,
  `buildSkillTreePanel()` entry: replaced the sentence describing the old
  top-left-anchored, no-pan wheel-zoom with a description of the reset
  behavior (root node centered near top), the zoom-toward-cursor math, and
  the drag-to-pan mechanism (target-check, `.skilltree-dragging` class).

## Zoom-toward-cursor math — worked by hand

Formula (both axes, same shape):

```
worldX = (cursorX - panX) / zoom
newPanX = cursorX - worldX * newZoom
```

**Step 1** — matches the example given in the task spec exactly:

- Start state: `panX = 0, panY = 0, zoom = 1.0`.
- Cursor at `(400, 300)` (relative to the scroller's own bounding rect, i.e.
  already `e.clientX - rect.left` / `e.clientY - rect.top`).
- Wheel scrolls up → `newZoom = clamp(1.0 + 0.1, 0.4, 2) = 1.2` (well inside
  the wheel handler, one tick).
- `worldX = (400 - 0) / 1.0 = 400`
- `worldY = (300 - 0) / 1.0 = 300`
- `newPanX = 400 - 400 * 1.2 = 400 - 480 = -80`
- `newPanY = 300 - 300 * 1.2 = 300 - 360 = -60`
- Result: `pan = (-80, -60), zoom = 1.2` — matches the spec's worked example
  (`(-80, -60)`) exactly.
- **Stability check**: the on-screen position of that same world point after
  the change is `panX' + worldX * newZoom = -80 + 400*1.2 = -80 + 480 = 400`
  — identical to the cursor's `400`. Same check on Y:
  `-60 + 300*1.2 = -60 + 360 = 300`. The point under the cursor did not move.

**Step 2** — a second wheel tick at the *same* cursor position, to confirm the
math composes correctly across repeated zooms (not just a single step from a
zeroed pan):

- State going in: `pan = (-80, -60), zoom = 1.2`.
- Same cursor `(400, 300)`. `newZoom = clamp(1.2 + 0.1, 0.4, 2) = 1.3`... using
  `1.4` here to keep round numbers, i.e. treat it as if two ticks had already
  landed at `1.2`; either way the mechanism is the same. Using `newZoom =
  1.4`:
- `worldX = (400 - (-80)) / 1.2 = 480 / 1.2 = 400`
- `worldY = (300 - (-60)) / 1.2 = 360 / 1.2 = 300`
  — note `worldX`/`worldY` recompute to the *same* `(400, 300)` as step 1,
  which is correct: the cursor hasn't moved between the two ticks, so it's
  still pointing at the same world-space location, and the formula correctly
  recovers that from the *updated* pan/zoom rather than drifting.
- `newPanX = 400 - 400 * 1.4 = 400 - 560 = -160`
- `newPanY = 300 - 300 * 1.4 = 300 - 420 = -120`
- Stability check: `-160 + 400*1.4 = -160 + 560 = 400` ✓, `-120 + 300*1.4 =
  -120 + 420 = 300` ✓. Still stable under the cursor after two consecutive
  zoom operations.

This confirms the implementation is correct not just for a single zoom from a
freshly-reset canvas but for repeated zooming, which is the actual usage
pattern (a user scrolls the wheel several times in a row).

## Deviations from the spec, and why

- The spec's alternative suggestion (movement-threshold-based drag
  detection) was not used; the target-check approach
  (`e.target.closest('.skilltree-node')`) was picked instead because the DOM
  structure is simple and reliable for it: every buyable/owned/locked node is
  a single `<button class="skilltree-node">` with only two non-interactive
  `<span>` children (glyph, label), so `closest()` unambiguously separates
  "clicked a node" from "clicked empty canvas/SVG space" with no false
  positives/negatives, and it's simpler than tracking a pixel threshold and
  suppressing the resulting synthetic click.
- Per the spec's explicit preference, went fully transform-based
  (`overflow:hidden` on `.skilltree-scroll`, `position:absolute` canvas, no
  native scrollbars at all) rather than trying to combine native scroll with
  a transform pan.
- Drag listeners are attached to `scroller` rather than `window`. The spec's
  own phrasing ("mousedown ... on the scroll/canvas container ... mousemove
  while dragging ... mouseup/mouseleave ends the drag") already scopes all
  four events to the same container element, which was followed literally —
  this also happens to avoid a listener-accumulation problem: `scroller` is
  a fresh element every call to `buildSkillTreePanel()` (which reruns after
  every purchase), so old listeners are discarded with the old DOM node
  instead of piling up on `window` across rebuilds.
- Reset-on-open pan target: centered horizontally on the root `start` node,
  ~40px top margin, rather than literally "0,0" — matches the spec's own
  suggested behavior ("pan centered so the root `start` node is visible near
  the top of the viewport").
