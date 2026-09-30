# Part 2 Slice A (sim): audit

## Files changed

- `js/sim/plants.js`:
  - PG goes to 13, with genes 8–12. There are new constants, and 8 new founders (fruit tree, berry bush, 2 wildflowers, and 4 fungi).
  - New arrays: `kind`, `myco`, `hue`, `fruit`, `fruitMax`, `_fruitK`, `_bloomK`.
  - New functions: `toxinType`, `hueDist`, `bloomFactor`, `fruitFactor`, and the new categories.
  - New methods: `fruitAt`, `eatFruit` and `plantSeed` (taken out of `_spread`), plus `_seedFungus`, `_seedFounder` and `_fungusK`.
  - `step` now handles fungal K, myco boost and tax, decomposition, fruit and rot, the bloom spread bonus, and the new counters.
- `js/sim/soil.js`: `litter`, `totalLitter`, `LITTER_DECAY`, `LITTER_INIT` and `CARCASS_FRAC`. `returnMatter` now adds to litter. New `addCarcass`. Fungi draw no nutrients and have `sat` = 1.
- `js/sim/animals.js`:
  - fruit eating and lure, seed carriage and drop
  - three poison effects, the `confuse` field, and `deaths.poison`
  - `sp.aversion`, `_aversion`, `_learn` and `aversionEvents`, with mimicry
  - carcasses on `_kill`, and aversion decay in `refreshSpeciesMeans`
- `js/sim/ecosystem.js`: `stats.fruit`, `stats.fungi`, `stats.flowers` and `stats.litter`, and `plants.seasonsOn`.
- `CODE_REFERENCE.md`: only the Plants, Soil, Animals and Ecosystem sections.
- `complexities.md`: soil.js 4 → 4.5, plants.js 7.5 → 8, animals.js 8 → 8.5.
- `feature-research/ecosystem-expansion/part2/SIM_READY.md` and this file.
- The scratchpad files are outside the repo: `run3.js`, `split.js`, `split2.js`, `popsplit.js`, `clim.js`, `fdiag*.js`, `profsum.js`, and the `p1base/` snapshot of the Part 1 sources.

## Constants chosen

Plants:

| Constant | Value |
| --- | --- |
| `FRUIT_FRAC` | 0.15 |
| `FRUIT_RATE` | 0.02 |
| `FRUIT_ROT` | 0.03 |
| `FRUIT_WIND` | 0.6 |
| `FRUIT_LAG` | 0.2 yr |
| `FLOWER_SEED_BONUS` | 1.5 |
| `FUNGUS_SEED_P` | 0.2 |
| `FUNGUS_LITTER_K` | 0.06 |
| `FUNGUS_DECOMP` | 0.003 |
| `FUNGUS_RETURN` | 0.5 |
| `MYCO_HOST_K` | 1.5 |
| `MYCO_BOOST` | 1.3 |
| `MYCO_TAX` | 0.92 |

Soil:

| Constant | Value |
| --- | --- |
| `LITTER_DECAY` | 0.004 |
| `LITTER_INIT` | 0.2 |
| `CARCASS_FRAC` | 0.6 |

Animals:

| Constant | Value |
| --- | --- |
| `FRUIT_ENERGY` | 8 |
| `FRUIT_LURE` | 3 |
| `BERRY_MASS` | 1.2 |
| `FRUIT_MIN_BITE` | 0.3 |
| `CARCASS_EATEN` | 0.35 |
| `MILD_LOSS` | 0.25 |
| `NEURO_TICKS` | 25 |
| `LETHAL_P` | 0.5 |
| `AVERSION_DECAY` | 0.015 |
| `MIMIC_HUE` | 0.07 |
| `AVERSION_LOG_GAP` | 2400 |

No existing constants were changed.

## Founder list

Genes are listed as `[T, M, niche, wood, tox, disp, shade, root, fruit, sweet, seedTox/toxType, bloom/myco, hue]`.

**Existing 13 founders:** genes 0–7 are unchanged.
- Land founders get fruiting 0.05–0.3, sweet 0.1–0.2, seedTox 0.2–0.3, bloom 0.05–0.15 and hue 0.5.
- Water founders get `0, 0, 0, 0, 0.5`.

