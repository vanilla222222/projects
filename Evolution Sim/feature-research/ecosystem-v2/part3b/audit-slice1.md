# Part 3b slice 1 audit: life stages (sim)

## Files changed

- `js/sim/eggs.js` (new): `EggPool` and the `EGG_*` constants.
- `js/sim/animals.js`: life-stage constants; `gf`, `ef` and `parent` fields; `_stage`; stage factors at the points of use; parent-following; egg eating; the old-age hazard; the elder fertility cut-off; egg laying in `_reproduce` and the new `_eggTile`.
- `js/sim/disease.js`: the elder infection multiplier in `exposeAnimal` (one line).
- `js/sim/ecosystem.js`: builds the `EggPool` and steps it after the animals; adds `stats.stages` and `stats.eggs`; remaps egg species in `_mergePass`.
- `index.html`: a `js/sim/eggs.js` script tag after `weather.js` and before `ecosystem.js`.
- `CODE_REFERENCE.md`: updates to the script order, the Animals constants, fields, step, mechanics and reproduction, the disease `exposeAnimal` entry and the Ecosystem fields, step and merge pass, plus a new Eggs section.
- `complexities.md`: a new `js/sim/eggs.js` entry (4.5), and updated `animals.js` and `ecosystem.js` notes.
- Scratchpad only, not in the repo:
  - the `part3run.js` and `herbdiag.js` file lists now include `sim/eggs.js`;
  - a new runner, `life.js`, plus the diagnostic `amphchk.js`.

## Design decisions

### Where the stage factors apply

`gf` and `ef` are stored per animal as Float fields in `ANIMAL_FIELDS_F`, so `_grow`, `_copySlot` and `_compact` pick them up. `_stage(i)` sets them in two places: in `spawn`, and right after `age++` in `step`. `_decode` is unchanged and stays genetic. The factors are applied where each value is used:

| Value | How it is scaled |
|---|---|
| Metabolism | `meta*gf` |
| Maximum energy | `emax*gf`: every threshold and the end-of-tick cap |
| Bite | `bite*gf*ef*(1+TERR_BITE*homeK)`, and the same for bug bites |
| Speed | `_moveToward` multiplies by `ef` |
| Predation mass | `mass*gf`, in four places: `_nearest` modes 0 and 1, the `_attack` mass ratio, the meat gained, and the carcass mass in `_kill` |

Other animals read `gf` from their last update, so it can be up to one tick stale.

### Parent-following

- **Which juveniles:** only those with a non-zero `parent` and `gf < 1`.
- **When:** after the flee, hunt and thirst steps, on ticks where `(tick+i) % 4 === 0`, and only if the juvenile is not eating (state 1).
- **What it does:** `_nearest` mode 2 (the mate search) finds the nearest adult of the juvenile's species. If that adult is more than 1.5 tiles away, the juvenile moves toward it at full speed.
- `parent` holds the parent's uid. It works as the "live-born" flag, and it is kept for Part 4 UI.

### Egg eating

- **Placement:** egg eating is opportunistic, like the carrion block. It runs after parent-following and before carrion-seek and plant foraging, whether or not the animal acted.
- **Who eats:** any animal with diet ≥ 0.33 and energy below `emax*gf`.
- **How much:** `eatAt` eats eggs on the current tile until the energy deficit is filled, so it can take several eggs of a clutch. Own-species eggs are skipped.
- **Why:** the first version ate one egg only as a non-acting step, and it gave about 2% loss.

### Laying

- **Where:** amphibians lay on their own tile or a 4-neighbour tile. That tile must have the amphibious walk bit and be `fresh` or have `wet > 0.5`. If no tile qualifies, the animal gets a 10-tick cooldown and pays nothing. Water animals and reptiles lay on their own tile.
- **Speciation:** it is decided at laying. A daughter species created by an egg has population 0, and `matchDaughter` skips population-0 species. The rest of the same clutch therefore reuses that daughter (`clutchSp`) when within the threshold. Without this, one clutch could spawn several species.
- **Innate immunity:** `natImm` is rolled at laying and stored on the egg (`imm`).

### Hatch and failure

