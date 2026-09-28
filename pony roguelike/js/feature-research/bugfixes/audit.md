# Bugfix slice — audit

## Files changed

- `js/data.js`
- `js/entities.js`
- `js/combat.js`
- `js/ai.js`
- `js/dungeon.js`

Not changed (owned by the parallel agent): `js/render.js`, `js/utils.js`, `js/stages.js`,
`style.css`, `js/theme.js`. Nothing in them needed changing — see "Parallel-agent files" below.

Not changed (inspected, nothing wrong found): `js/room.js`, `js/game.js`, `js/items.js`,
`js/roomTemplates.js`, `js/roomEditor.js`.

No JS runtime is installed on this machine (`node`/`bun`/`deno` all absent), so `node --check`
could not be run. Every edit was re-read in place instead; all are small and local.

---

## Task 1 — mud is walkable without being a hazard

A new `walkable:true` obstacle flag now carries the "does not block" half of what `hazard:true`
was overloaded to mean. `hazard` keeps only its real meaning: deals contact damage.

- `js/data.js:1541-1546` — new block comment defining `walkable:true` and stating explicitly
  that it is independent of `hazard`.
- `js/data.js:1569-1572` — `sandtrap`: dropped `hazard:true`, added `walkable:true`; comment
  rewritten. It no longer deals contact damage (its own `desc` already claimed "no damage").
  Its freeze is untouched: `combat.js`'s `updateObstacles` drives the freeze from a separate
  `if (ob.isFreezeTrap)` branch keyed on `def.freeze`, not from the `isHazard` branch, and
  `Obstacle.isFreezeTrap` reads `def.freeze`. Verified before editing.
- `js/data.js:1573-1576` — `mud`: dropped `hazard:true`, added `walkable:true`; comment now
  matches reality.
- `js/entities.js:330-335` — `Obstacle` constructor reads the flag into `this.isWalkable`,
  alongside `isHazard`/`solid`/`isFreezeTrap`.
- `js/combat.js:109` (`collidesAt`) — now
  `if (ob.destroyed || ob.isWalkable || (ob.isHazard && !ob.solid)) continue;`
  so walkable obstacles never block movement, independent of hazard.
- `js/combat.js:74` (`tileHasObstacle`) — skips walkable obstacles, so mud tiles are eligible
  again for pickup drops and enemy spawns (`findClearFloorSpot` is built on this). Without it,
  the three near-fully-mud maze rooms at `js/roomTemplates.js:138-140` would have almost no
  legal spawn tile at all.
- `js/ai.js:37-40` (`makeIsBlockedFn`) — BFS pathing no longer treats walkable obstacles as
  blocked tiles.
- `js/combat.js:186-190` — mud's speed halving was left alone as instructed. It matches on
  `ob.kind === 'mud'`, so it is unaffected by the flag change. Confirmed still correct.

Three more places used `isHazard` (or nothing) as the de-facto "non-blocking" test. Removing
`hazard:true` from mud/sandtrap would have caused a *regression* in each, so they were updated
too. These are not in the plan's step list but are required for it to be correct:

- `js/ai.js:60` (`hasLineOfSight`) — mud/sand no longer break enemy line of sight. Previously
  they didn't (they were hazards); without this, every mud tile would suddenly blind enemies
  and force a BFS replan every 0.3s in the mud-maze rooms.
- `js/combat.js:890` (`updateProjectiles`) — bolts pass over walkable obstacles. Previously
  they did (hazard + not attackable); without this, mud/sand would eat every projectile,
  making the mud-maze rooms unplayable for ranged classes.
- `js/combat.js:130` (`tryPushObstacles`) — a Pushable Bomb Barrel can now be shoved onto a
  mud/sand tile, same as onto a pit. This one was *already* wrong before this change (mud was
  a hazard, but this loop never skipped hazards either); fixed for consistency with `collidesAt`.

