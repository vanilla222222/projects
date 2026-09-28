# Audit — new-reward foundation: pill colors + enemies as unlockable content types

Adds content types #6 (pill colors) and #7 (enemies) to the existing 5
(items / trinkets / familiars / stars / pickup kinds), following the exact
`locked:true` + `isXUnlocked(id)` + reward-field-dispatch + spawn-filter template.
100 brand-new content entries (40 pill colors, 60 enemies), all `locked:true`.
**No existing pill color or enemy was modified** — all 60 original `PILL_COLORS`
and all 619 original `ENEMY_TYPES` entries still carry no `locked` field.

No achievement points a `pillColorId`/`enemyId` at anything yet — that is the
next dispatch. The mechanism is live and inert: with zero such achievements, all
100 new entries simply never roll, and every pool falls back exactly as before.

## Files changed

| File | Change |
|---|---|
| `js/data.js` | +40 `locked:true` entries at the tail of `PILL_COLORS` (60 → 100) |
| `js/enemies.js` | +60 `locked:true` entries at the tail of `ENEMY_TYPES` (619 → 679) |
| `js/achievements.js` | `isPillColorUnlocked`/`isEnemyUnlocked`; 2 new keys in `ensureUnlockShape`; `pillColorId`/`enemyId` branches + toast labels in `unlockAchievement`; header doc block; 1 clarifying comment on `collection_pills` |
| `js/room.js` | new `rollRandomPillColorId()`; pill spawn site now calls it; `resolveGenericEnemy` filters every pool step on unlock state |
| `js/combat.js` | `grantPickupEffect`'s `'pill'` case now draws its color through `rollRandomPillColorId()` (was `Util.choice(PILL_COLORS)`) — this is the shop/chest pill path |
| `js/ui.js` | one stale comment ("PILL_COLORS is 60 entries long") corrected to 100 |

## The unlock-dispatch additions (achievements.js)

**Helpers** — `js/achievements.js:85-103`, directly under `isStarUnlocked`, same
`currentUnlocks()` (start-of-run snapshot) shape as all five existing helpers:

```js
function isPillColorUnlocked(colorId){
  return !!currentUnlocks().unlockedPillColors[colorId];
}
function isEnemyUnlocked(enemyId){
  return !!currentUnlocks().unlockedEnemies[enemyId];
}
```

**Save shape** — `js/achievements.js:3007-3008`, inside `ensureUnlockShape`,
between `unlockedStars` and `winsByClass`:

```js
  if (!unlocks.unlockedStars) unlocks.unlockedStars = {};
  if (!unlocks.unlockedPillColors) unlocks.unlockedPillColors = {};   // NEW
  if (!unlocks.unlockedEnemies) unlocks.unlockedEnemies = {};         // NEW
  if (!unlocks.winsByClass) unlocks.winsByClass = {};
```

**Reward dispatch** — `js/achievements.js:3110-3118`, in `unlockAchievement`'s
if/else-if chain, inserted between the `starId` and `shopDiscount` branches:

```js
  } else if (def.starId) {
    unlocks.unlockedStars[def.starId] = true;
    rewardStar = STAR_TYPES[def.starId];
  } else if (def.pillColorId) {                                   // NEW
    unlocks.unlockedPillColors[def.pillColorId] = true;
    rewardPillColor = PILL_COLORS_BY_ID[def.pillColorId];
  } else if (def.enemyId) {                                       // NEW
    unlocks.unlockedEnemies[def.enemyId] = true;
    rewardEnemy = ENEMY_TYPES[def.enemyId];
  } else if (def.shopDiscount) {
```

plus the two locals at `:3094-3095` (`let rewardPillColor = null; let rewardEnemy = null;`)
and the toast at `:3134-3145`, which gains `💊` / `👾` stand-in icons (neither
content type has an `icon` field) and the labels `pill color "Name"` /
`enemy "Name"` in the same ternary chain as items/trinkets/familiars/stars.
Reward is banked for future runs, never granted mid-run — unchanged behavior.

## Spawn-time filters

**Pills** — `js/room.js:706-717`, mirroring `rollRandomStarId` one function above it:

```js
function rollRandomPillColorId(){
  const candidates = PILL_COLORS.filter(c => !c.locked || isPillColorUnlocked(c.id));
  return (candidates.length ? Util.choice(candidates) : Util.choice(PILL_COLORS)).id;
}
```

Both — and only — call sites now route through it:
* `js/room.js:636` `spawnResolvedPickup`'s `'pill'` case (room/template/editor spawns)
* `js/combat.js:790` `grantPickupEffect`'s `'pill'` case, the `pillColor ||` fallback
  (shop purchase, chest/sack payout, anything granting a pill with no explicit color)

`shop.js` holds no `PILL_COLORS` reference of its own — its pill slot grants
through `grantPickupEffect`, so it is covered by the combat.js site.

**Enemies** — `js/room.js:522-543`, `resolveGenericEnemy`. One predicate,
applied at all four pool steps:

