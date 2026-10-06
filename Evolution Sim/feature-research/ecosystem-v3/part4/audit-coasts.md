# Slice 4.4 audit: coasts and islands

## What was built

**World gen 7 (the default)**
- New biomes: ROCKY_SHORE, SEA_CLIFF, SALT_MARSH, LAGOON, KELP_COAST and ATOLL. They are appended to the BIOME key order, so existing ids do not move.
- The gen 7 pass is `_coastsV7` in `mapGenerator.js`. It runs after the gen 6 passes:
  - Shallow reef patches far from land can rise into small sand cays.
  - Warm landmasses of 48 tiles or fewer become ATOLL, with a ring of LAGOON around them.
  - Steep or high coast becomes SEA_CLIFF, with ROCKY_SHORE on the sea tiles next to it.
  - Flat, low, mild and humid coast becomes SALT_MARSH.
  - Enclosed warm bays become LAGOON.
  - Temperate shallows (1–3 tiles out) become KELP_COAST.
- **Beach rework:** beaches are re-placed on flat, warm coast at the land/sea edge.
- **Coral reef rework:** reefs move to warm water 2–4 tiles offshore.
- Coast biomes are in OCEAN_SET and WATER_BIOME_SET where appropriate, and they have harsh, depth and plant tables.
- Gens 2–6 are untouched.

**The CoastLayer (`js/sim/coasts.js`)**
- **Tides:** a 48-tick cycle, with low tide for 40% of it.
  - Intertidal tiles are marked as derived state: `tidal` 1 is a rock pool (ROCKY_SHORE), and `tidal` 2 is a flat (BEACH or ATOLL touching the sea, and SALT_MARSH).
- **Rock pools:** at low tide, a water animal standing on a rock pool tile can only move to other rock pool tiles. It stays trapped until the tide comes in. `trappedSum` counts these animals, sampled every 8 low-tide ticks.
- **Shorebirds on the flats:** at low tide, birds on a flat get extra food (×0.5 of a normal meal), and flats score higher when birds choose a site. `flatMeals` counts these meals.
- **Coral bleaching:** runs every 4 ticks.
  - Sea temperature is tile temperature plus the season offset, plus 0.04 in a drought, minus 0.03 while storms are active.
  - Above 0.9, each reef tile's bleach value rises. Below it, the value recovers slowly (0.003 per check).
  - A reef tile at bleach 0.5 or more loses plant biomass and has its plant health capped each check.
  - When 10% or more of the reefs are bleached, the log says "Coral bleaching — warm seas whitened X% of the reefs". When it drops below 3%, the log says "The reefs are recovering their colour".
- **Island rule:**
  - Land components of 900 tiles or fewer count as islands (`isle`).
  - Land and amphibious animals on island tiles pay extra upkeep: `1 + 0.25·|size − 0.35|`.
  - Births on islands move the child's size gene toward 0.35 by 4% of the gap. So big animals dwarf and small ones grow.
- **Turtle nesting beaches:**
  - Water reptiles (the sea turtle) lay their eggs on the nearest beach tile within 5 tiles (`beachNear`). The eggs are land eggs.
  - At hatch, water-domain hatchlings on a beach are moved onto the adjacent sea tile (`seaward`).
  - The eggs are a food pulse for land egg-eaters on the beach.
- **Marine animals:** amphibious animals with a salt gene of 0.5 or more can drink on coastal tiles (within 2 tiles of the shore).
- **Diving birds:** birds with a depth gene of 0.5 or more reach water depth 0.85, take prey at any water level, and can take prey up to 1.6× the usual mass limit.
- **Walk bits:**
  - ROCKY_SHORE is both land and water.
  - SEA_CLIFF and ATOLL are land and perch, and SEA_CLIFF is also rugged.
  - SALT_MARSH is salt thirst and mire.
  - Shallow ROCKY_SHORE, LAGOON and KELP_COAST tiles also get the amphibious bit.
  - God-tool biome paints rebuild these bits the same way and rebuild the coast layer.

