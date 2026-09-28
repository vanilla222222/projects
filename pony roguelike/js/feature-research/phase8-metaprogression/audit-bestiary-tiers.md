# Phase 8a — Bestiary tier system + skill-point currency (audit)

**Scope:** the FOUNDATION slice of the Phase 8 meta-progression overhaul only. The skill tree
itself — the panel, the nodes, and anything that *spends* the points this phase mints — is a
later phase (8b–8e) and is deliberately not built here. `unlocks.skillTree.points` accumulates
and nothing reads it back out yet. That is correct and expected.

## Files changed

| File | Change |
| --- | --- |
| `js/achievements/bestiary-tiers.js` | **NEW.** The threshold ladders, tier names/icons/colors, `bestiaryTierFor` + two display helpers. |
| `js/achievements/logic.js` | `ensureUnlockShape` backfills 8 new count buckets + `bestiary.tiersAwarded` + `unlocks.skillTree`; new `_BESTIARY_SEEN_TIER_MAP`, `bestiaryTierCategoryForEnemy`, `checkBestiaryTierUp`; `bumpBestiaryCount`/`markBestiarySeen` rewired through them. |
| `js/ui/bestiary.js` | `bestiaryRow` gains an optional `tier` badge; all six renderers compute and pass it. |
| `index.html` | `<script src="js/achievements/bestiary-tiers.js">` inserted immediately before `js/achievements/logic.js`. |
| `style.css` | One rule, `.best-tier` (font-size/vertical-align/margin), next to the existing `.best-dot`. |
| `js/CODE_REFERENCE.md` | New "Phase 8a" subsection + extended `ensureUnlockShape` paragraph. |

No call site of `bumpBestiaryCount`/`markBestiarySeen` was touched — all ten of them
(`combat-1/2/3.js`, `main.js`, `game.js`, `room.js`, `items-2.js`) route through the two
functions themselves, which is the single choke point the tier pass hooks into. No achievement
defs file, superboss reward grid, or Phase 7 content was modified.

## What was built

**1. Ladders (`bestiary-tiers.js`).** Twelve categories, each a 4-rung ascending ladder
`[copper, silver, gold, platinum]`. `bestiaryTierFor(category, count)` walks the ladder and
returns 0–4 (0 = unranked); an unknown category returns 0, so passing a bucket that has no
ladder is a silent no-op rather than a crash. `BESTIARY_TIER_NAMES`, `BESTIARY_TIER_ICONS`
(`copper 🟠 / silver ⚪ / gold 🟡 / platinum 💠`) and `BESTIARY_TIER_COLORS`
(`#b87333 / #c0c0c0 / #ffd700 / #e5e4e2`) live alongside, plus `bestiaryTierName(tier)` /
`bestiaryTierLabel(tier)` for the panel's tooltip text.

### Exact threshold table used

| Category | copper | silver | gold | platinum | distinct ids |
| --- | --- | --- | --- | --- | --- |
| `enemy` | 50 | 250 | 1000 | 5000 | 957 |
| `boss` | 10 | 40 | 150 | 500 | 64 |
| `superboss` | 1 | 5 | 15 | 50 | 22 |
| `item` | 3 | 10 | 30 | 100 | 1934 |
| `trinket` | 3 | 10 | 30 | 100 | 607 |
| `familiar` | 3 | 10 | 30 | 100 | 401 |
| `star` | 3 | 10 | 30 | 100 | 73 |
| `pill` | 3 | 10 | 30 | 100 | 200 |
| `object` | 5 | 20 | 75 | 250 | 32 |
| `pickup` | 10 | 40 | 150 | 500 | 22 |
| `roomtype` | 3 | 10 | 30 | 100 | 18 |
| `stage` | 1 | 3 | 10 | 30 | 22 |

**2. Save shape.** `ensureUnlockShape` now also creates, on any save that predates them:
`bestiary.itemsCollectedCount` / `trinketsEquippedCount` / `familiarsCollectedCount` /
`starsUsedCount` / `pillsDrunkCount` / `pickupKindsCollectedCount` / `roomTypesVisitedCount` /
`stagesVisitedCount` (the count mirrors of the eight boolean `seenX` sets),
`bestiary.tiersAwarded` (`'category/id' → highest tier paid out`), and
`unlocks.skillTree = { points, spent, unlockedNodes }` — the last three fields individually
backfilled too, so a partially-written `skillTree` can't produce `undefined.points`.

