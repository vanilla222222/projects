# Audit — Chemical Graph Constructor

## Files changed (all new)

| File | Purpose |
| --- | --- |
| `index.html` | Canvas, element toolbar (C default), Clear button, ordered script tags. |
| `css/style.css` | Toolbar layout, selected-element state, canvas styling (`cursor: crosshair`), `valence-blocked` flash class. |
| `js/graph.js` | `Graph` data model: atoms, bonds, add/remove, `getBond`, `bondsForAtom`, `totalBondOrder`, `clear`. |
| `js/valence.js` | `MAX_VALENCE` table, `maxValenceFor`, `canAddBond(graph, atomId, deltaOrder)`. |
| `js/renderer.js` | Immediate-mode canvas drawing of bonds (1/2/3 parallel lines) and atoms, plus timed red-flash state. |
| `js/interactions.js` | Mouse wiring: click-to-place, drag-to-bond with 30° snapping, click-to-cycle-order, right-click-to-delete, hit testing. |
| `js/app.js` | Instantiates context/graph/renderer/interactions, wires toolbar and Clear, sizes canvas, initial render. |
| `CODE_REFERENCE.md` | Data model, valence contract, rendering contract, interaction gestures. |
| `complexities.md` | Per-file complexity scores. |
| `feature-research/chemical-graph-constructor/audit.md` | This file. |

## Verification

`node --check` on every JS file (syntax lint only; this is not a Node project):

```
OK js/app.js
OK js/graph.js
OK js/interactions.js
OK js/renderer.js
OK js/valence.js
```

Headless logic smoke test (graph.js + valence.js concatenated and run under Node, scratchpad only, not added to the project):

```
O order 2 canAdd3rd false          -> oxygen with two bonds is correctly saturated
dup bond returns null              -> addBond refuses a duplicate pair
C headroom true false              -> canAddBond respects C=4
after removeAtom: atoms 2 bonds 0  -> removeAtom drops its bonds
snap25 30.0 snap100 90.0           -> nearest-30° snapping
```

Comment scan: `grep -rn "//\|/\*\|<!--" index.html css/style.css js/` returns no matches. No code comments were introduced in any HTML/CSS/JS file (the `//` pattern also covers any stray URL-style occurrence, of which there are none).

`CODE_REFERENCE.md` and `complexities.md` are present, and both match the shipped code (method names, valence numbers, tunable names, and gesture behavior were written from the final files).

### Manual browser verification left to the user

No browser/headless-browser tool was available here, so the visual pass is unverified. Recommended checks after opening `index.html`:

1. Click empty canvas with C selected — a small dot appears; select O, N, Cl and place more — element symbols render centered.
2. Drag from an atom into empty space repeatedly — each new atom lands 50px away on a 30° multiple; alternating drags produce the 120° zig-zag chain, and bond lines stop short of heteroatom labels rather than crossing them.
3. Click a bond line — order cycles 1 → 2 → 3 → 1 with parallel lines perpendicular to the bond angle.
4. Give an oxygen two bonds, then try a third (drag off it, or drag another atom onto it, or click one of its bonds to double it) — the action is blocked, nothing is created, and the atom(s) flash red along with the canvas border.
5. Right-click an atom — it and all its bonds disappear. Right-click a bond — only that bond disappears. No browser context menu appears.
6. Clear resets the scene; resizing the window keeps the canvas filling its area.

## Deviations from the plan

1. **Isolated carbons get a small dot.** A bare unlabeled vertex with no bonds would be completely invisible and unclickable after placement. The dot is drawn only while the carbon has zero bonds; once bonded it renders as a bare vertex per skeletal notation. The plan explicitly left this drawing choice open ("a tiny/invisible circle or nothing at all").
2. **Flash uses both mechanisms.** `renderer.flashAtom(id)` draws the per-atom red highlight on canvas (timed flag + re-render, as the plan suggested), and `interactions.flash()` additionally toggles the `valence-blocked` CSS class on the canvas so the required CSS class is actually used.
3. **Small additions to `Graph` beyond the listed methods:** `getAtom(id)`, `getBondById(id)`, and `clear()`. `getAtom` is needed by the renderer/valence code, and `clear()` backs the required Clear button. `getBondById` is a one-line symmetric counterpart to `getBond`. No other API surface was added.
4. **Canvas sizing without devicePixelRatio scaling.** Kept the backing store at CSS pixel size so all geometry, hit testing, and drawing share one coordinate space. Slightly softer lines on HiDPI screens, but no scaling complexity.

No other scope was added: no SMILES, undo/redo, save/load, ring detection, implicit hydrogens, touch handling, build tooling, or external libraries.

---

## 2026-09-20 — Dark "lab" theme visual redesign

Visual-only pass. No interaction or data-model behavior changed.

### Files changed

| File | Change |
| --- | --- |
| `js/colors.js` | **New.** `ELEMENT_COLORS` (single source of truth for per-element color) plus `colorForElement(element)`; plain global, same script-tag style as `graph.js`/`valence.js`. |
| `index.html` | Top `<header id="toolbar">` replaced by a left `<aside id="sidebar">` (title + subtitle, element-button grid, gesture-hint list, Clear at the bottom); `js/colors.js` inserted after `valence.js`, before `renderer.js`. |
| `css/style.css` | Full rewrite: dark tokens on `:root`, flex-row sidebar + canvas layout, `var(--accent)` element-button styling, dark-red Clear button, glow/pulse `valence-flash` keyframe (360ms ease-out). |
| `js/renderer.js` | `background` → `#0d0f14`; added dot grid (`rgba(255,255,255,0.04)`, 24px) drawn behind bonds/atoms; bond color `#c7ccd6` with 5px shadow glow; atom labels and the carbon dot use `colorForElement`; flash is now a radial-gradient pulse in `#f87171`. |
| `js/app.js` | One added line: per-button `style.setProperty('--accent', colorForElement(button.dataset.element))`. |
| `CODE_REFERENCE.md` | Added a "Visual design" section (element palette + consumers, sidebar layout, color tokens); updated script order and the styling paragraph. Prior sections intact. |
| `complexities.md` | Added `js/colors.js` (1); `css/style.css` 2 → 3; `js/renderer.js` 6 → 6.5. |

