# Slice 3 audit: nests and dens

Built on a4a45ef (slices 1 and 2). Gene 15 (`G_NEST`, which was unused) becomes the nest gene. Below `NEST_MIN` (0.4), an animal never settles. There are no new tile grids. Homes are per-animal (`home`, `nx`, `ny`), and nest eggs are flagged in the existing `EggPool`. The numbers below come from the headless harness at 3000 ticks on seeds 42, 7 and 123, against a4a45ef as the baseline.

## Files changed

- `js/sim/animals.js`:
  - **Constants.** `NEST_*`, `DEN_*`, `GUARD_*`, `CLEAN_K`, `FEED_*` and `EGG_VERT_K`. The founder nest genes are retuned: rabbit, fox and raptor are high; deer, bison and seal are low; birds sit between 0.35 and 0.55.
  - **New fields.** `nx` and `ny` are float fields (the home tile centre). `home` is an int field: 0 none, 1 nest, 2 den, 3 natal young. The meta cost gets a `(1 + NEST_COST * nest)` term. Walk bit 32 (rough ground) is set on hills, badlands, mountains and cliffs, and is used for den sites.
  - **`_site(i, j)`** scores a candidate home tile by class:
    - fish: shallow water;
    - amphibians: wet amphibious tiles;
    - birds: tall plants, then perches, then cover;
    - reptiles: warm, open, dry ground;
    - mammals: cover or rough ground;
    - others: cover.
  - **`_pickHome`, `_setHome` and `_dropHome`.**
    - Every `NEST_EVERY` ticks, a mature animal whose nest gene is above `NEST_MIN` joins a nearby same-species home (colonies or shared dens). Failing that, it samples `NEST_SAMPLES` sites within `NEST_RANGE`.
    - A home becomes a nest if the species lays eggs, otherwise a den.
    - A territory is re-centred on the home, and a bird's home latitude (`oy`) is reset to the nest row.
    - The home is dropped:
      - when the animal is more than `NEST_FAR` away;
      - when a bird migrates away;
      - when the site stops being valid;
      - when natal young mature.
  - **`_homeR(i)`** sets the leash: `GUARD_R` for a fed parent with eggs in its nest, and `DEN_R` for fed natal young. The leash replaces the territory in `_pickForage`. State 6 (heading home) is used when an animal goes back.
  - **Breeding.** Nesters breed only at home. A nest-layer lays on its nest tile, and reptile nest eggs are land eggs. A strain passes into the egg with chance `EGG_VERT_K`. Live-born young of a den parent start as natal (`home = 3`) at the den.
  - **Care.**
    - A fed parent at the nest registers its mass as the guard (`eggs.guard`).
    - A parent at home cleans parasites from the nest tile (`bugs.clean`).
    - Every `FEED_EVERY` ticks a parent passes spare energy to natal young within `FEED_R` (its own young, or young of a shared den).
    - Natal young at a den get cold shelter (`DEN_SHELTER`) and extra hiding cover (`DEN_COVER`).
    - Natal young at a den pay more parasite drain (`DEN_PARA`) and carry extra disease contact with den mates (`_denContact`, `DEN_CONTACT`).
  - **Nest raids.**
    - `_pickForage` checks the nest-egg cell index (`eggs.nestCell`) in the 3×3 grid cells around an egg eater, so nests draw raiders.
    - A raid that is repelled makes the raider flee (`_flee`).
- `js/sim/eggs.js`:
  - **New arrays.** `nst` (nest egg) and `str` (vertical strain) per egg. `guardM` and `guardT` per tile (the strongest guard this tick). `nestCell` per grid cell, rebuilt in `_compact`.
  - **New counters.** `raids`, `repelled`, `paraFailed`, `nestLaid`, `nestHatched`.
  - **Guarding in `eatAt`.** On a guarded nest, `eatAt` makes one roll per call: the raider wins with chance `mass / (mass + guard * GUARD_K)`. A repelled raid returns -1.
  - **Parasites.** Nest eggs fail from parasite load on the tile (`EGG_PARA`).
  - **Hatching.** Nest hatchlings start natal at the nest and catch the egg's strain.
- `js/sim/bugs.js`: `clean(i, f)` scales down the parasite density, total and `parasiteLoad` on a tile.
- `js/sim/ecosystem.js`:
  - `stats.nests` holds nests, dens, nesters, natal, nestEggs, eggsPerNest, raids, repelled and paraFailed. They are refreshed by `_nestStats()` on the species-refresh cadence.
  - `history.nests` and `history.dens` are new.
