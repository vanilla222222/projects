# Audit: reactions roadmap 2–4, Slice A (session 43)

This audit covers Slice A only: items A1–A5 and the "A tests". Slices B and C were not started.

## Files changed

### Project

**New files**
- `js/reagent-library.js`: `REAGENT_LIBRARY` (106 entries), `REAGENT_HAZARDS`, and `rgl*` lookup.
- `js/reaction-io.js`: reaction SMILES and `$RXN` V2000 writing and reading (`rxio*`).
- `feature-research/reactions-s234/screenshots/lab-stoich-metrics.png`.
- `feature-research/reactions-s234/audit.md` (this file).

**Edited files**
- `js/properties.js`:
  - `propSmiles(ctx, {isomeric})`, `propPermutationParity` and `propSmilesStereo`;
  - `computeProperties` returns `isomericSmiles`.
- `js/reaction-rules.js`:
  - `rxIsomericSmiles`, so products carry `isomericSmiles`;
  - the stoichiometry now reads amounts through `reactionStoichiometry`;
  - `RX_CHEMOSELECTIVITY`, `RX_PROTECTION_SUGGESTIONS` and `RX_CHEMO_GROUP_LABELS`;
  - `rxChemoGroups`, `rxChemoEntry` and `rxChemoselectivity`, the last called from `predictReaction`.
- `js/reactions.js`:
  - mL/µL amounts, `reactionParseConcentration` and `reactionReagentInfo`;
  - `reactionScaleMmol`, `reactionSolventVolume` and `reactionSolventUsage`;
  - `reactionStoichiometry` rows gain mL, compound and hazard;
  - `reactionGraphProperties`, `reactionIsomericSmiles`, `reactionMaterialRows` and `reactionProductMass`;
  - `reactionGreenMetrics` and `reactionRouteMetrics`;
  - route step `metrics` and `isomericSmiles`, the route PMI annotation, and serialise/restore through `reactionRestoreEnd` and `reactionRestoreMetrics`.
- `js/reaction-lab.js`:
  - an mmol/g/mL/hazard sheet and the green-metrics line;
  - the `.rx-chemo` block;
  - import/export (`importReaction`, `copyReactionSmiles`, `downloadRxn`) and reaction SMILES paste;
  - route PMI in the header.
- `js/app.js`:
  - the info-panel SMILES block and the editor copy paths use `isomericSmiles`, and the paste compare matches;
  - an opened `.rxn` file is routed to the lab.
- `js/notebook.js`: `entry.isomericSmiles`, which the SMILES row shows.
- `index.html`: two script tags, `.rxn` in the open-file accept list, the `.rx-io-row` buttons with the hidden file input, the scale title, and `#rx-green`.
- `css/style.css`: `.rx-io-row`, `.rx-hazard`/`.rx-hazards`, `.rx-green*` and `.rx-chemo*`. The first sheet column is narrowed from 38% to 26% to fit 7 columns.
- `CODE_REFERENCE.md`: the load order on line 3 (now "as of session 43") and a new section "Update, later session (43) — reactions roadmap 2–4 / Slice A".
- `complexities.md`: rows for the two new files and a session-43 note on the edited files.

### Harness
All of these are in `$S = /tmp/claude-1000/-home-vanilla-Downloads-projects-chem-lab/e56d4730-7148-4eaa-be8a-05e91aa1103e/scratchpad`.
- `regress/rebuild2.sh`:
  - bundle5 now includes `molfile.js`, `reagent-library.js` and `reaction-io.js`;
  - its exports gain `Graph`, `computeProperties`, `findStereocenters`, `findStereoDoubleBonds`, `reactionFragmentGraph`, `REAGENT_LIBRARY`, `REACTION_SOLVENTS`, `REACTION_ADDITIVES`, `rglLookup`, `rglHazardText`, `reactionParseConcentration`, `reactionScaleMmol`, `reactionSolventUsage`, `reactionMaterialRows`, `reactionIsomericSmiles`, `reactionGreenMetrics`, `reactionRouteMetrics`, the `rxio*` functions, `RX_CHEMOSELECTIVITY`, `RX_PROTECTION_SUGGESTIONS`, `rxChemoselectivity` and `rxChemoGroups`.
- `build_retro.sh`: the same two new files are added.
- `regress/test_reaction_accuracy.js` (new, 80 checks).
- `shot_stoich_metrics.py` (new): a Playwright drive with 14 checks that also takes the screenshot.

## A1. Stereo-preserving SMILES

