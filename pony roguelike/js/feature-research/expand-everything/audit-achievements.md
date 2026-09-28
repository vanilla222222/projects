# Audit — achievement coverage for the reroll altar, star rooms, and the reworked class attacks

## Files changed

- `js/shop.js` — one added line in `tryRerollAltar` (line 206).
- `js/game.js` — one added line in the `enterRoom` first-visit chain (line 180).
- `js/achievements.js` — two new stat defaults, three new flat achievements for the new
  fixtures, three new Characters-category achievements for the reworked signature attacks,
  and two new `addTierSet` ladders.
- `feature-research/expand-everything/audit-achievements.md` — this file.

No other file was touched. `js/combat.js` was read only (to confirm which stat each reworked
attack bumps) and is unmodified.

## New stats

Both added to the `statDefaults` literal in `ensureUnlockShape` (`js/achievements.js` ~line 1852):

```js
    // Star Rooms (game.js enterRoom, same first-visit chain as the three
    // above) and the shop's Reroll Altar (shop.js tryRerollAltar, bumped
    // only once the coin cost is actually paid)
    starRoomsVisited:0, rerollAltarUses:0,
```

### `rerollAltarUses` — call site (`js/shop.js` line 206)

Placed immediately after the existing `bumpStat('coinsSpent', cost, game)`, i.e. **after** both
early-return guards (`countRerollableShopSlots(node)` empty-shelf bail and the
`player.coins < cost` insufficient-funds bail) and after `player.coins -= cost` /
`altar.uses++`. A failed or unaffordable reroll attempt bumps nothing.

```js
  bumpStat('coinsSpent', cost, game);
  bumpStat('rerollAltarUses', 1, game); // only on a reroll that actually happened — see achievements.js's misc_rerollaltar ladder
```

### `starRoomsVisited` — call site (`js/game.js` line 180)

Appended to the existing first-visit `if/else if` chain, exact same shape as its three siblings.
The room type string `'star'` is confirmed real: `js/dungeon.js:57` lists it in the special-room
type table and `js/dungeon.js:404` attaches one at 30% chance; `js/room.js:14` and `:337` build it.

```js
      if (node.type === 'petshop') bumpStat('petshopsVisited', 1, this);
      else if (node.type === 'curse') bumpStat('curseRoomsVisited', 1, this);
      else if (node.type === 'crystal') bumpStat('crystalRoomsVisited', 1, this);
      else if (node.type === 'star') bumpStat('starRoomsVisited', 1, this);
```

## New achievements

### A. Reroll altar

One flat single (in the new "8b" block, ~line 539) plus a three-tier ladder (~line 1521):

```js
addAchievement({ id:'rerollregular', name:'Second Opinion', icon:'🔄',
  desc:'Use a shop Reroll Altar 25 times.', category:'Miscellaneous', statKey:'rerollAltarUses', threshold:25 });

addTierSet({ baseId:'misc_rerollaltar', name:'Altar of Second Chances', icon:'🔄',
  category:'Miscellaneous', statKey:'rerollAltarUses',
  desc: n => 'Use a shop Reroll Altar ' + n + ' times.',
  tiers:[ { threshold:10 }, { threshold:40 }, { threshold:120 } ] });
```

Category choice: **Miscellaneous**, not Exploration. The Exploration tier-set block is explicitly
"room-type visit ladders" keyed off `enterRoom`; the reroll altar is a shop fixture, and every
other shop-flavoured ladder (`coinsSpent` 300/600/1200, `shopPurchases` 25/60/120, the whole
`donationTotal` line) lives in Miscellaneous.

Threshold scale: anchored on `shopPurchases` (25/60/120). A reroll is individually cheaper and
more repeatable than a purchase, but the cost curve climbs *within* each shop visit
(`REROLL_ALTAR_COSTS` then `+REROLL_ALTAR_COST_STEP` per use), which caps how many you take per
shop — so 10/40/120 lands in the same lifetime band rather than the `donationTotal`-style
50…1000 band.

### B. Star room

Mirrors the crystal/curse/petshop pattern on both halves: two flat singles in the Miscellaneous
block, plus a three-tier `Exploration` ladder placed directly after `exploration_crystalrooms`
in the same "room-type visit ladders" block, using the identical `baseId`/`name`/`icon`/
`category`/`statKey`/`desc`-as-function/`tiers` shape.

