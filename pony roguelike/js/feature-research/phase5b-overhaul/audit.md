# Phase 5b overhaul — audit

Covers Part A (finishing Phase 5a's documentation, verified against live code)
and Part B (the meta-progression / achievement sweep).

## Files changed

**Part A (docs, + one bug found and fixed along the way):**
- `js/CODE_REFERENCE.md` — new "Phase 5a overhaul" section (4 classes, fire-ring/
  minion/turret mechanics, the 60-trinket superboss backfill, the 2 orchestrator
  fixes, plus a 3rd fix found during this pass — see below); `CLASSES` header
  paragraph updated from "16 total" to "25 total"; stale "one of 300" superboss
  count corrected to 375.
- `js/main.js` — **bug fix**: added the missing `input.build` key binding
  (`KeyV`, held) and `build:false` to the `input` object initializer. Also
  updated in this file's context: nothing else (see below).
- `index.html` — both `<p class="hint">` control-hint strings updated to
  mention "Build Turret (hold): V".

**Part B (code + achievement defs + docs):**
- `js/achievements/logic.js` — 4 new `statDefaults` entries
  (`ecosystemSetActivations`, `arcadeFilliesFed`, `arcadeMachinesUsed`,
  `arcadeFillyCapstonesReached`); `recordWin` gained a `challenge_frugal_run`
  bespoke-trigger check.
- `js/achievements/defs-6.js` — 14 new `addAchievement`/`addTierSet` calls
  (16 achievement entries) appended just before the lookup-index build.
- `js/entities/entities.js` — `Player` constructor gained
  `this.visitedShopThisRun = false` and `this._ecosystemSetSeen = false`.
- `js/systems/items-1.js` — `recalcPlayerStats` bumps `ecosystemSetActivations`
  once per run the first time `ecosystemSetActive` is seen true.
- `js/systems/shop.js` — `feedArcadeFilly` bumps `arcadeFilliesFed` at all 5
  successful-feed sites and `arcadeFillyCapstonesReached` at all 4 capstone
  sites (coin/bomb/key/heart — battery has no capstone); `useArcadeMachine`
  bumps `arcadeMachinesUsed` at all 3 successful-use sites.
- `js/game.js` — `enterRoom`'s shop first-visit branch now also sets
  `this.player.visitedShopThisRun = true`.
- `js/CODE_REFERENCE.md` — new "Phase 5b overhaul" subsection under
  achievements/defs, documenting every new achievement/stat and the
  reward-economy discovery (see below); a flagged-but-not-fixed staleness
  note about `challenge_wins_allclasses`'s "20 classes" text.

## Part A summary

Read the live code (not any prior draft) for all of Phase 5a:
`js/data/core.js` CLASSES entries for `changedling`/`changelingqueen`/`filly`/
`engineerpony`; `js/systems/combat-1.js`'s `updateFireRingAttack`/
`updateChangelingSummons`/`updateTurretBuild`/`updatePlayerTurrets`;
`js/entities/entities.js`'s new Player fields; `js/systems/combat-3.js`'s
`isPlayerBolt && pr.attackTrigger` generic dispatch (confirmed this is the
exact mechanism the turret's `attackTrigger:'turret'` tag rides for free);
`js/achievements/defs-1.js`'s corrected `unlock_changedling`/
`unlock_changelingqueen`/`unlock_filly`/`unlock_engineerpony` (now
`enemiesKilled>=400`/`familiarsCollected>=40`/`enemiesCharmed>=60`/
`bombsPlaced>=150`, all universal stats, with the explanatory comment about
the circular first draft read and summarized); `js/game.js`'s
`transitionThroughDoor` turret-clear fix; `js/data/trinkets-2.js`'s 60-trinket
Phase 5a batch (verified `SUPERBOSS_REWARDS.length === 375` independently at
runtime, not just by arithmetic — see Verification below).

**Bug found and fixed during this pass** (not one of the orchestrator's two,
but the same class of defect): `combat-1.js`'s `updateTurretBuild` reads
`input.build`, and every comment pointing at it said "see main.js's
`input.build`" — but `main.js`'s `input` object never declared a `build`
field and neither the `keydown` nor `keyup` listener ever set one. Every
other held-input field (`up`/`down`/`left`/`right`/`attack`) has a real key;
`build` had none, so `input.build` was permanently `undefined`, and Engineer
Pony could never build a turret under any circumstance — the same
"gated on something nothing produces" bug shape as the achievement bug the
orchestrator fixed in Part A, just in the input layer instead of the
achievement layer. Fixed by binding `KeyV` (nearest unused letter key — every
other single letter A/B/C/D/E/F/G/H/M/Q/R/S/T/W plus Space was already
taken), held not one-shot, matching `attack`'s shape. Documented in
CODE_REFERENCE.md and in the in-page control hints.

## Part B — new achievements/stats, with reachability traces

**Reward-economy discovery** (drove the whole batch's shape): before writing
this batch, a full audit of every reward field across all ~1816 achievements
— including the `sb_<boss>_<class>` superboss grid's programmatic grants via
`NEW_CLASS_REWARD_ITEMS`/`_FAMILIARS`/`_STARS` and the `TRINKET_LIST` filter,
which don't appear as literal `itemId:'...'` text and so are invisible to a
naive grep — found only **18 never-claimed reward ids in the entire game**:
1 locked item (`frostflask`) and 17 locked familiars. Every locked trinket,
pill color, enemy, star, and `shopDiscount` kind was already spoken for. That
headroom, not the "roughly 12-18" sizing suggestion, is what capped this
batch: one real 3-tier ladder (spending 3 ids) and 13 single-tier
achievements (13 more) = 16 ids spent, 2 left (`broodmite`/`sporemother`).
An early draft of this batch (before this audit step) had accidentally
reused ~19 already-claimed ids (13 items + 6 familiars) by mistake — caught
and corrected before landing; see Verification below for the duplicate-grant
sweep proving zero collisions in the final version.

1. **`mastery_vulnerable`** (`addTierSet`, 3 tiers: 100/250/500, category
   Mastery, rewards `runiccup`/`wardpuff`/`frostflask`) — watches the
   pre-existing `enemiesMarkedVulnerable` stat past Gargoyle's own
   `unlock_gargoyle` (threshold 50).
   *Reachability*: the stat is already bumped generically from
   `applyOnHitStatuses`/the `markedForDeath` attack-layer style on ANY
   vulnerable-chance source (Gargoyle's innate chance, or items like
   Hunter's Mark/Quarry Sigil/Warden's Eye) — reachable by any class with
   enough playtime, no new call site added.
2. **`synergy_ecosystem`** (`addAchievement`, threshold 1, category
   Mastery, reward `bulwarkmoth`) — NEW stat `ecosystemSetActivations`.
   *Reachability*: bumped in `items-1.js`'s `recalcPlayerStats`, guarded by
   `player._ecosystemSetSeen`, the moment `ecosystemSetActive` (Synergy A —
   one item each from the markedForDeath/venomBloom/skyfall families, all
   ordinary `POOLS_ALL` items) is computed true. Reachable by any class in
   an ordinary run that collects the right 3 items; not gated on anything
   class-specific.
3. **`slayer_boss_eclipsewraith`** (`addAchievement`, threshold 5, category
   Slayer, reward `pocketimp`) — Predicate B,
   `bestiarySection:'enemyKills'`, `bestiaryId:'eclipsewraith'`.
   *Reachability*: bosses route through the same `handleEnemyDeath` →
   `bumpBestiaryCount('enemyKills', enemy.type.id, 1)` call regular enemies
   do (verified in `combat-2.js`, line ~522). Reachable by any class that
   can reach Floor 5C and win the fight, repeated 5 times across runs.
4. **`slayer_boss_ironbastion`** — identical shape/reward-slot logic,
   reward `huntgrub`. Same reachability trace as #3.
5. **`slayer_gutterskirmisher`** (`addAchievement`, threshold 20, category
   Slayer, reward `feastwyrm`) — Predicate B, `bestiaryId:'gutterskirmisher'`.
   One representative achievement for Phase 2's new `skirmisher` behavior
   family rather than one per new id (10 skirmisher/whiplash ids exist
   across Phases 1-2's floors) — the pre-existing distinct-breadth ladder
   `exploration_fieldguide` (`bestiarySection:'enemyKills', distinct:true`)
   already rewards discovering/killing every new id at least once for free.
   *Reachability*: same `handleEnemyDeath` → `bumpBestiaryCount` path;
   Gutter Skirmisher spawns on 4C, reachable by any class that walks the
   drowned path.
6. **`exploration_destroy_thornbush`** (`addAchievement`, threshold 15,
   category Exploration, reward `tallystone`) — Predicate B,
   `bestiarySection:'objectsDestroyed'`, `bestiaryId:'thornbush'`.
   *Reachability*: Thorn Bush is `attackable:false, destructible:true` —
   only a bomb blast clears it, routing through the existing
   `bumpBestiaryCount('objectsDestroyed', ob.kind, 1)` call already present
   in `combat-1.js`/`combat-3.js`'s bomb-explosion code. Reachable by any
   class with bombs (everyone starts with `startBombs:1` and can pick up
   more).
7. **`exploration_destroy_luckcrystal`** — same shape, reward `gildedring`.
   Luck Crystal is `destructible:true` (attackable by melee/ranged too, not
   bomb-only) — same `bumpBestiaryCount` call, reachable even more easily
   than thornbush.
8. **`arcade_fillies_fed`** (`addAchievement`, threshold 75, category
   Miscellaneous, reward `twinflame`) — NEW stat `arcadeFilliesFed`.
   *Reachability*: bumped at all 5 successful-feed sites in
   `shop.js`'s `feedArcadeFilly` (`js/systems/shop.js`, inside each of the
   `coin`/`bomb`/`key`/`heart`/`battery` cases, right after
   `filly.fedCount++`). Reachable by any class — Arcade rooms/fillies carry
   no class restriction, and feeding any combination of the 5 filly kinds
   counts toward the same total.
9. **`arcade_machines_used`** (`addAchievement`, threshold 50, category
   Miscellaneous, reward `shadowtwin`) — NEW stat `arcadeMachinesUsed`.
   *Reachability*: bumped at all 3 successful-use sites in `shop.js`'s
   `useArcadeMachine` (`friendship`/`tools`/`dark` cases, right after the
   coin deduction). Reachable by any class with enough coins over enough
   runs.
10. **`arcade_filly_capstone`** (`addAchievement`, threshold 1, category
    Miscellaneous, reward `fetchhound`) — NEW stat
    `arcadeFillyCapstonesReached`.
    *Reachability*: bumped in `feedArcadeFilly` at all 4 capstone sites
    (coin filly `fedCount>=5`, bomb/key/heart fillies `fedCount>=4`, each
    guarded by `!filly.done` so it only fires once per filly) — battery has
    no capstone by design (`filly.done` is never set in that case), so it
    contributes to `arcadeFilliesFed` but not this stat. Reachable by any
    class that feeds one filly to its own completion once.
11. **`challenge_frugal_run`** (`addAchievement`, no `statKey` — bespoke
    trigger, category Challenge, reward `tidymole`) — NEW per-run flag
    `player.visitedShopThisRun`.
    *Reachability*: set `true` in `game.js`'s `enterRoom`, in the existing
    first-visit room-type dispatch, the same spot `shopRoomsVisited` is
    bumped. Checked once in `logic.js`'s `recordWin`
    (`if (!game.player.visitedShopThisRun) unlockAchievement(...)`), the
    same call site `onehearted`/`challenge_onehearted_flawless` use.
    Reachable by any class: a full main-path run can be completed without
    ever entering a Shop room (Shop is one of several optional special room
    types, never mandatory for reaching the stairs).
12. **`mastery_firering`** (`addAchievement`, threshold 1000, category
    Mastery, reward `ragefang`) — Phase 5a's pre-existing `fireRingHits`
    stat, previously watched by nothing.
    *Reachability*: only reachable while playing Changedling (her innate
    fire ring is the only thing that bumps `fireRingHits`, in
    `combat-1.js`'s `updateFireRingAttack`) — but Changedling herself is
    unlocked via the corrected universal `unlock_changedling`
    (`enemiesKilled>=400`, reachable by any class), so this is "unlock the
    class through ordinary play, then keep playing it," not circular. Same
    shape as the pre-existing Windigo/Kelpie/Breezie signature-attack
    ladders, which are equally class-gated.
13. **`mastery_changelingsummons`** — same shape/reasoning, watches
    `changelingMinionsSummoned` (bumped in `updateChangelingSummons` on
    every new minion spawn), reachable while playing Changeling Queen
    (unlocked via `unlock_changelingqueen`, `familiarsCollected>=40`,
    universal). Reward `bloodhalo`.
14. **`mastery_turretsbuilt`** — same shape, watches `turretsBuilt`
    (bumped in `updateTurretBuild` on every successful build — now actually
    reachable in play thanks to the `input.build`/`KeyV` fix above),
    reachable while playing Engineer Pony (unlocked via
    `unlock_engineerpony`, `bombsPlaced>=150`, universal). Reward
    `scarabofwoe`.

## `node --check` results

Full sweep, every file under `js/`:
```
for f in $(find js -name "*.js"); do node --check "$f" || echo FAIL: $f; done
```
Result: **zero failures** (re-run after every edit round, including the
`main.js` `input.build` fix).

## Load/exercise test

Built a Node `vm` harness (`/tmp/.../scratchpad/load_test.js`) that loads
every file in `index.html`'s real `<script>` order EXCEPT `js/ui/ui.js`,
`js/ui/render.js`, and `js/main.js` (per instructions), with two 2-line
`loadUnlocks`/`saveUnlocks` stubs copied verbatim from `main.js` (pure
localStorage wrappers, no UI dependency) and a no-op `toast` stub standing
in for `ui/ui.js`'s real one, plus a minimal fake `game = {toast(){},
player:{}}`. Result: **all files load with zero errors**, and all 23
exercise checks pass:
- Every new stat (`ecosystemSetActivations`, `arcadeFilliesFed`,
  `arcadeMachinesUsed`, `arcadeFillyCapstonesReached`) unlocks its
  achievement at threshold via `bumpStat`.
- `mastery_vulnerable`'s 3 tiers all unlock at 500, and the pre-existing
  `unlock_gargoyle` (threshold 50, same stat) still fires too — confirms
  the new ladder didn't disturb the existing watcher.
- The 2 boss achievements and the 1 representative regular-enemy
  achievement unlock via `bumpBestiaryCount('enemyKills', ...)`.
- The 2 obstacle achievements unlock via
  `bumpBestiaryCount('objectsDestroyed', ...)`.
- The 3 "orphaned Phase 5a stat" achievements unlock via `bumpStat`.
- `challenge_frugal_run` unlocks via `recordWin` when
  `visitedShopThisRun` is false, and does NOT unlock when true (both
  branches exercised).
- All 4 of Part A's corrected class-unlock achievements
  (`unlock_changedling`/`unlock_changelingqueen`/`unlock_filly`/
  `unlock_engineerpony`) unlock at their documented thresholds — a
  regression check on Part A's fix, not just Part B.
- `SUPERBOSS_REWARDS.length === 375` (15 superbosses × 25 classes),
  confirmed at runtime via the live `SUPERBOSS_REWARDS` array, not just
  arithmetic.
- `Object.keys(CLASSES).length === 25`.

A separate duplicate-grant sweep (same harness, iterating every def in
`ACHIEVEMENTS_BY_ID` and checking every reward-field value for reuse) found
**zero new collisions** introduced by this batch. The only duplicate grant
anywhere in the game is `itemId:'championscrown'`, shared by design across
all 25 `completionist_<class>` achievements (pre-existing, not part of this
change).

## SUPERBOSS_REWARDS invariant (re-verified)

`SUPERBOSS_REWARDS` is NOT just the `TRINKET_LIST` filter — `defs-1.js`
concats `ACHIEVEMENT_PICKUP_KINDS` (7) + `NEW_CLASS_REWARD_ITEMS`/
`_FAMILIARS`/`_STARS` on top of it. Measured independently at runtime:
- `TRINKET_LIST.filter(t => t.locked && !t.donationReward &&
  !t.pendingReward).length` = **252** (just the trinket slice).
- `SUPERBOSS_REWARDS.length` = **375** = `Object.keys(SUPERBOSSES).length`
  (15) × `Object.keys(CLASSES).length` (25).

Part B touched none of `TRINKET_LIST`, `ACHIEVEMENT_PICKUP_KINDS`,
`NEW_CLASS_REWARD_ITEMS`, `NEW_CLASS_REWARD_FAMILIARS`, or
`NEW_CLASS_REWARD_STARS` — the reward ids Part B's new achievements grant
(`frostflask` + 15 familiars) were deliberately chosen from the audited
"never claimed anywhere, including the superboss grid" set, confirmed by
the duplicate-grant sweep above. The invariant is unchanged and still holds.

## Known pre-existing issue flagged, not fixed (out of scope)

`defs-5.js`'s `challenge_wins_allclasses` ("Every Last Pony") still checks
`Object.keys(unlocks.winsByClass).length >= 20` with flavour text "Win a run
with all 20 characters" — stale relative to `CLASSES` now having 25 entries
(Phase 5a added 4 without updating this). Still reachable, still fires
correctly at its own threshold — not a broken predicate, just a stale
number/description now 5 short of literally "all" classes. Left alone
since correcting the intended threshold (20 → 25?) is a design call outside
this pass's scope; documented in CODE_REFERENCE.md for whoever picks it up
next.