**Built**
- `propSmiles` writes `@`/`@@` and `/`/`\` only when `{isomeric: true}`. The plain canonical string is untouched.
  - Chirality comes from the parity between the written neighbour order and the CIP order.
  - E/Z marks go on DFS tree edges only.
- `computeProperties().isomericSmiles` is new.
- Reaction products carry `isomericSmiles`, computed from the wedged product fragment.
- The stereo string is used by:
  - the editor info panel, Copy all SMILES, Copy SMILES and Ctrl+C;
  - the paste echo check, which uses the same function;
  - route steps and route serialisation;
  - the notebook SMILES row;
  - reaction SMILES and RXN export.
- The share link, `editorSmilesList`, PubChem and all comparisons stay plain.

**Bug found and fixed while wiring this.** `computeProperties(graph)` without an atom-id list throws. Also, with every id of a disconnected graph, it describes only the first component: `[Na+].[C-]#N` gave `[Na+]`, so NaCN, NaBH₄ and NaOH shared one canonical key. The new `reactionGraphProperties(graph)` passes every id and joins the sorted per-component SMILES. All new code goes through it.

**Deviations**
- A racemic product's `isomericSmiles` shows the one enantiomer that was drawn, the same one the product card shows; there is no "rac" flag in SMILES.
- The plan's "SMILES copy/export in the editor" does not include the share link, which stays plain on purpose, because it round-trips through the plain parser path and is compared by length.

**Tests**
- `node regress/test_reaction_accuracy.js` (isomeric section: 32 checks): R/S-2-butanol, E/Z-2-butene, L-alanine and (R)-2-methylcyclopentanone. For each, the plain SMILES is unchanged, the stereo is kept through `smilesToFragment(isomericSmiles)`, and the output is canonical on round trip. The SN2 product `CC[C@H](C)C#N` is (S), with its plain SMILES unchanged.

## A2. Chemoselectivity warnings

**Built**
- **Tables**: `RX_CHEMOSELECTIVITY` (13 reagent classes; the table is in CODE_REFERENCE) and `RX_PROTECTION_SUGGESTIONS`:

  | Group | Suggestion |
  |---|---|
  | amine | Boc |
  | alcohol | TBS |
  | aldehyde/ketone | cyclic acetal |
  | acid | t-Bu ester |
  | terminal alkyne | TMS |
  | thiol | trityl |
  | benzyl ether | TBS instead of Bn |

- **`rxChemoselectivity`** runs after the stoichiometry in `predictReaction`.
  - It compares the attacked groups before and after the reaction.
  - It sets `outcome.chemoselectivity = {reagent, label, changed, competing, suggestion}` and a `Chemoselectivity:` warning.
- **Lab**: the `.rx-chemo` block shows the reagent, the explanation, the sites still present and the suggestion. The duplicate warning line is hidden.

**Deviations**
- **No minor alternative outcome for the competing product.** The engine cannot apply "the same reagent at the other group" generically: each rule builds its own product. So the warning and suggestion are emitted, but no extra outcome is.
- **Organometallic acidic-H quench is not in the table.** The `organometallic` entry lists only the electrophilic groups (aldehyde, ketone, acyl chloride, ester, epoxide, nitrile), not the acidic-H quench (OH, NH, CO₂H, terminal alkyne). A quench is not a "second site reacts" case that the before/after group count can see, because the product rebuilt by the rule keeps the OH.
- **Amine N-oxide under mCPBA is not tracked.** `rxAnalyze` has no N-oxide product detection. mCPBA lists alkene and ketone (Baeyer–Villiger) instead.
- **Trityl is not detected.** TFA covers Boc, tBu ester and silyl ether.

**Fix made while testing**: the tBu test in `rxChemoGroups` required 4 carbon neighbours; the quaternary C has 3 plus the O. It now requires 3, so Boc and tBu esters are detected.

**Tests** (chemoselectivity section: 12 checks)

| Case | Result |
|---|---|
| methyl 4-oxopentanoate + NaBH₄ | no warning |
| + LiAlH₄ | ketone and ester both reduced; acetal suggestion |
| 4-aminobutan-1-ol + AcCl | amine reacted, alcohol competing; Boc suggestion |
| 4-(benzyloxy)but-1-ene + H₂, Pd/C | C=C competing; "TBS rather than benzyl" suggestion |

A Boc carbamate is detected separately from a methyl ester.

## A3. Reagent library

**Built**
- **`js/reagent-library.js`**: 106 entries with the fields id, aliases, name, SMILES, MW, density, form, molarity, typical equiv and GHS codes.
  - It covers every `REACTION_SOLVENTS` id, every `REACTION_ADDITIVES` entry with a SMILES, and every `RETRO_REAGENTS` key.
  - `rglLookup` matches an id/alias, then the canonical SMILES (salts in any ion order).