```js
addAchievement({ id:'starseeker', name:'Star Seeker', icon:'🌟',
  desc:'Visit 5 Star Rooms.', category:'Miscellaneous', statKey:'starRoomsVisited', threshold:5 });
addAchievement({ id:'stargazer', name:'Stargazer', icon:'🌠',
  desc:'Visit 15 Star Rooms.', category:'Miscellaneous', statKey:'starRoomsVisited', threshold:15 });

addTierSet({ baseId:'exploration_starrooms', name:'Star Pilgrim', icon:'🌟',
  category:'Exploration', statKey:'starRoomsVisited',
  desc: n => 'Visit ' + n + ' Star Rooms.',
  tiers:[
    { threshold:5 },
    { threshold:25 },
    { threshold:75, shopDiscount:'star' },
  ] });
```

Thresholds copy the crystal ladder (5/25/75) and the crystal flat pair (5/15), since both room
types are "special room that offers a choice". The flat-5 and tier-1-at-5 overlap is not a
mistake — it is exactly what `petshopregular` (5) / `exploration_petshops` tier 1 (5) already do.

### C. The three reworked signature attacks

**Correction to the task premise, and the single most important finding here:** `classId` is
**not** a class gate. It is a *reward* key — it appears in `TIER_REWARD_KEYS`, and
`unlockAchievement` does `unlocks[def.classId] = true` and toasts *"New class unlocked: X!"*.
The panel renders it as `Unlocks: a new character`. Nothing anywhere reads `def.classId` as
"only count this while playing as X"; the `statKey` on `unlock_alicorn` / `unlock_changeling` /
`unlock_diamonddog` is a plain lifetime counter that any class can advance. So adding
`classId:'crystalpony'` (etc.) to a *new* achievement would have fired a bogus second
"New class unlocked" toast for an already-unlocked class and re-set an already-true flag.

The three new achievements therefore carry no `classId`: they live in the `Characters` category
and name the class in flavour text, which is the only part of the requested behaviour that
`classId` was actually going to provide. Each `statKey` was verified by reading the attack:

| Class | Function (`js/combat.js`) | Stat it bumps | Verified at |
|---|---|---|---|
| Crystal Pony | `playerCrystalVolleyAttack` | `shotsFired` (once per cast, not per shard) | line ~505 |
| Changeling | `updateGreenFireAttack` | `rangedKills` on `e.isDead` inside the zone loop | line ~408 |
| Diamond Dog | `shatterRockByShockwave` | `obstaclesDestroyed`, with an explicit in-code comment that it deliberately does **not** bump `rocksBombed` because that key gates her own unlock | lines 309–312 |

```js
addAchievement({ id:'crystalpony_volley', name:'Shardstorm', icon:'💠',
  desc:'Fire 750 ranged shots — the Crystal Pony\'s charged volley counts once per cast.',
  category:'Characters', statKey:'shotsFired', threshold:750 });
addAchievement({ id:'changeling_greenfire', name:'Green Fire', icon:'🟢',
  desc:'Defeat 500 enemies with ranged attacks — the Changeling\'s fire zone counts every kill it burns down.',
  category:'Characters', statKey:'rangedKills', threshold:500 });
addAchievement({ id:'diamonddog_shockwave', name:'Shockwave', icon:'🐾',
  desc:'Destroy 150 obstacles — the Diamond Dog\'s shockwave shatters rocks without a single bomb.',
  category:'Characters', statKey:'obstaclesDestroyed', threshold:150 });
```

Thresholds slot into gaps between existing rungs on each key (shotsFired: 750 sits below the
existing 1000/1500/2500/4000; rangedKills: 500 between 400 and 600; obstaclesDestroyed: 150
between 80 and 200). The pre-existing `unlock_changeling` (`familiarsCollected`, threshold 25)
was left completely untouched, as instructed.

## Reward-id collisions — none, because nothing new claims a reward id

Every new achievement above is reward-free except one tier, which takes a demonstrably
unclaimed reward. The reasoning, checked mechanically:

- The **Superbosses** block builds `SUPERBOSS_REWARDS` as
  `TRINKET_LIST.filter(t => t.locked && !t.donationReward)` concatenated with
  `ACHIEVEMENT_PICKUP_KINDS` (all 7 kinds), `NEW_CLASS_REWARD_ITEMS` (4), `NEW_CLASS_REWARD_FAMILIARS`
  and `NEW_CLASS_REWARD_STARS`, and indexes it with a strictly-incrementing counter and **no
  modulo**, guarded by an explicit `_rewardIndex !== SUPERBOSS_REWARDS.length` console.warn.
  That means the *entire* locked-trinket table plus all four "new class" reward pools is already
  spoken for by construction, and the pool size is load-bearing.
