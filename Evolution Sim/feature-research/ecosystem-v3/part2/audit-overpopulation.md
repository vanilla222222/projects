# Audit: Overpopulation control (roadmap item 13)

Base commit ba29de3. Commits: b858b0c, 7516f05, plus the commit that adds this audit.

User report: "some species overpopulate heavily, is there a way to slow this down some founder fish will get populations of 2k and will never die out".

## Measurement method

- Headless runs on a 320x210 world, seeds 42, 7 and 123, 3000 ticks each.
- From tick 500, the run takes a census every 100 ticks, giving 26 samples per run.
- Each sample records:
  - the largest animal species overall
  - the largest species in each class
  - the highest within-class share held by any species with at least 60 individuals
- A sample is a violation if the top species has more than 800 individuals, or if any species holds more than 35% of its class.

## Before (ba29de3)

| Seed | Peak top species | Mean top pop | Samples > 800 | Peak share | Founder share of animals at t3000 |
|---|---|---|---|---|---|
| 42 | Abyssilepis (invert, founder) 3147 | 1647 | 23 / 26 | 0.93 | 0.895 |
| 7 | Squamodonta (fish, founder) 1198 | 884 | 19 / 26 | 0.998 | 0.866 |
| 123 | Nautidonta (invert, founder) 2122 | 795 | 9 / 26 | 0.95 | 0.918 |

At base, founders hold around 90% of all animals after 3000 ticks. Each seed logged exactly one animal speciation across the whole run. On seed 7, Squamodonta held 97% to 99.8% of all fish from tick 1500 to tick 3000.

Top five at t3000, before:

| Seed | Species (class, origin, population, class share) |
|---|---|
| 42 | Abyssilepis (invert, founder, 2908, 0.70); Noctofelis (invert, founder, 1168, 0.28); Noctaceros (mammal, founder, 480, 0.59); Rufieodon (amphib, migrated, 299, 0.52); Veloasorex (amphib, founder, 268, 0.47) |
| 7 | Rufiomys (invert, founder, 1100, 0.79); Squamodonta (fish, founder, 925, 0.97); Micridorcas (reptile, founder, 373, 0.56); Stennoceros (mammal, founder, 275, 0.39); Rufiepus (mammal, founder, 263, 0.38) |
| 123 | Nautidonta (invert, founder, 1018, 0.87); Squalilepis (fish, founder, 441, 0.50); Rhinalepis (fish, founder, 402, 0.46); Umbreceros (reptile, founder, 317, 0.70); Cursoripus (mammal, founder, 226, 0.37) |

## What was built

### Dominance factor

Every tick, `AnimalPool._census()` counts live animals per species and per class. It then gives each species a dominance factor d between 0 and 1. d is the largest of three terms:

| Term | Formula | When it starts | When it reaches 1 |
|---|---|---|---|
| Absolute population | (p - 300) / 700 | 300 individuals | 1000 individuals |
| Class share | (share - 0.3) / 0.4 | share above 0.3 | share of 0.7 |
| Class crowding | (class total - 1800) / 1800 | class total above 1800 | class total of 3600 |

- The class-share term is ramped in from 60 to 240 individuals, so small bird niches and other rare species are never touched.
- The class-crowding term is scaled by min(1, (p - 60) / 300). It stops a class that has split into many mid-sized species from running away as a whole. In the first tuning run, seed 42 invertebrates reached 6400 and pushed amphibians down to 1.
- Species below 60 individuals always have d = 0.

d is recomputed from live animals at the start of every animal step, so save and load is exact. The arrays are lazily allocated, and old saves without them work.

### What d drives

All of these are deterministic and use the existing sim RNG.

- **Crowding stress.**
  - Metabolic cost rises by up to 20% of the m^0.75 base.
  - Breeding is refused with probability up to 0.5 × d × local crowding. Local crowding is same-species neighbours in the grid cell divided by 6, so stress is strongest where the species is densest.
- **Predator switching.**
  - Prey from dominant species look up to 40% closer when a predator chooses a target.
  - Catch chance against them rises by up to 30%.
- **Density-dependent disease.**
  - Same-species contact exposure is multiplied by (1 + d).
  - New animal diseases emerge in dominant species up to 4× more often: the emergence weight is population × (1 + 3d).
- **Range splits (speciation pressure).**
  - Every 20 ticks, during `refreshSpeciesMeans`, the largest eligible species may split, with probability 0.3.
  - A species is eligible when all of these hold:
    - it is at least 600 ticks old
    - it has 500 or more individuals, or 150 or more and at least 45% of its class
    - its range has a standard deviation of at least 16 tiles along its major axis
  - The animals past the centroid on that axis become a new daughter species, created with their mean genome. Each side must hold at least 25% of the species.
  - The log reads "X split from Y as its range spread", and `stats.social.rangeSplits` counts these events.
  - This is how founders get replaced by descendants.
- **Fresh-water relief.** In fresh-water tiles, the metabolic part of the dominance cost is multiplied by (1 + salt preference) for water animals. A dominant salt-adapted fish pays up to double for sitting in a river, which leaves room for fresh-water species.

