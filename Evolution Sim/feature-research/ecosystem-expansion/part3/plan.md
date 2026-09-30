# Plan: Part 3, "Bugs" (pests, decomposers, parasites and pollinators)

Source: [roadmap.md](../roadmap.md), Part 3. This part builds on Part 2 (flowers, fruit, litter).

Bugs are **swarm densities per tile**, not individuals. They are grouped into species that evolve and speciate the way plants do. User decision (approval): bugs are inspectable by clicking a swarm, which opens that bug species. Individual bugs are still not simulated.

## Data layout: one plane per niche

This follows the plant slot planes: `q = niche*n + i`, where `n = W*H`.

| Niche | Index | Lives on | Feeds on | Effect |
| --- | --- | --- | --- | --- |
| pest | 0 | land | plant biomass on the tile (both slots) | eats biomass and lowers plant health; boom and bust; locust swarms |
| detritivore | 1 | land + water | `soil.litter` | turns litter into nutrient faster than natural decay |
| parasite | 2 | land + water | animals on the tile | drains animal energy |
| pollinator | 3 | land | flower bloom and fruit-tree bloom (`_bloomK * bloomNow`) | writes the per-tile pollination score |

## New file `js/sim/bugs.js`: `BugLayer`

Constructor: `new BugLayer(world, plants, animals, registry, log, rng)`. It is created by `Ecosystem` and exposed as `eco.bugs`.

**Arrays**
- `species` Int32 and `density` Float32, both size `4n`. Density ranges 0..1 and 0 means empty.
- `total` Float32 size `n`: summed density per tile, for the heat map and tooltip.
- `genome` Float32 size `4n*BG`.

**Genes (`BG = 9`)**

| Gene | Name | Notes |
| --- | --- | --- |
| g0 | prefTemp | |
| g1 | prefMoist | |
| g2 | appetite | Faster growth and bigger effect, higher death rate. |
| g3 | mobility | Spread chance and distance. |
| g4 | fecundity | Logistic `r`. |
| g5 | swarm | Pests only: tendency to go migratory. |
| g6 | hue pref | Pollinators only: preferred bloom colour, 0..1 matching plant g12. |
| g7 | specialism | Pollinators only. |
| g8 | host pref | Parasites only: the animal size they prefer. |

- `BUG_WEIGHTS` and `BUG_ARCHETYPES` are founders. There are at least 2 per niche, with varied climates.
- `bugCategory(g, niche)` returns the icon name:
  - pest: `aphid`, or `locust` when swarm > 0.6
  - detritivore: `beetle`, or `worm` in wet or water tiles
  - parasite: `tick`, or `leech` in water
  - pollinator: `bee` for generalists, `butterfly` for specialists (specialism > 0.55)

**Species**
- Species come from `registry.create({group:'bug', domain, ...})`.
- Each species gets `sp.niche`, `sp.category`, `sp.icon` and `sp.density` (mean).
- Population is the number of tiles occupied, refcounted through `_set` and `_clear` exactly as plants do.
- Speciation works as in plants: `geneDistance > BUG_SPECIATION`, then `matchDaughter`, then a new species plus a `'speciation'` log entry.
- `refreshSpeciesMeans()` runs every 20 ticks.

