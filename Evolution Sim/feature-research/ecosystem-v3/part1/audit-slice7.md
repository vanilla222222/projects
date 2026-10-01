# Slice 7 audit: social structure and communication

Built on f7ddb3d (the slice 6 merge). The test budget was 3 runs:

1. One probe: 3 seeds × new and base, 3000 ticks.
2. One gate batch: 3 seeds × new and base, 3000 ticks.
3. One determinism check on seeds 42 and 7: 2500 + 500 ticks.

A harness typo crashed one launch before any sim tick, so it is not counted.

## Files changed

- `js/sim/animals.js`:
  - **Genes:** `AG` goes from 21 to 23. New genes `G_ALARM = 21` and `G_SOCIAL = 22`, and `ANIMAL_WEIGHTS` gains `0.4, 0.4`.
    - Founder alarm values: prey birds and fishers 0.55; herding mammal or small herbivores 0.5–0.6; everyone else 0.25.
    - Founder sociality values: herd floor 0.15; land mammal predators 0.55; colony birds 0.75, mid birds 0.5, raptors 0.2; land invertebrate herbivores 0.8, with nest 0.45.
  - **Pool fields:** Float `rnk` and Int `alm`, `grp`, `dsp`, `fnd` are added to the `ANIMAL_FIELDS_*` lists, so they are saved with the pool.
    - Counters: `alarms`, `alarmHeard`, `sentinel`, `dispersals`, `dispSplits`, `rankBlocked`, plus `eatenBy` (Float64 ×12).
  - **Rank:** `_social` computes a rank score (mass, growth, elder factor, energy; reduced while sick).
    - `_rank()` makes one pass per grid cell and sets `grp` (local same-species count) and `rnk` (score relative to the local mean).
    - Pack leaders are picked by the same score. Dispersers do not join packs.
  - **Alarms:** `_alarm(i, t)` is called from the flee scan and searches only the grid cells within `ALARM_R`.
    - Same-species listeners flee.
    - Bird calls also reach other-class prey (sentinels): not water-domain, diet clearly below the threat's, mass at most 1.8× the threat's.
    - Cost: energy, plus `ALARM_SPOT` for both picking (`_nearest` mode 1) and the cover term in `_attack` while `alm > 0`.
  - **Sociality:**
    - `_pickForage` pulls toward kin up to the preferred group size `1 + 14·soc²` and pushes away above it.
    - More eyes: a larger flee radius in groups.
    - Food competition: `bite` scales with group size and rank.
    - Pack kill factor scales with sociality.
    - Herd safety in `_attack` uses `max(herd, soc)` with `n = grp` and keeps only 30% for sick prey.
  - **Disease:**
    - `_contact` exposure grows with group size, and same-species exposure is reduced by sociality (shunning).
    - `_sus` rises for low rank in groups.
    - Sick animals lose rank, which affects pack leadership, feeding and mating.
  - **Feeding and mating:**
    - `_packFeed` splits by rank (`RANK_FEED`).
    - `_reproduce`: outranked animals in groups of 3+ skip a breeding attempt with chance `RANK_MATE·(1-rnk)`.
  - **Dispersal:**
    - `_disperse(i)` starts it, and state 8 ("dispersing") walks to a target `DISP_DIST` away.
    - Arrival sets `fnd = DISP_GEN`. Founder broods mutate at ×`DISP_DRIFT`.
    - The first brood of a fresh founder founds a daughter species with chance `DISP_SPLIT_P`, and later young of that brood join it. `sp.dispersal` and `dispSplits` record this.
  - **Colonies:**
    - `_nearest` mode 4 finds same-species nest or den holders. `_pickHome` uses it for sociality above `COLONY_MIN`.
    - `refreshSpeciesMeans` sums grow to `AG+10` and set `sp.grpMean` and `sp.colonies` (tiles with 4+ same-species holders).
    - "<name> formed a colony" is logged once per species.
  - **Kill accounting:** `_eaten(p)` counts prey kills by class and by caller/quiet lineage.
