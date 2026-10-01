# Part 2, slice 1 (speciation): audit

## Files changed

- `js/sim/core.js`: `SPLIT_MIN_AGE`, `registry.speciations`, `canSplit`, `matchDaughter` now searches children and siblings against `mean`, `merge`.
- `js/sim/plants.js`: `PLANT_SPECIATION` 0.25, `PLANT_SPLIT_MIN_POP`, mean-based check in `_assign`, `reassignSpecies`.
- `js/sim/animals.js`: `ANIMAL_SPECIATION` 0.18, `ANIMAL_SPLIT_MIN_POP`, mean-based check in `_reproduce`, `reassignSpecies`.
- `js/sim/bugs.js`: `BUG_SPECIATION` 0.2, `BUG_SPLIT_MIN_POP`, mean-based check in `_assign` with the hue unwrapped, circular hue mean in `refreshSpeciesMeans`, `reassignSpecies`.
- `js/sim/disease.js`: `DISEASE_SPECIATION` 0.1, `DISEASE_SPLIT_MIN_POP`, `PATHO_MUT` 0.015, mean-based `_mutate` with the split gate, `reassignSpecies`, `remapHost`.
- `js/sim/ecosystem.js`: `MERGE_EVERY`, `MERGE_MAX_AGE`, `MERGE_POP`, `_mergePass`, `stats.speciations`, no extinction log line for merged species.
- `CODE_REFERENCE.md`: the Species, Registry, Plants, Animals, Bugs, Disease and Ecosystem sections.
- `complexities.md`: `core.js` 5 → 5.5, plus a merge-pass note on `ecosystem.js`.
- `feature-research/ecosystem-v2/part2/audit-slice1.md` (this file).

Scratchpad only, not in the repo: `part2run.js` (the runner), `p2diag.js` and `bugspec.js` (diagnostics), `p2probe.html` (headless UI probe), and `p2base/js` (a copy of the pre-slice sim, used for same-load baseline runs).

## What was done, per plan item

1. **Compare against the species mean.**
   - Plants (`_assign`), animals (`_reproduce`), bugs (`_assign`) and strains (`_mutate`) now measure the child against `sp.mean`. `Species` sets `mean` to the founder genome when the species is created, so a separate fallback to `genome` is never needed.
   - Cadence check: `Ecosystem.step` already refreshes the means of plants, animals and bugs every 20 ticks (strains drift their mean in `_mutate`). No change was needed there.
   - `matchDaughter` also compares with each candidate's `mean`. The plan only named the speciation checks, but a check against the mean that then matches on founder genomes would contradict item 1.
2. **Higher thresholds.**
   - As planned: `ANIMAL_SPECIATION` 0.18, `BUG_SPECIATION` 0.2 and `PATHO_MUT` 0.015.
   - Changed from the plan: `PLANT_SPECIATION` 0.25 and `DISEASE_SPECIATION` 0.1 (see Deviations).
3. **Split gate.**
   - `registry.canSplit(parent, minPop)` requires a population of at least `minPop` and an age of at least `SPLIT_MIN_AGE` (480 ticks).
   - Minimum populations: plants 40, animals 12, bugs 40, strains 10.
   - The gate applies only when no daughter or sibling matches. When it fails, the child stays in the parent: it joins the parent species, and a strain's mean drifts.
