# Spectroscopy — implementation audit (session 39)

## Files changed

New:
- `js/spectra-nmr.js`: ¹H/¹³C prediction, shared environment, carbonyl classifier, line shapes
- `js/spectra-ir.js`: IR band rules and %T spectrum
- `js/spectra-ms.js`: isotope tables and patterns, EI fragmentation
- `js/spectra-view.js`: dock UI, peak↔atom linking, puzzle, pure helpers
- `feature-research/spectroscopy/audit.md` (this file)
- `feature-research/spectroscopy/screenshots/nmr-dock.png`
- `feature-research/spectroscopy/screenshots/puzzle.png`

Edited:
- `js/properties.js`: `propRefineRanks`, `propCanonicalRank`, `propSymmetryClasses`; `propSmiles` now calls `propCanonicalRank`
- `js/renderer.js`: `peak` palette colour (dark and light), `peakAtoms`, `drawPeaks()` pass
- `js/app.js`: `spectraView` creation and wiring, hover/afterRender/theme hooks, context-menu item, panel "Spectra" block, Alt+N / Alt+U
- `index.html`: `#spectra-button`, `#spectra-dock` section, help rows, 4 script tags
- `css/style.css`: dock styles appended; `#spectra-dock` added to the reactions-view hide rule
- `CODE_REFERENCE.md`: load-order sentence (line 3) and the new section "Update, later session (39) — spectroscopy"
- `complexities.md`: 4 new table rows and a session-39 paragraph

Scratchpad only, not in the repo: `test_spectra.js`, `build_spectra.sh`, `drive_spectra.py`, `probe_*.js`, and the snapshot JSONs.

## Test commands and results

All of these run from the session scratchpad (`/tmp/claude-1000/-home-vanilla-Downloads-projects-chem-lab/e56d4730-7148-4eaa-be8a-05e91aa1103e/scratchpad/`).

### Unit tests: `bash build_spectra.sh && node test_spectra.js`

The bundle is `index.html`-order concatenation plus `module.exports`. **TOTAL 107/107.**

| Section | Pass |
|---|---|
| 13C symmetry | 10/10 |
| 1H symmetry | 4/4 |
| multiplicity | 6/6 |
| accuracy | 4/4 |
| lineshape | 2/2 |
| IR | 43/43 |
| MS isotopes | 7/7 |
| MS molecular ion | 10/10 |
| MS fragments | 9/9 |
| puzzle | 10/10 |
| no mutation | 2/2 |

**Accuracy** covers the 25 molecules in the plan. Experimental shifts in CDCl₃ come from:
- Fulmer et al., *Organometallics* 2010, 29, 2176, and Gottlieb, Kotlyar & Nudelman, *J. Org. Chem.* 1997, 62, 7512 (the NMR impurity tables), for ethanol, acetone, ethyl acetate, toluene, pyridine, isopropanol, acetic acid, acetonitrile, chloroform, dichloromethane, diethyl ether, DMF and MTBE;
- standard textbook / SDBS-typical values (Pretsch; Silverstein) for the rest.

| Nucleus | Signals | MAE | Worst case | Target |
|---|---|---|---|---|
| ¹H | 70 | **0.033 ppm** | cyclohexanone H-3: predicted 1.57, reference 1.86, error 0.29 | MAE ≤ 0.25, max ≤ 0.8 — met |
| ¹³C | 87 | **0.58 ppm** | MTBE C(CH₃)₃ methyls: predicted 30.7, reference 26.99, error 3.71 | MAE ≤ 4, max ≤ 12 — met |

Caveats on these numbers:
- Exchangeable protons are excluded from the MAE. Their shifts are fixed range midpoints by design.
- DMF's two N-methyls are predicted as one class and scored against both reference values.
- The MAE is optimistic, because the increment tables were tuned while these molecules were being checked (see Open risks).