**Animals (archetypes 57–64)**

| Animal | Behaviour |
|---|---|
| Shore crab | Amphibious invertebrate, founded on coastal tiles, works rock pools and flats |
| Barnacle | Near-sessile filter-feeding water invertebrate (speed 0.03) |
| Puffin | Small diving bird (fisher niche), nests on cliffs |
| Gannet | Large plunge-diving bird (fisher niche) |
| Sea otter | Small amphibious marine mammal, kelp and rocky coast |
| Seal | Mid-size amphibious marine mammal |
| Sea lion | Large amphibious marine mammal |
| Mudskipper | Amphibious fish of mudflats and salt marsh |
| Sea turtle (rework of archetype 22) | Grazes at sea and nests on beaches |

- Categories are assigned from genes in `animalCategory`:
  - Diving birds are split into puffin and gannet by size.
  - Amphibious invertebrates are shore crabs.
  - Slow water-invertebrate herbivores are barnacles.
  - Amphibious fish are mudskippers.
  - Salt-adapted amphibious mammals are split into sea otter, seal and sea lion by size.
  - Water-mammal carnivores are now labelled "Marine predator" (`orca`).
- No new genes and no new per-animal state.

## Gates (final run; defaults to gen 7; 3000 ticks)

| | seed 42 | seed 7 | seed 123 |
|---|---|---|---|
| All 6 classes alive at the end | yes | yes | yes |
| All 5 bird niches alive at the end | yes | yes | yes |
| Freshwater fish min–max (end) | 62–469 (101) | 19–354 (193) | 42–461 (200) |
| Fisher birds min–max (end) | 9–82 (9) | 7–92 (36) | 11–88 (42) |
| Coral reef tiles | 1124 | 2016 | 1968 |
| Reef tiles bleached at the end | 125 (11%) | 111 (6%) | 179 (9%) |
| Bleaching events logged | 1 | 1 | 0 |
| Animals trapped in rock pools (sum of samples) | 1083 | 775 | 178 |
| Shorebird meals on the flats | 1386 | 1547 | 2642 |
| Turtle nests / hatchlings run to sea | 13 / 38 | 5 / 13 | 57 / 141 |
| Island tiles / island births with size drift | 328 / 16 | 491 / 40 | 24 / 0 |

**New archetypes: min–max over the run, then the count at the end**

| | seed 42 | seed 7 | seed 123 | Seeds alive at end |
|---|---|---|---|---|
| shorecrab | 0–84, 5 | 0–78, 7 | 0–52, 10 | 3 |
| barnacle | 34–767, 344 | 0–110, 31 | 0–114, 1 | 3 |
| puffin | 0–29, 3 | 0–30, 1 | 0–47, 4 | 3 |
| gannet | 0–25, 2 | 0–28, 20 | 1–32, 13 | 3 |
| seaotter | 0–64, 30 | 0–36, 1 | 0–45, 6 | 3 |
| seal | 0–17, 2 | 0–20, 2 | 0–16, 9 | 3 |
| sealion | 0–21, 6 | 0–27, 2 | 0–16, 4 | 3 |
| mudskipper | 0–87, 6 | 0–74, 30 | 0–70, 49 | 3 |
| seaturtle | 5–68, 61 | 24–73, 73 | 21–191, 118 | 3 |

**Rescues: how often a migration reintroduced each category over 3000 ticks (seeds 42 / 7 / 123)**
- This counts every migration path: the generic class/role rescue, the marine rescue, the river rescue and the new coast rescue.

| Category | Rescues (42 / 7 / 123) |
|---|---|
| shorecrab | 3 / 3 / 4 |
| barnacle | 0 / 4 / 2 |
| puffin | 3 / 4 / 4 |
| gannet | 3 / 3 / 1 |
| seaotter | 5 / 5 / 8 |
| seal | 4 / 3 / 4 |
| sealion | 7 / 6 / 3 |
| mudskipper | 4 / 4 / 5 |
| seaturtle | 0 / 0 / 0 |