```js
  const avail = e => !e.locked || isEnemyUnlocked(e.id);
  ...
    const fkPool = ENEMY_LIST.filter(e => e.floorKey === floorKey && !e.isMinion && avail(e));
  ...
  let pool = ENEMY_LIST.filter(e => e.stage === stage && !e.isMinion && avail(e) && (e.xpTier || 1) <= 1 + floorInStage);
  if (!pool.length) pool = ENEMY_LIST.filter(e => e.stage === stage && !e.isMinion && avail(e));
  if (!pool.length) pool = ENEMY_LIST.filter(avail);   // NEW step: filtered whole-list fallback
  return pickBiasedEnemy(pool.length ? pool : ENEMY_LIST);
```

The cascade still degrades exactly as before (floorKey pool → xpTier-capped
stage pool → full stage pool → any enemy), just with locked entries removed at
each rung. Verified by parsing the table: with **zero** unlocks, every one of the
17 floorKey buckets and every (stage × floorInStage) stage pool is still
non-empty, so no fallback ever fires that didn't fire before. `resolveGenericBoss`
was deliberately left alone (`BOSS_TYPES`/`SUPERBOSSES` are out of scope and
gained no locked entries).

## The 40 new pill colors

Shape is identical to the existing 60 (`{id, name, color}`) plus `locked:true`.
No `unlockedBy` doc field — items with `locked:true` (e.g. `voidwhisper`) omit it
too, and there is no achievement to name yet. **Zero effect authoring needed**:
confirmed that `game.js:76` (`startRun`) rebuilds `game.pillEffectMap` by walking
every `PILL_COLORS` entry and drawing a random `PILL_EFFECT_LIST` id per color,
so a new swatch joins the per-run disguise lottery automatically, exactly like
the original 60. Nothing else in the game keys off a color id.

`obsidian`, `quartz`, `garnet`, `amethyst`, `citrine`, `turquoise`, `sapphire`,
`aquamarine`, `malachite`, `moonstone`, `sunstone`, `tourmaline`, `cinnabar`,
`verdigris`, `saffron`, `paprika`, `plum`, `mulberry`, `cherry`, `apricot`,
`honey`, `caramel`, `cocoa`, `espresso`, `vanilla`, `celadon`, `seafoam`,
`glacier`, `frost`, `storm`, `thunder`, `ember`, `magma`, `soot`, `tar`,
`mercury`, `platinum`, `brass`, `ultraviolet`, `iridescent`
(names follow the existing "X Pill" convention; each has a distinct 6-digit hex).

## The 60 new enemies — 4 per bucket × 15 buckets

Stage-tagged entries carry `xpTier` and no `floorKey`; floorKey-tagged entries
carry neither `stage` nor `xpTier` — matching their bucket-mates exactly.
Stats calibrated against the existing same-bucket roster (hp/dmg/speed bands),
palettes matched to bucket theme.

| Bucket | Entries (behavior) |
|---|---|
| stage 0 — Crypt | `ossuarysaint` chaser, `reliquarymite` swarm, `pallbearer` lobber, `candlewake` teleporter |
| stage 1 — Forest | `mistlestag` charger, `fungalchoir` summoner, `dewdancer` weaver, `heartseedling` splitter (→`sprout`) |
| stage 2 — Desert | `glasswake` ambusher, `mirageoracle` sentry, `gildedscarab` burrower, `sunveilmoth` flyer |
| stage 3 — Inferno | `cinderchoir` healer, `pyrecircler` orbiter, `slagmarksman` sniper, `emberwarden` shielder |
| floorKey 9A | `eclipseherald` ranged, `galewraith` weaver, `stormsinger` summoner, `thunderhusk` burrower |
| floorKey 10B | `orchidlurker` ambusher, `plumescreamer` flyer, `vinemender` healer, `idolcircler` orbiter |
| floorKey 11B | `nautilusdrifter` orbiter, `anglerlantern` sniper, `kelpweaver` weaver, `pearlwarden` shielder |
| floorKey 12A | `nullshade` teleporter, `rasterswarm` swarm, `segfaultmortar` lobber, `checksumwarden` shielder |
| floorKey 13 | `polyrhythm` weaver, `fermatasentry` sentry, `syncopehopper` leaper, `tremorswarm` swarm |
| floorKey 3C | `sumppike` ambusher, `effluentmite` swarm, `culvertlobber` lobber, `pipewhistle` sentry |
| floorKey 5C | `vaporshade` teleporter, `cisternweaver` weaver, `ductburrower` burrower, `filthmender` healer |
| floorKey 7C | `ocelotlurker` ambusher, `pollencircler` orbiter, `termitewarden` shielder, `blowgunsniper` sniper |
| floorKey 8C | `carrionmender` healer, `fungusplitter` splitter, `boglurker` ambusher, `plaguegnats` swarm |
| floorKey 9C | `graveorchid` summoner, `shrikesniper` sniper, `quagmiredelver` burrower, `bilebrewer` lobber |
| floorKey 10C | `doomchoir` shielder, `gildedmantis` ambusher, `reliquarysplitter` splitter, `cursemites` swarm |

