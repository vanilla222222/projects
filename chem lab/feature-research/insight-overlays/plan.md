# Section 1 — Structure insight overlays: plan

Roadmap section 1 of 4. Adds per-atom electronic insight overlays, a Gasteiger partial-charge heat map, an acid/base site finder, resonance-contributor enumeration with a viewer, and substructure search with canvas highlighting.

## Conventions (binding)

- No code comments anywhere, new or edited lines. Rationale goes in `audit.md`, system documentation in `CODE_REFERENCE.md`.
- Plain global functions, `<script>` tags, no modules, no build — same as every other `js/*.js` file.
- New logic files contain no DOM code so they run in Node (like `js/recent.js`).
- Ignore git entirely. No git commands.

## New files

### `js/insight.js` — per-atom electronic info, Gasteiger, acid/base

Built on `propContext(graph, atomIds)` (`js/properties.js`) for neighbours, implicit H (`ctx.hydrogens`), aromatic atoms and rings. Valence electrons and electronegativity come from `js/elements.js` data (`PERIODIC_ELEMENTS`; add a small Pauling table inside `insight.js` only if elements.js lacks it).

- `insightAtoms(graph, atomIds)` → `Map(atomId → {formalCharge, lonePairs, radical, hybridization, stericNumber, oxidationState})`.
  - formalCharge = `atom.charge || 0`.
  - lonePairs = floor((valenceElectrons − charge − bondOrderSum − H) / 2) for main-group atoms, clamped ≥ 0; an odd leftover electron → `radical: true`. Metals/ions with no covalent bonds: lonePairs 0.
  - hybridization from steric number (σ neighbours incl. implicit H + lone pairs): 4 → sp³, 3 → sp², 2 → sp. Overrides: any triple bond or two cumulated double bonds → sp; aromatic atom → sp²; a lone-pair N/O/S that is sp³ by count but adjacent to a π bond or aromatic atom (amide N, aniline N, pyrrole N, furan O, enol ether O) → sp² ("conjugated"). Only reported for B, C, N, O, P, S, Si and Se; others return `null`.
  - oxidationState: for each bond, the more electronegative partner takes the bond's electrons (order × 1); same-element bonds contribute 0; implicit H counts as a bond to H (EN 2.20). OS = −charge-adjusted sum, i.e. OS = charge + Σ(+order if partner more EN, −order if less EN).
- `gasteigerCharges(graph, atomIds)` → `Map(atomId → q)`, with implicit H expanded as virtual atoms (their charges are summed into the parent for display and also returned in a `hydrogenCharges` map). Standard PEOE: 6 iterations, damping 0.5ⁿ, RDKit/Gasteiger–Marsili a,b,c parameters by element + hybridization (H, C sp3/sp2/sp, N sp3/sp2/sp, O sp3/sp2, S, P, F, Cl, Br, I). Atoms without parameters get 0 and are flagged `unparameterized`.
- `acidBaseSites(graph, atomIds)` → `{acids: [...], bases: [...], mostAcidic, mostBasic}`. Each site `{atomId, hydrogenOn (atom id bearing the acidic H, acids only), group, pKa: [lo, hi], note}`. Acid pKa ranges refer to the X–H; base pKa ranges refer to the conjugate acid (pKaH). Pattern table (detection style of `propIonizable`):
  - Acids: sulfonic acid (−2 to −1), carboxylic acid (4–5; 2–3 with an α-halogen or an α-ammonium), phosphonic/phosphoric acid OH (1–2), imide N–H (8–10), 1,3-dicarbonyl C–H (9–13), phenol (10; 7–8 with an o/p-nitro), thiol (10–11), ammonium N⁺–H (9–11), aromatic N⁺–H pyridinium (5), amide N–H (15–17), alcohol (15–17), water (15.7), ketone/aldehyde α-C–H (19–20), ester α-C–H (24–25), terminal alkyne C–H (25), amine N–H (35–38), alkane (~50, only when nothing else).
  - Bases (pKaH): guanidine (13), amidine (12), aliphatic amine (10–11; tertiary 9.5–10.5), imidazole N3 (7), pyridine-type N (5), aniline (4–5; 1 with an o/p-nitro), carboxylate O⁻ (4–5), alkoxide/phenoxide O⁻ (10–16), amide O (−0.5), ketone/ester C=O O (−7 to −6), alcohol/ether O (−2).
  - `mostAcidic` = lowest pKa midpoint; `mostBasic` = highest pKaH midpoint.
