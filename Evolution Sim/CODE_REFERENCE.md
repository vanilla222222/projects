# Evolution Sim: code reference

Vanilla JS with no build step. `index.html` loads these global scripts in this order: `noise.js`, `biomes.js`, `mapGenerator.js`, `sim/core.js`, `sim/soil.js`, `sim/plants.js`, `sim/animals.js`, `sim/bugs.js`, `sim/disease.js`, `sim/weather.js`, `sim/eggs.js`, `sim/ecosystem.js`, `icons.js`, `render.js`, `charts.js`, `tree.js`, `save.js`, `simClient.js`, `main.js`. `simWorker.js` is not loaded by the page; `simClient.js` starts it as a Web Worker.

- Each file relies on the globals of the files loaded before it.
- The nine `sim/*` files plus the world-gen files have no DOM dependency, so they run headless in Node through `vm`.
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

Holds the prefix, middle and suffix pools for generated Latin-ish names. There are four pools: `plant`, `animal` (land animals), `fish` (water animals) and `pathogen` (disease strains). `SpeciesRegistry.create` uses the `pathogen` pool when `opts.group === 'pathogen'`.

### `Species`

| Field | Meaning |
| --- | --- |
| `id` | Integer id. |
| `group` | `'plant'`, `'animal'`, `'bug'` or `'pathogen'` (a disease strain, see the Disease section). |
| `domain` | `'land'` or `'water'`. |
| `parentId`, `createdTick`, `generation`, `origin` | Ancestry. `origin` is `'founder'`, `'migrated'` or `null` (evolved). |
| `merged` | Set to the parent's id when `registry.merge` folded this species back into its parent. It is then extinct but never logged as an extinction. |
| `genome` | A `Float32Array` holding the founding genome. It never changes after creation. Speciation checks no longer use it (they use `mean`); disease still uses it for host compatibility. |
| `mean` | A `Float32Array` holding the current population mean, initialised to `genome`. Plants, animals and bugs refresh it every 20 ticks (`Ecosystem.step`); strains drift it in `_mutate`. It drives `category`, `icon`, every speciation check and `matchDaughter`. |
| `hsl`, `color` | The base hue as an `[h, s, l]` triple, and the same color as hex. |
| `rgb`, `rgbDark`, `rgbLight` | 0..1 float triples used by the renderer. |
| `colorDark`, `colorLight` | Hex strings used by the UI icons. Dark is `l-0.28` with `s*0.9`; light is `l+0.3` with `s*0.6`. |
| `population`, `peak`, `extinctTick` | `population` counts occupied slots (canopy and understory) for plants and individuals for animals. |
| `children` | An array of daughter `Species`. |
| `history`, `historyStep` | See `pushHistory` below. |
| `category`, `icon`, `role` | `role` is set on animals only. Plants also get `biomass` and mean `health` once `refreshSpeciesMeans` has run. |

`pushHistory(tick, value)`:

- `history` is a flat `[tick, value, tick, value, …]` array.
- Samples are recorded only when `tick % historyStep === 0`.
- When the array reaches 1200 entries (600 samples), every second sample is dropped and `historyStep` doubles. The history therefore stays at most 600 samples long while covering the species' whole lifetime.

### `SpeciesRegistry(rng)`

- **`SPLIT_MIN_AGE = 480`** (1 year): a species must be at least this many ticks old before a child can found a new species from it.
- **Fields:** `all` is a Map from id to Species. `living` is a Set of ids. Also `nextId`, `tick`, `recentlyExtinct`, `names` and `speciations`.
- **`speciations`** is `{plant, animal, bug, pathogen}`, counting species created with a parent and no `origin` (speciation and strain mutation). Founders, migrants, emerged strains and host jumps are not counted. `Ecosystem` exposes the same object as `stats.speciations`.
- **`create(opts, hsl)`** assigns an id and a unique name, then links the new species into the parent's `children` and bumps `speciations` when it counts.
- **`canSplit(parent, minPop)`** is true when `parent.population >= minPop` and the parent is at least `SPLIT_MIN_AGE` ticks old. Each layer passes its own minimum population.
- **`add(sp, n)` and `remove(sp, n)`** are the only way population changes. `remove` marks a species extinct when its population reaches 0 and queues it in `recentlyExtinct`, which `Ecosystem` drains.
- **`matchDaughter(parent, genome, weights, threshold)`** returns the closest living species within `threshold` of `genome`, compared with each candidate's `mean`. Candidates are `parent`'s children and `parent`'s siblings (the grandparent's living children, excluding `parent`). This absorbs a drifting population into an existing daughter or sister species, so one population does not found dozens of near-identical species. All four call sites pass the full speciation threshold (factor 1.0).
- **`merge(child, parent)`** moves `child.population` to `parent` through `remove` and `add` and sets `child.merged = parent.id`. The caller must first move every member's id with the layer's `reassignSpecies`. The child's `children` links are kept.
- **`livingList()`** returns the living species. **`lineage(sp)`** returns up to 12 ancestors, nearest first.

### `EventLog(limit = 120)`

- `items` holds entries of the form `{tick, type, text, speciesId}`, newest first.
- `type` is one of `info`, `speciation`, `extinction`, `migration` or `outbreak` (disease emergence, host jumps and mass die-offs).
- `version` increments on every push. The UI uses it to skip re-rendering.

---

## Plants (`js/sim/plants.js`)

Vegetation is tile-based, with two slots per tile:

- Slot 0 is the canopy and slot 1 the understory. Each slot holds at most one plant lineage, so a tile holds up to two plants.
- Each plant has a biomass value that regrows logistically, limited by light (understory only) and by soil nutrients shared with its neighbours (see the Soil section).
- Grazing thins a patch instead of deleting it, so the food base can always recover.

### Constants

- **`PG = 15`**: the number of plant genes. Gene layout by index:

  | Index | Gene |
  | --- | --- |
  | 0 | `prefTemp` |
  | 1 | `prefMoist` (moisture on land, depth in water) |
  | 2 | `niche` (0 is a specialist, 1 a generalist) |
  | 3 | `woodiness` |
  | 4 | `toxicity` |
  | 5 | `dispersal` |
  | 6 | `shade` tolerance |
  | 7 | `root` vigour |
  | 8 | `fruiting` |
  | 9 | `sweet` (fruit sweetness) |
  | 10 | `seedTox` for plants; the toxin type for fungi |
  | 11 | `bloom` for plants; `myco` (above 0.5 means mycorrhizal) for fungi |
  | 12 | `hue` (flower or cap colour, 0..1) |
  | 13 | `defence` against pest bugs (fungi 0) |
  | 14 | `blightRes`, resistance to plant blight (every archetype row starts at 0.15) |

- **`PLANT_WEIGHTS`** is `[1.4, 1.4, 0.6, 1.2, 0.8, 0.5, 0.7, 0.7, 0.6, 0.5, 0.6, 0.6, 0.4, 0.6, 0.3]`. **`PLANT_SPECIATION`** is `0.25`. **`PLANT_SPLIT_MIN_POP`** is 40 (occupied slots).
- **Fruit, flower and fungus constants:**

  | Constant | Value | Use |
  | --- | --- | --- |
  | `FRUIT_FRAC` | 0.15 | Fruit stock target per unit biomass and fruiting. |
  | `FRUIT_RATE` | 0.02 | Per-tick approach of the stock toward its target. |
  | `FRUIT_ROT` | 0.03 | Per-tick share of the excess over target that rots into litter. |
  | `FRUIT_WIND` | 0.6 | Stand-in for pollination. It scales both fruit and the flower spread bonus. |
  | `FRUIT_LAG` | 0.2 | Fruit season lag, in years, behind the growth season. |
  | `FLOWER_SEED_BONUS` | 1.5 | Bloom spread bonus. |
  | `FUNGUS_SEED_P` | 0.2 | Chance that a skipped land understory slot under a canopy gets a fungus founder. |
  | `FUNGUS_LITTER_K` | 0.06 | Litter at which a decomposer reaches its full K. |
  | `FUNGUS_DECOMP` | 0.003 | Extra litter a decomposer consumes per tick, scaled by its fullness. |
  | `FUNGUS_RETURN` | 0.5 | Share of the consumed litter returned as nutrient. |
  | `MYCO_HOST_K` | 1.5 | Canopy biomass at which a mycorrhizal fungus reaches its full K. |
  | `MYCO_BOOST` | 1.3 | Host canopy satisfaction multiplier (clamped at 1). |
  | `MYCO_TAX` | 0.92 | Host canopy growth multiplier. |
- **Light and health constants:**

  | Constant | Value | Use |
  | --- | --- | --- |
  | `SHADE_MAX` | 0.8 | Largest fraction of light a canopy removes. |
  | `SHADE_FULL_BIOMASS` | 2.0 | Canopy biomass at which shading is full. |
  | `SAT_OK` | 0.75 | Nutrient satisfaction at or above which health recovers. |
  | `HEALTH_RECOVER` | 0.02 | Health gained per tick when satisfied. |
  | `HEALTH_DECAY` | 0.04 | Health lost per tick per unit of shortfall below `SAT_OK`. |
  | `HEALTH_SPREAD_MIN` | 0.4 | Plants below this health do not spread. |
- **Bug interaction constants:**

  | Constant | Value | Use |
  | --- | --- | --- |
  | `DEFENCE_COST` | 0.25 | Growth multiplier `1 - DEFENCE_COST*defence`. |
  | `BLIGHT_RES_COST` | 0.15 | Growth multiplier `1 - BLIGHT_RES_COST*blightRes`. |
  | `POLL_WIND` | 0.3 | Share of the bloom spread bonus that needs no pollinator. |
  | `POLL_FRUIT_BASE` | 0.4 | Share of the fruit target reached with zero pollination. |
  | `POLL_DECAY` | 0.95 | Per-tick decay of `poll`. |
  | `PEST_HEALTH` | 1.5 | Health lost per unit of biomass taken by pests. |
- **Life stage constants (Part 3b slice P):** ages are counted in units of `AGE_STEP` ticks.

  | Constant | Value | Use |
  | --- | --- | --- |
  | `AGE_STEP` | 8 | Ticks per age unit; ages advance and old-death rolls happen on ticks with `tick & 7 === 0`. |
  | `PLANT_LIFE_BASE`, `PLANT_LIFE_WOOD` | 1.5, 40 | Plant lifespan in years, `PLANT_LIFE_BASE + PLANT_LIFE_WOOD*wood^2` (grass about 1.5–4 years, trees about 16–46). Part 3b slice 2 raised `PLANT_LIFE_WOOD` from 30 to 40 for the tree/grass age ratio. |
  | `FUNGUS_LIFE` | 1 | Fungus lifespan in years. |
  | `LIFE_JITTER` | 0.15 | Per-slot lifespan jitter, uniform ±15%. |
  | `SEEDLING_FRAC`, `SEEDLING_MIN` | 0.05, 30 | A slot is a seedling while `age < matureAt(p) = max(life*SEEDLING_FRAC, SEEDLING_MIN/AGE_STEP)`. |
  | `SEEDLING_K0` | 0.3 | Seedling K multiplier ramps from `SEEDLING_K0` to 1 over the seedling stage. |
  | `SEEDLING_KILL` | 0.03 | A seedling bitten below this biomass is killed. |
  | `OLD_FRAC` | 0.8 | A slot is old once `age > OLD_FRAC*life`. |
  | `OLD_GROWTH`, `OLD_FRUIT` | 0.6, 0.5 | Growth-rate and fruit-target multipliers for old slots. |
  | `OLD_DEATH_FRAC`, `OLD_DEATH_P`, `OLD_DEATH_K` | 0.9, 0.006, 8 | Past `OLD_DEATH_FRAC*life`, each age step dies with probability `OLD_DEATH_P*exp(OLD_DEATH_K*(age/life - OLD_DEATH_FRAC))`. |
  | `SEED_DRY` | 0.9 | Land seeds on tiles with `moistMul` below this (or snow above `SNOW_SHOW`) are banked instead of planted. |
  | `SEED_ADD`, `SEED_MAX` | 0.1, 1 | Seed density added per banked seed, and its cap. |
  | `SEED_DECAY`, `SEED_MIN` | 0.985, 0.02 | Seed density decay per age step, and the level below which the bank is cleared. |
  | `GERM_P` | 0.12 | Germination chance per age step is `GERM_P*density*moistMul*(1-snow)`. |
  | `GERM_USE` | 0.5 | Seed density multiplier after a germination. |
  | `OLD_SEED` | 1 | Seed density written by `_selfSeed` when a slot dies of old age. |

- **`YEAR_TICKS = 480`**: the length of one simulated year, used by the season sine. It is shared by ecosystem, main and charts.
- **`PLANT_ARCHETYPES`**: 21 founders. Each entry is `{ g, domain, kind? }`.
  - Land: desert succulent, savanna grass, jungle tree, temperate broadleaf, meadow grass, berry shrub, conifer, tundra moss, wetland reed and steppe brush.
  - Water: shallow algae, kelp and open-water plankton.
  - Founder shade and root genes: moss 0.8 / 0.35, reed 0.3 / 0.65, the two grasses 0.15 / 0.45 and 0.15 / 0.4, broadleaf 0.45 / 0.55, jungle tree 0.35 / 0.5, conifer 0.4 / 0.35, berry shrub 0.4 / 0.5, succulent 0.2 / 0.6, steppe brush 0.3 / 0.6, algae 0.6 / 0.4, kelp 0.3 / 0.5, plankton 0.5 / 0.35.
  - Founder defence (gene 13) is 0.1–0.4 for plants and 0 for fungi.
  - Genes 8–12 on the original 13: land plants have fruiting 0.05–0.3, sweet 0.1–0.2, seedTox 0.2–0.3, bloom 0.05–0.15 and hue 0.5. Water plants have zeros and hue 0.5.
  - New land plants:
    - fruit tree (wood 0.72, fruiting 0.75, sweet 0.7)
    - berry bush (wood 0.45, fruiting 0.75, sweet 0.65)
    - two wildflowers (wood 0.12, bloom 0.8 and 0.75, hue 0.83 and 0.15)
  - Fungi (`kind: 1`), each with the toxin type from gene 10 and myco from gene 11:
    - puffball: mild, decomposer
    - inkcap: neurotoxic, decomposer
    - toadstool: lethal, decomposer
    - truffle: mild, mycorrhizal
  - The fungus climates sit in the forest band, with moisture 0.36–0.48 and niche 0.6.
- **`WATER_BIOME_SET`**: the biome ids that count as water. They are `OCEAN_DEEP`, `OCEAN`, `FROZEN_OCEAN`, `LAKE`, `RIVER` and `POND`. Animals and the renderer use this set too.

### Functions

**`plantTraitsFrom(g, o)`** turns genes into traits:

| Trait | Formula |
| --- | --- |
| `tol` | `0.09 + 0.22*niche` |
| `peak` | `1 - 0.3*niche` (generalists trade peak yield for breadth) |
| `formCap` | `0.8 + 2.4*wood` (woody plants hold more standing biomass) |
| `growth` | `0.05*(1-0.72*wood)*(1-0.35*tox)*(1-0.12*disp)*(1-0.3*shade)*(1-0.2*root)*(1-0.25*fruiting-0.15*sweet)*(1-DEFENCE_COST*defence)*(1-BLIGHT_RES_COST*blightRes)` |
| `defence` | Copied from gene 13. |
| `blightRes` | Copied from gene 14. |
| `shade`, `root` | Copied from genes 6 and 7. |
| `fruiting`, `sweet`, `seedTox`, `bloom`, `hue` | Copied from genes 8–12. |

Wood, toxicity, dispersal, shade tolerance, root vigour, fruiting and sweetness all cost growth rate.

**Other gene helpers:**

- **`toxinType(g, o = 0)`** reads gene 10: below 0.33 gives 0 (mild), below 0.66 gives 1 (neurotoxic), otherwise 2 (lethal).
- **`hueDist(a, b)`** is the circular distance between two 0..1 hues.
- **`bloomFactor(season)`** and **`fruitFactor(season)`** both map a season sine to `0.5 + 0.5*season`. `step` passes the plain season to `bloomFactor`, but passes a season lagged by `FRUIT_LAG` to `fruitFactor`.

**`slotOf(g, water, o = 0, kind = 0)`** picks the slot a genome lives in:

- Fungi (`kind` 1) always go to slot 1.
- On land, `wood >= 0.3` goes to slot 0 (tree, conifer, palm, shrub, succulent, fruit tree, berry bush). Anything softer goes to slot 1 (grass, moss, reed, flower).
- In water, the kelp genome goes to slot 0: `prefMoist > 0.45 && wood > 0.25`, the same split `plantCategory` uses to pick kelp. Algae and plankton go to slot 1.
- Seeds and founders are only ever placed in the slot their own genome maps to.

**`plantCategory(g, domain, kind = 0)`** picks the icon and category:

- **Fungi:** `truffle` when gene 11 is above 0.5. Otherwise the toxin type picks `puffball`, `inkcap` or `toadstool`.
- **Water plants:** `algae`, `kelp` or `plankton`.
- **Land plants:** `moss`, `reed`, `grass`, `cactus`, `shrub`, `conifer`, `palm` or `tree`, plus three new cases:
  - `flower`: wood below 0.3 and bloom above 0.55.
  - `berrybush`: shrub wood with fruiting above 0.5. The cactus test comes first.
  - `fruittree`: wood of at least 0.62 with fruiting above 0.5.

`PLANT_CATEGORY_LABEL` maps each category to its UI label, including Fruit tree, Berry bush, Wildflower, Puffball, Inkcap, Toadstool and Truffle.

**`plantIcon(category, id)`** picks `sp.icon` from `PLANT_ICON_VARIANTS` by `id % variants.length`, the same way `animalIcon` does. `sp.category` and its label stay unchanged. `_newSpecies` and `refreshSpeciesMeans` both set the icon through it. Every one of the 18 categories has three variants, and the first is the base icon:

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

### `PlantLayer(world, registry, rng, log)`

The data is structure-of-arrays, where `n = width*height`. Per-plant arrays have `2n` entries laid out as two planes: the plant in slot `s` on tile `i` sits at index `p = s*n + i`. Indices below `n` are the canopy plane, so a plain tile index still reads the canopy plant.

| Array | Type | Meaning |
| --- | --- | --- |
| `species` | Int32 `2n` | Species id, or 0 for an empty slot. |
| `biomass` | Float32 `2n` | Current biomass. |
| `cap` | Float32 `2n` | Carrying capacity K for this lineage on this tile, before shading. |
| `growth` | Float32 `2n` | Intrinsic growth rate. |
| `floor` | Float32 `2n` | Woody reserve that grazers cannot eat into (see "Woody floor" below). |
| `tox`, `disp` | Float32 `2n` | The plant's toxicity and dispersal. |
| `shade`, `root` | Float32 `2n` | Cached shade tolerance and root vigour genes, so the hot loops avoid strided genome reads. |
| `health` | Float32 `2n` | 0..1, starts at 1 when a plant is placed. |
| `sat` | Float32 `2n` | Nutrient satisfaction written by `soil.step` each tick. |
| `genome` | Float32 `2n*PG` | The per-plant genome at `p*PG … p*PG+14`. |
| `kind` | Uint8 `2n` | 0 for a plant, 1 for a fungus, copied from `sp.kind`. |
| `myco` | Uint8 `2n` | 1 for a mycorrhizal fungus (gene 11 above 0.5). |
| `hue` | Float32 `2n` | The species hue divided by 360, used for aversion and mimicry. |
| `fruit` | Float32 `2n` | Current fruit stock. |
| `fruitMax` | Float32 `2n` | This tick's fruit target. |
| `_fruitK`, `_bloomK` | Float32 `2n` | Cached fruit and bloom factors, set in `_set` and zeroed in `_clear`. |
| `blight` | Int32 `2n` | Blight strain id infecting this slot, or 0. |
| `blightT` | Uint16 `2n` | Ticks of infection left. |
| `blightImm` | Int32 `2n` | The strain this slot last recovered from; it cannot be re-infected by that strain. Reset in `_set` and `_clear`. |
| `water` | Uint8 | 1 if the tile's biome is in `WATER_BIOME_SET`. |
| `depth` | Float32 | Water depth, `(sea - altitude)/sea`, clamped. It is 0 on land. |
| `habit` | Float32 | Habitat quality: `(0.45+0.55*fertility) * light * harshPenalty`. |
| `seasonAmp` | Float32 | Seasonal growth swing, `0.75*(1-temperature)`. Cold tiles swing more. |
| `floorM` | Float32 `2n` | The mature woody floor set by `_set`; `floor` is 0 while the slot is a seedling and is restored from `floorM` on the first age step after it matures. |
| `age` | Uint16 `2n` | Slot age in `AGE_STEP` units. Reset to 0 by `_set`; kept by an in-place same-species upgrade in `_assign`. |
| `life` | Uint16 `2n` | Slot lifespan in `AGE_STEP` units, rolled in `_set`. |
| `seedDens` | Float32 `n` | Seed bank density per tile, 0..`SEED_MAX`. |
| `seedSp` | Int32 `n` | Species id of the banked seed, or 0. |
| `seedGenome` | Float32 `n*PG` | The one genome banked on the tile. |

It also keeps some scalar fields:

- `totalBiomass` (both planes) and `coverTiles` (tiles with any plant), which are refreshed every step.
- `starved`, a running count of plants killed by nutrient starvation.
- `blighted`, a running count of plants killed while blighted (health reaching 0 with `blight[p]` set, in either death branch).
- `disease`: the `DiseaseLayer`, or `null`. Set by the ecosystem.
- `grazeTox`, the biomass-weighted toxicity of what the last `graze` call removed.
- `grazeFungus`, `grazeToxType` and `grazePotency`: after a `graze` that took understory fungus, the fungus species id, its toxin type and its toxicity. Otherwise `grazeFungus` is 0.
- `fruitSp`, `fruitSweet` and `fruitSeedTox`: the source species and genes of the last `eatFruit`.
- Counters: `seedDrops`, `fruitEaten`, and `poisoned`, a 3-element array indexed by toxin type.
- Totals refreshed every step: `totalFruit`, `fungusTiles`, and `flowerTiles` (land understory plants with a bloom factor above that of bloom 0.55).
- `seasonsOn`, set by the ecosystem from `options.seasons`.
- `moistMul`: the `WeatherLayer.moistMul` Float32 `n` array, assigned by the ecosystem, or `null` (no weather layer). Read in the growth loop, by germination and by the seed-bank gate in `plantSeed`.
- `snow`: the `WeatherLayer.snow` Float32 `n` array, assigned by the ecosystem, or `null`. Read by germination and the seed-bank gate.
- Life stage fields: `stages` is `{seedTiles, seedlings, mature, old}`, refreshed each step (`seedTiles` on age-step ticks). Cumulative counters `oldDeaths`, `germinated` and `grazedSeedlings`.
- `bloomNow` and `fruitNow`, this tick's `bloomFactor` and lagged `fruitFactor`. Both are 0.5 when seasons are off.
- `soil`, the `SoilLayer` instance.
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

- On every tile, each slot is seeded separately. For a slot, each founder of the matching domain whose genome maps to that slot is scored as `capFor * (0.7..1.3 random)`, and the best is chosen.
- About 45% of slots whose best score is at least 0.06 are planted. Land and water both seed both slots.
- Fungus founders are left out of that contest. When a land understory slot is skipped, the tile has a canopy, and a roll comes under `FUNGUS_SEED_P`, `_seedFungus` tries a random fungus founder. It is placed if `capFor * _fungusK` is at least 0.06.
- Each founder's `Species` is created lazily, the first time it is planted (`_seedFounder`).
- `_newSpecies(genome, domain, parent, tick, origin, kind = 0)` sets `sp.kind`, inheriting it from the parent when there is one. Fungi and flowers take their hue from gene 12 (times 360).

Public methods:

- **`edible(i, reach = 0, skipUnder = false)`** takes a tile index and sums, over both slots, `biomass - floor*(1-reach)` floored at 0. With `skipUnder`, the understory is left out.
- **`graze(i, amount, reach = 0, skipUnder = false)`** removes up to `amount` from above the same limit, taking from the understory first and then the canopy. With `skipUnder`, only the canopy is grazed.
  - It returns what was eaten and sets `grazeTox` to the biomass-weighted toxicity of the eaten matter.
  - If understory fungus was eaten, it also sets `grazeFungus`, `grazeToxType` and `grazePotency`.
- **`fruitAt(i, tall = true)`** returns the fruit stock on tile `i` over both slots. With `tall` false, plants with wood of at least 0.62 are left out.
- **`eatFruit(i, amount, tall = true)`**:
  - It takes up to `amount` of fruit, canopy first and then understory berries, with the same `tall` rule.
  - It returns the amount eaten and sets `fruitSp`, `fruitSweet` and `fruitSeedTox` from the first source.
  - It increments `fruitEaten` when anything was eaten.
- **`plantSeed(j, genome, parentSp, tick, bank = true)`**:
  - It is the resident-competition and assign step taken out of `_spread`. `_spread` calls it, and so do animal seed drops and germination (with `bank` false).
  - With `bank` true, a climate-viable seed (`fit >= 0.04`) that fails is banked on tile `j` through `_bank`: a land tile too dry (`moistMul < SEED_DRY`) or snowy (`snow > SNOW_SHOW`), `childK < 0.04`, a same-species resident not beaten by 2%, or a lost competition.
  - Its checks are:
    - The domain must match `parentSp`.
    - For fungi, genes 8 and 9 are zeroed.
    - The slot comes from `slotOf(genome, water, 0, kind)`.
  - It returns true when the seed took the slot.
- **`matureAt(p)`** returns the age (in `AGE_STEP` units) at which slot `p` stops being a seedling.
- **`topSpecies(i)`** returns the canopy species id if present, else the understory one (0 if the tile is bare).
- **`cover(i)`** returns `floor[i] + floor[n+i]`, the combined woody floor used as prey cover.
- **`step(tick)`** first calls `soil.step(this)` to fill `sat`, then runs growth, health and spreading over both planes:
  - Light: canopy plants have `light = 1`. An understory plant under a canopy plant gets `light = 1 - shadeFrac*(1-shade)` with `shadeFrac = SHADE_MAX*min(1, canopyBiomass/SHADE_FULL_BIOMASS)`. The canopy plane is processed first, so it reads this tick's canopy biomass.
  - `K = cap*light` for plants. `cap` itself is fixed at `_set`.
  - Fungi ignore light:
    - A decomposer has `K = cap*min(1, litter/FUNGUS_LITTER_K)`.
    - A mycorrhizal fungus has `K = cap*min(1, canopyBiomass/MYCO_HOST_K)`.
  - A canopy plant with a mycorrhizal fungus beneath it gets `sat *= MYCO_BOOST` (clamped at 1 and written back) and growth `*= MYCO_TAX`.
  - Health: if `sat >= SAT_OK` health gains `HEALTH_RECOVER`, otherwise it loses `(SAT_OK - sat)*HEALTH_DECAY`, clamped to 0..1. At 0 the plant dies: its biomass returns to the soil, the slot is cleared, and `starved` increments.
  - Ageing: on ticks with `tick & 7 === 0` each slot's `age` increments; past `OLD_DEATH_FRAC*life` it may die of old age (`oldDeaths++`, `_selfSeed`, `_clear`). Each slot is counted as a seedling (`age < matureAt`), old (`age > OLD_FRAC*life`) or mature into `stages`.
  - A seedling's `K` is multiplied by `SEEDLING_K0 + (1-SEEDLING_K0)*age/matureAt` (after the `K < 0.015` check), and it neither fruits nor spreads.
  - Growth follows `b += r*max(b,0.03)*(1-b/K)`, where `r = growth * max(0.05, 1 + seasonAmp*season) * light * (0.35 + 0.65*health) * tax * moistMul[i] * old` (`tax` is `MYCO_TAX` or 1; `moistMul[i]` is 1 when `moistMul` is `null`; `old` is `OLD_GROWTH` for old slots, else 1). Old slots' fruit target is also multiplied by `OLD_FRUIT`.
  - Weather acts on the rate, not on `K`: capacity is cached per slot in `cap[p]`, so live moisture cannot go through `moistAt`. Water tiles always have `moistMul` 1.
  - A decomposer then takes `d = litter*FUNGUS_DECOMP*min(1, fullness)` from its tile's litter and adds `d*FUNGUS_RETURN` to nutrients, clamped at `SOIL_MAX`.
  - Fruit: when `_fruitK > 0`, the target is `fruitMax = _fruitK*b*fruitNow*health*(POLL_FRUIT_BASE+(1-POLL_FRUIT_BASE)*poll[i])`, where `_fruitK = fruiting*FRUIT_FRAC*FRUIT_WIND`. It is set only for land plants with wood of at least 0.3 and fruiting above 0.2. The stock rises toward the target at `FRUIT_RATE`. Any excess rots into litter at `FRUIT_ROT`.
  - Biomass never drops below 0.004. A dying lineage can therefore persist at a trace level, and a grazed patch can always regrow.
  - Plants with `K < 0.015` (including deeply shaded understory) lose 0.01 per tick and are cleared once they reach 0.
  - When a plant is more than 30% full and has health of at least `HEALTH_SPREAD_MIN`, it attempts `_spread` with probability `(0.006 + 0.045*disp)*fullness*(1 + _bloomK*bloomNow*(POLL_WIND+(1-POLL_WIND)*poll[i]))`, where `_bloomK = bloom*FLOWER_SEED_BONUS*FRUIT_WIND`.
  - The cover pass multiplies `poll` by `POLL_DECAY` and sets `flowerPoll` to the mean `poll` over flower tiles. On age-step ticks it also decays each tile's seed bank by `SEED_DECAY` (clearing it below `SEED_MIN`) and calls `_germinate`.