Behaviors used: 18 of the 21 — chaser, swarm, lobber, teleporter, charger,
summoner, weaver, splitter, ambusher, sentry, burrower, flyer, healer, orbiter,
sniper, shielder, ranged, leaper. Only bomber, shielded and turret are absent,
those being the three most saturated behaviors in every existing bucket.

## Verification performed

* `node --check` on **every** file in `js/` — all pass (run after each sub-unit
  and again at the end).
* **Field-shape audit** (script, not eyeballing): for each of the 60 new enemies,
  its tuning-field set was diffed against the union/mode of the field sets of
  every existing enemy sharing its `behavior`. Result: **0 missing required
  fields, 0 unknown fields**. Also verified every new entry's object key equals
  its `id`, has all 8 core fields, and that `splitInto`/`summonId` targets exist.
* **Id uniqueness**: 679 `ENEMY_TYPES` keys, no duplicates, no collision between
  the 60 new ids and `BOSS_TYPES` or `SUPERBOSSES`. 100 `PILL_COLORS` ids, no
  duplicates, all colors well-formed `#rrggbb`.
* **Nothing existing got locked**: `ENEMY_TYPES` = 619 unlocked + 60 locked;
  `PILL_COLORS` = 60 unlocked + 40 locked.
* **Helpers defined exactly once each**, called at exactly the intended sites
  (`isEnemyUnlocked` → room.js:528; `isPillColorUnlocked` → room.js:715, the sole
  body of `rollRandomPillColorId`, which is itself called from room.js:636 and
  combat.js:790).
* **Zero-unlock trace**: simulated `avail()` with an empty unlock blob — 0 locked
  entries visible, all 17 floorKey pools and all stage/xpTier pools still
  non-empty, and `rollRandomPillColorId` still has 60 candidates. Game behaves
  identically to before this change until achievements are wired.

## Old-save compatibility

Matches the existing five categories exactly, which handle it entirely through
`ensureUnlockShape`'s `if (!unlocks.X) unlocks.X = {}` idiom — there is no
separate migration path in this codebase. `ensureUnlockShape` is run on **every**
read (`currentUnlocks()`, `beginRunUnlocks()`) and **every** write
(`unlockAchievement` calls it before touching anything), so a `nightfallUnlocks`
blob written before today gets `unlockedPillColors`/`unlockedEnemies` filled in
the first time it is touched, and no code path can ever reach
`undefined[colorId]`. Both helpers are also only ever reached via
`currentUnlocks()`, which returns an already-shaped object. Confirmed no other
file reads `unlocks.unlockedX` directly.

## Deviations / notes

1. **`js/combat.js` was edited** (one line, `:790`). It was not named in the task,
   but it is the second of the two pill-color draw sites — the shop/chest/sack
   path — and leaving it on `Util.choice(PILL_COLORS)` would have leaked locked
   swatches through shop purchases. `shop.js` needed no change (it has no
   `PILL_COLORS` reference; it grants via `grantPickupEffect`).
2. **`js/ui.js` comment fix** (one comment line): it asserted "PILL_COLORS is 60
   entries long", now 100. No logic touched.
3. **`collection_pills` achievement left mechanically untouched.** Its
   `distinctThreshold:60` / "Sample all 60 pill colors" is now a 60-of-100 goal
   rather than a literal sweep — but it stays *exactly* completable off the 60
   always-unlocked colors, so nothing regressed. Added a two-line comment above it
   recording that, matching the existing precedent comment on `collection_stars`
   (whose threshold was likewise left at 12 when `STAR_TYPES` grew to 37). No
   threshold, desc, or reward changed.
4. **Bestiary/HUD show the new entries as un-seen/un-identified.** `bestiary.js`
   iterates the full `PILL_COLORS` (pill tab total becomes /100) and the enemy
   tab will list the 60 new creatures as undiscovered. This is the same treatment
   locked stars/items/trinkets already get, so no change was made.
5. **No `unlockedBy` field** on the new entries. Trinkets use it as documentation,
   locked *items* do not, and there is no achievement id to cite yet. Easy to add
   in the next dispatch alongside the achievement wiring if desired.
6. **Room-editor caveat, pre-existing and unchanged**: `room-editor.html` does not
   load `achievements.js`, so `isEnemyUnlocked`/`isPillColorUnlocked` would be
   undefined there — exactly as `isItemUnlocked`/`isTrinketUnlocked` already are
   in `pickItemFromPool`/`pickTrinketFromPool`. The editor never calls
   `resolveGenericEnemy`/`spawnResolvedPickup` (it builds previews directly), so
   this introduces no new exposure; I matched the existing unguarded style rather
   than adding `typeof` guards only to the new sites.
