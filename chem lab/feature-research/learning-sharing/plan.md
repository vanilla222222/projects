# Section 4 — Sharing & retrosynthesis: plan

Roadmap section 4 of 4, built in **three implementer passes run one after another**, because all three edit `js/app.js`, `index.html` and `css/style.css`:

- **Slice A — Share & export**: share link, lab-notebook export (worksheet dropped).
- **Slice B — Quizzes**: DROPPED by user decision, not built.
- **Slice C — Retrosynthesis** (energy diagram dropped).

## Conventions (binding)
- Plain globals and `<script>` tags. No modules, no build step, no external libraries.
- Logic files contain no DOM code, so they run in Node.
- **No code comments** in new or edited lines.
- **No git commands of any kind**, including read-only ones.
- Update `CODE_REFERENCE.md` ("Update, later session (41) — sharing & retrosynthesis", with one sub-section per slice) and `complexities.md` in the same pass.
- The only network access is what already exists (the PubChem opt-in). Nothing new leaves the browser.

## Toolbar
Two new menu buttons go in the right-hand toolbar group next to `#viewer-button`, using the `#insight-menu` popover pattern:
- `#share-menu`: Copy share link, Lab notebook…
- Retrosynthesis gets its own toolbar button `#retro-button` (Slice C). There is no learn menu.

Each slice adds its own items to these menus.

Alt shortcuts:

| Shortcut | Action |
|---|---|
| Alt+K | Copy share link |
| Alt+J | Lab notebook |
| Alt+T | Retrosynthesis |

All of these were free (C E F G J K M Q T V W X Y Z), and each one gets a help row.

---

## Slice A — Share & export

### A1. Share link (`js/share.js`, new, Node-testable; wiring in `js/app.js`)
- Two hash formats:
  - `#g=<base64url>`: the exact canvas (atoms, bonds, stereo, annotations, brackets). It is a compact array encoding of `serializeGraph` output, with coordinates rounded to 0.1, then compressed with `CompressionStream('deflate-raw')` when available, and otherwise sent uncompressed with a `u` prefix.
  - `#smiles=<urlencoded>`: human-readable. `.` separates components. No stereo, because `propSmiles` doesn't write any; this is documented.
- Functions:
  - `shareEncodeGraph(state)` → string (sync array encoding)
  - `shareDecodeGraph(str)` → state, or `{error}`
  - `shareParseHash(hash)` → `{kind: 'g'|'smiles', payload}` or null
  - The async compress/decompress wrappers live in `app.js`, because they need browser APIs.
- Copy share link:
  - Copies `location.href` with its hash replaced by `#g=…`.
  - A toast confirms the copy and has a "SMILES link instead" action.
  - When the link is over 8,000 characters, the toast warns that it may be too long for some chat apps.
- Loading a link at startup:
  - It runs after the autosave restore; the order is settled in the code around the `restoredSession` toast.
  - A link with a hash replaces the canvas.
  - The previous drawing is pushed onto the undo history first, and a toast says "Loaded shared structure · Undo restores your previous drawing".
  - Afterwards `history.replaceState` clears the hash, so a reload doesn't load the link again.
  - A `hashchange` listener does the same while the app is open.
  - Malformed payloads get an error toast and never touch the canvas.

### A2. Printable worksheet: DROPPED by user decision (2026-09-29). Not built. The `#print-root` + `@media print` mechanism is kept only for the notebook Print button.

### A3. Lab-notebook export (`js/notebook.js`, new, Node-testable content builder; modal in `app.js`)
- Modal `#notebook-overlay`:
  - target: the selection, otherwise all components (one entry per molecule);
  - a free-text "Notes / procedure" box and an experiment title;
  - checkboxes for sections: properties, ¹H NMR, ¹³C NMR, IR, MS;
  - buttons: **Download HTML** (a self-contained file with inline SVG and CSS), **Download Markdown** (with a `data:image/svg+xml` image per structure) and **Print**, which uses the A2 print root.
- `notebookEntry(graph, ids, opts)` → `{name, iupac, formula, mw, exactMass, smiles, properties, nmrH: [...], nmrC: [...], ir: [...], ms: [...]}`.
  - It uses `nameStructureDetailed`, `computeProperties`, and the Section 2 predictors (read their APIs from CODE_REFERENCE session 39).
- `notebookHtml(entries, meta, svgs)` and `notebookMarkdown(entries, meta, svgs)` → strings.
- Spectrum mini-plots:
  - `notebookSpectrumSvg(kind, data, {width, height})` is a pure SVG string builder, not a canvas.
  - ¹H is sticks with multiplicity labels; ¹³C is sticks; IR is a transmittance curve with bands labelled; MS is bars with the top 5 m/z labelled.
- Includes the date and the app name. Escape all user text.

### Slice A tests and drive
- `test_share_export.js`:
  - share round trips over 20 structures, including stereo, a bracket, arrows and text, compare equal after decode;
  - malformed input is rejected;
  - `#smiles=` parse;
  - `notebookEntry` numbers match `computeProperties` and the predictors;
  - HTML and Markdown contain every requested section and escape `<script>` in the notes;
  - the SVG builders produce well-formed XML (parsed with a tiny tag balancer).
- `drive_share.py`:
  - copy link, open it in a new page, same atom and bond counts and name;
  - undo after loading restores the previous drawing;
  - `#smiles=CCO` works;
  - `page.pdf()` of the print media produces a PDF of 1 page or more;
  - the notebook HTML download contains the name and an `<svg`;
  - no page errors.
