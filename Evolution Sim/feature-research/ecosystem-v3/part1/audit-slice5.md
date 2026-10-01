# Slice 5 audit: nutrition and body condition

Built on e3476a4 (the slice 4 merge). Testing was cut short at the user's request (a fixed budget of test runs, then "wrap up now"), so the year-35 run was skipped and several targets are unverified; see Checklist.

## Files changed

- `js/sim/animals.js`:
  - **Gene:** `AG` 19 → 20, `G_APPETITE = 19`, `ANIMAL_WEIGHTS` gains 0.5. Founder appetite is set in the founder loop (`FOUNDER_APPETITE` 0.35, +0.2 for `prefTemp < 0.4`, +0.15 for birds); the archetype literals are untouched.
  - **Constants:** `FOOD_*` indices, `FOOD_NAMES`, `FOOD_NUTRIENTS`, `NUT_*`, `NEED_*`, `FIBRE_K`, `SOIL_NUT_*`, `SICK_EAT`, `SICK_ABSORB`, `PARA_NUT`, `DEF_GROW`, `DEF_FERT`, `EGG_CA`, `EGG_CA_MIN`, `FAT_*`, `APP_OVER`, `OMNI_*`, `COND_*`, `DEF_EVENT*`, `DEF_REARM`, `MALNOURISHED_SUS`, `FAT_SUS`.
  - **New pool fields** (`ANIMAL_FIELDS_F.push`): `fat`, `nProt`, `nMin`, `app`, `needP`, `needM`. Cumulative counters `caClutches`, `fatBurned`.
  - **New methods:** `_heavy(i)`, `_sus(i)`, `_deficient(i)`, `_eat(i, g, f, sk)`, `_condTrack(sp)`.
  - **Edited:** `spawn` (the new fields), `_feedYoung` (passes nutrients), speed (fat slows), `_pickForage` (omnivores seek protein; bugs reachable by `mass*gf < BUG_MASS`), `step` (sick bite, fat climate and metabolism terms, `full` eating limit, every food routed through `_eat`, nutrient drain, the fat block, protein-short omnivores hunt sooner, the reproduction condition and fat draw, the deficient fertility roll), `_attack` and `_packFeed` (prey fat in the kill, meat vs fish, heavy prey easier to catch), `_reproduce` (calcium-poor clutches, the mineral drain per egg, live-born children copy their parent's stores), `refreshSpeciesMeans` (`sp.fat`, `sp.protDef`, `sp.minDef`, calls `_condTrack`).
- `js/sim/eggs.js`: `CA_FAIL` 0.35, the per-egg `ca` array, the `caFailed` counter, a new `ca` argument to `lay`, the calcium failure roll at hatching, and `ca` copied in `_compact`.
- `js/sim/disease.js`: `exposeAnimal` multiplies the infection chance by `A._sus(j)`.
- `js/sim/ecosystem.js`: `stats.nutrition`, new `_nutStats()` (every 20 ticks), `history.nutrition` and `history.meanFat`.
- `js/render.js`: `SPRITE_VS` reads `abs(a_extra.x)` as a width factor; constants `FAT_WIDE`, `FAT_WIDE_MAX`, `THIN_AT`, `THIN_MIN`; `_pushAnimals` widens fat bodies and narrows starving ones.
- `js/main.js`: the `STAT_EXTRA` entry `nutrition` ("Body condition") and its `updateExtraStat` branch; `ANIMAL_TRAITS` Appetite; new `conditionWord(f)`; `renderDetail` Body condition cell and Condition trend sparkline; `updateTooltip` condition line.
- `CODE_REFERENCE.md`: see Doc changes.
- Screenshot: not produced (the main-thread browser pass hung under swiftshader and was stopped).

Not touched: `plants.js` and `soil.js`. Nutrition reads `soil.nutrient` and the `SOIL_MAX` global but never writes them, so no plant or soil step logic changed and `js/gpu/plantKernels.js` needs no mirror. Also not touched: `save.js` (no new classes), `worker.js` and `client.js` (no `SNAP_GRIDS` entries: the new state is pool arrays, and the species keys `fat`, `protDef`, `minDef`, `condHist`, `condStep` and `protAlert` have no leading `_`).

## Design

- **Food has nutrients.** Every energy gain goes through `_eat`, which takes a food index and adds its protein and minerals to two 0–1 stores, scaled by the gain relative to `emax*gf`. Grass, leaves and seeds are scaled by soil nutrients. Fibre costs energy in proportion to diet, so carnivores digest grass worst. Kills of aquatic prey count as fish.
- **Needs.** Stores drain with metabolic cost: protein `0.06 + 0.5*diet`, minerals 0.24, juveniles ×1.4/×1.3, birds ×1.15, ectotherms ×0.8. Parasite drain also drains the stores. Below 0.25 a store is deficient:
  - juveniles grow slower (they age on 40% of ticks);
  - breeding attempts fail half the time;
  - disease susceptibility rises ×1.5;
  - egg layers whose minerals are below 0.4 lay calcium-poor eggs, and 35% of those fail at hatching. Every egg drains 0.1 minerals.
- **Fat.** Surplus energy is banked as fat at 0.8 efficiency, up to `0.7*app*emax`. Energy above `emax` overflows into fat, and above 60% of `emax` a slow transfer runs (`0.01*app*emax` per tick). Fat refills energy below 50%. Breeding may draw on fat.
  - Cold tiles (temperature < 0.4) and birds on a migration-cold tile "prepare": the cap is ×1.5, transfer starts at 50% at double rate, and fat is held until 35%. Migrating birds that are away burn fat up to 75% and do not deposit.
  - Fat insulates in cold (climate cost down to ×0.5) and costs in heat (up to ×1.25).
  - Above 25% fat an animal is heavy, which brings several penalties: slower movement, higher metabolism, easier to catch, more disease-prone.
  - Prey fat goes into the kill.
- **Appetite** (gene 19) scales the fat cap, the transfer rate and over-eating (`full = emax*(1 + 0.3*app)` while below the cap).
- **Omnivores seek what they lack.** Below 0.5 protein, omnivores weight bugs, carrion and eggs ×2 and fruit ×0.6, and hunt below 85% energy. Hungry omnivores weight fruit ×1.6.
- **Sick animals eat less.** Their bite is ×`1 - 0.3*virulence` and absorption ×`1 - 0.3*virulence`.
- **UI:**
  - a Body condition card (deficient %, lean / fit / heavy / obese counts, low protein, low minerals, calcium egg failures) with a sparkline;
  - an Appetite trait;
  - a Body condition detail cell and a Condition trend sparkline;
  - a tooltip condition line;
  - fat bodies drawn up to 1.3× wide and starving ones down to 0.8×;
  - a "<species> is suffering from protein deficiency" event (population ≥ 30, species at least 300 ticks old).

## Test numbers

Headless runner (`gate.js`, 320×210). The three new seeds and a seed-42 baseline (e3476a4) ran as one parallel batch on the shared 4-core box, with another agent busy, so absolute ms/tick is inflated.

**3000 ticks, final code:**

| Seed | ms/tick | Animals | Fish / amph / rept / mamm / bird / invt | Lean / fit / heavy / obese | Mean fat | Deficient | Calcium egg failures | Eggs failed + eaten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 42 | 76.33 (base 77.66 in the same batch) | 3328 | 807 / 135 / 382 / 574 / 255 / 1175 | 3004 / 290 / 31 / 3 | 0.016 | 6.4% | 6 | 1571 + 4462 |
| 7 | 78.60 | 3398 | 1444 / 65 / 497 / 685 / 171 / 516 | 2976 / 364 / 34 / 4 | 0.018 | 4.9% | 21 | 1689 + 4276 |
| 123 | 79.68 | 5097 | 1964 / 1 / 251 / 1587 / 366 / 896 | 4420 / 609 / 34 / 2 | 0.019 | 3.5% | 50 | 1795 + 6784 |

- **ms/tick.** In the same batch, seed 42 is 76.33 new vs 77.66 base. Earlier paired runs measured +4% (42: 51.63 → 53.85) and +6% (7: 51.87 → 55.10). This is within the +25% gate.
- **Calcium share of egg losses:** 0.1% / 0.4% / 0.6%, so well under 25%.
- **Fat by class, seed 42:** birds 0.042, mammals 0.024, fish 0.020, invertebrates 0.009, reptiles 0.006, amphibians 0.005. Birds are the fattest class on every seed (0.042 / 0.048 / 0.038).
- **Deficiency by class:** the highest is mammal protein at 11.5% (42) and 9.9% (7), and bird minerals at 10.5% (7).
- **Bird niches** are all alive on every seed (fisher 14 / 6 / 4).
- **Balance gate.** These are groups (class, role, domain) alive in all of the last five samples, ticks 2980–3000, compared with the e3476a4 baseline:

  | Seed | Base groups | New groups | Missing | Extra |
  | --- | --- | --- | --- | --- |
  | 42 | 25 | 25 | none | none |
  | 7 | 24 | 23 | `amphib.omni.amph`, `amphib.carn.amph` | `invert.omni.water` |
  | 123 | 24 | 22 | `amphib.herb.amph`, `amphib.carn.amph` | none |

  The missing amphibian groups come back by revival at tick 3000. Class totals versus the baseline:
  - 42: mammals 1145 → 574, reptiles 193 → 382.
  - 7: mammals 1255 → 685, invertebrates 1390 → 516.
  - 123: amphibians 89 → 1, mammals 974 → 1587.

  A paired time-averaged run (`hm.js`, mean over ticks 1000–3000) put mammals at 1112 → 944 (42) and 913 → 1031 (7), so the mammal end points are largely end-point swing.

**Determinism:** `det.js 42 600 200` (600 ticks, encode, decode, 200 more ticks on both): `stats equal true`, `full state equal true` (12 810 154 bytes), RNGs equal, aliases intact. Save 1.3 s, 11.9 MB.

**Browser** (Playwright, chromium with swiftshader, seed 42, 600 ticks):
- **Worker mode:** no console errors. Card reads "Body condition 6% deficient · 1.4k lean · 189 fit · 30 heavy · 1 obese · 67 low protein · 59 low minerals · 3 eggs failed (calcium)". The fattest animal (fat 0.49) is a Longegnathus; its species has mean fat 0.082 and 18 condition-history entries.
- **`?worker=0` mode, parity and screenshot:** not completed. The main-thread pass hung for more than 30 minutes under swiftshader on the shared cores and was stopped. Worker/main parity is unverified, and `screenshots/nutrition.png` was not produced.

## Deviations

- **Founder appetite is set by a loop, not the archetype literals** (same pattern as slice 4's founder overrides). The literals have 19 entries and the 20th gene is filled in at module load.
- **"Prepare" fattening.** The plan's cold-biome and migrant fat is implemented as a `prep` state (cold tile, or a bird on a tile colder than its preference after the season swing) with a bigger cap, an earlier and faster transfer, and a lower burn line. Without it, an earlier 2600-tick run had cold-zone fat (0.0075) below tropical (0.016).
- **Breeding may draw on fat** (`energy + fat > 0.7*emax`, with the shortfall moved from fat). Without this, reproduction at 70% energy drained the energy that would otherwise be banked, and almost no animal ever got fat.
- **The energy column of `FOOD_NUTRIENTS` is descriptive only.** Energy gains keep their existing per-food constants, so slice 1–4 energy balance is unchanged apart from the fibre tax.
- **`SAVE_VERSION` stays 2.** Saves from before slice 5 have a 19-gene stride and no `fat`/`nProt`/`nMin`. Part 1 is unreleased, so there is no migration (same policy as slices 2 and 4).
- **Reduced testing:** one tuning probe, one final gate, one determinism check, one browser check and one screenshot. No year-35 run.

## Risks and open items

- **Amphibians are weak on 7 and 123.** Amphibian omnivore and carnivore groups (7) and herbivore and carnivore groups (123) only survive by revival at 3000 ticks, and seed 123 ends at 1 amphibian. They are not deficient (protein deficiency 0–5%, minerals 0%) and carry almost no fat. The likely causes are the fibre tax on their plant diet and noise around small numbers; slice 4 also flagged lower amphibian counts. Levers: `FIBRE_K`, `NEED_ECTO`. Needs a re-gate.
- **Cold vs tropical fat and migrant vs resident fat are unverified** on the final code (no year-35 run). The `prep` mechanism was added to fix the inversion seen earlier, but has not been measured since.
- **"Deficiency visible in one lineage per seed, with appetite or diet shifting" is unverified.** The protein deficiency event needs `protDef > 0.4`. The 3000-tick class shares peak at 11.5%, so the event may rarely fire, and an appetite or diet shift needs the long run.
- **The calcium share is very low** (≤ 0.6% of egg losses). It is under the 25% cap, but calcium failure is barely visible. `EGG_CA_MIN` is the lever.
- **Most animals are lean** (90%), and mean fat is 0.016–0.019. The lean/fat mix exists (30–34 heavy, 2–4 obese per seed), but it is thin.
- **End-point class swings** (mammals −50% on 42 and 7, +63% on 123) are in line with the slice 2 and 4 audits, but have not been time-averaged on the final constants.
- **Timing** was measured under heavy load from another agent.

## Doc changes

Made in `CODE_REFERENCE.md`:

- `AG = 20`, the gene 19 row, the founder appetite note and `ANIMAL_WEIGHTS`.
- The pool fields `fat`, `nProt`, `nMin`, `app`, `needP`, `needM`.
- A new "Nutrition and body condition" section with the food table, constants table and methods.
- Eggs: `CA_FAIL`, `ca`, `caFailed`, the `lay` signature and the hatch-time roll.
- `exposeAnimal` ×`_sus`.
- `stats.nutrition`, `history.nutrition` and `history.meanFat`.
- Renderer: the `a_extra` width and the body width rule.
- UI: the Body condition card, the Appetite trait, the detail cell and trend, and the tooltip line.

## Checklist

- [x] `FOOD_NUTRIENTS` table; `nProt`/`nMin` stores; all food goes through `_eat`
- [x] Deficiency effects: slower growth, lower fertility, susceptibility, calcium egg failure
- [x] Fat store: `FAT_EFF`, burns first, overweight penalties; prey fat goes into kills
- [x] `G_APPETITE` = 19, `AG` = 20
- [x] Omnivores seek what they lack; bugs as protein
- [x] Parasites drain stores; sick animals eat and absorb less
- [x] `MALNOURISHED_SUS`, `FAT_SUS` in `exposeAnimal`
- [x] UI: card, tooltip, detail cell, Condition trend sparkline, Appetite trait, body width, protein deficiency event
- [x] Migrant and cold fattening (`prep`); nest egg calcium failure
- [x] Lean/fat mix present (thin)
- [ ] Cold and migrant fat above tropical residents (not measured on final code; no year-35 run)
- [ ] Deficiency in one lineage per seed with appetite or diet shift (not measured; no year-35 run)
- [x] Calcium failures < 25% of egg losses
- [ ] Balance gate: all groups hold on 42; amphibian groups only by revival on 7 and 123
- [x] ms/tick within +25%
- [x] Save/load byte-identical (`det.js`)
- [x] Browser worker mode: no console errors
- [ ] Browser `?worker=0` parity and `nutrition.png` screenshot (run hung; not completed)
- [x] No `SNAP_GRIDS` changes; no new save classes; no `plants.js`/`soil.js` edits (no `plantKernels.js` mirror needed)
- [x] No code comments, no `Math.random`, no model names in the diff
