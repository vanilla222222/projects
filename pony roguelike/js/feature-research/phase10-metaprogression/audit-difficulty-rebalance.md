# Audit — Stage-based difficulty rebalance

Goal: "rebalance every stage except the first few to be harder so the skill tree becomes
imperative." Stages 0-1 (Crypt, Forest — floors 0-3) must be **bit-for-bit unchanged**; every
stage from index 2 on gets progressively harder relative to its own current baseline.

## Files changed

| File | Change |
|---|---|
| `js/data/enemies/growth.js` | **New** stage-keyed multiplier layer: `STAGE_DIFFICULTY_HP`, `STAGE_AGGRESSION_SHARE`, `STAGE_DAMAGE_SHARE`, `stageDifficultyMult()`, `stageAggressionMult()`, `stageDamageMult()`, `stageTunedType()`. Nothing existing was modified — the four pre-existing curves (`enemyHpScale`, `bossHpScale`, `bossDmgScale`, `explosionDamage`/`statusTickDamage`) are untouched. |
| `js/entities/entities.js` | `Enemy` constructor: retunes its `type` through `stageTunedType`, folds `stageMult` into `hp`, `stageDamageMult` into `dmg`, `stageAggro` into `speed`. `Boss` constructor: folds `stageDifficultyMult` into the boss `hp` product. |
| `js/CODE_REFERENCE.md` | New "Stage difficulty multiplier (Phase 10 rebalance)" subsection under growth.js; updated the `Enemy`/`Boss` constructor descriptions. |

Explicitly **not** touched: any enemy/boss/superboss data table, any `ai-*.js` file, skill tree
files, item files, Phase 10 stage-content files, `main.js`.

## The curve

Keyed by `stages.js`'s `stageIndexForFloor(floorNum)`:

| stage | content | floors | HP mult | speed / cooldown mult | trash dmg mult |
|---|---|---|---|---|---|
| 0 | Crypt | 0-1 | **1.00** | 1.000 | 1.00 |
| 1 | Forest | 2-3 | **1.00** | 1.000 | 1.00 |
| 2 | Desert | 4-5 | 1.18 | 1.063 | 1.09 |
| 3 | Inferno + all branch floors (the clamp) | 6-14 | 1.30 | 1.105 | 1.15 |
| 4 | Phase 10 | 15-16 | 1.34 | 1.119 | 1.17 |
| 6 | Phase 10 | 19-20 | 1.42 | 1.147 | 1.21 |
| 11 | Phase 10 | 29-30 | 1.62 | 1.217 | 1.31 |
| 13 | Phase 10 (final) | 33-34 | 1.70 | 1.245 | 1.35 |

Stages 4-13 interpolate linearly at **+0.04 per stage**.

**Reasoning for the shape.** The legacy stages 2-3 take the real step (1.00 → 1.18 → 1.30):
they were authored against a much shorter run and are where the "too easy" complaint actually
bites. Stage 3 is also the widest band by far — `stageIndexForFloor` clamps floors 6 through 14
to it, so every branch floor (8-14) inherits the 1.30. The Phase 10 stages get only +4%/stage
because their authored stats already escalate steeply *and* ride `enemyHpScale`/`bossHpScale`
(~1.20^30 and ~1.36^30 that deep); a 1.5x on top of an already-extreme number is slapstick, not
difficulty. The gentle slope still keeps the "later is harder relative to its own baseline"
promise — floor 34 is +70% over its current baseline versus floor 4's +18%.

**What it scales, and why not `dmg`.** HP takes the full multiplier. Speed and every `*Cooldown`
tuning field take a 35% share (`STAGE_AGGRESSION_SHARE`) — aggression is far more punishing per
point than HP. Trash `dmg` takes a 50% share. **Boss `dmg` is deliberately excluded**:
`combat-1.js`'s `playerDamageAmount` hard-caps any single hit at 4 hearts, and `bossDmgScale`
(1.06^floor) alone is already far past that cap by the Inferno — a floor-30 boss authored at 4
half-hearts computes ~23 half-hearts and is capped down to 8. Every point added there is
discarded, so the levers are HP, speed, and fire rate, exactly as scoped.

