# Plan: Part 4, Disease

Source: [roadmap.md](../roadmap.md), Part 4.

The goal: pathogens are evolving species of their own, grouped into strains.
- Animal strains spread by contact, through carcasses and through parasite bugs.
- Plant blights spread from tile to tile, faster in single-species stands.
- An inherited resistance gene and a rare full-immunity mutation give survivors.
- Virulence and transmissibility trade off against each other.
- A strain can make a rare jump to a genetically close species.

The work goes in two slices, run one after the other: the sim, then the UI. The UI starts only after `SIM_READY.md` exists. This is the same split used in Part 3.

## User decisions (defaults, confirm at approval)

1. **Extinction by disease:** allowed. There is no hard floor; survival comes from the resistance gene and the immune mutants.
2. **Disease toggle:** yes. `#optDisease` sits in the Map card next to Seasons and Migrations and defaults to on.
   - Turning it off stops new infections and emergence.
   - Current infections clear within one step.

## Slice A: sim

### New file: `js/sim/disease.js`, `DiseaseLayer`

**Constructor:** `(world, plants, animals, registry, log, rng)`.

**Strains:** each strain is a registry species.
- `group: 'pathogen'`, `domain: 'land'`.
- Extra fields:
  - `hostKind`: `'plant'` or `'animal'`.
  - `hostId`: the original host species.
  - `hostGenome`: a copy of the host species genome when the strain appeared.
  - `infected`: the current count of infected hosts.
  - `deaths`: the running total.
  - `recentDeaths`: a rolling window.
  - `hosts`: a Map of host species id to infected count, refreshed in `refreshSpeciesMeans`.
- A strain's `population` is its infected host count. `registry.add`/`remove` runs on infect, recover and death. When a strain burns out, the existing `_logExtinctions` logs it.

**Genome:** `DG = 4`.

| Gene | Name | Range | Meaning |
| --- | --- | --- | --- |
| d0 | transmissibility | 0–1 | Base infection chance |
| d1 | virulence | 0–1 | Damage and death rate |
| d2 | host range | 0–1 | Maximum host genetic distance, `0.05 + 0.25*d2` |
| d3 | hue | 0–1 | Colour drift |

- `DISEASE_WEIGHTS = [1, 1, 0.8, 0.3]` and `DISEASE_SPECIATION = 0.12`.
- **Trade-off:** effective transmissibility is `d0 * (1 - VIR_TRADE*d1)`, with `VIR_TRADE ≈ 0.6`. Infection length is `DUR_BASE * (1 - 0.5*d1)`. Very deadly strains therefore spread less and kill their hosts quickly, so they burn out.
- **Mutation:** on each transmission, with probability `PATHO_MUT ≈ 0.03`, the child gets a mutated genome (rate 0.5, sd 0.05).
  - Speciation uses the same rule as bugs: `geneDistance > DISEASE_SPECIATION`, then `matchDaughter`, else a new strain.
  - A new strain logs `'speciation'` with the text "new strain".

**Host compatibility:** `compat(strain, hostGenome, weights)`.
- `dist = geneDistance(host, strain.hostGenome, weights)`, using `ANIMAL_WEIGHTS` or `PLANT_WEIGHTS`.
- If `dist <= range`, compat is 1.
- Otherwise it is a zoonotic jump. The chance is `JUMP_K * max(0, 1 - (dist - range)/JUMP_SPAN)`, with `JUMP_K ≈ 0.02`.
- When a jump succeeds, it logs `'outbreak'` with the text "jumped to <species>", rate-limited per strain and host pair.

**Emergence:** `emerge(kind)`.
- It picks a living host species weighted by population. The minimum is 40 animals or 150 plant tiles.
- It creates a strain with random genes around `[0.5, 0.35, 0.3, rand]` and infects `SEED_HOSTS ≈ 6` hosts, or 12 plant tiles, in one cluster.
- It logs `'outbreak'`.
- It is called from `ecosystem._migrations` when the migrations and disease options are both on, and only when either:
  - no living strain of that kind exists and `EMERGE_GAP ≈ 900` ticks have passed since that kind last had one; or
  - on a random roll of `EMERGE_P ≈ 0.04` per 60-tick check.