Untouched as required: `js/graph.js`, `js/valence.js`, `js/interactions.js`.

### Verification

`node --check` on all JS files:

```
OK js/app.js
OK js/colors.js
OK js/graph.js
OK js/interactions.js
OK js/renderer.js
OK js/valence.js
```

Comment scan `grep -rn "//\|/\*\|<!--" index.html css/style.css js/` → no matches. No code comments in any new or edited file.

### id / class compatibility

Every DOM reference in `app.js` and `interactions.js` was grepped and each target still exists:

| Reference | Source | Status |
| --- | --- | --- |
| `getElementById('editor-canvas')` | `app.js` | present, unchanged |
| `querySelectorAll('.element-button')` | `app.js` | 9 buttons, same `data-element` values |
| `classList` `selected` | `app.js` | styled in CSS, markup keeps `selected` on C |
| `getElementById('clear-button')` | `app.js` | present, moved into `.sidebar-foot` |
| `classList` `valence-blocked` | `interactions.js` | `#editor-canvas.valence-blocked` rule still present |

Renderer public surface (`render()`, `flashAtom(atomId)`) and the flash state machine are unchanged; bond geometry (width, spacing, order offsets) untouched.

### Deviations

1. **`colorForElement(element)` helper added alongside `ELEMENT_COLORS`.** The plan named only the table; the accessor mirrors `maxValenceFor` in `valence.js` and gives an unknown symbol a defined fallback instead of an `undefined` fill style. The table itself is still the single source of truth.
2. **`renderer.js` bumped to 6.5, not left flat.** The plan allowed "similar or +0.5"; the added grid/glow/gradient layers justify the half point while the geometry complexity is unchanged.
3. **Selected-button tint uses `color-mix()`.** Cleanest way to derive a low-opacity accent tint from the JS-set `--accent`; falls back to a solid accent border plus ring if unsupported.

### Manual browser verification left to the user

No browser tool available here, so the visual result is unverified. Suggested checks: sidebar renders full height beside the canvas; each element button shows its own accent on the left border and a clearly tinted selected state; the canvas shows a faint dot grid on the dark background with light bonds; heteroatom labels render in their element color with bonds trimmed clear of the glyph; a blocked valence action produces a soft red glow pulse on both the atom and the canvas edge; window resize still keeps the canvas filling its area.

---

## 2026-09-20 — Auto-naming + bond ghost preview

### Files changed

| File | Change |
| --- | --- |
| `js/naming.js` | **New.** `molecularFormula`, `nameStructure`, and the private derivation helpers. |
| `js/graph.js` | Added `connectedComponents()`. No existing method touched. |
| `index.html` | One script tag: `js/naming.js` between `colors.js` and `renderer.js`. Markup otherwise untouched. |
| `js/renderer.js` | Added `setGhost(ghostOrNull)`, `drawGhost()`, `drawComponentNames()`; `render()` calls the latter two after atoms; six new `RENDER_SETTINGS` keys. |
| `js/interactions.js` | Added `mousemove`/`mouseleave` binding, `onMouseMove`, `nearestGhostOrigin`, `atomNear`, `computeGhost`, `updateGhost`, `commitGhost`, module helpers `snappedBondTarget` and `ghostSignature`; two new `INTERACTION_SETTINGS` keys; `onMouseDown` gained one leading ghost-commit branch; `growChain` refactored onto `snappedBondTarget`. |
| `CODE_REFERENCE.md` | Two appended sections ("Auto-naming", "Bond ghost preview") plus the script-order line updated. |
| `complexities.md` | `js/naming.js` added at 8; `js/renderer.js` 6.5 → 7; `js/interactions.js` 7 → 7.5. |

`css/style.css` and `js/app.js` unchanged.

### Naming test results

Headless Node harness (`vm` context concatenating `graph.js` + `valence.js` + `naming.js`, scratchpad only, not committed). Structures built through the real `Graph` API and named through `connectedComponents()` + `nameStructure()`.

| Case | Structure | Expected | Got | Result |
| --- | --- | --- | --- | --- |
| methane | single C | `methane` | `methane` | PASS |
| ethanol | C–C–OH | `ethanol` | `ethanol` | PASS |
| ethanoic acid | C–C(=O)–OH | `ethanoic acid` | `ethanoic acid` | PASS |
| propan-2-ol | C–C(OH)–C | `propan-2-ol` | `propan-2-ol` | PASS |
| but-2-ene | C–C=C–C | `but-2-ene` | `but-2-ene` | PASS |
| propan-1-amine | C–C–C–N | `propan-1-amine` | `propan-1-amine` | PASS |
| 2-chloropropane | C–C(Cl)–C | `2-chloropropane` | `2-chloropropane` | PASS |
| propan-2-one | C–C(=O)–C | `propan-2-one` | `propan-2-one` | PASS |
| 2-methylpropan-1-ol | HO–C–C(C)–C | `2-methylpropan-1-ol` | `2-methylpropan-1-ol` | PASS |
| ethane | C–C | `ethane` | `ethane` | PASS |
| unsupported: benzene ring | 6-C alternating ring | formula | `C6H6` | PASS |
| unsupported: diol | HO–C–C–OH | formula | `C2H6O2` | PASS |
| unsupported: ether | C–O–C | formula | `C2H6O` | PASS |

13/13. No case threw. Additional spot checks, all correct: `ethanal`, `chloroethane`, `2-methylbutane`, `hexan-2-ol` (numbering took the lower end), `prop-1-yne` + `methane` as two separate components in one graph, and a lone O atom → `H2O`.

The 2-methylpropan-1-ol case initially failed (`C4H10O`) because a single tree-diameter path can legitimately pick `C–C(–C)` and leave the hydroxyl carbon as a branch, which then fails the "no heteroatoms in a branch" rule. Fixed by enumerating every maximal-length carbon path and returning the first that yields a name.

### Comments

`grep -rn "//\|/\*\|<!--" --include=*.js --include=*.html --include=*.css .` → no matches (exit 1). `node --check` passes on all seven JS files.

### Existing gestures (verified by code reading; no browser available)

