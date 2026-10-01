# Ecosystem v2 roadmap

This roadmap covers four updates. Each one ships on its own, and the sim stays balanced, playable and verified with screenshots after every part. Items marked **(+)** are additions beyond the original request.

Every part follows the build-opus loop:
1. Scouts explore the code.
2. A `plan.md` is written, and it needs your approval.
3. Implementers make the changes, then write an `audit.md` and take screenshots.

Two gates apply to every part. Both are measured on seeds 42, 7 and 123 over 3000 ticks, with longer runs where a part's goals need them:
- **Performance:** per-tick cost may grow by at most about 25% per part.
- **Balance:** every trophic group that exists must still be alive after the run.

Leftovers from `feature-research/next-needs.md` are folded into the parts below.

---

## Part 1 — Design: new look and animal varieties

### 1.1 Better UI
- **Visual refresh** of the topbar, the side panels, the cards and the tabs, with consistent spacing, type sizes, colors and icon style.
- **Tab bar rework** so the six or more tabs never overflow. This fixes the leftover 3-digit tab overflow.
- **(+) Collapsible left-panel cards**, so the map can take more of the screen.
- **(+) Clearer species rows:** a bigger icon, the name, a small population sparkline and role chips.
- **(+) Light and dark themes** built on shared color tokens, following the system setting by default.

### 1.2 Better look (map)
- **Improved terrain shading:** hillshade relief, softer biome edges and animated water shimmer. A shimmer toggle is added if it costs too many frames.
- **Animal sprites on the map when zoomed in**, replacing the plain dots. The dots stay when zoomed out, for speed.
- **Bug swarms drawn as soft density clouds** instead of many dots. This fixes the leftover crowded swarm dots.

### 1.3 Design varieties: 5 per group
Each group gets 5 distinct icon designs. They are drawn in the species list and detail panel, and as map sprites when zoomed in. A species keeps its design for life; the design is chosen from its category and id, as today.

| Group | 5 designs (examples) |
| --- | --- |
| Predators | wolf, fox, big cat, weasel, bird of prey |
| Herbivores | rabbit, deer, bison, goat, tortoise |
| Omnivores | mouse, boar, bear, raccoon, crow |
| Scavengers | crab, lobster, hermit crab (water); vulture, hyena (land) |
| Fish | minnow, reef fish, eel, ray, shrimp |
| Sea predators | pike, shark, squid, seal, barracuda |
| Bugs | beetle, ant, moth, locust, mosquito/tick |
| Diseases | virus, bacterium, fungal spore, parasite worm, prion blob |
| Plants | 2 new designs for each of the 18 plant kinds (for example oak and birch trees, pine and cypress conifers, tulip and sunflower flowers, morel and chanterelle fungi) |

- **Scavengers.** The water scavengers are the existing crabs, the water omnivores. This part adds a land counterpart:
  - It eats carrion, gaining energy from carcass load on a tile rather than from hunting.
  - It gets its own category and icons, shared with the crab designs.
  - It is balance-gated like the other groups.
- **Visual style:** the current layout and dark style are kept and polished, not replaced.

---

## Part 2 — Disease and bug rebalance, slower speciation

### 2.1 Disease as a real threat
- **Stronger outbreaks.** Retune death chance, contact spread and the virulence trade-off.
  - **Target:** disease causes 5–15% of animal deaths.
  - **Target:** occasional epidemics that can halve a species.
- **Resistance that visibly rises** in species hit by repeated outbreaks. The resistance cost is retuned so selection wins.
- **Disease emergence on its own switch.** Emergence depends only on the Disease toggle, not on Migrations.
- **(+) Density dependence:** crowded herds spread disease faster. This ties into herd behaviour in Part 3.

### 2.2 Bugs crowd less
- Lower bug carrying capacity and stronger self-limiting, so swarms thin out.
- **(+) Locust swarms fixed.** They are planned but have never been seen in a run.
  - **Target:** rare, visible outbreak events rather than constant crowding.

