# Achievements 500 — audit

## Slice 1 — achievement machinery

Builds the declaration/eval machinery for the 354 → 854 expansion. **Adds zero
new achievements.** Count before: 354. Count after: 354.

### Files changed

| File | Change |
| --- | --- |
| `js/achievements.js` | `_achvIndexReady` + index-aware `addAchievement`; new `addTierSet` (+ `TIER_NUMERALS`, `TIER_REWARD_KEYS`); new lookup index (`ACHIEVEMENTS_BY_ID`, `_ACHV_BY_STATKEY`, `_ACHV_BY_BESTIARY_ID`, `_ACHV_BY_BESTIARY_SECTION`, `_ACHV_BY_CATEGORY`, `_indexPush`, `indexAchievement`); `bumpStat` uses the index; `bumpBestiaryCount`/`markBestiarySeen` gained an optional `game` arg and call the new `checkBestiaryAchievements`; new `activeGame`; new `ACHIEVEMENT_CATEGORY_ORDER` (5 new categories); `buildAchievementsPanel` groups via the index, assembles into a `DocumentFragment`, and shows live progress for bestiary predicates |

No other file was touched. `js/data.js` / `js/items.js` (other implementer),
`js/roomTemplates.js`, `js/ui.js`, `js/bestiary.js`, `index.html`, `style.css`
are all unmodified — the panel work turned out not to need any of them.

---

### The declarative vocabulary

An achievement def is a plain object handed to `addAchievement`. There are now
**three** predicate shapes that fire automatically, plus the pre-existing
"event" shape (no predicate → something must call
`unlockAchievement(id, game)` by hand).

#### Shared fields (all achievements, unchanged)

| Field | Meaning |
| --- | --- |
| `id` | unique string, the persistence key in `unlocks.achievements` |
| `name` | display name |
| `icon` | emoji shown in the panel (`❓` until earned) |
| `desc` | one-line description (shown only once earned) |
| `category` | one of `ACHIEVEMENT_CATEGORY_ORDER` — see below |
| reward (pick ≤1) | `classId` \| `itemId` \| `trinketId` \| `familiarId` \| `starId` \| `pickupKind` \| `shopDiscount` |

Reward semantics are untouched: `unlockAchievement` marks the unlock
permanently and, if a run is in progress, also hands the reward to the player
immediately.

#### Predicate A — lifetime stat (pre-existing, unchanged)

`statKey` + `threshold`. Fires from `bumpStat(key, amount, game)` whenever the
running total in `unlocks.stats[statKey]` reaches `threshold`. `statKey` must
already exist in `ensureUnlockShape`'s `statDefaults`.

```js
addAchievement({ id:'apexpredator', name:'Apex Predator', icon:'💀',
  desc:'Defeat 1000 enemies total.', category:'Miscellaneous',
  itemId:'executionersmark', statKey:'enemiesKilled', threshold:1000 });
```

#### Predicate B — bestiary per-id count (NEW)

`bestiarySection` + `bestiaryId` + `threshold`. Fires from
`bumpBestiaryCount(section, id, amount)` once
`unlocks.bestiary[bestiarySection][bestiaryId] >= threshold`.

Valid `bestiarySection` values for this predicate (the counting buckets — do
NOT invent new ones):

| Section | Keyed by | Written from |
| --- | --- | --- |
| `enemyKills` | enemy / boss / superboss id | `combat.js` `handleEnemyDeath` |
| `enemyDeaths` | enemy / boss / superboss id (what killed you) | `entities.js` `takeDamage`, `main.js` gameover |
| `objectsDestroyed` | obstacle `kind` | `combat.js` `damageObstacleHit` / `explodeAt` / `destroyAllObstacles` |

```js
addAchievement({ id:'slayer_cryptslinger_solo', name:'Crypt Culler', icon:'💀',
  desc:'Defeat 25 Cryptslingers.', category:'Slayer',
  bestiarySection:'enemyKills', bestiaryId:'cryptslinger', threshold:25 });
```

`bestiaryId` must match the id the call site actually passes — i.e. an
`ENEMY_TYPES` / `BOSS_TYPES` / `SUPERBOSSES` key for the two enemy sections,
and an obstacle `kind` for `objectsDestroyed`.

#### Predicate C — bestiary distinct breadth (NEW)

`bestiarySection` + `distinctThreshold`, **no** `bestiaryId`, **no**
`threshold`. Means "have N *distinct* entries recorded in that section".
Counted as `Object.keys(bucket).length`. Checked from both writers —
`bumpBestiaryCount` and `markBestiarySeen` (the latter only on the call that
actually flips a new key, since nothing else can move a distinct count).

Works against **any** bestiary bucket — the three counting ones above plus the
seen-flag ones:

| Section | Keyed by | Written from |
| --- | --- | --- |
| `objectsSeen` | obstacle `kind` | `game.js` `enterRoom` |
| `seenItems` | item id | `items.js` `applyItemToPlayer` |
| `seenTrinkets` | trinket id | `items.js` `equipTrinket` |
| `seenFamiliars` | familiar id | `items.js` `addFamiliar` |
| `seenStars` | star id | `combat.js` `grantPickupEffect` `'star'` |
| `seenPills` | pill color id | `combat.js` `grantPickupEffect` `'pill'` |

```js
addAchievement({ id:'collection_items_50', name:'Well Read', icon:'📚',
  desc:'Discover 50 different items.', category:'Collection',
  trinketId:'sometrinket', bestiarySection:'seenItems', distinctThreshold:50 });
```

#### Predicate D — event (pre-existing, unchanged)

No `statKey`, no `bestiarySection`. Something elsewhere must call
`unlockAchievement('id', game)`. Panel shows "Not yet earned." until then.

#### `addTierSet` — ladders in one call (NEW)

```js
addTierSet({
  baseId:  'slayer_cryptslinger',   // → ids 'slayer_cryptslinger_t1', '_t2', '_t3'
  name:    'Crypt Culler',          // string → ' I' / ' II' / ' III' appended
                                    //   (only when tiers.length > 1);
                                    // or a function (threshold, index) => string
  icon:    '💀',                    // ladder-wide default; a tier may override
  category:'Slayer',
  desc:    n => 'Defeat ' + n + ' Cryptslingers.',   // or a plain string
  // exactly one predicate shape, spread across the ladder:
  bestiarySection:'enemyKills', bestiaryId:'cryptslinger',
  tiers: [
    { threshold:10,  itemId:'somepassive' },
    { threshold:50,  trinketId:'sometrinket' },
    { threshold:200, familiarId:'somefamiliar' },
  ],
});
```

Spec fields: `baseId` (required), `name`, `icon`, `category`, `desc`, `tiers`,
plus **one** of:

* `statKey:'meleeKills'` — stat ladder (each tier's `threshold` → `threshold`)
* `bestiarySection` + `bestiaryId` — per-id bestiary ladder (→ `threshold`)
* `bestiarySection` + `distinct:true` — breadth ladder (each tier's `threshold`
  is emitted as `distinctThreshold` instead)

Tier fields: `threshold` (required), optional `name` / `icon` overrides, and
any one reward key from
`itemId, trinketId, familiarId, starId, pickupKind, classId, shopDiscount`
— copied straight onto the def, untouched.

Stat-ladder example:

```js
addTierSet({ baseId:'mastery_crit', name:'Precision', icon:'✴️',
  category:'Mastery', statKey:'critsLanded',
  desc: n => 'Land ' + n + ' critical hits.',
  tiers:[{ threshold:800, itemId:'a' }, { threshold:1200, trinketId:'b' }] });
// → mastery_crit_t1 "Precision I", mastery_crit_t2 "Precision II"
```

Breadth-ladder example:

```js
addTierSet({ baseId:'collection_trinkets', name:'Charm Scholar', icon:'🔩',
  category:'Collection', bestiarySection:'seenTrinkets', distinct:true,
  desc: n => 'Discover ' + n + ' different trinkets.',
  tiers:[{ threshold:25, itemId:'a' }, { threshold:75, familiarId:'b' }] });
```

**Id collision safety.** Ids are `baseId + '_t' + (index+1)`, 1-based on the
tier's position (deliberately not the threshold, so retuning a threshold never
orphans an already-earned unlock). Verified against the existing 354: no
existing id ends in `_t<digits>`, and the generated families (`sb_<boss>_<class>`,
`completionist_<class>`, `donation_<n>`) can't produce that suffix either. Keep
`baseId` category-prefixed (`slayer_`, `mastery_`, …) and collisions are
structurally impossible.

#### Two gotchas for later slices

1. **`threshold` vs `distinctThreshold` are mutually exclusive on a def.** A def
   with `bestiarySection` + `bestiaryId` + `threshold` is indexed as a per-id
   predicate; a def with `bestiarySection` + `distinctThreshold` is indexed as a
   breadth predicate. A def carrying both is indexed as *both* and will unlock on
   whichever fires first — don't do it.
2. **You do not need to touch any call site.** All three predicate kinds ride on
   `bumpStat` / `bumpBestiaryCount` / `markBestiarySeen` calls that already exist
   throughout `combat.js`, `game.js`, `items.js`, `main.js`, `entities.js`.

---

### Performance — the index

`bumpStat` and `bumpBestiaryCount` each linearly scanned all of `ACHIEVEMENTS`
on every call. `bumpBestiaryCount` fires on **every enemy death**, so at 854
achievements that is ~854 iterations per kill, per obstacle destroyed, etc.

Replaced with maps built in one pass right after the definitions:

* `_ACHV_BY_STATKEY` : `statKey` → defs
* `_ACHV_BY_BESTIARY_ID` : `'section/id'` → defs
* `_ACHV_BY_BESTIARY_SECTION` : `section` → breadth defs
* `_ACHV_BY_CATEGORY` : `category` → defs (panel grouping)

`indexAchievement(def)` also populates `ACHIEVEMENTS_BY_ID`, and
`addAchievement` calls it incrementally once `_achvIndexReady` is true — so
achievements declared *after* the index block still index correctly, and the
array and index cannot drift.

Equivalence with the old scan: `_ACHV_BY_STATKEY.get(key)` holds exactly the
defs where `a.statKey === key`, which is precisely the old loop's filter; the
threshold comparison is unchanged and still re-reads `unlocks.stats[key]` from
the same in-memory object. Defs with no `statKey` were never matched before and
are not indexed now. Hot paths are now O(matching achievements) instead of
O(all achievements) — typically 0–3.

`Object.keys(bucket).length` for breadth predicates is computed **only** when
the touched section actually has a breadth achievement, so sections with none
pay a single failed `Map.get`.

**localStorage cadence deliberately untouched** — `loadUnlocks`/`saveUnlocks`
still run once per `bumpStat` / `bumpBestiaryCount` call exactly as before, per
scope. That, not the scan, is now the dominant cost of these functions.

One behavioural addition worth flagging: `bumpBestiaryCount` and
`markBestiarySeen` gained an **optional trailing `game` argument** (all seven
existing call sites are unaffected — they pass fewer args and get `undefined`).
When it's absent, `activeGame()` falls back to `main.js`'s module-level `game`,
wrapped in a try/catch TDZ guard because `achievements.js` loads first. Without
this, a bestiary achievement would unlock and persist correctly but would never
hand its reward over during the run that earned it — unlike every `statKey`
achievement, which always gets a real `game`.

---

### Panel scaling — findings and fix

Read `buildAchievementsPanel` and the filter row. Findings at 854 entries:

* **No quadratic behaviour.** The per-category `ACHIEVEMENTS.filter` was
  `categories × ACHIEVEMENTS` = 10 × 854 ≈ 8.5k comparisons — linear-ish and
  cheap, but pointless repeated work. **Fixed**: uses the pre-grouped
  `_ACHV_BY_CATEGORY` instead.
* **Full DOM rebuild per filter click** — real, but bounded: ~854 rows × ~5
  elements ≈ 4.3k element creations. The row grid was already built detached
  before being appended, which was the big one and was already correct. The
  category `<h3>`s, however, were appended **directly into the live
  `#achievementsList`** between grids, forcing the browser to re-lay-out the
  growing list up to 10 times per build. **Fixed**: the entire panel (headers
  and grids) is now assembled into a single `DocumentFragment` and attached in
  one `appendChild`.
* **Unbounded list** — all 854 rows live in the DOM at once. Left as-is: it is a
  paused full-screen overlay, the rows are simple flex boxes with no images, and
  virtualising would be a redesign. Noted, not fixed.
* **Progress lines** — locked non-`statKey` achievements showed a flat "Not yet
  earned.". With ~500 incoming bestiary achievements that would have been the
  majority of the panel. **Added** the same `n / threshold` live progress line
  for both new predicate kinds, memoising the distinct count per section so a
  breadth section costs one `Object.keys` per panel build rather than one per
  row.

**No visual redesign.** No CSS was touched, no class names changed, no colour
literals added anywhere — the new lines reuse the existing `.achv-desc` class.
`js/ui.js` and `style.css` were not modified at all.

---

### Categories — findings

**They were hardcoded**, in exactly one place: the
`const categories = [...]` array inside `buildAchievementsPanel`.

Checked everywhere else and found nothing to change:

* `index.html`'s `#achievementsFilter` has only `All` / `Unlocked` / `Locked`
  buttons — there is **no** per-category button row anywhere.
* `js/ui.js` has no category list.
* `js/bestiary.js` has its own unrelated group labels (`Enemies` / `Bosses` /
  `Superbosses`) for the bestiary panel, not achievement categories.
* `style.css` styles `.achv-category` generically.

Action taken: lifted the list to a documented module-level
`ACHIEVEMENT_CATEGORY_ORDER` and registered the five new categories in display
order:

```
Characters, Superbosses, Completionist,
Slayer, Mastery, Exploration, Collection, Challenge,
Donations, Miscellaneous
```

The five new ones sit between the character/boss progression block and the
Donations/Miscellaneous tail. They are **empty today and render nothing** — the
panel already `continue`s past any category with no rows to show, so the panel
is pixel-identical until a later slice populates them.

Also hardened: the panel now appends any category found in the index but *not*
in the order list, after the listed ones. Previously a typo'd `category:` string
would have made an achievement silently invisible in the panel forever while
still being earnable — a nasty failure mode with 500 new declarations incoming.
For the current 354 (all of which use the original five) this changes nothing.

---

### Verification performed

* Full re-read of every edited region.
* Bracket/brace/paren balance over the whole of `js/achievements.js` with a
  string- and comment-aware scanner: **balanced**.
