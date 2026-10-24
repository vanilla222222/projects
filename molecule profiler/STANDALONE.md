# Molecule Profiler — independent research workbench

This directory is a runnable project. It needs no other projects in this repository, account, API key or SwissDrugDesign service. Its interface, candidate-design rules and local compute API live here. Open-source chemistry dependencies are installed separately; this is not a claim that every algorithm was invented for this app.

## Start without terminal commands

Install **Python 3.12** from python.org first (on Windows, include the Python launcher), then keep this project directory intact and open its launcher:

- Windows: **Start Molecule Profiler.bat**
- macOS: **Start-Molecule-Profiler.command**
- Linux: run **start.sh** as a program in your file manager

The launcher creates `.venv` inside this project, installs the pinned packages on first launch and opens your browser when the local server starts. The first launch needs internet and can take several minutes. Later launches check the environment and reuse it. Keep the launcher window open while working; close it or press Ctrl+C to stop the server. Local write access and a platform supported by the dependency wheels are required. Python 3.12 is the tested runtime; the launcher is source code, not a bundled desktop installer. File-manager execution permissions may need to be enabled for shell launchers.

If the default port is occupied by this project, the launcher opens that running instance. If another application occupies it, the launcher selects an available localhost port. None of this exposes a network-facing server.

## Manual setup

Use Python 3.12 on a platform supported by the pinned dependency wheels. From this directory:

```sh
python3.12 -m venv .venv
. .venv/bin/activate
python -m pip install -r standalone/requirements.txt
python standalone/server.py
```

On Windows, activate with `.venv\Scripts\activate` instead. Open **http://127.0.0.1:8765**. The same server delivers the interface and computation. Use `--port 9000` if the default port is occupied. Stop with Ctrl+C. Installation needs internet access; the new native modules do not contact remote prediction services after installation. Existing optional literature/structure lookup links require internet when explicitly used.

The GitHub Pages copy runs the browser features and shows native compute as unavailable. To use 3D generation, full RDKit filters or docking, open the local application above. “Check compute” refreshes its connection status. No server credentials or remote compute URLs are required.

## Included tools and scope

| Tool | Implementation | Limits |
| --- | --- | --- |
| Browser profiling and prodrug design | Existing local molecular graph, descriptor and transformation rules | Unvalidated design hypotheses; no guarantee of cleavage or parent release |
| Developability | RDKit descriptors, QED, SA score; PAINS, Brenk, NIH and ZINC catalogs | Scores and alerts are empirical; SA is not a synthesis route |
| Skin permeation | Potts–Guy equation using calculated WLOGP and molecular weight | Neutral structures only; log10(cm/s), not measured permeability |
| 3D structures | ETKDGv3, MMFF94 with UFF fallback | 1–10 conformers; gas-phase coordinates, not a protein-bound pose |
| Force-field inspection | Atom types and charges for MMFF, bond-stretch parameters for MMFF/UFF | Export is a partial inspection record, not a complete simulation topology |
| Reference screening | Morgan 2D Tanimoto and aligned 3D shape/color overlap | 1–20 references, one conformer each; no target probability |
| Fragment tools | BRICS decomposition and single-boundary SMARTS replacements | Replacement atom 1 is the attachment point; attachment stereochemistry needs review; no activity guarantee |
| Docking | AutoDock Vina with Meeko ligand preparation | Prepared receptor PDBQT required; one CPU, exhaustiveness 1, up to five poses; exploratory scores |
| Amino-acid builder | Twelve explicit local starting structures | Inspect specified stereochemistry; not a protein rotamer/insertion engine |

P-gp substrate prediction, trained CYP inhibition models, calibrated target probabilities, measured metabolite abundance, protein parameterization and rotamer libraries are **not supplied**. The app does not manufacture values for these endpoints. This release is not full parity with any external suite.

## Compare every quick candidate

