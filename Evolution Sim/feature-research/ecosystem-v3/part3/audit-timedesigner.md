# Part 3.4 audit: time controls and species designer

Base: e97042e (Parts 3.1 to 3.3 merged).

## What was built

### Species designer (sim layer, `js/sim/god.js`)
- New god action `{kind:'design', cls, habitat, diet, genes, name, n, pts, r, stroke}` runs through `GodTools.apply`, so it uses the same path as every other god edit. It goes through `eco.applyGod` and the worker `god` handler, gets logged in the god log, and is stored in `header.god` and replayed on load. SAVE_VERSION stays 2.
- `GodTools.designGenome(d)` builds the genome:
  - It starts from the closest `ANIMAL_ARCHETYPES` entry for the class, scored on habitat, niche and diet/scavenge distance. Genes that have no slider (depth, salt, cold and others) come from that archetype.
  - It sets diet and scavenge from the diet picker: herbivore, omnivore, carnivore, scavenger, and fisher (fisher is birds only and sets niche 1).
  - It applies the nine slider traits: size, speed, senses, warmth, tolerance, fertility, armour, herding, brain. Each is clamped to 0..1 and rounded to 0.01.
  - It clamps every gene to 0..1, then runs `AnimalPool._clampClass`.
  - A class index or habitat that is not valid falls back or is rejected (`reason:'genome'`).
- `GodTools.designStats(d)` runs the real `_decode` on a stub pool. It gives the preview: category, role, mass, speed, sight, upkeep, litter, maturity, lifespan and comfort range.
- `_design` order:
  1. Pick the spawn spots first, using `eco.rng` and `canStand` within the brush radius. If there are none, return `reason:'spot'` and create no species.
  2. Make a founding species with `A.newSpecies(..., origin 'created', cls, nic)`.
  3. Apply the optional custom name (letters, spaces, `'` and `-`, at most 24 characters, only if the name is not already taken).
  4. Spawn n individuals (at most 60). Each gets a small mutation and is re-clamped to its class.
  5. Log "You created X, a new <class> species (N placed)".
- The detail panel shows a "Created" origin badge. The 'created' origin also keeps the species out of the merge pass, the same as founders.

### Designer UI (`index.html`, `js/main.js`, `css/style.css`)
- There is a new "Design" tool in the god palette. It has class chips, habitat chips (filtered by class), diet chips (Fisher only for birds), and nine trait sliders. The size cap is lowered for birds (0.6) and invertebrates (0.45).
- It also has a name field, a count slider (2 to 60) and a live stats preview.
- Changing the class, habitat or diet resets the sliders to that archetype.
- Each click on the map founds one new species. A 500 ms guard stops double clicks from founding two. The brush sets how far the individuals spread.

### Time controls (palette "Time" section, `js/main.js`)
- **Snapshots**:
  - A snapshot is a named in-memory blob made with `SimClient.save`, so it uses the worker's save path.
  - The newest 5 are kept; older ones drop off. Each row has a Restore button with an inline two-click confirm, and a delete button.
  - Restore goes through `SimClient.load` and `applyLoaded`. It keeps the current camera and play/pause state, and the other snapshots stay in the list.
- **Autosave**:
  - It is taken right after a world is created or loaded, then every 1500 ticks, from the 250 ms UI tick.
  - It runs on the same promise chain as god actions, so a save never interleaves with an edit.
- **Rewind**: a two-click confirm, then the world goes back to the last autosave. After a snapshot restore, that snapshot becomes the autosave.
- There is no `window.confirm`. Confirms are shown inline and clear themselves after 4 s.

## Gate results (1 batched test run, plus 1 browser smoke rerun after the restore pause fix)
| Gate | Result |
| --- | --- |
| Syntax check (24 files) | 0 failed |
| No-tool hashes, base vs new (`hashes`) | identical |
| State and world hash at 500 ticks, seed 42 | edb5330b… / 73cc27c7…, same as base |
| State and world hash at 500 ticks, seed 7 | 6abecf24… / adc6264b…, same as base |
| State and world hash at 500 ticks, seed 123 | d4cef852… / 5823f703…, same as base |
| ms/tick (base vs new, run in parallel) | 26.19 vs 26.72, 25.42 vs 25.19, 25.34 vs 25.02, inside noise |
| Snapshot round trip (`snapdet` 42/7/123) | snapshot at tick 300 after design, paint and feed actions; the original then ran on with a meteor; restored then stepped 500 ticks: state and world hash match the uninterrupted twin, and a second decode of the same blob matches too |
| Designer clamps (`designdet` 42/7/123) | 43 designs over all classes, habitats and diets with extreme sliders: 0 genomes out of clamp, 0 of 516 individuals out of clamp, 0 wrong class |
| Designer determinism (`designdet`) | two runs identical; saved at tick 500, loaded, then stepped: identical; origin and custom name survive the save |
| Invalid design input | rejected (`genome`), and no orphan species when there is no room (`spot`) |
| Save at 1500, load, step 500 (`det 42 1500 500`) | equal |
| Old saves (base, 3.1 god save, 3.2 disaster save) load | loaded; bless/curse and disaster actions still apply; arrays consistent |
| Survival at 3000 ticks, all six classes | alive for seeds 42, 7 and 123; lowest class minimum is amphibians at 10 (seed 7) |
| Survival at 3000 ticks, all five bird niches | alive for seeds 42, 7 and 123 (seed / insect / fisher / raptor / carrion) |
| Browser smoke (worker + GPU, port 8791) | details below; 0 console errors |

Browser smoke steps:
- Designed a fishing bird named "Testwing" (30 placed, cls 4, nic 1, air) and a carnivore fish named "Deepjaw" (30 placed, water).
- Snapshot "Before" at tick 77. Ran to tick 140, then restored with two clicks back to tick 77, and Testwing was present (rerun: 86, 151, 86).
- Ran to tick 116, then rewound to the autosave at tick 77.
- Took 5 snapshots: the history was capped at 5 (ids 6..2). Deleting one left 4.

## Known issues
- Snapshots and the autosave live only in page memory. They are lost on reload and are not written to disk. Each blob is about 9 to 19 MB on the default map, so up to 6 blobs can hold around 100 MB.
- Rewind only goes to the single latest autosave; there is no multi-step history. After a snapshot restore, the autosave becomes that snapshot.
- The tick shown on a snapshot is the client's mirrored tick when the save was requested. In worker mode it can trail the saved state by a few ticks. The restored state itself is exact.
- Restoring drops any god edits made after that snapshot, as expected. The god log follows the restored state.
- Designer sliders cover nine traits. Depth, salinity, cold tolerance, sleep pattern and the rest come from the nearest archetype. Extreme designs are allowed and often die out: about 8 to 11 of the 43 test designs were still alive at 500 ticks.
- Founder size is limited to 60 per click, and there is no undo besides snapshots and rewind.
