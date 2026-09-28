# Audit — 25 new stars + their achievement unlock ladder

## Files changed

- `js/data.js` — `STAR_TYPES` only (25 new entries appended inside the table, all `locked:true`). No other table touched (PILL_COLORS / PILL_EFFECTS / ITEMS / OBSTACLES / PICKUP_POOL untouched).
- `js/stars.js` — 25 new `case`s in `applyStarEffect`, a `refundStar` helper + one line in `useHeldStar`, and two new local helpers (`applyRoomWideStatus`, `knockbackNova`).
- `js/room.js` — new "Reroll mechanics" section: `itemPoolForRoomType`, `rerollOnePedestal`, `REROLLABLE_HAZARD_KINDS`, `rerollRoomHazards`, `rerollRoomEnemies`, `championizeRoomEnemies`. Nothing existing modified.
- `js/achievements.js` — new "Stars" category with 25 `addAchievement` calls (added just above the lookup-index block), plus one desc wording fix on the pre-existing `collection_stars` ("Discover all 12 stars." → "Discover 12 different stars.", threshold unchanged at 12 — see note below).

Not touched: `js/enemies.js`, `js/pills.js`, `js/entities.js`, `js/combat.js`, `js/game.js`, `js/ui.js`.

`js/ui.js` needed no edit — its star HUD block (`ui.js:241-250`) reads `STAR_TYPES[player.starPocket]` dynamically and hardcodes no count. `js/bestiary.js` likewise uses `STAR_LIST.length`.

## Verification performed

- `node --check` clean on `js/data.js`, `js/stars.js`, `js/room.js`, `js/achievements.js`.
- 37 star ids total, all unique; no collision with the 12 existing (`alcyone atlas electra maia merope taygeta pleione celaeno antares polaris achernar vega`).
- Every one of the 37 stars has exactly one `case` in `applyStarEffect`; no `case` refers to a nonexistent star.
- 29 locked stars (4 superboss + 25 new); every one has an unlock source. The 25 new ones map 1:1 onto the 25 new `starId` achievements.
- 482 literal `addAchievement` ids in the file, zero duplicates; all 25 new ids use the previously-unused `star_` prefix.
- `SUPERBOSS_REWARDS` deliberately untouched — its `length === bosses × classes` assertion still holds (the new stars are NOT in `NEW_CLASS_REWARD_STARS`).
- Script order in `index.html`: `room.js`(152) → `combat.js`(154) → `stars.js`(158). Irrelevant at call time (all globals are defined long before a star can be used), but confirmed anyway.

## Reroll safety

### Reroll hazards (Altair) — cannot alter room geometry

`REROLLABLE_HAZARD_KINDS` is used as **both** the eligibility filter and the replacement pool, so an obstacle can only ever be swapped for another member of the same list:

```
cactus, yellowfire, redfire, bluefire, purplefire, spiketrap, movingspike, sandtrap, mud
```

Verified against `OBSTACLES` in `data.js:2562-2643`: each of these nine is either `walkable:true` (sandtrap, mud) or `hazard:true` with **no** `solid`. Traced through `combat.js collidesAt` (line 124-140): `if (ob.destroyed || ob.isWalkable || (ob.isHazard && !ob.solid)) continue;` — every one of the nine hits that `continue`, in both directions of a swap. Therefore **no swap can open or close a path.**

Deliberately excluded, and why:
- `rock / hardrock / tallrock / tallhardrock / tintedrock / pit` — room layout and pathing. Turning a wall of rocks into pits (or vice versa) mid-fight could wall off the only route, or drop a pit under the player's escape lane.
- `spikedrock` — it *is* `hazard:true`, but also `solid:true`. It blocks like a rock, so it belongs to geometry, not hazards. It is neither rerolled nor rolled into.
- `turret*`, `bombbarrel`, `pushablebombbarrel` — solid; barrels are also a puzzle/chain element.
- `spike` (Sacrifice Spike) — a sacrifice room's fixed centerpiece and reward mechanic, not a hazard to shuffle.

Position is never changed: the replacement is `new Obstacle(kind, ob.tx, ob.ty)`, which re-derives `def`/color/hp/flags from the new kind at the identical tile. `computePitMasks` needs no rerun (pits are never involved). Moving Spike patrol state is lazily initialized on its first tick, so a freshly constructed one picks up its patrol normally.

