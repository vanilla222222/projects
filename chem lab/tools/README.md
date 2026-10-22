# Chem Lab validation

Run from the `chem lab` directory. The default suites need only Node:

```sh
node tools/run-validation.js
```

This runs syntax checks and all `*test.js` suites plus the curated chemistry
benchmark. Fixture assertions and metadata coverage are regression checks, not
an accuracy percentage over arbitrary molecules.

## Independent RDKit oracle

Install the official PyPI package outside the repository, then run:

```sh
python3 -m pip install --target /tmp/chem-rdkit rdkit
PYTHONPATH=/tmp/chem-rdkit node tools/run-validation.js --rdkit
```

The oracle independently parses the app's actual SMILES/MOL exports and compares
sanitized structures, charge, isotope/stereo identity, formula, exact mass and
fixed expected reaction products. Its saved report records RDKit's version,
fixture hashes and loaded-script hashes. Refresh the report after source changes:

```sh
PYTHONPATH=/tmp/chem-rdkit python3 tools/rdkit-validation.py
```

`--check` runs the same comparisons without rewriting the report. RDKit agreement
does not establish that a proposed reaction works experimentally.

## Real browser and mobile emulation

Install Playwright and its browser outside the repository:

```sh
npm install --prefix /tmp/chem-lab-browser playwright
node /tmp/chem-lab-browser/node_modules/playwright/cli.js install chromium
CHEM_PLAYWRIGHT_PATH=/tmp/chem-lab-browser/node_modules/playwright node tools/run-validation.js --browser
```

The test starts a loopback HTTP server and runs the complete application in
Chromium at desktop and mobile/touch viewport sizes. It checks navigation,
alternative-route comparison, responsive layout, save/reload, reorder validation,
JSON/CSV export and JSON reimport, reaction handoff, evidence search, ten-step
settings, explicit protection routes, group allowlists and the protecting-group
reference/preservation panels. This is viewport/touch emulation,
not a physical Android or iOS test.

Reports and screenshots are written to `/tmp/chem-lab-browser-qa`, or
`CHEM_BROWSER_OUTPUT`. An existing Chromium executable can be selected with
`CHEM_CHROMIUM_EXECUTABLE`; `CHEM_CHROMIUM_ARGS` accepts a JSON array of launch
arguments when a particular test environment needs them.

Use both `--rdkit --browser` to run the optional checks together. The application
itself has no runtime dependency on Python, RDKit or Playwright.
