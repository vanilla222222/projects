# Section 4, Slice A: share and export (audit)

## Files changed
- **New**
  - `js/share.js`: the `#g=` / `#smiles=` codec and hash parsing. It has no DOM code.
  - `js/notebook.js`: notebook entries, the SVG mini-plots, and the HTML and Markdown builders. It has no DOM code.
  - `feature-research/learning-sharing/audit.md`: this file.
  - `feature-research/learning-sharing/screenshots/notebook.png`
  - `feature-research/learning-sharing/screenshots/toolbar.png`
- **Edited**
  - `js/app.js`: the share menu, the async deflate wrappers, copy link and SMILES link, `loadShareHash` on startup and on `hashchange`, the notebook modal, `structureSvg`, Print through `#print-root`, Alt+K and Alt+J, and the Escape handling.
  - `index.html`: the `#share-button` / `#share-menu` popover, `#notebook-overlay`, `#print-root`, the two script tags after `js/projections.js`, and the Alt+K and Alt+J help rows.
  - `css/style.css`:
    - share menu and notebook dialog styles, on the theme tokens;
    - `#print-root` and `@media print`, scoped to `body.printing`;
    - the toolbar compaction and its breakpoints.
  - `CODE_REFERENCE.md`: a new "Update, later session (41) — sharing & retrosynthesis" section, with the "Slice A" sub-section.
  - `complexities.md`: rows for the two new files, plus a session-41 note on the edited files.
- **Session scratchpad** (not in the repo): `build_share.sh`, `test_share_export.js`, `drive_share.py`, `drive_toolbar.py`.
- **Side effect.** Re-running the earlier drives as regression checks regenerated their screenshots with the compacted toolbar:
  - `drive_tools_a.py` and `drive_tools_b.py` rewrote `feature-research/structure-tools/screenshots/*.png`;
  - `drive_spectra.py` rewrote `feature-research/spectroscopy/screenshots/{nmr-dock,puzzle}.png`.
  All three drives passed.

## Tests (exact results)

| Command (session scratchpad) | Result |
|---|---|
| `bash build_share.sh && node test_share_export.js` | `PASS 429 FAIL 0` |
| `cd regress && bash runall.sh` | `37 files, 0 failed` |
| `node test_structure_tools_a.js` | `PASS 280 FAIL 0` |
| `node test_structure_tools_b.js` | `PASS 89  FAIL 0` |
| `node test_insight.js` | `PASS 145 FAIL 0` |
| `node test_spectra.js` | `TOTAL 107/107` |
| `pwenv/bin/python drive_share.py` | 44 ok, `FAILS: 0`, `errors: []` |
| `pwenv/bin/python drive_toolbar.py` | 56 ok, `FAILS: 0`, `errors: []` |
| `pwenv/bin/python drive_tools_a.py` (re-run after the edits) | `DRIVE PASS — 0 failures`, no page errors |
| `pwenv/bin/python drive_tools_b.py` (re-run after the edits) | 54 ok, `FAILS 0`, `errors []` |
| `pwenv/bin/python drive_spectra.py` (extra re-run because of the toolbar change) | 32 ok, `FAILS: 0`, `errors: []` |

The baseline before any edits was the same: 37 files / 0 failed, 280, 89, 145 and 107/107.

Key numbers:
- The 20-structure round-trip drawing is 18,968 characters of JSON. It becomes 4,188 characters compact, then 3,141 characters deflated and base64url-encoded.
- The drive's two-molecule drawing (alanine with a wedge, phenol, one text label and one labelled arrow) gives a 372-character `#g=z…` link.
- The notebook Print with `emulate_media('print')` produced a 4-page A4 PDF (234 KB) for two molecules with every section.

What `drive_share.py` checks:
- **Share menu.**
  - It has exactly two items.
  - Escape closes it.
  - An empty canvas gives a warning.
- **Copy link.**
  - The copied link is a compressed `#g=`.
  - The toast offers "SMILES link instead", and that action copies a two-component `#smiles=` link.
  - Alt+K copies the same link.
- **Opening the link in a fresh page.**
  - The page has a different autosaved drawing.
  - It loads the same atoms, bonds, stereo count, annotations and name.
  - The hash is cleared.
  - The "Loaded shared structure · Undo restores your previous drawing" toast appears, and the "Restored…" toast is suppressed.
  - Ctrl+Z restores the previous drawing, and Ctrl+Y goes back to the shared one.
