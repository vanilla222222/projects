# Audit — C-branch enemy roster: 3C / 4C ("The Gutters")

## Files changed

- `js/enemies.js` — 58 new entries appended to `ENEMY_TYPES`, inserted immediately
  before the `// ---- SWARMER` block (i.e. after the existing 12B batch-D block).
  Wrapped in a `/* ===== C-BRANCH — THE GUTTERS (3C / 4C) — START ===== */` comment
  banner explaining the stat-calibration basis.

No other file was touched. `BOSS_TYPES`, `SUPERBOSSES`, `achievements.js`, `ai.js`,
`data.js`, `room.js`, `dungeon.js`, `stages.js`, `game.js` untouched.

## Behavior-coverage proof (per floor)

Verified by evaluating the `ENEMY_TYPES` object literal in node and bucketing by
`floorKey` (a raw `grep "floorKey:'3C'"` undercounts, because multi-line entries such
as `sentry` / `orbiter` / `sniper` / `teleporter` carry `behavior:` on a different
physical line from `floorKey:`):

```
3C entries 29 uniqueBehaviors 21
4C entries 29 uniqueBehaviors 21
```

All 21 non-boss behaviors present on **each** floor:

`ambusher, bomber, burrower, charger, chaser, flyer, healer, leaper, lobber, orbiter,
ranged, sentry, shielded, shielder, sniper, splitter, summoner, swarm, teleporter,
turret, weaver`

### Per-behavior mapping

| behavior | 3C | 4C |
|---|---|---|
| ambusher | sumplurker | cisternlurker |
| bomber | gasbloat, fumedrone (flying) | rotbladder, miasmadrone (flying) |
| burrower | mudburrower, gritdelver | muckborer |
| charger | silthog, rustcharger | brinehog, tidecharger |
| chaser | gutterrat, sludgehulk, drainskitter | sewerrat, floodbrute, scumskitter |
| flyer | runoffwisp, gutterswoop | fetidflier, gnatveil |
| healer | algaemender | muckmender |
| leaper | gutterhopper | culvertleaper |
| lobber | sludgemortar, flotsamlobber | refusemortar, weirmortar |
| orbiter | gnatswirl | carrionswirl |
| ranged | sewerspitter, brinespitter | bilgespitter, effluentspitter |
| sentry | gratewatcher | culvertwatcher |
| shielded | grateguard | rustplate, drownedhulk |
| shielder | drainwarden | cisternwarden |
| sniper | pipemarksman | outfallmarksman |
| splitter | bloatsack → gutterlarvae | rotsack → rotgrubs |
| summoner | ratcaller → gutterlarvae | broodcaller → rotgrubs |
| swarm | gutterlarvae | rotgrubs |
| teleporter | overflowblink | backflowblink |
| turret | drainspout | standpipeturret |
| weaver | eelweaver | bilgeweaver |

## Totals

- **3C: 29 enemies** (21 behavior-coverage entries + 8 extra flavors)
- **4C: 29 enemies** (21 behavior-coverage entries + 8 extra flavors)
- **58 new entries total.** Comparable to `9A`'s 35 and `9B`'s 34.

## Verification run

- `node --check js/enemies.js` → clean (run mid-task after the 3C block and again at
  the end).
- Duplicate-key sweep over the whole `ENEMY_TYPES` literal (not a spot-check): count of
  `^  key: { id:'...'` literal entries **413** == `Object.keys(ENEMY_TYPES).length`
  **413**, so no entry is silently overwritten by a later duplicate key anywhere in the
  object. Also asserted `key === entry.id` for every entry — zero mismatches.
- Referential integrity: every `splitInto` and `summonId` in the whole file resolves to
  a real `ENEMY_TYPES` key — zero bad refs. (`bloatsack`→`gutterlarvae`,
  `ratcaller`→`gutterlarvae`, `rotsack`→`rotgrubs`, `broodcaller`→`rotgrubs` all valid.)

### Field-shape spot-checks against the source entries copied from

- `bomber` (gasbloat / rotbladder) vs `deathrattler` (stage:0) — `fuseTime` +
  `blastRadius` present; the flying variants (fumedrone / miasmadrone) additionally
  carry `flies:true`, matching `thunderdrone` (9A).
- `splitter` (bloatsack / rotsack) vs `sapling` (stage:1) — `splitInto` present and
  resolving.
- `teleporter` (overflowblink / backflowblink) vs `wispblinker` (stage:1) — full set
  `blinkCooldown, blinkRange, fireRange, fireCooldown, boltSpeed, boltColor, boltRadius`,
  plus `speed:0` as the source entries use.
- `summoner` (ratcaller / broodcaller) vs `sporeseeder` (stage:1) — full set
  `summonId, summonCount, summonCooldown, maxSummons, keepDistance`.
- `sentry` / `orbiter` / `sniper` / `shielder` / `healer` / `ambusher` each likewise
  mirror their stage:0/stage:1 exemplars (`barkwatcher`, `glowmoth`, `treelinesniper`,
  `cryptwarden`, `mossmender`, `bramblelurker`).

## Calibration notes

Stats are drawn from the `stage:0` (crypt) and `stage:1` (forest) pools, per the brief —
3C sits at crypt/early-forest numbers, 4C a shade above it, mirroring how stage:1 sits
above stage:0. Ranges used: hp 1–7 (3C) / 1–9 (4C), dmg 1–3, speed 0 (stationary
turret/sentry/teleporter) to ~145 (swarm). No 9A/9B hp/dmg numbers were copied; those
entries were read for **field shape only**.

Palette: silt browns (`#6a5a44`, `#8a6a3a`), sickly algae greens (`#7a8a4a`, `#6a8a3a`),
rust oranges (`#a0603a`, `#8a5a30`) and dark drain-water teals (`#3a6a6a`, `#2e6a70`),
each with a matching darker `dark:` shade at roughly half luminance — the same
construction the existing floorKey palettes use.

## Deviations

1. **`siltdelver` → `gritdelver`.** The first-drafted 3C burrower variant used the id
   `siltdelver`, which already exists at `js/enemies.js:1019` as an `11B` entry. As an
   object-literal duplicate key it would have silently overwritten the 11B enemy. Caught
   by the systematic duplicate sweep and renamed to `gritdelver` / "DNB Grit Delver".
   No other collision existed.
2. **`floorKey` pools carry no `xpTier` / `stage` field**, by design — matching every
   existing floorKey pool (see the comment above the 9A block). New entries follow that,
   so none of them leak into the normal stage-based random pools.
3. **No `isMinion` on `gutterlarvae` / `rotgrubs`.** They are both the swarm
   representative for their floor *and* the split/summon child, exactly as `gloommites`
   (9A) and `flurrymites` (9B) are used; `isMinion` would exclude them from their floor's
   random pool and leave `swarm` uncovered.
4. Per scope, no Slayer achievements were added for these enemies (deferred to a later
   dispatch).
