# Audit: plant strategies (Part 2, item 9, slice B)

Base commit 6f809dd. Commits on the worktree branch:

| Commit | What |
| --- | --- |
| e0738e7 | Plant strategies core: fixers, succulents, carnivores, parasites, allelopathy, thorns, induced defence, blooms, oxygen, peat, erosion, forest climate |
| 121e1c3 | Tadpoles graze blooms, larvae spared hypoxia, plant strategy UI rows, badges and icons |
| b68f050 | Algae blooms drawn on water; `bloom` added to `SNAP_GRIDS.plants` |
| e72cea4 | Cached strategy flags (`sflag`), land strategies on alternating tile halves, induced defence inlined |
| 3053c93 | `cool` added to `SNAP_GRIDS.weather`; `effTemp` guarded (fixed a main-thread crash that froze the browser UI) |

## What changed

### Genome

`PG` went from 23 to 29. There are six new plant gene slots, all scalars:

| Slot | Gene | Threshold | Growth cost |
| --- | --- | --- | --- |
| 23 | fix (nitrogen fixing) | 0.25 | 0.15 |
| 24 | succulent | 0.5 | 0.18 |
| 25 | het (heterotrophy) | 0.6 | none |
| 26 | allelo | 0.3 | 0.12 |
| 27 | thorn | 0.4 | 0.15 |
| 28 | induce | none | 0.06 |

Toxins are still the single existing scalar. `SAVE_VERSION` stays 2, and no new class was added.

### Form bits

- `FORM_SUCC = 64` and `FORM_HET = 128`.
- Parasite = HET|EPI, which reuses the epiphyte soil exclusion.
- A non-climbing HET plant is a carnivore.
- Phase-bin reads are now masked: `(form>>3)&7`.

### Succulents, cacti and heat grasses

- **Moisture:** CPU growth and the GPU plant shader both use `mm + (1-mm)*SUCC_DRY` as the moisture term.
- **Cap:** `plantStrategyCap` gives a bonus in hot, dry tiles and a penalty in wet ones.

### Nitrogen fixers

Fixers add `FIX_RATE*fix*min(bio,1)` to the tile's soil nutrient.

### Carnivorous bog plants

- **Feeding:** carnivores call `bugs.eat()`, which removes bugs. They gain biomass, health and soil nutrient from it.
- **Cap:** the cap is low on dry land and boosted by the existing `BIOME_SOGGY`.

### Parasites

- A parasite in the under slot drains biomass from a woody canopy host above its floor.
- Without a host it loses health.

### Allelopathy

- It trims the other slot's biomass above that slot's floor.
- It also lowers `childK` for seedlings in the paired slot.

### Thorns, toxins and induced defence

- **Thorns:** reduce the graze bite: `1-THORN_K*thorn`.
- **Induced defence:** each graze or pest `damage` raises `induced[p]`, capped at `INDUCE_MAX*induce`. It decays on strategy passes.
- **Where induced counts:** grazer toxicity (`grazeTox`), and bug pest defence (`min(1, g13+induced)`) in `bugs.js`.

### Water

- **Blooms:** `bloom` grows on hot, nutrient-rich water. It uses up nutrient, crashes, and drops litter.
- **Oxygen:** `oxygen = 1 + kelp - bloom - rotting litter`. Below `HYPOXIA`, adult fish and amphibians in water pay a higher metabolic cost.
- **Larvae:** they are exempt from hypoxia, and tadpoles graze algae (`TAD_ALGAE`). Kelp and seagrass add oxygen.
- **Icons:** eelgrass is new; flytrap, pitcher, sundew, mistletoe and dodder were added for land strategies.
- **Map:** blooms are drawn as green scum on the map.

### Forests

- **Where:** tree canopy, using the cached `SF_TREE` flag.
- **Effects:** forests cut evaporation, add a little rain, and write `weather.cool[i]`.
- **Who reads `cool`:** `effTemp` and animal thirst.

### Soil

- **Terrain:** `SoilLayer._terrain` builds `decayK` (slow decay in bogs, i.e. peat), `slope` and `down` (steepest-descent neighbour). These are DERIVED fields, rebuilt on load.
- **Litter decay:** scaled by `decayK` on both the CPU and GPU paths (`TILE_F.decay`).
- **Erosion:** moves nutrient and litter downhill. It is held back by root biomass and litter.

### GPU mirror

- The succulent moisture term is in `plantKernels.js`.
- Litter decay `decayK` uses the new tile field 9.
- `plantGpu.cpuPart` calls `_strategies(tick)` on check ticks. CPU edits to biomass, nutrient and litter go through the existing diff upload.

### UI

- `PLANT_TRAITS` has rows 23–28.
- `plantLifeBadges` adds Nitrogen fixer, Succulent, Parasitic or Carnivorous, Allelopathic, Thorny and Induced defence.

### Old saves

