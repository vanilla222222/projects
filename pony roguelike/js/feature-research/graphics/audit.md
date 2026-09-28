# Graphics pass — audit

## Files changed

**New**
- `js/theme.js` — the semantic palette (`Theme`), plus `DOOR_COLORS` as an alias of `Theme.door`.
- `feature-research/graphics/audit.md` — this file.

**Edited**
- `js/render.js` — FX system (particles / shake / hit-stop), vignette, depth sort, theme migration.
- `js/utils.js` — theme migration, memoized `shadeColor`, cached `bodyShadeLocal`, pre-baked enemy sprites.
- `style.css` — `#game { image-rendering }` made a deliberate choice.
- `index.html` — one `<script src="js/theme.js">` tag, before `js/utils.js`.
- `room-editor.html` — same script tag. **Not on the ownership list, but required:** it loads
  `js/utils.js`, and `utils.js` now reads `Theme`, so the editor page would throw a
  `ReferenceError` without it. One line, script tag only.

**Not edited** (owned by the parallel agent): `combat.js`, `dungeon.js`, `ai.js`, `entities.js`,
`room.js`, `game.js`. `data.js` / `enemies.js` untouched — no colours migrated out of them
(per-item / per-enemy `color:` / `dark:` are identity, not theme).

---

## Task 1 — Central theme / palette

`js/theme.js` defines one global `Theme`, organised by *meaning* rather than by colour value:

| group | covers |
|---|---|
| `Theme.rgb` | raw `"r,g,b"` triplets, only for colours needed at a varying alpha (fades, pulses) |
| `Theme.ui` | HUD/on-canvas text, boss bar, enemy HP bar, gold/affordable-price |
| `Theme.floatText` | damage / crit / heal / shield / coin / curse / stun float-text colours |
| `Theme.projectile` | player / enemy / familiar / turret bolt defaults, shared glint, glow blur radii |
| `Theme.status` | freeze ring+fill, stun, charm, fear, poison, shield ring, invincibility glow |
| `Theme.quality` | the three rarity glow tiers (q2/q3/q4) — now the single source for `Util.qualityGlow` |
| `Theme.fx` | explosion gradient stops, blast ring, bomb body, fuse (normal/hot/cord/spark), embers, swing trail |
| `Theme.shadow` | drop shadow tiers, floor ambient occlusion (+ `aoWidth`), keylines, rim/sheen/glint |
| `Theme.vignette` | the screen-space lighting stops |
| `Theme.particle` | FX pool defaults |
| `Theme.door` | the old `DOOR_COLORS` table (a door colour is a *signpost*, i.e. a renderer decision) |
| `Theme.world` | secret-passage floor, pedestal, shop pickup disc, stairs, branch labels, pit |
| `Theme.icon` / `Theme.chest` / `Theme.machine` | pickup icons, chest locks, donation machine |
| `Theme.pony` / `Theme.enemy` / `Theme.obstacle` | shared sprite details (beak, horn, fangs, eyes, hit-flash) |

`Theme.rgba(triplet, a)` is the one helper.

- Script tag added at `index.html:132`, **before** `js/utils.js`.
- `render.js` and `utils.js` are fully migrated. Verified by grep: the only remaining literal in
  `render.js` is the fallback inside `FX.init()`'s pool prototype (`color: '#fff'`, immediately
  overwritten on every `emit`) and `drawLaserFX`'s `rgba(${rgb},…)`, where `rgb` is a
  *caller-supplied* triplet defaulting to `Theme.rgb.laser`. `utils.js` has zero colour literals
  left in any drawing function.
- `DOOR_COLORS` was deleted from `render.js` and now lives at `theme.js:~190` as `Theme.door`, with
  `const DOOR_COLORS = Theme.door` kept as an alias so `render.js:505` and any other reader is
  unchanged.
- **STAGES is untouched.** Floor terrain still comes from `STAGES[].palette` /
  `BRANCH_PALETTES` / `BRANCH_PALETTES_10` in `stages.js` (`js/stages.js` was not modified at all).
  Theme complements it; the only thing pulled *into* Theme from the terrain side is the door table,
  which was already living in `render.js` rather than in `stages.js`.
- `data.js` (621 literals) and `enemies.js` (124) deliberately left alone.

---

## Task 2 — Visual effects

Everything is in the new `FX` global at `js/render.js:68–228`, driven from the render path so no
file outside this pass had to change.

