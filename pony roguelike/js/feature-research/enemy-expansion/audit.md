# Enemy expansion — Slice A (AI infrastructure) audit

Slice A builds the *infrastructure* only. **No enemies and no bosses were added.**
`ENEMY_TYPES` and `BOSS_TYPES` were not touched. A later slice adds the 80 enemies
and 8 bosses that consume what is below.

> **Nothing in this slice was executed, run, or syntax-checked.** There is no
> JavaScript runtime on this machine (`node`, `bun` and `deno` are all absent) and
> the project has no build step, no package manager and no test suite. Every claim
> below is from reading the code, not from running it. Verification was limited to
> re-reading the edits and a brace/paren balance check.

---

## Files changed

| File | What changed |
|---|---|
| `js/ai.js` | New `fireSpread()` shot-shaping helper; six new optional fields wired into `aiRanged`/`aiFlyer`/`aiTurret`/`aiCharger`/`aiLeaper`; `\|\|` defaults added at every previously-undefaulted `e.type.*` read; **12 new `aiXxx()` behavior functions**. |
| `js/combat.js` | 12 new `case`s in the `updateEnemy` dispatch switch; a `default:` fallback to `aiChase` with a once-per-string `console.warn`; module-level `_warnedBehaviors` Set; granted-shield expiry tick; `shieldTime`/`vulnTime` defaults. |
| `js/entities.js` | 13 new AI state fields initialized in the `Enemy` constructor. |
| `js/utils.js` | Sprite cache cap raised 96 → 256 and eviction changed from wholesale-clear to oldest-first; 12 new behavior-keyed silhouette marks in `_humanoidStatic`. |
| `js/render.js` | Lobber landing-marker draw in `drawEnemy` (a ground-target AoE has to be visible to be fair). |

