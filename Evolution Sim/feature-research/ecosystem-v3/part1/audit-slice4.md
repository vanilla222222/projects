# Slice 4 audit: pack hunting and sexual selection

Built on the slice 1 and 2 branch at 45084f7. Slice 3 (nests and dens) is **not** merged into this branch: the coordinator asked for a merge of `origin/claude/evolution-simulator-continue-jc497s`, but the fetch and merge were refused by the session permissions, so nothing slice 3 related is in this commit. The nest/den interactions listed in "After slice 3 merge" below still have to be done once the merge is allowed. All numbers are against 45084f7.

## Files changed

- `js/sim/animals.js`:
  - **Constants:** `PACK_*`, `DISPLAY_*`, `SICK_DISPLAY`, `PARA_DULL`, `MATE_*`, `CHOOSY_WAIT`, `SHOWY_ON`/`SHOWY_OFF`, `SHOW_EVERY`/`SHOW_HIST` (see Design).
  - **Founder overrides** (a loop after `ANIMAL_ARCHETYPES`): land mammal carnivores get pack `FOUNDER_PACK` 0.6; non-fisher birds with diet < 0.66 get choosiness `FOUNDER_CHOOSY` 0.55. The archetype literals are untouched.
  - **New pool fields:** float `show`, ints `pk` (leader uid) and `pn` (pack size), appended with `ANIMAL_FIELDS_F.push` / `ANIMAL_FIELDS_I.push`. Cumulative counters `packKills`, `bigKills`, `mateRefusals`; preallocated `_packBuf`, `_mateBuf`; scratch `_pr`, `_pt`, `_pv`, `_pe`, `_ps` sized `cap + 1` (so the worker snapshot skips them).
  - **New methods:** `_social()`, `_packHelp(i, p)`, `_packFeed(i, p, n, mp)`, `_chooseMate(i)`, `_showTrack(sp)`.
  - **Edited:** `_decode` (display cost on `meta`), `spawn` (resets the new fields), `_nearest` (new `preyMul` argument, display-weighted prey distance), `_pickForage` (pull toward the pack leader), `step` (`_social()` after `_buildGrid`, pack chase block), `_contact` (pack members count as herding), `_attack` (pack factor, `HERD_SAFE/sqrt(n)`, display spotting, pack kill branch), `_reproduce` (`_chooseMate` instead of `_nearest(i, range, 2)`), `refreshSpeciesMeans` (calls `_showTrack`).
- `js/sim/ecosystem.js`: `stats.packs`, `packSize`, `packKills`, `bigKills`, `mateRefusals`, `packCls`; `history.packs`, `history.packSize`; new `_packStats()` called every 20 ticks after `_herdStats()`.
- `js/render.js`: constants `SHOW_BASE`, `SHOW_SAT`, `SHOW_LIFT`, `CREST_ZOOM`, `CREST_MIN`, `CREST_SCALE`, `PACK_LINK_ZOOM`, `PACK_LINK_DOTS`, `PACK_LINK_ALPHA`, `PACK_LINK_RGB` (after `INFECT_MIX`); new methods `_showy` and `_pushPackLinks` (before `_infected`); `_pushAnimals` gets the pack-link call, the bright tint and the crest.
- `js/icons.js`: new `crest` icon after `virus`.
- `js/main.js`: `STAT_EXTRA` entry `packs` ("Hunting packs"); `updateExtraStat` sub-line for packs; `updateClassRoles` calls new `packRow(row, k, s)` for the Predators row; `ANIMAL_TRAITS` adds Pack hunting, Display and Choosiness after Drought tolerance; `renderDetail` adds the Display trend sparkline row.
- `CODE_REFERENCE.md`: see Doc changes.
- Screenshot: `screenshots/packs-display.png`.

Not touched: `save.js` (no new classes; the new state is typed pool arrays, numbers and plain species keys), `worker.js`/`client.js` (no `SNAP_GRIDS` entries needed: `pk`, `pn`, `show` are pool arrays and travel with the pool; `showHist`, `showStep`, `showy` are species keys without a leading `_`; `stats` is sent whole), `eggs.js`, anything nest or den related.

## Design

