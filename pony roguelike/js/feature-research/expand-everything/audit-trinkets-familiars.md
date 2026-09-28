# Audit — 60 new trinkets + 40 new familiars

## Files changed

- `js/data.js` — +60 entries in `TRINKETS`, +40 entries in `FAMILIAR_TYPES`. `TRINKET_LIST` / `FAMILIAR_LIST` (`Object.values(...)`) untouched.
- `js/items.js` — new `t === 'xxx'` terms in `recalcPlayerStats` (luck, speed, melee/ranged damage, fire rate, range, boss damage, boss damage taken, lifesteal, crit, all five status chances, magnet, bomb radius, pierce, homing/spectral/explosive, dodge, canFly, revealMap, hasSecondWind, dealDiscount, shopDiscountBonus, curseImmune) plus one new derived line (`player.onKillHealChance`).
- `js/combat.js` — kill-drop chain (`handleEnemyDeath`), `explodeAt` self-damage + rock-drop, `applyOnHitStatuses` duration multiplier, `grantPickupEffect` key/bomb cases.
- `js/game.js` — `startFloor` per-floor handouts, `enterRoom` speed burst, `onRoomJustCleared` coin/heal rolls, `onBossDefeated` coin scatter.
- `js/familiars.js` — two trinket hooks in `updateOrbiterFamiliar` / `updateShooterFamiliar` (familiar damage +1, familiar cooldowns x0.85).

Not touched: `js/entities.js`, `js/room.js`, `js/achievements.js`, `js/enemies.js`, `js/stars.js`, `js/pills.js`, `CLASSES`, `ITEMS`.

## Counts

| | before | after | added |
|---|---|---|---|
| `TRINKETS` | 178 | 238 | **60** |
| `FAMILIAR_TYPES` | 119 | 159 | **40** |

### Trinkets — 30 new effects / 30 reskins

**New effects (30)** — each is a hook or stat that had *no* trinket contributor before.

*items.js `recalcPlayerStats` (11):* `kitestring` (canFly), `foxfirelantern` (revealMap), `emberphylactery` (hasSecondWind), `lodestarsight` (tearFlags.homing), `ghostquill` (tearFlags.spectral), `blastcapseed` (tearFlags.explosive), `bulwarkshard` (bossDamageTakenMult −15%), `blessedcenser` (curseImmune), `pawnbrokerschit` (dealDiscount +0.5), `hagglerstag` (shopDiscountBonus +10%), `thirstfang` (onKillHealChance +6%).

*game.js (9):* `wardingsigil` (+1 shield/floor), `skeletonpin` (+1 key/floor), `tollpouch` (+5c/floor), `soulcandle` (+½ soul heart/floor), `pilgrimsflask` (heal ½/floor), `sprintersband` (2s speed burst on room entry), `tithebell` (20% coin on room clear), `mendingchime` (10% heal ½ on room clear), `trophychain` (5 coins on boss kill).

*combat.js (8):* `gravekeeperstoken` (6% coin on kill), `powderpouch` (4% bomb on kill), `ossuarykey` (4% key on kill), `blastward` (immune to own explosions), `prospectorschip` (50% coin from bombed rocks), `hexbrand` (all five inflicted statuses last x1.5), `powderflask` (bomb pickups +1), `masterbit` (key pickups +1).

*familiars.js (2):* `houndwhistle` (+1 familiar damage), `swarmcollar` (familiar contact/fire cooldowns x0.85).

**Reskins (30)** — folded into an existing additive sum, no new code path:
damage +1 x3 (`ironpin` −8% spd, `grindstonechip` −1 luck, `battlefang`), speed x3 (`tailwindcharm` .10 / `lightfoottoken` .07 / `swiftmark` .09), luck x3 (`fortunebead` 2, `charmedpebble` 1, `trefoiltoken` 2), fire rate x3 (`slickcog` .06, `snapspring` .07, `primerpin` .05), crit x3 (`sharpsight` .06, `flawpin` .05, `truestrikebead` .07), range x2 (`spyglasslens`, `longsightbead`), boss damage x2 (`titanmark` .10, `hulkbanetoken` .06), lifesteal x2 (`bloodthorn` .05, `leechbead` .04), status x5 (`blightbead` venom, `knellchime` stun, `sirenpin` charm, `rimebead` freeze, `dreadbead` fear — .05 each), magnet (`pullbead` +25), bomb radius (`kegchip` +.12), pierce (`awlneedle` +1), dodge (`duskveil` +.05).

All magnitudes sit inside the existing spread (damage ±1–2, speed ±.05–.15, luck ±1–2, fire rate .05–.15, crit .05–.08, status .04–.06, lifesteal .04–.06, boss damage .05–.15, magnet 20–40, bomb radius .10–.30).

### Familiars — 14 orbiter / 13 shooter / 13 proc

