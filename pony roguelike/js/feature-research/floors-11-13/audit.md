# Floors 11-13 — implementation audit

## Slice 1 — floor infrastructure

Floor plumbing only. Superbosses, floor-specific enemies/bosses, the DNB Pony class
and the achievement reward pool are later slices. Until those land, floors 11-13
populate with stage-3 (Inferno) fallback enemies and generic bosses — expected.

### Files changed

| File | What changed | Line refs (post-edit) |
| --- | --- | --- |
| `js/stages.js` | 3 new `FLOOR_NAMES` entries (idx 10/11/12); `MAX_FLOORS` comment refreshed | 44-53 |
| `js/stages.js` | `floorKeyFor` extended: 10 -> 11A/11B, 11 -> 12A/12B, 12 -> '13'; header comment refreshed | 56-68 |
| `js/stages.js` | New `BRANCH_PALETTES_11`, `BRANCH_PALETTES_12`, `FINAL_PALETTE` + block comment | 99-132 |
| `js/render.js` | `currentPalette()` — 3 new floorNum cases (10/11/12) | 260-267 |
| `js/game.js` | `onBossDefeated` — `isBonusBossRoom` floor list extended to 8/9/10/11; comment updated | 262-270 |
| `js/game.js` | `descend()` — added floorNum 9/10/11 startFloor bypasses; comment rewritten | 398-411 |
| `js/game.js` | `isLastFloorOfRun()` — floor list extended to 8/9/10/11; comment updated | 414-422 |
| `js/dungeon.js` | `secondBossNode` condition extended to floorNum 8/9/10/11; rationale comment updated | 461-472 |

