# Audit — pits, doors, item icons (visual polish 1)

## Files changed

- `js/utils.js` — pit connectivity bit constants, `Util.pitGrad`, connected pit rendering in `Util.drawObstacle`, plate polish in `Util.drawItemIcon`
- `js/room.js` — `computePitMasks(node)` + its call at the end of `populateRoom`
- `js/render.js` — new `paintDoorTile()` helper, used by both door draw sites in `rebuildTileLayer`

Untouched (prior implementer's work, left exactly as found): `Util.drawPony`, `Util.drawBrownHumanoid`, `Util._humanoidStatic`.

No new hex literals anywhere — every new color is `Util.shadeColor()` applied to an existing `Theme` / palette / `DOOR_COLORS` token.

---

## 1. Connected pit rendering

**Option used: (b) — compute once in `js/room.js` at the end of `populateRoom`.**

Why (b): `populateRoom` (js/room.js:124-221) is a single, unambiguous completion point that *both* population paths (template and procedural) funnel through, and every `new Obstacle(...)` in the codebase happens under it — the three push sites are js/room.js:196, :235, :354, and there are no others (`grep -rn "new Obstacle" js/`). Nothing creates or destroys a pit after that point (`isPit` is written once in the `Obstacle` constructor and only ever read). So the mask can be finalized there and never invalidated. Option (a) would have meant changing `Util.drawObstacle`'s signature — a shared drawer with three call sites across two HTML entry points (render.js:577, render.js:708, roomEditor.js:423) — to thread a room the editor doesn't even have. (b) touches zero call signatures.

**Changes:**

- `js/utils.js:6-11` — `const PIT_N = 1, PIT_E = 2, PIT_S = 4, PIT_W = 8;` at module top. Declared in utils.js (not room.js) because `index.html` and `room-editor.html` both load `js/utils.js` before `js/room.js`, so the constants exist for both consumers regardless of entry point.
- `js/room.js:220` — `computePitMasks(node);` as the last statement of `populateRoom`.
- `js/room.js:223-250` — `computePitMasks(node)`: filters `node.obstacles` for `isPit`, builds one `Set` of `"tx,ty"` keys, then assigns `p._pitMask` per pit. One pass over the obstacle list, once per room lifetime. Early-returns when the room has no pits.
- `js/utils.js:222-231` — `Util.pitGrad(ctx, ob)`: builds the radial depth gradient once and caches it on the obstacle (`ob._pitGrad` / `ob._pitGradCtx`), rebuilding only if the obstacle is ever drawn onto a different canvas context. Per-frame cost is a plain `fillRect`.
- `js/utils.js:241-271` — the pit branch of `Util.drawObstacle`:
  - `typeof ob._pitMask !== 'number'` → **original flat single-square code, byte-identical in behavior** (fill `Theme.world.pitFill`, 1px `Theme.world.pitEdge` `strokeRect`).
  - otherwise: radial gradient fill (`pitFill` at center → `shadeColor(pitFill, 0.16)` at the rim, so the tile darkens toward the middle and reads as a shaft); a 5px lighter lip band along the north edge *only when the north neighbour is not a pit*, giving the "far wall of the hole" read; then a single batched `beginPath`/`stroke` that emits a rim segment only for edges whose neighbour is not a pit. Adjacent pits therefore share no visible seam.

**Per-frame cost:** one `fillRect`, at most one extra `fillRect`, and one batched stroke of ≤4 line segments per pit. No scans, no allocations, no gradient construction after the first frame. Call path is unchanged — still `Render.drawGroundObstacles` (js/render.js:573-579) every frame; nothing was moved into `rebuildTileLayer`.

**Risk:** low. Editor fallback is guarded by a `typeof` check on a property the editor's synthetic object (js/roomEditor.js:422, `{x, y, kind, tall, radius, hitFlash, hp, def}` — no `tx`/`ty`, no `_pitMask`) never has, so the editor cannot reach the new branch and cannot throw. `PIT_*` are only dereferenced inside the masked branch. Obstacles are never JSON-serialized (only `roomEditor.js:826` stringifies a template, and `main.js:11` unlock data), so the cached `CanvasGradient` on the instance can't leak into saved state. Worst realistic failure mode is cosmetic: a diagonal-only pit neighbour still leaves a corner notch, which is intended (only orthogonal adjacency is "one void").

## 2. Door depth treatment

- `js/render.js:255-282` — new module-level `paintDoorTile(ctx, px, py, color)`. Fills the tile with the door color exactly as before, then adds: an inset panel (`inset 4`, `shadeColor(color, +0.07)`); a light top/left bevel stroke (`+0.22`) and dark bottom/right bevel stroke (`-0.3`) on the panel — the same light/dark convention the wall blocks use at js/render.js:471-481; and a dark keyline (`-0.45`) right at the tile edge so the door reads as *recessed into* the wall rather than raised out of it like a wall block. Deliberately not a verbatim copy of the wall code: doors get the inverted outer treatment (dark rim, lit inner panel) because a doorway is an opening, and they get no per-tile grout/weathering, which would have fought the multi-tile door slots.
- `js/render.js:505` — `T_DOOR` tile case now calls `paintDoorTile(...)` instead of `fillStyle` + `fillRect`.
- `js/render.js:552-554` — the special-room door-slot loop hoists the color out of the loop and calls `paintDoorTile(...)` per cell.

Both sites remain inside `rebuildTileLayer`, i.e. baked into the offscreen tile canvas exactly as before — same pass, same timing, same invalidation (`node.doorsOpen` / palette change). Colors come from `pal.doorOpen`/`pal.doorLocked` (js/stages.js) and `DOOR_COLORS` (alias of `Theme.door`, js/theme.js:306).

**Risk:** low. Both inputs are `#rrggbb` strings, which is what `Util.shadeColor` parses; every stage palette and every `Theme.door` entry was checked. Cost is paid once per bake, not per frame. On a multi-tile door slot the frame repeats per tile, which reads as panelled leaves — intentional.

## 3. Item icon polish

`js/utils.js:546-586`, `Util.drawItemIcon` — **signature unchanged** `(ctx, x, y, item, now)`, so all three call sites work untouched: pedestals js/render.js:593, inventory/loot UI js/ui.js:97 (no `now` → static, as before), room editor js/roomEditor.js:419 (no `now`, preview defs may lack `quality`).

- Rarity now uses the **existing** `item.quality` field (defined on ~661 entries in js/data.js) via the existing `Util.qualityGlow` / `Theme.quality` tiers (js/theme.js:126-130). No new field.
- The glow ring is the same ring, tuned by tier instead of one flat intensity: q4 gets `lineWidth 3` at alpha 0.7 plus a faint outer halo at r21; q3 keeps the old `lineWidth 2` at alpha 0.5. The pulse and the `shadowColor`/`shadowBlur` behavior are unchanged.
- Plate: the disc fill is still the cached multi-stop `bodyShadeLocal` gradient, now finished with a bevel — a lit upper-left arc (`Theme.shadow.rim`), a shadowed lower-right arc (`Theme.shadow.outlineSoft`) and a small specular smear (`Theme.shadow.sheen`) — all existing tokens.
- The outer ring is tinted with the tier color when the item has a quality tier and falls back to `Theme.icon.itemRing` otherwise; this is the only frame tell a q2 gets, since `Theme.quality.q2.ring === false`.
- The emoji glyph draw is untouched (`14px sans-serif`, `Theme.ui.onIcon`, `fillText(item.icon, 0, 1)`).

**Risk:** low. `const q = item.quality || 0` makes a missing/undefined quality behave exactly like the old `item.quality ? ... : null` path — no glow, plain ring, no throw — which covers the room editor's preview defs and any familiar/trinket without a tier. The one behavioral subtlety: the outer ring stroke now uses its own explicit `beginPath()`/`arc()` instead of re-stroking the fill's path, which is equivalent but no longer depends on path state left over from the fill.

---

## Verification performed

- `node --check` clean on `js/utils.js`, `js/room.js`, `js/render.js`.
- Confirmed the pit mask is computed once per room (single call at the tail of `populateRoom`, which itself early-returns on `node.populated`) and never recomputed or invalidated at draw time; the draw path only reads `ob._pitMask`.
- Confirmed no pit is created outside `populateRoom` (`grep -rn "new Obstacle" js/` → three sites, all under it).
- Confirmed the room editor's synthetic obstacle has no `tx`/`ty`/`_pitMask` (js/roomEditor.js:422) and its item previews pass a def that may lack `quality` (js/roomEditor.js:419); both take the guarded fallback branches.
- Confirmed `Theme.shadow.rim` / `.outlineSoft` / `.sheen`, `Theme.world.pitFill` / `.pitEdge`, `Theme.quality.q2..q4` and `Theme.icon.itemRing` all exist as referenced.
- Not smoke-tested in a browser per project convention — the user verifies by playing.
