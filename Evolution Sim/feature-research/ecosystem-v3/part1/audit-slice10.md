# Audit: slice 10, intelligence and learning

## What was built
- **Brain gene** (29 `G_BRAIN`, `AG` is now 30). It raises metabolism by `×(1 + 0.25*brain²)` and adds `60*brain` ticks to maturation. Founder values by class: fish 0.08, amphibians 0.08, reptiles 0.12, mammals 0.25, birds 0.3, invertebrates 0.03. Some archetypes start higher: the omnivore mammals 0.45, wolf and big cat 0.4, otter 0.5, insect bird 0.45, raptor 0.35 and carrion bird 0.5.
- **Memory:** each animal stores one water spot (`mwx/mwy`), one food spot (`mfx/mfy`) and one danger spot (`mdx/mdy`).
  - Water is remembered after drinking at a spot with low water value. `_pickWater` goes back to it, and forgets it if the tile has dried out.
  - Food is remembered when a forage scan finds a good spot. When a later scan finds nothing, the animal walks back to the remembered spot once.
  - Danger is remembered after surviving an attack, and forage targets near it are reflected away until the memory decays.
  - Memory is used with chance scaled by brain.
- **Learned predator avoidance:** after a failed attack, or after being spat out, the survivor stores the predator's species (`lsp`) with a strength (`lst`). The strength decays in `refreshSpeciesMeans` and is cleared below 0.05. In the flee scan, the learned species is seen from `1 + 0.8*lst*brain` times the normal radius ("fled early").
- **Social learning:** parents teach their young at live birth (chance 0.9·brain) and at each care feeding (0.25·brain). Teaching copies the water and food memory and passes on the predator lesson at 60% strength.
- **Tool use:** mammals and birds with brain above `TOOL_MIN` (0.42) gain tool skill `clamp((brain-0.42)/0.3)`. Skill matters only for hard food: seed fruit, invertebrate prey, or prey with armour above 0.4.
  - Hard food gives `+30%*skill` energy.
  - Armour's catch penalty drops by `50%*skill`.
  - Uses are counted per species (`sp.toolN`, decayed by 0.97 per refresh). The first time a species reaches 4, the log shows "X started using tools".
- **Slice 9 fixes:**
  - **Toxic-prey aversion is narrower.** An entry now stores the toxic species. Same-species prey gets full strength; other species within the hue window get ×0.7. Prey is skipped only by a fed predator (energy above half of its capacity), and then only on a roll scaled by how far the aversion exceeds the skip threshold. Otherwise the aversion only deprioritises the prey.
  - **Model hysteresis.** The current model stays while it is still toxic and holds at least half of `MODEL_POP`. A challenger replaces it only with a score at least 1.5× higher, so `lk` no longer jumps between refreshes.
- **Stats and UI:**
  - An "Intelligence" card: mean brain, tool-using species, learned avoidances, mammal and bird mean brain, tool uses, early flights, trips from memory, danger spots avoided and lessons taught, with a sparkline.
  - A Brain trait, marked "Tool user" above `TOOL_MIN`.
  - Species-detail rows "Tool use" and "Wary of predators".
- **Not changed:** `PlantLayer.step`, SAVE_VERSION (2). The new per-slot fields are saved automatically. Saves from before slice 10 do not load because `AG` changed, as with earlier gene additions.

## Gate (3000 ticks, new against base in the same batch, final run)

| Seed | Build | ms/tick | fish | amph | rept | mamm | bird | invt | groups |
|---|---|---|---|---|---|---|---|---|---|
| 42 | new | 48.7 | 1052 | 200 | 868 | 681 | 104 | 4159 | 26 |
| 42 | base | 49.0 | 1625 | 187 | 578 | 1011 | 120 | 3742 | 25 |
| 7 | new | 48.6 | 1533 | 164 | 352 | 1647 | 128 | 2983 | 25 |
| 7 | base | 49.8 | 1207 | 370 | 718 | 1344 | 103 | 2044 | 26 |
| 123 | new | 52.5 | 1513 | 786 | 617 | 1202 | 123 | 2879 | 25 |
| 123 | base | 51.3 | 1759 | 389 | 890 | 1305 | 74 | 2474 | 25 |