**New founders:**

| Founder | Genes | Notes |
| --- | --- | --- |
| Fruit tree | `[0.58, 0.6, 0.45, 0.72, 0.2, 0.45, 0.3, 0.55, 0.75, 0.7, 0.3, 0.15, 0.5]` | |
| Berry bush | `[0.48, 0.5, 0.5, 0.45, 0.2, 0.55, 0.35, 0.45, 0.75, 0.65, 0.35, 0.2, 0.5]` | |
| Wildflower A | `[0.52, 0.55, 0.45, 0.12, 0.15, 0.6, 0.35, 0.35, 0.05, 0.3, 0.2, 0.8, 0.83]` | |
| Wildflower B | `[0.64, 0.4, 0.45, 0.12, 0.2, 0.65, 0.3, 0.3, 0.05, 0.3, 0.2, 0.75, 0.15]` | |
| Puffball | `[0.62, 0.36, 0.6, 0.05, 0.4, 0.6, 0.05, 0.05, 0, 0, 0.15, 0.2, 0.12]` | Mild, decomposer |
| Inkcap | `[0.28, 0.44, 0.6, 0.05, 0.5, 0.6, 0.05, 0.05, 0, 0, 0.5, 0.2, 0.72]` | Neurotoxic, decomposer |
| Toadstool | `[0.48, 0.48, 0.6, 0.05, 0.65, 0.6, 0.05, 0.05, 0, 0, 0.85, 0.2, 0.01]` | Lethal, decomposer |
| Truffle | `[0.45, 0.42, 0.6, 0.05, 0.1, 0.4, 0.05, 0.05, 0, 0, 0.1, 0.8, 0.08]` | Mild, mycorrhizal |

The fungus climates were moved to moisture 0.36–0.48. Seed 7's forests are dry, with a moisture median of 0.37, and wetter fungi died out there.

## Baseline vs after (3000 ticks, headless, 300×200)

**Perf baseline** (Part 1 sources, re-measured before any edits):

| Measure | Seed 42 | Seed 7 | Seed 123 |
| --- | --- | --- | --- |
| `run2` wall-clock ms/t | 11.69 | 11.52 | 13.28 |
| `/usr/bin/time` CPU user | 36.9 s | 36.5 s | 41.7 s |
| `run3` CPU ms/t (3 in parallel, load 3.3–4.6) | 11.92 | 11.63 | 13.22 |

For the `run2` and `/usr/bin/time` rows, the load average was 3.8 at the start and 5.5 at the end.

**Final paired run.** The Part 1 tree and the final tree ran concurrently, 6 processes on 12 cores, at load 7.7–8.2:

| Seed | Base CPU ms/t | After CPU ms/t | Ratio |
| --- | --- | --- | --- |
| 42 | 16.34 | 19.18 | 1.17 |
| 7 | 15.82 | 20.19 | 1.28 |
| 123 | 17.96 | 22.04 | 1.23 |

Repeat pairs on seed 7 gave 1.30, 1.33, 1.31 and 1.28. The `split.js` breakdown for seed 7:

| Measure | Base | After |
| --- | --- | --- |
| Plants | 6.7 ms | 8.0 ms |
| Animals | 5.2 ms | 7.9 ms |
| Mean animals | 2238 | 2990 |
| Animal cost per animal | | +12% |

**Populations at t3000** (LH/LO/LC | WH/WO/WC):

| Seed | Base | After |
| --- | --- | --- |
| 42 | 1007/494/405 \| 1025/56/7 | 1319/32/150 \| 1056/164/48 |
| 7 | 771/46/102 \| 599/221/43 | 918/462/95 \| 2340/137/85 |
| 123 | 2406/573/180 \| 821/220/8 | 2743/77/147 \| 1127/266/65 |

**Mean animals over the run** (land | water):

| Seed | Base | After |
| --- | --- | --- |
| 42 | 1679 \| 828 | 1694 \| 950 |
| 7 | 1313 \| 964 | 1495 \| 1667 |
| 123 | 2509 \| 700 | 2768 \| 1145 |

