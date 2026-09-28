# Audit — Compass (teleport star) achievements + new stat/bestiary registration

Scope: `js/achievements.js` only. No other file touched.

## Line ranges touched (post-edit line numbers)

| What | Lines |
| --- | --- |
| Task 2 — 2 new bestiary buckets | `js/achievements.js:3090-3091` |
| Task 1 — 7 new `statDefaults` entries | `js/achievements.js:3106-3111` (comment + entries), inside `ensureUnlockShape()`'s `statDefaults` literal (~3093-3135) |
| Task 3 — 11 new achievements | `js/achievements.js:597-624` (comment block 597-603, `addAchievement` calls 604-624) |

Placement: the 11 calls form a new commented section "8c" immediately after the
existing section 8b room-visit / reroll block (`starseeker` / `stargazer` /
`rerollregular`, ending at line 596) and before section 9.

## Task 1 — statDefaults entries added (all `:0`)

`treasureRoomsVisited`, `shopRoomsVisited`, `secretRoomsVisited`,
`sacrificeRoomsVisited`, `vaultRoomsVisited`, `challengeRoomsVisited`,
`sombraRoomsVisited`

They sit right after `turretsDestroyed:0, bombBarrelsDetonated:0,` alongside the
pre-existing sibling keys (`petshopsVisited`, `curseRoomsVisited`,
`crystalRoomsVisited`, `starRoomsVisited`), matching the same comma/one-line-
group style. `unlocks.stats = Object.assign({}, statDefaults, unlocks.stats||{})`
means old saves pick these up as 0 without losing anything.

## Task 2 — bestiary buckets added

The real pattern in `ensureUnlockShape()` is `if (!b.seenX) b.seenX = {};` (with
`const b = unlocks.bestiary;`), not `unlocks.bestiary.seenX = ... || {}`. Copied
exactly:

```js
if (!b.seenPickupKinds) b.seenPickupKinds = {};
if (!b.seenRoomTypes) b.seenRoomTypes = {};
```

Verified at runtime that `ensureUnlockShape({}).bestiary` now has keys:
`enemyKills, enemyDeaths, objectsSeen, objectsDestroyed, seenItems,
seenTrinkets, seenFamiliars, seenStars, seenPills, seenPickupKinds,
seenRoomTypes`.

## Task 3 — the 11 achievement ids

| id | statKey | threshold | starId |
| --- | --- | --- | --- |
| `compasstreasure` | `treasureRoomsVisited` | 10 | `teleport_treasure` |
| `compassshop` | `shopRoomsVisited` | 10 | `teleport_shop` |
| `compasssecret` | `secretRoomsVisited` | 10 | `teleport_secret` |
| `compasspetshop` | `petshopsVisited` | 10 | `teleport_petshop` |
| `compasscurse` | `curseRoomsVisited` | 10 | `teleport_curse` |
| `compasssacrifice` | `sacrificeRoomsVisited` | 10 | `teleport_sacrifice` |
| `compassvault` | `vaultRoomsVisited` | 10 | `teleport_vault` |
| `compasschallenge` | `challengeRoomsVisited` | 10 | `teleport_challenge` |
| `compasscrystal` | `crystalRoomsVisited` | 10 | `teleport_crystal` |
| `compasssombra` | `sombraRoomsVisited` | 10 | `teleport_sombra` |
| `compassstar` | `starRoomsVisited` | 10 | `teleport_star` |

All `category:'Exploration'` (matches the existing `category:'Exploration',
statKey:` ladders at ~2660-2710). Each id occurs exactly once in the file, and
no `compass*` achievement id existed before this pass (the only pre-existing
`compass` hits in the file were the *item* ids `vividcompass` and
`starlitcompass`, which are reward ids, not achievement ids — no collision).

All 11 `starId` values match `STAR_TYPES` entries in `js/data.js:4631-4641`
verbatim.

## `starId` as a reward field — already working, nothing changed

- `TIER_REWARD_KEYS` (`js/achievements.js:155`) already lists `'starId'`:
  `['itemId','trinketId','familiarId','starId','pickupKind','pillColorId','enemyId','classId','shopDiscount']`.
- `unlockAchievement`'s reward dispatch already has the branch
  `else if (def.starId) { unlocks.unlockedStars[def.starId] = true; rewardStar = STAR_TYPES[def.starId]; }`
  (~`js/achievements.js:3175`).
- `isStarUnlocked()` (`js/achievements.js:82`) reads `unlockedStars`.

No pre-existing bug found here; the whitelist did not need touching. Note that
`addAchievement` passes the spec object through directly (the `TIER_REWARD_KEYS`
whitelist is only used by `addTierSet`), so these direct calls carry `starId`
either way.

## Verification results

1. `node --check js/achievements.js` — **passes**.
2. All 11 new ids grep to exactly 1 occurrence each; none pre-existed.
3. All 7 new statDefaults names present with the exact spellings requested.
4. `seenPickupKinds` / `seenRoomTypes` registration present at 3090-3091.
5. Node `vm` sandbox load (utils.js + data.js + enemies.js + achievements.js with
   stubbed `document` / `localStorage` / `window`): loads with **no runtime
   error**; `ACHIEVEMENTS.length === 1709`; exactly **11** achievements whose id
   starts with `compass`; `ACHIEVEMENTS_BY_ID['compassstar']` resolves to the
   expected object including `starId:'teleport_star'`;
   `ensureUnlockShape({}).stats.sombraRoomsVisited === 0`.

## Dependency on the parallel game.js work

The 7 new counters are only ever non-zero once the parallel `js/game.js` agent
lands its `enterRoom` first-visit bumps using these exact names. Until then the
7 corresponding achievements simply never fire (stat stays 0) — no crash, since
`statDefaults` guarantees the key exists. The 4 achievements reusing existing
keys (`petshopsVisited`, `curseRoomsVisited`, `crystalRoomsVisited`,
`starRoomsVisited`) are live immediately.
