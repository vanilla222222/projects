# Phase 6b overhaul — visual quality/polish pass, audit

Conservative, targeted design pass over the shared canvas-rendering primitives (Part A)
and the CSS design-token system (Part B). No gameplay data (items/enemies/obstacles
definitions) was touched — every uplift below comes from editing the small set of
shared drawing functions everything in the game already routes through.

## Files changed

- `js/core/utils-1.js` — `drawItemIcon` (emoji legibility shadow), `drawObstacle`
  (rock/hardrock rim light, fire hazard glow).
- `js/core/utils-2.js` — `_humanoidStatic` (torso rim light, inside the bake),
  `drawPony` (body rim light).
- `js/ui/render.js` — new `FX.twinkle()` particle preset.
- `js/systems/shop.js` — wired `FX.twinkle()` into the 4 arcade filly capstone
  reveals and the arcade Friendship/Tools machine win reveal.
- `js/CODE_REFERENCE.md` — documented `FX.twinkle` per the standing rule.
- `style.css` — 2 hardcoded-hex-to-token fixes, new `--transition-fast`/
  `--transition-base` tokens applied across 15 hover/active-state rules.
- `feature-research/phase6b-overhaul/audit.md` — this file.

`index.html` was read in full for the audit but needed no changes — its section
structure and class/id names were already clean and are untouched by the CSS
edits above.

---

## Part A — canvas rendering primitives

### 1. `Util.drawItemIcon` (`core/utils-1.js`)
**What changed:** the item's emoji glyph now gets a small dark drop-shadow
(`ctx.shadowColor = Theme.shadow.groundHard; ctx.shadowBlur = 2`) right before
`fillText`, reset immediately after.
**Why:** the emoji sits on a disc whose fill color is per-item data (`item.color`),
so light-colored items (pale golds, whites, light blues) could wash out a
similarly-light emoji glyph. A cheap 2px shadow keeps every one of the ~1097
item icons readable without touching the disc's size, position, bevel, or
rarity-glow ring — this uplifts every item/trinket/familiar icon everywhere
(pedestals, shop slots, loot lists, minimap markers) with one change.
**Not changed:** the bevel/highlight arcs and the `qualityGlow` ring treatment
were read in full and are already well-tuned (radial gradient base fill via
`bodyShadeLocal`, tiered ring intensity by rarity) — no changes made there,
to stay conservative.

### 2. `Util.drawObstacle` (`core/utils-1.js`)
Touched the two most common/most-seen branches (rock/hardrock catch-all, the
four fire-hazard kinds), left the pit-tile rendering untouched (already has a
depth gradient + directional rim treatment from an earlier pass and didn't
need more).

**Rock / hardrock / tallrock / tallhardrock (the single most common obstacle
in the game):**
- Previously only *tall* rocks got a top-lit rim-light arc (a bright stroke
  suggesting a sunlit facet); short rocks were a flat shaded circle with no
  such highlight.
- Now every rock kind gets a thinner version of that same rim arc (short:
  1.4px stroke at 72% of its radius; tall: unchanged 2px at 60%), giving the
  far more common short rocks a bit more visible volume/depth for free.
