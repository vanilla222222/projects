# Part 3b plan: life stages (eggs, children, old age) and fix pass

This part covers:
- the user's additions: egg laying, a child stage and an old-age stage;
- the three Part 3 watch items: late grazer collapse, thirst fading late, and the faint Territory view.

No code comments anywhere. UI beyond map drawing is Part 4, so new numbers are exposed on `stats` only.

## What the scouts found

**Grazer collapse** (diagnostic script `herbdiag.js` in the session scratchpad, seeds 42 and 123). It is mostly reclassification and stalling, not a wave of deaths:
- Stat groups are assigned per animal from its current genes (`ecosystem.js` ~148-168).
- **Seed 123:** herbivores that pick up `G_COLD > 0.5` are counted as reptiles, with 600-830 reptiles on herbivore diets. Mean herbivore diet also drifts from 0.04 to 0.31, just under the 0.33 omnivore cut.
- **Seed 42:**
  - Heavy starvation to year 10, even with plant cover saturated: 2,669 herbivore starvations in years 8-10.
  - Then diet drift, and a stall at low density.
  - Land scavengers balloon from 3 to about 2,700 by year 30.
- **The revival rule never fires.** It tests `landHerb + landOmni < 20` (`ecosystem.js:339`), and omnivores stay above 350.

**Thirst fade.** The drought-tolerance gene `G_DRY` cuts thirst by up to 60% and costs nothing, so it drifts up for free.

**Territory view** (`render.js:525-531`):
- It blends 55% owner colour over the terrain, which looks faint.
- Claims last 30 ticks (`TERR_HOLD`) and vanish with a hard cut, which looks patchy.

**Reproduction today** (`animals.js` `_reproduce` 1196-1246):
- Offspring spawn as adult-sized animals. Size is fixed at birth, and `mature = 45+110*size`.
- Lifespan is `maxAge = 500+1300*size`. After that there is a flat 5% death chance per tick, counted as `deaths.old`.
- There is no save or load, so new arrays need no migration.

## Slice 1: life stages (sim)

Files: `js/sim/animals.js`, new `js/sim/eggs.js`, `js/sim/ecosystem.js`, `js/sim/disease.js` (only if needed for the elder hook), `index.html` (script tag).

### Eggs
**Who lays eggs:**
- water animals (domain 1: fish, crabs, sea predators);
- amphibians (domain 2);
- reptiles (land with `cold > 0.5`).

Other land animals give live birth.

**New `EggPool` in `js/sim/eggs.js`:** a compact, separate store with:
- position and tile;
- species id and genome (`AG` floats), with speciation already decided at laying;
- energy, hatch timer and the parent's domain.

It also keeps a per-tile head/next list, so predators can find eggs on their tile. Eggs never enter the animal arrays, the spatial grid or the registry population.

**Laying:** `_reproduce` lays a clutch instead of spawning young.
- Clutch size is `EGG_CLUTCH_MUL` (2) × litter.
- Each egg costs `EGG_COST` (0.5) of a live child's energy.
- The parent's total spend stays about the same as a live litter.
- Amphibians must lay on fresh water or a wet tile. Water animals lay in water.

**Incubation:** `EGG_TIME` = 25 + 30×size ticks. Reptile eggs develop at a rate that falls to 0.5× on cold tiles, using `effTemp`.

**Egg losses:**
- An egg dies if the tile freezes (snow).
- An amphibian egg dies if its tile dries out (no longer fresh or wet).
- An egg dies if its species has gone extinct by hatching.

**Eaten eggs:**
- Omnivores, carnivores and scavengers eat eggs on their current tile before plant foraging, gaining `EGG_FOOD` × the egg's energy.
- Water animals eat water eggs, and land animals eat land and amphibian eggs.
- This is counted in `eggs.eaten`.

**Hatching:** calls the existing `spawn()` with the stored genome. The registry population is added then.

**Merging:** `_mergePass` / `reassignSpecies` also remaps egg species ids.

### Children
**Juveniles** are animals with `age < mature`. Their growth factor is `gf = 0.4+0.6*min(1, age/mature)`. It scales:
- bite and food intake;
- maximum energy and metabolism;
- effective mass for predation, so predators can take juveniles of larger species;
- render size, which is handled in slice 3.

**Maturity:** `mature` rises to `90+160*size`, so the child stage is visible. It stays well under `maxAge`.

**Live-born juveniles follow their parent:**
- A new Int field `parent` stores the parent's uid.
- Every 4 ticks, when the juvenile is idle (not thirsty, fleeing or eating), it steps toward the nearest adult of its own species within `range`, using the existing grid neighbour search.
- Hatchlings don't follow a parent.

**No breeding** until `age > mature`. This is already true today, but it now applies to the new, longer maturity.

