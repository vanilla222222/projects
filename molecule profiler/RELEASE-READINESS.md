# Molecule Profiler — release-readiness checklist

A GitHub Pages deployment confirms publication only; it is not evidence that browser workflows or scientific results have passed validation.

## Before professional/public release

- [ ] Chromium browser suite passes against the exact release commit: analysis, invalid inputs, molecule selection, chart navigation, CSV/JSON/ZIP downloads and extraction.
- [ ] Node regression suite exits zero and its validation-report.json is attached to the release.
- [ ] Python independent ZIP extraction, CSV decoding and manifest checks pass.
- [ ] RDKit structural audit is reviewed independently from front-end CI and reference-set anomalies are documented.
- [ ] A genuine verified Git commit SHA is recorded in the release notes; asset cache tokens are not commit revisions.
- [ ] Parser errors, missing descriptors, duplicate SMILES *strings* and extrapolation flags are documented.
- [ ] Measured validation limitations and known disagreements are disclosed; structural similarity is not evidence of pharmacology or safety.
- [ ] Keyboard accessibility, mobile layout, theme state, and graceful empty-state behavior are checked.
- [ ] Input and output privacy plus third-party scripts, telemetry, and external links are audited.
- [ ] Release decision includes date, exact SHA, test environment, test evidence and unresolved issues.

## Diagnostic commands

From the molecule profiler directory, run:

    node tools/run-validation.js --report validation-report.json
    python3 tools/verify-research-zip.py
    python -m pip install 'playwright>=1.50,<2'
    python -m playwright install chromium
    python tools/browser-e2e.py

An installed Chromium can be selected with CHROMIUM_PATH=/usr/bin/chromium.

## Current blocking uncertainty

The browser workflow is committed but a passing whole-application run has not been demonstrated. The hosted GitHub Actions runs have reported failures without visible job steps or logs. This remains an unresolved CI execution/evidence issue, not a diagnosed chemical model failure.
