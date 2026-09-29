# Section 3 — Structure tools & 3D: plan

Roadmap section 3 of 4. Built by two implementer passes in sequence, because both edit `js/app.js` and `index.html`: **Slice A** covers the templates, the isomer enumerator and polymer brackets; **Slice B** covers the 3D viewer, chair, Newman, Fischer and Haworth.

## Conventions (binding)

- No code comments in new or edited lines. The why goes in `audit.md`; the what goes in `CODE_REFERENCE.md`.
- Plain globals, `<script>` tags, no modules, no build, **no external libraries** (the 3D viewer is plain canvas 2D).
- Logic files have no DOM code, so they run in Node.
- No git commands of any kind.

---

## Slice A

### A1. Biomolecule template stamps (`js/stamps.js`, `index.html`, `js/app.js`)
- A `BIO_STAMPS` table using the `FUSED_STAMPS` shape (`{label, smiles, group}`), with lazy fragment caching through `bioStampFragment(key)`, routed in `placeStamp` straight after the `FUSED_STAMPS` check.
  - **Amino acids**: the 20 standard L-amino acids as neutral forms, with `@` stereo (glycine achiral; L-cysteine is R).
  - **Sugars**: open-chain D-glucose, D-galactose, D-mannose, D-fructose, D-ribose and 2-deoxy-D-ribose; α- and β-D-glucopyranose; β-D-ribofuranose.
  - **Nucleobases**: adenine, guanine, cytosine, thymine and uracil.
- Three new collapsible sidebar sections, "Amino acids", "Sugars" and "Nucleobases", collapsed by default, with their grid ids added to `STAMP_THUMB_GRIDS`. Search works with no changes.
- Test: every SMILES parses; the stereocentre count and each R/S from `findStereocenters` match the expected values (e.g. L-alanine S, L-cysteine R, D-glucose 2R,3S,4R,5R); every generated name is non-empty.

### A2. Isomer enumerator (`js/isomers.js`, new, Node-testable; modal in `js/app.js`)
- `parseFormula(text)` → counts or `{error}`. It accepts Hill or free order and elements C, H, N, O, S, F, Cl, Br, I and P; it rejects a negative or non-integer degree of unsaturation (DoU).
- `enumerateIsomers(counts, {stableOnly: true, limit: 2000, timeBudgetMs: 4000})` → `{isomers: [{graph, key}], complete: bool, count}`.
  - Heavy-atom multigraph generation with valences C4 N3 O2 S2 P3 and halogen 1 (no hypervalent S or P). The implicit H count must equal the formula's H.
  - Orderly generation, deduplicated by a true canonical key: `isomerCanonicalKey(graph)` uses WL-refined partitions plus backtracking over tied cells to find the lexicographically minimal adjacency string. Exact, not heuristic — fine at ≤ 12 heavy atoms.
  - Heavy-atom cap of 12. Above it, return `{error: 'too large'}`.