**`step(tick)`:** runs after `animals.step`.
- Every tick: decay the per-tile exposure planes (below) by multiplying.
- Every `BLIGHT_EVERY = 3` ticks: run the plant blight pass.
- Every 60 ticks: run the die-off check. When `recentDeaths >= max(20, 0.3*host pop)`, log `'outbreak'` with the text "mass die-off", at most once per strain.

**Per-tile exposure planes:** size n. Each tile keeps only the latest strain.
- `carcassStrain` (Int32) and `carcassLoad` (Float32): set when an infected animal dies there. Decays by `CARCASS_DECAY ≈ 0.97` per tick.
- `vectorStrain` (Int32) and `vectorLoad` (Float32): an infected animal on a tile where `animals.parasiteLoad > 0` writes `strain` and `min(1, parasiteLoad)`. Decays by `0.95`.

**Plant blight pass:**
- **Data:** `plants.blight`, an Int32 of 2n holding the strain id, and `plants.blightT`, a Uint16 of 2n.
- **Loop:** over infected plants `p`:
  - `health[p] -= BLIGHT_DMG * vir * (1 - 0.8*res) * BLIGHT_EVERY`, where `res` is plant gene g14.
  - Try the 4 neighbours in the same slot plane:
    - A neighbour of the same species uses `trans_eff * MONO_BOOST (≈ 2)`.
    - A different species uses `trans_eff * compat`.
    - Each is multiplied by `(1 - 0.8*res_neighbour)` and by `BLIGHT_SPREAD ≈ 0.25`.
  - Skip immune neighbours: `plants.blightImm[q] === strain`.
  - After the duration, recover: set `blightImm = strain`. Plant immunity is cleared on `_set`.
- **Death:** plant death from blight goes through the existing `health <= 0` path, but counts toward `plants.blighted` and `strain.deaths` instead of `starved`. To do this, `plants.step` checks `blight[p]` when it clears a plant.

### `js/sim/animals.js`

- **Genes:**
  - `AG` goes from 9 to 10, with `G_RES = 9`.
  - `ANIMAL_WEIGHTS` gets `0.25` appended.
  - Every archetype `g` gets `0.15` appended.
  - The resistance cost in `_decode` is `meta *= 1 + RES_COST*res`, with `RES_COST ≈ 0.2`.
- **New Int32 fields**, added to `ANIMAL_FIELDS_I`, initialised in `spawn` and carried by `_copySlot`:
  - `strain`: 0 when healthy.
  - `itime`: infection ticks left.
  - `immune`: the strain id from recovery.
  - `imTime`: recovery immunity ticks left.
  - `natImm`: an inherited immunity, a strain id.
- **Infected animal, inside the existing loop:**
  - `cost += SICK_COST * vir * meta`.
  - Speed is multiplied by `1 - SICK_SLOW*vir` through a `sick` factor read in `_moveToward`, with no allocation.
  - Death chance per tick is `SICK_DEATH * vir * (1 - 0.7*res)`. It increments `deaths.disease`, adds to `strain.deaths`, and calls `_kill`.
  - When the timer ends, the animal recovers: `immune = strain` and `imTime = IMMUNE_TICKS ≈ 900`. Immunity is not inherited.
- **Contact spread:**
  - Throttled by `(tick+i) % 2`.
  - An infected animal scans only its own grid cell's `gitems` for alive, same-domain animals within `CONTACT_R = 1.5` tiles.
  - Each one is infected with probability `trans_eff * compat * (1 - 0.7*res) * CONTACT_K`, up to `CONTACT_MAX = 3` rolls per scan.
  - Only animals with index `< n` are grid-valid.
- **Predation:** in `_attack`, a predator eating infected prey rolls with `PREY_K * trans_eff * compat`.
- **Carcass and vector exposure:** a susceptible animal on a tile rolls against `carcassLoad` and `vectorLoad` with the same compat and resistance factors. This is throttled with the contact scan.
- **Susceptibility:** an animal is susceptible when:
  - `strain === 0`;
  - `!(immune === s && imTime > 0)`;
  - `natImm !== s`; and
  - the disease option is on.