### 1. Particle pool (`render.js:68–228`)
Fixed-size, preallocated at load (`FX.MAX = 260`, `FX.init()` runs at `render.js:229`). Spawning
never allocates — `_take()` walks a ring index and recycles the oldest slot. `emit()` takes
positional args rather than an options object for the same reason. All motion is dt-driven
(`FX.update(dt)`, `render.js:177`): velocity, gravity, exponential drag, life-based alpha ramp.

Three draw kinds: `1` spark (a streak along its own velocity), `2` puff (grows as it thins),
`0/3` dot. Spawn helpers: `FX.sparks` (hit sparks), `FX.puff` (death puffs), `FX.dust` (movement
dust), `FX.sparkle` (pickup sparkles), `FX.burst` (generic explosion spray).

### 2. Screen shake (`render.js:161–168`, applied at `render.js:299`)
`FX.shake(amount, duration)` — `amount` is a peak offset in logical px. Quadratic falloff so it
snaps and settles. A weaker request can't stomp a stronger one that's still running.
Applied at the camera translate:

```js
ctx.translate(-Math.round(this.camX) + Math.round(FX.shakeX),
              -Math.round(this.camY) + Math.round(FX.shakeY));
```

The existing `Math.round` pixel-snapping is preserved on both the camera and the shake, so the
tile-layer blit still lands on whole pixels.

### 3. Hit-stop (`render.js:170–176`)
`FX.hitStop(seconds)` sets a timer; `FX.frozen()` queries it; `FX.update()` consumes it and
returns early, so particles and shake hold still during the freeze.

**It is deliberately not wired to anything yet, and that is the honest state of it:** a hit-stop
that only freezes particles while the simulation keeps running would read as a glitch, not as
impact. Making it real needs one line in `game.js`, which this pass doesn't own — see *Hooks*
below.

### 4. Vignette / lighting overlay (`render.js:330–342`, called at `render.js:317`)
Drawn after `ctx.restore()`, **before** the boss health bar and the room-fade veil — that ordering
is what keeps it off the on-canvas UI. The DOM HUD is outside the canvas entirely, so it can't be
tinted. Stops come from `Theme.vignette.stops`; the gradient is built once and cached on the Game
(`this._vignetteGrad`) rather than rebuilt per frame. Subtle by design: fully transparent through
the middle 55%, `rgba(4,3,8,.36)` at the corners.

### 5. Room transitions
- `FX.reset()` fires on every room change (`render.js:285`), so sparks/shake never bleed across a fade.
- While `freezeTimer > 0` (ROOM_FREEZE_TIME) or `paused`, `FX.update` and `updateAmbientFX` are both
  skipped and the shake offset is zeroed (`render.js:288`). Nothing double-applies under the veil.
- FX dt is derived from `game.now`, which `update()` only advances while actually playing — so a
  pause freezes particles for free rather than fast-forwarding them on resume.

### Effects that actually fire today
Since `combat.js` can't be edited, `updateAmbientFX` (`render.js:350–391`) derives triggers from
state already observable at draw time:

| effect | trigger |
|---|---|
| hit sparks | rising edge of `e.hitFlash` (`drawEnemy`, `render.js:~709`) |
| player-hit sparks + shake (4.5px / 0.22s) | rising edge of `player.invulnTimer` (`drawPlayer`) |
| death puff + shake | `e.isDead` flipping true (dead enemies stay in `node.enemies`) |
| explosion shake (6px / 0.3s) + ember burst | a new `Explosion` appearing in `game.explosions` |
| movement dust | `player.moving`, every 85ms |
| pickup sparkles | idle shimmer on coins / gold keys / gold bombs / stars / heart containers |

---

## Task 3 — Performance + depth

### 3.1 Gradient / shade caching
- **`Util.shadeColor` is now memoized** (`utils.js:110–130`). Exact keys, no quantization, so output
  strings are byte-identical to before. This is the broadest win: it runs several times per drawn
  body *and* once or twice per tile during a tile-layer bake, and each call used to cost a
  `parseInt` plus a fresh template string. Cache is capped at 4096 entries and cleared wholesale on
  overflow (leak guard against the tile bake's continuous per-tile shade variance).
- **`Util.bodyShadeLocal(ctx, cx, cy, r, color)`** (`utils.js:157–169`) is a cached companion to
  `bodyShade`, keyed by `(color, cx, cy, r)` in a `Map`, itself held in a `WeakMap` keyed by the
  context (so the tile-bake canvas, minimap, class-select previews and room editor never share
  gradient objects across contexts).

  **The plan's framing here was slightly wrong** and it's worth writing down: you cannot cache a
  `CanvasGradient` keyed by `(color, radius)` alone and reuse it at a different world position — a
  gradient's coordinates are fixed at creation. What makes caching possible is that those
  coordinates are resolved in the user space in effect **when the gradient is painted**, so a
  gradient authored around a small fixed local offset lands wherever the caller is translated to.
  (The codebase already relied on this: `drawShop` and `drawItemIcon` were calling
  `Util.bodyShade(ctx, 0, 0, …)` under a `ctx.translate`.) So `bodyShadeLocal` is opt-in for
  callers drawing in a translated local space, and `bodyShade` is unchanged for the absolute-space
  callers. Migrated call sites: `drawPony`'s body gradient (`utils.js:872` — reused for body, head,
  muzzle and both ears), `drawItemIcon` (`utils.js:509`), and the two shop-slot discs
  (`render.js:566`, `render.js:572`).