- `stableOnly` filter rejects:
  - O–O and other heteroatom–heteroatom single bonds except N–N, S–S and N–O in nitro (no charges are generated, so nitro is out of scope);
  - enols and ynols, gem-diols and hemiacetals (C bearing 2 OH, or OH + OR);
  - triple bonds in rings < 8, and allenes in rings < 9;
  - rings with a double bond at a ring fusion atom in rings < 8 (Bredt's rule);
  - aminals and N–C–OH carbinolamines.
- Test counts (constitutional, stableOnly off unless noted):

  | Formula | Count |
  |---|---|
  | C₄H₁₀ | 2 |
  | C₅H₁₂ | 3 |
  | C₆H₁₄ | 5 |
  | C₇H₁₆ | 9 |
  | C₈H₁₈ | 18 |
  | C₉H₂₀ | 35 |
  | C₁₀H₂₂ | 75 |
  | C₄H₈ | 5 |
  | C₃H₈O | 3 |
  | C₄H₁₀O | 7 |
  | C₂H₇N | 2 |
  | C₃H₉N | 4 |
  | C₆H₆ | 217 (OEIS-known total including strained forms; record it if it differs, don't force it) |
  | C₃H₆O, stableOnly on | 7 (acetone, propanal, allyl alcohol, methyl vinyl ether, oxetane, methyloxirane, cyclopropanol) |
  | C₂H₄O₂, stableOnly on | must include acetic acid and methyl formate, and exclude any peroxide or gem-diol |

  Also time C₈H₁₈ (report it).
- UI: modal `#isomer-overlay`, a copy of the resonance modal pattern with `resonanceThumbnail` generalized to take any `Graph`.
  - A formula input, pre-filled with the target molecule's formula; a "Stable only" checkbox; and a count line ("75 isomers" or "2000+ shown, stopped at limit").
  - A paged grid (48 per page) of thumbnails laid out with `computeLayout`, captioned with `nameStructure` (named lazily per page) and sortable by name or by branching.
  - Click to select, double-click or "Place on canvas" to place, via `insertSmilesFragment`.
  - The enumeration runs in time-sliced chunks (`setTimeout` batches) so the page never freezes, with a Cancel button.
  - Opened by Alt+I and a "Find isomers" item in molecule and selection context menus.

### A3. Polymer brackets (a new annotation kind)
- Annotation `{kind: 'bracket', atomIds: [...], n: 'n', label}`.
  - Created from a selection whose atoms have exactly two bonds leaving the selection: "Polymer brackets" in `selectionEntries()`, or Alt+B.
  - Otherwise a toast explains: "select one repeat unit with exactly two bonds leaving it".
- Rendering (`drawAnnotations` branch): two square brackets drawn perpendicular across the two crossing bonds at their midpoints, a subscript `n` at the lower right, and the polymer name under the unit in the name-label style.
  - The geometry is recomputed every frame from the live atom positions.
  - The generic box highlight covers hover and selection.
- Name: `polymerName(graph, bracket)` in a new `js/polymer.js` (Node-testable).
  - Source-based naming for addition polymers:
    - a 2-carbon backbone unit maps to its monomer CH₂=CXY, named by `nameStructure` on a synthesised monomer graph, giving poly(ethylene), poly(propylene), poly(styrene), poly(vinyl chloride), poly(tetrafluoroethylene), poly(methyl methacrylate) and poly(acrylonitrile);
    - a 4-carbon unit with an internal C=C maps to a 1,3-diene monomer, giving poly(isoprene) and poly(butadiene).
    - Multi-word or locant-bearing monomer names are wrapped in parentheses.
  - Otherwise a structure-based fallback: "poly(" + a CRU description + ")" for the common cases poly(oxyethylene), poly(oxymethylene) and poly(ethylene terephthalate) (a known-CRU table for PET, nylon-6 and nylon-6,6, matched by canonical key), and finally "poly[(C₂H₄O)]" using the formula.
  - The repeat formula shows as "(C₂H₄)ₙ" in the status bar when the bracket is hovered.
- Plumbing, every place the scout found:
  - `sanitizeAnnotations` (js/app.js);
  - `drawAnnotations` and `drawAnnotationHighlight` (js/renderer.js);
  - `annotationPoints`, `insertFragment`'s annotation filter and the copy-with-offset path, which remaps `atomIds` to the new ids (js/interactions.js);
  - `annotationEntries` ("Rename", "Delete brackets");
  - atom deletion prunes brackets whose atoms are removed or no longer have 2 crossing bonds.
- Test: names for the 11 polymers above; a bracket survives the save → load round trip and copy/paste (with remapped ids); deleting a unit atom removes its bracket.

### A tests and drive
`test_structure_tools_a.js` covers everything above. Rerun the regression suite, `test_insight.js` and `test_spectra.js`. `drive_tools_a.py` checks placing a stamp from each new section, the isomer modal for C₆H₁₄ (5 cards, one placed), and drawing PVC with brackets then saving and reopening it. No page errors.

---

## Slice B

### B1. 3D embedding & force field (`js/geometry3d.js`, new, Node-testable)
- `embed3d(graph, atomIds, {seed})` → `{atoms: [{id, element, x, y, z, implicitH: bool}], bonds}`.
  - Explicit hydrogens are added.
  - Starting coordinates come from the 2D positions (converted to Å at 1.5 Å/bond), with z ±0.8 Å from the wedge/hash, plus small random jitter; then force-field minimization.
- Force field, a simplified UFF-like model:
  - bond stretch with ideal lengths from covalent radii and a bond-order correction;
  - angle bend with ideal angles by hybridization (`insightAtomInfo`: sp³ 109.5°, sp² 120°, sp 180°);
  - torsions (sp³–sp³ 3-fold; sp²–sp² 2-fold planar);
  - improper out-of-plane terms for sp² centres;
  - a 1–4-and-beyond soft vdW repulsion;
  - a chirality restraint keeping each drawn stereocentre's signed volume, and an E/Z restraint on stereo double bonds.
  - Minimizer: FIRE or conjugate gradient, ≤ 2000 steps.
- `ff3dEnergy(model)` → kcal/mol-like units (labelled "relative, arbitrary units" in the UI).
- `conformers3d(graph, atomIds, {count: 10})` → a torsion-kick search over rotatable bonds and ring flips, deduplicated by heavy-atom RMSD < 0.3 Å and sorted by energy.
- Tests: C–C 1.53 ± 0.03 Å, C=C 1.34, C≡C 1.20 and aromatic C–C 1.39 ± 0.03; sp³ angles 109.5 ± 4°; benzene planar within 0.02 Å; cyclohexane lowest conformer is a chair (ring torsions ±(50–60)°); R/S preserved for all 20 amino acid stamps (signed volume vs `findStereocenters`); E/Z preserved for (E)- and (Z)-2-butene; butane lowest conformer anti.
- RDKit check: for 10 rigid molecules (benzene, cyclohexane, adamantane, camphor, naphthalene, pyridine, acetone, caffeine, norbornane, indole), heavy-atom RMSD after alignment vs RDKit ETKDG + MMFF ≤ 0.25 Å. Report the per-molecule values.

### B2. Viewer modal (`js/viewer3d.js`, new, DOM; `createViewer3d(deps)` factory like `createSpectraView`)
- Modal `#viewer-overlay`, large (min(1100px, 95vw) × min(720px, 90vh)), with tabs **3D | Chair | Newman | Fischer | Haworth**. A tab that can't apply to the molecule is disabled, with a tooltip saying why. Target = `largestComponent()`. Opened by Alt+D, a toolbar button `#viewer-button` and a "3D & projections" context-menu item.
- **3D**:
  - Canvas 2D ball-and-stick, with depth-sorted atoms, radial-gradient shading, CPK colours from `colorForElement` and bond cylinders drawn as shaded lines.
  - Styles: ball-and-stick, sticks, space-filling (vdW radii).
  - Drag to rotate (trackball), wheel to zoom, double-click to recentre, and an auto-rotate toggle.
  - An H show/hide toggle; a conformer list with relative energies (click to switch); a "Minimize" button; export PNG.
  - Hovering an atom shows its element, hybridization and a stereo label.
  - A distance/angle measure mode: click 2 atoms for a distance in Å, 3 for an angle, 4 for a dihedral.
- **Chair** (`chairAnalysis(graph, atomIds)` in `js/projections.js`, new, Node-testable):
  - For each 6-membered saturated carbocycle or pyranose ring (the first one, with a ring picker if there are several), draw both chair conformers in the standard textbook perspective with substituent labels.
  - Axial/equatorial assignment comes from the wedge/hash up/down faces.
  - A-value table (Me 1.74, Et 1.79, iPr 2.15, tBu 4.9, Ph 2.8, OH 0.87, OMe 0.6, NH₂ 1.4, F 0.25, Cl 0.53, Br 0.48, I 0.47, CO₂H 1.35, CO₂Me 1.27, CN 0.2, CH₂OH 1.8, vinyl 1.7); unknown groups default to 1.7.
  - Output: the ΔG estimate and "the more stable chair" with an estimated equilibrium ratio at 25 °C.
- **Newman** (`newmanData(model, bondId, dihedral)`):
  - The bond is the one hovered when the viewer opened, otherwise the central rotatable C–C of the longest chain.
  - Front carbon with 3 spokes, back carbon as a circle; a slider rotates the back carbon 0–360°.
  - A torsional energy curve from the force field, with the current angle marked, and anti / gauche / eclipsed / syn labels.
  - A dropdown picks another rotatable bond.
- **Fischer** (`fischerProjection(graph, atomIds)`):
  - For acyclic molecules with ≥ 1 stereocentre on the longest carbon chain: a vertical chain with the most oxidized end (CHO/CO₂H/C=O) at the top, C1 at the top.
  - Horizontal groups point toward the viewer; the placement is derived from the actual R/S configuration, not the 2D drawing.
  - D/L is assigned from the bottom-most stereocentre, and the classic crossed-lines drawing has labels.
- **Haworth** (`haworthProjection(graph, atomIds)`):
  - For a pyranose or furanose ring (a ring with one O and ≥ 4 carbons carrying OH/CH₂OH), draw the flat ring with the ring O at the back right and the anomeric carbon on the right.
  - Substituents go up or down by stereo; α/β and D/L are labelled.
- Projection tests:
  - D-glucose Fischer: C2 OH right, C3 left, C4 right, C5 right, labelled D.
  - L-alanine Fischer: NH₂ left, labelled L.
  - (2R,3S)-2,3-dibromobutane recognised as meso (symmetric Fischer).
  - β-D-glucopyranose Haworth: C1-OH up, C2 down, C3 up, C4 down, CH₂OH up, labelled β-D; α-D-glucopyranose C1-OH down.
  - Chair: trans-1,4-dimethylcyclohexane diequatorial (ΔG 3.5); cis-1,2-dimethyl ax/eq in both chairs, ΔG 0; tert-butylcyclohexane eq with ratio > 99.9 : 0.1; menthol best chair all-equatorial; β-D-glucopyranose all-equatorial.
  - Newman: butane anti at 180° is the minimum, gauche ~0.9 above, syn-eclipsed the maximum.

### B tests and drive
`test_structure_tools_b.js` and `rdkit_geom.py` (venv) cover the above. Regression covers everything, including Slice A's tests. `drive_tools_b.py`: menthol → Alt+D, cycle all 5 tabs (Fischer disabled for menthol; switch to D-glucose via stamp for Fischer and Haworth), rotate by a synthetic drag, measure a distance, no page errors.

---

## Hooks summary
- `js/renderer.js`: the bracket drawing.
- `js/app.js`: context-menu items, Alt+I/B/D (added to `INSIGHT_SHORTCUTS`), `sanitizeAnnotations`, the isomer modal, and the viewer factory wiring.
- `js/interactions.js`: bracket copy/paste/remap/prune.
- `js/stamps.js`: `BIO_STAMPS`.
- `index.html`: 3 stamp sections, 2 modals, `#viewer-button`, the scripts `js/isomers.js`, `js/polymer.js`, `js/geometry3d.js` and `js/projections.js` (after `js/insight.js`) and `js/viewer3d.js` (before `js/app.js`), plus help rows.
- `css/style.css`: modals, tabs, grid paging and the viewer controls, in both themes.

## Docs
- `CODE_REFERENCE.md`: "Update, later session (40) — structure tools & 3D", with sub-sections per slice, the load-order sentence, and the bracket annotation schema added to the annotations description.
- `complexities.md`: add the 5 new files and update the notes for stamps.js, app.js, renderer.js, interactions.js, index.html and style.css.

## Screenshots (`feature-research/structure-tools/screenshots/`)
1. `viewer3d.png` — menthol in the 3D tab (ball-and-stick, conformer list visible).
2. `isomers.png` — the C₆H₁₄ isomer grid with names (Slice A), *or* the Haworth/Fischer pair for glucose if more informative. Take both if cheap; the audit lists which is primary.

## Out of scope
- Stereoisomer enumeration.
- Charged or zwitterionic isomers.
- Real MMFF parameters.
- WebGL.
- Saving 3D coordinates into files (MOL export stays 2D).
- Peptide or oligosaccharide builders.
- Copolymers and end groups.
- Any change to naming rules.
- New code comments.
