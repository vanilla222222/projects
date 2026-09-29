# Reaction families: implementation audit

## Files changed

Project:
- `js/reaction-rules-extra3.js` (new, 423 lines): tag and guard extensions, `rxz*` helpers, five rules.
- `js/reaction-rules-extra2.js`: a `deamination` branch (H₃PO₂) in `rxyRuleDiazonium`. This is the only edit to this file.
- `js/reaction-rules-extra.js`: one entry, `C16H19ClSi: 'TBDPS'`, in the silyl name map inside `rxxRuleProtection`.
- `js/reactions.js`: six `REACTION_ADDITIVES` entries (hno3, so3, h3po2, ddq, can, tmschn2) and 14 `REACTION_NAME_ALIASES`.
- `index.html`: `<script src="js/reaction-rules-extra3.js">` after `js/reaction-aromatic.js`, before `js/retro.js`.
- `CODE_REFERENCE.md`: a new section "Update, later session (42) — reaction families" with a Slice A sub-section. The session-37 rule-count line now points to 96.
- `complexities.md`: a table row for `js/reaction-rules-extra3.js` and a session-42 note on the edited files.
- `feature-research/reaction-families/audit.md` (this file) and `feature-research/reaction-families/screenshots/nitration.png`.
- Slice B: `js/retro.js` (25 new transforms for 53 in total, 11 `RETRO_REAGENTS`, new helpers, `ids` in `retroPieces`, the protecting-group ranking penalty, and `RETRO_DROPPED_TRANSFORMS` now holding `hydro-deamination` instead of `eas-nitration`).
- Slice B: `js/retro-view.js`, where only the `RETRO_VIEW_COVERAGE` text changed.
- Slice B: `CODE_REFERENCE.md` (a Slice B sub-section, plus pointers from the session-41 transform count and the dropped-transform line), `complexities.md` (the retro.js and retro-view.js rows, and a Slice B note), and `feature-research/reaction-families/screenshots/retro-suzuki.png`.

Session scratchpad (test harness, outside the repo):
- `regress/rebuild2.sh` and `build_retro.sh` now add `js/reaction-rules-extra3.js` after `js/reaction-aromatic.js`.
- `regress/test_reaction_rules.js`: rule count 91 → 96, plus the Slice A block.
- `shot_nitration.py` (new) takes the screenshot. `probe_a.js` (new) is a probe only.
- Slice B: `test_retro.js` has 23 new targets, coverage for the 25 new transforms and the Slice B checks; its Slice A copy is `test_retro.slicea.bak`. `shot_retro_suzuki.py` (new) takes the screenshot. `probe_sb.js`, `p1.js`–`p5.js`, `helpers_b.js` and `transforms_b.js` are probes only.

## Slice A

### New outcomes, scores and precedence
| Outcome | Trigger | Score | Precedence notes |
|---|---|---|---|
| `nitration` | HNO₃ (`nitricAcid`) + H₂SO₄ + arene | 13; 11 if deactivated | Site, minor product and ratio come from `rxaEasPlan(s, {protonate: true})`, i.e. `rxEasPosition` for a lone benzene ring. Toluene gives 4-nitrotoluene with 2-nitrotoluene as minor, 65:35. Nitrobenzene gives 1,3-dinitrobenzene with a "forcing conditions" warning at 11. Anisole gives the para product (90:10), chlorobenzene gives p/o (85:15), naphthalene gives 1-nitro (80:20). Phenol and aniline get warnings. HNO₃ alone gives a hint. A π-deficient ring gives a hint instead of a product. No automatic dinitration. |
| `sulfonation` | `so3` additive (or charge-separated O₃S) + arene | 13; 11 if deactivated | It needs SO₃, so plain H₂SO₄ still gives dehydration (11) and hydration (10); both are verified by tests. |
| `desulfonation` | ArSO₃H + strong acid + water, T ≥ 100 °C | 14 | Below 100 °C it gives a hint. |
| `deamination` | ArNH₂ or ArN₂⁺ + `h3po2` (with NaNO₂/HCl for the amine) | 15 | Checked before the water/phenol branch. 4-Methylaniline gives toluene. |
| `fmoc-protection` / `cbz-protection` | Fmoc-Cl/Fmoc-OSu or CbzCl + amine | 15 | Warns if a chloroformate has no base. Beats acyl substitution (13). |
| `fmoc-deprotection` | Fmoc carbamate + piperidine/DBU additive, a C₉H₁₆N₂ species or a secondary-amine substrate | 15 | By-products: dibenzofulvene adduct and CO₂. |
| `pmb-protection` | PMBCl + NaH (alcohol) or NaH/K₂CO₃/hydroxide (phenol) | 15 | Beats Williamson (13). Warns if no polar aprotic solvent (DMF, DMSO, MeCN, acetone) is chosen. |
| `pmb-deprotection` | PMB ether + DDQ or CAN | 15 | By-product 4-methoxybenzaldehyde. Warns if no water. Plain benzyl ethers are not matched. |
| `tbu-ester` | acid + isobutylene + strong acid, or acid + Boc₂O + DMAP (no amine present) | 15 | The DMAP route is skipped when an amine is present, so boc-protection keeps priority. |
| `tbu-ester-deprotection` | tBu ester + strong acid (TFA) | 15; 16 with Boc | When a Boc group is present, one outcome removes both, with a warning. At 16 it beats boc-deprotection (15). |
| `methyl-ester` | acid + TMSCHN₂ (MeOH warning), or acid + MeBr/MeI + weak base | 15 | |

