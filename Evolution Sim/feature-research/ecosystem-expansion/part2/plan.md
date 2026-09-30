# Plan: Part 2, fruit, flowers and fungi

Source: [roadmap.md](../roadmap.md), Part 2. This part builds on the Part 1 slot planes and soil, where plant index `p = slot*n + i`.

**Start condition:** don't start until the Part 1 UI slice (`audit-ui.md`) is done. Before any edits, re-measure the Part 1 perf baseline on seeds 42, 7 and 123, and record it in the audit.

## Shared contract (both slices code against this)

### Plant genes (PG 8 → 13)

The meaning of g10 and g11 depends on `kind`.

| Gene | Plant (`kind` 0) | Fungus (`kind` 1) |
| --- | --- | --- |
| g8 | fruiting: fruit stock size | unused, held at 0 |
| g9 | sweetness: fruit energy and lure | unused, held at 0 |
| g10 | seed toxicity | toxin type: <0.33 mild, <0.66 neurotoxic, else lethal |
| g11 | bloom: flower-ness | mycorrhizal: >0.5 means symbiont, otherwise decomposer |
| g12 | hue: bloom colour | hue: cap colour, which is what mimicry works on |

- g4 (`tox`) is the fungal toxin potency.
- `PLANT_WEIGHTS` gains `[0.6, 0.5, 0.6, 0.6, 0.4]`.
- `plantTraitsFrom` returns `fruiting`, `sweet`, `seedTox`, `bloom` and `hue`.

### Discrete kind

- **Storage:** `plants.kind` is a Uint8Array of size 2n, set in `_set` from `sp.kind`.
- **Inheritance:** `sp.kind` is 0 or 1 and is inherited by daughter species. Mutation never changes kind.
- **Slot:** fungi always go in slot 1 on land only. `slotOf` takes kind into account.
- **Helper:** `toxinType(g, o)` returns 0, 1 or 2.

### Categories

These are added to `plantCategory` and `PLANT_CATEGORY_LABEL`:

| Category | Label | When |
| --- | --- | --- |
| `fruittree` | Fruit tree | canopy tree, conifer or palm with fruiting > 0.5 |
| `berrybush` | Berry bush | shrub with fruiting > 0.5 |
| `flower` | Wildflower | land plant with wood < 0.3 and bloom > 0.55 |
| `puffball` | Puffball | fungus, mild toxin |
| `inkcap` | Inkcap | fungus, neurotoxic |
| `toadstool` | Toadstool | fungus, lethal |
| `truffle` | Truffle | fungus, mycorrhizal (overrides the toxin shapes) |

- `plantCategory` takes kind as a new argument.
- A fungus or flower species gets its species hue from g12, spread over the full hue wheel. This way `sp.color` is the bloom or cap colour. Other plants keep today's hue ranges.

### Other shared fields

- **Plant arrays:**
  - `plants.fruit`: Float32 of size 2n, the fruit stock.
  - `plants.fruitMax`: a per-plant cache.
- **Soil:** `soil.litter`, Float32 of size n, holding dead matter.
- **Counters on `plants`:** `seedDrops`, `fruitEaten`, and `poisoned[3]` (one per toxin type).
- **Season:** a global `bloomFactor(season)` from 0 to 1 that peaks in spring and early summer. A separate `fruitFactor(season)` peaks in late summer. When seasons are off, both are 0.5.
- **Animals:**
  - `animals.confuse` is a new per-animal Int32 field in `ANIMAL_FIELDS_I`.
  - `sp.aversion` is an array of `{hue, strength}` on each animal species. Daughter species copy it.

## Slice A: sim (`plants.js`, `soil.js`, `animals.js`, `ecosystem.js`)

### Fruit

- **Stock:** in `step`, after growth, for plants with kind 0, wood ≥ 0.3 and fruiting > 0.2:
  - Target is `fruitMax = fruiting * b * FRUIT_FRAC * fruitFactor * health * FRUIT_WIND`.
  - `FRUIT_WIND` is about 0.6. It stands in for pollination until Part 3.
  - The stock moves toward the target at `FRUIT_RATE` and rots back down out of season.
- **Growth cost:** `growth *= 1 - 0.25*fruiting - 0.15*sweet`. Non-fruiting plants get `floor *= 1 + 0.2*(1 - fruiting)` for toughness.
- **New `plants.eatFruit(i, amount)`:**
  - takes from canopy fruit first, then understory berries;
  - returns the amount eaten;
  - sets `plants.fruitSp` (the source species), `plants.fruitSweet` and `plants.fruitSeedTox`.