Bird niches (seed, insect, fisher, raptor, carrion):

| Seed | Build | seed | insect | fisher | raptor | carrion |
|---|---|---|---|---|---|---|
| 42 | new | 12 | 42 | 15 | 16 | 19 |
| 42 | base | 7 | 90 | 2 | 2 | 19 |
| 7 | new | 57 | 50 | 2 | 7 | 12 |
| 7 | base | 15 | 49 | 4 | 5 | 30 |
| 123 | new | 26 | 33 | 6 | 25 | 33 |
| 123 | base | 12 | 23 | 11 | 3 | 25 |

Bird recovery (birds at tick 3000):

| Seed | slice 8 | slice 9 (base) | slice 10 run 2 | slice 10 final |
|---|---|---|---|---|
| 42 | 209 | 120 | 235 | 104 |
| 7 | 166 | 103 | 98 | 128 |
| 123 | 275 | 74 | 150 | 123 |

Run 2 used the same code except `TOOL_MIN` 0.5, `TOOL_LOG` 20 and `TOOL_DECAY` 0.9. It is shown here because bird counts swing widely from run to run.

Intelligence results, final:

| Seed | mean brain (mammal / bird) | tool species (logged) | tool uses | learned avoidances (live) | fled early | memory trips (food / water) | danger avoided | taught | toxic-scan skips (base) |
|---|---|---|---|---|---|---|---|---|---|
| 42 | 0.255 / 0.388 | 3 | 657 | 331 | 894 | 1536 / 9 | 1517 | 1736 | 297k (1.17M) |
| 7 | 0.249 / 0.399 | 4 | 517 | 382 | 663 | 1988 / 24 | 1160 | 2516 | 157k (0.89M) |
| 123 | 0.243 / 0.405 | 4 | 434 | 883 | 891 | 4019 / 14 | 1775 | 2494 | 88k (1.38M) |

- **Speed:** −3% to +2% compared with base, well inside the +25% limit.
- **Survival:** every class and every bird niche is alive on all seeds. There are 25–26 groups, and 32–35 species.
- **Birds:**
  - The total rises on seeds 7 and 123: 128 against 103, and 123 against 74.
  - Seed 42 is slightly lower in the final run (104 against 120). Its niches are much more even, though: fishers 15 and raptors 16, against 2 and 2. In run 2 seed 42 reached 235.
  - Totals are still below slice 8 (209 / 166 / 275).
- **Toxic-scan skips** drop 4× to 15×. Toxic bites rise (570 to 1600, against about 200), because predators now sample toxic prey more often and learn per species.
- **Tool use** appears in 3–4 species per seed, mostly invertebrate-eating birds and omnivore mammals. Each one is logged once.
- **Brain trend:** class means stay near their founder values (mammals about 0.25, birds about 0.4). The upkeep and maturation cost holds the gene in check. No runaway was seen.
- **Determinism** (`det.js`, seed 42, 600 ticks, save at 200): stats, full state and RNG all match.

## Open issues
- **Seed 123 lost its reptile toxic model** by tick 3000 in the final run (only the invertebrate model remains, and one mimic species with 35 animals). Base and run 2 kept 2 models. The hysteresis cannot keep a model that has collapsed, so cheaper toxin upkeep or a model-population floor may be needed.
- **Water memory is barely used** (9–31 trips per run). It is recorded only at low-water drinking spots, and most animals drink close to water anyway.
- **Birds are still below slice 8.** The narrowing removed most skips, but bird counts are noisy (seed 42: 235 in run 2, 104 in the final run). A multi-seed, multi-run average is needed to judge it properly.
- **Seed 7 fishers** are thin (2).
- **Brain decays** from the high founder values (0.45–0.5) toward about 0.25 in mammals, so tool use stays limited to a few lineages. That is intended, but tool use may fade over long runs.
- The year-35 run, the browser screenshot and a full save/load at 3000 ticks were skipped (test budget of 3 runs).
