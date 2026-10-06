# Slice 4.6 audit: caves and underground

## What was built

**World gen 9 (the new default)**
- `WG_GEN = 9`. The gen 9 pass is `_cavesV9` in `mapGenerator.js`. It runs after the gen 8 mountain pass.
- It adds CAVE_MOUTH tiles on karst hill and mountain ground: karst noise above 0.28, a cave chance of 0.3, and at least 7 tiles between mouths.
- Gens 2–8 are untouched, and their world hashes match base.

**Cave layer (`js/sim/caves.js`, `CaveLayer`)**
- **Chambers.** Every cave mouth grows 4–8 chambers.
  - Each chamber sits 2–3 tiles from an existing chamber of the same cave, on dry ground at hill level − 0.06 or higher.
  - Chambers are linked as a tree, stored as CSR (`lstart`, `links`).
  - The layout comes from a local `FastRng(seed + 1616)`, so it consumes no sim RNG and is rebuilt identically on load.
- **Pools.** A chamber is a pool with chance 0.35, or always when humidity is above 0.62.
- **`under` grid codes:** 1 passage (a straight line between linked chambers), 2 chamber, 3 pool, 4 mouth.
- **`near`** gives each tile within Manhattan distance 12 of a mouth that nearest mouth.
- **Darkness.** There is no light and no plants underground. Food comes from three per-chamber stocks:
  - `roots`: grow at 0.035 per tick, scaled by the plant biomass on the surface tile above (up to 2.5). Capped at 6.
  - `detr` (detritus):
    - It grows at 0.045 × (0.3 + wetness) per tick.
    - Mouth chambers grow it 2.2× faster, and pools 2.5× faster.
    - It is capped at 8.
    - Underground deaths also add their carcass to it.
  - `guano`: laid by roosting bats and decays by 0.996 per tick. Capped at 14.
- **Constant temperature.** A cave animal pays the climate cost of the surface temperature at its cave's mouth, not the seasonal value. That cost is scaled by the existing cave shelter factor, and the animal never pays thirst.
- **`census`** runs once per tick. It fills:
  - `occ`, the per-tile count of animals underground;
  - `cpop`, the per-chamber count;
  - a CSR list of animals per chamber (`cstart`, `citems`), used for mates and prey.
- **Burrows.** The `burrow` grid holds tunnel strength from 0 to 255. It decays by 0.85 every 50 ticks.

**Animals (`animals.js`)**
- **Two new genes:**
  - G_EYES (38) and G_PIGM (39), pigment. AG is now 40.
  - Old 38-gene genomes are padded to 0.7 for both (the new `AG_V5` pad path). The existing 36-gene path still applies first.
  - On gen 9, upkeep is multiplied by `1 + 0.05 × (eyes − 0.7) + 0.03 × (pigment − 0.7)`.
  - Vision range is scaled by `eyes + 0.3` when that is below 1.
- **Cave adaptation:**
  - Each child born underground loses 0.006 eyes and 0.006 pigment, on top of normal mutation.
  - Above ground, losing eyes costs vision, so only cave lineages drift toward blindness.
  - Blindness pays off in other senses: underground foraging and catch acuity is multiplied by `1 + 0.8 × (1 − eyes)`.
- **`ug` per-animal field.** 0 is the surface, 1 is resident in a chamber, and 2 is a hibernator in a mouth.
  - It is zero-filled for old saves.
  - Underground animals go into an extra spatial-grid cell that no surface range query reaches. Surface predators, avalanches and other surface hazards cannot touch them.
- **`_caveStep`** runs the whole underground life loop for ug = 1 animals: cost, dormancy, feeding, hunting, movement, disease recovery, nutrients, fat, death and breeding.
  - **Feeding:**
    - Detritus: full rate for animals with diet below 0.66, and 0.6× for carnivores.
    - Guano: land and amphibious animals with diet below 0.66.
    - Roots: diet below 0.5.
  - **Hunting:** carnivores (diet 0.5 or more) try 4 picks of smaller, other-species animals in the same chamber.
    - The base catch chance is 0.35, scaled by acuity and armour.
    - Roosting bats are never prey.
  - **Movement:** every 9 ticks, a hungry or crowded animal moves to a linked chamber. Fish and olms move only to linked pools.
  - **Breeding:** blocked when a chamber holds 14 or more animals. Mates come from the same chamber.
  - **Eggs:** none underground. Children are born live in the parent's chamber with ug = 1.