- A scan of `data.js` for definitions carrying `locked: true` against every
  `itemId|trinketId|familiarId|starId` literal in `achievements.js` returned no locked **item**
  id that is free (the only apparent ones — `dragonfirecore`, `frostboundcloak`,
  `tidecallersscale`, `gustwovenveil` — are the `NEW_CLASS_REWARD_ITEMS` array, claimed
  dynamically rather than by a literal). Every seemingly-free locked trinket/familiar/star is
  claimed the same dynamic way.
- Unclaimed **unlocked** items do exist in bulk (`luckyclover`, `keeneye`, `goldenclover`, …) but
  granting one as an achievement reward is a no-op — `unlockAchievement` only writes
  `unlocks.unlockedItems[id] = true`, which is already effectively true for an unlocked item —
  and would print a misleading "Reward:" line. Not used.
- The one genuinely free reward key in the codebase is **`shopDiscount:'star'`**: `SHOP_KIND_LABELS`
  (`js/shop.js:98`) has 11 kinds, and grepping `shopDiscount:` in `achievements.js` shows 10
  Donations achievements claiming `heartRed`, `bomb`, `key`, `heartBlue`, `pill`, `sack`,
  `battery`, `item`, `trinket`, `familiar` — `star` is untouched. It is now the top tier of the
  Star Room ladder, which is also where it fits thematically.

A duplicate-id scan over every `id:'…'` literal in `achievements.js` reports **no duplicate
achievement ids** after these additions.

For the record on the "is a duplicate grant even harmful?" question: it is not a hard bug —
`unlockAchievement` returns early if the achievement is already earned, and each reward branch is
an idempotent `unlocks.<table>[id] = true`. Two achievements pointing at the same id would just
mean the second one's reward line is a no-op. It was avoided anyway, and avoiding it also avoids
perturbing the Superbosses pool-size invariant.

## D — per-class "win as this class" achievements: not attempted, deliberately

Grep-confirmed the premise of item 4 and found it **partly wrong**:

- `classId:'alicorn'` and `classId:'diamonddog'` **do** already exist (`unlock_alicorn`,
  `unlock_diamonddog`, lines ~186 and ~190) — they are not gaps.
- `classId:'mule'` and `classId:'crystalpony'` are genuinely absent, and the code comment right
  above the locked-class block explains why: *"Crystal Pony and Mule are `unlocked:true` in
  data.js and so get no achievement at all."* That is intentional, not an oversight — a `classId`
  achievement's whole function is to unlock a class.
- Both classes are nevertheless already covered by two generated families: the
  `sb_<boss>_<class>` grid (11 superbosses × 20 classes, Mule and Crystal Pony included) and
  `completionist_<class>`, which loops `for (const classId in CLASSES)`.

There is **no per-class "win a run as X" achievement pattern anywhere in the codebase** to mirror.
`recordWin(game, classId)` writes `unlocks.winsByClass[classId] = true` and then checks only
*aggregate* breadth — `>= 3` (`triplethreat`), `>= 8` (`challenge_wins_8classes`), `>= 20`
(`challenge_wins_allclasses`). Adding per-class win achievements would require inventing new
plumbing (a generated `winas_<classId>` family plus a new `unlockAchievement` call in
`recordWin`), which the task scoped out. Skipped and noted here as instructed.

## Verification performed

- `node --check` on `js/achievements.js`, `js/game.js`, `js/shop.js` after each sub-task, and a
  final full sweep of **every** file in `js/` — all pass.
- Grep-confirmed `rerollAltarUses` and `starRoomsVisited` are spelled identically in all three
  places each: the `statDefaults` literal, the `bumpStat` call site, and every referencing
  achievement (`starRoomsVisited` at achievements.js 535/537/1509 + game.js 180 + statDefaults;
  `rerollAltarUses` at achievements.js 539/1523 + shop.js 206 + statDefaults).
- Confirmed room type `'star'` is a real, spawned type (`js/dungeon.js:57`, `:404`).
- Confirmed no duplicate achievement ids and no reward-id reuse (see section above).

Not run: any in-browser playtest — per the standing "no heavy smoke testing" note, the change is
landed and syntax-checked, and the user verifies by playing.
