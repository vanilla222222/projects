# Audit — Mega Update A, step 5: the `js/data/items-4.js` slice (40 items)

One of four parallel content slices over
`feature-research/phase9-megaupdates/step5-target-items.md`. Scope: exactly the
40 rows whose `source file` is `items-4.js` — 30 `classSynergy`, 6 `combo`,
4 `tradeoff`. No row outside that quota was touched, no item was added or
removed, no item's assigned role was changed.

Note on `locked`: every item in `items-4.js` is `locked:true`/achievement-gated.
Per the infra audit's deviation 1 that is in scope and not a defect, so the
locked flags were left exactly as they were and the items redesigned normally.

## Files changed

| File | Change |
| --- | --- |
| `js/data/items-4.js` | 40 item entries: 30 gained a `classSynergy` map, all 40 gained a rewritten `desc` (class effects / combo hints / drawbacks). No other field on any entry touched. |
| `js/systems/items-synergy.js` | **Append-only**, below the `// --- NEW combos` marker: 4 new `SYNERGY_COMBOS` entries. Core functions, `ITEM_SYNERGY_FIELDS` and the clamp tables untouched (the only other change is the comma now terminating the last legacy entry, which the append required). |
| `js/systems/items-1.js` | 5 additive new terms in `recalcPlayerStats` (4 drawbacks, one of them in both the melee and ranged damage sums). No existing line altered. |
| `js/CODE_REFERENCE.md` | New `##### Step-5 content slice — data/items-4.js (40 items)` subsection under the existing step-5 `items-synergy.js` section. The general machinery was already documented by the infra pass, so nothing was duplicated. |
| `feature-research/phase9-megaupdates/verify-step5-synergy.js` | One line: `check(nCombo === 5, …)` relaxed to `>= 5`. See deviation 2. |
| `js/ui/ui.js` | **Not touched** — see deviation 1. |

## The 40 items

### classSynergy (30)

Class entries are authored only where the item genuinely reads differently;
3-4 classes each. Amounts sit well inside `ITEM_SYNERGY_FIELD_CLAMPS`, since
the clamp applies to the summed channel and these items stack with each other.