**Room editor labels** (`js/roomEditor.js:646-647`) were checked and left as-is — "Sand Trap
(freezes the player for 0.5s, no damage)" and "Mud (half speed while standing on it, walkable)"
are both now *accurate*, where the sandtrap one used to be a lie.

## Task 2 — Crystal/Sombra only beside the boss, every second floor

- `js/dungeon.js:433-459` — `attachCrystalOrSombra()` is gone. Replaced with a single guarded
  block: on `everySecondFloor` (definition unchanged: `(floorNum % 2) === 1`) and with a
  non-null `bossNode`, both rooms attach directly to the boss via the existing
  `attachNextTo(bossNode, type)`. No `Util.chance` roll anywhere — guaranteed on a qualifying
  floor, absent otherwise. The `attachSpecial(type)` fallback was removed entirely.
- `js/dungeon.js:447` / `458` — the `maxDoors` hoist now goes to **3**, not 2: the boss's own
  entrance already consumes 1, and both new rooms need one each. Restored to 1 immediately
  after, which also re-seals the boss against the second boss room on floors 8/9.
- `crystalNode` / `sombraNode` changed from `const` to `let` and default to `null`; the return
  object at `js/dungeon.js:479` is unchanged, so `game.js:85-86` (Starlit/Infernal Compass) and
  `items.js:389` (Lunar Affinity) keep working with `null` on non-qualifying floors.
- Floors 8/9 second boss room (`js/dungeon.js:469`): unaffected. It runs after `maxDoors` is
  back to 1, and `attachSpecial`'s primary search only targets `r.type === 'normal'` leaves.
  Only the primary `bossNode` is ever attached to.
- Header doc comment `js/dungeon.js:20-32` and `attachNextTo`'s comment `js/dungeon.js:405-407`
  updated — both described the old 35%-roll / attachSpecial-fallback behavior.

### One deviation from the plan, deliberate — please read

The plan assumed both rooms can always fit beside the boss. **They usually can't.** 6 of the 7
boss templates in `js/roomTemplates.js` disable an entire axis (`"d":"NS"` on the three `[[1,1]]`
entries, `"d":"EW"` on the three `[[1],[1]]` entries). A 2-block boss room with one axis disabled
has exactly **2** door slots, and one is already spent on the boss's own map connection — so
only **one** free side remains. Only the single `[[1,1],[1,1]]` boss template can take both.

With a fixed call order, crystal would have won that last slot ~86% of the time and sombra
(the devil-deal room, and the only home of the `deal` spawner category) would almost never
have spawned. So the two attaches are run in `Util.shuffle(['crystal','sombra'])` order — a fair
coin flip for the contested slot. Net effect on a qualifying floor: one of the two is
guaranteed, both appear only on the 4-block boss template.

If both should *always* appear, the real fix is content, not code: re-author the boss templates
in `js/roomTemplates.js` to stop disabling a whole axis, or give crystal/sombra their own
placement anchor. That is a rebalance/content decision, so it was left for a later slice.

## Task 3 — Latent bug sweep

### Fixed

**`js/ai.js` (7 sites) — explosion damage bypassed `damagePlayer()`.**
Lines 168, 265, 386, 449, 593, 625, 845 called `player.takeDamage(playerDamageAmount(...))`
directly. `js/combat.js:27-30` states outright: *"every place the player actually takes a hit
should call this instead of `player.takeDamage()` directly."* The direct calls skipped
`damagePlayer`'s Ember Heart reaction (10%/stack chance to stun nearby enemies on being hit),
and passed no `source`, so `player.lastDamageSource` was left stale/undefined and the Bestiary
lost the "killed by" credit (`main.js:307`). All 7 are now
`damagePlayer(game, playerDamageAmount(game, <bool>), e.type.id)`. Damage *amounts* are
unchanged — this is a plumbing fix, not a rebalance.

Affected: DNB Bomber's suicide blast (`aiBomber`), and the slam/emerge AoE of Colossus,
Sand Wyrm, Tyrone, Cinder Colossus, Magma Wraith, and Algae.

