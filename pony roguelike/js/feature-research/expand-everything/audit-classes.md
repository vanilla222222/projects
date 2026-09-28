# Audit — 5 new playable classes (15 → 20)

## Files changed

| File | What changed |
| --- | --- |
| `js/data.js` | +5 entries appended at the **very end** of the `CLASSES` object literal (Crystal Pony, Mule, Alicorn, Changeling, Diamond Dog), plus an "APPEND-ONLY ZONE" comment explaining why order matters. Nothing else in the file touched. |
| `js/utils.js` | `Util.classPonyOpts` only — 5 new id mappings folded into the existing `hasHorn` / `hasFangs` / `hasTalons` / `hasScales` / `ghostly` expressions. `drawPony` itself untouched. |
| `js/achievements.js` | Reward pool grown 165 → 220 (`NEW_CLASS_REWARD_FAMILIARS` +47, `NEW_CLASS_REWARD_STARS` +8); count/breakdown comment block updated; `>= 15` magic number → `>= 20`; `challenge_wins_allclasses` desc "all 15 characters" → "all 20 characters"; 3 new `classId`-tagged unlock achievements. |
| `feature-research/expand-everything/audit-classes.md` | This file. |

**Not touched (out of scope, confirmed by grep that none of them need it):** `js/combat.js`, `js/entities.js`, `js/ui.js`, `js/enemies.js`, `js/room.js`, `js/shop.js`, `js/items.js`, `drawPony`.

`js/ui.js`'s `buildClassSelect` needed **zero** changes — it already iterates `for (const id in CLASSES)`, reads `def.sizeMult`, and finds the lock tooltip via `ACHIEVEMENTS.find(a => a.classId === id)`. Because all three new locked classes use `statKey`+`threshold`, the class-select card even renders a live progress counter ("Channel 25 stars (7/25)") for free.

---

## The 5 new classes

### 1. Crystal Pony — `crystalpony` (unlocked by default, melee)

```js
id:'crystalpony', name:'Crystal Pony', color:'#8fd6e8', mane:'#d8b4f0',
unlocked:true,
redMax:8, speed:130, canFly:false,
attackType:'melee', meleeDamage:1.75, meleeCooldown:0.5,
startBombs:1, startKeys:0, startCoins:8,
```

Identity: the **tank**. `redMax:8` is the highest in the game (one over Dragon's 7). Paid for with the second-slowest legs (130, only Sea Pony/Kelpie's 120 is slower) and the weakest melee DPS in the game — 1.75/0.5 = 3.5 DPS vs Earth Pony's 5.0. 8 starting coins is a small extra identity beat, unique among unlocked classes.
Visual: `hasHorn` + `ghostly` (light through faceted gemstone) — a combination no existing class uses.

### 2. Mule — `mule` (unlocked by default, melee)

```js
id:'mule', name:'Mule', color:'#8a7a6a', mane:'#3a3028', sizeMult:1.18,
unlocked:true,
redMax:7, speed:132, canFly:false,
attackType:'melee', meleeDamage:2.2, meleeCooldown:0.48,
startBombs:3, startKeys:2, startCoins:12,
```