After analyzing a structure, choose **Candidate comparison**. All generated designs (up to 25) appear in one sortable table with formula, molecular weight, WLOGP, TPSA, ESOL solubility, passive BBB screening and differences from the supplied input. Filter by release-target type, site/name/SMILES or the passive BBB screen. Filters do not remove records from CSV/JSON exports. Salt-normalized designs are labelled; their input-relative differences include counterion removal.

Select **Inspect** to check a design's declared target and supported formal activation sequence. Ester-triggered carbamates and ether redesigns retain their specified ester-trigger / fragmentation sequence instead of replacing it with a shorter generic graph route. The inspector shows the broken bond numbers **in each step's reactant SMILES**, all products/intermediates, remaining steps and final coproducts. Ether redesigns are labelled as releasing a different OH analogue; full-salt recovery is never inferred from an organic-component match. Charge-state or rule gaps remain unresolved.

**Check all release paths** runs bounded checks across the table; **Stop checks** retains completed results. Changing input cancels pending work. These checks are not physiological rate, enzyme-recognition or dominant-metabolite predictions.

## Evaluate predictions against measurements

Choose **Validation** for aggregate external-data benchmarks and endpoint evidence coverage. The release includes a pinned 56-compound non-Delaney DLS solubility subset and the 2,050-row MoleculeNet BBBP dataset. No model fitting or threshold tuning is performed. Exact-graph duplicates count once; conflicting observations are excluded, charged/disconnected or unsupported structures abstain, and every count is reported.

The passive BBB screen's overall accuracy on scored BBBP rows is **below the majority-class baseline**. It remains a rough research screen. Development-set overlap has not been audited, and BBBP labels cover mechanisms beyond passive membrane permeability. The report does not establish a clinically validated BBB predictor or prodrug performance.

You can import a CSV with `smiles,observed` and optional `name` (500 rows / 1 MB maximum). Select log S in log10(mol/L), experimental octanol/water log P, or binary BBB labels (0/1). Log D is not accepted as log P. Results stay in the browser, include exclusions and can be downloaded as JSON. Comparing measurements does not train the model. Blank labels are invalid rather than zero; conflicting exact-graph measurements are not averaged silently.

For reproducible aggregate results:

```sh
python tools/run-independent-benchmarks.py --write
```

This downloads the source datasets into ignored `.benchmark-cache`, checks their SHA-256 digests and runs the existing browser calculations through Node.js. **Node.js is needed for this developer benchmark command, not for the app launcher.** Source URLs/checksums are in `validation/benchmark-sources.json`; model-file hashes and generated metrics are in `validation/independent-benchmarks.json`. Upstream raw datasets are not redistributed here. Their attribution and reuse terms remain with their original providers. No Swiss datasets or models are used.

Coverage explicitly distinguishes measured benchmarks from implementation conformance. Skin permeability, docking affinity, QED/SA outcomes and experimental prodrug cleavage do not acquire validation from these two datasets. No additional trained predictive model is introduced by this update.

## Working with the tools

Analyze a molecule, then choose **Research tools** in the workspace navigation. Select the input or one of its quick candidate designs. Native results retain that molecule's identity in JSON exports. Changing molecules clears the previous result and prevents an older job from overwriting the new context.

For docking, supply a scientifically prepared rigid receptor PDBQT, center coordinates and box dimensions in ångströms. Ligand hydrogens/conformers are generated locally; review the input protonation and stereochemistry first. Each box dimension is at most 30 Å. Receptor protonation, missing atoms, metals, waters, flexible residues and binding-site selection are not automatically resolved. Downloadable poses and scores are computational hypotheses, not experimental affinities.

The local API accepts one connected molecule with 1–120 heavy atoms, no radicals, and elements H, B, C, N, O, F, Si, P, S, Cl, Br or I. Force-field coverage is checked separately. It binds only to localhost, allows two concurrent jobs and terminates each compute process after 120 seconds. Receptors are limited to 2 MB and used in an isolated temporary directory. Do not expose this development server to an untrusted network.

## Reproducibility and dependencies

Pinned versions are in `standalone/requirements.txt`. The engine reports its RDKit version at `/api/status`; 3D embedding and Vina use seed `20261023`. Downloaded native result JSON includes query identity, action, scope and timestamp. This does not make predictions experimentally validated.

