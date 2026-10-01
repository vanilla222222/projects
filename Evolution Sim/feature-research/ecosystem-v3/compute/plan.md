# Compute plan: workers and GPU

The user asked for both: CPU workers first, then WebGPU as an optional fast mode that turns off strict determinism.

## Ground rules
- **Determinism is the default.** With fast mode off, a seed and a save give byte-identical results, as now. The save/load test stays green.
- **Sim files stay DOM-free.** `js/sim/*` must keep loading in the headless harness with no worker or GPU.
- **Always a fallback.** If a worker can't start (for example on `file://`) or WebGPU is missing, the sim runs on the main thread, on the CPU, as now.
- **Small surface.** Each slice edits `animals.js`, so this track keeps sim-file edits to a minimum and puts new code in new files.

## Phase 0: profile
- Time each layer per tick (plants, weather, bugs, animals, eggs, disease, stats) on seeds 42, 7 and 123.
- Write the split to `compute/profile.md`. This decides which layers are worth a GPU path.

## Phase 1: sim in a Web Worker
- New `js/simWorker.js` loads the same sim scripts with `importScripts` and owns the `Ecosystem`.
- The main thread sends commands: new world, play speed, step, options, inspect, save and load.
- The worker sends a **view snapshot** each frame. It holds copies of the typed arrays the renderer reads, in transferable buffers. Species, stats, events and history go at a lower rate.
- New `js/simClient.js` gives `main.js` and `render.js` an `eco`-shaped read-only view, so UI code changes as little as possible.
- Save and load run inside the worker with `EvoSave`.
- **Fallback:** if `new Worker` fails, or with `?worker=0`, the current main-thread path is used.
- **Multicore** (splitting plants, soil and bugs across several workers) needs `SharedArrayBuffer`, so it only works on a cross-origin-isolated host. It is a stretch goal, and only if Phase 0 shows grids dominate.
- **Targets:**
  - The UI stays at 60 fps at Max speed.
  - Sim ticks per second at Max are at least as high as now.
  - Results are identical with and without the worker (same stats at tick 3000 on all three seeds).

## Phase 2: WebGPU fast mode
- A **Fast mode (GPU)** toggle in settings, shown only when `navigator.gpu` is available. Turning it on warns that runs stop being exactly repeatable.
- New `js/gpu/*.js`: WGSL compute kernels for the grid layers Phase 0 picks (likely plant growth and spread, soil, and weather diffusion). Buffers stay on the GPU between ticks, and only the arrays animals need are read back.
- Saves made in fast mode are marked `fast: true` in the header. They still load, in either mode.
- **Parity test:** GPU and CPU runs from the same seed stay within tolerance on plant biomass, cover and population totals over 3000 ticks.
- Every grid change in later slices (for example, slice 5 soil nutrients) must update both paths, or the GPU path falls back to the CPU for that layer.

## Testing here
- This container has no GPU, so Phase 2 is checked with SwiftShader (correctness only, not speed). The user checks the real speed on their own machine.
- The headless runner `pall.sh` runs the three seeds in parallel to save time.
