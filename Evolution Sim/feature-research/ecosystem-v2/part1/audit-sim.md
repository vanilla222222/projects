# Part 1 audit: sim slice (A)

## Files changed

- `js/sim/soil.js`: added the `carrion` store, `totalCarrion`, `CARRION_SHARE` and `CARRION_DECAY`. Carrion rots into litter inside `step`. `addCarcass` now splits the carcass, and `consumeCarrion` is new.
- `js/sim/animals.js`: `AG` goes to 11 with `G_SCAV = 10`, and `ANIMAL_WEIGHTS` gets a 0.9 weight for it.
  - New `CARRION_LURE` constant, and new `carrionEff` and `scav` Float32 fields, set in `_decode`.
  - Carrion lure in `_pickForage`, and a carrion eat block (with carcass exposure) after the bug block.
  - Hunting penalty `(1-0.5*scav)` in `_attack`.
  - An 11th gene on all 13 archetypes, plus the role-tagged carrion-eater archetype.
  - New `carrion` category and labels, and the extended `ANIMAL_ICON_VARIANTS`.
- `js/sim/plants.js`: added `PLANT_ICON_VARIANTS` and `plantIcon`, used in `_newSpecies` and `refreshSpeciesMeans`.
- `js/sim/bugs.js`: added `BUG_ICON_VARIANTS` and `bugIcon`, used in `_newSpecies` and `refreshSpeciesMeans`.
- `js/sim/disease.js`: added `STRAIN_ICONS` and `BLIGHT_ICONS`, which `_newStrain` uses to set `sp.icon`.
- `js/sim/ecosystem.js`:
  - `STAT_GROUPS` gets `landScav`, and `waterOmni` is relabelled "Sea scavengers".
  - `stats.carrion`, and `landScav` counting in `_computeStats`.
  - A `pickRole` helper and two new migration rules.
- `CODE_REFERENCE.md`: updated the Plants (icon variants), Soil, Animals, Bugs, Disease and Ecosystem sections.
- `complexities.md`: updated the notes for soil, plants, animals, bugs, disease and ecosystem. No scores changed.
- Scratch only, not in the repo: `run6.js`, `scavdiag.js` and `scavdiag_run.js` in the session scratchpad.

## AG 10 to 11 sweep

The sweep searched for `AG`, `ANIMAL_WEIGHTS`, `G_RES`, `G_ARMOR` and literal stride patterns across `js/`.

- **`animals.js`:** every genome access goes through `AG` or `G_*`. This covers `_grow`, `_decode`, `spawn`, `newSpecies` (`subarray(gOff, gOff+AG)`), `_reproduce`, `_copySlot` and `refreshSpeciesMeans` (with `AG+2` sums). No hard-coded strides were found.
- **`disease.js`:** it uses `A.genome[j*AG + G_RES]`, and calls `_compat` with `ANIMAL_WEIGHTS`. `geneDistance` loops over `weights.length`, so it reads all 11 genes. `hostGenome` is copied from the host species' genome, which now has 11 entries.
- **`ecosystem.js`:** `_introduce` uses `Float32Array.from(arch.g)`, and every archetype has 11 genes.
- **`bugs.js`:** no animal genome indexing, and `parasiteHost` reads the size gene through `animals.js`.
- **Core:** `Species.mean` and `Species.genome` are copied from the source genome, so their length follows automatically.
- **Report only (not edited):**
  - `main.js` `ANIMAL_TRAITS` indexes by `G_*` constants, so nothing breaks. The scavenging gene is not shown in the detail panel. The UI slice may want to add `['Scavenging', G_SCAV, pct]`.
  - `main.js` stat cards title groups as `${Land|Water} ${g.role}s`, so the new group reads "Land scavengers".
  - `render.js` has no genome indexing. It resolves `ICON_INDEX[sp.icon || sp.category]` with a fallback to `dot`.

## Results (3000 ticks, final constants, runs made one after another)

| Seed | ms/tick (Part 4) | ms/tick now | Cover (Part 4) | Cover now | LH / LO / LC / **LS** / WH / WO / WC | Bug niche tiles | Carrion total | Scavengers | Scavenger energy from carrion | Living plant / animal / bug / pathogen species |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 42 | 17.8 | 15.91 | 59895 | 59880 (-0.03%) | 989 / 278 / 172 / **34** / 1192 / 108 / 32 | 30211 / 11709 / 11920 / 30206 | 386.8 | 34 | 2.9% | 45 / 14 / 13 / 10 |
| 7 | 16.6 | 14.97 | 59909 | 59966 (+0.10%) | 1414 / 229 / 151 / **122** / 788 / 477 / 65 | 22483 / 11586 / 12829 / 24229 | 325.6 | 122 | 2.6% | 55 / 19 / 12 / 3 |
| 123 | 19.2 | 16.09 | 59975 | 59916 (-0.10%) | 1351 / 43 / 143 / **218** / 1412 / 378 / 38 | 27391 / 9291 / 13939 / 25492 | 296.7 | 218 | 2.5% | 37 / 19 / 14 / 13 |

The Part 4 cover and ms/tick figures come from `feature-research/ecosystem-expansion/part4/audit.md` (the "after" column).

