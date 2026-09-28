# Audit — mechanics dispatch (achievements mid-run grant, Eternal Heart, half/double hearts)

## Files changed

- `js/achievements.js` — removed the mid-run reward grant from `unlockAchievement`; added a per-run unlock snapshot (`beginRunUnlocks`/`endRunUnlocks`/`currentUnlocks`) that the five `isXUnlocked` gates now read.
- `js/game.js` — `startRun` takes the unlock snapshot, `win`/`gameover` clear it; `descend()` converts a surviving Eternal Heart into a permanent heart container.
- `js/entities.js` — `Player.eternalHeart` field; `takeDamage` strips it on the first hit blue hearts don't absorb.
- `js/combat.js` — `grantPickupEffect` cases for `halfheartRed`, `halfheartBlue`, `doubleheart`, `eternalheart`.
- `js/ui.js` — HUD hearts: fractional trailing red pip now actually drawn (`Math.ceil(redMax)`), Eternal Heart pip drawn pale, cache key includes the flag.
- `js/utils.js` — `drawPickupIcon` cases for the four new pickup kinds.
- `js/roomEditor.js` — four new entries in the pickup dropdown.
- `js/data.js` — four new `PICKUP_POOL` rows (nothing else in the file touched).

`node --check` passes on all eight files.

---

## Item 1 — achievements no longer grant mid-run

**`js/achievements.js:1741-1746`** — the old `if (game && game.state === 'playing' && game.player) { ... }` block (and its explanatory comment) is deleted, replaced by a NOTE comment explaining the new rule. The toast at ~1731 is untouched and still reads "unlocked X"; `rewardItem`/`rewardTrinket`/`rewardFamiliar`/`rewardStar` are still computed because the toast's icon+label use them.

**`js/achievements.js:44-77`** — new per-run snapshot:

```js
let _runUnlockSnapshot = null;
function beginRunUnlocks(){ _runUnlockSnapshot = ensureUnlockShape(loadUnlocks()); }
function endRunUnlocks(){ _runUnlockSnapshot = null; }
function currentUnlocks(){ return _runUnlockSnapshot || ensureUnlockShape(loadUnlocks()); }
```