- **Click empty canvas → place isolated atom.** Still the `else` branch of the `bondAt` test in `onMouseUp`. It is now unreachable *inside* a live ghost zone, which is the intended behavior per the plan; outside 60px of every atom, on a bond, or when the ghost is valence-blocked, it behaves exactly as before.
- **Click a bond → cycle order.** `computeGhost` returns `null` whenever `bondAt(point)` hits, so a press on a bond line never commits a ghost and always falls through to the original `mouseup` path. `cycleBondOrder` is untouched.
- **Drag from atom → bond/grow chain.** `onMouseDown` only consults the ghost when `atomAt(point)` is `null`, so a press on an atom still sets `dragOriginAtomId` and `dragStart` unchanged. `onMouseUp` is byte-for-byte unchanged. `growChain` is behaviorally identical: the inline `snapAngle` + `bondLength` arithmetic was moved verbatim into `snappedBondTarget`, which both the drag and the ghost now call — one source of truth, same numbers.
- **Right-click delete.** `onContextMenu` untouched.
- **Commit safety.** `commitGhost` returns before setting `dragStart`, so the follow-up `mouseup` hits `!this.dragStart` and returns early — no double action.
- **Valence flashes.** `flash`, `bondExistingAtoms`, `cycleBondOrder` unchanged; the ghost path deliberately shows nothing rather than flashing, since a blocked ghost is never rendered in the first place.

### DOM compatibility

`editor-canvas`, `.element-button` (9, same `data-element`), `selected`, `clear-button`, `valence-blocked` all unchanged in `index.html` and `css/style.css`. Renderer public signatures `render()` and `flashAtom(atomId)` unchanged; `setGhost` is purely additive.

### Deviations

1. **All maximal-length carbon chains are tried, not just one tree diameter.** Required for correct parent-chain selection (see the 2-methylpropan-1-ol case above). Candidates are deduplicated and evaluated in a deterministic order.
2. **A molecule containing two *different* suffix-priority group types falls back to the formula** instead of naming only the highest-priority one. The plan said to ignore lower-priority groups as suffixes, but with no hydroxy-/oxo-/amino- prefix support in scope, doing so would emit a name that silently omits a real substituent (e.g. HO–CH2–CHO → "ethanal"). Falling back honors the stronger standing instruction never to guess wrong. Acid detection consumes its own `-OH`, so acids are unaffected.
3. **More than one C=C/C≡C falls back.** Dienes need `-diene` multiplying infixes, which are out of scope alongside diols/diacids.
4. **The ghost is suppressed over bond lines**, not only over atoms. Not named in the plan, but required to preserve the click-a-bond-to-cycle-order gesture, since bonds routinely lie inside the 60px hover radius.
5. **`renderer.js` bumped 6.5 → 7 and `interactions.js` 7 → 7.5** rather than a full point each; both additions are new self-contained layers over unchanged geometry and gesture code.

### Manual browser verification left to the user

Name labels appear ~22px above each structure in muted lavender and update live as bonds are added or cycled; hovering 10–60px from an atom shows a translucent snapped bond plus a ghost atom; hovering so the snap lands on an existing atom shows the blue connect halo instead; clicking either commits it; hovering a full-valence atom shows nothing.

---

## 2026-09-20 — Ring naming

### Files changed

| File | Change |
| --- | --- |
| `js/naming.js` | Ring naming path plus the shared-helper refactor it required. New: `MIN_RING_SIZE`/`MAX_RING_SIZE`, `classifyAttachment`, `createAttachmentAccumulator`, `collectCoreAttachments`, `assembleSubstituentPrefix`, `buildStem`, `attachSuffix`, `trimToRing`, `orderRing`, `ringBondLocant`, `chooseRingNumbering`, `buildRingPrefix`, `selectRingPrincipal`, `nameAromaticRing`, `nameForRing`, `deriveRingName`. `deriveName` now dispatches on cyclomatic number; `nameForChain` and `buildSubstituentPrefix` were rewritten to call the extracted helpers with no behavior change. |
| `CODE_REFERENCE.md` | "Auto-naming" section: the acyclic-only bullet became a cyclomatic-number dispatch bullet, a new "Rings" subsection documents extraction/aromaticity/benzene/cycloalkane/numbering and the ring fallback list, and the closing out-of-scope sentence no longer lists rings wholesale. |
| `complexities.md` | `js/naming.js` 8 → 9, notes mention ring naming and the now-shared helpers. |

No other file was touched. `graph.js`, `valence.js`, `renderer.js`, `interactions.js`, `app.js`, `index.html`, `css/style.css` are byte-identical.

### Shared-helper inventory (one implementation each, used by both paths)

| Concern | Helper |
| --- | --- |
| Root-name table | `NAME_ROOTS` |
| Branch / heteroatom role classification | `classifyAttachment` + `collectCoreAttachments` (+ `collectBranch`) |
| Prefix alphabetization and `di/tri/tetra` | `assembleSubstituentPrefix` |
| `an` / `en` / `yn` conjugation with locant | `buildStem` |
| Suffix conjugation and `-e` elision | `attachSuffix` |
| Locant-list comparison | `compareLocantLists` |

### Ring naming results

| Case | Expected | Got | Result |
| --- | --- | --- | --- |
| cyclopropane | `cyclopropane` | `cyclopropane` | PASS |
| cyclobutane | `cyclobutane` | `cyclobutane` | PASS |
| cyclopentane | `cyclopentane` | `cyclopentane` | PASS |
| cyclohexane | `cyclohexane` | `cyclohexane` | PASS |
| cycloheptane | `cycloheptane` | `cycloheptane` | PASS |
| cyclooctane | `cyclooctane` | `cyclooctane` | PASS |
| cyclohexan-1-ol | `cyclohexan-1-ol` | `cyclohexan-1-ol` | PASS |
| cyclohexan-1-one | `cyclohexan-1-one` | `cyclohexan-1-one` | PASS |
| cyclohex-1-ene | `cyclohex-1-ene` | `cyclohex-1-ene` | PASS |
| 1-chlorocyclopentane | `1-chlorocyclopentane` | `1-chlorocyclopentane` | PASS |
| 3-methylcyclohexan-1-ol | `3-methylcyclohexan-1-ol` | `3-methylcyclohexan-1-ol` | PASS |
| methylcyclopropane | `methylcyclopropane` | `methylcyclopropane` | PASS |
| benzene | `benzene` | `benzene` | PASS |
| chlorobenzene | `chlorobenzene` | `chlorobenzene` | PASS |
| methylbenzene | `methylbenzene` | `methylbenzene` | PASS |
| 1,2-dimethylbenzene | `1,2-dimethylbenzene` | `1,2-dimethylbenzene` | PASS |
| benzenol (one ring OH) | `benzenol` | `benzenol` | PASS |
| benzenamine (one ring NH2) | `benzenamine` | `benzenamine` | PASS |
| 3-chlorobenzenol | `3-chlorobenzenol` | `3-chlorobenzenol` | PASS |
| fused bicyclic, edge-sharing (cyclomatic 2) | formula | `C10H18` | PASS |
| 6-ring, two non-alternating C=C | formula | `C6H8` | PASS |
| 5-ring with one O (tetrahydrofuran) | formula | `C4H8O` | PASS |

