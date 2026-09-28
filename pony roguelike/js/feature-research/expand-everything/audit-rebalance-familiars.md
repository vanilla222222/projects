# Audit — 8 new familiar behaviors + 32 new FAMILIAR_TYPES entries

Files touched: `js/familiars.js` (new behavior functions + dispatch branches),
`js/data.js` (FAMILIAR_TYPES additions only). Nothing else was modified.
No existing behavior function or FAMILIAR_TYPES entry was changed — pure addition.

## New behaviors (js/familiars.js)

| behavior | function | fields read |
|---|---|---|
| blocker | `updateBlockerFamiliar` | `interval`, `maxShields` |
| thief | `updateThiefFamiliar` | `dmg`, `radius`, `orbitSpeed`, `contactCooldown`, `stealChance` |
| grower | `updateGrowerFamiliar` | `dmg`, `radius`, `orbitSpeed`, `contactCooldown`, `killsPerGrowth`, `growthStep`, `maxGrowth` |
| detonator | `updateDetonatorFamiliar` | `dmg`, `interval`, `radius` |
| mirror | `updateMirrorFamiliar` | `dmg`, `cooldown`, `boltSpeed`, `range`, `arc` |
| scavenger | `updateScavengerFamiliar` | `interval`, `radius` |
| berserker | `updateBerserkerFamiliar` | `dmg`, `radius`, `orbitSpeed`, `contactCooldown`, `berserkPower` |
| swarmer | `updateSwarmerFamiliar` | `dmg`, `interval`, `orbCount`, `orbLife`, `orbRadius`, `orbSpeed`, `contactCooldown` |

All damage routes through `familiarDamage(base, game.dungeon.floorNum)`
(`js/familiars.js:31`). The Hound Whistle / Swarm Collar trinket hooks that the
existing orbiter/shooter honour are carried through on every new damaging
behavior. Per-instance state is lazy-inited inside the update functions
(`f.miniOrbs === undefined` in `updateSwarmerFamiliar`) — `entities.js` untouched.

### Engine functions found and reused

- **scavenger's pickup collection** — `collectPickup(game, p)` at
  `js/combat.js:910`. A clean single-call collection function *does* exist
  (it delegates to `grantPickupEffect`, `js/combat.js:759`, and sets
  `p.collected = true`), so I picked the **direct-call** option rather than the
  drift-toward-player fallback. It is the exact call `updatePickups`
  (`js/combat.js:721`, hit at `js/combat.js:737`) makes when the player walks
  over a pickup, so every pickup kind (coin/heart/key/bomb/pill/star/…) resolves
  identically. The familiar also runs the same
  `node.pickups = node.pickups.filter(p => !p.collected)` sweep `updatePickups`
  does, so the collected pickup can't be double-processed.
- **grower's kill count** — `game.runKills`, declared at `js/game.js:66`
  ("this run's enemy kill count") and incremented at `js/combat.js:999` inside
  `handleEnemyDeath`. Run-scoped, resets on `startRun`, so growth is per-run and
  not per-room and not lifetime. (Deliberately *not* `bumpStat`/`unlocks.stats`
  at `js/achievements.js:3231` — those are lifetime-persistent counters, which
  would have made the familiar permanently max-power for a veteran save.)
- **blocker's shield** — `player.shieldHits`, declared `js/entities.js:143` and
  consumed in `takeDamage` at `js/entities.js:168` (same pool as Iron Curtain
  `js/items.js:1172` and the Aldebaran/Megrez stars `js/stars.js:157-160`).
- **detonator's pulse** — same shape as `attackStyles.js`'s `chargeNova`
  (`js/attackStyles.js:133-149`), but centered on the familiar and using
  `familiarDamage` instead of `player.meleeDamage`.
- **thief's coin drop** — `findClearFloorSpot` (`js/combat.js:110`) +
  `new Pickup('coin', …, Util.weighted(COIN_TYPES))`, the same spawn path
  `updateProcFamiliar`'s `'coin'` case uses. Thief also deals normal orbiter
  contact damage, so it is never strictly worse than a plain orbiter.

## New FAMILIAR_TYPES entries (32; 24 `locked:true`, 8 unlocked — matches the existing ~71% locked ratio)

blocker: `wardpuff` (Ward Puff), `bulwarkmoth` (Bulwark Moth), `aegisnewt` (Aegis Newt), `glasswarden` (Glass Warden, unlocked)
thief: `cutpurse` (Cutpurse), `brasscrow` (Brass Crow), `pocketimp` (Pocket Imp), `gildedferret` (Gilded Ferret, unlocked)
grower: `huntgrub` (Hunt Grub), `feastwyrm` (Feast Wyrm), `tallystone` (Tally Stone), `gorehatchling` (Gore Hatchling, unlocked)
detonator: `fusegremlin` (Fuse Gremlin), `cinderpod` (Cinder Pod), `poppingfungus` (Popping Fungus), `stormcell` (Storm Cell, unlocked)
mirror: `echolens` (Echo Lens), `twinflame` (Twin Flame), `shadowtwin` (Shadow Twin), `auguryeye` (Augury Eye, unlocked)
scavenger: `fetchhound` (Fetch Hound), `tidymole` (Tidy Mole), `gullspirit` (Gull Spirit), `lootbeetle` (Loot Beetle, unlocked)
berserker: `ragefang` (Rage Fang), `bloodhalo` (Blood Halo), `scarabofwoe` (Scarab of Woe), `martyrshusk` (Martyr's Husk, unlocked)
swarmer: `broodmite` (Brood Mite), `sporemother` (Spore Mother), `waspjar` (Wasp Jar), `emberbrood` (Ember Brood, unlocked)

## Verification output

```
$ node --check js/data.js && node --check js/familiars.js
SYNTAX_OK

$ node -e "<vm sandbox load of js/data.js>"
FAMILIAR_LIST total: 341 bad: 0
dup ids: none
key/id mismatches: none
{"orbiter":111,"shooter":109,"proc":89,"blocker":4,"thief":4,"grower":4,
 "detonator":4,"mirror":4,"scavenger":4,"berserker":4,"swarmer":4}
locked: 243 unlocked: 98
missing fields: 0
```

- Every `behavior` string in FAMILIAR_TYPES is one of the 11 valid values, so no
  entry can silently no-op in `updateFamiliars` (the orphan-branch trap).
- All 11 behaviors have a dispatch branch in `updateFamiliars`
  (`js/familiars.js:35-49`) and a matching `updateXFamiliar` function.
- No duplicate ids and no object-key/`id`-field mismatches.
- Every entry has `name`, `icon`, `color` and `desc` populated.