- **Full immunity:** in `_reproduce`, a child inherits `natImm` from either parent. With probability `NATIMM_P ≈ 0.003`, it gets `natImm` set to a strain currently infecting its species. The host species' dominant strain is tracked in `disease.speciesStrain` (a Map, refreshed every 20 ticks).
- **Infect helper:** `disease.infectAnimal(i, s)`. It sets `strain` and `itime`, and runs the registry add. All infection goes through it.
- **Clearing strain state:** runs on death, recovery and compaction. Registry remove happens in `_kill` when `strain > 0`.
- **Deaths:** `deaths.disease` is added.
- **Means:** `refreshSpeciesMeans` also tallies `sp.infected`, the infected count per species. The average resistance is `sp.mean[G_RES]`.

### `js/sim/plants.js`

- **Genes:**
  - `PG` goes from 14 to 15, with g14 blight resistance.
  - `PLANT_WEIGHTS` gets `0.3` appended.
  - All archetype rows get `0.15` appended.
  - The growth cost is `growth *= 1 - 0.15*g14`.
- **Arrays:** `blight`, `blightT` and `blightImm` are all 2n. They are reset in `_set` and `_clear`.
- **Death count:** `blighted` is added.
- **Health step:** no other change beyond the death branch described above.

### `js/sim/core.js`

- Add a `NAME_PARTS.pathogen` syllable pool.
- In `create`, use `group === 'pathogen' ? 'pathogen' : …`.

### `js/sim/ecosystem.js`

- `options.disease` defaults to true.
- Construct `DiseaseLayer` after bugs, guarded by `typeof DiseaseLayer === 'function'`, with rng seed `seed + 444`.
- Link `animals.disease` and `plants.disease`.
- Tick order: plants, bugs, animals, then disease.
- When `options.disease` is false, call `disease.clearAll()`. It resets all infections through the registry, idempotently.
- `refreshSpeciesMeans` runs every 20 ticks.
- **Stats:** `sick` (infected animals), `blight` (infected plant slots), `strains` (living strains) and `diseaseDeaths`.
- **History:** add `history.sick`.
- **Extinction:** the `notable` check treats `'pathogen'` with a peak of at least 15.
- **Migrations:** `_migrations` calls `disease.emerge('animal')` and `disease.emerge('plant')` under the rules above.

## Slice B: UI

- **`index.html`:**
  - Add `disease.js` after `bugs.js`.
  - Add `<button data-mode="disease">Disease</button>`.
  - Add the `#optDisease` switch.
  - Add a 6th tab `data-tab="disease"` with `data-icon="virus"` and `<em id="countDisease">`.
  - Add an `Outbreaks` event filter button with `data-f="outbreak"`.
- **`js/icons.js`:** add `virus` (animal strain and marker) and `blight` (plant strain) icons with fixed hex parts. Append them after `wave`.
- **`js/render.js`:**
  - **Disease view:** `RAMPS.disease` goes from dark to sickly green-yellow and is added to `LIVE_MODES`. Its field is `percentile99` of the per-tile count of infected animals plus 0.5 per blighted slot, built in `setMode`.
  - **Vegetation texture and `_tinted`:** a blighted slot mixes toward `BLIGHT_RGB = [125,140,115]` by `BLIGHT_MIX ≈ 0.6` after the health tint.
  - **`_pushAnimals`:**
    - An infected animal uses a per-animal tinted colour array, mixed toward the same green-grey.
    - At zoom ≥ 3, it also gets a small `virus` marker put at its top-right, at 0.4× its size.
    - Capacity: `_ensureCapacity(n + A.count*3 + 1)`.