- `js/icons.js`: `nest` and `den` icons. The atlas now has 168 icons in 14 rows.
- `js/render.js`: `_pushHomes` draws one nest or den marker per home tile at egg zoom (`EGG_ZOOM`) and above, with `NEST_TINT` and `DEN_TINT`.
- `js/main.js`:
  - A "Nests & dens" stat card showing parents, young at home, eggs per nest, raids and raids repelled.
  - The tooltip shows "heading home" and the home kind.
- `CODE_REFERENCE.md` covers slices 2 and 3, and `complexities.md` is updated.

## Design

| Piece | Rule |
| --- | --- |
| Who nests | Mature, not thirsty, not fleeing, and nest gene > 0.4. The gene costs 6% meta per unit. |
| Nest vs den | Egg-layers get a nest. Live-bearers get a den: mammals on cover or rough ground. |
| Colonies | An animal joins the nearest same-species home if the site is valid. |
| Guarding | A parent with eggs in its nest, above 45% energy, stays within 3 tiles. The guard's mass ×(0.5+gene) ×3 resists the raider's mass. |
| Raids | Egg eaters are drawn to nest cells. A repelled raider flees. |
| Young | Hatchlings and den-born young stay within 4 tiles of home while fed. Parents feed them up to 80% energy (80% efficient). |
| Den costs | Den mates share contact disease and +100% parasite drain. |
| Nest hygiene | The parent cleans 3%×gene of the nest tile's parasites each tick at home. Nest eggs fail at 2%×load. |

## Test numbers (3000 ticks)

| Seed | ms/tick base → s3 | Animals | Egg loss base → s3 | Nests / dens | Nest eggs laid / hatched | Raids / repelled | Parasite fails | Revivals base → s3 | gateOk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 42 | 35.67 → 38.23 (+7%) | 5455 → 4585 | 18.1% → 18.3% | 247 / 64 | 4909 / 3266 | 1384 / 436 | 24 | 38 → 41 | true |
| 7 | 34.42 → 36.75 (+7%) | 4398 → 5325 | 23.1% → 21.6% | 305 / 126 | 4980 / 3395 | 1255 / 452 | 22 | 50 → 38 | true |
| 123 | 35.82 → 39.95 (+12%) | 6484 → 6559 | 20.7% → 17.4% | 291 / 170 | 5258 / 3833 | 1084 / 254 | 35 | 41 → 33 | true |

Nest-egg loss is 33% on seed 42, 32% on seed 7 and 27% on seed 123. Raids account for 84%, 79% and 76% of lost nest eggs.

**Juvenile survival, natal vs non-natal (class level):**

| Class | Seed 42 | Seed 7 | Seed 123 |
| --- | --- | --- | --- |
| bird | 0.587 vs 0.516 | 0.532 vs 0.454 | 0.576 vs 0.536 |
| mammal | 0.659 vs 0.702 | 0.796 vs 0.747 | 0.787 vs 0.801 |
| fish, reptile, amphibian | natal better | natal better | natal better |

- **Mammals.** At class level the mammal numbers are skewed by deer, which survive well and rarely nest. Within species, natal young survive better:
  - rabbit 0.821 vs 0.707 (seed 42);
  - boar 0.725 vs 0.274 (seed 42);
  - fox 0.496 vs 0.408 (seed 42).
- **Exceptions.** Wolf, raptor and wader natal young do worse. Wader natal survival is 0.07–0.17, against 0.20–0.32 for non-natal.

**Nest gene, start → end:**

| Lineage | Seed 42 | Seed 7 | Seed 123 |
| --- | --- | --- | --- |
| rabbit | 0.55 → 0.564 | 0.55 → 0.566 | — |
| fox | 0.55 → 0.552 | — | — |
| raptor | 0.55 → 0.573 | — | — |
| seedbird | — | — | 0.50 → 0.535 |
| vulture | — | — | 0.35 → 0.399 |