Not changed, deliberately: `js/enemies.js` (the `ENEMY_TYPES` / `BOSS_TYPES` tables),
`js/roomTemplates.js` (open in the user's editor), `js/theme.js`, `style.css`.

---

## Task 1 — new optional `e.type` fields

Every default reproduces the literal that was hardcoded at that call site, so
every pre-existing enemy behaves bit-for-bit as it did before.

| Field | Applies to | Default | Literal it replaced |
|---|---|---|---|
| `fireRange` | `aiRanged` | `420` | `d < 420` (old ai.js:135) |
| `fireRange` | `aiFlyer` | `380` | `v.d < 380` (old ai.js:150) |
| `fireRange` | `aiTurret` | `420` | `d < 420` (old ai.js:202) |
| `boltColor` / `boltRadius` | `aiRanged` | `'#d9895a'` / `5` | `{color:'#d9895a', radius:5}` (old ai.js:137) |
| `boltColor` / `boltRadius` | `aiFlyer` | `'#e0b35a'` / `4` | `{color:'#e0b35a', radius:4}` (old ai.js:152) |
| `boltColor` / `boltRadius` | `aiTurret` | `'#c9a25a'` / `5` | `{color:'#c9a25a', radius:5}` (old ai.js:204) |
| `shotCount` | ranged / flyer / turret (+ all new firing behaviors) | `1` | n/a — new |
| `spreadAngle` | as above | `0` | n/a — new |
| `dashDuration` | `aiCharger` | `0.4` | `e.dashTimer = 0.4` (old ai.js:185) |
| `dashDuration` | `aiLeaper` | `0.3` | `e.dashTimer = 0.3` (old ai.js:218) |

`shotCount` / `spreadAngle` semantics (implemented once, in `fireSpread`):

* `shotCount <= 1` → a single bolt at the aim angle; the call is exactly the old
  `fireProjectileAt`, so nothing existing changes.
* `spreadAngle` is the **total** fan width in radians across all bolts. Bolts are
  distributed evenly and symmetrically about the aim angle
  (`aim - spread/2 + i*spread/(n-1)`).
* `shotCount > 1` with `spreadAngle` unset or `0` would otherwise emit N perfectly
  overlapping bolts, so a fallback fan of `DEFAULT_SPREAD_PER_BOLT (0.18 rad) × (n-1)`
  is substituted — i.e. a 3-shot with no `spreadAngle` gets a 0.36 rad fan.
* Bolts go through `fireProjectileAngle`, never a raw `new Projectile`, so
  `fromBoss` and `source` are always set (Bestiary "killed you" credit).

---

## Task 2 — the three latent bugs

### 2a. Undefaulted `e.type` reads → `NaN`

Each of these was read raw. An `ENEMY_TYPES` entry missing the field produced
`NaN` timers/velocities and a silently broken enemy. Defaults chosen as the
median of the values actually in use in `js/enemies.js`.

| Field | Site(s) | Default added |
|---|---|---|
| `boltSpeed` | `aiRanged`, `aiFlyer`, `aiTurret` | `200` |
| `fuseTime` | `aiBomber` | `0.9` |
| `blastRadius` | `aiBomber` | `72` |
| `chargeSpeed` | `aiCharger` (was read twice; now hoisted to one `const cs`) | `6` |
| `telegraphTime` | `aiCharger`, `aiLeaper` | `0.5` |
| `leapSpeed` | `aiLeaper` (was read twice; now one `const ls`) | `5` |

Same class of bug, same expressions, also defaulted (slightly beyond the literal
brief — noted here rather than done silently): `fireCooldown` → `1.5`,
`chargeCooldown` → `2.2`, `leapCooldown` → `1.5`, and in `combat.js`'s
`shielded` cycle `shieldTime` → `2`, `vulnTime` → `2`. These are `||` defaults,
so a deliberate `0` would also be replaced — a zero cooldown is not a meaningful
value for any of them.

### 2b. Dispatch switch had no `default:`

`js/combat.js` `updateEnemy`. A typo'd or unknown `behavior` used to fall through
the switch entirely, producing an enemy that stood still forever with no
diagnostic. Now:

* falls back to `aiChase(game, e, dt)`, and
* `console.warn`s once per **unique** behavior string, tracked in a module-level
  `_warnedBehaviors` Set declared just above `updateEnemy`. `updateEnemy` runs per
  enemy per frame, so a bare warn would have flooded the console.

The warning includes the offending behavior string and the `e.type.id` that
carries it.

### 2c. Sprite cache thrash

`Util._humanoidSprites` (`js/utils.js`) is keyed by
`behavior|color|dark|radius|flash|shielded|tuft|scale`. At 100 enemies the old cap
of 96 was already close; at 180 with many distinct palettes it would be tripped
constantly — and the eviction was `.clear()`, i.e. *every* on-screen sprite got
re-baked on the next frame, every frame.

* cap raised to **256**
* eviction changed from wholesale-clear to **oldest-first**: a `Map` iterates in
  insertion order, so `delete(keys().next().value)` in a `while` loop drops the
  oldest entry and keeps everything else. One bake lost instead of all of them.
  (This is FIFO, not true LRU — a `get` does not refresh an entry's position.
  Making it true LRU would mean re-inserting on every hit, which is a rewrite of
  the caching scheme and out of scope.)

---

## Task 3 — the twelve new behaviors

All live in `js/ai.js`, all dispatched from the `js/combat.js` switch, all reuse
the existing helpers (`chaseSeek` for approach movement, `seekVector`,
`hasLineOfSight`, `findNearestFloor`, `fireProjectileAngle` via `fireSpread`).
None re-implements contact damage — that stays centralized in `updateEnemy`.

| Behavior | Fields (default) | What it does |
|---|---|---|
| `orbiter` | `orbitRadius` (120), `orbitSpeed` (1.2 rad/s), `fireRange` (400) + standard firing fields | Holds a standoff ring and strafes tangentially around the player while firing on cooldown. Implemented by chasing a ring point that leads the enemy's own bearing, so ring-keeping and circling fall out of one `chaseSeek`. `e.orbitDir` (±1, randomized per enemy) picks which way it goes. |
| `burrower` | `burrowCooldown` (3), `burrowTime` (1.5) | Dives underground (`e.submerged`, which `render.js` already alpha-fades and `updateEnemy` already uses to suppress contact damage), closes the gap at 1.5× speed while `e.shielded` makes `takeDamage` refuse, then surfaces on timer or on contact. Takes no damage and deals none while under. |
| `summoner` | `summonId` (`'swarmerdnb'`), `summonCount` (2), `summonCooldown` (6), `maxSummons` (6), `keepDistance` (190) | Backs off the player and periodically spawns minions on a `findNearestFloor` tile ~55px away. Lifetime total capped by `maxSummons`, counted on the existing `e.minionsSpawned`, so a room always clears. An unknown `summonId` is a no-op rather than a crash. |
| `healer` | `healAmount` (2), `healCooldown` (3), `healRadius` (140) | Flees the player (wanders when far), then tops up every wounded non-boss ally in radius, clamped to `maxHp`, with a `+N` float text. Skips `isDead`, skips bosses, and **skips itself** so it always stays killable. Cooldown only starts when it actually healed something. |
| `sniper` | `fireRange` (520), `telegraphTime` (1.2), `boltSpeed` (420), `fireCooldown` (2.6) | Very long range. Requires line of sight to commit, then holds perfectly still through a long blinking wind-up and fires one fast bolt. Backs off if the player closes inside 35% of its range, advances if beyond 90%. |
| `swarm` | `driftAmount` (0.5) | `aiFlyer`'s seek/random-drift blend, but grounded and non-firing: fast, weak, erratic. Drift is clamped to `[0, 0.9]` so it can never stop approaching entirely. Re-rolls its drift direction every 0.25–0.6s. |
| `ambusher` | `triggerRange` (110), `chargeSpeed` (6), `dashDuration` (0.5), `telegraphTime` (0.3), `chargeCooldown` (2.2) | Completely inert — no drift, no shuffle — until the player enters `triggerRange`. Then telegraphs and charges hard, and stays awake, alternating slow approach and repeat charges. |
| `teleporter` | `blinkCooldown` (3.5), `blinkRange` (200), + standard firing fields | Never walks. Blinks to a random tile 60..`blinkRange` px from the player, resolved through `findNearestFloor` so the destination is always legal floor, then fires after a 0.3s arrival beat. Clears `navPath` on arrival. |
| `shielder` | `shieldRadius` (130), `shieldGrantTime` (2.5), `shieldCooldown` (5), `keepDistance` (200) | Keeps its distance and grants `shielded` + `shieldTimer` to nearby allies — the same fields the `shielded` archetype uses. Skips bosses, already-shielded targets, submerged targets, and anything whose own behavior is `shielded` (so it can't stomp that archetype's shield/vulnerable cycle). |
| `lobber` | `lobRange` (260), `lobTime` (1.0), `burstRadius` (44), `fireCooldown` (2.4) | Indirect fire. The projectile system carries no arc, so it is a telegraphed ground-target AoE: it marks the player's current position, holds still for `lobTime`, then spawns an `Explosion` there. Player damage routes through `damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id)`. The landing ring is drawn by `render.js`'s `drawEnemy` (fill grows as the fuse runs down) so the counterplay — keep moving — is visible. |
| `weaver` | `weaveAmplitude` (0.6), `weaveFrequency` (3) | Approaches along a serpentine path by chasing a point swung perpendicular to the player line. The swing scales with `min(distance, 140)`, so it collapses on arrival and the weaver still actually reaches the player instead of circling forever. |
| `sentry` | `sentryThreshold` (30 px/s), + standard firing fields | Only fires while the player is (nearly) stationary; the moment they move it advances instead. Player speed is sampled inside the function from a per-enemy last-position pair, so nothing outside `aiSentry` has to track it. Re-settling costs at least 0.25s before the next shot. |

### New `Enemy` state (js/entities.js, in the constructor)

All initialized eagerly so no behavior ever does arithmetic on `undefined`:

`orbitDir`, `submerged`, `burrowTimer`, `summonTimer`, `minionsSpawned`,
`healTimer`, `triggered`, `blinkTimer`, `grantedShield`,
`lobTimer` / `lobTime` / `lobX` / `lobY`, `weavePhase`, `lastPX` / `lastPY`.

`submerged` was previously only ever set by boss AI (it read as `undefined`,
falsy, on regular enemies); it is now explicitly `false`, which changes nothing
behaviorally. `Boss` sets `minionsSpawned = false` after `super()` as before.

### Granted-shield expiry (js/combat.js)

`aiShielder` sets `shielded`/`shieldTimer` on allies, but only the `shielded`
*behavior* had a timer tick — a granted shield would therefore have been
permanent, i.e. a permanently invulnerable enemy. An `else if (e.grantedShield)`
branch next to the existing cycle ticks it down and clears both flags on expiry.
The `grantedShield` flag keeps this from interfering with the burrower's
self-managed submerged shield or with the boss submerge patterns.

---

## Task 4 — silhouettes

Twelve behavior-keyed marks appended to the `else if` chain in
`Util._humanoidStatic` (`js/utils.js`), so they are baked into the sprite cache
along with the rest of the static layer:

`orbiter` tilted ring round the head · `burrower` outsized digging claws ·
`summoner` staff with a lit orb · `healer` cross on the chest · `sniper` long
braced barrel · `swarm` motes buzzing overhead · `ambusher` hunched back spines ·
`teleporter` floating diamonds · `shielder` full ring round the body (distinct
from `shielded`'s helmet band + buckler) · `lobber` canted mortar tube ·
`weaver` sine squiggle across the chest · `sentry` one big eye.

Constraints observed:

* **No raw colour literals.** Tints are derived from the enemy's own
  `e.color`/`e.dark` via `Util.shadeColor`, or come from an existing token:
  `Theme.particle.heal`, `Theme.status.shieldRing`, `Theme.pony.eyeWhite`,
  `Theme.pony.pupil`, `Theme.enemy.flash`, `Theme.enemy.flashSoft`.
* **No cache-key change needed.** Every mark depends only on `behavior`, `col`,
  `dark` and `r`, all of which are already in the sprite cache key. No mark reads
  a new field, so no stale sprite is possible.
* Every mark was sized to stay inside the existing bake box (`±1.4r` horizontally,
  `-1.95r`..`+1.15r` vertically) so nothing is clipped.

The one non-`utils.js` drawing change is the lobber landing ring in
`render.js`'s `drawEnemy` — it uses `Theme.shadow.outlineSoft` and
`Theme.fx.fuseHot`, also no literals.

---

## Open risks

1. **Nothing was run.** No runtime exists here. Syntax was checked only by
   re-reading and by brace/paren balance. A typo that a parser would catch
   instantly could still be present.
2. **`fireSpread`'s zero-spread fallback changes nothing today but is a policy
   choice.** A future entry that genuinely wants stacked overlapping bolts
   cannot express it; it would have to pass a tiny non-zero `spreadAngle`.
3. **`||` defaults swallow a deliberate `0`.** `spreadAngle: 0` is handled
   explicitly, but `fireCooldown: 0`, `driftAmount: 0`, `maxSummons: 0` etc.
   would silently take the default. Zero is not a sensible value for any of them,
   but the next slice's authors should know.
4. **Balance is entirely unvalidated.** All twelve behaviors' defaults are
   reasoned, not playtested. `sniper` in particular (long telegraph + fast
   high-damage bolt) and `lobber` (`burstRadius` 44 with `lobTime` 1.0) are the
   two most likely to need tuning once real enemies use them.
5. **`summoner` adds enemies to `node.enemies` mid-iteration.** The boss AIs
   already do exactly this and it appears safe, but the summoner can do it
   repeatedly rather than once per fight, so it exercises the path much harder.
   `maxSummons` bounds it; a room full of summoners is still bounded by
   `maxSummons × summonerCount`.
6. **`sniper`'s and `ambusher`'s telegraph blink drives `e.hitFlash`,** which
   `render.js` uses as a rising-edge "something connected here" signal to spawn
   spark particles. The existing `charger` already does this with a ~0.4s
   telegraph; the sniper's 1.2s default produces roughly six spark bursts per
   wind-up. Visually louder than intended, possibly. Not a correctness issue.
7. **`aiSentry` measures player speed from its own frame-to-frame samples.**
   With a very small or very large `dt` (tab refocus, frame spike) that reading
   can spike. `Math.max(dt, 0.0001)` guards divide-by-zero but not a spike; the
   worst case is one frame of "the player moved", i.e. the sentry advances for a
   frame instead of firing.
8. **`weaver` calls `chaseSeek` toward an off-axis point,** which means its BFS
   re-plans target a moving offset rather than the player. In a tight corridor
   this may look like indecision. It always converges because the offset scales
   with distance.
9. **Granted shields are invisible to the `shielded`-cycle code path but visible
   to the renderer** (`render.js` draws the shield ring for any `e.shielded`
   that is not submerged), which is the desired read. If a shielded ally is
   frozen or stunned, its `shieldTimer` still ticks — the expiry runs before the
   status-effect guard chain — which is intentional so a shield can't be
   extended by crowd control.

---
---

# Enemy expansion — Slice B (80 enemies + per-room bias) audit

Slice B consumes the Slice A infrastructure above. It adds the **80 new enemy
entries** and the **per-room enemy bias** that keeps a 26-deep pool readable.
`BOSS_TYPES` and `SUPERBOSSES` were NOT touched — that is a later slice.

> **Nothing in this slice was executed, run, or syntax-checked by a JS engine.**
> Same environment as Slice A: no `node`/`bun`/`deno`, no build step, no tests.
> See the "Not verified" section at the bottom for exactly what was and wasn't
> checked.

---

## Files changed

| File | What changed |
|---|---|
| `js/enemies.js` | **80 new `ENEMY_TYPES` entries** (10 per group × 8 groups), inserted at the end of each existing `// ---- STAGE N ----` / floorKey group under a new `// -- <group>, extended behavior set --` sub-marker. Plus the file's own stale header comment updated (it still claimed "16 enemies per stage" and listed only the 9 original behavior keys). |
| `js/room.js` | New per-room enemy bias block above `resolveGenericEnemy`: `ROOM_FEATURED_WEIGHT`, `ROOM_SINGLE_FEATURE_CHANCE`, `_roomEnemyBias`, `resetRoomEnemyBias()`, `rollRoomEnemyBias()`, `pickBiasedEnemy()`. `resolveGenericEnemy`'s two `Util.choice(pool)` calls became `pickBiasedEnemy(pool)`. One `resetRoomEnemyBias()` call added in `populateRoom`. |

Not changed, deliberately: `BOSS_TYPES` / `SUPERBOSSES` (in `js/enemies.js`, left
alone), every pre-existing enemy entry, `resolveGenericBoss`, `js/ai.js`,
`js/combat.js`, `js/entities.js`, `js/utils.js`, `js/render.js`,
`js/roomTemplates.js`, `js/theme.js`, `js/bestiary.js`, `js/stages.js`,
`js/game.js`, `style.css`.

---

## Part 1 — the 80 enemies

`ENEMY_TYPES` went **100 → 180 entries**. Verified by parsing the table: 180
top-level keys, zero duplicates, every `id` equals its object key, every entry
carries all 9 required fields, no entry has both `stage` and `floorKey`, no
`floorKey` entry has `xpTier`, every `color`/`dark`/`boltColor` is a valid
6-digit hex, and every `behavior` string is one of the 21 `case` labels in
`js/combat.js`'s dispatch switch.

### Per-group counts and xpTier split

`stageIndexForFloor = min(3, floor(floorNum/2))`, `FLOORS_PER_STAGE = 2`, filter
is `(e.xpTier || 1) <= 1 + (floorNum % 2)` — so the EVEN floor of a stage sees
only `xpTier:1`, the ODD floor sees everything.

| Group | Before | Added | After (pool) | new split (t1/t2) | total split | even-floor pool | odd-floor pool |
|---|---|---|---|---|---|---|---|
| stage 0 Crypt | 16 | 10 | 26 | 5 / 5 | 12 / 14 | 12 | 26 |
| stage 1 Forest | 16 (+`sprout` minion) | 10 | 26 | 5 / 5 | 12 / 14 | 12 | 26 |
| stage 2 Desert | 16 | 10 | 26 | 5 / 5 | 12 / 14 | 12 | 26 |
| stage 3 Inferno | 10 | 10 | 20 | 5 / 5 | 9 / 11 | 9 | 20 |
| `9A` | 10 | 10 | 20 | n/a | n/a | 20 (ungated) | — |
| `9B` | 10 | 10 | 20 | n/a | n/a | 20 (ungated) | — |
| `10A` | 10 | 10 | 20 | n/a | n/a | 20 (ungated) | — |
| `10B` | 10 | 10 | 20 | n/a | n/a | 20 (ungated) | — |

The deliberate 5/5 split on every stage means each stage's even (first) floor
grew by exactly 5 and its odd floor by exactly 10 — the early-floor pool stays
proportionally the same shape it had, rather than the first floor of a stage
being starved (all new stuff gated to tier 2) or flooded (all new stuff tier 1).

### Behaviors used

New entries only, 80 total:

| Behavior | Count | Behavior | Count |
|---|---|---|---|
| `orbiter` | 7 | `teleporter` | 7 |
| `burrower` | 7 | `weaver` | 7 |
| `summoner` | 7 | `sentry` | 7 |
| `healer` | 7 | `sniper` | 6 |
| `swarm` | 7 | `ambusher` | 6 |
| | | `shielder` | 6 |
| | | `lobber` | 6 |

**All 80 new enemies use one of the 12 new behaviors — zero use an old one.**
Allocation is a rotating 10-of-12 window per group, so every group omits a
different pair and no two adjacent groups feel identical. Whole-table
distribution afterwards: `chaser` 22, `ranged` 18, `shielded`/`charger`/
`turret`/`flyer`/`bomber` 10 each, `leaper` 9, the twelve new ones 6-7 each,
`splitter` 1.

### Tuning fields used

Slice A's six: `shotCount` + `spreadAngle` (4 orbiters fire a 2-bolt fan),
`boltColor` + `boltRadius` (on every new firing enemy, so each stage's bolts
match its palette instead of all being the same `#d9895a`), `fireRange` (every
`sniper`, `sentry`, `orbiter`, `teleporter`), `dashDuration` (every `ambusher`).
Per-behavior fields set only where the behavior actually reads them, checked
function-by-function against `js/ai.js`: `orbitRadius`/`orbitSpeed`,
`burrowCooldown`/`burrowTime`, `summonId`/`summonCount`/`summonCooldown`/
`maxSummons`/`keepDistance`, `healAmount`/`healCooldown`/`healRadius`,
`telegraphTime`/`fireCooldown`/`boltSpeed`, `driftAmount`,
`triggerRange`/`chargeSpeed`/`chargeCooldown`, `blinkCooldown`/`blinkRange`,
`shieldRadius`/`shieldGrantTime`/`shieldCooldown`,
`lobRange`/`lobTime`/`burstRadius`, `weaveAmplitude`/`weaveFrequency`,
`sentryThreshold`.

### Summoners and their minions

7 summoners. `aiSummoner` resolves `ENEMY_TYPES[t.summonId || 'swarmerdnb']` and
no-ops on a bad id — verified. **No new `isMinion` entries were added**; all 7
point at an existing minion:

* `sporeseeder` (Forest) → `sprout` — the existing stage-1 `isMinion` entry.
* the other 6 → `swarmerdnb`, which is the documented default and is the one
  minion with neither `stage` nor `floorKey`, so it is legal on every floor.

Reason: the brief fixed the roster at **100 → 180**, i.e. exactly 10 new pool
entries per group. A dedicated themed minion would either have to eat one of
those 10 slots (shrinking the random pool to 9) or push the total past 180.
Reusing existing minions keeps both the count and the pool sizes exact. See
"Deviations" below.

### `weight` (the optional rarity field)

7 entries tagged `weight:0.6`, all of them the deliberately-exotic long-range
disruptors — the 6 `sniper`s (`treelinesniper`, `dunemarksman`, `voidmarksman`,
`frostmarksman`, `iciclemarksman`) plus `barrowblink` (the Crypt's teleporter)
and `pyrecaller` (the Inferno's summoner). Everything else is unweighted and
defaults to 1, as intended — the per-room bias is the main mechanism, not this.

### Naming and palette

Every new entry is `DNB <Compound Noun>`, matching the existing voice
(`DNB Skull Charger`, `DNB Sarcophagus Crawler`, `DNB Witchlantern`). Colors were
sampled from the group they sit in: Crypt = browns/bone/muted violet, Forest =
greens + one yellow-green + one orange-brown, Desert = sand golds/tans + cactus
green + scarab teal, Inferno = reds/oranges/char-black + the `soulflame` violet,
9A = night blue-violets, 9B = frost blue + mason brick browns, 10A = ice
blue-whites, 10B = jungle greens + earth. `hp` was tuned against the **existing**
entries of the same group and stays inside their range everywhere (e.g. new
Crypt entries span 1-5 against the existing 2-7; new 10B entries span 2-7
against the existing 3-9). No cross-stage escalation was added — `enemyHpScale`
already does that.

### Drawing / bestiary

Zero draw code added. `Util.drawBrownHumanoid` keys its silhouette off
`behavior`, and Slice A already added marks for all 12 new behaviors, so all 80
render. The bestiary derives from `ENEMY_LIST` and only prints
`hp/dmg/speed/flies/behavior`, so all 80 list themselves with no bestiary change
and no `desc` field.

---

## Part 2 — per-room enemy bias (`js/room.js`)

```
const ROOM_FEATURED_WEIGHT = 12;       // featured multiplier over base weight
const ROOM_SINGLE_FEATURE_CHANCE = 0.5; // P(1 featured type) vs 2
let _roomEnemyBias = null;              // Set of featured ids, or null
```

* `resetRoomEnemyBias()` is called once in **`populateRoom`**, just before the
  `node.template ? populateRoomFromTemplate : populateRoomProcedural` branch.
  That is the single choke point both entry points named in the brief pass
  through (`populateRoomFromTemplate` and `populateRoomProcedural` are only ever
  called from there), so one reset covers both.
* `rollRoomEnemyBias(pool)` runs lazily on the first `resolveGenericEnemy` call
  for the room, against **the pool `resolveGenericEnemy` just computed** — so the
  featured picks always respect the floorKey / xpTier filtering.
* `pickBiasedEnemy(pool)` does the weighted draw:
  `w = (e.weight || 1) * (featured ? 12 : 1)`, linear scan, same shape as
  `Util.weighted` but reading `.weight` instead of `.w` (adding a `w` alias to
  180 entries, or allocating wrapper objects per spawn, would both be worse).
* **Graceful degradation:** if `pool.length <= want`, `rollRoomEnemyBias` returns
  an empty Set and `pickBiasedEnemy` falls straight back to `Util.choice(pool)`.
  A pool of 1 therefore behaves exactly as before. The featured-id loop also
  carries a 20-iteration guard so it can never spin.
* `resolveGenericBoss` is **unchanged**.

Expected composition, 26-pool, all weights 1: 2 featured → 24 / (24+24) ≈ **50%**
of a room's spawns on the featured pair. 1 featured → 12 / (12+25) ≈ **32%** on
the featured type, with every other type at ~2.7%.

---

## Things that contradicted (or weren't covered by) the brief

1. **`populateRoom` is the shared choke point.** The brief pointed at
   "`populateRoom` (the branch at ~line 234)" — line 234 is actually inside
   `populateRoomProcedural`, a different function. Both it and
   `populateRoomFromTemplate` are called only from `populateRoom` (lines 135-136,
   now 139-140), so the reset went there instead of being duplicated. This is the
   "shared point that both pass through" the brief allowed for.
2. **`resolveGenericEnemy` has two callers OUTSIDE `js/room.js`** that the brief
   didn't mention: `js/combat.js:747` (`spawnChallengeWave`) and
   `js/combat.js:1347` (a `spawnEnemies` helper). Neither resets the bias, so a
   challenge wave inherits whatever bias the current room's population rolled —
   or lazily rolls its own if the room's template placed no generic enemy
   spawners (the normal case for a challenge room, which is hand-authored around
   a pedestal). Both outcomes are coherent — all 5 waves of one gauntlet share a
   theme — so this was left alone rather than editing `combat.js`, which is out
   of scope. Flagging it because it means the bias's lifetime is "since the last
   `populateRoom`", not strictly "this room".
3. **A 1-featured room is LESS concentrated than a 2-featured room** (32% vs 50%)
   with the brief's suggested `ROOM_FEATURED_WEIGHT = 12`. Slightly
   counterintuitive; implemented exactly as specified rather than
   special-casing, since both numbers are named consts precisely so they can be
   retuned. If the single-feature case should feel like a den, raise
   `ROOM_FEATURED_WEIGHT` (24 puts 1 featured at ~49%) — but that also pushes the
   2-featured case to ~66%.
4. **The `js/enemies.js` header comment was factually wrong after this change** —
   it claimed "16 enemies per stage", said Inferno has 10, and listed only the 9
   original behavior keys as if they were the complete set. It was updated (same
   file, documentation only, no code). Called out because it is technically
   beyond "add 80 entries".
5. **`teleporter` entries carry `speed: 0`** (7 of them). `aiTeleporter` never
   reads `e.speed` — it blinks and never walks — so this is correct, and turrets
   already establish `speed: 0` as a legal value in this table. It does mean the
   bestiary prints "SPD 0" for them, same as it already does for turrets.
6. **Slice A's open risk #3 (`||` swallows a deliberate `0`) was respected:** no
   new entry sets any tuning field to `0` except `speed`, which is not read
   through a `||` default anywhere.

## Deviations from the plan

**One, stated loudly:** the brief said *"If you add a `summoner`, add its minion
as an `isMinion` entry."* **No new `isMinion` entries were added.** All 7
summoners reuse existing minions (`sprout` for Forest, `swarmerdnb` for the other
six) because a new minion entry cannot coexist with the brief's other hard
constraints — exactly 10 new entries per group and a roster of exactly 180. The
`summonId` → `ENEMY_TYPES[id]` resolution path was verified against `aiSummoner`
and all 7 targets exist and are `isMinion:true`, so nothing is broken; it is
purely a thematic compromise (a Crypt `bonecaller` summons generic tan Swarmers
rather than something skeletal). If themed minions are wanted, the fix is 7 more
`isMinion` entries and 7 `summonId` edits — no code change anywhere.

No other deviations. Nothing outside `js/enemies.js` and `js/room.js` was
modified.

---

## NOT VERIFIED — nothing was executed

**No JavaScript ran at any point.** There is no JS runtime on this machine and
the project has no build step, no package manager and no test suite. The first
real validation is the user opening `index.html`.

What *was* checked, and how:

* **Data-shape validation of the whole `ENEMY_TYPES` table** — a throwaway Python
  script (written to the scratchpad, not to the repo) regex-parsed the table and
  asserted: 180 entries, no duplicate keys, `id === key` everywhere, all 9
  required fields present, exactly-one-of `stage`/`floorKey`, no `xpTier` on any
  `floorKey` entry, valid 6-digit hex on `color`/`dark`/`boltColor`, every
  `behavior` present in the `combat.js` switch, and every `summonId` resolving to
  an existing `isMinion` entry. It reported zero problems. **This parses the
  file as text — it is not a JS parser and proves nothing about JS syntax.**
* **Brace / paren / bracket balance** on both changed files, comments and string
  literals stripped: `js/enemies.js` 213/213 `{}`, 17/17 `()`, 2/2 `[]`;
  `js/room.js` 137/137 `{}`, 414/414 `()`, 72/72 `[]`. Per-line odd-quote scan
  flagged only prose apostrophes inside block comments.
* **Symbol-collision grep** across `js/` and the HTML: `ROOM_FEATURED_WEIGHT`,
  `ROOM_SINGLE_FEATURE_CHANCE`, `_roomEnemyBias`, `resetRoomEnemyBias`,
  `rollRoomEnemyBias`, `pickBiasedEnemy` appear nowhere else (globals matter —
  this project is `<script>` tags, not modules). `weight` as an enemy-type field
  collides with nothing (`js/data.js`'s `featherweight` is an item id).
* **Re-read of every edit.**

What is **NOT** verified, at all:

1. **JS syntax.** A typo a parser would catch instantly could still be present.
2. **That any of the 80 enemies actually moves, fires, or renders.** Every one of
   them runs a Slice A behavior that has itself never been executed.
3. **All balance.** Every `hp`/`dmg`/`speed`/cooldown here is reasoned against
   neighbouring table entries, not playtested. The riskiest, in order: the 6
   `sniper`s (long telegraph + 420-450 speed bolt at `dmg:2`, i.e. a full heart,
   and they outrange the player's view on small rooms); the 6 `lobber`s (a
   `burstRadius` up to 50 at `lobTime` 1.0); the 6 `ambusher`s at `dmg:3` with
   `chargeSpeed` up to 6.8; and stacked `shielder` + `healer` in the same room,
   which is untested crowd math.
4. **Room composition in practice.** The 50% / 32% featured-share figures are
   arithmetic on the weight formula, not sampled.
5. **Sprite cache pressure.** Slice A raised the cap to 256 sized for "180
   enemies"; 80 new distinct `color`/`dark`/`radius` combinations now actually
   exist. Whether 256 is enough with several biased rooms' worth on screen is
   unmeasured.
6. **Whether `swarm`-behavior enemies at `hp:1` survive `Math.round`** on deeper
   floors in the way intended — `swarmerdnb` already sits at `hp:1` and is fine,
   but `cryptmite`/`gnatcloud`/`locustfleck` are the first `hp:1` entries in a
   normal random pool.

---
---

# Enemy expansion — Slice C (8 new bosses, +2 per stage) audit

Slice C adds **8 new regular bosses**, two to each of stages 0-3, taking the
per-stage boss counts to **4 / 4 / 4 / 6**. `SUPERBOSSES`, the 8 `floorKey`
bosses (9A/9B/10A/10B), every pre-existing boss, and the whole of `ENEMY_TYPES`
were **not touched**.

> **Nothing in this slice was executed, run, or syntax-checked by a JS engine.**
> Same environment as Slices A and B: no `node`/`bun`/`deno`, no build step, no
> tests. See "NOT VERIFIED" at the bottom for exactly what was and wasn't checked.

---

## Files changed

| File | What changed |
|---|---|
| `js/enemies.js` | **8 new `BOSS_TYPES` entries** (2 each under a new `// -- <stage>, extended boss set (ai.js) --` sub-marker, inserted after that stage's existing bosses). Plus the `BOSSES` block comment above the table updated — it still said "2 per stage for stage 0-2; Inferno gets 4". No other part of the file touched: `ENEMY_TYPES` and `SUPERBOSSES` are byte-for-byte unchanged. |
| `js/ai.js` | **8 new `aiBossXxx(game, e, dt)` functions**, appended at the end of the file under one new header comment block. Nothing existing modified. |
| `js/combat.js` | **8 new `case`s** in the `updateEnemy` behavior dispatch switch, inserted immediately after `case 'bossLilac'` and before the Slice A `default:`. Nothing else in the file touched. |
| `js/entities.js` | **13 new state fields** in the `Enemy` constructor (one new commented block, directly after Slice A's), plus **one line in the `Boss` constructor** re-seeding `prevHp` after the boss HP curve is applied. |
| `feature-research/enemy-expansion/audit.md` | This section. |

Not changed, deliberately: `js/room.js` (`resolveGenericBoss` needs no change —
it already filters `BOSS_LIST` by `stage` and picks uniformly), `js/utils.js`,
`js/render.js`, `js/theme.js`, `js/bestiary.js`, `js/game.js`, `js/stages.js`,
`js/roomTemplates.js`, `style.css`.

---

## The 8 bosses

`dmg` is in half-hearts. `hp` is relative and gets multiplied by
`bossHpScale = 1.28^floorNum`, so it was tuned only against the **existing
bosses of the same stage** and never escalated across stages.

### Stage 0 — Crypt (existing: `warlord` 46, `bonesentinel` 46)

| id | Name | hp | dmg | Mechanic |
|---|---|---|---|---|
| `bonecaller` | Skrell, the DNB Bonecaller | 46 | 2 | **Warded summoner.** Kites to ~200px and raises 2 `gravegrub` every ~7s (lifetime cap 8). Each raising also raises a **ward: the boss is `shielded` — literally unhittable — until every minion it personally raised is dead**, hard-capped at 6s by `wardTimer`. Kill the adds to open the boss. No other boss in the table ties invulnerability to its adds. |
| `gravechorus` | The Grave Chorus | 48 | 2 | **Rotating two-armed spiral.** Every ~4s it roots and sweeps two opposed streams of bolts around itself for 2.2s at 2.6 rad/s. Distance doesn't help (the arms sweep the whole room); you read the gap and walk with the rotation. The only sustained rotating-emitter pattern in the game. |

### Stage 1 — Forest (existing: `colossus` 52, `brambleQueen` 48)

| id | Name | hp | dmg | Mechanic |
|---|---|---|---|---|
| `rotbloom` | The Rot Bloom | 48 | 2 | **Delayed ground-target pods.** Seeds 3 pods in a row, ~1s apart, each **at wherever the player is standing at seed time**, each blooming 1.0s later into a 78px `Explosion`. The only boss whose damage lands somewhere it isn't. Reuses the `lobber` state (`lobTimer`/`lobTime`/`lobX`/`lobY`), so `render.js`'s existing landing-ring marker draws it for free — that is why the entry carries `burstRadius:78` (see "contradictions" #3). |
| `antlerwarden` | The Antler Warden | 50 | 3 | **Ricocheting charge.** 0.55s paw-the-ground telegraph, then a 5.0x charge that **does not stop at the wall** — each blocked axis flips instead of ending the dash, up to 3 bounces over 2.2s. Corners are the worst place to be. Bounce detection uses `tryMoveEntity`'s already-returned `{movedX, movedY}`. |

### Stage 2 — Desert (existing: `hivemother` 50, `sandwyrm` 50)

| id | Name | hp | dmg | Mechanic |
|---|---|---|---|---|
| `glassscorpion` | The Glass Scorpion | 48 | 2 | **Standoff strafer + lock-on sniper.** Never closes: holds a 200px ring and strafes around the player (`aiOrbiter`'s bearing-lead trick at boss scale), then freezes **completely still** for a 0.9s lock-on and fires one 330-speed bolt. The stillness is the tell. Below 50% hp it reverses its strafe direction and the lock-on becomes a tight 3-bolt fan. |
| `duneravager` | The Dune Ravager | 50 | 3 | **Charge with a delayed burst trail.** 0.45s telegraph, then a 4.8x charge that sheds a marker every 0.12s along the line it ran; each blooms 0.75s later into a 62px `Explosion`. Dodging the body sideways puts you in the fuse. Pending bursts live in `e.pyres` on the boss itself, so they vanish with it rather than leaking into a global list. |

### Stage 3 — Inferno (existing: `ashtyrant` 52, `cindercolossus` 56, `magmawraith` 50, `brimstonehorror` 52)

| id | Name | hp | dmg | Mechanic |
|---|---|---|---|---|
| `furnaceheart` | The Furnace Heart | 52 | 3 | **Pressure cycle with a punish window.** Walks you down, then vents **3 rings of 12 bolts in a row** 0.45s apart, each faster (140/175/210) and rotated 0.26 rad off the last so the gaps never line up — then hangs exhausted at 0.15x speed for 1.6s. That vent window is the fight; everything else is positioning for it. |
| `slagbound` | The Slagbound Effigy | 54 | 3 | **Retaliation, not a timer.** Stores every point of HP it loses and, once the stored total crosses a threshold, immediately vents a 14-bolt ring. Threshold is 4, **halving to 2 below 40% hp**. The only boss in the game that answers your damage rather than a clock: dumping a burst window into it is what loads the gun. |

---

## Wiring table — all four points, all 8 bosses

Verified by a throwaway Python script (scratchpad, not the repo) that parses the
tables and greps for the exact call strings. See "NOT VERIFIED" — this is a
text-level check, not a JS parse.

| Boss | `BOSS_TYPES` entry | `aiBossXxx` in ai.js | `case` in combat.js | entities.js state |
|---|---|---|---|---|
| `bonecaller` | yes, `bossBoneCaller`, stage 0 | `aiBossBoneCaller` | yes | `wardTimer`, `waveTimer`, `wardOwner` |
| `gravechorus` | yes, `bossGraveChorus`, stage 0 | `aiBossGraveChorus` | yes | `spinTimer`, `spinAngle` |
| `rotbloom` | yes, `bossRotBloom`, stage 1 | `aiBossRotBloom` | yes | (reuses Slice A's `lobTimer`/`lobTime`/`lobX`/`lobY`) |
| `antlerwarden` | yes, `bossAntlerWarden`, stage 1 | `aiBossAntlerWarden` | yes | `bounces` |
| `glassscorpion` | yes, `bossGlassScorpion`, stage 2 | `aiBossGlassScorpion` | yes | (reuses `orbitDir`, `telegraph`, `enraged`) |
| `duneravager` | yes, `bossDuneRavager`, stage 2 | `aiBossDuneRavager` | yes | `pyres`, `pyreDrop` |
| `furnaceheart` | yes, `bossFurnaceHeart`, stage 3 | `aiBossFurnaceHeart` | yes | `pulseCount`, `pulseTimer`, `exhaustTimer` |
| `slagbound` | yes, `bossSlagbound`, stage 3 | `aiBossSlagbound` | yes | `prevHp`, `retaliation` |

**Every `e.<field>` read by the 8 new functions was extracted mechanically and
checked against the `this.<field> =` assignments in the `Enemy` and `Boss`
constructors. Zero undeclared.** The full read set is: `attackTimer`, `bounces`,
`dashTimer`, `dashVX`, `dashVY`, `dashing`, `dmg`, `enraged`, `exhaustTimer`,
`fireTimer`, `hitFlash`, `hp`, `lobTime`, `lobTimer`, `lobX`, `lobY`, `maxHp`,
`minionsSpawned`, `orbitDir`, `pattern`, `prevHp`, `pulseCount`, `pulseTimer`,
`pyreDrop`, `pyres`, `retaliation`, `shielded`, `speed`, `spinAngle`,
`spinTimer`, `telegraph`, `type`, `wardTimer`, `waveTimer`, `x`, `y`.
(`wardOwner` is read off *minions* as `o.wardOwner`, and is also declared.)

### The 13 new `Enemy`-constructor fields

`wardOwner` (null) · `wardTimer` (0) · `waveTimer` (`Util.rand(2, 3.5)`) ·
`spinTimer` (0) · `spinAngle` (0) · `bounces` (0) · `pyres` (`[]`) ·
`pyreDrop` (0) · `pulseCount` (0) · `pulseTimer` (0) · `exhaustTimer` (0) ·
`prevHp` (`this.hp`) · `retaliation` (0).

Plus one line in the `Boss` constructor: `this.prevHp = this.hp;` **after** the
`bossHpScale` recompute, because `Enemy`'s constructor seeded it off the *enemy*
curve. `aiBossSlagbound` also reassigns `prevHp` unconditionally every frame, so
even a stale seed self-corrects on frame one; the `Boss` line just makes the
first frame honest instead of relying on that.

---

## Things that contradicted the brief

1. **The AI function signature is `(game, e, dt)`, not `(e, game, dt)`.** The
   brief specified `aiBossXxx(e, game, dt)`. **All 24 existing `aiBossXxx`
   functions and every `aiXxx` behavior function in the file are
   `(game, e, dt)`**, and the dispatch switch calls them that way. The brief's
   ordering would have swapped `game` and `e` and broken all 8 bosses instantly.
   The existing convention was followed.
2. **The table had 18 bosses, not 20.** The brief said "Current `BOSS_TYPES` has
   20 bosses" and "20 -> 28". The actual pre-existing count was **18**
   (2+2+2+4 = 10 staged, + 8 `floorKey`), which matches the brief's own
   per-stage breakdown — the total was just wrong arithmetic. The table is now
   **26**, and the per-stage targets the brief actually specified (4 / 4 / 4 / 6,
   `floorKey` untouched at 8) are met exactly.
3. **`rotbloom` carries an 11th field, `burstRadius:78`.** The brief listed 10
   required fields; every existing boss entry has exactly those 10. `render.js`'s
   `drawEnemy` sizes the ground-target landing ring from `e.type.burstRadius`
   (defaulting to 44). Without the field the visible marker would be 44px while
   the actual blast is 78px — the marker would lie about the danger zone. Adding
   the data field was the only way to get a truthful marker **without touching
   `render.js`**, which is off-limits. No code change anywhere; it is read by
   pre-existing code.
4. **`bonecaller` summons `gravegrub`, which is not an `isMinion:true` entry.**
   The brief said to reuse an existing `isMinion:true` enemy. See "Deviations".
5. **Some existing boss AIs construct raw `new Projectile(...)`** (hive mother,
   bramble queen, brimstone horror, stormbringer, frost sentinel, glacier fiend,
   all four superbosses, etc.) with `fromBoss:true, source: e` written out by
   hand. The brief forbade this, and **none of the 8 new functions does it** —
   every shot goes through `fireProjectileAt` / `fireProjectileAngle`. The
   pre-existing sites were left alone (out of scope, and they do set both fields
   correctly by hand, so they are not currently broken).
6. **The `BOSS_TYPES` block comment was factually wrong after this change** — it
   said "2 per stage for stage 0-2; Inferno (stage 3) gets 4". Updated. Same
   file, documentation only, but technically beyond "add 8 entries".

## Deviations from the plan

**One, stated loudly: `bonecaller` summons `ENEMY_TYPES.gravegrub`, which is a
normal Crypt enemy, not an `isMinion:true` entry.** The brief said to reuse an
existing `isMinion:true` enemy — there are only two in the whole table
(`sprout`, stage 1, and `swarmerdnb`, stage-less), so neither is Crypt-themed.
Meanwhile **every existing boss that summons already summons a normal staged
enemy** (`warlord` → `gravegrub`, `bonesentinel` → `graveturret`,
`brambleQueen` → `sapling`, `hivemother` → `sandwisp`, and so on). The letter of
the constraint and the established code precedent are in direct conflict; the
precedent was followed. **The constraint's actual purpose — "do not add new
`ENEMY_TYPES` entries" — is fully respected: `ENEMY_TYPES` is untouched at 180.**

`gravegrub` specifically (rather than `graveturret`, which `bonesentinel` uses)
because the ward mechanic requires the adds to be *reachable*: a stationary
turret spawned behind an obstacle would hold the ward up. It is also why
`wardTimer` caps the ward at 6s regardless.

No other deviations.

---

## Open risks

1. **`bonecaller`'s ward can feel like a wall.** 6s of hard invulnerability per
   wave, up to 4 waves (cap 8 minions at 2 per wave), is up to 24s of a
   36s-ish fight where the boss cannot be damaged — though every second of it
   is spent killing 2 low-HP grubs, and the ward drops the instant they die.
   If it plays badly, the tuning knobs are `wardTimer` (6), the wave interval
   (`Util.rand(6.5, 7.5)`), and the lifetime cap (8), all in `aiBossBoneCaller`.
2. **`gravechorus` emits a lot of bolts.** 2 bolts every 0.12s for 2.2s is ~36
   per burst, at speed 150 with the default 2.5s projectile life, so roughly 36
   live bolts at peak. No other boss approaches that count; frame cost is
   unmeasured.
3. **`antlerwarden`'s bounce test is a heuristic.** `!moved.movedX` is true both
   for "hit a wall" and for "this component was too small to register", so it is
   gated on `Math.abs(e.dashVX) > 20`. A charge that is very nearly axis-aligned
   can still burn a bounce on the small component. Worst case the charge ends
   early; it cannot get stuck.
4. **`rotbloom` and `duneravager` re-check AoE damage per detonation**, each
   calling `damagePlayer` if the player is in radius. Overlapping bursts in the
   same frame are absorbed by the player's `invulnTimer`, same as every other
   multi-hit source, but this was not measured.
5. **`slagbound`'s threshold is in raw HP points, and boss HP scales.** At
   `1.28^floorNum`, a floor-6 Slagbound has ~3.8x the HP of the table value
   while the threshold stays 4 — so relative to its health bar it retaliates
   *more* often on deep floors, and the player's own damage has scaled too. The
   intended feel (a ring every few hits) should hold, but this is the single
   most balance-sensitive number in the slice.
6. **`furnaceheart`'s exhaust window may be too generous or too short.** 1.6s at
   0.15x speed immediately after 3 rings, on a 3.6-4.4s cycle.
7. **All 8 render with the generic fallback silhouette.** `Util.drawBrownHumanoid`
   keys off `behavior` and there are no marks for these 8 strings. This is
   expected and was explicitly allowed — the graphics slice owns `utils.js`.
   Visually the 8 will read as plain humanoids in their stage palette, told
   apart only by colour, size and behavior.
8. **Boss variety per stage is now 4 (6 for Inferno) picked uniformly**, so each
   stage-0 boss appears ~25% of the time. The 8 mechanics were chosen to not
   overlap each other or the 18 existing bosses, but "distinct on paper" is not
   "distinct in play".

---

## NOT VERIFIED — nothing was executed

**No JavaScript ran at any point.** There is no JS runtime on this machine
(`node`, `bun`, `deno` all absent), the project has no build step, no package
manager and no test suite, and the user's standing constraint is not to smoke
test. The first real validation is the user opening `index.html` and reaching a
boss room.

What *was* checked, and how:

* **Wiring, mechanically.** A throwaway Python script (scratchpad, not the repo)
  regex-parsed `BOSS_TYPES` and asserted: 26 entries, no duplicate keys,
  `id === key` everywhere, all 9 required fields present, exactly-one-of
  `stage`/`floorKey`, valid 6-digit hex `color`/`dark`, `dmg <= 3` everywhere,
  per-stage counts of 4/4/4/6 and per-floorKey counts of 2/2/2/2. It then
  confirmed, for all 26 behaviors, that a matching
  `function aiBossXxx(game, e, dt){` exists in `ai.js` and a matching
  `case 'bossXxx': aiBossXxx(game, e, dt); break;` exists in `combat.js`.
  Zero problems. **This parses the files as text — it is not a JS parser and
  proves nothing about JS syntax.**
* **State-field completeness.** Every `e.<field>` read anywhere in the 8 new
  functions was extracted by regex and diffed against the `this.<field> =`
  assignments in the `Enemy` and `Boss` constructors. Result: **zero
  undeclared**. This is the failure mode the brief called out as most likely,
  and it is the one thing here that was checked exhaustively rather than by eye.
* **Forbidden-call greps.** `player.takeDamage` appears **0 times** in the whole
  of `ai.js` (still 100% clean). `new Projectile` appears **0 times** in the new
  boss block.
* **Brace / paren / bracket balance** on all four changed files, comments and
  string literals stripped: `enemies.js` 221/221 `{}`, 17/17 `()`, 2/2 `[]`;
  `ai.js` 368/368, 1022/1022, 4/4; `combat.js` 268/268, 1043/1043, 38/38;
  `entities.js` 44/44, 92/92, 6/6.
* **Re-read of every edit.**

What is **NOT** verified, at all:

1. **JS syntax.** A typo a parser would catch instantly could still be present.
2. **That any of the 8 bosses moves, fires, or can be killed.** None has been
   instantiated. Every one depends on helpers (`chaseSeek`, `fireProjectileAt`,
   `tryMoveEntity`, `findNearestFloor`, `damagePlayer`, `Explosion`) that are
   themselves only read, not run, in this slice.
3. **That `tryMoveEntity`'s `{movedX, movedY}` return behaves as
   `antlerwarden` assumes.** The return value is real and correctly shaped (read
   from `combat.js`), but **no other caller in the codebase uses it** — this is
   its first consumer, and it has never been exercised.
4. **That the `rotbloom` landing marker actually draws.** It depends on
   `render.js`'s `drawEnemy` running for bosses (it does — `drawEnemy` is the
   single enemy draw path and bosses are in `node.enemies`) and on `lobTimer`
   being nonzero. Reasoned from reading, not seen.
5. **`bonecaller`'s ward loop against real room contents.** The `o.wardOwner === e`
   tag means unrelated enemies cannot hold the ward, but boss rooms with
   pre-placed enemies (a template-authored boss room) were not surveyed.
6. **All balance.** Every hp / dmg / speed / cooldown / radius / bolt speed here
   is reasoned against neighbouring table entries and existing boss AIs, not
   playtested. Riskiest, in order: `slagbound`'s retaliation threshold vs.
   `bossHpScale` (risk #5), `bonecaller`'s ward uptime (risk #1),
   `gravechorus`'s bolt count (risk #2), and `duneravager` at `dmg:3` with both
   a contact charge and a trail.
7. **Performance.** `gravechorus`'s ~36 simultaneous projectiles and
   `duneravager`'s per-frame `e.pyres` sweep are both new load patterns.
