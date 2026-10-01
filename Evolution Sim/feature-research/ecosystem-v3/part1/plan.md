# Part 1 plan: behaviour, taxonomy and birds

Source: roadmap Part 1, with the decisions below.
- No code comments anywhere (house style).
- Polish the current look rather than redesign it.
- Gates: the roadmap gates, plus the per-slice targets below.

## Decisions
1. **Real classes.** Fish are fish. Sharks are fish, sea turtles are reptiles, seals and orcas are mammals, and crabs and lobsters form an **Invertebrates** class. That gives six classes: Fish, Amphibians, Reptiles, Mammals, Birds and Invertebrates.
2. **Tabs:** Land and Water merge into one **Animals** tab with class filter chips.
3. **Birds:** all five roles (seed/fruit, insect, fishing, raptor, carrion) plus seasonal migration.
4. **Class is fixed per lineage.** It is inherited from the founder like the domain. The cold-blooded gene still mutates, but each class clamps it to its own range.
5. **A full invertebrate class.** Crabs get company in the water and on land (see 1b), and the Invertebrates card also shows the bug swarms.
6. **Bugs and diseases are part of every slice.** Each new system gets its bug and disease links (see "Bugs and diseases" in each slice).

## Slice order

**1 → 2 → 3 → 4 → 5.** All five slices edit `animals.js`, so they run in sequence.

| Slice | Content | Main files |
| --- | --- | --- |
| 1 | Genome groundwork and taxonomy (sim and UI) | `animals.js`, `ecosystem.js`, `main.js`, `index.html`, `css`, `charts.js` |
| 2 | Birds | `animals.js`, `ecosystem.js`, `icons.js`, `render.js` |
| 3 | Nests and dens | `animals.js`, `eggs.js`, `render.js`, `main.js` |
| 4 | Pack hunting and sexual selection | `animals.js`, `render.js`, `main.js` |
| 5 | Nutrition and body condition | `animals.js`, `plants.js`, `bugs.js`, `eggs.js`, `disease.js`, `ecosystem.js`, `render.js`, `main.js` |

---

## Slice 1: genome groundwork and taxonomy

### 1a. Genes (sim, neutral for now)
- `AG` goes from 15 to 19, with new genes `G_NEST` (15), `G_PACK` (16), `G_DISPLAY` (17) and `G_CHOOSY` (18), each with an `ANIMAL_WEIGHTS` entry.
- Every archetype gets values for the four new genes. Slices 3 and 4 give them their effects, so in this slice they mutate without doing anything.
- Every `AG`-strided loop is checked: the egg genomes in `eggs.js`, `childGenome`, `refreshSpeciesMeans`, the trait UI and the save test.
- `SAVE_VERSION` goes to 2. Old saves are refused with the existing "not supported" message.

### 1b. Class per lineage
- `ANIMAL_CLASSES = ['fish', 'amphibian', 'reptile', 'mammal', 'bird', 'invertebrate']`.
- A class index is stored on the species (`sp.cls`), and per animal in a new Int field `cls`.
- **Founders:** each archetype gets a `cls`. Current mapping:
  - land herbivores, omnivores, predators and the land scavenger → mammal;
  - the four reptile founders → reptile;
  - the four amphibian founders → amphibian;
  - water grazers and both water predators → fish;
  - the crab → invertebrate.
- **(+) New water founders** so the water classes exist from the start:
  - a sea turtle (reptile, water grazer);
  - a seal (mammal, water predator).
