# Progression calibration

The goal is roughly one hour in each **major gameplay stage**, rather than a compulsory wait. The game checks resources and preceding-system unlocks; it does not check playtime when unlocking a tab. Statistics and Achievements are utility tabs. The Sawmill is the current final stage, feeding back into earlier systems and the Workshop rather than leading to another timed unlock.

## Reference estimate

Using the actual game formulas and an expected-yield economy model, two active mining/chopping actions per second, seed 42:

| Stage being developed | Next tab | Minutes in stage | Cumulative minutes |
| --- | --- | ---: | ---: |
| Mines | Mastery | 57.3 | 57.3 |
| Mastery | Rebirth | 61.2 | 118.4 |
| Rebirth | Smeltery | 58.6 | 177.0 |
| Smeltery | Workshop | 54.8 | 231.8 |
| Workshop | Forest | 55.3 | 287.1 |
| Forest | Sawmill | 57.4 | 344.5 |

The same strategy at one action/second gives stages of about 55–73 minutes; at three actions/second, about 49–55 minutes. At two actions/second, tested Forest seeds 7, 42 and 99 place the Forest stage around 57 minutes. Full results are in `balance-results.json`.

## Strategy and model

`balance-sim.cjs` loads the real price, production, purchase, research and tree routines through `model-harness.cjs`. It estimates ore income from weighted expected ore visits plus Chest rewards and an approximate 7.5% Vein bonus. Manual pick coverage is discounted 20% for edges and overlap. Automated mining runs at its actual bulk and interval. TNT spillover is not explicitly simulated.

Every five seconds the reference strategy buys basic upgrades and mastery when one level costs at most 15% of the relevant balance, and mining automation/pick upgrades at 25%. It buys one-time unlocks when affordable, takes one immediate first rebirth, distributes its points across the initially available ores, rotates smelter recipes every minute, and develops available industry upgrades. Workshop research uses a 15% spending reserve. In Forest it prioritizes low-HP trees, upgrades damage and production, and burns a tree every 30 seconds while Charcoal is below 100 to feed Steel.

These are **model estimates, not measured playtest durations or guarantees**. Player choices, clicks, idling, ore variance, special-tile chains, smelter allocation, spending reserves and repeated rebirth strategy all change timings. The estimate assumes active progression and omits offline sessions. The simulator and regression window make future balancing reproducible; live phone playtesting remains necessary.

## Progression value of added content

- Workshop connects smelting and forestry materials to permanent improvements across existing systems.
- Steel makes Charcoal useful before the Sawmill, offers an optional active-forestry improvement, and later improves cutting and mining. Its feedstock competes with plank production, giving the player a production choice.
- Damage-based tree pools reduce extreme early Forest stalls while preserving later species as damage milestones.

Run `node "vanilla incremental/balance-sim.cjs"` for a logged reference run. `game.test.cjs` also checks that the six reference stages remain within a broad 45–80-minute regression window. That window is intentionally wider than the target so minor tuning does not imply minute-level accuracy.
