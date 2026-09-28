# API modernization — implementation audit

Ten items: two performance caches, two lifecycle/power APIs, two input APIs,
three new player-facing features, one accessibility item. Everything below is
additive or a like-for-like swap; no gameplay rule, balance number, or draw
routine changed.

## Files changed

| File | What changed |
|---|---|
| `js/ui.js` | HUD dirty-check (item 1); minimap offscreen cache (item 2) |
| `js/main.js` | visibility-driven loop stop/resume (3), wake lock (4), pointer events (5), ResizeObserver (6), fullscreen toggle (7), copy-run-summary wiring (9) |
| `js/audio.js` | `Sound.suspend()` / `Sound.resume()` + both exported (3) |
| `js/combat.js` | `navigator.vibrate` on a confirmed player hit (8) |
| `js/render.js` | `prefers-reduced-motion` gate on shake + particle counts (10) |
| `index.html` | `#fullscreenBtn` (7); `#copyRunBtn` / `#copyWinRunBtn` (9) |
| `style.css` | `.fullscreen-btn` rules (7) |

Verification: `node --check` passes on all five touched JS files. No browser
run/play-test was attempted (per instructions).

---

## 1. HUD dirty-check — `js/ui.js`

Added a module-level `_hudCache = { hearts, coins, keys, bombs }` above
`updateHUD()`.

* Hearts: key is `redMax|redCurrent|blueCurrent`. When unchanged, the whole
  `canvas.width` assignment + `clearRect` + per-heart `Util.drawHeart` loop is
  skipped. A newly-created `#heartsCanvas` sets `freshCanvas = true` and always
  draws, so a blank canvas can never be left unpainted.
* Coins: compares the raw `player.coins` number before the
  `Util.formatNum` + `textContent` write.
* Keys/bombs: compares the final rendered string (`'∞'` or the number). Because
  the `'∞'` form encodes `unlimitedKeysFloor` / `unlimitedBombsFloor`, a flag
  flip is itself a cache miss. The `res-empty` class toggle moved inside the
  same guard — it is a pure function of that same string plus the flag, so it
  can't go stale.

Everything else in `updateHUD` (low-health vignette class, floor label, active
item pips, trinket/pill/star, stats row, passives bar) is untouched and still
runs every call — out of scope per the plan.

Deviation: none.

Risk: the cache is not explicitly reset between runs. Safe because the DOM
nodes it mirrors persist across runs too (`#hearts` is never cleared, nothing
else writes those `<b>` elements), so "cache says X, DOM shows X" stays true.
If a future change ever clears `#hearts`, the `freshCanvas` path already covers
the canvas; the counters would need a reset hook.

## 2. Minimap offscreen cache — `js/ui.js`