- Every function takes `(graph, atomIds)` and never mutates the graph.

### `js/resonance.js` — contributor enumeration

- `resonanceContributors(graph, atomIds, {max = 12})` → `[{graph: Graph clone restricted to atomIds, charges, score, label: 'major'|'minor', moves: [...]}]`, first entry = the drawn structure.
- BFS over electron-pushing moves on cloned graphs (reuse the clone pattern of `kekuleVariants` in `js/naming-core.js`; do not modify that function):
  1. Lone pair / anion on X adjacent to Y=Z → X=Y, Z gains the pair (Z charge −1, X charge +1 relative). Covers enolate, amide, phenoxide, allyl anion, nitro, carboxylate.
  2. π bond Y=Z adjacent to cation X⁺ → X=Y, Z⁺. Covers allyl/benzyl cation, acylium, iminium.
  3. Kekulé ring shifts in aromatic rings (alternating bond flip around a 6-ring; the same flip as `kekuleVariants`).
  4. Polar π bond C=O / C=N (heteroatom more electronegative) → C⁺–X⁻, only as a terminal minor move (the resulting structure is not expanded further).
- Validity: every contributor passes `valenceProblems` (js/valence.js) and keeps period-2 atoms ≤ octet. Dedupe by a bond-order + charge signature. Never change net charge or σ skeleton.
- Scoring (lower better): +10 per atom lacking an octet (period-2 cation C/N), +4 per formal charge pair, +3 per negative charge on a less electronegative atom than an alternative, +3 per positive charge on a more electronegative atom. `label` = major when within 1 of the best score, else minor.

### `js/substructure.js` — pattern search

- `substructureQuery(text)` → query graph or `{error}`. Accepts SMILES via `parseSmiles` → `smilesStripHydrogens` → `smilesBuildGraph` (skip layout); keeps each query atom's `aromatic` flag and bond `aromatic` flag. If SMILES parse fails, fall back to the offline name table (`NAME_SMILES` in `js/name-lookup.js`, e.g. "benzene", "pyridine").
- `substructureMatches(graph, query, atomIds?)` → `[{atoms: [...ids], bonds: [...ids]}]`. Backtracking matcher (VF2-lite): order query atoms by BFS from the rarest element; atom match = same element, target charge equals query charge when the query atom is bracketed, aromatic query atom only matches a target aromatic atom (`propContext` perception); bond match = equal order, or query aromatic bond ↔ target bond with both ends aromatic, a query single bond does not match a target aromatic bond. Dedupe matches by sorted atom-id set. Cap 200 matches.

## Files to change

### `js/renderer.js`
- New state on the Renderer: `insight = {electrons: false, hybridization: false, oxidation: false, heatmap: false, acidBase: false}`, `matchAtoms: Set`, `matchBonds: Set`, and an `insightCache` keyed by a graph signature (recompute `insightAtoms` / `gasteigerCharges` / `acidBaseSites` per component only when the structure changes).
- World-space pass, after `drawHover()` and before bonds: `drawChargeHeatmap()` — a radial halo per atom, a diverging red (δ−) ↔ blue (δ+) palette with alpha ∝ |q| clamped at 0.5 e, and `drawMatches()` — a persistent highlight in a new `palette.match` color (bond strokes + atom discs, following the `drawSelection` style).
- World-space, after the atom loop: `drawLonePairs()` — pairs of dots placed in the free angular gaps (reuse `locantDirection`-style gap finding; the implementer generalizes it into a helper that returns N free directions), and a single dot for a radical. Formal charges are already drawn by `drawAtom`, so this overlay adds lone pairs and radicals only.
- Screen-space, next to `drawLocants()`: `drawInsightBadges()` — small chips like the locant chips: hybridization (`sp³` / `sp²` / `sp`), oxidation state (`+3` / `−2` / `0`, in a distinct color), and when the heat map is on, `δ` values rounded to 2 dp only for |q| ≥ 0.15 (to avoid clutter). When several badges are on for one atom, they stack along the same free direction.
- Acid/base markers (screen-space): a red `H⁺` pin with "pKa ≈ 4–5" on the most acidic site's H-bearing atom and a blue `:B` pin with "pKaH ≈ 10–11" on the most basic site. Only the top acid and top base are pinned per component.
- New `RENDER_THEMES` palette keys in dark and light: `match`, `lonePair`, `badgeText`, `badgeOx`, `badgeBg`, `heatNeg`, `heatPos`, `acidPin`, `basePin`.

