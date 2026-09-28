# Audit — Difficulty + Champion enemies

## Files changed

- `index.html` — added the main-menu difficulty toggle group (`#difficultySelect`, 3 buttons) between the class grid and the controls hint.
- `js/main.js` — `nightfallDifficulty` localStorage load/save, cached `currentDifficulty`, global `difficultyStatMult()`, button wiring.
- `js/entities.js` — difficulty factor applied to `Enemy` hp/dmg and `Boss` hp; added `isChampion = false` field.
- `js/room.js` — post-population champion promotion block (normal rooms, 5%, max one per room).
- `js/combat.js` — champion 50% bonus pickup drop in `handleEnemyDeath`.

Not touched: `js/enemies.js` (per dispatch), `js/utils.js`, `js/theme.js`, `style.css`, `js/data.js`.

---

## 1. Difficulty

**index.html:24-30** — new block right after `<div id="classSelect">`:

```html
<div id="difficultySelect" class="achv-filter" role="group" aria-label="Difficulty">
  <span class="hint">Difficulty</span>
  <button type="button" data-difficulty="easy">Easy</button>
  <button type="button" data-difficulty="normal" class="active">Normal</button>
  <button type="button" data-difficulty="hard">Hard</button>
</div>
```

Reuses the existing `.achv-filter` pill-button-group styling (style.css:475-482, `button.active` = accent fill) — the same convention the Achievements/Bestiary filters use — and `.hint` (style.css:214) for the label. No CSS file changes were needed, and none were made (style.css was outside the allowed file set).

**js/main.js:203-241** — inserted just above the `#minimapLegendBtn` handler, i.e. immediately after the mute/volume chrome it mirrors:

- `loadDifficultyPref()` / `saveDifficultyPref()` — try/catch-wrapped `localStorage['nightfallDifficulty']`, exactly matching `audio.js`'s `loadMutePref`/`loadVolumePref` shape. Unknown/absent/corrupt values fall back to `'normal'` via an explicit `DIFFICULTY_IDS.indexOf(d) >= 0` whitelist (deliberately not an object lookup, which would have let `"constructor"` etc. through as a truthy hit).
- `let currentDifficulty` — cached in memory; `difficultyStatMult()` reads that, not localStorage, so a room spawning a dozen enemies does zero storage I/O.
- `difficultyStatMult()` returns `0.75 | 1 | 1.5`. Plain global function declaration, matching this codebase's global-script convention (no modules, no `window.` prefixing anywhere else).
- Click handling is delegated on the container with `e.target.closest('button[data-difficulty]')`, plus a whitelist re-check; clicking the label span is a no-op. Plays `uiClick` like the other menu controls.

**js/entities.js:237-245** (`Enemy` constructor):

```js
const diffMult = (typeof difficultyStatMult === 'function') ? difficultyStatMult() : 1;
this.hp = Math.max(1, Math.round(type.hp * enemyHpScale(floorNum) * diffMult));
this.maxHp = this.hp;
this.dmg = Math.max(1, Math.round(type.dmg * diffMult));
```

**js/entities.js:352-356** (`Boss` constructor):

```js
this.hp = Math.max(1, Math.round(type.hp * bossHpScale(floorNum) * ((typeof difficultyStatMult === 'function') ? difficultyStatMult() : 1)));
```

`Boss` extends `Enemy`, so `dmg` is already difficulty-scaled by the `super()` call; only `hp` is recomputed here because `Boss` throws away the enemy-curve hp (pre-existing behaviour, same reason `prevHp` is re-seeded).

Composition is multiplicative and additive-free: `enemyHpScale(floorNum)` / `bossHpScale(floorNum)` are called unchanged and their result is multiplied by one extra factor. Neither `ENEMY_HP_GROWTH` (1.32), `BOSS_HP_GROWTH` (1.28), `enemyHpScale` nor `bossHpScale` was edited — verified by grep after the change; `js/enemies.js` was never opened for writing, so `explosionDamage`/`statusTickDamage`, which share those curves, are numerically identical to before.

`dmg` is integer half-hearts, so it is rounded with `Math.max(1, Math.round(...))` — same floor-at-1 convention as hp, and consistent with `combat.js`'s `playerDamageAmount` (combat.js:45) which snaps to half-heart granularity anyway. Note the practical consequence on Easy: a `dmg:1` enemy stays at 1 (`Math.round(0.75) === 1`) and `dmg:2` stays at 2 (`Math.round(1.5) === 2`); Easy's relief comes mostly from the 25% HP cut. Hard scales cleanly (1→2, 2→3, 3→5).

