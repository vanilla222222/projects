# Complexity Map

Scores: 1 = easy/simple, 3 = longer but easily expandable, 5 = complicated/needs a little thought, 7 = challenging to expand quickly, 10 = unique/needs creative thought. Initial sizing pass (skimmed, not deeply reviewed).

| File | Score | Notes |
| --- | --- | --- |
| `index.html` | 2 | Static markup: canvas, panels, ordered script tags. |
| `css/style.css` | 3 | Long but flat styling; no logic. |
| `js/noise.js` | 2 | SeededRandom and PerlinNoise classes, standard algorithms. |
| `js/biomes.js` | 3 | Biome constants, info tables, derived lookup arrays and color table; data-driven. |
| `js/charts.js` | 3 | Canvas 2D sparkline, population and species chart helpers. |
| `js/icons.js` | 3 | Icon part tables plus SVG and premultiplied texture-atlas builders. |
| `js/mapGenerator.js` | 6.5 | WorldMap: noise terrain, edge falloff, altitude curve, climate and biome derivation; priority-flood hydrology (depression lakes, flow-accumulation rivers with meander, bank shaping). Layers interact. |
| `js/render.js` | 7 | WebGL2 terrain and instanced-sprite shaders, textures, camera; GL state and shader coupling need care. Data views are table-driven (`RAMPS`, `LIVE_MODES`); sprite layers (plants, bug swarm particles, animals) are separate `_push*` passes. Disease adds a live view, blight and infection tints through reused scratch buffers, and per-animal virus markers and strain rings. |
| `js/main.js` | 5.5 | App glue: UI wiring, panels, `app` state, frame loop; wide but mostly orchestration. Species groups (plant, animal, bug, pathogen) are routed by `group` checks and `TAB_GROUP` spread over tab, detail, tooltip and click code; pathogens add a hosts section and cross-links to host species. |
| `js/sim/core.js` | 5 | FastRng, fitness, mutation and distance helpers; small but underpins all evolution. |
| `js/sim/soil.js` | 4.5 | SoilLayer: per-tile nutrient store, separable 3x3 demand pooling, satisfaction, a litter pool that decays into nutrients, litter consumption by detritivores, and carcass deposits. Small, but tightly coupled to plant and fungus balance. |
| `js/sim/plants.js` | 8 | Plant genes (15, including pest defence and blight resistance), archetypes, speciation, dispersal and logistic growth over two slot planes (canopy/understory), with light, health and soil coupling. Also fruit stocks and seasons, flowers and the bloom spread bonus, and decomposer and mycorrhizal fungi with litter-limited K. Pest damage to health and biomass, and bug pollination feeding fruit and bloom spread. Blight slot arrays (`blight`, `blightT`, `blightImm`) and blight deaths in the health branch. Shared plantSeed competition and a typed-array layout, plus ecology tuning. |
| `js/sim/animals.js` | 8.5 | Animal genome, spatial grid, diet, predation, energy, reproduction and speciation. Also fruit eating and seed carriage, three toxin types (mild, confusion, lethal), and species-level aversion learning with hue mimicry. Small omnivores eat bugs (carnivores excluded), and parasites drain energy with host-size matching. Disease resistance gene and per-animal infection fields: sickness cost, slowdown and death, recovery with immunity, own-cell contact spread, predation, carcass and vector exposure, and inherited innate immunity. The most interdependent logic. |
| `js/sim/bugs.js` | 6 | BugLayer: four density planes (pests, detritivores, parasites, pollinators) with per-cell genomes, cached fit/rate, logistic growth, spread with masked mutation and speciation, locust swarms, pollinator collapse detection and reintroduction. Couples plants, soil and animals; perf-sensitive inlined loops. |
| `js/sim/disease.js` | 6 | DiseaseLayer: pathogen strains as registry species (population = infected hosts), strain genes with a virulence/transmission trade-off, host-range compatibility and host jumps, strain mutation and speciation, per-tile carcass and vector exposure planes, plant blight list with neighbour spread and monoculture boost, emergence, die-off detection and a clear-all toggle. Registry bookkeeping must stay exactly in sync with the host arrays. |
| `js/sim/ecosystem.js` | 6 | Ties plants, bugs, animals and disease together with stat groups, bug and disease stats, migrations (including bug reintroduction and disease emergence), the disease toggle and history sampling. |
