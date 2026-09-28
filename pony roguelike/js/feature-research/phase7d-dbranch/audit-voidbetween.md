# Phase 7d, third slice — audit: The Void Between ('8D' / '9D' / '10D')

## Files changed

- `js/data/enemies/types-4.js` — appended 99 new `ENEMY_TYPES` entries (33 per floorKey: `'8D'`,
  `'9D'`, `'10D'`) after the existing `'7D'` (Orrery) block, before the closing `});`.
- `js/CODE_REFERENCE.md` — added a documentation section for the new `'8D'`/`'9D'`/`'10D'` rosters
  (after the `'6D'`/`'7D'` Orrery doc entry), plus a closing note that Phase 7d (all 7 D-branch
  floorKeys, `'4D'`-`'10D'`) is now complete.
- `feature-research/phase7d-dbranch/audit-voidbetween.md` — this file (new).

No other files touched. `js/data/enemies/bosses.js` was **not** touched — per the established
branch-wide convention, D-branch floorKeys get no `BOSS_TYPES` mid-boss pool, only regular
`ENEMY_TYPES` rosters; the region's only "boss" content is the pre-existing `singularity`
superboss on `'10D'` (already defined in `js/data/enemies/superbosses.js`, untouched).

## Theme and scaling approach

The Void Between: cold, empty, isolated deep space, drifting derelict wreckage, faint dying
starlight, the loneliness before a black hole — escalating toward genuine dread and scale by
`'10D'`, the D-branch finale floor leading into `singularity` (hp 79, "heavy, and it answers
damage").

- **`'8D'`** — drifting derelict wreckage, still carrying rust/amber remnants of the ships that
  died out here. Names: void-, derelict-, wreck-, hull-, drift-, hulk-, shadow-.
- **`'9D'`** — deeper isolation, dimmer and colder, the wreckage thinning into true emptiness and
  the last starlight fading. Names: starved-, dying-, fading-, dark-, null-, wither-, faint-,
  ember-, hollow-, night-.
- **`'10D'`** — gravitational collapse, silence, the last light going out, right at the edge of
  the region's capping superboss. Names: collapse-, event-, horizon-, grav-, abyss-, silent-,
  last-.

Stats are relative-scaling only (the engine's own `growth.js` curves handle absolute floor-depth).
Each behavior-role's base 7D numbers were scaled floor-over-floor: `'8D'` ≈ 7D×1.08 hp (a modest
step up from Orrery's own toughest numbers, mirroring every prior branch step), `'9D'` ≈ `'8D'`×
1.08 hp with +1 radius, `'10D'` ≈ `'9D'`×1.12 hp with +1 radius and +1 dmg — landing the toughest
regular-enemy tier in the game at `'10D'` (heaviest entry: `eventbulwark`, hp 34) while staying
comfortably under `singularity`'s hp 79, consistent with "just short of the finale boss in relative
weight." Speed scales only slightly (~1.5–5% per floor) to keep movement feel consistent with the
rest of the branch.

Palette: `D_PALETTES.voidbetween` — `accent:'#9ab8ff'` (cold pale blue), `floorA:'#141426'`,
`floorB:'#1a1a30'`, `wall:'#0b0b18'`, `voidC:'#02030a'`. `'8D'` entries vary around steel-blue/grey
with a handful of rust/amber tones for the decaying-hull flavor entries; `'9D'` darkens toward
indigo/violet with faint dying-ember accents; `'10D'` is the darkest of the three, near-black
indigo punctuated by a few near-white event-horizon-glow accents (used for `boltColor` on the
sentry/orbiter/sniper/teleporter roles, echoing the starfield's `rgba(226,232,255,x)` starlight
white per Phase 7a's render.js treatment).

## Full stat blocks

### '8D' (33 entries)

| id | name | behavior | hp | dmg | speed | radius | color | dark |
|---|---|---|---|---|---|---|---|---|
| voidwisp | DNB Void Wisp | chaser | 13 | 4 | 166 | 11 | #8a96b8 | #454b5c |
| derelictmoth | DNB Derelict Moth | flyer | 11 | 5 | 152 | 9 | #9aa8c8 | #4d5464 |
| wreckspark | DNB Wreck Spark | bomber | 12 | 4 | 138 | 11 | #c89058 | #64482c |
| hullplate | DNB Hull Plate | shielded | 21 | 4 | 53 | 14 | #6a7288 | #353944 |
| driftram | DNB Drift Ram | charger | 21 | 5 | 79 | 14 | #8a6a48 | #453524 |
| silentturret | DNB Silent Turret | turret | 16 | 4 | 0 | 12 | #5a6484 | #2d3242 |
| driftleaper | DNB Drift Leaper | leaper | 14 | 4 | 83 | 11 | #7a8cac | #3d4656 |
| voidslinger | DNB Void Slinger | ranged | 13 | 4 | 73 | 11 | #7488a8 | #3a4454 |
| wreckmortar | DNB Wreck Mortar | lobber | 16 | 4 | 63 | 13 | #96825a | #4b412d |
| stardrift | DNB Star Drift | weaver | 15 | 4 | 126 | 12 | #7a92c8 | #3d4964 |
| hulkwatcher | DNB Hulk Watcher | sentry | 18 | 4 | 41 | 12 | #5c6478 | #2e323c |
| debrissatellite | DNB Debris Satellite | orbiter | 13 | 5 | 134 | 9 | #dce6ff | #6e7380 |
| hulltunneler | DNB Hull Tunneler | burrower | 22 | 4 | 87 | 13 | #5c4c40 | #2e2620 |
| driftmites | DNB Drift Mites | swarm | 6 | 3 | 177 | 7 | #a4b0d0 | #525868 |
| wreckhusk | DNB Wreck Husk | splitter (→driftmites) | 18 | 4 | 93 | 13 | #8a744c | #453a26 |
| voidcaller | DNB Void Caller | summoner (→driftmites) | 15 | 5 | 73 | 11 | #6a5a94 | #352d4a |
| hullmender | DNB Hull Mender | healer | 15 | 3 | 93 | 11 | #9ac8c0 | #4d6460 |
| driftwarden | DNB Drift Warden | shielder | 18 | 4 | 61 | 13 | #7a8264 | #3d4132 |
| hulkmarksman | DNB Hulk Marksman | sniper | 14 | 5 | 67 | 10 | #42465c | #21232e |
| hullblink | DNB Hull Blink | teleporter | 14 | 4 | 0 | 11 | #3a5484 | #1d2a42 |
| shadowhulk | DNB Shadow Hulk | ambusher | 17 | 5 | 81 | 12 | #302c44 | #181622 |
| derelicthound | DNB Derelict Hound | chaser (extra, brute) | 31 | 5 | 55 | 18 | #4a4238 | #25211c |
| comethusk | DNB Comet Husk | chaser (extra, fast) | 12 | 4 | 185 | 9 | #e0d05a | #70682d |
| wreckslinger | DNB Wreck Slinger | ranged (extra) | 14 | 4 | 61 | 12 | #6a7c9c | #353e4e |
| hullspark | DNB Hull Spark | bomber (extra) | 13 | 4 | 148 | 10 | #c8a05a | #64502d |
| duskmoth | DNB Dusk Moth | flyer (extra) | 12 | 5 | 160 | 9 | #8892ac | #444956 |
| hulkram | DNB Hulk Ram | charger (extra) | 22 | 5 | 69 | 16 | #6a5638 | #352b1c |
| driftmortar | DNB Drift Mortar | lobber (extra) | 16 | 4 | 73 | 13 | #8a7a54 | #453d2a |
| wrecktunneler | DNB Wreck Tunneler | burrower (extra) | 21 | 4 | 95 | 12 | #584848 | #2c2424 |
| driftsatellite | DNB Drift Satellite | orbiter (extra) | 14 | 5 | 128 | 10 | #c8bee8 | #645f74 |
| derelictsentinel | DNB Derelict Sentinel | sentry (extra) | 18 | 4 | 53 | 12 | #4a463a | #25231d |
| driftblink | DNB Drift Blink | teleporter (extra) | 14 | 4 | 0 | 11 | #2a4468 | #152234 |
| hullbulwark | DNB Hull Bulwark | shielded (extra) | 28 | 5 | 51 | 16 | #4a4230 | #252118 |

### '9D' (33 entries)

| id | name | behavior | hp | dmg | speed | radius | color | dark |
|---|---|---|---|---|---|---|---|---|
| starvedhound | DNB Starved Hound | chaser | 14 | 4 | 170 | 12 | #5c5c84 | #2e2e42 |
| dyingember | DNB Dying Ember | flyer | 12 | 5 | 155 | 10 | #c8825a | #64412d |
| fadingnova | DNB Fading Nova | bomber | 13 | 4 | 141 | 12 | #e0a464 | #705232 |
| darkplate | DNB Dark Plate | shielded | 22 | 4 | 54 | 15 | #3c3c5c | #1e1e2e |
| nullram | DNB Null Ram | charger | 22 | 5 | 81 | 15 | #42425c | #21212e |
| lastlightturret | DNB Last Light Turret | turret | 17 | 4 | 0 | 13 | #4a4a70 | #252538 |
| voidleaper | DNB Void Leaper | leaper | 15 | 4 | 85 | 12 | #4c4c74 | #26263a |
| witherslinger | DNB Wither Slinger | ranged | 14 | 4 | 75 | 12 | #4a4266 | #252133 |
| nullmortar | DNB Null Mortar | lobber | 17 | 4 | 64 | 14 | #443c56 | #221e2b |
| fainttrail | DNB Faint Trail | weaver | 16 | 4 | 128 | 13 | #5858a0 | #2c2c50 |
| darkwatcher | DNB Dark Watcher | sentry | 20 | 4 | 41 | 13 | #302e48 | #181724 |
| dyingsatellite | DNB Dying Satellite | orbiter | 14 | 5 | 137 | 10 | #e8e0ff | #747080 |
| nulltunneler | DNB Null Tunneler | burrower | 23 | 4 | 89 | 14 | #38323e | #1c191f |
| embermites | DNB Ember Mites | swarm | 7 | 3 | 180 | 8 | #e0925a | #70492d |
| fadinghusk | DNB Fading Husk | splitter (→embermites) | 20 | 4 | 95 | 14 | #5a4834 | #2d241a |
| nullcaller | DNB Null Caller | summoner (→embermites) | 16 | 5 | 75 | 12 | #3a2c5c | #1d162e |
| emberkeeper | DNB Ember Keeper | healer | 16 | 3 | 95 | 12 | #c8a882 | #645441 |
| darkwarden | DNB Dark Warden | shielder | 20 | 4 | 62 | 14 | #3c3654 | #1e1b2a |
| nightmarksman | DNB Night Marksman | sniper | 15 | 5 | 68 | 11 | #242236 | #12111b |
| nullblink | DNB Null Blink | teleporter | 15 | 4 | 0 | 12 | #2c2c48 | #161624 |
| hollowstalker | DNB Hollow Stalker | ambusher | 19 | 5 | 83 | 13 | #201e30 | #100f18 |
| nullhound | DNB Null Hound | chaser (extra, brute) | 34 | 5 | 56 | 19 | #2a2a3e | #15151f |
| faintrunner | DNB Faint Runner | chaser (extra, fast) | 13 | 4 | 188 | 10 | #726ab0 | #393558 |
| darkslinger | DNB Dark Slinger | ranged (extra) | 15 | 4 | 62 | 13 | #38344c | #1c1a26 |
| nullspark | DNB Null Spark | bomber (extra) | 14 | 4 | 151 | 11 | #302c46 | #181623 |
| witherwisp | DNB Wither Wisp | flyer (extra) | 13 | 5 | 164 | 10 | #c88a68 | #644534 |
| darkram | DNB Dark Ram | charger (extra) | 23 | 5 | 70 | 17 | #3c3450 | #1e1a28 |
| faintmortar | DNB Faint Mortar | lobber (extra) | 17 | 4 | 75 | 14 | #805238 | #40291c |
| darktunneler | DNB Dark Tunneler | burrower (extra) | 22 | 4 | 97 | 13 | #332e3c | #1a171e |
| nullsatellite | DNB Null Satellite | orbiter (extra) | 15 | 5 | 130 | 11 | #d0ccf4 | #68667a |
| fadingsentinel | DNB Fading Sentinel | sentry (extra) | 20 | 4 | 54 | 13 | #302c3c | #18161e |
| darkblink | DNB Dark Blink | teleporter (extra) | 15 | 4 | 0 | 12 | #1e2a4a | #0f1525 |
| nullbulwark | DNB Null Bulwark | shielded (extra) | 30 | 5 | 52 | 17 | #28242e | #141217 |

### '10D' (33 entries — the D-branch finale floor)

| id | name | behavior | hp | dmg | speed | radius | color | dark |
|---|---|---|---|---|---|---|---|---|
| collapsehound | DNB Collapse Hound | chaser | 16 | 5 | 173 | 12 | #20223c | #10111e |
| lastlightmoth | DNB Last Light Moth | flyer | 13 | 6 | 158 | 10 | #c4d0ff | #626880 |
| eventspark | DNB Event Spark | bomber | 14 | 5 | 144 | 12 | #eef2ff | #777980 |
| horizonplate | DNB Horizon Plate | shielded | 25 | 5 | 55 | 15 | #1a1c30 | #0d0e18 |
| gravram | DNB Grav Ram | charger | 25 | 6 | 82 | 15 | #242440 | #121220 |
| collapseturret | DNB Collapse Turret | turret | 20 | 5 | 0 | 13 | #181a2e | #0c0d17 |
| abyssleaper | DNB Abyss Leaper | leaper | 17 | 5 | 87 | 12 | #26243e | #13121f |
| eventslinger | DNB Event Slinger | ranged | 16 | 5 | 76 | 12 | #dce4ff | #6e7280 |
| gravmortar | DNB Grav Mortar | lobber | 20 | 5 | 65 | 14 | #302848 | #181424 |
| silenttrail | DNB Silent Trail | weaver | 18 | 5 | 131 | 13 | #141628 | #0a0b14 |
| horizonwatcher | DNB Horizon Watcher | sentry | 22 | 5 | 42 | 13 | #20202e | #101017 |
| collapsesatellite | DNB Collapse Satellite | orbiter | 16 | 6 | 139 | 10 | #f0ecff | #787680 |
| eventtunneler | DNB Event Tunneler | burrower | 26 | 5 | 91 | 14 | #1e1a22 | #0f0d11 |
| collapsemites | DNB Collapse Mites | swarm | 8 | 4 | 184 | 8 | #c8d4ff | #646a80 |
| horizonhusk | DNB Horizon Husk | splitter (→collapsemites) | 22 | 5 | 97 | 14 | #403420 | #201a10 |
| eventcaller | DNB Event Caller | summoner (→collapsemites) | 18 | 6 | 76 | 12 | #2c2050 | #161028 |
| lastkeeper | DNB Last Keeper | healer | 18 | 4 | 97 | 12 | #a8ccc4 | #546662 |
| horizonwarden | DNB Horizon Warden | shielder | 22 | 5 | 63 | 14 | #242030 | #121018 |
| gravmarksman | DNB Grav Marksman | sniper | 17 | 6 | 70 | 11 | #0e0e18 | #07070c |
| eventblink | DNB Event Blink | teleporter | 17 | 5 | 0 | 12 | #1c2646 | #0e1323 |
| silentstalker | DNB Silent Stalker | ambusher | 21 | 6 | 84 | 13 | #0c0c14 | #06060a |
| gravhound | DNB Grav Hound | chaser (extra, brute) | 38 | 6 | 57 | 19 | #181428 | #0c0a14 |
| collapserunner | DNB Collapse Runner | chaser (extra, fast) | 14 | 5 | 192 | 10 | #f6f0ff | #7b7880 |
| abyssslinger | DNB Abyss Slinger | ranged (extra) | 17 | 5 | 63 | 13 | #c0ccff | #606680 |
| horizonspark | DNB Horizon Spark | bomber (extra) | 16 | 5 | 154 | 11 | #4a3c26 | #251e13 |
| eventmoth | DNB Event Moth | flyer (extra) | 14 | 6 | 167 | 10 | #dce8ff | #6e7480 |
| horizonram | DNB Horizon Ram | charger (extra) | 26 | 6 | 72 | 17 | #382c14 | #1c160a |
| abyssmortar | DNB Abyss Mortar | lobber (extra) | 20 | 5 | 76 | 14 | #5a3c1e | #2d1e0f |
| gravtunneler | DNB Grav Tunneler | burrower (extra) | 25 | 5 | 99 | 13 | #221e1c | #110f0e |
| eventsatellite | DNB Event Satellite | orbiter (extra) | 17 | 6 | 133 | 11 | #eae4ff | #757280 |
| collapsesentinel | DNB Collapse Sentinel | sentry (extra) | 22 | 5 | 55 | 13 | #181420 | #0c0a10 |
| horizonblink | DNB Horizon Blink | teleporter (extra) | 17 | 5 | 0 | 12 | #161c34 | #0b0e1a |
| eventbulwark | DNB Event Bulwark | shielded (extra) | 34 | 6 | 53 | 17 | #161014 | #0b080a |

(All full field shapes, including per-behavior tunables like `contactCooldown`, `fireCooldown`,
`boltSpeed`, `chargeSpeed`, `orbitRadius`, `healRadius`, `blinkRange`, `triggerRange`, etc., match
the '7D' template exactly and are visible in `js/data/enemies/types-4.js`.)

## Deviations and the id-collision fix

Every one of the 99 candidate ids was grepped against the **full** `js/` tree (not just
`js/data/enemies/*.js`, and not just checked for duplicates *among the new ids*) before any entry
was written, per the mandatory pre-check. Two candidate ids collided with pre-existing entries in
`js/data/enemies/types-1.js`:

- `voidmarksman` (intended for `'8D'`'s sniper base entry) already existed as an unrelated
  types-1.js enemy — renamed to `hulkmarksman` before writing.
- `abyssmarksman` (intended for `'10D'`'s sniper base entry) already existed as an unrelated
  types-1.js enemy — renamed to `gravmarksman` before writing.

Both renames were applied before any entry was written to `types-4.js`, so no silent
`Object.assign` overwrite ever occurred. All other 97 ids were confirmed clean against the full
codebase (zero hits via `grep -rn` for the id key pattern and, separately, `grep -rn '\bID\b'`
across all of `js/`) before landing. No other deviations from the plan.

## Verification (exact output)

1. `node --check js/data/enemies/types-4.js` → passed silently (exit 0).
2. Full sweep `for f in $(find js -name "*.js"); do node --check "$f" || echo FAIL; done` → clean,
   no `FAIL` lines.
3. Node `vm`-based harness loading every `<script>` from `index.html` in document order, excluding
   `js/main.js`, `js/ui/ui.js`, `js/ui/render.js`, `js/ui/roomEditor.js`, `js/ui/bestiary.js` (with
   minimal `document`/`window`/`localStorage` stubs so achievements/logic.js's top-level DOM calls
   no-op harmlessly) → zero thrown errors.
4. In that harness:
   - `ENEMY_LIST.filter(e=>e.floorKey==='8D').length` → **33**
   - `ENEMY_LIST.filter(e=>e.floorKey==='9D').length` → **33**
   - `ENEMY_LIST.filter(e=>e.floorKey==='10D').length` → **33**
   - `BOSS_LIST.filter(b=>b.floorKey==='8D'||b.floorKey==='9D'||b.floorKey==='10D').length` →
     **0**
5. Duplicate-id check: `ENEMY_LIST.map(e=>e.id)` → `.length` **957**, `new Set(...).size` **957**
   → zero duplicates. Matches the expected 858 (prior total) + 99 (this slice) = **957** exactly.
6. Grepped `behavior:'X'` for every behavior string used in the new block
   (`awk '/8D \(The Void Between/,0/' types-4.js | grep -oP "behavior:'\K[a-z]+" | sort -u`) →
   all 21 required behaviors present (`ambusher, bomber, burrower, charger, chaser, flyer, healer,
   leaper, lobber, orbiter, ranged, sentry, shielded, shielder, sniper, splitter, summoner, swarm,
   teleporter, turret, weaver`), each confirmed to have a live `case '<behavior>':` dispatch in
   `js/systems/combat-3.js`.
7. Growth cross-check: `ENEMY_LIST.length` before this slice's changes was **858** (confirmed by
   running the same harness against the pre-edit `types-4.js`); after, **957** — a growth of
   exactly **99**, matching the 3×33 expected total with no silent-overwrite loss.

All numbers match expectations exactly; no deviations required beyond the two id renames noted
above.

## Phase 7d — complete

This slice closes out Phase 7d. All seven D-branch floorKeys (`'4D'` through `'10D'`) now have
full regular `ENEMY_TYPES` rosters (`'4D'`/`'5D'` The Observatory, `'6D'`/`'7D'` The Orrery,
`'8D'`/`'9D'`/`'10D'` The Void Between), each of the branch's three regions capped by its own
`SUPERBOSSES` entry (`astrolabe`, `orrery`, `singularity`), and — per the branch-wide convention
established from the first slice onward — no D-branch floorKey carries a `BOSS_TYPES` mid-boss
pool anywhere in the branch. The D-branch side route is now fully populated end to end.
