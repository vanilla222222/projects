# Part 4.2 audit: Ocean update 2

Base commit: 1d32e15. Branch commits: d001c9c, 83cd1b1, cf73e79, dff82e4, 3cc527c (plus this audit).

## What was built

### Gen 5 ocean biomes
- `TRENCH`, `VENTS` (hydrothermal vents) and `COLD_SEEP` are placed by `_oceanBiomesV5` in gen 5 worlds only. Gen 5 is now the default `WG_GEN`.
- Gens 2–4 go down their old code paths, so their world hashes are unchanged (gate below).
- The god tools treat the new biomes as deep ocean.

### Ocean plant layers
- Water tiles keep two plant slots: a surface layer (floating mats, sargassum) and a floor layer (kelp, seagrass, coral algae, chemosynthetic mats).
- Floor light falls with depth: `FLOOR_LIGHT0 - FLOOR_LIGHT_K * depth`, with a floor.
- Chemosynthetic mats (`chemomat`) ignore light. They thrive on vents (x1.8), cold seeps (x1.1) and barely survive in trenches.
- Marine snow (litter) settles to the sea floor in calm deep biomes.
- The WebGPU plant kernels carry the same light rule.

### Water depth levels for sea animals
- **Field:** each water animal has a level `lvl` (0 surface, 1 midwater, 2 sea floor). It lives in `ANIMAL_FIELDS_I`, so it is saved, snapshotted, and defaults to 0 for old saves. No new genes.
- **Level choice:** the preferred level comes from the existing depth gene (`<0.2` surface, `<0.45` mid, else floor).
- **Shallow tiles:** the level is capped by tile depth (`<0.15` surface only, `<0.35` up to mid).
- **Interaction rule:** animals only eat, fight, mate and contact (disease, social) others at the same or an adjacent level. Fisher birds can only take water animals above the floor.
- **Depth costs:**
  - temperature falls by `0.04` per level;
  - vision falls by `18%` per level, except for slow ambush fish;
  - changing level costs `m75 * 2 * |dlvl|` energy.
- **Feeding:**
  - surface animals over deeper water graze the surface layer;
  - floor animals graze the floor layer;
  - floor invertebrates eat marine snow, and water animals get 0.75 of the land litter energy from it.
- **Deep fidelity:** animals with a floor depth gene that are already in deep water will not step into tiles shallower than `gene - 0.25`. Deep founders are placed with a tighter misfit limit.
- **Renderer:** midwater animals are drawn at 0.82 alpha and 94% size; floor animals at 0.64 alpha and 88% size. The tooltip shows the level name.

### Ten marine archetypes

| # | Category | Class | Founders | Key genes | Activity | Niche |
|---|---|---|---|---|---|---|
| 36 | anglerfish | fish | 12 | depth 0.66, speed 0.3, diet 0.86 | cathemeral | deep floor ambush predator |
| 37 | ventshrimp | invertebrate | 28 | depth 0.56, diet 0.2 | cathemeral | grazes vent mats and marine snow |
| 38 | sardine | fish | 40 | depth 0.04, herd 0.88, size 0.1 | diurnal | surface school |
| 39 | flatfish | fish | 20 | depth 0.5, diet 0.5 | crepuscular | floor omnivore |
| 40 | deepeel | fish | 12 | depth 0.6, speed 0.5, diet 0.82 | crepuscular | deep hunter |
| 41 | tuna | fish | 12 | depth 0.3, speed 0.88, sense 0.65 | diurnal | fast midwater predator |
| 42 | manta | fish | 12 | depth 0.16, size 0.72, diet 0.06 | cathemeral | surface/mid plankton filter feeder |
| 43 | grouper | fish | 10 | depth 0.22, speed 0.32, size 0.6, diet 0.84, warm | crepuscular | reef ambush predator |
| 44 | lanternfish | fish | 32 | depth 0.5, size 0.12, diet 0.2 | nocturnal | daily migration |
| 45 | puffer | fish | 20 | depth 0.1, speed 0.22, toxic 0.75 (neurotoxin) | diurnal | slow, toxin-defended reef fish |

How each niche works:
- **Lanternfish:** a nocturnal fish with a mid/deep depth gene rises to the surface while its activity window is active (night), and sinks back by day. This uses the existing day/night activity tables.
- **Pufferfish:** uses the existing toxin genes (`FOUNDER_TOXIC`, `FOUNDER_TOXK`).
- **Grouper and anglerfish:** slow water carnivores get a minimum strike speed factor (0.7), so ambush works.
- **Categories and labels:** these come from the genome in `animalCategory`, so evolved descendants are classified the same way. Icons reuse existing sprites:

  | Category | Sprite |
  |---|---|
  | anglerfish, puffer | puffer |
  | deepeel | eel |
  | sardine, lanternfish | fish |
  | flatfish, manta | ray |
  | tuna | swordfish |
  | grouper | pike |
  | ventshrimp | shrimp |

- **Marine rescue:** every 240 ticks, any of the ten marine archetypes with no living member is reintroduced through the existing migration path ("... returned from the open sea"). This works like the existing bug reintroduction.

## Gate results

All runs are headless node with the gen 5 default on a 320x210 world for 3000 ticks.

### Batch 1
The four sim runs were in parallel on 4 cores: new 42, new 7, new 123 and base 42.

**Classes at 3000** (fish/amph/rept/mamm/bird/invert):

