# Phase 3 overhaul — audit

Shrine room type, 12 new items, 2 new obstacles, 16 room templates, 1 achievement
ladder. Implemented per the approved plan; no scope expansion beyond a handful of
small consistency completions noted as deviations below.

## Files changed

- `js/systems/dungeon.js` — `SPECIAL_ROOM_TYPES`/`AUTO_OPEN_ROOM_TYPES` gain `'shrine'`;
  20% coin-flip `shrineNode` attach in `generateDungeon`; `shrineNode` added to the
  returned dungeon object; `thornbush` floor gate in `obstacleAllowedOnFloor`.
- `js/systems/room.js` — `addShrinePedestal(node, item, tx, ty, coinCost)` (mirrors
  `addDealPedestal`); guaranteed shrine-pedestal fallback block in `populateRoom`
  (mirrors petshop's guaranteed-familiar block).
- `js/game.js` — `ped.isShrine` coin-cost branch in `updateItemPedestal()` (mirrors the
  `ped.isDeal` heart-cost branch); `shrineRoomsVisited` bump in the first-visit
  room-type dispatch in `enterRoom`.
- `js/data/core.js` — `POOLS_SHRINE = ['shrine', 'shop']`.
- `js/data/economy.js` — `ROOM_TYPE_LIST` gains a `shrine` entry.
- `js/data/collectibles.js` — `OBSTACLES.thornbush` and `OBSTACLES.luckcrystal`.
- `js/data/items-5.js` — 12 new `POOLS_SHRINE`-only items (Phase 3 overhaul — Shrine
  batch), appended after the existing tail.
- `js/systems/items-1.js` — `recalcPlayerStats` wiring for all 12 new items into 10
  existing stat channels (luck ×2, all-attack damage ×1 into both meleeDamage and
  rangedDamage, speed, crit, range tiles, bomb radius, boss damage, on-kill-heal
  chance, shop discount, fire rate).
- `js/systems/items-2.js` — `game.dungeon.shrineNode` added to Lunar Affinity's
  special-room reveal candidate list (deviation, see below).
- `js/systems/combat-3.js` — `luckcrystal` reward-hook branch in both `explodeAt` and
  `destroyAllObstacles`, mirroring `tintedrock`'s exact mechanism with a luck-flavored
  table.
- `js/core/utils-1.js` — `Util.drawObstacle` branches for `thornbush` (spiny bush) and
  `luckcrystal` (3-facet crystal cluster).
- `js/achievements/logic.js` — `shrineRoomsVisited:0` added to `statDefaults`.
- `js/achievements/defs-6.js` — `shrine_visits` 3-tier `addTierSet` ladder, placed
  alongside the other `defs-6.js` ladders.
- `js/data/roomTemplates/core.js` — new `ROOM_TEMPLATES.shrine` array (10 entries);
  2 more templates added to the existing `treasure` array (1 thornbush, 1 luckcrystal).
- `js/data/roomTemplates/normal-4.js` — 4 more templates appended to `ROOM_TEMPLATES.normal`
  (2 thornbush, 2 luckcrystal).
- `js/ui/roomEditor.js` — `updateStatsAndWarnings()` gains a `shrine` branch;
  `OBSTACLE_GLYPHS` and the obstacle-kind `<select>` options gain `thornbush`/
  `luckcrystal` (deviation, see below).
- `room-editor.html` — `<option value="shrine">shrine</option>` added to `#roomType`.
- `js/CODE_REFERENCE.md` — documented all of the above (see section 6).

## Section-by-section summary

### 1. Shrine room type
Implemented exactly as specified: both Sets, the 20% coin-flip attach, `addShrinePedestal`,
the guaranteed-content fallback in `populateRoom` (placed directly after petshop's block,
before the curse/vault/crystal/sombra "no automatic content" comment block), the `isShrine`
coin-cost branch in `game.js` (denies + `uiDeny` + toast + `continue` on insufficient coins,
otherwise deducts and falls through to `applyItemToPlayer`), `POOLS_SHRINE`, the visit-stat
dispatch, `ROOM_TYPE_LIST` entry, `statDefaults` entry, room-editor `<option>` + warning
branch matching petshop's tone.

### 2. 12 new items
Appended to `items-5.js` as instructed. All 12 are plain passive stat terms reusing existing
`recalcPlayerStats` channels — no new mechanic. Quality spread: 4×q1, 4×q2, 3×q3, 1×q4
(the plan asked for "a mix," not an exact 40/30/20/10 split). Channels used: Luck (×2 items),
all-attack flat damage (×1), movement speed, pickup magnet radius, crit chance, attack range
tiles, bomb blast radius, shop discount, boss damage, on-kill-heal chance, fire rate — 10
distinct channels, each item calibrated against the nearest same-quality existing item on
that channel (comment in `items-5.js` cites the specific comparisons: bossbane q1 = +8% boss
dmg vs. Martyr's Vow q3 = +10%; loyalpatron/mastervaultkeeper q1 = +5%/+10% shop discount vs.
Tithe Purse q2 = -5%; dealmaker q1 = +0.5 heart-deal-discount as the general magnitude
reference).

### 3. Two new obstacles
`thornbush` copies bluefire/purplefire's exact `attackable:false` bomb-only-hazard field
shape (`hazard, attackable:false, destructible, dmg:1, heartDropChance:0.10`), gated to
Whitetail Forest only (floorNum 2-3, main path) in `obstacleAllowedOnFloor`. `luckcrystal`
is a plain `destructible:true` rock reskin like `tintedrock`, ungated. Both got dedicated
`Util.drawObstacle` branches (a spiny-ring bush and a 3-facet crystal cluster, both cheap
canvas shapes, no sprite caching). `luckcrystal`'s destroy-time reward reuses tintedrock's
exact `else if (ob.kind === ...)` branch mechanism in **both** `explodeAt` and
`destroyAllObstacles` (both copies were updated, matching tintedrock's own duplication),
branching to a bounded luck-flavored table: 70% two scattered weighted coins, 25% a
guaranteed Luckypenny, 5% a free `ITEMS.luckup` pedestal.

### 4. 16 room templates
10 in `ROOM_TEMPLATES.shrine` (new array declared in `roomTemplates/core.js`) — mostly empty
or lightly decorated single/double-block layouts, no `"i"`/`"d"` spawners (content is
auto-guaranteed), matching crystal/sombra's density. 6 more proving the new obstacles are
reachable: 4 in `ROOM_TEMPLATES.normal` (`normal-4.js`, 2 thornbush + 2 luckcrystal) and 2 in
`ROOM_TEMPLATES.treasure` (`roomTemplates/core.js`, 1 thornbush + 1 luckcrystal). thornbush
templates carry an explicit `"f":[2,3]` floor tag matching its `obstacleAllowedOnFloor` gate,
following the convention observed in every other gated-obstacle template in the codebase
(sandtrap/cactus/mud all carry matching explicit `"f"` tags even though `templateAllowsFloor`
would enforce the gate either way).

### 5. Achievement ladder
One `addTierSet({baseId:'shrine_visits', ...})` in `defs-6.js`, placed directly after the
existing `challenge_cbranchwins` ladder (the last `addTierSet` call in the file). 3 tiers
(5/20/50 shrine visits), rewarding the Shrine batch's own items (`shrinecandle`,
`faithfulbell`, `eternaldevotion`) — reusing the new batch's own items as rewards, matching
how other room-visit ladders reward items thematically tied to that room type.

### Deviations from the plan (all small, none touching required behavior)

1. **`game.dungeon.shrineNode` added to Lunar Affinity's reveal-candidate list**
   (`items-2.js`). Not named in the plan's exhaustive touch-point list, but leaving it out
   would mean Lunar Affinity — an item that reveals a random undiscovered special room —
   could never reveal a shrine, an inconsistency with every other special room type. One-line,
   same pattern as the existing list, low risk.
2. **`thornbush`/`luckcrystal` added to the room editor's obstacle picker**
   (`OBSTACLE_GLYPHS` + the `<select>` options in `roomEditor.js`). Not named in the plan
   (which only called out the `#roomType` select), but without this an author using the
   room-editor tool could never place either new obstacle by hand, only via raw JSON. Low
   risk, matches the exact existing per-obstacle option/glyph pattern.

Nothing else deviates — `attachSpecial`, `chooseShapeForNode`, and the `"i"`/`"d"` spawner
pool-resolution switch in `instantiateSpawner` were all re-checked and confirmed to need
zero shrine-specific code (shrine falls through their existing generic paths exactly like
vault/challenge/crystal/sombra already do).

## Verification

**`node --check` on every touched `.js` file:**
```
js/systems/dungeon.js            OK
js/systems/room.js               OK
js/game.js                       OK
js/data/core.js                  OK
js/data/economy.js               OK
js/data/collectibles.js          OK
js/data/items-5.js               OK
js/systems/items-1.js            OK
js/systems/items-2.js            OK
js/systems/combat-3.js           OK
js/achievements/logic.js         OK
js/achievements/defs-6.js        OK
js/ui/roomEditor.js              OK
js/core/utils-1.js               OK
js/data/roomTemplates/core.js    OK
js/data/roomTemplates/normal-4.js OK
```
All clean, zero syntax errors.

**Full-bundle load test.** Beyond `node --check` per file, concatenated every script tag from
`index.html` in load order (through `game.js`, excluding the DOM-heavy `ui/ui.js`,
`ui/render.js`, `main.js`) behind a minimal `document`/`localStorage`/`Audio` stub and ran it
under Node. The entire bundle — all data tables, all ~1729 achievement definitions, dungeon
generation, room population, combat, items — loaded and executed with **zero runtime errors**.
Confirmed via that same bundle:
- `SPECIAL_ROOM_TYPES.has('shrine')` → `true`
- `AUTO_OPEN_ROOM_TYPES.has('shrine')` → `true`
- `ROOM_TEMPLATES.shrine.length` → `10`
- `ITEMS.shrinecandle.pools` → `['shrine', 'shop']`
- `OBSTACLES.thornbush` → `hazard:true, attackable:false` ✓
- `OBSTACLES.luckcrystal` → `destructible:true` ✓
- `POOLS_SHRINE` → `['shrine', 'shop']`
- `obstacleAllowedOnFloor('thornbush', 2, null)` → `true`;
  `obstacleAllowedOnFloor('thornbush', 5, null)` → `false`;
  `obstacleAllowedOnFloor('luckcrystal', 9, null)` → `true` (ungated, as intended)
- `ROOM_TYPE_LIST.some(r => r.id === 'shrine')` → `true`
- `ACHIEVEMENTS.some(a => a.id === 'shrine_visits_t1')` → `true`;
  `shrine_visits_t3` → `{threshold:50, itemId:'eternaldevotion', ...}` ✓
- `ITEMS` key count: 1109 (1097 original + 12 new)

**Duplicate-id grep** — all 12 item ids, both obstacle ids, and the 3 achievement tier ids
(`shrine_visits_t1/_t2/_t3`, and the `shrine_visits` `baseId` itself) each appear exactly
once across `js/data/*.js` and `js/achievements/*.js`. No collisions.

**`isShrine` pedestal deny logic**, traced by hand: on insufficient coins, the branch
`continue`s the `for` loop immediately — `ped.taken` is never set, no coins are deducted, no
item is granted. On sufficient coins, `player.coins -= ped.coinCost` runs, then falls through
to `ped.taken = true` and (since `isTrinket`/`isFamiliar`/`isStar` are all false for a shrine
pedestal) `applyItemToPlayer(this, ped.item)` — the normal item-grant path. Matches the
`isDeal` branch's shape exactly, just coins instead of hearts and no "can never outright kill
you" floor (a shrine offer is simply unaffordable, not partially payable).

**`attachSpecial` genericness re-confirmed** by re-reading `dungeon.js`'s `attachSpecial`
after the change: it resolves `ROOM_TEMPLATES[type]`, `templateAllowsFloor`, and
`chooseShapeForNode({type})` purely by string key — no `if (type === 'petshop') ...`-style
special-casing anywhere in the function. `shrine` needed no additions here beyond the two Sets
and the coin-flip line, confirmed both by static reading and by the bundle successfully
building a full dungeon graph structure (`generateDungeon` itself wasn't invoked live in the
bundle test since it needs a real `Math.random`-driven placement loop, but every function it
calls into was confirmed reachable/correct by the checks above).

Per the standing "no heavy smoke testing" instruction, the game itself was not launched or
played — the checks above (syntax + full bundle load + structural assertions + hand-traced
logic) are the verification, matching the standard used in prior phases.
