# Section 2 — Spectroscopy: plan

Roadmap section 2 of 4. Adds predicted ¹H NMR, ¹³C NMR, IR and EI mass spectra for any drawn molecule, shown in a dock under the canvas with two-way peak ↔ atom highlighting, plus an "Identify the unknown" puzzle that reuses the same dock.

## Conventions (binding)

- No code comments anywhere, in new or edited lines. Rationale goes in `audit.md`, system documentation in `CODE_REFERENCE.md`.
- Plain globals and `<script>` tags, no modules, no build. The logic files have no DOM code, so they run in Node.
- Ignore git entirely. No git commands, not even read-only ones.
- Predictions are rule-based estimates. The UI labels them "predicted" and never presents them as measured data.

## New logic files (Node-testable, all take `(graph, atomIds)` and never mutate)

Environment helpers come from `insightContext` / `insightAtomInfo` / `insightIsCarbonylCarbon` / `insightHasOxo` / `insightRingNeighbors` / `gasteigerCharges` (`js/insight.js`) and `rxCarbonylKind` (`js/reaction-rules.js`; if the Node bundle can't include reaction-rules.js cleanly, re-derive the carbonyl kind inside `spectra-ir.js` instead).

### `js/properties.js` — one small refactor
- Extract `propSmiles`'s invariant + refinement loop into `propCanonicalRank(ctx)` → `Map(atomId → rank)`. `propSmiles` calls it, and its output must be byte-identical before and after (verified on the whole regression suite plus 50 SMILES round-trips).
- Add `propSymmetryClasses(ctx)` → `Map(atomId → classId)`: atoms in the same class are topologically equivalent. Refine to a stable partition (keep iterating until the class count stops changing, rather than a fixed 6 rounds).

### `js/spectra-nmr.js`
- `predictCarbonNmr(graph, atomIds)` → `{signals: [{shift, atoms: [ids], count, type: 'CH3'|'CH2'|'CH'|'C'|'C=O'|…, note}]}`, one signal per symmetry class of carbon atoms.
  - sp³ C: Grant–Paul style base plus α/β/γ increments, with α-substituent increments for heteroatoms and halogens (Pretsch table).
  - Aromatic C: 128.5 plus benzene substituent increments (ipso/ortho/meta/para) for about 20 common substituents; heteroaromatic ring positions from a base table (pyridine, pyrrole, furan, thiophene, indole approximations).
  - Alkene C: 123.3 plus α/β/α′/β′ increments. Alkyne: 70–90 by substitution. Nitrile C 118.
  - Carbonyl by kind: ketone 205–210, aldehyde 200, acid 178, ester 172, amide 170, acid chloride 170, anhydride 167, with conjugation −5 to −10.
- `predictProtonNmr(graph, atomIds, {field: 400})` → `{signals: [{shift, atoms: [carbon or heteroatom ids], count (number of H), multiplicity: 's'|'d'|'t'|'q'|'quint'|'sext'|'sept'|'m'|'dd'|…, J: [Hz], exchangeable: bool, broad: bool, note}]}`.
  - C–H on sp³: Shoolery / Pretsch additive increments for CH₃, CH₂ and CH.
  - Aromatic H: 7.26 plus the substituent increment table (ortho/meta/para).
  - Vinyl H: Pascual–Meier–Simon increments. Aldehyde H 9.5–10. Alkyne H 2–3.
  - O–H, N–H and S–H: range midpoints (alcohol 2.0, phenol 5.5, acid 11.5, amide 7.0, amine 1.5), flagged `exchangeable` and `broad`.
  - Equivalent H grouped by the symmetry class of the bearing atom.
  - First-order splitting: n + 1 from vicinal H on non-equivalent neighbouring classes. J is ~7 Hz for sp³–sp³, 8 for aromatic ortho, 10/17 for vinyl cis/trans and 2 for geminal. When neighbouring sets have different J, use dd/dt/… up to two distinct sets, and fall back to 'm' beyond that. Exchangeable H neither split nor get split.
- `nmrLineShape(signals, {nucleus, field, from, to, points})` → `[{x, y}]`: Lorentzian lines with multiplet sub-lines (binomial intensities, J converted to ppm by field); ¹³C is proton-decoupled singlets.

### `js/spectra-ir.js`
- `predictIrBands(graph, atomIds)` → `[{from, to, center, intensity: 's'|'m'|'w', shape: 'sharp'|'broad'|'very broad', label, atoms: [ids]}]`. Groups covered:
  - O–H: alcohol/phenol 3200–3550 broad; acid 2500–3300 very broad.
  - N–H: primary amine and primary amide give 2 bands, secondary 1.
  - C–H: sp³ 2850–2960, sp² 3000–3100, sp 3300, aldehyde 2720/2820.
  - Triple bonds: C≡N 2210–2260, C≡C 2100–2260 (weak, absent when symmetric).
  - C=O by kind: acid chloride 1800, anhydride 1820 and 1760, ester 1735–1750, aldehyde 1725, ketone 1715, acid 1710, amide 1650–1690. A −25 conjugation shift, and ring-size strain for cyclopentanone (1745) and β-lactams / 4-rings.
  - C=C 1640–1680, aromatic ring 1600/1500 plus a C–H out-of-plane band chosen by substitution pattern (mono 750+700, ortho 750, meta 780+690, para 830).
  - Nitro 1520/1350, C–O 1050–1300, S=O 1050, SO₂ 1150/1350, C–F 1000–1400, C–Cl 600–800, C–Br 500–600.
- `irSpectrum(bands, {from: 4000, to: 400, points})` → `[{x, y}]` % transmittance with Lorentzian/Gaussian bands. Width follows the band's shape; depth follows its intensity.

### `js/spectra-ms.js`
- `ISOTOPES` table: monoisotopic masses and natural abundances for H, C, N, O, F, Si, P, S, Cl, Br, I, B and Se (the other elements fall back to monoisotopic only).
- `isotopePattern(formulaCounts, {threshold: 0.001})` → `[{mass (nominal and exact), abundance (base = 100)}]` by convolving per-element distributions and pruning below the threshold.
- `predictMassSpectrum(graph, atomIds)` → `{molecularIon: {mz, pattern}, peaks: [{mz, intensity, label, lost, atoms: [ids kept in the ion], rule}], basePeak}`. EI rules:
  - α-cleavage next to N, O and C=O (acylium, iminium, oxonium); benzylic cleavage giving tropylium m/z 91 when a benzyl is present.
  - McLafferty rearrangement when a γ-H sits on a carbonyl.
  - Loss of H₂O from alcohols (M−18); loss of CH₃ (M−15), halogen (M−35/79) and OR from esters.
  - Phenyl 77 and alkyl carbocation series (43, 57, 71).
  - Heuristic intensities: stabilized cations (tropylium, acylium, iminium, tertiary) rank high. The molecular ion is weak for alcohols and strong for aromatics.
  - Each fragment carries its own isotope pattern when it keeps Cl or Br.

## UI — `js/spectra-view.js` (new, DOM) plus small hooks

- **Spectra dock**: a collapsible panel `#spectra-dock` under the canvas inside the editor view. The canvas shrinks and stays visible, and the dock can be resized with a drag handle (height remembered). Tabs: ¹H NMR, ¹³C NMR, IR and MS.
  - A canvas plot per tab, drawn from scratch: axes, ticks and labels; NMR runs high→low ppm (reversed axis) with integration numbers and multiplicity labels over each peak; IR shows % transmittance with wavenumbers reversed; MS is a bar plot, m/z against relative intensity, with the isotope cluster at M.
  - Theme-aware, using the palette tokens.
  - A peak table under or beside the plot: shift, integration, multiplicity, J and assignment note.
- **Target**: follows the `largestComponent()` rule (hovered, or else the largest molecule) and updates live, debounced, when the structure changes. It shows "Draw a molecule to see its predicted spectra" when the canvas is empty.
- **Two-way highlighting**: hovering a peak or a table row puts that signal's atoms into a new `renderer.peakAtoms` Set, drawn with a new `palette.peak` color. It does not reuse `matchAtoms`, which belongs to substructure search. Hovering an atom on the canvas highlights its peak(s) in the dock.
- **Controls**: 400 / 60 MHz for ¹H; for MS, toggle between the isotope-cluster zoom and the full spectrum. "Copy peak list" copies text in the usual journal format (e.g. "¹H NMR (400 MHz, CDCl₃) δ 7.26 (m, 5H)…"). "Export PNG" saves the current plot.
- **Entry points**: a toolbar button `#spectra-button` (a spectrum icon, active while the dock is open), Alt+N to toggle the dock, a "Predicted spectra" item in `moleculeEntries()` context menus, and a link in the properties panel.
- The dock state (open, tab, height) is saved with `storageSet('spectraDock', json)`.

## "Identify the unknown" puzzle (in `js/spectra-view.js`)

- Alt+U or a "Puzzle" button in the dock header starts a round. The pool is `NAME_SMILES` entries filtered to neutral organics made of C, H, N, O, S and halogens with 3–14 heavy atoms, no isotopes, and a ¹H signal count ≥ 1. Difficulty comes from heavy-atom count: Easy ≤ 7, Medium 8–10, Hard 11–14.
- In puzzle mode the dock shows the target's spectra, the molecular formula and the degree of unsaturation, and hides the name and structure. Hover highlighting is turned off, since it would reveal the answer.
- The user draws on the canvas. "Check" compares the largest drawn component with the target by `computeProperties().smiles` (canonical). Feedback: correct, or "formula matches but structure differs", or "formula differs: you have C₄H₈O, target is C₄H₁₀O".
- Hints, one at a time: the key IR bands with their labels, then the functional-group names, then the ¹H assignments.
- "Give up" places the answer beside the drawing (the `insertSmilesFragment` pattern). A streak and the solved count are saved in `storageSet('spectraPuzzle', json)`.

## Hooks in existing files

- `js/renderer.js`: `peakAtoms` Set plus a draw block modeled on `drawMatches`; a `peak` key in both palettes; `renderExport` does not copy `peakAtoms`.
- `js/app.js`: wire the toolbar button, context-menu item, panel link, Alt+N and Alt+U (added to `INSIGHT_SHORTCUTS`), atom-hover → dock callback, and a structure-change hook for the dock refresh. Keep additions small — the logic lives in `spectra-view.js`, which gets explicit dependencies (graph, renderer, storage, toast, insert helper) through a `createSpectraView({...})` factory, the same way `createReactionLab` is wired.
- `index.html`: load `js/spectra-nmr.js`, `js/spectra-ir.js` and `js/spectra-ms.js` after `js/insight.js`, and `js/spectra-view.js` before `js/app.js`; add the dock markup, the toolbar button, and help-overlay rows for Alt+N and Alt+U.
- `css/style.css`: dock, resize handle, tabs, plot area, peak table, puzzle bar, both themes, and a phone-width layout that stacks the table under the plot.

## Docs

- `CODE_REFERENCE.md`: new section "Update, later session (39) — spectroscopy" covering every new function and return shape, the rule tables' sources (Pretsch / Silverstein-style increments), puzzle rules, storage keys, shortcuts, and the `propCanonicalRank` / `propSymmetryClasses` refactor. Update the script-load-order sentence.
- `complexities.md`: add the four new files and update the notes for `js/properties.js`, `js/renderer.js`, `js/app.js`, `index.html` and `css/style.css`.

## Tests (scratchpad; extend `build_insight.sh` → a new `build_spectra.sh`)

`test_spectra.js`:
- **Symmetry**: signal counts for ¹³C — toluene 5, p-xylene 3, o-xylene 4, benzene 1, cyclohexane 1, 2-butanone 4, isopropanol 2, tert-butanol 2, naphthalene 3, acetone 2. For ¹H — ethyl acetate 3, toluene 4, p-xylene 2, isopropanol 3.
- **Multiplicities**: ethyl acetate (q 2H, s 3H, t 3H); isopropanol (sept 1H, d 6H, broad s OH); 1-propanol CH₂ in the middle (sext or m); diethyl ether (q, t); acetaldehyde (q 1H, d 3H); styrene vinyl dd ×3.
- **Accuracy against literature experimental shifts** (CDCl₃, from textbook tables written into the test with their source named in the audit), ~25 molecules: ethanol, acetone, ethyl acetate, toluene, anisole, nitrobenzene, acetophenone, benzaldehyde, benzoic acid, phenol, aniline, pyridine, cyclohexanone, 2-butanone, isopropanol, acetic acid, styrene, methyl acrylate, acetonitrile, chloroform, dichloromethane, diethyl ether, DMF, butanal, tert-butyl methyl ether. Targets: ¹H MAE ≤ 0.25 ppm and no signal off by more than 0.8; ¹³C MAE ≤ 4 ppm and none off by more than 12. Report the actual MAE and worst case per nucleus.
- **IR**: the band set (labels present or absent) for ethanol, acetic acid, acetone, ethyl acetate, benzaldehyde, acetonitrile, aniline, N-methylacetamide, nitrobenzene, toluene (mono pattern), p-xylene (para pattern), phenylacetylene and hexane (no O–H or C=O).
- **MS**:
  - Isotope patterns: CH₂Cl₂ M:M+2:M+4 ≈ 100:64:10; bromobenzene M:M+2 ≈ 100:97; C₆H₆ M+1 ≈ 6.5%; chlorobenzene M+2 ≈ 32%; dimethyl sulfide M+2 ≈ 4.5%.
  - The molecular-ion nominal m/z for 10 molecules.
  - Fragments: toluene m/z 91 base, acetophenone 105 and 77, 2-hexanone McLafferty 58, 1-butanol M−18 = 56, butanone 43 acylium, ethylbenzene 91, triethylamine α-cleavage 86.
- **Refactor safety**: `propSmiles` output identical to the pre-change version for 50 SMILES. Save the pre-change outputs to a scratchpad JSON before editing `properties.js`.
- **Puzzle**: the pool filter gives ≥ 60 candidates. The same molecule drawn from two SMILES orderings checks as correct, an isomer gives "formula matches", and a different formula gives the formula message.
- **Regression**: rerun the existing scratchpad suite (`runall.sh`), `test_insight.js`, and the insight `drive.py`.

**Browser drive** (`drive_spectra.py`, headless Playwright): draw ethyl acetate via import; open the dock with Alt+N; visit all 4 tabs; hover a ¹H peak and assert that `renderer.peakAtoms` is non-empty; hover an atom and assert the peak highlight; copy the peak list; start a puzzle, draw the answer via import, press Check, assert "correct"; no page errors.

## Screenshots (to `feature-research/spectroscopy/screenshots/`)

1. `nmr-dock.png` — ethyl acetate with the ¹H NMR tab open and a hovered peak highlighting the CH₂ on the canvas.
2. `puzzle.png` — the puzzle with the IR or MS tab showing (bromobenzene's M/M+2 pair would be ideal).

## Out of scope

- 2D NMR, solvent choice beyond a fixed CDCl₃ label, coupling to heteronuclei (¹⁹F, ³¹P), diastereotopic protons, and second-order (roofing) effects.
- UV-Vis, Raman, and ESI/CI mass spectrometry.
- Any change to naming, reactions, insight overlays (except reading their helpers) or `propSmiles` output.
- New code comments of any kind.
