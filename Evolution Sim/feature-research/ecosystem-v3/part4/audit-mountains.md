# Slice 4.5 audit: mountains

## What was built

**World gen 8 (the new default)**
- New biomes: SCREE, MONTANE_FOREST, KRUMMHOLZ, HIGH_PLATEAU, TARN and CAVE_MOUTH. They are appended after ATOLL, so existing ids do not move.
- The gen 8 pass is `_mountainsV8` in `mapGenerator.js`. It runs after the gen 7 coast pass.
- **Lapse rate:** land temperature drops by `0.11 × (altitude − sea level)`. On this map scale that is about −6 °C per 1000 m.
- **Rain shadow:** a smoothed ridge height is carried across each row in the prevailing wind direction:
  - The wind blows east in the mid-latitudes and west in the trades and polar band.
  - The carried ridge decays by 0.985 per tile.
  - Tiles in the lee of a ridge above hill level lose humidity in proportion to how far they sit below it.
- **Treeline:** it is a temperature threshold, `0.37 − 0.06 × (1 − latitude)`. Trees climb higher near the equator and the treeline drops toward the poles.
- **New biome rules (land at hill level + 0.05 or higher):**
  - TARN: a flat, high, cold, humid basin picked by noise. It is fresh water.
  - CAVE_MOUTH: a steep tile next to a cliff or a very steep tile, picked by noise. Caves sit at least 5 tiles apart.
  - KRUMMHOLZ: the 0.06 temperature band just above the treeline, on tiles that are not too steep.
  - SCREE: steep ground above the treeline, or very steep ground at mountain level.
  - HIGH_PLATEAU: flat, dry tiles near mountain level.
  - MONTANE_FOREST: humid slopes below the treeline. Drier slopes keep MOUNTAINS.
- **Tile counts (320×210):**

| Seed | SCREE | MONTANE_FOREST | KRUMMHOLZ | HIGH_PLATEAU | TARN | CAVE_MOUTH |
|---|---|---|---|---|---|---|
| 42 | 688 | 1356 | 79 | 428 | 8 | 48 |
| 7 | 1040 | 442 | 207 | 328 | 73 | 35 |
| 123 | 703 | 538 | 172 | 242 | 9 | 25 |

- Gens 2–7 are untouched, and their world hashes match base.
- CAVE_MOUTH tiles have no plants (harsh 0). They give shelter and dens. They are the hook for slice 4.6 Caves.

**Alpine plants (`plants.js`)**
- Four archetypes are added: cushion plant, lichen, alpine flower and dwarf conifer. They are seeded as founders only on gen 8 or later.
- Categories, icons and labels are added for all four.
- **UV stress:**
  - On gen 8, land above hill level gets a UV value that rises with altitude.
  - Plant cap and bounds are multiplied by `uvFit(uv, toxin)`. A plant with a toxin gene below 0.55 loses up to 50% of its cap at full UV, so high plants are pushed toward more protective toxin.
- Biome harsh, wood and depth tables cover the new biomes. TARN is in WATER_BIOME_SET.

**Animals (`animals.js`)**
- **Two new genes:**
  - G_LUNG (36) is lung capacity and G_CLIMB (37) is climbing. AG is now 38.
  - Old 36-gene genomes are padded to 0.2 for both (the `AG_V4` pad path).
  - Each gene adds 4% to upkeep per unit of gene, so they are not free.
- **Altitude sickness:**
  - `sick` is 0 below altitude 0.74 and rises to 1 at the peak.
  - An animal that is not dormant pays `0.35 × sick × (1 − lung / 0.7)` of its base upkeep per tick. Lung capacity of 0.7 or more removes the cost.
  - The existing alpine thin-air cost is also scaled by `(1 − lung / 0.7)` on gen 8.
- **Slope:**
  - `slope` is the steepest 4-neighbour altitude step, normalised by 0.05.
  - Land movement speed is multiplied by `1 − 0.55 × slope × (1 − climb / 0.7)`, and land upkeep by `1 + 0.25 × slope × (1 − climb / 0.7)`. Climbers (climb 0.7 or more) ignore slope.