- **Species gone:** an egg fails at hatch if its species has died out, meaning `population <= 0` and `peak > 0`. A brand-new egg-only daughter (peak 0) may still hatch.
- **Animal cap:** an egg also fails when the animal cap (`maxAnimals+1500`) is reached.
- **Other failures:** snow above `SNOW_SHOW` kills non-water eggs. An amphibian egg dies if its tile is neither `fresh` nor `wet > 0.5`.
- **Hatchling energy:** `min(eggEnergy, emax*gf*0.6)`.

### Other choices

- **Reptile incubation:** development runs at `max(0.5, 1-(0.5-et)*2*0.5)` when `et < 0.5`, so it bottoms out at 0.5× when `et ≤ 0.25`.
- **Elder infection:** the multiplier is `1+0.5*(1-ef)/0.4`, reaching ×1.5 at `ef = 0.6`.
- **No new RNG stream:** laying uses the animal RNG. In live births, `natImm` is now rolled before `spawn`, which changes the draw order.

## Final constant values

| Constant | Plan | Final | Note |
|---|---|---|---|
| `EGG_CLUTCH_MUL` | 2 | 1.5 | Tuned (−25%). Clutch = `round(litter*1.5)`. |
| `EGG_COST` | 0.5 | 0.67 | Tuned (+34%). Parent spend stays about the same as a live litter. Hatchlings get more energy. |
| `EGG_TIME`, `EGG_TIME_SIZE` | 25, 30 | 25, 30 | Unchanged. +50% raised loss by only about 1 point. |
| `EGG_FOOD` | — | 0.8 | Chosen value. |
| `EGG_WET`, `EGG_COLD_RATE` | — | 0.5, 0.5 | `EGG_WET` matches `AMPH_DRINK_WET`. `EGG_COLD_RATE` is the plan's 0.5×. |
| `MATURE_BASE`, `MATURE_SIZE` | 90, 160 | 90, 160 | |
| `JUV_MIN`, `ELDER_AGE`, `ELDER_MIN`, `ELDER_FERTILE`, `ELDER_INFECT` | 0.4, 0.75, 0.6, 0.9, 0.5 | same | |
| `OLD_START`, `OLD_P`, `OLD_K` | 0.85, 0.0015, 12 | same | |
| `FOLLOW_EVERY` | 4 | 4 | |

**Why the clutch and egg-cost change:** with the plan values, amphibians fell to 1–2 animals at some checkpoints. `amphchk.js` showed that laying was essentially never blocked. Most amphibian deaths were juveniles starving. Fewer, better-fed eggs fixed this. With the final values, the lowest amphibian count at any checkpoint was 17 (seed 123, tick 2000), and the 3000-tick counts were 188, 126 and 525.

## Results (3000 ticks, `life.js`, final constants)

"Pre" is the same runner on the tree before any edit.

| Item | Seed 42 | Seed 7 | Seed 123 | Target |
|---|---|---|---|---|
| ms/tick, mean over run (pre) | 17.9 (17.9) | 19.2 (18.6) | 22.4 (20.2) | ≤ +25% over Part 3 (23–28) |
| ms/tick, ticks 2000–3000 (pre) | 17.5 (19.1) | 23.9 (22.3) | 26.1 (22.5) | ≤ 35 |
| All 9 groups alive | yes | yes | yes | yes |
| Plant cover (pre) | 59835 (59833) | 59798 (59853) | 59846 (59846) | within 5% |
| stats.stages | 158 / 705 / 1544 / 262 | 401 / 1306 / 2391 / 557 | 514 / 1484 / 3085 / 995 | eggs / juveniles / adults / elders |
| stats.eggs, laid / hatched / eaten / failed | 12249 / 11634 / 423 / 34 | 19556 / 18581 / 525 / 49 | 20444 / 19364 / 555 / 11 | |
| Egg loss, (eaten+failed)/resolved | 3.8% | 3.0% | 2.8% | 20–60% **(missed)** |
| Loss by layer, land / water / amph | 12.8 / 0 / 9.9% | 5.7 / 1.8 / 6.4% | 4.3 / 2.3 / 6.9% | |
| Hatched, water / amph / reptile | 8186 / 2037 / 1411 | 14853 / 2803 / 925 | 15739 / 1604 / 2021 | > 0 each |
| Juvenile % of land animals (pre, old maturity) | 29.9 (15.7) | 25.2 (18.1) | 21.3 (23.1) | 15–40% |
| Elder % of all animals | 10.4 | 13.1 | 17.9 | 5–20% |
| Mean age at old-age death (pre) | 851 (819), +3.9% | 780 (781), −0.1% | 791 (755), +4.8% | ±10% |
| Mean age / maxAge at old-age death (pre) | 0.999 (1.026) | 1.003 (1.026) | 1.003 (1.028) | |