- `js/sim/ecosystem.js`: `stats.social`, `socExposure`, `_socialStats()` every 20 ticks, `history.alarms`, and the constants `SOLO_GROUP`, `COLONY_GROUP`, `SOC_STAT_POP`.
- `js/main.js`:
  - Alarms card (owl, wide, sub-line).
  - `ANIMAL_TRAITS`: Alarm calls and Sociality (`socialWord`).
  - Mean group size detail cell.
  - Tooltip state "dispersing".
- `js/render.js`: an alarm ripple ring at zoom ≥ 4 (`ALARM_RING_ZOOM`, `ALARM_RING_GROW`, `ALARM_RING_ALPHA`); the sprite capacity is now 6 per animal.
- `CODE_REFERENCE.md`: see Doc changes.

`SAVE_VERSION` stays 2. There are no new classes (`classTable()` is unchanged) and no new non-pool grids (`SNAP_GRIDS` is unchanged).

## WebGPU plant mirror

Plant and soil step logic was not touched. `js/gpu/` is unchanged.

## Test numbers

The gate ran 3000 ticks, new build vs base f7ddb3d in the same batch. The gate ran the code before the founder-split change (see Deviations). The determinism run used the final code.

| Seed | Build | ms/tick | fish | amph | rept | mamm | bird | invt | bird niches (seed/insect/fisher/raptor/carrion) | groups | species |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 42 | new | 48.98 | 1085 | 55 | 261 | 1347 | 385 | 1284 | 60/272/15/15/23 | 25 | 65 |
| 42 | base | 47.15 | 803 | 122 | 309 | 776 | 394 | 805 | 104/133/5/86/66 | 25 | 65 |
| 7 | new | 50.20 | 1135 | 61 | 287 | 1511 | 138 | 1489 | 15/55/12/22/34 | 26 | 66 |
| 7 | base | 46.19 | 3456 | 83 | 251 | 790 | 203 | 138 | 21/142/10/10/20 | 24 | 68 |
| 123 | new | 51.35 | 2183 | 11 | 209 | 936 | 270 | 833 | 12/186/5/18/49 | 24 | 67 |
| 123 | base | 50.52 | 3671 | 54 | 657 | 1404 | 155 | 863 | 9/81/14/7/44 | 25 | 67 |

The machine was loaded with 6 parallel runs, so absolute ms/tick is higher than in slice 6.

- **Speed:** new is about 2–9% slower than base in the gate (+3.9%, +8.7%, +1.6% for seeds 42/7/123). In the probe batch it was +2%, −0.5% and +1.9%, so part of the gap is noise.
- **Classes and niches:** every class and every bird niche is alive on every seed.
- **Social stats** (seeds 42/7/123):

  | Stat | 42 | 7 | 123 |
  |---|---|---|---|
  | Alarms | 15.3k | 21.7k | 21.2k |
  | Heard | 73k | 121k | 108k |
  | Sentinel | 10.5k | 8.6k | 6.0k |
  | Mean group | 6.5 | 7.8 | 7.5 |
  | Colonies (species) | 65 (7) | 80 (7) | 44 (7) |
  | Dispersals | 431 | 758 | 1065 |
  | Outranked | 12 | 18 | 23 |

- **Solitary and colonial species** (population ≥ 10): 1/11, 4/10 and 2/9 for seeds 42/7/123. Both kinds are present on every seed.
- **Prey loss** (kills per 1000 prey animal-ticks), caller vs quiet lineages over all classes:

  | Seed | Caller | Quiet |
  |---|---|---|
  | 42 | 0.26 | 0.48 |
  | 7 | 0.28 | 0.54 |
  | 123 | 0.26 | 0.62 |