### `js/app.js`
- **Insight menu:** a new `#insight-button` (lightbulb icon) in the toolbar's view group opens `#insight-menu`, a popover with five checkbox rows (Lone pairs & radicals, Hybridization, Oxidation states, Partial charges, Acid/base sites), a "Find substructure" text field with a match count and ‹ › step buttons, and a "Resonance structures…" button. Each toggle follows the `setLocants` pattern: renderer flag, `.active`, `aria-pressed`, `storageSet('insightX', '1'|'0')`, persisted and restored on load. The toolbar button gets `.active` while any overlay or search is on.
- **Shortcuts:** Alt+L lone pairs, Alt+H hybridization, Alt+O oxidation states, Alt+P partial charges, Alt+A acid/base, Alt+S focus substructure search, Alt+R resonance viewer, matched by `event.code` so macOS Option characters don't break them. The current early-return for `event.altKey` is replaced for these codes only. Esc clears the search.
- **Substructure search:** debounced input → `substructureQuery` → `substructureMatches` over the whole canvas; sets `renderer.matchAtoms` / `matchBonds`; shows "3 matches" or the error inline; ‹ › centers the view on each match without changing zoom. Search results update after edits (recompute in the existing `afterRender` chain when the graph signature changes).
- **Resonance viewer:** new modal `#resonance-overlay` (the `#import-overlay` markup pattern). Opened from Alt+R (the hovered or largest molecule, same target rule as `#info-button`), from a new "Resonance structures" item in `moleculeEntries()`, and from the properties panel. It shows a wrapping row of thumbnail canvases (the `renderImportPreview` pattern: fresh `Graph` + `Renderer`, `fitToContent`) separated by `↔` glyphs, each captioned "major" or "minor". "Only one contributor" message when none are found. Clicking a thumbnail offers "Place on canvas" (inserts beside the original, undoable).
- **Hover status:** when any insight overlay is on, `updateHoverStatus` appends "sp² · OS −1 · δ −0.31 · 2 lone pairs" for the hovered atom.
- **Properties panel (`buildPanel`):** a new "Acid/base sites" block listing every acid and base site with numeric pKa ranges (keeps the existing "Ionizable groups" block unchanged), and a "Resonance" row with the contributor count plus an "Open viewer" button.
- **Exports:** `renderExport` copies `insight`, `matchAtoms` and `matchBonds` onto the export renderer, so overlays appear in PNG and SVG exports. (Locants stay excluded, as today; out of scope.)

### `index.html`
- Load `js/insight.js`, `js/resonance.js` and `js/substructure.js` after `js/properties.js` and `js/smiles.js`, and before `js/renderer.js`.
- `#insight-button`, `#insight-menu` popover markup, `#resonance-overlay` modal.
- Help overlay: a new "Insight" `<h3>` block with the Alt shortcuts.

### `css/style.css`
- `#insight-menu` popover (anchored under its button, closes on outside click and Esc), checkbox rows, search field with count and step buttons, the resonance modal grid (thumbnails ~180×140, `↔` separators, major/minor captions). Light and dark via the existing tokens.

## Docs

- `CODE_REFERENCE.md`: new section "Update, later session (38) — structure insight overlays" covering the three new files (every exported function and return shape, the Gasteiger parameter source, the pKa table, the resonance moves and scoring), the renderer state, draw passes and palette keys, the app wiring, shortcuts, storage keys and export behavior. Update the script-load-order sentence.
- `complexities.md`: add `js/insight.js` (~6), `js/resonance.js` (~7), `js/substructure.js` (~5); update the notes on `js/renderer.js`, `js/app.js`, `index.html` and `css/style.css`.