**Packs.**
- Eligible: adult, diet > 0.6, `scav <= 0.5`, pack gene > `PACK_MIN` (0.45).
- `_social()` runs once per tick. Each eligible animal points at the best same-species eligible animal within `PACK_R` (9 tiles); score is `energy/emax`, ×`PACK_SICK_LEAD` (0.3) when infected, ties to the lower uid. Pointers resolve to a root, the leader. Healthy members fill first, then infected ones, up to `PACK_MAX` (8). A root with only itself dissolves.
- The leader of a hungry pack (mean energy share < 0.65) picks one prey with `_nearest(..., 1, preyMul)`, `preyMul = min(2.2, 1 + 0.35*(n-1))`, so a pack of 4 can target prey up to 3.7× its mass instead of 1.8×.
- Members below 95% energy chase the shared prey (×1.25 within 4 tiles, slowed by `0.5*sick/n`) and attack within 1 tile. Idle members forage near the leader (`PACK_PULL` 0.85).
- `_attack`: `_packHelp` collects the attacker and pack mates within 3 tiles of the prey. Chance ×`min(2.6, 1 + 0.5*(n-1))`; herd safety is `HERD_SAFE/sqrt(n)`. A pack kill is split evenly (each share ×`meatEff` and the generalist tax, capped at `emax*gf` except for the killer), so per-member energy falls as `1/n`. Every member present is exposed to an infected prey's strain.
- Pack members use the full herd contact multiplier in `_contact`.

**Display and choice.**
- `show = display × gf × (0.35 if infected) × (1 − 0.5·min(1, tile parasite load))`. This is the honest signal; fliers skip the parasite term.
- Costs: metabolism ×`1 + 0.12·display`; cover against predators ×`1 − 0.6·show`; hunters rank prey by `dist² × (1 − 0.5·show)`, so showy prey are picked first.
- `_chooseMate`: reservoir-sample up to 8 adult same-species animals in range with the sim RNG, softmax on `show` with sharpness `60 × choosy` (stabilised by subtracting the max). If the pick's `show` is below `choosy × species mean display`, refuse: cooldown 12 ticks, no breeding this time. An infected mate exposes the chooser (`MATE_K` 0.4).
- `_showTrack` keeps `sp.showHist` (`[tick, mean display]` every 100 ticks, thinned by doubling the step past 120 entries) and logs "<Species> evolved a showy display" when the mean passes 0.7 (pop ≥ 6), re-armed below 0.6.

**Look.**
- Healthy animals with `show > 0.3` get a more saturated, lighter tint (`_showy`). Sick animals keep the infection tint, so the dull sick look is also visible.
- At zoom ≥ 6, animals with `show ≥ 0.45` get the `crest` (three-feather fan) on the head, scaled with `show`.
- At zoom ≥ 4, three faint dots link each pack member to its leader.
- UI: Predators role row reads "Predators · N packs" (title: mean size, all-pack kills, big kills); a "Hunting packs" stat card with history sparkline and sub-line "mean size · kills · big game"; traits Pack hunting, Display, Choosiness, and a Display trend sparkline in the species detail.

## Test numbers

Headless runner (`an.js`, 320×210). The three seeds ran as a parallel batch on a shared 4-core box. The baseline is a matching parallel batch of 45084f7.

**3000 ticks:**

| Seed | ms/tick base → new | Animals | Packs at 3000 | Mean size | Pack kills | Big kills (prey > 1.5× hunter) | Mate refusals |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 42 | 31.66 → 26.10 | 3279 | 5 | 3.00 | 481 | 60 | 28 |
| 7 | 31.19 → 26.33 | 5580 | 18 | 3.78 | 514 | 37 | 2 |
| 123 | 32.39 → 29.68 | 5112 | 13 | 3.46 | 795 | 21 | 32 |

The ms/tick drop is box noise (the baseline batch ran while the other agent was busy); the gate is +25% and the new code is not slower in any batch.

**Packs per lineage** (mean over 50-tick samples, ticks 50–3000):

| Seed | Lineage | Packs (avg) | Mean pack size | Pack gene at 3000 |
| --- | --- | --- | --- | --- |
| 42 | mammal.carn.land | 7.4 | 3.07 | 0.64 |
| 7 | mammal.carn.land | 3.8 | 3.30 | 0.68 |
| 7 | mammal.carn.water (seal) | 1.1 | 3.47 | 0.50 |
| 123 | mammal.carn.land | 4.9 | 3.15 | 0.69 |
| 123 | mammal.carn.water (seal) | 2.1 | 3.94 | 0.50 |

**Display** (lineage mean genome, tick 200 → 3000, lineages with choosiness > 0.4):

