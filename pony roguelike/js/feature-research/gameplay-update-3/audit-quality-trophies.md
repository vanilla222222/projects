# Audit — Trophy quality re-tiering

## Files changed

- `js/data.js` — only the `quality:N` literal on trophy declaration lines
  (`slayertrophy_*` / `masterytrophy_*`, lines ~998–1577). No other field on any
  trophy was touched (id, name, icon, color, locked, unlockedBy, desc all
  unchanged). No non-trophy `ITEMS` entry was touched.

No other files were modified.

## Category re-count (verified against current file, not prior scouting)

| Category | Icon | Match rule | Count |
|---|---|---|---|
| Regular-enemy slayer trophies | 🏅 | `slayertrophy_*`, not `_boss_` | 220 |
| Boss slayer trophies | 🎖️ | `slayertrophy_boss_*` | 34 |
| Mastery Trophy I | 🏆 | `masterytrophy_*_t1` | 15 |
| Mastery Trophy II | 🏆 | `masterytrophy_*_t2` | 15 |
| **Total** | | | **284** |

Cross-checks run: every `slayertrophy_boss_*` id carries 🎖️ (0 exceptions); no
non-boss `slayertrophy_*` carries 🎖️ (0 exceptions); 🏆 count (30) exactly equals
`_t1` + `_t2` (15 + 15).

## Tier-assignment rule applied

Purely mechanical, by icon + id-suffix — no per-item judgement:

1. `slayertrophy_*` without `_boss_` (🏅) → **quality:1** — farming enough of one
   common enemy type; the plentiful common tier.
2. `masterytrophy_*_t1` (🏆) → **quality:2** — first-tier broad milestone.
3. `slayertrophy_boss_*` (🎖️) → **quality:3** — defeating a specific boss.
4. `masterytrophy_*_t2` (🏆) → **quality:3** — harder second-tier milestone.
5. **quality:4 → intentionally 0 trophies.** Grepped for a category harder than
   "defeat a specific boss": there are **no superboss trophies**. All 10 hits for
   `superboss` in `js/data.js` are in comments about *trinkets*/stars in the
   superboss reward pool, none in a `slayertrophy_*`/`masterytrophy_*` entry, and
   no trophy id, name, or `unlockedBy` references a superboss. Per the plan, q4
   was **not** force-populated; stating this explicitly rather than fabricating a
   bucket.

Per plan, `desc` and `color` were ignored as tier signals (confirmed mechanical
round-robin over a 15-effect / 6-color palette in declaration order).

## Distribution

**Trophies — before:** all 284 at `quality:1`.

**Trophies — after:**

| Quality | Count | Composition |
|---|---|---|
| 1 | 220 | regular-enemy slayer (🏅) |
| 2 | 15 | mastery Trophy I (🏆 `_t1`) |
| 3 | 49 | boss slayer (34, 🎖️) + mastery Trophy II (15, 🏆 `_t2`) |
| 4 | 0 | no category harder than boss-slayer exists |

**Non-trophy `ITEMS` (377) — unchanged by this pass**, verified identical before
and after: q1 = 259, q2 = 76, q3 = 31, q4 = 11.

**Whole-file totals after this pass** (trophies + real items, 661 entries):
q1 = 479, q2 = 91, q3 = 80, q4 = 11.

The q1 bucket drops from 543 to 479, and 64 trophies move up into the q2/q3
spawn-weight buckets.

## Representative samples

Regular-enemy slayer (🏅) → quality:1

- `slayertrophy_gravegrub`
- `slayertrophy_bonepicker`
- `slayertrophy_cryptslinger`
- `slayertrophy_shellbone`
- `slayertrophy_skullcharger`

Boss slayer (🎖️) → quality:3

- `slayertrophy_boss_warlord`
- `slayertrophy_boss_bonesentinel`
- `slayertrophy_boss_bonecaller`
- `slayertrophy_boss_gravechorus`
- `slayertrophy_boss_colossus`
- `slayertrophy_boss_brambleQueen`

Mastery Trophy I (🏆 `_t1`) → quality:2

- `masterytrophy_meleekills_t1`
- `masterytrophy_rangedkills_t1`
- `masterytrophy_critslanded_t1`
- `masterytrophy_bombsplaced_t1`
- `masterytrophy_shotsfired_t1`
- `masterytrophy_obstaclesdestroyed_t1`

Mastery Trophy II (🏆 `_t2`) → quality:3

- `masterytrophy_meleekills_t2`
- `masterytrophy_rangedkills_t2`
- `masterytrophy_critslanded_t2`
- `masterytrophy_bombsplaced_t2`
- `masterytrophy_shotsfired_t2`
- `masterytrophy_obstaclesdestroyed_t2`

## Verification performed

- `node --check js/data.js` → clean (run mid-pass and after the final fix).
- Trophy declaration count 284 before and 284 after.
- Non-trophy quality histogram byte-identical before/after (259/76/31/11).
- Boundary spot-checks: the comment block immediately preceding
  `slayertrophy_gravegrub` and the first `TRINKETS` entry (`rustybolt`)
  immediately after the trophy block are both untouched.
- One id, `slayertrophy_boss_brambleQueen`, uses camelCase and was missed by the
  first lowercase-only id pattern (283/284 matched). Caught by the post-pass
  count check and fixed to `quality:3`; final counts reconcile exactly.