### Old age
**Elders** are animals with `age > 0.75*maxAge`. Their elder factor `ef` runs from 1 down to 0.6 at `maxAge`. It scales:
- speed and bite;
- fertility: no breeding once `age > 0.9*maxAge`;
- infection chance, which rises to ×1.5.

**Death from old age** replaces the flat 5% chance past `maxAge` with a rising risk from `0.85*maxAge`: `p = 0.0015*exp(12*(age/maxAge-0.85))` per tick. It is still counted in `deaths.old`. The average lifespan should stay within ±10% of today's, which is checked in the audit.

### Stats
- `stats.stages = {eggs, juveniles, adults, elders}`.
- `stats.eggs = {laid, hatched, eaten, failed}`, as cumulative totals.

## Slice P: plant life stages (user addition; runs after slice 1 and before slices 2 and 3)

Files: `js/sim/plants.js`, `js/sim/ecosystem.js` (stats line only), `js/render.js` (plant sprite pass only).

The scout found that plants have no age, no lifespan and no seed entity today. `_spread` and `plantSeed` place a new plant straight away at biomass 0.04, and plants die only from shade, low health or pests.

### Age and lifespan
**Plant age.**
- A per-slot `age` (Uint16, in 8-tick units) is incremented inside the existing loop on `(tick & 7) === 0` and reset in `_set`.

**Lifespan grows with size** (wood gene 3), so larger plants age more slowly:
- Plants live `PLANT_LIFE = 480*(1.5 + 30*wood²)` ticks. That is about 1.5 years for grass, 9 years for mid-wood shrubs and about 31 years for full trees.
- Fungi (kind 1) live 1 year.
- Every lifespan gets ±15% per-slot jitter at `_set`.

**Stages:**
- **Seedling** (`age < mature`, with `mature = max(60 ticks, 0.1*life)`):
  - K is scaled by `0.3+0.7*ageFrac`.
  - No fruiting and no spreading.
  - The grazing floor is 0, and a bite that leaves biomass < 0.03 kills the seedling (counted as `plants.grazedSeedlings`).
- **Mature:** behaviour is unchanged from today.
- **Old** (`age > 0.8*life`):
  - growth r × 0.6;
  - fruit × 0.5;
  - a per-check death chance of `0.004*exp(8*(age/life-0.9))` from 0.9×life. Deaths are counted as `plants.oldDeaths` and go through `_clear`, so litter and the light gap behave as today.

### Seed bank
- **Store:** per tile, `seedDens` (Float32), `seedSp` (Int32) and `seedGenome` (n×PG). Each tile holds one genome.
  - A deposit replaces the stored genome with probability `new/(old+new)`.
- **Deposits:** a `_spread` or `plantSeed` that fails puts seeds into the target tile's bank instead of losing them. This covers an occupied slot, a lost competition, or a tile that is too dry (`moistMul < 0.9`) or snowy.
  - `plantSeed` does this internally, so animal seed drops need no change to `animals.js`.
  - A spread onto an empty slot in good conditions still sprouts straight away, as today.
- **Decay:** density × 0.985 per 8-tick check, then cleared below 0.02.
- **Germination:** every 8 ticks, only on tiles holding seeds.
  - The chance is `GERM_P (0.08) * dens * moistMul * (1 - snow)`, and it needs an empty slot of the genome's layer. It calls `plantSeed` so the normal competition applies.
  - Old trees dying and droughts ending should visibly trigger sprouting.
- **Extinct species:** seeds whose species is extinct fail and are cleared.
- **Merging:** `reassignSpecies` also remaps `seedSp`.

### Stats and drawing
- `plants.stages = {seedTiles, seedlings, mature, old}` plus `plants.oldDeaths`, `plants.germinated` and `plants.grazedSeedlings`. These are wired into `stats.plantStages`.
- Plant sprites:
  - Seedlings draw at `0.5+0.5*ageFrac` size.
  - Old plants are tinted 25% toward grey. The tint reuses the `_tinted` health path.

### Targets
- Plant cover stays within 8% of Part 3.
- Seedlings are 5-25% of occupied slots.
- `oldDeaths > 0` for grasses, shrubs and trees by year 35.
- The mean age of living trees is at least 5× that of grasses.
- Germinations are above 0 on every seed.
- All animal groups stay alive.
- ms/tick at 3000 ticks stays within +25% of Part 3, together with slice 1.

## Slice 2: balance fixes (sim, after slices 1 and P, since they change birth rates and plant cover)

Files: `js/sim/animals.js`, `js/sim/ecosystem.js`.

1. **Herbivore rescue rule:** fires on `landHerb < 30` by itself, rather than the combined herbivore and omnivore count.
2. **Generalist tax (disruptive selection on diet):**
   - Plant energy gets `(1 - GEN_TAX*d)`, and meat and carrion energy get `(1 - GEN_TAX*(1-d))`, where `d = diet` in the 0.2-0.8 band, scaled to 0-1 at the band edges.
   - `GEN_TAX` starts at 0.3.
   - Herbivores then get pushed back toward pure grazing instead of drifting to 0.33.