**`step(tick)`**
- It runs every `BUG_EVERY = 2` ticks, with all rates scaled to match, to protect performance.
- There is one loop over occupied cells. Cells with density 0 are skipped quickly.
- For each occupied cell:
  - `K = food(niche, i) * gaussFit(temp) * gaussFit(moist)`, then logistic growth plus appetite-scaled mortality.
  - Food sources:
    - pest: plant biomass times `(1 - 0.7*plant defence)`
    - detritivore: `litter[i]`
    - parasite: `animals.tileLoad[i]`
    - pollinator: nectar from both slots of the tile, times the hue match
  - Effects:
    - **pest:** `plants.damage(i, density*appetite*PEST_BITE)`. This lowers biomass, and also health through its own `PEST_HEALTH` term.
    - **detritivore:** takes `density*DETRI_RATE` from litter. It adds `DETRI_RECYCLE` (0.5, much higher than the natural 0.15) of that to nutrient.
    - **parasite:** writes `animals.parasiteLoad[i] = density*appetite`.
    - **pollinator:** `plants.poll[i] = min(1, density * effectiveness)`, where `effectiveness = (0.5 + 0.5*specialism) * match`.
    - Hue match: `match = 1 - specialism * min(1, |hueDiff| / 0.25)`, using the nearer circular hue difference.
    - Generalists get a K bonus of `(1 + 0.4*(1 - specialism))`.
  - **Spread:**
    - Chance is `mobility * density`.
    - The child goes to a random neighbour within 1 to 2 tiles (up to 3 when mobility is high).
    - Mutation is `mutateGenes`.
    - **Co-evolution:** for pollinators, the child's g6 drifts 10% toward the target tile's flower hue.
    - The child takes an empty cell, or replaces a weaker resident when `strength = density * climate fit` is higher.
- **Locust swarm:**
  - Trigger: pest density > `LOCUST_DENSITY` (0.85), `swarm > 0.6`, and the tile's plant biomass is nearly gone.
  - Most of the density jumps 4 to 8 tiles in one heading.
  - A per-species cooldown applies.
  - It logs `'info'`: "<name> locusts are swarming". Logging is limited to once per species every 480 ticks.
- **Pollinator collapse:**
  - Track the rolling peak of total pollinator density.
  - When the total drops below 25% of the peak, log `'info'` "Pollinator collapse".
  - Cooldown is 960 ticks, and the peak resets after logging.
- **Migrations:**
  - `reintroduce(niche)` is exposed. `Ecosystem._migrations` calls it when a niche has 0 occupied tiles and `options.migrations` is on.
  - It logs `'migration'`.
- **Counters:** `pestDamage`, `detritusEaten`, `parasiteDrain`, `swarms`, `collapses`, and per-niche `tiles[4]` and `mass[4]`.
- **`eat(i, amount)`:**
  - Animals eat pest, detritivore and pollinator density on tile `i`. Parasites are not eaten.
  - It returns the amount taken.
  - It clears a cell that falls below the minimum.

## `js/sim/plants.js`

- **New gene g13, pest defence (PG 13 → 14).**
  - Add a weight of 0.6.
  - Archetypes get 0.1 to 0.4. Fungi get 0.
  - Cost: `growth *= 1 - 0.25*defence`.
  - `plantTraitsFrom` returns `defence`.
  - Every PG-dependent site listed by the scout adapts. `animals.js` `seedGenome` and `mutateGenes` use PG already.
- **Pollination.**
  - `poll` is a Float32 of size `n`. It starts at 0 and bugs overwrite it each bug step.
  - It decays by `*0.9` per plant step when there are no visitors.
  - In the spread probability, the bloom term becomes `(1 + bloomK*bloomNow*(POLL_WIND + (1-POLL_WIND)*poll[i]))`, with `POLL_WIND = 0.3`.
  - The fruit target becomes `fq*b*fruitNow*h*(POLL_FRUIT_BASE + (1-POLL_FRUIT_BASE)*poll[i])`, with `POLL_FRUIT_BASE = 0.4`.
- **`damage(i, amount)`.**
  - It bites under first, then canopy, like `graze`.
  - It also lowers `health` by `amount*PEST_HEALTH`.
  - It returns the total taken.
  - Starvation clearing stays in `step`.
- **`nectar(i)`:** returns the bloom intensity summed over both slots, and the hue of the dominant bloom.

## `js/sim/animals.js`

