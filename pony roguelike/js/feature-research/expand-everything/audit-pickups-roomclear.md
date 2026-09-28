# Audit — room-clear reward rework, room-visit stats, Gold Heart heal

## js/data.js
- ~4652-4661 — `BOMB_TIER_POOL` / `KEY_TIER_POOL` retuned from 90/5/5 to 90/8/2
  (`doublebomb:8`, `goldbomb:2`, `doublekey:8`, `goldkey:2`); `locked:true` flags
  preserved on both non-base entries in each pool. These are shared pools, so
  `rollGenericPickupKind()`'s re-roll path picks up the new odds too (intended).
- ~4810-4854 — `CLEAR_REWARD_CHANCE` replaced with
  `{ nothing:0.15, common:0.65, rare:0.15, legendary:0.05 }` (sums to 1.0,
  verified numerically), followed by five new `{id, w}` pools in the file's
  existing style: `COMMON_CATEGORY_POOL`, `COMMON_PENNY_POOL`,
  `COMMON_HEART_POOL`, `RARE_POOL`, `LEGENDARY_POOL`.
- `CHEST_TYPE_POOL` untouched.

## js/room.js
- 968-1024 — `spawnClearRoomPickup(game)` rewritten.
  - Kept the `if (node.type === 'boss') return;` early return.
  - Kept the Fortune Shell shift math verbatim (`shift = c.nothing * 0.6`),
    retargeted from `chest` to `legendary`.
  - Tier roll: `Util.weighted(Object.keys(c).map(id => ({ id, w: c[id] }))).id`.
  - Placement still uses the existing `findClearFloorSpot(node, mid, mid)` spot.
  - `common`: `COMMON_CATEGORY_POOL` → penny (`COMMON_PENNY_POOL`; `cursedpenny`
    spawns as a plain kind, the other four as `'coin:<tier>'`), heart
    (`COMMON_HEART_POOL`, direct kind), bomb/key (`BOMB_TIER_POOL`/`KEY_TIER_POOL`
    filtered by `isPickupKindUnlocked` exactly as `rollGenericPickupKind` does).
  - `rare`: `RARE_POOL` → `spawnResolvedPickup` (pill/star resolved inside it,
    sack/battery fall through to a plain Pickup).
  - `legendary`: `LEGENDARY_POOL` → chest (old chest-spawn line moved here
    unchanged: `node.chests.push(new Chest(Util.weighted(CHEST_TYPE_POOL).id, ...))`),
    trinket, or familiar. Empty trinket/familiar pool falls through to the chest
    line, so no branch can silently do nothing.
- `rollSackBatteryKind()` / `SACK_BATTERY_WEIGHTS` (~583-592) left in place but
  are no longer called from here — sack/battery now come from `RARE_POOL` and are
  therefore no longer unlock-gated at this call site. Left as-is per scope.

### Toast/sound convention copied
`js/combat.js` `openChestContents` (lines ~913-919) grants its bonus prize with a
bare `equipTrinket(game, trinket)` / `addFamiliar(game, familiar)` and adds **no**
toast or `Sound.play` of its own — both helpers already self-report
(`js/items.js:976-986` `equipTrinket` does `Sound.play('itemGet')` +
`game.toast('Equipped trinket: ' + name + ...)` + a `FloatText`; `addFamiliar` at
`js/items.js:1036` follows the same pattern). The new legendary branch copies that
exactly: call the helper, emit nothing extra, guard on a null pool result the same
way combat.js does.

## js/game.js
- 196-198 (`enterRoom`) — `this.player.tookDamageThisRoom = false;` added right
  after the star-buff (`starDamageBonus`/`starSpeedMult`) per-room reset block.
- 209-215 — 7 new `else if` branches appended to the existing `firstVisit` chain
  (petshop/curse/crystal/star branches untouched). Stat names verified verbatim:
  `treasureRoomsVisited`, `shopRoomsVisited`, `secretRoomsVisited`,
  `sacrificeRoomsVisited`, `vaultRoomsVisited`, `challengeRoomsVisited`,
  `sombraRoomsVisited` — matches the list the achievements.js agent registers.
- 219 — `markBestiarySeen('seenRoomTypes', node.type, this);` added immediately
  after the `if (firstVisit) { ... }` block, ungated (confirmed idempotent:
  `js/achievements.js:3240-3250` only writes/saves when the bucket key is unset).
- 366-370 (`onRoomJustCleared`) — Gold Heart heal added right after
  `spawnClearRoomPickup(this)`, copying the `mendingchime` style a few lines
  below: `this.player.heal(0.5); Sound.play('heart');` + a
  `FloatText(x, y - 30, '+½ heart', '#e35b6a')`.

## Verification
- `node --check` passes on js/data.js, js/room.js, js/game.js.
- `CLEAR_REWARD_CHANCE` sums to exactly 1.0; all 5 new pool constants present.
- No edits to combat.js, entities.js, stars.js, bestiary.js, achievements.js.
