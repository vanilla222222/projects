# Gameplay Update 1 — implementation audit

Scope: items 1-7 of the approved plan. No other behavior touched. `js/enemies.js` deliberately untouched
(parallel implementer). Verification: `node --check` clean on all six touched JS files; every diff re-read.
No browser/play testing performed (per instructions).

## Files changed

| File | Summary |
| --- | --- |
| `js/combat.js` | Laser now damages attackable obstacles (item 1); per-class `damageTakenMult` hook in `playerDamageAmount` (item 3); melee classes exempt from all `explodeAt` player damage (item 4); moving-spike wall-follower rewritten with sticky wall state (item 5); obstacle bolts pass `homing`, new steer-at-player homing branch (item 7). |
| `js/data.js` | Pony Bot `rangedDamage` 0.5 → 0.875 + new `damageTakenMult:1.25` + updated desc (items 2, 3); new `OBSTACLES.bluefire` and `OBSTACLES.purplefire` (items 6, 7). |
| `js/entities.js` | `Obstacle` now initializes `spikeWallDir = null` alongside the other spike patrol state (item 5). |
| `js/utils.js` | `drawObstacle` flame branch extended to `bluefire`/`purplefire` (items 6, 7). |
| `js/roomEditor.js` | Glyphs `f`/`p` and two picker entries for the new fires (items 6, 7). |
| `js/roomTemplates.js` | Comment-only: the two new obstacle ids added to the placement-format doc list. |

---

## Item 1 — Pony Bot laser hits obstacles

`js/combat.js:334`, `js/combat.js:343-351`, `js/combat.js:353` (inside `playerLaserAttack`).

- Added `const hitObstacles = new Set();` next to the existing `hitSet`.
- Inside the raycast loop, after the enemy pass, a `node.obstacles` pass mirroring the guards from
  `updateProjectiles` (`js/combat.js:991-999`): skips `destroyed`, `isPit`, `isWalkable`, already-hit,
  `isHazard && !attackable`, and `!attackable`. On `Util.circleIntersect(px, py, 2, ob.x, ob.y, ob.radius - 2)`
  the obstacle is added to the set.
- After the loop, `for (const ob of hitObstacles) damageObstacleHit(game, ob);` — the existing hit-count path,
  at most one hit per obstacle per cast.
- The beam pierces: the obstacle pass never touches `endDist` and never `break`s, matching how it already
  pierces enemies. Only solid tiles stop it.

Notes / risk: the `isHazard && !attackable` line is strictly redundant given the `!attackable` line right
after it — kept deliberately so the guard list reads identically to the projectile path it mirrors.
Consequence worth knowing: the laser can now break Bomb Barrels (attackable) at a 0.24s cadence, which
detonates them; Pony Bot is ranged, so it still takes that blast damage (item 4 exempts melee only).

## Item 2 — Pony Bot +75% ranged damage

`js/data.js:111`. `rangedDamage:0.5` → `rangedDamage:0.875`. Nothing else on the line changed
(`fireCooldown:0.24`, `laser:true`, `noRedContainers:true` intact). Risk: none — the value flows through
`Player.baseRangedDamage` and `recalcPlayerStats` exactly as before.

## Item 3 — Pony Bot +25% damage taken

- `js/data.js:112-115`: new `damageTakenMult:1.25` on the ponybot entry only (with a comment pointing at the
  hook). Verified by grep that no other class carries the field.
- `js/data.js:117`: desc updated to mention the fragility (and dropped the now-stale "modest damage").
- `js/combat.js:41-44` in `playerDamageAmount`, after the `isBoss` multiplier and before the half-heart snap:
  `amount *= (game.player.def && game.player.def.damageTakenMult) || 1;`

Lookup pattern: `Player` stores its class definition as `this.def` (`js/entities.js:11`), which is the
pattern already used elsewhere (e.g. `def.baseRangeTiles`). No new lookup invented.

Notes / risk: applies to every source routed through `playerDamageAmount` — contact, hazards, enemy bolts,
bosses, explosions — which is the intended "fragile chassis" reading. It does NOT apply to the handful of
callers that bypass `playerDamageAmount` (e.g. the sacrifice spike's hardcoded flat 1 heart at
`js/combat.js:1288`, and devil-deal/heart-cost effects) — those are fixed prices, not combat damage, so
leaving them unscaled is correct. The half-heart snap after the multiply means a 0.5 hit stays 0.5
(0.5×1.25 = 0.625 → rounds to 0.5); the trait bites from 1-heart hits upward (1 → 1.25 → 1.5). Undefined on
every other class → `|| 1` → exact previous behavior.