3. **Reptile cost off the heat:** `G_COLD` above 0.5 gets extra upkeep `COLD_UPKEEP` (0.15) scaled by `max(0, 0.5 - effTemp)`. Cold-blooded herbivores in cool places then drift back to warm-blooded, while desert tortoises stay.
4. **Early herbivore starvation:** the implementer measures grazing intake against metabolism for herbivores at years 5-10 (using `herbdiag.js`). If intake is the limit, raise the herbivore graze efficiency by up to +30%.
5. **Land scavenger cap:** scavenger plant intake gets `(1 - 0.5*scav)`, so high-scav animals can't live as omnivores.
6. **Drought tolerance gets a cost:** metabolism +`DRY_COST*dry`, with `DRY_COST` 0.08.
7. **Egg predation (slice 1 carry-over, where egg loss was only 3%):**
   - Foraging omnivores, carnivores and scavengers treat a nearby egg tile as a food lure in `_pickForage`, using the per-tile egg list within the existing sample radius.
   - Water herbivores and omnivores eat other species' eggs on their tile.
   - A base failure chance of 0.1% per tick applies to every egg.
   - Target: 20-60% loss.
8. **Plant cover (Slice P carry-over): cover is −22% at year 35.** Gaps appear on water tiles and on glacier, alpine and tundra tiles, where only the founders ever grew. Fixes, in `plants.js`:
   - A plant that dies of old age deposits its own genome into its tile's seed bank, at density 1.
   - Water-plant seedlings aren't killed by grazing bites.
   - Retry the lifespan wood factor at 40, together with the balance fixes. Keep it only if no group dies.
   - Targets: cover within 8% of Part 3 at year 35, and a tree/grass age ratio of at least 5×.
9. **Tuning room:** every constant above can be adjusted by ±50% to hit the targets.

## Slice 3: drawing (in parallel with slice 2 after slice P; no shared files)

Files: `js/render.js`, `js/icons.js`, `js/main.js` (only if tooltip glue needs it).

1. **Territory view:**
   - 80% owner colour.
   - Saturation boost: push the species colour away from its gray mean by 1.4×.
   - A `rgbDark` outline wherever a 4-neighbour tile has a different owner or no owner.
   - Claims fade over their last 10 ticks instead of cutting off.
   - The vegetation and overlay layers are off in this mode.
2. **Juveniles** are drawn at `gf` × size, and both sprites and dots use the same factor.
3. **Elders** are drawn at alpha 0.8.
4. **Eggs:**
   - A new `egg` icon (145 icons in total), and the gallery screenshot is refreshed.
   - Eggs are drawn when zoomed in (zoom ≥ 3) as small egg sprites tinted by species colour. Clutches on one tile are drawn slightly jittered.
   - No egg dots when zoomed out.

## Targets (seeds 42, 7 and 123)

| Item | Target |
|---|---|
| Land herbivores, year 35 | ≥ 150 on every seed, rescue rule fires at most twice per seed |
| Land scavengers, year 35 | ≤ 1000 and alive |
| Herbivore mean diet, year 35 | ≤ 0.2 |
| Thirst share of land deaths | ≥ 2% at year 35, ≤ 10% at 3000 ticks |
| Eggs | 20-60% of laid eggs lost (eaten + failed); hatch count > 0 in all three egg-laying groups |
| Juveniles | 15-40% of land animals at 3000 ticks |
| Elders | 5-20% of animals; mean age at old-age death within ±10% of Part 3 |
| All 9 groups | alive at 3000 ticks and year 35 |
| Plant cover | within 5% of Part 3 |
| ms/tick at 3000 ticks | ≤ +25% over Part 3 (23-28) |
| Browser, seed 42 | no console errors |

## Screenshots (`feature-research/ecosystem-v2/part3b/screenshots/`)

1. `territory.png`: the Territory view, seed 42, year 9, with the new tint and outlines.
2. `lifestages.png`: zoomed in near water, showing egg clutches, small juveniles next to adults, and faded elders.
3. `designs.png`: refreshed with the egg icon.
4. `plants.png`: zoomed-in forest edge showing seedlings next to mature plants and greyed old trees.

## Docs

`CODE_REFERENCE.md` needs updates in these sections:
- Animals: stages, `parent`, the old-age risk curve, the generalist tax, the new costs.
- New Eggs section.
- Ecosystem: rescue rule, stats.
- Render: territory drawing, stage sizing, egg pass.
- Icons: egg.

`complexities.md` needs:
- a new `js/sim/eggs.js` entry (about 4.5);
- the `animals.js` note updated;
- `render.js` and `icons.js` notes updated.

## Out of scope

- UI for stages and eggs (stat cards, detail rows): Part 4.
- A lifespan gene or any new genes.
- Parental feeding or nests beyond laying.
- Birds as egg layers.