### 2.3 Fewer new species
Right now year 35 can reach about 328 plant species and about 1000 strains. Speciation is made much rarer for every kind: plants, animals, bugs and strains.
- **Changes:**
  - higher speciation thresholds;
  - a minimum population and age before a lineage can split;
  - daughter-matching that absorbs drifting populations more readily.
- **(+) Tiny species are culled:** very small, short-lived offshoots are merged back into their parent instead of lingering as separate species.

**Goal:** new species appear far less often. There's no fixed cap. Success is measured as a large drop in speciation events and in living species at year 35, compared with the current build on the same seeds, and the plan reports the before and after numbers.

---

## Part 3 — Amphibians, reptiles, territory, herds, water, weather

### 3.1 Territory
- **Territorial behaviour gene.** It mostly evolves in predators and omnivores, and rarely in herbivores.
- **A territorial animal claims an area around a home tile.**
  - It chases away rivals of its own species and rivals of competing roles.
  - A territory grows with the animal's size, and holders get better feeding and breeding.
- **(+) Territory map view** showing claimed areas colored by species.

### 3.2 Amphibians
- **A new domain: amphibious animals.**
  - They live near water, moving between shallow water and wet land (high moisture, lake, river and pond edges).
  - They dry out and lose energy when they are too far from water.
  - They breed in water.
- **5 designs** (+): frog, toad, newt, salamander, axolotl.

### 3.3 Reptiles
- **Dry-habitat land animals** built on a dry-preference and heat-tolerance gene profile.
- **Cold-blooded:**
  - low energy cost;
  - slow when cold;
  - they thrive in deserts and badlands.
- **5 designs** (+): lizard, snake, tortoise, monitor, crocodile. Crocodiles overlap with amphibious behaviour.

### 3.4 Herds
- A herding gene: herbivores (and some fish, as shoals) move together.
- Herding lowers predation risk, but it raises disease spread and local grazing pressure.

### 3.5 Drinking
- **A thirst meter for every land animal.**
  - Animals drink from water tiles and from wet tiles.
  - Berries, fruit and prey blood give a little water.
  - Dehydration drains health and can kill.
- **Watering holes become key spots:** predators learn to wait near them, and herds travel to them.
- **(+) Dehydration** is added as a death cause in the stats.

### 3.6 Weather
- **Moving weather systems:** clouds, rain and snow (snow when cold).
- **Rain and snow raise tile moisture:**
  - Moisture feeds plant growth.
  - Animals can drink tile moisture.
  - Puddles and pools can form temporarily.
- **(+) Droughts:** long dry spells that shrink wet tiles and stress herds.

---

## Part 4 — New UIs

### 4.1 Family trees
- **An interactive tree** for any species, showing its ancestors and descendants.
- **Pan and zoom,** with extinct branches greyed out.
- **Click a node** to open that species.
- **Works for plants, animals, bugs and strains.**
- **(+) Whole-kingdom view** with a year axis, like a phylogeny chart.

### 4.2 Weather UI
- **A live weather overlay** on the map (clouds, rain and snow).
- **A weather widget** in the topbar showing current conditions and season.
- **A weather map view:** rainfall and moisture.
- **A weather switch** next to Seasons.

### 4.3 Anything else necessary (+)
- **Map views:** Territory (if it isn't done in Part 3) and Water/Thirst, showing drinkable water and dehydration.
- **Stat cards:** thirst and dehydration deaths, herd count and territory count.
- **Species detail:**
  - new traits: territorial, herding, thirst tolerance, cold-blooded;
  - a "Habitat" line: land, water, amphibious or dry.
- **Events** for droughts and storms, with a Weather filter.
- **Save and load world** to a file, so long runs survive a reload.
- **Help overlay** explaining the views, the controls and the keyboard shortcuts.

---

## Decisions
1. **Scavengers:** crabs are the water scavengers, and Part 1 adds a land scavenger.
2. **UI style:** polish the current look rather than redesign it.
3. **Speciation:** far less frequent, with no fixed caps.
4. **Save and load:** kept in Part 4.