- **`damage(i, amount)`** is the pest bite. It takes biomass from the understory plant first (skipping fungi), then the canopy, only above the woody floor (reach 0), and lowers each bitten plant's health by `taken*PEST_HEALTH`, clamped at 0. It returns the total taken.
- **`nectar(i)`** returns the summed `_bloomK` over both slots of tile `i` (unseasoned) and sets `nectarHue` to the hue of the strongest bloomer.
- **Pollination fields:** `poll` (Float32 `n`, 0..1, raised by pollinator bugs) and `flowerPoll` (mean `poll` on flower tiles).
- **`refreshSpeciesMeans()`** recomputes each living species' `mean` genome, `biomass`, mean `health`, `infected` (blighted slot count), `category` and `icon` over both planes.
- **`reassignSpecies(fromSp, toSp)`** rewrites every canopy and understory slot of `fromSp` to `toSp` (and its `hue`), and `seedSp` entries of `fromSp`, and returns the slot count. Used by the ecosystem merge pass.

### Mechanics

**Woody floor:**

- `_set` sets `floor = cap * 0.55 * wood^2`. For plants (not fungi) it is multiplied by `1 + 0.2*(1 - fruiting)`, and growth by `1 - 0.2*bloom`.
- Grazers can only eat biomass above this floor, so trees and shrubs keep standing wood that pure herbivores cannot strip.
- It also counts as cover for prey (see the Animals section).

**Fruit reach:**

- `edible` and `graze` take a `reach` value in 0..1 that lowers the floor to `floor*(1-reach)`.
- Omnivores get a positive reach (see `AnimalPool._reach`), which lets them eat fruit and nuts from part of the woody reserve.

**Spread and competition (`_spread`):**

- A seed lands up to `1 + floor(rand*(1+disp*4))` tiles away, on a tile of the same water/land type, never on its own tile.
- The child genome mutates at rate 0.2 with sd 0.025 and is handed to `plantSeed`. It targets the slot `slotOf(child, water, 0, kind)` on the target tile, and competes only with the resident of that slot.
- A fungus resident's `resK` is `cap*_fungusK`, and a fungus child's `childK` is multiplied by `_fungusK` for the target tile.
- When a plant and a fungus compete for an understory slot under a canopy, the plant side is shaded:
  - A plant resident's `resK` is `cap*light`.
  - A plant child's `childK` is multiplied by `1 - shadeFrac*(1 - shadeGene)`.
- The child needs `childK ≥ 0.04` to establish. A non-finite `childK` (a tile with NaN climate) is rejected.
- Cheap rejection before the exact capacity: `formCap*peak*habit` is an upper bound on `childK` (both Gaussian fits are at most 1). A child whose bound already loses is dropped without the two `exp` calls, and `childK` is then `bound * gaussFit(temp) * gaussFit(moist)` without allocating a traits object.
- When the target slot already has a resident:
  - The resident's strength is `resK*(0.45+0.55*fullness)*(0.5+0.5*health)`, so weakened plants are easier to displace.
  - The invader's strength is `childK*0.85`.
  - The invader can only win if it is stronger, and then only with probability `(inv-res)/inv`.
- When the resident belongs to the same species, the child replaces it only if it is more than 2% better, and then only 50% of the time. The 50% coin is drawn before mutation, when the same-slot resident on the target tile already belongs to the parent's species; this skips most mutation work, since about 90% of spread attempts hit a same-species neighbour.
- A freshly taken slot starts at biomass 0.04. The displaced resident's biomass returns to the soil.

**Life stages and seed bank:**

- `_set` rolls `life` (years from `PLANT_LIFE_BASE + PLANT_LIFE_WOOD*wood^2`, or `FUNGUS_LIFE`, times ±`LIFE_JITTER`), sets `age` 0 and `floor` 0, and stores the mature floor in `floorM`. Founders (`_seedFounder`) get a random age in `0..OLD_FRAC*life` and their floor at once when mature.
- `_assign` keeps `age` (and the mature floor) on an in-place same-species upgrade, so a slightly better sibling does not restart the plant as a seedling.
- `graze` kills a bitten land seedling left below `SEEDLING_KILL` biomass (`grazedSeedlings++`, `_clear`), understory first, then canopy. Water-tile seedlings are never killed by a bite (Part 3b slice 2).
- A slot that dies of old age first calls `_selfSeed(p, i, id)`: its own genome and species go into tile `i`'s seed bank at density `OLD_SEED` (1), replacing whatever was banked, so a tile whose only plants were founders (glacier, alpine, tundra, water) can regrow the same lineage.
- `_bank(j, genome, off, id)` adds `SEED_ADD` density (capped at `SEED_MAX`) and replaces the stored genome and species with probability `SEED_ADD/(density+SEED_ADD)` (always on an empty bank). `_spread` banks the parent genome on a same-species skip, and `plantSeed` banks failed viable seeds.
- `_germinate(i, d, wk, tick)` clears the bank when its species is extinct. If the target slot of the banked genome is empty, it germinates with probability `GERM_P*d*wk` through `plantSeed(..., false)`; success multiplies the density by `GERM_USE` and counts `germinated`, failure clears the bank.

**Blight:**

- `_set` and `_clear` release any blight on the slot through `disease.releasePlant(p)` and reset `blightImm`.
- In `step`, a blighted plant whose health is already at or below 0 dies first (`disease.blightDeath`, `_clear`, `blighted++`). Blight damage itself is applied to `health` by `DiseaseLayer._blightPass`.
- A plant that dies in the low-satisfaction branch while blighted counts as `blighted`, not `starved`.

**Nutrient cycling:** every death returns its biomass plus its fruit stock to litter through `soil.returnMatter`. This covers starvation, low-K decline (via `_clear`) and replacement by a fresh invader (in `_assign`). Litter becomes nutrients through soil decay and decomposer fungi.

**Speciation (`_assign`):**

- A child genome more than `PLANT_SPECIATION` from its parent species' `mean` first tries `matchDaughter` at the full threshold.
- If no daughter or sibling matches, it founds a new species and logs the event, but only when `registry.canSplit(parentSp, PLANT_SPLIT_MIN_POP)`. Otherwise the child stays in the parent species.
- Water plants get hues 150–205° and land plants 62–150°. Fungi and flowers take their hue from gene 12. Lightness drops with woodiness.

---

## Soil (`js/sim/soil.js`)

`SoilLayer(world)` holds a finite nutrient store per tile. `PlantLayer` owns one at `plants.soil` and calls `soil.step(plants)` at the start of every `plants.step`. It has no DOM dependency.

### Constants

| Constant | Value | Use |
| --- | --- | --- |
| `SOIL_MAX` | 1.5 | Upper clamp on a tile's nutrient store. The Nutrients view divides by it. |
| `SOIL_REFILL` | 0.003 | Per-tick relaxation of the store toward the tile's base fertility. |
| `SOIL_UPTAKE` | 0.0004 | Demand per unit biomass, before the root factor. |
| `SOIL_SUPPLY` | 0.006 | How much pressure one unit of stored nutrient can satisfy. |
| `SOIL_SAME_TILE_W` | 1.5 | Weight of the other slot's demand on the same tile. |
| `SOIL_NEIGHBOUR_W` | 0.35 | Weight of each of the 8 neighbouring tiles' demand. |
| `SOIL_RECYCLE` | 0.15 | Fraction of decayed litter returned to the store. |
| `LITTER_DECAY` | 0.004 | Per-tick fraction of litter that decays. |
| `LITTER_INIT` | 0.2 | Starting litter as a fraction of `base`. |
| `CARCASS_FRAC` | 0.6 | Fraction of the non-carrion part of a carcass that becomes litter. |
| `CARRION_SHARE` | 0.6 | Fraction of a dead animal's mass that becomes carrion. |
| `CARRION_DECAY` | 0.005 | Per-tick fraction of carrion that rots into litter. The plan value was 0.02; it was lowered in tuning so carrion lasts long enough for scavengers to find it. |

### Fields

- `base` (Float32 `n`): the tile's fertility, clamped to `0..SOIL_MAX`. A non-finite fertility value reads as 0.
- `nutrient` (Float32 `n`): the current store. It starts at `base`.
- `litter` (Float32 `n`): dead matter. It starts at `base*LITTER_INIT`.
- `totalLitter`: the map-wide litter sum, refreshed each step.
- `carrion` (Float32 `n`): fresh carcass meat that animals can eat. It starts at 0.
- `totalCarrion`: the map-wide carrion sum, refreshed each step. The ecosystem exposes it as `stats.carrion`.
- `own` (Float32 `2n`), `tile` and `row` (Float32 `n`): per-tick scratch.
- `carrionCell` (Float32, one per 6×6 animal grid cell, `ccols = ceil(W/6)`): the carrion sum per cell, rebuilt by `_buildCarrionCells()` every `CARRION_CELL_EVERY` (10) steps. Scavengers use it in `_pickCarrion`.

### `step(plants)`

1. Own demand per plant: `own[p] = biomass[p] * SOIL_UPTAKE * (0.5 + root[p])`. Empty slots have biomass 0, so they add nothing; a non-finite result is treated as 0. Understory fungi (`kind` 1) draw nothing. `tile[i]` is the sum over both slots.
2. Neighbour demand: a separable 3×3 box sum of `tile` (a row pass, then a column pass), minus the centre, clipped at the map edge.
3. Pressure on plant `p` on tile `i`: `own[p] + SOIL_SAME_TILE_W*own[other slot] + SOIL_NEIGHBOUR_W*Σ tile[8 neighbours]`.
4. Satisfaction: `sat[p] = min(1, nutrient[i]*SOIL_SUPPLY/pressure)`, or 1 when the pressure is 0. A fungus always gets `sat = 1`.
5. Withdrawal: `nutrient[i] -= Σ own*sat` over both slots, floored at 0, then `nutrient += (base - nutrient)*SOIL_REFILL`.
6. Carrion rot: `dc = carrion*CARRION_DECAY` leaves the carrion and is added to `litter` on the same tile, before that tile's litter decay runs.
7. Litter decay: `d = litter*LITTER_DECAY` leaves the litter, and `d*SOIL_RECYCLE` is added to the nutrient store, clamped to `SOIL_MAX`.

Plants on crowded, heavily rooted or poor ground see lower satisfaction, which drains their health (see Plants, `step`).

### `returnMatter(i, amount)`

Adds `amount` to `litter[i]`. It no longer goes straight to nutrients: the matter reaches the store through litter decay and decomposer fungi. Non-positive or non-finite amounts are ignored.

### `consumeLitter(i, amount)`

Removes up to `amount` from `litter[i]` and returns what was taken (0 for a non-positive or non-finite amount, or an empty tile). Detritivore bugs call it.

### `addCarcass(i, mass)`

Splits the carcass. `mass*CARRION_SHARE` goes to `carrion[i]`, and the rest follows the old litter path: `mass*(1-CARRION_SHARE)*CARCASS_FRAC` goes to `litter[i]`. `animals._kill` calls it with the animal's full mass, or with `mass*CARCASS_EATEN` when the animal was eaten by a predator.

### `consumeCarrion(i, amount)`

Removes up to `amount` from `carrion[i]` and returns what was taken (0 for a non-positive or non-finite amount, or an empty tile). Animals call it in their carrion eat block.

---

## Animals (`js/sim/animals.js`)

Animals are agents stored as structure-of-arrays. There is one typed array per field, indexed by slot.

- A counting-sort spatial grid is rebuilt every tick for neighbour queries.
- A single continuous `diet` gene spans herbivore, omnivore and carnivore. Trophic roles therefore evolve rather than being hard-wired per system.
- Since v3 Part 1 slice 1 every lineage also has a fixed class (fish, amphibian, reptile, mammal, bird, invertebrate). The class never evolves: founders set it and every daughter species inherits it.

### Constants

- **`AG = 19`**: the number of animal genes. Gene layout by index, with its named index constant:

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
  | 9 | disease resistance (every archetype starts at 0.15) | `G_RES` |
  | 10 | scavenging (0.1 for most archetypes, 0.65 for the crustacean, 0.8 for the carrion eater) | `G_SCAV` |
  | 11 | territoriality | `G_TERR` |
  | 12 | herding | `G_HERD` |
  | 13 | cold-bloodedness | `G_COLD` |
  | 14 | drought tolerance | `G_DRY` |
  | 15 | nesting | `G_NEST` |
  | 16 | pack hunting | `G_PACK` |
  | 17 | display | `G_DISPLAY` |
  | 18 | choosiness | `G_CHOOSY` |

  Genes 15–18 were appended in v3 Part 1 slice 1 as groundwork. They mutate, count in `geneDistance` and are saved. Slice 3 gave gene 15 (nesting) its effect, see Nests and dens below; genes 16–18 are still neutral until slice 4. Most founders use `[nest, pack, display, choosy]` = `0.3, 0.15, 0.3, 0.3`; the carnivore founders raise pack to 0.4 (the seal 0.5), and the invertebrates use low values (nest 0.05–0.2, pack 0.05–0.1). Slice 3 raised the nest gene on chosen founders so nesting starts in several lineages: rabbit 0.55, fox 0.55, the boar-line omnivore 0.5, wolf 0.5, land scavenger 0.5, crocodile 0.5, reef fish 0.45, frog 0.45, sea turtle 0.45, and the birds 0.5 (seed), 0.42 (insect), 0.45 (fishing), 0.55 (raptor) and 0.35 (carrion). The deer, bison, arid runner, cold grazer and seal use 0.25, below `NEST_MIN`, so they start as non-nesters.

  Genes 11–14 were appended in Part 3 slice 2 as `[terr, herd, cold, dry]`: land herbivores `0.05, 0.6, 0.05, 0.3`, the land omnivore `0.35, 0.1`, land carnivores `0.5, 0.1`, water herbivores `0.05, 0.5`, the crustacean `0.35, 0.1`, water carnivores `0.5, 0.1`, the carrion eater `0.35, 0.1, 0.05, 0.3`.

- **`ANIMAL_WEIGHTS`** is `[1.3, 1, 0.7, 1.8, 1.2, 0.5, 0.8, 0.5, 0.8, 0.25, 0.9, 0.6, 0.6, 1.2, 0.6, 0.3, 0.3, 0.3, 0.3]`. Diet carries the most weight; the four slice 1 genes weigh 0.3 each. **`ANIMAL_SPECIATION`** is `0.18`. **`ANIMAL_SPLIT_MIN_POP`** is 12.
- **`GRID = 6`**: the spatial grid cell size, in tiles.
- **Classes (v3 Part 1 slice 1):**
  - **`ANIMAL_CLASSES`** is `['fish', 'amphibian', 'reptile', 'mammal', 'bird', 'invertebrate']`, with index constants `CLS_FISH` 0, `CLS_AMPH` 1, `CLS_REPT` 2, `CLS_MAMM` 3, `CLS_BIRD` 4 and `CLS_INVT` 5. Slice 2 added five bird founders.
  - **`CLASS_PLURAL`** is `['fish', 'amphibians', 'reptiles', 'mammals', 'birds', 'invertebrates']`, used by the disease jump log.
  - **`CLS_COLD`** holds the allowed cold-bloodedness range per class: `[0, 1]` fish, `[0.5, 1]` amphibians, reptiles and invertebrates, `[0, 0.45]` mammals and birds.
  - **`ANIMAL_ROLES`** is `['herbivore', 'omnivore', 'carnivore', 'scavenger']`, indexed by `roleIndex`.
- **Invertebrate constants (v3 Part 1 slice 1):**

  | Constant | Value | Use |
  | --- | --- | --- |
  | `INVERT_SIZE` | 0.45 | Size gene cap for invertebrates, applied by `_clampClass`. |
  | `INVERT_BUG` | 1.6 | `_bugEff` for a land invertebrate with diet at least 0.5 (spiders). |
  | `INVERT_THIRST` | 0.5 | Water-loss multiplier for invertebrates; they also refill at `AMPH_DRINK_WET` like amphibians. |
  | `LITTER_ENERGY` | 2.4 | Energy per unit of litter eaten by land invertebrate grazers (snails). |
  | `JELLY_SPEED` | 0.3 | A water invertebrate carnivore with speed gene below this is a `jelly`; its attack `speedF` is a flat 0.5 instead of the speed ratio. |
  | `INVERT_PREY` | 0.7 | Prey-mass limit for invertebrate hunters in `_nearest` mode 1 (prey mass at most `0.7×` their own), replacing the 1.8 and 0.6 diet limits. |
- **Energy values:** `PLANT_ENERGY` is 3.2 per unit of biomass eaten, and `MEAT_ENERGY` is 20 per unit of prey mass.
- **Fruit, poison and aversion constants:**

  | Constant | Value | Use |
  | --- | --- | --- |
  | `FRUIT_ENERGY` | 8 | Energy per unit of fruit, before sweetness and `plantEff`. |
  | `FRUIT_LURE` | 3 | Weight of fruit in the forage score. |
  | `BERRY_MASS` | 1.2 | Animals lighter than this can eat understory berries without reach. |
  | `FRUIT_MIN_BITE` | 0.3 | Fruit must exceed `bite*FRUIT_MIN_BITE` to be eaten instead of grazing. |
  | `CARCASS_EATEN` | 0.35 | Carcass mass fraction left when a predator eats its prey. |
  | `CARRION_LURE` | 6 | Weight of `carrion*carrionEff` in the forage score. The plan left the value open; 2 was tried first, and 6 was kept after tuning. |
  | `SCAV_LURE` | 3 | The carrion lure is multiplied by `1 + SCAV_LURE*scav`. |
  | `SCAV_BITE` | 2 | The carrion bite is `bite*(1 + SCAV_BITE*scav)`. |
  | `SCAV_SAMPLES`, `SCAV_RANGE` | 12, 1.5 | An animal with `scav > 0.5` takes this many forage samples (instead of 8) over `range*SCAV_RANGE`. |
  | `SCAV_HUNT` | 0.35 | An animal with `scav > 0.5` only hunts below this fraction of `emax` (others hunt below 0.6). |
  | `MILD_LOSS` | 0.25 | Mild poison energy loss per unit of excess potency, times `emax`. |
  | `NEURO_TICKS` | 25 | Confusion length after a neurotoxin. |
  | `LETHAL_P` | 0.5 | Death chance per unit of excess potency for a lethal toxin. |
  | `AVERSION_DECAY` | 0.015 | Multiplicative aversion fade per `refreshSpeciesMeans`. |
  | `MIMIC_HUE` | 0.07 | Hue distance within which an aversion also covers look-alikes. |
  | `AVERSION_LOG_GAP` | 2400 | Minimum ticks between log entries for the same animal-and-fungus pair. |
- **Bug constants:**

  | Constant | Value | Use |
  | --- | --- | --- |
  | `BUG_MASS` | 1.4 | Only animals lighter than this eat bugs. |
  | `BUG_ENERGY` | 0.3 | Energy per unit of bug density eaten. |
  | `BUG_LURE` | 1 | Weight of edible bug density in the forage score. |
  | `BUG_DIET_PEAK` | 0.45 | Diet at which bug efficiency is 1. |
  | `BUG_DIET_MAX` | 0.66 | Diet at or above which bug efficiency is 0 (carnivores never eat bugs). |
  | `PARASITE_DRAIN` | 0.02 | Energy drain per unit of parasite load and mass. |
  | `PARASITE_DEATH_SHARE` | 0.08 | A starvation death counts as `parasite` when the drain exceeds this share of the tick's cost. |
  | `PARASITE_HOST_TOL` | 0.3 | Width of the parasite host-size match. |
  | `TILE_LOAD_SCALE` | 4 | `tileLoad` units per unit of animal mass. |
- **Disease constants:**

  | Constant | Value | Use |
  | --- | --- | --- |
  | `RES_COST` | 0.1 | Metabolism multiplier `1 + RES_COST*res`. |
  | `RES_EFFECT` | 0.85 | Resistance factor `1 - RES_EFFECT*res` on the sickness death chance and on infection (`disease.exposeAnimal`). |
  | `SICK_COST` | 0.5 | Extra energy cost per tick while infected, `SICK_COST*vir*mass^0.75`. |
  | `SICK_SLOW` | 0.4 | Speed multiplier `1 - SICK_SLOW*vir` while infected (in `_moveToward`). |
  | `SICK_DEATH` | 0.005 | Per-tick death chance `SICK_DEATH*vir*(1-RES_EFFECT*res)`. The plan kept 0.01; it was halved in Part 2 tuning because the rolling disease share reached 15–33% at year 10 and 27–52% at year 20. |
  | `IMMUNE_TICKS` | 900 | Ticks of immunity to a strain after recovering from it. |
  | `CONTACT_R` | 1.5 | Contact radius, in tiles. The plan's 2 was tuned back down. |
  | `CONTACT_K` | 0.35 | Contact exposure strength. |
  | `CONTACT_MAX` | 3 | Maximum contact rolls per infected animal per contact pass. The plan's 6 was tuned back down. |
  | `CROWD_K`, `CROWD_N` | 0.5, 6 | Crowding: each contact roll uses `CONTACT_K*(1 + CROWD_K*min(1, near/CROWD_N))`, where `near` is every live same-domain animal within `CONTACT_R`. |
  | `PREY_K` | 0.5 | Exposure strength for a predator killing infected prey. |
  | `CARCASS_K` | 0.1 | Exposure strength per unit of carcass load on the tile. |
  | `VECTOR_K` | 0.05 | Exposure strength per unit of vector load on the tile. |
  | `NATIMM_P` | 0.003 | Chance per newborn to gain innate immunity to the strain most prevalent in its parent species. |
  | `RES_NUDGE` | 0.02 | A parent that has recovered from a strain (`immune` set) adds this to its child's resistance gene after mutation, capped at 1. Partly Lamarckian, approved in the Part 3 plan. |
- **Domain, thirst, territory and herd constants (Part 3 slice 2):**

  | Constant | Value | Use |
  | --- | --- | --- |
  | `DOMAIN_BIT` | `[1, 2, 4, 8]` | `walk` bit per domain: land, water, amphibious, air (v3 Part 1 slice 2). |
  | `FEED_BIT` | `[1, 2, 4, 1]` | Tile bit an animal of each domain must have to graze, eat fruit or eat carrion; birds feed only on land tiles. |
  | `THIRST` | 0.02 | Base water loss per tick, `THIRST*(1-0.6*dry)*(0.6+temp+seasonT+droughtK)*(cold>0.5 ? 0.6 : 1)*(amph ? AMPH_DRY : 1)`. The plan's 0.004 gave 0 thirst deaths; 5× was needed. |
  | `THIRSTY` | 0.35 | Below this `water`, an animal seeks water. |
  | `DRINK_WET`, `AMPH_DRINK_WET` | 0.6, 0.5 | Water refills to 1 on a tile with `waterDist <= 1` or `wet` above this. The plan's 0.35 let almost any rained-on tile refill. |
  | `AMPH_DRY`, `AMPH_RANGE`, `AMPH_DEPTH` | 2, 5, 0.35 | Amphibian water-loss multiplier; amphibians may stand on land within `waterDist <= AMPH_RANGE` and on non-ocean water shallower than `AMPH_DEPTH`. |
  | `DEHYDRATE_COST`, `DEHYDRATE_DEATH` | 2.5, 0.02 | At `water <= 0` the tick's cost is multiplied by 2.5 and a death roll runs. The plan's 0.004 was raised 5× in tuning. A starvation death while dehydrated also counts as `thirst`. |
  | `FRUIT_WATER`, `GRAZE_WATER`, `MEAT_WATER` | 0.15, 0.02, 0.2 | Water gained per fruit bite, graze bite, and kill or carrion bite. |
  | `WATERHOLE`, `WATER_SAMPLES` | 0.25, 8 | Forage lure `WATERHOLE/(1+waterDist)` for grazers (diet above 0.6 excluded); samples for `_pickWater`. |
  | `COLD_META`, `COLD_SLOW` | 0.225, 0.9 | Plan values 0.45 and 0.6; tuned to the ±50% limit because reptiles displaced every land group by year 35. Cold-blooded metabolism `*(1-COLD_META*cold)`; speed `*(1-COLD_SLOW*cold*(0.5-temp)*2)` below temperature 0.5. |
  | `TERR_MIN`, `TERR_EVERY`, `TERR_HOLD` | 0.5, 10, 30 | Territory gene threshold, stamp period and ownership lifetime in ticks. |
  | `TERR_RIVAL`, `TERR_BITE` | 0.3, 0.15 | Forage score `*TERR_RIVAL` on a tile owned by a rival of the same species or role; bite `*(1+TERR_BITE*homeK)` at home. |
  | `TERR_REPRO`, `TERR_COST` | 0.15, 0.08 | Reproduction cost `*(1-TERR_REPRO*homeK)`; metabolism `*(1+TERR_COST*terr)`. |
  | `HERD_MIN`, `HERD_PULL` | 0.4, 0.6 | Herd gene threshold and centroid pull. |
  | `HERD_SAFE`, `HERD_SAFE_N` | 0.5, 6 | Attack chance `*(1-HERD_SAFE*herd*min(1, n/HERD_SAFE_N))` against herding prey. |
  | `HERD_CONTACT` | 0.6 | Disease contact `*(1+HERD_CONTACT*herd)`. |
- **Life stage constants (Part 3b slice 1):**

  | Constant | Value | Use |
  | --- | --- | --- |
  | `MATURE_BASE`, `MATURE_SIZE` | 90, 160 | `mature = MATURE_BASE + MATURE_SIZE*size` (was `45 + 110*size`). |
  | `JUV_MIN` | 0.4 | Growth factor at birth; `gf = JUV_MIN + (1-JUV_MIN)*min(1, age/mature)`. |
  | `ELDER_AGE`, `ELDER_MIN` | 0.75, 0.6 | Elders are `age > ELDER_AGE*maxAge`; `ef` falls linearly from 1 there to `ELDER_MIN` at `maxAge` and stays there. |
  | `ELDER_FERTILE` | 0.9 | No breeding once `age >= ELDER_FERTILE*maxAge`. |
  | `ELDER_INFECT` | 0.5 | Infection chance `*(1 + ELDER_INFECT*(1-ef)/(1-ELDER_MIN))`, so ×1.5 at `ef = 0.6` (applied in `DiseaseLayer.exposeAnimal`). |
  | `OLD_START`, `OLD_P`, `OLD_K` | 0.85, 0.0015, 12 | Old-age death chance per tick `OLD_P*exp(OLD_K*(age/maxAge - OLD_START))` once `age/maxAge > OLD_START` (about 0.9% at `maxAge`). Replaces the flat 5% past `maxAge`. |
  | `FOLLOW_EVERY` | 4 | Live-born juveniles step toward an adult of their species every 4 ticks. |
- **Balance constants (Part 3b slice 2):**

  | Constant | Value | Use |
  | --- | --- | --- |
  | `GEN_TAX`, `GEN_LO`, `GEN_HI` | 0.22, 0.2, 0.8 | Generalist tax. `_genT(i)` maps diet to 0 at or below `GEN_LO`, 1 at or above `GEN_HI`, linear between. Plant energy (graze and fruit) `*(1-GEN_TAX*t)`; meat energy (kills, carrion) `*(1-GEN_TAX*(1-t))`. Pushes diets away from the middle, so herbivores do not drift toward 0.33. |
  | `COLD_UPKEEP` | 0.15 | An animal with `cold > 0.5` pays `meta*gf*COLD_UPKEEP*(0.5-et)*2` extra per tick when `et = temperature + seasonT` is below 0.5. |
  | `DRY_COST` | 0.08 | Metabolism `*(1+DRY_COST*dry)` in `_decode`, so drought tolerance is no longer free. |
  | `SCAV_PLANT` | 0.5 | A land animal with `scav > 0.5` gets plant energy `*(1-SCAV_PLANT*scav)`, so high-scav animals cannot live as omnivores. |
  | `EGG_LURE` | 4.5 | Forage score bonus in `_pickForage` for a sampled tile holding eggs (`eggs.head[j] >= 0`), for animals with diet at least 0.33. |
  | `HERB_GRAZE` | 1.15 | Plant energy multiplier for animals with diet below 0.33 (herbivore graze efficiency). |