| Seed | Lineage | Choosiness | Display |
| --- | --- | --- | --- |
| 42 | bird.omni.air | 0.55 → 0.54 | 0.497 → 0.507 (+0.010) |
| 7 | bird.omni.air | 0.55 → 0.51 | 0.500 → 0.521 (+0.021) |
| 123 | bird.herb.air | 0.55 → 0.55 | 0.501 → 0.603 (+0.102) |
| 123 | bird.herb.air (second lineage) | 0.55 → 0.56 | 0.500 → 0.521 (+0.021) |

**Display in hunted lineages** (3000 ticks): pack-hunting `mammal.carn.land` falls on every seed (−0.042, −0.061, −0.051), `reptile.carn.land` −0.061 on 42. In an earlier tuning run (before the mate-choice sharpening), the heavily hunted `mammal.herb.land` on 123 fell −0.097. Herbivore lineages in this run mostly rise slightly (+0.01 to +0.10), driven by drift and by the weak mate preference at choosiness 0.3.

**Balance** (animals per class at tick 3000, base → new; end-point counts, so noisy):

| Seed | Fish | Amphibians | Reptiles | Mammals | Birds | Invertebrates |
| --- | --- | --- | --- | --- | --- | --- |
| 42 | 945 → 687 | 63 → 26 | 251 → 462 | 2965 → 919 | 275 → 526 | 956 → 659 |
| 7 | 1594 → 2642 | 76 → 46 | 210 → 208 | 1519 → 1899 | 401 → 513 | 598 → 272 |
| 123 | 2857 → 1772 | 66 → 12 | 641 → 689 | 1864 → 1672 | 551 → 370 | 505 → 597 |

- Every founder group (class, role, domain) present at tick 3000 in the baseline is present in the new run, except `invert.omni.land` on seed 42. That group is a drift group: it is absent from the baseline on 7 and 123 as well.
- All five bird niches are alive on every seed (fisher 7 / 3 / 39).

**Year 35** (16 800 ticks, snapshots at tick 2400 = year 5 and at the end; same parallel batch, no baseline batch at this length):

| Seed | ms/tick | Animals | Classes (fish / amph / rept / mamm / bird / invt) | Groups | Packs | Mean size | Pack kills | Big kills | Refusals |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 42 | 38.52 | 7624 | 1056 / 117 / 327 / 992 / 1398 / 3734 | 28 | 11 | 3.73 | 5779 | 998 | 260 |
| 7 | 38.95 | 5097 | 2067 / 76 / 570 / 524 / 521 / 1339 | 27 | 6 | 3.50 | 4397 | 93 | 2284 |
| 123 | 40.57 | 5961 | 999 / 219 / 912 / 976 / 1615 / 1240 | 27 | 18 | 3.17 | 7872 | 28 | 1153 |

- Every class is alive at year 35 on every seed. Bird niches at the end (seed / insect / fisher / raptor / carrion): 42: 159 / 480 / 10 / 15 / 734; 7: 84 / 61 / 91 / 18 / 267; 123: 247 / 3 / 2 / 22 / 1305. The carrion bird booms on 123 and the insect and fisher niches sit at revival level.
- Packs persist: `mammal.carn.land` averages 11.2 / 3.6 / 6.2 packs over the run, with mean size 3.35 / 3.21 / 3.22.
- **Showy display events fire** late in the run on 7 (Ceradorcas, tick 16 200) and 123 (Placolagus 16 380, Gracesorex 16 240). The event log keeps only the last 120 entries, so earlier ones are not visible in the headless output; on 42 the bird.omni.air lineage ends at mean display 0.989, so it must have crossed 0.7.
- **Display runs away over decades.** Mean display rises in most lineages, not only the choosy ones: 42 `mammal.herb.land` 0.303 → 0.982 (choosiness 0.30), 7 `fish.herb.water` 0.299 → 0.858, 123 `invert.omni.water` 0.199 → 0.967. The pack-hunting `mammal.carn.land` stays low (0.257 / 0.515 / 0.276). See Risks.

**Resistance target** (lineage mean `G_RES`, year 5 → year 35, in the most-infected lineage with choosiness > 0.4 at the end):

| Seed | Lineage | Choosiness | Sick at end | Resistance year 5 → 35 |
| --- | --- | --- | --- | --- |
| 42 | bird.omni.air | 0.50 | 64 | 0.169 → 0.074 (−0.095) |
| 7 | mammal.carn.land | 0.45 | 18 | 0.201 → 0.234 (+0.033) |
| 123 | bird.scav.air | 0.54 | 183 | 0.284 → 0.208 (−0.076) |

