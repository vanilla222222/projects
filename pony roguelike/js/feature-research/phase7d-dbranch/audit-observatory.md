# Phase 7d — The Observatory (4D/5D) enemy rosters — audit

## Files changed
- `js/data/enemies/types-4.js` — added the 33-entry `'4D'` roster and the 33-entry `'5D'` roster
  (66 new `ENEMY_TYPES` entries total), appended after the achievement-locked creature block and
  `swarmerdnb`, right before the closing `});`.
- `js/CODE_REFERENCE.md` — added a "Phase 7d" paragraph + table documenting both rosters, in the
  same format used for Phase 7b's `'13'`/`'14'` docs and Phase 7c's `'11C'` docs, inserted right
  after the existing `'11C'` "no BOSS_TYPES" paragraph.
- `feature-research/phase7d-dbranch/audit-observatory.md` — this file (new).

No other files were touched. `js/data/enemies/bosses.js` was deliberately left untouched — per the
task's branch-wide convention, the D-branch (like the C-branch) gets no `BOSS_TYPES` mid-boss pool
at any floorKey; `'5D'`'s existing superboss `astrolabe` (in `js/data/enemies/superbosses.js`,
already present, untouched) is the only "boss" content across `'4D'`/`'5D'`.

## Scope check
Confirmed before starting: `'4D'`/`'5D'` had zero `ENEMY_TYPES` and zero `BOSS_TYPES` entries
(grep across `js/data/enemies/*.js` came back empty for both floorKeys prior to this change). No
AI/behavior implementation code was touched — every entry below reuses one of the 21 existing
generic behaviors already dispatched in `js/systems/combat-3.js`.

## Full stat blocks

### `'4D'` — 21 base entries (one per behavior)

