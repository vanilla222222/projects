# Section 3 — Structure tools & 3D: audit (Slice A)

Slice A (A1 biomolecule stamps, A2 isomer enumerator, A3 polymer brackets) is implemented and tested. Slice B (3D, projections, viewer) is not started and is left for the next implementer pass.

## Files changed

Project (`/home/vanilla/Downloads/projects/chem lab/`):
- `js/stamps.js`: `BIO_STAMPS` (34 entries), `bioStampFragment`, the bio route in `placeStamp`, and bond-stereo copying in `placeCustomStamp`.
- `js/isomers.js`: **new**. Formula parsing, canonical form, the time-sliced enumerator, the stability filter, and branching/layout helpers.
- `js/polymer.js`: **new**. Bracket validity/crossings/prune, repeat formula, and polymer naming.
- `js/renderer.js`: bracket settings, `polymerCache`, `polymerLabel`, `bracketGeometry`, `drawBracket`, `bracketHit`, and bracket branches in `annotationBounds` and `drawAnnotations`.
- `js/interactions.js`: bracket branches in `annotationAt`, `moveAnnotation`, `transformAtoms`, `extractFragment`, `annotationPoints` and `insertFragment`.
- `js/app.js`:
  - `sanitizeAnnotations` for brackets, and the prune in `afterRender`;
  - the bracket hover status, context-menu entries and rename editor;
  - `addPolymerBrackets`;
  - the isomer modal (state, paging, sorting, time-sliced driver, placement);
  - `structureThumbnail` (renamed from `resonanceThumbnail`);
  - `STAMP_THUMB_GRIDS` and default-collapsed sections with `expandedSections` persistence;
  - Alt+I and Alt+B in `INSIGHT_SHORTCUTS`.
- `index.html`: the Amino acids, Sugars and Nucleobases sidebar sections; the `#isomer-overlay` modal; help rows for Alt+I and Alt+B; and script tags for `js/isomers.js` and `js/polymer.js` after `js/insight.js`.
- `css/style.css`: the isomer dialog, controls, grid, cards, caption, pager and hint styles, all on existing theme tokens.
- `CODE_REFERENCE.md`: new section "Update, later session (40) — structure tools & 3D" / "Slice A — templates, isomers and polymer brackets", plus a pointer to the bracket schema in the original annotations data-model paragraph.
- `complexities.md`: rows for `js/isomers.js` (7) and `js/polymer.js` (5), and a session (40) note covering stamps.js, renderer.js, interactions.js, app.js, index.html and style.css.
- `feature-research/structure-tools/screenshots/isomers.png` (**primary**): the C₆H₁₄ grid, sorted by name, 5 named cards.
- `feature-research/structure-tools/screenshots/brackets.png`: a PVC chain with brackets, `n` and the "poly(vinyl chloride)" name pill.
- `feature-research/structure-tools/audit.md` (this file).

Scratchpad (`/tmp/claude-1000/-home-vanilla-Downloads-projects-chem-lab/e56d4730-7148-4eaa-be8a-05e91aa1103e/scratchpad/`), not part of the project:
- `build_tools_a.sh`: concatenates the app scripts in `index.html` order into `bundle_tools_a.js` and appends the exports.
- `test_structure_tools_a.js`, `drive_tools_a.py`, `drive_tools_a.out`, `pvc_saved.json`, plus `probe_*.js` scratch probes.

## Test results

All commands were run from the scratchpad directory.

| Command | Result |
|---|---|
| `bash build_tools_a.sh && node test_structure_tools_a.js` | **PASS 280 FAIL 0** (278 before `poly(vinyl alcohol)` was added to the polymer list) |
| `cd regress && bash rebuild.sh; bash rebuild2.sh; bash runall.sh` | **37 files, 0 failed** |
| `bash build_insight.sh && node test_insight.js` | **PASS 145 FAIL 0** |
| `bash build_spectra.sh && node test_spectra.js` | **TOTAL 107/107** |
| `<pwenv>/bin/python drive_tools_a.py` | **44 ok, DRIVE PASS — 0 failures, no page errors** |

`<pwenv>` is `/tmp/claude-1000/-home-vanilla-Downloads-chem-lab/4e3c5c08-ce91-40e0-8183-6481a8aa05f0/scratchpad/pwenv`, because neither the system python nor the scratchpad venv has Playwright.

