# Audit — C-branch enemies, floors 5C / 6C ("Sewers")

## Files changed

- `js/enemies.js` — added 66 new entries to `ENEMY_TYPES` (33 with `floorKey:'5C'`,
  33 with `floorKey:'6C'`), inserted between the existing 4C block and the
  `swarmerdnb` SWARMER section, with a leading block comment explaining the
  calibration. No other file touched.

Nothing else was modified: `BOSS_TYPES`, `SUPERBOSSES` (including the 6C
superboss `Drenched DNB`), all other `floorKey`/`stage` pools, and
`achievements.js` / `ai.js` / `data.js` / `room.js` / `dungeon.js` /
`stages.js` / `game.js` are untouched.

## Behavior coverage proof (per floor)

Counted by matching each object literal from its key up to its `floorKey`
(needed because multi-line entries carry `behavior:` and `floorKey:` on
different lines, so a naive single-line grep undercounts).

```
perl -0777 -ne "while(/\n  \w+: \{(.*?)floorKey:'5C'/gs){ print \"\$1\n\" if \$1=~/behavior:'(\w+)'/; }" js/enemies.js | sort -u | wc -l
```

**5C — 21 / 21 distinct behaviors**

| behavior | count | | behavior | count |
|---|---|---|---|---|
| chaser | 3 | | swarm | 1 |
| bomber | 2 | | splitter | 1 |
| burrower | 2 | | summoner | 1 |
| charger | 2 | | healer | 1 |
| flyer | 2 | | shielder | 1 |
| lobber | 2 | | sniper | 1 |
| orbiter | 2 | | leaper | 1 |
| ranged | 2 | | turret | 1 |
| sentry | 2 | | weaver | 1 |
| shielded | 2 | | ambusher | 1 |
| teleporter | 2 | | | |

**6C — 21 / 21 distinct behaviors** (identical distribution)

| behavior | count | | behavior | count |
|---|---|---|---|---|
| chaser | 3 | | swarm | 1 |
| bomber | 2 | | splitter | 1 |
| burrower | 2 | | summoner | 1 |
| charger | 2 | | healer | 1 |
| flyer | 2 | | shielder | 1 |
| lobber | 2 | | sniper | 1 |
| orbiter | 2 | | leaper | 1 |
| ranged | 2 | | turret | 1 |
| sentry | 2 | | weaver | 1 |
| shielded | 2 | | ambusher | 1 |
| teleporter | 2 | | | |

## Totals

| floor | theme | floorNum | enemies |
|---|---|---|---|
| 5C | Sewers (sewer mains) | 4 | **33** |
| 6C | Sewers (deep drains / toxic runoff) | 5 | **33** |

Matches the 33-per-floor scale already set by 3C and 4C.

## Verification run

- `node --check js/enemies.js` — passes (run mid-batch and at the end).
- Duplicate `id:` scan across the whole file: only `id:'bonecaller'` (the known,
  pre-existing, harmless `ENEMY_TYPES` / `BOSS_TYPES` collision). No new dupes,
  and no 5C id reused on 6C.
- Object-key vs `id:` mismatch scan across the whole file: zero mismatches.
- Extra-field spot-checks against real existing examples for every unusual
  behavior — `bomber` (`fuseTime`/`blastRadius`, `flies` on the airborne
  variants), `splitter` (`splitInto`, pointing at the same floor's swarm id),
  `summoner` (`summonId`/`summonCount`/`summonCooldown`/`maxSummons`/
  `keepDistance`), `orbiter` (`orbitRadius`/`orbitSpeed`/`fireRange`/
  `fireCooldown`/`boltSpeed`, plus `flies` on the winged one), `sentry`
  (`sentryThreshold`/`fireRange`/`fireCooldown`/`boltSpeed`), `sniper`
  (`fireRange`/`telegraphTime`/`fireCooldown`/`boltSpeed`/`weight:0.6`),
  `teleporter` (`blinkCooldown`/`blinkRange`/`fireRange`/`fireCooldown`/
  `boltSpeed`), `ambusher` (`triggerRange`/`chargeSpeed`/`dashDuration`/
  `telegraphTime`/`chargeCooldown`), `shielder`, `healer`, `burrower`,
  `weaver`, `leaper`, `charger`, `shielded`, `swarm`. No dropped or invented
  fields.
- Cross-reference targets resolve: 5C's `bilesack` splits into `sewermaggots`
  and `vermincaller` summons `sewermaggots` (both 5C `swarm` entries); 6C's
  `tarsack` splits into `drainmites` and `broodtender` summons `drainmites`
  (both 6C `swarm` entries). Each floor is self-contained.

## Calibration

5C/6C sit between the 3C/4C numbers and the `stage:2` (desert) pool that
occupies the same depth in a normal run — deliberately not near 9A/9B tier.

- 5C rank-and-file: hp 3-6, dmg 1-3; bruisers 7-9 hp. 4C's equivalents were
  hp 2-6 / bruisers 7-9.
- 6C steps up one notch the same way 4C stepped over 3C: +~1 hp on most
  entries, a few dmg 2 -> 3 promotions on the heavy hitters, slightly faster
  bolts, slightly shorter cooldowns, longer sniper/sentry ranges.
- Top of the range: `sludgebrute` (6C chaser, hp 11), matching how 4C's
  `floodbrute` topped its floor at hp 9.

## Theme / palette

Deliberately grimier and more industrial than the 3C/4C storm-drain surface:
tunnel rats, methane pods, corroded plate, effluent valves, slurry mortars,
piston rams, biofilm, tar and grease. Palette trends to sickly yellow-greens
(`#8a9c2a`, `#a8b42a`), sludge browns (`#4a3c2a`, `#35301c`), corroded metal
greys (`#6a6a54`, `#5a5f6a`) and murky black-greens (`#26401e`, `#1e5a44`) —
continuous with, but darker and more toxic than, 3C/4C's silt-and-rust tones.

## Deviations

- None from the brief. Two notes for the record:
  1. New entries follow the 3C/4C convention of omitting `xpTier` (the C-branch
     blocks do not set it; only the `stage:*` pools do). Consistent with the
     stated read-only reference floors.
  2. Behavior distribution was made identical between 5C and 6C (21 unique +
     12 extras, same per-behavior counts) so the two floors feel like one
     continuous theme with a difficulty step, mirroring how 3C and 4C mirror
     each other.
