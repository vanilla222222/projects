# Audit — pickups (goldheart / cursedpenny) + chest content restrictions

Files touched: `js/combat.js`, `js/entities.js` only.

## js/entities.js

| Line | Change |
|---|---|
| 138-141 | New `this.goldHeart = false;` field, declared right after `this.eternalHeart` with a comment pointing at `takeDamage` and `game.js onRoomJustCleared`. |
| 148 | New `this.tookDamageThisRoom = false;` field, next to `tookDamageThisRun`. Reset-on-room-entry is deliberately NOT here — that's `game.js enterRoom` (other agent). |
| 176 | `this.tookDamageThisRoom = true;` in `takeDamage`, alongside the existing `tookDamageThisFloor` / `tookDamageThisBossRoom` / `tookDamageThisRun` trio. |
| 177-179 | `this.goldHeart = false;` on the same hit, same spot. Sits past the invuln / shield / dodge early-returns, so a blocked or dodged hit does NOT clear it — consistent with what "took damage" means everywhere else in this codebase. |

## js/combat.js

| Line | Change |
|---|---|
| 769-777 | New `case 'goldheart':` in `grantPickupEffect` — sets `player.goldHeart = true`, `Sound.play('heart')` (same as the other heart cases), `FloatText 'Gold Heart!'` in `#f0c85a`. |
| 778-810 | New `case 'cursedpenny':` — 6 weighted outcomes via `Util.weighted`, distinct FloatText per outcome. |
| 873 | `updateChests` — `reopenLock` guard (see below). |
| 906 | `openChestContents` — wood restricts the main pickup roll to pill/star 50/50. |
| 911-921 | `openChestContents` — wood forces the bonus prize to a trinket; all other kinds keep the original familiar/trinket/item branch verbatim. |
| 932 | `openChestContents` — eternal 50% reopen. |

## Answers to the specific questions asked

**Chest kind field name: `c.kind`** (a plain string). `Chest` in `js/entities.js:475-483` stores BOTH `this.kind = kind` (the string) and `this.def = CHEST_TYPES[kind] || CHEST_TYPES.grey` (the data row). `c.def.id` would also work and is equal in practice, but `c.kind` is what the existing code in this same function already uses for its `bumpStat` lines (`c.kind === 'cursed'` etc.), so I matched that.

**Cursed-penny explosion sound: `Sound.play('explosion')`** — the existing name used by `explodeAt` in `js/combat.js:1296` (the shared blast path behind `detonateBomb` and exploding barrels). Confirmed it's a real generator at `js/audio.js:215`. No new sound name invented. The coin outcomes reuse `'coin'` and (for +2) `'coinLucky'`, both also real (`js/audio.js:159`).

**Damage unit convention: 1.0 = one FULL heart (i.e. one full container / two half-pips). 0.5 = half a heart.** Confirmed from three places in the same switch:
- `case 'heartRed'` → `player.heal(1)` and the FloatText reads `'+heart'`
- `case 'halfheartRed'` → `player.heal(0.5)` and the FloatText reads `'+½ heart'`
- `case 'eternalheart'` → `player.redMax += 0.5` for what the comment calls "a temporary half-pip"

So `takeDamage(0.5, ...)` is correctly a half-heart hit — no adjustment needed.

**`takeDamage` signature is `(amount, source)` — two args, not three.** The dispatch brief said `player.takeDamage(0.5, 0, 0)`; the real signature (`js/entities.js:150`) takes an optional `source` string used for death attribution. Passing `0, 0` would have set `lastDamageSource = 0`. Called it as `player.takeDamage(0.5, 'explosion')` instead — `'explosion'` is an already-established source string, named in the comment at `entities.js:164-166`.

## Deviation worth flagging: `c.reopenLock`

The literal instruction was just `if (Util.chance(0.5)) c.opened = false;`. On its own that self-destructs: `updateChests` tests player/chest overlap **every frame**, and the player is necessarily still standing on the chest the frame after it pops back open — so it would reopen instantly and drain the player's entire key stack in a handful of frames.

Added a one-frame-style latch, contained entirely in `js/combat.js`:
- `openChestContents:932` sets `c.reopenLock = true` alongside `c.opened = false`
- `updateChests:873` skips a locked chest and clears the lock once the player is no longer touching it

Net behavior: step off the chest, step back on, pay another key, open again. `Chest` in entities.js was left alone — `reopenLock` is simply `undefined` (falsy) on every chest that never went through the eternal branch, so no constructor change was needed.

## Regression check on the 4 pre-existing chest kinds

Re-read the `openChestContents` diff. grey / gold / stone / cursed are untouched:
- The pickup-kind line is a ternary that falls through to the original `rollGenericPickupKind()` for any `kind !== 'wood'`.
- The bonus-prize block's `else` branch is the original three-way familiar/trinket/item code, character-for-character.
- `c.opened = true` at the top of the function is unchanged; only `kind === 'eternal'` can ever un-set it.
- The `updateChests` guard is inert (`c.reopenLock` undefined) for any chest that hasn't been through the eternal reopen.

## Verification run

- `node --check js/combat.js` — pass
- `node --check js/entities.js` — pass
- `grep -c "case 'goldheart':" js/combat.js` → 1
- `grep -c "case 'cursedpenny':" js/combat.js` → 1

Not smoke-tested in-browser (per project convention — user verifies by playing).

## Left for other agents (confirmed out of scope, fields are live and ready)

- `js/game.js onRoomJustCleared()` — consume `player.goldHeart && !player.tookDamageThisRoom` → `player.heal(0.5)`
- `js/game.js enterRoom()` — `player.tookDamageThisRoom = false`
- Spawn wiring for `goldheart` / `cursedpenny` into whatever pickup pool should carry them (`grantPickupEffect` handles both kinds now, but nothing spawns them yet)