**Isotope ratios** (theory in brackets):
- CH₂Cl₂ M : M+2 : M+4 = 100 : 64 : 10.2 [100 : 63.9 : 10.2]
- PhBr M : M+2 = 100 : 97.5 [≈100 : 97.3]
- C₆H₆ M+1 = 6.56 % [6.6]
- PhCl M+2 = 32.2 % [32.4]
- dimethyl sulfide M+2 = 4.5 % [4.4]

### Browser drive: `pwenv/bin/python drive_spectra.py`

Headless Chromium through the Playwright venv used by the earlier `drive.py`. Result: **32 ok, 0 FAIL; console errors/warnings: `[]`; page errors: none.**

It covers:
- Alt+N opens the dock; all 4 tabs are visited; the ethyl acetate ¹H shifts appear.
- Hovering a ¹H row or a plot peak rings atoms on the editor canvas (0 → 254 amber pixels), and the highlight clears on leave.
- Hovering an atom highlights its peak.
- The peak list copies as "Predicted ¹H NMR (400 MHz, CDCl₃) δ 4.12 (q, J = 7.0 Hz, 2H), 2.05 (s, 3H), 1.26 (t, J = 7.0 Hz, 3H)".
- Dock state is restored after reload.
- Puzzle (Alt+U, benzyl bromide):
  - the title shows "Unknown · C₇H₇Br · DoU 4" with no name;
  - Check on an empty canvas warns; 1-bromopropane gives "Formula differs…"; a hint is shown;
  - the correct drawing gives "Correct — it is benzyl bromide!";
  - the MS tab shows 170/172/91; isotope zoom toggles; Exit works.
- The dock survives a theme toggle; there is no horizontal scroll at 420 px width; the dock is hidden in the Reactions view and returns in Editor; Alt+N closes it.

### Regression checks

- **propSmiles snapshot.** `node snap_props.js ./bundle_spectra.js` and `node snap_names.js ./bundle_spectra.js` were run and compared with `cmp` against the pre-edit `props_pre.json` (50 SMILES) and `names_pre.json` (158 `NAME_SMILES` values): **IDENTICAL**. This was rerun after all edits.
- **Earlier insight tests.** `bash build_insight.sh && node test_insight.js`: **PASS 145 FAIL 0**.
- **Old regression suite.** `cd regress && bash rebuild.sh && bash rebuild2.sh && bash runall.sh`: **37 files, 0 failed**.
- **Earlier browser drive** (`drive.py`, screenshots redirected to the scratchpad so the insight-overlays screenshots are not overwritten): **37 ok, FAILS 0, errors []**.

## Deviations from the plan