**After-only measures at t3000:**

| Seed | Fruit | Fungus tiles | Flower tiles | Litter | seedDrops | fruitEaten | Poisoned (mild/neuro/lethal) | Poison deaths (cumulative) | aversionEvents |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 42 | 334 | 893 | 10212 | 7791 | 3815 | 12714 | 21/24/35 | 5 | 60 |
| 7 | 201 | 246 | 7920 | 7300 | 2747 | 8645 | 16/18/27 | 4 | 42 |
| 123 | 342 | 3146 | 17173 | 10801 | 5542 | 36546 | 15/31/39 | 6 | 63 |

**Fungus tiles every 250 ticks:**
- 42: 458 → 137 (min) → 893
- 7: 356 → 54 (min) → 246
- 123: 733 → 3146, still rising slowly

Speciation entries in the last-120 log window are 53/53/54 after vs 62/80/55 at baseline.

## Gate results

| Check | Result |
| --- | --- |
| `node --check` on the 4 sim files | Pass. |
| No-comment grep | Pass (no matches). |
| All 6 trophic groups above 0 on every seed | Pass. The lowest is seed 42's LO at 32. |
| Fruit tree or berry bush alive on every seed | Pass. 42: fruittree. 7: fruittree. 123: fruittree and berrybush. |
| Flowers alive on every seed | Pass. |
| At least 2 fungus categories alive on every seed | Pass. 42: inkcap, toadstool, truffle, puffball. 7: inkcap, toadstool, puffball. 123: toadstool, inkcap, truffle. |
| seedDrops > 0 and fruitEaten > 0 | Pass on all seeds. |
| Every toxin type with poisoned > 0 | Pass on every seed. |
| At least one aversion event | Pass: 42–63 per seed. |
| ms/tick at most 1.25× baseline | **Marginal fail.** Pass on 42 (1.17×) and 123 (1.23×). Seed 7 is 1.28× (repeats 1.28–1.33×). |
| Headless render | Pass. The CDP probe `probe-p2.html?ui` on seed 7 at tick 1536 clicked all view modes and opened species panels. It showed 0 `Runtime.exceptionThrown` and no console errors. `chrome-headless-shell --dump-dom index.html#7` gave `#mapError` still `hidden` and a console with only the "World ready" line plus GPU driver notices. |

## Test commands and outputs

```
node --check js/sim/plants.js js/sim/soil.js js/sim/animals.js js/sim/ecosystem.js   -> ok x4
grep -nE '//|/\*' js/sim/plants.js js/sim/soil.js js/sim/animals.js js/sim/ecosystem.js   -> no output, exit 1
node $S/run3.js <seed> 3000              (ROOT=$S/p1base/js/ for baseline)   -> per-250-tick lines, final summary above
node $S/split.js 7 3000                  -> 7 total 17.18 plants 7.92 soil 1.09 animals 7.72 | base 13.22 / 6.72 / 0.94 / 5.20
python3 $S/cdp_shot.py "file://$S/probe-p2.html?ui" out.png 3   -> "state done | ui ok sprites 4035", 0 exceptions
chrome-headless-shell --virtual-time-budget=4000 --dump-dom "file://.../index.html#7"   -> exit 0, mapError hidden
```

## Checklist

- **No-comment grep:** `grep -nE '//|/\*'` on the 4 sim files gives no output (exit 1).
- **CODE_REFERENCE grep for new names:** `grep -c -E "litter|addCarcass|eatFruit|plantSeed|bloomFactor|fruitFactor|toxinType|aversion|confuse|seedDrops|fruitEaten|poisoned"` gives 57 lines.
  - Plants: the genes table, constants table, founders, helpers, arrays, `step` and public methods.
  - Soil: constants, fields, step 6, `returnMatter` and `addCarcass`.
  - Animals: the constants table, fields, the step order with seed drop, confusion and fruit, and the poison, aversion and mimicry mechanics.
  - Ecosystem: the new `stats` and `seasonsOn`.