**3. Central tier check.** `checkBestiaryTierUp(unlocks, category, id, count)` compares the ladder result against
`tiersAwarded[key]` and, when it's higher, records the new tier and adds `newTier - prevTier`
points — so a jump clearing several rungs at once pays for every rung. It only *mutates* the
unlocks object; the single pre-existing `saveUnlocks` at the end of each function persists it,
so neither function gained a second write.

Wiring:
- `bumpBestiaryCount('enemyKills', id, …)` → category resolved by `bestiaryTierCategoryForEnemy`
  (`SUPERBOSSES[id]` → `superboss`, else `BOSS_TYPES[id]` → `boss`, else `enemy`).
- `bumpBestiaryCount('objectsDestroyed', id, …)` → `object`.
- `markBestiarySeen(section, …)` → looks `section` up in `_BESTIARY_SEEN_TIER_MAP`, bumps the
  paired count bucket by 1 **on every call** (the seen flag stays first-call-only, as before),
  then checks the tier. Sections absent from the map keep the exact old behaviour.
- `enemyDeaths` and `objectsSeen` are deliberately excluded — the first measures how often
  something killed *you*, the second has no repeat-count meaning (`objectsDestroyed` already
  covers the tiered case for obstacles).

One behavioural note: `markBestiarySeen` now saves on every call for the eight mapped sections
(it previously wrote only on the first sighting), because the count has to persist. Still
exactly one `saveUnlocks` per invocation; `objectsSeen` is unchanged and still writes only once.

**4. Panel badges.** `bestiaryRow` takes an optional `tier`; when it's > 0 and the row is
discovered it appends a small `<span class="best-tier">` after the entry name, showing the tier
icon coloured from `BESTIARY_TIER_COLORS` with `title="Copper tier"` etc. Tier 0 renders nothing
at all, so an undiscovered or unranked row looks identical to before. All renderers feed it:
enemies/bosses/superbosses (from `enemyKills` + their group's category), items, familiars, pills,
destructible objects, and everything on `renderBestiarySimple` (stars/trinkets/pickups/roomtypes/
stages) — the latter deriving its category and count bucket from `_BESTIARY_SEEN_TIER_MAP`
itself, so the panel can't drift from what's actually being counted. The Pills row's second line
also now reads the real tally ("Taken 12 times.") instead of the flat "Taken at least once.",
since the count finally exists. `bestiaryDiscoveredTotals` was left alone — the tab counters
remain discovery counts, not tier counts.

## Verification

`node --check` clean on `js/achievements/bestiary-tiers.js`, `js/achievements/logic.js`,
`js/ui/bestiary.js`.

Node harness (`vm` context with stub `localStorage`/`document`/data tables, loading the real
`bestiary-tiers.js` + `logic.js` and driving the real `bumpBestiaryCount`/`markBestiarySeen`):

```
migration buckets ok: true   skillTree: {"points":0,"spent":{},"unlockedNodes":{}}
49 kills   -> tier undefined  points 0
50 kills   -> tier 1          points 1
5000 kills -> tier 4          points 4   count 5000
sb tier 1, boss tier 1        points 6
3 stars    -> tier 1  count 3  seen true  points 7
after enemyDeaths x9999 + objectsSeen: tiersAwarded = enemy/reg, superboss/someSb, boss/someBoss, star/st1   points 7
objectsDestroyed 0 -> 250 in one call: tier 4  points 11
bestiaryTierFor('nope', 9999) -> 0
```

Reads: no double-counting below a rung (49 kills = 0 points, the 50th = exactly 1); the full
enemy ladder pays 4 total across 5000 kills, not more; `enemyKills` routes correctly to
boss/superboss by data table; a boolean-seen category tiers on its 3rd sighting and keeps its
seen flag; `enemyDeaths`/`objectsSeen` mint nothing; a multi-rung jump pays all four rungs at
once; and `ensureUnlockShape` backfills every new field on a save that predates them.

Known and accepted: an existing save with a large pre-Phase-8a count (e.g. 9999 kills already
banked) is not retroactively awarded on load — `tiersAwarded` starts empty and the ledger only
updates when that id is next bumped, at which point the multi-rung logic pays all four rungs in
one go. No migration sweep was added, per the "small, mechanical" scope.

Per the project's no-heavy-smoke-testing rule the game was not launched or screenshotted; the
user verifies by playing.