Hand-traced example — a normal room with `[hardrock@4,3] [pit@5,3] [cactus@7,6] [mud@8,6] [spikedrock@9,2] [turretn@2,2]`: the loop's `indexOf(ob.kind) === -1` guard skips hardrock, pit, spikedrock and turretn outright; only cactus and mud are rerolled, each into one of the same nine non-blocking kinds at the same tile. Room solvability is bit-for-bit unchanged.

### Reroll enemies (Capella) — cannot lock the player in

The room-clear check (`combat.js checkRoomCleared`) is only ever reached from `handleEnemyDeath`. A combat-locked room opens its doors on an enemy-death event; if a reroll dropped the living count to zero *without* such an event, the player would be sealed in forever.

Guarantees in `rerollRoomEnemies`:
1. Refuses outright if any living `isBoss` enemy is present (returns 0 → the star is refunded). Boss rooms and their minion waves are never rerolled.
2. Removes only living non-boss enemies, and spawns **exactly the same count** back before returning. Count is preserved, so `node.enemies.some(e => !e.isDead)` is true before and after.
3. The whole swap is synchronous inside one star use — no frame boundary, no clear check, in between.
4. Returns 0 (refund) if there was nothing living to reroll, so it can never turn a populated room into an empty one.
5. Spawn spots come from `roomFloorTiles(node, { avoidDoors: 2.5, avoidCenter: 1.2 })` — the exact options `populateRoomProcedural` uses — with `findClearFloorSpot(center)` as the fallback when spots run out, so a spawn can never fail.

**Silent removal, no kill credit** (decision + reasoning): outgoing enemies are dropped from `node.enemies` without calling `handleEnemyDeath`. Routing them through the death path would pay `enemiesKilled`, bestiary progress, `runKills`, splitter splits, champion drops and Shiny Shell/Golden Clover rolls — i.e. the star would become a "kill the room for free, then get a fresh room to kill again" farm button, and would additionally recurse (a splitter would spawn children *and* be replaced). A reroll is a re-draw, not a slaughter, so it pays nothing. `resetRoomEnemyBias()` is called before the respawn loop so the new set rolls its own featured types, exactly like a freshly populated room.

Challenge rooms are safe: the wave counter is untouched and the count is preserved, so wave progression is unaffected.

### Reroll pedestal (Deneb)

Swaps only the pedestal's `item` reference. Position, `taken`, and the `isDeal`/`isTrinket`/`isFamiliar` flags are preserved, so a trinket stays a trinket and a devil deal still costs its heart. Zero effect on geometry or room state. If the matching pool comes up empty (everything still locked), the pedestal is left alone and the star is refunded.

### Star refunding (new, small)

`useHeldStar` now checks `applyStarEffect(...) === false`. Seven "nothing to act on" branches call `refundStar`, which puts the star back in the pocket and toasts why — and, because `bumpStat('starsUsed')` runs only past that check, a refunded star does not count as used. Previously a star was always consumed even in a no-op case; this only affects the new cases plus nothing else (all pre-existing cases fall through and still count).

## The 25 stars