- **New invertebrate founders**, to live alongside the crab:

  | Domain | Role | Category | Designs |
  | --- | --- | --- | --- |
  | water | grazer | `urchin` (grazes algae and kelp, slow and armoured) | sea urchin, sea snail, clam |
  | water | scavenger | `crab` (existing) | crab, lobster, hermit crab, shrimp |
  | water | predator | `octopus` (small, fast, sense-heavy; eats small fish and crabs) | octopus, squid, starfish |
  | water | drifter predator | `jelly` (moves with little control, stings with a toxin, cheap metabolism) | jellyfish |
  | land | grazer | `snail` (slow and tiny; eats litter and seedlings, needs wet ground) | snail, slug |
  | land | predator | `spider` (tiny, eats bugs from swarms, ambush-hunts small animals) | spider, scorpion, centipede |

  - **Invertebrate rules:** no thirst on wet tiles, cold-blooded (gene ≥ 0.5), a size cap of 0.45 (`INVERT_SIZE`), and large egg clutches (they always lay eggs).
  - **Icons:** `snail`, `squid`, `starfish`, `shrimp`, `lobster` and `hermitcrab` already exist. New ones are added: `octopus`, `jellyfish`, `urchin`, `clam`, `slug`, `spider`, `scorpion` and `centipede`.
  - **(+) Bug eaters:** spiders take density from the pest and parasite swarm planes through the existing bug-eating path, with a higher bug efficiency. Snails speed up litter turnover.
- **Inheritance:** children and new species inherit `cls`. The cold gene is clamped per class: reptiles, amphibians, fish and invertebrates ≥ 0.5; mammals and birds ≤ 0.45.
- **Categories and icons:** `animalCategory` keys off class and domain. Icon variants are filtered by class, so seals and orcas only appear on water mammals, and turtles only on reptiles.

### 1c. Stats
- `STAT_GROUPS` becomes one entry per class: `fish`, `amphib`, `reptile`, `mammal`, `bird` and `invert`.
- New `stats.roles[cls]` holds `{herbivore, omnivore, carnivore, scavenger}` counts per class.
- History keys: one per class, plus `roles.<cls>.<role>` series so the expanded cards get sparklines.
- Migration and revival logic still guards each role inside each class, with the same thresholds as today's groups.
- Merge pass: species merge only within the same class.

### 1d. UI
- **Class stat cards:** six cards, each with an icon, the count and a sparkline.
  - Clicking a card expands it to show four role rows (Herbivores, Omnivores, Predators, Scavengers), each with a count and a mini sparkline.
  - Roles with 0 animals are hidden.
  - The expanded state is stored like the collapsible cards.
- **Population chart and legend:** six class lines plus Plants and Bugs.
- **Tabs:** Plants, Animals, Bugs, Disease and Events.
  - The Animals tab has a chip row (All, Fish, Amphibians, Reptiles, Mammals, Birds, Invertebrates) with per-class counts.
  - The tab count is the sum of the classes.
- **Species detail:** a Class line (for example "Mammal · predator") next to Habitat.
- **Help:** updated for the new cards and tabs.
- **Invertebrates card:** it gets a fifth row, **Swarms**, showing total bug density and live bug species from `stats.bugs`. Clicking it opens the Bugs tab. The bug layer stays a density field and is not turned into individual animals.

### 1e. Bugs and diseases (slice 1)
- **Disease host range by class.** Strains get a host-class affinity: a strain's `hostCls` bitmask is set at emergence from its first host's class.
  - Host jumps to another class are rarer (`JUMP_CLS_K`) than jumps within a class. Strains that manage one are logged as "jumped from mammals to birds".
  - Invertebrates can only catch invertebrate strains, which keeps crabs and snails from becoming universal reservoirs.
- **Pathogen detail:** a Hosts-by-class line (for example "Mammals 80% · Birds 20%").
- **Disease tab:** each strain's row shows its main host class as a chip.

### Slice 1 targets
- Every new invertebrate role (water grazer, water predator, drifter, land grazer and land predator) is alive at 3000 ticks on all three seeds.
- Disease still causes 5–15% of animal deaths (the v2 band).
- The balance gate is met for all six classes and their starting roles.
- With no new behaviours yet, the populations stay close to v2: each existing group within ±25% at 3000 ticks on seed 42.
- Save/load stays byte-identical.

---

## Slice 2: birds

