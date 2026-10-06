# Slice 4.3 audit: rivers and wetlands

## What was built

**World gen 6 (the default)**
- New biomes: RAPIDS, OXBOW, REED_MARSH and BEAVER_POND. Beaver ponds only appear at runtime.
- River, lake, pond, swamp, bog, wetland and floodplain were reworked in the gen 6 pass.
- Gens 2–5 are untouched.

**Flow: the RiverLayer (`js/sim/rivers.js`)**
- Each river tile gets a downstream and upstream neighbour (`dn`/`up`) and a flow vector, all taken from the heightmap.
- Every 4 ticks, nutrients, litter and carrion drift downstream. Strong flow washes plant biomass into litter.
- Eggs and aquatic larvae drift downstream.
- Moving upstream costs more.
- Floodplains get a nutrient pulse each spring. It reuses the flood radius code.
- Lakes turn over in spring and autumn, mixing their depth levels.
- Summer duckweed and algae blooms consume nutrients.
- The layer is DERIVED in the save, so it is rebuilt on load.

**Plants**
- New willow archetype (riverside tree).
- floatmat is relabelled Duckweed.
- Reeds, lilies and pondweed come from the existing water plant archetypes and labels.
- No GPU kernel change was needed: river drift and filtering edit the soil arrays on the CPU, like disasters do.

**Beaver dams**
- A mature beaver on a flowing tile can dam a river. Limits: 8 dams per world, at least 160 ticks apart.
- The dam is applied as a god edit (`brush: 'dam'` via `GodTools.paintWorld` and `edits.push`). Saves replay it.
- The dam turns up to 6 river tiles upstream into BEAVER_POND, raises the water table and fells nearby trees.

**Animals (archetypes 46–56)**

| Animal | Behaviour |
|---|---|
| Salmon | Upstream run when mature and fed; carcass feeds the river |
| Catfish | Freshwater scavenger fish |
| Pike | Freshwater predatory fish |
| Otter | River predator (water and land) |
| Beaver | Builds dams (water and land) |
| Heron | Fisher bird niche |
| Kingfisher | Fisher bird niche |
| Crocodile | Bank ambush predator |
| Dragonfly | Aquatic larva, adult flyer |
| Mayfly | Aquatic larva, adult flyer |
| Freshwater mussel | Filters litter and plankton (plankton is taken from water nutrients) |

- No new genes. Per-animal state is unchanged, so old saves load as they are. SAVE_VERSION is still 2.

**Freshwater fish energetics**
These changes are what make freshwater fish persist:
- Fresh tiles no longer skip the understory.
- Fish forage along the river chain.
- No cold upkeep for fish on fresh tiles.
- 30% lower upkeep on fresh tiles, 45% lower for juveniles.
- ×1.6 food from grazing and predation on fresh tiles.
- Fish predators on fresh tiles get the ambush floor.

## Gates (final run; defaults to gen 6; 3000 ticks)

| | seed 42 | seed 7 | seed 123 |
|---|---|---|---|
| Freshwater fish min–max (end) | 86–423 (88) | 51–447 (177) | 18–455 (181) |
| Freshwater fish from founder lineages only, min | 50 | 45 | 13 |
| Fisher birds min–max (end) | 7–56 (11) | 10–52 (27) | 8–59 (56) |
| All 6 classes alive at the end | yes | yes | yes |
| All 5 bird niches alive at the end | yes | yes | yes |
| Dams built | 1 | 1 | 1 |

**Freshwater fish persist on all 3 seeds without the rescue.**
- The generic "waters were empty" rescue never fired.
- The founder-lineage count never reached 0. That count only includes fish whose lineage started with the founders, so it excludes everything a rescue brought in.

**New archetypes: min–max over the run, then the count at the end**