```js
lensdrifter: { id:'lensdrifter', name:'DNB Lens Drifter', hp:9, dmg:4, speed:150, radius:11, color:'#8a7a9c', dark:'#463d51',
  behavior:'chaser', contactCooldown:0.45, floorKey:'4D' },
dustmote: { id:'dustmote', name:'DNB Dust Mote', hp:8, dmg:4, speed:136, radius:9, color:'#c9b06a', dark:'#655a34',
  behavior:'flyer', fireCooldown:1.4, boltSpeed:235, flies:true, floorKey:'4D' },
starshard: { id:'starshard', name:'DNB Star Shard', hp:9, dmg:4, speed:122, radius:11, color:'#d9c98a', dark:'#6c6544',
  behavior:'bomber', fuseTime:0.75, blastRadius:106, floorKey:'4D' },
brassbulwark: { id:'brassbulwark', name:'DNB Brass Bulwark', hp:16, dmg:4, speed:50, radius:14, color:'#a68a4a', dark:'#544525',
  behavior:'shielded', shieldTime:1.65, vulnTime:1.5, floorKey:'4D' },
comettusk: { id:'comettusk', name:'DNB Comet Tusk', hp:16, dmg:5, speed:70, radius:13, color:'#8a6a3a', dark:'#45351d',
  behavior:'charger', chargeCooldown:1.75, chargeSpeed:7.9, telegraphTime:0.4, floorKey:'4D' },
spyglassturret: { id:'spyglassturret', name:'DNB Spyglass Turret', hp:12, dmg:4, speed:0, radius:12, color:'#6a5a42', dark:'#352d21',
  behavior:'turret', fireCooldown:1.15, boltSpeed:280, floorKey:'4D' },
astralhopper: { id:'astralhopper', name:'DNB Astral Hopper', hp:10, dmg:4, speed:75, radius:11, color:'#9c8ac0', dark:'#4e4560',
  behavior:'leaper', leapCooldown:1.15, leapSpeed:6.4, telegraphTime:0.24, floorKey:'4D' },
novaslinger: { id:'novaslinger', name:'DNB Nova Slinger', hp:9, dmg:4, speed:66, radius:11, color:'#c9925a', dark:'#654a2d',
  behavior:'ranged', keepDistance:225, fireCooldown:1.2, boltSpeed:275, floorKey:'4D' },
gravitymortar: { id:'gravitymortar', name:'DNB Gravity Mortar', hp:12, dmg:4, speed:58, radius:13, color:'#5a4a6a', dark:'#2d2535',
  behavior:'lobber', lobRange:340, lobTime:0.8, burstRadius:63, fireCooldown:1.95, floorKey:'4D' },
constellationweaver: { id:'constellationweaver', name:'DNB Constellation Weaver', hp:11, dmg:4, speed:112, radius:12, color:'#7a92c0', dark:'#3d4960',
  behavior:'weaver', weaveAmplitude:0.82, weaveFrequency:3.9, floorKey:'4D' },
domewatcher: { id:'domewatcher', name:'DNB Dome Watcher', hp:14, dmg:4, speed:44, radius:12, color:'#42383a', dark:'#211c1d',
  behavior:'sentry', sentryThreshold:35, fireRange:490, fireCooldown:1, boltSpeed:265,
  boltColor:'#e6d49a', boltRadius:5, floorKey:'4D' },
planetcircler: { id:'planetcircler', name:'DNB Planet Circler', hp:9, dmg:5, speed:120, radius:9, color:'#c9a852', dark:'#65541e',
  behavior:'orbiter', flies:true, orbitRadius:150, orbitSpeed:1.72, fireRange:430, fireCooldown:1.35, boltSpeed:245,
  boltColor:'#f0dfa0', boltRadius:4, floorKey:'4D' },
dustborer: { id:'dustborer', name:'DNB Dust Borer', hp:17, dmg:4, speed:76, radius:13, color:'#443a2c', dark:'#221d16',
  behavior:'burrower', burrowCooldown:2.3, burrowTime:1.45, floorKey:'4D' },
starmites: { id:'starmites', name:'DNB Star Mites', hp:5, dmg:3, speed:162, radius:7, color:'#e0d090', dark:'#706848',
  behavior:'swarm', driftAmount:0.7, floorKey:'4D' },
dustcluster: { id:'dustcluster', name:'DNB Dust Cluster', hp:14, dmg:4, speed:84, radius:13, color:'#8a7a5a', dark:'#453d2d',
  behavior:'splitter', splitInto:'starmites', floorKey:'4D' },
constellationcaller: { id:'constellationcaller', name:'DNB Constellation Caller', hp:11, dmg:5, speed:66, radius:11, color:'#5a4a8a', dark:'#2d2545',
  behavior:'summoner', summonId:'starmites', summonCount:5, summonCooldown:4.6, maxSummons:10, keepDistance:180, floorKey:'4D' },
lensmender: { id:'lensmender', name:'DNB Lens Mender', hp:11, dmg:3, speed:86, radius:11, color:'#a0d0c0', dark:'#506860',
  behavior:'healer', healAmount:6, healCooldown:2.5, healRadius:170, floorKey:'4D' },
brasswarden: { id:'brasswarden', name:'DNB Brass Warden', hp:14, dmg:4, speed:54, radius:13, color:'#8a7042', dark:'#453821',
  behavior:'shielder', shieldRadius:176, shieldGrantTime:3.1, shieldCooldown:3.7, keepDistance:205, floorKey:'4D' },
telescopemarksman: { id:'telescopemarksman', name:'DNB Telescope Marksman', hp:10, dmg:5, speed:64, radius:10, color:'#3a3a4a', dark:'#1d1d25',
  behavior:'sniper', fireRange:630, telegraphTime:0.9, fireCooldown:2.1, boltSpeed:525,
  boltColor:'#e0c98a', boltRadius:4, weight:0.6, floorKey:'4D' },
stardriftblink: { id:'stardriftblink', name:'DNB Stardrift Blink', hp:10, dmg:4, speed:0, radius:11, color:'#3a5a7a', dark:'#1d2d3d',
  behavior:'teleporter', blinkCooldown:2.6, blinkRange:270, fireRange:470, fireCooldown:1.1, boltSpeed:270,
  boltColor:'#c9dbf0', boltRadius:5, floorKey:'4D' },
shadowcomet: { id:'shadowcomet', name:'DNB Shadow Comet', hp:13, dmg:5, speed:74, radius:12, color:'#4a3a5a', dark:'#251d2d',
  behavior:'ambusher', triggerRange:134, chargeSpeed:8.3, dashDuration:0.5, telegraphTime:0.18, chargeCooldown:1.8, floorKey:'4D' },
```

### `'4D'` — 12 extra-flavor entries (behaviors doubled up, same pattern `'11C'` used over `'10C'`)

