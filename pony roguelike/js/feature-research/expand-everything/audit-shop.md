# Shop depth pass — audit

## Files changed

- `js/shop.js` — floor-depth price multiplier (`shopFloorPriceMult`, `shopPrice(kind, floorNum)`); reroll altar cost curve (`REROLL_ALTAR_COSTS`, `rerollAltarCost`) and its interaction handler (`tryRerollAltar`).
- `js/room.js` — `node.rerollAltar` fixture placement in shop rooms; `floorNum` threaded into `addShopSlot` and both of its call sites; `node.shopFloorNum` memo; `SHOP_REROLL_KIND_WEIGHTS`, `countRerollableShopSlots`, `rerollShopSlots`; `SHOP_MAX_SLOTS` / `SHOP_BONUS_SLOT_FLOORS` / `shopBonusSlots` and their use in the procedural shop slot loop.
- `js/game.js` — `Game.tryReroll()`; per-visit reset of `node.rerollAltar.uses` in `enterRoom`.
- `js/main.js` — `KeyG` bound to `game.tryReroll()`, with an `e.repeat` guard.
- `js/render.js` — `drawRerollAltarFixture()` + its call in the draw order, right after `drawDonationMachineFixture()`.
- `js/utils.js` — `Util.drawRerollAltar(ctx, x, y, now)`.
- `js/theme.js` — `Theme.machine.altarBody` / `altarFrame` / `altarGlow`.
- `index.html` — both control-hint lines now list `Reroll: G`.

`js/items.js` was **not** modified — `updateShop` already charges `slot.price`, which is now the floor-scaled figure, so the existing discount stacking rides on top unchanged.

---

## A. Floor-depth price scaling

Formula (`js/shop.js`):

```js
const SHOP_FLOOR_PRICE_STEP = 0.055;
const SHOP_FLOOR_PRICE_MAX_FLOOR = 12;
shopFloorPriceMult(f) = 1 + clamp(f, 0, 12) * 0.055

shopPrice(kind, floorNum):
  base   = SHOP_BASE_PRICES[kind] ?? 8
  scaled = max(1, round(base * shopFloorPriceMult(floorNum)))
  return donationDiscountUnlocked(kind) ? max(1, scaled - 1) : scaled
```

Multiplier range: **floor 0 → x1.00, floor 6 → x1.33, floor 12 → x1.66** (clamped at floor 12, the last floor of a run). Comfortably inside the ~1.0x–1.7x target.

Output check at the ends of the range:

| kind | base | floor 0 | floor 12 |
|---|---|---|---|
| heartRed | 3 | 3 | 5 |
| bomb / key / pill | 5 | 5 | 8 |
| star | 7 | 7 | 12 |
| battery | 9 | 9 | 15 |
| familiar | 12 | 12 | 20 |
| item | 16 | 16 | 27 |

