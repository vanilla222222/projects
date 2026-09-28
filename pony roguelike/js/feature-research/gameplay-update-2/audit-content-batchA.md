# Gameplay Update 2 — Content Batch A audit (Crypt + Forest)

Scope: `js/enemies.js` only. 20 regular enemies (10 stage 0, 10 stage 1) + 4 bosses
(2 stage 0, 2 stage 1). No other file touched; **no new AI was written** — every
`behavior` string used here already exists in `js/ai.js` and already has a `case`
in `combat.js`'s `updateEnemy` switch.

Both additions are fenced by matching markers so batches B/C/D can append cleanly:

```
/* ===== GAMEPLAY UPDATE 2 — CONTENT BATCH A (Crypt + Forest) — BEGIN ===== */
...
/* ===== GAMEPLAY UPDATE 2 — CONTENT BATCH A (Crypt + Forest) — END ===== */
```

One fence sits at the tail of `ENEMY_TYPES` (immediately before the SWARMER
entry), one at the tail of `BOSS_TYPES`.

---

## 1. Regular enemies — stage 0 (Crypt)

### New archetypes (5)

| id | name | stage | behavior | hp/dmg/speed/radius |
|---|---|---|---|---|
| `pallweaver` | DNB Pall Weaver | 0 | `weaver` | 4 / 2 / 84 / 11 |
| `ossuarysentry` | DNB Ossuary Sentry | 0 | `sentry` | 5 / 1 / 44 / 12 |
| `tombbloater` | DNB Tomb Bloater | 0 | `splitter` (→ `cryptmite`) | 5 / 2 / 66 / 13 |
| `miasmadrifter` | DNB Miasma Drifter | 0 | `bomber` + `flies:true` | 3 / 2 / 86 / 11 |
| `dirgechanter` | DNB Dirge Chanter | 0 | `ranged` + `shotCount:3` | 3 / 1 / 50 / 11 |

Why these are genuinely new for the Crypt: the existing 30-odd stage-0 entries
already cover chaser / ranged / shielded / charger / turret / flyer / bomber /
leaper / orbiter / burrower / summoner / healer / sniper / swarm / ambusher /
teleporter / shielder / lobber. The three behaviors with **zero** stage-0
representative were `weaver`, `sentry` and `splitter` — those are the first
three. The remaining two are new *shapes* on behaviors the stage does have:

- `miasmadrifter` is the Crypt's first **airborne** bomber (`flies:true`), with a
  long 1.3s fuse and an 88px blast vs. Death Rattler's 1.1s / 72px — it floats
  over pits and gives more reaction time for a much bigger circle.
- `dirgechanter` is the Crypt's first multi-shot enemy at all — nothing in
  stage 0 previously set `shotCount`. `fireSpread` (ai.js) makes this pure data.

### Reskin variants (5)

Following the `skullcharger` / `sandcharger` / `hellcharger` pattern: same
`behavior`, recoloured, renamed, recalibrated. Source noted inline in the file.

| id | name | stage | behavior | source | hp/dmg/speed/radius |
|---|---|---|---|---|---|
| `shroudmoth` | DNB Shroud Moth | 0 | `orbiter` (flies) | `glowmoth` (1) | 3 / 1 / 92 / 9 |
| `charnelmites` | DNB Charnel Mites | 0 | `swarm` | `gnatcloud` / `cryptmite` | 2 / 1 / 138 / 7 |
| `cryptleech` | DNB Crypt Leech | 0 | `leaper` | `direfox` (1) | 3 / 2 / 64 / 10 |
| `tombtoller` | DNB Tomb Toller | 0 | `ranged` | `creepervine` (1) | 5 / 2 / 38 / 13 |
| `boneskitter` | DNB Bone Skitter | 0 | `chaser` | `venomskitter` / `ashskitter` | 2 / 2 / 132 / 9 |

`boneskitter` deliberately extends the prior batch's "skitter" family
(`venomskitter` s1, `ashskitter` s3) with its missing Crypt member.
`charnelmites` extends the "mites" family (`gloommites`, `flurrymites`,
`hailmites`, `undertowmites`, `wailmites`, `goldenmites`) — it is 1 HP tougher
and drifts slightly less (0.5 vs 0.6) than `cryptmite`, so it reads as a heavier
cousin rather than a duplicate.