| # | id | name | icon | effect | achievement (id — condition) |
|---|----|------|------|--------|------------------------------|
| 1 | `deneb` | Deneb | 🔄 | Reroll one untaken pedestal in this room | `star_deneb` — collect 25 items |
| 2 | `altair` | Altair | ♻️ | Reroll every hazard in this room into another hazard | `star_altair` — destroy 250 obstacles |
| 3 | `capella` | Capella | 🎲 | Reroll every enemy in this room into a fresh set | `star_capella` — defeat 250 enemies |
| 4 | `bellatrix` | Bellatrix | 👑 | Promote every non-boss enemy to a champion (×2 hp/dmg) | `star_bellatrix` — defeat 30 bosses |
| 5 | `arcturus` | Arcturus | 🔶 | +5 damage for the rest of this room | `star_arcturus` — clear 50 rooms |
| 6 | `aldebaran` | Aldebaran | 🛡️ | Blocks the next hit (`shieldHits += 1`) | `star_aldebaran` — die 5 times |
| 7 | `merak` | Merak | 🔋 | Fully recharges the active item *(substitution)* | `star_merak` — 150 active-item uses |
| 8 | `alkaid` | Alkaid | ✨ | Invincible for 10s *(substitution)* | `star_alkaid` — 10 challenge rooms |
| 9 | `dubhe` | Dubhe | ⚔️ | +8 damage for the rest of this room *(substitution)* | `star_dubhe` — 600 crits landed |
| 10 | `phecda` | Phecda | 🧊 | Freezes every enemy for 8s *(substitution)* | `star_phecda` — freeze 150 enemies |
| 11 | `megrez` | Megrez | 🪞 | Blocks the next 3 hits *(substitution)* | `star_megrez` — open 10 vaults |
| 12 | `mizar` | Mizar | 💗 | Fully restores red hearts | `star_mizar` — swallow 50 pills |
| 13 | `alnitak` | Alnitak | 🗺️ | Reveals the whole floor's map | `star_alnitak` — 25 secret rooms |
| 14 | `alnilam` | Alnilam | 😱 | Fears every non-boss enemy for 8s | `star_alnilam` — 400 melee kills |
| 15 | `mintaka` | Mintaka | 💞 | Charms one random enemy for 12s | `star_mintaka` — 400 ranged kills |
| 16 | `saiph` | Saiph | 💥 | Knockback nova — shoves every enemy away | `star_saiph` — place 250 bombs |
| 17 | `rigel` | Rigel | ☠️ | Executes the lowest-HP non-boss enemy | `star_rigel` — 300 Swarmer DNBs |
| 18 | `betelgeuse` | Betelgeuse | 🪙 | Drops 6 coins *(substitution)* | `star_betelgeuse` — collect 3000 coins |
| 19 | `sirius` | Sirius | 🌠 | Room-wide sear (6× floor scale) + 4s freeze *(substitution)* | `star_sirius` — win 3 times |
| 20 | `procyon` | Procyon | ❤️ | +1 heart container, permanently | `star_procyon` — use 25 stars |
| 21 | `castor` | Castor | ✴️ | Drops 2 more stars on the ground *(substitution)* | `star_castor` — use 100 stars |
| 22 | `pollux` | Pollux | 🏛️ | Spawns a free item pedestal in this room | `star_pollux` — open 150 chests |
| 23 | `regulus` | Regulus | 🎁 | Spawns a treasure chest in this room | `star_regulus` — open 25 gold chests |
| 24 | `spica` | Spica | 🍀 | +1 Luck for the rest of the run | `star_spica` — 60 shop purchases |
| 25 | `antlia` | Antlia | 🧰 | +2 keys and +2 bombs | `star_antlia` — spend 60 keys |

All 25 colours are distinct hexes and none duplicates one of the existing 12.

### Mechanisms reused (all verified by grep before use)