Existing rules confirmed by tests, no code change:
- TBDPS: `silyl-protection` and `silyl-deprotection`, with the name now "TBDPS";
- Cbz and PMB removal with H₂/Pd-C: `hydrogenolysis`;
- methyl ester with LiOH: `saponification`, giving lithium phenylacetate and methanol.

### Deviations and drops
- **H₃PO₂** cannot be represented: the parser loses the P–H count and gives HO₂P. It is an additive-only tag with no formula tag.
- **SO₃** as `O=S(=O)=O` fails the valence check. The `so3` additive has no SMILES; the `O3S` formula tag covers charge-separated input such as `[O-][S+2]([O-])=O`.
- **CAN** is additive-only (no SMILES).
- **Additive labels** follow the code convention of ASCII (`HNO3`, `SO3`, …). The display `name` uses subscripts (HNO₃, "SO₃ / fuming H₂SO₄").
- **No LiOH additive** was added. LiOH as a reagent compound already works through saponification, and the plan listed none.
- **No nitration mechanism.** No EAS mechanism exists anywhere, and the plan allows skipping it.
- **Aniline nitration** shows the o/p product with the anilinium/acetanilide warning. It does not switch to meta.
- **Rule ids vs outcome ids:** the five `RX_RULES` ids are `nitration`, `sulfonation`, `carbamate-protection`, `pmb-protection`, `ester-protection`.
- **Reagent equivalents:** the Fmoc/Cbz/PMB reagents need 1.1 equiv, TMSCHN₂ 1.2, and Boc₂O and MeI 1.5. At 1 equiv the existing stoichiometry layer adds an "not enough" warning, which is intended.
- **Fmoc product names** come from the naming engine and are unusual, e.g. "((9H-fluoren-9-yl)methyloxy)-phenylmethylaminomethanone". Two protection tests therefore assert the outcome id only.
- **Known issue, pre-existing and not changed:** `hydrogenolysis` lists "toluene" as the by-product even for a PMB ether, where it should be 4-methylanisole.
- `js/reaction-rules-extra.js` was edited by one map entry (TBDPS), which the plan allows only if needed; it is needed for the "TBDPS" name.
- `js/retro.js` was not touched (Slice B). `eas-nitration` stays dropped, and test_retro still reports nitrobenzene as a KNOWN GAP.

### Test commands and results
```
S=/tmp/claude-1000/-home-vanilla-Downloads-projects-chem-lab/e56d4730-7148-4eaa-be8a-05e91aa1103e/scratchpad
bash $S/regress/rebuild2.sh && bash $S/build_retro.sh
cd $S/regress && node test_reaction_rules.js    # 556 ok, 0 FAIL, exit 0
cd $S/regress && bash runall.sh                 # 37 files, 0 failed
cd $S && node test_retro.js                     # PASS 371 FAIL 0
/tmp/claude-1000/-home-vanilla-Downloads-chem-lab/4e3c5c08-ce91-40e0-8183-6481a8aa05f0/scratchpad/pwenv/bin/python $S/shot_nitration.py   # errors: []
```

test_retro per-target times (ms):

| Target | Routes | Time |
|---|---|---|
| 2-butanol | 7 | 44 |
| cyclohexanol | 5 | 13 |
| 2-methyl-2-butanol | 5 | 11 |
| 1-bromobutane | 4 | 7 |
| ethyl acetate | 2 | 5 |
| N-methylacetamide | 1 | 2 |
| acetophenone | 2 | 8 |
| benzoic acid | 3 | 6 |
| cyclohexene | 4 | 31 |
| butanenitrile | 3 | 4 |
| diethyl ether | 1 | 4 |
| nitrobenzene | 0 (known gap) | 1 |
| aniline | 1 | 3 |
| cyclohexane | 1 | 4 |
| butadiene + maleic anhydride adduct | 4 | 24 |