```js
duststrider: { id:'duststrider', name:'DNB Dust Strider', hp:23, dmg:5, speed:48, radius:17, color:'#3a3428', dark:'#1d1a14',
  behavior:'chaser', contactCooldown:1.1, floorKey:'4D' },
cometsprinter: { id:'cometsprinter', name:'DNB Comet Sprinter', hp:8, dmg:4, speed:166, radius:9, color:'#e0c93a', dark:'#70651d',
  behavior:'chaser', contactCooldown:0.4, floorKey:'4D' },
glassslinger: { id:'glassslinger', name:'DNB Glass Slinger', hp:10, dmg:4, speed:54, radius:12, color:'#8a9c8a', dark:'#454e45',
  behavior:'ranged', keepDistance:175, fireCooldown:1.8, boltSpeed:215, floorKey:'4D' },
meteorspark: { id:'meteorspark', name:'DNB Meteor Spark', hp:9, dmg:4, speed:134, radius:10, color:'#d9722a', dark:'#6c3915',
  behavior:'bomber', fuseTime:0.66, blastRadius:104, flies:true, floorKey:'4D' },
dustmoth: { id:'dustmoth', name:'DNB Dust Moth', hp:8, dmg:4, speed:144, radius:9, color:'#5a5a6a', dark:'#2d2d35',
  behavior:'flyer', fireCooldown:1.3, boltSpeed:245, flies:true, floorKey:'4D' },
brassram: { id:'brassram', name:'DNB Brass Ram', hp:17, dmg:5, speed:62, radius:15, color:'#5a4a2a', dark:'#2d2515',
  behavior:'charger', chargeCooldown:1.95, chargeSpeed:7.8, telegraphTime:0.44, floorKey:'4D' },
stardustmortar: { id:'stardustmortar', name:'DNB Stardust Mortar', hp:12, dmg:4, speed:66, radius:12, color:'#7a6a4a', dark:'#3d3525',
  behavior:'lobber', lobRange:310, lobTime:0.85, burstRadius:59, fireCooldown:2.05, floorKey:'4D' },
lensborer: { id:'lensborer', name:'DNB Lens Borer', hp:16, dmg:4, speed:82, radius:12, color:'#4a3a3a', dark:'#251d1d',
  behavior:'burrower', burrowCooldown:2, burrowTime:1.2, floorKey:'4D' },
satellitecircler: { id:'satellitecircler', name:'DNB Satellite Circler', hp:10, dmg:5, speed:114, radius:10, color:'#c0b8d9', dark:'#605c6c',
  behavior:'orbiter', orbitRadius:148, orbitSpeed:1.65, fireRange:430, fireCooldown:1.45, boltSpeed:255, floorKey:'4D' },
telescopesentinel: { id:'telescopesentinel', name:'DNB Telescope Sentinel', hp:14, dmg:4, speed:46, radius:12, color:'#443c30', dark:'#221e18',
  behavior:'sentry', sentryThreshold:35, fireRange:475, fireCooldown:1.05, boltSpeed:260, floorKey:'4D' },
novablink: { id:'novablink', name:'DNB Nova Blink', hp:10, dmg:4, speed:0, radius:11, color:'#7a6a9a', dark:'#3d354d',
  behavior:'teleporter', blinkCooldown:2.8, blinkRange:250, fireRange:450, fireCooldown:1.15, boltSpeed:260, floorKey:'4D' },
domebulwark: { id:'domebulwark', name:'DNB Dome Bulwark', hp:20, dmg:5, speed:44, radius:15, color:'#524a3a', dark:'#29251d',
  behavior:'shielded', shieldTime:2.05, vulnTime:1.35, floorKey:'4D' },
```

### `'5D'` — 21 base entries (one per behavior, ~5-10% above `'4D'`)

