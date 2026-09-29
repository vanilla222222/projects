# Ecosystem expansion roadmap

This roadmap turns the requested features into four updates. Each update builds on the one before it and ships on its own: the sim stays balanced, playable and screenshot-verified after each part.

Items marked **(+)** are additions beyond the original request.

Every part follows the build-opus loop:
1. Scout.
2. Write a `plan.md`, which needs approval.
3. Implement, then write an `audit.md` and take screenshots.

Across all four parts:
- **Performance:** all new state lives in typed arrays, in the same style as the current sim. Per-tick cost may grow by at most about 25% per part, measured with `run.js` on seeds 42, 7 and 123.
- **Balance:** after 3000 ticks, every existing trophic group must still be alive on all three seeds.

---

## Part 1 — Crowded ground: soil, shared tiles and competition

This part builds the base that everything later depends on. Plants start competing for a finite resource, and the ground can hold more than one plant.

### 1.5 Two plants per tile
- Each tile gets two plant slots:
  - **Canopy:** the tall slot, for trees, conifers, palms and large shrubs.
  - **Understory:** the low slot, for grass, moss, small shrubs and, later, flowers and mushrooms.
- Plants on the same tile always compete, and that competition is the strongest kind.
- **(+) Shade:** the canopy takes light first. Understory growth scales with a new `shade tolerance` gene, so moss and ferns can live under a forest and grasses can't.
- A plant's archetype decides which slot it can hold. A seed only lands in a slot that matches its archetype.

### 1.2 Nutrient competition
- **(+) Soil nutrients:** each tile gets a nutrient store. It starts from the existing `fertility` map and refills slowly toward that value.
- Plants take nutrients in proportion to their biomass times a `root vigour` gene.
- Demand is pooled across the tile and its 8 neighbours:
  - Neighbours count for less than the plant's own tile.
  - A second plant on the same tile counts for the most.
- **Health:** each plant gets a health value from 0 to 1.
  - Health falls when a plant gets less nutrient than it needs, and recovers when it gets enough.
  - Low health slows growth and stops seed production.
  - Health at 0 kills the plant.
- **(+) Nutrient cycling:** a dying plant returns part of its biomass to the soil. Old forest soil ends up richer than fresh ground.

### Also in this part
- **(+) New map view, "Nutrients":** shows the soil store.
- **(+) Unhealthy plants look it:** their colour shifts toward yellow-brown.
- **(+) Plant stats:** the detail panel shows health and which slot the plant holds.

---

## Part 2 — Fruit, flowers and fungi

This part gives plants reproduction strategies and adds a decomposer kingdom. It relies on the understory slot and the nutrient cycle from Part 1.

### 1.1 Fruit
- **Trees and shrubs get a `fruiting` gene:**
  - Plants that don't fruit put that energy into growth and toughness.
  - Plants that do fruit grow a seasonal fruit stock, peaking in late summer. Its size depends on health.
  - **Berries** are a variant for shrubs: smaller fruit, faster to grow back, eaten by small animals.
- **Fruit as food:** the existing fruit-reach mechanic changes so animals eat the fruit stock instead of foliage.
  - Fruit is higher-value food for omnivores and small grazers.
  - This should help with the known omnivore dips.
- **Seeds travel inside animals.** An animal that eats fruit carries a seed for a set number of ticks, then drops it wherever it is standing.
  - **(+)** How far a seed travels follows from how fast and how far the animal moves. Seeds carried by big animals spread furthest.
- **(+) Fruit trade-off:** fruit gets a `sweetness` gene that attracts eaters but costs energy. A `seed toxicity` gene protects seeds but pushes eaters away.

### 1.4 Flowers
- **New plant archetype, flower:** it lives in the understory and has a `bloom colour` gene and a `nectar` gene.
- **(+)** Flowers bloom in spring and summer. The map shows colour patches in season.
- Flowers make seeds only once pollinated. Until Part 3 arrives they fall back to a slow wind-pollination rate.

### 1.3 Mushrooms
- **New archetype, fungus:** it lives in the understory, needs no light and feeds on dead matter.
- **(+) Dead matter:** animals leave carcasses and dead plants leave litter on the tile. Fungi eat it and return nutrients to the soil.
- **Poison:** mushrooms get a `toxin` gene with several types:
  - **Mild:** makes the animal vomit, so it loses energy.
  - **Neurotoxic:** the animal wanders at random for a few ticks, which makes it easy prey.
  - **Lethal:** a dose-based chance of death.
  - Toxin costs the fungus growth, so harmless mushrooms spread faster.
- **(+) Learned avoidance:** when an animal is poisoned, its species gains a fading aversion to that mushroom species.
- **(+) Mimicry:** a harmless mushroom that looks like a toxic one (similar colour genes) is avoided too, and can evolve by selection.
- **(+) Mycorrhizae:** some fungi are symbionts rather than decomposers. They raise the nutrient uptake of trees nearby and take a share of the tree's sugar.