The screenshot `screenshots/nitration.png` shows the Reaction lab (dark theme, 1440×1000) with toluene and the HNO₃ and H₂SO₄ chips on. It shows the 4-nitrotoluene card (~65 %) and the 2-nitrotoluene minor card (~35 %), the ~65 %/~35 % labels in the scheme, and the mononitration warning. There were no page errors or console errors.

## Slice B

### Transforms added (25; `RETRO_TRANSFORMS` 28 → 53)
| Group | Transform → forward rule |
|---|---|
| Aromatics | `eas-nitration` → `nitration`, `eas-sulfonation` → `sulfonation`, `snar` → `snar`, `sandmeyer` / `schiemann` / `diazonium-iodide` / `diazonium-phenol` / `azo-coupling` → `diazonium` |
| Couplings | `suzuki`, `heck`, `sonogashira`, `buchwald-hartwig` → rules of the same name |
| Enolates | `enolate-alkylation`, `michael`, `robinson`, `mannich` → rules of the same name; `claisen` and `dieckmann` → `claisen` |
| Protecting groups | `boc-install` / `silyl-install` → `protection`, `cbz-install` / `fmoc-install` → `carbamate-protection`, `benzyl-ether-install` → `williamson` (PMB: `pmb-protection`), `acetal-install` → `acetal`, `tbu-ester-install` → `ester-protection` |

New `RETRO_REAGENTS`: boc2o, cbzcl, fmoccl, tbscl, tbdpscl, tipscl, bnbr, pmbcl, isobutylene, ethyleneGlycol and propanediol. Every protecting-group candidate has a ranking penalty of 2 (`RETRO_LIMITS.protectingGroupPenalty`). `retroCompare` sorts on `rank.adjusted = largest + penalty` first.

### Targets, routes and timings
All 23 plan targets have their named route. Each target took 2–221 ms, well under the 1.5 s limit. An asterisk marks a minor route.

| Group | Target | Routes | Required route | Time (ms) |
|---|---|---|---|---|
| Aromatics | 4-nitrotoluene | 1 | eas-nitration | 3 |
| Aromatics | benzenesulfonic acid | 1 | eas-sulfonation | 3 |
| Aromatics | 2,4-dinitroanisole | 4 (nitration, nitration*, snar ×2) | snar, eas-nitration | 14 |
| Aromatics | 4-chlorotoluene | 2 | sandmeyer | 8 |
| Aromatics | fluorobenzene | 1 | schiemann | 4 |
| Aromatics | iodobenzene | 1 | diazonium-iodide | 3 |
| Aromatics | 4-methylphenol | 1 | diazonium-phenol | 3 |
| Aromatics | 4-hydroxyazobenzene | 2 | azo-coupling | 18 |
| Couplings | 4-methylbiphenyl | 2 (both orientations) | suzuki | 7 |
| Couplings | methyl cinnamate | 13 | heck | 71 |
| Couplings | diphenylacetylene | 1 | sonogashira | 4 |
| Couplings | N-phenylmorpholine | 1 | buchwald-hartwig | 4 |
| Enolates | 2-methylcyclohexanone | 6 | enolate-alkylation | 10 |
| Enolates | diethyl 2-(3-oxobutyl)malonate (replaced target) | 8 | michael | 39 |
| Enolates | ethyl acetoacetate | 4 | claisen | 7 |
| Enolates | ethyl 2-oxocyclopentanecarboxylate | 7 | dieckmann | 14 |
| Enolates | 4a-methyloctalone (Robinson) | 5 | robinson | 221 |
| Enolates | 3-(dimethylamino)-1-phenylpropan-1-one | 5 | mannich | 13 |
| Protecting groups | N-Boc-piperidine | 3 | boc-install | 15 |
| Protecting groups | cyclohexyl TBS ether | 3 | silyl-install | 6 |
| Protecting groups | benzyl cyclohexyl ether | 4 (2 minor) | benzyl-ether-install | 10 |
| Protecting groups | 2-methyl-2-phenyl-1,3-dioxolane | 1 | acetal-install | 5 |
| Protecting groups | tert-butyl benzoate | 3 | tbu-ester-install | 6 |

The original 15 targets keep their required routes. Their times are 2–47 ms. Nitrobenzene now has one route (eas-nitration, 3 ms) instead of the known gap. The common-name index is built once, in about 176 ms, outside the per-target times.

