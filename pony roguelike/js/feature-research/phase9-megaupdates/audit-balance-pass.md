# Phase 9 — Balance audit (script-driven outlier pass)

Statistical outlier audit + conservative auto-fix pass across `ITEMS`,
`TRINKETS`, and skill-tree `stat`-type nodes. This is a script-driven
outlier scan, not a hand-review of every entry — the item/trinket table is
~1500 entries (864 items + 632 trinkets), which isn't tractable to eyeball
one by one.

## Files changed

- `js/systems/items-1.js` — `downyfeather`'s speed coefficient: `0.20` → `0.15`.
- `js/data/items-1.js` — `downyfeather`'s `desc` text: "+20% movement speed." → "+15% movement speed."
- `js/CODE_REFERENCE.md` — added a short Phase 9 balance-audit note under `recalcPlayerStats`, pointing here for detail.

New files (tooling, kept for reproducibility — not game code):
- `feature-research/phase9-megaupdates/audit-balance-extract.js` — the extraction/outlier-detection script (Step 1).
- `feature-research/phase9-megaupdates/audit-balance-smoketest.js` — the `vm`-based `recalcPlayerStats` smoke harness (Verification step 3).
- `feature-research/phase9-megaupdates/audit-balance-flagged.json` — machine-readable dump of the flagged/unanalyzable lists from the script's last run.

No items, trinkets, or skill-tree nodes were added, removed, or retargeted —
one numeric coefficient was adjusted on one existing item.

## Method

`audit-balance-extract.js`:
1. Regex/brace-matching extraction (not a full parser) of every `ITEMS`/`TRINKETS`
   id → `{quality, desc, name}` from `js/data/items-1..5.js` and `js/data/trinkets-1..2.js`.
2. Splits `js/systems/items-1.js` + `items-2.js` into top-level
   `player.X = <expr>;` / `player.X += <expr>;` statements (paren/brace-depth
   tracked so multi-line expressions are captured whole), tagging each with
   its target stat.
3. Within each statement, regex-matches every coefficient term referencing a
   known item/trinket id, across the shapes actually used in this file:
   - `[sign] N * (p.ID || 0)` — explicit-coefficient item term
   - `[sign] (p.ID || 0)` with no following `*` — implicit coefficient 1
   - `(p.ID ? A : 0)` — boolean-gated item term (coefficient A)
   - `(p.ID ? A : B)` with `B != 0` — two-sided ternary trade-off, logged as **unanalyzable** (not a simple magnitude, skipped per the task brief)
   - `[sign] (t === 'ID' ? N : 0)` — single-sided trinket term
   - `(t === 'ID' ? A : B)` with `B != 0` — two-sided trinket trade-off, logged as **unanalyzable**
   - Any id referenced in the formula file but never matched by the above (e.g. routed through a boolean flag, or a non-linear expression like `55 + 15*(n-1)`) is logged as **unanalyzable**.
4. Groups item coefficients by `(quality, stat)`, trinket coefficients by `(stat)`, requiring ≥4 data points per group; computes mean/stdev; flags any entry `> 2.5σ` from the mean **and** `≥ 2×` the mean in absolute value (both conditions — avoids flagging small-group noise).
5. Does the equivalent for skill-tree `stat`-type effects: `skilltree-characters-2.js` builds its 180 hand-authored nodes from a `SKILL_TREE_CHARACTER_CONFIG_2` array (`{classId, nodes:{key:{name,desc,effects:[{type:'stat',...}]}}}`); the script reconstructs each node's real id (`char_<classId>_<key>`, matching `buildCharacterSkillNodes2`'s own construction) via brace-matching, and groups all `type:'stat'` effects by target `stat` regardless of class.
   - Note: `skilltree-characters.js`'s 250 nodes (10/class × 25 classes) are **not** scanned for outliers — they're generated from one shared `AMOUNT = {a1:0.05, a2a:0.04, ...}` table applied identically to every class, so they're uniform by construction and cannot drift.
6. Prints every flagged outlier with its group's mean/stdev and a suggested corrected value (sign-preserved, clamped to ~1.5× the group mean).

## Script output (post-fix run — see "Fixes applied" below for the pre-fix flag)

```
Loaded 864 ITEMS defs, 632 TRINKETS defs.
Found 84 player.X = / += statements across js/systems/items-1.js, js/systems/items-2.js.
Extracted 811 item coefficient terms, 585 trinket coefficient terms.
Unanalyzable / non-standard-shape references: 18
Skill-tree hand-authored 'stat' effects found: 180 (skilltree-characters-2.js)

=== ITEM outliers: 0 flagged ===
=== TRINKET outliers: 0 flagged ===
=== SKILL-TREE stat-node outliers: 0 flagged ===
```

### Pre-fix run (before the downyfeather edit) — the one flag found

