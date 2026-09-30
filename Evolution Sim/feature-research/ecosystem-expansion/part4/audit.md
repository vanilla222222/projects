# Part 4, slice A (sim): audit

## Files changed

- `js/sim/disease.js` (new): `DiseaseLayer` and all disease constants.
- `js/sim/animals.js`: gene `G_RES` (AG 10), disease constants, 5 Int32 infection fields, sickness cost, slowdown and death, `_contact`, predation, carcass and vector exposure, innate immunity, `deaths.disease`, `sp.infected`.
- `js/sim/plants.js`: gene 14 `blightRes` (PG 15), `BLIGHT_RES_COST`, `blight`/`blightT`/`blightImm` arrays, blight deaths, `blighted`, `sp.infected`.
- `js/sim/core.js`: `NAME_PARTS.pathogen` pool, used by `create` for `group === 'pathogen'`.
- `js/sim/ecosystem.js`: `options.disease`, disease layer wiring (RNG `seed+444`), tick order, stats, `history.sick`, pathogen extinction text, emergence in `_migrations`.
- `CODE_REFERENCE.md`: new Disease section; Sim core, Plants, Animals and Ecosystem updated.
- `complexities.md`: new `disease.js` row; plants, animals and ecosystem notes updated.
- `feature-research/ecosystem-expansion/part4/audit.md`, `SIM_READY.md` (new).

No UI files (render.js, main.js, icons.js, index.html, css) were touched.

## Baseline vs after (3000 ticks, 300x200, seeds 42 / 7 / 123, 3 runs in parallel)

| Seed | ms/tick base | ms/tick after | ms/tick disease off | Cover base | Cover after | Biomass t3000 base / after / off |
| --- | --- | --- | --- | --- | --- | --- |
| 42 | 18.27 | 17.83 (0.98x) | 17.33 | 59816 | 59895 (+0.1%) | 60994 / 43982 / 43049 |
| 7 | 17.37 | 16.64 (0.96x) | 15.94 | 59915 | 59909 (0.0%) | 62086 / 55554 / 54309 |
| 123 | 22.77 | 19.24 (0.84x) | 18.56 | 59844 | 59975 (+0.2%) | 62706 / 56185 / 58524 |

End groups after (LH/LO/LC/WH/WO/WC): 42: 868/969/91/1752/130/13; 7: 550/305/193/1149/398/61; 123: 1735/1150/29/1600/269/33.

| Seed | Animal outbreaks | Plant blights | Mutated strains | Jumps | Disease deaths / all animal deaths | Max sick | Max blighted slots | Strains created / live at end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 42 | 7 | 2 | 4 | 5 | 211 / 16681 (1.3%) | 92 | 1394 | 18 / 5 |
| 7 | 3 | 1 | 11 | 0 | 390 / 19089 (2.0%) | 346 | 1177 | 15 / 9 |
| 123 | 3 | 1 | 3 | 2 | 415 / 21129 (2.0%) | 123 | 534 | 9 / 7 |

Resistance of the first most-infected species (start to end): 42: 0.150 to 0.107; 7: 0.150 to 0.144; 123: 0.145 to 0.145. With about 2% of deaths from disease, selection on `G_RES` is weak and the resistance cost dominates.

## Gates

| Gate | Result |
| --- | --- |
| All 6 animal groups alive at end | PASS (min 13, waterCarn seed 42) |
| All 4 bug niches alive at end | PASS |
| At least 1 animal outbreak and 1 plant blight per seed | PASS (7/2, 3/1, 3/1) |
| At least 1 mutated strain over 3 seeds | PASS (18) |
| Disease deaths > 0 and at most 35% of animal deaths | PASS (1.3%, 2.0%, 2.0%) |
| Plant cover within 15% of baseline | PASS (all within 0.2%) |
| ms/tick at most 1.25x baseline | PASS (0.84x to 0.98x; the layer itself costs about 0.08 to 0.11 ms/tick) |
| Strain population consistency (strain `population` equals counted infected hosts, counters equal actual counts, `live` set matches) | PASS, 0 mismatches at every 1000-tick checkpoint and at the end |
| `disease:false` shows 0 infections | PASS (0 infections, 0 strains on all seeds) |
| Runtime toggle | PASS: switching off mid-run clears all infections, blights, planes and strains within 1 step; switching on again works; manual `emerge` and `hostIndices` work |
| `node --check` on all changed JS | PASS |

## Final constants

`disease.js`: DG 4, DISEASE_WEIGHTS [1, 1, 0.8, 0.3], DISEASE_SPECIATION 0.12, VIR_TRADE 0.6, DUR_BASE 200, BLIGHT_DUR 150, RANGE_BASE 0.05, RANGE_SPAN 0.25, JUMP_K 0.02, JUMP_K_P 0.001, JUMP_SPAN 0.15, JUMP_LOG_GAP 1200, PATHO_MUT 0.03, PATHO_MUT_RATE 0.5, PATHO_MUT_SD 0.05, PATHO_DRIFT 0.5, SEED_HOSTS 6, SEED_TILES 12, SEED_R 6, SEED_TILE_R 3, EMERGE_MIN_A 40, EMERGE_MIN_P 150, EMERGE_GAP 900, EMERGE_P 0.04, EMERGE_SD 0.08, BLIGHT_EVERY 3, BLIGHT_DMG 0.08, BLIGHT_SPREAD 0.08, BLIGHT_RES 0.8, MONO_BOOST 2, CARCASS_DECAY 0.97, VECTOR_DECAY 0.95, LOAD_MIN 0.02, DIEOFF_EVERY 60, DIEOFF_WINDOW 5, DIEOFF_MIN 20, DIEOFF_FRAC 0.3.

