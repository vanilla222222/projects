# Part 1 plan: design, UI polish, animal varieties, land scavengers

This plan comes from the roadmap at `feature-research/ecosystem-v2/roadmap.md`. It follows these decisions:
- The UI is polished in its current style, not redesigned.
- Crabs are the water scavengers, and this part adds a land scavenger.
- **"5 per group" means 5 new designs per group**, added on top of the existing ones.
- **No code comments anywhere.**

## A. Sim slice: land scavengers

Files: `js/sim/soil.js`, `js/sim/animals.js`, `js/sim/plants.js` (plant icon variants only), `js/sim/ecosystem.js`, `js/sim/bugs.js`, `js/sim/disease.js`.

1. **Carrion store (`soil.js`).**
   - New `carrion` Float32 `n` array.
   - `addCarcass(i, mass)` splits the carcass: `CARRION_SHARE` (0.6) of `mass` goes into `carrion`, and the rest follows the existing litter path.
   - `carrion` decays by `CARRION_DECAY` (0.02) per tick inside `step`, and the decayed amount goes to litter.
   - New `consumeCarrion(i, amount)`, which returns what was taken.
   - New total, `totalCarrion`.
2. **Scavenger gene (`animals.js`).**
   - `AG` goes from 10 to 11, with the new gene at index 10 as `G_SCAV`. All `AG`-strided code must be checked with grep.
   - `ANIMAL_WEIGHTS` gets a weight of 0.9 for the new gene.
   - `carrionEff = meatEff * (0.2 + 0.8*scav)`.
   - Hunting efficiency is multiplied by `(1 - 0.5*scav)`, so scavenging costs hunting skill.
3. **Foraging (`animals.js`).**
   - `_pickForage` adds `soil.carrion[j]*carrionEff*CARRION_LURE`.
   - After the bug-eating block, a tile-local eat block adds `consumeCarrion(tile, bite)*MEAT_ENERGY*carrionEff`. It runs only when energy is below 92% of max.
   - Eating carrion on a tile with infected carcass load calls the existing carcass exposure path.
4. **Archetypes.**
   - Existing archetypes get `scav = 0.1`, except the crab, which gets `scav = 0.65`.
   - A new land archetype, "carrion eater": size 0.38, speed 0.55, sense 0.78, diet 0.55, temp 0.55, tol 0.5, fec 0.55, toxR 0.6, armor 0.3, res 0.3, scav 0.8, with `n` 18.
   - Archetypes get an optional `role` tag, and the new archetype's tag is `'scavenger'`.
5. **Categories (`animals.js`).**
   - A land animal with `scav > 0.5` and diet of at least 0.33 is category `carrion`, labelled "Scavenger".
   - The water omnivore category `crab` is unchanged, but its label changes to "Sea scavenger".
6. **Icon variants (`animals.js`).** `ANIMAL_ICON_VARIANTS` is extended. Existing entries stay in their current positions so current species keep their looks.

   | Category | Variants |
   | --- | --- |
   | fox | fox, weasel, owl |
   | wolf | wolf, coyote, hawk |
   | bigcat | bigcat, tiger |
   | rabbit | rabbit, chicken, squirrel |
   | deer | deer, horse, goat, kangaroo |
   | bison | bison, cow, elephant, moose |
   | mouse | mouse, chicken, crow |
   | boar | boar, raccoon, badger, monkey |
   | bear | bear, ape |
   | crab | crab, lobster, hermitcrab, starfish |
   | carrion | vulture, hyena, jackal |
   | fish | fish, shrimp, eel, puffer, seahorse |
   | turtle | turtle, ray, manatee |
   | pike | pike, barracuda, squid, seal |
   | shark | shark, orca, swordfish |

7. **Bug icon variants (`bugs.js`).** New `BUG_ICON_VARIANTS` and a `bugIcon(category, id)` function, applied wherever bug species get `icon`.

   | Category | Variants |
   | --- | --- |
   | aphid | aphid, caterpillar |
   | beetle | beetle, ant |
   | worm | worm, snail |
   | tick | tick, mosquito |
   | bee | bee, moth |

7b. **Plant icon variants (`plants.js`, requested mid-plan).**
   - New `PLANT_ICON_VARIANTS` and a `plantIcon(category, id)` function. They set `sp.icon` everywhere `sp.category` is set for plants, and `sp.category` and the labels stay unchanged.
   - Every plant kind gets 2 new designs, and the existing icon stays as the first variant.

   | Category | Variants |
   | --- | --- |
   | grass | grass, tallgrass, wheat |
   | reed | reed, cattail, bamboo |
   | moss | moss, lichen, clover |
   | shrub | shrub, hedge, heather |
   | cactus | cactus, pricklypear, agave |
   | tree | tree, oak, birch |
   | conifer | conifer, pine, cypress |
   | palm | palm, coconut, fanpalm |
   | algae | algae, sealettuce, redalgae |
   | kelp | kelp, seagrass, bladderkelp |
   | plankton | plankton, diatom, radiolarian |
   | fruittree | fruittree, appletree, cherrytree |
   | berrybush | berrybush, blueberry, raspberry |
   | flower | flower, tulip, sunflower |
   | puffball | puffball, earthstar, coralfungus |
   | inkcap | inkcap, morel, chanterelle |
   | toadstool | toadstool, bracket, porcini |
   | truffle | truffle, stinkhorn, jellyfungus |

8. **Strain icons (`disease.js`).**
   - Animal strains get `icon` from `[virus, bacterium, protozoan, prion, helminth]`, indexed by `id % 5`.
   - Plant blights get `icon` from `[blight, mold]`.
