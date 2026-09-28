# Audit — Mega Update A, step 5: synergy infrastructure + 250-item target list

Scope of this pass: **engine machinery + target-item selection only.** No
item's `classSynergy`/combo membership/tradeoff downside was authored — that
is the later slices' work.

## Files changed

| File | Change |
| --- | --- |
| `js/systems/items-synergy.js` | **NEW.** `classSynergy` layer, `SYNERGY_COMBOS` registry (the 5 legacy synergies migrated in), combo evaluator/applier, shared shadow-base writer, clamp tables. |
| `index.html` | **NEW `<script>` tag** for `js/systems/items-synergy.js`, between `js/systems/items-1.js` and `js/systems/items-2.js` (verified against the real tag order, line 264). |
| `js/systems/items-1.js` | 10 edited sites inside `recalcPlayerStats`: the 5 legacy synergy conditions replaced by `applySynergyComboFlag(...)` calls at the same points, the 5 numeric sites replaced by `comboBonus(...)` reads, and the two new layer calls appended after `applySkillTreeStatBonuses(player)`. No other behaviour touched. |
| `js/CODE_REFERENCE.md` | New "Mega Update A step 5 — `systems/items-synergy.js`" subsection documenting `classSynergy`, `SYNERGY_COMBOS`, the `flag`/`stage` conventions, the clamp tables and the shadow-base writer; plus an update note on the existing Synergy A-E section. |
| `feature-research/phase9-megaupdates/step5-target-items.md` | **NEW.** The 250 target items with role assignments — the scope contract for later slices. |
| `feature-research/phase9-megaupdates/select-step5-targets.js` | **NEW.** Deterministic generator for the file above. |
| `feature-research/phase9-megaupdates/verify-step5-synergy.js` | **NEW.** Old-vs-new equivalence + drift regression harness. |

No item data file was touched. No item was added or removed
(`ITEM_LIST.length === 864`, asserted by the harness).

## Design — how the shadow-base pattern was reused, and where it differs

`recalcPlayerStats` runs on every item/pill/star/familiar pickup, rebuilding
every derived stat from scratch. Any new layer that did `player.field += x`
would re-add its bonus on every subsequent pickup and compound over the run.
The proven fix in this codebase is `skilltree.js`'s
`applySkillTreeUniqueFieldBonuses`: keep the field's pristine value on a
dedicated `_…Base` map and always recompute `player[field] = base + clamp(sum)`.

Both new layers use that pattern through one shared writer,
`applySynergyFieldBonuses(player, groups, bases, last, bounds)`, with **one
deliberate difference** that a first draft got wrong and the harness caught:

- skilltree's version captures the base **once for the life of the run**. That
  is correct *there* because it targets per-instance shadow fields
  (`crystalShardCount` etc.) that `recalcPlayerStats` never rebuilds — the
  captured value really is pristine forever.
- Every field these two layers target **is** rebuilt from scratch each recalc.
  A once-captured base therefore goes stale the moment any other item changes
  that stat: the first draft left `critChance` pinned at `0.018` after the
  player dropped the items that had granted it (harness section (e) caught
  exactly this).

So the base is **re-captured every pass**, guarded by a parallel `_…Last` map
holding the value the layer last wrote. If the field still holds exactly that
value, recalc did not re-derive it and the layer recognises its own output,
reusing the stored base rather than folding its own bonus into it. That makes
the layer idempotent under any call pattern — repeated calls, calls without an
intervening recalc, or a future refactor that stops reassigning some field.
Verified: all 26 `ITEM_SYNERGY_FIELDS` are assigned exactly once,
unconditionally, at top-level indentation in `recalcPlayerStats`.

Clamp discipline: percentage-scale fields keep the skill tree's ±0.25
convention (`SKILL_TREE_STAT_CAP`); non-percentage fields get their own flat
clamp, documented per field in `ITEM_SYNERGY_FIELD_CLAMPS`
(`meleeDamage`/`rangedDamage`/`luck` ±3, `speed` ±20 px/s, `meleeRange` ±16 px,
`boltSpeed` ±60, `meleeCooldown`/`fireCooldown` ±0.15 s, `critMultiplier` ±1,
`multishotExtra` ±2, `magnetRadius` ±40, `bombRadiusMult` ±0.25). The clamp
applies to the **sum** of all contributions to a field, per layer — so no
number of stacked `classSynergy` items can exceed one channel's budget.

## Equivalence proof for the 5 migrated synergies

The migration is behaviour-preserving by construction: each legacy synergy's
*condition* moved into a `SYNERGY_COMBOS` entry and each *number* into that
entry's `effects`, but **both are still read at the exact source position they
occupied before**. That positional constraint is not cosmetic:

- Ecosystem Set / Pack Bond's `+0.3` sits **inside** `Math.max(0.5, …)`. Applied
  after that floor instead, a ranged class with `def.meleeDamage` undefined
  (`baseMeleeDamage === 0`) would go from `0.5` to `0.8`.
- Marksman's Eye's `+0.4` sits **inside** `Math.min(4, …)` on `critMultiplier`.
- Pack Bond's `+0.05` is a term in the speed **multiplier**
  (`Util.clamp(1 + …, 0.25, 2.2) * baseSpeed`), not a flat speed bonus — it is
  represented in the registry as the pseudo-field `speedMult`.
- Rot & Ruin and Marksman's Eye are conditioned on `vulnerableChance` /
  `venomChance` / `critChance` **as recalc computes them**, before
  `applySkillTreeStatBonuses` multiplies those same stats. Evaluating them at
  the end of the function would let a skill-tree crit bonus silently switch
  Marksman's Eye on.

Hence `stage:'legacy'`, and hence `applyItemComboSynergies` skipping those
entries so nothing is applied twice.

Empirical proof: `verify-step5-synergy.js` loads the real `index.html` script
order twice in isolated `vm` contexts — **NEW** = the working tree, **OLD** =
the same tree with all 10 migrated sites textually reverted to their
pre-migration form and `items-synergy.js` omitted (each revert asserts its
target string was found, so a silent no-op revert cannot pass). It then builds
players for 5 classIds x {owns all legacy synergy items + 3 familiars, owns
nothing}, calls `recalcPlayerStats` 8x each, and diffs **every** numeric and
boolean field on the player object between OLD and NEW.

Result: **2180 field comparisons, 0 mismatches.** All 5 flags active in the
"owned" saves, none in the bare saves, for all 5 classes.

## Verification table

| # | Check | Result |
| --- | --- | --- |
| 1 | `node --check` on `js/systems/items-synergy.js`, `js/systems/items-1.js`, both new harness scripts | PASS |
| 2 | (a) OLD vs NEW: every player field, 5 classes x 2 saves, calls 1 and 8 | PASS — 2180 comparisons, 0 mismatches |
| 3 | (b) No drift across 8 repeated `recalcPlayerStats` calls (NEW) | PASS — 0 drift mismatches |
| 4 | (c) All 5 legacy flags active on a full-synergy save; none on a bare save, all 5 classes | PASS |
| 5 | (d) `ITEM_LIST.length` | 864 — unchanged |
| 6 | (d) items carrying `classSynergy` / `SYNERGY_COMBOS.length` | 0 / 5 — this pass adds no content |
| 7 | (e) Live smoke: injected `classSynergy` + injected `stage:'post'` combo, 8 recalcs, then items dropped | PASS — no drift; stats unwind exactly to a fresh player's values |
| 8 | 250-item list: exactly 250 rows, no duplicate ids, per-file 65/40/40/105, roles 160/55/35, all `tradeoff` rows quality 3-4 | PASS |
| | **Total** | **9842 assertions, 0 failures** |

Per project convention, no heavy smoke-testing was done — the user verifies by
playing. (The harness prints a pre-existing, unrelated `achievements.js:
superboss achievement count (550) does not match the reward pool size (575)`
warning on load; it predates this pass.)

## Deviations from the plan

1. **The `locked`/`unlockedBy` exclusion in deliverable 2 was dropped.** The
   dispatch assumed those items are "already special". In fact **620 of 864
   items carry `locked:true`** and `items-4.js` is **100% locked**, so the rule
   would have left only 204 eligible items overall and **zero** from
   `items-4.js` — the 65/40/40/105 quota would have been impossible. Locked
   items are ordinary flat-stat items that simply need an unlock first, so they
   are in scope. `attackLayer` items and the 19 legacy-synergy items are still
   excluded as specified. This is noted in the header of
   `step5-target-items.md` too.
2. **Legacy combos are evaluated in place, not at the end of recalc.** The
   dispatch said to apply everything at the end after
   `applySkillTreeStatBonuses`. Doing that for the 5 migrated synergies would
   have changed their values (clamp position + skill-tree ordering — see the
   equivalence section). The two NEW layers *are* called exactly where the
   dispatch specified: appended after `applySkillTreeStatBonuses(player)`, in
   the order `applyItemClassSynergyBonuses` then `applyItemComboSynergies`.
   `stage` is the documented convention that keeps the two cases apart.
