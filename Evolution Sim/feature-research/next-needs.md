# Next needs

State as of 2026-09-30: the ecosystem-expansion roadmap (parts 1-4) is complete and committed. Seeds 7 and 123 settle on longer runs, so they are no longer open issues.

## Tuning and fixes

1. **Disease strength.** Disease causes only about 2% of animal deaths, so resistance (animal gene 9, plant gene 14) isn't selected for. Tune `SICK_DEATH`, `CONTACT_K`, and possibly `RES_COST` in `js/sim/disease.js` and `js/sim/animals.js`. Target: disease causes 5-10% of animal deaths, and average resistance in the most-infected species rises over 3000 ticks instead of falling.
2. **Locust swarms.** These were planned in Part 3 and have never been seen in a run. Either the swarm trigger in `js/sim/bugs.js` never fires or its threshold is out of reach. Target: at least one swarm per 3000 ticks on seed 42.
3. **Disease emergence tied to Migrations.** New strains only appear while `#optDisease` and Migrations are both on. Decide whether emergence should depend only on the Disease switch.

## UI polish

4. **Dense swarm dots.** Heavy bug swarms clutter the map. Cap or merge dots when zoomed out.
5. **Tab overflow.** The six tabs overflow by 0-1px once every count reaches 3 digits. Shorten large counts (for example "1.2k") or tighten spacing.

## Possible new features

6. **Family tree view.** An interactive tree of species descent (parent to children) across plants, animals, bugs and strains.
7. **Save and load.** Export and import a world's full state to a file, so long runs survive a page reload.
8. **Climate drift and disasters.** Slow long-term warming or cooling, plus occasional drought, flood or fire events that reshape biomes.
9. **Group behaviour.** Herding and schooling for prey, pack hunting for predators, and seasonal migration routes.
10. **Data export.** Download population and trait history as CSV for outside analysis.

## Suggested order

Items 1-3 together as a small tuning pass, then 4-5 as a UI pass, then pick one feature from 6-10 as the next roadmap part.