`isPickupKindUnlocked` (65), `isTrinketUnlocked` (69), `isFamiliarUnlocked` (73), `isStarUnlocked` (77) and `isItemUnlocked` (1689) all now read `currentUnlocks()` instead of `loadUnlocks()` directly. **No call site changed** — `js/room.js` (not in this dispatch's file set) calls them exactly as before, and every non-run caller transparently falls back to the live save.

**`js/game.js:65`** — `beginRunUnlocks()` in `startRun`, right after `bumpStat('runsStarted', ...)`.
**`js/game.js:450`** — `endRunUnlocks()` on the `state = 'win'` transition.
**`js/game.js:510`** — `endRunUnlocks()` on the `state = 'gameover'` transition.

Why the snapshot is safe: `main.js loadUnlocks()` re-parses localStorage on every call, so the snapshot is its own object; later `saveUnlocks` writes cannot mutate it, and later reads outside a run see the fresh save.

Other callers checked: all 36 `unlockAchievement(...)` call sites are pure "condition happened" notifications (floor reached, boss killed, stat threshold, cactus death in `entities.js:183`). None relied on the immediate grant for anything but the reward itself. `applyItemToPlayer`/`equipTrinket`/`addFamiliar` still have 13 other call sites, so nothing became dead code.

**Risk:** while a run is live, any UI that renders "is this unlocked" through these five functions would show the run-start state rather than the live one. Grep confirms the only callers are `js/room.js`'s spawn rolls, so nothing user-visible regresses. Secondary risk: if a future run-end path is added that bypasses both `state='win'` and `state='gameover'`, the snapshot would linger into the menu; `currentUnlocks()` is the single place to revisit if so.

---

## Item 2 — Eternal Heart

- **`js/entities.js:126-130`** — `this.eternalHeart = false;` initialized next to `shieldHits`.
- **`js/entities.js:147-157`** — strip check, placed after `Sound.play('playerHurt')` (past invuln/shield/dodge, so only a landed hit counts) and before the `if (this.blueCurrent > 0)` drain, so `blueCurrent` is read at its pre-hit value:
  `if (this.eternalHeart && this.blueCurrent <= 0) { eternalHeart=false; redMax = Math.max(0, redMax-0.5); redCurrent = Math.min(redCurrent, redMax); }`
  Runs at most once per hit and only while the flag is true. The hit itself still deals its normal damage afterwards.
- **`js/game.js:420-432`** — conversion in `descend()`, placed right after `Sound.play('descend')` and before **every** `startFloor()`/`this.state='win'` branch, so it fires on the branch descent, the 9→13 chain, and the final win alike: clear flag, `redMax -= 0.5`, clamp `redCurrent`, then `grantHeartContainer(1)`, plus a toast.
- **`js/combat.js:592-601`** — `case 'eternalheart'` in `grantPickupEffect`: no-op if already carrying one, else flag + `redMax += 0.5` + `redCurrent = Math.min(redMax, redCurrent + 0.5)`; plays `heartContainer` and floats "Eternal Heart!".
- **`js/ui.js:143-163`** — HUD:
  - cache key is now `redMax|redCurrent|blueCurrent|eternalFlag`;
  - `const redPips = Math.ceil(player.redMax)` used for both `canvas.width` and the loop bound (the **pre-existing bug**: `i < player.redMax` never drew the trailing fractional pip, so Kirin's `redMax:0.5` rendered as *no* red pip at all);
  - the trailing pip (`i === redPips - 1`) is drawn `#e8e8e8` on `#2a2430` instead of `#e35b6a`/`#160b0d` while `eternalHeart` is true.
- **`js/utils.js:506`** — on-ground icon: full heart drawn in `Theme.icon.pillHalf` (`#e8e8e8`, an existing neutral-white icon token) with the normal dark heart outline, previewing the pale HUD pip.
- **`js/roomEditor.js:611`** — `Eternal Heart (survive a floor → container)` dropdown entry.
- **`js/data.js:2405`** — `{ kind:'eternalheart', w:2 }` — the lowest weight in `PICKUP_POOL` (next lowest are `pill`/`star` at 4).

### Hand-verified scenarios

1. **Pickup at full health**, redMax 3 / redCurrent 3 → redMax 3.5, redCurrent 3.5. HUD: `redPips=4`; pips 0-2 full red, pip 3 `frac = clamp(3.5-3) = 0.5` drawn pale-half. Correct.
2. **Pickup while damaged**, redMax 3 / redCurrent 2 → redMax 3.5, redCurrent 2.5. HUD: pips 0,1 full, pip 2 `frac=0.5` red half, pip 3 `frac=0` pale empty outline. Correct (the granted half sits on the general red pool, as designed).
3. **Qualifying hit** (blueCurrent 0, 1-heart hit) from state 1: strip → redMax 3, redCurrent = min(3.5, 3) = 3; then damage → redCurrent 2. HUD back to 3 pips. Net cost of the hit is exactly the hit.
4. **Non-qualifying hit** (blueCurrent 1): strip skipped, blue absorbs, Eternal Heart survives — the intended "blue hearts protect it" behaviour.
5. **Reaching the next floor** from state 1: redMax 3, redCurrent 3, then `grantHeartContainer(1)` → redMax 4, redCurrent 4. Net +1 max heart vs. the pre-pickup 3, matching the design.
6. **Kirin regression** (`redMax:0.5`, `redCurrent:0.5`): `redPips=1`, `frac=0.5` — the class's half heart is now visible for the first time. `canvas.width = (1 + blueWhole) * 20`, so no clipping.

**Risks:** (a) classes with `def.noRedContainers` (Pony Bot) still receive the temporary +0.5 red pip on pickup and the conversion's `grantHeartContainer(1)` no-ops for them, so they get the half pip for a floor and then lose it — plan-exact, but worth a design call later. (b) `js/render.js:287`'s minimap pickup-letter map has no entry for the new kinds and falls back to `'?'` (render.js is outside this dispatch's file set). (c) `healBlue`'s cap is `20 - redMax`, so carrying an Eternal Heart shaves 0.5 off the blue ceiling for that floor — harmless at realistic heart counts.

---

## Item 3 — Half Heart / Half Blue Heart / Double Heart

- **`js/combat.js:587-589`** — `halfheartRed` → `player.heal(swiftrecovery ? 0.75 : 0.5)`, `halfheartBlue` → `player.healBlue(0.5)`, `doubleheart` → `player.heal(swiftrecovery ? 3 : 2)`. Note the small deviation from the literal plan text: the `swiftrecovery` multiplier that `heartRed` applies (1 → 1.5) is scaled proportionally rather than dropped, so the passive keeps working consistently across all three red-heart pickups.
- **`js/utils.js:498-505`** — `halfheartRed`/`halfheartBlue` reuse `Util.drawHeart`'s `fillFrac` at `0.5` (same size/offset as the full hearts); `doubleheart` draws two hearts on the same anti-diagonal offset pattern `doublebomb` uses (`x-12,y-7` and `x-6,y-11`, i.e. the ±5/∓2 offsets applied to the heart's `-9,-9` top-left origin).
- **`js/roomEditor.js:607-609`** — three dropdown entries, placed with the other heart kinds.
- **`js/data.js:2402-2404`** — `halfheartRed w:16` and `halfheartBlue w:8` (a notch above their full counterparts at 15/7, since they're the smaller reward), `doubleheart w:5` (matches `doublebomb`/`doublekey`'s existing w:5).

**Risk:** `PICKUP_POOL`'s total weight rises from 125 to 156, so every pre-existing kind's share drops ~20% (e.g. coins 44% → 35%) while total heart weight roughly doubles (22 → 51). This is the main balance-facing consequence and is easy to retune by lowering the four new weights.
