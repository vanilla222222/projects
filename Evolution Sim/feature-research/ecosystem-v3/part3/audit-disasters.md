# Audit: Part 3.2, disasters

Commits: `a45c96f` (sim layer), `5605569` (palette UI), `64323d4` (impact flash), `f5c8fe6` (meteor log wording).

## What shipped

- **Palette** (`index.html`, `css/style.css`, `js/main.js`):
  - a new "Disasters" group under the 3.1 tools, with six buttons: Wildfire, Flood, Drought, Meteor, Disease and Locusts
  - a click fires one action, centred on the cursor. Brush size sets the radius, clamped per tool to a minimum (meteor 2, disease 3, otherwise 0 or 1) and a maximum of 12.
  - there is no confirmation step. A 900 ms wall-clock cooldown dims the buttons (`.cooling`) and drops clicks in that window. The cooldown is UI-only and never reaches the sim.
  - the hint line reports each result, for example "Wildfire set: 139 tiles alight.", "Impact! 19 animals killed." or "Outbreak seeded in 60 hosts.". When a system is off it says so: weather off means no drought, and disease or bugs off are reported too.
  - the Disease tool has class chips: Species, the six animal classes, and Plants. Species reuses the 3.1 species picker, with fungi and other kind plants left out.
- **Sim** (`js/sim/god.js`, `disasters.js`, `weather.js`). Every action goes through `Ecosystem.applyGod`, runs between ticks and uses only sim RNGs.
  - **Wildfire:**
    - ignites every non-water tile in the brush with fuel ≥ 0.05, using `Dz._ignite`
    - the normal slice 11 spread, burn-out log, scars and succession then run as usual
  - **Flood:**
    - `Disasters.godFlood` appends land tiles to the flood list, up to FLOOD_MAX
    - this uses `_floodTile`, which was extracted from `_startFlood` with the same RNG order, so animals flee and the flood recedes on its normal lifecycle
  - **Drought:**
    - `Weather.godDrought` starts the global drought without the natural log line, or extends it by 240 + 20·r ticks
    - it also multiplies wetness in the brush by 0.15
    - the normal "The drought has broken" end applies
  - **Meteor:**
    - kills every animal within the blast radius R. On every blast tile it clears both plant slots, the seed bank, bugs and eggs, and burns litter to ash nutrient.
    - it records a `crater` edit (radius ≈ R/2) in `god.edits`. `GodTools.crater` reuses the biome-paint per-tile code (`setBiome`, extracted unchanged).
    - the crater gets an altitude bowl and a raised volcanic rim, then the 3.1 refresh rebuilds depth, salinity, walkability, zones, soil, weather fields, bug fit and caps
    - the crater floor is OCEAN if the rim touches the sea, LAKE if the crater is big enough (radius 4 or more) or already wet, and otherwise VOLCANIC rock
    - land blast tiles become scars, so slice 11 succession recolonises them
    - when disasters are on, a fire ring is lit just outside the blast
  - **Disease:**
    - the target is a living species, or a class (0–5, or 6 for plants)
    - for a class, the host is the species with the most healthy individuals in the brush. Ties go to the lowest id.
    - a fresh `emerged` strain is built the way natural emergence builds one, using `D.rng`
    - it infects up to 40 animals or 60 plant slots of the host, then the existing disease system spreads it
  - **Locusts:**
    - uses the most populous living pest-niche "locust" species, or founds one from the locust archetype with swarm ≥ 0.75
    - sets pest density to full on every land tile in the brush, cuts canopy and understory biomass by 70% and removes fruit
    - the bug carrying-capacity decline then makes the swarm subside
  - each action logs one `god` event. Examples: "A meteor struck the Hills in the northwest, leaving a crater lake, killing 19 animals and setting the edge alight", "You infected 19 Noctaceros with Varravibrio", "You loosed a plague of Umbriceros locusts over 168 tiles".
  - per-tool counters (`fires`, `floods`, `droughts`, `meteors`, `meteorKills`, `plagues`, `locusts`) are created lazily on `GodTools`. This keeps 3.1 saves and untouched worlds hash-identical.