### Swept clean — verified, no bug found

These were checked mechanically (scripted cross-checks) rather than by eye, so the negative
results are trustworthy:

- **Def-table typos.** Every `ob.kind ===` / `behavior ===` / `case '…'` string in the codebase
  resolves to a real key. Specifically: all 36 declared `behavior` values are covered by
  `combat.js:780`'s switch (minus `orbiter`/`proc`/`shooter`, which are *familiar* behaviors
  handled in `familiars.js`, not enemy behaviors); all 34 `type:'active'` items have a case in
  `items.js`'s `useActiveItem` and no case exists for a non-item; all `ITEMS.x`, `TRINKETS[x]`,
  `ENEMY_TYPES.x`, `BOSS_TYPES.x`, `SUPERBOSSES.x` and `player.passives.x` references resolve;
  all 12 `STAR_TYPES` and 13 `PILL_EFFECTS` ids have a matching case in `stars.js`/`pills.js`;
  every `pickItemFromPool()` argument is a real pool name.
- **Def-table integrity.** No duplicate keys and no key/`id:` mismatches in `ITEMS` (363),
  `TRINKETS` (118), `OBSTACLES` (26), `FAMILIAR_TYPES` (73), `STAR_TYPES`, `PILL_EFFECTS`,
  `CHEST_TYPES`, `ENEMY_TYPES` (100), `BOSS_TYPES` (18), `SUPERBOSSES` (6).
- **Enemy behavior data.** Every enemy with `behavior:'ranged'|'flyer'|'turret'` has
  `fireCooldown` + `boltSpeed`; every `bomber` has `fuseTime` + `blastRadius`; every `charger`
  and `leaper` has its telegraph/speed fields; every `splitter` has `splitInto`; every
  `shielded` has `shieldTime`/`vulnTime`. No `undefined` timer arithmetic is reachable.
- **`js/roomTemplates.js` data.** All 121 templates parse as JSON. Every spawner coordinate
  lands inside its own mask's floor area (no OOB, no spawner on a void block, no ragged masks).
  Every obstacle/enemy/pickup id referenced by a template exists. All `"f"` floor indices are
  in 0-9. All 6 spawner category codes decode.
- **Array mutation during iteration.** The only `splice` in the owned files
  (`js/dungeon.js:320`) is an index-based `while` loop, not a `for..of`. Every other removal is
  a rebuild via `.filter()` after the loop (`combat.js:496, 934, 959, 1287, 1292`). Pushes into
  `node.enemies` during the `for..of` in `game.js:428` are safe (new enemies just get a tick
  the same frame) and `handleEnemyDeath` never removes.
- **Double-detonation.** `detonateExplosiveProjectile` is called twice per dead bolt
  (`combat.js:899` and `932`) but is idempotent via `pr.exploded` (`entities.js:308`).
  `explodeAt`'s recursion into chained bomb barrels is guarded by `ob.destroyed`.
- **Tile index access.** Every `node.tiles[y][x]` read in the owned files is either preceded by
  an explicit bounds check (`isTileSolidForEntity`, `findNearestFloor`, `findClearFloorSpot`,
  `spikeTileOpen`) or is a `Util.clamp`ed value (`openChestContents:636-637`).
- **Event listeners.** Zero `addEventListener` calls exist in any of the owned files; they all
  live in `main.js`/`roomEditor.js`/`ui.js`/`bestiary.js`/`achievements.js`. The ones in
  `ui.js`/`bestiary.js`/`achievements.js` bind to freshly-created elements on each panel
  rebuild, so there is no accumulation.

### Suspected, not changed