- **Bird constants (v3 Part 1 slice 2):**

  | Constant | Value | Use |
  | --- | --- | --- |
  | `BIRD_SIZE` | 0.6 | Size gene cap for birds, applied by `_clampClass`. |
  | `FLY_META` | 1.3 | Cost multiplier while `fly` is set; a perched bird pays the normal cost. |
  | `FLY_MOVE` | 0.15 | A bird that moved more than this in a tick, or is off a land tile, is flying. |
  | `BIRD_SPEED`, `BIRD_SENSE` | 1.45, 1.4 | `spd` and `range` multipliers in `_decode`. Birds hold no territory but keep herding. |
  | `BIRD_BITE`, `BIRD_FRUIT` | 0.85, 1.4 | Graze bite multiplier, and fruit energy multiplier (birds also reach canopy fruit). |
  | `BIRD_CROWD` | 8 | Same-species grid-cell limit for bird breeding (others use 14). |
  | `BIRD_ESCAPE` | 0.35 | Attack chance multiplier when a land or amphibious predator takes a perched bird. |
  | `BIRD_BUG`, `BIRD_BUG_ENERGY`, `BIRD_BUG_LO`, `BIRD_BUG_SPAN` | 6, 0.9, 0.25, 0.15 | `_bugEff` ramps up to `×BIRD_BUG` between diet 0.25 and 0.40; bird omnivores get `BIRD_BUG_ENERGY` per unit of bug eaten. |
  | `BIRD_PREY` | 0.8 | Raptor prey-mass limit (prey at most `0.8×` its own mass). |
  | `BIRD_FISH_MASS`, `BIRD_DEPTH`, `BIRD_FISH_LURE`, `BIRD_STRIKE` | 1.25, 0.5, 0.6, 0.1 | Fishing birds take water and amphibious prey lighter than 1.25 in water shallower than 0.5, are lured to shallows by `tileLoad`, and strike with a flat cover of 0.1 in place of water cover. |
  | `FISHER_HUNT`, `FISHER_RANGE` | 0.85, 1.5 | Fishing birds hunt below this energy fraction, over `range*1.5`. |
  | `BIRD_SEED` | 1.8 | Seed carry time multiplier; a seed over water waits for land in `_dropSeed`. |
  | `BIRD_PERCH`, `BIRD_REST_P`, `PERCH_COVER` | 1.4, 0.6, 0.25 | Forage score bonus on a perch, chance per tick that a fed perched bird stays, and the plant cover that makes a land tile a perch. |
  | `MIGRATE_RANGE`, `MIGRATE_HOME` | 36, 3 | Maximum migration offset from `oy` in tiles, and the dead band around the goal. |
  | `BIRD_DROP_K`, `BIRD_DROP` | 0.03, 0.35 | Chance per contact tick that an infected bird stamps its strain into the vector plane, and the vector load cap for that drop. |
  | `BIRD_NICHES` | `['seed', 'insect', 'fisher', 'raptor', 'carrion']` | Bird niche keys, indexed by `birdNiche(diet, scav, nic)` (fisher when `nic`, else by `roleIndex`). |
- **Nest and den constants (v3 Part 1 slice 3):**

  | Constant | Value | Use |
  | --- | --- | --- |
  | `NEST_MIN` | 0.4 | Nest gene above which a mature animal picks a home. |
  | `NEST_EVERY` | 10 | Ticks between home-pick attempts. |
  | `NEST_SAMPLES`, `NEST_RANGE` | 8, 8 | `_pickHome` scores the animal's own tile plus 8 random tiles within `min(range, 8)`. |
  | `NEST_NEAR` | 1.5 | Distance that counts as being at home (breeding, cleaning, shelter, den cover). |
  | `NEST_FAR` | 24 | An animal farther than this from its home drops it. |
  | `NEST_COST` | 0.06 | Metabolism `*(1+NEST_COST*nest)` in `_decode`, so the gene is not free. |
  | `NEST_DEPTH` | 0.4 | Water nesters need a water tile shallower than this. |
  | `NEST_WARM`, `NEST_OPEN` | 0.45, 0.4 | Reptile nest site: temperature at least 0.45, cover below 0.4, not wet. |
  | `NEST_TALL` | 0.62 | A bird nest scores best in a plant whose wood gene is at least this (a tree). |
  | `DEN_SITE` | 0.3 | Mammal den site: cover at least 0.3, or the rough walk bit 32 (score 0.8). |
  | `DEN_R` | 4 | Natal young (`home` 3) with energy above `GUARD_E` stay within 4 tiles of the den. |
  | `DEN_COVER` | 0.35 | Attack cover bonus `DEN_COVER*nest` for prey at its den, or natal young at their den (`home` 2 or 3, within `NEST_NEAR`). |
  | `DEN_SHELTER` | 0.5 | Climate and cold-upkeep cost `*(1-DEN_SHELTER*nest)` for natal young at the den. |
  | `DEN_PARA` | 1 | Parasite drain `*(1+DEN_PARA)` for natal young at the den. |
  | `DEN_CONTACT` | 0.3 | Disease exposure per roll to animals sharing an infected animal's home (`_denContact`). |
  | `GUARD_R`, `GUARD_E` | 3, 0.45 | A nester with eggs at its nest and energy above `GUARD_E` of its cap stays within 3 tiles and guards. |
  | `CLEAN_K` | 0.03 | A nester at home removes `CLEAN_K*nest` of the parasite swarm on its home tile (`bugs.clean`). |
  | `FEED_EVERY`, `FEED_E`, `FEED_R`, `FEED_TOP`, `FEED_EFF` | 5, 0.5, 8, 0.8, 0.8 | Every 5 ticks a nester with energy above half its cap feeds its natal young within 8 tiles up to 80% of their cap, at 80% efficiency (`_feedYoung`). |
  | `EGG_VERT_K` | 0.3 | Chance that an infected parent's nest clutch carries its strain to the hatchlings. |
- **`ANIMAL_ARCHETYPES`**: 29 founders, each given as `{domain, cls, n, g}`. Slice 1 replaced the `role` tags with `cls`; migrations now find archetypes by class, `roleIndex` and domain.
  - Land: hopper, browser, grazer, arid runner, cold grazer, omnivore, small hunter and pack hunter.
  - Water: shoal fish, reef fish, crustacean, pike and shark.
  - Part 3 slice 2 appended eight founders (`n` 16): the amphibious frog, newt and salamander, and the land lizard, tortoise, monitor and snake (cold 0.8–0.85, dry 0.7–0.8). The crocodile is also amphibious (domain 2) but has `cls: CLS_REPT` since slice 1.
  - The carrion eater (land, `n` 18, `CLS_MAMM`) has genes `[0.38, 0.45, 0.6, 0.45, 0.5, 0.65, 0.6, 0.6, 0.2, 0.3, 0.8, …]`. The plan asked for speed 0.55, sense 0.78, diet 0.55, temp 0.55, tol 0.5, fec 0.55 and armor 0.3. That version starved: it paid for a high metabolism, and carrion made up only 2–4% of its income. Tuning lowered its running costs and widened its climate range.
  - Class mapping: the land herbivores, omnivore, hunters and carrion eater are mammals; the four lizard-line founders and the crocodile are reptiles; frog, newt and salamander are amphibians; the water grazers, pike and shark are fish; the crustacean is an invertebrate (its cold gene went from 0.05 to 0.5 to fit `CLS_COLD`).
  - v3 Part 1 slice 1 appended seven founders after the reptiles, so the earlier ones are placed in the same order:

    | Founder | Domain | Class | `n` | Category |
    | --- | --- | --- | --- | --- |
    | Sea turtle | water | reptile | 14 | `seaturtle` (herbivore, armour 0.75, cold 0.7) |
    | Seal | water | mammal | 8 | `seal` (carnivore, pack 0.5) |
    | Urchin | water | invertebrate | 30 | `urchin` (size 0.15, speed 0.15, armour 0.8) |
    | Octopus | water | invertebrate | 12 | `octopus` (fast, sense 0.75, diet 0.8) |
    | Jellyfish | water | invertebrate | 14 | `jelly` (speed 0.15, diet 0.75, toxR 0.7) |
    | Snail | land | invertebrate | 30 | `snail` (size 0.06, speed 0.12, armour 0.6) |
    | Spider | land | invertebrate | 24 | `spider` (size 0.08, diet 0.8, dry 0.6) |

  - v3 Part 1 slice 2 appended five bird founders (`domain: 'air'`, `cls: CLS_BIRD`), given here as `size, speed, sense, diet, scav`:

    | Founder | `n` | Genes | Category |
    | --- | --- | --- | --- |
    | Seed bird | 40 | 0.14, 0.55, 0.5, 0.12, 0.1 | `seedbird` |
    | Insect bird | 40 | 0.1, 0.55, 0.55, 0.45, 0.1 | `insectbird` |
    | Fishing bird (`nic: 1`) | 20 | 0.32, 0.42, 0.55, 0.78, 0.1 | `wader` |
    | Raptor | 12 | 0.42, 0.7, 0.85, 0.9, 0.1 | `raptor` |
    | Carrion bird | 10 | 0.55, 0.45, 0.9, 0.7, 0.85 | `vulture` |

    The land scavenger founder stays a mammal (hyena or jackal).
- **`domainIndex(d)`** maps `'land'` 0, `'water'` 1, `'amph'` 2 and `'air'` 3.
- **`birdNiche(diet, scav, nic)`** returns the `BIRD_NICHES` index: 2 (fisher) when `nic`, else 0 seed, 1 insect, 3 raptor or 4 carrion by `roleIndex`.
- **`dietRole(diet)`** returns `herbivore` below 0.33, `omnivore` below 0.66, and `carnivore` otherwise.
- **`roleIndex(diet, scav)`** returns 3 (scavenger) when diet is at least 0.33 and `scav > 0.5`, else 0, 1 or 2 by the `dietRole` split. It is used for `sp.role`, the per-class role stats and migrations, in every domain (the old scavenger test was land only).
- **`animalCategory(g, domain, cls = CLS_MAMM, nic = 0)`** keys off class first, then domain, role and size (`scav` below means diet at least 0.33 and `scav > 0.5`):

  | Class | Categories |
  | --- | --- |
  | Bird | `wader` when `nic`; else `vulture` when `scav`; herbivore `seedbird` (size below 0.4) or `fowl`; omnivore `insectbird`; carnivore `raptor` |
  | Invertebrate, water | herbivore `urchin`; omnivore or scavenger `crab`; carnivore `jelly` (speed gene below `JELLY_SPEED`) or `octopus` |
  | Invertebrate, land | `snail` (diet below 0.5) or `spider` |
  | Fish | herbivore `fish` (size below 0.45) or `ray`; omnivore `reeffish`; carnivore `pike` (size below 0.58) or `shark` |
  | Amphibian | herbivore `newt`, omnivore `frog`, carnivore `salamander` |
  | Reptile, water or amphibious | herbivore `seaturtle`, others `crocodile` |
  | Reptile, land | herbivore `tortoise`, omnivore `lizard`, carnivore `snake` (size below 0.45) or `monitor` |
  | Mammal, water | herbivore `manatee`, others `seal` |
  | Mammal, land | `carrion` when `scav`, whatever its size; else herbivore `rabbit`, `deer` or `bison`, omnivore `mouse`, `boar` or `bear`, carnivore `fox`, `wolf` or `bigcat` |

  The old water `turtle` category is gone (replaced by `ray` for fish and `seaturtle` for reptiles), and the amphibious `crocodile` now comes from the reptile class.
- **`animalIcon(category, id)`** picks `sp.icon` from `ANIMAL_ICON_VARIANTS` by `id % variants.length`, so a species keeps the same look across `refreshSpeciesMeans` recomputes. The first entry is always the base icon. Slice 1 filtered the lists by class: bird icons (`owl`, `hawk`, `chicken`, `crow`, `vulture`) left the mammal lists until slice 2 adds birds, sea mammals (`seal`, `orca`, `manatee`) only appear on water mammals, and invertebrate skins moved to the invertebrate categories:

  | Category | Variants |
  | --- | --- |
  | fox | fox, weasel |
  | wolf | wolf, coyote |
  | bigcat | bigcat, tiger |
  | rabbit | rabbit, squirrel |
  | deer | deer, horse, goat, kangaroo |
  | bison | bison, cow, elephant, moose |
  | mouse | mouse, squirrel |
  | boar | boar, raccoon, badger, monkey |
  | bear | bear, ape |
  | carrion | hyena, jackal |
  | manatee | manatee |
  | seal | seal, orca |
  | crab | crab, lobster, hermitcrab, shrimp |
  | urchin | urchin, seasnail, clam |
  | octopus | octopus, squid |
  | jelly | jellyfish |
  | snail | snail, slug |
  | spider | spider, scorpion, centipede |
  | fish | fish, eel, seahorse |
  | ray | ray |
  | reeffish | puffer, fish |
  | pike | pike, barracuda |
  | shark | shark, swordfish |
  | frog | frog, toad |
  | newt | newt, axolotl |
  | salamander | salamander, axolotl |
  | crocodile | crocodile |
  | seaturtle | turtle |
  | tortoise | tortoise, turtle |
  | lizard | lizard |
  | snake | snake |
  | monitor | monitor |
  | seedbird | sparrow, parrot |
  | fowl | chicken |
  | insectbird | swallow, crow |
  | wader | heron, gull, duck |
  | raptor | hawk, eagle, owl |
  | vulture | vulture |

  Slice 2 returned the bird icons (`owl`, `hawk`, `chicken`, `crow`, `vulture`) to the bird categories and removed `starfish` from the octopus list. A species whose `id % length` changes because its list changed gets a different icon than before.
- **`ANIMAL_CATEGORY_LABEL`** maps each category to its UI label. `carrion` is "Scavenger" and `crab` is "Sea scavenger". Slice 1 added `ray` "Large grazing fish", `reeffish` "Omnivorous fish", `manatee` "Sea mammal", `seal` "Marine predator", `urchin` "Sea grazer", `octopus` "Cephalopod", `jelly` "Drifting stinger", `snail` "Snail", `spider` "Arachnid hunter" and `seaturtle` "Sea turtle", and dropped `turtle`. Slice 2 added `seedbird` "Seed bird", `fowl` "Ground bird", `insectbird` "Insect bird", `wader` "Fishing bird", `raptor` "Raptor" and `vulture` "Carrion bird".

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
| `meta` | Metabolism per tick, `0.05*mass^0.75*(1 + 0.9*speed^2 + 0.35*sense + 0.3*armor + 0.2*toxR + 0.15*tol)*(1 + RES_COST*res)`. |
| `mature` | Maturity age, `MATURE_BASE + MATURE_SIZE*size` (`90 + 160*size`). |
| `maxAge` | `500 + 1300*size`. |
| `litter` | `1 + round(3*fecundity)`. |
| `pT`, `tol` | Preferred temperature, and tolerance `0.08 + 0.3*tempTol`. |
| `toxR`, `armor`, `diet` | Copied from the genes. |
| `bite` | Biomass per grazing bite, `0.058*mass^0.75`. |
| `carrionEff` | `meatEff*(0.2 + 0.8*scav)`: energy efficiency on carrion. |
| `scav` | Copied from the scavenging gene. |
| `terr`, `herd`, `cold`, `dry` | Copied from genes 11–14; `herd` is 0 when `terr > TERR_MIN`. |
| `hr` | Home radius `2 + 5*size`. |
| `water` | Hydration 0..1, set to 1 at spawn. Water animals skip thirst. |
| `hx`, `hy` | Home centre, or -1 when the animal holds no territory. |
| `gf` | Growth factor, set by `_stage(i)` at spawn and at the start of each animal's tick: `JUV_MIN + (1-JUV_MIN)*age/mature` for juveniles (`age < mature`), else 1. |
| `ef` | Elder factor, set by `_stage(i)`: 1 until `ELDER_AGE*maxAge`, then linear down to `ELDER_MIN` at `maxAge`. |
| `oy` | Home latitude for bird migration: the spawn latitude, replaced by the nest row when a bird takes a nest (slice 3). |
| `nx`, `ny` | Home (nest or den) centre, or -1 when `home` is 0. |

Int32 fields (`ANIMAL_FIELDS_I`):

| Field | Meaning |
| --- | --- |
| `sp` | Species id. |
| `uid` | Unique id per individual. |
| `cool` | Cooldown ticks after hunting or breeding. |
| `ttl` | Ticks left on the current target or state. |
| `face` | Facing: `+1` is right and `-1` is left. |
| `domain` | 0 is land, 1 is water, 2 is amphibious, 3 is air (birds). |
| `cls` | Class index (`CLS_*`), copied from `sp.cls` in `spawn`. |
| `alive` | 1 while alive. |
| `state` | 0 idle, 1 grazing, 2 seeking food, 3 hunting, 4 fleeing, 5 seeking water, 6 heading home. |
| `seedSp`, `seedTtl` | The plant species whose seed is being carried, and the ticks until it drops. |
| `confuse` | Ticks of neurotoxin confusion left. |
| `strain` | Infecting strain id, or 0. |
| `itime` | Ticks of infection left. |
| `immune`, `imTime` | The strain last recovered from, and the ticks of immunity to it left. |
| `natImm` | A strain id this animal is innately immune to, or 0. Inherited from either parent. |
| `parent` | The `uid` of the parent for a live-born animal, or 0 (founders, migrants and hatchlings). Only a non-zero `parent` juvenile follows adults. Since slice 3, `_feedYoung` matches natal young to their parent by this uid. |
| `fly` | 1 while a bird is flying (set each tick from `FLY_MOVE` and the tile), 0 when perched or not a bird. |
| `nic` | Fishing-bird lineage flag, copied from `sp.nic` in `spawn`. |
| `home` | 0 none, 1 nest (egg layers), 2 den (live bearers), 3 natal young of a nest or den. |

All five disease fields are initialised to 0 in `spawn`.

The remaining structures are:

- **`genome`**: a `Float32Array(cap*AG)`. Slot `i` uses `i*AG … i*AG+AG-1`.
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
  | +8 | Air: every in-map tile, glacier included (slice 2). |
  | +16 | Perch: beach and cliff tiles (slice 2). |
  | +32 | Rough: hills, badlands, mountains and cliff, a den site for mammals (slice 3). |

  `_perch(j)` is true on a land tile with bit 16 or cover above `PERCH_COVER`. Bit 4 (amphibious) is set by `setWeather(Wx)` on non-ocean water tiles shallower than `AMPH_DEPTH` and on land tiles with `waterDist <= AMPH_RANGE` (all land when there is no weather layer); tiles with neither the land nor the water bit are skipped, so glacier gets no amphibious bit. `canStand(domain, x, y)` tests `walk & DOMAIN_BIT[domain]`.
- **Counters:**
  - `count` is the number of live slots.
  - `maxAnimals` is 7000.
  - `deaths` holds `{starved, eaten, old, poison}`.
  - `births` is reset every step.
  - `aversionEvents` counts every time an aversion crosses 0.5.
  - `birdMigrants` counts migration starts, with `_migLogged` (a Map of species id to year) limiting the log to once per species per year.
