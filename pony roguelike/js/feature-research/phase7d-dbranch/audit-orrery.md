# Phase 7d — The Orrery ('6D'/'7D') roster audit

## Files changed
- `js/data/enemies/types-4.js` — appended two 33-entry rosters ('6D', '7D') directly after the
  just-landed '5D' block, following the exact `Object.assign(ENEMY_TYPES, {...})` structural
  pattern already used for '4D'/'5D'/'11C'. No changes to any existing entry.
- `js/CODE_REFERENCE.md` — appended a new doc block (table + prose) after the Phase 7d Observatory
  entry, documenting both rosters in the same format used for '13'/'14', '11C', and '4D'/'5D'.
- `feature-research/phase7d-dbranch/audit-orrery.md` — this file (new).

No other files were touched. `js/data/enemies/bosses.js` was not touched (per the branch-wide
convention: D-branch floorKeys get no `BOSS_TYPES` pool, only the region's single superboss,
`orrery`, already defined in `js/data/enemies/superbosses.js`).

## Convention followed
- 21 base entries per floorKey (one per behavior: chaser, flyer, bomber, shielded, charger,
  turret, leaper, ranged, lobber, weaver, sentry, orbiter, burrower, swarm, splitter, summoner,
  healer, shielder, sniper, teleporter, ambusher) + 12 "extra flavor" entries reusing behaviors
  already covered (chaser×2, ranged, bomber, flyer, charger, lobber, burrower, orbiter, sentry,
  teleporter, shielded) = 33 entries per floorKey, 66 total.
- Stats: relative scaling only. '6D' is calibrated as a step up from '5D''s own numbers; '7D' is a
  further step up from '6D'. No absolute floor-depth math — `growth.js`'s `enemyHpScale`/
  `bossHpScale` curves handle that automatically.
- Palette: colors vary around `D_PALETTES.orrery`'s `accent:'#e0b45a'` (warm brass) plus deep
  indigo/blue pulled from `floorA:'#232a44'`/`floorB:'#2a3350'`.
- Theme: polished brass clockwork rings, turning gears, orbiting mechanisms, deep indigo sky.
  '7D' leans into the mechanism's grander, apex-most parts (zenith/apex/iron-bound naming) as a
  small step up in both weight and theme intensity from '6D' and from '5D'.

## Id-collision trail (mandatory grep before finalizing)
Grepped every candidate id against the full codebase (`grep -rn "id:'<id>'" js/`), including the
just-landed '4D'/'5D' additions, before finalizing. Two real collisions surfaced against
pre-existing types-2.js entries:

- `sparkmites` — already used by an unrelated stage-pool swarm entry in `js/data/enemies/types-2.js`
  (hp 3/dmg 1/speed 156, no `floorKey`, different flavor entirely). My first draft used the same id
  for the '7D' swarm entry; since both are separate `Object.assign(ENEMY_TYPES, {...})` calls,
  reusing the key silently overwrote the earlier entry (types-4.js loads after types-2.js) instead
  of throwing — this was caught by re-checking `ENEMY_LIST.length` against the expected 858 and
  finding 857 with zero detected duplicates in the id `Set` (the overwrite meant only one survived,
  so no duplicate ever existed at runtime — the loss was silent). Renamed to `meridianmites`
  (verified clean) and re-verified: `ENEMY_LIST.length` came back to 858 as expected.
- `apexmarksman` — already used by an unrelated types-2.js entry. Renamed to `apexsniper`
  (verified clean) before ever landing in the file.

All 66 final ids were re-grepped one more time after landing, cross-checked against the rest of
`js/data/enemies/types-4.js` (including '4D'/'5D') and the rest of `js/`: zero collisions, zero
internal duplicates.

## Full stat blocks

