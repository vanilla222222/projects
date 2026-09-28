# Audit — C-branch Slayer content, floors 3C / 4C ("Gutters")

## Files changed

| File | Change |
|---|---|
| `js/achievements.js` | +66 `addTierSet` calls (one 3-rung ladder per enemy) = **198 achievements**, inserted as a new commented `SLAYER — C-branch Gutters floors 3C / 4C` block immediately before the `MASTERY — stat-ladder achievements (Slice 3)` block. |
| `js/data.js` | +66 `slayertrophy_<id>` entries in `ITEMS`, inserted as a new commented block immediately before `MASTERY / EXPLORATION TROPHIES (Slice 8)`. |
| `js/items.js` | +66 terms in `recalcPlayerStats`, round-robined across the same 15 stat channels the Slice 7 trophies use. (Not named in the brief, but required — see Deviations.) |
| `js/enemies.js` | **read only**, unmodified. |

No other file touched. `SUPERBOSS_REWARDS` / `sb_*` untouched; no pre-existing achievement or item modified.

## Tier mechanism used, and why

`addTierSet` — verified against the real function body at `js/achievements.js:131-152` **before** authoring anything. It does support bestiary predicates:

```js
if (spec.statKey) def.statKey = spec.statKey;
if (spec.bestiarySection) def.bestiarySection = spec.bestiarySection;
if (spec.bestiaryId) def.bestiaryId = spec.bestiaryId;
if (spec.distinct) def.distinctThreshold = n; else def.threshold = n;
for (const key of TIER_REWARD_KEYS) if (tier[key] != null) def[key] = tier[key];
```

so predicate-B (`bestiarySection:'enemyKills'` + `bestiaryId`) ladders are a first-class supported shape — the file's own doc comment even names `slayer_cryptslinger` as its worked example. No need to hand-expand into three `addAchievement` calls.

Ids mint as `baseId + '_t' + (i+1)`, i.e. `slayer_gutterrat_t1/_t2/_t3`, exactly the convention the brief asked for. Names auto-suffix ` I` / ` II` / ` III` off the shared `name`. Emitted shape, per enemy:

```js
addTierSet({ baseId:'slayer_gutterrat', name:'Gutter Rat Hunter', icon:'💀',
  category:'Slayer', bestiarySection:'enemyKills', bestiaryId:'gutterrat',
  desc: n => 'Defeat ' + n + ' of the DNB Gutter Rat.',
  tiers:[ { threshold:5 }, { threshold:20 }, { threshold:50, itemId:'slayertrophy_gutterrat' } ] });
```

- **Thresholds 5 / 20 / 50.** Calibrated, not invented: every pre-existing single-shot Slayer entry is a flat `threshold:20` for enemies (bosses are 5). Putting rung 2 at exactly 20 keeps the middle rung on the established bar, with 5 as an early-taste rung and 50 as the grind rung.
- **Only `_t3` carries `itemId`.** `_t1`/`_t2` are reward-free; `addTierSet` simply omits the reward key when a tier has none, and `unlockAchievement`'s reward chain is an if/else over `TIER_REWARD_KEYS`, so a rewardless def is a no-op there. This is the same shape the 15 Mastery ladders shipped with before Slice 8 back-filled them.
- **Icon `💀`** for all 198 — that is uniformly what all 254 existing Slayer achievements use.
- **Naming `<Thing> Hunter`** where `<Thing>` is `entry.name` minus the `DNB ` prefix. The existing block is not "common but not universal" as the brief guessed: all 254 entries are mechanically `<name minus DNB> Hunter`, per the block's own header comment ("Names are mechanical, not hand-tuned"). Matched it.

## Enemy-coverage set-difference proof

Enemy ids were extracted straight from `js/enemies.js` by parsing each `{ id:'…', name:'…' }` entry and reading the `floorKey` inside that entry's own body (with a guard so a `floorKey` belonging to the *next* entry can't be misattributed). Covered ids were extracted from every `bestiaryId:'…'` in `js/achievements.js`.

```
enemies with floorKey 3C: 33
enemies with floorKey 4C: 33
total:                    66
set(enemy ids) - set(bestiaryId in achievements.js) == []
```

Actual script output:

```
enemies: 66 uncovered: []
```

The 66 ids, in file order:

```
3C: gutterrat runoffwisp gasbloat grateguard silthog drainspout gutterhopper
    sewerspitter sludgemortar eelweaver gratewatcher gnatswirl mudburrower
    gutterlarvae bloatsack ratcaller algaemender drainwarden pipemarksman
    overflowblink sumplurker sludgehulk drainskitter brinespitter fumedrone
    gutterswoop rustcharger flotsamlobber gritdelver driftcircler drainwatcher
    culvertmarksman puddleblink
4C: sewerrat fetidflier rotbladder rustplate brinehog standpipeturret
    culvertleaper bilgespitter refusemortar bilgeweaver culvertwatcher
    carrionswirl muckborer rotgrubs rotsack broodcaller muckmender
    cisternwarden outfallmarksman backflowblink cisternlurker floodbrute
    scumskitter effluentspitter miasmadrone gnatveil tidecharger weirmortar
    drownedhulk eddycircler overflowwatcher siltmarksman cisternblink
```

## Other verification (all run against the WHOLE file, not just the new block)

| Check | Result |
|---|---|
| Duplicate achievement id — explicit `addAchievement` ids **plus** every id `addTierSet` mints (`baseId+'_t'+n`, expanded by counting `threshold:` per call) | 776 ids total, **0 duplicates** |
| Duplicate `ITEMS` key / `id` | 996 item keys, **0 duplicates**; every key also equals its own `id` field (0 mismatches) |
| Every new trophy's `unlockedBy` resolves to a real achievement id | 66 checked, **0 dangling** |
| Every new trophy is actually wired into `recalcPlayerStats` | 66/66 wired, **0 unwired** |
| `node --check` on every file in `js/` | 22/22 pass |

Syntax was re-checked incrementally (after achievements.js, after data.js, after items.js) rather than only at the end.

## Totals

- **Achievements added: 198** (66 ladders × 3 rungs). Slayer category goes 254 → 452.
- **Trophy items added: 66** (one per `_t3` rung). `ITEMS` goes 930 → 996.
- **`recalcPlayerStats` terms added: 66** (the "+1 damage to all attacks" channel writes into both the melee and ranged damage sums, so those 5 ids appear twice — 71 physical lines-of-term).

## Deviations from the brief (all deliberate, all because the file said otherwise)

1. **Trophy icon is `🏅`, not `🏆`.** The brief said 🏆 is the convention; all 254 existing `slayertrophy_*` entries use `🏅` (boss trophies use `🎖️`). Followed the file.
2. **All 66 trophies are `quality:1`, not spread across 1-4.** The brief said trophy qualities were reworked to spread 1-4. They were not: the actual distribution across all 254 existing trophies is **220 × quality 1** (every regular enemy) and **33 × quality 3** (every boss, the `slayertrophy_boss_*` family). Since all 66 of these are regular non-boss enemies, quality 1 is the exact peer value. Spreading them 1-4 would have made this batch rarer/stronger than its 220 identical-role peers for no design reason.
3. **`js/items.js` was edited, though the brief didn't mention it.** It is not on the out-of-scope list, and it is load-bearing: a trophy's `desc` is not self-executing — every existing trophy's effect is a literal `+ k * (p.<itemid> || 0)` term inside `recalcPlayerStats`. Without this, all 66 would have been cosmetic items with lying tooltips. Each new term sits at its channel's smallest existing magnitude (`+1` luck, `0.05` speed, `+1` damage, `0.05` fire rate, `+1` range, `0.05` boss damage, `0.04` lifesteal, `0.05` crit, `0.04` each status, `20` magnet, `0.1` bomb radius) and reuses one of the 15 existing verbatim `desc` strings — identical power band to the Slice 7/8 trophies, no new formula channel introduced.
4. **Stale comment left alone.** The existing Slayer header comment claims "No rewards anywhere in this category by design", which was already false before this change (every entry under it carries an `itemId`). Not in scope to fix; noting it so it isn't mistaken for something this batch broke.

## Not done / notes for the next dispatch

- Floors 5C-10C (198 remaining enemies) are untouched, as specified.
- Color field cycles the same 6-value palette the existing trophies cycle (`#c9a34a #b08d57 #d9c9a3 #a37f3a #e3c15b #8a7a4a`).
- No smoke test was run beyond `node --check`; per project convention the change is landed for the user to verify in play.
