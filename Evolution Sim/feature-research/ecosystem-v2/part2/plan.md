# Part 2 plan — disease threat, bugs crowd less, slower speciation, scavengers seek carrion

Source: roadmap Part 2, plus the Part 1 leftover (scavengers get only about 3% of their energy from carrion). No code comments anywhere. No UI work, which is Part 4, except that the new stats are exposed on `stats` so Part 4 can show them.

Baseline numbers for the current build are in `baseline.md` (seeds 42, 7 and 123, up to year 35). Every target below is measured against them.

## What the baseline showed (this changes the roadmap's assumptions)

| | Year 10 | Year 35 |
|---|---|---|
| Living plants / animals / bugs / strains | 70–91 / 27–36 / 11–16 / 9–63 | 251–283 / 107–108 / 17–23 / 465–642 |
| Ever created, plants / animals / strains | 77–97 / 54–67 / 20–87 | 346–416 / 680–702 / 2693–3502 |
| Disease share of animal deaths | 0.5–7.5% | 21–29% |
| Locust swarms (cumulative) | 0 | 135 / 158 / 0 |
| ms/tick | 18–19 | 35–37 |

- **Disease is too weak early and too strong late.** The late surge follows the strain explosion: each new strain dodges existing immunity, so the fix is mostly slice 1 (far fewer strains), plus steadier early outbreaks.
- **Locusts do fire eventually,** but constantly on two seeds and never on the third. The goal is "rare but present", not "make them fire".
- **ms/tick nearly doubles by year 35,** tracking the number of strains and species. Slice 1 should recover a lot of it.
- **Year-35 imbalance, not in the roadmap.** Land herbivores collapse to 23–104, crabs (`waterOmni`) explode to 3800–5300, and seed 123 loses land scavengers. This is only watched in Part 2 (see the gates) and not retuned, unless the disease and speciation changes fix it on their own. If they don't, it's reported as a Part 3 input, since herds and drinking change herbivores anyway.

## Slice 1 — speciation (goes first, because species counts affect disease tuning)

Files: `js/sim/core.js`, `plants.js`, `animals.js`, `bugs.js`, `disease.js`, `ecosystem.js`.

1. **Compare against the living species mean, not the founder.** At the speciation checks (plants.js `_assign` ~749, animals.js `_reproduce` ~789, bugs.js `_assign` ~549), compare the child with `sp.mean`, falling back to `sp.genome` when there is no mean yet.
   - A lineage that drifts together stays one species. Only a sub-population that diverges splits off.
   - Make sure `sp.mean` is refreshed on a regular cadence for plants, animals and bugs; reuse the existing `refreshSpeciesMeans` paths.
   - Strains already drift their mean. They keep that, but the check at disease.js:163 compares with `st.mean`.
2. **Higher thresholds.**
   - `PLANT_SPECIATION` 0.13 → 0.2.
   - `ANIMAL_SPECIATION` 0.12 → 0.18.
   - `BUG_SPECIATION` 0.14 → 0.2.
   - `DISEASE_SPECIATION` 0.12 → 0.2.
   - `PATHO_MUT` 0.03 → 0.015.
3. **Minimum population and age before a split.** A child can only found a new species if its parent species has `population >= SPLIT_MIN_POP` and has existed for at least `SPLIT_MIN_AGE` ticks. Otherwise the child stays in the parent species.
   - `SPLIT_MIN_POP`: plants 40 cells, animals 12, bugs 40 tiles, strains 10 hosts.
   - `SPLIT_MIN_AGE`: 480 ticks (1 year) for every kind.
4. **Wider daughter matching.** `registry.matchDaughter` (core.js:172) also searches the parent's siblings (its own parent's living children), and the match factor goes from 0.8 to 1.0 at all four call sites.
5. **Merge tiny offshoots back into the parent.** Every 120 ticks, in `ecosystem.js`:
   - A species merges back into its parent if its parent is alive, it is younger than 2 years, and its population is at or below the threshold: plants 6 cells, animals 2, bugs 6 tiles, strains 2 hosts.
   - Merging reassigns every member's species id to the parent. Plants use the slot species arrays, animals use `species[i]`, bugs use `species[niche*n+i]`, and strains use host strain ids plus the carcass and vector planes if they hold a strain id.
   - Registry counts are moved with `remove` and `add`. The child is marked extinct with `sp.merged = parentId`, and it gets no "extinct" log line.
   - New `registry.merge(child, parent)` helper in core.js for the bookkeeping. Each layer gets a small `reassignSpecies(fromSp, toSp)` method.
6. **Speciation counters.** `registry.speciations` counts per group (plant, animal, bug, pathogen), incremented only for origin `'speciation'` or mutation, never for founders, migrants, emergence or jumps. It is exposed as `stats.speciations`.

**Slice 1 target**, at year 35 against baseline on all three seeds:
- at least 5x fewer speciation events per group;
- at least 3x fewer living plant species and strains.

The before and after numbers go in the audit.

## Slice 2 — disease threat, bugs, scavengers (after slice 1)

Files: `js/sim/disease.js`, `animals.js`, `bugs.js`, `ecosystem.js`.

### 2a. Disease

Goal: a steady threat, rather than too weak early and runaway late.

- **Lethality.** Start from these values and tune them after slice 1 lands:
  - `SICK_DEATH` stays at 0.01 unless the year-10 share is below 5% after the other changes. It may go up to 0.018.
  - The mean virulence of emerged strains goes from 0.35 to 0.45.
  - `VIR_TRADE` 0.6 → 0.5.
