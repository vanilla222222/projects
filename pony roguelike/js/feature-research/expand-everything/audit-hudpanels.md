# Audit — two new side HUD panels (`#leftPanel` / `#rightPanel`)

## Files changed

- `index.html`
- `style.css`
- `js/ui.js`

No other files touched. Pure DOM/CSS + `updateHUD()`; no canvas drawing, no game logic, no `data.js` content.

---

## index.html

1. Inside `#canvasWrap` (immediately after `<canvas id="game">`, before `#roomBanner`) added two new absolutely-positioned siblings, matching the existing `#roomBanner`/`#toast`/`#itemExamine` idiom (they are all children of `#canvasWrap`, which is already `position:relative` — see "Positioning anchor" below):

   ```html
   <div id="leftPanel" class="hudPanel">
     <div class="hudPanelSection" id="leftPanelActive"></div>
     <div class="hudPanelSection" id="leftPanelTrinket"></div>
     <div class="hudPanelSection" id="leftPanelStar"></div>
     <div class="hudPanelSection" id="leftPanelPills"></div>
   </div>

   <div id="rightPanel" class="hudPanel">
     <div class="hudPanelSection">
       <div class="hudPanelTitle">Items</div>
       <div id="passivesBar"></div>
     </div>
     <div class="hudPanelSection">
       <div class="hudPanelTitle">Familiars</div>
       <div id="familiarBar"></div>
     </div>
   </div>
   ```

2. Removed the old `<div id="passivesBar"></div>` that sat as a direct child of `#gameScreen` below `#canvasWrap`. The id is unchanged — only its DOM parent moved (into `#rightPanel`). Div counts re-checked: 51 `<div` / 51 `</div>`, balanced; no duplicate ids (`passivesBar` appears exactly once, greps below).

## style.css

1. `#familiarBar` — new rule, a copy of `#passivesBar`'s (`display:flex; gap:5px; min-height:22px; flex-wrap:wrap; max-height:70px; overflow-y:auto;`), placed directly beside it.
2. `.familiar-chip` / `.familiar-chip:hover` — a near-identical clone of `.passive-chip` (same 20px circle, `--panel2` fill, `--border-soft` border, `--shadow-soft`, hover scale), plus `position:relative` so `.chip-count` (a small bottom-right count badge for stacked familiars) can be absolutely positioned on it. `.passive-chip` itself was NOT modified, so the item bank looks exactly as before.
3. New `.hudPanel` block — the shared panel chrome, values lifted verbatim from `#itemExamine`: `var(--panel-glass)` background, `1px solid var(--border-soft)`, `var(--radius-sm)`, `backdrop-filter:blur(4px)` (+ `-webkit-` prefix), `var(--shadow-soft)`. Differences from `#itemExamine`: `width:180px`, `font-size:11.5px`, `text-align:left`, `z-index:4`, `overflow-y:auto; overflow-x:hidden`, and no opacity/transition (these are always-on panels, not a show/hide tooltip).
4. `#leftPanel{ left:6px; top:8px; max-height:calc(100% - 16px); pointer-events:none; }`
   `#rightPanel{ right:6px; bottom:8px; max-height:calc(100% - 110px); }`
5. Small text helpers, all new class names, no collisions with existing selectors: `.hudPanelSection` (padded rows with a hairline divider, first-child divider suppressed), `.hudPanelTitle`, `.hudPanelName`, `.hudPanelDesc`, `.hudPanelEmpty`, `.hudPillRow`, `.hudPillSwatch`, `.hudPillName`, `.hudPillEffect{.good|.bad|.unknown}`.
6. Responsive: added a **new** `@media (max-width:1140px)` block above the existing `@media (max-width:640px)` one (which is untouched). See "Breakpoint" below.

## js/ui.js

Only `updateHUD()` and two new module-level helpers above it were touched; nothing else in the file (including the star-room additions at the top from the prior dispatch) was modified.

1. `_hudCache` gained two fields: `leftPanel` and `familiars`, following the existing dirty-check pattern used for hearts/coins/keys/bombs.
2. New `hudPanelEntry(label, thing)` — returns the HTML for one "TITLE / icon name / description" block, or a muted `None` line when `thing` is null. Works uniformly for an item, a trinket and a star since all three carry `{icon, name, desc}`.
3. New `hudPillReadout(game)` — loops `PILL_COLORS`, and for each identified color (`game.pillIdentified[c.id]`) looks up `PILL_EFFECTS[game.pillEffectMap[c.id]]`, exactly the lookup the existing `#pillIcon` tooltip does inline, just generalized to the whole array. Each row is a color swatch (`c.color`) + `c.name` + the effect name colored green/red off `effect.good`, with `effect.desc` as the row's `title`.
4. `updateHUD()`, appended after the untouched `#passivesBar` loop:
   - `#familiarBar` build. `player.familiars` is an array of live `Familiar` instances, so it tallies `counts[f.def.id]` (skipping any entry without a `.def`) and keeps a first-seen `order` array, then renders one `.familiar-chip` per distinct type with `def.icon`, a `.chip-count` badge when >1, and `title = def.name + (' x'+n) + ' — ' + def.desc` — the same title shape the passive chips use.
   - `#leftPanelActive/Trinket/Star/Pills` population via `innerHTML` + the two helpers above.