1. **`addItemPedestal()` has no null guard on `item`** (`js/room.js:457`). Four callers pass
   `pickItemFromPool(...)` straight through without checking:
   `js/combat.js:689` (boss drop), `js/room.js:154` (petshop fallback), `js/room.js:180`
   (challenge room) and `js/room.js:511` (`addItemOrTrinketPedestal`). Every other caller
   checks. `pickItemFromPool` can only return `null` if `ITEM_LIST.filter(available)` is empty,
   which cannot happen with 90+ always-unlocked items — so this is unreachable today. Adding
   `if (!item) return;` would be a one-liner but would silently swallow a pedestal instead of
   crashing loudly. Left alone; flagging in case a future "everything locked at start" change
   makes it reachable.

2. **A room attached "next to the boss" may not actually door onto the boss.**
   `tryPlaceAdjacent` → `connectRoomDoors(candidate, …)` shuffles the candidate's touching
   neighbors when the room has a `maxDoors` cap (`js/dungeon.js:147`). A crystal/sombra room is
   capped at 1 entrance, so if it happens to touch both the boss room *and* some ordinary room,
   the shuffle can hand its single door to the ordinary room instead — placing it *beside* the
   boss geometrically but connecting it elsewhere. This predates the change and applies to every
   `attachNextTo` user. Fixing it means adding an "prefer this specific neighbor" argument to
   `connectRoomDoors`, which is a bigger change than this slice's remit.

3. **`attachSpecial`'s last-resort loop can commit an orphan room.** `js/dungeon.js:376-386`
   iterates *every* room (not just degree-1 normal leaves) and calls `tryPlaceAdjacent`, which
   commits the candidate to the grid *before* `connectRoomDoors` runs. If the only touching
   neighbor is already at its own `maxDoors`, the new room lands with zero usable doors and is
   unreachable. Pre-existing; not reachable via the Task 2 path (crystal/sombra no longer use
   `attachSpecial` at all), but the floors-8/9 second boss room could in principle hit it.

4. **Procedural shop slots aren't validated against the tile grid** (`js/room.js:266-273`).
   `x = Math.round(1 + frac * (node.tileW - 2))` and `y = floor(tileH/2)` assume a rectangular
   footprint. It's safe *today* only because `chooseShapeForNode` gives shops either a 1-block
   or a 2-block (domino) mask, and both are rectangles. If shop masks ever grow to L/T shapes
   a slot could land in void. Not currently a bug.

5. **`js/game.js:66`** assigns pill→effect mappings independently per color, so two colors can
   map to the same effect in one run. Looks intentional (Isaac does the same), left alone.

### Parallel-agent files

None needed a change. Specifically checked:

- `js/utils.js:296-311` draws mud and sandtrap purely off `ob.kind` and `ob.def.color/dark`,
  never off `hazard`, so the Task 1 flag change needs no render-side edit.
- `js/stages.js` / `js/theme.js` / `js/render.js` have no obstacle-flag or room-placement
  coupling that Task 1 or 2 touches.

### Things that surprised me / the plan got wrong

- **The plan's step 5 is right but under-sold.** `sandtrap` carrying `hazard:true` meant it dealt
  contact damage *and* froze you, on the same shared `ob.contactCooldownTimer`. Its own
  description says "no damage". That was a live, player-visible bug, not just a tidiness issue.
- **Removing `hazard:true` breaks three things the plan didn't list** — line of sight, projectile
  pass-through, and barrel pushing all silently relied on `isHazard` (or on nothing) meaning
  "flat on the ground". Fixing only the four listed call sites would have shipped mud that
  blocks enemy sight and eats every bolt. Detailed under Task 1 above.
- **Task 2's "guaranteed both" is not achievable with the current boss templates** — see the
  deviation note under Task 2. This is the single most important finding in this audit.
- The codebase is unusually clean for its size. The scripted cross-checks (behaviors, item ids,
  pools, template coordinates, def-table keys) came back with **zero** hits across ~12k lines.
  The only real bug the sweep found was the `player.takeDamage` plumbing in `ai.js`, and that
  one is only visible because `combat.js` documents the invariant it violates.
