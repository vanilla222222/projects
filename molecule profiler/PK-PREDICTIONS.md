# Pharmacokinetics, prodrugs and functional context

This release adds research estimates and evidence navigation. It does not
establish clinical validation, receptor affinity, functional action, subjective
effects, individual pharmacokinetics or successful delivery of a new prodrug.

## Available outputs

| Feature | Output and evidence level |
| --- | --- |
| Elimination half-life | A small source-observation set takes precedence when the supplied graph matches. Otherwise an exploratory measured-endpoint regression, with an interval and applicability checks. |
| Other property prediction | A new measured-endpoint logD model at pH 7.4, distinct from intrinsic WLOGP and existing ESOL solubility estimates. |
| Ionization/logD scenario | Conditional calculation from user-supplied pKa, pH and acid/base type. No pKa is inferred from a generic functional group. |
| Prodrug detection | Eight documented parent-to-active relationships, matched conservatively by labelled-graph isomorphism. |
| Prodrug examples | Documented examples for an exact active graph, plus a browsable source-linked catalogue. An unknown molecule is not assigned an invented derivative. |
| Effects | Conditional activation/blockade biology for leading human receptor references. Neither action nor clinical effects are inferred for the query. |
| Receptor references | Multi-fingerprint/multi-reference retrieval is now the default. Shared motifs are counted across the target's reference profiles and the indexed background. |
| Metabolism presentation | Lower-weight unflagged candidates are collapsed; flagged candidates remain in the main table even beyond the normal row limit. Methods, diagnostics and structural observations are expandable. Full chemistry exports retain the entire enumerated result. |

## Experimental numerical models

Two fixed random forests use the deployed JavaScript descriptor implementation
and a coarse 256-bit stereo-aware ECFP4 feature channel. The 12 descriptors are
MW, WLOGP, TPSA, HBD, HBA, rotatable bonds, fraction Csp3, rings, heavy atoms,
formal charge, aromatic rings and amide bonds. No reaction-class weights,
receptor similarity scores or assumed enzyme speeds are converted into half-life.

| Endpoint | Input rows | Included | Train / calibration / test | Test MAE | Training-median baseline MAE | Test R² |
| --- | ---: | ---: | --- | ---: | ---: | ---: |
| Human IV elimination half-life, log10 hours | 667 | 623 | 401 / 104 / 118 | 0.4173 | 0.4852 | 0.1678 |
| logD at pH 7.4 | 4,200 | 4,175 | 2,643 / 717 / 815 | 0.6773 | 0.9154 | 0.4331 |

**Half-life accuracy is modest.** A 0.4173 log10-hours MAE corresponds to a
geometric mean fold error of about 2.61, not a promise that any individual result
is within that factor. The low R² is displayed rather than hidden. LogD errors
are log units, not percentages or an error on intrinsic logP.

### Sources and transport