### Replaced target and drops
- **Replaced target.** The plan's Michael target was 2-(3-oxobutyl)cyclohexanone, and it is replaced by diethyl 2-(3-oxobutyl)malonate (`CCOC(=O)C(CCC(C)=O)C(=O)OCC`, from diethyl malonate + MVK with NaOEt). The forward `michael` rule (`rxxRuleMichael`) accepts only active-methylene donors. Cyclohexanone + MVK under base gives the `robinson` outcome instead, so a Michael step to the simple ketone adduct cannot re-verify. For the original target, any such proposal fails verification and is dropped. It still gets 8 other verified routes (enolate alkylation, hydrogenation, alcohol oxidation), but none of them is a Michael route.
- **Dropped transform:** `hydro-deamination` (ArH ← ArNH₂ with H₃PO₂) is in `RETRO_DROPPED_TRANSFORMS`. The forward rule works, but the retro step would match every arene C–H and flood each aromatic target with aniline precursors. A test checks that toluene gets no such route.
- `eas-nitration` has left the dropped list. No other plan transform was dropped.

### Deviations
- Cbz and Fmoc installs are two ids (`cbz-install`, `fmoc-install`), not one carbamate transform. Both verify through `carbamate-protection`.
- `benzyl-ether-install` has rule `williamson` for benzyl. For PMB the forward outcome is `pmb-protection` (score 15 beats Williamson), and the test checks this explicitly. Williamson also appears as its own ordinary route. Because of the penalty, it ranks above the install.
- SNAr with an O or S nucleophile emits the sodium alkoxide or thiolate as the reagent, not the alcohol plus a base, because forward SNAr with a neutral alcohol and a base additive does not fire. The label is the formula (e.g. CH₃ONa).
- Heck and Sonogashira propose only the aryl iodide. Buchwald–Hartwig proposes only ArBr, and it is skipped on an activated arene, where SNAr covers the disconnection.
- The Suzuki transform adds the reverse orientation (ArB(OH)₂ + vinyl–Br) only for vinyl partners, and both orientations for aryl–aryl.
- N-Boc-piperidine also shows an `ester-acyl-chloride` route (the carbamate read as an ester of the carbamoyl chloride). It verifies forward, so it is kept.
- `js/retro-view.js` needed no grouping change. The card already prints `candidate.group`, so "Couplings", "Enolates" and "Protecting groups" appear as they are. Only the coverage text changed.

### Test commands and results
```
S=/tmp/claude-1000/-home-vanilla-Downloads-projects-chem-lab/e56d4730-7148-4eaa-be8a-05e91aa1103e/scratchpad
bash $S/build_retro.sh && cd $S && node test_retro.js          # PASS 875 FAIL 0, 123 candidates re-verified, timings min 2 max 221 ms
bash $S/regress/rebuild2.sh && cd $S/regress && bash runall.sh # 37 files, 0 failed
/tmp/claude-1000/-home-vanilla-Downloads-chem-lab/4e3c5c08-ce91-40e0-8183-6481a8aa05f0/scratchpad/pwenv/bin/python $S/shot_retro_suzuki.py   # errors: []
```

The screenshot `screenshots/retro-suzuki.png` shows the Retrosynthesis modal (dark theme, 1440×1000) on 4-methylbiphenyl ("p-phenyltoluene"). It shows 2 verified disconnections, both "Suzuki coupling" cards in the "COUPLINGS" group: p-bromotoluene + phenylboronic acid, and bromobenzene + (4-methylphenyl)boronic acid, with Pd(PPh3)4, K2CO3, N2 over the arrow. There were no page errors or console errors.

### Slice B checklist
- [x] No new comments. test_retro's static no-comment check passes on `js/retro.js` and `js/retro-view.js`.
- [x] No DOM code in `js/retro.js`, checked statically by test_retro. The app is still a tool with no teaching features.
- [x] No git commands were used in any form.

## Checklist
- [x] No new comments. `grep -nE "//|/\*"` returns 0 hits across `js/reaction-rules-extra3.js`, the new diazonium branch in extra2 (lines 946–951), the new additive and alias lines in `js/reactions.js`, and the new test block.
- [x] CODE_REFERENCE entry present: `grep -c "session (42)" CODE_REFERENCE.md` gives 2 (the section heading and the rule-count pointer). The rule count is 96.
- [x] complexities entry present: `grep -n "reaction-rules-extra3" complexities.md` matches the table row (line 152) and the session note (line 348).
- [x] No git commands were used in any form.
- [x] Logic file `js/reaction-rules-extra3.js` has no DOM code, and there are no teaching features.
