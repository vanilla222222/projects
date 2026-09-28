# audit — pickups/stars: Compass teleport stars (js/stars.js)

## Scope
Only `js/stars.js` was modified. Pure addition; no existing code was edited, moved or reindented.

## Lines added
- **js/stars.js lines 31–40** — the `TELEPORT_ROOM_NAMES` lookup (roomType id → display name) plus its 3-line comment, sitting immediately above `applyStarEffect`.
- **js/stars.js lines 44–66** — the teleport dispatch block inside `applyStarEffect`, positioned after `const star = STAR_TYPES[starId];` and before `switch (starId) {` (switch now opens at line 68).

Net: 33 lines added, 0 lines removed/changed.

## Dispatch mechanism chosen
**Prefix check**, not a full id→roomType lookup table:

```js
if (starId.startsWith('teleport_')) {
  const roomType = starId.slice('teleport_'.length);
  ...
}
```

Rationale: every `teleport_*` id in `data.js`'s `STAR_TYPES` is exactly `'teleport_' + <SPECIAL_ROOM_TYPES entry>`, so the room type is recoverable from the id itself — an id→roomType table would have been 11 lines restating the id. A small `TELEPORT_ROOM_NAMES` map is still kept, but only for the *human-readable* names used in the refund message ("No Treasure Room found on this floor."), which are not derivable from the id.

## Behavior
1. Scans `game.dungeon.rooms.values()` for nodes with `.type === roomType`, **excluding `game.currentRoom`** (standing in a matching room must not burn the star on a self-warp).
2. Picks the nearest by `Math.hypot(node.gx - game.currentRoom.gx, node.gy - game.currentRoom.gy)`; strict `<` so the first-found wins ties.
3. No candidates → `return refundStar(game, starId, 'No <Name> found on this floor.')`, which re-pockets the star and returns `false` (`useHeldStar` then skips the `starsUsed` stat bump) — the same pattern as `deneb`/`altair`/`capella`.
4. Otherwise `game.enterRoom(target, null)`. Confirmed in `js/game.js` (line 158) that a null `enteredSlot` takes the `else` branch at line 223 and centers the player via `findNearestFloor(node, tileW/2, tileH/2)` — the identical call `game.enterRoom(this.dungeon.start, null)` makes at run start (game.js:155).
5. On success the block does **not** return. The `switch` below has no `case` matching a `teleport_*` id, so control falls straight through to the shared tail `Sound.play('itemGet'); game.toast(star.name + ' — ' + star.desc);`. No toast is duplicated.

## Verification
- `node --check js/stars.js` — **passes**.
- All 11 ids confirmed present in `js/data.js` (lines 4631–4641): `teleport_treasure, teleport_shop, teleport_secret, teleport_petshop, teleport_curse, teleport_sacrifice, teleport_vault, teleport_challenge, teleport_crystal, teleport_sombra, teleport_star`. Each suffix has a matching key in `TELEPORT_ROOM_NAMES`, so no id can hit the `|| 'room'` fallback.
- `grep -c "case '" js/stars.js` → **37**, unchanged. The existing switch cases are untouched.
