# Part 2 audit: biome adaptation

Item 5 of Part 2. This item adds biome-specific selection on existing genes, so lineages in different biomes drift apart in body size, drought tolerance, dormancy and coat. No gene slots were added (AG 30, PG 17, BG 10). `SAVE_VERSION` stays 2, and no new save classes were needed.

## What changed

### Animal pressures (`js/sim/animals.js`)

**Biome zones.** A static `zone` grid (Uint8, one entry per tile) is built from the biome in the `AnimalPool` constructor through `BIOME_ZONE`. It is derived from the world, so it is not saved and the renderer does not read it.

| Zone | Biomes |
| --- | --- |
| Arid | desert, salt flat, badlands |
| Dense | rainforest, jungle, cloud forest, redwood forest |
| Mire | wetland, bog, swamp, mangrove, tundra bog, pond |
| Fresh | lake, river |

**Arid heat load.** Land animals in the arid zone pay an extra cost of `m75 · ARID_K · (ARID_BASE + ARID_SIZE · size) · (1 − dry)`. Cold-blooded animals pay ×0.45 of that, and a den reduces it.
- Desert lineages are pushed towards small bodies and a high `G_DRY`.
- Reptiles are favoured in deserts.

**Bergmann cold load.** Warm-blooded land animals (in practice mammals) pay `m75 · BERG_K · ((0.4 − et) / 0.4) · (1 − size)` when the effective temperature is below 0.4. Cold lineages are pushed towards larger bodies. This sits on top of the existing climate, fat-insulation and hibernation rules.

**Dense-forest drag.** In the dense zone, land animals with `size` above 0.25 move at ×(1 − 0.7 · (size − 0.25)).

**Mire drag.** The old flat 0.7× speed on bog, tundra bog and reef tiles is now size dependent: ×(1 − 0.3 · (0.4 + size)). Light animals cross mires more easily than heavy ones.

**Amphibian wetland benefit.** Amphibious-domain animals get a lower metabolic cost:
- ×(1 − 0.22 · (1 − 0.5 · dry)) in the mire zone;
- ×(1 − 0.10 · (1 − 0.5 · dry)) on lake and river tiles.

This favours moist-skinned (low `G_DRY`) amphibians in wetlands, and it is the main amphibian lift.

**Salt tolerance.** The extra water loss on saline tiles (salt flat and mangrove) is scaled by `(1 − 0.7 · dry)`, so `G_DRY` doubles as salt tolerance.

**Desert aestivation (behaviour).** On arid tiles, reptiles and small mammals (mass below 1.2) can now aestivate (dormancy kind 3) through droughts and dry seasons when their `G_DORMANCY` allows it. Before this change only amphibians and land invertebrates could. Desert lineages therefore gain a sleep-out-the-heat behaviour and selection on `G_DORMANCY`.

### Plant pressures (`js/sim/plants.js`, `biomeFit`)

`biomeFit` gains two new terms and some new entries for the existing terms:

| Term | Effect | Biomes |
| --- | --- | --- |
| `BIOME_DEEP` (new) | Favours deep roots | desert 0.4, badlands 0.3, frozen desert 0.2, steppe 0.15, savanna 0.12 |
| `BIOME_SOGGY` (new) | Penalises deep roots, from waterlogging | bog 0.3, tundra bog 0.3, wetland 0.2, swamp 0.15 |
| `BIOME_WOOD` | Woody bonus, which nudges trees | temperate forest, taiga, rainforest, jungle, redwood, woodland, cloud forest |
| `BIOME_WOOD` | Woody penalty (dwarf shrubs) | tundra 0.35 |
| `BIOME_SHADE` | Shade-tolerance bonus | rainforest 0.2, jungle 0.15 |

**WebGPU mirror.** `biomeFit` only feeds `capFor` and the seed-bank gate on the CPU. The WebGPU fast mode reads `cap` from the CPU and uploads it, so the plant step kernels in `js/gpu` need no change.

### Look (`js/render.js`, `js/main.js`)

**Coat tint.** Each land or amphibious animal species gets a coat tint from its species mean genes (`sp.mean`, which is already in the worker species records). The tint is written into `spCol` after `_writeCol`:
- **Arid tint:** blends towards sand. Strength is `clamp((dry − 0.25) / 0.45) · clamp((T − 0.45) / 0.3)`.
- **Cold tint:** warm-blooded species only; blends towards pale or white. Strength is `clamp((0.42 − T) / 0.3)`.
- Both tints are capped at a 0.6 blend, and they apply to the base, dark and light colour layers.

**Body proportions.** A per-species `spWide` factor scales the sprite width: up to +16% (stocky) for cold-adapted species and −12% (lanky) for arid ones. Larvae are excluded.

**Species card.** The habitat line adds "· cold-adapted" for warm-blooded species with a mean heat preference below 0.3.

## Gates (3000 ticks, Medium 320×210; base 4214f29 and new bb9e507 run side by side)