- **Refactor:** pull the resident-competition and assign tail out of `_spread` into `plantSeed(j, genome, parentSp, tick)`. `_spread` then calls it, and so do animal seed drops.
- **Seed carriage (`animals.js`):**
  - New fields: `seedSp` (Int32) and `seedTtl` (Int32).
  - **Eating fruit:** fruit comes before grazing. An animal eats fruit when `plantEff > 0.12` and either the animal can reach it (`_reach > 0`) or `mass < 1.2` for berries.
    - Energy gain is `eaten * FRUIT_ENERGY * (0.6 + sweet) * plantEff * (1 - 1.6*max(0, seedTox*0.7 - toxR))`.
    - Afterwards the animal picks up a seed: `seedSp = fruitSp`, `seedTtl = 20 + rand*40`.
  - **Dropping:** at `seedTtl == 0`, the seed survives with probability `0.45 + 0.4*seedTox`. It is then planted with `plantSeed(currentTile, mutateGenes(sp.mean), ...)` and `seedDrops++`.
  - **Foraging:** `_pickForage` adds `fruit * FRUIT_LURE * (0.6 + sweet)` to the food score of fruit eaters.

### Flowers

- **Seeding:** flower founders go in slot 1.
- **Cost:** `growth *= 1 - 0.2*bloom`.
- **Benefit:** in bloom season, the spread chance is multiplied by `1 + bloom*bloomFactor*FLOWER_SEED_BONUS*FRUIT_WIND`. This is wind pollination until Part 3.

### Fungi and dead matter

- **Litter:**
  - `soil.returnMatter(i, amount)` now adds `amount` to `litter[i]` instead of nutrients.
  - Litter decays into nutrients at `LITTER_DECAY` (about 0.004) per tick, times `RECYCLE`.
  - New `soil.addCarcass(i, mass)`: `animals._kill` deposits `mass * CARCASS_FRAC`.
  - When prey is eaten, the carcass fraction is smaller.
- **Decomposer fungi:**
  - Their effective K is `cap * min(1, litter/FUNGUS_LITTER_K)`, with light fixed at 1.
  - Their growth consumes litter and returns part of it as nutrients, at a rate `FUNGUS_DECOMP` above the plain decay rate.
  - Fungi don't draw soil nutrients: soil demand excludes kind 1, and `sat` is set to 1.
- **Mycorrhizal fungi:**
  - K comes from the canopy biomass on the same tile.
  - The tile's canopy plant gets `sat = min(1, sat * MYCO_BOOST)`, with `MYCO_BOOST` about 1.3. In exchange, its growth is multiplied by `MYCO_TAX`, about 0.92.
- **Toxin cost:** toxin potency slows fungal growth by `(1 - 0.3*tox)`, which is already in the growth formula through g4.
- **Founders** (land only, `kind` 1):
  - one decomposer each for mild, neurotoxic and lethal, at varied hues and with low shade needs;
  - one mycorrhizal truffle;
  - two flower founders at different hues;
  - one fruit tree founder;
  - one berry bush founder.
  - Existing founders get g8–g12 values that keep their current categories.

### Poison and aversion (`animals.js`)

**Detecting poisoning:** `graze` sets `plants.grazeFungus` (species id or 0), `grazeToxType` and `grazePotency` when understory fungus was eaten. Then `excess = potency - toxR`, and if `excess > 0`:

| Toxin | Effect |
| --- | --- |
| mild | `energy -= excess * MILD_LOSS * emax` |
| neurotoxic | `confuse = NEURO_TICKS` (about 25). A confused animal moves toward a random point each tick, can't eat or flee properly, and runs before all other behaviour. |
| lethal | die with probability `excess * LETHAL_P`, counted as the death cause `poison` |

- `poisoned[type]++` is counted in every case.

**Learned aversion:**
- The species adds or strengthens `{hue: fungus hue, strength += 0.5}`.
- All entries decay by `AVERSION_DECAY` every 20 ticks, and an entry is dropped below 0.05.
- In `_pickForage`, the food score is multiplied by `1 - max strength` over entries whose hue is within `MIMIC_HUE` (about 0.07) of the understory fungus.
- When grazing, if that aversion is above 0.5, the animal skips the understory and grazes only the canopy.
- When a species' aversion first passes 0.5, log it: "<animal> learned to avoid <fungus>". This is rate-limited per pair.
- Mimicry isn't special-cased. It emerges from hue matching.

### `ecosystem.js`

- New `stats` fields: `fruit` (total stock), `fungi` (fungus tiles), `flowers` (flower tiles) and `litter` (total).
- These are computed where `plantBiomass` already is.
- `animals.deaths.poison` counts poison deaths.

## Slice B: UI (`icons.js`, `render.js`, `main.js`, `index.html`)