1. **Aromatic ¹H base is 7.36, not 7.26.** With 7.26 plus the Pretsch increments, every monosubstituted benzene came out about 0.1 ppm low. 7.36 is the base used by the Pretsch increment set itself (7.26 is benzene's own shift in CDCl₃). Benzene itself is predicted at 7.36 (lit. 7.36 in CDCl₃).
2. **The carbonyl classifier was re-derived** as `spectraCarbonylKind` in `js/spectra-nmr.js` instead of reusing `rxCarbonylKind`. The plan allowed re-deriving it, but in `spectra-ir.js`. It lives in the NMR file because the NMR, IR and MS rules all use it and that file loads first. Pulling in `reaction-rules.js` would have dragged the reaction engine into the Node bundle.
3. **Puzzle check has a fallback.** After the formula check and the `computeProperties().smiles` equality the plan specifies, `spectraSameStructure` compares WL symmetry-class multisets on a joint graph. `propSmiles` is not a full canonicalisation (6 fixed WL rounds, Kekulé-dependent), so the same molecule drawn differently could otherwise be marked "isomer".
4. **Copied peak lists start with "Predicted "**, e.g. "Predicted ¹H NMR (400 MHz, CDCl₃) δ …", so a pasted list cannot be mistaken for measured data.
5. **Extra exchangeable-proton midpoints** beyond the plan's five: aryl NH 3.6, aromatic (pyrrole-type) NH 8.0, SH 1.5 (3.4 on an arene), N⁺–H 7.5.
6. **A difficulty selector (Any/Easy/Medium/Hard)** was added to the puzzle bar. The plan defines the difficulty tiers but not how to choose one; "Any" is the default.
7. **Hovering an atom does not highlight MS peaks.** Hovering an MS peak does ring its fragment's atoms. Most atoms occur in most fragments, so highlighting in the other direction lit up nearly every stick.
8. **The `puzzle.png` screenshot uses benzyl bromide** (M/M+2 at 170/172, base 91). Bromobenzene, the plan's "ideal", is not a `NAME_SMILES` entry, so it is not in the puzzle pool.
9. **The drive checks `renderer.peakAtoms` indirectly.** `renderer` is local to `app.js`'s closure, so the drive counts amber `palette.peak` pixels on the editor canvas before and after hovering.
10. `ISOTOPES` also has a D entry (single isotope), so deuterated drawings get the right mass.

## Open risks

- **Accuracy numbers are optimistic.** The increment tables were adjusted while the same 25-molecule set was being checked, so the MAE is closer to a training error than a test error. Molecules far from the set will be worse: polyfunctional sp³ carbons, crowded arenes, heteroaromatics other than pyridine, furan, thiophene and pyrrole.
- **First-order ¹H only.** Diastereotopic CH₂ protons are not split. There are no second-order or roofing effects, and long-range or aromatic meta couplings are ignored (aromatic multiplets often read 'm' or 'd'/'t').
- **MS intensities are heuristic scores, not kinetics.** Example: benzyl bromide's M⁺ comes out at about 61 % and M−1 at 20 %, while measured spectra show a much weaker M⁺. The base peak (91) and the isotope pairs are right. Retuning a rule moves base peaks in other compounds, so the MS tests must be rerun after any change.
- **`spectraSameStructure` is WL-based.** Rare WL-indistinguishable non-isomorphic pairs (regular graphs) could be accepted as "correct". This does not arise in the 126-molecule pool.
- **The puzzle pool follows `NAME_SMILES`.** Adding names changes the pool (126 entries now: 62 easy, 38 medium, 26 hard).
- The dock recomputes all four predictions on each structural change (debounced 180 ms). This is fine for small molecules; a 100+-atom drawing may feel slow on MS, since fragmentation enumerates bond pairs.

## Checklist

- [x] **No new comments.**
  - `grep -cE '(^|[^:])//|/\*'` on each of `js/spectra-nmr.js`, `js/spectra-ir.js`, `js/spectra-ms.js` and `js/spectra-view.js` returned 0.
  - For `js/app.js`, `js/renderer.js` and `js/properties.js`, the same pattern was grepped on every line mentioning spectra/peak/`propRefineRanks`/`propCanonicalRank`/`propSymmetryClasses`, and on the full bodies of `drawPeaks` and the three new property functions (extracted with awk): 0 hits.
  - `index.html` lines containing "spectra" with `<!--`: 0.
  - `css/style.css` from `#spectra-dock {` to end of file, and all lines containing "spectra", with `/*`: 0.
- [x] **Docs present.**
  - `CODE_REFERENCE.md` has "## Update, later session (39) — spectroscopy", and its line-3 load-order sentence (now "as of session 39") lists `spectra-nmr.js`, `spectra-ir.js` and `spectra-ms.js` after `substructure.js`, and `spectra-view.js` after `reaction-lab.js`.
  - `complexities.md` has the 4 new rows plus the session-39 paragraph covering `properties.js`, `renderer.js`, `app.js`, `index.html` and `style.css`.
- [x] **Screenshots exist:** `feature-research/spectroscopy/screenshots/nmr-dock.png` (ethyl acetate, ¹H tab, CH₂ quartet hovered and ringed on the canvas) and `puzzle.png` (benzyl bromide puzzle solved, MS isotope zoom showing 170/172, two hints shown).
- [x] **No git commands** of any kind were used in this session.