- **`tileLoad` (Uint16 of size n).** It is cleared and filled in the existing per-tick loop: count animals per tile, weighted by mass.
- **`parasiteLoad` (Float32 of size n), written by bugs.** In the cost line: `cost += parasiteLoad[tile] * PARASITE_DRAIN * mass * (1 - 0.6*armor)`.
  - Deaths where that drain was a meaningful share of the cost count toward `deaths.parasite`. Otherwise they stay under `starved`.
- **Insect eating.**
  - Eligibility: `mass < BUG_MASS` (1.4, about mice, fish, crabs, rabbits and foxes), and `plantEff` or `diet` in the omnivore band.
  - Weight: `bugEff = max(0, 1 - |diet-0.5|*1.4)`.
  - It is a non-exclusive gain before the cost line: `energy += bugs.eat(tile, bite*bugEff) * BUG_ENERGY`.
  - `_pickForage` adds `bugs.total[tile]*bugEff` to its food score.
- `animals.bugs` is set by `Ecosystem` after construction. It may be null when bugs are absent, so every use is guarded.

## `js/sim/soil.js`

- Add `consumeLitter(i, amount)`, which returns the amount taken.
- The detritivore recycle constant belongs in `bugs.js`.

## `js/sim/ecosystem.js`

- **Tick order:** `plants.step`, then `bugs.step`, then `animals.step`.
- Call `bugs.refreshSpeciesMeans` every 20 ticks.
- **Stats:**
  - `bugs` (total density, rounded)
  - `pests`, `detritivores`, `parasites`, `pollinators` (tiles occupied)
  - `pollination` (mean `poll` over flower tiles)
- **History:** add `bugs`, sampled like `plants`.
- **`_logExtinctions`:** bug species count as notable when `peak >= 60`.
- **`_migrations`:** calls `bugs.reintroduce` for empty niches.
- Do not add bugs to `STAT_GROUPS`, because that list drives the animal tallies and migrations.

## UI slice: `render.js`, `main.js`, `icons.js`, `index.html`, `css/style.css`

- **Icons.** Add `aphid`, `locust`, `beetle`, `worm`, `tick`, `leech`, `bee` and `butterfly` in the existing `[role, pathD, stroke?]` format, plus a `bug` tab icon.
- **Bugs map view.**
  - Add a `RAMPS.bugs` ramp (dark, then amber, then hot pink), a `LIVE_MODES.bugs` entry, and a `setMode` branch using `percentile99(bugs.total)`.
  - Add a `<button data-mode="bugs">Bugs</button>` in `index.html`.
- **Swarm particles.**
  - Add `_pushBugs` at `zoom >= 9`. It is not gated on `vegOn`, so it draws in every mode.
  - For each occupied niche cell, draw `ceil(density*4)` tiny `dot` sprites. Each is about 0.07 world units.
  - Position is a hash of `(q, j)` plus `sin/cos(this.time*speed + phase)` jitter.
  - Colour is the species colour, reusing `spCol` through `_refreshSpeciesLookup`. That lookup must cover bug species ids, which share the registry id space.
  - Call `_ensureCapacity` before drawing.
- **Bugs tab** (`data-tab="bug"`, `<em id="countBug">`).
  - `speciesInTab`, `updateTabCounts`, `selectSpecies` and `setTab` route `group === 'bug'`.
  - The list unit is " tiles".
  - `renderDetail` adds a `BUG_TRAITS` table for g0–g8. Rows that don't apply to a niche are hidden.
  - Grid cells are Population (tiles), Peak, Appeared, and Mean density.
  - Badges show the niche.
  - Fit five tabs into the 330px panel: tighter tab padding and font, and Events keeps text only. If it still clips, widen the right column to 350px. Verify this in a screenshot.
- **Stats.**
  - Add a wide "Bugs" stat card showing the total, per-niche tile counts, and pollination %.
  - The pop chart gets a `bugs` series with a colour in `GROUP_COLORS` and a legend toggle.
