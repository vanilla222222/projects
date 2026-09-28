# Audit — C-branch achievements, FINAL dispatch

Scope: boss-specific superboss achievements for the 4 new C-branch superbosses (Part A) +
branch-level exploration/completion milestones (Part B).

## Files changed

- `js/achievements.js`
  - `ensureUnlockShape`'s `statDefaults`: two new counters (`cBranchFloorsVisited`,
    `cBranchRunsCompleted`) with a comment describing their bump sites.
  - New section "THE DROWNED PATH — C-branch exploration + completion", inserted after the
    `Stars` block (`star_sirius`) and before the lookup-index block: 8 new achievements.
- `js/game.js`
  - `startFloor()`: one `bumpStat('cBranchFloorsVisited', 1, this)` inside the existing
    `if (this.floorPath === 'C')` block.
  - `descend()`: one `bumpStat('cBranchRunsCompleted', 1, this)` inside the existing
    `if (this.dungeon.floorNum >= C_LAST_FLOORNUM)` win branch (the `{ ... }` block was
    expanded from a one-liner to a braced block; no control flow changed).

Nothing else was touched. `js/enemies.js`, `SUPERBOSSES`, the `sb_*` grid, `SUPERBOSS_REWARDS`,
the 264 enemies' Slayer entries, `room.js`/`dungeon.js`/`stages.js`/`ai.js` and the
floorPath/descend/startFloor control flow are all unmodified.

## Part A — superboss-specific achievements: SKIPPED (deliberately)

**Finding: the existing 11 superbosses have ZERO raw-kill-count achievement of their own.**
This is not a gap — it is an explicit, documented design decision in the codebase. Evidence:

1. The `'Superbosses'` category is **not** a 1-entry category. It is the `sb_<boss>_<class>`
   grid and nothing else — 300 entries (15 superbosses x 20 classes), all minted by the single
   `for (const bossId in SUPERBOSSES)` loop at `js/achievements.js:312`. The earlier
   "1 achievement in Superbosses" note in this session's scouting was simply wrong; a live count
   (below) confirms 300. There is no hand-written flat achievement anywhere in that category.
2. The Slayer category's own header comment (`js/achievements.js:719-720`) says it verbatim:
   *"Superbosses are deliberately absent: the sb_<boss>_<class> family plus the
   Superbosses/Completionist categories already cover all 11."* The `slayer_boss_*` family
   (`slayer_boss_bonecaller` etc., threshold 5, `bestiarySection:'enemyKills'`) covers
   `BOSS_TYPES` bosses ONLY — every id in it is a regular boss, never a superboss.
3. `unlocks.superbossDefeats` (written in `js/game.js:390-393`) exists, but no achievement reads
   it. Its only consumers are two hardcoded gameplay unlocks (Polish -> the Inferno,
   Tyrone x3 -> the 9A/9B fork) and the `ui.js:613` stats readout.
4. The only per-superboss flat achievements that exist at all are five **character unlocks**
   (`unlock_hypogriff`/`unlock_griffin`/`unlock_kirin`/`unlock_dragon`/`unlock_dnbpony`) — they
   cover 5 of 11 bosses, their reward is a class, and their purpose is gating a character, not
   recognising a kill. That is not a pattern to extend: the C-branch adds no characters, and
   minting class-less imitations of them would invent a shape the file does not have.

Per the dispatch's instruction ("if the existing 11 have ZERO such achievement... do not invent
an inconsistent new pattern for just these 4"), Part A was skipped entirely. Drenched DNB,
Brazil DNB, Israel DNB Prime and Kirk DNB are recognised exactly the way the other 11 superbosses
are: through their 20 `sb_<boss>_<class>` entries each (80 of the 300), plus their contribution
to every class's `completionist_<class>` (which keys off `Object.keys(SUPERBOSSES)` and therefore
already requires all four). Kirk additionally now has `cbranch_complete` from Part B, which is a
run-completion flag rather than a boss-kill count.

## Part B — branch-level exploration / completion

### New stats (both Predicate A, both pre-declared in `statDefaults`)

| stat | bump call site | max per run |
|---|---|---|
| `cBranchFloorsVisited` | `js/game.js` `startFloor()`, first line of the `if (this.floorPath === 'C')` block | 8 (3C..10C) |
| `cBranchRunsCompleted` | `js/game.js` `descend()`, inside `if (this.dungeon.floorNum >= C_LAST_FLOORNUM)`, immediately before `this.state = 'win'` | 1 |

Guard reasoning, traced by hand:

- **Floors.** The room-visit stats (`curseRoomsVisited` et al.) guard with `firstVisit` because
  `enterRoom` runs on every re-entry. `startFloor` is different — it is called exactly once per
  floor per run (from `startRun`, from `descend`'s branch handoffs, and from `descend`'s
  `startFloor(this.dungeon.floorNum + 1)` line, which only ever moves floorNum forward and has no
  path back up). Walking back into a cleared room calls `enterRoom`, never `startFloor`, so the
  counter cannot double-fire; no extra flag is needed and none was added. A full C run bumps it
  8 times (floorNum 2..9 = 3C..10C), a run that enters the branch and dies on 3C bumps it once.
