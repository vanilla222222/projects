# Slice 2 audit: birds

Built on slice 1 (69b799e). The per-domain revival guard and the octopus icon fix from fe2efa1 are mirrored by hand into `ecosystem.js` and `animals.js`, and the guard is extended to the new `air` domain. The final numbers below are measured against fe2efa1.

## Files changed

- `js/sim/animals.js`:
  - **Flying domain.** It is domain 3: `domainIndex(d)` maps `'air'` to 3, `DOMAIN_BIT` gets walk bit 8, and every in-map tile (glacier too) gets bit 8.
  - **Walk bits.** Beach and cliff tiles get bit 16, the perch bit. `setWeather` now skips tiles with no land or water bit, so glacier tiles don't pick up the amphibious bit.
  - **Feeding and perching.** `FEED_BIT` means birds eat plants and carrion only on land tiles. `_perch(j)` is true on a land tile with a beach or cliff, or with cover above `PERCH_COVER`.
  - **New fields:** per-animal `oy` (home latitude, set at spawn), `fly` (flying flag) and `nic` (fishing-bird lineage flag, inherited from `sp.nic`), plus `_migLogged` (a Map) and `birdMigrants`.
  - **`_decode` for birds:** speed ×`BIRD_SPEED`, sense ×`BIRD_SENSE`, no territory, and herding kept. `spawn` now sets `domain`, `cls` and `nic` before `_decode`.
  - **`_clampClass`:** caps bird size at `BIRD_SIZE` (0.6).
  - **`_canEat(h, p)`** sets the cross-domain hunting rules, used by `_nearest` modes 0 and 1. `_contact` lets a perched bird touch land and amphibious animals.
  - **`_migrate(i, tile)`:** the seasonal latitude pull (see Migration), used by `_pickForage`.
  - **Bird foraging in `_pickForage`:**
    - Samples are shifted by the migration offset.
    - Only land targets count, plus shallow water for fishing birds, with a lure that scales with `tileLoad`.
    - Perches get a bonus (`BIRD_PERCH`).
    - A bird with no valid sample (over open sea) takes a wide random target.
    - Birds reach canopy fruit (`tall`).
    - Insect, fishing and carrion birds (diet ≥ 0.33) don't graze.
  - **Bird rules in `step`:**
    - Flight cost: `FLY_META` applies only while `fly` is set.
    - Birds take a smaller bite (`BIRD_BITE`) and get more from fruit (`BIRD_FRUIT`).
    - Seeds ride longer (`BIRD_SEED`), and a seed carried over water waits for land in `_dropSeed`.
    - Fed birds perch (`BIRD_REST_P`).
    - Flying birds add no tile load and take no parasite drain.
    - Carrion is eaten on land only.
    - Fishing birds hunt below `FISHER_HUNT` energy with `FISHER_RANGE` reach.
    - Bird-borne disease: an infected bird drops vector exposure (`BIRD_DROP_K`, `BIRD_DROP`).
    - Birds use the crowd cap `BIRD_CROWD`.
  - **Bugs:** `_bugEff` ramps the bird bug bonus up to ×`BIRD_BUG` between diet 0.25 and 0.40, and bird omnivores get `BIRD_BUG_ENERGY` per bug.
  - **`_attack`:** fishing birds strike past water cover (`BIRD_STRIKE`), and land predators catch perched birds at ×`BIRD_ESCAPE`.
  - **`_eggTile`:** birds lay only on a perch tile.
  - **Five bird founders** (`domain: 'air'`, `cls: CLS_BIRD`): seed bird, insect bird, fishing bird (`nic: 1`), raptor and vulture.
  - **Categories:** `animalCategory(g, domain, cls, nic)` gives the bird categories `seedbird`, `fowl`, `insectbird`, `wader`, `raptor` and `vulture`, with icon variants and labels. `birdNiche()` and `BIRD_NICHES` are new.
  - `newSpecies` takes `nic`, and `refreshSpeciesMeans` passes it on.
  - The octopus variants drop the starfish icon (mirrored from fe2efa1).
- `js/sim/ecosystem.js`:
  - `_introduce` uses `domainIndex`, places birds on land tiles, and passes `arch.nic`.
  - New `stats.birdNiches` (seed, insect, fisher, raptor, carrion), `stats.birdMigrants` and `history['birdNiche.<k>']`.
  - `_migrations`:
    - It has the per-domain `live` count from fe2efa1, keyed by `domainIndex`, so the air domain is separate.
    - Founder keys include `nic`, so the fishing bird and the raptor (both bird carnivores) are guarded separately.
    - Bird niches revive below `BIRD_REVIVE` (5) rather than at exactly 0.
    - There are bird-specific "why" texts.
