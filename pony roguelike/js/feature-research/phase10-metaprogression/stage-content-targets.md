# Phase 10 — stage content targets (stages 4-13)

The coordination contract for the three PARALLEL content implementers filling in the
extended main route. Each group owns four files and nothing else; no two groups touch
the same file, so the three passes can run concurrently without conflicts.

Read this whole file before authoring anything.

---

## The route, at a glance

The main route now runs floorNum 0-34 (HUD floors 1-35). floorNum 0-14 are the legacy
route (stages 0-3 plus the 9A/9B branch and the floors 13/14/15 finale set) and are
**out of scope for this phase — do not touch them**. floorNum 15-34 are the new ten
stages, two floors each, resolved by `stageIndexForFloor` in `js/data/stages.js`.

floorNum 14 ("The One True Descent") is no longer the run's ending; floorNum 34
(`MAIN_ROUTE_FINAL_FLOOR`, "Hyperspace — The Last Exit") is.

## Per-stage table

| Stage | id / name | floorNum | Group | Superboss |
| --- | --- | --- | --- | --- |
| 4 | `frozendesert` — Frozen Desert | 15-16 | 1 | ICE Agent DNB |
| 5 | `badlands` — Badlands | 17-18 | 1 | Mexico DNB |
| 6 | `beach` — Beach | 19-20 | 1 | G5 DNB |
| 7 | `ocean` — Ocean | 21-22 | 2 | Japan DNB |
| 8 | `seafloor` — Seafloor | 23-24 | 2 | DeanNB |
| 9 | `trench` — Trench | 25-26 | 2 | Israel DNB Prime Prime |
| 10 | `trenchdepths` — Trench Depths | 27-28 | 3 | Palestine DNB |
| 11 | `deepdark` — Deep Dark | 29-30 | 3 | Warden DNB |
| 12 | `metarealm` — Meta Realm | 31-32 | 3 | Notch DNB |
| 13 | `hyperspace` — Hyperspace | 33-34 | 3 | The One True Kirkinator |

Exact stage ids, palettes and the twenty `FLOOR_NAMES` entries already exist in
`js/data/stages.js` — use them, don't re-invent them.

## File ownership

Every file below already exists with placeholder content and is already registered in
`index.html` at the correct load position. **Do not create new files and do not edit
`index.html`** — if you genuinely need another file, add it beside your group's files
and register it in the same block, never in another group's block.

### Group 1 — stages 4, 5, 6
- `js/data/enemies/stage4-6-enemies.js`
- `js/data/enemies/stage4-6-bosses.js`
- `js/data/enemies/stage4-6-superbosses.js`
- `js/data/roomTemplates/stage4-6-floorfeature.js`

### Group 2 — stages 7, 8, 9
- `js/data/enemies/stage7-9-enemies.js`
- `js/data/enemies/stage7-9-bosses.js`
- `js/data/enemies/stage7-9-superbosses.js`
- `js/data/roomTemplates/stage7-9-floorfeature.js`

### Group 3 — stages 10, 11, 12, 13
- `js/data/enemies/stage10-13-enemies.js`
- `js/data/enemies/stage10-13-bosses.js`
- `js/data/enemies/stage10-13-superbosses.js`
- `js/data/roomTemplates/stage10-13-floorfeature.js`

Shared files each group WILL have to touch (coordinate, or serialise these edits):
`js/systems/combat-3.js` (the AI dispatch switch) and one of `js/systems/ai-1.js` …
`ai-4.js` (the behavior function bodies). See "Unique AI per stage" below.

## Required content counts

Per stage:

| Kind | Count | Where |
| --- | --- | --- |
| Trash enemies | **15** | your group's `*-enemies.js` |
| Regular bosses | **4** | your group's `*-bosses.js` |
| Superboss | **1** (name from the table) | your group's `*-superbosses.js` |
| Floor-feature room template | **1 minimum**, up to **4** | your group's `*-floorfeature.js` |

Totals across all ten stages: 150 enemies, 40 bosses, 10 superbosses.

The floor-feature allowance: the original ask was "one interactive object per stage",
with **up to four objects allowed where directionality is needed** — i.e. a conveyor,
current, push-plate or one-way gate that has to exist in N/S/E/W variants counts as one
feature, authored as four obstacle kinds. Don't spend the allowance on four unrelated
objects; spend it on one object that needs four facings.

Delete the placeholder entries (`placeholder_*`, and the plain `{"m":[[1]]}` floor-gated
templates) as you replace them. Leave `roomTemplates/floorfeature.js`'s single untagged
`{"m":[[1]]}` alone — it is the pool's never-empty fallback.

## Difficulty ordering

Stage 4 is the **easiest of the new ten** and stage 13 the **hardest**, increasing
monotonically across all ten. Every one of the ten must also read as harder than any of
the four legacy stages (0-3) — a player arriving at floorNum 15 has just cleared the old
finale, so "Frozen Desert" is a step up from "The One True Descent", not a reset.

