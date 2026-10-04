# Part 2 item 1: balance pass audit

This pass changed constants only. There are no new features and no logic changes. Base is commit 8c5119e, with all eleven Part 1 slices merged. Everything ran headless in Node on the CPU path: map 320×210, seeds 42, 7 and 123, 3000 ticks each.

- **Averages** are taken every 100 ticks over ticks 1000–3000.
- **Minima** are taken every 100 ticks from tick 500.
- **Test runs:** three. Run 1 tested base, v1 and v2. Run 2 tested v3 and v4. Run 3 was the final comparison, plus one save/load determinism check.

## Constants changed

| Constant | File | Base | New | Why |
|---|---|---|---|---|
| `FLY_META` | animals.js | 1.3 | 1.2 | Flight upkeep was starving birds |
| `BIRD_CROWD` | animals.js | 8 | 10 | Bird breeding cap was too tight |
| `BIRD_PREY` | animals.js | 0.8 | 1 | Raptors can take prey up to their own mass |
| `FISHER_RANGE` | animals.js | 1.5 | 2 | Fishers search farther |
| `TOX_HIT` | animals.js | 0.25 | 0.15 | Toxic prey hit predators, birds especially, too hard |
| `TOX_COST` | animals.js | 0.1 | 0.06 | Toxic models were dying out |
| `MODEL_POP` | animals.js | 6 | 4 | A smaller toxic species can stay a model |
| `CLEAN_PAIR_SHARE` | animals.js | 0.4 | 0.25 | Cleaner pairs were rare |
| `CLEAN_SPEC` | animals.js | 0.45 | 0.3 | Stronger pull toward the paired host |
| `DISP_SPLIT_P` | animals.js | 0.03 | 0.2 | Dispersal splits were rare |
| `DISP_SPLIT_POP` | animals.js | 30 | 20 | Same reason |
| `ANIMAL_SPECIATION` | animals.js | 0.18 | 0.15 | Family tree was nearly flat |
| `BRAIN_COST` | animals.js | 0.25 | 0.15 | Brain was decaying |
| `TOOL_MIN` | animals.js | 0.42 | 0.35 | Tool use was rare |
| `MEM_WATER_REC` | animals.js | 0.9 | 0.99 | Water memory was barely written |
| `FAT_RATE` | animals.js | 0.01 | 0.02 | About 90% of animals were lean |
| `FAT_STORE` | animals.js | 0.6 | 0.52 | Same reason |
| `FAT_BURN` | animals.js | 0.5 | 0.42 | Same reason |
| `AMPH_DRY` | animals.js | 2 | 1.6 | Amphibians crashed in dry spells |
| `NEED_ECTO` | animals.js | 0.8 | 0.7 | Same reason |
| `SCAV_RANGE` | animals.js | 1.5 | 2.5 | Land scavengers find carrion |
| `INVERT_BUG` | animals.js | 1.6 | 1.3 | Spiders were taking too many bugs from insect birds |
| `RES_COST` | animals.js | 0.1 | 0.05 | Resistance was too expensive to rise |
| `RES_NUDGE` | animals.js | 0.02 | 0.05 | Recovered parents pass on more resistance |
| `SICK_DEATH` | animals.js | 0.005 | 0.01 | Puts resistance back under selection |
| `FIRE_COST` | plants.js | 0.12 | 0.06 | The fire gene was too costly to spread |

`FIRE_COST` is used only in the CPU plant trait formula. The GPU plant kernels do not read it, so nothing needed mirroring. `PlantLayer.step` and the soil step are unchanged.

## Variants tried

| Variant | Contents | Result |
|---|---|---|
| v1 | Birds, symbiosis, brain, fat, disease and fire constants | Birds recovered on seed 42 only. Amphibians on seed 42 ended at 23. |
| v2 | v1 plus `INVERT_BUG`, `ANIMAL_SPECIATION`, `DISP_SPLIT_POP` | Birds 147–239. Speciations 3–5. Lean share unchanged at about 0.88. Amphibian minimum on seed 42 was 11. |
| v3 | v2 plus the amphibian, fat, tool, resistance and bird-reach changes above | Best on class floors. Amphibian minima 56–80. Chosen. |
| v4 | v2 plus a stronger alternative: `TOOL_MIN` 0.3, `FAT_*` 0.5/0.4, `TAD_FOOD` 2.2, `RES_COST` 0.02, `MODEL_POP` 4 | Birds fell to 85 on seed 7 (insect niche minimum 2). Amphibian minimum on seed 42 was 7. Rejected. |

