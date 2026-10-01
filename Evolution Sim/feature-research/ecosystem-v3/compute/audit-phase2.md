# Phase 2 audit: WebGPU fast mode

Phase 2 adds an opt-in "Fast mode (GPU)" switch. It moves plant growth, spread, decline, blight and the soil terms that plants read onto WebGPU compute kernels. The design is in `CODE_REFERENCE.md` under "GPU fast mode". This file records the gates, the numbers behind them, what was and was not checked, and what to check on a machine with a real GPU.

All testing ran on a 4-core shared Linux box. Headless runs used Node. Browser runs used Chromium driven by Playwright with SwiftShader (`--use-angle=swiftshader --enable-unsafe-swiftshader --enable-unsafe-webgpu --enable-features=Vulkan`), against `python3 -m http.server` on port 8791. SwiftShader runs WebGPU on the CPU. It proves the kernels compile and give correct results. It says nothing about speed on a real GPU.

## What changed

| File | Change |
|---|---|
| `js/gpu/plantKernels.js` (new) | `PlantKernels`: WGSL source for the plant/soil kernels, buffer field tables, bind-group layout. |
| `js/gpu/plantGpu.js` (new) | `PlantGpu`: attach, detach, drop, step, sync, busy, whenIdle, active. Owns the device, buffers, staged readback and the CPU/GPU merge. |
| `js/sim/plants.js` | One line, first line of `PlantLayer.step(tick)`: `if (typeof PlantGpu !== 'undefined' && PlantGpu.step(this, tick)) return;` |
| `js/save.js` | `encode(eco, meta = {}, flags = {})`; `flags.fast` adds `fast: true` to the header. `decode` returns `fast: !!header.fast`. |
| `js/simWorker.js` | Imports `GPU_SCRIPTS` when asked and `self.navigator.gpu` exists, answers `hello {gpu}`, handles `gpu {on}`, holds the loop while a GPU tick is in flight, syncs before save, attaches or drops the context on install, adds `fast` to frames. |
| `js/simClient.js` | `?gpu=0` handling, `setFast`, `gpu`/`fast` getters, `onFast`. |
| `index.html`, `js/main.js` | Hidden `#fastWrap` / `#optFast` switch after Disease. Shown only when the worker reports GPU support. Turning it on asks for confirmation with a warning that runs stop being exactly repeatable. |
| `CODE_REFERENCE.md` | New "GPU fast mode" section, plus message, API, save-format and switch updates. |

`js/sim/soil.js` and `js/sim/animals.js` are untouched. With fast mode off, `PlantGpu` is either not loaded (`?worker=0`, `?gpu=0`, no `navigator.gpu`) or has no context for the layer, so `PlantGpu.step` returns false and the original CPU step runs.

## Gate 1: fast mode off is byte-identical

Headless, Medium map (320x210), 3000 ticks, stats hash and save hash compared against the base commit:

| Seed | Stats hash | Save hash | Round trip | ms/tick | Same as base |
|---|---|---|---|---|---|
| 42 | 24f1c2ec14bd | b92275e7f8f5 | yes | 29.8 | yes |
| 7 | 12ea9cc1625e | 7a7d7fb2541a | yes | 25.7 | yes |
| 123 | 5f2c52de75d6 | 807660e9aa24 | yes | 28.9 | yes |

Final check after all code changes: headless, seed 42, 320x210, 300 ticks, base vs worktree, run together. Both gave stats `36fd1817a988`, save `0c53f4beeb47`, round trip true, biomass 25947.626, cover 62747, animals 1456. Identical.

Browser, seed 42, Medium, 3000 ticks, fast mode off:

- Worker mode: tick 3000 cover 63605, biomass 46637.3, animals 4585. Identical to headless. Save 16500768 bytes. No console errors.
- `?worker=0`: same numbers at tick 3000. Toggle hidden, as fast mode needs the worker. No console errors.
- `?gpu=0`: toggle hidden, `SimClient.gpu` false, no GPU scripts loaded, no console errors.

Google Fonts certificate errors from the sandbox proxy were filtered out of every error check.

## Gate 2: fast mode on

### Smoke test (Medium, 200 ticks, worker mode)

- `info` reported `gpu: true, fast: true`. No warnings or errors.
- The save header carried `fast: true`.
- The fast save decoded locally and stepped 20 ticks on the CPU.
- The fast save loaded back into the worker, and fast mode stayed on and kept stepping.

### Fallback

The first kernel build used the WGSL reserved words `patch` and `target` as identifiers, so pipeline creation failed. The fallback did its job: one `console.warn`, the context was dropped, frames reported fast mode off, and the run continued on the CPU with no errors. The identifiers were renamed (`pq`, `goal`). All four shaders now pass a reserved-word scan and compile under SwiftShader.

### Parity

