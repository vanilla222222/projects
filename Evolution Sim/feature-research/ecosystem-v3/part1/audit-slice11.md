# Audit: slice 11, natural disasters and succession

## What was built
- **`DisasterLayer`** (`js/sim/disasters.js`). It has its own RNG stream (`FastRng(seed + 999)`) and runs after the weather step.
  - **Wildfire.** Ignition is likelier in summer and 3× likelier in a weather drought. A fire starts on the driest warm tile with fuel and spreads with the wind, uphill and through fuel. Wet ground puts it out, and recent burn scars act as firebreaks. Each fire is capped at 2% of land, and the burned area at 3.5% of land per year.
  - **Fire effects.** Plant survival depends on woodiness and the new fire gene. Survivors resprout. Fire-adapted plants bank fire-cued seeds; other seed banks shrink. Litter turns to ash nutrient, bugs are cut, and eggs die.
  - **Flood.** A heavy storm can flood low land near rivers and shores. Floods damage plants, drown some animals and eggs, and leave silt nutrient.
  - **Drought** is the existing weather drought; this layer counts it and uses it to raise fire risk.
  - **Windthrow.** A large storm knocks down woody canopy trees near its centre.
- **Animals.** On burning tiles, non-flyers can die (slow, juvenile and dormant animals more often) or flee upwind. On flooded tiles, land animals can drown or flee from the flood centre. New death causes `fire` and `flood`.
- **Succession.** Every disturbed tile gets a scar (fire, flood or wind). For the first 18 succession steps (about 1.5 years), non-woody understory plants within 2 tiles seed the empty understory slots of the scar. Tracked per scar: recovery against the biomass before the disturbance, and the understory (pioneer) share of biomass in young and in old scars. The log reports "<species> recolonised the burn" at most once a year.
- **Plant gene 16, fire resistance** (`PG` 17). Founder values: 0.35 for dry-adapted land archetypes, 0.1 for other land plants, 0 for fungi and water plants. It costs growth: `×(1 - 0.12*fire)`.
- **UI.** A "Disasters" render view (live: fire, flood, scar age, fire risk), a Disasters stat card, a "Disasters" event filter (one log entry per wildfire, flood and windstorm start, plus burn-out and recolonisation notes), a Fire resistance plant trait, and a Disasters toggle in the options.
- **Wiring.** `save.js` classTable, worker `DEFAULT_SCRIPTS`/`SNAP_LAYERS`/`SNAP_GRIDS`, and `simClient.layerClasses()`. SAVE_VERSION stays 2; saves from before slice 11 do not load because `PG` changed.
- **GPU.** No GPU file was touched. `PlantLayer.step` and `SoilLayer.step` are unchanged. All disaster edits to plant and soil arrays happen outside `step`, and the fast-mode merge (`diffUpload`/`consume`) picks them up.

## Gate (3000 ticks, new against base in the same batch, final run)

| Seed | Build | ms/tick | fish | amph | rept | mamm | bird | invt | groups |
|---|---|---|---|---|---|---|---|---|---|
| 42 | new | 55.5 | 1180 | 291 | 695 | 731 | 122 | 3451 | 26 |
| 42 | base | 55.9 | 1052 | 200 | 868 | 681 | 104 | 4159 | 26 |
| 7 | new | 56.2 | 1401 | 119 | 694 | 1108 | 87 | 2445 | 25 |
| 7 | base | 54.7 | 1533 | 164 | 352 | 1647 | 128 | 2983 | 25 |
| 123 | new | 58.4 | 1538 | 225 | 542 | 1052 | 102 | 3676 | 27 |
| 123 | base | 57.8 | 1513 | 786 | 617 | 1202 | 123 | 2879 | 25 |

ms/tick change: -0.8%, +2.7%, +1.0% (limit +25%).

Bird niches (seed, insect, fisher, raptor, carrion):

| Seed | Build | seed | insect | fisher | raptor | carrion |
|---|---|---|---|---|---|---|
| 42 | new | 28 | 38 | 11 | 26 | 19 |
| 42 | base | 12 | 42 | 15 | 16 | 19 |
| 7 | new | 36 | 21 | 13 | 7 | 10 |
| 7 | base | 57 | 50 | 2 | 7 | 12 |
| 123 | new | 3 | 48 | 17 | 3 | 31 |
| 123 | base | 26 | 33 | 6 | 25 | 33 |

No class or niche is wiped out on any seed. The low seed-bird and raptor counts on seed 123 (3 each) are within the run-to-run range seen in earlier slices; seed 123 had the least fire (0.2% of land burned).

## Disasters over 3000 ticks

| Seed | Fires | Land burned | Floods (tiles) | Windthrow (trees) | Droughts | Fire deaths | Flood deaths | Eggs lost |
|---|---|---|---|---|---|---|---|---|
| 42 | 3 | 1053 tiles, 2.4% | 3 (121) | 3 (36) | 1 | 4 | 3 | 0 |
| 7 | 7 | 2650 tiles, 6.4% | 2 (157) | 3 (78) | 1 | 8 | 0 | 0 |
| 123 | 3 | 73 tiles, 0.2% | 5 (205) | 4 (74) | 1 | 0 | 1 | 3 |

Animal deaths are tiny next to starvation (more than 23,000 per seed). Disasters reshape the plant layer and leave animals mostly alone, which matches the "moderate" brief.

## Succession evidence
- **Recolonisation.** Pioneer seedings into scars: 471, 1118 and 92. On seed 7 they rise with each fire: 119 (tick 1000), 458, 769, 842, 1118.
- **Recovery (seed 42).** One fire burned 768 tiles around tick 900. Recovery of year-old scars was 74% at tick 1500 and 85% at tick 2000. A second fire at tick 2472 pulled it to 61%, then 43%.
- **Pioneer share.** On seed 42 the understory share was 56% in young scars at tick 1000, against 25–37% in old scars later. On seed 7 it was 49–69% in young scars and 33–46% in old scars. Young scars are dominated by understory pioneers, and canopy takes back the old scars.
- **Fire adaptation.** 54–63% of burned plants carried fire resistance above the cue threshold. Plants that survived fire: 658, 1592 and 39. The population mean of the fire gene barely moves over 3000 ticks (0.221 to 0.221, 0.251 to 0.254, 0.161 to 0.162). Its growth cost balances the survival benefit when only 0.2–6% of land burns.

## Determinism
`det.js`, seed 42: 1500 ticks, then save and load, then 500 more ticks on both copies. Results:
- stats equal: true
- full re-encoded state equal: true (16,678,967 bytes each)
- RNG equal for eco, animals and disasters: true
- the `animals.dis`, `dz.plants` and `dz.weather` aliases survive loading

## Tuning history
- Run 1 used `FIRE_IGNITE` 0.03 and `FIRE_SAMPLES` 8. That gave 0–1 fires per seed: too rare to show succession on two seeds. Run 2 used 0.08 and 12 and is the final gate above. All classes and niches were alive in both runs.

## Open issues
- The pioneer-share metric covers windthrow and flood scars as well as burns. In old windthrow scars the understory can dominate for a long time, so `pioneerOld` is noisy (22–43%).
- Fire counts vary a lot by map: seed 7 burned 6.4% of land, seed 123 only 0.2%. Fire is driven by the dry, warm land in each world, which is intended, but wet worlds see little fire.
- The fire gene shows no clear selection in 3000 ticks. A longer run, or a fire-prone world, would show whether it drifts up in dry biomes.
- EventLog keeps 120 entries, so early disaster logs scroll out in long runs; the stat card counters keep the totals.