* Grepped all achievement id literals for the `_t<digits>` suffix `addTierSet`
  generates: **zero matches**, so no tier-set id can collide with an existing one.
* Traced the index against the old linear scans by hand and confirmed set
  equivalence for `statKey` (see above).
* Confirmed the superboss reward pool loop (165/165, strictly-incrementing
  `_rewardIndex`, no modulo) was not touched.

### NOT VERIFIED

* **JS syntax is unverified.** There is no JS runtime on this machine (no node,
  bun, or deno). Nothing was parsed by an actual JS engine. Bracket balance is
  not a parse.
* **Nothing was executed.** The game was never loaded, no page was opened, no
  script ran.
* **No achievement was actually fired.** No `bumpStat`, `bumpBestiaryCount`, or
  `markBestiarySeen` call was ever made; the new predicates and the index have
  never evaluated against real data.
* **`addTierSet` has never been called** — it is declared and documented but has
  zero call sites in this slice by design, so its output shape is reasoned-about,
  not observed.
* **The panel was never rendered.** The `DocumentFragment` change, the new
  progress lines, and the category ordering were not seen on screen.
* Per the standing user constraint, no smoke testing, test scripts, or
  verification harnesses were written or run.

---

## Slice 2 — Slayer

Populates the first of the five new categories. **Adds 254 achievements.**
Count before: 354. Count after: **608**. (Running total for the next slice's
author: 608 declared, 246 still to go against the 854 target.)

### Files changed

| File | Change |
| --- | --- |
| `js/achievements.js` | One new commented block of 254 `addAchievement` calls (220 regular enemies + 34 bosses), inserted after the last pre-existing declaration and before the lookup-index block. Nothing else in the file was touched. |

No other file was touched at all. `js/enemies.js` was read to derive the id list
but not modified. No call site was changed — per Slice 1's gotcha #2, Predicate B
rides on the `bumpBestiaryCount('enemyKills', id, 1)` call that `combat.js`
`handleEnemyDeath` already makes.

---

### What was added

One Predicate B achievement per killable **non-superboss** id, using
`bestiarySection:'enemyKills'` + `bestiaryId` + `threshold`, all
`category:'Slayer'`.

| Group | Source table | Count | Id form | Icon | Threshold |
| --- | --- | --- | --- | --- | --- |
| Regular enemies | `ENEMY_TYPES` | 220 | `slayer_<enemyId>` | 💀 | 20 |
| Bosses | `BOSS_TYPES` | 34 | `slayer_boss_<bossId>` | 👹 | 5 |

**Superbosses are deliberately excluded.** All 11 `SUPERBOSSES` ids already have
full coverage via the `sb_<boss>_<class>` family and the `Superbosses` /
`Completionist` categories; a Slayer entry for them would be redundant.

**No rewards.** Not one of the 254 carries `classId` / `itemId` / `trinketId` /
`familiarId` / `starId` / `pickupKind` / `shopDiscount`. Per the approved reward
policy the high-volume Slayer tail is a pure trophy case — 254 rewards would
have swamped the item pool. Asserted by the validator, not just intended.

**No `addTierSet`.** Slayer here is single-threshold by design, not an oversight.
The ladder machinery from Slice 1 still has zero call sites.

### The formulas — all mechanical, none hand-tuned

* **id** — `'slayer_' + enemyId` / `'slayer_boss_' + bossId`.
* **name** — `entry.name`, with `'DNB '` removed wherever it appears and a
  leading `'The '` stripped, then `' Hunter'` appended. Uniform across all 254.
  `'DNB Grave Grub'` → `Grave Grub Hunter`; `'The Bone Sentinel'` →
  `Bone Sentinel Hunter`; `'Grung, the DNB Warlord'` → `Grung, the Warlord Hunter`.
  All 254 resulting names are unique (checked).
* **desc** — uses `entry.name` **verbatim**, so pluralization never arises:
  * enemies: `'Defeat 20 of the ' + name + '.'`
  * bosses: `'Defeat ' + name + ' 5 times.'`

#### One deviation from the plan, and why

The plan specified `'Defeat 5 of the ' + name + '.'` for bosses on the premise
that boss names carry the `'DNB '` prefix like enemy names do. **They do not** —
all 34 are proper nouns (`'The Bone Sentinel'`, `'Grung, the DNB Warlord'`,
`'Skrell, the DNB Bonecaller'`). The planned phrasing would have produced
*"Defeat 5 of the The Bone Sentinel."* for 20 of the 34. Boss descs therefore use
`'Defeat <name> 5 times.'`, which still uses the name verbatim and still sidesteps
pluralization entirely — the plan's two stated reasons for the fixed phrasing are
both preserved. Enemy descs use the planned phrasing unchanged. Every id,
threshold, category, icon and the no-reward rule are exactly as specified.

### Pre-existing data quirk worth flagging (not introduced here, not fixed here)

**`bonecaller` is a key in BOTH `ENEMY_TYPES`** (`'DNB Bone Caller'`, an enemy)
**and `BOSS_TYPES`** (`'Skrell, the DNB Bonecaller'`, a stage-0 boss). Both write
to the same `unlocks.bestiary.enemyKills.bonecaller` counter, because that bucket
is keyed by raw id with no enemy/boss namespacing.

Consequence: `slayer_bonecaller` (threshold 20) and `slayer_boss_bonecaller`
(threshold 5) are distinct achievement ids with no collision, but they watch the
**same** counter — so killing 5 regular Bone Callers will unlock the boss one, and
boss kills count toward the enemy one. This is inherent to the existing bestiary
key scheme, predates this slice, and cannot be fixed from `js/achievements.js`
alone (it would need either a namespaced `bestiaryId` at the `combat.js` call site
or a renamed table key — both out of scope here). Flagged for whoever owns that
decision. It is the only such overlap: all other 253 ids resolve to exactly one
table.

---

### Verification performed

* `node --check js/achievements.js` — **passes** (run after the edit, and again
  as the final action). Unlike Slice 1, a real JS engine parsed this file.
* The 254 declarations were **generated from the source tables**, not hand-typed —
  the id list was extracted by evaluating `js/enemies.js` itself, so a typo'd or
  skipped id is not a possible failure mode here.
* A throwaway Node validator (written to the scratchpad, **not committed**) loads
  `js/data.js` + `js/enemies.js` + `js/achievements.js` into one shared `vm`
  context with minimal `document`/`localStorage` stubs, and asserts **28 checks —
  all passing**:
  * source tables are 220 / 34 / 11 as expected;
  * exactly 254 `category:'Slayer'` defs, split 220 regular / 34 boss;
  * totals: 354 pre-existing untouched + 254 new = 608;
  * every achievement id in the whole file is unique; no pre-existing id begins
    with `slayer_`; no new id ends in the `_t<digits>` suffix `addTierSet` mints;
  * every regular id resolves to an `ENEMY_TYPES` key and every boss id to a
    `BOSS_TYPES` key, **and** every key in each table got exactly one entry —
    both directions, so nothing is skipped or duplicated;
  * no superboss received an entry;
  * predicate shape: all use `enemyKills`, all carry a `bestiaryId`, none carries
    `distinctThreshold` (Slice 1 gotcha #1) or a `statKey`;
  * thresholds are exactly 20 / 5 with no per-entry tuning; icons are 💀 / 👹;
  * all 254 display names are non-empty and unique; every desc contains its
    source `entry.name` verbatim;
  * **no entry carries any of the seven reward keys**;
  * Slice 1's index picked them all up: present in `ACHIEVEMENTS_BY_ID`, 254 under
    `_ACHV_BY_CATEGORY.get('Slayer')`, and each indexed under
    `_ACHV_BY_BESTIARY_ID` at `enemyKills/<id>`; `'Slayer'` is in
    `ACHIEVEMENT_CATEGORY_ORDER`.
* Visual read of the block's head, tail, and both comment headers in context.

### NOT VERIFIED

* **Nothing was rendered.** The achievements panel was never opened or drawn. The
  254 new rows — and what a category of 254 does to the panel's length and to the
  full-rebuild-per-filter-click cost Slice 1 measured — have not been seen.
  Slice 1's "unbounded list" note now has real weight behind it: this category
  alone is ~72% of the panel.
* **No achievement was fired.** No `bumpBestiaryCount` call was made; not one of
  these 254 predicates has ever evaluated against real data. Their unlocking is
  reasoned-about, not observed.
* **The game was never launched or played.** Static content only, per the task.
* **`combat.js`'s `handleEnemyDeath` was not re-read** to re-confirm it passes the
  raw `ENEMY_TYPES`/`BOSS_TYPES` key as the `enemyKills` id; that is taken from
  Slice 1's documented Predicate B table. If it ever passed something else (a
  resolved alias, say — note `LEGACY_ENEMY_ALIASES` exists in `js/enemies.js`),
  the affected `bestiaryId`s would silently never fire.
* **Reward-policy consistency across the remaining four categories is unconfirmed**
  — this slice only guarantees Slayer is reward-free.
* Per the standing user constraint, no smoke testing or gameplay verification was
  performed; the validator is a structural/declaration check only.

---

## Slice 3 — Mastery

Populates the second of the five new categories. **Adds 45 achievements**
(15 three-rung ladders). Count before: 608. Count after: **653**. (Running
total for the next slice's author: 653 declared, 201 still to go against the
854 target.)

### Files changed

| File | Change |
| --- | --- |
| `js/achievements.js` | One new commented block of 15 `addTierSet` calls, inserted after Slice 2's Slayer block and before the lookup-index block. Nothing else in the file was touched. |

No other file was touched at all. `js/data.js` was read (via the validator) to
resolve reward ids but not modified. No call site was changed and **no new stat
key was added** — per Slice 1's gotcha #2, Predicate A rides on `bumpStat` calls
that already exist throughout `combat.js` / `game.js` / `items.js` / `main.js`.

**First real call sites for `addTierSet`.** Slice 1 shipped the ladder machinery
with zero callers and Slice 2 added none; this slice is the first to exercise it.
Its output shape is now observed, not just reasoned-about (the validator reads
the generated defs out of `ACHIEVEMENTS`).

---

### What was added

15 ladders × 3 tiers, all `category:'Mastery'`, all Predicate A
(`statKey` + `threshold`). Names get ` I` / ` II` / ` III` appended automatically
by `addTierSet` (`tiers.length > 1`); ids come out as `<baseId>_t1/_t2/_t3`.

| statKey | baseId | Name | Icon | Thresholds | Tier-3 reward |
| --- | --- | --- | --- | --- | --- |
| `meleeKills` | `mastery_meleekills` | Hoof to Hoof | 🗡️ | 150 / 600 / 1500 | `itemId:'hardhitter'` |
| `rangedKills` | `mastery_rangedkills` | Long Shot | 🏹 | 150 / 600 / 1500 | `itemId:'quickdraw'` |
| `critsLanded` | `mastery_critslanded` | Precision | ✴️ | 75 / 400 / 1200 | `trinketId:'silvermirror'` |
| `bombsPlaced` | `mastery_bombsplaced` | Demolition Habit | 💣 | 75 / 300 / 900 | `itemId:'bombsatchel'` |
| `shotsFired` | `mastery_shotsfired` | Trigger Discipline | 🔫 | 750 / 3000 / 10000 | `trinketId:'stormprism'` |
| `obstaclesDestroyed` | `mastery_obstaclesdestroyed` | Wrecking Crew | 🪨 | 100 / 400 / 1200 | `itemId:'bouldershoulder'` |
| `enemiesFrozen` | `mastery_enemiesfrozen` | Deep Freeze | ❄️ | 25 / 100 / 300 | `itemId:'frostbite'` |
| `turretsDestroyed` | `mastery_turretsdestroyed` | Sentry Breaker | 🛠️ | 15 / 75 / 250 | `trinketId:'fadedgauntlet'` |
| `bombBarrelsDetonated` | `mastery_bombbarrels` | Chain Reaction | 🛢️ | 15 / 75 / 250 | `trinketId:'emberbauble'` |
| `swarmerdnbKilled` | `mastery_swarmerdnb` | Swarm Control | 🐝 | 40 / 200 / 700 | `trinketId:'wildcrown'` |
| `activeItemUses` | `mastery_activeitemuses` | Button Masher | 🔋 | 75 / 300 / 900 | `itemId:'chronoshard'` |
| `itemsCollected` | `mastery_itemscollected` | Packrat | 🎒 | 40 / 150 / 450 | `itemId:'junkyardmagnet'` |
| `trinketsEquipped` | `mastery_trinketsequipped` | Charm Collector | 🔩 | 8 / 30 / 90 | `trinketId:'crackedlocket'` |
| `familiarsCollected` | `mastery_familiarscollected` | Menagerie | 🐾 | 8 / 25 / 70 | `familiarId:'goldenhare'` |
| `roomsCleared` | `mastery_roomscleared` | Room Sweeper | 🚪 | 150 / 500 / 1500 | `itemId:'swiftstep'` |

Reward split: 8 items, 6 trinkets, 1 familiar.

### The 15 stat keys, and why these

All 15 were confirmed present in `ensureUnlockShape`'s `statDefaults` before use
(asserted by the validator against the live object, not just read by eye), and
all are additive counters already written by existing `bumpStat` call sites.

Deliberately **excluded**, per the approved plan:

* `donationTotal` — has its own `Donations` category (20 achievements already).
* `deaths` / `wins` — outcome stats, not mastery of a mechanic.
* `deepestFloor` / `fastestWinSeconds` — "best of" records written by
  `setStatMax` / `setStatMin`, not monotonic counters; `fastestWinSeconds` is
  *decreasing* and starts `null`, so a `>=` threshold ladder is the wrong shape
  for it entirely.
* Room-visit-flavoured keys (`petshopsVisited`, `curseRoomsVisited`,
  `vaultsOpened`, `challengeRoomsCompleted`, `crystalRoomsVisited`,
  `sombraDealsTaken`, `sacrificeSpikesTriggered`) — **reserved for the
  Exploration slice**, not claimed here.

Also unclaimed and still available to later slices: `secretRoomsFound`,
`chestsOpened`, `rocksBombed`, `coinsSpent`, `coinsCollected`,
`cursedChestsOpened`, `goldChestsOpened`, `stoneChestsOpened`, `shopPurchases`,
`enemiesKilled`, `bossesKilled`, `pillsUsed`, `keysUsed`, `starsUsed`,
`runsStarted`, `totalPlaytime`.

### Threshold calibration — anchored, not invented

