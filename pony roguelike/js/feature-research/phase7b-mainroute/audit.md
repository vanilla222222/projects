# Phase 7b main-route content — audit

## Files changed
- `js/data/enemies/bosses.js` — added 4 boss entries: `lastovertone`, `hollowcantor` (floorKey `'13'`), `flatlinewraith`, `zeroamplitude` (floorKey `'14'`).
- `js/data/enemies/types-4.js` — added 4 enemy entries, all floorKey `'14'`: `deadaircoda`, `flatlineburrower`, `silencestalker`, `decrescendosplitter`.
- `js/CODE_REFERENCE.md` — updated entry counts (`ENEMY_TYPES` 689→693, `BOSS_TYPES` 60→64), added a `'14'` floorKey to the field-schema table, and added two new documentation blocks (one in the enemies section, one in the bosses section) describing the new rosters, following the same format as the existing Phase 7a superboss table.
- `feature-research/phase7b-mainroute/audit.md` — this file (new).

No AI/behavior code was touched. Every new entry reuses an existing `behavior` string that already has a dispatch case and function body.

## Task 1 — floorKey '13' regular bosses (js/data/enemies/bosses.js)

Anchors used: 12A/12B regular-boss hp range (58-62, read directly from `feedbackeffigy`/`brokenrefrain`/`redlineravager`/`clippingcolossus`) and this floor's superboss `wobbler` (hp 73, from `superbosses.js`). Interpolated between them, glass-cannon lower / siege-body higher:

```js
lastovertone: { id:'lastovertone', name:'The Last Overtone', hp:64, dmg:2, speed:84, radius:23,
  color:'#7a8ac0', dark:'#38406a', behavior:'bossShadowStalker', floorKey:'13' },
hollowcantor: { id:'hollowcantor', name:'The Hollow Cantor', hp:68, dmg:3, speed:44, radius:31,
  color:'#525d80', dark:'#262c40', behavior:'bossFrostSentinel', floorKey:'13' },
```

- `lastovertone` — glass cannon, reuses `bossShadowStalker` (blink-and-triple-shot pursuit AI). hp 64 (below `wobbler`'s 73), speed 84 (faster than the 9A original's 62, in line with how other glass-cannon reuses of this function like `sepulchershade` (speed 78) push speed up), radius 23 (smallest of the pair).
- `hollowcantor` — siege body, reuses `bossFrostSentinel` (kite-then-triple-shot AI). hp 68, speed 44 (slower than the 9B original's 52, following the same "siege body = slower" pattern `fenwarden` uses on this same function, speed 40), radius 31 (largest of the pair, dmg 3 vs. the glass cannon's 2).
- Colors sit in the `HOLLOW_CHORUS_PALETTE` cold blue-violet family (`#6a7fc9`): `lastovertone` closer to the palette accent, `hollowcantor` desaturated toward cold grey for visual distinction between the pair.
- Names: "Last Overtone" (a fading treble note) and "Hollow Cantor" (a hollowed-out choir lead) — both distinct from `polyrhythm`/`fermatasentry`/`syncopehopper`/`tremorswarm` (the existing `'13'` enemies) and from `wobbler`/`subdrop`.

No extra config fields were needed — `aiBossShadowStalker` and `aiBossFrostSentinel` (read in full from `js/systems/ai-3.js`) only reference `e.telegraph`/`e.attackTimer`/`e.fireTimer`/`e.speed`/`e.dmg`/`e.type.color`-style fields that every boss entry gets generically; neither reads a boss-specific tuning field the way `bossIronBastion` reads `burstRadius`.

## Task 2 — floorKey '14' enemies + bosses

### Enemies (js/data/enemies/types-4.js)

Floor `'13'`'s already-authored roster uses `weaver`/`sentry`/`leaper`/`swarm` (from `polyrhythm`/`fermatasentry`/`syncopehopper`/`tremorswarm`, left untouched as instructed). The 4 new `'14'` entries use 4 different behaviors — `sniper`/`burrower`/`ambusher`/`splitter` — chosen for the "final floor" escalation feel the plan suggested. Stats were calibrated by taking the closest existing same-behavior template (mostly 11B/12A-tier entries, e.g. `anglerlantern`/`discordmarksman` for sniper, `thunderhusk`/`ductburrower` for burrower, `orchidlurker`/`ocelotlurker` for ambusher, `shardsplitter` for splitter) and bumping hp/dmg/speed ~10-15%:

