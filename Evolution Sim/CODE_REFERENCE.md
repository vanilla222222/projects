# Evolution Sim: code reference

Vanilla JS with no build step. `index.html` loads these global scripts in this order: `noise.js`, `biomes.js`, `mapGenerator.js`, `sim/core.js`, `sim/plants.js`, `sim/animals.js`, `sim/ecosystem.js`, `icons.js`, `render.js`, `charts.js`, `main.js`.

- Each file relies on the globals of the files loaded before it.
- The four `sim/*` files plus the world-gen files have no DOM dependency, so they run headless in Node through `vm`.
- Source files carry no comments. Design intent is recorded here.

Unless stated otherwise, every gene value is a float in `0..1`.

---

## Sim core (`js/sim/core.js`)

Shared primitives: RNG, gene maths, colors, the species registry and the event log.

### `FastRng(seed)`

- Uses xorshift32. The state lives in an `Int32Array(1)` (`this.s`), so `next()` never allocates a heap number. The hot loops call it millions of times per second.
- The seed is scrambled with `(seed * 2654435761) ^ 0x5bd1e995`, falling back to `1` if that gives 0, and then warmed up with 8 draws.
- `next()` returns a uniform float in `[0, 1)`.

### Functions

| Function | Purpose |
| --- | --- |
| `clamp01(v)` | Clamps `v` to 0..1. |
| `gaussFit(value, pref, tol)` | `exp(-((value-pref)/tol)^2)`. The bell-shaped fitness used for climate and moisture. |
| `gaussRand(rng)` | Approximates a normal deviate as the sum of four uniforms minus 2, times 1.732. Cheap, and good enough for mutation. |
| `mutateGenes(src, srcOff, dst, dstOff, n, rng, rate, sd)` | Copies `n` genes. Each gene mutates with probability `rate` by `gaussRand*sd`, then is clamped. `src` and `dst` may be the same array. |
| `geneDistance(a, aOff, b, bOff, weights)` | Weighted RMS distance, `sqrt(sum(w*d^2)/sum(w))`. Used for speciation checks. |
| `hslToHex(h, s, l)`, `hexToRgb(hex)`, `shadeHsl(hsl, dl, ds)` | Color helpers. `h` is in degrees; `s` and `l` are in 0..1. |

### `NAME_PARTS`

Holds the prefix, middle and suffix pools for generated Latin-ish names. There are three pools: `plant`, `animal` (land animals) and `fish` (water animals).

### `Species`

| Field | Meaning |
| --- | --- |
| `id` | Integer id. |
| `group` | `'plant'` or `'animal'`. |
| `domain` | `'land'` or `'water'`. |
| `parentId`, `createdTick`, `generation`, `origin` | Ancestry. `origin` is `'founder'`, `'migrated'` or `null` (evolved). |
| `genome` | A `Float32Array` holding the reference genome. It is the speciation anchor and never changes after creation. |
| `mean` | A `Float32Array` holding the current population mean. It is refreshed every 20 ticks and drives `category` and `icon`. |
| `hsl`, `color` | The base hue as an `[h, s, l]` triple, and the same color as hex. |
| `rgb`, `rgbDark`, `rgbLight` | 0..1 float triples used by the renderer. |
| `colorDark`, `colorLight` | Hex strings used by the UI icons. Dark is `l-0.28` with `s*0.9`; light is `l+0.3` with `s*0.6`. |
| `population`, `peak`, `extinctTick` | `population` counts tiles for plants and individuals for animals. |
| `children` | An array of daughter `Species`. |
| `history`, `historyStep` | See `pushHistory` below. |
| `category`, `icon`, `role` | `role` is set on animals only. Plants also get `biomass` once `refreshSpeciesMeans` has run. |

`pushHistory(tick, value)`:

- `history` is a flat `[tick, value, tick, value, …]` array.
- Samples are recorded only when `tick % historyStep === 0`.
- When the array reaches 1200 entries (600 samples), every second sample is dropped and `historyStep` doubles. The history therefore stays at most 600 samples long while covering the species' whole lifetime.

### `SpeciesRegistry(rng)`

- **Fields:** `all` is a Map from id to Species. `living` is a Set of ids. Also `nextId`, `tick`, `recentlyExtinct` and `names`.
- **`create(opts, hsl)`** assigns an id and a unique name, then links the new species into the parent's `children`.
- **`add(sp, n)` and `remove(sp, n)`** are the only way population changes. `remove` marks a species extinct when its population reaches 0 and queues it in `recentlyExtinct`, which `Ecosystem` drains.
- **`matchDaughter(parent, genome, weights, threshold)`** returns the closest living child of `parent` within `threshold` of `genome`. This absorbs a drifting population into an existing daughter species, so one population does not found dozens of near-identical species.
- **`livingList()`** returns the living species. **`lineage(sp)`** returns up to 12 ancestors, nearest first.

### `EventLog(limit = 120)`

- `items` holds entries of the form `{tick, type, text, speciesId}`, newest first.
- `type` is one of `info`, `speciation`, `extinction` or `migration`.
- `version` increments on every push. The UI uses it to skip re-rendering.

---

## Plants (`js/sim/plants.js`)

Vegetation is tile-based:

- Each tile holds at most one plant lineage.
- That lineage has a biomass value that regrows logistically.
- Grazing thins a patch instead of deleting it, so the food base can always recover.

### Constants

