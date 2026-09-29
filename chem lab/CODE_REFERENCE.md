# Code Reference — Chemical Graph Constructor

A dependency-free, no-build browser editor for organic skeletal (line-angle) structures. Open `index.html` directly in a browser; scripts load as plain `<script>` tags in dependency order (as of session 43): `elements.js`, `graph.js`, `valence.js`, `stereo.js`, `colors.js`, `naming-core.js`, `naming-chain.js`, `naming-ring.js`, `naming-scaffolds.js`, `naming-general.js`, `common-names-extra.js`, `naming-elements.js`, `properties.js`, `layout.js`, `smiles.js`, `name-lookup.js`, `insight.js`, `isomers.js`, `polymer.js`, `geometry3d.js`, `projections.js`, `share.js`, `notebook.js`, `resonance.js`, `substructure.js`, `spectra-nmr.js`, `spectra-ir.js`, `spectra-ms.js`, `pubchem.js`, `molfile.js`, `scheme.js`, `history.js`, `svg-context.js`, `renderer.js`, `interactions.js`, `stamps.js`, `abbreviations.js`, `recent.js`, `reactions.js`, `reagent-library.js`, `reaction-io.js`, `reaction-stereo.js`, `reaction-rules.js`, `reaction-rules-extra.js`, `reaction-rules-extra2.js`, `reaction-aromatic.js`, `reaction-rules-extra3.js`, `retro.js`, `reaction-lab.js`, `spectra-view.js`, `viewer3d.js`, `retro-view.js`, `app.js`.

## Data model (`js/graph.js`)

Pure data, no DOM and no rendering.

- **Atom**: `{ id, element, x, y }`. `id` is a positive integer from an internal counter. `element` is one of `C, N, O, S, P, F, Cl, Br, I`. `x`/`y` are canvas pixel coordinates.
- **Bond**: `{ id, atomA, atomB, order }`. `atomA`/`atomB` are atom ids; the bond is undirected. `order` is `1`, `2`, or `3`.

`Graph` methods:

| Method | Behavior |
| --- | --- |
| `addAtom(element, x, y)` | Creates and stores an atom, returns it. |
| `getAtom(id)` | Atom or `null`. |
| `removeAtom(id)` | Removes the atom **and every bond touching it**. Returns whether it existed. |
| `addBond(atomAId, atomBId)` | Creates an order-1 bond and returns it. Returns `null` for a self-bond, a missing atom, or when a bond already exists between the pair — duplicate creation is never silently upgraded to a higher order; raising order is the caller's separate click gesture. |
| `getBondById(id)` | Bond or `null`. |
| `getBond(atomAId, atomBId)` | Bond between the pair in either direction, or `null`. |
| `removeBond(id)` | Removes one bond. Returns whether it existed. |
| `bondsForAtom(atomId)` | All bonds touching the atom. |
| `totalBondOrder(atomId)` | Sum of `order` across those bonds — the atom's consumed valence. |
| `clear()` | Empties atoms and bonds and resets both id counters. |

## Valence (`js/valence.js`)

Max valence table:

| Element | C | N | O | S | P | F | Cl | Br | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max bond order sum | 4 | 3 | 2 | 2 | 3 | 1 | 1 | 1 | 1 |

- `maxValenceFor(element)` → the table value, or `0` for an unknown element.
- `canAddBond(graph, atomId, deltaOrder)` → `true` when `totalBondOrder(atomId) + deltaOrder <= maxValenceFor(element)`. A missing atom is `false`; a non-positive `deltaOrder` (a decrease) is always `true`. Called with `deltaOrder = 1` both when creating a new bond and when cycling an existing bond's order upward, and it is checked on **both** endpoints before any mutation.

## Rendering (`js/renderer.js`)

`new Renderer(ctx, graph)` holds a canvas 2D context and the graph. `render()` is immediate-mode: it clears the full canvas, paints the background, draws every bond, then draws every atom on top. There is no incremental diffing; callers simply re-render after any state change.

Skeletal-notation drawing rules:

- **Carbon is implicit** — no label. A carbon that currently has no bonds is drawn as a small dot so a freshly placed atom is visible and clickable; once it has at least one bond it becomes a bare vertex, as skeletal notation requires.
- **Heteroatoms** (everything except C) are drawn as their element symbol, centered on the vertex. Before the text, an opaque background-colored rectangle is painted so nothing shows through the glyph, and bond lines are additionally trimmed by `labelClearRadius` at any labeled endpoint so no line runs into the letter.
- **Bond order** maps to parallel lines offset perpendicular to the bond axis and centered on it: order 1 → one line at offset 0; order 2 → two lines at ±spacing/2; order 3 → three lines at −spacing, 0, +spacing. The perpendicular is derived from the bond's own unit vector, so offsets follow the bond angle.
- **Flash state**: `flashAtom(atomId)` marks an atom invalid, re-renders immediately (translucent red disc behind the vertex, red label text for heteroatoms), then clears the mark after `flashDurationMs` and re-renders again. Repeat flashes on the same atom restart its timer.

Tunables live in the `RENDER_SETTINGS` object (colors, line width, parallel-line spacing, label font and clear radius, carbon dot radius, flash color/radius/duration).

## Interactions (`js/interactions.js`)

`new Interactions(canvas, graph, renderer)`; `bind()` attaches `mousedown`, `mouseup`, and `contextmenu` on the canvas. `setSelectedElement(element)` sets the element used for placement (default `C`). Every gesture that changes state ends with a re-render.

Hit testing: an atom is hit within `atomHitRadius` (10px) of its vertex; a bond is hit when the distance from the pointer to the bond segment is within `bondHitRadius` (6px). Atoms take priority over bonds, and later-added items are tested first. A press-and-release under `dragThreshold` (4px) counts as a click, anything beyond as a drag.

| Gesture | Behavior |
| --- | --- |
| Click on empty canvas | `addAtom(selectedElement, x, y)`. |
| Click on a bond line (not on an atom) | Cycle order 1 → 2 → 3 → 1. Going 3 → 1 is a decrease and is always allowed. Going 1 → 2 or 2 → 3 requires `canAddBond(..., 1)` on **both** endpoints; if either fails the order is unchanged and both endpoints flash red. |
| Drag from an atom to empty space | The drag angle from the origin atom is snapped to the nearest allowed angle (the union of the 30° and 36° grids) and a new atom of the selected element is placed at `bondLength` (50px) along that angle, then bonded to the origin. Requires valence headroom on the origin atom (and a selectable element with max valence ≥ 1); if blocked, **neither the atom nor the bond is created** and the origin flashes red. Snapping at a fixed length is what produces the classic 120° zig-zag chain. |
| Drag from an atom onto another atom | If a bond already exists between them, nothing happens (order cycling is the separate click gesture). Otherwise both atoms are checked for +1 order; if OK a single bond is added, if blocked both atoms flash red. |
| Right-click an atom | Deletes the atom and every bond touching it. Default context menu is suppressed. |
| Right-click a bond | Deletes that bond only. |

A blocked action also toggles the `valence-blocked` class on the canvas for the same duration, which runs the red border/glow keyframe in `css/style.css`.

Tunables live in `INTERACTION_SETTINGS` (hit radii, bond length, angle snap steps, drag threshold, flash duration). Helpers `snapAngleCandidates(stepDegreesList)`, `snapAngle(angleRadians, stepDegreesList)` and `distanceToSegment(point, a, b)` are plain module-level functions.

## Wiring (`js/app.js`)

An IIFE that gets the canvas and its 2D context, constructs the `Graph`, `Renderer`, and `Interactions`, wires the toolbar element buttons (exclusive `selected` class plus `setSelectedElement`) and the Clear button (`graph.clear()` then re-render), calls `interactions.bind()`, sizes the canvas backing store to its CSS box on load and on window resize, and performs the initial render.

## Styling (`css/style.css`)

Flex row page: a fixed-width sidebar beside a canvas that fills the remaining space. `.element-button.selected` marks the active element. The canvas uses `cursor: crosshair`. `#editor-canvas.valence-blocked` runs the `valence-flash` keyframe used as the blocked-action highlight.

## Visual design

Dark "lab" theme. The whole palette has two homes: `js/colors.js` for anything tied to an element, and the `:root` custom properties in `css/style.css` for chrome.

### Element palette (`js/colors.js`)

`ELEMENT_COLORS` is the single source of truth so canvas rendering and toolbar accents cannot drift. `colorForElement(element)` returns the entry, falling back to the carbon color for an unknown symbol.

| Element | C | N | O | S | P | F | Cl | Br | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Color | `#cbd5e1` | `#4f8ff7` | `#f0483e` | `#f5c542` | `#ff9f43` | `#2dd4bf` | `#4ade80` | `#b45309` | `#a855f7` |

Two consumers:

- **`js/renderer.js`** — heteroatom label text and the unlabeled-carbon dot both use `colorForElement(atom.element)`. Carbon stays unlabeled; its color only ever paints the bondless dot.
- **`js/app.js`** — each `.element-button` gets `style.setProperty('--accent', colorForElement(button.dataset.element))` at wiring time, and the CSS styles the left border, hover ring, and selected tint from `var(--accent)`.

### Layout

`body` is a flex row of `#sidebar` (260px, fixed) and `#canvas-wrapper` (fills the rest), both full viewport height. The sidebar stacks, top to bottom: `.sidebar-head` (title + subtitle), the `#element-buttons` 3-column grid, the `#gesture-hints` list, and `.sidebar-foot` (pushed down with `margin-top: auto`) holding `#clear-button`.

### Color tokens (`:root`)

| Token | Value | Use |
| --- | --- | --- |
| `--bg-app` | `#0d0f14` | Page and canvas background; must stay identical to `RENDER_SETTINGS.background`, which paints the actual canvas pixels and the label-clearing rects. |
| `--bg-sidebar` | `#161a22` | Sidebar surface. |
| `--bg-control` / `--bg-control-hover` | `#1d222c` / `#242a36` | Neutral button fills. |
| `--text-primary` / `--text-muted` | `#e6e9ef` / `#8b93a3` | Body text / labels and hints. |
| `--border` | `#262c38` | Dividers, button and canvas borders. |
| `--danger` / `--danger-border` / `--danger-bg` | `#f87171` / `#6b2b2b` / `#2a1618` | Clear button and the blocked-action glow. |
| `--accent` | per button, from JS | Element accent; unset elsewhere, so every use has a fallback. |

Canvas-side visuals beyond the shared background: a dot grid (`gridColor` `rgba(255,255,255,0.04)`, 24px spacing) drawn behind bonds and atoms each pass, bonds in `#c7ccd6` with a 5px `shadowBlur` glow, and the blocked-atom flash as a radial-gradient pulse in `#f87171`. Bond geometry (width, parallel-line spacing, offsets) is unchanged by the theme.

## Auto-naming (`js/graph.js`, `js/naming-core.js`, `js/naming-chain.js`, `js/naming-ring.js`, `js/naming-scaffolds.js`, `js/renderer.js`)

The naming code is split across four files that all define plain globals, so any function may call any other regardless of file: `js/naming-core.js` holds the shared constants (`NAME_ROOTS`, `ALKYL_PREFIXES`, `HALOGEN_PREFIXES`, `MULTIPLIER_PREFIXES`, the size limits), `molecularFormula`, the `nameStructure` entry point, the `deriveName` dispatcher, and every shared helper (graph/adjacency walks, attachment classification, locant comparison, prefix/stem/suffix assembly); `js/naming-chain.js` holds `nameForChain`; `js/naming-ring.js` holds the ring extraction, aromaticity, ring-numbering and ring-naming path; `js/naming-scaffolds.js` holds the named-scaffold tier (`matchEthylamineChain`, `namePhenethylamine`, and the fused indole/tryptamine path).

Every disconnected structure on the canvas gets a text label drawn above it: an IUPAC-style name when the structure falls inside a deliberately narrow supported subset, otherwise its molecular formula.

### `Graph.connectedComponents()`

Returns `[{ atomIds: [...] }, ...]`, one entry per disconnected structure, via BFS over `bondsForAtom`. Atom order within a component is BFS discovery order; component order follows the atom list. A bondless atom is its own component.

### `molecularFormula(graph, atomIds)` (`js/naming-core.js`)

Implicit hydrogen per atom is `max(0, maxValenceFor(element) - totalBondOrder(atomId))`, so the formula reacts to bond-order edits with no extra state. Elements are tallied (hydrogens summed across the component) and emitted in Hill order — `C`, then `H`, then everything else alphabetically — each symbol followed by its count only when greater than 1: `CH4`, `C2H6O`, `H2O`.

### `nameStructure(graph, atomIds)` (`js/naming-core.js`; chain path in `js/naming-chain.js`)

Returns a name when one is confidently derivable, otherwise `molecularFormula(...)` for the same component. It never throws: the derivation runs inside a `try`/`catch` and every unsupported branch returns `null`, which is what triggers the formula fallback.

Supported scope:

- **Cyclomatic-number dispatch, up to five fused rings.** `deriveName` branches purely on the component's cyclomatic number (`bonds.length` relative to `atomIds.length`). `- 1` (a tree) takes the chain path below; `=== atomIds.length` (exactly one independent cycle) takes the ring path documented under "Rings"; `+ 1` takes the fused/bridged-bicyclic path (`deriveFusedName`: indole/tryptamine, naphthalene, quinoline/isoquinoline, methylenedioxy, benzofuran, benzothiophene, aminorex — benzothiophene is the sulfur analogue of benzofuran added this session, see "Benzofuran / APB-MAPB family" below); `+ 2` takes the tricyclic path (`deriveTricyclicName`: β-carboline, then benzodifuran/FLY — see "Recognized scaffolds" and "Benzodifuran / FLY family" below); `+ 3` takes the tetracyclic path (`deriveTetracyclicName`: the ergoline/lysergamide skeleton, see below); `+ 4` takes the pentacyclic path (`derivePentacyclicName`: the morphinan/morphine-family skeleton, see "Morphinan family" below); anything else falls back to the formula immediately.
- **Parent chain** is a longest carbon-only path, 1–10 carbons (`meth, eth, prop, but, pent, hex, hept, oct, non, dec`). Because a longest path is not unique, *all* maximal-length carbon paths are enumerated and tried in turn; the first that yields a name wins. This is what lets the functional group sit on the chain instead of on a branch (e.g. 2-methylpropan-1-ol).
- **Substituents**: straight, unbranched alkyl branches of 1–4 carbons (`methyl, ethyl, propyl, butyl`) and terminal halogens (`fluoro, chloro, bromo, iodo`). Halogens are always prefixes, never suffixes. Repeats use `di/tri/tetra`; five or more identical substituents fall back.
- **Functional groups**, in suffix priority order: carboxylic acid (`-oic acid`) > nitrile (`-enitrile`) > aldehyde (`-al`) > ketone (`-one`) > alcohol (`-ol`) > thiol (`-ethiol` / `-n-thiol`) > amine (`-amine`). A chain carbon carrying both a double-bonded O and a terminal `-OH` is an acid (terminal carbons only); a lone `C=O` is an aldehyde on a chain-end carbon and a ketone on an interior one; a terminal single-bonded O is an alcohol; a terminal single-bonded S is a thiol; a terminal single-bonded N is an amine; a terminal triple-bonded N is a nitrile.
- **Thiol (`-SH`)** is the sulfur mirror of the alcohol case in `classifyAttachment`: an `S` of degree 1 joined by a single bond. It is available on chains, cycloalkanes and benzene, and because it is a suffix group it competes under the same one-group/one-locant guards as `-ol`. `attachSuffix` renders it as `stem + 'ethiol'` when locants are suppressed and `stem + '-' + locant + '-thiol'` when they are printed, giving `ethanethiol`, `methanethiol`, `propan-2-thiol`, `cyclohexan-1-thiol` and `benzenethiol`.
- **Nitrile (`-C≡N`)** is a terminal N of degree 1 reached by a triple bond. The nitrile carbon is counted as an ordinary parent-chain carbon, so `CH3CH2C≡N` is `propanenitrile`, not `ethanenitrile`. It is **chain-only**: `nameForChain` additionally re-checks with `chainDegreeAt` that every nitrile position is a chain end and returns `null` otherwise, and neither the cycloalkane nor the benzene principal list offers it — a ring bearing `-C≡N` still falls back to the formula (the exocyclic carbon fails `collectBranch`'s triple-bond rejection in the alkyl path). `attachSuffix` renders it as `stem + 'enitrile'` with no locant, since the group can only sit at a chain end.
- **Unsaturation**: one `C=C` or `C≡C` between adjacent chain carbons replaces `an` with `en`/`yn`. A `C=O` is never counted as an ene because it is not a carbon–carbon bond.
- **Numbering** picks the chain end giving the principal suffix the lower locant, then falls back to unsaturation locants, then substituent locants. Locants are printed only for chains of 3+ carbons, so `ethanol` and `chloroethane` stay unnumbered while `propan-2-ol` and `2-chloropropane` are numbered.
- **Assembly**: `[substituent prefixes, alphabetized, joined with -][root][an|en|yn]e[-suffix]`, e.g. `2-methylpropan-1-ol`, `but-2-ene`, `ethanoic acid`.

**Update, later session.** Generalized multiplied (di/tri/tetra) principal-group suffixes across both the chain path (`nameForChain`, `js/naming-chain.js`) and every ring path that has a principal-group suffix (`nameForRing`'s cycloalkane branch, `nameAromaticRing`, `nameHeterocycle`, all in `js/naming-ring.js`) — motivated by wanting fewer common, simple molecules (diols, diamines, diacids, etc.) to fall back to a bare molecular formula just because they carry the same functional group twice. Previously, `nameForChain` and `selectRingPrincipal` (`js/naming-ring.js`) both hard-rejected (`return null`) the instant a principal group's locant list had more than one entry — so even `HOCH2CH2OH` (ethylene glycol) fell back to `C2H6O2` instead of naming as `ethane-1,2-diol`. That single-locant guard is now removed from both call sites; `attachSuffix` (`js/naming-core.js`) is the one place that actually builds the multiplied form, so both the chain and ring paths funnel through the same logic with zero duplication.
  - `attachSuffix(stem, principal, showLocants)` now accepts `principal.locants` (an array) as well as the older `principal.locant` (a single number, still accepted via `locants = principal.locants || [principal.locant]` for backward compatibility with any caller not yet updated). When `locants.length === 1` the function is byte-for-byte the same as before. When `locants.length > 1`, it looks up `MULTIPLIER_PREFIXES[locants.length]` (`di`/`tri`/`tetra` — so 2–4 occurrences only; 5+ identical principal groups still correctly fall back to the formula rather than crash, since the multiplier lookup and the new `SUFFIX_WORDS[kind]` lookup both come back `undefined` and `attachSuffix` returns `null`) and a new `SUFFIX_WORDS` map (`{ acid: 'oic acid', aldehyde: 'al', nitrile: 'nitrile', ketone: 'one', alcohol: 'ol', thiol: 'thiol', amine: 'amine' }`), then builds `stem + 'e' + (locants shown ? '-' + locants.join(',') + '-' : '') + multiplier + word`. The `+ 'e'` matters: the mono-group path never carries a trailing `e` on the stem (`buildStem` already returns `propan`, not `propane`), but the multiplied IUPAC forms retain it — `propane-1,2,3-triol` (glycerol), `hexane-1,6-diamine` (not `hexan-1,6-diamine`), `pentane-2,4-dione`, `butane-2,3-dithiol`. A new `TERMINAL_SUFFIX_KINDS` set (`acid`, `aldehyde`, `nitrile`) suppresses the locant block for those three kinds even when `locants.length > 1`, since a chain can only carry two of any of them at its two ends (never mid-chain, by definition of the functional group), so the position is unambiguous without locants — `butanedioic acid` (succinic acid), `hexanedinitrile` (adiponitrile), `pentanedial` (glutaraldehyde), never `butane-1,4-dioic acid`. For the non-terminal kinds (ketone/alcohol/thiol/amine) locants are *always* shown once `locants.length > 1`, regardless of the `showLocants` chain-length-based flag used everywhere else in this codebase — `ethane-1,2-diol` needs its locants even though a 2-carbon chain would otherwise suppress them for a single `-ol` (`ethanol`, no locant), because the multiplied suffix is ambiguous without them in general and this project didn't special-case the 2-carbon exception.
  - `nameForChain` (`js/naming-chain.js`): removed the `principal.locants.length > 1` early return; `forward`/`reverse` (used for canonical chain-direction numbering) now each carry `suffixLocants` (a sorted array) instead of the old scalar `suffix`, and `shouldReverseChain` (`js/naming-core.js`) was regeneralized to compare `forward.suffixLocants` vs `reverse.suffixLocants` with the existing `compareLocantLists` helper instead of a scalar `<` comparison — for a single-locant principal group this is exactly equivalent to the old comparison (array of length 1 compares the same as the scalar did), so no existing single-group name changes. The final `attachSuffix` call now builds `principal.locants` (plural, mapped through the same forward/reverse numbering logic already used for the single-locant case) instead of `principal.locant` (singular), and the caller now checks `if (core === null) return null;` since `attachSuffix` can now fail (5+ occurrences, or an unlisted `kind`) where it previously never did.
  - `js/naming-ring.js`: `selectRingPrincipal` dropped its own `locants.length > 1` guard. `chooseRingNumbering`'s locant-choosing key now folds in *all* of a multi-locant principal's mapped-and-sorted locants (`principal.locants.map(idx => locants[idx]).sort(...)`) instead of just `locants[principal.locants[0]]`, so ring numbering direction is chosen correctly for e.g. a 1,4-disubstituted ring. All three ring-path call sites of `attachSuffix` (cycloalkane in `nameForRing`, `nameAromaticRing`, `nameHeterocycle`) were updated to pass `locants` arrays the same way, each gained the `if (core === null) return null;` guard, and each place that computed `showLocants` from `(principal ? 1 : 0)` now uses `(principal ? principal.locants.length : 0)` so e.g. a plain diol on an otherwise-unsubstituted benzene ring (`benzene-1,2-diol`, catechol) still shows its locants even though the old formula (`substituents.length + 1 > 1`) would have suppressed them for zero ordinary substituents.
  - Verified against hand-built graphs for: `ethane-1,2-diol`, `propane-1,2,3-triol` (glycerol), `butane-1,4-diamine` (putrescine), `butanedioic acid` (succinic acid), `hexanedinitrile` (adiponitrile), `pentanedial` (glutaraldehyde), `pentane-2,4-dione`, `butane-2,3-dithiol`, `benzene-1,2-diol` (catechol, aromatic-ring path), and `cyclohexane-1,4-diol` (cycloalkane path) — all produced the exact expected string. Also verified that unsupported combinations (two *different* principal-group kinds on one component, e.g. one `-NH2` plus one `-OH`) and unsupported counts (5 identical `-OH` groups, no `MULTIPLIER_PREFIXES` entry) still fail cleanly to the molecular formula with no exception thrown. All 30 files in the existing regression suite were rerun afterward with zero changes to their output. No new `COMMON_NAMES` entries were added for this change — it is a fallback-path generalization, not a new named compound.

### Rings (`js/naming-ring.js`)

Reached only when `bonds.length === atomIds.length`. Shared with the chain path, one implementation each: `NAME_ROOTS`, `classifyAttachment` / `collectCoreAttachments` (branch and heteroatom role classification), `collectBranch`, `assembleSubstituentPrefix` (alphabetization plus `di/tri/tetra`), `buildStem` (`an`/`en`/`yn` conjugation with its locant), and `attachSuffix` (suffix conjugation and the `-e` elision).

- **Ring extraction** (`trimToRing`): degree-1 atoms are trimmed from a working copy of the atom/bond set, repeatedly, until none remain. What survives is the cycle; everything trimmed is a tree-like branch hanging off a specific ring atom. `orderRing` then walks the survivors into cycle order, rejecting anything whose in-ring degree is not exactly 2. The ring must be 3–8 atoms (`MIN_RING_SIZE`/`MAX_RING_SIZE`). `findRingHeteroatom` then scans the ordered ring once and returns `null` for an all-carbon ring, `{ index, element }` for a ring with exactly one `N`, `O` or `S` position, and the sentinel string `'invalid'` for everything else (two or more non-carbon positions, or any in-ring element other than `C`/`N`/`O`/`S`), which `deriveRingName` rejects outright. Its result is passed to `nameForRing` as a fifth argument.
- **Substituents and functional groups** on ring atoms are classified by the same helper the chain uses, so the supported set is identical: unbranched alkyl 1–4, an alkoxy ether prefix, terminal `-OH`, terminal `-SH`, terminal `-NH2`, terminal halogen, and an exocyclic `C=O`. Anything else is unsupported and falls back. A ring `-C≡N` is deliberately *not* supported, since nitrile is a chain-only suffix.
- **Aromatic detection.** `cycleBondOrders` reads the bond orders around a cycle and `hasAlternatingOrders` accepts only strict 1/2/1/2 alternation (every order is 1 or 2 and differs from the next one, wrap included, so each ring carbon touches exactly one single and one double ring bond). A ring is aromatic when it is size 6 and passes that check; a size-6 ring failing the alternation is not aromatic and drops through to the cycloalkane path. Both helpers are shared with the indole detector below, which runs the same alternation test over the six-membered half of the fused core.
- **Benzene naming.** Parent `benzene`; the stem `benzen` goes through `attachSuffix`, so a single `-OH` gives `benzenol`, a single `-SH` gives `benzenethiol` and a single `-NH2` gives `benzenamine` (the parent's final `e` is elided). Carbonyl roles are rejected outright here — a fully aromatic ring carbon has no spare valence for one — as is a ring carrying both an `-OH` and an `-NH2`. Halogens and alkyls are always prefixes. Locants are printed only when the ring carries more than one named position in total, so `chlorobenzene` and `benzenol` stay unnumbered while `1,2-dimethylbenzene` and `3-chlorobenzenol` are numbered; the suffix group always takes locant 1 and is never printed.
- **Cycloalkane / cycloalkene / cycloalkyne.** Root is `cyclo` + `NAME_ROOTS[ringSize]` (`prop`…`oct` for 3–8), then the shared `an`/`en`/`yn` conjugation: `cyclohexane`, `cyclohex-1-ene`, `cyclopent-1-yne`. At most one ring `C=C`/`C≡C`; a ring-bond locant is the lower of its two endpoint numbers, except the wrap pair `(1, n)` which is `n`. At most one suffix group, in the chain's priority order — ketone (`-one`, an exocyclic `C=O` on a ring carbon) > alcohol (`-ol`) > thiol (`-thiol`) > amine (`-amine`). Locants are printed for rings of 4+ atoms, so `methylcyclopropane` stays unnumbered while `1-chlorocyclopentane` is numbered.
- **Monocyclic aromatic heterocycles** (`nameHeterocycle`). The very first thing `nameForRing` does after `cycleBondOrders` is check the `hetero` argument: if it is set, the ring is handed to `nameHeterocycle` and never touches the benzene, phenethylamine or cycloalkane code below, so a single-heteroatom ring can never be named as if it were all carbon. `HETEROCYCLE_NAMES` keys `ringSize + ':' + element` to a `{ stem, bare }` pair — `6:N` → `pyridin`/`pyridine`, `5:N` → `pyrrol`/`pyrrole`, `5:O` → `furan`/`furan`, `5:S` → `thiophen`/`thiophene`. `furan`'s two forms are deliberately identical: the unsubstituted parent uses `bare` directly rather than the `stem + 'e'` branch of `attachSuffix`, which would wrongly give `furane`. A size-6 heterocycle must pass the same `hasAlternatingOrders` Kekulé test as benzene; a size-5 one must pass `hasFuranPattern(orders, heteroIndex)`, which is *not* full alternation — odd cycles cannot alternate — but the real five-ring pattern read from the heteroatom: single, double, single, double, single, so the heteroatom carries two single ring bonds and the four ring carbons carry two double bonds between them. Any other size, any unlisted size/element pair, and any ring failing its pattern test returns `null` and the component falls back to the formula.
- **Heterocycle naming.** Substituents and suffix groups are collected with the same shared `collectCoreAttachments` over every ring position, including the heteroatom's. No special-casing is needed there: implicit hydrogens are never materialized as atoms, so pyridine's `N` (ring bond orders 1 + 2 = 3, exactly `MAX_VALENCE.N`) simply has no neighbours and no implied H, while pyrrole's `N` (1 + 1 = 2) picks up its N–H implicitly — and a substituent drawn on the pyrrole nitrogen is classified like any other. Exocyclic `C=O` rejects outright, and the suffix priority is alcohol > thiol > amine, with nitrile deliberately absent exactly as on benzene. Numbering pins the heteroatom to locant 1 via `chooseRingNumbering`'s `anchorIndex`, matching IUPAC heterocycle numbering, and the remaining direction is chosen by the usual lowest-locant rule. Locants are printed whenever the ring carries any named position at all, so `pyridin-3-amine`, `2-methylfuran` and `1-methylpyrrole` are numbered while the bare parents `pyridine`, `pyrrole`, `furan` and `thiophene` are not.
- **Ring numbering** (`chooseRingNumbering`) brute-forces all `ringSize * 2` start-atom × direction options — trivially cheap at size ≤ 8 — and picks the lexicographically smallest key of `[suffix locant, unsaturation locants, substituent locants]`. That reproduces the chain's priority (suffix anchors locant 1, then unsaturation, then substituents) without a separate direction heuristic, and is deterministic. An optional fifth argument `anchorIndex` pins the start atom so only the two directions are searched; the phenethylamine path uses it to fix the side-chain carbon at locant 1. Omitting it keeps the original all-starts behaviour.

Ring cases that fall back to the formula: any ring with two or more non-carbon positions (so no pyrimidine, imidazole or oxazole) or with an in-ring element other than `C`/`N`/`O`/`S` (so no `P` or in-ring halogen); a single-heteroatom ring that is not one of the four supported aromatics — a saturated or otherwise non-alternating ring (so no piperidine, pyrrolidine, tetrahydrofuran or thiolane), a size-6 ring whose heteroatom is `O` or `S` rather than `N`, and any single-heteroatom ring of size 3, 4, 7 or 8; fused, bridged, or spiro systems (caught by the cyclomatic-number test and the in-ring-degree-2 test), ring size below 3 or above 8, two competing functional-group types or two instances of the top-priority one on the same ring (including benzene carrying both `-OH` and `-NH2`), more than one ring `C=C`/`C≡C`, an exocyclic `C=O` on an aromatic carbon, and any branch the shared classifier does not support (branched, heteroatom-bearing, or longer than four carbons).

Explicitly out of scope, all falling back to the formula: fused/bridged/spiro rings other than the indole scaffold below, ring or aromatic `-C≡N`, thioethers and any other `S` bond pattern beyond a terminal `-SH`, diols/diacids and any other repeat of the top-priority group, molecules mixing two different suffix-priority group types, branched or heteroatom-bearing substituents, branches longer than four carbons, chains over ten carbons, more than one unsaturation, `P` substituents, and any heteroatom with an unexpected bond order or degree.

### Recognized scaffolds (`js/naming-scaffolds.js`)

A third naming tier sits above the chain and ring tiers: a small set of hard-coded skeletons that plain substitutive nomenclature would not reach. It reuses every shared helper the other two tiers use — `trimToRing`, `orderRing`, `cycleBondOrders` / `hasAlternatingOrders`, `classifyAttachment` / `collectCoreAttachments` / `collectBranch`, `assembleSubstituentPrefix`, `chooseRingNumbering` — and, like them, returns `null` for anything it does not fully understand so the component falls back to its formula.

- **`matchEthylamineChain(graph, adjacency, coreIds, coreAtomId, allowAlphaBranch)`** is the one pattern matcher shared by both scaffolds. The core atom must have exactly one off-core neighbour (alpha): normally a single-bonded carbon of total degree 2 (a bare `-CH2-`) whose other neighbour is another single-bonded carbon of degree 2 (beta), whose other neighbour is a single-bonded nitrogen. When the caller passes `allowAlphaBranch: true` (only `nameIndole`/tryptamine does), alpha may instead have *two* off-core neighbours: the matcher tries each as "the beta that continues to nitrogen" and resolves the other via `resolveAlkylBranch` as an alpha substituent (e.g. alpha-methyl for AMT, alpha-ethyl for AET), reporting it back as `alphaSubstituent`; every other caller keeps the original degree-2-only behavior unchanged since the flag defaults to falsy. The terminal nitrogen may carry 0, 1 or 2 further single-bonded substituents, each resolved via `resolveAlkylBranch` (see below) rather than `collectBranch` directly, so branched substituents like isopropyl (DiPT) are recognized alongside straight chains. It mutates nothing, never throws, and returns either `null` or `{ alpha, beta, nitrogen, substituents, atoms, alphaSubstituent }`, where `atoms` is every atom the chain consumed (including any alpha-branch atoms) so the caller can account for the whole component.
- **`resolveAlkylBranch(graph, adjacency, startId, fromId)`** (`naming-core.js`, next to `collectBranch`) is the shared substituent-name resolver used anywhere an N- or alpha-branch needs a name: it first tries `collectBranch` (unbranched 1–4 carbon chain, named via `ALKYL_PREFIXES`); if that fails because the start atom branches into two further carbons, it checks whether both are terminal methyls and, if so, returns `{ name: 'isopropyl', atoms }`. Anything else (longer branches, further branching, non-carbon atoms) still returns `null`. This is currently wired into `matchEthylamineChain`'s alpha-branch disambiguation directly, and into its nitrogen-substituent loop via `resolveAminoSubstituent` (see below); `matchAmphetamineChain`'s own nitrogen loop still calls `collectBranch`/`ALKYL_PREFIXES` directly and was left unchanged.
- **`resolveBenzylBranch(graph, adjacency, startId, fromId)`** (`naming-core.js`, next to `resolveAlkylBranch`) resolves an N-benzyl-type substituent — `startId` must be a plain `-CH2-` single-bonded to `fromId` (the amine nitrogen) and to exactly one other carbon (`ipso`). It walks the whole connected component hanging off `ipso` (excluding `startId`) via the new `collectComponentExcluding` BFS helper, trims it to a 6-membered ring with `trimToRing`/`orderRing` (requiring all-carbon and aromatic via `hasAlternatingOrders`), then tries both ring directions from `ipso` (locant 1) through `collectCoreAttachments` to find the lowest-locant single ring substituent (methoxy, fluoro, etc. — anything `collectCoreAttachments` already classifies; hydroxyl/carbonyl/amine/thiol/nitrile substituents on the ring are rejected). Returns `{ name, atoms }` where `name` is `'benzyl'` (unsubstituted) or e.g. `'(2-methoxybenzyl)'`/`'(2-fluorobenzyl)'` (parenthesized whenever the ring carries a locant-bearing prefix, matching real nomenclature), and `atoms` includes the CH2 plus every atom of the ring component. `resolveAminoSubstituent(graph, adjacency, startId, fromId)` is the thin combinator (`resolveAlkylBranch(...) || resolveBenzylBranch(...)`) used in `matchEthylamineChain`'s nitrogen-substituent loop, so any phenethylamine/tryptamine/benzofuran/benzodifuran scaffold whose amine nitrogen carries an N-benzyl-type group is recognized automatically through the existing chain matchers — no scaffold-specific code needed. `matchAmphetamineChain`'s nitrogen loop is unchanged (NBOMe-type compounds are phenethylamine-tier, not amphetamine-tier, in every real example).
- **Pendant-ring dispatch fix (`findPendantBenzylAtoms`, `deriveName`, `js/naming-core.js`).** Before this, `deriveName`'s top-level dispatch picked a naming tier purely from `bonds.length - atomIds.length` over the *entire* molecule, which breaks the moment a molecule contains two independent ring systems joined only by a chain (e.g. an NBOMe compound: a 2C-x benzene ring plus a separate N-benzyl benzene ring) — the extra ring adds +1 to the whole-molecule cyclomatic number, so a plain single-ring phenethylamine was being misrouted into the fused/bicyclic tier and failing to name at all, even though `matchEthylamineChain`/`resolveBenzylBranch` could already correctly consume the pendant ring once reached. `findPendantBenzylAtoms(graph, atomIds, bonds)` finds every amine nitrogen, tries `resolveBenzylBranch` on each of its single-bonded neighbours, and unions the `.atoms` of every match into an `excluded` set. `deriveName` computes this once, derives `coreAtomIds`/`coreBonds` with those atoms and their bonds removed, and uses *that* pair's length difference to choose the ring/fused/tricyclic/tetracyclic branch — but still calls the chosen `derive*Name` function with the original, full `atomIds`/`bonds` (unchanged), since the substituent-walking machinery inside those functions needs the whole molecule. `deriveRingName` (`js/naming-ring.js`) gained two optional trailing parameters, `ringAtomIds`/`ringBonds`, defaulting to `atomIds`/`bonds` when omitted (so its only other caller-shape, direct dispatch with no pendant ring, is byte-for-byte unchanged) — when provided, `trimToRing` runs on the core-only pair instead of the full molecule, so it correctly isolates just the 2C-x ring even with a same-sized pendant ring elsewhere in the graph, while `nameForRing`/`buildAdjacency` still see the full molecule for substituent consumption. Only the single-ring (`deriveRingName`) tier was wired with this core/pendant split so far — `deriveFusedName`/`deriveTricyclicName`/`deriveTetracyclicName` still receive full `atomIds`/`bonds` unchanged and would have the same trim-confusion if a pendant benzyl ring were ever combined with an indole/benzofuran/benzodifuran core (e.g. a hypothetical NBOMe-tryptamine hybrid) — not fixed since no real compound in the target list needs it yet.
- **`buildNitrogenPrefix(names)`** (in `js/naming-core.js`, with the other shared assembly helpers) renders the N-substituent list: `''` for none, `N-methyl` for one, `N,N-dimethyl` for two identical, `N-ethyl-N-methyl` (alphabetized) for two different.
- **Indole / tryptamine** (`deriveFusedName`, cyclomatic number 2). `extractFusedCore` leaf-trims to the ring core and demands exactly 9 core atoms and 10 core bonds, exactly two atoms of degree 3 with every other core atom at degree 2, exactly one bond between the two degree-3 atoms, and a single 9-atom perimeter cycle once that shared bond is removed — which rules out spiro and bridged shapes. The perimeter is split at the fusion atoms into arcs of 3 and 4 interior atoms, giving the 5- and 6-membered halves. Elements are then checked (the four non-fusion six-ring atoms and both fusion atoms carbon; the three non-fusion five-ring atoms exactly one nitrogen and two carbons), and the Kekulé pattern is verified against indole: `N1-C2` single, `C2=C3` double, `C3-C3a` single, the fusion bond `C3a=C7a` double, `C7a-N1` single, plus `hasAlternatingOrders` over the six-ring cycle `C3a, C4, C5, C6, C7, C7a`. Because a drawing can be mirrored, both orientations of the five-ring walk (nitrogen at either end of the five-ring arc) are tried and the first that matches supplies the labelling; locants come out identical either way.
- **Indole naming.** Substituents are classified at N1, C2, C4, C5, C6 and C7 with the shared classifier at indole's fixed locants (1, 2, 4–7); the two fusion carbons must carry nothing. If `matchEthylamineChain` matches at C3 the name is `[ring prefixes][N prefixes]tryptamine` (`5-methoxy-N,N-dimethyltryptamine`, `N-methyltryptamine`, bare `tryptamine`); otherwise C3 is classified as an ordinary substituent at locant 3 and the name is `[ring prefixes]indole` (`3-methylindole`, `5-methoxyindole`, bare `indole`). Ring locants are always printed. Anything else at C3, or an unsupported branch anywhere, falls back to the formula.
- **Phenethylamine** (`namePhenethylamine`, called from `nameForRing` in `js/naming-ring.js`) is tried inside the aromatic benzene path, before the generic substituent naming. If exactly one ring carbon matches `matchEthylamineChain` and every other ring carbon carries only supported substituents, the name is `[ring prefixes][N prefixes]phenethylamine` with the side-chain carbon pinned at locant 1 via `chooseRingNumbering`'s `anchorIndex` (`4-methoxyphenethylamine`, `N-methylphenethylamine`, bare `phenethylamine`). Two matching chains, or one match with an unsupported ring substituent, deliberately fall back to the formula instead of dropping into the generic path. When no ring carbon matches at all, the generic benzene naming runs completely unchanged.
- **Quinoline / isoquinoline** (`nameQuinolineFamily`, tried inside `deriveFusedName` right after `nameNaphthalene` on the same 10-atom/11-bond core `extractNaphthaleneCore` isolates, whenever `nameNaphthalene` itself bails because a core atom isn't carbon). Requires both fusion atoms to be carbon and exactly one of the eight non-fusion atoms to be nitrogen (everything else carbon), both six-rings Kekulé-alternating, and both fusion carbons substituent-free — otherwise identical gating to naphthalene. Reuses `naphthaleneLocantOrders`' four symmetry-equivalent numberings, but the selection key now puts the nitrogen's own locant first (ahead of substituent locants), matching the IUPAC rule that heteroatoms get the lowest available locant before substituents are considered. Since the nitrogen sits in a 4-atom arc between two fusion carbons, that lowest achievable locant is always exactly 1 (nitrogen touching a fusion carbon) or 2 (nitrogen one position in) — never anything else — so the parent name is chosen directly from that locant: 1 gives `quinoline`, 2 gives `isoquinoline`. Like naphthalene, there is no principal-suffix handling; substituents are always prefixes on the bare parent (`6-methoxyquinoline`, `quinoline`, `isoquinoline`), and an exocyclic `C=O` or any element besides one ring nitrogen among the eight non-fusion positions falls back to the formula.
- **Naphthalene-fused phenethylamine/amphetamine** (`nameNaphthalenePhenethylamine`, tried inside `deriveFusedName` on the same 10-atom/11-bond `extractNaphthaleneCore` core, before the plain `nameNaphthalene` call). Requires all 10 core atoms carbon (unlike the quinoline path) and both six-rings Kekulé-alternating via `isNaphthalenoidAromatic`, with both fusion carbons substituent-free. Tries `matchAmphetamineChain`/`matchEthylamineChain` at each of the eight non-fusion positions (`core.arcOne.concat(core.arcTwo)`); exactly one match is required (zero falls through to `nameNaphthalene`/`nameQuinolineFamily` unchanged, more than one bails to `null` so the generic `collectCoreAttachments` path in `nameNaphthalene` picks it up as two ordinary `(2-aminoethyl)`-style substituent branches instead — see below). The matched chain is folded in as a `(2-<amino>ethyl)`/`(2-<amino>propyl)` bracketed substituent (not a `phenethylamine`/`amphetamine` suffix parent, matching the convention `nameBenzofuranScaffold` already uses for its fused-ring case), competing on equal footing with every other ring substituent for the lowest-locants numbering across all four of `naphthaleneLocantOrders`' symmetry-equivalent orderings — this differs from `namePhenethylamine`'s plain-benzene case, which always pins the chain to locant 1 via `anchorIndex` instead of letting it compete, because a fused bicyclic has no such single canonical "substituent goes to 1" convention. The parent name is always `naphthalene` (no `phenethylamine`/`amphetamine`-suffix form exists for the fused-ring case). Verified against a hand-built naphthalene core with a `-CH2-CH2-NH2` chain on one arc position: `1-(2-aminoethyl)naphthalene`, its N,N-dimethyl homolog `1-(2-(dimethylamino)ethyl)naphthalene`, and a two-chain variant that correctly falls through to the generic path as `1,6-bis(2-aminoethyl)naphthalene`; also confirmed zero regression on plain `naphthalene` and `quinoline` structures with no chain. No real named compound was keyed into `COMMON_NAMES` for this since none of the target list's exotic bioisosteres use a plain naphthalene (as opposed to benzodifuran/benzofuran) core.
- **Methylenedioxyphenethylamine / methylenedioxyamphetamine** (`nameMethylenedioxyScaffold`, tried inside `deriveFusedName` right after the indole check, on the same 9-atom/10-bond fused core `extractFusedCore` already isolates). Where indole requires the five-ring arc to be one nitrogen and two carbons, this scaffold requires it to be exactly `O, C, O` (an unsubstituted methylenedioxy bridge — all three bridge atoms must carry zero off-core neighbours) and the six-ring arc plus both fusion carbons to form an alternating (Kekulé) benzene ring with the fusion carbons themselves also bearing zero off-core substituents. Exactly one of the four non-fusion benzo carbons must then match `matchAmphetamineChain` (the aminopropyl side chain, alpha–beta–methyl/nitrogen) or, failing that, `matchEthylamineChain` (the plain aminoethyl side chain) — zero or multiple matches falls back to the formula. Ring numbering treats the two fusion carbons as a pair of dummy locants fed into `chooseRingNumbering` alongside any real substituents, with the side-chain carbon pinned to locant 1 via `anchorIndex`; this reuses the same lowest-locant search as every other ring path to decide, from the side chain's position, whether the bridge prints as `3,4-`, `2,3-`, or any other adjacent locant pair. The name is `[bridge locants]-methylenedioxy` plus any other ring-substituent prefixes (alphabetized together), then `[N prefixes]`, then `amphetamine` or `phenethylamine` — giving MDMA as `3,4-methylenedioxy-N-methylamphetamine`, MDA as `3,4-methylenedioxyamphetamine`, and MDMA's N,N-dimethyl homolog as `3,4-methylenedioxy-N,N-dimethylphenethylamine`. A bare, unsubstituted benzodioxole (no side chain at all) is not named by this scaffold and falls back to the formula, since with zero side-chain matches there is nothing to anchor the numbering to.
- **Alkoxy (ether) prefixes.** `collectCoreAttachments`, `classifyAlkoxy` and `scaffoldSubstituentEntries` all live in `js/naming-core.js` because every tier uses them. `collectCoreAttachments` takes an optional `allowAlkoxy` flag. With it set, an O that `classifyAttachment` rejects is retried by `classifyAlkoxy`: a single-bonded O of degree 2 whose other neighbour is an unbranched 1–4 carbon alkyl becomes the prefix `NAME_ROOTS[n] + 'oxy'` (`methoxy`, `ethoxy`, `propoxy`, `butoxy`). The flag is now passed by all four callers — the two scaffold paths plus `nameForChain` and `nameForRing` — so ethers are available as prefixes on plain chains and on every ring the ring path handles, benzene included (`1-methoxypropane`, `1-methoxycyclohexane`, `methoxybenzene`). The alkoxy branch is a prefix only and never competes for the suffix, and its whole O + alkyl tail is added to `visited` so the component-coverage check still accounts for it. `scaffoldSubstituentEntries` then flattens the accumulator for these suffix-less parents: `-OH` and `-NH2` become the prefixes `hydroxy` and `amino`, and an exocyclic `C=O` rejects outright.

- **Ergoline / lysergamide** (`extractErgolineCore` + `nameErgoline`, dispatched from `deriveTetracyclicName`, cyclomatic number 4). Unlike every other fused scaffold here, the four rings do not form a simple linear/angular chain of fusion bonds — ring D (the sp3 six-ring carrying N6) fuses onto the indole system at the pyrrole-ring's `C3`/`C3a` edge, immediately adjacent to where the benzo ring also fuses at `C3a`/`C7a`, so `C3a` ends up bonded to three other degree-3 atoms at once (a triple ring junction, not a simple hinge). `extractErgolineCore` leaf-trims to a core of exactly 16 atoms / 19 bonds with exactly 6 degree-3 atoms, finds the unique "hub" atom whose three neighbours are all themselves degree-3 (that triple junction), then walks outward from each of the hub's three neighbours along their non-hub bonds until hitting the next degree-3 atom. Exactly one neighbour ("n2") has both of its walks land back on the other two hub-neighbours (chain length 2 = the pyrrole side, "n1"; chain length 3 = the benzo side, "n3"); n1 and n3 each have one further walk landing on a new degree-3 atom outside the hub triangle, and those two new atoms (the ring-D/ring-C fusion pair) must be directly bonded, with the remaining four-atom walk between them closing ring C. `nameErgoline` then checks elements (one N in the pyrrole chain, one N as N6), aromaticity (`hasFuranPattern` on the pyrrole ring, `hasAlternatingOrders` on the benzo ring), explicit single/double bond orders around the non-aromatic rings C and D (including the C9=C10 alkene), and requires every ring position to be unsubstituted except N6 (0 or 1 plain alkyl branch) and C8 (exactly one substituent, which must be a carbon bonded to `=O` and to a nitrogen carrying two identical alkyl branches — a symmetric `N,N-dialkyl` carboxamide, checked ad hoc via `collectBranch` rather than through `collectCoreAttachments`, since the amide carbon is not itself a ring position). The output is always `[6-<alkyl>-|nor]N,N-di<alkyl>lysergamide` (e.g. `6-methyl-N,N-diethyllysergamide`); asymmetric amides, ring substituents elsewhere, and N1-acylation (prodrug esters) are all out of scope and fall back to the formula. Update, later session: generalized to also cover lysergol (`-CH2OH` at C8 instead of the carboxamide). Before the existing amide-path checks (`carbonylNeighbors.length !== 2` etc.), a new early branch checks whether the C8 substituent carbon's only other neighbor (besides C8) is a terminal, singly-bonded oxygen (`(adjacency.get(oxygenId) || []).length === 1`); if so, the function returns `[6-<alkyl>-|nor]lysergol` directly, reusing the already-computed `n6Prefix`, without touching the amide path at all. This required zero changes to `extractErgolineCore` or any of the ring/aromaticity validation above it — only the terminal substituent-classification step needed a second branch. Verified against a hand-built graph identical to the passing LSD test except the C8 amide (`-C(=O)-N(Et)2`) is replaced with a plain `-CH2-OH`; produces `6-methyl-lysergol`, keyed to `lysergol` in `COMMON_NAMES`. LSD's own test was rerun unchanged and still passes, confirming the new branch doesn't interfere with the amide path. Update, later session: ergometrine and methylergometrine are now also supported. These are secondary (mono-substituted) amides rather than LSD's symmetric N,N-dialkyl tertiary amide, so `amideBranches.length === 1` is now checked before the existing `!== 2` rejection; that single branch is handed to a new helper, `resolveAminoAlcoholSubstituent` (`js/naming-core.js`), which matches an attachment carbon bearing exactly one `-CH2-OH` branch (terminal, singly-bonded O) plus either one or two terminal methyl branches (no other shapes accepted), and returns the literal substituent name `1-hydroxypropan-2-yl` (one methyl — ergometrine's 2-aminopropan-1-ol-derived group) or `1-hydroxy-2-methylpropan-2-yl` (two methyls — methylergometrine's 2-amino-2-methylpropan-1-ol-derived group); these are hardcoded literals rather than a general branched-substituent namer, matching this project's established pattern of ad hoc validators for specific real-world shapes (like `nameTetrahydrocarbazole` or `resolveOxazolidinonylMethylBranch`) rather than building general IUPAC branch-numbering machinery. The output format for the mono-substituted case is `[6-<alkyl>-|nor]N-(<substituent>)lysergamide`. Verified against hand-built graphs (the same ergoline core as the LSD/lysergol tests, with the C8 substituent being `-C(=O)-NH-CH(CH3)-CH2OH` for ergometrine and `-C(=O)-NH-C(CH3)2-CH2OH` for methylergometrine): produced `6-methyl-N-(1-hydroxypropan-2-yl)lysergamide` and `6-methyl-N-(1-hydroxy-2-methylpropan-2-yl)lysergamide` respectively, both correct and distinct on the first run, now keyed to `ergometrine`/`methylergometrine`. LSD's and lysergol's existing tests were rerun unchanged and still pass. Update, later session: methysergide is now also supported, closing out the full ergoline/lysergamide family attempted this segment. Two further changes were needed: (1) `resolveAminoAlcoholSubstituent` was generalized from a methyl-only "other branch" to accept any straight-chain branch via `collectBranch`, choosing the longest branch as the main chain continuation and requiring any remaining branch(es) to be a single methyl (the `2-methyl-` case, unchanged for methylergometrine); the produced name is `1-hydroxy<[2-methyl-]><NAME_ROOTS[totalLength]>an-2-yl`, which for methysergide's `-NH-CH(CH2OH)(CH2CH3)` amine gives `1-hydroxybutan-2-yl` (verified correct against the real compound's published IUPAC substituent name) while still reproducing the pre-existing `1-hydroxypropan-2-yl`/`1-hydroxy-2-methylpropan-2-yl` strings unchanged. (2) The indole nitrogen (`pyrroleChain[0]`, pulled out of the `sealedAtoms` blanket-reject list into its own `indoleNExternal`/`indoleNName` check mirroring the existing N6 handling) can now carry 0 or 1 plain alkyl substituent; a new `ergolinePrefix` builder replaces the three separate inline `n6Prefix`/`n6PrefixAlcohol`/`n6PrefixAmino` locals and combines both ring-nitrogen substituents into one prefix, collapsing to `1,6-di<alkyl>-` when both substituents are identical (methysergide's real case: both are methyl) or listing them separately (`1-<indoleNName>-6-<n6Name>-`) otherwise. Verified against a hand-built graph (the same ergoline core as the other tests, with both an N6-methyl and an indole-N-methyl, plus the same butanolamide C8 substituent as above): produces `1,6-dimethyl-N-(1-hydroxybutan-2-yl)lysergamide`, correct on the first real run, keyed to `methysergide`. All prior ergoline-family tests (LSD, lysergol, ergometrine, methylergometrine) were rerun and still pass unchanged. This closes out every ergoline/lysergamide-family compound identified in the original taxonomy. Update, later session: per a follow-up request to extend lysergamide coverage further ("get lysergamides all working"), three more real compounds were verified. ETH-LAD (`6-ethyl-N,N-diethyllysergamide`) and PRO-LAD (`6-methyl-N,N-dipropyllysergamide`) required **zero source changes** — the existing symmetric-N,N-dialkyl-amide path already generalizes over N6 chain length (via the pre-existing `n6Name`/`collectBranch` machinery) and amide branch length (via `ALKYL_PREFIXES`/`collectBranch` on each amide branch), so both were confirmed correct on the first test run and simply keyed into `COMMON_NAMES`. LSA/ergine (the plain unsubstituted primary carboxamide, `-C(=O)-NH2`) needed one new early branch: `if (amideBranches.length === 0) { return ergolinePrefix + 'lysergamide'; }`, inserted immediately before the existing `amideBranches.length === 1` check in `nameErgoline`, producing `6-methyl-lysergamide`. Verified against hand-built graphs (the same ergoline core as the LSD test, varying only N6 chain length and the amide's terminal branches) via a shared `buildCore(g, n6BranchLength)` test helper; all three new outputs confirmed correct, and the full existing ergoline/lysergamide regression set (LSD, lysergol, ergometrine, methylergometrine, methysergide) was rerun and still passes. Remaining known lysergamide-family gaps, not yet implemented: AL-LAD (N6-allyl, needs a new branch resolver since `collectBranch` rejects the C=C double bond), 1P-LSD/ALD-52 (N1-acyl on the indole nitrogen, needs a resolver accepting a carbonyl branch since `collectBranch` rejects C=O), and LSZ (N,N-azetidide, a cyclic amide where both amide-nitrogen branches close into a 4-membered ring — the hardest case, since a per-branch `collectBranch` walk cannot handle a ring closing back through the nitrogen itself). Update, later session: AL-LAD and the acyl-substituted variants (1P-LSD, ALD-52) are now also supported. Two new standalone helpers were added to `js/naming-core.js`, next to `resolveAlkylBranch`: `resolveAllylBranch(graph, adjacency, startId, fromId)` matches the exact 3-carbon `-CH2-CH=CH2` shape (single bond to a CH2, then a double bond to a terminal CH2) and returns `{ name: 'allyl', atoms }`; `resolveAcylBranch(graph, adjacency, startId, fromId)` matches a carbon bearing one double-bonded terminal oxygen plus zero or one single-bonded alkyl continuation (via `collectBranch`), returning `{ name, atoms }` where `name` is looked up from a new `ACYL_PREFIXES` array (`['', 'formyl', 'acetyl', 'propionyl', 'butyryl', 'valeryl']`, indexed by `branch.length + 1` to account for the carbonyl carbon itself). Both are wired into `nameErgoline` (`js/naming-scaffolds.js`) as *fallbacks* tried only when the existing `collectBranch`-based path returns `null`: the N6-substituent resolution now tries `collectBranch` first (plain alkyl, unchanged for every existing case) and falls back to `resolveAllylBranch` for AL-LAD's N6-allyl; the indole-N-substituent resolution likewise tries `collectBranch` first and falls back to `resolveAcylBranch` for 1P-LSD's N1-propionyl and ALD-52's N1-acetyl. Because both are strictly fallback branches gated behind the pre-existing check failing first, no prior behavior changes — every previously-passing test (LSD, lysergol, ergometrine, methylergometrine, methysergide, ETH-LAD, PRO-LAD, LSA) was rerun and still passes unchanged. Verified against hand-built graphs: AL-LAD (N6-allyl + N,N-diethylamide) produces `6-allyl-N,N-diethyllysergamide`; 1P-LSD (N6-methyl + N1-propionyl + N,N-diethylamide) produces `1-propionyl-6-methyl-N,N-diethyllysergamide`; ALD-52 (N6-methyl + N1-acetyl + N,N-diethylamide) produces `1-acetyl-6-methyl-N,N-diethyllysergamide` — all three now keyed in `COMMON_NAMES`. Update, later session: LSZ (the N,N-2,4-dimethylazetidide cyclic amide) is now also supported, closing out every lysergamide-family compound identified across this whole multi-session effort. This was the hardest remaining case because the amide nitrogen's two "branches" are not independent chains — they are the two ring bonds of a 4-membered azetidine ring (N-C2(-CH3)-C3-C4(-CH3)-back to N), so a per-branch `collectBranch` walk on either one eventually reaches back around to the amide nitrogen itself, hits the element check (`!== 'C'`), and fails. Two changes were needed. (1) A new `resolveAzetidideRing(graph, adjacency, amideNitrogenId, branchAId, branchBId)` helper (`js/naming-core.js`, next to `resolveAcylBranch`) detects this exact shape directly rather than trying to walk it as a chain: it finds the ring's third carbon (`mid`, C3) as the common neighbor shared by both of the amide nitrogen's direct ring neighbors (C2 and C4), confirms `mid` has no other neighbors (a plain -CH2- ring position), then checks each of C2/C4's one remaining neighbor (beyond the amide N and `mid`): zero on both sides yields plain `azetidide`, or exactly one terminal methyl on each side (LSZ's real case) yields the literal `2,4-dimethylazetidide`. It returns `{ name, atoms }`, with `atoms` covering the full ring-plus-substituents so callers can exclude them from cyclomatic-number bookkeeping (see next point). `nameErgoline`'s amide-branches-length-2 handling was restructured to try the existing symmetric-dialkyl path first and fall back to `resolveAzetidideRing` only if that fails (mirroring the AL-LAD/1P-LSD fallback pattern), so no prior dialkyl-amide behavior changed. (2) A subtler, structural fix was required first: unlike ETH-LAD/PRO-LAD/AL-LAD (which only lengthen an open chain), LSZ's azetidine ring is a genuine *second, independent ring* elsewhere in the molecule, so the whole molecule's cyclomatic number becomes 5, not 4 — meaning `deriveName`'s top-level `bonds.length === atomIds.length + 3` dispatch check (which decides "this is a tetracyclic/ergoline-tier shape") was failing before `nameErgoline` was ever reached, silently falling through to the formula fallback with no error. This is the same class of problem the pre-existing `findPendantRingAtoms`/pendant-benzyl exclusion pass was built to solve for other tiers, but that pass only recognizes ring shapes reached via a single bridging atom from a chain (benzyl, triazolyl, sulfonamide, etc.) — not a ring formed directly by both branches of an amide nitrogen. A new sibling pre-pass, `findAzetidideRingAtoms(graph, atomIds, bonds)`, scans every nitrogen atom's neighbor pairs for the `resolveAzetidideRing` shape and unions its matched atoms into the same `pendantAtoms` exclusion set inside `deriveName`, so the tier-selection cyclomatic count correctly treats the azetidide ring as a substituent rather than part of the core count. Because `deriveTetracyclicName` previously received the *unfiltered* `atomIds`/`bonds` and re-derived its own core via `extractErgolineCore(atomIds, bonds)` (unlike `deriveFusedName`, which already receives pre-filtered `coreAtomIds`/`coreBonds`), the pendant azetidine ring's atoms — none of which are leaves, so `extractErgolineCore`'s own leaf-trim can't remove them — were corrupting its degree-3-atom-count-based extraction even after the tier dispatch was fixed; `deriveName`'s call site and `deriveTetracyclicName`'s signature were both updated to also pass `coreAtomIds`/`coreBonds` through (`extractErgolineCore(coreAtomIds || atomIds, coreBonds || bonds)`) so extraction runs on the pendant-free core while `nameErgoline` itself still receives the full unfiltered `atomIds`/`bonds` for adjacency (needed to resolve substituents including the azetidide ring). Verified against hand-built graphs: LSZ (N6-methyl + N1-H + C8-azetidide-with-2,4-dimethyl) produces `6-methyl-2,4-dimethylazetidide`, now keyed to `LSZ`; a plain unsubstituted azetidide variant was also verified (produces `6-methyl-azetidide`, not keyed to any common name since it isn't a named real-world research chemical). The full prior lysergamide/ergoline regression set (LSD, lysergol, ergometrine, methylergometrine, methysergide, ETH-LAD, PRO-LAD, LSA, AL-LAD, 1P-LSD, ALD-52) was rerun and still passes unchanged. This closes out the "get lysergamides all working" request in full.

- **Benzofuran / APB-MAPB family** (`benzofuranOrientations` + `nameBenzofuranScaffold`, dispatched from `deriveFusedName` alongside indole and methylenedioxy, since it reuses the same indole-shaped 9-atom/10-bond `extractFusedCore` core). The distinguishing structural check is the `fiveArc` element pattern: `O, C, C` (a furan-type oxygen fused to two aromatic carbons via a `C2=C3` double bond and an alternating `C3a=C7a`/benzo ring) rather than indole's `N, C, C` or methylenedioxy's `O, C, O`. Unlike tryptamine, the amine side chain does not sit on the five-ring — real APB/MAPB compounds carry it on the benzo ring — so `nameBenzofuranScaffold` reuses `matchAmphetamineChain`/`matchEthylamineChain` against the four free `sixArc` positions (locants 4-7) exactly the way `nameMethylenedioxyScaffold` does, requires exactly one match, and forbids any substituent on the two fusion carbons. The amine branch itself is assembled inline as a substituent name (`(2-aminopropyl)`, `(2-methylaminopropyl)`, etc., built from `anchor.match.substituents` the same alkyl-prefix list `matchAmphetamineChain` already returns) and folded into the ring's `assembleSubstituentPrefix` call as one more locant/name pair, rather than using the amphetamine/phenethylamine suffix convention the other ring-chain scaffolds use — this was a deliberate departure, chosen because the real common names for this family (`5-APB`, `6-APB`, `5-MAPB`, `6-MAPB`) are conventionally written as substituted benzofurans, not as "benzofuranylamphetamines". Any other combination (ring substituents at 2/3, more than one chain match, disubstituted asymmetric amine) falls back to the formula. `benzofuranOrientations` and `nameBenzofuranScaffold` both take the ring heteroatom/name as parameters now (`heteroElement` defaulting to `'O'`, `ringName` defaulting to `'benzofuran'`) so `deriveFusedName` can also try `heteroElement: 'S'`/`ringName: 'benzothiophene'` against the same `extractFusedCore` shape after the oxygen attempt fails — this is how 5-MAPBT/6-MAPBT (the benzothiophene analogues of 5-MAPB/6-MAPB) are recognized, with no other code changes since the whole match/assemble pipeline was already element-agnostic past that one check.
- **`resolveSulfamoylMethylBranch(graph, adjacency, startId, fromId)`** (`naming-core.js`, next to `resolveBenzylBranch`) resolves the `-CH2-SO2-NR2` group behind sumatriptan-type triptans: `startId` must be a carbon single-bonded to `fromId` and to exactly one sulfur; that sulfur must have exactly three other neighbours — exactly two double-bonded terminal oxygens and exactly one single-bonded nitrogen (anything else, e.g. wrong bond orders or extra substituents on the oxygens, returns `null`); the nitrogen may carry 0–2 further single-bonded substituents, each resolved via `resolveAlkylBranch` (not the wider `resolveAminoSubstituent`, since a benzyl group on a sulfonamide nitrogen isn't a case any real compound in the target list needs yet). The N-substituent name(s) are assembled with the existing `buildNitrogenPrefix` amine-prefix convention (`''`/`'N-methyl'`/`'N,N-dimethyl'`/etc.) — reused as-is for sulfonamide N-substitution, which happens to follow the identical nomenclature pattern. Returns `{ name, atoms }` where `name` is `'sulfamoylmethyl'` (unsubstituted) or e.g. `'(N-methylsulfamoyl)methyl'`. `resolveRingAlkylSubstituent(graph, adjacency, startId, fromId)` is the combinator (`resolveAlkylBranch(...) || resolveSulfamoylMethylBranch(...)`) that replaces the old direct `collectBranch`/`ALKYL_PREFIXES` call inside `collectCoreAttachments`'s `'alkyl'`-role branch — since that function is the single shared choke-point used by every ring/scaffold recognizer (`namePhenethylamine`, `nameIndole`, `nameNaphthalene`, `nameQuinolineFamily`, `nameCarboline`, `nameHeterocycle`, `nameAromaticRing`, the cycloalkane path in `nameForRing`, `nameMethylenedioxyScaffold`, `nameBenzofuranScaffold`, `nameDifuranScaffold`), this one change makes the sulfamoylmethyl group recognizable as an ordinary ring substituent anywhere a plain alkyl substituent was already accepted, with zero risk of behavior change elsewhere: `resolveAlkylBranch` (tried first) exactly replicates every prior case, so only genuinely new shapes reach the new branch. This is a deliberate departure from true IUPAC nomenclature, which would make the sulfonamide the parent (`...methanesulfonamide`) and fold the indolyl in as a substituent — but per this project's existing convention (see the benzofuran/APB-MAPB precedent) the recognized ring/scaffold always stays the parent, and since `COMMON_NAMES` only needs an exact-string match against whatever `deriveName` deterministically emits, this smaller and lower-risk addition suffices without building a "chain-is-parent, ring-is-substituent" reversal.

- **`resolveTriazolylMethylBranch(graph, adjacency, startId, fromId)`** (`naming-core.js`, next to `resolveSulfamoylMethylBranch`) resolves rizatriptan's `-CH2-(1,2,4-triazol-1-yl)` group: `startId` a carbon single-bonded to `fromId` and to exactly one nitrogen (`n1`, the triazole's attachment nitrogen); the component hanging off `n1` (via `collectComponentExcluding`) must be exactly 5 atoms with 3 nitrogens and 2 carbons (no substituents tolerated — real rizatriptan's triazole is bare, and this recognizer deliberately doesn't support a substituted variant); the ring's Kekulé pattern from `n1` is checked with `hasFuranPattern` (identical single/double/single/double/single alternation the pyrrole/furan check already encodes, since 1H-1,2,4-triazole is aromatic the same way). Because 1,2,4-triazole's own connectivity is symmetric between what a chemist would call N1 vs N2, no orientation search is needed — either mixed-neighbor nitrogen the CH2 could be attached to produces an isomorphic graph, so whichever one is actually bonded is named "1,2,4-triazol-1-yl" by convention. Returns `{ name: '(1,2,4-triazol-1-yl)methyl', atoms }`. Added to the `resolveRingAlkylSubstituent` combinator alongside `resolveAlkylBranch`/`resolveSulfamoylMethylBranch`.
- **Pendant-ring dispatch, generalized (`findPendantRingAtoms`, was `findPendantBenzylAtoms`).** Rizatriptan exposed the same dispatch bug the NBOMe work fixed for `deriveRingName`, but one level up: the pendant triazole ring in rizatriptan hangs off an aromatic ring carbon (indole C5) via a plain `-CH2-`, not off an amine nitrogen the way NBOMe's benzyl group does, and the tryptamine core itself is already a *fused* bicyclic (indole), so the miscounted cyclomatic number was misrouting `deriveFusedName` (not `deriveRingName`) into the tricyclic tier. Fixed in two parts: (1) `findPendantBenzylAtoms` was renamed `findPendantRingAtoms` and generalized to iterate every atom (not just nitrogens) as a candidate `fromId`, trying `resolveBenzylBranch` only when that atom is nitrogen (preserving the original NBOMe behavior exactly) and unconditionally trying `resolveTriazolylMethylBranch` on every single-bonded neighbor of every atom; (2) `extractFusedCore`/`deriveFusedName` (`naming-scaffolds.js`) each gained the same optional trailing `coreAtomIds`/`coreBonds` parameter pair `deriveRingName` got in the NBOMe fix, defaulting to `atomIds`/`bonds` when omitted so every pre-existing call site (all of which omit them) is byte-for-byte unchanged; `deriveName`'s fused-tier branch now passes its already-computed `coreAtomIds`/`coreBonds` through. `deriveTricyclicName`/`deriveTetracyclicName` were left unfixed, per the same "no real compound needs it yet" reasoning as before.

- **`resolveSaturatedAzacycleAt(graph, adjacency, nitrogenId, fromId)`** (`naming-core.js`, next to `resolveTriazolylMethylBranch`) resolves almotriptan's pyrrolidine ring: given a nitrogen and the one neighbor already consumed elsewhere (`fromId`, e.g. the sulfonyl sulfur), checks that its other two neighbors are both single-bonded carbons, walks the connected component off one of them (excluding the nitrogen) via `collectComponentExcluding`, and requires the other neighbor to be inside that same component (i.e. the two "arms" reconnect into one ring), all-carbon, fully saturated (`cycleBondOrders`/`orderRing` all single bonds). Ring size maps through `SATURATED_AZACYCLE_NAMES` (`{5: 'pyrrolidin-1-yl', 6: 'piperidin-1-yl'}`) to a name; other sizes are rejected. `resolveSulfamoylMethylBranch` now tries this first (before its existing per-branch `resolveAlkylBranch`+`buildNitrogenPrefix` loop) whenever the sulfonamide nitrogen's two substituents might close into a ring, producing e.g. `'(pyrrolidin-1-ylsulfonyl)methyl'` instead of the `N,N-di<alkyl>sulfamoyl` form; the two paths are mutually exclusive by construction (a bare `resolveAlkylBranch` call on a ring-closing carbon fails, since `collectBranch` can't walk an unbranched path back into a cycle), so no case is matched twice.
- **`walkToSulfonylChain(graph, adjacency, startId, fromId, maxChain)`** (`naming-core.js`) generalizes the sumatriptan/almotriptan single-CH2-then-sulfonyl assumption to a 1-or-2-carbon chain before the sulfur (needed for naratriptan's ethanesulfonamide vs. sumatriptan's methanesulfonamide): walks up to `maxChain` carbons, requiring each to be single-bonded and unbranched, and returns `{ sulfur, chainAtoms }` on hitting a sulfur, or `null` if the chain runs out first. `resolveSulfamoylMethylBranch` now calls this (with `maxChain=2`) instead of a hardcoded one-hop check, and derives its `methyl`/`ethyl` suffix from `ALKYL_PREFIXES[chainAtoms.length]` — chain length 1 reproduces the prior sumatriptan/almotriptan behavior exactly, verified via full regression.
- **`resolvePiperidin4ylBranch(graph, adjacency, startId, fromId)`** (`naming-core.js`, just before `resolveSulfamoylMethylBranch`) resolves naratriptan's piperidin-4-yl substituent: the entry carbon's two other neighbors must be single-bonded carbons; walks the connected component off one of them (`collectComponentExcluding`), then — critically — runs it through **`trimToRing`** (not a bare size check on the raw component) before ordering the ring, because the raw BFS component includes any pendant substituent hanging off a ring atom (e.g. naratriptan's N-methyl on the piperidine nitrogen), which `trimToRing`'s repeated degree-<2-leaf-pruning strips away to leave exactly the 6-membered ring. Requires all-carbon/all-single-bond ring except the atom three positions around from the attachment point (`ring[(startIndex+3)%6]`), which must be nitrogen; that nitrogen may carry at most one extra substituent, resolved via `resolveAlkylBranch` and prefixed as `1-<alkyl>` (e.g. `(1-methylpiperidin-4-yl)`). Wired into both `resolveRingAlkylSubstituent` and `findPendantRingAtoms`.
  - **Bug this uncovered / fixed**: using the raw `collectComponentExcluding` result directly (as `resolveSaturatedAzacycleAt` and `resolveTriazolylMethylBranch` do, safely, only because those rings happen to be unsubstituted in every compound built so far) silently pulled in off-ring substituents as if they were ring atoms, failing the `ringAtoms.length !== 6` check and falling through to `null` — which in turn meant the piperidine ring was never excluded from `findPendantRingAtoms`'s pendant set, mis-triggering the tricyclic-tier dispatch in `deriveName` and producing a bare-formula fallback for naratriptan. `trimToRing` (already used in `naming-ring.js`/`naming-scaffolds.js` for exactly this leaf-stripping purpose) is the general fix; any future ring-substituent resolver whose ring atoms might themselves carry extra substituents should use it the same way rather than trusting the raw BFS component's size.
- **`resolvePhenylBranch(graph, adjacency, ipso, fromId)`** (`naming-core.js`, beside `resolveAminoSubstituent`) is `resolveBenzylBranch`'s ring-validation logic (trim-to-6-ring, all-carbon, Kekulé-alternating, both-direction `collectCoreAttachments` substituent search picking the lowest-locant orientation) lifted out to start directly at the ipso ring carbon instead of hopping through a CH2 first — needed for eletriptan's `S-C6H5` bond (phenylsulfonyl), where the ring attaches straight to the sulfonyl sulfur with no methylene in between. Emits `'phenyl'` or, with ring substituents, `'(<prefix>phenyl)'`.
- **`resolveAzacyclylMethylBranch(graph, adjacency, startId, fromId)`** (`naming-core.js`, beside `resolveTriazolylMethylBranch`) resolves eletriptan's `-CH2-(1-methylpyrrolidin-2-yl)` substituent — a saturated azacycle attached via the ring carbon *adjacent* to its nitrogen (position 2), unlike `resolvePiperidin4ylBranch`'s opposite-position (4) attachment, so the nitrogen is identified directly as one of the two immediate ring-neighbors of the attachment carbon rather than by a fixed ring-offset. Reuses the same `trimToRing`-before-sizing fix `resolvePiperidin4ylBranch` needed (the ring nitrogen here also carries an N-methyl substituent that the raw BFS component would otherwise misclassify as a ring atom), and reuses `resolveAlkylBranch` + a `'1-<alkyl>'` prefix for the optional N-substituent. `SATURATED_AZACYCLE_YL_NAMES` (`{5: 'pyrrolidin-2-yl', 6: 'piperidin-2-yl'}`) maps ring size to name; only size 5 is exercised by any compound so far. Wired into `resolveRingAlkylSubstituent` and `findPendantRingAtoms`.
- **`resolveSulfamoylMethylBranch` generalized for aryl sulfones** (eletriptan's `-CH2CH2-SO2-C6H5`, phenylsulfonylethyl, no nitrogen at all): the function's single non-oxygen sulfur substituent is now checked for either element — nitrogen takes the pre-existing sulfamoyl/azacyclylsulfonyl path unchanged, carbon is handed to the new `resolvePhenylBranch` and named `'(<phenyl-name>sulfonyl)' + chainSuffix`, e.g. `'(phenylsulfonyl)ethyl'`. This is a pure generalization of the existing third-substituent branch (previously hardcoded to require exactly one nitrogen); the nitrogen path's behavior and every prior sumatriptan/almotriptan/naratriptan case is unchanged, verified via full regression.
- **`nameTetrahydrocarbazole(graph, idSet, adjacency, core, orientation)`** (`naming-scaffolds.js`, just before `extractDifuranCore`) names frovatriptan's tetrahydrocarbazole scaffold by reusing `extractCarbolineCore`/`carbolineOrientations` (originally built for β-carboline) purely topologically: any tricyclic 13-atom/15-bond linear-ortho-fused 6-5-6 shape with 4 degree-3 fusion atoms and the `(0,4,1,4)` perimeter gap-length signature matches, whether the outer rings are aromatic or saturated — no element/aromaticity checks happen until this validator runs. It requires the `c1-c4` arc all-carbon and single-bonded (the saturated ring), the `c5-c8` arc all-carbon (the aromatic ring, `hasAlternatingOrders`-checked), `n9` nitrogen, all four fusion atoms carbon, the pyrrole ring (`c4a,c4b,c8a,n9,c9a`) matching `hasFuranPattern` at heteroatom index 3, and every fusion atom / `n9` sealed (no substituents beyond the ring). **Bug found and fixed while building this**: the saturated-ring cycle check must exclude the *closing* bond (`c4a-c9a`, shared with the aromatic pyrrole ring and legitimately double) from the "all bonds must be order 1" requirement — checking `satOrders.slice(0, -1)` instead of the full array, since `cycleBondOrders` always returns the closing bond last. Real frovatriptan chemistry has the amino substituent on the *aromatic* ring (real C6, `benzoArc` here) and the carboxamide on the *saturated* ring (real C3, `satArc` here) — this is the opposite of the ring roles' names and was initially wired backwards (swapped) when first written; fixed by swapping which loop (`satArc`/`benzoArc`) calls which resolver. Substituent scanning walks `satArc` with `resolveCarboxamideBranch` (locant `i+1`) and `benzoArc` with `resolveDirectAminoSubstituent` (locant `i+5`), each requiring the arc atom to have exactly one external single-bonded neighbor and consuming it into `visited`; if `visited.size !== idSet.size` at the end (i.e. any atom outside the accounted-for substituents), returns `null`. Wired into `deriveTricyclicName` as a second attempt (after `nameCarboline`, before `nameDifuranScaffold`) using the same `extractCarbolineCore`/`carbolineOrientations` call already made for the carboline attempt.
- **`resolveDirectAminoSubstituent(graph, adjacency, nitrogenId, fromId)`** and **`resolveCarboxamideBranch(graph, adjacency, startId, fromId)`** (`naming-core.js`, both just after `resolveAminoSubstituent`) are general-purpose helpers built for frovatriptan but not scaffold-specific. The former resolves a substituent nitrogen directly attached to the ring (as opposed to `resolveAminoSubstituent`'s indirect/chain cases), allowing up to two extra alkyl substituents via `resolveAlkylBranch` and `buildNitrogenPrefix` (e.g. `(N-methylamino)`). The latter resolves a `-C(=O)NH2`-style primary carboxamide branch, naming it `'carbamoyl'`. Neither is scaffold-specific; `resolveCarboxamideBranch` is a plausible direct reuse for 5-CT's carboxamide-on-tryptamine-ring-position, still unstarted.
- **`classifyBenzyloxy(graph, adjacency, neighbor, fromId)`** (`naming-core.js`, just after `classifyAlkoxy`) resolves 5-BT's `-O-CH2-C6H5` (benzyloxy) ring substituent: same shape as `classifyAlkoxy` (an `-O-` with exactly 2 neighbors, one being `fromId`) but where the plain-chain `collectBranch` walk would fail on hitting the aromatic ring, it hands off to `resolveBenzylBranch` instead and names the result `'<benzyl-name>oxy'`, e.g. `'benzyloxy'`. Wired into `collectCoreAttachments`'s alkoxy-role cascade (tried right after `classifyAlkoxy`, before `classifyThioalkoxy`), and into `findPendantRingAtoms` as a second `resolveBenzylBranch` case alongside the pre-existing nitrogen one (`elementOf(atomId) === 'O'`), since the pendant phenyl ring on the far side of the ether oxygen adds +1 to the whole-molecule cyclomatic number just like the N-benzyl case did for the NBOMe family. Safe against misfiring on the *other* direction (oxygen walking back into a fused ring's own carbon) because any such ring-fusion carbon has degree ≥ 2 within the ring, so `resolveBenzylBranch`'s `onward.length !== 1` guard rejects it immediately — the same safety property that already protected the nitrogen case.
- **`resolveCarboxamideBranch` wired into `resolveRingAlkylSubstituent`** (for 5-CT, 5-carboxamidotryptamine): the function was already general-purpose (built for frovatriptan's benzo-ring carboxamide, attaching directly at the carbonyl carbon with no CH2 bridge), so 5-CT's C5-carboxamide-on-tryptamine needed no new resolver — just adding the existing function to the ring-substituent cascade that `collectCoreAttachments`'s `'alkyl'`-role branch already calls. No pendant-ring dispatch change needed since a carboxamide is tree-shaped, not a ring.
- **`resolveOxazolidinonylMethylBranch(graph, adjacency, startId, fromId)`** (`naming-core.js`, just before `resolveRingAlkylSubstituent`) resolves zolmitriptan's `-CH2-(2-oxo-1,3-oxazolidin-4-yl)` substituent: walks the bridge CH2 to the ring's C4, requires C4's two other neighbors to be exactly one nitrogen (N3) and one carbon (C5), then walks the *rest* of the ring explicitly hop-by-hop (C5→O1→C2→back to N3) rather than via `collectComponentExcluding`/`trimToRing`, since the ring has two heteroatoms in fixed, non-symmetric positions and a hop-by-hop walk is simpler and self-validating here than a generic BFS-then-trim. Requires C2's second neighbor (besides ring-closing O1) to be an exocyclic double-bonded, otherwise-unbonded oxygen (the lactone/carbamate carbonyl); N3 may carry at most one extra alkyl substituent (unused by zolmitriptan itself, handled for generality) named with a `'3-<alkyl>-'` prefix. Emits `'(2-oxo-1,3-oxazolidin-4-yl)methyl'`. This turned out to be a straightforward *addition to the existing ring-substituent resolver cascade* (`resolveRingAlkylSubstituent` and `findPendantRingAtoms`, both updated), not the "ring-as-substituent parent reversal" earlier sessions had flagged as a large unstarted architectural lift — this project's dispatcher already always treats the larger/fused ring system (indole) as the parent regardless of true IUPAC seniority rules, exactly like naratriptan's piperidine or eletriptan's pyrrolidine, so zolmitriptan's monocyclic oxazolidinone substituent fits the established pattern with no new architecture needed.
- **`findPendantRingAtoms` further generalized for pendant rings buried inside a substituent chain.** Almotriptan's pyrrolidine sits two bonds deeper than rizatriptan's triazole (core ring carbon → CH2 → sulfonyl S → N → pyrrolidine), so the same whole-molecule cyclomatic-number dispatch bug recurred a third time. Rather than special-case this shape, `findPendantRingAtoms` now also tries `resolveSulfamoylMethylBranch` unconditionally from every atom's single-bonded neighbors, alongside `resolveBenzylBranch`/`resolveTriazolylMethylBranch`. This is safe in general, not just for this one case: any resolver in this family that returns a *tree*-shaped (non-cyclic) substituent removes an equal number of atoms and bonds (including the one boundary bond into the core), which leaves `coreBonds.length - coreAtomIds.length` unchanged — so calling `resolveSulfamoylMethylBranch` here for sumatriptan's plain `N,N-dimethyl` case (no ring) is a harmless no-op for dispatch purposes; only genuine ring-closing substituents (the azacycle case) actually shift the count, which is exactly the case that needs excluding.
- **Aminorex family** (`extractAminorexCore` + `aminorexOrientation` + `nameAminorex`, dispatched from `deriveFusedName`). This is the project's first *bridged* (non-fused) bicyclic recognizer: aminorex's oxazoline ring and its phenyl ring share no atom — they are joined by a single ordinary bond — so after `trimToRing` strips the exocyclic amino group as a leaf, the remaining component is an 11-atom/12-bond shape with exactly two degree-3 "junction" atoms connected directly by that one bridge bond, rather than the shared-fusion-atom topology every other scaffold here relies on. `extractAminorexCore` finds the two junctions, removes the bridge bond, and splits the rest into two disjoint components via plain BFS (`componentOf`), then orders each independently with `orderRing` — a 5-ring and a 6-ring, checked by size. `aminorexOrientation` walks the 5-ring from its junction atom (`c5`) in whichever direction hits an oxygen first, fixing `o1/c2/n3/c4` positions unambiguously (no orientation-list needed, since only one of the two directions can find the oxygen at all). `nameAminorex` then checks the oxazoline's single-unsaturation bond pattern (`C2=N3` only, everything else single — not a `hasFuranPattern`/aromatic ring, since oxazoline is not aromatic), the exocyclic amine on `C2` (0, 1, or 2 identical/different alkyl branches via `buildNitrogenPrefix`), an optional single alkyl branch on ring position `C4` (the real structural handle for 4-methylaminorex/4-MAR), and requires the phenyl ring to be a plain unsubstituted aromatic six-ring — any substituent on it is out of scope and rejected rather than guessed at. Output is assembled directly as a literal trivial-style string (`aminorex`, `4-methylaminorex`, or the N-alkyl/C4 combinations), not through the `COMMON_NAMES` table, since the function already produces the real common name directly.

### Common (trivial) names (`js/naming-core.js`)

- **Noramine family** (`extractNoramineCore` + `noramineOrientations` + `nameNoramine`, `naming-scaffolds.js`, dispatched from `deriveTricyclicName` between `nameTetrahydrocarbazole` and `extractDifuranCore`). A tryptamine-like scaffold: indole fused to a *saturated* cyclohexane ring via the **benzo** ring (not the pyrrole ring — that's `nameTetrahydrocarbazole`'s different topology), carrying an ethylamine/N,N-dialkylethylamine side chain off the indole C3-equivalent position, mirroring how `nameIndole` names tryptamine and its analogues. After `trimToRing`, the core is the same 13-atom/15-bond linearly-fused 5-6-6 shape as carboline/tetrahydrocarbazole (4 degree-3 fusion atoms, 3 fusion-fusion bonds including one zero-length "hinge"), disambiguated from those two by which of the two hinge-adjacent arcs is the pyrrole (length 3) vs saturated (length 4) ring — this can come out either way depending on which hinge atom connects to which, so `extractNoramineCore` resolves it with explicit branch logic (`pyrroleFarFusionIsMidFusion`/`satFarFusionIsMidFusion` flags) rather than assuming a fixed direction. `noramineOrientations` then fixes semantic roles (`c3a`/`c7a`/`c9a`/`c5a`) identically across both possible N-position branches (unlike the extraction branch, orientation branching is a separate axis: which of the pyrrole ring's two hetero-adjacent atoms is actually N). `nameNoramine` validates the pyrrole ring via an explicit `fiveBonds` array (like `nameIndole`, not `hasFuranPattern`, since C3 always bears the chain — an asymmetric pattern `hasFuranPattern` isn't suited for), the benzo ring via `hasAlternatingOrders`, and the saturated ring via an all-single-bonds check that excludes the closing bond shared with the aromatic ring (`satOrders.slice(0, -1)`, the same "closing bond exception" pattern used throughout this file). Substituents on any ring position (including the saturated ring, locants 6-9) are collected generically via `collectCoreAttachments`, reusing the exact same machinery as every other scaffold recognizer — no per-substituent special-casing was needed. Returns `null` (no bare-ring-system fallback) when no ethylamine chain is found, since there's no established trivial name for the unsubstituted-chain ring system. `COMMON_NAMES` carries the base pair: `noramine` and `N,N-dimethylnoramine` (renamed from an earlier `noramide`/`N,N-dimethylnoramide` naming after the user changed the reference structure to no longer carry a carboxamide group — the old name no longer made sense). Substituted analogues (methoxy, halogens, N-alkyl, ring carboxamide, etc.) are **not** individually keyed in `COMMON_NAMES` — `nameNoramine` builds their names directly (e.g. `5-methoxynoramine`, `8-carbamoyl-N,N-dimethylnoramine`), the same "direct final name, no table lookup" pattern `nameCarboline`/`nameTetrahydrocarbazole` use.
  - **Bug found and fixed (three-part, `extractNoramineCore`/`noramineOrientations`).** (1) `benzoRing`/`satRing` cycle-order arrays in `nameNoramine` were structurally wrong for the real bond adjacency; fixed to `[c3a, c7a, c4, c5, c5a, c9a]` and `[c5a, c9, c8, c7, c6, c9a]`. (2) The saturated ring's all-single-bonds check included the shared aromatic closing bond (order 2); fixed with the `.slice(0, -1)` pattern. (3) **Root cause of a user-reported failure**: `extractNoramineCore` originally hardcoded `pyrroleFarFusion`/`satFarFusion` to fixed extraction-perimeter atoms regardless of which of the two topologically-symmetric branches was taken (see the branch-ambiguity note above) — correct for only one branch, silently swapped for the other. Found by dumping the raw `g.bonds` list of a concrete branch-2 test case (a 5-methoxy analogue) and cross-checking the extraction's reported atom IDs against it by hand; deriving this purely on paper (without a ground-truth bond trace) had produced the bug twice, including a follow-on transcription slip in `noramineOrientations`'s `satOrient` ternary direction that required the same trace to catch. Fixed with explicit per-branch assignment and the `*IsMidFusion` flags described above.
  - **Bug found and fixed (dispatch-priority, separate from the above — see the `nameStructureOnce` dispatch-order fix under "General fallback engine" above).** Even after the three fixes above, a noramine analogue with a **carboxamide substituent on the saturated ring** still fell through to the systematic `azatricyclo[...]` name instead of a noramine-family trivial name. Root cause was two-layered: first, the pre-existing `generalName`-before-`deriveName` dispatch order (now fixed) meant `generalName` could independently produce *some* valid systematic name for this molecule (since it recognizes carboxamide as a principal group) and win before `nameNoramine` was ever tried. Second, even with dispatch order fixed, `nameStructureOnce`'s override block (`js/naming-core.js` ~line 469) that prefers `generalName`'s alternate output whenever the derived name contains a principal-group-like substring (`carboxy|cyano|formyl|oxo|acetyl|carbamoyl|carbonyl|sulfo|sulfamoyl|acetoxy|benzoyl`) was *also* firing on `nameNoramine`'s own already-finalized output (`8-carbamoyl-N,N-dimethylnoramine` contains "carbamoyl"), discarding the correct trivial name in favor of the systematic one. This override is legitimate for systematic names produced by `deriveRingName`/`deriveFusedName`/the opioid-family recognizers whose output is meant to be re-checked against `COMMON_NAMES`, but wrong for scaffold recognizers (`nameCarboline`, `nameTetrahydrocarbazole`, `nameNoramine`, the benzofuran/benzodifuran family) that already build a complete, final display name with such groups folded in as ordinary substituent prefixes. Fixed with an `isFinalizedScaffoldName` regex guard (`/(noramine|carboline|tetrahydrocarbazole|benzodifuran|benzofuran)$/`) that skips the override entirely when `derived` already ends in one of these known finalized-scaffold-name suffixes.

- **Benzodifuran / FLY family** (`extractDifuranCore` + `validateFuranArm` + `nameDifuranScaffold`, dispatched from `deriveTricyclicName` after the β-carboline attempt fails). This is the tricyclic analogue of the benzofuran work above: a central aromatic benzo ring with two furan rings fused on its *opposite* (para) edges — the skeleton behind bromo-DragonFLY/2C-B-FLY-type compounds — rather than carboline's angular pyridine-pyrrole-benzo arrangement. After `trimToRing`, the core is a 12-atom/14-bond shape with four degree-3 fusion atoms whose only atom-to-atom bonds are the two actual shared furan edges (no third "hinge" bond like carboline has, since the two furans don't touch each other). `extractDifuranCore` removes those two shared edges, orders the remaining 12-atom perimeter with `orderRing`, then reads off the gap lengths between consecutive fusion atoms around that perimeter: a repeating `(1, 3, 1, 3)` signature (the two length-1 gaps are the free/substitutable central-ring carbons; the two length-3 gaps are each furan's non-fusion atoms) that uniquely and unambiguously fixes the topology — no orientation-list/hinge search needed, unlike carboline's three-fusion-bond case. `validateFuranArm` checks each 3-atom arc plus its two fusion atoms as a 5-ring via `hasFuranPattern` (locating the oxygen freely among the three arc positions, since which specific Kekulé polarity each furan's shared edge takes is not fixed in advance — the central ring's own `hasAlternatingOrders` check is what actually constrains that, exactly as it must for two rings fused on antipodal edges of the same aromatic hexagon). `nameDifuranScaffold` requires the two free central-ring positions (arbitrarily labeled locants 4 and 8, mirroring the real compounds' own numbering) to carry exactly one chain match — tried as `matchAmphetamineChain` first, then `matchEthylamineChain`, the same two-attempt order `nameBenzofuranScaffold` uses — plus, on the other, at most one ordinary substituent via `collectCoreAttachments`; the furan-ring atoms themselves must carry no substituents. Output is assembled the same way as the benzofuran scaffold — the amine folded into the substituent list as `(2-aminoethyl)`/`(2-aminopropyl)`/`(2-methylaminoethyl)`/etc. via `assembleSubstituentPrefix`, with the chain-length word (`ethyl` vs `propyl`) picked by which matcher fired — against a bare `benzodifuran` parent name. Two `COMMON_NAMES` entries were confirmed and keyed in this way: `4-(2-aminopropyl)-8-bromobenzodifuran` → `Bromo-DragonFly` (the amphetamine-chain/alpha-methyl variant, matching its published IUPAC name `1-(4-bromofuro[2,3-f][1]benzofuran-8-yl)propan-2-amine`) and `4-(2-aminoethyl)-8-bromobenzodifuran` → `2C-B-DragonFly` (the plain 2-aminoethyl variant). Both are the fully **aromatic** benzodifuran core this recognizer models. The distinct compound "2C-B-FLY" (as opposed to 2C-B-DragonFly) is actually the *saturated* tetrahydrofuro-benzofuran analogue — its two five-membered rings are non-aromatic `-CH2-CH2-O-` tetrahydrofuran rings fused to one aromatic benzo ring, not two aromatic furans — which this recognizer does not and cannot match (it requires `hasFuranPattern`/`hasAlternatingOrders` on both five-rings), so no `COMMON_NAMES` entry exists for that name; supporting it would need a new sibling recognizer for the mixed aromatic/saturated tricyclic shape. Update, later session: that sibling recognizer was built. `extractDifuranCore` needed zero changes — it is purely topological (12-atom/14-bond core, 4 fusion atoms, `(1,3,1,3)` gap signature) and doesn't care about bond order — so it already extracts the identical shape whether the two five-rings are aromatic furans or saturated dihydrofurans. The new pieces are `validateDihydrofuranArm` (mirrors `validateFuranArm`'s signature exactly, but instead of `hasFuranPattern` it requires the arm's own 4 bonds — `cycleBondOrders(...).slice(0, 4)`, excluding the shared/central-ring closing bond exactly per the recurring "closing bond exception" pattern documented elsewhere in this file — to all be single, and requires the oxygen to sit at one *end* of the 3-atom arc (adjacent to a fusion carbon, as real 2,3-dihydrobenzofuran numbering requires) rather than the middle) and `nameDifuranSaturatedScaffold` (a near-duplicate of `nameDifuranScaffold`, differing only in calling `validateDihydrofuranArm` instead of `validateFuranArm` and returning a `2,3,6,7-tetrahydrobenzodifuran` parent instead of bare `benzodifuran` — the `2,3,6,7-tetrahydro` locants are hardcoded since this recognizer's ring-atom positions are structurally fixed by the extraction, not derived from a general saturation-locant algorithm). `deriveTricyclicName` tries the aromatic `nameDifuranScaffold` first and falls back to `nameDifuranSaturatedScaffold` only if that returns null, so the two recognizers can't shadow each other. One subtlety caught during verification: the assembled substituent prefix (e.g. `4-(2-aminoethyl)-8-bromo`) does not end in a trailing hyphen (matching the aromatic scaffold's `bromobenzodifuran`-style fusion), so the saturated parent's return string needed an explicit `+ '-2,3,6,7-tetrahydrobenzodifuran'` (leading hyphen) rather than a bare concatenation, since a parent name starting with a digit always needs that separator. Verified against a hand-built graph identical in central-ring layout to the existing `2C-B-DragonFly` test but with both furan arms rebuilt as `fusionA-O-CH2-CH2-fusionB` (all single bonds): produces `4-(2-aminoethyl)-8-bromo-2,3,6,7-tetrahydrobenzodifuran`, now keyed to `2C-B-FLY`. The existing aromatic `Bromo-DragonFly`/`2C-B-DragonFly` tests were rerun and still pass unchanged.

`COMMON_NAMES` maps an exact systematic name string produced by `deriveName` to a trivial/common name; `nameStructure` checks this table after deriving a name and returns the mapped trivial name when the systematic string matches exactly, otherwise the systematic name (or, failing derivation, the formula) as before. This is a pure string-keyed override — no separate structural detection — so it only fires when the underlying naming tiers already produce that exact string. Current entries (390 total per `grep -c "^  '.*': '.*',$"`, plus the `alfentanil` entry added separately). The newest is an 11-entry pharmaceutical/biogenic-amine batch verified this session, requiring **zero source changes** — added after the user asked for "many many more" and the PiHKAL-trivial-name well had genuinely run dry (see the "500 more" clarification note below): `phentermine` (`(2-amino-2-methylpropyl)benzene`, gem-dimethyl chain, no ring substituent) and `mephentermine` (its N-methyl analog) confirm the gem-dimethyl amine-chain fallback shape already used by `ALEPH` extends to an unsubstituted ring; `fenfluramine` (`3-(trifluoromethyl)-N-ethylamphetamine`) confirms a ring `-CF3` group and an N-ethyl amphetamine chain both resolve through existing generic paths with no new classifier; `benzphetamine` (`N-methyl-1-phenyl-N-phenylmethylpropan-2-amine`) and `clobenzorex` (`N-((2-chlorophenyl)methyl)-1-phenylpropan-2-amine`) confirm an N-benzyl/N-(2-chlorobenzyl) branch on a plain amphetamine chain already falls through to a correct (if verbose) systematic name via the general engine, same shape as the NBOMe gap case but without the FLY-scaffold dispatch attempt getting in the way first; `octopamine`, `synephrine`, `phenylephrine` (`4-(2-amino-1-hydroxyethyl)phenol`, `4-(1-hydroxy-2-(methylamino)ethyl)phenol`, `3-(1-hydroxy-2-(methylamino)ethyl)phenol`) and `norephedrine`, `ephedrine` (`(2-amino-1-hydroxypropyl)benzene`, `(1-hydroxy-2-(methylamino)propyl)benzene`) confirm a benzylic-position hydroxyl on the amine chain (a shape never previously exercised in this table) resolves cleanly through the general engine's ordinary alcohol-suffix-plus-amine-prefix path, with the ring folded in as a `phenol`/`benzene` parent exactly like the ketone-bearing cathinones did for the carbonyl case; note this means `ephedrine` and `pseudoephedrine` (its diastereomer) collide to the identical string since this engine has no stereochemistry model, so only one trivial name can be keyed for it — `ephedrine` was chosen as the more recognizable of the pair, and `pseudoephedrine`/`cathine`/`norpseudoephedrine` were deliberately left unkeyed rather than arbitrarily overwriting the same string; `isoproterenol` (`4-(1-hydroxy-2-isopropylaminoethyl)benzene-1,2-diol`) confirms the same benzylic-hydroxyl chain shape also works with a catechol (`benzene-1,2-diol`) parent and an N-isopropyl branch. Before that, the newest was an 8-entry batch verified this session after the user asked for "500 more" phenethylamines — clarified with the user first, since there aren't 500 more real ones and this project's discipline is to verify structure before keying a name, not fabricate: `tyramine`/`hordenine`/`N-methyltyramine` (the 4-hydroxyphenethylamine/N-methyl/N,N-dimethyl natural-monoamine series), `homoveratrylamine` (3,4-dimethoxyphenethylamine), `3-methoxytyramine` (a dopamine metabolite, 4-hydroxy-3-methoxy — note the engine's alphabetical substituent ordering puts `hydroxy` before `methoxy` in the string, opposite of the more common "3-methoxy-4-hydroxy" phrasing seen in literature, so the key had to be the engine's actual emitted order), and `epinine`/N-methyldopamine (3,4-dihydroxy-N-methylphenethylamine) — all zero source changes, same generic ring/chain-substituent handling as everything else in this table; also confirmed `phenethylamine` and `amphetamine` themselves (fully unsubstituted) already come out as those literal words with no COMMON_NAMES entry needed, since that's just the engine's default chain-parent name. Also added `ALEPH`/`ALEPH-2` (the alpha,alpha-dimethyl/"gem-dimethyl" — i.e. `-CH2-C(CH3)2-NH2` instead of the amphetamine `-CH2-CH(CH3)-NH2` — analogs of `2C-B`/`2C-T-2` respectively), flagged in complexities.md as lower-confidence than the rest of the table since they're obscure PiHKAL entries recalled from memory rather than a checked source — worth a second look if anyone questions them specifically. Before that, the newest was a 14-entry phenethylamine-family batch verified this session ("keep implementing every phenethylamine ever"), all **zero source changes**: `MMDA`/`MMDA-2` (methoxy-methylenedioxyamphetamine isomers), `MDPR`/`MDBU` (N-propyl/N-butyl MDA homologs, same `3,4-methylenedioxy-N-<alkyl>amphetamine` shape as `MDMA`/`MDEA`), `MDIP` (N-isopropyl MDA — branched N-substituent falls to the generic `1,2-methylenedioxy-4-(2-isopropylaminopropyl)benzene` fallback shape rather than the dedicated chain-parent path, same pattern as the branched-alkylthio `2C-T-4`/`2C-T-8` case from an earlier session), `4-FA`/`4-FMA`/`4-CA`/`4-EA` (simple monosubstituted-ring amphetamines with no methoxy groups at all — confirms the amphetamine chain-parent path doesn't require any alkoxy substituents to fire), `Allylescaline`/`Isoproscaline`/`Buscaline` (3,5-dimethoxy-4-alkoxy mescaline analogs — allyloxy/isopropoxy branch to the generic `2-(<ring>)ethanamine` fallback since `classifyAlkoxy` only recognizes straight chains, same as the earlier branched-alkylthio finding; straight-chain butoxy in `Buscaline` hits the dedicated phenethylamine-tier shape), and `2C-T-21`/`2C-T-15` (2-fluoroethylthio and cyclopropylmethylthio — `2C-T-21`'s straight fluoroethyl chain hits the dedicated `<n>-<alkyl>thio-2,5-dimethoxyphenethylamine` shape, `2C-T-15`'s branched/cyclic cyclopropylmethyl falls to the generic fallback, again for the unbranched-only `classifyThioalkoxy` reason). Also verified the existing `2C-G`/`3,4-dialkyl` and `TMA` families still resolve correctly (no regression) via a small smoke test, since the prior session's full regression-suite scratchpad files were lost when the scratchpad directory was cleared between sessions — a reminder that the scratchpad is not durable across sessions and anything meant to persist (regression test files) should really live under `feature-research/` or be quick to regenerate, not relied on to still exist next time. Before that, the newest was a second, alternate key for `Bromo-DragonFly` — `1-(8-bromo-4,10-dioxatricyclo[7.3.0.0³,⁷]dodeca-1(9),2,5,7,11-pentaen-2-yl)propan-2-amine`, the generic fused-polycycle von-Baeyer fallback string that the live app produced for a hand-drawn Bromo-DragonFly graph (a different atom/Kekulé traversal than `nameDifuranScaffold`'s own `4-(2-aminopropyl)-8-bromobenzodifuran` output for the equivalent hand-built test graph), reported by the user and keyed as a direct string override rather than root-caused further; before that, see "genRingSubstituent tetrazole/triazole/oxadiazole gap" above: the newest is a 10-entry batch verified this session continuing the phenethylamine/FLY expansion — `TMA-3`/`TMA-4`/`TMA-5` (the `2,3,4-`/`2,3,5-`/`2,3,6-trimethoxyamphetamine` isomers, filling out the full six-member TMA series alongside the pre-existing `TMA`/`TMA-2`/`TMA-6`, zero source changes), `2C-G`/`2C-G-3`/`2C-G-4` (the 3,4-dialkyl-2,5-dimethoxyphenethylamine series — `2C-G` is 3,4-dimethyl, `2C-G-3` is 3-ethyl-4-methyl, `2C-G-4` is 3,4-diethyl — all handled by the same generic `collectCoreAttachments` cascade that already covers arbitrary ring substituents, zero source changes; `2C-G-N`/`2C-G-5`, which fuse a ring across the 3,4-positions instead of two separate alkyl substituents, were not attempted since that needs a fused-ring-on-phenethylamine recognizer this project doesn't have yet), and `Iodo-DragonFly`/`2C-I-DragonFly`/`Chloro-DragonFly`/`2C-C-DragonFly` (swapping the halogen on the existing benzodifuran/FLY scaffold's `freeY` position from Br to I/Cl — the `nameDifuranScaffold` recognizer already treats that substituent generically via `collectCoreAttachments`, so no new code was needed, same discipline as the `Bromo-DragonFly` entry). A `Bromo-DragonFly-NBOMe` (N-(2-methoxybenzyl) analog) was also tried and confirmed to resolve to a valid but ugly generic fused-ring systematic name rather than the benzodifuran-scaffold shape, because `nameDifuranScaffold`'s anchor match (`matchAmphetamineChain`/`matchEthylamineChain`) only recognizes plain alkyl N-substituents, not an aryl-bearing branch like NBOMe's benzyl group — this is a known, not-yet-closed gap, left undone since it would need either extending those matchers or a bespoke NBOMe-on-FLY branch, and no COMMON_NAMES entry was added for it. Before that, the newest was an 11-entry cathinone-family batch, also requiring **zero source changes** — an aryl ketone with an adjacent amine (`Ar-C(=O)-CH(R)-NR'R''`) already resolves through the general engine's ordinary ketone-suffix-plus-amine-prefix path with the ring folded in either as the parent (`phenyl`/`benzodioxol` prefix on a `pentan-1-one` chain, when the alpha-substituent is a pyrrolidine ring, e.g. `alpha-PVP`/`MDPV`) or as an attached benzene parent with the whole ketone-amine chain as a bracketed prefix (when there's no ring on the amine, e.g. `mephedrone`/`methylone`/`cathinone` itself) — which one it picks is simply whichever tier's ordinary "prefer the ring as parent when there's no better principal-group chain" logic already in place decides, not anything cathinone-specific. Verified: `cathinone` (`(2-amino-1-oxopropyl)benzene`), `methcathinone` (`(2-(methylamino)-1-oxopropyl)benzene`), `mephedrone` (`1-(2-(methylamino)-1-oxopropyl)-4-methylbenzene`), `methylone`/`ethylone`/`butylone` (methylenedioxy-ring N-methyl/N-ethyl/alpha-ethyl variants), `pentedrone` (plain-phenyl alpha-ethyl homolog), `4-MEC` (4-methylphenyl N-ethyl), `flephedrone` (4-fluorophenyl), and `alpha-PVP`/`MDPV` (the pyrrolidinyl-valerophenone pair — verified only after finding and fixing a hand-built-graph mistake in this session's own test harness, not the naming engine: a pyrrolidine ring built with one too few atoms came out as `azetidin-1-yl` and the alpha-chain with one too few carbons came out as `butan-1-one`, both a reminder that this project's "verify against a hand-built graph" discipline only catches naming-engine bugs if the hand-built graph itself is the intended structure). Before that, the newest was a 13-entry phenethylamine-family audit batch verified this session, requiring **zero source changes** — every one of these substituent shapes (halogens, straight and branched alkyls, straight and branched alkylthios, nitro) was already handled generically by the existing `classifyAttachment`/`classifyAlkoxy`/`classifyThioalkoxy`/`collectCoreAttachments` cascade and/or the general engine's fallback, so this was pure "verify the exact string, key it" work: `2C-N` (`2,5-dimethoxy-4-nitrophenethylamine`, note the nitro group must be built as N with *two* `=O` double bonds — `classifyNitro` in `naming-core.js` rejects the charge-separated N(=O)(-O-) single/double form since this codebase doesn't model formal charges), `3C-B`/`3C-C`/`3C-I`/`3C-D`/`3C-E`/`3C-P` (the 3-carbon-chain homologs, e.g. `1-(3-aminopropyl)-4-bromo-2,5-dimethoxybenzene` — note these come out as a substituted-benzene parent with an `(3-aminopropyl)` prefix rather than a `phenethylamine`/`amphetamine`-style parent, since only the 2-carbon chain length has a dedicated `phenethylamine`/`amphetamine` chain-parent path), `4C-B`/`4C-D`/`4C-P` (the 4-carbon-chain homologs, same `(4-aminobutyl)benzene` pattern), and `2C-T-4`/`2C-T-8`/`2C-T-9` (branched/longer alkylthio variants — `2C-T-4`'s isopropylthio and `2C-T-8`'s sec-butylthio branch shapes route through the general engine's `2-(<ring>)ethanamine`-style output rather than the straight-chain `<n>-<alkyl>thio-2,5-dimethoxyphenethylamine` pattern `2C-T-2`/`2C-T-7` use, since `classifyThioalkoxy` only recognizes unbranched alkyl chains — both forms were verified against hand-built graphs and keyed as-is). Before that, the newest was `LSZ` for `6-methyl-2,4-dimethylazetidide` — the cyclic-amide case, enabled by the new `resolveAzetidideRing`/`findAzetidideRingAtoms` pair and a tier-dispatch fix passing pendant-filtered `coreAtomIds`/`coreBonds` into `deriveTetracyclicName`, see the latest "Update, later session" note under "Ergoline / lysergamide" above, which closes out the full lysergamide family; before that, `AL-LAD` for `6-allyl-N,N-diethyllysergamide`, `1P-LSD` for `1-propionyl-6-methyl-N,N-diethyllysergamide`, and `ALD-52` for `1-acetyl-6-methyl-N,N-diethyllysergamide` — enabled by the `resolveAllylBranch`/`resolveAcylBranch` fallback helpers; before that, `ETH-LAD` for `6-ethyl-N,N-diethyllysergamide`, `PRO-LAD` for `6-methyl-N,N-dipropyllysergamide`, and `LSA` for `6-methyl-lysergamide` — the first two verified with zero source changes needed, the third requiring a new `amideBranches.length === 0` branch in `nameErgoline`; before that, `2C-B-FLY` for `4-(2-aminoethyl)-8-bromo-2,3,6,7-tetrahydrobenzodifuran` — verified against a hand-built saturated-benzodifuran graph, see "Benzodifuran / FLY family" above for the new `validateDihydrofuranArm`/`nameDifuranSaturatedScaffold` pair; before that, `methysergide` for `1,6-dimethyl-N-(1-hydroxybutan-2-yl)lysergamide` — verified against a hand-built ergoline-core graph with both an N6-methyl and an indole-N-methyl plus a butanolamide C8 substituent, see the second "Update, later session" note under "Ergoline / lysergamide" above; before that, `ergometrine` for `6-methyl-N-(1-hydroxypropan-2-yl)lysergamide` and `methylergometrine` for `6-methyl-N-(1-hydroxy-2-methylpropan-2-yl)lysergamide` — verified against hand-built ergoline-core graphs with a mono-substituted C8 amide to a hydroxyalkyl group, see the "Update, later session" note under "Ergoline / lysergamide" above for the new `resolveAminoAlcoholSubstituent` helper; before that, `lysergol` for `6-methyl-lysergol` — verified against a hand-built ergoline core identical to the passing LSD graph but with the C8 amide replaced by a plain `-CH2OH`, see the "Update, later session" note under "Ergoline / lysergamide" above; before that, `5-BT` for `5-benzyloxytryptamine` — verified against a hand-built tryptamine core plus a benzyloxy ether at C5, see "classifyBenzyloxy" above; before that, `5-CT` for `5-carbamoyltryptamine` — verified against a hand-built primary-amine tryptamine core plus a carboxamide directly on C5, reusing `resolveCarboxamideBranch` (built for frovatriptan) now also wired into `resolveRingAlkylSubstituent`'s cascade for direct (non-CH2-bridged) ring attachment; before that, `zolmitriptan` for `5-(2-oxo-1,3-oxazolidin-4-yl)methyl-N,N-dimethyltryptamine` — verified against a hand-built N,N-dimethyltryptamine-chain-plus-oxazolidinonylmethyl-at-C5 graph, see "resolveOxazolidinonylMethylBranch" above; before that, `frovatriptan` for `6-(N-methylamino)-3-carbamoyltetrahydrocarbazole` — verified against a hand-built benzo+pyrrole+saturated-ring tricyclic graph with a methylamino on the aromatic ring and a carboxamide on the saturated ring, see "nameTetrahydrocarbazole"/"resolveDirectAminoSubstituent"/"resolveCarboxamideBranch" above; before that, `eletriptan` for `3-(1-methylpyrrolidin-2-yl)methyl-5-(phenylsulfonyl)ethylindole` — verified against a hand-built indole-core-plus-pyrrolidinylmethyl-plus-phenylsulfonylethyl graph, see "resolveAzacyclylMethylBranch"/"resolvePhenylBranch" above; before that, `naratriptan` for `3-(1-methylpiperidin-4-yl)-5-(N-methylsulfamoyl)ethylindole` — note this is a generic-ring-substituent name (indole parent, not a tryptamine chain, since the C3 substituent is piperidinyl not ethylamine) — verified against a hand-built indole-core-plus-piperidinyl-plus-ethanesulfonamide graph, see "resolvePiperidin4ylBranch"/"walkToSulfonylChain" above; before that, `almotriptan` for `5-(pyrrolidin-1-ylsulfonyl)methyl-N,N-dimethyltryptamine`, verified against a hand-built indole-core-plus-chain-plus-pyrrolidinylsulfonylmethyl graph — see "resolveSaturatedAzacycleAt" above; before that, `rizatriptan` for `5-(1,2,4-triazol-1-yl)methyl-N,N-dimethyltryptamine`, verified against a hand-built indole-core-plus-chain-plus-triazolylmethyl graph — see "resolveTriazolylMethylBranch"/"Pendant-ring dispatch, generalized" above; before that, `sumatriptan` for `5-(N-methylsulfamoyl)methyl-N,N-dimethyltryptamine`, verified against a hand-built indole-core-plus-chain-plus-sulfamoylmethyl graph — see "resolveSulfamoylMethylBranch"/"resolveRingAlkylSubstituent" above; before that, the most recent 5-entry batch, verified against hand-built 2C-x-plus-pendant-benzyl-ring graphs after fixing the pendant-ring dispatch bug described above, is `25I-NBOMe`/`25B-NBOMe`/`25C-NBOMe` (`4-<halo>-2,5-dimethoxy-N-(2-methoxybenzyl)phenethylamine`), `25I-NBH` (`4-iodo-2,5-dimethoxy-N-benzylphenethylamine`), and `25I-NBF` (`4-iodo-2,5-dimethoxy-N-(2-fluorobenzyl)phenethylamine`) — see "resolveBenzylBranch"/"Pendant-ring dispatch fix" above; the prior batch brought the count to 132: the 120th being `LSD` for `6-methyl-N,N-diethyllysergamide` — see "Ergoline / lysergamide" above — plus a 4-entry benzofuran batch, `5-APB`/`6-APB`/`5-MAPB`/`6-MAPB`, each verified against a hand-built 13-atom benzofuran-plus-chain graph — see "Benzofuran / APB-MAPB family" above; aminorex and 4-methylaminorex are produced directly by `nameAminorex` and are not in this table; plus an 8-entry batch verified this session: `DiPT`/`5-MeO-DiPT` (isopropyl N-substituents via `resolveAlkylBranch`), `AMT`/`AET` (alpha-methyl/alpha-ethyl via `matchEthylamineChain`'s `allowAlphaBranch`), `5-MAPBT`/`6-MAPBT` (the sulfur/`benzothiophene` analogues of 5-MAPB/6-MAPB), and `Bromo-DragonFly`/`2C-B-DragonFly` (the amphetamine- and phenethylamine-chain forms of the aromatic benzodifuran core — see "Benzodifuran / FLY family" above)): the original psychoactive-scaffold set — `DMT`, `serotonin`, `bufotenin`, `psilocin` (tryptamine-tier), `dopamine`, `mescaline` (phenethylamine-tier), `MDA`, `MDMA`, `MDEA` (methylenedioxy-amphetamine-tier), `PMA`, `PMMA` (para-methoxyamphetamine-tier), `methamphetamine` (`N-methylamphetamine`) — plus a 50-entry batch added later, all individually verified against hand-built test graphs before being keyed in: chain-tier trivial names (`formic acid`, `acetic acid`, `propionic acid`, `butyric acid`, `valeric acid`, `caproic acid`, `caprylic acid`, `capric acid`, `formaldehyde`, `acetaldehyde`, `propionaldehyde`, `butyraldehyde`, `acetone`, `methyl ethyl ketone`, `acetonitrile`, `propionitrile`, `butyronitrile`, `methylamine`, `ethylamine`, `isopropylamine`, `tert-butanol`, `isobutanol`, `isobutyric acid`, `isopropanol`, `chloroform`, `carbon tetrachloride`, `iodoform`, `DCM`); benzene-ring trivial names (`aniline`, `phenol`, `toluene`, `o-xylene`, `m-xylene`, `p-xylene`, `thiophenol`, `anisole`); and more phenethylamine/amphetamine/tryptamine-tier drug names (`2C-H`, `2C-B`, `2C-I`, `2C-C`, `2C-E`, `DOM`, `DOB`, `DOI`, `DOC`, `5-MeO-DMT`, `5-MT`, `DET`, `norpsilocin`, `NMT`) — plus a final 9-entry batch exploring the naphthalene, quinoline, and β-carboline scaffold tiers (each verified the same way, including confirming `nameCarboline`'s literal output has no hyphen before `β-carboline`): `1-naphthol`, `2-naphthol` (naphthalenol positions 1/2 via `nameNaphthalene`'s `scaffoldSubstituentEntries` prefix path), `1-naphthylamine`, `2-naphthylamine` (naphthaleneamino equivalents), `oxine` (`8-hydroxyquinoline` via `nameQuinolineFamily`), `quinaldine` (`2-methylquinoline`), `harman` (`1-methylβ-carboline`), `harmine` (`7-methoxy-1-methylβ-carboline`), `harmol` (`7-hydroxy-1-methylβ-carboline`) — the harmala-alkaloid entries required constructing the full 13-atom/15-bond tricyclic β-carboline core (pyridine + pyrrole + benzo rings sharing the `c4a`/`c9a`/`c4b`/`c8a` fusion atoms) with a hand-derived Kekulé assignment satisfying both `hasAlternatingOrders` (six-membered rings) and `hasFuranPattern` (the pyrrole ring, heteroatom index 3). Adding another common name requires only knowing the exact systematic string the existing tiers would emit for that structure — no new recognizer.

A further 48-entry batch then widened the tryptamine and phenethylamine/amphetamine tiers, every key verified by running a hand-built `Graph` through the real `nameStructure` before it was added. 24 of them need no new code at all: tryptamine N-alkyl combinations (`DPT`, `DBT`, `EPT`, `MET`, `MPT`), the 4-hydroxy series (`4-HO-T`, `4-HO-DET`, `4-HO-DPT`, `4-HO-MET`, `4-HO-MPT`, `4-HO-EPT`), the 5-methoxy series (`5-MeO-DET`, `5-MeO-MET`, `5-MeO-DPT`), ring-halogen DMTs (`5-Fluoro-DMT`, `5-Chloro-DMT`, `5-Bromo-DMT`, `6-Fluoro-DMT`), ring-methyl DMTs (`2,N,N-TMT`, `4,N,N-TMT`, `5-N,N-TMT`, `7,N,N-TMT`) and the two-ring-substituent `psilomethoxin` (`4-hydroxy-5-methoxy-N,N-dimethyltryptamine`); plus, on the benzene side, `2C-P`, `2C-F`, `2C-D`, `2C-Bu`, the DOx homologs `DOET`, `DOPR`, `DOBU` and `DOH`, the trimethoxyamphetamines `TMA`, `TMA-2`, `TMA-6`, the mescaline ether homologs `escaline` and `proscaline`, and `trichocereine` (`3,4,5-trimethoxy-N,N-dimethylphenethylamine`). Note that bare tryptamine needs no entry: `nameIndole` already emits the literal string `tryptamine`.

The remaining 11 entries required three new substituent classifiers in `js/naming-core.js`, each placed after `classifyAlkoxy` and each tried in turn by `collectCoreAttachments` when `classifyAttachment` and `classifyAlkoxy` both decline (all four kinds — `alkoxy`, `thioalkoxy`, `acyloxy`, `phosphoryloxy` — share the same handling: push a named substituent at the current locant and mark the whole group's atoms visited). `classifyThioalkoxy` mirrors `classifyAlkoxy` for a divalent sulfur, but names the group off `ALKYL_PREFIXES` with the suffix `thio` (`methylthio`, not a root contraction), unlocking the 2C-T family (`2C-T`, `2C-T-2`, `2C-T-7`). `classifyAcyloxy` matches a ring-O-C(=O)-CH3 acetate ester — divalent O, then a carbon carrying exactly one terminal double-bonded O and one terminal methyl — and emits `acetoxy`, unlocking `psilacetin`, `ethacetin`, `depracetin` and `metacetin`. `classifyPhosphoryloxy` matches ring-O-P(=O)(OH)(OH) — divalent O onto a phosphorus with exactly one terminal double-bonded O and two terminal hydroxyl Os — and emits `phosphoryloxy`, unlocking `psilocybin`, `baeocystin`, `norbaeocystin` and `ethocybin`. All three return an `atoms` list covering the entire group so the scaffold `visited.size !== idSet.size` completeness check still passes.

### Label drawing

`Renderer.drawComponentNames()` runs at the end of `render()`, after bonds, atoms, and the ghost. For each component it takes the min/max x and min y of that component's atoms and draws `nameStructure(...)` centered on the horizontal midpoint, `nameOffset` (22px) above the topmost atom, in `nameColor` (`#a3a8d4`, a muted lavender distinct from the bond grey and every element color) at `nameFont`. Like the rest of the renderer this is recomputed from scratch every pass; there is no caching.

## Bond ghost preview (`js/interactions.js`, `js/renderer.js`)

Hovering near an atom previews the bond that a click would create, so chain drawing no longer requires a drag.

`bind()` additionally attaches `mousemove` and `mouseleave` on the canvas.

Ghost computation (`computeGhost(point)`), run on every `mousemove` while no press is in progress:

1. Nothing is previewed over an atom (`atomHitRadius`) or over a bond line (`bondHitRadius`) — those positions keep their existing drag-start and order-cycling gestures.
2. The origin is the nearest atom whose distance is greater than `atomHitRadius` (10px) and at most `ghostRadius` (60px).
3. The angle origin→cursor is snapped and extended through `snappedBondTarget(origin, point)`, the single helper that owns `snapAngle(..., angleSnapSteps)` plus `bondLength`. `growChain` was refactored to call it too, so the drag gesture and the ghost cannot drift apart.

   The snap grid is a **union of two grids**: multiples of 30° (0, 30, …, 330) and multiples of 36° (0, 36, …, 324), built from `angleSnapSteps: [30, 36]` by `snapAngleCandidates` (0° and 180° coincide and are deduplicated, giving 22 candidates). `snapAngle` picks whichever candidate is angularly closest to the raw angle, comparing differences wrapped into ±180°. The 36° grid exists so a pentagon can be drawn: its 72°-per-vertex turns are unreachable on a pure 30° grid, which made a clean 5-membered ring (indole, tryptamine) impossible to close. With both grids a pentagon closes exactly, and the 30° hexagon zig-zag is unchanged.
4. If an atom other than the origin sits within `ghostSnapTolerance` (15px) of that target point, the ghost is mode `"connect"` with `targetAtomId`; otherwise it is mode `"place"` carrying the target `{x, y}` and the currently selected element.
5. Valence is pre-checked before the ghost is accepted: `canAddBond(graph, originAtomId, 1)` always, plus `canAddBond(graph, targetAtomId, 1)` in `"connect"` mode, plus `maxValenceFor(selectedElement) >= 1` in `"place"` mode. A `"connect"` ghost is also suppressed when a bond already exists between the pair. Any failure yields `null` — a ghost is never shown for an action that would be rejected.

`updateGhost(ghost)` compares a cheap string signature against the previous one and only calls `renderer.setGhost(...)` when the ghost actually changed, so ordinary mouse motion does not re-render on every pixel. Motion while a press is in progress clears the ghost, as does `mouseleave`.

`onMouseDown` commits the ghost: when the press is *not* on an atom and `computeGhost(point)` returns a ghost, the action happens immediately and `dragStart` is left `null`, so the subsequent `mouseup` returns early and the "click empty canvas → place isolated atom" branch never runs. Mode `"place"` does `addAtom(element, target.x, target.y)` then `addBond(origin, new)`; mode `"connect"` does `addBond(origin, target)` after re-checking for an existing bond. Presses on an atom, on a bond, or on empty canvas outside any ghost zone behave exactly as before.

`Renderer.setGhost(ghostOrNull)` stores the ghost and re-renders, mirroring `flashAtom`'s pattern; `render()` and `flashAtom(atomId)` keep their signatures. `drawGhost()` draws at `ghostAlpha` (0.38): a single bond line from origin to target, trimmed by `labelClearRadius` at any labeled end exactly like a real bond, plus either the target atom marker (carbon dot or element label in `colorForElement`) for `"place"`, or a soft sky-blue radial halo (`ghostRingColor`, `ghostRingRadius`) around the target atom for `"connect"` — the same gradient construction as the red blocked-atom flash, in a different hue and lower intensity so "connect here" never reads as "blocked".

New tunables: `ghostRadius` and `ghostSnapTolerance` in `INTERACTION_SETTINGS`; `nameFont`, `nameColor`, `nameOffset`, `ghostAlpha`, `ghostRingRadius`, `ghostRingColor` in `RENDER_SETTINGS`.

## Update, later session — fallback-path coverage expansion (2)

Two further generalizations of the general/fallback naming path (`js/naming-core.js`, `js/naming-chain.js`, `js/naming-ring.js`), continuing directly from the multi-occurrence-suffix work already documented above.

**Mixed different-kind functional groups.** Previously, `nameForChain` and all three ring-naming functions (`nameForRing`'s cycloalkane branch, `nameAromaticRing`, `nameHeterocycle`) rejected outright (fell back to the molecular formula) whenever more than one *kind* of principal-eligible functional group was present — e.g. an amino acid, a hydroxy-ketone, or an aminophenol. Fixed by extending the existing seniority-ordered candidate-group selection: `selectRingPrincipal` (`naming-ring.js`) now returns `{ ok, principal, demoted }`, where `demoted` is every non-empty candidate group after the first (highest-seniority) one, instead of failing when more than one group is non-empty. A new `demoteSecondaryGroups(demoted, substituents)` helper (`naming-ring.js`) pushes a `{name, index}` entry into the shared substituent-prefix accumulator for every atom in every demoted group, using a new `SECONDARY_PREFIX_NAMES` table (`naming-core.js`): `acid → carboxy, nitrile → cyano, aldehyde → oxo, ketone → oxo, alcohol → hydroxy, thiol → mercapto, amine → amino`. It returns `false` (causing the caller to bail to `null`, i.e. the formula) only if a present kind has no known prefix name — none currently lack one, so this path is effectively always taken now. All three ring-naming call sites gate on `if (!selection.ok || !demoteSecondaryGroups(selection.demoted, acc.substituents)) return null;`. `nameForChain` has the identical inline logic (its own `groups` array, `principal = groups[0]`, loop over `groups.slice(1)` pushing to `substituents` via `SECONDARY_PREFIX_NAMES`). No new locant-numbering or prefix-rendering code was needed anywhere — `assembleSubstituentPrefix`/`buildRingPrefix` already alphabetize substituent names and collapse repeats into `di`/`tri`/`tetra` by exact string match, so e.g. two demoted `hydroxy` entries automatically become `dihydroxy`.

Verified via hand-built graphs through the real `nameStructure`: alanine (`CH3-CH(NH2)-COOH` → `2-aminopropanoic acid`), serine (`HOCH2-CH(NH2)-COOH` → `2-amino-3-hydroxypropanoic acid`), pyruvic acid (`CH3-CO-COOH` → `2-oxopropanoic acid`), levulinic acid (`CH3-CO-CH2-CH2-COOH` → `4-oxopentanoic acid`), dihydroxyacetone (`HOCH2-CO-CH2OH` → `1,3-dihydroxypropan-2-one`), 4-aminophenol on a benzene ring (→ `4-aminobenzen-1-ol`), 4-aminocyclohexan-1-ol on a cyclohexane ring (→ `4-aminocyclohexan-1-ol`), and a straight chain bearing both a terminal amine and a terminal nitrile (nitrile outranks amine in the seniority order, so it becomes the suffix and the amine is demoted → `4-aminobutanenitrile`) — all correct. Full 30-file regression suite re-run afterward with zero regressions.

**Removed the decane-length and tetra-multiplicity ceilings.** `NAME_ROOTS` (`naming-core.js`) was extended from ten entries (up to `dec`) to twenty (up to `icos`, i.e. C1–C20: `undec, dodec, tridec, tetradec, pentadec, hexadec, heptadec, octadec, nonadec, icos`). `ALKYL_PREFIXES` — previously a separately hardcoded 4-entry array (`methyl, ethyl, propyl, butyl`) — is now derived from `NAME_ROOTS` as `NAME_ROOTS.map(root => root ? root + 'yl' : '')`, so branch substituents up to `icosyl` are nameable and the two tables can no longer drift out of sync. `MAX_NAMED_CHAIN` and `MAX_BRANCH_LENGTH` (previously fixed at `10` and `4`) now both derive from `NAME_ROOTS.length - 1`, so raising the root table automatically raises both limits together. `MULTIPLIER_PREFIXES` (previously `{2: 'di', 3: 'tri', 4: 'tetra'}`) was extended through `10` (`penta, hexa, hepta, octa, nona, deca`), so five or more identical substituents, or five or more occurrences of the same suffix-group kind, are now named instead of triggering a formula fallback.

Extending the multiplier table surfaced a real, previously-unreachable elision bug in `attachSuffix`'s multi-occurrence branch (`naming-core.js`): concatenating a multiplier ending in `a` directly with a vowel-initial suffix word produced incorrect double-vowel forms — `pentaol` instead of `pentol`, `tetraamine` instead of `tetramine`, `tetraone` instead of `tetrone`. (This was latent even at `tetra`, but the mono-`tetra` case never actually surfaced a vowel-initial suffix in prior testing — extending to `penta`+ made it immediately visible via a pentol test case.) Fixed with a one-line elision rule right before the final concatenation: `if (multiplier.endsWith('a') && /^[aeiou]/.test(word)) multiplier = multiplier.slice(0, -1);` — matching real IUPAC names such as `butane-1,2,3,4-tetrol` (erythritol) and `cyclobutane-1,2,3,4-tetrone`. Substituent-prefix multipliers elsewhere (e.g. `tetramethyl`, in `buildSubstituentPrefix`/`buildRingPrefix`) were deliberately left untouched: none of the current substituent prefix names start with a vowel, so the bug can't manifest there, and real IUPAC substituent-prefix elision conventions (e.g. `tetraoxa` vs. `tetroxa`) are inconsistent enough in practice that changing that code wasn't warranted by anything actually reachable.

Verified via hand-built graphs: a 12-carbon and a 20-carbon straight chain (`dodecane`, `icosane`); a 5-carbon chain with an -OH on every carbon (`pentane-1,2,3,4,5-pentol`); a 6-carbon chain with an -OH on every carbon (`hexane-1,2,3,4,5,6-hexol`); a 10-carbon chain with 5 methyl substituents (`2,3,4,5,6-pentamethyldecane`); and a 15-carbon chain with a 10-carbon branch at position 8, where the longest-path search correctly finds an 18-carbon backbone running through part of the original chain plus the entire branch, leaving a 7-carbon substituent (`8-heptyloctadecane`) — confirming the extended tables interact correctly with the existing longest-chain-selection algorithm rather than just being reachable in isolation. Full 30-file regression suite re-run afterward with zero regressions.

## Update, later session — ceilings raised again; branch-substituent components generalized

**Ceilings raised by 10 more each, as requested.** `NAME_ROOTS` extended from C20 (`icos`) to C30 (`heneicos, docos, tricos, tetracos, pentacos, hexacos, heptacos, octacos, nonacos, triacont`), so `MAX_NAMED_CHAIN`/`MAX_BRANCH_LENGTH` (both derived from `NAME_ROOTS.length - 1`) and `ALKYL_PREFIXES` (derived from `NAME_ROOTS`) all move with it automatically — no separate edits needed there, by design from the previous pass. `MULTIPLIER_PREFIXES` extended from 10 (`deca`) to 20 (`undeca, dodeca, trideca, tetradeca, pentadeca, hexadeca, heptadeca, octadeca, nonadeca, icosa`), so up to 20 identical substituents or suffix-group occurrences can be named. Verified: a 30-carbon straight chain (`triacontane`), and a 20-carbon chain bearing an -OH on all 20 carbons — which also exercises the `MULTIPLIER_PREFIXES`+elision path at the new ceiling (`icosane-1,2,...,20-icosol`, correctly eliding `icosa`+`ol` → `icosol` per the existing elision rule from the prior pass). Full 30-file regression suite re-run with zero regressions.

**Branch-substituent components generalized — the bigger piece of this pass.** Investigated why simple, extremely common structures (benzoic acid, benzonitrile, acetophenone, methyl benzoate, allylbenzene, any aldehyde/ketone/acid/ester/nitrile hanging off a ring or off a non-principal chain position) were still falling back to the molecular formula despite the mixed-functional-group and multi-occurrence work already done. Root cause: those groups only reach a chain/ring atom through an intermediate carbon (e.g. `ring–C(=O)OH`, `ring–C≡N` is actually the sole exception that *is* direct — see below), so `classifyAttachment` sees a plain carbon neighbor and routes to `resolveRingAlkylSubstituent`, the single shared branch-substituent resolver used by **both** `nameForChain` and all ring-naming functions (`collectCoreAttachments` calls it for every `{kind: 'alkyl'}` classification). That resolver's candidate list only tried `resolveAlkylBranch` (pure single-bonded carbon chains/isopropyl) plus several exotic scaffold-specific branches (sulfamoylmethyl, triazolylmethyl, etc.) and `resolveCarboxamideBranch` — it never tried the already-existing-but-unwired `resolveAcylBranch`/`resolveAllylBranch` (previously called only from the lysergamide scaffold in `naming-scaffolds.js` for N-acyl/N-allyl substitution), and had no resolver at all for a pendant nitrile, carboxylic acid, or ester group.

Fixed by wiring `resolveAcylBranch` (aldehyde/ketone branches: formyl/acetyl/propionyl/butyryl/valeryl, already existed) and `resolveAllylBranch` (already existed) into `resolveRingAlkylSubstituent`'s candidate chain, and adding two new resolvers plus wiring a third:
- `resolveCyanoBranch` (`naming-core.js`): a branch carbon with exactly one other neighbor being a degree-1, triple-bonded N → `{name: 'cyano', atoms: [...]}`. Distinct from the pre-existing `acc.nitriles` path in `classifyAttachment`, which only fires when a *chain's own terminal atom* triple-bonds directly to N (the true main-chain-nitrile case, e.g. `butanenitrile`); this new resolver instead handles a nitrile hanging off as a pendant substituent not part of the chain/ring's own numbering.
- `resolveCarboxylBranch` (`naming-core.js`): a branch carbon with exactly a degree-1 double-bonded O and a degree-1 single-bonded O (and nothing else) → `{name: 'carboxy', atoms: [...]}`, for a pendant `-COOH` (e.g. `benzoic acid` → the systematic fallback `carboxybenzene`).
- `resolveEsterBranch` (`naming-core.js`): a branch carbon with a degree-1 double-bonded O and a degree-2 single-bonded O (the ester oxygen, which the carboxyl resolver's degree check correctly excludes it from matching), whose other neighbor is a plain alkyl branch → `{name: root + 'oxycarbonyl', atoms: [...]}`, built from `NAME_ROOTS` the same way `classifyAlkoxy` builds `methoxy`/`ethoxy`, so `methyl benzoate` → `methoxycarbonylbenzene` and an ethyl cyclohexanecarboxylate → `1-ethoxycarbonylcyclohexane`. Tried after `resolveCarboxylBranch` in the chain so the two never race (the degree check on the single-bonded O disambiguates them structurally).

All three new/newly-wired resolvers are tried in `resolveRingAlkylSubstituent` — the one place shared by both the chain and ring naming paths — so every one of these groups is now nameable both as a ring substituent and as an off-chain branch, with zero new call sites needed elsewhere. Verified via hand-built graphs: `cyanobenzene` (benzonitrile, built explicitly through an intermediate cyano carbon), `carboxybenzene` (benzoic acid), `acetylbenzene` (acetophenone), `allylbenzene`, `1-formylcyclohexane`, `methoxycarbonylbenzene` (methyl benzoate), and `1-ethoxycarbonylcyclohexane` (ethyl cyclohexanecarboxylate) — all previously formula-only, now all correctly named. Full 30-file regression suite re-run afterward with zero regressions.

Noted but deliberately out of scope: nitro (`-NO2`), sulfonyl/sulfoxide (`S(=O)`, `S(=O)2`), and azide (`-N3`) groups are not reachable through this editor at all — `js/valence.js`'s `MAX_VALENCE` caps N at 3, O at 2, and S at 2, so none of those groups can actually be constructed via the UI's `canAddBond` gate (a nitro nitrogen alone needs valence 4). Expanding naming coverage for structures the editor cannot produce isn't useful, so this was consciously skipped rather than overlooked.

**Update, later session — the above caveat is now fixed. Hypervalent nitro/sulfinyl/sulfonyl/azide groups are constructible and nameable.**

Rather than raising the flat `MAX_VALENCE` caps (which would also legalize invalid bonding patterns, e.g. a 4th single-bonded substituent on nitrogen), `js/valence.js`'s `canAddBond(graph, atomId, deltaOrder, other)` gained a fourth, optional parameter identifying the far side of the hypothetical bond — either an existing atom's id (a real `number`), or an element symbol `string` for a not-yet-created atom (the common case: the ghost-preview/chain-growth gestures create atoms one bond at a time, always starting at order 1, so the far atom often doesn't exist yet when the check runs). When the plain `newTotal <= MAX_VALENCE[element]` check already passes, behavior is completely unchanged (fast path, zero regression risk for every previously-supported bond type). Only when that fails does either of two new exceptions get a chance to fire:

- **Oxo exception** (`HYPERVALENT_OXO_CEILING = { N: 5, S: 6 }`, `HYPERVALENT_MAX_OXO_COUNT = { N: 2, S: 2 }`): classifies each of the atom's bonds (existing, plus the hypothetical one being added/incremented, simulated via `projectedBondsFor`) as either "terminal-oxo" — the far atom is O, has no other bonds besides (optionally) this one, and the bond order is at least `minOxoOrder` — or "normal" otherwise. `minOxoOrder` is 2 for nitrogen (a terminal O only starts counting as oxo once actually double-bonded — nitro's intermediate single-bonded construction step never needs the exception at all, since N's base cap of 3 already has enough headroom for two order-1 substituents plus one alkyl) but 1 for sulfur (S's base cap of 2 is fully consumed by its two mandatory alkyl/aryl substituents before any oxygen is attached at all, so sulfoxide/sulfone construction would be blocked at the very first order-1 S–O bond without this relaxation — the bond is *always* eventually cycled to double before the group is "finished," so treating the pending single bond as oxo-eligible doesn't legalize anything that doesn't already end up realized as a genuine `S=O`). Passes when: sum of "normal" bond orders ≤ the element's base `MAX_VALENCE`, AND terminal-oxo count ≤ the per-element max, AND overall total ≤ the ceiling. This is what correctly still rejects e.g. a 4th plain single-bonded carbon substituent on an already-trisubstituted N (that new bond isn't to a terminal O at all, so it's charged against the normal budget and exceeds it), and a second `=O` on an N that already carries 3 alkyls plus one realized `N=O` (total would exceed the ceiling).
- **Cumulated-nitrogen exception** (azide-only): an N atom's total valence may reach 4 if and only if, after the hypothetical change, that atom has *exactly* 2 bonds and *both* have order exactly 2 — i.e. a fully cumulated `–N=N=N–`-type central nitrogen with zero single-bonded substituents. Verified by hand-tracing azide's real structure `R–Na=Nb=Nc`: only the central atom (`Nb`, two double bonds, total 4) ever needs this exception; the terminal atoms (`Na`: single+double=3; `Nc`: double only=2) stay within the ordinary base cap throughout construction.

All six `canAddBond` call sites in `js/interactions.js` were updated to pass this new `other` argument wherever the far side is knowable at check time: `computeGhost`'s "place" pre-check passes `this.selectedElement`, its "connect" pre-check passes the real target atom id, `growChain` passes `this.selectedElement`, `bondExistingAtoms` passes each atom's counterpart id, and `cycleBondOrder` (the primary mechanism for actually building up to a double bond) passes each bond's other endpoint id. `attachStamp`'s check was deliberately left as a bare 3-argument call — ring stamps are always plain carbon rings, never relevant to this exception, so the flat-cap-only fallback (used whenever `other` is omitted) is correct there.

Naming support for the newly-reachable groups was added alongside, all wired into `resolveRingAlkylSubstituent`'s shared caller `collectCoreAttachments` (so both chain and ring naming get them at once, same pattern as every prior branch-substituent addition): `classifyNitro` (`-NO2` → prefix `nitro`), `classifyAzide` (`-N3`, verified 3-atom cumulated chain → prefix `azido`), and `classifySulfinylOrSulfonyl` (`-S(=O)-R`/`-S(=O)2-R`, branch name built from `ALKYL_PREFIXES` exactly like `classifyThioalkoxy` → `methylsulfinyl`/`methylsulfonyl` etc., suffix chosen by whether 1 or 2 terminal double-bonded oxygens are found).

This surfaced one more pre-existing, unrelated gap while verifying dimethyl sulfoxide/sulfone by hand: `longestCarbonChains` (`naming-core.js`) returned an **empty** chain list — causing `deriveName` to fall back to a bare molecular formula — for *any* molecule whose carbon atoms are fully disconnected from each other (bridged only by heteroatoms), because its BFS-based longest-path search only ever pushes a chain when it finds an actual multi-atom path, and never falls back to treating isolated single carbons as their own length-1 chain candidates the way the true single-carbon-molecule special case already did. This is a surprisingly common shape — plain dimethyl sulfide (`CH3-S-CH3`) was already broken before any of this session's changes and had nothing to do with valence. Fixed with a two-line fallback: when the BFS produces no multi-atom chains at all (`best === 0`), return every carbon id as its own singleton chain, exactly mirroring the pre-existing single-atom special case. Verified: dimethyl sulfide now names as `methylthiomethane` (previously `C2H6S`).

Verified via hand-built graphs exercising `canAddBond` directly through the exact step-by-step sequence a real user would perform via the ghost/chain-growth/bond-cycling UI gestures (not just constructing the final structure and bypassing the gate, as ordinary naming tests do): nitromethane (every intermediate step permitted, final structure correctly named `nitromethane`, and a further bond beyond the ceiling correctly rejected), dimethyl sulfoxide and dimethyl sulfone (`methylsulfinylmethane` / `methylsulfonylmethane` — both real IUPAC-recognized names, the latter being MSM's actual chemical name), azidomethane (`azidomethane`), plus three deliberately-invalid cases confirmed still rejected: a 4th plain-carbon substituent on an already-trisubstituted N, a second oxygen on an N already at 3 alkyls + 1 realized `N=O`, and a 3rd plain-alkyl substituent on an already-disubstituted S. Full 28-file regression suite re-run afterward with zero regressions.

While context remained, also added two more groups that needed no valence change at all (a cumulated `N=C=X` already fits within nitrogen's ordinary base cap of 3, so these were simply missing from the naming engine, not blocked by the editor): `classifyIsocyanate` (`-N=C=O` → prefix `isocyanato`) and `classifyIsothiocyanate` (`-N=C=S` → prefix `isothiocyanato`), both implemented via one shared helper `classifyCumulatedCarbonylImide(graph, adjacency, neighbor, fromId, terminalElement, name)` parameterized on the terminal atom's element, and both wired into the same `collectCoreAttachments` chain as everything else in this session. Verified: `isocyanatomethane` and `isothiocyanatomethane`, both real IUPAC names, hand-built through `nameStructure`. Full 28-file regression suite re-run afterward with zero regressions.

**Update, later session — monocyclic aromatic rings with two heteroatoms are now nameable** (`js/naming-ring.js`). Previously `findRingHeteroatom` hard-rejected (`'invalid'`) any ring with more than one non-carbon atom, meaning every diazine, imidazole, pyrazole, oxazole, isoxazole, thiazole, and isothiazole silently fell back to a bare molecular formula. Replaced with `findRingHeteroatoms`, which returns an array (`null` for zero heteroatoms — unchanged carbocyclic path; a 1-element array — routed to the existing `nameHeterocycle`; a 2-element array — routed to the new `nameDiheterocycle`; `'invalid'` for 3+ or any non-N/O/S heteroatom, same as before).

`nameDiheterocycle` handles exactly the 2-heteroatom case for 5- and 6-membered aromatic rings:
- **6-rings** (pyridazine/pyrimidine/pyrazine): validated with the same `hasAlternatingOrders` check already used for pyridine/benzene — a 6-ring's alternating pattern is position-independent, so no extra structural work is needed beyond checking both heteroatoms are N.
- **5-rings** (imidazole/pyrazole/oxazole/isoxazole/thiazole/isothiazole): reuses `hasFuranPattern(ringOrders, index)` — unchanged from the furan/pyrrole/thiophene case — as a *structural test* to identify which of the two heteroatoms is the "pyrrole-type" one (both its ring bonds single in the Kekulé structure, contributing the aromatic lone pair): only that atom's index satisfies the pattern, regardless of what the second heteroatom is, since an aromatic pyridine-type N slotted into any other ring position preserves the same single/double alternation a carbon would have there. If neither heteroatom satisfies it, the ring isn't a valid aromatic Kekulé structure for this family and naming fails (falls back to formula) rather than guessing.

Numbering is handled by a new `chooseHeteroRingNumbering(size, heteroList, principal, unsaturations, substituents, allowedStarts)`, structurally the same brute-force rotate-and-reflect search as the existing `chooseRingNumbering`, but keyed first on the heteroatoms' own locants (sorted by IUPAC replacement seniority `O > S > N`, ties broken by locant) rather than by the principal-group locants — this is what correctly gives the senior heteroatom locant 1 before anything else is considered, matching the real numbering hierarchy (heteroatoms outrank principal-group/substituent locants). `allowedStarts` restricts the candidate anchor positions to just the heteroatom indices (both, for 6-rings and for symmetric N,N pairs where seniority doesn't break the tie; just the one `hasFuranPattern`-satisfying index, for 5-rings) — provably equivalent to searching every ring position, since only starting *at* a heteroatom can ever put it at locant 1, but far cheaper. Once the winning numbering is found, `gap = secondHeteroLocant - 1` (always ∈ {1,2,3} for 6-rings, {1,2} for 5-rings) keys directly into `DIHETEROCYCLE_NAMES[size + ':' + elementsInSeniorityOrder + ':' + gap]` (e.g. `'6:NN:1'` → pyridazine, `'5:ON:2'` → oxazole). A missing table entry (currently: any O,O / S,S / O,S pair, and 1,2,4-relationships that don't correspond to a real retained name) means the structure falls back to a formula rather than producing a wrong name — a deliberate, documented coverage boundary, not an oversight.

Everything downstream (attachment-collection via `collectCoreAttachments`, principal-group selection via `selectRingPrincipal`/`demoteSecondaryGroups`, prefix assembly via `buildRingPrefix`, suffix assembly via `attachSuffix`) is reused verbatim from the single-heteroatom path, so every substituent/hydroxyl/thiol/amine/ketone-exclusion rule already established for `nameHeterocycle` applies identically here with zero duplication.

Verified via hand-built graphs (explicit Kekulé bond orders, run through `nameStructure`): bare `pyridazine`, `pyrimidine`, `pyrazine`, `imidazole`, `pyrazole`, `oxazole`, `isoxazole`, `thiazole`, `isothiazole` (all 9 previously formula-only, all now correctly named), plus substituent-locant sanity checks `2-methylimidazole` and `4-methylthiazole` (confirming the numbering search correctly threads the heteroatom-first key through to substituent placement). Full 28-file regression suite re-run afterward with zero regressions.

**Update, later session (5) — several extremely common benzene-ring (and general-ring/chain) substituents that previously either failed to name at all or were simply missing.** All wired through the same two shared choke points every prior branch-substituent addition has used — `resolveRingAlkylSubstituent` (for anything reached via a plain `alkyl`-classified first bond) and `collectCoreAttachments`'s classifier chain (for anything needing its own element-specific detection) — so each addition is available to chains and every ring-naming path at once, no new call sites needed.

- **`resolveHaloalkylBranch`** (`naming-core.js`, wired into `resolveRingAlkylSubstituent` right after `resolveAlkylBranch`): previously, any halogen-substituted carbon branch (CF₃, CCl₃, CH₂Cl, 2-chloroethyl, 2,2,2-trifluoroethyl, etc.) hit a hard wall in the plain-chain-only `collectBranch` (which bails the instant a carbon has more than one non-parent neighbor, e.g. 3 fluorines) and caused **total naming failure for the whole molecule** — not just a missing substituent, the entire compound fell back to a bare formula. The new resolver walks a linear carbon chain exactly like `collectBranch` but explicitly permits terminal halogen atoms hanging off any position along the chain, recording each as a `{name, locant}` entry (locant relative to the attachment carbon = 1), then reuses the existing `assembleSubstituentPrefix` (the same multiplier/sort/join logic used for ring substituent prefixes) to build the halogen-cluster prefix before appending the `ALKYL_PREFIXES` root name. Verified: `trifluoromethylbenzene`, `chloromethylbenzene`, `2-chloroethylbenzene`, `2,2,2-trifluoroethylbenzene`.
- **`resolveAlkenylBranch` / `resolveAlkynylBranch`** (wired in right after `resolveAllylBranch`, so the retained name `allyl` still wins over the generic systematic form when it applies): previously a substituent double/triple-bonded starting immediately at the attachment carbon (vinyl/styrene-type, or any simple terminal alkenyl/alkynyl chain) had no matching resolver at all in the chain — `resolveAlkylBranch`'s `collectBranch` requires every bond order 1, `resolveAllylBranch` only matches the specific 3-carbon-with-double-bond-at-the-far-end pattern. The new resolvers walk a linear chain permitting exactly one non-single bond (order 2 or 3) anywhere along it, and build the name via the same `root-locant-en/yn-1-yl` convention `buildStem` already uses for ring `-ene`/`-yne` infixes (`ethenyl`/`ethynyl` with no locant when there's only one possible position; `prop-1-en-1-yl` etc. when a locant is needed). Verified: `ethenylbenzene` (styrene), `ethynylbenzene` (phenylacetylene), `prop-1-en-1-ylbenzene`, with `allylbenzene` confirmed still using the retained name rather than falling through to `prop-2-en-1-yl`.
- **`classifySulfonicAcidOrAmide`** (new classifier, wired into `collectCoreAttachments`'s allow-alkoxy chain after `classifyIsothiocyanate`): handles `-SO₂-OH` (→ prefix `sulfo`) and `-SO₂-NH₂` (→ prefix `sulfamoyl`) directly on a ring — structurally identical to the existing `classifySulfinylOrSulfonyl` detection of the two terminal double-bonded oxygens, but the third substituent is a terminal O/N instead of a carbon branch, which the existing classifier's `collectBranch(...)` call couldn't match (bailing to formula, same total-failure mode as the haloalkyl case). Verified: `sulfobenzene` (benzenesulfonic acid), `sulfamoylbenzene` (benzenesulfonamide).
- **`classifyAminoSubstituent`** (new classifier, same chain, right after the sulfonic/sulfonamide one): `classifyAttachment`'s plain `amine` kind only matches a ring nitrogen of degree 1 (a bare `-NH₂`); any N-alkyl or N,N-dialkyl substitution (`degree` 2 or 3) previously made `classifyAttachment` return `null`, which — since nothing else in the chain handled it either — caused the same total-naming-failure fallback to formula. The new classifier resolves each N-substituent via the existing `resolveAlkylBranch` and builds a substituent prefix (`methylamino`, `dimethylamino`, or the mixed `methyl(ethyl)amino` form, alphabetized) the same way `classifyThioalkoxy` builds `methylthio`. **Documented simplification, not a bug:** this always produces the prefix-only form (e.g. `methylaminobenzene`) rather than promoting the amine to the ring's principal suffix group (`N-methylaniline`) even when nothing else on the ring outranks it — consistent with this project's pre-existing, deliberate choice to keep carboxylic acid/nitrile/ester groups on rings as prefixes only (`carboxybenzene` rather than `benzoic acid`, from an earlier session) rather than a new inconsistency. The un-substituted case (plain `-NH₂`, still routed through the original `classifyAttachment`/principal-group path) is unaffected and still correctly produces the retained name `aniline`. Verified: `methylaminobenzene`, `dimethylaminobenzene`, with plain `aniline` confirmed unaffected.

All five additions verified via hand-built benzene-ring graphs through `nameStructure`, plus regression checks (`chlorobenzene`, `toluene`, `aniline`, `allylbenzene` all still correct). Full 28-file regression suite re-run afterward with zero regressions.

**Immediate follow-up in the same pass:** `classifyAlkoxy`, `classifyThioalkoxy`, and `classifySulfinylOrSulfonyl` were found to have the exact same limitation the haloalkyl fix above addressed for `resolveRingAlkylSubstituent` — they each call `collectBranch` directly, which cannot pass a halogen-substituted carbon, so `trifluoromethoxy`-, `chloromethylthio`-, and `trifluoromethylsulfonyl`-type groups on a ring were still falling back to a formula. Fixed by having each classifier retry with `resolveHaloalkylBranch` when its plain `collectBranch` call comes back empty. The alkoxy case strips the trailing `yl` off the haloalkyl root before appending `oxy` (`trifluoromethyl` → `trifluoromethoxy`), matching the existing elision already used for plain `meth`+`oxy` → `methoxy`; the thio and sulfonyl cases keep the full `yl` form, matching their existing plain-branch naming (`methylthio`, `methylsulfonyl`). `classifyAcyloxy` was left as-is since it only ever matches a fixed acetoxy pattern with no halogen path. Verified `trifluoromethoxybenzene`, `chloromethylthiobenzene`, `trifluoromethylsulfonylbenzene`, with `anisole`/`methylthiobenzene`/`methylsulfonylbenzene` confirmed unaffected. Full 28-file regression suite, zero regressions.

**Update, later session (6) — the methylenedioxybenzene (benzodioxole) fused-ring scaffold no longer requires an amphetamine/phenethylamine side chain.** `nameMethylenedioxyScaffold` (`naming-scaffolds.js`), the recognizer for the MDMA/MDA-family fused benzene+dioxole ring system, previously demanded `matches.length === 1` (exactly one ring position bearing a full amphetamine or phenethylamine chain) and returned `null` — i.e. total formula fallback for the entire molecule — for every other case: the bare ring, or the ring carrying any other substituent (methyl, allyl, halogen, etc.) in place of the amine chain. Fixed by keeping `matches.length > 1` as unsupported but dispatching `matches.length === 0` to a new `nameMethylenedioxyGenericScaffold`, which runs the same `collectCoreAttachments` → `scaffoldSubstituentEntries` → `chooseRingNumbering` → `assembleSubstituentPrefix` pipeline the anchored path already used, just without a fixed anchor locant (`chooseRingNumbering(6, null, [], entries.concat(bridgeEntries), null)` lets the numbering search run unconstrained over all rotations/reflections), then emits `<locants>-methylenedioxy` plus any substituent prefixes with a plain `benzene` suffix — matching the informal "locant-methylenedioxy" style already used for the anchored MDMA/MDA names rather than formal `1,3-benzodioxole` fused-ring numbering. Verified: bare ring → `1,2-methylenedioxybenzene`, ring + methyl → `1,2-methylenedioxy-4-methylbenzene`, ring + an alkenyl branch → `1,2-methylenedioxy-3-prop-1-en-1-ylbenzene`; `MDMA`/`MDA` (anchored, retained-name path) confirmed unchanged. Full 28-file regression suite, zero regressions.

**Same pass:** `nameBenzofuranScaffold` (the fused benzofuran/benzothiophene recognizer behind the FLY/2C-B-FLY bioisostere family) had the identical bug — `matches.length !== 1` returned `null` for anything but a ring bearing exactly one amphetamine/phenethylamine chain, so a bare benzofuran or any plain-substituted one (2-methylbenzofuran, 5-chlorobenzofuran) fell back to a formula. Fixed the same way: `> 1` stays unsupported, `=== 0` dispatches to a new `nameBenzofuranGenericScaffold`, which collects substituents over all six non-fusion ring positions with no anchor and emits `<prefix><benzofuran|benzothiophene>` — the same chain-optional shape `nameIndole` already used as a template. Verified `benzofuran`, `benzothiophene`, `2-methylbenzofuran`, `5-chlorobenzofuran`; anchored FLY-family regression tests (`test_fly.js`, `test_bf.js`, `test_bf2.js`, `test_dragonfly.js`, `test_2cbfly.js`) unaffected. Full 28-file regression suite, zero regressions.

**Also in this pass:** `nameDifuranSaturatedScaffold` (tetrahydrobenzodifuran, the FLY series) and `nameDifuranScaffold` (aromatic benzodifuran, the DragonFly series) had the identical `if (!anchor) return null` shape. Fixed with a shared `nameDifuranGenericCore(graph, idSet, adjacency, skip, visited, candidates, suffix)` helper called from that branch in both functions instead of failing outright — it treats the scaffold's two free arm positions (fixed locants 4 and 8) as ordinary substituent slots and emits `<prefix><suffix>`. Verified `benzodifuran`, `8-bromobenzodifuran`, `4-methylbenzodifuran`; retained-name DragonFly/2C-B-FLY tests unaffected (separate `COMMON_NAMES` lookup path). Full 28-file regression suite, zero regressions.

**Update, later session (7) — five more non-carbon direct-ring-attachment gaps in `classifyAttachment`'s classifier chain fixed.** A systematic sweep (bare benzene + every non-carbon palette element — N, O, S, P, F, Cl, Br, I — under several bonding patterns) found `classifyAttachment` had no branch at all for phosphorus, and no existing classifier handled nitroso, hydrazinyl, or sulfenic-acid patterns; each produced total formula fallback for the whole molecule. Added five new classifiers to `naming-core.js`, all following the existing `genericPrefix`-kind pattern (`{ kind: 'genericPrefix', name, atoms }`, pushed straight into `acc.substituents` by `collectCoreAttachments`) and wired into its `allowAlkoxy` chain right after `classifyAminoSubstituent`:
- `classifyPhosphono` — `Ring-P(=O)(OH)2` (phosphonic acid group), mirrors `classifyPhosphoryloxy`'s O/OH-detection shape but for P attached directly (not via a ring-O bridge); emits prefix `phosphono`.
- `classifyPhosphino` — `Ring-PH2` / `Ring-PHR` / `Ring-PR2`, mirrors `classifyAminoSubstituent`'s 0/1/2-branch alkyl-naming logic (`resolveAlkylBranch` per branch, `di<name>phosphino` when both branches match, `<a>(<b>)phosphino` sorted when they differ); emits bare `phosphino` for `-PH2`.
- `classifyNitroso` — `Ring-N=O` (single terminal oxygen, N at degree 2 total), emits prefix `nitroso`. Distinct from `classifyNitro` (which requires two double-bonded oxygens) by oxygen count, so both coexist in the chain without conflict.
- `classifyHydrazinyl` — `Ring-NH-NH2` (terminal N with no further heavy-atom neighbors), emits prefix `hydrazinyl`. Doesn't collide with `classifyAminoSubstituent` because that classifier's `resolveAlkylBranch` call fails on a nitrogen branch.
- `classifySulfenicAcid` — `Ring-S-OH` (S at degree 2: ring bond + terminal O), emits prefix `sulfeno`. Doesn't collide with `classifyAttachment`'s plain thiol case because thiol requires S degree 1.

Verified via hand-built graphs: `phosphinobenzene`, `dimethylphosphinobenzene`, `phosphonobenzene`, `nitrosobenzene`, `hydrazinylbenzene`, `sulfenobenzene` all now resolve (previously all six were formula fallback). Full 28-file regression suite, zero regressions.

**Known, deliberately unfixed limitation found by the same sweep:** azobenzene-type (`Ar-N=N-Ar'`) and diaryl-disulfide-type (`Ar-S-S-Ar'`) structures still fall back to a formula. These aren't a "substituent on one ring" case at all — the classifier chain investigated here only ever resolves *one* ring's attachments into prefix substituents; when the far end of that attachment is itself a second full aromatic ring, there is no single-ring "core" to name against, structurally the same category of problem as biphenyl. Fixing this would need a dedicated top-level two-aryl-system recognizer (detect `Ar-X-Ar'` bridges and name as `substituted-phenyl` + linker + `substituted-benzene` compound names), which is a materially larger feature than the direct-substituent classifiers added in this pass, so it was left as a known gap rather than attempted here.

**Update, later session (8) — six new stamps added (`js/stamps.js`), plus a real chemistry bug found and fixed in the stamp-placement mechanic itself.** `STAMP_DEFINITIONS` previously only had four all-carbon rings (benzene, cyclohexane, cyclopentane, cyclopropane), each hardcoded to place `'C'` at every vertex. Added `cyclobutane` (4-ring, single bonds), `cycloheptane` (7-ring, single bonds), and three new heterocycles — `pyridine` (6-ring, one `N`, aromatic alternating bonds — reuses the existing aromatic formula unchanged since bond-order parity around an even ring doesn't depend on which vertex holds the heteroatom), `furan`/`thiophene`/`pyrrole` (5-ring, one `O`/`S`/`N` respectively, a new `'furanoid'` bond pattern: both ring bonds touching the heteroatom are single, the other three alternate double/single/double — this is the exact Kekulé pattern `hasFuranPattern` in `naming-ring.js` already expects). `STAMP_DEFINITIONS` entries gained an optional `elements` array (per-vertex element, defaults to all-`'C'` via new `stampElementAt(definition, vertexIndex)`) and, for the furanoid pattern, a `heteroIndex` field so `stampRingBondOrder` can compute bond order relative to wherever the heteroatom sits (`relative = (edgeIndex - heteroIndex + sides) % sides`, `relative % 2 === 0 ? 1 : 2`).

**The bug:** `placeStamp`'s origin-attached branch (dragging a stamp out from an existing atom) always bonds the new ring's *vertex 0* to that origin atom. The first heterocycle implementation put the heteroatom at vertex 0, so attaching e.g. furan to an existing atom bonded a third substituent directly onto furan's oxygen — which is already fully divalent from its two ring bonds — producing an invalid structure that the naming engine nonetheless silently named as `1-methylfuran` (a nonexistent, valence-violating compound), because `placeStamp` builds bonds directly via `graph.addBond` and never goes through the interactive path's `canAddBond` valence check. Caught by a hand-built regression test that placed each new stamp both standalone and attached-to-an-origin-atom, then checked every resulting atom's `totalBondOrder` against `maxValenceFor`. Fixed by moving every heterocycle's heteroatom off vertex 0 (`pyridine`'s `N` to index 3, `furan`/`thiophene`/`pyrrole`'s heteroatom to index 2 via `heteroIndex: 2`), so the attachment vertex is always carbon — verified with the same test: attached furan/thiophene/pyrrole/pyridine now produce valid, valence-correct `3-methylfuran`/`3-methylthiophene`/`3-methylpyrrole`/`4-methylpyridine`, and all ten stamps (standalone and attached) pass the valence check with zero violations. Full 28-file regression suite unaffected (stamps.js is UI-only, not part of the naming engine).

**Update, later session (8), same pass — visual redesign of `index.html`/`css/style.css`.** Reworked the existing dark "lab theme" (dark sidebar, per-element-colored buttons, dark dot-grid canvas — all pre-existing from an earlier session) for more visual depth without adding any external dependencies (still zero build step, zero CDN/font fetches, per this project's standing no-build/dependency-free constraint): sidebar background is now a subtle two-stop gradient with a custom-styled scrollbar (both `scrollbar-color` for Firefox and `::-webkit-scrollbar` for Chromium/WebKit); added a small two-tone gradient accent bar (`.app-accent-bar`, violet-to-cyan) under the sidebar title as the only new decorative element; element/stamp buttons got a subtle vertical gradient background, an inset highlight, and a `translateY(-1px)` lift on hover for tactile feedback; the stamp section was split into "Stamps — carbocycles" and "Stamps — heterocycles" (two `.sidebar-section`s, `#stamp-buttons` and the new `#stamp-buttons-hetero`, both sharing the same `.stamp-button` class so `app.js`'s existing `querySelectorAll('.stamp-button')` wiring needed no changes) to keep the now-ten-stamp list organized; stamp selection highlight color changed from plain white to `--lab-cyan` to read as a distinct state from element selection (which still uses each element's own color via the existing `--accent` custom property pattern); canvas wrapper gained a radial-gradient vignette and the canvas itself an outer drop shadow plus inset highlight for more separation from the page background. No screenshot could be taken to visually confirm this in the current environment (no headless browser / Playwright available), so this was verified by careful manual review of the HTML/CSS only, not a rendered screenshot — flagged to the user rather than claimed as visually verified.

**Update, later session (9) — five more benzene-substituent gaps closed, plus a structural fix so a ring can carry a *second, whole ring* (phenyl/benzyl) as an ordinary substituent instead of only atoms/chains.** A second systematic sweep (carbonyl- and multi-ring-terminated benzene substituents: benzaldehyde, benzoic acid, acetophenone, methyl benzoate, benzamide, benzoyl chloride, styrene, phenylacetylene, thiobenzamide, benzenesulfonyl chloride, diphenylmethane, biphenyl) found five failures beyond what session 7's sweep covered:

- **Acyl halides** (`Ring-CO-X`, e.g. benzoyl chloride): `resolveAcylBranch` (`naming-core.js`) only ever fell through to `collectBranch` for the group opposite the carbonyl oxygen, which — same as every other `collectBranch`-only gap fixed in earlier sessions — cannot terminate on anything but a plain carbon chain. Added a halogen-termination check right before that fallback: when the acyl branch's sole further atom is a `HALOGEN_PREFIXES` element at degree 1, return `<halide>carbonyl` (e.g. `chlorocarbonyl`) instead of falling through. Verified `chlorocarbonylbenzene` (benzoyl chloride).
- **Thioamides** (`Ring-CS-NR2`, e.g. thiobenzamide): `resolveCarboxamideBranch` previously required its double-bonded heteroatom to be oxygen specifically. Generalized to accept either one oxygen *or* one sulfur (mutually exclusive, `oxygens.length + sulfurs.length !== 1` still requires exactly one), tracked via a new `isThio` flag that switches the returned stem between `carbamoyl` and `carbamothioyl`. Verified `carbamothioylbenzene` (thiobenzamide); plain `carbamoylbenzene` (benzamide) confirmed unaffected.
- **Sulfonyl halides** (`Ring-SO2-X`, e.g. benzenesulfonyl chloride): no classifier existed for this pattern at all (the closest match, `classifySulfonicAcidOrAmide`, only recognizes an O or N terminus). Added `classifySulfonylHalide`, structurally the same two-double-bonded-oxygen detection as `classifySulfonicAcidOrAmide` but requiring the third S-substituent to be a `HALOGEN_PREFIXES` element at degree 1; emits `<halide>sulfonyl` (e.g. `chlorosulfonyl`). Wired into `collectCoreAttachments`'s chain immediately after `classifySulfonicAcidOrAmide`. Verified `chlorosulfonylbenzene`.
- **Phenyl/benzyl as a ring substituent** (biphenyl, diphenylmethane): `resolveBenzylBranch` and `resolvePhenylBranch` already existed (used previously only by one narrow sulfanyl-related call site and by alkoxy/N-substituent branches) but were never wired into `resolveRingAlkylSubstituent`, the shared resolver chain every `alkyl`-classified ring substituent goes through — so a second phenyl ring, or a benzyl group, attached directly to a benzene ring had no resolver at all. Appended both to the end of `resolveRingAlkylSubstituent`'s `||` chain.

**A deeper, separate bug surfaced while fixing the phenyl/benzyl case, and needed its own fix in `deriveName`'s routing logic (`naming-core.js`).** `deriveName` decides whether a structure is a plain ring, a fused ring, a tricyclic, or a tetracyclic purely by comparing bond count to atom count on whatever it considers the "core" (after `findPendantRingAtoms` strips off any recognized pendant branch). For two separate benzene rings joined by one bond (biphenyl) or by one bridging carbon (diphenylmethane), *nothing* was stripping the second ring out as a pendant substituent, so the core atom/bond counts landed on `coreBonds === coreAtomIds + 1` (biphenyl) and got misrouted into `deriveFusedName` — which assumes a genuinely fused/bridged bicyclic system sharing atoms, not two disjoint rings — and failed outright, falling back to a formula for the whole molecule (diphenylmethane hit a similar failure via the plain-ring path, since its "core" was two disconnected 6-atom components rather than one connected ring). Fixed by extending `findPendantRingAtoms` to also try `resolveBenzylBranch`/`resolvePhenylBranch` (previously only tried for N/O-attached branches there) as a **general** pendant check, so a second whole ring reachable through a plain single bond gets stripped into the pendant set *before* `deriveName`'s routing decision, leaving a clean single ring as the core.

This stripping needed a correctness guard the existing N/O-gated pendant checks didn't: `resolvePhenylBranch`/`resolveBenzylBranch` are topologically symmetric — they just ask "is there a clean ring on the far side of this bond" — so naively trying them from *every* atom in every direction over-fires in two ways: (1) fired from both rings' connecting atoms simultaneously in a case like biphenyl, stripping both rings and leaving nothing (fixed by skipping any `atomId` already added to the excluded set within the same pass, so whichever ring is reached first in atom-id order keeps its atoms and the other is stripped); (2) fired from a plain substituent atom that happens to have 2+ other bonds (e.g. a `-COOH`/`-COCl`/`-CSNH2` carbon) looking *back* through the ring bond at the entire intact benzene ring on the other side and incorrectly concluding *the ring itself* is the pendant branch to strip, inverting which side should be the core — this doesn't matter for a simple resolver test (which only asks "is there a ring here", not "which side is bigger/more senior"), so it needed an explicit ring-membership check. Added `isConfirmedRingAtom(adjacency, atomId, excludeId)`: builds `atomId`'s own connected component with `excludeId` removed, runs the existing leaf-stripping `trimToRing`, and only returns true if `atomId` itself survives in a ring of size ≥ 3 — i.e., confirms `atomId` is genuinely part of a ring on its *own* side of the bond before allowing the far side to be treated as a pendant branch. Gated both new pendant checks on this instead of a cruder degree-count heuristic (an earlier attempt at this used "remaining degree ≥ 2 after excluding the branch neighbor," which correctly blocked the CHO-carbon misfire but not the COOH/COCl/CSNH2 misfire, since those substituent carbons also happen to have degree ≥ 2 from their own double/branch bonds).

**Update, later session (10) — seven more ring stamps (`imidazole`, `pyrazole`, `thiazole`, `oxazole`, `piperidine`, `morpholine`, `cyclooctane`), plus a previously-nonexistent saturated-heterocycle naming path.** Added seven new entries to `STAMP_DEFINITIONS` (`stamps.js`), bringing the total to 17. The four new aromatic diheterocycles reuse the existing `'furanoid'` `bondPattern` (originally built for single-heteroatom 5-rings like furan/thiophene/pyrrole) — confirmed it generalizes correctly to two-heteroatom 5-rings as long as `heteroIndex` points at the "pyrrole-type" atom (the one whose both ring bonds are single, e.g. imidazole's N1, thiazole's S1); `elements` arrays for all four were derived by manually rotating the canonical ring order to match `stampRingBondOrder`'s bond-alternation math. `imidazole` needed one fix: the first attempt used `elements: ['C','C','N','N','C']`, which put the two nitrogens *adjacent* — that's pyrazole's topology, not imidazole's (imidazole's N's are 1,3 to each other) — caught by the standalone-name regression check (`nameStructure` returned `"pyrazole"` for the imidazole stamp), fixed to `elements: ['C','C','N','C','N']`. `piperidine` and `morpholine` are the first *saturated* heterocycle stamps in the project (`bondPattern: 'single'` with an `elements` array); `cyclooctane` is a plain 8-membered carbocycle, no new pattern needed.

**Adding the piperidine/morpholine stamps exposed a real, pre-existing gap in the naming engine, not a stamp bug: there was no recognizer for saturated heterocycles at all.** `nameHeterocycle`/`nameDiheterocycle` (`naming-ring.js`) only ever handled aromatic rings — both are gated on Kekulé-alternation checks (`hasAlternatingOrders`/`hasFuranPattern`) that always fail for an all-single-bond ring — so unsubstituted piperidine/morpholine fell all the way through to a bare-formula fallback (`C5H11N`, `C4H9NO`). Added two new sibling functions, `nameSaturatedHeterocycle` and `nameSaturatedDiheterocycle`, structurally identical to `nameHeterocycle`/`nameDiheterocycle` except gated on `ringOrders.every(order => order === 1)` instead of the alternation checks, backed by new lookup tables `SATURATED_HETEROCYCLE_NAMES` (`'6:N'` → piperidine) and `SATURATED_DIHETEROCYCLE_NAMES` (`'6:ON:3'` → morpholine, keyed by ring size + sorted heteroatom elements + locant gap between them, same key shape as the existing aromatic `DIHETEROCYCLE_NAMES`). Wired both into `nameForRing`'s hetero-dispatch as an `||` fallback after the aromatic namer returns null, so aromatic rings are always tried first and saturated rings are recognized only when the aromatic path can't apply. Both reuse the same numbering utilities (`chooseRingNumbering`/`chooseHeteroRingNumbering`) and the same `collectCoreAttachments` substituent-collection loop as every other ring namer in the file — no new numbering logic was needed, only the bond-order gate and the saturated name tables.

**A substituted piperidine specifically (e.g. 4-methylpiperidine) still failed after the above fix**, even though unsubstituted piperidine and both substituted/unsubstituted morpholine all worked — an asymmetry traced to `findPendantRingAtoms` (`naming-core.js`), not to the new saturated-heterocycle functions themselves. Five of that function's pendant-branch resolvers (`resolveTriazolylMethylBranch`, `resolveSulfamoylMethylBranch`, `resolveAzacyclylMethylBranch`, `resolveOxazolidinonylMethylBranch`, and `resolvePiperidin4ylBranch`) were called unconditionally for every order-1 bond in the molecule, with no directionality guard, on the assumption that `atomId` (the `fromId` argument) is always some genuine "core" atom looking outward at a named ring/heterocyclic substituent attached to it. That assumption breaks when the *entire rest of the molecule* is nothing but that one exocyclic atom: for a piperidine ring with a single plain methyl substituent, `resolvePiperidin4ylBranch` was called with the methyl carbon as `fromId` and the ring carbon directly opposite the nitrogen as `startId` — and since that ring carbon genuinely is a valid piperidin-4-yl attachment point, the resolver matched and stripped the *entire six-membered ring* into the pendant-branch set, leaving only the lone methyl carbon as "core." `deriveName` then had nothing ring-shaped left to route to, and fell back to a bare formula. Root-caused with a minimal hand-built `Graph` (a bare 6-ring with `elements = ['C','C','C','N','C','C']` plus one exocyclic methyl on a ring carbon, bypassing `placeStamp` entirely) that reproduced the bug directly, confirming it lived in the naming engine and not in stamp placement. Fixed by adding a `hasExternalAnchor = neighbors.length > 1` guard (true only when `atomId` has some bond *besides* the one being resolved, i.e. is not itself a bare leaf) in front of all five of those resolver calls — this matches how the function is actually used correctly elsewhere (e.g. a piperidin-4-yl group reached through a `-CH2-` linker off a larger amine chain, where the linker carbon has two bonds, not one) while blocking the degenerate case where the "core" side is nothing but the one substituent atom itself. Verified with the same minimal repro (now returns `"4-methylpiperidine"`) and with the full new-stamps test sweep (all 7 new stamps, both standalone and attached-with-substituent, name correctly with zero valence violations) and the full regression suite (34 pre-existing scratchpad test files, zero regressions).

**Update, later session (11) — four more saturated-ring stamps (`pyrrolidine`, `azetidine`, `piperazine`, `thiomorpholine`), extending session 10's new saturated-heterocycle infrastructure rather than adding anything structurally new.** Since `nameSaturatedHeterocycle`/`nameSaturatedDiheterocycle` and their name tables (`SATURATED_HETEROCYCLE_NAMES`, `SATURATED_DIHETEROCYCLE_NAMES`) already existed, this was purely a matter of adding table entries — `'5:N'` → pyrrolidine, `'4:N'` → azetidine, `'6:NN:3'` → piperazine, `'6:SN:3'` → thiomorpholine (same size+elements+locant-gap key shape as session 10's `'6:ON:3'` → morpholine) — plus four matching `STAMP_DEFINITIONS` entries in `stamps.js`.

**Azetidine's standalone case exposed a second, unrelated pre-existing pendant-stripping bug, structurally identical in shape to session 10's piperidin-4-yl bug but in a completely different function.** `findAzetidideRingAtoms` (`naming-core.js`) is an older mechanism, unrelated to `findPendantRingAtoms`, that recognizes when a nitrogen closes a 4-membered ring with exactly three carbons and treats the three ring carbons as a pendant `azetidide` unit — the naming-engine machinery behind lysergic-acid-azetidide-type amide names (the 4-ring counterpart to the project's existing pyrrolidide/piperidide amide handling, e.g. LSZ = lysergic acid 2,4-dimethylazetidide). It iterates every nitrogen in the molecule and fires on *any* pair of its single-bonded neighbors that close such a ring, with no check that the nitrogen has any bond beyond the ring itself — so a bare, unsubstituted azetidine ring (a plain secondary-amine `NH` with exactly two neighbors, both ring carbons) matches the exact same pattern the function was written to detect on an *amide* nitrogen, and got its three ring carbons silently stripped as a "pendant `azetidide`" of nothing, leaving `deriveName` with only a lone nitrogen and falling back to the formula `C3H7N`. Root-caused with the same class of minimal hand-built-`Graph` repro used in session 10 (a bare 4-ring `['C','C','N','C']`, no `placeStamp`), which reproduced the bug directly and confirmed no `nameSaturatedHeterocycle` debug output was ever reached — i.e., the ring was being stripped before `deriveRingName` was even called. Fixed with the same shape of guard as session 10's fix: `findAzetidideRingAtoms` now skips any nitrogen whose total neighbor count is 2 or fewer (`allNeighbors.length <= 2`) before attempting to resolve a ring off it, since a nitrogen with only its two ring bonds has no external amide/anchor connection at all. Verified: standalone and substituted azetidine now both name correctly (`azetidine`, `3-methylazetidine`); the pre-existing LSZ regression test and a hand-built plain-azetidide-amide case (`6-methyl-azetidide`) both still resolve correctly after the fix, confirming the legitimate amide-nitrogen use case (where the nitrogen has a third, exocyclic bond) is untouched. Full 34-file regression suite and the new 4-stamp sweep (standalone + attached, zero valence violations) both pass with zero regressions.

**Update, later session (12) — two more saturated-ring stamps, `tetrahydrofuran` and `tetrahydrothiophene` (the saturated single-oxygen/sulfur 5-ring counterparts of furan/thiophene).** Added `'5:O'` → `{ stem: 'tetrahydrofuran', bare: 'tetrahydrofuran' }` and `'5:S'` → `{ stem: 'tetrahydrothiophen', bare: 'tetrahydrothiophene' }` to `SATURATED_HETEROCYCLE_NAMES` (`naming-ring.js`) and matching `STAMP_DEFINITIONS` entries (`stamps.js`), both plain `bondPattern: 'single'` 5-rings with the heteroatom at vertex index 2 (attachment vertex stays carbon, same convention as every other stamp since session 8's valence fix). No new naming-engine mechanism needed — this round landed cleanly on the first try with no pendant-stripping surprises, unlike sessions 10 and 11's azetidine/piperidine rounds, confirming the `hasExternalAnchor`/neighbor-count guards added in those two sessions generalize correctly rather than being narrow one-off patches. Verified standalone (`tetrahydrofuran`, `tetrahydrothiophene`) and substituted (`3-methyltetrahydrofuran`, `3-methyltetrahydrothiophene`) with zero valence violations, and the full 34-file regression suite with zero regressions.

**Update, later session (13) — one more saturated-ring stamp, `azepane` (the saturated 7-membered nitrogen ring, paralleling the existing plain-carbocycle `cycloheptane` stamp).** Added `'7:N'` → `{ stem: 'azepan', bare: 'azepane' }` to `SATURATED_HETEROCYCLE_NAMES` and a matching `STAMP_DEFINITIONS` entry (`elements: ['C','C','C','N','C','C','C']`, `bondPattern: 'single'`, N at vertex index 3 so the attachment vertex stays carbon). Table-driven addition, same shape as sessions 11–12; no engine changes needed and no new pendant-stripping issue surfaced. Verified standalone (`azepane`) and substituted (`4-methylazepane`) with zero valence violations, and the full 34-file regression suite with zero regressions.

**Update, later session (14) — closed a UI gap: 14 of the 24 `STAMP_DEFINITIONS` entries (everything added in sessions 10–13: `imidazole`, `pyrazole`, `thiazole`, `oxazole`, `piperidine`, `morpholine`, `cyclooctane`, `pyrrolidine`, `azetidine`, `piperazine`, `thiomorpholine`, `tetrahydrofuran`, `tetrahydrothiophene`, `azepane`) had no sidebar button in `index.html`, so they were reachable from the naming/placement engine but never from the actual UI.** `app.js`'s stamp-button wiring is purely data-driven (`querySelectorAll('.stamp-button')` + each button's `data-stamp` attribute, no per-stamp special-casing), so this was a pure markup gap, not a code gap. Added the missing `<button class="stamp-button" data-stamp="...">` markup for all 14, added `cyclooctane` to the existing "Stamps — carbocycles" section, split what was a single "Stamps — heterocycles" section into two — "Stamps — aromatic heterocycles" (pyridine, furan, thiophene, pyrrole, imidazole, pyrazole, thiazole, oxazole) and a new "Stamps — saturated heterocycles" (azetidine, pyrrolidine, tetrahydrofuran, tetrahydrothiophene, piperidine, morpholine, piperazine, thiomorpholine, azepane) — since a single flat list of 12 heterocycles would be hard to scan. The new section uses a new container id, `#stamp-buttons-saturated`, added to `css/style.css`'s existing shared grid rule (`#stamp-buttons, #stamp-buttons-hetero, #stamp-buttons-saturated { display: grid; ... }`) alongside the other two stamp-button containers — no new CSS class needed since `.stamp-button` styling is already container-agnostic. Verified with a Node script that scrapes every `data-stamp` attribute out of `index.html` and every top-level key out of `STAMP_DEFINITIONS` and diffs them: all 24 keys now have exactly one matching button, zero orphaned definitions and zero dangling `data-stamp` references.

Verified via hand-built graphs through `nameStructure`, covering both the new gaps and non-regression of every case from session 7's sweep plus plain substituents already relying on `findPendantRingAtoms` (N-benzyl/O-benzyl): `chlorocarbonylbenzene`, `carbamothioylbenzene`, `chlorosulfonylbenzene`, `benzylbenzene` (diphenylmethane), `phenylbenzene` (biphenyl), `formylbenzene`, `carboxybenzene`, `acetylbenzene`, `methoxycarbonylbenzene`, `carbamoylbenzene`, `ethenylbenzene`, `ethynylbenzene` all correct. Full 33-file scratchpad regression suite (tryptamine/lysergamide/phenethylamine/triptan families) re-run afterward with zero regressions.

## Update, later session (15+)

- `naming-chain.js`: `nameAcyclicAcylDerivative` names esters, amides, urea, carbamates, carbonates and anhydrides via a "virtual acid" (hetero atom turned into OH in a cloned Graph). Helpers: `buildVirtualAcid`, `acylStemFromAcid`, `nameAcidPart`, `resolvePlainAlkylSide`. `buildMultiUnsaturationStem` gives dienes, polyenes and enynes; locant objects carry a `doubles` list used as a tie-break in `shouldReverseChain`.
- `naming-ring.js`: oxirane/aziridine/thiirane/oxetane/thietane/oxane/thiane/oxepane rows in `SATURATED_HETEROCYCLE_NAMES`. `classifyBenzenePrincipal` / `nameBenzenePrincipalRing` give benzoic acid, benzoates, benzamides, benzonitrile, benzaldehyde. Carbocycles omit the locant when a lone suffix is present (`cyclohexanol`).
- `naming-scaffolds.js`: `isNaphthalenoidAromatic` makes naphthalene/quinoline recognition Kekule-form independent.
- `naming-core.js`: early aminorex hook in `deriveName` (pendant-ring stripping had hidden it). `resolveGenericSubstituent` is a recursive branched-substituent namer (isobutyl, sec-butyl, tert-butyl, 1,2-dimethylpropyl, ...), with `RETAINED_SUBSTITUENT_NAMES`.
- `stamps.js` / `index.html`: oxirane, aziridine, oxetane, oxane stamps and buttons (28 total).
- Lesson: `test_aminorex.js` printed formulas while an earlier check only compared name-shaped output, hiding a regression. Inspect the actual output.
- Known gaps: acyl halides, acylamino substituents (paracetamol), hydrazine/imines/disulfides/guanidine, aromatic ketones, purines, sugars, Kekule sensitivity in indole/carboline recognizers.

### General fallback engine (`js/naming-general.js`, later session 15+)

A structure-independent IUPAC-style namer, so unlisted molecules still get a real name. Loaded after `naming-scaffolds.js`, before `naming-core.js`.
- `generalName(graph, atomIds, allowRings)`: entry point. `nameStructure` calls it first for acyclic molecules (skipped when a C(=O)X acyl derivative is present, since `nameAcyclicAcylDerivative` owns those), and after `deriveName` fails for ring molecules. It also overrides `deriveName` when that name contains carboxy/cyano/formyl/oxo/acetyl/carbamoyl (a principal group demoted to a prefix) — unless `deriveName`'s result is a finalized trivial scaffold name (see the `isFinalizedScaffoldName` note under "Noramine family" below), in which case the override is skipped entirely since those names already fold such groups in as ordinary prefixes.
- **Bug found and fixed (dispatch order in `nameStructureOnce`, `js/naming-core.js`).** This section's own description above ("`generalName` ... after `deriveName` fails for ring molecules") was the *intended* order but not what the code actually did: `nameStructureOnce` called `generalName` unconditionally first and only fell back to `deriveName` when it returned falsy, for both acyclic and ring molecules. This silently starved every scaffold recognizer under `deriveName`/`deriveTricyclicName` (carboline, tetrahydrocarbazole, noramine, difuran, aminorex, the tetra-/pentacyclic ergoline and morphinan tiers) whenever `generalName` happened to also produce *some* valid systematic name for the same molecule — which it increasingly can as its functional-group coverage (acids, amides, etc.) has grown. Fixed by swapping the try order to `deriveName` first, `generalName` as fallback, matching the order this doc already described. Verified against the full regression sweep (all `test_morphinans.js`, `test_opioids_misc.js`, every triptan/ergoline/FLY/tryptamine test file) with zero output changes other than the noramine fix below.
- Parent selection: principal-group ranks (acid 1, nitrile 2, aldehyde 3, ketone 4, alcohol 5, amine 6, thiol 7). Best rank in the molecule decides the parent. Chains maximise principal-group count, then length, then multiple bonds, then substituent count. Orientation is chosen by principal locants, multiple bonds, prefix locants, then alphabetical order.
- `genSubstituent` is the recursive substituent namer (halo, hydroxy, oxo, alkoxy, amino with N-substituents, nitro, sulfanyl, carboxy/cyano/formyl, branched alkyl/alkenyl with retained isopropyl/isobutyl/sec-butyl/tert-butyl, ring substituents).
- Ring support: any number of separate simple rings (bridge-aware detection in `genRingAtoms`); fused/bridged systems return null. Ring parent picks by principal group, then N, hetero, size. Ring parents use `deriveName` for heteroring base names; benzene specials (phenol, aniline, benzoic acid, and so on).
- Known gaps: fused/spiro/bridged ring systems, ring assemblies (`biphenyl`), heteroatom-only chains (hydrazine, disulfides), imines, acyl halides and acylamino inside ring molecules. Partial stereochemistry support exists (see "Stereochemistry (R/S, E/Z)" section below); multi-stereocenter locant-precise descriptors now cover the chain tier, ring tier, ring-direct stereocenters and the ergoline/lysergamide scaffold (C5/C8); the remaining stereo gap is fixed-numbering scaffolds other than ergoline (morphinan C9/C13/C14, aminorex), which still get no descriptor rather than a guessed one.

### General engine: acid derivatives, hetero and polycycle additions (later session)
- Acyl principal groups in naming-general.js: `genAcylKind` classifies a carbonyl carbon as ester/halide/amide; `genClassifyPrincipal` ranks them 1.3/1.5/1.7 (sulfonic acid 1.1, sulfonamide 1.8). `genBestRank` also probes each carbon with its carbon neighbour as chain so terminal acyl carbons are found.
- `genEsterWord` and `genFinishAcyl` add the alkyl-ester word and the halide word ("benzoyl chloride", "methyl benzoate") for chain, ring and polycycle parents.
- `genNameHetero` covers water/ammonia, sulfides, di/polysulfides, peroxides, hydrazines, hydroxylamines, sulfoxides, sulfones, isocyanates and isothiocyanates. `genSubstituent` emits (R-sulfonyl)/(R-sulfinyl) prefixes.
- Polycycles: `genNamePoly` (von Baeyer bicyclo and spiro, with hetero replacement prefixes).
- `genHasAcylDerivative` now only blocks the acyclic path for carbonyls with 2+ hetero neighbours (urea, carbamate, carbonate), S-acyl or ring/multiple-bonded N.
- Ring parents with an attached suffix (carboxamide, carboxylic acid) always carry a locant on heterocycles ("pyridine-3-carboxamide").

### Ring assemblies and click-to-copy
- `genFindAssembly` finds chains of identical simple rings joined by direct single bonds; `genAssemblyBest`/`genAssemblyScore`/`genAssemblyCompare` pick numberings (link locants, then principal groups, attachment, prefixes); `genNameAssembly` formats "[1,1'-biphenyl]-4-amine", "2,2'-bipyridine", "1,1':4',1''-terphenyl", "bi(cyclohexyl)" and "-yl" substituent forms. Hooked in `genNameWithRing` and `genRingSubstituent`; `genEvaluateRing` takes a `skip` set of link atoms.
- Several unfused rings on one chain with no principal group use the chain as parent ("diphenylmethane").
- `nameStructure` prefers the general name when it contains primed locants.
- Renderer records `nameBoxes` for each drawn name; `Renderer.copyName` writes to the clipboard (with textarea fallback) and shows "(copied)"; `Interactions.onMouseDown` checks `nameAt` first and sets a pointer cursor on hover.

## Fused polycycle templates and generalized ergolines

- `GEN_FUSED_TEMPLATES` in `js/naming-general.js` lists retained fused parents (naphthalene, anthracene, phenanthrene, pyrene, fluorene, carbazole, dibenzofuran, dibenzothiophene, acridine, xanthene, thioxanthene, phenazine, phenothiazine, phenoxazine, indole, benzofuran, benzothiophene, benzimidazole, quinoline, isoquinoline) with IUPAC locant labels, ring bonds, hetero positions, sp3 atoms and indicated hydrogen.
- `genNameFused(ctx, comp, rank, attachId)` matches a ring component to a template by element-aware subgraph isomorphism (`genFusedMatches`), checks mancude saturation (`genFusedSaturationOk`) or full saturation giving `<n>hydro` (`genFusedFullySaturated`), picks the lowest-locant numbering with `genEvaluateRing`, and builds parent, suffix or `-yl` names. It returns `undefined` when no template fits, so `genNamePolyCore` falls back to von Baeyer names.
- **`genRingSubstituent` tetrazole/triazole/oxadiazole gap (alfentanil), fixed.** `genRingSubstituent(ctx, id, fromId, depth)` — used when a ring hangs off a chain as a substituent, e.g. alfentanil's amide nitrogen walking through a piperidine to a pendant ethyl-tetrazolone ring — first calls `genRingBaseName(ctx, cycle)`, which for any heterocycle delegates to the *older* `deriveName(ctx.graph, cycle)` engine (`naming-ring.js`'s `SATURATED_DIHETEROCYCLE_NAMES` table has no tetrazole/triazole/oxadiazole/thiadiazole entries at all). When that returns `null`, `genRingSubstituent` used to return `null` unconditionally — even though `GEN_FUSED_TEMPLATES` and `genNameFused` (the *newer* engine) already support these rings, including `attachId`-based `-yl` substituent output and partial-saturation hydro-prefixes, and this exact fallback pattern was already used elsewhere (`genNameRingParentCore`'s rank-4 case). Fixed by adding: when `genRingBaseName` returns falsy and the cycle contains a heteroatom, fall back to `genNameFused(ctx, new Set(cycle), null, fromId)` before giving up. This one fallback closed the whole gap — no template changes were needed since the tetrazolone template already existed. Verified against alfentanil's SMILES (`CCC(=O)N(C1=CC=CC=C1)C2(CCN(CC2)CCN3C(=O)N(N=N3)CC)COC`), which previously fell all the way back to a bare molecular formula (`C21H32N6O3`, no ring could be named at all) and now produces `N-(1-(2-(4-ethyl-5-oxo-4,5-dihydro-1H-tetrazol-1-yl)ethyl)-4-methoxymethylpiperidin-4-yl)-N-phenylpropanamide`, keyed in `COMMON_NAMES` to `alfentanil`. Full 29-file regression suite re-run clean.
- `genLocantValue` accepts letter locants (4a, 10b). Ring N atoms no longer count as amine groups in `genRingGroups`.
- `nameStructure` now looks up `COMMON_NAMES` with the original derived name before applying the general-name override.
- `nameErgoline` in `js/naming-scaffolds.js` handles 9,10-ene, 8,9-ene and saturated ergolines with any C8 substituent through `genericErgoline`, giving names such as 6-methylergoline and 6,8-dimethyl-8,9-didehydroergoline.

## General von Baeyer numbering (3+ rings)

- `genVonBaeyerNumberings(ctx, comp)` in `js/naming-general.js` is called from `genPolyNumberings` when a ring component has 3 or more rings. It enumerates the largest cycles (`genEnumerateCycles`), picks the largest main bridge (`genBridgeCandidates`) and the most symmetric division, decomposes the remaining independent secondary bridges (`genSecondaryBridges`), and returns every numbering with the lowest superscript locants, with descriptors like `tricyclo[3.3.1.1³,⁷]decane` (adamantane) and `pentacyclo[4.2.0.0²,⁵.0³,⁸.0⁴,⁷]octane` (cubane).
- `genNamePolyCore` inserts a hyphen between the prefixes and a stem that starts with a locant.
- `nameErgoline` now checks the indole part by counting one in-ring double bond per carbon, so it is independent of the Kekulé form drawn.

## Properties side panel

- `js/properties.js`: `computeProperties(graph, atomIds)` returns formula, average/exact mass, ring and aromatic ring counts, H-bond donors/acceptors, rotatable bonds, TPSA (Ertl table), Wildman-Crippen logP (full atom typing, matches RDKit, mean error 0.003 on 66 molecules), Lipinski and Veber flags, ionizable-group notes and a SMILES string. Hydrogens are implicit (max valence minus bond orders). Aromaticity is perceived per 5-7 membered ring by Huckel electron count. SMILES comes from a rank-refined DFS with ring-closure digits.
- `nameStructureDetailed(graph, atomIds)` in `js/naming-core.js` returns `{full, common}`; `nameStructure` returns `common || full`.
- Right-clicking a name label (hit-tested through `renderer.nameAt`, whose boxes carry `atomIds`) calls `interactions.onNameContext`, which opens `#info-panel`. The panel tracks the component through an anchor atom id and rebuilds from `renderer.afterRender` when the structure signature changes; it closes when the component disappears.
- Benchmarked against RDKit (logP, TPSA); caffeine logP is 0.18 low, everything else matches.

## PubChem lookup

- `js/pubchem.js`: `pubchemLookup(smiles)` resolves a CID through PUG REST, then fetches title, IUPAC name, XLogP3, complexity, charge and synonyms, plus experimental traits (physical description, melting/boiling point, density, solubility, vapor pressure, flash point, measured logP, pKa, refractive index) through PUG View, one heading per request. Results are cached per SMILES. CORS is open on PubChem, so it runs directly from the page.
- The panel shows a "Look up on PubChem" button (opt-in, since it sends the structure to a third party). Unknown structures show "Not found". Wiring is in `js/app.js` (`pubchemPrompt`, `pubchemHtml`, `runPubchem`).
- Extended lookup: safety (GHS signal, pictograms, hazard statements), toxicity (LD50/LC50 lines and summary), pharmacology (MeSH pharmacological classes, drug classes, ATC, mechanism of action), CAS, InChI/InChIKey, spectra availability, and outbound links (spectra, literature, patents, ChEMBL, DrugBank, Wikipedia, PDSP). Requests go through a 3-slot queue with retry on 429/503 because PubChem throttles parallel calls.
- `receptorData(chemblIds, inchikey)` sits behind a "Load receptor data" button. Agonist/antagonist roles and targets come from the Open Targets GraphQL API (ChEMBL IDs are taken from PubChem synonyms; clinical drugs only). Measured human Ki values come from the ChEMBL REST API by InChIKey. ChEMBL is intermittently down (HTTP 500), so requests retry on 5xx and the panel reports when Ki data is unavailable.
- The PubChem chemical-target table (`sdq` API) was tried and rejected: its compound filter returns rows for unrelated compounds.

## Undo/redo (js/history.js)
`History` keeps JSON snapshots of `{atoms, bonds, nextAtomId, nextBondId}`. `app.js` chains `renderer.afterRender` so every render calls `history.commit()`, which pushes only when the snapshot differs from the current one (so hover renders and undo/redo restores add nothing). Committing after an undo drops the redo tail. Limit 200 states. Ctrl+Z undoes, Ctrl+Shift+Z or Ctrl+Y redoes; Undo/Redo buttons sit in the sidebar foot and are disabled when unavailable.

## Saved stamps (middle-click)
Middle-click on an atom, bond or name calls `interactions.onSaveStamp(atomId)`. `app.js` copies that connected component (atoms with ids, bonds) into `savedStamps` with a label from `nameStructure`, stores the list in `localStorage['savedStamps']` (try/catch) and re-renders the "Saved stamps" sidebar section. Each entry is registered in `CUSTOM_STAMPS` (js/stamps.js) under a `custom:<time>` key. Saved buttons behave like built-in stamps; right-click removes one. `placeStamp` delegates custom keys to `placeCustomStamp`: standalone placement centers the centroid at the click; attached placement rotates the stamp so its atom farthest from the centroid becomes the anchor bonded to the origin atom at the snapped target.

## Common-name batch and inorganic names
`COMMON_NAMES` (js/naming-core.js) gained about 50 systematic-to-trivial entries (aspirin, paracetamol, ibuprofen, glycerol, solvents, dicarboxylic acids, cresols, benzoquinone, niacin and others). `nameStructureDetailed` now also looks the final `full` name up in `COMMON_NAMES`, because names produced by the `generalName` fallback never matched the earlier primary/derived lookup. `INORGANIC_NAMES` maps Hill formulas (H2O4S, H3O4P, HNO3, Cl2O2S and others) to names when no organic name exists; before this they were shown as bare formulas. The nicotine misname was fixed in `genNameWithRing`, which now only takes the chain-as-parent route when the chain touches at least two rings.


## Ring-ketone naming, extra templates and prefix ordering

`genKetoneMatching` in js/naming-general.js finds the maximum set of in-ring double bonds when ring `=O` atoms and inert ring O/S atoms are blocked. `genNameFusedKetone` uses it to name lactams and ring ketones: non-indicated parents get added hydrogen in parentheses ("pyridin-2(1H)-one"), indicated parents pick the lowest free position as indicated hydrogen so the remaining hydro list is even ("1,3-dihydro-2H-indol-2-one"). `genCompareRingOrientation` gained an `hpos` key so numberings with lower hydro positions win. Templates with `ketoneOnly` are only used in this mode. Hetero monocycles are excluded from the `lone` rule so lactams and lactones always get a locant.

Substituent ordering: `assembleSubstituentPrefix`, `genSortKey` and `genMult` ignore a leading "(" and "tert-" when alphabetising, and write "di-tert-butyl" style multiples with a hyphen. Multiples of a parenthesised substituent use bis/tris/tetrakis.

One-carbon substituents (`resolveGenericChainBranch` in js/naming-core.js and `resolveHaloalkylBranch`) no longer get a "1-" locant, and are parenthesised: "3-(hydroxymethyl)pyridine", "4,5-bis(hydroxymethyl)-2-methylpyridin-3-ol", "1-(chloromethyl)-2-methylbenzene".

## Partial hydro mode, Kekulé variants, azo/diazene, genMany

- `genNameFused` (naming-general.js) tries three modes in order: mancude, ketone (`genNameFusedKetone`), then partial hydro (`genFusedHydroSet`), which emits "N,M-dihydro" / "tetrahydro" prefixes and records `hydroIdx`/`hpos`. Templates flagged `ketoneOnly` join only the ketone and partial modes, and partial mode needs at least one in-ring double bond so saturated lactams keep their "-idin-2-one" names.
- Templates added: 2-benzofuran, 2-benzothiophene, isoindole, naphthyridines, pteridine, 1,4-benzodiazepine, dibenzo[b,f]azepine, azulene, 1,10-phenanthroline, 1,4-benzodioxine, indolizine, imidazo[1,2-a]pyridine, 2H/4H-pyran. Acenaphthylene is still unmatched.
- `genMany(word, count)` supplies bis/tris/hexa-style multipliers for suffixes such as polyols.
- `nameStructureDetailed` wraps `nameStructureOnce`; when there is no common name it tries `kekuleVariants` (alternating 6-ring flips, BFS, at most 15 variants) and accepts a variant that has a common name or a systematic primary the original lacked.
- `genHeteroChain`/`genNameHetero` name S–S, O–O and N–N chains (hydrazine or diazene by bond order); `genNameWithRing` handles azo/hydrazo before the general path.
- Substituent prefixes: one-carbon chains take no locant, compound substituents are parenthesised with bis/tris, and `alphaKey` ignores a leading "(" and "tert-".
- Known gaps: guanidino prefix, propranolol/terbutaline amino prefix parenthesising, sugars, nitro/charged groups, phosphate esters, azides, spiro atoms in multi-ring systems.

## Deuterium

- `D` is an element (valence 1 in `MAX_VALENCE`, colour in `ELEMENT_COLORS`, palette button in `index.html`), placed like a halogen.
- Naming: `nameStructureDetailed` (naming-core.js) counts D atoms; if any, `protioCopy` builds a graph without them (their carbons regain implicit H), `nameStructureProtio` names that, and the result gets a CAS-style `-d` / `-dN` suffix (e.g. `chloroform-d`, `DMSO-d6`, `DMT-d6`). No locants are produced. `ISOTOPE_SPECIAL_NAMES` (keyed `name|count`) holds overrides such as deuterium oxide and deuterium chloride. A molecule made only of D is "deuterium atom" / "deuterium".
- Properties: `computeProperties` (properties.js) computes on the protio copy, then rewrites the formula (`C3D6O`), adds the D–H mass difference to average and exact mass, and sets `deuterium`. The panel shows a Deuterium atoms row and notes that SMILES/PubChem data describe the non-deuterated compound.

## Extra common names (`js/common-names-extra.js`)

Auto-generated file (about 500 entries) that extends `COMMON_NAMES` with `Object.assign`. It is loaded after `naming-general.js` and before `properties.js`. Each entry maps a systematic name produced by the engine to a trivial name. It is regenerated from tab-separated (label, Kekulé SMILES) lists outside the project; a molecule is skipped when the engine already yields a common name, so entries only ever fill gaps.

## Phosphorus compounds (`genPhosphorus` in `naming-general.js`)

Handles a single P with one P=O or P=S and three single-bonded neighbours: esters (`trimethyl phosphate`, `trimethyl phosphorothioate`), free acids and hydrogen esters (`dimethyl hydrogen phosphate`), phosphonates and phosphinates, phosphonofluoridates and phosphorochloridates, and `PR3` phosphines. Ester alkyl groups go through `genFunctionalMany`, which groups identical groups with `genMult`. It only runs when no carbon skeleton outranks the phosphorus centre.

## Saturated diheterocycles and multipliers

`SATURATED_DIHETEROCYCLE_NAMES` in `naming-ring.js` covers 5- and 6-membered rings with two heteroatoms (1,3-dioxolane, 1,3-dioxane, 1,3-oxazolidine, 1,3-thiazolidine and similar). `genMult` uses `MULTIPLIER_PREFIXES` up to decakis, which fixed polyfluorinated alkanes. `joinDash` in `genNameWithRing` inserts a hyphen before a digit-leading base name.

## Phosphorus guard and new ring templates

`nameStructureOnce` in `naming-core.js` discards any name for a P-containing molecule that does not contain "phosph", so unsupported P compounds fall back to the formula instead of being named as if the P were absent. `SATURATED_DIHETEROCYCLE_NAMES` gained 1,2-dithiolane and 1,2-dithiane. `GEN_FUSED_TEMPLATES` gained the 1,3,4-, 1,2,4- and 1,2,5-oxadiazoles and thiadiazoles and 1,2,3-thiadiazole. `js/common-names-extra.js` now holds about 1000 entries.

## polishAromaticName and benzene batches

`polishAromaticName(name)` in `js/naming-core.js` runs inside `nameStructureOnce` before the `COMMON_NAMES` lookup, so `COMMON_NAMES` keys are in polished form. It rewrites `benzen-1-ol/amine/thiol` to phenol/aniline/benzenethiol, parenthesises dimethylamino, diethylamino, methylamino, ethylamino, trifluoromethyl and trichloromethyl prefixes, converts `didimethylamino` to `bis(dimethylamino)`, and renames aminosulfonyl, hydroxysulfonyl, acetylamino and mercapto to sulfamoyl, sulfo, acetamido and sulfanyl.

`js/common-names-extra.js` is generated from tab-separated label/Kekulé-SMILES rows. About 1870 entries now, including roughly 880 generated o-/m-/p- disubstituted benzene labels. Rows whose systematic name already has a trivial name keep the first label.

## Fused polycyclic aromatic coverage

`js/naming-general.js` already numbers naphthalene, anthracene, and phenanthrene generically (`GEN_FUSED_TEMPLATES`), so substituted derivatives of those scaffolds name correctly without extra code. `common-names-extra.js` adds trivial names for the well-known derivatives: naphthols, naphthylamines, naphthoic acids, naphthoquinones, anthraquinone/anthrone, pyrene (including 1-substituted pyrene, since the engine's ring numbering differs from casual guesses and was verified atom-by-atom), fluorene/fluorenone/fluorenamine, fluoranthene, chrysene, and phenanthren-9-ol.

## Heterocyclic fused-ring coverage

`GEN_FUSED_TEMPLATES` in `js/naming-general.js` already numbers quinoline, isoquinoline, indole, benzofuran, benzothiophene, carbazole, acridine, benzimidazole, indazole, quinoxaline, purine, and azulene generically, so substituted derivatives name correctly without new template code. `common-names-extra.js` adds trivial names for well-known derivatives of these scaffolds: 8-hydroxyquinoline (oxine), quinaldine, lepidine, carbostyril, skatole, oxindole, isatin, tryptophol, indole-3-acetic/butyric acid, dibenzofuran, dibenzothiophene, adenine, guanine, hypoxanthine, xanthine, caffeine, theobromine, theophylline, uric acid, and guaiazulene.

Acenaphthylene and acenaphthene are already named correctly as their own systematic names (no COMMON_NAMES entry needed).

## Triphenylene and perylene templates

`GEN_FUSED_TEMPLATES` in `js/naming-general.js` now includes `triphenylene` (18 atoms, fully catacondensed, no interior atoms — this scaffold already named correctly via the von Baeyer fallback before the template was added, but the template gives it cleaner locants for substituent naming) and `perylene` (20 atoms, pericondensed with two interior atoms, `12c`/`12d`). Perylene could not previously be named at all: `genSecondaryBridges` in the von Baeyer fallback rejects any secondary-bridge atom group containing an atom with more than 2 intra-group ring-neighbors (`inner.length > 2` guard), which perylene's interior atoms always trigger, so the engine fell all the way back to a raw molecular formula (`C20H12`). Pyrene has the same pericondensed-interior-atom shape and was already handled the same way (a dedicated template), so this follows existing precedent rather than patching the shared von Baeyer bridge code.

Both templates were verified by hand-building the atom/bond graph (with explicit Kekulé bond orders) in the scratchpad, serializing it to SMILES with a custom two-phase-DFS writer, and round-tripping the SMILES through the real bundled naming engine (not just the standalone parser) from every possible DFS starting atom — all resolve to `triphenylene`/`perylene` with no regressions in the existing test suite. A substituted derivative of each (`1-chlorotriphenylene`, `1-chloroperylene`) was also confirmed to produce a sane, correctly-located name.

**Caveat:** the locants used in both templates (`labels`) are self-derived, following this codebase's existing perimeter-walk numbering convention (the same style used for pyrene, phenanthrene, etc.), and were checked for structural/topological consistency — but they have not been cross-checked against the official CAS/IUPAC-published locant numbering for triphenylene or perylene. If exact agreement with published locants for substituted derivatives ever matters, that should be verified against a reference source before relying on it.

## Cyclic ketoxime support (and the `allowOxime` gating pattern)

Ring ketoximes (e.g. cyclohexanone oxime, `ON=C1CCCCC1`) previously fell all the way back to a raw molecular formula: `classifyAttachment` in `js/naming-core.js` had no case for an exocyclic `=N-OH` group, so `collectCoreAttachments` rejected the whole ring outright. Acyclic ketoximes (acetone oxime, benzaldoxime, etc.) already worked and still do, via a completely separate path in `js/naming-general.js`'s general imine/`N-hydroxy...imine` handling plus `COMMON_NAMES` aliasing — that path is untouched.

`classifyAttachment` now recognizes the pattern (an N double-bonded to the core atom, itself singly bonded to exactly one terminal O) and returns `{ kind: 'oxime', oId }`. `createAttachmentAccumulator` gained an `oximes` array, and `attachSuffix` renders it as `<stem>-<locant>-one oxime` (or `<stem>one oxime` when locants aren't shown — this happens to spell out exactly as the common name, e.g. `cyclohexanone oxime`, `cycloheptanone oxime`).

**Why this needed a gating flag instead of just teaching `classifyAttachment`:** `collectCoreAttachments` is the single shared substituent-classification routine called from roughly 20 sites across `naming-ring.js`, `naming-chain.js`, `naming-scaffolds.js`, and `naming-core.js` itself (aromatic rings, heterocycles, phenethylamine/amphetamine scaffold scanners, generic branch/substituent resolvers, etc.). Teaching `classifyAttachment` to unconditionally recognize oxime broke `resolveGenericSubstituent` (used when an oxime-bearing carbon appears inside a substituent branch, e.g. benzaldoxime's `Ph-CH=N-OH`): that resolver calls `collectCoreAttachments` to validate a branch, and since it doesn't read `acc.oximes` when assembling the substituent name, it silently accepted the branch and dropped the oxime entirely, producing `methylbenzene` for benzaldoxime instead of failing and falling through to the correct general-engine path.

The fix was to add a 9th parameter, `allowOxime`, to `collectCoreAttachments` (mirroring the existing `allowAlkoxy` pattern). When `classifyAttachment` returns `{ kind: 'oxime' }` and `allowOxime` is falsy, `collectCoreAttachments` treats it exactly as an unrecognized attachment (returns `false`), so all ~18 other call sites are completely unaffected and behave exactly as before. Only the saturated/aromatic ring principal-group scan in `naming-ring.js` (`nameForRing`, the loop just before the `aromatic` branch) passes `true`; acyclic chains deliberately do not opt in, since `naming-chain.js` already distinguishes aldehyde- vs ketone-position carbonyls and reusing the ring's `-one oxime` suffix template there would misname aldoximes as `<chain>-1-one oxime` instead of the correct `<chain>al oxime` form — that distinction wasn't implemented, so chain oximes are deliberately left on the pre-existing, already-correct general-engine path.

`oxime` was also added to `SECONDARY_PREFIX_NAMES` (as `hydroxyimino`) so a demoted (non-principal) oxime group in a ring with a higher-priority group present renders as a substituent prefix rather than silently failing.

Known limitation (not fixed, falls back to formula rather than misnaming): a ring bearing two or more oxime groups (e.g. a cyclic dioxime) isn't handled — `attachSuffix`'s multi-locant path only recognizes `SUFFIX_WORDS`, which has no `oxime` entry, and that combination isn't common enough to be worth the added suffix-assembly complexity right now.

## Morphinan family (opioid scaffold, `js/naming-scaffolds.js`, later session)

Adds trivial-name recognition for the morphinan/morphine-family pentacyclic scaffold, following the same topology-extraction-then-namer split already used for the ergoline family (`extractErgolineCore`/`nameErgoline`, see "Fused polycycle templates and generalized ergolines"). Handles: morphine, codeine, heroin, dihydrocodeine, hydrocodone, hydromorphone, oxycodone, oxymorphone, naloxone, naltrexone, nalbuphine, nalorphine (12 compounds).

`extractMorphinanCore(atomIds, bonds)` trims to the ring-only core via `trimToRing` and requires exactly 18 ring atoms (16 C + 1 N + 1 O), with exactly one degree-4 atom (`hub`) and exactly six degree-3 atoms (all others must be degree-2). It walks outward from `hub` along all four spokes: three "direct" spokes (chain length 0, landing on a fusion atom) and one "long" spoke (chain length 3, `ringDChain`, landing on `cy`). The three direct-spoke landings are classified by how many of *their* other neighbors are themselves fusion atoms: `arHub` (2 fusion neighbors), `cx` (1 fusion neighbor, which must be `cy`), `furanC` (0 fusion neighbors). A walk from `cx`'s non-fusion neighbor must land back on `furanC` after 3 atoms (`ringCChain`). `arHub`'s two remaining (fusion) neighbors are matched by where they land: the one reaching `cy` in 1 atom is `arB`; the one reaching `furanC` in 1 atom is `arC`, with that 1-atom chain captured as `oRing` (the furan-bridge oxygen) and the other walk's 3-atom chain captured as `aromaticChain`. This is purely topological — no bond orders or elements are inspected yet, so it matches the same 18-atom skeleton regardless of oxidation state or substituents.

`nameMorphinan(graph, idSet, adjacency, core)` then does the chemistry: validates every core atom's element (C everywhere except `oRing` = O and `ringDChain[2]` = N), checks that only the two diagnostic substituent positions (C3-analog = `aromaticChain[0]`, C6-analog = `ringCChain[2]`) and the N and C14-analog (`cx`) positions have any exocyclic neighbors — every other core atom must be "sealed" (all bonds internal to the ring system) — validates the aromatic ring has exactly 3 double bonds, the furan-oxygen bonds and all hub/ring-D bonds are single, and reads the diagnostic C7=C8-analog bond order (`ringCChain[0]`–`ringCChain[1]`) as the `eneC7C8` boolean.

`morphinanReadSimpleO(graph, adjacency, skip, atomId)` classifies one exocyclic ring substituent as `none` / `hydroxy` / `methoxy` / `acetoxy` / `oxo` (or `null` if unrecognized) by walking outward through the attached O (and, for methoxy/acetoxy, one more atom). N-substituent kind (`none`/`methyl`/`allyl`/`cyclopropylmethyl`/`cyclobutylmethyl`) is read separately via `collectBranch`/`resolveAllylBranch` plus a hand-rolled 3-vs-4-membered-ring walk for the cyclopropylmethyl/cyclobutylmethyl case.

The whole naming problem reduces to 5 independent classification axes — N-substituent kind, C3-analog substituent, C6-analog substituent, presence of C14-analog hydroxy, presence of the C7=C8-analog ene — joined into a lookup key (`'<nKind>:<c3>:<c6>:<has14OH>:<eneC7C8>'`) against the `MORPHINAN_NAMES` table (12 entries, one per handled compound).

**Known gap (accepted, not a bug):** thebaine is not handled. Its D-ring has a different pattern (a 1,3-diene plus a fully substituted enol-ether double bond at what would be the C6 position, rather than a simple saturated/ene C7=C8 and a plain C6 substituent), which doesn't fit the `ringCChain`/`eneC7C8` model used here. It falls back to the correct systematic IUPAC fused-ring name rather than silently misnaming.

**Bugs found and fixed while building this (relevant if extending the table further):**
- The "sealed atoms" check originally excluded the *entire* `ringCChain` and `aromaticChain` arrays from having any exocyclic substituents, which wrongly forbade the C3-analog and C6-analog positions themselves from bearing anything — every compound failed to match until this was narrowed to only the non-diagnostic chain positions (`ringCChain.slice(0, 2)`, `aromaticChain.slice(1)`).
- `morphinanReadSimpleO`'s methoxy branch originally required the ether-oxygen's carbon neighbor to have exactly 1 further carbon neighbor (as if there were an extra hop past the methyl group); a true methoxy's carbon has 0 further neighbors. This silently misclassified every methoxy-bearing compound (codeine, dihydrocodeine, hydrocodone, oxycodone) as unrecognized.
- The cyclobutylmethyl N-substituent detector had a self-contradicting guard (`... .some((e) => e.id === a2) === false` immediately followed by a check requiring that exact adjacency to be true), which made the branch unsatisfiable for any real cyclobutane ring; removing the bogus guard fixed nalbuphine.
- Unrelated to this scaffold but discovered via it: the `wanted` regex in `nameStructureOnce` (`js/naming-core.js`) that decides whether to prefer a fuller systematic name over a short derived one used a bare `/oxo/` substring test, which matched inside the trivial name "nal**oxo**ne" itself and caused naloxone's `full` field to incorrectly show the long systematic name even though `systematicPrimary` correctly showed "naloxone". Changed to a negative-lookaround word-boundary match (`(?<![a-z])oxo(?![a-z])`) so it only fires on genuine `oxo`-prefix occurrences in generated systematic names, not letters embedded inside unrelated words. This is a general fix, not scaffold-specific — any future trivial name that happens to contain `oxo`, `acetyl`, etc. as a substring would have hit the same bug.

## Non-morphinan opioids: fentanyl, methadone, tramadol, pentazocine, buprenorphine (`js/naming-core.js`, later session)

Unlike the morphinan family above, none of these five needed a new scaffold recognizer — each already produced a stable, non-fallback systematic name through the existing engine (fentanyl/methadone/tramadol via the ordinary chain/ring paths in `deriveName`, pentazocine/buprenorphine via the general von Baeyer fallback in `naming-general.js`, since pentazocine's benzomorphan core and buprenorphine's bridged hexacyclic core don't match any dedicated scaffold recognizer). Each was verified by running its PubChem-sourced `ConnectivitySMILES` through the real `nameStructureDetailed` pipeline and confirming the exact produced string, then adding that exact string as a new `COMMON_NAMES` key:

- `N-phenyl-N-(1-(2-phenylethyl)piperidin-4-yl)propanamide` → `fentanyl`
- `6-(dimethylamino)-4,4-diphenylheptan-3-one` → `methadone`
- `1-(3-methoxyphenyl)-2-(dimethylaminomethyl)cyclohexan-1-ol` → `tramadol`
- `1,13-dimethyl-10-(3-methylbut-2-en-1-yl)-10-azatricyclo[7.3.1.0²,⁷]trideca-2(7),3,5-trien-4-ol` → `pentazocine`
- `3-cyclopropylmethyl-16-(1-hydroxy-1,2,2-trimethylpropyl)-15-methoxy-13-oxa-3-azahexacyclo[13.2.2.1²,⁸.0¹,⁶.0⁶,¹⁴.0⁷,¹²]icosa-7,9,11-trien-11-ol` → `buprenorphine`

This is the same "no new recognizer needed, just key the exact string" pattern already used for most `COMMON_NAMES` entries (see "Common (trivial) names" above) — buprenorphine and pentazocine are notable only in that their systematic names come from the general von Baeyer fallback rather than any `deriveName` scaffold tier, confirming that fallback path also produces stable, exactly-reproducible strings suitable for this kind of keying. Closes out the first-tranche opioid batch (morphine-family 12 + these 5 = 17 compounds named).

A follow-up 4-entry batch used the identical approach for a second tranche of structurally-related opioids: `levorphanol` and `levallorphan` (the morphinan-minus-furan-oxygen skeleton — a bare `azatetracyclo[7.5.3...]` core, one ring fewer than the morphine family since there's no phenolic-oxygen bridge, so this doesn't hit the `+4`-cyclomatic morphinan recognizer either — differing only in N-methyl vs N-allyl), `butorphanol` (the same tetracyclic core, N-cyclobutylmethyl, plus a second ring-hydroxyl making it a diol), and `diprenorphine` (buprenorphine's close analog — identical hexacyclic core and `COMMON_NAMES` string shape, differing only in the C7 substituent: a plain `2-hydroxypropan-2-yl` isopropanol-type group instead of buprenorphine's bulkier tert-pentanol-type group). All four verified via PubChem `ConnectivitySMILES` through the real pipeline and keyed by exact string, same as the batch above. Total opioid count so far: 21.

A third follow-up 3-entry batch: `naltrindole` (a δ-selective antagonist — the naltrexone morphinan core with an indole ring fused onto the C-ring, seven fused rings total, well beyond the `+4` morphinan recognizer's scope, so it lands on the general von Baeyer fallback), `nalmefene` (the naltrexone morphinan core with the C6 ketone replaced by an exocyclic methylene, `=CH2` — this also misses the `+4` morphinan recognizer since `morphinanReadSimpleO` only classifies `none`/`hydroxy`/`methoxy`/`acetoxy`/`oxo` at that position, not a `=CH2`, and falls through to the same general fallback rather than being misnamed), and `dezocine` (structurally unrelated to the morphinan family — a simple bicyclic aminotetralin/benzocycloheptene core, handled entirely by the ordinary tricyclic/general engine). All three verified the same way as prior batches. Total opioid count so far: 24.

### Bug fix: silently-dropped amide N-substituents in `js/naming-general.js` (later session)

While extending the opioid batch to the fentanyl-analog family (meperidine, carfentanil, sufentanil, alfentanil, remifentanil), `alfentanil` (`CCC(=O)N(C1=CC=CC=C1)C2(CCN(CC2)CCN3C(=O)N(N=N3)CC)COC`, a piperidine-4-yl anilide bearing an N-ethyl-tetrazolone side chain) produced a badly wrong, truncated name: `N-phenylpropanamide` — reflecting only the propanoyl-N-phenyl fragment and silently dropping the entire piperidine ring, the methoxymethyl group, and the tetrazolone ring.

Root cause: two functions that assemble the N-substituent prefixes of an amide's principal group — `genAssembleParent` (the acyclic chain path, used when the parent structure is named as an acyclic chain, e.g. `...propanamide`) and `genNameRingParentCore` (the ring-parent path, used when a ring is chosen as the parent and the amide hangs off it) — both looped over `p.group.nSubs` and called `genSubstituent` to name each N-substituent branch, but silently skipped any branch where `genSubstituent` returned `null` (`if (name) { entries.push(...) }`, no `else`) instead of failing the whole name. Alfentanil's N-substituent branch walks through the piperidine ring into a tetrazolone (1,2,4-triazol-5(4H)-one-like) ring that `genRingBaseName` doesn't recognize, so `genSubstituent` correctly returned `null` for that branch — but the caller then produced a shorter, plausible-looking name instead of failing over to `null` (which `nameStructureOnce` would have turned into a safe formula fallback). This is the same class of bug as the earlier `naloxone` `wanted`-regex substring bug: a fallback that should trigger a `null` for a correctness guarantee instead let a wrong answer through. Note `genEvaluateChain` (chain substituent prefixes, not the amide's own N-substituents) already had the correct fail-the-whole-chain behavior via its `ok` flag — only the two N-substituent-specific sites lacked it.

Fix: both loops now track an `nSubsOk` flag and return `null` for the whole name if any N-substituent branch fails to resolve, mirroring `genEvaluateChain`'s existing pattern. Verified: `alfentanil` now correctly falls back to its molecular formula (`C21H32N6O3`) instead of a wrong name. Re-verified all 24 previously-named opioids plus the full triptan/ergoline/FLY/tryptamine test suite (28 more compounds) for zero regressions, since this touches two very general code paths.

A fourth follow-up batch of 11, enabled by this fix: `meperidine` (pethidine — a simple 4-phenylpiperidine-4-carboxylate ester, no ring/amide interaction at all, always named correctly; included here only because it was fetched alongside its fentanyl-analog relatives), `carfentanil` and `remifentanil` (both fentanyl analogs with a second ester group on the piperidine ring — the ester's higher-seniority principal group causes the engine to choose the ester-suffix ("...piperidine-4-carboxylate") naming style over the amide-suffix style, correctly folding the anilide/propanoylamino group in as an N,N-substituent prefix instead), `sufentanil` (a fentanyl analog with a thiophene instead of a second phenyl — plain amide-suffix naming, same shape as fentanyl), `loperamide`, `tapentadol`, `dextromethorphan` (lands on the morphinan `+4` recognizer's non-furan branch, same family as levorphanol), `cyclazocine` and `phenazocine` (benzomorphans, same general-fallback path as pentazocine, differing only in N-substituent), `U-50488`, and `SNC-80`. All eleven verified via PubChem `ConnectivitySMILES` through the real pipeline and keyed by exact string in `COMMON_NAMES`. `alfentanil` itself was deliberately left unmapped — it still has no dedicated recognizer for its tetrazolone ring, so it correctly falls back to its molecular formula rather than being given a name. Total opioid count so far: 35 (34 named + alfentanil's verified-safe formula fallback).

## Stereochemistry (R/S, E/Z)

- Data model: `js/graph.js`'s `addBond` gives every bond a `stereo` field (`null` / `'wedge'` / `'hash'`), alongside the existing `order`. Convention: `atomA` is the narrow end (the stereocenter atom being described), `atomB` is the wide end (the substituent coming toward or away from the viewer). This follows the existing convention that `growChain`/`bondExistingAtoms` in `interactions.js` always call `addBond(originAtomId, newAtomId)`, so `atomA` is consistently the pre-existing atom when a chain is grown outward.
- UI: single-clicking a bond calls `cycleBondOrder` (`js/interactions.js`), which now cycles order1(no stereo) → order2 → order3 → order1(wedge) → order1(hash) → order1(no stereo) → ... . If upgrading to a double or triple bond would violate valence (`canAddBond` fails), the cycle no longer just flashes and gets stuck at that order — it resets to order 1 and jumps straight into the wedge stereo state instead, so bonds that can never take a higher order still reach the stereo states via the same click. Rendering: `js/renderer.js`'s `drawBond` branches to a new `drawWedgeBond` for `stereo !== null`, drawing a filled solid triangle (narrow at the stereocenter end, widening toward the substituent) for wedge, or a series of short perpendicular strokes of linearly increasing width for hash. `RENDER_SETTINGS.wedgeWidth`/`hashSpacing` control the geometry. This UI/rendering change has only been syntax-checked (`node --check`), not visually confirmed in a browser — no browser/Playwright tooling was available in this environment.
- CIP priority: `js/stereo.js` implements an approximate Cahn-Ingold-Prelog hierarchical digraph algorithm (`cipCompareNodes`/`cipRankSubstituents`). Substituents are compared first by atomic number, then recursively by each successive sphere of neighbor atomic numbers (children sorted descending before comparison). Double/triple bonds add phantom duplicate-element nodes with no further children (`order - 1` phantoms per bond); ring closures (revisiting an atom already in the current branch) are also treated as duplicate/terminal nodes to guarantee termination. This is a simplified CIP implementation, correct for common textbook cases but not a fully rigorous implementation of the real IUPAC branch-exploration rules (e.g. no aromatic Kekulé-independence handling). Whenever adjacent-ranked substituents compare equal (`hasTie`), the caller deliberately treats the atom/bond as non-stereogenic and emits no descriptor, rather than guessing.
- R/S assignment: `findStereocenters` looks for atoms with exactly one stereo bond (`stereo !== null`), 3–4 single-bonded heavy neighbors, and no ties in CIP ranking. Each of the four ranked substituents gets a position vector: real in-plane neighbors use their actual 2D offset from the center with a canvas-to-chemistry y-flip (`y: -(a.y - center.y)`), the one wedge/hash substituent gets `z = ±1`, and an implicit 4th substituent (when only 3 heavy neighbors are explicit) is treated as H with `z` set opposite the one explicit wedge/hash bond. R/S is then the sign of the signed tetrahedral volume `V = (r1-r4)·[(r2-r4)×(r3-r4)]` over the CIP-ranked substituents (1=highest priority ... 4=lowest): `V < 0 → R`, `V > 0 → S`. This sign convention was hand-calibrated against a textbook (R)-CHFClBr worked example (full determinant computed by hand) and cross-checked with a computationally-inverted (S) test case.
- E/Z assignment: `findStereoDoubleBonds` looks at every double bond where each end has 0–2 other single-bonded heavy substituents (padding up to 2 with `null` for an implicit H). Each end's two substituents are CIP-ranked; a 2D cross-product against the double-bond axis decides which side of the axis each end's higher-priority substituent falls on (an implicit H's side is inferred as the geometric opposite of the one real substituent at that end, since sp2 substituents sit ~120° apart on opposite sides of the axis). Same side → Z, opposite sides → E; if either end ties in CIP ranking, or a substituent falls exactly on the axis, no descriptor is emitted.
- Naming integration: `buildStereoPrefix(graph, atomIds, chainLocants)` (`js/stereo.js`) is called from `nameStructureDetailed` (`js/naming-core.js`, not the lower-level `nameStructure`, because `js/app.js`'s info-panel calls `nameStructureDetailed` directly) and prepends `(R)-`/`(S)-`/`(E)-`/`(Z)-` (single descriptor) or `(2R,3S)-`-style (multiple descriptors) to both the `full` and `common` name fields. With exactly one stereo element total, the bare `(R)-`/`(S)-`/`(E)-`/`(Z)-` form is always used regardless of which naming tier produced the name (no locant map needed). With two or more, a locant-numbered combined descriptor is only produced when every stereocenter's locant is known **and** there are no stereo double bonds in the mix (E/Z locants aren't threaded through yet) — otherwise, as before, no prefix at all is emitted rather than an incorrect or unlocated one.
- **Locant threading, currently chain-tier only.** `nameForChain` (`js/naming-chain.js`) is the only naming-tier function that exposes its internal atom→locant map, via a module-level `lastChainStereoLocants` value set immediately before its one success-path `return` and consumed (and reset to `null`) by `takeLastChainStereoLocants()` right after `deriveName` returns in `nameStructureDetailed`; `deriveName` also resets it to `null` at entry so a chain-tier success from an unrelated prior call can never leak into a later ring/scaffold-tier result. This works because all these files load as classic (non-module) `<script>` tags sharing one top-level lexical environment (confirmed in `index.html`'s script order), so a `let` declared in `naming-chain.js` is visible from `naming-core.js` without any explicit export. None of the ~40+ ring/fused/tricyclic/tetracyclic/pentacyclic scaffold naming functions expose a locant map yet — a molecule with 2+ stereocenters on a ring or fused scaffold (e.g. a disubstituted cyclohexane, or the original `ephedrine`/`pseudoephedrine` motivating case, whose stereocenters sit on a *substituent chain* off a benzene-ring-parent name, not the chain tier) still gets no stereo prefix at all, exactly as before — this remains a known, deliberate scope boundary, not an oversight.
- `protioCopy` (used for deuterated molecules) was fixed to also copy the new `bond.stereo` field, since its bond-copy was a manual field list rather than a generic `Object.assign` and would otherwise have silently dropped stereo on any deuterated stereocenter-containing molecule (this fix has no dedicated test case yet). The deuterated-molecule path does not receive chain locants (kept simple; deuterated multi-stereocenter chains still get no prefix, same pre-existing behavior).
- Verified via hand-built `Graph` objects run through the real `nameStructure` (never SMILES, per this project's standing verification discipline): `(R)`/`(S)`-CHFClBr, trans/cis-2-butene → `(E)-but-2-ene`/`(Z)-but-2-ene`, ethylene → no prefix, a symmetric cyclopropane ring stereocenter (CIP tie) → no prefix, no crash; and, for the new multi-locant chain case, 2,3-dibromobutane with both stereo bonds wedge → `(2R,3R)-2,3-dibromobutane`, with one wedge/one hash (the meso diastereomer) → `(2S,3R)-2,3-dibromobutane`, and a 5-carbon/3-stereocenter chain (2-fluoro-3-bromo-4-chloropentane) → `(2S,3S,4R)-3-bromo-4-chloro-2-fluoropentane`. Cross-checked each combined result against the same molecule with only one of its stereo bonds set (isolating each center) to confirm each center's own R/S label is unaffected by the other center's configuration, as CIP priority ranking should be — confirmed identical labels in both directions. A 2-stereocenter substituted cyclohexane (ring tier, no locant map available) still correctly emits no prefix, confirming the fallback is unchanged. Full pre-existing regression suite re-run with zero changes elsewhere.
- **Locant threading, now also covers the ring-tier "generic substituent branch" case (ephedrine/pseudoephedrine).** `resolveGenericSubstituent` (`js/naming-core.js`) — the resolver used when a ring's parent name has a non-trivial branch hanging off it (e.g. ephedrine's `-CH(OH)-CH(NHMe)-CH3` chain off the benzene ring) — already built an ordered `best.chain` atomId array internally (`chain[index]` ↔ printed locant `index+1`) but discarded it. It now also sets a second module-level side channel, `lastSubstituentStereoLocants`/`takeLastSubstituentStereoLocants` (declared in `js/naming-general.js`, referenced from `js/naming-core.js` — same classic-script shared-lexical-environment mechanism as `lastChainStereoLocants`), immediately before its one success-path `return`. `nameStructureDetailed` now calls `takeLastSubstituentStereoLocants()` alongside `takeLastChainStereoLocants()` and passes whichever one is present (`chainLocants || substituentLocants`) into `buildStereoPrefix`. A real hazard had to be closed for this to work correctly: `nameStructureOnce` runs a second, speculative `generalName(graph, atomIds, true)` call (the "alt name" check) even after `deriveName` has already succeeded, and that speculative call could re-enter `genAlkylSubstituent`/`genNameRingParentCore` (`naming-general.js`) and overwrite the just-set correct locant map with an unrelated, usually-discarded one — fixed by snapshotting `lastSubstituentStereoLocants` before the speculative call and restoring the snapshot unless the speculative "alt" name is the one actually kept. (`naming-general.js` also has its own, currently-unexercised-for-this-shape capture point inside `genAlkylSubstituent`/`genNameRingParentCore`, left in place from an earlier, initially-mis-targeted attempt at this fix — harmless and potentially useful if some other molecule shape ends up resolving its stereocenters via that path instead.)
- **Related bug fix, exposed only once ring-tier locants started reaching `buildStereoPrefix`**: `findStereoDoubleBonds` (`js/stereo.js`) had no ring-membership check, so a benzene ring's Kekulé-alternating double bonds (this project models aromaticity as literal alternating single/double bonds, no separate aromatic bond order) were counted as candidate stereogenic double bonds, tripping `buildStereoPrefix`'s "no E/Z locants yet, so bail if any stereo double bond is present" guard for every ring-containing multi-stereocenter molecule. Added `isRingDoubleBond` (BFS check for an alternate atom-to-atom path not using the bond itself, i.e. whether the bond closes a cycle) and skip any double bond that's part of a ring when collecting stereo double bond candidates. This is a general fix, not specific to ephedrine — it was previously silently masking the multi-stereocenter descriptor for any ring-containing molecule with 2+ acyclic stereocenters, regardless of which naming tier named it.
- Verified for the ring-tier case against hand-built `Graph` objects (never SMILES): ephedrine (benzene ring + `-CH(OH)-CH(NHMe)-CH3` branch) with both substituent bonds wedge → `(1S,2R)-ephedrine`; the wedge/hash diastereomer → `(1S,2S)-ephedrine`; no stereo bonds → bare `ephedrine`, unchanged. Cross-checked against literature CIP assignments (ephedrine is the "unlike" `(1R,2S)`/`(1S,2R)` pair, pseudoephedrine the "like" `(1R,2R)`/`(1S,2S)` pair) — both generated descriptors landed on the chemically correct pair. **Known pre-existing gap, unrelated to this fix:** `COMMON_NAMES` maps both diastereomers' identical constitutional string to `'ephedrine'` with no separate `pseudoephedrine` entry (noted in the opioid/pharmaceutical batch, session 28 in `complexities.md`), so the pseudoephedrine-pair test case above prints as `(1S,2S)-ephedrine` rather than `(1S,2S)-pseudoephedrine` — the stereo descriptor is correct, the common-name lookup just doesn't branch on stereochemistry yet.
- **Locant threading, now also covers ring-direct stereocenters (e.g. a plain disubstituted cyclohexane).** `js/naming-ring.js` has three single-return success paths that already compute a per-ring-position `locants` array (`ring[index]` ↔ `locants[index]`): `nameForRing`'s plain-carbocycle branch, `nameSaturatedHeterocycle`, and `nameSaturatedDiheterocycle` (`best.locants`). Each now also sets a third module-level side channel, `lastRingStereoLocants`/`takeLastRingStereoLocants` (declared in `naming-ring.js`, same shared classic-script lexical environment mechanism as the other two), right before its `return`. `deriveRingName` — the sole entry point reaching all three, invoked from `deriveName` only when the structure is exactly one ring — resets `lastRingStereoLocants = null` at its own top; `nameStructureOnce` resets it too, at its top, alongside the existing `lastSubstituentStereoLocants` reset, so a stale map from some other dispatch branch (fused/tricyclic/tetracyclic/pentacyclic — none of which call `deriveRingName`) can't leak forward. `nameStructureDetailed` tries `chainLocants || substituentLocants || ringLocants` before calling `buildStereoPrefix`; the three are mutually exclusive in practice since only one naming tier ever produces the final name for a given molecule shape. Unlike the session-32 fix for `lastSubstituentStereoLocants`, no snapshot/restore guard was needed here — `generalName`'s speculative "alt name" computation lives entirely in `naming-general.js`'s own call graph and never re-enters `deriveRingName`.
- Verified against hand-built `Graph` objects: 1,2-dichlorocyclohexane, one wedge/one hash ring-substituent bond → `(1R,2R)-1,2-dichlorocyclohexane` (previously no prefix at all); both bonds wedge (the cis/meso diastereomer) → `(1R,2S)-1,2-dichlorocyclohexane`, correctly the unlike-descriptor pair expected for a meso compound (versus the like pair for the chiral trans diastereomer) — an independent chemistry sanity check, not just a locant-plumbing check. Locant-to-atom correspondence was cross-checked by isolating each ring stereocenter's bond one at a time and confirming each isolated single-descriptor result matches its half of the combined descriptor. Full regression suite re-run with zero regressions; no plain non-stereo-marked compound anywhere in the existing test set picked up a spurious prefix.
- **`COMMON_NAMES` diastereomer disambiguation**: `COMMON_NAMES` itself stays keyed pre-stereo (both ephedrine/pseudoephedrine collide on the same constitutional string, by design — that table is shared with the no-stereochemistry path). A second, small table, `DIASTEREOMER_COMMON_NAMES` (`js/naming-core.js`, just above `nameStructureDetailed`), and `resolveDiastereomerCommonName`, are consulted only inside the `withStereo` closure that prepends the stereo prefix. For a common name present as a key (currently just `ephedrine: { like: 'pseudoephedrine' }`), it parses the two R/S letters straight out of the already-built two-locant stereo prefix (`^\(1([RS]),2([RS])\)-$`) and swaps to the `like` name when the letters match (the like R,R/S,S pair vs. the unlike R,S/S,R pair) — deliberately reading the already-computed descriptor rather than re-deriving the CIP relationship a second time. Only fires when a full two-descriptor locant prefix was actually produced; a no-stereo or unresolvable-locant molecule is unaffected. Verified across all four wedge/hash combinations on ephedrine's two centers: both "unlike" combinations stay `ephedrine`, both "like" combinations become `pseudoephedrine`, matching literature CIP assignments exactly.
- **Locant threading, now also covers the ergoline/lysergamide (LSD family) scaffold's two real stereocenters, C5 and C8.** Before touching code, the ~40+ functions in `js/naming-scaffolds.js` were sorted into two risk categories: scaffolds with a dynamically-computed `locants` array (same shape as `nameForRing`, e.g. `nameNaphthalene`) versus scaffolds with fixed/hardcoded IUPAC locants baked into string literals (retained-name parents like ergoline and morphinan). The dynamic-numbering scaffolds mostly have no realistic stereocenter (aromatic positions aren't stereogenic), so nothing needed wiring there. For the fixed-numbering scaffolds, guessing locants would mean fabricating an IUPAC-numbering claim, so web research confirmed the literature fact first (LSD/lysergic acid has exactly two stereocenters, C5 and C8; e.g. LSD's systematic name is `(8β)-N,N-diethyl-6-methyl-9,10-didehydroergoline-8-carboxamide`), and `nameErgoline`'s internal variables were mapped to real ergoline locants two independent ways: (1) the function's own pre-existing, already-correct hardcoded output (`'-8-carboxylic acid'` for its `c8` variable, `'6-' + n6Name` for its ring nitrogen) already proved `c8`⇒C8 and the ring nitrogen⇒N6, since that output already matches known LSD nomenclature; (2) a by-hand walk of `extractErgolineCore`'s ring topology back to real indole atom numbering (N1/C2/C3/C3a/C4/C5/C6/C7/C7a), which independently placed `landingD` (adjacent to N6, at the ring-fusion) at real C5 and `landingP` (adjacent to indole-C4, across the alkene) at real C10 — consistent with the code's own `ene` variable already being labeled `'9,10'`/`'8,9'`/`'none'` for the bond between `ringCChain[3]` (⇒C9) and `landingP` (⇒C10). Both cross-checks agreed. A new module-level side channel, `lastErgolineStereoLocants`/`takeLastErgolineStereoLocants` (declared in `js/naming-scaffolds.js`), is set by a small `setErgolineStereoLocants` closure inside `nameErgoline` right before each of its two success-path returns (`landingD`⇒5 always, `c8`⇒8 unless the 8,9-ene makes it sp2, `landingP`⇒10 only in the fully-saturated `ene === 'none'` case), reset at the top of `deriveTetracyclicName` and at `nameStructureOnce`'s top. `nameStructureDetailed`'s combined lookup is now `chainLocants || substituentLocants || ringLocants || ergolineLocants`. The session-32 alt-computation-pollution guard in `nameStructureOnce` was extended to also snapshot/restore `lastErgolineStereoLocants` around the speculative `generalName(graph, atomIds, true)` call, defensively (that call bails immediately on any ring-containing structure, so shouldn't actually be able to touch it, but the guard is cheap).
- Verified against a hand-built `Graph` object for the full LSD skeleton (indole fused to the ergoline C/D rings, N,N-diethylcarboxamide at C8, N-methyl at N6, 9,10 double bond), never SMILES: all four wedge/hash combinations on the C5/C8 stereo bonds produced `(5S,8R)-`, `(5S,8S)-`, `(5R,8R)-`, and `(5R,8S)-6-methyl-N,N-diethyllysergamide` respectively, each correctly paired with a stereo-tagged `LSD` common name. Cross-checked against literature: natural/active D-LSD's absolute configuration is `(5R,8R)`, and that is exactly the combination the hand-built graph produced from the corresponding wedge/hash pairing — an independent chemistry sanity check, not just internal-consistency. No-stereo-bonds case still resolves to plain `LSD`, unchanged. Full regression suite (all 15 `test_*` files) re-run with zero regressions.
- **Deferred follow-up, explicitly not guessed**: morphinan (codeine/dextromethorphan family, `nameMorphinan`/`derivePentacyclicName`) has three literature-confirmed real stereocenters (C9, C13, C14) on the same fixed-numbering pattern as ergoline, but its ring topology is more complex (18-core-atom pentacyclic vs. ergoline's 16) and mapping `extractMorphinanCore`'s internal variables (`hub`, `cy`, `cx`, `furanC`, `arHub`, `arB`, `arC`, `oRing`, `ringDChain`, `ringCChain`, `aromaticChain`) to real C9/C13/C14 needs the same by-hand ring-walk cross-check done for ergoline above, done carefully, before any locant map can be trusted — not attempted this pass. `nameAminorex`/`extractAminorexCore` also remains unexamined. Every dynamically-numbered scaffold (naphthalene, indole, quinoline, carboline, benzofuran, difuran, etc.) was spot-checked structurally but not individually extended, since none appear to have a realistic stereocenter-bearing target compound on this project's research-chemical list.

## Tricyclic pendant-ring dispatch fix (N-benzyl-on-FLY)

`deriveTricyclicName` (`js/naming-scaffolds.js`) now takes the same optional `coreAtomIds`/`coreBonds` parameters `deriveFusedName`/`deriveTetracyclicName` already had, and uses them (instead of the full, unfiltered `atomIds`/`bonds`) only for its three `extract*Core` calls (`extractCarbolineCore`, `extractNoramineCore`, `extractDifuranCore`); adjacency-building and substituent-walking still use the full `atomIds`/`bonds`, unchanged. `naming-core.js`'s tricyclic dispatch branch now passes `coreAtomIds, coreBonds` through, matching its fused/tetracyclic siblings. This closes the last instance of the recurring "pendant ring defeats cyclomatic-number tier dispatch" bug class (previously fixed one call site at a time for the NBOMe/triazolylmethyl/azetidide cases — see the `naming-scaffolds.js` complexity-map entry) — the trigger this time was an N-benzyl substituent on a benzodifuran/FLY-family amine, which previously fell back to a molecular formula because `trimToRing` could never leaf-strip the pendant benzyl ring away inside `extractDifuranCore`. Verified against a hand-built aromatic benzodifuran core (2C-B-DragonFly's structure) with the free amine replaced by an N-benzyl secondary amine: produces `4-(2-benzylaminoethyl)-8-bromobenzodifuran` (previously fell back to a formula). The same core without the pendant ring still produces the pre-existing `2C-B-DragonFly`, confirming the change is a no-op whenever there's no pendant ring to exclude. No `COMMON_NAMES` entry was keyed for the N-benzyl-FLY structure itself since no confirmed real trivial name for it is known.

## Update, later session (34) — QoL redesign of the editor UI

The user asked to pause naming work for a quality-of-life pass: a new look for the canvas, CSS and HTML, plus features that make the editor feel like a real tool. `js/app.js`, `js/renderer.js`, `js/interactions.js`, `js/colors.js`, `index.html` and `css/style.css` were rewritten; the naming engine and `js/stamps.js` were not touched.

**View transform (`js/renderer.js`).** The renderer now owns `view {x, y, scale}` and `pixelRatio`. World geometry is drawn under `ctx.setTransform(r*s, 0, 0, r*s, r*vx, r*vy)`; the dot grid, component name pills and the empty-canvas hint are drawn in screen space. Helpers: `viewportSize`, `toWorld`, `toScreen`, `zoomAt` (anchor-preserving, clamped to `RENDER_SETTINGS.minScale`/`maxScale` 0.2–5), `zoomCentered`, `panBy`, `contentBounds(atomIds?)` and `fitToContent(padding)` (caps at 1.6×). `interactions.pointFromEvent` returns world coordinates and `screenPointFromEvent` screen coordinates; every hit test on geometry uses world space and `renderer.nameAt` uses screen space. `app.js`'s `resizeCanvas` applies `devicePixelRatio` and shifts the view by half the size delta so content stays centred when the canvas resizes (e.g. when the properties panel opens).

**Themes.** `RENDER_THEMES.dark`/`.light` palettes in `js/renderer.js` (exposed through the `palette` getter) are paired with `body[data-theme="light"]` CSS variable overrides. `colorForElement(element, theme)` in `js/colors.js` reads `ELEMENT_COLORS_LIGHT` for the light theme so heteroatom labels keep contrast on white. The choice persists in localStorage key `theme`.

**Drawing improvements.** `isLabeled` (non-carbon, or an isolated carbon) decides whether an atom gets a text label; `implicitHydrogens` uses `IMPLICIT_H_VALENCE` (N3, O2, S2, P3, and CH4 for a lone carbon) to draw `OH`, `NH2`, etc., with `hydrogenSide` putting the H on the side away from the neighbours. Double bonds in rings are drawn ring-aware: `buildAdjacency` + `smallestRingCenter` (BFS) + `doubleBondSide` put the second line inside the ring, inset by 16%. Component names are drawn as rounded pills (`roundedRect`, `fitText` with ellipsis, `nameMaxWidth` 520) from `nameFor`, which caches by an atom/bond signature and swallows naming errors. Clicking a pill calls `copyName` → `onCopied`, and the pill shows "Copied ✓". `drawHover` draws an atom halo or bond glow, `drawGhost` a dashed preview bond, and `flashAtom` a blocked-action flash. Global `copyText`/`fallbackCopyText` wrap the clipboard API with a textarea fallback and return a Promise.

**Interactions (`js/interactions.js`).** Tools `draw`/`move`/`erase` (`setTool`, reflected as `tool-move`/`tool-erase` canvas classes for cursors). The draw tool shows a live preview while dragging (`computeDragGhost`). Space-drag, middle-drag on empty canvas, or dragging empty canvas past 2× the drag threshold pans; the wheel zooms about the cursor (`wheelZoomSpeed` 0.0015). The move tool drags a whole molecule (`componentAtomIds`), Shift drags one atom; Shift-drag in the draw tool also moves one atom. The erase tool deletes whatever is under the cursor, and dragging erases continuously. `hitTest` order is name pill → atom → bond. Keyboard editing on hover: `setHoveredElement` (element keys), `setHoveredBond(1|2|3|'wedge'|'hash')` (pressing the same stereo again flips the bond direction), `deleteHovered`; `bondsStayValid` guards element changes against valence. Middle-click on a molecule saves it as a custom stamp. Mouse move/up are bound on `window` while dragging so releasing outside the canvas still finishes the gesture. `History` commits are suppressed while `moving` so a drag is one undo step. Callbacks to `app.js`: `onHoverChange`, `onViewChange`, `onBlocked`.

**App shell (`index.html`, `css/style.css`, `js/app.js`).** Sidebar: brand, stamp search (`#stamp-search`; `/` focuses, Enter picks the first match, Esc clears), collapsible sections (state in localStorage `collapsedSections`), element buttons with `<kbd>` badges, and two-column stamp grids whose shortcut badge (`::after attr(data-key)`) appears on hover. `<main id="workspace">` has a toolbar (tools, undo/redo, zoom −/readout/+/fit, current-element chip, Copy SMILES, Properties, Open/Save/Export PNG, theme, help, clear), the canvas with a `#toast-stack`, and a status bar (counts, per-molecule formulas, hover description, tool hint). With the properties panel open, `body.panel-open` hides the tool-button text and the chip so the toolbar stays on one row (`flex-wrap: nowrap`). `app.js` adds `toast(message, {kind, action, duration})`, guarded `storageGet`/`storageSet`, JSON save/open (`serializeGraph`, format `chemical-graph-constructor` v1, validated by `loadGraphState`), autosave to localStorage `autosave` on every commit (restored before `History` is built), Clear with an Undo toast, PNG export through an offscreen `Renderer` at 2× with no grid, Copy SMILES (components joined with `.`), Properties for the hovered or largest molecule, and the help overlay. Shortcuts: Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z, Ctrl+S / Ctrl+O, Space pan, `+`/`-`/`0` zoom and fit, `?` help, Del/Backspace delete hovered, `1`/`2`/`3`/`W`/`H` on a hovered bond, `3`–`8` carbocycle stamps, Shift+6 benzene, `M`/`E` tools, `c n o s p d f l b i` elements. Esc steps back one level: close help, then drop the stamp, then return to the draw tool, then close the panel.

Verified by driving the real page in headless Chromium (Python Playwright, installed in the scratchpad venv `pwenv`; the script is `drive.py`): drag-to-bond, benzene stamp, ghost-click extension, element key (phenol, C6H6O), bond-order key, wheel zoom and fit, pan without editing, stamp search, clear + Undo toast, and reload-from-autosave all behaved as expected with zero console errors. Screenshots of the dark theme, light theme, help overlay and properties panel were reviewed by eye. The 22-file naming regression suite still passes after rebuilding `bundle.js`.

## Update, later session (35) — selection, clipboard, transforms and context menu

**Selection (`js/interactions.js`, `js/renderer.js`).** `interactions.selection` is a `Set` of atom ids, shared by reference as `renderer.selection`. A new **Select** tool (`V`, `data-tool="select"`, `tool-select` canvas class) does the following:
- A click on an atom or bond selects it.
- Shift+click toggles.
- A double-click (`event.detail >= 2`) selects the whole connected component.
- A drag on empty space draws a marquee.
- A drag on a selected atom moves the whole selection. `selectPress` passes `clickSelection` to `beginDragMove`, and when the mouse is released without moving, the selection narrows to the clicked item.

Shift+drag on empty space draws a marquee in any tool. A plain drag on empty space in the draw tool still pans. In the move tool, dragging a selected atom moves the whole selection. A click in the draw tool clears the selection.

The marquee is stored in screen coordinates (`beginMarquee`, `updateMarquee`) and converted to world coordinates on mouseup. The renderer draws it with `drawMarquee`, in screen space, as the last step of `render`. `drawSelection` runs in world space before `drawHover`. It draws an accent glow on bonds whose two ends are both selected, plus halos on atoms. The palette has a `selection` color for each theme.

`app.js` removes ids that no longer exist from the selection in `afterRender`, so undo, clear and open can never leave stale ids behind. Selection helpers:
- `selectedAtomIds`, `setSelection`, `clearSelection` (returns whether anything was selected)
- `selectionChanged`: re-renders and calls `onSelectionChange`
- `hoveredComponentIds`
- `targetAtomIds()`: the selection if there is one, otherwise the hovered molecule. This is the target for every editing operation below.

**Transforms and edits.** Each of these commits one undo step:
- `transformAtoms(ids, fn)` maps positions.
- `rotateAtoms(ids, deg)` and `flipAtoms(ids, 'horizontal' | 'vertical')` work about the `centroid`.
- `translateAtoms` moves atoms without rotating them.
- `deleteAtoms(ids)` deletes atoms. `deleteHovered` now deletes the selection first, if there is one.
- `setAtomElement(atom, element)` and `setBondKind(bond, kind)` hold the logic that used to live inside the hover-key handlers, so the context menu can reuse it.

Keys:
- `[` / `]` rotate by ±15°.
- `{` / `}` rotate by ±90°.
- `X` and `Y` flip.
- The arrow keys nudge by 5, or by 25 with Shift.

**Clipboard (`js/app.js`).** `extractFragment(ids)` produces `{format: 'chemical-graph-fragment', atoms, bonds}`. It keeps only the bonds whose two ends are both inside the set. `insertFragment(fragment, center)` validates the fragment, remaps its ids, recenters it on `center`, restores bond order and stereo, and selects the new atoms.

The fragment is stored in localStorage `clipboard`. It survives reloads and can be shared between tabs. The fragment's SMILES (`fragmentSmiles`, built in a temporary `Graph`) is also written to the system clipboard.

Commands:
- `copyAtoms`, `cutAtoms`
- `pasteAt(worldPoint | null)`: pastes at the mouse position, or at the viewport center if the mouse is off the canvas.
- `duplicateAtoms`: offsets the copy to the right.
- `selectAll`
- `copyAllSmiles`: also used by the toolbar button.
- `requireTarget(action)`: shows a toast when there is nothing to act on.

Shortcuts:
- Ctrl+A select all.
- Ctrl+C copy. If there is no atom selection and the page has a text selection, the browser's native copy runs instead.
- Ctrl+X cut, Ctrl+V paste, Ctrl+D duplicate.
- Ctrl+Shift+C copies the SMILES of the whole canvas.

The Esc cascade is now: help, then selection, then stamp, then tool, then panel.

**Context menu.** Right-click calls `interactions.onContext(hit, client, world)`. Shift+right-click on an atom or bond keeps the old quick delete. `openContextMenu(entries, client)` renders into `#context-menu`, which is a fixed element with `role="menu"`. Entry kinds are `title`, `separator`, `chips` and items; items can have `kbd`, `danger` or `disabled`. The menu position is clamped to the viewport, and the menu opens upward if it would overflow the bottom. It closes on an outside mousedown (capture phase), blur, resize or wheel. While it is open, Esc closes it and the arrow keys move focus.

The menu builders are:
- `atomEntries`: element chips from `MENU_ELEMENTS`, plus the actions below.
- `bondEntries`: `BOND_CHOICES` chips, plus a reverse-stereo item.
- `selectionEntries` and `moleculeEntries`: copy, cut, duplicate, copy SMILES, rotate, flip, properties and delete.
- `canvasEntries`: paste here, select all, fit, 100%, copy all SMILES, export PNG and clear.

The help overlay has a third column, "Selecting / Editing".

Verified in headless Chromium with the scratchpad script `drive2.py`, with zero console errors:
- Marquee-selecting a benzene selects 6 atoms.
- Copy then paste gives C6H6 + C6H6. Duplicate gives 18 atoms.
- Rotate, flip and nudge work.
- Deleting the selection leaves 12 atoms, and undo restores 18.
- Esc clears the selection, and a double-click selects one molecule.
- The atom menu's N chip turns benzene into pyridine (C5H5N).
- The canvas menu clamps to the viewport and Esc closes it.
- Ctrl+A followed by a right-click shows "18 atoms selected".
- A drag on empty space still pans in the draw tool.
- Shift+drag draws a marquee in the draw tool.

The original `drive.py` flow and the 22-file naming regression suite still pass.

## Update, later session (36) — SMILES import, charges, clean-up and snap-merge

**Charges.** Each atom has an optional integer `atom.charge`. It is removed when it becomes 0, D atoms never carry one, and |q| ≤ `INTERACTION_SETTINGS.maxCharge` (3). The model is in `js/valence.js`:
- `valenceFor(element, charge)`: C gets `4 − |q|`; other elements get their normal valence + q, where P's normal valence is 3 via `CHARGED_BASE_VALENCE`.
- `atomValence(atom)`
- `implicitHydrogenCount(element, charge, bondSum)`: for neutral atoms it uses the next entry in `STANDARD_VALENCES`, which also makes PPh3 read as C18H15P.
- `chargeText(q)`: gives `+`, `2−` and so on.

`canAddBond` uses `atomValence`, and charged atoms never take the hypervalent N/S paths.

The charge is carried everywhere atoms are copied: `extractFragment`/`insertFragment`, `loadGraphState`, `fragmentSmiles`, saved stamps (`placeCustomStamp`) and `protioCopy`.

In `js/properties.js`, `propContext` has a `charge` map. The formula ends with the net charge, the result gains `charge`, and SMILES writes bracket atoms such as `[NH3+]` and `[O-]`.

The renderer draws the charge as a superscript (`RENDER_SETTINGS.chargeFont`) at the label's right edge, and every charged atom gets a label. `nameFor` returns '' for charged components, and the properties panel shows "Names are not generated for charged species" plus a Net charge row.

To edit charges:
- Hover an atom and press `+`/`=` or `-`/`_`; with no atom hovered these keys still zoom.
- Use the charge chips (2−…2+) in the atom context menu.
- `interactions.setAtomCharge(atom, q)` validates with `bondsStayValid`, and reverts and flashes on failure.

**SMILES import (`js/smiles.js`).** `smilesToFragment(text)` runs these stages and returns a clipboard-format fragment centered at 0,0:
1. `parseSmiles`
2. `smilesStripHydrogens`
3. `smilesKekulize`
4. `smilesCheckValence`
5. `smilesBuildGraph`
6. `smilesNeutralize`: turns +/− pairs into nitro, N-oxide and sulfoxide double bonds.
7. `smilesValidateGraph`
8. `computeLayout`
9. `smilesDoubleBondStereo`
10. `smilesApplyChirality`

It throws `SmilesError` with "(at position N)". Supported elements are C N O S P F Cl Br I and H, with `[2H]` read as D. Boron, `$` and radicals are rejected. `looksLikeSmiles` is only a loose hint; a successful parse is the real test.

For chirality, neighbors are ordered as: preceding atom, implicit H, ring-closure partners in digit order, then the rest. `@` means `tetrahedralVolume` > 0 in that order; if the drawn geometry disagrees, the wedge is flipped to a hash.

In `js/app.js`:
- The document `paste` event imports the clipboard text as SMILES at the cursor unless it equals the SMILES of the internal clipboard fragment; in that case, or if parsing fails and an internal fragment exists, `pasteAt` pastes the internal fragment.
- Ctrl+V no longer calls `preventDefault`. It arms `pasteFallbackTimer` (80 ms), which pastes the internal fragment if no paste event arrives.
- `freeCenterFor` shifts an import to the right of existing content when it would overlap.
- `insertSmilesFragment` fits the view if the result falls off-screen.
- The Import dialog (`#import-overlay`, toolbar "Import", canvas menu "Import SMILES here…") parses on input with a 120 ms debounce. It previews through an offscreen `Renderer`, shows the name and formula or the error, and inserts on Enter.

**Layout and clean-up (`js/layout.js`).** `computeLayout(graph, atomIds)` returns a Map from id to {x, y} with a bond length of 50:
- SSSR (`layoutFindRings`) and ring systems via union-find.
- `layoutRingSystem`: a regular first ring, fused runs on arcs (`layoutArc`), and spiro rings pointed outward.
- `layoutComponent`: zigzag chains, linear sp centers, and the other ring systems attached rigidly in whichever mirror image is less crowded.
- `layoutRelieve`: repeatedly mirrors the smaller side of a non-ring single bond while that lowers `layoutOverlapScore`.
- Components are placed side by side.

`cleanupLayout(graph, atomIds)` re-lays out every component touched, Procrustes-aligns it (with a mirror) to its old position, and restores stereo with `captureStereo`/`restoreStereo`. It returns the number of atoms that moved by more than 0.5. `enforceDoubleBondGeometry` and `layoutSideOf` are shared with the SMILES E/Z step.

In the app, `cleanUp(ids)` is bound to the key K (selection, hovered molecule, or everything), the toolbar cleanup button, and the "Clean up structure/everything" menu entries.

**Snap-merge.** While a drag-move is in progress, `renderer.mergeTargets` holds the stationary atoms within `min(12 / scale, 18)` world units of a moving atom; pairs are one-to-one, nearest first. On drop, `mergeMovedAtoms` shifts the moving group by the mean pair offset, then calls `mergeAtomInto` for each pair:
- Bonds are re-pointed to the target.
- Self bonds and duplicates collapse, keeping the higher order.
- The target and its neighbors are validated, and the bonds are restored if that fails.

Holding Alt skips merging. `onMerged(merged, failed)` shows a toast.

**Visual.** The UI gained:
- A shared `.modal-overlay` / `.modal-dialog` pattern with fade and rise animations.
- A `.text-button.primary` style.
- A nowrap rule on text buttons.
- Toolbar compaction: the current-element chip hides at ≤1560 px, tool labels at ≤1360 px, and Copy SMILES plus tighter gaps at ≤1180 px.

The empty-canvas hint mentions SMILES paste, and the help overlay lists +/−, K, drop-to-merge and SMILES paste.

**Tests.** The scratchpad has `test_smiles_import.js` (formulas, names, charges, R/S, E/Z, overlap and error cases), which needs `rebuild2.sh`, and `drive3.py` (Playwright: paste, dialog, charges, clean-up, merge, undo, Alt).


## Update, later session (37) — stereo locants for morphinan and aminorex

This closes the gap left in session (33). Fixed-numbering scaffolds other than ergoline used to get no R/S descriptor once they had more than one stereocenter. `buildStereoPrefix` already writes a lone center as a bare `(R)-`/`(S)-`, so only multi-center cases needed a locant map.

**Shared side channel.** The ergoline side channel is now generic:
- `lastErgolineStereoLocants` / `takeLastErgolineStereoLocants` became `lastScaffoldStereoLocants` / `takeLastScaffoldStereoLocants` in `js/naming-scaffolds.js`.
- `nameStructureDetailed` now reads `chainLocants || substituentLocants || ringLocants || scaffoldLocants`.
- The resets are unchanged: the top of `nameStructureOnce`, the top of `deriveTetracyclicName`, and the snapshot/restore around the speculative `generalName` call.
- `derivePentacyclicName` now resets it too.

Any fixed-numbering recognizer can set this map right before a successful return.

**Morphinan.** `nameMorphinan` sets the map only when `MORPHINAN_NAMES` gives a name. This recognizer only accepts the 4,5-epoxymorphinans, since the epoxy O is part of its 18-atom core. The map is:

| Variable | Locant |
|---|---|
| `furanC` | C5 |
| `ringCChain[2]` | C6 |
| `cy` | C9 |
| `hub` | C13 |
| `cx` | C14 |

The mapping comes from walking `extractMorphinanCore`'s topology:
- `hub` is the only degree-4 core atom, which is the quaternary C13.
- Its three-atom spoke `ringDChain` is C15, C16, N17, and it lands on `cy`, which is C9.
- `cx` is the direct spoke next to C9, which is C14.
- `ringCChain` is C8, C7, C6, and it lands on `furanC`, which is C5, the epoxy carbon.
- `arHub` is C12, `arB` is C11, `arC` is C4, `oRing` is the epoxy O, and `aromaticChain` is C3, C2, C1.

The code's existing C3/C6 substituent reads (`aromaticChain[0]`, `ringCChain[2]`) and the C14-OH read (`cx`) agree with this walk.

C6 only shows up in the prefix when it is a real center. For example, in 6-oxo compounds `findStereocenters` does not report it, so the map entry is unused.

**Aminorex.** `nameAminorex` sets `c4` to 4 and `c5` to 5, using the O1/C2/N3/C4/C5 atoms that `aminorexOrientation` already found.

**Polish fix.** In `polishAromaticName`, the regex that wraps `methylamino`/`ethylamino` in parentheses now has a `(?!rex)` lookahead. Before, it produced "4-(methylamino)rex" and "N-(methylamino)rex".

**Verification.** `test_scaffold_stereo.js` is in the scratchpad and needs `rebuild2.sh`. It builds the molecules through the SMILES importer, using PubChem isomeric SMILES, and checks these against literature configurations:

| Compound | Expected |
|---|---|
| morphine and codeine | (5R,6S,9R,13S,14R) |
| oxycodone and naloxone | (5R,9R,13S,14S) |
| hydrocodone | (5R,9R,13S,14R) |
| ent-morphine | all inverted |

It also checks each morphine center alone, with the other `@` marks stripped, and each gives the letter its locant carries in the full prefix. For 4-methylaminorex it checks both single epimers, (4S,5R) and (4R,5S), so a swapped C4/C5 map would fail.

**Non-epoxy morphinans: dextro/levo from the drawn stereo.** Dextromethorphan, levorphanol and levallorphan get their names from von Baeyer keys in `COMMON_NAMES`. That meant the drawn configuration was ignored and there was no R/S prefix. Two additions fix this.

**`extractMorphinanSkeleton(graph, atomIds)`** is in `js/naming-scaffolds.js`. It first finds ring bonds, meaning bonds whose two ends stay connected when that bond is skipped. It unions them into ring blocks and keeps the block with 17 atoms and 20 bonds. Using blocks rather than trimming the whole component matters for butorphanol, whose separate cyclobutyl ring would otherwise make the core too big. It also avoids pendant-ring stripping, which removed the aromatic ring of the methorphans. It then checks the structure around the single degree-4 hub (C13):
- The hub's spokes to the next branch atom have lengths 0, 0, 3 and 4.
- The 3-atom spoke is C15–C16–N17, and it lands on C9.
- The 4-atom spoke is C5–C8, and it lands on C14.
- C14 must also be a direct spoke of the hub and bonded to C9.

It returns `{ c9, c13, c14 }`. The 4,5-epoxy compounds have 18 core atoms, so they never match and still go through `nameMorphinan`.

**`resolveMorphinanEnantiomer(graph, atomIds, detail)`** is in `js/naming-core.js`. `nameStructureDetailed` tries it before the normal stereo step. It only runs when `detail.common` is a key of `MORPHINAN_ENANTIOMER_NAMES`:
- `dextromethorphan` maps to levomethorphan (R) or dextromethorphan (S).
- `levorphanol` maps to levorphanol (R) or dextrorphan (S).
- `levallorphan` maps to levallorphan (R) or dextrallorphan (S).
- `butorphanol` maps to butorphanol for (9R,13S,14S). It has no named enantiomer.

Each entry holds `levo` (the C9/C13/C14 letters of the levo drug), `levoName` and `dextroName`. The drawn letters must equal `levo` or its exact inverse. Butorphanol's 14-OH changes C13 and C14 priorities, so its levo pattern is RSS, not RRR. That matches PubChem's (1S,9R,10S) for [butorphanol, CID 5462346](https://pubchem.ncbi.nlm.nih.gov/compound/5462346), with C13→1, C9→9 and C14→10. A null `dextroName` makes `common` null, so the enantiomer falls back to the full name with its prefix.

It only acts when C9, C13 and C14 all have a drawn configuration:
- The common name gets `(9X,13X,14X)-` plus the matching enantiomer name.
- The full von Baeyer name gets its own prefix, using C13→1, C9→9 and C14→10. This matches PubChem's `(1S,9S,10S)-4-methoxy-17-methyl-17-azatetracyclo[7.5.3.0¹,¹⁰.0²,⁷]heptadeca-2(7),3,5-triene` for dextromethorphan.
- If the letters match neither `levo` nor its inverse, as in a 14-epimer (isomorphinan), `common` becomes null. The name then falls back to the full name with its prefix, so an isomorphinan is not mislabeled as the drug.

If no configuration is drawn, or only part of it, the old behavior is unchanged.

**Tests.** `test_morphinan_enantiomers.js` (17 checks, including butorphanol, its enantiomer and its 14-epimer) builds levorphanol from morphine's isomeric SMILES:
- It keeps the C9/C13/C14 chirality marks and their neighbor order.
- It drops the epoxy O and the 6-OH, and saturates C7=C8.

Because levorphanol has morphine's absolute configuration, the (9R,13R,14R) result is an independent check of the CIP engine against the literature. C13 goes from S in morphine to R here because the epoxy no longer affects the priorities.

**Bridged ring layout.** `js/layout.js` no longer overlaps atoms in cages such as the morphinans, quinuclidine and camphor. It now lays out bridged systems as follows:
- `layoutRingSystem` sorts the rings as before and then calls `layoutRingSystemFrom(system, adj, L, ringOrder)` to do the placement. When the result is not clean, it retries with each other ring placed first and keeps the lowest score. The score is `layoutSystemQuality` plus `layoutSubstituentRoom`.
- Inside `layoutRingSystemFrom`, the next ring is the one with the fewest atoms already placed, as long as at least two are placed. That way fusions go before bridges.
- Each run of unplaced atoms comes from `layoutBestRun`. It scores these candidates:
  - the two `layoutArc` bulges
  - true circular arcs with sagitta heights of 0.3 to 1.2 L on both sides

  The score penalizes crowding, spacing inside the run, room for the run's own substituents, bond-length error, and 3 L for each crossing of an already placed bond (`layoutSegmentsCross`).
- `layoutSystemQuality(ids, bonds, pos, L)` adds up squared bond-length error, squared nonbonded crowding under 0.8 L, and one per bond crossing.
- `layoutStubPoints(p, inner, count, L)` gives the directions a ring atom's substituents will likely take. They point along the outward bisector, 72° apart. `layoutSubstituentRoom` penalizes ring atoms near those points, which is how a gem-dimethyl bridge (camphor C7) is kept from pointing into the ring.
- `layoutRefineSystem(system, adj, pos, L, evaluate)` runs 300 Gauss-Seidel stress-majorization sweeps when the score is 0.05 or more:
  - Targets: L for one hop, √3·L for two hops, and L(0.8k+0.2) beyond that.
  - It adds one stub node per substituent, so the refinement makes room for them.
  - It keeps the result only if the score improves.
- In `layoutComponent`, a ring atom's substituents no longer always go into the widest angular gap. Each gap is scored by how crowded the new points would be, plus 0.1 L for each radian it is narrower than the widest gap.

`test_bridged_layout.js` covers nine cages and bicyclics built from SMILES: morphine, oxycodone, DXM, butorphanol, norbornane, camphor, borneol, cocaine and quinuclidine. It requires a minimum atom distance of at least 28 px, with bond lengths between 30 and 75 px. The drawings still have one bond crossing in the morphinans and in cocaine's tropane, which is unavoidable in 2D without perspective drawing.


**Research-chemical names, second batch.** These changes let the rest of the tryptamine, bioisostere and cyclized-amine families from the list get their common names:
- **Alpha/beta labels in `matchEthylamineChain`** (`js/naming-scaffolds.js`). The internal `alpha` is the carbon next to the ring and `beta` is the carbon next to N. That is the reverse of the pharmacological convention, and it caused β-methyltryptamine to be named "AMT". The return now has two fields:
  - `alphaSubstituent`: the branch on the carbon next to N, found by `resolveAlkylBranch` when that carbon has three neighbors.
  - `betaSubstituent`: the branch on the carbon next to the ring.

  `nameIndole` and `nameNoramine` build their prefix from both, as `alpha-X-beta-Y`. AMT/AET-style compounds now reach COMMON_NAMES, and β-methyltryptamine is named `beta-methyltryptamine`.
- **Allyl and cyclopropyl amine substituents** (`js/naming-core.js`). `resolveCyclopropylBranch(graph, adjacency, startId, fromId)` recognizes a cyclopropane joined at one atom and returns `{name: 'cyclopropyl', atoms}`. `resolveAminoSubstituent` tries alkyl, then `resolveAllylBranch`, then `resolveCyclopropylBranch`, then benzyl. `findPendantRingAtoms` treats a cyclopropane on an acyclic N as pendant, so it no longer counts as a ring system. That lets DALT, MALT, McPT and their ring-substituted variants resolve through the tryptamine path.
- **Cyclopropane locants** (`js/naming-ring.js`). `showLocants` is now also true for 3-membered rings when there are two or more substituents plus principal locants. Tranylcypromine is named `2-phenylcyclopropan-1-amine`. The single-substituent cases stay unchanged: cyclopropylamine, cyclopropene and methylcyclopropene.
- **COMMON_NAMES additions** (`js/naming-core.js`, after `'alpha-ethyltryptamine'`). There are 73 new keys:
  - N-allyl, cyclopropyl, isopropyl and butyl tryptamines, including the 4-HO "-ocin" names (daltocin, maltocin, miprocin, iprocin).
  - The 4-AcO "-acetin" names (mipracetin, ipracetin, ethipracetin, daltacetin) and `O-acetylbufotenine`.
  - The α-methyl/ethyl series (5-MeO-AMT, 4-HO-AMT, halo-AMTs, α-methylserotonin, α,N,N-TMT, α,N,O-TMS, α,N,N,O-TeMS).
  - Bioisosteres: C-DMT, isoDMT, dimemebfe, mebfap, 5-MeO-DiBF, the APBT and 6-APDB entries.
  - Cyclized amines: pyr-T, pip-T, MPMI, lucigenol, tryptoline, MDAI, TCB-2, lorcaserin.
  - norfenfluramine, MMA and 4-MA.

  MiPT and 5-APDB were already in `js/common-names-extra.js`, so they were not added again. The stale `'3-(2-aminopropyl)indole': 'alpha-methyltryptamine'` alias was removed from that file. Tranylcypromine, DMCPA, 3,4-DMA, the arylpiperazines, quipazine and MK-212 keep their systematic names.

`test_exotic_names.js` (scratchpad) loads the naming files in index.html order, including `common-names-extra.js`, which the rebuild bundles leave out. It names the 85 SMILES in `batch.json`, plus AMT, β-methyltryptamine, N-cyclopropyltryptamine and cyclopropylamine, and compares each against `exotic_expected.json`.

**Deferred families: 4-PrO, tetrahydro-β-carbolines, aporphines, indazoles.**
- **Propionyloxy** (`js/naming-core.js`). `classifyAcyloxy` now also accepts an ethyl acyl group and returns `{kind: 'acyloxy', name: 'propionyloxy'}`, which gives scaffold names such as `4-propionyloxy-N,N-dimethyltryptamine`. The ester alt-name regex in `nameStructureOnce` lists `propionyloxy` next to `acetoxy`, so compounds without a common name are shown as `…-1H-indol-4-yl propanoate`. There are nine new keys: 4-PrO-DMT, DET, MET, DPT, DiPT, MiPT, EiPT, MPT and DALT.
- **Hydro-β-carbolines** (`nameCarboline` in `js/naming-scaffolds.js`). The pyridine ring's bond orders (`[c9a, c1, n2, c3, c4, c4a]`) now select one of three modes:
  - Alternating orders give the aromatic parent `β-carboline`.
  - All single bonds, with a double bond at C4a=C9a, give `2,3,4,9-tetrahydro-1H-β-carboline`. N2 may carry a substituent (locant 2).
  - The same pattern with C1=N2 double gives `4,9-dihydro-3H-β-carboline`.

  Hydro prefixes follow the other substituents, as in PubChem style. In hydro mode the pyrrole-ring test checks only the C4a=C9a double bond and the single bonds around N9, because the benzo ring's Kekulé form may leave C4b–C8a single. One carboxy group becomes a `-N-carboxylic acid` suffix, and `isFinalizedScaffoldName` accepts `carboline-N-carboxylic acid` so the general-name path doesn't replace it. Keys changed:
  - Tryptoline's key is now `2,3,4,9-tetrahydro-1H-β-carboline`.
  - New keys: tetrahydroharman, pinoline, 6-MeO-THH, harmalol.
  - In `common-names-extra.js`, the harmaline and tetrahydroharmine keys moved from von Baeyer names to the new forms.
- **Aporphines** (`js/naming-scaffolds.js`). `extractAporphineCore(graph, atomIds, bonds)` trims the component to its ring core with `trimToRing`, requires 17 atoms and 20 bonds, and matches the skeleton by walking outward from a ring N of degree 2. The walk goes N6 → C5 → C4 → C3a and N6 → C6a → C7 / C11c, then C11b, C11a, and the C1–C3 and C8–C11 arcs. It returns a map of locant keys (`c1` … `c11c`, `n6`). `nameAporphine` requires:
  - rings A and D aromatic
  - single bonds on C3a-C4-C5-N6-C6a-C7-C7a, C6a-C11c and C11b-C11a
  - no substituents on fusion atoms or C6a

  It collects substituents at 1–5 and 7–11. An N-methyl gives `…aporphine`, NH gives `…noraporphine`, and any other N substituent gives `…-N-Rnoraporphine`. `deriveTetracyclicName` tries it after the ergoline core. The single C6a stereocenter comes out as a plain `(R)`/`(S)` prefix. New keys: apomorphine, norapomorphine, N-propyl- and N-ethylnorapomorphine, apocodeine, nuciferine, glaucine and boldine. The dead von Baeyer apomorphine key was removed from `common-names-extra.js`.
- **Indazoles** already had correct systematic names. The only addition is `'1-(2-aminopropyl)-1H-indazol-6-ol': 'AL-38022A'`, whose enantiomer is (S).

`test_later_families.js` (scratchpad) loads `common-names-extra.js` the same way `test_exotic_names.js` does. It checks 43 SMILES from `later_batch.json` against `later_expected.json`. The set includes negative cases: a butanoate and an isobutyrate ester, 4-PrO-NMT, 2-chloro-NPA, 2-methyl-THBC and phenyl propanoate.

**Kekulé robustness and test bundles.** `nameTetrahydrocarbazole` now uses the same pyrrole-ring test as the hydro-β-carbolines. It checks the C4a=C9a double bond and the single bonds around N9, and it accepts a Kekulé form that leaves C4b–C8a single. Each structure was drawn with both Kekulé forms of the benzene ring; the tetrahydrocarbazole, hydro-β-carboline, harman, ergoline, tryptamine and aporphine examples all gave the same name either way. The scratchpad `rebuild.sh` and `rebuild2.sh` bundles now include `js/common-names-extra.js`, in index.html order, so every test sees the same name table as the app. That exposed one stale expectation: `C/C=C/C` is named `(E)-2-butene` through the extras entry. Three extras keys replace a core name with a synonym on purpose: norephedrine → phenylpropanolamine, isoproterenol → isoprenaline, meperidine → pethidine.

**Methylenedioxy-aporphines and the browser check.** `derivePentacyclicName` still tries the morphinan core first. If that fails, `findMethylenedioxyBridge(graph, atomIds, adjacency)` looks for an O–CH2–O group whose two O atoms sit on two bonded carbons, and returns `{atoms: [O, CH2, O], ends: [Ca, Cb]}`. The dispatcher removes those three atoms, runs `extractAporphineCore` on what remains, and calls `nameAporphine(graph, idSet, adjacency, core, bridge)`. In that call, the bridge atoms are added to the skip set and the bridge becomes a `methylenedioxy` entry. Its locant is the joined pair, such as `1,2`, and it sorts alphabetically with the other prefixes. New keys: roemerine, anonaine, dicentrine and MDO-NPA. The scratchpad driver `drive4.py` pastes apomorphine, glaucine, tetrahydroharmine, harmaline, the THBC acid, 4-PrO-DMT, AL-38022A and daltacetin into the real page. For each one it opens the info panel, prints the full and short names, and saves a screenshot of the canvas. Like the other drivers, it has to print `ERRORS: []`.

**γ-Carbolines and longer acyloxy groups.** `nameCarboline` now accepts two pyridine-ring element patterns. `CNCC` is the β-carboline. `CCNC` is the γ-carboline, where the ring N is at `orientation.c3`. For the γ case the locant table is `[4,3,2,1,9,8,7,6,5]`, mapped over `[c1…c8, n9]`. As a result, the indole N is numbered 5 and the benzo positions are 6–9. The γ form has only two modes: fully aromatic (`γ-carboline`) and `2,3,4,5-tetrahydro-1H-γ-carboline`. The 4,9-dihydro mode is β-only. A substituent on the ring N (N2) is allowed only in the tetrahydro mode. Hexahydro forms such as stobadine still fall through to the von Baeyer name. There are two new keys: mebhydroline (5-benzyl-2-methyl-THγC) and latrepirdine (dimebon). The latrepirdine key is the von Baeyer string because its N5 substituent is a pyridylethyl group, which the scaffold path does not resolve. In `js/naming-core.js`, `classifyAcyloxy` now walks a straight chain of 1–4 carbons from the acyl carbon and names the group acetoxy, propionyloxy, butyryloxy or valeryloxy. A branched chain returns null. The `wanted` regex lists all four names. A common name is still required for the alt-name path to win, so 4-butyryloxy-DMT keeps its ester name `…-4-yl butanoate`. `test_later_families.js` now has 61 cases, including the γ series and the butanoate, pentanoate and hexanoate esters.

**Fused-scaffold stamps, an attach-direction fix, and C2-substituted ergolines.** `js/stamps.js` has a new `FUSED_STAMPS` table, keyed by stamp name, with `{label, smiles}` for naphthalene, tetralin, indole, benzofuran, quinoline, isoquinoline, tetrahydro-β-carboline (`tryptoline`), noraporphine and ergoline. `fusedStampFragment(stampKey)` calls `smilesToFragment` on first use and caches the result on the entry. `smiles.js` loads before `stamps.js`, and its coordinates are already at `INTERACTION_SETTINGS.bondLength`. `placeStamp` checks `CUSTOM_STAMPS` first, then `FUSED_STAMPS`, and places a fused fragment with the same `placeCustomStamp` used for saved stamps. The buttons are in a new "Fused scaffolds" sidebar section in `index.html`, with `data-section="fused"`. Search and collapse work without extra code. While testing this I found and fixed a bug in `placeCustomStamp` that also affected saved stamps. When attaching to an atom, it rotated the anchor-to-centroid vector toward the drag direction and then put the anchor on the target. That put the centroid back on the origin side, so the stamp folded over the atom it was bonded to. It now rotates `(centroid − anchor)` onto the drag direction, so the body extends away from the origin. The scratchpad `drive5.py` places every fused stamp in the real page and reads the info panel, then drags an indole off a benzene and takes a screenshot. `fusedval.py` places each stamp standalone and attached through the page's `placeStamp`. It checks bond-order sums against `maxValenceFor` and found no violations. In `nameErgoline` (`js/naming-scaffolds.js`), C2 (`pyrroleChain[1]`) is no longer sealed. One F, Cl, Br, I or methyl substituent there is recorded as `c2Name`, and that atom is added to `skip`. The lysergamide prefix is built in the recognizer's existing locant order, `[1-X-]2-Y-(6-Z-|6-nor-)`. The generic ergoline path adds a locant-2 entry. Longer C2 chains are still rejected. There is a new key, `'2-bromo-6-methyl-N,N-diethyllysergamide': 'BOL-148'`. The earlier gap where 1-acyl lysergamides got a von Baeyer full name is fixed; see the next paragraph. `test_later_families.js` now has 67 cases.

**Benzodifuran orientation and a third research-chemical batch.** The difuran names depended on SMILES order. `extractDifuranCore` always gave `freeX` locant 4 and `freeY` locant 8, so the same 2C-B-FLY graph came out as either `4-(2-aminoethyl)-8-bromo-…` or `8-(2-aminoethyl)-4-bromo-…`, and only the first matched its key. The benzodifuran core is centrosymmetric, so `deriveTricyclicName` now also builds `swappedCore`, with p0↔p2, p1↔p3, freeX↔freeY and furanAArc↔furanBArc. That is the same cycle rotated, so every ring and arm check still holds. The helper `pickDifuran(namer)` runs `nameDifuranScaffold` or `nameDifuranSaturatedScaffold` on both cores and keeps the name with the lower first locant. Prefixes are listed alphabetically, so this is IUPAC's rule that the first-cited substituent takes the lower locant when the locant sets tie. There was also a wrong key. `'(2-(methylamino)-1-oxobutyl)benzene'` was mapped to pentedrone, but that structure is buphedrone. Pentedrone is the 1-oxopentyl homolog. Both keys are now correct. New COMMON_NAMES keys in `js/naming-core.js`, all verified on SMILES-built graphs:
- N-ethylpentedrone, 3-MMC, bk-2C-B
- aminoindanes: 2-AI, NM-2-AI, 5-IAI, MMAI
- deschloroketamine and 2F-DCK
- 3-MeO-PCP
- diphenidine, ephenidine, methoxphenidine
- 3-FPM, ethylphenidate, 4F-MPH

When a structure has no `systematicPrimary` (aminoindanes, diarylethylamines, arylcyclohexylamines, phenidates), the key is the full name. The 46 cases, including three SMILES orderings of 2C-B-FLY, are in `test_later_families.js`, which now has 113 cases.

**Order-invariance fixes.** A new scratchpad test, `test_order_invariance.js`, rebuilds every molecule in the probe sets (`batch.json`, `later_batch.json` and `e2`–`e6`, 259 molecules) six times. Each rebuild shuffles atom insertion order and bond insertion order, and randomly swaps bond ends on non-stereo bonds. The test fails if the name ever changes. It found two engine-level causes of names that depended on drawing order:
- **`chooseRingNumbering` in `js/naming-ring.js`.** When two numberings tied on the principal, unsaturation and substituent locant sets, it kept the first one it found, which depended on the ring's traversal start. On a tie it now compares `citationOrderLocants(substituents, locants)`: the locants listed group by group in the order `assembleSubstituentPrefix` cites them, ascending within each group. This gives the lowest locant to the first-cited substituent. Both functions now share `substituentCitationKey(name)` in `js/naming-core.js` (strip a leading `(` and `tert-`), so the numbering and the printed order cannot drift apart. Mephedrone, 3-MMC and bk-2C-B were affected. Hand-drawn mephedrone could lose its common name depending on which atom was drawn first. Every older key already used the citation-consistent numbering, and only the new bk-2C-B key changed, to `1-(2-amino-1-oxoethyl)-4-bromo-2,5-dimethoxybenzene`.
- **`genRingSeniority` in `js/naming-general.js`.** It returned `[has N, has heteroatom, ring size]`, so two different rings could tie, and the sort then fell back to discovery order. MK-212 flipped between `2-chloro-6-(piperazin-1-yl)pyrazine` and `1-(6-chloropyrazin-2-yl)piperazine`. The key now continues with the heteroatom count and the number of ring double bonds, following IUPAC P-44.2's "lower degree of hydrogenation" rule. As a result, mancude pyrazine outranks piperazine.

**1-Acyl lysergamides.** Any scaffold name containing `acetyl` or `propionyl` matched the `wanted` regex in `nameStructureDetailed`, so ALD-52 and 1P-LSD showed the von Baeyer carboxamide as their full name, and their common names were reached only through `systematicPrimary`. `isFinalizedScaffoldName` now also ends-matches `lysergamide`, `lysergol`, `ergoline` and `ergoline-8-carboxylic acid`, so these keep the scaffold name and its `(5R,8R)` descriptors. In `nameErgoline`, the N1 substituent falls back to a local cyclopropanecarbonyl check when `resolveAcylBranch` returns null. The check looks for C(=O) bonded to a CH carbon whose two other neighbors are degree-2 carbons bonded to each other. Those five atoms are added to `skip`. The pendant cyclopropane is stripped from `coreAtomIds`, so dispatch still reaches the tetracyclic tier. Other cycloalkanecarbonyls and branched acyls are still rejected. `resolveAcylBranch` itself is unchanged because it has other callers. New keys: 1B-LSD, 1V-LSD, 1cP-LSD. `test_later_families.js` now has 121 cases.

Update, later session (37), continued — reaction arrows and text labels. Reaction schemes can now be sketched with arrows and text labels next to the molecules.
- **Data model (`js/graph.js`).** `Graph` gained `annotations` and `nextAnnotationId`, with `addAnnotation(fields)`, `getAnnotation(id)`, `removeAnnotation(id)` and `isEmpty()` (no atoms and no annotations). An annotation is either `{id, kind: 'arrow', x1, y1, x2, y2, style}` or `{id, kind: 'text', x, y, text}`. `style` is one of `ARROW_STYLES` (`forward`, `equilibrium`, `resonance`, `retro`, defined in `js/renderer.js`). Labels may contain `\n` for several lines. Annotations never touch the chemistry: naming, formulas, SMILES and `connectedComponents` see only atoms and bonds. Later sessions added `{id, kind: 'plus', x, y}` and, in session (40), `{id, kind: 'bracket', atomIds, n, label?}` polymer brackets; see "Update, later session (40)".
- **Persistence.** `History.snapshot()`/`restore()` include both new fields, and `restore` defaults them for older states. So undo/redo and the localStorage autosave cover annotations. `serializeGraph()` writes them. `loadGraphState()` passes them through `sanitizeAnnotations(list)`, which drops malformed entries and duplicate ids, clamps text to 500 characters and falls back to `forward` for unknown styles. Files without annotations still open. The file format stays at version 1.
- **Rendering (`js/renderer.js`).** `drawAnnotations()` runs in world space after atoms. It skips the label being edited (`editingAnnotationId`), draws a highlight for hovered or selected annotations (`drawAnnotationHighlight`), and then calls `drawArrow(arrow, alpha)` or `drawTextLabel(annotation)`. `drawArrow` draws a filled head for `forward`, heads at both ends for `resonance`, two offset harpoons in the ⇌ orientation for `equilibrium`, and two parallel lines with an open chevron for `retro`. `renderer.arrowDraft` is drawn semi-transparent while an arrow is being dragged. `annotationBounds(annotation)` measures label text with `RENDER_SETTINGS.annotationFont`/`annotationLineHeight`. `contentBounds(atomIds, annotationIds)` includes every annotation when called with no arguments, so fit-to-screen and PNG export frame the whole scheme. It includes only the listed annotations otherwise. The empty-canvas hint now checks `graph.isEmpty()`.
- **Interactions (`js/interactions.js`).** There are two new tools, `arrow` (key A) and `text` (key T). `hitTest` returns `{type: 'annotation'}` after atoms and bonds, using `annotationAt(point)`: segment distance for arrows and a padded text box for labels.
  - **Arrow tool.** `beginArrow`, the `arrowDrag` branch of `onMouseMove` and `finishArrow` create an arrow snapped to 15° (`arrowEnd`; hold Shift for a free angle). A click on an arrow without dragging runs `cycleArrowStyle`. The last style used (`this.arrowStyle`) becomes the default for new arrows.
  - **Text tool.** A click calls `requestTextEdit(annotation, point)`, which hands off to `app.js` through `onEditText`. So does a double-click on a label with any tool.
  - **Draw, select and move tools.** Pressing an annotation goes through `annotationPress`: it drags the annotation, or the selection when the annotation is selected.
  - **Selection, drag and transforms.** Annotations have their own `annotationSelection` Set, mirrored on the renderer. `setSelection` and `clearSelection` clear it, marquee selection picks up fully enclosed annotations, and `beginDragMove(point, atomIds, clickSelection, annotationIds)` moves them with `moveAnnotation`. `transformAtoms` (rotate, flip, nudge) and `deleteAtoms` also act on the selected annotations, but only when every targeted atom is itself selected (`annotationTargets`). `targetAtomIds` returns the selection, rather than the hovered molecule, when only annotations are selected.
  - **Erase and delete.** Erase, Delete on hover and Shift+right-click remove annotations. `hoveredComponentIds` ignores annotation hovers, and middle-click ignores annotations, so annotation ids are never mistaken for atom or bond ids.
- **App (`js/app.js`).** The inline editor is `#annotation-editor`, a textarea over the canvas. `openTextEditor(annotation, point)` focuses it on the next tick, so the canvas mousedown cannot blur it straight away. `positionTextEditor()` runs in `afterRender` and follows pan and zoom. `closeTextEditor(commit)` creates, updates, or removes the label when it is emptied. Enter commits, Shift+Enter adds a new line, Escape cancels, and blur commits. The editor's variables are declared before `renderer.afterRender` because of the temporal dead zone. `annotationEntries` builds the right-click menu: the four arrow styles, Reverse direction (`interactions.reverseArrow`) and Delete for arrows; Edit text… and Delete for labels. The canvas menu gained "Add text label here". Select all, the status bar counts, hover hints, tool hints, save, clear, fit, export and session restore all use `graph.isEmpty()` or annotation counts. `largestComponent` now only follows atom or bond hovers.
- **Markup.** Arrow and Text buttons were added to the tool group, the help overlay lists the new shortcuts and gestures, and `css/style.css` styles `#annotation-editor` and the text cursor.

Not covered: copy/paste, duplicate and saved stamps carry only atoms and bonds, so annotations in a copied selection are dropped. Clean-up (K) does not move annotations. Arrows are free-standing and not attached to molecules. Label text is drawn as typed, with no automatic subscripts in formulas such as H2. Verified by a new scratchpad browser driver, `drive6.py`, with 20 checks: creation, snapping, the two-line label, style cycling, undo/redo, the context menu, reverse, drag, select-all nudge, double-click edit, reload persistence, saved JSON, PNG export, erase, and Delete plus undo. The rendering was also checked visually in both themes.

### Update, later session (37), continued — scheme copy/paste, subscripts and mass balance

- **Copy, paste and duplicate (`js/interactions.js`, `js/app.js`).**
  - `extractFragment(atomIds, annotationIds)` adds `fragment.annotations` (copies of the arrows and labels) only when annotation ids are passed, so saved stamps and SMILES copies keep their old shape.
  - `insertFragment` accepts fragments that hold only annotations. It includes annotation points when centring the paste, offsets them with the atoms, and selects the pasted annotations.
  - `copyAtoms` and `duplicateAtoms` pass `annotationTargets(atomIds)`. Duplicate centres on `contentBounds(atomIds, annotationIds)`.
  - `fragmentSummary` and `fragmentHasContent` build the toasts and the Paste menu state.
- **Automatic subscripts (`js/renderer.js`).**
  - `labelSegments(line)` marks digit runs that directly follow a letter, `)` or `]` as subscripts. "H2O", "CH2Cl2", "(CH3)2CO" and "Et3N" come out as expected, while "25 °C", "2 equiv" and the "1)" in "1) NaBH4" stay as typed.
  - `drawTextLabel` draws each segment with `annotationSubFont`, dropped by `annotationSubDrop`. `measureLabelLine` measures the mixed runs so hit boxes and highlights stay tight.
  - Only the drawing changes: the stored text is exactly what was typed.
- **Mass balance (`js/scheme.js`, new).**
  - `schemeFrame(arrow)` projects points onto the arrow axis as distance along it and perpendicular distance from it.
  - `schemeSides(graph, arrow)` finds each connected component's centroid. Components inside the band (at least `SCHEME_SETTINGS.minBand`, or the arrow length) that lie before the tail are reactants; those beyond the head are products. The nearest other arrow on each side, found the same way, caps the search, so in A → B → C the first arrow sees A and B and the second sees B and C.
  - `schemeFormulaCounts` parses the Hill formula from `computeProperties` after removing the `chargeText` suffix, so deuterium counts as `D`.
  - `schemeBalance` returns the reactant and product formulas (plain and with Unicode subscripts), the `gained` and `lost` Hill formulas, `chargeDelta`, `balanced` and `complete`.
  - `schemeBalanceText` formats it, for example "Not balanced · products lose H₂O · C₂H₄O₂ + C₂H₆O → C₄H₈O₂".
- **App wiring.**
  - Hovering a forward arrow with molecules on both sides shows the balance text in the status bar.
  - Every arrow's right-click menu has "Check mass balance", which shows the same text as a toast (ok when balanced, warn otherwise).
  - `index.html` loads `js/scheme.js` after `js/smiles.js`.

Not covered: coefficients are not inferred, so "3 H₂" written in a label does not count and the step reports "products gain H₆". Molecules in text labels are ignored. Verified by a new scratchpad test, `test_scheme_balance.js`, with 7 checks: esterification with and without water, hydrogenation, a protonation charge change, a missing side, and a two-arrow scheme. `drive6.py` gained 4 browser checks: paste doubles the annotations, Ctrl+D duplicates them, the hover status shows the balance, and the context-menu toast appears. A screenshot confirmed the subscripted label.

### Update, later session (37), continued — SVG export and MOL/SDF import/export

- **SVG export (`js/svg-context.js`, new; `js/app.js`).**
  - `SvgContext(width, height)` imitates enough of `CanvasRenderingContext2D` for `Renderer`. Property setters write into a state object that `save`/`restore` stack. Paths collect SVG path commands in user space.
  - `arc` becomes one or two `A` segments, split so that neither needs the large-arc flag. `arcTo` computes the tangent points itself.
  - `fill`, `stroke`, `fillRect`, `strokeRect` and `fillText` each emit an element with `transform="matrix(…)"` taken from the current `setTransform`.
  - Text maps `textAlign` to `text-anchor` and `textBaseline` to `dominant-baseline`, and carries the canvas `font` shorthand as a CSS `font:` style. `measureText` uses a real offscreen canvas.
  - Radial gradients become `<radialGradient gradientUnits="userSpaceOnUse">` definitions. Shadows are ignored. `clearRect` resets the output. `toSvg()` returns the document.
  - In `js/app.js`, `exportFrame()` computes the size and view shared by both exports. `renderExport(ctx, frame, scale)` runs a throwaway `Renderer` without grid or hint. `exportSvg()` downloads `<name>.svg`.
  - Entry points: a new toolbar button `#export-svg-button` next to PNG export, and an "Export SVG" canvas-menu entry.
- **MOL/SDF (`js/molfile.js`, new).**
  - **Writing.** `graphToMolfile(graph, atomIds, title)` writes V2000:
    - coordinates centred and scaled so that one editor bond (`LAYOUT_SETTINGS.bondLength`) is 1.5 Å, with y flipped
    - charges both as atom-block codes and as `M  CHG` lines
    - D written as H plus `M  ISO`
    - wedge/hash as bond stereo 1/6, with `atomA` as the narrow end
    - an error above 999 atoms or bonds
  - `graphToSdf(graph, records)` concatenates records, each with a `> <NAME>` data field and `$$$$`.
  - **Reading.** `looksLikeMolfile(text)` detects a V2000/V3000 counts line.
  - `molfileSplitRecords` splits on `$$$$`, and `parseMolRecord` reads the fixed columns plus `M  CHG` (which replaces atom-block charges, as the format requires) and `M  ISO`.
  - `molRecordToGraph`:
    - drops plain H atoms, which then return as implicit H
    - turns H with mass 2 into D
    - rejects elements outside `MAX_VALENCE`, aromatic bond type 4 and V3000
    - rescales by the median bond length, or runs `computeLayout` when every coordinate is the same
    - validates valence through `smilesValidateGraph`
  - `molfileToFragment(text)` returns a standard `chemical-graph-fragment` with records laid out left to right, plus a `titles` array.
  - **App wiring.**
    - Open (Ctrl+O) now accepts `.mol`, `.sdf` and `.sd`. MOL content is inserted into the current drawing rather than replacing it, so it can be undone.
    - Pasting text that `looksLikeMolfile` imports it, and a bad file shows the parser's message in a toast.
    - The molecule menu gained "Copy MOL block" (`copyMolfileFor`) and "Save as MOL file". The canvas menu gained "Export MOL / SDF" (`exportMolfile(null)`): one molecule gives `.mol`, several give `.sdf` with one named record each (`moleculeRecords`).

Verified by:
- `test_molfile.js` (33 checks): nine SMILES round trips compared on name, formula and SMILES, covering charges, D, stereo, triple bonds and halogens; bond-length restoration; a two-record SDF; folding a file with explicit hydrogens; rejection of Xe, aromatic bonds, V3000 and junk.
- `drive7.py` (11 browser checks), with screenshots `57_svg_export.png` (the SVG rendered in a fresh page) and `58_mol_paste.png`.
- RDKit (installed only in the scratchpad venv): it read the exported SDF back to identical canonical SMILES, including (S)-alanine, (S)-nicotine, E-2-butene, a quaternary ammonium ion and CD₃OH. In the other direction, our parser read RDKit-written files, including one with explicit hydrogens. Stereo descriptors for multi-centre ring sugars are not produced, but the same happens for SMILES input: it is a naming-engine gap, not an import problem.


### Update, later session (37), continued — more elements (B, Si, Se, Li⁺, Na⁺, K⁺)

- **Palette.** `index.html` has buttons for B, Si, Se, Li, Na and K, with no keyboard shortcut. `ELEMENT_NAMES` and `MENU_ELEMENTS` in `js/app.js` list them, so the atom context menu offers them too. Clicking empty canvas with Li, Na or K selected places a lone cation with charge +1 (`js/interactions.js`).
- **Valence (`js/valence.js`).**
  - `MAX_VALENCE` adds B 3, Si 4, Se 2, and 1 each for Li, Na and K. Se joins the hypervalent tables alongside S.
  - `STANDARD_VALENCES` adds B [3], Si [4], Se [2,4,6], and [1] for the alkali metals.
  - New sets:
    - `ALKALI_METALS` (Li, Na, K)
    - `ELECTROPOSITIVE_ELEMENTS` (B, Li, Na, K)
  - `valenceFor` handles the new elements as follows:
    - Si follows the carbon rule, base − |charge|.
    - Electropositive elements use base − charge, so BH₄⁻ has four bonds' worth of capacity and Na⁺ has none.
  - `implicitHydrogenCount` returns 0 for alkali metals. A bare `[Na]` is therefore a radical and is rejected like any other.
- **Rendering and colour.**
  - `js/colors.js` has dark- and light-theme colours for each new element.
  - `IMPLICIT_H_VALENCE` in `js/renderer.js` adds B, Si and Se, so BH₂ and SiH₃ labels are drawn correctly.
  - `nameFor` normally skips charged components, but still names a single alkali-metal atom.
- **Stereo.** `js/stereo.js` gives CIP atomic numbers Li 3, Na 11, K 19 and Se 34 (B and Si were already present).
- **SMILES.** In `js/smiles.js`, `SMILES_SUPPORTED` includes the new elements.
  - Organic-subset `B` is accepted; aromatic `b` is rejected.
  - `js/properties.js` has a `PROP_SMILES_ORGANIC` set. The writer brackets any element outside it, e.g. `C[Si](C)(C)C`, `C[Se]C` and `[Na+]`.
- **Properties.** `js/properties.js` has average and monoisotopic masses for all six elements. The Crippen logP table has no contributions for B, Si or Se, so logP for compounds containing them is approximate.
- **Naming (`js/naming-core.js`).**
  - `NAMING_UNSUPPORTED_ELEMENTS`, `METAL_ION_NAMES` and `unsupportedElementName(graph, atomIds)` run first in `nameStructureDetailed`.
  - A lone Li⁺, Na⁺ or K⁺ is named "lithium(1+)", "sodium(1+)" or "potassium(1+)".
  - Any other component containing B, Si, Se or an alkali metal returns an empty name, and the UI falls back to the molecular formula. This avoids a wrong carbon-skeleton name such as calling TMS a pentane.
- **MOL/SDF.** Nothing changed. The reader accepts the new elements automatically through `MAX_VALENCE`, and the writer already emitted any symbol.

Verified by:
- `test_new_elements.js`:
  - formulas, SMILES, names and MOL round trips for TMS, PhB(OH)₂, Me₂Se, Na⁺/K⁺/Li⁺, BH₄⁻, TMS-OMe and SeO₂
  - sodium acetate as two components
  - average mass of TMS, 88.225
  - rejection of `[Na]`, aromatic `b` and `[Na+]C`
- `drive7.py`: the Na button places Na⁺, and pasted SMILES with the new elements land on the canvas (screenshot `59_new_elements.png`).

### Update, later session (37), continued — abbreviations / superatoms (Ph, OTs, Boc, CO₂Me …)

- **Model.** An abbreviation is not a new atom type. The whole group stays in the graph, and two flags control how it is shown:
  - `atom.abbr = '<key>'` on the anchor, the atom that bonds to the rest of the molecule (the O of OTs, the Si of TBS).
  - `atom.abbrHidden = true` on every other atom in the group.
  - The group is the anchor plus every `abbrHidden` atom reachable from it through other `abbrHidden` atoms (`Graph.abbreviationMembers(anchorId)` in `js/graph.js`). A hidden atom that no anchor reaches is drawn normally, so a stray flag can never make atoms invisible.
  - Because the full structure is always present, naming, SMILES, formula and properties, MOL/SDF and mass balance all work unchanged. For example, the OTs ester of phenol is named "((4-methylphenylsulfonyl)oxy)benzene".
- **`js/abbreviations.js` (new).**
  - `ABBREVIATIONS` lists 19 groups. Each has `smiles` (written from the anchor outwards), `label` and an optional `left` label used when the group points left:
    - Me, Et, iPr, tBu, Ph, Bn, Ac, Boc, Cbz, TMS, TBS
    - OMe/MeO, OAc/AcO, OTs/TsO, OMs/MsO, CF₃/F₃C, CO₂Me/MeO₂C, CN/NC, NO₂/O₂N
  - `abbreviationFragment(key)` parses `'C' + smiles` and drops the dummy first atom, so the anchor's open valence is correct: `[Si](C)(C)C` is not a radical, and `OS(=O)(=O)…` stays within valence. Nitro is the neutral N(=O)=O form the editor already uses. The fragment is cached on the definition.
  - `placeAbbreviation(graph, key, point, originAtomId)` is reached from `placeStamp` for any stamp key `'abbr:<key>'` (`abbreviationKeyForStamp`).
    - It calls `placeCustomStamp` with the anchor passed explicitly. `placeCustomStamp` gained an optional `anchorId` argument and only searches for the atom farthest from the centroid when that argument is missing.
    - When placed standalone, the group is translated so the anchor sits on the click point. It then sets the flags.
  - Helpers:
    - `abbreviationHiddenIds(graph)`
    - `withAbbreviationMembers(graph, ids)`: adds each anchor's members to a selection.
    - `abbreviationLocked(graph, atomId)`: an anchor that already has an outside neighbour accepts no further bonds.
    - `expandAbbreviation(graph, anchorId)`
    - `abbreviationLabel(atom, side)`
  - Recognition for the "Collapse to …" menu:
    - `abbreviationMatches(graph, atomId)` tries every single bond in the clicked atom's component as a cut.
    - `abbreviationSide` gathers the far side by BFS. It gives up if the cut lies in a ring, if the far side reaches an existing group, or if the far side exceeds `maxGroupAtoms` (24).
    - The clicked atom must be the candidate anchor or inside the group.
    - `abbreviationSignature` compares the side against each definition as a rooted tree string (element, charge, sorted child bonds, `r<order>` for ring closures), together with the atom count.
    - Matches are sorted smallest first. `collapseAbbreviation` sets the flags.
- **Rendering (`js/renderer.js`).**
  - `render()` stores `hiddenAtoms`. Hidden atoms, their bonds and their selection halos are skipped, and `contentBounds` ignores them.
  - Anchors count as labelled atoms, so bonds are trimmed at the label.
  - `drawAbbreviation` draws the label in the anchor's element colour, with digits as subscripts (reusing `labelSegments`) on a background box.
    - `abbreviationSide(atom)` returns −1 when the neighbours lie to the right. The `left` variant is then used, and it is aligned so its last glyph sits on the atom, as in MeO₂C–Ar.
- **Interaction (`js/interactions.js`).**
  - Hidden atoms and bonds cannot be hit, snapped to, merged or marquee-selected.
  - Locked anchors refuse new bonds from growing a chain, attaching a stamp or bonding existing atoms. Element and charge changes on an anchor are refused with a flash.
  - Dragging, the selection, and rotating or flipping the selection all carry the hidden members along.
  - Deleting an anchor cascades to its members, via `Graph.removeAtom`.
  - Copy/paste keeps the flags. `extractFragment` copies them. `insertFragment` restores them after checking the key against `ABBREVIATIONS`, strips orphaned hidden flags, and selects only visible atoms.
- **UI.**
  - A new "Abbreviations" sidebar section (`#stamp-buttons-abbr`, `.abbr-grid` in `css/style.css`) has one stamp button per group. Click on the canvas to place a group standalone, or drag from an atom to attach it.
  - Right-clicking a label gives "Expand X" and "Delete group" (`abbreviationEntries` in `js/app.js`).
  - Right-clicking an atom of a matching drawn-out substituent offers up to three "Collapse to X" entries (`collapseEntries`).
  - `loadGraphState` keeps valid flags, so abbreviations survive autosave, reload, undo and redo.
  - Saved custom stamps still drop the flags, so a saved stamp that contains an abbreviation comes back fully drawn out.

Verified by:
- `test_abbreviations.js` (293 checks). For every key:
  - attach to a carbon and check the flags, the hidden count, the lock and a bond length of 50
  - formula and `nameStructure` are identical to the drawn-out `'C' + smiles`
  - the MOL block has the full atom count
  - expand → recognise → collapse round trip; deleting the anchor cascades
- `test_abbreviations.js`, other cases:
  - a standalone Ph sits on the click point and is named benzene
  - phenyl acetate offers OAc and Ph
  - n-propyl is not offered as iPr; isopropyl is
  - cyclohexane offers nothing
- `drive8.py`:
  - OTs is attached by dragging, and the status formula is C₁₃H₁₂O₃S
  - Expand and "Collapse to OTs" work from the context menu, with undo/redo
  - shift-drag moves the hidden atoms with the label
  - copy/paste duplicates the group; the eraser removes the whole group
  - CO₂Me is drawn as MeO₂C on the left and tBu on top, and standalone Boc, NO₂ and TBS are placed
  - an attached TBS refuses a second bond
  - SVG export contains the labels, and everything survives a reload
  - screenshot: `60_abbreviations.png`

### Update, later session (37), continued — curved electron-pushing arrows

- **Model.** Curly arrows are ordinary `kind: 'arrow'` annotations. There are two new styles:
  - `'electron'`: full head, two electrons.
  - `'fishhook'`: single barb, one electron.

  `ARROW_STYLES` in `js/renderer.js` now has six entries. Curved arrows carry a signed `bend`: the quadratic control point sits at the chord midpoint plus `bend × length` along the chord's left normal, so a negative bend bows a left-to-right arrow upwards.
- **Geometry (`js/scheme.js`).** It lives here so the Node bundle can test it.
  - `CURVED_ARROW_STYLES` and `CURVED_ARROW_SETTINGS`: default bend −0.4; −0.8 for short arrows below 70 units; clamp ±1.5; 32 samples.
  - `isCurvedArrow(arrow)`
  - `arrowBend(arrow)`: uses the default when the bend is missing or zero, and clamps.
  - `defaultArrowBend(length)`: `−0.4 × 70 / length`, capped at −0.8, so short arrows are rounder.
  - `curvedArrowControl(arrow)`
  - `arrowPathPoints(arrow)`: two points for straight arrows, the sampled curve for curved ones.
  - `polylineLength(points)` and `polylineTrim(points, fromStart, fromEnd)`
  - `schemeSides` ignores curved arrows, both as the arrow being balanced and as neighbours that bound a scheme step. Mechanism arrows drawn inside a scheme therefore never change its mass balance.
- **Rendering (`js/renderer.js`).**
  - `drawArrow` hands curved styles to `drawCurvedArrow`.
    - Each end is trimmed according to what it lands on: 13 for a labelled atom, 6 for a bare carbon vertex, 3 otherwise (for example a bond midpoint). The ends are found by matching an atom within 1 unit.
    - Electron arrows get a filled head along the end tangent.
    - Fishhooks get a single stroked barb on the outer side of the curve. The inside is the side of the end tangent where the tail lies.
  - `strokePolyline`, `annotationBounds` (from the sampled path) and the hover/selection highlight all follow the curve.
- **Interaction (`js/interactions.js`).**
  - New tool `'curly'` (key U, "Curly" toolbar button). It shares `beginArrow`, `finishArrow` and the draft with the arrow tool, but the style comes from `curlyStyle`, not `arrowStyle`.
  - Both ends snap through `curlySnap` to an atom centre or a bond midpoint, with no angle snapping.
  - Clicking an arrow with either arrow tool cycles only within its own family: straight styles, or electron ↔ fishhook.
  - With the arrow or curly tool active, `hitTest` checks arrows before atoms and bonds, because curly arrows usually lie over bonds.
  - `annotationAt` hit-tests along the sampled path.
  - `flipArrowBend(annotation)` negates the bend.
  - `transformAtoms` negates the bend when the transform is a reflection. It detects this from the sign of the determinant, so flipping the selection mirrors curly arrows correctly and rotation leaves them alone.
  - New arrows and drafts get `defaultArrowBend(length)`.
  - `insertFragment` and `loadGraphState` (in `js/app.js`) keep `bend`.
- **Bug fix, copy/paste.** `insertFragment` now adds pasted annotations before the single `selectionChanged()`. Previously it rendered, and so committed a history step, after adding the atoms but before adding the annotations. Undoing a paste that contained arrows or text therefore left the pasted atoms on the canvas.
- **UI (`js/app.js`, `index.html`).**
  - `ARROW_LABELS` gains "Electron-pushing arrow" and "Fishhook arrow (one electron)".
  - The arrow context menu lists only the arrow's own family. Curved arrows get "Flip curve" instead of "Check mass balance".
  - `TOOL_HINTS.curly` and the help-panel rows for U and the Curly tool are new.

Verified by:
- `test_curved_arrows.js` (24 checks):
  - control point and path geometry; bend default, clamping and length scaling
  - polyline length and trimming, including over-trim
  - a curly arrow neither splits a reaction scheme nor has sides of its own
- `drive9.py`:
  - U selects the tool
  - a curly arrow from a benzene π bond snaps to the bond midpoint and to an atom, and stores the length-scaled bend
  - clicking cycles electron ↔ fishhook; the context menu shows only its family plus "Flip curve"; flip then undo
  - the straight arrow tool is unaffected, and the curly tool remembers fishhook
  - X (horizontal flip) mirrors the bends
  - copy/paste keeps the bends, and one undo removes the whole paste
  - SVG export and reload
  - screenshots: `61_curly_arrows.png`; zoomed sample `61b_curly_zoom.png`

### Update, later session (37), continued — locant display toggle

- **Naming (`js/naming-core.js`).**
  - `nameStructureLocants(graph, atomIds)` names the component through the real `nameStructureDetailed`. It returns `{name, systematic, locants}` or `null`. `locants` is a `Map` from atom id to IUPAC locant for the parent chain or ring.
  - The map comes from the side channels the naming tiers already fill for stereo descriptors: chain, substituent, ring and scaffold, in that priority order. `nameStructureDetailed` stores the winning map in `lastNameLocants`; nothing else reads that variable.
  - Aromatic rings use a separate display-only channel, `lastRingDisplayLocants` in `js/naming-ring.js`, read with `takeLastRingDisplayLocants()`. The stereo channel would have changed which map `buildStereoPrefix` receives, so it is not reused. `nameAromaticRing` and `nameBenzenePrincipalRing` record their `chooseRingNumbering` result in `lastAromaticNumbering`, and the aromatic branch of the single-ring namer maps it onto the ring's atom ids. `deriveRingName` and `nameStructureOnce` reset the channel.
  - `locantMapConsistent(graph, locants, systematic)` guards the result, because side channels can be left over from an intermediate naming attempt. A map is rejected unless:
    - it has at least 2 atoms
    - its locants are exactly 1..n
    - its atoms form one connected piece
    - every numbered atom that carries something outside the parent has its locant quoted in the systematic name. Locant 1 is exempt, because names such as "4-chlorophenol" leave out the principal locant. The check is skipped when the name quotes no numbers.
  - Rejected or unavailable maps return `null`, and the canvas then shows no numbers for that molecule rather than wrong ones. Ethyl propanoate is the known case: its map mixes the alkyl and acyl sides. Naphthalene, pyridines and recognizer names such as phenethylamine get no map yet.
- **Renderer (`js/renderer.js`).**
  - `showLocants` (default off), with `locantCache` keyed by the new `componentSignature(atomIds)`. `nameFor` now uses the same signature helper.
  - `locantsFor(atomIds)` skips charged components and single atoms.
  - `drawLocants()` runs in screen space before the name pills. It draws a small rounded chip for each numbered atom that is not hidden by an abbreviation.
  - `locantDirection(atom, centroid)` places each number in the widest angular gap between the atom's bonds. Ties are broken toward the side facing away from the molecule's centroid (`locantOutwardBias`), so trisubstituted ring atoms get the number outside the ring.
  - The offset grows for labelled atoms and scales with zoom between 0.7× and 1.4×.
  - Name pills rise by `locantNameLift` while locants are on, so a top locant is not hidden under the pill.
  - New theme colours `locant` and `locantBg`; new `RENDER_SETTINGS` entries `locantFont`, `locantOffset`, `locantLabelOffset`, `locantOutwardBias`, `locantNameLift`.
- **UI (`js/app.js`, `index.html`, `css/style.css`).**
  - New toolbar button `#locants-button` (a "#" icon) beside the theme toggle, and the `#` key. Both call `setLocants(show)`, which updates `aria-pressed` and the `.icon-button.active` style (shared with `.tool-button.selected`), stores the viewer preference under localStorage `showLocants`, and re-renders.
  - The preference is restored on load. Toggling does not touch the drawing or the undo history.
  - New help row for `#`.
- Numbering always follows the systematic parent, even when the pill shows a common name (for example "p-chlorophenol" is numbered as 4-chlorophenol).

Verified by:
- `test_locants.js` (38 checks):
  - exact locant layouts for 10 structures across chains, cycloalkanols, phenols, a benzoic acid and dihalobenzenes
  - `null` for the ester, a single atom, naphthalene and a charged ion
  - `locantMapConsistent` rejects disconnected, gapped and name-contradicting maps and accepts a plain chain
  - calling `nameStructureLocants` does not change the later `nameStructure` result
- `drive10.py`:
  - the toggle changes the canvas and sets `aria-pressed`, the active style and the stored preference
  - the autosaved drawing is unchanged, and undo after a toggle still undoes the last import
  - the preference survives a reload; `#` hides locants again
  - screenshots `62_locants.png` (dark) and `62b_locants_light.png`
- The full suite: 35 unit tests and `drive.py` through `drive10.py`, all `ERRORS: []`.

### Update, later session (37), continued — pinch zoom and two-finger pan

- **Touch input (`js/interactions.js`).** `bind()` adds non-passive `touchstart` / `touchmove` / `touchend` / `touchcancel` listeners on the canvas. The canvas already has `touch-action: none`. Every handler calls `preventDefault`, so the browser neither scrolls, page-zooms nor fires emulated mouse events. The state lives in `this.touch`: `{pending, active, last, pinch, lastTap, detail, longPress}`.
  - **One finger** is replayed through the existing mouse handlers. `touchMouseEvent(point, detail)` builds a minimal fake event with the fields the handlers read: `clientX/Y`, `button:0`, `shiftKey`, `altKey`, `detail`, `target` and a no-op `preventDefault`.
    - The press is deferred as `pending`. It only becomes `onMouseMove` + `onMouseDown` (in `beginTouchPress`) once the finger moves more than `touchSlop` (8 px) or lifts, so a second finger arriving first turns into a pinch without drawing anything.
    - `endTouchPress` sends `onMouseUp`.
    - A second tap within `doubleTapMs` (350 ms) and `doubleTapDistance` (24 px) gets `detail: 2`, so the double-click behaviours (select molecule, edit text) work.
  - **Long press:** after `longPressMs` (550 ms) without moving, a pending touch calls `onContextMenu` at that point and is consumed.
  - **Two fingers** start `touch.pinch` from `touchPinchState` (finger distance and midpoint in canvas coordinates) and the view at that moment.
    - Each move sets the scale to start scale × distance ratio, clamped to `RENDER_SETTINGS.minScale/maxScale`. It then places the world point that was under the starting midpoint under the current midpoint, so one gesture zooms and pans together.
    - A single-finger action already in progress is ended normally first.
    - The pinch ends when all fingers lift. A leftover finger never starts drawing.
  - **Context menu:** `js/app.js` closes an open menu on an outside `touchstart` through the same `closeMenuOutside` used for `mousedown`.
- **Trackpads (`onWheel`).**
  - Without Ctrl, a pixel-mode wheel event with any horizontal delta or a fractional vertical delta is treated as a two-finger trackpad scroll, and `renderer.panBy(-deltaX, -deltaY)` pans.
  - Integer vertical deltas (mouse wheels) still zoom as before.
  - Ctrl + wheel (what browsers send for a trackpad pinch) zooms with `pinchWheelZoomSpeed` (0.01) when |deltaY| < 50. Larger deltas, from Ctrl + mouse wheel, keep the normal speed.
- New `INTERACTION_SETTINGS`: `pinchWheelZoomSpeed`, `touchSlop`, `doubleTapMs`, `doubleTapDistance`, `longPressMs`. New help row for the gestures.

Verified by:
- `drive11.py`, using real CDP touch events in a touch-enabled context:
  - a tap places one atom and is one undo step
  - a one-finger drag from an atom draws a bond
  - pinching out from 100 px to 200 px apart reads 200% and adds nothing
  - a two-finger drag keeps the zoom and moves the drawing by exactly the finger offset: the eraser misses the old spot and hits the shifted one
  - a long press opens the context menu and adds nothing; a tap elsewhere closes it
  - a double tap in the select tool selects the whole molecule
  - a mouse wheel still zooms; a horizontal trackpad scroll pans without zooming; Ctrl + small-delta wheel zooms
  - screenshot `63_touch.png`

### Update, later session (37), continued — recent structures list

- **New module `js/recent.js`**, loaded after `js/abbreviations.js`.
  - `RECENT_SETTINGS = {storageKey:'recentStructures', limit:12, labelLength:28, minAtoms:2}`.
  - `recentEntryFromGraph(graph, atomIds, label)` snapshots one component as `{key:'recent:'+smiles, label, smiles, atoms, bonds}`.
    - The atoms keep element, position and charge. Bonds keep their order.
    - Abbreviation flags and wedge styles are dropped, as for saved stamps.
    - It returns `null` for single atoms or when no SMILES can be computed. An empty label falls back to the SMILES and is cut to 28 characters.
  - `mergeRecent(list, entries, limit)` puts the new entries first in the order given and removes duplicates by SMILES, so re-adding a molecule moves it to the front. It caps the list at `limit` (default 12).
  - `validRecentList(value)` keeps only well-formed entries (finite coordinates, bonds pointing at listed atoms) and rebuilds their keys. Corrupt storage yields an empty list.
- **Sidebar (`index.html`, `js/app.js`).**
  - A new "Recent" section (`#recent-section`, `#stamp-buttons-recent`) sits directly under Elements. It is hidden while empty and uses the same collapse and search behaviour as the other sections.
  - `renderRecent()` rebuilds the buttons and registers each entry in `CUSTOM_STAMPS`, removing stale `recent:` keys. Clicking a button selects it as a stamp, so it places or attaches exactly like a saved stamp via `placeCustomStamp`. Right-click forgets the entry.
  - `rememberRecent(atomIds?)` names each affected component with `renderer.nameFor`, then merges and persists the list. It is called:
    - before Clear
    - before opening a saved drawing over the canvas
    - after `insertSmilesFragment` (SMILES and Molfile import; only the inserted molecules are recorded)
    - on Save, Export PNG, Export SVG and Copy SMILES
  - The list is per viewer (localStorage), is not part of the drawing, and undo does not touch it.
- **Toolbar breakpoint (`css/style.css`).** Tool-button labels are now hidden at viewport widths up to 1780 px (previously 1360 px). The curly and locant buttons had pushed the right-hand groups (theme, help, clear) off-screen at common laptop widths. The toolbar now fits from 1440 px up; below that it still scrolls sideways, as before.

Verified by:
- `test_recent.js` (16 checks):
  - entry shape and key; label fallback and truncation; single atoms ignored; charges kept
  - a partial-component snapshot
  - newest-first merge with de-duplication and move-to-front; limit cap
  - JSON round trip; garbage, dangling-bond and bad-coordinate rejection
  - a stored entry placed back with `placeCustomStamp` names as aspirin
- `drive12.py`:
  - the section is hidden when empty; an import records "aspirin"
  - Clear records the hand-drawn molecule, and undoing the clear leaves the list alone
  - clicking a recent entry selects it, and clicking the canvas places C9H8O4
  - SVG export moves aspirin to the front; the list survives a reload
  - right-click forgets an entry; stamp search finds recent entries; corrupt storage is ignored
  - screenshot `64_recent.png`
- Toolbar fit measured at 1100–1920 px: no overflow from 1440 px up.
- The full suite: 36 unit tests, `drive.py` through `drive12.py`, all `ERRORS: []`.

### Update, later session (37), continued — numbering tie-break and locant-map leaks

- **Citation-order tie-break for heterocycles (`chooseHeteroRingNumbering`, `js/naming-ring.js`).** Sometimes two numberings of a heteroring give identical locant sets. The chooser now breaks that tie the way `chooseRingNumbering` already did for carbocycles: it compares `citationOrderLocants`, so the substituent cited first alphabetically gets the lower locant. The best record now also stores `cited`. Names this fixes:
  - `5-bromo-2-chloropyrazine` → `2-bromo-5-chloropyrazine`
  - `3-chloro-2-fluoropyrazine` → `2-chloro-3-fluoropyrazine`
  - `3-bromo-2-chloro-1,4-dioxane` → `2-bromo-3-chloro-1,4-dioxane`

  Before the fix, the name depended on drawing order or orientation.
- **Locant side channels no longer leak from discarded or nested naming passes (`js/naming-core.js`, `js/naming-general.js`).** The drawn locant map sometimes showed another pass's numbering. Example: 3-bromo-5-chloropiperidine drawn with Cl on atom 3.
  - `nameStructureOnce` now also resets `lastChainStereoLocants` at the start.
  - When the alternative `generalName(…, true)` name is not used, the ring, display and chain channels are restored along with the substituent and scaffold ones, which were already restored.
  - When the primary `deriveName` fails and `generalName` supplies the name, the chain, ring and display channels are cleared. Anything left in them came from naming substituents.
  - `genRingBaseName` saves and restores the chain, ring and display channels around its `deriveName` call, which only fetches a heteroring's base name. This stops, for example, quipazine showing piperazine numbering and methylphenidate showing piperidine numbering.
- **Display map sources (`nameStructureDetailed`).** `lastNameLocants` no longer uses the substituent channel. That channel holds the numbering of an alkyl or ring *substituent*, which the stereo prefix needs but which never numbers the parent. The stereo prefix still uses it as before.
- **`locantMapConsistent`** now also rejects a two-word name (containing a space) that quotes no locants, such as `phenyl propanoate`. A map could only cover one of the parts. Single-word names without locants (`butane`) are still accepted.

Verified by:
- `test_order_invariance.js`, extended:
  - each structure is built from 3 rotations (for stereo SMILES) or 3 rotations plus 3 mirrors, each with 3 atom/bond orderings
  - `hetero_batch.json` (43) and `tie_batch.json` (31) are added to the default files
  - the locant map must also be stable, compared as a sorted list of `locant:element[neighbour elements+degrees]`, so symmetric numberings compare equal
  - result: 341 structures, 0 unstable names, 0 unstable maps (before: 3 unstable names, 23 unstable maps)
- `test_locants.js` now has 56 checks:
  - the three tie-break names from both input directions
  - the piperidine map follows its name
  - no substituent-only map for MK-212, quipazine, methylphenidate, phenyl propanoate or cyclohexyl pentanoate
- Recognizer orientation was checked through the real `nameStructure`: 2C-x/amphetamine/tryptamine variants in `tie_batch.json` are stable and correct. No recognizer change was needed.
- The full suite: 36 unit tests, `drive.py` through `drive12.py`, all `ERRORS: []`.

### Update, later session (37), continued — naming conventions batch

- **Hypervalent sulfur valence (`canAddBond`, `js/valence.js`).** A double-bonded terminal O counts as an oxo first. Single-bonded terminal O atoms (allowed only for S) fill any oxo slots left, up to `HYPERVALENT_MAX_OXO_COUNT`, and the rest count as normal bonds. Sulfonic acids no longer throw: tosic acid, MsOH, sulfuric acid, benzenesulfonic acid, taurine.
- **Acyclic acyl families (`js/naming-chain.js`).** All are verified through `nameStructure`.
  - `classifyAcylEnd` sorts an acyl carbon's X into a halide, amide (terminal N) or ester (O-alkyl) end.
  - `nameAcylFamily` names the virtual acid (every X turned into OH) through `deriveName`, saving and restoring the four locant channels, and then rewrites the ending:
    - `…dioyl dichloride`, `…diamide` and diesters (`diethyl propanedioate`, `ethyl methyl propanedioate`)
    - single acyl halides (`acetyl chloride`, `formyl chloride`, `2-chloropropanoyl chloride`)
  - It runs first in `nameAcyclicAcylDerivative`.
  - `multipliedAlkylWord` gives `bis(…)` for names containing locants and `di-` before `tert-`/`sec-`/`iso-`, so diesters and carbonates read `di-tert-butyl`.
  - `resolvePlainAlkylSide` falls back to `resolveGenericSubstituent` for branched carbon-only alkyls, so `tert-butyl`, `sec-butyl` and `isobutyl` esters now name.
  - A carbonic monoester is `alkyl hydrogen carbonate`. The anhydride branch turns two half-carbonates into `di<alkyl> dicarbonate` (Boc₂O = `di-tert-butyl dicarbonate`) and rejects other acid names that contain a space.
- **Unsaturated substituents.**
  - `genDescribeChain` (`js/naming-general.js`) rejects an exo carbon attached by a multiple bond, so CC(=C)OAc is no longer `isopropyl acetate`.
  - `prop-1-en-2-yl` joins `GEN_RETAINED` and `RETAINED_SUBSTITUENT_NAMES`, and a retained name containing digits is parenthesised.
  - 2-carbon unsaturated substituents are `ethenyl`/`ethynyl`.
  - Carvone, limonene, α-methylstyrene and isopropenyl acetate are re-keyed.
- **Two-carbon locants (`nameForChain`).** Locants are shown on an ethane chain when positions are otherwise ambiguous: any prefix alongside an alcohol, amine or thiol suffix, or more than one prefix with no suffix. Acid, aldehyde and nitrile suffixes fix C1, so `chloroethanoic acid` keeps no locant. The unsaturation stem keeps no locant (`ethene`). Examples:
  - `1,1-` and `1,2-dichloroethane`
  - `1-bromo-2-chloroethane`
  - `2-chloroethan-1-ol`
  - `2-(dimethylamino)ethan-1-ol`

  Halothane and vinylidene chloride now match their common names.
- **Thiol suffix (`attachSuffix`).** A thiol with a locant keeps the final `e` (`propane-1-thiol`, not `propan-1-thiol`). The existing propanethiol, butanethiol and tert-butylthiol keys now match.
- **Nitrile carbons are not chain atoms when the nitrile is not principal.** `nameForChain` rejects such a chain. `deriveName` then retries each longest chain with terminal nitrile carbons trimmed, and passes them as `cyanoIds`: they become core atoms with a `cyano` prefix on the neighbour. `nameStructureOnce` never prefers a `generalName` alternative that contains `nitrilo`. Results:
  - `cyanoethanoic acid` (was `3-nitrilopropanoic acid`)
  - `ethyl cyanoethanoate`
  - `3-cyanopropanoic acid`
- **`nameStructureOnce` prefers the `generalName(…, true)` alternative** in three new cases:
  - `amineParent`: an acyclic structure whose derived name uses an amino prefix on a hydride, or an N-substituted amine, gets `N,N-diethylethanamine`, `N-methylmethanamine`, `N,N-dimethylethane-1,2-diamine`.
  - `fusedSuffix`: a hydroxy, amino or sulfanyl prefix on indole, naphthalene, quinoline and similar parents gets `naphthalen-1-ol`, `quinolin-8-ol`, `4-methylnaphthalen-1-ol`, `1H-indol-5-ol`.
  - `lostSulfur`/`sulfurClass`: a derived name that dropped a sulfur atom (naphthalene-1-thiol was plain `naphthalene`), or that uses a thio or sulfinyl prefix on a hydrocarbon, gets the functional-class name: `dimethyl sulfide`, `dimethyl sulfoxide`.
- **Output-only name styling (`sulfanylPrefixStyle`, `indicatedHydrogenStyle`).** These apply to `full` after common-name lookup. Lookup tries the raw name first and then the styled one, so older keys keep working.
  - An unparenthesised simple `alkylthio`/`alkylsulfinyl` prefix becomes `(alkylsulfanyl)`/`(alkylsulfinyl)`, with guards for thiophene, thiolane, thiourea and similar ring or functional names.
  - Pyrrole, indole, imidazole and pyrazole get `1H-` indicated hydrogen: `1H-indole`, `3-methyl-1H-indole`, `1-(1H-pyrrol-2-yl)ethanone`, `2-amino-3-(1H-imidazol-4-yl)propanoic acid`. Iso-, benz- and already-indicated names are left alone.
- **Common-name re-keys:**
  - naphthols/naphthylamines/oxine and the naphthalenediol/diamine keys use the suffix forms
  - methionine is `2-amino-4-(methylsulfanyl)butanoic acid`
  - the cyanoacetic family uses the `cyanoethanoate` names
  - the self-referential `quinolin-4/8-amine` entries are removed

Verified by:
- `test_conventions.js` (new): 45 systematic names and 9 common names.
- The full suite: 37 unit tests, `drive.py` through `drive13.py`, all `ERRORS: []`.

### Update, later session (37), continued — plus sign for reaction schemes

- **New annotation kind `plus` (`{ kind: 'plus', x, y }`).**
  - `Renderer.drawPlus` strokes two crossing lines, `RENDER_SETTINGS.plusSize` (20) long and `plusWidth` (2.4) wide, in the bond colour. They are drawn as vector strokes rather than a font glyph, so they scale cleanly and export through the SVG context.
  - `annotationBounds` gives it a fixed square box, which hover, selection, hit-testing, erasing and moving already use.
- **Plus tool (`data-tool="plus"`, key `G`).**
  - A click on empty canvas adds a plus. A click on an existing annotation falls through to the normal annotation press, so a plus can be dragged.
  - The canvas gets the `tool-plus` class (copy cursor), and `TOOL_HINTS.plus` explains the tool.
  - Hovering shows "Plus sign — drag to move, Del to delete". The context menu offers only Delete.
- **Persistence.** The autosave/load sanitiser in `js/app.js` and `insertFragment` in `js/interactions.js` both accept `plus`. Undo/redo, copy/paste and autosave work unchanged, since `extractFragment` copies annotations generically. `schemeSides` ignores non-arrow annotations, so pluses do not affect mass balance.

Verified by:
- `drive13.py` (new): place, drag without duplicating, undo/redo, the `G` toggle, reload survival, delete, and copy/paste; screenshot `shots/plus_placed.png`.
- The full suite: 37 unit tests, `drive.py` through `drive13.py`, all `ERRORS: []`.

### Update, later session (37), continued — silane naming

- **`silaneName(graph, atomIds)`** (end of `js/naming-general.js`) names organosilanes with a single silicon atom. It returns `null` in these cases:
  - more than one Si, or another unsupported element (B, Se, Li, Na, K) is present
  - any atom is charged
  - the Si is in a ring
  - any Si bond is not single
  - any Si neighbour cannot be named by `genSubstituent(ctx, neighbourId, si, 1)`
- **Suffix:** hydroxy groups on silicon become the suffix: `silanol`, or `silanediol` (and so on) for more than one. All other substituents are prefixes.
- **Prefix order:** prefixes are grouped, sorted with `genSortKey` (which ignores `tert-`), and multiplied with `genMult`. A complex prefix (digits, brackets, commas or inner hyphens) gets `bis(...)`-style parentheses. A simple single prefix that comes right after a `tert-`/`sec-` prefix is parenthesized, CAS/Sigma style: `tert-butyl(chloro)dimethylsilane`.
- **Unnamed hydrogens:** hydrogens left on silicon are implicit and get no prefix (`triethylsilane`). `[SiH4]` is `silane`.
- **Hook in `js/naming-core.js`:** `unsupportedElementName` calls `silaneName` before it would return the empty name. The result is `{ full, common: COMMON_NAMES[full] || null, systematicPrimary: full }`. Siloxanes, disilanes and molecules with a silyl group on a larger skeleton (for example a TBS ether of a diol) still get the empty name.
- **New `js/common-names-extra.js` entries:**
  - `tert-butyl(chloro)dimethylsilane` → tert-butyldimethylsilyl chloride (TBSCl)
  - `chlorotrimethylsilane` → TMSCl
  - `tetramethylsilane` → TMS
  - `chlorotriethylsilane` → TESCl
  - `tert-butyl(chloro)diphenylsilane` → TBDPSCl
  - `chlorotriisopropylsilane` → TIPSCl
  - `triethylsilane` → TES-H
  - `dichlorodimethylsilane` → dimethyldichlorosilane
- Verified by:
  - `test_conventions.js`: 68/68 checks, including 11 silane systematic names (with siloxane staying empty) and 3 silyl chloride common names.
  - `test_new_elements.js`: expectations updated from empty names to `tetramethylsilane (TMS)` and `methoxytrimethylsilane`.
  - All 37 `test_*.js` files exit 0.
  - `drive.py` through `drive13.py` each print `ERRORS: []`.

### Update, later session (37), continued — element integration (B, Se, Si, alkali metals, ions and salts)

- **New file `js/naming-elements.js`**, loaded in `index.html` after `js/common-names-extra.js`. It names structures that contain boron, selenium, silicon, lithium, sodium or potassium, and structures that carry charges.
- **`js/naming-core.js`:**
  - New global `ELEMENT_NAMING_STATE = { ignoreCharges: 0, allowSilicon: 0 }`.
  - `unsupportedElementName` returns `null` unless the structure contains a special element or a charge. A charge only counts when `ignoreCharges` is 0, and Si only counts as special when `allowSilicon` is 0.
  - Monatomic metal ions are named directly (for example `sodium(1+)`). Everything else goes to `extendedElementName`.
  - If that returns nothing, special elements get the empty name, and charged but otherwise ordinary structures fall through to the normal namer.
- **`extendedElementName(graph, atomIds)`** tries these steps in order:
  1. More than one component → `nameSaltDetailed`.
  2. Contains Se → `seleniumName`.
  3. Contains an alkali metal and more than one atom → `metalCompoundName`.
  4. Contains B → `boronName`.
  5. Non-zero net charge → `ionName`.
  6. Contains Si → `siliconName`.
  Each branch returns the empty name `{ full: '', common: null, systematicPrimary: null }` rather than a wrong name when its handler fails.
- **Re-entry flags:** `withElementNamingFlag(flag, fn)` raises one `ELEMENT_NAMING_STATE` counter while `fn` runs. Handlers use it to call `nameStructureDetailed` again on a modified graph copy. `elementGraphCopy(graph, atomIds, mapAtom)` builds that copy; returning `null` from `mapAtom` drops the atom.
- **Selenium (`seleniumName`):**
  - Molecules that contain both Se and S are rejected.
  - Inorganic species are looked up in `SELENIUM_INORGANIC_NAMES`: hydrogen selenide, selenium dioxide and trioxide, selenous acid and selenic acid.
  - Everything else is named as the sulfur analogue, and the words are rewritten through `SELENIUM_WORD_MAP`: thiophene → selenophene, sulfanyl → selanyl, thiol → selenol, sulfide → selenide, sulfoxide → selenoxide, thiazole → selenazole, and so on.
  - The result is rejected if it is the formula fallback or still contains a sulfur word.
  - `SELENIUM_COMMON_NAMES` adds selenocysteine, selenomethionine and selenophenol.
- **Boron (`boronName`):**
  - Pinacol boronates (`pinacolBoronRing`) are named as `4,4,5,5-tetramethyl-2-R-1,3,2-dioxaborolane`.
  - B2pin2 is handled by `diboronName`.
  - Borate anions are looked up in the inorganic table first, then built from their aryl or alkyl groups (for example `tetraphenylborate`).
  - Boric, boronic and borinic acids get acid names, e.g. `(4-methoxyphenyl)boronic acid`. Everything else is named as a `…borane`.
  - Common names come from `BORON_COMMON_NAMES`: trimethyl borate, BF3, BCl3, BBr3, HBpin, B2pin2 and TEB.
- **Silicon (`siliconName`):**
  - With one Si, silyl esters are tried first (`silylEsterName`: Si–O–C(=O) or Si–O–SO2, e.g. `trimethylsilyl trifluoromethanesulfonate`), then `silaneName`.
  - With two Si, `disilaneName` names disilanes, disiloxanes and disilazanes, using `1,1,1,3,3,3`-style locants and supporting a `-diol` suffix.
  - Otherwise the normal namer runs under `allowSilicon`, using the new silyl prefix, and its result is kept only if it contains "sil".
  - Common names come from `SILICON_COMMON_NAMES`: HMDSO, HMDS, TMDSO, TMSCN, TMSN3, TMSOTf, TBSOTf, TIPSOTf, TIPS-H and others.
- **`js/naming-general.js`:**
  - `silaneName` now accepts charges. It gives priority to the cyano, hydroxy and amino suffixes (`silanecarbonitrile`, `silanol`/`silanediol`, `silanamine`). It returns `null` when another principal group is present, so the general namer handles that case.
  - Prefix assembly moved into `genAssembleCentralPrefixes`.
  - `genSilylSubstituent` gives `trimethylsilyl`, `(tert-butyldimethylsilyl)`, and so on. `genSubstituent` calls it for Si.
  - Si–O becomes `(…silyl)oxy`.
  - N=N=N is detected as `azido`.
  - The -yl → -oxy contraction is limited to methyl, ethyl, propyl, butyl (including iso-, sec- and tert- forms) and phenyl.
  - `genCompoundPrefix` treats `…yloxy`, `…ylsulfanyl`, `…ylamino` and similar prefixes as complex, and `genFullyWrapped` prevents double parentheses. Together they give `2-((tert-butyldimethylsilyl)oxy)ethanol` and `(cyclohexyloxy)trimethylsilane`.
- **Ions (`ionName`):**
  - Inorganic ions are looked up in `INORGANIC_ION_NAMES` by `formula|charge`. The formula is a Hill formula that includes implicit hydrogens. Trivial names come from `INORGANIC_ION_COMMON` (borohydride, bicarbonate, bisulfate).
  - Organic ions are classified by `ionSiteKind` as carboxylate, sulfonate, alkoxide, thiolate, amide, ammonium, azinium or phosphonium.
  - Charge pairs that are bonded to each other (for example nitro groups) are ignored when classifying.
  - The neutral parent is named under `ignoreCharges`, then rewritten:
    - Anions go through `transformAnionName` (`…ate`, `…olate`, `…thiolate`, `…aminide`). A partially deprotonated diacid becomes `hydrogen …dioate`.
    - Cations go through `transformCationName` (`…aminium`, `…-1-ium`, `…phosphanium`).
  - Common names come from `anionCommonName`, `cationCommonName` and `quaternaryCommonName`, for example acetate, tosylate, tert-butoxide, tetrabutylammonium and methyltriphenylphosphonium.
- **Metal compounds (`metalCompoundName`):**
  - A metal bonded to carbon is named as an organometallic (`butyllithium`). Common names come from `ORGANOMETALLIC_COMMON_NAMES`: n-BuLi, sec-BuLi, t-BuLi, MeLi and PhLi.
  - A metal bonded to O, S, N or a halogen is named as a salt: the metal is split off and the partner atom gets a −1 charge. Examples: `sodium methanolate` / sodium methoxide, LDA, LiHMDS, KOtBu.
- **Salts (`nameSaltDetailed(graph, componentAtomIds)`):**
  - Cation and anion names are combined with multipliers (`saltMultiplied`) until the charges balance, e.g. `disodium carbonate`, with common name `sodium carbonate`.
  - It returns `null` when the charges do not balance.
  - Common names come from `SALT_COMMON_NAMES` (TBAF, LiHMDS, NaHMDS, KHMDS, borohydrides), or are built from the ion common names.
- **`js/smiles.js`:** `[se]` is accepted as an aromatic atom, and aromatic bracket atoms are capitalized correctly (`Se`).
- **`js/app.js`:**
  - `buildPanel` always calls `nameStructureDetailed`.
  - An ion with no name shows "No name available for this ion".
  - When more than one charged component is drawn, the panel adds "Salt name" and "Salt short name" blocks from `nameSaltDetailed`.
- **`js/renderer.js`:** `nameFor` no longer skips charged structures, so canvas name labels now appear for ions.
- Verified by:
  - New `test_elements_naming.js`: 68/68 checks covering boron, selenium, silicon, ions, metal compounds and salts, including `nameSaltDetailed` on separate components and `null` for an unbalanced mixture.
  - `test_conventions.js` (13 silane systematic and 3 silyl chloride common names) and `test_new_elements.js`: expectations updated from empty names.
  - New `drive14.py`: in the browser, the panel shows `sodium ethanoate` / `sodium acetate` salt blocks for `CC(=O)[O-].[Na+]`, `chlorotrimethylsilane` with no salt block, and `selenophene`. It prints `ERRORS: []`.
  - All 38 `test_*.js` files exit 0.
  - `drive.py` through `drive14.py` each print `ERRORS: []`.

### Update, later session (37), continued — zwitterions, disulfides and stereo descriptors

- **Zwitterions and organic cations:** these are named through the ion path in `js/naming-elements.js`.
  - `[NH3+]CC(=O)[O-]` → `azaniumylethanoate`, common name `glycine zwitterion`.
  - `C[N+](C)(C)C` → `N,N,N-trimethylmethanaminium`, common name `tetramethylammonium`.
- **Disulfides and diselenides:** named as `dimethyl disulfide`, `diphenyl disulfide` and `dimethyl diselenide`.
- **Stereo descriptors:** the full name starts with R/S and E/Z prefixes, for example `(S)-2-aminopropanoic acid` / `(S)-alanine`, `(R)-butan-2-ol` and `(E)-but-2-ene` / `(E)-2-butene`.
- Known and left alone:
  - A meso diol prints `(2S,3R)` rather than `meso`.
  - Diphenyl disulfide has no common name.
- Verified by: `test_ions_metals_lookup_valence.js` (see the valence entry below).

### Update, later session (37), continued — magnesium, tin, zinc, caesium and calcium

- **`js/naming-elements.js`:**
  - `extendedElementName` sends a multi-atom structure that contains a divalent metal (Mg, Ca, Zn) to `divalentMetalName`, and anything containing Sn to `stannaneName`.
  - `divalentMetalName(graph, atomIds)`:
    - When the metal is bonded to carbon, the carbon groups are named with `genSubstituent` and joined with `genAssembleCentralPrefixes`, followed by the metal word. A halide word from `HALIDE_WORDS` is added when a halogen is present (`phenylmagnesium bromide`).
    - Otherwise the metal is split off, each partner atom gets a −1 charge (`elementGraphCopy`), and the parts are named as a salt through `saltDetailFromParts` (`magnesium dichloride`, `zinc diethanoate`, `calcium carbonate`).
  - `stannaneName(graph, atomIds)` gives `genAssembleCentralPrefixes(names) + 'stannane'`, for example `tributylstannane`.
  - New common-name tables:
    - `ORGANOMETALLIC_COMMON_NAMES` gains Grignard reagents (PhMgBr, MeMgBr/Cl/I, EtMgBr, iPrMgCl, t-BuMgCl, vinyl-, allyl- and benzylmagnesium halides) and Et2Zn / Me2Zn.
    - `TIN_COMMON_NAMES` holds Bu3SnH, Bu3SnCl, Me3SnCl, tetramethyltin, tetrabutyltin and others.
- **`MAX_VALENCE` / `STANDARD_VALENCES` in `js/valence.js`, plus `js/properties.js`, `js/colors.js`, `js/smiles.js` and the palette in `index.html`:** these now include Cs, Mg, Ca, Zn and Sn.
- Known gap: a Sn–Sn compound (`Me3Sn–SnMe3`) still gets an empty name.

### Update, later session (37), continued — parent selection and prefix style fixes

- **`js/naming-core.js`:**
  - New `oxyPrefixStyle(name)`, chained inside `sulfanylPrefixStyle`, does three things:
    - Rewrites `phenylmethyloxy` as `benzyloxy`.
    - Turns pentoxy…decoxy into parenthesized `(pentyloxy)`-style prefixes.
    - Parenthesizes `(benzyloxy)`-type prefixes when another name part follows.
  - `nameStructureOnce` has a new `alcoholParent` flag. It prefers the general namer's `…ol` name over a `hydroxy…ane/ene` name, so `(2-(benzyloxy)phenyl)methanol` is chosen over a hydroxy-substituted arene.
- **`js/naming-chain.js`:**
  - `forward.cited` / `reverse.cited` are built with `citationOrderLocants`.
  - `shouldReverseChain` uses them as a final tie-break, which gives the lowest locant to the substituent cited first alphabetically. `BrCCCl` is now `1-bromo-2-chloroethane`; it was `2-bromo-1-chloroethane`.

### Update, later session (37), continued — name → structure lookup

- **New `js/name-lookup.js`**, loaded after `js/smiles.js`:
  - `nameToSmiles(text)` returns `{ smiles, source }` or `null`. The SMILES is always checked with `smilesToFragment` before it is returned.
  - `lookupStructure(text, depth)` tries these in order:
    1. `NAME_SMILES`: about 140 curated common names (solvents, reagents, amino acids, salts, metal reagents).
    2. `lookupSystematic`:
       - Chains and cycloalkanes use `LOOKUP_PARENT_RE` and `lookupChainSkeleton`. Suffixes are ol, amine, one, al, thiol, nitrile, oic acid, oyl chloride, amide and carboxylic acid.
       - Substituted benzenes use `LOOKUP_ARENES` and `lookupAreneSkeleton`.
       - Prefixes are parsed by `lookupParsePrefixes`, which handles locants including N, multipliers and parenthesized substituents from `LOOKUP_SUBSTITUENTS`.
    3. Esters and salts written as "alkyl/cation …ate", via `lookupAcidToEster`, `LOOKUP_ESTER_ALKYLS` and `LOOKUP_CATIONS`.
    4. The inverse of `COMMON_NAMES` (`lookupCommonTable`).
  - A skeleton is written as `{ atoms: [{ symbol, branches }], orders, ring, closure }` and turned into SMILES by `lookupAssemble`. Branch SMILES use `%n` ring placeholders, which `lookupRingDigits` renumbers.
- **`js/app.js` `updateImport`:**
  - It tries SMILES first, then `nameToSmiles`. A match is shown as "Name recognized → …".
  - If neither works and the input has at least 3 letters, it shows "Not a recognized name or valid SMILES" and reveals the new `#import-online` button.
  - That button queries PubChem's PUG REST `IsomericSMILES,SMILES` for the name and fills the result into the import box. Errors show "PubChem is unreachable" or "No PubChem match".
- **`index.html` and `css/style.css`:**
  - The dialog is now titled "Import SMILES or name" and has a name example button.
  - A new CSS rule, `#import-online[hidden]`, keeps the PubChem button hidden.

### Update, later session (37), continued — reaction scheme labels and automatic plus signs

- **`js/scheme.js`:**
  - `SCHEME_SETTINGS.labelGap` and `ARROW_LABEL_SLOTS = ['above', 'below']`.
  - `arrowLabelAnchor(arrow, slot, height)` places a label at the arrow's midpoint, offset along the arrow's upward normal.
  - `schemePlusPositions(graph, arrow)` sorts the reactant and product components on each side along the arrow and returns the gaps between neighbours.
  - `schemeAutoPlus(graph, arrow)` adds a `plus` annotation in each gap that does not already have one nearby, and returns how many it added.
- **Straight arrows** can now carry optional `above` / `below` strings. `sanitizeAnnotations` keeps them (up to 200 characters), history snapshots include them, and `insertFragment` copies them on paste.
- **`js/renderer.js`:**
  - `arrowLabels(arrow)` produces pseudo text annotations for the labels and skips the one currently being edited (`editingArrowLabel`).
  - `annotationBounds` includes the label boxes.
  - `drawAnnotations` draws the labels after the arrow, so PNG and SVG exports include them.
- **`js/app.js`:**
  - The arrow context menu adds "Add/Edit text above arrow…", "Add/Edit text below arrow…" and "Place + signs".
  - `openArrowLabelEditor(arrow, slot)` reuses the text editor. `closeTextEditor` saves the label, or removes it if the text is empty.

### Update, later session (37), continued — valence and charge checks with one-click fix

- **`js/valence.js`:**
  - `atomValenceOk(graph, atomId)` checks an atom that is already drawn. It lowers each bond by one and asks `canAddBond` whether it could be added back, so the hypervalent oxo rules (nitro, sulfone, sulfate) apply exactly as they do while drawing.
  - `valenceProblems(graph)` returns `{ atomId, message, fix }` for each atom that breaks its valence. Abbreviation atoms, D atoms and elements without a valence entry are skipped.
  - The fix is chosen in this order:
    1. A new formal charge from `VALENCE_FIX_CHARGES` (0, +1, −1, +2, −2), found by `valenceChargeFix`. Examples: neutral N with 4 bonds → +1, O⁻ with 2 bonds → neutral, neutral B with 4 bonds → −1, C⁺ with 4 bonds → neutral.
    2. Otherwise, lowering the order of one of the atom's multiple bonds (`valenceOrderFix`).
    3. Otherwise `null`. Five single bonds on carbon have no automatic fix.
  - `applyValenceFix(graph, problem)` applies one fix.
  - `fixAllValenceProblems(graph, chargesOnly)` repeats until no fixable problem is left and returns the number of fixes. When `chargesOnly` is set, bond-order fixes are skipped.
- **`js/molfile.js`:** `molRecordToGraph` runs `fixAllValenceProblems(graph, true)` before validation. A molfile that leaves out a charge (for example a quaternary N) now imports with the charge added instead of being rejected. `molfileToFragment` totals these as `fragment.chargeRepairs`, and `importMolfile` in `js/app.js` adds "added N missing charges" to its toast. Molfiles that still break valence rules, such as a five-bond carbon, are rejected as before.
- **`js/renderer.js`:**
  - When `renderer.valenceMarks` is true, `drawValenceProblems` draws a red dashed ring (`palette.problem`) around each problem atom. `problemAtoms` holds the ids.
  - Only the main editor renderer turns the flag on, so exports never show the rings.
- **`js/app.js`:**
  - New status-bar button `#status-valence`, set by `updateValenceStatus` from the structure signature. It reads "⚠ N valence problems · Fix", and its tooltip lists each message with its fix.
  - Clicking it runs `fixValenceProblems`, which calls `fixAllValenceProblems` and shows a toast. The change is a normal history snapshot, so it can be undone.
  - The atom context menu gains a "Fix valence: …" entry.
  - The hover status line says "⚠ valence problem, right-click to fix".
- Normal editing already blocks over-valence (`canAddBond`, `setAtomCharge`). Problem atoms come in from restored or opened files, older autosaves and hand-edited JSON.
- Verified by:
  - New `test_ions_metals_lookup_valence.js`, 94/94 checks:
    - 18 names from the items above.
    - 10 name → structure round trips plus an unknown name.
    - Valence detection and fixing for 6 cases, the no-fix and charges-only cases, and no false positives on 8 valid ions and hypervalent structures.
    - Molfile charge repair, and rejection of a five-bond carbon.
  - A sweep of 334 SMILES strings taken from the test files and `js/name-lookup.js`: no false positives.
  - `drive15.py`: name import, with PubChem mocked.
  - `drive16.py`: arrow labels, automatic plus signs, undo/redo, SVG/PNG export, paste and reload.
  - New `drive17.py`: a warning appears after restoring an invalid autosave; hover explains the problem; the atom menu fix; the status-bar fix; undo and redo; molfile charge repair. The screenshot was checked by eye.
  - All 39 `test_*.js` files exit 0.
  - `drive.py` through `drive17.py` each print `ERRORS: []`.


### Update, later session (37), continued — all 118 elements, periodic-table picker, general inorganic naming

- **New `js/elements.js`**, loaded first (before `js/graph.js`):
  - Generated from RDKit data using IUPAC spellings (Aluminium, Caesium, Sulfur).
  - `PERIODIC_ELEMENT_ROWS` holds one row per element: symbol, Z, name, average mass, monoisotopic mass, group (0 for La–Lu and Ac–Lr), period, category, max valence, allowed valences and whether it takes implicit hydrogens.
  - Exports:
    - `PERIODIC_ELEMENTS` (objects) and `PERIODIC_BY_SYMBOL`.
    - `periodicElement(symbol)`; D maps to H.
    - `isMetalElement`, `METAL_CATEGORIES`.
    - `fillElementTable(table, pick)`, which fills only missing keys so hand-tuned entries win.
- **Tables filled from it:**
  - `MAX_VALENCE` and `STANDARD_VALENCES` in `js/valence.js`.
  - `ATOMIC_MASS` and `MONO_MASS` in `js/properties.js`.
  - `CIP_ATOMIC_NUMBERS` in `js/stereo.js`.
  - `SMILES_SUPPORTED` in `js/smiles.js`.
  - `METAL_ION_NAMES` in `js/naming-core.js`.
  - `IMPLICIT_H_VALENCE` in `js/renderer.js`.
  - `ELEMENT_COLORS` / `ELEMENT_COLORS_LIGHT` in `js/colors.js`, by category through `ELEMENT_CATEGORY_COLORS(_LIGHT)`.
  - `ELEMENT_NAMES` in `js/app.js`.
- **`js/valence.js`:**
  - `ALKALI_METALS` adds Rb and Fr.
  - `DIVALENT_METALS` adds Be, Sr, Ba and Ra.
  - `ELECTROPOSITIVE_ELEMENTS` covers B and every metal except Sn.
  - New `NO_IMPLICIT_HYDROGEN`.
  - `CHARGED_BASE_VALENCE` covers P, As, Sb, Bi, Te and Po.
  - Charged H or D has valence 0.
  - An explicit H atom never gets implicit hydrogens.
- **`js/smiles.js`:**
  - Transition metals, lanthanides and actinides accept any bond total from 0 to 8.
  - A bare H or D accepts 0 or 1.
  - Hydrogens that are charged, isolated, bridging or bonded to H stay as real atoms instead of raising "Explicit hydrogen species are not supported". Ordinary terminal hydrogens are still folded into their host atom.
- **`js/molfile.js`:** `molRecordToGraph` keeps explicit H atoms by the same rule, so H2 and H+ can be imported.
- **`js/naming-core.js`:**
  - `nameStructureDetailed` first calls `explicitHydrogenName`.
  - The single-metal shortcut in `unsupportedElementName` is skipped when the atom carries implicit hydrogens, so [AlH4]⁻ is not named "aluminium(1-)".
- **`js/naming-elements.js`:**
  - `explicitHydrogenName`:
    - hydron / proton, hydride, hydrogen atom, dihydrogen / hydrogen.
    - Terminal explicit H atoms are stripped and the rest is named normally.
    - Anything else gets the empty name.
  - `generalElementName` is dispatched from `extendedElementName` when any atom is outside `LEGACY_NAMED_ELEMENTS`. In order:
    1. Checks `INORGANIC_ION_NAMES`, which adds tetrahydroaluminate, permanganate, chromate, dichromate, arsenate, telluride, arsenide and astatide.
    2. Single atoms: "xenon", "iron(3+)", or the parent hydride name.
    3. `parentHydrideName`:
       - `PARENT_HYDRIDE_WORDS` covers alumane, gallane, indigane, thallane, germane, plumbane, arsane, stibane, bismuthane, tellane, polane and astatane.
       - A λ locant is added when the bond count exceeds the group's standard bonding number (13→3, 14→4, 15→3, 16→2, 17→1).
       - Common names come from `PARENT_HYDRIDE_COMMON_NAMES`: arsine, triphenylarsine, DIBAL-H, tetraethyllead, lead(IV) acetate and others.
    4. `binaryCompoundName`, used when every link goes to a terminal F, Cl, Br, I, doubly bonded O or doubly bonded S:
       - Full name uses multipliers, e.g. "xenon tetrafluoride".
       - Common name uses Stock numerals from the bond-order sum (`stockName`, `ROMAN_NUMERALS`, `STOCK_EXEMPT_METALS`), e.g. "iron(III) chloride".
       - `BINARY_COMMON_OVERRIDES` provides "osmium tetroxide".
       - Singly bonded O falls through to the salt split and becomes a hydroxide.
    5. `generalMetalName`:
       - Carbon links give organometallics, optionally with one halide ("methylmercury chloride").
       - O, S, N or halogen links go through `metalSaltSplit`, which moves the metal–ligand bond electrons onto the ligands and names the result as a salt with a Stock common name.
  - `nameSaltDetailed` adds Stock numerals to the common name of single-atom variable-valence cations: "copper(II) sulfate", "iron(III) chloride".
  - `ORGANOMETALLIC_COMMON_NAMES` adds ferrocene.
- **`js/naming-general.js`:** `genRingSubstituent` now names unsaturated carbocyclic substituents, e.g. cyclopenta-2,4-dien-1-yl and cyclohex-2-en-1-yl. It previously gave "cyclopentan-1-yl" for any ring with a double bond, which was a pre-existing bug.
- **UI (`index.html`, `css/style.css`, `js/app.js`):**
  - The palette has 8 buttons: C, N, O, S, P, F, Cl, Br. A full-width `#element-more` button follows. When a table element is active, the button shows it (e.g. "Fe · Iron") in the element's colour.
  - `#ptable-overlay` is a modal with an 18-column grid:
    - Placeholders for La–Lu and Ac–Lr, with the f-block rows below.
    - D sits next to H.
    - Cells are coloured by `colorForElement`.
    - Hover or focus fills `#ptable-info` (name, Z, mass, category). `#ptable-legend` shows the category colours.
  - Search box: matches by symbol, name prefix, number or substring; the best match is outlined and the rest are dimmed. Enter picks the best match. Esc or a backdrop click closes the dialog.
  - Main functions: `openPeriodicTable(onPick, current)`, `closePeriodicTable`, `choosePeriodicElement`, `buildPeriodicTable` (lazy), `paintPeriodicTable` (on theme change), `ptableMatches`, `filterPeriodicTable`, `paintElementMore`.
  - `selectElement` accepts any periodic element, not only palette buttons.
  - Key `Q` opens the table. With an atom hovered, the pick changes that atom.
  - The atom context menu shows the 8 palette elements, plus the atom's own element if it is not one of them, plus a "More…" chip that opens the table for that atom.
  - The keys D and I still work. B, Si, Se, Li, Na, K, Cs, Mg, Ca, Zn, Sn and D moved from buttons into the table.
  - The help overlay and the section hint mention Q.
- Verified by:
  - New `test_all_elements.js`, 68/68 checks:
    - Table integrity.
    - Every noble gas, transition metal, lanthanide and actinide parses, weighs and gets a name.
    - SMILES and molfile round trips for XeF2, FeCl3, OsO4, H2, Ph3As and Me2Hg.
    - Formulas.
    - 43 names.
  - `test_exotic_names.js` and `test_later_families.js` now load `elements`. `test_smiles_import.js` and `test_molfile.js` use the fake symbol `Xx` as their unsupported element, since Xe is now supported.
  - `drive7.py`: its bad-molfile paste uses `Xx`, and Na is picked through the table.
  - New `drive18.py`:
    - Palette has 8 buttons in order, and the table has 119 cells.
    - Hover info.
    - Picking Fe places Fe, and the More button shows it.
    - Q, typing "xenon" and Enter selects Xe.
    - Esc closes the table.
    - The context-menu "More…" chip changes O to Se.
    - Hover, Q, typing "Te" and Enter changes the hovered atom.
    - Light theme.
    - Screenshots checked by eye.
  - All 40 `test_*.js` files exit 0.
  - `drive.py` through `drive18.py` each print `ERRORS: []`.

### Update, later session (37), continued — Reactions tab (phase 1)

- **View tabs.** `nav#view-tabs` at the top of `#workspace` switches between Editor and Reactions.
  - `setView(view)` in `js/app.js` sets `body[data-view]`, shows or hides `section#reaction-view`, remembers the view in localStorage (`view`) and resizes the editor canvas on return.
  - In the Reactions view, CSS hides `#sidebar`, `#toolbar`, `#canvas-wrapper`, `#statusbar` and `#info-panel`.
  - The document keydown and paste handlers return early in that view.
- **`js/reactions.js`** (DOM-free):
  - Data: `REACTION_SOLVENTS` (id, name, SMILES, bp, dielectric, protic), `REACTION_ADDITIVES` (grouped: Acid, Base, Lewis acid, Catalyst, Initiator; `label` is the arrow text), `REACTION_ATMOSPHERES`, `REACTION_ENERGY`, `REACTION_ROLES` (reactant, reagent, catalyst, solvent), `REACTION_TEMPERATURE_PRESETS` (−78, 0, rt, reflux), `REACTION_LIMITS`, `REACTION_SCHEME_SETTINGS`, `REACTION_NAME_ALIASES` (bromine, NaBH4, LiAlH4, SOCl2, NBS, mCPBA, …).
  - `defaultReactionConditions()` and `normalizeReactionConditions(raw)`: clamps temperature to −100…300 °C, dedupes and validates solvent and additive ids, falls back on bad enums, and turns reflux off when no solvent has a boiling point.
  - `reactionRefluxTemperature` returns the lowest solvent bp. `reactionEffectiveTemperature` and `reactionTemperatureText` give "rt", "−78 °C" or "reflux (78 °C)".
  - `reactionConditionLabels(conditions, compounds)` returns `{above, below}`. Above: reagent and catalyst cards, additives, atmosphere (with pressure when not 1 atm) and hν/MW. Below: solvents (including solvent-role cards), temperature, time and concentration.
  - `reactionAliasSmiles(text)` and `reactionParseCompound(text)` try SMILES, then the alias table, solvent names and additive labels, then `nameToSmiles`. The thrown error carries `canSearchOnline` for name-like input.
  - `reactionFragmentGraph`, `reactionDescribeFragment` (name, formula, mass), `reactionGuessRole` (Pd/Pt/Ni/Rh/Ru/Ir/Au/Cu/Hg → catalyst; other metals or ions → reagent; a known solvent or a ≤2-heavy-atom molecule after a reactant → solvent or reagent).
  - `buildReactionScheme(compounds, conditions, products)` returns a fragment with atoms, bonds and `plus` and `arrow` annotations, and the arrow carries the `above`/`below` labels.
  - `serializeReactionState` and `restoreReactionState` handle the localStorage key `reaction`. Restore re-parses each SMILES and drops bad entries.
- **`js/reaction-lab.js`**: `createReactionLab(host)` returns `{root, state, show, repaint, addSmiles}`.
  - Compound input: Enter or Add. A PubChem button appears for unknown names. A card's label falls back to the typed name when the namer only returns the formula (Br2 → "bromine").
  - "Add from editor" takes the selection or the whole canvas, one card per component, with ions kept as one salt.
  - Cards have a thumbnail, name, formula and mass, a role select, equivalents and remove.
  - Conditions form: slider and number input, presets, searchable solvent list with bp/ε/protic tags, additive chips, atmosphere and pressure, energy source, and an Advanced `<details>` with time, concentration and notes.
  - Result column: live scheme preview canvas and a summary of reactants, the over-arrow text and the under-arrow text. Clear and Send to editor.
- **Send to editor** calls `host.sendScheme`, which switches to the editor, places the scheme below any existing drawing, inserts it through `insertSmilesFragment` (one undo step) and fits the view.
- `applyTheme` repaints the lab.
- **Element-support fix:** `loadGraphState` and `interactions.insertFragment` now use `hasOwnProperty` on `MAX_VALENCE`, so zero-valence elements (He, Ne, Ar) survive reload and paste.
- Verified by:
  - New `test_reactions.js`: every solvent, additive and alias SMILES parses; condition defaults, clamping and validation; reflux temperature; label text for Friedel–Crafts-style and hydrogenation conditions; SMILES, name and bad-input parsing; role guesses; scheme geometry (plus between reactants, arrow after them, products after the arrow, consistent ids); state round trip and rejection of bad state.
  - New `drive19.py` (PubChem stubbed):
    - Tab switch hides the editor chrome, and editor shortcuts are inert.
    - Add by SMILES, by name and via PubChem. Invalid SMILES is rejected. Remove works, and Add from editor works.
    - Role and equivalents edits.
    - Solvent search plus Enter, the 0 °C preset, the FeBr3 chip, the N2 atmosphere and the time field, checked in the summary.
    - Reflux uses the DCM bp and locks the slider.
    - Reload restores the view and cards.
    - Light theme.
    - Send to editor produces the arrow and plus annotations with the right labels, 11 atoms, placed below the existing drawing, and is undone in one step.
    - Clear resets the lab.
    - Screenshots were checked by eye and sent to the user.
  - `rebuild2.sh` builds `bundle4.js` (name lookup plus reactions).
  - All 41 `test_*.js` files exit 0.
  - `drive.py` through `drive19.py` each print `ERRORS: []`.

### Update, later session (37), continued — Reactions tab, phase 2 (product prediction)

- **New file `js/reaction-rules.js`** (DOM-free). Loaded after `js/reactions.js` and before `js/reaction-lab.js`. Uses `Graph`, `implicitHydrogenCount`, `computeProperties`, `computeLayout`, `smilesToFragment` and the `reaction*` helpers.
- **Graph helpers:**
  - `rxNeighbors`, `rxHydrogens`, `rxCarbonNeighbors`, `rxIsSp3`, `rxCloneGraph`.
  - `rxAttach(g, element, toId, order, charge)` and `rxSetOrder(g, a, b, order)`; order 0 removes the bond.
  - `rxMerge(target, source, ids)` returns an old→new id map.
  - `rxRemoveBranch`, `rxRings(g, maxSize)`, `rxAromaticRings` (benzenoid 6-rings plus 5-ring heteroaromatics).
- **`rxAnalyze(graph)`** returns `{alkenes, alkynes, carbonyls, alcohols, halides, arylHalides, amines, nitriles, dienes, aromatic}`.
  - `carbonyls` entries are `{c, o, kind, hetero}`, where `kind` is aldehyde, ketone, acid, ester, amide, acylChloride, carboxylate, anhydride or other.
  - `alcohols` and `halides` entries carry a `degree` (the number of carbon neighbours).
- **Regiochemistry helpers:**
  - `rxMarkovnikov(g, a, b)` returns `{more, less, tie}`.
  - `rxMostSubstitutedAlkene`.
  - `rxEliminate(g, c, leavingId, 'zaitsev' | 'hofmann')` removes the leaving atom and forms the C=C. It returns `{beta, regio}` or null when there is no β-H.
  - EAS uses `rxSubstituentEffect` (op/meta and strength) and `rxEasPosition`, which prefers para and then ortho for o/p directors and meta otherwise, and flags deactivated rings.
- **`reactionContext(compounds, conditions)`** builds the context the rules read:
  - `species`: tags from `RX_FORMULA_TAGS`, `RX_ADDITIVE_TAGS`, the atmosphere (H₂/O₂) and light, plus alkoxide (with a `bulky` flag), `amideBase` and `grignard`.
  - `substrates`: untagged organic components of reactant or reagent compounds, each with its `info`.
  - `solventNucleophiles`, `protic`, `polarAprotic`, `temperature` (effective, including reflux), and `has`/`get`.
- **`RX_RULES`**: 19 `{id, name, run(ctx)}` entries:
  - hydrogenation/Lindlar, X₂ addition/halohydrin, HX addition (Markovnikov or peroxide anti-Markovnikov), acid and Hg²⁺ hydration, hydroboration–oxidation, mCPBA epoxidation, ozonolysis
  - KMnO₄ (cold diol, hot cleavage, alcohol and side-chain oxidation) and PCC, NaBH₄/LiAlH₄, Grignard (addition, double addition to esters, protic quench), alcohol→halide (SOCl₂/PBr₃/HX)
  - acid dehydration and ether formation (thresholds in `RX_TEMPERATURES`), Fischer esterification, acyl chloride + amine/alcohol/water, saponification and acid hydrolysis
  - SN2/SN1/E2/E1/Williamson, radical and NBS halogenation, EAS halogenation and Friedel–Crafts (hydride shift, fails on deactivated rings), Diels–Alder
- **Outcome shape.** Each rule returns outcomes `{id, name, type, products, byproducts, warnings, reason, score}` or `{hint}`. `rxProductList` turns the edited graph into `products: [{smiles, count, fragment?}]`: charged pieces are joined into one salt entry and identical products are counted.
- **Cis geometry.** `rxMakeCis(g, a, b)` lays out a component and reflects one branch so that a double bond comes out cis. It sets `g.keepGeometry`, so products carry a coordinate fragment. `reactionProductFragment(product)` returns that fragment, or else parses the SMILES.
- **`predictReaction(compounds, conditions)`** returns `{best, alternatives, hints}`. Outcomes are sorted by score and deduped by `key`. Hints are returned only when nothing matched, and a rule that throws is skipped.
- **`js/reaction-lab.js`:**
  - `predict()` runs on every `renderSummary` and stores `state.prediction`.
  - `chosenOutcome()` honours `state.selected`, which the alternative chips set.
  - `currentScheme()` passes the chosen products to `buildReactionScheme`, so the preview and "Send to editor" include them.
  - `renderPrediction()` fills `#rx-prediction` with the outcome name and type, product cards (`.rx-product`, thumbnails capped by the new `drawFragment(..., maxScale)`), by-products, the reason, `.rx-warnings`, and `.rx-alternatives` chips (`data-outcome`). When there is no outcome, it shows the hints.
  - The summary gains a "Products" row.
- **`index.html`** replaces `.rx-pending` with `div#rx-prediction` and adds the script tag. **`css/style.css`** replaces `.rx-pending` with the `#rx-prediction` / `.rx-outcome-*` / `.rx-product*` / `.rx-warnings` / `.rx-alternatives` styles.

Verified by:
- `test_reaction_rules.js`: 42 reaction cases through the real `nameStructure` (for example 1,2-dibromopropane, tert-butyl vs isobutyl bromide, (Z)-2-butene from Lindlar, p-bromotoluene, m-bromonitrobenzene, cumene via hydride shift, tert-butanol + ethanol from ester + MeMgBr, Diels–Alder adduct), 7 hint cases, and the empty and solvent-only guards.
- `drive20.py`: in-browser hints, FeBr₃ toggling, the peroxide flip, E2 warnings, Diels–Alder, Grignard products, and a sent scheme that includes product atoms (screenshots `reaction_finished.png`, `reaction_grignard.png`, `reaction_e2.png`).
- `drive19.py`: updated to expect the dibromopropane product atoms in the sent scheme.
- Full suite: 42/42 test files, drives 1–20 all `ERRORS: []`.

### Update, later session (37), continued — stoichiometry, minor products and by-products

- **Outcome shape** now includes:
  - `minor`: a product list in the same format as `products`.
  - `consumes`: `[{compound, need}]`, built with `rxUse(entry, need)`, which returns null when a species has no compound behind it (for example, one supplied only by an additive).
  - `stoichiometry`: added by `predictReaction`.
- **By-products** now come from every rule: B(OH)₃, DMSO/ZnO, MnO₂, the Cr(IV) species and pyridinium chloride, borate and aluminium salts, Mg salts, SO₂ + HCl, H₃PO₃, H₂O, HCl or the ammonium salt. SN2 and E2 add the salt named by `rxSaltName(ctx, halogen)` (e.g. NaBr), and E2 also adds the conjugate acid of the base from `rxNeutralName(info)`.
- **Minor products:**
  - The EAS ortho isomer (`rxEasPosition` returns `minorAtom`).
  - The other regio-alkene in E2, E1 and dehydration.
  - The SN1↔E1 cross product, SN2 next to a secondary E2, and E2 next to a hot primary SN2.
  - The second-ranked radical halogenation site.
- **Needs per substrate:**
  - H₂: one per π bond, or one per alkyne for Lindlar.
  - BH₃: 1/3.
  - O₃: one per alkene.
  - KMnO₄: 4/3 per primary alcohol and 2/3 per secondary alcohol or diol.
  - Hydrides: counted hydride equivalents divided by 4.
  - Grignard: 2 for esters.
  - PBr₃: n/3.
  - Amines: 2 when no base is present.
- **`rxStoichiometry(outcome)`** merges repeated compounds and skips solvent and catalyst roles. For each compound it reports `have` (the parsed `equiv`), `ratio = have/need`, `status` (limiting, excess or exact) and `leftover`.
  - It also returns `extent`, `conversion` (relative to the substrate), `limiting`, and `multiplier`: the smallest integer ≤ 12 that makes every coefficient whole.
  - When a reagent other than the substrate limits the reaction, it adds the warning "…is not enough… at most P%… Use at least M equiv".
- **`RX_AIR_SENSITIVE`** covers grignard, reduction-lialh4 and hydroboration. These get an inert-atmosphere warning when the atmosphere is air or O₂.
- **`js/reaction-lab.js`:**
  - `renderPrediction` draws the `minor` products as `.rx-product.minor` cards (dashed border, "minor ·" prefix). They stay out of the scheme.
  - `renderStoichiometry(stoich, productNames)` adds `.rx-stoich`, which contains:
    - the balanced `.rx-equation`;
    - a `.rx-stoich-table` with Compound, Ratio and Supplied columns and a `.rx-stoich-status` cell;
    - `.rx-stoich-yield`, which gets the extra `.short` class below 100%.
  - The summary's Products row lists the minor products.
  - Editing an equivalents input now calls `renderSummary`, so the prediction updates as you type.
- **`css/style.css`** adds the `.rx-product.minor`, `.rx-stoich*` and `.rx-equation` styles.

Verified by:
- `test_reaction_rules.js` gained these checks:
  - the o-bromotoluene minor product;
  - Grignard at 1 equiv: 50% conversion, the equivalents warning and the air warning;
  - Grignard at 2.5 equiv under N₂: excess, no warnings;
  - SOCl₂ gives SO₂ + HCl;
  - E2 lists NaBr and the 1-butene minor product;
  - the hydroboration multiplier is 3.
- `drive21.py`, in the browser:
  - the Grignard warnings, limiting row and 50% line;
  - editing the equivalents to 2.5 and switching to N₂ clears the warnings and shows 100% with the excess row;
  - toluene bromination shows the minor ortho card, and the summary lists it.
  - Screenshots: `stoich_grignard_short.png`, `stoich_grignard_ok.png`, `stoich_toluene.png`.
- Full suite: 42/42 test files; drives 1–21 all `ERRORS: []`.

### Update, later session (37), continued — Reactions tab, phase 3 (condition branching and explanations)

- **`rxConditionVariants(conditions)`** (js/reaction-rules.js) lists single-change variants of the normalized conditions as `{kind, label, change, conditions}`.
  - `remove` variants undo something that is present:
    - each additive;
    - each solvent;
    - light;
    - an H₂ or O₂ atmosphere;
    - a temperature other than 25 °C, or reflux, which goes back to 25 °C.
  - `add` variants try:
    - every missing additive;
    - `RX_BRANCH_SOLVENTS` (water, ethanol, DMSO);
    - light;
    - an H₂ atmosphere;
    - each of `RX_BRANCH_TEMPERATURES` (0/25/60/90/180 °C) more than 5 °C away, closest first.
  - `change` is `{type: additive|solvent|energy|atmosphere|temperature, id|value, on}`.
- **`reactionBranches(compounds, conditions, current)`** re-runs `predictReaction` for each variant and compares `best.key` with the current one.
  - A `remove` variant that changes the key becomes a **factor** `{label, change, outcome, hints}`: something that decides the outcome, reported with what happens without it (`outcome` null means no reaction). Factors are skipped when there is no current outcome.
  - An `add` variant that reaches a new outcome is grouped by key into **branches** `{key, outcome, variants}`, sorted by score and capped at `RX_BRANCH_LIMIT` (6); `more` counts the rest. Each group keeps only its first (closest) temperature.
  - It costs about 35–40 predictions, 30–60 ms in node.
- **`reactionAtmosphereName(id)`** is a small label helper.
- **`js/reaction-lab.js`:**
  - `predict()` caches `state.branches` under a key built from the compounds' SMILES and roles plus the conditions, so editing equivalents does not recompute it.
  - `renderBranches(title)` adds `.rx-branching` with two parts:
    - "Why this outcome": a `.rx-factors` list with the label in `strong`.
    - `title`: `.rx-branches` rows (`.rx-branch`), each with up to 4 `.rx-chip` options and a `.rx-branch-result`, plus `.rx-branch-more`.
    - The title is "What if…" under an outcome, or "Try one change" under the no-product hints.
  - `applyChange(change)` clears `state.selected` and applies the change through `updateConditions`, so the condition controls update too.
  - `outcomeText(outcome)` formats "products (outcome name)" or "no reaction".
- **`css/style.css`** adds the `.rx-branching`, `.rx-branch-title`, `.rx-factors`, `.rx-branches`, `.rx-branch`, `.rx-branch-options`, `.rx-branch-result` and `.rx-branch-more` styles.

Verified by:
- `test_reaction_rules.js`:
  - peroxide is the only factor, and without it the reaction is Markovnikov hydrohalogenation;
  - benzene + Br₂ has no factors and offers an FeBr₃ branch to EAS;
  - removing the solvent stops the SN1;
  - heating branches to E1;
  - each branch has at most one temperature;
  - at 70 °C the temperature is the decisive factor, falling back to SN1;
  - the branch cap holds.
- `drive22.py`:
  - "Try one change" with the FeBr₃ chip, and clicking it applies the additive, lights the toggle and lists FeBr₃ as a factor;
  - the ROOR factor names tert-butyl bromide;
  - an SN1 temperature chip switches to E1 and makes the temperature a factor.
  - Screenshots: `branch_try.png`, `branch_e1.png`.
- Full suite: 42/42 test files; drives 1–22 all `ERRORS: []`.


### Update, later session (37), continued — reaction stereochemistry, Diels–Alder regio/endo, and naming fixes

- **New file `js/reaction-stereo.js`** (loaded before `js/reaction-rules.js`). This is the reaction stereo layer. The rules no longer place wedges themselves. Instead, the working graph carries two spec lists, and `rxProductList` realizes them into drawn wedges.
  - **Tetrahedral specs** are held in `g.stereoSpecs`. Each has the form `{center, ids, parity, origin}`. `ids` lists the neighbours, with `null` for an implicit H. `parity` is the sign of the stereo.js triple product over `ids`. `origin` is `'input'` or `'new'`.
  - **Alkene specs** are held in `g.alkeneSpecs`. Each has the form `{a, b, na, nb, cis}`. When `na`/`nb` are null, the CIP-top neighbours are used.
  - **Capture:** `rxsCapture` and `rxsCaptureAlkenes` read the substrate's wedges and drawn C=C geometry in `reactionContext`.
  - **Copy and merge:** `rxsCopy` is used by `rxCloneGraph`, and `rxsMergeSpecs` is used by `rxMerge`.
  - **Edits:**
    - `rxsReplace(g, center, oldId, newId, invert)` handles SN2 and alcohol → halide (inversion), and SOCl₂ without base (retention).
    - `rxsDrop` handles SN1, and HX on a 2°/3° alcohol.
    - `rxsAlkene` handles Lindlar (cis), alkyne + X₂ (trans) and E2 geometry.
  - **Face model:** `rxsFaceAdd(g, [[center, addedId, z]], hydrogens)` treats the substrate's 2D drawing as a plane and puts added groups at z = ±1.
    - Anti additions use opposite signs: X₂ and halohydrin.
    - Syn additions use the same sign: H₂, hydroboration (H on the more-substituted carbon, O on the other), mCPBA and cold KMnO₄.
  - **E2:** `rxsEliminationGeometry(g, c, beta, leaving)` returns the alkene geometry for an anti-periplanar H–C–C–LG. The rule: with Cα order (LG, Cβ, a1, a2) and Cβ order (H, Cα, b1, b2), a1 and b1 are cis iff the two parities have the same sign.
  - **Realization:** `rxsRealize(g, ids)` does the following in order:
    1. lays out the component;
    2. enforces the alkene specs by reflecting b's side across the a–b line;
    3. wedges one exocyclic, non-centre bond per centre;
    4. returns `{fragment, stereo: {kind, text}}`, where kind is `racemic`, `meso`, `single` or `diastereomers` (text from `RXS_STEREO_TEXT`).
  - **Policy:**
    - A single new centre from an achiral substrate is not drawn.
    - When the input already has chirality, new centres are dropped and the product is labelled diastereomers.
    - Centres fixed by the ring system are left undrawn: non-adjacent bridgeheads (norbornene), or adjacent fusion atoms sharing a 3- or 4-membered ring (cyclohexene oxide). See `rxsBridgehead`, `rxsSmallRingPair` and `rxsOnlyBridgeheads`.
- **`rxsDielsAlder(g, diene, first, second, ewgAtoms)`** builds a 3D transition-state model:
  - The diene is placed flat, and an s-trans drawing is folded to s-cis.
  - The dienophile is mapped onto C1/C4 one layer above. The reflection is chosen so the EWG sits over C2/C3 (endo).
  - New specs are written for the four sp³ carbons.
- **`rxRuleDielsAlder`:**
  - Regiochemistry: the dienophile's β carbon bonds to the more nucleophilic diene terminus (ortho/para rule; O/N/S donors count 2, alkyl 1).
  - The reason text explains the endo and regio choice, and there is a new endo/exo warning.
  - Alkyne dienophiles make no stereocentres.
- **Other `js/reaction-rules.js` changes:**
  - `rxEliminate(g, c, leavingId, mode, anti)` returns `{beta, regio, stereospecific}`.
  - "E2 elimination (Hofmann)" is used only when more than one β carbon was possible.
  - A stereospecific E2 appends an anti-periplanar sentence.
  - `rxMakeCis` is removed.
  - Product entries carry `stereo`.
- **Naming:**
  - `generalName` now records its chosen parent numbering in `genParentLocants`. This covers chain (`genAssembleParent`), monocycle (`genNameRingParentCore`), von Baeyer (`genNamePolyCore`) and fused (`genNameFused`, `genNameFusedKetone`, which use labels such as `3a`).
  - `nameStructureOnce` uses that map as the stereo/display locants in three cases: when the general name is used as the alternative, when it is the fallback, and when the general name equals the derived name and the derived path gave no map.
  - This fixes wrong or missing R/S locants such as "(3S,4R)-2-methoxy…".
  - `buildStereoPrefix` sorts alphanumeric locants.
  - In `nameStructureDetailed`, ester names put the descriptor after the alkyl word ("methyl (1S,2S,4S)-…carboxylate").
  - `classifyAttachment` accepts C=C attachments. On a chain or ring parent they are named as `…idene` (3-methylidenehexane, methylidenecyclohexane), but `resolveGenericSubstituent` rejects them so that substituents keep their `…enyl` names.
  - The fused-hydro prefix gets its missing hyphen before a digit-led parent ("tetrahydro-2-benzofuran").
- **`js/reactions.js`:** `REACTION_REAGENT_LABELS` and `reactionReagentLabel(name, formula)` give friendly labels for PBr₃, PCl₃, PCl₅, SOCl₂, SO₂Cl₂, PCC, NaNH₂ and mCPBA.
- **`js/reaction-lab.js`:**
  - `productDisplayName(product)` adds `rac-` in front of the descriptor for racemic products. It is used in the product cards, the stoichiometry line and the scheme "Products" row.
  - Cards show a `.rx-product-stereo` pill, styled in `css/style.css`; `single` and `meso` pills are cyan.
- **Known limit:** ring-fusion centres with no exocyclic substituent (cis-decalin from Δ9-octalin) cannot be wedged, so they stay unlabelled.
- Verified by:
  - `test_reaction_rules.js`: 22 new stereo/DA cases, plus the Hofmann-name and methylidene checks.
  - A 3D endo check (`endocheck.js`). A norbornene model with the substituent placed endo vs exo gives C2 = S/R. The product's (1S,2S,4S) matches endo for methyl acrylate and acrolein.
  - The E2 Newman check (`e2check.js`).
  - `test_locants.js`: now asserts the general-name parent maps (pyrazine N1…C6; acetate C1–C2).
  - `later_expected.json`: stobadine and two rejected LSD analogues gain descriptors.
  - drive20 now accepts the plain "E2" name.
  - New drive23 checks the rac-trans dibromide tag, the meso dibromobutane, SN2 (R)→(S), the endo cyclopentadiene + maleic anhydride descriptors, isoprene para, and the mCPBA label. Screenshots: `reaction_stereo_br2.png`, `reaction_stereo_da.png`.
  - Full suite: 42/42 test files; drives 1–23 all `ERRORS: []`.

### Update, later session (37), continued — Diels–Alder exo minor product

- `rxsDielsAlder(g, diene, first, second, ewgAtoms, exo)` (js/reaction-stereo.js) takes a new `exo` flag. The 3D model normally picks the dienophile reflection that puts the first EWG atom inside, under the diene (endo). With `exo` true it picks the other reflection, so the EWG points away from the diene.
- In `rxRuleDielsAlder` (js/reaction-rules.js), a local `build(exo)` now does the adduct construction: clone, merge, bond reorder, new σ bonds, EWG atom list and the stereo model. The major product is `build(false)`.
- When the dienophile is activated, carries an EWG and is not an alkyne, the rule may add `build(true)` to `minor`. It does this only when a diene terminus (C1 or C4) has a substituent outside the diene chain. That includes ring atoms such as cyclopentadiene's CH₂.
  - Without such a substituent, endo and exo give the same compound; butadiene + maleic anhydride is one example. Comparing drawn wedges instead would falsely list a duplicate.
- The endo warning now says that the exo isomer forms as a minor product whenever one is listed.
- Verified by:
  - `test_reaction_rules.js` gains six checks.
    - Exo minor products:
      - cyclopentadiene + maleic anhydride → (1R,2R,6S,7S)-4-oxatricyclo[5.2.1.0²,⁶]dec-8-ene-3,5-dione, meso;
      - cyclopentadiene + methyl acrylate → methyl (1S,2R,4S)-bicyclo[2.2.1]hept-5-ene-2-carboxylate, racemic. This is the literature exo configuration; endo is (1S,2S,4S).
      - 1-methoxybutadiene + acrolein → (1S,2S)-2-methoxycyclohex-3-ene-1-carbaldehyde (trans), racemic.
    - No minor product for butadiene + maleic anhydride, isoprene + acrolein, or cyclopentadiene + ethylene.
  - `drive23` screenshot `reaction_stereo_da.png` shows the exo card marked "minor" next to the endo major. The scheme's Products row reads "(minor: …)".
  - Full suite: 42/42 test files; drives 1–23 all `ERRORS: []`.

### Update, later session (37), continued — epoxide opening, Na/NH₃, Felkin–Anh, ratios, fused-ring H wedges, alkene-geometry note, hetero/intramolecular Diels–Alder and mechanism arrows
- **Epoxide opening** (`js/reaction-rules.js`):
  - Base or anionic nucleophiles (`epoxide-base`) attack the less substituted carbon.
  - Acid, whether HX or ROH with H₂SO₄ (`epoxide-acid`), attacks the more substituted carbon.
  - Both are anti additions, and the configuration comes from the substrate's captured tetrahedral specs through `rxsReplace`/`rxsFaceAdd`.
  - Cyclohexene oxide + NaOH gives (1R,2R)-1,2-cyclohexanediol [racemic]. A meso epoxide gives a racemic product.
- **Dissolving-metal reduction** (`nanh3` additive, rule `dissolving-metal`): an alkyne becomes the (E)-alkene through `rxsAlkene(..., false)`.
- **Felkin–Anh** for NaBH₄ reduction and Grignard addition to a carbonyl next to a stereocentre:
  - The major product is the Felkin face and the anti-Felkin product is listed as `minor`, with `ratio = [75, 25]`.
- **Naming fixes** in `js/naming-core.js`:
  - A chain tie-break now yields 1-methoxy-2-methylpropan-2-ol.
  - The 1,2-cyclohexanediol common name is used.
- **Ratios:** `rxOutcome` results may carry `ratio: [major, minor]`. They are approximate textbook values:
  - dehydration and Zaitsev E2: 80:20;
  - Hofmann E2: 70:30;
  - EAS para:ortho, from `rxEasPosition`: 90:10 for strong o/p directors, 65:35 for weak activators, 85:15 for halogens;
  - Diels–Alder endo:exo: 80:20, or 95:5 when `ctx.has('lewis')` (AlCl₃, FeBr₃, BF₃, ZnCl₂, FeCl₃), with an added Lewis-acid sentence in the reason;
  - Felkin: 75:25.
  - `withMinor` deletes `ratio` when it concatenates several minors.
- **Ratio display** (`js/reaction-lab.js`): `outcomeRatio(outcome)` returns the ratio only when there is exactly one minor product.
  - `addCard` prefixes the first card's label with "~N% · ".
  - The summary's Products row reads "(minor ~N%: …)".
- **Fused-ring H wedges** (`js/reaction-stereo.js`):
  - `rxsFusedJunction` detects ring-fusion stereocentres that carry an implicit H.
  - `rxsHydrogenWedge` computes a render-only H position (0.6 bond from the partner centre) and its wedge parity.
  - `rxsRealize` stores these as `fragment.stereoHydrogens = [{atom, x, y, stereo}]`. The ring-bond wedges stay in the fragment, so naming descriptors are unchanged.
  - `drawFragment` clears ring wedges starting at that atom and draws an explicit wedged or hashed H instead.
  - An achiral product with specs gets the stereo kind `relative` ("relative configuration shown (achiral)"). With two H wedges the text is "cis-fused rings (achiral)" or "trans-fused rings (achiral)". Example: octalin + H₂/Pd-C gives cis-decalin.
- **Alkene-geometry note:** `predictReaction` flags each substrate that has `alkeneSpecs` but no `/` or `\` in its SMILES.
  - Any stereo-bearing outcome that consumes such a substrate gets the warning "No E/Z geometry was given for the starting alkene, so the (E|Z) form from the default drawing was assumed; …".
- **Hetero-Diels–Alder** (`rxRuleHeteroDielsAlder`, id `hetero-diels-alder`, score 13):
  - The partners are a diene and an aldehyde with no C=C or C≡C.
  - The rule needs a Lewis acid, or an aldehyde activated by an adjacent C=O. Otherwise it returns a hint to add BF₃ or ZnCl₂.
  - `rxDieneDonor` finds the donor-substituted terminus. The carbonyl carbon bonds to the more nucleophilic end, so Danishefsky's diene + PhCHO gives the 2-phenyl-2H-pyran.
  - It warns that silyl enol ethers are usually hydrolysed to the dihydropyranone.
- **Intramolecular Diels–Alder** (`rxRuleIntramolecularDielsAlder`, id `intramolecular-diels-alder`, score 13):
  - A BFS from each diene terminus finds an alkene carbon outside the diene at path length 4 or 5, which means a 3- or 4-atom tether.
  - It forms the two σ bonds. A 3-atom tether gives a hydrindane and a 4-atom tether gives a decalin.
  - Warnings: ring-fusion stereochemistry is not predicted, and heat is needed below 80 °C.
  - `RX_RULES` now has 23 entries.
- **Mechanisms** (`rxMechanism(g, spec)`, before `rxProductList`):
  1. Build a picture from the product graph: restore the reactant bond orders (adding missing bonds), run `computeLayout`, and add the leaving atoms or labels (`away`, or `perpTo` + `side` for anti E2).
  2. Remove the forming bonds and push detached components apart by `spread·L`.
  3. Apply charges and emit curved electron arrows (`{kind:'arrow', style:'electron', bend}`) between atoms, added keys or bond midpoints. Lone-pair ends are offset by 0.3 L, and the bend sign is chosen toward the `inside` atoms or away from the centroid.
  - Returns `{fragment, caption}`, or null on any failure.
  - Wired for Diels–Alder, hetero-DA, IMDA (3 arrows), Sₙ2 (2), E2 (3, with a B:⁻ label), epoxide opening (2), NaBH₄ reduction (2, H⁻) and non-ester Grignard (2, ⁺MgX).
- **Mechanism UI** (`js/reaction-lab.js`, `css/style.css`):
  - When `outcome.mechanism` is set, a `div.rx-mechanism` panel follows the products. It holds the title, a `canvas.rx-mechanism-canvas` (drawn by `drawFragment(canvas, fragment, 18, 0.9)`) and the caption.
  - New CSS classes: `.rx-mechanism`, `.rx-mechanism-title`, `.rx-mechanism-canvas` (210 px high) and `.rx-mechanism-caption`.
- Verified by:
  - `test_reaction_rules.js` now expects 23 rules and adds about 35 checks covering:
    - epoxide regio/anti and meso → racemic;
    - Na/NH₃ (E)-hex-3-ene;
    - Felkin NaBH₄/MeMgBr major/minor, 75:25;
    - all the ratios above;
    - cis-decalin with two matching H wedges;
    - fused DA descriptors kept;
    - the alkene note present for CC=CC and absent for C/C=C\C;
    - the hetero-DA product and its hint;
    - activated glyoxylate without a Lewis acid;
    - IMDA hydrindane and decalin;
    - mechanism arrow counts for seven rules.
  - `drive24` produces 11 screenshots (`next_*.png`) with all checks ok.
  - Full suite: 42/42 test files; drives 1–24 all `ERRORS: []`.

### Update, later session (37), continued — review follow-ups: IMDA fusion guide, practical hydride excess, enlargeable and cleaner mechanism pictures
- **IMDA fusion guide** (`rxRuleIntramolecularDielsAlder`): after the "only connectivity is predicted" warning, a second, hedged warning is added.
  - With a 3-atom tether (`best.length === 4`), thermal reactions often give cis/trans hydrindane mixtures, and a dienophile C=O or a Lewis acid tends to favour one isomer.
  - With a 4-atom tether, the trans-fused decalin is more often favoured through the chair-like transition state.
  - The rule still doesn't assign fusion stereochemistry. A blanket "cis for short tethers" rule would be wrong too often.
- **Practical hydride excess** (`rxRuleReduction`): every NaBH₄ and LiAlH₄ outcome warns that each BH₄⁻ or AlH₄⁻ delivers four hydrides.
  - It says `hydride / 4` equiv is the theoretical minimum and that 1–2 equiv is used in practice.
  - The stoichiometry table is unchanged and still shows the theoretical ratio and the "excess" against it.
- **Mechanism panel** (`js/reaction-lab.js`, `css/style.css`):
  - The title reads "Mechanism · click to enlarge". Clicking toggles `.rx-mechanism.expanded`, which gives a 440 px canvas and redraws with `maxScale` 1.6 instead of 0.9.
  - The panel uses zoom-in and zoom-out cursors.
- **`rxMechanism` arrow geometry:**
  - An arrow from a bond to one of that bond's own atoms (C=O π → O, or C–X → X) now starts 0.2 L beside the bond midpoint. It ends 0.5 L to the side of the atom and 0.3 L past it, on the side away from the reacting centre. Before, it was 0.2 L long and hidden under the atom label.
  - Text labels added through `add` (such as ⁺MgX) are recorded with their `from` atom. They move with that atom's component when it is pushed apart, so they no longer overlap the detached fragment.
- Verified by:
  - `test_reaction_rules.js` checks:
    - both IMDA fusion guides;
    - the NaBH₄ 0.25-equiv note;
    - the LiAlH₄ ester 0.5-equiv note;
    - the ⁺MgX label sitting at least 0.9 bond from the carbanion.
  - New `drive25.py`:
    - the panel enlarges from 210 to 440 px and shrinks back;
    - the hydride note and both IMDA guides appear in the UI;
    - enlarged screenshots of the reduction, SN2, E2, epoxide, Grignard and Diels–Alder mechanisms (`obs_*.png`).
  - Full suite: 42/42 test files; drives 1–25 all `ERRORS: []`.

### Update, later session (37), continued — mechanism overlay, shared scale and tetrahedral intermediate
- **Enlarged mechanism is an overlay:** `.rx-mechanism.expanded` is now fixed and centred, up to 1000 px wide with a `min(520px, 70vh)` canvas, over a dimmed page (a `box-shadow` backdrop).
  - Escape closes it through a document-level `keydown` listener in `js/reaction-lab.js`, which clicks the open panel.
- **Shared scale:** the enlarged view redraws with `maxScale` 1.3, so every mechanism is drawn at the same zoom. Bond width, arrow weight, arrowheads and label size are therefore identical across reactions. They were already one renderer style; the differences came from per-panel fitting.
- **Intermediate step:** `rxMechanism` takes an optional `intermediate: {charges, hydrogens, label}`.
  1. It lays out a clone of the product component, adds explicit H atoms to the listed atoms and applies the charges.
  2. It places that clone 2.2 L to the right of the arrow-pushing picture, labels included, and adds a `forward` arrow annotation between them, with an optional text label under the intermediate.
  - Used by the aldehyde/ketone NaBH₄ and LiAlH₄ reductions. They show the tetrahedral alkoxide (O⁻ with the new C–H drawn), and the caption says it is protonated on work-up.
- Verified by:
  - `test_reaction_rules.js`: the reduction mechanism contains an O⁻, an explicit H, a forward arrow and the "tetrahedral alkoxide" label; the Grignard mechanism has no intermediate step.
  - `drive25.py`: the overlay opens (`obs_overlay.png`), Escape closes it, and the caption mentions the tetrahedral alkoxide.
  - Full suite: 42/42 test files; drives 1–25 all `ERRORS: []`.

### Update, later session (37), continued — carbonyl pack (Wittig, aldol, Claisen/Dieckmann, acetal, imine/enamine, reductive amination)
- **Five new rules in `js/reaction-rules.js`**, registered after the dissolving-metal rule (28 rules total):
  - `rxRuleWittig` (score 14): an ylide found by `rxYlide`, or a phosphonium salt plus BuLi, turns C=O into C=C. Stabilised ylides give E (90:10), unstabilised ones Z (85:15), and semi-stabilised ones add a warning. The mechanism shows the [2+2] step with the oxaphosphetane as its intermediate.
  - `rxRuleAldol` (score 12): self, crossed, intramolecular and Claisen–Schmidt aldols. When heated, the β-hydroxy carbonyl dehydrates to the enone. Crossed aldols with two enolisable partners add a mixture warning. Intermediate: 'β-alkoxide'.
  - `rxRuleClaisen`: ester + alkoxide gives the β-keto ester. A 1,6- or 1,7-diester closes as a Dieckmann ring. An alkoxide that doesn't match the ester's alkoxy group triggers a transesterification warning (`rxEsterAlkoxyName`). Intermediate: 'tetrahedral intermediate'.
  - `rxRuleAcetal`: aldehyde/ketone + alcohol or diol + acid gives the acetal or ketal (a spiro dioxolane for ethylene glycol). With water and acid, an acetal (`rxAcetalCarbons`) hydrolyses back. Intermediate: 'hemiacetal'.
  - `rxRuleImine`: a primary amine gives the imine, a secondary amine gives the enamine, and NaBH₃CN / NaBH(OAc)₃ (the `mildHydride` tag) give the reductive-amination amine. Intermediate: 'carbinolamine'.
- **Shared helpers:** `rxAlphaCarbons`, `rxEnolateBase`, `rxPathLength`, `rxIntramolecularEnolate`, `rxJoinCarbonyls`, `rxEnolateMechanism`.
- **Hints:** a strong base with no α-H points to Cannizzaro, an enolate with only one α-H is flagged, and an acetal or imine without acid catalysis gets an acid-catalysis hint.
- **NaBH₄ + amine warning:** `rxRuleReduction` warns that NaBH₄ reduces the carbonyl before the imine forms, and points to NaBH₃CN / NaBH(OAc)₃ or a stepwise route.
- **Mechanism additions:**
  - `rxMechanism` accepts `abbreviate: [atoms]`. `rxAbbreviatePhenyls` collapses each all-carbon aromatic 6-ring on those atoms to a "Ph" label: `abbr` goes on the ipso carbon and `abbrHidden` on the other five.
  - The intermediate step, `rxComponentFragment` and `reactionFragmentGraph` all copy `abbr`/`abbrHidden`.
  - An order of 0 in `orders` removes a bond. The Wittig picture uses this to drop the product's P=O.
- **Layout (`js/layout.js`):** new `layoutRotate`. When no subtree reflection helps, `layoutRelieve` also tries ±0.35 and ±0.61 rad rotations around atoms with 4 or more neighbours. On Ph₃P=CR₂ the closest non-bonded distance goes from 13 to 45.
- **Naming:**
  - `genMixedNLocants` / `genLegacyNLocants` in `js/naming-general.js` keep every locant when N- and C-locants are mixed on a single parent, so the product is (E)-N,1-diphenylmethanimine and no longer "benzophenone imine".
  - In `js/naming-core.js`, `nameStructureOnce` re-runs in legacy mode when there is no common-name hit. It accepts the legacy common name only when the legacy systematic name has an N-locant, which keeps N-methylbenzylamine, dibenzylamine and benzophenone oxime.
- **Reagents (`js/reactions.js`):**
  - Aliases for NaBH₃CN, NaBH(OAc)₃/STAB, BuLi, the Wittig ylides and methyltriphenylphosphonium bromide.
  - `REACTION_REAGENT_LABELS` entries for the borohydrides and the four ylides.
- Verified by:
  - `test_reaction_rules.js`:
    - a product check for every reaction above;
    - the hints and the mismatch/NaBH₄ warnings;
    - the imine name and the reagent labels;
    - Wittig mechanism Ph abbreviation with no P=O;
    - layout relief > 40.
  - `drive26.py`: 15 UI checks with screenshots (`carb_*.png`, `carb_mech_*.png`).
  - Full suite: 42/42 test files; drives 1–26 all `ERRORS: []`.

### Update, later session (37), continued — multi-step synthesis routes
- **Route model (`js/reactions.js`, DOM-free):**
  - `reactionRouteStep(compounds, conditions, outcome, product, minor, previousSmiles)` returns `{from, to, reaction, above, below, yield}`. Each end is `{smiles, name, fragment}`.
  - The carried starting material comes from `reactionRouteCarried`:
    - the reactant that matches the previous step's product;
    - otherwise the largest reactant that is no bigger than the product, so a Wittig ylide is never chosen over the aldehyde.
  - Other reactants go over the arrow, before the usual reagent/additive labels.
  - The default yield is selectivity × maximum conversion: the outcome ratio for the major or minor product (100 without one), times `stoichiometry.conversion`. The user can edit it.
- **Other route functions:**
  - `reactionRouteYield(steps)`: the product of the step yields, to 0.1%, or `null` for an empty route.
  - `buildRouteScheme(steps)`: one fragment laid out as molecule → arrow → molecule. Every arrow gets reagents above, and conditions plus the step yield below. It stretches to fit its labels (at least `REACTION_SCHEME_SETTINGS.arrowLength`, 7.5 units per character). Text annotations number the compounds 1…n, and an "Overall yield: X% over n steps" line is centred underneath.
  - `reactionRouteSerialize` / `reactionRouteRestore`: `serializeReactionState` now saves `route`, and `restoreReactionState` returns it. Restore rebuilds fragments from SMILES, drops malformed steps, clamps yields to 0–100, trims labels to `REACTION_ROUTE_LIMITS.labelLength` (120) and caps the route at `maxSteps` (8).
- **Short reagent labels:** `reactionShortLabel` is used by `reactionConditionLabels` for reagents and catalysts, so every scheme arrow uses it, not just routes. Its order is:
  1. an explicit label;
  2. the parenthetical abbreviation at the end of the name (PCC, MeMgBr, Ph₃P=CHCO₂Et);
  3. `REACTION_SHORT_FORMULAS`, which maps AlH4Li → LiAlH4, BH4Na → NaBH4 and a few bases;
  4. the formula.
- **UI (`js/reaction-lab.js`, `index.html`, `css/style.css`):**
  - Each single-component product card has a "Use as reactant →" button. `useAsReactant` appends the step, replaces the compounds with the product as the only reactant, and resets the conditions. If the chosen product doesn't continue the existing route, a new route starts.
  - `#rx-route`, above the reaction preview, is rendered by `renderRoute`. It shows the scheme canvas, one row per step (reaction name, from → to, editable yield %) and the running "n steps · overall X%".
  - Its buttons: Undo step (pops the step and restores its starting material), Clear route (keeps the current reaction), PNG, SVG, and Send route to editor.
  - Clicking the canvas enlarges the panel into the same kind of overlay as the mechanism view. Escape closes it.
  - `exportRoute` draws the scheme with a light-theme `Renderer`, onto a 2× canvas for PNG or an `SvgContext` for SVG, and downloads `synthesis-route.png` / `.svg`.
- Verified by:
  - `test_route.js` (new): benzaldehyde → Wittig → H₂, Pd/C → LiAlH₄. It checks:
    - the carried material, short labels and yields (90, and 10 for the minor Z product);
    - the overall yield (90%, and 54% after edits);
    - the scheme arrows, numbering, overall-yield text, label-driven arrow length and atom count;
    - the save/restore round trip, junk rejection and the step cap.
  - `drive27.py`: the three-step route in the UI:
    - it checks the yield edits, the PNG and SVG downloads (the SVG contains the overall-yield text), persistence across reload, the enlarge overlay with Escape, undo, send to editor, and clear;
    - screenshots `route_use_button.png`, `route_panel.png`, `route_overlay.png`, `route_export.png`, `route_editor.png`.
  - Full suite: 43/43 test files; drives 1–27 all `ERRORS: []`.

### Update, later session (37), continued — carbocation intermediates and 1,2-shifts

- **`rxCationShift(g, c)`** (`js/reaction-rules.js`) decides whether a carbocation at `c` rearranges. It returns `{from, kind, group?}` or null.
  - Only a secondary cation can shift: `c` needs exactly two carbon neighbours, all single-bonded and sp3.
  - Hydride shift (`kind: 'hydride'`): a neighbour with at least one H and two other carbons, which would become a tertiary cation.
  - Methyl shift (`kind: 'methyl'`, `group` = the methyl id): a quaternary neighbour that carries a CH3.
  - Hydride is preferred over methyl.
- **`rxApplyShift(g, c, shift, moving)`** moves the bond from atom `moving` (the halogen, the solvent oxygen, or the OH that is about to eliminate) from `c` to `shift.from`. For a methyl shift it also moves the methyl from `shift.from` to `c`. Both carbons lose their stereo specs through `rxsDrop`. Atom ids are kept, so ids from the source graph stay valid.
- **`rxShiftText(shift)`** gives "1,2-hydride shift" or "1,2-methyl shift".
- **`rxCationMechanism(source, spec)`** builds a stepwise mechanism through `rxMechanism`'s `intermediates` list. It takes `spec = {c, leaving?, protonated?, pi?, shift?, beta?, capture?, caption}`.
  - Picture 1 shows ionisation. Either the C–leaving-group bond breaks, with `protonated` drawing the leaving O as OH₂⁺; or, with `pi: {a, b, text}`, the C=C arrow goes to an "H–X" label.
  - Intermediate 1 is the cation, labelled by its degree ("secondary carbocation"). When there is a shift it also carries the curved arrow: from the explicit `H<from>` bond for a hydride, or from the `[from, group]` bond for a methyl.
  - Intermediate 2 appears only with a shift and is the "tertiary carbocation".
  - The last cation gets either a β-H deprotonation arrow (`beta`, label "→ loses H⁺") or " + <capture>" (Br⁻, solvent).
- **Rules that now go through a carbocation:**
  - `rxRuleAlcoholToHalide`, with HX and a single 2°/3° alcohol: the mechanism is always shown. A 2° alcohol with a shift gives the rearranged halide as the major product and the unrearranged one as the minor (no ratio). Examples: 3-methylbutan-2-ol → 2-bromo-2-methylbutane; 3,3-dimethylbutan-2-ol → 2-bromo-2,3-dimethylbutane.
  - `rxRuleDehydration`, for 2°/3° alcohols: an E1 mechanism is shown. The shifted route is used only when it changes the major alkene. 3,3-Dimethylbutan-2-ol gives 2,3-dimethylbut-2-ene, with the unrearranged Zaitsev alkene as the minor product. 3-Methylbutan-2-ol keeps its 80:20 result, because both routes give 2-methylbut-2-ene.
  - `rxRuleHydrohalogenation` (Markovnikov, alkenes): now has a mechanism, and rearranges through a shift (3-methylbut-1-ene + HBr → 2-bromo-2-methylbutane). The older "may rearrange" warning only appears when no shift was applied.
  - `rxRuleHalide`:
    - E1 now has a mechanism (ionisation → cation → loses H⁺).
    - Tertiary Sₙ1 solvolysis has a mechanism.
    - Secondary Sₙ1 solvolysis rearranges through `substitute(..., at)`. The new `at = {graph, c}` argument lets the nucleophile bond to the shifted carbon.
- **`rxRuleGrignard`:** the mechanism gains the "magnesium alkoxide" intermediate (the product skeleton with O⁻).
- Verified by:
  - `test_reaction_rules.js`, 10 new checks:
    - the five rearrangements above, each with its major product, minor product and step labels;
    - E1 of tert-butyl bromide;
    - tertiary HBr with no shift;
    - the Grignard alkoxide step;
    - no rearrangement for a primary alcohol or butan-2-ol.

    The old "no intermediate step" check now uses the SN2 mechanism, since the Grignard mechanism now has an intermediate.
  - `drive28.py`: the four rearrangements, E1 and the Grignard reaction in the UI, each opening the enlarged mechanism overlay. Screenshots: `cation_hbr_hydride(_mech).png`, `cation_hbr_methyl_mech.png`, `cation_dehydration(_mech).png`, `cation_alkene_mech.png`, `cation_e1_mech.png`, `cation_grignard_mech.png`.

### Update, later session (37), continued — mechanism export, "Why not…?" and ratio labels

- **Mechanism export (`js/reaction-lab.js`, `css/style.css`):**
  - The route exporter is now the general `exportFragment(fragment, kind, name, what)`, and `exportRoute` calls it. The route export is unchanged: the same light-theme `Renderer` via `routeFrame` / `routeRender`, 2× PNG or `SvgContext`, then `download`.
  - Each mechanism box gains `.rx-mechanism-actions` with PNG and SVG buttons (`.rx-mechanism-export[data-kind]`). The buttons are only displayed while the box is `.expanded`.
  - The click handlers stop propagation, so exporting does not shrink the overlay.
  - Files are named `mechanism-<outcome id>.png` / `.svg`. The step labels and curved arrows are included, because they are ordinary fragment annotations.
- **"Why not…?" (`js/reaction-rules.js`):**
  - `rxWhyNot(ctx, outcome)` returns `[{title, text}]` from a table keyed by outcome id. The keys are sn2, williamson, e2, e2-hofmann, sn1, e1, hydrohalogenation, hbr-radical, alcohol-halide, dehydration and grignard, plus reduction-nabh4 when an ester is present.
  - Some texts depend on context: the halide degree of the consumed substrate, the polar aprotic solvent, the temperature against `RX_TEMPERATURES.e1`, and whether SOCl₂/PBr₃ was used.
  - When `outcome.reason` mentions a 1,2-shift, an "Unrearranged product?" row goes first and replaces "Rearrangement?".
  - `predictReaction` sets `o.whyNot` on every outcome. It also appends the hints from rules that did not fire (as rows with an empty title); before, these were dropped whenever an outcome existed. The `hints` return value is unchanged.
  - The UI renders a closed `<details class="rx-why-not">` ("Why not…?") after the warnings and before "Other outcomes". Outcomes without rows show nothing.
- **Ratio labels on the scheme (`js/reactions.js`):**
  - `buildReactionScheme(compounds, conditions, products, captions)` accepts an optional caption per product. `placeGroup` now returns each placed box's centre x and half-height. Each caption becomes a `text` annotation centred under its product, on a shared baseline 28 px below the tallest product.
  - `currentScheme` in the lab passes the major and minor products with "~80% (major)" / "~20% (minor)" when the outcome has a `ratio`, one product and exactly one minor product. This is the same rule the product cards use.
  - The preview, Send to editor and saved editor state therefore all show both isomers.
- Verified by:
  - `test_reaction_rules.js`, 8 new checks:
    - six why-not rows: SN2 on tertiary, SN1 on primary, unrearranged product, SOCl₂ without a rearrangement, low-temperature E1, anti-Markovnikov;
    - no rows for a hydrogenation;
    - the scheme captions: two labels, in order, on the same baseline, below the atoms, with a plus sign.
  - `rebuild2.sh` exports `buildReactionScheme` from bundle5.
  - `drive29.py`:
    - it checks the overlay buttons, the PNG download name, that the SVG contains the step labels, that exporting keeps the overlay open, that the buttons are hidden when small, the why-not rows for the rearrangement and E2 cases, and the ratio scheme sent to the editor;
    - screenshots `polish_mech_export_overlay.png`, `polish_mech_export.png` / `.svg`, `polish_why_not.png`, `polish_why_not_e2.png`, `polish_scheme_ratio.png`, `polish_scheme_editor.png`.
  - `drive20.py`: the toluene-bromination "send to editor" check now expects the ortho minor isomer too (23 atoms) and the "~65% (major)" / "~35% (minor)" labels.
  - Full suite: 43/43 test files; drives 1–29 all `ERRORS: []`.

### Update, later session (37), continued — HBr/HI esterification demotion and acid reagent labels
- **`rxRuleEsterification` (`js/reaction-rules.js`):** when HBr or HI is present and the partner is an alcohol, the Fischer outcome drops to score 10 and warns that the halide turns the alcohol into an alkyl halide first (use H₂SO₄ or TsOH instead). The alcohol-halide rule therefore wins, and Fischer stays listed under "Other outcomes". HCl is not demoted, because chloride substitution of alcohols is slow without ZnCl₂.
- **`REACTION_SHORT_FORMULAS` (`js/reactions.js`):** gains the Hill-formula keys BrH, ClH, FH, H2O4S, H3O4P, HNO3, Cl2OS, Br3P and H2O2. These map to HBr, HCl, HF, H2SO4, H3PO4, HNO3, SOCl2, PBr3 and H2O2, so drawn acid reagents no longer read "BrH" over the arrow.
- Verified by:
  - `test_reaction_rules.js`, 3 new checks:
    - aspirin + 3-methylbutan-2-ol + HBr → alcohol-halide, with Fischer as an alternative;
    - acetic acid + ethanol + HCl → still Fischer;
    - `reactionConditionLabels` puts "HBr, H2SO4" above the arrow.
  - `rebuild2.sh` exports `reactionConditionLabels` from bundle5.

### Update, later session (37), continued — lab design revamp (renderer, type, editor components, Reactions ELN layout)
- **Structure rendering (`js/renderer.js`):**
  - `RENDER_FONT_FAMILY` is IBM Plex Sans with Helvetica/Arial fallbacks. `RENDER_SETTINGS` now uses ACS-style proportions: thinner bonds (2.2), tighter double-bond spacing, 18 px medium-weight labels and notched arrowheads. The dark theme is `#0d1016`, with a fainter grid and no bond glow.
  - `Renderer.labelBoost()` enlarges labels up to `maxLabelBoost` when zoomed out, so they never render below `minLabelPx`. `atomFont(kind, boost)` builds the label, subscript and charge font strings; SvgContext has no scale transform, so fonts are always built as strings.
  - `labelTrim(atom, ux, uy)` shortens a bond where it meets a label, using the measured glyph width and a rectangle clip instead of a fixed radius.
  - `drawChargeMark(charge, x, y, radius, color)` draws a circled ⊕/⊖ for charges of ±1; larger charges are still drawn as text.
  - Per-instance `strokeScale` and `minLabelPx` let a small canvas draw heavier bonds and legible labels (used by the stamp thumbnails).
- **Colours (`js/colors.js`):** Br in the dark theme is `#d9823b`.
- **Fonts (`fonts/`, `css/style.css`):** IBM Plex Sans and Plex Mono, latin woff2 files at weights 400/500/600, are loaded through `@font-face`. `fonts/OFL.txt` carries the SIL Open Font License. `app.js` waits on `document.fonts.load` before the first real render and before redrawing the stamp thumbnails.
- **Design tokens (`css/style.css`):**
  - The dark `:root` palette is `--bg-app`, `--bg-sidebar`, `--bg-sidebar-2`, `--bg-control`, `--bg-control-hover`, `--bg-elevated`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border`, `--border-soft`, `--lab-cyan`, `--lab-violet` and `--accent-soft`.
  - `--radius` is 6px, and `--font-ui` / `--font-mono` point at Plex. Radii are normalised to 4, 6 or 8px.
  - Tabular numerals are used in inputs, tables, kbd and `#statusbar`.
- **Formulas (`js/properties.js`):**
  - `formulaHtml(formula)` escapes a Hill formula, wraps digit runs in `<sub>` and a trailing charge (`+`, `2−`) in `<sup>`.
  - It is used by the properties panel, `#status-formula`, the compound cards (`.rx-card-meta`) and the product cards (`.rx-product-formula`, whose content is wrapped in a `<span>` because the line is a flex container).
  - `textContent` still reads the plain formula.
- **Status bar (`index.html`, `js/app.js`):** `#status-mass` shows "M … g/mol · exact …" for one component, "ΣM … g/mol" for two to four components, and nothing otherwise. The CSS hides it when empty.
- **Element and stamp tiles (`js/app.js`):**
  - Element buttons are periodic-table tiles: `.tile-number`, the symbol, `.tile-mass`, the kbd shortcut, and a top border in the `--tile-category` colour taken from `ELEMENT_CATEGORY_COLORS`.
  - `drawStampThumbnails()` prepends a `canvas.stamp-thumb` to every button in `STAMP_THUMB_GRIDS` and draws the stamp with an offscreen `Graph` + `placeStamp` and its own `Renderer` (no grid, hint or names; `strokeScale` 2.4; `minLabelPx` 10), manually centred.
  - A thumbnail is skipped when it has a zero-size rect or `dataset.theme` already matches the renderer theme. The function is called from `paintElementAccents()` and `applySearch()`.
- **Reactions ELN layout (`index.html`, `js/reaction-lab.js`, `css/style.css`):**
  - `#reaction-view` is a two-row grid. A full-width `.rx-banner` holds `.rx-banner-scheme` (heading, note and `#rx-preview`) and `.rx-banner-side` (`#rx-summary` and `.rx-actions` with `#rx-reset` / `#rx-send`).
  - Below the banner are three columns: Compounds, Conditions, and Outcome (`#rx-route` and `#rx-prediction`, so the mechanism is the centrepiece).
  - Every existing id and class is kept. Below 1000px the banner stacks and the grid becomes a single column.
- **Stoichiometry sheet:**
  - `#rx-sheet-block` sits under the compound cards. It holds a `#rx-scale` input (mmol per equivalent, saved via `host.storageSet('reactionScale')`) and `table#rx-sheet` with the columns Compound, MW, equiv, mmol and mg. Rows carry a `role-*` class; solvent and catalyst amounts are muted.
  - `renderSheet()` runs from `renderCards()` and after changes to the role, the equivalents or the scale.
  - `reactionParseAmount(text)` (`js/reactions.js`) reads the card's equiv field: a bare number or equiv/eq, mol% or %, mmol, mol, mg or g. Anything else (free text, mL, non-positive values) returns null.
  - `reactionStoichiometry(compounds, scaleMmol)` returns `{name, role, mw, equiv, mmol, mg}` per compound. Equivalents are multiplied by the scale; mmol and mass amounts are converted back to equivalents. Solvents and unparsed amounts leave the figures null, shown as "—".
- Verified by:
  - `test_reaction_rules.js`, 7 new checks: scaling 1 equiv, multiplying equivalents, mol% as a fraction, mmol → equiv and mass, mg → mmol and equiv, solvent/free-text rows with no amounts, and gram parsing with negatives rejected.
  - `rebuild2.sh` exports `reactionParseAmount` and `reactionStoichiometry` from bundle5.
  - `drive20.py`: the "summary lists products" check is now case-insensitive, because the summary keys are uppercased with CSS and `inner_text` returns the rendered case.
  - `look.py r7`: screenshots `shots/r7_empty.png`, `r7_editor.png`, `r7_editor_zoom.png` and `r7_reactions.png`.
  - Full suite: 43/43 test files; drives 1–29 all `ERRORS: []`.

### Update, later session (37), continued — reaction expansion

- **New file `js/reaction-rules-extra.js`:** loaded after `js/reaction-rules.js` in `index.html` and in bundle5. All of its functions use the prefix `rxx`.
- **Engine hooks (`js/reaction-rules.js`):**
  - `RX_FORMULA_GUARDS[formula](g, ids)` must return true for a formula tag to apply. `rxSpeciesTag` checks it.
  - `reactionContext` fills `ctx.organicCatalysts` (`{compound, graph, info}`) with organic compounds whose role is catalyst.
- **New tags:**
  - Formula tags: carbodiimide (DCC, EDC), dmap, amineBase (imidazole, DBU), boc2o, silylChloride (TBS/TMS/TIPS-Cl), fluoride, quaternaryAmmonium, dibal, osmium, nmo, sodamide, diiodomethane, diethylzinc, copper, hydrazine, hydroxylamine, mercuricAcetate, jones (CrO₃), triphenylphosphine, tetrahalomethane (CBr₄/CCl₄), strongAcid (TFA), oxalylChloride, dmso, cation (Cs⁺), weakBase (PO₄³⁻, HCO₃⁻).
  - Additive tags: `pdoac2` → palladium0, `grubbs` → metathesis, `znhg` → zincAmalgam, `zncu` → zincCopper, `dmp` → dmp, `piperidine` → amineBase.
  - `RX_AIR_SENSITIVE` gained enolate-alkylation, acetylide-alkylation, acetylide-addition, dibal, grignard-carboxylation, grignard-nitrile and simmons-smith.
- **Helpers:**
  - `rxxBase(ctx, tags)` returns the first present tag.
  - `rxxWater`, `rxxJoin(target, other)` (clone + merge → `{g, map}`) and `rxxAddCation` (single-atom counter-ion for salts).
  - `rxxArylHalides` (sorted I > Br > Cl) and `rxxHalides` (least substituted first).
  - `rxxBoronic`, `rxxTerminalAlkyne`, `rxxTerminalAlkenes`, `rxxPhenols`, `rxxThiols`, `rxxActiveMethylene` (CH between two carbonyl/nitrile groups) and `rxxEnones` (α,β-unsaturated ketone/aldehyde/ester/nitrile).
  - `rxxSetE` (records an E alkene spec), `rxxOxoCarbonyls`, `rxxMigration` (Baeyer–Villiger migratory aptitude), `rxxBocCarbonyl`, `rxxSilylEther`, `rxxBenzylic`, `rxxAzide`, `rxxPhosphonate` and `rxxInertWarning`.
- **Rules (outcome ids, with scores):**
  - Pd couplings: `suzuki` 14, `heck` 13 (E, aryl on the terminal CH₂), `sonogashira` 14 with CuI or 12 without, and `buchwald-hartwig` 13.
  - Carbodiimide coupling: `amide-coupling` / `steglich` 14. An acid + amine with no activator gives a hint.
  - `acid-chloride` 13 (SOCl₂ or oxalyl chloride).
  - `baeyer-villiger` 13, or 9 with a C=C present; configuration is retained via `rxsReplace`.
  - Hydrolyses: `nitrile-hydrolysis` 12, or 9 below 80 °C; `amide-hydrolysis` 11 (skips carbamates and ureas; hint below 80 °C).
  - Carbonyl to CH₂ or C=N: `wolff-kishner` 14 (hydrazine + KOH/alkoxide), `hydrazone` / `oxime` 12, and `clemmensen` 13.
  - Acetylides: `acetylide-alkylation` / `acetylide-addition` 14 (NaNH₂, LDA or BuLi). Secondary or tertiary halides give an E2 hint.
  - `williamson` 13, or 11 for secondary halides: alcohol + NaH, or phenol + K₂CO₃/NaOH, with inversion.
  - Alkylations: `malonic-alkylation` 15 (active methylene + mild base) and `enolate-alkylation` 15 (LDA, kinetic α-carbon).
  - `michael` 15 enolate / 14 thiol / 12 amine (the amine only onto ester or nitrile acceptors).
  - `knoevenagel` 14; malonic acid with an amine base becomes Knoevenagel–Doebner with decarboxylation to the E acid.
  - `decarboxylation` 12 (β-keto or malonic acid, ≥ 100 °C) and `cannizzaro` 12 (non-enolisable aldehyde + hydroxide).
  - Alkene additions: `dihydroxylation` 13 (OsO₄, Upjohn with NMO, syn via `rxsFaceAdd`), `oxymercuration` / `alkoxymercuration` 13 (Markovnikov, no shifts), and `simmons-smith` 13 (CH₂I₂ + Zn(Cu) or Et₂Zn, stereospecific).
  - Oxidations: `oxidation-dmp`, `oxidation-swern` (oxalyl chloride + DMSO; warns without Et₃N or above −50 °C) and `oxidation-jones` (to the acid), all 13.
  - `dibal` 14 cold (ester or nitrile → aldehyde) / 12 warm (ester → alcohol).
  - Grignard: `grignard-carboxylation` 14 and `grignard-nitrile` 13 (ketone after work-up).
  - Protecting groups: `boc-protection` 14, `boc-deprotection` 15 (strong acid), `silyl-protection` 14 (least hindered OH), `silyl-deprotection` 15 (fluoride or aqueous acid), and `hydrogenolysis` 14 (benzyl ether or ester, Cbz).
  - Metathesis: `rcm` 14 (5–8-membered rings) and `cross-metathesis` 11.
  - `staudinger` / `azide-reduction` 14 and `appel` 13 (inversion).
  - `epoxide-closure` 14 and `hwe` 14 (E).
- **Reagents (`js/reactions.js`):**
  - `REACTION_ADDITIVES`:
    - Base: Cs₂CO₃, K₃PO₄, NaNH₂, imidazole, DMAP, piperidine, DBU.
    - Catalyst: Pd(OAc)₂, CuI, Grubbs II, OsO₄.
    - New groups: Coupling (DCC, EDC) and Oxidant (Dess–Martin, CrO₃ (Jones), NMO).
    - Reductant: Zn(Hg), Zn(Cu).
  - `REACTION_NAME_ALIASES` covers these reagents, plus carbon dioxide / dry ice, phenylboronic acid, triethyl phosphonoacetate, diethyl malonate, ethyl acetoacetate and malonic acid.
  - `REACTION_SHORT_FORMULAS` has arrow labels for the new reagents.
- **Side fixes:**
  - `propOxygenLogP` (`js/properties.js`) returns 0.4833 for a carbonyl oxygen whose carbon has only one or two hetero substituents (it crashed on CO₂).
  - `common-names-extra.js` maps methanedial → carbon dioxide.
- Verified by:
  - `test_reaction_rules.js`:
    - 44 new product cases, all named through the real naming code;
    - hint checks (no activator, acetylide E2, no 4-ring RCM);
    - checks for the copper-free Sonogashira score, warm DIBAL-H, hydrazone without base, the DIBAL air warning, the Swern temperature warning, and epoxidation beating Baeyer–Villiger.
    - Two deliberate updates: the rule-table size is now 57, and the old Cannizzaro hint check now expects the `cannizzaro` outcome.
  - `drive_rx_expand.py` (scratchpad): Suzuki (bromobenzene + phenylboronic acid, Pd(PPh₃)₄, Cs₂CO₃ → biphenyl) and cyclohexanone + mCPBA → ε-caprolactone in the live UI, with no page errors. Screenshot: `shots/rx_expand_suzuki.png`.
  - Full suite: 43/43 test files; drives all `ERRORS: []`.


### Update, later session (37), continued — reaction expansion, batch 2

- **New file `js/reaction-rules-extra2.js`:** loaded after `js/reaction-rules-extra.js` in `index.html` and at the end of bundle5. All of its functions use the prefix `rxy`. It also reuses the `rxx` helpers.
- **Engine hook (`js/reaction-rules.js`):** `RX_SPECIES_DETECTORS` is an array of `(g, ids, props) => tagObject | null`.
  - `rxSpeciesTag` runs each detector after the formula-tag lookup and before the alkoxide, amide-base and Grignard checks.
  - A hit is merged with `{formula}`.
  - Batch 2 registers one detector, `cuprate`: a Cu⁻ with two carbon neighbours returns `{tag: 'cuprate', metal, carbons}`.
- **New tags:**
  - Formula tags:
    - metals and salts: palladium2 (PdCl₂), copperChloride, copperBromide, copperCyanide, iodide (I⁻), nitrite, fluoroborate (BF₄⁻), cerium, manganeseDioxide, zinc, iron, hypochlorite (ClO⁻);
    - reagents: azodicarboxylate (DEAD, DIAD), sulfonylChloride (TsCl, MsCl), pocl3, sulfonium (Me₃S⁺).
  - `RX_FORMULA_GUARDS`:
    - azodicarboxylates need an N=N bond;
    - sulfonyl chlorides need an S–Cl bond.
  - Additive-only tags:
    - `naio4` → periodate, `naclo2` → chlorite, `tempo`, `mg` → magnesium, `sncl2` → tinChloride, `ag2o` → silverOxide;
    - `tollens`, `hbf4` → fluoroborate + strongAcid, `me3soi` → sulfoxonium, `p2o5` → dehydrant.
  - `RX_AIR_SENSITIVE` gained gilman-conjugate, gilman-ketone, corey-house, grignard-formation, reformatsky and corey-chaykovsky.
- **Helpers:**
  - Group finders:
    - `rxyOximes` (`{n, c, o}`), `rxyPrimaryAmides`, `rxyDiols` (vicinal `{a, b}`);
    - `rxyNitro` (`{n, os, c}`), which accepts both the charged form and the parser's normalised N(=O)=O form;
    - `rxyAnilines`, `rxyDiazonium` (`{n, t, c}`), `rxyMethylKetones`, `rxyAllylEthers`, `rxyDienes15` (a 1,5-diene as `[c1…c6]`).
  - Ring position: `rxyRing`, `rxyAtPosition(ring, atom, offset)`, `rxyOutside`, `rxyIsWithdrawing` (NO₂, C=O, C≡N).
  - Graph steps:
    - `rxyMigrant` (aryl first, then more substituted, then larger branch);
    - `rxyCuprateGroup` (merges one R group of a cuprate);
    - `rxyCleanAlkenes` (drops stale `alkeneSpecs`);
    - `rxyBreakAcyl` (cuts an acyl–O bond and removes the alkoxy branch unless it is in a ring);
    - `rxySmiles`.
  - Conditions: `rxyAcidCatalyst` (strong acid or AcOH solvent).
- **Rules (outcome ids, with scores):**
  - Rearrangements:
    - `beckmann` 15, with ring expansion to lactams and retention in the migrating group;
    - `beckmann-nitrile` 13 (aldoximes);
    - `hofmann-rearrangement` 15;
    - `pinacol` 15 (hydride > aryl > larger group migrates; ring contraction comes out naturally).
  - α-Chemistry:
    - `haloform` 15 (X₂/NaOH or NaOCl; gives carboxylate + CHX₃);
    - `alpha-halogenation` 13 (acid, more substituted enol);
    - `hvz` 15. Br₂ with no PBr₃ gives a hint.
  - Oxidations:
    - `periodate` 15;
    - `wacker` 14 (warns without a Cu/O₂ re-oxidant);
    - under rule `mild-oxidants`: `pinnick` 15, `mno2` 14 (allylic/benzylic only; a hint otherwise), `tollens` 14 (a hint for ketones), `tempo` 14 (primary alcohols; a hint without NaOCl).
  - Reductions:
    - `luche` 15 (1,2-selective, outranks NaBH₄ at 12);
    - `nitro-reduction` 14 (H₂/cat. also saturates C=C/C≡C; Fe, Zn/acid or SnCl₂ keep them);
    - `birch` 14 (EDG carbon stays on a C=C, EWG carbon becomes sp³; needs an alcohol solvent).
  - Organometallics:
    - `gilman-ketone` 15, `gilman-conjugate` 15, `corey-house` 13;
    - `grignard-formation` 14 (Mg inserted between C and X; a hint in protic media);
    - `reformatsky` 15.
  - OH activation:
    - `mitsunobu` 16 (acid or phenol nucleophile, inversion; a hint for tertiary alcohols);
    - `sulfonate` / `sulfonamide` 14 (retention).
  - Pericyclic:
    - `claisen-rearrangement` 15, for aryl allyl ethers (ortho) and allyl vinyl ethers;
    - `cope` 13, `oxy-cope` 15, `anionic-oxy-cope` 15 (NaH/KH at room temperature). Degenerate Cope gives a hint. Heat below 100 °C gives a hint.
  - Cyclisations:
    - `paal-knorr-pyrrole` / `paal-knorr-furan` 15;
    - `iodolactonization` / `bromolactonization` 15 (5-exo preferred, anti addition via `rxsFaceAdd`).
  - Aromatic:
    - `snar` 15 (ortho/para EWG required, F preferred; amine, then alkoxide, then hydroxide; an unactivated halide gives a hint; suppressed when Pd(0) is present);
    - `diazotization` 13 and its follow-ons at 15: `sandmeyer` (CuCl/CuBr/CuCN), `diazonium-iodide` (KI), `balz-schiemann` (HBF₄, ≥ 50 °C), `diazonium-phenol` 14 (water, ≥ 40 °C) and `azo-coupling` (para to OH/NR₂).
  - Carbonyl additions:
    - `mannich` 16;
    - `benzoin` 15 (ArCHO + cyanide, no acid);
    - `cyanohydrin` 13 with acid, 11 without;
    - `corey-chaykovsky` 15 (epoxide) and `corey-chaykovsky-cyclopropane` 15 (sulfoxonium + enone);
    - `robinson` 16 (outranks Michael and aldol).
  - Eliminations:
    - `hofmann-elimination` 14 (least substituted alkene);
    - `amide-dehydration` 14 (SOCl₂, POCl₃, P₂O₅);
    - `double-elimination` 15 (vicinal or geminal dihalide + NaNH₂ → alkyne).
  - Acyl exchange: `aminolysis` 11 and `transesterification` 12 (skipped when the product equals the substrate).
- **Reagents (`js/reactions.js`):**
  - `REACTION_ADDITIVES`:
    - Catalyst: PdCl₂, CuCl, CuBr, CuCN, TEMPO.
    - Oxidant: NaIO₄, NaClO₂, NaOCl, MnO₂, Tollens’ reagent.
    - Reductant: Zn, Fe, Mg, SnCl₂.
    - Lewis acid: CeCl₃.
    - Coupling: DEAD, DIAD.
    - New group "Reagent": NaNO₂, KI, HBF₄, TsCl, MsCl, POCl₃, P₂O₅, Me₃S⁺I⁻, Me₃S(O)⁺I⁻, Ag₂O.
  - `REACTION_NAME_ALIASES`:
    - reagents: TsCl/MsCl, DEAD/DIAD, POCl₃, the lithium cuprates, NaOCl, NaNO₂, KI, trimethylsulfonium iodide;
    - substrates: formaldehyde, MVK, ethyl bromoacetate, the oximes, pinacol, hexane-2,5-dione, the allyl ethers, benzenediazonium chloride, the Sanger reagent, 4-fluoronitrobenzene, 2-methylcyclohexanone, cyclohexenone, tetramethylammonium hydroxide.
  - `REACTION_SHORT_FORMULAS` has arrow labels for the new formula reagents.
- Verified by:
  - `test_reaction_rules.js`:
    - 48 new product cases, all named through the real naming code;
    - 5 hint checks (degenerate Cope, unactivated SNAr, Tollens on a ketone, Grignard in ethanol, Claisen without heat);
    - the rule-table size is now 87.
  - Mitsunobu inversion was checked by name: (S)-hexan-2-ol gives (R)-1-methylpentyl benzoate.
  - The batch 1 probe set was re-run through `bundle5dbg.js` with no rule errors.
  - `drive_rx_expand2.py` (scratchpad) in the live UI:
    - 2-methylcyclohexanone + methyl vinyl ketone + NaOEt → Robinson annulation;
    - p-toluidine + NaNO₂/HCl/CuBr → p-bromotoluene;
    - no page errors. Screenshots: `shots/rx_expand2_robinson.png`, `shots/rx_expand2_sandmeyer.png`.
  - Full suite: 43/43 test files; drives all `ERRORS: []`.


### Update, later session (37), continued — ring systems
- **Aromaticity perception (`js/reaction-rules.js`):**
  - `rxPiCount(g, ring, pool)` counts a ring's π electrons, or returns −1 when an atom cannot join the π system. The counting rules:
    - a double bond inside the ring, or to an atom already in the aromatic pool, counts 1;
    - one exocyclic C=O, C=N or C=S counts 0, allowed only in a ring that also has a pyrrole-type N (2-pyridone yes, benzoquinone and uracil no);
    - a lone-pair N, O or S/Se counts 2;
    - C⁻ counts 2 and C⁺ counts 0.
  - `rxAromaticRings(g)`:
    - takes the 5–7 rings from `rxRings(g, 7)` and applies the Hückel 4n+2 test over up to 6 passes, so a ring can become aromatic because a fused ring already is;
    - retries a failing ring as a union with a fused candidate ring, which covers azulene and indolizine;
    - returns `{rings, atoms}` with 6-rings first.
  - `rxRuleAromatic` now runs on every substrate that has an aromatic ring, not just benzene:
    - site selection is `rxaEasPlan`;
    - an activated ring (π-excessive heterocycle, fused rich system, strong donor, or HMO localisation energy < 2.2) halogenates without a Lewis acid;
    - `rxEasExhaustive` gives the 2,4,6-trihalo product (`eas-exhaustive`, 13) for a phenol or aniline in water;
    - a π-deficient ring (pyridine-type N) needs T ≥ 200 °C with a Lewis acid, otherwise it gets a hint;
    - pyrrole and furan with AlCl₃ carry a polymerisation warning.
  - `reactionContext` promotes a neutral aromatic component (pyridine, imidazole) to a substrate when nothing else qualifies.
  - The KMnO₄ side-chain branch now cuts each benzylic–non-ring bond and keeps the component attached to the ring before adding CO₂H. This fixes a crash on fused carbocycles (tetralin → phthalic acid).
- **`js/reaction-aromatic.js` (new, loaded after `js/reaction-rules-extra2.js`):**
  - Hückel MO engine:
    - `rxaEigenvalues` is a Jacobi eigen-solver;
    - `rxaPiSystem(g, aromatic, options)` builds the π centres and bonds with heteroatom and substituent h/k parameters (`RXA_HALOGEN`, OR, OAc, O⁻, NR₂, amide N, nitro, conjugated carbonyl or vinyl, alkyl, CF₃, ammonium);
    - `rxaPiEnergy` computes the π energy;
    - `rxaSites` scores each free CH by Wheland localisation energy plus small crowd, flank, peri and pyridinium corrections.
  - The parameters reproduce the textbook LE values: benzene 2.536, naphthalene α 2.299 and β 2.480, anthracene C9 2.013.
  - `rxaRingClass` sorts a substrate's rings into π-excessive, fused-rich and π-deficient.
  - `rxaEasPlan(s, {protonate})` picks the major and minor sites:
    - a lone benzene ring keeps the legacy `rxEasPosition` ratios;
    - everything else uses HMO, reporting a minor site within 0.12 LE.
  - Other helpers:
    - `rxaKekulize` (backtracking perfect matching) and `rxaDearomatize(g, aromatic, saturate)` are shared by the addition rules;
    - `rxaParaPair` returns the most reactive para pair of an acene ring;
    - `rxaFusedSystem` returns the atoms of a fused carbocyclic system.
  - Rules:
    - `birch-fused` (14): naphthalene + Na/NH₃ → 1,4-dihydronaphthalene.
    - `arene-hydrogenation` (11):
      - forcing conditions (≥ 50 bar or ≥ 150 °C) saturate every ring (benzene → cyclohexane, pyridine → piperidine);
      - milder heating (≥ 3 bar or ≥ 60 °C) reduces one ring of a fused carbocycle (naphthalene → tetralin);
      - otherwise a hint.
    - `aromatic-diels-alder` (13):
      - furan adds across C2/C5, with an endo/exo reversibility warning;
      - anthracene-type acenes add across the para pair with LE ≤ 2.1, needing ≥ 80 °C, otherwise a hint;
      - `rxaDienophile` finds the partner.
    - `chichibabin` (13): NaNH₂ aminates the C next to a pyridine-type N, needing ≥ 80 °C, otherwise a hint.
- **`js/reaction-rules-extra2.js`:** `rxyRuleSnar` counts a ring N ortho or para to the leaving group as an activating group. 2- and 4-halopyridines substitute; 3-halopyridine still gets the hint.
- **`js/name-lookup.js`:** 42 new `NAME_SMILES` entries:
  - parent arenes and heteroarenes, e.g. isoquinoline, phenanthrene, carbazole, azulene, pyrimidine, thiazole, purine, benzofuran and benzothiophene;
  - partially saturated rings: tetralin, indene, fluorene, xanthene, decalin, cyclooctatetraene;
  - naphthols and the chloropyridines;
  - ring-reaction partners: maleic anhydride, p-benzoquinone, DMAD.
  - Chromene and azepine were left out because the names are ambiguous (2H/4H, 1H/3H).
- `index.html` loads `js/reaction-aromatic.js` after `js/reaction-rules-extra2.js`. The engine now has 91 rules. Later session (42) raises this to 96; see below.
- Verified by:
  - `test_reaction_rules.js`:
    - 29 new ring cases, including naphthalene, anthracene, phenanthrene and 2-methoxynaphthalene EAS; thiophene, pyrrole, indole, benzothiophene, benzofuran, carbazole, azulene and quinoline halogenation; tribromophenol and tribromoaniline; FC acylation of thiophene and naphthalene; the three hydrogenation levels; Birch on naphthalene; both aromatic Diels–Alder modes; Chichibabin on pyridine and quinoline; 2- and 4-halopyridine SNAr; tetralin → phthalic acid;
    - 5 ring hint checks;
    - 13 Hückel perception checks, positive and negative (cyclooctatetraene, benzoquinone, uracil, fulvene, pentalene, 1H-azepine);
    - the rule-table size is now 91.
  - Scratchpad harnesses:
    - `ring_audit.js` (aromatic-ring counts on a mixed battery including trap structures) has 0 mismatches;
    - `sitecheck.js` (28 EAS site cases) has 0 bad;
    - `namecheck2.py` shows all 38 distinct new names resolving, with correct ring counts, and round-tripping through `nameStructure`.
  - `drive_rx_rings.py` (scratchpad) in the live UI:
    - naphthalene + Br₂/FeBr₃ → 1-bromonaphthalene (~80%) with 2-bromo (~20%);
    - indole + Br₂ → 3-bromo-1H-indole;
    - furan + maleic anhydride (typed by name) → oxanorbornene adduct;
    - pyridine + NaNH₂ gives the heat hint, then 2-aminopyridine at 110 °C;
    - quinoline + Br₂/FeBr₃ → 8-bromoquinoline;
    - no page errors.
    - Screenshots: `shots/rx_rings_naphthalene.png`, `shots/rx_rings_indole.png`, `shots/rx_rings_furan_da.png`, `shots/rx_rings_chichibabin.png`, `shots/rx_rings_quinoline_hint.png`.
  - Full suite: 43/43 test files; drives all `ERRORS: []`.

## Update, later session (38) — structure insight overlays

Adds five toggleable teaching overlays, a substructure search and a resonance viewer to the editor. The work lives in three new plain-script files: `js/insight.js`, `js/resonance.js` and `js/substructure.js`. They load after `js/name-lookup.js` and before `js/pubchem.js`, and so before `js/renderer.js`. All three are free of DOM code and run in Node when concatenated in `index.html` order. The plan and audit are in `feature-research/insight-overlays/`.

### `js/insight.js` — electrons, hybridization, oxidation states, Gasteiger charges, acid/base sites

**Tables.**
- `INSIGHT_ELECTRONEGATIVITY`: Pauling values, used for oxidation states. Metals not in the table fall back to 1.3, other elements to 2.2.
- `INSIGHT_HYBRID_ELEMENTS`: B, C, N, O, P, S, Si and Se. Only these get a hybridization label.
- `GASTEIGER_PARAMS`: the a, b, c parameters from RDKit's `GasteigerParams.cpp` (the Gasteiger–Marsili 1980 table with RDKit's additions), keyed by element and then by type:
  - `sp3`, `sp2` and `sp`;
  - S also has `so` (one S=O) and `so2` (two or more);
  - H has one entry, `'*'`.
- `GASTEIGER_SETTINGS`:
  - `iterations: 6`;
  - `damping: 0.5`, which halves every iteration;
  - `hydrogenIonization: 20.02`, the fixed denominator RDKit uses for hydrogen.

**Functions.**
- `insightElectronegativity(element)` → a number.
- `insightValenceElectrons(element)` → the valence-electron count: 1 for H/D, `group - 10` for groups 13–18, the group number for groups 1–2. Metals and unknowns give `null`.
- `insightContext(graph, atomIds)` → a `propContext` extended with:
  - `h`: a Map of implicit H counts, which honours an integer `atom.hydrogens` override (used by the radical test);
  - `bondSum(id)`.
- `insightPiNeighbor(ctx, neighborId, fromId)` → true when the neighbour is aromatic or carries a multiple bond to some other atom.
- `insightAtomInfo(ctx, id)` → `{formalCharge, lonePairs, radical, hybridization ('sp3' | 'sp2' | 'sp' | null), stericNumber, oxidationState}`:
  - Lone pairs: `left = valence e⁻ − charge − bond-order sum − H`. Then `lonePairs = floor(left / 2)` and `radical = left odd`.
  - Steric number: σ-neighbours + H + lone pairs + radical.
  - Overrides:
    - a triple bond, or two double bonds, gives sp;
    - a double bond or an aromatic atom gives sp²;
    - an sp³ N/O/S with a lone pair next to a π system gives sp² (the amide, pyrrole and aniline N case).
  - Oxidation state: each bond's order is assigned to the more electronegative atom, and H counts as 2.20.
- `insightAtoms(graph, atomIds)` → a Map from id to `insightAtomInfo`.
- `insightIsHypervalentNitro(ctx, id)`: detects a neutral 5-valent N with an =O. `smilesToFragment` neutralizes `[N+](=O)[O-]` into this form.
- Gasteiger internals:
  - `gasteigerType(ctx, id, info)` → the parameter triple or `null`. Missing sp types fall back to sp2 and then sp3.
  - `gasteigerConjugated(...)` and `gasteigerStartCharges(ctx, infos)` follow RDKit: a formal charge is spread evenly over same-element atoms that sit two bonds away through a conjugated path, so carboxylate O's start at −0.5 each. A hypervalent nitro is first counted as N⁺/O⁻.
- `gasteigerCharges(graph, atomIds)` → a Map from id to the partial charge summed with that atom's implicit H. It carries three extra properties:
  - `.hydrogenCharges`: a Map of the summed implicit-H charge per heavy atom;
  - `.heavyCharges`: a Map of the heavy-atom-only charge;
  - `.unparameterized`: a Set of atoms with no parameters. They stay at 0 and take no part in the flow.

  The update per iteration is `Δq_i = Σ_j (χ_j − χ_i) / D`. D is the ionization term `a + b + c` of the neighbour when `χ_j < χ_i`, otherwise of atom i. For implicit H, D is 20.02 when H is the less electronegative side. This denominator convention is what reproduces RDKit; the reverse convention was off by up to 0.11 e.
- `insightHasOxo`, `insightIsCarbonylCarbon`, `insightIsNitro`, `insightRingNeighbors(ctx, ipso)` (ortho/para positions in an aromatic six-ring) and `insightNitroOrthoPara(ctx, ipso)`: small predicates used by the pKa rules.
- `insightSite(atomId, hydrogenOn, group, lo, hi, note)` → `{atomId, group, pKa: [lo, hi], note, hydrogenOn?}`. `pKa` is the pKa for acids and the pKaH (of the conjugate acid) for bases.
- `insightAcidAt(ctx, id)` and `insightBaseAt(ctx, id)` → a site or `null` for one atom.
- `insightMid(site)` → the midpoint of the range.
- `acidBaseSites(graph, atomIds)` → `{acids, bases, mostAcidic, mostBasic}`:
  - Acids are sorted by midpoint ascending and bases by midpoint descending.
  - For a carboxylic, sulfonic or phosphoric acid, `atomId` is the C/S/P and `hydrogenOn` is the O–H oxygen. For every other acid, `atomId === hydrogenOn`.
  - When no acid site is found, one fallback C–H site is added so that `mostAcidic` always exists: 'Alkane C–H' (48–52) or 'Arene/alkene C–H' (43–45).

**pKa table** (textbook ranges in water; typical values for the group, not predictions for the molecule):

| Kind | Group | Range |
|---|---|---|
| acid | Sulfonic acid | −2 to −1 |
| acid | Phosphoric/phosphonic acid | 1–2 |
| acid | Carboxylic acid | 4–5 (2–3 with an α-halogen or α-ammonium) |
| acid | Pyridinium N⁺–H | 5 |
| acid | Anilinium N⁺–H | 4–5 |
| acid | Phenol | 10 (7–8 with an o/p-nitro) |
| acid | Imide N–H | 8–10 |
| acid | Ammonium N⁺–H | 9–11 |
| acid | 1,3-Dicarbonyl C–H | 9–13 |
| acid | Thiol | 10–11 |
| acid | Azole N–H | 14–18 |
| acid | Water | 15.7 |
| acid | Alcohol | 15–17 |
| acid | Amide N–H | 15–17 |
| acid | Ketone/aldehyde α-C–H | 19–20 |
| acid | Ester α-C–H | 24–25 |
| acid | Terminal alkyne C–H | 25 |
| acid | Aniline N–H | 28–31 |
| acid | Amine N–H | 35–38 |
| acid (fallback) | Arene/alkene C–H | 43–45 |
| acid (fallback) | Alkane C–H | 48–52 |
| base (pKaH) | Guanidine | 13 |
| base | Amidine | 12 |
| base | Alkoxide | 15–16 |
| base | Aliphatic amine | 10–11 |
| base | Phenoxide | 10 |
| base | Tertiary amine | 9.5–10.5 |
| base | Imidazole N3 | 7 |
| base | Pyridine-type N | 5 |
| base | Aniline | 4–5 (1 with an o/p-nitro) |
| base | Carboxylate | 4–5 |
| base | Amide O | −0.5 |
| base | Alcohol/ether O | −2 |
| base | Carbonyl O | −7 to −6 |

### `js/resonance.js` — resonance contributors

- `RESONANCE_SETTINGS`:
  - `max: 12` contributors;
  - `expansions: 400`;
  - score weights: `octetDeficit: 10`, `chargePair: 4`, `wrongAtom: 3`;
  - `majorWindow: 1`.
- A state is `{orders[], charges[], moves[]}` over the model's bond and atom index. `resonanceModel(graph, atomIds)` builds `{graph, ids, index, bonds, adj, el, ve, h, fixedH, en}`.
- Helpers:
  - `resonanceBondSum`, `resonanceLeft` (non-bonding electrons) and `resonanceShell` (electrons around the atom);
  - `resonanceGraph(model, state)` → a `Graph` clone restricted to the atoms, with the state's orders and charges;
  - `resonanceClone` and `resonancePairs` (the number of +/− pairs).
- `resonanceSignature(model, state)` builds the dedupe key. In charged states, the bonds of every alternating six-ring that `kekuleRings` finds are written as `a`, so two Kekulé forms of an untouched benzene ring count as one contributor. This is why phenoxide gives 4 contributors and not 8. Neutral states keep the exact orders, so benzene still gives its 2 Kekulé structures.
- `resonanceNormalize(model, state)` converts a hypervalent nitro into N⁺/O⁻ in the starting state. The first result is then flagged `normalized: true`.
- `resonanceValid(model, state, base, baseProblems)` rejects a state when any of these holds:
  - a changed atom has |charge| > 1;
  - an atom has fewer than 0 non-bonding electrons;
  - a period-2 atom's shell exceeds max(8, its shell in the base);
  - an implicit H count would change;
  - the state has more than one extra charge pair beyond the base;
  - a `valenceProblems` entry appears on an atom that had none in the base.
- `resonanceExpand(model, state)` → candidate states. The moves are:
  - **'lone pair → π'**: an atom X with charge ≤ 0 and a lone pair, bonded by a single bond to Y, where Y=Z. The X–Y bond goes up by one and Y=Z goes down by one, so X gains +1 and Z gains −1.
  - **'π → cation'**: a period-2 cation X with an incomplete octet next to Y=Z. The π bond shifts toward X, which moves the + charge to Z.
  - **'ring flip'**: every alternating six-ring from `kekuleRings` is flipped.
- `resonanceContributors(graph, atomIds, options?)` → `[{graph, charges: Map, score, label: 'major' | 'minor', moves: [string], normalized?}]`:
  - It runs a breadth-first expansion from the drawn state.
  - It then applies a terminal **'polarize C=O' / 'polarize C=N'** move from the base only. This is limited to double bonds that no other contributor moved, which gives the minor C⁺–O⁻ form of acetone without doubling up acetate or acetamide.
  - Score = 4 × charge pairs + 10 per C/N/O below an octet + 3 × |charge| for each negative charge on an atom less electronegative than the best available negative site (and the same for positive charges on more electronegative atoms).
  - A contributor is labelled `major` when its score is within 1 of the best score.
  - The first entry is always the drawn (or normalized) structure. The rest are sorted by score, keeping discovery order on ties.

### `js/substructure.js` — substructure search

- `SUBSTRUCTURE_SETTINGS`: `{maxMatches: 200, maxSteps: 200000}`.
- `substructureFromSmiles(text)` → a query `Graph`:
  - atoms carry `aromatic` and `bracket` from the SMILES, and bonds carry `aromatic`;
  - the query is also run through `propContext`, so a Kekulé-written ring such as `C1=CC=CC=C1` is marked aromatic and matches drawn benzene rings.
- `substructureQuery(text)` → a query graph or `{error}`. When the text is not valid SMILES, it falls back to a `NAME_SMILES` lookup (lower-cased), so "pyridine" works.
- `substructureOrder(query, targetCounts)` → `{order, parent, nbrs}`: a BFS order that starts from the query atom whose element is rarest in the target.
- `substructureMatches(graph, query, atomIds?)` → `[{atoms: [targetAtomIds in query order], bonds: [targetBondIds]}]`. This is backtracking over the BFS order. The rules:
  - Elements must match.
  - A bracket atom's charge must match.
  - Aromatic query atoms and bonds need aromatic target atoms and bonds. A non-aromatic single bond in the query does not match an aromatic ring bond. Other bonds need an equal order.
  - Matches are deduplicated by their sorted atom set.
  - The search stops at 200 matches or 200 000 steps.

### `js/renderer.js`

**Settings.** New `RENDER_SETTINGS` keys:
- lone pairs: `lonePairLabelRadius` 13, `lonePairBareRadius` 8, `lonePairSpread` 2.6, `lonePairDot` 1.5;
- heat map: `heatRadius` 22, `heatClamp` 0.5, `heatAlpha` 0.55;
- badges: `badgeFont`, `badgeHeight` 13, `badgeGap` 2, `deltaBadgeMin` 0.15;
- pins: `pinFont`, `pinOffset` 30;
- `insightCacheLimit` 200.

**Palette keys** (dark / light):

| Key | Dark | Light |
|---|---|---|
| `match` | 52, 211, 153 | 5, 150, 105 |
| `lonePair` | #d8b4fe | #7c3aed |
| `badgeText` | #cbd5e1 | #334155 |
| `badgeOx` | #f472b6 | #be185d |
| `badgeBg` | rgba(13, 16, 23, 0.84) | rgba(251, 252, 254, 0.9) |
| `heatNeg` | 248, 113, 113 | 220, 38, 38 |
| `heatPos` | 96, 165, 250 | 37, 99, 235 |
| `acidPin` | #ef4444 | #dc2626 |
| `basePin` | #3b82f6 | #2563eb |

`match`, `heatNeg` and `heatPos` are RGB triplets that are combined with an alpha at draw time.

**State.**
- `insight = {electrons, hybridization, oxidation, heatmap, acidBase}`, all false by default;
- `matchAtoms` and `matchBonds` (Sets of ids);
- `insightCache`: a Map keyed by `insightSignature`, cleared once it exceeds 200 entries;
- `insightFrame`: rebuilt on every render, and `null` when no overlay is on.

**Methods.**
- `insightActive()`.
- `insightSignature(atomIds)`: a structural key (ids, elements, charges, H overrides, bonds and orders) that ignores position. Moving atoms therefore does not recompute anything.
- `insightFor(atomIds)` → a cached `{atoms, charges, sites}`, or `null` if a computation throws.
- `insightForAtom(id)` → `{info, charge, unparameterized}`, used by the hover status.
- `buildInsightFrame()` → `{components: [{atomIds, data, centroid, pins}], layout: Map(id → {badge, pin, electrons: [dirs], radical, lonePairs})}`:
  - For each visible, non-abbreviated atom it asks `freeDirections(atom, pairs + 1 + pin, centroid, extraAngles)` for evenly spread free directions. The side of an implicit-H label counts as occupied.
  - The pin (if the atom holds one) takes the most outward direction, the badge stack takes the next, and the lone pairs take the rest.
- `freeDirections(atom, count, centroid, extraAngles)`: the gap-slot allocator that `locantDirection` now also uses. For a count of 1 it gives the same result as before.

**Draw passes.**
- World space, after `drawHover`:
  - `drawChargeHeatmap`: a radial gradient per atom, with alpha proportional to |q| / 0.5, red for negative and blue for positive;
  - `drawMatches`: a translucent green halo over matched bonds, and ringed atoms.
- World space, after the atom loop: `drawLonePairs`, which draws dot pairs, or a single dot for a radical.
- Screen space, after `drawLocants`:
  - `drawInsightBadges`: stacked pills along the badge direction, holding the sp/sp²/sp³ label, the oxidation state with a sign, and δ±0.00 when |δ| ≥ 0.15. These are built by `insightBadges`, which formats numbers with `insightNumber` (U+2212 minus).
  - `drawAcidBasePins`: a red "H⁺  pKa ≈ 4–5" pill on the most acidic O/N/C, and a blue ":B  pKaH ≈ 10–11" pill on the most basic atom, each with a leader line. Ranges come from `insightRange(site)`, which writes "−7 to −6" when the lower bound is negative.

### `js/app.js`

**Insight menu.**
- `#insight-button` toggles `#insight-menu`. The menu is `position: fixed` and placed from the button's rect. It closes on an outside mousedown, on Esc, and when the resonance viewer opens.
- Checkbox changes call `setInsight(key, on, announce)`, which follows the `setLocants` pattern:
  - it sets `renderer.insight[key]`;
  - it syncs the checkbox;
  - it stores `'1'`/`'0'` under the storage keys below;
  - `syncInsightButton` gives the toolbar button `.active` and `aria-pressed` while any overlay or search highlight is on;
  - it re-renders.

  The storage keys are `insightElectrons`, `insightHybridization`, `insightOxidation`, `insightHeatmap` and `insightAcidBase`. They are restored on load.

**Shortcuts.** `INSIGHT_SHORTCUTS` is keyed by `event.code`, so the macOS Option characters do not matter:

| Keys | Action |
|---|---|
| Alt+L | lone pairs |
| Alt+H | hybridization |
| Alt+O | oxidation states |
| Alt+P | partial charges |
| Alt+A | acid/base sites |
| Alt+S | open the menu and focus the search |
| Alt+R | resonance viewer |

Any other Alt combination still returns early. The Alt shortcuts show a toast.

**Esc.**
- In the search field, Esc clears the search, or closes the menu when the field is already empty.
- The global Esc chain is now: help → insight menu → selection → search → stamp → tool → panel.
- While the resonance viewer is open, the keydown handler only handles Esc, which closes it.

**Substructure search.**
- The input is debounced by 160 ms and runs `runSubstructure` → `substructureQuery` → `substructureMatches` over the whole canvas.
- The results are written to `renderer.matchAtoms`/`matchBonds`. The status reads "N matches", "No matches" or the error, and the input gets `.invalid` on an error.
- ‹/› (and Enter / Shift+Enter in the field) step through the matches, centering the view on each one without changing the zoom.
- `refreshSubstructure()` runs in `renderer.afterRender`. It recomputes the matches when `graphSignature()` (ids, elements, charges, bonds and orders) changes, so matches follow edits and undo.
- The state lives in `substructureState`, which is declared before `afterRender` to stay clear of the temporal dead zone.

**Resonance viewer.**
- `#resonance-overlay` reuses the modal markup of `#import-overlay`.
- `openResonance(atomIds)` is reached from:
  - Alt+R and `#resonance-button`, via `openResonanceForTarget` (the same hovered-or-largest target rule as `#info-button`);
  - the new "Resonance structures" item in `moleculeEntries()`;
  - the panel's "Open viewer" button.
- Each contributor is shown as a `.resonance-card` button holding a 180×140 thumbnail canvas. The thumbnail is drawn by a fresh `Renderer` on `contributor.graph` with `fitToContent(30)`. Cards are separated by `↔`, captioned major/minor, and their title lists the moves.
- A single contributor shows "Only one contributor…".
- "Place on canvas" (or a double-click on a card) builds a fragment and passes it to `insertSmilesFragment`, to the right of the source molecule. This commits to history, so it is undoable.

**Hover status.** When any overlay is on, `insightHoverText` adds a suffix such as " · sp² · OS −2 · δ −0.25 · 2 lone pairs" (and "radical" when relevant).

**Properties panel.** `insightPanelHtml(atomIds)` adds two blocks after the unchanged "Ionizable groups" block:
- "Acid/base sites" lists every acid and base site with its range, plus a note that these are typical group values.
- "Resonance" shows the contributor count ("12+" at the cap) and an "Open viewer" button (`#resonance-open-button`, class `info-button-inline`).

**Export.** `renderExport` copies onto the export renderer:
- `insight` (via `Object.assign`);
- `insightCache`;
- `matchAtoms` and `matchBonds`.

Overlays and search highlights therefore appear in PNG and SVG exports. `SvgContext` already records radial gradients. Locants are still excluded from exports.

### `index.html` and `css/style.css`

- **Toolbar.** The view group has `div.insight-anchor` (`display: contents`) holding the lightbulb `#insight-button` and `#insight-menu` (role menu):
  - five `label.insight-row` checkboxes with `data-insight`;
  - `#substructure-input` with `#substructure-prev` and `#substructure-next` (`.step-button`) and `#substructure-status`;
  - `#resonance-button`.
- **Modal.** `#resonance-overlay` contains `.resonance-dialog` (960 px wide), `#resonance-summary`, `#resonance-grid` (flex wrap), `#resonance-hint`, `#resonance-cancel` and `#resonance-place`.
- **Help.** The help overlay has an "Insight" block listing the Alt shortcuts.
- **CSS.** The new rules are appended at the end of `css/style.css` and use only existing tokens, so light and dark both work.

### Tests

- `test_insight.js` (session scratchpad) covers every target in the plan, plus a Gasteiger comparison against RDKit 2026.3 `ComputeGasteigerCharges` on 20 molecules.
- The old regression suite was rebuilt from the current `js/`.
- `drive.py` (Playwright) exercises the UI.

Numbers and deviations are in `feature-research/insight-overlays/audit.md`.

## Update, later session (39) — spectroscopy

Adds predicted ¹H NMR, ¹³C NMR, IR and EI mass spectra in a resizable dock under the editor canvas. Hovering a peak (on the plot or in the table) rings its atoms on the canvas; hovering an atom highlights its peaks. An "Identify the unknown" puzzle hides the structure and shows only its spectra. Everything is rule-based and offline: additive increment tables, no database and no network.

There are four new plain-script files. `js/spectra-nmr.js`, `js/spectra-ir.js` and `js/spectra-ms.js` load after `js/substructure.js` and are free of DOM code, so they run in Node when concatenated in `index.html` order. `js/spectra-view.js` loads after `js/reaction-lab.js` and holds the dock UI. The plan, audit and screenshots are in `feature-research/spectroscopy/`.

### `js/properties.js` — symmetry refactor

The WL-style rank refinement that `propSmiles` used inline is now shared:
- `propRefineRanks(ctx, invariant, bondLabel, rounds, untilStable)` → a Map from atom id to rank. It starts from `invariant(id)` strings and refines by sorted `(bondLabel(a, b), rank)` neighbour lists, for a fixed number of rounds or until the class count stops growing.
- `propCanonicalRank(ctx)`: exactly the previous `propSmiles` ranking (6 rounds, same invariant and bond labels). `propSmiles` calls it, and its output is byte-identical to before on 50 test SMILES and all 158 `NAME_SMILES` values.
- `propSymmetryClasses(ctx)` → a Map from atom id to class. Aromatic bonds are labelled `'a'` (so Kekulé placement cannot split benzene carbons), the invariant includes element, charge, H count, degree, aromaticity and ring membership, and it refines until stable. Atoms in the same class are topologically equivalent, and each class becomes one NMR signal.

### Shared environment (`js/spectra-nmr.js`)

- `spectraEnv(graph, atomIds)` → `{ctx, heavy, hn, hCount, dCount, cache, classes, cls, el, nb, h, aromatic, charge, inRing, ringBond, pos}`. It is built on `insightContext` and `propSymmetryClasses`. Explicit H atoms are folded into their heavy atom's H count; explicit D atoms are counted in `dCount` (no ¹H signal, but they still count for ¹³C type and mass).
- Predicates: `spectraIsSp3Carbon`, `spectraOxo(env, id)` (the =O neighbour), `spectraIsCarbonyl`, `spectraIsNitro`.
- `spectraCarbonylKind(env, c)` → `{kind, conj, aryl, formyl, ring, hetId, oxoId}`. `kind` is one of ketone, aldehyde, acid, carboxylate, ester, anhydride, amide, thioester, acidHalide or carbonic. `ring` is the smallest ring size containing the carbonyl carbon (for IR strain). The IR and MS rules share this one classifier.
- `spectraCarbonylKey(env, c)` and `spectraGroup(env, from, x)` → the substituent key (e.g. `'OC(=O)R'`, `'C(=O)OR'`, `'aryl'`, `'Br'`, `'NR2'`) of neighbour `x` seen from atom `from`. The increment tables use these keys.
- Aromatic helpers: `spectraAromaticRings`, `spectraRingOf`, `spectraRingDistance`, `spectraRingSubstituents`, `spectraPrincipalHetero`.

### ¹³C NMR

**Tables** (sources: Pretsch, *Structure Determination of Organic Compounds*; Silverstein/Webster-style additivity tables):
- `NMR_C_GROUP`: α, β, γ increments for about 30 substituent keys, with a `pen` flag for the branching penalty.
- `NMR_GP_STERIC`: Grant–Paul branching corrections, indexed by the carbon's own degree and its neighbour's degree.
- `NMR_RING_CORRECTION`: sp³ ring-size corrections (3 to 7).
- `NMR_AROMATIC_INCREMENTS`: benzene ipso/ortho/meta/para increments, `c` for ¹³C and `h` for ¹H (base 128.5 and 7.36).
- `NMR_ALKENE_C`: α and α′ alkene increments on base 123.3.
- `NMR_HETERO5` (furan, thiophene, pyrrole) and `NMR_PYRIDINE`: parent-ring shifts, with benzene increments added for substituents.

**Functions.**
- `spectraSp3Shift`, `spectraAlkeneShift`, `spectraCarbonylShift` (a base value per carbonyl kind, with conjugation and ring corrections) and `spectraAromaticShift(env, id, 'C' | 'H')`.
- `spectraCarbonShift(env, c)` dispatches over these and handles nitriles, alkynes and allenes. It returns `{shift, note, type?}`.
- `spectraCarbonType` → CH3, CH2, CH or C (a DEPT-style label). `spectraGroupByClass` groups atoms by symmetry class.
- `predictCarbonNmr(graph, atomIds)` → `{signals: [{shift, atoms, count, type, note}], nucleus: '13C'}`, sorted by shift, highest first. Shifts are rounded to 0.1 ppm.

### ¹H NMR

**Tables.**
- `NMR_H_ALPHA`: Shoolery/Pretsch-style α increments per CH₃, CH₂ and CH, plus a β increment, keyed by substituent.
- `NMR_VINYL_Z`: Pascual–Meier–Simon gem, cis and trans increments on base 5.25.
- `NMR_J`: vicinal 7, aldehyde 2.5, ortho 8, hetero-5 3.5, cis 10, trans 17, geminal 2 Hz.
- `NMR_MULTIPLET_NAMES`: s, d, t, q, quint, sext, sept.

**Functions.**
- `spectraSp3ProtonShift(env, c)`: base 0.86/1.37/1.50 for CH₃/CH₂/CH, plus α and β increments.
- `spectraVinylProtons(env, a, b)`: assigns each vinyl H its gem, cis and trans substituents. cis/trans are read from the 2D coordinates with `spectraSide`.
- `spectraExchangeable(env, x)`: fixed shifts for exchangeable protons, flagged `broad`: CO₂H 11.5, phenol/enol OH 5.5, alcohol OH 2.0, amide NH 7.0, aromatic NH 8.0, aryl NH 3.6, amine NH 1.5, N⁺–H 7.5, SH 1.5 (3.4 on an arene).
- `spectraProtonSites(env)` → one site per symmetry class of H-bearing atoms. Diastereotopic protons are not split.
- `spectraCouplings(env, site, sites)` → the coupled neighbour sets `[{J, n}]` over three bonds. Exchangeable H do not couple. Sets with the same J are merged.
- `spectraMultiplicity(sets)` gives a first-order name: a single set with n neighbours gives n+1 lines, two sets give names such as `dd` or `dt`, and more than two distinct J values give `m`.
- `predictProtonNmr(graph, atomIds, {field})` → `{signals: [{shift, atoms, count, multiplicity, J, couplings, exchangeable, broad, note}], field, nucleus: '1H'}`. `atoms` holds the heavy atoms carrying the protons, and `count` is the number of H.
- `nmrLineShape(signals, {nucleus, field, from, to, points})` → `[{x, y}]`, a sum of Lorentzians.
  - For ¹H, each signal is split into its binomial multiplet with J/field ppm spacing. Width is 0.9 Hz, or 12 Hz when broad.
  - For ¹³C, lines are single and quaternary carbons are drawn at 0.45 weight.

### IR (`js/spectra-ir.js`)

- `IR_INTENSITY_DEPTH`: s/m/w absorbance depths.
- `irBand(list, from, to, intensity, shape, label, atoms)` adds `{from, to, center, intensity, shape: 'sharp' | 'broad' | 'very broad', label, atoms}`, merging a duplicate label/range into one band.
- `irOopPattern(env, ring)` → mono, ortho, meta, para, poly or none, from the ring's substituent positions.
- `predictIrBands(graph, atomIds)` → bands sorted by wavenumber, from a group-frequency table (Silverstein/Pavia ranges):
  - O–H (alcohol, phenol, acid); N–H (two bands for primary, one for secondary, plus the N–H bend and amide II); S–H.
  - C–H stretches (sp³, aromatic, alkene, alkyne) and the aldehyde Fermi pair.
  - C≡N; C≡C, omitted when both ends are symmetry-equivalent. C=C, allene and C=N.
  - C=O by carbonyl kind: −25 cm⁻¹ for conjugation; +30 or +35 for a five-ring; +60 for a four-ring, or +85 for a β-lactam.
  - Aromatic 1600/1500 bands and out-of-plane bends by substitution pattern.
  - NO₂, SO₂, S=O, C–O (ester, acid, aryl ether, alcohol, ether), C–F, C–Cl, C–Br, C–I, and CH₂/CH₃ bends.
- `irSpectrum(bands, {from, to, points})` → `[{x, y}]` in %T = 100·exp(−1.2·absorbance). Sharp bands are Lorentzian (width at most 30 cm⁻¹); broad bands are Gaussian.

### EI mass spectrum (`js/spectra-ms.js`)

- `ISOTOPES`: IUPAC isotope masses and abundances for H, D, C, N, O, F, Si, P, S, Cl, Br, I, B and Se. Other elements fall back to a single `MONO_MASS` isotope (`msElementIsotopes`).
- `msMainMass(el)`: the mass of the most abundant isotope.
- `msConvolve(a, b, threshold)`, and `isotopePattern(counts, {threshold})` → `[{mz, mass, abundance}]`. Each element's distribution is raised to its count by binary exponentiation with pruning, and the patterns are convolved. Abundances are normalised to 100 for the largest peak.
- `msFormulaString(counts)` (Hill order via `MS_HILL_ORDER`) and `msNominal(counts)`.
- `predictMassSpectrum(graph, atomIds)` → `{molecularIon: {mz, exactMass, formula, pattern}, peaks: [{mz, intensity, label, lost, atoms, rule}], basePeak}`.
  - Each fragmentation rule proposes an ion with a score. When several rules give the same m/z, the highest score wins.
  - Rules: α-cleavage next to N, O and S (with a Stevenson bonus for losing the larger radical); ether C–O cleavage; carbonyl α-cleavage giving acylium and aroyl ions and loss of OR, OH or NR₂; aroyl minus CO; aldehyde M−1; McLafferty rearrangement (a γ-H required); benzylic and tropylium (m/z 91) cleavage; dehydration M−18; halogen loss; M−15; alkyl cations; the phenyl 77 and 51 ions; nitro M−46 and M−30; and tropylium → 65.
  - The molecular-ion score depends on the compound class: strong for aromatics, weak for alcohols, amines, ethers and haloalkanes.
  - Scores are normalised to a base peak of 100. Every Cl- or Br-bearing ion, and M itself, gets its isotope cluster. Peaks below 0.5 % are dropped.

### Dock UI (`js/spectra-view.js`)

**Pure helpers** (usable in Node):
- `SPECTRA_TABS` (`h`, `c`, `ir`, `ms`), `spectraSubscript`, `spectraFixed` and `spectraCarbonField` (the ¹³C frequency is the ¹H field ÷ 4).
- `spectraGraphFromSmiles(smiles)` → `{graph, ids}`, a detached graph laid out by `smilesToFragment`.
- `spectraFormulaCounts(formula)` and `spectraUnsaturation(formula)` (degrees of unsaturation, with halogens counted as H and N adding ½).
- `spectraFunctionalGroups(graph, ids)` → a list of group names, used for puzzle hints.
- `spectraPeakList(tab, data, {field})` → a journal-style string, e.g. "Predicted ¹H NMR (400 MHz, CDCl₃) δ 4.12 (q, J = 7.0 Hz, 2H), …"; for ¹³C (100 MHz, CDCl₃) δ …; for IR ν (cm⁻¹) … (s/m/w, br); and for MS (EI, 70 eV) m/z (%) ….
- Puzzle:
  - `spectraPuzzlePool(NAME_SMILES)` → `[{name, smiles, heavy, difficulty}]`. It keeps entries that are neutral, single-component and made only of C, H, N, O, S, F, Cl, Br and I, with 3–14 heavy atoms including a carbon, no isotopes, and at least one ¹H signal. Duplicate SMILES are dropped, which leaves 126 molecules. Difficulty is easy for ≤7 heavy atoms, medium for ≤10 and hard above that.
  - `spectraPuzzleCheck(graph, ids, targetSmiles)` → `{status: 'correct' | 'isomer' | 'formula', correct, message, yourFormula, targetFormula}`. Formulas are compared first, then `propSmiles`. If the SMILES differ, `spectraSameStructure` builds both molecules into one joint graph and compares their multisets of `propSymmetryClasses`, so drawings that differ only in Kekulé placement or atom order still count as correct.

**`createSpectraView(deps)`.** `deps` is `{graph, renderer, storageGet, storageSet, toast, copyText, downloadBlob, insertSmiles, targetAtomIds, onLayout}`. It returns `{toggle, open, close, isOpen, setTab, structureChanged, refreshNow, repaint, hoverAtom, startPuzzle, startPuzzleWith, endPuzzle, inPuzzle, peakListText, highlightedIndices, hoverSignal, state}`.
- The target follows `largestComponent()` in `app.js` (the hovered molecule, or else the largest one) through `targetAtomIds`. A structural signature (elements, charges, bonds) skips recomputation when nothing changed. `structureChanged` is debounced by 180 ms.
- All four predictions are computed at once and cached. Canvas plots:
  - NMR on a reversed δ axis, with peak labels and a translucent band on highlighted signals;
  - IR as %T on a reversed wavenumber axis;
  - MS as a stick plot with an "Isotope zoom" around M.
- The table lists the signals. Hovering a row or a plot peak (within 10 px) calls `renderer.peakAtoms`, and the renderer's `drawPeaks` pass rings those atoms. `hoverAtom(id)` highlights every signal containing that atom. All highlighting is off in puzzle mode. On the MS tab, hovering a peak rings the atoms of that fragment ion, but hovering an atom does not highlight MS peaks, since most atoms appear in many fragments.
- Dragging `#spectra-resize` sets the height (clamped to 150 px up to the larger of 180 px and 75 % of the window height). Copy peak list uses `spectraPeakList`. Export PNG saves the current plot canvas.
- **Puzzle.** Start picks a random pool entry at the chosen difficulty (Any/Easy/Medium/Hard), never repeating the previous one. It shows the spectra of the hidden molecule, and the title shows only the formula and DoU. Check compares the canvas; Hint reveals up to three hints (key IR bands, functional groups, ¹H shifts with notes); Give up places the answer on the canvas and resets the streak; New starts another; Exit leaves puzzle mode.
- **Storage keys.** `spectraDock` holds `{open, tab, height}`; `spectraPuzzle` holds `{streak, solved}`.

### Integration

- `js/renderer.js`: a `peak` theme colour (amber: 245,158,11 dark and 217,119,6 light), `peakAtoms` (a Set), and a `drawPeaks()` pass after `drawMatches()` that draws a filled and stroked ring of `hoverAtomRadius` on each atom. `renderExport` does not copy `peakAtoms`, so exports stay clean.
- `js/app.js`:
  - creates `spectraView` before the view-tab listener;
  - forwards `onHoverChange` to `hoverAtom`, `afterRender` to `structureChanged`, and `applyTheme` to `repaint`;
  - adds a context-menu item "Predicted spectra", a "Spectra" block in the properties panel (`#spectra-open-button`), and the shortcuts Alt+N (toggle dock) and Alt+U (new puzzle) in `INSIGHT_SHORTCUTS`.
- `index.html`: `#spectra-button` in the view toolbar group; `<section id="spectra-dock" hidden>` between `#canvas-wrapper` and `#statusbar` (header with tabs, title and controls; puzzle bar; body with `.spectra-plot` and `.spectra-table-wrap`; footer disclaimer); help rows for Alt+N and Alt+U; the four script tags.
- `css/style.css`: dock rules appended at the end, using existing tokens plus a dock-scoped `--spectra-peak`. The dock is hidden in the reactions view. At ≤640 px the table stacks under the plot.

### Tests

- `test_spectra.js` (session scratchpad), 107 checks:
  - symmetry-class signal counts;
  - multiplicities;
  - accuracy against literature CDCl₃ shifts (targets: ¹H MAE ≤ 0.25 ppm with no signal off by more than 0.8; ¹³C MAE ≤ 4 ppm with none off by more than 12);
  - IR band presence and absence;
  - isotope ratios;
  - molecular ions and key fragments;
  - puzzle pool and check;
  - no mutation of the input graph.
- `drive_spectra.py` (Playwright) exercises the dock, hover linking, copy, the puzzle, theme, the reactions view and phone width.

Numbers and deviations are in `feature-research/spectroscopy/audit.md`.

## Update, later session (40) — structure tools & 3D

Roadmap section 3, built in two slices. Slice A adds biomolecule template stamps, a constitutional isomer enumerator and polymer brackets. Slice B (3D viewer, chair, Newman, Fischer and Haworth projections) is documented in its own sub-section below. The plan, audit and screenshots are in `feature-research/structure-tools/`.

### Slice A — templates, isomers and polymer brackets

There are two new plain-script files. `js/isomers.js` and `js/polymer.js` load after `js/insight.js` (and before `js/resonance.js`), so before `js/renderer.js`. Both are free of DOM code and run in Node when concatenated in `index.html` order. `js/polymer.js` depends on `js/isomers.js` (canonical keys, formula text), `js/smiles.js` (known-unit SMILES), `js/valence.js` (`implicitHydrogenCount`) and `nameStructure`.

#### Biomolecule stamps (`js/stamps.js`)
- `BIO_STAMPS`: 34 entries in the `FUSED_STAMPS` shape `{label, smiles, group}`. `group` is `amino` (the 20 standard L-amino acids, neutral, with `@` stereo), `sugar` (open-chain D-glucose, D-galactose, D-mannose, D-fructose, D-ribose, 2-deoxy-D-ribose; α- and β-D-glucopyranose; β-D-ribofuranose) or `base` (adenine, guanine, cytosine, thymine, uracil).
- `bioStampFragment(key)` parses the SMILES once and caches the custom-stamp fragment (with wedges from the SMILES stereo). `placeStamp` routes bio keys straight after the `FUSED_STAMPS` check, through `placeCustomStamp`.
- `placeCustomStamp` now copies each fragment bond's `stereo`, so wedges survive placement. This also applies to saved custom stamps.
- `index.html` has three new collapsible sidebar sections (`data-section` `amino`, `sugars`, `bases`) before "Abbreviations". `js/app.js` adds their grids (`stamp-buttons-amino`, `stamp-buttons-sugars`, `stamp-buttons-bases`) to `STAMP_THUMB_GRIDS`. `DEFAULT_COLLAPSED_SECTIONS` makes them start collapsed. Sections the user opens are remembered in the localStorage key `expandedSections`. The stamp search needs no changes.

#### Isomer enumerator (`js/isomers.js`)
- `ISOMER_SETTINGS = {maxHeavy: 12, limit: 2000, timeBudgetMs: 4000, stepMs: 25}`. The allowed elements and valences are in `ISOMER_VALENCE` (C4 N3 O2 S2 P3, halogens 1).
- `parseFormula(text)` → element counts, or `{error}` with a user-facing message. It accepts Hill or free order and subscript digits, and rejects unknown elements, no heavy atoms, and a negative or fractional degree of unsaturation.
- `isomerFormulaText(counts)` → a Hill-order string. `isomerHeavyCount` and `isomerUnsaturation` are small helpers.
- **Canonical form.** `isomerCanonicalString(el, adj, extra)` works on an element array and a flat n×n bond-order matrix. It refines colours with a WL pass (`isomerRefine`), then backtracks over the tied cells to find the lexicographically smallest adjacency string. It is exact, not heuristic, and fast at 12 or fewer heavy atoms. `isomerStateFromGraph(graph, atomIds)` → `{el, adj, n, index, ids}` from a live `Graph`. `isomerCanonicalKey(graph, atomIds)` is the wrapper.
- **Enumeration.** `isomerEnumerator(counts, options)` returns a job object `{isomers, complete, done, error, elapsed, visited, cancelled, stoppedBy, step(ms), result()}`.
  - It grows heavy-atom trees one atom at a time from the highest-valence element, deduplicating every intermediate by canonical string. It then spends the degree of unsaturation by raising bond orders, which also closes rings.
  - `step(ms)` runs for about `ms` and returns `done`. Setting `job.cancelled = true` stops it at the next step.
  - The job also stops on `limit` or on `timeBudgetMs` of total work. `stoppedBy` is `'cancel'`, `'limit'` or `'time'`.
  - `error` is `'too large'` (more than `maxHeavy` heavy atoms) or `'bad formula'`.
- `enumerateIsomers(counts, options)` runs a job to completion and returns `{isomers: [{graph, key}], complete, count, stoppedBy}`. Options are `{stableOnly: true, limit, timeBudgetMs}`.
- **`stableOnly` filter.** `isomerIsStable(state)` rejects:
  - heteroatom–heteroatom single bonds other than N–N and S–S (pruned early during growth by `isomerPermanentHeteroLink`);
  - enols and ynols;
  - gem-diols and hemiacetals;
  - aminals and carbinolamines;
  - triple bonds in rings smaller than 8 and allenes in rings smaller than 9;
  - bridgehead double bonds in rings smaller than 8 (Bredt).
- `isomerBranching(graph)` is the sort key for the "branching" order. `isomerLayout(graph)` writes `computeLayout` coordinates into an isomer graph.
- The returned graphs have every atom at (0, 0). `nameStructure` must be called before `isomerLayout`, because a laid-out graph picks up spurious E/Z prefixes from its drawn geometry.

#### Isomer modal (`js/app.js`, `index.html`, `css/style.css`)
- The `#isomer-overlay` modal follows the resonance modal. `resonanceThumbnail` is now the general `structureThumbnail(graph)`, used by both.
- The controls are:
  - a formula input (`#isomer-formula`) with Find and Stop buttons;
  - a "Stable only" checkbox (on by default);
  - a sort select (`branching`, the default, or `name`);
  - a summary line ("5 isomers (stable only)", "2000+ shown, stopped at limit", "358 isomers shown, stopped at the 4 s time limit");
  - a paged grid (`ISOMER_PAGE_SIZE` 48) with Prev/Next;
  - Cancel, Place and Close buttons.
- `openIsomers(atomIds)` prefills the formula from the target and starts the search straight away. `runIsomers` drives the job with `setTimeout` slices of `ISOMER_SETTINGS.stepMs`. `cancelIsomers` stops it and keeps what was found so far.
- Pages are laid out and named lazily (`isomerItemName`), with names computed before layout. Sorting by name first names every item in time slices (`nameAllIsomers`).
- A click selects a card. Double-click or "Place on canvas" calls `placeIsomer`, which goes through `insertSmilesFragment` to the right of the source molecule. Escape and the Close button call `closeIsomers`, and Enter in the formula input re-runs the search.
- The modal is opened by Alt+I (`INSIGHT_SHORTCUTS`, `KeyI`) or by "Find isomers" in the molecule and selection context menus. `openIsomersForTarget` uses the selection, then the hovered molecule, then the largest molecule.

#### Polymer brackets (`js/polymer.js` and plumbing)
Annotations gain a fourth kind:

```
{id, kind: 'bracket', atomIds: [atom ids of one repeat unit], n: 'n', label?: string}
```

- A bracket is valid only when every atom in `atomIds` exists and exactly two bonds cross the unit boundary. It has no coordinates of its own. The geometry is recomputed every frame from the live atoms, so brackets follow the atoms when they are moved, rotated or cleaned up, and cannot be dragged on their own.
- `n` is the subscript text (at most 8 characters, default `'n'`). `label` is an optional user name (at most 200 characters) that replaces the automatic polymer name.
- Brackets are written by `serializeGraph` and kept by undo/redo and autosave like the other kinds. `sanitizeAnnotations` dedupes `atomIds` and clamps `n` and `label`.

`js/polymer.js`:
- `bracketCrossings(graph, atomIds)` → `[{bond, inner, outer}]`. `bracketValid(graph, bracket)` checks validity. `pruneBrackets(graph)` removes every invalid bracket and returns the count.
- `polymerRepeatCounts(graph, atomIds)` counts the unit's atoms plus implicit H. `polymerRepeatFormula(graph, bracket)` gives it as a Hill string. `polymerSubscript(text)` turns digits into subscripts.
- `polymerName(graph, bracket)` → a name, or `''` if the bracket is invalid. It tries three routes in order:
  1. **Addition polymers.** `polymerAdditionName` handles units whose head-to-tail path is all carbon. A 2-carbon path with a single bond becomes C=C, and a 4-carbon path with orders 1-2-1 becomes a 1,3-diene. It then names the monomer with `nameStructure`, strips a leading stereo prefix, maps it through `POLYMER_MONOMER_NAMES` (propylene, vinyl chloride, isobutylene, chloroprene and others) and returns `poly(<monomer>)`. Examples are poly(ethylene), poly(styrene), poly(methyl methacrylate) and poly(isoprene).
  2. **Known repeat units.** `polymerKnownName` matches `POLYMER_KNOWN_UNITS` (PET, nylon-6, nylon-6,6, poly(oxyethylene), poly(oxymethylene)). Each unit is closed into a three-copy head-to-tail ring (`polymerTrimerKey`) with alternating 6-rings aromatised (`polymerAromatize`) and compared by canonical string. This makes the match independent of which end the user bracketed and of the Kekulé form.
  3. **Fallback.** `poly[(<subscripted formula>)]`, for example `poly[(C₃H₆O)]`.

Plumbing:
- **`js/renderer.js`.**
  - `RENDER_SETTINGS` gains `bracketHalf`, `bracketSerif`, `bracketWidth` and `bracketLabelGap`.
  - `bracketGeometry(annotation)` → `null` if invalid, else `{marks, n, label, labelBox}`. The two brackets are drawn perpendicular across the crossing bonds at their midpoints, with serifs pointing into the unit. `n` sits just past the lower end of the second bracket, and the name pill is centred under the unit.
  - `drawBracket` draws them in the bond colour, with an italic `n` and a name pill in the name-label colours. `bracketHit` hit-tests the bracket strokes.
  - `polymerLabel` returns the custom label, or a `polymerName` cached in `polymerCache` by structural signature.
  - `annotationBounds` gains a bracket branch, so the generic highlight box covers hover and selection.
- **`js/interactions.js`.**
  - `annotationAt` finds brackets with `bracketHit`.
  - `moveAnnotation`, `annotationPoints` and `transformAtoms` treat brackets as attached to atoms.
  - `extractFragment` includes a bracket only when all its atoms are in the copied selection, and adds such brackets automatically.
  - `insertFragment` remaps `atomIds` through the paste id map and keeps a bracket only if it is still valid.
- **`js/app.js`.**
  - `afterRender` starts with `pruneBrackets(graph)`. If anything was removed it re-renders, so the removal lands in the same history commit as the edit that broke the bracket (deleting a unit atom, or breaking or adding a bond across the boundary).
  - The "Polymer brackets" selection entry and Alt+B (`KeyB`) call `addPolymerBrackets(ids)`. It toasts "Select one repeat unit with exactly two bonds leaving it" when the selection is invalid, and replaces a bracket on the same atoms.
  - `annotationEntries` for a bracket has "Rename…" (`openBracketEditor`, the inline text editor over the name pill; an empty name or the automatic name clears `label`) and "Delete brackets".
  - Hovering a bracket shows "Polymer brackets · (C₂H₃Cl)ₙ · poly(vinyl chloride) — right-click to rename, Del to delete" in the status bar.

#### Tests
- `test_structure_tools_a.js` (session scratchpad, bundle from `build_tools_a.sh`), 280 checks:
  - bio stamp parsing, R/S labels and names;
  - `parseFormula` errors;
  - the plan's isomer count table, the stable C₃H₆O and C₂H₄O₂ sets, and C₈H₁₈ timing;
  - time slicing, limit and cancel;
  - 17 polymer names including reversed units, and the fallback;
  - bracket validity, prune, save/load and copy/paste remapping.
- `drive_tools_a.py` (Playwright), 44 browser checks:
  - the new sections, and a stamp placed from each;
  - the C₆H₁₄ and C₁₀H₂₂ isomer modal;
  - PVC brackets through save and reopen, copy/paste, delete and undo;
  - no horizontal overflow and no page errors.

Numbers and deviations are in `feature-research/structure-tools/audit.md`.

### Slice B — 3D viewer, chair, Newman, Fischer and Haworth

There are three new plain-script files. `js/geometry3d.js` and `js/projections.js` load right after `js/polymer.js` (so after `js/insight.js` and before `js/resonance.js`). Neither has DOM code, and both run in Node when concatenated in `index.html` order. `js/viewer3d.js` is the DOM factory; it loads after `js/spectra-view.js` and before `js/app.js`. Dependencies: `insightContext`/`insightAtomInfo` (hybridization, rings, aromaticity), `findStereocenters`, `findStereoDoubleBonds`, `cipRankSubstituents` and `tetrahedralVolume` from `js/stereo.js`, and `colorForElement` for the viewer.

#### 3D model and force field (`js/geometry3d.js`)
- `GEO3D_SETTINGS = {bondLength 1.5, wedgeZ 0.8, pucker 0.25, jitter 0.05, maxSteps 2000, forceTol 0.02, maxMove 0.2, dtStart 0.02, dtMax 0.06, conformerRmsd 0.3, conformerCount 10, timeBudgetMs 2500, maxHeavy 200}`.
- **Model shape** (`geo3dBuild`, returned by `embed3d`): `{graph, atomIds, ctx, atoms, bonds, index, ff?, energy?}`.
  - `atoms: [{id, element, x, y, z, implicitH, hyb, aromatic, parent}]`. Heavy atoms keep their graph ids. Added hydrogens get negative ids, `implicitH: true` and `parent` = the heavy atom id.
  - `bonds: [{id, atomA, atomB, order, stereo, ring}]`, with `order` 1.5 for aromatic bonds. An H bond's id is the H's negative id.
  - `index` maps atom id → array index. `ctx` is the `insightContext` of the component.
- **Start coordinates** (`geo3dStartCoordinates`): the 2D drawing is centred and scaled so the median bond is 1.5 Å, with Y negated (keeping the stereo sign convention of `js/stereo.js`). Z gets ±0.8 Å on the far atom of each wedge/hash, ±0.25 Å alternating pucker on all-sp³ six-membered rings, and seeded jitter (`geo3dRandom`, mulberry32). Hydrogens are placed around their parent before minimization.
- **Force field** (`geo3dForceField` → `{bonds, angles, torsions, impropers, vdw, chiral, ez, nbrs, dist}`), constants in `GEO3D_FORCE`:
  - bond stretch, harmonic, k 700, ideal length from single/sp²/sp/double/triple/aromatic covalent-radius tables (`geo3dBondLength`);
  - angle bend in cos θ (k 100, 70 for angles involving H, divided by sin²θ₀), ideal by hybridization (`geo3dIdealAngle`: 109.47 / 120 / 180); centres with more than 4 neighbours get 1–3 repulsion only;
  - torsions: sp³–sp³ threefold with barrier √(V_j·V_k) from `GEO3D_TORSION_V`; sp²–sp² twofold planar (30 double, 25 aromatic, 10 with N/O, else 5); split over the substituent pairs; none for sp³–sp² or sp;
  - improper out-of-plane terms on sp² centres, k 15;
  - soft repulsive vdW for 1–4 and beyond, (Bondi radii × `vdwScale` 1.1), weight 2, 1–4 pairs scaled by 0.5;
  - a chirality restraint (k 20, floor 1) keeping each drawn stereocentre's signed volume in CIP order, and an E/Z restraint (k 30) on stereo double bonds (`geo3dRestraints`).
  - `ff.holds` (optional): dihedral restraints `{i, j, k, l, target, force}`, E = force·(1 − cos(φ − target)), used by the Newman scan.
- `geo3dEval(ff, p, g)` returns the energy and fills the analytic gradient (checked numerically to ~1e-8). `geo3dFire` is a FIRE minimizer.
- Public API:
  - `embed3d(graph, atomIds, {seed, minimize})` → a minimized model with `energy`.
  - `minimize3d(model, {maxSteps})` → `{energy, steps, converged}`; `ff3dEnergy(model)`.
  - `conformerSearch3d(graph, atomIds, {count, seed, timeBudgetMs})` → a time-sliced job `{step(ms), conformers, done, trials, maxTrials, cancelled, elapsedMs}`. Each trial kicks random rotatable torsions (`rotatableBonds3d`, `geo3dRotateAbout`) and flips a random flippable ring (`geo3dFlipRing`, which realigns axial↔equatorial substituents through `geo3dAlignSide`). Every 6th trial re-embeds from a new seed. Results are deduplicated at heavy-atom RMSD < 0.3 Å (`geo3dHeavyRmsd`, Horn quaternion fit via `geo3dJacobi4`) and sorted by energy. maxTrials is 3 for rigid molecules, else min(120, 12 + 10·rotors + 8·rings); the time budget is checked inside the loop.
  - `conformers3d(graph, atomIds, opts)` runs the job to completion and adds `relEnergy`.
  - `distance3d`, `angle3d`, `dihedral3d` (degrees, signed), `rmsd3d(ptsA, ptsB)`.
  - `model3dStereo(model)` → `[{atomId, type: 'R'|'S'|null, drawn}]` from the 3D signed volumes.
  - `graphFromSmiles3d(smiles)` → `{graph, ids}`: a fresh `Graph` built from `smilesToFragment` (charges, explicit H counts, bond orders and wedge/hash kept). The viewer uses it for its examples; the Node bundle uses it too.
- Energies are kcal/mol-like but are shown as "relative, arbitrary units".

#### Projections (`js/projections.js`)
- Labels: `projLabel(ctx, fromId, id, left, depth)` condenses a substituent (OH/HO, NH2/H2N, CHO, COOH, CH2OH/HOCH2, CH3/H3C, Ph, CN, CH(CH3)2, …); `projGroupLabel(graph, ctx, fromId, id, side)` wraps it.
- **Chair.** `chairAnalysis(graph, atomIds, {ringIndex})` → `{applicable, reason?, rings: [{index, atomIds, label}], ringIndex, ring, ringElements, substituents, ambiguous, energies: {A, B}, deltaG, stable: 'A'|'B'|null, ratio: [pA, pB]}`.
  - Rings: saturated 6-membered carbocycles and pyranose rings (`projChairRings`), ring O first (`projRotateRing`).
  - Reasons: when every six-membered ring is aromatic the reason says aromatic rings are flat and have no chair; otherwise the generic "Needs a saturated six-membered carbocycle or a pyranose ring".
  - Faces come from the wedge/hash (`projRingFaces`). In chair A the axial position at even ring index points up; chair B swaps axial and equatorial.
  - `substituents: [{ringPosition, ringAtomId, atomId, face, group, aValue, known, hydrogen, labelLeft, labelRight, axialA, axialB}]`. A-values from `CHAIR_A_VALUES`, unknown groups `CHAIR_DEFAULT_A` 1.7. ΔG = |ΣA(axial in A) − ΣA(axial in B)|; ratio from exp(−ΔG/RT) with RT 0.593 kcal/mol (25 °C). A single substituted position with no stereo is assigned an arbitrary face.
- **Fischer.** `fischerProjection(graph, atomIds)` → `{applicable, reason?, chain, rows, dl, dlFrom, meso}`.
  - Needs an acyclic component with ≥ 1 stereocentre on the longest carbon chain (`projCarbonChain`). The more oxidized end (`projOxidation`) goes on top.
  - When no stereocentre is found, no bond in the component has a wedge/hash, and some carbon could be one (`projPotentialCenter`: sp³ C, at most one H, CIP-distinct substituents), the reason is "Draw wedge/hash bonds to set the stereocentres"; otherwise "Needs a stereocentre on the longest carbon chain".
  - `rows: [{type: 'end', label} | {type: 'center', atomId, config, leftId, rightId, left, right} | {type: 'group', label}]`. Left/right are chosen so the Fischer template (`projFischerTemplateVolume`: vertical back, horizontal toward the viewer) reproduces the centre's actual R/S, with a signed-volume fallback.
  - D/L from the bottom-most stereocentre, except for α-amino acids (top COOH, first centre carrying N), which use Cα. `meso` is set when the rows are a mirror image of themselves.
- **Haworth.** `haworthProjection(graph, atomIds)` → `{applicable, reason?, ringSize, kind: 'pyranose'|'furanose', positions: [{atomId, element, role: 'O'|'C1'…, up, down, upId, downId}], anomer: 'α'|'β'|null, dl, label}`. The ring must have one O and ≥ 4 ring carbons carrying OH/CH₂OH. Positions start at the ring O, then the anomeric carbon (the O-neighbour bearing a heteroatom), going round. Up/down come from the wedge/hash faces, flipped if the drawn ring is clockwise. D/L from the exocyclic carbon on the last ring carbon (up = D); α/β from the anomeric O relative to that carbon (same face = β), only when the anomeric centre has a drawn wedge/hash.
- **Newman.** Takes a 3D model.
  - `newmanBonds(model)` → `[{bondId, atomA, atomB, label}]` from `rotatableBonds3d` (acyclic single bonds, both ends with ≥ 2 heavy neighbours, no sp atoms). `newmanDefaultBond(model, hoveredBondId)`: the hovered bond if listed, else the central bond of the longest carbon chain.
  - `newmanData(model, bondId, dihedral, {relax})` → `{bondId, frontAtomId, backAtomId, front: [{atomId, label, angle, reference}], back, dihedral, startDihedral, energy, name, model}`. Angles are degrees clockwise from up in the Newman view; `reference` marks the highest-priority heavy group on each carbon, whose dihedral is the one set. `dihedral` null keeps the current one.
  - `newmanRotated` rotates the back half rigidly, then (relax, the default) minimizes `NEWMAN_RELAX_STEPS` 600 steps with a `NEWMAN_HOLD` 400 dihedral hold; the reported energy is the unrestrained force field.
  - `newmanCurve(model, bondId, step, {relax})` → `{points: [{angle, energy, rel}], min}`.
  - `newmanConformationName(φ)`: |φ| < 30 'syn (eclipsed)', < 90 'gauche', < 150 'eclipsed', else 'anti'.

#### Viewer (`js/viewer3d.js`, `index.html`, `css/style.css`, `js/app.js`)
- `createViewer3d({graph, renderer, storageGet, storageSet, toast, downloadBlob, targetAtomIds, hoveredBondId})` → `{open, close, isOpen, selectTab, showExample, backToMolecule, redraw, state}`.
- `#viewer-overlay` / `.viewer-dialog` is min(1100px, 95vw) × min(720px, 90vh): a tab row (`.viewer-tab[data-tab]` 3d, chair, newman, fischer, haworth), a canvas stage (`#viewer-canvas`, `#viewer-tip`, `#viewer-status`, the `#viewer-example` banner and the `#viewer-unavailable` message) and a side panel of `.viewer-pane[data-pane]` blocks plus `#viewer-export`. Style, H toggle and last tab persist under the `viewer3d` storage key.
- The viewed molecule is `state.graph` + `state.ids`, not `deps.graph`: every model, conformer search, projection and label reads `state.graph`. `load(graph, ids)` embeds, resets picks/curve/ring/conformers, calls `evaluateTabs()` and renders; `startSearch()` starts a `conformerSearch3d` job pumped with `setTimeout` slices (cancelled on close or reload).
- `open()` checks the canvas target (refuses empty or > `maxHeavy`), stores it as `state.homeIds`, loads it from `deps.graph` and reopens the remembered tab even when it does not apply.
- Tabs are never disabled. `evaluateTabs()` runs `chairAnalysis`, `fischerProjection`, `haworthProjection` and `newmanBonds`, stores the reasons in `state.reasons`, and gives inapplicable tabs the muted `.unavailable` class and `title="Not available: <reason>"`. Selecting such a tab covers the stage with `#viewer-unavailable`: the reason, a one-line hint and `#viewer-example-button` "Show example: <name>".
- Examples (`VIEWER3D_EXAMPLES`, keyed by tab, `{name, smiles, hint}`): chair menthol, newman butane, fischer D-glucose (open chain), haworth β-D-glucopyranose. `showExample(tab)` builds the graph with `graphFromSmiles3d`, loads it into the viewer only (the canvas graph is untouched), sets `state.example` and shows the `#viewer-example` banner "Example: <name> · Back to my molecule". `backToMolecule()` reloads `state.homeIds` from `deps.graph`. The hovered canvas bond is ignored as the Newman default while an example is shown.
- **3D tab**: rotation matrix + zoom + centre; atoms and bond halves depth-sorted; radial-gradient spheres coloured by `colorForElement(el, renderer.theme)`; bonds as dark/light line pairs, double/triple as parallel lines, aromatic with a dashed second line. Styles ball / stick / space (vdW). Drag rotates (trackball about the axis perpendicular to the drag), wheel zooms, double-click recentres on an atom (or refits), auto-rotate uses `requestAnimationFrame`. Hover tooltip: atom name, hybridization, R/S from `model3dStereo`. Measure mode: 2/3/4 picks give distance/angle/dihedral in `#viewer-measure`. The conformer list (`#viewer-conformers`) shows ΔE; Minimize runs `minimize3d` on the current conformer; Export PNG saves the canvas.
- **Chair tab**: both chairs drawn from an ideal chair in a fixed oblique view, axial bonds vertical, equatorial bonds radial; axial non-H groups highlighted; the stable chair's caption is green. `#viewer-chair-info` shows ΔG, the more stable chair, the 25 °C ratio and the per-substituent table. `#viewer-ring` picks the ring.
- **Newman tab**: `#viewer-bond` picks the bond, `#viewer-angle` (0–360) sets the reference dihedral; the back carbon is a circle with spokes from its rim, the front carbon has spokes from the centre. The relaxed curve is computed lazily (10° steps, cached per bond and conformer) into `#viewer-curve` with the current angle marked.
- **Fischer tab**: crossed-lines drawing with end labels, per-centre R/S, D/L (or meso) heading.
- **Haworth tab**: flattened ring with thick front bonds, ring O at the back right, anomeric carbon on the right, up/down labels.
- `js/app.js`: `let viewer3d`; `createViewer3d` wired after `createSpectraView`. Its `targetAtomIds` uses the connected component of the first selected atom (`interactions.selectedAtomIds()`) when atoms are selected, else `largestComponent()` (hovered, else largest); other features keep `largestComponent()`. `hoveredBondId` comes from `interactions.hover`; `#viewer-button` (toolbar, after the insight menu); `KeyD` in `INSIGHT_SHORTCUTS` (Alt+D); "3D & projections" in the molecule context menu; Escape closes the overlay in the global keydown handler. `index.html` also has the Alt+D help row.

#### Tests
- `test_structure_tools_b.js` (session scratchpad, bundle from `build_tools_b.sh`), 89 checks: the four viewer example SMILES make their tabs applicable, the benzene chair and unwedged-alanine Fischer reasons; bond-length and sp³-angle statistics, planarity, cyclohexane chair, amino-acid R/S, E/Z, butane anti, conformer dedup and time budget, all projection cases from the plan, the Newman butane profile, and the RDKit RMSD comparison (`rdkit_geom.py`, run from the test through the venv).
- `drive_tools_b.py` (Playwright): menthol → Alt+D, tab availability/tooltips and no disabled tabs, conformer list, drag rotation, hover tooltip, distance measure, chair/Newman info, the unavailable Fischer tab showing its message, D-glucose Fischer and β-D-glucopyranose Haworth via stamps, the context-menu entry; benzene with every example (Haworth, Fischer, Chair, Newman), Back to my molecule and an unchanged canvas; selection targeting with two molecules; no page errors.

Numbers and deviations are in `feature-research/structure-tools/audit.md`.

## Update, later session (41) — sharing & retrosynthesis

Roadmap section 4, built in slices. Slice A (share link and lab-notebook export) is documented below. Slice B (quizzes) was dropped, and the printable worksheet (A2) was dropped from Slice A. Slice C (retrosynthesis) is documented after it; the energy diagram (C2) was dropped. The plan, audit and screenshots are in `feature-research/learning-sharing/`.

### Slice A — share link and lab notebook

There are two new plain-script files. `js/share.js` and `js/notebook.js` load right after `js/projections.js`, in that order. Both are free of DOM code and run in Node when concatenated in `index.html` order. `js/notebook.js` calls `computeProperties`, `nameStructureDetailed`, the section-39 predictors and, when it is defined, `spectraPeakList` (from `js/spectra-view.js`, which loads later but is only called at run time). The browser-only parts (compression streams, SvgContext rendering, `window.print`, clipboard) live in `js/app.js`.

#### Share link formats (`js/share.js`)
- `#g=<payload>` stores the exact canvas. `shareEncodeGraph(state | JSON string)` turns `serializeGraph()` output into the compact JSON array `[1, [nextAtomId, nextBondId, nextAnnotationId], atoms, bonds, annotations]`. Coordinates are integer tenths (so they are rounded to 0.1), and trailing default values are trimmed (`shareTrim`).
  - atom `[id, element, x10, y10, charge?, abbr?, abbrHidden 0/1?]`
  - bond `[id, atomA, atomB, order?, stereo 0 none / 1 wedge / 2 hash?]`
  - annotations `['a', id, x1, y1, x2, y2, style?, bend?, above?, below?]`, `['t', id, x, y, text]`, `['p', id, x, y]`, `['b', id, atomIds, n?, label?]`
- The payload is one prefix letter plus base64url (no padding): `z` = the UTF-8 JSON deflated with `CompressionStream('deflate-raw')`, `u` = uncompressed UTF-8. `z` rather than a bare payload keeps the two unambiguous. A typical two-molecule drawing is about 370 characters; the 20-structure test drawing goes from 18,968 characters of JSON to 4,188 compact to 3,141 compressed.
- `shareDecodeGraph(text)` validates every row (integer ids and coordinates, bond ends that exist, order 1–3, known stereo codes, well-formed annotation rows, header) and returns a `serializeGraph`-shaped state or `{error}`. `shareUnpackPayload`, `shareBase64UrlDecode` and `shareUtf8Decode` (fatal `TextDecoder`) reject damaged payloads. `SHARE_MAX_JSON_LENGTH` (4,000,000) caps the decoded text.
- `#smiles=<urlencoded>` is the readable form: `allSmiles()` (components joined with `.`). It carries no stereo (the canonical `propSmiles` writes none) and no annotations.
- `shareParseHash(hash)` → `{kind: 'g', payload}`, `{kind: 'smiles', payload: string | null}` (null when empty or not decodable) or null. `shareUrl(base, kind, payload)` rebuilds the link from the page URL without its hash.

#### Share wiring (`js/app.js`)
- `shareCompress(text)` / `shareDecompress(payload)` are the async wrappers. Compression falls back to `u` when `CompressionStream` is missing or fails. Decompression reads the `DecompressionStream` chunk by chunk and aborts past `SHARE_MAX_JSON_LENGTH`, so a deflate bomb cannot exhaust memory.
- `copyShareLink()` (Alt+K, and "Copy share link" in `#share-menu`) copies the `#g=` link with `copyText`. The toast has a "SMILES link instead" action (`copySmilesLink()`). Links over `SHARE_LINK_WARN_LENGTH` (8,000 characters) get a warning toast that gives the length.
- `loadShareHash()` runs at startup (after the autosave restore, the history setup and the saved-view restore, at the very end of the IIFE) and on every `hashchange`. It parses the hash and clears it at once with `window.history.replaceState` (`history` inside the IIFE is the undo History). It then decodes and validates everything, including unknown elements and empty drawings, before touching the canvas. Any failure is a warning toast "Could not open the shared link — <reason>", and the canvas is unchanged.
- `applySharedState(apply)` switches to the editor view if needed, remembers the current drawing in Recent, clears the selection and hover, then mutates the graph (`loadGraphState(state)`, or `graph.clear()` plus `insertSmilesFragment` for `#smiles=`) with no render in between. The one render that follows (`fitToContent`) gives exactly one undo step, so Undo restores the previous drawing. The toast is "Loaded shared structure · Undo restores your previous drawing", with an Undo action. At startup, a share hash replaces the "Restored your previous drawing" toast.

#### Lab notebook (`js/notebook.js`, `js/app.js`)
- `notebookEntry(graph, ids, {field, sections})` → `{name, iupac, formula, mw, exactMass, smiles, properties, nmrH, nmrC, ir, ms, field, sections, peakLists, errors}`. `sections` maps the `NOTEBOOK_SECTIONS` keys (`properties`, `nmrH`, `nmrC`, `ir`, `ms`) to booleans (missing = on). A predictor that throws adds its key to `errors`, and that section says "No prediction available".
- `notebookSpectrumSvg(kind, data, {width, height})` is a pure SVG string builder. ¹H: sticks with multiplicity labels. ¹³C: sticks, with H-free carbons at 0.45 height. IR: an `irSpectrum` %T curve with up to 10 band centres labelled. MS: bars with the top 5 m/z labelled.
- `notebookBody(entries, meta, svgs)` builds `<div class="notebook">`: a header with the title and `notebookMetaLine` (date · app name), the escaped notes, then one `<article class="nb-entry">` per molecule with the structure SVG, an identity table and one `<section class="nb-section" data-section="key">` per wanted section. `notebookHtml` wraps it in a self-contained document with `NOTEBOOK_CSS` inline (every rule scoped under `.notebook`). `notebookMarkdown` writes the same content with property tables and a `data:image/svg+xml` image per structure (`notebookSvgDataUri`). All user text goes through `notebookEscape` / `notebookMdEscape`. `meta` is `{title, notes, date, appName}`.
- UI: `#notebook-overlay` (`.notebook-dialog`) has `#notebook-title`, `#notebook-notes`, section checkboxes (`input[data-section]`) and Print / Download Markdown / Download HTML. `openNotebook()` (Alt+J, or "Lab notebook…" in `#share-menu`) targets whole components touched by the selection, otherwise every component, and shows the count in `#notebook-summary`. `structureSvg(ids)` renders one component into an `SvgContext` through a temporary `Graph` (light theme, no names, no grid) and strips the XML declaration. Files are named from the title, otherwise `fileBaseName()`, plus `-notebook.html` / `.md`. The date is the ISO date.

#### Print root (`index.html`, `css/style.css`)
- `<div id="print-root">` is a direct child of `body`, hidden on screen. `printNotebook()` fills it with `<style>NOTEBOOK_CSS</style>` plus `notebookBody(...)`, adds `body.printing`, and calls `window.print()`. `afterprint` removes the class and empties the root.
- `@media print` only acts under `body.printing`: every other body child is hidden, `html`/`body` lose the full-height, flex and `overflow: hidden` app layout so long notebooks paginate, and the page is forced to white with dark text in both themes. A plain Ctrl+P without the notebook prints the normal page.

#### Toolbar, shortcuts and help
- `#share-button` + `#share-menu` sit in an `.insight-anchor` just before `#viewer-button`. The popover reuses the `#insight-menu` rules (fixed position, `.insight-title`) with `.share-row` buttons. It closes on outside mousedown, Escape inside it, and Escape in the global chain after the insight menu. Opening it closes the insight menu.
- `INSIGHT_SHORTCUTS` gains `KeyK: copyShareLink` and `KeyJ: openNotebook`. The notebook overlay has its own early Escape branch in the global keydown handler, before the viewer branch. The "File" help group has rows for Alt+K and Alt+J.

#### Toolbar compaction (`css/style.css`)
- Buttons inside `#toolbar` are now sized by `#toolbar`-scoped rules, so dialogs that reuse `.text-button` / `.icon-button` keep the old 30px size. In the toolbar, icon and tool buttons are 28px (16px icons), groups have 2px padding and a 1px gap, and the toolbar has a 6px gap and 8px × 12px padding. Tool labels are hidden below 1900px (previously 1780px).
- Up to 1400px, buttons are 26px (15px icons, the minimum hit target), text buttons are 12px with 6px padding, and the toolbar gap is 4px. Up to 1330px, `#smiles-button` is hidden (Copy SMILES stays in the context menu, Ctrl+Shift+C and the properties panel).
- `body.panel-open #toolbar` wraps to a second row instead of overflowing, and hides `#smiles-button`. The panel's open/close already calls `resizeCanvas()`, so the canvas follows the taller toolbar. `overflow-x: auto` on `#toolbar` remains as the last resort. It fits on one row, with no document overflow, at 1280, 1366, 1440 and 1920 px.

#### Tests
- `test_share_export.js` (session scratchpad, bundle from `build_share.sh`), 429 checks:
  - 21 `#g=` round trips (stereo, brackets, labelled and bent arrows, text, plus, abbreviations, annotation-only drawings);
  - `u` and `z` payloads against Node zlib `deflateRaw`, and base64url against Node's encoder;
  - malformed compact data and payloads, and `#smiles=` parsing;
  - `notebookEntry` against `computeProperties` and each predictor;
  - HTML and Markdown sections, escaping and self-containment, and SVG well-formedness via a tag balancer.
- `drive_share.py` (Playwright) covers:
  - the menu and shortcuts;
  - copying a link and opening it in a fresh page (same atoms, bonds, stereo, annotations and name);
  - Undo and Redo after loading, `#smiles=` via hashchange and at startup, and six malformed links;
  - the notebook's selection vs all-components target, HTML and Markdown downloads, and Print with `emulate_media('print')` and `page.pdf()`;
  - help rows, and no page errors.
- `drive_toolbar.py` checks the toolbar fit at the four widths in both themes, and the wrap when the panel is open.

Numbers and deviations are in `feature-research/learning-sharing/audit.md`.

### Slice C — retrosynthesis

There are two new plain-script files. `js/retro.js` loads right after `js/reaction-aromatic.js` and has no DOM code, so it runs in Node when concatenated in `index.html` order. `js/retro-view.js` loads just before `js/app.js` and exports the factory `createRetroView(deps)`. The approach is generate-and-test. Each transform proposes precursors by editing a copy of the target in reverse. The proposal is then run forward through `predictReaction`, and it is kept only if the forward engine gives back the target. No forward rules were added, and the naming engine is unchanged.

#### Engine (`js/retro.js`)
- `RETRO_LIMITS`: `maxDepth` 3, `budgetMs` 1500 per disconnection call, `maxHeavy` 60, `maxPerTransform` 4, `maxCandidates` 30, `maxGrignardCarbons` 12. `RETRO_REAGENTS` holds the fixed reagent compounds (SMILES, role and the arrow label): water, BH₃, NaBH₄, NaOH, SOCl₂, PBr₃, HCl/HBr/HI, H₂, PCC, KMnO₄, NaCN, mCPBA, NaOEt, KOtBu, Br₂, Cl₂ and NaBH₃CN. Catalysts and conditions that the engine only knows as additives (`h2so4`, `pdc`, `nah`, `pyr`, `alcl3`, `febr3`, `oso4`, `nmo`, `fe`, `hcl`, `nanh2`, `naoh`) go into `conditions.additives`.
- The target is `retroTarget(graph, ids)`. `retroClone` copies the atoms without explicit H, keeping ids sequential so they are stable across clones. The result carries `rxAnalyze` info, the `rxAromaticRings` atoms, the canonical SMILES (`computeProperties(...).smiles`, without stereo), the skeleton count (C/N/O/S/P) and the number of components.
- `RETRO_TRANSFORMS` has 28 entries `{id, name, rule, group, match(t)}` (53 after later session (42), Slice B; see below). `match` returns specs `{precursors: [{smiles, role, label?}], reagents, conditions}` built with `retroEdit` / `retroSinglePiece` (edit a clone, check valence with `retroValid`, split into pieces) and `retroSpec`. `rule` is the RX_RULES id that the forward step must fire; the test suite checks that every one exists. Mapping, from transform to rule:
  - Alcohols: `hydration` → `hydration`, `hydroboration` → `hydroboration`, `carbonyl-reduction` → `reduction`, `grignard` → `grignard` (R–MgBr as a reagent with a label, ether solvent; the Grignard piece is limited to 12 carbons), `alcohol-sn2` → `halide` (primary and secondary halide carbons only).
  - Halides and ethers: `halide-from-alcohol` → `alcohol-halide`, `hx-addition` → `hydrohalogenation` (plus HBr/peroxide), `williamson` → `williamson`.
  - Carbonyl derivatives: `fischer` → `fischer`, `ester-acyl-chloride` and `amide-acyl-chloride` → `acyl`, `alcohol-oxidation` / `acid-oxidation` → `oxidation`, `nitrile-hydrolysis` → `nitrile-hydrolysis`, `nitrile-sn2` → `halide`, `aldol` → `aldol` (5 °C addition, 80 °C condensation), `wittig` → `wittig`.
  - Alkenes and alkanes: `dehydration` → `dehydration` (temperature chosen by the alcohol's degree), `e2` → `halide` (NaOEt and KOtBu), `diels-alder` → `diels-alder`, `hydrogenation` → `hydrogenation` (only C=C/C≡C whose carbons have carbon neighbours only, so no enols, vinyl halides or vinyl ethers are proposed), `alkyne-alkylation` → `acetylide`, `epoxidation` → `epoxidation`, `dihydroxylation` → `osmium`.
  - Aromatics: `eas-halogenation` and `fc-acylation` → `aromatic`, `nitro-reduction` → `nitro-reduction`, `reductive-amination` → `imine`.
- `RETRO_DROPPED_TRANSFORMS` lists `eas-nitration`: the forward engine has no nitration rule, so a nitroarene gets no disconnection. The view's empty state says so. Later session (42), Slice B, restores `eas-nitration` and lists `hydro-deamination` instead.
- `retroVerify(spec, targetSmiles)` builds compounds in the Reaction-lab shape (`{input, smiles, fragment, role, equiv, label?}`), normalises the conditions and calls `predictReaction`. A candidate is a main route when a product of `best` equals the target SMILES. It is a minor route (`minor: true`) when the target is in `best.minor` or in any alternative's products or minors. Otherwise the spec is dropped.
- `retroDisconnect(graph, ids, options)` → `{smiles, candidates, tried, truncated, reason, ms}`. `reason` is `'empty'`, `'components'` (more than one component) or `'size'`. Specs are de-duplicated by `retroSpecKey`, and verification stops at the time budget (`truncated`). Each candidate carries the transform id, name and group, the expected rule and the fired `outcomeRule` / `outcomeId`, `precursors` (from `retroPrecursorInfo`: skeleton size, stereocentres, and `common`, the `NAME_SMILES` name when the canonical SMILES matches one), the verified `compounds` / `conditions` / `outcome` / `product`, `labels` from `reactionConditionLabels`, and `rank`. `retroCompare` sorts by the largest precursor skeleton (smaller first), then stereocentres, then more common starting materials, then main before minor, then total size.
- Tree: `retroTree(smiles, depth, budget)` → `{maxDepth, budgetMs, root}` expands the root. `retroExpand(tree, node)` disconnects a node lazily and gives every candidate `children` (one node per precursor, `depth + 1`). `retroCanExpand` is false at `maxDepth`.
- Routes: `retroRouteSteps(chain)` takes `[{candidate, precursor}]` from the target downwards and returns forward `reactionRouteStep` steps, deepest first, passing each step the precursor SMILES that the next step carries. `buildRouteScheme(steps)` turns them into a canvas fragment. `retroForwardCheck(candidate, smiles)` re-runs the verification (used by the tests).

#### View (`js/retro-view.js`, `index.html`, `css/style.css`, `js/app.js`)
- `#retro-overlay` (`.retro-dialog`) has a breadcrumb trail (`#retro-trail`), a target header with a thumbnail, count and time (`#retro-summary`), the card list (`#retro-list`), and Close / "Open in Reaction lab" / "Send route to canvas".
- Each `.retro-card` shows the transform name and group, a "minor route" badge, the ⇒ arrow with the reagent labels above and below, and the precursor thumbnails (`deps.structureThumbnail`), captions (label, then common name, then `reactionDescribeFragment` name) and "common starting material" badges. Each precursor has a "Disconnect" button while `retroCanExpand` holds. It pushes `{candidate, precursor}` onto `state.chain` and renders the child node. Crumbs jump back up.
- The route is `state.chain` plus the selected card at the current level. "Send route to canvas" calls `deps.sendScheme(buildRouteScheme(retroRouteSteps(route)), steps)`. "Open in Reaction lab" loads the last step's verified compounds and conditions through `deps.openInLab`.
- Disconnection runs in a `setTimeout` behind a "Searching…" line and is cancelled on close through a job counter.
- `js/app.js`:
  - wiring: `openRetro(ids)`, `#retro-button` (next to `#viewer-button`), `KeyT` in `INSIGHT_SHORTCUTS` (Alt+T), "Retrosynthesis…" in the molecule and selection context menus, and an Escape branch after the viewer's;
  - the target is the selected component, otherwise `largestComponent()`, or the atom ids passed from the context menu;
  - `placeSchemeBelow(fragment)` is the placement code that used to be inside the Reaction lab's `sendScheme`, now shared by both;
  - `openInLab` resets `reactionLab.state.compounds`, sets `state.conditions`, calls `addSmiles` per compound (restoring Grignard labels) and switches to the Reactions view.
- `index.html` has the button, the overlay, the Alt+T help row and the two script tags. `css/style.css` adds `.retro-*` rules on the existing tokens only, so both themes follow. The toolbar still fits at 1280, 1366, 1440 and 1920 px with no breakpoint change. The spacer slack is now 44 px at 1280/1366 and 13 px at 1440.

#### Tests
- `test_retro.js` (session scratchpad, bundle from `build_retro.sh`), 371 checks:
  - static checks (no DOM, no comments, every transform maps to a real rule, dropped transforms absent);
  - the 15 target molecules, with a required route each, every candidate re-verified forward with its product SMILES equal to the target, ranking order, and time under 1.5 s;
  - a coverage target for each of the 28 transforms;
  - badges and labels, edge cases (empty, two components, methane, tiny budget);
  - tree laziness, the depth limit, and a two-step route scheme.
- `drive_retro.py` (Playwright, both themes): the toolbar button, 2-methyl-2-butanol cards (Grignard first, badges, labels), expanding a precursor, sending a two-step route to the canvas, Alt+T and "Open in Reaction lab" for ethyl acetate, Escape, the nitrobenzene empty state, and the context-menu entry. There are no page errors. It also writes `feature-research/learning-sharing/screenshots/retro.png`.
- `drive_toolbar.py` now also checks that `#retro-button` is visible, sits next to `#viewer-button` and stays inside the viewport at each width.

Numbers, the per-target table and deviations are in `feature-research/learning-sharing/audit.md`.

## Update, later session (42) — reaction families

### Slice A — nitration, sulfonation, H₃PO₂ deamination and protecting groups

`js/reaction-rules-extra3.js` is a new plain-script file with the prefix `rxz` and no DOM code. It loads after `js/reaction-aromatic.js` and before `js/retro.js`. It extends the shared tag tables in place and pushes five rules, so the engine now has **96 rules**. `js/retro.js` is unchanged; `eas-nitration` is still in `RETRO_DROPPED_TRANSFORMS` until Slice B.

#### Tags and additives
- **`RX_FORMULA_TAGS`**:
  - `HNO3` → `nitricAcid`; `O3S` → `sulfurTrioxide`, for charge-separated input only, because `O=S(=O)=O` fails the valence check;
  - `C15H11ClO2` (Fmoc-Cl) and `C19H15NO5` (Fmoc-OSu) → `fmocReagent`; `C8H7ClO2` (CbzCl) → `cbzReagent`;
  - `C8H9ClO` (PMBCl) → `pmbChloride`; `C16H19ClSi` (TBDPSCl) → `silylChloride`;
  - `C8Cl2N2O2` → `ddq`; `C4H10N2Si` → `tmsDiazomethane`.
- **`RX_FORMULA_GUARDS`**:
  - the Fmoc and Cbz formulas require a chloroformate or an N-hydroxysuccinimidyl carbonate (`rxzChloroformate`); p-anisoyl chloride also has the formula C₈H₇ClO₂ and stays a substrate;
  - `C8H9ClO` requires an ArCH₂Cl;
  - `C16H19ClSi` requires an Si–Cl bond;
  - `O3S` requires S.
- **`RX_ADDITIVE_TAGS`**: `h2so4` also adds `sulfuricAcid`; `so3` → `sulfurTrioxide`; `h3po2` → `hypophosphorous`; `can` → `can`.
- **`REACTION_ADDITIVES`** (`js/reactions.js`):
  - `hno3` (Acid, SMILES `O[N+](=O)[O-]`);
  - `so3` "SO₃ / fuming H₂SO₄" (Acid, no SMILES);
  - `h3po2` (Reagent, no SMILES: the parser loses the P–H count, so H₃PO₂ cannot be drawn);
  - `ddq` (Oxidant, with SMILES), `can` (Oxidant, no SMILES);
  - `tmschn2` (Reagent, with SMILES).
- **`REACTION_NAME_ALIASES`**: fmoc-cl, fmoc chloride, fmoc-osu, cbzcl, cbz-cl, benzyl chloroformate, pmbcl, pmb-cl, 4-methoxybenzyl chloride, tbdpscl, tert-butyldiphenylsilyl chloride, ddq, tmschn2, trimethylsilyldiazomethane.

#### Helpers
- `rxzChloroformate(g, ids)` → `{c, ether, leaving}` for an alkoxycarbonyl with a Cl or O–N leaving group, or null.
- `rxzSulfuric(ctx)`: the `sulfuricAcid` tag or an H₂O₄S species.
- `rxzAmineBase(ctx)`: the piperidine or DBU additive, or a C₉H₁₆N₂ species.
- `rxzAcids(s)`, `rxzTertButylEsters(s)` → `[{c, o, t}]` (carbamates excluded), `rxzCarbamates(s)` → `[{kind: 'Fmoc'|'Cbz', c, n}]`, `rxzPmbEthers(s)` → `[{ch2, o}]`, `rxzSulfonicAcids(s)` → `[{s, c}]`, `rxzIsobutylene(s)`.
- `rxzEasProducts(s, pos, attach)`: builds the major product, and the minor product plus ratio when `pos.minorAtom` is set. `rxzAttachNitro` writes the neutral N(=O)=O; `rxzAttachSulfo` writes S(=O)(=O)OH.
- `rxzAcylate(ctx, hit, reagent)`: merges the chloroformate, drops the leaving group and bonds the carbonyl carbon to the amine N.

#### Rules
| Rule id | Outcome ids | Fires on | Score |
|---|---|---|---|
| `nitration` | `nitration` | `nitricAcid` + H₂SO₄ + an arene. The site comes from `rxaEasPlan(s, {protonate: true})`, so a lone benzene ring keeps the `rxEasPosition` ratios. HNO₃ alone gives a hint. A π-deficient ring gives a hint. | 13; 11 on a deactivated ring |
| `sulfonation` | `sulfonation`, `desulfonation` | `sulfurTrioxide` + an arene → ArSO₃H. ArSO₃H + strong acid + water at ≥ 100 °C → ArH; below 100 °C, a hint. | 13 (11 deactivated); 14 |
| `carbamate-protection` | `fmoc-protection`, `cbz-protection`, `fmoc-deprotection` | Fmoc-Cl/OSu or CbzCl + an amine (base warning when a chloroformate has no base). Fmoc removal needs piperidine/DBU or a secondary-amine substrate. | 15 |
| `pmb-protection` | `pmb-protection`, `pmb-deprotection` | PMBCl + NaH on an alcohol, or + NaH/K₂CO₃/hydroxide on a phenol. DDQ or CAN on a PMB ether gives the alcohol and 4-methoxybenzaldehyde; water warning. | 15 |
| `ester-protection` | `tbu-ester`, `methyl-ester`, `tbu-ester-deprotection` | Acid + isobutylene + strong acid, or acid + Boc₂O + DMAP with no amine present. Acid + TMSCHN₂ (MeOH warning), or acid + MeBr/MeI + a weak base. A tert-butyl ester + strong acid; when a Boc group is also present, both are removed in one outcome with a warning. | 15; 16 with Boc |

The diazonium rule in `js/reaction-rules-extra2.js` has a new `deamination` branch (score 15, ArN₂⁺ → ArH, by-products N₂ and H₃PO₃) when `hypophosphorous` is present. It is checked before the water/phenol branch. `js/reaction-rules-extra.js` adds `C16H19ClSi: 'TBDPS'` to the silyl name map; the existing `silyl-protection`/`silyl-deprotection` do the chemistry. Cbz and PMB removal by H₂/Pd-C, and methyl ester removal by LiOH, use the existing `hydrogenolysis` and `saponification` rules.

Precedence: nitration and sulfonation fire only with `nitricAcid` or `sulfurTrioxide`, so plain H₂SO₄ still gives dehydration and hydration. The named protecting-group outcomes (15–16) beat Williamson (13), acyl substitution (13) and boc-deprotection (15), because the combined tBu/Boc outcome scores 16.

#### Tests
- `test_reaction_rules.js`: rule-table size 96. There are 28 new outcome cases: nitration of toluene, nitrobenzene, anisole, chlorobenzene and naphthalene; sulfonation, desulfonation, deamination; each protecting group on and off; Boc plus tBu ester with TFA; MeI/K₂CO₃; LiOH. There are also checks on the o/p minor product and ratio, the forcing-conditions, phenol and aniline warnings, the HNO₃-only hint, H₂SO₄ precedence, the TBDPS name, and the aliases.
- `test_retro.js` stays at 371/371.
- Screenshot: `feature-research/reaction-families/screenshots/nitration.png`.

### Slice B — retrosynthesis transforms for the new families

`js/retro.js` gains 25 transforms, so `RETRO_TRANSFORMS` now has **53 entries**. There are two new groups, "Couplings" and "Enolates", and a "Protecting groups" group; the Aromatics group grows. The file still has no DOM code. `js/retro-view.js` only changes its coverage text. The card already shows `candidate.group`, so the new groups appear with no view change.

#### New transforms and their forward rules
| Transform id | Group | Forward rule | Precursors and conditions |
|---|---|---|---|
| `eas-nitration` | Aromatics | `nitration` | ArH + HNO₃ (`hno3` additive), H₂SO₄ |
| `eas-sulfonation` | Aromatics | `sulfonation` | ArH + `so3` additive |
| `snar` | Aromatics | `snar` | An activated aryl fluoride or chloride + a nucleophile. N nucleophile: the amine, DMSO, 100 °C. O/S nucleophile: the sodium alkoxide or thiolate (`[O-]R.[Na+]`) as the reagent, with a formula label |
| `sandmeyer` | Aromatics | `diazonium` | ArNH₂ + NaNO₂/HCl, then `cucl` / `cubr` / `cucn` |
| `schiemann` | Aromatics | `diazonium` | ArNH₂ + NaNO₂, `hbf4`, heat |
| `diazonium-iodide` | Aromatics | `diazonium` | ArNH₂ + NaNO₂/HCl, `ki` |
| `diazonium-phenol` | Aromatics | `diazonium` | ArNH₂ + NaNO₂/H₂SO₄, warm water |
| `azo-coupling` | Aromatics | `diazonium` | ArNH₂ + an electron-rich arene (phenol or aniline), NaNO₂/HCl, 0–5 °C |
| `suzuki` | Couplings | `suzuki` | ArBr + Ar′B(OH)₂ in both orientations (aryl–aryl and aryl–vinyl), `pdpph3`, K₂CO₃, N₂ |
| `heck` | Couplings | `heck` | ArI + alkene, `pdoac2`, `et3n`, 100 °C (only ArI is proposed) |
| `sonogashira` | Couplings | `sonogashira` | ArI + terminal alkyne, `pdpph3`, `cui`, `et3n` |
| `buchwald-hartwig` | Couplings | `buchwald-hartwig` | ArBr + an amine with at least two carbon neighbours on N, `pdoac2`, `kotbu`. Skipped on an activated arene, where SNAr is the route |
| `enolate-alkylation` | Enolates | `enolate-alkylation` | Carbonyl + R–I, `lda`, THF, −78 °C |
| `michael` | Enolates | `michael` | Active-methylene donor + α,β-unsaturated acceptor, `naoet`/EtOH (no conditions for a thiol donor) |
| `claisen` | Enolates | `claisen` | Two esters (β-keto ester cut), `naoet`/EtOH |
| `dieckmann` | Enolates | `claisen` | Diester from a cyclic β-keto ester (`ring` flag), `naoet`/EtOH |
| `robinson` | Enolates | `robinson` | Ketone + methyl vinyl ketone, `naoet`/EtOH, 78 °C |
| `mannich` | Enolates | `mannich` | Ketone + formaldehyde + secondary amine (three pieces), HCl, EtOH |
| `boc-install` | Protecting groups | `protection` | Amine + Boc₂O |
| `cbz-install` | Protecting groups | `carbamate-protection` | Amine + CbzCl, `et3n` |
| `fmoc-install` | Protecting groups | `carbamate-protection` | Amine + Fmoc-Cl, K₂CO₃ |
| `silyl-install` | Protecting groups | `protection` | Alcohol + TBSCl / TBDPSCl / TIPSCl, `imidazole`, DMF |
| `benzyl-ether-install` | Protecting groups | `williamson` (`pmb-protection` for PMB) | Alcohol + BnBr, `nah`, THF; or + PMBCl, `nah`, DMF |
| `acetal-install` | Protecting groups | `acetal` | Ketone or aldehyde + ethylene glycol or 1,3-propanediol, `tsoh`, toluene, 110 °C |
| `tbu-ester-install` | Protecting groups | `ester-protection` | Acid + isobutylene, H₂SO₄ |

#### Engine changes
- **`RETRO_REAGENTS`** gains `boc2o`, `cbzcl`, `fmoccl`, `tbscl`, `tbdpscl`, `tipscl`, `bnbr`, `pmbcl`, `isobutylene`, and `ethyleneGlycol` and `propanediol` (role `reactant`).
- **`retroPieces`** now also returns `ids`, a Set of the atom ids in each piece. Clone ids are stable, so a transform can tell which piece holds a given atom (azo coupling uses it to find the amine).
- **New helpers** (all before `RETRO_TRANSFORMS`):
  - `RETRO_DIAZONIUM`: the conditions per leaving group (Cl, Br, CN, F, I, OH);
  - `retroReagentKey(smiles, keys)`: a cached canonical-SMILES lookup in `RETRO_REAGENTS`;
  - `retroFormulaLabel` and `retroTerminal`;
  - `retroArylGroups`, which finds aryl nitro, sulfo, F, Cl, Br, I, OH and CN groups;
  - `retroActivatedArene`, `retroAreneFromGroup` and `retroAnilines`;
  - `retroKey` and `retroArylBonds(t, partner)`;
  - `retroVinylCarbon`, `retroCouplingPieces` and `retroHalidePair`;
  - `retroEwgCarbon`, `retroAcceptorCarbons`, `retroBetaKetoEsters` and `retroEthoxyAcyl`;
  - `retroTertButyl` and `retroCarbamates`, which returns `{amine, chloroformate, boc}`.
- **Ranking penalty.** `RETRO_LIMITS.protectingGroupPenalty` is 2. In `retroDisconnect`, each candidate's `rank` gains `penalty`, which is 2 for the "Protecting groups" group and 0 otherwise, and `adjusted = largest + penalty`. `retroCompare` sorts by `adjusted` first and then by the existing keys. As a result, a protecting-group install ranks below a real disconnection of similar size. For example, Williamson ranks above the benzyl install on benzyl cyclohexyl ether.
- **`RETRO_DROPPED_TRANSFORMS`** no longer lists `eas-nitration`. It lists `hydro-deamination` (H₃PO₂). The forward rule exists, but a retro step ArH ← ArNH₂ would match every aromatic C–H.
- **`RETRO_VIEW_COVERAGE`** (`js/retro-view.js`) lists the aromatic, coupling, enolate and protecting-group transforms. It notes that installs rank lower and that H₃PO₂ reduction is forward only.

#### Tests
- `test_retro.js`: PASS 875, FAIL 0, with 123 candidates re-verified forward.
  - Nitrobenzene now has an `eas-nitration` route, and the original 15 targets keep their required routes.
  - There are 23 new targets, each with its named route, and a coverage target for each of the 25 new transforms.
  - Slice B checks cover:
    - the groups, including the Suzuki card's group;
    - the penalty and the Williamson-above-benzyl order;
    - the SNAr alkoxide;
    - no deamination route on toluene;
    - Buchwald skipped on an activated arene;
    - PMB going through `pmb-protection`;
    - the dropped list.
  - Every target takes 2–221 ms.
- Screenshot: `feature-research/reaction-families/screenshots/retro-suzuki.png`.

## Update, later session (43) — reactions roadmap 2–4

### Slice A — engine accuracy and bench practicality

Two new plain-script files have no DOM code: `js/reagent-library.js` (prefix `rgl`) and `js/reaction-io.js` (prefix `rxio`). Both load right after `js/reactions.js`. The plain `smiles` field of `computeProperties` is unchanged byte for byte. Stereo is only in the new `isomericSmiles`, and every existing comparison still uses the plain string.

#### A1. Stereo-preserving SMILES (`js/properties.js`, `js/reactions.js`, `js/reaction-rules.js`)
- **`propSmiles(ctx, options)`**:
  - With `{isomeric: true}`, it writes `@`/`@@` and `/`/`\` marks.
  - With no options, the output is exactly the old string.
- **`propSmilesStereo(ctx, start, children, openings, closings)`** returns the chirality and bond-mark maps for the canonical DFS tree.
  - **Chirality**: for each centre that `findStereocenters` resolves (4 substituents, at most one implicit H), it lists the neighbours in written order: parent, implicit H, ring closures, ring openings, children. It compares that list with the CIP order from `cipRankSubstituents`. `R` with even parity is `@@`.
  - **E/Z**: for each double bond that `findStereoDoubleBonds` resolves, it puts `/` or `\` only on tree edges, so ring-closure digits carry no marks.
- **`propPermutationParity(from, to)`** returns 0 or 1: the parity of the permutation that maps `from` onto `to`.
- **`computeProperties(...)`** gains **`isomericSmiles`**. It equals `smiles` when there is no stereo.
- **`reactionGraphProperties(graph)`** (`js/reactions.js`):
  - It calls `computeProperties` with every atom id, since `computeProperties` needs an explicit id list.
  - For a disconnected graph (salts, ion pairs), it sorts the per-component `smiles`/`isomericSmiles` and joins them with `.`. Without this, `computeProperties` would describe only the first component.
- **`reactionIsomericSmiles(fragment, fallback)`** returns the stereo SMILES of a fragment, or `fallback` on any error.
- **`rxIsomericSmiles(item)`** (`js/reaction-rules.js`): every product built by `rxProductList` now carries **`isomericSmiles`**. It is computed from the product fragment after the wedges from `rxsRealize` are set. A racemic product shows the one enantiomer that was drawn.
- **Where the stereo string is now used**:
  - the editor's info-panel SMILES block;
  - Copy all SMILES, Copy SMILES for a selection, and the SMILES placed on the clipboard by Ctrl+C;
  - the paste-echo check, which uses the same function as copy so a self-paste is still recognised;
  - route steps (`from`/`to.isomericSmiles`) and their serialisation;
  - the notebook SMILES row (`entry.isomericSmiles`);
  - reaction SMILES and RXN export.

  The share-link SMILES (`copySmilesLink`), `editorSmilesList`, the PubChem query and all dedupe stay plain.

#### A2. Chemoselectivity (`js/reaction-rules.js`)
- **`RX_CHEMOSELECTIVITY`** is a list of `{id, label, tags | acylating, attacks: [group…], advice?}`:

  | id | Required tags | Attacks, in order |
  |---|---|---|
  | `borohydride` | `borohydride` | aldehyde, ketone |
  | `alanate` | `alanate` | aldehyde, ketone, acylChloride, ester, acid, epoxide, amide, nitrile |
  | `hydrogenation` | `H2` + `hydrogenationCatalyst` (has advice) | alkyne, alkene, nitro, benzylEther, cbz |
  | `organometallic` | `grignard` | aldehyde, ketone, acylChloride, ester, epoxide, nitrile |
  | `peracid` | `mcpba` | alkene, ketone |
  | `permanganate` | `permanganate` | aldehyde, alkene, alcohol |
  | `chromium` | `jones` | aldehyde, alcohol |
  | `pcc` | `pcc` | alcohol |
  | `ozone` | `ozone` | alkene, alkyne |
  | `borane` | `borane` | alkene, alkyne, aldehyde, acid, ketone |
  | `fluoride` | `fluoride` | silylEther |
  | `acid` | `strongAcid` | boc, tBuEster, silylEther |
  | `acylation` | `acylating: true` (a consumed acyl chloride or anhydride) | amine, thiol, alcohol |

- **`RX_PROTECTION_SUGGESTIONS`**: group → the protecting-group advice text:

  | Group | Advice |
  |---|---|
  | amine | Boc |
  | alcohol | TBS |
  | aldehyde/ketone | cyclic acetal |
  | acid | t-Bu ester |
  | terminal alkyne | TMS |
  | thiol | trityl |
  | benzyl ether | TBS instead of Bn |

- **`RX_CHEMO_GROUP_LABELS`**: group → display label.
- **`rxChemoGroups(g)`** → `{group: [atomIds…]}`. It is built from `rxAnalyze` (carbonyl kinds, nitriles, epoxides, alkenes, alkynes, amines, alcohols) plus local checks for nitro, thiol, silyl ether and benzyl ether.
  - A carbonyl with a single-bonded ether O is treated as a carbamate or ester and split into `boc` (N–CO–O–tBu), `cbz` (N–CO–O–CH₂Ar) and `tBuEster`.
- **`rxChemoEntry(ctx, outcome)`** returns the first table entry that fits:
  - every tag of the entry must be present;
  - the compound carrying the tag must have been consumed by the outcome;
  - for `acylation`, the outcome must consume an acyl chloride or anhydride and another substrate.
- **`rxChemoselectivity(ctx, outcome)`** is called in `predictReaction` right after `rxStoichiometry`.
  - It compares the attacked groups on the consumed substrates (not counting the acylating agent) with the groups on `products[0]`.
  - `changed` = attacked groups whose count dropped. `competing` = attacked groups still present.
  - It sets `outcome.chemoselectivity = {reagent, label, changed, competing: [{group, count, atoms}], suggestion}` and pushes a warning starting `Chemoselectivity: `. This happens when a competing group remains, or when two or more groups changed.
  - Otherwise `outcome.chemoselectivity` is `null`.
- **`rxStoichiometry`** now reads the "have" amount through `reactionStoichiometry`, so mg, mL and mmol amounts count; before, it used `parseFloat` of the text. Plain equivalents give the same numbers as before.

#### A3. Reagent library (`js/reagent-library.js`, `js/reactions.js`)
- **`REAGENT_LIBRARY`** (106 entries) has the fields `{id, aliases?, name, smiles, mw, density (g/mL) | null, form: 'liquid'|'solid'|'gas'|'solution', conc (M) | null, equiv (typical), hazard: [GHS codes]}`.
  - It covers every `REACTION_SOLVENTS` id, every `REACTION_ADDITIVES` entry with a SMILES, and every `RETRO_REAGENTS` key (by id or alias).
  - It also has the common bench reagents: LiAlH₄, n-BuLi 2.5 M, DIBAL, TBAF, TMSCl, MeI, NBS, AcCl, Ac₂O, PPh₃ and others.
- **`REAGENT_HAZARDS`**: GHS01–GHS09 → short text.
- **`rglCanonical(smiles)`**: the canonical plain SMILES via `reactionGraphProperties`, so salts match whatever order their ions are written in.
- **Lookup helpers**:
  - `rglIndex()` builds the lazy canonical map `rglCanonicalCache`;
  - `rglLookup(key)` matches the id or alias first, then the canonical SMILES, and memoises in `rglLookupCache`;
  - `rglHazardText(code)` returns the text for a GHS code.
- **`reactionParseAmount`** also accepts `mL` → `{kind: 'mL'}` and `µL`/`μL`/`uL` (converted to mL).
- **`reactionParseConcentration(text)`** reads `M`, `mol/L` and `mM` into a molarity, or returns null.
- **`reactionReagentInfo(compound)`** → `rglLookup(compound.smiles)`, when the library is loaded.
- **`reactionScaleMmol(compounds, fallback)`**: the mmol of the first reactant given as an absolute amount; otherwise `fallback`.
- **`reactionSolventVolume(conditions, scaleMmol)`** = scale ÷ molarity, in mL.
- **`reactionSolventUsage(compounds, conditions, scaleMmol)`** → `[{name, compound|null, mL, mg, hazard}]`. It splits the volume evenly across solvent-role compounds and the chosen condition solvents.
- **`reactionStoichiometry(compounds, scaleMmol, conditions?)`**: each row now also carries `mL`, `compound` and `hazard`.
  - An mL amount converts through `conc` (solutions) or density × MW.
  - mL is derived back from mmol the same way.
  - The library MW is used when the compound has no mass.
- **`reactionMaterialRows(compounds, conditions, scaleMmol)`**: the stoichiometry rows plus one `role: 'solvent'` row per condition solvent.

#### A4. Green metrics (`js/reactions.js`)
- **`reactionProductMass(smiles)`** returns the average mass, or null.
- **`reactionGreenMetrics(outcome, stoichRows, yieldPct, product?)`** → `{atomEconomy, eFactor, pmi, inputMg, solventMg, productMg, productMmol, yield}`.
  - **Atom economy** = MW(product) × count ÷ Σ(need × MW) over `outcome.stoichiometry.rows`, or `consumes` when there are no rows.
  - **Product amount** comes from the first consumed row's mmol × conversion × yield.
  - **E-factor** = (non-solvent input mass − product) ÷ product.
  - **PMI** = (inputs + solvent mass) ÷ product.
- **`reactionRouteStep`** adds `metrics` (with `carriedMg`, the mass of the carried material) and `isomericSmiles` on `from`/`to`.
- **`reactionRouteMetrics(steps)`** → `{overallYield, pmi, eFactor, steps}`.
  - It walks backward and scales each earlier step by how much of its product the next step carried. Only fresh material counts, and the final product mass is the denominator.
  - `pmi`/`eFactor` are null when a step has no metrics.
- **Route output**: `buildRouteScheme` adds a "Route PMI x, E-factor y" annotation under the overall-yield line.
- **Serialisation**: `reactionRouteSerialize` writes `isomericSmiles` and `metrics`. `reactionRouteRestore` reads them back through the new helpers:
  - `reactionRestoreEnd(end, text)` prefers a valid `isomericSmiles` for the fragment;
  - `reactionRestoreMetrics(raw)` keeps only finite numeric fields.

#### A5. Reaction file I/O (`js/reaction-io.js`)
- **`RXIO_ROLE_ORDER`** = reagent, catalyst, solvent (the order of the agents field).
- **`rxioCompoundSmiles(compound)`**: the isomeric SMILES of a lab compound or product.
- **`rxioToReactionSmiles(compounds, products)`** → `reactants>agents>products`.
- **`rxioFragmentCharge(fragment)`** and **`rxioSplitSide(text)`**: a side is split on `.`, and charged pieces are merged until the running charge is 0, so `[Na+].[BH4-]` stays one compound.
- **`rxioParseReactionSmiles(text)`** → `{compounds: [{smiles, role}], products: [{smiles}]}`. Agents get their role from `reactionGuessRole`, with `reactant` mapped to `reagent`.
- **`rxioMolBlock(item, title)`** and **`rxioToRxn(compounds, products)`** write MDL `$RXN` V2000 through `graphToMolfile`. The counts line lists reactants, products and, when present, agents; the blocks follow in that order.
- **`rxioParseRxn(text)`** reads V2000 with `parseMolRecord`/`molRecordToGraph`. It rejects V3000. Each record becomes `{smiles (isomeric), title}`, and agents are assigned roles as above.
- **`rxioLooksLikeReaction(text)`** is true for `$RXN` text or a single `a>b>c` token.

#### Reaction lab UI (`js/reaction-lab.js`, `index.html`, `css/style.css`)
- **Stoichiometry sheet** (`renderSheet`) uses `sheetRows()` = `reactionMaterialRows(state.compounds, state.conditions, reactionScaleMmol(state.compounds, scale))`.
  - Columns: Compound, MW, equiv, mmol, g, mL, Hazards.
  - Hazard chips are `span.rx-hazard` with `data-code` and a `title` from `rglHazardText`.
  - New helpers: `gramText`, `volumeText`, `hazardCell`.
  - `renderSummary` now re-renders the sheet after `predict()`, so a change of conditions (concentration or solvent) updates it.
- **Green metrics**: `renderGreen(rows)` fills `#rx-green` (`.rx-green-item`, `.rx-green-key`, `.rx-green-note`) from `reactionGreenMetrics(chosenOutcome(), rows, 100)`.
- **Chemoselectivity block**: `renderPrediction` shows a `.rx-chemo` block (`.rx-chemo-title`, `.rx-chemo-text`, `.rx-chemo-sites`, `.rx-chemo-suggestion`). The duplicate `Chemoselectivity:` line is removed from the warnings list.
- **Amount field**: the compound card's field title and label now name mg/mL/µL/mmol.
- **Import and export**: `.rx-io-row` holds `#rx-import` (opens the hidden `#rx-import-file`, which takes .rxn, .smi and .txt), `#rx-copy-rsmiles` and `#rx-download-rxn`. The new functions are:
  - `importReaction(text)` replaces the compounds and conditions and reports how many products the file lists. It is exported on the lab API.
  - `currentProducts()` returns the chosen outcome's products.
  - `copyReactionSmiles()`: if the clipboard is unavailable, it shows the string instead.
  - `downloadRxn()`.
- **Pasting a reaction**: `addFromInput` routes a reaction SMILES typed or pasted into `#rx-input` to `importReaction`.
- **Route header**: the route total now shows the route PMI.
- **Opening a file** (`js/app.js`): the editor's file open accepts `.rxn`. `$RXN` text switches to the Reaction lab and calls `reactionLab.importReaction`.

#### Tests
- **`regress/test_reaction_accuracy.js`** (new, 80 checks):
  - isomeric SMILES round trips (R/S-2-butanol, E/Z-2-butene, L-alanine, a ring stereocentre), with the plain SMILES unchanged, and SN2 inversion;
  - chemoselectivity (keto ester with NaBH₄ and LiAlH₄, 4-aminobutanol with AcCl, H₂/Pd on a benzyl ether alkene, Boc detection);
  - the reagent library (1.2 mL Et₃N = 8.61 mmol, n-BuLi 2.5 M, MW consistency, coverage, salt lookup);
  - green metrics (Fischer AE 83.0%, E-factor 0.204, PMI with 2 mL toluene; Wittig AE 27.2%; 2-step route metrics and their serialisation);
  - reaction SMILES and RXN round trips.
- **Test runs**: runall has 38 files, all passing, and `test_retro.js` passes 875/875.
- **Screenshot**: `feature-research/reactions-s234/screenshots/lab-stoich-metrics.png`.

### Session 43 Slice B — retrosynthesis search, stock, protecting groups and stereo

Two new plain-script files have no DOM code:
- `js/retro-stock.js` (prefix `stock`) loads just before `js/retro.js`;
- `js/retro-search.js` (prefix `rsearch`) loads just after it.

`js/retro.js` changed in its engine only. The modal UI is untouched apart from the stock badge in `js/retro-view.js`. The plain `smiles` is unchanged everywhere; stereo lives in `isomericSmiles`.

#### B0. Engine changes (`js/retro.js`)
- **`RETRO_LIMITS`** gains `fgiPenalty: 1` and `maxProtectTries: 3`. **`RETRO_REAGENTS`** gains `tfa` and `tbaf`, used by the Boc, tBu ester and TBS deprotections.
- **Graph and edit helpers**:
  - `retroClone(graph, ids, out)` fills `out.map` (source id → clone id) and copies `bond.stereo` (wedges).
  - `retroProps(g, ids)` → `{smiles, isomericSmiles}`. `retroCanonical` now uses it.
  - `retroHeavyKey(g, ids)` → the sorted heavy-element string, used for the fgi test.
  - `retroCut(g, a, b)` pushes `[a, b]` onto `g.retroCuts`.
  - **`retroBreak(g, a, b)`** (new) records a bond and removes it without the single-bond check. Diels–Alder, Dieckmann, Robinson, acetal and azo coupling use it. Azo coupling breaks the N–aryl bonds before it removes the nitrogen.
  - `retroEdit(t, fn)` clones with a map and starts `g.retroCuts = []`.
    - The pieces list gets **`pieces.cuts`**, the cut bonds in `t` ids.
    - When `t.edits` is set (during `retroDisconnectSteps`), it pushes an edit record `{transform, pieces, cuts, graph, map, back, changed: null}`.
  - `retroChanged(t, record)` lazily builds the set of `t` atom ids the edit touched: atoms removed or with a changed element or charge, plus the ends of bonds that were removed, changed order or were added.
  - `retroSpecRecord(t, spec, from)` picks the edit record whose piece SMILES match most of the spec's precursors. It searches from index `from`, the transform's first record.
  - `retroEditAtoms(t, record)` → `{bonds, changedAtoms}` in source-graph ids (through `t.map`).
- **`retroTarget(graph, ids)`** adds:
  - `map` (clone id → source id);
  - `isomericSmiles`;
  - `stereocentres: [{atomId, type}]` (source ids);
  - `stereo` (true when the isomeric SMILES contains `@`);
  - `heavy` (the heavy key).
- **Candidates** gain:
  - `bonds: [[a, b]…]`, the bonds cut in the source graph (empty for pure FGIs);
  - `changedAtoms: [id…]`;
  - `stereo`: `null | 'retained' | 'set' | 'racemic'`;
  - `rank.fgi`: 1 when there is a single precursor with the same heavy-atom multiset as the target;
  - `rank.stereo`: 1 for racemic, otherwise 0.

  `rank.adjusted = largest + penalty + fgi × fgiPenalty`.
- **`retroCompare`** orders by `adjusted`, then `stereo` (retained/set before racemic), then the old keys.
- **Hydrogenation cap**:
  - `retroConjugating(t, id, partner)` is true when the carbon has an aromatic neighbour or a C=O/C≡N carbon neighbour.
  - Hydrogenation proposes only bonds with a conjugating end. When there are none, it proposes a single bond, ring bonds first.
- **`retroVerify(spec, targetSmiles, sink)`** stores the raw prediction in `sink.result`. `retroTryVerify` passes `sink` through.
- **`retroPrecursorInfo(item)`** adds `isomericSmiles`, `heavy` and `stock` (the `stockTier` result, or null).
- **`function* retroDisconnectSteps(graph, ids, options)`** is the generator form of `retroDisconnect`.
  - It yields `{phase: 'match', transform}` before each transform's `match`, then `{phase: 'spec', spec}` before each forward verification.
  - `next(false)` stops it, and the result is marked `truncated`.
  - The return value is the old result object plus `isomericSmiles` and `stereocentres`.
  - When a spec fails to verify, or verifies with a chemoselectivity warning, it calls `retroProtectPlan` (unless `options.protect === false`). PG candidates are deduplicated by key.
- **`retroDisconnect(graph, ids, options)`** is now a synchronous driver over the generator. It passes `false` at the first spec phase after `budgetMs`. Its API and output are unchanged.
- **`retroRouteSteps(chain)`** expands a candidate with `pgSteps` into its three steps, carrying each product forward.
- **`retroForwardCheck(candidate, targetSmiles)`** re-verifies every PG step, the last one against the target. As for any other candidate, the target must be the canonical SMILES (`t.smiles`).

#### B1. Stock (`js/retro-stock.js`)
- **`STOCK_LIMITS`** = `{maxUser: 5000, storageKey: 'stock', defaultUserTier: 1, nameTier: 3, maxTier: 3}`.
- **`STOCK_BUILTIN`** has 386 entries `{smiles, tier, name}`, with canonical plain SMILES.
  - Tier 1: commodity chemicals, solvents and every `RETRO_REAGENTS` compound.
  - Tier 2: common building blocks.
  - Tier 3: less common compounds.
- **`stockState`** = `{user: Map, builtin, names, canonical, load, save}`. The builtin, name and canonical maps are built lazily.
- **Canonical form and lookup**:
  - `stockCanonical(smiles)`: the canonical plain SMILES via `retroCanonicalSmiles`. Multi-component input is sorted and joined with `.`. The result is memoised.
  - `stockBuiltinMap()` and `stockNameMap()`; the name map holds every `NAME_SMILES` value, canonicalised.
  - `stockLookup(smiles)` checks the user list, then builtin, then names (at tier 3).
  - **`stockTier(smiles)`** → `{tier, source: 'user'|'builtin'|'names', name} | null`. It tries a direct lookup, then a canonical one.
  - `stockInStock(smiles, maxTier)`.
- **Import**:
  - `stockParseTier(value)` accepts 1–3; anything else gives `defaultUserTier`.
  - `stockParseLine(line)` reads `smiles[,name[,tier]]` separated by commas, tabs or whitespace. It skips blank lines, `#` comments and a `smiles` header.
  - **`stockImport(text)`** → `{added, updated, skipped: [{line, text, reason}], total}`. It canonicalises each SMILES, then persists.
- **Editing**: `stockAdd(smiles, name, tier)`, `stockRemove(smiles)`, `stockClear()` and `stockUserList()`. The editing calls persist.
- **Storage**:
  - **`stockSerialize()`** → `JSON {version: 1, entries: [[smiles, name, tier]…]}`.
  - **`stockRestore(text)`** replaces the user list and returns its size. It tolerates bad JSON.
  - **`stockSetStorage(load, save)`** injects storage and restores from `load('stock')`.
  - `stockPersist()` calls `save('stock', stockSerialize())`.
  - `stockUseLocalStorage()` wires `localStorage` inside a try. It runs at load time only when `window` exists.
- **Badge**: `js/retro-view.js` shows **"stock · tier N"** for a precursor with `precursor.stock`. Otherwise it keeps "common starting material".

#### B2. Route search (`js/retro-search.js`)
- **`RSEARCH_LIMITS`** = `{maxDepth: 5, budgetMs: 20000, maxBranch: 6, maxRoutes: 20, stockMaxTier: 2, nodeBudgetMs: 1500, maxNodes: 400, afterSolved: 12, cacheSize: 400, sliceMs: 40}`.
- **Cache**: `rsearchCache` maps SMILES → disconnection result and persists across jobs.
  - `rsearchCacheSet` evicts first-in, first-out at `cacheSize`.
  - `rsearchClearCache()` empties it.
- **`rsearchStock(smiles, maxTier)`** calls `stockTier`. A Grignard `X[Mg]R` counts as in stock when its halide is in stock (source `'grignard'`).
- **The AND–OR graph**:
  - **Molecule nodes** are shared by SMILES: `{smiles, heavy, skeleton, depth, path, stock, ands, parents, state, solved, dead, order}`. `rsearchMolecule` creates them; the root is never a stock leaf.
  - **AND nodes** are `{candidate, children, solved, dead}`. `rsearchAttach` keeps at most `maxBranch` candidates. It drops any candidate whose precursor is the node itself or an ancestor.
  - `rsearchUpdate` recomputes `solved` and `dead` to a fixpoint:
    - solved: in stock, or has a solved AND;
    - dead: not in stock and either fully expanded, too deep or left with only dead ANDs.
- **Best-first expansion**:
  - `rsearchNext` picks the open, non-dead molecule on a live branch (`rsearchRelevant`) with the lowest `heavy + depth`. Ties go to `order`.
  - `rsearchBegin` uses the cache (and counts `cacheHits`) or starts a `retroDisconnectSteps` iterator.
  - `rsearchAdvance` steps that iterator within the slice, stops it at `nodeBudgetMs`, and caches the result.
- **The job**: **`rsearchCreate(targetSmiles, options)`** → `job` with `step(sliceMs) → progress`, `cancel() → progress`, `progress()`, `routes` and internal state.
  - `progress` = `{done, progress (0–1), status: 'running'|'done'|'budget'|'cancelled', expanded, open, routes, solved, elapsedMs, cacheHits}`.
  - The budget counts only working time inside `step` calls.
  - The search stops when any of these happens:
    - `afterSolved` expansions have run after the root was first solved;
    - `maxNodes` nodes have been expanded;
    - nothing is left open.
  - `rsearchRun(targetSmiles, options)` is a synchronous loop, for tests and Node.
- **Routes** are trees `{target, candidate, children, stock, skeleton}`. A stock leaf has `candidate: null` and `children: []`.
  - `rsearchEnumerate` forms the combinations of solved ANDs, bounded by `4 × maxRoutes`.
  - Routes are deduplicated by `rsearchRouteKey`, the sorted set of `target|candidate.key`.
  - `rsearchFinish` scores each route (`route.metrics`), sorts by score and keeps `maxRoutes`.

#### B3. Scoring (`js/retro-search.js`)
- **`RSEARCH_WEIGHTS`** = `{steps: 10, longest: 5, yieldLoss: 0.3, stock: 4, pg: 6, convergent: -3, simplification: -1}`.
- **`rsearchStepYield(outcome, minor)`** follows `reactionRouteStep`: selectivity (from `ratio`) × conversion, as a percentage.
- **`rsearchCandidateSteps(candidate)`**:
  - a `pgSteps` candidate counts as three steps, and its protect and deprotect steps count as PG steps;
  - a plain candidate in the "Protecting groups" group counts as one PG step.
- **`rsearchScore(route)`** → `{steps, longest, convergent, yield, complexity: [], stock, pg, score}`:
  - `longest` is the longest chain of steps;
  - `convergent` is true when some step has two or more non-leaf children;
  - `yield` is the product of the step yields, as a percentage rounded to 0.1;
  - `complexity` is, per step, the product skeleton minus the largest precursor skeleton;
  - `stock` is the worst leaf tier;
  - `score` is rounded to 0.1, and lower is better: `10·steps + 5·longest + 0.3·(100 − yield) + 4·max(0, stock − 1) + 6·pg − 3·[convergent] − mean(complexity)`.
- **`rsearchSort(routes, key)`** returns a new array.
  - Ascending keys: `score` (the default), `steps`, `longest`, `pg`, `stock`.
  - Descending keys: `yield`, `convergent`.
  - Ties are broken by score.
- **`rsearchFilter(routes, {maxSteps, minYield, maxTier, noPG})`**.

#### B4. Protecting-group planning (`js/retro.js`)
- **Detectors** return `[{…, atoms}]` and back the install transforms:
  - `retroSilylEthers(t)` → `{si, o, atoms, alcohol, silyl, key}` (TBS, TBDPS, TIPS);
  - `retroBenzylEthers(t)` → `{o, ch2, atoms, alcohol, benzyl, key, conditions}` (Bn, PMB);
  - `retroAcetals(t)` → `{c, oxygens, atoms, carbonyl, diol, key}` (ethylene glycol and 1,3-propanediol acetals).
- **`RETRO_PROTECTION`** is keyed by chemoselectivity group: `amine`, `alcohol`, `ketone`, `aldehyde`, `acid`. Each entry is `{label, protect, protectConditions, deprotect, deprotectConditions, apply(g, atoms)}`:

  | Group | Label | Protect | Deprotect |
  |---|---|---|---|
  | amine | Boc | Boc₂O | TFA |
  | alcohol | TBS | TBSCl, imidazole, DMF | TBAF, THF |
  | ketone, aldehyde | ethylene acetal | ethylene glycol, TsOH, toluene, 110 °C | H₂O, HCl |
  | acid | tert-butyl ester | isobutylene, H₂SO₄ | TFA |

  The `apply` functions are `retroProtectAmine`, `retroProtectAlcohol`, `retroProtectCarbonyl` and `retroProtectAcid`, all built on `retroTertButylOn`.
- **Planning helpers**:
  - `retroGuardedAtoms(t)` returns the atoms already in a silyl ether, benzyl ether or acetal. It is cached on `t.guarded`.
  - `retroProtectOptions(t, spec, chemo)` takes the groups named in `chemo.changed` and `chemo.competing`. It keeps the instances from `rxChemoGroups(t.graph)` whose atoms the edit did not change and that are not guarded, up to `maxProtectTries`.
  - `retroProtectTry(t, spec, option)`:
    1. protects the group on the matching precursor piece and on the target;
    2. forward-verifies protect → step → deprotect;
    3. returns `{option, pg, precursor, protectedPrecursor, protectedTarget, pgSteps}`.
- **`retroProtectPlan(spec, target)`** reads the outcome and its chemoselectivity from `spec.attempt`. It returns null for specs from the "Protecting groups" group, or when no option verifies.
- **`retroProtectCandidate(t, spec, plan)`** builds the candidate:
  - `transform` is the original transform id;
  - `group` is "Protecting groups";
  - `name` is "<transform> with Boc-protected amine", and so on;
  - `key` is `pg:<kind>:<atoms>:<spec key>`;
  - `pgSteps: [{role: 'protect'|'step'|'deprotect', precursors, reagents, target, compounds, conditions, outcome, product, minor}]`;
  - `protection: {group, label, atoms (source ids), precursor, protectedPrecursor, protectedTarget}`;
  - `product` is the deprotection product;
  - the rank carries the PG penalty.

  Only one group is protected per step.

#### B5. Stereo-aware ranking (`js/retro.js`)
- **`retroMirror(smiles)`** swaps `@` and `@@`.
- **`retroPieceIsomeric(t, record, smiles)`** returns the isomeric SMILES of the matching edit piece.
  - It drops wedges on atoms that the edit changed.
  - It drops `/` and `\` from pieces that contain changed atoms.
  - If no piece matches, it returns `smiles`.
- **`retroStereoClass(t, spec, verified)`** → `{stereo, precursors}`:
  - When the target has no `@`, `stereo` is null.
  - **With a chiral precursor**, it verifies the isomeric precursors, then their mirror image:
    - an exact isomeric match of the target gives `retained`, and the precursors that matched are kept;
    - a racemic or diastereomer product gives `racemic`;
    - anything else gives `mismatch`.
  - **Without a chiral precursor**, it gives `set` when the verified product's isomeric SMILES equals the target's and its kind is not racemic. Otherwise it gives `racemic`.
- **`retroCandidate`** returns null for `mismatch`, so the candidate is dropped. It stores the classified precursors, which keep `isomericSmiles`, and passes `stereo` to `retroRank`.

#### Wiring
- `index.html` loads `<script src="js/retro-stock.js">` before `js/retro.js` and `<script src="js/retro-search.js">` after it.
- There is no new UI. The search, route list, canvas Disconnect mode and stock editor are left to Slice C.

#### Tests
- `test_retro_search.js` is new and has 141 checks:
  - **B0**: cut records, generator = driver, fgi and the hydrogenation cap;
  - **B1**: the stock builtin, import, tiers, serialize/restore and storage;
  - **B2**: search on benzocaine, paracetamol, 2-methylcyclohexanone and 4-methylbiphenyl, plus cancel and slicing;
  - **B3**: hand-checked scores (45.4 and 33.3), sort and filter;
  - **B4**: the PG detectors, and plans for amine/Boc, ketone/acetal and aldehyde/acetal;
  - **B5**: the stereo classes, including a crafted mismatch.
- `test_retro.js` passes 1204/1204. It has a new "session 43 slice B engine" section, and the rank-formula check now includes fgi.
- runall: 38 files, all passing. `test_reaction_accuracy.js`: 80/80.