- **`#smiles=` links.**
  - `#smiles=CCO` via `hashchange` loads ethanol, and Undo goes back.
  - A startup `#smiles=CC(%3DO)O` loads acetic acid.
- **Malformed links** get an error toast and leave the canvas untouched. The six tested: `#g=zAAAA`, `#g=u%%%`, `#g=q123`, a `#g=u` payload that is not an app structure, `#smiles=C1CC(` and an empty `#smiles=`.
- **Notebook.**
  - Alt+J targets the selected component, and "all components" when nothing is selected.
  - The HTML download contains the name and `<svg`, escapes a `<script>` title, has every section for both molecules, and makes no external references.
  - The Markdown download honours an unchecked IR section and embeds `data:image/svg+xml`.
  - Print calls `window.print` (stubbed on the test side), and `#print-root` holds 2 entries.
  - Print media shows only the print root, and `page.pdf()` produces a PDF of 1 page or more.
  - `afterprint` clears the print root.
- **Help and wording.** The Alt+K and Alt+J help rows exist, and the page contains no "Learn" wording.

## Toolbar layout fix (added mid-task at the user's request)
- **Problem.** The top toolbar ran off-screen.
  - Before this change, at 1440 px, `#toolbar` needed 1,248 px for 1,168 px of space, so `#clear-button` ended at x = 1,472.
  - At 1920 px the tool labels were shown and needed 1,703 px for 1,648 px.
  - The new share button added 32 px.
- **Change (CSS only; no markup, ids or behaviour changed).**
  - Buttons inside `#toolbar` are sized by `#toolbar`-scoped rules, so dialogs that share `.text-button` / `.icon-button` are unaffected.
    - Tool and icon buttons: 28 px (from 30/34), with 16 px icons (from 17).
    - Group padding 2 px, gap 1 px. Toolbar gap 6 px, padding 8 × 12 px.
    - The zoom readout is 44 px wide.
  - Tool labels now hide below 1900 px (previously 1780 px).
  - Up to 1400 px:
    - buttons are 26 px, the minimum hit target, with 15 px icons;
    - text buttons use 12 px type with 6 px padding;
    - the toolbar gap is 4 px.
  - Up to 1330 px, `#smiles-button` is hidden. Copy SMILES is still available from Ctrl+Shift+C, the canvas context menu and the properties panel.
  - When the info panel is open, the toolbar wraps to a second row instead of overflowing, and `#smiles-button` is hidden. The panel's open/close already calls `resizeCanvas()`, and the drive confirms the canvas backing store matches its box after the wrap.
  - `overflow-x: auto` stays as the final fallback.
- **Verification** (`drive_toolbar.py`, dark and light themes, at 1280, 1366, 1440 and 1920 px).
  - Every visible toolbar child and button has `getBoundingClientRect().right ≤ innerWidth`.
  - `document.documentElement.scrollWidth ≤ innerWidth`.
  - The toolbar has no internal overflow.
  - The smallest button is ≥ 26 px.
  - Every icon button still has its tooltip.
  - With the info panel open at 1440 px, the toolbar wraps with zero overflow.
- The remaining horizontal slack at 1280 px is about 70 px. The screenshot is `screenshots/toolbar.png` (1366 px wide, cropped to the toolbar).

## Deviations and clarifications
1. **The printable worksheet (A2) was dropped** (a user scope change mid-task). None of these were built: `js/worksheet.js`, `#worksheet-overlay`, the "Worksheet…" item, Alt+W, the worksheet tests and drive steps, and `worksheet.png`. Nothing needed removing, because none had been created yet. The `#print-root` + `@media print` mechanism is kept only for the notebook's Print button.
2. **There is no learn menu and no "Learn" wording** (a user scope note: the app stays a chemistry tool with no teaching features). The planned `#learn-menu` was not created. Slice A has only `#share-menu` (Copy share link, Lab notebook…). Retrosynthesis gets its own toolbar button in Slice C.
3. **The compressed payload has a `z` prefix.** The plan only named the `u` prefix for uncompressed payloads. A base64url payload can itself start with `u`, so compressed payloads are marked `z` to keep the two unambiguous.
4. **Decompression is size-capped.** The deflate stream is read chunk by chunk and aborted past 4,000,000 bytes, so a crafted link cannot exhaust memory. This is not in the plan, but it is required by "malformed payloads never touch the canvas".
5. **Notebook target.** A selection selects every connected component it touches, and each component becomes one notebook entry, since spectra of partial molecules make no sense.
6. **The print CSS only acts under `body.printing`.** A normal Ctrl+P still prints the app rather than a blank page. The print rules also reset the app's full-height flex layout and `overflow: hidden` on `html`/`body`, because without that the PDF was clipped to one page.
7. **Startup toast.** When the page opens with a share hash, the loaded-structure toast replaces the "Restored your previous drawing" toast. The restored drawing is still the undo target.
8. **Opening a link while the Reactions view is shown** switches to the Editor, so the loaded structure is visible.
9. **A link with an unknown element or an empty drawing is rejected** with an error toast, rather than being silently filtered by `loadGraphState`.
10. **Test-side hooks only.** The Playwright tests capture the clipboard and stub `window.print` through `add_init_script`. No test hooks were added to the app.
11. **Notebook field.** The notebook uses the 400 MHz default (`field: 400`) rather than the spectra dock's current field.
12. **Toolbar compaction** is covered in its own section above. The user added it mid-task; it is not in the plan.