```js
astrolabestalker: { id:'astrolabestalker', name:'DNB Astrolabe Stalker', hp:10, dmg:4, speed:156, radius:11, color:'#c9b06a', dark:'#655a34',
  behavior:'chaser', contactCooldown:0.42, floorKey:'5D' },
cometwisp: { id:'cometwisp', name:'DNB Comet Wisp', hp:9, dmg:5, speed:142, radius:9, color:'#d9c98a', dark:'#6c6544',
  behavior:'flyer', fireCooldown:1.3, boltSpeed:245, flies:true, floorKey:'5D' },
quasarshard: { id:'quasarshard', name:'DNB Quasar Shard', hp:10, dmg:4, speed:128, radius:11, color:'#e0d090', dark:'#706848',
  behavior:'bomber', fuseTime:0.72, blastRadius:112, floorKey:'5D' },
brassaegis: { id:'brassaegis', name:'DNB Brass Aegis', hp:17, dmg:4, speed:50, radius:14, color:'#b6964f', dark:'#5b4b28',
  behavior:'shielded', shieldTime:1.6, vulnTime:1.55, floorKey:'5D' },
meteortusk: { id:'meteortusk', name:'DNB Meteor Tusk', hp:17, dmg:5, speed:74, radius:13, color:'#977040', dark:'#4c3820',
  behavior:'charger', chargeCooldown:1.7, chargeSpeed:8.2, telegraphTime:0.38, floorKey:'5D' },
opticturret: { id:'opticturret', name:'DNB Optic Turret', hp:13, dmg:4, speed:0, radius:12, color:'#766448', dark:'#3b3224',
  behavior:'turret', fireCooldown:1.1, boltSpeed:295, floorKey:'5D' },
starhopper: { id:'starhopper', name:'DNB Star Hopper', hp:11, dmg:4, speed:78, radius:11, color:'#ac9ac9', dark:'#564d65',
  behavior:'leaper', leapCooldown:1.1, leapSpeed:6.6, telegraphTime:0.22, floorKey:'5D' },
gravslinger: { id:'gravslinger', name:'DNB Grav Slinger', hp:10, dmg:4, speed:68, radius:11, color:'#d6a266', dark:'#6b5133',
  behavior:'ranged', keepDistance:230, fireCooldown:1.15, boltSpeed:290, floorKey:'5D' },
novamortar: { id:'novamortar', name:'DNB Nova Mortar', hp:13, dmg:4, speed:58, radius:13, color:'#63527a', dark:'#31293d',
  behavior:'lobber', lobRange:345, lobTime:0.75, burstRadius:65, fireCooldown:1.9, floorKey:'5D' },
nebulaweaver: { id:'nebulaweaver', name:'DNB Nebula Weaver', hp:12, dmg:4, speed:116, radius:12, color:'#87a2d0', dark:'#43516a',
  behavior:'weaver', weaveAmplitude:0.85, weaveFrequency:4, floorKey:'5D' },
astrariumwatcher: { id:'astrariumwatcher', name:'DNB Astrarium Watcher', hp:15, dmg:4, speed:44, radius:12, color:'#4a3f42', dark:'#252022',
  behavior:'sentry', sentryThreshold:36, fireRange:495, fireCooldown:0.95, boltSpeed:270,
  boltColor:'#eedaa4', boltRadius:5, floorKey:'5D' },
ringcircler: { id:'ringcircler', name:'DNB Ring Circler', hp:10, dmg:5, speed:124, radius:9, color:'#d9b85a', dark:'#6d5c2d',
  behavior:'orbiter', flies:true, orbitRadius:154, orbitSpeed:1.78, fireRange:435, fireCooldown:1.3, boltSpeed:250,
  boltColor:'#f6e6ac', boltRadius:4, floorKey:'5D' },
gravityborer: { id:'gravityborer', name:'DNB Gravity Borer', hp:18, dmg:4, speed:78, radius:13, color:'#4c4030', dark:'#26201a',
  behavior:'burrower', burrowCooldown:2.2, burrowTime:1.4, floorKey:'5D' },
cosmicmites: { id:'cosmicmites', name:'DNB Cosmic Mites', hp:5, dmg:3, speed:166, radius:7, color:'#ecdc9c', dark:'#766e50',
  behavior:'swarm', driftAmount:0.72, floorKey:'5D' },
nebulacluster: { id:'nebulacluster', name:'DNB Nebula Cluster', hp:15, dmg:4, speed:86, radius:13, color:'#96865e', dark:'#4b4330',
  behavior:'splitter', splitInto:'cosmicmites', floorKey:'5D' },
astralcaller: { id:'astralcaller', name:'DNB Astral Caller', hp:12, dmg:5, speed:68, radius:11, color:'#62508e', dark:'#312847',
  behavior:'summoner', summonId:'cosmicmites', summonCount:5, summonCooldown:4.4, maxSummons:10, keepDistance:182, floorKey:'5D' },
glassmender: { id:'glassmender', name:'DNB Glass Mender', hp:12, dmg:3, speed:88, radius:11, color:'#aad8c8', dark:'#556c64',
  behavior:'healer', healAmount:6, healCooldown:2.4, healRadius:174, floorKey:'5D' },
astrolabewarden: { id:'astrolabewarden', name:'DNB Astrolabe Warden', hp:15, dmg:4, speed:56, radius:13, color:'#977c4a', dark:'#4c3e25',
  behavior:'shielder', shieldRadius:180, shieldGrantTime:3, shieldCooldown:3.6, keepDistance:208, floorKey:'5D' },
precisionmarksman: { id:'precisionmarksman', name:'DNB Precision Marksman', hp:11, dmg:5, speed:66, radius:10, color:'#42425a', dark:'#21212d',
  behavior:'sniper', fireRange:640, telegraphTime:0.85, fireCooldown:2.05, boltSpeed:535,
  boltColor:'#e6d29a', boltRadius:4, weight:0.6, floorKey:'5D' },
voidblink: { id:'voidblink', name:'DNB Void Blink', hp:11, dmg:4, speed:0, radius:11, color:'#42648a', dark:'#213245',
  behavior:'teleporter', blinkCooldown:2.5, blinkRange:280, fireRange:475, fireCooldown:1.05, boltSpeed:280,
  boltColor:'#d0e2f6', boltRadius:5, floorKey:'5D' },
eclipsecomet: { id:'eclipsecomet', name:'DNB Eclipse Comet', hp:14, dmg:5, speed:76, radius:12, color:'#523f64', dark:'#292034',
  behavior:'ambusher', triggerRange:138, chargeSpeed:8.5, dashDuration:0.5, telegraphTime:0.16, chargeCooldown:1.75, floorKey:'5D' },
```