| | seed 42 | seed 7 | seed 123 | Seeds alive at end |
|---|---|---|---|---|
| salmon | 0–64, 0 | 9–131, 13 | 0–102, 0 | 1 (FAIL) |
| catfish | 0–88, 16 | 0–87, 17 | 0–110, 11 | 3 |
| pike | 0–91, 21 | 0–50, 11 | 0–48, 9 | 3 |
| otter | 0–30, 8 | 0–42, 6 | 0–40, 7 | 3 |
| beaver | 0–48, 20 | 1–56, 1 | 1–54, 32 | 3 |
| heron | 0–30, 1 | 0–33, 21 | 0–33, 2 | 3 |
| kingfisher | 0–20, 7 | 0–24, 5 | 0–27, 10 | 3 |
| crocodile | 0–65, 1 | 0–72, 12 | 0–68, 14 | 3 |
| dragonfly | 0–125, 18 | 0–87, 19 | 0–93, 4 | 3 |
| mayfly | 25–596, 458 | 0–58, 22 | 5–299, 232 | 3 |
| mussel | 144–780, 597 | 0–248, 116 | 96–757, 203 | 3 |

**Rescues: how often a migration reintroduced each category over 3000 ticks (seeds 42 / 7 / 123)**
- This counts every migration path: the generic class/role rescue, the marine rescue and the new river rescue.

| Category | Rescues (42 / 7 / 123) |
|---|---|
| pike | 3 / 4 / 5 |
| catfish | 1 / 4 / 1 |
| otter | 3 / 5 / 3 |
| beaver | 3 / 2 / 3 |
| heron | 5 / 8 / 7 |
| kingfisher | 5 / 5 / 5 |
| crocodile | 3 / 2 / 5 |
| dragonfly | 8 / 6 / 8 |
| mayfly | 0 / 1 / 0 |
| mussel | 0 / 2 / 0 |
| salmon | 0 / 0 / 0 |

**The river rescue**
- Pike, otter, beaver, heron, kingfisher, crocodile, dragonfly, mayfly and mussel are archetypes 48–56 (`RIVER_ARCH`). They are added to the periodic check that previously covered only marine archetypes. The check runs every 240 ticks.
- A missing category is reintroduced with the message "… came back up the river".
- Salmon and catfish are excluded, so the freshwater-fish result does not depend on the river rescue. Catfish can still come back through the generic scavenger-fish rescue.
- Self-sustaining without rescue: mayfly and mussel on most seeds, and salmon on seed 7.
- Still rescue-dependent: pike, otter, heron, kingfisher, crocodile and dragonfly each collapse and come back every few hundred ticks.

**Speed (solo, ticks 50–650, base ff0a1e0)**

| Seed | Base | New | Change | µs per animal (base → new) |
|---|---|---|---|---|
| 42 | 20.58 ms | 25.86 ms | +26% | 16.7 → 12.6 |
| 7 | 19.96 ms | 22.63 ms | +13% | 16.0 → 13.5 |
| 123 | 21.95 ms | 23.21 ms | +6% | 14.3 → 13.0 |

- The RiverLayer itself costs about 0.08 ms/tick.
- The whole increase comes from the larger living population: 11 more archetypes plus self-sustaining freshwater fish. Cost per animal is lower than base.
- This misses the 5% target.

**Reproducibility**
- World hashes for gens 2–5 match base: 16 of 16 (seeds 42, 7, 123 and 999).
- Secret seeds: secret rolls match base for seeds 1–300 at gens 4–5. Gen 6 with `secret: 'both'` marks 49 founders and logs 2 secret messages.
- Save at tick 1500, load, step 500: identical. The world is also identical straight after load.
- Forced dam on seed 7: the edit is stored, the world is identical after load, and the sim is identical 300 ticks later.
- Old base saves (gens 3, 4 and 5) load with identical worlds and run 300 ticks.
- Two separate runs give the same hash.

**Browser** (port 8796, swiftshader):
- Loads gen 6 with GPU, worker mode.
- Ran 191 ticks, then switched to fast (WebGPU) mode and kept advancing.
- No console errors.

## Known issues

- **Salmon** ends the run alive on only 1 of 3 seeds. It reaches about 100 at peak, then dies out late in the run. Adult runs work (16–172 runs per seed), but juvenile recruitment is too weak.
- **Speed** is 6–26% over base because the ecosystem carries more animals. It is not overhead from the river code.
- **Six new predators and flyers depend on the river rescue:** pike, otter, heron, kingfisher, crocodile and dragonfly. They are not yet self-sustaining.
- **Mussels drift into estuaries.** Their larvae drift downstream, so some populations end up in brackish water. They keep the "Freshwater mussel" category.
- **Mayfly and mussel numbers swing a lot**, up to about 600–780 at peak.
