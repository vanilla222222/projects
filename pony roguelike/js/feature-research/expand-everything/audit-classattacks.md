# Audit — bespoke class attacks (Crystal Pony / Changeling / Diamond Dog)

## Files changed

- `js/data.js` — rewrote the `CLASSES` stat blocks for `crystalpony`, `changeling`, `diamonddog`.
- `js/entities.js` — `Player` constructor: new per-class flag fields + `fireZone` runtime state.
- `js/combat.js` — dispatch branch in `updatePlayer`; new `playerCrystalVolleyAttack`,
  `updateGreenFireAttack`, `shatterRockByShockwave`; `playerChargedBeamAttack` now branches
  on `crystalVolley`; `playerMeleeAttack` gained the shockwave rock sweep; `updateEnemy`
  gained the fire-zone speed mire.
- `js/render.js` — new `drawGreenFireZone()` + its call in the world-space draw order.
- `js/room.js` — `rollRockKind` suppresses tinted rocks for `noTintedRocks` classes.
- `js/game.js` — one line in `enterRoom`: clears `player.fireZone` on room change.

All six files pass `node --check`, as does every other file in `js/`.

---

## 1. Crystal Pony — charged 3-crystal converging volley

`CLASSES.crystalpony` (data.js), final block:

```
redMax:8, speed:130, canFly:false,
attackType:'ranged', charged:true, chargeTime:0.7, fireCooldown:0.3,
rangedDamage:1.0, boltSpeed:260, crystalVolley:true,
startBombs:1, startKeys:0, startCoins:8,
```

Removed: `meleeDamage:1.75`, `meleeCooldown:0.5`. Description rewritten.

New `Player` field: `this.crystalVolley = !!def.crystalVolley;`. The `charged` /
`chargeTimer` / `chargeTime` wiring was already class-generic (reads `def.charged` etc.),
so it is reused unchanged, as specified.

Dispatch (combat.js `playerChargedBeamAttack`) — Dragon's call is **branched, not
replaced**:

```js
player.chargeTimer = 0;
player.attackTimer = player.fireCooldown;
if (player.crystalVolley) playerCrystalVolleyAttack(game, input);
else playerFireBreathAttack(game);
```

Dragon has no `crystalVolley` flag → `!!undefined` → `false` → falls to
`playerFireBreathAttack` exactly as before. Everything above this (the
`attackTimer > 0` pre-charge block, the `chargeTimer += dt` accumulation, the
`chargeTimer < chargeTime` early return, and the release-wastes-charge branch in
`updatePlayer`) is byte-for-byte unchanged, so Dragon's charge behaviour is untouched.

Reachability trace for the Pony: `input.attack` held → she is not `greenFireAttack`, not
`melee`, but is `charged` → `playerChargedBeamAttack(game, dt, input)` → chargeTimer fills
at 0.7s → autofires `playerCrystalVolleyAttack`, sets `attackTimer = 0.3`.

`playerCrystalVolleyAttack(game, input)` spawns three `Projectile`s from
`CRYSTAL_VOLLEY_OFFSETS = [-14, 0, 14]` along the perpendicular `{-facing.y, facing.x}`
(plus a 10px nudge along facing so they don't start inside her). Each shard's velocity is
`normalize(focus - itsOwnStart) * boltSpeed`, so the three converge. Focus is the
world-space cursor, recomputed locally as `input.mouseX + game.camX`, `input.mouseY +
game.camY` — the same conversion `updatePlayer` does. Projectile options (`pierce`,
`homing`, `spectral`, `explosive`, `life` from `rangeTiles*TILE/boltSpeed`), damage
(`player.rangedDamage`) and the `Sound.play('rangedShot')` / `bumpStat('shotsFired')` pair
are copied from `playerRangedAttack`; crit / boss bonus therefore ride the normal
projectile-hit path, same as her old bolts would have.

**Deviation:** `input` is threaded as a third argument through
`playerChargedBeamAttack(game, dt, input)` rather than read off a global. `game.input`
does not exist and main.js's `input` is a module-level `const`; threading matched the
surrounding style better. When `input.mouseActive` is false (keyboard aiming, no cursor)
the focal point falls back to a point `rangeTiles` ahead along `facing`, which makes the
volley converge at max range instead of crashing on a meaningless cursor position.

## 2. Changeling — held green-fire zone

`CLASSES.changeling` (data.js), final block:

```
redMax:4, speed:170, canFly:true,
attackType:'ranged', rangedDamage:1.4, fireCooldown:0.4,
greenFireAttack:true, fireZoneRadius:50, fireZoneRange:40,
lifedrinkChance:0.18,
startBombs:1, startKeys:0, startCoins:0,
```

Removed: `boltSpeed:340` (unused now — `Player` defaults it to 340 anyway, nothing reads it
for her).

New `Player` fields: `this.greenFireAttack = !!def.greenFireAttack;` and
`this.fireZone = null;`. `fireZoneRadius` / `fireZoneRange` are read straight off
`player.def` at the single use site.

Dispatch (combat.js `updatePlayer`) — the held attack has to run on button-**up** frames
too (that is what despawns the pool), so it sits outside the press-only chain:

```js
if (player.greenFireAttack) {
  updateGreenFireAttack(game, input, dt);
} else if (input.attack) {
  ...existing melee / charged / ranged chain, unchanged...
} else if (player.charged) {
  player.chargeTimer = 0;
}
```

`updateGreenFireAttack` opens with `if (!input.attack) { player.fireZone = null; return; }`
— no cooldown, no fade timer, no lifetime field anywhere. The zone is created once, on the
first held frame, at `player.x + facing.x*40, player.y + facing.y*40` and its `x`/`y` are
never written again, so it stays anchored while she walks.

DPS: `player.rangedDamage * (1 / player.fireCooldown)` = 3.5/s, multiplied by `dt` each
frame. Damage goes through `e.takeDamage(dmg, 0, 0)` followed by
`if (e.isDead) { bumpStat('rangedKills', 1, game); handleEnemyDeath(game, e); }` — the same
pair every other damage source in combat.js uses (`playerLaserAttack`,
`playerFireBreathAttack`, `explodeAt`, `damageAllEnemies`). No raw `e.hp -=`, so kill
credit, lifedrink-on-kill, splitters, and every other on-death effect still fire.

Lifesteal (`player.onHitLanded()`), the hit sound, `applyOnHitStatuses` and the float text
are gated behind a `zone.tickTimer` that refills to `fireCooldown` — one "shot's worth" of
proc rolls per 0.4s rather than 60 rolls a second, which would otherwise have turned her
0.18 lifedrink into permanent invincibility.

### Enemy-speed-restoration proof

At `updateEnemy`'s dispatch chokepoint (the same place `freezeTimer`/`stunTimer` are
checked), before any AI runs:

```js
const _fireZone = game.player && game.player.fireZone;
const _mired = !!(_fireZone && Util.dist(_fireZone.x, _fireZone.y, e.x, e.y) < _fireZone.radius + e.radius);
const _origSpeed = e.speed;
if (_mired) e.speed = _origSpeed * 0.25;
try {
  ...the entire status-branch + behavior switch, unmodified...
} finally {
  if (_mired) e.speed = _origSpeed;
}
```

Why this cannot corrupt speed:

1. `_mired` and `_origSpeed` are `const`s local to this frame's call for this one enemy.
   Nothing is stored on `Enemy`, so there is no state to leak between frames — the check is
   recomputed from scratch every frame, exactly like the player's `onMud` check.
2. The restore is in a `finally`, so it runs on the normal path, on any `return` inside an
   AI function's callee chain, and on a thrown exception alike.
3. Enemy death mid-AI is irrelevant: the restore does not depend on `e.isDead`, and a dead
   enemy's `speed` is never read again anyway.
4. The player walking away, or releasing the button, only changes what the *next* frame
   computes — the current frame has already restored.
5. `if (_mired)` guards the restore, so an enemy that was never slowed is never written to;
   the assignment can't clobber a speed change made elsewhere. Verified with
   `grep "e\.speed *=" js/ai.js` — **no AI function assigns `e.speed`** (Calming Incense's
   `auraMult` multiplies at read time inside `chaseSeek`), so nothing can be overwritten.

Two extra clears, beyond the spec, both because the zone is anchored in world coordinates:
`updatePlayer` nulls it on `player.isDead` (which returns before the attack dispatch, so it
would otherwise burn forever), and `Game.enterRoom` nulls it on a room change (otherwise a
zone planted in the old room would keep slowing and damaging enemies at those coordinates
in the new one).

Draw: `Renderer.drawGreenFireZone()` — early-returns on `!this.player.fireZone`, so it is
inert for all other classes. Called between `drawStairs()` and `drawWorldSorted()` so the
pool paints on the floor, under whatever is standing in it. Radial green gradient, a rim
stroke, and eight clock-animated flame blobs; no new state, no assets.

## 3. Diamond Dog — rock-breaking shockwave melee

`CLASSES.diamonddog` (data.js), final block:

```
redMax:7, speed:140, canFly:false,
attackType:'melee', meleeDamage:2.5, meleeCooldown:0.55,
shockwaveAttack:true, rockCoinChance:0.02, noTintedRocks:true,
startBombs:4, startKeys:0, startCoins:20,
```

`Player` gets `this.shockwaveAttack = !!def.shockwaveAttack;` (checked once per swing, and
the `!!` flag matches the neighbouring `laser`/`charged`/`unlimitedRange` lines);
`rockCoinChance` and `noTintedRocks` are read straight off `player.def` at their single
call sites, following the `damageTakenMult` precedent.

`playerMeleeAttack` gained a third loop after the existing enemy sweep and the existing
`attackable`-obstacle sweep, reusing that function's own `originX/originY`,
`player.meleeRange + ob.radius` distance test and `coneHalfWidth` arc test verbatim:

```js
if (player.shockwaveAttack) {
  for (const ob of node.obstacles) {
    if (ob.destroyed || (ob.kind !== 'rock' && ob.kind !== 'tallrock')) continue;
    ...same range + cone checks... → shatterRockByShockwave(game, ob);
  }
}
```

### Rock-reward-path-separation proof (no double-reward with the bomb path)

There are now three independent rock-destroy paths, and a given rock can only ever run one:

| path | trigger | reward code |
|---|---|---|
| `explodeAt` | bombs, bomb barrels, explosive tears | prospector's pick / prospector's chip; tinted-rock table; `rocksBombed` |
| `destroyAllObstacles` | Taygeta star | same as above |
| `shatterRockByShockwave` | **only** Diamond Dog's melee sweep | flat `rockCoinChance`, nothing else |

1. `shatterRockByShockwave` is a brand-new function. It contains no call to `explodeAt`,
   `destroyAllObstacles`, or `damageObstacleHit`, and neither of the other two calls it —
   verified by grep. There is no shared reward helper between them, so no code path reaches
   both reward tables.
2. `playerMeleeAttack`'s pre-existing obstacle loop is untouched and still skips anything
   without `ob.attackable`. Rocks are `destructible:true` but **not** `attackable:true`, so
   that loop has never touched them and still doesn't — the new loop is the only thing that
   handles rocks, and it filters on `ob.kind` explicitly rather than on `destructible`, so
   it can't leak into barrels, turrets, fire, or tinted rocks either.
3. Mutual exclusion on one rock is enforced by `ob.destroyed`. `shatterRockByShockwave`
   sets it immediately; `explodeAt`'s and `destroyAllObstacles`' loops both open with
   `if (ob.destroyed || ...) continue;`. So a rock she clawed apart is skipped by a later
   blast, and a rock a bomb already destroyed is skipped by her sweep (her loop also opens
   with `ob.destroyed`). First writer wins; the second path never runs its reward code.
4. `explodeAt`'s prospector/tinted-rock branches were not edited at all, so bombs behave
   identically for her and for everyone else — the class-specific rule is only that her
   *melee* rocks pay out her flat 2%, regardless of what she is carrying (no
   `prospectorspick` / `prospectorschip` check appears in her function).
5. `bumpStat('rocksBombed')` is deliberately **not** bumped by the shockwave — she didn't
   bomb it, and that stat is the unlock condition for her own class.
   `obstaclesDestroyed` and the bestiary `objectsDestroyed` count are bumped, matching the
   other two paths.

`rollRockKind` (room.js):

```js
function rollRockKind(kind){
  if (kind !== 'rock') return kind;
  let p = null;
  try { p = (typeof activeGame === 'function' && activeGame()) ? activeGame().player : null; } catch (e) { p = null; }
  if (p && p.def && p.def.noTintedRocks) return kind;
  return Util.chance(0.02) ? 'tintedrock' : kind;
}
```

Run state is reached via `activeGame()` (achievements.js), which is the codebase's existing
answer to "room-generation-adjacent code that wasn't handed a `game`" — it wraps main.js's
module-level `game` in a TDZ-safe `typeof` guard. No new global was invented and no
signature was threaded.

Null-safety, per the verification checklist: `activeGame()` returns `null` before a run
starts, and `index.html` loads achievements.js *before* room.js so the function exists by
call time. `room-editor.html` however loads room.js **without** achievements.js, so
`activeGame` is genuinely undefined there — hence the `typeof activeGame === 'function'`
test and the surrounding `try/catch`. Every failure mode (no achievements.js, no `game`
binding, `game === null`, a `game` with no `player` yet) lands on `p = null`, falls past the
`p && p.def` guard, and rolls the ordinary 2% — i.e. menu-time/editor-time generation
behaves exactly as it did before this change.

## Deviations from spec

1. **`input` threaded into `playerChargedBeamAttack`** rather than read from a global —
   `game.input` does not exist. Also added a keyboard-aim fallback focal point for the
   volley (see §1).
2. **Feedback throttling on the green fire** — the spec asked only for smooth fractional
   damage. Applying `onHitLanded()` (her 18% lifedrink) and a float text every frame would
   have been ~60 lifesteal rolls per second and unreadable text spam, so proc rolls and
   visual/audio feedback are gated to one per `fireCooldown` while the damage itself stays
   perfectly continuous.
3. **Two extra `fireZone = null` clears** (player death, room change) — the spec only
   covered button release. Both are required because the zone is anchored in world space
   and `updatePlayer` early-returns while dead.
4. **`try/finally` around `updateEnemy`'s AI dispatch** rather than a plain
   save/scale/restore triple. The dispatch is a large switch whose callees can return
   early; `finally` is what makes "restored every frame, always" provable rather than
   merely likely.
5. **`shatterRockByShockwave` doesn't bump `rocksBombed`** — see the table above; that stat
   gates the Diamond Dog unlock and the shockwave is not a bomb.