## Item 4 — Bomb barrel melee exemption

`js/combat.js:1114-1118` in `explodeAt`. Condition is now:
`if (!player.passives.blastplating && player.attackType !== 'melee' && Util.dist(...) < R + player.radius)`.

Notes / risk (judgment call, as flagged in the plan): `explodeAt` is the single code path for bomb barrels,
player-thrown bombs, explosive tears, Taygeta-star chains and barrel-to-barrel chains. Melee classes are now
immune to self-inflicted bomb damage too, not just barrels. Separating the two would need a new
"source" parameter threaded through every `explodeAt` call site — out of scope, and the blanket exemption is
what the single path supports. Enemy/obstacle damage from explosions is unaffected.

## Item 5 — Moving spike movement fix

Rewritten region: `js/combat.js:1326-1481`, plus `js/entities.js:426-428`.

New state: `ob.spikeWallDir` — a `SPIKE_DIRS` index pointing FROM the spike TO the wall/obstacle it is
currently hugging; `null` = not hugging anything. Initialized in the `Obstacle` constructor.

New helpers (all module-local; no external caller exists, and `updateMovingSpike`/`pickNextSpikeTile`/
`spikeTileOpen`/`spikeIsBoundary` keep their original names and signatures):
- `spikeFindWallDir(node, tx, ty, self, prefer)` `js/combat.js:1355-1364` — returns the index of a blocked
  orthogonal neighbor, preferring `prefer` then the sides nearest it, `-1` if the tile touches nothing.
- `spikeSetTarget(node, ob, dirIdx, wallDirIdx)` `js/combat.js:1372-1381` — commits the move and validates
  the intended wall side against the DESTINATION tile. If that side is not actually blocked (the wall was
  bombed out mid-patrol) it re-derives from what the destination does touch; if it touches nothing, it sets
  `spikeWallDir = null` so the next pick re-acquires cleanly.
- `nearestSpikeBoundaryTile(node, ob)` `js/combat.js:1386-1397` — Manhattan-nearest open, boundary-adjacent
  tile in the room.

`pickNextSpikeTile` `js/combat.js:1399-1481` now:
1. **Acquire** (only when `spikeWallDir == null`): grab a blocked neighbor, preferring the side left of the
   current heading, and normalize the heading to `(w+1)%4` so the invariant "hugged side is on the left of
   the heading" always holds (`js/combat.js:1402-1412`).
2. **Follow** (`js/combat.js:1413-1430`) — classic left-hand wall follow against that ONE side, in order:
   turn into the wall side if it opened (convex corner, new wall `(w+3)%4`); else straight (wall unchanged);
   else right turn (concave corner, the blocker ahead becomes the wall); else U-turn (new wall `(b+3)%4`).
   Because the acceptance test is "is my specific hugged side still blocked", a second structure standing
   nearby can never silently capture the spike. Line 1416 re-normalizes the heading in the rare case where
   `spikeSetTarget` had to re-derive the wall onto a different side.
3. **Boxed in** (`js/combat.js:1432-1436`): if no neighbor is open at all, stay put — checked before the
   scans so a walled-in spike never pays for a room scan every frame (it re-picks every frame by design,
   since `dist < 2` is immediately true).
4. **Lost the wall** (`js/combat.js:1438-1477`): first try to step onto an adjacent tile that IS
   boundary-adjacent; if none, full-room scan for the nearest boundary tile and step greedily toward it;
   only then, as a true last resort, any open tile. All three of these paths set `spikeWallDir = null`, so
   the spike re-acquires properly instead of steering off stale state — this is the bug the plan diagnosed.

`updateMovingSpike` is unchanged: same 46px/s lerp, same `dist < 2` snap-and-repick, same lazy
`spikeTargetTx === null` seed.

Notes / risk: highest-logic-risk item, and unplayable-untestable here. The four follow branches cover all
four distinct directions (`w=(f+3)%4`, `f`, `(f+1)%4`, `(f+2)%4`), so if any neighbor is open exactly one
branch fires — the fallback block is only reachable with no wall found or fully boxed in. Every path either
returns a target on an open tile or the spike's own tile, so it can never target a blocked tile and never
leaves `spikeTargetTx` unset. The full-room scan is O(tiles × obstacles) but is gated behind "no blocking
neighbor anywhere adjacent", which is rare, and behind the boxed-in early-out. Behavioral change a player
may notice: the patrol direction around a structure is now deterministically the left-hand sense rather than
the old randomized right-hand-first order; pits still count as open (unchanged from before), so a spike can
still lose a "wall" made of pits.