## Tests

Node harness in the session scratchpad (`/tmp/claude-1000/-home-vanilla-Downloads-projects-chem-lab/e56d4730-7148-4eaa-be8a-05e91aa1103e/scratchpad/`): build a bundle by concatenating the needed `js/*.js` files in `index.html` order plus a `module.exports` line (the pattern the old suite used), and build test graphs through `smilesToFragment`.

`test_insight.js`:
- Lone pairs: H₂O 2, NH₃ 1, CH₄ 0, the carbonyl O of acetone 2, NO₂ oxygens (2 and 3), methyl radical C marked radical.
- Hybridization: ethane sp³, ethene sp², ethyne sp, CO₂ centre sp, benzene sp², acetamide N sp², pyrrole N sp², aniline N sp², trimethylamine N sp³.
- Oxidation states: CH₄ −4, CO₂ +4, methanol C −2, formaldehyde C 0, the acetic acid carboxyl C +3 and methyl C −3, H₂O₂ O −1.
- Gasteiger vs RDKit: install `rdkit-2026.3.6-...whl` (already in the project folder) plus numpy into a scratchpad venv, compute `ComputeGasteigerCharges` for ~20 molecules (ethanol, acetic acid, acetone, benzene, toluene, phenol, aniline, pyridine, acetonitrile, chloroform, nitrobenzene, dimethyl sulfide, caffeine, aspirin, glycine, urea, methylamine, fluoromethane, bromobenzene, triethyl phosphate) and require max |Δq| ≤ 0.02 per heavy atom. Report the actual max and mean.
- Acid/base: acetic acid → mostAcidic carboxylic acid 4–5; phenol 10; 4-nitrophenol 7–8; ethanol 15–17; acetone α-C–H 19–20; triethylamine mostBasic 9.5–10.5; aniline 4–5; pyridine 5; imidazole 7; glycine (neutral form drawn) has both a carboxylic acid and an amine; acetylacetone C–H 9–13; phenylacetylene 25; benzene has no acid under 40.
- Resonance: benzene 2; naphthalene 3; allyl cation 2; acetate 2 (both major); acetamide 2 (the drawn one major, the zwitterion minor); nitromethane 2; phenoxide 4 (the O⁻ one major); acetone 2 (C⁺–O⁻ minor); ethane 1; every contributor passes `valenceProblems` and keeps the net charge.
- Substructure: benzene (`c1ccccc1`) in toluene 1 match; in naphthalene 2; `C(=O)O` in acetic acid 1 and in aspirin 2 (the ester and the acid); `C=O` in acetone 1; `N` in triethylamine 1; `CC` in butane 3; an invalid SMILES returns `{error}`; the name "pyridine" resolves.

Regression: copy the old suite (`/tmp/claude-1000/-home-vanilla-Downloads-chem-lab/4e3c5c08-ce91-40e0-8183-6481a8aa05f0/scratchpad/test_*.js`, `runall.sh` and its bundle build) into this session's scratchpad, rebuild its bundles from the current `js/` files, and run it. Report the pass count. If a bundle recipe can't be recovered, say which files were skipped.

Browser drive (Playwright, headless, `file://…/index.html`): load aspirin via the SMILES import, toggle each overlay, search `C(=O)O`, open the resonance viewer on phenoxide, export an SVG with overlays on; require no page errors.

## Screenshots (to `feature-research/insight-overlays/screenshots/`)

1. `overlays.png` — aspirin with lone pairs, hybridization, the partial-charge heat map and acid/base pins on, plus the Insight menu open.
2. `resonance.png` — the resonance viewer for phenoxide (4 contributors, captions visible).

## Out of scope

- Curly electron-pushing arrows drawn on each resonance contributor.
- Adding locants to exports.
- Any change to naming, reactions, `propIonizable` or `kekuleVariants`.
- Explicit-H drawing mode, 3D and any spectroscopy (sections 2–3).
- New code comments of any kind.
