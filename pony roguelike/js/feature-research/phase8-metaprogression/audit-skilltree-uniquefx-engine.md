# Phase 8b-uniquefx — skill-tree multi-effect / uniqueField / uniqueFlag engine audit

Engine-only pass: multi-effect nodes, a symmetric stat-bonus clamp, and two
new effect types (`uniqueField`, `uniqueFlag`) that let a future content
pass safely tune class-specific ability knobs and grant borrowed mechanics
— without ever mutating the shared `CLASSES` def objects. No leaf-node
content added beyond synthetic nodes in the throwaway verification harness.

## Files changed

- `js/achievements/skilltree.js` — added `nodeEffects(node)` helper; every
  function that used to read `node.effect` directly now iterates
  `nodeEffects(node)` (`buySkillNode`, `getSkillTreeStatBonus`,
  `applySkillTreePoolNudge`, `applySkillTreeStartingPickups`); made the stat
  clamp in `getSkillTreeStatBonus` symmetric
  (`[-SKILL_TREE_STAT_CAP, SKILL_TREE_STAT_CAP]`); `applySkillTreeStatBonuses`
  now applies a nonzero (not just positive) bonus and, at its end, calls two
  new functions: `applySkillTreeUniqueFieldBonuses(player)` and
  `applySkillTreeUniqueFlagEffects(player)`. Updated the node-shape doc
  comment at the top of the file.
- `js/entities/entities.js` — `Player` constructor: added two new
  per-instance shadow fields, `this.crystalShardCount = def.crystalVolley ?
  3 : 0;` and `this.fireZoneRootMult = 0.25;`, each with a comment
  explaining the mutation-safety rule (never write to `player.def`).
- `js/systems/combat-2.js` — `playerCrystalVolleyAttack`: replaced the fixed
  `CRYSTAL_VOLLEY_OFFSETS = [-34, 0, 34]` array with a dynamically-built
  `offsets` array sized by `player.crystalShardCount`, computed as
  `(i - (count-1)/2) * CRYSTAL_VOLLEY_SPACING` (`CRYSTAL_VOLLEY_SPACING =
  34`); added a `count <= 0` guard that returns with no shots fired.
- `js/systems/combat-1.js` — the root-in-place speed multiplier in
  `updatePlayer` (`miredInOwnFire ? 0.25 : 1`) now reads
  `player.fireZoneRootMult` (falling back to `0.25` if somehow undefined).
- `js/CODE_REFERENCE.md` — updated the `### achievements/skilltree.js`
  section (node shape doc, `nodeEffects`, symmetric clamp semantics, the two
  new effect types with their exact shapes and the mutation-safety rule,
  `getSkillTreeStatBonus`/`applySkillTreeStatBonuses` behavior, the two new
  post-passes); updated the `Player` constructor entry with a new
  "Phase 8b-uniquefx shadow fields" note (mutation-safety rule, the two new
  fields, and the list of other classes' `def`-read ability params not yet
  shadowed); updated `playerCrystalVolleyAttack`'s doc entry (dynamic
  offsets) and the `updatePlayer` root-in-place speed doc (per-instance
  multiplier); updated the `skilltree-characters.js` section's note about
  `fireCooldown`/`meleeCooldown` to say the floored-at-0 restriction no
  longer holds.

No other files were touched. No state-changing git commands were run.

## Mutation-safety verification (read myself, not trusted blindly)