### '6D' — base entries (one per behavior)
| id | name | behavior | hp | dmg | speed | radius | notable fields |
|---|---|---|---|---|---|---|---|
| gearhound | DNB Gearhound | chaser | 11 | 4 | 160 | 11 | contactCooldown 0.4 |
| cogmoth | DNB Cogmoth | flyer | 9 | 5 | 146 | 9 | fireCooldown 1.25, boltSpeed 250, flies |
| sparkcog | DNB Spark Cog | bomber | 10 | 4 | 132 | 11 | fuseTime 0.7, blastRadius 116 |
| brassplate | DNB Brass Plate | shielded | 18 | 4 | 50 | 14 | shieldTime 1.55, vulnTime 1.6 |
| ringrammer | DNB Ring Rammer | charger | 18 | 5 | 76 | 14 | chargeCooldown 1.65, chargeSpeed 8.5, telegraph 0.36 |
| meridianturret | DNB Meridian Turret | turret | 14 | 4 | 0 | 12 | fireCooldown 1.05, boltSpeed 305 |
| cogspring | DNB Cog Spring | leaper | 12 | 4 | 80 | 11 | leapCooldown 1.05, leapSpeed 6.8, telegraph 0.2 |
| gearslinger | DNB Gearslinger | ranged | 11 | 4 | 70 | 11 | keepDistance 235, fireCooldown 1.1, boltSpeed 300 |
| gyromortar | DNB Gyro Mortar | lobber | 14 | 4 | 60 | 13 | lobRange 350, lobTime 0.72, burstRadius 67, fireCooldown 1.85 |
| ringweaver | DNB Ring Weaver | weaver | 13 | 4 | 120 | 12 | weaveAmplitude 0.88, weaveFrequency 4.1 |
| clockwatcher | DNB Clock Watcher | sentry | 16 | 4 | 42 | 12 | sentryThreshold 37, fireRange 500, fireCooldown 0.9, boltSpeed 275 |
| epicycler | DNB Epicycler | orbiter | 11 | 5 | 128 | 9 | flies, orbitRadius 158, orbitSpeed 1.85, fireRange 440, fireCooldown 1.25, boltSpeed 260 |
| gearworm | DNB Gearworm | burrower | 19 | 4 | 82 | 13 | burrowCooldown 2.1, burrowTime 1.35 |
| cogmites | DNB Cog Mites | swarm | 6 | 3 | 170 | 7 | driftAmount 0.75 |
| geartwin | DNB Gear Twin | splitter | 16 | 4 | 88 | 13 | splitInto 'cogmites' |
| meridiancaller | DNB Meridian Caller | summoner | 13 | 5 | 70 | 11 | summonId 'cogmites', summonCount 5, summonCooldown 4.2, maxSummons 10, keepDistance 185 |
| gearmender | DNB Gear Mender | healer | 13 | 3 | 90 | 11 | healAmount 7, healCooldown 2.3, healRadius 178 |
| ringwarden | DNB Ring Warden | shielder | 16 | 4 | 58 | 13 | shieldRadius 184, shieldGrantTime 2.9, shieldCooldown 3.5, keepDistance 210 |
| meridianmarksman | DNB Meridian Marksman | sniper | 12 | 5 | 64 | 10 | fireRange 650, telegraph 0.8, fireCooldown 2, boltSpeed 545, weight 0.6 |
| gearblink | DNB Gear Blink | teleporter | 12 | 4 | 0 | 11 | blinkCooldown 2.4, blinkRange 285, fireRange 480, fireCooldown 1, boltSpeed 285 |
| shadowcog | DNB Shadow Cog | ambusher | 15 | 5 | 78 | 12 | triggerRange 140, chargeSpeed 8.7, dashDuration 0.48, telegraph 0.15, chargeCooldown 1.7 |

### '6D' — extra flavor entries
| id | name | behavior variant | hp | dmg | speed | radius |
|---|---|---|---|---|---|---|
| ironhound | DNB Iron Hound | chaser (brute) | 27 | 5 | 52 | 18 |
| sparkrunner | DNB Spark Runner | chaser (fast) | 10 | 4 | 178 | 9 |
| cogslinger | DNB Cog Slinger | ranged | 12 | 4 | 58 | 12 |
| fusegear | DNB Fuse Gear | bomber (flies) | 11 | 4 | 142 | 10 |
| ringmoth | DNB Ring Moth | flyer | 10 | 5 | 154 | 9 |
| bronzeram | DNB Bronze Ram | charger | 19 | 5 | 66 | 16 |
| orbitmortar | DNB Orbit Mortar | lobber | 14 | 4 | 70 | 13 |
| cogtunneler | DNB Cog Tunneler | burrower | 18 | 4 | 90 | 12 |
| ringsatellite | DNB Ring Satellite | orbiter | 12 | 5 | 122 | 10 |
| gearsentinel | DNB Gear Sentinel | sentry | 16 | 4 | 50 | 12 |
| cogblink | DNB Cog Blink | teleporter | 12 | 4 | 0 | 11 |
| bronzebulwark | DNB Bronze Bulwark | shielded | 24 | 5 | 48 | 16 |