- Screenshots: `notebook.png` (the HTML export opened in a page).

---

## Slice B — Quizzes: DROPPED by user decision (2026-09-29). Not built.

---

## Slice C — Reasoning tools

### C1. Retrosynthesis (`js/retro.js`, new, Node-testable; DOM in `js/retro-view.js`, `createRetroView(deps)`)
- The approach is **generate-and-test**, so every suggestion is backed by the app's own forward engine:
  - `RETRO_TRANSFORMS`: about 25 structural reverse transforms. Each is `{id, name, rule, match(graph, ids) → [{precursors: [smiles], reagents: [{smiles, role}], conditions}]}`, keyed on target functional groups found with `rxAnalyze`-style perception.
  - Every candidate is **verified** by running `predictReaction(precursors + reagents, conditions)` and checking that the best outcome, or one of the alternatives, has a product whose canonical `propSmiles` equals the target's.
  - Only verified candidates are shown. Candidates that verify only as an alternative get a "minor route" badge.
- Initial transform list (the implementer maps each to a real `RX_RULES` id and drops any with no forward rule, recording which in the audit):
  - **Alcohols**: from an alkene (hydration or hydroboration); from an aldehyde or ketone (reduction); from a carbonyl plus Grignard (C–C disconnection); from a halide (SN2).
  - **Halides**: from an alcohol, or from an alkene plus HX.
  - **Ethers**: Williamson synthesis.
  - **Esters**: Fischer esterification, or from an acid chloride.
  - **Amides**: from an acid chloride plus an amine.
  - **Alkenes**: by dehydration, E2, or Wittig.
  - **Alkanes**: by hydrogenation.
  - **Carbonyl oxidation states**:
    - ketones and aldehydes by oxidising an alcohol;
    - acids by oxidation or by nitrile hydrolysis;
    - nitriles by SN2 with cyanide.
  - **Carbon–carbon and ring formation**: aldol; Diels–Alder; alkyne alkylation; epoxidation; dihydroxylation.
  - **Aromatic chemistry**: EAS nitration, halogenation and Friedel–Crafts acylation; nitro → amine reduction; reductive amination.
- `retroDisconnect(graph, ids)` → verified candidates, ranked by:
  - (1) precursors being simpler (fewer heavy atoms, fewer stereocentres);
  - (2) precursors appearing in `NAME_SMILES` (a "common starting material" badge);
  - (3) main route over minor route.
- `retroTree(target, depth ≤ 3, budget)` expands on demand only; there is no automatic full search.
- UI: modal `#retro-overlay`.
  - The target is the selection, otherwise the largest component.
  - Disconnection cards show precursor thumbnails, a ⇒ retro arrow and a reagent label; clicking one expands a precursor into its own disconnections, forming a tree breadcrumb.
  - **Send route to canvas** builds the forward route with `buildRouteScheme` and inserts it.
  - **Open in Reaction lab** loads the precursors and reagents with `reactionLab.addSmiles` and switches view.
  - An empty state explains the coverage.

### C2. Reaction energy diagram: DROPPED by user decision (2026-09-29): the app stays a chemistry tool, and qualitative teaching visuals are out.

### C tests and drive
- `test_retro.js`, with RETRO_TARGETS of 15 molecules:

  | Target | Must include |
  |---|---|
  | 2-butanol | alkene hydration or ketone reduction |
  | cyclohexanol | at least one route |
  | 2-methyl-2-butanol | Grignard |
  | 1-bromobutane | at least one route |
  | ethyl acetate | Fischer |
  | N-methylacetamide | at least one route |
  | acetophenone | Friedel–Crafts |
  | benzoic acid | at least one route |
  | cyclohexene | at least one route |
  | butanenitrile | at least one route |
  | diethyl ether | Williamson |
  | nitrobenzene | at least one route |
  | aniline | at least one route |
  | cyclohexane | at least one route |
  | the Diels–Alder adduct of butadiene with maleic anhydride | Diels–Alder |

  - Each target must return at least the named route; record the counts.
  - **Every returned candidate re-verifies forward** in the test.
  - Timing: `retroDisconnect` ≤ 1.5 s per target (report the times).
- `drive_retro.py`:
  - retrosynthesis on 2-methyl-2-butanol, expand one precursor, send the route to canvas;
  - no page errors.
- Screenshots: `retro.png`.

---

## Files summary
- **New:**
  - Slice A: `js/share.js`, `js/notebook.js`
  - Slice B: none (dropped)
  - Slice C: `js/retro.js`, `js/retro-view.js`
  - Load order: the logic files after `js/projections.js` (retro after the reaction files); the view factories before `js/app.js`.
- **Edited:**
  - `js/app.js`: menus, shortcuts, hash loading, modals, print root, wiring.
  - `index.html`: modals, menus, `#print-root`, scripts, help rows.
  - `css/style.css`: modals, `@media print`. Both themes.
- **Docs:** `CODE_REFERENCE.md` (session 41) and `complexities.md` entries for every new file, plus notes for the edited ones.

## Out of scope
- Server-side sharing and URL shorteners.
- Stereo in `#smiles=` links (use `#g=`).
- Real thermochemistry or quantum calculations; energies are explicitly qualitative, apart from the ΔH from bond enthalpies.
- Automatic multi-step retrosynthetic search (the tree only expands when you click).
- New forward reaction rules.
- Changes to the naming engine.
- The quizzes (Slice B, dropped).
- New code comments.
- Energy diagrams (C2, dropped) and any teaching or learning features.