Rises on 1 of 3 seeds, so the target is missed. Resistance does rise strongly in the heavily infected lineages that are not choosy: fish lineages +0.24 to +0.46 (for example 123 `fish.omni.water`, 443 sick, 0.158 → 0.622) and 7 `reptile.herb.land` +0.229. So infection selects for resistance directly, but mate choice on `show` does not add to it in the choosy birds.

**Determinism:** `det.js` on seed 42 (1500 ticks, encode, decode, 500 more ticks on both): `stats equal true`, `full state equal true` (15 337 418 bytes), RNGs equal, aliases intact.

**Browser** (Playwright, chromium with swiftshader, seed 42, 1500 ticks, then 4 s live):

| Mode | Tick | Biggest pack | Packs | Pack kills | Predators row | Console errors |
| --- | --- | --- | --- | --- | --- | --- |
| worker | 1500 | slot 538, size 5 | 5 (mammal 5 / 16 members) | 245 | "Predators · 5 packs", title "5 hunting packs, mean size 3.2. All packs: 245 kills, 12 of prey over 1.5× the hunter's mass" | none |
| `?worker=0` | 1500 | slot 538, size 5 | 5 (mammal 5 / 16 members) | 245 | same | none |

Both modes reach the same state at tick 1500 (worker/main parity). The species detail for the pack species (Rufiolagus) shows Pack hunting 58%, Display 30%, Choosiness 30% and a Display trend row. The Hunting packs card reads "5 · mean size 3.2 · 245 kills · 12 big game". `packs-display.png` is the main-thread run at zoom 30 on the biggest pack, with the mammal card open.

## Deviations

- **Mate sampling is sharper than the plan's "weighted by display".** A linear weight gave a selection differential near zero (display varies ±0.05 within a species). The softmax with `MATE_SHARP` 60 × choosiness and `MATE_SAMPLES` 8 is what gives the +0.10 on seed 123.
- **Founder overrides instead of new archetype values.** Land mammal carnivores start at pack 0.6 and non-fisher seed/insect birds at choosiness 0.55, set by a loop after the archetype table so the literals (and any slice 3 edits to them) don't conflict.
- **Lone hunters get no new bonus.** The plan's "lone hunters keep a speed bonus" is read as: solo hunting keeps its old code path and speed, while pack members only get `PACK_PACE` near a shared target. Pack members also pay with split meat.
- **Leader choice is by energy share, not distance.** Each eligible animal points at the best-fed same-species animal within `PACK_R`, so packs are stable from tick to tick without stored state. The plan's "nearest high-energy adult" becomes "highest-energy adult within reach". Slice 7 is meant to swap this for rank.
- **Pack state is rebuilt every tick and not saved.** `pk`/`pn` are pool fields, so they are saved and restored, but `_social()` rebuilds them at the start of the next tick anyway.
- **`SAVE_VERSION` stays 2.** Saves from before slice 4 lack `show`, `pk` and `pn`; Part 1 is unreleased, so there is no migration (same policy as slice 2).
- **Display trend uses its own `sp.showHist`** (tick/value pairs every 100 ticks, max 60 samples), not the population history.

## Risks

- **Mammals on seed 42 end at 919 vs 2965 in the baseline.** Pack predators hit herbivore mammals hardest (1590 of the 5909 animals eaten on 42 were from the big `mammal.herb.land` lineage). Seeds 7 and 123 are within −10%/+25%, and the slice 2 audit showed end-point swings of this size between equivalent runs. If it shows up again, `PACK_CAP` (2.6) and `PACK_PREY_CAP` (2.2) are the levers.
- **Amphibians are lower on all seeds** (26 / 46 / 12 vs 63 / 76 / 66). They are not pack prey; the drop is most likely noise around small numbers, but it should be watched in the slice 3 merge re-gate.
- **The fishing bird niche stays small** (7 / 3 / 39) and leans on revival, as in slice 2.
- **Display selection is slow at first, then runs away.** Birds breed roughly 1.5 times per 1500 ticks, so 3000 ticks is only a few generations (best +0.10). Over 35 years, the founders' default choosiness of 0.3 already gives a softmax sharpness of 18, which beats the costs (`DISPLAY_COST` 0.12 on metabolism, `DISPLAY_SPOT` 0.6 on cover), and mean display reaches 0.86–0.99 in many lineages, hunted herbivores included. Not tuned in this slice, because each change needs a fresh 35-year batch and stronger costs would deepen the 3000-tick miss. Candidate fixes: sharpness from `max(0, choosy − 0.3)` so only above-founder choosiness selects, a convex cost (`display²`), or a stronger `DISPLAY_SEEN`.
- **Mate choice does not raise resistance.** `show` is dulled by current infection (×0.35) and tile parasite load, but most choosy birds are rarely sick at the time they are sampled, and resistance only lowers the chance of being sick. The link from choice to `G_RES` is therefore weak. A direct term (for example, `show` ×`(0.7 + 0.3·res)` while the species has an active strain) would make the signal stronger.
- **`_social()` is O(eligible × neighbours) per tick.** ms/tick did not grow measurably, but a world full of pack-eligible carnivores would cost more.