## Checklist
- [x] **No new code comments.** Grep-verified:
  - `grep -n "//\|/\*" js/share.js js/notebook.js` matches only the `http://www.w3.org/2000/svg` namespace strings;
  - the inserted app.js block has no `//` or `/*`;
  - `grep -c "<!--" index.html` gives 0;
  - `grep -n "/\*" css/style.css` gives no matches;
  - `grep -c "^\s*//\|/\*" js/app.js` gives 0.
- [x] **No "Learn", `learn-menu` or worksheet references.** `grep -rn "Learn\|learn-menu\|worksheet"` over `index.html`, `js/app.js`, `css/style.css`, `js/share.js` and `js/notebook.js` found nothing.
- [x] **Docs entries are present.** `CODE_REFERENCE.md` has "Update, later session (41) — sharing & retrosynthesis" with a "Slice A — share link and lab notebook" sub-section after session 40, covering the hash formats, the load order, the print root and the toolbar compaction. `complexities.md` has the `js/share.js` (3) and `js/notebook.js` (3.5) rows and a session-41 note.
- [x] **Screenshots exist:** `screenshots/notebook.png` (the exported notebook HTML opened in a page) and `screenshots/toolbar.png`.
- [x] **Logic files contain no DOM code.** `js/share.js` and `js/notebook.js` run in Node through `bundle_share.js`.
- [x] **Nothing new leaves the browser.** No network calls were added; links, downloads and printing are all local.
- [x] **No git commands were used**, including read-only ones and inside compound shell commands. Files were compared with grep and the drive scripts.

## Next steps
- Slice C (retrosynthesis, with its own `#retro-button`, Alt+T) is done; see the Slice C section below.
- Slice B (quizzes) is dropped and will not be built.

---

# Slice C — Retrosynthesis (C1)

C2 (the energy diagram) was dropped by user decision, so this slice is C1 only.

## Files changed
- **New:**
  - `js/retro.js`: the engine. It has no DOM code and runs in Node; 1035 lines.
  - `js/retro-view.js`: `createRetroView(deps)`, the modal; 298 lines.
- **Edited:**
  - `index.html`:
    - `#retro-button`, right after `#viewer-button`;
    - the `#retro-overlay` modal;
    - the Alt+T help row;
    - `js/retro.js` after `js/reaction-aromatic.js`, and `js/retro-view.js` just before `js/app.js`.
  - `js/app.js`:
    - `retroView` and `openRetro(ids)`;
    - the button handler, `KeyT` in `INSIGHT_SHORTCUTS`, and "Retrosynthesis…" in the molecule and selection context menus;
    - an Escape branch;
    - the `createRetroView` deps;
    - `placeSchemeBelow`, the Reaction lab's placement code, now shared.
  - `css/style.css`: the `.retro-*` rules, on the existing tokens only.
  - `CODE_REFERENCE.md`: the "Slice C — retrosynthesis" sub-section under session 41.
  - `complexities.md`: two table rows and a session-41 Slice C note.
  - `feature-research/learning-sharing/screenshots/retro.png`.
- **Test scaffolding (session scratchpad, not in the repo):**
  - new: `build_retro.sh`, `test_retro.js`, `drive_retro.py`, `probe_retro.js`;
  - extended: `drive_toolbar.py`.

## Tests

