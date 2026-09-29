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
| `js/mapGenerator.js` | 6 | WorldMap: noise terrain, edge falloff, altitude curve, climate and biome derivation; layers interact. |
| `js/render.js` | 7 | WebGL2 terrain and instanced-sprite shaders, textures, camera; GL state and shader coupling need care. |
| `js/main.js` | 5 | App glue: UI wiring, panels, `app` state, frame loop; wide but mostly orchestration. |
| `js/sim/core.js` | 5 | FastRng, fitness, mutation and distance helpers; small but underpins all evolution. |
| `js/sim/plants.js` | 7 | Plant genes, archetypes, speciation, dispersal and logistic growth; typed-array layout plus ecology tuning. |
| `js/sim/animals.js` | 8 | Animal genome, spatial grid, diet, predation, energy, reproduction, speciation; most interdependent logic. |
| `js/sim/ecosystem.js` | 6 | Ties plants and animals together with stat groups, migrations and history sampling. |