Not touched: `js/roomTemplates.js` (open in the user's editor), and everything in the
out-of-scope list.

### FLOOR_NAMES (appended)

```
idx 10: 'The Sunken Frequency'
idx 11: 'The Shattered Refrain'
idx 12: 'The One True Descent'
```

`MAX_FLOORS = FLOOR_NAMES.length` therefore becomes **13**. Its only consumers are
`js/roomEditor.js` (floor-toggle checkboxes at :22/:694/:720/:760-761) — no run-length
logic reads it, so this is inert for gameplay and only widens the editor's toggle row.

### floorKeyFor (full body after edit)

```js
function floorKeyFor(floorNum, branch){
  if (floorNum === 8) return branch === 'B' ? '9B' : '9A';
  if (floorNum === 9) return branch === 'B' ? '10B' : '10A';
  if (floorNum === 10) return branch === 'B' ? '11B' : '11A';
  if (floorNum === 11) return branch === 'B' ? '12B' : '12A';
  if (floorNum === 12) return '13'; // the finale — both branches converge, no A/B split
  return null;
}
```

Existing A-side-default-on-any-non-`'B'`-value behaviour preserved. Nothing consumes
the new keys yet (`room.js`'s `resolveGenericEnemy`/`resolveGenericBoss` will simply
find no `floorKey`-tagged entries and fall through to the stage pool) — Slice 4 adds
the tagged content.

### Palettes authored

All follow the existing 8-field shape (`floorA, floorB, wall, voidC, doorOpen,
doorLocked, grout, accent`) and reuse the project-wide `doorOpen:'#4a3320'` /
`doorLocked:'#26201a'` constants that every other palette uses.

`BRANCH_PALETTES_11`:

```
A (drowned abyss, cold/pressurised):
  floorA #141a2e  floorB #19203a  wall #0b0f1e  voidC #000
  doorOpen #4a3320  doorLocked #26201a  grout #05070f  accent #4f7fd8
B (flooded overgrowth, bioluminescent):
  floorA #0d2a2e  floorB #113438  wall #06181c  voidC #000
  doorOpen #4a3320  doorLocked #26201a  grout #030d10  accent #2fe0c4
```

`BRANCH_PALETTES_12`:

```
A (fractured violet):
  floorA #1c1030  floorB #23143c  wall #0f0820  voidC #000
  doorOpen #4a3320  doorLocked #26201a  grout #070312  accent #b04ff0
B (raw crimson):
  floorA #2a0c1c  floorB #341024  wall #180410  voidC #000
  doorOpen #4a3320  doorLocked #26201a  grout #0c0208  accent #ff3d7a
```

`FINAL_PALETTE` (flat, not keyed by branch):

```
  floorA #0a0a0c  floorB #101014  wall #050506  voidC #000
  doorOpen #4a3320  doorLocked #26201a  grout #020202  accent #ffd447
```

Intent: the A-side stays cold (violet/blue, continuing 9A's `#8a8ac9` and 10A's ice)
and the B-side stays organic/warm-shifting (continuing 10B's jungle green into teal,
then into crimson). 11 and 12 are markedly darker and more saturated than 9/10; floor
13 is near-black stone with a single blazing gold accent — the most extreme of the set.
Raw hex literals are correct here: these are data tables, not render/theme code.

### Lockstep pair 1 — `descend()` vs `isLastFloorOfRun()`

`js/game.js` `descend()` early-return (continue-the-chain) floors:

```
8 -> startFloor(9)
9 -> startFloor(10)   (new)
10 -> startFloor(11)  (new)
11 -> startFloor(12)  (new)
```

**Continue list: {8, 9, 10, 11}.** floorNum 12 has no bypass, so it falls through to
`const next = floorNum + 1; if (next >= maxFloorsThisRun) state = 'win'` — 13 >= 6 (or
8) is true, so the run ends after floor 13. Correct.

`js/game.js` `isLastFloorOfRun()` returns `false` for:

```
f === 8 || f === 9 || f === 10 || f === 11
```

**Not-last list: {8, 9, 10, 11}** — identical to descend()'s continue list. For
floorNum 12 it falls through to `f + 1 >= maxFloorsThisRun` -> true, so floor 13's
stairs read 'ESCAPE' (render.js:620's stairs label) and floors 9-12 read 'DOWN'.
**Agreed.**

### Lockstep pair 2 — `dungeon.js` secondBossNode vs `isBonusBossRoom`

`js/dungeon.js` (~:472):

```js
const secondBossNode = (floorNum === 8 || floorNum === 9 || floorNum === 10 || floorNum === 11) ? attachSpecial('boss') : null;
```

**Second-boss-room list: {8, 9, 10, 11}.**

`js/game.js` `onBossDefeated` (~:269-270):

```js
const f = this.dungeon.floorNum;
const isBonusBossRoom = (f === 8 || f === 9 || f === 10 || f === 11) && node !== this.dungeon.bossNode;
```

**Withhold-stairs list: {8, 9, 10, 11}** — identical. floorNum 12 (floor 13) is in
neither list: it generates a single boss room, and that room grants the staircase
normally. **Agreed.** If these ever diverge, floors 11/12 would get two working exits
(letting a run skip the floor's real superboss).

### NOT VERIFIED

- **JS syntax was not checked.** There is no JS runtime on this machine (node/bun/deno
  all absent), so nothing was parsed or executed. Verification was: re-reading every
  edit, plus a Python brace/paren/bracket balance check over the four touched files
  with strings and comments stripped — all four came back `{} 0 () 0 [] 0`. That
  catches structural damage, not typos in identifiers.
- **Nothing was run.** No floor was generated, entered, or rendered. No palette was
  seen on screen. Per the standing user constraint, no smoke test or test harness was
  written.
- **`FINAL_PALETTE` / `BRANCH_PALETTES_11` / `_12` load order** is assumed fine
  (`stages.js` defines them at top level; `render.js`'s `currentPalette()` reads them
  at call time, long after all scripts have parsed) — but the `<script>` tag order in
  the HTML was not re-confirmed for this slice.

#### Risks noticed while reading

1. **Slice ordering is load-bearing.** Until Slice 2, floors 11-13 have no superboss.
   `startFloor`/`enterRoom` force `bossNode` to that floor's superboss on the 9/10
   floors; whatever that lookup does when no superboss is registered for floorNum
   10/11/12 was not traced. Worst case is a generic boss (fine) — but if it indexes a
   table unguarded it could throw on entering the boss room. **Worth checking early in
   Slice 2.**
2. **`FLOOR_NAMES` is still indexed raw** (`ui.js:162`, `main.js:276`) with no bounds
   guard. It is now correct for 0-12, but the pattern remains fragile: any future floor
   added past 12 without a name prints `undefined` again. Not fixed here (out of scope).
3. **Room-template floor filters.** `roomTemplates.js` entries carry an optional `f`
   floor-allowlist; the ones present are `[0,1]`, `[2,3]`, `[4,5]` only. Templates with
   no `f` are allowed everywhere, so floors 11-13 draw from the unrestricted pool —
   the same situation floors 9/10 are already in. No regression, but floors 11-13 will
   visually reuse the same generic template set until templates are authored for them.
4. **`maxFloorsThisRun` is now decorative for the extended path.** With bypasses for
   floorNum 8-11, the cap (6, or 8 post-`polishDefeated`) no longer bounds a run that
   reaches the branch. That was already true for 9/10; this slice extends it by three
   floors. The only thing that ends a branched run is the floorNum-12 fall-through.
5. **Two independent `const f` declarations** were introduced in `js/game.js`
   (`onBossDefeated` :269, `isLastFloorOfRun` :419). Grep confirms no other `f`
   binding in that file, so there is no shadowing collision — noted only because a
   future edit adding a loop variable `f` in either method would now conflict.

---

## Slice 2 — DNB superbosses

Five new superbosses capping floors 11A/11B/12A/12B/13. Theme is drum-and-bass:
every one fights on a fixed rhythmic cadence rather than a random attack roll.
Floor-specific enemies, floor-specific regular bosses (the bonus second boss room
on floors 11/12 still falls through to the stage pool) and the DNB Pony class
unlock are still later slices.

### Files changed

| File | What changed | Line refs (post-edit) |
| --- | --- | --- |
| `js/enemies.js` | Header comment on `SUPERBOSSES` — added the "eleven entries, reward pool NOT resized, do not fix from this side" note | 630-636 |
| `js/enemies.js` | 5 new `SUPERBOSSES` entries + balance rationale comment | 652-667 |
| `js/ai.js` | New section header for the DNB superboss set | 1525-1541 |
| `js/ai.js` | New shared helper `dnbRing()` (evenly spaced ring, optional walkable gap) | 1543-1555 |
| `js/ai.js` | `aiBossPlapper` | 1557-1608 |
| `js/ai.js` | `aiBossClapper` | 1610-1653 |
| `js/ai.js` | `aiBossNhm` | 1655-1696 |
| `js/ai.js` | `aiBossVanillaDnb` | 1698-1739 |
| `js/ai.js` | `aiBossOneTrueDnb` | 1741-1896 |
| `js/combat.js` | 5 new dispatch cases in `updateEnemy`'s behavior switch | 854-859 |
| `js/entities.js` | 13 new state fields + `minions2` in the `Enemy` constructor | 299-322 |
| `js/game.js` | `startFloor` boss-assignment chain — floorNum 10/11/12 | 112-116 |
| `js/game.js` | `superbossDefeats` hardcoded literal — 5 new ids | 281-282 |

Not touched: `js/achievements.js` (out of scope, a later slice owns it),
`js/roomTemplates.js` (open in the user's editor).

### Wiring table — all four columns must line up

| id | behavior string | ai.js function | combat.js case | game.js floorNum |
| --- | --- | --- | --- | --- |
| `plapper` | `bossPlapper` | `aiBossPlapper` (ai.js:1562) | :855 | 10, A-side (11A) |
| `clapper` | `bossClapper` | `aiBossClapper` (ai.js:1616) | :856 | 10, `floorBranch === 'B'` (11B) |
| `nhm` | `bossNhm` | `aiBossNhm` (ai.js:1662) | :857 | 11, A-side (12A) |
| `vanilladnb` | `bossVanillaDnb` | `aiBossVanillaDnb` (ai.js:1703) | :858 | 11, `floorBranch === 'B'` (12B) |
| `onetruednb` | `bossOneTrueDnb` | `aiBossOneTrueDnb` (ai.js:1748) | :859 | 12, no ternary — converged (13) |

Both ternaries keep the existing habit of defaulting to the A-side on any
non-`'B'` value. floorNum 12 takes no ternary because 12A and 12B converge.

Every entry carries the required `icon` (🔊 👏 🎧 🍦 🌀) and, like the existing
six, carries NO `floorKey` and NO `stage` — they are never randomly picked.

### Balance — raw authored values (pre-curve)

`bossHpScale` is `1.28^floorNum`, so these are multiplied by roughly **13.0x**
(floorNum 10), **16.6x** (11) and **21.3x** (12) at runtime. The raw numbers below
are therefore deliberately close to the existing superbosses' — hand-inflating
them for depth would apply the curve twice.

| id | floor | raw hp | raw dmg | speed | radius |
| --- | --- | --- | --- | --- | --- |
| polish (existing) | 6 | 60 | 3 | 80 | 30 |
| tyrone (existing) | 8 | 62 | 3 | 68 | 33 |
| pineapple (existing) | 9A | 64 | 3 | 82 | 29 |
| israel (existing) | 9B | 64 | 3 | 82 | 29 |
| algae (existing) | 10A | 66 | 4 | 72 | 31 |
| lilac (existing) | 10B | 66 | 4 | 76 | 29 |
| **plapper** | **11A** | **68** | **4** | **74** | **31** |
| **clapper** | **11B** | **68** | **4** | **88** | **27** |
| **nhm** | **12A** | **70** | **4** | **60** | **33** |
| **vanilladnb** | **12B** | **70** | **4** | **78** | **30** |
| **onetruednb** | **13** | **76** | **4** | **82** | **34** |

`dmg` is held flat at 4 half-hearts across all five, matching Algae/Lilac.
`playerDamageAmount` adds `+1` half past the Inferno, so 4 already lands as
**2.5 hearts** on contact; 5 would be 3 hearts and a floor-13 boss that
three-shots a 6-heart player is not a fight. All projectile damage is `2`
half-hearts (1.5 hearts after the Inferno bonus) — identical to every existing
superboss bolt.

`onetruednb` is the only one nudged past +4: 76 raw × 21.3 ≈ 1620 effective HP,
which is what makes room for its five HP bands to each read as a real phase.

### New `e.<field>` reads, and where each is initialized

The NaN landmine. Every field any of the five AIs reads, with its entities.js
init line. Verified mechanically: all `e.<field>` identifiers in the new ai.js
block were extracted and cross-checked against `this.<field>` in entities.js.

| Field | Read by | Initialized at |
| --- | --- | --- |
| `beatTimer` | plapper | entities.js:304 (`Util.rand(0.8, 1.4)`) |
| `burstShots` | plapper, one-true | entities.js:305 (`0`) |
| `shotTimer` | plapper, nhm, one-true | entities.js:306 (`0`) |
| `barCount` | plapper, one-true | entities.js:307 (`0`) |
| `clapCount` | clapper, one-true | entities.js:308 (`0`) |
| `buildTimer` | nhm, one-true | entities.js:309 (`0`) |
| `dropShots` | nhm, one-true | entities.js:310 (`0`) |
| `dropAngle` | nhm, one-true | entities.js:311 (`0`) |
| `sweepTimer` | vanilla, one-true | entities.js:312 (`0`) |
| `sweepDir` | vanilla, one-true | entities.js:313 (`±1`, never 0) |
| `regenTimer` | vanilla | entities.js:314 (`0`) |
| `phaseIndex` | one-true | entities.js:315 (`0` — matches the full-HP band, so spawning never fakes a transition) |
| `phaseShift` | one-true | entities.js:316 (`0`) |
| `minions2` | plapper, clapper, one-true | entities.js:322 (`false`) — **pre-existing shared latch**, previously only ever assigned lazily in ai.js and read as `!e.minions2`. Declared now for clarity; `false` and `undefined` behave identically at all 7 read sites (grep-confirmed: ai.js only). |

Pre-existing fields reused unchanged, all already initialized: `attackTimer`,
`telegraph`, `shielded`, `submerged`, `spinAngle`, `fireTimer`, `healTimer`,
`summonTimer`, `minionsSpawned`, `hitFlash`, `hp`/`maxHp`, `dmg`, `type`, `x`/`y`.

Convention compliance:
- No AI calls `player.takeDamage()` — the two blast effects (Plapper's shockwave)
  go through `damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id)`.
  `js/ai.js` remains clean of direct `takeDamage` on the player.
- No AI constructs `new Projectile` directly. Every bolt goes through
  `fireProjectileAngle` / `fireProjectileAt` (or `dnbRing`, which wraps
  `fireProjectileAngle`), so `fromBoss`/`source` are always set and the
  reflect/absorb items keep working.
- No boss uses a `prevHp` threshold, so the Boss-constructor re-seed order is
  not load-bearing here. One-True's phases key off `e.hp / e.maxHp`, both of
  which the Boss constructor sets together after the HP curve.

### Fight designs (one line each)

- **Plapper (11A)** — fixed bar: rest beat (walks you down) → downbeat (roots,
  5 aimed shots at 0.13s). Every 3rd bar the downbeat becomes a shockwave: a
  0.7s rooted telegraph, then an 18-bolt ring with a 2-slot gap plus a 92px
  contact blast from its own position.
- **Clapper (11B)** — 0.45s vanish (`submerged`+`shielded`, Algae's dive pair, so
  render.js already draws it), reappears 95px from the *player*, instant solid
  8-bolt ring. Claps come in 2s, or 3s below half HP.
- **NHM (12A)** — 2.0s rooted buildup feeding adds (icecrawler, hard-capped at 8
  lifetime via the numeric `minionsSpawned` counter, bonecaller's pattern), then
  4 gapped 14-bolt walls at 0.18s each, gap rotating 3 slots per wave so the safe
  lane walks.
- **Vanilla (12B)** — 3.0s three-armed sweep at 1.5 rad/s firing every 0.1s,
  alternating with a 35%-chance 2.4s `shielded` regen phase (~2.5% of its bar
  total). Shield blocks damage outright (`Enemy.takeDamage` returns false when
  shielded), so it is a tempo loss to wait out, not a damage race.
- **One True DNB (13)** — 5 HP bands at 0.78 / 0.56 / 0.34 / 0.15: compressed
  bassline → snare → drop → sweep → **layered** (the sweep never stops while clap
  rings punch through it). Every transition wipes all sub-pattern state, fires one
  gold ring pulse, and then stands *completely still* for 1.0s (early `return`),
  so the player is always told the rules changed. Two staggered minion waves at
  0.56 and 0.20.

### NOT VERIFIED

- **JS syntax was not checked.** No JS runtime exists on this machine (node, bun,
  deno all absent), so nothing was parsed or executed. Verification was: re-reading
  every edit, a mechanical `e.<field>` → `this.<field>` cross-check, and a Python
  brace/paren/bracket balance pass over all five touched files with strings and
  comments stripped — `js/enemies.js`, `js/ai.js`, `js/entities.js`, `js/combat.js`,
  `js/game.js` all returned OK. That catches structural damage, not typos in
  identifiers.
- **No boss was ever instantiated.** Not one of the five has been spawned, drawn,
  or ticked. No projectile from any of them has existed.
- **All balance is unplaytested.** Every HP, damage, speed, cadence, projectile
  count and phase threshold above is authored from comparison against the existing
  six superbosses, not from play. Per the standing user constraint, no smoke test
  or verification harness was written.

#### Riskiest fights, and why

1. **NHM's drop is the densest thing in the game.** 4 waves × 11 bolts = 44
   projectiles in 0.72s, all live for the default 2.5s. If the boss room is small
   or cluttered with obstacles, the "walking gap" may not actually be walkable and
   the pattern becomes unfair rather than readable. Widen `gapWidth` (currently 3
   of 14 slots) or drop `dropShots` to 3 first if it plays badly. Its 12A room is
   also the one most likely to have a projectile-count spike.
2. **One True DNB's layered final phase is the single riskiest thing here.** A
   never-stopping 3-arm sweep plus periodic 14-bolt clap rings plus up to 5 live
   minions, all at once, below 15% HP. It is intended to be the hardest moment in
   the game, but it is the fight most likely to be *unfair* rather than hard. The
   telegraphs are in place; the density is the unknown. Reduce the layered phase's
   clap ring from 14 bolts, or slow `spinAngle` below 1.4 rad/s, if it walls.
3. **Clapper's blink is on a very short leash.** 0.45s of invulnerability every
   ~0.55-2.3s, and it always reappears 95px from the player. If `findNearestFloor`
   pushes the landing spot somewhere unexpected in a cramped room, it could land
   effectively on top of the player with a ring already firing. Algae uses the same
   trick at 60px and 1.1s, so the precedent is sound — but Clapper does it three
   times as often.
4. **Vanilla's regen is the only boss in the game that heals itself.** It is small
   (~2.5% per shield phase, capped at `maxHp`) and the shield is only 2.4s, but a
   low-DPS class could in principle see the bar move backwards and read it as a
   bug. Worth watching that it never out-heals a slow build's damage — at 35%
   proc chance the worst case is roughly 2.5% per ~6s cycle.
5. **Completionist got much harder, silently.** `achievements.js:657` requires
   `bossIds.every(...)` over `Object.keys(SUPERBOSSES)`, which is now **11**, not
   6 — so every character's `completionist_<class>` achievement now demands all
   five new superbosses too. That is a real gameplay consequence of this slice,
   not a bug, but it was not asked for and lives in an out-of-scope file. Flag it
   to whoever owns the achievements slice.
6. **The reward-pool overrun is live, as planned.** `achievements.js` now builds
   11 × 14 = **154** superboss achievements against an 84-entry `SUPERBOSS_REWARDS`
   pool. `SUPERBOSS_REWARDS[i]` is `undefined` past 83, `Object.assign(base,
   undefined)` is a no-op, and the mismatch is a `console.warn` at :144 — confirmed
   by reading, non-fatal. 70 superboss achievements currently grant no reward.
7. **`superbossDefeats` on existing saves.** The 5 new ids were added to the
   hardcoded literal at `game.js:281`, but that literal only runs when the key is
   entirely absent — an existing save with the 6-key object never gains the new
   keys. `game.js:282`'s `|| 0` read handles the missing key correctly, so counting
   works either way; noted only because the literal now lies about what an
   in-the-wild save contains. `ensureUnlockShape` still does not cover this field.

## Slice 3 — DNB Pony class

Adds a 15th playable class, `dnbpony` ("DNB Pony"), unlocked by defeating
`SUPERBOSSES.onetruednb` (The One True DNB) — i.e. by beating floor 13.
Class data + unlock wiring + cosmetics only. The reward-pool expansion is a
later slice and was deliberately left alone.

### Files changed

| File | What changed | Line refs (post-edit) |
| --- | --- | --- |
| `js/data.js` | New `dnbpony` entry appended to `CLASSES` (15th class) | 170-177 |
| `js/achievements.js` | New `unlock_dnbpony` character achievement | 96-97 |
| `js/achievements.js` | Stale "all 4 superbosses" prose comment fixed (Completionist header) | 152-161 |
| `js/achievements.js` | Stale "all 4" prose comment fixed (gotAll rollup) | 657 |
| `js/game.js` | `onBossDefeated` — fires `unlock_dnbpony` on `onetruednb` | 323 |
| `js/utils.js` | `classPonyOpts` — DNB Pony gets a horn + the jagged mane | 190, 197-200 |
| `js/utils.js` | `drawPony` mane comment updated (no longer kirin-only) | 1079-1081 |

Not touched: `js/enemies.js`, `js/ai.js`, `js/combat.js`, `js/entities.js` (owned by a
concurrent implementer), `js/ui.js` (needs no change — see chain link 5),
`js/roomTemplates.js`.

### The CLASSES entry, verbatim as written (`js/data.js:170-177`)

```js
  dnbpony: {
    id:'dnbpony', name:'DNB Pony', color:'#6a4bd6', mane:'#3ef0e0',
    unlocked:false, unlockHint:'Defeat The One True DNB on floor 13',
    redMax:5, startBlue:1, speed:178, canFly:false,
    attackType:'ranged', rangedDamage:2, fireCooldown:0.20, boltSpeed:330,
    startBombs:1, startKeys:1, startCoins:0,
    desc:'Born from the drop itself — a blur of violet and neon that fires bass pulses faster than anything alive, each one barely more than a tap.',
  },
```

Every field is consumed by the `Player` constructor (`js/entities.js:8-68`, read
not edited): `speed` -> `baseSpeed` (:14), `canFly` (:15), `attackType` (:16),
`rangedDamage` -> `baseRangedDamage` (:18), `fireCooldown` -> `fireCooldownBase`
(:20), `boltSpeed` (:21), `redMax` (:60-61), `startBlue` -> `blueCurrent` (:62),
`startCoins`/`startKeys`/`startBombs` (:64-66). No `baseRangeTiles` given, so
`entities.js:36` defaults it to **7 tiles** (the standard ranged value). No
mechanic flags (`laser`/`charged`/`unlimitedRange`/`noRedContainers`/
`lifedrinkChance`/`innateFreezeChance`), so all of those resolve falsy/0 — the
class is a plain fast-firing bolt caster with no special-case code path anywhere.

### The `classPonyOpts` lines added (`js/utils.js:190, 200`)

```js
      hasHorn: id === 'unicorn' || id === 'dnbpony',
      flameMane: id === 'kirin' || id === 'dnbpony',
```

`drawPony`'s cosmetic vocabulary is a closed set (`hasWings`, `hasHorn`,
`hasStripes`, `hasFangs`, `hasBeak`, `hasTalons`, `hasFinTail`, `isRobot`,
`flameMane`, `hasScales`, `ghostly`) — anything genuinely new would mean writing
a new drawing branch inside a completed graphics slice, so DNB Pony was given a
combination no other class uses instead: **horn + jagged mane**. The jagged mane
is drawn in `maneColor` (`utils.js:1082-1094`), i.e. the class's neon cyan, so it
reads as a waveform crest rather than fire; the kirin (the only other user) has
`flameMane` but no horn, and the unicorn has a horn but the plain ellipse mane.
`canFly:false` means no wings, so the silhouette stays ground-bound. **No raw
colour literals were added to utils.js** — every colour comes from `def.color`/
`def.mane` or an existing `Theme.pony.*` token (`Theme.pony.horn` at :1071).

### Unlock chain, end to end

1. **Class exists, locked.** `js/data.js:170-172` — `dnbpony` with
   `unlocked:false, unlockHint:'Defeat The One True DNB on floor 13'`.
2. **Achievement exists, carries the classId.** `js/achievements.js:96-97` —
   `{ id:'unlock_dnbpony', name:'Drop the Bass', icon:'🌀', desc:'Defeat The One
   True DNB on Floor 13.', category:'Characters', classId:'dnbpony' }`, sitting
   with the other 11 character unlocks (:74-97).
3. **The kill fires it.** `js/game.js:323` —
   `if (superbossId === 'onetruednb') unlockAchievement('unlock_dnbpony', this);`
   inside `onBossDefeated`'s `if (superbossId)` block, immediately after the
   `tyrone -> unlock_dragon` line (:322), matching the existing precedent exactly.
   `superbossId` is resolved at :279 from `SUPERBOSSES[enemy.type.id]`, and
   `SUPERBOSSES.onetruednb` exists at `js/enemies.js:666`.
4. **The unlock is persisted.** `js/achievements.js:593` `unlockAchievement` ->
   `:604-605` `if (def.classId) unlocks[def.classId] = true;` -> `:623`
   `saveUnlocks(unlocks)`. It early-returns at :597 if already earned, so the
   repeat calls on every subsequent kill are free. :625-628 then plays the
   `unlock` sound and toasts `New class unlocked: DNB Pony!` (it reads
   `CLASSES[def.classId].name`, which now resolves).
5. **The select screen reads it.** `js/ui.js:385` `buildClassSelect` —
   `const unlocked = def.unlocked || !!unlocks[id];` inside its
   `for (const id in CLASSES)` loop. Since the CLASSES entry is `unlocked:false`
   and `unlocks['dnbpony']` is what step 4 sets, the card flips from `???`
   (:403) + the `unlockHint` to a live, selectable card. **ui.js needed no edit.**

### Comment-only fix (no logic touched)

`achievements.js:152-161` and `:657` said the Completionist achievements require
"all 4 superbosses". `Object.keys(SUPERBOSSES)` is **11** after slice 2, so both
comments were reworded to say every superboss in `SUPERBOSSES` / all 11. The
`bossIds.every(...)` check at :659-662 and the achievement definitions at
:162-169 are byte-for-byte unchanged.

**Left stale on purpose** (both are prose/user-facing strings the brief did not
authorise touching):
- `achievements.js:166` — the Completionist `desc` string still reads *"Defeat
  all 4 superbosses while playing as the X."* This one is shown to the player and
  is now wrong by 7. It is a one-word fix; whoever owns the achievements slice
  should make it.
- `achievements.js:99-121` — the reward-pool header still says "all 14
  characters across all 6 superbosses ... 6 × 14 = 84". That whole block belongs
  to the out-of-scope reward-pool slice.

### Known, accepted consequence

The superboss achievement grid grows from 11 × 14 = **154** to 11 × 15 = **165**
against the unchanged 84-entry `SUPERBOSS_REWARDS` pool. Per the brief this is
expected and owned by a later slice: `SUPERBOSS_REWARDS[i]` is `undefined` past
83, `Object.assign(base, undefined)` is a no-op, and the count mismatch is a
`console.warn` at :146-149. Not fixed here, by instruction. Adding the class also
adds one more `completionist_dnbpony` achievement (the loop at :162 is dynamic).

### NOT VERIFIED

- **JS syntax is unverified.** No JS runtime exists on this machine (node/bun/deno
  all absent). Every touched file was re-read after editing and passed a
  string/comment-aware bracket-balance pass (`()[]{}`) — `js/data.js`,
  `js/achievements.js`, `js/game.js`, `js/utils.js` all balanced. That is not a
  parse.
- **The class has never been instantiated.** `new Player('dnbpony')` has not run.
  The field-by-field mapping above is from reading `entities.js:8-68`, not from
  execution.
- **The cosmetics have never been rendered.** The horn + jagged-cyan-mane
  combination was reasoned out of `drawPony`'s source (`utils.js:924-1129`), never
  drawn to a canvas. It could read badly at the class-select preview size
  (`ui.js:393`, 62px) or in-world (`render.js:702`, 34px).
- **Balance is unplaytested.** Per the brief the numbers were landed as given.
  One is worth watching: `fireCooldown:0.20` is the fastest in the game — faster
  than the pony bot's laser (0.24) and well clear of the griffin's 0.3 — while
  `rangedDamage:2` is double the griffin's 1. That is roughly 10 DPS before any
  item, versus the griffin's ~3.3 and the sea pony's ~4.2. Nothing in the
  constructor or the fire-rate pipeline breaks at 0.20 (it is a plain float and
  the pony bot already sits at 0.24), but fire-rate items stack on top of it, so
  DNB Pony is very likely the strongest class in the game as specified. Flagged,
  not changed.
- **The unlock has not been round-tripped through localStorage.** The chain was
  verified by reading, not by beating floor 13.


---

## Slice 4 — floors 11-13 enemies and bosses

Populates the five floor keys Slice 1 created (`11A`, `11B`, `12A`, `12B`, `13`).
Before this slice all five had zero entries in both tables, so
`resolveGenericEnemy` (`js/room.js:416-427`) and `resolveGenericBoss`
(`js/room.js:429-…`) both fell through to the stage-3 (Inferno) pool — a working
fallback, not a crash, but it meant the deepest four floors in the game reused
Inferno's roster and Inferno's bosses.

### Files changed

| File | What changed | Lines added |
| --- | --- | --- |
| `js/enemies.js` | 40 `ENEMY_TYPES` entries (8 per floor key) + 8 `BOSS_TYPES` entries (2 each for 11A/11B/12A/12B), plus two block comments explaining the depth-scaling and behavior-reuse rules | ~135 |
| `js/ai.js` | **none** — no new behavior was added | 0 |
| `js/combat.js` | **none** — no new dispatch case was needed | 0 |
| `js/entities.js` | **none** — no new constructor state was needed | 0 |
| `feature-research/floors-11-13/audit.md` | this section | — |

`js/roomTemplates.js`, `js/data.js`, `js/achievements.js`, `js/game.js` and
`js/utils.js` were not touched (the last four are another implementer's).

### Counts per floor key

| floorKey | enemies added | generic bosses added | superboss (slice 2) |
| --- | --- | --- | --- |
| `11A` | 8 | 2 | PlapperDNB |
| `11B` | 8 | 2 | ClapperDNB |
| `12A` | 8 | 2 | NHMDNB |
| `12B` | 8 | 2 | VanillaDNB |
| `13` | 8 | **0** (by design — finale, single boss room) | The One True DNB |
| **total** | **40** | **8** | — |

Verified by a bracket-aware parse of both tables after the edit:
`ENEMY_TYPES` floorKey counts `{9A:20, 9B:20, 10A:20, 10B:20, 11A:8, 11B:8,
12A:8, 12B:8, 13:8}`; `BOSS_TYPES` floorKey counts `{9A:2, 9B:2, 10A:2, 10B:2,
11A:2, 11B:2, 12A:2, 12B:2}` — nothing on `'13'`. No duplicate ids anywhere in
either table, and every new entry's object key equals its `id:` field.

### New roster — `ENEMY_TYPES`

| id | floorKey | behavior | hp | dmg | weight |
| --- | --- | --- | --- | --- | --- |
| `subcrawler` | 11A | `chaser` | 4 | 2 | — |
| `bassbreaker` | 11A | `chaser` | 10 | 3 | — |
| `pressurelurker` | 11A | `ambusher` | 6 | 3 | — |
| `depthmortar` | 11A | `lobber` | 6 | 2 | — |
| `abyssmarksman` | 11A | `sniper` | 5 | 2 | 0.6 |
| `fathomblinker` | 11A | `teleporter` | 5 | 2 | — |
| `sonarwarden` | 11A | `shielder` | 7 | 1 | — |
| `undertowmites` | 11A | `swarm` | 2 | 1 | — |
| `reefstalker` | 11B | `chaser` | 4 | 1 | — |
| `tidebeast` | 11B | `chaser` | 10 | 3 | — |
| `echoflyer` | 11B | `flyer` | 4 | 1 | — |
| `brinebomber` | 11B | `bomber` | 4 | 2 | — |
| `coralguard` | 11B | `shielded` | 7 | 2 | — |
| `bloomcaller` | 11B | `summoner` | 6 | 1 | — |
| `tidemender` | 11B | `healer` | 5 | 1 | — |
| `currentweaver` | 11B | `weaver` | 5 | 2 | — |
| `glitchstalker` | 12A | `chaser` | 4 | 2 | — |
| `fracturebrute` | 12A | `chaser` | 11 | 3 | — |
| `stutterleaper` | 12A | `leaper` | 5 | 3 | — |
| `phasecircler` | 12A | `orbiter` | 5 | 2 | — |
| `shardsplitter` | 12A | `splitter` | 6 | 2 | — |
| `discordmarksman` | 12A | `sniper` | 5 | 2 | 0.6 |
| `warpblinker` | 12A | `teleporter` | 5 | 2 | — |
| `refrainsentry` | 12A | `sentry` | 7 | 1 | — |
| `clipstalker` | 12B | `chaser` | 4 | 2 | — |
| `distortionbrute` | 12B | `chaser` | 11 | 3 | — |
| `peakcharger` | 12B | `charger` | 6 | 3 | — |
| `screamturret` | 12B | `turret` | 6 | 2 | — |
| `crushmortar` | 12B | `lobber` | 6 | 2 | — |
| `feedbackflyer` | 12B | `flyer` | 4 | 2 | — |
| `redlinelurker` | 12B | `ambusher` | 6 | 3 | — |
| `wailmites` | 12B | `swarm` | 2 | 1 | — |
| `onbeatstalker` | 13 | `chaser` | 5 | 2 | — |
| `downbeatbrute` | 13 | `chaser` | 12 | 3 | — |
| `crescendocharger` | 13 | `charger` | 6 | 3 | — |
| `apexmarksman` | 13 | `sniper` | 5 | 3 | 0.6 |
| `codablinker` | 13 | `teleporter` | 6 | 2 | — |
| `resonancewarden` | 13 | `shielder` | 8 | 1 | — |
| `finalemortar` | 13 | `lobber` | 7 | 2 | — |
| `goldenmites` | 13 | `swarm` | 3 | 1 | — |

### Balance baseline — the existing 10A/10B entries, unchanged

Shown alongside because every number above was authored by comparing directly
against this table and nudging by roughly 1, **not** by scaling for depth.
`enemyHpScale` is `1.32^floorNum`, i.e. ~16x on floorNum 10 and ~27x on 12, so
authoring "floor 13 sized" raw values here would apply the curve twice.

| id | floorKey | behavior | hp | dmg | weight |
| --- | --- | --- | --- | --- | --- |
| `icecrawler` | 10A | `chaser` | 3 | 1 | — |
| `glacierbeast` | 10A | `chaser` | 9 | 3 | — |
| `snowdrifter` | 10A | `flyer` | 3 | 1 | — |
| `frostbomber` | 10A | `bomber` | 3 | 2 | — |
| `permafrostguard` | 10A | `shielded` | 6 | 2 | — |
| `avalanchecharger` | 10A | `charger` | 5 | 3 | — |
| `icicleturret` | 10A | `turret` | 5 | 1 | — |
| `snowpouncer` | 10A | `leaper` | 4 | 2 | — |
| `frostarcher` | 10A | `ranged` | 3 | 1 | — |
| `blizzardcaller` | 10A | `ranged` | 3 | 2 | — |
| `glacialcircler` | 10A | `orbiter` | 4 | 1 | — |
| `crevassedelver` | 10A | `burrower` | 7 | 2 | — |
| `rimecaller` | 10A | `summoner` | 5 | 1 | — |
| `thawtender` | 10A | `healer` | 5 | 1 | — |
| `iciclemarksman` | 10A | `sniper` | 4 | 2 | 0.6 |
| `hailmites` | 10A | `swarm` | 2 | 1 | — |
| `driftlurker` | 10A | `ambusher` | 6 | 3 | — |
| `aurorablinker` | 10A | `teleporter` | 4 | 2 | — |
| `floeweaver` | 10A | `weaver` | 5 | 2 | — |
| `glaciersentry` | 10A | `sentry` | 6 | 1 | — |
| `junglestalker` | 10B | `chaser` | 3 | 1 | — |
| `canopybeast` | 10B | `chaser` | 9 | 3 | — |
| `pollenflyer` | 10B | `flyer` | 3 | 1 | — |
| `sporeburster` | 10B | `bomber` | 3 | 2 | — |
| `vineguard` | 10B | `shielded` | 6 | 2 | — |
| `tuskcharger` | 10B | `charger` | 5 | 3 | — |
| `totemturret` | 10B | `turret` | 5 | 1 | — |
| `foliagepouncer` | 10B | `leaper` | 4 | 2 | — |
| `thornarcher` | 10B | `ranged` | 3 | 1 | — |
| `mistcaller` | 10B | `ranged` | 3 | 2 | — |
| `canopywarden` | 10B | `shielder` | 6 | 1 | — |
| `gourdmortar` | 10B | `lobber` | 5 | 2 | — |
| `hummerwing` | 10B | `orbiter` | 4 | 1 | — |
| `rootdelver` | 10B | `burrower` | 7 | 2 | — |
| `hivecaller` | 10B | `summoner` | 5 | 1 | — |
| `sapmender` | 10B | `healer` | 5 | 1 | — |
| `mistblinker` | 10B | `teleporter` | 4 | 2 | — |
| `vineweaver` | 10B | `weaver` | 5 | 2 | — |
| `idolsentry` | 10B | `sentry` | 6 | 1 | — |
| `midgecloud` | 10B | `swarm` | 2 | 1 | — |

The one structural difference: 10A and 10B carry **20** entries each and cover
essentially every behavior; the new floors carry **8** each, deliberately
curated. With `room.js`'s per-room FEATURED bias (1-2 types carry most of a
room's spawns), a 20-deep pool smears; an 8-deep pool means the two featured
types on floor 13 are far more likely to both be genuinely dangerous ones. That
is where the intended difficulty step lives — composition, not stats.

### Roster identities (the A/B split, same as 9A/9B and 10A/10B)

- **11A — sub-bass abyss** (palette `BRANCH_PALETTES_11.A`, cold blue `#4f7fd8`).
  Long-range denial: `sniper` + `lobber` + `teleporter` shooting from range, an
  `ambusher` punishing the retreat, one `shielder` making the artillery
  temporarily unkillable, one brute and one swarm as the floor plan.
- **11B — flooded bloom** (`BRANCH_PALETTES_11.B`, bioluminescent teal `#2fe0c4`).
  Attrition instead of reach: `summoner` + `healer` + `shielded` means the room
  keeps regrowing, with `bomber`/`flyer`/`weaver` as the pressure. Almost no
  long-range threat at all — the mirror image of 11A.
- **12A — fractured refrain** (`BRANCH_PALETTES_12.A`, violet `#b04ff0`).
  Displacement and erraticism: `teleporter`, `orbiter`, `leaper`, `splitter`,
  `sniper`, `sentry`. `refrainsentry` has `sentryThreshold:34` (vs 30 elsewhere),
  so it punishes standing still slightly more readily than its 9/10 cousins.
- **12B — the clipped refrain** (`BRANCH_PALETTES_12.B`, crimson `#ff3d7a`).
  Pure forward pressure and **zero support**: no healer, no shielder, no
  summoner. `charger` + `ambusher` + brute in front, `turret` + `lobber` +
  `flyer` behind.
- **13 — the convergence** (`FINAL_PALETTE`, near-black + gold `#ffd447`).
  The A-side's reach (`sniper`, `teleporter`, `lobber`) welded to the B-side's
  staying power (`shielder`), plus the heaviest brute in the game and the
  fastest chaser. Only `goldenmites` is cheap filler.

### New generic bosses — `BOSS_TYPES`

| id | floorKey | behavior | hp | dmg | weight |
| --- | --- | --- | --- | --- | --- |
| `subdrowner` | 11A | `bossFurnaceHeart` | 58 | 3 | — |
| `pressurechoir` | 11A | `bossGraveChorus` | 56 | 2 | — |
| `brinebloom` | 11B | `bossRotBloom` | 56 | 3 | — |
| `glassreef` | 11B | `bossGlassScorpion` | 54 | 2 | — |
| `feedbackeffigy` | 12A | `bossSlagbound` | 60 | 3 | — |
| `brokenrefrain` | 12A | `bossAntlerWarden` | 58 | 3 | — |
| `redlineravager` | 12B | `bossDuneRavager` | 58 | 3 | — |
| `clippingcolossus` | 12B | `bossColossus` | 62 | 3 | — |

Baseline for comparison (unchanged):

| id | floorKey | behavior | hp | dmg |
| --- | --- | --- | --- | --- |
| `glacierfiend` | 10A | `bossGlacierFiend` | 56 | 3 |
| `blizzardwraith` | 10A | `bossBlizzardWraith` | 52 | 2 |
| `vinehorror` | 10B | `bossVineHorror` | 56 | 3 |
| `canopystalker` | 10B | `bossCanopyStalker` | 52 | 2 |

Selection rules applied, in order:

1. **Reuse only.** Adding eight new `aiBossXxx` functions is out of scope for
   this slice, so all eight reuse an existing behavior. `Util.drawBrownHumanoid`
   and `render.js`'s `drawEnemy` key off `behavior`, not `id`, so each of these
   renders exactly like the boss whose AI it borrows, with its own colors.
2. **No behavior already used by a floorKey boss.** `bossShadowStalker`,
   `bossStormbringer`, `bossFrostSentinel`, `bossBrickGolem`, `bossGlacierFiend`,
   `bossBlizzardWraith`, `bossVineHorror` and `bossCanopyStalker` are all spoken
   for by 9A/9B/10A/10B, so none of them was picked — a player descending
   A-side never fights the same generic boss pattern twice.
3. **No summoning boss.** Every `aiBossXxx` that spawns minions spawns a
   *hardcoded* one — `gravegrub`, `sandwisp`, `graveturret`, `sapling`,
   `duneskitter`, `cryptslinger`, `emberling`, `cinderhound`, `magmaleaper`,
   `brimstonebomber` (`js/ai.js:588, 635, 669, 705, 734, 771, 809, 817, 845, 853,
   884, 916, 944, 973, 1000, 1301`). Reusing one of those on floor 11-12 would
   drop a Crypt or Desert enemy into a drum-and-bass room. All eight picked
   behaviors are from the non-summoning set: `bossColossus`, `bossGraveChorus`,
   `bossRotBloom`, `bossAntlerWarden`, `bossGlassScorpion`, `bossDuneRavager`,
   `bossFurnaceHeart`, `bossSlagbound`.
4. **`brinebloom` carries `burstRadius:80`.** `bossRotBloom` is the one reused
   behavior that reads an optional type field: `js/ai.js:1349`
   (`(e.type && e.type.burstRadius) || 78`) and `js/render.js:743`
   (`|| 44`) both use it to size the delayed ground-target marker. Without it the
   AI would use 78 while the renderer drew 44, i.e. an AoE 1.8x larger than its
   telegraph. The existing `rotbloom` entry sets it to 78 for the same reason.
5. **hp 54-62.** One notch above 10A/10B's 52-56, still below the slice-2
   superbosses' authored 68-76, so a floor's capstone stays its biggest fight.
   `bossHpScale` (`1.28^floorNum`) is already ~13x on floorNum 10 and ~21x on 12.
   `dmg` follows the existing convention that fast bosses take 2 and heavy ones
   take 3 (cf. `blizzardwraith` speed 76 dmg 2 vs `glacierfiend` speed 40 dmg 3).

### New behaviors added

**None.** All 40 enemies and all 8 bosses reuse behavior strings that already
have a `case` in the dispatch switch at `js/combat.js:810-…`. Consequently:

- `js/ai.js` — no new `aiXxx` function.
- `js/combat.js` — no new `case`.
- `js/entities.js` — **no new `e.<field>`**, so the repo's #1 failure mode
  (an uninitialized numeric going `NaN` on its first `-= dt` and freezing the
  enemy silently forever) is not reachable from this slice. Every tuning field
  used below is already consumed by an existing entry on 9A/9B/10A/10B, and
  every piece of runtime state those behaviors touch is already eagerly
  initialized in the `Enemy` constructor (`js/entities.js:257-283`).

The only new *field value* introduced anywhere is `splitInto:'swarmerdnb'` on
`shardsplitter`. `splitter` is dispatched to `aiChase` (`js/combat.js:817`) and
its split is handled in `handleEnemyDeath` (`js/combat.js:691-700`), which reads
`ENEMY_TYPES[enemy.type.splitInto]` and guards on it being falsy. `swarmerdnb`
exists, is `isMinion:true` (so it never enters `resolveGenericEnemy`'s pool on
its own), and is already the default summon target for every `summoner`
(`js/ai.js:334`). The pre-existing `sapling` uses the same mechanism with
`splitInto:'sprout'`.

### Convention checks, all done by reading

- Every new `behavior:` string was matched against the set of `case '…':` labels
  in `js/combat.js`'s `switch (e.behavior)` dispatch. All 48 present.
- No new entry carries both `stage` and `floorKey`. (Programmatic check over a
  bracket-aware parse of both tables: zero hits.)
- No `floorKey` entry carries `xpTier`, matching all 40 pre-existing 9A/9B/10A/10B
  entries. (Same check: zero hits.)
- The 8 new bosses are on `11A`/`11B`/`12A`/`12B` only. `BOSS_LIST.filter(b =>
  b.floorKey === '13')` is empty, so `resolveGenericBoss` on floor 13 falls
  through to the stage pool — which never runs, because floor 13's only boss room
  holds the forced superboss.
- Bracket balance (`()`, `[]`, `{}`, string- and comment-aware) re-verified after
  the edit on `js/enemies.js`, `js/ai.js`, `js/combat.js`, `js/entities.js` — all
  four balanced. `js/ai.js`, `js/combat.js` and `js/entities.js` were read but
  **not modified**; they are listed only to confirm slice 2's work was not
  disturbed.

### NOT VERIFIED

- **JS syntax is unverified.** No JS runtime exists on this machine (node, bun
  and deno are all absent). The edits were re-read and passed a string- and
  comment-aware bracket-balance pass. That is not a parse — a stray missing
  colon or an unquoted key inside an object literal would not be caught by it.
- **No enemy from this slice has ever been instantiated.** `new Enemy(type, …)`
  has not run for any of the 40, and `new Boss(type, …)` has not run for any of
  the 8. Everything about which fields each behavior reads comes from reading
  `js/ai.js` and `js/entities.js`, not from execution.
- **Nothing has been rendered.** The claim that `Util.drawBrownHumanoid` picks a
  silhouette off `behavior` and therefore needs no new draw code was taken from
  the brief and from the absence of any id-keyed branch in `js/render.js`
  (`grep behavior js/render.js` returns two hits, neither a dispatch). No
  silhouette was drawn to a canvas, and no color pair was viewed against its
  floor palette. The 12A violets in particular sit close to
  `BRANCH_PALETTES_12.A`'s own `#1c1030`/`#23143c` floor and could read as
  low-contrast in play.
- **Balance is entirely unplaytested.** No room on floors 11-13 has been
  generated, let alone fought.

#### Riskiest entries, and why

1. **`resonancewarden` (13, `shielder`, hp 8).** A `shielder` hands out
   temporary invulnerability to nearby enemies. On floor 13 the things it would
   be shielding are `downbeatbrute` (hp 12 raw, i.e. ~27x → the tankiest trash
   in the game) and `finalemortar`. If `room.js`'s featured-bias roll picks
   `resonancewarden` + `downbeatbrute` as a room's two featured types, the
   result could be a room of near-unkillable brutes. It is the single entry most
   likely to need a `weight` below 1, and it does not have one.
2. **`apexmarksman` (13, `sniper`, dmg 3).** The only sniper in the game at
   `dmg:3` — every other one is 2. `playerDamageAmount` adds its own depth term
   on top of the half-heart count past the Inferno, and a sniper bolt travels at
   470 with a 1.1s telegraph. It has `weight:0.6`, which is the mitigation, but
   the damage number is a genuine outlier and was chosen for "the finale should
   bite", not from a calculation.
3. **`downbeatbrute` (13, `chaser`, hp 12).** The highest raw hp of any
   non-boss in the tables (previous high: 10, this slice's own `bassbreaker`
   and `tidebeast`; before this slice, 9). At `1.32^12` ≈ 27x that is ~324 HP.
   Justified as the floor's wall, but it is the entry where the
   "don't double-count the curve" rule is closest to being violated.
4. **`clippingcolossus` (12B, `bossColossus`, hp 62, speed 38).**
   The highest authored hp of any non-superboss in `BOSS_TYPES`. `bossColossus`
   is a *stage-1* pattern — it was authored to be fought on floor 2-3 and may
   simply be too slow and too readable to be interesting at floor 12, i.e. a
   long boring fight rather than a hard one. Reused anyway because rule 3
   (no summoning) left a short list.
5. **`shardsplitter` (12A, `splitter`).** The first `splitter` outside stage 1
   and the first to split into `swarmerdnb` rather than a stage-matched minion.
   `swarmerdnb` is `hp:1`, so its children ride the same `1.32^11` ≈ 21x curve
   and land around 21 HP each — probably fine, but `swarmerdnb` is also the
   enemy the forced per-floor swarm group uses (`dungeon.js`'s `forceSwarm`),
   so a 12A room could plausibly contain both the forced swarm of 5 and several
   splitter children of the same type. Unclear whether that reads as chaotic or
   as a bug.
6. **`tidemender` (11B, `healer`, `healAmount:4`).** `aiHealer` applies
   `healAmount` **flat and unscaled** (`js/ai.js:354`). At floorNum 10 an
   enemy's HP is ~16x its authored value, so 4 HP per 3s is very nearly nothing
   — this entry is far more likely to be *useless* than overpowered. Flagged as
   the opposite kind of risk: 11B's "sustain" identity may not actually
   materialize in play.

---

## Slice 5 — reward pool expansion

The superboss achievement grid grew twice in earlier slices (SUPERBOSSES 6 → 11
in Slice 2, CLASSES 14 → 15 in Slice 3) without the reward pool growing with it.
`js/achievements.js`'s grid loop indexes `SUPERBOSS_REWARDS` with a
strictly-incrementing counter and **no modulo**, so the 81 achievements past
index 83 were resolving to `undefined` and granting nothing. The count check at
the bottom of that block was firing on every page load. This slice authors the
missing 81 rewards.

### Files changed

| File | Change |
| --- | --- |
| `js/data.js` | +60 locked trinkets appended to `TRINKETS` (before `TRINKET_LIST`); +21 familiars appended to `FAMILIAR_TYPES` (before `FAMILIAR_LIST`); `dnbpony.fireCooldown` 0.20 → 0.32 |
| `js/items.js` | 60 ternary terms appended to existing formula lines in `recalcPlayerStats` across 15 stat channels (damage trinkets appear twice — melee and ranged lines) |
| `js/achievements.js` | 21 ids appended to `NEW_CLASS_REWARD_FAMILIARS`; SUPERBOSS_REWARDS header comment rewritten for the new arithmetic; Completionist `desc` "all 4 superbosses" → "every superboss" |

Not touched: `js/roomTemplates.js`, `js/enemies.js`, `js/ai.js`, `js/combat.js`,
`js/entities.js`, `js/familiars.js`, `js/stars.js`. The grid loop,
`unlockAchievement`, `ensureUnlockShape` and the persistence format are all
unchanged.

### Pool arithmetic

| | trinkets | pickups | items | familiars | stars | **pool** | **grid** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| before | 65 | 7 | 4 | 4 | 4 | **84** | **165** (11 × 15) |
| after | 125 | 7 | 4 | 25 | 4 | **165** | **165** (11 × 15) |

Pool and grid now match exactly, so the `console.warn` no longer fires and every
achievement maps to a unique reward. Verified by parsing the tables, not by
running anything.

Two facts made this mix the cheap one. A trinket with `locked:true` and no
`donationReward` joins the pool **automatically** — the filter is literally
`t.locked && !t.donationReward` — so no registry edit is needed, only a table
entry plus one ternary term. A familiar needs **zero** code: `js/familiars.js`
dispatches purely on `def.behavior`. Familiars do, however, have to be named by
hand in `NEW_CLASS_REWARD_FAMILIARS`, which is the one hardcoded list in the
chain and the one place a new id can be silently dropped.

Stars and active items were deliberately avoided for bulk: `js/stars.js` is a
hard `switch` needing a bespoke case per star, and `useActiveEffect` in
`js/items.js` is a 34-case switch.

### New trinkets (60)

Spread across 15 stat channels rather than concentrated. Nothing was added to
multishot, pierce, dodge, or crit multiplier — those compound hardest and
already have many sources. Magnitudes are in family with the existing locked
trinkets. Damage trinkets carry two line numbers because the melee and ranged
formulas are separate, duplicated lines.

| id | stat channel | magnitude | items.js line |
| --- | --- | --- | --- |
| `starweaveband` | luck | +2 | 31 |
| `gleamingacorn` | luck | +1 | 31 |
| `wishboneshard` | luck | +2 | 31 |
| `cloverpin` | luck | +1 | 32 |
| `fortunesthimble` | luck | +1 | 32 |
| `magpiefeather` | luck | +2 | 32 |
| `swiftbriar` | speed | +8% | 68 |
| `quicksilverspur` | speed | +10% | 68 |
| `breezyribbon` | speed | +7% | 68 |
| `fleetfootcharm` | speed | +9% | 69 |
| `galepin` | speed | +6% | 69 |
| `lightstepbead` | speed | +8% | 69 |
| `heavypommel` | melee + ranged damage | +1 | 95, 124 |
| `chippedfang` | melee + ranged damage | +1 | 95, 124 |
| `warscarredtoken` | melee + ranged damage | +1 | 95, 124 |
| `boneknuckle` | melee + ranged damage | +1 | 96, 125 |
| `sharpenedshard` | melee + ranged damage | +1 | 96, 125 |
| `grudgestone` | melee + ranged damage | +1 | 96, 125 |
| `oiledspring` | fire rate | +0.06 denom | 139 |
| `tickingcog` | fire rate | +0.05 denom | 139 |
| `rapidprimer` | fire rate | +0.08 denom | 139 |
| `nimbletrigger` | fire rate | +0.07 denom | 140 |
| `greasedhinge` | fire rate | +0.05 denom | 140 |
| `farcastprism` | range | +1 tile | 157 |
| `hawkseyebead` | range | +1 tile | 157 |
| `longreachrod` | range | +1 tile | 157 |
| `titanbanetooth` | boss damage | +10% | 181 |
| `colossusmark` | boss damage | +8% | 181 |
| `monsterhuntertag` | boss damage | +6% | 181 |
| `behemothsigil` | boss damage | +8% | 182 |
| `ogresgrudge` | boss damage | +5% | 182 |
| `crimsonleech` | lifesteal | +5% | 196 |
| `sanguinebead` | lifesteal | +4% | 196 |
| `vampiricthorn` | lifesteal | +6% | 197 |
| `redthirstpin` | lifesteal | +4% | 197 |
| `keenedge` | crit chance | +6% | 216 |
| `splittingpin` | crit chance | +5% | 216 |
| `weakpointmap` | crit chance | +7% | 216 |
| `focusinglens` | crit chance | +5% | 217 |
| `hairtriggerpin` | crit chance | +8% | 217 |
| `blightedthorn` | venom | +5% flat | 245 |
| `toxicbead` | venom | +4% flat | 245 |
| `seepingvial` | venom | +5% flat | 245 |
| `concussivebell` | stun | +5% flat | 251 |
| `ringingchime` | stun | +4% flat | 251 |
| `stunningclasp` | stun | +4% flat | 251 |
| `sweettalkpin` | charm | +5% flat | 257 |
| `doeeyedcharm` | charm | +4% flat | 257 |
| `honeyedtoken` | charm | +4% flat | 257 |
| `hoarfrostbead` | freeze | +5% flat | 264 |
| `chillsplinter` | freeze | +4% flat | 264 |
| `glacialpin` | freeze | +4% flat | 264 |
| `grimwhisper` | fear | +5% flat | 269 |
| `hollowmask` | fear | +4% flat | 269 |
| `shudderstone` | fear | +4% flat | 269 |
| `draweringot` | magnet radius | +40px | 280 |
| `lodestonechip` | magnet radius | +25px | 280 |
| `powderhorn` | bomb radius | +15% | 298 |
| `fusedcasing` | bomb radius | +10% | 298 |
| `blastwidener` | bomb radius | +12% | 298 |

Channel spread: luck 6, speed 6, damage 6, fire rate 5, boss damage 5, crit 5,
lifesteal 4, range 3, venom 3, stun 3, charm 3, freeze 3, fear 3, bomb radius 3,
magnet 2.

Note that every one of the five status channels, plus crit, lifesteal, magnet,
bomb radius, speed and boss damage, is already **capped** in
`recalcPlayerStats` (see the comment blocks there). These additions push against
those ceilings rather than past them — trinkets are single-slot, so at most one
of the 60 is ever equipped at a time.

### New familiars (21)

Pure data — `js/familiars.js` dispatches on `behavior` alone. Tuned to the DPS
bands documented in the `FAMILIAR_TYPES` header (orbiter dmg1 → cooldown 0.45,
dmg2 → 0.70, dmg3 → 0.90; shooter dmg1 → 0.85-1.10, dmg2 → 1.50-1.80, dmg3 →
2.20-2.40; freeze-capable orbiters sit one step under band, the freeze being the
payment). Proc rates follow the normalized table: heal 0.5/50s or 1/100s, coin
1/90s, charge 1/90s, luckpulse 1/120s.

| id | behavior |
| --- | --- |
| `ashenmite` | orbiter |
| `basaltward` | orbiter |
| `gildedgnat` | orbiter |
| `thistleburr` | orbiter |
| `rimemoth` | orbiter (freezeChance 0.15) |
| `slagbeetle` | orbiter |
| `duskbramble` | orbiter |
| `copperwhorl` | orbiter |
| `emberfinch` | shooter |
| `tidespitter` | shooter |
| `glasswing` | shooter |
| `boulderling` | shooter |
| `sparkfinch` | shooter |
| `thornlobber` | shooter |
| `prismmote` | shooter |
| `cragspitter` | shooter |
| `mendingmoth` | proc (heal) |
| `almsjar` | proc (coin) |
| `fortunefinch` | proc (luckpulse) |
| `sparkjar` | proc (charge) |
| `balmbloom` | proc (heal) |

All 21 carry `locked:true` and all 21 appear in `NEW_CLASS_REWARD_FAMILIARS`
(verified by parsing both).

### DNB Pony rebalance

`dnbpony` landed in Slice 3 with `rangedDamage:2, fireCooldown:0.20` — 10 base
DPS, against ~3.3 for the Griffin and ~4.2 for the Sea Pony, i.e. roughly 3x the
best class in the game. `fireCooldown` is now `0.32` (~6.25 DPS): still clearly
the strongest, which is right for the game's final unlock, but no longer in its
own category. Nothing else about the class changed.

### Known and accepted

Going from 14 to 15 classes changed the inner loop length, which **shifts the
reward index of every pre-existing superboss achievement**. Already-granted
rewards persist separately in the unlocks blob, so nothing is revoked — but a
given (boss, class) pair now grants a different reward than it did before this
update. Accepted by the user in advance.

### NOT VERIFIED

- **JS syntax is unverifiable on this machine.** There is no JS runtime
  installed (node, bun and deno are all absent) and no build step. All three
  edited files were re-read and passed a string/comment-aware bracket-balance
  pass, and the tables were parsed structurally (entry count, key-vs-`id:`
  agreement, duplicate ids, trailing commas, valid `behavior` values). That is
  the entire extent of the checking. Nothing was executed.
- **Nothing was instantiated.** No trinket was equipped, no familiar spawned, no
  `recalcPlayerStats` call made. The ternary terms were confirmed present and
  their ids confirmed to match the table keys exactly by parsing — a typo there
  would be silent, the trinket simply doing nothing — but the arithmetic they
  produce has never run.
- **No reward has ever been granted in play.** The pool-length-equals-grid-size
  invariant was checked by parsing, not by observing the `console.warn` stop
  firing.
- **All 81 magnitudes are unplaytested.** Every number was chosen by reading a
  dozen neighbouring entries and staying in family, not from measurement.

Most likely to be mistuned:

1. **`hairtriggerpin` (+8% crit).** Ties the largest single-trinket crit source
   in the game (`frostedsigil`). Crit is capped at 0.75 but is also the channel
   `luckBonus` feeds into, so a luck-heavy build reaches the ceiling sooner than
   the flat number suggests.
2. **`quicksilverspur` (+10% speed).** Ties the largest speed trinket. Movement
   speed is the strongest defensive stat in a game with no i-frames worth
   speaking of, and the speed clamp exists for a *collision-correctness* reason
   (see the ceiling comment at `js/items.js:37-45`), not a balance one.
3. **`titanbanetooth` (+10% boss damage).** Ties `giantsbane` and `voidshard`
   for the largest boss-damage trinket. Reasonable in isolation, but superboss
   rewards are precisely what you carry back into superboss fights.
4. **`vampiricthorn` (+6% lifesteal).** Highest of the four new lifesteal
   trinkets and tied with the highest existing one. Lifesteal against the game's
   half-heart contact damage is worth more than its percentage reads.
5. **`galepin` (+6% speed) and `tickingcog` / `greasedhinge` (+0.05 fire rate)**
   are the opposite risk — small enough that unlocking one may not be
   perceptible as a reward at all.
6. **`lodestonechip` (+25px magnet)** is the weakest entry in the whole batch;
   at the low end of an already-capped channel it is close to a null reward.

---

## Slice 6 — room templates for floors 11-13

The last piece. Before this slice, `roomTemplates.js` carried floor allowlists of
`[0,1]`, `[2,3]` and `[4,5]` only, so floors 11-13 drew exclusively from the
unrestricted (no-`f`) pool — exactly the situation Slice 1's risk note #3 flagged.
This slice authors 13 normal layouts and 1 boss layout tagged to the new floors.

### Files changed

| File | What changed | Line refs (post-edit) |
| --- | --- | --- |
| `js/roomTemplates.js` | Comment block + 8 `normal` templates tagged `"f":[10,11]` | 161-173 |
| `js/roomTemplates.js` | Comment line + 5 `normal` templates tagged `"f":[12]` | 174-179 |
| `js/roomTemplates.js` | Comment block + 1 `boss` template tagged `"f":[12]` | 190-194 |
| `feature-research/floors-11-13/audit.md` | this section | — |

Nothing else was touched. No existing template was modified, reordered or
reformatted. No new obstacle kind was introduced; `room.js`, `dungeon.js` and all
selection/filter logic are unchanged.

### Counts by tag

| tag | floors covered | array | count | masks |
| --- | --- | --- | --- | --- |
| `"f":[10,11]` | 11A, 11B, 12A, 12B | `normal` | 8 | all `[[1]]` |
| `"f":[12]` | 13 | `normal` | 5 | all `[[1]]` |
| `"f":[12]` | 13 | `boss` | 1 | `[[1,1],[1,1]]` |
| **total** | — | — | **14** | — |

### The branch-leak constraint, and how it shaped the 8 floor-11/12 entries

`js/dungeon.js:81` filters templates with `!tmpl.f || tmpl.f.includes(floorNum)`.
It reads **`floorNum` only** — never `branch`. So a template tagged `[10,11]` is
offered to 11A *and* 11B *and* 12A *and* 12B alike. A forced spawner
(`[x,y,"e","f","<id>"]`) is resolved verbatim, so a `subcrawler` (11A) forced into
a template would also appear in 11B rooms, whose roster is `reefstalker`/
`tidebeast`/etc. — a cross-branch leak with no error, just wrong content.

Consequently **all 8 of the `[10,11]` templates use generic spawners exclusively**
(`"e","g"` and, in one case, `"e","b"`). Those resolve through
`room.js`'s `resolveGenericEnemy`/`resolveGenericBoss`, which key off the room's
actual `floorKey` at runtime, so the same template correctly yields drowned-abyss
enemies on 11A and flooded-bloom enemies on 11B. The validator asserts this
mechanically: any `"e","f"` entry on a `[10,11]` template is a hard failure.

Floor 13 has no branch (`floorKeyFor(12)` returns `'13'` unconditionally, Slice 1),
so its 5 templates are free to force ids — and do.

### Obstacle vocabulary

Deliberately narrowed from the closed set in the file's header comment. Used:
`rock`, `hardrock`, `tallrock`, `tallhardrock`, `pit`, `spikedrock`, `tintedrock`,
`movingspike`, `turretn`/`turrete`/`turrets`/`turretw`/`turretplus`, `bombbarrel`.

Deliberately **not** used: `mud`, `sandtrap`, `cactus`, `yellowfire`, `redfire`
(jungle/desert/inferno-coded — they would fight the floor's own palette), and
`spike` (sacrifice-room-only per the header comment / `combat.js`). Floors 11-13
get their identity entirely from `BRANCH_PALETTES_11`/`_12`/`FINAL_PALETTE`
(Slice 1); the obstacles just need to read as drowned stone and machinery, which
is what the rock/turret/spike family already does.

### The 8 floor-11/12 layouts

| # | line | shape | obstacles | spawners |
| --- | --- | --- | --- | --- |
| 1 | 166 | corner ring | 12 `tallhardrock` (4 L-clusters) | 4 `"e","g"` centre cluster |
| 2 | 167 | E-W corridor | 12 `hardrock` in two vertical walls, gap at y 4-7 | 4 `"e","g"` at the two lane ends; `"d":"NS"` |
| 3 | 168 | centre block | 4 `hardrock` core + 4 `turretplus` corners | 4 `"e","g"` on the edge midpoints |
| 4 | 169 | quadrant pits | 12 `pit` (4 L-clusters) | 1 `"e","b"` — the only boss spawner in the batch |
| 5 | 170 | side turrets | 2 `turrete` + 2 `turretw` on the E/W walls, 4 `tintedrock` core | 4 `"e","g"` flanking the core |
| 6 | 171 | diagonal bands | 6 `spikedrock` on the main diagonal, 2 `movingspike` off-diagonal | 4 `"e","g"` |
| 7 | 172 | barrel chamber | 4 `bombbarrel` + 4 `rock` pillars, N/S openings | 6 `"e","g"` (4 inside, 2 in far corners) |
| 8 | 173 | open pillars | 4 `tallrock` + 4 `movingspike` | 4 `"e","g"` |

`"d"` is used exactly once (#2), where the layout is genuinely a corridor. Every
other template leaves door wiring entirely to `dungeon.js`.

`#4` is the only `"e","b"` in the normal set. On floors 11/12 that resolves through
`resolveGenericBoss` to one of the 8 floorKey-tagged bosses Slice 4 authored
(`subdrowner`/`pressurechoir` on 11A, etc.), so it reads as a bonus mini-boss room
rather than a mis-tagged boss room.

### The 5 floor-13 layouts

All forced ids come from the 8-entry floor-13 roster authored in Slice 4
(`onbeatstalker`, `downbeatbrute`, `crescendocharger`, `apexmarksman`,
`codablinker`, `resonancewarden`, `finalemortar`, `goldenmites`). The validator
cross-checks every one against `ENEMY_TYPES` **and** against that roster, so an
id from 11A/12B could not slip in.

| # | line | idea | forced content |
| --- | --- | --- | --- |
| 1 | 175 | turret cross, blocked centre | 2 `apexmarksman` + 2 `codablinker` in the corners, behind 4 `turretplus` |
| 2 | 176 | split room | `downbeatbrute` + `resonancewarden` north of a `tallhardrock` wall with a 2-tile `movingspike` gate; `finalemortar` + 2 `"e","g"` south |
| 3 | 177 | mortar nest | 4 `finalemortar` in the corners behind `spikedrock`, 4 `goldenmites` in the middle |
| 4 | 178 | charger runway | 2 `crescendocharger` + 2 `onbeatstalker` at the N/S ends of two open lanes cut by `pit` bands |
| 5 | 179 | turret arena | 8 turrets, one pair per wall, 4 `tallhardrock` corners, 1 `"e","b"` + 1 `goldenmites` |

`#5`'s `"e","b"` is intentional. `BOSS_TYPES` has **zero** `floorKey:'13'` entries
by design (Slice 4), so `resolveGenericBoss` falls through to the stage pool there.
That is a working fallback, not a bug, and it is why no boss id is forced on
floor 13 outside the real boss room.

`#2` is the one with a deliberate compositional risk: `resonancewarden` is the
`shielder` Slice 4 flagged as its riskiest entry, and this template pairs it with
`downbeatbrute` — the tankiest trash in the game — behind a wall. That pairing
would otherwise only happen by chance via the featured-type roll; here it is
guaranteed whenever this template comes up. It is meant to be the floor's
"you have to break through" room, but it is the first thing to delete if floor 13
plays as a wall.

### The floor-13 boss room

```
{"m":[[1,1],[1,1]],"s":[[10,11,"e","b"], <16 perimeter obstacles> ],"f":[12]}
```

The mask and the spawner coordinate are copied **verbatim** from the existing
untagged 4-block boss entry (`roomTemplates.js:189`). This is load-bearing:
`room.js`'s `populateRoomFromTemplate`/`instantiateSpawner` substitute
`opts.bossType` — the floor's forced superboss, i.e. The One True DNB on floorNum
12 (`game.js`'s `startFloor` chain, Slice 2) — at that spawner. Changing the mask
shape or the coordinate would change where the superboss lands. Neither was
touched.

Obstacles are a **perimeter frame only**:

- 4 corner L-clusters of `tallhardrock` at (2,2)/(3,2)/(2,3) and its three mirrors
  — 12 tiles, all within 3 of a wall.
- 4 inward-facing turrets, one per cardinal, rotationally symmetric:
  `turrets` at (8,1), `turretw` at (20,8), `turretn` at (13,20), `turrete` at (1,13).

The entire interior x 4-17 / y 4-17 is empty. That is required by the Slice 2
fight design: One True DNB runs a never-stopping 3-arm sweep, 14-bolt clap rings
and up to 5 live minions simultaneously in its layered phase, and Slice 2's own
risk note called density the unknown. Adding interior cover would make the
already-riskiest fight in the game unfair rather than hard.

Turret placement also avoids every door-eligible midpoint. For a 2x2 mask the
exterior door centres sit at tiles 5/6 and 15/16 of each edge; the four turrets sit
at 8 and 13, and every corner cluster is at 2/3 or 18/19. The validator asserts the
perimeter constraint (`x<=3 || x>=18 || y<=3 || y>=18`) on every obstacle, plus
that the mask is exactly `[[1,1],[1,1]]` and the spawner exactly `[10,11,"e","b"]`.

### Verification actually performed

**A JS runtime now exists on this machine** — `node v18.19.1` at `/usr/bin/node`.
Every earlier slice's "no runtime available" caveat does not apply to this one.

1. `node --check js/roomTemplates.js` — **passes** (run before and after the boss
   edit).
2. A throwaway validator (written to the session scratchpad, **not** committed)
   concatenates `js/data.js`, `js/enemies.js` and `js/roomTemplates.js`, strips
   each file's `'use strict'` prologue, evaluates the bundle in a single `vm`
   context and exports the real `ROOM_TEMPLATES` / `ENEMY_TYPES` / `BOSS_TYPES`
   objects. It then, for the 14 newly added templates only (selected by their `f`
   tag), asserts:
   - every `s` coordinate is an integer inside `1..cols*10` / `1..rows*10`
     (so 1-10 for `[[1]]`, 1-20 for the 4-block boss mask);
   - no two entries in one template share an `[x,y]`;
   - every `normal` template's mask is exactly one block;
   - every forced `"e","f","<id>"` id exists as a key in `ENEMY_TYPES` or
     `BOSS_TYPES`, and on `"f":[12]` is additionally a member of the 8-entry
     floor-13 roster;
   - **no** `"f":[10,11]` template forces an enemy id at all (the branch-leak check);
   - every obstacle kind is in the header comment's closed vocabulary *and* in this
     slice's narrower allow-list (so `mud`/`sandtrap`/`cactus`/fire/`spike` fail);
   - the boss template's mask, spawner coordinate and perimeter-only obstacle
     placement.

   Result: `templates under test: 14`, `{"normal f=[10,11]":8, "normal f=[12]":5,
   "boss f=[12]":1}`, **193 spawner entries checked, 0 failures**.
3. The validator was itself negative-tested: injecting a bogus enemy id, a
   duplicate coordinate, an out-of-bounds coordinate and a `mud` obstacle into one
   of the new templates produced 5 distinct failures and a non-zero exit. It is not
   a vacuous pass.

### NOT VERIFIED

- **No template has been rendered or played.** Nothing was generated, entered,
  drawn or fought. The whole check is structural: coordinates, uniqueness, id
  existence, obstacle vocabulary. Per the standing user constraint no smoke test
  was written and the game was not run.
- **Walkability was never solved.** Nothing checked that a spawner tile is
  reachable, that a room's doors are mutually connected, or that an enemy spawned
  behind an obstacle cluster can path out. Templates #2 and #7 of the floor-11/12
  set and #2 of the floor-13 set deliberately partition the room; the gaps were
  placed by hand and eyeballed against the header comment's grid, not proven.
- **Door-blocking is reasoned, not measured.** The claim that door centres sit at
  tiles 5/6 (and 15/16 on a second block) comes from reading the existing
  templates' obstacle placement conventions, not from `dungeon.js`'s door-wiring
  code. Obstacles were kept off those tiles on that basis. If door openings are
  wider than 2 tiles, template #1's corner clusters and the boss frame are still
  clear, but the floor-13 turret arena (#5, turrets at 3 and 8 on every wall) is
  the closest to a door centre in the batch.
- **`movingspike` travel paths were not simulated.** Four templates place
  `movingspike`; whether each one's sweep passes through a spawner tile, another
  obstacle, or a door mouth is unknown. Floor-13 #2 is the exposed one — its two
  `movingspike` tiles *are* the wall's only gate.
- **Template density is unplaytested.** 4-8 obstacles plus 2-6 spawners per room
  was matched by eye against the existing floor-1/2 and floor-3/4 entries. Floor 13
  is intentionally the heaviest of the set, which is also where Slice 4's
  `resonancewarden`/`downbeatbrute` risk and Slice 2's projectile-density risk both
  live. If floors 11-13 play as cluttered, the floor-13 five are the ones to thin.
- **Selection frequency was not modelled.** With 13 new normal templates now
  matching floors 11-13 alongside the ~40 untagged ones, roughly a quarter of rooms
  on those floors should draw from this batch — but `dungeon.js`'s picker was read
  only for its filter line (`:81`), not for its weighting.
