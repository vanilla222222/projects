# Part 2, slice 2 (disease, bugs, scavengers): audit

## Files changed

- `js/sim/animals.js`: `RES_COST` 0.1, `SICK_DEATH` stays 0.005 after tuning, new `RES_EFFECT` 0.85, `CROWD_K` 0.5, `CROWD_N` 6, `SCAV_LURE`, `SCAV_BITE`, `SCAV_SAMPLES`, `SCAV_RANGE`, `SCAV_HUNT`. Scavenger forage in `_pickForage`, a carrion-seek branch in `step`, the scavenger hunt threshold, the scavenger carrion bite, the `carrionEnergy` and `scavEnergy` counters, and crowding in `_contact` (preallocated `_contactBuf`).
- `js/sim/disease.js`: `VIR_TRADE` 0.75, `SEED_HOSTS` 10, `EMERGE_P` 0.05, new `EMERGE_VIR` 0.45 used in `emerge`, and `exposeAnimal` uses `RES_EFFECT`.
- `js/sim/bugs.js`: new `BUG_K_SCALE` 0.7, `BUG_CROWD` 1.5 and `LOCUST_GAP` 480. Locust constants changed to 0.3, 0.4, 0.3 and cooldown 1440. `_lastSwarm` is a world-wide swarm gap, and the mortality term now includes crowding.
- `js/sim/ecosystem.js`: `DISEASE_EVERY`, `DISEASE_WINDOW` and `OUTBREAK_MIN_POP`. Emergence now runs from `step` on its own `tick % 60` check (removed from `_migrations`). New `_diseaseStats`. New `stats.diseaseShare`, `worstOutbreak`, `swarms` and `carrionShare`. Relaxed predator and scavenger revival triggers.
- `CODE_REFERENCE.md`: the Animals, Bugs, Disease and Ecosystem sections. Soil was not touched.
- `complexities.md`: the `ecosystem.js` description (outbreak tracking, relaxed revival, emergence). No score changes.
- `feature-research/ecosystem-v2/part2/audit-slice2.md` (this file) and `screenshots/before-after.png`, `screenshots/year35.png`.

Scratchpad only, not in the repo:
- `part2run2.js`: the runner. It adds a 2400-tick checkpoint and prints `RESULT` JSON.
- `sum2.py`, `tab2.py` and `mkba.py`: summaries and the before/after table.
- `scavsrc.js` and `locdiag*.js`: diagnostics.
- `p2probe35.html`: the in-page probe for year 35.
- `p2s1/js`: the slice-1 state rebuilt, used for the "after slice 1" column.
- `p2base/js`: the pre-slice-1 baseline.

## What was done, per plan item

### 2a. Disease

**Implemented as planned:**
- The emerged strain virulence is 0.45.
- The resistance factor is `1-0.85*res`, for both infection and sickness death.
- `RES_COST` is 0.1.
- Emergence has its own 60-tick check, gated only by `options.disease`.
- `EMERGE_P` is 0.05 and `SEED_HOSTS` is 10.
- Crowding reuses the in-range count in `_contact`. The loop now scans the whole cell to count neighbours, but there is still only one loop and no allocation.
- `diseaseShare` and `worstOutbreak` are implemented.