`animals.js`: RES_COST 0.2, SICK_COST 0.5, SICK_SLOW 0.4, SICK_DEATH 0.01, IMMUNE_TICKS 900, CONTACT_R 1.5, CONTACT_K 0.35, CONTACT_MAX 3, PREY_K 0.5, CARCASS_K 0.1, VECTOR_K 0.05, NATIMM_P 0.003; `G_RES` weight 0.25, archetype start 0.15.

`plants.js`: BLIGHT_RES_COST 0.15; gene 14 weight 0.3, archetype start 0.15.

Tuning history: CONTACT_K 0.05 to 0.35 and SICK_DEATH up to 0.01 (animal disease was too weak); BLIGHT_DMG 0.12 to 0.08, BLIGHT_SPREAD 0.25 to 0.08, BLIGHT_DUR 240 to 150 and a separate JUMP_K_P 0.001 (blight was explosive, with 60 to 99 jumps per run). Only new constants were tuned.

## Deviations from the plan

1. A host jump creates a new child strain with the new host as its `hostId` (reused while it is alive), rather than re-hosting the parent strain.
2. A strain's `mean` drifts by `PATHO_DRIFT` on sub-threshold mutations; speciation is measured against the strain's founding genome.
3. Constants added beyond the plan's list: JUMP_K_P, SEED_R, SEED_TILE_R, EMERGE_SD, BLIGHT_RES, LOAD_MIN, DIEOFF_EVERY, DIEOFF_WINDOW, PATHO_MUT_RATE, PATHO_MUT_SD, PATHO_DRIFT, EMERGE_MIN_A, EMERGE_MIN_P, BLIGHT_DUR.
4. Plants: an explicit `h <= 0 && blight[p]` death check runs before the satisfaction branch, because the existing death path only fires when satisfaction is low.
5. Host compatibility compares the host species' reference genome with the strain's `hostGenome`, not the individual's genome.
6. Pathogen extinctions log "burned out" (notable at peak 15 or more).
7. There are 21 plant archetype rows, not 20; all got the extra gene.
8. Biomass is lower than baseline even with disease off (seed 42: 61.0k to 43.0k at t3000). This comes from the new gene costs (`BLIGHT_RES_COST`, `RES_COST`), not from infections: on and off biomass are similar. Cover is unchanged and biomass is not a gate.
9. `infectAnimal(i, s)` takes a strain id.
10. Emergence is checked from `_migrations`, so it runs every 60 ticks and only while migrations are on.

## Checklist

- Comment grep (`grep -cE '//|/\*'`): animals.js 0, plants.js 0, core.js 0, ecosystem.js 0, disease.js 0 (baseline 0 for all).
- CODE_REFERENCE sections (grep-verified): `## Disease` 1; `PG = 15` 1; `BLIGHT_RES_COST` 2; `blightImm` 3; `AG = 10` 1; `G_RES` 1; `SICK_DEATH` 1; `_contact` 2; `deaths.disease` 1; `pathogen` 4; `outbreak` 5; `disease: true` 1; `seed+444` 1; `burned out` 1; `maybeEmerge` 2.
- complexities.md: new `js/sim/disease.js` row (6); plants (8), animals (8.5) and ecosystem (6) notes updated; scores unchanged.

## UI notes for slice B

- **Load order:** index.html must load `js/sim/disease.js` after `bugs.js` and before `ecosystem.js`. Without it `eco.disease` is `null` and everything else still runs. The load-order line at the top of CODE_REFERENCE still needs updating in slice B.
- **Toggle:** `eco.options.disease` (default true). Off clears everything on the next step.
- **Per animal (Int32, index i < animals.count):** `strain` (0 = healthy), `itime`, `immune`, `imTime`, `natImm`. Speed is already reduced in the sim, so no render change is needed for that.
- **Per plant slot (p = slot*n + tile):** `plants.blight` (strain id), `blightT`, `blightImm`.
- **`eco.disease`:** `.on`, `.sickAnimals`, `.blightSlots`, `.live` (Set of strains), `.sVir[id]`, `.sTrans[id]`, `.carcassStrain`/`.carcassLoad` and `.vectorStrain`/`.vectorLoad` (per tile), `.speciesStrain` (host id to strain id), `.hostIndices(id)`, `.emerge('animal' | 'plant')`, `.clearAll()`, `.version`, and the counters `created`, `mutated`, `jumps`, `outbreaks`, `blights`, `animalDeaths`, `plantDeaths`.
- **Strain species:** `group 'pathogen'`, `domain 'land'` (not meaningful), `hostKind`, `hostId`, `hostGenome`, `infected`, `deaths`, `recentDeaths`, `hosts` (Map, refreshed every 20 ticks), `category`/`icon` `'virus'` or `'blight'` (icons.js has neither yet), `mean[0..2]` = transmissibility, virulence, host range, `peak`, `createdTick`, `origin` (`'emerged'`, `'jump'` or `null`), history via the normal registry.
- **Host species:** `sp.infected` on animals and plants; resistance is `sp.mean[G_RES]` (animals) and `sp.mean[14]` (plants). Trait bars for plant gene 14 and animal gene 9 need labels.
- **Stats:** `stats.sick`, `stats.blight`, `stats.strains`, `stats.diseaseDeaths`; `history.sick`; `animals.deaths.disease`; `plants.blighted`.
- **Events:** new type `'outbreak'` (emergence, jump, mass die-off); strain mutations are `'speciation'` entries containing "(new strain)"; strain ends are `'extinction'` entries with "burned out". The event list needs a style for `outbreak`.
- **main.js:** `speciesInTab` (around line 234) and the other `group` routing must handle `'pathogen'`, or strains will appear in or break existing tabs.
