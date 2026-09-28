# Phase 4 overhaul — Arcade room — implementation audit

## Files changed

1. `js/systems/combat-2.js` — coin-toll door gate (`COIN_LOCKED_ROOM_TYPES`, `ARCADE_TOLL`, `coinLockedRoomFor`, `tryUnlockCoinDoor`, `checkDoorTransition` wiring).
2. `js/systems/dungeon.js` — `arcade` added to `SPECIAL_ROOM_TYPES` (not `AUTO_OPEN_ROOM_TYPES`); `arcadeNode = Util.chance(0.18) ? attachSpecial('arcade') : null` coin flip; returned in `generateDungeon`'s result object.
3. `js/core/theme.js` — `Theme.door.arcade`; 8 new `Theme.machine.*` tokens (friendship/tools/dark body+frame, fillySign/fillySignEdge).
4. `js/data/economy.js` — `arcade` entry in `ROOM_TYPE_LIST`.
5. `room-editor.html` — `<option value="arcade">arcade</option>`.
6. `js/ui/roomEditor.js` — `arcade` warning branch in `updateStatsAndWarnings()`.
7. `js/game.js` — `arcadeRoomsVisited` bump in the first-visit dispatch; new `tryArcadeInteract()` wrapper method (guard shape identical to `tryDonate`/`tryReroll`).
8. `js/achievements/logic.js` — `arcadeRoomsVisited:0` added to `statDefaults`.
9. `js/achievements/defs-6.js` — new `arcade_visits` `addTierSet` ladder (3 tiers), placed directly after `shrine_visits`.
10. `js/data/items-5.js` — 11 new items: 8 curated `pools:[]` items (`ARCADE_BOMB_REWARDS`/`ARCADE_KEY_REWARDS` targets) + 3 `pools:POOLS_ALL` visit-ladder reward items.
11. `js/systems/items-1.js` — wired all 11 new item ids into `recalcPlayerStats`'s luck / speed / melee-damage / ranged-damage / crit-chance / bomb-radius / shop-discount channels (see "Deviation" below — this file was **not** in the plan's explicit file list but was required for the new items to do anything).
12. `js/systems/room.js` — `node.fillies`/`node.machines` reset in `populateRoom`; new arcade fixture-scattering block (2-4 fixtures from 8 kinds, `findNearestFloor`-placed at 8 shuffled grid-third candidate spots).
13. `js/systems/shop.js` — `tryArcadeInteract`, `findNearestArcadeFixture`, `feedArcadeFilly`, `useArcadeMachine`, plus the 4 reward-id/weight constants (`ARCADE_BOMB_REWARDS`, `ARCADE_KEY_REWARDS`, `ARCADE_COIN_FILLY_REWARDS`, `ARCADE_KEY_FILLY_CHEST_KINDS`).
14. `js/main.js` — `case 'KeyH'` binding, guarded `!e.repeat`.
15. `index.html` — both control-hint `<p class="hint">` lines updated with "Arcade: H".
16. `js/core/utils-2.js` — `Util.drawFilly`, `Util.drawFriendshipMachine`, `Util.drawToolsMachine`, `Util.drawDarkMachine`.
17. `js/ui/render.js` — `drawArcadeFixtures()` method + call site in `render()`.
18. `js/CODE_REFERENCE.md` — documentation for all of the above (standing rule).

## Section-by-section summary

**1. Room type + door gate.** Implemented exactly as specified. `coinLockedRoomFor`/`tryUnlockCoinDoor` mirror `keyLockedRoomFor`/`tryUnlockKeyDoor` line-for-line in shape. The deny-toast cooldown reuses `node.keyToastCooldown` (the plan flagged this as a judgment call — confirmed by reading `tryUnlockKeyDoor`/`checkDoorTransition` that the field is really just "a door-deny toast is already showing", not key-specific, so reuse was correct and cheaper than adding a parallel field). `arcade` added to `SPECIAL_ROOM_TYPES` only, verified absent from `AUTO_OPEN_ROOM_TYPES`.