### Flying domain
- Domain 3 with walk bit 8: birds can be over any tile.
- **Resting:** birds can only rest, breed and nest on land tiles with plant cover, or on beach and cliff tiles.
- **Flight cost:** a higher base metabolism (`FLY_META`) and a body-mass cap (size gene ≤ 0.6).
- **Movement:** fast and with long sensing. Water and terrain don't block them.
- **Thirst:** they drink from any fresh water tile they fly over.

### Roles (founders, each with `cls = bird`)

| Role | Diet | Designs |
| --- | --- | --- |
| Seed/fruit bird | Fruit and seeds; carries seeds farther than mammals | sparrow, parrot |
| Insect bird | Eats bugs (reuses the small-omnivore bug path, with a better bug efficiency) | swallow, (crow) |
| Fishing bird | Catches small fish (size < 0.35) in shallow water tiles near shore | heron, gull, duck |
| Raptor | Hunts small land animals and smaller birds | hawk, eagle, owl |
| Carrion bird | Carrion, found from the air with a long sense range | vulture |

- **Vultures move to birds.** The land scavenger founder becomes a hyena/jackal mammal.
- **Predation rules:** birds can be caught by land predators only while resting on the ground. Raptors can hunt birds in the air.

### Migration
- When the season is cold and a bird's tile is below its preferred temperature, its target is pulled toward warmer latitudes, at most `MIGRATE_RANGE` tiles.
- In spring it flies back toward its nest or den home (slice 3 adds the home). A "Migration" event is logged once per species per year.

### Look
- **New icons:** sparrow, parrot, swallow, heron, gull, duck and eagle. The existing owl, hawk, crow and vulture icons move out of the mammal variant lists, and `chicken` becomes a ground bird variant.
- **Sprites:** birds are drawn above everything else, with a soft offset shadow on the ground.

### Bugs and diseases (slice 2)
- **Insect birds** eat swarms directly (pest, pollinator and locust planes) with a higher bug efficiency than mammals. Locust outbreaks become food bursts for birds.
- **Bird-borne disease ("avian flu").** Birds carry strains far, and migration can seed outbreaks in distant regions.
  - Birds use the existing contact spread, plus a small chance per tick (`BIRD_DROP_K`) to leave strain exposure on the carcass/vector plane under their flight path.
  - The Disease view shows these exposure trails.
- **Fishing and carrion birds** pick up strains from what they eat, through the existing prey and carcass exposure paths.

### Slice 2 targets
- All five bird roles are alive at 3000 ticks on all three seeds.
- Birds make up 5–20% of animals.
- Mammal and fish counts do not fall by more than 30%.
- Migration is visible: the mean bird latitude shifts across the seasons.
- ms/tick grows by at most 15%.

---

## Slice 3: nests and dens

### Home site
- Animals with `G_NEST > 0.4` pick a home when they mature, reusing the territory home fields `hx/hy` when the animal has no territory.
- **Site rules:**
  - birds: a canopy plant;
  - reptiles: a warm, dry, open tile;
  - amphibians: a shallow fresh water edge;
  - mammals: cover or rough ground (a den);
  - fish: a shallow spawning ground.
- Before breeding, the animal walks home.

### Nests (egg layers)
- Eggs are laid at the home tile (this replaces `_eggTile` for nesters).
- **Guarding:** while a parent is within `GUARD_R`, egg predation needs an attack roll against the parent's size. Unguarded nests can be raided.
- **Egg lure:** egg eaters are drawn toward known nests, using the existing `EGG_LURE` path with the nest tiles cached.

### Dens (mammals)
- Young are born at the den and stay within `DEN_R` until they mature.
- At the den, juveniles take less storm and cold damage and are attacked less, through a cover bonus.
- Nesting costs energy (`NEST_COST` × gene), so it is an evolved trade-off.

### Map and stats
- **Map:** nests and dens get small icons (`nest`, `den`) at zoom ≥ 3.
- **Stats:** a Nests card showing active nests and dens, eggs per nest, and nest raids. It also gets history keys.