- **Completion.** The `floorNum >= C_LAST_FLOORNUM` branch is reached only by standing on 10C's
  stairs, which only exist because Kirk DNB is dead (`onBossDefeated` grants `node.stairsSpot`).
  The very next statement sets `state = 'win'`, and `Game.update()` returns immediately unless
  `state === 'playing'`, so `checkStairs`/`descend` can never run again in that run — exactly one
  bump. It fires nowhere near any other boss defeat, so subsequent/previous superboss kills on the
  branch (Drenched/Brazil/Israel Prime) do not touch it. The bump is placed *before*
  `endRunUnlocks()` so any achievement it unlocks still toasts against a live run snapshot.

### New achievements (8)

| id | name | category | predicate |
|---|---|---|---|
| `cbranch_entered` | Down the Storm Drain | Exploration | `cBranchFloorsVisited` >= 1 |
| `exploration_cbranchfloors_t1/_t2/_t3` | Drowned Pathfinder I/II/III | Exploration | `cBranchFloorsVisited` >= 8 / 40 / 160 |
| `cbranch_complete` | Silence at the Source | Challenge | `cBranchRunsCompleted` >= 1 |
| `challenge_cbranchwins_t1/_t2/_t3` | Drowned Path Champion I/II/III | Challenge | `cBranchRunsCompleted` >= 3 / 10 / 25 |

- The ladders use `addTierSet` (ids mint as `<baseId>_t1..`), mirroring `exploration_starrooms`
  exactly — same helper, same `Exploration` category, same statKey shape.
- The flat "first entry" achievement is threshold-1 on the same key rather than a third stat: the
  first C floor entered *is* entering the branch, so a separate counter would carry no extra
  information. Threshold-1 single-fire is an established shape in this file (`firstwin`,
  `unlock_windigo`-style rungs).
- Floor thresholds 8 / 40 / 160 = one full traversal, five, twenty. Win thresholds 3 / 10 / 25 are
  anchored on the existing `wins` rungs (1 / 3 / 5) per the file's stated rule: tier 1 at the
  lowest existing rung, tier 3 clearly past everything already on a win counter.

### Rewards: none (flavor-only), deliberately

Section 8b of `achievements.js` documents why, and it still holds: every locked
item/trinket/familiar/star id in `data.js` is already claimed either by the Superbosses reward pool
(whose `_rewardIndex` assertion requires the pool length to equal 300 exactly) or by another
achievement, and the last unclaimed `shopDiscount` kind (`'star'`) was consumed by the Star Room
ladder. Granting any of them twice would be a duplicate unlock for no gain. Minting brand-new
reward items in `data.js` (as the Slayer batches did with `slayertrophy_*`) was not done — it was
optional per the dispatch and would have meant editing `data.js` for eight entries. The
`SUPERBOSS_REWARDS` pool was not read from, indexed into, or touched.

## Verification performed

- `node --check` on **every** file in `js/` — all pass.
- Every new statKey grepped across `js/`: `cBranchFloorsVisited` appears in the `statDefaults`
  declaration, the `startFloor` bump, and 2 achievement defs; `cBranchRunsCompleted` in the
  declaration, the `descend` bump, and 2 achievement defs. Identical spelling at every reference
  (case included).
- Duplicate-id sweep: `grep -o "id:'...'" | sort | uniq -d` over the whole file returns nothing,
  and a runtime check of every `def.id` in `ACHIEVEMENTS` (which includes the loop- and
  tierSet-generated ids) reports zero duplicates.
- No reward ids assigned, so nothing to double-claim.
- Runtime load in a Node `vm` sandbox (stub `document`/`window`/`localStorage`/`Sound`/`toast`,
  loading `utils.js` -> `data.js` -> `enemies.js` -> `achievements.js`): no warnings from the
  `_rewardIndex !== SUPERBOSS_REWARDS.length` assertion, i.e. the 300-entry grid is still exactly
  balanced.

## Grand total

**`ACHIEVEMENTS.length` = 1698** (1690 before this dispatch, +8).

By category: Characters 18, Superbosses 300, Completionist 20, Slayer 1046, Mastery 45,
Exploration 46, Collection 14, Challenge 16, Donations 20, Stars 25, Miscellaneous 148.

## Deviations

1. **Part A skipped**, with the reasoning above — the dispatch explicitly sanctioned this outcome
   if no per-superboss flat pattern existed, and none does.
2. `descend()`'s C-branch win one-liner was reformatted into a braced block to hold the new bump.
   The statements and their order are otherwise unchanged.
3. `cbranch_complete` / `challenge_cbranchwins_*` landed in `Challenge` rather than `Exploration`:
   the branch *floor* achievements are exploration, but a run completion is a feat, and `Challenge`
   is where the other run-completion feats (`challenge_flawless_run`, the speedruns,
   `challenge_wins_*`) already live. Both categories are already in
   `ACHIEVEMENT_CATEGORY_ORDER`, so no panel change was needed.
