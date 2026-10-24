# Python on GitHub Pages

Analyze a molecule, open **Python workspace**, then click **Load Python** or **Run code**. No Python installation or local server is required for this workspace.

The site bundles unmodified Pyodide 0.29.3 / CPython 3.13.2 WebAssembly runtime files from the official npm package. About 12 MB is loaded before HTTP compression, on demand, from this site's origin. Other workspaces do not download Python. Source URLs, file hashes and licenses are in `vendor/python/`.

Each run supplies independent JSON copies:

- `molecule`: name, SMILES and scalar descriptors calculated by the existing app.
- `query_smiles`: input SMILES string.
- `candidates`: up to 25 candidate-comparison records, properties and available evidence.
- `evidence`: analysis snapshot, excluding previous Python experiments.
- `analysis`: dictionary containing molecule, candidates and evidence.

These are existing app calculations, not full Python RDKit results or measurements. Editing Python dictionaries does not alter the app's structure or predictions. Standard-library examples support inspection, comparison and explicitly assumed ionization scenarios.

Variables persist between runs. **Stop** and **Reset interpreter** terminate the worker and clear variables while retaining code. Run starts a new interpreter afterward. Execution times out after two minutes; output is limited to 100,000 characters. Interactive `input()` is unsupported. Ctrl/Cmd+Enter runs code; Tab inserts four spaces. Browser local storage retains editor text when available.

Successful runs capture code, exact input copies, output, versions and timestamp. Save the matching analysis in Project notebooks to retain the capture, or download run JSON directly. Runs finishing after a structure change are not attached to the new analysis. Notebook snapshots are historical records, not executed scripts or validated findings.

## Full engine status

This workspace includes Python's standard library. Full Python RDKit, NumPy, pandas and Vina are not bundled yet. Research tools and BBB research retain their explicit standalone-engine requirements. No chemistry calculations are silently substituted, and model-version guards are unchanged.

The pinned full-RDKit build workflow is separate. GitHub Actions blocked its compilation because of the account billing lock. No full-RDKit WebAssembly artifact has been published or validated here. The compiled artifact needs integration and verification of every chemistry action before those requirements can be removed. Do not overwrite this working runtime with an unverified build.

## Tests

`node tools/python-runtime-test.js` runs the shipped worker and actual WASM interpreter under Node, including cancellation of an infinite Python loop. `tools/python-workspace-test.js` checks copied inputs, notebook capture, stale runs and controls using JSDOM. The full app smoke test and static integration check cover navigation and existing modules.