- **`PG = 6`**: the number of plant genes. Gene layout by index:

  | Index | Gene |
  | --- | --- |
  | 0 | `prefTemp` |
  | 1 | `prefMoist` (moisture on land, depth in water) |
  | 2 | `niche` (0 is a specialist, 1 a generalist) |
  | 3 | `woodiness` |
  | 4 | `toxicity` |
  | 5 | `dispersal` |

- **`PLANT_WEIGHTS`** is `[1.4, 1.4, 0.6, 1.2, 0.8, 0.5]`. **`PLANT_SPECIATION`** is `0.13`.
- **`YEAR_TICKS = 480`**: the length of one simulated year, used by the season sine. It is shared by ecosystem, main and charts.
- **`PLANT_ARCHETYPES`**: 13 founders.
  - Land: desert succulent, savanna grass, jungle tree, temperate broadleaf, meadow grass, berry shrub, conifer, tundra moss, wetland reed and steppe brush.
  - Water: shallow algae, kelp and open-water plankton.
- **`WATER_BIOME_SET`**: the biome ids that count as water. They are `OCEAN_DEEP`, `OCEAN`, `FROZEN_OCEAN`, `LAKE`, `RIVER` and `POND`. Animals and the renderer use this set too.

### Functions

**`plantTraitsFrom(g, o)`** turns genes into traits:

| Trait | Formula |
| --- | --- |
| `tol` | `0.09 + 0.22*niche` |
| `peak` | `1 - 0.3*niche` (generalists trade peak yield for breadth) |
| `formCap` | `0.8 + 2.4*wood` (woody plants hold more standing biomass) |
| `growth` | `0.05*(1-0.72*wood)*(1-0.35*tox)*(1-0.12*disp)` |

Wood, toxicity and dispersal all cost growth rate.

**`plantCategory(g, domain)`** picks the icon and category from temperature, moisture and wood:

- Water plants are `algae`, `kelp` or `plankton`.
- Land plants are `moss`, `reed`, `grass`, `cactus`, `shrub`, `conifer`, `palm` or `tree`.

`PLANT_CATEGORY_LABEL` maps each category to its UI label.

### `PlantLayer(world, registry, rng, log)`

The data is structure-of-arrays, one entry per tile, where `n = width*height`:

| Array | Type | Meaning |
| --- | --- | --- |
| `species` | Int32 | Species id, or 0 for an empty tile. |
| `biomass` | Float32 | Current biomass. |
| `cap` | Float32 | Carrying capacity K for this lineage on this tile. |
| `growth` | Float32 | Intrinsic growth rate. |
| `floor` | Float32 | Woody reserve that grazers cannot eat into (see "Woody floor" below). |
| `tox`, `disp` | Float32 | The tile lineage's toxicity and dispersal. |
| `genome` | Float32 `n*PG` | The per-tile genome. The tile at index `i` uses slots `i*PG … i*PG+5`. |
| `water` | Uint8 | 1 if the tile's biome is in `WATER_BIOME_SET`. |
| `depth` | Float32 | Water depth, `(sea - altitude)/sea`, clamped. It is 0 on land. |
| `habit` | Float32 | Habitat quality: `(0.45+0.55*fertility) * light * harshPenalty`. |
| `seasonAmp` | Float32 | Seasonal growth swing, `0.75*(1-temperature)`. Cold tiles swing more. |

It also keeps some scalar fields:

- `totalBiomass` and `coverTiles`, which are refreshed every step.
- `season`, the current value of `sin(2π·tick/YEAR_TICKS)`.
- `version`.

Climate preparation (`_prepareClimate`):

- **Light:** in water, `light = 2 - 1.1*depth`, so shallow water is very productive and deep water is poor. On land, light is 1.
- **Harsh biomes:** these multiply habitat by a penalty:

  | Biome | Penalty |
  | --- | --- |
  | Glacier | 0.05 |
  | Alpine | 0.35 |
  | Frozen ocean | 0.25 |
  | Cliff | 0.4 |
  | Beach | 0.55 |
  | Mountains | 0.55 |
  | Badlands | 0.6 |

- **`moistAt(i)`** is `depth` in water and `humidity` on land. The same gene is therefore read as moisture preference on land and depth preference in water.
- **`capFor(t, i)`** is `formCap * peak * habit * gaussFit(temp) * gaussFit(moist, tol*1.2)`.

Seeding (`_seed`):

- On every tile, each founder of the matching domain is scored as `capFor * (0.7..1.3 random)`, and the best is chosen.
- About 45% of tiles whose best score is at least 0.06 are planted.
- Each founder's `Species` is created lazily, the first time it is planted.

Public methods:

- **`edible(i, reach = 0)`** returns `biomass - floor*(1-reach)`, or 0 if that is negative.
- **`graze(i, amount, reach = 0)`** removes up to `amount` from above the same limit and returns what was actually eaten.
- **`step(tick)`** runs logistic growth and spreading:
  - Growth follows `b += r*max(b,0.03)*(1-b/K)`, where `r = growth * max(0.05, 1 + seasonAmp*season)`.
  - Biomass never drops below 0.004. A dying lineage can therefore persist at a trace level, and a grazed patch can always regrow.
  - Tiles with `K < 0.015` lose 0.01 per tick and are cleared once they reach 0.
  - When a tile is more than 30% full, it attempts `_spread` with probability `(0.006 + 0.045*disp)*fullness`.
- **`refreshSpeciesMeans()`** recomputes each living species' `mean` genome, `biomass`, `category` and `icon`.

### Mechanics

**Woody floor:**

