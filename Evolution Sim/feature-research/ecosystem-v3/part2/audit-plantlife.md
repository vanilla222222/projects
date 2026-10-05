# Part 2 audit: plant life (slice A)

Item 8 of Part 2 adds the following to plants:

- life cycles;
- leaf habit;
- evolving phenology timing;
- autumn colour and blossom on the map;
- vertical layers;
- climbers (vines and epiphytes);
- clonal spread.

The plant genome grows from PG 17 to PG 23. `SAVE_VERSION` stays 2, and no new save classes were needed. Old saves load and are padded with defaults.

## What changed

### New genes (`js/sim/plants.js`, slots 17 to 22)

| Slot | Gene | Effect |
| --- | --- | --- |
| 17 | cycle | Herbs only: below 0.33 is annual, below 0.66 is biennial, otherwise perennial. |
| 18 | deciduous | Woody plants only: above 0.5 sheds leaves in winter. |
| 19 | phase | Shifts flowering, fruiting and seed release earlier or later in the year (8 timing bins). |
| 20 | height | Woody plants only: sets the layer and trades cap and seed reach against growth. |
| 21 | climb | Herbs only: above 0.6 is a climber. Root below 0.35 makes an epiphyte, otherwise a vine. |
| 22 | clonal | Spread by runners, rhizomes or suckers. |

**Defaults.** `plantLifeDefaults` derives the defaults from the existing genes:

- Hot, dry herbs default to annual, and showy bloomers default to biennial.
- Temperate woody plants default to deciduous.
- Tall trees default to the emergent layer.
- Wet herbs default to clonal.

The same function pads old genomes (`padPlantGenes`, `upgradeGenes`). Two new archetypes join the founder set: a vine and an epiphyte.

### Life cycles

| Cycle | Growth | Cap | Life span | Seeding |
| --- | --- | --- | --- | --- |
| Annual | ×1.12 | unchanged | 0.8 years | unchanged |
| Biennial | unchanged | ×1.1 | 2 years | Only in the second half of life (gate in `_spread`) |
| Perennial | unchanged | unchanged | old formula | unchanged |

### Leaf habit

- Deciduous plants grow at ×(0.92 + 0.5·seasonAmp).
- In winter (season < −0.2) they drop 6%·amp of their excess biomass on each check tick, and that biomass becomes litter. This means more summer growth and a winter dieback that feeds the soil.
- Evergreen plants keep the old behaviour.

### Phenology timing

- Each tick, `phaseTick` builds 8 bloom curves and 8 fruit curves, each offset by its phase bin.
- Each slot reads the curve for its own bin through `form >> 3`.
- Bin 4 reproduces the old `bloomNow`/`fruitNow` exactly, so default behaviour is unchanged.
- Off-centre timing costs up to 0.6·amp of `fruitK` and `bloomK` in strongly seasonal climates. In the tropics it is close to free, so timing can drift there.

### Layers and height

The layer is derived from woodiness and the height gene:

| Layer | Rule |
| --- | --- |
| Ground | herbs |
| Shrub | wood below 0.62 |
| Canopy | trees with height up to 0.65 |
| Emergent | trees with height above 0.65 |

- Height changes cap by ±15%·wood and growth by ∓10%·wood.
- Height adds up to 2 tiles of seed reach.
- No separate shade-casting field was added, to keep the change lean.

### Climbers

Vines and epiphytes live in the under slot.

- **Shade:** they take only 25% of the canopy shade.
- **No host:** with no canopy tree above, their K is halved.
- **Vines:** a vine taxes its host's growth by 6%.
- **Epiphytes:** they take no soil uptake. Their cap scales with humidity (0.3 + 0.7·humidity), and soil saturation is treated as full for them, as for fungi.

### Clonal spread

- In `_spread`, a plant with clonal gene above 0.25 has a (clonal − 0.25)·0.6 chance to clone into an adjacent tile instead of seeding. The clone is an unmutated copy that starts at 0.1 biomass.
- Clonal plants pay up to 8% growth.
- The clone count is reported in `stats.plantStages.clones`.

### Map, panel and icons

- A new per-tile `pheno` grid (Uint8; 1 autumn, 2 bare, 3 blossom) is computed on check ticks. It is in `SNAP_GRIDS.plants` and is not volatile, so the worker's skip-unchanged logic sends it only when it changes.
- `render.js` tints vegetation with it: orange for autumn, brown for bare, pink-white for blossom.
- The species panel shows badges for:
  - layer, or Vine / Epiphyte;
  - life cycle;
  - Deciduous / Evergreen;
  - clonal spread.
- The panel also has six new trait rows, hidden for fungi and aquatic plants.
- New icons: vine, ivy, orchid and bromeliad.
- Plant speciation and the family tree reuse the existing registry and the `FamilyTree` kingdom view. The new genes take part in the species distance automatically because they extend the genome.

### GPU mirror (`js/gpu/plantKernels.js`, `plantGpu.js`)

- **Uniforms:**
  - A new slot field `form`, with `NU_SLOT` going from 6 to 7.
  - The uniform buffer grows to 112 bytes, adding `bloomB[8]` and `fruitB[8]`.
- **Kernels:** the WGSL plant kernel mirrors:
  - the phase bins;
  - climber shade and the no-host penalty;
  - the vine tax on the host.

  `soilA`/`soilB` skip epiphyte uptake and treat their saturation as full.