**The `typeof` guard**: `main.js` is the last script tag (index.html:157+), loaded after `entities.js`. Function declarations hoist within their own script, and no `Enemy` is constructed before the player starts a run, so the call always resolves in practice. The guard is belt-and-braces for `room-editor.html`, which loads `room.js` but neither `entities.js` nor `main.js`.

**Scope check**: nothing outside `Enemy`/`Boss` hp+dmg reads `difficultyStatMult`. Player stats, item effects, pickup rolls and drop tables are untouched.

**Risk**: low. Worst case if `difficultyStatMult` were somehow missing, the guard yields 1 and behaviour is exactly pre-change. The only behavioural surprise for a returning player is that the preference persists across sessions with no in-run indicator — difficulty is only visible on the main menu.

---

## 2. Champion enemies

**js/entities.js:245** — `this.isChampion = false;` declared eagerly in the `Enemy` constructor, alongside the other eager-init fields, so no code ever tests an `undefined`. `Boss` never sets it and the promotion block filters bosses out, so bosses can never be champions. Field name is `isChampion` exactly — no bare `champion` property — so it cannot be confused with the `championscrown` / `championssash` / `arenachampionsbelt` item ids in data.js.

**js/room.js:212-228** — new block in the guaranteed-once-per-room area, placed after the `node.forceSwarm` block and before the empty-room safety net:

```js
if (node.type === 'normal' && !node.enemies.some(e => e.isChampion) && Util.chance(0.05)) {
  const candidates = node.enemies.filter(e => !e.isBoss && !e.isDead);
  if (candidates.length) {
    const champ = Util.choice(candidates);
    champ.isChampion = true;
    champ.hp = champ.maxHp = champ.hp * 2;
    champ.dmg = champ.dmg * 2;
  }
}
```

One-per-room verification, by hand:
- `populateRoom` runs this block exactly once per room, after `populateRoomFromTemplate` / `populateRoomProcedural` and after `forceSwarm`, so both spawn paths (procedural room.js:269-278 and template `instantiateSpawner` room.js:349-354) are covered by this single copy, and a forced-Swarmer room's 5 extra enemies are eligible too.
- `.some(e => e.isChampion)` is evaluated *before* the roll, mirroring the petshop/sacrifice-spike guard convention; `isChampion` is set synchronously on promotion, so any re-entry (a room rebuilt through `populateRoom` again) sees the existing champion and short-circuits before rolling.
- At most one enemy is promoted per execution — a single `Util.choice`, no loop.
- Gated on `node.type === 'normal'`, so challenge-wave rooms, boss rooms and every special room type are excluded.

Doubling is applied to already-fully-scaled values (floor curve × difficulty, both baked in at construction), not re-derived from `type.hp`/`type.dmg` — a champion is exactly 2× whatever that enemy would have been in that room on that difficulty. Enemies spawned *later* in a room (splitter children, summoner minions, challenge waves) never see this block, which is intended: it runs once at population time only.

**js/combat.js:738-744** — in `handleEnemyDeath`, after the `goldenclover` roll and before `checkRoomCleared`:

```js
if (enemy.isChampion && Util.chance(0.5)) {
  const spot = findClearFloorSpot(node, Math.floor(enemy.x / TILE), Math.floor(enemy.y / TILE));
  spawnResolvedPickup(node, rollGenericPickupKind(), spot.x, spot.y);
}
```

A standalone `if`, not chained into the `isBoss` / `shinyshell` `else if` ladder — same shape as the `goldenclover` block above it, so a champion drop stacks with a shinyshell heart or a clover coin rather than competing with it. `findClearFloorSpot` returns tile coords (confirmed against its uses at combat.js:730/734 and the `openChestContents` call at combat.js:677), which is what `spawnResolvedPickup(node, kind, tx, ty)` expects — so coin/pill/star/chest sub-kinds from `rollGenericPickupKind()` all resolve correctly instead of becoming a broken bare pickup.

**Risk**: low, but two things worth flagging.
1. **No visual tell (known follow-up, deliberately out of scope).** `Util.drawBrownHumanoid` / `_humanoidStatic` in `js/utils.js` read nothing champion-like, and `js/utils.js` was off-limits for this dispatch. A champion currently looks pixel-identical to an ordinary enemy of its type while having double HP and double damage — the player's only cue is that it takes twice the hits. A future visual pass should add a tell (golden outline, aura particle, or a scaled-up draw radius) in utils.js's enemy draw path.
2. **Bestiary / stats treat a champion as an ordinary kill.** `bumpBestiaryCount` and `enemiesKilled` do not distinguish it. That is consistent with the approved plan (no achievement/stat work was in scope) but is the natural next hook if champions later want their own tracking.