- `_set` sets `floor = cap * 0.55 * wood^2`.
- Grazers can only eat biomass above this floor, so trees and shrubs keep standing wood that pure herbivores cannot strip.
- It also counts as cover for prey (see the Animals section).

**Fruit reach:**

- `edible` and `graze` take a `reach` value in 0..1 that lowers the floor to `floor*(1-reach)`.
- Omnivores get a positive reach (see `AnimalPool._reach`), which lets them eat fruit and nuts from part of the woody reserve.

**Spread and competition (`_spread`):**

- A seed lands up to `1 + floor(rand*(1+disp*4))` tiles away, on a tile of the same water/land type.
- The child genome mutates at rate 0.2 with sd 0.025.
- The child needs `childK ≥ 0.04` to establish.
- When the target tile already has a resident:
  - The resident's strength is `resK*(0.45+0.55*fullness)`.
  - The invader's strength is `childK*0.85`.
  - The invader can only win if it is stronger, and then only with probability `(inv-res)/inv`.
- When the resident belongs to the same species, the child replaces it only if it is more than 2% better, and then only 50% of the time.
- A freshly taken tile starts at biomass 0.04.

**Speciation (`_assign`):**

- A child genome more than `PLANT_SPECIATION` from its parent species' reference genome first tries `matchDaughter`, with 0.8 times the threshold.
- If no daughter matches, it founds a new species and logs the event.
- Water plants get hues 150–205° and land plants 62–150°. Lightness drops with woodiness.

---

## Animals (`js/sim/animals.js`)

Animals are agents stored as structure-of-arrays. There is one typed array per field, indexed by slot.

- A counting-sort spatial grid is rebuilt every tick for neighbour queries.
- A single continuous `diet` gene spans herbivore, omnivore and carnivore. Trophic roles therefore evolve rather than being hard-wired per system.

### Constants

- **`AG = 9`**: the number of animal genes. Gene layout by index, with its named index constant:

  | Index | Gene | Constant |
  | --- | --- | --- |
  | 0 | size | `G_SIZE` |
  | 1 | speed | `G_SPEED` |
  | 2 | sense | `G_SENSE` |
  | 3 | diet | `G_DIET` |
  | 4 | prefTemp | `G_TEMP` |
  | 5 | tempTol | `G_TOL` |
  | 6 | fecundity | `G_FEC` |
  | 7 | toxResist | `G_TOXR` |
  | 8 | armor | `G_ARMOR` |

- **`ANIMAL_WEIGHTS`** is `[1.3, 1, 0.7, 1.8, 1.2, 0.5, 0.8, 0.5, 0.8]`. Diet carries the most weight. **`ANIMAL_SPECIATION`** is `0.12`.
- **`GRID = 6`**: the spatial grid cell size, in tiles.
- **Energy values:** `PLANT_ENERGY` is 3.2 per unit of biomass eaten, and `MEAT_ENERGY` is 20 per unit of prey mass.
- **`ANIMAL_ARCHETYPES`**: 13 founders, each given as `{domain, n, g}`.
  - Land: hopper, browser, grazer, arid runner, cold grazer, omnivore, small hunter and pack hunter.
  - Water: shoal fish, reef fish, crustacean, pike and shark.
- **`dietRole(diet)`** returns `herbivore` below 0.33, `omnivore` below 0.66, and `carnivore` otherwise.
- **`animalCategory(g, domain)`** combines role and size into an icon or category:
  - Land herbivores are `rabbit`, `deer` or `bison`.
  - Land omnivores are `mouse`, `boar` or `bear`.
  - Land carnivores are `fox`, `wolf` or `bigcat`.
  - Water herbivores are `fish` or `turtle`. Water omnivores are always `crab`. Water carnivores are `pike` or `shark`.
- **`ANIMAL_CATEGORY_LABEL`** maps each category to its UI label.

### `AnimalPool(world, plants, registry, rng, log)`: structure-of-arrays layout

`_grow` creates every field as its own typed array. The capacity starts at 2048 and doubles when full.

Float32 fields (`ANIMAL_FIELDS_F`):

| Field | Meaning |
| --- | --- |
| `x`, `y` | Position in tile units. |
| `px`, `py` | Position at the start of the current tick, used by the renderer to interpolate. |
| `energy`, `age` | Current energy and age in ticks. |
| `tx`, `ty` | Current target point. |
| `mass` | `0.35 + 2.5*size`. |
| `spd` | `(0.35+1.05*speed)*(1-0.3*armor)`, in tiles per tick. |
| `range` | Sense radius, `3 + 9*sense`. |
| `plantEff` | `1 - diet^2`. |
| `meatEff` | `diet^1.2`. |
| `emax` | `22*mass`. |
| `meta` | Metabolism per tick, `0.05*mass^0.75*(1 + 0.9*speed^2 + 0.35*sense + 0.3*armor + 0.2*toxR + 0.15*tol)`. |
| `mature` | Maturity age, `45 + 110*size`. |
| `maxAge` | `500 + 1300*size`. |
| `litter` | `1 + round(3*fecundity)`. |
| `pT`, `tol` | Preferred temperature, and tolerance `0.08 + 0.3*tempTol`. |
| `toxR`, `armor`, `diet` | Copied from the genes. |
| `bite` | Biomass per grazing bite, `0.058*mass^0.75`. |

Int32 fields (`ANIMAL_FIELDS_I`):