- The rim is skipped during a hit-flash so the flash still reads as a clean
  flat white/red silhouette (previously the tall-rock rim stroke drew *through*
  the flash color, which was a minor pre-existing inconsistency; fixed as
  part of the same edit since it's the same code path).

**Fire hazards (yellow/red/blue/purple):**
- Added a soft ambient glow (`ctx.shadowColor = ob.def.color; ctx.shadowBlur
  = 7 * frac`) behind the outer flame fill only, where `frac` is the
  HP-scaled flicker strength already used for opacity. The glow is reset to 0
  before the inner (brighter) flame layer draws, so it doesn't stack.
- Reads as the flame actually casting light rather than being a flat painted
  shape, and — because it's scaled by `frac` — a nearly-spent fire visibly
  dims its glow along with its flicker instead of just shrinking.

### 3. `Util._humanoidStatic` / `drawBrownHumanoid` (`core/utils-2.js`)
**What changed:** added one extra `ctx.stroke()` call — a soft top-lit rim
arc on the torso ellipse (`Theme.shadow.rim`, same token used everywhere else
in the file for this effect) — placed after the torso+head fill and before
the `behavior`-specific gear chain, so gear always draws on top of it.
**Cache-safety check (see the standing Gotcha in `CODE_REFERENCE.md`):** the
new stroke only reads `e.x`, `e.y`, `r` (`=e.radius`) and `flash` — all four
are already part of `_humanoidSprite`'s cache key (`behavior|color|dark|radius|
flash|shielded|tuft|scale`). Nothing time-varying (`now`/`moving`) was
introduced, so the change lives entirely inside the bakeable static half and
does not affect the cache key or evict more/less often than before. Confirmed
by re-reading the "Gotchas / invariants" section of `CODE_REFERENCE.md` before
and after the edit.
**Why:** this is (by entity count) the most-drawn thing in the game — every
one of ~679 enemies, 58 bosses, and 15 superbosses shares this torso build.
The change is deliberately small (one stroke, same rim token everywhere else)
so it reads as "a bit more volume" rather than a new outline style.

### 4. `Util.drawPony` (`core/utils-2.js`)
**What changed:** the same rim-light treatment as above, added right after
the body ellipse fill, at a fainter stroke width (`size*0.02` vs. the
humanoid's `r*0.1`) and skipped under `opts.flash` the same way.
**Why:** the player pony is seen in 100% of sessions, so this was the most
conservative edit in the whole pass — a single faint stroke, no change to
silhouette, wings, tail, head, or any accessory layer, and it's placed before
the scales/stripes/robot-seam overlays so those still draw cleanly on top.

### 5. `FX` particle system (`ui/render.js`)
**New preset — `FX.twinkle(x, y, color, count)`:** a quick ring of small
rising motes (7 by default, thinned under `prefers-reduced-motion` via the
existing `reducedCount()` helper same as every other preset), built entirely
from the existing `emit()`/pool infrastructure — no new allocation, no second
particle system.
**Why this was missing:** `grantPickupEffect` (the single choke-point every
pickup grant in the game routes through) fires a sound and a float-text on
every grant, but no particle flourish — unlike combat hits (`sparks`) or
enemy deaths (`puff`), a reward moment had no "something good just happened"
visual beat. Rather than wiring a new preset into every one of the ~13
`grantPickupEffect` call sites (which would be a much larger, less
conservative change touching every ordinary pickup in the game, including
mundane ones like a single coin), I limited the wiring to the two *genuinely
missing* named cases the task called out:
- **4 arcade filly capstone reveals** (`systems/shop.js`'s `feedArcadeFilly`) —
  the Coin/Bomb/Key/Heart filly's "beams!" moment (4th/5th feed, one-time per
  filly per run) already gets its own float text and `itemGet` sound; it now
  also gets a `twinkle` in the float text's own color, right where the
  reward item is granted.
- **1 arcade machine win reveal** (`systems/shop.js`'s `updateArcadeMachines`) —
  the Friendship/Tools machine's win outcome (revealed after the existing
  0.45s spin-anticipation delay) now gets a `twinkle` in
  `Theme.machine.spinRing`'s gold (matching the spin-flourish ring color
  already used on the machine itself while it's spinning).
Synergy activation (also named as an example in the task) was deliberately
**not** wired: synergies are recomputed every `recalcPlayerStats` call, not a
single discrete event, so a clean one-shot trigger point would need new
edge-detection state (an `_fxSeen`-style flag) added to `items-1.js`'s
per-frame stat recalculation — a materially bigger, riskier change to a core
combat-adjacent file for a "nice to have," so it was left out of this pass.

---

## Part B — HTML/CSS design pass

Read `style.css` (now 645 lines) and `index.html` (233 lines) in full before
making any change.

### Consistency pass — hardcoded hex duplicating an existing token
Found exactly 2 (grepped every hex literal against every `:root` token value):
- `.hudPillEffect.good{ color:#7fd66a; }` → `color:var(--green)` (`--green`
  is `#7fd66a`, an exact match).
- `.hudPillEffect.bad{ color:#e35b6a; }` → `color:var(--red)` (`--red` is
  `#e35b6a`, an exact match).

No other hex literal in the file exactly matches a defined token's value —
checked every one, including the ones that *look* close (`#f4d35e` on
`.star-icon`, `#33304f` on `.pip`, `#6d3fc9` on the overlay-button gradient,
the three decorative `body::before` backdrop stops) — those are all
deliberately distinct colors with no matching root token, not drift.

### Phase 6a-added elements (synergy badges, turret/minion HUD counters, arcade fixtures)
- **Synergy badges** (`#synergyBar`/`.synergy-badge`) — already reuses the
  same chip chrome as `.passive-chip`/`.familiar-chip` (circle, `--panel2`
  background, hover scale, active state lights up with `var(--glow-accent2)`)
  and is internally consistent with the rest of the HUD panel family. Only
  change made here was the transition-token unification below (item 3) — no
  other polish needed.
- **Turret/minion HUD counters** (`#resTurrets`/`#resMinions`) — these just
  reuse the existing `.res` chip class (`class="res hidden"`), so they were
  already at the same quality bar as every other resource chip. No changes.
- **Arcade room fixtures** (fillies/machines) — these are drawn entirely on
  `<canvas>` via `Util.drawFilly`/`drawFriendshipMachine`/etc. (see Part A);
  there is no corresponding DOM/CSS for them at all (`grep -i "filly\|machine\|
  arcade" style.css` returns nothing), so there was nothing to review here on
  the CSS side.

### Micro-interactions — transition timing/easing unification
Grepped every `transition:` declaration (17 rules). Found real inconsistency:
most already used `.15s`/`.2s` in practice, but about half additionally paired
that with `var(--ease)` and half didn't (plain browser-default easing), and
one used a bespoke `.12s` alongside a plain `.2s` on the same element.

Added two new tokens:
```css
--transition-fast:.15s var(--ease);
--transition-base:.2s var(--ease);
```
and applied them to 15 declarations that were already using (or very close
to) those exact durations, replacing the bare-duration/no-easing versions:
`.mute-btn`, `.class-card`, `.trophy`, `.hud-resources .res`, `.active-icon`,
`.pip`, `#minimapLegendBtn`, `.passive-chip`, `.familiar-chip`,
`.synergy-badge`, `.overlay button`, `.achv-open-btn`, `.achv-filter button`,
`.achv-row`.

**Deliberately left alone** (these are distinct, intentional timings, not
drift): `.class-card::before`'s `.65s` shine-sweep (a different animation
entirely), and the staged reveal timings on `#roomBanner`/`#toast`/
`#itemExamine` (`.5s`/`.35s`/`.25s`, all already paired with `var(--ease)`) —
those durations are deliberately staggered (banner slower than toast slower
than tooltip) and unifying them would remove an intentional design choice,
not fix an inconsistency.

