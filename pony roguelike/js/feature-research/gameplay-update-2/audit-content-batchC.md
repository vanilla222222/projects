# Content Batch C — 9A / 9B / 10A / 10B

Scope: `js/enemies.js` only. 40 regular enemies (10 per branch-floor `floorKey`)
and 8 bosses (2 per `floorKey`). Fenced as
`GAMEPLAY UPDATE 2 — CONTENT BATCH C (9A/9B/10A/10B) — BEGIN/END` in both
`ENEMY_TYPES` (immediately after Batch B's END, before the SWARMER note) and
`BOSS_TYPES` (immediately after Batch B's END, before the closing brace).
Batch D (11A/11B/12A/12B) appends after those END markers.

## Verified baseline (counted live, not assumed)

`floorKey` occurrences before this batch: 9A 23, 9B 22, 10A 22, 10B 23
(each figure includes that key's 2 bosses). After: 9A 35, 9B 34, 10A 34,
10B 35 — i.e. 9A 21→31 enemies, 9B 20→30, 10A 20→30, 10B 21→31, and 2→4
bosses apiece. 11A/11B/12A/12B untouched (11/10/11/10, unchanged).

## Themes read off the existing rosters

- **9A** — shadow / storm / void. Desaturated indigo-violet (`#3a3555`,
  `#5a4a7a`, `#8a3a9c`), names like Voidwhisper, Gloom Roller, Umbral Delver.
- **9B** — frost *plus* masonry: an ice-clad fortress. Two colour families run
  side by side, pale blue (`#7fa8c9`, `#cfe8f7`) and brick/kiln brown
  (`#8a5a4a`, `#6a4a3a`). Names split the same way (Frostbiter / Mason Brute).
- **10A** — glacier. Same blue as 9B but colder and lighter, no brown at all;
  bodies run 1-2 hp heavier (glacierbeast 9, crevassedelver 7).
- **10B** — jungle. Greens and gold (`#3a6a2a`, `#8a6a3a`, `#c9e08a`).

## Calibration reasoning (regular enemies)

Branch-floor pools sit well above the stage 0-3 rosters, so every number below
was compared against SAME-`floorKey` neighbours only. The bands actually
present in these four pools:

| role | existing band (9A/9B/10A/10B) | batch C placement |
|---|---|---|
| swarm chaff | hp 2, spd 145-150 | untouched (already covered everywhere) |
| light skirmisher | hp 3-4, spd 100-120, r 9-11 | drones/circlers/lurkers here |
| caster / support | hp 3-5, spd 44-72, r 10-12 | chanters, menders, callers |
| emplacement | hp 5-6, spd 0-48, r 12-13 | spires, mortars, wardens |
| bruiser | hp 6-9, spd 38-72, r 13-17 | husks/bloaters at 6-8 |

Rules applied throughout:
- `splitter` bodies are the heaviest new entries (hp 7 on 9A/9B, hp 8 on
  10A/10B) because the corpse is a second wave — they match the pool's own
  top-end chaser (stormlurker 7, glacierbeast 9) rather than its mid tier.
- Anything given `flies:true` is capped at hp 4 (matches nightflyer/gustwing/
  pollenflyer at hp 3-4) since it ignores obstacles.
- `sniper` carries `weight:0.6`, copying voidmarksman/frostmarksman/
  iciclemarksman — the same-pool convention for long-range specialists.
- Reskins invert their donor's axis rather than nudging it (fast+fragile vs.
  slow+heavy), so a pool never gets two entries that play identically.
- 10A/10B entries run ~1 hp above their 9A/9B counterparts, mirroring the
  step the base rosters already take between floorNum 8 and 9.
- No `xpTier` on any entry: `floorKey` pools deliberately carry none.
- Every colour/dark pair is unique file-wide (verified by scan).

### 9A — shadow / storm / void

New archetypes (`splitter`, `summoner`, `healer` had no 9A entry at all; the
other two are new shapes — 9A's first flying bomber, and its first multi-shot
fan via `shotCount`):

| id | name | behavior | notes |
|---|---|---|---|
| `voidhusk` | DNB Void Husk | splitter | hp 7 / dmg 2 / spd 72 / r 14; `splitInto:'gloommites'` |
| `shadecaller` | DNB Shade Caller | summoner | hp 5 / spd 52 / r 12; `summonId:'gloommites'` ×2, cd 5.5, max 6 |
| `duskmender` | DNB Dusk Mender | healer | hp 5 / spd 74 / r 11; heal 3 / cd 2.8 / r 155 |
| `thunderdrone` | DNB Thunder Drone | bomber | hp 4 / spd 106 / r 11; `flies:true`, fuse 0.85, blast 86 |
| `galechanter` | DNB Gale Chanter | ranged | hp 4 / spd 54 / r 11; `shotCount:3`, spread 0.42 |

Reskins:

| id | name | behavior | donor & differentiation |
|---|---|---|---|
| `nullmarksman` | DNB Null Marksman | sniper | ← voidmarksman: shorter range (500 vs 540), faster tell (0.95 vs 1.2), hp 3 / dmg 3 — a rushing sniper |
| `riftcircler` | DNB Rift Circler | orbiter | ← stormcircler: tighter orbit 115 / faster 1.55, single bolt instead of a 2-shot fan, hp 3 / dmg 2 |
| `sableroller` | DNB Sable Roller | charger | ← gloomroller: hp 8→6, spd 50→64, telegraph 0.6→0.45 — a jab, not a siege |
| `wraithspire` | DNB Wraith Spire | turret | ← gloomturret: 4-shot fan (spread 0.7) at half the fire rate, hp 5→6 |
| `hollowdelver` | DNB Hollow Delver | burrower | ← umbraldelver: hp 6→5, dmg 2→3, surfaces faster (cd 2.4 / time 1.2) |

### 9B — frost + masonry

New archetypes (`splitter`, `orbiter`, `burrower` had no 9B entry; plus 9B's
first flying bomber — icebomber walks — and its first `shotCount` fan):

| id | name | behavior | notes |
|---|---|---|---|
| `rimehusk` | DNB Rime Husk | splitter | hp 7 / dmg 2 / spd 70 / r 14; `splitInto:'flurrymites'` |
| `cairncircler` | DNB Cairn Circler | orbiter | hp 4 / spd 102 / r 9; `flies:true`, 2-shot fan, tuned off 9A's stormcircler |
| `quarrydelver` | DNB Quarry Delver | burrower | hp 7 / dmg 2 / spd 64 / r 14 (masonry side, brown palette) |
| `glacierdrone` | DNB Glacier Drone | bomber | hp 4 / spd 104 / r 11; `flies:true`, fuse 0.85, blast 84 |
| `mortarwright` | DNB Mortar Wright | ranged | hp 5 / spd 50 / r 12; `shotCount:3`, spread 0.44 |

Reskins:

| id | name | behavior | donor & differentiation |
|---|---|---|---|
| `masonhusk` | DNB Mason Husk | splitter | ← rimehusk: brick palette, `splitInto:'frostbiter'` (a chaser, not chaff), slower/heavier hitbox r 15, dmg 3 |
| `hoarfrostspire` | DNB Hoarfrost Spire | turret | ← sentrytower: 4-shot fan spread 0.72 at cd 2.2 vs the single fast bolt |
| `chiselcharger` | DNB Chisel Charger | charger | ← palisadecharger: hp 5→6, spd 58→62, telegraph 0.55→0.45 |
| `sleetlurker` | DNB Sleet Lurker | ambusher | ← rubblelurker: hp 5→4, dmg 3→2, shorter trigger 100 but faster dash 7.2 — a twitch trap |
| `brickmender` | DNB Brick Mender | healer | ← hearthtender: heals less (2 vs 3) far more often (cd 2.2) at a wider 175 radius; hp 4→6 so it outlives its patients |

### 10A — glacier

New archetypes (`splitter`, `shielder`, `lobber` had no 10A entry; plus 10A's
first flying bomber — frostbomber walks — and its first `shotCount` fan):

| id | name | behavior | notes |
|---|---|---|---|
| `seracbloater` | DNB Serac Bloater | splitter | hp 8 / dmg 2 / spd 68 / r 15; `splitInto:'hailmites'` |
| `cornicewarden` | DNB Cornice Warden | shielder | hp 7 / spd 48 / r 13; shield r 140 / grant 2.6 / cd 4.8 |
| `avalanchemortar` | DNB Avalanche Mortar | lobber | hp 6 / spd 46 / r 13; lob 295, burst 52, cd 2.2 |
| `frostdrone` | DNB Frost Drone | bomber | hp 4 / spd 106 / r 11; `flies:true`, blast 88 |
| `glacierchanter` | DNB Glacier Chanter | ranged | hp 5 / spd 52 / r 11; `shotCount:3`, spread 0.42 |

Reskins:

| id | name | behavior | donor & differentiation |
|---|---|---|---|
| `floehusk` | DNB Floe Husk | splitter | ← seracbloater: hp 8→6, dmg 2→3, spd 68→80, `splitInto:'icecrawler'` — a rushing splitter |
| `verglaslurker` | DNB Verglas Lurker | ambusher | ← driftlurker: hp 6→4, dmg 3→2, trigger 120→100, dash 6.8→7.2 |
| `crystalspire` | DNB Crystal Spire | turret | ← icicleturret: 4-shot fan spread 0.7, cd 1.5→2.1, hp 5→6 |
| `wintermender` | DNB Winter Mender | healer | ← thawtender: heal 3→2 but cd 3→2.2 and radius 150→175; spd 72→56 |
| `seracpouncer` | DNB Serac Pouncer | leaper | ← snowpouncer: hp 4→6, dmg 2→3, spd 60→48, slower leap 4.8 with a long 0.5 tell — a heavyweight pounce |

### 10B — jungle

New archetypes (`splitter`, `sniper`, `ambusher` had no 10B entry; plus 10B's
first flying bomber — sporeburster walks — and its first `shotCount` fan):

| id | name | behavior | notes |
|---|---|---|---|
| `fruitbloater` | DNB Fruit Bloater | splitter | hp 8 / dmg 2 / spd 70 / r 15; `splitInto:'midgecloud'` |
| `bogmarksman` | DNB Bog Marksman | sniper | hp 5 / spd 52 / r 10; range 560 / tell 1.2 / bolt 450; `weight:0.6` |
| `thicketlurker` | DNB Thicket Lurker | ambusher | hp 6 / dmg 3 / spd 58 / r 13; trigger 120, dash 6.8 |
| `canopydrone` | DNB Canopy Drone | bomber | hp 4 / spd 104 / r 11; `flies:true`, blast 86 |
| `frondchanter` | DNB Frond Chanter | ranged | hp 5 / spd 52 / r 11; `shotCount:3`, spread 0.42 |

Reskins:

| id | name | behavior | donor & differentiation |
|---|---|---|---|
| `rotbloater` | DNB Rot Bloater | splitter | ← fruitbloater: hp 8→6, dmg 2→3, spd 70→82, `splitInto:'junglestalker'` |
| `blightmarksman` | DNB Blight Marksman | sniper | ← bogmarksman: range 510, tell 0.95, bolt 470, hp 3 / dmg 3 — glass-cannon sniper |
| `tanglespire` | DNB Tangle Spire | turret | ← totemturret: 4-shot fan spread 0.7 at cd 2.1, hp 5→6 |
| `orchidmender` | DNB Orchid Mender | healer | ← sapmender: heal 3→2, cd 3→2.2, radius 150→175, spd 72→56 |
| `mireshrieker` | DNB Mire Shrieker | charger | ← tuskcharger: hp 5→6, spd 56→64, telegraph 0.55→0.45, r 14→13 |

## Bosses

Same rule batches A and B follow: every entry REUSES an existing `aiBossXxx`
rather than adding AI, and none of the eight donors spawns minions (so no
off-theme Crypt/Desert add turns up on a branch floor). The eight donors are
exactly the set the 11A-12B block borrows — deliberately not the four batch A
took nor the four batch B took, and never the donor a same-`floorKey` boss
already uses.

Existing branch-floor bosses sit at hp 52-56; `bossHpScale` is already ~8-10x
at floorNum 8-9, so the new spread stays inside hp 44-62. Each pair is one
glass cannon and one siege body, and each entry is pushed outside the weight
class of *both* existing entries on its donor behavior (speed being the real
lever, since every dash/retreat in those functions is `e.speed * <multiplier>`).

| id | name | floorKey | behavior (donor) | hp/dmg/spd/r | differentiation |
|---|---|---|---|---|---|
| `wailingdark` | The Wailing Dark | 9A | `bossGraveChorus` (gravechorus 48/48/27, pressurechoir 56/48/28) | 46/2/72/22 | both donors are slow chanters at spd 48; this one closes between volleys, smallest 9A boss body |
| `thunderhead` | The Thunderhead | 9A | `bossDuneRavager` (duneravager 68/27, redlineravager 58/70/28) | 60/3/40/33 | both donors sprint; halved to spd 40 it becomes a rolling front — widest, toughest 9A body |
| `rimeeffigy` | The Rime Effigy | 9B | `bossSlagbound` (slagbound 54/38/32, feedbackeffigy 60/40/32) | 46/2/62/24 | both donors are immobile slabs; first mobile version of the pattern |
| `rampartcrawler` | The Rampart Crawler | 9B | `bossGlassScorpion` (glassscorpion 48/74/24, glassreef 54/76/25) | 58/3/44/31 | both donors dart at spd 74+; at 44 the dart is a shove — grind fight, brick palette (9B's masonry half) |
| `whiteoutheart` | The Whiteout Heart | 10A | `bossFurnaceHeart` (furnaceheart 52/44/30, subdrowner 58/44/30) | 46/2/72/23 | both donors lumber at spd 44; this one darts, so you can't walk out of its footprint |
| `calvingtitan` | The Calving Titan | 10A | `bossColossus` (colossus 52/40/34, clippingcolossus 62/38/34) | 48/2/64/24 | both donors are the widest bodies in the game at r 34; first small, quick colossus |
| `feverblossom` | The Fever Blossom | 10B | `bossRotBloom` (rotbloom 48/46/28, brinebloom 56/48/28) | 46/2/74/23 | fastest of the three by far; `burstRadius:66` (smallest) makes the delayed pool a punish, not zoning |
| `bogtuskwarden` | The Bogtusk Warden | 10B | `bossAntlerWarden` (antlerwarden 50/52/29, brokenrefrain 58/54/29) | 62/3/36/34 | slowest and largest of the three — pure attrition capstone, biggest body on either branch floor |

`feverblossom` carries `burstRadius` because `aiBossRotBloom` **and**
`render.js`'s `drawEnemy` both read it to size/draw the ground marker; the
existing rotbloom/brinebloom entries do the same.

## Verification performed

- `node --check js/enemies.js` after each `floorKey`'s enemy block and after
  the boss block — clean every time.
- Programmatic scan of all 376 registry entries: every object key equals its
  own `id`; zero new duplicate ids (the only key repeat file-wide is the
  pre-existing `bonecaller`, which exists once in `ENEMY_TYPES` and once in
  `BOSS_TYPES` — separate objects, not a collision, and not introduced here).
- Every `behavior` string in the file cross-checked against `combat.js`'s
  `updateEnemy` switch cases (which map 1:1 to `js/ai.js` function names) —
  no unknown behavior.
- Every `splitInto` / `summonId` resolves to a real `ENEMY_TYPES` key:
  `gloommites` (9A), `flurrymites` / `frostbiter` (9B), `hailmites` /
  `icecrawler` (10A), `midgecloud` / `junglestalker` (10B).
- Colour scan: none of the 48 new `color`/`dark` pairs duplicates any pair
  already in the file.
- No files other than `js/enemies.js` were modified.