### A1 — biomolecule stamps
- All 34 SMILES parse, and every generated name is non-empty.
- Stereocentre counts and every R/S label match (the expected values were checked against RDKit): for example, L-alanine S, L-cysteine R, L-isoleucine 2S,3S, L-threonine 2S,3R and D-glucose 2R,3S,4R,5R.
- Drive:
  - the three sections start collapsed, and their thumbnails draw (20/20, 9/9, 5/5);
  - tryptophan (+15 atoms), β-D-glucopyranose (+12) and adenine (+10) were placed;
  - 6 wedge/hash bonds are kept on the canvas;
  - an expanded section stays expanded after reload.

### A2 — isomer counts (actual vs expected)
stableOnly was off unless noted. Times are from one run in Node.

| Formula | Expected | Actual | Time |
|---|---|---|---|
| C₄H₁₀ | 2 | 2 | 2 ms |
| C₅H₁₂ | 3 | 3 | 1 ms |
| C₆H₁₄ | 5 | 5 | 3 ms |
| C₇H₁₆ | 9 | 9 | 5 ms |
| C₈H₁₈ | 18 | 18 | 12 ms |
| C₉H₂₀ | 35 | 35 | 21 ms |
| C₁₀H₂₂ | 75 | 75 | 50 ms |
| C₄H₈ | 5 | 5 | 0 ms |
| C₃H₈O | 3 | 3 | 1 ms |
| C₄H₁₀O | 7 | 7 | 0 ms |
| C₂H₇N | 2 | 2 | 0 ms |
| C₃H₉N | 4 | 4 | 0 ms |
| C₆H₆ | 217 | 217 | 71 ms |
| C₃H₆O, stable | 7 | 7 | 1 ms |
| C₂H₄O₂, stable | includes acetic acid and methyl formate; no peroxide or gem-diol | 4: acetic acid, methyl formate, hydroxyethanal, and one named only "C2H4O2" (1,3-dioxetane) | <1 ms |

- **C₈H₁₈ timing** (5 runs): 6, 6, 7, 7, 8 ms, median **7 ms**. The earlier run gave 6, 6, 7, 7, 9 ms.
- **C₃H₆O stable names:** acetone, allyl alcohol, cyclopropanol, methoxyethene, oxetane, propionaldehyde, propylene oxide. These are the plan's seven, with methyl vinyl ether named "methoxyethene", propanal named "propionaldehyde" and methyloxirane named "propylene oxide" by the existing naming engine.
- **Formula errors:** C2H7 (not a whole number), C2H8 (negative DoU), Xx2 and C6H14Na (unsupported element), H2 (no heavy atom) and the empty string each give their own message.
- **Job stops:**
  - C₁₀H₂₂ completes over 9–10 time slices;
  - the `limit` and `cancel` stops both work;
  - a 13-heavy-atom formula returns `'too large'`.
- **Drive:**
  - C₆H₁₄ is prefilled and shows 5 named cards;
  - sort by name matches `localeCompare`;
  - C₁₀H₂₂ gives 2 pages, with 27 cards on page 2;
  - a bad formula shows its message;
  - one isomer placed (+6 atoms);
  - Escape closes the modal.

### A3 — polymer names (all correct)