- **Bats (domain air, class mammal):**
  - **Awake.** They fly out at night.
    - Each tick they make 3 echolocation feeds.
    - A feed samples 8 tiles within 24 of the mouth and hunts the one with the most bugs plus half its fruit. Bats are insectivores, with fruit as a fallback that also disperses seeds through the existing fruit-bonus path.
    - If the forays bring in less than twice the upkeep, the bat also takes flying insects from the chamber's detritus.
  - **Roosting.** They sleep in torpor at `SLEEP_META × 0.4` and lay guano.
  - Bats with fat hibernate in winter through the normal mammal dormancy path. Underground dormancy costs 0.6× the normal amount.
- **Hibernation shelter (reuses the existing dormancy code):**
  - When a hibernator on the surface decides to go dormant within 12 tiles of a mouth, it walks to the mouth.
  - On arrival it becomes ug = 2 and hibernates out of reach of predators and weather, at 0.6× dormancy cost. It wakes and resurfaces as normal.
- **Burrowers.** Land animals of mass 0.36 or less with nest drive 0.45 or more dig every 8 ticks, adding 24 to `burrow` on their tile.
  - On a dug tile, weather exposure is multiplied by `1 − 0.5 × burrow`.
  - The attacker's catch chance is multiplied by `1 − 0.6 × burrow`. Each failed attack that the tunnel turns into a save counts toward `burrowSaves`.
- **Five archetypes (72–76, `CAVE_ARCH`)**, founded only when the cave layer exists (gen 9 or later) and placed straight into chambers:

| Archetype | Category | Notes |
|---|---|---|
| bat | bat | nocturnal insectivore flier, roosts and hibernates in caves; founded at 12 |
| blind cave fish | cavefish | pool fish, eyes 0.15, pigment 0.1 |
| olm | olm | pool amphibian, eyes 0.05, pigment 0.05 |
| cave cricket | cavecricket | detritivore and guano eater |
| cave spider | cavespider | ambush carnivore on crickets, with detritus as a fallback |

  - Categories come from the genes:
    - mammal + air → bat;
    - blind fish in water → cavefish;
    - blind amphibian → olm;
    - blind land invertebrate → cavecricket or cavespider, by diet.
  - Cave archetypes are skipped by migration and by the god design loop.
  - New icons `bat` and `cricket` were added; cave spiders and fish use the existing icons.
  - The gene inspector shows "Eyes" and "Pigment".

**Rendering (`render.js`, `index.html`, `simWorker.js`)**
- A new map mode, "Caves" (`under`), is added and is live-refreshed.
- In this mode:
  - The surface is dimmed to 32% grey.
  - Passages, chambers, pools and mouths get their own colours.
  - Occupied cave tiles glow amber in proportion to `occ`.
  - Burrows show brown on the surface.
- Underground animals are drawn only in Caves mode. Surface animals are drawn at 30% alpha there.
- Shadows are skipped for underground animals.
- Snapshot additions:
  - SNAP_STATIC: `caves.under`.
  - SNAP_GRIDS: `caves.occ` and `caves.burrow`.
  - `ug` rides along with the other per-animal arrays.

**Saves**
- SAVE_VERSION stays 2.
- CaveLayer is registered in the save:
  - Persisted: `guano`, `detr`, `roots`, `burrow` and the counters.
  - DERIVED and rebuilt on load: the chamber graph, `under`, `near`, `occ`, `cpop`, `cstart` and `citems`.
- Old saves:
  - They get `ug = 0` (zero-fill) and padded eye and pigment genes.
  - Gen 8 or older keeps `caves = null`, so every cave mechanic stays off.

## Gates (single combined run; gen 9 default; 3000 ticks)

| | seed 42 | seed 7 | seed 123 |
|---|---|---|---|
| All 6 classes alive at the end | yes | yes | yes |
| All 5 bird niches alive at the end | yes | yes | yes |
| Caves / chambers | 116 / 715 | 92 / 547 | 82 / 506 |
| Underground at the end | 655 | 570 | 562 |
| Hibernations in caves | 46 | 69 | 147 |
| Bat forays / guano laid | 40192 / 228 | 45498 / 277 | 45623 / 253 |
| Kills in caves | 134 | 92 | 123 |
| Burrow digs / burrow saves | 36582 / 200 | 21458 / 193 | 24622 / 171 |