```
=== ITEM outliers: 1 flagged ===
  [q1|speed] id=downyfeather (Downy Feather) stat=speed coeff=0.2 | group n=65 mean=0.0662 stdev=0.0461
    | suggested=0.0992 | js/systems/items-1.js:137
    | raw: + 0.20 * (p.downyfeather || 0)
```

### Unanalyzable references (18 total, unchanged before/after — none are magnitude comparisons, so none needed fixing)

- `bentnail` (trinket) — `(t === 'bentnail' ? 1.2 : 1)`, a multiplicative `meleeRange` factor, two-sided trade-off shape. Only trinket touching `meleeRange` this way; no peer group to compare against, and it's exactly the "? N : -N-style two-sided trade-off" the task called out to skip.
- `spikedbard`, `nightlens`, `secondwind`, `borrowedwings`, `holywater` (items) and `thornedvine`, `foxfirelantern`, `emberphylactery`, `kitestring`, `blessedcenser` (trinkets) — all boolean flag gates (`(p.X || 0) > 0`, `player.hasSecondWind = ... || t === 'Y'`, etc.), not magnitude terms at all. Nothing to compare.
- `venom`, `hardhitter`, `flirtatious`, `coldheart`, `terrifying` (items) — luck-scaled per-stack status-chance items: `(p.X ? 0.10..0.12 * p.X + luckBonus : 0)`. Each targets a *different* stat (venomChance/stunChance/charmChance/freezeChance/fearChance) so they don't form a `(quality,stat)` group together, but manually comparing them: coefficients are 0.12, 0.10, 0.10, 0.10, 0.12 — already tightly consistent, no fix needed.
- `coinmagnet` (item) — non-linear: `p.coinmagnet ? 55 + 15*(p.coinmagnet-1) : 0`, a base+per-stack-increment formula, not a simple linear coefficient. Single item, nothing to compare against; left alone.
- `multishot` (item) — the coefficient IS just implicit `1`, but it's the first term inside `Math.min(4, (p.multishot || 0) + ...)` with no leading `+`/`-` sign, which the regex requires — a known, minor gap in the extraction shape-matching (documented rather than silently guessed at, per the task brief). Its own `(quality,stat)` group (`multishotExtra`) has no other *item* members anyway (only `doublebarrel`, which was captured fine), so this gap had no effect on the outlier scan.

**attackLayer-routed items** (lower priority per the task brief, not reviewed numerically): 95 items across `items-1.js`/`items-2.js`/`items-5.js` carry an `attackLayer:{style,...}` field routed through `js/systems/attackStyles.js` — these aren't comparable via a simple linear coefficient extraction and were out of scope for this pass.

### Full group summary (all `(quality,stat)` / `(stat)` groups with n≥4)