3. **Two extra legacy sites were migrated** beyond the ones the dispatch
   scouted: Pack Bond's `+0.05` speed-multiplier term (`items-1.js` line ~213)
   and Twin Fangs' `+0.05` `critChance` term (line ~682). Both re-checked their
   conditions inline. Leaving them behind would have defeated the
   single-source-of-truth goal; both are covered by the equivalence harness.
4. **The 250-item quality mix skews quality-1**, because the corpus does
   (e.g. `items-2.js` is 103 quality-1 of 116 non-`attackLayer` items, and has
   only 2 quality-3 items at all). The pick is proportional to each file's own
   tier mix, then topped up with quality-3/4 pure-upside items so the 35
   `tradeoff` slots could be filled. `items-2.js` contributes no `tradeoff`
   items for that reason; its share was redistributed to `items-5.js`.

## Open risks

- `classSynergy` and `stage:'post'` combos both apply **after**
  `applySkillTreeStatBonuses`, so their bonuses are additive on top of the
  skill tree's multiplicative ones rather than being multiplied by them. That
  is intentional (and matches how the clamps are sized), but it means a
  `classSynergy` bonus is worth slightly less on a heavily skilled character
  than an equivalent item-level bonus would be.
- `comboBonus`'s pseudo-field escape hatch (`speedMult`) is only safe for
  `stage:'legacy'` entries. A new combo that names a pseudo-field would be
  silently ignored by `applyItemComboSynergies` (it validates against
  `ITEM_SYNERGY_FIELDS`). That is fail-safe, but silent.
- The theme grouping in the `combo group hint` column is a keyword heuristic
  over item descriptions. It is a *starting suggestion* for the content pass,
  not a committed design.
- HUD badge capacity: `ui/ui.js`'s `SYNERGY_BADGES` is a hand-written list of 5
  `#synergyBar` spans. Any new combo that declares a `flag` needs a matching
  badge span + `SYNERGY_BADGES` entry, or the flag will be set but never shown.
  Not addressed in this pass.

## Next steps — for the step-5 slice implementers (one per `items-N.js`)

1. **You may only touch items listed in
   `feature-research/phase9-megaupdates/step5-target-items.md`**, and only the
   rows whose `source file` is your file. Do not redesign items outside that
   table, and do not change an item's assigned role — the table is the
   coordination contract that keeps the parallel slices from colliding.
2. **Do not modify the core functions in `js/systems/items-synergy.js`**
   (`applyItemClassSynergyBonuses`, `applyItemComboSynergies`,
   `applySynergyFieldBonuses`, `isSynergyComboActive`, `applySynergyComboFlag`,
   `comboBonus`), the clamp tables, or `ITEM_SYNERGY_FIELDS`. Your only
   permitted edits there are **appending new `SYNERGY_COMBOS` entries** below
   the `// --- NEW combos` marker. If you believe a clamp is wrong for your
   design, say so in your audit rather than widening it.
3. **`classSynergy` rows** — add
   `classSynergy: { <classId>: { field, amount } }` to the item's data entry.
   Only author entries for classes where the item has a genuinely different
   meaning; a class with no entry is the correct default. Target fields must be
   in `ITEM_SYNERGY_FIELDS`; amounts are per copy owned, and the per-field sum
   is clamped (see the clamp table), so budget against that ceiling rather than
   assuming your number lands whole.
4. **`combo` rows** — group them per the `combo group hint` column (treat it as
   a suggestion, not a mandate) into new `SYNERGY_COMBOS` entries with
   `stage:'post'` (the default — just omit `stage`). Use `items` for
   "own all of these", `anyOf` for "one from each family", `when` only when the
   condition genuinely is not about ownership. If you declare a `flag`, add the
   matching badge span and `SYNERGY_BADGES` entry in `ui/ui.js` in the same
   pass, or leave `flag` off.
5. **`tradeoff` rows** — every one is a quality-3/4 item that is pure upside
   today. Add a real Soy-Milk-style drawback: a genuine downside expressed
   either as a negative term in `recalcPlayerStats` or as a negative
   `classSynergy`/combo amount, and **say it in the item's `desc`** — the
   drawback must be visible to the player before they pick the item up.
6. **Every slice must**: run
   `node feature-research/phase9-megaupdates/verify-step5-synergy.js` (it must
   stay at 0 failures — its OLD-vs-NEW section will keep proving the 5 legacy
   synergies are untouched), `node --check` every file you edit, confirm
   `ITEM_LIST.length` still matches expectations, document every new
   convention in `js/CODE_REFERENCE.md` **in the same pass**, and write your
   own audit file next to this one. Light sanity checks only — the user
   verifies by playing.