The final config is v3 plus `MODEL_POP` 4 from v4 and `DISP_SPLIT_P` 0.2.

## Results: classes, base → final (averages)

| Class | Seed 42 | Seed 7 | Seed 123 |
|---|---|---|---|
| fish | 757 → 975 | 1280 → 1183 | 1410 → 1167 |
| amphib | 89 → 124 | 51 → 329 | 314 → 154 |
| reptile | 504 → 441 | 377 → 237 | 320 → 445 |
| mammal | 1111 → 1349 | 1498 → 1268 | 1344 → 1508 |
| bird | 127 → 235 | 102 → 175 | 149 → 168 |
| invert | 2233 → 1231 | 1501 → 1229 | 2379 → 1929 |

## Results: class minima, base → final

| Class | Seed 42 | Seed 7 | Seed 123 |
|---|---|---|---|
| fish | 166 → 209 | 274 → 242 | 552 → 626 |
| amphib | 24 → 56 | **3** → 80 | 178 → 35 |
| reptile | 94 → 106 | 65 → 57 | 136 → 125 |
| bird | 74 → 98 | 53 → 54 | 64 → 125 |
| invert | 313 → 178 | 277 → 283 | 522 → 387 |

## Results: bird niches, base → final

| Niche | Seed 42 (avg / min) | Seed 7 (avg / min) | Seed 123 (avg / min) |
|---|---|---|---|
| seed | 38/9 → 92/39 | 32/3 → 23/5 | 34/3 → 50/11 |
| insect | 48/8 → 100/8 | 40/11 → 115/5 | 63/5 → 65/21 |
| fisher | 10/**0** → 13/2 | 12/3 → 13/4 | 13/1 → 12/3 |
| raptor | 11/1 → 12/2 | 10/4 → 12/3 | 12/**0** → 14/3 |
| carrion | 20/5 → 18/5 | 8/3 → 12/5 | 26/7 → 27/9 |

## Results: feature health, base → final

| Metric | Seed 42 | Seed 7 | Seed 123 |
|---|---|---|---|
| ms/tick (same machine, same run) | 39.8 → 37.8 | 41.1 → 39.2 | 41.5 → 41.3 |
| living animal species | 32 → 33 | 32 → 31 | 34 → 36 |
| animal speciations | 0 → 1 | 2 → 1 | 2 → 6 |
| extinct animal species | 73 → 61 | 59 → 54 | 56 → 55 |
| migrated (revived) species | 71 → 60 | 55 → 50 | 55 → 52 |
| lean share | 0.92 → 0.83 | 0.89 → 0.82 | 0.85 → 0.84 |
| heavy + obese | 44 → 119 | 77 → 117 | 176 → 97 |
| toxic models | 2 → 2 | 2 → 2 | 2 → 2 |
| mimic species | 2 → 2 | 2 → 2 | 2 → 4 |
| cleaner pairs | 0 → 1 | 2 → 1 | 2 → 2 |
| dispersal splits | 0 → 1 | 2 → 1 | 2 → 6 |
| mean brain | 0.084 → 0.114 | 0.099 → 0.116 | 0.091 → 0.102 |
| mammal / bird brain | 0.25/0.39 → 0.27/0.38 | 0.25/0.36 → 0.24/0.41 | 0.25/0.42 → 0.26/0.42 |
| tool-using species | 4 → 7 | 6 → 6 | 4 → 8 |
| tool uses | 562 → 973 | 452 → 532 | 646 → 901 |
| trips from water memory | 11 → 27 | 12 → 30 | 33 → 46 |
| carrion share of scavenging | 0.63 → 0.60 | 0.64 → 0.57 | 0.56 → 0.56 |
| mean resistance at end (start 0.156) | 0.146 → 0.143 | 0.149 → 0.159 | 0.156 → 0.155 |
| resistance of most-infected species (founder 0.15) | 0.151 → 0.150 | 0.161 → 0.196 | 0.147 → 0.184 |
| disease share of deaths | 0.0% → 0.3% | 0.8% → 0.2% | 0.8% → 0.1% |
| fire gene: start / global end / burn scars | 0.221/0.221/0.236 → 0.221/0.221/0.227 | 0.251/0.254/0.285 → 0.251/0.256/0.256 | 0.161/0.162/0.253 → 0.161/0.159/0.104 |
| trees (land plant slots) | 22.7k → 25.0k | 12.3k → 13.8k | 25.2k → 26.8k |
| grass | 31.7k → 33.1k | 31.3k → 31.3k | 30.3k → 29.9k |
| plant cover | 63.1k → 63.7k | 63.1k → 63.0k | 63.8k → 63.9k |
| plant biomass | 39.6k → 42.5k | 41.1k → 44.2k | 51.1k → 52.4k |

- **Migrated species** is counted from the species registry: animal species with `origin === 'migrated'`, meaning revived by `_migrations`. The event log is capped, so it undercounts.
- **Resistance of the most-infected species** is the mean resistance gene of the species with the most infected animals in samples taken every 500 ticks.

**Determinism:** `det.js 42 1500 500` on the final code passes. Stats are equal, the full state is equal (16,685,250 values) and the RNG states are equal. `SAVE_VERSION` stays 2, and no new classes or grids were added.

## Verdict per goal

- **No class near extinction.** Met.
  - The worst class floor rose from 3 (amphibians, seed 7) to 35.
  - The fisher and raptor floors of 0 are gone, but both still dip to 2–4 even though they average 12–14.
  - Every bird niche averages at least 12.
  - Birds average 168–235, inside the slice-8 target of about 170–275, except seed 123 just below it at 168.
- **Stable populations.** Partly met.
  - Amphibians still swing by seed (124–329) but no longer crash.
  - Invertebrates average 25–45% lower because insect birds now take a share of the bugs. Their floor stays at 178 or above.
- **Family tree.** Improved on two seeds.
  - Living species are steady at 31–36. Extinctions are down.
  - Every speciation in the headless runs comes from dispersal splits, not from gene distance. Speciations went from 0/2/2 to 1/1/6.
- **Disease resistance rising under pressure.** Met where pressure exists.
  - The most-infected species climbs from 0.150 to 0.184–0.196 on two seeds.
  - The population-wide mean stays flat, which is expected because disease causes under 1% of deaths over 3000 ticks.
- **Land scavengers and carrion.** Carrion is about 56–60% of scavenger food, against 56–64% at base. `SCAV_RANGE` 2.5 did not raise it, but it did not hurt either.
- **Lean share.** Down from 0.85–0.92 to 0.82–0.84, and heavy animals are more common. The target of a clearly mixed body condition is only partly met.
- **Toxic models.** Two per seed hold in the final run on all seeds.
- **Brain and tools.** Mammal brain holds at about 0.25 instead of decaying. Mean brain is up 10–35%. Tool-using species went from 4–6 to 6–8 and tool uses rose. Tool use is no longer rare.
- **Water memory.** Trips from memory rose about 1.5–2.5 times, but remain small next to food memory (2000+).
- **Fire gene.** No clear selection, globally or in burn scars. Halving `FIRE_COST` removed most of the growth penalty, but fires are too rare over 3000 ticks (2–9 per run) to select for the gene.
- **Tree and grass targets.** Trees are 2–12% more common. Grass is about the same, and cover is unchanged.
- **ms/tick.** Did not rise: 1–5% lower, because there are fewer invertebrates.

## Open issues

1. **WebGPU biomass and bug bias, +5–10%.** Not investigated in this pass because it needs a browser with WebGPU. `compute/audit-phase2.md` names the likely cause: grazing reads biomass that is one tick stale. The lever is in `js/gpu/plantGpu.js`, which should apply the grazing deltas before the growth dispatch rather than after readback. The constants in this pass do not touch the GPU path, so the bias should be unchanged.
2. **Revivals.** `_migrations` revives 50–60 species per seed over 3000 ticks, about the same as base. Most are seed and insect birds and mammals. The class floors above are partly propped up by this rescue. A stricter test would turn off revival (`BIRD_REVIVE`) and measure true persistence.
3. **Raptors and fishers** average 12–14, but their minima are 2–4. Going further means more fish near shore or a lower fisher upkeep, not more range.
4. **Speciation by gene distance** never fires within 3000 ticks, even at 0.15. The family tree depends on dispersal splits. Run longer, or look at the split-age and split-population gates, before lowering the threshold further.
5. **Water memory** is still minor because most animals live near water. A real test needs drought-heavy seeds.
6. **Fire gene selection** needs longer runs with more fires. Whether trees and grass hold their share past 3000 ticks was not checked.
7. **`SICK_DEATH` at 0.01** is back at the plan value. The earlier Part 2 tuning halved it because disease reached 15–52% of deaths by years 10–20. Disease stays at 0.1–0.3% of deaths over 3000 ticks here, but the long-run disease share should be rechecked.