**The coast rescue**
- Archetypes 57–64 (`COAST_ARCH`) are added to the 240-tick check that already covers the marine and river archetypes.
- A missing category is reintroduced on a coastal tile with the message "… returned to the coast".
- It fired 17 / 18 / 15 times per 3000 ticks (seeds 42 / 7 / 123). That is about once every 170–200 ticks, spread over the 8 categories.
- Self-sustaining without rescue:
  - The sea turtle on all seeds. It never dropped below 5.
  - Barnacles on seed 42.
- Still rescue-dependent: shore crab, puffin, gannet, sea otter, seal, sea lion and mudskipper. Each collapses and comes back every few hundred ticks. Most end the run with a living population that has recovered.

**GPU mirroring**
- No WebGPU kernel change was needed.
- Bleaching edits `P.biomass` and `P.health` on the CPU. The plant GPU path diff-patches CPU edits to biomass, health and cap into the device buffers, as it does for disasters.
- The new biome plant tables are static tables that are already uploaded per biome.
- The renderer reads the biome grid, which is already in the snapshot, so no new grids were added to SNAP_GRIDS or SNAP_STATIC.

**Saves**
- SAVE_VERSION stays 2.
- `CoastLayer` is registered in the save. These fields are DERIVED and rebuilt on load: `tidal`, `isle`, `shore`, `coastal`, `seaward`, `beachNear` and `reefs`.
- These fields are persisted: tide state, the bleach array and the counters.
- If an old save has no coast layer, the upgrade creates a fresh one and links it to the animals. Bleaching starts at zero.

**Speed (solo, base 2c8ebf2)**

| Seed | Base | New | Change | µs per animal (base → new) |
|---|---|---|---|---|
| 42 | 23.51 ms | 22.82 ms | −3% | 11.5 → 13.4 |
| 7 | 21.29 ms | 19.20 ms | −10% | 12.7 → 13.5 |
| 123 | 22.02 ms | 21.40 ms | −3% | 12.4 → 12.0 |

- Within the 5% target on every seed.
- Cost per animal is slightly higher because of the island-size flood fill on build, the tide trap check and diver reach. The living population is a little smaller, which more than offsets it.

**Reproducibility**
- World hashes for gens 2–6 match base: 20 of 20.
- Secret seeds: secret rolls match base. Gen 7 marks 55 founders and logs 2 secret messages.
- Save at tick 1500, load, step 500: identical. The world is also identical straight after load.
- Dam replay is still identical 300 ticks after load.
- Old base saves load with identical worlds and run 600 ticks: gen 3 (seed 7), gen 4 (seed 42), gen 5 (seed 123) and gen 6 (seed 5).
- Two separate runs give the same hash.

**Browser** (port 8797, swiftshader):
- Loads gen 7 with seed 42, GPU, worker mode.
- Ran 167 ticks, then switched to fast (WebGPU) mode and kept advancing.
- Coast biomes are present: KELP_COAST 1486, SALT_MARSH 647, SEA_CLIFF 310, ROCKY_SHORE 124, LAGOON 102, ATOLL 7.
- No console errors.

## Known issues

- **Seven of the eight new coastal categories depend on the coast rescue** (about 5 rescues per category per 3000 ticks): shore crab, puffin, gannet, sea otter, seal, sea lion and mudskipper. They are alive at the end on all 3 seeds, but only the sea turtle persists on its own everywhere.
- **The island rule has only a small visible effect.** Islands are few and small, and no animals happened to be on island tiles at tick 3000 on any seed. The size drift fired 16 / 40 / 0 times. Seed 123 has only 24 island tiles.
- **Barnacle numbers swing a lot**: 767 at peak on seed 42, down to 1 at the end on seed 123.
- **ATOLL is rare.** It needs a warm landmass of 48 tiles or fewer, and seed 42 has only 7 tiles of it.
- **Bleaching triggers at most once per run** at the current thresholds (0.9 sea temperature). Seed 123 stays just under the 10% event line.