- **`seedGenome`**: a `Float32Array(PG)` scratch buffer for seed drops.
- **Bug fields:**
  - `tileLoad` (Uint16 `n`): rebuilt each tick as the sum of `round(mass*TILE_LOAD_SCALE)` per tile, capped at 65535. It feeds the parasite trace.
  - `parasiteLoad` and `parasiteHost` (Float32 `n`): written by `BugLayer.step` (load `density*appetite` and the parasite's host-size gene).
  - `bugs`: the `BugLayer`, or `null`. `deaths` also holds `parasite`.
- **Disease fields:** `disease` is the `DiseaseLayer`, or `null`. `deaths` also holds `disease`.
- **`eggs`**: the `EggPool`, or `null` (set by the ecosystem).
- **Weather and territory fields:** `weather` (the `WeatherLayer`, or `null`, set by `setWeather`); `deaths.thirst`; `landDeaths` (every non-water death, from `_kill`); `terrSp`, `terrUid`, `terrUntil` (Int32 `n`) and `terrRole` (Uint8 `n`), the per-tile territory owner; `holders` (territory holders last step); `tick`; `_cx`, `_cy` (the centroid from `_localCount`).

### Public methods

- `spawn(sp, genome, gOff, x, y, energyFrac)`
- `newSpecies(genome, gOff, domain, parent, tick, origin, cls = parent ? parent.cls : CLS_MAMM, nic = parent ? parent.nic | 0 : 0)`. It sets `sp.nic` (the fishing-bird flag, inherited like `cls`). A daughter species' hue is offset 25–335° from its parent's, so relatives do not look alike. It sets `sp.aversion`, an array of `{hue, strength}` entries: a copy of the parent's, or `[]` for a founder. It sets `sp.cls` (fixed for the lineage; `_introduce` passes `arch.cls`, daughters inherit the parent's), `sp.category = animalCategory(g, domain, cls)` and `sp.role = ANIMAL_ROLES[roleIndex(diet, scav)]`, so `sp.role` can now be `'scavenger'`.
- `canStand`
- `setWeather(Wx)`: stores the weather layer and adds the amphibious walk bit.
- `step(tick)`
- `reassignSpecies(fromSp, toSp)` rewrites `sp[i]` for every slot below `count` and returns the living members moved. Used by the ecosystem merge pass.
- `refreshSpeciesMeans()`. It recomputes `category` (with `sp.cls`), `icon` and `role` (`roleIndex`) from the mean genome. It also sets `sp.infected` (the species' infected count) and fades every aversion by `1 - AVERSION_DECAY` and drops entries whose strength falls below 0.05.

### Per-tick behaviour (`step`)

The grid is rebuilt first. Then each animal runs through the steps below in order. Once one of steps 0–4 acts, the later behaviour steps are skipped.

- **Seed drop.** This happens before step 0: a carried seed counts `seedTtl` down, and `_dropSeed` fires when it reaches 0.

0. **Confusion.** While `confuse > 0`, the animal counts it down and makes a random 3-tile move at 0.8× speed. Its state and ttl are reset.
1. **Flee.** This applies only when diet is below 0.7. The check runs on every other tick, offset by slot, and then passes a 70% roll. The animal looks for the nearest threat within `range*0.8`. If it finds one, it sets a target 6 tiles directly away and enters state 4 for 3 ticks, moving at 1.1× speed.
2. **Hunt.** This requires `meatEff > 0.25`, energy below 60% of max (`SCAV_HUNT`, 35%, when `scav > 0.5`), and no cooldown. The animal chases the nearest prey within `range`, using 1.6× speed once within 4 tiles.
   - It attacks when within 1 tile.
   - It gives up after 18 ticks, which sets a 10-tick cooldown.
3. **Seek carrion.** This applies when `scav > 0.5`, energy is below 92% of max and the current tile has no carrion. The animal re-picks a target with `_pickForage` when its ttl has run out or its state is not 2, and sets state 2. If the target tile has carrion, it moves there at full speed and the later steps are skipped. Otherwise it falls through to step 3a, which continues toward the same target or eats where it stands.
3a. **Eat.** This requires `plantEff > 0.12` and energy below 92% of max.
   - **Fruit first.** The animal can reach fruit if `_reach > 0` (all fruit) or `mass < BERRY_MASS` (plants with wood below 0.62). If `fruitAt` exceeds `bite*FRUIT_MIN_BITE`, it eats one bite with `eatFruit`.
     - The energy gained is `eaten*FRUIT_ENERGY*(0.6+sweet)*plantEff*plantK*(1-1.6*max(0, seedTox*0.7 - toxR))`, where `plantK` is the slice 2 plant multiplier (generalist tax, scavenger penalty, `HERB_GRAZE`).
     - If the animal carries no seed, it picks one up: `seedSp = fruitSp` and `seedTtl = 20..59`.
   - **Otherwise it grazes.** If edible biomass on the current tile exceeds half a bite, the animal eats one bite.
     - The energy gained is `eaten*PLANT_ENERGY*plantEff*plantK*(1-1.6*max(0, plantTox - toxR))`.
     - If the understory is a fungus the species' aversion rates above 0.5 (mimics included), the graze skips the understory (`skipUnder`).
     - If fungus was eaten, `_poison` runs.
   - Otherwise it moves toward a spot chosen by `_pickForage`.
4. **Roam.** If nothing else acted, the animal drifts at 0.45× speed toward a comfortable spot.
5. **Pay costs.** The cost is `meta*(1+1.3*(1-climateFit)) + moved*0.012*mass`, plus the parasite drain.
   - Before paying, an animal lighter than `BUG_MASS` with energy below max eats `bugs.eat(tile, bite*_bugEff)` and gains `taken*BUG_ENERGY`.
   - Carrion, after the bug block: if the tile has carrion and energy is below 92% of max, the animal takes `soil.consumeCarrion(tile, bite*(1+SCAV_BITE*scav))` and gains `taken*MEAT_ENERGY*carrionEff*meatK` (`meatK = 1-GEN_TAX*(1-_genT(i))`). Every animal runs this block, but only a high `scav` makes it worthwhile. If disease is on, the animal is healthy and the tile has carcass load, the bite also calls `disease.exposeAnimal` with `CARCASS_K*carcassLoad`, the same exposure used for carcass contact.
   - Land scavenger counters: for a land animal with diet of at least 0.33 and `scav > 0.5` (the `landScav` test), the carrion gain is added to `carrionEnergy`, and the net energy gained this tick before costs (energy now minus energy at the start of the tick, when positive) is added to `scavEnergy`. The ecosystem reports their ratio as `stats.carrionShare`.
   - Parasite drain: `parasiteLoad*PARASITE_DRAIN*mass*(1-0.6*armor)*(0.4+0.6*gaussFit(size, parasiteHost, PARASITE_HOST_TOL))`, also added to `bugs.parasiteDrain`.
   - A starvation death counts as `deaths.parasite` when the drain exceeds `cost*PARASITE_DEATH_SHARE`, otherwise `deaths.starved`.
   - A lethal poisoning kills the animal here, and `deaths.poison` increments.
   - Disease (only when `disease.on`): `imTime` counts down. An infected animal pays `SICK_COST*vir*mass^0.75`, then rolls the sickness death chance. If it survives, `itime` counts down and it recovers at 0 (`disease.recoverAnimal`). Otherwise, it stamps its strain into the vector plane when the tile has parasite load, and on alternate ticks (`(tick+i)&1`) runs `_contact`. A healthy animal is exposed on alternate ticks to the tile's carcass and vector loads.
   - A sickness death runs after the poison check: `disease.countDeath`, `_kill`, and `deaths.disease` increments.
   - If energy falls to 0 or below, the animal starves.
   - Old age: once `age/maxAge > OLD_START` it dies with chance `OLD_P*exp(OLD_K*(age/maxAge-OLD_START))` per tick, counted in `deaths.old`.
6. **Reproduce.** This requires all of the following:
   - The animal is mature and `age < ELDER_FERTILE*maxAge`.
   - It has no cooldown.
   - Energy is above 70% of max.
   - `count < maxAnimals`. Carnivores with diet above 0.6 may exceed the cap by up to 1500 more.
   - Fewer than 14 same-species animals share its grid cell. This is a density-dependence limit.

**Part 3 slice 2 additions to `step`:**

- **Thirst** (non-water animals, with weather): refill to 1 on a drinking tile, otherwise lose water (see `THIRST`). `thirsty` is `water < THIRSTY`. A thirsty animal that did not flee or hunt runs `_seekWater` (before carrion seeking and eating): step to the standable 4-neighbour with the lowest `waterDist` (state 5), or, on a flat or capped (40) field, `_pickWater` samples 8 points within `max(6, range*1.5)` scored by `(d0-waterDist)*0.1 + wet + fresh` and heads there for 6–11 ticks. Fruit, graze, kill and carrion bites add water. Amphibians breed only next to water.
- **Territory:** a mature animal with `terr > TERR_MIN` that is neither thirsty nor fleeing claims a home at its position; holders `_stamp` their disc into the terr arrays every `TERR_EVERY` ticks with `until = tick + TERR_HOLD`. `_homeK(i)` is `0.4+0.6*diet` inside the disc. On alternate ticks `_chaseRival` finds the nearest same-role animal (mode 3) within `range*0.5` and, if it is inside the disc, sets it fleeing. Holders' forage targets are clamped to the home disc.
- **Herds:** in `_pickForage`, an animal with `herd > HERD_MIN` and local company lerps its target toward the same-species centroid of its grid cell by `HERD_PULL`.
- **Carrion seek** now uses `_pickCarrion` (the best `soil.carrionCell` within `range*SCAV_RANGE`, then its richest tile) and falls back to `_pickForage`.
- **Climate:** `_clim(i, t)` widens tolerance by `1+dry` on the hot side.
- `_nearest` treats domains as compatible when equal or when either is amphibious; mode 3 finds the nearest animal of the same diet role.

**Part 3b slice 1 life stages in `step`:**

- `age++` is followed by `_stage(i)`; the tick then uses `gf` and `ef` at the points of use (`_decode` values stay genetic):
  - metabolism `meta*gf`, maximum energy `emax*gf` (every `emax` threshold and the end-of-tick cap), bite `bite*gf*ef*(1+TERR_BITE*homeK)`, and bug bites `bite*gf*ef*_bugEff`;
  - speed in `_moveToward` is multiplied by `ef`;
  - predation uses effective mass `mass*gf`: `_nearest` modes 0 and 1, `_attack` (`massRatio` and meat gained) and the carcass left by `_kill`.
- **Follow parent:** after the thirst step, a juvenile with non-zero `parent` that did not act, on ticks where `(tick+i) % FOLLOW_EVERY === 0` and not in state 1 (eating), finds the nearest adult of its species within `range` (`_nearest` mode 2) and, if more than 1.5 tiles away, moves toward it at full speed (state 0) and skips the later behaviour steps.
- **Egg eating:** right after that, every animal with diet at least 0.33 (omnivores, carnivores, scavengers), and since slice 2 every water animal (so water herbivores too), with energy below its `emax*gf` eats eggs on its current tile, whether or not it acted this tick: `eggs.eatAt(tile, dom !== 1, sp, (emax - energy)/EGG_FOOD)` returns the egg energy taken and the animal gains `EGG_FOOD` times it. Water animals eat water eggs; land and amphibious animals eat land and amphibious eggs; own-species eggs are skipped.

**Part 3b slice 2 balance terms in `step`:**

- Per animal, `plantK = (1-GEN_TAX*t) * (land && scav > 0.5 ? 1-SCAV_PLANT*scav : 1) * (diet < 0.33 ? HERB_GRAZE : 1)` and `meatK = 1-GEN_TAX*(1-t)`, with `t = _genT(i)`. `plantK` scales graze and fruit energy; `meatK` scales carrion energy, and `_attack` applies the same meat factor to the kill's energy.
- Cold upkeep: with `cold > 0.5` and `et < 0.5`, the base cost gains `meta*gf*COLD_UPKEEP*(0.5-et)*2`. Cold-blooded herbivores in cool places drift back to warm-blooded; reptiles in warm deserts pay nothing.
- `_decode` includes `(1+DRY_COST*dry)` in `meta`.
- `_pickForage` adds `EGG_LURE` to a sampled tile's food score when that tile has eggs, for animals with diet at least 0.33.

**v3 Part 1 slice 1 invertebrate rules in `step`:**

- Thirst: an invertebrate (`cls === CLS_INVT`) refills at `wet > AMPH_DRINK_WET` like an amphibian and loses water `*INVERT_THIRST`.
- Litter: a land invertebrate with diet below 0.5 (snails) and energy below `emax` eats `soil.consumeLitter(tile, bite)` each tick, gaining `taken*LITTER_ENERGY*plantK`. It runs right after the parasite drain, before the carrion bite, so snails speed up litter turnover.
- Bugs, prey size and stings: see `_bugEff`, the prey-size limit and `_attack` below.
- Eggs: the egg-layer test is unchanged (`domain !== 0 || cold > 0.5`). Water invertebrates always lay; land invertebrates lay through their cold gene, which `CLS_COLD` keeps at 0.5 or above.

After the loop, `_compact()` fills each dead slot with the last live animal. The cost is O(deaths), not O(n), and slot order is not stable.

### Mechanics

**Neighbour query (`_nearest(i, r, mode)`):**

- It scans the grid cells overlapping radius `r` and considers only animals in the same domain.
- Mode 0 finds the nearest threat: an animal whose diet is at least 0.3 higher, whose `meatEff` is at least 0.3, and where the searcher's mass is no more than 1.8× the threat's.
- Mode 1 finds the nearest prey: an animal whose diet is at least 0.3 lower.
- Mode 2 finds the nearest mate: a mature animal of the same species. Parent-following juveniles reuse it.
- Modes 0 and 1 compare effective masses `mass*gf`, so predators can take juveniles of larger species.
- Mode 3 finds the nearest animal of the same diet role (territory rivals).

**Prey-size limit:**

- In mode 1, prey mass must be at most `1.8×` the hunter's own mass for carnivores (diet above 0.66), and at most `0.6×` for omnivores. Invertebrate hunters use `INVERT_PREY` (`0.7×`) whatever their diet.
- Omnivores therefore only take small prey.
- Mode 0 mirrors this rule: an animal more than 1.8× heavier than a predator does not treat it as a threat.

**Movement (`_moveToward`):**

- An animal moves up to `spd*frac` toward its target.
- If the direct step is blocked, it tries deflections of ±0.7, ±1.4 and ±2.2 rad. The first side tried is chosen at random.
- A deflected step caps `ttl` at 3, so the animal soon re-targets. A fully blocked step resets `ttl` to 0.

**Fruit reach (`_reach`):**

- Reach is `0.6*(1 - |diet-0.5|/0.3)` when `|diet-0.5| < 0.3`, and 0 otherwise.
- It peaks at diet 0.5 and is passed to `plants.edible` and `plants.graze`.

**Grazing across slots:** `plants.edible(tile, reach)` sums both slots and `plants.graze` eats the understory before the canopy. The toxicity penalty uses `plants.grazeTox`, read right after `graze`, which is the toxicity of the matter actually eaten.

**Forage choice (`_pickForage`):**

- The animal samples 8 random points within `range` that it can stand on. An animal with `scav > 0.5` samples `SCAV_SAMPLES` (12) points within `range*SCAV_RANGE`.
- Each point is scored as `(food+0.02)*(0.25+climateFit)/(1+dist*0.08)`, plus a small random jitter.
- Animals without a plant diet use a fixed `food = 0.2`.
- Fruit eaters add `fruitAt*FRUIT_LURE*(0.6+sweet)` to `food`.
- Bug eaters add `bugs.edibleAt(j)*_bugEff*BUG_LURE` to `food`.
- Every animal adds `soil.carrion[j]*carrionEff*CARRION_LURE*(1+SCAV_LURE*scav)` to `food`.
- A point whose understory is a fungus has its food multiplied by `1 - aversion(hue)`.
- The chosen target is held for 6–13 ticks.

**Bug efficiency (`_bugEff`):**

- 0 when `mass >= BUG_MASS`.
- A land invertebrate with diet at least 0.5 (spiders) gets `INVERT_BUG` (1.6), ahead of the diet test, so they eat pest and parasite swarms through the usual bug path.
- Otherwise 0 when `diet >= BUG_DIET_MAX`, so carnivores (the `dietRole` boundary) never eat or seek bugs.
- Otherwise `1-(BUG_DIET_PEAK-diet)*1.4` below the peak and `1-(diet-BUG_DIET_PEAK)/(BUG_DIET_MAX-BUG_DIET_PEAK)` above it, clamped at 0.

**Attack (`_attack`):**

- The success chance is `0.7 * sizeF * speedF * (1-0.6*armor) * (1-cover) * (1-0.5*scav)`, where:
  - `armor` belongs to the prey, and `scav` belongs to the hunter, so scavenging costs hunting skill.
  - `sizeF` is `clamp(massRatio*0.85, 0.15, 1.2)`.
  - `speedF` is `spd_i/(spd_i + 0.7*spd_p)`, except a water invertebrate with speed gene below `JELLY_SPEED` (a jellyfish sting), which uses a flat 0.5.
- Water cover:
  - Prey in water always gets a base cover of 0.3, because open-sea shoals scatter.
  - Kelp adds `min(0.3, cover*0.6)`, where `cover` is `plants.cover(tile)`, the combined woody floor of both slots on the prey's tile.
- Land cover is `min(0.45, cover*0.5)`, so thickets hide prey.
- On success, the hunter gains `mass_p*MEAT_ENERGY*meatEff + 0.25*energy_p` and gets a 4-tick cooldown. The prey is killed with `_kill(p, CARCASS_EATEN)`.
- On failure, the hunter gets an 8-tick cooldown and pays `2*meta`. The prey bolts: it enters state 4 for 4 ticks, heading directly away.

**Death and carcasses (`_kill(i, frac = 1)`):** the animal's mass times `frac` goes to `soil.addCarcass` on its tile.

**Seed carriage (`_dropSeed`):**

- The seed survives with probability `0.45 + 0.4*seedTox`, using the carried species' mean gene 10.
- It is dropped only if that species is still alive.
- A surviving seed mutates from the species' mean genome into `seedGenome`, increments `plants.seedDrops`, and goes to `plants.plantSeed` on the current tile.

**Disease spread:**

- **Contact (`_contact(i, s)`):** scans the infected animal's whole own grid cell (`gstart`/`gitems`/`gcell`), skipping itself, dead and other-domain animals. It counts every animal within `CONTACT_R` as `near` (infected ones included) and buffers up to `CONTACT_MAX` uninfected ones in the preallocated `_contactBuf`. Each buffered animal is then exposed with `CONTACT_K*(1 + CROWD_K*min(1, near/CROWD_N))`. No allocation.
- **Predation:** in `_attack`, a successful kill of infected prey exposes the predator with `PREY_K` before the prey is removed.
- **Carcass:** `_kill` of an infected animal calls `disease.animalDied(i, tile, frac)`, which releases the infection and writes the strain and `frac` into the tile's carcass plane.
- **Vector:** see the per-tick disease step above.
- **Innate immunity:** in `_reproduce`, a child's `natImm` is taken from either parent; with `NATIMM_P` it is replaced by `disease.speciesStrain.get(parentSp.id)`.

**Poison (`_poison`):**

- `excess = grazePotency - toxR`. Nothing happens unless it is positive.
- Otherwise `plants.poisoned[type]` increments, and the effect depends on the toxin type:
  - Mild: `energy -= excess*MILD_LOSS*emax`.
  - Neurotoxic: `confuse = NEURO_TICKS`.
  - Lethal: death with probability `excess*LETHAL_P`.
- The species then learns (`_learn`).

**Aversion and mimicry:**

- `_learn` finds the species' entry within `MIMIC_HUE*0.5` of the fungus hue (`hsl[0]/360`), or adds one, and raises its strength by 0.5, capped at 1.
- When the strength crosses 0.5, it increments `aversionEvents` and logs an `'info'` entry, "<animal> learned to avoid <fungus>", rate-limited per pair by `AVERSION_LOG_GAP`.
- `_aversion(av, hue)` returns the strongest entry within `MIMIC_HUE` of `hue`. A harmless fungus with a hue close to a toxic one is therefore avoided too (mimicry).

**Reproduction (`_reproduce`):**

- The litter size is `litter`. The partner is the nearest mate, or the animal itself if none is in range, which makes it effectively asexual.
- Each gene is inherited 50/50 from the two parents, then mutates at rate 0.25 with sd 0.04. `_clampClass(childG, cls[i])` then clamps the cold gene into `CLS_COLD[cls]` and, for invertebrates, the size gene to at most `INVERT_SIZE`. The class is never mutated, so a daughter species keeps it.
- A fixed energy budget of `emax*0.38` is split across the litter, so big litters mean weak young. Each child's energy is capped at 60% of its own maximum.
- The parent pays `1.1×` what it spent.
- The breeding cooldown is `35 + 55*size - 10*fecundity`.
- Live-born children spawn with energy `min(perChild, emax*gf*0.6)` and `parent = uid` of the breeder.
- **Egg layers** (Part 3b slice 1): water animals (domain 1), amphibians (domain 2) and reptiles (land with `cold > 0.5`) lay a clutch into `eggs` instead of spawning young, when the ecosystem has an `EggPool`.
  - `_eggTile(i)` picks the laying tile: the animal's own tile, except for birds (only a perch tile, slice 2) and amphibians, which need a tile among their own and its 4 neighbours with the amphibious walk bit and `fresh` or `wet > EGG_WET`. With no such tile the animal gets a 10-tick cooldown and nothing is spent.
  - The clutch is `round(litter*EGG_CLUTCH_MUL)` eggs, each with `perChild*EGG_COST` energy; the parent pays `1.1×` the eggs' total. Eggs sit at random points inside the laying tile.
  - Speciation is decided at laying with the same rules. Because a daughter created by an egg has population 0 (so `matchDaughter` skips it), later eggs of the same clutch reuse it (`clutchSp`) when within the threshold of its mean. A daughter whose eggs all fail stays in `registry.all` with peak 0.
  - `natImm` is decided per egg and stored with it.
- **Homes** (slice 3): an animal with a nest or den breeds only within `NEST_NEAR` of it. At breeding time the home site is re-scored; a site that no longer qualifies is dropped with a 10-tick cooldown. An egg layer with a nest lays there (amphibians skip the water-edge test) and its eggs are nest eggs (`nst`); reptile nest eggs use domain 0 (land), whatever the parent's domain. With chance `EGG_VERT_K`, an infected parent's nest clutch carries its strain (`str`). A live bearer with a den gives its young `home` 3 and the den's `nx`/`ny`.
- The speciation check matches the plant one: distance to the parent's `mean`, `matchDaughter` at the full threshold, and a new species only when `registry.canSplit(parentSp, ANIMAL_SPLIT_MIN_POP)` (otherwise the child joins the parent species). A new species is logged, with a note when its role differs from the parent's.

**Birds (slice 2):**

- **Flight:** a bird has `fly = 1` after a tick in which it moved more than `FLY_MOVE` or ended off land (`walk & 1` clear); otherwise it is perched. A flying bird pays `FLY_META` times the base upkeep and adds nothing to `tileLoad`. Bird bite is scaled by `BIRD_BITE`, speed by `BIRD_SPEED` and sense range by `BIRD_SENSE`.
- **`_canEat(h, p)`:** a non-bird hunter can take anything that is not flying, except that water hunters cannot leave the water. A fisher bird (`nic` 1) takes water or amphibious prey lighter than `BIRD_FISH_MASS` in water shallower than `BIRD_DEPTH`. A carrion bird (`scav > 0.5`) never hunts and no bird hunts water prey. Other birds take any non-water prey when their diet is above 0.66, and otherwise only non-bird invertebrates.
- **Hunting:** fishers hunt below `FISHER_HUNT` of their energy cap and search `FISHER_RANGE` times their range; their strike uses the fixed cover `BIRD_STRIKE`. A non-bird attacking a bird has its chance multiplied by `BIRD_ESCAPE`. `BIRD_PREY` replaces the usual prey weight in the hunt drive.
- **`_contact`:** birds and non-water animals of another domain only meet when the bird is perched.
- **`_pickForage` for birds:** samples skip non-land tiles, except that a fisher may pick shallow water (`depth < BIRD_DEPTH`), scored with `BIRD_FISH_LURE` and the tile's animal load. Perch tiles (`_perch`: land with the perch bit or cover above `PERCH_COVER`) are scored `BIRD_PERCH` times higher. Meat-eating birds ignore plant food. When no sample scores, a bird picks a random point within three times its range. Every sample is shifted north or south by `_migrate`.
- **`_migrate(i, tile)`:** in the cold half of the year (`seasonT < 0`) and when the bird's tile is colder than its preferred temperature, the goal row is `oy` moved toward the equator by `min(|d|, MIGRATE_RANGE)`, where `d` is the distance from `oy` to the middle row. Otherwise the goal is `oy`. The shift is 0 within `MIGRATE_HOME` of the goal and is clamped to the bird's range. A species that is more than `MIGRATE_HOME` from its winter goal counts once a year in `birdMigrants` (`_migLogged`), and logs "<name> flew south/north for the winter" when its population is at least 6.
- **Food:** fruit gives `BIRD_FRUIT` times the energy and carried seeds stay `BIRD_SEED` times longer. `_bugEff` multiplies a bird's bug efficiency by up to `BIRD_BUG`, ramping over diets `BIRD_BUG_LO` to `BIRD_BUG_LO + BIRD_BUG_SPAN`; bug energy for birds with diet 0.33 or more is `BIRD_BUG_ENERGY` per unit.
- **Rest and crowding:** a well-fed bird on a perch tile stays put with chance `BIRD_REST_P`. Birds breed only when fewer than `BIRD_CROWD` of their species share the grid cell.
- **Disease drop:** an infected bird sets its tile's vector plane to `BIRD_DROP` with chance `BIRD_DROP_K` per tick when the plane is lower.
- **Size:** `_clampClass` caps the bird size gene at `BIRD_SIZE`.

**Nests and dens (slice 3):**

- **Gene:** gene 15 (`G_NEST`) is the nesting drive. It costs `NEST_COST` in upkeep per unit. The home type follows the animal: egg layers (domain not 0, or land animals with `cold > 0.5`) get a nest (`home` 1) when the ecosystem has eggs; everyone else gets a den (`home` 2). Young born in a den or hatched from a nest egg get `home` 3 (natal), with the home tile in `nx`/`ny`.
- **`_site(i, j)`:** water animals score shallow water (`depth < NEST_DEPTH`) as `1 - depth`. Amphibians need an amphibious tile that is fresh or wet. Others need land walkable for their domain. Birds score a tree tile (plant gene 3 at least `NEST_TALL`) as `1 + cover`, a perch tile as 0.6 and other cover above `PERCH_COVER` as the cover. Reptiles need warm (`>= NEST_WARM`), open (`cover < NEST_OPEN`), dry ground, scored `temperature*(1 - cover)`. Mammals need cover of at least `DEN_SITE` or rough ground (walk bit 32, scored 0.8). Other land animals score `0.3 + cover`.
- **Picking a home (`_pickHome`):** every `NEST_EVERY` ticks a mature animal with `G_NEST > NEST_MIN` and no home, that is not thirsty, fleeing or migrating away, looks for one. It joins the nearest mate's nest or den when that tile scores for it; otherwise it scores its own tile plus `NEST_SAMPLES` random points within `min(range, NEST_RANGE)` and takes the best. `_setHome` stores the tile centre in `nx`/`ny`, moves a territory centre there, and for birds resets `oy` to the nest row.
- **Dropping a home (`_dropHome`):** a natal young drops its den at maturity; any animal drops a home more than `NEST_FAR` away; a migrating bird drops its nest; and an animal that cannot move toward its home drops it.
- **Heading home (state 6):** `_homeR` is `GUARD_R` for a nest holding eggs and `DEN_R` for a natal young, both only above `GUARD_E` of the energy cap, and 0 otherwise. An animal further than `_homeR` from home walks back. With `_homeR` 0, a nest or den holder that is off cooldown and above 70% energy walks back to within `NEST_NEAR`. `_pickForage` also clamps its target to within `_homeR` of home. Fleeing, hunting and thirst come first.
- **Guarding:** a nest holder within `GUARD_R` of its eggs calls `eggs.guard(tile, mass*gf*(0.5 + G_NEST), tick)`.
- **Care:** a nest or den holder at home cleans its home tile's parasites with `bugs.clean(tile, CLEAN_K*G_NEST)`. Every `FEED_EVERY` ticks `_feedYoung` gives spare energy above `FEED_E` of the cap to natal young within `FEED_R` (its own young by `parent` uid, or same-species young of the same den), topping them up to `FEED_TOP` at efficiency `FEED_EFF`.
- **Den effects:** a natal young at home has its climate and cold upkeep cut by `1 - DEN_SHELTER*G_NEST`, but takes `1 + DEN_PARA` times the parasite drain. An infected animal at home also exposes everyone sharing its home tile (`_denContact`, `DEN_CONTACT`). Prey within `NEST_NEAR` of a den gets extra cover `DEN_COVER*G_NEST` in `_attack`.
- **Raids:** `_pickForage` adds the nearest nest tiles with eggs (`eggs.nestCell`, the 3×3 grid cells around the animal) as candidate targets scored with `EGG_LURE`. When `eggs.eatAt` returns -1 (repelled by a guard), the raider flees the tile unless it already acted.
- **Following:** natal young follow their nearest parent-species adult only when `_homeR` is 0 (too hungry to stay at the den).

---

## Eggs (`js/sim/eggs.js`)

Part 3b slice 1. A compact structure-of-arrays store for laid eggs. Eggs are not animals: they are not in the animal arrays, the spatial grid or registry populations. It loads after `weather.js` and before `ecosystem.js`; `Ecosystem` builds it only when `EggPool` is defined.

### Constants

| Constant | Value | Use |
| --- | --- | --- |
| `EGG_CLUTCH_MUL` | 1.5 | Clutch = `round(litter*EGG_CLUTCH_MUL)` (plan 2; tuned). |
| `EGG_COST` | 0.67 | Egg energy as a share of a live child's `perChild` (plan 0.5; tuned). |
| `EGG_TIME`, `EGG_TIME_SIZE` | 25, 30 | Incubation `EGG_TIME + EGG_TIME_SIZE*size` ticks. |
| `EGG_FOOD` | 0.8 | Energy an egg eater gains per unit of egg energy. |
| `EGG_WET` | 0.5 | Minimum `wet` for an amphibian laying tile that is not `fresh`, and below which a non-fresh amphibian egg tile has dried out. |
| `EGG_COLD_RATE` | 0.5 | Slowest development rate of reptile eggs. |
| `EGG_FAIL` | 0.0015 | Base failure chance per egg per tick (slice 2). |
| `EGG_PARA` | 0.02 | A nest egg fails with chance `EGG_PARA*parasiteLoad` per tick on its tile (slice 3). |
| `GUARD_K` | 3 | Weight of the guard's mass when a raider rolls against it (slice 3). |

### `EggPool(world, animals, registry)`

- Per-egg arrays (capacity starts at 512 and doubles): `x`, `y` (Float32), `tile`, `sp`, `imm` (innate immunity strain), `next` (Int32), `energy`, `timer` (Float32), `dom` (Uint8, the parent's domain), `nst` (Uint8, 1 for a nest egg), `str` (Int32, a disease strain passed to the chick), `alive` (Uint8) and `genome` (`Float32Array(cap*AG)`).
- `head` (Int32, one per tile, -1 when empty) with `next` forms a per-tile linked list, so eaters find eggs on their tile in O(eggs on tile).
- Cumulative counters: `laid`, `hatched`, `eaten`, `failed`, and for slice 3 `nestLaid`, `nestHatched`, `raids` (nest eggs eaten), `repelled` (raids stopped by a guard) and `paraFailed` (nest eggs lost to parasites). `count` is the number of eggs.
- Per-tile guard arrays: `guardM` (Float32, the heaviest guard mass this tick) and `guardT` (Int32, the tick it was set). `nestCell` (Int32, one per animal grid cell, -1 when none) holds one tile with nest eggs per cell, for the raid lure in `_pickForage`.

### Methods

- **`lay(sp, genome, gOff, x, y, tile, energy, dom, imm, nst, str)`** appends an egg, sets `timer = EGG_TIME + EGG_TIME_SIZE*size` and pushes it on the tile's list. `nst` marks a nest egg and `str` a strain it carries.
- **`guard(tile, m, tick)`** records guard mass `m` on the tile for this tick, keeping the largest.
- **`eatAt(tile, landEater, sp, room, mass, tick)`** marks eggs on the tile dead (skipping dead eggs, own-species eggs, and water eggs for land eaters or non-water eggs for water eaters) until the energy taken reaches `room`; each counts in `eaten`, and nest eggs also in `raids`. If the tile was guarded this tick or the last, the first nest egg triggers one roll: the raid goes ahead with chance `mass/(mass + guardM*GUARD_K)`; otherwise it counts in `repelled` and the call stops. Returns the energy taken, or -1 when repelled before taking anything.
- **`step(Wx)`** runs after `animals.step`. For each egg:
  - Every egg first fails with chance `EGG_FAIL` (drawn from `animals.rng`), counted in `failed`.
  - With weather, a non-water egg fails if its tile has `snow > SNOW_SHOW`, and an amphibian egg fails if its tile is neither `fresh` nor `wet > EGG_WET` (dried out).
  - A nest egg on a tile with parasites fails with chance `EGG_PARA*parasiteLoad`, counted in `failed` and `paraFailed`.
  - The timer drops by 1 per tick; reptile eggs (domain 0) drop by `max(EGG_COLD_RATE, 1 - (0.5-et)*2*(1-EGG_COLD_RATE))` when effective temperature `et = temperature + seasonT` is below 0.5, so 0.5× at `et <= 0.25`.
  - At 0 it hatches through `animals.spawn(sp, genome, e*AG, x, y, 0)` (so registry population is added only now), with energy `min(eggEnergy, emax*gf*0.6)`, `natImm = imm` and `parent = 0`. It fails instead when its species is gone (`population <= 0` after having lived, `peak > 0`) or the animal cap `maxAnimals + 1500` is reached.
  - A hatched nest egg counts in `nestHatched`; the chick gets `home` 3 with `nx`/`ny` at the egg tile's centre, and is exposed to the egg's `str` (dose 1) when disease is on.
  - Then `_compact()` drops dead eggs, rebuilds the tile lists and refills `nestCell`.
- **`reassignSpecies(fromSp, toSp)`** rewrites egg species ids; called by `Ecosystem._mergePass`.

---

## Bugs (`js/sim/bugs.js`)

Bugs are density fields, not agents. There are four niche planes, each holding at most one bug lineage per tile. It loads after `animals.js` and before `ecosystem.js`, and has no DOM dependency. `Ecosystem` builds it only when `BugLayer` is defined.

### Constants

- **`BG = 9`** bug genes: `B_TEMP 0`, `B_MOIST 1`, `B_APPETITE 2`, `B_MOBILITY 3`, `B_FEC 4`, `B_SWARM 5`, `B_HUE 6` (pollinator flower hue), `B_SPEC 7` (pollinator specialism), `B_HOST 8` (parasite host size).
- **`BUG_NICHES`** is `['pest', 'detritivore', 'parasite', 'pollinator']`, with plane constants `BUG_PEST 0`, `BUG_DETRI 1`, `BUG_PARA 2`, `BUG_POLL 3`. `BUG_NICHE_LABEL` and `BUG_CATEGORY_LABEL` hold UI labels.
- **`BUG_WEIGHTS`** is `[1.4, 1.4, 0.8, 0.6, 0.6, 0.6, 0.8, 0.8, 0.5]`. **`BUG_SPECIATION`** is 0.2. **`BUG_SPLIT_MIN_POP`** is 40 (occupied tiles).
- **`BUG_MASKS`**: per niche, which genes mean anything. Masked genes are copied, not mutated, on spread. **`BUG_LAND_ONLY`** is `[1, 0, 0, 1]` (pests and pollinators never enter water). **`BUG_HUES`** gives the base species hue per niche.
- **Tunables:**

  | Constant | Value | Use |
  | --- | --- | --- |
  | `BUG_EVERY` | 6 | The layer steps every 6 ticks; all rates are multiplied by it. |
  | `BUG_MIN` | 0.01 | A cell below this density is cleared. |
  | `BUG_SEED_D` | 0.06 | Density of a newly colonised cell. |
  | `BUG_TOL` | 0.2 | Climate tolerance (moisture uses 1.2×). |
  | `BUG_R` | 0.08 | Base logistic growth rate. |
  | `BUG_MORT` | 0.006 | Base mortality, times `0.5 + appetite` and `1 + BUG_CROWD*d`. |
  | `BUG_K_SCALE` | 0.7 | Scales every cell's carrying capacity `K = fit*food*BUG_K_SCALE`. The plan's 0.6 cut bug mass by about 50% at year 10 and was eased. |
  | `BUG_CROWD` | 1.5 | Crowding mortality: the mortality term is `BUG_MORT*(0.5+appetite)*(1+BUG_CROWD*d)*d`. The plan's 2 was eased with `BUG_K_SCALE`. |
  | `BUG_DECLINE` | 0.08 | Rate at which density above K falls back. |
  | `BUG_SPREAD` | 0.1 | Spread chance, times `mobility*density`. |
  | `BUG_MUT_RATE`, `BUG_MUT_SD` | 0.15, 0.02 | Mutation on spread. |
  | `BUG_INIT_P`, `BUG_INIT_K` | 0.25, 0.1 | Founder seeding chance per cell and minimum K. |
  | `PEST_FULL`, `PEST_BITE`, `PEST_DEFENCE` | 1, 0.002, 0.7 | Plant biomass for full food, bite per density and appetite, and how much defence cuts food. |
  | `DETRI_FULL`, `DETRI_RATE`, `DETRI_RECYCLE` | 0.3, 0.004, 0.5 | Litter for full food, share of litter eaten per density, and share returned as nutrient. |
  | `PARA_FULL`, `PARA_TRACE_DECAY` | 5, 0.95 | Host trace for full food, and trace decay per bug step. |
  | `POLL_FULL`, `POLL_WINTER`, `POLL_HUE_SPAN`, `POLL_GENERALIST`, `POLL_DRIFT` | 0.5, 0.35, 0.25, 0.4, 0.1 | Nectar for full food, off-season floor, hue match width, generalist food bonus, and hue drift toward the local flower on spread. |
  | `LOCUST_DENSITY`, `LOCUST_SWARM_GENE`, `LOCUST_BARE`, `LOCUST_FRAC`, `LOCUST_COOLDOWN`, `LOCUST_LOG_GAP` | 0.3, 0.4, 0.3, 0.7, 1440, 480 | Swarm trigger density, swarm gene and bare-tile edible threshold; share moved, per-species cooldown and log rate limit. |
  | `LOCUST_GAP` | 480 | Minimum ticks between any two swarms in the world (`_lastSwarm`), so swarms stay rare. |
  | `COLLAPSE_FRAC`, `COLLAPSE_GAP`, `COLLAPSE_PEAK_DECAY`, `COLLAPSE_MIN_PEAK` | 0.25, 960, 0.999, 30 | Pollinator collapse detection. |
  | `REINTRO_TILES` | 80 | Cells placed by `reintroduce`. |

- **`BUG_ARCHETYPES`**: 13 founders (3 pest, one of them swarm-prone; 3 detritivore; 3 parasite with different host sizes; 4 pollinator with different hues and specialism).
- **`bugCategory(g, niche, wet, o)`**: pest `locust` (swarm > 0.6) or `aphid`; detritivore `worm` (wet or moisture > 0.7) or `beetle`; parasite `leech` (wet) or `tick`; pollinator `butterfly` (specialism > 0.55) or `bee`.
- **`bugIcon(category, id)`** picks `sp.icon` from `BUG_ICON_VARIANTS` by `id % variants.length`, the same way `animalIcon` does. Categories with no entry (`locust`, `leech`, `butterfly`) use the category name. `sp.category` and the label stay unchanged. `_newSpecies` and `refreshSpeciesMeans` both set the icon through it.

  | Category | Variants |
  | --- | --- |
  | aphid | aphid, caterpillar |
  | beetle | beetle, ant |
  | worm | worm, snail |
  | tick | tick, mosquito |
  | bee | bee, moth |

### `BugLayer(world, plants, animals, registry, log, rng)`

Cell `q = niche*n + i`.

| Array | Type | Meaning |
| --- | --- | --- |
| `species` | Int32 `4n` | Registry id, 0 = empty. Population is refcounted through `_set` / `_clear`. |
| `density` | Float32 `4n` | 0..1. |
| `genome` | Float32 `4n*BG` | Per-cell genes at `q*BG`. |
| `fit` | Float32 `4n` | Cached climate fit (NaN becomes 0). |
| `rate`, `app`, `mob` | Float32 `4n` | Cached growth rate `BUG_R*BUG_EVERY*(0.5+fec)*(0.7+0.6*appetite)`, appetite and mobility. |
| `total` | Float32 `n` | Summed density of all niches on a tile. |
| `trace` | Float32 `n` | Decaying animal host trace, `trace*PARA_TRACE_DECAY + tileLoad` per bug step; seeded from the starting animals. |

Counters: `tiles[4]`, `mass[4]`, and the cumulative `pestDamage`, `detritusEaten`, `parasiteDrain`, `eaten`, `swarms`, `collapses`. `version` bumps each bug step.

Bug species are registry species with `group 'bug'` plus `niche`, `nicheIndex`, `category`, `icon`, `density` (mean over occupied cells), `wetFrac`.

### Food (`_food(niche, g, o, i)`)

- **Pest** (land only): plant biomass of the canopy plus a non-fungus understory, `min(1, b/PEST_FULL)*(1 - PEST_DEFENCE*weightedDefence)`.
- **Detritivore:** `min(1, litter/DETRI_FULL)`.
- **Parasite:** `min(1, trace/PARA_FULL)`.
- **Pollinator** (land only): `plants.nectar(i)` times the season factor `POLL_WINTER+(1-POLL_WINTER)*bloomNow`, times the hue match `1 - spec*min(1, hueDist/POLL_HUE_SPAN)`, times `1+POLL_GENERALIST*(1-spec)`, over `POLL_FULL`, capped at 1.

`K = fit*food`.

### `step(tick)`

Runs only when `tick % BUG_EVERY === 0`. Updates `trace`, zeroes `animals.parasiteLoad`, then for each niche plane and occupied cell (inlined loops, food computed as above):

- Pest locust check first (see below).
- Logistic growth toward K (`fit*food*BUG_K_SCALE`) below it, `d -= (d-K)*BUG_DECLINE*dt` above it, then `d -= BUG_MORT*dt*(0.5+appetite)*(1+BUG_CROWD*d)*d`. Cells under `BUG_MIN` are cleared.
- Effects:
  - Pest: `plants.damage(i, d*appetite*PEST_BITE*dt)`, summed into `pestDamage`.
  - Detritivore: `soil.consumeLitter(i, litter*d*DETRI_RATE*dt)`; `DETRI_RECYCLE` of it goes to nutrients (clamped at `SOIL_MAX`).
  - Parasite: sets `animals.parasiteLoad[i] = d*appetite` and `parasiteHost[i] = hostGene`.
  - Pollinator: raises `plants.poll[i]` to `(0.5+0.5*spec)*match*d` if higher.
- Spread with chance `mobility*d*BUG_SPREAD*dt`.

Then `_sumTotals` and `_checkCollapse`.

### Mechanics

- **Spread (`_spread`):** a target 1–2 tiles away (1–3 when mobility > 0.7), never water for land-only niches. A same-species resident just gains `BUG_SEED_D*0.5`. Otherwise food is pre-checked with the parent genome and a stronger resident rejects early; then the child mutates (masked genes kept), pollinator hue drifts `POLL_DRIFT` toward the target's `nectarHue`, and the child needs `fit*food >= 2*BUG_MIN`. Against a resident, strength is `density*fit` and the invader wins with probability `(cs-rs)/cs`.
- **Speciation (`_assign`):** as for plants, with `BUG_WEIGHTS`, `BUG_SPECIATION`, distance to the parent's `mean`, `matchDaughter` at the full threshold and `canSplit(parentSp, BUG_SPLIT_MIN_POP)`; logs a `'speciation'` entry. The comparison runs on a copy of the child (`_cmp`) whose hue is unwrapped to within 0.5 of the parent's mean hue, and that copy is what `matchDaughter` sees.
- **Locust swarms (`_swarm`):** a pest cell with density > `LOCUST_DENSITY`, swarm gene > `LOCUST_SWARM_GENE` and `plants.edible(i) < LOCUST_BARE` moves `LOCUST_FRAC` of its density to a land tile 4–8 away, at most once per `LOCUST_COOLDOWN` ticks per species and once per `LOCUST_GAP` ticks world-wide (`_lastSwarm`, set by `_swarm`). The trigger uses the density before the step's K decline. Logs "<name> locusts are swarming" (rate-limited per species).
- **Pollinator collapse (`_checkCollapse`):** tracks a decaying peak of pollinator mass; when mass falls below `COLLAPSE_FRAC` of a peak of at least `COLLAPSE_MIN_PEAK`, increments `collapses` and logs, at most once per `COLLAPSE_GAP`.
- **`edibleAt(i)`** is pest + detritivore + pollinator density. **`eat(i, amount)`** removes density proportionally from those three planes, clears cells under `BUG_MIN`, updates `total` and `eaten`, and returns the amount taken.
- **`clean(i, f)`** (slice 3) removes the fraction `f` of the parasite plane on tile `i` (clearing it under `BUG_MIN`), lowers `total` to match and scales `animals.parasiteLoad[i]` by the same factor. Nest holders call it on their home tile.
- **`reintroduce(niche)`** places a random founder of that niche on up to `REINTRO_TILES` empty cells with `K >= 0.15` and logs a `'migration'` entry.
- **`refreshSpeciesMeans()`** recomputes each bug species' `mean`, `density`, `wetFrac`, `category` and `icon`. `mean[B_HUE]` is a circular mean (via summed cos and sin), because pollinator hue wraps at 0/1.
- **`reassignSpecies(fromSp, toSp)`** rewrites `species[niche*n+i]` on all four planes and returns the tile count. Used by the ecosystem merge pass.

---

## Disease (`js/sim/disease.js`)

Pathogens are strains: registry species with `group: 'pathogen'`. A strain's `population` is its current number of infected hosts (animals, or plant slots for blight), so the registry's add/remove, extinction and history machinery work unchanged. Animal infections live in the `AnimalPool` Int32 fields; blight lives in the plant slot planes.

### Constants

- **`DG = 4`**: strain genes. `D_TRANS` 0 (transmissibility), `D_VIR` 1 (virulence), `D_RANGE` 2 (host range), `D_HUE` 3 (colour). **`DISEASE_WEIGHTS`** is `[1, 1, 0.8, 0.3]` and **`DISEASE_SPECIATION`** is 0.1. **`DISEASE_SPLIT_MIN_POP`** is 10 (hosts). **`DISEASE_KINDS`** is `['animal', 'plant']`.

| Constant | Value | Use |
| --- | --- | --- |
| `VIR_TRADE` | 0.75 | Effective transmissibility `trans*(1-VIR_TRADE*vir)`. The plan asked for 0.5; 0.75 was kept after tuning because lower values let the disease death share pass 25% by year 20. |
| `DUR_BASE` | 200 | Animal infection duration `DUR_BASE*(1-0.5*vir)`. |
| `RES_DUR` | 0.6 | `infectAnimal` shortens the infection to `max(1, sDur*(1-RES_DUR*res))`. Together with `RES_NUDGE` in animals.js (a recovered parent adds 0.02 to its child's resistance), this lets resistance climb in heavily infected species. |
| `BLIGHT_DUR` | 150 | Blight duration base, same formula. |
| `RANGE_BASE`, `RANGE_SPAN` | 0.05, 0.25 | Host range radius `RANGE_BASE+RANGE_SPAN*range`, as a gene distance between host species genomes. |
| `JUMP_K`, `JUMP_K_P` | 0.02, 0.001 | Jump multiplier for animal and plant exposures outside the host range. |
| `JUMP_SPAN` | 0.15 | Distance beyond the host range at which jump chance falls to 0. |
| `JUMP_CLS_K` | 0.5 | Multiplier on a cross-class transmission (v3 Part 1 slice 1), so jumps between classes are rarer than within one. |
| `INVERT_EMERGE` | 0.15 | Invertebrate host species count `population*INVERT_EMERGE` in the emergence draw. |
| `JUMP_LOG_GAP` | 1200 | Minimum ticks between jump log entries per strain-and-host pair. |
| `PATHO_MUT` | 0.015 | Chance per transmission that the strain mutates. |
| `PATHO_MUT_RATE`, `PATHO_MUT_SD` | 0.5, 0.05 | `mutateGenes` rate and sd for that mutation. |
| `PATHO_DRIFT` | 0.5 | Share by which a sub-threshold mutation moves the strain's `mean`. |
| `SEED_HOSTS`, `SEED_R` | 10, 6 | Animals infected at emergence, within this radius of the index case. |
| `SEED_TILES`, `SEED_TILE_R` | 12, 3 | Plant slots infected at emergence, within this square radius. |
| `EMERGE_MIN_A`, `EMERGE_MIN_P` | 40, 150 | Minimum host species population to be picked for emergence. |
| `EMERGE_GAP` | 900 | Ticks without any live strain of a kind after which one emerges. |
| `EMERGE_P` | 0.05 | Chance per emergence check (every 60 ticks) of a spontaneous emergence per kind. |
| `EMERGE_VIR` | 0.45 | Mean virulence gene of an emerged strain. |
| `EMERGE_SD` | 0.08 | Spread of emerged strain genes around trans 0.5, vir `EMERGE_VIR`, range 0.3. |
| `BLIGHT_EVERY` | 3 | The blight pass runs every 3 ticks. |
| `BLIGHT_DMG` | 0.08 | Health loss per tick `BLIGHT_DMG*vir*(1-BLIGHT_RES*blightRes)`. |
| `BLIGHT_SPREAD` | 0.08 | Neighbour infection chance factor on effective transmissibility. |
| `BLIGHT_RES` | 0.8 | Strength of gene 14 against blight damage and spread. |
| `MONO_BOOST` | 2 | Spread multiplier into a neighbour of the same species. |
| `CARCASS_DECAY`, `VECTOR_DECAY` | 0.97, 0.95 | Per-tick decay of the carcass and vector planes. |
| `LOAD_MIN` | 0.02 | Loads below this are cleared. |
| `DIEOFF_EVERY`, `DIEOFF_WINDOW` | 60, 5 | Die-off check period and window length (in checks). |
| `DIEOFF_MIN`, `DIEOFF_FRAC` | 20, 0.3 | A strain whose window deaths reach `max(DIEOFF_MIN, DIEOFF_FRAC*hostPop)` logs a mass die-off (once per strain). |

### `DiseaseLayer(world, plants, animals, registry, log, rng)`

- **State:** `on` (mirrors `options.disease`), `dirty` (anything to clear), `version` (bumps every step and clear).
- **Exposure planes** (per tile, length `n`): `carcassStrain`/`carcassLoad` and `vectorStrain`/`vectorLoad`.
- **Blight list:** `bList` (Int32 `2n`), `bIn` (Uint8 `2n` de-duplication flags), `bCount`. Released slots are compacted out in place during the blight pass.
- **Per-strain caches** indexed by strain id, grown by `_ensure`: `sTrans` (effective transmissibility), `sVir`, `sRange`, `sDur`.
- **`live`**: a Set of strain species with population above 0. **`speciesStrain`**: a Map from host species id to its most prevalent strain id, rebuilt in `refreshSpeciesMeans`.
- **Counters:** `sickAnimals`, `blightSlots`, `animalDeaths`, `plantDeaths`, `created`, `mutated`, `jumps`, `outbreaks`, `blights`.

**Strain species fields:** `hostKind` (`'animal'` or `'plant'`), `hostId` and `hostGenome` (the host species' reference genome), `category` (`'virus'` or `'blight'`), `icon` (animal strains take `STRAIN_ICONS[id % 5]`, which are `virus`, `bacterium`, `protozoan`, `prion` and `helminth`; blights take `BLIGHT_ICONS[id % 2]`, which are `blight` and `mold`), `infected` (= `population`), `deaths`, `recentDeaths`, `hosts` (Map host species id to count, refreshed every 20 ticks), `origin` (`'emerged'`, `'jump'` or `null` for a mutation), `hostCls` (the class index of the host species when the strain was created, from `sp.cls`; -1 for blights and hosts without a class). A strain's `hostCls` never changes; a jump strain takes its new host's class. Hue is 55–150° for animal strains and 18–68° for blights, from gene 3.

### Transmission

- **`exposeAnimal(j, s, k)`**: no-op if `j` is infected, innately immune to `s`, or still immune to `s`. It rolls `r` once against `k*sTrans*(1-RES_EFFECT*res)*(1+ELDER_INFECT*(1-ef)/(1-ELDER_MIN))` (elders up to ×1.5), then against that times `_compat`.
- **`_compat`** returns 1 when the host species is the strain's host or its reference genome is within `sRange` of `hostGenome`. Otherwise it is `jk*(1-(d-range)/JUMP_SPAN)` (0 when negative) and marks the transmission as a jump.
  - Cross-class (v3 Part 1 slice 1): when `st.hostCls >= 0` and the host species' `cls` differs, the result is 0 if either class is invertebrate (invertebrate strains stay among invertebrates, so crabs and snails cannot become universal reservoirs). Otherwise an in-range host returns `JUMP_CLS_K` and is marked as a jump, and an out-of-range one is `jk*c*JUMP_CLS_K`.
- **`_transmit`** returns the strain the new host gets: a jump goes through `_jump`; otherwise `_mutate`.
- **`_mutate`**: with `PATHO_MUT`, mutates a copy of `mean`. Within `DISEASE_SPECIATION` of the strain's `mean` it only drifts `mean` (and re-caches the parameters). Otherwise it reuses a `matchDaughter` (full threshold, children and siblings); failing that it founds a new strain and logs a `'speciation'` entry, "X (new strain) branched from Y", but only when `registry.canSplit(st, DISEASE_SPLIT_MIN_POP)`. When the strain cannot split, the mutation only drifts `mean`.
- **`_jump`**: reuses the living child strain already created for that host, or founds one (origin `'jump'`, host = the new species), increments `jumps` and logs an `'outbreak'` entry "X jumped to H as Y", rate-limited per pair. A class jump appends " — from <class> to <class>" (`CLASS_PLURAL`, for example "from mammals to reptiles").
- **Registry bookkeeping:** every infection goes through `_add` (`registry.add`) and every release through `_drop` (`registry.remove`), so `population === infected` always holds.

### Animal and plant API

- `infectAnimal(i, s)`, `releaseAnimal(i)` (returns the strain), `recoverAnimal(i)` (sets `immune` and `imTime = IMMUNE_TICKS`), `countDeath(s)`, `animalDied(i, tile, frac)`.
- `infectPlant(p, s)` (sets `blightT` from `sDur`, adds to `bList`), `releasePlant(p)`, `blightDeath(p)`.

### `step(tick)`

Runs after animals, only when `on`. Decays both exposure planes; every `BLIGHT_EVERY` ticks runs `_blightPass`; every `DIEOFF_EVERY` ticks runs `_dieoff`.

- **`_blightPass`**: for each listed slot, damages `health`, counts `blightT` down (at 0 the slot recovers: `blightImm = s` and release), and tries the four same-plane neighbours with `_blightTry`. A neighbour must be occupied, uninfected and not immune to `s`; chance is `sTrans*BLIGHT_SPREAD*(MONO_BOOST if same species)*(1-BLIGHT_RES*blightRes)`, with `_compat` (`JUMP_K_P`) for other species.
- **`_dieoff`**: keeps a rolling window of each live strain's deaths in `recentDeaths` and logs an `'outbreak'` entry "X caused a mass die-off of H".

### Emergence

- **`maybeEmerge(tick)`**, called from `Ecosystem.step` every `DISEASE_EVERY` (60) ticks when disease is on, whether or not migrations are on: per kind, emerges a strain when none of that kind has been live for `EMERGE_GAP` ticks, or with `EMERGE_P`.
- **`emerge(kind, tick)`** picks a host species weighted by population (plants exclude fungi; invertebrates weigh `population*INVERT_EMERGE`), creates a strain with origin `'emerged'`, seeds it (`_seedAnimals` or `_seedPlants`), increments `outbreaks` or `blights`, and logs an `'outbreak'` entry: "X broke out among H" or "X blight broke out in H". Returns the strain or `null`. Usable from the UI.

### Other methods

- **`clearAll()`**: releases every infection and blight, clears the planes, list and `speciesStrain`. Idempotent through `dirty`. The ecosystem calls it every tick while disease is off.
- **`refreshSpeciesMeans()`**: rebuilds each live strain's `hosts` and `infected`, and `speciesStrain`.
- **`reassignSpecies(fromSp, toSp)`**: rewrites strain id `fromSp` to `toSp` in `animals.strain`, `animals.immune`, `animals.natImm`, `plants.blight`, `plants.blightImm`, `carcassStrain` and `vectorStrain`, removes `fromSp` from `live` and returns the infected hosts moved. Used by the ecosystem merge pass.
- **`remapHost(fromSp, toSp)`**: points every live strain whose `hostId` is `fromSp` at `toSp`. The merge pass calls it when a plant or animal species merges, so its strains do not start jumping.
- **`hostIndices(strainId, out = [])`**: the animal slot indices (animal strain) or plant slot indices `p` (blight) currently infected.

---

## Weather (`js/sim/weather.js`)

`WeatherLayer` adds runtime water to the static map: per-tile surface wetness and snow, moving storms, droughts, a drinkable-water mask and a distance-to-fresh-water field. It is DOM-free, allocates everything in the constructor, and does its per-tile work every `WEATHER_EVERY` ticks.

### Constants

| Constant | Value | Meaning |
| --- | --- | --- |
| `WEATHER_EVERY` | 4 | Ticks between tile, storm and drought updates. |
| `WATER_DIST_MAX` | 40 | Cap (and unreached value) of `waterDist`. |
| `MAX_STORMS` | 8 | Storm pool size. |
| `STORM_P` | 0.2 | Base spawn chance per update, times `1 - STORM_SEASON*season`. |
| `STORM_SEASON` | 0.8 | Seasonal skew: spawns run 0.2x at `season = 1` and 1.8x at `season = -1` (the wet season is the negative half of the sine, autumn and winter). |
| `STORM_R_MIN`, `STORM_R_MAX` | 6, 18 | Storm radius range. |
| `STORM_RAIN` | 0.25 | Mean rain per update at the storm centre (each storm draws 0.6–1.4x). |
| `STORM_SPEED` | 0.7 | Tiles per tick along the prevailing wind (each storm draws 0.6–1.4x, then eases toward the wind at 5% per update). |
| `STORM_LIFE_MIN`, `STORM_LIFE_MAX` | 120, 360 | Storm lifetime in ticks. Rain fades over the last 40. |
| `STORM_SAMPLES` | 5 | Random tiles sampled per spawn; the most humid one is the spawn point. |
| `WIND_TURN` | 0.01 | The wind angle turns by `WIND_TURN*(0.5+rand)` radians per update. |
| `EVAP` | 0.0017 | Evaporation: `wet -= wet*EVAP*(0.5+temperature)` per update, doubled in a drought. |
| `SNOW_T` | 0.28 | Effective temperature below which storms drop snow instead of rain, and above which snow melts. |
| `SEASON_T` | 0.08 | Seasonal temperature swing: `seasonT = SEASON_T*season`. |
| `SNOW_MELT` | 0.02 | Snow melted into `wet` per update when warm enough. |
| `SNOW_SHOW` | 0.1 | Snow depth counted as snow cover in `snowTiles`. |
| `POOL_WET` | 0.7 | A land tile wetter than this is a pool and is marked `fresh`. |
| `DROUGHT_P` | 0.2 | Chance of a drought at each year boundary. |
| `DROUGHT_MIN`, `DROUGHT_MAX` | 240, 720 | Drought length in ticks. |
| `DROUGHT_STORMS` | 0.2 | Spawn chance multiplier during a drought. |
| `DROUGHT_EVAP` | 2 | Evaporation multiplier during a drought. |
| `DROUGHT_MOIST` | 0.8 | `moistMul` multiplier in a drought on tiles with `wet < 0.1`. |
| `DRY_FLOW` | 0.5 | River and pond tiles with `riverFlow` below this stop being fresh in a drought. Lakes never dry. |
| `MOIST_BASE`, `MOIST_K` | 0.8, 0.4 | `moistMul = MOIST_BASE + MOIST_K*wet`. |
| `STORM_LOG_R` | 12 | Minimum radius for a new storm to be logged. |
| `STORM_LOG_EVERY` | 240 | Minimum ticks between logged storms. |
| `COMPASS` | 8 names | Compass directions from `north` clockwise, used by `_logStorm`. |

### `WeatherLayer(world, plants, log, rng)`

"Land" below means `plants.water[i] === 0`. Water tiles never get rain, snow or evaporation, and keep `moistMul` 1.

| Field | Type | Meaning |
| --- | --- | --- |
| `wet` | Float32 `n` | Surface wetness 0..1. Starts at `world.humidity` on land. |
| `snow` | Float32 `n` | Snow depth 0..1. |
| `moistMul` | Float32 `n` | Plant growth-rate multiplier (see Plants). Shared by reference as `plants.moistMul`. |
| `fresh` | Uint8 `n` | 1 where the tile is drinkable now: lake, river or pond tiles (minus low-flow river and pond tiles in a drought), plus land pools (`wet > POOL_WET`). Pools are refreshed every update. |
| `waterDist` | Uint8 `n` | 4-neighbour BFS steps to the nearest fresh lake, river or pond tile, capped at `WATER_DIST_MAX`. Ocean is salt: it is never a source and the BFS does not cross it. Pools are not sources. Rebuilt only at construction and when a drought starts or ends. |
| `storms` | Array of 8 | Preallocated `{on, x, y, vx, vy, r, rain, life, p1, p2}`; `p1`, `p2` are phases of the edge noise. |
| `stormCount` | int | Active storms. |
| `windA` | float | Prevailing wind angle (radians). |
| `season`, `seasonT` | float | The season value passed to `step` (0 when seasons are off) and `SEASON_T*season`. |
| `drought`, `droughtEnd`, `lastDroughtEnd`, `droughts` | | Drought flag, end tick, the tick the last one ended, and the number started. |
| `rainTiles` | int | Land tiles that received rain in the last update (each counted once, through the `_mark`/`_pass` stamp). |
| `snowTiles` | int | Land tiles with `snow > SNOW_SHOW`. |
| `meanWet`, `meanMoist` | float | Mean `wet` and mean `moistMul` over land, from the last update. |
| `on` | bool | Set through `setOn(on, tick)`. |
| `lastStormLog` | int | Tick of the last logged storm, starting at `-STORM_LOG_EVERY`. |

Scratch arrays: `_evapK` (per-tile `EVAP*(0.5+temperature)`), `_mark` (Int32 rain stamp), `_queue` (Int32 BFS queue).

### Methods

- **`effTemp(i)`** returns `world.temperature[i] + seasonT`. Snow and melt use it, and animal temperature effects should use it too.
- **`step(tick, season)`** sets `season`/`seasonT` every tick, then returns unless the layer is on and `tick % WEATHER_EVERY === 0`. Otherwise, in order:
  1. Ends the drought when `tick >= droughtEnd`.
  2. At a year boundary, with no drought and at least `YEAR_TICKS` since the last one ended, starts a drought with chance `DROUGHT_P`.
  3. Turns the wind and maybe spawns one storm (`_spawnStorm(tick)`: best of `STORM_SAMPLES` humid sample tiles, heading within ±0.4 rad of the wind). A new storm with `r >= STORM_LOG_R` is logged by `_logStorm` when at least `STORM_LOG_EVERY` ticks have passed since the last log.
  4. Moves each storm (`_moveStorm`) and deposits on a noisy disc: the edge radius is `r*(0.75 + 0.125*(2 + sin(x*0.47+p1) + sin(y*0.53+p2)))`, the amount `rain*fade*(1 - d/edge)`. Where `effTemp < SNOW_T` it adds to `snow`, otherwise to `wet` (both clamped at 1). A storm dies when its life runs out or it leaves the map.
  5. `_updateTiles`: evaporation, snow melt (`min(snow, SNOW_MELT)` moves into `wet` when `effTemp > SNOW_T`), `moistMul`, pool `fresh` flags, `snowTiles`, `meanWet`, `meanMoist`.
- **`_logStorm(tick, s)`** pushes a `'weather'` event "Storm over the <biome> in the <place>", or "Blizzard over …" when `effTemp` at the centre tile is below `SNOW_T`. The biome is the centre tile's `BIOME_INFO` name; the place is "the heartland" within about 0.14 map widths of the centre, otherwise the `COMPASS` direction from the map centre. It uses no RNG and sets `lastStormLog`.
- **`setOn(on, tick)`**: turning off clears storms, sets `moistMul` to 1 and ends any drought silently (restoring `fresh` and `waterDist`). `wet` and `snow` stay frozen while off.
- **`_startDrought(tick)`** / **`_endDrought(tick, silent)`** set the flag, recompute the base `fresh` mask (`_setFresh`) and rebuild `waterDist` (`_buildWaterDist`), and log `'weather'` events.

### Tuning notes

- Mean `moistMul` over land outside droughts is 1.00–1.05 on seeds 42, 7 and 123, so baseline plant cover holds. Cold land is drier than average, because its storms drop snow that only melts in the warm half of the year.
- Tiles with base temperature below about 0.2 never melt, so they keep permanent snow.
- Weather is independent of animals: with the same seed and world, storms and droughts are identical whatever the animals do.

---

## Ecosystem (`js/sim/ecosystem.js`)

`Ecosystem` runs one world. It seeds the founders, advances plants and animals, runs migrations, samples history and writes the event log.

### Globals

- **`STAT_GROUPS`**: one group per animal class since v3 Part 1 slice 1, given as `{key, cls, label, icon}` in `ANIMAL_CLASSES` order (the array index equals `cls`):

  | Key | `cls` | Label | Icon |
  | --- | --- | --- | --- |
  | `fish` | 0 | Fish | `fish` |
  | `amphib` | 1 | Amphibians | `frog` |
  | `reptile` | 2 | Reptiles | `lizard` |
  | `mammal` | 3 | Mammals | `deer` |
  | `bird` | 4 | Birds | `owl` |
  | `invert` | 5 | Invertebrates | `crab` |

  The old domain-and-diet groups (`landHerb` … `waterCarn`, `landScav`) are gone.
- **`ROLE_KEYS`** is `['herb', 'omni', 'carn', 'scav']` and **`ROLE_LABELS`** is `['Herbivores', 'Omnivores', 'Predators', 'Scavengers']`, both in `roleIndex` order.
- **`MIGRATE_PREY = 150`**: the prey count a domain needs before `_migrations` revives a missing non-herbivore role.
- **`HISTORY_EVERY = 5`**: the population history is sampled every 5 ticks.
- **`MERGE_EVERY = 120`**, **`MERGE_MAX_AGE = 960`** (2 years) and **`MERGE_POP`** `{plant: 6, animal: 2, bug: 6, pathogen: 2}` drive `_mergePass`.
- **`THIRST_EVERY = 60`**, **`THIRST_WINDOW = 8`** drive `_thirstStats`; **`HERD_STAT_EVERY = 20`**, **`HERD_STAT_POP = 12`** drive `_herdStats` (run in the 20-tick block).
- **`HERB_RESCUE = 30`**: `_migrations` brings in land mammal herbivores when mammal herbivores are below this.
- **`BIRD_REVIVE = 5`** (slice 2): `_migrations` revives a bird niche whose live count (`stats.birdNiches`) is below this.
- **`DISEASE_EVERY = 60`**, **`DISEASE_WINDOW = 8`** and **`OUTBREAK_MIN_POP = 30`** drive emergence checks and `_diseaseStats` (window of 8 checks, about one year; outbreaks only count for hosts that peaked at 30 or more).

### `new Ecosystem(world, seed, options)`

- **Options:** `{migrations: true, seasons: true, disease: true, weather: true}` by default. All four can be toggled at runtime through `eco.options`. With `weather` off, `wet` and `snow` freeze, `moistMul` is 1, and there are no storms or droughts.
- **RNG streams:** each part of the system uses its own RNG stream, so adding draws in one subsystem does not reshuffle the others.

  | Stream | Seed |
  | --- | --- |
  | Ecosystem | `seed*7+11` |
  | Registry names | `seed+99` |
  | Plants | `seed+555` |
  | Animals | `seed+777` |
  | Bugs | `seed+333` |
  | Disease | `seed+444` |
  | Weather | `seed+888` |

- **Fields:**
  - `world`, `seed`, `tick`, `log`, `registry`, `plants` and `animals`.
  - `stats` holds `plants` (cover tiles), `plantBiomass`, `animals`, and one count per `STAT_GROUPS` key.
  - `stats` also holds `fruit` (`plants.totalFruit`), `fungi` (`plants.fungusTiles`), `flowers` (`plants.flowerTiles`), `litter` (`soil.totalLitter`) and `carrion` (`soil.totalCarrion`).
  - `stats.roles` holds one `{herb, omni, carn, scav}` object per group key. `_computeStats` counts every animal into an `Int32Array` at `cls*4 + roleIndex(diet, scav)`, writes the four role counts per class and sets `stats[key]` to their sum, so each animal is counted once. The scavenger split applies in every domain.
  - `stats` also holds `bugs` (rounded total density), `pests`, `detritivores`, `parasites`, `pollinators` (occupied tiles per niche) and `pollination` (`plants.flowerPoll`).
  - `bugs` is the `BugLayer` (or `null` when `bugs.js` is not loaded). It is built after the animal founders and assigned to `animals.bugs`.
  - `stats` also holds `sick` (`disease.sickAnimals`), `blight` (`disease.blightSlots`), `strains` (live strain count) and `diseaseDeaths` (`disease.animalDeaths`).
  - `stats` also holds `diseaseShare` (rolling one-year disease share of animal deaths, a fraction) and `worstOutbreak` (`{tick, id, from, to, drop}` or `null`), both set by `_diseaseStats`; `swarms` (`bugs.swarms`, cumulative); and `carrionShare` (`animals.carrionEnergy / animals.scavEnergy`, cumulative, 0 before any land scavenger has gained energy).
  - Internal disease bookkeeping: `_deathRing` (`Float64Array` of 16), `_deathIdx`, `_deathLast`, `_outbreaks` and `_obPeak`.
  - `stats.speciations` is the same object as `registry.speciations` (per-group speciation counts).
  - `disease` is the `DiseaseLayer` (or `null` when `disease.js` is not loaded). It is built after the bugs with its own RNG and assigned to `animals.disease` and `plants.disease`.
  - `weather` is the `WeatherLayer` (or `null` when `weather.js` is not loaded). It is built right after the plants, before the animal founders, and its `moistMul` and `snow` are assigned to `plants.moistMul` and `plants.snow`.
  - `stats` also holds `thirstDeaths` (`animals.deaths.thirst`), `thirstShare` (rolling one-year thirst share of land deaths, from `_thirstStats`), `herds` (living animal species with population of at least 12, mean herd above 0.4 and mean terr at most 0.5, from `_herdStats`), `territories` (`animals.holders`) and `deaths` (a copy of `animals.deaths`, including `thirst`).
  - `animals.setWeather(weather)` runs right after the weather layer is built, before the founders; `_introduce` gives amphibious archetypes domain 2 and skips sites with `waterDist > 2`.
  - `stats.weather` is `{storms, rainTiles, snowTiles, drought, droughts}` and `stats.meanWet` is the mean land `wet`, copied from the weather layer in `_computeStats`.
  - `eggs` is the `EggPool` (or `null` when `eggs.js` is not loaded), built right after `animals.setWeather` and assigned to `animals.eggs`.
  - `stats.plantStages` is `{seedTiles, seedlings, mature, old, oldDeaths, germinated, grazedSeedlings}`, copied in `_computeStats` from `plants.stages` and the three cumulative plant counters.
  - `stats.stages` is `{eggs, juveniles, adults, elders}`: `eggs` is `eggs.count`; each animal is a juvenile (`age < mature`), an elder (`age > ELDER_AGE*maxAge`) or an adult. `stats.eggs` is `{laid, hatched, eaten, failed}`, cumulative copies of the `EggPool` counters. Both are set in `_computeStats`.
  - `stats.birdNiches` (slice 2) maps each `BIRD_NICHES` key to its live bird count (fisher when `nic`, otherwise by role), and `stats.birdMigrants` copies `animals.birdMigrants`; both are set in `_computeStats`.
  - `stats.nests` (slice 3) is `{nests, dens, nesters, natal, nestEggs, eggsPerNest, raids, repelled, paraFailed}`, set by `_nestStats()` every 20 ticks: distinct nest and den tiles, animals holding a nest or den, natal young, live nest eggs, nest eggs per nest tile (2 decimals), and the cumulative `EggPool` raid, repel and parasite-failure counters.
  - `history` holds `tick`, `plants` (rounded biomass), `bugs`, `sick`, `thirstDeaths`, `herds`, `territories`, `eggs` (`stats.stages.eggs`), `nests` and `dens` (`stats.nests`), `birdNiche.<niche>` per bird niche, one array per group key, and one per class and role as `<key>.<role>` (for example `mammal.carn`, `invert.herb`), which feed the class card role sparklines. When it passes 800 samples, it keeps every second sample.

### Methods

**`step()`**:

1. Advances `tick`.
2. Handles the seasons toggle. When seasons are off, `plants.seasonAmp` is zeroed. When seasons are switched back on, it is rebuilt through `plants._prepareClimate()`. It also sets `plants.seasonsOn` from `options.seasons`, which pins `bloomNow` and `fruitNow` at 0.5 when seasons are off.
3. Sets `disease.on` from `options.disease`, and calls `disease.clearAll()` while it is off.
4. Steps the plants, then the weather (`weather.setOn(options.weather, tick)`, then `weather.step(tick, seasons ? plants.season : 0)`), then the bugs, then the animals, then the eggs (`eggs.step(weather)`), then the disease layer.
5. Every 20 ticks, refreshes the species means of all four layers and runs `_herdStats` and `_nestStats`.
6. Every `MERGE_EVERY` ticks, runs `_mergePass`.
7. Computes stats and logs extinctions.
8. Every 60 ticks, runs migrations if they are enabled.
8a. Every `DISEASE_EVERY` (60) ticks, when a disease layer exists: calls `disease.maybeEmerge(tick)` if `options.disease` is on, then `_diseaseStats()`.
9. Every 5 ticks, samples history.

**`_introduce(arch, origin, count)`** places a founder or migrant group in clusters of 4–8, in good habitat. It passes `arch.cls` to `newSpecies` and `animalCategory`:

- For the first 3000 of its 4000 placement attempts, the site needs a climate fit of at least 0.55. After that, 0.1 is enough.
- The site needs food of at least 0.05. Only animals with diet below 0.6 check the site's actual edible biomass; the others treat food as 0.3.
- Founders start between 0.6 and 1.6 times their maturity age.
- Air-domain founders (birds) are placed only on land tiles, and `arch.nic` is passed to `newSpecies`.

**`_migrations()`** is a safety net that re-introduces a class role that has died out. Rewritten generically in v3 Part 1 slice 1 over `stats.roles`. `pick(cls, role, domain)` chooses a random archetype with that class, `ROLE_KEYS[roleIndex(diet, scav)]` and (when given) domain, or `null`; `tryIntro` brings in 60% of its founder count and logs "<name> migrated in — <why>":

1. **Mammal herbivore rescue:** mammal herbivores below `HERB_RESCUE` (30) bring in a land mammal herbivore ("grazers had vanished").
2. **Fish rescue:** fewer than 20 fish, or 0 fish herbivores, bring in a fish herbivore ("the waters were empty").
3. **Any founder role:** every archetype defines a key `<class>.<role>.<land|water>` (amphibious counts as land). Skipping the two keys above and repeats, a key fires when its class has 0 animals in that role (the count is per class, not per domain) and, for non-herbivore roles, the domain's prey is at least `MIGRATE_PREY` (150). Land prey is mammal herbivores and omnivores plus reptile and invertebrate herbivores; water prey is fish herbivores and omnivores plus invertebrate herbivores. Herbivore roles need no prey. It then picks an archetype of that class, role and the key archetype's domain. The reason reads "unchecked prey drew predators" (carnivores), "carcasses drew scavengers" (scavengers) or "the <class label> had vanished".

- Every rule is a separate test, so several can fire on the same pass.
- Since slice 2 the key also carries the archetype's `nic` (`<class>.<role>.<domain>.<nic>`), `pick` matches `nic`, and the "has 0 animals" test counts live animals per class, role and domain index. Bird keys instead fire when the matching `stats.birdNiches` count is below `BIRD_REVIVE`; fishing birds use water prey. Bird reasons read "fish in the shallows drew fishing birds", "unchecked prey drew raptors", "carcasses drew carrion birds" or "the skies were empty".
- Any bug niche with 0 occupied tiles is reintroduced with `bugs.reintroduce(niche)`.

**`_diseaseStats()`** runs every `DISEASE_EVERY` ticks:

- Keeps a ring of the last `DISEASE_WINDOW` (8) deltas of total animal deaths and disease deaths (a counter reset outside the ecosystem is treated as a restart) and sets `stats.diseaseShare` to disease deaths over all deaths in the window, as a fraction (about one year).
- For each animal host species of a live strain (`disease.speciesStrain`), tracks `{from, low}` in `_obPeak`: `from` is the peak population since tracking began and `low` the lowest since that peak. When a host species leaves the map it pushes an outbreak `{tick, id, from, to, drop}` if `from >= OUTBREAK_MIN_POP` (30); an extinct, non-merged host counts as `to = 0`, `drop = 1`.
- `stats.worstOutbreak` is the entry with the largest `drop` among outbreaks from the last `YEAR_TICKS`, or `null`.

**`_mergePass()`** folds tiny young offshoots back into their parent. A living species qualifies when it has a parent and no `origin` (so founders, migrants, emerged strains and host jumps never merge), is younger than `MERGE_MAX_AGE`, has a population at or below `MERGE_POP[group]`, and its parent is alive. The matching layer's `reassignSpecies` moves every member (plants, animals, bugs, or the disease layer for strains); for a plant or animal it also calls `disease.remapHost`; for an animal it also calls `eggs.reassignSpecies` so pending eggs follow the merge; then `registry.merge` moves the count and sets `merged`.

**`_logExtinctions()`**:

- Logs an extinction only when the species was notable: a plant or bug with a peak of at least 60 tiles, an animal with a peak of at least 12, or a pathogen with a peak of at least 15. A pathogen's entry reads "burned out" instead of "went extinct".
- Skips the log line for a merged species (`sp.merged`).
- Pushes a final 0 into the species' history.

**`seasonName()`** returns Spring, Summer, Autumn or Winter, by quarter of `YEAR_TICKS`. **`year()`** returns the 1-based year.

---

## Icons (`js/icons.js`)

The vector icons are drawn on a 32×32 box, in side view, facing right. The same definitions feed both the UI (inline SVG) and the WebGL sprite atlas.

- **`ICONS`** maps a name to a list of parts. Each part is `[role, pathData]`, or `[role, pathData, strokeWidth]` for stroked lines. The role decides the part's color:
  - `'body'`, `'dark'` and `'light'` are tinted per species.
  - Any role starting with `#` is a fixed color, used for eyes, bark and flowers.
- **Names** fall into four groups:
  - Plant categories: `grass`, `reed`, `moss`, `shrub`, `cactus`, `tree`, `conifer`, `palm`, `algae`, `kelp` and `plankton`, plus the Part 2 categories:

    | Icon | Design |
    | --- | --- |
    | `fruittree` | Broadleaf canopy with fixed orange-red fruit dots (`#e8552c`) and pale highlights. |
    | `berrybush` | Shrub outline with fixed dark-blue berry clusters (`#23306e`) and pale-blue glints. |
    | `flower` | Three blooms on fixed green stems and leaves. The petals use the `body` role, so they take the species colour, around a `dark` ring and a fixed yellow centre (`#f4d03f`). |
    | `puffball` | Round cluster of three `body` puffs on a ground line, with apex pores. |
    | `inkcap` | Tall `body` bell on a fixed off-white stem, with a ragged dark rim and gill lines. |
    | `toadstool` | Wide `body` cap with fixed white spots, on an off-white stem with a ring. |
    | `truffle` | Small knobbly `body` mound, half-buried under a fixed brown soil band. |

    Every mushroom cap uses the `body` role, so it shows the species hue (from gene 12).
  - Land animals: `rabbit`, `deer`, `bison`, `mouse`, `boar`, `bear`, `fox`, `wolf` and `bigcat`.
  - Water animals: `fish`, `turtle`, `crab`, `pike` and `shark`.
  - Alternative animal skins: `chicken`, `cow`, `horse`, `lobster` and `shrimp`, chosen by `animalIcon`.
  - Amphibians and reptiles (Part 3 slice 3), appended last so earlier atlas cells keep their positions (144 icons, 12 atlas rows):

    | Icon | Design |
    | --- | --- |
    | `frog` | Sitting pose with a bent thigh line, `dark` spots, `light` belly and a gold eye with an oval pupil. |
    | `toad` | Squat dome with warts, a parotoid gland, stubby `dark` legs and a gold eye with a horizontal pupil. |
    | `newt` | Slim body with a crested tail fin, a wavy `dark` crest and a `light` belly. |
    | `salamander` | Stout body with big `light` spots. |
    | `axolotl` | Fixed pink gill strokes (`#e5728f`), a `light` tail fin and a smile. |
    | `lizard` | Slim body, stroked curled tail, bent legs and a `light` dorsal stripe. |
    | `snake` | S-coil stroke (width 3.6), oval head and a fixed red tongue (`#d8423a`). |
    | `tortoise` | High dome with hex scutes, `light` columnar legs and a `dark` rim. |
    | `monitor` | Bulky spotted body, long tapering tail, thick legs and a tongue. |
    | `crocodile` | Long low body, `dark` back scutes and fixed white teeth (`#f4f1e6`). |
  - `egg` (Part 3b slice 3), appended after `crocodile` at index 144, so the atlas holds 145 icons in 13 rows. An upright egg: `body` shell, a `dark` lower shadow band, a `light` highlight stroke on the upper left and five `dark` speckles. It is only drawn on the map (by `_pushEggs`), never as a species icon.
  - `nest` and `den` (v3 Part 1 slice 3), inserted right after `egg` (indices 152 and 153). `nest` is a woven `body` bowl with a `dark` cup opening, `light` weave lines and stray twigs; `den` is a `body` burrow mound with a fixed black entrance (`#141414`) inside a `dark` arch, `light` pebbles and a ground line. Both are map-only markers drawn by `_pushHomes` and the Nests & dens stat card.
  - Bug categories (Part 3), the values `bugCategory` returns:

    | Icon | Niche | Design |
    | --- | --- | --- |
    | `aphid` | pest | Pear-shaped `body` with a round head, rear cornicle, legs and antennae. |
    | `locust` | pest (swarming) | Long `body` with `light` folded wings, a bent hind leg and a pronotum line. |
    | `beetle` | detritivore | Top view: oval `body` shell with a `dark` split line, head, six legs and antennae. |
    | `worm` | detritivore (wet) | One thick `body` stroke in an S-curve, with a `light` sheen and `dark` segment marks. |
    | `tick` | parasite | Top view: round `body` with a `dark` shield and mouthparts, and eight legs. |
    | `leech` | parasite (water) | Flattened tapering `body` with `dark` ring lines and suckers at both ends. |
    | `bee` | pollinator (generalist) | Oval `body` with `dark` stripes and head, and fixed pale-blue wings (`#dbe8f0`). |
    | `butterfly` | pollinator (specialist) | Top view: four `body` wings with `light` spots and a `dark` body and antennae. |

  - Utility: `dot` (the zoomed-out animal marker and the bug swarm particle), `ring` (the highlight ring), `plant`, `paw`, `bug` (the Bugs tab and stat card), `wave`, `virus` (the Disease tab, stat card and sick-animal marker) and `blight` (a spotted leaf). Both disease icons use fixed hex colours for every part, so they read the same whatever the species palette.

  - Ecosystem v2 additions (81 icons, appended after `blight` so the older atlas indices are unchanged):
    - Plant variants (two per plant category, chosen by `plantIcon`): `tallgrass` (seed plumes), `wheat` (fixed gold ears), `cattail` (one fixed brown spike), `bamboo` (jointed culms), `lichen` (ringed crusts on a fixed grey rock), `clover` (trefoil with a fixed pink bloom), `hedge` (clipped box), `heather` (fixed purple flower spikes), `pricklypear` (pads with fixed red fruit), `agave` (spiky rosette), `oak` (lumpy canopy with fixed acorns), `birch` (fixed white trunk with black marks), `pine` (flat tiered clouds on a fixed red trunk), `cypress` (narrow column), `coconut` (leaning trunk with fixed brown nuts), `fanpalm` (jagged fan leaves), `sealettuce` (ruffled sheets), `redalgae` (fork-lobed frond), `seagrass` (ribbon blades on fixed sand), `bladderkelp` (bulb with streaming blades), `diatom` (striated pennate shell and a small disc), `radiolarian` (spined lattice sphere), `appletree` (round canopy with fixed red apples), `cherrytree` (fixed pink blossom and a cherry pair), `blueberry` (sprig with fixed blue berries), `raspberry` (fixed red drupelet cone), `tulip` (cup bloom with fixed green leaves), `sunflower` (fixed yellow petals and brown disc on `body` leaves), `earthstar` (ball on a star of rays), `coralfungus` (branching fingers), `morel` (pitted cone on a fixed off-white stem), `chanterelle` (ridged funnel), `bracket` (shelves on a fixed bark trunk), `porcini` (bun cap on a fixed bulbous stem), `stinkhorn` (thimble cap on a fixed white stalk and volva) and `jellyfungus` (folded lobes on a fixed bark branch).
    - Land animals: `weasel`, `owl` (front view), `coyote`, `hawk` (soaring, seen from below), `tiger`, `squirrel`, `goat`, `kangaroo`, `elephant`, `moose`, `crow`, `raccoon`, `badger`, `monkey`, `ape`, `vulture`, `hyena` and `jackal`.
    - Birds (v3 Part 1 slice 2), seven icons inserted after `vulture` and before `hyena` (indices 105–111): `sparrow` (perched, streaked `dark` back and `light` breast), `parrot` (upright, fixed white face patch and hooked grey bill, long tail), `swallow` (in flight with a forked `dark` tail and a fixed rust throat), `heron` (long S-neck stroke, stilt legs and a fixed yellow dagger bill), `gull` (`light` underside, `dark` wing with a black tip and a fixed yellow bill), `duck` (swimming, `dark` head, fixed blue speculum and orange bill) and `eagle` (fixed white head, yellow hooked bill and talons).
    - Water animals: `hermitcrab` (fixed tan shell), `starfish` (top view), `eel`, `puffer`, `seahorse`, `ray` (top view), `manatee`, `barracuda`, `squid`, `seal`, `orca` (fixed white patches) and `swordfish`.
    - Bugs: `caterpillar`, `ant`, `snail`, `mosquito` and `moth` (top view).
    - Pathogens: `bacterium`, `protozoan`, `prion`, `helminth` and `mold`. Unlike `virus`, these use the three roles, so they take the strain's palette.
    - UI: `events` (a bulleted list), `shadow` (one fixed `#000000` ellipse; the renderer supplies the transparency), `sun`, `moon` and `auto` (half sun, half moon).
    - Weather and UI (Part 4 slice 2), appended after `egg` so the atlas holds 150 icons: `cloud`, `rain` (cloud with falling streaks), `snow` (a six-spoke flake), `drop` (a water drop) and `flag` (a pennant on a pole). They are used by the weather badge, the stat cards and the help overlay.
    - Invertebrates (v3 Part 1 slice 1), nine icons inserted after `drop` and before `flag` (so `flag` moved from index 149 to 158; the atlas is rebuilt at load, so nothing depends on the old index). The atlas held 159 icons after this slice; with the seven birds and `nest`/`den` it now holds 168 icons in 14 rows (`flag` is index 167):

      | Icon | Design |
      | --- | --- |
      | `urchin` | Low `body` dome under two rings of `dark` and `body` spines (`spokes`), with `dark` tubercle dots. |
      | `seasnail` | Tall spiral `body` shell with `dark` whorl lines on a `light` foot and ground line. |
      | `clam` | Ribbed `body` scallop shell over a `dark` lower valve, with a fixed pearl (`#f4f1e6`). |
      | `octopus` | Round mantle with six thick curling `body` arms, `light` suckers and two eyes on fixed white patches. |
      | `jellyfish` | Scalloped `body` bell with `light` trailing tentacles and `body` oral arms. |
      | `slug` | Long low `body` with eye stalks, fixed black eye tips and a `dark` foot line. |
      | `spider` | Round abdomen and head with eight `dark` jointed legs, a `dark` chevron mark and fixed black eyes. |
      | `scorpion` | Segmented `body` with a curled stroked tail and `dark` sting, pincers and legs. |
      | `centipede` | Five `body` segments in a row with `dark` leg pairs, a head with antennae and a fixed black eye. |

  Every `category` value in `plants.js` and `animals.js` is also an icon name.
- **Helpers:**
  - `circ(x, y, r)` builds a circle path.
  - `EYE(x, y, r)` builds a fixed-color eye part.
  - `BARK` is the fixed bark color, and `STEM` the fixed green flower-stem color.
  - `petals(cx, cy, d, r)` builds five petal circles at distance `d` around a centre.
  - `ell(x, y, rx, ry)` builds an axis-aligned ellipse path, and `ellR(x, y, rx, ry, deg)` a rotated one.
  - `spokes(cx, cy, r1, r2, n, a0 = 0, span = 360)` builds `n` radial line segments from radius `r1` to `r2`. With `span < 360` the first and last spokes sit on the ends of the arc.
  - `starPath(cx, cy, ro, ri, n, sy = 1, a0 = -90)` builds an `n`-pointed star polygon, squashed vertically by `sy`.
  - `ringOf(cx, cy, d, r, n, a0 = -90)` builds `n` circles of radius `r` evenly spaced at distance `d`.
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

The atlas is 12 columns wide, with `ceil(ICON_NAMES.length/12)` rows of `cell` pixels. With the current 159 icons that is 14 rows, 768×896 at the default 64px cell. It returns `{width, height, cols, rows, cell, role, fixed}`, where `role` and `fixed` are premultiplied-RGBA `Uint8Array`s with the same layout.

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
  | `u_overlay` | 1 in the data-overlay views (any mode with a `RAMPS` entry) and in `territory`, otherwise 0. |
  | `u_bugs` | The bug cloud texture `bugTex` (texture unit 3). |
  | `u_warp` | Domain-warp strength: `smooth(WARP_ZOOM)` = 0 at zoom 4 up to 1 at zoom 6, and 0 in overlay views and `territory`. |
  | `u_cloud` | Bug cloud strength: `1 - smooth(CLOUD_FADE)` (1 below zoom 9, 0 from zoom 14), and 0 when `showSwarms` is off, in overlay views or in `territory`. |

- Effects, in order:
  - Domain warp: the terrain and info lookups (not the vegetation) are offset by value noise (`hash`, `vnoise`) of up to ±0.35 tiles × `u_warp`, so tile edges read as organic shapes when zoomed in.
  - Water darkens with depth: `col *= 1 - water*smoothstep(0.08, 0.9, depth)*0.3`.
  - The vegetation tint is mixed in by `v.a*u_vegAmount`.
  - In winter, snow creeps down from cold ground: `smoothstep(0.42, 0.18, temp + 0.22*(1-winter))`, on land only.
  - A pale shore band, `(0.62, 0.8, 0.78)` at 0.28 × `water*(1 - smoothstep(0, 0.07, depth))`, lightens shallow water.
  - Water gets a gentle two-octave sine shimmer (amplitude 0.022).
  - The depth darkening, shore band, snow and shimmer are multiplied by `1 - u_overlay`, so the data views (temperature, humidity, altitude, fertility, nutrients and litter) show their raw ramp in winter too.
  - The result is multiplied by hillshade, `t.a*2`.
  - Bug clouds (when `u_cloud > 0`): `u_bugs` is sampled with a 4-tap blur at a noise-warped, drifting position; its alpha is shaped by drifting two-octave value noise (`smoothstep(0.25, 0.7, nz + a*0.3)`), and the unpremultiplied swarm color is mixed in at `a*0.55*u_cloud`, giving soft moving colored haze over swarm-dense land.
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

**`WX_VS` / `WX_FS`** (weather overlay, `wxProg` with `wxVao` on the shared quad buffer):

- One draw per active storm: a quad of ±1.3r tiles around the storm centre; `v_q` is the offset in tiles.
- Uniforms: `u_origin`, `u_scale`, `u_res`, `u_map` as in the terrain pass, plus `u_storm` (`x, y, r, rain × life fade`), `u_seed` (`p1`, `p2`), `u_snow`, `u_time`, `u_px` (tiles per CSS pixel), `u_cloud` and `u_dens`.
- Fragments outside the map are discarded. The cloud edge is noise-shaped (`rr = r*(0.78 + 0.34*n1 + 0.12*n2)`), the body is `1 - smoothstep(0.5rr, 1.05rr, d)`, and the colour runs from light grey to slate by rain strength, darker toward the core and lighter in noise puffs.
- Precipitation is in screen pixels: slanted rain streaks in 6 px columns falling at 260 px/s, or swaying snow flakes on an 11 px grid when `u_snow` is set. Density is `u_dens*(0.3 + 0.7*heavy)`.
- Output is premultiplied, blended `ONE, ONE_MINUS_SRC_ALPHA`.

### Terrain texture layouts

All three are RGBA8 at `width × height`, one texel per tile, with linear filtering.

**`terrainTex`**, built by `setMode`:

| Channel | Contents |
| --- | --- |
| RGB | Base color. |
| A | Hillshade, `shade*127.5`. The shader multiplies by `a*2`, so 0.5 means unshaded. |

The base color depends on the view mode:

- Numeric views use `RAMPS` through `rampLookup`. The modes are `altitude`, `temperature`, `humidity`, `rain`, `water`, `fertility`, `nutrients`, `litter`, `bugs` and `disease`.
- The `humidity` view (Moisture) is live when `eco.weather` exists: `soilField` gets `clamp01(humidity + 0.5*weather.wet)`, and after the ramp lookup each tile is blended toward white (240, 244, 248) by `min(1, snow)*0.75`. Without weather it shows the static `world.humidity`. `humidity` is in `LIVE_MODES`.
- The `rain` view (Rainfall) is live: `soilField` gets `weather.wet`, then `_stormRain(field, Wx)` adds `rain*fade*RAIN_VIEW_K*(1 - d/r)` inside each active storm (clamped at 1). `RAMPS.rain` runs from dry tan to deep blue. Water tiles are drawn `DIM_WATER_RGB` (30, 46, 68), and snow gets the white tint as in `humidity`.
- The `water` view (Water / Thirst) is live: `soilField` gets `waterDist/WATER_DIST_MAX` and `RAMPS.water` runs from teal (at water) to red (far). Tiles with `weather.fresh` set are drawn `FRESH_RGB` (70, 165, 250); other water tiles are `DIM_WATER_RGB`. There is no snow tint. Without weather both views show an all-0 field.
- The `territory` view is categorical: it uses the biome base below, then, on tiles where `animals.terrUntil[i] > animals.tick` and `terrSp[i]` is set, tints the tile with its owner (Part 3b slice 3):
  - The owner of a tile is `terrUid[j]` (or -1 for uid 0) while `terrUntil[j] > tick` and `0 < terrSp[j] < spLookupSize`, otherwise 0 (the local `terrOwner` closure). `_refreshSpeciesLookup` runs before the loop.
  - Interior tiles: the species body color (`spCol[sp*9]`) pushed away from its grey mean by `TERR_SAT` (1.4), clamped to 0-255, then mixed over the terrain at `TERR_MIX` (0.8).
  - Edge tiles (a 4-neighbour has a different owner or none, or the tile is on the map border): the species dark color (`spCol[sp*9+3]`) times `TERR_EDGE_DARK` (0.7), mixed at `TERR_EDGE_MIX` (1). Owners are individual animals, so neighbouring territories of one species are also outlined.
  - Both mixes are scaled by `min(1, (terrUntil - tick)/TERR_FADE)` with `TERR_FADE` 10, so claims fade over their last 10 ticks.
  - In `draw`, `flat = ramp || mode === 'territory'` drives `u_overlay`, `u_warp` and `u_cloud`, so in this view the snow, shore, depth shading, shimmer, domain warp and bug clouds are off. Plant cover is off because `vegOn` is false. `territory` is in `LIVE_MODES`.
- The `nutrients` view reads live soil: `plants.soil.nutrient[i] / SOIL_MAX` is written into the scratch `soilField` (`Float32Array(n)`, made in `setWorld`) and mapped through `RAMPS.nutrients`, from barren grey-brown to rich dark green. Because the soil changes every tick, `draw` calls `setMode(mode)` again for any mode in `LIVE_MODES` (`nutrients`, `litter`, `bugs`, `disease`, `humidity`, `territory`, `rain`, `water`) whenever more than 500 ms have passed since `lastSoilUpdate`.
- The `litter` view reads `plants.soil.litter`. `percentile99(src, out)` finds the 99th percentile of the positive values with a 1024-bin histogram (O(n), no sort), then writes `min(1, litter/p99)` into `soilField`. `RAMPS.litter` runs from grey (none) through tan and rust to dark brown (deep litter). If `soil.litter` is missing, the field is all 0.
- The `bugs` view reads `eco.bugs.total` (summed swarm density of all four niches per tile) through `percentile99` into `soilField`. `RAMPS.bugs` runs from near-black (no bugs) through amber to hot pink (the densest 1%). If `eco.bugs` is missing, the field is all 0. `bugs` is in `LIVE_MODES`, so it re-bakes every 500 ms.
- The `disease` view builds the scratch `sickField` (`Float32Array(n)`, made in `setWorld`): +1 on the tile of every infected animal (`animals.strain[i]` non-zero) and +0.5 on the tile of every blighted plant slot (`plants.blight[p]`, tile `p % n`), plus `vectorLoad*TRAIL_K` (0.6) on every tile with vector load, so infected birds leave visible trails (slice 2). It is left all 0 when `eco.disease` is missing or off. The field goes through `percentile99` into `soilField` and `RAMPS.disease`, from near-black through olive to pale yellow-green. `disease` is in `LIVE_MODES`.
- The `biome` and `vegetation` modes use `BIOME_COLOR_TABLE`, with these overrides:
  - Alpine is bare grey rock that whitens only toward the true peaks, via a smoothstep of altitude from 0.72 to 0.92.
  - Glacier, frozen desert and frozen ocean have fixed colors.
  - Water is darkened with depth (`k = 1 - depth*0.55`).
- The `vegetation` mode desaturates the base so the plant tint dominates.

**`vegTex`**, rebuilt by `_updateVegetation` at most every 180 ms, or when `vegDirty` is set:

| Channel | Contents |
| --- | --- |
| RGB | Body color of the canopy species if its biomass is above 0.3 (or there is no understory), otherwise the understory species, tinted by that plant's health. |
| A | Coverage by the summed biomass of both slots: `min(1,b/1.8)*0.85` on land and `min(1,b/1.4)*0.4` in water. |

- Water tiles blend the species color toward sea-green (`c*0.35 + (20,95,80)`), so pale algae colors do not wash out the sea.
- While a species is highlighted, tiles where it holds either slot get alpha 1 and all others get 0.25×.
- Bloom tint: when the understory species uses the `flower` icon, on land:
  - with no canopy colour chosen, the base is the leaf green `FLOWER_LEAF` `(92,138,66)`, lerped toward the flower's species colour by `bloomFactor(plants.season)*FLOWER_TINT` (`FLOWER_TINT = 0.7`), so meadows turn from green to the bloom colour in spring and early summer;
  - under a canopy (the canopy colour was chosen), the canopy colour is lerped toward the flower colour by that amount times `FLOWER_SHADED` (0.3);
  - the bloom amount is read from `plants.bloomNow` (0.5 when seasons are off); if that field is missing, it falls back to `bloomFactor(plants.season)`, or 0 if `bloomFactor` is not defined.
- Health tint: the color is lerped toward `SICK_RGB` `(150,120,50)` by `(1 - health)*SICK_MIX`, with `SICK_MIX = 0.65`. It is applied after the bloom tint.
- Blight tint: when `plants.blight[p]` is set for the chosen slot, the color is then mixed toward `BLIGHT_RGB` `(125,140,115)` by `BLIGHT_MIX` (0.6), a grey-green cast.

**`bugTex`**, made in `setWorld` (deleted with the old world) and rebuilt by `_updateBugCloud` at most every `BUG_CLOUD_MS` (300 ms) while `u_cloud > 0`:

| Channel | Contents |
| --- | --- |
| RGB | Color of the densest bug species on the tile, premultiplied by A. |
| A | `min(1, total density / BUG_CLOUD_FULL)` with `BUG_CLOUD_FULL = 1.2`; ×0.3 on tiles without a highlighted bug species. |

The CPU copy is `bugData` (`Uint8Array(n*4)`); `lastBugUpdate` holds the last rebuild time.

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
- The gradient factor is 20 and the result is clamped to 0.62–1.28.

### Species color lookup (`_refreshSpeciesLookup`)

- `spIcon` is an `Int16Array` giving the icon index per species id.
- `spCol` is a `Uint8Array(size*9)` holding 9 bytes per species id: `[body r,g,b, dark r,g,b, light r,g,b]`, at offset `id*9`.
- Both grow to `max(nextId+64, 2*size, 256)` when needed. They are refreshed at most once per sim tick, for living species only.
- Instances copy their 9 color bytes from `spCol[id*9…]` into the 12-byte-stride color buffer, which includes 3 padding bytes.
- Plant instances instead copy from `_tinted(id, health, col, blt, old)`, which fills the 9-byte scratch `_tint` with the species colors lerped toward `SICK_RGB` by `(1 - health)*SICK_MIX`, then toward `BLIGHT_RGB` by `BLIGHT_MIX` when `blt` (the slot's `plants.blight` entry) is set, then toward `OLD_RGB` (160,160,160) by `OLD_MIX` (0.25) when `old` is set, and pass it to `_put` with offset 0.
- Infected animals copy from `_infected(id, col)`, which fills `_tint` with the species colors mixed toward `BLIGHT_RGB` by `INFECT_MIX` (0.55).
- Eggs copy from `_eggTint(id, col)`: body = the species light color mixed toward white by `EGG_PALE` (0.15), dark = the species body color, light = white.
- `_writeCol(id, sp)` writes one species' 9 bytes. `_refreshSpeciesLookup` uses it for living species, and `_pushEggs` uses it for egg-only daughter species (population 0, so not in `registry.living`).

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
   - **Plants:** drawn only when `showPlants` is on, the mode is `biome` or `vegetation`, and `zoom ≥ 9`. Each slot with biomass below 0.08 is skipped.
     - Each plant's size scales with biomass and fullness.
     - Each tile gets a stable jitter and flip from a per-tile hash (`i*2654435761`), so the forest does not look like a grid.
     - The understory plant (plane `n + i`) is pushed first, at 0.6× size (fungi, `plants.kind[n+i] === 1`, at `FUNGUS_SCALE` 0.5×), offset toward the lower-left of the tile and flipped opposite to the canopy; the canopy icon then draws over it.
     - Fruit display: plants drawn with the `fruittree` or `berrybush` icon are scaled by `FRUIT_EMPTY_SIZE + (1 - FRUIT_EMPTY_SIZE)*f`, where `FRUIT_EMPTY_SIZE = 0.85` and `f = min(1, plants.fruit[p] / (FRUIT_SHOW*max(b, 0.1)))` with `FRUIT_SHOW = 0.06`. A bare tree is drawn at 0.85×; a laden one at full size. The icon's fruit dots are fixed, so the size change is the fruit cue.
     - Both icons are health-tinted through `_tinted`; old slots (`age > OLD_FRAC*life`) are also greyed.
     - Seedlings (`age < plants.matureAt(p)`) are drawn at `0.5 + 0.5*age/matureAt` of their normal size.
     - Capacity is reserved for two plant instances per visible tile.
   - **Bug swarms (`_pushBugs`):** drawn when `showSwarms` is on and `zoom > 9`, in every view mode, not gated on `vegOn` or `showPlants`. Skipped when `eco.bugs` is missing. Particle alpha is multiplied by `smooth(CLOUD_FADE)`, so dots fade in from zoom 9 to 14 as the terrain bug clouds fade out.
     - For each visible tile and each niche plane `k` (cell `q = k*n + i`) with density above 0 and a species id, it pushes `ceil(min(1, density)*BUG_PER_DENSITY)` `dot` sprites (`BUG_PER_DENSITY = 2`).
     - Each particle's base position inside the tile comes from a hash of `(q, j)`. It is jittered by `sin/cos(time*speed + phase)*BUG_JITTER[k]`, with `BUG_JITTER = [0.05, 0.03, 0.04, 0.12]` and `BUG_SPEED = [1.6, 0.7, 1.1, 2.6]` per niche (pest, detritivore, parasite, pollinator), so pollinators flit widely and detritivores barely move.
     - Size is `max(BUG_DOT, BUG_DOT_PX/zoom)` (0.1 world units, or at least 4.5 CSS px), and the colour is the species colour from `spCol`.
     - While a bug species is highlighted, its particles draw at `BUG_HL_SCALE` (1.6×) and the other swarms at 0.3 alpha.
     - Bug species share the registry id space, so `_refreshSpeciesLookup` covers them through `registry.living` with no special case.
   - **Highlight scope (`_hostHighlight`):** returns `highlight`, or `null` when the highlighted species is a bug or a pathogen. Plants (`_updateVegetation`, `_pushPlants`) and animals use it, so selecting a bug or disease strain does not dim the map.
   - **Animals:** drawn when `showAnimals` is on.
     - Positions are interpolated as `p + (x - p)*alpha` between the previous and current tick.
     - Below zoom 3, animals are drawn as `dot` sprites.
     - Life stages (Part 3b slice 3): the sprite size `max(12/zoom, 0.8 + 0.45*mass)`, the dot size `(3 + 0.9*mass)/zoom`, the shadow and the highlight ring are all multiplied by the animal's growth factor `animals.gf[i]` (0.4-1), after the pixel floor, so juveniles stay smaller than adults at every zoom. Elders (`animals.ef[i] < 1`) draw at alpha × `ELDER_ALPHA` (0.8).
     - At `zoom ≥ SHADOW_ZOOM` (6), a `shadow` icon is pushed first under each animal at `(x, y + 0.32*size)`, 0.9× size, alpha `SHADOW_ALPHA` (0.45), in plain white colors.
     - Flying birds (`domain 3`, `fly` set) get a second, offset shadow at `(x + FLY_SHADOW[0]*size, y + FLY_SHADOW[1]*size)`, `FLY_SHADOW[2]` (0.6) times the size and alpha `FLY_SHADOW_ALPHA` (0.22), where the plain shadow would go; `FLY_SHADOW` is `[0.45, 0.95, 0.6]`.
     - **Homes (`_pushHomes`)** (slice 3) are pushed after the shadows and before the eggs at `zoom ≥ EGG_ZOOM`. One marker per distinct home tile in view (animals with `home` 1 or 2, keyed by the tile of `nx`/`ny`): the `nest` icon in `NEST_TINT` or the `den` icon in `DEN_TINT`, size `max(HOME_PX/zoom, HOME_SIZE)` (8 px floor, 1.1 tiles), nudged up by 0.05 (nest) or 0.2 (den) of the size. Natal young draw no marker.
     - **Eggs (`_pushEggs`)** are pushed after the shadows and homes and before rings and bodies, only when `eco.eggs` exists and `zoom ≥ EGG_ZOOM` (3); there are no egg dots below that. Each live egg in view draws the `egg` icon at its stored `(x, y)`. The sim already scatters a clutch across 0.15-0.85 of the tile at laying, which gives the clutch jitter. Size is `max(EGG_PX/zoom, EGG_BASE + EGG_SIZE_K*genome[G_SIZE])` (4 px floor, 0.34 + 0.24×size gene tiles), colors from `_eggTint`, alpha `EGG_WATER_ALPHA` (0.85) for water eggs (`dom === 1`) and ×0.35 outside a highlighted species.
     - Highlight rings are pushed next, so the animals draw on top.
     - Bodies are pushed in two passes: every non-bird first, then every bird (slice 2), so birds draw above land and water animals. A flying bird's body and markers are lifted by `FLY_LIFT` (0.3) of its size. A ring goes on each animal of the highlighted species and, when the highlight is an animal strain (a pathogen whose `hostKind` is not `plant`), on each animal carrying that strain (`animals.strain[i]`).
     - Infected animals are colored through `_infected`. Above the dot zoom they also get a `virus` marker at `(x + 0.38*size, y - 0.5*size)`, scaled by `MARK_SCALE` (0.4), in its fixed colors.
     - Alpha drops to 0.35 for animals outside the highlighted species, for animals not carrying a highlighted strain, and, in the `disease` view, for healthy animals.
     - In the `water` view, non-aquatic animals (`dom !== 1`) with `water < THIRSTY` get a thirst marker: `THIRST_TINT` (245, 140, 110), or `DRY_TINT` (225, 30, 35) at `water <= 0`. At dot zoom the dot itself takes the tint (×`DRY_MARK` 1.35 size when dry); above it a `dot` marker is drawn at `(x - 0.38*size, y - 0.5*size)`, `MARK_SCALE` size (×`DRY_MARK` when dry), alpha 1. Animals that are not thirsty draw at 0.35 alpha.
     - Capacity is reserved for five instances per animal (shadow, ring, body, marker, home) plus one per egg.
3. Draws all sprites in one `drawArraysInstanced` call (skipped when there are none).
4. Weather overlay (`_drawWeather`): when `showWeather` is on, the view is not flat (no ramp view or `territory`), `eco.weather` is on and has storms. Each storm's position is extrapolated between weather updates as `x + vx*(tick % WEATHER_EVERY + alpha)`; the rain is faded over the last 40 ticks of life; `u_snow` is set when `effTemp` at the centre is below `SNOW_T`. With `hz = smooth(WX_ZOOM)` (0 at zoom 6, 1 at 18), clouds draw at `1 - 0.75*hz` and precipitation at `1 - 0.5*hz`. `u_time` wraps at `WX_TIME_WRAP` (600 s).

Other public members:

- Fields: `mode`, `showPlants`, `showAnimals`, `showSwarms` (bug clouds and particles, default on, set by the `#showSwarms` switch), `showWeather` (storm cloud and precipitation overlay, default on), `highlight` (a species id or `null`), `vegDirty` and `spriteCount`.
- Methods: `setWorld(world, eco)` and `setMode(mode)`.

### Other globals

- `compileProgram(gl, vs, fs)` returns `{p, u}`, where `u` maps uniform names to their locations.
- `RAMPS` and `rampLookup(stops)` build a 256-entry RGB lookup table from color stops.
- `LIVE_MODES`, `FLOWER_LEAF`, `FLOWER_TINT`, `FLOWER_SHADED`, `FRUIT_SHOW`, `FRUIT_EMPTY_SIZE`, `FUNGUS_SCALE`, `BUG_DOT`, `BUG_DOT_PX`, `BUG_HL_SCALE`, `BUG_PER_DENSITY`, `BUG_CLOUD_MS`, `BUG_CLOUD_FULL`, `CLOUD_FADE`, `WARP_ZOOM`, `SHADOW_ZOOM`, `SHADOW_ALPHA`, `BUG_JITTER`, `BUG_SPEED`, `BLIGHT_RGB`, `BLIGHT_MIX`, `INFECT_MIX`, `MARK_SCALE`, `TERR_MIX`, `TERR_SAT`, `TERR_FADE`, `TERR_EDGE_MIX`, `TERR_EDGE_DARK`, `ELDER_ALPHA`, `EGG_ZOOM`, `EGG_PX`, `EGG_BASE`, `EGG_SIZE_K`, `EGG_WATER_ALPHA`, `EGG_PALE`, `HOME_SIZE`, `HOME_PX`, `NEST_TINT`, `DEN_TINT`, `FLY_SHADOW`, `FLY_SHADOW_ALPHA`, `FLY_LIFT`, `TRAIL_K`, `FRESH_RGB`, `DIM_WATER_RGB`, `RAIN_VIEW_K`, `THIRST_TINT`, `DRY_TINT`, `DRY_MARK`, `WX_ZOOM`, `WX_TIME_WRAP` and `percentile99` are described above.
- `ALPINE_ID`, `GLACIER_ID`, `FROZEN_DESERT_ID` and `FROZEN_OCEAN_ID` are biome ids.

---

## Charts (`js/charts.js`)

Small 2D-canvas charts. Each is DPR-aware (capped at 2) and redraws from scratch on every call.

| Function | Purpose |
| --- | --- |
| `prepCanvas(canvas)` | Resizes the backing store to the CSS size times the DPR, clears it, and returns `{ctx, w, h}` in CSS pixels. |
| `chartInk()` | Reads `--chart-text` and `--chart-grid` from the root style (falling back to the old fixed rgba values), so axis labels and gridlines follow the theme. Used by `drawPopulationChart` and `drawSpeciesChart`. |
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

## Tree (`js/tree.js`)

`FamilyTree` draws a species family tree on a 2D canvas as a timeline: one row per species, a bar from `createdTick` to `extinctTick` (or now), and a connector from the parent's row at the child's birth tick.

| Member | Purpose |
| --- | --- |
| `TREE_PAD` | Plot padding `{l, r, t, b}` in CSS pixels; the top pad holds the year labels. |
| `TREE_GROUP_LABEL` | Plural group names for the kingdom title. |
| `new FamilyTree(canvas, tip, onPick)` | Binds pointer and wheel input on the canvas. `onPick(id)` is called when a bar is clicked. |
| `show(eco, id, mode)` | Sets the focus species and mode (`species` or `kingdom`, kept when omitted), rebuilds, fits and centres on the focus, then draws. |
| `title()` | "Name · N in lineage", or "All <group> · N species" in kingdom mode. |
| `draw()` | Redraws from the current view (called by the app on UI refresh and resize). |
| `centerOn(id)` | Scrolls the focus row into view and pans the time axis when its start is off screen. |

Building (`_build`):

- **Species mode** takes the focus's ancestor chain (via `parentId`) plus all its descendants (via `children`).
- **Kingdom mode** takes every species of the focus's group, hiding merged species (`sp.merged`).
- A hidden parent resolves to its nearest visible ancestor. Rows are ordered by an iterative depth-first preorder, oldest roots and children first.

View and drawing:

- `_fit` spans the time axis from the earliest node to now (at least one year, `YEAR_TICKS`) and sets the row height `rh` to 3–18 px. `_clampY` keeps the rows in range.
- Year gridlines with `Y` labels, connectors, and bars in the species colour; extinct bars use `--faint` at half alpha. The focus and hovered bars get an outline.
- Labels are drawn when `rh ≥ 11`, or always for the focus: right of the bar if it fits, else left, else inside the bar on a `--card` pill. Colours come from the theme tokens, so the tree follows the theme.
- Input: drag pans (a move of 4 px or less counts as a click and calls `onPick`), the wheel zooms both axes about the cursor, hovering shows the tooltip (`_showTip`: name, years alive, merged state, peak and current population), and leaving the canvas hides it. `_nodeAt(mx, my)` does the hit test.

## Save (`js/save.js`)

`EvoSave` (an IIFE exposing `encode`, `decode`, `fileName` and `serialize`) saves a whole `Ecosystem` losslessly, so a loaded world continues tick for tick exactly as the original would have. It is generic: it walks the object graph instead of listing fields, so new sim state is saved automatically as long as it is made of the supported value kinds.

### Object graph (`serialize(eco)`)

- A breadth-first walk from `eco` gives every object an id on first sight; references are written as `{$r: id}`, so shared objects and aliases (`plants.moistMul === weather.moistMul`, `plants.snow`, `animals.eggs`, `plants.disease`, the registry, the log, the rngs, species `parent`/`children` links) come back as the same object.
- `eco.world` is written as `{$w: 1}` and each of its typed-array layers as `{$wa: key}`: the `WorldMap` is never mutated by the sim, so it is regenerated from seed, width and height on load instead of being stored.
- Records: typed arrays `{t: type, o: offset, n: length}` (bytes go to the binary section, 8-byte aligned), arrays `{a: [...]}`, Maps `{m: [[k, v], ...]}` (insertion order kept), Sets `{s: [...]}`, and objects `{c: class, f: {field: value}}` where `c` is `'Object'`, `null` (null prototype) or a class name from `classTable()`: `Ecosystem`, `FastRng`, `Species`, `SpeciesRegistry`, `EventLog`, `PlantLayer`, `AnimalPool`, `SoilLayer`, `BugLayer`, `DiseaseLayer`, `WeatherLayer`, `EggPool`.
- Numbers JSON cannot hold (`NaN`, `±Infinity`, `-0`) are written as `{$n: '…'}` and `undefined` as `{$u: 1}`.
- A function, a BigInt, an unknown class or an unsupported view throws with the property path (for example `eco.animals.foo`), so adding such state to the sim makes saving fail loudly rather than silently lose it.

### File format (`encode(eco, meta)`)

The file is gzip (`CompressionStream`) of: a big-endian `u32` magic `SAVE_MAGIC` (`0x534f5645`), a `u32` header length, the UTF-8 JSON header, padding to 8 bytes, then the binary section. The header holds `version` (`SAVE_VERSION`, 2), `seed`, `w`, `h`, `tick`, the app `meta`, the `records` (record 0 is `eco`) and `bin` (binary length).

### Loading (`decode(bytes, makeWorld)`)

1. Gunzip, check the magic, parse the header and check the version and lengths. Only the current `SAVE_VERSION` loads; anything else throws "Save version N is not supported (expected 2)". v3 Part 1 slice 1 raised it to 2 because the animal genome grew from 15 to 19 genes (and animals gained `cls`), so v1 files are refused rather than migrated.
2. `makeWorld(w, h, seed)` rebuilds the world.
3. Pass 1 creates every record: typed arrays copy their own buffer slice, classes use `Object.create(Class.prototype)` (constructors are not run).
4. Pass 2 fills fields, array items, Map entries and Set items, resolving references.
5. It checks that record 0 is an ecosystem on the new world at the header's tick, and returns `{eco, world, meta}`.

### Gate and size

- Headless determinism (Node `vm`, Medium 320×210): run 1500 ticks, save, load, then step the original and the loaded copy 500 more ticks. On seeds 42, 7 and 123 the stats, the RNG states and a full re-save of both are byte-identical.
- Size: about 15 MB at year 5 (tick 2400) on Medium seed 42, with save in about 1.3–2 s and load in about 0.6–1.7 s. Most of it is plant genomes (two slots × 15 floats per tile) and the seed bank, which are live high-entropy floats; zeroing empty slots saved under 2% and byte-plane shuffling made gzip worse, so the file stays lossless and unfiltered.

## Sim worker (`js/simClient.js`, `js/simWorker.js`)

The simulation runs in a Web Worker, so the UI thread only renders and never blocks on a tick. The worker owns the real `Ecosystem`. The page holds a read-only **view** built from snapshots. The view has the same shape as an `Ecosystem` for everything `main.js`, `render.js`, `tree.js` and `charts.js` read.

### Modes

- `SimClient` starts the worker lazily on the first `create` or `load`. It posts `init` with the absolute URLs of the page's sim scripts: every `<script>` matching `js/sim/*`, `noise`, `biomes`, `mapGenerator` or `save`. A sim file added to `index.html` is therefore loaded by the worker as well. Without a list, the worker falls back to `DEFAULT_SCRIPTS`.
- The worker answers `hello` once `importScripts` succeeds.
- The client falls back to **local mode** in any of these cases:
  - `?worker=0` is in the URL.
  - `Worker` is missing or `new Worker` throws.
  - The worker posts an error, fires `error` before `hello`, or is silent for `START_TIMEOUT` (15 s).
- Local mode is the old path: real `WorldMap`/`Ecosystem` on the main thread, the accumulator loop in `frame`, and `EvoSave` on the main thread. `SimClient.mode` reports `'worker'` or `'local'`.
- Pages served from `file://` cannot start workers, so they land in local mode automatically.

### API (`SimClient`)

| Call | Result |
| --- | --- |
| `create(w, h, seed, options)` | Promise of `{world, eco}`. |
| `load(bytes)` | Promise of `{world, eco, meta}`. In worker mode, a copy of the bytes is transferred. A decode error rejects, and the worker keeps its current world. |
| `save(eco, meta)` | Promise of `{name, bytes}`. `EvoSave.encode` serializes synchronously before its first await, so the save is one consistent tick even while the worker runs. |
| `stats(eco)` | Promise of `{tick, json, idle}`, where `json` is `JSON.stringify(eco.stats)` taken inside the worker. Used by tests. |

### Worker loop (`simWorker.js`)

- Ticks run in 12 ms slices (`SLICE_MS`). Between slices the loop yields through a `MessageChannel` self-post when more work is due, so messages are handled within one slice. Otherwise it sleeps with `setTimeout` until the next tick is due.
- Below `MAX_SPEED` (600) it keeps an accumulator like the old frame loop. At Max it steps without a cap. `step {n}` adds to a queue that is drained first.
- `msPerTick` is an exponential moving average, sent with every frame.
- A tick that throws stops the run and posts `error`. The client logs it with `console.error`.

### Messages

- Client → worker: `init`, `create {id, w, h, seed, options}`, `load {id, bytes}`, `save {id, meta}`, `run {running, speed}`, `step {n}`, `option {key, value}`, `frame {gen}`, `stats {id}`.
- Worker → client: `hello`, `ready`, `frame`, `reply {id, …}`, `error {id, message, stack}`.
- `ready {id, gen, seed, options, world, statics, has, meta}` follows every `create` and `load`.
  - `world` is the `WorldMap`'s typed arrays and scalars, copied once.
  - `statics` holds grids the sim never changes (`plants.water`, `plants.depth`).
  - `has` tells which layers exist.
- `gen` is bumped on every install. Frames and frame requests carry it, and anything from an older generation is dropped.
  - The `create`/`load` promise resolves only after the first frame of the new generation has been applied, so `installWorld` never sees an empty view.

### Snapshot pacing and contents (`frameSnapshot`)

- Snapshots are pulled, not pushed. Each `requestAnimationFrame`, `eco.sync` posts `frame {gen}` unless a request is already outstanding, and the worker answers with one snapshot. Frames therefore never queue up behind a slow page.
- Every typed array is a fresh copy whose buffer goes in the transfer list. The worker's own arrays are never transferred or detached. Species objects are structured-cloned.
- Tiers:

| When | What (`SNAP_*` constants) |
| --- | --- |
| Every frame whose tick moved | Primitive scalars of every layer in `SNAP_LAYERS` plus soil. All pool arrays of `SNAP_POOLS` (`animals`, `eggs`) cut to `count` rows: any typed array whose length is a multiple of `cap` with at most 64 values per row, so new per-animal fields are picked up automatically. Weather `storms`. Species created since the last frame, plus their parents. |
| Every `FIELD_MS` (180 ms) | Grid arrays listed in `SNAP_GRIDS` (plant slots, soil nutrient and litter, bug density/species/total, weather wet/snow/fresh/waterDist, animal territory arrays). A renderer or UI read of a new grid field must be added here. |
| Every `GENE_MS` (1 s) | Plant genes `SNAP_PLANT_GENES` (8 fruit, 10 toxin, 11 symbiont) for both slots, packed, which the client scatters into a `2n × PG` `Float32Array` as `plants.genome`. |
| Every `SLOW_MS` (240 ms) | Every species that is living now or was living at the last slow frame, `registry.living`, `nextId` and `speciations`, `eco.stats`, and history deltas. |
| When `log.version` changes | `log.items` and `version`. |

- History arrays (`eco.history[k]` and each `sp.history`) are sent as deltas. When the array object is the same and has only grown, the worker sends `{from, tail}`; otherwise `{full}`. The sim replaces these arrays when it downsamples, which forces a full send.

### The view (`buildView`, `applyFrame`)

- Objects are created with `Object.create(Class.prototype)` for `WorldMap`, `Ecosystem`, `SpeciesRegistry`, `EventLog`, `Species` and each layer class. Pure helpers then work on the view unchanged, for example `plants.matureAt`, `plants.topSpecies`, `weather.effTemp`, `registry.get`, `lineage`, `livingList`, `seasonName` and `year`. Each layer view gets `world` and `registry`.
- Frame layers are applied with `Object.assign`, so the renderer and UI keep reading `eco.animals.x` and the like each frame.
- `sp.children` is rebuilt from `childIds`. A species that arrives between slow frames with a population is added to `registry.living`, so its icon and color resolve at once.
- `eco.options` is a `Proxy`. Assigning a field posts `option {key, value}`, and the worker sets it on the real `Ecosystem`.
- View-only members:
  - `remote: true`.
  - `sync(running, speed)`, described above.
  - `step(n = 1)` queues ticks.
  - `alpha`, a getter: the time since the last new tick × speed, clamped to 0..1, or 1 when paused.

### Verification (Phase 1)

- `JSON.stringify(eco.stats)` at tick 3000 matches across Node, worker and `?worker=0` on seeds 42, 7 and 123.
- A worker save decoded on the main thread matches every view array, species, history and log entry.
- Max speed in headless Chromium with software GL, at the 320×210 fitted view:
  - Worker: 30–40 ticks/s, 6–9 ms of main-thread JS per frame, and no long tasks.
  - `?worker=0`: about 7 ticks/s, 23–30 ms per frame, and about 1 s of long tasks every 8 s.
  - In both modes, fps there is capped by software GL, at about 4 fps even when paused.
- See `feature-research/ecosystem-v3/compute/profile.md` for the per-layer cost breakdown behind the worker and GPU plan.

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
| `tab` | `plant`, `animal`, `bug`, `disease` or `events`. |
| `cls` | The Animals tab class filter: -1 for All, else a class index. |
| `openClasses` | A Set of class card keys that are expanded, restored from `OPEN_KEY` in `buildStatCards`. |
| `eventFilter` | Filter for the event list. |
| `hidden` | A Set of population-chart keys hidden via the legend. |
| `lastUi`, `lastLogVersion` | UI refresh bookkeeping. |
| `msPerTick`, `fps` | Performance meters. |
| `hover` | Mouse position over the map, or `null`. |
| `theme` | `auto`, `light` or `dark`. |
| `tree` | The `FamilyTree` instance (created in `init` on `#treeCanvas` and `#treeTip`, with `selectSpecies` as its pick callback). |
| `overlay` | `'tree'`, `'help'` or `null`: which map overlay is open. |
| `busy` | True while a world is being generated, saved or loaded; `newWorld`, `saveWorld` and `loadWorld` return early while it is set. |
| `messageTimer` | Timeout id that hides a `showMessage` line. |

Other globals:

- `$(id)` is shorthand for `document.getElementById`.
- `GROUP_COLORS` maps each class stat group key, plus `plants`, `bugs` and `disease`, to its color: `fish` `#5fb6e6`, `amphib` teal-green `#2fae94`, `reptile` ochre `#b8901c`, `mammal` `#e7a25c`, `bird` `#c98ee8` and `invert` `#ec7a8f`.
- `ROLE_COLORS` maps the role keys to the class card row colors: `herb` `#9fd98b`, `omni` `#e7b95c`, `carn` `#ec8a79`, `scav` `#c9a27a`.
- `CLASS_NAME` is `['Fish', 'Amphibian', 'Reptile', 'Mammal', 'Bird', 'Invertebrate']` (singular, by class index), used by the detail Class cell.
- `OPEN_KEY` (`evo.openClasses`) is the storage key for the expanded class cards.
- `storeGet(key)` and `storeSet(key, value)` wrap `localStorage` in try/catch.
- Theme: `THEMES` (`auto`, `light`, `dark`), `THEME_ICON` (`auto`, `sun`, `moon`) and `THEME_KEY` (`evo.theme`). `setTheme(theme)` sets or removes `data-theme` on `<html>` (auto follows `prefers-color-scheme`), draws the icon into `#themeBtn` with its title, stores the choice and redraws the UI. `#themeBtn` cycles the three; `init` restores the stored theme. All colors live as tokens in `css/style.css`, with the light values under both the media query and `[data-theme='light']`.
- Collapsible cards: `setupCards()` makes each `.card[data-card]` head (`ecosystem`, `populations`, `map`; `role=button`, chevron) toggle `.collapsed` and `aria-expanded` on click, Enter or Space. The collapsed set is stored under `CARDS_KEY` (`evo.collapsed`), and expanding redraws the stats so the charts get their size back.
- `sparkSVG(sp, alive)` draws the species row sparkline: the population samples from `sp.history` plus the current count, reduced to `SPARK_POINTS` (24) points, as an inline 60×18 SVG with a light fill and a non-scaling stroke.
- `TAB_GROUP` maps every species tab to its registry group: `plant`, `animal`, `bug`, and `disease` → `pathogen`. `speciesInTab` uses it, and on the Animals tab also skips species whose `sp.cls` differs from `app.cls` (when it is not -1).
- `SWARM_NICHES`, `SWARM_NICHE_ICON` and `SWARM_LABEL` are UI fallbacks for the niche names, a representative icon per niche, and category labels. They are named apart from the sim's `BUG_*` globals so the app still loads without `bugs.js`.
- `mixHex`, `paletteFor(hex)` and `NEUTRAL` build body/dark/light palettes for the UI icons.
- `STAT_EXTRA` lists the Part 4 stat cards appended after the group cards as `{key, label, icon, color, wide, sub, noSpark}`: `thirstDeaths` (drop), `herds` (bison), `territories` (flag), `eggs` (egg, wide) and `stages` ("Life stages · animals", deer, wide, no sparkline). `STAT_EXTRA_KEYS` is their key set.
- `WEATHER_LOOK` maps each weather badge kind (`off`, `clear`, `rain`, `snow`, `storms`, `drought`) to `[icon, color]`.

### Tick accumulator and interpolation (`frame`)

- Each frame adds `dt*speed` to `app.acc`, where `dt` is capped at 0.1 s.
- It then calls `eco.step()` while `acc ≥ 1`. Stepping stops early once the frame's time budget is used: 16 ms, or 30 ms when `speed ≥ 600`.
- `msPerTick` is an exponential moving average.
- If `acc` is still above 2 afterwards, it is reset to 1. This stops a slow machine from building an ever-growing backlog.
- The renderer draws with `alpha = clamp(acc, 0, 1)` while running, or 1 while paused. The fractional progress into the next tick interpolates animal positions between `px/py` and `x/y`.
- `stepOnce()` pauses, steps once and sets `acc = 1`.
- When the sim runs in the worker (`eco.remote`), the accumulator is not used: `frame` calls `eco.sync(app.running, app.speed)`, which sends the run state and asks for the next snapshot, and stores the returned worker `msPerTick`. The renderer uses `eco.alpha` instead. The worker does the pacing and `eco.step()` only queues a step, so the main thread never runs a tick.
- The UI panels refresh every 250 ms.

### World lifecycle

`newWorld()`:

1. Reads the seed; a non-numeric seed becomes random.
2. Reads the size, given as `WxH` in `#sizeSelect`.
3. Shows a spinner overlay (`showBusy`).
4. After a 30 ms delay, calls `SimClient.create(w, h, seed, options)` and hands the resolved `{world, eco}` to `installWorld`. Depending on the mode, that is the real pair or a worker view (see the Sim worker section).

`installWorld(world, eco)` is shared by new worlds and loads: it sets `app.world` and `app.eco`, clears the selection, the accumulator and `lastLogVersion`, calls `renderer.setWorld` (which fits the camera), closes the overlay and the detail view, and writes `eco.seed` to `location.hash`.

`#mapError` doubles as the status layer: `showBusy(text)` shows the spinner with a text line, `hideBusy()` hides it, and `showMessage(text)` shows a plain line that hides itself after 5 s or on click.

Save and load (see the Save section for the file format):

- `#saveBtn` (down arrow, after New world) calls `saveWorld()`. After the spinner paints, it awaits `SimClient.save(eco, saveMeta())`, which runs `EvoSave.encode` in the worker or on the main thread, and downloads the bytes as `EvoSave.fileName(eco)` (`evosim-<seed>-y<year>.evo`) through a temporary object URL. The sim keeps running; the snapshot is taken synchronously at the start of `encode`.
- `saveMeta()` records the app state that is not part of the sim: `speed`, the view `mode`, the camera (`x`, `y`, `zoom`) and the `LAYER_SWITCHES` renderer flags (`showPlants`, `showAnimals`, `showSwarms`, `showWeather`).
- `#loadBtn` (up arrow) clicks the hidden `#loadInput` (`accept=".evo"`). `loadWorld(file)` pauses, shows the spinner and awaits `SimClient.load(bytes)`, which runs `EvoSave.decode(bytes, (w, h, seed) => new WorldMap(w, h, seed))` in the worker or on the main thread.
- `applyLoaded(world, eco, meta)` writes the seed, selects the size (adding a `W×H` option if the size is not in the list), sets the `OPTION_SWITCHES` checkboxes (`optSeasons`, `optMigrations`, `optDisease`, `optWeather`) from `eco.options`, calls `installWorld`, then restores the layer switches, the view button and mode, the speed button and the camera from `meta`, and refreshes the UI. The world is left paused.
- Any error (not gzip, wrong magic, unsupported version, truncated or inconsistent file) is shown with `showMessage` ("… The current world was kept.") and logged with `console.warn`; the current world is untouched because nothing is installed until decoding succeeds.

`init()`:

- Seeds from `location.hash` (for example `index.html#7`).
- Builds the static panels.
- Creates the renderer. If WebGL2 is unavailable, it shows the error in `#mapError` and stops.
- Autoplays when the query string contains `play` (for example `index.html?play#7`).

### Panels

- **Left:** the stat cards and sparklines (`buildStatCards` and `updateStats`), the population chart (plant biomass is shown ÷10 so it shares the axis), the biome legend, and the clock and performance readout (`updateClock`). The `#viewModes` buttons in `index.html` (Biomes, Plants, Heat, Moisture, Height, Soil, Nutrients, Litter, Bugs, Disease, Territory, Rainfall, Water) call `renderer.setMode(button.dataset.mode)`; Rainfall is mode `rain` and Water is mode `water`.
  - **Weather badge:** `#weatherBadge` (`.season.weather`, after the season badge) is refreshed by `updateWeatherBadge()` from `updateClock`. Its kind is `off` (no `eco.weather` or `options.weather === false`, badge dimmed with `.off`), `drought` (`stats.weather.drought`), `storms` (more than one storm, label "Storms ×N"), `rain` or `snow` (one storm, by whether `rainTiles > 0`) or `clear`. The icon is only redrawn when the kind changes. The title lists mean wetness (`stats.meanWet`), rain and snow tile counts, and the drought count.
  - **Switches:** `#optWeather` ("Weather", after Seasons, on by default) is passed as `options.weather` to `new Ecosystem` and sets `eco.options.weather` live. `#showWeather` ("Weather overlay", after Bug swarms) sets `renderer.showWeather`.
  - **Part 4 stat cards** (`STAT_EXTRA`, filled by `updateExtraStat(el, k, s, h)`): Thirst deaths (`stats.thirstDeaths`, sub-line "x% of land deaths" from `stats.thirstShare`), Herds (`stats.herds`), Territories (`stats.territories`), Eggs (the current count `stats.stages.eggs`, sub-line laid, hatched, eaten and failed from `stats.eggs`), Nests & dens (slice 3, `nest` icon, wide: nest tiles with the den count in a `<small>`, sub-line parents, young at home, eggs/nest, raided and raids repelled from `stats.nests`, sparkline `history.nests`) and Life stages (total animals with the elder share in a `<small>`, sub-line juveniles, adults and elders from `stats.stages`). Sparklines read `h[k] || []`, so a missing history key draws empty.
  - A wide **Bugs** stat card sits under Plant biomass. Its value is `stats.bugs` (rounded total density), its sparkline `history.bugs`, and its sub-line (`bugStatLine(stats)`, CSS `.stat-sub`) shows the occupied tiles per niche (`stats.pests`, `detritivores`, `parasites`, `pollinators`) next to niche icons, plus `pollination NN%` from `stats.pollination`. Missing fields read as 0, and the card is only marked `zero` when `eco.bugs` exists.
  - A wide **Disease** stat card (`data-key="disease"`, `virus` icon, "Disease · sick animals") follows. Its value is `stats.sick`, its sparkline `history.sick`, and its sub-line reads "N strains · N blighted tiles" from `stats.strains` and `stats.blight`.
  - The `#optDisease` switch (on by default) is passed as `options.disease` to `new Ecosystem` and sets `eco.options.disease` live.
  - The population chart has a `bugs` series (when `history.bugs` exists) with a "Bugs" legend toggle.
  - **Class cards** (v3 Part 1 slice 1): one `.stat.cls` card per `STAT_GROUPS` class (`role=button`, `tabindex=0`, `aria-expanded`, a chevron in the label), so the chart and legend show six class lines plus Plants and Bugs.
    - Each card holds a hidden `.stat-roles` block with one `.role-row` button per `ROLE_KEYS` entry (a `ROLE_COLORS` dot, the `ROLE_LABELS` name, a count and a `data-rspark` sparkline). The Invertebrates card adds a fifth **Swarms** row (`data-role="swarms"`) showing `stats.bugs` with `history.bugs`; clicking it closes the detail view and opens the Bugs tab.
    - A click, Enter or Space on a card toggles it with `setClassOpen(el, on)` (`.open`, `.wide`, `aria-expanded`), updates `app.openClasses`, stores it under `OPEN_KEY` and redraws the stats.
    - `updateStats` hides a class card while the class has 0 animals and its history has never been above 0, and calls `updateClassRoles(el, k, s, h)` for open cards: each role row shows `stats.roles[k][role]` with the `<k>.<role>` history, is hidden while the role has never had members, and is marked `zero` when it is empty now. The Swarms row shows whenever `eco.bugs` exists.
- **Right:**
  - Species tabs (Plants, Animals, Bugs, Disease, then Events with an icon and no count), with sorting and an extinct toggle, capped at 160 rows (`renderSpeciesList`). Rows show a 36 px icon, the name, a sub-line (role tag, category tag, and "extinct Y…" when gone), and at the right the count (`formatCount`) over a `sparkSVG` sparkline. Role tags color from the `--c-*` tokens via `color-mix`. The Bugs tab (`data-tab="bug"`, count in `#countBug`) lists species with `group === 'bug'`; `speciesInTab`, `updateTabCounts`, `selectSpecies` and `setTab` route that group, and the list unit is " tiles" as for plants. Tabs use `flex: 1 1 auto` with tight padding and 11 px text (10.5 px below 1250 px). Every tab shows its icon and count (`formatCount`), each has a `title`, and only the active tab shows its `.tab-label`, so they fit in the 330 px column even with 4-character counts.
  - The **Animals** tab (`data-tab="animal"`, `paw` icon, count in `#countAnimal`) replaced the Land and Water tabs in v3 Part 1 slice 1. `#classChips` (above the list tools, shown only on this tab by `setTab`) is built by `buildClassChips()` in `init`: an All chip (`data-cls="-1"`) and one chip per class with its icon, label and count. A chip click calls `setClassFilter(cls, render = true)`, which sets `app.cls`, marks the active chip and re-renders the list. `updateTabCounts` counts living animal species per `sp.cls` for the chips; the tab count is their total. `selectSpecies` routes animals to this tab and resets the filter to All when the species is outside the current class.
  - The **Disease** tab (`data-tab="disease"`, `virus` icon, count in `#countDisease`) lists species with `group === 'pathogen'`; `selectSpecies` routes strains there. Its empty text is "No active outbreaks yet." and the row unit is " tiles" for plant strains (`hostKind === 'plant'`) and " hosts" otherwise. The species totals line adds " · N strains".
  - Pathogens: `roleOf` returns `'pathogen'`, `roleTag` shows "blight" or "disease" (class `role-pathogen`), and `categoryLabel` gives "Plant blight" or "Animal disease". The detail subtitle reads "<Category> · from <origin host>"; badges show Emerged or Host jump and Active or "Burned out · Year N"; the grid shows Infected, Peak, Deaths and Appeared. `#detailHostsWrap` (hidden for other groups) lists `sp.hosts` as chips (`data-id`, clicking selects the host), falling back to the origin host marked "origin". `DISEASE_TRAITS` shows Transmissibility, Virulence and Host range (genes 0–2).
  - `ANIMAL_TRAITS` includes **Scavenging** (`G_SCAV`, percent).
  - Plant and animal details add **Avg resistance** (`mean[14]` for plants, `mean[G_RES]` for animals) and **Infected** when `sp.infected > 0`. `PLANT_TRAITS` gains gene 14 "Blight resistance" (shown for water plants too) and `ANIMAL_TRAITS` gains "Resistance" (`G_RES`).
  - Bug species: `roleOf` returns `'bug'` and `roleTag` shows the niche (`bugNiche(sp)`, from `sp.nicheIndex`, via `nicheIndex(sp)`) with a per-niche colour class `role-bug-<niche>`. `categoryLabel` uses `BUG_CATEGORY_LABEL` when defined. The detail subtitle reads "<Category> swarm · <niche>", the badges add Land or Aquatic from `sp.domain`, and the stats grid shows Population (tiles), Peak, Appeared and **Mean density** (`sp.density`).
  - The events list, which re-renders only when `log.version` changes (`renderEvents`). A **Weather** filter (`data-f="weather"`) shows only weather events. The **Outbreaks** filter (`data-f="outbreak"`) shows `outbreak` events, drawn with `EVENT_GLYPH.outbreak` `!` and an amber-green dot (`.ev-outbreak`). Weather events (drought start and end) use `EVENT_GLYPH.weather` `~` and an amber dot (`.ev-weather`, from the `--amber` token).
  - The species detail view (`renderDetail`): badges, a stats grid, a history chart, trait bars from the `mean` genome, lineage and children. For plant species the stats grid also has a **Health** cell, the mean `sp.health` (a dash once extinct).
  - Fungus species (`sp.kind === 1`) get two extra badges: "Fungus" and the fungus type from `fungusType(sp.mean)` (Mild, Neurotoxic, Lethal or Symbiont).
  - Animal details add a **Class** cell ("<CLASS_NAME> · <sp.role>", for example "Mammal · carnivore"), a **Habitat** cell (land, water, amphibious, or for birds "Air · fishes the shallows" / "Air · perches on land") and a wide **Stages** cell, "N juv · N adult · N elder · N eggs" from `stageCounts(id)` (a pass over the animal pool with `animalStage(A, i)`: 0 juvenile below `A.mature`, 2 elder above `ELDER_AGE * A.maxAge`, else 1 adult, plus live eggs in `eco.eggs`). Detail cells take an optional third `wide` flag (CSS `.detail-grid div.wide`, span 2). `ANIMAL_TRAITS` adds Territorial (`G_TERR`), Herding (`G_HERD`), Cold-blooded (`G_COLD`, shown as Cold-blooded or Warm-blooded) and Drought tolerance (`G_DRY`).
  - The Lineage heading has a **Family tree** button (`#treeBtn`) that opens the tree overlay for the selected species.
  - Animal species get an **Avoids** row at the end of the trait list: one colour swatch per `sp.aversion` entry (`hsl(hue*360, 62%, 52%)`, opacity `0.35 + 0.65*strength`, with the strength in the title), or "nothing yet" (`hueSwatches(list)`).

`PLANT_TRAITS` and `ANIMAL_TRAITS` map each gene index to a label and formatter. `PLANT_TRAITS` covers all 15 plant genes. Its rows are `[label, gene, fmt, fungusLabel, fungusFmt]`; for fungi the fungus label and formatter are used when given, and a `null` fungus label hides the row:

| Gene | Plant row | Fungus row |
| --- | --- | --- |
| 4 | Toxicity | Toxin potency |
| 5 | Seed dispersal | Spore spread |
| 6, 7 | Shade tolerance, Root vigour | same |
| 8 | Fruiting | hidden |
| 9 | Sweetness | hidden |
| 10 | Seed toxicity | Toxin type (Mild, Neurotoxic, Lethal) |
| 11 | Bloom | Mycorrhizal (Symbiont above 0.5, else Decomposer) |
| 12 | Hue (in degrees) | Hue |
| 13 | Pest defence | hidden |
| 14 | Blight resistance | same |

Water plants hide genes 8–13 (8–12 are held fixed there, and pests are land-only) but show gene 14. Rows for gene indices beyond `sp.mean.length` are skipped.

`BUG_TRAITS` rows are `[label, gene, fmt, niches]` for bug genes g0–g8: Heat preference, Moisture, Appetite, Mobility, Fecundity, Swarming, Flower hue (swatch plus degrees), Specialism and Host size. `bugGeneShown(niche, k, niches)` hides rows that do not apply: it uses the sim's `BUG_MASKS[niche][k]` when defined, else the row's fallback niche list (Swarming for pests, Flower hue and Specialism for pollinators, Host size for parasites).

Helpers: `TOXIN_WORDS`, `toxinIndex(v)` (the same thresholds as `toxinType`), `fungusType(g, o)` (lowercase "mild", "neurotoxic", "lethal" or "symbiont"; it calls `toxinType` when defined) and `hueSwatches(list)`.

### Map input

- Pointer drag pans. Two pointers pinch-zoom. The wheel zooms at the cursor.
- A click, meaning movement of 4 px or less, selects a species through `clickTarget(wx, wy)`:
  - In the Bugs view, the densest bug species on the tile comes first (`densestBug(t)`: the max `density[k*n + t]` over the niche planes with a non-zero species).
  - Otherwise, the nearest animal within `max(0.9, 10/zoom)` tiles, then `plants.topSpecies(t)` (the canopy, else the understory), then the densest bug species when the tile has no plant.
  - Clicking anything else closes the detail view.
- Hovering shows a tooltip (`updateTooltip`):
  - The meta line gives biome, °C (`temp*50-15`), moisture or depth, soil nutrients as `soil.nutrient[t] / SOIL_MAX`, and `litter` (`soil.litter[t]`, two decimals, when the field exists).
  - Then the animal under the cursor, with `sick: <strain>` (`.tt-sick`) when it is infected. Its lines read "state · stage · age N" (stage from `animalStage`; birds prefix "flying · " or "perched · " from `A.fly`, and the state list ends with "heading home" for state 6), followed by " · has a nest", " · has a den" or " · young of a den" from `A.home` and "energy N%" (`energy / (emax*gf)`, clamped to 0–100%), plus " · water N%" for non-water animals.
  - Then one row per occupied plant slot (plane `slot*n + t`), with icon, name, category, "canopy" or "understory", biomass and health %, plus `blight: <strain>` when the slot is blighted.
    - Fungi (`plants.kind[p] === 1`) add "fungus" to the category line and their type (`fungusType(plants.genome, p*PG)`) to the stats line.
    - Other plants show `fruit x.xx` (the `plants.fruit[p]` stock) when it is above 0.001 or the plant's fruiting gene is above 0.5.
  - On land, the meta line also shows `pollination NN%` from `plants.poll[t]` when that field exists.
  - One row per occupied bug niche on the tile (`bugsAt(t)`), with the species icon, name, niche tag, "<Category> swarm" and `density NN%`. The row that `clickTarget` would open gets a "click to inspect this swarm" hint (`.tt-hint`). In the Bugs view the bug rows come right after the meta line; in other views they come last.
- Keyboard shortcuts:

  | Key | Action |
  | --- | --- |
  | Space | Play/pause |
  | `.` | Step once |
  | `f` | Fit the map |
  | `t` | Open the family tree for the selected species |
  | `?` or `h` | Open help |
  | `w` | Toggle the weather overlay (`#showWeather`) |
  | Esc | Close the overlay if one is open, else the detail view |

  Keys are ignored while typing in an input or select and when Ctrl, Meta or Alt is held; letter keys are matched in lower case.

### Overlays

`#overlay` sits inside `#mapWrap` (absolute, `z-index: 7`, dimmed with the `--scrim` token). Its box has a head (`#overlayTitle`, the `#treeModes` segment and `#overlayClose`) and two bodies, `#treeBody` and `#helpBody`; `data-view` on the overlay hides the one not in use.

- `showOverlay(view, title)` sets `app.overlay`, shows the overlay and hides the map tooltip. `closeOverlay()` hides it and the tree tooltip. A pointerdown on the scrim itself closes it, and `installWorld` (new world or load) closes it.
- `openTree(mode)` needs a selected species. It marks the active `#treeModes` button (`data-t` `species` "Lineage" or `kingdom` "Kingdom"), calls `app.tree.show(eco, selected, mode)` and sets the title from `app.tree.title()`. `selectSpecies` re-shows the tree when it is open and the id changes, `updateUi` redraws it, and a window resize redraws it.
- `openHelp()` shows `#helpBody`: a static grid of Map views, Controls, Switches and Keyboard sections written in `index.html`. The Controls list has a **Classes** line for the class cards and the Animals tab chips. `#helpBtn` ("?", after the theme button) toggles it.

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
  - `fertility` also seeds the soil: `SoilLayer` starts each tile's nutrient store at its fertility and refills toward it. Seed 123 at 300×200 produces one tile (index 59465) whose fertility, temperature and depth are NaN; the soil reads it as 0, but the plant layer's pre-existing NaN there still turns `totalBiomass` into NaN on that seed.
  - `isOcean`, `isLake`, `isRiver`, `isGlacier` and `isPond` are `Uint8Array` flags.
  - `riverFlow` is a `Float32Array`.
  - `biome` is a `Uint8Array` of numeric `BIOME_ID` values.
- **Methods:** `idx`, `inBounds`, `isWaterTile` and `getCell`.
- **Pipeline:**
  1. `_generateFields`
  2. `_carveLakeBasins`
  3. `_computeHydrologyBasins`
  4. `_computeGlacierMask`
  5. `_fillDepressions`
  6. `_markDepressionLakes`
  7. `_generateRivers`
  8. `_generatePonds`
  9. `_shapeRiverBanks`
  10. `_classifyBiomes`

### Hydrology

- **Constants (top level):** `HYDRO_MEANDER` 0.004, `HYDRO_WIGGLE` 0.45, `HYDRO_WIGGLE_FREQ` 0.045, `HYDRO_VALLEY` 0.014, `HYDRO_BANK_WET` 0.12, `HYDRO_BANK_RANGE` 3, `HYDRO_POND_DEPTH` 0.004, `HYDRO_LAKE_DEPTH` 0.015, `HYDRO_LAKE_MIN` 10, `HYDRO_POND_MAX` 14, `HYDRO_POND_MIN` 4, `HYDRO_MELT` 2.5, `HYDRO_RIVER_FLOW` 190, `HYDRO_WIDE_1` 5, `HYDRO_WIDE_2` 18.
- **`_carveLakeBasins`:** carved basins are rotated, stretched ellipses. Their shoreline distance is perturbed by a Perlin sample (×0.35), so they are no longer circles.
- **`_fillDepressions`:** a priority flood (binary heap on typed arrays) seeded from ocean tiles, or from the map border if there is no ocean.
  - It produces `filled`, the altitude with every depression filled to its spill level (plus 1e-5 per step).
  - It also produces `flowOrder`, the processing order.
  - Heap keys add Perlin jitter (`HYDRO_MEANDER`) so paths across filled flats wind.
  - `down[i]` is each tile's downstream neighbour. It is picked among already-processed neighbours by normalised drop, plus a bend term: the dot product of the step with a slowly varying Perlin direction, weighted by `HYDRO_WIGGLE`. The result is acyclic and always reaches the ocean.
- **`_markDepressionLakes`:** tiles filled deeper than `HYDRO_POND_DEPTH` are grouped 4-connected.
  - A group becomes a lake when it contains a tile deeper than `HYDRO_LAKE_DEPTH` and has at least `HYDRO_LAKE_MIN` tiles.
  - Otherwise it becomes a pond when it has between `HYDRO_POND_MIN` and `HYDRO_POND_MAX` tiles.
- **`_generateRivers`:** rain per tile is `0.25 + humidity`, plus `HYDRO_MELT` on glacier tiles. It accumulates down `down` in reverse `flowOrder`.
  - `riverFlow` is that sum divided by `HYDRO_RIVER_FLOW*sqrt(area/67200)`.
  - A tile with `riverFlow >= 1` is a river. It is widened by radius 1 at `HYDRO_WIDE_1` and radius 2 at `HYDRO_WIDE_2`, and diagonal steps get a corner tile.
  - `lakeOutlets` and `glacierSources` are still computed but no longer used for rivers.
- **`_generatePonds`:** extra ponds, up to `pondCount`. Each takes the best of 6 samples, scored by humidity + river proximity - slope, and has an irregular Perlin-perturbed disc shape.
- **`_shapeRiverBanks`:** a BFS distance (up to `HYDRO_BANK_RANGE`) from rivers, ponds and lakes.
  - Humidity rises by `HYDRO_BANK_WET` times the falloff.
  - River beds are cut by up to `HYDRO_VALLEY`, scaled by flow, and nearby land dips gently.
  - Altitude never goes below `seaLevel + 0.002`.
  - Wetter banks produce some `WETLAND` tiles.

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