Group counts at 3000 ticks, in the order landHerb, landOmni, landCarn, landScav, waterHerb, waterOmni, waterCarn, amphib, reptile:

| Seed | Counts |
|---|---|
| 42 | 245, 329, 23, 14, 1529, 126, 13, 188, 44 |
| 7 | 745, 623, 18, 179, 2451, 11, 10, 126, 91 |
| 123 | 1179, 843, 21, 13, 2708, 122, 25, 525, 128 |

- **Grazers:** seed 42 has fewer grazers than before (1023 pre). That is the slice-2 grazer issue and was not tuned here.
- **Variance:** runs vary a lot. Changes in RNG draw order move group counts by 2–5× between otherwise equivalent configurations, especially for amphibians and reptiles.

## Deviations

1. **Egg loss target missed: 2.8–3.8% against 20–60%.**
   - The losses the plan allows are eating on the eater's current tile, snow and drying. Snow and drying are rare: 11–49 failures per run.
   - Eating needs an omnivore, carnivore or scavenger to step onto the exact laying tile within the 25–55 tick incubation.
   - Water eggs are about 80% of all eggs and are eaten least (0–2.3%), because water omnivores and carnivores number about 25–150 against 1500–2700 fish.
   - I tried making eating opportunistic, then eating a whole clutch, then +50% incubation. Loss stayed at about 5% or less.
   - Tuning inside ±50% cannot reach 20%. Reaching it needs a mechanic the plan does not include. Options for the lead to choose from:
     - (a) egg-seeking in `_pickForage` or a per-grid-cell egg lure like `carrionCell`;
     - (b) herbivorous fish eating other species' water eggs;
     - (c) a base per-egg failure chance.
   - I did not add any of these.
2. **`EGG_CLUTCH_MUL` 2 → 1.5 and `EGG_COST` 0.5 → 0.67:** tuned within ±50% to keep amphibians alive (see above). Clutches use `Math.round`.
3. **Extra Float fields `gf` and `ef`.** The plan named only the `parent` field. These are stored so that other animals' checks (`_nearest`, `_attack`, disease) and the slice 3 renderer can read them without recomputing.
4. **Two small additions the plan did not name:**
   - the per-clutch reuse of a daughter species (`clutchSp`);
   - the 10-tick cooldown when an amphibian finds no laying tile.
5. **UI note for Part 4:** the `main.js` tooltip still shows `energy/emax`, so juveniles read as at most 40% full. This was not changed, because UI is out of scope.
6. **Browser check not done.** A headless Chrome attempt (`cdp_shot.py`) hung and was killed. The sim loads and runs headlessly in Node through `vm`.

## Checklist

- [x] No new comments. `git diff -U0 -- js index.html | grep '^+' | grep -E '//|/\*'` prints nothing, and `grep -nE '//|/\*' js/sim/eggs.js` prints nothing.
- [x] CODE_REFERENCE entries are present. `grep -n "## Eggs\|stats.stages\|eggs.reassignSpecies\|\`parent\`\|OLD_START" CODE_REFERENCE.md` finds:
  - 573: `OLD_START`, `OLD_P`, `OLD_K` (constants table);
  - 675: the `parent` field;
  - 753: old age in step 5;
  - 776: follow parent;
  - 888: `## Eggs (js/sim/eggs.js)`;
  - 1232: `stats.stages`;
  - 1274: `_mergePass`, including `eggs.reassignSpecies`.

  The script order line (line 3) also lists `sim/eggs.js`.
- [x] The complexities entry is present: `complexities.md:23` has `js/sim/eggs.js` at 4.5, and the `animals.js` and `ecosystem.js` notes are updated.
- [x] `index.html` loads `js/sim/eggs.js` after `weather.js` and before `ecosystem.js`. `part3run.js` and `herbdiag.js` load it too.
- [x] No git state changes were made.