### '7D' — base entries (one per behavior)
| id | name | behavior | hp | dmg | speed | radius | notable fields |
|---|---|---|---|---|---|---|---|
| zenithhound | DNB Zenith Hound | chaser | 12 | 4 | 164 | 11 | contactCooldown 0.38 |
| starcog | DNB Star Cog | flyer | 10 | 5 | 150 | 9 | fireCooldown 1.2, boltSpeed 260, flies |
| novagear | DNB Nova Gear | bomber | 11 | 4 | 136 | 11 | fuseTime 0.68, blastRadius 120 |
| ironplate | DNB Iron Plate | shielded | 19 | 4 | 52 | 14 | shieldTime 1.5, vulnTime 1.65 |
| zenithram | DNB Zenith Ram | charger | 19 | 5 | 78 | 14 | chargeCooldown 1.6, chargeSpeed 8.7, telegraph 0.34 |
| apexturret | DNB Apex Turret | turret | 15 | 4 | 0 | 12 | fireCooldown 1, boltSpeed 315 |
| springcoil | DNB Spring Coil | leaper | 13 | 4 | 82 | 11 | leapCooldown 1, leapSpeed 7, telegraph 0.18 |
| zenithslinger | DNB Zenith Slinger | ranged | 12 | 4 | 72 | 11 | keepDistance 240, fireCooldown 1.05, boltSpeed 310 |
| heavygyro | DNB Heavy Gyro | lobber | 15 | 4 | 62 | 13 | lobRange 355, lobTime 0.7, burstRadius 69, fireCooldown 1.8 |
| braidring | DNB Braid Ring | weaver | 14 | 4 | 124 | 12 | weaveAmplitude 0.9, weaveFrequency 4.2 |
| apexwatcher | DNB Apex Watcher | sentry | 17 | 4 | 40 | 12 | sentryThreshold 38, fireRange 505, fireCooldown 0.85, boltSpeed 280 |
| grandepicycler | DNB Grand Epicycler | orbiter | 12 | 5 | 132 | 9 | flies, orbitRadius 162, orbitSpeed 1.92, fireRange 445, fireCooldown 1.2, boltSpeed 265 |
| ironworm | DNB Iron Worm | burrower | 20 | 4 | 86 | 13 | burrowCooldown 2, burrowTime 1.3 |
| meridianmites | DNB Meridian Mites | swarm | 6 | 3 | 174 | 7 | driftAmount 0.78 |
| geartriad | DNB Gear Triad | splitter | 17 | 4 | 92 | 13 | splitInto 'meridianmites' |
| zenithcaller | DNB Zenith Caller | summoner | 14 | 5 | 72 | 11 | summonId 'meridianmites', summonCount 5, summonCooldown 4, maxSummons 10, keepDistance 188 |
| ringmender | DNB Ring Mender | healer | 14 | 3 | 92 | 11 | healAmount 7, healCooldown 2.2, healRadius 182 |
| apexwarden | DNB Apex Warden | shielder | 17 | 4 | 60 | 13 | shieldRadius 188, shieldGrantTime 2.8, shieldCooldown 3.4, keepDistance 212 |
| apexsniper | DNB Apex Sniper | sniper | 13 | 5 | 66 | 10 | fireRange 660, telegraph 0.75, fireCooldown 1.95, boltSpeed 555, weight 0.6 |
| ringblink | DNB Ring Blink | teleporter | 13 | 4 | 0 | 11 | blinkCooldown 2.3, blinkRange 295, fireRange 490, fireCooldown 0.95, boltSpeed 295 |
| nightgear | DNB Night Gear | ambusher | 16 | 5 | 80 | 12 | triggerRange 144, chargeSpeed 8.9, dashDuration 0.46, telegraph 0.14, chargeCooldown 1.65 |