Every one of the 15 keys already had at least one pre-existing single-shot
achievement on it, so no ladder was authored from nothing. The existing
thresholds per key were extracted from the file first and used as the anchor
band; the rule applied uniformly was:

* **tier 1** at or just below the *lowest* existing threshold on that key, so a
  ladder always has a rung a new player can actually reach;
* **tier 2** mid-to-top of the existing spread;
* **tier 3** clearly past everything that already exists on that key.

Worked examples:

| Key | Pre-existing thresholds | Ladder | Note |
| --- | --- | --- | --- |
| `critsLanded` | 50, 100, 200, 300, 450, 650 | 75 / 400 / 1200 | tier 3 ≈ 1.8× the old ceiling |
| `shotsFired` | 1000, 1500, 2500, 4000 | 750 / 3000 / 10000 | naturally the biggest numbers of the 15 |
| `turretsDestroyed` | 20, 60, 100, 150 | 15 / 75 / 250 | naturally the smallest, alongside barrels |
| `trinketsEquipped` | 10, 25, 50 | 8 / 30 / 90 | |
| `enemiesFrozen` | 30 (the Windigo unlock) | 25 / 100 / 300 | thinnest anchor — a single existing point |

Spacing lands around 1× / 4× / 10× rather than a fixed multiplier, because the
anchor bands differ in shape per key. `enemiesFrozen` is the weakest-anchored
ladder: its only reference point is `unlock_windigo` at 30, so tiers 2 and 3
were set by comparison with the similarly-paced `turretsDestroyed` /
`bombBarrelsDetonated` bands rather than by extrapolating a single point.

### Reward selection — and the double-claim trap that actually bit

Tiers 1 and 2 carry **no reward field at all** (bare `{ threshold:n }`), so the
grind rungs are trophies; only tier 3 grants anything, exactly one reward each.
45 achievements therefore add 15 rewards to the pool, not 45.

The first pass built the "already claimed" set by **grepping the file** for
`itemId:'…'` / `trinketId:'…'` / `familiarId:'…'` literals. **That was wrong,
and the validator caught it**: the 165 superboss achievements draw their rewards
from a *generated* pool — a loop over a reward array with a strictly-incrementing
`_rewardIndex` — so their reward ids never appear as `trinketId:'…'` literals
anywhere in the file and are invisible to grep. Six of the first-pass trinket
picks (`precisionring`, `rapidprimer`, `stonefist`, `powderhorn`, `jaggedtooth`,
`charmedlocket`) were already spoken for by `sb_israel_griffin`,
`sb_lilac_dragon`, `sb_pineapple_griffin`, `sb_nhm_unicorn`, `sb_pineapple_kirin`
and `sb_algae_earth` respectively. All six were swapped for ids from the
recomputed pool.

**Lesson for later slices: build the claimed-id set from the runtime
`ACHIEVEMENTS` array, never from a text grep.** Grepping under-reports by ~165
ids and every one of the misses would silently violate Slice 1's documented
"every superboss reward is exclusive" invariant. The truly-free pools after this
slice's 15 picks are **219 items / 44 trinkets / 49 familiars** — trinkets are by
far the scarcest and the next slice should plan around that.

No new item, trinket, or familiar was authored; every reward is an existing
`js/data.js` table entry. Thematic fit was pursued where obvious
(`frostbite` for `enemiesFrozen`, `bombsatchel` for `bombsPlaced`,
`goldenhare` for `familiarsCollected`) and not forced where the free pool had no
good match — plain reuse, per the existing project convention.

---

### Verification performed

* `node --check js/achievements.js` — **passes** (run after the edit, after the
  reward swap, and again as the final action).
