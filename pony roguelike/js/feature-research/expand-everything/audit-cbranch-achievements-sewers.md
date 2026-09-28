# Audit — C-branch Sewers (5C / 6C) Slayer achievements, trophies, and stat terms

Dispatch: the 5C/6C "Sewers" floor pair, 33 enemies each = 66 enemies, following the
already-landed 3C/4C "Gutters" batch as the exact template.

## Files changed

| File | Change |
| --- | --- |
| `js/achievements.js` | New `/* ==== SLAYER — C-branch Sewers floors 5C / 6C ==== */` block inserted immediately after the last 3C/4C Gutters ladder (`slayer_cisternblink`). 66 `addTierSet` calls → 198 achievements. |
| `js/data.js` | New `/* ---- C-BRANCH SEWERS SLAYER TROPHIES (floors 5C / 6C) ---- */` block inserted immediately after the last Gutters trophy (`slayertrophy_cisternblink`) and before the Slice 8 Mastery/Exploration trophies. 66 new `ITEMS` entries. |
| `js/items.js` | 66 new `+ k * (p.slayertrophy_<id> \|\| 0)` terms in `recalcPlayerStats`, appended directly under each of the existing "C-branch Gutters slayer-trophy batch" comment blocks as parallel "C-branch Sewers slayer-trophy batch" blocks — 16 comment blocks (15 channels; the damage channel appears twice in the function, both were updated identically, matching the Gutters batch). |

Read-only, untouched: `js/enemies.js`, all other floorKeys' enemies, `SUPERBOSS_REWARDS` / `sb_*`,
every pre-existing Slayer achievement, `js/room.js`, `js/dungeon.js`, `js/stages.js`, `js/game.js`, `js/ai.js`.

## Enemy-coverage set-difference proof

Enemy ids were extracted fresh from `js/enemies.js` by walking back from every line matching
`floorKey:'5C'` / `floorKey:'6C'` to its owning `id:'…'` — 66 ids (33 + 33). The new achievement
block was then bounded between its own banner comment and the following `MASTERY — stat-ladder`
banner, and every `bestiaryId:'…'` inside it collected.

```
addTierSet calls in block: 66
enemies \ bestiaryIds = []
bestiaryIds \ enemies = []
```

Both set-differences are empty in both directions: every 5C/6C enemy has a ladder, and no ladder
in the block points at an enemy outside 5C/6C.

Trophy ids, bounded the same way inside `js/data.js`:

```
bounded new trophies: 66   dups: 0
trophy set \ enemy set = []
enemy set \ trophy set = []
```

`js/items.js` term coverage:

```
items.js distinct new trophies referenced: 66
trophies without a recalcPlayerStats term: []
```

## Whole-file integrity scans

```
total achievement ids (whole achievements.js, addAchievement + expanded addTierSet rungs): 974
DUPLICATES: []

ITEMS keys (whole data.js): 1062
DUPLICATES: []

new trophies: 66      unresolved unlockedBy: []
```

Every new `unlockedBy` resolves to a `slayer_<id>_t3` id actually minted by the new `addTierSet` calls.

Full syntax sweep — `node --check` over every file in `js/` (24 files): all pass.

## Totals added

| Thing | Count |
| --- | --- |
| `addTierSet` ladders | 66 |
| Achievements (3 rungs each) | 198 |
| Rewarded rungs (t3 only) | 66 |
| Flavour-only rungs (t1 + t2) | 132 |
| `ITEMS` trophy entries in `data.js` | 66 |
| `recalcPlayerStats` terms in `items.js` | 66 (across 15 channels, 71 physical term expressions counting the twice-appearing damage channel) |

## Shape used (identical to the 3C/4C batch)

- Thresholds 5 / 20 / 50; `category:'Slayer'`, `icon:'💀'`, `bestiarySection:'enemyKills'`,
  `bestiaryId:'<enemy id>'`; only the t3 tier carries `itemId`.
- Achievement name: `<enemy name minus "DNB "> Hunter`; desc `n => 'Defeat ' + n + ' of the DNB <Name>.'`.
- Trophy: `slayertrophy_<enemyid>`, `type:'passive'`, `quality:1`, `icon:'🏅'`, `pools:POOLS_ALL`,
  `locked:true`, `unlockedBy:'slayer_<enemyid>_t3'`, name `<Name> Trophy`.
- Colors cycle the same 6-value Gutters palette in order:
  `#c9a34a, #b08d57, #d9c9a3, #a37f3a, #e3c15b, #8a7a4a`.
- Bonuses round-robin the same 15 channels in the same order, at each channel's smallest
  existing magnitude: luck `+1`, speed `0.05`, damage `+1`, fire rate `0.05`, range `+1`,
  boss damage `0.05`, lifesteal `0.04`, crit `0.05`, venom `0.04`, stun `0.04`, charm `0.04`,
  freeze `0.04`, fear `0.04`, magnet `20`, bomb radius `0.1`.
  With 66 entries over a 15-cycle, the first six channels get 5 trophies each and the
  remaining nine get 4 each — the same uneven-tail distribution the Gutters batch has.

## Deviations

None. No new stat hooks were invented; every bonus reuses an existing `recalcPlayerStats` channel.