### '7D' — extra flavor entries
| id | name | behavior variant | hp | dmg | speed | radius |
|---|---|---|---|---|---|---|
| titanhound | DNB Titan Hound | chaser (brute) | 29 | 5 | 54 | 18 |
| cometrunner | DNB Comet Runner | chaser (fast) | 11 | 4 | 182 | 9 |
| apexslinger | DNB Apex Slinger | ranged | 13 | 4 | 60 | 12 |
| shrapnelgear | DNB Shrapnel Gear | bomber (flies) | 12 | 4 | 146 | 10 |
| duskcog | DNB Dusk Cog | flyer | 11 | 5 | 158 | 9 |
| ironram | DNB Iron Ram | charger | 20 | 5 | 68 | 16 |
| apexmortar | DNB Apex Mortar | lobber | 15 | 4 | 72 | 13 |
| irontunneler | DNB Iron Tunneler | burrower | 19 | 4 | 94 | 12 |
| grandsatellite | DNB Grand Satellite | orbiter | 13 | 5 | 126 | 10 |
| zenithsentinel | DNB Zenith Sentinel | sentry | 17 | 4 | 52 | 12 |
| apexblink | DNB Apex Blink | teleporter | 13 | 4 | 0 | 11 |
| ironbulwark | DNB Iron Bulwark | shielded | 26 | 5 | 50 | 16 |

## Verification (exact output)

1. `node --check js/data/enemies/types-4.js` → clean, printed `SYNTAX OK types-4.js`, no output
   from `node --check` itself (zero exit code).

2. Full sweep — `for f in $(find /home/vanilla/Downloads/adele2/js -name "*.js"); do node --check
   "$f" || echo "FAIL: $f"; done`:
   ```
   sweep fail=0
   ```
   Zero `FAIL:` lines across every `.js` file in `js/`.

3. Harness (Node `vm`-free — a plain concatenation of every `<script src>` from `index.html` in
   document order, excluding `js/main.js`, `js/ui/ui.js`, `js/ui/render.js`,
   `js/ui/roomEditor.js`, `js/ui/bestiary.js`, plus a small `document`/`window`/`localStorage`/
   `Audio`/`requestAnimationFrame` stub prepended so browser-only top-level code in
   `achievements/logic.js` etc. doesn't throw) loaded and executed with zero thrown errors.

4. In-harness counts:
   ```
   6D count: 33
   7D count: 33
   BOSS 6D/7D count: 0
   4D count: 33
   5D count: 33
   ```
   `ENEMY_LIST.filter(e=>e.floorKey==='6D').length === 33` ✓
   `ENEMY_LIST.filter(e=>e.floorKey==='7D').length === 33` ✓
   `BOSS_LIST.filter(b=>b.floorKey==='6D'||b.floorKey==='7D').length === 0` ✓

5. Duplicate-id check:
   ```
   ENEMY_LIST total: 858
   unique ids: 858 dup: false
   ```
   `ids.length === idSet.size` ✓ — 858 total, zero duplicates, exactly matching the brief's
   "792 (prior total) + 66 = 858". Note on how this was actually caught: mid-authoring, while the
   draft still used `sparkmites` as the '7D' swarm id (a real collision with an existing
   types-2.js entry), `ENEMY_LIST.length` measured 857 with zero *detected* duplicates — because
   `Object.assign(ENEMY_TYPES, {...})` silently overwrote the earlier types-2.js entry rather than
   producing an actual duplicate key, so the id-`Set`-size check alone couldn't catch it. Cross-
   checking the raw total against the expected 858 is what surfaced the loss; renaming to
   `meridianmites` (see the collision trail above) restored the total to exactly 858.

6. Behavior-dispatch check — grepped `case '<behavior>'` in `js/systems/combat-3.js` for all 21
   behaviors used (chaser, flyer, bomber, shielded, charger, turret, leaper, ranged, lobber,
   weaver, sentry, orbiter, burrower, swarm, splitter, summoner, healer, shielder, sniper,
   teleporter, ambusher): all 21 present, zero `MISSING DISPATCH` lines.

## Deviations
None from the approved plan. Final numbers match the brief exactly (858 total, 66 new, zero
duplicates, 33/33 across '6D'/'7D', 0 bosses). The only mid-authoring correction was catching and
fixing two id collisions (`sparkmites` → `meridianmites`, `apexmarksman` → `apexsniper`) before
the file was considered final — documented in the collision trail above. No `BOSS_TYPES` entries
were added (per the branch-wide convention). No AI/behavior code was touched — every entry reuses
one of the 21 existing generic behaviors, dispatched unchanged by `js/systems/combat-3.js`.
