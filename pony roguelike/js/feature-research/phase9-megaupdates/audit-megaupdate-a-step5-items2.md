# Audit — Mega Update A, step 5: the `items-2.js` slice (40 items)

Scope: the 40 rows of `feature-research/phase9-megaupdates/step5-target-items.md`
whose `source file` is `js/data/items-2.js` — **29 `classSynergy` + 11 `combo`,
zero `tradeoff`** (confirmed against the table; the infra audit's deviation 4
redistributed this file's tradeoff share to `items-5.js` because `items-2.js`
has no quality-3/4 non-`attackLayer` items). No item outside those 40 rows was
touched, no role was changed, no item added or removed.

## Files changed

| File | Change |
| --- | --- |
| `js/data/items-2.js` | 29 items gained a `classSynergy` map; all 40 items' `desc` updated to state the new behaviour in-fiction. |
| `js/systems/items-synergy.js` | **Append-only**, below the `// --- NEW combos` marker: 4 new `stage:'post'` `SYNERGY_COMBOS` entries. Core functions, clamp tables and `ITEM_SYNERGY_FIELDS` untouched. |
| `js/CODE_REFERENCE.md` | New "Step-5 content slice — `data/items-2.js` (40 items)" subsection. |
| `feature-research/phase9-megaupdates/audit-megaupdate-a-step5-items2.md` | This file. |

`js/systems/items-1.js` was **not** touched (no tradeoff rows, so no new recalc
term). `js/ui/ui.js` and `index.html` were **not** touched — see deviation 1.

## The 40 items

### `classSynergy` (29)