- **`reactionParseAmount`** accepts mL and µL/μL/uL.
- **`reactionStoichiometry`** converts mL through molarity (solutions) or density × MW, and gives mL back. Solvent volume comes from the concentration setting, through `reactionSolventUsage`.
- **Lab sheet**:
  - columns Compound, MW, equiv, mmol, g, mL, Hazards (GHS chips with tooltips);
  - it is scaled from the first reactant's absolute amount (`reactionScaleMmol`), otherwise from the Scale box;
  - the amount field accepts "250 mg", "1.2 mL", "50 µL", "5 mmol" or "1.1".

**Deviations**
- **The sheet column is "g", not "mg".** At bench scale, grams read better. The value is shown to 3 decimals.
- **`rxStoichiometry` reads amounts differently.** It now converts mg, mL and mmol amounts through `reactionStoichiometry`, where it used to `parseFloat` the text. Plain equivalents give identical numbers, and all existing tests are unchanged.
- **Formula-only entries are left out.** The plan allowed `smiles | formula`; every entry has a SMILES. Reagents that the parser cannot draw (for example H₃PO₂ and neutral SO₃) are left out.

**Tests** (library section: 13 checks)
- 1.2 mL Et₃N = 8.61 mmol (1.2 × 0.726 × 1000 / 101.19).
- n-BuLi is a 2.5 M solution: 4 mL = 10 mmol = 2 equiv, and 1.1 equiv at 5 mmol = 2.2 mL.
- 250 mg of benzaldehyde sets the scale.
- Every library MW matches its structure to 0.1 g/mol.
- Coverage of the solvents and additives.
- The NaCN and NaBH₄ lookups are distinct and independent of ion order.

## A4. Green metrics

**Built**
- **`reactionGreenMetrics(outcome, rows, yieldPct, product?)`** gives the atom economy (balanced equation), E-factor (solvent excluded) and PMI (solvent included, from mL × density).
- **`reactionRouteMetrics(steps)`** gives the route PMI and E-factor. It scales each earlier step by the fraction of its product that the next step carried (`metrics.carriedMg`).
- **Route steps** store `metrics`, which survive serialisation.
- **Where it shows**:
  - the lab's `#rx-green` line under the sheet, at 100% yield;
  - the route header ("· PMI x");
  - `buildRouteScheme`, as a "Route PMI x, E-factor y" line.

**Deviations**
- **The lab metrics assume 100% yield**, the theoretical product mass. The user's isolated yield is entered only on route steps, and the route metrics use it through `metrics.yield`.
- **E-factor excludes solvent.** This is the "simple E-factor"; PMI includes solvent.

**Tests** (green section: 12 checks)
- **Fischer esterification**: AE 83.0% (88.11 / (60.05 + 46.07)); E-factor 0.204; PMI with 2 mL toluene at 0.5 M.
- The yield scales the product mass.
- **Wittig**: AE 27.2%, because Ph₃PO is waste.
- **2-step route**: the route PMI is larger than the last step's PMI, and the metrics and isomeric SMILES survive serialisation.

## A5. Reaction file I/O

**Built**
- **`js/reaction-io.js`**:
  - reaction SMILES writer and parser, with ion pairs kept together and agent roles guessed;
  - `$RXN` V2000 writer and reader through `graphToMolfile`, `parseMolRecord` and `molRecordToGraph`.
- **Lab**:
  - "Import reaction" opens .rxn/.smi/.txt;
  - a reaction SMILES typed into the compound box is imported;
  - "Copy reaction SMILES" (isomeric);
  - "Download .rxn".
- **Editor**: File › Open accepts `.rxn` and routes it to the Reaction lab.

**Deviations**
- **RXN agents are written as a third count** (`rrrppp aaa`, the common ChemAxon/BIOVIA extension), after the products.
- **Imported products are not added as cards.** The lab predicts products itself; the import message reports how many the file listed.
- **V3000 RXN is rejected** with a message.

**Tests** (I/O section: 11 checks)
- The stereo survives on both sides, the roles are reactant/reagent/solvent, and the ion pair stays one compound.
- Fischer reaction SMILES with an agent.
- RXN header counts `  1  1  2`; the RXN round trip gives the same structures, R/S and roles.
- Malformed input is rejected, and detection works.

## Test commands and results

| Command | Result |
|---|---|
| `bash $S/regress/rebuild2.sh` then `node $S/regress/test_reaction_accuracy.js` | 80 ok, 0 FAIL, ALL PASS |
| `cd $S/regress && bash runall.sh` | **38 files, 0 failed** |
| `bash $S/build_retro.sh` then `node $S/test_retro.js` | **PASS 875 FAIL 0** |
| `python $S/shot_stoich_metrics.py` (lab: paste import, .rxn download and reopen, copy, sheet columns, 7 hazard chips, 10.10 mmol from 900 mg, 20 mL DCM at 0.5 M, green metrics, Boc suggestion) | 14 ok, FAILS 0, page errors `[]` |
| `python $S/drive_spectra.py` | FAILS 0, errors `[]` |
| `python $S/drive_retro.py` | errors `[]`; 2 FAILs (see below) |