Two calibration rules that matter more than they look:

1. **`hp` is identity, not an absolute.** `entities.js` multiplies boss/superboss hp by
   `bossHpScale` (1.28^floorNum), which at floorNum 15-34 is already enormous. Author
   against the *existing* superbosses' 60-79 band (see the long comments in
   `js/data/enemies/superbosses.js`), not "floor 30 sized" numbers, or the scaling
   applies twice and the fight becomes unkillable.
2. **Raw `dmg` above ~8 is wasted.** `playerDamageAmount` in `js/systems/combat-1.js`
   hard-caps the damage a player can take from any single source at **4** (4 = 8 half
   hearts on the HUD). Anything above that is silently clamped. Get difficulty from
   **hp, speed, pattern complexity, room composition and enemy count** — never from
   inflated `dmg`.

## Unique AI per stage

"Unique AI per stage" means each stage's 15 enemies + 4 bosses should **mostly get their
own new behavior functions**, not a blanket reuse of `chaser`/`bossWarlord` (which is all
the placeholders do, purely to prove the wiring compiles).

Where new behaviors go:

- **Dispatch switch:** `js/systems/combat-3.js`, the `switch (e.behavior)` at ~line 93.
  Trash behaviors (`case 'chaser': …`) run from ~line 94; boss behaviors
  (`case 'bossWarlord': aiBossWarlord(...)`) from ~line 116. A `behavior` string with no
  case here does nothing at all — the enemy stands still. Add one `case` per new
  behavior.
- **Function bodies:** `js/systems/ai-1.js` … `js/systems/ai-4.js`. Follow the existing
  naming: `aiXxx(game, e, dt)` for trash, `aiBossXxx(game, e, dt)` for bosses.

Because all three groups edit `combat-3.js`, keep your additions in one contiguous block
labelled with your group, appended at the end of each switch — that makes the three
edits mergeable rather than interleaved.

**Superbosses may reuse an existing `aiBossXxx`** and differentiate on stats — that is
the established convention for every superboss set to date (see the C-branch and Phase 7a
comments in `superbosses.js`, both of which state it explicitly). Whether these ten
marquee fights deserve bespoke AI instead is the content implementers' call, not a
decision this coordination pass makes.

## Registration mechanics (already wired — match, don't reinvent)

- **Enemies:** `Object.assign(ENEMY_TYPES, {...})`, exactly like `types-2/3/4.js`. Your
  file loads *before* `lists.js`, which snapshots
  `ENEMY_LIST = Object.values(ENEMY_TYPES)` once. Never assign to `ENEMY_TYPES` from a
  file that loads after `lists.js`.
- **Bosses:** `bosses.js` snapshots `BOSS_LIST` on its last line, so your file (which
  loads after) does **both** `Object.assign(BOSS_TYPES, X)` **and**
  `BOSS_LIST.push(...Object.values(X))`. Both halves are required — `resolveGenericBoss`
  reads `BOSS_LIST`, not `BOSS_TYPES`.
- **Superbosses:** same two-step against `SUPERBOSSES` / `SUPERBOSS_LIST`.
- **Room templates:** `ROOM_TEMPLATES.floorfeature.push({...})`, room-editor export form.

Pool selection you are authoring against (`js/systems/room.js`):
`resolveGenericEnemy` filters `ENEMY_LIST` by `stage === stageIndexForFloor(floorNum)`;
`resolveGenericBoss` filters `BOSS_LIST` by `stage`. So **`stage:` must be set correctly
on every entry** (4-13 per the table) — it is the only thing that puts a creature on a
floor. `floorKey` is a legacy/branch mechanism and returns `null` for floorNum 15+; don't
use it.

**Quirk to know:** `resolveGenericEnemy` first tries
`(e.xpTier || 1) <= 1 + (floorNum % FLOORS_PER_STAGE)`, i.e. the *odd* floorNum of a pair
gets the wider tier-2 pool. The new stages start on the odd floorNum 15, so within each
new stage the **first** floor gets the wider pool and the **second** the narrower one —
inverted relative to the legacy stages, which start on even floorNums. It degrades safely
(an empty filtered pool falls back to the whole stage pool), but if you want a real
easy-floor/hard-floor split inside a stage, `xpTier` alone will not give it to you.

Superboss floor dispatch is **not** wired: `js/game.js`'s `startFloor` hard-codes
floorNum → superboss for the legacy route only, and sends every floorNum 15+ to
`resolveGenericBoss`. Wiring the ten new superbosses to their floors is part of the
content pass, once each stage's real layout is settled.

## Also still open

- **Bestiary pages.** `STAGE_LIST` in `stages.js` has no entries for the ten new stages,
  so `markBestiarySeen('seenStages', <new stage id>)` records ids with no page. Someone
  has to add those ten entries; agree on who.
- **Achievements.** No reach/speedrun/no-damage achievements exist for floorNum 15+.