| Seed | Classes | All alive |
|---|---|---|
| 42 | 866/87/299/357/277/2472 | yes |
| 7 | 1099/100/844/500/109/1894 | yes |
| 123 | 1763/147/257/532/161/2419 | yes |

**Bird niches at 3000** (seed/insect/fisher/raptor/carrion):

| Seed | Niches | All alive |
|---|---|---|
| 42 | 26/181/21/26/23 | yes |
| 7 | 16/45/19/6/23 | yes |
| 123 | 36/71/31/10/13 | yes |

**New archetypes.** Each cell is the count at tick 3000, then [min–max] over ticks 100–3000, sampled every 25 ticks:

| Category | 42 | 7 | 123 | Alive on |
|---|---|---|---|---|
| anglerfish | 4 [0–43] | 6 [0–48] | 0 [0–40] | 2/3 |
| ventshrimp | 219 [4–370] | 41 [0–197] | 228 [7–502] | 3/3 |
| sardine | 82 [39–231] | 41 [0–140] | 38 [30–244] | 3/3 |
| flatfish | 17 [0–46] | 0 [0–59] | 16 [0–59] | 2/3 |
| deepeel | 4 [0–47] | 13 [0–48] | 5 [0–47] | 3/3 |
| tuna | 3 [0–46] | 0 [0–54] | 1 [0–41] | 2/3 |
| manta | 101 [16–299] | 33 [8–111] | 198 [34–237] | 3/3 |
| grouper | 6 [0–38] | 1 [0–35] | 2 [0–31] | 3/3 |
| lanternfish | 265 [6–265] | 143 [0–309] | 33 [0–139] | 3/3 |
| puffer | 0 [0–80] | 10 [0–102] | 8 [0–74] | 2/3 |
| fish class | 866 [171–866] | 1099 [182–1161] | 1763 [319–2129] | |
| fisher birds | 21 [1–49] | 19 [6–46] | 31 [3–52] | |

Result: every archetype is alive on at least 2 of 3 seeds at tick 3000.

**Water levels at 3000** (surface/mid/floor animals):

| Seed | Surface/mid/floor |
|---|---|
| 42 | 1056/593/120 |
| 7 | 1714/585/61 |
| 123 | 2008/653/30 |

**Speed (ms/tick):**
- Same 4-way parallel load, seed 42: new 31.83 vs base 32.78 (-3%).
- A solo run before the founder cut, seed 42 at tick 1500: new 24.3 vs base 22.4 (+8.5%). The founder cut in 3cc527c removed about 60 founders.
- The profile shows no single hotspot. The extra cost is spread across more species (`mutateGenes`, species means), water plant `capFor` (+0.2 ms/tick) and `_nearest` level checks. Treat the delta as roughly 0–8% depending on load and seed.

**Save/load (seed 42):**
- Encode at tick 1500 and decode into a fresh context: the hashes are identical (`0f729625de84a4c7`).
- After stepping 500 ticks, the live run, the loaded copy and a second independent load all hash to `2ee16fd4cdd63d08`. Pass.

### Batch 2 (misc)
- The default world gen is 5.
- Gen 2, 3 and 4 world hashes are identical to base for seeds 42, 7 and 123 (9 of 9).
- Secret seeds: 152, 543, 591, 1306, 276, 471, 972 and 49653 keep the same secret kinds (1,1,1,1,2,2,2,3). Their gen 4 worlds are identical to base, and gen 5 worlds keep the same kinds.
- Determinism: two independent contexts, seed 7, 400 ticks, both hash to `1a7e2d9c0f687b3c`. Pass.

### Batch 3 (old saves)
- **Saves written by base:** saves made by 1d32e15 at tick 300 (seed 42 gen 4, seed 7 gen 3, seed 123 gen 2) load in the new code.
  - The worlds are identical and every `lvl` defaults to 0.
  - Each runs 300 more ticks, then a re-save and load keeps lockstep for 100 ticks. All pass.
- **Old scratch files:** `evosim-42-y6.evo` is save version 1 and is refused the same way base refuses it. `evosim-42-y4.evo` crashes in `AnimalPool.step` (`zone` undefined) in both base and new, so this is not a regression from this slice.

### Browser smoke
Playwright Chromium (swiftshader), serving the worktree on port 8794, `index.html#42`:
- The world loads as gen 5 with 1207 trench, 133 vent and 215 cold seep tiles.
- It ran 0 to 197 ticks in 15 s. Water animal levels were 422/44/58.
- WebGPU is available, and Fast mode (GPU plants) switched on and kept ticking (311 to 348).
- There were no console errors.

## Known issues
- **Deep and big predators depend on the rescue.** Anglerfish, deep-sea eel, tuna, grouper, flatfish and puffer all hit 0 at some point on every seed (min 0), and the marine rescue brings them back.
  - Their populations boom and bust between about 0 and 50.
  - The tick 3000 counts are honest snapshots. Without the rescue several of them would be extinct by tick 3000.
  - The deep food web is thin. Vent shrimp and lanternfish are the main deep prey, and predators at density compete hard.
- **Sprites:** no new sprite art. The new categories reuse existing icons (see the sprite table above).
- **Speed:** the ms/tick delta is within noise under load but up to about 8% solo on seed 42. It comes from more marine species and water plants, not from one hotspot.
- **Old saves:** the marine rescue also runs in old gen 2–4 saves and worlds. Those runs gain the new marine archetypes, so their sim trajectories differ from base, while their world hashes do not.
- **Lanternfish timing:** migration follows the activity window of each fish's own genes, so evolved lanternfish with a shifted activity gene migrate at shifted times.