Confirmed directly in `js/entities/entities.js`'s `Player` constructor:
`const def = CLASSES[classId]; this.def = def;` — a direct reference, not a
copy (`Object.assign`/spread was NOT used). `CLASSES` itself
(`js/data/core.js`) is a single module-level `const` object shared by every
`Player` instance ever constructed, for the life of the page. This confirms
the prompt's premise exactly: any code path that does
`player.def.someField = x` would permanently corrupt that class definition
for every future run and every character (since it's the same object,
re-read from nowhere — there's no per-run reload). All new code in this
pass writes only to per-instance `player.*` shadow fields, never to
`player.def.*`. Verified with an automated regression check (harness item
#7 below) that deep-compares `CLASSES` before/after constructing players
and running the new code paths.

## Verification harness

Node `vm` harness (throwaway, `/tmp/.../scratchpad/harness.js`, not
committed), loading the **real** `js/core/utils-1.js` (`Util`),
`js/data/core.js` (`CLASSES`), `js/entities/entities.js` (`Player`),
`js/achievements/skilltree.js`, `js/achievements/skilltree-characters.js`
into a single `vm` context, plus minimal verbatim reimplementations of
`loadUnlocks`/`saveUnlocks` (from `main.js`) and `ensureUnlockShape`'s
`skillTree`-relevant lines (from `achievements/logic.js` — the full
`logic.js` needs `ACHIEVEMENTS` and is impractical to load whole for this
harness; skilltree.js only calls these three functions by name, and their
bodies were copied verbatim). A `recalcPlayerStatsStub(player)` calling
just `applySkillTreeStatBonuses(player)` stands in for the real (huge,
item-system-dependent) `recalcPlayerStats`, matching the documented
contract that `applySkillTreeStatBonuses` is its last statement.

Full output (all 13 checks passed):

```
PASS: SKILL_TREE_NODES has 250 character leaf nodes (25 classes x 10)
PASS: each character branch worst-case stat sum <= 0.19 (existing data unchanged)
PASS: nodeEffects() returns [] for a null-effect node, and [effect] for a legacy single-effect node
PASS: found earth pony a1 node id
PASS: legacy buySkillNode + getSkillTreeStatBonus still work end-to-end
PASS: synthetic multi-effect node applies BOTH effects on purchase
PASS: getSkillTreeStatBonus clamps large negative sum to exactly -0.25
PASS: player.crystalShardCount starts at 3 for Crystal Pony, 0 otherwise
PASS: uniqueField bonus adds to crystalShardCount and clamps to the effect's own [min,max]
PASS: player.fireZoneRootMult starts at 0.25 for Changeling
PASS: CLASSES.crystalpony / CLASSES.changeling unchanged after all player construction + recalc
PASS: uniqueFlag grants a borrowed mechanic flag not native to the class
PASS: offset formula (i - (count-1)/2) * 34 reproduces [-34,0,34] for count=3

=== 13 passed, 0 failed ===
```

Mapping to the plan's numbered verification list:

1. Loaded real `core.js`/`entities.js`/`skilltree.js`/`skilltree-characters.js` — done, described above.
2. Existing 250-node single-`effect` shape re-verified: node count (25×10=250 present among `SKILL_TREE_NODES`), the Phase 8c cap-sum invariant (`opener+4 subpath nodes` per class×stat ≤ 0.19 < 0.25) recomputed directly off the live array and still holds — untouched by this pass's edits (checks 1-2).
3. Synthetic multi-effect node (`effects:[stat(-0.1 rangedDamage), uniqueField(+2 crystalShardCount, clamp 0-5)]`) bought on a Crystal Pony hub; confirmed BOTH effects applied — `getSkillTreeStatBonus` returned exactly `-0.1`, and a fresh `Player('crystalpony')` run through the recalc stub had `crystalShardCount === 5` (base 3 + bonus 2, clamp not binding) (check 3).
4. `getSkillTreeStatBonus` symmetric-clamp check: two synthetic nodes summing to `-0.5` raw on `pegasus`/`fireCooldown` clamped to exactly `-0.25`; then via the recalc stub confirmed `fireCooldown` actually shrank to exactly `before * 0.75` (not floored to unchanged) — the reduction-viability claim for cooldown fields holds (check 4).
5. Fresh `Player('crystalpony').crystalShardCount === 3`, `Player('earth').crystalShardCount === 0` (no `crystalVolley`); then a synthetic `uniqueField` node with `amount:100, min:0, max:4` correctly clamped to `4` before adding, yielding `3 + 4 = 7` (check 5).
6. Fresh `Player('changeling').fireZoneRootMult === 0.25` (check 6).
7. **Critical mutation regression**: snapshotted `JSON.stringify(CLASSES)` before any of the above ran; after constructing a `Player` for every one of the 25 `CLASSES` entries and running the recalc stub on each (with the various synthetic owned nodes from checks 3-5/8 still "owned" in the mocked localStorage), re-stringified `CLASSES` and asserted byte-for-byte equality with the snapshot — passed, confirming no code path in this change ever wrote through `player.def` (check 7).
8. Synthetic `uniqueFlag` node granting `shockwaveAttack:true` to Earth Pony (who does not natively have it — verified `Player('earth').shockwaveAttack === false` first); after buying the node and running the recalc stub, `Player('earth').shockwaveAttack === true` (check 8).
9. `node --check` clean on all 4 touched files: `js/achievements/skilltree.js`, `js/entities/entities.js`, `js/systems/combat-1.js`, `js/systems/combat-2.js` (check 9).
10. Hand-derived the offset formula for `count=3`: `(0-1)*34=-34, (1-1)*34=0, (2-1)*34=34` → `[-34, 0, 34]`, matching the original hardcoded array exactly; also asserted this in the harness (check 10).

## Light audit of other classes' hardcoded ability knobs (grep pass, per the plan — not fixed this pass)

Grepped `combat-1.js`/`combat-2.js`/`core.js`/`items-1.js` for the classes
named in the task background. None of these were touched — this is purely
notes for a later content-authoring pass that wants to target them with
`uniqueField`/`uniqueFlag`:

- **Already shadowed on `player` (safe to `uniqueField`-target as-is)**:
  `player.maxChangelingMinions`, `player.changelingMinionDmg`,
  `player.changelingMinionRadius`, `player.changelingSummonCooldown`,
  `player.chargeTime` — all copied off `def` once in the `Player`
  constructor already (pre-existing, not new this pass), so a `uniqueField`
  node targeting any of these today would work correctly with no further
  engine changes.
- **Read directly via `player.def.field || fallback` (read-only today, no
  mutation risk yet, but NOT shadowed — a `uniqueField` node targeting one
  of these right now would be a silent no-op since `player.<field>` doesn't
  exist)**:
  - `player.def.fireZoneRadius || 50`, `player.def.fireZoneRange || 40`
    (`combat-1.js`, Changeling's `updateGreenFireAttack`) — explicitly
    called out as out-of-scope for this pass in the task description.
  - `player.def.fireRingRadius || 60` (`combat-1.js`, Changedling's
    `updateFireRingAttack`).
  - `player.def.rockCoinChance || 0` (`combat-1.js`, Diamond Dog's melee
    shockwave/rock-coin roll).
  - `game.player.def.damageTakenMult || 1` (`combat-1.js`, `takeDamage` —
    Pony Bot's fragility multiplier).
  - `player.def.innateFreezeChance || 0`, `player.def.innateVulnerableChance
    || 0`, `player.def.innateCharmChance || 0` (`items-1.js`'s
    `recalcPlayerStats`, feeding `freezeChance`/`vulnerableChance`/
    `charmChance` — Windigo/Gargoyle/Filly respectively).
  - Diamond Dog's `noTintedRocks` and `shockwaveAttack` themselves are plain
    booleans off `def` (`shockwaveAttack` is already shadowed via
    `!!def.shockwaveAttack` in the constructor, so it's a fine `uniqueFlag`
    target already — confirmed by the harness's Earth Pony test).
  - Kelpie's `baseRangeTiles`, Breezie's `unlimitedRange`, Engineer Pony's
    `canBuildTurrets` are all already shadowed booleans/numbers on `player`
    via the constructor's existing `!!def.X`/`def.X != null ? ... : ...`
    lines (pre-existing), so these are also fine `uniqueFlag`/`uniqueField`
    targets without further engine work.
- No other suspicious bare numeric literals stood out in the attack
  functions for these classes beyond what's listed above and what the task
  background already named (Crystal Pony's shard offsets, Changeling's
  root-in-place multiplier — both fixed this pass).

## Deviations from the plan

None. Re-read the mutation-safety premise directly against
`entities.js`/`combat-1.js`/`combat-2.js` before writing any code (see
"Mutation-safety verification" above) and confirmed it exactly as
described in the task — no course correction was needed. The `uniqueField`
grouping logic (`applySkillTreeUniqueFieldBonuses`) takes the *tightest*
`[min,max]` across multiple contributing effects for the same
`classId+field` pair when more than one owned node targets it (not
specified explicitly in the plan, which only described a single effect's
own bounds) — a reasonable, conservative interpretation consistent with
"clamp the sum to `[min,max]`" when multiple effects could in principle
carry different bounds; not exercised by real content yet, so any future
content pass should just keep every node targeting the same
`classId+field` combo using identical `min`/`max` to avoid surprises.