| Suite | Result |
|---|---|
| `test_retro.js` (new) | **PASS 371, FAIL 0**; 43 target candidates plus every coverage candidate re-verified forward |
| `regress/runall.sh` | 37 files, 0 failed |
| `test_share_export.js` | PASS 429, FAIL 0 |
| `test_structure_tools_a.js` | PASS 280, FAIL 0 |
| `test_structure_tools_b.js` | PASS 89, FAIL 0 |
| `test_insight.js` | PASS 145, FAIL 0 |
| `test_spectra.js` | 107/107 |
| `drive_retro.py` (new, dark and light) | 42 ok, 0 fails, no page errors or console errors |
| `drive_toolbar.py` (extended) | 64 ok, 0 fails, no page errors |
| `drive_share.py` | 44 ok, 0 fails, no page errors |
| `drive_tools_a.py` | 44 ok, 0 failures, no page errors |
| `drive_tools_b.py` | 54 ok, 0 fails, no page errors |

### Per-target results (`test_retro.js`, `retroDisconnect`, Node)
The common-name index (`NAME_SMILES` canonicalised once, lazily) takes 176 ms and is built before the timed runs. Every candidate below re-verifies forward, and its product SMILES equals the target's.

| Target | Routes | Minor | Required route | Present | Time (ms) | Transforms returned |
|---|---|---|---|---|---|---|
| 2-butanol | 7 | 0 | hydration or reduction | yes | 46 | grignard ×2, hydration ×2, hydroboration, carbonyl-reduction, hydrogenation |
| cyclohexanol | 5 | 0 | any | yes | 13 | hydration, hydroboration, carbonyl-reduction, hydrogenation ×2 |
| 2-methyl-2-butanol | 5 | 0 | Grignard | yes | 12 | grignard ×2, hydration ×2, hydrogenation |
| 1-bromobutane | 4 | 0 | any | yes | 9 | hx-addition, hydrogenation ×2, halide-from-alcohol |
| ethyl acetate | 2 | 0 | Fischer | yes | 4 | ester-acyl-chloride, fischer |
| N-methylacetamide | 1 | 0 | any | yes | 2 | amide-acyl-chloride |
| acetophenone | 2 | 0 | Friedel–Crafts | yes | 7 | fc-acylation, alcohol-oxidation |
| benzoic acid | 3 | 0 | any | yes | 5 | acid-oxidation ×2, nitrile-hydrolysis |
| cyclohexene | 4 | 0 | any | yes | 31 | diels-alder, e2 ×2, dehydration |
| butanenitrile | 3 | 0 | any | yes | 5 | nitrile-sn2, hydrogenation ×2 |
| diethyl ether | 1 | 0 | Williamson | yes | 3 | williamson |
| **nitrobenzene** | **0** | 0 | any | **no** | 1 | none; there is no forward nitration rule (see below) |
| aniline | 1 | 0 | any | yes | 3 | nitro-reduction |
| cyclohexane | 1 | 0 | any | yes | 2 | hydrogenation |
| butadiene + maleic anhydride adduct | 4 | 0 | Diels–Alder | yes | 24 | diels-alder, e2 ×2, dehydration |

All times are far below the 1.5 s limit, and no run was truncated. In the browser, 2-methyl-2-butanol took 95 ms including the first-use name index.

None of the 15 targets yields a minor route. The minor-route path is covered by 4-methylpent-3-en-2-one, where E2 from the tertiary bromide gives the target only as the Hofmann alternative and is flagged `minor: true`.

### Other checks in `test_retro.js`
- **Static.** No DOM identifiers and no comments in `js/retro.js`. Every transform's `rule` exists in `RX_RULES` (91 rules). The dropped transform is absent from `RETRO_TRANSFORMS`.
- **Coverage.** Each of the 28 transforms is verified on its own target, for example `CC(O)CC(C)=O` (aldol), `CCC#CCC` (alkyne alkylation), `CC1OC1C` (epoxidation), `OC(C)C(C)O` (dihydroxylation), `Brc1ccccc1` (EAS halogenation), `CNCc1ccccc1` (reductive amination) and `CC(=C)C` (Wittig). Every candidate from those runs also re-verifies forward.
- **Ranking and badges.** For 2-methyl-2-butanol, the top route is acetone + EtMgBr with the common-starting-material badge. Candidates are sorted by largest precursor size, and every candidate has arrow labels.
- **Edge cases.** An empty graph gives `reason: 'empty'`, two components give `'components'`, methane gives no candidates, and a 1 ms budget truncates.
- **Tree and route:**
  - the root is expanded on creation and children are lazy;
  - acetone expands to the oxidation of propan-2-ol;
  - depth 3 cannot be expanded;
  - `retroRouteSteps` gives the forward steps propan-2-ol → acetone → target, and `buildRouteScheme` turns them into a fragment with 2 arrows;
  - a single-step route also works.

