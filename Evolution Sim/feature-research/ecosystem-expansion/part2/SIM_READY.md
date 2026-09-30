# Sim ready

The Slice A sim is final, and screenshots can be taken now. The constants are baked in: `FUNGUS_LITTER_K` = 0.06, and the fungus founders are retuned to moisture 0.36–0.48.

**Ecology gate:** passes on seeds 42, 7 and 123 × 3000 ticks.
- All 6 trophic groups are above 0.
- Fruit trees or berry bushes, flowers, and at least 2 fungus categories are alive on every seed.
- seedDrops and fruitEaten are above 0.
- All 3 toxin types have poisoned > 0.
- There are 42–63 aversion events per seed.

**Perf gate:** marginal. Measured as paired CPU runs against the Part 1 tree at the same load, the ratios are 42 = 1.17×, 123 = 1.23× and 7 = 1.28×. Seed 7 is over the 1.25× limit, mostly because it now has about 30% more animals. `part2/audit.md` has the details.

**Contract deviations the UI can rely on:**
- `plants.bloomNow` and `plants.fruitNow` hold the current factors, and both are 0.5 when seasons are off. `fruitFactor` is applied to a season that lags by `FRUIT_LAG` = 0.2 of a year.
- `plants.hue[p]` is the species hue divided by 360.
- There is a new `plants.fruitAt(i, tall)`.
- `edible` and `graze` take an optional `skipUnder`, and `eatFruit` takes an optional `tall`.
- Aversion log entries use type `'info'`.
- Fruit is land-only.