- `upgradeGenes` pads genomes, seed genomes and registry means to 29.
- It creates `induced`, `bloom`, `oxygen` and `strat` if missing.
- `save.upgrade` attaches `plants.bugs` and pads the weather `cool` grid.

## Numbers (3000 ticks, three seeds run in parallel, node CPU path)

Minima are taken from tick 500 onward.

| Seed | Run | ms/tick | min fish/amph/rep/mam/bird/inv | min niches seed/insect/fisher/raptor/carrion | end fish/amph/rep/mam/bird/inv | cover | tree |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 42 | base | 35.73 | 443/11/82/493/100/298 | 6/28/2/2/7 | 3230/768/88/950/128/3336 | 0.965 | 0.421 |
| 42 | new | 36.28 | 431/25/153/246/79/222 | 6/32/2/3/7 | 3035/430/331/708/106/2369 | 0.973 | 0.463 |
| 7 | base | 30.37 | 427/14/68/412/104/96 | 7/12/1/3/7 | 2311/198/679/1470/185/875 | 0.931 | 0.580 |
| 7 | new | 33.79 | 374/68/108/323/71/254 | 9/7/5/3/6 | 1888/424/593/789/93/2819 | 0.922 | 0.586 |
| 123 | base | 33.41 | 651/5/166/464/64/330 | 9/20/2/4/5 | 3286/424/676/464/140/2152 | 0.925 | 0.575 |
| 123 | new | 35.44 | 665/54/104/315/73/220 | 4/17/4/1/8 | 2649/718/866/611/146/2190 | 0.922 | 0.561 |

All six classes and all five bird niches stay alive on every seed.

Mean ms/tick went from 33.17 to 35.17, which is +6.0%. Run #2, before the flag cache and alternating tiles, was +9.5%. Per seed the change is +1.5%, +11% and +6%. Much of the rest tracks larger living populations (amphibians, fish and inverts) rather than the strategy pass. Profiling seed 7 showed `_strategies` at about 0.75 ms/tick before the halving.

Strategy counts at tick 3000 (fixers / succulent / carnivore / parasite / allelopath / thorny / induced / bloom tiles / hypoxic tiles / peat tiles / eroded tiles):

| Seed | Counts |
| --- | --- |
| 42 | 8658 / 4052 / 2422 / 478 / 1188 / 23016 / 31550 / 27 / 1795 / 304 / 9618 |
| 7 | 5950 / 2396 / 588 / 1020 / 674 / 18338 / 26944 / 154 / 865 / 310 / 13342 |
| 123 | 7850 / 4348 / 1430 / 242 / 974 / 18598 / 29122 / 454 / 1559 / 682 / 9940 |

## Regressions asked for

- **Amphibian minimum after tick 500 (target at least about 30):** 25 on seed 42 (base 11), 68 on seed 7 (base 14), 54 on seed 123 (base 5).
  - Seed 42 dips to about 30 between ticks 1250 and 1500, then recovers to 430.
  - Two changes fixed the earlier collapse: larvae no longer pay the hypoxia cost, and tadpoles graze blooms and under-slot water plants.
- **Seed 42 reptiles at the end:** 331, up from 88 in the base. The minimum is 153.

## Determinism and saves

- Seed 42: saved at 1500, loaded, then both copies stepped 500 ticks. Stats were equal and the full re-encoded state was byte-identical. The `plants.bugs` alias survives the load.
- A base-code save (PG 23) of seed 42 at tick 300 loads in the new code. It pads to PG 29, steps 300 ticks without error, and all registry means are length 29.

## Browser check

Playwright with swiftshader, port 8812, worker on, seed 123 at about tick 244.

- **Map:** renders with algae blooms visible along the coasts: 1468 bloom tiles, max 0.72.
- **Plant panel:** a carnivorous plant with the sundew icon shows the Nitrogen fixer and Carnivorous badges and all six new trait rows.
- **Crash found and fixed:** before 3053c93, the renderer's `weather.effTemp` read an unsent `cool` grid and froze the UI at tick 12.
- **Remaining console errors:** only network (a font certificate error and a favicon 404).

## Open issues

- ms/tick is +6% mean, slightly over the 5% target. Seed 7 alone is +11%, much of it from larger animal populations.
- Seed 42's amphibian minimum is 25, just under the target of about 30. It is a single dip between ticks 1250 and 1500.
- Mammal minima are lower than base: 246, 323 and 315 against 493, 412 and 464. Thorns and induced defence cut grazing. End mammal counts are healthy (708, 789 and 611).
- The raptor niche minimum is 1 on seed 123 (base 4). It never reached zero.
- Land strategies now run on half the tiles per check tick, alternating, with rates doubled. Counts in `plantStrat` are the half count times two, so they are approximate.
- Erosion moves a lot of nutrient on seeds 7 and 123, about 10–13k tile moves per pass. The effect on long-run fertility past 3000 ticks has not been checked.
- Plant names come from the existing generator, so a small carnivorous herb can get a "-dendron" name.