`drawMinimap()` now bakes the *static* half — door connection lines and the
per-block room squares — into a module-level `_mmCanvas` created with
`document.createElement('canvas')` (same pattern as `render.js`'s
`rebuildTileLayer` and utils.js's sprite cache), blitted with a single
`drawImage`. The animated half still draws live, in the original per-node
order: the pulsing "you are here" ring, the room-type icon, and the loot
markers.

Invalidation (`minimapCacheKey`): current room id, `player.revealMap`, and one
character per room encoding discovered/revealed/seen. Plus an identity check on
the `dungeon` object (so a new floor always rebuilds) and a size check against
the visible canvas.

Deviation: icons and loot markers were left in the live pass rather than baked.
Loot state changes on every pickup, which would defeat the cache and require a
much broader key; the plan only asked for doors + room cells.

Risk (sub-pixel, cosmetic): the current-room ring is stroked at up to
`lineWidth 2.5`, which can bleed ~0.25px past its cell into a neighbouring
room's cell. Previously a neighbouring room drawn *later* in Map iteration
order would overpaint that sliver; now all fills are baked first, so it never
does. The old behaviour was already order-dependent (rooms iterated before the
current one never overpainted it), and the difference is a quarter-pixel of
semi-transparent white at peak pulse. Everything else is pixel-identical.

Second risk: the key does not include theme colours, since `Theme` is a
load-time constant with no runtime switcher (checked `js/theme.js`). If a theme
switcher is ever added it must bump `_mmKey` (or null `_mmCanvas`).

## 3. Page Visibility — `js/main.js`, `js/audio.js`

`main.js`: the loop's tail is now `rafId = requestAnimationFrame(loop)`, with
`startLoop()` / `stopLoop()` helpers. `rafId` doubles as the "loop is running"
flag, so `startLoop()` returns early if a frame is already scheduled — no
double-scheduling on repeated visibility events. `startLoop()` also resets
`lastTime = performance.now()` so the hidden gap doesn't arrive as one huge
`dt`; the existing `Math.min(0.05, …)` clamp in `loop()` is untouched and still
applies as a second line of defence.

`audio.js`: added `suspend()` / `resume()` inside the `Sound` IIFE and exported
both. `suspend()` only acts on a `running` context; `resume()` only on a
`suspended` one **and** only when `!muted`, so a muted player is never
un-suspended into audibility. Neither creates a context — that stays
gesture-driven via `unlock()`. Both wrapped in try/catch.

Deviation: none.

Risk: if a player mutes, hides the tab (context suspends), returns (resume
skipped, correctly), then unmutes — the context would still be suspended.
Covered because every unmute path (`M` key, `#muteBtn` click) calls
`Sound.unlock()` first, which resumes a suspended context.

## 4. Screen Wake Lock — `js/main.js`

`requestWakeLock()` feature-detects `'wakeLock' in navigator`, bails if a lock
is already held or the document is hidden, and only proceeds when
`game && game.state === 'playing' && !game.paused`. The `.request()` promise is
guarded by both a `try/catch` and a `.catch()`; the resolve path re-checks the
game state (the run can end during the await) and releases immediately if
stale. A `release` listener nulls the cached sentinel.

`releaseWakeLock()` nulls first, then releases, with `try/catch` plus a
`.catch()` on the returned promise.

Call sites: acquired in `startGameWithClass()` and on unpause (`togglePause`);
released on pause, on `returnToMenu()`, on the `gameover`/`win` state
transition in `loop()`, and on tab-hide. Reacquired on tab-visible (a no-op
while paused, which is the usual case since the existing `blur` handler
auto-pauses).

Deviation: none.

Risk: wake lock requests can reject silently (low battery, permissions policy,
non-secure context) — verified `try/catch` **and** a promise `.catch()` are
both present, and the game is entirely unaffected when the lock is denied.

## 5. Pointer Events — `js/main.js`

`mousemove`/`mouseleave`/`mousedown` on the canvas and `mouseup` on window are
now `pointermove`/`pointerleave`/`pointerdown`/`pointerup`. Handler bodies are
byte-for-byte unchanged. `contextmenu` left as-is per the plan.

Checked the bodies for MouseEvent-specific fields: only `clientX`, `clientY`
and `button` are read, all of which `PointerEvent` inherits from `MouseEvent`.
No touch-specific logic added.

Deviation: none.

Risk: on a touch device, `pointerleave` now fires after each tap's
`pointerup`, clearing `input.mouseActive`. That is the correct reading of "the
pointer left" and matches how a mouse leaving the canvas already behaved; there
was no touch input path before this change at all.

## 6. ResizeObserver — `js/main.js`

The `window.addEventListener('resize', …)` line is replaced by a
`ResizeObserver` on `#canvasWrap` (the element `game.fitCanvas()` measures),
with the same `if (game)` guard inside the callback. Falls back to the original
window resize listener if `window.ResizeObserver` or the element is missing.

Deviation: added the fallback branch (not in the plan) so the game still
rescales on a browser without ResizeObserver.

Risk: feedback loop — `fitCanvas()` writes `canvas.style.width/height`, i.e. it
resizes a *child* of the observed element. `#canvasWrap` is `flex:1; width:100%;
overflow:hidden` (style.css:331), so its own box is driven by the parent, not by
its children; no observation loop. Also fires once on observe, which is harmless
(`game` is null at that point on load).

## 7. Fullscreen — `index.html`, `js/main.js`, `style.css`

`<button id="fullscreenBtn" class="mute-btn fullscreen-btn" title="Fullscreen"
aria-pressed="false">⛶</button>` sits next to `#muteBtn`, reusing `.mute-btn`
wholesale and adding only positioning (`left:152px`, past the volume slider;
`left:58px` under the 640px breakpoint where the slider hides itself) and an
`.active` accent.

Click toggles on `document.fullscreenElement`; a `fullscreenchange` listener
calls `syncFullscreenBtn()` (title + `aria-pressed` + `.active` class, matching
the `syncMuteBtn` pattern) and re-runs `game.fitCanvas()`. Feature-detected via
`document.documentElement.requestFullscreen`; the button gets `.hidden` and no
listeners when unsupported.

Deviation: the glyph stays `⛶` in both states rather than swapping icons —
alternative "restore" glyphs render as tofu on several platforms. State is
carried by title/`aria-pressed`/accent colour instead, which is exactly how
`.mute-btn.muted` works.

Risk: no vendor-prefixed (`webkitRequestFullscreen`) fallback, so older iOS
Safari simply hides the button — intentional, per the feature-detect
requirement.

## 8. Vibration — `js/combat.js`

In `damagePlayer()`, immediately after the existing `hitLanded` computation:
`if (hitLanded && 'vibrate' in navigator) navigator.vibrate(45)` inside a
`try/catch`. Gated purely on the existing `hitLanded` boolean, so dodges,
shield blocks and i-frame hits never buzz. `Sound.play('playerHurt')` in
`entities.js` is untouched.

Deviation: put in `combat.js` rather than `entities.js` — that's where
`hitLanded` exists, and the plan named it as the gate.

Risk: none meaningful. 45ms is below the annoyance threshold; desktop browsers
have no `navigator.vibrate` and take the no-op path; some browsers ignore
vibrate without a prior user gesture, which throws at worst (caught).

## 9. Clipboard run summary — `index.html`, `js/main.js`

`📋 Copy Run Summary` buttons added above `#retryBtn` (`#copyRunBtn`) and
`#winBtn` (`#copyWinRunBtn`); both are plain `<button>`s inside `.screen
.overlay`, so they inherit the existing overlay button styling with no new CSS.

`wireCopyBtn(id)` feature-detects `navigator.clipboard && …writeText` and adds
`.hidden` to the button when unsupported. On click it writes `_runSummary`,
flips the label to `✅ Copied!` (or `Copy failed`) and restores the original
label after 1.6s via a per-button timer that's cleared on re-click — the same
"say it and get out of the way" shape as `ui.js`'s toast.

`_runSummary` is snapshotted in `showGameOver()` / `showWin()` rather than read
on click, because `returnToMenu()` sets `game = null`. Content (two lines):
class name + outcome (won, or the floor fallen on, with its `FLOOR_NAMES`
label), then coins / `game.runKills` kills / `Util.formatDuration(game.runElapsed)`.
All from stats the game already tracks; `achievements.js` needed no change.

Deviation: no `document.execCommand('copy')` textarea fallback (the
`roomEditor.js` precedent has one because it already owns a textarea); here the
button simply hides when the async Clipboard API is absent, per the plan's
feature-detect requirement.

Risk: `writeText` rejects on a non-secure origin (`file://` in some browsers,
plain http) — handled by the `.catch()` showing `Copy failed`, never an
unhandled rejection.

---

## 10. prefers-reduced-motion in FX — `js/render.js`

Above the `FX` object: a `matchMedia('(prefers-reduced-motion: reduce)')` query
with a `change` listener updating a `prefersReducedMotion` flag live, plus a
`reducedCount(n)` helper that returns `n` unchanged when the preference is off
and `Math.max(1, Math.round(n * 0.35))` when on.

* `FX.shake()` returns early under reduced motion — no screen shake at all.
  `shakeX/shakeY` stay 0, so the render transform is unaffected.
* `FX.sparks()`, `FX.puff()`, `FX.burst()` route their counts through
  `reducedCount` — roughly a third the particles, effects still legible.
* `FX.dust()` and `FX.sparkle()` emit a single low-energy particle each and
  were left alone.
* `burst()` still spreads evenly (`(i / n) * 2π`), so a thinned burst is still
  a full circle.

`style.css`'s four existing media queries were not touched.

Risk: none to default behaviour — with the preference unset, `reducedCount` is
the identity function and `shake()` is unchanged, so output is pixel-identical.
`matchMedia` and `addEventListener`-on-MediaQueryList are both defensively
feature-detected.
