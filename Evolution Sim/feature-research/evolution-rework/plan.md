# Plan: bring the Evolution Sim rework in line with build-opus

The rework (new `js/sim/*`, WebGL2 `render.js`, `icons.js`, `charts.js`, `main.js`, redesigned `index.html`/`style.css`, world-gen tuning in `mapGenerator.js`) was built outside this workflow. This pass adds the missing records. No behaviour changes.

## 1. Remove comments written during the rework

- Remove all comments (`//` and `/* */`, including the one inside the GLSL shader strings) from files created in the rework:
  `js/charts.js`, `js/icons.js`, `js/main.js`, `js/render.js`, `js/sim/core.js`, `js/sim/plants.js`, `js/sim/animals.js`, `js/sim/ecosystem.js`.
- `js/mapGenerator.js`: remove only the three comments added this session: "Noise-bent edge distance…", "Mild curve…" and "Polar cold stays near the edges…". Every other comment in that file already existed and stays.
- `js/noise.js`, `js/biomes.js`: untouched.
- Before deleting any comment that carries design intent (a tuning rationale, a non-obvious mechanic), copy its content into `CODE_REFERENCE.md` or the audit.

## 2. Create `CODE_REFERENCE.md` (open question, needs user OK)

- The project has no code reference doc. Create `CODE_REFERENCE.md` with one section per module:
  - sim core
  - plants
  - animals
  - ecosystem
  - icons
  - renderer
  - charts
  - app/main
  - world generation
- Each section lists public objects, functions, data layouts and non-obvious mechanics.
  - Data layouts: typed-array genes, the SoA animals, texture channel layouts.
  - Mechanics: woody floor, fruit reach, prey-size limit, water cover, the tick accumulator and interpolation.

## 3. `complexities.md`

Already created by the orchestrator. The implementer only updates it if a score changes, which is not expected.

## 4. Audit and screenshots

- Write `feature-research/evolution-rework/audit.md`. It starts with a "Files changed" list for the whole rework and ends with verification results and next steps.
- Screenshots go in `feature-research/evolution-rework/screenshots/`:
  - `before.png`: the pre-rework app, extracted from `git HEAD` into the scratchpad and rendered headless.
  - `after.png`: the new app at `index.html?play#7`.
  - Browser: `~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome --headless=new --no-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=1600,950 --virtual-time-budget=20000 --screenshot=…`

## Tests

- `node --check` on every JS file.
- After removing comments, confirm there are none left: `grep -nE '//|/\*'` on the eight new files.
- Check the one line in `mapGenerator.js` that intentionally keeps a `//` inside a string: none expected.
- Headless render: the after screenshot shows the map and panels, and dump-dom has no error overlay.
- Headless sim run, 1000 ticks, seed 7: no exceptions, and all trophic groups are above 0.

## Out of scope

- Any logic, balance or visual change. This includes the known open items:
  - omnivore dips on seed 42
  - ms/tick up to ~16 on seed 123
  - the plant-biomass readout in the scratch test script
- New code comments.
- git commits.