- The remaining uncached `bodyShade` callers are the pedestal, bomb body, obstacles and
  `drawStarIcon`. Obstacles are the biggest of those (~10–20 per room per frame); baking them the
  same way as enemies is the obvious follow-up but is outside this plan's scope.
- `drawBrownHumanoid` needed no gradient work at all, because its gradients now only run at bake
  time — see below.

### 3.2 Pre-baked sprites (`utils.js:535–597`)
**Choice made: bake only the static body, keep the animated parts live.** Explained, since the plan
offered both options:

Baking N discrete animation frames would have quantized the walk cycle (whose phase is
`now/110 + (e.x+e.y)*0.05`, i.e. continuous *and* per-position), and would have multiplied the
cache by N. Baking only the static layer costs nothing in fidelity — every animation stays exactly
as smooth as it was — and still removes ~20 vector ops per enemy per frame.

`Util._humanoidSprite(e, flash, scale)` bakes to a small offscreen canvas at the caller's device
scale, cached in a `Map` keyed by
`behavior | color | dark | radius | flash | shielded | tuft | scale` (capped at 96, cleared on
overflow). The neat part: the body drawers work in absolute world coordinates off `e.x`/`e.y`, so
instead of rewriting them into a local space the bake canvas is simply translated by
`(ox - e.x, oyTop - e.y)`. Anchor offsets are rounded up to whole device pixels so the sprite's
antialiasing phase is canonical rather than depending on where the enemy stood when the bake ran.
`Util._blitSprite` snaps the destination to whole device pixels and derives the logical blit size
back off the physical size, so `drawImage` maps 1:1 with no resampling.

**Baked:** arms, torso, head, leaf tufts, eyes, and the non-animated archetype gear (shielded's
helmet band + shield, charger's horns, ranged's hood + pouch). Turrets bake shadow + base + body.
**Live:** the ground shadow (one ellipse, and it must sit *under* the legs), legs / wing flaps, the
bomber's strapped charge (its glow tracks a live fuse timer), all boss ornamentation, the turret's
pulsing eye, and the health bar.

Draw order is byte-for-byte the same as before the split — verified against the original: shadow →
legs/wings → [baked: arms, body, head, tufts, eyes, gear] → bomber charge → boss aura/crown →
health bar.

**Bosses are never baked** (`baked = !!bakeScale && !isBoss`): their aura pulses *underneath* the
crown, so folding the crown into a bake would have reordered it, and there's only ever one boss on
screen so there's nothing to win.

Opt-in via a new trailing `bakeScale` argument. `render.js:~713` passes `this.dpr`. Callers that
omit it — notably `roomEditor.js:412` — get the original all-live path, unchanged.

**`Util.drawPony` is deliberately NOT baked.** It draws exactly one entity per frame (the player),
and its facing is a continuous `atan2` angle, so a `(type, facing, flash)` cache would thrash on
every mouse move for no measurable gain. It got the cached-gradient treatment instead
(`bodyShadeLocal`), which removes 1 gradient + 3 colour parses per frame with zero risk.
`ui.js`'s class-select preview keeps working because the signature didn't change.

### 3.3 Depth sorting (`render.js:621–672`)
`drawObstacles` / `drawPickupsChests` / `drawEntities` / `drawFamiliars` are replaced by
`drawGroundObstacles` + `drawWorldSorted`. Obstacles, pickups, chests, enemies, familiars and the
player now all sort against each other by `y`, so a tall rock actually occludes what's behind it.

- Zero per-frame allocation: the existing `this._entityDrawScratch` array is reused for the list,
  and the `{y, kind, ref}` records come from a pool (`_drawEntry`) that grows once to the busiest
  frame and then stops. The comparator `SORT_BY_Y` is hoisted to module scope so it isn't a fresh
  closure each frame.
- Obstacles sort by `ob.y` (their *base*), which is the correct sort key for tall rocks even though
  their visual centre is offset upward.
