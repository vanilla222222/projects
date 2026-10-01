# Compute profile (Phase 0)

## How it was measured
- Headless Node harness: Medium world (320×210), default options, 3000 ticks per seed.
- Each layer's `step` was timed from outside by wrapping it with `performance.now()`. No timing code went into `js/sim/*`.
- The three seeds ran in parallel on a shared 4-core container while other jobs were running, so absolute ms are about 2× a quiet desktop. The shares are the useful part.
- A single, uncontended run of seed 42 over 1500 ticks gave 25.7 ms/tick, against 59.4 ms/tick over 3000 ticks in the parallel batch. That run has fewer animals, which also lowers its time.

## Per-layer cost, 3000 ticks

| Layer | Seed 42 ms | Seed 42 % | Seed 7 ms | Seed 7 % | Seed 123 ms | Seed 123 % |
|---|---|---|---|---|---|---|
| plants (incl. soil) | 24.67 | 41.5 | 24.60 | 41.2 | 22.93 | 35.2 |
| animals | 27.86 | 46.9 | 28.45 | 47.6 | 35.52 | 54.5 |
| bugs | 2.44 | 4.1 | 2.22 | 3.7 | 2.03 | 3.1 |
| species means + herd stats (every 20 ticks) | 2.24 | 3.8 | 2.28 | 3.8 | 2.25 | 3.5 |
| stats (`_computeStats`) | 0.97 | 1.6 | 0.97 | 1.6 | 1.19 | 1.8 |
| weather | 0.64 | 1.1 | 0.62 | 1.0 | 0.66 | 1.0 |
| disease | 0.39 | 0.7 | 0.39 | 0.6 | 0.37 | 0.6 |
| eggs | 0.13 | 0.2 | 0.10 | 0.2 | 0.15 | 0.2 |
| merge pass (every 120 ticks) | <0.01 | 0.0 | <0.01 | 0.0 | <0.01 | 0.0 |
| other (migrations, history, thirst/disease stats, extinctions) | 0.05 | 0.1 | 0.05 | 0.1 | 0.06 | 0.1 |
| **total ms/tick** | **59.4** | | **59.7** | | **65.2** | |
| animals at tick 3000 (peak) | 4538 (6193) | | 5215 (7009) | | 6772 (8132) | |

Inside plants, `soil.step` takes about 20% of the plant time: 2.6 of 12.8 ms in the quiet seed 42 run, which is 10% of the whole tick. The animal spatial grid rebuild (`_buildGrid`) is under 0.5% of the tick.

## Reading
- Two layers take 88–90% of every tick: plants and animals. Everything else together is about 11%.
- Plant cost is flat across seeds, at about 23–25 ms in the batch, because it scales with the tile count (2 × 67,200 plant slots).
- Animal cost scales with population. It is the larger share once populations reach 5–8k, and seed 123 is the worst case at 54%.
- Weather, disease, eggs and stats are each 2% or less. Moving them anywhere would not change the frame rate.

## Recommendation
A GPU path pays off for the **plant grid, soil included**. The plant grid is about 40% of the tick at a cost that stays flat with population. Its work is per-tile arithmetic over fixed-size typed arrays, with neighbour reads for spread and shade, and that maps directly onto a compute kernel whose buffers stay resident. Only `biomass`, `fruit`, `species` and `kind` would need reading back for animals to graze. **Bugs**, as a second grid at 3–4%, are worth folding into the same pass once plants are on the GPU, but not on their own. **Weather diffusion** is only about 1%, so it is not worth its own kernel, though it can share the plant pass for free. **Animals** are the largest single cost, but they are a poor GPU fit. They are agent-based, with branching per-creature behaviour, RNG-ordered births and deaths, species bookkeeping, and an object-side registry. A GPU version would rewrite most of `animals.js` and break determinism much more than the grids would. For animals, the better lever is the Phase 1 worker: the whole tick moves off the UI thread. A later multicore split could then run the plant/soil/bug grids in parallel with the animal pass, which needs SharedArrayBuffer.