## 2. Regular enemies — stage 1 (Forest)

### New archetypes (5)

| id | name | stage | behavior | hp/dmg/speed/radius |
|---|---|---|---|---|
| `bramblewarden` | DNB Bramble Warden | 1 | `shielder` | 5 / 1 / 52 / 12 |
| `acornmortar` | DNB Acorn Mortar | 1 | `lobber` | 4 / 2 / 54 / 12 |
| `bristleback` | DNB Bristleback | 1 | `ranged` + `shotCount:5`, `keepDistance:130` | 5 / 1 / 58 / 13 |
| `thistlepod` | DNB Thistle Pod | 1 | `turret` + `shotCount:3` | 5 / 1 / 0 / 12 |
| `hivestump` | DNB Hive Stump | 1 | `summoner` (→ `stingswarm`) | 6 / 1 / 46 / 13 |

`shielder` and `lobber` were the only two behaviors with no stage-1 entry, so
those are the first two. The other three are new roles:

- `bristleback` is a **close-range shotgun** — `keepDistance:130` is the shortest
  of any `ranged` entry in the file (next shortest is `creepervine`'s 150), and
  it fires 5 bolts across a wide 0.9 rad fan at a slow 170 speed. It wants to be
  in your face, which inverts what "ranged" means everywhere else in the game.
- `thistlepod` is an emplacement that fires a 3-bolt fan instead of `owlsentinel`'s
  single aimed bolt, at a much slower 2.2s cadence — area denial, not chip.
- `hivestump` is the first summoner in the game whose minion is a **bomber**
  (`stingswarm`) rather than a chaser/swarmer. `summonCount:1` / `maxSummons:5` /
  5.5s cooldown keeps the total bomber pressure below `sporeseeder`'s 2-per-wave
  sprouts, because a bomber is worth far more than a sprout. `weight:0.6` so a
  room's featured-type roll doesn't stack four of them.

### Reskin variants (5)

| id | name | stage | behavior | source | hp/dmg/speed/radius |
|---|---|---|---|---|---|
| `puffcap` | DNB Puffcap | 1 | `bomber` (flies) | `miasmadrifter` (this batch) | 3 / 2 / 88 / 11 |
| `loamweaver` | DNB Loam Weaver | 1 | `weaver` | `thicketweaver` / `pallweaver` | 5 / 2 / 78 / 12 |
| `oaksentry` | DNB Oak Sentry | 1 | `sentry` | `barkwatcher` / `ossuarysentry` | 6 / 1 / 40 / 13 |
| `burrbloater` | DNB Burr Bloater | 1 | `splitter` (→ `sprout`) | `sapling` / `tombbloater` | 6 / 2 / 62 / 14 |
| `sporechanter` | DNB Spore Chanter | 1 | `ranged` + `shotCount:3` | `dirgechanter` (this batch) | 4 / 1 / 52 / 11 |

## 3. Stat-calibration reasoning

`hp` is an identity number multiplied by `enemyHpScale = 1.32^floorNum`, so
everything below was authored by reading the **same-stage** neighbours, never in
isolation and never against the deep floorKey rosters (whose 10-12 HP entries
are authored against 16x-27x scaling).

- **Crypt band**: existing stage 0 spans hp 1 (`cryptmite`) to 7
  (`tombguardian`), with the bulk at 2-5. Every new Crypt entry lands 2-5 — no
  new stage-0 ceiling was set. Compared against `bonelobber` (4/2/55/12),
  `cryptwarden` (5/1/52/12), `cryptcircler` (3/1/85/10) and `urnlurker` (4/3/58/12).
- **Forest band**: existing stage 1 spans 1 (`gnatcloud`) to 9 (`mosshide`), bulk
  2-6. New entries land 3-6; the two 6s (`oaksentry`, `burrbloater`, plus
  `hivestump`) are all slow (≤62 speed) or immobile support pieces, matching
  `rootburrower` (6/2/60/13) which is the existing stage-1 6.
- **Speed/radius pairing** follows the file's implicit rule that speed and radius
  trade off: the 130-140 speed entries (`charnelmites`, `boneskitter`) are r7-9
  and hp ≤2; the r13-14 entries (`oaksentry`, `burrbloater`, `hivestump`,
  `tombtoller`) sit at 38-62 speed.
- **dmg** is a half-heart count scaled elsewhere (`playerDamageAmount`), so it
  stays 1-2 across the batch. dmg 3 was reserved for nothing here — the existing
  stage-0/1 dmg-3 slots are all dedicated bruisers/chargers (`tombguardian`,
  `hollowknight`, `mosshide`, `boarrusher`), and this batch adds no new bruiser.
- **Support pieces get `dmg:1`** without exception (`ossuarysentry`,
  `bramblewarden`, `thistlepod`, `hivestump`, `oaksentry`, `bristleback`,
  `dirgechanter`, `sporechanter`) — matches every existing shielder/healer/
  summoner/turret in the file. Multi-shot entries are all dmg 1 for the obvious
  reason that a 3- or 5-bolt fan multiplies output.
- **Multi-shot cadence tax**: every `shotCount` entry pays for it in
  `fireCooldown` — `dirgechanter` 2.2s and `sporechanter` 2.1s vs. the
  single-bolt `cryptslinger` 1.6s / `vineslinger` 1.5s; `thistlepod` 2.2s vs.
  `owlsentinel` 1.6s; `bristleback` 2.4s.
- **xpTier**: stage 0-3 entries need one (it's the floor-in-stage gate in
  room.js). Cheap/low-threat pieces got 1 (`shroudmoth`, `charnelmites`,
  `bramblewarden`, `thistlepod`); everything with real threat or real value got 2.
- **`weight`**: only `hivestump` and `oaksentry` carry `weight:0.6`, the file's
  established damper for types that are miserable in multiples.
- **Colours**: every new hex pair was checked against the whole file. Three
  initial picks collided with a same-stage or near-stage entry and were nudged
  (`loamweaver` → `#6f5a2e`, `acornmortar` → `#93713a`, `bristleback` → `#72913f`).
  Remaining overlaps are only against 10A/10B/floorKey pools that never share a
  room with stage 0/1.

## 4. Bosses

All four **reuse an existing `bossXxx` behavior** — verified present as
`function aiBossXxx(` in `js/ai.js` AND as a `case 'bossXxx':` in `combat.js`'s
`updateEnemy` switch (an unmatched boss behavior would fall through to the
`default:` branch, which console.warns once and runs `aiChase` — i.e. a boss that
just walks at you. Avoided entirely).

Selection constraints applied, in order:
1. Not already borrowed by a second boss (the 11A-12B block already borrows
   `bossFurnaceHeart`, `bossGraveChorus`, `bossRotBloom`, `bossGlassScorpion`,
   `bossSlagbound`, `bossAntlerWarden`, `bossDuneRavager`, `bossColossus`).
2. **Spawns no minions** — `aiBossWarlord`/`aiBossBoneSentinel`/`aiBossBoneCaller`/
   `aiBossHiveMother`/`aiBossSandWyrm`/`aiBossBrambleQueen` all hardcode a
   minion `ENEMY_TYPES.x`, and several of those are Desert/Inferno types. Same
   rule the existing 11A-12B block states for itself.
3. **No hardcoded off-theme projectile colour** in a stage it doesn't belong to.
4. Four *different fight shapes* across the four entries.

| id | name | stage | behavior (reused from) | hp/dmg/speed/radius |
|---|---|---|---|---|
| `mausoleumtitan` | The Mausoleum Titan | 0 | `bossBrickGolem` (9B Brick Golem) | 50 / 3 / 36 / 32 |
| `sepulchershade` | The Sepulcher Shade | 0 | `bossShadowStalker` (9A Shadow Stalker) | 44 / 2 / 78 / 22 |
| `hollowstag` | The Hollow Stag | 1 | `bossCanopyStalker` (10B Canopy Stalker) | 44 / 2 / 74 / 22 |
| `fenwarden` | The Fen Warden | 1 | `bossFrostSentinel` (9B Frost Sentinel) | 50 / 3 / 40 / 30 |

Stage 0 now has 6 bosses, stage 1 now has 6 (from 4 each).

### How each was differentiated

**Important constraint, documented in-file:** the `aiBossXxx` functions hardcode
their own pattern constants (telegraph lengths, dash multipliers, projectile
counts, colours) — apart from `aiBossRotBloom`'s `burstRadius`, none of them read
tuning off `e.type`. The levers a table entry actually has are therefore
`hp` / `dmg` / `speed` / `radius`. `speed` is the strongest of these, because
every dash in those functions is literally `e.speed * <multiplier>` and every
approach is `chaseSeek(..., e.speed …)` — so a speed change rescales the entire
encounter's tempo, not just its walk. Each entry was pushed into a different
weight class from its donor rather than recoloured at the same numbers:

- **Mausoleum Titan** (`bossBrickGolem`, donor 56/3/42/28): speed 42 → **36**, so
  the function's 4.4x wind-up dash lands ~15% slower and is far easier to read;
  radius 28 → **32**, wider than the Colossus Husk, so the dodging lane is what
  actually runs out. hp 56 → 50, pulled into the Crypt's 46-52 band (Brick
  Golem's 56 was authored for floor 8's `bossHpScale`). Net: a siege engine, not
  a golem-shaped bruiser.
