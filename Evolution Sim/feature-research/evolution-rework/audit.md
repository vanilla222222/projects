# Audit: Evolution Sim rework

This audit covers two things:

- **The rework:** a new simulation, a WebGL2 renderer and a redesigned UI.
- **The build-opus pass:** it removed comments and added `CODE_REFERENCE.md`, the screenshots and this audit.

The pass changed no behaviour. A headless run on seed 7 gives identical output before and after the comment removal (see "Test results").

## Files changed

Paths are relative to `Evolution Sim/`. The whole rework is compared against the committed `HEAD`.

**New:**

- `js/sim/core.js`
- `js/sim/plants.js`
- `js/sim/animals.js`
- `js/sim/ecosystem.js`
- `js/icons.js`
- `js/render.js`
- `js/charts.js`
- `js/main.js`. This is a new file. It replaces the old `js/main.js`, which was deleted.
- `CODE_REFERENCE.md`
- `complexities.md`, created by the orchestrator.
- `feature-research/evolution-rework/plan.md`
- `feature-research/evolution-rework/audit.md`, this file.
- `feature-research/evolution-rework/screenshots/before.png`
- `feature-research/evolution-rework/screenshots/after.png`

**Modified:**

- `index.html`
- `css/style.css`
- `js/mapGenerator.js`

**Removed.** These old files were deleted and replaced by the new modules:

| Old file | Replaced by |
| --- | --- |
| `js/animalGenetics.js` | `js/sim/animals.js` |
| `js/animalSystem.js` | `js/sim/animals.js` |
| `js/chart.js` | `js/charts.js` |
| `js/genetics.js` | `js/sim/core.js` and `js/sim/plants.js` |
| `js/main.js` (old) | the new `js/main.js` |
| `js/plantSystem.js` | `js/sim/plants.js` |
| `js/renderer.js` | `js/render.js` and `js/icons.js` |
| `js/species.js` | `js/sim/core.js` |

The git index records these eight files as renamed to `legacy/…`, but `legacy/` does not exist on disk. The pass made no git changes, so this state was already there before it ran.

**Untouched:** `js/noise.js` and `js/biomes.js`.

## Per-file rationale

- **`js/sim/core.js`** (new): shared primitives. The RNG is an allocation-free xorshift. It also holds the gene maths, species colors, the registry and the event log. Comments were removed; the RNG, `gaussRand`, history-halving and `matchDaughter` intent is in CODE_REFERENCE under "Sim core".
- **`js/sim/plants.js`** (new): tile-based vegetation. Structure-of-arrays typed arrays hold logistic biomass, the woody floor, fruit reach, and spread with competition and speciation. The removed archetype-name and design comments are in CODE_REFERENCE under "Plants".
- **`js/sim/animals.js`** (new): animals stored as structure-of-arrays, with a counting-sort grid and a continuous diet gene. The file also covers flee, hunt, graze and roam behaviour, cover, prey-size limits and litter budgets. The removed gene-layout, state-code and behaviour comments are in CODE_REFERENCE under "Animals".
- **`js/sim/ecosystem.js`** (new): orchestration, founders, migrations as a safety net, stats and history. The removed intent is in CODE_REFERENCE under "Ecosystem".
- **`js/icons.js`** (new): vector icon parts shared by the SVG UI and the WebGL atlas. The removed role and atlas-channel comments are in CODE_REFERENCE under "Icons".
- **`js/render.js`** (new): the WebGL2 terrain pass and instanced sprites. Every GLSL comment inside the shader template strings was removed along with the JS comments; their meaning is recorded in CODE_REFERENCE under "Renderer".
- **`js/charts.js`** (new): canvas charts. The log-scale rationale is in CODE_REFERENCE under "Charts".
- **`js/main.js`** (new): the UI controller. The section-divider comments and the backlog-cap comment were removed. The tick accumulator is documented in CODE_REFERENCE under "App / main".
- **`js/mapGenerator.js`** (modified): the rework's world-generation tuning. It changed the noise-bent edge falloff, added `ALTITUDE_CURVE = 1.2`, and changed polar temperature to `latitude^1.4` with a lapse rate of 0.75. Only the three rework comments were removed ("Noise-bent edge distance…", "Mild curve…" and "Polar cold stays near the edges…"); their intent is in CODE_REFERENCE under "World generation". All 78 older `//` lines remain, the same count as `HEAD`.
- **`index.html` and `css/style.css`** (modified): the redesigned layout loads the new script set. This pass did not edit them.
- **`CODE_REFERENCE.md`** (new): one section per module, as the plan lists.
- **`complexities.md`**: no score changed materially, so it was not edited.

## Verification checklist

- [x] **No comments remain in the eight new files.**
  - Command: `grep -nE '//|/\*' js/charts.js js/icons.js js/main.js js/render.js js/sim/core.js js/sim/plants.js js/sim/animals.js js/sim/ecosystem.js`
  - Output: nothing, exit code 1.