- **complexities.md:** updated (soil 4.5, plants 8, animals 8.5).

## Deviations

1. **Fungus seeding.** A separate pass seeds fungi: skipped land understory slots under a canopy, chance `FUNGUS_SEED_P`. Fungi never won the plain best-founder contest.
2. **Light-adjusted competition.** When a plant and a fungus compete for an understory slot under a canopy, `plantSeed` applies shading to the plant side. Otherwise plant invaders compared unshaded K against a litter-limited fungus and always won.
3. **Lagged fruit season.** `fruitFactor` is applied to a season lagged by `FRUIT_LAG`, so fruit peaks after bloom. `bloomFactor` and `fruitFactor` have the same shape.
4. **Extra constants beyond the plan:**
   - `FUNGUS_SEED_P`, `FUNGUS_RETURN`, `MYCO_HOST_K`, `LITTER_INIT` and `FRUIT_ROT`.
   - `BERRY_MASS` (the plan's literal 1.2), `FRUIT_MIN_BITE`, `CARCASS_EATEN` and `AVERSION_LOG_GAP`.
5. **Aversion mechanics:**
   - Aversion decay is multiplicative (`× (1 - AVERSION_DECAY)` per species refresh), and entries below 0.05 are dropped.
   - The log type is `'info'`, rate-limited per animal-and-fungus pair.
6. **Fruit rules:**
   - Fruit exists on land only.
   - `seedDrops` counts surviving seeds, whether or not `plantSeed` then wins the slot.
7. **Extra API:** `fruitAt(i, tall)` was added. `edible` and `graze` gained an optional `skipUnder`, and `eatFruit` an optional `tall`. Non-reachers skip trees with wood of at least 0.62.
8. **Perf gate:** not met on seed 7 (about 1.28×). See Risks.

## Risks

- **Perf.** Seed 7 runs at about 1.28–1.33× the Part 1 baseline, and 42 and 123 at 1.17–1.23×.
  - Most of the growth is population. Mean animals are +34% on seed 7, mainly water herbivores (964 → 1667), from the richer nutrient and litter cycle and the plan's `floor *= 1 + 0.2*(1 - fruiting)`.
  - Per-plant and per-animal costs are +12–20%. PG went from 8 to 13, so `mutateGenes` alone roughly doubled.
  - Lowering `FRUIT_ENERGY` (5 or 6), `CARCASS_FRAC` (0, 0.15, 0.3), `LITTER_INIT` (0) or `FLOWER_SEED_BONUS` (1.0) did not reliably bring population down. Population then varied chaotically between runs.
  - Hitting 1.25× on seed 7 would likely need animal caps or existing animal constants, which the brief forbids, so I stopped there.
- **Noisy measurement.** The machine was shared, with load 3–18 during the work. Only concurrent pairs are comparable.
- **Fungus range.** Seed 123's wet forests let decomposers keep spreading slowly (3146 tiles at t3000, still rising). Seed 7's fungi drop to a minimum of 54 tiles before recovering. The ≥ 2 categories rule is met, but only just.
- **Land omnivores are fragile.** LO swings widely (seed 42 at 32 at t3000, and near 0 in some tuning variants).
- **Pre-existing bug.** Seed 123 has one NaN world tile (index 59465, water). It makes that tile's plant cap NaN, so `stats.plantBiomass` sums to NaN and prints 0 in the runner. This is outside Slice A.

## Next steps

1. Decide whether to accept the seed 7 perf overage or allow a population lever. Options: `maxAnimals`, or a water-plant floor exception to the `1 + 0.2*(1 - fruiting)` rule.
2. If the overage should shrink without changing behaviour, pack `kind`, `myco`, fruit and bloom flags into one per-slot byte in `plants.step` (about 0.5 ms/t).
3. Fix the NaN world tile at seed 123, index 59465, in the world generator.
4. Consider a soft cap on decomposer spread in very wet forests: a higher `FUNGUS_LITTER_K`, or litter-weighted `FUNGUS_SEED_P`.
5. The UI agent should take `forest-floor.png` and `litter.png` now that `SIM_READY.md` exists.