4. **Wider daughter matching.**
   - `matchDaughter` searches the parent's living children, then the parent's siblings (the grandparent's living children, excluding the parent itself).
   - The factor is 1.0 at all four call sites.
5. **Merge pass.**
   - `Ecosystem._mergePass` runs every 120 ticks.
   - A living species merges when it has a parent, has no `origin` (see Deviations), is younger than 960 ticks, has a population at or below `MERGE_POP` (plant 6, animal 2, bug 6, pathogen 2), and its parent is alive.
   - The layer's `reassignSpecies` rewrites the member ids:
     - plants: both slot planes, plus `hue`;
     - animals: `sp[i]`;
     - bugs: all 4 niche planes;
     - strains: `animals.strain`, `immune` and `natImm`, `plants.blight` and `blightImm`, `carcassStrain` and `vectorStrain`. The strain is also removed from `D.live`.
   - Then `registry.merge` moves the count with `remove` and `add` and sets `sp.merged`. `_logExtinctions` skips the log line for merged species. `children` links are left intact.
6. **Counters.**
   - `registry.speciations` holds `{plant, animal, bug, pathogen}`. It is incremented in `create` only when a species has a parent and a null `origin`, so founders, migrants, emerged strains and jumps are not counted.
   - It is exposed as `stats.speciations`, which is the same object.

## Before and after

Baseline and new were run side by side on the same machine: 6 processes at once, with the baseline code from the `p2base/js` copy and the same runner. The baseline numbers match `baseline.md` exactly; only ms/tick is higher under this load. In the table:

- Speciations = species created with a parent and no origin. For the baseline, the same proxy is computed from `registry.all`.
- Dis% = disease share of animal deaths (cumulative).
- Swarms is cumulative.

| Seed / year | Living P/A/B/S (base → new) | Speciations P/A/B/S (base → new) | Merged (new) | Dis% (base → new) | Swarms (base → new) | ms/tick (base → new) |
|---|---|---|---|---|---|---|
| 42 / 10 | 72/31/13/25 → 18/11/12/5 | 61/36/7/32 → 0/1/0/0 | 0 | 7.5 → 1.5 | 0 → 0 | 23.2 → 27.4 |
| 42 / 20 | 144/103/13/270 → 19/11/12/14 | 163/269/9/283 → 22/13/0/1 | 29 | 27.0 → 4.7 | 5 → 21 | 34.9 → 37.1 |
| 42 / 35 | 251/108/17/539 → 20/7/12/80 | 326/661/16/1448 → 35/47/0/3 | 67 | 29.1 → 12.8 | 135 → 135 | 42.2 → 40.9 |
| 7 / 10 | 91/27/11/9 → 20/10/11/3 | 77/42/3/9 → 0/1/0/0 | 1 | 2.1 → 0.5 | 0 → 0 | 24.7 → 24.5 |
| 7 / 20 | 169/105/12/226 → 22/12/11/26 | 182/277/4/234 → 10/14/0/0 | 17 | 12.7 → 7.0 | 20 → 62 | 38.5 → 34.1 |
| 7 / 35 | 283/107/19/465 → 21/10/11/27 | 384/687/18/1131 → 38/39/0/0 | 62 | 21.0 → 14.9 | 158 → 233 | 44.6 → 41.1 |
| 123 / 10 | 70/36/16/63 → 19/10/12/11 | 58/53/18/66 → 0/0/0/0 | 0 | 0.5 → 8.9 | 0 → 0 | 25.3 → 27.0 |
| 123 / 20 | 160/106/21/409 → 21/10/12/13 | 172/292/36/615 → 31/23/0/1 | 45 | 20.3 → 14.1 | 0 → 0 | 40.0 → 38.9 |
| 123 / 35 | 270/107/23/642 → 20/8/12/24 | 397/659/50/1791 → 35/41/0/1 | 63 | 27.1 → 21.4 | 0 → 0 | 43.8 → 38.1 |

Year-35 targets:

- **Speciations per group:** plants 9–11x fewer, animals 14–18x fewer, bugs 16–50 down to 0, strains 1131–1791 down to 0–3. The 5x target is met.
- **Living plant species:** 251–283 down to 20–21 (12–13x fewer). The 3x target is met.
- **Living strains:** 465–642 down to 24–80 (6.7–27x fewer). The 3x target is met.

Group counts (the same run):

| Seed / year | Base | New |
|---|---|---|
| 42 / 10 | H585 O690 C157 S1 wH1536 wO246 wC24 | H1541 O104 C110 S1 wH3147 wO211 wC44 |
| 42 / 20 | H123 O670 C146 S6 wH3874 wO2148 wC8 | H580 O2134 C123 S26 wH2010 wO2104 wC8 |
| 42 / 35 | H104 O1081 C79 S57 wH389 wO5267 wC5 | **H2** O1329 C114 **S0** **wH5** wO5529 **wC0** |
| 7 / 10 | H838 O390 C79 S592 wH1224 wO666 wC99 | H1866 O195 C171 S4 wH1095 wO389 wC186 |
| 7 / 20 | H811 O610 C76 S680 wH1773 wO2961 wC68 | H66 O1239 C130 S776 wH911 wO3847 wC12 |
| 7 / 35 | H35 O1725 C6 S633 wH321 wO4193 wC62 | H104 O2380 **C0** S586 wH136 wO3780 wC2 |
| 123 / 10 | H542 O857 C90 S3 wH3443 wO496 wC19 | H367 O554 C111 S250 wH2634 wO923 wC10 |
| 123 / 20 | H117 O898 C60 S85 wH4162 wO1632 wC28 | H72 O761 C33 S141 wH1881 wO4087 wC8 |
| 123 / 35 | H23 O2433 C3 **S0** wH673 wO3845 wC6 | H15 O1087 **C0** S660 wH112 wO5110 wC2 |

(H is land grazers, O land omnivores, C land predators, S land scavengers; wH is fish, wO crabs, wC sea predators.)

**The 3000-tick gate** (run separately, 6 processes at once, same-load baseline):

| Seed | ms/tick base → new | Groups (new) | Bug niches |
|---|---|---|---|
| 42 | 18.0 → 19.5 (+8%) | all 7 alive (H1319 O44 C109 S7 wH1899 wO167 wC9) | all 4 |
| 7 | 18.0 → 20.6 (+15%) | all 7 alive (H1477 O202 C66 S8 wH844 wO482 wC54) | all 4 |
| 123 | 19.4 → 20.4 (+5%) | all 7 alive (H1082 O181 C202 S61 wH1109 wO285 wC25) | all 4 |

The ms/tick gate (within +25%) passes. The year-35 ms/tick is 3–13% below the same-load baseline, but not the sharp drop the plan expected, so the species and strain counts were not the main cost.

## Consistency check

At every checkpoint (3 seeds × years 10/20/35, plus 3 seeds × tick 3000, plus the intermediate runs), `part2run.js` compared each species' per-entity membership count with `sp.population` in the registry. It covered every living species and every id found in an entity array:

- plant slots on both planes;
- living animals' `sp[i]`;
- bug tiles on all 4 planes;
- strains: living animals' `strain[i]` plus `plants.blight`.

It also checked that `D.live` holds exactly the living strains. The result was **0 mismatches in every check** (for example, year 35 on seed 42: plant 0/20, animal 0/7, bug 0/12, pathogen 0/80, liveSet 0). A merged species is never living and never has members left behind.

**Headless UI check:** `cdp_shot.py` ran `p2probe.html`, which loads `index.html#42` in headless Chromium and steps the sim 2400 ticks in-page. It reported no console errors and no exceptions (`errs []`). The screenshot is `scratchpad/p2probe.png`. It was not stepped to year 35, because that belongs to the Part 2 screenshots task.

## Deviations

1. **`PLANT_SPECIATION` is 0.25, not 0.2** (+25%, within ±50%). At 0.2, plants had 147–154 speciations by year 30 on seeds 42 and 123, heading for only about 2x fewer than baseline at year 35. At 0.25 there were 24–31 by year 30, and 35–38 at year 35. 0.3 was similar but noisier.
2. **`DISEASE_SPECIATION` is 0.1, not 0.2** (−50%, the limit). A strain child is one `mutateGenes` draw from the strain mean, with sd 0.05 at rate 0.5, and `gaussRand` is bounded at ±3.46 sd, so its weighted distance can never exceed about 0.173. At 0.2, strain speciation is impossible. At 0.1 it gives 0–3 per seed over 35 years (measured chance about 3e-4 per mutation).
3. **Bug hue wrap fix** (not in the plan). Pollinator hue drifts and wraps at 0/1, so with the mean-based check, children near hue 0.03 were measured about 0.85 away from a mean near 0.88. On seed 42 this produced 13 bug "speciations" and 10 merges in 3000 ticks, all of them pollinators. The fix computes `mean[B_HUE]` as a circular mean, and `_assign` compares a copy of the child whose hue is unwrapped to within 0.5 of the parent's mean hue. That copy is also what `matchDaughter` sees.
4. **The merge pass skips species that have an `origin`.** Only speciation offshoots merge; host-jump strains (origin `'jump'`) do not. A jump strain folded into its parent would carry the wrong `hostId`, and would be re-created by the next jump, causing churn.
5. **`disease.remapHost`** (not in the plan). When a plant or animal species merges, every live strain whose `hostId` was the merged species is pointed at the parent. Otherwise `_compat` would compare the parent's founder genome against the strain's host genome and start spurious jumps.
6. **`matchDaughter` compares with candidates' `mean`, not their `genome`.** This follows from item 1.

## Risks

- **Bug speciation is essentially frozen: 0 on all seeds over 35 years at 0.2.** Lower values were tried with plant 0.25 and disease 0.1:
  - 0.18 gave 0–3;
  - 0.15 gave 483 on seed 123 (0–1 on the others);
  - 0.12 gave 2250 on seed 123.

  Seed 123 shows runaway churn below about 0.17, so the plan value was kept. The drop against baseline (16–50) meets the target, but it is below the "at least 1 per group" guide.
- **Year-35 group health is worse than baseline.** New runs lose:
  - seed 42: land scavengers and sea predators, with land grazers at 2 and fish at 5;
  - seed 7: land predators;
  - seed 123: land predators, but its land scavengers survive (baseline lost them).

  Baseline was already marginal there (for example predators 3–6 and sea predators 5–6). With about 7–10 living animal species instead of 107, each trophic group depends on a few species, and the migration rescue for predators needs more than 250 grazers, which is not met when grazers collapse. Per instructions this was reported, not retuned. It is a slice 2 / Part 3 input (herbivore collapse, crab explosion).
- **Locust swarms went up on seed 7** (158 → 233). Slice 2 retunes swarms.
- **The disease share fell at year 35** (21–29% → 13–21%), while year 10 is mixed. Slice 2 tunes lethality against these new numbers.
- **Year-35 ms/tick only dropped 3–13%.** The plan expected a sharp drop.
- **Merge pass cost:** each merge scans a full entity array (2n plant slots, 4n bug tiles, and animals plus 2n plant slots plus 2n tile planes for strains). There were about 60–70 merges per 35-year run, which is negligible.
- **UI:** a merged species shows as extinct in lists (UI is out of scope). `animals.seedSp` can still point at a merged plant species, in which case the seed is dropped (`_dropSeed` checks the population), which is harmless.

## Checklist

- [x] No new code comments. `diff -r scratchpad/p2base/js js | grep '^>' | grep -cE '//|/\*'` returns 0, and `git diff -U0 js/sim/ | grep '^+' | grep -v '^+++' | grep -E '//|/\*'` returns nothing (exit 1).
- [x] CODE_REFERENCE entries present, checked by grep: `canSplit`, `merge(child, parent)`, `speciations`, `siblings`, `PLANT_SPLIT_MIN_POP`, `ANIMAL_SPLIT_MIN_POP`, `BUG_SPLIT_MIN_POP`, `DISEASE_SPLIT_MIN_POP`, `reassignSpecies` (plants, animals, bugs, disease), `remapHost`, `_mergePass`, `MERGE_POP` and `merged`.
- [x] complexities.md: `core.js` is 5.5, and `ecosystem.js` mentions `_mergePass`.
- [x] Registry and entity consistency: 0 mismatches.
- [x] 3000-tick gate: ms/tick +5–15%, all 7 groups and 4 niches alive on all seeds.
- [x] Year-35 speciation and living-species targets met on all seeds.
- [ ] Year-35 all 7 groups alive: not met on any seed (see Risks); reported, not retuned.
- [x] Headless UI load: no console errors.
- [x] Slice 2 untouched (disease lethality, contact spread, bug K and crowding, locusts, scavengers).