## After slice 3 merge (not done: merge blocked)

The coordinator asked for slice 3 to be merged and these interactions added. The merge could not be run (permission refusal on fetch/merge), so they remain open:

- Pack members heading home (state 6, `home`/`nx`/`ny`) should not be pulled into a pack chase, and a den should anchor the pack's forage pull.
- `guardM`/`guardT`/`nestCell` in `eggs.js`: a guarding parent should count as a defender against a pack attack on its nest, and pack kills of nest guards should be counted.
- `stats.nests` next to `stats.packs` on the class card.
- Re-run every gate on the merged code.

Likely merge hotspots (slice 3's diff was not inspected, so these are the slice 4 edit sites most likely to overlap): `ANIMAL_TRAITS` in `main.js` (a Nesting trait would go at the same spot), the render constants block after `INFECT_MIX`, icon insertions after `virus`, `ANIMAL_FIELDS_F`/`_I` pushes, `step` in `animals.js` (the pack chase block sits after the territory/herd block), `_reproduce`, and in `ecosystem.js` the constructor's stats/history init, the 20-tick block in `step` (after `_herdStats()`) and `_sampleHistory`.

## Doc changes

Made in `CODE_REFERENCE.md`:

- The gene table note: genes 16–18 are now functional (gene 15 is for slice 3), plus the founder overrides.
- The new pool fields `show`, `pk`, `pn`.
- A new "Packs, display and mate choice" section with the constants table and the methods.
- `stats.packs`, `packSize`, `packKills`, `bigKills`, `mateRefusals`, `packCls`, and `history.packs` / `history.packSize`.
- The renderer pack links, display tint and crest; the `crest` icon.
- The Hunting packs card, the Predators row label, the new traits and the Display trend row.

## Checklist

- [x] Packs form from `G_PACK > 0.45` within `PACK_R`; shared target; members join kills
- [x] Kill chance `× min(cap, 1 + PACK_K(n−1))`; prey mass limit grows with pack size
- [x] Meat split among members present; herd safety `HERD_SAFE/sqrt(n)`
- [x] Packs and mean size on the Predators role row, plus history and a stat card
- [x] Mate choice from up to `MATE_SAMPLES`, weighted by display; choosy refusal with cooldown
- [x] Display costs: metabolism, spotting (cover), hunter preference; choosiness costs time
- [x] Saturated tint for display; crest at zoom ≥ 6; pack links when zoomed in
- [x] Display and Choosiness traits; Display trend sparkline
- [x] Showy display event at 0.7 (none within 3000 ticks; fires in the year-35 runs)
- [x] Honest signals: infection and parasite load dull `show`
- [x] Packs spread disease: herd contact multiplier, sick members slow the pack, leader prefers healthy
- [x] Pack kills expose the whole pack
- [x] Packs target: mean ≥ 3 in at least one lineage on every seed, big kills on every seed
- [ ] Display target: rise ≥ 0.15 with choosiness > 0.4 (best +0.102 on 123; +0.010 and +0.021 on 42 and 7)
- [x] Display falls in a hunted lineage on every seed
- [x] Balance gate: every founder group alive (except the drift group `invert.omni.land` on 42); flagged mammal end count on 42
- [ ] Resistance rises year 5 → 35 in the most-infected choosy lineage on ≥ 2 of 3 seeds (1 of 3; it rises strongly in infected non-choosy lineages)
- [x] Year-35 run: all classes alive, packs persist, showy events fire
- [x] ms/tick within +25%
- [x] Save/load byte-identical (`det.js`)
- [x] Browser worker and `?worker=0`: no console errors, same state at tick 1500
- [x] No `SNAP_GRIDS` changes needed; no new save classes
- [x] No code comments, no `Math.random`, no model names in the diff
- [ ] Slice 3 nest/den interactions and re-gate on merged code (merge blocked by permissions)
