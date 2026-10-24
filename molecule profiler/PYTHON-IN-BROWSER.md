# Python on GitHub Pages

Analyze a molecule, open **Python workspace**, then click **Load Python** or **Run code**. No Python installation or local server is required for this workspace.

The site bundles unmodified Pyodide 0.29.3 / CPython 3.13.2 WebAssembly runtime files from the official npm package. About 12 MB is loaded before HTTP compression, on demand, from this site's origin. Other workspaces do not download Python. Source URLs, file hashes and licenses are in `vendor/python/`.

Each run supplies independent JSON copies:

- `molecule`: name, SMILES and scalar descriptors calculated by the existing app.
- `query_smiles`: input SMILES string.
- `candidates`: initially up to 25 candidate-comparison records, with optional five-design extensions up to 100, properties and available evidence.
- `analogues`: the current generated analogue records; `analogue_shortlist`: the selected subset.
- `evidence`: analysis snapshot, excluding previous Python experiments.
- `analysis`: dictionary containing molecule, candidates and evidence.

These are existing app calculations, not full Python RDKit results or measurements. Editing Python dictionaries does not alter the app's structure or predictions. Standard-library examples support inspection, comparison and explicitly assumed ionization scenarios.

Variables persist between runs. **Stop** and **Reset interpreter** terminate the worker and clear variables while retaining code. Run starts a new interpreter afterward. Execution times out after two minutes; output is limited to 100,000 characters. Interactive `input()` is unsupported. Ctrl/Cmd+Enter runs code; Tab inserts four spaces. Browser local storage retains editor text when available.

Successful runs capture code, exact input copies, output, versions and timestamp. Save the matching analysis in Project notebooks to retain the capture, or download run JSON directly. Runs finishing after a structure change are not attached to the new analysis. Notebook snapshots are historical records, not executed scripts or validated findings.

## Ready-to-run analysis templates

In Python workspace, choose an **Analysis template**, click **Load template**, then **Run code**. The description explains the selected template before you load its code. Selecting a dropdown option alone does not replace the editor.

- **Compare all designs with parent** lists all copied designs in their original order and shows MW, WLOGP, TPSA and ESOL log S differences when both input and design values exist. The comparison uses the dashboard's input baseline to keep calculation methods consistent. Differences are not benefit scores.
- **Formula, properties and BBB summary** prints full descriptive names, formula, MW, TPSA, WLOGP, SMILES and any available passive BBB screen for the input and every design. It does not present passive screens as measured penetration or trained-model probabilities. Unavailable estimates remain unavailable.
- **Cleavage products and release targets** reads the current snapshot's release checks. For more results, first run **Check all release paths** in Candidate comparison. It distinguishes original-input, organic-component and different-OH-analogue targets, then lists available formal steps, products and coproducts. Unchecked paths stay unchecked; no biological metabolism is inferred.

All templates use only the included Python standard library. Their source is in `js/python-analysis-templates.js`. Successful unmodified template runs retain the template ID and version alongside their exact code, inputs and output in the run JSON and notebook snapshot. Edited scripts retain their code with no built-in-template attribution.

The **Compare analogues with input** template uses the analogue shortlist when nonempty, otherwise all generated analogues. Its structured report shows edit provenance instead of prodrug cleavage paths. The viewer's five-more button targets the kind of designs in that report. Analogue generation settings and shortlists are included in notebook snapshots; reanalysis regenerates current results rather than loading historical values as predictions.

## Structured results and five more designs

The analysis templates now return a `profiler_result` dictionary as well as text. On success, the worker serializes it as JSON (maximum 2 MB) and the workspace presents a sortable, searchable comparison table. The input baseline stays first when sorting. Missing numeric values and unavailable BBB estimates remain explicit; every generated design is labelled unvalidated. Expand a design, then a formal step, to see available reactants, cut bonds, products, target identity and coproducts. Raw output is collapsed after a structured run and remains available. Text-only custom scripts continue to work; they clear any previous structured table when they complete.

**Download visible CSV** includes the input and currently filtered/sorted designs. **Download results JSON** includes all captured result rows, source code, template identity and runtime versions. The existing **Download run JSON** also retains the full input snapshot and raw structured response. The worker resets `profiler_result` before every run, so a text-only script cannot inherit an earlier table. Non-JSON numeric values and oversized structured responses receive explicit errors.

**Generate another 5** is available in Quick candidates and the Python results viewer. It acts on the current analyzed molecule, appending up to five additional designs from the same supported classes and up to five compatible positions. The initial batch remains 25; the session is bounded to 100 designs and 300 generation attempts per enumeration. It keeps existing designs, order, dashboard release checks and notebook selections. Finite libraries may yield fewer than five; no duplicates or unsupported structures are used to fill the batch. The button stops when sampling is exhausted or the session limit is reached. A new input starts a fresh batch.

Completed Python runs remain historical snapshots. Generating more designs does not rewrite their input or results. The viewer marks a changed current candidate set and asks you to rerun the template. New designs are included in candidate comparison, subsequent Python runs and notebook selection; notebooks allow at most 100 selected designs while retaining their existing size limits.

`tools/python-results-test.js` and `tools/python-results-ui-test.js` cover sorting, missing values, safe rendering, release expansion, export scope and historical-run labels. The full app smoke checks repeated generation, preserved checks/selections, exhausted libraries and cancellation when the input changes. `tools/python-workbench-e2e-test.js` runs all UI modules with the actual shipped Python worker/WASM runtime, then verifies the 25-design table, five-design extension, historical-result notice, 30-design rerun and notebook capture.

## Full engine status

This workspace includes Python's standard library. Full Python RDKit, NumPy, pandas and Vina are not bundled yet. Research tools and BBB research retain their explicit standalone-engine requirements. No chemistry calculations are silently substituted, and model-version guards are unchanged.

The pinned full-RDKit build workflow is separate. GitHub Actions blocked its compilation because of the account billing lock. No full-RDKit WebAssembly artifact has been published or validated here. The compiled artifact needs integration and verification of every chemistry action before those requirements can be removed. Do not overwrite this working runtime with an unverified build.

## Tests

`node tools/python-runtime-test.js` runs the shipped worker and actual WASM interpreter under Node, including cancellation of an infinite Python loop. `tools/python-workspace-test.js` checks copied inputs, notebook capture, stale runs and controls using JSDOM. The full app smoke test and static integration check cover navigation and existing modules.