- **Ambush on slopes:** on rugged tiles, a land attacker's catch chance is multiplied by `1 + 0.6 × (climb difference) × (0.5 + slope)`. The snow leopard gains on slopes and the ibex escapes.
- **Soaring:** a flying bird over a tile with updraft (`lift`: ridges and steep high slopes) has its upkeep multiplied by `1 − 0.4 × lift × size`. Big soarers (condor, eagle) gain the most.
- **Caves:** on a CAVE_MOUTH tile, weather exposure is multiplied by 0.4, and a cave scores 1.4 as a mammal den site.
- **Walk and zone:**
  - SCREE, KRUMMHOLZ, HIGH_PLATEAU, CAVE_MOUTH and MONTANE_FOREST are rugged (bit 32). CAVE_MOUTH is also a perch.
  - SCREE, KRUMMHOLZ and HIGH_PLATEAU are ALPINE, MONTANE_FOREST is DENSE and TARN is FRESH.
  - The god-tool `_rewalk` mirrors these rules.
- **Seven archetypes (65–71, `MOUNTAIN_ARCH`)**, founded only when the mountain layer exists (gen 8 or later) and placed on high tiles:

| Archetype | Category | Notes |
|---|---|---|
| ibex/goat | ibex | climbing grazer; lung 0.8, climb 0.9 |
| snow leopard | snowleopard | solitary ambush carnivore on slopes; climb 0.85 |
| pika | pika | small burrowing hibernator; dormancy 0.75 |
| marmot | marmot | burrowing hibernator; dormancy 0.85 |
| condor | condor | large soaring scavenger |
| eagle | eagle | soaring raptor |
| alpine salamander | alpinesalamander | cold, high amphibian; dormancy 0.7 |

  - Each category is derived from the genes: high lung plus size, climbing and diet. Each has an icon and a label.
  - The gene inspector shows "Lung capacity" and "Climbing".

**Avalanches (`js/sim/mountains.js` and `disasters.js`)**
- MountainLayer keeps the steep high tiles (slope 0.45 or more, at hill level or above).
- Every 6 ticks it samples 24 of them. A sample with snow of 0.65 or more starts an avalanche with a 12% chance, and avalanches have a 40-tick cooldown.
- The slide follows steepest descent for up to 18 tiles, three tiles wide, and the snow on the path is cleared.
- `DisasterLayer.avalanche` reuses the windthrow scar logic (scar kind 3). It clears the canopy on the path, and clears 70% of the non-fungus understory, so the path regrows through normal succession.
- It also kills eggs on the path.
- Land and amphibious animals on the path die with chance `0.6 × (1 − 0.7 × climb)`. The death is counted as `deaths.avalanche`.
- The log reads "An avalanche swept down the …".
- Avalanches only run when disasters are on.

## Gates (final run; gen 8 default; 3000 ticks)

| | seed 42 | seed 7 | seed 123 |
|---|---|---|---|
| All 6 classes alive at the end | yes | yes | yes |
| All 5 bird niches alive at the end | yes | yes | yes |
| Freshwater fish min–max (end) | 55–635 (172) | 31–427 (90) | 76–366 (122) |
| Avalanches / animals buried | 2 / 0 | 32 / 2 | 35 / 0 |
| Trees swept by avalanches | 20 | 68 | 70 |
| Mountain rescues (`mtn.rescues`) | 13 | 10 | 15 |

- Seed 42 has little snow on its steep tiles, so it gets only 2 avalanches. Seeds 7 and 123 get one about every 90 ticks once winters set in.

**New archetypes: min–max over the run, then the count at the end**

| | seed 42 | seed 7 | seed 123 | Seeds alive at end |
|---|---|---|---|---|
| ibex | 1–68, 2 | 1–71, 12 | 0–62, 31 | 3 |
| snowleopard | 0–23, 1 | 0–16, 1 | 0–21, 3 | 3 |
| pika | 0–85, 24 | 3–106, 7 | 0–133, 11 | 3 |
| marmot | 0–86, 29 | 0–49, 17 | 0–76, 64 | 3 |
| condor | 1–24, 7 | 3–18, 13 | 0–17, 5 | 3 |
| eagle | 0–25, 15 | 0–18, 18 | 0–28, 2 | 3 |
| alpinesalamander | 0–73, 41 | 0–59, 10 | 0–69, 20 | 3 |

**Rescues: how often a migration reintroduced each category over 3000 ticks (seeds 42 / 7 / 123)**
- This counts every migration path: the generic class/role rescue, the marine, river and coast rescues, and the new mountain rescue.

| Category | Rescues (42 / 7 / 123) |
|---|---|
| ibex | 1 / 1 / 2 |
| snowleopard | 7 / 6 / 8 |
| pika | 2 / 0 / 2 |
| marmot | 1 / 2 / 2 |
| condor | 9 / 7 / 6 |
| eagle | 15 / 14 / 13 |
| alpinesalamander | 1 / 1 / 2 |

