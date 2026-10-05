# Ecosystem v3 roadmap

Three parts. Each ships on its own and the sim stays balanced, playable and verified with screenshots after every part. Items marked **(+)** go beyond the original request.

Each part follows the same loop as v2: scout the code, write `plan.md` for approval, implement in slices, write an `audit-slice*.md` per slice and take screenshots.

Gates for every part, measured on seeds 42, 7 and 123 over 3000 ticks, with longer runs where a part's goals need them:
- **Performance:** per-tick cost may grow by at most about 25% per part. Part 2 must bring it down.
- **Balance:** every animal class, and every role inside it that existed at the start, is still alive after the run.
- **Save/load:** a save and load mid-run must stay byte-identical (the `js/save.js` determinism test). Any new class must be added to `classTable()`.

---

## Part 1: Behaviour, taxonomy and birds

### 1.1 Nests and dens
- **Nest/den gene.** Animals that carry it pick a home site when they mature and return to it to breed.
- **Nests** (birds, reptiles, amphibians and egg-laying fish): eggs are laid in the nest, not wherever the parent stands. Nest sites need cover: trees and shrubs for birds, warm dry ground for reptiles, shallow fresh water for amphibians.
- **Dens** (mammals): young are born in the den and stay near it until they mature. A den shelters its occupants from cold, storms and some predation.
- **Guarding:** parents near a nest or den defend it, so eggs and young are eaten less. This also gives egg predators a target, which fixes the v2 egg-loss miss.
- **(+) Nest view** on the map: nests and dens drawn as small icons when zoomed in, plus a Nests stat card.

### 1.2 Pack hunting
- **Pack gene** for predators (and some omnivores): packmates of the same species near each other hunt together.
- Pack members share a target. The kill chance rises with pack size, so packs can bring down prey much bigger than one hunter.
- The meat is shared, so each member gets less per kill. This creates a real trade-off against hunting alone.
- Prey herding (v2) now matters more: herds against packs.
- **(+)** Packs are counted in the stats and shown as linked dots when zoomed in.

### 1.3 Sexual selection
- **Display gene** (an ornament: crest, plumage, colour intensity or antler size) and **choosiness gene**.
- Mates are chosen by display. A choosy animal rejects mates below its threshold, so displays spread when choosiness is common.
- Displays cost energy and make the animal easier for predators to spot. This is the classic runaway against survival trade-off.
- **(+) Sprites show the display:** a brighter colour and a scaled crest or plumage mark.
- **(+)** Species detail gets Display and Choosiness traits, and a chart of mean display over time.

### 1.4 Taxonomy instead of roles
- The animal stat groups become **classes: Fish, Amphibians, Reptiles, Mammals, Birds and Invertebrates.**
- An animal's class is fixed per lineage (inherited from its founder, like its domain), so a species can't drift from mammal to reptile.
- **Expandable class cards:** clicking a class card opens a breakdown by role (herbivore, omnivore, predator, scavenger) with counts and sparklines.
- The population chart and its legend show the classes. One Animals tab with class filter chips replaces the Land and Water tabs.

### 1.5 Birds
- **A new flying domain.** Birds fly over land and water, and rest and nest on land.
- **Roles:** seed and fruit eaters, insect eaters (eating bugs), fishing birds (catching small fish in shallow water), raptors (hunting small land animals and birds) and carrion birds (vultures move here from the land scavengers).
- **Flight:** fast travel and long sense range, paid for with a higher metabolism and a small body size cap.
- **(+) Seasonal migration:** birds fly toward warmer latitudes in winter.
- **Designs:** sparrow, parrot, duck, heron, owl, hawk/eagle, crow, vulture and gull. The existing `owl`, `hawk`, `crow`, `chicken` and `vulture` icons move from the mammal variant lists to birds.

### 1.6 Nutrition and body condition
- **Food contents:** every food (grass, fruit, seeds, bugs, meat, fish, carrion and litter) carries protein, energy, fibre and minerals.
- **Needs** depend on diet, class and size. Deficiency slows growth, lowers fertility, weakens immunity and makes eggs fail.
- **Overeating stores fat.** Fat carries animals through winter and migration, but overweight animals are slower, easier to catch and more disease-prone. An appetite gene lets lineages evolve to be lean or heavy.
- **(+)** A body condition stat, and fat animals drawn wider.


### 1.7 Hibernation, dormancy and torpor
- Animals sleep through winter on their fat stores: mammals hibernate, reptiles and amphibians brumate, and snails and amphibians aestivate in drought.
- Seeds, eggs and bug swarms can also wait out bad seasons.

### 1.8 Social structure and communication
- **Alarm calls:** prey warn their own kind, and birds act as sentinels for all.
- **Dominance and dispersal:** ranks inside herds and packs decide who eats and mates first, and low-ranked animals leave to found new groups.
- **Sociality gene:** sets how solitary or colonial a lineage is, trading safety against food competition and disease.

### 1.9 Life history and aging
- **Reproduction:** a trade-off between many cheap young and a few cared-for young, plus parental care time.
- **Life stages:** tadpole-to-frog metamorphosis and larval stages, and young that eat bugs before they can hunt.
- **Elders** lead migration and find water in drought.

### 1.10 Symbiosis and coevolution
- Cleaner birds and fish, matched pollinator and flower pairs, animal seed dispersal and mimicry of toxic species.