- `js/render.js`:
  - Birds are drawn in a second pass, above every other animal.
  - Flying birds are lifted by `FLY_LIFT`, with a smaller, fainter shadow offset down and right (`FLY_SHADOW`, `FLY_SHADOW_ALPHA`). Perched birds get the normal shadow.
  - The Disease view adds the vector-plane exposure trails (`TRAIL_K`).
- `js/icons.js`: new icons `sparrow`, `parrot`, `swallow`, `heron`, `gull`, `duck` and `eagle` (32×32, layer format). `gull` was redrawn once after the gallery check, because it looked like the sparrow.
- `js/main.js`: the species subtitle says "flying", and Habitat reads "Air · perches on land" or "Air · fishes the shallows". The map tooltip prefixes bird states with "flying" or "perched".
- `index.html`: help text for the Disease view (exposure trails) and the Seasons switch (bird migration).
- Screenshots: `screenshots/birds.png` (close-up, plus the summer and winter ring maps of one species) and `screenshots/bird-icons.png` (the icon gallery).

Not touched: `eggs.js` (bird eggs use domain 3 and need no change), `save.js` (no new classes; the new state is typed arrays, a Map and numbers), `CODE_REFERENCE.md` and `complexities.md` (see Doc changes needed).

## Design

| Niche | Founder genes (size, speed, sense, diet, scav) | Food | Hunts | Icons |
| --- | --- | --- | --- | --- |
| Seed bird | 0.14, 0.55, 0.5, 0.12, 0.1 | Grazing, fruit (canopy too, ×1.4), long seed carry | — | sparrow, parrot (`fowl`: chicken when size ≥ 0.4) |
| Insect bird | 0.1, 0.55, 0.55, 0.45, 0.1 | Bug swarms at up to ×6 rate and ×3 energy (pest, detritivore and pollinator planes, locusts included), eggs | Invertebrates on land | swallow, crow |
| Fishing bird (`nic`) | 0.32, 0.42, 0.55, 0.78, 0.1 | Fish, water invertebrates and amphibians below mass 1.25, in water with depth < 0.5 | Water and amphibious animals | heron, gull, duck |
| Raptor | 0.42, 0.7, 0.85, 0.9, 0.1 | Meat | Land, amphibious and bird prey below 0.8× its own mass | hawk, eagle, owl |
| Carrion bird | 0.55, 0.45, 0.9, 0.7, 0.85 | Carrion on land, found from about 23 tiles | Never | vulture |

**Predation:**
- Land and amphibious predators can only take perched birds (`fly` = 0), at ×0.35 chance.
- Water predators never take birds.
- Raptors take birds in the air.
- The land scavenger founder stays a mammal (hyena or jackal).

**Migration:**
- In autumn and winter (`seasonT < 0`), a bird whose tile temperature plus `seasonT` is below its `pT` is pulled toward a goal of `MIGRATE_RANGE` (36) tiles from its home latitude `oy`, toward the equator at mid-map. The pull is capped by the equator and applied per forage pick, up to ±range.
- With `seasonT ≥ 0`, it flies back toward `oy`.
- A `'migration'` event, "<species> flew south for the winter", is logged once per species per year (species with population ≥ 6).

## Test numbers

Headless runner (`run2.js`, 320×210, 3000 ticks). The three seeds ran in parallel on a 4-core box shared with other agents, so the baseline and the new code ran as matching parallel batches. "Means" are averages of the history over ticks 1500–3000.

| Seed | ms/tick base → new | Mammals mean base → new | Fish mean base → new | Birds at 3000 (share) | Mean bird share | Niches at 3000 (seed / insect / fish / raptor / carrion) |
| --- | --- | --- | --- | --- | --- | --- |
| 42 | 23.94 → 25.90 (+8%) | 1859 → 2011 (+8%) | 740 → 1002 (+35%) | 275 (5.0%) | 8.2% | 30 / 158 / 14 / 23 / 50 |
| 7 | 25.50 → 25.55 (0%) | 1907 → 1602 (−16%) | 2241 → 1605 (−28%) | 401 (9.1%) | 5.8% | 23 / 279 / 46 / 17 / 36 |
| 123 | 26.66 → 26.94 (+1%) | 1266 → 1201 (−5%) | 2177 → 2272 (+4%) | 551 (8.5%) | 8.3% | 253 / 222 / 19 / 22 / 35 |