| item | what it now does per class |
| --- | --- |
| `ashencloak` | Changeling melts into the ash (+5% dodge), Bat Pony rides the draft (+8 speed), Zebra reads the omens (+1 Luck) |
| `ashensigil` | Filly / Changeling Queen make it beg (+5% charm), Griffin haggles with it (-5% more shop prices) |
| `ashentalisman` | Pony Bot / DNB Pony cycle it (-0.03 s cooldowns), Kirin burn it to soot (+5% poison) |
| `crackedamulet` | Bat Pony / Windigo wear the crack (+6% / +5% fear), Gargoyle shows the flaw to prey (+4% vulnerable) |
| `explorationtrophy_bombbarrel` | Diamond Dog / Mule hoard harder (+20 magnet), Engineer Pony re-packs the powder (+8% bomb radius) |
| `explorationtrophy_pushablebombbarrel` | Engineer Pony / Earth Pony shove it further (+10% bomb radius), Dragon breathes on it (+0.5 ranged damage) |
| `explorationtrophy_redfire` | Kirin / Dragon feed on embers (-0.03 s cooldowns), Windigo snuffs them (+4% freeze) |
| `explorationtrophy_spikedrock` | Breezie slings motes faster (+30 bolt speed), Kelpie gains reach (+8 melee range), Sea Pony hits heavier (+0.5 ranged damage) |
| `explorationtrophy_tallrock` | Pegasus / Breezie catch an updraft (+8 speed), Mule leans in instead (+0.5 melee damage) |
| `explorationtrophy_tintedrock` | Dragon / Alicorn scent bigger prey (+5% boss damage), Mule shrugs them off (-5% boss damage taken) |
| `explorationtrophy_turretn` | Kelpie / Changeling drink deeper (+4% / +5% lifesteal), Changedling feeds on the kill (+5% on-kill heal) |
| `explorationtrophy_turretplus` | Changeling Queen / Filly command it (+6% / +5% charm), Alicorn commands anything (+4% charm) |
| `explorationtrophy_turrets` | Zebra / Kelpie brew it stronger (+5% poison), Changedling spits it (+4% poison) |
| `explorationtrophy_turrettarget` | Bat Pony / Gargoyle make it a warning (+5% fear), Windigo makes it a chill (+4% fear) |
| `explorationtrophy_yellowfire` | Dragon / Kirin rekindle it (+0.5 ranged damage), Earth Pony swings it (+0.5 melee damage) |
| `fortunaterelic` | Unicorn divines it (+1 Luck), Griffin prices it (-5% shop prices), Crystal Pony refracts it (+4% crit) |
| `runicpendant` | Unicorn reads the runes (+5% crit), Engineer Pony reads the fuse (+10% bomb radius), Pony Bot runs the numbers (+0.25 crit multiplier) |
| `runicrelic` | Pony Bot / Unicorn keep the loop tight (-0.03 s fire cooldown), Earth Pony swings sooner (-0.03 s melee cooldown) |
| `weatheredidol` | Mule / Earth Pony hit like the idol looks (+6% / +5% stun), Diamond Dog prefers the follow-up (+0.5 melee damage) |
| `masterytrophy_activeitemuses_t1` | Alicorn / Unicorn channel it (+6% boss damage), Engineer Pony wires it to the trigger (-0.04 s cooldowns) |
| `masterytrophy_bombbarrels_t1` | Pegasus / Griffin outrun the blast (+10 / +8 speed), Mule stands in it and widens it (+10% bomb radius) |
| `masterytrophy_bombsplaced_t1` | Bat Pony / Changeling feed on the shrapnel (+5% lifesteal), Kirin packs more powder (+10% bomb radius) |
| `masterytrophy_critslanded_t1` | Breezie / Griffin sharpen the flight (+40 bolt speed), Sea Pony lands it heavier (+0.6 ranged damage), Kelpie gains reach (+8 melee range) |
| `masterytrophy_enemiesfrozen_t1` | Windigo turns dread to frost (+6% freeze), Gargoyle / Bat Pony simply loom (+6% / +5% fear) |
| `masterytrophy_meleekills_t1` | Earth Pony / Diamond Dog count kills not coins (+0.6 melee damage), Zebra reads the tally as fortune (+1 Luck) |
| `masterytrophy_obstaclesdestroyed_t1` | Changeling Queen / Filly win the room over (+6% charm), Diamond Dog settles it with rubble (+5% stun) |
| `masterytrophy_rangedkills_t1` | Unicorn / Dragon put it behind the shot (+0.6 ranged damage), Griffin puts it into the flight (+40 bolt speed) |
| `masterytrophy_shotsfired_t1` | Kirin / Zebra cure their tips (+6% poison), Changedling does it by instinct (+5% poison) |
| `masterytrophy_swarmerdnb_t1` | DNB Pony / Pony Bot keep tempo (-0.04 s fire cooldown), Pegasus swings sooner (-0.04 s melee cooldown) |
| `masterytrophy_turretsdestroyed_t1` | Engineer Pony / Earth Pony pack the charge (+12% / +10% bomb radius), Pony Bot reroutes the salvage into boss killing (+6% boss damage) |

### combo (6 items -> 4 new `SYNERGY_COMBOS` entries)

All `stage:'post'` (stage omitted, the default). Each participating item's desc
now names its combo.

