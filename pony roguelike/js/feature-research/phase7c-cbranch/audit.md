# Phase 7c — C-branch '11C' enemy roster — implementation audit

## Files changed

- `js/data/enemies/types-3.js` — added the 33-entry `'11C'` enemy roster (appended
  immediately after the existing `'10C'` block, before the "ACHIEVEMENT-LOCKED
  CREATURES" comment/closing brace); fixed the stale `'10C'` header comment that
  still claimed `'10C'` led into Kirk DNB.
- `js/CODE_REFERENCE.md` — documented the new `'11C'` roster (id/name/behavior/
  hp-dmg-spd-radius table, matching the Phase 7b `'13'`/`'14'` documentation
  format) and the "C-branch never gets a per-floorKey `BOSS_TYPES` pool"
  convention, in the section that already documents `types-3.js`/`types-4.js`.
- `feature-research/phase7c-cbranch/audit.md` — this file (new).

No other files were touched. No AI/behavior implementation code was touched —
every new enemy entry reuses an existing generic AI behavior string already
dispatched by `js/systems/combat-3.js`.

## Task 1 — the '11C' enemy roster

### Placement decision

The plan allowed either `types-4.js` or "wherever fits most naturally." `'9C'`/
`'10C'`'s 33-entry "one entry per generic AI behavior" blocks live in
`types-3.js`, immediately followed by a comment block describing the (separate,
`locked:true`, 4-per-bucket) achievement-locked creature pools that actually live
in `types-4.js`. Since `'11C'` needed to replicate the `'9C'`/`'10C'` convention
(not the achievement-locked convention), it was appended directly after the
`'10C'` block in `types-3.js`, keeping all three "one entry per behavior"
C-branch blocks (`'9C'`, `'10C'`, `'11C'`) contiguous and consistently formatted.

### Behavior coverage verification

Before writing anything, `'9C'` and `'10C'` were parsed programmatically (not
just grepped — grep undercounts multi-line entries) to get their exact behavior
distributions. Both are identical, 33 entries each:

```
chaser:3  flyer:2  bomber:2  shielded:2  charger:2  turret:1  leaper:1
ranged:2  lobber:2  weaver:1 sentry:2    orbiter:2  burrower:2 swarm:1
splitter:1 summoner:1 healer:1 shielder:1 sniper:1  teleporter:2 ambusher:1
```

= 21 behaviors each appearing once (the "one entry per behavior" base set),
plus 12 "extra flavor" entries repeating: `chaser`×2 extra, and one extra each
for `ranged`/`bomber`/`flyer`/`charger`/`lobber`/`burrower`/`orbiter`/`sentry`/
`teleporter`/`shielded`. `'11C'` reproduces this exact distribution (verified —
see harness output below, 33 entries).

### Stat calibration method

For each behavior, the exact per-field delta `'9C'→'10C'` applied (e.g. chaser:
hp+1, speed+4; sniper: hp+1, speed+2, fireRange+15, telegraphTime-0.05,
fireCooldown-0.1, boltSpeed+15) was computed from the real data, then the same
delta was applied a second time, `'10C'→'11C'`, per matching behavior. This
keeps `'11C'` a modest (~5-10%) relative step above `'10C'`, consistent with the
established `'9C'→'10C'` step, per the plan's calibration instruction. No AI
code or dispatch logic was touched — only data-table numbers.

### Full new-enemy stat blocks (as written)

Base set (21, one per behavior):

```js
rootwraith: { id:'rootwraith', name:'DNB Root Wraith', hp:9, dmg:4, speed:154, radius:11, color:'#2a3a20', dark:'#141d10',
  behavior:'chaser', contactCooldown:0.45, floorKey:'11C' },
saltheron: { id:'saltheron', name:'DNB Salt Heron', hp:8, dmg:5, speed:138, radius:9, color:'#d8c88a', dark:'#6c6445',
  behavior:'flyer', fireCooldown:1.35, boltSpeed:245, flies:true, floorKey:'11C' },
tidebloat: { id:'tidebloat', name:'DNB Tide Bloat', hp:9, dmg:4, speed:124, radius:11, color:'#8a6a3a', dark:'#45351d',
  behavior:'bomber', fuseTime:0.72, blastRadius:112, floorKey:'11C' },
brineplate: { id:'brineplate', name:'DNB Brine Plate', hp:16, dmg:4, speed:50, radius:14, color:'#5a6a5a', dark:'#2d352d',
  behavior:'shielded', shieldTime:1.6, vulnTime:1.5, floorKey:'11C' },
mudtuskram: { id:'mudtuskram', name:'DNB Mudtusk Ram', hp:16, dmg:5, speed:72, radius:13, color:'#3a2a1a', dark:'#1d150d',
  behavior:'charger', chargeCooldown:1.7, chargeSpeed:8.1, telegraphTime:0.38, floorKey:'11C' },
barnaclespike: { id:'barnaclespike', name:'DNB Barnacle Spike', hp:12, dmg:4, speed:0, radius:12, color:'#4a3a2a', dark:'#251d15',
  behavior:'turret', fireCooldown:1.1, boltSpeed:290, floorKey:'11C' },
mudskipper: { id:'mudskipper', name:'DNB Mudskipper', hp:10, dmg:4, speed:76, radius:11, color:'#6a5a2a', dark:'#352d15',
  behavior:'leaper', leapCooldown:1.1, leapSpeed:6.5, telegraphTime:0.22, floorKey:'11C' },
eelspitter: { id:'eelspitter', name:'DNB Eel Spitter', hp:9, dmg:4, speed:68, radius:11, color:'#2a5a4a', dark:'#152d25',
  behavior:'ranged', keepDistance:230, fireCooldown:1.15, boltSpeed:285, floorKey:'11C' },
crabmortar: { id:'crabmortar', name:'DNB Crab Mortar', hp:12, dmg:4, speed:58, radius:13, color:'#a8622a', dark:'#543115',
  behavior:'lobber', lobRange:345, lobTime:0.75, burstRadius:65, fireCooldown:1.9, floorKey:'11C' },
mangroveviper: { id:'mangroveviper', name:'DNB Mangrove Viper', hp:11, dmg:4, speed:114, radius:12, color:'#3a5a2a', dark:'#1d2d15',
  behavior:'weaver', weaveAmplitude:0.84, weaveFrequency:4, floorKey:'11C' },
tidewatcher: { id:'tidewatcher', name:'DNB Tide Watcher', hp:14, dmg:4, speed:44, radius:12, color:'#24382a', dark:'#121c15',
  behavior:'sentry', sentryThreshold:36, fireRange:495, fireCooldown:0.95, boltSpeed:270,
  boltColor:'#d8c88a', boltRadius:5, floorKey:'11C' },
siltswirl: { id:'siltswirl', name:'DNB Silt Swirl', hp:9, dmg:5, speed:122, radius:9, color:'#8aa87a', dark:'#45543d',
  behavior:'orbiter', flies:true, orbitRadius:152, orbitSpeed:1.75, fireRange:435, fireCooldown:1.35, boltSpeed:250,
  boltColor:'#d8f0c9', boltRadius:4, floorKey:'11C' },
fiddlerborer: { id:'fiddlerborer', name:'DNB Fiddler Borer', hp:17, dmg:4, speed:76, radius:13, color:'#241a10', dark:'#120d08',
  behavior:'burrower', burrowCooldown:2.3, burrowTime:1.45, floorKey:'11C' },
silthopper: { id:'silthopper', name:'DNB Silt Hopper', hp:5, dmg:3, speed:162, radius:7, color:'#7a621e', dark:'#3d310f',
  behavior:'swarm', driftAmount:0.7, floorKey:'11C' },
brinesack: { id:'brinesack', name:'DNB Brine Sack', hp:14, dmg:4, speed:84, radius:13, color:'#5a3a6a', dark:'#2d1d35',
  behavior:'splitter', splitInto:'silthopper', floorKey:'11C' },
hivewader: { id:'hivewader', name:'DNB Hive Wader', hp:11, dmg:5, speed:66, radius:11, color:'#8a6a1a', dark:'#45350d',
  behavior:'summoner', summonId:'silthopper', summonCount:5, summonCooldown:4.6, maxSummons:10, keepDistance:180, floorKey:'11C' },
mangrovemender: { id:'mangrovemender', name:'DNB Mangrove Mender', hp:11, dmg:3, speed:86, radius:11, color:'#7ad0a0', dark:'#3d6850',
  behavior:'healer', healAmount:6, healCooldown:2.5, healRadius:170, floorKey:'11C' },
tidewarden: { id:'tidewarden', name:'DNB Tide Warden', hp:14, dmg:4, speed:54, radius:13, color:'#2a4a4a', dark:'#152525',
  behavior:'shielder', shieldRadius:176, shieldGrantTime:3.1, shieldCooldown:3.7, keepDistance:205, floorKey:'11C' },
heronmarksman: { id:'heronmarksman', name:'DNB Heron Marksman', hp:10, dmg:5, speed:64, radius:10, color:'#d8c88a', dark:'#6c6445',
  behavior:'sniper', fireRange:630, telegraphTime:0.9, fireCooldown:2.1, boltSpeed:525,
  boltColor:'#f0e8c0', boltRadius:4, weight:0.6, floorKey:'11C' },
brackblink: { id:'brackblink', name:'DNB Brack Blink', hp:10, dmg:4, speed:0, radius:11, color:'#3a7a7a', dark:'#1d3d3d',
  behavior:'teleporter', blinkCooldown:2.6, blinkRange:270, fireRange:470, fireCooldown:1.1, boltSpeed:270,
  boltColor:'#c9f0e8', boltRadius:5, floorKey:'11C' },
crocshade: { id:'crocshade', name:'DNB Croc Shade', hp:13, dmg:5, speed:74, radius:12, color:'#3a4a2a', dark:'#1d251d',
  behavior:'ambusher', triggerRange:134, chargeSpeed:8.3, dashDuration:0.5, telegraphTime:0.18, chargeCooldown:1.8, floorKey:'11C' },
```

Extra flavors (12, repeating behaviors already covered above):

```js
mireloper: { id:'mireloper', name:'DNB Mire Loper', hp:23, dmg:5, speed:48, radius:17, color:'#3a3020', dark:'#1d1810',
  behavior:'chaser', contactCooldown:1.1, floorKey:'11C' },
tidedasher: { id:'tidedasher', name:'DNB Tide Dasher', hp:8, dmg:4, speed:166, radius:9, color:'#c9d82a', dark:'#656c15',
  behavior:'chaser', contactCooldown:0.4, floorKey:'11C' },
saltspitter: { id:'saltspitter', name:'DNB Salt Spitter', hp:10, dmg:4, speed:54, radius:12, color:'#5a6a2a', dark:'#2d3515',
  behavior:'ranged', keepDistance:175, fireCooldown:1.8, boltSpeed:215, floorKey:'11C' },
bloatbladder: { id:'bloatbladder', name:'DNB Bloat Bladder', hp:9, dmg:4, speed:134, radius:10, color:'#c9522a', dark:'#642915',
  behavior:'bomber', fuseTime:0.66, blastRadius:104, flies:true, floorKey:'11C' },
mangrovebat: { id:'mangrovebat', name:'DNB Mangrove Bat', hp:8, dmg:5, speed:144, radius:9, color:'#4a4a5a', dark:'#25252d',
  behavior:'flyer', fireCooldown:1.3, boltSpeed:245, flies:true, floorKey:'11C' },
siltboar: { id:'siltboar', name:'DNB Silt Boar', hp:17, dmg:5, speed:62, radius:15, color:'#3a2e1e', dark:'#1d170f',
  behavior:'charger', chargeCooldown:1.95, chargeSpeed:7.8, telegraphTime:0.44, floorKey:'11C' },
mudmortar: { id:'mudmortar', name:'DNB Mud Mortar', hp:12, dmg:4, speed:66, radius:12, color:'#6a5a3a', dark:'#352d1d',
  behavior:'lobber', lobRange:310, lobTime:0.85, burstRadius:59, fireCooldown:2.05, floorKey:'11C' },
mudlobster: { id:'mudlobster', name:'DNB Mud Lobster', hp:16, dmg:4, speed:82, radius:12, color:'#8a2a2a', dark:'#451515',
  behavior:'burrower', burrowCooldown:2, burrowTime:1.2, floorKey:'11C' },
duskcircler: { id:'duskcircler', name:'DNB Dusk Circler', hp:10, dmg:5, speed:114, radius:10, color:'#a8a8c9', dark:'#545464',
  behavior:'orbiter', orbitRadius:148, orbitSpeed:1.65, fireRange:430, fireCooldown:1.45, boltSpeed:255, floorKey:'11C' },
rootsentinel: { id:'rootsentinel', name:'DNB Root Sentinel', hp:14, dmg:4, speed:46, radius:12, color:'#444438', dark:'#22221c',
  behavior:'sentry', sentryThreshold:35, fireRange:475, fireCooldown:1.05, boltSpeed:260, floorKey:'11C' },
brackmist: { id:'brackmist', name:'DNB Brack Mist', hp:10, dmg:4, speed:0, radius:11, color:'#5a7a6a', dark:'#2d3d35',
  behavior:'teleporter', blinkCooldown:2.8, blinkRange:250, fireRange:450, fireCooldown:1.15, boltSpeed:260, floorKey:'11C' },
shellbulk: { id:'shellbulk', name:'DNB Shell Bulk', hp:20, dmg:5, speed:44, radius:15, color:'#42423a', dark:'#21211d',
  behavior:'shielded', shieldTime:2.05, vulnTime:1.35, floorKey:'11C' },
```

Ids: `rootwraith`, `saltheron`, `tidebloat`, `brineplate`, `mudtuskram`,
`barnaclespike`, `mudskipper`, `eelspitter`, `crabmortar`, `mangroveviper`,
`tidewatcher`, `siltswirl`, `fiddlerborer`, `silthopper`, `brinesack`,
`hivewader`, `mangrovemender`, `tidewarden`, `heronmarksman`, `brackblink`,
`crocshade`, `mireloper`, `tidedasher`, `saltspitter`, `bloatbladder`,
`mangrovebat`, `siltboar`, `mudmortar`, `mudlobster`, `duskcircler`,
`rootsentinel`, `brackmist`, `shellbulk` (33 total). Each was grepped against
the whole `js/` tree individually before finalizing to confirm no id collision
(3 initial candidates — `gasbladder`, `driftcircler`, `mistblink` — did
collide with existing ids and were renamed to `bloatbladder`, `duskcircler`,
`brackmist` respectively before use).

## Task 2 — stale comment fix

Original `'10C'` header comment (types-3.js, ~line 461-465):

> `// -- 10C (the cursed heart — the bottom of the rainforest branch, where the`
> `// ruins have stopped pretending: hexed stonework, black rot, wildlife bred`
> `// for nothing but killing. The branch's hardest regular-enemy floor, one`
> `// step above 9C exactly as 9C stepped over 8C, and it leads straight into`
> `// the branch's final superboss, Kirk DNB, in SUPERBOSSES.)`

Replaced with:

> `// -- 10C (the cursed heart — the bottom of the rainforest branch, where the`
> `// ruins have stopped pretending: hexed stonework, black rot, wildlife bred`
> `// for nothing but killing. One step above 9C exactly as 9C stepped over`
> `// 8C, and it leads straight into 10C's own superboss, Monsoon DNB, in`
> `// SUPERBOSSES. PHASE 7a extended the branch further with 11C/12C below —`
> `// Kirk DNB now lives at 12C instead.)`

Only comment text changed; no code/stat lines in the `'10C'` block were touched.

## Task 3 — CODE_REFERENCE.md

Added a "**Phase 7c**" paragraph (in the section documenting `types-3.js`/
`types-4.js`, right after the existing Phase 7b `'14'` paragraph) with the same
id/name/behavior/hp-dmg-spd-radius markdown table format Phase 7b used for
`'13'`/`'14'`, plus an explicit statement of the "C-branch never gets a
per-floorKey `BOSS_TYPES` pool" convention so future phases don't accidentally
add one for a C-branch floorKey. `mangrove` (the `'11C'` superboss) was already
documented in the `superbosses.js` section's Phase 7a table — untouched.

## Verification

### 1. `node --check` on touched files

```
$ node --check js/data/enemies/types-3.js && echo "types-3 OK"
types-3 OK
```

(`js/CODE_REFERENCE.md` is markdown, not JS — no `node --check` applicable.)

### 2. Full `node --check` sweep of all `js/**/*.js`

```
$ for f in $(find js -name "*.js"); do node --check "$f" || echo "FAIL: $f"; done
(no output — zero FAIL lines)
```

Clean.

### 3. Full-load harness (vm-based, all `index.html` `<script>` files except
`js/main.js`, `js/ui/ui.js`, `js/ui/render.js`, `js/ui/roomEditor.js`,
`js/ui/bestiary.js`, loaded in index.html's exact order, with `document`/
`window`/`localStorage`/`AudioContext` stubs)

