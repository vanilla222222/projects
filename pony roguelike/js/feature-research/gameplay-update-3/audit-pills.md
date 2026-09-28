# Audit — Pills expansion (50 colors + 3 effects)

## Files changed
- `js/data.js` — `PILL_COLORS` (+50 entries, 10 → 60) and `PILL_EFFECTS` (+3 entries, 13 → 16). Nothing else in the file touched.
- `js/pills.js` — 3 new `case` blocks at the end of `applyPillEffect`'s switch.
- `js/achievements.js` — `collection_pills` `desc` + `distinctThreshold` only, plus the matching "pool: N" count in the slice comment at line 1463.

## Item 1 — 50 new pill colors

All entries follow the existing `{ id, name, color }` shape and the `"<Flavor> Pill"` Title Case name convention.

| id | name | hex |
|---|---|---|
| crimson | Crimson Pill | #a3162c |
| scarlet | Scarlet Pill | #ff3b2e |
| rust | Rust Pill | #8c3a1e |
| amber | Amber Pill | #ffb300 |
| gold | Gold Pill | #d4af37 |
| mustard | Mustard Pill | #c9a227 |
| lime | Lime Pill | #b6f04a |
| mint | Mint Pill | #9ff2c4 |
| emerald | Emerald Pill | #1f9e5a |
| forest | Forest Pill | #245c33 |
| olive | Olive Pill | #6b7a2e |
| teal | Teal Pill | #189a9a |
| cyan | Cyan Pill | #4fe3e3 |
| azure | Azure Pill | #2f7de0 |
| navy | Navy Pill | #1b2a63 |
| cobalt | Cobalt Pill | #274bd3 |
| indigo | Indigo Pill | #4b2fa8 |
| violet | Violet Pill | #8a3fd1 |
| lavender | Lavender Pill | #cbb6f2 |
| magenta | Magenta Pill | #e02fa0 |
| pink | Pink Pill | #ff9ec4 |
| rose | Rose Pill | #e2647f |
| coral | Coral Pill | #ff7a5c |
| peach | Peach Pill | #ffc9a3 |
| cream | Cream Pill | #f5ecd2 |
| ivory | Ivory Pill | #fbf7e8 |
| bone | Bone Pill | #ddd3bd |
| ash | Ash Pill | #8d8d96 |
| slate | Slate Pill | #5a6472 |
| charcoal | Charcoal Pill | #2b2b33 |
| copper | Copper Pill | #b4642a |
| bronze | Bronze Pill | #9c7a3c |
| silver | Silver Pill | #b9c1cc |
| pearl | Pearl Pill | #f3f0ff |
| opal | Opal Pill | #cfe9ea |
| jade | Jade Pill | #4fbf8b |
| ruby | Ruby Pill | #d61f5c |
| topaz | Topaz Pill | #ffd76a |
| onyx | Onyx Pill | #17161f |
| marbled | Marbled Pill | #cfd8dc |
| speckled | Speckled Pill | #b0a58f |
| striped | Striped Pill | #7a5c8f |
| swirled | Swirled Pill | #e3a5c0 |
| dotted | Dotted Pill | #6fa3b8 |
| glossy | Glossy Pill | #e8f4ff |
| dusty | Dusty Pill | #a89a86 |
| grainy | Grainy Pill | #8b7d58 |
| fizzy | Fizzy Pill | #a8f0ff |
| murky | Murky Pill | #4a5340 |
| clear | Clear Pill | #c2ebf5 |

Existing 10 (red, blue, yellow, green, orange, purple, black, white, spotted, chalky) untouched. Verified by script: **60 entries, 60 unique ids, 60 unique hexes** — no collisions with the originals.

Every consumer of `PILL_COLORS` iterates the array or reads `PILL_COLORS_BY_ID` (game.js:70, combat.js:623/629, room.js:553, bestiary.js:199/232, items.js:540, ui.js:228, utils.js:510, main.js:104, roomEditor.js:398) — no hardcoded count of 10 exists anywhere, so the pool expansion needs no other edits.

## Item 2 — 3 new pill effects

| id | name | desc | good |
|---|---|---|---|
| hpdown | Bad Trip | Lose 1 heart. | false |
| hpup | Patch Up | Heals 1 heart (a blue one if you have no red health). | true |
| mystery | Mystery | Applies one random positive and one random negative effect. | true |

Effect ids: **16 total, all unique**, and every table key matches its own `id` field (verified by script).

### Implementation notes (js/pills.js)

Note: the real signature is `applyPillEffect(game, effectId)` (game first, `player` derived inside), not the `(effectId, player, game)` form the brief paraphrased. The new cases match the actual signature.

**hpdown** — `Player.heal()` is `redCurrent = Math.min(redMax, redCurrent + amount)`, which does **not** clamp at 0, so `heal(-1)` would let HP go negative. Instead the case mirrors `takeDamage`'s core drain: blue hearts absorb first, then red, `Math.max(0, ...)` clamped, `isDead` set if red reaches 0. It intentionally bypasses the invuln/shield/dodge early-outs at the top of `takeDamage` so a pill you chose to swallow never silently no-ops. Plays `playerHurt` and sets `dmgFlashTimer`, matching how damage reads elsewhere.
- Empty-bar safety: the red branch is guarded on `player.redCurrent > 0`, so a `redMax:0` class (Pony Bot) sitting permanently at `redCurrent 0` with no blue left simply takes nothing rather than being killed by the clamp — the same reasoning as the `dmg > 0` guard in `takeDamage`.

**hpup** — `if (player.redMax > 0) player.heal(1); else player.healBlue(1);`. Uses `> 0`, not `=== 0`, so Kirin's `redMax:0.5` correctly takes the red branch; only a true `redMax:0` class routes to blue. `healBlue` clamps to `[0, 20 - redMax]`, `heal` clamps to `redMax` — both already safe at cap.

**mystery** — builds two pools from `PILL_EFFECT_LIST`:
```js
const goodPool = PILL_EFFECT_LIST.filter(e => e.good === true && e.id !== 'mystery');
const badPool  = PILL_EFFECT_LIST.filter(e => e.good === false && e.id !== 'mystery');
```
Both explicitly exclude `'mystery'`, so the two recursive `applyPillEffect` calls can never re-enter this case — infinite recursion is structurally impossible. Both pools are non-empty in practice (8 good / 7 bad after exclusion) but each call is still length-guarded. Marked `good:true` because `good` is only read in pills.js:31 to pick the toast sound (`uiDeny` vs `itemGet`) — it carries no mechanical weight.

## Achievement

`js/achievements.js` `collection_pills` ("Full Spectrum"): `desc` `'Sample all 10 pill colors.'` → `'Sample all 60 pill colors.'`, `distinctThreshold:10` → `60`. The slice header comment's `(pool: 10 PILL_COLORS)` updated to `60` to stay truthful. No other achievement touched.

## Verification
- `node --check` passes on all three touched files.
- Scripted uniqueness check: 60/60 unique color ids, 60/60 unique hexes, 16/16 unique effect ids with matching keys.
- Per project convention (no automated tests, no heavy smoke testing), in-game verification is left to the user.
