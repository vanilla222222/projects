# Reactions roadmap, Section 1: new reaction families (plan)

The scouts found that most of Section 1 already exists as **forward** rules:
- SNAr;
- diazonium chemistry: diazotisation, Sandmeyer Cl/Br/CN, iodide, Balz–Schiemann, phenol and azo coupling;
- all four Pd couplings;
- enolate alkylation, Michael, Claisen/Dieckmann, Robinson and Mannich;
- Boc, silyl and benzyl protection, and acetals;
- EAS directing effects with o/p and meta ratios (`rxSubstituentEffect` and `rxEasPosition`, plus `rxaEasPlan` for fused and hetero rings).

What's missing is (a) a short list of forward rules and (b) almost every **retrosynthesis transform**, since `js/retro.js` has only 28, none of them in these families. The work is two slices, run **one after the other**: Slice B verifies through the rules that Slice A adds.

## Conventions (binding)
- Plain globals and no modules. Logic files contain no DOM code and run in Node.
- **No code comments** in new or edited lines.
- **No git commands of any kind**, including read-only ones such as `git diff` or `git status`, and including inside compound commands.
- Keep the chemistry-tool scope: no teaching, quiz or "learn" features.
- In the same pass, update `CODE_REFERENCE.md` (a new "Update, later session (42) — reaction families" section, one sub-section per slice, plus corrections to the rule count and the transform table) and `complexities.md` (a new row for the new file, and notes for the edited ones).
- Graph-edit conventions: implicit H; call `rxUse` with the substrate first; by-products as display strings; call `rxyCleanAlkenes` after changing bond orders. Tag reagents by Hill formula plus a guard (`RX_FORMULA_TAGS`/`RX_FORMULA_GUARDS`) or by additive (`RX_ADDITIVE_TAGS`), never by SMILES keys. Metals stay as context tags and are never graph atoms.

---

## Slice A — forward gaps

### A0. New file `js/reaction-rules-extra3.js`
- Prefix `rxz`. It loads after `js/reaction-aromatic.js` and before `js/retro.js`, both in `index.html` and in every scratchpad `build_*.sh` that bundles the reaction files.
- It extends the shared tag tables in place and pushes its rules onto `RX_RULES`.

### A1. Aromatic nitration and sulfonation
- **Reagents:**
  - HNO₃ is formula-tagged as `nitricAcid`, and an additive `hno3` (group Acid, label "HNO₃") is added if it isn't there already.
  - Make sure H₂SO₄ tags as `strongAcid` plus a new `sulfuricAcid` tag.
  - Additive `so3` "SO₃ / fuming H₂SO₄" gets the tag `sulfurTrioxide`, with a formula tag for SO₃ as well.
- **Rule `nitration`:**
  - Fires on HNO₃ + H₂SO₄ (mixed acid).
  - The site comes from the **existing** `rxaEasPlan`/`rxEasPosition`, so directing effects and `ratio`/`minor` are the same as for halogenation.
  - The nitro group is written neutral (`N(=O)=O`), matching the parser.
  - Deactivated rings (`deactivated` flag) get a warning ("forcing conditions, slow") and a lower score. A second nitration isn't automatic.
  - Phenol and aniline substrates get warnings: oxidation or over-nitration for phenol, and protonation to an anilinium meta-director for aniline, so suggest acetanilide.
  - Include a mechanism via the existing EAS mechanism pattern where one exists (see how halogenation or FC does it). If none does, skip it; mechanisms are optional.
- **Rule `sulfonation`:**
  - Fires on SO₃ or fuming H₂SO₄ with an arene, and gives ArSO₃H.
  - It is reversible: an aryl sulfonic acid with dilute H₂SO₄/H₂O and heat (≥100 °C) gives `desulfonation`, a separate outcome in the same rule.
- **Precedence:** nitration and sulfonation must not beat the existing rules on substrates that also carry an alcohol or alkene with plain H₂SO₄ (dehydration or hydration). Nitration requires the nitric-acid tag, and sulfonation requires SO₃ or fuming acid.