- **Contact spread:**
  - `CONTACT_R` 1.5 → 2.
  - `CONTACT_MAX` 3 → 6.
- **(+) Density dependence:** the per-contact chance is multiplied by `1 + CROWD_K*min(1, neighbours/CROWD_N)`, with `CROWD_K` 1.0 and `CROWD_N` 6, where `neighbours` is the in-range count already found in `_contact`. This gives it no extra loop.
- **Resistance that visibly rises:**
  - `RES_COST` 0.2 → 0.1.
  - The resistance factor on infection and death goes from `(1-0.7*res)` to `(1-0.85*res)`.
- **Emergence on its own switch.** Move `maybeEmerge` out of `_migrations` into its own `tick % 60` check, gated only by `options.disease`.
  - `EMERGE_P` 0.04 → 0.05.
  - `SEED_HOSTS` 6 → 10.
- **New stats:**
  - `stats.diseaseShare`: disease deaths as a share of all animal deaths over a rolling 1-year window.
  - `stats.worstOutbreak`: the largest drop in a single species' population during an active outbreak over the last year.
- **Tuning.** The implementer may adjust these values within ±50% to hit the targets:
  - disease causes 5–15% of animal deaths, measured as a rolling share at years 10, 20 and 35, not just cumulatively;
  - at least one outbreak on each seed halves a species (population of 30 or more before it);
  - the mean resistance of the most-infected species rises from year 5 to year 35;
  - all 7 animal groups are alive.

### 2b. Bugs crowd less
- **Lower carrying capacity:** K = fit·food·`BUG_K_SCALE`, with `BUG_K_SCALE` 0.6.
- **Self-limiting mortality:** mortality becomes `mort*(0.5+app)*(1+BUG_CROWD*d)`, with `BUG_CROWD` 2.
- **Locust swarms: rare but present.** The baseline had 135, 158 and 0 over 35 years.
  - The trigger is evaluated before the K-decline, using the density at the start of the step, so it no longer depends on luck with the ordering.
  - Swarms become outbreak events: a per-species cooldown `LOCUST_COOLDOWN` 40 → 1440 ticks (3 years), and a global cooldown of 480 ticks.
  - The trigger thresholds are tuned so seed 123 also reaches one. The starting values are `LOCUST_DENSITY` 0.85 → 0.55 and `LOCUST_BARE` 0.05 → 0.2. The implementer adjusts them.
  - New `stats.swarms`.
- **Targets:**
  - total bug mass per niche is 30–50% below baseline;
  - 2–15 swarm events per seed over 35 years, with at least 1 on every seed;
  - all 4 niches are alive;
  - plant cover stays within 5% of baseline.

### 2c. Scavengers seek carrion (Part 1 leftover)
- In `_pickForage`, the carrion lure is multiplied by `(1+3*scav)`. When `scav > 0.5`, the forager takes 12 samples instead of 8 over a radius of `range*1.5`.
- A new branch before the plant-forage branch: when `scav > 0.5`, energy is below 92% of the maximum, and the current tile has no carrion, call `_pickForage`, so the animal walks to carrion.
- The carrion bite becomes `bite*(1+2*scav)`.
- Hunting is only attempted by animals with `scav > 0.5` when energy is below 35% of the maximum, instead of 60%.
- New counters `A.carrionEnergy` and `A.scavEnergy` (all energy gained by land scavengers), exposed as `stats.carrionShare`.
- **Targets:**
  - carrion supplies at least 25% of land scavenger energy on all seeds;
  - scavengers stay alive;
  - no other group collapses.

## Tests and gates

- A scratchpad runner reports, on seeds 42, 7 and 123:
  - speciation events and living species per group at years 10, 20 and 35;
  - `diseaseShare`, `worstOutbreak`, resistance trend, bug mass per niche, `swarms`, `carrionShare`, ms/tick and all group counts.
- Every gate from the roadmap applies:
  - ms/tick within +25% of baseline at 3000 ticks (baseline about 17–19);
  - year-35 ms/tick at or below baseline (35–37), which is expected to drop sharply;
  - all 7 animal groups and all 4 bug niches are alive at 3000 ticks and at year 35.
- A 35-year run takes about 10–15 minutes per seed. The implementer runs the three seeds in parallel, and uses 3000-tick runs for fast tuning iterations before the final year-35 runs.
- The watch items are reported but don't fail the gate: land herbivores, crab and land-scavenger counts at year 35 against baseline.
- A headless browser run on seed 42 must show no console errors.

## Screenshots (`feature-research/ecosystem-v2/part2/screenshots/`)

This is a sim-only change, so the screenshots are:
1. `before-after.png`: a terminal-style table (rendered HTML) of baseline vs. new numbers for all three seeds.
2. `year35.png`: the app at year 35 on seed 42, showing the shorter species list and the population chart.

## Docs

- `CODE_REFERENCE.md`: the Core/Registry (`merge`, sibling matching, `speciations`), Plants, Animals, Bugs, Disease and Ecosystem sections.
- `complexities.md`: `core.js` 5 → 5.5, and `ecosystem.js` gets a merge-pass note.

## Out of scope

- Any UI for the new stats (Part 4).
- Herds, territory and weather (Part 3).
- Changes to plant blight, apart from the strain speciation constants it shares.
- New code comments.
