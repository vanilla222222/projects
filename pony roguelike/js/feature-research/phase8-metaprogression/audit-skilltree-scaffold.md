# Phase 8b — Skill Tree Scaffold: audit

Implements the plan from the build-opus IMPLEMENTER task: the engine and panel
that *spend* the skill points Phase 8a's bestiary tiers mint into
`unlocks.skillTree.points`. Ships the free `start` node + the 27 category hub
nodes (25 per-character `char_hub_<classId>` + `unlock_hub` + `general_hub`)
and a fully generic purchase/effect engine. The 375 leaf nodes (10/character ×
25, 100 unlock, 25 general upgrade) are content for Phase 8c/8d/8e and are not
defined here.

## Files changed

- **NEW** `js/achievements/skilltree.js` — the engine: `SKILL_TREE_STAT_FIELDS`,
  `SKILL_TREE_STAT_CAP`, `SKILL_TREE_NODES`, `SKILL_TREE_NODES_BY_ID`,
  `isSkillNodeOwned`, `canBuySkillNode`, `buySkillNode`,
  `applySkillTreeUnlockEffect`, `getSkillTreeStatBonus`,
  `applySkillTreeStatBonuses`, `applySkillTreePoolNudge`,
  `applySkillTreeStartingPickups`, `buildSkillTreePanel`.
- `js/systems/items-1.js` — `recalcPlayerStats(player)` now calls
  `applySkillTreeStatBonuses(player);` as its last statement (the function's
  true closing brace is at the end of `items-1.js`; it does not spill into
  `items-2.js`).
- `js/game.js` — `startRun(classId)` calls
  `applySkillTreeStartingPickups(this.player);` right after
  `this.player = new Player(classId);`, before `recalcPlayerStats`.
- `js/systems/room.js` — `spawnClearRoomPickup` wraps every
  `Util.weighted(...)` call against `COMMON_CATEGORY_POOL`,
  `COMMON_PENNY_POOL`, `COMMON_HEART_POOL`, `RARE_POOL` (the filtered
  `candidates` array), and `LEGENDARY_POOL` with
  `applySkillTreePoolNudge(pool, 'PoolName')`. `CLEAR_REWARD_CHANCE`'s tier
  roll and the Fortune Shell shift are untouched, as instructed.
- `index.html` — new `#skillTreeScreen` overlay (same structure as
  `#bestiaryScreen`), `#skillTreeBtn` (main menu) + `#pauseSkillTreeBtn`
  (pause menu) open buttons with a `#skillTreePointsBadge` badge, and
  `<script src="js/achievements/skilltree.js">` inserted immediately after
  `js/achievements/logic.js`'s tag and before `js/main.js`'s tag.
- `js/main.js` — `skillTreeBtn`/`pauseSkillTreeBtn` click wiring via
  `openOverlay`, `skillTreeCloseBtn` close wiring, `skillTreeScreen` added to
  the backdrop-click-to-close loop and the Escape-handler's open-overlay
  array, a `KeyK` keybind (`toggleOverlay('skillTreeScreen',
  buildSkillTreePanel)`), and a new `refreshSkillTreeBadge()` function called
  alongside `refreshAchievementsBadge()`/`refreshBestiaryBadge()` inside
  `updateLifetimeStatsDisplay()` (so it runs both at page-load bootstrap and
  every `returnToMenu()`).
- `style.css` — minimal additions: `.skill-row.skill-buyable` (purple
  highlight border/glow, matching the accent color already used elsewhere)
  and `.skill-buy-btn` (a compact inline per-row button, since `.overlay
  button`'s existing full-width styling is sized for a single Close button,
  not one button per row).
- `js/CODE_REFERENCE.md` — new `### achievements/skilltree.js` section (node
  shape, all 4 effect types, the +25% cap, `SKILL_TREE_STAT_FIELDS`, every
  engine function, panel wiring); short added notes on the existing
  `recalcPlayerStats`, `startRun`, `spawnClearRoomPickup`, and
  overlay-panel-wiring entries; updated the Phase 8a `achievements/
  bestiary-tiers.js` section's "not yet built" note now that 8b exists.

## Deviations from the plan

