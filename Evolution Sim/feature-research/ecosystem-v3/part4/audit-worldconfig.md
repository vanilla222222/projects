# Audit: World gen configs (slice 4.1)

Base commit b2b87d3. Commits: 6e45564 and 2e86e04, plus this audit.

## What was built

The seed field, the random-seed button and the size select are gone from the top bar. **New world** (button or `N`) now opens a centred modal, `#worldModal`.

### Modal fields

- **Seed**: leave it blank for a random seed.
- **Size**:

  | Size | Dimensions | Notes |
  |---|---|---|
  | Small | 220x150 | |
  | Medium | 320x210 | Default, so `#42` links give the same world as before |
  | Normal | 390x255 | New |
  | Large | 460x300 | |
  | Extra large | 640x420 | |
  | Huge | 860x560 | |
  | Titanic | 1200x780 | New; shows an amber performance warning |

- **Eight settings**, each with three choices. The middle choice is always the default.

  | Setting | Choices |
  |---|---|
  | Continents | One / Few / Many |
  | Water | Little / Normal / Lots |
  | Roughness | Little / Normal / Lots |
  | Temperature | Cold / Normal / Hot |
  | Rivers & lakes | Few / Normal / Many |
  | Starting life | Sparse / Normal / Abundant |
  | Species diversity | Few / Normal / Many |
  | Seasons | Mild / Normal / Harsh |

### Modal behaviour

- Buttons are Create, Cancel and Randomize. Randomize picks a seed with `Math.random` (UI only), then derives the settings from that seed. It does not change the size.
- Esc, the close button and a click on the scrim all close the modal. Focus goes back to the New world button.
- The last values are stored in localStorage under `evo.newWorld`, with every access wrapped in try/catch.
- On screens 560px wide or less, the modal switches to a single column.

### Engine

- Settings travel as `options.cfg`, which holds values of -1, 0 or 1 for each of these keys: `cont`, `hum`, `rough`, `temp`, `rivers`, `life`, `div` and `season`.
- `worldCfgParams` turns those values into multipliers.
- World generation applies the settings only when `gen >= 4`, so gen 2 and gen 3 worlds ignore them.
- Every default is an exact identity. The code either multiplies by 1, adds 0, or skips the branch entirely, so default worlds are bit-identical to before.

What each setting changes:

| Setting | What it changes |
|---|---|
| Continents | Number of continents (1, or 2.6× with a minimum of 5) and island count |
| Water | Ocean fraction (0.2 to 0.5) and a humidity offset |
| Roughness | Ridge and mountain belt strength, land altitude curve, relief top (`reliefK`) and ocean depth curve |
| Temperature | Offset of ±0.13 |
| Rivers & lakes | River threshold, lake count and pond count |
| Starting life | Plant fill probability and animal founder counts |
| Species diversity | Plant and animal founder sets. Few drops some archetypes. Many adds jittered variants drawn from seeded FastRng streams. |
| Seasons | `world.seasonK` scales the plant `seasonAmp` (derived, so the GPU path picks it up through the existing upload), weather `seasonT` and animal cold tolerance |

### Saves

- The save header now has a `cfg` field, and decode passes it back to the world.
- Saves without `cfg` load with defaults.
- SAVE_VERSION is still 2.

## Gate results

Results come from three batched runs. The final run was on 2e86e04.

### Default determinism (320x210)

Base, new code, and new code given an explicit all-zero cfg all produce the same hashes:

| Seed | World hash | Sim hash at tick 0 | Sim hash at tick 300 |
|---|---|---|---|
| 42 | 73cc27c7a4f64e2b | equal | equal |
| 7 | adc6264bb44ea911 | equal | equal |
| 123 | 5823f70388c1e660 | equal | equal |

### Other determinism checks

- **Gen 2 and gen 3** world hashes match base for seeds 42, 7 and 123, even when a non-default cfg is passed.
- **Secret seeds** give the same world hash as base:
  - Nuclear: 152, 543, 591, 1306.
  - Magic: 276, 471, 972.
  - Both: 49653.
  - The forced overrides nuclear, magic, both and none also match.

### Save and load

- **Non-default settings**: cfg `{cont:1, hum:-1, rough:1, temp:1, rivers:-1, life:1, div:1, season:1}` at 220x150. I saved at tick 300 and loaded into a fresh context. The cfg round-trips, the world hash is equal, and the sim hash is equal at load and again after 200 more ticks.
- **Old save**: a save encoded by the base code (seed 7, tick 300) loads in the new code. The world hash is equal and the sim hash is equal after 200 more ticks.

### Browser smoke test (Playwright, port 8793)

- The default `#42` flow runs and ticks advance.
- The modal opens. Esc closes it, `N` reopens it, and Cancel closes it.
- Randomize fills in a seed.
- The Titanic warning appears when Titanic is selected.
- I created seed 99 at 220x150 with Many continents, Lots of water and Hot. The world has the right cfg and ticks advance.
- Values are remembered when the modal reopens.
- At a 390px viewport the box shows in full in the screenshot with no internal horizontal scroll.
- There were no console errors.

