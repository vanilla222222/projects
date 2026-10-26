# Missing MOR measurement completion

The existing N-pyrrolidino protonitazene record now contains the two numerical
human MOR observations from De Vrieze et al. (2024), Table 1, compound 14,
p. 3007: https://doi.org/10.1007/s00204-024-03774-7.

| HEK293T assay | EC50, nM (95% CI) | Emax, % hydromorphone (95% CI) |
| --- | --- | --- |
| NanoBiT beta-arrestin2 recruitment | 0.942 (0.811–1.09) | 198 (194–202) |
| GloSensor cAMP accumulation inhibition | 0.0939 (0.0531–0.167) | 109 (99.8–118) |

The primary PDF table and methods were checked directly. Receptor and host-cell
species are human; the material is free base, and concentrations are reported as
free base. Responses use combined normalized measurements from at least three
independent experiments, with duplicate concentrations, fitted by three-parameter
logistic regression. These are two pathways from one study, not independent
replications or a calculated signaling-bias estimate. Relative Emax above 100%
does not establish intrinsic superagonism, clinical potency, or safety.

The selected transcription is pinned in
`validation/sources/mor-measurement-completion-001.json` (primary article CC BY 4.0).
The prior source snapshot remains unchanged as historical provenance; its
untranscribed placeholder is no longer active in the curated record.
No structures, families, or pharmacological action classifications were added.

Receptor annotation exports now retain reported concentration intervals,
relations, assay conditions, source location, snapshot hash and raw source row,
as well as the existing efficacy object. Dossiers and comparison tables label
both concentration and relative-efficacy intervals. The compiler permits
source-referenced percentage efficacy above 100% and validates interval ordering.
The completed record leaves the numerical-transcription curation queue.