- damage-for-the-room → `player.starDamageBonus` + `recalcPlayerStats` (Alcyone's pattern; cleared by `game.js:144-148` on room entry — generic, no edit needed).
- shield → `player.shieldHits`, consumed in `entities.js takeDamage:145`.
- invincibility → `player.invincibleTimer`, Panic Whistle's field (`items.js:715-717`), ticked by the main loop.
- full heal → `player.redCurrent = player.redMax`, Meditation Bell / Angel's Tears pattern.
- heart container → `player.grantHeartContainer(1)` (`entities.js:218`).
- luck → `player.luckyPennies += 1` + recalc; `items.js:13` sums it into `player.luck`. A direct `player.luck` write would have been wiped by the next recalc.
- reveal map → `player.eyeUsed = true; player.revealMap = true` — the All-Seeing Eye pair (`items.js:633-634`); `eyeUsed` is what makes `items.js:299` keep `revealMap` true across recalcs.
- active-item charge → `player.activeCharge = player.activeItem.maxCharge` (the Charge Up pill, `pills.js:92-93`).
- fear / charm → `e.fearTimer` / `e.charmTimer`, the exact fields `combat.js applyOnHitStatuses:450-452` sets; ticked down in `updateEnemy:967-969` and dispatched to `ai.js aiFeared/aiCharmed`. Bosses excluded, matching the existing status rule.
- knockback → `e.takeDamage(0, kx, ky)` — `entities.js:352-358` applies `knockX/knockY` regardless of amount, and `combat.js:821-824` decays them. Zero damage means no float text, no kill, no stat.
- execute → `takeDamage(hp)` then `handleEnemyDeath`, so drops / kill credit / bestiary / room-clear all fire correctly.
- champion promotion → the exact three lines from `room.js populateRoom:220-227`.
- freeze / room nuke → existing `freezeAllEnemies` / `damageAllEnemies` (combat.js), the latter scaled by `enemyHpScale` like Antares.
- spawns → `scatterStarPickups` (which routes through `spawnResolvedPickup`, so a scattered coin still rolls its tier and a scattered star still rolls a random unlocked id), `addItemOrTrinketPedestal`, `new Chest(Util.weighted(CHEST_TYPE_POOL).id, ...)`, all placed via `findClearFloorSpot`.

### Substitutions, and why

The hard constraint: `js/entities.js` (field declaration) and `js/game.js` (the room-entry reset block) were off limits, so any *new* "for the rest of this room" stat category was impossible — and grep confirmed there is **no** timer-based hook for fire rate, crit, pierce, bomb radius or range. All five of those stats are recomputed from scratch inside `items.js recalcPlayerStats` on every call, and recalc fires mid-room on item pickup, pill use, coin pickup (`combat.js:574`) and other star uses, so a direct write would be silently wiped at an unpredictable moment. Substituted rather than shipped broken:

1. **Merak — +50% fire rate → fully recharge the active item.** No self-clearing fire-rate accumulator exists; `player.pillFireRateBonus` is a *permanent* pill accumulator (`pills.js:89`), not room-scoped, and using it would have made a "for this room" star permanent.
2. **Alkaid — +3 crit chance → 10s invincibility.** `player.critChance` is fully recomputed in recalc. Swapped for the Panic Whistle timer, which is genuinely self-contained.
3. **Dubhe — +2 pierce → +8 damage for the room.** `player.tearFlags.pierce` is rebuilt from scratch in recalc every call. Fell back to the one temp-buff category that already has a room-entry clear.
4. **Phecda — +30% bomb radius → freeze the room for 8s.** `player.bombRadiusMult` is recomputed in recalc (`items.js:421`).
5. **Megrez — +2 tiles range → blocks the next 3 hits.** `player.rangeTiles` is recomputed in recalc (`items.js:200-213`).
6. **Betelgeuse — double coin drops → drops 6 coins.** There is no `coinDropMult`-style field. A `node.doubleCoinsThisRoom` flag would have needed a read in `combat.js handleEnemyDeath`'s drop path, outside the permitted footprint for that file. Six coins delivers comparable value with zero plumbing.
7. **Sirius — flight for the room → room-wide sear + freeze.** `player.canFly` is unconditionally reassigned by `items.js:482` (`player.def.canFly || borrowedwings`), and `items.js` was not in the editable set, so a granted flight would vanish at the next recalc — potentially dropping a flying player into a pit. Substituted with a "brightest star in the sky" finisher built from two existing room-wide functions.
8. **Castor — +1 max bomb capacity → drops 2 more stars.** Grep found no bomb *cap* anywhere: `player.bombs` (`entities.js:66`) is an uncapped counter, so "max bomb capacity" does not exist as a concept in this game.
9. **Mizar — full red *and* blue heal → full red heal.** Blue hearts have no "max", only a cap of `20 - redMax`; filling to that cap would hand out up to ~14 blue hearts. Trimmed to the existing full-heal pattern (Meditation Bell / Angel's Tears).

Every other star (1-6, 12-17, 20, 22-25) is implemented exactly as specified.

## Achievement notes

- All 25 are Predicate A (`statKey` + `threshold`) over counters already present in `ensureUnlockShape`'s `statDefaults` and already written by existing `bumpStat` call sites — **no new tracking code anywhere in the game**.
- Difficulty spread, calibrated against the existing Miscellaneous/Mastery ladders: early (`roomsCleared` 50, `itemsCollected` 25, `deaths` 5, `pillsUsed` 50, `keysUsed` 60), mid (250 obstacles / 250 kills / 250 bombs / 150 chests / 150 freezes / 25 stars used), and long-haul (`critsLanded` 600, `swarmerdnbKilled` 300, `starsUsed` 100, `wins` 3).
- `starsUsed` had no achievement at all before this; it now carries two rungs (Procyon at 25, Castor at 100).
- The pre-existing `collection_stars` ("Discover all 12 stars") was left at `distinctThreshold: 12` — raising it to 37 would gate one achievement behind 25 others. Only its wording was corrected to "Discover 12 different stars." so it no longer claims a pool size that is now wrong.