| Chain drawn (unit bracketed) | Name | Repeat |
|---|---|---|
| CCCC | poly(ethylene) | (C₂H₄)ₙ |
| CCC(C)C | poly(propylene) | (C₃H₆)ₙ |
| CCC(c1ccccc1)C | poly(styrene) | (C₈H₈)ₙ |
| CCC(Cl)C | poly(vinyl chloride) | (C₂H₃Cl)ₙ |
| CC(F)(F)C(F)(F)C | poly(tetrafluoroethylene) | (C₂F₄)ₙ |
| CCC(C)(C(=O)OC)C | poly(methyl methacrylate) | (C₅H₈O₂)ₙ |
| CCC(C#N)C | poly(acrylonitrile) | (C₃H₃N)ₙ |
| CCC(C)=CCC | poly(isoprene) | (C₅H₈)ₙ |
| CCC=CCC | poly(butadiene) | (C₄H₆)ₙ |
| COCCC | poly(oxyethylene) | (C₂H₄O)ₙ |
| COCC | poly(oxymethylene) | (CH₂O)ₙ |
| PET, both orientations | poly(ethylene terephthalate) | (C₁₀H₈O₄)ₙ |
| nylon-6, both orientations | nylon-6 | (C₆H₁₁NO)ₙ |
| nylon-6,6 | nylon-6,6 | (C₁₂H₂₂N₂O₂)ₙ |
| CCC(O)C | poly(vinyl alcohol) | (C₂H₄O)ₙ |
| CC(C)(C)OC (no rule) | poly[(C₃H₆O)] | (C₃H₆O)ₙ |

**Bracket behaviour.** Node and the drive both check validity, prune, save/load and copy/paste:
- The node test checks that:
  - a bracket survives `serializeGraph` → `loadGraphState`;
  - copy/paste creates a second bracket with remapped, valid ids;
  - deleting a unit atom removes the bracket;
  - deleting a crossing bond (leaving 1 crossing) removes it.
- The drive checks that:
  - an invalid selection (3 crossings) makes no bracket and shows the toast;
  - the selection menu has "Polymer brackets" and "Find isomers";
  - the hover status reads "Polymer brackets · (C₂H₃Cl)ₙ · poly(vinyl chloride) — right-click to rename, Del to delete";
  - save → clear → reopen restores the bracket;
  - copy/paste gives 2 valid brackets;
  - Delete prunes one bracket and undo restores it;
  - there is no horizontal overflow and no page errors.

## Deviations (with reasons)

1. **The prune lives in `js/app.js` `afterRender`, not in `js/interactions.js`.** Brackets can be invalidated by many paths: atom delete, bond delete, bond erase, abbreviation expand, clean-up merge, undo edge cases. One check at the top of `afterRender`, before the history commit, covers them all and puts the removal in the same undo step as its cause. Adding it to each deletion path in interactions.js would have been scattered and easy to miss.
2. **Monomer names are always wrapped in parentheses**: poly(ethylene), poly(styrene). The plan said only multi-word or locant-bearing names are wrapped, but its own expected names (poly(ethylene), poly(styrene), poly(propylene)) wrap single words. The tests follow the expected names.
3. **Bio stamp labels put α/β at the end**, for example "D-Glucopyranose (α)". The existing thumbnail/label code strips leading non-letter symbols, so "α-D-…" would lose its α.
4. **`placeCustomStamp` now copies bond stereo.** This was needed so the amino-acid and sugar wedges survive placement. As a side effect, saved custom stamps now also keep their wedges. The old behaviour was arguably a bug, and no test depended on it.
5. **The default sort is "branching", not "name".** Sorting by name requires naming every isomer, which defeats lazy per-page naming (C₁₀H₂₂ has 75, and larger formulas have up to 2000). "Name" is still offered and names everything in time slices.
6. **`resonanceThumbnail` was renamed to `structureThumbnail(graph)`** rather than keeping both, since the plan asked for it to be generalised. All call sites were updated.
7. **Opening the modal starts the search straight away** with the prefilled formula, so Alt+I on a molecule shows results without an extra click.
8. **Collapsed-by-default** is stored as an "expanded" set in the new localStorage key `expandedSections`. Existing users' collapsed-section state therefore still applies to the old sections, and the new sections start collapsed.
9. **Brackets cannot be dragged on their own** (`moveAnnotation` ignores them). They are anchored to atoms and drawn from atom positions, so moving the atoms moves them.
10. **The heteroatom single-bond filter allows only N–N and S–S.** The plan's N–O nitro exception needs charges, which are out of scope (as the plan itself says), so no N–O single bond is kept.
11. **The fourth stable C₂H₄O₂ isomer is unnamed.** The naming engine returns only the formula, "C2H4O2", for 1,3-dioxetane. Naming rules are out of scope, so this is recorded rather than changed.
12. **An extra number:** C₆H₆ with stableOnly on gives 87. The plan did not ask for it; it is recorded for reference.

## Checklist

- [x] **No new comments.**
  - `grep -nE "(^|[^:])//|/\*" js/isomers.js js/polymer.js` finds nothing.
  - `grep -cE '^\s*//|/\*'` gives 0 for `js/app.js`, `js/renderer.js`, `js/interactions.js`, `js/stamps.js` and `css/style.css`.
  - `grep -nE '[;{,)]\s*//'` finds nothing across the six JS files.
  - `grep -c "<!--" index.html` gives 0.
- [x] **Logic files have no DOM code.** `js/isomers.js`, `js/polymer.js` and `BIO_STAMPS` run in Node through the bundle.
- [x] **CODE_REFERENCE.md** has "Update, later session (40) — structure tools & 3D" with the "Slice A" sub-section, the load-order sentence (`js/isomers.js` and `js/polymer.js` load after `js/insight.js`) and the bracket annotation schema.
- [x] **complexities.md** has the `js/isomers.js` (7) and `js/polymer.js` (5) rows and the session (40) note.
- [x] **Screenshots exist:** `screenshots/isomers.png` (primary) and `screenshots/brackets.png`.
- [x] **No git commands were used.**

## Next steps

- **Slice B** (B1 3D embedding and force field, B2 viewer modal with 3D/chair/Newman/Fischer/Haworth, Alt+D, `#viewer-button`, `test_structure_tools_b.js`, `drive_tools_b.py`, `viewer3d.png`) is pending. Alt+D is deliberately not bound yet.
- Slice B will append its own sub-section to the session (40) CODE_REFERENCE section and add its 3 files to complexities.md.
- **Gotchas for Slice B and later work:**
  - **Name isomer graphs before laying them out.** `nameStructure` on a laid-out graph adds E/Z prefixes from the drawn geometry. Isomer graphs come back with all atoms at (0, 0), which gives clean constitutional names.
  - **Large formulas hit the time budget.** C₆H₁₂O₆ with stableOnly stops at the 4 s budget with about 360 found (358 and 361 in two runs; the exact number depends on machine speed). The UI says so. Larger mixed-heteroatom formulas behave the same.
  - **Existing naming quirks show up on the new stamps.** Naming rules were not changed, per the plan:
    - D-galactose and D-mannose are named "(…)-glucose open chain" with different R/S;
    - the pyranoses get systematic oxane names;
    - β-D-ribofuranose is named "…tetrahydrofurane…".
  - **Add new annotation kinds to the prune path.** Brackets are pruned in `afterRender` whenever they are invalid, so any new code path that edits atoms or bonds is covered automatically. A future atom-attached annotation kind should hook into the same place.
  - **Slice B edits the same files.** It will also edit `js/app.js` (the `INSIGHT_SHORTCUTS` block, `moleculeEntries`) and `index.html` (a modal before `#ptable-overlay`, script tags after `js/polymer.js`), next to the Slice A additions.
  - **The drive needs Playwright from `pwenv`** (the path under Test results).

---

# Section 3 — Structure tools & 3D: audit (Slice B)

## Files changed

- **New:**
  - `js/geometry3d.js`: 3D embedding, force field, FIRE minimizer, RMSD and the conformer search. No DOM.
  - `js/projections.js`: chair, Fischer, Haworth and Newman logic. No DOM.
  - `js/viewer3d.js`: the `createViewer3d(deps)` modal factory.
- **Edited:**
  - `index.html`:
    - the `#viewer-button` toolbar button, after the insight menu;
    - the `#viewer-overlay` modal, before `#ptable-overlay`;
    - an Alt+D help row;
    - script tags: `js/geometry3d.js` and `js/projections.js` after `js/polymer.js`, and `js/viewer3d.js` after `js/spectra-view.js` (before `js/app.js`).
  - `js/app.js`:
    - `let viewer3d`, with the `createViewer3d` wiring after `createSpectraView`;
    - the `#viewer-button` click handler;
    - `KeyD` in `INSIGHT_SHORTCUTS`;
    - "3D & projections" in `moleculeEntries`;
    - an Escape branch in the global keydown handler.
  - `css/style.css`: the viewer dialog and its controls, using existing tokens (both themes), with a ≤ 720px layout.
  - `CODE_REFERENCE.md`: the "Slice B" sub-section.
  - `complexities.md`: 3 rows and a Slice B note.
- **Screenshots:**
  - `screenshots/viewer3d.png`: menthol, 3D tab, ball-and-stick, with the conformer list.
  - `screenshots/projections.png`: D-glucose, Fischer.
  - `screenshots/projections-haworth.png`: β-D-glucopyranose, Haworth.
- **Scratchpad** (session scratchpad; not in the repo):
  - `build_tools_b.sh`, which produces `bundle_tools_b.js`;
  - `test_structure_tools_b.js`;
  - `rdkit_geom.py`, `rdkit_mols.json` and `rdkit_ours.js`;
  - `drive_tools_b.py`, with its output in `drive_tools_b.out`.

## Test results

Commands, run from the session scratchpad:

| Command | Result |
| --- | --- |
| `bash build_tools_b.sh && node test_structure_tools_b.js` | **PASS 82, FAIL 0** |
| `pwenv/bin/python drive_tools_b.py`, using `/tmp/claude-1000/-home-vanilla-Downloads-chem-lab/4e3c5c08-ce91-40e0-8183-6481a8aa05f0/scratchpad/pwenv/bin/python` | **30 checks, FAILS 0**, no page errors |
| `cd regress && bash rebuild.sh; bash rebuild2.sh; bash runall.sh` | 37 files, 0 failed (baseline 37/0) |
| `bash build_tools_a.sh && node test_structure_tools_a.js` | PASS 280, FAIL 0 (baseline 280) |
| `bash build_insight.sh && node test_insight.js` | PASS 145, FAIL 0 (baseline 145) |
| `bash build_spectra.sh && node test_spectra.js` | TOTAL 107/107 (baseline 107/107) |
| `drive_tools_a.py` and `drive_spectra.py`, re-run after the `index.html`/`app.js` edits | 0 failures, no page errors |

### B1 — geometry

**RDKit check.** The reference is ETKDGv3 (seed 42, 20 conformers), best MMFF94 conformer, heavy atoms only. Our side is the lowest conformer from `conformers3d`. RMSD is after optimal alignment, symmetry-aware (`rdMolAlign.GetBestRMS`). Target ≤ 0.25 Å.

| Molecule | RMSD (Å) | Result |
| --- | --- | --- |
| benzene | 0.002 | PASS |
| cyclohexane | 0.015 | PASS |
| adamantane | 0.011 | PASS |
| camphor | 0.028 | PASS |
| naphthalene | 0.013 | PASS |
| pyridine | 0.025 | PASS |
| acetone | 0.029 | PASS |
| caffeine | 0.048 | PASS |
| norbornane | 0.010 | PASS |
| indole | 0.029 | PASS |

**Bond lengths and angles.** Measured on `embed3d` output (seed 1) over 11 molecules: butane, 2,2,3-trimethylbutane, butadiene, 2-butyne, benzene, naphthalene, menthol, cyclohexane, acetone, propionitrile and toluene.

| Measure | n | Mean | Min | Max | Max deviation | Target |
| --- | --- | --- | --- | --- | --- | --- |
| C–C (sp³–sp³) | 26 | 1.533 | 1.524 | 1.558 | 0.028 | 1.53 ± 0.03 ✓ |
| C=C | 2 | 1.344 | 1.344 | 1.344 | 0.004 | 1.34 ± 0.03 ✓ |
| C≡C | 1 | 1.200 | – | – | 0.000 | 1.20 ± 0.03 ✓ |
| aromatic C–C | 23 | 1.394 | 1.392 | 1.398 | 0.008 | 1.39 ± 0.03 ✓ |
| sp³ angles, all | 204 | 109.46° | 105.40° | 115.17° | 5.67° | see deviation 1 |
| sp³ angles, carbons with < 3 heavy neighbours | 168 | | | | 2.26° | ± 4° ✓ |
| sp³ angles, branched carbons (≥ 3 heavy neighbours) | 36 | | | | 5.67° | reported; the MMFF reference reaches 4.8° |

**Other geometry checks.**

- **Planarity**, max out-of-plane deviation over all atoms including H: benzene 0.0004 Å, naphthalene 0.0011 Å (target ≤ 0.02 ✓).
- **Cyclohexane** lowest conformer ring torsions: −56.8, 56.8, −56.9, 56.9, −56.8, 56.8°. This is a chair ✓.
- **Stereo:**
  - Amino-acid stereocentres are preserved: 21/21 after the embed, and every one of the 20 stamps in its lowest conformer ✓.
  - The C–C=C–C dihedral is −180.0° for (E)-2-butene and 0.0° for (Z)-2-butene ✓.
- **Conformers:**
  - The butane lowest conformer has C–C–C–C = −179.7° (anti ✓).
  - Methylcyclohexane conformers: 0.00 (equatorial) and 1.70 (axial).
  - Menthol conformers are sorted, and each pair differs by RMSD ≥ 0.3 Å ✓.
- **Timings** (Node, this machine):

  | Molecule | Heavy atoms | Embed | Conformer search | Newman relaxed curve (36 points) |
  | --- | --- | --- | --- | --- |
  | menthol | 11 | 47 ms | 1141 ms (5 conformers) | 405 ms |
  | losartan | 30 | 79 ms | 2569 ms (10 conformers; capped by the 2.5 s budget) | 892 ms |

  The UI runs the search in 40 ms `setTimeout` slices, so the modal stays responsive.

### B2 — projections (Node)

- **Fischer:**
  - D-glucose reads CHO / H|OH / HO|H / H|OH / H|OH / CH2OH (C2 right, C3 left, C4 right, C5 right) and is labelled **D** ✓.
  - L-alanine reads COOH / H2N|H / CH3 and is labelled **L** ✓.
  - D-fructose is labelled D ✓.
  - (2R,3S)-2,3-dibromobutane (`C[C@@H](Br)[C@@H](Br)C`) is meso ✓. The (2R,3R) isomer is not meso ✓.
  - Menthol is "not applicable", with a reason ✓.
- **Haworth:**
  - β-D-glucopyranose: C1 OH up, C2 down, C3 up, C4 down, CH2OH up. Labelled **β-D** ✓.
  - α-D-glucopyranose: C1 OH down, labelled α ✓.
  - β-D-ribofuranose: a furanose, labelled β-D ✓.
  - Cyclohexane is "not applicable" ✓.
- **Chair:**

  | Molecule | ΔG (kcal/mol) | Result |
  | --- | --- | --- |
  | trans-1,4-dimethylcyclohexane (`C[C@H]1CC[C@H](C)CC1`) | 3.48 | diequatorial in the stable chair ✓ |
  | cis-1,2-dimethylcyclohexane | 0.00 | ax/eq in both chairs ✓ |
  | tert-butylcyclohexane | 4.90 | ratio 0.026 : 99.974, equatorial ✓ |
  | menthol | 4.76 | chair B all-equatorial ✓ |
  | β-D-glucopyranose | 5.28 | chair A all-equatorial ✓ |

  Benzene is "not applicable" ✓.
- **Newman:**
  - The butane default bond is C2–C3 ✓.
  - Relaxed scan, relative energies:

    | Angle | 0° | 60° | 120° | 180° | 240° | 300° |
    | --- | --- | --- | --- | --- | --- | --- |
    | Energy | 5.04 | 1.11 | 2.61 | 0.00 | 2.61 | 1.11 |

    The minimum is at 180° (anti ✓) and the maximum at 0° (syn ✓). Gauche at exactly 60° is 1.11. The free gauche minimum found by the conformer search is 0.95 above anti, against a target of ~0.9 ✓.
  - The names at 0/60/120/180° are syn (eclipsed) / gauche / eclipsed / anti ✓.
  - The drawn reference-spoke angle matches the dihedral ✓.

### Drive (`drive_tools_b.py`, 1440×900)

The output is in `drive_tools_b.out`.

- **Opening and tabs:**
  - Menthol → Alt+D opens the 1100×720 dialog.
  - Fischer and Haworth are disabled, with "Not available: …" tooltips. Chair and Newman are enabled.
  - Clicking the disabled Fischer tab does not activate it.
- **3D tab:**
  - The conformer list shows 5 entries (0.00, 0.59, 1.80, 4.92, 6.81) under "(relative, arbitrary units)".
  - A synthetic drag rotates the model.
  - The hover tooltip shows "C1 · sp3".
  - Measure mode on two atoms gives "Distance 1.534 Å".
- **Other tabs, with menthol:**
  - Chair and Newman draw.
  - The chair panel shows ΔG, the more stable chair and the 25 °C ratio.
  - The Newman curve computes. The slider at 60° reads gauche, and at 180° reads anti.
- **Sugars:**
  - Placing the D-glucose stamp enables Fischer. It shows "D" and draws (`projections.png`).
  - The β-D-glucopyranose stamp, hovered, enables Haworth. It shows β and D (`projections-haworth.png`), and its chair draws.
- **Closing and other entry points:**
  - Escape closes the viewer.
  - The context-menu item "3D & projections" opens it.
- **Errors:** none on the page. One Chromium `willReadFrequently` warning comes from the drive's own `getImageData` pixel probe, and is filtered out.

## Deviations (with reasons)

1. **The sp³ ±4° angle target doesn't hold at crowded branched carbons.**
   - Our worst case is the menthol isopropyl C–C–C at 115.2°.
   - RDKit MMFF94 on the same molecules also leaves ±4°: 114.3° C–C–C and 104.7° H–C–H in menthol, and 113.9° in 2,2,3-trimethylbutane. These angles are real strain relief, not a force-field error.
   - The test applies ±4° to carbons with < 3 heavy neighbours (max 2.26°), and a reported ±6° bound to branched carbons (max 5.67°).
   - The mean is 109.46°. The force field was not retuned for this.
2. **The vdW range scale is 1.1 × Bondi, and the vdW weights are 2 and 0.5 (1–4).** These were chosen by a small sweep so that the methylcyclohexane ax/eq difference (1.70; experiment ~1.74) and the butane gauche energy (0.95) come out right. The unscaled repulsion gave 0.92 for methylcyclohexane. This is a calibration of the "soft vdW" term the plan left open.
3. **The Newman curve is a relaxed scan, not a rigid rotation.** Each point rotates the back half, then minimizes 600 steps with a 400-weight dihedral hold, and reports the unrestrained energy. The rigid scan gave gauche 2.19 and syn 8.09, which misrepresents the textbook profile. The relaxed curve costs ~0.4–0.9 s, so the UI computes it lazily and caches it per bond and conformer.
4. **Fischer D/L for α-amino acids comes from Cα.** This applies when the top group is COOH and the first stereocentre carries N. The plan says "bottom-most stereocentre", which labels L-threonine as D (its bottom centre is C3). For sugars and other chains the bottom-most rule is used as the plan says.
5. **The RDKit RMSD is symmetry-aware** (`GetBestRMS`). A fixed atom mapping inflates the value for symmetric molecules; cyclohexane read 0.465 from ring-labelling symmetry alone.
6. **Fischer placement uses CIP order.** Left and right come from comparing the CIP order against a template signed volume (vertical bonds away, horizontal bonds toward the viewer), with a raw `tetrahedralVolume` fallback when CIP ties. This is how the plan's "derived from the actual R/S" is implemented.
7. **Ring flips realign substituents** during the conformer search. Axial substituents become equatorial and the reverse, rather than only being translated; translation alone never found the axial methylcyclohexane conformer.
8. **The Haworth carrier rule is applied literally:** ≥ 4 ring carbons carrying OH/CH₂OH. Glucopyranose, galactose and ribofuranose qualify. 2-Deoxyribofuranose does not, and Haworth is disabled for it, with a reason.
9. **The drive uses the β-D-glucopyranose stamp for Haworth.** The open-chain D-glucose stamp has no ring. Fischer uses the open-chain D-glucose stamp, as the plan says.
10. **Two small additions to the Newman panel.** The panel names the conformation from the reference-group dihedral, and adds the energy "above minimum" once the curve exists. Neither changes the plan's controls.

## Checklist

- [x] **No new comments.**
  - `grep -cE '(^|[^:])//|/\*'` gives 0 for `js/geometry3d.js`, `js/projections.js` and `js/viewer3d.js`.
  - The new CSS block has no `/*`.
  - The new `index.html` modal has no `<!--`.
  - The `js/app.js` additions are code only.
- [x] **Logic files have no DOM code.** `js/geometry3d.js` and `js/projections.js` run in Node through `bundle_tools_b.js`.
- [x] **Load order.**
  - `js/geometry3d.js` and `js/projections.js` come after `js/polymer.js`.
  - `js/viewer3d.js` comes after `js/spectra-view.js` and before `js/app.js`.
- [x] **Rendering.** Plain canvas 2D, no WebGL, no external libraries.
- [x] **CODE_REFERENCE.md.** The "Slice B" sub-section under "Update, later session (40)" covers the globals, model shape, force-field terms, projections API, viewer factory and load order.
- [x] **complexities.md.** It has rows for `js/geometry3d.js` (8), `js/projections.js` (7) and `js/viewer3d.js` (5), and a Slice B note for `app.js`, `index.html` and `style.css`.
- [x] **Screenshots.**
  - `screenshots/viewer3d.png`
  - `screenshots/projections.png`
  - `screenshots/projections-haworth.png`
- [x] **No git commands were used.**

## Next steps

- **Section 3 (structure tools & 3D) is complete.** Slices A and B have both landed. Section 4 of the roadmap is pending.
- **Possible follow-ups (not done, out of scope):**
  - a chair ring picker for fused systems that is not limited to rings with known faces;
  - hydrogens on Newman spokes labelled by CIP for prochiral centres;
  - a "Minimize" that re-sorts the conformer list.
- **Gotchas:**
  - **Force-field terms were calibrated together.** Changing a vdW, torsion or angle constant shifts the methylcyclohexane, butane and RDKit numbers. Rerun `test_structure_tools_b.js`, which calls `rdkit_geom.py` through the scratchpad venv.
  - **Two sign conventions must agree.** The 3D coordinates use Y = −y (screen to math), and the stereo checks use the `js/stereo.js` convention (volume < 0 means R). Any new 3D consumer must keep both.
  - **Tabs are evaluated only when the viewer opens.** Editing the molecule while the modal is open is not possible, because it is modal; reopen it to refresh.

## Fix: tabs always accessible

User report: "chair fischer and haworth cant be accessed". The Chair, Newman, Fischer and Haworth tabs were `disabled` whenever the viewed molecule did not fit them, and the reason was only in a tooltip. Fischer (acyclic) and Haworth (sugar ring) can never both apply, and the viewer ignored the selection.

### Files changed

- `js/viewer3d.js`
  - Tabs are never disabled; inapplicable ones get the `.unavailable` class and still open.
  - Selecting one shows `#viewer-unavailable` with the reason, a hint and "Show example: <name>".
  - The viewed molecule is now `state.graph` + `state.ids`, with `load()` and `startSearch()` split out of `open()`.
  - `VIEWER3D_EXAMPLES`, `showExample(tab)`, `backToMolecule()` and the `#viewer-example` banner.
  - `open()` no longer falls back to the 3D tab.
  - The Newman bond and ring picker reset when the tab does not apply, and the empty curve no longer says "computing…".
- `js/geometry3d.js`: `graphFromSmiles3d(smiles)` moved here from the test bundle appendix, so the browser has it.
- `js/projections.js`
  - Chair: a new reason for aromatic-only six-membered rings.
  - Fischer: a new "Draw wedge/hash bonds to set the stereocentres" reason, backed by `projPotentialCenter`.
  - Applicability logic is unchanged.
- `js/app.js`: the viewer's `targetAtomIds` uses the component of the first selected atom, else `largestComponent()`.
- `index.html`: `#viewer-example` banner and `#viewer-unavailable` message inside `.viewer-stage`.
- `css/style.css`
  - `.viewer-tab.unavailable` replaces `.viewer-tab:disabled`.
  - Banner and message styles, all on existing tokens.
- `CODE_REFERENCE.md` (Slice B viewer, geometry and projections entries, tests) and `complexities.md` (viewer3d row, Slice B note).
- Scratchpad
  - `build_tools_b.sh`: the duplicate `graphFromSmiles3d` was dropped.
  - `test_structure_tools_b.js`: 7 new checks.
  - `drive_tools_b.py`: disabled-tab assertions replaced; new checks for benzene, the examples and selection.

### Tests

| Command | Result |
|---|---|
| `node test_structure_tools_b.js` | PASS 89 FAIL 0 (was 82) |
| `node test_structure_tools_a.js` | PASS 280 FAIL 0 |
| `node test_insight.js` | PASS 145 FAIL 0 |
| `node test_spectra.js` | TOTAL 107/107 |
| `regress/runall.sh` | 37 files, 0 failed |
| `drive_tools_b.py` (Playwright) | 54 ok, FAILS 0, no page errors |
| `drive_tools_a.py` (Playwright) | 44 ok, no page errors |

The new Playwright checks cover the following:

- **Benzene.** No tab is disabled, and the four projection tabs are muted. The Chair reason mentions flat aromatic rings. The Haworth tab shows its reason, hint and "Show example: β-D-glucopyranose". The example draws a β-D Haworth and re-evaluates the tabs. The Fischer, Chair and Newman examples also draw.
- **Back to my molecule.** It restores benzene. The status bar reads "6 atoms · 6 bonds · 1 molecule | C6H6" before and after every example.
- **Selection targeting.** Butylcyclohexane and benzene are both on the canvas, with benzene selected, so the viewer targets benzene (Chair muted). With no selection it targets the larger butylcyclohexane (Chair available).

### Checklist

- [x] **No comments.** `grep -cE '(^|[^:])//|/\*'` gives 0 for `js/geometry3d.js`, `js/projections.js` and `js/viewer3d.js`. The new CSS block has no `/*`, the new HTML has no `<!--`, and the `js/app.js` edit is code only.
- [x] **Docs updated.** CODE_REFERENCE.md Slice B covers the never-disabled tabs, examples, `state.graph` and selection targeting. complexities.md is updated too.
- [x] **Screenshot.** `screenshots/viewer-unavailable.png` shows benzene with the Haworth message and example button.
- [ ] **No git: one slip.** One read-only `git diff -U0 js/app.js` was run by mistake inside a comment-grep command. Its output was discarded. No commit, stage, checkout or other state-changing git command was run.