| Field | Meaning |
| --- | --- |
| `sp` | Species id. |
| `uid` | Unique id per individual. |
| `cool` | Cooldown ticks after hunting or breeding. |
| `ttl` | Ticks left on the current target or state. |
| `face` | Facing: `+1` is right and `-1` is left. |
| `domain` | 0 is land and 1 is water. |
| `alive` | 1 while alive. |
| `state` | 0 idle, 1 grazing, 2 seeking food, 3 hunting, 4 fleeing. |

The remaining structures are:

- **`genome`**: a `Float32Array(cap*AG)`. Slot `i` uses `i*AG … i*AG+8`.
- **The spatial grid**:
  - `gcols` and `grows` give its size.
  - `gstart` is an `Int32Array` of prefix offsets per cell, with `cells+1` entries.
  - `gitems` holds slot indices sorted by cell. `gcell` holds each slot's cell.
- **`walk`**: one `Uint8Array` entry per tile, holding a passability bitmask.

  | Value | Meaning |
  | --- | --- |
  | 0 | Impassable to all animals (glacier). |
  | 1 | Land only. |
  | 2 | Water only. |
  | 3 | Both land and water animals (rivers and ponds, which are shallow). |

  `canStand(domain, x, y)` tests `walk & (domain ? 2 : 1)`.
- **Counters:**
  - `count` is the number of live slots.
  - `maxAnimals` is 7000.
  - `deaths` holds `{starved, eaten, old}`.
  - `births` is reset every step.

### Public methods

- `spawn(sp, genome, gOff, x, y, energyFrac)`
- `newSpecies(genome, gOff, domain, parent, tick, origin)`. A daughter species' hue is offset 25–335° from its parent's, so relatives do not look alike.
- `canStand`
- `step(tick)`
- `refreshSpeciesMeans()`

### Per-tick behaviour (`step`)

The grid is rebuilt first. Then each animal runs through the steps below in order. Once one of steps 1–4 acts, the later behaviour steps are skipped.

1. **Flee.** This applies only when diet is below 0.7. The check runs on every other tick, offset by slot, and then passes a 70% roll. The animal looks for the nearest threat within `range*0.8`. If it finds one, it sets a target 6 tiles directly away and enters state 4 for 3 ticks, moving at 1.1× speed.
2. **Hunt.** This requires `meatEff > 0.25`, energy below 60% of max, and no cooldown. The animal chases the nearest prey within `range`, using 1.6× speed once within 4 tiles.
   - It attacks when within 1 tile.
   - It gives up after 18 ticks, which sets a 10-tick cooldown.
3. **Graze.** This requires `plantEff > 0.12` and energy below 92% of max. If edible biomass on the current tile exceeds half a bite, the animal eats one bite.
   - The energy gained is `eaten*PLANT_ENERGY*plantEff*(1-1.6*max(0, plantTox - toxR))`.
   - Otherwise it moves toward a spot chosen by `_pickForage`.
4. **Roam.** If nothing else acted, the animal drifts at 0.45× speed toward a comfortable spot.
5. **Pay costs.** The cost is `meta*(1+1.3*(1-climateFit)) + moved*0.012*mass`.
   - If energy falls to 0 or below, the animal starves.
   - Past `maxAge`, it has a 5% chance per tick of dying of old age.
6. **Reproduce.** This requires all of the following:
   - The animal is mature.
   - It has no cooldown.
   - Energy is above 70% of max.
   - `count < maxAnimals`. Carnivores with diet above 0.6 may exceed the cap by up to 1500 more.
   - Fewer than 14 same-species animals share its grid cell. This is a density-dependence limit.

After the loop, `_compact()` fills each dead slot with the last live animal. The cost is O(deaths), not O(n), and slot order is not stable.

### Mechanics

**Neighbour query (`_nearest(i, r, mode)`):**

- It scans the grid cells overlapping radius `r` and considers only animals in the same domain.
- Mode 0 finds the nearest threat: an animal whose diet is at least 0.3 higher, whose `meatEff` is at least 0.3, and where the searcher's mass is no more than 1.8× the threat's.
- Mode 1 finds the nearest prey: an animal whose diet is at least 0.3 lower.
- Mode 2 finds the nearest mate: a mature animal of the same species.

**Prey-size limit:**

- In mode 1, prey mass must be at most `1.8×` the hunter's own mass for carnivores (diet above 0.66), and at most `0.6×` for omnivores.
- Omnivores therefore only take small prey.
- Mode 0 mirrors this rule: an animal more than 1.8× heavier than a predator does not treat it as a threat.

**Movement (`_moveToward`):**

- An animal moves up to `spd*frac` toward its target.
- If the direct step is blocked, it tries deflections of ±0.7, ±1.4 and ±2.2 rad. The first side tried is chosen at random.
- A deflected step caps `ttl` at 3, so the animal soon re-targets. A fully blocked step resets `ttl` to 0.

**Fruit reach (`_reach`):**

- Reach is `0.6*(1 - |diet-0.5|/0.3)` when `|diet-0.5| < 0.3`, and 0 otherwise.
- It peaks at diet 0.5 and is passed to `plants.edible` and `plants.graze`.

**Forage choice (`_pickForage`):**

- The animal samples 8 random points within `range` that it can stand on.
- Each point is scored as `(food+0.02)*(0.25+climateFit)/(1+dist*0.08)`, plus a small random jitter.
- Animals without a plant diet use a fixed `food = 0.2`.
- The chosen target is held for 6–13 ticks.

**Attack (`_attack`):**