### Also in this part
- **Icons:** fruiting-tree and berry-bush variants that show fruit dots, three mushroom shapes, and flower icons tinted by bloom colour.

---

## Part 3 — Bugs: pests, decomposers and pollinators

Bugs are too numerous to simulate one by one. They are modelled as **swarm densities per tile**, grouped into species, and they evolve and speciate like plants do. At high zoom they draw as small animated particles.

### 2.1 Pests and decomposers
Each bug species has a `niche` that decides what it feeds on:

| Niche | Feeds on | Effect |
| --- | --- | --- |
| **Herbivore pests** | plant biomass | Lowers plant health; boom-and-bust outbreaks |
| **Detritivores** | carcasses and litter | Speed up nutrient return, alongside fungi |
| **Parasites** | animals | Drain energy, and carry disease from Part 4 |

- **(+) Locust outbreaks:** a herbivore pest that goes past a density threshold switches to a migratory swarm phase and moves across the map. The event is logged.
- **(+) Insect eaters:** small animals can eat bugs. Mice, fish and crabs gain bug density as a food source through the diet gene.
- **(+) Plant defence gene:** makes a plant less appealing to pests, at a cost to growth.

### 2.2 Pollinators
- **Nectar-eating bugs:** they move toward flowers and fruiting plants with high nectar.
- A plant visited by pollinators gets a pollination score, which multiplies its fruit and seed output.
- Flowers and fruiting plants from Part 2 need pollination to reach full output.
- **(+) Co-evolution:** each pollinator species has a preferred bloom colour that drifts toward the flowers it feeds on. Specialists pollinate better, generalists survive better, and flowers with a matching colour benefit.
- **(+) Pollinator collapse:** if pollinators crash, flowers and fruit trees decline after them. The events list reports it.

### Also in this part
- **New right-panel tab, "Bugs":** lists bug species and density charts.
- **(+) New map view, "Bugs":** a heat map of bug density.

---

## Part 4 — Disease

Pathogens are evolving species of their own, with hosts.

### 3 Disease model
- **Pathogen traits:** host type (plant or animal), host range (how genetically close a host must be to the original host species), transmissibility and virulence. Each pathogen belongs to a strain.
- **Animals:** each animal can be healthy, infected or recovered, with an infection timer.
  - Infection spreads by contact through the existing spatial grid, by carcasses, and by parasite bugs.
  - Sick animals move more slowly, use more energy and may die.
  - Recovered animals are immune to that strain for a while. The immunity is not inherited.
- **Plants:** blights spread from tile to tile, faster in dense single-species stands. This rewards mixed forests, which Part 1 makes possible.
- **Resistance:** an inherited `resistance` gene lowers the chance of infection and the damage taken. It costs energy or fertility, so it only spreads while disease is around.
  - **(+) Full immunity:** a rare mutation gives immunity to one strain. Carriers become the survivors of an outbreak, which directly delivers the request.
- **(+) Pathogen evolution:** strains mutate. Virulence and transmissibility trade off, so very deadly strains burn out and milder ones last.
- **(+) Zoonotic jumps:** a strain can jump to a genetically close species, rarely and in proportion to host similarity.

### Also in this part
- **Visuals:** sick animals and plants get a green-grey tint, and animal icons show a small marker.
- **(+) New map view, "Disease":** shows infections.
- **Events:** outbreaks and mass die-offs.
- **(+) Disease panel:** for each strain it shows hosts, spread, deaths and a history chart. The species detail panel shows the average resistance.
- **Migrations:** the existing re-introduction toggle also applies to pathogens, so outbreaks can seed again.

---

## Dependencies

- Part 1 → Part 2: the understory slot and the nutrient and dead-matter cycle.
- Part 2 → Part 3: flowers and fruit to pollinate, and carcasses for decomposers.
- Part 3 → Part 4: parasite bugs as disease carriers.
- Part 4 still works without Part 3; it just loses bug-borne spread.

## Files each part will mainly touch

| File | Complexity | Parts |
| --- | --- | --- |
| `js/sim/plants.js` | 7 | 1, 2, 3, 4 |
| `js/sim/animals.js` | 8 | 2, 3, 4 |
| `js/sim/ecosystem.js` | 6 | all |
| new `js/sim/soil.js` | — | 1, 2 |
| new `js/sim/bugs.js` | — | 3 |
| new `js/sim/disease.js` | — | 4 |
| `js/render.js` | 7 | all (new views, tints, particles) |
| `js/icons.js` | 3 | 2, 3, 4 |
| `js/main.js` | 5 | all (panels, tabs, events) |
| `CODE_REFERENCE.md`, `complexities.md` | — | all |

## Open questions for the user

1. **Bug inspection:** should bugs be inspectable one at a time? The current design only lets you inspect a bug species and its density.
2. **Disease deaths:** can disease wipe out a species completely, or should immune survivors be guaranteed a floor?
3. **Disease toggle:** should disease get an on/off toggle in the Map card, like Seasons and Migrations?
