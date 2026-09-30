# Evolution Sim: code reference

Vanilla JS with no build step. `index.html` loads these global scripts in this order: `noise.js`, `biomes.js`, `mapGenerator.js`, `sim/core.js`, `sim/soil.js`, `sim/plants.js`, `sim/animals.js`, `sim/bugs.js`, `sim/disease.js`, `sim/ecosystem.js`, `icons.js`, `render.js`, `charts.js`, `main.js`.

- Each file relies on the globals of the files loaded before it.
- The seven `sim/*` files plus the world-gen files have no DOM dependency, so they run headless in Node through `vm`.
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
| `genome` | A `Float32Array` holding the reference genome. It is the speciation anchor and never changes after creation. |
| `mean` | A `Float32Array` holding the current population mean. It is refreshed every 20 ticks and drives `category` and `icon`. |
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

- **Fields:** `all` is a Map from id to Species. `living` is a Set of ids. Also `nextId`, `tick`, `recentlyExtinct` and `names`.
- **`create(opts, hsl)`** assigns an id and a unique name, then links the new species into the parent's `children`.
- **`add(sp, n)` and `remove(sp, n)`** are the only way population changes. `remove` marks a species extinct when its population reaches 0 and queues it in `recentlyExtinct`, which `Ecosystem` drains.
- **`matchDaughter(parent, genome, weights, threshold)`** returns the closest living child of `parent` within `threshold` of `genome`. This absorbs a drifting population into an existing daughter species, so one population does not found dozens of near-identical species.
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

- **`PLANT_WEIGHTS`** is `[1.4, 1.4, 0.6, 1.2, 0.8, 0.5, 0.7, 0.7, 0.6, 0.5, 0.6, 0.6, 0.4, 0.6, 0.3]`. **`PLANT_SPECIATION`** is `0.13`.
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
- **`plantSeed(j, genome, parentSp, tick)`**:
  - It is the resident-competition and assign step taken out of `_spread`. `_spread` calls it, and so do animal seed drops.
  - Its checks are:
    - The domain must match `parentSp`.
    - For fungi, genes 8 and 9 are zeroed.
    - The slot comes from `slotOf(genome, water, 0, kind)`.
  - It returns true when the seed took the slot.
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
  - Growth follows `b += r*max(b,0.03)*(1-b/K)`, where `r = growth * max(0.05, 1 + seasonAmp*season) * light * (0.35 + 0.65*health)`.
  - A decomposer then takes `d = litter*FUNGUS_DECOMP*min(1, fullness)` from its tile's litter and adds `d*FUNGUS_RETURN` to nutrients, clamped at `SOIL_MAX`.
  - Fruit: when `_fruitK > 0`, the target is `fruitMax = _fruitK*b*fruitNow*health*(POLL_FRUIT_BASE+(1-POLL_FRUIT_BASE)*poll[i])`, where `_fruitK = fruiting*FRUIT_FRAC*FRUIT_WIND`. It is set only for land plants with wood of at least 0.3 and fruiting above 0.2. The stock rises toward the target at `FRUIT_RATE`. Any excess rots into litter at `FRUIT_ROT`.
  - Biomass never drops below 0.004. A dying lineage can therefore persist at a trace level, and a grazed patch can always regrow.
  - Plants with `K < 0.015` (including deeply shaded understory) lose 0.01 per tick and are cleared once they reach 0.
  - When a plant is more than 30% full and has health of at least `HEALTH_SPREAD_MIN`, it attempts `_spread` with probability `(0.006 + 0.045*disp)*fullness*(1 + _bloomK*bloomNow*(POLL_WIND+(1-POLL_WIND)*poll[i]))`, where `_bloomK = bloom*FLOWER_SEED_BONUS*FRUIT_WIND`.
  - The cover pass multiplies `poll` by `POLL_DECAY` and sets `flowerPoll` to the mean `poll` over flower tiles.
- **`damage(i, amount)`** is the pest bite. It takes biomass from the understory plant first (skipping fungi), then the canopy, only above the woody floor (reach 0), and lowers each bitten plant's health by `taken*PEST_HEALTH`, clamped at 0. It returns the total taken.
- **`nectar(i)`** returns the summed `_bloomK` over both slots of tile `i` (unseasoned) and sets `nectarHue` to the hue of the strongest bloomer.
- **Pollination fields:** `poll` (Float32 `n`, 0..1, raised by pollinator bugs) and `flowerPoll` (mean `poll` on flower tiles).
- **`refreshSpeciesMeans()`** recomputes each living species' `mean` genome, `biomass`, mean `health`, `infected` (blighted slot count), `category` and `icon` over both planes.

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

**Blight:**

- `_set` and `_clear` release any blight on the slot through `disease.releasePlant(p)` and reset `blightImm`.
- In `step`, a blighted plant whose health is already at or below 0 dies first (`disease.blightDeath`, `_clear`, `blighted++`). Blight damage itself is applied to `health` by `DiseaseLayer._blightPass`.
- A plant that dies in the low-satisfaction branch while blighted counts as `blighted`, not `starved`.

**Nutrient cycling:** every death returns its biomass plus its fruit stock to litter through `soil.returnMatter`. This covers starvation, low-K decline (via `_clear`) and replacement by a fresh invader (in `_assign`). Litter becomes nutrients through soil decay and decomposer fungi.

**Speciation (`_assign`):**

- A child genome more than `PLANT_SPECIATION` from its parent species' reference genome first tries `matchDaughter`, with 0.8 times the threshold.
- If no daughter matches, it founds a new species and logs the event.
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
| `CARCASS_FRAC` | 0.6 | Fraction of a dead animal's mass that becomes litter. |

### Fields

- `base` (Float32 `n`): the tile's fertility, clamped to `0..SOIL_MAX`. A non-finite fertility value reads as 0.
- `nutrient` (Float32 `n`): the current store. It starts at `base`.
- `litter` (Float32 `n`): dead matter. It starts at `base*LITTER_INIT`.
- `totalLitter`: the map-wide litter sum, refreshed each step.
- `own` (Float32 `2n`), `tile` and `row` (Float32 `n`): per-tick scratch.

### `step(plants)`

