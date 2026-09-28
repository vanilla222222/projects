# Audit — Content Batch D (11A / 11B / 12A / 12B)

Final content dispatch of Gameplay Update 2. Touched exactly one file: `js/enemies.js`.
Added 40 regular enemies (10 per branch-floor pool) and 8 bosses (2 per pool), each inside
its own fenced block placed immediately after the Batch C fences in both registries:

- `ENEMY_TYPES` — `CONTENT BATCH D (11A/11B/12A/12B) — BEGIN/END`
- `BOSS_TYPES` — same fence name, own BEGIN/END

## Verification performed

- `node --check js/enemies.js` after each floorKey's edits (4 intermediate runs) and once at the end. All pass.
- Registry counts after batch D, counted precisely (not estimated): **ENEMY_TYPES 355**, **BOSS_TYPES 58**, **SUPERBOSSES 11**.
  (Pre-batch-D: 315 / 50 / 11.) The brief's "~415-420 enemies / ~70 bosses" estimate was stale — 355/58 is the real figure.
- Duplicate-key scan per registry: **zero duplicates** in ENEMY_TYPES, BOSS_TYPES and SUPERBOSSES.
  The known `bonecaller` cross-object namesake (enemy vs boss) is unchanged and harmless — not re-flagged.
- All 48 new ids grep-checked against the entire `js/` tree before insertion: zero collisions.
- Every new `behavior` string machine-verified: regular behaviors all resolve to a `case '<x>':` in
  `js/combat.js`'s `updateEnemy` switch; every boss behavior resolves to a real `function aiBossXxx` in `js/ai.js`.
- Every `splitInto` / `summonId` verified to resolve to a real existing `ENEMY_TYPES` key.
- All 48 new `color`/`dark` pairs checked: unique among themselves **and** against every pair already in the file.
  (The file does contain pre-existing duplicate pairs elsewhere — none introduced here.)

## Pool themes (read from the existing rosters, not assumed)

| Pool | Theme as authored | Behavior gaps that existed |
|---|---|---|
| 11A | sub-bass abyss — artillery, ambush, long-range denial (deep blue) | splitter, burrower, orbiter, ranged, sentry, turret, charger, healer, bomber, leaper |
| 11B | flooded bloom — numbers and sustain, the room regrows (teal) | splitter, ambusher, sniper, shielder, teleporter, swarm, turret, charger, lobber, burrower |
| 12A | fractured refrain — erratic and displacing (violet) | summoner, bomber, weaver, ranged, healer, swarm, shielded, ambusher, lobber, burrower |
| 12B | clipped refrain — forward pressure only, no support (crimson) | splitter, sniper, leaper, orbiter, shielded, sentry, bomber, teleporter, weaver |

Deliberate design note: **12B's block contains no healer, shielder or summoner.** That pool's authored
identity is "no support at all", so all ten additions are things that come at you on a new vector.

## Stat calibration method

hp/dmg/speed/radius were authored by comparison against the SAME-floorKey neighbours actually read
(11A `bassbreaker` hp10 / `sonarwarden` hp7 / `undertowmites` hp2; 11B `tidebeast` hp10 / `coralguard` hp7;
12A `fracturebrute` hp11 / `riftsentinel` hp9; 12B `distortionbrute` hp11 / `peakcharger` hp6), and nudged by
about 1 — **not** re-scaled for depth. `enemyHpScale` (1.32^floorNum) is already ~16x-27x on these floors, so
writing "floor 12 sized" raw numbers would multiply the curve twice. Nothing here was compared against a
stage 0-3 entry. Archetype bands used, matching the existing rosters exactly:

- swarm mites 2 hp / r7 / spd 150-152; light flyers & drones 4 hp / r11 / spd 106-110
- circlers, snipers, blinkers, chanters, weavers 5 hp / r10-11
- lobbers, ambushers, leapers, burrowers, healers, chargers 6-7 hp / r12-14
- splitters 8 hp / r15 (matches batch C's `seracbloater`/`fruitbloater` line); shielded slabs 8-9 hp / r16
- `weight:0.6` used only where a same-pool neighbour already used it (i.e. nowhere new in this batch).

## The 40 regular enemies

### 11A — sub-bass abyss

| id | name | behavior | notes |
|---|---|---|---|
| `pressurehusk` | DNB Pressure Husk | splitter | NEW archetype; `splitInto:'undertowmites'` (real 11A swarm) |
| `trenchdelver` | DNB Trench Delver | burrower | NEW archetype |
| `sonarcircler` | DNB Sonar Circler | orbiter | NEW archetype; 11A's first circling flyer |
| `basschanter` | DNB Bass Chanter | ranged | NEW archetype; 3-shot fan |
| `depthsentry` | DNB Depth Sentry | sentry | NEW archetype |
| `hadalturret` | DNB Hadal Turret | turret | reskin <- `crystalspire` |
| `underswellcharger` | DNB Underswell Charger | charger | reskin <- `peakcharger` |
| `brinemender` | DNB Brine Mender | healer | reskin <- `tidemender` |
| `sinkerdrone` | DNB Sinker Drone | bomber (flies) | reskin <- `frostdrone` |
| `leviathanspawn` | DNB Leviathan Spawn | leaper | reskin <- `stutterleaper` |

### 11B — flooded bloom

| id | name | behavior | notes |
|---|---|---|---|
| `polypbloater` | DNB Polyp Bloater | splitter | NEW; `splitInto:'reefstalker'` (real 11B chaser) |
| `kelplurker` | DNB Kelp Lurker | ambusher | NEW archetype |
| `lagoonmarksman` | DNB Lagoon Marksman | sniper | NEW archetype; 11B's first 555-range threat |
| `anemonewarden` | DNB Anemone Warden | shielder | NEW archetype |
| `reefblinker` | DNB Reef Blinker | teleporter | NEW archetype |
| `spawnmites` | DNB Spawn Mites | swarm | reskin <- `undertowmites` |
| `coralspire` | DNB Coral Spire | turret | reskin <- `hadalturret` |
| `surgecharger` | DNB Surge Charger | charger | reskin <- `underswellcharger` |
| `tidepoolmortar` | DNB Tidepool Mortar | lobber | reskin <- `depthmortar` |
| `siltdelver` | DNB Silt Delver | burrower | reskin <- `trenchdelver` |

### 12A — fractured refrain

| id | name | behavior | notes |
|---|---|---|---|
| `echocaller` | DNB Echo Caller | summoner | NEW; `summonId:'swarmerdnb'` (the universal minion, as 11B's `bloomcaller` uses) |
| `staticdrone` | DNB Static Drone | bomber (flies) | NEW archetype |
| `dissonanceweaver` | DNB Dissonance Weaver | weaver | NEW archetype |
| `refrainchanter` | DNB Refrain Chanter | ranged | NEW archetype; 3-shot fan |
| `glitchmender` | DNB Glitch Mender | healer | NEW archetype; 12A's first sustain |
| `loopmites` | DNB Loop Mites | swarm | reskin <- `wailmites` |
| `skipbrute` | DNB Skip Brute | shielded | reskin <- `coralguard` |
| `phaselurker` | DNB Phase Lurker | ambusher | reskin <- `redlinelurker` |
| `modmortar` | DNB Mod Mortar | lobber | reskin <- `crushmortar` |
| `reversedelver` | DNB Reverse Delver | burrower | reskin <- `trenchdelver` |

### 12B — clipped refrain

| id | name | behavior | notes |
|---|---|---|---|
| `gainsplitter` | DNB Gain Splitter | splitter | NEW; `splitInto:'wailmites'` (real 12B swarm) |
| `peakmarksman` | DNB Peak Marksman | sniper | NEW archetype |
| `clipleaper` | DNB Clip Leaper | leaper | NEW archetype |
| `overdrivecircler` | DNB Overdrive Circler | orbiter | NEW archetype; 2-shot spread |
| `limiterhulk` | DNB Limiter Hulk | shielded | NEW archetype; heaviest 12B body at hp9/r16 |
| `saturatorspire` | DNB Saturator Spire | sentry | reskin <- `refrainsentry` |
| `redlinedrone` | DNB Redline Drone | bomber (flies) | reskin <- `staticdrone` |
| `clipblinker` | DNB Clip Blinker | teleporter | reskin <- `warpblinker` |
| `crestcharger` | DNB Crest Charger | charger | reskin <- `peakcharger` |
| `squarewaveweaver` | DNB Squarewave Weaver | weaver | reskin <- `dissonanceweaver` |

## The 8 bosses — donor selection

I audited `js/ai.js` for minion-spawning boss functions. `aiBossWarlord`, `aiBossHiveMother`,
`aiBossBoneSentinel`, `aiBossBrambleQueen`, `aiBossSandWyrm`, `aiBossAshTyrant`, `aiBossCinderColossus`,
`aiBossMagmaWraith` and `aiBossBrimstoneHorror` **all** push `new Enemy(...)` into the room at an hp
threshold, so all nine are excluded by the established no-minion rule. The remaining superboss patterns
(`Polish`, `Tyrone`, `Pineapple`, `Israel`, `Algae`, `Lilac`, `BoneCaller`, `Plapper`, `Clapper`, `Nhm`,
`VanillaDnb`, `OneTrueDnb`) are one-off scripted fights and are not table-reusable.

That leaves a donor pool of exactly **16**: the fifteen 9A-10B "bonus boss" patterns plus `bossColossus`.
Every one of those 16 was already borrowed once by the base 11A-12B block and by batches A/B/C, so the
"prefer an unused donor" preference is no longer satisfiable — a fact worth recording. Batch D therefore
applies the next-best rule from the same convention: **never share a donor with a boss already on the same
floorKey.** The eight donors used here are precisely the eight that the original 11A-12B block did *not*
use (batch A's four and batch B's four), so after this batch every donor in the pool carries exactly three
users and no floor has two bosses on the same pattern.

| id | name | floorKey | donor behavior | donor's existing users | differentiation |
|---|---|---|---|---|---|
| `sonarlance` | The Sonar Lance | 11A | `bossFrostSentinel` | frostsentinel 52/2/52/24; fenwarden 50/3/40/30 | glass cannon 44/2/**76**/22 — at spd76 the retreat step outruns you, so the fan chases instead of zoning |
| `abyssrender` | The Abyss Render | 11A | `bossShadowStalker` | shadowstalker 52/2/62/24; sepulchershade 44/2/78/22 | siege 62/3/**36**/33 — the between-blink chase is a crawl, so the blink itself is the threat |
| `reefleviathan` | The Reef Leviathan | 11B | `bossVineHorror` | vinehorror 56/3/50/29; emberlash 46/2/78/23 | siege 62/3/**34**/34 — lunge is `speed*4.5`, so this reads as a slow shove you sidestep and grind down |
| `tidefiend` | The Tide Fiend | 11B | `bossGlacierFiend` | glacierfiend 56/3/40/30; sunflaredjinn 44/2/72/22 | glass cannon 46/2/**84**/21 — pushed past even the Djinn; fastest nova carrier, rings land point blank |
| `fractalwraith` | The Fractal Wraith | 12A | `bossBlizzardWraith` | blizzardwraith 52/2/76/24; ashfallleviathan 58/3/44/31 | glass cannon 44/2/**90**/20 — fastest and smallest boss body in the game, lowest boss hp |
| `monolithofnoise` | The Monolith of Noise | 12A | `bossStormbringer` | stormbringer 52/2/56/25; sandstonebehemoth 56/3/34/33 | siege 62/3/**24**/36 — effectively stationary through the 0.6x chase; widest body in the game |
| `clippingstag` | The Clipping Stag | 12B | `bossCanopyStalker` | canopystalker 52/2/66/25; hollowstag 44/2/74/22 | siege 62/3/**38**/33 — the pounce lands as a slab, not a blur |
| `transientgolem` | The Transient Golem | 12B | `bossBrickGolem` | brickgolem 56/3/42/28; mausoleumtitan 50/3/36/32 | glass cannon 44/2/**80**/21 — the first fast golem; the wind-up dash now crosses the room |

Each pair per floor is one glass cannon and one siege body, and each entry sits outside the weight class of
BOTH existing users of its donor — speed is the primary lever because every dash and retreat step inside
those functions is `e.speed * <multiplier>`, and the functions hardcode all other pattern constants.

hp is kept inside 44-62 for the same reason batch C's is: `bossHpScale` (1.28^floorNum) is already ~10x at
this depth, and these bonus bosses must stay under the superbosses' authored 68-76 so each floor's real
capstone remains the bigger fight.

## Status of the overall content update

With batch D landed, all 12 buckets (stages 0-3 and floorKeys 9A/9B/10A/10B/11A/11B/12A/12B) have received
+10 enemies and +2 bosses. No further content dispatches are outstanding.

Not smoke-tested in-game (per project convention): syntax-checked and grep-verified only.