22/22. Nothing threw.

Additional spot checks, all correct: `1,2-dibromocyclohexane`, `1,3,5-trimethylbenzene`, `1-chlorocyclobutane`, `cycloheptan-1-one`, `cyclopent-1-yne`; and correct fallbacks for benzene bearing both `-OH` and `-NH2` (`C6H7NO`), a cyclohexane diol (`C6H12O2`), 1,4-cyclohexadiene (`C6H8`), a 9-membered ring (`C9H18`), and a ring carrying a `-CH2OH` branch (`C7H14O`).

### Chain-naming regression

| Case | Expected | Got | Result |
| --- | --- | --- | --- |
| methane | `methane` | `methane` | PASS |
| ethanol | `ethanol` | `ethanol` | PASS |
| ethanoic acid | `ethanoic acid` | `ethanoic acid` | PASS |
| propan-2-ol | `propan-2-ol` | `propan-2-ol` | PASS |
| but-2-ene | `but-2-ene` | `but-2-ene` | PASS |
| 2-methylpropan-1-ol | `2-methylpropan-1-ol` | `2-methylpropan-1-ol` | PASS |
| 2-chloropropane | `2-chloropropane` | `2-chloropropane` | PASS |
| propan-2-one | `propan-2-one` | `propan-2-one` | PASS |

8/8. The shared-helper extraction is behavior-preserving on the chain path.

The prior audit's "unsupported: benzene ring → C6H6" case is now deliberately obsolete: it names `benzene`.

### Comments

`grep -rn "//\|/\*\|<!--" js/naming.js` → no matches (exit 1). `node --check js/naming.js` passes.

### Deviations

1. **Locant-printing thresholds differ between the two ring flavors**, to hit the required outputs exactly. Cycloalkanes print locants at ring size 4+ (`methylcyclopropane` vs `1-chlorocyclopentane`), mirroring the chain's size-based `showLocants`. Benzene instead prints prefix locants only when more than one named position exists (`chlorobenzene` and `benzenol` unnumbered, `1,2-dimethylbenzene` and `3-chlorobenzenol` numbered), and never prints the suffix locant, since the suffix carbon is always 1 by construction.
2. **Ring numbering is a single brute-force minimization** over all `size * 2` options, keyed `[suffix, unsaturation, substituents]`, instead of a ring analogue of `shouldReverseChain`. It expresses the same priority order, needs no anchor special-casing, and is deterministic; the chain path keeps `shouldReverseChain` unchanged.
3. **A ring carbon bearing both `=O` and `-OH` falls back** rather than being named an acid. On a ring the carbon always has two ring neighbors, which is exactly the `degree > 1` case the chain algorithm already rejects for acids, so this matches existing policy.

## 2026-09-20 — Tier 3: recognized fused-ring / chain scaffolds (indole, tryptamine, phenethylamine)

### Files changed

- `js/naming.js` — new cyclomatic-2 dispatch branch, indole/tryptamine recognition, phenethylamine special case in the benzene path, shared `matchEthylamineChain`, and extraction of `cycleBondOrders` / `hasAlternatingOrders` / `chooseRingNumbering(..., anchorIndex)` so old and new paths share one implementation.
- `CODE_REFERENCE.md` — "One cycle at most" bullet rewritten for the new dispatch, aromatic-detection and ring-numbering bullets updated for the extracted helpers, new "Recognized scaffolds" subsection, out-of-scope paragraph amended.
- `complexities.md` — `js/naming.js` raised 9 → 10 with the third tier described.

No other file was touched.

### New-scaffold test results

Headless Node harness (scratchpad only) loading `valence.js` + `graph.js` + `naming.js` and calling `nameStructure(graph, allAtomIds)`.

| Case | Expected | Got | Result |
| --- | --- | --- | --- |
| indole (bare) | `indole` | `indole` | PASS |
| 5-methoxyindole | `5-methoxyindole` | `5-methoxyindole` | PASS |
| 1-methylindole | `1-methylindole` | `1-methylindole` | PASS |
| 3-methylindole | `3-methylindole` | `3-methylindole` | PASS |
| tryptamine | `tryptamine` | `tryptamine` | PASS |
| N-methyltryptamine | `N-methyltryptamine` | `N-methyltryptamine` | PASS |
| N,N-dimethyltryptamine | `N,N-dimethyltryptamine` | `N,N-dimethyltryptamine` | PASS |
| 5-methoxy-N,N-dimethyltryptamine | `5-methoxy-N,N-dimethyltryptamine` | `5-methoxy-N,N-dimethyltryptamine` | PASS |
| phenethylamine | `phenethylamine` | `phenethylamine` | PASS |
| N-methylphenethylamine | `N-methylphenethylamine` | `N-methylphenethylamine` | PASS |
| 4-methoxyphenethylamine | `4-methoxyphenethylamine` | `4-methoxyphenethylamine` | PASS |
| N-butyltryptamine (4-carbon N-substituent, upper bound) | `N-butyltryptamine` | `N-butyltryptamine` | PASS |
| indole drawn mirrored (reversed atom order) | `indole` | `indole` | PASS |
| tryptamine drawn mirrored | `tryptamine` | `tryptamine` | PASS |
| methyl at each of N1/C2/C3/C4/C5/C6/C7, both walk orientations (14 checks) | `1..7-methylindole` | identical locants in both orientations | PASS |

Fallback cases — every one returns a plain formula, none throws, none produces a wrong name:

| Case | Expected | Got | Result |
| --- | --- | --- | --- |
| indole skeleton with double bonds shifted one position (matches neither orientation) | formula | `C8H7N` | PASS |
| methyl branch on the first CH2 of the tryptamine chain | formula | `C11H14N2` | PASS |
| chain nitrogen bonded to a second benzene ring | formula | `C16H16N2` | PASS |
| two ethylamine chains on the same benzene ring | formula | `C10H16N2` | PASS |
| chain nitrogen with a 5-carbon substituent (over `MAX_BRANCH_LENGTH`) | formula | `C15H22N2` | PASS |
| naphthalene-shaped 6-6 fusion | formula | `C10H8` | PASS |
| indole skeleton with a second N in the six-ring | formula | `C7H6N2` | PASS |

22 named cases + 7 fallback cases, 29/29 counting the orientation sweep as one row per position.

### Regression test results

| Case | Expected | Got | Result |
| --- | --- | --- | --- |
| methane | `methane` | `methane` | PASS |
| ethanol | `ethanol` | `ethanol` | PASS |
| ethanoic acid | `ethanoic acid` | `ethanoic acid` | PASS |
| propan-2-ol | `propan-2-ol` | `propan-2-ol` | PASS |
| but-2-ene | `but-2-ene` | `but-2-ene` | PASS |
| 2-methylpropan-1-ol | `2-methylpropan-1-ol` | `2-methylpropan-1-ol` | PASS |
| cyclohexane | `cyclohexane` | `cyclohexane` | PASS |
| cyclopentane | `cyclopentane` | `cyclopentane` | PASS |
| cyclohexan-1-ol | `cyclohexan-1-ol` | `cyclohexan-1-ol` | PASS |
| cyclohexan-1-one | `cyclohexan-1-one` | `cyclohexan-1-one` | PASS |
| cyclohex-1-ene | `cyclohex-1-ene` | `cyclohex-1-ene` | PASS |
| benzene | `benzene` | `benzene` | PASS |
| chlorobenzene | `chlorobenzene` | `chlorobenzene` | PASS |
| methylbenzene | `methylbenzene` | `methylbenzene` | PASS |
| 1,2-dimethylbenzene | `1,2-dimethylbenzene` | `1,2-dimethylbenzene` | PASS |
| benzenol | `benzenol` | `benzenol` | PASS |
| benzenamine | `benzenamine` | `benzenamine` | PASS |

17/17. No previously-passing output changed.

### Comments

`grep -rn "//\|/\*\|<!--" js/naming.js` → no matches (exit 1). `node --check js/naming.js` passes.

### Documentation

`CODE_REFERENCE.md` and `complexities.md` both updated as listed above.

### Deviations

1. **A scaffold-only alkoxy classifier was added.** The plan required `5-methoxyindole`, `5-methoxy-N,N-dimethyltryptamine` and `4-methoxyphenethylamine` to pass while also requiring reuse of the existing classifier, but `classifyAttachment` rejects ethers outright (an O of degree 2), so those three cases were unreachable. Resolution: `collectCoreAttachments` gained an optional `allowAlkoxy` flag that only the two new scaffold paths pass. When set, an O that the existing classifier rejects is retried by `classifyAlkoxy`, which reuses `collectBranch` and `NAME_ROOTS` to emit `methoxy`/`ethoxy`/`propoxy`/`butoxy`. Existing callers pass nothing, so the generic chain and benzene paths are bit-for-bit unchanged and `methoxybenzene` still names as its formula.
2. **The plan's fused-core test is restated in graph-correct terms.** It said removing the shared edge "splits the remaining structure into exactly two simple cycles" of size 6 and 5; removing the fusion bond of a fused bicyclic actually leaves one 9-atom perimeter cycle. The implementation requires 9 core atoms, 10 core bonds, exactly two adjacent degree-3 atoms with all others degree 2, and a single 9-cycle perimeter, then splits that perimeter at the fusion atoms into interior arcs of 3 and 4. This accepts exactly the intended shapes and rejects spiro (degree 4) and bridged (non-adjacent degree-3 atoms) cases.
3. **Orientation handling is by nitrogen position, not by trying two walk directions.** Once the five-ring arc is known, the nitrogen can only sit at arc index 0 or 2 for indole (index 1 is rejected), and each position forces one labelling. Both candidate labellings are still generated and tried in turn, so the mirror case is covered; a probe confirmed both branches are reachable and produce identical locants.
4. **Ring hydroxy/amino become prefixes in the scaffold paths.** Indole and phenethylamine are suffix-less parents, so `scaffoldSubstituentEntries` renders `-OH` as `hydroxy` and `-NH2` as `amino` and rejects an exocyclic `C=O`, rather than routing them through `selectRingPrincipal`.
5. **`nameForRing` computes ring bond orders before collecting attachments.** The phenethylamine check has to run before the generic attachment collection (which rejects the chain), so the aromaticity test moved above it. Both orderings return `null` on the same inputs, so behaviour is unchanged.

## 2026-09-20 — Dual 30°/36° bond angle snap grid

### Files changed

| File | Change |
| --- | --- |
| `js/interactions.js` | `INTERACTION_SETTINGS.angleSnapDegrees: 30` replaced by `angleSnapSteps: [30, 36]`; new module helper `snapAngleCandidates(stepDegreesList)`; `snapAngle` rewritten from single-step rounding to nearest-candidate selection over the merged grid; `snappedBondTarget` now passes `angleSnapSteps`. |
| `CODE_REFERENCE.md` | Interaction-table drag row wording, the `INTERACTION_SETTINGS`/helpers sentence, and step 3 of the "Bond ghost preview" section updated to describe the dual grid. |

`angleSnapDegrees` had no callers other than the one line inside `snappedBondTarget` (confirmed by `grep -rn "angleSnapDegrees"` across `js/`, `*.html`, `*.md` — the only other hits were documentation), so it was replaced rather than kept as a dead key.

### Verification

`node --check js/interactions.js` passes. Headless smoke test (scratchpad) extracts `INTERACTION_SETTINGS`, `snapAngleCandidates`, `snapAngle` and `snappedBondTarget` by source substring into a `vm` sandbox, avoiding the DOM-dependent `Interactions` class:

| # | Check | Result | Numbers |
| --- | --- | --- | --- |
| 1 | Angle near 72° snaps to 72° | PASS | 71.6° → 72.000000° |
| 2 | Angle near 30° still snaps to 30° | PASS | 30.4° → 30.000000° |
| 3 | Pentagon: 5 placements, each turning 72° from the previous snapped heading, via `snappedBondTarget` | PASS | closure distance 0.000000 px vs `ghostSnapTolerance` 15 px; points (300,300) → (350,300) → (365.451,347.553) → (325,376.942) → (284.549,347.553) → (300,300) |
| 4 | Hexagon: 6 placements turning 60° (regression) | PASS | closure distance 0.000000 px vs `ghostSnapTolerance` 15 px |

No tolerance change was needed.

### Comments

`grep -rn "//\|/\*\|<!--" js/interactions.js` → no matches (exit 1). No comments added to either file.

### No other gesture behaviour changed

Verified by reading the whole file: the only edited lines are the settings key, the `snapAngle`/`snapAngleCandidates` definitions, and the one argument inside `snappedBondTarget`. `bondLength`, `ghostRadius` and `ghostSnapTolerance` are untouched. `onMouseDown`, `onMouseUp`, `onMouseMove`, `onContextMenu`, `computeGhost`, `updateGhost`, `commitGhost`, `growChain`, `bondExistingAtoms`, `cycleBondOrder`, `flash`, `ghostSignature` and `distanceToSegment` are unmodified, and `snappedBondTarget` keeps its signature and return shape, so drag-to-bond and the ghost preview still share the one snap path — only which angle it returns can differ.

### Deviations

1. **`angleSnapDegrees` removed rather than kept.** The plan allowed keep/rename/extend after a grep; the grep showed no remaining code reference, so leaving it would have been dead configuration.
2. **One line outside the "Bond ghost preview" section of `CODE_REFERENCE.md` was touched.** The interaction table's drag row stated "snapped to the nearest 30°", which the change makes false; the wording was corrected in place and nothing else in that section was rewritten.

---

## 2026-09-20 — Thiols, chain-only nitriles, alkoxy on plain chains and rings

### Files changed

| File | Change |
| --- | --- |
| `js/naming.js` | `classifyAttachment` gains an `S` branch (terminal `-SH` → `thiol`) and a triple-bond `N` case ahead of the amine case (`-C≡N` → `nitrile`); `createAttachmentAccumulator` gains `thiols` and `nitriles`; `collectCoreAttachments` buckets both new roles; `nameForChain` re-checks nitrile positions with `chainDegreeAt` and adds `nitrile` (after acid) and `thiol` (after alcohol) to its `groups` list; `nameForRing` and `nameAromaticRing` add `thiol` after alcohol; `attachSuffix` gains dedicated `nitrile` and `thiol` branches; `nameForChain` and `nameForRing` now pass `allowAlkoxy: true` to `collectCoreAttachments`. |
| `CODE_REFERENCE.md` | Chain suffix-priority line rewritten to the new seven-group order, with new bullets for thiol and nitrile; ring substituent, benzene, cycloalkane-priority and out-of-scope lines updated; the "scaffold-only alkoxy" bullet retitled and rewritten now that all four call sites pass the flag. |
| `complexities.md` | `js/naming.js` notes extended with the three new capabilities. Score unchanged at 10. |
| `feature-research/chemical-graph-constructor/audit.md` | This section. |

No other file was touched. No git commands were run.

### Test method

No automated test harness exists for `naming.js` (`grep -rn "naming" --include=*.test.js --include=*.spec.js .` returns nothing, and this is not a Node project). Instead of hand-tracing, a scratchpad harness (not added to the project) concatenates `valence.js`, `graph.js` and `naming.js`, compiles them into a throwaway module, builds each test molecule through the real `Graph` API and calls the real `nameStructure`. A mechanically reverted copy of `naming.js` (all ten edits reversed by exact string replacement) was run through the same harness to produce the pre-edit baseline column. `node --check js/naming.js` passes.

### Results

| Case | Pre-edit | Post-edit | Expected |
| --- | --- | --- | --- |
| `C-C(-SH)` | `C2H6S` | **`ethanethiol`** | `ethanethiol` — matches |
| `C-C(-SH)-C`, thiol on the middle carbon | `C3H8S` | **`propan-2-thiol`** | `propan-2-thiol` (not `propane-2-thiol`): `showLocants` is true at chain length 3, so the locant branch fires and `stem` stays `propan` with no inserted `e` |
| `CH3-CH2-C≡N` | `C3H5N` | **`propanenitrile`** | `propanenitrile` — matches; the nitrile carbon counts as a parent-chain carbon |
| `CH3-CH2-CH2-C≡N` | `C4H7N` | **`butanenitrile`** | extra nitrile case, consistent |
| `C(-OH)-C-C≡N` (nitrile + hydroxyl) | `C3H5NO` | **`C3H5NO`** | still falls back — the `groups.length > 1` guard fires unchanged |
| `CH3-O-CH2CH2CH3` | `C4H10O` | **`1-methoxypropane`** | now names, as intended |
| Cyclohexane + `-SH` | `C6H12S` | **`cyclohexan-1-thiol`** | now names (ring locants print at size ≥ 4) |
| Cyclohexane + `-C≡N` | `C7H11N` | **`C7H11N`** | still falls back — no regression |
| Benzene + `-C≡N` | `C7H5N` | **`C7H5N`** | still falls back — no regression |
| `CH3-CH2-CH2-OH` | `propan-1-ol` | **`propan-1-ol`** | regression: identical |
| Cyclohexane + `-NH2` | `cyclohexan-1-amine` | **`cyclohexan-1-amine`** | regression: identical |
| Phenethylamine | `phenethylamine` | **`phenethylamine`** | regression: identical |
| Tryptamine | `tryptamine` | **`tryptamine`** | regression: identical |
| `butan-2-one` | `butan-2-one` | **`butan-2-one`** | regression: identical |
| `ethanoic acid` | `ethanoic acid` | **`ethanoic acid`** | regression: identical |
| `CH3-SH` | `CH4S` | **`methanethiol`** | no-locant thiol form on a one-carbon chain |
| Benzene + `-SH` | `C6H6S` | **`benzenethiol`** | aromatic thiol suffix |
| Methoxycyclohexane | `C7H14O` | **`1-methoxycyclohexane`** | ring alkoxy now names |
| Methoxybenzene | `C7H8O` | **`methoxybenzene`** | see the note below |