### Dirty-checks

Both new blocks are cached rather than rebuilt per tick (`updateHUD` runs every frame):

- familiars: key = `id:count` pairs joined.
- left panel: key = `activeItem.id | trinketId | starPocket |` + one token per pill color. The token is the *effect id* for identified colors, not a 1/0 flag — `pillEffectMap` is re-rolled each run, so an identical identified-color set can mean different effects in the next run, and a bare flag would have shown stale text after a restart.

The passives loop was deliberately left uncached, exactly as it was.

### Deliberate deviation — the pill list

`PILL_COLORS` is **60 entries** (data.js expanded it well past the original 10). Rendering all 60, most of them `??? / Unknown`, would be a 60-row wall in a 180px panel that buries the handful you actually identified. Instead the readout lists every *identified* color in full and collapses the rest to one line: `??? — N unknown` (plus `None identified yet` when nothing is known). The per-color lookup logic is otherwise exactly as specified.

---

## Positioning anchor

`#canvasWrap` was **already** `position:relative` (style.css line ~338) — no CSS addition was needed for that, and the existing `#roomBanner`/`#toast`/`#itemExamine` already rely on it.

Worth noting: `#minimapWrap` is *not* a child of `#canvasWrap`; it anchors to `#app` (`position:relative`, line 92) and floats over the whole screen at `top:12px; right:16px`. That is why `#rightPanel` is bottom-anchored with `max-height:calc(100% - 110px)` rather than top-anchored — a top-right panel would have collided with the minimap.

## Breakpoint reasoning (why 1140px, not 640px)

`game.js`'s `fitCanvas` scales the 320px canvas up to **2.2x = 704px** wide inside `#canvasWrap` (`max-width:1100px`). That leaves `(1100 - 704) / 2 = 198px` of idle space per side, which is why the panels are `180px` wide at a `6px` inset (186px total) — at full width they never overlap the play area. `#gameScreen` has `12px` horizontal padding, so `#canvasWrap` only reaches its full 1100px at a viewport of ~1124px; 1140px is that with a little margin.

Below 1140px:
- `#leftPanel` is hidden outright.
- `#rightPanel` is **not** hidden — the item bank was always visible before this change, so hiding it would be a regression. It folds into a flat strip along the bottom of the play area (`left/right:6px; width:auto; display:flex; max-height:70px`) with `pointer-events:none` so it can never eat a click. The tradeoff: at that width the chips lose their hover tooltips.

The existing `@media (max-width:640px)` block is unchanged and still applies on top.

## Click-through safety

`main.js` binds `pointerdown`/`pointermove` (aim + attack) on the **canvas element itself**, so anything overlaying it swallows input. `#leftPanel` is `pointer-events:none` (pure readout, nothing to hover). `#rightPanel` keeps pointer events at wide viewports because its chips' `title` tooltips are the whole point of it — and at wide viewports it sits entirely outside the canvas footprint by the arithmetic above. In the narrow fallback, where it does overlap, it is `pointer-events:none`.

## `#passivesBar` external references — checked

`grep -rn "passivesBar" js/ *.html` returns only `js/ui.js:299/300/308` (the `getElementById` + populate loop, unmodified) and the single `index.html` occurrence. Nothing in `render.js`, `game.js` or `main.js` references it, and nothing depends on its sibling order or parent — the lookup is id-based, so relocating it in the DOM is safe.

## Verification

- `node --check js/ui.js` — clean.
- `index.html` div balance 51/51; each new id (`leftPanel`, `leftPanelActive`, `leftPanelTrinket`, `leftPanelStar`, `leftPanelPills`, `rightPanel`, `familiarBar`) appears exactly once, and `passivesBar` still exactly once.
- All CSS custom properties used by the new rules (`--panel-glass`, `--panel2`, `--panel`, `--border-soft`, `--radius-sm`, `--shadow-soft`, `--ink`, `--muted`, `--muted-dim`, `--accent2`) confirmed defined in the `:root` block.
- No runtime playtest performed.

## Residual risks

- Between roughly 900px and 1140px the layout now takes the narrow fallback (bottom strip, no left panel) even though there is *some* free space; this is conservative on purpose, since the exact canvas scale depends on available height too.
- `#rightPanel`'s `max-height:calc(100% - 110px)` is a fixed guess at the minimap's vertical reach. If the minimap ever grows, that number needs revisiting.
- The "Familiars" section header shows even with no familiars owned (an empty 22px bar). Matches how the item bank behaves with no passives.
- Panel text uses `innerHTML` with item/trinket/star/pill names and descriptions from `data.js`. These are static authored strings with no user input, but if any future description contains raw `<` or `&`, it will be parsed as markup rather than escaped.