Independent upstream projects: [RDKit](https://github.com/rdkit/rdkit) (BSD-3-Clause), [AutoDock Vina](https://github.com/ccsb-scripps/AutoDock-Vina) (Apache-2.0), [Meeko](https://github.com/forlilab/Meeko) (LGPL-2.1), and [Gemmi](https://github.com/project-gemmi/gemmi) (MPL-2.0). Preserve upstream license notices when redistributing dependencies. SA scoring uses the RDKit Contrib implementation and its bundled fragment data. QED and Potts–Guy are published methods, with the upstream references retained in their implementations/documentation.

## Verify

With the environment activated, run from this directory:

```sh
python tools/standalone-test.py
python tools/launcher-test.py
node tools/ui-integration-test.js
node tools/candidate-dashboard-test.js
python tools/candidate-release-rdkit-test.py
node tools/prediction-benchmarks-test.js
```

The optional real docking smoke test accepts a prepared receptor fixture and search box; see the test's command-line help. It checks execution and pose output, not biological validity.

## Multi-site ionization scenarios

Exposure → Charge states & pH supports up to six recognized acid/base sites and 64 explicitly generated charge-state structures. Supply a pKa, low/high range and source or explicit assumption for each included site. This is an independent-site scenario, not a pKa predictor: macroscopic polyprotic pKa values cannot be assigned to individual atoms without justification. Supported motif coverage is bounded; omitted chemistry is not assumed inert.

A fully uncharged fraction is distinguished from a net-zero-charge fraction (which can include zwitterions). Conditional log D uses the WLOGP of the all-uncharged reference and assumes negligible partitioning of charged species; it is withheld if that reference is unavailable. Ionic partitioning, ion pairs, tautomer equilibria, site coupling, activity coefficients and concentration effects are outside this calculation. pKa envelopes show parameter sensitivity, not statistical confidence. No permeability/BBB or solubility benefit is inferred. All states and pH profiles can be exported to JSON.

## Release-evidence coverage

Each checked candidate now separates exact documented compound-pair matches, per-step reaction-class sources and shared-motif literature examples. A matched overall pair does not establish every proposed intermediate. Missing measured rates and assay conditions remain explicitly unavailable. Additional initial transformation matches are displayed without probabilities or rate rankings. The project does not infer human activation from a cleavable bond, a source URL or a formal route.

## Independent BBB research classifier

The BBB research workspace runs a separately trained random forest on Morgan-2/2048 fingerprints, with a held-out-scaffold Platt calibration step and a threshold chosen only on the calibration split. Fixed groups are 1,244 training, 267 calibration and 270 test structures after neutral/connected graph curation and exclusion of conflicting labels. There is no shared Murcko scaffold between splits, and all acyclic compounds are grouped together. Stereochemistry-agnostic duplicate graphs are curated together because the model does not encode stereo.

The full internal scaffold test has balanced accuracy about 0.826 (passive comparator about 0.785 on the same 270 structures). These are dataset results, not evidence of clinical superiority. The runtime abstains below a fixed 0.35 maximum training-fingerprint similarity or outside training MW/WLOGP/TPSA ranges, and on charged, disconnected, radical or unsupported-element inputs. It covered 190/270 test structures; both full and gated test metrics are reported. Probabilities refer to the historical BBBP label, not measured penetration in an individual. Passive diffusion, transporter effects and exposure are not disentangled. No external prospective validation is supplied.

Inference runs entirely on the standalone server with RDKit; no scikit-learn is needed at runtime and no executable pickle is loaded. The numerical JSON artifact includes integrity hashes. To reproduce training, install the separate developer dependencies in `tools/requirements-bbb-training.txt`, then run `python tools/train-bbb-research.py`. The input dataset's SHA-256, exclusions, scaffold counts, split identity hashes, software versions and evaluation are recorded in `validation/bbb-research-model.json`. Raw source data remains in ignored `.bbb-cache`.
