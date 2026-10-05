# Audit: Plant and animal toxins (roadmap item 14)

Base commit 5ecfbe0.

User request: "plant and animal toxins — toxins are split into new types and can vary between plants: poison (kills animals or hurts them), neurotoxic (psychedelic, stimulant), genotoxic".

## Commits

| Commit | Summary |
|---|---|
| e7d22b0 | Split plant and animal toxins into poison, neurotoxin and genotoxin (sim, save upgrade, UI, render) |
| 86c0ac8 | Tune toxin effect strengths and give omnivores founder resistance |
| (this commit) | Add this audit |

## What changed

### Plants (`js/sim/plants.js`)

- The genome grows from 29 to 32 genes (`PG = 32`, `PG_V3 = 29`).
- Gene 4 keeps its role as the poison gene. Three genes are new:

| Gene | Meaning |
|---|---|
| 29 | Neurotoxin strength |
| 30 | Neurotoxin flavour: below 0.5 is psychedelic, 0.5 or above is stimulant |
| 31 | Genotoxin strength |

- Archetype defaults come from `plantToxinDefaults`:

| Plant type | Neurotoxin | Genotoxin | Flavour |
|---|---|---|---|
| Fungi | 0 | 0 | 0 |
| Water plants | 0.04 | 0.03 | by the sweet/bloom rule |
| Blooming herbs (bloom > 0.55) | 0.35 | by the hot/dry rule | by the sweet/bloom rule |
| Other herbs | 0.15 | by the hot/dry rule | by the sweet/bloom rule |
| Woody plants | 0.08 | by the hot/dry rule | by the sweet/bloom rule |

  - Hot/dry rule: hot, dry-adapted plants get genotoxin 0.25; everything else gets 0.06.
  - Sweet/bloom rule: sweet or showy plants (sweet > 0.3 or bloom > 0.7) get stimulant flavour 0.7; everything else gets psychedelic flavour 0.3.
- Cost: growth is multiplied by `(1 - 0.2·neuro)·(1 - 0.2·geno)`. Poison already had its own cost.
- Grazing pressure selects through the existing grazing and seed-drop path. Mutations of the eaten plant are seeded from the species mean, so this is selection, not direct pressure on each plant.
- `graze()` now records three values for the bite:
  - `grazeNeu`: neurotoxin, biomass-weighted across the two slots
  - `grazeGen`: genotoxin, weighted the same way
  - `grazeStim`: whether the dominant slot is a stimulant
- GPU: the WebGPU plant kernel reads the CPU-computed `growth` slot, which `plantGpu.js` uploads as `SF.growth`. The growth cost therefore reaches the GPU path with no kernel change.
- No renderer grids were added, so `SNAP_GRIDS` is unchanged.

### Animals (`js/sim/animals.js`)

- The genome grows from 32 to 35 genes (`AG = 35`, `AG_V2 = 32`). The new genes are:
  - `G_RNEU`: neurotoxin resistance
  - `G_RGEN`: genotoxin resistance
  - `G_TOXK`: the kind of toxin a toxic-to-eat animal carries (below 0.4 poison, 0.4 to 0.7 neuro, above 0.7 geno)
- Poison resistance stays the existing `G_TOXR`.
- Resistance costs metabolism: `meta *= 1 + 0.06·(rN + rG)`.
- Founder resistances:
  - Herbivores and omnivores (diet < 0.66): rN 0.2 and rG 0.15.
  - Carnivores: rN 0.08 and rG 0.08.
  - Toxic archetypes: 14 is poison, 26 is neuro, 27 is geno.
- New per-animal state, all saved in the animal pool:
  - `fx`: one of none, poisoned, tripping, stimulated, crashing
  - `fxT`: ticks left in the current state
  - `crv`: the tile the animal craves
  - `gl`: genetic load

Effects when grazing (`_plantTox`):

| Toxin | Trigger | Effect |
|---|---|---|
| Poison | dose (tox + induced − toxR) > 0.15 | Poisoned for 20 ticks at 1.2× upkeep. Lose 0.04·dose·emax energy. Above dose 0.25, death chance (dose − 0.25)·0.05; these deaths count in `deaths.poison`. Applies on top of the existing reduced energy from toxic forage. |
| Neuro, psychedelic | (grazeNeu − rN) > 0.1, chance 0.9·excess | Tripping for 20 ticks: 35% of non-acting ticks are spent wandering, bites are ×0.7, speed ×0.9, upkeep ×1.05. |
| Neuro, stimulant | same trigger, dominant slot is stimulant | Stimulated for 20 ticks: speed ×1.3, upkeep ×0.85. Then crashing for 20 ticks: speed ×0.8, upkeep ×1.1. While crashing, the animal can dose again, and foraging gets a lure (×1.6) back to the craved tile. This is the mild addiction. |
| Genotoxic | (grazeGen − rG) > 0.05 | `gl += 0.025·excess`, decaying ×0.993 per tick. When breeding: a skipped breeding chance of 0.3·gl, mutation rate ×(1 + gl), mutation size ×(1 + 0.5·gl). Bounded because gl ≤ 1. |

