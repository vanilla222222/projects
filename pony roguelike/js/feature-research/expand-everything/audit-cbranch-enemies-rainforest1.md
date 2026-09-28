# Audit — C-branch enemies, Rainforest floors 7C / 8C

## Files changed

- `js/enemies.js` — added 66 entries to `ENEMY_TYPES` (33 `floorKey:'7C'`, 33 `floorKey:'8C'`),
  inserted directly after the existing 6C block and before the `swarmerdnb` SWARMER entry,
  with a leading block comment describing the Rainforest theme/calibration.

Nothing else was touched. `BOSS_TYPES`, `SUPERBOSSES` (incl. Brazil DNB), 3C-6C, 9A/9B/10A/10B,
achievements.js, ai.js, data.js, room.js, dungeon.js, stages.js, game.js are all unmodified.

## Verification

### Syntax

```
node --check js/enemies.js   -> OK (run at the 33-entry checkpoint and again at the end)
```

### Behavior coverage — multi-line-aware method

A naive `grep` is not trusted here. The check parses the `ENEMY_TYPES` object literal by
brace-matching: it finds the `const ENEMY_TYPES` literal, walks it to its matching close brace,
then for each top-level `key: {` scans forward with a depth counter to that entry's own closing
brace. Each entry is therefore captured as ONE string regardless of how many source lines it
spans, and `behavior:` / `floorKey:` / `id:` are extracted from that whole-entry string.

Result:

```
5C entries=33 distinct behaviors=21   (pre-existing, unchanged — control)
6C entries=33 distinct behaviors=21   (pre-existing, unchanged — control)
7C entries=33 distinct behaviors=21   missing=[]  extra-unknown=[]
8C entries=33 distinct behaviors=21   missing=[]  extra-unknown=[]
```

The 21 distinct behaviors observed on 7C and on 8C, each set compared against the canonical list:

```
ambusher, bomber, burrower, charger, chaser, flyer, healer, leaper, lobber,
orbiter, ranged, sentry, shielded, shielder, sniper, splitter, summoner,
swarm, teleporter, turret, weaver
```

Set difference in both directions is empty on both floors — 21/21, no invented 22nd behavior.

### Duplicate-id scan (whole file)

Same per-entry extraction, plus a second whole-file pass over every top-level `key: { id:'...' }`
across all objects (`ENEMY_TYPES`, `BOSS_TYPES`, `SUPERBOSSES`).

```
dup ids in ENEMY_TYPES:  []
dup keys in ENEMY_TYPES: []
WHOLE FILE dup ids:      [ bonecaller x2 ]   <- known pre-existing, ENEMY_TYPES vs BOSS_TYPES, untouched
key !== id mismatches on 7C/8C entries: []
```

Three real collisions were introduced on the first pass and fixed before finishing —
`mossmender` (vs the stage:1 entry at line 198), `venomskitter` (vs stage:1 at line 214) and
`hivecaller` (vs the 10A-area entry at line 524). Because these were duplicate *keys* in the same
object literal, the older entries would have been silently overwritten at load. Renamed on the
new 7C/8C side only:

- `mossmender` (7C) -> `liverwortmender` / "DNB Liverwort Mender"
- `hivecaller` (8C) -> `broodhivecaller` / "DNB Brood Hive Caller"
- `venomskitter` (8C) -> `toxinrunner` / "DNB Toxin Runner"

The three pre-existing entries were left exactly as they were.

### Field-shape check against real examples

Rather than spot-checking by eye, every new entry's field set was diffed against the union and
the intersection of the field sets of all *pre-existing* entries sharing the same `behavior`
(ignoring the common base fields id/name/hp/dmg/speed/radius/color/dark/behavior/floorKey/
stage/xpTier/weight/isMinion/flies):

```
invented fields (a field no existing entry of that behavior uses):  none
missing fields (a field EVERY existing entry of that behavior has): none
```

Reference field sets confirmed for the unusual behaviors:

```
bomber      fuseTime, blastRadius                                              (+flies for the flying variants)
splitter    splitInto
teleporter  blinkCooldown, blinkRange, fireRange, fireCooldown, boltSpeed [, boltColor, boltRadius]
summoner    summonId, summonCount, summonCooldown, maxSummons, keepDistance
orbiter     orbitRadius, orbitSpeed, fireRange, fireCooldown, boltSpeed [, boltColor, boltRadius]
sentry      sentryThreshold, fireRange, fireCooldown, boltSpeed [, boltColor, boltRadius]
sniper      fireRange, telegraphTime, fireCooldown, boltSpeed, boltColor, boltRadius, weight:0.6
ambusher    triggerRange, chargeSpeed, dashDuration, telegraphTime, chargeCooldown
```

Cross-reference targets resolve: `splitInto:'armyants'` and `summonId:'armyants'` (7C) and
`splitInto:'bulletants'` / `summonId:'bulletants'` (8C) all point at swarm entries defined on
their own floor.

## Totals

| Floor | Theme | Entries | Distinct behaviors |
|---|---|---|---|
| 7C | Rainforest — canopy and undergrowth | 33 | 21 / 21 |
| 8C | Rainforest — deep interior, overgrown ruins | 33 | 21 / 21 |

Each floor is 21 one-per-behavior entries plus 12 extra flavors of the common behaviors
(chaser x2, ranged, bomber, flyer, charger, lobber, burrower, orbiter, sentry, teleporter,
shielded) — the same 21+12 shape 5C and 6C use.

## Calibration notes

Anchors read before writing: `floorKey:'5C'`, `floorKey:'6C'` (direct predecessors), `stage:3`
(inferno) and `floorKey:'9A'` (branch tier). Inferno and 9A both sit at roughly the same HP band
as 6C already (baseline chaser hp 3-4, tanks 7-11), so 7C/8C were placed clearly above both
rather than between them in raw numbers:

- baseline chaser: 5C 3 hp -> 6C 4 -> **7C 5 -> 8C 6**
- big chaser tank: 5C 9 -> 6C 11 -> **7C 13 -> 8C 15**
- typical dmg: 5C/6C mostly 2 with some 3 -> **7C mostly 3 with 4s on the heavies -> 8C the same,
  more 4s**
- turret/sentry/sniper ranges and bolt speeds each step up once from 6C to 7C and again to 8C
  (e.g. sniper fireRange 555 -> 570 -> 585, boltSpeed 450 -> 465 -> 480)
- 8C's step over 7C is deliberately modest (roughly +1 hp, slightly faster cooldowns, a little
  more reach) — the same size step 6C made over 5C.

## Theme / palette

Complete break from the 3C-6C sewer palette (murky olive-greys `#4a3c2a`, `#6a6a54`,
`#3f5a4a`). 7C/8C use deep jungle greens (`#2e6a34`, `#1e4a2a`, `#26542e`), canopy shadow
(`#142a18`, `#0e1e14`), venom yellows and purples (`#d9c92a`, `#b4d92a`, `#7a2ec9`, `#9c2ec9`),
wet-earth browns (`#5a4426`, `#3a2e1a`) and bioluminescent accents (`#3affc9`, `#6affb4`,
`#a8ffd0` on the orbiters/teleporters). Naming keeps the `DNB <Name>` convention and pulls from
jaguars, serpents, poison-dart frogs, biting insects, vines/roots/canopy and overgrown ruins
(7C skews wildlife and undergrowth; 8C skews venom, rot and ruin: Temple Watcher, Idol Plate,
Glyph Watcher, Monolith Bulk, Black Jaguar, Curare Marksman).

## Deviations

- Three id renames from my first draft, listed above, forced by collisions with pre-existing
  entries. No other deviation from the brief.
- Only pre-existing duplicate id remaining in the file is `bonecaller` (ENEMY_TYPES vs
  BOSS_TYPES), left untouched as instructed.
- No smoke test / gameplay run performed (per the standing "no heavy smoke testing" note) —
  verification is `node --check` plus the static structural checks above.