**Items** (43 groups) — one representative excerpt (full list in the script's stdout, reproducible via `node feature-research/phase9-megaupdates/audit-balance-extract.js`):

```
q1|bombRadiusMult: n=21 mean=0.1462 stdev=0.0479
q1|bossDamageBonus: n=17 mean=0.0800 stdev=0.0341
q1|charmChance: n=13 mean=0.0477 stdev=0.0080
q1|critChance: n=20 mean=0.0575 stdev=0.0144
q1|critMultiplier: n=5 mean=0.2800 stdev=0.1166
q1|dodgeChance: n=10 mean=0.0510 stdev=0.0122
q1|fearChance: n=13 mean=0.0438 stdev=0.0074
q1|freezeChance: n=10 mean=0.0490 stdev=0.0070
q1|lifestealChance: n=10 mean=0.0510 stdev=0.0070
q1|luck: n=54 mean=1.0370 stdev=0.1889
q1|magnetRadius: n=11 mean=24.0909 stdev=4.1660
q1|meleeDamage: n=69 mean=0.9710 stdev=0.2390
q1|onKillHealChance: n=6 mean=0.0417 stdev=0.0037
q1|rangedDamage: n=68 mean=0.9706 stdev=0.2407
q1|shopDiscountBonus: n=11 mean=0.0591 stdev=0.0193
q1|speed: n=65 mean=0.0654 stdev=0.0443   [post-fix; was mean=0.0662 stdev=0.0461 pre-fix]
q1|stunChance: n=12 mean=0.0475 stdev=0.0072
q1|venomChance: n=18 mean=0.0472 stdev=0.0087
q2|bombRadiusMult: n=9 mean=0.1722 stdev=0.0671
q2|bossDamageBonus: n=6 mean=0.0483 stdev=0.0679
q2|bossDamageTakenMult: n=4 mean=-0.1225 stdev=0.0736
q2|critChance: n=15 mean=0.0533 stdev=0.0101
q2|dodgeChance: n=7 mean=0.0643 stdev=0.0176
q2|lifestealChance: n=11 mean=0.0555 stdev=0.0137
q2|luck: n=28 mean=1.2857 stdev=0.6468
q2|magnetRadius: n=6 mean=25.8333 stdev=3.4359
q2|meleeDamage: n=50 mean=1.1000 stdev=0.3000
q2|onKillHealChance: n=7 mean=0.0500 stdev=0.0076
q2|rangedDamage: n=51 mean=1.0980 stdev=0.2974
q2|shopDiscountBonus: n=7 mean=0.0657 stdev=0.0192
q2|speed: n=11 mean=0.0682 stdev=0.0587
q3|bossDamageBonus: n=5 mean=0.0940 stdev=0.0265
q3|critChance: n=5 mean=0.0820 stdev=0.0183
q3|dodgeChance: n=5 mean=0.0720 stdev=0.0098
q3|luck: n=11 mean=2.0909 stdev=0.5143
q3|magnetRadius: n=6 mean=30.0000 stdev=5.7735
q3|meleeDamage: n=25 mean=1.2400 stdev=0.4271
q3|onKillHealChance: n=4 mean=0.0700 stdev=0.0100
q3|rangedDamage: n=25 mean=1.2400 stdev=0.4271
q3|speed: n=5 mean=0.1140 stdev=0.0372
q3|venomChance: n=4 mean=0.0525 stdev=0.0083
q4|meleeDamage: n=6 mean=2.0000 stdev=0.0000
q4|rangedDamage: n=6 mean=2.0000 stdev=0.0000
```

**Trinkets** (20 groups) and **skill-tree stat nodes** (13 groups): full data
reproducible via the script; no flags in either. Notable sanity check: the
`meleeDamage`/`rangedDamage` item and trinket groups each contain exactly one
`-1` entry (a Berserker-style trade-off item/trinket) — correctly **not**
flagged, because `|-1| = 1` is below `2× mean (~1.94/~2.15)`, i.e. the
"genuine downside, not accidental" case the task asked to leave alone by
judgment; the script's dual-condition threshold happens to already exclude
it mechanically.

## Review: fixed vs. deliberately left alone

### Fixed

- **`downyfeather`** (Downy Feather, quality 1, `js/data/items-1.js` /
  `js/systems/items-1.js`) — speed coefficient `0.20` → `0.15`.
  **Why fixed, not discarded**: `downyfeather` and `speedup` are near-identical
  single-purpose quality-1 items — both are "+X% movement speed, nothing
  else, no drawback" (`speedup` is literally named "Speed Up", desc "+15%
  movement speed."). Having the two closest possible design peers at 20% vs
  15% for the same tier, same singular effect, no trade-off attached, reads
  as an authoring inconsistency (`downyfeather` is the very first item
  defined in `items-1.js`, plausibly predating the "+15%" convention that
  `speedup` and its later peers settled into), not an intentional design
  choice.
  **Why 0.15, not the script's raw suggestion (0.0992)**: the script's
  1.5×-mean clamp is a blunt default; the `q1|speed` group mean (0.066) is
  dragged down by ~50 unrelated items where speed is a minor secondary term
  on a multi-effect item (many flat `+0.05` contributions), not a fair
  comparison base for a *dedicated* speed item. Aligning to the closest true
  peer (`speedup`, 0.15) is the more defensible correction and keeps
  `downyfeather` exactly on par with its obvious sibling instead of
  under-cutting both of them below the dedicated-speed-item tier.

### Flagged but deliberately left alone

None — the script's only flag was the one above, and no other candidate
outlier surfaced on manual review of the unanalyzable list either (see
"Unanalyzable references" above for the judgment calls on those: the
luck-scaled status-chance quintet is already internally consistent at
0.10–0.12, `coinmagnet`'s non-linear formula and `bentnail`'s multiplicative
trade-off have no peer group to compare against, and the rest are plain
boolean gates with no magnitude to judge).

## Step 4 — Slayer-removal dangling-expression spot check

`feature-research/phase9-megaupdates/audit-remove-slayer.md` doesn't list
per-line references for the 1132 deleted formula terms in
`js/systems/items-1.js`, so this was a broad grep-based sample rather than a
targeted one, per the task's fallback instruction.

Checks run:
- `grep -nE '[+\-]\s*$'` (lines ending in a bare dangling operator) — 0 real hits (only false positives in comments/`for(...i++)` loops, not formula code).
- `grep -nE '\+\s*\+|\-\s*\-|\+\s*\)|\(\s*\+|\(\s*\)'` (double operators / empty parens) — 0 real hits (same false-positive sources).
- `grep -nE '\+\s*0\)|\+\s*0[,;]'` (leftover `+ 0` additive-zero terms) — 0 hits.
- Manual sample of 20 "`batch`"-comment sites across `items-1.js` (deterministic sample via `shuf --random-source`, spanning luck/speed/damage/on-kill-heal formula blocks) — all 20 read correctly: comment header immediately followed by real, syntactically sound formula code.
- One **cosmetic-only** finding: `items-1.js` line 689 — a "C-branch batch ... on-kill heal contributions" comment header immediately followed by another header comment ("newrewards-content batch trinkets ...") with no code between them. This is a batch whose entire code was deleted by the Slayer-removal pass but whose header comment wasn't (the audit's own write-up says header-comment cleanup only applied when a header had literally zero surviving code directly under it in the same paragraph — here the *next* header's code follows immediately after, so the dangling header slipped through that heuristic). **Zero functional impact** — a stray comment with no code under it is valid JS and changes nothing at runtime. Not fixed (out of scope: this is leftover-comment hygiene from a prior pass, not a balance issue, and the task said not to touch anything beyond confirming there's no dangling *code*).
- `node --check` on both `items-1.js` and `items-2.js`: **PASS** (also re-confirmed in the mandatory verification below).