| item | classes -> field: amount |
| --- | --- |
| `amberfragment` | seapony/kelpie `speed` +8, crystalpony +7, diamonddog/mule +6 — slow legs get the give |
| `antiturretplating` | ponybot `dodgeChance` +0.08, engineerpony +0.06, gargoyle/crystalpony +0.04 — machine frames bolt it on |
| `bloodstoneamulet` | batpony/changeling `lifestealChance` +0.06, changelingqueen/zebra +0.05 — the drinker breeds |
| `coinpurse` | mule/diamonddog `shopDiscountBonus` +0.05, crystalpony `dealDiscount` +0.04 — the coin-starting classes haggle |
| `discountcharm` | mule/crystalpony `shopDiscountBonus` +0.05, diamonddog +0.04, engineerpony `dealDiscount` +0.05 |
| `emeraldfeather` | filly `charmChance` +0.06, changeling/changelingqueen +0.05, alicorn +0.04 |
| `emergencyrations` | ponybot `fireCooldown` -0.04 (burns them as fuel — it can hold no heart), kirin `dodgeChance` +0.06, breezie +0.05 |
| `etchedseal` | unicorn/alicorn `magnetRadius` +25, crystalpony/kirin +20 — horns tug harder |
| `gildedtrinket` | mule/diamonddog `meleeDamage` +0.6, crystalpony `rangedDamage` +0.6, dnbpony +0.4 — gold-minded breeds |
| `goldenbrooch` | alicorn/changelingqueen/dragon `rangedDamage` +0.6, griffin +0.4 — worn by the proud |
| `gustwovenveil` | pegasus/hypogriff/griffin/alicorn `speed` +8, breezie +6 — wings ride the weave |
| `hardenedscales` | dragon/kelpie `dodgeChance` +0.06, seapony/gargoyle +0.05 — scaled and stone hides |
| `hollowtoken` | changedling `rangedDamage` +0.6, changeling/gargoyle +0.5, batpony `meleeDamage` +0.5 |
| `hoofwraps` | earth/mule/kelpie/diamonddog `speed` +8, filly +6 — ground-bound melee breeds |
| `huntersfocus` | griffin/gargoyle `bossDamageBonus` +0.08, hypogriff/batpony +0.06 |
| `ironprism` | batpony `fearChance` +0.06, gargoyle/changedling/windigo +0.05 |
| `jadecrown` | diamonddog `bombRadiusMult` +0.15, mule/engineerpony +0.12, dnbpony +0.1 |
| `junkyardmagnet` | engineerpony/ponybot `magnetRadius` +30, diamonddog/mule +20 |
| `quickstepcharm` | griffin/dnbpony `fireCooldown` -0.04, ponybot -0.03, pegasus/batpony `meleeCooldown` -0.04 |
| `quietorb` | batpony/changeling `onKillHealChance` +0.06, gargoyle/zebra +0.05 — stalkers (a different channel from `bloodstoneamulet`'s lifesteal, on purpose) |
| `sapphiretiara` | unicorn/alicorn `boltSpeed` +40, crystalpony/kirin +35 — worn on a horn |
| `solarfeather` | griffin/breezie `boltSpeed` +40, alicorn/gargoyle +30 — winged shooters |
| `solartrinket` | filly/crystalpony `magnetRadius` +25, alicorn/pegasus +20 |
| `steadfastheart` | kirin/breezie `dodgeChance` +0.06, ponybot +0.05, zebra +0.04 — the frailest learn to slip hits |
| `sunkissedpelt` | ponybot/kirin `dodgeChance` +0.08 (both `noRedContainers`, so the container itself does nothing for them), crystalpony `bossDamageTakenMult` -0.05 |
| `swarmrepellent` | breezie/filly `speed` +8; **changeling/changedling/changelingqueen `speed` -4** — the repellent stings bug-blooded ponies too (stated in the desc) |
| `tidecallersscale` | seapony `boltSpeed` +45, windigo +30, crystalpony +25, kelpie `meleeRange` +10 |
| `wanderingchain` | diamonddog `bombRadiusMult` +0.15, mule +0.12; swung instead of lit: kelpie `meleeRange` +8, earth +6 |
| `whisperingband` | griffin/breezie/engineerpony `multishotExtra` +1 (the three lightest shooters), earth `meleeRange` +6 |

### `combo` (11 items -> 4 entries)

| combo id | items | effects | group hint honoured |
| --- | --- | --- | --- |
| `rotwardensVigil` | `hollowcompass`, `roaringcoin`, `venomouskiss` | `venomChance` +0.06, `vulnerableChance` +0.05 | venom-1 |
| `frostboundHush` | `braidedinsignia`, `whisperingidol`, `smokebomb` | `freezeChance` +0.05, `stunChance` +0.05 | freeze-1 + stun-1 merged |
| `maskedCourt` | `mesmerizingveil`, `dreadcloak` | `charmChance` +0.05, `fearChance` +0.05 | charm-fear-1 |
| `prospectorsEye` | `coincollectorsglove`, `gildedcompass`, `keeneye` | `luck` +1, `critChance` +0.04, `shopDiscountBonus` +0.04 | economy-1 + crit-1 + luck-1 merged |

All four are pure `items` ("own all") tests, `stage:'post'` (omitted, the
default), and reference only `items-2.js` item ids — no cross-file dependency,
so no other slice's file is implicated. Every participating item's `desc` names
its combo by name.

## Verification

| # | Check | Result |
| --- | --- | --- |
| 1 | `node --check js/data/items-2.js`, `js/systems/items-synergy.js`, `js/ui/ui.js` | PASS |
| 2 | `node feature-research/phase9-megaupdates/verify-step5-synergy.js` | **ALL PASS (9842 assertions, 0 failures)** — incl. OLD-vs-NEW equivalence for the 5 legacy synergies and the 0-drift check over 8 repeated recalcs |
| 3 | `ITEM_LIST.length` | **864** — unchanged |
| 4 | Every `classSynergy` key is a real `CLASSES` id; every `field` is in `ITEM_SYNERGY_FIELDS` | PASS — 0 bad references across the 29 items / 118 class entries |
| 5 | Every id in the 4 new combos' `items` arrays resolves in `ITEMS` | PASS |
| 6 | 40 rows covered, exactly the ones the target table assigns to `items-2.js` | PASS — 29 `classSynergy` maps present in the file, 11 combo items' descs updated |

(The harness prints the pre-existing, unrelated `achievements.js: superboss
achievement count (550) does not match the reward pool size (575)` warning on
load; it predates this pass.) Per project convention: light sanity checks only,
no browser smoke-testing — the user verifies by playing.

## Deviations

1. **No combo declares a `flag`, and `ui/ui.js` was left untouched** — the
   dispatch permitted adding badges there. First implementation *did* add all
   four flags plus a `SYNERGY_BADGES` extension that lazily creates the missing
   `#synergyBar` spans from JS (so `index.html`, outside the permitted set,
   would not need editing). It was reverted because it **broke the required
   0-failure verification**: `verify-step5-synergy.js`'s section (a) diffs every
   field on the player between the OLD build (which omits `items-synergy.js`
   entirely) and the NEW one, so each new boolean flag reads as
   `old=undefined new=false` — 4 flags x 5 classes x 2 saves x 2 calls = **80
   failures**, with zero numeric differences among them. Given the hard rule
   that the harness stays at 0 failures and that the harness is not in this
   slice's edit set, the flags were dropped (the same conclusion the
   `items-4.js` slice reached for a different reason). The combos still work;
   only the HUD badge is missing.