**The cooldown mechanism.** The `ai-*.js` functions read cooldown tunings straight off the shared
type object (`e.fireTimer = t.fireCooldown || 1.5`, in a few hundred places), not off the
instance. Rather than edit hundreds of AI call sites, `stageTunedType()` hands the spawned entity
a shallow **copy** of its type with numeric `*Cooldown` keys divided by the aggression multiplier.
Every other key comes across untouched. Verified by grep that nothing in the codebase compares
enemy type objects by identity (the `x.type ===` hits are all room/node/item types, never enemy
types). `contactCooldown` is included and is a real effect: `combat-3.js`'s `updateEnemy` re-arms
from `e.type.contactCooldown`, so contact re-hit rate speeds up on affected stages too.

## Worked examples (computed against the real tables, not by hand)

Verified by loading `stages.js` + `growth.js` + every enemy/boss table into a Node `vm` context
and evaluating the actual functions. Sample = the 70th-percentile-HP enemy of that stage's real
pool. "Before" = `round(hp * enemyHpScale(floor))`; "after" = the same times `stageDifficultyMult`.

| floor | stage | sample enemy | HP before | HP after | delta |
|---|---|---|---|---|---|
| 0 | 0 | DNB Gravedigger (hp 5) | 5 | 5 | **0.0%** |
| 1 | 0 | DNB Gravedigger (hp 5) | 6 | 6 | **0.0%** |
| **2** | **1** | DNB Thistle Pod (hp 5) | 7 | 7 | **0.0%** |
| 3 | 1 | DNB Thistle Pod (hp 5) | 9 | 9 | **0.0%** |
| **4** | **2** | DNB Dune Diver (hp 5) | 10 | 12 | +20.0% |
| 5 | 2 | DNB Dune Diver (hp 5) | 12 | 15 | +25.0% |
| 6 | 3 | DNB Magma Delver (hp 6) | 18 | 23 | +27.8% |
| 8 | 3 | DNB Magma Delver (hp 6) | 26 | 34 | +30.8% |
| **10** | **3** | DNB Magma Delver (hp 6) | 37 | 48 | +29.7% |
| 14 | 3 | DNB Magma Delver (hp 6) | 77 | 100 | +29.9% |
| 15 | 4 | DNB Thawling (hp 6) | 92 | 124 | +34.8% |
| 20 | 6 | DNB Beachcomber (hp 8) | 307 | 436 | +42.0% |
| **30** | **11** | DNB Brood (hp 30) | 7 359* | 11 921* | +62.0% |
| 34 | 13 | DNB Zenith (hp 39) | 19 197 | 32 634 | +70.0% |

\* the deltas that are not exactly the table multiplier (e.g. floor 4's +20% vs 1.18, floor 5's
+25%) are integer-rounding noise on small HP values — `Math.round` on 10.4 vs 12.3. They converge
on the multiplier as HP grows.

Bosses, same method (`bossHpScale` path, real boss entry):

| floor | stage | boss | HP before | HP after | delta |
|---|---|---|---|---|---|
| 2 | 1 | The Mausoleum Titan (hp 50) | 92 | 92 | **0.0%** |
| 4 | 2 | The Mausoleum Titan (hp 50) | 171 | 202 | +18.1% |
| 6 | 3 | The Mausoleum Titan (hp 50) | 316 | 411 | +30.1% |
| 10 | 3 | The Mausoleum Titan (hp 50) | 1 082 | 1 407 | +30.0% |
| 30 | 11 | The Mausoleum Titan (hp 50) | 507 151 | 821 585 | +62.0% |

Bosses track trash exactly, as required.

Cooldown retune spot-check (`fireCooldown: 1.6`, `summonCooldown: 6`, plus a decoy lowercase
`cooldown: 9` that must NOT be touched):

| floor | returns original object? | fireCooldown | summonCooldown | `cooldown` | key count |
|---|---|---|---|---|---|
| 2 | **yes (by reference)** | 1.600 | 6.000 | 9 | 8 (unchanged) |
| 4 | no (copy) | 1.505 | 5.644 | 9 | 8 |
| 10 | no (copy) | 1.448 | 5.430 | 9 | 8 |
| 30 | no (copy) | 1.315 | 4.930 | 9 | 8 |