### Drive (`drive_retro.py`, 1440×900, dark and light)
- **Opening:**
  - the toolbar button is visible;
  - on an empty canvas nothing opens (a toast is shown instead).
- **2-methyl-2-butanol:**
  - 5 cards open, with the Grignard route first;
  - the first card shows the acetone and C₂H₅MgBr thumbnails, a "common starting material" badge and the arrow labels "C2H5MgBr / Diethyl ether, rt";
  - Send stays disabled until a card is selected.
- **Expand and send:**
  - "Disconnect" on acetone makes the breadcrumb "2-methylbutan-2-ol ⇒ acetone" and shows 1 card;
  - selecting it gives a 2-step route;
  - "Send route to canvas" adds 14 atoms, 3 molecules and 5 annotations.
- **Ethyl acetate:** Alt+T opens it. "Open in Reaction lab" switches to the Reactions view with ethanol + acetyl chloride and the verified conditions.
- **Closing and coverage:**
  - Escape closes;
  - nitrobenzene shows the coverage text, which names nitration.
- **Context menu:** "Retrosynthesis…" in the context menu opens 2-butanol.
- **Errors:** no page errors and no console errors.

### Toolbar fit (`drive_toolbar.py`, both themes)
- At 1280, 1366, 1440 and 1920 px:
  - every toolbar child's right edge is ≤ innerWidth − 8;
  - `documentElement.scrollWidth` ≤ innerWidth, and there is no internal toolbar overflow;
  - `#retro-button` is visible, sits right after `#viewer-button`, is ≥ 26 px, and its right edge is 1134, 1220, 1280 and 1760 px respectively.
- No breakpoint change was needed. The spacer slack left is 44 px at 1280 and 1366 px, and 13 px at 1440 px.

## Transform → rule mapping
All 28 transforms that were kept are verified against the listed `RX_RULES` id. The test records the fired `outcome.rule` for every target candidate, and it always equals the transform's `rule`.

| Transform | Rule id | Forward setup |
|---|---|---|
| hydration | `hydration` | H₂O solvent, H₂SO₄ |
| hydroboration | `hydroboration` | BH₃; H₂O₂, NaOH |
| carbonyl-reduction | `reduction` | NaBH₄, methanol |
| grignard | `grignard` | R–MgBr (labelled), diethyl ether |
| alcohol-sn2 | `halide` | NaOH, DMSO (primary and secondary only) |
| halide-from-alcohol | `alcohol-halide` | SOCl₂ / PBr₃; HX for tertiary alcohols and iodides |
| hx-addition | `hydrohalogenation` | HX; HBr + peroxide for anti-Markovnikov |
| williamson | `williamson` | alcohol + R–Br, NaH, THF |
| fischer | `fischer` | H₂SO₄, 80 °C |
| ester-acyl-chloride | `acyl` | pyridine |
| amide-acyl-chloride | `acyl` | — |
| dehydration | `dehydration` | H₂SO₄, temperature by alcohol degree |
| e2 | `halide` | NaOEt or KOtBu |
| wittig | `wittig` | phosphonium ylide, THF |
| hydrogenation | `hydrogenation` | H₂, Pd/C |
| alcohol-oxidation | `oxidation` | PCC |
| acid-oxidation | `oxidation` | KMnO₄ (also benzylic methyl at 100 °C) |
| nitrile-hydrolysis | `nitrile-hydrolysis` | H₂SO₄, water, 100 °C |
| nitrile-sn2 | `halide` | NaCN, DMSO |
| aldol | `aldol` | NaOH, ethanol; 5 °C addition, 80 °C condensation |
| diels-alder | `diels-alder` | 100 °C |
| alkyne-alkylation | `acetylide` | NaNH₂ |
| epoxidation | `epoxidation` | mCPBA |
| dihydroxylation | `osmium` | OsO₄, NMO |
| eas-halogenation | `aromatic` | Br₂/FeBr₃ or Cl₂/AlCl₃ |
| fc-acylation | `aromatic` | acyl chloride, AlCl₃ |
| nitro-reduction | `nitro-reduction` | Fe, HCl |
| reductive-amination | `imine` | NaBH₃CN, methanol |