- **Renderer** (`js/render.js`):
  - `WorldRenderer.impact(x, y, r)` queues a 1.2 s flash disc and an expanding shockwave ring, drawn with a small additive quad program after weather
  - the client calls it when a meteor result comes back
- **Saves:**
  - craters replay from `header.god` through `GodTools.paintWorld` like biome edits. All other disaster state (fire, flood and scar grids, the drought, strains, the locust species) is already in the serialized graph.
  - no new classes, no new snapshot grids and no plant or soil step changes, so nothing was needed in `js/gpu/`
  - SAVE_VERSION is still 2

## Gates

Two batched runs were used. Results are from the scratchpad harness with 320×210 worlds.

| Gate | Result |
|---|---|
| World hashes, seeds 42/7/123 × gen 2/3/4, no tools | all 9 identical to base d932862 |
| State hash after 500 ticks, seeds 42/7/123, no tools | identical to base (`edb5330b…`, `6abecf24…`, `d4cef852…`), `eco.god` never created |
| ms/tick over 500 ticks, base → new | 42: 26.54 → 26.53 · 7: 24.81 → 24.64 · 123: 25.85 → 25.11, within noise |
| Same disaster batch at tick 200, two runs (seeds 42, 7, 123) | identical results, and equal state hashes 25 ticks later |
| Save 25 ticks into the disasters (fire still burning, flood and drought active), load, step 500 vs uninterrupted run | state and world hashes equal at load and after 500 ticks, all 3 seeds |
| Array consistency after craters | `plants.water` matches `WATER_BIOME_SET`, and no animal is on a tile it can't use (right after, and 1500 ticks later) |
| Lifecycle and recovery, 1500 ticks after the batch | god fire burned out within 25–275 ticks, flood tiles 0 by tick 475, drought broken by tick 725, locust-area pest density 86–196 → 3–7 within 25 ticks. Plant biomass in the stripped area recovered from 13–30 to 80–119, above its pre-swarm level. Meteor blast biomass went from 0 to 97–149 on seeds 42 and 7, and to 35 on seed 123, where much of the area is now crater lake. |
| Craters | radius 4 on land gave VOLCANIC (42, 123) or LAKE (7, next to water). Radius 10 on the coast gave OCEAN. Radius 12 inland gave LAKE. A corner click at radius 0 was clamped to 2. All are recorded as `crater` edits. |
| Disease | class-targeted outbreaks hit 6–21 animals, plant-class and species blights hit 60 slots, and strains spread through the normal system |
| Base save (gen 4, base code) loads | yes, and steps 300 more ticks |
| 3.1 save with 41 paint and spawn edits (base code) loads, takes the full disaster batch, steps 300 | yes, arrays consistent, all actions ok |
| Browser smoke, worker and WebGPU mode on, port 8796 | Disasters group shows 6 tools; wildfire 139 tiles; flood 187; drought 172; meteor on Hills makes a crater lake, kills 19 and triggers the flash; a second click 0 ms later is dropped by the cooldown; locusts 168 tiles; disease by species (6 hosts), by Plants (60) and by Mammals (19); 8 god log lines; worker save and load ok; **no console errors** |

`node --check` passes on all 24 js files. There is no `Math.random` in `js/sim`.

## Open issues

- **Locust swarms subside very fast.** Density falls about 95% within 25 ticks, because the full-density burst is far above K and the existing decline rule culls it. The plant damage is done at the moment of the strike, so the effect still reads as a plague. A slower fade would need a bug-step change, plus the GPU mirror if bugs ever move there.
- **God-seeded plant blights can become epidemics.** On seeds 42 and 7, blight slots reached 1729 and 851 about 1500 ticks after the batch. That is the natural strain spreading through a dominant host, so it is working as designed, but a strong host-wide blight can follow a single click.
- **Drought is world-wide.** The brush only adds local extra drying. The drought itself is the existing global state, so calling one anywhere also starts or extends the global drought.
- **Meteor kills ignore domains.** Fish under a coastal strike die along with land animals. This is intended, but the hint does not say which classes were lost.
- The cooldown uses the wall clock and runs in the client. Scripted `applyGod` calls (tests or the worker) have only the radius cap.