| combo | requires | grants | source hint |
| --- | --- | --- | --- |
| `turretSweep` | `explorationtrophy_turrete` + `explorationtrophy_turretw` + `explorationtrophy_turretx` | +4% crit, +4% stun, +4% freeze | folds the `crit-2`/`stun-1`/`freeze-1` turret trophies into one "full firing arc" |
| `frostboundCrown` | `gildedcrown` + `explorationtrophy_turretx` | +6% freeze, +3% lifesteal | `freeze-1` |
| `weightedPrecision` | `heavyamulet` + `explorationtrophy_turrete` | +4% crit, +0.25 crit multiplier | `crit-2` |
| `prospectorsHoard` | `anyOf`: [`explorationtrophy_rock`] and [`luckup`, `ascendantcharm`, `puritycharm`, `gildedcompass`] | +1 Luck, +15 magnet radius | `luck-1`; the second group is cross-slice **by id string only** — no other data file was edited |

Every effect amount is inside its channel's clamp (`critMultiplier` ±1,
`magnetRadius` ±40, `luck` ±3, percentage fields ±0.25); asserted by the probe
harness below.

### tradeoff (4)

All quality 3, all pure upside before this pass. Each drawback is an additive
negative term in `recalcPlayerStats` following the existing
`- 1 * (p.spiderring || 0)` convention, tagged in-code with
`Mega Update A step 5 (items-4.js slice)`, and stated in the item's `desc`.

| item | upside | drawback (and where it lives) |
| --- | --- | --- |
| `masterytrophy_meleekills_t2` | +5% movement speed | -1 tile of attack range — `- 1 * (p.…)` in `rangeBonusTiles`; melee only loses 25% of it, via the same `rangeScale` that governs the upside version of this stat |
| `masterytrophy_rangedkills_t2` | attacks/shots recharge 5% faster | -1 damage to all attacks — the same term added to BOTH the `meleeDamage` and `rangedDamage` sums, inside their existing `Math.max(0.5, …)` floor |
| `masterytrophy_critslanded_t2` | +5% damage against bosses | +10% damage TAKEN from bosses — `+ 0.10 * (p.…)` on `bossDamageTakenMult`, the one additive term in a formula of subtractions; its `Math.max(0.25, …)` is a floor on the multiplier, so a penalty is never clipped |
| `masterytrophy_bombsplaced_t2` | +5% critical hit chance | -15% bomb blast radius — `- 0.15 * (p.…)` on `bombRadiusMult` ("traded powder for aim") |

No `classSynergy` was used to express a drawback: a `classSynergy` penalty only
lands on the classes it names, and a Soy-Milk drawback has to apply to everyone
who picks the item up.

## Verification