Other animal changes:

- **Typed toxic prey (`_preyLearn`).** The hit is resisted by the resistance matching the prey's toxin kind.
  - Neuro and geno hits take half the energy damage.
  - Neuro prey can cause a trip.
  - Geno prey adds `0.15·hit` to the predator's `gl`.
- **Food choice.** `_pickForage` scales each plant tile's food value by `1 − 1.4·load`, floored at 0.15, where `load = poison excess + 0.5·neuro excess + 0.5·geno excess`. Only toxins the animal does not resist count.
- **Perf fix.** `DOM_CLS` is lowered from 1800 to 1500.

### Saves (`js/save.js`)

- `SAVE_VERSION` stays 2. No new classes were added.
- Old genomes are padded:
  - PG 29 → 32 using `plantToxinDefaults`
  - AG 30 or 32 → 35 with resistance 0.1 and kind 0.2
- Animal pool float and int arrays that are missing or short (`fx`, `fxT`, `crv`, `gl`) are allocated on load.
- `toxfx` counters are created if absent.
- Registry `mean` and `genome` arrays are padded whenever they are shorter than AG.

### UI (`js/main.js`, `js/render.js`, `css/style.css`)

- **Plant species panel.** The trait list has Poison, Neurotoxin, Neurotoxin kind (Stimulant / Psychedelic) and Genotoxin, hidden for fungi. Colour badges appear for toxins of strength 0.3 or more.
- **Animal panel.**
  - Poison, Neurotoxin and Genotoxin resistance traits.
  - A Toxin kind trait.
  - An "Intoxicated" cell that counts the species' members by state: poisoned, tripping, stimulated, crashing.
- **Tooltip.**
  - Animal rows show a state badge and a "gene-damaged" badge.
  - Plant rows show toxin badges.
- **Stats line.** The symbiosis sub-line shows live toxin counts.
- **Map visual.** Intoxicated animals get a small coloured halo dot in both dots mode and icons mode. Tripping animals get a halo that cycles through hues.

## Numbers

All runs are headless on a 320x210 world for 3000 ticks. Minimums are taken from t500 onward. New and base runs were paired under the same CPU load (4 cores, 4 jobs).

### ms/tick, measured after t300 (final run 3)

| Seed | Base 5ecfbe0 | New | Δ |
|---|---|---|---|
| 42 | 29.72 | 28.39 | −4.5% |
| 7 | 26.83 | 27.58 | +2.8% |
| 123 | 28.32 | 26.66 | −5.9% |
| Sum | 84.87 | 82.63 | −2.6% |

Run 2, with the same pairing, came out at −1.9% overall.

### Class minimums from t500 (final run 3)

| Seed | Build | Fish | Amphib | Reptile | Mammal | Bird | Invert |
|---|---|---|---|---|---|---|---|
| 42 | base | 128 | 101 | 80 | 235 | 100 | 309 |
| 42 | new | 80 | 14 | 78 | 204 | 77 | 324 |
| 7 | base | 268 | 12 | 67 | 166 | 68 | 144 |
| 7 | new | 214 | 9 | 70 | 166 | 68 | 140 |
| 123 | base | 287 | 99 | 178 | 467 | 86 | 185 |
| 123 | new | 336 | 36 | 177 | 286 | 76 | 161 |

### Bird niche minimums (seed / insect / fisher / raptor / carrion), final run 3

| Seed | Base | New |
|---|---|---|
| 42 | 15 / 14 / 7 / 5 / 9 | 17 / 12 / 4 / 5 / 6 |
| 7 | 8 / 11 / 1 / 3 / 10 | 10 / 7 / 2 / 4 / 9 |
| 123 | 9 / 10 / 4 / 3 / 12 | 13 / 10 / 4 / 3 / 9 |

### Toxin activity (final run 3, cumulative at t3000)