**Conclusion**: no dangling/malformed expression syntax found from the
Slayer-removal pass. One harmless orphaned comment noted for awareness, not
fixed (no code/behavior impact).

## Verification (mandatory)

**1. `node --check` on every touched file:**
```
OK: js/systems/items-1.js
OK: js/systems/items-2.js
OK: js/data/items-1.js
OK: js/data/items-2.js
OK: js/data/items-3.js
OK: js/data/items-4.js
OK: js/data/items-5.js
OK: js/data/trinkets-1.js
OK: js/data/trinkets-2.js
OK: js/achievements/skilltree-characters.js
OK: js/achievements/skilltree-characters-2.js
OK: js/achievements/skilltree-general.js
```

**2. Re-ran the extraction script against post-fix files:** `ITEM outliers: 0
flagged`, `TRINKET outliers: 0 flagged`, `SKILL-TREE stat-node outliers: 0
flagged` (see "Script output" above). `q1|speed`'s stdev tightened slightly
(0.0461 → 0.0443) and its mean barely moved (0.0662 → 0.0654) — the fix
pulled the single outlier in without pushing it (or anything else) out the
other side; no new flags appeared anywhere else in the item/trinket/skill-tree
data.

**3. `vm`-harness smoke check of `recalcPlayerStats`** (`audit-balance-smoketest.js`
— loads the real script chain from `js/core/theme.js` through
`js/systems/items-2.js` in `index.html`'s actual order, then calls
`recalcPlayerStats` on 40 pseudo-random item/trinket combinations plus one
"every item + a trinket at once" stress case):

Post-fix run:
```
LOAD PHASE: PASS (74 scripts loaded through js/systems/items-2.js)
Full-inventory (all 864 items at once) stress case: PASS
Ran recalcPlayerStats 41 times (40 sampled combos + 1 full-inventory), 0 threw.
SMOKE TEST: PASS
```
Pre-fix run (downyfeather's coefficient temporarily reverted to 0.20, same
harness, then restored to 0.15 immediately after):
```
LOAD PHASE: PASS (74 scripts loaded through js/systems/items-2.js)
Full-inventory (all 864 items at once) stress case: PASS
Ran recalcPlayerStats 41 times (40 sampled combos + 1 full-inventory), 0 threw.
SMOKE TEST: PASS
```
(One pre-existing, unrelated `console.warn` prints on every run — "superboss
achievement count (550) does not match the reward pool size (575)" from
`achievements/logic.js` — this is a load-time sanity check baked into that
file already, unaffected by anything in this pass; not a new issue.)

**4. Counts unchanged**, confirmed two ways: the extraction script's own
counts, and a ground-truth `vm` load of the real data/achievement files:
```
ITEMS: 864 (both pre-fix and post-fix)
TRINKETS: 632 (both pre-fix and post-fix)
SKILL_TREE_NODES: 657 (unchanged — no skill-tree node was touched, 0 flagged)
```

## Deviations from the task brief

- The task's "handle both additive and the `? N : -N`-style two-sided
  trinket trade-off pattern" was interpreted as: detect and **classify**
  these (logged under "unanalyzable", not silently guessed at or force-fit
  into a group), since a two-sided trade-off's "coefficient" isn't a single
  comparable magnitude the same way a one-sided bonus is — the task's own
  Step 1.1 explicitly allows noting non-matching shapes as "not
  auto-analyzable" rather than guessing, and this shape is exactly that.
- The `downyfeather` fix uses a peer-matched value (0.15, `speedup`'s own
  coefficient) rather than the script's raw 1.5×-group-mean suggestion
  (0.0992) — explained above under "Fixed". This is the kind of judgment
  call Step 2 of the task explicitly asks for ("Use judgment; document every
  override decision").
- Everything else matched the brief as written; no other deviations.
