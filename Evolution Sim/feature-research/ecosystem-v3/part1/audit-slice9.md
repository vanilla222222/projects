# Audit: slice 9, symbiosis and coevolution

## What was built
- **Four new animal genes** (25 `G_CLEAN`, 26 `G_TOLER`, 27 `G_TOXIC`, 28 `G_MIMIC`; `AG` is now 29). Toxicity and mimicry raise metabolism a little. Some founders start as cleaners (two small reef or river fish and a small bird), some as toxic models, and some as mimics.
- **Cleaners:** water animals and non-fisher small birds with a high cleaner gene look for larger hosts of other species that carry parasites or disease (`_nearest` mode 5). A cleaning works with chance `0.3 + 0.7*tolerance`. When it works:
  - the cleaner gets food;
  - the host's parasite drain drops to ×0.2 for 60 ticks, and it skips vector exposure for that time;
  - the tile's parasite plane is halved;
  - a sick host's infection gets shorter;
  - strains can pass either way between cleaner and host.

  A failed cleaning chases the cleaner off, and a predator host may eat it. Cleaners ride on their host (state 9) between cleanings. A cleaner species that keeps cleaning one host species becomes its specialist (`cleanOf`). The specialist favours that host and the pair is logged as "X became a cleaner of Y".
- **Pollination:** bugs gain gene 9 `B_TONGUE` and plants gain gene 15 (flower depth, `PG` 16). For specialist pollinators, a tongue that does not match the flower depth lowers the match. On spread, the tongue drifts toward the target flower's depth. A bug species with at least 12 specialist, well-matched cells on one plant species gets `pollOf`, and the pair is logged as "X became a specialist pollinator of Y".
- **Seed dispersal:** every seed an animal plants is credited to its plant species (`animalSeeds`) and adds a little dung nutrient. Animal-dispersed species get up to 35% of eaten fruit back on the tile (`fruitBonus`).
- **Toxicity and Batesian mimicry:**
  - A predator that kills toxic prey loses energy. It learns a same-class hue aversion (`sp.preyAv`) and later skips or deprioritises prey of that look. Solo attackers sometimes spit toxic prey out.
  - Each class has a model, the toxic species with the largest population. Mimics shift their displayed hue (`lk`) toward the model's hue.
  - Each harmless look-alike eaten weakens the aversion, so mimic protection fades as mimics outnumber the model.
- **Disease links:** cleaning cuts parasite drain and vector exposure. Cleaners carry strains between hosts, using the existing `expose`. Pollinator collapse already cuts fruit through the existing `poll` to fruit target path, and that now reaches the fruit eaters and the dispersal bonus.
- **Stats and UI:**
  - A Symbioses card (cleaner pairs, specialist pollinator pairs, mimics, models, riding, cleanings, toxic bites, seeds sown by animals) with a sparkline.
  - Traits: Cleaner, Host tolerance, Toxicity and Mimicry for animals, Flower depth for plants, Tongue length for pollinators.
  - Species-detail rows: Avoids prey, Cleaner of, Mimic of and Pollinates.
  - Two new animal states, "cleaning" and "seeking a host".
- **Look:** at zoom 6 and above, riding cleaners are drawn small, on the host's back. Mimics carry a dot in the model's colour.
- **Not changed:** `PlantLayer.step` and the GPU path. All plant-side effects happen outside `step`, and the fast-mode merge keeps fruit and nutrient edits made outside `step`. SAVE_VERSION stays 2, and the new per-slot arrays and species fields are saved automatically.

## Gate (3000 ticks, new against base in the same batch)

| Seed | Build | ms/tick | fish | amph | rept | mamm | bird | invt | groups |
|---|---|---|---|---|---|---|---|---|---|
| 42 | new | 49.0 | 1625 | 187 | 578 | 1011 | 120 | 3742 | 25 |
| 42 | base | 44.6 | 739 | 385 | 556 | 1144 | 209 | 1299 | 25 |
| 7 | new | 49.2 | 1207 | 370 | 718 | 1344 | 103 | 2044 | 26 |
| 7 | base | 48.3 | 964 | 410 | 412 | 1710 | 166 | 2973 | 25 |
| 123 | new | 51.8 | 1759 | 389 | 890 | 1305 | 74 | 2474 | 25 |
| 123 | base | 47.8 | 1937 | 271 | 899 | 1378 | 275 | 1518 | 25 |

Bird niches, new (seed, insect, fisher, raptor, carrion):

| Seed | seed | insect | fisher | raptor | carrion |
|---|---|---|---|---|---|
| 42 | 7 | 90 | 2 | 2 | 19 |
| 7 | 15 | 49 | 4 | 5 | 30 |
| 123 | 12 | 23 | 11 | 3 | 25 |

Symbiosis results, new:

| Seed | cleaner pairs | pollinator pairs | mimic species (animals) | models | cleanings | parasite deaths (base) |
|---|---|---|---|---|---|---|
| 42 | 0 | 2 | 2 (157) | 2 | 2522 | 5 (2) |
| 7 | 1 | 1 | 1 (93) | 2 | 1890 | 11 (2) |
| 123 | 0 | 2 | 2 (180) | 2 | 972 | 24 (17) |

- **Speed:** +2% to +10%, inside the +25% limit.
- **Survival:** every class and every bird niche is alive on all seeds, but fishers and raptors are thin on seed 42 (2 each).
- **Pollination:** at least one specialist pollinator pair forms on every seed.
- **Mimicry:** mimics persist on every seed, and the models stay alive (2 models per seed).
- **Seed dispersal:** animal-sown seeds number 1.2k to 2k per run, and seed drops rise from about 3.7k to 3.6k–6.6k.
- **Save/load** (seed 42, save at 1500, 500 more ticks): stats, full state and RNG all match. The file is 15.4 MB.

## Open issues
- **Cleaner pairs** formed only on seed 7. Cleanings are frequent (1k to 2.5k), but they spread over many hosts and miss the 40% share rule on seeds 42 and 123. Next tuning candidates: lower `CLEAN_PAIR_SHARE` or raise `CLEAN_SPEC`.
- **Parasite deaths** did not fall compared with slice 8 (5, 11 and 24 against 2, 2 and 17). The counts are tiny, and births and deaths differ between runs. `protectedTicks` (43k to 117k) shows the drain cut is active, so the target is not met in these counts.
- **Strain carry** (`cleanCarry`) stayed at 0, because hosts with strains are rarely cleaned.
- **Prey aversion skips** are very high (0.9M to 1.4M scan skips). Birds fall on every seed (74 to 120, against 166 to 275), and fishers and raptors are thin on seed 42. Invertebrates rise on two seeds. The aversion could be narrowed further, or limited to scans by predators that have been hit.
- The model rule (largest population times toxicity) can switch models between refreshes, and `lk` then jumps.
- Old saves are not migrated for the new arrays, as in earlier slices. The year-35 run and the browser screenshot were skipped (test budget).
