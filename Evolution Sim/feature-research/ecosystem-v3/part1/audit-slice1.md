# Slice 1 audit: genome groundwork and taxonomy

Commit 69b799e was checked on seeds 42, 7 and 123 at 3000 ticks, plus a year-20 (9600-tick) run on seed 42. The fixes below were then applied and the gate was run again.

## Gates
| Gate | Before fixes | After fixes |
| --- | --- | --- |
| No new code comments | Pass | Pass |
| Save/load byte-identical (1500 + 500 ticks, all seeds) | Pass | Pass (no save-format change) |
| `SAVE_VERSION` 2, version-1 files refused | Pass | Pass |
| Browser: no console errors, cards, chips, views, save/load | Pass | Pass |
| Every founder group (class, role, domain) alive at 3000 | Fail: seal on all seeds, croc on 42 and 123, octopus/jelly on 42, snail and spider on 7 | **Pass on all three seeds** |
| Disease 5–15% of deaths | Fail (0.5%, 0.2%, 2.9%) | Still low on 42 and 123 (1%, 0%), 8.5% on 7 |
| ms/tick within +25% of baseline | Pass on 42 and 7, +17% on 123 | Not re-measured cleanly (box shared by three agents) |

## Fixes
- **Revival guard per domain** (`ecosystem.js` `_migrations`). The guard used class-wide role counts, so seals were never brought back while land carnivores lived, and the same masking hit crocs, octopuses, jellies, snails, spiders and sea turtles. It now counts live animals by class, role and domain (land, water, amphibious) from the pool.
- **Octopus icon:** the octopus category no longer picks the starfish icon.

## Known and deferred
- **Starvation of water and amphibious predators.** Seals and crocs starve within about 400–1000 ticks, and fish predators fall to single digits on seed 42. Revival now keeps them present, but they don't hold their own yet. Tuning goes in the Part 2 balance pass.
- **Low disease share.** This is chain divergence rather than one bad line: turning off `INVERT_EMERGE`, or restoring in-range cross-class infection, gave identical numbers on seed 42. Slice 4 (honest signals and resistance) and the Part 2 balance pass take this on.
- **Crab drift.** Over 20 years, crabs drift into the water omnivore role (681 at year 20). This is expected evolution, but crab-like lineages should keep their scavenger look.
- **Sizes against v2.** Mammal omnivores and fish herbivores are down, and land carnivores and reptiles are up on seed 42. This is mostly because v2 groups were split into classes, so the totals no longer line up one to one.
- **UI:**
  - The Birds card is hidden while birds are 0 and leaves a gap. This goes away when slice 2 adds birds.
  - Labels are cut off in half-width cards ("Amphibia…").
  - Roles that hit 0 stay visible as dimmed rows. This is on purpose, so extinctions are visible.
  - The Class cell says "carnivore" where the plan said "predator".