### Typography/spacing audit
Compared the Achievements/Bestiary panels (Phase 5b/6a-era) against the
original Main Menu/HUD panels. The Bestiary panel explicitly reuses every
Achievements class (`.achv-summary`/`.achv-filter`/`.achv-list`/
`.achv-category`/`.achv-grid`/`.achv-row`/etc. — documented in the file's own
comment above `.achv-icon.best-dot`), so the two panels are structurally
identical in spacing/type by construction; found no cramped or inconsistent
spacing to fix. No changes made in this section.

### `prefers-reduced-motion`
No new animation/transition was added that isn't already gated the same way
as its siblings — the transition-token unification only changed *which*
token an existing transition uses, not whether one exists, and CSS
transitions are exempt from the `body::before/::after`/`.title`/
`.trophy.beaten`/`.overlay` reduced-motion media queries already in the file
(those target `animation:`, not `transition:`, matching the file's existing
convention). `FX.twinkle` reuses `reducedCount()`, the same gate every other
`FX` preset uses.

---

## Verification

**`node --check` on every touched `.js` file:**
```
js/core/utils-1.js  — OK
js/core/utils-2.js  — OK
js/ui/render.js     — OK
js/systems/shop.js  — OK
```

**Full syntax sweep, every `.js` file under `js/`:** ran `node --check` over
every file found by `find js -name '*.js'` — zero failures.

**Full concatenated bundle load test:** built a Node `vm` harness
(`/tmp/.../scratchpad/bundle_test.js`) that stubs `document`/`window`/
`localStorage`/`AudioContext` (canvas `getContext('2d')` returns a
`Proxy` whose properties are all no-op functions/getters, so every
`ctx.xxx(...)` call resolves without needing a real canvas) and loads every
script in `index.html`'s exact `<script>` order into one shared `vm` context.
Result: **`ALL FILES LOADED OK`** — zero load-time errors across the entire
game.

**Draw-call smoke test** (beyond just loading — actually invokes the touched
functions to catch a wrong-arg-count/typo'd `Theme` token that a no-op stub
wouldn't otherwise surface): called, inside the same `vm` context,
`Util.drawItemIcon` (quality 0 and quality 4), `Util.drawObstacle` (rock,
tall hardrock, yellowfire, and a hit-flashed rock), `Util.drawBrownHumanoid`
(a shielded enemy, walking), `Util.drawPony` (normal and flash), and
`FX.twinkle` + `FX.update`/`FX.draw`. Result: **`DRAW SMOKE TEST OK`** — no
runtime errors from any of the new/changed code paths.

**`Util._humanoidSprite` cache-key check:** re-read `CODE_REFERENCE.md`'s
"Gotchas / invariants" section (specifically: *"`Util._humanoidSprite`'s
cache key intentionally excludes anything time-varying ... any behavior mark
that needs per-frame variation must live in `drawBrownHumanoid`'s live 'gear
flourishes' section, not in `_humanoidStatic`"*) before and after editing
`_humanoidStatic`. The added rim-light stroke reads only `e.x`, `e.y`,
`e.radius`, and `flash` — all four already part of the existing cache key —
so the bake pipeline, cache key, and eviction behavior are unchanged.

**CSS `var()` reference check:** extracted every `--token` defined in
`:root` and every `var(--token` reference in the file and diffed them —
zero references to an undefined token (see the `comm -23` check run during
this pass; empty output).

**Class/id existence check:** grepped every CSS class/id touched by this pass
(`mute-btn`, `class-card`, `trophy`, `.res`, `active-icon`, `.pip`,
`minimapLegendBtn`, `passive-chip`, `familiar-chip`, `synergy-badge`,
`achv-open-btn`, `achv-filter`, `achv-row`, `hudPillEffect`) against
`js/**/*.js` and `index.html` — every one is still referenced elsewhere
(nothing was renamed or removed, only property *values* inside existing
rules were edited).