- `GROUND_OBSTACLES` (`pit`, `mud`, `sandtrap`) are excluded and drawn in a flat pass before
  everything else — they're holes and stains *in* the floor, so nothing should ever sort behind
  them.
- Room fixtures (item pedestal, shop slots, donation machine, stairs) are still drawn before the
  sorted pass, as they were. Only relative change: non-flat obstacles now draw after those fixtures
  instead of before. They effectively never overlap, and where they do, the new order is the more
  correct one.

---

## Task 4 — Polish

### `image-rendering` / `imageSmoothingEnabled`
**The plan was wrong here:** `style.css` *did* already have `image-rendering: pixelated` on `#game`
(the old line 350, no comment, apparently accidental). It's been changed to `image-rendering: auto`
with an explanatory comment (`style.css:347–358`), and `ctx.imageSmoothingEnabled = true` +
`imageSmoothingQuality = 'high'` set once in `render()` (`render.js:275–279`).

Reasoning: nothing here is pixel art. Every sprite is anti-aliased vector work — ellipses,
quadratic curves, radial gradients — rendered at devicePixelRatio, and `fitCanvas` can scale it up
to 2.2×. Nearest-neighbour on top of anti-aliased edges is the worst of both worlds: you keep the
soft grey fringe *and* make it blocky. Bilinear keeps curves reading as curves. In-canvas, the only
`drawImage` calls (tile cache, baked sprites) are blitted at exactly 1:1 device pixels, so
smoothing costs nothing there while protecting sub-pixel edges from hardening.