**The plan's starting values were far too lethal once slice 1 had landed.** With `SICK_DEATH` 0.01, `VIR_TRADE` 0.5, `CONTACT_R` 2, `CONTACT_MAX` 6 and `CROWD_K` 1, the rolling share was 15–33% at year 10 and 27–52% at year 20 on every seed. The cause was jump strains multiplying through crab and omnivore booms. Six variants (V0–V5) were tried. The final values are:
- `SICK_DEATH` 0.005 (−50%);
- `VIR_TRADE` 0.75 (+50% against the plan's 0.5);
- `CONTACT_R` 1.5 and `CONTACT_MAX` 3 (−25% and −50% against the plan, i.e. unchanged from before);
- `CROWD_K` 0.5 (−50%).

**Results for the final code, year-35 runs, seeds 42 / 7 / 123:**

| Target | Year 10 | Year 20 | Year 35 | Met? |
| --- | --- | --- | --- | --- |
| Rolling disease share 5–15% | 0.0 / 3.9 / 7.5% | 2.4 / 13.1 / 12.2% | 19.8 / 14.0 / 16.9% | **4 of 9 checkpoints.** Early years are too quiet on 42 and 7, and year 35 runs slightly hot on 42 and 123. Slice 1 alone gave 3.3–33.9%, and the baseline cumulative share was 21–29% at year 35. |
| A species with peak ≥ 30 halved by an outbreak | | | 7 / 12 / 5 species | **Yes, on all seeds.** Seed 123 first reaches this by year 35. Its year-9 outbreak cut Abyssirhynchus from 3358 to 1754, just short of half. |
| Resistance of the most-infected species rises from year 5 to year 35 | | | | **Not met.** The species most infected at year 5 went 0.156 → 0.108 (42), 0.107 → 0.106 (7), and 0.154 → extinct (123). The species with the most cumulative infections rose only on 123 (Abyssirhynchus 0.128 at year 10 → 0.172). The mean over all animals went 0.148 → 0.124, 0.140 → 0.131 and 0.149 → 0.177. |
| All 7 animal groups alive | | | Yes on all seeds | **Yes at year 35.** Seed 42 had 0 land scavengers at year 10, and a scavenger migration revived them by year 20. |

### 2b. Bugs crowd less

**What was implemented:**
- `K*BUG_K_SCALE`.
- Crowding mortality.
- A per-species cooldown of 1440 ticks.
- A global gap of 480 ticks (`LOCUST_GAP`, `_lastSwarm`).
- `stats.swarms`.
- The trigger already ran before the K-decline, using the density at the start of the step. It is unchanged apart from the global-gap test.

**Tuning:**
- `BUG_K_SCALE` 0.6 with `BUG_CROWD` 2 gave about −50% at year 10, so they were set to 0.7 and 1.5.
- Seed 123 loses its swarm-prone lineage (gene 0.75) by year 4, and after that the highest pest swarm gene is about 0.42. With K scaled down, pest density never reaches the plan's 0.55. Offline threshold sweeps (`locdiag3.js`) led to:
  - `LOCUST_SWARM_GENE` 0.6 → 0.4;
  - `LOCUST_DENSITY` 0.85 → 0.3;
  - `LOCUST_BARE` 0.05 → 0.3.

**Results, seeds 42 / 7 / 123:**
- **Total bug mass against baseline:**

  | Year | Seed 42 | Seed 7 | Seed 123 |
  | --- | --- | --- | --- |
  | 10 | −43% | −43% | −39% |
  | 20 | −52% | −41% | −45% |
  | 35 | −51% | −45% | −69% |

  The total is inside the band on 5 of 9 checkpoints and at −51 to −52% on two more. Per niche it is uneven:
  - Detritivores reach −94% and −98% at year 35 on seeds 42 and 123, down to 622 and 343 tiles, so they are alive but thin.
  - Parasites range from −82% to +6%.
- **Swarms by year 35:** 20 / 13 / 8. The total is 3 / 4 / 0 at year 10 and 10 / 7 / 2 at year 20. There is at least one swarm on every seed, but seed 42 is above the 2–15 band.
  - A `LOCUST_GAP` of 720 (+50%) was tried on all three seeds. Seed 42 still had 19 swarms, and it lost its land scavengers at year 35, so 480 was kept.
- **Plant cover** stays within 1.2% of baseline at every checkpoint (worst: 123 at year 35, −1.17%).
- **All 4 niches** are alive at every checkpoint.

### 2c. Scavengers seek carrion

**Implemented as planned:**
- The lure is multiplied by `1+3*scav`.
- Scavengers take 12 samples over 1.5× their range.
- A carrion-seek branch runs before plant forage. It only commits to movement when the chosen target has carrion. Otherwise it falls through to the plant branch, so scavengers can still graze.
- The carrion bite is `bite*(1+2*scav)`.
- Scavengers only hunt below 35% energy.
- The `carrionEnergy` / `scavEnergy` counters are in place, and `stats.carrionShare` reports them.

**Result: carrion share of land-scavenger energy (cumulative):**

| Year | Seed 42 | Seed 7 | Seed 123 |
| --- | --- | --- | --- |
| 10 | 13.3% | 12.1% | 13.4% |
| 20 | 10.3% | 8.1% | 12.4% |
| 35 | 8.7% | 6.9% | 8.9% |

- Slice 1 alone gave about 3% and the baseline has no counter, so the share is about 3–4× higher.
- The interval share over years 5–10 was 18–20%.
- **The 25% target is not met.** No variant within ±50% reached 25% at 3000 ticks.
- `scavsrc.js` shows land scavengers still get 74–82% of their energy from grazing. Random-point forage samples rarely land on the sparse carrion tiles.
- Scavengers stay alive at year 35: 49 / 52 / 532.

### Performance and gates

**ms/tick at 3000 ticks, same load (new vs `p2base`, run together):**

| Seed | New | Baseline | Change |
| --- | --- | --- | --- |
| 42 | 26.8 | 27.0 | −1% |
| 7 | 29.4 | 26.6 | +11% |
| 123 | 32.0 | 28.2 | +13% |

This is within +25% on every seed. The machine was under load, which is why the absolute numbers are above `baseline.md`.

**Year-35 ms/tick:**
- The final runs gave 46.5 / 48.1 / 48.4 against the baseline runs' 55.4 / 56.5 / 60.5. Both were measured with about 12 processes on 12 cores.
- The `LOCUST_GAP` 720 runs finished under light load and gave 34.8 / 35.3 / 34.8, which is at or below `baseline.md`'s 35–37. The plan expected a sharper drop, but the live strain count is now 11–37 instead of 465–642, so the remaining cost is animals, not strains.

**Groups at 3000 ticks** (runs to year 7): all 7 groups and all 4 niches are alive on all seeds.

## Before and after

`baseline` is `p2base`, `slice 1` is `p2s1`, and `slice 2` is the final code. `dis 1y` is the rolling one-year disease share (the baseline has no rolling stat, so its cumulative share is shown in brackets). `bug` is the summed mean density over the four niches. Groups are listed as land H/O/C/S | water H/O/C.

| Seed | Year | Build | dis 1y (cum) | Halved | Bug | Swarms | Carrion | Cover | Strains | Groups |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 42 | 10 | baseline | – (7.5%) | – | 0.443 | 0 | – | 59920 | 25 | 585 690 157 1 \| 1536 246 24 |
| 42 | 10 | slice 1 | 3.3% (1.5%) | 4 | 0.481 | 0 | 3.1% | 59709 | 5 | 1541 104 110 1 \| 3147 211 44 |
| 42 | 10 | slice 2 | 0.0% (0.9%) | 3 | 0.252 | 3 | 13.3% | 59864 | 4 | 1128 250 95 0 \| 4012 66 2 |
| 42 | 20 | baseline | – (27.0%) | – | 0.509 | 5 | – | 59904 | 270 | 123 670 146 6 \| 3874 2148 8 |
| 42 | 20 | slice 1 | 9.3% (4.7%) | 5 | 0.544 | 21 | 2.9% | 59708 | 14 | 580 2134 123 26 \| 2010 2104 8 |
| 42 | 20 | slice 2 | 2.4% (1.3%) | 4 | 0.243 | 10 | 10.3% | 59771 | 8 | 1270 1050 35 93 \| 4005 515 13 |
| 42 | 35 | baseline | – (29.1%) | – | 0.492 | 135 | – | 59902 | 539 | 104 1081 79 57 \| 389 5267 5 |
| 42 | 35 | slice 1 | 25.4% (12.8%) | 6 | 0.570 | 135 | 2.9% | 59818 | 80 | 2 1329 114 0 \| 5 5529 0 |
| 42 | 35 | slice 2 | 19.8% (8.9%) | 7 | 0.239 | 20 | 8.7% | 59784 | 11 | 42 2691 126 49 \| 33 4042 1 |
| 7 | 10 | baseline | – (2.1%) | – | 0.432 | 0 | – | 59933 | 9 | 838 390 79 592 \| 1224 666 99 |
| 7 | 10 | slice 1 | 0.0% (0.5%) | 2 | 0.447 | 0 | 2.7% | 59869 | 3 | 1866 195 171 4 \| 1095 389 186 |
| 7 | 10 | slice 2 | 3.9% (1.9%) | 5 | 0.245 | 4 | 12.1% | 59829 | 4 | 677 119 92 4 \| 2240 218 61 |
| 7 | 20 | baseline | – (12.7%) | – | 0.504 | 20 | – | 59932 | 226 | 811 610 76 680 \| 1773 2961 68 |
| 7 | 20 | slice 1 | 22.7% (7.0%) | 7 | 0.468 | 62 | 3.1% | 59899 | 26 | 66 1239 130 776 \| 911 3847 12 |
| 7 | 20 | slice 2 | 13.1% (10.9%) | 9 | 0.297 | 7 | 8.1% | 59841 | 26 | 264 1034 66 143 \| 1163 4292 23 |
| 7 | 35 | baseline | – (21.0%) | – | 0.596 | 158 | – | 59878 | 465 | 35 1725 6 633 \| 321 4193 62 |
| 7 | 35 | slice 1 | 23.5% (14.9%) | 9 | 0.601 | 233 | 2.7% | 59814 | 27 | 104 2380 0 586 \| 136 3780 2 |
| 7 | 35 | slice 2 | 14.0% (13.0%) | 12 | 0.326 | 13 | 6.9% | 59787 | 37 | 16 1000 86 52 \| 9 5623 192 |
| 123 | 10 | baseline | – (0.5%) | – | 0.396 | 0 | – | 59723 | 63 | 542 857 90 3 \| 3443 496 19 |
| 123 | 10 | slice 1 | 18.2% (8.9%) | 3 | 0.434 | 0 | 2.9% | 59749 | 11 | 367 554 111 250 \| 2634 923 10 |
| 123 | 10 | slice 2 | 7.5% (3.5%) | 0 | 0.241 | 0 | 13.4% | 59830 | 7 | 761 895 173 143 \| 3229 239 40 |
| 123 | 20 | baseline | – (20.3%) | – | 0.469 | 0 | – | 59922 | 409 | 117 898 60 85 \| 4162 1632 28 |
| 123 | 20 | slice 1 | 23.6% (14.1%) | 6 | 0.434 | 0 | 2.9% | 59906 | 13 | 72 761 33 141 \| 1881 4087 8 |
| 123 | 20 | slice 2 | 12.2% (4.5%) | 0 | 0.256 | 2 | 12.4% | 59918 | 10 | 96 1008 13 365 \| 2989 2463 46 |
| 123 | 35 | baseline | – (27.1%) | – | 0.562 | 0 | – | 59930 | 642 | 23 2433 3 0 \| 673 3845 6 |
| 123 | 35 | slice 1 | 33.9% (21.4%) | 9 | 0.526 | 0 | 2.2% | 59566 | 24 | 15 1087 0 660 \| 112 5110 2 |
| 123 | 35 | slice 2 | 16.9% (8.4%) | 5 | 0.175 | 8 | 8.9% | 59226 | 19 | 125 1069 8 532 \| 6 5074 177 |

**Missing groups at year 35:**
- Slice 1 loses a group on every seed: land scavengers and water predators on 42, and land predators on 7 and 123.
- Slice 2 keeps all 7 groups on every seed.

**Watch items at year 35** (slice 2 vs baseline):
- Land herbivores: 42 / 16 / 125 against 104 / 35 / 23.
- Crabs (water omnivores): 4042 / 5623 / 5074 against 5267 / 4193 / 3845.
- Land scavengers: 49 / 52 / 532 against 57 / 633 / 0.

`screenshots/before-after.png` is the same table rendered as HTML.

## Deviations

**Constants moved within ±50% of the plan value:**

| Constant | Plan | Final |
| --- | --- | --- |
| `SICK_DEATH` | 0.01 | 0.005 (−50%) |
| `VIR_TRADE` | 0.5 | 0.75 (+50%) |
| `CONTACT_R` | 2 | 1.5 (−25%) |
| `CONTACT_MAX` | 6 | 3 (−50%) |
| `CROWD_K` | 1.0 | 0.5 (−50%) |
| `BUG_K_SCALE` | 0.6 | 0.7 (+17%) |
| `BUG_CROWD` | 2 | 1.5 (−25%) |
| `LOCUST_DENSITY` | 0.55 | 0.3 (−45%) |
| `LOCUST_BARE` | 0.2 | 0.3 (+50%) |

**Other deviations:**
- `LOCUST_SWARM_GENE` 0.6 → 0.4. The plan listed the gene threshold among the trigger values for the implementer to adjust, without a starting value. Without this change seed 123 never swarms.
- `SICK_DEATH` moved in the opposite direction to the plan's allowance ("may go up to 0.018"). It had to drop because disease was far too strong.
- The `diseaseShare` window is 8 checks of 60 ticks, i.e. 480 ticks (one year). If the total death counter is reset outside the ecosystem, the step is treated as a restart.
- A `worstOutbreak` entry closes when the host species stops being a live strain host. An extinct host counts as drop 1 unless it was merged.
- The carrion-seek branch only takes the step when the picked target has carrion. Otherwise the animal falls through to plant forage in the same tick. This keeps scavengers from starving when no carrion is in range.

## Migration finding

**Cause:**
- The revival triggers in `_migrations` required herbivore prey:
  - `landCarn === 0 && landHerb > 250`;
  - `waterCarn === 0 && waterHerb > 250`;
  - `landScav === 0 && landHerb + landCarn > 150`.
- Late in a run, herbivores collapse while omnivores and crabs take over. At year 35 in slice 1 there were 2 land herbivores and 5 water herbivores on seed 42, 104 land herbivores on seed 7, and 15 land herbivores on seed 123. Omnivores meanwhile ran to 1000–5500.
- So a lost predator or scavenger group never met its trigger. The rules did run; their conditions were never true.

**Fix:** only the trigger conditions were relaxed, so that omnivores count as prey:
- `landHerb + landOmni > 250`;
- `waterHerb + waterOmni > 250`;
- `landHerb + landOmni + landCarn > 150`.

Nothing else in `_migrations` changed, apart from moving emergence out as the plan required.

**Effect:**
- All 7 groups are alive at year 35 on every seed. Slice 1 lost 1–2 groups on every seed.
- Seed 42's land scavengers died out before year 10 and were revived by year 20 (0 → 93).
- Water predators on 123 recovered to 177.

## Risks

- **Disease is noisy year to year.** The rolling share swings between 0% and 20% depending on whether a strain is active. The 5–15% band holds at only 4 of 9 checkpoints. Year 35 still runs a little hot on seeds 42 and 123 (19.8% and 16.9%), because jump strains dominate late (9–35 live jump strains).
- **Resistance does not visibly rise.** The trait is too weakly selected at these death rates. It needs a design change (for example, stronger inheritance pressure), not more constant tuning.
- **Locusts:**
  - Seed 42 has 20 swarms by year 35, above the 15 cap.
  - Because the swarm gene threshold is now 0.4, some aphid-category pests (category threshold 0.6) can trigger swarms, which log as "locusts are swarming".
- **Detritivores fall to about 2–6% of baseline mass late** on seeds 42 and 123. They are alive, but a bad seed could lose the niche. Bug reintroduction still covers extinction.
- **Carrion share is 7–13%, not 25%.** Reaching the target would need scavenger forage to know where carrion is (a carrion index or a direct search), which is beyond the plan.
- **Browser and Node runs differ slightly on seed 42:** 18 swarms and 98 grazers in the browser vs 20 and 42 headless. The likely cause is that the app's own loop steps a few real-time ticks before the probe pauses it, so the runs diverge. This was not investigated further.

## Checklist

- [x] **No new comments.**
  - `diff -r scratchpad/p2base/js js | grep '^>' | grep -E '//|/\*'` is empty.
  - The same check against `p2s1/js/sim` is empty.
  - `git diff -- js | grep '^+' | grep -v '^+++' | grep -E '//|/\*'` is empty.
- [x] **Doc entries present.** `grep -c` on `CODE_REFERENCE.md` finds every one of these: `SCAV_LURE`, `SCAV_BITE`, `SCAV_SAMPLES`, `SCAV_HUNT`, `RES_EFFECT`, `CROWD_K`, `CROWD_N`, `_contactBuf`, `carrionEnergy`, `BUG_K_SCALE`, `BUG_CROWD`, `LOCUST_GAP`, `_lastSwarm`, `EMERGE_VIR`, `DISEASE_EVERY`, `DISEASE_WINDOW`, `OUTBREAK_MIN_POP`, `_diseaseStats`, `diseaseShare`, `worstOutbreak`, `carrionShare`, and "Seek carrion".
- [x] **Screenshots exist:**
  - `screenshots/before-after.png`.
  - `screenshots/year35.png`: seed 42 at tick 16800, the end of year 35 (the clock reads Year 36). It shows the Land species list and the population chart.
- [x] **Headless browser check.**
  - `cdp_shot.py` ran `p2probe35.html`, which loads `index.html#42` and steps the sim in-page to tick 16800.
  - It reported `errs []`, with no exceptions and no console errors.
  - The in-page stats at the end were `diseaseShare` 0.158, `swarms` 18 and `carrionShare` 0.113.