```js
deadaircoda: { id:'deadaircoda', name:'DNB Dead Air Coda', hp:6, dmg:3, speed:54, radius:10, color:'#e0604a', dark:'#7a3020',
  behavior:'sniper', fireRange:565, telegraphTime:1.1, fireCooldown:2.5, boltSpeed:460,
  boltColor:'#ff9a7a', boltRadius:4, floorKey:'14' },
flatlineburrower: { id:'flatlineburrower', name:'DNB Flatline Burrower', hp:6, dmg:2, speed:70, radius:12, color:'#c9503a', dark:'#661f14',
  behavior:'burrower', burrowCooldown:2.8, burrowTime:1.3, floorKey:'14' },
silencestalker: { id:'silencestalker', name:'DNB Silence Stalker', hp:7, dmg:3, speed:66, radius:12, color:'#a83a2a', dark:'#521a12',
  behavior:'ambusher', triggerRange:130, chargeSpeed:7, dashDuration:0.48, telegraphTime:0.28, chargeCooldown:2.1, floorKey:'14' },
decrescendosplitter: { id:'decrescendosplitter', name:'DNB Decrescendo Splitter', hp:7, dmg:2, speed:88, radius:12, color:'#e0755a', dark:'#7a3624',
  behavior:'splitter', splitInto:'swarmerdnb', floorKey:'14' },
```

- `deadaircoda` (sniper) — hp6/dmg3/speed54, telegraphed 3-shot burst at range 565. Anchored against `anglerlantern`(hp5) and `discordmarksman`(hp5, 12A) with hp/speed bumped.
- `flatlineburrower` (burrower) — hp6/dmg2/speed70, pop-up-and-strike cycle. Anchored against `thunderhusk`/`ductburrower` (hp5, speed62).
- `silencestalker` (ambusher) — hp7/dmg3/speed66, dash-out-of-hiding attacker. Anchored against `orchidlurker`(hp6)/`ocelotlurker`(hp6).
- `decrescendosplitter` (splitter) — hp7/dmg2/speed88, splits into `swarmerdnb` on death (same split target `shardsplitter`'s 12A entry uses — an existing, already-`isMinion` id, no new minion type authored).
- Colors sit in the `FINAL_WAVEFORM_PALETTE` dark-red family (`#e0604a`), each shade distinct.
- Names are ending/silence-themed (dead air, flatline, silence, decrescendo) and don't collide with any existing id — verified by grep (see Verification §3 below).

### Bosses (js/data/enemies/bosses.js)

Plan asked to reuse `bossBrimstoneHorror` (glass-cannon-leaning) and `bossCinderColossus` (siege-body). **Both function names exist exactly as named** — confirmed in `js/systems/ai-2.js` (`aiBossCinderColossus` line 475, `aiBossBrimstoneHorror` line 532) and both already have dispatch cases in `js/systems/combat-3.js` (`case 'bossCinderColossus'`/`case 'bossBrimstoneHorror'`). **No substitution was needed.**

```js
flatlinewraith: { id:'flatlinewraith', name:'The Flatline Wraith', hp:70, dmg:2, speed:80, radius:26,
  color:'#e0604a', dark:'#7a2e1a', behavior:'bossBrimstoneHorror', floorKey:'14' },
zeroamplitude: { id:'zeroamplitude', name:'The Zero Amplitude', hp:73, dmg:3, speed:46, radius:34,
  color:'#8a2818', dark:'#3e1008', behavior:'bossCinderColossus', floorKey:'14' },
```

Anchored between the new `'13'` boss pair (hp 64/68) and this floor's superboss `subdrop` (hp 75): `flatlinewraith` hp70 (glass-cannon role — `bossBrimstoneHorror`'s kite-and-burst-fire pattern reads as the more evasive/aggressive of the pair even though the underlying function isn't a blink), `zeroamplitude` hp73 (siege body — `bossCinderColossus`'s AoE ground-slam + occasional minion add reads as the tankier role), both under `subdrop`'s 75.