| Gate | Base (4214f29) | New |
| --- | --- | --- |
| ms/tick (42 / 7 / 123) | 54.93 / 51.18 / 50.68 (mean 52.26) | 53.52 / 53.38 / 51.01 (mean 52.64, +0.7%) |
| Classes at 3000, seed 42 (fish/amph/rept/mamm/bird/invert) | 3275/338/547/1027/167/2659 | 2876/68/520/1142/141/2242 |
| Classes at 3000, seed 7 | 2297/141/660/1501/171/1275 | 2254/310/707/717/115/2646 |
| Classes at 3000, seed 123 | 2702/72/1080/1467/168/1414 | 1985/197/974/1609/94/2487 |
| Class means from tick 1000, seed 42 | 2093/296/321/1115/203/1963 | 2285/127/420/1056/236/1624 |
| Class means from tick 1000, seed 7 | 1771/115/670/1481/148/880 | 1823/367/537/1045/114/1607 |
| Class means from tick 1000, seed 123 | 1666/50/791/1422/222/736 | 1863/182/753/1258/142/1202 |
| Amphibian low from tick 500 (42 / 7 / 123) | 81 / 23 / 15 | 48 / 104 / 41 |
| Bird niches at 3000, seed 42 (seed/insect/fisher/raptor/carrion) | 95/12/38/6/16 | 61/21/9/15/35 |
| Bird niches at 3000, seed 7 | 55/37/10/24/45 | 30/34/9/20/22 |
| Bird niches at 3000, seed 123 | 65/35/31/6/31 | 16/34/13/6/25 |
| Lowest niche count from tick 500, seed 42 | 40/12/8/4/8 | 41/21/6/4/6 |
| Lowest niche count from tick 500, seed 7 | 9/22/2/4/6 | 8/9/5/2/10 |
| Lowest niche count from tick 500, seed 123 | 4/35/6/2/10 | 6/24/3/5/9 |
| Tree slots at 3000 (42 / 7 / 123) | 13481 / 19049 / 17779 | 14121 / 19110 / 17431 |
| Animal species at 3000 | 39 / 35 / 36 | 36 / 37 / 37 |
| Save, load and step 500 (det.js, seed 42, tick 1500) | — | stats, full state (17.3 MB) and RNGs equal |

All six classes and all five bird niches stay alive on every seed, and no count reaches 0.

### Amphibians

| Seed | Mean before (after the worldgen merge) | Mean after | Old baseline |
| --- | --- | --- | --- |
| 7 | 115 | 367 | 329 |
| 123 | 50 | 182 | 154 |
| 42 | 296 | 127 | 124 |

- Seeds 7 and 123 are now above the old baseline.
- Seed 42 fell back to about its old baseline.
  - On base, seed 42 has one lake-shore and hill lineage that booms after tick 1000.
  - With the new pressures, that boom does not happen in this run, and the floor after tick 500 is also lower (48 against 81).
- A first run without the lake and river bonus gave seed 42 only 56. The fresh-water bonus brought it back to 127.

### Divergence (land and amphibious animals at tick 3000, mean genes by tile zone; new run)

| Seed | Cold-zone size against other | Arid-zone size against other | Cold-zone heat preference |
| --- | --- | --- | --- |
| 42 | 0.398 against 0.221 | 0.263 against 0.221 (n = 41) | 0.33 |
| 7 | 0.194 against 0.132 | 0.083 against 0.132 | 0.36 |
| 123 | 0.210 against 0.240 | 0.123 against 0.240 | 0.40 |

- On base, the arid-zone animals were small as well, but the cold-zone size lead was weaker (seed 42: 0.211 against 0.186).
- The first tuning (a weaker arid size term and a forest drag of 0.5) left arid animals larger than the others on all seeds. The final constants reversed that on seeds 7 and 123.

## Test runs used

1. **Run 1:** first version (no lake or river bonus, `ARID_K` 0.22 with size ×1, forest drag 0.5) against base. Amphibians were 56 / 366 / 193, and seed 42 was low.
2. **Run 2:** final version (bb9e507) against base, plus the save determinism check. This gives the numbers above.

## Open issues

- **Amphibians on seed 42:** the mean is 127, about the old baseline, but well below the 296 seen right after the worldgen merge. That earlier figure came from one booming lineage on seed 42 and looks chaotic rather than structural.
- **Weak divergence in some zones:**
  - Arid-zone `G_DRY` does not rise clearly within 3000 ticks.
  - Dense-forest animals are still not smaller than average; frugivores in dense forest tend to be large.
  - The zone samples are small (tens to a few hundred animals), and at any moment many of the animals in a zone are passing through.
  - Longer runs, or speciation-level tracking per biome, would show the effect better than a 3000-tick snapshot.
- **Coat is per species:** the tint and proportions follow the species mean, so an adapted sub-population shows its look only once it speciates or shifts the mean. Per-individual coats would need animal genomes on the main thread.
- **Trees:** seed 42 gained about 5% tree slots and seed 7 is flat, while seed 123 lost about 2%. Trees on 42 and 123 are still below the pre-worldgen base.
- **Low floors remain:** the raptor niche floor is 2 on seed 7, and the fisher floor is 3 on seed 123.
- **Not in the test runs:** the renderer coat was checked with `node --check` only. No browser screenshot was taken.