**The drive_retro failures come from a stale assertion, not a regression.** The two FAILs are "dark/light: nitrobenzene shows the coverage explanation". That assertion dates from session 41. Session 42 Slice B added the `eas-nitration` retro transform, and `test_retro.js` now *requires* nitrobenzene → `eas-nitration`, so the retro list is correctly non-empty. Slice A does not touch `js/retro.js` or `js/retro-view.js`. There are no page errors.

The Python used for the drives is `/tmp/claude-1000/-home-vanilla-Downloads-chem-lab/4e3c5c08-ce91-40e0-8183-6481a8aa05f0/scratchpad/pwenv/bin/python`.

## Checklist

- [x] **No new comments.**
  - `grep -nE "(^|[^:'\"])//|/\*" js/reagent-library.js js/reaction-io.js` gives no matches.
  - `grep -cE "^\s*//|/\*"` gives 0 for `js/reaction-lab.js`, `js/reactions.js`, `js/reaction-rules.js`, `js/properties.js`, `js/app.js`, `js/notebook.js` and `css/style.css`.
  - `grep -n "<!--" index.html` gives no matches.
- [x] **CODE_REFERENCE session-43 entries.**
  - `grep -n "session (43)" CODE_REFERENCE.md` → line 3214 "## Update, later session (43) — reactions roadmap 2–4".
  - The "### Slice A — engine accuracy and bench practicality" sub-section follows it.
  - Line 3 now reads "(as of session 43)" and lists `reagent-library.js`, `reaction-io.js`, `reaction-rules-extra3.js`, `retro.js`, `retro-view.js` (and the session 40–41 files) in index.html order.
- [x] **complexities rows**: `js/reagent-library.js` (2) and `js/reaction-io.js` (3) are in the table, and the "Update, later session (43)" note covers the edited files.
- [x] **Screenshot exists**: `feature-research/reactions-s234/screenshots/lab-stoich-metrics.png` (dark, 1440×1000). It shows the mmol/g/mL/hazard table, the AE/E-factor/PMI line and the chemoselectivity block with the Boc suggestion.
- [x] **The plain `smiles` field is byte-identical**: the regressions are unchanged (38/38), and the plain SMILES checks are in the new test.
- [x] **No git commands were used.**
- [x] **Tool-only scope**: no teaching or quiz features were added.

## Open risks

- **The chemoselectivity group count is heuristic.** A rule that rebuilds a different skeleton (for example a cyclisation) could make a group "disappear" and trigger a spurious `changed` entry. It only adds a warning and never changes the outcome ranking.
- **Library densities and molarities are typical values.** Commercial solution strengths vary (n-BuLi 1.6 or 2.5 M, DIBAL 1.0 M), so the entry text says which one is assumed.
- **Stoichiometry numbers can shift in saved labs.** A saved lab whose amount fields contain units (mg/mL) now shows different "Supplied" numbers in the stoichiometry box, because it now converts where it used to `parseFloat`.

## Next steps (Slice B: retrosynthesis search)

- **B0**: `retroCut` records the cut bonds and `retroTarget` keeps the atom-id map. Add the `retroDisconnectSteps` generator, keeping `retroDisconnect` as a synchronous driver. Add the `rank.fgi` penalty to stop the hydrogenation flood.
- **B1**: `js/retro-stock.js`, a stock list with tiers and persistence injected from outside. `retroPrecursorInfo.stock` and a "stock · tier N" badge. Use `rglLookup` from A3 to seed the tier-1 stock.
- **B2**: `js/retro-search.js`, a multi-step search that returns complete trees deduped by candidate key sets.
- **B3**: `rsearchScore`, `rsearchSort` and `rsearchFilter`. Use `reactionRouteMetrics`/PMI from A4 as a score term.
- **B4**: `retroProtectPlan`, triggered by a failed verify or an A2 `outcome.chemoselectivity` that names a group the target keeps. Limited to the four pairs, reusing `RX_PROTECTION_SUGGESTIONS`.
- **B5**: stereo-aware disconnections. `retroTarget` stores `isomericSmiles` (from A1), candidates are classified as retained, set or racemic, and precursors keep their isomeric SMILES.
- **B tests**: extend `test_retro.js` and add `test_retro_search.js`.
- **Harness**: update `$S/drive_retro.py` so the nitrobenzene coverage assertion uses a target that session 42 does not cover.