Both AI functions were read in full (`js/systems/ai-2.js` lines 475-558): neither reads a boss-specific tuning field off `e.type` beyond the generic hp/dmg/speed/radius/color set — `bossCinderColossus`'s explosion radius is a hardcoded local `const R = 160`, not `e.type.burstRadius`, so (unlike `ironbastion`/`brinebloom`/`rotbloom`) no extra field was required.

**Deviation note (not a substitution, a disclosure):** both reused functions summon Inferno-flavored minions at low hp (`aiBossCinderColossus` → `cinderhound`, `aiBossBrimstoneHorror` → `brimstonebomber`) — a pre-existing behavior baked into the AI functions themselves, which the plan forbade touching. This is off-theme (fire-elemental minions on a "final waveform" floor) but is the same tradeoff every other `BOSS_TYPES` entry that reuses a minion-spawning function already accepts elsewhere in the file (e.g. `bossAshTyrant`/`bossMagmaWraith` reuses spawn Inferno adds regardless of the borrowing floor's theme); no in-file comment claims these two functions are minion-free, so this isn't a violation of the "no off-theme summons" discipline other blocks in the file explicitly follow (that discipline is scoped to functions the comments call out as non-summoning).

## Verification

### 1. `node --check` on touched files
```
$ node --check js/data/enemies/bosses.js && node --check js/data/enemies/types-4.js && echo OK_TOUCHED
OK_TOUCHED
```

### 2. Full sweep of every js/**/*.js
```
$ for f in $(find /home/vanilla/Downloads/adele2/js -name "*.js"); do node --check "$f" || echo "FAIL: $f"; done
(no output — every file passed, no FAIL lines)
```

### 3. Node harness — load every index.html script (excluding main.js/ui.js/render.js/roomEditor.js/bestiary.js) via `vm.runInContext`, in load order

```
LOAD_OK
```
No thrown errors during load.

### 4. Post-load checks (exact output)
```json
{
  "enemy13": 12,
  "enemy14": 4,
  "boss13": 2,
  "boss14": 2,
  "enemyListLength": 693,
  "enemyIdSetSize": 693,
  "enemyDupFree": true,
  "bossListLength": 64,
  "bossIdSetSize": 64,
  "bossDupFree": true
}
```
- `ENEMY_LIST.filter(floorKey==='13').length` = **12** (not 4 — see deviation note below), `.filter(floorKey==='14').length` = **4** (the new entries, as expected).
- `BOSS_LIST.filter(floorKey==='13').length` = **2**, `.filter(floorKey==='14').length` = **2** — both exactly as required.
- `ENEMY_LIST` has 693 entries, 693 unique ids → no duplicate enemy ids.
- `BOSS_LIST` has 64 entries, 64 unique ids → no duplicate boss ids.

**Deviation note:** the plan's background section said floorKey `'13'` "ALREADY has 4 enemies authored" (`polyrhythm`/`fermatasentry`/`syncopehopper`/`tremorswarm`). The harness shows floorKey `'13'` actually resolves 12 entries total — those same 4 `locked:true` entries plus 8 more unlocked floorKey `'13'` entries elsewhere in `types-4.js` (`onbeatstalker`, `downbeatbrute`, `crescendocharger`, `apexmarksman`, `codablinker`, `resonancewarden`, `finalemortar`, `goldenmites`) that the plan's background summary didn't mention. **None of these 8 were touched** — verified by re-reading `types-4.js` after editing: only the 4-entry floorKey `'14'` block was inserted, immediately after the original floorKey `'13'` block containing the 4 named locked entries. This is purely a discrepancy in the plan's background description, not a deviation in what was implemented; it's called out here per the plan's "must be non-zero" checklist item, which floorKey `'13'` still satisfies (12 ≠ 0).

### 5. Behavior dispatch verification

Enemy behaviors used on new `'14'` entries — all have real `case` lines in `js/systems/combat-3.js`'s `updateEnemy` switch:
```
case 'sniper': aiSniper(game, e, dt); break;      (line 106)
case 'burrower': aiBurrower(game, e, dt); break;  (line 103)
case 'ambusher': aiAmbusher(game, e, dt); break;  (line 108)
case 'splitter': aiChase(game, e, dt); break;     (line 101 — splitter moves like a chaser, splits in combat-2.js's death handler)
```

Boss behaviors reused — all have real function definitions and dispatch cases:
```
bossShadowStalker  -> js/systems/ai-3.js:11  aiBossShadowStalker   (combat-3.js:130)
bossFrostSentinel  -> js/systems/ai-3.js:47  aiBossFrostSentinel   (combat-3.js:132)
bossBrimstoneHorror-> js/systems/ai-2.js:532 aiBossBrimstoneHorror (combat-3.js:129)
bossCinderColossus -> js/systems/ai-2.js:475 aiBossCinderColossus  (combat-3.js:127)
```

## Full stat blocks (from harness output, verbatim)

```json
{"id":"lastovertone","name":"The Last Overtone","hp":64,"dmg":2,"speed":84,"radius":23,"color":"#7a8ac0","dark":"#38406a","behavior":"bossShadowStalker","floorKey":"13"}
{"id":"hollowcantor","name":"The Hollow Cantor","hp":68,"dmg":3,"speed":44,"radius":31,"color":"#525d80","dark":"#262c40","behavior":"bossFrostSentinel","floorKey":"13"}
{"id":"flatlinewraith","name":"The Flatline Wraith","hp":70,"dmg":2,"speed":80,"radius":26,"color":"#e0604a","dark":"#7a2e1a","behavior":"bossBrimstoneHorror","floorKey":"14"}
{"id":"zeroamplitude","name":"The Zero Amplitude","hp":73,"dmg":3,"speed":46,"radius":34,"color":"#8a2818","dark":"#3e1008","behavior":"bossCinderColossus","floorKey":"14"}

{"id":"deadaircoda","name":"DNB Dead Air Coda","hp":6,"dmg":3,"speed":54,"radius":10,"color":"#e0604a","dark":"#7a3020","behavior":"sniper","fireRange":565,"telegraphTime":1.1,"fireCooldown":2.5,"boltSpeed":460,"boltColor":"#ff9a7a","boltRadius":4,"floorKey":"14"}
{"id":"flatlineburrower","name":"DNB Flatline Burrower","hp":6,"dmg":2,"speed":70,"radius":12,"color":"#c9503a","dark":"#661f14","behavior":"burrower","burrowCooldown":2.8,"burrowTime":1.3,"floorKey":"14"}
{"id":"silencestalker","name":"DNB Silence Stalker","hp":7,"dmg":3,"speed":66,"radius":12,"color":"#a83a2a","dark":"#521a12","behavior":"ambusher","triggerRange":130,"chargeSpeed":7,"dashDuration":0.48,"telegraphTime":0.28,"chargeCooldown":2.1,"floorKey":"14"}
{"id":"decrescendosplitter","name":"DNB Decrescendo Splitter","hp":7,"dmg":2,"speed":88,"radius":12,"color":"#e0755a","dark":"#7a3624","behavior":"splitter","splitInto":"swarmerdnb","floorKey":"14"}
```

## CODE_REFERENCE.md update

Updated in `js/CODE_REFERENCE.md`:
- `ENEMY_TYPES` entry count 689 → 693.
- `BOSS_TYPES` entry count 60 → 64.
- Field-schema table's `floorKey` row now lists `'14'` alongside `'13'`.
- New paragraph + table after the `ENEMY_TYPES` "Example entries" block documenting the 4 new floorKey `'14'` enemies (id/name/behavior/hp-dmg-spd-r).
- New paragraph + table after the `BOSS_TYPES` "Example entries" block documenting the 4 new floorKey `'13'`/`'14'` bosses (id/name/floorKey/hp-dmg-spd-r/reused AI/role), formatted the same way the existing Phase 7a superboss table is.

## Scope check

Only these files were modified: `js/data/enemies/bosses.js`, `js/data/enemies/types-4.js`, `js/CODE_REFERENCE.md`, and this audit file. No AI/behavior code, no other data files, no git commands were touched or run.