### Bugs and diseases (slice 3)
- **Nest parasites.** Parasite swarms (ticks and leeches) on a nest or den tile drain the eggs (they fail more) and the young (they lose energy). Cleaning behaviour comes from the nest gene: high nesters lower the local parasite density.
- **Disease in shared homes.** Animals sharing a den, and parents with eggs, get an extra contact-spread roll (`DEN_CONTACT`). Dens shelter animals from weather, but they help outbreaks spread.
- **Egg-borne infection.** An infected parent can pass its strain to eggs (`EGG_VERT_K`), which hatch sick.

### Slice 3 targets
- Egg loss rises into 10–40%, with nest raids as the main cause. This fixes the v2 miss.
- Juvenile survival is better for nesters than for non-nesters of the same class.
- The nest gene rises in at least one bird and one mammal lineage over 3000 ticks.

---

## Slice 4: pack hunting and sexual selection

### Pack hunting
- Predators with `G_PACK > 0.45` that see packmates (same species, within `PACK_R`) form a pack: the nearest high-energy adult leads, and the others follow it as in herding.
- **Shared target:** the leader picks the prey, and members within range join the attack.
- **Kill chance:** `chance × (1 + PACK_K × (n−1))`, capped. The prey mass limit grows with pack size, so packs can take large grazers.
- **Shared meat:** the meat is split among the members present, so per-member energy falls as `1/n`. Lone hunters keep a speed bonus.
- **Interaction with herds:** v2 herd safety is weaker against packs (`HERD_SAFE / sqrt(n)`).
- **Stats:** packs (count and mean size) on the Predators role row, plus history.

### Sexual selection
- `G_DISPLAY` is an ornament and `G_CHOOSY` a preference.
- **Mating:** in `_reproduce`, the mate is chosen from up to `MATE_SAMPLES` nearby same-species adults, weighted by display. A choosy animal refuses mates whose display is below `choosy × species mean display`, and waits (cool-down) instead of breeding.
- **Costs:**
  - display raises metabolism (`DISPLAY_COST`);
  - display raises the chance of being spotted by predators (`DISPLAY_SPOT`, shrinking the cover term);
  - choosiness costs time.
- **Look:**
  - The sprite tint gets more saturated with display.
  - At zoom ≥ 6, a small crest or plume mark grows with display.
  - Species detail gets Display and Choosiness traits, and a Display-over-time sparkline from the species history.
- **Events:** "<Species> evolved a showy display" when the species mean display crosses 0.7.

### Bugs and diseases (slice 4)
- **Honest signals (Hamilton–Zuk).** Infected animals and heavily parasitized animals show their display at reduced strength (`SICK_DISPLAY`), so choosy mates avoid sick partners. Resistance then gets selected through mate choice. This is a design-level fix for the v2 miss where disease resistance never rose.
- **Packs spread disease.** Pack members get the herd contact multiplier. Sick pack members slow the pack, and the leader prefers healthy followers.
- **Pack kills expose the whole pack** to the prey's strain, not just the killer.

### Slice 4 targets
- **Packs:** on all three seeds, at least one predator lineage forms packs (mean size ≥ 3), and pack kills of large grazers appear (prey mass > hunter mass × 1.5).
- **Sexual selection:** in at least one lineage per seed, mean display rises by ≥ 0.15 over 3000 ticks while choosiness is above 0.4. Display falls in at least one heavily hunted lineage.
- **Balance gate** holds for all classes and their roles.
- **Resistance:** in the most-infected choosy lineage, mean resistance rises from year 5 to year 35 on at least two of the three seeds.

## Slice 5: nutrition and body condition