- **Uploads:** `form` is uploaded in `fullUpload` and patched in `diffUpload`, using a new `sForm` shadow.
- **CPU side:** leaf drop and `updatePheno` run in `cpuPart`, and `phaseTick` runs in `step`.
- **Folded statics:** the cycle, deciduous, climber and timing multipliers are folded into the cap, growth, fruitK and bloomK values that are already uploaded.
- **Testing:** this path could not be exercised in Node or SwiftShader, which have no WebGPU.

### Saves (`js/save.js`)

- `form` is now `DERIVED` and is rebuilt on load.
- A new `upgrade(eco)` runs after decode. It pads `animals.seedGenome`, `disasters._scratch`, the plant genome, the plant seed bank and the registry plant-species `mean`/`genome` from 17 to 23 genes.
- Checked by encoding a save at tick 300 with the base code and decoding it with the new code:
  - every array came out at stride 23;
  - all registry means had 23 genes;
  - the run stepped 300 more ticks without error.

## Numbers

Medium map (320×210), 3000 ticks, Node. The minima are taken from tick 500 onwards.

| Seed | | ms/tick | fish | amphib | reptile | mammal | bird | invert | bird niches (seed/insect/fisher/raptor/carrion) | cover | tree share | plant species |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 42 | before | 32.08 | 634 | 32 | 109 | 350 | 127 | 481 | 37/21/3/0/6 | 0.977 | 0.286 | 19 |
| 42 | after | 35.43 | 443 | 11 | 82 | 493 | 100 | 298 | 6/28/2/2/7 | 0.974 | 0.294 | 23 |
| 7 | before | 32.91 | 691 | 104 | 75 | 450 | 64 | 175 | 7/9/4/2/6 | 0.945 | 0.292 | 20 |
| 7 | after | 28.31 | 427 | 14 | 68 | 412 | 104 | 96 | 7/12/1/3/7 | 0.949 | 0.301 | 23 |
| 123 | before | 30.14 | 576 | 29 | 168 | 629 | 67 | 315 | 5/23/3/2/9 | 0.942 | 0.288 | 21 |
| 123 | after | 32.27 | 651 | 5 | 166 | 464 | 64 | 330 | 9/20/2/4/5 | 0.943 | 0.301 | 23 |

**Survival at tick 3000.** All six classes and all five bird niches are alive on every seed. The raptor niche, which touched 0 on base seed 42, stays at 2 or more.

**End populations at tick 3000 (after):**

| Seed | fish | amphib | reptile | mammal | bird | invert |
| --- | --- | --- | --- | --- | --- | --- |
| 42 | 3230 | 768 | 88 | 950 | 128 | 3336 |
| 7 | 2311 | 198 | 679 | 1470 | 185 | 875 |
| 123 | 3286 | 424 | 676 | 464 | 140 | 2152 |

**Plant mix at tick 3000 (after, seed 42 / 7 / 123):**

| Measure | Seed 42 | Seed 7 | Seed 123 |
| --- | --- | --- | --- |
| Herb cycles, annual / biennial / perennial (slots) | 3340 / 5899 / 21436 | 1660 / 4995 / 24007 | 3943 / 6061 / 19642 |
| Woody, evergreen / deciduous | 6642 / 27305 | 13248 / 20816 | 9331 / 23709 |
| Layers, emergent / canopy / shrub / ground | 1188 / 13094 / 19665 / 30675 | 5110 / 14653 / 14301 / 30662 | 4003 / 15007 / 14030 / 29646 |
| Vines / epiphytes | 1876 / 264 | 5045 / 2207 | 4534 / 1912 |
| Clonal (gene above 0.5) | 11482 | 13172 | 11811 |

Cover and tree share stay within ±0.015 of base.

**ms/tick.** The averages are 31.71 before and 32.00 after, so +0.9%. That is within the gate. Single runs on this shared machine vary by ±15%: seed 42 came out +10% and seed 7 came out −14%.

**Determinism.** Each run saved at 1500, stopped at 2000, then loaded the save in a fresh context and stepped 500 ticks. Stats JSON, the biomass buffer and the tick were identical for seed 42 and seed 7, so `det: true` both times.

**Browser check.** Headless Chromium with SwiftShader, worker mode, tick 232 (late summer):

- autumn tint is visible across the temperate forests (15.8k autumn tiles);
- the vine icon renders in the plant list;
- the panel shows the Canopy / Perennial / Evergreen badges and the new trait rows;
- the plant kingdom family tree opens;
- there are no page errors.

## Open issues

- **Amphibian minima are lower** after the change on all three seeds (5 to 14 against 29 to 104 before). End populations recover (198 to 768), and the drop most likely comes from the shifted plant and litter dynamics plus normal variance, but it should be watched. Reptiles on seed 42 ended at 88 (520 before) while staying above 68 throughout.
- **Deciduous dominates** woody slots (61 to 80%) because temperate woody plants default to deciduous and the summer bonus pays. Tropical seeds could test whether evergreens win there as intended.
- **The WebGPU fast path is untested** because there was no WebGPU device. The WGSL compiles only in a real browser with WebGPU, and it needs a manual check.
- **Height has no shade casting:** emergent trees do not shade the canopy layer. A shade field was left out to stay lean.
- **No speciation in the browser check:** it ran only to tick 232, so the browser tree shows founders only. The Node runs reach 23 plant species, against 19 to 21 before.