### `'5D'` — 12 extra-flavor entries

```js
gravitybrute: { id:'gravitybrute', name:'DNB Gravity Brute', hp:25, dmg:5, speed:50, radius:17, color:'#443c30', dark:'#221e18',
  behavior:'chaser', contactCooldown:1.05, floorKey:'5D' },
starstreak: { id:'starstreak', name:'DNB Star Streak', hp:9, dmg:4, speed:172, radius:9, color:'#eedc4a', dark:'#776e25',
  behavior:'chaser', contactCooldown:0.38, floorKey:'5D' },
prismslinger: { id:'prismslinger', name:'DNB Prism Slinger', hp:11, dmg:4, speed:56, radius:12, color:'#96ac96', dark:'#4b564b',
  behavior:'ranged', keepDistance:178, fireCooldown:1.75, boltSpeed:222, floorKey:'5D' },
fluxshard: { id:'fluxshard', name:'DNB Flux Shard', hp:10, dmg:4, speed:138, radius:10, color:'#e28438', dark:'#71421c',
  behavior:'bomber', fuseTime:0.62, blastRadius:110, flies:true, floorKey:'5D' },
astralmoth: { id:'astralmoth', name:'DNB Astral Moth', hp:9, dmg:5, speed:150, radius:9, color:'#66667a', dark:'#33333d',
  behavior:'flyer', fireCooldown:1.25, boltSpeed:255, flies:true, floorKey:'5D' },
brassjuggernaut: { id:'brassjuggernaut', name:'DNB Brass Juggernaut', hp:18, dmg:5, speed:64, radius:15, color:'#665430', dark:'#332a18',
  behavior:'charger', chargeCooldown:1.9, chargeSpeed:8.1, telegraphTime:0.42, floorKey:'5D' },
cometmortar: { id:'cometmortar', name:'DNB Comet Mortar', hp:13, dmg:4, speed:68, radius:12, color:'#8a7852', dark:'#453c29',
  behavior:'lobber', lobRange:315, lobTime:0.8, burstRadius:61, fireCooldown:2, floorKey:'5D' },
duskborer: { id:'duskborer', name:'DNB Dusk Borer', hp:17, dmg:4, speed:86, radius:12, color:'#543f3f', dark:'#2a2020',
  behavior:'burrower', burrowCooldown:1.9, burrowTime:1.15, floorKey:'5D' },
mooncircler: { id:'mooncircler', name:'DNB Moon Circler', hp:11, dmg:5, speed:118, radius:10, color:'#d6cce8', dark:'#6b6674',
  behavior:'orbiter', orbitRadius:152, orbitSpeed:1.7, fireRange:435, fireCooldown:1.4, boltSpeed:260, floorKey:'5D' },
opticsentinel: { id:'opticsentinel', name:'DNB Optic Sentinel', hp:15, dmg:4, speed:48, radius:12, color:'#4c443a', dark:'#26221d',
  behavior:'sentry', sentryThreshold:36, fireRange:480, fireCooldown:1, boltSpeed:265, floorKey:'5D' },
riftblink: { id:'riftblink', name:'DNB Rift Blink', hp:11, dmg:4, speed:0, radius:11, color:'#8a72a8', dark:'#453954',
  behavior:'teleporter', blinkCooldown:2.7, blinkRange:260, fireRange:455, fireCooldown:1.1, boltSpeed:265, floorKey:'5D' },
astralbulwark: { id:'astralbulwark', name:'DNB Astral Bulwark', hp:22, dmg:5, speed:46, radius:15, color:'#544a3a', dark:'#29251d',
  behavior:'shielded', shieldTime:2, vulnTime:1.4, floorKey:'5D' },
```