- The success chance is `0.7 * sizeF * speedF * (1-0.6*armor) * (1-cover)`, where:
  - `sizeF` is `clamp(massRatio*0.85, 0.15, 1.2)`.
  - `speedF` is `spd_i/(spd_i + 0.7*spd_p)`.
- Water cover:
  - Prey in water always gets a base cover of 0.3, because open-sea shoals scatter.
  - Kelp adds `min(0.3, floor*0.6)`, where `floor` is the woody floor of the prey's tile.
- Land cover is `min(0.45, floor*0.5)`, so thickets hide prey.
- On success, the hunter gains `mass_p*MEAT_ENERGY*meatEff + 0.25*energy_p` and gets a 4-tick cooldown.
- On failure, the hunter gets an 8-tick cooldown and pays `2*meta`. The prey bolts: it enters state 4 for 4 ticks, heading directly away.

**Reproduction (`_reproduce`):**

- The litter size is `litter`. The partner is the nearest mate, or the animal itself if none is in range, which makes it effectively asexual.
- Each gene is inherited 50/50 from the two parents, then mutates at rate 0.25 with sd 0.04.
- A fixed energy budget of `emax*0.38` is split across the litter, so big litters mean weak young. Each child's energy is capped at 60% of its own maximum.
- The parent pays `1.1×` what it spent.
- The breeding cooldown is `35 + 55*size - 10*fecundity`.
- The speciation check matches the plant one (`matchDaughter` at 0.8 times the threshold). A new species is logged, with a note when its role differs from the parent's.

---

## Ecosystem (`js/sim/ecosystem.js`)

`Ecosystem` runs one world. It seeds the founders, advances plants and animals, runs migrations, samples history and writes the event log.

### Globals

- **`STAT_GROUPS`**: six trophic groups, given as `{key, label, domain (0 land / 1 water), role, icon}`. The keys are `landHerb`, `landOmni`, `landCarn`, `waterHerb`, `waterOmni` and `waterCarn`.
- **`HISTORY_EVERY = 5`**: the population history is sampled every 5 ticks.

### `new Ecosystem(world, seed, options)`

- **Options:** `{migrations: true, seasons: true}` by default. Both can be toggled at runtime through `eco.options`.
- **RNG streams:** each part of the system uses its own RNG stream, so adding draws in one subsystem does not reshuffle the others.

  | Stream | Seed |
  | --- | --- |
  | Ecosystem | `seed*7+11` |
  | Registry names | `seed+99` |
  | Plants | `seed+555` |
  | Animals | `seed+777` |

- **Fields:**
  - `world`, `seed`, `tick`, `log`, `registry`, `plants` and `animals`.
  - `stats` holds `plants` (cover tiles), `plantBiomass`, `animals`, and one count per `STAT_GROUPS` key.
  - `history` holds `tick`, `plants` (rounded biomass) and one array per group key. When it passes 800 samples, it keeps every second sample.

### Methods

**`step()`**:

1. Advances `tick`.
2. Handles the seasons toggle. When seasons are off, `plants.seasonAmp` is zeroed. When seasons are switched back on, it is rebuilt through `plants._prepareClimate()`.
3. Steps the plants, then the animals.
4. Every 20 ticks, refreshes both layers' species means.
5. Computes stats and logs extinctions.
6. Every 60 ticks, runs migrations if they are enabled.
7. Every 5 ticks, samples history.

**`_introduce(arch, origin, count)`** places a founder or migrant group in clusters of 4–8, in good habitat:

- For the first 3000 of its 4000 placement attempts, the site needs a climate fit of at least 0.55. After that, 0.1 is enough.
- The site needs food of at least 0.05. Only animals with diet below 0.6 check the site's actual edible biomass; the others treat food as 0.3.
- Founders start between 0.6 and 1.6 times their maturity age.

**`_migrations()`** is a safety net that re-introduces a trophic group that has died out. It picks a random archetype of the needed kind and brings in 60% of that archetype's founder count:

- If land herbivores plus land omnivores fall below 20, it brings in land herbivores.
- Otherwise, if there are no land predators and more than 250 land herbivores, it brings in land predators.
- The water side follows the same two rules.

**`_logExtinctions()`**:

- Logs an extinction only when the species was notable: a plant with a peak of at least 60 tiles, or an animal with a peak of at least 12.
- Pushes a final 0 into the species' history.

**`seasonName()`** returns Spring, Summer, Autumn or Winter, by quarter of `YEAR_TICKS`. **`year()`** returns the 1-based year.

---

## Icons (`js/icons.js`)

The vector icons are drawn on a 32×32 box, in side view, facing right. The same definitions feed both the UI (inline SVG) and the WebGL sprite atlas.

- **`ICONS`** maps a name to a list of parts. Each part is `[role, pathData]`, or `[role, pathData, strokeWidth]` for stroked lines. The role decides the part's color:
  - `'body'`, `'dark'` and `'light'` are tinted per species.
  - Any role starting with `#` is a fixed color, used for eyes, bark and flowers.
- **Names** fall into four groups:
  - Plant categories: `grass`, `reed`, `moss`, `shrub`, `cactus`, `tree`, `conifer`, `palm`, `algae`, `kelp` and `plankton`.
  - Land animals: `rabbit`, `deer`, `bison`, `mouse`, `boar`, `bear`, `fox`, `wolf` and `bigcat`.
  - Water animals: `fish`, `turtle`, `crab`, `pike` and `shark`.
  - Utility: `dot` (the zoomed-out animal marker), `ring` (the highlight ring), `plant`, `paw` and `wave`.

  Every `category` value in `plants.js` and `animals.js` is also an icon name.
