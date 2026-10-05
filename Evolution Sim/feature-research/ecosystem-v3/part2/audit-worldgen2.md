# Audit: Performance and world generation update 2 (roadmap item 10)

Base commit 937e65e. Commits: 0d52e29, 2ed6934, 30bcf10, 98a8806.

## Performance

Headless benchmark, Medium 320x210, 3000 ticks. Four processes ran in parallel on a shared machine, so treat the absolute numbers as noisy.

| Seed | Baseline gen 3 | New, gen 3 world | New, gen 4 world |
|---|---|---|---|
| 42 | 39.96 | 30.17 | 32.06 |
| 7 | 37.30 | 25.80 | 27.43 |
| 123 | 39.01 | 28.48 | 31.46 |
| Mean | 38.76 | 28.15 (-27.4%) | 30.32 (-21.8%) |
| Mean after tick 300 | 36.94 | 26.76 (-27.6%) | 28.39 (-23.1%) |

Values are ms/tick.

What changed:
- Plants are updated in 16 staggered phases (PLANT_STRIDE 16). Rates are rescaled by the stride and totals are kept per phase.
- Spread attempts that are bound to fail are rejected before any neighbour search (`_doomed`).
- Nearest-neighbour search prunes by unit distance. Plant species means are recomputed every 40 ticks.
- Soil updates every 2 ticks. Bugs step every 8 ticks with rates scaled by dt.
- Gene mutation copies the genome first, then uses geometric skipping, so only the mutated genes draw random numbers.

The 25% target is met on gen 3 worlds and missed by about 2–3 points on gen 4 worlds. Gen 4 worlds are slightly more expensive because they have more land, wetland and floodplain cells holding plants and animals. Ecology also varies a lot from run to run: the same code (30bcf10) on gen 4 measured 30.43 ms/tick in one run and 32.49 in another.

## Determinism and saves

- Saving at tick 1500, loading, then stepping 500 ticks gives the same hash as an uninterrupted run (seed 42, gen 4): equal = true.
- Gen 2 and gen 3 world hashes are unchanged from the base commit:
  - 2:42 f48efb7ec3e55acd
  - 2:7 5157fc73f6d7d639
  - 2:123 9197287fc2fff914
  - 3:42 78b925f6a608eda9
  - 3:7 6f7acc74ae62097d
  - 3:123 eebc2af4499994ff
- Saves made at the base commit still load, and the world regenerates with a matching hash:
  - gen 2 seed 42 → f48efb7ec3e55acd
  - gen 3 seed 7 → 6f7acc74ae62097d
- SAVE_VERSION stays 2. No new typed arrays or save classes were needed. Gen 4 is regenerated from `header.worldGen`, and older saves default to 2.

## Huge world size

Huge is 860x560, which is 1.79× the area of Extra large (640x420) and 7.2× Medium. It is available in the new-world UI.

| Size | Generation | ms/tick (400 ticks, seed 42) |
|---|---|---|
| Medium 320x210 | 1.6–1.8 s | about 30 |
| Extra large 640x420 | 6.6 s | 67.8 |
| Huge 860x560 | 11–14 s | 105.6 headless, 66.6 in browser |

The browser smoke test at Huge ran at about 12 fps with 2173 animals at tick 212 and produced no page errors. The renderer handles the size correctly. The codebase has no minimap, so there was none to adapt.

## World generator gen 4

Gen 4 is now the default (WG_GEN = 4). Every gen 4 path is gated on `gen >= 4` and uses its own seeds, so gen 2 and gen 3 stay bit-for-bit reproducible.

Changes:
- Continents are domain-warped and have curved mountain belts per continent.
- Wind patterns include polar easterlies, and continentality is factored in, which gives rain shadows behind ranges.
- Humidity is normalised. Rivers are more prominent (factor 0.7).
- A 3x3 mode filter smooths biome transitions.

### New biomes

| Biome | Rule | Animal zone | Plant fit |
|---|---|---|---|
| Alpine Meadow | Moderate altitude, cool, moist, gentle slope | Alpine (with ALPINE_AIR_K cost, walk bit 32) | Grasses and herbs favoured |
| Volcanic Field | Mask of hotspot and plate-boundary peaks | Arid | Harsh, pioneer plants only |
| Oasis | Placed at low points in hot, dry basins near water | Mire | Lush, high fit |
| Sand Dunes | Hot, very dry, flat (also carved out of flat dry badlands) | Arid | Harsh, succulents only |
| Floodplain | Low-lying land beside rivers on flat ground | Mire | Fertile, high fit |

Each new biome has a BIOME_INFO colour, a procedural render texture and a legend entry; the legend reads BIOME_LIST automatically. Plant GPU stepping does not read biome data, so nothing needed mirroring on the GPU.

Share of map area per new biome:

| Map | Meadow | Volcanic | Oasis | Dunes | Floodplain |
|---|---|---|---|---|---|
| Medium, seed 7 | 1.08% | 0.46% | 0.30% | 0.26% | 0.16% |
| Medium, seed 42 | 0.38% | 0.39% | 0.36% | 0.35% | 0.15% |
| Medium, seed 123 | 0.38% | 0.27% | 0.37% | 0.13% | 0.21% |
| Huge (3 seeds) | 1.2–1.9% | ~0.3% | ~0.3% | 0.26–0.4% | 0.10–0.24% |

## Population gates (3000 ticks, minimum over the run)

Class minima are listed as fish / amphibian / reptile / mammal / bird / invertebrate. Niche minima are listed as seed / insect / fisher / raptor / carrion.

| World | Seed | Class minima | Bird niche minima |
|---|---|---|---|
| Baseline gen 3 | 42 | 431/25/153/246/79/222 | 6/32/2/3/7 |
| Baseline gen 3 | 7 | 374/68/108/323/71/254 | 9/7/5/3/6 |
| Baseline gen 3 | 123 | 665/54/104/315/73/220 | 4/17/4/1/8 |
| New gen 4 | 42 | 541/48/90/254/81/527 | 11/14/6/6/10 |
| New gen 4 | 7 | 228/25/172/294/74/299 | 11/10/3/3/11 |
| New gen 4 | 123 | 351/44/99/261/75/484 | 13/9/6/3/11 |
| New gen 3 | 42 | 355/28/128/228/61/227 | 11/13/3/3/9 |
| New gen 3 | 7 | 346/31/110/317/79/99 | 13/12/5/1/11 |
| New gen 3 | 123 | 628/2/82/292/94/274 | 13/27/5/3/11 |

All 6 classes and all 5 niches survive on every seed. BIRD_REVIVE was raised from 10 to 16 after an earlier gen 4 run on seed 7 briefly lost the fisher niche.

## Known issues

- The speed-up on the default gen 4 worlds is about 22–23%, short of the 25% target. Gen 3 worlds reach 27%.
- The amphibian minimum on gen 3 seed 123 fell to 2. That passes the gate but is fragile.
- Generating a Huge world takes 11–14 s on the worker before the first frame appears.
- The new biomes cover small shares of the map (0.1–1.9% each), so they read as accents rather than large regions.
- There is no minimap.
- Benchmark noise from run to run is about ±5%, which is on the same scale as the margin to the target.
- The browser zoom screenshots were only captured for Alpine Meadow and Volcanic Field. The other three biomes were checked by cell counts on a Huge seed 42 map (oasis 1408, dunes 1399, floodplain 1134), not visually.