- Half-life scientific source: [Obach, Lombardo and Waters (2008)](https://pubmed.ncbi.nlm.nih.gov/18426954/),
  a compilation of reported human intravenous pharmacokinetic parameters.
- Dataset/task definition: [Therapeutics Data Commons ADME](https://tdcommons.ai/single_pred_tasks/adme/).
- The official Harvard Dataverse half-life download, file 4266799, returned HTTP
  403 in this environment. Acquisition used a
  [pinned third-party TDC-format mirror](https://huggingface.co/datasets/tianle233/icrl-data/resolve/cf2394f455d7c2f9af13e352ccc6efb12fbdfd22/data/half_life_obach.tab).
  **Equivalence to the official file has not been independently confirmed.**
  This limitation is visible in the interface and evaluation report.
- Lipophilicity scientific data: [AstraZeneca/ChEMBL](https://doi.org/10.6019/CHEMBL3301361),
  served as the [DeepChem Lipophilicity dataset](https://deepchemdata.s3-us-west-1.amazonaws.com/datasets/Lipophilicity.csv).
  Its target is experimental logD at pH 7.4. Original source attribution and
  dataset terms remain applicable; the training script is not a claim to own
  the underlying measurements.

`validation/pk-training-sources.json` retains the acquired tabular values and
source URLs. `validation/pk-model-evaluation.json` records original file hashes,
excluded rows/reasons, split identities/scaffolds, metrics, residual radius,
source-code hashes and Python/JavaScript parity fixtures. No patient records or
new measurements are introduced.

### Split, interval and release protocol

RDKit rejects invalid/disconnected graphs, radicals, unsupported elements and
incomplete tautomer enumerations. Stereo-preserving neutral tautomer identities
deduplicate repeated representations by retaining the first source record;
stereoisomers are not merged. This convention is not evidence of identical
biological behaviour, and retaining one repeated measurement does not capture
its experimental variability.

Achiral Bemis–Murcko scaffold strings are assigned to fixed hash buckets:
60% training, 20% calibration and 20% testing. All acyclic structures form one
group. No scaffold appears in more than one split. Only training fits the
forest: 96 trees, depth 8, minimum leaf 4, feature fraction 0.65, seed 20261020.
The fitted forest is not refit on the held-out data. The predeclared release
gate requires test MAE to beat a training-median baseline by at least 5%; this
gate is not a statistical significance test or clinical qualification.

The absolute calibration-residual order statistic at ceil((n+1)×0.9) defines the
display interval. In this run, its half-width is 0.8762 log10-hours for half-life
and 1.4243 logD units. Overall held-out coverage is 91.5% and 90.7%, respectively.
These are **observed internal coverage figures**, not guaranteed 90% coverage
for a new scaffold, molecule or person. Scaffold/domain shifts violate simple
exchangeability assumptions. No external prospective validation was performed.

Numerical estimates are withheld if a descriptor falls outside training bounds
or the nearest training coarse fingerprint has Tanimoto below 0.25. Passing these
basic checks does not prove applicability. Fingerprint folding can collide;
nearest similarity is not a confidence score or identity test. Stereo-aware
features do not establish accurate enantiomer-specific PK when measurements
are missing. Dose, route-dependent absorption, formulation, disease, genotype,
urinary pH, drug interactions, tissue distribution and active-metabolite kinetics
are not modelled. Half-life is not duration of action.

## Reported observations and conditional calculations

Exact graph matches to sourced observations are shown ahead of model estimates:
aspirin parent half-life from an aspirin/dipyridamole product label, and separate
parent/active observations from a lisdexamfetamine label. Their populations and
product/study contexts remain attached. No observation transfers to a different
charge, isotope or stereochemical graph. The observation set is deliberately
small and incomplete; absence does not establish that measurements do not exist.

The supplied-parameter scenario uses `t1/2 = ln(2) × Vd / CL`, with Vd in litres
and clearance in litres/hour, under a one-compartment assumption. In a general
multi-compartment model, steady-state Vd cannot simply replace terminal-phase
distribution volume. Positive finite inputs and finite results are required.

For one monoprotic site, neutral fraction is `1/(1+10^(pH−pKa))` for an acid and
`1/(1+10^(pKa−pH))` for a base. Approximate logD is WLOGP + log10(neutral fraction),
assuming negligible ionized-species partitioning. This is not a general
polyprotic/zwitterion calculation. User parameters and the optional pKa source
are exported and reset when the selected molecule changes.

## Prodrug and effect evidence

`data/pharmacology-evidence.js` links levodopa/dopamine,
lisdexamfetamine/dextroamphetamine, valacyclovir/acyclovir, enalapril/enalaprilat,
prednisone/prednisolone, capecitabine/fluorouracil, famciclovir/penciclovir and
valganciclovir/ganciclovir. NCI or product-label sources document the relationship;
separate PubChem records define parent graphs. Some listed active ingredients
require further intracellular activation. A parent graph does not represent
every product salt, formulation, stereoisomer mixture or exposure profile.

Exact matching uses bounded labelled-graph isomorphism preserving elements,
isotopes, formal charges, hydrogen counts, aromatic bonds and resolved
tetrahedral/double-bond stereo. Undetermined stereo or exhausted search budgets
do not count as confirmed matches. A separate related-connectivity notice may
identify a different charge/H/stereo form, but does not transfer activity or
half-life observations. A cleavable ester/amide alone never establishes prodrug
status. A known active product missing from the current metabolite enumeration
is disclosed as a heuristic coverage gap, not evidence against conversion.

The effect panel reproduces sourced conditional receptor context: what
activation or blockade can do in biological systems. It does not choose either
action, assert binding, predict brain exposure, assign subjective experiences
or supply calibrated effect probabilities. BBB delivery requires evidence of
exposure, transport/efflux and appropriate bioconversion; a different descriptor
score or a familiar promoiety is insufficient. The app generates no hypothetical
prodrug derivatives, and a cholesterol-delivery hypothesis is not evidence of an
Alzheimer's treatment.

## Shared receptor motifs

Thirteen explicit SMARTS motifs include indole, an indole–ethylamine linker,
phenethylamine-related linkers, pyridine, piperidine, piperazine, morpholine,
benzimidazole, amide, ester, phenol, carboxylic acid and sulfonamide.
`data/reference-motifs.js` contains RDKit matches bound to each stored source
SMILES; stale graph metadata is ignored. The query uses the same pattern
vocabulary in the browser. Supporting profiles are counted across the entire
target reference panel, not only its nearest reference, and indexed background
counts are provided to expose common motifs. These counts remain dependent on
reference-set selection and fingerprint grouping.

An indole is not a serotonin-receptor activity label. Motif counts add explanation
and wider structural context, **not an unvalidated affinity bonus**. The ranking
algorithm's numerical weights remain unchanged. The default now uses the
existing stereo-aware atomic, chemical-feature and atom-pair ensemble plus
three distinct reference profiles; legacy nearest-neighbour ranking remains
available. Neither mode supplies experimentally calibrated binding probabilities.

## Exports and reproduction

The new **Export pharmacology evidence JSON** contains query input, model
versions/source hashes, metrics, predictions/domain status, observed values,
documented prodrug relationships, conditional effects, enumeration coverage and
user-parameter scenarios. It is a separate evidence sidecar; the established
full CSV/ZIP chemistry schemas have not gained these new fields in this release.
All enumerated metabolites, including collapsed lower-weight candidates, remain
in existing research exports. UI visibility does not change the chemistry tree.

```sh
# Training run used Python 3.12, NumPy 2.3.5, scikit-learn 1.8.0;
# the separate RDKit environment used RDKit 2026.09.1.
python tools/train-pk-models.py --half-life half_life_obach.tab \
  --logd Lipophilicity.csv --rdkit-python /path/to/rdkit/python
python tools/build-reference-motifs.py
python tools/build-pharmacology-evidence.py
node tools/pharmacology-test.js
NODE_PATH=/path/to/node_modules node tools/pharmacology-dom-test.js
node tools/run-validation.js
```

Training does not contact a prediction service. Browser inference and graph
matching run locally. Internal regression, source agreement and held-out dataset
performance are distinct from independent experimental validation. Real
Chromium/visual testing remains unverified in this environment.

## Browser eligibility and pH exploration update

The `pk-chemistry-gate-v1` screen runs before model inference. It withholds
model outputs for disconnected mixtures, elements outside C/N/O/S/P/F/Cl/Br/I,
isotope-labelled graphs and unrecognized valences or possible open-shell
chemistry. Common closed-shell ionic forms are recognized explicitly. This is
a deliberately conservative browser screen, not RDKit sanitization or a complete
radical detector. No salts are stripped or structures silently neutralized.
Passing does not establish applicability; descriptor bounds and coarse
fingerprint similarity checks still apply, and the original accuracy limitations
remain. Neither model weights nor feature definitions were changed or retrained.
The JSON sidecar includes chemistry eligibility and its policy version.

Supplying a pKa also exposes an expandable pH 0–14 table and exports the
conditional profile. Every point uses the same monoprotic approximation and
WLOGP estimate. These are scenarios, not measured logD, solubility, absorption
or BBB predictions. Invalid or missing inputs clear the profile; changing
molecules resets the pKa and collapses the table.


## Interactive elimination and candidate designs — 2026-10-23

The existing half-life model now feeds an interactive single-exponential parent-amount curve, 100 × 2^(−t/t½), with hours on the time axis. A supplied clearance/one-compartment volume scenario takes precedence while those parameters are entered. Exact sourced observations take precedence over model estimates: the aspirin 20-minute observation is usable as a scenario input; a reported numerical range uses an explicitly labelled illustrative midpoint and propagated range. A censored observation such as “less than 1 hour” is not turned into an exact curve. Unavailable estimates and incomplete scenarios clear the prior structure’s plot. Input half-life intervals propagate into a scenario envelope; this is not a validated concentration confidence interval. The model excludes absorption, repeated administration, multi-compartment kinetics, active metabolites and pharmacodynamics. It does not predict subjective strength or duration of effects. Milestones and a CSV are available.

The Prodrugs panel retains documented exact-graph relationships and separately displays up to five unvalidated structural candidate designs. Enumeration supports free alcohol/phenol and neutral carboxylic-acid handles on compatible neutral or charged parents, with exact-parent structural recovery checks, preserved supported stereochemistry/isotopes and explicit unsupported-input reasons. Some structures produce fewer than five or none. An ester/phosphate class reference does not establish that an arbitrary derivative releases the parent in vivo, improves delivery, is pharmacologically inactive, or has an acceptable safety profile. No release rate, benefit, potency, dose or candidate half-life is inferred by this enumeration. Each design retains an activation hypothesis, class references, limitations and an analysis handoff. The pharmacology JSON export records candidate designs separately from curated evidence and includes the current plotted scenario.

Focused formula, candidate-identity and interface checks cover this extension. The existing PK models were not retrained or newly clinically validated.


## General-input structural designs

Prodrug generation has no named-molecule allowlist. Common closed-shell ionic
valences are now accepted elsewhere in the parent graph, including protonated
amines and charge-separated nitro groups, while the modified handle remains
neutral. Exact structural parent recovery, isotope/stereo round trips, connected
input, size and supported-valence checks remain required. Carboxylate handles,
amine-only parents and directional alkene stereo are still unsupported; the UI
reports why rather than inventing a candidate.

Generated analogues is a separate panel in References and Metabolism. It applies
single aromatic CH substitutions (fluoro, methyl, hydroxy) and terminal halogen
exchanges to compatible input graphs, with no catalogue or compound-name match.
It defaults to twelve unique variants and deduplicates by graph identity. The
API accepts a limit up to sixty. Unsupported edits or inputs can produce zero
results. Isotopically labelled halogens are not exchanged. Candidate SMILES can
be downloaded or sent back through the existing analysis workflow for descriptor
comparison and external SwissADME-adjacent research. This is not a SwissADME
integration or an inference of improved ADME, potency, safety or prodrug status.

Validation: `tools/analogue-candidates-test.js`,
`tools/prodrug-candidates-test.js`, and (with jsdom installed)
`tools/analogue-ui-test.js`, `tools/pk-research-ui-test.js`,
`tools/prodrug-site-evidence-test.js`. Browser visual layout was not verified.