**2. Fixture population.** `populateRoom` always scatters `Util.randi(2,4)` fixtures (guarded `!node.fillies.length && !node.machines.length` so a future hand-authored template would be respected — none exists yet, matching the plan's "fine to always auto-place" fallback). 8 shuffled grid-third candidate points, deduped by direct coordinate match with a small nudge fallback for the odd-room-shape edge case. Confirmed via a real `generateDungeon()`/`populateRoom()` run under Node (see Verification) that fixtures land at distinct tile coordinates.

**3. `tryArcadeInteract`.** Placed in `shop.js` per the plan's stated preference. Proximity scan (`findNearestArcadeFixture`) checks both `node.fillies` and `node.machines`, 30px radius, silent no-op on miss. All 5 filly kinds and 3 machine kinds implemented per the plan's spec, including:
- Coin Filly excludes `'coin'` from its reward roll; capstone at `fedCount===5` grants `pickItemFromPool('treasure')`.
- Bomb/Key fillies grant curated `ARCADE_BOMB_REWARDS`/`ARCADE_KEY_REWARDS` items at `fedCount===4`.
- Key Filly spawns a weighted grey/gold/stone chest every feed via `findNearestFloor` + `new Chest(...)`.
- Heart Filly's last-heart guard and reward-of-4 (pill/star/trinket/blueHeart) implemented; capstone grants `pickItemFromPool('sombra')`.
- Battery Filly checks `player.activeItem` truthiness before deducting the 3-coin cost.
- All three machines implemented with the specified costs/odds; the "nothing this time" miss reuses `Sound.play('uiDeny')` since no distinct "whiff" SFX exists in `core/audio.js`'s `SFX` table (confirmed by reading it in full) — messaging is kept textually distinct from an insufficient-funds deny per the plan's requirement.

**4. New items.** 8 curated items (`pools:[]`) as specified. **Deviation from the plan's file list:** declaring an item in `data/items-5.js` alone does nothing mechanically — every existing stat-bearing item in this codebase is wired into `systems/items-1.js`'s `recalcPlayerStats` by literal id lookup (`p.someitemid || 0`). The plan's section 4 only mentioned `items-5.js`; I additionally edited `systems/items-1.js` to wire all 11 new items (8 curated + 3 ladder) into the luck/speed/melee-damage/ranged-damage/crit-chance/bomb-radius/shop-discount channels, calibrated against the nearest same-quality precedent already in each channel (documented inline and in `CODE_REFERENCE.md`). Without this the items would be inert placeholders — confirmed this is how every comparable batch (e.g. the Shrine batch) is wired before making the same edit.

**5. Achievement ladder.** `arcade_visits` `addTierSet`, 3 tiers (5/15/30 visits), rewards `luckytoken`/`jackpotcharm`/`arcadecrown` — placed immediately after `shrine_visits` in `defs-6.js` per the plan.

**6. Draw functions.** `Util.drawFilly` reuses `drawPony` with flat muted colors (no `classPonyOpts` reuse — fillies aren't a class) plus a sign drawn with the existing icon helpers (`drawKeyIcon`, `drawBombIcon`, `drawHeart`, `drawBatteryIcon`; coin gets an inline gold circle+glint matching `drawPickupIcon`'s own coin case, since fillies have no `Pickup`-shaped coin-tier object to hand that function). The 3 machine draw functions follow the shadow-ellipse + framed-slab family exactly, each with one glyph (`drawHeart` / `drawKeyIcon` / `drawStarIcon`) per the plan's "moon/star glyph for dark" allowance (chose star, since no moon icon helper exists). Wired into `render.js` via a new `drawArcadeFixtures()` called unconditionally each frame alongside the donation-machine/reroll-altar fixture draws.

## Deviations from the plan (and why)

- **`systems/items-1.js` added to the touched-file list** (see section 4 above) — required for the new items to be mechanically real, not just flavor text. Confirmed by reading the actual `recalcPlayerStats` wiring pattern before writing any item data.
- **Deny-toast cooldown reuses `node.keyToastCooldown`** rather than adding a parallel field — confirmed correct by reading the field's actual semantics (a generic "door deny toast is showing" debounce, not key-specific) rather than assuming.
- **Interact key: `KeyH`** — confirmed unused via a full grep of `main.js`'s `case 'Key...'` list before picking it (adjacent to F/G on the keyboard, matching the donate/reroll spatial grouping).
- Everything else in the plan's prescribed shape (constants, function names, guard order, reward tables, doc style) was followed as written; no other deviations were needed — every referenced pattern (`grantPickupEffect`, `pickItemFromPool`, `findNearestFloor`, `Chest`, `equipTrinket`, `COMMON_HEART_POOL`, `spendHearts`, etc.) existed exactly as the plan's verified snippets described.
- Not touched, left as pre-existing gaps (same as the plan's own note about `shrine` missing from `Theme.door`): `items-2.js`'s `lunaraffinity` special-room-reveal candidate list and `game.js`'s `ROOM_LABELS` banner-text table don't have `arcade`/`shrine` entries. Neither was named in the plan's file list; flagged here rather than silently expanded into.

## `node --check` results

All pass, zero output (success):
`js/systems/combat-2.js`, `js/systems/dungeon.js`, `js/core/theme.js`, `js/data/economy.js`, `js/ui/roomEditor.js`, `js/game.js`, `js/achievements/logic.js`, `js/achievements/defs-6.js`, `js/data/items-5.js`, `js/systems/items-1.js`, `js/systems/room.js`, `js/systems/shop.js`, `js/main.js`, `js/core/utils-2.js`, `js/ui/render.js`.

(`room-editor.html`/`index.html` are not JS; edits were single-line/attribute additions, visually verified.)

## Runtime verification (full bundle load under Node)

Concatenated every script tag from `index.html` (excluding `main.js`'s DOM bootstrap) with minimal `window`/`document`/`localStorage`/`AudioContext` stubs, ran it under Node via indirect `eval`, then exercised the new code paths in the same eval scope (required — `'use strict'` eval'd top-level function declarations don't leak to the outer scope, so all sanity calls had to run inside the same eval call as the bundle):

- **Bundle load**: `LOAD OK` — zero `ReferenceError`/`SyntaxError` across all ~70 concatenated files, confirming no ordering or naming collisions (including the `tryArcadeInteract` method/global-function name match — traced by hand: a class method's bare name is not a lexical binding inside its own body, so `tryArcadeInteract(this)` inside the `Game.prototype.tryArcadeInteract` method correctly resolves to the module-scope function; verified this call actually reaches the global function and not infinite recursion by observing correct feed/deny behavior below).
- **`generateDungeon()` + `populateRoom()`**: ran repeatedly until an `arcadeNode` generated, built its tiles, populated it — got `{"kind":"bomb","x":6,"y":3,...}` / `{"kind":"key","x":6,"y":9,...}` style fixture arrays with distinct, non-overlapping tile coordinates across multiple runs.
- **`feedArcadeFilly`/`useArcadeMachine`** exercised directly against a real `Player` instance (`recalcPlayerStats` included) and a stub `game`/`node`:
  - Coin Filly fed 6 times: `fedCount` capped at exactly **5**, `done=true` — the 6th call was blocked by the `done` guard before incrementing, confirming no over-feeding past the capstone.
  - Key Filly: 1 feed → `node.chests.length === 1`.
  - Dark Machine: coins `20 → 16` (4 deducted), reward granted.

### Safety-critical hand-trace #1 — heart filly last-heart guard

Test: set `player.redCurrent=0.5, blueCurrent=0` (→ `totalHearts()===0.5`), call `feedArcadeFilly` on a fresh heart filly.
Result: **`GUARD_HELD (no change, denied as expected)`** — `totalHearts()` before and after the call were identical; `player.spendHearts` was never reached.

Then set `redCurrent=2, blueCurrent=0` (→ `totalHearts()===2`, above the `<=1` threshold) and fed again: `before=2, after=1` — spent exactly 1 heart, landing at 1 (never 0), `fedCount` incremented to 1.

Trace by hand of the guard's code path: `feedArcadeFilly`'s `'heart'` case checks `filly.done` first (no-op if already capped), then `if (player.totalHearts() <= 1) { deny; return; }` **before** any call to `player.spendHearts(1)` — there is no other code path into `spendHearts` from this fixture, and the guard is a hard `<=1` cutoff (not `<1`), matching the codebase's existing "must always leave something" convention (`tryOpenChest`'s cursed-chest check uses the same `<= cost` shape). **Verdict: airtight** — this fixture cannot reach 0 hearts through any call sequence, confirmed both by static trace and by the runtime test above.

### Safety-critical hand-trace #2 — battery filly charge-before-deduct ordering

Test: `player.coins=5, player.activeItem=null`, fed the battery filly.
Result: `coinsBefore=5, coinsAfter=5` — **no deduction occurred** for the no-op case.

Then `player.activeItem = {maxCharge:10}, activeCharge=0, coins=5`, fed again: `coinsAfter=2` (3 deducted), `charge=3` — deduction and charge grant both happened correctly when there was something to charge.

Trace by hand of the code: `feedArcadeFilly`'s `'battery'` case computes `const charged = !!player.activeItem;` first, returns immediately with a toast and **no coin deduction** if `!charged`, and only reaches `player.coins -= 3` (and the coin-affordability check) afterward, on the charged path. **Verdict: correctly ordered** — the activeItem check strictly precedes the coin deduction in every code path, confirmed both statically and at runtime.

## Not done / explicitly skipped per instructions

- No browser playtest (per standing "no heavy smoke testing" memory and the plan's own instruction — the user verifies by playing).
- No git operations (not a git repo).