### Note: benzene also gained alkoxy

Passing `allowAlkoxy: true` in `nameForRing` reaches `nameAromaticRing` as well, because the aromatic path consumes the same accumulator. `methoxybenzene` therefore names where it previously fell back. This follows directly from the planned edit rather than extending it, but it does change a case the previous `CODE_REFERENCE.md` called out by name as unsupported, so that sentence was corrected instead of left stale.

### Comments

`grep -n "//\|/\*" js/naming.js` returns no matches. No code comments were introduced on any new or edited line.

### Checklist

- [x] `js/naming.js` edited; no other JS, CSS or HTML file touched.
- [x] Both `groups.length > 1` / `locants.length > 1` guards in `nameForChain` and `selectRingPrincipal` left logically unchanged — only new entries were added to the arrays feeding them.
- [x] `classifyAlkoxy`, `namePhenethylamine` and the indole path untouched.
- [x] Nitrile deliberately absent from `nameForRing` and `nameAromaticRing`; both ring nitrile cases verified as still falling back.
- [x] No code comments introduced.
- [x] `CODE_REFERENCE.md` updated.
- [x] `complexities.md` updated (score kept at 10, notes extended).
- [x] No git commands run.

## 2026-09-20 — Mechanical split of `js/naming.js` into four cohesion-based modules

Pure refactor. Zero behavior change, zero logic edits, zero comments added. Every function was moved verbatim — same body, same parameter names, same statement order — into exactly one new file.

### Files changed

- **Deleted:** `js/naming.js` (1248 lines).
- **Added:** `js/naming-core.js` (477 lines), `js/naming-chain.js` (141), `js/naming-ring.js` (284), `js/naming-scaffolds.js` (339).
- **Edited:** `index.html` (one script tag replaced by four), `complexities.md` (one row replaced by four), `CODE_REFERENCE.md` (file references only).

No bundler and no module system are involved: the file had no `import`/`export` and every declaration was already a plain global, so splitting it changes nothing at runtime as long as all four files load before `js/renderer.js`.

### `index.html` script order

`js/graph.js` → `js/valence.js` → `js/colors.js` → `js/naming-core.js` → `js/naming-chain.js` → `js/naming-ring.js` → `js/naming-scaffolds.js` → `js/renderer.js` → `js/interactions.js` → `js/app.js`. The relative order of `graph.js`, `valence.js` and `colors.js` is unchanged; only the single `naming.js` tag was replaced.

### Function-to-file mapping (43 functions, 8 constants)

**`js/naming-core.js`** — constants `NAME_ROOTS`, `ALKYL_PREFIXES`, `HALOGEN_PREFIXES`, `MULTIPLIER_PREFIXES`, `MAX_NAMED_CHAIN`, `MAX_BRANCH_LENGTH`, `MIN_RING_SIZE`, `MAX_RING_SIZE`; functions `molecularFormula`, `nameStructure`, `buildAdjacency`, `buildCarbonAdjacency`, `farthestCarbon`, `pathBetween`, `longestCarbonChains`, `collectBranch`, `classifyAttachment`, `elementOf`, `classifyAlkoxy`, `createAttachmentAccumulator`, `collectCoreAttachments`, `chainDegreeAt`, `compareLocantLists`, `shouldReverseChain`, `assembleSubstituentPrefix`, `buildNitrogenPrefix`, `scaffoldSubstituentEntries`, `buildSubstituentPrefix`, `buildStem`, `attachSuffix`, `deriveName`.

**`js/naming-chain.js`** — `nameForChain`.

**`js/naming-ring.js`** — `trimToRing`, `orderRing`, `cycleBondOrders`, `hasAlternatingOrders`, `ringBondLocant`, `chooseRingNumbering`, `buildRingPrefix`, `selectRingPrincipal`, `nameAromaticRing`, `nameForRing`, `deriveRingName`.

**`js/naming-scaffolds.js`** — `matchEthylamineChain`, `namePhenethylamine`, `arcBetween`, `extractFusedCore`, `indoleOrientations`, `nameIndole`, `deriveFusedName`.

Cross-file calls are expected and harmless: `deriveName` (core) calls `nameForChain` (chain), `deriveRingName` (ring) and `deriveFusedName` (scaffolds); `nameForRing` (ring) calls `namePhenethylamine` (scaffolds); all three tiers call the core helpers.

### Verification

`node --check` passes on all four new files.

Line-multiset diff of the original file against the concatenation of the four new files differs only by 7 blank lines (the blank separators consumed at the segment boundaries). No non-blank line was added, removed or altered.

A scratch Node smoke harness (not committed) loaded `js/graph.js` plus the real `maxValenceFor` from `js/valence.js`, built each molecule through the real `Graph` API, and ran `nameStructure` twice — once against the pre-split `js/naming.js` and once against the four new files — in separate `vm` contexts:

| Case | Pre-split | Post-split | Result |
| --- | --- | --- | --- |
| `CH3-CH2-CH2-OH` | `propan-1-ol` | **`propan-1-ol`** | match |
| Cyclohexane + `-NH2` | `cyclohexan-1-amine` | **`cyclohexan-1-amine`** | match |
| Benzene + `-CH2CH2-NH2` | `phenethylamine` | **`phenethylamine`** | match |
| Indole + `-CH2CH2-NH2` at C3 | `tryptamine` | **`tryptamine`** | match |
| `CH3-CH2-SH` | `ethanethiol` | **`ethanethiol`** | match |
| `CH3-CH2-C≡N` | `propanenitrile` | **`propanenitrile`** | match |
| `CH3-O-CH2CH2CH3` | `1-methoxypropane` | **`1-methoxypropane`** | match |

All seven identical; no mismatch to diagnose.

### Comments

`grep -n "//\|/\*" js/naming-core.js js/naming-chain.js js/naming-ring.js js/naming-scaffolds.js` returns no matches. No comment was added to any file.

### Checklist