## Early-game no-regression check

Automated assertion over floors 0-3: `stageDifficultyMult`, `stageAggressionMult` and
`stageDamageMult` all return exactly `1`, and `stageTunedType` returns the **original type object
by reference** (`===`). Result: **PASS**. Because all three factors are the literal number `1`,
the `hp`/`dmg`/`speed` expressions are float-identical to their pre-change forms, and no clone is
allocated — floors 0-3 cannot drift by even a rounding bit.

## Verification performed

- `node --check` on `js/data/enemies/growth.js` and `js/entities/entities.js` — both clean.
- Real-table numeric trace above (Node `vm` harness, not hand arithmetic).
- Full re-read of the diff.
- Grep confirmed `type.speed` is read in exactly one place (the `Enemy` constructor), so scaling
  `this.speed` there covers every movement path.
- Grep confirmed no enemy-type identity comparisons anywhere, so the type clone is safe.

Not done (per the project's standing "no heavy smoke testing" note): no in-game playthrough. The
user verifies by playing.

## Deviations from the brief

1. **The brief suggested "+15-20% HP by stage 2, noticeably more later".** Delivered 18% at
   stage 2 and 30% at stage 3, then a gentler +4%/stage through the new content. The brief
   explicitly authorised "a gentler multiplier for stage index 4+ than for stage 2-3… your call";
   this takes that option, reasoning above.
2. **Boss `dmg` gets no stage factor at all**, where the brief said "a small dmg increase is
   fine". Excluded because it is provably wasted against the 4-heart cap (numbers above). Trash
   `dmg` *does* get a 50% share, since trash damage is still comfortably under the cap and is
   where a nudge actually lands.
3. **The change is not confined to `growth.js`.** Four lines in `entities.js` were necessary,
   because that file is the only place authored `hp`/`speed` become live numbers. This matches
   the brief's "any minimal necessary call-site changes".

## Open risks

- **Hard-mode stacking.** `difficultyStatMult()` (hard = 1.5) multiplies with the stage layer,
  so a hard-mode floor-34 enemy is now `1.5 × 1.70 = 2.55x` the authored baseline instead of
  1.5x. That is the intended composition (the brief asked for the two to stack "sensibly", not
  for hard mode to be exempted), but hard mode is where this rebalance will bite hardest and is
  the most likely thing to need a follow-up trim. The single knob to turn is
  `STAGE_DIFFICULTY_HP` — no data files involved.
- **New stages on top of already-hard authored stats.** Floors 29-34 were already tuned to sit
  on `enemyHpScale`/`bossHpScale` at ~1.20^30 / ~1.36^30. The +62-70% here is applied on top of
  numbers that were authored *knowing* those curves. This was the deliberate call (the user asked
  for the whole back half of the game, not just legacy content) and the multiplier was kept
  gentle there for exactly this reason, but if the final stages read as unfair rather than hard,
  the fix is to flatten the stage 4-13 tail of `STAGE_DIFFICULTY_HP` — the legacy 1.18/1.30 steps
  can stay untouched.
- **Room enemy COUNT is a separate, untouched budget.** `room.js` scales spawn counts (2 → 8 per
  run) independently. The HP multiplier compounds with that count budget, so effective per-room
  HP rises slightly faster than the per-enemy table suggests. Deliberately left alone — density
  was not in scope, and it is the next lever if this pass proves insufficient.
- **`stageIndexForFloor` cannot distinguish branches.** The C-branch reuses floorNums 2-9, so a
  `3C` room (floorNum 2) resolves to stage 1 and is therefore **unaffected**, while `5C`+ lands
  in the affected range. That is consistent with the "floors 0-3 unchanged" constraint as
  written, but it means the very start of the C-branch is the one late-ish piece of content this
  pass does not touch. Fixing it would require threading `floorPath` into the multiplier, which
  is a larger change than the brief scoped.
- **Per-spawn allocation.** `stageTunedType` allocates one shallow object per enemy spawn on
  stages 2+. A room spawns at most a couple dozen enemies, and the objects are small and
  short-lived, so this is negligible — but it is a new allocation that did not exist before, and
  it is worth knowing about if GC hitching is ever investigated.