- **`icons.js`:** add these icons, all sized for the existing 32×32 atlas:

  | Icon | Design |
  | --- | --- |
  | `fruittree` | canopy with fixed orange-red fruit dots |
  | `berrybush` | shrub with dark-blue berry dots |
  | `flower` | petals drawn in the `body` role, so they take the species colour, with a fixed yellow centre |
  | `puffball` | round cluster |
  | `inkcap` | tall bell |
  | `toadstool` | cap with fixed white spots |
  | `truffle` | small knobbly mound half-buried |

  Mushroom caps use the `body` role, so they show the species hue.
- **`render.js`:**
  - **Fruit:** show fruit on the map. Scale the fruit-dot icons' alpha or size by the fruit stock: a plant with no fruit draws at 0.85 size, a laden one at full size. If a variant approach is simpler, choose it and note it in the audit.
  - **Flowers:** in the vegetation texture, a flower in the understory lerps the tile colour toward the flower species colour by `bloomFactor(plants.season) * 0.7`. When a canopy covers it, this is weaker.
  - **Fungi:** fungi draw as the understory icon at 0.5 scale.
  - **Litter:** a new "Litter" view. It is a ramp of `soil.litter` normalised by its 99th percentile, re-baked every 500 ms like Nutrients.
- **`main.js`:**
  - **Tooltip:**
    - fruit stock on fruiting plants;
    - toxin type on fungi ("mild", "neurotoxic", "lethal", "symbiont");
    - a litter line in the tile meta.
  - **`PLANT_TRAITS`:** add rows for Fruiting, Sweetness, Seed toxicity / Toxin type, and Bloom / Mycorrhizal, labelled by `sp.kind`, plus Hue.
  - **Plant detail badges:** "Fungus", and the toxin type.
  - **Animal detail:** an "Avoids" row listing averted hues as colour swatches.
  - **Event log:** "learned to avoid" events already arrive through `eco.log`.
- **`index.html`:** a `Litter` button in `#viewModes`.

## Docs

- **`CODE_REFERENCE.md`:**
  - **Plants:** genes g8–g12, kind, categories, fruit, `eatFruit`, `plantSeed`, fungi and myco, and `bloomFactor`/`fruitFactor`.
  - **Soil:** litter, `addCarcass` and the new `returnMatter` meaning.
  - **Animals:** fruit eating, seed carriage, poison effects, confusion, aversion and mimicry.
  - **Ecosystem:** the new stats.
  - **Icons:** the new icons.
  - **Renderer:** the bloom tint, fruit display and Litter view.
  - **App/main:** the tooltip, traits and Avoids row.
- **`complexities.md`:**
  - `plants.js` goes to about 8;
  - `animals.js` stays at 8 or goes to 8.5;
  - `soil.js` goes to about 4.5.
- **Audits:** each slice writes its own, `part2/audit.md` (sim) and `part2/audit-ui.md`.

## Tests and gate

1. `node --check` on every changed file, and the no-comments grep on every changed file.
2. Headless sim with the scratchpad `run2.js`, extended to print fruit, fungi, flowers, litter, seedDrops, fruitEaten, poisoned[3], poison deaths and the aversion count. Run seeds 42, 7 and 123 for 3000 ticks.
3. **Pass criteria:**
   - all 6 trophic groups are above 0;
   - fruit trees or berry bushes, flowers and at least 2 fungus categories are alive on every seed;
   - `seedDrops > 0` and `fruitEaten > 0`;
   - every toxin type has `poisoned > 0` on at least one seed;
   - at least one aversion event occurs across the three seeds;
   - ms/tick is at most 1.25× the re-measured Part 1 baseline.
4. Only new constants and founder genes may be tuned. If the gate fails without touching existing animal constants, stop and report.
5. Headless render: no console errors, and no error overlay in the dump-dom output.

## Screenshots

Saved to `part2/screenshots/`, taken with a scratchpad probe page, as in Part 1:
- `forest-floor.png`: zoom ≥ 9 showing a fruit tree, a berry bush, flowers and mushrooms. Late spring, seed 7.
- `litter.png`: the Litter view.

## Execution

- **Slice A (sim)** is done by one implementer, and **Slice B (UI)** by a second, run in parallel. They only share the contract above.
- Slice B must not edit `js/sim/*`, and Slice A must not edit the UI files.
- Slice A owns the gate. Slice B owns the screenshots, and takes them after Slice A reports that the sim passes.

## Out of scope

- Pollinators and nectar stock (Part 3).
- Bugs and disease.
- Water fungi and water fruit.
- Changing existing animal constants.
- Fixing the Part 1 perf overage, other than measuring it.
- New code comments.
- git commits.