Ordering is preserved exactly as before: **base → floor multiplier → donation-machine −1c** (both at slot-generation time, in `shopPrice`), then **→ % discount stack** (Merchant's Ring / Pocket Ledger / Loyalty Badge / `shopDiscountBonus`, capped 70%) at purchase time in `items.js`'s `updateShop`. So every existing discount still bites, and bites harder in absolute coins, on deeper floors.

`floorNum` reaches `shopPrice` via a new optional 5th argument on `addShopSlot(node, sp, tx, ty, floorNum)`, passed from `populateRoomProcedural` (shop branch) and from `instantiateSpawner`'s `case 'shop'` — both already had `floorNum` in scope from `dungeon.floorNum`. The argument is optional and defaults to no scaling, so any call site that doesn't know its floor (none in-tree today) prices at the flat base table rather than crashing.

## B. Reroll altar

**Placement.** `populateRoom` already forced a donation machine into every shop room at `(tileW*0.82, tileH*0.82)` regardless of template; the altar mirrors that exactly at `(tileW*0.18, tileH*0.82)` — opposite bottom corner, off the shop slots' centre row, with a fallback to the top-left corner in the (shape-dependent) case where `findNearestFloor` snaps both fixtures onto the same tile. Stored as `node.rerollAltar = { x, y, uses: 0 }`.

**Interaction.** Mirrors `tryDonateMachine` one-for-one: `game.tryReroll()` (same `state/paused/freezeTimer` gate as `tryDonate`) → `tryRerollAltar(game)` → same `node.rerollAltar` lookup, same 30px `Util.dist` proximity gate, same `player.coins` deduction / `Sound.play` / `FloatText` / `game.toast` feedback shape. Bound to **G** in `main.js` alongside F for donate. The `!e.repeat` guard is deliberate: donate is 1c a tap so auto-repeat is harmless there, but an escalating 3c+ reroll must charge once per real press.

**Cost curve, per shop visit:** `3c → 6c → 10c → 15c → 21c → 27c → …` (a fixed `[3, 6, 10, 15]` table, then `+6c` per further use). First pull is cheap enough to always be worth taking on a bad shelf; the third already costs more than a trinket, so fishing for one specific item is a mounting tax rather than a formality.

**State scoping — the important bit.** The counter lives on the **room node** (`node.rerollAltar.uses`), created in `populateRoom` next to `node.donationMachine`, i.e. the same per-room scope as `node.keyToastCooldown` / `node.bossDefeated`. Nothing is stored on the player or on any global.

- *Resets on re-entry:* `game.js`'s `enterRoom` sets `node.rerollAltar.uses = 0` on every entry, immediately after `this.currentRoom = node`. `populateRoom`'s own `node.populated` early-return means the fixture object itself is created once and survives, so the slots keep whatever they were rerolled into — only the price ladder restarts.
- *No cross-floor leakage:* each floor's shop is a distinct node object from `generateDungeon`, each with its own `rerollAltar`, and `startFloor` builds a whole new dungeon. There is no shared/module-level counter to leak.

**What rerolls.** `rerollShopSlots(node)` walks `node.shopSlots` and touches only slots that are `!bought` **and** of kind `item` / `trinket` / `familiar`. Pickup slots are skipped by design — they're the cheap emergency-heart safety valve, and letting a reroll churn them would turn the altar into a way to launder 3c into a guaranteed item slot. Bought slots stay bought/empty. Rerolls draw from the same pool functions generation uses (`pickTrinketFromPool`, `pickFamiliarFromPool`, `pickItemFromPool('shop')`) via `SHOP_REROLL_KIND_WEIGHTS` — the generation weights minus the pickup slice (item 40 / trinket 12 / familiar 13), with the same empty-pool fallback to an item. Slots are rewritten **in place** (x/y untouched), so a reroll can never move a slot out of the room layout, and re-priced with `shopPrice(kind, node.shopFloorNum)` so the reroll respects the same floor depth the shop was generated at.

**Feedback.** `Sound.play('itemGet')` (the same cue `stars.js`'s Deneb pedestal reroll uses), a violet `-Nc reroll` `FloatText`, a toast naming how many slots changed and what the next reroll will cost, plus `bumpStat('coinsSpent', cost)`. Failure cases get `uiDeny` + an explanatory toast: nothing rerollable left on the shelf, or short on coins (says how many more).

**Visual.** `Util.drawRerollAltar` reuses `drawDonationMachine`'s silhouette family (ground-shadow ellipse + framed slab) but squatter, in cold arcane violet rather than gold, topped with a slowly rotating open arrow-ring. `render.js`'s `drawRerollAltarFixture` draws it and prints a `[G] Reroll Nc` readout in the same slot as the machine's `N / 1000c` line, greyed out when you can't afford it or nothing is left to reroll.

## C. Shop slot count scaling

In `populateRoomProcedural`'s `node.type === 'shop'` branch:

```js
const nSlots = Math.min(SHOP_MAX_SLOTS, Util.randi(3, 4) + shopBonusSlots(floorNum));
// SHOP_MAX_SLOTS = 6; SHOP_BONUS_SLOT_FLOORS = [5, 9]
```

- Floors 0–4: **3–4** slots (unchanged)
- Floors 5–8: **4–5** slots
- Floors 9+: **5–6** slots

The evenly-spaced layout loop is untouched — it still divides the room's interior width into `nSlots + 1` gaps (`x = round(1 + (i+1)/(nSlots+1) * (tileW - 2))`, `y = tileH/2`). Verified against the **narrowest** shop shape, the 1x1 polyomino at `tileW = 12` (the same shape `populateRoomProcedural`'s star-room comment calls out as the tight case):

| nSlots | x positions | collision? |
|---|---|---|
| 3 | 4, 6, 9 | none |
| 4 | 3, 5, 7, 9 | none |
| 5 | 3, 4, 6, 8, 9 | none |
| 6 | 2, 4, 5, 7, 8, 10 | none |

All in-bounds (`1 ≤ x ≤ tileW - 2`) and all distinct at the 6-slot cap, which is why `SHOP_MAX_SLOTS` is 6. Larger shop shapes only spread further apart.

Template-authored shop rooms are deliberately **not** affected: they place exactly the `s`-category spawners the room editor authored, so injecting extra slots there would risk overlapping hand-placed geometry. They still get the floor-depth pricing and the reroll altar.

## Double-charge / double-spawn review

- **Double-charge:** `updateShop` is unchanged and still guards on `slot.bought`. `tryRerollAltar` deducts exactly once per invocation, and `main.js` filters key auto-repeat; there is no proximity-tick path that could re-fire it per frame.
- **Double-spawn:** `node.rerollAltar` is assigned in the single `node.type === 'shop'` block in `populateRoom`, which is guarded by the `node.populated` early return — the same guard that already prevented a second donation machine. `populateRoom` also nulls `node.rerollAltar` alongside `node.donationMachine` at the top for shape consistency.
- **Slot overflow:** capped at `SHOP_MAX_SLOTS = 6`, verified collision-free on the narrowest shape (table above). Rerolls never add or move slots, only rewrite existing ones in place.

## Verification run

`node --check` clean on all of `js/shop.js`, `js/room.js`, `js/items.js`, `js/game.js`, `js/main.js`, `js/render.js`, `js/utils.js`, `js/theme.js` after each sub-unit and again at the end. No runtime playtest (per project convention — the user verifies by playing).
