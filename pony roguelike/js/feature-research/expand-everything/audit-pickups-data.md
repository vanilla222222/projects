# audit — phase 1 data.js additions (pickups / chests / teleport stars / bestiary lists)

All changes are in `js/data.js` only. `node --check js/data.js` passes. Line numbers are
post-edit and correspond to the current file (4868 lines total).

## 1. CHEST_TYPES — 2 new entries (js/data.js:4777-4798)

The object is keyed by chest kind and each entry ALSO carries a redundant `id`.
Exact field set used by every entry (copied from the existing 4):
`{ id, name, requires, color, dark, lidColor, itemChance }` (+ `heartCost` on `cursed` only).

IMPORTANT: `requires` is a **string**, never `null`. Existing convention is
`'none' | 'key' | 'bomb' | 'hearts'` — so a "free" chest uses `requires:'none'`.

New entries:

| key | id | name | requires | itemChance | color / dark / lidColor |
|---|---|---|---|---|---|
| `eternal` | `'eternal'` | `'Eternal Chest'` | `'key'` | `0.10` (matches `gold`) | `#8fd0f0` / `#3a6a8a` / `#23485e` |
| `wood` | `'wood'` | `'Wooden Chest'` | `'none'` | `1.0` | `#9a6b3a` / `#5e3f20` / `#3f2a15` |

Comments left in-file for the downstream combat.js agent:
- eternal: "50% chance to stay re-openable after being opened — see combat.js openChestContents".
- wood: "contents restricted to pill/star only, bonus roll forced to trinket — see combat.js openChestContents".

## 2. CHEST_TYPE_POOL — replaced (js/data.js:4801-4808)

Field names are `id` and `w` (unchanged from before). Weights are **integers summing to 100**
(the old pool summed to 100 as well, so the convention is preserved). `Util.weighted` normalizes,
so the total is convention only.

```
{ id:'grey', w:40 }, { id:'gold', w:20 }, { id:'stone', w:20 },
{ id:'cursed', w:10 }, { id:'eternal', w:5 }, { id:'wood', w:5 }
```

This single pool is still the source of truth for both the room-clear chest slice
(`room.js spawnClearRoomPickup` via `CLEAR_REWARD_CHANCE.chest`) and the Regulus star in
`stars.js`, so both now roll the 6 kinds. Verified every pool `id` resolves in `CHEST_TYPES`.

## 3. STAR_TYPES — 11 new locked room-teleport stars (js/data.js:4630-4641)

STAR_TYPES total is now **48** entries; every object key equals its own `id` (verified).
`STAR_LIST = Object.values(STAR_TYPES)` at the end of the object picks these up automatically.

Exact field names on a star entry (copy these verbatim — this is the contract):
`id` (string), `name` (string), `icon` (single emoji string), `color` (**hex string**, e.g. `'#f0c85a'`),
`desc` (string — the description field is `desc`, NOT `description`), `locked:true` (boolean,
present only on locked stars; unlocked stars simply omit the key).

| id | name | icon | color |
|---|---|---|---|
| `teleport_treasure` | Compass — Treasure | 💰 | `#f0c85a` |
| `teleport_shop` | Compass — Shop | 🛒 | `#5ad0a8` |
| `teleport_secret` | Compass — Secret | 🗝️ | `#b0a890` |
| `teleport_petshop` | Compass — Pet Shop | 🐾 | `#e0a070` |
| `teleport_curse` | Compass — Curse | 💀 | `#8a6ad0` |
| `teleport_sacrifice` | Compass — Sacrifice | 🩸 | `#c0303a` |
| `teleport_vault` | Compass — Vault | 🏦 | `#c9a13a` |
| `teleport_challenge` | Compass — Challenge | 🏟️ | `#e07a4a` |
| `teleport_crystal` | Compass — Crystal | 💎 | `#7fe0e0` |
| `teleport_sombra` | Compass — Sombra | 🌑 | `#5a4a70` |
| `teleport_star` | Compass — Star | 🌌 | `#a0b0f0` |

`desc` is uniformly `'Teleport straight to the nearest <Room Name> on this floor.'`
(Treasure Room / Shop / Secret Room / Pet Shop / Curse Room / Sacrifice Room / Vault /
Challenge Room / Crystal Room / Sombra Room / Star Room).