- The plan's illustrative example wrapped only `COMMON_CATEGORY_POOL`,
  `COMMON_PENNY_POOL`, `COMMON_HEART_POOL`, `RARE_POOL`, and `LEGENDARY_POOL`.
  `spawnClearRoomPickup` also calls `Util.weighted` against
  `BOMB_TIER_POOL.filter(...)`/`KEY_TIER_POOL.filter(...)` (for the
  common-bomb/common-key branches) and `CHEST_TYPE_POOL` (for the
  legendary-chest fallback). Left those three unwrapped: `BOMB_TIER_POOL`/
  `KEY_TIER_POOL` are also used from a sibling function (`resolvePickupKind`,
  line ~651-652) as generic pickup-tier pools, not reward-tier-specific
  pools, and `CHEST_TYPE_POOL` is a shared chest-kind pool used across
  `room.js`, `stars.js`, and `combat-4.js` for regular chest spawns, not
  something specific to the room-clear reward. The plan named exactly five
  pool constants explicitly plus "any sibling function that uses these SAME
  pool constants" — those three don't fit that description, so wrapping them
  would be scope creep beyond what's named. If a future general-upgrade node
  needs to nudge bomb/key/chest odds specifically, that's a small follow-up
  wrap, not part of this pass.
- No other deviations — `CLASSES[classId].name` was confirmed correct (no
  `.displayName`/`.title` field exists), `Util.clamp(v, lo, hi)` and
  `Util.weighted(items)` match the plan's assumed signatures exactly, and
  `recalcPlayerStats`'s true closing brace is at the literal end of
  `items-1.js` (not split into `items-2.js`).

## Keyboard shortcut chosen

`KeyK` — toggles the Skill Tree overlay, mirroring `KeyT` (Achievements) and
`KeyC` (Bestiary). Existing bound keys audited before picking (`KeyW/A/S/D`
movement, `Space` attack, `KeyV` build, `KeyB` bomb, `KeyE` active item,
`KeyQ` pill, `KeyR` star, `KeyF` donate, `KeyG` reroll, `KeyH` arcade, `KeyM`
mute, `KeyT` achievements, `KeyC` bestiary, `Escape` pause/close) — `K` was
unused.

## Verification

1. **`node --check`** on every touched/new JS file — all clean:
   `js/achievements/skilltree.js`, `js/systems/items-1.js`, `js/game.js`,
   `js/systems/room.js`, `js/main.js`.

2. **Node `vm` harness** (throwaway, not committed — ran from the scratchpad)
   loaded `skilltree.js` into a sandboxed context with fake `CLASSES` (2
   classes), a real `Util.clamp`, and fake `loadUnlocks`/`saveUnlocks`/
   `ensureUnlockShape` backed by an in-memory store matching the real
   `unlocks.skillTree`/`unlockedStars` shapes. Full output:

   ```
   PASS: hub not buyable with 0 points
   PASS: hub buyable with 1 point
   PASS: start is owned without unlocking it
   PASS: buySkillNode returns true
   PASS: points decremented by cost
   PASS: unlockedNodes flag set
   PASS: second buy returns false
   PASS: points unchanged after failed re-buy
   PASS: stat bonus clamps to 0.25 not 0.35
   PASS: pool nudge is a true no-op (same array reference)
   PASS: unlock effect sets unlockedStars
   PASS: unlock effect idempotent (still true, no crash)

   ALL PASSED
   ```

   This covers every check the plan asked for: `canBuySkillNode` false at 0
   points / true at 1+ point; a hub node buyable directly (its only parent,
   `start`, is always owned); `buySkillNode` decrementing points and setting
   `unlockedNodes[nodeId]`; a second `buySkillNode` call on the same node
   returning `false` with points unchanged; two synthetic `0.15` + `0.20`
   stat nodes summing to `0.35` but `getSkillTreeStatBonus` clamping the
   result to `0.25`; `applySkillTreePoolNudge` returning the exact same array
   reference (`===`, not just equal-by-value) when no node targets the pool
   name; and `applySkillTreeUnlockEffect` setting `unlockedStars.test_star =
   true` and staying idempotent (no crash, no re-set weirdness) on a second
   call.

3. **grep confirmation** — new script tag and both open buttons present in
   `index.html`:
   ```
   37:  <button id="skillTreeBtn" class="achv-open-btn">🌳 Skill Tree...
   161: <button id="pauseSkillTreeBtn">🌳 Skill Tree</button>
   229:<script src="js/achievements/skilltree.js"></script>
   ```

No heavy smoke testing performed (per house convention) — the change is
scaffolding with zero live leaf-node content, so every runtime hook
(`applySkillTreeStatBonuses`, `applySkillTreePoolNudge`,
`applySkillTreeStartingPickups`) is a guaranteed no-op in actual gameplay
today; the harness above is what actually exercises the engine logic itself.