- **`js/main.js`:**
  - **Disease tab:** lists strains through the existing species list, where `speciesInTab` treats `'pathogen'` like `'bug'`. The unit is " hosts", with `countDisease`.
  - **Strain detail:** the sub-line shows "Animal disease"/"Plant blight" and the origin host name.
    - Cells: Infected, Peak, Deaths, Appeared.
    - A hosts list as chips of host species, which link to that species.
    - The trait bars are `DISEASE_TRAITS`: Transmissibility, Virulence, Host range.
    - The history chart reuses `drawSpeciesChart`.
    - `selectSpecies` sets the tab to `disease` for pathogens.
  - **Plant and animal detail:** add an "Avg resistance" cell from `sp.mean[G_RES]` or `sp.mean[14]`, and an "Infected" cell when it is above 0.
  - **Traits:** `PLANT_TRAITS` gets "Blight resistance"; the animal traits get "Resistance".
  - **Stat card:** a wide Disease card with sick animals as the value, a sub-line "N strains · N blighted tiles", and a sparkline from `history.sick`.
  - **Tooltip:** an infected animal row shows "sick: <strain>"; a plant row shows "blight: <strain>".
  - **Clicking a sick animal:** opens its species as it does now.
  - **Events:** `EVENT_GLYPH.outbreak = '!'` and the filter button above.
  - **Toggle:** `optDisease` is wired in `newWorld` and in the live handler.
- **`css/style.css`:**
  - Add `.ev-outbreak` in an amber-green colour.
  - Check that 6 tabs fit at 1250px and at the default width. Hide the tab icons earlier if they don't fit, at the same breakpoint.

## Docs

- **`CODE_REFERENCE.md`:**
  - **New "Disease" section:** `DiseaseLayer`, the genome, compat and jumps, exposure planes, emergence, die-off and constants.
  - **Updates:** Animals (G_RES, infection fields, sick cost/slow/death, contact/predation/carcass/vector spread, natImm, `deaths.disease`); Plants (g14, blight arrays, `blighted`); Core (the pathogen name pool); Ecosystem (tick order, options.disease, stats, history.sick); Renderer (Disease view, tints, marker); Icons; App/main (Disease tab, strain detail, card, toggle, events).
- **`complexities.md`:**
  - Add `js/sim/disease.js` at about 6.
  - `animals.js` goes to 8.5.
  - `plants.js` stays the same unless it changes materially.
  - `main.js` goes up to 5.5 if warranted.
- **Audits:**
  - `part4/audit.md` for the sim and `part4/audit-ui.md` for the UI, each starting with its Files changed list.
  - `part4/SIM_READY.md` when slice A is done.

## Tests

1. `node --check` on every changed or new JS file.
2. No new comments: the `grep -nE '//|/\*'` counts must equal the pre-edit baseline on every touched file.
3. **Headless run:** scratchpad `run4.js`, extended into `run5.js` with `disease.js` and these metrics: sick, blight, strains, strains ever created, disease deaths, jumps, and the mean resistance of the most infected species at the start and end.
   - Seeds 42, 7 and 123, 3000 ticks each.
   - **Baseline first:** the implementer measures the current ms/tick before editing.
   - **Pass:**
     - all 6 animal groups and all 4 bug niches are alive at the end;
     - at least one animal outbreak and one plant blight occurred on every seed;
     - at least one mutated strain exists across the 3 seeds;
     - disease deaths are above 0 and at most 35% of all animal deaths;
     - plant cover is within ±15% of the baseline;
     - ms/tick is at most 1.25× the baseline.
   - **Also:** a run with `disease: false` shows 0 infections.
   - The implementer tunes only the new constants.
4. The page loads headless with no error overlay.

## Screenshots, saved to `part4/screenshots/`

Taken with the existing CDP probe method (scratchpad `hydro/shot.py` and `probe.html`), with no app code added for screenshots:
- `disease-view.png`: the Disease map view during an outbreak.
- `sick-animals.png`: zoom ≥ 4 on infected animals showing the tint and markers, with a strain's detail open in the Disease tab.

## Out of scope

- Per-animal genetics of pathogens inside a host (one strain per host).
- Bug diseases.
- Retuning existing non-disease constants. If a gate fails because of balance, stop and report.
- Code comments of any kind.
- git commits.