- **Sepulcher Shade** (`bossShadowStalker`, donor 52/2/62/24): fully inverted into
  a glass cannon — **hp 44**, the lowest of any regular boss in the file, and
  **radius 22**, the smallest in the Crypt; paid back with speed 62 → **78**, which
  turns the between-blink `chaseSeek(…, 0.7)` from a stroll into a real pursuit.
  Donor = durable teleporting bruiser; this = fragile, frantic assassin.
- **Hollow Stag** (`bossCanopyStalker`, donor 52/2/66/25): pushed further along the
  same axis the donor sits on rather than across it — speed **74** through that
  function's 5.2x dash is the fastest lunge of any regular boss (≈385 px/s),
  but hp **44** / radius **22** means the fight is short if you commit to hitting
  it. The donor at 52/25 can absorb the whiffs; this one cannot.
- **Fen Warden** (`bossFrostSentinel`, donor 52/2/52/24): the donor is a kiter you
  chase down. At speed **40** its "back off when the player is within 190" step
  barely outpaces a walk, so it reads as an emplacement that shuffles — and
  **dmg 3** (donor 2) plus **radius 30** (donor 24) makes closing the distance the
  expensive option. Same 3-bolt fan on a 1.6s hardcoded timer, opposite fight:
  "kite it down" becomes "rush it or eat fans". Its pale-blue hardcoded bolts
  read as fen mist against a `#5a7a6a` bog-green body.

## 5. Verification performed

- `node --check js/enemies.js` → clean.
- Programmatic pass over the parsed `ENEMY_TYPES` / `BOSS_TYPES` literals:
  - 255 enemy entries, 38 boss entries, **zero duplicate keys**, every `id`
    matches its key (so no silent shadowing of the ~220 pre-existing ids, the
    prior batch's 15, or each other).
  - Every enemy `behavior` is in the `updateEnemy` switch's regular-enemy set.
  - Every boss `behavior` resolves to an existing `function aiBossXxx(` in ai.js
    **and** an existing `case` in combat.js.
  - Every `splitInto` (`cryptmite`, `sprout`) and `summonId` (`stingswarm`)
    resolves to a real `ENEMY_TYPES` key — `handleEnemyDeath`'s splitter branch
    and `aiSummoner` both look these up by id and no-op on a bad one.
  - Stage counts: stage 0 = 38 enemies / 6 bosses, stage 1 = 40 enemies / 6 bosses.
- Grepped all 24 new ids against `js/` before writing: all clear.

No light in-game smoke test was run beyond the above (per the project's
"no heavy smoke testing" rule) — this is a pure data addition with no new code
paths, and the parse + reference checks cover the failure modes that data can have.
