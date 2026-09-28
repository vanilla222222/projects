# Audit — C-branch Rainforest Slayer content (floors 7C / 8C)

Dispatch: add the full Slayer achievement + trophy + stat-term set for the 66
enemies on floors 7C and 8C ("Rainforest"), using the 5C/6C Sewers batch as the
exact template.

## Files changed

| File | Lines before | Lines after | What was added |
|---|---|---|---|
| `js/achievements.js` | 2757 | 3030 | New `==== SLAYER — C-branch Rainforest floors 7C / 8C ====` block, 66 `addTierSet` calls, inserted directly after the 5C/6C Sewers block (after `slayer_ironbulk`) |
| `js/data.js` | 3534 | 3673 | New `---- C-BRANCH RAINFOREST SLAYER TROPHIES (floors 7C / 8C) ----` block in `ITEMS`, 66 `slayertrophy_<id>` entries, inserted after `slayertrophy_toxinswirl` |
| `js/items.js` | 1069 | 1117 | 16 new `// C-branch Rainforest slayer-trophy batch` term groups inside `recalcPlayerStats` (15 channels; the damage channel appears twice — melee and ranged — and both were updated) |

Read-only / untouched: `js/enemies.js`, and every other file listed as out of
scope. No existing achievement, trophy, or stat term was modified — all changes
are pure insertions after the corresponding 5C/6C block.

## Enemy-coverage set-difference proof

Enemy ids were extracted fresh from `js/enemies.js` by walking every top-level
`<key>: { id:'<id>'` object and reading the `floorKey` out of its own body (not
from any summary). Covered ids were extracted from the `bestiaryId:` values
inside the new Rainforest block in `achievements.js`, bounded at its start
header and the following `==== MASTERY` header.

```
enemies: 66 covered: 66
enemies - covered = []
covered - enemies = []
addTierSet in block: 66
```

Both directions empty. The 66 split 33 / 33 across the two floors:

- **7C (33):** jungleprowler, hornetflit, puffballpod, barkplate, peccaryram,
  blowdartvine, poisonfrog, venomspitter, sapmortar, vinesnake, canopywatcher,
  glowswirl, rootborer, armyants, pollensack, antcaller, liverwortmender,
  grovewarden, blowgunmarksman, mistblink, jaguarlurker, silverbackbrute,
  leafskitter, frogspitter, bombardierbeetle, nectarbat, rhinobeetle,
  fruitmortar, grubdelver, dragonflycircler, ruinwatcher, humidshade,
  carapacebulk
- **8C (33):** rotcrawler, venomflit, toxinbloom, idolplate, tapirram,
  thornspire, dartfrog, spitcobra, resinmortar, boaweaver, templewatcher,
  pollenswirl, taprootborer, bulletants, venomsack, broodhivecaller,
  lichenmender, idolwarden, curaremarksman, canopyblink, blackjaguar,
  ceibabrute, toxinrunner, toadspitter, hornetbomber, harpystriker, caimanram,
  miremortar, centipededelver, mothcircler, glyphwatcher, fogshade,
  monolithbulk

## Other verification

```
duplicate achievement ids (whole achievements.js, baseId expanded to _t1/_t2/_t3
  plus every plain id:'...'):        []
ITEMS keys: 859   duplicates:        []
key !== id mismatches in data.js:    []
unresolved unlockedBy (all 66):      []
trophies missing an items.js term:   []
items.js term counts:                {"1": 61, "2": 5}
node --check on every file in js/:   ALL SYNTAX OK
```

The `{"1": 61, "2": 5}` line is the expected shape, not an anomaly: the 5
trophies on the damage channel each appear twice because `recalcPlayerStats`
touches damage in two places (`player.meleeDamage` and `player.rangedDamage`).
The other 61 appear exactly once.

A duplicate-key scan over the *whole* `data.js` (rather than scoped to `ITEMS`)
also flags `speedup`, `damageup`, `luckup`, `rangeup`, `hpup`. These are
pre-existing and not duplicates: each appears once in `ITEMS` and once in
`PILL_TYPES`, two separate tables. Confirmed present in the pre-change backup.
Scoped to `ITEMS` alone, there are zero duplicates.

## Totals added

- **198 achievements** — 66 three-rung ladders (66 `addTierSet` calls), thresholds 5 / 20 / 50
- **66 rewards** — only the `_t3` rung of each ladder carries an `itemId`; `_t1`/`_t2` are flavour-only
- **66 trophy items** — one `slayertrophy_<enemyid>` per enemy in `ITEMS`
- **71 `recalcPlayerStats` term instances** — 66 unique trophies, 5 of them written at both damage sites

## Pattern conformance

Every element matches the 5C/6C template exactly:

- `bestiarySection:'enemyKills'`, `bestiaryId:'<enemy id>'`, `icon:'💀'`, `category:'Slayer'`
- achievement name `<enemy name minus "DNB "> Hunter`; desc `'Defeat ' + n + ' of the <full DNB name>.'`
- trophies: `icon:'🏅'`, `quality:1`, `type:'passive'`, `locked:true`,
  `unlockedBy:'slayer_<id>_t3'`, `pools:POOLS_ALL`
- trophy colors cycle the same 6-color sequence by enemy index
  (`#c9a34a`, `#b08d57`, `#d9c9a3`, `#a37f3a`, `#e3c15b`, `#8a7a4a`)
- effects round-robin the same 15 channels by enemy index, each at its
  channel's smallest magnitude. Distribution came out identical to the 5C/6C
  batch — the first 6 channels get 5 trophies, the remaining 9 get 4:

  ```
  luck=5 speed=5 damage=5 firerate=5 range=5 bossdmg=5
  lifesteal=4 crit=4 poison=4 stun=4 charm=4 freeze=4 fear=4 magnet=4 bomb=4
  ```

## Deviations

None. No stat magnitudes, thresholds, quality values, or naming conventions
were altered from the established pattern, and no cap in `recalcPlayerStats`
was raised to accommodate the new terms.

## Notes for the next dispatch (9C / 10C)

- Enemy id `barkplate` (7C) coexists with a pre-existing *trinket* whose id is
  also `barkplate` (referenced as `t === 'barkplate'` in the boss-damage-taken
  line of `items.js`). No collision, since the trophy is
  `slayertrophy_barkplate`, but worth knowing the bare name is taken.
- The insertion anchors used here — last line of the previous floor pair's
  block in each file — remain the clean seams for 9C/10C. In `items.js` the
  anchor per channel is the final line of the previous batch's term group.