All gates pass:
- ms/tick is 0.84x to 0.90x of Part 4.
- All 7 groups and all 4 bug niches are alive at t3000.
- Cover is within 0.1%.

Land scavenger counts every 250 ticks:

| Seed | Counts from t250 to t3000 | Scavenger migrations |
| --- | --- | --- |
| 42 | 47 68 134 178 130 71 40 16 43 89 124 34 | none |
| 7 | 49 62 69 90 159 134 32 **2** 7 23 102 122 | none; the low at t2000 recovered on its own |
| 123 | 63 119 244 350 432 260 104 92 141 171 214 218 | none |

Each seed also had a `carrion` species category at the end.

**Icon checks:**
- All 120 names in the four variant and icon lists appear in the plan and in `js/icons.js`.
- All 18 plant categories have a `PLANT_ICON_VARIANTS` entry, and all 15 animal categories have an `ANIMAL_ICON_VARIANTS` entry.
- The bug categories `locust`, `leech` and `butterfly` have no variants in the plan and fall back to the category name.
- End-of-run icon sets include new variants such as vulture, hyena, jackal, bacterium, protozoan, helminth, mold, caterpillar, snail, mosquito and moth, plus plant variants.

## Deviations

1. **The scavenger failed as planned, so it was tuned.** With the plan's constants (`CARRION_DECAY` 0.02, lure 2) and genes, land scavengers declined on all seeds, ending at 3, 25 and 3. On seeds 42 and 123 they survived only through the new migration rule.
   - A diagnostic on seed 42 showed why. Of 188 deaths, 147 were starvation, and mean energy was 25% of max. Carrion supplied only 2–4% of the scavengers' energy, and they spent 69% of ticks grazing.
   - Changes:
     - `CARRION_DECAY` went from 0.02 to 0.005.
     - `CARRION_LURE` went to 6. The plan gave no value, and 2 was tried first.
     - The carrion-eater genes changed from `[0.38, 0.55, 0.78, 0.55, 0.55, 0.5, 0.55, 0.6, 0.3, 0.3, 0.8]` to `[0.38, 0.45, 0.6, 0.45, 0.5, 0.65, 0.6, 0.6, 0.2, 0.3, 0.8]`. That is lower speed, sense and armor for a lower metabolism, a wider climate range, a little more fecundity, and diet 0.45, which is still an omnivore and still counts as a scavenger.
   - `n` stays 18, and `CARRION_SHARE` stays 0.6.
   - Tested alternatives:
     - `n` 30 alone still collapsed.
     - `CARRION_SHARE` 0.8 was no better.
     - Plan constants with the new genes ended at 0 on seed 42.
2. **Carrion is only a small share of scavenger income (about 3%).** Scavengers find carrion mostly by chance.
   - `_pickForage`, which carries the lure, only runs when the current tile lacks edible plants.
   - The carrion eat block only reads the animal's own tile.
   - Making carrion a main food source would need a behaviour change, such as a carrion-seeking branch, which the plan does not include. This is flagged for Part 2.
3. **Carcass split.** The plan is followed literally: `mass*CARRION_SHARE` goes to carrion, and `mass*(1-CARRION_SHARE)*CARCASS_FRAC` goes to litter.
   - Total dead matter per carcass therefore rises from 0.6·mass to 0.84·mass.
   - Carrion eventually rots into litter. Cover was unaffected (within 0.1%).
4. **`animalCategory` test.** It uses `role !== 'herbivore'` for "diet ≥ 0.33". This covers land carnivores with `scav > 0.5` too, and it matches the `_computeStats` test exactly.
5. **Blight icons** are picked by `id % 2`. The plan listed the names without an index rule.
6. **Water omnivore revival.** The crab has no role tag, as the plan specifies. Its rule uses the diet-based `pick` for 0.33–0.66, and `pickRole` is used only for `'scavenger'`.
7. **Icon reshuffle.** Existing species in categories whose variant list grew may show a different icon, because `id % length` changes. Categories with an unchanged list (for example `carrion`, which is new) are not affected. This follows from the plan's table.

## Checklist

- [x] No new comments: `git diff -U0 -- js/sim/ | grep '^+' | grep -E '//|/\*'` prints nothing.
- [x] CODE_REFERENCE entries are present. Grep counts are all at least 1: `consumeCarrion`, `totalCarrion`, `CARRION_SHARE`, `CARRION_DECAY`, `CARRION_LURE`, `G_SCAV`, `carrionEff`, `landScav`, `bugIcon`, `plantIcon`, `PLANT_ICON_VARIANTS`, `BUG_ICON_VARIANTS`, `STRAIN_ICONS`, `BLIGHT_ICONS`, `pickRole` and "Sea scavenger".
- [x] `complexities.md` notes are updated for soil, plants, animals, bugs, disease and ecosystem.
- [x] No edits to `js/icons.js`, `index.html`, css, `js/main.js` or `js/render.js`.
- [x] All sim files parse (`new Function` check), and there were no runtime errors on 3 seeds × 3000 ticks.
- [x] Disease consistency checks from the runner report 0 mismatches.