**Year 35 (seed 42, 16800 ticks):**
- 36.16 ms/tick, 8496 animals, gateOk true.
- 207 revivals in total, mostly wader, carrion, crocodile, raptor, frog and newt.
- Overall egg loss 50.4%, mostly hatch failure (failed 237532 vs eaten 69078). Nest eggs: 31958 laid, 14054 hatched, 6786 raided, 2173 repelled, 449 parasite fails.
- At the end: 136 nests, 44 dens, 219 parents, 81 natal young.
- Fox nest gene 0.55 → 0.573. Insect bird 0.42 → 0.235 and vulture 0.35 → 0.249 drift down over the long run.

**Determinism and browser:**
- Determinism (seed 42): stats, full state and rng are identical between runs.
- Save/load (browser, Playwright): stats and camera are equal after a round trip, and a bad file is refused.
- Console: the only error is the Google Fonts certificate error in the sandbox.
- `screenshots/nests.png` shows nest and den markers with the stat card.

## Targets

| Target | Result |
| --- | --- |
| Egg loss 10–40% | Met: overall 17–22%, nest eggs 27–33%. |
| Nest raids the main cause | Met for nest eggs (76–84% of their losses). Not met overall: across all eggs, loss is still mostly opportunistic eating of unguarded non-nest eggs (seed 42: 7589 eaten vs 1384 raids). |
| Nesters' juveniles survive better, same class | Met for birds, fish, reptiles and amphibians on all seeds. Met for mammals on seed 7. On seeds 42 and 123, mammals fail at class level (deer skew it) but pass within species (rabbit, boar, fox). |
| Nest gene rises in ≥1 bird and ≥1 mammal lineage | Met on every seed. Seed 42: rabbit, fox (mammals) and raptor (bird). Seed 7: rabbit. Seed 123: seedbird, vulture. |

## Gates

| Gate | Result |
| --- | --- |
| All founder groups alive at 3000 ticks, seeds 42/7/123 | Pass (gateOk true on all three). Revivals are relied on, as in the baseline: wader on every seed, plus carrion, shark, crocodile, spider, salamander, seal, newt and pike. Revival counts are 41 / 38 / 33, against a baseline of 38 / 50 / 41. |
| ms/tick within +25% | Pass: +7% / +7% / +12%. |
| Save/load byte-identical | Pass. The new fields ride the generic field lists, and `SAVE_VERSION` stays 2. |
| No console errors | Pass, apart from the sandbox font certificate error. |
| No new code comments, no model names | Pass (diff grep). |

## Deviations

- Natal young follow their parent only when not leashed home (`_homeR` = 0). Otherwise they stay near the den.
- A parent feeds young by uid or by shared den within `FEED_R`, not only its own litter.
- Reptile nest eggs are land eggs (domain 0) even for amphibious reptiles.
- The nest gene has a small meta cost (`NEST_COST`), so it is not free to drift up.
- `SAVE_VERSION` is not bumped. Old saves load with `home` = 0 and `nx`/`ny` = -1.
- A bird's `oy` (home latitude) resets to its nest row, so migration pulls toward the nest.
- Nest eggs can carry the parent's strain (`EGG_VERT_K`).

## Risks and deferred

- **Mammal herbivores on seed 42** end much lower (688 vs 2965 at 3000 ticks). The low point is late, and the gate holds, but seed 42's mammal balance needs watching in slice 4.
- **Raptor and wader natal young do worse.** Their tree nests sit far from forage, and the leash keeps young from food. A fix could be forage-aware nest sites or a leash for fishing birds.
- **Non-nest eggs.** Overall egg loss is still driven by eating unguarded eggs. Raids would only become the main overall cause if more egg-layers nested.
- **Year 35.** Bird nest genes drift down, and overall egg loss reaches 50%, almost all of it hatch failure. There is no baseline year-35 run to compare against, so it is unclear how much of this is slice 3.
- **Worker split.** Render and main read only the `AnimalPool` per-slot arrays `home`, `nx` and `ny`, plus `eco.stats.nests`. There are no new tile grids or layers. `eggs.nestCell`, `guardM` and `guardT` are sim-only.

## Checklist

- [x] Nest gene drives nest or den choice per class
- [x] Guarding, raids and repel with flee
- [x] Natal young leashed and fed, with den shelter, cover, parasite and contact costs
- [x] Nest hygiene and parasite egg failure
- [x] Stats card, tooltip, map markers, icons
- [x] Determinism, save/load, perf, founder gates on three seeds
- [x] Year-35 run (seed 42)
- [x] CODE_REFERENCE.md (slices 2 and 3) and complexities.md
- [x] `screenshots/nests.png`