2. **Combo group hints were merged rather than followed one-for-one.** The
   `items-2.js` rows carry a single `freeze-1` item, a single `crit-1` item, a
   single `luck-1` item and a single `economy-1` item, none of which forms a
   combo on its own. Rather than reaching into other slices' files, they were
   merged into two thematically coherent combos (`frostboundHush`,
   `prospectorsEye`). The column is documented as a suggestion.

## Open risks / notes

- **New combo flags are currently un-addable.** Until `verify-step5-synergy.js`
  learns to ignore fields that are absent in OLD and `false` in NEW (or the
  new-flag set is whitelisted), no step-5 combo anywhere can declare a `flag`
  without failing the harness. That also means the HUD-badge open risk from the
  infra audit is now *blocked*, not merely unaddressed. Recommended fix: treat
  `old === undefined && new === false` as equal in section (a).
- **`rotwardensVigil`'s `vulnerableChance` does not feed the legacy Rot & Ruin
  or Marksman's Eye conditions.** Those are `stage:'legacy'` and evaluated in
  place inside `recalcPlayerStats`, before `applyItemComboSynergies` runs at the
  end; the next recalc re-derives `vulnerableChance` from items, so the combo's
  contribution never participates in a legacy condition. This is the documented
  design (see the infra audit's equivalence section) and no desc claims
  otherwise — but it is a trap for anyone who later reads the combo as an
  enabler for Rot & Ruin.
- **Clamp pressure, by design.** Owning *every* item in this slice at once would
  push 5 class/field pairs past their clamp (crystalpony/alicorn `magnetRadius`
  45 vs 40, alicorn `boltSpeed` 70 vs 60, kelpie `meleeRange` 18 vs 16,
  diamonddog `bombRadiusMult` 0.30 vs 0.25). The layer clamps the sum, so they
  simply cap out. No clamp was widened. That said, `classSynergy` is a *single
  shared budget per field across all 250 redesigned items* — with four slices
  authoring into it in parallel, common channels (`speed`, `dodgeChance`,
  chance fields) will realistically saturate late in a run, which makes the
  marginal item feel dead. If that reads badly in play, the fix is a per-item or
  per-source-file sub-budget in the layer, not a bigger clamp.
- `swarmrepellent`'s negative entry is the only negative `classSynergy` in this
  slice. It is small (-4 px/s, ~2.5% of a changeling's speed) and stated in the
  desc, but it is the first item in the game that is actively *worse* for a
  class through this layer — worth a play-test look.
