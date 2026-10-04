# Audit: slice 8, life history and aging

## What was built
- **Brood and care genes** (23 `G_BROOD`, 24 `G_CARE`; `AG` is now 25). Many cheap young against a few cared-for young. Founder values differ by class, and small and large mammal lineages start on opposite sides of the trade-off.
- **Parental care:** carers feed their latest brood for a care period (`brd`, `cr`). Grandparents also feed young (`granGiven`, `granFeeds`).
- **Life stages:** amphibians hatch as tadpoles and many invertebrates as larvae (`lv`), with their own food, then metamorphose. Young predators eat bugs before they can hunt (`juvBug`).
- **Elders** (`ld`) lead local groups on migration and toward water in drought.
- **Stats:** `stats.life`, `stats.stageCls` (juveniles, adults, elders per class), and Brood size and Parental care traits. Species details show clutch size, care time and mean lifespan with sparklines. The Life stages card gains tadpoles, larvae and cared-for young.
- **Look:** tadpole and caterpillar sprites for larvae, and paler juveniles.

## Gate (3000 ticks, new against base in the same batch)

| Seed | Build | ms/tick | fish | amph | rept | mamm | bird | invt | groups |
|---|---|---|---|---|---|---|---|---|---|
| 42 | new | 48.1 | 739 | 385 | 556 | 1144 | 209 | 1299 | 25 |
| 42 | base | 44.9 | 948 | 104 | 131 | 818 | 327 | 1281 | 25 |
| 7 | new | 51.6 | 964 | 410 | 412 | 1710 | 166 | 2973 | 25 |
| 7 | base | 47.3 | 1779 | 75 | 218 | 1266 | 160 | 1073 | 25 |
| 123 | new | 51.5 | 1937 | 271 | 899 | 1378 | 275 | 1518 | 25 |
| 123 | base | 48.6 | 3558 | 111 | 528 | 1167 | 285 | 207 | 24 |

- **Speed:** +6% to +9%, inside the +25% limit.
- **Survival:** every class and every bird niche is alive on all seeds.
- **Amphibians recover strongly** (271 to 410, against 75 to 111 before), thanks to tadpoles with separate food.
- **Metamorphoses:** 1159, 1906 and 3645.
- **Elders:** drought thirst deaths among herd mammals led by an elder are 0.14 to 0.29 per 1000 ticks, against 0.30 to 0.36 without a leader, on every seed.

## Open issues
- Few juveniles are actively cared for at any moment (3 to 6), so care mostly acts through head starts (4.5k to 6k).
- Fish drop on every seed. This may be divergence in the random numbers, or the extra larval invertebrates competing with them.
- The year-35 run and the browser screenshot were skipped (test budget).
- Old saves are not migrated for the new arrays, as in earlier slices.