**Dropped: `eas-nitration` (aromatic nitration).** `RX_RULES` has no nitration rule; HNO₃/H₂SO₄ is not recognised as a nitrating system. A nitration step therefore can never be verified, so the transform is listed in `RETRO_DROPPED_TRANSFORMS` and not attempted. As a result, the nitrobenzene target has **no route**, and its required "at least one route" is **not met**. This is recorded as a known gap, not faked. The view's empty state says that nitroarenes have no disconnection for this reason. No forward rule was added.

## Deviations and clarifications
1. **Nitrobenzene has no route**, because there is no forward nitration rule (see above). It is the only target missing its required route.
2. **`match(t)` signature.** Transforms receive one target context `{graph, info, aromatic, smiles, skeleton}` built once per call, not `(graph, ids)`, so perception runs once rather than 28 times.
3. **28 transforms instead of "about 25".** Some plan items split into two: hydration and hydroboration, ester and amide acyl chlorides, alcohol and acid oxidation, and nitrile hydrolysis and SN2. All are within the plan's list; nothing outside it was added.
4. **Hydrogenation is restricted.** It is only proposed for C=C/C≡C bonds whose carbons have carbon neighbours only. Without this it verified enols, vinyl halides and vinyl ethers as "precursors", which are real forward reactions in the engine but chemically useless suggestions.
5. **Ranking detail.** "Simpler" means a smaller *largest* precursor skeleton (C/N/O/S/P count), then fewer stereocentres, then more common starting materials, then main before minor, then a smaller total. The largest piece is compared first, so that a genuine C–C disconnection (the Grignard route) ranks above an FGI with the same total atom count.
6. **What counts as a minor route.** The target appearing among `best.minor` also counts, in addition to appearing in an alternative outcome, because both mean the forward conditions do not give the target as the main product.
7. **Expansion is done with a "Disconnect" button** under each precursor. Clicking a card selects it as the last step of the route, and "Disconnect" drills into that precursor. The plan's "clicking one expands a precursor" would have left no way to select a card for Send and Open in Reaction lab.
8. **Open in Reaction lab** loads the *last* step of the current route (the selected card, or the last drilled step). It sets `reactionLab.state.conditions` directly, since `addSmiles` does not take conditions, and restores the Grignard reagent labels. Precursors, reagents and solvent all go through `reactionLab.addSmiles` as planned.
9. **`placeSchemeBelow`** is the Reaction lab's scheme-placement code, moved out of its `sendScheme` so the route can be placed the same way (below the existing drawing). The Reaction lab's behaviour is unchanged.
10. **Test tolerance for charged nitro SMILES.** The SMILES parser neutralises nitro groups, so the precursor `[O-][N+](c1…)=O` re-parses as `O=N(c1…)=O`. The "precursor SMILES is canonical" check skips charged SMILES; the forward re-verification still covers them.
11. **Precursor captions** use the transform's label (e.g. Grignard reagents), then the `NAME_SMILES` common name, then `reactionDescribeFragment`'s name or formula. The naming engine is unchanged.
12. **No new breakpoint.** The toolbar already had room, so the plan's fallback of hiding things at a breakpoint was not needed.

## Checklist
- [x] **No new code comments.** Grep-verified:
  - `grep -nE "//|/\*" js/retro.js js/retro-view.js` gives no matches;
  - the new `.retro-*` CSS has no `/*`, and `grep -c "<!--" index.html` is still 0;
  - the inserted `js/app.js` lines have no `//` or `/*`.
- [x] **No "learn" wording and no quiz, energy-diagram or worksheet code.**
- [x] **`js/retro.js` has no DOM code.** The static check in `test_retro.js` confirms it, and the file runs in Node through `bundle_retro.js`.
- [x] **Docs are present.** `CODE_REFERENCE.md` has "Slice C — retrosynthesis" under "Update, later session (41)". `complexities.md` has the `js/retro.js` (6) and `js/retro-view.js` (3) rows and a Slice C note covering `app.js`, `index.html` and `css/style.css`.
- [x] **The screenshot exists:** `screenshots/retro.png` (2-methyl-2-butanol, dark theme, with Grignard cards and badges).
- [x] **No forward rules were added and the naming engine is unchanged.** Edits touch only the files listed above.
- [x] **No git commands were used**, including read-only ones and inside compound shell commands.

## Next steps
- Section 4 is complete: Slice A (share link, lab notebook) and Slice C1 (retrosynthesis) are built. Slice B (quizzes), A2 (worksheet) and C2 (energy diagram) were dropped.
- The main known gap is the lack of a forward aromatic nitration rule. If one is ever added, re-enabling `eas-nitration` is a single transform entry.