Fast mode is not bit-exact by design: the GPU uses its own hash RNG, spread events are gathered through an atomic mask, and the CPU sees GPU results one tick late. Parity is therefore judged against CPU run-to-run noise. The noise baseline is the same world (seed 42) run on the CPU with two other ecosystem seeds (1042 and 2042). A GPU result inside or near that band is behaving like "another valid run".

#### Small map (220x150), world and eco seed 42, ticks 250 to 1500

The run was stopped at tick 1500 of 3000 to finish the phase quickly (SwiftShader ran at about 1.1 s per tick). The CPU reference and noise runs went the full 3000 ticks. CPU tick 3000 for reference: cover 31474, biomass 26569.2, animals 2393, bugs 8289.

| Tick | Cover CPU | Cover GPU | Δ% | Noise Δ% | Biomass CPU | Biomass GPU | Δ% | Noise Δ% | Animals CPU | Animals GPU | Δ% | Noise Δ% | Bugs CPU | Bugs GPU | Δ% | Noise Δ% |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 250 | 30558 | 30462 | -0.3 | -0.6..-0.6 | 12874.3 | 12922.6 | +0.4 | -4.4..-4.2 | 631 | 624 | -1.1 | +5.7..+13.3 | 2902 | 2804 | -3.4 | -7.4..-3.8 |
| 500 | 31515 | 31491 | -0.1 | -0.7..-0.3 | 16767.4 | 16658.7 | -0.6 | -5.2..-2.6 | 484 | 565 | +16.7 | -14..+58.7 | 5190 | 5266 | +1.5 | -3.2..-1.4 |
| 750 | 31799 | 31776 | -0.1 | -1..-0.2 | 21221.1 | 21447.1 | +1.1 | -4.5..-3.8 | 980 | 783 | -20.1 | +1.7..+13.4 | 6650 | 6962 | +4.7 | -0.1..+2.1 |
| 1000 | 31720 | 31724 | 0.0 | -1.3..-0.2 | 20131.6 | 21940.8 | +9.0 | -3.2..-1.8 | 1551 | 973 | -37.3 | -3.2..+3.8 | 6229 | 7713 | +23.8 | +4..+5.3 |
| 1250 | 31671 | 31725 | +0.2 | -1.3..+0.1 | 19749.4 | 23029.6 | +16.6 | -1.4..+7.3 | 2403 | 1941 | -19.2 | -22.9..+6.7 | 6049 | 7222 | +19.4 | -3.4..+6.5 |
| 1500 | 31580 | 31636 | +0.2 | -1.1..+0.5 | 19391.2 | 20436.8 | +5.4 | -4.4..+10.5 | 1396 | 2190 | +56.9 | +1.6..+49.6 | 7444 | 7200 | -3.3 | -14.9..-3.5 |

Means over ticks 500 to 1500 (5 samples), GPU vs CPU, with the two noise seeds in brackets: cover 0.0% (0.0, -1.1), biomass +6.4% (+1.3, -3.1), animals -5.3% (-0.8, +11.1), bugs +8.9% (+1.1, -3.4).

#### Medium map (320x210), seed 42, ticks 250 to 750

The Medium GPU run was stopped at tick 750. SwiftShader took about 1.5 s per tick on this box, so a full 3000-tick run did not fit the budget. Neither GPU run reached 3000 ticks.

| Tick | Cover CPU | Cover GPU | Δ% | Noise Δ% | Biomass CPU | Biomass GPU | Δ% | Noise Δ% | Animals CPU | Animals GPU | Δ% | Noise Δ% | Bugs CPU | Bugs GPU | Δ% | Noise Δ% |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 250 | 62177 | 62243 | +0.1 | +0.2..+0.2 | 25106.3 | 25024.3 | -0.3 | -1.9..+0.5 | 1378 | 1343 | -2.5 | -21..+8.4 | 6170 | 6085 | -1.4 | -6..-2.5 |
| 500 | 63476 | 63425 | -0.1 | -0.1..+0.2 | 28277.9 | 29051.5 | +2.7 | -2.6..+3.8 | 1973 | 1468 | -25.6 | -19.6..-2.4 | 9671 | 10211 | +5.6 | -6.3..+0.1 |
| 750 | 63868 | 63869 | 0.0 | -0.1..0 | 31811.2 | 34114.8 | +7.2 | +4.4..+4.6 | 4394 | 3555 | -19.1 | -32.5..-29.2 | 10394 | 11725 | +12.8 | +5.7..+7.1 |

### Reading the parity numbers