No new classes and no renderer grids were added. Plant and soil stepping is unchanged, so `js/gpu/` needed no mirror.

## After

| Seed | Peak top species | Mean top pop | Samples > 800 | Peak share | Founder share at t3000 | Range splits | Animal species at t3000 |
|---|---|---|---|---|---|---|---|
| 42 | Noctofelis (invert, founder) 1075 at t1700 | 532 | 3 / 26 | 0.977 (amphib, 128) | 0.167 | 17 | 62 (base 42) |
| 7 | Glaucilepis (fish, range split) 596 | 414 | 0 / 26 | 0.951 (fish, 309) | 0.389 | 11 | 52 (base 38) |
| 123 | Pelagaselachus (invert, range split) 811 | 456 | 1 / 26 | 0.829 (amphib, 218) | 0.302 | 15 | 57 (base 37) |

Mean worst within-class share: 0.794 → 0.675 on seed 42, 0.953 → 0.622 on seed 7, and 0.861 → 0.658 on seed 123.

Top five at t3000, after:

| Seed | Species (class, origin, population, class share) |
|---|---|
| 42 | Cursorodorcas (invert, split, 733, 0.16); Longimys (invert, split, 469, 0.10); Megaeraptor (invert, split, 402, 0.09); Nautanectes (invert, split, 377, 0.08); Rhinopterus (invert, split, 357, 0.08) |
| 7 | Coralasoma (fish, founder, 472, 0.27); Umbreceros (invert, split, 364, 0.21); Undaselachus (fish, split, 325, 0.19); Serralepis (invert, split, 299, 0.17); Rufiepus (mammal, founder, 278, 0.32) |
| 123 | Pelagarhynchus (invert, split, 580, 0.24); Tardicyon (invert, split, 365, 0.15); Micramys (invert, founder, 291, 0.12); Coralodonta (fish, split, 282, 0.26); Squamiselachus (invert, split, 249, 0.10) |

The seed 7 founder fish Squamodonta, which held 1073 individuals and 99.8% of fish at base, now peaks at 309 and loses its class to its own range-split descendants. By t2000, the largest fish species holds 23% of fish.

## Gates

| Gate | Result |
|---|---|
| All 6 animal classes alive on all seeds (minimum from t500) | Pass. 42: fish 128, amphib 101, reptile 80, mammal 235, bird 100, invert 309. 7: 268 / 12 / 67 / 166 / 68 / 144. 123: 287 / 99 / 178 / 467 / 86 / 185. |
| All 5 bird niches alive | Pass. Minimum seed / insect / fisher / raptor / carrion: 42: 15 / 14 / 7 / 5 / 9. 7: 8 / 11 / 1 / 3 / 10. 123: 9 / 10 / 4 / 3 / 12. |
| Save at 1500, load, step 500 identical (seed 42) | Pass. Hashes match at load and after 500 steps. |
| Old saves load and step | Pass for the gen 4 save (older code), the gen 2 seed 42 save and the gen 3 seed 7 save. |
| SAVE_VERSION | Unchanged at 2. |
| ms/tick ≤ +5% | Mixed; see below. |

### ms/tick

These are paired runs, two processes at a time.

| Run | Base | New | Change | Live animals at end, base → new |
|---|---|---|---|---|
| Seed 42, 1000 ticks, after t300 | 26.44 | 26.58 | +0.5% | similar |
| Seed 7, 3000 ticks, after t300 | 22.75 | 24.77 | +8.9% | 3851 → 4949 |
| Seed 123, 1500 ticks, after t300 | 27.16 | 29.51 | +8.7% | 2534 → 3165 |

The regulation code itself is cheap: one O(n) census per tick plus a few array reads per animal. Where population totals match (seed 42), the cost is +0.5%. On seeds 7 and 123, the more diverse community supports 25% to 28% more animals in total, and the extra time comes from those extra animals. Time per animal goes down. Strictly, the +5% gate is exceeded on those two seeds.

## Open issues

- **The 35% share target is not met in classes with few species.** Amphibians, reptiles and small fish classes often hold only 2 to 4 species of any size. One of them still ends up above 35% even under full pressure and repeated splits. The absolute target (no species above about 800 for long stretches) is met: 3, 0 and 1 samples out of 26, against 23, 19 and 9 at base.
- **ms/tick is +9% on seeds 7 and 123**, caused by higher total biomass rather than code cost. If this matters, lower `maxAnimals` or the DOM_CLS threshold (1800) so that class totals stay closer to base.
- **Seed 7 fisher birds dipped to 1** at their minimum (base: 6). The niche survived, and fisher birds are never regulated directly because their populations sit below 60. This needs a look across more seeds.
- **Seed 42 invertebrates still total about 4700** at t3000 (base 4098), spread over many range-split species. No single one exceeds 800 by the end.
- **Fresh-water fish species stay at 0 to 1** per run. The relief helps but does not create a fresh-water fauna on its own.