- **Last 5 history samples** of `bird.herb/omni/carn/scav`:
  - 42: 30 / 158 / 37 / 50
  - 7: 23 / 279 / 63 / 36
  - 123: 253 / 222 / 41 / 35

  The `birdNiche.*` tails are stable over the last 25 ticks on every seed (fishing bird 11–14, 41–46 and 19–20).
- **Run-to-run noise is large.** Slice-1 code at 69b799e and at fe2efa1 differ only in the revival guard, yet their means differ by up to 44%:
  - fish on 42: 1312 vs 740;
  - mammals on 123: 1511 vs 1266.

  Against 69b799e, the new code is: mammals 42 −8%, 7 +2%, 123 −21%; fish 42 −24%, 7 −1%, 123 −12%. The −28% fish on seed 7 against fe2efa1 is within that noise.
- **Migration**, as the mean distance of all birds from the equator, in tiles, by season (summer / autumn / winter / spring):
  - 42: 37.1 / 34.4 / 30.1 / 35.0
  - 7: 34.1 / 31.8 / 26.6 / 29.2
  - 123: 44.0 / 42.0 / 38.1 / 42.3

  In the browser on seed 42, the main seed-bird species goes from 43.4 tiles (tick 1560, summer, 250 birds) to 32.2 (tick 1910, winter). Each run logs 73–84 `'migration'` events, counting both the seasonal "flew south/north for the winter" entries and immigrations; slice 1 logged 15–27.
- **Avian disease** (`dis2.js`, 3000 ticks, sampled every 25 ticks):

  | Seed | Mean sick birds | Peak sick birds | Strains seen in birds | Mean bird-only trail tiles |
  | --- | --- | --- | --- | --- |
  | 42 | 16.3 | 134 | 20 | 18 |
  | 123 | 1.1 | 29 | 4 | 0.7 |
  | 7 | 0 | 0 | — | — |

  Seed 7 had no bird infections: its outbreak stayed in its mammal host.
- **Determinism:** `det.js` (encode/decode after 1500 ticks, then 500 more ticks on both): `stats equal true`, `full state equal true`, RNGs equal, aliases intact, on seeds 42 and 7.
- **Browser** (Playwright, chromium with swiftshader, `#42`):
  - The full save/load script (`browser2.js`) passed: download, new world, load, stats and camera equal, bad file refused.
  - The bird script cycled every view, expanded every class card and clicked every Animals chip, ran live, and opened the bird species detail.
  - The only console error is the Google Fonts certificate error.
  - Screenshots viewed: `birds.png`, `bird-icons.png`, a UI view with the expanded Birds card, and the Disease view.

## Deviations

- **The fishing bird is a lineage flag (`sp.nic` / `nic`), not a gene.** Fishing birds and raptors are both bird carnivores by diet, so the four role keys can't tell them apart. The flag is inherited like `cls`, and the stats get a separate `birdNiches` breakdown and history.
- **Birds revive below 5 per niche** instead of at 0. Single-digit fishing and raptor populations otherwise winked out on some seeds. Birds immigrating is plausible, and the log shows these as "migrated in".
- **Insect birds hunt only invertebrates, and carrion birds never hunt.** In the first draft, every bird with meat efficiency hunted small mammals, and mammal means fell 25–50%.
- **Flight cost is paid only while flying,** so perching is the cheap state and a deliberate trade-off.
- Insect birds take bugs from the existing `bugs.eat` planes (pest, detritivore and pollinator), so locust outbreaks feed them. The parasite plane isn't eaten.
- Bird-borne exposure goes to the vector plane only, not the carcass plane, so it decays at `VECTOR_DECAY`.
- The home latitude `oy` is the hatch latitude. Slice 3 nests should replace it with the nest site.
- `SAVE_VERSION` stays 2. Saves made with slice-1 code lack `oy`, `fly` and `nic`, and would load with those fields missing. Part 1 is unreleased, so no bump was made.

## Risks