## Item 6 — Blue Fire

- `js/data.js:2516-2521`: `bluefire` — `hazard:true, attackable:false, destructible:true, dmg:1,
  heartDropChance:0.10, projectile:true, fireCooldown:2.4, boltColor:'#6aa8f0', color:'#4a7fd6',
  dark:'#254a80'`.
- Attack-proof, verified on all three hit paths, each of which gates on `ob.attackable` before
  `damageObstacleHit`: melee `js/combat.js:257-264`, projectile `js/combat.js:996`, and the new laser pass
  `js/combat.js:349`. `damageObstacleHit` itself also early-returns on `!ob.attackable`
  (`js/combat.js:269`), so there is no way in.
- Bomb-destructible: `explodeAt`'s obstacle loop qualifies on `if (ob.destroyed || (!ob.destructible &&
  !ob.attackable)) continue;` (`js/combat.js:1121`) — `destructible:true` passes. Same for the Taygeta star's
  `destroyAllObstacles` (`js/combat.js:1178`), which is consistent with every other destructible.
- Shooting: confirmed by reading `js/combat.js:1303-1318` that the third branch is generic — it fires at the
  player within 320px for any `projectile:true` def with no `angles` and no `targeting`. No dispatch code
  added.
- Draw: `js/utils.js:236-238` — the existing flame branch condition extended. The branch reads `def.color`/
  `def.dark` and guards `frac` with `ob.def.maxHp ? ... : 1`, so a maxHp-less flame renders at full opacity.
- Room editor: glyph `f` at `js/roomEditor.js:247` (checked for collisions against all existing glyphs) and a
  picker entry at `js/roomEditor.js:641`.

Notes / risk: the cinderguard trinket's fire immunity at `js/combat.js:1279` still only lists
`yellowfire`/`redfire`, so cinderguard does NOT protect against blue/purple contact damage. Left as-is
(adding them was not in the plan) — flagging it as a likely follow-up decision. Also, `OBSTACLES` grows from
24 to 26 kinds: the "Cartographer" bestiary ladder's top tier is threshold 24 (`js/achievements.js:1362`),
so it stays earnable but is no longer literal 100% completion; the bestiary "objects" percentage
(`js/bestiary.js:235`) now counts out of 26. No per-kind destruction achievement was added for the new
fires (achievements.js untouched).

## Item 7 — Purple Fire (homing bolts)

- `js/data.js:2522-2525`: `purplefire` — identical shape to `bluefire` plus `homing:2`,
  `boltColor:'#c98af0'`, `color:'#a34fd6'`, `dark:'#4f2570'`.
- `js/combat.js:1307-1309`: `boltOpts` gains `homing: ob.def.homing || 0`. Every other obstacle def lacks
  `homing`, so they all pass 0 and are unaffected. `Projectile` already reads `opts.homing`
  (`js/entities.js:382`) and `fireProjectileAngle` (`js/ai.js:117-120`) `Object.assign`s opts through
  untouched.
- `js/combat.js:974-985`: a new `else if (pr.homing && pr.owner === 'enemy')` branch after the existing
  player/familiar branch, steering toward `game.player` with the identical turn-rate formula. The existing
  branch is byte-for-byte unchanged.
- Turn rate at `homing:2`: `min(1, 0.15*2)*5 = 1.5 rad/s` at a bolt speed of 170px/s — a visible curve with a
  turn radius of ~113px (roughly 3.5 tiles), dodgeable, not a lock-on.
- Draw and room-editor registration: same as item 6 (`js/utils.js:238`, `js/roomEditor.js:247` glyph `p`,
  `js/roomEditor.js:642`).

Notes / risk: the new branch keys on `pr.owner === 'enemy'` (which is what obstacle-fired bolts are tagged
as — `fireProjectileAngle` hardcodes `'enemy'`), not on the bolt's `source` being an obstacle. Grep confirms
no enemy or boss currently passes a `homing` opt, so today this branch fires only for Purple Fire. If a
future enemy is given `homing`, it will inherit steer-at-player, which is the sane semantic anyway. The
branch has no range cut-off (the player branch gives up past 260px) — intentional, since the shooter only
fires within 320px to begin with.