1. Own demand per plant: `own[p] = biomass[p] * SOIL_UPTAKE * (0.5 + root[p])`. Empty slots have biomass 0, so they add nothing; a non-finite result is treated as 0. Understory fungi (`kind` 1) draw nothing. `tile[i]` is the sum over both slots.
2. Neighbour demand: a separable 3×3 box sum of `tile` (a row pass, then a column pass), minus the centre, clipped at the map edge.
3. Pressure on plant `p` on tile `i`: `own[p] + SOIL_SAME_TILE_W*own[other slot] + SOIL_NEIGHBOUR_W*Σ tile[8 neighbours]`.
4. Satisfaction: `sat[p] = min(1, nutrient[i]*SOIL_SUPPLY/pressure)`, or 1 when the pressure is 0. A fungus always gets `sat = 1`.
5. Withdrawal: `nutrient[i] -= Σ own*sat` over both slots, floored at 0, then `nutrient += (base - nutrient)*SOIL_REFILL`.
6. Litter decay: `d = litter*LITTER_DECAY` leaves the litter, and `d*SOIL_RECYCLE` is added to the nutrient store, clamped to `SOIL_MAX`.

Plants on crowded, heavily rooted or poor ground see lower satisfaction, which drains their health (see Plants, `step`).

### `returnMatter(i, amount)`

Adds `amount` to `litter[i]`. It no longer goes straight to nutrients: the matter reaches the store through litter decay and decomposer fungi. Non-positive or non-finite amounts are ignored.

### `consumeLitter(i, amount)`

Removes up to `amount` from `litter[i]` and returns what was taken (0 for a non-positive or non-finite amount, or an empty tile). Detritivore bugs call it.

### `addCarcass(i, mass)`

Adds `mass*CARCASS_FRAC` to `litter[i]`. `animals._kill` calls it with the animal's full mass, or with `mass*CARCASS_EATEN` when the animal was eaten by a predator.

---

## Animals (`js/sim/animals.js`)

Animals are agents stored as structure-of-arrays. There is one typed array per field, indexed by slot.

- A counting-sort spatial grid is rebuilt every tick for neighbour queries.
- A single continuous `diet` gene spans herbivore, omnivore and carnivore. Trophic roles therefore evolve rather than being hard-wired per system.

### Constants

- **`AG = 10`**: the number of animal genes. Gene layout by index, with its named index constant:

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

- **`ANIMAL_WEIGHTS`** is `[1.3, 1, 0.7, 1.8, 1.2, 0.5, 0.8, 0.5, 0.8, 0.25]`. Diet carries the most weight. **`ANIMAL_SPECIATION`** is `0.12`.
- **`GRID = 6`**: the spatial grid cell size, in tiles.
- **Energy values:** `PLANT_ENERGY` is 3.2 per unit of biomass eaten, and `MEAT_ENERGY` is 20 per unit of prey mass.
- **Fruit, poison and aversion constants:**

  | Constant | Value | Use |
  | --- | --- | --- |
  | `FRUIT_ENERGY` | 8 | Energy per unit of fruit, before sweetness and `plantEff`. |
  | `FRUIT_LURE` | 3 | Weight of fruit in the forage score. |
  | `BERRY_MASS` | 1.2 | Animals lighter than this can eat understory berries without reach. |
  | `FRUIT_MIN_BITE` | 0.3 | Fruit must exceed `bite*FRUIT_MIN_BITE` to be eaten instead of grazing. |
  | `CARCASS_EATEN` | 0.35 | Carcass mass fraction left when a predator eats its prey. |
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
  | `RES_COST` | 0.2 | Metabolism multiplier `1 + RES_COST*res`. |
  | `SICK_COST` | 0.5 | Extra energy cost per tick while infected, `SICK_COST*vir*mass^0.75`. |
  | `SICK_SLOW` | 0.4 | Speed multiplier `1 - SICK_SLOW*vir` while infected (in `_moveToward`). |
  | `SICK_DEATH` | 0.01 | Per-tick death chance `SICK_DEATH*vir*(1-0.7*res)`. |
  | `IMMUNE_TICKS` | 900 | Ticks of immunity to a strain after recovering from it. |
  | `CONTACT_R` | 1.5 | Contact radius, in tiles. |
  | `CONTACT_K` | 0.35 | Contact exposure strength. |
  | `CONTACT_MAX` | 3 | Maximum contact rolls per infected animal per contact pass. |
  | `PREY_K` | 0.5 | Exposure strength for a predator killing infected prey. |
  | `CARCASS_K` | 0.1 | Exposure strength per unit of carcass load on the tile. |
  | `VECTOR_K` | 0.05 | Exposure strength per unit of vector load on the tile. |
  | `NATIMM_P` | 0.003 | Chance per newborn to gain innate immunity to the strain most prevalent in its parent species. |
- **`ANIMAL_ARCHETYPES`**: 13 founders, each given as `{domain, n, g}`.
  - Land: hopper, browser, grazer, arid runner, cold grazer, omnivore, small hunter and pack hunter.
  - Water: shoal fish, reef fish, crustacean, pike and shark.
- **`dietRole(diet)`** returns `herbivore` below 0.33, `omnivore` below 0.66, and `carnivore` otherwise.
- **`animalCategory(g, domain)`** combines role and size into an icon or category:
  - Land herbivores are `rabbit`, `deer` or `bison`.
  - Land omnivores are `mouse`, `boar` or `bear`.
  - Land carnivores are `fox`, `wolf` or `bigcat`.
  - Water herbivores are `fish` or `turtle`. Water omnivores are always `crab`. Water carnivores are `pike` or `shark`.
- **`animalIcon(category, id)`** picks `sp.icon` from `ANIMAL_ICON_VARIANTS` by `id % variants.length`, so a species keeps the same look across `refreshSpeciesMeans` recomputes:
  - rabbit and mouse can show as `chicken`
  - deer can show as `horse`
  - bison can show as `cow`
  - crab can show as `lobster`
  - fish can show as `shrimp`

  `sp.category` and the label stay unchanged.
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
| `meta` | Metabolism per tick, `0.05*mass^0.75*(1 + 0.9*speed^2 + 0.35*sense + 0.3*armor + 0.2*toxR + 0.15*tol)*(1 + RES_COST*res)`. |
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
| `seedSp`, `seedTtl` | The plant species whose seed is being carried, and the ticks until it drops. |
| `confuse` | Ticks of neurotoxin confusion left. |
| `strain` | Infecting strain id, or 0. |
| `itime` | Ticks of infection left. |
| `immune`, `imTime` | The strain last recovered from, and the ticks of immunity to it left. |
| `natImm` | A strain id this animal is innately immune to, or 0. Inherited from either parent. |

All five disease fields are initialised to 0 in `spawn`.

The remaining structures are:

- **`genome`**: a `Float32Array(cap*AG)`. Slot `i` uses `i*AG … i*AG+9`.
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
  - `deaths` holds `{starved, eaten, old, poison}`.
  - `births` is reset every step.
  - `aversionEvents` counts every time an aversion crosses 0.5.
- **`seedGenome`**: a `Float32Array(PG)` scratch buffer for seed drops.
- **Bug fields:**
  - `tileLoad` (Uint16 `n`): rebuilt each tick as the sum of `round(mass*TILE_LOAD_SCALE)` per tile, capped at 65535. It feeds the parasite trace.
  - `parasiteLoad` and `parasiteHost` (Float32 `n`): written by `BugLayer.step` (load `density*appetite` and the parasite's host-size gene).
  - `bugs`: the `BugLayer`, or `null`. `deaths` also holds `parasite`.
- **Disease fields:** `disease` is the `DiseaseLayer`, or `null`. `deaths` also holds `disease`.

### Public methods

- `spawn(sp, genome, gOff, x, y, energyFrac)`
- `newSpecies(genome, gOff, domain, parent, tick, origin)`. A daughter species' hue is offset 25–335° from its parent's, so relatives do not look alike. It sets `sp.aversion`, an array of `{hue, strength}` entries: a copy of the parent's, or `[]` for a founder.
- `canStand`
- `step(tick)`
- `refreshSpeciesMeans()`. It also sets `sp.infected` (the species' infected count) and fades every aversion by `1 - AVERSION_DECAY` and drops entries whose strength falls below 0.05.

### Per-tick behaviour (`step`)

The grid is rebuilt first. Then each animal runs through the steps below in order. Once one of steps 0–4 acts, the later behaviour steps are skipped.

- **Seed drop.** This happens before step 0: a carried seed counts `seedTtl` down, and `_dropSeed` fires when it reaches 0.

0. **Confusion.** While `confuse > 0`, the animal counts it down and makes a random 3-tile move at 0.8× speed. Its state and ttl are reset.
1. **Flee.** This applies only when diet is below 0.7. The check runs on every other tick, offset by slot, and then passes a 70% roll. The animal looks for the nearest threat within `range*0.8`. If it finds one, it sets a target 6 tiles directly away and enters state 4 for 3 ticks, moving at 1.1× speed.
2. **Hunt.** This requires `meatEff > 0.25`, energy below 60% of max, and no cooldown. The animal chases the nearest prey within `range`, using 1.6× speed once within 4 tiles.
   - It attacks when within 1 tile.
   - It gives up after 18 ticks, which sets a 10-tick cooldown.
3. **Eat.** This requires `plantEff > 0.12` and energy below 92% of max.
   - **Fruit first.** The animal can reach fruit if `_reach > 0` (all fruit) or `mass < BERRY_MASS` (plants with wood below 0.62). If `fruitAt` exceeds `bite*FRUIT_MIN_BITE`, it eats one bite with `eatFruit`.
     - The energy gained is `eaten*FRUIT_ENERGY*(0.6+sweet)*plantEff*(1-1.6*max(0, seedTox*0.7 - toxR))`.
     - If the animal carries no seed, it picks one up: `seedSp = fruitSp` and `seedTtl = 20..59`.
   - **Otherwise it grazes.** If edible biomass on the current tile exceeds half a bite, the animal eats one bite.
     - The energy gained is `eaten*PLANT_ENERGY*plantEff*(1-1.6*max(0, plantTox - toxR))`.
     - If the understory is a fungus the species' aversion rates above 0.5 (mimics included), the graze skips the understory (`skipUnder`).
     - If fungus was eaten, `_poison` runs.
   - Otherwise it moves toward a spot chosen by `_pickForage`.
4. **Roam.** If nothing else acted, the animal drifts at 0.45× speed toward a comfortable spot.
5. **Pay costs.** The cost is `meta*(1+1.3*(1-climateFit)) + moved*0.012*mass`, plus the parasite drain.
   - Before paying, an animal lighter than `BUG_MASS` with energy below max eats `bugs.eat(tile, bite*_bugEff)` and gains `taken*BUG_ENERGY`.
   - Parasite drain: `parasiteLoad*PARASITE_DRAIN*mass*(1-0.6*armor)*(0.4+0.6*gaussFit(size, parasiteHost, PARASITE_HOST_TOL))`, also added to `bugs.parasiteDrain`.
   - A starvation death counts as `deaths.parasite` when the drain exceeds `cost*PARASITE_DEATH_SHARE`, otherwise `deaths.starved`.
   - A lethal poisoning kills the animal here, and `deaths.poison` increments.
   - Disease (only when `disease.on`): `imTime` counts down. An infected animal pays `SICK_COST*vir*mass^0.75`, then rolls the sickness death chance. If it survives, `itime` counts down and it recovers at 0 (`disease.recoverAnimal`). Otherwise, it stamps its strain into the vector plane when the tile has parasite load, and on alternate ticks (`(tick+i)&1`) runs `_contact`. A healthy animal is exposed on alternate ticks to the tile's carcass and vector loads.
   - A sickness death runs after the poison check: `disease.countDeath`, `_kill`, and `deaths.disease` increments.
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

**Grazing across slots:** `plants.edible(tile, reach)` sums both slots and `plants.graze` eats the understory before the canopy. The toxicity penalty uses `plants.grazeTox`, read right after `graze`, which is the toxicity of the matter actually eaten.

**Forage choice (`_pickForage`):**

- The animal samples 8 random points within `range` that it can stand on.
- Each point is scored as `(food+0.02)*(0.25+climateFit)/(1+dist*0.08)`, plus a small random jitter.
- Animals without a plant diet use a fixed `food = 0.2`.
- Fruit eaters add `fruitAt*FRUIT_LURE*(0.6+sweet)` to `food`.
- Bug eaters add `bugs.edibleAt(j)*_bugEff*BUG_LURE` to `food`.
- A point whose understory is a fungus has its food multiplied by `1 - aversion(hue)`.
- The chosen target is held for 6–13 ticks.

**Bug efficiency (`_bugEff`):**

- 0 when `mass >= BUG_MASS` or `diet >= BUG_DIET_MAX`, so carnivores (the `dietRole` boundary) never eat or seek bugs.
- Otherwise `1-(BUG_DIET_PEAK-diet)*1.4` below the peak and `1-(diet-BUG_DIET_PEAK)/(BUG_DIET_MAX-BUG_DIET_PEAK)` above it, clamped at 0.

**Attack (`_attack`):**

- The success chance is `0.7 * sizeF * speedF * (1-0.6*armor) * (1-cover)`, where:
  - `sizeF` is `clamp(massRatio*0.85, 0.15, 1.2)`.
  - `speedF` is `spd_i/(spd_i + 0.7*spd_p)`.
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

- **Contact (`_contact(i, s)`):** scans only the infected animal's own grid cell (`gstart`/`gitems`/`gcell`), skipping itself, dead, other-domain and already infected animals. Up to `CONTACT_MAX` animals within `CONTACT_R` are exposed with `CONTACT_K`. No allocation.
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
- Each gene is inherited 50/50 from the two parents, then mutates at rate 0.25 with sd 0.04.
- A fixed energy budget of `emax*0.38` is split across the litter, so big litters mean weak young. Each child's energy is capped at 60% of its own maximum.
- The parent pays `1.1×` what it spent.
- The breeding cooldown is `35 + 55*size - 10*fecundity`.
- The speciation check matches the plant one (`matchDaughter` at 0.8 times the threshold). A new species is logged, with a note when its role differs from the parent's.

---

## Bugs (`js/sim/bugs.js`)

Bugs are density fields, not agents. There are four niche planes, each holding at most one bug lineage per tile. It loads after `animals.js` and before `ecosystem.js`, and has no DOM dependency. `Ecosystem` builds it only when `BugLayer` is defined.

### Constants

- **`BG = 9`** bug genes: `B_TEMP 0`, `B_MOIST 1`, `B_APPETITE 2`, `B_MOBILITY 3`, `B_FEC 4`, `B_SWARM 5`, `B_HUE 6` (pollinator flower hue), `B_SPEC 7` (pollinator specialism), `B_HOST 8` (parasite host size).
- **`BUG_NICHES`** is `['pest', 'detritivore', 'parasite', 'pollinator']`, with plane constants `BUG_PEST 0`, `BUG_DETRI 1`, `BUG_PARA 2`, `BUG_POLL 3`. `BUG_NICHE_LABEL` and `BUG_CATEGORY_LABEL` hold UI labels.
- **`BUG_WEIGHTS`** is `[1.4, 1.4, 0.8, 0.6, 0.6, 0.6, 0.8, 0.8, 0.5]`. **`BUG_SPECIATION`** is 0.14.
- **`BUG_MASKS`**: per niche, which genes mean anything. Masked genes are copied, not mutated, on spread. **`BUG_LAND_ONLY`** is `[1, 0, 0, 1]` (pests and pollinators never enter water). **`BUG_HUES`** gives the base species hue per niche.
- **Tunables:**

  | Constant | Value | Use |
  | --- | --- | --- |
  | `BUG_EVERY` | 6 | The layer steps every 6 ticks; all rates are multiplied by it. |
  | `BUG_MIN` | 0.01 | A cell below this density is cleared. |
  | `BUG_SEED_D` | 0.06 | Density of a newly colonised cell. |
  | `BUG_TOL` | 0.2 | Climate tolerance (moisture uses 1.2×). |
  | `BUG_R` | 0.08 | Base logistic growth rate. |
  | `BUG_MORT` | 0.006 | Base mortality, times `0.5 + appetite`. |
  | `BUG_DECLINE` | 0.08 | Rate at which density above K falls back. |
  | `BUG_SPREAD` | 0.1 | Spread chance, times `mobility*density`. |
  | `BUG_MUT_RATE`, `BUG_MUT_SD` | 0.15, 0.02 | Mutation on spread. |
  | `BUG_INIT_P`, `BUG_INIT_K` | 0.25, 0.1 | Founder seeding chance per cell and minimum K. |
  | `PEST_FULL`, `PEST_BITE`, `PEST_DEFENCE` | 1, 0.002, 0.7 | Plant biomass for full food, bite per density and appetite, and how much defence cuts food. |
  | `DETRI_FULL`, `DETRI_RATE`, `DETRI_RECYCLE` | 0.3, 0.004, 0.5 | Litter for full food, share of litter eaten per density, and share returned as nutrient. |
  | `PARA_FULL`, `PARA_TRACE_DECAY` | 5, 0.95 | Host trace for full food, and trace decay per bug step. |
  | `POLL_FULL`, `POLL_WINTER`, `POLL_HUE_SPAN`, `POLL_GENERALIST`, `POLL_DRIFT` | 0.5, 0.35, 0.25, 0.4, 0.1 | Nectar for full food, off-season floor, hue match width, generalist food bonus, and hue drift toward the local flower on spread. |
  | `LOCUST_DENSITY`, `LOCUST_SWARM_GENE`, `LOCUST_BARE`, `LOCUST_FRAC`, `LOCUST_COOLDOWN`, `LOCUST_LOG_GAP` | 0.85, 0.6, 0.05, 0.7, 40, 480 | Swarm trigger density, swarm gene and bare-tile edible threshold; share moved, per-species cooldown and log rate limit. |
  | `COLLAPSE_FRAC`, `COLLAPSE_GAP`, `COLLAPSE_PEAK_DECAY`, `COLLAPSE_MIN_PEAK` | 0.25, 960, 0.999, 30 | Pollinator collapse detection. |
  | `REINTRO_TILES` | 80 | Cells placed by `reintroduce`. |

- **`BUG_ARCHETYPES`**: 13 founders (3 pest, one of them swarm-prone; 3 detritivore; 3 parasite with different host sizes; 4 pollinator with different hues and specialism).
- **`bugCategory(g, niche, wet, o)`**: pest `locust` (swarm > 0.6) or `aphid`; detritivore `worm` (wet or moisture > 0.7) or `beetle`; parasite `leech` (wet) or `tick`; pollinator `butterfly` (specialism > 0.55) or `bee`.

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
- Logistic growth toward K below it, `d -= (d-K)*BUG_DECLINE*dt` above it, then `d -= BUG_MORT*dt*(0.5+appetite)*d`. Cells under `BUG_MIN` are cleared.
- Effects:
  - Pest: `plants.damage(i, d*appetite*PEST_BITE*dt)`, summed into `pestDamage`.
  - Detritivore: `soil.consumeLitter(i, litter*d*DETRI_RATE*dt)`; `DETRI_RECYCLE` of it goes to nutrients (clamped at `SOIL_MAX`).
  - Parasite: sets `animals.parasiteLoad[i] = d*appetite` and `parasiteHost[i] = hostGene`.
  - Pollinator: raises `plants.poll[i]` to `(0.5+0.5*spec)*match*d` if higher.
- Spread with chance `mobility*d*BUG_SPREAD*dt`.

Then `_sumTotals` and `_checkCollapse`.

### Mechanics

- **Spread (`_spread`):** a target 1–2 tiles away (1–3 when mobility > 0.7), never water for land-only niches. A same-species resident just gains `BUG_SEED_D*0.5`. Otherwise food is pre-checked with the parent genome and a stronger resident rejects early; then the child mutates (masked genes kept), pollinator hue drifts `POLL_DRIFT` toward the target's `nectarHue`, and the child needs `fit*food >= 2*BUG_MIN`. Against a resident, strength is `density*fit` and the invader wins with probability `(cs-rs)/cs`.
- **Speciation (`_assign`):** as for plants, with `BUG_WEIGHTS`, `BUG_SPECIATION` and `matchDaughter` at 0.8×; logs a `'speciation'` entry.
- **Locust swarms (`_swarm`):** a pest cell with density > `LOCUST_DENSITY`, swarm gene > `LOCUST_SWARM_GENE` and `plants.edible(i) < LOCUST_BARE` moves `LOCUST_FRAC` of its density to a land tile 4–8 away, at most once per `LOCUST_COOLDOWN` ticks per species. Logs "<name> locusts are swarming" (rate-limited per species).
- **Pollinator collapse (`_checkCollapse`):** tracks a decaying peak of pollinator mass; when mass falls below `COLLAPSE_FRAC` of a peak of at least `COLLAPSE_MIN_PEAK`, increments `collapses` and logs, at most once per `COLLAPSE_GAP`.
- **`edibleAt(i)`** is pest + detritivore + pollinator density. **`eat(i, amount)`** removes density proportionally from those three planes, clears cells under `BUG_MIN`, updates `total` and `eaten`, and returns the amount taken.
- **`reintroduce(niche)`** places a random founder of that niche on up to `REINTRO_TILES` empty cells with `K >= 0.15` and logs a `'migration'` entry.
- **`refreshSpeciesMeans()`** recomputes each bug species' `mean`, `density`, `wetFrac`, `category` and `icon`.

---

## Disease (`js/sim/disease.js`)

Pathogens are strains: registry species with `group: 'pathogen'`. A strain's `population` is its current number of infected hosts (animals, or plant slots for blight), so the registry's add/remove, extinction and history machinery work unchanged. Animal infections live in the `AnimalPool` Int32 fields; blight lives in the plant slot planes.

### Constants

- **`DG = 4`**: strain genes. `D_TRANS` 0 (transmissibility), `D_VIR` 1 (virulence), `D_RANGE` 2 (host range), `D_HUE` 3 (colour). **`DISEASE_WEIGHTS`** is `[1, 1, 0.8, 0.3]` and **`DISEASE_SPECIATION`** is 0.12. **`DISEASE_KINDS`** is `['animal', 'plant']`.

| Constant | Value | Use |
| --- | --- | --- |
| `VIR_TRADE` | 0.6 | Effective transmissibility `trans*(1-VIR_TRADE*vir)`. |
| `DUR_BASE` | 200 | Animal infection duration `DUR_BASE*(1-0.5*vir)`. |
| `BLIGHT_DUR` | 150 | Blight duration base, same formula. |
| `RANGE_BASE`, `RANGE_SPAN` | 0.05, 0.25 | Host range radius `RANGE_BASE+RANGE_SPAN*range`, as a gene distance between host species genomes. |
| `JUMP_K`, `JUMP_K_P` | 0.02, 0.001 | Jump multiplier for animal and plant exposures outside the host range. |
| `JUMP_SPAN` | 0.15 | Distance beyond the host range at which jump chance falls to 0. |
| `JUMP_LOG_GAP` | 1200 | Minimum ticks between jump log entries per strain-and-host pair. |
| `PATHO_MUT` | 0.03 | Chance per transmission that the strain mutates. |
| `PATHO_MUT_RATE`, `PATHO_MUT_SD` | 0.5, 0.05 | `mutateGenes` rate and sd for that mutation. |
| `PATHO_DRIFT` | 0.5 | Share by which a sub-threshold mutation moves the strain's `mean`. |
| `SEED_HOSTS`, `SEED_R` | 6, 6 | Animals infected at emergence, within this radius of the index case. |
| `SEED_TILES`, `SEED_TILE_R` | 12, 3 | Plant slots infected at emergence, within this square radius. |
| `EMERGE_MIN_A`, `EMERGE_MIN_P` | 40, 150 | Minimum host species population to be picked for emergence. |
| `EMERGE_GAP` | 900 | Ticks without any live strain of a kind after which one emerges. |
| `EMERGE_P` | 0.04 | Chance per emergence check (every 60 ticks) of a spontaneous emergence per kind. |
| `EMERGE_SD` | 0.08 | Spread of emerged strain genes around trans 0.5, vir 0.35, range 0.3. |
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

**Strain species fields:** `hostKind` (`'animal'` or `'plant'`), `hostId` and `hostGenome` (the host species' reference genome), `category`/`icon` (`'virus'` or `'blight'`), `infected` (= `population`), `deaths`, `recentDeaths`, `hosts` (Map host species id to count, refreshed every 20 ticks), `origin` (`'emerged'`, `'jump'` or `null` for a mutation). Hue is 55–150° for animal strains and 18–68° for blights, from gene 3.

### Transmission

- **`exposeAnimal(j, s, k)`**: no-op if `j` is infected, innately immune to `s`, or still immune to `s`. It rolls `r` once against `k*sTrans*(1-0.7*res)`, then against that times `_compat`.
- **`_compat`** returns 1 when the host species is the strain's host or its reference genome is within `sRange` of `hostGenome`. Otherwise it is `jk*(1-(d-range)/JUMP_SPAN)` (0 when negative) and marks the transmission as a jump.
- **`_transmit`** returns the strain the new host gets: a jump goes through `_jump`; otherwise `_mutate`.
- **`_mutate`**: with `PATHO_MUT`, mutates a copy of `mean`. Within `DISEASE_SPECIATION` of the strain's founding genome it only drifts `mean` (and re-caches the parameters). Otherwise it reuses a `matchDaughter` (0.8×) or founds a new strain and logs a `'speciation'` entry, "X (new strain) branched from Y".
- **`_jump`**: reuses the living child strain already created for that host, or founds one (origin `'jump'`, host = the new species), increments `jumps` and logs an `'outbreak'` entry "X jumped to H as Y", rate-limited per pair.
- **Registry bookkeeping:** every infection goes through `_add` (`registry.add`) and every release through `_drop` (`registry.remove`), so `population === infected` always holds.

### Animal and plant API

- `infectAnimal(i, s)`, `releaseAnimal(i)` (returns the strain), `recoverAnimal(i)` (sets `immune` and `imTime = IMMUNE_TICKS`), `countDeath(s)`, `animalDied(i, tile, frac)`.
- `infectPlant(p, s)` (sets `blightT` from `sDur`, adds to `bList`), `releasePlant(p)`, `blightDeath(p)`.

### `step(tick)`

Runs after animals, only when `on`. Decays both exposure planes; every `BLIGHT_EVERY` ticks runs `_blightPass`; every `DIEOFF_EVERY` ticks runs `_dieoff`.

- **`_blightPass`**: for each listed slot, damages `health`, counts `blightT` down (at 0 the slot recovers: `blightImm = s` and release), and tries the four same-plane neighbours with `_blightTry`. A neighbour must be occupied, uninfected and not immune to `s`; chance is `sTrans*BLIGHT_SPREAD*(MONO_BOOST if same species)*(1-BLIGHT_RES*blightRes)`, with `_compat` (`JUMP_K_P`) for other species.
- **`_dieoff`**: keeps a rolling window of each live strain's deaths in `recentDeaths` and logs an `'outbreak'` entry "X caused a mass die-off of H".

### Emergence

- **`maybeEmerge(tick)`**, called from `Ecosystem._migrations` (every 60 ticks when both migrations and disease are on): per kind, emerges a strain when none of that kind has been live for `EMERGE_GAP` ticks, or with `EMERGE_P`.
- **`emerge(kind, tick)`** picks a host species weighted by population (plants exclude fungi), creates a strain with origin `'emerged'`, seeds it (`_seedAnimals` or `_seedPlants`), increments `outbreaks` or `blights`, and logs an `'outbreak'` entry: "X broke out among H" or "X blight broke out in H". Returns the strain or `null`. Usable from the UI.

### Other methods

- **`clearAll()`**: releases every infection and blight, clears the planes, list and `speciesStrain`. Idempotent through `dirty`. The ecosystem calls it every tick while disease is off.
- **`refreshSpeciesMeans()`**: rebuilds each live strain's `hosts` and `infected`, and `speciesStrain`.
- **`hostIndices(strainId, out = [])`**: the animal slot indices (animal strain) or plant slot indices `p` (blight) currently infected.

---

## Ecosystem (`js/sim/ecosystem.js`)

`Ecosystem` runs one world. It seeds the founders, advances plants and animals, runs migrations, samples history and writes the event log.

### Globals

- **`STAT_GROUPS`**: six trophic groups, given as `{key, label, domain (0 land / 1 water), role, icon}`. The keys are `landHerb`, `landOmni`, `landCarn`, `waterHerb`, `waterOmni` and `waterCarn`.
- **`HISTORY_EVERY = 5`**: the population history is sampled every 5 ticks.

### `new Ecosystem(world, seed, options)`

- **Options:** `{migrations: true, seasons: true, disease: true}` by default. All three can be toggled at runtime through `eco.options`.
- **RNG streams:** each part of the system uses its own RNG stream, so adding draws in one subsystem does not reshuffle the others.

  | Stream | Seed |
  | --- | --- |
  | Ecosystem | `seed*7+11` |
  | Registry names | `seed+99` |
  | Plants | `seed+555` |
  | Animals | `seed+777` |
  | Bugs | `seed+333` |
  | Disease | `seed+444` |

- **Fields:**
  - `world`, `seed`, `tick`, `log`, `registry`, `plants` and `animals`.
  - `stats` holds `plants` (cover tiles), `plantBiomass`, `animals`, and one count per `STAT_GROUPS` key.
  - `stats` also holds `fruit` (`plants.totalFruit`), `fungi` (`plants.fungusTiles`), `flowers` (`plants.flowerTiles`) and `litter` (`soil.totalLitter`).
  - `stats` also holds `bugs` (rounded total density), `pests`, `detritivores`, `parasites`, `pollinators` (occupied tiles per niche) and `pollination` (`plants.flowerPoll`).
  - `bugs` is the `BugLayer` (or `null` when `bugs.js` is not loaded). It is built after the animal founders and assigned to `animals.bugs`.
  - `stats` also holds `sick` (`disease.sickAnimals`), `blight` (`disease.blightSlots`), `strains` (live strain count) and `diseaseDeaths` (`disease.animalDeaths`).
  - `disease` is the `DiseaseLayer` (or `null` when `disease.js` is not loaded). It is built after the bugs with its own RNG and assigned to `animals.disease` and `plants.disease`.
  - `history` holds `tick`, `plants` (rounded biomass), `bugs`, `sick` and one array per group key. When it passes 800 samples, it keeps every second sample.

### Methods

**`step()`**:

1. Advances `tick`.
2. Handles the seasons toggle. When seasons are off, `plants.seasonAmp` is zeroed. When seasons are switched back on, it is rebuilt through `plants._prepareClimate()`. It also sets `plants.seasonsOn` from `options.seasons`, which pins `bloomNow` and `fruitNow` at 0.5 when seasons are off.
3. Sets `disease.on` from `options.disease`, and calls `disease.clearAll()` while it is off.
4. Steps the plants, then the bugs, then the animals, then the disease layer.
5. Every 20 ticks, refreshes the species means of all four layers.
6. Computes stats and logs extinctions.
7. Every 60 ticks, runs migrations if they are enabled.
8. Every 5 ticks, samples history.

**`_introduce(arch, origin, count)`** places a founder or migrant group in clusters of 4–8, in good habitat:

- For the first 3000 of its 4000 placement attempts, the site needs a climate fit of at least 0.55. After that, 0.1 is enough.
- The site needs food of at least 0.05. Only animals with diet below 0.6 check the site's actual edible biomass; the others treat food as 0.3.
- Founders start between 0.6 and 1.6 times their maturity age.

**`_migrations()`** is a safety net that re-introduces a trophic group that has died out. It picks a random archetype of the needed kind and brings in 60% of that archetype's founder count:

- If land herbivores plus land omnivores fall below 20, it brings in land herbivores.
- Otherwise, if there are no land predators and more than 250 land herbivores, it brings in land predators.
- The water side follows the same two rules.
- Any bug niche with 0 occupied tiles is reintroduced with `bugs.reintroduce(niche)`.
- When `options.disease` is on, calls `disease.maybeEmerge(tick)`.

**`_logExtinctions()`**:

- Logs an extinction only when the species was notable: a plant or bug with a peak of at least 60 tiles, an animal with a peak of at least 12, or a pathogen with a peak of at least 15. A pathogen's entry reads "burned out" instead of "went extinct".
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

  Every `category` value in `plants.js` and `animals.js` is also an icon name.
- **Helpers:**
  - `circ(x, y, r)` builds a circle path.
  - `EYE(x, y, r)` builds a fixed-color eye part.
  - `BARK` is the fixed bark color, and `STEM` the fixed green flower-stem color.
  - `petals(cx, cy, d, r)` builds five petal circles at distance `d` around a centre.
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
  | `u_overlay` | 1 in the data-overlay views (any mode with a `RAMPS` entry), otherwise 0. |

- Effects, in order:
  - The vegetation tint is mixed in by `v.a*u_vegAmount`.
  - In winter, snow creeps down from cold ground: `smoothstep(0.42, 0.18, temp + 0.22*(1-winter))`, on land only.
  - Water gets a gentle sine shimmer.
  - Both the snow and the shimmer are multiplied by `1 - u_overlay`, so the data views (temperature, humidity, altitude, fertility, nutrients and litter) show their raw ramp in winter too.
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

- Numeric views use `RAMPS` through `rampLookup`. The modes are `altitude`, `temperature`, `humidity`, `fertility`, `nutrients`, `litter`, `bugs` and `disease`.
- The `nutrients` view reads live soil: `plants.soil.nutrient[i] / SOIL_MAX` is written into the scratch `soilField` (`Float32Array(n)`, made in `setWorld`) and mapped through `RAMPS.nutrients`, from barren grey-brown to rich dark green. Because the soil changes every tick, `draw` calls `setMode(mode)` again for any mode in `LIVE_MODES` (`nutrients`, `litter`) whenever more than 500 ms have passed since `lastSoilUpdate`.
- The `litter` view reads `plants.soil.litter`. `percentile99(src, out)` finds the 99th percentile of the positive values with a 1024-bin histogram (O(n), no sort), then writes `min(1, litter/p99)` into `soilField`. `RAMPS.litter` runs from grey (none) through tan and rust to dark brown (deep litter). If `soil.litter` is missing, the field is all 0.
- The `bugs` view reads `eco.bugs.total` (summed swarm density of all four niches per tile) through `percentile99` into `soilField`. `RAMPS.bugs` runs from near-black (no bugs) through amber to hot pink (the densest 1%). If `eco.bugs` is missing, the field is all 0. `bugs` is in `LIVE_MODES`, so it re-bakes every 500 ms.
- The `disease` view builds the scratch `sickField` (`Float32Array(n)`, made in `setWorld`): +1 on the tile of every infected animal (`animals.strain[i]` non-zero) and +0.5 on the tile of every blighted plant slot (`plants.blight[p]`, tile `p % n`). It is left all 0 when `eco.disease` is missing or off. The field goes through `percentile99` into `soilField` and `RAMPS.disease`, from near-black through olive to pale yellow-green. `disease` is in `LIVE_MODES`.
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
- Plant instances instead copy from `_tinted(id, health, col, blt)`, which fills the 9-byte scratch `_tint` with the species colors lerped toward `SICK_RGB` by `(1 - health)*SICK_MIX`, then toward `BLIGHT_RGB` by `BLIGHT_MIX` when `blt` (the slot's `plants.blight` entry) is set, and pass it to `_put` with offset 0.
- Infected animals copy from `_infected(id, col)`, which fills `_tint` with the species colors mixed toward `BLIGHT_RGB` by `INFECT_MIX` (0.55).

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
     - Both icons are health-tinted through `_tinted`.
     - Capacity is reserved for two plant instances per visible tile.
   - **Bug swarms (`_pushBugs`):** drawn at `zoom ≥ 9` in every view mode, not gated on `vegOn` or `showPlants`. Skipped when `eco.bugs` is missing.
     - For each visible tile and each niche plane `k` (cell `q = k*n + i`) with density above 0 and a species id, it pushes `ceil(min(1, density)*BUG_PER_DENSITY)` `dot` sprites (`BUG_PER_DENSITY = 4`).
     - Each particle's base position inside the tile comes from a hash of `(q, j)`. It is jittered by `sin/cos(time*speed + phase)*BUG_JITTER[k]`, with `BUG_JITTER = [0.05, 0.03, 0.04, 0.12]` and `BUG_SPEED = [1.6, 0.7, 1.1, 2.6]` per niche (pest, detritivore, parasite, pollinator), so pollinators flit widely and detritivores barely move.
     - Size is `max(BUG_DOT, BUG_DOT_PX/zoom)` (0.1 world units, or at least 4.5 CSS px), and the colour is the species colour from `spCol`.
     - While a bug species is highlighted, its particles draw at `BUG_HL_SCALE` (1.6×) and the other swarms at 0.3 alpha.
     - Bug species share the registry id space, so `_refreshSpeciesLookup` covers them through `registry.living` with no special case.
   - **Highlight scope (`_hostHighlight`):** returns `highlight`, or `null` when the highlighted species is a bug or a pathogen. Plants (`_updateVegetation`, `_pushPlants`) and animals use it, so selecting a bug or disease strain does not dim the map.
   - **Animals:** drawn when `showAnimals` is on.
     - Positions are interpolated as `p + (x - p)*alpha` between the previous and current tick.
     - Below zoom 3, animals are drawn as `dot` sprites.
     - Highlight rings are pushed first, so the animals draw on top. A ring goes on each animal of the highlighted species and, when the highlight is an animal strain (a pathogen whose `hostKind` is not `plant`), on each animal carrying that strain (`animals.strain[i]`).
     - Infected animals are colored through `_infected`. Above the dot zoom they also get a `virus` marker at `(x + 0.38*size, y - 0.5*size)`, scaled by `MARK_SCALE` (0.4), in its fixed colors.
     - Alpha drops to 0.35 for animals outside the highlighted species, for animals not carrying a highlighted strain, and, in the `disease` view, for healthy animals.
     - Capacity is reserved for three instances per animal (ring, body, marker).
3. Draws all sprites in one `drawArraysInstanced` call.

Other public members:

- Fields: `mode`, `showPlants`, `showAnimals`, `highlight` (a species id or `null`), `vegDirty` and `spriteCount`.
- Methods: `setWorld(world, eco)` and `setMode(mode)`.

### Other globals

- `compileProgram(gl, vs, fs)` returns `{p, u}`, where `u` maps uniform names to their locations.
- `RAMPS` and `rampLookup(stops)` build a 256-entry RGB lookup table from color stops.
- `LIVE_MODES`, `FLOWER_LEAF`, `FLOWER_TINT`, `FLOWER_SHADED`, `FRUIT_SHOW`, `FRUIT_EMPTY_SIZE`, `FUNGUS_SCALE`, `BUG_DOT`, `BUG_DOT_PX`, `BUG_HL_SCALE`, `BUG_PER_DENSITY`, `BUG_JITTER`, `BUG_SPEED`, `BLIGHT_RGB`, `BLIGHT_MIX`, `INFECT_MIX`, `MARK_SCALE` and `percentile99` are described above.
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
| `tab` | `plant`, `land`, `water`, `bug`, `disease` or `events`. |
| `eventFilter` | Filter for the event list. |
| `hidden` | A Set of population-chart keys hidden via the legend. |
| `lastUi`, `lastLogVersion` | UI refresh bookkeeping. |
| `msPerTick`, `fps` | Performance meters. |
| `hover` | Mouse position over the map, or `null`. |

Other globals:

- `$(id)` is shorthand for `document.getElementById`.
- `GROUP_COLORS` maps each stat group key, plus `plants`, `bugs` and `disease`, to its color.
- `TAB_GROUP` maps the tabs that list one registry group to it: `plant`, `bug`, and `disease` → `pathogen`. `speciesInTab` uses it.
- `SWARM_NICHES`, `SWARM_NICHE_ICON` and `SWARM_LABEL` are UI fallbacks for the niche names, a representative icon per niche, and category labels. They are named apart from the sim's `BUG_*` globals so the app still loads without `bugs.js`.
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

- **Left:** the stat cards and sparklines (`buildStatCards` and `updateStats`), the population chart (plant biomass is shown ÷10 so it shares the axis), the biome legend, and the clock and performance readout (`updateClock`). The `#viewModes` buttons in `index.html` (Biomes, Plants, Heat, Moisture, Height, Soil, Nutrients, Litter, Bugs, Disease) call `renderer.setMode(button.dataset.mode)`.
  - A wide **Bugs** stat card sits under Plant biomass. Its value is `stats.bugs` (rounded total density), its sparkline `history.bugs`, and its sub-line (`bugStatLine(stats)`, CSS `.stat-sub`) shows the occupied tiles per niche (`stats.pests`, `detritivores`, `parasites`, `pollinators`) next to niche icons, plus `pollination NN%` from `stats.pollination`. Missing fields read as 0, and the card is only marked `zero` when `eco.bugs` exists.
  - A wide **Disease** stat card (`data-key="disease"`, `virus` icon, "Disease · sick animals") follows. Its value is `stats.sick`, its sparkline `history.sick`, and its sub-line reads "N strains · N blighted tiles" from `stats.strains` and `stats.blight`.
  - The `#optDisease` switch (on by default) is passed as `options.disease` to `new Ecosystem` and sets `eco.options.disease` live.
  - The population chart has a `bugs` series (when `history.bugs` exists) with a "Bugs" legend toggle.
- **Right:**
  - Species tabs (Plants, Land, Water, Bugs, then Events as text only), with sorting and an extinct toggle, capped at 160 rows (`renderSpeciesList`). The Bugs tab (`data-tab="bug"`, count in `#countBug`) lists species with `group === 'bug'`; `speciesInTab`, `updateTabCounts`, `selectSpecies` and `setTab` route that group, and the list unit is " tiles" as for plants. Tabs use `flex: 1 1 auto` with tight padding and 11 px text (10.5 px below 1250 px) so six fit in the 330 px column; each tab's icon shows only while it is active (`.tabs button:not(.active) .tab-icon`).
  - The **Disease** tab (`data-tab="disease"`, `virus` icon, count in `#countDisease`) lists species with `group === 'pathogen'`; `selectSpecies` routes strains there. Its empty text is "No active outbreaks yet." and the row unit is " tiles" for plant strains (`hostKind === 'plant'`) and " hosts" otherwise. The species totals line adds " · N strains".
  - Pathogens: `roleOf` returns `'pathogen'`, `roleTag` shows "blight" or "disease" (class `role-pathogen`), and `categoryLabel` gives "Plant blight" or "Animal disease". The detail subtitle reads "<Category> · from <origin host>"; badges show Emerged or Host jump and Active or "Burned out · Year N"; the grid shows Infected, Peak, Deaths and Appeared. `#detailHostsWrap` (hidden for other groups) lists `sp.hosts` as chips (`data-id`, clicking selects the host), falling back to the origin host marked "origin". `DISEASE_TRAITS` shows Transmissibility, Virulence and Host range (genes 0–2).
  - Plant and animal details add **Avg resistance** (`mean[14]` for plants, `mean[G_RES]` for animals) and **Infected** when `sp.infected > 0`. `PLANT_TRAITS` gains gene 14 "Blight resistance" (shown for water plants too) and `ANIMAL_TRAITS` gains "Resistance" (`G_RES`).
  - Bug species: `roleOf` returns `'bug'` and `roleTag` shows the niche (`bugNiche(sp)`, from `sp.nicheIndex`, via `nicheIndex(sp)`) with a per-niche colour class `role-bug-<niche>`. `categoryLabel` uses `BUG_CATEGORY_LABEL` when defined. The detail subtitle reads "<Category> swarm · <niche>", the badges add Land or Aquatic from `sp.domain`, and the stats grid shows Population (tiles), Peak, Appeared and **Mean density** (`sp.density`).
  - The events list, which re-renders only when `log.version` changes (`renderEvents`). The **Outbreaks** filter (`data-f="outbreak"`) shows `outbreak` events, drawn with `EVENT_GLYPH.outbreak` `!` and an amber-green dot (`.ev-outbreak`).
  - The species detail view (`renderDetail`): badges, a stats grid, a history chart, trait bars from the `mean` genome, lineage and children. For plant species the stats grid also has a **Health** cell, the mean `sp.health` (a dash once extinct).
  - Fungus species (`sp.kind === 1`) get two extra badges: "Fungus" and the fungus type from `fungusType(sp.mean)` (Mild, Neurotoxic, Lethal or Symbiont).
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
  - Then the animal under the cursor, with `sick: <strain>` (`.tt-sick`) when it is infected.
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
