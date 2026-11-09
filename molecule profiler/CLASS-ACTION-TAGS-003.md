# Structural classes and source-reported receptor actions

Five additional graph motifs apply across the stored reference library:
diphenylmethane, tetralin, 2,3-dihydrobenzofuran, tetrahydroisoquinoline and
chromane scaffolds. Explicit SMARTS have positive, negative, charge and stereo
fixtures. These overlapping subgraph tags imply no pharmacological function.
The existing 1,3-benzodioxole definition is retained without duplication.

The six retained ChEMBL batches contain 31 explicit action classifications:
23 agonist and eight antagonist records. Each remains attached to its human
target and exact stored graph. Separate classification observations retain
source IDs, snapshot hash and row location. They receive receptor/action tags
and an explicit ChEMBL classification label, without potency, efficacy,
uncertainty or measured-functional claims. The original 1,881 binding
observations keep their numeric results and empty action lists. Two "BINDING
AGENT" records and null or unrecognized action labels create no functional
action tags. Source classifications can still be incomplete or disputed;
their witnesses remain available for review.

Exact matches to retained IUPHAR ligand graphs receive namespaced
`Source ligand class:` tags from the literal source type: natural product,
metabolite, synthetic organic or peptide. These classifications are separate
from structural motifs and receptor actions. Dossiers show raw source actions
alongside canonical labels, preserving allosteric context without replacing
the source wording.

The inspector's receptor-evidence disclosure now includes exact-graph curated
classifications and functional assays that previously appeared as tags without
supporting disclosure rows. This merge is confined to the disclosure; dossiers
continue to import curated records directly without duplication. Properties
and species-unresolved records are not promoted to human receptor actions.
Source ligand classes have their own filter category.

No structures, names, targets, fitted models or binding-profile counts are added.
Historical snapshots and reviewed identity corrections remain unchanged.
`tools/repin.py` rebuilds generated artifacts; the structural taxonomy release
records the changed curated structural projection.

Validation includes the registered Node suite, native RDKit motif boundaries,
classification provenance/exclusion tests and inspector/dossier DOM checks.
Attribution remains in `CHEMBL-DATA-NOTICE.md` and `RECEPTOR-TAGS.md`.