```
Loaded files: 59
Errors: 0
```

Zero thrown errors across all 59 loaded scripts. (`js/ui/roomEditor.js` is not
referenced in `index.html` at all, so the exclusion list's 5th name had nothing
to exclude — confirmed by grep, not a deviation.)

### 4. Post-load data checks

```
ENEMY_LIST total: 726
11C enemy count: 33
10C enemy count: 37
9C enemy count: 37
BOSS_LIST 11C count: 0
ENEMY_LIST ids length: 726 unique: 726 dup-free: true
```

- `'11C'` enemy count is **33**, exactly matching the pure `types-3.js`
  "one entry per behavior" count for both `'9C'` and `'10C'` (also 33 each,
  confirmed by the same programmatic parse used during authoring). The
  reported `'9C'`/`'10C'` totals above (37 each) include 4 extra
  `locked:true` achievement-unlock entries per floorKey that live separately
  in `types-4.js` (a different, pre-existing bucket convention plan
  Task 1 explicitly said to leave untouched) — `'11C'` was not asked to add
  an achievement-locked bucket, so 33 vs. 37 is expected, not a shortfall.
- `BOSS_LIST` filtered to `'11C'` is **0**, confirming no `BOSS_TYPES` entries
  were added, per the plan's explicit instruction and the branch-wide
  no-per-floorKey-boss-pool convention.
