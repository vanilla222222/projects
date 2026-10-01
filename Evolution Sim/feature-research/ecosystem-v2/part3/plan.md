# Part 3 plan: water, weather, amphibians, reptiles, territory and herds

This plan covers roadmap Part 3, plus two items carried over from Part 2: resistance that actually evolves, and scavengers that find carcasses.

Ground rules:
- No code comments anywhere.
- New sim stats are exposed on `stats` only. Their UI (weather widget, thirst view, trait rows, event filter) is Part 4.
- Part 3 ships only three visible pieces: the Territory map view, a live Moisture view, and stat cards for the new groups.

## What the scouts found (it shapes the design)

- **The map is fully static.** `humidity`, `temperature`, `isLake`, `isRiver`, `isPond` and `isOcean` never change at runtime. There is no distance-to-water field, and seasons are a single scalar (`plants.season`) that only scales plant growth.
- **Plants cache their capacity per slot** (`cap[p]`). A live moisture effect therefore has to go into the growth rate at plants.js ~629, not into `moistAt`.
- **Animal domain is a per-species 0/1 value, not a gene.**
  - `walk` is a per-tile bitmask: 1 means land, 2 means water, 3 means river or pond.
  - `_nearest` and `_contact` only match animals in the same domain.
- **Nothing like home, herd or territory exists yet.**
  - `_localCount` (same species in the animal's own grid cell) is the only group lookup.
  - `_attack` (animals.js ~716) is the cheap place to add a group-defence term.
- **New stat groups appear automatically** once four things exist: a `STAT_GROUPS` entry, classification in `_computeStats`, a `GROUP_COLORS` entry, and an icon. The only hard-coded land/water assumptions are the card tooltip and the key prefix.
- **Map views are hard-coded buttons** in index.html. A categorical view (territory) doesn't fit the scalar ramp lookup, so it needs its own RGB branch in `setMode`.
- **Icons:** only `turtle` exists among the new animal designs. Ten new icons are needed.

## Slice 1: water and weather (new `js/sim/weather.js`, plus `plants.js` and `ecosystem.js`)

1. **Fresh-water distance.** `WeatherLayer` builds a `Uint8Array waterDist` with a multi-source 4-neighbour BFS, capped at 40.
   - It is seeded from `isLake | isRiver | isPond`. Ocean doesn't count, because it is salt water.
   - It is rebuilt only when a drought starts or ends.
   - It also keeps `fresh` (`Uint8Array`, 1 where a tile is currently drinkable).
2. **Per-tile runtime moisture.**
   - `wet` (Float32, 0..1) and `snow` (Float32, 0..1).
   - Every 4 ticks, `wet` evaporates at `EVAP * (0.5 + temperature) * (drought ? 2 : 1)`.
   - Snow melts into `wet` when the effective temperature is above `SNOW_T`.
   - A **pool** is a land tile with `wet > POOL_WET` (0.7). Pools are drinkable, and `fresh` is set on them.
3. **Moving weather systems.** Up to `MAX_STORMS` (8) blobs, each `{x, y, vx, vy, r, rain, life}`.
   - **Spawning.** A storm spawns with a chance per 4 ticks that rises in the wet season: `season < 0`, which is the second half of `sin`. The spawn point is biased toward high-humidity tiles.
   - **Movement.** Storms drift with a slowly rotating prevailing wind vector.
   - **Rain.** Each storm adds `rain` to `wet` over a noisy disc of radius 6–18.
   - **Snow.** The effective temperature is `world.temperature + SEASON_T*season`, with `SEASON_T` 0.08. Where it is below `SNOW_T` (0.28), the storm adds `snow` instead of rain.
4. **Droughts.** Once a year, there is a `DROUGHT_P` (0.2) chance of a drought lasting 240–720 ticks.
   - Storm spawns are cut by 80% and evaporation is doubled.
   - River and pond tiles with `riverFlow < DRY_FLOW` stop being `fresh`, and `waterDist` is rebuilt.
   - The start and end are logged as `log.push(tick, 'weather', ...)`.
   - At most one drought runs at a time, and droughts are at least 1 year apart.
5. **Plants feel the weather.**
   - `WeatherLayer` exposes a `moistMul` Float32 per land tile: `0.8 + 0.4*wet`, times 0.8 during a drought when `wet < 0.1`.
   - It is multiplied into the growth rate `r` at plants.js ~629, and water tiles stay at 1.
   - The target is a mean multiplier of about 1.0 in a normal year, so baseline cover holds.
6. **Ecosystem wiring.**
   - `options.weather` defaults to true. When it is off, `wet` is frozen, `moistMul` is 1, and there are no storms or droughts.
   - `weather.step(tick)` runs after `plants.step`.
   - `index.html` gets the `js/sim/weather.js` script tag. The headless runners must load it too.
   - Seasons off means `season = 0`.
7. **Stats:** `stats.weather = {storms, rainTiles, snowTiles, drought, droughts}`, plus `stats.meanWet`.

## Slice 2: animals (`animals.js`, `ecosystem.js`, `disease.js`)

### 2a. Genome: `AG` 11 → 15
- New genes:
  - `G_TERR` 11: territoriality.
  - `G_HERD` 12: herding.
  - `G_COLD` 13: cold-blooded.
  - `G_DRY` 14: drought and heat tolerance.
- `ANIMAL_WEIGHTS` get 0.6, 0.6, 1.2 and 0.6.
- Every `AG`-strided site the scout listed must be updated. The check is a grep for `AG` and every literal `11`.
- Existing archetypes get `terr` 0.05 for herbivores, 0.35 for omnivores and 0.5 for carnivores.
- Herd is 0.6 for grazers and deer/bison-like animals, 0.5 for fish, and 0.1 otherwise.
- `cold` 0.05, `dry` 0.3.

### 2b. Thirst (land and amphibious animals; water animals skip it)
- **Water meter.** New per-animal Float32 `water`, from 0 to 1, starting at 1.
- **Loss per tick:** `THIRST * (1 - 0.6*dry) * (0.6 + temperature + 0.4*drought) * (cold ? 0.6 : 1)`, with `THIRST` about 0.004. That is roughly 250 ticks from full to empty on an average tile.
- **Drinking.** Standing on or next to a `fresh` tile (checked with `waterDist <= 1`), or on a tile with `wet > 0.35`, refills water to 1.
  - Fruit gives +0.15, grazing +0.02 per bite, carrion and prey +0.2.
- **Seeking water.** When `water < 0.35`, the animal steps down the `waterDist` gradient (it picks the lowest of the 4 neighbours; cheap) instead of foraging. Flee and hunt still come first.
- **Dehydration.**
  - When `water = 0`, the energy cost is multiplied by 2.5.
  - There is also a `DEHYDRATE_DEATH` (0.004/tick) chance of death, recorded as `deaths.thirst`.
  - The target is 3–12% of land deaths.
- **Watering holes.**
  - In `_pickForage`, animals with `diet > 0.6` add `0.25/(1 + waterDist)` to each sample's score, so predators linger near water.
  - Thirsty herds converge on water naturally through the gradient step.

### 2c. Amphibians: new domain 2
- **Movement.** `walk` gets bit 4, meaning amphibious-standable.
  - It is set on land tiles with `waterDist <= AMPH_RANGE` (5) and on water tiles with `plants.depth < 0.35`.
  - `canStand` maps domain 2 to bit 4.
- **Interactions.** `_nearest`, `_contact` and the predator filters treat two domains as compatible when they are equal or either one is 2.
  - Land predators can therefore eat frogs, and pike can too.
- **Drying out.** Amphibians dry out 2x faster. They refill only at `waterDist <= 1` or `wet > 0.5`.
- **Breeding.** Reproduction is allowed only when the animal is at `waterDist <= 1` or on water.
- **Archetypes** (domain `'amph'`, `n` about 16 each):
  - frog: small omnivore, which eats bugs through the existing small-omnivore path;
  - newt: small herbivore;
  - salamander: small carnivore;
  - crocodile: large carnivore with `armor` 0.7 and `cold` 0.8.
- **Categories:**
  - herbivore: `newt`, with variants newt and axolotl;
  - omnivore: `frog`, with variants frog and toad;
  - carnivore: `salamander` (size < 0.55), with variants salamander and axolotl, or `crocodile`.
  - Labels are "Newt", "Frog", "Salamander" and "Crocodile".

### 2d. Reptiles: land animals with `cold > 0.5`
- **Cold-blooded body.**
  - Metabolism is multiplied by `(1 - 0.45*cold)`.
  - Speed is multiplied by `1 - 0.6*cold*max(0, 0.5 - effTemp)*2`, so reptiles slow sharply when effective temperature is below 0.5.
  - The climate penalty on hot tiles is reduced: when `temp > pT`, the fit uses `tol*(1 + dry)`.
- **Archetypes:**
  - lizard: small omnivore, `cold` 0.85, `dry` 0.8;
  - tortoise: herbivore, `armor` 0.9, slow;
  - monitor: medium carnivore;
  - snake: small carnivore with high sense.
  - They are spawned with a climate preference for hot, dry tiles, with `pT` at 0.75 or higher.
- **Categories:** `tortoise` (herbivore), `lizard` (omnivore), and `snake` (carnivore, size < 0.45) or `monitor`.

### 2e. Territory (`G_TERR`)
- **Claiming a home.** A mature animal with `terr > 0.5` claims a home: new Float32 fields `hx` and `hy`, set to the tile where it first settles.
  - The territory radius is `2 + 5*size`.
- **The territory map.** Every 10 ticks, each holder stamps its disc into a per-tile `terrSp` (Int32 species id) and `terrUid`, with `terrUntil = tick + 30`.
- **Staying home.** A holder's wander and forage targets are clamped inside its radius, unless it is thirsty or fleeing.
- **Chasing rivals.** In `_pickForage`, a sample tile owned (and not expired) by another holder of the same species or the same diet role scores ×0.3, so rivals are pushed out.
  - When a holder finds a same-role rival within `range*0.5` inside its disc, the rival is set to flee: state 4, ttl 3. This check runs on odd ticks, reusing `_nearest` mode 0 logic with a role test (a new mode 3).
- **Benefits:** bite ×1.15 and reproduction cost ×0.85 while inside its own disc.
- **Cost:** metabolism × `(1 + 0.08*terr)`.
- **Herbivores rarely hold territory.** They get only 40% of the benefit, scaled by `0.4 + 0.6*diet`. Archetype starting values reinforce this.

### 2f. Herds and shoals (`G_HERD`)
- **Cohesion.** For animals with `herd > 0.4` that are not fleeing, hunting or thirsty, the forage or wander target is pulled toward the centroid of same-species animals in their own grid cell.
  - The centroid is computed with the `_localCount` loop, which returns the count, `cx` and `cy`.
  - The pull is `lerp(target, centroid, 0.6*herd)`.
  - This applies to fish too, as shoals.
- **Safety in numbers.** In `_attack`, chance is multiplied by `1 - 0.5*herd[p]*min(1, n/6)`, where `n` is the `_localCount` of the prey.
- **Disease cost.** In `_contact`, `k` is multiplied by `(1 + 0.6*herd)`.
- **Herds exclude territory.** Herding is ignored when `terr > 0.5`.

### 2g. Part 2 carry-overs
- **Resistance.**
  - Sickness length becomes `itime = sDur * (1 - 0.6*res)`.
  - Recovered animals give birth to offspring whose `G_RES` gets a +0.02 nudge. **This is a design choice: resistance becomes partly Lamarckian so the trend is visible.** If you prefer pure selection, only the shorter-sickness change stays.
- **Carcass search.**
  - A coarse `carrionCell` Float32 array holds the sum per `GRID` cell, rebuilt every 10 ticks in `soil.step`.
  - Scavenger seek picks the best cell within `range*1.5`, scored as `sum/(1 + d*0.1)`, then walks to the tile in that cell with the most carrion.

### 2h. Groups and migrations (`ecosystem.js`)
- **New groups.** `STAT_GROUPS` gets `amphib` (label "Amphibians", domain 2, icon `frog`) and `reptile` ("Reptiles", icon `lizard`), for 9 groups in total.
- **Classification.** Domain 2 counts as `amphib`. Land with `cold > 0.5` counts as `reptile`. Both are checked before the scavenger and diet split.
- **Revival.** When `amphib` or `reptile` hits 0 and the land animal total is above 150, a random archetype of that kind is introduced with `pickRole`, using role tags `'amph'` and `'reptile'`.
- **Spawn placement.** Amphibians spawn at `waterDist <= 2`, and reptiles need a `clim` of 0.55 or more, which their hot `pT` gives them.
- **Stats:**
  - `stats.thirstDeaths` and `stats.thirstShare` (rolling 1 year);
  - `stats.herds`: species with a mean `herd > 0.4` and a population of 12 or more;
  - `stats.territories`: the number of holders;
  - `stats.deaths`: a copy of `A.deaths`, including thirst.

## Slice 3: icons, render and minimal UI (`icons.js`, `render.js`, `main.js`, `index.html`, `css`)

1. **Ten new icons** in the existing style: frog, toad, newt, salamander, axolotl, lizard, snake, tortoise, monitor, crocodile.
   - `ANIMAL_ICON_VARIANTS`:
     - frog: frog, toad
     - newt: newt, axolotl
     - salamander: salamander, axolotl
     - crocodile: crocodile
     - tortoise: tortoise, turtle
     - lizard: lizard
     - snake: snake
     - monitor: monitor
   - Monitor is used in both the snake and monitor slots so that each category has at least one distinct icon. Every reptile and amphibian species picks by id from these lists.
2. **`GROUP_COLORS`** gets `amphib` (teal-green) and `reptile` (ochre). Stat cards, the population legend and the chart pick them up automatically.
   - The card tooltip domain text becomes Land, Water or Amphibious.
3. **Territory map view.**
   - A new `data-mode="territory"` button.
   - In `setMode`, a categorical branch writes each tile's owner species color, blended 55% over the base terrain, when `terrUntil > tick`.
   - It is added to `LIVE_MODES`.
4. **Live Moisture view.** The existing `humidity` view becomes live, showing `clamp01(humidity + 0.5*wet)` plus a white tint for snow. It is added to `LIVE_MODES`.
5. **`EVENT_GLYPH`** gets a `weather` glyph and `.ev-weather` CSS, so drought events render. There is no filter button (that is Part 4).

## Docs
- **`CODE_REFERENCE.md`:**
  - a new Weather section;
  - Animals (genes 11–14, domain 2, thirst, territory, herds, the new categories);
  - Plants (`moistMul`);
  - Soil (`carrionCell`);
  - Disease (resistance duration);
  - Ecosystem (9 groups, weather wiring, new stats);
  - Icons, Renderer (territory and live moisture) and App.
- **`complexities.md`:**
  - a new `js/sim/weather.js` entry at about 5;
  - `animals.js` 8.5 → 9;
  - `ecosystem.js` 6 → 6.5;
  - `render.js` stays at 7.5.

## Tests and gates
- The runner is `part3run.js`, a copy of `part2run2.js` that also loads `weather.js`. It runs seeds 42, 7 and 123 for 3000 ticks and at year 35.
- **Hard gates:**

  | Gate | Requirement |
  |---|---|
  | Speed | ms/tick within +25% of the Part 2 numbers at 3000 ticks |
  | Survival | All 9 animal groups and 4 bug niches alive at 3000 ticks and at year 35 (revival allowed) |
  | Plant cover | Within 10% of Part 2 (weather changes it on purpose) |
  | Browser | Headless browser run on seed 42 shows no console errors |

- **Behaviour targets.** These are reported, and the implementer tunes within ±50%:
  - thirst causes 3–12% of land deaths;
  - there is at least 1 drought per seed by year 35, and snow appears in cold biomes;
  - carnivore mean `terr` is at least 2x the herbivore mean at year 35;
  - herbivore mean `herd` is above the carnivore mean;
  - amphibians' mean `waterDist` is 3 or less;
  - the mean tile temperature for reptiles is at least 0.1 above the land-animal mean;
  - resistance of the most-infected species rises from year 5 to year 35 on at least 2 of 3 seeds;
  - carrion is at least 20% of scavenger energy.
- **Watch items:** land herbivores against Part 2 (herds and territory should help), crabs, and ms/tick at year 35.

## Screenshots (`feature-research/ecosystem-v2/part3/screenshots/`)
1. `territory.png`: seed 42 around year 8, Territory view, showing claimed areas and the stat cards including Amphibians and Reptiles.
2. `moisture.png`: the live Moisture view during a storm or a drought, zoomed in with frogs and lizards visible as sprites.
Before these are taken, a scratch gallery check of the 10 new icons is attached to the audit as `designs.png`.

## Out of scope
- Weather overlay and widget, the weather switch, the Water/Thirst view, trait rows for the new genes, the weather event filter, and save/load (all Part 4).
- Retuning crabs or other existing groups, beyond what herds and territory do on their own.
- Any change to `WorldMap` generation.
- New code comments.

## Order
Slice 1, then slice 2 (it needs `waterDist` and `wet`), then slice 3. I'll run one implementer per slice, and the audits go to `part3/audit-slice{1,2,3}.md`.