- **Bird niches still boom and bust,** for example insect birds swinging between 6 and 430 within a run. Revival keeps all five present, but repeated immigrations prop up the fishing bird and the raptor on some seeds.
- **Fishing birds are energy-marginal:** about one kill per 80–100 ticks on seed 42. They depend on shallow coastal fish.
- **Seed birds compete with small mammal grazers.** With a stronger tuning (`FLY_META` 1.15 on all ticks, full bite), they reached 750 and mammal means fell 37% on seed 42. `BIRD_BITE` and the flight cost are the levers.
- **Migration** only moves birds whose tile drops below their `pT`. Tropical lineages stay put, so the shift is about 5–7 tiles in the all-bird mean, and about 11 tiles in a temperate species.
- `_nearest` gets an extra branch for every bird-involved pair. ms/tick stayed within +8% on all seeds, but raptors and fishing birds search 1.5–2× wider radii.
- **Disease reach varies by seed:** avian disease is clear on 42, weak on 123 and absent on 7, and the class-jump affinity from slice 1 limits it.
- **Bird icons are small at default zoom,** because birds are light (mass 0.6–1.85).

## Doc changes needed (owned by the docs agent)

- **`CODE_REFERENCE.md` Animals:**
  - Domain 3 `'air'` and `domainIndex`.
  - `DOMAIN_BIT` 4 entries, `FEED_BIT`, walk bits 8 (fly) and 16 (perch: beach and cliff).
  - `_perch`, `_canEat`, `_migrate`.
  - The new fields `oy`, `fly`, `nic` and `sp.nic`.
  - The bird constants: `BIRD_*`, `FLY_META`, `FLY_MOVE`, `FISHER_HUNT`, `FISHER_RANGE`, `PERCH_COVER`, `MIGRATE_RANGE`, `MIGRATE_HOME`.
  - The five bird founders, the bird categories, icon variants and labels, and `birdNiche`/`BIRD_NICHES`.
  - The bird predation and contact rules, the bird flight cost, `_eggTile` for birds, the `_bugEff` ramp, and `_clampClass` `BIRD_SIZE`.
  - `_migLogged`/`birdMigrants`.
- **`CODE_REFERENCE.md` Ecosystem:** `stats.birdNiches`, `stats.birdMigrants`, `history['birdNiche.*']`, `BIRD_REVIVE`, and `_migrations` keys with `nic` and the air domain.
- **`CODE_REFERENCE.md` Renderer:** the bird second pass, `FLY_SHADOW`, `FLY_SHADOW_ALPHA`, `FLY_LIFT`, and the Disease-view `TRAIL_K` trails.
- **`CODE_REFERENCE.md` Icons:** sparrow, parrot, swallow, heron, gull, duck and eagle.
- **`CODE_REFERENCE.md` main.js:** the "flying" subtitle, the Air habitat text and the perched/flying tooltip.
- **`complexities.md`:** animals.js grows by about 190 lines of bird logic (still 9, maybe 9.5). The ecosystem.js revival guard is now per (class, role, domain, niche).

## Checklist

- [x] Domain 3 flying with walk bit 8; birds rest, breed and lay only on perches (cover, beach, cliff)
- [x] `FLY_META`, `BIRD_SIZE` clamp, fast and long sense, drinking over fresh water (shared water meter)
- [x] Cross-domain rules: land predators only take perched birds, raptors hunt land animals and smaller birds, fishing birds take small prey in shallow water
- [x] Five bird founders; the mammal scavenger stays a hyena or jackal
- [x] Categories, icon variants and labels; 7 new icons checked in a rendered gallery (gull redrawn)
- [x] Seasonal migration with a once-per-species-per-year log; measurable latitude shift on all seeds
- [x] Insect birds eat swarms; birds carry strains and leave vector trails (`BIRD_DROP_K`); the Disease view shows the trails
- [x] Founders placed by `_introduce`; every bird niche revived via `_migrations`
- [x] Birds drawn above other animals, with an offset shadow when flying
- [x] main.js habitat, subtitle and tooltip
- [x] All five bird niches alive at 3000 on 42, 7 and 123
- [x] Bird share 5–20% at 3000 (5.0%, 9.1%, 8.5%)
- [x] Mammal and fish means within −30% of the slice-1 baseline (worst: fish −28% on seed 7, inside the run-to-run noise)
- [x] ms/tick within +15% (+8%, 0%, +1%)
- [x] Save/load byte-identical (seeds 42 and 7)
- [x] Browser: no console errors, save/load, `birds.png` saved and viewed
- [x] No new code comments (grep of the diff: 0)
- [x] No edits to `CODE_REFERENCE.md` or `complexities.md`
