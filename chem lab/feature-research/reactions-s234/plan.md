# Reactions roadmap, Sections 2–4 (plan)

Scope: all 15 items of Sections 2, 3 and 4 in `feature-research/reactions-roadmap.md`. Section 1 is done (session 42, uncommitted).

This work is three slices, run **one after the other**. B depends on A, and C depends on A and B. They also share files: `reaction-lab.js` and `index.html` are edited in both A and C.

## Conventions (binding, same as session 42)
- Plain globals, no modules. Logic files have no DOM code and run in Node.
- **No code comments** in new or edited lines.
- **No git commands of any kind.**
- Chemistry-tool scope only: no teaching, quiz or "learn" features.
- In the same pass, update:
  - `CODE_REFERENCE.md`: a new section "Update, later session (43) — reactions roadmap 2–4", one sub-section per slice, and the load-order line at the top, which is stale (it doesn't list extra3, retro or retro-view);
  - `complexities.md`: rows for the new files, notes for the edited ones.
- Graph-edit and tagging conventions are as in `feature-research/reaction-families/plan.md`.
- Harness: `S=/tmp/claude-1000/-home-vanilla-Downloads-projects-chem-lab/e56d4730-7148-4eaa-be8a-05e91aa1103e/scratchpad`. Every new js file goes into `regress/rebuild2.sh` and `build_retro.sh` in load order. Test runs:
  - `node test_retro.js`;
  - `cd regress && bash runall.sh` (37 files);
  - Playwright through `/tmp/claude-1000/-home-vanilla-Downloads-chem-lab/4e3c5c08-ce91-40e0-8183-6481a8aa05f0/scratchpad/pwenv/bin/python`.

  Baseline: test_retro PASS 875 / FAIL 0, and runall 37/37.

---

## Slice A — engine accuracy and bench practicality (roadmap 2.1–2.5)

### A1. Stereo-preserving SMILES (2.2)
- **`js/properties.js`:** `propSmiles(ctx, {isomeric})`.
  - With `isomeric`, it writes `@`/`@@` for stereocentres that `findStereocenters` resolves. Parity is computed against the order the canonical DFS writes the neighbours (and the implicit H).
  - It writes `/` and `\` for the double bonds that `findStereoDoubleBonds` resolves.
  - `computeProperties` gains `isomericSmiles`. The plain `smiles` field stays **unchanged**. Retro reagent keys, product dedupe and the solvent `===` lookups all depend on the plain string, and the scout rated changing it the highest risk.
- **Stereo carried through reactions:** products are built with `stereoSpecs` and wedges (`rxsRealize`). Product objects gain `isomericSmiles`, computed after the wedges are set.
- **Where the stereo string replaces the plain one:**
  - SMILES copy/export in the editor;
  - reaction SMILES export (A5);
  - route serialisation (`reactionRouteSerialize`);
  - the notebook "SMILES" row;
  - the new stock and route code in B.

  Comparisons stay on the plain `smiles`.
- **Round trip:** `smilesToFragment(isomericSmiles)` must give back the same R/S and E/Z (test).

### A2. Chemoselectivity warnings (2.1)
- **New `RX_CHEMOSELECTIVITY` table** in `js/reaction-rules.js`, placed after `rxStoichiometry`.
  - It maps reagent tags to the groups each reagent attacks, and in what order. Examples: NaBH₄ → aldehyde, ketone; LiAlH₄ → aldehyde, ketone, ester, acid, amide, nitrile, epoxide; H₂/Pd → alkene, alkyne, nitro, benzyl ether, Cbz; RMgX/RLi → aldehyde, ketone, ester, plus acidic H (OH, NH, CO₂H, terminal alkyne); acylating agents → amine, alcohol, thiol; mCPBA → alkene (plus amine N-oxide); PCC/Jones → alcohols; TFA → Boc, tBu ester, trityl; TBAF → silyl ethers; oxidants → aldehydes.
  - It uses the existing FG detection (`rxAnalyze` info).
- **`rxChemoselectivity(ctx, outcome)`**, called in `predictReaction` after stoichiometry:
  - it counts the reactive sites in the substrate and the sites the product actually changed;
  - if other sites are left untouched, it attaches `outcome.chemoselectivity = {competing: [{group, count, atoms}], suggestion}` and a warning;
  - the suggestion names a protecting group from `RX_PROTECTION_SUGGESTIONS` (amine → Boc, alcohol → TBS, carbonyl → cyclic acetal, acid → t-Bu ester, terminal alkyne → TMS);
  - where a rule can express it, it adds an alternative outcome for the competing product with `minor: true` semantics.
- **Reaction lab:** a `.rx-chemo` block lists the competing sites and the suggestion.

### A3. Reagent library (2.3)
- **New file `js/reagent-library.js`** (prefix `rgl`, DOM-free). It loads after `js/reactions.js`.
  - `REAGENT_LIBRARY`: about 80 common reagents and solvents. Each entry is `{id, name, smiles | formula, mw, density (g/mL) | null, form: 'solid'|'liquid'|'gas'|'solution', conc (M, for solutions such as n-BuLi 2.5 M in hexanes), equiv (typical), hazard: [GHS pictogram codes]}`.
  - It covers every `REACTION_SOLVENTS` entry, every `REACTION_ADDITIVES` entry that has a structure, and every `RETRO_REAGENTS` entry.
  - `rglLookup(smiles | id)` matches on canonical SMILES.
- **`reactionParseAmount`** accepts `mL` and `µL`. `reactionStoichiometry` converts through density or molarity, and returns `{mmol, mg, mL, equiv}` per row.
- **Reaction lab, compound cards:** the amount field accepts "250 mg", "1.2 mL", "5 mmol" or "1.1 equiv". The stoichiometry table gains mmol / g / mL columns and hazard chips, and is scaled from the limiting reactant's amount (`scaleMmol`, default 1 mmol). This finally connects the unused `reactionStoichiometry` layer.

### A4. Green metrics (2.4)
- **`reactionGreenMetrics(outcome, stoichRows, yieldPct)`** in `js/reactions.js`:
  - atom economy = MW(main product) / Σ MW(consumed reactants × coefficient);
  - E-factor = (Σ input mass − product mass) / product mass;
  - PMI = Σ input mass (including solvent: its mL from the concentration setting × density) / product mass.
- **`reactionRouteMetrics(steps)`** aggregates over a route: overall yield, cumulative PMI and E-factor. Step objects gain `metrics`.
- Shown in the lab under the stoichiometry table and in the route footer of `buildRouteScheme`.

### A5. Reaction file I/O (2.5)
- **New file `js/reaction-io.js`** (prefix `rxio`, DOM-free). It loads after `js/molfile.js` and `js/reactions.js`.
  - `rxioToReactionSmiles(compounds, products)` writes `A.B>reagents.catalysts.solvents>P`, using isomeric SMILES.
  - `rxioParseReactionSmiles(text)` returns `{compounds (with roles), products}`.
  - `rxioToRxn(compounds, products)` writes the MDL `$RXN` V2000 format using `graphToMolfile`.
  - `rxioParseRxn(text)` reads it back with `parseMolRecord` / `molRecordToGraph`.
- **Reaction lab:** "Import reaction" (paste or open a `.rxn`/`.smi` file) and "Export" (reaction SMILES copy, `.rxn` download). The editor's file open also accepts `.rxn` and routes it to the lab.

### A tests
- A new `regress/test_reaction_accuracy.js` covers:
  - **isomeric SMILES:** (R)- and (S)-2-butanol, (E)- and (Z)-2-butene, L-alanine and a ring stereocentre, each round-tripped; the plain `smiles` is unchanged for all of them;
  - **chemoselectivity:** 4-oxo-methyl-ester + NaBH₄ (no warning, ketone only); the same substrate + LiAlH₄ (warning, suggestion); 4-aminobutanol + AcCl (amine vs alcohol, suggests Boc); H₂/Pd on a benzyl ether alkene;
  - **reagent library:** "1.2 mL" of Et₃N gives the right mmol; n-BuLi 2.5 M;
  - **green metrics:** hand-computed values for Fischer esterification and a Wittig reaction (low atom economy);
  - **reaction SMILES and RXN:** round trip.
- Add the file to runall (38 files). All existing tests stay green.

---

## Slice B — retrosynthesis search (roadmap 3.1–3.5)

### B0. Engine prerequisites in `js/retro.js`
- **Record the cut bonds:** `retroCut` pushes `[a, b]` onto `g.retroCuts`. `retroEdit` copies them onto the returned piece list, and `retroDisconnect` carries `candidate.bonds` (atom-id pairs in the target) and `candidate.changedAtoms`. Slice C needs these for bond-click.
- **Keep the atom ids:** `retroTarget` keeps a `map` from clone ids back to the source graph ids.
- **Generator:** `retroDisconnectSteps(graph, ids, options)` is a generator over the two loops (matching, then verifying), yielding every transform and every spec. `retroDisconnect` becomes a synchronous driver over it, so its API and behaviour are unchanged.
- **Stop the hydrogenation flood:** a new `rank.fgi` flag is set for steps whose largest precursor has the target's skeleton count and that only add unsaturation (the hydrogenation transforms, and oxidation-level-only swaps). It carries `RETRO_LIMITS.fgiPenalty = 1`. The hydrogenation transform also proposes an alkene only where the target already has an adjacent FG, an aryl group, or a ring bond (a conjugated or strategically useful alkene). Otherwise it caps at 1.

### B1. Stock list manager (3.2)
- **New file `js/retro-stock.js`** (prefix `stock`, DOM-free apart from none; persistence goes through injected load/save functions):
  - `STOCK_BUILTIN` is about 300 curated purchasable building blocks, stored as canonical SMILES with a tier: `1` = bulk commodity (solvents, simple acids and alcohols, benzene/toluene), `2` = common catalogue, `3` = specialist. The retro reagents are included.
  - `NAME_SMILES` compounds count as tier 3 when they are not in the curated list.
  - User list: `stockImport(text)` parses one SMILES per line or CSV (`smiles,name,tier`). `stockTier(smiles)` returns `{tier, source, name} | null`. `stockSerialize`/`stockRestore` store the user list under the localStorage key `stock`.
- **Retro:** `retroPrecursorInfo` gains `stock` (tier info). The "common starting material" badge becomes a "stock · tier N" badge.

### B2. Automatic multi-step search (3.1)
- **New file `js/retro-search.js`** (prefix `rsearch`, DOM-free). It loads after `js/retro.js` and `js/retro-stock.js`.
  - `rsearchCreate(targetSmiles, {maxDepth: 5, budgetMs: 20000, maxBranch: 6, maxRoutes: 20, stockMaxTier: 2})` returns a job `{step(sliceMs) → {done, progress}, cancel(), routes}`.
  - It is a best-first AND–OR search. OR-nodes are molecules. AND-nodes are candidates, expanded with `retroDisconnectSteps`, so even one node's expansion can be sliced.
  - Molecules in stock at or below `stockMaxTier` are solved leaves. The node cost is h = the smallest heavy-atom count still unsolved plus the step count.
  - Solved subtrees are cached by plain SMILES, and precursors already on the ancestor path are pruned to avoid cycles.
- **Output:** `routes` are complete trees `{target, candidate, children: [...]}`, deduped by their candidate key sets.

### B3. Route scoring (3.3)
- **`rsearchScore(route)`** returns:
  - `steps`: total step count;
  - `longest`: the longest linear sequence (parallel branches counted once);
  - `convergent`: a boolean;
  - `yield`: the product of per-step yields, each estimated as selectivity × conversion, the way `reactionRouteStep` already does it;
  - `complexity`: Σ skeleton removed per step, as an array;
  - `stock`: the worst tier among the leaves;
  - `pg`: the number of protecting-group steps.

  The composite `score` is a documented weighted sum.
- **`rsearchSort(routes, key)` and `rsearchFilter(routes, {maxSteps, minYield, maxTier, noPG})`**, both pure functions.

### B4. Protecting-group planning (3.4)
- **Detectors:** factor the silyl, benzyl and acetal detection out of the install transforms into `retroSilylEthers(t)`, `retroBenzylEthers(t)` and `retroAcetals(t)`, alongside `retroCarbamates`. Behaviour is unchanged, which the existing tests show.
- **`retroProtectPlan(spec, target)`**, run when a spec fails `retroVerify`, or verifies but carries an A2 `chemoselectivity` warning that names a group the target keeps:
  - protect the conflicting group in the precursor, using `RX_PROTECTION_SUGGESTIONS`;
  - verify the step on the protected precursor, to the protected target;
  - verify the deprotection forward, from the protected target to the target (fmoc, boc, silyl, pmb, tbu-ester and acetal deprotection rules exist);
  - on success, emit a candidate with `pgSteps: [protect, step, deprotect]` in group "Protecting groups", with the PG penalty.
- **Limits:** at most one protecting group per step, and only these four pairs: amine/Boc, alcohol/TBS, ketone or aldehyde/ethylene-glycol acetal, acid/t-Bu ester.

### B5. Stereo-aware disconnections (3.5)
- **The target keeps its stereo:** `retroTarget` stores `isomericSmiles` and the stereocentre list.
- **Classify each candidate** by comparing the forward product's stereo with the target's:
  - `stereo: 'retained'`: a precursor carries the stereocentre and it survives;
  - `'set'`: the outcome's stereo text shows a stereospecific or selective step that makes the target's configuration;
  - `'racemic'`: a new stereocentre is formed without control;
  - `'mismatch'`: the wrong diastereomer; the candidate is dropped.
- **Ranking:** `retroCompare` prefers retained or set over racemic, just after `adjusted`.
- **Precursors keep stereo:** precursor SMILES keep their stereo (isomeric) wherever the atom survives the edit.

### B tests
- **`test_retro.js`:**
  - existing targets keep their required routes;
  - hexanal and caprolactam have ≤ 1 hydrogenation route;
  - `candidate.bonds` is present on every cut-type candidate;
  - the generator driver gives the same candidates as before (snapshot of all 38 targets);
  - (R)-2-butanol gets racemic flags on hydration and Grignard, and retained on alcohol routes with a chiral precursor.
- **New `test_retro_search.js`:**
  - stock tiers and CSV import;
  - search on benzocaine, paracetamol, 2-methylcyclohexanone and 4-methylbiphenyl reaches stock within budget, with ≥ 1 complete route each;
  - cancel stops the job;
  - scoring values checked by hand for one route;
  - a protecting-group plan for a target where a direct step fails chemoselectivity (e.g. reducing a keto-ester to the hydroxy-ester with LiAlH₄ through an acetal; the implementer picks a concrete target the forward rules support and records it);
  - timings reported.

---

## Slice C — retrosynthesis workflow and canvas integration (roadmap 4.1–4.5)

### C1. Retro modal: automatic search tab, route list, comparison (3.1 UI, 3.3 UI, 4.2)
- **Tabs:** `#retro-overlay` gets two tabs, using the `.viewer-tabs` / `.viewer-pane` pattern from `#viewer-overlay`: **Explore** (today's manual drill-down, unchanged) and **Auto search**.
- **Auto search pane:**
  - Start/Cancel buttons, depth and time inputs, and a stock-tier select;
  - the job runs through `setTimeout` slices of 30 ms, with a progress line;
  - a route list shows the score chips (steps, longest, yield, tier, PG) with sort and filter controls;
  - each route expands into a step strip.
- **Compare:** tick 2–3 routes and press Compare to get a side-by-side table of steps, overall yield, cumulative PMI and E-factor, reagents per step and the worst stock tier.
- **Stock button:** opens a small panel inside the modal to paste or import SMILES/CSV, set tiers, and see the list count. It persists through `stockSerialize` to localStorage.

### C2. Bond-click disconnection (4.1)
- **Entry point:** a new canvas mode, "Disconnect", reached from the retro button's context menu and with Alt+Shift+T. It runs `retroDisconnect` on the target.
- **Highlight:** the renderer draws a highlight on every bond that appears in some `candidate.bonds`, mapped back through `retroTarget().map`. It follows the insight-overlay draw-pass pattern with a new `renderer.retroBonds` set.
- **Click:** `interactions.js` intercepts bond clicks early in `onMouseDown`, guarded by the mode flag, as the arrow tool does. A click opens the retro modal filtered to the candidates that cut that bond. Esc leaves the mode.

### C3. Save and share routes (4.3)
- **Save file:** `serializeGraph` gains an optional `routes` field, holding the `reactionRouteSerialize` form, stereo included. `loadGraphState` reads it through a new `sanitizeRoutes`. Version stays 1, and old files still load.
- **Share links:** `shareEncodeGraph` appends an optional 6th slot of compact route rows, and `shareDecodeGraph` reads `arr[5] || []`. Old links still decode (test).
- **Saving a route:** "Send route to canvas" also stores the route in `graph.routes`. A small "Routes" entry in the editor menu lists the saved routes, which can be reopened in the retro modal's compare view or deleted.

### C4. Route to lab notebook (4.4)
- **Notebook section:** `NOTEBOOK_SECTIONS` gains `{key: 'route', label: 'Synthesis route'}`. `notebookEntry` includes the saved routes of the component.
- **Rendering:** `notebookBody` and `notebookMarkdown` render, per step: the scheme SVG (from `buildRouteScheme` for that single step through the SVG context), reagents and conditions, the stoichiometry table (mmol/g/mL from A3), yield, and green metrics. A route summary row closes the section.

### C5. Library mode (4.5)
- **UI:** the Reaction lab gets a "Library" toggle. One reactant card is marked as the variable slot. A textarea or file takes one substrate SMILES per line, or CSV with `smiles,name`.
- **Logic:** `reactionLibraryRun(compounds, conditions, slotIndex, substrates)` is a pure function in `js/reactions.js`. It runs `predictReaction` per substrate, time-sliced by the lab in chunks of 20, and returns rows `{input, product smiles (isomeric), name, outcome, yield, warnings}`.
- **Output:** a results table. Export as SMILES list, CSV, or SDF (through `graphToSdf`; the product fragments are merged into a temporary graph).

### C tests
- **New `test_retro_workflow.js`** (Node):
  - routes are sanitised and round-trip through save and share;
  - an old share link with 5 slots still decodes;
  - the notebook route section appears in both HTML and Markdown;
  - `reactionLibraryRun` over 5 substrates (bromination series) produces the product table and exports to CSV and SDF;
  - candidate bond filtering.
- **New `drive_retro_workflow.py`** (Playwright) must report no page errors. It drives: Auto search on benzocaine to routes; Compare; stock import; Disconnect mode highlights bonds, and a click filters the list; send route to canvas, then save/reload keeps the route; the share link carries it; a library run.
- Plus runall and test_retro, and the earlier drives that touch the retro modal (`drive_retro.py`).

### Screenshots: `feature-research/reactions-s234/screenshots/`
1. `retro-auto-compare.png`: the retro modal, Auto search tab, benzocaine with its route list and the comparison table open.
2. `retro-bond-click.png`: the canvas in Disconnect mode with the disconnectable bonds highlighted on a target (for example benzocaine or 4-methylbiphenyl).

---

## Files
- **New:**
  - `js/reagent-library.js`, `js/reaction-io.js` (A);
  - `js/retro-stock.js`, `js/retro-search.js` (B);
  - the tests listed above.
- **Edited:**
  - A: `js/properties.js`, `js/reaction-rules.js`, `js/reaction-stereo.js` (only if product `isomericSmiles` needs it), `js/reactions.js`, `js/reaction-lab.js`, `js/app.js` (export and `.rxn` open), `index.html`, `css/style.css`;
  - B: `js/retro.js`;
  - C: `js/retro-view.js`, `js/app.js`, `js/renderer.js`, `js/interactions.js`, `js/share.js`, `js/notebook.js`, `js/reaction-lab.js`, `js/reactions.js`, `index.html`, `css/style.css`.
- **Script order** in `index.html` and the build scripts: `reagent-library.js` after `reactions.js`; `reaction-io.js` after it; `retro-stock.js` before `retro.js`; `retro-search.js` after `retro.js`.
- **Docs:** `CODE_REFERENCE.md` (session 43, one sub-section per slice, plus the load-order fix at line 3) and `complexities.md` (4 new rows, notes for the edited files). Each slice writes its part of `feature-research/reactions-s234/audit.md`.

## Out of scope
- Changing the plain `smiles` field or any existing SMILES comparisons.
- New forward reaction rules, and new retro transforms for the 56 forward-only rules. That is a separate follow-up slice.
- Naming-engine changes and Hückel changes.
- Online stock lookups (PubChem/vendor APIs), since the stock is local only.
- Machine-learned scoring.
- New code comments.