- Condor and eagle counts are high mostly because the generic bird-niche rescue picks at random among all matching archetypes. When the carrion or raptor niche runs low, it often brings back a condor or eagle instead of a vulture or raptor.

**The mountain rescue**
- Archetypes 65–71 (`MOUNTAIN_ARCH`) are added to the 240-tick check, after the coast rescue.
- A missing category is reintroduced on a high tile with the message "… returned to the mountains".
- It runs only when the mountain layer exists (gen 8 or later).
- It fired 13 / 10 / 15 times per 3000 ticks. That is about once every 200–300 ticks, spread over the 7 categories.
- Self-sustaining without rescue: ibex, pika, marmot and alpine salamander need at most 2 rescues per run.
- Still rescue-dependent: the snow leopard, a low-density top predator, needs about 7 rescues per run.

**GPU mirroring**
- No WebGPU kernel change was needed.
- UV changes plant `cap` on the CPU, and the plant GPU path already diff-uploads `cap`.
- Avalanche clears go through `P._clear` and the scar logic, as windthrow does.
- The new biomes use the per-biome static tables that are already uploaded.
- The renderer reads the biome grid, which is already in the snapshot, so no new grids were added to SNAP_GRIDS or SNAP_STATIC.

**Saves**
- SAVE_VERSION stays 2.
- `MountainLayer` is registered in the save. These fields are DERIVED and rebuilt on load: `slope`, `sick`, `lift`, `cave`, `high`, `down` and `steep`.
- Counters and the avalanche cooldown are persisted.
- Upgrade path:
  - Old saves with 36-gene genomes are padded to 38 genes (lung 0.2, climb 0.2).
  - A gen 8 save without a mountain layer gets a fresh one.
  - Older gens get `mtn = null`, so every mountain mechanic stays off for them.

**Speed (solo, base 04d1561; base is gen 7, new is gen 8)**

| Seed | Base | New | Change | µs per animal (base → new) |
|---|---|---|---|---|
| 42 | 22.58 ms | 23.55 ms | +4% | 13.3 → 13.2 |
| 7 | 21.28 ms | 19.83 ms | −7% | 14.9 → 12.6 |
| 123 | 21.71 ms | 23.05 ms | +6% | 12.2 → 13.0 |

- Over all three seeds the total is +1.3%.
- Seed 123 is just over the 5% target. Cost per animal rises about 7% there, from the extra per-animal mountain checks (sickness, slope and lift lookups).

**Reproducibility**
- World hashes for gens 2–7 match base: 24 of 24 (seeds 42, 7, 123 and 999).
- Secret seeds: secret rolls match base. Gen 8 marks 52 founders and logs 2 secret messages.
- Save at tick 1500, load, step 500: identical. The world is also identical straight after load.
- Dam replay is still identical 300 ticks after load.
- Old base saves load with identical worlds and run 600 ticks: gen 3 (seed 7), gen 4 (seed 42), gen 5 (seed 123) and gen 7 (seed 5).
- Two separate runs give the same hash.

**Browser** (port 8798, swiftshader):
- Loads gen 8 with seed 42, GPU, worker mode.
- Ran 127 ticks, then switched to fast (WebGPU) mode and kept advancing (237 → 311).
- Mountain biomes are present: MONTANE_FOREST 1356, SCREE 688, HIGH_PLATEAU 427, KRUMMHOLZ 79, CAVE_MOUTH 48, TARN 8.
- All seven mountain categories are alive in the browser.
- No console errors.

## Known issues

- **The snow leopard depends on the mountain rescue** (about 7 per 3000 ticks). It is a solitary top predator founded at 10, and it often ends a run with 1–3 animals.
- **Categories can drift.** Mountain categories are read from the genes (lung of 0.6 or more, climb, size). Since lung and climb cost upkeep, descendants that lose them get relabelled as ordinary deer, wolf, raptor and so on. Part of the "rescue" count is relabelling, not extinction.
- **Avalanches depend on snow.** Seed 42 has few snowy steep tiles and gets only 2 avalanches per 3000 ticks, against 32–35 on the other seeds. Animal burials are rare (0–2 per run), because most animals avoid steep, snowy ground in winter.
- **Gene RNG consumption changed for all gens.** Adding two genes changes RNG use in mutation, so gens 2–7 simulations do not replay base tick for tick. Only their world hashes are identical. All mountain mechanics are gated off below gen 8.
- **Speed on seed 123 is +6%**, just over the 5% target. The three-seed total is +1.3%.
- **Cave mouths are biome tiles only.** They give shelter and dens, but there is no interior yet; that is slice 4.6.