### Food contents
- Every food type carries four nutrients: **protein**, **energy** (fat and sugar), **fibre** and **minerals** (calcium).
- A `FOOD_NUTRIENTS` table gives constant values per food type: grass, tree leaves and fruit, seeds, bugs, meat, fish, carrion and leaf litter. For example, grass is high fibre and low protein, fruit is high energy, bugs and meat are high protein, and fish is protein plus minerals.
- Plants take a small soil influence: fertile soil raises protein and minerals in grass and seeds.

### Needs and stores
- Each animal has small nutrient stores (`nProt`, `nMin`) in `AnimalPool` typed arrays. Eating fills them and metabolism drains them.
- Needs are set by diet, class and size: grazers digest fibre well, carnivores need more protein, egg layers need more calcium when breeding, and small animals drain faster.
- **Deficiency** (a store below `DEFICIT`) means slower growth, lower fertility, weaker immunity and, for egg layers short of calcium, a higher chance that an egg fails to hatch.

### Fat and overeating
- A `fat` store: energy eaten past satiety turns into fat at `FAT_EFF` instead of being wasted.
- Fat burns first when energy runs low, so it carries animals through winter, droughts, hibernation and bird migration.
- **Overweight** (fat above `FAT_HEAVY`): slower speed, a higher chance of being caught, higher metabolism and higher disease susceptibility.
- New `G_APPETITE` gene (`AG` goes to 20): high appetite eats past satiety and stores fat, low appetite stays lean. Cold climates and migrants should favour fat, and heavily hunted prey should favour lean.
- **Omnivores seek what they lack:** an omnivore short of protein weights bugs and meat higher, and one short of energy weights fruit and seeds higher.

### Bugs and diseases (slice 5)
- Bugs become a key protein source for insect eaters, birds and young animals.
- Parasite load drains the nutrient stores.
- Malnourished and overweight animals are both more susceptible (`MALNOURISHED_SUS`, `FAT_SUS`).
- Sick animals eat less, so stores fall during an infection.

### Look and stats
- **Body condition stat** in animal detail: lean, fit, heavy or obese, plus protein and mineral status.
- The species detail shows mean body condition and the share of deficient animals, with a sparkline from the species history.
- Fat animals are drawn slightly wider, and starving animals thinner.
- **Events:** "<Species> is suffering from protein deficiency" when over 40% of a large species is deficient.

### Slice 5 targets
- A mix of lean and fat animals on every seed. Mean fat is higher in cold biomes and in migratory birds than in tropical residents.
- Deficiency is visible in at least one lineage per seed, and appetite or diet shifts in response over 35 years.
- Calcium-related egg failures stay a minor cause of egg loss (under a quarter of losses).
- **Balance gate** holds for all classes and their roles. Save/load stays byte-identical. Per-tick cost grows by at most about 25%.

---

## Tests and gates (every slice)
- Headless runs on seeds 42, 7 and 123 for 3000 ticks, with ms/tick and the balance gate reported. Year-35 runs for slices 3, 4 and 5.
- Determinism: the save/load test stays byte-identical.
- A browser run with no console errors: cycle every view, expand every class card, use the Animals tab chips, and save and load.
- No new code comments (grep of the diff).
- Screenshots for each slice go in `feature-research/ecosystem-v3/part1/screenshots/`:
  - Slice 1: class cards, one expanded (`classes.png`).
  - Slice 2: birds over the map, and the migration shift (`birds.png`).
  - Slice 3: nests and dens zoomed in (`nests.png`).
  - Slice 4: a pack chasing a large grazer, and showy displays (`packs-display.png`).
  - Slice 5: fat and lean animals, and the body condition stat (`nutrition.png`).

## Docs
- **`CODE_REFERENCE.md`:** animals (genes, classes, birds, nests, packs, display, nutrition), ecosystem (class stats and roles), main.js (class cards, Animals tab) and save (version 2).
- **`complexities.md`:** animals.js stays at 9 or goes to 9.5; ecosystem.js and main.js notes updated.

## Out of scope (Part 2 or 3)
- Broad balance retuning beyond each slice's targets.
- Graphics overhaul, world generation and new biomes.
- God tools.
