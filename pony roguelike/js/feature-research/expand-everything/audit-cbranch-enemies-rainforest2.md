# Audit — C-branch enemies, Rainforest part 2 (floors 9C & 10C)

Final enemy-content batch for the alternate C branch. With this, `ENEMY_TYPES`
carries a complete 3C–10C roster.

## Files changed

- `js/enemies.js` — added 66 entries to `ENEMY_TYPES` (33 with `floorKey:'9C'`,
  33 with `floorKey:'10C'`), inserted immediately before the SWARMER block at
  the end of the object. Nothing else in the file was touched.

No other files modified. `BOSS_TYPES`, `SUPERBOSSES`, floorKeys 3C–8C, and all
`stage` entries were read-only reference.

## Behavior-coverage proof (whole-object-literal method)

A naive same-line grep would miss entries whose `behavior:` and `floorKey:`
land on different source lines (every sentry/orbiter/sniper/teleporter entry
with a `boltColor` wraps to 3 lines). So coverage was verified by brace-matching
the `ENEMY_TYPES` literal in Node, slicing each top-level entry as a whole
object-literal string, and extracting `behavior`/`floorKey`/`id` per entry:

```js
const start = src.indexOf('const ENEMY_TYPES');
const open  = src.indexOf('{', start);
let d = 0, s, entries = [];
for (let i = open; i < src.length; i++) {
  const c = src[i];
  if (c === '{') { d++; if (d === 2) s = i; }
  else if (c === '}') { if (d === 2) entries.push(src.slice(s, i + 1)); d--; if (d === 0) break; }
}
// then per entry: /behavior:'([^']+)'/ and /floorKey:'([^']+)'/ into a Set per floor
```

Result, checked against the canonical 21-behavior list:

| floorKey | distinct behaviors | entries | missing | unexpected |
|---|---|---|---|---|
| 7C (reference) | 21 | 33 | — | — |
| 8C (reference) | 21 | 33 | — | — |
| **9C** | **21** | **33** | none | none |
| **10C** | **21** | **33** | none | none |

The 21 behaviors confirmed present on each of 9C and 10C: ambusher, bomber,
burrower, charger, chaser, flyer, healer, leaper, lobber, orbiter, ranged,
sentry, shielded, shielder, sniper, splitter, summoner, swarm, teleporter,
turret, weaver. No 22nd behavior was invented.

`node --check js/enemies.js` passes (run mid-way after the 9C half and again at
the end).

## Enemy counts

- **9C: 33** — 21 one-per-behavior entries + 12 extra flavors of common
  behaviors (2 extra chaser, 1 ranged, 1 bomber, 1 flyer, 1 charger, 1 lobber,
  1 burrower, 1 orbiter, 1 sentry, 1 teleporter, 1 shielded).
- **10C: 33** — same 21 + 12 split.
- Total `ENEMY_TYPES` entries after this batch: **619**.

This matches the scale of every prior pair in the branch (3C/4C, 5C/6C, 7C/8C
are all 33/33) and the extras split mirrors 8C's exactly.

## ID / key collision catches

Every proposed id was diffed against a full-file extraction of `id:'…'` (all
626 pre-existing occurrences: every `stage` entry, every floorKey 3C–8C and
9A–10B, `BOSS_TYPES`, `SUPERBOSSES`) *before* the entries were written, not
only afterwards. Two collisions were caught up front and the **new** entry was
renamed each time (the pre-existing entry was never touched):

| proposed id | collided with | renamed to |
|---|---|---|
| `bilespitter` | existing entry elsewhere in the file | `blightspitter` (DNB Blight Spitter, 9C ranged) |
| `mossmender` | existing entry elsewhere in the file | `mosswortmender` (DNB Mosswort Mender, 9C healer) |

Post-write full-file scans:

- Duplicate `id:` across the whole file: only `bonecaller` — the known,
  expected `ENEMY_TYPES` vs `BOSS_TYPES` duplicate, left alone.
- Duplicate top-level object keys: only `bonecaller` (same known case).
- Key vs `id` mismatch across the whole file: none.
- Duplicate `name:'DNB …'` display strings across the whole file: none.
- `splitInto` / `summonId` targets all resolve to real ids (`driverants` for
  9C, `siafuants` for 10C — both defined on their own floor, mirroring how 7C
  points at `armyants` and 8C at `bulletants`).

## Field-set spot-checks

For the eight unusual behaviors, the exact key set of every new entry was
diffed against its 7C and 8C counterparts. All identical — no dropped and no
invented fields:

- `bomber` — ground variant `{fuseTime, blastRadius}`; air variant adds `flies`.
- `splitter` — `{splitInto}` only.
- `teleporter` — `{blinkCooldown, blinkRange, fireRange, fireCooldown, boltSpeed}`;
  the "blink" variant additionally carries `boltColor`/`boltRadius`, the
  "shade" variant does not — same as 7C/8C.
- `summoner` — `{summonId, summonCount, summonCooldown, maxSummons, keepDistance}`.
- `orbiter` — `{orbitRadius, orbitSpeed, fireRange, fireCooldown, boltSpeed}`;
  "swirl" variant adds `flies` + `boltColor`/`boltRadius`.
- `sentry` — `{sentryThreshold, fireRange, fireCooldown, boltSpeed}` (+ bolt
  styling on the primary one).
- `sniper` — `{fireRange, telegraphTime, fireCooldown, boltSpeed, boltColor,
  boltRadius, weight:0.6}`.
- `ambusher` — `{triggerRange, chargeSpeed, dashDuration, telegraphTime,
  chargeCooldown}`.

## Stat calibration

floorNum 8 and 9. The step 8C took over 7C (roughly +1 hp on most entries, a
few points of speed, slightly faster cooldowns and longer ranges) is applied
twice more:

| sample role | 7C | 8C | 9C | 10C |
|---|---|---|---|---|
| baseline chaser hp/dmg/speed | 5/3/140 | 6/3/142 | 7/4/146 | 8/4/150 |
| big brute chaser hp | 13 | 15 | 18 | 21 |
| swarm hp/dmg/speed | 2/2/152 | 3/2/155 | 3/3/158 | 4/3/160 |
| sniper fireRange / boltSpeed | 570/465 | 585/480 | 600/495 | 615/510 |
| sentry fireRange / fireCooldown | 455/1.15 | 465/1.1 | 475/1.05 | 485/1.0 |
| turret fireCooldown / boltSpeed | 1.4/230 | 1.3/245 | 1.2/260 | 1.15/275 |
| ambusher chargeSpeed / telegraph | 7.1/0.26 | 7.4/0.24 | 7.7/0.22 | 8.0/0.20 |

10C also gets the branch's only stat outliers-by-design, since it is the last
regular-enemy floor before Kirk DNB: the summoner steps to `summonCount:4` /
`maxSummons:9` (all earlier C floors sit at 3/7–8) and the healer to
`healAmount:5`. Both are one-step continuations rather than new mechanics.

This lands well above the 9A/9B/10A/10B branch tier used as the calibration
anchor — those floors run 3–9 hp and 1–3 dmg, whereas the C branch was already
above them at 7C/8C, so 9C/10C clear that bar comfortably rather than needing
to be pulled up to it.

## Flavor

Continues 7C/8C's Rainforest palette rather than starting a new biome:
jungle-green (`#1e4a26`, `#26602e`), venom-yellow/chartreuse (`#a8d92a`,
`#c9e02a`), canopy-shadow (`#12281a`, `#183a20`), with the venom-purple accent
7C/8C already used (`#a82ec9`, `#8a2ee8`) pushed harder.

- **9C — the blighted understory**: the same forest two floors deeper and
  drowned in rot. Blight Prowler, Spore Bulb, Blight Sack, Rot Blink, Rot
  Shade, Heartroot Borer, Driver Ants, Anaconda Weaver, Puma Lurker, plus the
  ruins going from overgrown to watchful (Obelisk Watcher, Stela Watcher,
  Monolith Warden, Menhir Bulk).
- **10C — the cursed heart**: the ruins stop pretending. Hex Thorn, Hex Cobra,
  Hex Marksman, Curse Mortar, Curse Sack, Cursed Prowler, Miasma Blink/Swirl/
  Shade, Shrine Watcher/Warden, Sepulcher Watcher, Ziggurat Bulk, Ghost Jaguar
  (a bleached-white callback to 8C's Black Jaguar), and the wildlife at its
  most lethal — Gaur Ram, Siafu Ants, Scolopendra Delver, Gilded Frog.

All 66 entries keep the `DNB <Name>` convention.

## Deviations

None. Scope was held to `ENEMY_TYPES`; no other file, floorKey, `BOSS_TYPES`,
or `SUPERBOSSES` entry was read-modified. Per project convention no smoke test
was run beyond `node --check` and the static scans above.