- **Helpers:**
  - `circ(x, y, r)` builds a circle path.
  - `EYE(x, y, r)` builds a fixed-color eye part.
  - `BARK` is the fixed bark color.
- **Lookups:**
  - `ICON_NAMES` lists the icon names in definition order.
  - `ICON_INDEX` maps a name to its atlas index.
  - `iconRoleColor(role, colors)` resolves a part's role to a color.

### `iconSVG(name, colors, size = 24, extraClass = '')`

- Returns an inline `<svg>` string. `colors` has the form `{body, dark, light}`, with hex strings.
- It draws a dark outline pass under the fill pass.
- Unknown names fall back to `dot`.

`speciesColors(sp)` returns `{body: sp.color, dark: sp.colorDark, light: sp.colorLight}`.

### `buildIconAtlas(cell = 64)`: texture channel layout

The atlas is 8 columns wide, with `ceil(ICON_NAMES.length/8)` rows of `cell` pixels. It returns `{width, height, cols, rows, cell, role, fixed}`, where `role` and `fixed` are premultiplied-RGBA `Uint8Array`s with the same layout.

**Role atlas:**

- Tinted parts are painted in pure channel colors:

  | Channel | Part |
  | --- | --- |
  | R | `body` |
  | G | `dark` |
  | B | `light` |

- Fixed-color parts and the outline are painted black. They contribute alpha only.
- Alpha is the icon's total coverage.

**Fixed atlas:**

- Holds the fixed-color parts and the outline, in dark ink `rgba(10,14,12,0.9)`.
- Tinted parts are cut out of it with `destination-out`.

**Outline:**

- The outline is stroked under every icon except `ring`.
- Its width is the part's stroke width plus 1.8.

The sprite shader recombines the two atlases with each instance's three colors (see the Renderer section).

---

## Renderer (`js/render.js`)

`WorldRenderer` is a WebGL2 renderer with two passes:

- **Terrain:** a single fullscreen triangle draws the terrain from three tile textures through a camera transform, so panning and zooming cost nothing on the CPU.
- **Sprites:** plants (only when zoomed in) and animals are drawn as instanced quads sampling the icon atlas. Each instance carries its three species colors.

### Shaders

**`TERRAIN_VS` / `TERRAIN_FS`:**

- Uniforms:

  | Uniform | Meaning |
  | --- | --- |
  | `u_origin` | World tile coordinate at the top-left pixel. |
  | `u_scale` | Tiles per device pixel. |
  | `u_res`, `u_map` | Canvas size and map size. |
  | `u_vegAmount` | Vegetation tint mix. |
  | `u_winter` | Winter strength. |
  | `u_time` | Animation time. |
  | `u_grid` | Tile-grid strength. |

- Effects, in order:
  - The vegetation tint is mixed in by `v.a*u_vegAmount`.
  - In winter, snow creeps down from cold ground: `smoothstep(0.42, 0.18, temp + 0.22*(1-winter))`, on land only.
  - Water gets a gentle sine shimmer.
  - The result is multiplied by hillshade, `t.a*2`.
  - A faint tile grid appears when zoomed far in (zoom above 20).
  - A soft vignette darkens the last 2.5 tiles at the map edge.
- Anything outside the map is drawn in the background color.

**`SPRITE_VS` / `SPRITE_FS`:**

- Per-instance attributes:

  | Attribute | Contents |
  | --- | --- |
  | `a_inst` | `(x, y, sizeInTiles, iconIndex)` |
  | `a_extra` | `(flip ±1, alpha)` |
  | `a_c0`, `a_c1`, `a_c2` | body, dark and light colors, as normalized `UNSIGNED_BYTE`s |

- The fragment shader samples both atlases:
  - It computes `tint = (r.r*c0 + r.g*c1 + r.b*c2)/(r.r+r.g+r.b)`.
  - It outputs `tint*max(r.a - f.a, 0) + f.rgb`, with alpha `r.a`, all times the instance alpha.
- Both atlases are premultiplied, and `r.a` is the total coverage. Blending is `ONE, ONE_MINUS_SRC_ALPHA`.

### Terrain texture layouts

All three are RGBA8 at `width × height`, one texel per tile, with linear filtering.

**`terrainTex`**, built by `setMode`:

| Channel | Contents |
| --- | --- |
| RGB | Base color. |
| A | Hillshade, `shade*127.5`. The shader multiplies by `a*2`, so 0.5 means unshaded. |

The base color depends on the view mode:

- Numeric views use `RAMPS` through `rampLookup`. The modes are `altitude`, `temperature`, `humidity` and `fertility`.
- The `biome` and `vegetation` modes use `BIOME_COLOR_TABLE`, with these overrides:
  - Alpine is bare grey rock that whitens only toward the true peaks, via a smoothstep of altitude from 0.72 to 0.92.
  - Glacier, frozen desert and frozen ocean have fixed colors.
  - Water is darkened with depth (`k = 1 - depth*0.55`).
- The `vegetation` mode desaturates the base so the plant tint dominates.

**`vegTex`**, rebuilt by `_updateVegetation` at most every 180 ms, or when `vegDirty` is set:

| Channel | Contents |
| --- | --- |
| RGB | Species body color. |
| A | Coverage by biomass: `min(1,b/1.8)*0.85` on land and `min(1,b/1.4)*0.4` in water. |