Field names verified against `familiars.js`'s three update functions:
orbiter `dmg`/`radius`/`orbitSpeed`/`contactCooldown` (+ optional `freezeChance`), shooter `dmg`/`cooldown`/`boltSpeed`, proc `procType`/`interval`/`amount`. No 4th behavior, no 5th proc type — proc types used are only `heal` / `coin` / `luckpulse` / `charge`.

Ranges used, all inside the existing bands: orbiter `dmg` 1–3, `radius` 36–52, `orbitSpeed` 1.4–4.2, `contactCooldown` 0.45/0.6/0.7/0.85/0.9, `freezeChance` 0.15 (2 entries); shooter `dmg` 1–3, `cooldown` 0.9–2.3, `boltSpeed` 220–310; proc heal 50/0.5 and 100/1, coin 90/1 and 120/2, luckpulse 120/1, charge 90/1 and 120/2. Base `dmg` values stay floor-1 identity numbers and still route through `familiarDamage()`.

## Achievement-id verification

**No `unlockedBy` values were used, and no new trinket or familiar is `locked:true`.** So there are zero achievement ids to verify — nothing in this batch references `js/achievements.js` at all. That is a deliberate deviation from the brief; see below for why.

## Deviations from the brief (and the reasons)

**1. All 60 trinkets and all 40 familiars are unlocked-by-default instead of `locked:true` + `unlockedBy`.**

Two independent reasons, both discovered by reading `js/achievements.js` before editing:

- **`unlockedBy` is documentation, not a mechanism.** Nothing outside `data.js` ever reads it (`grep -rn unlockedBy js/` → only `data.js`). A locked trinket/familiar is gated by `isTrinketUnlocked` / `isFamiliarUnlocked` (`room.js`'s `pickTrinketFromPool` / `pickFamiliarFromPool`), whose save keys are only ever written by `unlockAchievement` when an achievement carries that id in its own `trinketId` / `familiarId` reward field — and an achievement grants exactly **one** reward (see the `if/else if` chain at `achievements.js:1778`). Every existing achievement already spends its reward slot. Pointing `unlockedBy` at one of them would have produced 100 items that can never spawn and a `data.js` comment that contradicts the code.
- **A hard invariant would have broken.** `achievements.js:227` builds the superboss reward grid as
  `TRINKET_LIST.filter(t => t.locked && !t.donationReward)` + 7 pickups + 4 items + 25 familiars + 4 stars, and the loop below indexes it with a strictly-incrementing counter and **no modulo** — the length must equal `11 superbosses × 15 characters = 165` exactly. Adding 60 locked non-donation trinkets would have pushed that filter from 125 to 185 (pool 225 vs 165 achievements), tripping the `console.warn` at line 250 and orphaning 60 rewards. Since fixing that would mean inventing achievements (explicitly out of scope), unlocked-by-default is the only correct option.

  Verified after the edit: the filter still returns **exactly 125**, and `NEW_CLASS_REWARD_FAMILIARS` is untouched at 25 — pool still 165.

  The brief explicitly allowed this (“OR reuse the pattern of some existing unlocked-by-default trinkets… your call”), and there is direct precedent: 50 of the 178 existing trinkets and 50 of the 119 existing familiars already ship unlocked, with the same rationale spelled out in the `achievements.js:196` comment.

**2. `js/familiars.js` was edited (2 trinkets).** It was not in the out-of-scope list, and it is the only sensible home for `houndwhistle` / `swarmcollar`. Both hooks are `x === 'id' ? bonus : 0/1`, so every other trinket produces byte-identical behavior to before.

**3. One new derived stat line in `recalcPlayerStats`:** `player.onKillHealChance = (player.def.lifedrinkChance || 0) + (t === 'thirstfang' ? 0.06 : 0);`. Previously the field was set once in the `Player` constructor. It is rebuilt from `def` on every recalc, so it can never compound, and it is identical to the constructor value when the trinket is absent.

## Verification performed

- `node --check` on **every** file in `js/` — all clean (run after each sub-unit: trinket data, familiar data, items.js, game.js, combat.js, familiars.js).
- Loaded `data.js` in a VM: 238 trinkets / 159 familiars, **no duplicate ids** in either object; all 40 familiars have a valid `behavior` and the complete field set for it; proc types limited to the 4 existing ones.
- Cross-file reference sweep: every `trinketId === '…'` / `t === '…'` literal in `js/` resolves to a real `TRINKETS` key (0 dangling), and all 60 new ids are wired to at least one file outside `data.js` (0 dead entries).
- Loaded the full script chain (`theme → render`, index.html order) in a VM and ran `recalcPlayerStats` once per trinket for all 238 — **0 failures**.
- Re-read each edited chain (`else if` kill-drop chain, the five status lines, the three `tearFlags` lines, the two damage sums) — all new terms are appended as extra `+` terms or new trailing `else if` branches; no existing branch was reordered, shadowed, or reworded.