## Id collision check

Grepped the full codebase (`grep -rn "id:'<id>'" js/`) for all 66 candidate ids before finalizing
— zero hits for any of them prior to adding the entries. Result: `count: 66` (all 66 ids checked,
zero collisions reported).

## Verification (exact output)

**1. `node --check js/data/enemies/types-4.js`**
```
$ node --check js/data/enemies/types-4.js && echo OK_CHECK
OK_CHECK
```

**2. Full sweep — every `.js` file under `js/`**
```
$ for f in $(find js -name "*.js"); do node --check "$f" || echo "FAIL: $f"; done
(no output — clean, zero FAIL lines)
```

**3/4/5. Node `vm` harness loading every `<script>` from `index.html` except `js/main.js`,
`js/ui/ui.js`, `js/ui/render.js`, `js/ui/roomEditor.js`, `js/ui/bestiary.js` (52 files, in
`index.html` order), then querying `ENEMY_LIST`/`BOSS_LIST` inside the same `vm` context:**

```
LOAD_OK
{
  "total": 792,
  "d4": 33,
  "d5": 33,
  "bossD": 0,
  "idsLen": 792,
  "idsUnique": 792
}
```

- Zero thrown errors loading all 52 non-excluded scripts (`LOAD_OK`).
- `ENEMY_LIST.filter(e=>e.floorKey==='4D').length` → **33**
- `ENEMY_LIST.filter(e=>e.floorKey==='5D').length` → **33**
- `BOSS_LIST.filter(b=>b.floorKey==='4D'||b.floorKey==='5D').length` → **0**
- `ENEMY_LIST` total size after the change: **792** entries, ids length **792**, unique ids
  (`Set` size) **792** — zero duplicate ids across the entire list (5, above the top-level
  requirement of checking just the new 66, confirms no regression anywhere else either).

**6. Behavior dispatch coverage** — grepped `js/systems/combat-3.js`'s `switch(e.behavior)` block;
all 21 behaviors used across the new entries have a live `case` there:

```
case 'chaser': case 'shielded': aiChase(game, e, dt); break;
case 'ranged': aiRanged(game, e, dt); break;
case 'flyer': aiFlyer(game, e, dt); break;
case 'bomber': aiBomber(game, e, dt); break;
case 'charger': aiCharger(game, e, dt); break;
case 'turret': aiTurret(game, e, dt); break;
case 'leaper': aiLeaper(game, e, dt); break;
case 'splitter': aiChase(game, e, dt); break;
case 'orbiter': aiOrbiter(game, e, dt); break;
case 'burrower': aiBurrower(game, e, dt); break;
case 'summoner': aiSummoner(game, e, dt); break;
case 'healer': aiHealer(game, e, dt); break;
case 'sniper': aiSniper(game, e, dt); break;
case 'swarm': aiSwarm(game, e, dt); break;
case 'ambusher': aiAmbusher(game, e, dt); break;
case 'teleporter': aiTeleporter(game, e, dt); break;
case 'shielder': aiShielder(game, e, dt); break;
case 'lobber': aiLobber(game, e, dt); break;
case 'weaver': aiWeaver(game, e, dt); break;
case 'sentry': aiSentry(game, e, dt); break;
```
All 21 behaviors used by the 66 new entries (chaser, flyer, bomber, shielded, charger, turret,
leaper, ranged, lobber, weaver, sentry, orbiter, burrower, swarm, splitter, summoner, healer,
shielder, sniper, teleporter, ambusher) have a matching case above. No new behavior strings were
introduced.

## Deviations from the plan

None. All 66 entries land exactly as specified: 21 base + 12 extra-flavor per floorKey, `'4D'`
calibrated in line with `'11C'`'s numbers, `'5D'` stepped up (hp/dmg mostly +1, speeds ~+3-8%,
`weaveFrequency`/`orbitSpeed`/bolt speeds nudged up similarly — reads as ~5-10% heavier across the
roster without any single stat spiking). `splitter`/`summoner` entries reference only in-roster
ids (`starmites` for `'4D'`, `cosmicmites` for `'5D'`) so no cross-floorKey dependency was
introduced. `js/data/enemies/bosses.js` was not touched, matching the mandated D-branch/C-branch
convention of zero per-floorKey `BOSS_TYPES` pools.