### 1.11 Intelligence and learning
- A costly brain gene. It gives memory of water, food and danger, learned predator avoidance, learning from parents, and tool use in a few lineages.

### 1.12 Natural disasters and succession
- **Wildfires** start from lightning in dry seasons and spread with fuel, wind and slope. Water, rock and fresh burns stop them. They clear plants, return ash to the soil, and kill or scatter animals.
- **Floods, severe droughts and windthrow** (storm-felled trees) also clear ground.
- **Succession:** pioneer plants move into the cleared ground, followed by shrubs and then trees. A fire-adaptation plant gene evolves where fires are common, and new species can arise in the open niches.
- **(+)** A Disasters map view and stat card, fire fronts with smoke, burn scars that fade as plants regrow, and an options toggle.

---

## Part 2: Balance and design

1. **Balance pass** covering all the v2 leftovers: speciation that actually produces a readable family tree, disease resistance that rises under pressure, land scavengers that find carrion, the plant cover and tree/grass targets, and the new Part 1 systems.
2. **Better graphics:** sprite and terrain polish, clearer elders and juveniles, and storm rain readable in the Rainfall view.
3. **Greatly enhanced world generation:** continents and islands, mountain ranges with rain shadows, better coastlines, river deltas and lake systems.
4. **More biomes**, for example mangrove, cloud forest, salt flat, steppe, tundra bog and coral reef, each with its own plant and animal pressures.
5. **Biome adaptation:** stronger, biome-specific selection, so desert, tundra and rainforest lineages end up looking and behaving differently.
6. **Performance:** profile and speed up the hot loops in animals, plants and bugs. Smaller save files come with this.
7. **Compute (started early, alongside Part 1):** the sim runs in a Web Worker, plus an optional WebGPU fast mode for grid layers. See `compute/plan.md`.
8. **Plant life (slice A):** annual, biennial and perennial life cycles; deciduous versus evergreen leaves; evolving flowering, fruiting and seed-release timing; autumn colour and blossom on the map; four vertical layers (emergent, canopy, shrub, ground) with a height gene; vines and epiphytes on host trees; clonal spread by runners and rhizomes; plant speciation with a plant family tree and species detail.
9. **Plant strategies (slice B):** succulents, cacti and heat-adapted grasses; nitrogen fixers that enrich soil; carnivorous bog plants that eat bugs; parasitic plants on host trees; allelopathy; thorns versus toxins and induced defences; kelp forests, seagrass meadows, plankton and algae blooms that crash oxygen; forests that cool their area and add rainfall; leaf litter, peat and roots that stop erosion.
10. **Performance and world generation update 2:** better world generation; enough speed to allow larger worlds; five more new biomes.
11. **Bodies of water:** depth shown on river, lake and ocean tiles; aquatic animals with preferred depths; omnivore fish; river deltas; salt versus fresh water; more variety of water plants.
12. **Secrets:** a nuclear biome and a magic biome, each with a 0.5% chance of appearing on a seed. Both are cosmetic: they give the founding animals there a unique texture.
13. **Overpopulation control:** stop runaway species, for example founder fish that reach 2,000 and never decline. Candidates are density-dependent disease, crowding stress on breeding, and predators and parasites drawn to abundant prey.
14. **Plant and animal toxins:** split toxicity into types that vary between plants and animals: poison (hurts or kills), neurotoxins (psychedelic and stimulant), and genotoxins.
15. **Day and night cycle with sleep:** light drives plant growth; animals evolve diurnal, nocturnal, crepuscular or cathemeral activity, and sleep in their off hours.

Items 8 and 9 run after items 1–6. Items 10–15 run after the plant slices, in that order, and before Part 3. Any change to plant or soil stepping must be mirrored in the WebGPU fast mode (`js/gpu`).

## Part 3: God tools

A tool palette on the map. The slices, scopes and gates are in [part3/plan.md](part3/plan.md). Examples:
- Spawn animals or plants of a chosen species, or design a new species from sliders.
- Paint terrain, water, biomes, temperature and moisture.
- Disasters: start the slice 11 fire, flood or drought by hand, plus meteor, disease outbreak and plague of locusts.
- Bless or curse: feed, heal, sterilise or cull an area or a species.
- Time controls: rewind to the last autosave, and snapshots.



---

## Decisions (Part 1)
1. **Real classes:** Fish, Amphibians, Reptiles, Mammals, Birds and Invertebrates. Sharks are fish, sea turtles are reptiles, seals and orcas are mammals, and crabs are invertebrates.
2. **Tabs:** one Animals tab with class filter chips replaces Land and Water.
3. **Birds:** all five roles and seasonal migration in Part 1.
4. **Class is fixed per lineage.** The cold-blooded gene is clamped to each class's range.
5. **Invertebrates are a full class:** urchins, octopuses, jellyfish, land snails and spiders join the crabs, and the class card also shows bug swarms.
6. **Bugs and diseases tie into every slice:** host classes for strains, insect birds, bird-borne outbreaks, nest parasites, shared-den spread, and sick animals showing dull displays (honest signals).
7. **Nutrition is slice 5:** food contents, nutrient needs, and fat from overeating, after nests and packs.
8. **More behaviour slices 6–10:** hibernation and dormancy, social structure, life history, symbiosis, and intelligence, each as its own slice in that order.
9. **Natural disasters are slice 11:** wildfires, floods, droughts and windthrow arise from the weather and clear ground for succession and new species. Part 3's disaster tools reuse the same code.