- **Tooltip.** Add one `.tt-row` per occupied niche on the tile (icon, name, niche, density %), and a `Pollination NN%` entry in `.tt-meta` on land.
- **Click to inspect swarms.** In `main.js` click selection:
  - In the Bugs view, a click on a tile opens the densest bug species there.
  - In the other views, the order is animal, then plant (`topSpecies`), then the densest bug species when the tile has no plant.
  - The tooltip shows a hint on bug rows.
- **Plant traits.** Add a "Pest defence" row to `PLANT_TRAITS`, hidden for fungi.
- **Script tag.** Add `<script src="js/sim/bugs.js">` after `animals.js` and before `ecosystem.js`.

## How the work is split: two parallel implementers, as in Part 2

- **Sim implementer:** `bugs.js` (new), `plants.js`, `animals.js`, `soil.js` and `ecosystem.js`. It also writes the runner `scratchpad/run4.js`, which is `run3.js` with `bugs.js` loaded and bug metrics added.
  - It writes `part3/SIM_READY.md` once the interface above is final. That file holds exact names, and any deviation from this plan.
- **UI implementer:** `render.js`, `main.js`, `icons.js`, `index.html` and `css/style.css`. It builds against the interface above.
  - Before the sim is ready, it may stub `eco.bugs` only inside a scratch probe page, never in app code.
  - It re-checks `SIM_READY.md` before screenshots.

## Docs

- **`CODE_REFERENCE.md`:**
  - a new Bugs section covering the layout, genes, niches, step and effects, locusts, collapse, `eat` and `reintroduce`;
  - **Plants:** g13, `poll`, `damage` and `nectar`;
  - **Animals:** `tileLoad`, `parasiteLoad`, insect eating and `deaths.parasite`;
  - **Soil:** `consumeLitter`;
  - **Ecosystem:** tick order, stats and history;
  - **Renderer:** the Bugs view and particles;
  - **Icons:** the 8 bug icons;
  - **App/main:** the Bugs tab, card, tooltip and traits.
- **`complexities.md`:**
  - add `js/sim/bugs.js` at about 6;
  - bump `plants.js` and `animals.js` notes;
  - update `render.js` and `main.js` if their expandability changes.
- **Audits:** `part3/audit.md` (sim) and `part3/audit-ui.md`. Each starts with a Files changed list.

## Tests

1. `node --check` on every changed or new JS file.
2. The comment grep (`//|/\*`) returns 0 new comments.
3. Headless check with `run4.js`, seeds 42, 7 and 123 × 3000 ticks. Record a fresh current-tree baseline first, interleaved with the new runs to reduce machine-load noise.
   - **Pass:**
     - All 6 animal groups are above 0 on every seed.
     - All 4 bug niches occupy at least 1 tile at 3000 ticks on every seed, without relying on a migration in the last 300 ticks.
     - `pestDamage`, `detritusEaten`, `parasiteDrain` and bug-eating are all above 0.
     - Mean `poll` on flower tiles is above 0.2.
     - Plant cover stays within ±25% of baseline.
     - At least one locust swarm across the three seeds. This is a soft target: report it if missing, and don't force it.
     - ms/tick is at most 1.25× baseline.
   - Tune only the new constants. If an animal group dies, stop and report rather than retuning existing animal constants.
4. The headless page load shows no console errors or error overlay.

## Screenshots (major change): `part3/screenshots/`

- `bugs-view.png`: the Bugs heat map on seed 7 at about tick 600.
- `swarm.png`: zoom ≥ 10 on a flowering area, showing bug particles with the Bugs tab and a bug species detail open.

Use the scratchpad `cdp_shot.py` and probe pages, as in Part 2.

## Out of scope

- Disease and pathogens (Part 4). Parasites only drain energy for now.
- Simulating individual bugs. Swarms are inspected per species.
- Retuning existing animal or plant constants (see Tests).
- Deciding the Part 2 performance question (seed 7 at 1.28×). Part 3 is measured against the current tree.
- Code comments of any kind.
- Git commits.