- Water tiles blend the species color toward sea-green (`c*0.35 + (20,95,80)`), so pale algae colors do not wash out the sea.
- While a species is highlighted, its tiles get alpha 1 and all others get 0.25×.

**`infoTex`**, built once in `setWorld`:

| Channel | Contents |
| --- | --- |
| R | `temperature*255` |
| G | 255 on water tiles, otherwise 0 |
| B | `depth*255` |
| A | 255 |

**Hillshade (`_computeShade`):**

- It uses the altitude gradient toward the left and upper neighbours, so the map is lit from the north-west.
- Water neighbours count as level ground, so coastlines do not read as cliffs.
- The result is clamped to 0.68–1.22.

### Species color lookup (`_refreshSpeciesLookup`)

- `spIcon` is an `Int16Array` giving the icon index per species id.
- `spCol` is a `Uint8Array(size*9)` holding 9 bytes per species id: `[body r,g,b, dark r,g,b, light r,g,b]`, at offset `id*9`.
- Both grow to `max(nextId+64, 2*size, 256)` when needed. They are refreshed at most once per sim tick, for living species only.
- Instances copy their 9 color bytes from `spCol[id*9…]` into the 12-byte-stride color buffer, which includes 3 padding bytes.

### Instance buffers

- `bufF` is a `Float32Array(cap*6)` holding `[x, y, size, icon, flip, alpha]`.
- `bufC` is a `Uint8Array(cap*12)`.
- Both grow by doubling (`_ensureCapacity`).

### Camera

- `cam = {x, y, zoom}`. `x` and `y` are the world tile at the screen centre, and `zoom` is CSS pixels per tile.
- `resize()` caps the device pixel ratio at 2.
- `fit()` shows the whole map at 98%.
- `clampCam()` keeps zoom between `minZoom()` (90% fit) and 64, and keeps the centre inside the map.
- Other methods: `screenToWorld(sx, sy)`, `zoomAt(factor, sx, sy)` (keeps the point under the cursor fixed) and `pan(dx, dy)`.

### Drawing (`draw(alpha, dt)`)

1. Draws the terrain pass.
2. Collects visible sprites within a 2-tile margin:
   - **Plants:** drawn only when `showPlants` is on, the mode is `biome` or `vegetation`, and `zoom ≥ 9`. Tiles with biomass below 0.08 are skipped.
     - Each plant's size scales with biomass and fullness.
     - Each tile gets a stable jitter and flip from a per-tile hash (`i*2654435761`), so the forest does not look like a grid.
   - **Animals:** drawn when `showAnimals` is on.
     - Positions are interpolated as `p + (x - p)*alpha` between the previous and current tick.
     - Below zoom 3, animals are drawn as `dot` sprites.
     - Highlight rings are pushed first, so the animals draw on top.
3. Draws all sprites in one `drawArraysInstanced` call.

Other public members:

- Fields: `mode`, `showPlants`, `showAnimals`, `highlight` (a species id or `null`), `vegDirty` and `spriteCount`.
- Methods: `setWorld(world, eco)` and `setMode(mode)`.

### Other globals

- `compileProgram(gl, vs, fs)` returns `{p, u}`, where `u` maps uniform names to their locations.
- `RAMPS` and `rampLookup(stops)` build a 256-entry RGB lookup table from color stops.
- `ALPINE_ID`, `GLACIER_ID`, `FROZEN_DESERT_ID` and `FROZEN_OCEAN_ID` are biome ids.

---

## Charts (`js/charts.js`)

Small 2D-canvas charts. Each is DPR-aware (capped at 2) and redraws from scratch on every call.

| Function | Purpose |
| --- | --- |
| `prepCanvas(canvas)` | Resizes the backing store to the CSS size times the DPR, clears it, and returns `{ctx, w, h}` in CSS pixels. |
| `formatCount(n)` | Formats `1234` as `1.2k`, `12345` as `12k` and `1.2e6` as `1.2M`. |
| `drawSparkline(canvas, values, color, maxPoints = 120)` | Line plus a filled area over the last `maxPoints` values, on a linear scale. |
| `drawPopulationChart(canvas, ticks, series, opts)` | Multi-series population chart (details below). |
| `drawSpeciesChart(canvas, history, color, nowTick)` | Plots a species' flat `[tick, value, …]` history on a linear scale, with an area fill. Shows "Collecting data…" when there are fewer than 2 samples. |

`drawPopulationChart`:

- Each entry in `series` has the form `{values, color, hidden, dim, width}` and shares the `ticks` array.
- It uses a log10 scale, so predators (tens) and grazers (thousands) stay readable on one axis.
- It draws gridlines at powers of 10.
- If `opts.yearTicks` is set, it adds year labels (`Y1`, `Y2`, …).

---

## App / main (`js/main.js`)

The UI controller covers the world lifecycle, the animation and tick loop, map input, and all side-panel views.

### State

The `app` object holds:

| Field | Meaning |
| --- | --- |
| `world`, `eco`, `renderer` | The current world, ecosystem and renderer. |
| `running`, `speed` | Whether the sim runs, and its speed in ticks per second. |
| `acc` | Tick accumulator. |
| `selected` | The selected species id. |
| `tab` | `plant`, `land`, `water` or `events`. |
| `eventFilter` | Filter for the event list. |
| `hidden` | A Set of population-chart keys hidden via the legend. |
| `lastUi`, `lastLogVersion` | UI refresh bookkeeping. |
| `msPerTick`, `fps` | Performance meters. |
| `hover` | Mouse position over the map, or `null`. |