- [x] Every function moved verbatim; no body, parameter name or statement reordered.
- [x] No logic changed, nothing "improved" in passing.
- [x] No comments added anywhere.
- [x] `js/naming.js` deleted; `js/graph.js`, `js/valence.js`, `js/colors.js`, `js/renderer.js`, `js/interactions.js`, `js/app.js` and `css/style.css` untouched.
- [x] `index.html` script order preserved, all four naming files before `js/renderer.js`.
- [x] `complexities.md` row replaced by four scored rows (core 7, chain 6, ring 7.5, scaffolds 8.5).
- [x] `CODE_REFERENCE.md` file references updated; no documented behavior changed.
- [x] No git commands run.

## 2026-09-20 — Monocyclic aromatic heterocycles (pyridine, pyrrole, furan, thiophene)

Additive naming pass. One source file edited, no comments added, no behavior change for any all-carbon ring.

### Files changed

- **Edited:** `js/naming-ring.js` (added `findRingHeteroatom`, `hasFuranPattern`, `HETEROCYCLE_NAMES`, `nameHeterocycle`; `nameForRing` gained a fifth `hetero` parameter and an early dispatch; `deriveRingName`'s all-carbon reject loop replaced by the `findRingHeteroatom` gate).
- **Edited:** `CODE_REFERENCE.md` (ring-extraction bullet, two new bullets in the ring section, rewritten fall-back paragraph).
- **Edited:** `complexities.md` (`js/naming-ring.js` row rescored 7.5 → 8 with the new capability described).

`js/naming-core.js`, `js/naming-chain.js`, `js/naming-scaffolds.js`, `js/graph.js`, `js/valence.js`, `js/colors.js`, `js/renderer.js`, `js/interactions.js`, `js/app.js`, `css/style.css` and `index.html` were not touched. `nameForRing` has exactly one caller (`deriveRingName`), confirmed by grep before the signature change, so no other call site needed updating.

No change was needed in `valence.js`, `graph.js`, `classifyAttachment` or `collectCoreAttachments`: implicit hydrogens are never materialized as graph atoms, so pyridine's N (ring orders 1 + 2 = 3 = `MAX_VALENCE.N`, no implicit H) and pyrrole's N (1 + 1 = 2, one implicit N–H) both fall out of the existing machinery unmodified.

### Verification

No automated harness exists in the repo, so a scratch Node harness (not committed) loaded `js/graph.js`, `js/valence.js` and the four `naming-*.js` files into a `vm` context, built each molecule through the real `Graph` API, and called the real `nameStructure`. The same harness was run a second time against a reconstructed pre-change copy of `js/naming-ring.js` to confirm the regression column byte-for-byte.

| Case | Produced | Expected | Result |
| --- | --- | --- | --- |
| Pyridine (6-ring, one N, alternating) | `pyridine` | `pyridine` | match |
| Pyridine + `-NH2` two positions from N | `pyridin-3-amine` | locant-numbered amine | match |
| Pyridine + `-OH` two positions from N | `pyridin-3-ol` | locant-numbered alcohol | match |
| Pyrrole (5-ring, one N, 1/2/1/2/1) | `pyrrole` | `pyrrole` | match |
| Pyrrole + methyl on the ring nitrogen | `1-methylpyrrole` | `1-methylpyrrole` | match |
| Furan (5-ring, one O, 1/2/1/2/1) | `furan` | `furan`, **not** `furane` | match |
| Furan + methyl adjacent to O | `2-methylfuran` | locant-numbered | match |
| Furan + methyl one further round | `3-methylfuran` | locant-numbered | match |
| Thiophene (5-ring, one S, 1/2/1/2/1) | `thiophene` | `thiophene` | match |
| Thiophene + methyl adjacent to S | `2-methylthiophene` | locant-numbered | match |
| Piperidine analog (6-ring N, all single) | `C5H11N` | formula fallback | match |
| Tetrahydrofuran analog (5-ring O, all single) | `C4H8O` | formula fallback | match |
| Pyrrolidine analog (5-ring N, all single) | `C4H9N` | formula fallback | match |
| 6-ring O, alternating | `C5H5O` | formula fallback | match |
| 6-ring S, alternating | `C5H5S` | formula fallback | match |
| Pyrimidine shape (two ring N, alternating) | `C4H4N2` | formula fallback | match |
| 6-ring with a ring `P` | `C5H5P` | formula fallback | match |
| 5-ring with a ring `Cl` | `C4H4Cl` | formula fallback | match |

Regression cases, each identical before and after the change:

| Case | Before | After | Result |
| --- | --- | --- | --- |
| Benzene | `benzene` | `benzene` | identical |
| Cyclohexane | `cyclohexane` | `cyclohexane` | identical |
| Cyclohexanol | `cyclohexan-1-ol` | `cyclohexan-1-ol` | identical |
| Cyclohexanethiol | `cyclohexan-1-thiol` | `cyclohexan-1-thiol` | identical |
| Cyclohexane + methoxy | `1-methoxycyclohexane` | `1-methoxycyclohexane` | identical |
| Phenethylamine | `phenethylamine` | `phenethylamine` | identical |
| Indole | `indole` | `indole` | identical |
| Tryptamine | `tryptamine` | `tryptamine` | identical |

No discrepancy to diagnose; no naming logic was adjusted to force a match.

### Scope notes

Deliberately not added, and unchanged from the plan: nitrile is absent from the heterocycle principal list, and `acc.carbonyls.length > 0` rejects outright, so no ketone/aldehyde/acid support on heterocycles. Only `6:N`, `5:N`, `5:O` and `5:S` are in the table; every other single-heteroatom ring, and every ring with two or more non-carbon positions or an unsupported in-ring element, returns `null` and falls back to the formula. `nameHeterocycle` is the only exit for a single-heteroatom ring — it can never fall through to the benzene or cycloalkane code.

### Checklist

- [x] No comments introduced anywhere (`grep -n "//\|/\*" js/naming-ring.js` returns no matches).
- [x] `nameForRing`'s `!hetero` path below the new dispatch is unchanged.
- [x] `CODE_REFERENCE.md` updated (new functions, table, pattern check, heteroatom-pinned numbering, fall-back scope).
- [x] `complexities.md` updated; `js/naming-ring.js` rescored 7.5 → 8 with justification in the notes.
- [x] Only `js/naming-ring.js` edited among source files; every file listed as off-limits untouched.
- [x] No git commands run.