Identity: the **pack animal**. Its distinctness is the starting kit, not the combat numbers — 3 bombs / 2 keys / 12c is by far the richest opening in the game (nothing else starts with more than 1 bomb + 1 key). Combat is deliberately a slightly worse Earth Pony: 4.58 DPS vs 5.0, 132 speed vs 150, with one extra heart to compensate.
Visual: the only new class with **no** accessory flags at all — deliberate. Its silhouette is `sizeMult:1.18` (a bigger frame, mirroring how Breezie's 0.62 reads as tiny). `sizeMult` is purely cosmetic — grepped both call sites (`render.js:762`, `ui.js:565`); it scales `drawPony`'s size argument only and does **not** touch the hitbox, so there's no hidden balance cost.

### 3. Alicorn — `alicorn` (LOCKED, ranged)

```js
id:'alicorn', name:'Alicorn', color:'#f0e6f5', mane:'#c98ae0',
unlocked:false, unlockHint:'Channel 25 stars',
redMax:4, speed:165, canFly:true,
attackType:'ranged', rangedDamage:1.8, fireCooldown:0.5, boltSpeed:400,
```

Identity: flight **and** magic, the one class with both wings and horn — bought with the joint-lowest heart count of any full-size class (4, tied with Zebra/Bat Pony/Hypogriff). 3.6 DPS puts it mid-pack among ranged classes, above Griffin's 3.33 and well under Sea Pony's 4.17.
Visual: `hasWings` (from `canFly`) + `hasHorn`. Verified against all 15 existing classes: wings+horn was genuinely unused.

### 4. Changeling — `changeling` (LOCKED, ranged)

```js
id:'changeling', name:'Changeling', color:'#3a3f46', mane:'#5ae0a0',
unlocked:false, unlockHint:'Collect 25 familiars',
redMax:4, speed:170, canFly:true,
attackType:'ranged', rangedDamage:1.4, fireCooldown:0.4, boltSpeed:340,
lifedrinkChance:0.18,
```

Identity: the only class that **flies, shoots and drains**. `lifedrinkChance:0.18` is the highest in the game (Bat Pony's is 0.12), which is why the bolts are weak (3.5 DPS) and the hide is thin. Verified `lifedrinkChance` is read fully generically — `entities.js:22` (`def.lifedrinkChance || 0`) and `items.js:325` (recalc after Thirstfang), no `classId === 'batpony'` special-casing anywhere.
Visual: `hasWings` + `hasHorn` + `hasFangs` + `hasScales` (carapace) — four existing flags, a combination no class uses.

### 5. Diamond Dog — `diamonddog` (LOCKED, melee)

```js
id:'diamonddog', name:'Diamond Dog', color:'#a8926e', mane:'#5a4a32',
unlocked:false, unlockHint:'Destroy 100 rocks with bombs',
redMax:7, speed:140, canFly:false,
attackType:'melee', meleeDamage:2.5, meleeCooldown:0.55,
startBombs:4, startKeys:0, startCoins:20,
```

Identity: the **demolition bruiser** — 4 bombs and 20c to start (the most bombs of any class), the heaviest single blow among the tanky classes, on the slowest swing in the game (0.55s → 4.55 DPS). Deliberately kept at 2.5, *under* the Zebra's 2.6, so the Zebra's "hardest-hitting hoof in Equestria" flavour text stays true.
Visual: `hasTalons` alone — the only talon-bearer without a beak or wings, so it reads as digging claws rather than a raptor's foot.

### Design-space check against the existing 15

No new class duplicates an existing stat profile: Crystal Pony owns the new 8-heart ceiling, Mule owns the supply-kit opening, Alicorn owns the wings+horn slot, Changeling owns flight+ranged+drain, Diamond Dog owns bombs+heaviest slow claw. Every field used is from the documented set (`redMax`, `speed`, `canFly`, `attackType`, `meleeDamage`/`meleeCooldown`, `rangedDamage`/`fireCooldown`/`boltSpeed`, `startBombs`/`startKeys`/`startCoins`, `sizeMult`, `lifedrinkChance`, `unlocked`/`unlockHint`, `desc`). **No `laser`, no `charged`, no `baseRangeTiles`, no `unlimitedRange`, no `noRedContainers`, no `damageTakenMult`** — i.e. nothing that would need a bespoke `combat.js` branch. `js/combat.js` required zero edits, as intended.

---

## Reward-pool arithmetic proof

`js/achievements.js` builds one `sb_<bossId>_<classId>` achievement per (superboss × class) pair and indexes `SUPERBOSS_REWARDS[_rewardIndex++]` with **no modulo**, so `SUPERBOSS_REWARDS.length` must equal the grid size exactly.

**Grid size**
- `SUPERBOSSES` (js/enemies.js) keys, enumerated by script: `polish tyrone pineapple israel algae lilac plapper clapper nhm vanilladnb onetruednb` = **11**
- `CLASSES` (js/data.js) keys after this change = **20** (15 + 5)
- `_rewardIndex` after the nested loop = 11 × 20 = **220**

**Pool size**

| Segment | Before | After | Δ |
| --- | ---: | ---: | ---: |
| `TRINKET_LIST.filter(t => t.locked && !t.donationReward)` | 125 | 125 | 0 |
| `ACHIEVEMENT_PICKUP_KINDS` | 7 | 7 | 0 |
| `NEW_CLASS_REWARD_ITEMS` | 4 | 4 | 0 |
| `NEW_CLASS_REWARD_FAMILIARS` | 25 | 72 | **+47** |
| `NEW_CLASS_REWARD_STARS` | 4 | 12 | **+8** |
| **Total** | **165** | **220** | **+55** |

220 == 220, so the `_rewardIndex !== SUPERBOSS_REWARDS.length` guard stays silent. This was not eyeballed — it was computed by loading `js/data.js` in a `vm` context and re-deriving all five segments from the live tables, which also confirmed:
- every id in all three `NEW_CLASS_REWARD_*` lists resolves in its table (`FAMILIAR_TYPES` / `STAR_TYPES` / `ITEMS`) — **0 missing**;
- no duplicates within the familiar list or the star list, and none of the 55 new ids was already spoken for by any other `familiarId:` / `starId:` / `itemId:` achievement in the file.

**Why the split is 0 items / 47 familiars / 8 stars** rather than the suggested ~15/~30/~10: every `locked:true` item in `ITEMS` is already handed out by some achievement, except `slayertrophy_boss_brambleQueen` (a boss trophy, not a suitable generic reward), so `NEW_CLASS_REWARD_ITEMS` could not grow at all. The 8 stars are literally every remaining `STAR_TYPES` id, so the other 47 slots had to come from familiars (86 were free; 47 taken, 39 left over as headroom for the next expansion).

**Known cosmetic caveat, documented in the code comment:** the 55 newly-referenced familiars/stars are all `locked:false` in `data.js`, so "unlocking" them is a formality. This matches the precedent the file already acknowledges for the supermassive-update-batch trinkets. I deliberately did **not** flip their `locked` flags: doing so for the stars would take the pool of start-unlocked stars from 8 to **0**, which would break star pickups on a fresh save. The invariant the guard actually protects — that no achievement indexes past the end of the pool and silently grants nothing — is fully intact.

**Ordering safety:** the 5 new entries are appended after `dnbpony` at the bottom of the literal, so all 165 pre-existing (boss × class) pairings keep the exact reward they had before; the 55 new pairings consume the 55 appended pool entries in order.

---

## Per-class unlock wiring

Crystal Pony and Mule are `unlocked:true` and therefore have **no achievement at all** — consistent with earth/pegasus/unicorn.

The three locked classes all use the **`statKey` + `threshold` ladder** pattern (exactly how Windigo / Kelpie / Breezie are gated), not a scripted boss/floor trigger:

| Class | Achievement id | Condition | statKey | Existing `bumpStat` call site (no new wiring added) |
| --- | --- | --- | --- | --- |
| Alicorn | `unlock_alicorn` — "Ascension" ✨ | Channel 25 stars | `starsUsed` | `js/stars.js:21` |
| Changeling | `unlock_changeling` — "Hive and Hunger" 🪲 | Collect 25 familiars | `familiarsCollected` | `js/items.js:599` |
| Diamond Dog | `unlock_diamonddog` — "Gems!" 💎 | Destroy 100 rocks with bombs | `rocksBombed` | `js/combat.js:1175, 1181, 1234, 1237` |

Each is `{ id, name, icon, desc, category:'Characters', classId:'<id>', statKey, threshold }` — the same shape as `unlock_windigo`.

**This is the documented deviation, and it is the fallback the brief explicitly permits.** Rather than invent three brand-new trigger conditions needing hand-written `unlockAchievement(...)` call sites in `game.js`/`combat.js`, all three reuse the automatic path: `bumpStat()` looks the key up in `_ACHV_BY_STATKEY` and fires every watcher whose `threshold` is met (`achievements.js:1834-1844`), and `addAchievement` indexes new defs into that map automatically. Consequences:

- **Zero call sites added anywhere.** `js/game.js`, `js/combat.js`, `js/main.js`, `js/stars.js`, `js/items.js` are all unmodified — the three stat keys were verified by grep to already be bumped in live gameplay code.
- Each threshold is set clear of the existing achievement that watches the same key, so the new ones fire strictly later and don't collide: `starsUsed` (new: 25), `familiarsCollected` (existing `batling` at 10, new: 25), `rocksBombed` (existing `blastplating` at 30, new: 100).
- Bonus: because they're stat-based, `buildClassSelect` shows a live "(n/25)" progress readout on the locked card, which a scripted boss trigger would not have given.
- None of the three is wired into the `SUPERBOSS_REWARDS` matrix as a reward, per the brief — they are independent `Characters`-category achievements.

---

## Verification performed

- `node --check js/data.js` — OK (run immediately after the CLASSES append)
- `node --check js/utils.js` — OK (run immediately after the classPonyOpts edit)
- `node --check js/achievements.js` — OK (run after the pool growth, and again after the achievement additions)
- Script-verified against the live tables: `Object.keys(CLASSES).length === 20`; pool == 220; grid == 11 × 20 == 220; MATCH true; 0 missing ids; 0 duplicates.
- Grep-verified `>= 20` is now the only class-count assumption left: no remaining `15`-near-`CLASSES` occurrence anywhere in `js/`. Two stale spots were found and fixed, not one — the `>= 15` check **and** `challenge_wins_allclasses`'s player-facing desc, which still read "Win a run with all 15 characters."
- Grep-verified nothing outside the reward matrix hardcodes a class count (`Object.keys(CLASSES)` appears nowhere else in the repo).
- Grep-verified `sizeMult` and `lifedrinkChance` are consumed generically, so Mule and Changeling need no code support.

Per the repo's testing convention this was a syntax + arithmetic pass, not a playthrough — the new classes are pure data and should be confirmed in-game by picking Crystal Pony and Mule off the class-select screen.
