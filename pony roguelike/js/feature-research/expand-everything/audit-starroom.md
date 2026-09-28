# Audit — new "star" room type

## Files changed

- `js/dungeon.js`
- `js/combat.js`
- `js/ui.js`
- `js/room.js`
- `js/game.js`

No other files touched. No renderer change was needed (see "Rendering" below).

---

## js/dungeon.js

1. `SPECIAL_ROOM_TYPES` (line 56-58) — added `'star'` at the end of the set, so a star room is always capped at one entrance like every other special room.
2. `AUTO_OPEN_ROOM_TYPES` — deliberately NOT touched, so star doors start locked (key-locked, see combat.js below).
3. `generateDungeon` (line 404) — added `const starNode = Util.chance(0.30) ? attachSpecial('star') : null;` immediately after the `challengeNode` line, matching the existing per-floor coin-flip style.
4. Follow-on: the other optional specials (`petshopNode`…`challengeNode`) are all returned from `generateDungeon` in the result object (line ~482), so `starNode` was added to that return list too for consistency. Without it `starNode` would have been a dead local.

## js/combat.js

1. `KEY_LOCKED_ROOM_TYPES` (line 462) — now `new Set(['treasure', 'shop', 'vault', 'star'])`. This is the only hookup needed: `keyLockedRoomFor` / `tryUnlockKeyDoor` are fully generic over the set, so a star room costs a key exactly like treasure/shop/vault (and does not bump the vault-specific stat, which is gated on `type === 'vault'`).

## js/ui.js

1. `roomTypeColor` — added `case 'star': return '#f5a623';`. Checked against every existing case: the nearest golds are treasure `#e3c15b` (paler, yellower) and challenge `#a85a2e` (darker, browner); `#f5a623` is a saturated amber distinct from both on the minimap.
2. `ROOM_TYPE_ICON` — added `star: '⭐'`.
3. `ROOM_TYPE_LEGEND` (adjacent map, documented as staying in lockstep with `ROOM_TYPE_ICON`) — added `star: 'Star Room (key-locked, pick 1 of 2)'`. Without this the minimap legend row for star rooms would have rendered with no label.
4. `showItemExamine` — one-line change to `kindLabel`: added `ped.isStar ? 'Star'` before the active/passive fallback. Star pedestals have no `item.type`, so without this the examine tooltip would have called a star a "Passive Item". Everything else in that function (`icon`/`name`/`desc`, and the `quality` branch, which stars don't have) already works unchanged.

## js/room.js

1. `chooseShapeForNode` — added `|| node.type === 'star'` to the treasure/shop/secret/petshop/curse/sacrifice condition, so star rooms get the same 65% 1x1 / 35% 2x2 compact treatment.
2. New `addStarPedestal(node, starId, tx, ty)`, placed with the other pedestal helpers (just after `addTrinketPedestal`, before `pickTrinketFromPool`):

   ```js
   node.itemPedestals.push({ item: STAR_TYPES[starId], taken: false, x: tx, y: ty, isStar: true, starId });
   ```

   This mirrors `addTrinketPedestal`/`addFamiliarPedestal` exactly — same `node.itemPedestals` array, same `{item, taken, x, y}` core, one discriminator flag — plus `starId`, which is what actually gets granted. `item` is the `STAR_TYPES` def itself so all the generic pedestal consumers keep working.
3. `populateRoomProcedural` — new `} else if (node.type === 'star') {` branch, inserted before the `secret` branch. Rolls two ids via `rollRandomStarId()` with the specified duplicate-reroll guard (max 8 tries, then it accepts a duplicate rather than looping — matters when very few stars are unlocked), then places both pedestals at `cx ∓ 2, cy` run through `findNearestFloor` (combat.js).

   Bounds reasoning: the smallest room a star can get is 1x1, which is `1 * BLOCK + 2 = 12` tiles wide (room.js line 38), so `cx = 6` and the offsets land on tiles 4 and 8 — well inside the walls, never out of bounds. `findNearestFloor` is belt-and-braces for the irregular 2x2 polyominoes, and matches how the boss/petshop/challenge/sacrifice placements already do it. Offset of 2 (not 1) because a pedestal base is 32px wide and `TILE` is 32, so adjacent tiles would have the two pedestals touching.

## js/game.js

1. `updateItemPedestal` — added a branch between `isFamiliar` and the item fallback:

   ```js
   else if (ped.isStar) grantPickupEffect(this, 'star', px, py - 10, undefined, undefined, ped.starId);
   ```

   Signature verified against combat.js line 551: `grantPickupEffect(game, kind, x, y, coin, pillColor, starId)` — `starId` is the **7th** parameter, hence the two `undefined` placeholders; the `'star'` case reads `starId || rollRandomStarId()`. `px`/`py` are the already-computed `ped.x * TILE`/`ped.y * TILE` from the enclosing loop; `- 10` matches `collectPickup`'s float-text offset so the star name pops above the pedestal rather than inside it.

   Side effects handled by the shared code around the branch, deliberately not duplicated: `ped.taken = true` is set *before* the dispatch for all pedestal kinds; the deal/heart-cost check above is skipped since star pedestals set no `isDeal`; the `challenge` room-start check below is type-gated and unaffected. `grantPickupEffect`'s `'star'` case itself already does the sound, the bestiary mark, the toast (including the "(previous star lost)" suffix) and the float text — so the star-room branch needs nothing else, and the existing overwrite-on-pickup behavior is preserved unchanged, as required.

---

## Rendering — no changes needed

`render.js`'s `drawItemPedestal` (line 581) draws every entry in `node.itemPedestals` generically and calls `Util.drawItemIcon(ctx, px, py - 16 + bob, ped.item, now)`. `drawItemIcon` reads only `item.quality` (optional — stars have none, so no quality glow/ring, which is correct), `item.color` and `item.icon`. Every `STAR_TYPES` entry in data.js has `id/name/icon/color/desc`, so a star pedestal renders as its own colored plate with its own glyph with zero renderer edits. `ui.js`'s `roomLootEntries`/`drawLootEntry` (minimap loot markers) likewise just pass `p.item` to `drawItemIcon`, so star pedestals show up on the minimap for free.

## Not touched (out of scope, confirmed)

`js/enemies.js`, `js/data.js`, `js/pills.js`, `js/stars.js`, `js/achievements.js`, `js/render.js`. Also left alone: `js/roomEditor.js` line 555's per-room-type editor branch — star rooms have no `ROOM_TEMPLATES` entry, so they always take the procedural path, and hand-authoring them was not part of the task.

## Verification

`node --check` clean on all five edited files (`dungeon`, `combat`, `ui`, `room`, `game`), run after each file's edits. Greps confirm `'star'` present in `SPECIAL_ROOM_TYPES`, absent from `AUTO_OPEN_ROOM_TYPES`, present in `KEY_LOCKED_ROOM_TYPES`, in the `chooseShapeForNode` condition, in `roomTypeColor`/`ROOM_TYPE_ICON`/`ROOM_TYPE_LEGEND`, and the new `generateDungeon` line. No runtime playtest performed.

## Residual risks

- Star-room spawn is a flat 0.30 per floor with no floor gating — same as the other optional specials, but it does add another key sink alongside treasure/shop/vault.
- If every star roll returns the same id (only possible when exactly one star is unlocked), the guard gives up after 8 tries and the room offers two identical stars. Acceptable and non-crashing.
