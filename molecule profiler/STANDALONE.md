# Molecule Profiler — independent research workbench

This directory is a runnable project. It needs no other projects in this repository, account, API key or SwissDrugDesign service. Its interface, candidate-design rules and local compute API live here. Open-source chemistry dependencies are installed separately; this is not a claim that every algorithm was invented for this app.

## Run the complete application

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
node tools/ui-integration-test.js
```

The optional real docking smoke test accepts a prepared receptor fixture and search box; see the test's command-line help. It checks execution and pose output, not biological validity.