### A2. Diazonium: hydro-deamination
- Add an H₃PO₂ branch to `rxyRuleDiazonium` in `js/reaction-rules-extra2.js`: ArN₂⁺ → ArH, outcome id `deamination`.
- H₃PO₂ is an additive `h3po2` "H₃PO₂" with tag `hypophosphorous`. Add a formula tag too if the parser can represent it.
- This is the only edit to extra2.

### A3. Protecting groups (the gaps only)
Existing Boc, TBS/TMS/TIPS, Bn and acetal handling stays as it is.

| Group | Install | Remove |
|---|---|---|
| **Fmoc** | Fmoc-Cl (or Fmoc-OSu if parseable) + weak base on an amine → Fmoc carbamate | piperidine (amine base, 20% in DMF) → free amine + dibenzofulvene by-product |
| **Cbz** | explicit rule: CbzCl + base on an amine → Cbz carbamate | already handled by H₂/Pd-C hydrogenolysis; confirm with a test |
| **PMB ethers** | PMBCl + NaH on an alcohol or phenol | DDQ (additive `ddq`) or CAN (additive `can`) → alcohol + anisaldehyde. H₂/Pd-C should also remove it (reuse the benzyl logic if it's generic) |
| **TBDPS** | TBDPSCl + imidazole | TBAF |
| **t-Bu esters** | isobutylene + H₂SO₄ on an acid, or Boc₂O/DMAP | TFA → acid + isobutylene |
| **Methyl esters** | TMSCHN₂ in MeOH, or MeI/K₂CO₃ in DMF, on an acid | LiOH (confirm the existing saponification rule handles LiOH; add a tag if not) |

- **TBDPS:** extend the silyl detection so a Si carrying two phenyls and a t-Bu counts as a silyl ether.
- **t-Bu esters:** the TFA removal must not fight Boc removal; when both are present, return one outcome that removes both and warn about it.
- **Methyl esters:** add the TMSCHN₂ additive if it's missing.
- **Aliases:** add name aliases in `REACTION_NAME_ALIASES` for any new reagent structures: Fmoc-Cl, CbzCl, PMBCl, TBDPSCl, DDQ, TMSCHN₂.
- **Scores:** a named protecting-group outcome scores 15–16, so it beats generic acylation or alkylation of the same amine or alcohol. Each new pairing must be checked against the existing unit cases.

### A tests
- `test_reaction_rules.js`: add cases, one or more per new outcome.
  - Nitration:
    - toluene → o/p with a ratio;
    - nitrobenzene → m, with the deactivation warning;
    - anisole → p major;
    - chlorobenzene → o/p;
    - naphthalene → 1-nitro (via `rxaEasPlan`).
  - Sulfonation of benzene, and desulfonation.
  - H₃PO₂ deamination of 4-methylaniline via NaNO₂/HCl then H₃PO₂. Check the one-pot handling works the way the other diazonium branches do.
  - Fmoc on and off; Cbz on and off; PMB on (alcohol and phenol) and off (DDQ); TBDPS on and off; t-Bu ester on and off; methyl ester on (TMSCHN₂) and off (LiOH).
  - Boc + t-Bu ester with TFA → both removed, with the warning.
- Update the rule-count check to the new total.
- Run `regress/runall.sh` in full: all 37 files must stay green. `test_retro.js` has to stay green too, because rule scores affect retro verification.

---

## Slice B — retrosynthesis transforms

- Add these to `RETRO_TRANSFORMS` in `js/retro.js`. Each one is verified by the existing forward check (`retroVerify`).
- Any transform whose forward rule cannot reproduce the target goes into `RETRO_DROPPED_TRANSFORMS` with a concrete reason instead of being forced through. The audit lists every drop.
- Add new reagents to `RETRO_REAGENTS`, not inline.
- New `group` values:
  - "Aromatics" (existing), for the aromatic and diazonium transforms;
  - "Couplings", "Enolates" and "Protecting groups" (new).
- Check that `retro-view.js` groups and labels them with no change, or make the minimal change needed.

| Transform id | Target pattern | Precursors / reagents | Forward rule |
|---|---|---|---|
| `eas-nitration` | Ar–NO₂ | arene + HNO₃/H₂SO₄ | `nitration` (remove it from the dropped list) |
| `eas-sulfonation` | Ar–SO₃H | arene + SO₃ | `sulfonation` |
| `snar` | Ar–Nu (OR, NR₂, SR) on a ring activated by o/p-NO₂ or CN | Ar–F or Ar–Cl + nucleophile | `snar` |
| `sandmeyer` | Ar–Cl, Ar–Br, Ar–CN | ArNH₂ + NaNO₂/HCl + CuX | `diazonium` |
| `schiemann` | Ar–F | ArNH₂ + NaNO₂/HBF₄, heat | `diazonium` |
| `diazonium-iodide` | Ar–I | ArNH₂ + NaNO₂/HCl + KI | `diazonium` |
| `diazonium-phenol` | Ar–OH | ArNH₂ + NaNO₂/H₂SO₄, warm water | `diazonium` |
| `azo-coupling` | Ar–N=N–Ar′ where Ar′ carries OH or NR₂ | ArNH₂ + Ar′H + NaNO₂/HCl | `diazonium` |
| `suzuki` | biaryl or aryl–vinyl C–C | Ar–Br + Ar′B(OH)₂, Pd(PPh₃)₄, K₂CO₃ | `suzuki` |
| `heck` | Ar–CH=CH–EWG or –Ar | Ar–Br or Ar–I + alkene, Pd(OAc)₂, Et₃N | `heck` |
| `sonogashira` | Ar–C≡C–R | Ar–I + terminal alkyne, Pd/CuI, amine | `sonogashira` |
| `buchwald-hartwig` | Ar–NR₂ (not activated for SNAr) | Ar–Br + amine, Pd, NaOtBu | `buchwald-hartwig` |
| `enolate-alkylation` | α-alkyl ketone or ester | carbonyl + R–X, LDA | `enolate-alkylation` |
| `michael` | 1,5-dicarbonyl (or 1,5 with CN or NO₂) | donor + enone, base | `michael` |
| `claisen` | β-ketoester (acyclic) | 2 × ester, NaOEt | `claisen` |
| `dieckmann` | cyclic β-ketoester (5- or 6-ring) | diester, NaOEt | `claisen` |
| `robinson` | cyclohexenone from annulation | ketone + MVK, base | `robinson` |
| `mannich` | β-amino ketone | ketone + CH₂O + R₂NH·HCl | `mannich` |
| `boc-install` | R–NH–Boc | amine + Boc₂O | `protection` |
| `cbz-install` / `fmoc-install` | R–NH–Cbz / R–NH–Fmoc | amine + CbzCl / Fmoc-Cl | Slice A rules |
| `silyl-install` | R–O–TBS / TBDPS / TIPS | alcohol + silyl chloride, imidazole | `protection` |
| `benzyl-ether-install` | R–O–Bn / R–O–PMB | alcohol + BnBr or PMBCl, NaH | existing Williamson rule or Slice A |
| `acetal-install` | 1,3-dioxolane or dioxane on a former carbonyl | carbonyl + ethylene glycol, TsOH | `acetal` |
| `tbu-ester-install` | R–CO₂tBu | acid + isobutylene/H₂SO₄ | Slice A |

- **Hydro-deamination is forward only.** A retro "ArH ← ArNH₂" would match every arene and flood the results. Record it in `RETRO_DROPPED_TRANSFORMS` with that reason.
- **Deprotections are forward only in this section.** Adding protect and deprotect steps to routes is roadmap 3.4.

**Ranking:**
- The protecting-group installs are real disconnections, but they don't simplify the carbon skeleton. Rank them below skeleton-building candidates for the same target: add a small penalty in the existing ranking, keyed on group "Protecting groups".
- `retroDisconnect` stays ≤ 1.5 s per target. Measure after adding about 26 transforms, and if they go over, pre-filter by target features before matching.

### B tests
- Extend `test_retro.js` with these targets:

  | Group | Target | Must include |
  |---|---|---|
  | Aromatics | 4-nitrotoluene | nitration |
  | Aromatics | benzenesulfonic acid | sulfonation |
  | Aromatics | 2,4-dinitroanisole | SNAr |
  | Aromatics | 4-chlorotoluene or 4-bromotoluene | Sandmeyer |
  | Aromatics | fluorobenzene | Schiemann |
  | Aromatics | iodobenzene | iodide |
  | Aromatics | 4-methylphenol | diazonium-phenol |
  | Aromatics | 4-hydroxyazobenzene | azo coupling |
  | Couplings | 4-methylbiphenyl | Suzuki |
  | Couplings | methyl cinnamate or stilbene | Heck |
  | Couplings | diphenylacetylene | Sonogashira |
  | Couplings | N-phenylmorpholine | Buchwald–Hartwig |
  | Enolates | 2-methylcyclohexanone | enolate alkylation |
  | Enolates | a Michael adduct (e.g. 2-(3-oxobutyl)cyclohexanone) | Michael |
  | Enolates | ethyl acetoacetate | Claisen |
  | Enolates | ethyl 2-oxocyclopentanecarboxylate | Dieckmann |
  | Enolates | the Robinson product of 2-methylcyclohexanone + MVK | Robinson |
  | Enolates | 3-(dimethylamino)-1-phenylpropan-1-one | Mannich |
  | Protecting groups | N-Boc-piperidine | Boc |
  | Protecting groups | cyclohexyl TBS ether | silyl |
  | Protecting groups | benzyl cyclohexyl ether | benzyl |
  | Protecting groups | 2-methyl-2-phenyl-1,3-dioxolane | acetal |
  | Protecting groups | tert-butyl benzoate | t-Bu ester |

- Every target must return the named route. If a forward-rule limitation makes one impossible, the target is replaced by one that works, and the audit records why.
- Every returned candidate re-verifies forward, and nitrobenzene now has a route.
- Report the timings for every target.
- The original 15 targets keep their named routes.
- Run `regress/runall.sh` in full.

---

## Screenshots (major change): `feature-research/reaction-families/screenshots/`
1. `nitration.png`: the Reaction lab with toluene + HNO₃/H₂SO₄, showing the o/p product cards and the ratio.
2. `retro-suzuki.png`: the retrosynthesis modal on 4-methylbiphenyl, showing the Suzuki card with the "Couplings" group.

Capture both with the existing Playwright setup (see `drive_retro.py`). They must show no page errors.

## Files
- **New:** `js/reaction-rules-extra3.js`.
- **Edited:**
  - `js/reaction-rules-extra2.js`: the H₃PO₂ branch only.
  - `js/reaction-rules-extra.js`: only if TBDPS or PMB detection has to live beside the existing silyl and benzyl code.
  - `js/reactions.js`: additives and aliases.
  - `js/retro.js`.
  - `js/retro-view.js`: only if grouping needs it.
  - `index.html`: the script tag.
  - The scratchpad build scripts and tests.
- **Docs:** `CODE_REFERENCE.md` (session 42), `complexities.md` (the new row, and notes on retro.js and extra2).

## Out of scope
- Automatic multi-step search, protecting-group planning and chemoselectivity warnings (Sections 2 and 3).
- Stereo in SMILES.
- Mechanisms for the existing rules that ship without one.
- Changes to the naming engine. Awkward product names are recorded, not fixed.
- Changes to the Hückel parameters.
- Any toolbar or UI additions beyond additive chips, which appear automatically from `REACTION_ADDITIVES`.
- New code comments.