Other globals:

- `$(id)` is shorthand for `document.getElementById`.
- `GROUP_COLORS` maps each stat group key, plus `plants`, to its color.
- `mixHex`, `paletteFor(hex)` and `NEUTRAL` build body/dark/light palettes for the UI icons.

### Tick accumulator and interpolation (`frame`)

- Each frame adds `dt*speed` to `app.acc`, where `dt` is capped at 0.1 s.
- It then calls `eco.step()` while `acc ≥ 1`. Stepping stops early once the frame's time budget is used: 16 ms, or 30 ms when `speed ≥ 600`.
- `msPerTick` is an exponential moving average.
- If `acc` is still above 2 afterwards, it is reset to 1. This stops a slow machine from building an ever-growing backlog.
- The renderer draws with `alpha = clamp(acc, 0, 1)` while running, or 1 while paused. The fractional progress into the next tick interpolates animal positions between `px/py` and `x/y`.
- `stepOnce()` pauses, steps once and sets `acc = 1`.
- The UI panels refresh every 250 ms.

### World lifecycle

`newWorld()`:

1. Reads the seed; a non-numeric seed becomes random.
2. Reads the size, given as `WxH` in `#sizeSelect`.
3. Shows a spinner overlay.
4. After a 30 ms delay, builds `WorldMap` and `Ecosystem` and calls `renderer.setWorld`.
5. Writes the seed to `location.hash`.

`init()`:

- Seeds from `location.hash` (for example `index.html#7`).
- Builds the static panels.
- Creates the renderer. If WebGL2 is unavailable, it shows the error in `#mapError` and stops.
- Autoplays when the query string contains `play` (for example `index.html?play#7`).

### Panels

- **Left:** the stat cards and sparklines (`buildStatCards` and `updateStats`), the population chart (plant biomass is shown ÷10 so it shares the axis), the biome legend, and the clock and performance readout (`updateClock`).
- **Right:**
  - Species tabs, with sorting and an extinct toggle, capped at 160 rows (`renderSpeciesList`).
  - The events list, which re-renders only when `log.version` changes (`renderEvents`).
  - The species detail view (`renderDetail`): badges, a stats grid, a history chart, trait bars from the `mean` genome, lineage and children.

`PLANT_TRAITS` and `ANIMAL_TRAITS` map each gene index to a label and formatter.

### Map input

- Pointer drag pans. Two pointers pinch-zoom. The wheel zooms at the cursor.
- A click, meaning movement of 4 px or less, selects a species. It tries the nearest animal first, within `max(0.9, 10/zoom)` tiles, then the plant on the clicked tile. Clicking anything else closes the detail view.
- Hovering shows a tooltip with biome, °C (`temp*50-15`), moisture or depth, and the animal and plant under the cursor.
- Keyboard shortcuts:

  | Key | Action |
  | --- | --- |
  | Space | Play/pause |
  | `.` | Step once |
  | `f` | Fit the map |
  | Esc | Close the detail view |

---

## World generation (`js/mapGenerator.js`, with `js/noise.js` and `js/biomes.js`)

`noise.js` provides `SeededRandom` and `PerlinNoise` (`noise2D`, `fbm` and `ridgedFbm`).

`biomes.js` provides:

- `BIOME`, `BIOME_INFO` (name and color per key), `BIOME_KEYS`, `BIOME_LIST` (id to key) and `BIOME_ID` (key to id).
- `BIOME_COLOR_TABLE`, a `Uint8Array` of RGB per id.
- `BIOME_THRESHOLDS`, including `seaLevel`, which is 0.42.
- The classifier functions.

### `new WorldMap(width, height, seed, options)`

- **Per-tile fields**, where the tile at `(x, y)` has index `y*width + x`:
  - `altitude`, `temperature`, `humidity` and `fertility` are `Float32Array`s in 0..1.
  - `isOcean`, `isLake`, `isRiver`, `isGlacier` and `isPond` are `Uint8Array` flags.
  - `riverFlow` is a `Float32Array`.
  - `biome` is a `Uint8Array` of numeric `BIOME_ID` values.
- **Methods:** `idx`, `inBounds`, `isWaterTile` and `getCell`.
- **Pipeline:**
  1. `_generateFields`
  2. `_carveLakeBasins`
  3. `_computeHydrologyBasins`
  4. `_computeGlacierMask`
  5. `_generateRivers`
  6. `_generatePonds`
  7. `_classifyBiomes`

### Rework tuning inside `_generateFields`

The file's older comments remain in place; the three rework comments were moved here.

- **Noise-bent edge falloff.**
  - The distance to the map edge is offset by a warp-noise sample: `edgeWobble * edgeMargin * 0.9`.
  - It is then normalised over `1.5*edgeMargin` and smoothstepped.
  - Altitude is scaled by `0.35 + 0.65*falloff`.
  - The coast therefore wanders instead of tracing a straight rectangle around the map.
- **Altitude curve.**
  - After normalising altitude to 0..1, the result is raised to `ALTITUDE_CURVE` (1.2).
  - This mild curve gives more sea and lowland while peaks stay peaks.
- **Polar temperature.**
  - The formula is `temp = (1 - latitude^1.4)*0.72 + noise*0.25 + 0.04`, with a lapse rate of `0.75` per unit of altitude above sea level. It was `0.9` before the rework.
  - The `latitude^1.4` term keeps polar cold near the top and bottom edges, so the cold bands do not swallow most of the land.