### Camera smoothing — **skipped, deliberately**
Not because of the clamp (a lerp between two clamped targets stays clamped), but because of
ownership. `updateCamera()` lives in `game.js`, which this pass doesn't own, so the only smoothing
available here would be a *render-only* camera lerping toward `this.camX/camY`. That would desync
`combat.js:179`'s screen→world mouse mapping (`input.mouseX + game.camX`) from what's actually on
screen by the lag distance — a real aiming regression for a cosmetic gain. The right place for this
is inside `game.js`'s `updateCamera`, lerping `this.camX/camY` toward the clamped target and
snapping on room entry (`enterRoom` already calls `updateCamera()` before setting `freezeTimer`, so
that's the natural snap point). Left for whoever owns that file.

---

## Hooks exposed for files this pass doesn't own

All of these are live and callable today; nothing needs to be initialised first.

```js
FX.shake(amountPx, durationSec)   // stronger request wins over a decaying one
FX.hitStop(seconds)               // sets the freeze timer
FX.frozen()                       // -> bool, "is a hit-stop in progress"
FX.sparks(x, y, color, count)     // impact streaks
FX.puff(x, y, color, count)       // death/break cloud
FX.dust(x, y)                     // movement scuff
FX.sparkle(x, y, color)           // pickup glint
FX.burst(x, y, color, count, speed)
FX.reset()                        // wipe everything
```

Suggested call sites in `js/combat.js` (line numbers are current-file references):

| where | call | note |
|---|---|---|
| `damagePlayer`, after the `hitLanded` check (~`combat.js:35`) | `FX.hitStop(0.055); FX.shake(5, 0.24); FX.sparks(player.x, player.y, Theme.floatText.playerHurt, 8)` | replaces the `invulnTimer` edge-detection now done in `drawPlayer`; delete that block if you take this |
| every enemy-damage path that sets `e.hitFlash` (melee `~:402`, laser `~:327/382`, projectile `~:916`) | `FX.sparks(e.x, e.y, Theme.particle.hitSpark, 5)`, plus `FX.hitStop(0.04)` on a crit | replaces the `hitFlash` edge-detection in `drawEnemy` |
| `handleEnemyDeath` (`combat.js:659`) | `FX.puff(enemy.x, enemy.y, enemy.dark, enemy.isBoss ? 18 : 9); FX.shake(enemy.isBoss ? 5 : 1.4, …)` | replaces the `isDead` scan in `updateAmbientFX` |
| wherever an `Explosion` is pushed | `FX.shake(6, 0.3); FX.burst(...)` | replaces the `_fxSeen` scan |
| pickup collection | `FX.sparkle(p.x, p.y, …)` ×4 | currently only an *idle* shimmer exists; there's no render-side signal for actual collection |
| obstacle destruction (`combat.js:248` sets `ob.hitFlash`) | `FX.puff(ob.x, ob.y, ob.def.dark, 7)` | not detected at all today |

**Hit-stop needs one line in `js/game.js`** to become real. In `Game.update`, right after
`this.now = performance.now()`:

```js
if (FX.frozen()) { FX.update(dt); updateHUD(this); drawMinimap(this); return; }
```

(`FX.update` consumes the timer, so the freeze self-terminates.) Without that line the trigger is
inert by design — see Task 2.3.

Also worth a one-word fix in a file this pass doesn't own: `game.js:49`'s comment still says
`_entityDrawScratch` is "reused every frame by drawEntities()" — that method is now
`drawWorldSorted()`.

---

## Visual behaviour: changed vs preserved

**Preserved exactly**
- Every colour value. The migration is mechanical — each token holds the literal that was there.
  (`'#fff'`→`Theme.enemy.flash` = `'#ffffff'` and `'#eee'`→`Theme.enemy.flashSoft` = `'#eeeeee'`
  are the same rendered colours, just spelled long.)
- All sprite geometry, all animation timings and phases.
- Draw order within `drawBrownHumanoid`.
- Camera pixel-snapping.
- The room-fade veil and `ROOM_FREEZE_TIME` pause.
- `Util.drawPony`, `Util.drawObstacle`, `Util.drawPickupIcon` etc. keep their signatures, so
  `ui.js` and `roomEditor.js` are unaffected.

**Deliberately changed**
1. **Layering.** Obstacles/pickups/chests/familiars now y-sort against enemies and the player
   instead of being layered by draw-call order. This is the point of Task 3.3, but it *is* a
   visible change: a rock south of an enemy now draws in front of it.
2. **Enemy sub-pixel position.** Baked sprites blit on whole device pixels, so an enemy's
   sub-pixel position quantizes to 1 device pixel (0.5 logical px at dpr 2). Not perceptible in
   motion, and the camera already rounds.
3. **CSS upscale is smooth instead of nearest-neighbour** — see Task 4.
4. **New effects exist**: vignette, screen shake, particles. All tuned subtle.

---

## Performance notes

| what | before | after |
|---|---|---|
| `Util.shadeColor` | `parseInt` + template string per call; several per body, 1–2 per tile per bake | `Map` hit; capped at 4096 |
| body-shading gradient (pony, item icons, shop discs) | fresh `createRadialGradient` + 3 colour-string parses per fill per frame | one cached gradient object per `(colour, offset, radius)` per context |
| enemy body | ~20 vector ops + 1–3 gradients per enemy per frame | one `drawImage`, plus the ~6 live animated ops |
| depth sort | new filtered array per frame (already partly fixed) | reused array + pooled records + hoisted comparator; zero steady-state allocation |
| particles | n/a | 260 preallocated objects, ring-recycled; spawning never allocates |
| vignette | n/a | gradient built once, one `fillRect` per frame |

Expected shape of the win: the per-frame cost now scales with *animated* work rather than total
sprite complexity. A room with a dozen enemies goes from a few hundred vector ops to a dozen blits
plus a dozen small leg animations. Memory cost is bounded and small — 96 sprites × roughly 27 KB
worst case (~2.5 MB ceiling, realistically far less since the key set is "enemy types present on
this floor" × 2 flash states).

Steady-state allocation in the render path is now zero except for `Object.assign` in `drawPlayer`
(pre-existing, one per frame, in `Util.classPonyOpts`'s caller).

---

## What the plan got wrong

1. **`style.css` already had an `image-rendering` rule** (`pixelated`, on `#game`). The plan said
   there was none. Changed to `auto` with reasoning — see Task 4.
2. **"Cache gradients keyed by (color, radius) in a Map"** isn't achievable with an unchanged
   `bodyShade(ctx, cx, cy, r, color)` API: gradient coordinates are baked at creation and can't be
   repositioned. The workable version — which the codebase was already implicitly using — is that
   gradients are *resolved* in the user space at paint time, so caching requires the caller to be
   translated. Hence the opt-in `bodyShadeLocal` alongside the unchanged `bodyShade`. Documented
   at `utils.js:141–156`.
3. **`room-editor.html` needed a script tag too.** It wasn't in the ownership list, but it loads
   `js/utils.js` and would have thrown on `Theme`. One line added.
4. **Hit-stop can't be completed from the owned files.** The mechanism and trigger are here, but the
   simulation freeze is a `game.js` change. Flagged rather than faked.
5. **Camera smoothing is blocked by ownership, not by the clamp.** The clamp is fine to lerp
   against; the blocker is that `combat.js` maps mouse→world through `game.camX`, so a render-only
   camera would desync aiming. Skipped.
6. Minor: `js/stages.js` was on the ownership list but needed no changes — the STAGES palette system
   was already the right shape and Theme complements it rather than absorbing it.