* A throwaway Node validator (written to the scratchpad, **not committed**) loads
  `js/data.js` + `js/enemies.js` + `js/achievements.js` into one shared `vm`
  context with minimal `document`/`localStorage` stubs — same approach as Slice 2
  — and asserts **31 checks, all passing**:
  * totals: 45 Mastery defs, 608 pre-existing untouched, 653 overall;
  * ladder shape: every Mastery id matches `<baseId>_t<n>`, exactly 15 ladders,
    every ladder has tiers 1/2/3 present, every `baseId` is `mastery_`-prefixed;
  * collisions: all 653 ids in the whole file unique, no Mastery id or `baseId`
    collides with any pre-existing id, all 45 landed in `ACHIEVEMENTS_BY_ID`;
  * predicate: every `statKey` is one of the 15 approved keys, all 15 covered,
    each ladder uses one key across its three tiers, all 15 keys really exist in
    a live `ensureUnlockShape({}).stats`, no `bestiarySection` / `bestiaryId` /
    `distinctThreshold` anywhere (Slice 1 gotcha #1), every tier has a numeric
    `threshold`;
  * thresholds strictly increasing within every ladder;
  * rewards: tiers 1 and 2 carry **none** of the seven reward keys, tier 3
    carries **exactly one**, it is an `itemId`/`trinketId`/`familiarId`, the id
    exists in the corresponding `ITEMS`/`TRINKETS`/`FAMILIAR_TYPES` table, the 15
    are distinct from each other, and **no tier-3 reward id is used by any other
    achievement in the file** — counted over the runtime `ACHIEVEMENTS` array, so
    generated rewards are included (this is the check that caught the six
    superboss collisions);
  * naming: ` I` / ` II` / ` III` suffixes present per tier, all 45 names unique,
    every `desc` is a string containing its own threshold, every tier has an icon,
    `'Mastery'` is in `ACHIEVEMENT_CATEGORY_ORDER`.
* Visual read of the block header and the first three ladders in context.

### NOT VERIFIED

* **Nothing was rendered.** The achievements panel was never opened or drawn.
  The 45 new rows have not been seen, and the Mastery category's effect on the
  panel's length (now ~7% of a 653-row list) is unobserved. Slice 2's note about
  the panel's full-rebuild-per-filter-click cost still stands and grows.
* **No ladder has ever fired.** No `bumpStat` call was made; not one of these 45
  predicates has ever evaluated against real data. Tier progression, the reward
  hand-off on tier 3, and the panel's `n / threshold` progress line for these
  defs are all reasoned-about, not observed.
* **The `bumpStat` call sites were not re-read.** That all 15 keys are actually
  incremented in play (and at what rate) is taken from `statDefaults`' comments
  and from the fact that pre-existing achievements already watch each key —
  not from re-tracing `combat.js` / `game.js` / `items.js`. If any key is dead
  or rarely bumped, its ladder would be unreachable in practice, and the
  thresholds' *feel* is unvalidated regardless: no playtesting was done, so
  whether 10000 `shotsFired` is a satisfying grind or a wall is unknown.
* **Reward suitability is unverified.** The 15 reward ids were checked to exist
  and to be unclaimed; their power level, whether any is a "trap"/downside item,
  and whether granting them mid-run behaves sensibly were not examined.
* **The game was never launched or played.** Static content only, per the task.
* Per the standing user constraint, no smoke testing or gameplay verification was
  performed; the validator is a structural/declaration check only.

---

## Slice 4 — Exploration

Populates the third of the five new categories. **Adds 39 achievements**
(15 single-shot + 8 three-rung ladders). Count before: 653. Count after:
**692**. (Running total for the next slice's author: 692 declared, 162 still
to go against the 854 target.)

### Files changed

| File | Change |
| --- | --- |
| `js/achievements.js` | One new commented block — 15 `addAchievement` calls + 8 `addTierSet` calls — inserted after Slice 3's Mastery block and before the lookup-index block. Nothing else in the file was touched. |

No other file was touched at all. `js/data.js` (for `OBSTACLES` and the reward
tables) and `js/game.js` / `js/main.js` (to confirm the `bumpStat` write paths)
were read but not modified. No call site was changed, **no new stat key and no
new bestiary bucket were added** — per Slice 1's gotcha #2 every predicate here
rides on `bumpStat` / `bumpBestiaryCount` / `markBestiarySeen` calls that
already exist.

First slice to use **Predicate C** (`distinct:true` breadth ladders). Slices 1–3
declared none, so its output shape is now observed rather than reasoned-about.

---

### What was added — four buckets

#### A. 15 per-obstacle-kind destruction achievements (Predicate B, no rewards)

One `addAchievement` per obstacle kind, id `exploration_destroy_<kind>`, icon 💥,
`bestiarySection:'objectsDestroyed'`, `threshold:15` flat.

`rock`, `tallrock`, `yellowfire`, `redfire`, `spikedrock`, `tintedrock`,
`turretn`, `turrete`, `turrets`, `turretw`, `turretplus`, `turretx`,
`turrettarget`, `bombbarrel`, `pushablebombbarrel`

**`OBSTACLES` has 24 kinds; only these 15 can ever reach the
`objectsDestroyed` bucket.** They are exactly the entries carrying
`destructible:true` (bombable — the rocks and all 7 turrets) or
`attackable:true` (shootable — the two fires and the two bomb barrels). The
validator derives that set live from `OBSTACLES` and asserts it equals the 15
declared, so the list cannot silently drift if `js/data.js` changes. The other
9 — `hardrock`, `pit`, `tallhardrock`, `cactus`, `spike`, `spiketrap`,
`movingspike`, `sandtrap`, `mud` — are permanent structures or purely-walkable
hazards that nothing ever destroys; an achievement on any of them would be
permanently unearnable, the same silent-dead-achievement failure mode described
under bucket D below.

Threshold is a flat 15 with no per-kind tuning, including for the turrets
(pre-existing `turretsDestroyed` achievements already run to 150 lifetime
turrets, so 15 of any *single* variant is comfortably inside the existing band).
**No rewards on any of the 15**, mirroring Slice 2's high-volume-tail policy.

Descs use the `OBSTACLES[kind].name` wording, lightly naturalised: fires are
"Douse 15 Yellow Fires." (the game's own verb for them — 3 hits douses a flame)
and the turret names are re-ordered from `Turret — North` to "North Turrets" so
the sentence reads.

#### B. 3 bestiary-breadth ladders (Predicate C — `bestiarySection` + `distinct:true`)

| baseId | Name | Icon | Section | Tiers | Tier-3 reward |
| --- | --- | --- | --- | --- | --- |
| `exploration_objectsseen` | Cartographer | 🗺️ | `objectsSeen` | 8 / 16 / 24 | `itemId:'starlitcompass'` |
| `exploration_fieldguide` | Field Guide | 📖 | `enemyKills` | 80 / 180 / 265 | `itemId:'allseeingeye'` |
| `exploration_causeofdeath` | Cause of Death | ☠️ | `enemyDeaths` | 10 / 30 / 60 | `itemId:'secondwind'` |

`objectsSeen` maxes at 24 (the whole `OBSTACLES` table), so tier 3 is a genuine
completion rung. The two enemy sections share one 265-id space (220
`ENEMY_TYPES` + 34 `BOSS_TYPES` + 11 `SUPERBOSSES`): the kill ladder goes the
full distance, the death ladder deliberately stops at 60 — being killed by 265
different things is not a realistic ask, and a top rung nobody reaches is worse
than no rung.

Note `enemyKills` is now watched by both Slice 2's 254 per-id defs and this
breadth ladder; Slice 1's index handles that (per-id defs live under
`_ACHV_BY_BESTIARY_ID`, breadth defs under `_ACHV_BY_BESTIARY_SECTION`), and no
def carries both `threshold` and `distinctThreshold` (gotcha #1, asserted).

#### C. 3 room-type visit ladders (Predicate A)

| baseId | Name | Icon | statKey | Tiers | Tier-3 reward |
| --- | --- | --- | --- | --- | --- |
| `exploration_petshops` | Pet Shop Regular | 🐾 | `petshopsVisited` | 5 / 30 / 100 | `familiarId:'goldenfirefly'` |
| `exploration_curserooms` | Curse Seeker | 😈 | `curseRoomsVisited` | 5 / 30 / 100 | `itemId:'cursedhalo'` |
| `exploration_crystalrooms` | Crystal Pilgrim | 💎 | `crystalRoomsVisited` | 5 / 25 / 75 | `itemId:'prismveil'` |

All three are bumped from `js/game.js`'s `enterRoom` (lines ~151–153).

#### D. 2 dedication ladders (Predicate A)

| baseId | Name | Icon | statKey | Tiers | Tier-3 reward |
| --- | --- | --- | --- | --- | --- |
| `exploration_playtime` | Long Haul | ⏳ | `totalPlaytime` | 3600 / 18000 / 72000 | `itemId:'brokenwatch'` |
| `exploration_runsstarted` | Again and Again | 🔁 | `runsStarted` | 25 / 100 / 300 | `itemId:'ironwill'` |

`totalPlaytime` is in **seconds** (`js/main.js` bumps it with
`Math.round(game.runElapsed)` on both death and win), so the three rungs are
1 / 5 / 20 hours. The desc renders them that way — `n / 3600` with a
singular/plural guard — rather than showing a raw second count. `runsStarted` is
bumped once per run in `js/game.js`.

---

### Exclusions — two real findings, not footnotes

**1. `deepestFloor` and `fastestWinSeconds` are structurally unearnable as
achievement predicates.** Both are the most obvious-looking Exploration stats in
`statDefaults`, and both are written *exclusively* by `setStatMax` /
`setStatMin` (`js/game.js:102`, `js/main.js:313`). Reading `js/achievements.js`:
only `bumpStat` consults `_ACHV_BY_STATKEY` and calls `unlockAchievement`;
`setStatMax` and `setStatMin` do **neither**. A `statKey:'deepestFloor'`
achievement would therefore sit at 0% forever no matter how deep the player got
— a silent dead achievement, indistinguishable in the panel from one that is
merely hard. Slice 3 excluded both for a different (also valid) reason — that
they are "best of" records, and `fastestWinSeconds` is *decreasing* and starts
`null`, so `>=` is the wrong comparison entirely. Either reason is sufficient;
the write-path one is the harder blocker. **Rule for later slices: before using
any `statKey`, grep where it is written and confirm the writer is `bumpStat`.**
An in-code `NOTE` to this effect sits above bucket D.

**2. The plan's premise about the room-type keys was wrong in both directions,
and the outcome was kept anyway.** The dispatch stated that `petshopsVisited` /
`curseRoomsVisited` / `crystalRoomsVisited` have **zero** existing achievements
while `sacrificeSpikesTriggered` / `vaultsOpened` / `challengeRoomsCompleted` /
`sombraDealsTaken` already have a **2-tier** pair each. Grepping `statKey:` in
`js/achievements.js` shows that neither half holds: **all seven** keys already
carry **four** single-shot `Miscellaneous` achievements each.

| statKey | Pre-existing thresholds | This slice |
| --- | --- | --- |
| `petshopsVisited` | 5, 20, 35, 60 | 5 / 30 / 100 |
| `curseRoomsVisited` | 5, 20, 35, 60 | 5 / 30 / 100 |
| `crystalRoomsVisited` | 5, 15, 25, 40 | 5 / 25 / 75 |
| `sacrificeSpikesTriggered` | 20, 60, 100, 150 | *(excluded by plan)* |
| `vaultsOpened` | 3, 10, 20, 35 | *(excluded by plan)* |
| `challengeRoomsCompleted` | 3, 10, 20, 35 | *(excluded by plan)* |
| `sombraDealsTaken` | 5, 15, 25, 40 | *(excluded by plan)* |

The plan's *directive* (use exactly these three keys, touch none of the other
four) was followed unchanged — it is a coherent scoping decision on its own, it
keeps the slice at the approved 39, and re-scoping on an implementer's own
authority is not this role's call. But the *stated rationale* ("gap-fill vs.
redundant clutter") does not distinguish the two groups: all seven are equally
covered today, so all seven ladders would have been equally additive, or equally
redundant. Whoever plans Slices 5–6 should decide deliberately whether the other
four keys deserve ladders too, rather than inheriting this split as settled.

Because the three chosen keys turned out to be *already covered*, thresholds
were calibrated with Slice 3's anchoring rule instead of the plan's suggested
flat 5 / 15 / 30 — which would have put every rung at or below existing
achievements on the same key and made the whole ladder unlock retroactively for
any established player. Tier 1 sits on the lowest existing rung, tier 2
mid-band, tier 3 at ~1.7–1.9× the existing ceiling.

Stat keys still unclaimed after this slice: `secretRoomsFound`, `chestsOpened`,
`rocksBombed`, `coinsSpent`, `coinsCollected`, `cursedChestsOpened`,
`goldChestsOpened`, `stoneChestsOpened`, `shopPurchases`, `pillsUsed`,
`keysUsed`, `starsUsed`, plus the four excluded room keys above.

---

### Reward selection — no double-claims, checked the right way

8 ladders → **8 rewards** (tier 3 only; tiers 1 and 2 are bare
`{ threshold:n }`). Bucket A's 15 grant nothing, so 39 achievements consume 8
reward ids.

Slice 3's lesson was applied **from the first pass**: the already-claimed set was
built by loading `js/data.js` + `js/enemies.js` + `js/achievements.js` into one
`vm` context and reading reward fields off the **runtime `ACHIEVEMENTS` array**,
never from a text grep. That is the only way to see the ~165 superboss rewards,
which are drawn from a generated pool via an incrementing `_rewardIndex` and
appear nowhere as `itemId:'…'` literals. The pre-pick free pools came out at
**219 items / 44 trinkets / 49 familiars**, matching Slice 3's reported figures
exactly — an independent confirmation that both slices computed the same set.
**Zero collisions had to be fixed this time.**

Per the dispatch, **no trinket was spent** — 7 items and 1 familiar. Trinkets
are the scarce pool and stay at 44 for Slices 5–6. Free pools after this slice:
**212 items / 44 trinkets / 48 familiars**.

Thematic fit was taken where the free pool offered it (`starlitcompass` for the
obstacle-atlas ladder, `allseeingeye` for bestiary completion, `secondwind` for
the death ladder, `goldenfirefly` — a familiar — for the Pet Shop ladder,
`cursedhalo` for cursed rooms, `prismveil` for crystal rooms, `brokenwatch` for
playtime, `ironwill` for run count). No new item, trinket, or familiar was
authored.

---

### Verification performed

* `node --check js/achievements.js` — **passes** (run after the edit and again
  as the final action).
* A throwaway Node validator (written to the scratchpad, **not committed**)
  concatenates `js/data.js` + `js/enemies.js` + `js/achievements.js` into one
  `vm` script with minimal `document`/`localStorage` stubs — same approach as
  Slices 2–3 — and asserts **130 checks, all passing**:
  * totals: 39 Exploration defs, 653 pre-existing untouched, **692** overall;
    `'Exploration'` is in `ACHIEVEMENT_CATEGORY_ORDER` and the index groups all
    39 under it;
  * bucket A: exactly 15, all `objectsDestroyed`, all `threshold:15`, all icon
    💥, id form `exploration_destroy_<bestiaryId>`, the `bestiaryId` set equals
    the approved 15 **and** equals the live `destructible||attackable` subset of
    `OBSTACLES` (24 kinds total), no `distinctThreshold`/`statKey` on any
    (gotcha #1), and **none of the seven reward keys on any of the 15**;
  * ladders: 24 defs → exactly 8 ladders, every `baseId` `exploration_`-prefixed,
    every ladder complete at tiers 1/2/3, baseIds exactly the 8 planned;
  * predicate shape per bucket: the 3 B ladders carry the right
    `bestiarySection` + a numeric `distinctThreshold` and **no**
    `bestiaryId`/`threshold`/`statKey`; the 5 C/D ladders carry the right
    `statKey` + numeric `threshold` and **no** bestiary fields at all;
  * every C/D `statKey` really exists in a live `ensureUnlockShape({}).stats`;
  * **no def uses `deepestFloor` or `fastestWinSeconds`**, and none uses any of
    the four excluded room keys;
  * thresholds strictly increasing within all 8 ladders;
  * naming: ` I`/` II`/` III` suffixes per tier, all 39 new names unique, all
    692 names unique file-wide, every def has a non-empty string `desc` and an
    icon;
  * collisions: all **692** ids unique, all 39 present in `ACHIEVEMENTS_BY_ID`;
  * rewards: tiers 1 and 2 carry **none** of the seven reward keys, tier 3
    carries **exactly one**, it is an `itemId`/`familiarId`, the id resolves in
    `ITEMS`/`FAMILIAR_TYPES`, the 8 are distinct from each other, **no reward id
    is used by any other achievement in the runtime array** (so the generated
    superboss pool is included in the comparison), and **zero trinkets** were
    spent.
* Visual read of the inserted block in context, and of the `OBSTACLES` table and
  the `bumpStat` call sites for all five stat keys used.

### NOT VERIFIED

* **Nothing was rendered.** The achievements panel was never opened or drawn.
  The 39 new rows have not been seen, and the panel is now 692 rows on a full
  rebuild per filter click — Slice 1's "unbounded list" note and Slice 2's
  rebuild-cost note both still stand and keep growing.
* **No predicate has ever fired.** No `bumpStat`, `bumpBestiaryCount`, or
  `markBestiarySeen` call was made. In particular **Predicate C has still never
  been evaluated against real data** — this slice is its first caller, and its
  `Object.keys(bucket).length` counting, its firing from `markBestiarySeen`, and
  the panel's distinct-progress line are reasoned-about, not observed.
* **The `objectsSeen` writer was not re-traced.** That `js/game.js`'s
  `enterRoom` calls `markBestiarySeen('objectsSeen', kind)` for **every** kind
  present in a room — and not, say, only for a subset — is taken from Slice 1's
  documented Predicate C table. If any of the 24 kinds is never recorded, the
  Cartographer tier-3 rung (24 distinct) becomes unreachable. Likewise, whether
  all 24 kinds actually appear in generated rooms at all was not checked against
  `js/room.js` / `js/roomTemplates.js`.
* **`combat.js`'s obstacle-destruction path was not re-read** to confirm it
  passes the raw `OBSTACLES` key as the `objectsDestroyed` id (Slice 2 flagged
  the same gap for `enemyKills`). If it passed a normalised or grouped kind, the
  affected bucket-A defs would silently never fire.
* **Threshold feel is unvalidated.** No playtesting was done. Whether 20 hours of
  `totalPlaytime`, 265 distinct kills, or 100 Pet Shop visits are satisfying or
  walls is unknown; the C ladders' tier 1 at 5 will unlock instantly and
  retroactively for any player who already holds the existing 5-visit
  achievement on the same key, which is intended (Slice 3's rule) but unseen.
* **Reward suitability is unverified.** The 8 ids were checked to exist and to be
  unclaimed; their power level, whether any is a downside/"trap" item, and
  whether granting them mid-run behaves sensibly were not examined.
* **The game was never launched or played.** Static content only, per the task.
* Per the standing user constraint, no smoke testing or gameplay verification was
  performed; the validator is a structural/declaration check only.

---

## Slice 5 — Collection

Populates the fourth of the five new categories. **Adds 14 achievements**
(one 5-rung ladder + one 4-rung + one 3-rung + 2 single-shots). Count before:
692. Count after: **706**. (Running total for the next slice's author: 706
declared, 148 still to go against the 854 target.)

### Files changed

| File | Change |
| --- | --- |
| `js/achievements.js` | One new commented block — 3 `addTierSet` calls + 2 `addAchievement` calls — inserted after Slice 4's Exploration block and before the lookup-index block (lines 1444–1512). Nothing else in the file was touched. |

No other file was touched at all. `js/data.js` (for the five pool tables and the
reward tables) was read via the validator but not modified. No call site was
changed, **no new bestiary bucket and no new stat key were added** — every
predicate here rides on `markBestiarySeen` calls that already exist.

Every def in this slice is **Predicate C** (`bestiarySection` + distinct
breadth). Slice 4 was its first caller; this slice is the first to use it as a
category's entire vocabulary, and the first to emit a `distinctThreshold` via
plain `addAchievement` rather than through `addTierSet`'s `distinct:true`.

---

### The starting-state premise — checked first, and it held

The dispatch warned that Slice 4's premise about pre-existing coverage was wrong
in one direction, and asked for independent confirmation. Confirmed two ways
before any edit:

* `grep -n "bestiarySection:'seen" js/achievements.js` → **one hit, line 97**,
  which is the Predicate C doc-comment *example* from Slice 1, not code.
* A `vm` load of the unedited file → **0** achievements with a
  `seenItems`/`seenTrinkets`/`seenFamiliars`/`seenStars`/`seenPills`
  `bestiarySection`, and **0** with `category:'Collection'`. Total 692, matching
  Slice 4's reported running total exactly.

So all five buckets really were unclaimed. The validator re-asserts the
equivalent post-hoc invariant (every seen-bucket def in the file is one of this
slice's 14, and the non-Collection count is still exactly 692).

All five writers were re-confirmed to still exist at their documented call sites:

| Section | Written from | Confirmed at |
| --- | --- | --- |
| `seenItems` | `applyItemToPlayer` | `js/items.js:405` |
| `seenTrinkets` | `equipTrinket` | `js/items.js:367` |
| `seenFamiliars` | `addFamiliar` | `js/items.js:418` |
| `seenStars` | `grantPickupEffect` `'star'` | `js/combat.js:605` |
| `seenPills` | `grantPickupEffect` `'pill'` | `js/combat.js:591` |

### Pool sizes — re-counted from the live tables, not assumed

Counted by `Object.keys(...).length` on the real objects inside the `vm`
context, not by grep or by trusting the dispatch's approximations:

| Bucket | Table | **Real count** | Dispatch said |
| --- | --- | --- | --- |
| `seenItems` | `ITEMS` | **362** | ≈362 ✓ |
| `seenTrinkets` | `TRINKETS` | **178** | ≈178 ✓ |
| `seenFamiliars` | `FAMILIAR_TYPES` | **94** | ≈94 ✓ |
| `seenStars` | `STAR_TYPES` | **12** | 12 ✓ |
| `seenPills` | `PILL_COLORS` (array) | **10** | 10 ✓ |

All five matched. `PILL_COLORS` is an array rather than a keyed object; it is
counted by `.length` and `markBestiarySeen('seenPills', color)` records the
colour id, so the distinct ceiling is genuinely 10.

---

### What was added

| baseId / id | Name | Icon | Section | Thresholds | Final-rung reward |
| --- | --- | --- | --- | --- | --- |
| `collection_items` | Compendium | 📚 | `seenItems` | 25 / 75 / 150 / 250 / **340** | `itemId:'polishedscroll'` |
| `collection_trinkets` | Trinket Archivist | 🔩 | `seenTrinkets` | 15 / 45 / 90 / **150** | `itemId:'gildedtrinket'` |
| `collection_familiars` | Beast Befriender | 🐾 | `seenFamiliars` | 12 / 35 / **70** | `familiarId:'sacredhare'` |
| `collection_stars` | Constellation | ⭐ | `seenStars` | **12** (single) | `itemId:'moonshard'` |
| `collection_pills` | Full Spectrum | 💊 | `seenPills` | **10** (single) | `itemId:'crystalflask'` |

Ladder ids come out as `<baseId>_t1…_tN` with ` I`…` V` appended to the name by
`addTierSet`. Descs: `'Discover N different items.'`, `'Equip N different
trinkets.'`, `'Collect N different familiars.'`, `'Discover all 12 stars.'`,
`'Sample all 10 pill colors.'` — the two singles' descs are asserted to name the
real pool count, so a table change would fail the validator rather than silently
lie in the panel.

**Stars and pills are single-shots, not ladders**, per the plan: a 12- and a
10-entry pool do not support a meaningful curve, and both are plausible full
completions. They are the first `addAchievement` calls in the project to carry
`distinctThreshold` directly.

### Threshold calibration

Unlike Slices 3 and 4 there was no anchor band to work from — these five buckets
had zero prior achievements — so the rule was proportional to the *real* pool:

* Tier 1 sits at 4–15% of the pool (25/362, 15/178, 12/94), i.e. reachable
  within the first few runs, so nobody sees an empty category.
* Middle rungs roughly double-to-triple each time.
* The final rung sits at **94% / 84% / 74%** of its pool respectively —
  deliberately short of 100% for the three big buckets. Full completion of 362
  items or 178 trinkets depends on drop luck across hundreds of runs and would
  be an effectively dead rung; the two small buckets (12 stars, 10 pills) *are*
  set to true 100% completion because they are actually finishable.
* The validator asserts strictly-increasing thresholds within each ladder, that
  every top rung is `<= pool` and `>= 70% of pool`, and that tier 1 is `<= 20%
  of pool` — so a retune that breaks the curve fails the check rather than
  slipping through.

---

### Reward selection

5 rewards across 14 achievements. Tiers 1..N-1 of all three ladders carry **no
reward field at all** (bare `{ threshold:n }`); only the capstones and the two
singles grant anything, exactly one each.

The already-claimed set was built the right way from the first pass — Slice 3's
lesson — by loading `js/data.js` + `js/enemies.js` + `js/achievements.js` into
one `vm` context and reading reward fields off the **runtime `ACHIEVEMENTS`
array**, never from a text grep, so the ~165 generated superboss rewards (drawn
via an incrementing `_rewardIndex`, invisible to grep) are included.

**Pre-pick free pools re-verified independently: 212 items / 44 trinkets / 48
familiars** — exactly Slice 4's reported figures, a third independent slice
arriving at the same set. **Zero collisions had to be fixed.**

Per the dispatch, **no trinket was spent** — 4 items and 1 familiar. Trinkets
stay at **44** for Slice 6. Free pools after this slice: **208 items / 44
trinkets / 47 familiars**.

Thematic fit was taken where the free pool offered it (`polishedscroll` for the
item compendium, `gildedtrinket` — literally a trinket-flavoured *item* — for the
trinket ladder, the `sacredhare` familiar for the familiar ladder, `moonshard`
for the star set, `crystalflask` for the pill set). No new item, trinket, or
familiar was authored; all five are existing `js/data.js` entries.

---

### Verification performed

* `node --check js/achievements.js` — **passes** (run after the edit and again as
  the final action).
* A throwaway Node validator (written to the scratchpad, **not committed**) loads
  `js/data.js` + `js/enemies.js` + `js/achievements.js` into one `vm` context
  with minimal `document`/`localStorage` stubs — same approach as Slices 2–4 —
  and asserts **227 checks, all passing**:
  * **starting state**: exactly 14 seen-bucket defs file-wide, all of them this
    slice's, non-Collection count still exactly 692, total **706**;
  * pool sizes are the live 362 / 178 / 94 / 12 / 10;
  * bucket split is exactly 5 / 4 / 3 / 1 / 1, no other `bestiarySection` used by
    any Collection def, Collection count is 14;
  * predicate shape: every def has a numeric `distinctThreshold` and **no**
    `threshold`, `bestiaryId`, or `statKey` (Slice 1 gotcha #1), plus a non-empty
    `name`/`desc`/`icon`;
  * ladder shape: each ladder has exactly its N tiers present at `_t1..._tN` and
    no `_t(N+1)`, all on the right section, thresholds strictly increasing, top
    rung `<= pool` and `>= 70%` of pool, tier 1 `<= 20%` of pool;
  * the two singles' thresholds equal the real `STAR_TYPES`/`PILL_COLORS` counts
    and their descs name those counts;
  * rewards: exactly 5, on exactly the 3 capstones + 2 singles, all others carry
    **none** of the seven reward keys; each is `itemId` or `familiarId`, never
    `trinketId`; the 5 are distinct; each resolves in `ITEMS`/`FAMILIAR_TYPES`;
    and **no reward id is used by any other achievement in the runtime array**
    (generated superboss pool included);
  * free-pool bookkeeping: pre-pick counts recompute to 212 items / 48
    familiars, and trinkets are still 44 (untouched);
  * collisions: all **706** ids unique file-wide, the 14 new names unique among
    themselves and against all 692 pre-existing names, all 14 in
    `ACHIEVEMENTS_BY_ID`, 14 under `_ACHV_BY_CATEGORY.get('Collection')`,
    `'Collection'` in `ACHIEVEMENT_CATEGORY_ORDER`, and each of the five sections
    indexed under `_ACHV_BY_BESTIARY_SECTION` with the right def count;
  * all five buckets really exist in a live `ensureUnlockShape({}).bestiary`.
* Visual read of the inserted block in context, and grep-confirmation of all five
  `markBestiarySeen` call sites in `js/items.js` / `js/combat.js`.

### NOT VERIFIED

* **Nothing was rendered.** The achievements panel was never opened or drawn. The
  14 new rows have not been seen, and the panel is now 706 rows on a full rebuild
  per filter click — Slice 1's "unbounded list" note and Slice 2's rebuild-cost
  note both still stand.
* **No predicate has ever fired.** No `markBestiarySeen` call was made; not one
  of these 14 predicates has evaluated against real data. In particular, whether
  `markBestiarySeen`'s "only on the call that actually flips a new key" guard
  interacts correctly with a `distinctThreshold` that is already met at load time
  is reasoned-about, not observed.
* **The five writers were confirmed to exist, not traced.** `grep` shows the
  `markBestiarySeen('seenItems', item.id)` etc. calls at the five documented
  lines, but the surrounding control flow was not read — whether
  `applyItemToPlayer` fires for *every* item the player picks up (vs. only some
  paths), whether `equipTrinket` fires on swap as well as first equip, and
  whether every one of the 362/178/94 table entries can actually reach its writer
  at all, are unchecked. If some subset of a table is unobtainable in play, that
  ladder's top rung is unreachable — the same silent-dead-achievement failure
  mode Slice 4 flagged for `objectsSeen`.
* **The 340 / 150 / 70 top rungs are unvalidated as *feel*.** They are 94% / 84%
  / 74% of their pools by construction, but no playtesting was done, and the
  realistic per-run discovery rate is unknown. If item drops repeat heavily, 340
  distinct items may be a multi-hundred-run wall.
* **Reward suitability is unverified.** The 5 ids were checked to exist and to be
  unclaimed; their power level, whether any is a downside/"trap" item, and
  whether granting them mid-run behaves sensibly were not examined.
* **`ITEMS` was counted, not audited.** All 362 keys were treated as discoverable
  entries; whether some are internal/unobtainable placeholders (which would lower
  the true ceiling below 362) was not checked. Same caveat for `TRINKETS` and
  `FAMILIAR_TYPES`.
* **The game was never launched or played.** Static content only, per the task.
* Per the standing user constraint, no smoke testing or gameplay verification was
  performed; the validator is a structural/declaration check only.

---

## Slice 6 — Challenge

Populates the fifth and last of the new categories, and **ends achievements-500**.
**Adds 12 achievements.** Count before: 706. Count after: **718**.

This slice is structurally unlike Slices 2–5. Those were pure data — zero new call
sites, every predicate riding on a `bumpStat` / `bumpBestiaryCount` /
`markBestiarySeen` call that already existed. Challenge achievements are
**Predicate D (event)**: they have no auto-predicate at all, so something must
call `unlockAchievement(id, game)` by hand. That means real edits to game logic,
in four files, and a bad edit here is a *gameplay* bug the user only finds by
playing — not a wrong row in a panel. The slice was therefore deliberately capped
at **12 achievements instead of 40–250**, and every code-side change is an
**additive sibling line placed immediately next to an existing, structurally
identical, already-shipped check**. Not one existing line, condition, or control
flow was modified, reordered, or restructured.

### Files changed

| File | Change |
| --- | --- |
| `js/achievements.js` | One new commented block of 12 `addAchievement` calls (lines 1512–1576), inserted after Slice 5's Collection block and before the lookup-index block; **+4 lines** in `recordWin()` (sites 1 and 4) |
| `js/game.js` | **+2 lines** in `descend()` (site 2); **+11 lines** in `onBossDefeated()` (sites 3 and 5) |
| `js/entities.js` | **+1 line** in the `Player` constructor — the single new state field |
| `js/main.js` | **+6 lines** in the `game.state === 'win'` block (site 6) |

No other file was touched. `js/data.js` and `js/enemies.js` were read (via the
validator's `vm` load) to resolve `CLASSES` and the reward tables, but not
modified. No Slice 1–5 declaration was touched.

---

### The six code-site changes, in full

Every one is quoted before/after with context so it can be eyeballed without
opening a file.

#### Site 1 — `winsByClass` breadth (2 achievements) — `js/achievements.js`, `recordWin()`

**Before**
```js
  if (Object.keys(unlocks.winsByClass).length >= 3) unlockAchievement('triplethreat', game);
  if (game.player.redMax <= 1) unlockAchievement('onehearted', game); // Witheredapple — see data.js
}
```
**After**
```js
  if (Object.keys(unlocks.winsByClass).length >= 3) unlockAchievement('triplethreat', game);
  if (Object.keys(unlocks.winsByClass).length >= 8) unlockAchievement('challenge_wins_8classes', game);
  if (Object.keys(unlocks.winsByClass).length >= 15) unlockAchievement('challenge_wins_allclasses', game); // 15 = every key in data.js's CLASSES
  if (game.player.redMax <= 1) unlockAchievement('onehearted', game); // Witheredapple — see data.js
  if (game.player.redMax <= 1 && !game.player.tookDamageThisRun) unlockAchievement('challenge_onehearted_flawless', game);
}
```

**Why this is additive-only.** Two new statements, character-for-character the
same shape as the `triplethreat` line directly above them, differing only in the
numeric threshold and the id. `triplethreat` is byte-identical before and after
(asserted by the validator, not just eyeballed). No new state, no new read — they
consult the same `unlocks.winsByClass` object the existing line already reads,
after the same `saveUnlocks(unlocks)`.

**The `15` was confirmed, not assumed.** `Object.keys(CLASSES).length` was read
off the live `data.js` table inside the `vm` context: **15** — `earth, pegasus,
unicorn, batpony, zebra, hypogriff, seapony, ponybot, griffin, kirin, dragon,
windigo, kelpie, breezie, dnbpony`. The validator asserts this count, so if a
16th class is ever added the check fails loudly rather than leaving
`challenge_wins_allclasses` quietly earnable at 15/16.

#### Site 2 — `floorsClearedNoDamage` ladder (2 achievements) — `js/game.js`, `descend()`

**Before**
```js
  descend(branch){
    if (!this.player.tookDamageThisFloor) {
      this.floorsClearedNoDamage = (this.floorsClearedNoDamage || 0) + 1;
      if (this.floorsClearedNoDamage >= 2) unlockAchievement('unlock_zebra', this);
    } else {
      this.floorsClearedNoDamage = 0;
```
**After**
```js
  descend(branch){
    if (!this.player.tookDamageThisFloor) {
      this.floorsClearedNoDamage = (this.floorsClearedNoDamage || 0) + 1;
      if (this.floorsClearedNoDamage >= 2) unlockAchievement('unlock_zebra', this);
      if (this.floorsClearedNoDamage >= 4) unlockAchievement('challenge_floors_nodamage_4', this);
      if (this.floorsClearedNoDamage >= 6) unlockAchievement('challenge_floors_nodamage_6', this);
    } else {
      this.floorsClearedNoDamage = 0;
```

**Why this is additive-only.** Two sibling `if`s inside the existing
`!tookDamageThisFloor` branch. The counter, its increment, and the `else` reset
branch are all untouched — the new lines only *read* `floorsClearedNoDamage`.
Ladders in this codebase are not mutually exclusive, so a 6-floor streak
correctly awards `unlock_zebra`, `_4`, and `_6`; `unlockAchievement` is
idempotent, so re-awarding `unlock_zebra` on floors 3..6 is the pre-existing
behaviour and is unchanged.

**Reachability.** `descend()` runs once per floor left, so a full 13-floor run
makes up to 12 calls — 6 consecutive is demanding but well inside the ceiling.

#### Site 3 — boss-room no-damage streak (3 achievements) — `js/entities.js` + `js/game.js`

The **one new piece of state in the whole slice**, in `js/entities.js`'s `Player`
constructor:

**Before**
```js
    this.tookDamageThisBossRoom = false; // reset on boss-room entry — see game.js enterRoom / Untouchable achievement
    this.tookDamageThisRun = false; // reset once per run at construction — see the Sea Pony achievement
```
**After**
```js
    this.tookDamageThisBossRoom = false; // reset on boss-room entry — see game.js enterRoom / Untouchable achievement
    this.bossRoomsNoDamageStreak = 0; // consecutive superboss rooms cleared without damage, reset on any hit — see game.js onBossDefeated / Challenge achievements
    this.tookDamageThisRun = false; // reset once per run at construction — see the Sea Pony achievement
```

**Why the new field mirrors a proven pattern.** It sits in the same achievement
bookkeeping cluster as `tookDamageThisBossRoom` / `tookDamageThisRun` /
`tookDamageThisFloor`, is initialised in the same constructor, and follows the
same commenting convention (what it means, when it resets, which call site owns
it). It is **per-`Player`**, so it resets to 0 for free with every new run — the
same lifecycle `tookDamageThisRun` already relies on, with no extra reset code
anywhere. It is written and read from exactly one function and is never
serialised, never rendered, never persisted, and never consulted by any
pre-existing code, so the only behaviour it can affect is the three new
`unlockAchievement` calls. Verified by the validator: **1** occurrence in
`entities.js`, **6** in `game.js` (2 increment + 3 compare + 1 reset), **0** in
`main.js`, and **1** in `achievements.js` — that last one being a doc-comment
cross-reference, not code.

In `js/game.js`'s `onBossDefeated`:

**Before**
```js
    if (superbossId) {
      unlockAchievement('sb_' + superbossId + '_' + this.player.classId, this);
      if (!this.player.tookDamageThisBossRoom) unlockAchievement('untouchable', this);
      if (this.player.redCurrent + this.player.blueCurrent <= 1) unlockAchievement('unbreakable', this); // Ember Heart — see data.js
```
**After**
```js
    if (superbossId) {
      unlockAchievement('sb_' + superbossId + '_' + this.player.classId, this);
      if (!this.player.tookDamageThisBossRoom) unlockAchievement('untouchable', this);
      // consecutive untouched superboss rooms — a run meets at most 7 superbosses
      // (polish, tyrone, then one per floor 9A/9B..12A/12B, then onetruednb — see
      // startFloor's pendingBossType chain), so 7 is "the whole run untouched".
      // Counter lives on the player (entities.js), so it resets with every new run.
      if (!this.player.tookDamageThisBossRoom) {
        this.player.bossRoomsNoDamageStreak = (this.player.bossRoomsNoDamageStreak || 0) + 1;
        if (this.player.bossRoomsNoDamageStreak >= 2) unlockAchievement('challenge_bossstreak_2', this);
        if (this.player.bossRoomsNoDamageStreak >= 4) unlockAchievement('challenge_bossstreak_4', this);
        if (this.player.bossRoomsNoDamageStreak >= 7) unlockAchievement('challenge_bossstreak_7', this);
      } else {
        this.player.bossRoomsNoDamageStreak = 0;
      }
      if (this.player.redCurrent + this.player.blueCurrent <= 1) unlockAchievement('unbreakable', this); // Ember Heart — see data.js
```

**Why this is additive-only.** A brand-new block wedged between two untouched
lines, both byte-identical before and after (validator-asserted). Placement is
deliberate: it is inside the same `if (superbossId)` scope as `untouchable`, so
it runs on **every** superboss defeat and only on superboss defeats; it reads the
same `tookDamageThisBossRoom` flag; and it is *after* `untouchable` and *before*
`unbreakable`, touching neither. It writes only the new field. The
`unbreakable` / `unlock_seapony` / `unlock_dnbpony` checks below it are unchanged
and unaffected, since nothing they read is written here.

**The `7` was verified, not assumed.** Re-read `startFloor`'s `pendingBossType`
chain (`js/game.js:106–117`): floorNum 5 polish, 7 tyrone, 8 israel|pineapple,
9 lilac|algae, 10 clapper|plapper, 11 vanilladnb|nhm, 12 onetruednb — **7
branches**, one superboss each, so a single run meets at most 7. The validator
regex-counts those 7 branches and fails if the chain ever changes. `enterRoom`
forces the superboss only onto `dungeon.bossNode`, so the bonus second boss room
on floors 9–12 carries a *generic* boss and cannot inflate the streak past 7.

#### Site 4 — one-heart flawless win (1 achievement) — `js/achievements.js`, `recordWin()`

Shown in Site 1's after-block above; isolated here:

**Before**
```js
  if (game.player.redMax <= 1) unlockAchievement('onehearted', game); // Witheredapple — see data.js
```
**After**
```js
  if (game.player.redMax <= 1) unlockAchievement('onehearted', game); // Witheredapple — see data.js
  if (game.player.redMax <= 1 && !game.player.tookDamageThisRun) unlockAchievement('challenge_onehearted_flawless', game);
```

**Why this is additive-only.** One sibling line, the existing condition plus one
extra conjunct. `tookDamageThisRun` is an existing `Player` flag already used by
`unlock_seapony`; nothing new is read or written. `onehearted` is byte-identical.

#### Site 5 — full-run flawless clear (1 achievement) — `js/game.js`, `onBossDefeated`

**Before**
```js
      if (superbossId === 'tyrone') unlockAchievement('unlock_dragon', this); // "beat Floor 7"
      if (superbossId === 'onetruednb') unlockAchievement('unlock_dnbpony', this); // "beat Floor 13"
    }
```
**After**
```js
      if (superbossId === 'tyrone') unlockAchievement('unlock_dragon', this); // "beat Floor 7"
      if (superbossId === 'onetruednb') unlockAchievement('unlock_dnbpony', this); // "beat Floor 13"
      // mirrors the polish/unlock_seapony "no damage so far" line above, but at the
      // deepest superboss — i.e. the entire game beaten without ever being hit
      if (superbossId === 'onetruednb' && !this.player.tookDamageThisRun) unlockAchievement('challenge_flawless_run', this);
    }
```

**One deliberate deviation from the plan's snippet, for safety.** The plan showed
the `onetruednb` line being wrapped into a `{ ... }` block with the new line
inside it. The existing line is a **single-statement `if` with no braces**, so
wrapping it would mean *rewriting* it — exactly the kind of edit this slice is
meant to avoid. Instead the new check is a **standalone sibling `if` repeating
the `superbossId === 'onetruednb'` test**, which is semantically identical (same
scope, same order, same guard) but leaves the existing line completely untouched.
It also matches the file's own dominant style — the four lines above it are all
unbraced single-statement `if (superbossId === '...')` checks. It is structurally
the mirror of the `unlock_seapony` line 7 lines up, which is the precedent the
plan named.

#### Site 6 — speedrun tiers (3 achievements) — `js/main.js`, the win block

**Before**
```js
      if (game.state === 'win') {
        showWin(); Sound.play('winFanfare'); recordWin(game, game.player.classId);
        bumpStat('totalPlaytime', Math.round(game.runElapsed), game);
        // lifetime "fastest win" record — see main.js's lifetime stats line
        if (setStatMin('fastestWinSeconds', game.runElapsed)) {
          toast('🏅 New personal best! Fastest win: ' + Util.formatDuration(game.runElapsed) + '.', true);
        }
      }
```
**After**
```js
      if (game.state === 'win') {
        showWin(); Sound.play('winFanfare'); recordWin(game, game.player.classId);
        bumpStat('totalPlaytime', Math.round(game.runElapsed), game);
        // lifetime "fastest win" record — see main.js's lifetime stats line
        if (setStatMin('fastestWinSeconds', game.runElapsed)) {
          toast('🏅 New personal best! Fastest win: ' + Util.formatDuration(game.runElapsed) + '.', true);
        }
        // speedrun tiers — game.runElapsed is this run's played seconds (pause
        // excluded, see game.js update()). Checked independently, not as an
        // either/or ladder, so one very fast win awards all three at once.
        if (game.runElapsed <= 1200) unlockAchievement('challenge_speedrun_20min', game);
        if (game.runElapsed <= 720) unlockAchievement('challenge_speedrun_12min', game);
        if (game.runElapsed <= 480) unlockAchievement('challenge_speedrun_8min', game);
      }
```

**Why this is additive-only.** Three appended statements at the end of an
existing block. `setStatMin` and its toast are untouched (validator-asserted);
nothing is restructured; the three checks are independent, matching this
codebase's non-exclusive ladder convention (Site 2, and every `addTierSet`
ladder in Slices 3–5).

**`unlockAchievement` is reachable from `main.js`** — it is a hoisted top-level
`function` declaration in `achievements.js` (line 1684), and `index.html` loads
`achievements.js` at line 138, well before `main.js` at line 154. `main.js` had
no prior `unlockAchievement` call, so this was checked rather than assumed.

---

### Speedrun thresholds — reasoned, and one real finding

The thresholds are the plan's 1200 / 720 / 480 seconds. Before accepting them,
`game.runElapsed` and the win condition were traced:

* `game.runElapsed += dt` in `update()` — **played** seconds, pause excluded.
* `state = 'win'` fires in `descend()` when `next >= this.maxFloorsThisRun`, and
  `maxFloorsThisRun = unlocks.polishDefeated ? 8 : BASE_MAX_FLOORS` with
  `BASE_MAX_FLOORS = 6` (`js/stages.js:43`).

**A "win" is therefore not always a 13-floor clear.** It is a **6**-floor run on a
save that has never beaten Polish DNB, an **8**-floor run once Polish is down, and
a **13**-floor run only once the player has 3+ Tyrone kills (at which point
`descend()`'s branch spots make floors 9→13 mandatory). Sub-8-minutes is
comfortably plausible for a 6- or 8-floor win, so none of the three tiers is
unearnable, and the thresholds were kept unchanged. Descs deliberately say
"Win a run in under N minutes" without naming a floor count, so they stay accurate
across all three run lengths.

Consequence worth flagging to whoever tunes this next: the tiers are **easiest on
a fresh save** (6 floors) and hardest for a veteran (13 floors, always). That is
arguably backwards for a "challenge" ladder, but fixing it would require
conditioning on floor count — new logic, out of scope here.

---

### The 12 declarations

All `category:'Challenge'`, all Predicate D (no `statKey`, no `bestiarySection`,
no `threshold`, no `distinctThreshold` — asserted). Ids all carry the
`challenge_` prefix, following Slice 2's collision-safe precedent, and none ends
in the `_t<digits>` suffix `addTierSet` mints.

| id | Name | Icon | Feat | Reward |
| --- | --- | --- | --- | --- |
| `challenge_wins_8classes` | Eightfold Champion | 🏆 | win with 8 different characters | `itemId:'gildedhoof'` |
| `challenge_wins_allclasses` | Every Last Pony | 👑 | win with all 15 characters | `trinketId:'coralcrown'` |
| `challenge_floors_nodamage_4` | Spotless Descent | 🛡️ | 4 floors in a row, no damage | `itemId:'guardianhalo'` |
| `challenge_floors_nodamage_6` | Immaculate Descent | 🕊️ | 6 floors in a row, no damage | `itemId:'seraphshield'` |
| `challenge_bossstreak_2` | Twice Untouched | ✨ | 2 superbosses in a row, unhit | `familiarId:'ironshrew'` |
| `challenge_bossstreak_4` | Four Times Untouched | 💫 | 4 superbosses in a row, unhit | `itemId:'wingedgrace'` |
| `challenge_bossstreak_7` | Not a Single Scratch | 🌠 | all 7 superbosses of a run, unhit | `trinketId:'radiantring'` |
| `challenge_onehearted_flawless` | Glass Heart | 💔 | win at 1 max red heart, never hit | `trinketId:'crackedseal'` |
| `challenge_flawless_run` | Flawless Legend | 🌟 | beat The One True DNB, never hit all run | `trinketId:'ancienthoofguard'` |
| `challenge_speedrun_20min` | Brisk Escape | ⏱️ | win in under 20 minutes | `itemId:'quickstepcharm'` |
| `challenge_speedrun_12min` | Record Pace | ⏲️ | win in under 12 minutes | `itemId:'swiftrecovery'` |
| `challenge_speedrun_8min` | Blur | ⚡ | win in under 8 minutes | `itemId:'speedup'` |

Because Predicate D achievements render "Not yet earned." with **no** live
progress line, each `desc` fully states the feat on its own — e.g.
`challenge_bossstreak_7`: *"Defeat 7 superbosses in a row without being hit in
their boss rooms — every superboss of a full run, untouched."* and
`challenge_flawless_run`: *"Defeat The One True DNB on Floor 13 without taking a
single point of damage the whole run."* (the boss's display name was read off
`SUPERBOSSES.onetruednb.name` so the desc matches what the player sees).

The block also opens with a comment listing **every id and the file/function that
unlocks it**, because a Predicate D id renamed in one place and not the other is
silently unearnable — the one failure mode this achievement shape has that the
other three do not.

### Reward selection

11 rewards over 12 achievements (`challenge_bossstreak_2` gets a familiar;
nothing is unrewarded — the "no reward at all" fallback was not needed).
Split: **7 items, 4 trinkets, 1 familiar** — exactly at the policy cap of 4
trinkets, spent on the four genuine capstones (all 15 classes, all 7 superbosses
unhit, one-heart flawless win, full flawless clear).

Slice 3's lesson was applied from the first pass: the claimed-id set was built
from the **runtime `ACHIEVEMENTS` array** via a `vm` load of
`data.js` + `enemies.js` + `achievements.js`, never from a text grep, so the ~165
generated superboss rewards (drawn via an incrementing `_rewardIndex`, invisible
to grep) are included. **Pre-pick free pools re-verified independently: 208 items
/ 44 trinkets / 47 familiars** — exactly Slice 5's reported figures, a fourth
independent slice arriving at the same set. **Zero collisions had to be fixed.**

Free pools after this slice: **201 items / 40 trinkets / 46 familiars.** No new
item, trinket, or familiar was authored; all 11 are existing `js/data.js` entries.

---

### Verification performed

* `node --check` on **all four** touched files — `js/achievements.js`,
  `js/game.js`, `js/entities.js`, `js/main.js` — **all pass**, run after the
  edits and again as the final action.
* A throwaway Node validator (scratchpad, **not committed**) loads
  `js/data.js` + `js/enemies.js` + `js/achievements.js` into one `vm` context —
  same approach as Slices 2–5 — and additionally reads all four touched files as
  text. **221 checks, all passing**:
  * totals: exactly **12** `category:'Challenge'` defs, non-Challenge count still
    exactly **706** (Slices 1–5 provably undisturbed), overall **718**;
    `'Challenge'` in `ACHIEVEMENT_CATEGORY_ORDER` and 12 grouped under it by
    Slice 1's index;
  * the id set equals the 12 planned exactly, all present in
    `ACHIEVEMENTS_BY_ID`, all `challenge_`-prefixed, none matching `_t<digits>`;
  * collisions: all **718** ids unique file-wide, all 718 **names** unique
    file-wide;
  * **pure Predicate D**: no `statKey`, `bestiarySection`, `bestiaryId`,
    `threshold`, or `distinctThreshold` on any of the 12; each has a non-empty
    `name` / `desc` / `icon`;
  * rewards: at most one reward key each, only `itemId`/`trinketId`/`familiarId`,
    every id resolves in `ITEMS`/`TRINKETS`/`FAMILIAR_TYPES`, the 11 are distinct
    from each other, **no reward id is used by any other achievement in the
    runtime array** (generated superboss pool included), trinket count **4 ≤ 4**;
  * **call-site wiring**: all 12 ids have a real
    `unlockAchievement('<id>'` call, in the expected file, counted to exactly 12
    — so no declared-but-unwired (permanently unearnable) achievement can ship;
  * **existing lines byte-identical**: `triplethreat`, `onehearted`,
    `unlock_zebra`, `untouchable`, `unlock_dnbpony`, `unlock_seapony`, the
    `setStatMin('fastestWinSeconds', ...)` line, and both
    `tookDamageThisBossRoom`/`tookDamageThisRun` initialisers are all asserted
    still present verbatim;
  * **new state containment**: `bossRoomsNoDamageStreak` occurs 1× in
    `entities.js`, 6× in `game.js`, 0× in `main.js`, and 1× in `achievements.js`
    (a doc comment, with no `challenge_bossstreak` unlock call in that file);
  * domain sanity: `CLASSES` really is 15, `SUPERBOSSES` still 11, and the
    `startFloor` `pendingBossType` chain really has **7** superboss branches — so
    both the `>= 15` and `>= 7` thresholds fail the check rather than silently
    drift if the game data changes.
* Full visual read of all six edited regions in context (quoted above).

### NOT VERIFIED

* **Nothing was rendered.** The achievements panel was never opened or drawn. The
  12 new rows have not been seen; the panel is now **718** rows on a full rebuild
  per filter click — Slice 1's "unbounded list" note and Slice 2's rebuild-cost
  note both still stand.
* **No achievement has ever actually fired.** Not one of the 12 new
  `unlockAchievement` calls has executed. The streak counter has never
  incremented, no threshold comparison has ever run against real data, and no
  reward has ever been handed over. Every claim about *when* these unlock is
  reasoned from reading the code, not observed.
* **The speedrun thresholds' plausibility was reasoned, not measured.** No run
  was timed. 1200 / 720 / 480 seconds were sanity-checked against the win
  condition (6-, 8-, or 13-floor wins depending on save state — see above) and
  judged attainable; whether a sub-8-minute win is *actually* achievable, or
  conversely trivially easy on a fresh 6-floor save, is unknown.
* **The 4- and 6-floor and 2/4/7-superboss thresholds are likewise untested for
  feel.** They are inside their structural ceilings (12 descents, 7 superbosses)
  by construction, but no one has attempted them.
* **`tookDamageThisBossRoom`'s reset semantics were not re-traced.** The new
  streak inherits whatever `untouchable` already does — in particular, the flag
  is reset on *boss-room entry* (`game.js:183`), so leaving and re-entering a
  boss room after being hit presumably clears it. That is pre-existing
  `untouchable` behaviour, not introduced here, but the streak now compounds it
  across rooms and that interaction was not exercised.
* **Reward suitability is unverified.** The 11 ids were checked to exist and to
  be unclaimed; their power level, whether any is a downside/"trap" item, and
  whether granting them mid-run behaves sensibly were not examined.
* **The game was never launched or played.** Static content only, per the task.
* Per the standing user constraint, no smoke testing or gameplay verification was
  performed; the validator is a structural/declaration/call-site check only.

---

## achievements-500 — final total

**718 achievements** (354 pre-existing + 254 Slayer + 45 Mastery + 39 Exploration
+ 14 Collection + 12 Challenge).

This is **below the original ~854 target**, deliberately and on two counts:

1. **Slice 4 (Exploration) landed at 39 rather than the planned ~60** after the
   implementer found that several candidate stat keys were dead or redundant —
   `deepestFloor` and `fastestWinSeconds` are written *only* by
   `setStatMax`/`setStatMin`, neither of which consults the achievement index, so
   any achievement on them would sit at 0% forever; and four room-visit keys were
   already fully covered by existing `Miscellaneous` achievements. Padding those
   back in would have shipped unearnable or duplicate rows.
2. **Slice 6 (Challenge) was capped at 12 rather than chasing the remainder.**
   Challenge is the only category that cannot be built by declaration alone —
   every entry needs a hand-written call site in game logic, and every call site
   is a chance to introduce a real gameplay bug that only surfaces in play. The
   orchestrator scoped this slice small on purpose and it was implemented exactly
   as scoped; no achievements were added beyond the 12 specified.

The shortfall is therefore a quality decision, not an incomplete slice. Anyone
wanting to close the gap to 854 should add **data-shaped** achievements
(Predicates A/B/C) in the existing categories — where the marginal risk is a
wrong row in a panel — rather than more event-based Challenge entries.

---

## Slice 7 — Slayer rewards

Follow-up batch, not a new category. **Adds zero achievements.** Count before:
718. Count after: 718. Gives all **254** Slice 2 Slayer achievements a reward —
they shipped deliberately reward-free ("a pure trophy case"), and the user has
since asked for every achievement to carry a reward. Of the 364 achievements
added by Slices 2–6, **40** carried a reward before this batch; **294** do now.
(Still reward-free after this slice: the 70 grind-rung tiers in
Mastery/Exploration/Collection — a separate future batch, deliberately untouched
here.)

### Files changed

| File | Change |
| --- | --- |
| `js/data.js` | One new commented block of **254 `ITEMS` entries** (`slayertrophy_*`), appended at the end of the `ITEMS` table. Nothing else touched — every pre-existing entry asserted deep-equal. |
| `js/items.js` | **254 new additive terms** in `recalcPlayerStats`, appended to 16 existing formula lines across 15 stat channels (damage takes two lines: melee + ranged). No existing term altered. `applyPassiveEffect` **not touched at all** — asserted byte-identical. |
| `js/achievements.js` | One field, `itemId:'slayertrophy_…'`, added to each of the 254 Slayer `addAchievement` calls. Every other field on every line byte-identical. |

No other file was touched. `js/room.js` was read (not modified) to confirm the
pool filter: `pickItemFromPool`'s `const available = i => !i.locked ||
isItemUnlocked(i.id)` (line 473) is what makes `locked:true` real — none of the
254 can appear in any random pool until its own Slayer achievement fires.

---

### The formulas — all mechanical, none hand-tuned

* **item id** — `'slayertrophy_' + achievement.id.slice('slayer_'.length)`, so
  `slayer_gravegrub` → `slayertrophy_gravegrub` and `slayer_boss_warlord` →
  `slayertrophy_boss_warlord`.
* **`unlockedBy`** — the achievement's own id. Round-trip asserted in both
  directions (achievement → item → achievement).
* **name** — the achievement's own `name` with the trailing `' Hunter'`
  swapped for `' Trophy'`. `Grave Grub Hunter` → `Grave Grub Trophy`;
  `Grung, the Warlord Hunter` → `Grung, the Warlord Trophy`. All 254 unique,
  and none collides with any of the 362 pre-existing item names.
* **icon** — 🏅 for all 220 regular-enemy trophies, 🎖️ for all 34 boss
  trophies. Two icons total, no per-entry cleverness.
* **quality** — `1` for every one (the `ironshoes` tier — minor bulk rewards).
* **color** — a rotating 6-entry palette (`#c9a34a #b08d57 #d9c9a3 #a37f3a
  #e3c15b #8a7a4a`). Decorative only.
* **`pools`** — `POOLS_ALL` for all 254, `locked:true` + `unlockedBy` for all 254.
* **desc** — one fixed string per stat channel, matching that channel's term
  exactly (see the table below), reusing the existing wording of the item that
  already does the same thing (`luckup`, `blastcharm`, `vampfang`, …).

**The source list is the achievements file, not the enemy tables.** The 254
were parsed straight out of `js/achievements.js`'s existing declarations, so
drift against what actually needs a reward is not a possible failure mode. One
find that would have bitten a table-derived list: `slayer_boss_brambleQueen` is
**camelCase** — the only id in the family that is — so its item is
`slayertrophy_boss_brambleQueen`.

### Channel distribution — round-robin, minimum magnitudes

Assignment is `channel = CHANNELS[i % 15]` over the 254 in file order, so the
split is as even as 254/15 allows: **14 channels of 17, one of 16**. Each
channel's magnitude is the **smallest magnitude already present on that
channel** in `recalcPlayerStats` before this slice — asserted by the validator,
which re-derives each channel's pre-existing minimum from the old source rather
than trusting the number written here.

| Channel | `recalcPlayerStats` line | Count | Magnitude | Pre-existing min | desc |
| --- | --- | --- | --- | --- | --- |
| luck | `player.luck` | 17 | `+1` | 1 | `+1 Luck.` |
| speed | `player.speed` | 17 | `+0.05` | 0.05 | `+5% movement speed.` |
| damage | `player.meleeDamage` **and** `player.rangedDamage` | 17 | `+1` (both lines) | 1 | `+1 damage to all attacks.` |
| fire rate | `const rateDenom` | 17 | `+0.05` | 0.05 | `Attacks and shots recharge 5% faster.` |
| range | `const rangeBonusTiles` | 17 | `+1` tile | 1 | `+1 tile of attack range (melee only gains 25% as much).` |
| boss damage | `player.bossDamageBonus` | 17 | `+0.05` | 0.05 | `+5% damage against bosses.` |
| lifesteal | `player.lifestealChance` | 17 | `+0.04` | 0.04 | `4% chance any hit heals you half a heart.` |
| crit chance | `player.critChance` | 17 | `+0.05` | 0.05 | `+5% critical hit chance.` |
| venom | `player.venomChance` | 17 | `+0.04` | 0.04 | `+4% flat chance to poison…` |
| stun | `player.stunChance` | 17 | `+0.04` | 0.04 | `+4% flat chance to stun…` |
| charm | `player.charmChance` | 17 | `+0.04` | 0.04 | `+4% flat chance to charm…` |
| freeze | `player.freezeChance` | 17 | `+0.04` | 0.04 | `+4% flat chance to freeze…` |
| fear | `player.fearChance` | 17 | `+0.04` | 0.04 | `+4% flat chance to fear…` |
| magnet radius | `player.magnetRadius` | 17 | `+20` px | 20 | `+20 pickup magnet radius.` |
| bomb radius | `player.bombRadiusMult` | 16 | `+0.10` | 0.10 | `+10% bomb blast radius.` |

Two notes on the minimums. `magnetRadius`' smallest term is `solartrinket`'s
`20 *`; the `coinmagnet` compound (`55 + 15 * (count - 1)`) is a per-extra-copy
figure on a different shape and was not treated as the floor. `speed` and
several status channels carry small **negative** terms (`stackedcoin -0.05`,
`rustybolt -0.08`); the floor is taken over absolute values, which lands on the
same number either way.

Each term is appended at the **end** of its channel's existing chain, under a
`// Slice 7 slayer-trophy batch (see data.js) — <channel> contributions`
comment, following the `// 81-reward superboss-grid batch` pattern already in
the file. Three terms per line.

### Two things deliberately not done

* **Nothing was added to `applyPassiveEffect`'s hardcoded id chain.** Every one
  of the 254 is a pure formula term. The function is asserted byte-identical to
  before, and none of the 254 ids appears anywhere in its source.
* **No new trinkets or familiars**, and no reward id reused: none of the 254 is
  claimed by any other achievement (checked against the **runtime**
  `ACHIEVEMENTS` array, per Slice 3's lesson, so the ~165 generated superboss
  rewards are included in the comparison).

### Balance note for whoever tunes this

254 minimum-magnitude items is still a large amount of aggregate stat, and it is
lopsided by channel because the channels' minimums differ in coarseness. The
chunky ones are worth flagging: **range** at +1 tile × 17 items against a hard
cap of 12 tiles (`player.rangeTiles` clamp) means ~8 of these trophies max a
ranged build's reach on their own, and **damage** at +1 melee *and* +1 ranged ×
17 is uncapped. The dispatch explicitly accepted pushing capped channels toward
their existing ceilings faster; the uncapped damage channel is the one to watch.
Mitigating factor, unverified in play: all 254 are `locked:true`, drip into the
pools one per Slayer achievement earned, and are quality-1 entries competing
with 362 other items for pedestal slots — no run will ever see many of them.

---

### Verification performed

* `node --check` on **all three** touched files — `js/data.js`, `js/items.js`,
  `js/achievements.js` — **all pass**, run after the edit and again as the final
  action.
* The 254 entries, terms, and achievement edits were **generated from the file's
  own declarations** by a throwaway script, not hand-typed; the achievement
  lines were rewritten by a single-substring replace on the live line
  (`category:'Slayer', bestiarySection:` → `category:'Slayer', itemId:'…',
  bestiarySection:`), never retyped.
* A throwaway Node validator (scratchpad, **not committed**) concatenates
  `js/data.js` + `js/enemies.js` + `js/items.js` + `js/achievements.js` into one
  `vm` script with `document`/`localStorage` stubs — the Slices 2–6 approach,
  extended to `items.js` — and also diffs the three files against pre-edit
  snapshots. **3418 checks, all passing**:
  * totals: 254 `category:'Slayer'` defs, all 718 achievements still present;
  * **every** Slayer def has an `itemId`, all 254 distinct, every one resolves to
    a real `ITEMS` key, every one derives from its own achievement id, and none
    carries a second reward key;
  * no Slayer reward id is claimed by any other achievement in the runtime array;
  * `ITEMS` went 362 → **616**, exactly 254 new `slayertrophy_` ids, **zero**
    collisions with pre-existing ids, and every one of the 362 pre-existing
    entries is deep-equal to its pre-edit self;
  * per new item: `id` matches its key, `type:'passive'`, `quality:1`,
    `pools === POOLS_ALL`, `locked:true`, `unlockedBy` resolves to a real
    **Slayer** achievement **which points back at this item**, hex `color`,
    icon 🏅/🎖️ matching enemy/boss, name ending `' Trophy'`, non-empty desc;
  * 220 enemy + 34 boss; all 254 names unique among themselves **and** against
    all 362 pre-existing item names;
  * **`applyPassiveEffect` source byte-identical to before**, and a substring
    search for each of the 254 ids in that function returns **zero hits**;
  * **no dead rewards**: every one of the 254 ids has a matching
    `(p.<id> || 0)` term in `recalcPlayerStats`;
  * **achievement lines unchanged**: line 1 of every declaration is found
    byte-identical in the new file, line 2 equals the pre-edit line 2 with the
    single `itemId` field spliced in and nothing else, and the **runtime** def's
    `name` / `icon` / `desc` / `category` / `bestiarySection` / `bestiaryId` /
    `threshold` all match the values parsed from the pre-edit snapshot;
  * **magnitude discipline**: for each of the 15 channels the validator parses
    the *pre-edit* statement, computes the smallest per-item magnitude on it,
    and asserts the new magnitude is ≤ that floor; then asserts the new terms on
    each line are exactly the channel's share, all use that magnitude, and all
    belong to that channel;
  * **no existing term altered**: each channel's statement, with the new terms
    stripped back out, is character-for-character its pre-edit self;
  * distribution sums to 254, and every item on a channel shares one desc string.
* Line-level diff against pre-edit snapshots: `js/data.js` **0 lines removed**
  (pure insertion), `js/achievements.js` exactly **254 lines changed and no
  others**, `js/items.js` 11 lines rewritten — exactly the 11 channel-closing
  lines whose trailing `)` / `;` moved down past the appended terms, all 11
  covered by the "pre-existing terms unchanged" assertion above.

### NOT VERIFIED

* **Nothing was rendered.** No item pedestal, no achievements panel, no item
  description was ever drawn. The 254 new rows in the item pool and the reward
  lines now shown on 254 achievement rows have not been seen.
* **No item was ever picked up.** `applyPassiveEffect` was never called for any
  of the 254, `player.passives[…]` was never incremented, and **not one of the
  254 new formula terms has ever been evaluated** — `recalcPlayerStats` was not
  executed at all. Their effects are reasoned from reading the formulas.
* **No achievement fired, so no reward was ever handed over.** The
  `unlockAchievement` → grant-item path was not exercised for any Slayer entry,
  and no `locked` item has been observed entering a pool via `isItemUnlocked`.
* **Balance is unvalidated.** The per-channel minimums are asserted; whether 254
  extra quality-1 stat sticks in the pool is *good* — the range/damage concern
  above in particular — is a judgement no one has tested in play.
* **Pool-dilution effects were not modelled.** 616 items vs 362 changes every
  pedestal roll's odds for every pre-existing item, even though the new ones
  unlock gradually. `pickItemFromPool`'s behaviour at that size was read, not
  measured.
* **`isItemUnlocked` was not re-traced end to end** — that `unlockedBy` really
  gates on the achievement's own persisted unlock state is taken from the
  ~131 pre-existing `locked:true, unlockedBy:` entries following the identical
  shape, plus the pool filter at `js/room.js:473`.
* **The game was never launched or played.** Static content only, per the task.
* Per the standing user constraint, no smoke testing or gameplay verification
  was performed; the validator is a structural/declaration check only.

## Slice 8 — Mastery/Exploration/Collection rewards

The second and final reward-completion batch, and the one that closes
achievements-500. **Adds zero achievements.** Count before: 718. Count after:
718. Gives a reward to the **70** achievements that were still reward-free
after Slice 7 — the grind rungs of Mastery, Exploration and Collection, which
Slices 3–5 shipped as bare `{ threshold:n }` trophies. Slayer (254, Slice 7)
and Challenge (12, Slice 6) were already fully rewarded and are **untouched**.

**All 718 achievements now carry exactly one reward.** Asserted, not assumed:
the validator counts `ACHIEVEMENTS.filter(a => no reward key).length === 0`
over the runtime array.

### Files changed

| File | Change |
| --- | --- |
| `js/data.js` | One new commented block of **45 `ITEMS` entries** (`masterytrophy_*`, `explorationtrophy_*`) appended at the end of the `ITEMS` table, and one of **25 `FAMILIAR_TYPES` entries** appended at the end of that table. Zero pre-existing lines removed; every pre-existing item and familiar asserted deep-equal. |
| `js/items.js` | **45 new additive terms** in `recalcPlayerStats` (48 term-instances — damage owns two lines, melee + ranged), appended to the same 16 formula lines across the same 15 stat channels Slice 7 used. No existing term altered. `applyPassiveEffect` **not touched** — asserted byte-identical. |
| `js/achievements.js` | **70 reward fields**: `itemId` spliced onto the 15 `exploration_destroy_*` declarations, and `itemId`/`familiarId` added to 55 tier objects inside 26 `addTierSet` `tiers:[...]` arrays. Exactly 70 lines differ; every one is its old self plus one field. |

No other file was touched. `js/familiars.js` was read (not modified) to confirm
the familiars needed no code at all — see below.

---

### The 45/25 split, and why

| Bucket | Count | Reward kind | Why |
| --- | --- | --- | --- |
| Mastery — tiers 1 & 2 of all 15 stat ladders | 30 | **item** | Stat-grind rungs; a small passive stat stick is the same currency the grind is denominated in, and matches Slice 7's precedent for high-volume trophies. |
| Exploration bucket A — `exploration_destroy_<kind>` | 15 | **item** | The 15 per-obstacle destruction achievements, structurally the twin of Slayer's per-enemy tail. Same treatment. |
| Exploration buckets B/C/D — non-capstone tiers of the 8 ladders | 16 | **familiar** | 3 breadth + 3 room-visit + 2 dedication ladders × tiers 1–2. Exploration/collection ladders reward *breadth*, and a companion reads as a souvenir of where you have been rather than another stat line. |
| Collection — non-capstone tiers of the 3 ladders | 9 | **familiar** | `collection_items` t1–t4, `collection_trinkets` t1–t3, `collection_familiars` t1–t2. Same reasoning; `collection_familiars` granting familiars is also self-referential in the right way. |

**45 items + 25 familiars = 70.** Every count above was re-derived from the
runtime `ACHIEVEMENTS` array before a byte was written (the dispatch's figures
were treated as a hypothesis, and matched exactly). `ITEMS` 616 → **661**,
`FAMILIAR_TYPES` 94 → **119**, `TRINKETS` untouched at 178 — the scarce pool
stays scarce, and no existing item/trinket/familiar was reused as a reward, so
no pre-existing reward's exclusivity was disturbed.

### `unlockedBy` has NO runtime teeth — it is documentation only

The dispatch asked this to be settled rather than assumed. It is settled:

* `unlockedBy` occurs **386 times in the repo, every one of them inside
  `js/data.js`**. No `.js` or `.html` file ever reads the field. Grep for it
  outside `data.js` returns nothing.
* The actual gate is a *persisted set*, not the field. `unlockAchievement`
  writes `unlocks.unlockedItems[def.itemId] = true` (achievements.js:1698) /
  `unlocks.unlockedFamiliars[def.familiarId] = true` (:1706), and
  `isItemUnlocked` (:1678) / `isFamiliarUnlocked` (:60) read that map. The pool
  filters — `room.js:473` `!i.locked || isItemUnlocked(i.id)` and `room.js:549`
  for familiars — consult those functions.

So the binding that makes a reward real is **`achievement.itemId` → `ITEMS[id]`**,
in one direction only. A wrong `unlockedBy` would not break a grant, and a
*missing* one would not either — it would just leave a `locked:true` entry with
no documented owner. It still has to be right for a human reading `data.js`,
so all 70 are asserted to resolve to a real achievement id **and to round-trip**
(achievement → item/familiar → back to that same achievement).

One convention note: the 94 pre-existing familiars carry **no** `unlockedBy` at
all — it was an `ITEMS`/`TRINKETS`-only field until now. The dispatch specified
it for the 25 new familiars, and since it is inert and purely explanatory, adding
it is a documentation improvement rather than a behaviour change. It does mean
the familiar table is now mixed: 94 without, 25 with.

### The bug that a syntax check could not catch

The first pass appended each channel's new terms **after the last Slice-7 term
line**. For 11 of the 16 channel lines that line *also carries the statement's
closing punctuation* — e.g. crit chance ends `... (p.slayertrophy_boss_pressurechoir || 0));`,
where the second `)` closes a `Math.min(` wrapper. Appending after it put the new
terms **outside the assignment**, as a bare expression statement:

```js
  player.critChance = Math.min(0.75, ... );
    + 0.05 * (p.masterytrophy_bombsplaced_t2 || 0) + ...   // dead no-op
  player.revealMap = ...
```

**`node --check` passed on this.** Automatic semicolon insertion turns the
orphaned terms into a legal, completely inert expression statement — the items
would have existed, dropped, granted, and done *nothing*, silently, forever.

Caught by executing `recalcPlayerStats` for real: **39 of the 45 moved no stat
at all.** The fix splits the closer off the Slice-7 line and re-attaches it to
the last Slice-8 line, so the statement now closes after the new terms. This is
the same 11-line phenomenon Slice 7 documented ("11 lines rewritten — exactly
the 11 channel-closing lines whose trailing `)` / `;` moved down past the
appended terms"); Slice 7 got it right, and this slice's first pass did not.

**Lesson for any future batch: a text-presence check (`source.includes('(p.id || 0)')`)
does not prove a term is wired.** It only proves the characters are in the file.
Execute the function.

### Channel distribution — round-robin, minimum magnitudes

`channel = CHANNELS[i % 15]` over the 45 in file order → **exactly 3 per
channel**, all 15 channels. Magnitudes and desc strings are not re-invented:
both are read out of the *existing* file — each channel's magnitude is the one
Slice 7 established as that channel's smallest pre-existing per-item magnitude,
and each desc is copied from the Slice-7 item already on that channel, so an
item's description and its formula term cannot drift apart.

luck +1 · speed +0.05 · damage +1 (both melee and ranged lines) · fire rate
+0.05 · range +1 tile · boss damage +0.05 · lifesteal +0.04 · crit +0.05 ·
venom/stun/charm/freeze/fear +0.04 · magnet radius +20 · bomb radius +0.10.

The validator re-derives each channel's floor from the **pre-edit** source and
asserts the magnitude used is `<=` it, rather than trusting the table above.

### The 25 familiars need zero code — confirmed, not assumed

`js/familiars.js`'s `updateFamiliars` dispatches on `def.behavior` alone
(`'orbiter'` / `'shooter'` / `'proc'`, lines 33–35), and `updateProcFamiliar`
switches on `def.procType` over `heal` / `coin` / `luckpulse` / `charge`. Every
new familiar uses one of those three behaviors and, where a proc, one of those
four types — asserted. Nothing else in the engine needs to know they exist.

Split: **11 orbiters, 9 shooters, 5 procs.** All sit on the bands documented in
the `FAMILIAR_TYPES` header and in floors-11-13's audit — orbiter dmg1 → contact
cooldown 0.45, dmg2 → 0.70; shooter dmg1 → 0.85–1.10, dmg2 → 1.50–1.80; proc
heal 0.5/50s or 1/100s, coin 1/90s, charge 1/90s, luckpulse 1/120s — each
asserted per entry, with `radius`/`orbitSpeed`/`boltSpeed` also held inside the
ranges the existing 94 already span.

Within every ladder the `dmg` identity number **never decreases** as the tier
rises. Raw DPS is only compared *within* a behavior: an orbiter must make
contact and a shooter fires at range, so `dmg/cooldown` is not a single scale
across the two, and an earlier version of this check produced four false
failures by pretending it was.

---

### Verification performed

* `node --check` on all three touched files — **passes**, run after each pass
  and again as the final action. Also re-parsed the untouched dependents
  (`familiars.js`, `room.js`, `combat.js`, `game.js`, `main.js`, `entities.js`).
* All 45 items, 25 familiars, 48 formula terms and 70 achievement edits were
  **generated from the files' own declarations** by a throwaway script, never
  hand-typed per entry; the 70 achievement lines were produced by splicing one
  field into the live line, never by retyping it.
* A throwaway structural validator (scratchpad, **not committed**) loads
  `data.js` + `enemies.js` + `items.js` + `achievements.js` into one `vm`
  context and diffs against pre-edit snapshots — **9165 checks, all passing**:
  * totals: 718 achievements before and after, **zero** reward-free remaining;
    `ITEMS` 616 → 661, `FAMILIAR_TYPES` 94 → 119, `TRINKETS` unchanged;
  * the 70 targets each got exactly the planned reward, each was reward-free
    pre-edit, and none carries a second reward key;
  * **every pre-existing field of all 718 achievements is unchanged** — field
    sets compared key-by-key, values by `JSON.stringify` (and by source text for
    the `desc` functions), the only permitted delta being the one added key;
  * the **28** pre-existing M/E/C capstone rewards still hold their exact
    original reward and were not touched; every Slayer and Challenge entry
    likewise;
  * per new item: id matches key, `type:'passive'`, `quality:1`,
    `pools === POOLS_ALL`, `locked:true`, hex colour, non-empty desc, icon
    🏆/🧭, name unique against all 616 pre-existing item names;
  * per new familiar: `locked:true`, a behavior `familiars.js` dispatches on,
    band/range/proc-table conformance, unique name, `dmg` non-regression;
  * **`unlockedBy` round-trips in both directions** for all 70, and resolves to
    a real runtime achievement in Mastery/Exploration/Collection — this is the
    check that would catch a miscounted `_t<n>` index;
  * every new reward id is claimed by **exactly one** achievement across the
    runtime array (so the ~165 generated superboss rewards are in the
    comparison, per Slice 3's lesson);
  * **`applyPassiveEffect` byte-identical** to pre-edit, and none of the 45 new
    ids appears anywhere in its source;
  * magnitude discipline re-derived from the pre-edit source per channel;
  * **reversal test**: removing the Slice 8 lines and handing back the moved
    statement closers reproduces the pre-edit `items.js` character-for-character;
  * line diffs: `data.js` 0 lines removed (pure insertion), `achievements.js`
    same line count with exactly 70 lines changed and each equal to its old self
    plus one reward field, `items.js` exactly the 11 closer-moved lines.
* A separate **functional** harness (scratchpad, **not committed**) executes the
  real `recalcPlayerStats` against a stub player — **51 checks, all passing**:
  every one of the 45 new items produces a stat delta **identical** to an
  established Slice-7 item on the same channel, all 15 channels are observably
  live, and **zero** new items are inert. This is what caught the ASI bug above.

### NOT VERIFIED

* **Nothing was rendered.** No item pedestal, no familiar, no achievements panel
  was ever drawn. The 70 reward lines now shown on those rows, and the 25 new
  familiars' on-screen appearance, have not been seen.
* **No achievement fired, so no reward was ever handed over.** The
  `unlockAchievement` → `applyItemToPlayer` / `addFamiliar` path was not
  exercised for any of the 70, and no `locked` entry has been observed entering
  a pool via `isItemUnlocked` / `isFamiliarUnlocked`.
* **No familiar has ever updated.** `updateFamiliars` was never called for any of
  the 25. Their behavior/proc dispatch is asserted structurally against
  `familiars.js`'s branches, not observed; no orbiter has orbited, no shooter has
  fired, no proc has procced.
* **The functional harness is a stub, not the game.** `recalcPlayerStats` ran
  against a Proxy player with invented base values, not a real `Player`. It
  proves each new term is inside its statement and moves the stat its channel
  reference moves; it does not prove the resulting numbers are correct in play.
* **Balance is unvalidated.** 45 more minimum-magnitude stat sticks land on top
  of Slice 7's 254 on the *same 15 channels*, so Slice 7's warning compounds:
  **range** is now +1 tile × 20 items against a 12-tile clamp, and the uncapped
  **damage** channel is now +1 melee *and* +1 ranged × 20. Nobody has played
  this. The 25 familiars add free untargeted DPS on top, and although
  `FAMILIAR_DMG_GROWTH` keeps each one a supporting contribution, no one has
  checked how many a real run can accumulate now that the familiar pool is 119.
* **Pool dilution was not modelled.** 661 items and 119 familiars change every
  pedestal and pet-shop roll's odds for every pre-existing entry, even though the
  new ones unlock gradually.
* **Threshold *feel* is unchanged and still unvalidated** — this slice added no
  achievement and retuned no threshold, so every "unvalidated grind" caveat from
  Slices 3–5 carries over untouched.
* **The 25 familiars' names/icons were chosen by hand**, unlike the mechanical
  item names. They are asserted unique against the existing 94, but their
  thematic fit is a judgement call nobody has reviewed.
* **The game was never launched or played.** Static content only, per the task.
* Per the standing user constraint, no smoke testing or gameplay verification was
  performed; both harnesses are structural/functional checks, not playtests.

---

## achievements-500 — reward completion

**718 achievements, 718 with a reward.** Verified against the runtime
`ACHIEVEMENTS` array, not by grep: `ACHIEVEMENTS.length === 718` and
`ACHIEVEMENTS.filter(a => !['classId','itemId','trinketId','familiarId','starId','pickupKind','shopDiscount'].some(k => k in a)).length === 0`.

Reward inventory across the whole feature: Slices 2–6 declared 364 achievements
of which 40 shipped with a reward; Slice 7 added 254 items for Slayer; Slice 8
added 45 items and 25 familiars for the remaining 70 grind rungs. The tables
grew from 362 items / 94 familiars at the start of Slice 7 to **661 items /
119 familiars**, with `TRINKETS` deliberately untouched at 178 throughout both
reward batches.
