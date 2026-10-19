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

The browser workflow is committed but a passing whole-application run has not been demonstrated.

On 2026-10-19, regression run 39324978173 at `02196e5e46b09db4a934df024b9914461dd616c6` had two failed jobs, both with no steps and runner ID 0. The JavaScript check annotation states: "The job was not started because your account is locked due to a billing issue." This is an account-level runner admission failure. Repository code changes cannot resolve it; the account owner must resolve GitHub billing, then rerun the workflows. Pages publication is a separate outcome.

To diagnose future failures with no steps, inspect the check annotations, not only job logs:

    gh api repos/vanilla222222/projects/actions/runs/39324978173/jobs
    gh api repos/vanilla222222/projects/check-runs/118308325382/annotations

Local Chromium launch was also attempted in the development container using Playwright 1.51.0 and Chromium 134.0.6998.35. The environment denied a socket operation in `process_singleton_posix.cc` before the browser launched. No browser assertions ran; this does not establish an application failure or a browser-suite pass. Run the suite in an environment that permits browser startup.

The Node interaction tests use small DOM doubles. They cover selection identity and denied-storage error handling, but cannot establish browser focus, layout, accessibility or download behavior.

## Cooperative batch analysis

Descriptor analysis yields to the browser between chunks (12 ms budget or 25 records, whichever is reached first). Progress counts attempted input records, including invalid records. Cancellation discards the in-progress batch and retains the last completed analysis and its exports. Clear also invalidates pending calculations; an older run cannot publish over a newer run.

This is cooperative scheduling on the main thread, not a Web Worker. Parsing input, one complex molecular calculation, reference fingerprint preparation, rendering, and exports may still block. The scheduler's 10,000-item regression verifies ordering and cancellation; it is not an end-to-end chemistry throughput benchmark. The analysis lifecycle test separately compares real engine output with synchronous calculation and checks partial input success and transaction behavior. Chromium coverage for progress/cancellation is committed but remains unverified until browser execution is available.

## Validation report source identity

`tools/run-validation.js --report <path>` retains the existing report schema and adds `source.before`, `source.after` and `source.integrity`. Snapshots contain the local Git commit when available, source dirty-state details and a sorted per-file SHA-256 inventory of runtime and test source. Their aggregate digest is SHA-256 over the UTF-8 JSON encoding of that inventory. This identifies actual local source bytes, including uncommitted source; a Git SHA alone does not do that.

The runner exits nonzero if inventoried source or the local Git revision changes while tests run, even when every test passes. Re-run from a stable checkout in that case. A checkout without Git metadata explicitly reports an unavailable revision and unknown dirty state. Generated reports, logs, screenshots and JSON audits are excluded so writing evidence does not invalidate itself. The inventory's declared scope is not a hash of the entire repository, external software or fetched datasets. Preserve dependency versions, test output and any dataset checksums alongside it. Hashes establish identity and detect changes; they do not certify scientific accuracy.


## Reopening analysis snapshots

Use the structure-file input to reopen a Molecule Profiler schema-version-1 JSON snapshot, or paste its JSON into the input box. The file input accepts up to 1 MB. Only molecule names and SMILES are restored: all properties are recalculated with the current engine. Saved values are not treated as current calculations or experimental evidence, and settings are not restored. Unsupported schema versions and malformed snapshot envelopes retain the previous completed analysis. Individual invalid molecule records are skipped and identified by their snapshot record number, including in research-package quality warnings.

Node tests exercise snapshot parsing and restoration with the actual descriptor engine, including tampered saved values and partial failures. The corresponding Chromium import/download test is present but has not been executed successfully in the restricted development environment.