| Seed | Poisoned | Trips | Stims | Crashes | Geno births | Toxin deaths | Prey trips | Prey geno hits |
|---|---|---|---|---|---|---|---|---|
| 42 | 1303 | 4131 | 10491 | 9950 | 182 | 0 | 0 | 549 |
| 7 | 1059 | 1779 | 11737 | 11188 | 242 | 0 | 0 | 695 |
| 123 | 1209 | 3930 | 12888 | 12305 | 342 | 1 | 6 | 334 |

At any one time, about 3–5% of animals are intoxicated: 150 to 250 out of roughly 4500 to 5000.

### Evolution, population-weighted means (seed 42, t500 → t3000)

| Trait | t500 | t3000 |
|---|---|---|
| Plant poison | 0.171 | 0.188 |
| Plant neurotoxin | 0.101 | 0.092 |
| Plant stimulant flavour | 0.342 | 0.319 |
| Plant genotoxin | 0.070 | 0.071 |
| Herbivore poison resistance | 0.438 | 0.493 |
| Herbivore neurotoxin resistance | 0.198 | 0.200 |
| Herbivore genotoxin resistance | 0.152 | 0.160 |

Seeds 7 and 123 show the same direction.

### Tuning history

| Run | Change | Amphibian min (42 / 7 / 123) |
|---|---|---|
| 1 | Initial values: neuro chance 1.5, trip 30 ticks, wander 45%, genotoxin load 0.06 with decay 0.997, resistance cost 0.1 | 52 / 4 / 6 |
| 2 | Softer neuro and geno effects, resistance cost 0.06, omnivores get herbivore resistances, more stimulant plants | 5 / 16 / 32 |
| 3 | Crash shortened to 20 ticks at upkeep ×1.1 and speed ×0.8 | 14 / 9 / 36 |

## Gates

| Gate | Result |
|---|---|
| Seeds 42, 7 and 123 over 3000 ticks keep all 6 classes and all 5 bird niches | PASS: every minimum is above 0 in all three runs |
| ms/tick no more than +5% vs base | PASS: −2.6% total. The worst single seed is +2.8% |
| Save at 1500, load, step 500: identical | PASS: hashes match at load (13c11c11ad63363d) and after 500 steps (95a4127636da1c8a) |
| Old saves load | PASS: a save made with base 5ecfbe0 (PG 29 / AG 32, gen 3, t400) loads with the new code and steps 500 ticks with all classes alive. The older scratch saves `evosim-42-y4.evo` and `evosim-42-y6.evo` also fail on base 5ecfbe0: y4 crashes in `_social` or `zone`, and y6 is save version 1. They are not a regression from this change. |
| SAVE_VERSION stays 2, no new save classes | PASS |
| `node --check` on all JS files | PASS (23 files) |
| Browser smoke test | PASS: Chromium with SwiftShader, port 8793, worker mode. 300 ticks; `fx` and `gl` reach the client; `stats.toxins` is populated; plant toxin badges render; save and load in the worker work; no console errors. |

## Open issues

- **Amphibians are the most sensitive class.** Their minimum from t500 falls on seeds 42 (101 → 14) and 123 (99 → 36). They survive in every run, but with less margin than at base. The stimulant/crash cycle is the likeliest pressure, since amphibians in mire habitats graze blooming herbs. A follow-up could give amphibian founders higher neurotoxin resistance, or make re-dosing while crashing less likely.
- **Animal species counts at t3000 are a little lower:** 50 / 54 / 49 against base 62 / 52 / 57.
- **Death mix shifts.**
  - Predation deaths fall on seed 42 (6275 → 2381) and seed 123 (4603 → 2445), and rise on seed 7 (2326 → 2939).
  - Disease deaths rise on seed 42 (24 → 524) and seed 7 (88 → 450).
  - Herbivores spend time intoxicated and populations rearrange.
- **Lethal plant poisoning is rare,** with 0–1 deaths per run. Herbivore poison resistance (around 0.45–0.5) keeps most doses below the lethal threshold. Poisoning itself is common, at about 1000–1300 events per run.
- **Neurotoxic prey rarely trips predators,** with 0–6 events. Predators learn to avoid archetype 26 quickly through the existing prey-aversion system. Genotoxic prey hits are common, at 330–700.
- **Toxin gene evolution is slow over 3000 ticks.** Plant poison and herbivore poison resistance rise together, neurotoxin drifts down, and genotoxin stays flat. Longer runs would show whether a real arms race develops.
- **Pre-existing:** older scratch saves (y4 from before the zone and social fields, and y6 at save version 1) do not load on base either.