The em dash in every name is a real `—` (U+2014) with spaces around it: `Compass — Treasure`.

Notes for downstream agents:
- The room-type suffix after `teleport_` is exactly the dungeon.js `SPECIAL_ROOM_TYPES` string,
  so `starId.slice('teleport_'.length)` is a valid room-type key for the shared dispatch.
- Star names note "Compass"; the two icons deliberately avoid colliding with existing star
  icons (⭐ 🌟 ⚔️ 🎁 etc). Challenge uses 🏟️ (not ⚔️, taken by `dubhe`) and Star Room uses 🌌
  (not ⭐, taken by the Pleiades stars).
- No effect/switch logic was added — stars.js `applyStarEffect` is another agent's job.
- No achievements.js changes were made — these entries are `locked:true` and will be dead
  until `isStarUnlocked`/the unlock ladders grant them.

## 4. PICKUP_TYPE_LIST — new (js/data.js:4822-4850)

A **flat array literal** of 22 plain objects (not `Object.values(...)` of anything — there is no
backing keyed object, unlike STAR_LIST/TRINKET_LIST). Field names: `{ id, name, icon, desc }` —
exactly what `bestiary.js renderBestiarySimple` reads (`entry.id` for the seen map, `entry.icon`,
`entry.name`, `entry.desc` as the single line).

Order and ids (all unique, all icons unique):
`penny, nickel, dime, luckypenny, cursedpenny,`
`heartRed, heartBlue, halfheartRed, halfheartBlue, doubleheart, heartContainer, eternalheart, goldheart,`
`bomb, doublebomb, goldbomb,`
`key, doublekey, goldkey,`
`sack, battery, minibattery`

Icons: 🪙 🥈 🥇 🍀 🎰 / ❤️ 💙 💔 🩵 💕 🫀 🤍 💛 / 💣 🧨 ✨ / 🔑 🗝️ 👑 / 🎒 🔋 🪫

`pill` and `star` are intentionally absent (they have their own bestiary tabs).
Note the list uses the coin **sub-tier** ids, not a combined `coin` row — but the kind string
actually spawned in-world for a coin is still `'coin'` with a COIN_TYPES sub-roll, so whoever
wires the "seen" tracking must mark the resolved coin tier id, not `'coin'`.

## 5. ROOM_TYPE_LIST — new (js/data.js:4852-4868)

Same flat-array shape and same `{ id, name, icon, desc }` fields. 15 rows, ids:
`normal, start, boss, treasure, shop, secret, petshop, curse, sacrifice, vault, challenge,
crystal, sombra, star, cpathgate`
(= `dungeon.js SPECIAL_ROOM_TYPES` plus `normal` and `start`).

Icons: 🚪 🏠 👹 💰 🛒 🕳️ 🐾 💀 🩸 🏦 🏟️ 💎 🌑 🌌 🚧
(names align with `ui.js`'s `ROOM_TYPE_LEGEND`; `cpathgate` is named "Storm Drain" to match it.)

## 6. New pickup kind strings introduced

`goldheart` and `cursedpenny` exist so far **only** as `PICKUP_TYPE_LIST` rows — they are not yet
in `PICKUP_POOL` or `COIN_TYPES`, per the phase-1 brief (the new sub-pools that reach them are
another agent's work). Use these exact kind strings everywhere.

## 7. Untouched (deliberately)

`PICKUP_POOL` (note: its entries use `kind:`, **not** `id:`), `COIN_TYPES`,
`LARGEPENNY_COIN_WEIGHTS`, `BOMB_TIER_POOL`, `KEY_TIER_POOL`, `CLEAR_REWARD_CHANCE`
(still `{ nothing:0.18, pickup:0.63, sackOrBattery:0.12, chest:0.07 }`). No other file was edited.

## Verification run

- `node --check js/data.js` → OK
- `grep -c "id:'teleport_" js/data.js` → 11
- CHEST_TYPE_POOL: 6 entries, weights sum 100, no duplicate ids, every id resolves in CHEST_TYPES
- STAR_TYPES: 48 entries, zero key/`id` mismatches
- PICKUP_TYPE_LIST: 22 rows, no duplicate ids, no duplicate icons
- ROOM_TYPE_LIST: 15 rows, no duplicate ids
- Every row in both new lists has all four of `id`/`name`/`icon`/`desc` non-empty