- No duplicate `id` anywhere in the full 726-entry `ENEMY_LIST` (`ids.length
  === Set size`, both 726).

### 5. Behavior → AI dispatch coverage

`js/systems/combat-3.js`'s `switch (e.behavior)` (the generic-enemy AI
dispatcher) has a `case` for every one of the 21 distinct behavior strings
used across the 33 new `'11C'` entries — `chaser`, `ranged`, `flyer`, `bomber`,
`charger`, `turret`, `leaper`, `splitter`, `orbiter`, `burrower`, `summoner`,
`healer`, `sniper`, `swarm`, `ambusher`, `teleporter`, `shielder`, `lobber`,
`weaver`, `sentry`, `shielded` — all pre-existing generic behaviors, confirmed
via direct grep against `combat-3.js` lines 94-113. No new AI code was written
or touched.

## Deviations from plan

None. Every task item was completed as specified:
- `'11C'` roster added, 33 entries, one-per-behavior + extra-flavors
  convention matched exactly to `'9C'`/`'10C'`, all ids unique, mangrove/tidal
  theme, palette anchored on `accent:'#d8c88a'` plus dark wet-root
  browns/teals.
- No `BOSS_TYPES` entries added for `'11C'` (branch-wide convention
  preserved).
- `'10C'` stale "Kirk DNB" comment corrected to `monsoon` (Monsoon DNB), text
  only.
- `js/CODE_REFERENCE.md` updated in the same implementer pass, matching the
  Phase 7b `'13'`/`'14'` documentation format, plus the C-branch
  no-boss-pool convention noted explicitly.
- Three originally-chosen ids (`gasbladder`, `driftcircler`, `mistblink`)
  collided with existing ids elsewhere in the codebase and were renamed
  before use (`bloatbladder`, `duskcircler`, `brackmist`) — not a deviation
  from the plan, but exactly the collision-avoidance step the plan asked for.