**New archetypes: min–max over the run, then the count at the end**

| | seed 42 | seed 7 | seed 123 | Seeds alive at end |
|---|---|---|---|---|
| bat | 12–43, 16 | 14–52, 27 | 15–42, 23 | 3 |
| cavefish | 59–129, 105 | 23–100, 54 | 37–98, 57 | 3 |
| olm | 8–81, 10 | 14–63, 40 | 20–59, 36 | 3 |
| cavecricket | 312–698, 449 | 185–661, 304 | 223–569, 404 | 3 |
| cavespider | 54–142, 73 | 74–156, 143 | 33–145, 44 | 3 |

**Rescues:** none. No cave rescue was added, and cave archetypes are excluded from every migration path. All five cave categories show 0 rescues on all three seeds, so each persisted on its own.

**Mean eyes / pigment at tick 3000 (founders in brackets)**

| | seed 42 | seed 7 | seed 123 |
|---|---|---|---|
| cavefish (0.15 / 0.1) | 0.084 / 0.046 | 0.089 / 0.053 | 0.139 / 0.063 |
| olm (0.05 / 0.05) | 0.041 / 0.017 | 0.087 / 0.045 | 0.043 / 0.006 |
| cavecricket | 0.159 / 0.222 | 0.138 / 0.230 | 0.205 / 0.233 |
| cavespider | 0.112 / 0.252 | 0.162 / 0.261 | 0.157 / 0.248 |
| bat | 0.412 / 0.527 | 0.403 / 0.515 | 0.387 / 0.544 |
| all surface animals | 0.682 / 0.716 | 0.713 / 0.708 | 0.699 / 0.703 |

- Cave lineages keep losing eyes and pigment. Surface animals stay near the 0.7 pad.
- Bats lose less, because they spend part of each night on the surface.

**Speed (solo, 600 ticks, base 8690f09; base is gen 8, new is gen 9)**

| Seed | Base | New | Change | µs per animal (base → new) |
|---|---|---|---|---|
| 42 | 24.29 ms | 24.71 ms | +1.7% | 13.65 → 10.15 |
| 7 | 22.47 ms | 21.80 ms | −3.0% | 14.25 → 10.47 |
| 123 | 23.23 ms | 24.22 ms | +4.3% | 13.12 → 10.44 |

- Gen 9 carries about 35% more animals, because 500–650 of them live underground. The `_caveStep` path is cheap, so cost per animal falls.

**Reproducibility**
- World hashes for gens 2–8 match base: 28 of 28 (seeds 42, 7, 123 and 999).
- Secret seeds: secret rolls match base. Gen 9 marks 63 founders and logs 2 secret messages.
- Save at tick 1500, load, step 500: identical. The world is also identical straight after load.
- Old base saves load with identical worlds and run 600 ticks: gen 4 (seed 42), gen 3 (seed 7), gen 5 (seed 123) and gen 8 (seed 5).
- Two separate runs give the same hash.

**Browser** (port 8799, swiftshader):
- Loads gen 9 with seed 42, and the caves layer and `under` reach the renderer.
- Switching to Caves at tick 120 shows 1011 underground animals, plus the cave graph, the occupancy glow and burrows.
- Switching back to Biomes keeps the sim running (0 → 203 ticks).
- No console errors.

## Known issues

- **Bat numbers are low (12–52).** They are limited by the bug supply within 24 tiles of mountain mouths. Bats rely on the detritus "flying insect" fallback and on roost torpor; without them, bats starved within 200 ticks.
- **The olm on seed 42 dips to 8–10** in some stretches. It is pool-bound and shares pools with cave fish.
- **Cave temperature** is the surface base temperature at the mouth, with no seasonal swing, rather than a separate deep-rock value.
- **Gene RNG consumption changed for all gens.** Adding two genes changes RNG use in mutation, so gens 2–8 simulations do not replay base tick for tick. Only their world hashes are identical. All cave mechanics are gated off below gen 9.
- **No WebGPU kernel change.** Cave animals step on the CPU in all modes. The fast (GPU) mode was not re-smoked in this slice.
- **In Caves mode, plant cover still draws over the dimmed surface** when the Plant cover toggle is on.