9. **Seventh trophic group (`ecosystem.js`).**
   - `STAT_GROUPS` gets `landScav` (label "Scavengers", icon `vulture`).
   - The `waterOmni` label becomes "Sea scavengers".
   - `_computeStats` counts a land animal with scav above 0.5 and diet of at least 0.33 as `landScav` before the diet split, so it isn't counted twice.
   - New migration rules, using a role-tag `pick`:
     - `landScav` is reintroduced when it is 0 and `landHerb + landCarn > 150`.
     - **(+)** `waterOmni` is reintroduced when it is 0 and `waterHerb > 150`. No rule revives it today.
10. **Stat:** `carrion`, the map total of carrion, is exposed in the stats.

## B. Icon slice (`js/icons.js` only)

- **36 new plant icons,** one for each name in the 7b table. Each design must be visibly distinct from its siblings at 12–16px.
- **44 new icons** in the existing `[role, path, stroke?]` format, drawn in the 32×32 space with a style matching the current icons (body, dark and light layers):
  - **Land:** weasel, owl, coyote, hawk, tiger, squirrel, goat, kangaroo, elephant, moose, crow, raccoon, badger, monkey, ape, vulture, hyena, jackal.
  - **Water:** hermitcrab, starfish, eel, puffer, seahorse, ray, manatee, barracuda, squid, seal, orca, swordfish.
  - **Bugs:** caterpillar, ant, snail, mosquito, moth.
  - **Pathogens:** bacterium, protozoan, prion, helminth, mold.
  - **UI:** `events` (a list glyph for the Events tab), `shadow` (a soft dark ellipse with a fixed color), `sun`, `moon` and `auto` (for the theme toggle).
- The atlas moves to 12 columns so about 133 icons fit, giving 768×768 at 64px cells. New icons are appended to the end of the table so existing indices stay put.

## C. UI and render slice (after A and B are done)

Files: `index.html`, `css/style.css`, `js/main.js`, `js/render.js`.

1. **Tabs.**
   - Every tab shows its icon and count. The text label shows only on the active tab, and inactive tabs keep the label as a `title`.
   - The Events tab gets the `events` icon.
   - Result: no overflow with 3- or 4-digit counts, down to the 980px layout.
2. **Collapsible left cards.** Clicking a card head (Ecosystem, Populations or Map) collapses its body, with a chevron indicator. The state is remembered in `localStorage`, wrapped in try/catch.
3. **Species rows.**
   - Rows get a larger icon, name, role and category chips, and population.
   - A small inline SVG sparkline is added, built from `sp.history` downsampled to 24 points as a string. No canvases are used, because rows are rebuilt every 250ms.
4. **Themes.**
   - A light theme is added: tokens are redefined under `prefers-color-scheme: light` and under `:root[data-theme]`.
   - A three-state toggle in the topbar cycles auto, light and dark, stored in `localStorage` with try/catch.
   - Hard-coded colors in the rules this pass touches become tokens.
   - New spacing and radius tokens (`--sp-1..4`, `--r-sm`, `--r-lg`) are applied to cards, tabs, rows, stats and detail.
   - The map canvas stays unthemed.
5. **Stat cards** get a Scavengers card for the new group, picked up automatically from `STAT_GROUPS`, and `GROUP_COLORS.landScav`.
6. **Terrain shader (`render.js`).**
   - Water is shaded by depth using `info.b`: deeper water is darker, with a light shoreline band in the shallowest water.
   - The water shimmer gets a second octave.
   - Biome edges are softened by a small noise domain-warp of the terrain lookup at zoom 4 and above.
   - The hillshade is strengthened slightly.
7. **Animal shadows.** At zoom 6 and above, a `shadow` sprite is drawn under each animal.
8. **Bug clouds.**
   - A new W×H RGBA texture holds, per tile, the color of the densest bug niche's species, with alpha set by total density. It is updated about every 300ms and sampled in `TERRAIN_FS` with time-driven noise and smoothstep for a soft, drifting cloud.
   - Clouds fade out from zoom 9 to 14, and dots fade in over the same range.
   - `BUG_PER_DENSITY` is reduced, to at most 2 dots per niche per tile.
   - A new "Bug swarms" switch, on by default, sits in the Map card.
9. `CODE_REFERENCE.md` and `complexities.md` are updated in slices A, B and C for everything above:
   - Soil, Animals, Bugs, Disease, Ecosystem, Icons, Renderer and App sections.
   - `render.js` rises to 7.5 and `main.js` to 6.

## Tests and gates

- `run5.js` on seeds 42, 7 and 123 for 3000 ticks, each needing:
  - ms/tick within 25% of the Part 4 numbers (17.8, 16.6, 19.2);
  - all 7 animal groups alive, including `landScav`, and all 4 bug niches alive;
  - plant cover within 5% of Part 4.
- The run also reports carrion total, scavenger count and scavenger energy share.
- Headless browser run on seed 42 with no console errors. It checks:
  - the theme toggle;
  - card collapse;
  - tabs at 3-digit counts, confirming no overflow;
  - the bug cloud;
  - an FPS readout compared against the current build.

## Screenshots (`feature-research/ecosystem-v2/part1/screenshots/`)

1. `overview.png`: the full app, dark theme, seed 42 around year 5, at a mid zoom showing the water shading and bug clouds, with 3-digit tab counts.
2. `designs.png`: a scratch gallery page rendering all new animal, bug and pathogen icons in species colors, grouped by group.
3. `plant-designs.png`: the same kind of gallery for the 36 new plant icons, next to their base icons.

## Out of scope

- Any other tuning of disease or bugs (Part 2).
- Amphibians and reptiles (Part 3).
- Diffing or caching in the species list, beyond the string sparkline.
- New code comments.