- [x] **The comment removal changed only comments.** Each file was compared with its pre-strip copy after removing `//…` text and blank lines from both. All 8 files matched (`ok`).
- [x] **`js/mapGenerator.js` has no `//` inside a string.**
  - Command: `` grep -nE "[\"'\`][^\"'\`]*//" js/mapGenerator.js ``
  - Output: nothing, exit code 1.
  - `grep -c '//'` gives 78 both in the working copy and in `HEAD`. The three removed comments were rework additions that `HEAD` did not have.
- [x] **No new comments were added anywhere.** The pass edited only by deletion in the eight new files and in `mapGenerator.js`.
- [x] **CODE_REFERENCE entries are present.**
  - `grep -nE '^## ' CODE_REFERENCE.md` lists these sections: Sim core, Plants, Animals, Ecosystem, Icons, Renderer, Charts, App / main, and World generation.
  - `grep -ci` count for each required topic:

    | Topic | Count |
    | --- | --- |
    | Woody floor | 3 |
    | Fruit reach | 2 |
    | Prey-size limit | 1 |
    | kelp (water cover) | 4 |
    | Tick accumulator and interpolation | 1 |
    | Species color lookup | 1 |
    | structure-of-arrays | 3 |
    | texture channel layout | 1 |
    | Noise-bent edge | 1 |
    | Altitude curve | 1 |
    | Polar temperature | 1 |

- [x] **`complexities.md` exists** in the project root.
- [x] **Both screenshots exist:** `before.png` (135,812 bytes) and `after.png` (827,180 bytes).

## Test results

1. **Syntax check.**
   - Command: `node --check` on every file in `js/*.js` and `js/sim/*.js`.
   - Result: all 11 files pass (`biomes`, `charts`, `icons`, `main`, `mapGenerator`, `noise`, `render`, `sim/animals`, `sim/core`, `sim/ecosystem` and `sim/plants`).
2. **Comment grep.** No matches (see the verification checklist).
3. **Headless render.**
   - Commands:
     - `chrome --headless=new --no-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=1600,950 --virtual-time-budget=20000 --screenshot=… "file://…/index.html?play#7"`
     - The same flags with `--dump-dom`.
   - The after screenshot shows:
     - The shaded world map, with coast, lakes, mountains, snow and plant tint.
     - Animal sprites.
     - The left ecosystem panel with stat cards, the population chart area and the map controls.
     - The right species panel, showing the Plants tab with 12 species.
     - The header, reading Pause, Spring, Year 1.
   - In the DOM dump, `#mapError` has `hidden=""`, and the string "Could not start" does not appear, so there is no error overlay. The dump shows `tickLabel` "tick 1" and `speciesTotals` "25 living species".
   - Headless virtual time advanced only a few ticks, so the population chart has almost no data yet. This is expected.
4. **Before screenshot.**
   - Setup: `HEAD` was extracted with `git archive HEAD "Evolution Sim" | tar -x` into the scratchpad, then rendered with the same chrome flags. The old app has no autoplay flag.
   - Result: it rendered successfully. It shows the old UI at tick 0, with the small canvas world map, the left control and stat column, and the right species lists.
5. **Headless sim, seed 7, 1000 ticks.**
   - Command: `node run.js 7 1000` in the scratchpad harness.
   - Result: no exceptions, exit code 0. At t1000 every trophic group is above 0:

     | Group | Count at t1000 |
     | --- | --- |
     | Land herbivores | 1031 |
     | Land omnivores | 47 |
     | Land carnivores | 63 |
     | Water herbivores | 360 |
     | Water omnivores | 44 |
     | Water carnivores | 59 |

   - Plant biomass is 25,777, with 12 plant species and 11 animal species.
   - The run was done both before and after the comment removal. Both runs printed identical counts at every 250-tick checkpoint (only the ms timings differ), which confirms the pass changed no behaviour.

## Known open items

These are out of scope for this pass and were not changed.

- On seed 42, the omnivore population dips to low numbers mid-run.
- On seed 123, the sim cost reaches about 16 ms per tick.
- On seed 123, the plant-biomass readout in the scratch test script (`run.js`) shows 0. This is a readout issue in the harness, not in the app.
- Headless screenshots advance only a few ticks under `--virtual-time-budget`, so `after.png` shows an early-state population chart.
- The git index still records the old js files as renamed to `legacy/`, which is absent on disk. The owner should decide whether to keep `legacy/` or record a plain delete at commit time.

## Next steps

1. Investigate the omnivore dips on seed 42. The prey-size limit (0.6× mass for omnivores) and the fruit reach peak are the likely levers.
2. Profile seed 123 to find what drives the ~16 ms/tick cost. Likely candidates are the grid queries in `_nearest` under dense herbivore populations and the plant `step`/`_spread` loop.
3. Fix the scratch harness's plant-biomass readout for seed 123. It should read `eco.stats.plantBiomass` after at least one step and check the water/land split.
4. Resolve the `legacy/` rename state in git before committing the rework.
5. Optionally, capture a later-state `after.png` by stepping the sim headlessly before the screenshot, so the population chart shows data.