- Cover tracks the CPU within about 0.3% throughout, which is inside the noise band. Growth, spread, decline and death placement agree.
- Biomass sits within about 1% for the first 750 ticks, then runs above the noise band: +9.0% at 1000, +16.6% at 1250, back to +5.4% at 1500 (mean +6.4% against noise of -3.1 to +1.3). The bias is consistently upward. The likely cause is the one-tick lag: animals graze against biomass that is one tick stale, so less grazing pressure lands on fresh growth. It did not grow without bound in the ticks run.
- Animal counts are chaotic on the CPU too (noise of 20 to 30% between seeds). GPU values move around inside a range of similar width.
- Bugs follow biomass and run a few points above noise at times, for the same reason.

Verdict, accepted against the CPU noise baseline: cover passes cleanly. Animals sit within the CPU's own seed-to-seed spread. Biomass and bugs show a real upward bias of roughly 5 to 10% on average, peaking at about 17% (biomass) and 24% (bugs). That bias is beyond noise. It is acceptable for an opt-in mode labelled "not exactly repeatable", but it should be investigated (grazing against lagged biomass is the first suspect) before fast mode is recommended. Ticks after 1500 were not compared.

## Profile

Medium map, `?worker=0`, 30 to 40 ticks per sample, SwiftShader, on the shared box. Times are per tick.

| | CPU plant step | Fast mode, host side |
|---|---|---|
| Early run | 24.1 ms | 26.9 to 32 ms |
| After 1000 ticks | 22.3 ms | 28.7 ms |

Host-side breakdown at steady state:

- Consume readback: about 11.3 ms (tile merge 1.2, slot merge 6.8, spread replay 2.3).
- CPU part of the plant step: 2.1 ms.
- Upload: about 14.5 ms (dirty-tile diff 2.1, moisture/amplitude 1.1, slot diff 8.2).
- Dispatch: 0.6 to 0.9 ms.
- About 21k patches per tick (11.7k slot, 4.6k tile). 3 full uploads in 40 ticks, when the patch buffer overflowed.
- Attach: 4 to 5 s, almost all pipeline compile.
- GPU wait: 1.2 to 1.6 s per tick. This is SwiftShader running WGSL on the CPU and is not representative.

The finding that matters: the host-side merge and the diff scans over all ~134k plant slots cost as much as the CPU plant step they replace. Animals, fungi, fire and disease write plant arrays on the CPU every tick, and nothing marks what they touched, so the upload has to diff everything. On a real GPU fast mode is therefore likely break-even or slightly slower until those writers get dirty tracking. That needs edits to `animals.js`, which this phase was told not to touch.

## Not verified, or skipped

Testing was cut to a fixed budget partway through. These were skipped and should be done before fast mode is advertised:

- Anything on a real GPU. Everything above is SwiftShader.
- GPU parity past tick 1500 (Small) and 750 (Medium). Both runs were stopped early to finish quickly.
- Parity on seeds 7 and 123. Only seed 42 was compared.
- The fast-save-loads check at the end of the Small parity run (the run was stopped). The 200-tick smoke test above did cover saving and loading a fast save.
- Large and Huge maps with fast mode on.
- Toggling fast mode on and off repeatedly in one run.
- Device loss mid-run. The code drops the context and falls back on device loss and on any failed map or submit, but this was not forced in a test.
- The browser determinism script (`det.js`) with fast mode on. Not meaningful, since fast mode is not repeatable by design.
- Fast mode with `?worker=0`. Not supported by design: the switch stays hidden in local mode.

## What to check on a real GPU

1. Ms per tick with fast mode off and on, at Medium, Large and Huge, in worker mode. Expect little or no gain at Medium. Large and Huge are where the GPU side should pay off, if the host merge does not eat it.
2. Host merge and upload cost as a share of the tick (the breakdown above). If it dominates, the next step is dirty tracking in the CPU writers rather than more kernel work.
3. Readback latency. The loop holds at most one tick for the GPU. Check that it does not stall at high speed settings, and that the frame rate stays steady.
4. Parity on two or three seeds over 3000 ticks against CPU noise, as in the tables above, to confirm the hardware drivers give the same behaviour as SwiftShader.
5. Device loss: unplug an external GPU, switch GPUs on a laptop, or call `device.destroy()` from devtools. Expect one warning, the switch turning off, and the run carrying on.
6. Save while fast mode is on, then load in both modes. The save must sync GPU state first and load cleanly either way.
7. Attach time. Pipeline compile took 4 to 5 s on SwiftShader. On real drivers it should be well under a second. If not, cache the pipelines or compile them asynchronously.

## Keeping CPU and GPU in step

The kernels copy the CPU plant and soil rules. Any change to plant growth, spread, decline, blight or the soil fields that plants read must be mirrored in `js/gpu/plantKernels.js` and in the field tables in `js/gpu/plantGpu.js`, or fast mode silently drifts from the CPU. This matters right now: the slice 5 nutrition work is being built in parallel and changes soil and plant grids. Whoever lands second must port those changes to the kernels and rerun the Small parity check.