### All classes alive

All six classes are alive at tick 2000 on seed 42 for every one of the 16 extremes, not only the required humidity, continentality and temperature ones.

Counts are fish / amphibian / reptile / mammal / bird / invertebrate.

| Setting | Count at tick 2000 | Minimum after tick 50 |
|---|---|---|
| Water little | 182/370/205/317/143/1767 | 28/107/40/233/91/118 |
| Water lots | 1278/409/243/187/154/1614 | 302/81/69/131/76/296 |
| Continents one | 571/186/426/475/123/968 | 172/44/165/186/70/230 |
| Continents many | 804/83/321/256/138/504 | 178/16/45/119/79/120 |
| Temperature cold | 113/59/72/501/136/834 | 61/14/10/203/76/61 |
| Temperature hot | 1060/157/520/934/155/741 | 195/71/106/219/89/189 |
| Roughness little | 499/135/242/388/160/1971 | 105/37/63/147/81/182 |
| Roughness lots | 841/115/102/313/134/2253 | 167/5/30/124/71/176 |
| Life sparse | 626/79/140/221/129/1346 | 53/8/32/81/68/99 |

### Titanic (1200x780, seed 42, run alone headless)

- Generation took 21.4 s.
- About 190 ms per tick over ticks 0–300.
- There were 1976 animals at tick 300, and all classes were present.

## How different the extremes look (seed 42, 320x210)

All values except the last four columns are percentages of the map.

| Setting | Land | Hills | Mountains | Glacier | River | Lake | Desert | Deep sea | Mean land temp | Mean land humidity | Plants | Animals | Plant species | Animal species |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Default | 66.1 | 22.3 | 8.6 | 0.7 | 1.8 | 4.8 | 0.7 | 8.1 | 0.537 | 0.407 | 55498 | 854 | 30 | 49 |
| Water little | 80.1 | 23.9 | 10.4 | 0.8 | 3.5 | 7.6 | 2.9 | 5.8 | 0.494 | 0.371 | | | | |
| Water lots | 50.2 | 20.3 | 7.1 | 0.6 | 1.2 | 4.5 | 0.1 | 9.7 | 0.567 | 0.472 | | | | |
| Roughness little | 66.2 | 24.8 | 2.2 | 0.0 | 2.0 | 3.2 | 1.3 | 2.1 | 0.573 | | | | | |
| Roughness lots | 66.1 | 20.6 | 15.8 | 1.2 | 2.1 | 5.2 | 0.3 | 12.7 | 0.484 | | | | | |
| Temperature cold | | | 9.4 | 1.4 | | | 0.4 | | 0.407 | | 47195 | | | |
| Temperature hot | | | 8.5 | 0.2 | | | 3.0 | | 0.667 | | 54499 | | | |
| Rivers few | | | | | 1.0 | 4.6 | | | | | | | | |
| Rivers many | | | | | 3.6 | 5.6 | | | | | | | | |
| Life sparse | | | | | | | | | | | 27406 | 429 | | |
| Life abundant | | | | | | | | | | | 83400 | 1537 | | |
| Diversity few | | | | | | | | | | | 40573 | 567 | 17 | 36 |
| Diversity many | | | | | | | | | | | 57344 | 1376 | 56 | 85 |

Blank cells were not reported for that row.

### Notes on the table

- **Continents**: the largest landmass covers this share of the land:
  - One: about 1.0
  - Few (default): 0.44
  - Many: 0.88
- **Seasons**: mean plant season amplitude is 0.189 for Mild, 0.378 for Normal and 0.605 for Harsh.
- **Roughness**: mountains were checked on seed 7 as well. Little gives 4.4%, Normal 9.1% and Lots 13.1% (tuning sweep, final values). So Little reliably flattens the land and Lots reliably raises it.

## Known issues

- **Continents: Many** gives more seed continents, but they often merge into one large mass. On seed 42 the largest landmass is 0.88 of the land, against 0.44 for the default. The many-continent look comes mostly from extra islands, not from separated landmasses. Reading clearly as "many" would need an ocean-channel pass between continent cells.
- **Temperature: Cold** has the lowest minimums of any extreme: reptiles at 10 and amphibians at 14. Every class still survives.
- **Roughness: Lots** dropped amphibians to a minimum of 5 before they recovered to 115.
- **Titanic generation** takes about 21 s headless on the worker before the first frame, and runs at about 190 ms per tick headless.
- **Phone layout**: `getBoundingClientRect` reports the box at 26–396px in a 390px viewport. The screenshot shows it fully inside the viewport, so the overflow seems to exist only in that measurement. Separately, the rest of the page already overflows at phone width (scrollWidth 519–575px), which predates this slice.
- **Old scratch saves**: `evosim-42-y4.evo` and `evosim-42-y6.evo` fail to load. They fail identically at the base commit (y6 is save version 1, and y4 is from an older animal layout), so this is not a regression. A save made at the base commit loads and continues bit-exactly.
- **Not wired to the URL**: settings other than the defaults are not reflected in the `#seed` URL hash. Sharing a link reproduces only the default-settings world.