- **Prey loss by class**, as quiet / caller:

  | Class | 42 | 7 | 123 |
  |---|---|---|---|
  | Mammal | 0.95 / 0.26 | 0.17 / 0.25 | 1.00 / 0.25 |
  | Amphibian | 5.53 / 1.34 | 1.34 / 0.86 | 1.47 / 2.24 |
  | Fish | 0.09 / 0.18 | 0.42 / 0.26 | 0.25 / 0.16 |

  Birds and invertebrates have no comparison group: all prey birds call and no prey invertebrate does.
- **Determinism** (`det.js`, 2500 + 500 ticks, seeds 42 and 7, final code): stats, full state, RNG and aliases are all equal after save/load. Saves are 16.27 MB and 15.92 MB.
  - At tick 3000 of that run, dispersal splits were 0 on seed 42 and 1 on seed 7. Species counts were 65 and 68.

## Deviations

- **Founder splits:** the probe and the gate showed 0 dispersal splits. Founder drift alone (mutation ×1.5 for 3 generations) never crossed `ANIMAL_SPECIATION`. So after the gate, the first brood of a fresh founder was given a `DISP_SPLIT_P` (0.03) chance to found a daughter species. Only the determinism run tested this; it gave 1 split on seed 7 and 0 on seed 42.
- **Colony event:** in the probe, the colony event re-armed whenever a species briefly lost its colonies and fired about 50 times per seed. It now fires once per species.
- **Disease and sociality:** disease contact is modelled through `grp` in `_contact` and `_sus`, not through a separate group-disease system.

## Risks and open items

- **Dispersal splits:** the target of at least one per seed is not met on seed 42 at 3000 ticks. Raising `DISP_SPLIT_P` (for example to 0.1) or lowering `DISP_SPLIT_POP` should fix it, but there was no budget left to verify.
- **Amphibians:** they are lower than base on seeds 42 (55 vs 122) and 123 (11 vs 54). They are alive but thin. On seed 123, amphibian callers lose more than quiet ones.
- **Mammals:**
  - Seed 7: mammal callers lose slightly more than quiet mammals (0.25 vs 0.17).
  - Mammals end higher than base on 42 and 7 and lower on 123.
- **Fish and invertebrates:** both swing a lot between builds (RNG divergence plus new competition).
- **ms/tick:** up to +9% vs base in the gate batch; that batch was noisy.
- **Rank blocking:** blocking of mating is rare (8–23 per run), so its effect on breeding is small.
- **Old saves:** saves without the new fields or `history.alarms` are not migrated, as in earlier slices.
- **Visual check:** no browser screenshot was taken. The Alarms card, traits, detail cell and ripple ring were not checked visually.

## Doc changes

`CODE_REFERENCE.md`:

- `AG = 23` and rows for genes 21 and 22, the founder alarm and sociality values, and the weights.
- A full **Social structure** subsection: constants, fields, rank, alarms, sociality, dispersal, colonies.
- `_nearest` mode 4.
- `stats.social` and `history.alarms`.
- The Alarms card, traits, detail cell, tooltip "dispersing", and the render ripple and its constants.

## Checklist

- [x] Alarm gene, calls, same-species flee, bird sentinel calls, caller conspicuousness
- [x] Rank from size, age and energy; rank-ordered feeding and mating; leaders by rank
- [x] Low-rank dispersal founding new groups; founder drift
- [ ] Dispersal-founded split on every seed (1 of 2 seeds in the final-code run)
- [x] Sociality gene: more eyes, shared alarms, pack kills, food competition, disease contact
- [x] Sick animals shunned and losing group protection; low rank more susceptible
- [x] Colonies of social birds and land invertebrates in slice 3 nests; colony event
- [x] Alarm ripple at zoom ≥ 4, species group size, sociality and alarm, Alarms card
- [x] Callers lose a smaller share than quiet lineages (overall on every seed)
- [x] Solitary and colonial lineages on every seed
- [x] Save/load determinism