| # | Check | Result |
| --- | --- | --- |
| 1 | `node --check` on `js/data/items-4.js`, `js/systems/items-synergy.js`, `js/systems/items-1.js`, `verify-step5-synergy.js` | PASS |
| 2 | `node feature-research/phase9-megaupdates/verify-step5-synergy.js` — (a) OLD vs NEW equivalence | 2260 comparisons, 80 mismatches — **all 80 are another slice's new combo flags** (`rotwardensVigilActive`, `frostboundHushActive`, `maskedCourtActive`, `prospectorsEyeActive`), each `old=undefined new=false`, 4 flags x 5 classes x 2 saves x 2 calls. Zero originate in this slice; none of this slice's combos declares a flag. See open risks. |
| 3 | same harness — (b) no drift across 8 repeated recalcs | PASS — 0 drift mismatches |
| 4 | same harness — (c) all 5 legacy flags on a full-synergy save, none on a bare save, 5 classes | PASS, with the legacy numbers unchanged (`meleeDamage=4.6` / `critMultiplier=2.4` for earth, etc. — identical to the infra audit's table) |
| 5 | same harness — (d) `ITEM_LIST.length` | **864 — unchanged** |
| 6 | same harness — (e) live smoke of both new layers | PASS — no drift, stats unwind exactly to a fresh player's values |
| 7 | Slice probe (scratchpad `probe4.js`, run against the real `index.html` script order): all 40 quota items exist; the 30 classSynergy rows carry only real `classId`s and only `ITEM_SYNERGY_FIELDS` fields with non-zero amounts; the 6 combo rows and 4 tradeoff rows carry NO `classSynergy` (role integrity); all 4 combos are registered, default to `stage:'post'`, declare no flag, reference only real item ids, and every effect is within its channel clamp | **PASS — 411 assertions, 0 failures** |
| 8 | Same probe, live: Earth Pony + `explorationtrophy_yellowfire` = base +1 flat +0.5 classSynergy and unwinds to base on drop; the same item on Pegasus (no entry) gives only the flat +1; Turret Sweep fires with all three trophies (+0.04 on crit/stun/freeze on top of the items' own numbers), switches off when one piece is dropped, and fully unwinds; each of the 4 drawbacks moves its stat by exactly the intended amount over 8 recalcs and restores the pristine value when the item is dropped | PASS (included in the 411) |

Per project convention, no heavy browser smoke-testing — the user verifies by
playing. (The harness still prints the pre-existing, unrelated
`achievements.js: superboss achievement count (550) …` warning; it predates
this work.)

## Deviations

1. **The 4 new combos declare no `flag`, and `js/ui/ui.js` was not touched.**
   The dispatch allows skipping `flag`, and here it was forced: a badge needs
   both a `SYNERGY_BADGES` entry in `ui.js` **and** a `<span class="synergy-badge">`
   in `index.html`'s `#synergyBar`, and `index.html` is not in this slice's
   permitted edit set. A flag with no span is set but never rendered, which is
   worse than no flag. Instead every participating item's `desc` names its
   combo by name ("Turret Sweep", "Frostbound Crown", "Weighted Precision",
   "Prospector Hoard"), so the synergy is discoverable before pickup.
2. **`verify-step5-synergy.js`'s `check(nCombo === 5, …)` relaxed to `>= 5`.**
   That assertion encodes the infra pass's own state ("this pass adds no
   content") and every content slice necessarily breaks it — it failed on the
   first run of this slice with 9 combos registered. The legacy guarantee that
   actually matters (the 5 legacy combos survive, unchanged) is enforced by
   sections (a) and (c), which still pass. The sibling `nSyn` line was already
   a bare `console.log` with no assertion and needed no change.

## Open risks

- **The harness's OLD-vs-NEW section (a) now reports 80 mismatches that no
  single slice can fix.** They are all `<flag>Active: old=undefined new=false`
  for four flags introduced by another slice's combos: the OLD bundle omits
  `items-synergy.js` entirely, so a *newly named* boolean can never exist there.
  This is a harness-design limitation, not a behaviour change — no numeric field
  mismatches, and section (b)/(c)/(e) are clean. The clean fix is for the
  harness to compare only fields present in OLD, or to seed OLD with `false`
  for every registered combo flag; that belongs to whoever owns the harness, so
  it is flagged here rather than patched from inside a content slice.
- **HUD badge capacity is still unaddressed** (carried over from the infra
  audit). If a later pass opens `index.html`, the four combos above are ready
  to take flags: `turretSweepActive`, `frostboundCrownActive`,
  `weightedPrecisionActive`, `prospectorsHoardActive`.
- **`prospectorsHoard` reaches across slices by id string.** If the `items-1.js`
  or `items-2.js` slice builds its own `luck-1` combo over the same partner
  items, both fire together. That is safe — the `luck` channel is clamped to ±3
  per layer for the summed contribution — but the two designs were never
  reconciled, by instruction (no live coordination between slices).
- **No clamp was widened**, and nothing in this slice comes close to one: the
  largest single contribution is `boltSpeed` 40 against a ±60 clamp, and
  `bombRadiusMult` 0.12 against ±0.25. Two `bombRadiusMult` classSynergy items
  owned at once by an Engineer Pony (0.12 + 0.10 + 0.10 + 0.08) would reach
  0.40 and be clipped to 0.25 — deliberate, and the reason the per-item numbers
  were kept this small.
- The step-5 layers apply after `applySkillTreeStatBonuses`, so these bonuses
  are additive on top of the skill tree's multiplicative ones (infra audit's
  open risk, unchanged here — it is why the amounts are sized as flat nudges).
