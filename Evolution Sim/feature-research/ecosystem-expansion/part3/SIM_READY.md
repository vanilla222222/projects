# Part 3 sim ready (bugs)

The sim interface below is final. Constants may still be tuned, but no names will change.

## Script order

`js/sim/bugs.js` loads after `animals.js` and before `ecosystem.js`. It uses `TILE_LOAD_SCALE` from `animals.js` and `PG` / `hueDist` from `plants.js`. `Ecosystem` builds bugs only when `BugLayer` is defined, so `eco.bugs` is `null` without the script tag.

## Globals (bugs.js)

- `BG = 9`, gene indices `B_TEMP 0, B_MOIST 1, B_APPETITE 2, B_MOBILITY 3, B_FEC 4, B_SWARM 5, B_HUE 6, B_SPEC 7, B_HOST 8`.
- `BUG_NICHES = ['pest', 'detritivore', 'parasite', 'pollinator']` (plane index 0..3), plus `BUG_PEST 0, BUG_DETRI 1, BUG_PARA 2, BUG_POLL 3`.
- `BUG_NICHE_LABEL[nicheName]`: 'Pest', 'Detritivore', 'Parasite', 'Pollinator'.
- `BUG_CATEGORY_LABEL[category]`: aphid, locust, beetle, worm, tick, leech, bee, butterfly.
- `BUG_MASKS[nicheIndex]`: 9 flags, 1 = gene is meaningful for that niche (use it to hide trait rows). pest: g0–g5; detritivore: g0–g4; parasite: g0–g4 + g8; pollinator: g0–g4 + g6 + g7.
- `BUG_LAND_ONLY = [1, 0, 0, 1]`.
- `bugCategory(g, nicheIndex, wet = false, o = 0)` returns the icon name.

## `eco.bugs` (BugLayer)

Layout: cell `q = niche * n + i`, `n = W * H`.

| Field | Type | Meaning |
| --- | --- | --- |
| `species` | Int32 `4n` | registry id, 0 = empty |
| `density` | Float32 `4n` | 0..1 |
| `genome` | Float32 `4n * BG` | per-cell genes at `q * BG` |
| `fit` | Float32 `4n` | cached climate fit of the cell |
| `total` | Float32 `n` | summed density of all 4 niches on tile `i` (heat map, tooltip) |
| `tiles` | Array[4] | occupied tiles per niche |
| `mass` | Array[4] | summed density per niche |
| `pestDamage`, `detritusEaten`, `parasiteDrain`, `eaten`, `swarms`, `collapses` | numbers | cumulative counters (`eaten` = bug density eaten by animals) |
| `version` | int | bumps after each bug step |

Methods: `step(tick)` (acts only every `BUG_EVERY` ticks), `refreshSpeciesMeans()`, `eat(i, amount)`, `edibleAt(i)` (pest + detritivore + pollinator density), `reintroduce(nicheIndex)`.

Densest species on a tile for click-to-inspect: loop `k = 0..3`, take the max `density[k * n + i]` with `species[k * n + i] !== 0`.

## Bug species (`registry`, `group === 'bug'`)

- `sp.group = 'bug'`, `sp.domain` is `'land'` or `'water'` (the tile it was founded on; detritivores and parasites can spread across both).
- `sp.niche` is the niche name string (`'pest'` etc.), `sp.nicheIndex` is 0..3.
- `sp.category` and `sp.icon` are the same string (one of the 8 icon names). They are refreshed every 20 ticks from the mean genome and `sp.wetFrac`.
- `sp.density` is the mean density over occupied cells, refreshed every 20 ticks (0 until the first refresh after creation).
- `sp.wetFrac` is the share of the species' cells on water tiles.
- `sp.population` = occupied cells (tiles), `sp.peak`, `sp.mean` (length `BG`), `sp.history` all work as for plants.
- Names come from the existing registry pools (`animal` on land, `fish` on water), because `core.js` is out of this slice.
- Pollinator species colour follows their hue preference (`g6 * 360`); other niches use a niche base hue (pest green, detritivore brown, parasite red).

## Plants

- `PG = 14`. New gene `g13` = pest defence. `plantTraitsFrom` returns `defence`. Fungi founders have 0.
- `plants.poll`: Float32 `n`, pollination 0..1 per tile. Bugs raise it; plants multiply it by `POLL_DECAY` (0.95) each tick.
- `plants.flowerPoll`: mean `poll` over flower tiles, computed each plant step.
- `plants.damage(i, amount)` and `plants.nectar(i)` (sets `plants.nectarHue`).

## Animals

- `animals.tileLoad` Uint16 `n` (mass-weighted count, `TILE_LOAD_SCALE` = 4 per unit mass), `animals.parasiteLoad` Float32 `n`, `animals.parasiteHost` Float32 `n` (host-size preference of the parasite on the tile).
- `animals.deaths.parasite` exists alongside starved/eaten/old/poison.
- `animals.bugs` points at `eco.bugs` (or null).
- Carnivores (diet >= 0.66) never eat bugs (coordinator fix, see audit).

## Ecosystem

- Tick order: `plants.step`, `bugs.step`, `animals.step`.
- `stats.bugs` (rounded total density), `stats.pests`, `stats.detritivores`, `stats.parasites`, `stats.pollinators` (tiles), `stats.pollination` (0..1, mean poll on flower tiles; multiply by 100 for %).
- `history.bugs` is sampled with `history.plants`.
- Bug extinctions are logged when `peak >= 60`.
- Log entries: `'speciation'` for bug speciation, `'info'` for "<name> locusts are swarming" and "Pollinator collapse: ...", `'migration'` for reintroductions.

## Deviations from the plan

- `BUG_EVERY` is 6, not 2 (performance gate). All rates scale with it.
- Parasite food uses a decaying host trace (`bugs.trace`, fed by `animals.tileLoad`) instead of the instantaneous `tileLoad`, so parasites survive animals walking off a tile.
- `plants.nectar(i)` returns the unseasoned bloom strength (`_bloomK` sum); bugs apply the season factor `POLL_WINTER + (1 - POLL_WINTER) * bloomNow` themselves so pollinators do not all die every winter.
- `POLL_DECAY` is 0.95 per tick (plan said 0.9) because bugs only refresh `poll` every 6 ticks.
- `g8` host preference scales the drain per animal: `0.4 + 0.6 * gaussFit(size, hostPref, 0.3)`.
